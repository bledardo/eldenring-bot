"""Tests for Watcher event payload shapes (BREAK 1-4 fixes).

Validates that all Watcher callbacks emit correct field names and values:
- boss_canonical_name (not boss_name)
- event_id (UUID4 format)
- session_id (threaded from start())
- duration_seconds (computed from fight start time)
"""
from __future__ import annotations

import time

import pytest
from unittest.mock import MagicMock, patch, call


def _make_watcher(session_id="test-session-123"):
    """Create a Watcher with all dependencies mocked."""
    with patch("watcher.watcher.ScreenCapture"), \
         patch("watcher.watcher.HealthBarDetector"), \
         patch("watcher.watcher.YouDiedDetector"), \
         patch("watcher.watcher.BossNameDetector"), \
         patch("watcher.watcher.CoopDetector"), \
         patch("watcher.watcher.BossFightFSM"):

        from watcher.config import Config
        from watcher.watcher import Watcher

        config = MagicMock(spec=Config)
        config.capture_fps = 10
        config.debug_screenshots = False
        config.data_dir = MagicMock()

        http_client = MagicMock()
        tray = MagicMock()

        watcher = Watcher(config, http_client, tray)
        watcher._session_id = session_id
        return watcher, http_client


def _get_sent_event(http_client):
    """Extract the event dict from the last send_event call."""
    assert http_client.send_event.called, "send_event was not called"
    return http_client.send_event.call_args[0][0]


def _validate_uuid(value):
    """Check that a string looks like a UUID4."""
    assert isinstance(value, str)
    assert len(value) == 36
    assert value.count("-") == 4


class TestEncounterPayload:
    def test_encounter_sends_boss_canonical_name(self):
        watcher, http_client = _make_watcher()
        watcher._on_encounter("Margit, the Fell Omen")
        event = _get_sent_event(http_client)
        assert event["boss_canonical_name"] == "Margit, the Fell Omen"
        assert "boss_name" not in event

    def test_encounter_includes_event_id(self):
        watcher, http_client = _make_watcher()
        watcher._on_encounter("Margit, the Fell Omen")
        event = _get_sent_event(http_client)
        _validate_uuid(event["event_id"])

    def test_encounter_includes_session_id(self):
        watcher, http_client = _make_watcher(session_id="sess-abc-123")
        watcher._on_encounter("Margit, the Fell Omen")
        event = _get_sent_event(http_client)
        assert event["session_id"] == "sess-abc-123"

    def test_encounter_type_is_boss_encounter(self):
        watcher, http_client = _make_watcher()
        watcher._on_encounter("Margit, the Fell Omen")
        event = _get_sent_event(http_client)
        assert event["type"] == "boss_encounter"

    def test_encounter_sets_fight_start_time(self):
        watcher, _ = _make_watcher()
        watcher._on_encounter("Test Boss")
        assert watcher._fight_start_time is not None
        assert isinstance(watcher._fight_start_time, float)

    def test_encounter_skipped_when_coop(self):
        watcher, http_client = _make_watcher()
        watcher._coop_detected = True
        watcher._on_encounter("Test Boss")
        assert not http_client.send_event.called


class TestDeathPayload:
    def test_death_sends_duration_seconds(self):
        watcher, http_client = _make_watcher()
        watcher._fight_start_time = time.time() - 45
        watcher._on_death("Test Boss")
        event = _get_sent_event(http_client)
        assert 44 <= event["duration_seconds"] <= 46

    def test_death_sends_boss_canonical_name(self):
        watcher, http_client = _make_watcher()
        watcher._fight_start_time = time.time()
        watcher._on_death("Godrick the Grafted")
        event = _get_sent_event(http_client)
        assert event["boss_canonical_name"] == "Godrick the Grafted"
        assert "boss_name" not in event

    def test_death_includes_event_id(self):
        watcher, http_client = _make_watcher()
        watcher._fight_start_time = time.time()
        watcher._on_death("Test Boss")
        event = _get_sent_event(http_client)
        _validate_uuid(event["event_id"])

    def test_death_type_is_player_death(self):
        watcher, http_client = _make_watcher()
        watcher._fight_start_time = time.time()
        watcher._on_death("Test Boss")
        event = _get_sent_event(http_client)
        assert event["type"] == "player_death"


class TestKillPayload:
    def test_kill_sends_duration_seconds(self):
        watcher, http_client = _make_watcher()
        watcher._fight_start_time = time.time() - 120
        watcher._on_kill("Test Boss")
        event = _get_sent_event(http_client)
        assert 119 <= event["duration_seconds"] <= 121

    def test_kill_sends_boss_canonical_name(self):
        watcher, http_client = _make_watcher()
        watcher._fight_start_time = time.time()
        watcher._on_kill("Rennala, Queen of the Full Moon")
        event = _get_sent_event(http_client)
        assert event["boss_canonical_name"] == "Rennala, Queen of the Full Moon"

    def test_kill_type_is_boss_kill(self):
        watcher, http_client = _make_watcher()
        watcher._fight_start_time = time.time()
        watcher._on_kill("Test Boss")
        event = _get_sent_event(http_client)
        assert event["type"] == "boss_kill"


class TestAbandonPayload:
    def test_abandon_sends_all_fields(self):
        watcher, http_client = _make_watcher(session_id="sess-xyz")
        watcher._fight_start_time = time.time() - 30
        watcher._on_abandon("Test Boss")
        event = _get_sent_event(http_client)
        assert event["type"] == "fight_abandoned"
        assert event["boss_canonical_name"] == "Test Boss"
        assert event["session_id"] == "sess-xyz"
        _validate_uuid(event["event_id"])
        assert 29 <= event["duration_seconds"] <= 31


class TestSessionStart:
    def test_session_start_includes_session_id(self):
        with patch("watcher.watcher.ScreenCapture"), \
             patch("watcher.watcher.HealthBarDetector"), \
             patch("watcher.watcher.YouDiedDetector"), \
             patch("watcher.watcher.BossNameDetector"), \
             patch("watcher.watcher.CoopDetector"), \
             patch("watcher.watcher.BossFightFSM"), \
             patch("watcher.watcher._find_game_window", return_value=None):

            from watcher.config import Config
            from watcher.watcher import Watcher

            config = MagicMock(spec=Config)
            config.capture_fps = 10
            config.debug_screenshots = False
            config.data_dir = MagicMock()

            http_client = MagicMock()
            tray = MagicMock()

            watcher = Watcher(config, http_client, tray)
            # Patch _detection_loop to prevent infinite loop
            watcher._detection_loop = MagicMock()

            watcher.start(game_pid=1234, session_id="my-session-uuid")

            event = http_client.send_event.call_args[0][0]
            assert event["type"] == "session_start"
            assert event["session_id"] == "my-session-uuid"
            _validate_uuid(event["event_id"])


class TestResetFightState:
    def test_reset_fight_state_clears_timing(self):
        watcher, _ = _make_watcher()
        watcher._fight_start_time = time.time()
        watcher._reset_fight_state()
        assert watcher._fight_start_time is None

    def test_reset_fight_state_clears_boss_name(self):
        watcher, _ = _make_watcher()
        watcher._current_boss_name = "Some Boss"
        watcher._reset_fight_state()
        assert watcher._current_boss_name is None

    def test_reset_fight_state_clears_coop(self):
        watcher, _ = _make_watcher()
        watcher._coop_detected = True
        watcher._reset_fight_state()
        assert watcher._coop_detected is False
