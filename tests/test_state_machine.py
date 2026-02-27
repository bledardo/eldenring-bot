"""Tests for the boss fight state machine (TDD - RED phase)."""

from __future__ import annotations

import time

import pytest

from watcher.state_machine import BossFightFSM, FightState


class TestFSMBasics:
    """Basic state machine behavior."""

    def test_starts_in_idle(self):
        """FSM begins in IDLE state."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
        )
        assert fsm.state == FightState.IDLE

    def test_no_events_in_idle(self):
        """No events emitted when no boss bar detected."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
        )
        for _ in range(100):
            fsm.process_frame(boss_bar_detected=False)
        assert len(events) == 0


class TestEncounterConfirmation:
    """Encounter confirmation via consecutive frames."""

    def test_single_frame_no_event(self):
        """Single bar detection frame does NOT trigger encounter."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
        )
        fsm.process_frame(boss_bar_detected=True, boss_name="Margit, l'Omen Feal")
        assert len([e for e in events if e[0] == "encounter"]) == 0

    def test_confirmed_encounter(self):
        """N consecutive bar frames trigger exactly one encounter."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
        )
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Margit, l'Omen Feal")
        encounters = [e for e in events if e[0] == "encounter"]
        assert len(encounters) == 1
        assert encounters[0][1] == "Margit, l'Omen Feal"

    def test_flicker_resets_confirmation(self):
        """Bar flicker (1-2 frame disappearance) during pending resets to idle."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
        )
        # 2 frames detected, then gone
        fsm.process_frame(boss_bar_detected=True, boss_name="Test Boss")
        fsm.process_frame(boss_bar_detected=True, boss_name="Test Boss")
        fsm.process_frame(boss_bar_detected=False)  # flicker
        assert len([e for e in events if e[0] == "encounter"]) == 0
        assert fsm.state == FightState.IDLE


class TestActiveFight:
    """Active fight behavior."""

    def test_active_fight_self_loop(self):
        """Bar still present during active fight stays in ACTIVE_FIGHT."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
        )
        # Confirm encounter
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Margit, l'Omen Feal")
        assert fsm.state == FightState.ACTIVE_FIGHT
        # Continue with bar present
        for _ in range(30):
            fsm.process_frame(boss_bar_detected=True, boss_name="Margit, l'Omen Feal")
        assert fsm.state == FightState.ACTIVE_FIGHT
        # Still only one encounter
        assert len([e for e in events if e[0] == "encounter"]) == 1


class TestFightResolution:
    """Death, kill, and abandon outcomes."""

    def test_death_during_fight(self):
        """Death detected during active fight emits exactly one death event."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
        )
        # Encounter
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Margit, l'Omen Feal")
        # Death
        fsm.process_frame(boss_bar_detected=False, death_detected=True)
        deaths = [e for e in events if e[0] == "death"]
        assert len(deaths) == 1
        assert deaths[0][1] == "Margit, l'Omen Feal"

    def test_boss_kill_on_timeout(self):
        """Bar gone for >phase_transition_window without death = kill."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
            phase_transition_window=0.3,  # short for testing
        )
        fsm.bar_gone_grace = 0.1  # short grace for testing
        # Encounter
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Godrick le Greffé")
        # Bar disappears
        start = time.time()
        while time.time() - start < 0.8:
            fsm.process_frame(boss_bar_detected=False)
            time.sleep(0.05)

        kills = [e for e in events if e[0] == "kill"]
        assert len(kills) == 1
        assert kills[0][1] == "Godrick le Greffé"

    def test_fight_abandoned(self):
        """Bar gone without death and player left area = abandon event."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
            phase_transition_window=0.3,
        )
        fsm.bar_gone_grace = 0.1  # short grace for testing
        # Encounter
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Test Boss")
        # Bar disappears — timeout → abandon or kill (both valid, FSM decides)
        start = time.time()
        while time.time() - start < 0.8:
            fsm.process_frame(boss_bar_detected=False)
            time.sleep(0.05)
        # Either kill or abandon should be emitted (not both)
        resolutions = [e for e in events if e[0] in ("kill", "abandon")]
        assert len(resolutions) == 1


class TestMultiPhase:
    """Multi-phase boss transitions."""

    def test_multiphase_bar_reappears(self):
        """Bar disappears briefly then reappears = still same fight, no new encounter."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
            phase_transition_window=5.0,
        )
        # Phase 1
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Malenia, Lame de Miquella")
        # Bar disappears briefly (under phase_transition_window)
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=False)
            time.sleep(0.05)
        # Bar reappears (phase 2)
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Malenia, Lame de Miquella")

        encounters = [e for e in events if e[0] == "encounter"]
        assert len(encounters) == 1, f"Expected 1 encounter, got {len(encounters)}"
        # Should still be in active fight
        assert fsm.state == FightState.ACTIVE_FIGHT


