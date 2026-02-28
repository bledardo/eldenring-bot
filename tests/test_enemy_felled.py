"""Tests for the template-matching based enemy felled detector."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from watcher.detectors.enemy_felled import EnemyFelledDetector


PROJECT_ROOT = Path(__file__).parent.parent
TEMPLATE_DIR = PROJECT_ROOT / "watcher" / "assets" / "templates"


def _make_frame(brightness: int = 30) -> np.ndarray:
    """Create a BGR frame with uniform brightness."""
    return np.full((200, 400, 3), brightness, dtype=np.uint8)


class TestEnemyFelledDetector:
    """Template-matching kill text detection."""

    def test_none_frame_handled(self):
        """None frame should return False."""
        detector = EnemyFelledDetector(template_dir=TEMPLATE_DIR, confirm_count=1)
        assert detector.detect(None) is False

    def test_empty_frame_handled(self):
        """Empty frame should return False."""
        detector = EnemyFelledDetector(template_dir=TEMPLATE_DIR, confirm_count=1)
        assert detector.detect(np.array([], dtype=np.uint8)) is False

    def test_uniform_frame_no_detection(self):
        """A uniform frame should not trigger detection."""
        detector = EnemyFelledDetector(template_dir=TEMPLATE_DIR, confirm_count=1)
        assert detector.detect(_make_frame(30)) is False
        assert detector.detect(_make_frame(150)) is False

    def test_no_template_returns_false(self):
        """Without template, should always return False."""
        detector = EnemyFelledDetector(template_dir=None, confirm_count=1)
        assert detector.detect(_make_frame()) is False

    def test_consecutive_confirmation(self):
        """Requires N consecutive hits before confirming."""
        detector = EnemyFelledDetector(template_dir=TEMPLATE_DIR, confirm_count=2)
        # Uniform frames won't match, so hits stay at 0
        assert detector.detect(_make_frame()) is False
        assert detector.detect(_make_frame()) is False

    def test_reset_clears_state(self):
        """reset() should clear consecutive hits."""
        detector = EnemyFelledDetector(template_dir=TEMPLATE_DIR, confirm_count=2)
        detector._consecutive_hits = 1
        detector.reset()
        assert detector._consecutive_hits == 0

    def test_confirmer_proxy_reset(self):
        """_confirmer.reset() proxy should call reset()."""
        detector = EnemyFelledDetector(template_dir=TEMPLATE_DIR, confirm_count=2)
        detector._consecutive_hits = 1
        detector._confirmer.reset()
        assert detector._consecutive_hits == 0

    def test_template_loaded(self):
        """Template should load from assets directory."""
        detector = EnemyFelledDetector(template_dir=TEMPLATE_DIR)
        assert detector._template is not None
