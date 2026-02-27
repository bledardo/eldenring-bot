"""Detector accuracy tests against real Elden Ring screenshots.

Tests skip gracefully when screenshots are not yet available.
Run with: python -m pytest tests/test_detectors.py -v
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from tests.conftest import load_screenshot


class TestHealthBarDetector:
    """Test health bar detection accuracy."""

    def test_detects_boss_bar_present(self, health_bar_detector, screenshot_dir):
        """Test with screenshots that have boss health bar visible."""
        bar_shots = list(screenshot_dir.glob("boss_bar_*.png"))
        if not bar_shots:
            pytest.skip("No boss bar screenshots available yet")
        # Reset confirmer for each screenshot (test individual frame detection)
        detected = 0
        for shot in bar_shots:
            health_bar_detector._confirmer.reset()
            frame = load_screenshot(shot)
            # Run multiple times to satisfy consecutive confirmer
            for _ in range(health_bar_detector._confirmer.required + 1):
                result = health_bar_detector.detect(frame)
            if result:
                detected += 1
            print(f"  {shot.name}: {'PASS' if result else 'FAIL'} (conf={health_bar_detector.last_confidence:.3f})")
        accuracy = detected / len(bar_shots)
        assert accuracy >= 0.90, f"Health bar detection accuracy: {accuracy:.0%} (expected >=90%)"

    def test_no_false_positive_on_normal_gameplay(self, health_bar_detector, screenshot_dir):
        """Test with screenshots that have NO boss health bar."""
        normal_shots = list(screenshot_dir.glob("normal_*.png"))
        if not normal_shots:
            pytest.skip("No normal gameplay screenshots available yet")
        false_positives = 0
        for shot in normal_shots:
            health_bar_detector._confirmer.reset()
            frame = load_screenshot(shot)
            for _ in range(health_bar_detector._confirmer.required + 1):
                result = health_bar_detector.detect(frame)
            if result:
                false_positives += 1
                print(f"  FALSE POSITIVE: {shot.name} (conf={health_bar_detector.last_confidence:.3f})")
        fp_rate = false_positives / len(normal_shots)
        assert fp_rate <= 0.05, f"False positive rate: {fp_rate:.0%} (expected <=5%)"

    def test_handles_blank_frame(self, health_bar_detector):
        """Blank frame should not trigger detection."""
        blank = np.zeros((200, 800, 3), dtype=np.uint8)
        assert health_bar_detector.detect(blank) is False

    def test_handles_none_frame(self, health_bar_detector):
        """None frame should not trigger detection."""
        assert health_bar_detector.detect(None) is False


class TestYouDiedDetector:
    """Test YOU DIED detection accuracy."""

    def test_detects_you_died(self, you_died_detector, screenshot_dir):
        """Test with screenshots showing YOU DIED screen."""
        died_shots = list(screenshot_dir.glob("you_died_*.png"))
        if not died_shots:
            pytest.skip("No YOU DIED screenshots available yet")
        detected = 0
        for shot in died_shots:
            you_died_detector._confirmer.reset()
            frame = load_screenshot(shot)
            for _ in range(you_died_detector._confirmer.required + 1):
                result = you_died_detector.detect(frame)
            if result:
                detected += 1
            print(f"  {shot.name}: {'PASS' if result else 'FAIL'} (conf={you_died_detector.last_confidence:.3f})")
        accuracy = detected / len(died_shots)
        assert accuracy >= 0.95, f"YOU DIED detection accuracy: {accuracy:.0%} (expected >=95%)"

    def test_handles_blank_frame(self, you_died_detector):
        """Blank frame should not trigger detection."""
        blank = np.zeros((200, 800, 3), dtype=np.uint8)
        assert you_died_detector.detect(blank) is False


class TestYouDiedOCR:
    """Test OCR-based YOU DIED detection with mock reader."""

    def _make_dark_frame(self, brightness: int = 30) -> np.ndarray:
        """Create a dark frame (simulating death screen background)."""
        return np.full((200, 800, 3), brightness, dtype=np.uint8)

    def _make_bright_frame(self, brightness: int = 120) -> np.ndarray:
        """Create a bright frame (normal gameplay)."""
        return np.full((200, 800, 3), brightness, dtype=np.uint8)

    def test_ocr_detects_peri(self, template_dir):
        """OCR detects 'AVEZ PÉRI' phrase (French death text)."""
        from unittest.mock import MagicMock
        from watcher.detectors.you_died import YouDiedDetector

        mock_reader = MagicMock()
        mock_reader.readtext.return_value = ["VOUS AVEZ PÉRI"]
        detector = YouDiedDetector(template_dir, reader=mock_reader, confirm_frames=1)

        frame = self._make_dark_frame()
        result = detector.detect(frame)
        assert result is True
        assert detector.last_confidence == 1.0

    def test_ocr_detects_died(self, template_dir):
        """OCR detects 'YOU DIED' phrase (English death text)."""
        from unittest.mock import MagicMock
        from watcher.detectors.you_died import YouDiedDetector

        mock_reader = MagicMock()
        mock_reader.readtext.return_value = ["YOU DIED"]
        detector = YouDiedDetector(template_dir, reader=mock_reader, confirm_frames=1)

        frame = self._make_dark_frame()
        result = detector.detect(frame)
        assert result is True

    def test_ocr_detects_peri_ascii(self, template_dir):
        """OCR detects 'AVEZ PERI' without accent (OCR may miss accents)."""
        from unittest.mock import MagicMock
        from watcher.detectors.you_died import YouDiedDetector

        mock_reader = MagicMock()
        mock_reader.readtext.return_value = ["VOUS AVEZ PERI"]
        detector = YouDiedDetector(template_dir, reader=mock_reader, confirm_frames=1)

        frame = self._make_dark_frame()
        result = detector.detect(frame)
        assert result is True

    def test_ocr_rejects_bright_frame(self, template_dir):
        """Bright frames (>80) are rejected before OCR runs."""
        from unittest.mock import MagicMock
        from watcher.detectors.you_died import YouDiedDetector

        mock_reader = MagicMock()
        detector = YouDiedDetector(template_dir, reader=mock_reader, confirm_frames=1)

        frame = self._make_bright_frame()
        result = detector.detect(frame)
        assert result is False
        mock_reader.readtext.assert_not_called()

    def test_ocr_rejects_bright_gameplay(self, template_dir):
        """Bright gameplay frames (brightness ~90) are rejected before OCR runs."""
        from unittest.mock import MagicMock
        from watcher.detectors.you_died import YouDiedDetector

        mock_reader = MagicMock()
        detector = YouDiedDetector(template_dir, reader=mock_reader, confirm_frames=1)

        # 90 brightness = bright gameplay, above the 80 threshold
        frame = self._make_bright_frame(brightness=90)
        result = detector.detect(frame)
        assert result is False
        mock_reader.readtext.assert_not_called()

    def test_ocr_rejects_unrelated_text(self, template_dir):
        """OCR text without death phrases is rejected."""
        from unittest.mock import MagicMock
        from watcher.detectors.you_died import YouDiedDetector

        mock_reader = MagicMock()
        mock_reader.readtext.return_value = ["ENNEMI ABATTU"]
        detector = YouDiedDetector(template_dir, reader=mock_reader, confirm_frames=1)

        frame = self._make_dark_frame()
        result = detector.detect(frame)
        assert result is False

    def test_ocr_rejects_partial_keyword(self, template_dir):
        """Short substring like 'PERI' alone doesn't match (needs 'AVEZ PERI')."""
        from unittest.mock import MagicMock
        from watcher.detectors.you_died import YouDiedDetector

        mock_reader = MagicMock()
        mock_reader.readtext.return_value = ["SOMETHING PERI OTHER"]
        detector = YouDiedDetector(template_dir, reader=mock_reader, confirm_frames=1)

        frame = self._make_dark_frame()
        result = detector.detect(frame)
        assert result is False

    def test_throttle_returns_last_state(self, template_dir):
        """Throttled frames return last OCR result instead of False."""
        from unittest.mock import MagicMock
        from watcher.detectors.you_died import YouDiedDetector

        mock_reader = MagicMock()
        mock_reader.readtext.return_value = ["VOUS AVEZ PÉRI"]
        detector = YouDiedDetector(template_dir, reader=mock_reader, confirm_frames=2)

        frame = self._make_dark_frame()
        # First call: OCR runs, detects, confirmer=1
        detector.detect(frame)
        # Second call: throttled, but should return True (last OCR result),
        # so confirmer reaches 2 and confirms
        result = detector.detect(frame)
        assert result is True

    def test_no_reader_falls_back_to_color(self, template_dir):
        """Without reader, detector falls back to color heuristic (no crash)."""
        from watcher.detectors.you_died import YouDiedDetector

        detector = YouDiedDetector(template_dir, reader=None, confirm_frames=1)
        frame = self._make_dark_frame()
        # Should not crash — just uses color heuristic
        result = detector.detect(frame)
        assert isinstance(result, bool)


