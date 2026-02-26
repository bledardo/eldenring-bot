"""Main entry point for the Elden Ring Watcher."""

from __future__ import annotations

import signal
import sys

from loguru import logger

from watcher import __version__
from watcher.config import load_config
from watcher.logger import setup_logging
from watcher.process_monitor import ProcessMonitor
from watcher.tray import TrayApp, TrayStatus


def main() -> None:
    """Main entry point — wires config, logging, tray, and process monitor."""
    # Load configuration
    config = load_config()
    setup_logging(config)

    logger.info("=" * 50)
    logger.info("Elden Ring Watcher v{}", __version__)
    logger.info("=" * 50)

    # Shared shutdown state
    shutdown_requested = False

    def request_shutdown() -> None:
        nonlocal shutdown_requested
        if shutdown_requested:
            return
        shutdown_requested = True
        logger.info("Shutdown requested")
        monitor.stop()

    # Create tray icon
    tray = TrayApp(on_quit=request_shutdown)
    tray.set_status(TrayStatus.NO_GAME)

    # Create process monitor
    monitor = ProcessMonitor(
        game_process=config.game_process,
        poll_interval=config.process_poll_interval,
    )

    # Callbacks for game lifecycle
    def on_launch(pid: int) -> None:
        logger.info("Elden Ring detected (PID: {})", pid)
        tray.set_status(TrayStatus.WATCHING)

    def on_close() -> None:
        logger.info("Elden Ring closed")
        tray.set_status(TrayStatus.NO_GAME)

    # Handle Ctrl+C
    def sigint_handler(sig: int, frame: object) -> None:
        request_shutdown()

    signal.signal(signal.SIGINT, sigint_handler)

    # Start tray in background thread
    tray.run_detached()

    # AUTO-UPDATE CHECK — wired by Plan 06

    # Start process monitor loop (blocking)
    try:
        logger.info("Watching for '{}' ...", config.game_process)
        monitor.start(on_launch=on_launch, on_close=on_close)
    except KeyboardInterrupt:
        pass
    finally:
        monitor.stop()
        tray.stop()
        logger.info("Elden Ring Watcher shut down")


if __name__ == "__main__":
    main()
