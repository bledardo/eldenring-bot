"""Boss fight state machine — lifecycle management for encounters, deaths, kills, and abandons.

Uses the `transitions` library to define states and transitions. The FSM is time-aware:
phase_transition_window and cooldown use real timestamps, not frame counts.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from enum import Enum

from loguru import logger
from transitions import Machine


class FightState(str, Enum):
    """Boss fight lifecycle states."""

    IDLE = "idle"
    ENCOUNTER_PENDING = "encounter_pending"
    ACTIVE_FIGHT = "active_fight"
    FIGHT_RESOLVING = "fight_resolving"
    COOLDOWN = "cooldown"


class BossFightFSM:
    """Finite state machine for boss fight lifecycle.

    Prevents duplicate events from health bar flicker, handles multi-phase boss
    transitions, and ensures exactly-once event emission for encounters, deaths,
    kills, and abandons.

    Args:
        on_encounter: Callback when encounter is confirmed.
        on_death: Callback when death is detected during fight.
        on_kill: Callback when boss is killed.
        on_abandon: Callback when fight is abandoned (session end or force_abandon).
        encounter_confirm_frames: Consecutive frames needed to confirm encounter.
        cooldown_duration: Seconds after resolution before accepting new encounters.
    """

    def __init__(
        self,
        on_encounter: Callable[[str], None],
        on_death: Callable[[str], None],
        on_kill: Callable[[str], None],
        on_abandon: Callable[[str], None],
        encounter_confirm_frames: int = 3,
        cooldown_duration: float = 5.0,
    ) -> None:
        self._on_encounter = on_encounter
        self._on_death = on_death
        self._on_kill = on_kill
        self._on_abandon = on_abandon

        self.encounter_confirm_frames = encounter_confirm_frames
        self.cooldown_duration = cooldown_duration
        self.bar_gone_grace: float = 1.5  # seconds to wait before resolving (death detector needs time)
        self.resolve_timeout: float = 90.0  # seconds before auto-abandoning a resolving fight

        # Internal tracking
        self._confirm_count: int = 0
        self._current_boss: str | None = None
        self._resolution_start: float | None = None
        self._cooldown_start: float | None = None
        self._bar_gone_start: float | None = None

        # State (managed manually for simplicity — transitions lib used for logging)
        self.state = FightState.IDLE

    def process_frame(
        self,
        boss_bar_detected: bool,
        boss_name: str | None = None,
        death_detected: bool = False,
        kill_detected: bool = False,
        timestamp: float | None = None,
    ) -> None:
        """Process a single frame of detection data.

        This is the main method called every frame. Handles state transitions
        based on current state and detection inputs.

        Args:
            boss_bar_detected: Whether the boss health bar is visible.
            boss_name: Detected boss name (only needed on first detection).
            death_detected: Whether the "YOU DIED" screen is detected.
            kill_detected: Whether the gold "ENEMY FELLED" text is detected.
            timestamp: Frame timestamp; uses time.time() if not provided.
        """
        now = timestamp if timestamp is not None else time.time()

        if self.state == FightState.IDLE:
            self._handle_idle(boss_bar_detected, boss_name)

        elif self.state == FightState.ENCOUNTER_PENDING:
            self._handle_encounter_pending(boss_bar_detected, boss_name)

        elif self.state == FightState.ACTIVE_FIGHT:
            self._handle_active_fight(boss_bar_detected, death_detected, kill_detected, now)

        elif self.state == FightState.FIGHT_RESOLVING:
            self._handle_fight_resolving(boss_bar_detected, death_detected, kill_detected, now)

        elif self.state == FightState.COOLDOWN:
            self._handle_cooldown(now)

    def _handle_idle(self, boss_bar_detected: bool, boss_name: str | None) -> None:
        """IDLE: waiting for boss bar to appear."""
        if boss_bar_detected:
            self._confirm_count = 1
            self._current_boss = boss_name
            self._transition_to(FightState.ENCOUNTER_PENDING)

    def _handle_encounter_pending(self, boss_bar_detected: bool, boss_name: str | None) -> None:
        """ENCOUNTER_PENDING: counting consecutive frames for confirmation."""
        if boss_bar_detected:
            self._confirm_count += 1
            if boss_name:
                self._current_boss = boss_name  # Update with latest name

            if self._confirm_count >= self.encounter_confirm_frames:
                # Encounter confirmed
                self._transition_to(FightState.ACTIVE_FIGHT)
                boss = self._current_boss or "Unknown Boss"
                logger.info("Boss encounter confirmed: {}", boss)
                self._on_encounter(boss)
        else:
            # Flicker — bar disappeared before confirmation
            logger.debug("Encounter pending reset (flicker after {} frames)", self._confirm_count)
            self._confirm_count = 0
            self._current_boss = None
            self._transition_to(FightState.IDLE)

    def _handle_active_fight(
        self, boss_bar_detected: bool, death_detected: bool, kill_detected: bool, now: float
    ) -> None:
        """ACTIVE_FIGHT: boss bar is present, fight is ongoing."""
        if death_detected:
            # Death takes priority
            boss = self._current_boss or "Unknown Boss"
            logger.info("Player death detected during fight with {}", boss)
            self._on_death(boss)
            self._cooldown_start = now
            self._bar_gone_start = None
            self._transition_to(FightState.COOLDOWN)

        elif kill_detected:
            # Gold text = immediate kill confirmation
            boss = self._current_boss or "Unknown Boss"
            logger.info("Kill confirmed (gold text) for {}", boss)
            self._on_kill(boss)
            self._cooldown_start = now
            self._bar_gone_start = None
            self._transition_to(FightState.COOLDOWN)

        elif not boss_bar_detected:
            # Bar disappeared — wait a grace period before entering resolving
            # to give the death detector time to confirm (needs 2 consecutive frames).
            # This prevents "boss killed" false positives when the player dies.
            if self._bar_gone_start is None:
                self._bar_gone_start = now
            elif now - self._bar_gone_start > self.bar_gone_grace:
                self._bar_gone_start = None
                # "Unknown Boss" = OCR failed → likely false positive, skip resolving
                if self._current_boss == "Unknown Boss":
                    logger.info("Bar gone + Unknown Boss — abandoning (likely false positive)")
                    self._on_abandon("Unknown Boss")
                    self._cooldown_start = now
                    self._transition_to(FightState.COOLDOWN)
                else:
                    self._resolution_start = now
                    self._transition_to(FightState.FIGHT_RESOLVING)

        else:
            # Bar still present — reset grace timer
            self._bar_gone_start = None

    def _handle_fight_resolving(
        self, boss_bar_detected: bool, death_detected: bool, kill_detected: bool, now: float
    ) -> None:
        """FIGHT_RESOLVING: bar disappeared, waiting to determine outcome.

        Stays in this state until a positive signal or timeout:
        - Kill text detected → kill
        - Death text detected → death
        - Boss bar reappears → back to active fight (multi-phase)
        - Timeout (resolve_timeout) → auto-abandon (prevents stuck state)
        Abandon is also triggered externally (session end or new encounter).
        """
        if death_detected:
            # Death detected during resolution
            boss = self._current_boss or "Unknown Boss"
            logger.info("Player death detected (resolving) against {}", boss)
            self._on_death(boss)
            self._cooldown_start = now
            self._transition_to(FightState.COOLDOWN)
            return

        if kill_detected:
            # Gold text = immediate kill confirmation
            boss = self._current_boss or "Unknown Boss"
            logger.info("Kill confirmed (gold text, resolving) for {}", boss)
            self._on_kill(boss)
            self._cooldown_start = now
            self._resolution_start = None
            self._transition_to(FightState.COOLDOWN)
            return

        if boss_bar_detected:
            # Bar reappeared — could be multi-phase or new encounter
            logger.info("Bar reappeared — multi-phase transition for {}", self._current_boss)
            self._resolution_start = None
            self._transition_to(FightState.ACTIVE_FIGHT)
            return

        # Auto-abandon after timeout to prevent stuck state
        # (e.g. false positive health bar with garbage OCR)
        if self._resolution_start is not None:
            elapsed = now - self._resolution_start
            if elapsed >= self.resolve_timeout:
                boss = self._current_boss or "Unknown Boss"
                logger.warning(
                    "Resolve timeout ({:.0f}s) — auto-abandoning fight with {}",
                    self.resolve_timeout, boss,
                )
                self._on_abandon(boss)
                self._cooldown_start = now
                self._resolution_start = None
                self._transition_to(FightState.COOLDOWN)
                return
            if int(elapsed) % 30 == 0 and int(elapsed) > 0:
                logger.debug("Still resolving for {} ({:.0f}s)...", self._current_boss, elapsed)

    def _handle_cooldown(self, now: float) -> None:
        """COOLDOWN: waiting before accepting new encounters."""
        if self._cooldown_start is not None:
            elapsed = now - self._cooldown_start
            if elapsed >= self.cooldown_duration:
                logger.debug("Cooldown expired, returning to IDLE")
                self._cooldown_start = None
                self._current_boss = None
                self._confirm_count = 0
                self._transition_to(FightState.IDLE)

    def force_abandon(self) -> None:
        """Force-abandon the current fight (called on session end / game exit).

        Only acts if there's an active or resolving fight.
        """
        if self.state in (FightState.ACTIVE_FIGHT, FightState.FIGHT_RESOLVING):
            boss = self._current_boss or "Unknown Boss"
            logger.info("Force-abandoning fight with {} (session end)", boss)
            self._on_abandon(boss)
            self._resolution_start = None
            self._cooldown_start = None
            self._current_boss = None
            self._confirm_count = 0
            self.state = FightState.IDLE

    def _transition_to(self, new_state: FightState) -> None:
        """Log and execute state transition."""
        if self.state != new_state:
            logger.debug("FSM: {} -> {}", self.state.value, new_state.value)
        self.state = new_state
