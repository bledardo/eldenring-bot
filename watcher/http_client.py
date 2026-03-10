"""HTTP client with retry logic and event queue integration.

Enqueue-first pattern: events are persisted to disk before any HTTP attempt,
ensuring no data loss on crash or network failure.
"""

from __future__ import annotations

from datetime import datetime, timezone

import requests
from loguru import logger
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from watcher.event_queue import EventQueue


class WatcherHttpClient:
    """HTTP client for sending events to the VPS.

    Uses enqueue-first pattern: events are written to disk before HTTP POST.
    Failed POSTs leave events in the queue for later retry.

    Args:
        api_url: Base URL of the API server.
        api_key: API key for authentication.
        queue: EventQueue instance for disk persistence.
    """

    def __init__(self, api_url: str, api_key: str, queue: EventQueue) -> None:
        self._api_url = api_url.rstrip("/") if api_url else ""
        self._api_key = api_key
        self._queue = queue
        self._session = self._make_session()
        self._last_success: bool = False

    def _make_session(self) -> requests.Session:
        """Create a requests Session with retry adapter."""
        session = requests.Session()
        retry_strategy = Retry(
            total=5,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST", "GET"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session

    def send_event(self, event: dict) -> bool:
        """Enqueue event to disk. Delivery is handled by flush_queue().

        This method is non-blocking: it only writes the event to disk.
        The flush_loop in main.py calls flush_queue() periodically to
        deliver queued events via HTTP.  This prevents network issues
        from blocking the detection loop (which previously could stall
        for up to ~75 seconds on retries, triggering watchdog restarts
        and duplicate detection threads).

        Args:
            event: Event dictionary to send.

        Returns:
            True (event successfully queued).
        """
        self._queue.enqueue(event)
        logger.debug("Event queued: {}", event.get("type", "unknown"))
        return True

    def flush_queue(self) -> int:
        """Attempt to send all queued events (oldest first).

        Stops on first failure to avoid burning retries when server is down.

        Returns:
            Count of successfully sent events.
        """
        if not self._api_url:
            return 0

        sent_count = 0
        events = self._queue.peek(limit=50)

        for path, event in events:
            try:
                payload = {
                    "type": event.get("type", "unknown"),
                    "event_id": event.get("event_id", ""),
                    "data": event,
                    "timestamp": event.get("queued_at", datetime.now(timezone.utc).isoformat()),
                }
                response = self._session.post(
                    f"{self._api_url}/api/events",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10,
                )
                if response.ok:
                    self._queue.dequeue(path)
                    sent_count += 1
                    self._last_success = True
                else:
                    logger.warning("Queue flush failed at event {} ({})", path.name, response.status_code)
                    # 4xx = permanent client error, drop and continue
                    if 400 <= response.status_code < 500:
                        self._queue.dequeue(path)
                        logger.warning("Event {} dropped ({}): permanent client error", path.name, response.status_code)
                        continue
                    self._last_success = False
                    break  # Stop on first server failure

            except requests.RequestException as exc:
                logger.warning("Queue flush failed: {}", exc)
                self._last_success = False
                break

        if sent_count > 0:
            logger.info("Queue flush: sent {} events ({} remaining)", sent_count, self._queue.count())

        return sent_count

    def is_connected(self) -> bool:
        """Return True if last send was successful."""
        return self._last_success
