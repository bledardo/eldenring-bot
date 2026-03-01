"""Main entry point for the Elden Ring Watcher."""

from __future__ import annotations

import os
import signal
import sys
import threading
import traceback
import uuid
from datetime import datetime, timezone

# --- Clean up stale PyInstaller _MEI* temp directories ---
def _cleanup_mei_dirs() -> None:
    """Remove leftover _MEI* dirs from previous PyInstaller runs.

    PyInstaller extracts to %TEMP%/_MEI<pid>. After an update, the old
    directory may fail to be cleaned up (files locked). We clean them
    on next startup — skipping our own current _MEI directory.
    """
    if not getattr(sys, "frozen", False):
        return
    try:
        import glob
        import shutil
        import tempfile

        temp_dir = tempfile.gettempdir()
        # Our own _MEI directory (must not delete)
        own_mei = getattr(sys, "_MEIPASS", "")
        cleaned = 0
        for mei in glob.glob(os.path.join(temp_dir, "_MEI*")):
            if os.path.normcase(mei) == os.path.normcase(own_mei):
                continue
            try:
                shutil.rmtree(mei)
                cleaned += 1
            except Exception:
                pass  # Still locked — skip
        if cleaned:
            # Can't use logger yet, print to stderr
            print(f"[startup] Cleaned {cleaned} stale _MEI temp dir(s)", file=sys.stderr)
    except Exception:
        pass

_cleanup_mei_dirs()


# --- Early import debug: catch ModuleNotFoundError before loguru ---
def _write_crash_log(error: Exception) -> None:
    """Write import crash details to a file next to the exe, for debugging updates."""
    try:
        if getattr(sys, "frozen", False):
            log_dir = os.path.dirname(sys.executable)
        else:
            log_dir = os.path.dirname(os.path.abspath(__file__))
        crash_path = os.path.join(log_dir, "crash_import_error.log")
        with open(crash_path, "a", encoding="utf-8") as f:
            f.write(f"\n{'='*60}\n")
            f.write(f"Crash at {datetime.now().isoformat()}\n")
            f.write(f"Python: {sys.version}\n")
            f.write(f"Executable: {sys.executable}\n")
            f.write(f"Frozen: {getattr(sys, 'frozen', False)}\n")
            f.write(f"sys.path:\n")
            for p in sys.path:
                f.write(f"  {p}\n")
            f.write(f"\nError type: {type(error).__name__}\n")
            f.write(f"Error message: {error}\n")
            if isinstance(error, ModuleNotFoundError):
                f.write(f"Module name: {error.name}\n")
            f.write(f"\nFull traceback:\n")
            f.write(traceback.format_exc())
            f.write(f"{'='*60}\n")
    except Exception:
        pass  # Last resort — nothing we can do

try:
    from loguru import logger
    from watcher import __version__
    from watcher.config import load_config
    from watcher.event_queue import EventQueue
    from watcher.http_client import WatcherHttpClient
    from watcher.logger import setup_logging
    from watcher.paths import configure_tesseract
    from watcher.process_monitor import ProcessMonitor
    from watcher.tray import TrayApp, TrayStatus
    from watcher.updater import check_for_update, download_and_replace
    from watcher.watcher import Watcher
except (ModuleNotFoundError, ImportError) as _import_err:
    _write_crash_log(_import_err)
    # Also show a message box on Windows so the user sees something
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(
            0,
            f"Erreur au démarrage : module '{_import_err.name}' introuvable.\n\n"
            f"Détails écrits dans crash_import_error.log\n"
            f"(à côté de l'exe)",
            "Elden Ring Watcher - Erreur",
            0x10,  # MB_ICONERROR
        )
    except Exception:
        pass
    sys.exit(1)


def main() -> None:
    """Main entry point — wires config, logging, tray, process monitor, and watcher."""
    # Configure Tesseract paths before anything else
    configure_tesseract()

    # Load configuration
    config = load_config()
    setup_logging(config)

    # Install log window sink (captures messages for the GUI viewer)
    from watcher.log_window import install_sink
    install_sink(level=config.log_level)

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

    # Check if we just updated (version changed since last run)
    version_file = config.data_dir / ".last_version"
    last_version = version_file.read_text().strip() if version_file.exists() else None
    version_file.write_text(__version__)

    if last_version and last_version != __version__:
        tray.notify(f"Mis à jour : v{last_version} → v{__version__}")
    else:
        tray.notify(f"Watcher v{__version__} lancé — en attente d'Elden Ring")

    # Auto-update check on startup
    try:
        update_info = check_for_update()
        if update_info is not None:
            new_version = update_info["version"]
            tray.notify(f"Mise à jour v{new_version} disponible, téléchargement...")
            if download_and_replace(update_info["download_url"], update_info.get("expected_size")):
                # Update batch launched — force-kill the entire process so the
                # batch script can rename the exe.  sys.exit() is not enough
                # because non-daemon threads (pystray) keep the process alive.
                logger.info("Update initiated, force-killing process for updater batch...")
                tray.stop()
                os._exit(0)
    except Exception:
        logger.warning("Auto-update check failed, continuing with current version")

    # Start periodic queue flush thread (also acts as watchdog)
    import time as _time

    WATCHDOG_STALE_THRESHOLD = 120.0  # seconds without a frame before restart

    def _restart_watcher(reason: str) -> None:
        """Restart the watcher thread after an unexpected stop."""
        nonlocal watcher_thread, session_id
        logger.warning("Watchdog: restarting watcher ({})", reason)

        # Clean up the old watcher
        try:
            watcher_instance.stop()
        except Exception:
            pass

        # Send session_end for the dead session
        _send_session_end()

        # Re-detect the game PID
        from watcher.process_monitor import find_game_pid
        pid = find_game_pid(config.game_process)
        if pid is None:
            logger.warning("Watchdog: game process not found, cannot restart watcher")
            return

        session_id = str(uuid.uuid4())
        logger.info("Watchdog: respawning watcher (PID: {}, session: {})", pid, session_id)
        watcher_thread = threading.Thread(
            target=watcher_instance.start,
            args=(pid, session_id),
            daemon=True,
        )
        watcher_thread.start()

    def flush_loop() -> None:
        while not shutdown_requested:
            try:
                http_client.flush_queue()
            except Exception as exc:
                logger.debug("Queue flush error: {}", exc)
            # Watchdog: check watcher thread health
            if watcher_thread is not None:
                if not watcher_thread.is_alive():
                    logger.error("Watchdog: watcher thread died unexpectedly!")
                    _restart_watcher("thread dead")
                elif watcher_instance.last_frame_time > 0:
                    stale = _time.time() - watcher_instance.last_frame_time
                    if stale > WATCHDOG_STALE_THRESHOLD:
                        logger.error(
                            "Watchdog: no frame processed for {:.0f}s (threshold: {:.0f}s)",
                            stale, WATCHDOG_STALE_THRESHOLD,
                        )
                        _restart_watcher("detection loop stale")
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
