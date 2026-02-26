"""Disk-persisted event queue for offline resilience.

Events are stored as individual JSON files to avoid corruption from
concurrent read/write to a single file.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from loguru import logger


class EventQueue:
    """Disk-persisted event queue.

    Events are stored as individual JSON files named {timestamp}_{uuid}.json
    in the queue directory. This avoids corruption from concurrent access.

    Args:
        queue_dir: Directory for queue files. Created if it doesn't exist.
    """

    def __init__(self, queue_dir: Path) -> None:
        self._queue_dir = queue_dir
        self._queue_dir.mkdir(parents=True, exist_ok=True)
        logger.debug("Event queue initialized at {}", queue_dir)

    def enqueue(self, event: dict) -> Path:
        """Write event to a new JSON file.

        Args:
            event: Event dictionary to persist.

        Returns:
            Path to the created event file.
        """
        event["queued_at"] = datetime.now(timezone.utc).isoformat()
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
        filename = f"{timestamp}_{uuid.uuid4().hex[:8]}.json"
        path = self._queue_dir / filename

        with open(path, "w", encoding="utf-8") as f:
            json.dump(event, f, ensure_ascii=False)

        logger.debug("Event enqueued: {} (queue size: {})", filename, self.count())
        return path

    def peek(self, limit: int = 10) -> list[tuple[Path, dict]]:
        """Return oldest N events without removing them.

        Args:
            limit: Maximum number of events to return.

        Returns:
            List of (path, event_dict) tuples sorted by age (oldest first).
        """
        files = sorted(self._queue_dir.glob("*.json"))[:limit]
        results = []
        for path in files:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    event = json.load(f)
                results.append((path, event))
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Failed to read event file {}: {}", path.name, exc)
        return results

    def dequeue(self, path: Path) -> None:
        """Delete an event file (marks as sent).

        Args:
            path: Path to the event file to remove.
        """
        try:
            path.unlink()
            logger.debug("Event dequeued: {} (queue size: {})", path.name, self.count())
        except FileNotFoundError:
            pass  # Already removed

    def count(self) -> int:
        """Return number of queued events."""
        return len(list(self._queue_dir.glob("*.json")))

    def is_empty(self) -> bool:
        """Return True if no events are queued."""
        return self.count() == 0
