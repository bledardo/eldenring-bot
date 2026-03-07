"""Core detection loop wiring all components: capture -> detect -> FSM -> events -> HTTP.

This is the central nervous system of the Watcher. It runs at ~10fps when the
game is active and pauses when the game is not in focus.
"""

from __future__ import annotations

import base64
import time
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from loguru import logger

from watcher.capture import ScreenCapture, BOSS_BAR_REGION, DOUBLE_BOSS_BAR_REGION, BOSS_NAME_REGION, YOU_DIED_REGION, KILL_TEXT_REGION, COOP_REGION
from watcher.config import Config
from watcher.paths import asset_path
from watcher.detectors.health_bar import HealthBarDetector
from watcher.detectors.you_died import YouDiedDetector
from watcher.detectors.boss_name import BossNameDetector
from watcher.detectors.enemy_felled import EnemyFelledDetector
from watcher.detectors.coop import CoopDetector
from watcher.http_client import WatcherHttpClient
from watcher.state_machine import BossFightFSM, FightState, PHASE_TRANSITIONS
from watcher.tray import TrayApp, TrayStatus


def _find_game_window(pid: int, retries: int = 5, delay: float = 1.0) -> int | None:
    """Find the game window handle from PID.

    Uses win32gui on Windows, returns None on other platforms.
    Retries a few times because the window may not exist yet right after
    the process is detected.
    """
    try:
        import win32gui
        import win32process
    except ImportError:
        logger.debug("win32gui not available (not on Windows)")
        return None

    for attempt in range(retries):
        try:
            result: list[int] = []

            def enum_callback(hwnd: int, _: object) -> None:
                _, found_pid = win32process.GetWindowThreadProcessId(hwnd)
                if found_pid == pid and win32gui.IsWindowVisible(hwnd):
                    result.append(hwnd)

            win32gui.EnumWindows(enum_callback, None)
            if result:
                return result[0]

            if attempt < retries - 1:
                logger.debug("Game window not found (attempt {}/{}), retrying in {:.0f}s...",
                             attempt + 1, retries, delay)
                time.sleep(delay)

        except Exception as exc:
            logger.warning("Failed to find game window: {}", exc)
            return None

    logger.warning("Game window not found after {} attempts", retries)
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
        self._boss_name = BossNameDetector(asset_path("watcher/assets/boss_names.json"))
        self._you_died = YouDiedDetector(template_dir)
        self._enemy_felled = EnemyFelledDetector(template_dir=template_dir, threshold=0.55)
        self._coop = CoopDetector(template_dir)

        # Initialize FSM
        self._fsm = BossFightFSM(
            on_encounter=self._on_encounter,
            on_death=self._on_death,
            on_kill=self._on_kill,
            on_abandon=self._on_abandon,
        )

        # State tracking
        self._current_frame: np.ndarray | None = None  # current frame for callbacks
        self._current_boss_name: str | None = None
        self._coop_detected: bool = False
        self._last_flush_time: float = 0.0
        self._session_id: str | None = None
        self._fight_start_time: float | None = None
        self._last_global_death_time: float = 0.0
        self._kill_screenshot: str | None = None  # base64-encoded PNG
        self._encounter_screenshot: str | None = None  # base64-encoded PNG for embed
        self._unknown_boss_logged: bool = False  # log "boss non reconnu" only once
        self._last_debug_screenshot_time: float = 0.0
        self._resolve_log_count: int = 0
        self._resolving_debug_count: int = 0
        self._resolving_gold_saved: bool = False
        self._current_boss_is_fallback: bool = False
        self._last_ocr_confirm_time: float = 0.0  # rate-limit OCR confirmation (1/sec)
        self._last_ocr_retry_time: float = 0.0  # rate-limit OCR retry in ACTIVE_FIGHT (2s)
        self._last_phase_check_time: float = 0.0  # rate-limit phase transition OCR (5s)
        self.last_frame_time: float = 0.0  # Updated every loop iteration (for watchdog)

    def start(self, game_pid: int, session_id: str | None = None) -> None:
        """Start the detection loop.

        Args:
            game_pid: PID of the game process.
            session_id: Session UUID shared across all events in this session.
        """
        # Re-initialize capture if it was cleaned up (e.g. watchdog restart)
        self._capture.reinitialize()

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
        self.last_frame_time = 0.0  # Reset so watchdog doesn't trigger after stop
        self._fsm.force_abandon()
        self._capture.cleanup()
        self._tray.set_status(TrayStatus.NO_GAME)
        logger.info("Watcher stopped")

    def _detection_loop(self) -> None:
        """Main loop running at target_fps."""
        frame_interval = 1.0 / self._config.capture_fps
        last_heartbeat = time.time()
        none_frame_count = 0

        while self._running:
            try:
                frame_start = time.perf_counter()
                self.last_frame_time = time.time()

                # Check game focus — skip detection when unfocused to avoid
                # false positives from stale/transitional frames (e.g. alt-tab).
                focused = _is_game_focused(self._game_hwnd)
                if not focused and not self._was_paused:
                    logger.info("Game lost focus — pausing detection")
                    self._was_paused = True
                    self._you_died._confirmer.reset()
                    self._health_bar._confirmer.reset()
                    self._enemy_felled.reset()
                elif focused and self._was_paused:
                    logger.info("Game regained focus")
                    self._was_paused = False
                    self._tray.set_status(TrayStatus.WATCHING)

                if self._was_paused:
                    # Sleep briefly and skip detection while game is unfocused
                    time.sleep(frame_interval)
                    continue

                # Single full-screen capture per frame — BetterCam can fail
                # when grab() is called multiple times in quick succession.
                full_frame = self._capture.grab_full()
                if full_frame is None:
                    none_frame_count += 1
                    time.sleep(frame_interval)
                    continue

                # Store current frame for use by FSM callbacks
                self._current_frame = full_frame

                # Crop all needed regions from the single capture
                boss_bar_frame = self._capture.crop_region(full_frame, BOSS_BAR_REGION)
                you_died_frame = self._capture.crop_region(full_frame, YOU_DIED_REGION)

                # Run health bar detector
                bar_detected = self._health_bar.detect(boss_bar_frame)

                # OCR confirmation for doubtful health bar detections.
                # When the structural fallback gives a confidence between
                # soft_threshold and threshold, run OCR to check for a boss name.
                if (
                    not bar_detected
                    and self._health_bar.last_was_doubtful
                    and self._fsm.state in (FightState.IDLE, FightState.ENCOUNTER_PENDING)
                ):
                    if time.time() - self._last_ocr_confirm_time >= 1.0:
                        self._last_ocr_confirm_time = time.time()
                        if boss_bar_frame is not None:
                            bar_h = boss_bar_frame.shape[0]
                            name_bottom = int(bar_h * 0.45)
                            ocr_frame = boss_bar_frame[:name_bottom, :]
                            ocr_name = self._boss_name.detect(ocr_frame)
                            if ocr_name:
                                logger.info(
                                    "Doubtful bar confirmed by OCR: {} (confidence={:.3f})",
                                    ocr_name, self._health_bar.last_confidence,
                                )
                                bar_detected = True
                                self._current_boss_name = ocr_name
                                self._current_boss_is_fallback = self._boss_name.last_was_fallback
                    elif self._fsm.state == FightState.ENCOUNTER_PENDING:
                        # Already OCR-confirmed recently, keep treating doubtful
                        # bar as detected to accumulate confirmation frames.
                        bar_detected = True
                        logger.debug(
                            "Doubtful bar sustained during pending (confidence={:.3f})",
                            self._health_bar.last_confidence,
                        )

                # Run death detector in all states (boss fights + global deaths)
                death_detected = self._you_died.detect(you_died_frame, in_combat=False)

                # Global death: YOU DIED detected outside a boss fight
                if death_detected and self._fsm.state not in (
                    FightState.ACTIVE_FIGHT, FightState.FIGHT_RESOLVING, FightState.COOLDOWN,
                ):
                    self._on_global_death()

                # Run kill confirmation detector (wider region to capture all text variants)
                kill_detected = False
                if self._fsm.state in (
                    FightState.ACTIVE_FIGHT, FightState.FIGHT_RESOLVING,
                ):
                    kill_text_frame = self._capture.crop_region(full_frame, KILL_TEXT_REGION)
                    kill_detected = self._enemy_felled.detect(kill_text_frame)
                    if kill_detected:
                        _, png_buf = cv2.imencode(".png", full_frame)
                        self._kill_screenshot = base64.b64encode(png_buf).decode("ascii")
                        logger.info("Kill screenshot captured ({} bytes)", len(self._kill_screenshot))
                    # Log kill confidence during resolving for diagnosis (DEBUG to avoid spam)
                    if self._fsm.state == FightState.FIGHT_RESOLVING:
                        conf = self._enemy_felled.last_confidence
                        self._resolve_log_count += 1
                        if self._resolve_log_count % 10 == 1:
                            logger.debug(
                                "Kill detection resolving — confidence: {:.3f} (threshold: {:.2f})",
                                conf, self._enemy_felled._threshold,
                            )
                        # Save debug frames: first frame + when gold content detected
                        # (captures actual kill text for diagnosis, not arbitrary intervals)
                        self._resolving_debug_count += 1
                        should_save = False
                        if self._resolving_debug_count == 1:
                            should_save = True  # Always save first frame as reference
                        elif conf >= 0.3 and not self._resolving_gold_saved:
                            should_save = True  # Save when confidence is notable (likely kill text)
                            self._resolving_gold_saved = True
                        if should_save:
                            dbg_dir = self._config.data_dir / "screenshots"
                            dbg_dir.mkdir(parents=True, exist_ok=True)
                            ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                            cv2.imwrite(str(dbg_dir / f"{ts}_kill_region.png"), kill_text_frame)
                            cv2.imwrite(str(dbg_dir / f"{ts}_kill_full.png"), full_frame)
                            logger.debug("Kill debug screenshot saved (conf={:.3f}, frame #{})", conf, self._resolving_debug_count)

                # Co-op detection disabled — structural fallback has too many false positives
                # TODO: re-enable when a proper coop_template is available
                # if bar_detected and self._fsm.state == FightState.ENCOUNTER_PENDING:
                #     coop_frame = self._capture.crop_region(full_frame, COOP_REGION)
                #     self._coop_detected = self._coop.detect(coop_frame)

                # Run OCR once per encounter (when health bar first confirmed)
                # Also re-run OCR when bar reappears during FIGHT_RESOLVING
                # to detect if a different boss appeared (new encounter).
                boss_name = self._current_boss_name
                if (
                    bar_detected
                    and (
                        (self._fsm.state == FightState.ENCOUNTER_PENDING and self._current_boss_name is None)
                        or self._fsm.state == FightState.FIGHT_RESOLVING
                    )
                ):
                    # Check for double boss fight (two health bars stacked)
                    double_bar_frame = self._capture.crop_region(full_frame, DOUBLE_BOSS_BAR_REGION)
                    bar_count = self._health_bar.count_bars(double_bar_frame)

                    detected_name = None
                    boss_name_frame = None

                    if bar_count >= 2 and double_bar_frame is not None:
                        # Double boss: split expanded region into top/bottom halves
                        # and OCR each half for separate boss names
                        dh = double_bar_frame.shape[0]
                        top_half = double_bar_frame[:dh // 2, :]
                        bottom_half = double_bar_frame[dh // 2:, :]

                        name1 = self._boss_name.detect(top_half)
                        fallback1 = self._boss_name.last_was_fallback
                        name2 = self._boss_name.detect(bottom_half)
                        fallback2 = self._boss_name.last_was_fallback

                        if name1 and name2 and name1 != name2:
                            detected_name = f"{name1} & {name2}"
                            self._current_boss_is_fallback = fallback1 or fallback2
                            logger.info("Double boss identified: {} & {}", name1, name2)
                        elif name1:
                            detected_name = name1
                            self._current_boss_is_fallback = fallback1
                            logger.info("Double boss region but only one name: {}", name1)
                        elif name2:
                            detected_name = name2
                            self._current_boss_is_fallback = fallback2
                            logger.info("Double boss region but only one name: {}", name2)

                    if detected_name is None:
                        # Single boss (or double boss OCR failed): use normal region
                        if boss_bar_frame is not None:
                            bar_h = boss_bar_frame.shape[0]
                            name_bottom = int(bar_h * 0.45)  # top 45% = name area
                            boss_name_frame = boss_bar_frame[:name_bottom, :]
                            detected_name = self._boss_name.detect(boss_name_frame)
                        if detected_name is None and boss_bar_frame is not None:
                            detected_name = self._boss_name.detect(boss_bar_frame)

                    if detected_name:
                        boss_name = detected_name
                        if self._fsm.state == FightState.FIGHT_RESOLVING:
                            # Don't overwrite _current_boss_name yet — let FSM
                            # compare old vs new and decide (abandon + new encounter
                            # or multi-phase).  FSM's on_encounter callback will
                            # trigger _reset_fight_state → _current_boss_name = None
                            # followed by a fresh OCR on the new encounter.
                            logger.info("OCR during resolving: {}", detected_name)
                        else:
                            self._current_boss_name = detected_name
                            if bar_count < 2:
                                self._current_boss_is_fallback = self._boss_name.last_was_fallback
                            logger.info("Boss identified: {}{}", detected_name,
                                        " (OCR fallback)" if self._current_boss_is_fallback else "")
                        # Save encounter screenshot
                        if self._config.debug_screenshots:
                            self._save_debug_screenshot(bar_detected, False)
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
                            if bar_count >= 2 and double_bar_frame is not None:
                                cv2.imwrite(str(dbg_dir / f"{ts}_double_bar_region.png"), double_bar_frame)
                            if hasattr(self._boss_name, "_last_input_frame"):
                                cv2.imwrite(
                                    str(dbg_dir / f"{ts}_ocr_input.png"),
                                    self._boss_name._last_input_frame,
                                )
                            if hasattr(self._boss_name, "_last_debug_frames"):
                                for label, img in self._boss_name._last_debug_frames.items():
                                    cv2.imwrite(
                                        str(dbg_dir / f"{ts}_preproc_{label}.png"), img,
                                    )

                # Retry OCR in ACTIVE_FIGHT when boss name is unknown.
                # This catches cases where the first OCR failed (e.g. bar was
                # partially loaded) but the boss name becomes readable later.
                if (
                    self._fsm.state == FightState.ACTIVE_FIGHT
                    and self._current_boss_name is None
                    and time.time() - self._last_ocr_retry_time >= 2.0
                ):
                    self._last_ocr_retry_time = time.time()
                    if boss_bar_frame is not None:
                        bar_h = boss_bar_frame.shape[0]
                        name_bottom = int(bar_h * 0.45)
                        retry_frame = boss_bar_frame[:name_bottom, :]
                        retry_name = self._boss_name.detect(retry_frame)
                        if retry_name:
                            logger.info("OCR retry found boss name: {}", retry_name)
                            self._current_boss_name = retry_name
                            self._current_boss_is_fallback = self._boss_name.last_was_fallback
                            boss_name = retry_name
                            # Update FSM's internal boss name
                            self._fsm._current_boss = retry_name
                            # Send the encounter event that was skipped for "Unknown Boss"
                            self._on_encounter(retry_name)

                # Phase transition check: periodically re-run OCR during
                # ACTIVE_FIGHT for known multi-phase bosses (e.g. Clerc Bestial
                # → Maliketh) where the health bar stays visible during the
                # transformation and never enters FIGHT_RESOLVING.
                if (
                    self._fsm.state == FightState.ACTIVE_FIGHT
                    and bar_detected
                    and self._current_boss_name in PHASE_TRANSITIONS
                    and time.time() - self._last_phase_check_time >= 5.0
                ):
                    self._last_phase_check_time = time.time()
                    if boss_bar_frame is not None:
                        bar_h = boss_bar_frame.shape[0]
                        name_bottom = int(bar_h * 0.45)
                        phase_frame = boss_bar_frame[:name_bottom, :]
                        phase_name = self._boss_name.detect(phase_frame)
                        if phase_name and phase_name != self._current_boss_name:
                            logger.info(
                                "Phase transition detected via OCR: {} → {}",
                                self._current_boss_name, phase_name,
                            )
                            self._current_boss_name = phase_name
                            self._current_boss_is_fallback = self._boss_name.last_was_fallback
                            boss_name = phase_name
                            self._fsm._current_boss = phase_name

                # During FIGHT_RESOLVING, require higher confidence for bar
                # reappearance.  The structural fallback often picks up red
                # scene elements at 0.3-0.6 confidence — these are NOT the
                # health bar and cause constant resolving→active bouncing.
                fsm_bar_detected = bar_detected
                if self._fsm.state == FightState.FIGHT_RESOLVING and bar_detected:
                    if self._health_bar.last_confidence < 0.6:
                        fsm_bar_detected = False
                        logger.trace(
                            "Suppressed bar reappearance (confidence {:.3f} < 0.6)",
                            self._health_bar.last_confidence,
                        )

                prev_fsm_state = self._fsm.state

                # Feed FSM
                self._fsm.process_frame(
                    boss_bar_detected=fsm_bar_detected,
                    boss_name=boss_name,
                    death_detected=death_detected,
                    kill_detected=kill_detected,
                )

                # Sync watcher boss name if FSM updated it (e.g. Unknown → valid name)
                if (
                    prev_fsm_state == FightState.FIGHT_RESOLVING
                    and self._fsm.state == FightState.ACTIVE_FIGHT
                    and self._fsm._current_boss
                    and self._fsm._current_boss != self._current_boss_name
                ):
                    logger.info("Syncing boss name from FSM: {}", self._fsm._current_boss)
                    self._current_boss_name = self._fsm._current_boss
                    self._current_boss_is_fallback = False

                # Reset health bar confirmer when entering FIGHT_RESOLVING
                # so that bar reappearance needs 3 fresh consecutive frames.
                if (
                    self._fsm.state == FightState.FIGHT_RESOLVING
                    and prev_fsm_state != FightState.FIGHT_RESOLVING
                ):
                    self._health_bar._confirmer.reset()

                # Debug screenshots on detection triggers
                if self._config.debug_screenshots:
                    self._save_debug_screenshot(bar_detected, death_detected, full_frame)

                # Periodic bar region dump when DEBUG level and no bar detected.
                # Saves the boss_bar crop every 10s so we can diagnose missed bars.
                if (
                    not bar_detected
                    and self._fsm.state == FightState.IDLE
                    and logger.level("DEBUG").no >= logger._core.min_level
                    and boss_bar_frame is not None
                ):
                    now_dbg = time.time()
                    if not hasattr(self, '_last_bar_dump_time'):
                        self._last_bar_dump_time = 0.0
                    if now_dbg - self._last_bar_dump_time >= 10.0:
                        self._last_bar_dump_time = now_dbg
                        dump_dir = self._config.data_dir / "screenshots" / "bar_dumps"
                        dump_dir.mkdir(parents=True, exist_ok=True)
                        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                        cv2.imwrite(
                            str(dump_dir / f"{ts}_bar_conf{self._health_bar.last_confidence:.3f}.png"),
                            boss_bar_frame,
                        )
                        logger.debug(
                            "Bar dump saved (confidence={:.3f}, red_ratio check in file)",
                            self._health_bar.last_confidence,
                        )

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

                # Heartbeat: log every 60s to prove the loop is alive
                now_hb = time.time()
                if now_hb - last_heartbeat >= 60.0:
                    logger.debug("Heartbeat: alive, state={}, frames_null={}", self._fsm.state.name, none_frame_count)
                    last_heartbeat = now_hb
                    none_frame_count = 0

            except Exception:
                logger.opt(exception=True).error("Detection loop error")
                time.sleep(1.0)  # Avoid tight error loop

    def _on_encounter(self, boss_name: str) -> None:
        """FSM callback: boss encounter confirmed."""
        if self._coop_detected:
            logger.info("Co-op detected — skipping encounter event for {}", boss_name)
            return

        self._fight_start_time = time.time()

        if boss_name == "Unknown Boss":
            if not self._unknown_boss_logged:
                logger.warning("Boss non reconnu — aucun événement ne sera envoyé pour ce combat")
                self._unknown_boss_logged = True
            return

        # Use the current frame (already captured) for encounter screenshot
        try:
            if self._current_frame is not None:
                _, png_buf = cv2.imencode(".png", self._current_frame)
                self._encounter_screenshot = base64.b64encode(png_buf).decode("ascii")
                logger.debug("Encounter screenshot captured ({} bytes)", len(self._encounter_screenshot))
            else:
                logger.warning("No current frame available for encounter screenshot")
        except Exception as exc:
            logger.debug("Failed to capture encounter screenshot: {}", exc)

        logger.info("Boss encounter: {}", boss_name)
        event = {
            "type": "boss_encounter",
            "event_id": str(uuid.uuid4()),
            "boss_canonical_name": boss_name,
            "session_id": self._session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if self._current_boss_is_fallback:
            event["ocr_fallback"] = True
        if self._encounter_screenshot:
            event["screenshot_base64"] = self._encounter_screenshot
        self._http_client.send_event(event)

    def _on_death(self, boss_name: str) -> None:
        """FSM callback: player death."""
        if boss_name == "Unknown Boss":
            self._reset_fight_state()
            return

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
        if boss_name == "Unknown Boss":
            self._reset_fight_state()
            return

        duration = int(time.time() - self._fight_start_time) if self._fight_start_time else 0
        logger.info("Boss killed: {} ({}s)", boss_name, duration)
        event = {
            "type": "boss_kill",
            "event_id": str(uuid.uuid4()),
            "boss_canonical_name": boss_name,
            "session_id": self._session_id,
            "duration_seconds": duration,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if self._kill_screenshot:
            event["screenshot_base64"] = self._kill_screenshot
        self._http_client.send_event(event)
        self._reset_fight_state()

    def _on_abandon(self, boss_name: str) -> None:
        """FSM callback: fight abandoned."""
        if boss_name == "Unknown Boss":
            self._reset_fight_state()
            return

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
        self._current_boss_is_fallback = False
        self._coop_detected = False
        self._fight_start_time = None
        self._kill_screenshot = None
        self._encounter_screenshot = None
        self._unknown_boss_logged = False
        self._resolving_debug_count = 0
        self._resolving_gold_saved = False
        self._resolve_log_count = 0
        self._last_ocr_confirm_time = 0.0
        self._last_ocr_retry_time = 0.0
        self._last_phase_check_time = 0.0

    def _save_debug_screenshot(
        self, bar_detected: bool, death_detected: bool, frame: np.ndarray | None = None,
    ) -> None:
        """Save debug screenshots on detection triggers.

        Rate-limited to max 1 per 2 seconds to avoid I/O thrashing.

        Args:
            bar_detected: Whether the boss health bar is visible.
            death_detected: Whether death text is visible.
            frame: Pre-captured frame to save (avoids extra BetterCam grab).
        """
        if not (bar_detected or death_detected):
            return

        now = time.time()
        if now - self._last_debug_screenshot_time < 2.0:
            return
        self._last_debug_screenshot_time = now

        screenshot_dir = self._config.data_dir / "screenshots"
        screenshot_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        event_type = "death" if death_detected else "bar"

        if frame is None:
            frame = self._capture.capture_full()
        if frame is not None:
            path = screenshot_dir / f"{timestamp}_{event_type}.png"
            cv2.imwrite(str(path), frame)
            logger.debug("Debug screenshot saved: {}", path.name)
