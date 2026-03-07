"""Main entry point for the Elden Ring Watcher."""

from __future__ import annotations

import os
import signal
import sys
import threading
import traceback
import uuid
from datetime import datetime, timezone




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


def _kill_other_instances() -> None:
    """Kill other running instances of this exe (avoids duplicates after update)."""
    if not getattr(sys, "frozen", False):
        return  # Only relevant for packaged exe
    try:
        import psutil
        my_pid = os.getpid()
        my_name = os.path.basename(sys.executable).lower()
        for proc in psutil.process_iter(["pid", "name"]):
            if proc.info["pid"] == my_pid:
                continue
            if proc.info["name"] and proc.info["name"].lower() == my_name:
                logger.info("Killing old instance (PID: {})", proc.info["pid"])
                proc.kill()
                proc.wait(timeout=5)
    except Exception as exc:
        logger.debug("Could not kill other instances: {}", exc)


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

    # Kill any lingering old instances (e.g. after auto-update)
    _kill_other_instances()

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

    def request_restart() -> None:
        """Restart the watcher from tray menu."""
        nonlocal watcher_thread, session_id
        if watcher_instance is None:
            return
        logger.info("Manual restart requested from tray")

        # Stop current watcher
        try:
            watcher_instance.stop()
        except Exception:
            pass

        # Send session_end for current session
        _send_session_end()

        # Re-detect the game
        from watcher.process_monitor import find_game_pid
        pid = find_game_pid(config.game_process)
        if pid is None:
            logger.warning("Restart: game process not found")
            tray.notify("Restart échoué — jeu non détecté")
            tray.set_status(TrayStatus.NO_GAME)
            return

        session_id = str(uuid.uuid4())
        logger.info("Restart: respawning watcher (PID: {}, session: {})", pid, session_id)
        watcher_thread = threading.Thread(
            target=_watcher_thread_target,
            args=(pid, session_id),
            daemon=True,
        )
        watcher_thread.start()
        tray.notify("Watcher redémarré")

    def toggle_debug() -> bool:
        """Toggle debug mode at runtime. Returns new debug state."""
        current_level = config.log_level
        if current_level == "DEBUG":
            config.log_level = "INFO"
            config.debug_screenshots = False
            new_debug = False
        else:
            config.log_level = "DEBUG"
            config.debug_screenshots = True
            new_debug = True

        # Reconfigure loguru handlers
        setup_logging(config)
        # Re-install log window sink at new level
        from watcher.log_window import install_sink
        install_sink(level=config.log_level)

        logger.info("Log level changed to {} (debug_screenshots={})",
                     config.log_level, config.debug_screenshots)

        # Persist to config file
        from watcher.config import _write_config, _DEFAULT_DATA_DIR
        _write_config(config, _DEFAULT_DATA_DIR / "config.toml")

        return new_debug

    tray = TrayApp(
        on_quit=request_shutdown,
        on_restart=request_restart,
        on_toggle_debug=toggle_debug,
    )
    tray.set_status(TrayStatus.NO_GAME)
    # Sync initial debug state with config
    tray._debug_mode = config.log_level == "DEBUG"

    # Create Watcher instance
    watcher_instance = Watcher(config, http_client, tray)

    # Create process monitor
    monitor = ProcessMonitor(
        game_process=config.game_process,
        poll_interval=config.process_poll_interval,
    )

    # Callbacks for game lifecycle
    def _watcher_thread_target(pid: int, sid: str) -> None:
        """Wrapper around watcher_instance.start() to log uncaught exceptions."""
        try:
            watcher_instance.start(pid, sid)
        except Exception:
            logger.opt(exception=True).error("Watcher thread crashed!")

    def on_launch(pid: int) -> None:
        nonlocal watcher_thread, session_id
        session_id = str(uuid.uuid4())
        logger.info("Elden Ring detected (PID: {}, session: {})", pid, session_id)
        # Start watcher in background thread
        watcher_thread = threading.Thread(
            target=_watcher_thread_target,
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
            target=_watcher_thread_target,
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