class TestBossNameDetector:
    """Test boss name OCR accuracy."""

    def test_fuzzy_match_known_names(self, boss_name_detector):
        """Test fuzzy matching against known variations."""
        test_cases = [
            ("Margit le Dechu", "Margit le Déchu"),
            ("Godrick le Greffe", "Godrick le Greffé"),
            ("Morgott Roi des Reprouves", "Morgott, Roi des Réprouvés"),
        ]
        for ocr_text, expected_contains in test_cases:
            result = boss_name_detector.match_name(ocr_text)
            assert result is not None, f"Should match '{ocr_text}'"
            print(f"  '{ocr_text}' -> '{result[0]}' (score={result[1]})")

    def test_extracts_and_matches_boss_name(self, boss_name_detector, screenshot_dir):
        """Test OCR + fuzzy match on boss bar screenshots."""
        bar_shots = list(screenshot_dir.glob("boss_bar_*.png"))
        if not bar_shots:
            pytest.skip("No boss bar screenshots available yet")
        matched = 0
        for shot in bar_shots:
            name = boss_name_detector.detect(load_screenshot(shot))
            if name:
                matched += 1
                print(f"  {shot.name} -> {name} (raw: {boss_name_detector.last_raw_ocr}, score: {boss_name_detector.last_match_score})")
            else:
                print(f"  {shot.name} -> NO MATCH (raw: {boss_name_detector.last_raw_ocr})")
        accuracy = matched / len(bar_shots)
        assert accuracy >= 0.80, f"Boss name detection accuracy: {accuracy:.0%} (expected >=80%)"
