"""Core detection loop wiring all components: capture -> detect -> FSM -> events -> HTTP.

This is the central nervous system of the Watcher. It runs at ~10fps when the
game is active and pauses when the game is not in focus.
"""

from __future__ import annotations

import time
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from loguru import logger

from watcher.capture import ScreenCapture, BOSS_BAR_REGION, BOSS_NAME_REGION, YOU_DIED_REGION, COOP_REGION
from watcher.config import Config
from watcher.paths import asset_path
from watcher.detectors.health_bar import HealthBarDetector
from watcher.detectors.you_died import YouDiedDetector
from watcher.detectors.boss_name import BossNameDetector
from watcher.detectors.coop import CoopDetector
from watcher.http_client import WatcherHttpClient
from watcher.state_machine import BossFightFSM, FightState
from watcher.tray import TrayApp, TrayStatus


def _find_game_window(pid: int) -> int | None:
    """Find the game window handle from PID.

    Uses win32gui on Windows, returns None on other platforms.
    """
    try:
        import win32gui
        import win32process

        result: list[int] = []

        def enum_callback(hwnd: int, _: object) -> None:
            _, found_pid = win32process.GetWindowThreadProcessId(hwnd)
            if found_pid == pid and win32gui.IsWindowVisible(hwnd):
                result.append(hwnd)

        win32gui.EnumWindows(enum_callback, None)
        return result[0] if result else None

    except ImportError:
        logger.debug("win32gui not available (not on Windows)")
        return None
    except Exception as exc:
        logger.warning("Failed to find game window: {}", exc)
        return None


def _is_game_focused(hwnd: int | None) -> bool:
    """Check if the game window is focused and not minimized.

    Returns True if we can't determine focus (non-Windows).
    """
    if hwnd is None:
        return True  # Assume focused if we can't check

    try:
        import win32gui

        # Check if minimized
        if win32gui.IsIconic(hwnd):
            return False
        # Check if foreground
        return win32gui.GetForegroundWindow() == hwnd

    except ImportError:
        return True
    except Exception:
        return True


