"""Main entry point for the Elden Ring Watcher."""

from __future__ import annotations

import signal
import threading
import uuid
from datetime import datetime, timezone

from loguru import logger

from watcher import __version__
from watcher.config import load_config
from watcher.event_queue import EventQueue
from watcher.http_client import WatcherHttpClient
from watcher.logger import setup_logging
from watcher.paths import configure_tesseract
from watcher.process_monitor import ProcessMonitor
from watcher.tray import TrayApp, TrayStatus
from watcher.updater import perform_update_if_available
from watcher.watcher import Watcher


def main() -> None:
    """Main entry point — wires config, logging, tray, process monitor, and watcher."""
    # Configure Tesseract paths before anything else
    configure_tesseract()

    # Load configuration
    config = load_config()
    setup_logging(config)

    logger.info("=" * 50)
    logger.info("Elden Ring Watcher v{}", __version__)
    logger.info("=" * 50)

    # Initialize event pipeline
    queue = EventQueue(config.data_dir / "queue")
    http_client = WatcherHttpClient(config.api_url, config.api_key, queue)

    # Create tray icon
    shutdown_requested = False
    watcher_instance: Watcher | None = None
    watcher_thread: threading.Thread | None = None
    session_id: str | None = None

    def _send_session_end() -> None:
        """Send session_end event and clear session_id. Idempotent."""
        nonlocal session_id
        if session_id is None:
            return
        sid = session_id
        session_id = None  # Clear first to prevent double send
        try:
            http_client.send_event({
                "type": "session_end",
                "event_id": str(uuid.uuid4()),
                "session_id": sid,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            logger.info("Sent session_end for session {}", sid)
        except Exception as exc:
            logger.warning("Failed to send session_end: {}", exc)

    def request_shutdown() -> None:
        nonlocal shutdown_requested
        if shutdown_requested:
            return
        shutdown_requested = True
        logger.info("Shutdown requested")
        if watcher_instance is not None:
            watcher_instance.stop()
        monitor.stop()

    tray = TrayApp(on_quit=request_shutdown)
    tray.set_status(TrayStatus.NO_GAME)

    # Create Watcher instance
    watcher_instance = Watcher(config, http_client, tray)

    # Create process monitor
    monitor = ProcessMonitor(
        game_process=config.game_process,
        poll_interval=config.process_poll_interval,
    )

    # Callbacks for game lifecycle
    def on_launch(pid: int) -> None:
        nonlocal watcher_thread, session_id
        session_id = str(uuid.uuid4())
        logger.info("Elden Ring detected (PID: {}, session: {})", pid, session_id)
        # Start watcher in background thread
        watcher_thread = threading.Thread(
            target=watcher_instance.start,
            args=(pid, session_id),
            daemon=True,
        )
        watcher_thread.start()

    def on_close() -> None:
        nonlocal watcher_thread
        logger.info("Elden Ring closed")
        if watcher_instance is not None:
            watcher_instance.stop()
        _send_session_end()
        tray.set_status(TrayStatus.NO_GAME)
        watcher_thread = None

    # Handle Ctrl+C
    def sigint_handler(sig: int, frame: object) -> None:
        request_shutdown()

    signal.signal(signal.SIGINT, sigint_handler)

    # Start tray in background thread
    tray.run_detached()

    # Auto-update check on startup
    try:
        if perform_update_if_available():
            return  # Update initiated — app will restart via batch script
    except Exception:
        logger.warning("Auto-update check failed, continuing with current version")

    # Start periodic queue flush thread
    def flush_loop() -> None:
        while not shutdown_requested:
            try:
                http_client.flush_queue()
            except Exception as exc:
                logger.debug("Queue flush error: {}", exc)
            # Sleep in small increments to respond to shutdown
            for _ in range(60):  # 30 seconds (60 * 0.5s)
                if shutdown_requested:
                    break
                __import__("time").sleep(0.5)

    flush_thread = threading.Thread(target=flush_loop, daemon=True)
    flush_thread.start()

    # Start process monitor loop (blocking)
    try:
        logger.info("Watching for '{}' ...", config.game_process)
        monitor.start(on_launch=on_launch, on_close=on_close)
    except KeyboardInterrupt:
        pass
    finally:
        if watcher_instance is not None:
            watcher_instance.stop()
        # Send session_end if session still active (e.g. Ctrl+C / tray quit while game running)
        _send_session_end()
        # Final queue flush
        flushed = http_client.flush_queue()
        if flushed > 0:
            logger.info("Final flush: sent {} queued events", flushed)
        remaining = queue.count()
        if remaining > 0:
            logger.info("{} events still queued (will send on next launch)", remaining)
        monitor.stop()
        tray.stop()
        logger.info("Elden Ring Watcher shut down")


if __name__ == "__main__":
    main()
