"""Tests for the enemy felled (gold text) detector."""

from __future__ import annotations

import numpy as np
import pytest

from watcher.detectors.enemy_felled import EnemyFelledDetector


class TestEnemyFelledDetector:
    """Gold text detection on dark background."""

    def test_dark_background_with_gold_text(self):
        """Gold pixels on dark background should be detected."""
        detector = EnemyFelledDetector(confirm_frames=1)
        frame = np.zeros((200, 400, 3), dtype=np.uint8)
        # Gold color in BGR: B=0, G=180, R=220
        frame[80:120, 150:250] = (0, 180, 220)
        assert detector.detect(frame) is True
        assert detector.last_confidence > 0.4

    def test_bright_scene_rejected(self):
        """Bright gameplay scene should NOT trigger detection."""
        detector = EnemyFelledDetector(confirm_frames=1)
        frame = np.full((200, 400, 3), 150, dtype=np.uint8)
        assert detector.detect(frame) is False

    def test_dark_scene_no_gold_rejected(self):
        """Dark scene without gold text should NOT trigger."""
        detector = EnemyFelledDetector(confirm_frames=1)
        frame = np.zeros((200, 400, 3), dtype=np.uint8)
        assert detector.detect(frame) is False

    def test_red_death_screen_rejected(self):
        """Red YOU DIED text should NOT trigger gold detection."""
        detector = EnemyFelledDetector(confirm_frames=1)
        frame = np.zeros((200, 400, 3), dtype=np.uint8)
        # Red color in BGR: B=0, G=0, R=200
        frame[80:120, 150:250] = (0, 0, 200)
        assert detector.detect(frame) is False

    def test_consecutive_confirmation(self):
        """Requires N consecutive frames before confirming."""
        detector = EnemyFelledDetector(confirm_frames=2)
        frame = np.zeros((200, 400, 3), dtype=np.uint8)
        frame[80:120, 150:250] = (0, 180, 220)
        assert detector.detect(frame) is False  # frame 1
        assert detector.detect(frame) is True   # frame 2

    def test_none_frame_handled(self):
        """None frame should return False and reset confirmer."""
        detector = EnemyFelledDetector(confirm_frames=1)
        assert detector.detect(None) is False

    def test_empty_frame_handled(self):
        """Empty frame should return False."""
        detector = EnemyFelledDetector(confirm_frames=1)
        frame = np.array([], dtype=np.uint8)
        assert detector.detect(frame) is False

    def test_reset_on_non_detection(self):
        """Non-gold frame resets consecutive counter."""
        detector = EnemyFelledDetector(confirm_frames=2)
        gold_frame = np.zeros((200, 400, 3), dtype=np.uint8)
        gold_frame[80:120, 150:250] = (0, 180, 220)
        bright_frame = np.full((200, 400, 3), 150, dtype=np.uint8)

        detector.detect(gold_frame)   # count=1
        detector.detect(bright_frame) # count=0
        assert detector.detect(gold_frame) is False  # count=1 again
