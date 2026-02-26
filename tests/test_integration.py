"""End-to-end integration tests for the detection pipeline.

Tests validate FSM-driven behavior without needing actual screen captures.
Run with: python -m pytest tests/test_integration.py -v
"""

from __future__ import annotations

import time

import pytest

from watcher.state_machine import BossFightFSM, FightState


class TestFullPipeline:
    """End-to-end pipeline tests using FSM with simulated inputs."""

    def test_encounter_to_death_sequence(self):
        """Simulate: boss bar appears -> confirmed -> YOU DIED -> death event."""
        events: list[tuple[str, str]] = []
        fsm = BossFightFSM(
            on_encounter=lambda name: events.append(("encounter", name)),
            on_death=lambda name: events.append(("death", name)),
            on_kill=lambda name: events.append(("kill", name)),
            on_abandon=lambda name: events.append(("abandon", name)),
            encounter_confirm_frames=3,
        )
        # Confirm encounter
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Margit, l'Omen Feal")
        assert ("encounter", "Margit, l'Omen Feal") in events

        # Death
        fsm.process_frame(boss_bar_detected=False, death_detected=True)
        assert ("death", "Margit, l'Omen Feal") in events
        assert len([e for e in events if e[0] == "encounter"]) == 1

    def test_encounter_to_kill_sequence(self):
        """Simulate: boss bar appears -> confirmed -> bar gone >window -> kill."""
        events: list[tuple[str, str]] = []
        fsm = BossFightFSM(
            on_encounter=lambda name: events.append(("encounter", name)),
            on_death=lambda name: events.append(("death", name)),
            on_kill=lambda name: events.append(("kill", name)),
            on_abandon=lambda name: events.append(("abandon", name)),
            encounter_confirm_frames=3,
            phase_transition_window=0.3,
        )
        # Confirm encounter
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Godrick le Greffé")

        # Bar disappears, wait for kill timeout
        start = time.time()
        while time.time() - start < 0.6:
            fsm.process_frame(boss_bar_detected=False)
            time.sleep(0.05)

        assert ("kill", "Godrick le Greffé") in events

    def test_multiphase_boss_no_duplicate(self):
        """Simulate: bar appears -> bar gone briefly -> bar returns -> one encounter."""
        events: list[tuple[str, str]] = []
        fsm = BossFightFSM(
            on_encounter=lambda name: events.append(("encounter", name)),
            on_death=lambda name: events.append(("death", name)),
            on_kill=lambda name: events.append(("kill", name)),
            on_abandon=lambda name: events.append(("abandon", name)),
            encounter_confirm_frames=3,
            phase_transition_window=5.0,
        )
        # Phase 1
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Malenia, Lame de Miquella")
        # Bar disappears briefly (phase transition)
        for _ in range(10):
            fsm.process_frame(boss_bar_detected=False)
            time.sleep(0.05)
        # Bar reappears (phase 2)
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Malenia, Lame de Miquella")

        encounters = [e for e in events if e[0] == "encounter"]
        assert len(encounters) == 1, f"Expected 1 encounter, got {len(encounters)}"

    def test_no_events_in_idle(self):
        """No events when no boss bar detected."""
        events: list[tuple[str, str]] = []
        fsm = BossFightFSM(
            on_encounter=lambda name: events.append(("encounter", name)),
            on_death=lambda name: events.append(("death", name)),
            on_kill=lambda name: events.append(("kill", name)),
            on_abandon=lambda name: events.append(("abandon", name)),
        )
        for _ in range(100):
            fsm.process_frame(boss_bar_detected=False)
        assert len(events) == 0

    def test_rapid_successive_fights(self):
        """Two fights separated by cooldown produce two encounters."""
        events: list[tuple[str, str]] = []
        fsm = BossFightFSM(
            on_encounter=lambda name: events.append(("encounter", name)),
            on_death=lambda name: events.append(("death", name)),
            on_kill=lambda name: events.append(("kill", name)),
            on_abandon=lambda name: events.append(("abandon", name)),
            encounter_confirm_frames=3,
            phase_transition_window=0.2,
            cooldown_duration=0.2,
        )
        # Fight 1
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Boss A")
        # Death
        fsm.process_frame(boss_bar_detected=False, death_detected=True)
        # Wait for cooldown
        start = time.time()
        while time.time() - start < 0.5:
            fsm.process_frame(boss_bar_detected=False)
            time.sleep(0.05)

        # Fight 2
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Boss B")

        encounters = [e for e in events if e[0] == "encounter"]
        assert len(encounters) == 2
        assert encounters[0][1] == "Boss A"
        assert encounters[1][1] == "Boss B"

    def test_death_during_resolving(self):
        """Death during fight resolving still emits death event."""
        events: list[tuple[str, str]] = []
        fsm = BossFightFSM(
            on_encounter=lambda name: events.append(("encounter", name)),
            on_death=lambda name: events.append(("death", name)),
            on_kill=lambda name: events.append(("kill", name)),
            on_abandon=lambda name: events.append(("abandon", name)),
            encounter_confirm_frames=3,
            phase_transition_window=5.0,
        )
        # Encounter
        for _ in range(5):
            fsm.process_frame(boss_bar_detected=True, boss_name="Test Boss")
        # Bar disappears (enters FIGHT_RESOLVING)
        fsm.process_frame(boss_bar_detected=False)
        assert fsm.state == FightState.FIGHT_RESOLVING
        # Death detected during resolution
        fsm.process_frame(boss_bar_detected=False, death_detected=True)
        assert ("death", "Test Boss") in events

    def test_coop_skips_event_emission(self):
        """Document that co-op filtering happens in Watcher._on_encounter, not FSM.

        The FSM does not know about co-op. Co-op filtering is the Watcher's
        responsibility — it checks co-op state in the _on_encounter callback
        and skips HTTP event emission if phantoms are detected.
        """
        # This is a design documentation test — co-op is not an FSM concern
        pass
