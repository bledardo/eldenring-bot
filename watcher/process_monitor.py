"""Game process lifecycle detection via psutil polling."""

from __future__ import annotations

import time
from collections.abc import Callable

import psutil
from loguru import logger


def find_game_pid(game_process: str) -> int | None:
    """Find the PID of a game process by name (standalone helper).

    Args:
        game_process: Process name to look for (e.g. "eldenring.exe").

    Returns:
        The PID if found, None otherwise.
    """
    target = game_process.lower()
    try:
        for proc in psutil.process_iter(["name", "pid"]):
            try:
                if proc.info["name"] and proc.info["name"].lower() == target:
                    return proc.info["pid"]
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception as exc:
        logger.warning("Error scanning processes: {}", exc)
    return None


class ProcessMonitor:
    """Monitors for game process start/stop events.

    Polls the system process list at a configurable interval and calls
    callbacks when the target game process is detected or disappears.
    """

    def __init__(
        self,
        game_process: str = "eldenring.exe",
        poll_interval: float = 2.0,
    ) -> None:
        self.game_process = game_process.lower()
        self.poll_interval = poll_interval
        self._pid: int | None = None
        self._running = False

    def find_game_pid(self) -> int | None:
        """Find the PID of the game process.

        Returns:
            The PID if found, None otherwise.
        """
        try:
            for proc in psutil.process_iter(["name", "pid"]):
                try:
                    if proc.info["name"] and proc.info["name"].lower() == self.game_process:
                        return proc.info["pid"]
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as exc:
            logger.warning("Error scanning processes: {}", exc)
        return None

    def start(
        self,
        on_launch: Callable[[int], None],
        on_close: Callable[[], None],
    ) -> None:
        """Start the blocking process monitoring loop.

        Args:
            on_launch: Called with PID when game process is detected.
            on_close: Called when game process disappears.
        """
        self._running = True
        logger.info(
            "Process monitor started — watching for '{}' (poll={}s)",
            self.game_process,
            self.poll_interval,
        )

        was_running = False

        while self._running:
            pid = self.find_game_pid()

            if pid is not None and not was_running:
                # Game just appeared
                self._pid = pid
                was_running = True
                logger.info("Game detected: {} (PID: {})", self.game_process, pid)
                try:
                    on_launch(pid)
                except Exception as exc:
                    logger.error("on_launch callback error: {}", exc)

            elif pid is None and was_running:
                # Game just disappeared
                was_running = False
                self._pid = None
                logger.info("Game closed: {}", self.game_process)
                try:
                    on_close()
                except Exception as exc:
                    logger.error("on_close callback error: {}", exc)

            time.sleep(self.poll_interval)

        logger.info("Process monitor stopped")

    def stop(self) -> None:
        """Signal the monitoring loop to stop."""
        self._running = False