class Watcher:
    """Core detection loop — capture -> detect -> FSM -> events -> HTTP.

    Runs at target_fps when the game is active. Pauses when game is not in focus.
    OCR runs once per encounter (expensive ~100-500ms).

    Args:
        config: Watcher configuration.
        http_client: HTTP client for event delivery.
        tray: System tray icon for status updates.
    """

    def __init__(
        self,
        config: Config,
        http_client: WatcherHttpClient,
        tray: TrayApp,
    ) -> None:
        self._config = config
        self._http_client = http_client
        self._tray = tray
        self._running = False
        self._game_hwnd: int | None = None
        self._was_paused = False

        # Initialize capture
        self._capture = ScreenCapture(target_fps=config.capture_fps)

        # Initialize detectors
        template_dir = asset_path("watcher/assets/templates")
        self._health_bar = HealthBarDetector(template_dir)
        self._you_died = YouDiedDetector(template_dir)
        self._boss_name = BossNameDetector(asset_path("watcher/assets/boss_names.json"))
        self._coop = CoopDetector(template_dir)

        # Initialize FSM
        self._fsm = BossFightFSM(
            on_encounter=self._on_encounter,
            on_death=self._on_death,
            on_kill=self._on_kill,
            on_abandon=self._on_abandon,
        )

        # State tracking
        self._current_boss_name: str | None = None
        self._coop_detected: bool = False
        self._last_flush_time: float = 0.0
        self._session_id: str | None = None
        self._fight_start_time: float | None = None
        self._last_global_death_time: float = 0.0

    def start(self, game_pid: int, session_id: str | None = None) -> None:
        """Start the detection loop.

        Args:
            game_pid: PID of the game process.
            session_id: Session UUID shared across all events in this session.
        """
        self._game_hwnd = _find_game_window(game_pid)
        self._running = True
        self._session_id = session_id

        # Send session start event
        self._http_client.send_event({
            "type": "session_start",
            "event_id": str(uuid.uuid4()),
            "session_id": self._session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        self._tray.set_status(TrayStatus.WATCHING)
        logger.info("Watcher started (game PID: {}, window: {})", game_pid, self._game_hwnd)

        self._detection_loop()

    def stop(self) -> None:
        """Stop the detection loop."""
        self._running = False
        self._capture.cleanup()
        self._tray.set_status(TrayStatus.NO_GAME)
        logger.info("Watcher stopped")

    def _detection_loop(self) -> None:
        """Main loop running at target_fps."""
        frame_interval = 1.0 / self._config.capture_fps

        while self._running:
            frame_start = time.perf_counter()

            # Check game focus (log only, never pause detection)
            focused = _is_game_focused(self._game_hwnd)
            if not focused and not self._was_paused:
                logger.info("Game lost focus (detection continues)")
                self._was_paused = True
            elif focused and self._was_paused:
                logger.info("Game regained focus")
                self._was_paused = False
                self._tray.set_status(TrayStatus.WATCHING)

            # Capture boss bar region (always needed)
            boss_bar_frame = self._capture.capture_region(BOSS_BAR_REGION)

            # Run health bar detector
            bar_detected = False
            if boss_bar_frame is not None:
                bar_detected = self._health_bar.detect(boss_bar_frame)

            # Run death detector in all states (boss fights + global deaths)
            death_detected = False
            you_died_frame = self._capture.capture_region(YOU_DIED_REGION)
            if you_died_frame is not None:
                death_detected = self._you_died.detect(you_died_frame)

            # Global death: YOU DIED detected outside a boss fight
            if death_detected and self._fsm.state not in (
                FightState.ACTIVE_FIGHT, FightState.FIGHT_RESOLVING,
            ):
                self._on_global_death()

            # Check co-op only when encounter first confirmed
            if bar_detected and self._fsm.state == FightState.ENCOUNTER_PENDING:
                coop_frame = self._capture.capture_region(COOP_REGION)
                if coop_frame is not None:
                    self._coop_detected = self._coop.detect(coop_frame)

            # Run OCR once per encounter (when health bar first confirmed)
            boss_name = self._current_boss_name
            if (
                bar_detected
                and self._fsm.state == FightState.ENCOUNTER_PENDING
                and self._current_boss_name is None
            ):
                # Try dedicated name region first, fall back to full bar region
                boss_name_frame = self._capture.capture_region(BOSS_NAME_REGION)
                detected_name = None
                if boss_name_frame is not None:
                    detected_name = self._boss_name.detect(boss_name_frame)
                if detected_name is None and boss_bar_frame is not None:
                    detected_name = self._boss_name.detect(boss_bar_frame)
                if detected_name:
                    self._current_boss_name = detected_name
                    boss_name = detected_name
                    logger.info("Boss identified: {}", detected_name)
                else:
                    logger.warning(
                        "OCR failed (raw='{}', score={})",
                        self._boss_name.last_raw_ocr,
                        self._boss_name.last_match_score,
                    )
                    # Save debug frames for diagnosis
                    if self._config.debug_screenshots:
                        dbg_dir = self._config.data_dir / "screenshots"
                        dbg_dir.mkdir(parents=True, exist_ok=True)
                        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                        if boss_name_frame is not None:
                            cv2.imwrite(str(dbg_dir / f"{ts}_name_region.png"), boss_name_frame)
                        if boss_bar_frame is not None:
                            cv2.imwrite(str(dbg_dir / f"{ts}_bar_region.png"), boss_bar_frame)

            # Feed FSM
            self._fsm.process_frame(
                boss_bar_detected=bar_detected,
                boss_name=boss_name,
                death_detected=death_detected,
            )

            # Debug screenshots on detection triggers
            if self._config.debug_screenshots:
                self._save_debug_screenshot(bar_detected, death_detected)

            # Periodic queue flush (every ~30s)
            now = time.time()
            if now - self._last_flush_time > 30.0:
                self._last_flush_time = now
                threading.Thread(
                    target=self._http_client.flush_queue,
                    daemon=True,
                ).start()

            # Frame pacing
            elapsed = time.perf_counter() - frame_start
            sleep_time = frame_interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)

            logger.trace("Frame: {:.1f}ms (target: {:.1f}ms)", elapsed * 1000, frame_interval * 1000)

    def _on_encounter(self, boss_name: str) -> None:
        """FSM callback: boss encounter confirmed."""
        if self._coop_detected:
            logger.info("Co-op detected — skipping encounter event for {}", boss_name)
            return

        self._fight_start_time = time.time()
        logger.info("Boss encounter: {}", boss_name)
        self._http_client.send_event({
            "type": "boss_encounter",
            "event_id": str(uuid.uuid4()),
            "boss_canonical_name": boss_name,
            "session_id": self._session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def _on_death(self, boss_name: str) -> None:
        """FSM callback: player death."""
        duration = int(time.time() - self._fight_start_time) if self._fight_start_time else 0
        logger.info("Player death vs {} ({}s)", boss_name, duration)
        self._http_client.send_event({
            "type": "player_death",
            "event_id": str(uuid.uuid4()),
            "boss_canonical_name": boss_name,
            "session_id": self._session_id,
            "duration_seconds": duration,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        self._reset_fight_state()

    def _on_kill(self, boss_name: str) -> None:
        """FSM callback: boss killed."""
        duration = int(time.time() - self._fight_start_time) if self._fight_start_time else 0
        logger.info("Boss killed: {} ({}s)", boss_name, duration)
        self._http_client.send_event({
            "type": "boss_kill",
            "event_id": str(uuid.uuid4()),
            "boss_canonical_name": boss_name,
            "session_id": self._session_id,
            "duration_seconds": duration,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        self._reset_fight_state()

    def _on_abandon(self, boss_name: str) -> None:
        """FSM callback: fight abandoned."""
        duration = int(time.time() - self._fight_start_time) if self._fight_start_time else 0
        logger.info("Fight abandoned: {} ({}s)", boss_name, duration)
        self._http_client.send_event({
            "type": "fight_abandoned",
            "event_id": str(uuid.uuid4()),
            "boss_canonical_name": boss_name,
            "session_id": self._session_id,
            "duration_seconds": duration,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        self._reset_fight_state()

    def _on_global_death(self) -> None:
        """Non-boss death detected (mob, fall, trap, etc.).

        Uses a 5-second cooldown to avoid duplicate detections while
        the "YOU DIED" text remains on screen.
        """
        now = time.time()
        if now - self._last_global_death_time < 5.0:
            return
        self._last_global_death_time = now

        logger.info("Global death detected (non-boss)")
        self._http_client.send_event({
            "type": "global_death",
            "event_id": str(uuid.uuid4()),
            "session_id": self._session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def _reset_fight_state(self) -> None:
        """Reset per-fight tracking state."""
        self._current_boss_name = None
        self._coop_detected = False
        self._fight_start_time = None

    def _save_debug_screenshot(self, bar_detected: bool, death_detected: bool) -> None:
        """Save debug screenshots on detection triggers."""
        if not (bar_detected or death_detected):
            return

        screenshot_dir = self._config.data_dir / "screenshots"
        screenshot_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        event_type = "death" if death_detected else "bar"

        frame = self._capture.capture_full()
        if frame is not None:
            path = screenshot_dir / f"{timestamp}_{event_type}.png"
            cv2.imwrite(str(path), frame)
            logger.debug("Debug screenshot saved: {}", path.name)
