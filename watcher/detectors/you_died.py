"""Death screen detection via template matching + color heuristic fallback.

The game displays "VOUS AVEZ PÉRI" (French) or "YOU DIED" (English).
The text is red on a semi-transparent dark overlay.

Primary: template matching on red-channel binary (<1ms).
Fallback: color heuristic (no OCR needed).
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from loguru import logger

from watcher.detectors import ConsecutiveConfirmer


class YouDiedDetector:
    """Detect the "YOU DIED" screen.

    Uses template matching (fast, primary) with color heuristic fallback.

    Args:
        template_dir: Directory containing template images.
        confirm_frames: Consecutive frames for confirmation.
        threshold: Template matching confidence threshold.
    """

    def __init__(
        self,
        template_dir: Path,
        confirm_frames: int = 1,
        threshold: float = 0.70,
    ) -> None:
        self._threshold = threshold
        self._confirmer = ConsecutiveConfirmer(confirm_frames)
        self.last_confidence: float = 0.0

        # Load death text template (red-channel binary)
        self._template: np.ndarray | None = None
        tmpl_path = template_dir / "vous_avez_peri.png"
        if tmpl_path.exists():
            self._template = cv2.imread(str(tmpl_path), cv2.IMREAD_GRAYSCALE)
            logger.debug(
                "Death template loaded: {} ({}x{})",
                tmpl_path.name,
                self._template.shape[1],
                self._template.shape[0],
            )
        else:
            logger.warning("Death template not found: {}", tmpl_path)

        mode = "template" if self._template is not None else "color-heuristic"
        logger.debug("YouDiedDetector initialized (mode={})", mode)

    def detect(self, frame: np.ndarray | None, in_combat: bool = False) -> bool:
        """Detect if YOU DIED screen is present.

        Args:
            frame: BGR numpy array from screen capture.
            in_combat: Unused, kept for API compatibility.

        Returns:
            True if death screen confirmed.
        """
        if frame is None or frame.size == 0:
            self._confirmer.update(False)
            return False

        if self._template is not None:
            detected = self._template_detect(frame)
        else:
            detected = self._color_detect(frame)

        return self._confirmer.update(detected)

    def _preprocess_red(self, frame: np.ndarray) -> np.ndarray:
        """Red-channel extraction → threshold → morph close."""
        b_ch, g_ch, r_ch = cv2.split(frame)
        red_excess = np.clip(
            r_ch.astype(int) - np.maximum(g_ch.astype(int), b_ch.astype(int)),
            0, 255,
        ).astype(np.uint8)
        _, binary = cv2.threshold(red_excess, 50, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        return cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    def _template_detect(self, frame: np.ndarray) -> bool:
        """Template matching on red-channel binary. Fast (<1ms)."""
        binary = self._preprocess_red(frame)

        # Template matching
        result = cv2.matchTemplate(binary, self._template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, _ = cv2.minMaxLoc(result)

        self.last_confidence = max_val
        if max_val >= self._threshold:
            logger.debug("Death template match: {:.3f}", max_val)
            return True
        return False

    def _color_detect(self, frame: np.ndarray) -> bool:
        """Color heuristic fallback (no template available)."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray)

        if mean_brightness > 80:
            self.last_confidence = 0.0
            return False

        h, w = frame.shape[:2]
        center = frame[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4]
        center_gray = gray[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4]

        bright_ratio = np.count_nonzero(center_gray > 150) / center_gray.size
        if bright_ratio > 0.01:
            self.last_confidence = 0.0
            return False

        b_mean = np.mean(center[:, :, 0])
        g_mean = np.mean(center[:, :, 1])
        r_mean = np.mean(center[:, :, 2])
        red_dominance = r_mean - max(b_mean, g_mean)

        if red_dominance < 15:
            self.last_confidence = 0.0
            return False

        darkness_score = max(0, (80 - mean_brightness) / 80)
        red_score = max(0, min(1.0, red_dominance / 30))
        confidence = darkness_score * 0.4 + red_score * 0.6

        self.last_confidence = confidence
        return confidence >= 0.4
