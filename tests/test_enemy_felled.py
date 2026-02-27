"""Tests for the OCR-based enemy felled detector."""

from __future__ import annotations

from unittest.mock import MagicMock

import numpy as np
import pytest

from watcher.detectors.enemy_felled import EnemyFelledDetector


def _make_dark_frame(brightness: int = 30) -> np.ndarray:
    """Create a dark BGR frame (passes brightness pre-filter)."""
    return np.full((200, 400, 3), brightness, dtype=np.uint8)


def _make_bright_frame(brightness: int = 150) -> np.ndarray:
    """Create a bright BGR frame (fails brightness pre-filter)."""
    return np.full((200, 400, 3), brightness, dtype=np.uint8)


def _mock_reader(texts: list[list[str]]) -> MagicMock:
    """Create a mock EasyOCR reader that returns texts sequentially."""
    reader = MagicMock()
    reader.readtext = MagicMock(side_effect=texts)
    return reader


class TestEnemyFelledDetector:
    """OCR-based kill text detection."""

    def test_ennemi_abattu_detected(self):
        """'ENNEMI ABATTU' text should be detected."""
        reader = _mock_reader([["ENNEMI ABATTU"], ["ENNEMI ABATTU"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=1, ocr_interval=0)
        assert detector.detect(_make_dark_frame()) is True

    def test_demi_dieu_abattu_detected(self):
        """'DEMI-DIEU ABATTU' text should be detected."""
        reader = _mock_reader([["DEMI-DIEU ABATTU"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=1, ocr_interval=0)
        assert detector.detect(_make_dark_frame()) is True

    def test_legende_abattue_detected(self):
        """'LÉGENDE ABATTUE' matches via ABATTUE keyword."""
        reader = _mock_reader([["LÉGENDE ABATTUE"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=1, ocr_interval=0)
        assert detector.detect(_make_dark_frame()) is True

    def test_felled_english_detected(self):
        """English 'FELLED' text should be detected."""
        reader = _mock_reader([["GREAT ENEMY FELLED"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=1, ocr_interval=0)
        assert detector.detect(_make_dark_frame()) is True

    def test_random_text_rejected(self):
        """Random OCR text should NOT trigger detection."""
        reader = _mock_reader([["SOME RANDOM TEXT"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=1, ocr_interval=0)
        assert detector.detect(_make_dark_frame()) is False

    def test_empty_ocr_rejected(self):
        """Empty OCR results should NOT trigger."""
        reader = _mock_reader([[]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=1, ocr_interval=0)
        assert detector.detect(_make_dark_frame()) is False

    def test_bright_frame_rejected(self):
        """Bright frames should be rejected before OCR runs."""
        reader = _mock_reader([])
        detector = EnemyFelledDetector(reader=reader, confirm_count=1, ocr_interval=0)
        assert detector.detect(_make_bright_frame()) is False
        reader.readtext.assert_not_called()

    def test_consecutive_confirmation(self):
        """Requires N consecutive OCR hits before confirming."""
        reader = _mock_reader([["ENNEMI ABATTU"], ["ENNEMI ABATTU"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=2, ocr_interval=0)
        assert detector.detect(_make_dark_frame()) is False  # hit 1
        assert detector.detect(_make_dark_frame()) is True   # hit 2

    def test_non_detection_resets_counter(self):
        """A miss between hits resets the consecutive counter."""
        reader = _mock_reader([
            ["ENNEMI ABATTU"],  # hit 1
            ["NOTHING HERE"],   # miss -> reset
            ["ENNEMI ABATTU"],  # hit 1 again
        ])
        detector = EnemyFelledDetector(reader=reader, confirm_count=2, ocr_interval=0)
        detector.detect(_make_dark_frame())  # hit 1
        detector.detect(_make_dark_frame())  # miss
        assert detector.detect(_make_dark_frame()) is False  # hit 1 again, not 2

    def test_none_frame_handled(self):
        """None frame should return False."""
        detector = EnemyFelledDetector(reader=MagicMock(), confirm_count=1, ocr_interval=0)
        assert detector.detect(None) is False

    def test_empty_frame_handled(self):
        """Empty frame should return False."""
        detector = EnemyFelledDetector(reader=MagicMock(), confirm_count=1, ocr_interval=0)
        assert detector.detect(np.array([], dtype=np.uint8)) is False

    def test_no_reader_returns_false(self):
        """No OCR reader should always return False."""
        detector = EnemyFelledDetector(reader=None, confirm_count=1, ocr_interval=0)
        assert detector.detect(_make_dark_frame()) is False

    def test_reset_clears_state(self):
        """reset() should clear consecutive hits."""
        reader = _mock_reader([["ENNEMI ABATTU"], ["ENNEMI ABATTU"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=2, ocr_interval=0)
        detector.detect(_make_dark_frame())  # hit 1
        detector.reset()
        assert detector.detect(_make_dark_frame()) is False  # hit 1 again after reset

    def test_confirmer_proxy_reset(self):
        """_confirmer.reset() proxy should call reset()."""
        reader = _mock_reader([["ENNEMI ABATTU"], ["ENNEMI ABATTU"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=2, ocr_interval=0)
        detector.detect(_make_dark_frame())  # hit 1
        detector._confirmer.reset()
        assert detector._consecutive_hits == 0

    def test_throttle_returns_last_state(self):
        """During throttle period, return last known state without OCR."""
        reader = _mock_reader([["ENNEMI ABATTU"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=1, ocr_interval=10.0)

        # First call runs OCR and detects
        assert detector.detect(_make_dark_frame()) is True

        # Second call is throttled — returns True (last state) without OCR
        assert detector.detect(_make_dark_frame()) is True
        assert reader.readtext.call_count == 1  # OCR only ran once

    def test_keyword_case_insensitive(self):
        """OCR text in mixed case should still match keywords."""
        reader = _mock_reader([["Ennemi Abattu"]])
        detector = EnemyFelledDetector(reader=reader, confirm_count=1, ocr_interval=0)
        assert detector.detect(_make_dark_frame()) is True