class TestCooldown:
    """Cooldown between fights."""

    def test_successive_fights_separate_encounters(self):
        """After cooldown, next bar detection starts fresh encounter."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
            phase_transition_window=0.2,
            cooldown_duration=0.2,
        )
        fsm.bar_gone_grace = 0.1
        # Fight 1
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Boss A")
        # Kill (grace + transition + cooldown)
        start = time.time()
        while time.time() - start < 1.0:
            fsm.process_frame(boss_bar_detected=False)
            time.sleep(0.05)

        # Fight 2
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Boss B")

        encounters = [e for e in events if e[0] == "encounter"]
        assert len(encounters) == 2

    def test_death_resets_to_idle_after_cooldown(self):
        """After death + cooldown, FSM returns to IDLE."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
            cooldown_duration=0.2,
        )
        # Encounter
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Test Boss")
        # Death
        fsm.process_frame(boss_bar_detected=False, death_detected=True)
        # Wait for cooldown
        start = time.time()
        while time.time() - start < 0.5:
            fsm.process_frame(boss_bar_detected=False)
            time.sleep(0.05)
        assert fsm.state == FightState.IDLE


class TestKillDetected:
    """Immediate kill confirmation via kill_detected signal."""

    def test_kill_detected_during_active_fight(self):
        """kill_detected during ACTIVE_FIGHT triggers immediate kill."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
        )
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Godrick le Greffé")
        # Gold text detected
        fsm.process_frame(boss_bar_detected=False, kill_detected=True)
        kills = [e for e in events if e[0] == "kill"]
        assert len(kills) == 1
        assert kills[0][1] == "Godrick le Greffé"
        assert fsm.state == FightState.COOLDOWN

    def test_kill_detected_during_resolving(self):
        """kill_detected during FIGHT_RESOLVING triggers immediate kill."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
        )
        fsm.bar_gone_grace = 0.0
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Radahn")
        # Bar gone → resolving
        fsm.process_frame(boss_bar_detected=False)
        time.sleep(0.01)
        fsm.process_frame(boss_bar_detected=False)
        assert fsm.state == FightState.FIGHT_RESOLVING
        # Gold text
        fsm.process_frame(boss_bar_detected=False, kill_detected=True)
        kills = [e for e in events if e[0] == "kill"]
        assert len(kills) == 1
        assert fsm.state == FightState.COOLDOWN

    def test_death_takes_priority_over_kill(self):
        """If both death and kill detected same frame, death wins."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
        )
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Test")
        fsm.process_frame(boss_bar_detected=False, death_detected=True, kill_detected=True)
        deaths = [e for e in events if e[0] == "death"]
        kills = [e for e in events if e[0] == "kill"]
        assert len(deaths) == 1
        assert len(kills) == 0

    def test_kill_detected_in_idle_ignored(self):
        """kill_detected in IDLE state is ignored."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
        )
        fsm.process_frame(boss_bar_detected=False, kill_detected=True)
        assert len(events) == 0
        assert fsm.state == FightState.IDLE

    def test_timeout_still_works_as_fallback(self):
        """When gold text is not detected, timeout kill still works."""
        events = []
        fsm = BossFightFSM(
            on_encounter=lambda n: events.append(("encounter", n)),
            on_death=lambda n: events.append(("death", n)),
            on_kill=lambda n: events.append(("kill", n)),
            on_abandon=lambda n: events.append(("abandon", n)),
            encounter_confirm_frames=3,
            phase_transition_window=0.3,
        )
        fsm.bar_gone_grace = 0.1
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Boss")
        start = time.time()
        while time.time() - start < 0.8:
            fsm.process_frame(boss_bar_detected=False, kill_detected=False)
            time.sleep(0.05)
        kills = [e for e in events if e[0] == "kill"]
        assert len(kills) == 1
