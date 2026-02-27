"""Death screen detection via template matching + OCR fallback.

The game displays "VOUS AVEZ PÉRI" (French) or "YOU DIED" (English).
The text is red on a semi-transparent dark overlay.

Primary: template matching on red-channel binary (<1ms, used in combat).
Fallback: OCR on red-channel (slower ~100ms, used out of combat for robustness).
"""

from __future__ import annotations

import time
from pathlib import Path

import cv2
import numpy as np
from loguru import logger

from watcher.detectors import ConsecutiveConfirmer


class YouDiedDetector:
    """Detect the "YOU DIED" screen.

    Uses template matching (fast, primary in combat) or OCR (robust, out of combat).

    Args:
        template_dir: Directory containing template images.
        reader: Shared EasyOCR Reader instance (optional).
        confirm_frames: Consecutive frames for confirmation.
        threshold: Template matching confidence threshold.
    """

    DEATH_KEYWORDS = ["AVEZ PÉRI", "AVEZ PERI", "YOU DIED"]

    def __init__(
        self,
        template_dir: Path,
        reader=None,
        confirm_frames: int = 1,
        threshold: float = 0.70,
    ) -> None:
        self._threshold = threshold
        self._confirmer = ConsecutiveConfirmer(confirm_frames)
        self._reader = reader
        self._last_ocr_time: float = 0.0
        self._last_ocr_result: bool = False
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

        mode = "template"
        if self._template is None:
            mode = "ocr" if self._reader is not None else "color-heuristic"
        logger.debug("YouDiedDetector initialized (mode={})", mode)

    def detect(self, frame: np.ndarray | None, in_combat: bool = False) -> bool:
        """Detect if YOU DIED screen is present.

        Args:
            frame: BGR numpy array from screen capture.
            in_combat: When True, uses fast template matching every frame.
                When False, uses throttled OCR with brightness pre-filter.

        Returns:
            True if death screen confirmed.
        """
        if frame is None or frame.size == 0:
            self._confirmer.update(False)
            return False

        if self._template is not None:
            detected = self._template_detect(frame)
        elif self._reader is not None:
            detected = self._ocr_detect(frame)
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

    def _ocr_detect(self, frame: np.ndarray) -> bool:
        """OCR-based detection (out of combat, throttled)."""
        # Brightness pre-filter
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray)
        if mean_brightness > 80:
            self.last_confidence = 0.0
            self._last_ocr_result = False
            return False

        # Throttle OCR — death text stays on screen longer out of combat
        now = time.monotonic()
        if now - self._last_ocr_time < 0.5:
            return self._last_ocr_result
        self._last_ocr_time = now

        # Preprocess with upscale for OCR readability
        b_ch, g_ch, r_ch = cv2.split(frame)
        red_excess = np.clip(
            r_ch.astype(int) - np.maximum(g_ch.astype(int), b_ch.astype(int)),
            0, 255,
        ).astype(np.uint8)
        h, w = red_excess.shape[:2]
        upscaled = cv2.resize(red_excess, (w * 3, h * 3), interpolation=cv2.INTER_CUBIC)
        _, binary = cv2.threshold(upscaled, 15, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        try:
            results = self._reader.readtext(binary, detail=0, paragraph=True)
        except Exception as exc:
            logger.warning("Death OCR failed: {}", exc)
            self._last_ocr_result = False
            return False

        if not results:
            self.last_confidence = 0.0
            self._last_ocr_result = False
            return False

        text = " ".join(results).strip().upper()

        for keyword in self.DEATH_KEYWORDS:
            if keyword in text:
                self.last_confidence = 1.0
                self._last_ocr_result = True
                logger.debug("Death keyword '{}' found in '{}'", keyword, text)
                return True

        self.last_confidence = 0.0
        self._last_ocr_result = False
        return False

    def _color_detect(self, frame: np.ndarray) -> bool:
        """Color heuristic fallback (no OCR reader, no template)."""
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
