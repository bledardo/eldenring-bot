"""Boss health bar presence detection via OpenCV.

Uses template matching when templates are available, falls back to
structural detection (edge detection + contour analysis) otherwise.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from loguru import logger

from watcher.detectors import ConsecutiveConfirmer


class HealthBarDetector:
    """Detect boss health bar presence in captured frames.

    Uses template matching (primary) or structural fallback (when no templates).
    The structural fallback detects long horizontal bars by aspect ratio.

    Args:
        template_dir: Directory containing template images.
        confirm_frames: Consecutive frames needed for confirmation.
        threshold: Confidence threshold for template matching.
    """

    def __init__(
        self,
        template_dir: Path,
        confirm_frames: int = 3,
        threshold: float = 0.75,
    ) -> None:
        self._threshold = threshold
        self._confirmer = ConsecutiveConfirmer(confirm_frames)
        self._templates: list[np.ndarray] = []
        self.last_confidence: float = 0.0

        # Load templates if available
        if template_dir.exists():
            for tpl_path in sorted(template_dir.glob("boss_bar_template*")):
                try:
                    tpl = cv2.imread(str(tpl_path), cv2.IMREAD_GRAYSCALE)
                    if tpl is not None:
                        self._templates.append(tpl)
                        logger.debug("Loaded health bar template: {}", tpl_path.name)
                except Exception as exc:
                    logger.warning("Failed to load template {}: {}", tpl_path.name, exc)

        mode = "template" if self._templates else "structural"
        logger.debug("HealthBarDetector initialized (mode={}, {} templates)", mode, len(self._templates))

    def detect(self, frame: np.ndarray | None) -> bool:
        """Detect if boss health bar is present.

        Args:
            frame: BGR numpy array from screen capture.

        Returns:
            True if health bar is confirmed present (N consecutive frames).
        """
        if frame is None or frame.size == 0:
            self._confirmer.update(False)
            return False

        if self._templates:
            detected = self._template_detect(frame)
        else:
            detected = self._structural_detect(frame)

        return self._confirmer.update(detected)

    def _template_detect(self, frame: np.ndarray) -> bool:
        """Template matching detection."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        best_confidence = 0.0

        for template in self._templates:
            # Scale template if needed
            if template.shape[0] > gray.shape[0] or template.shape[1] > gray.shape[1]:
                scale = min(
                    gray.shape[1] / template.shape[1],
                    gray.shape[0] / template.shape[0],
                ) * 0.9
                template = cv2.resize(
                    template, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA
                )

            if template.shape[0] > gray.shape[0] or template.shape[1] > gray.shape[1]:
                continue

            result = cv2.matchTemplate(gray, template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)
            best_confidence = max(best_confidence, max_val)

        self.last_confidence = best_confidence
        logger.trace("Health bar template confidence: {:.3f}", best_confidence)
        return best_confidence >= self._threshold

    def _structural_detect(self, frame: np.ndarray) -> bool:
        """Structural fallback: detect boss health bar by red color + shape.

        Isolates red pixels (HSV), then looks for a wide horizontal contour.
        The Elden Ring boss health bar is a long red/dark-red bar.
        """
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Red in HSV wraps around 0/180: H=0-10 or 170-180, S>40, V>40
        mask1 = cv2.inRange(hsv, np.array([0, 40, 40]), np.array([12, 255, 255]))
        mask2 = cv2.inRange(hsv, np.array([168, 40, 40]), np.array([180, 255, 255]))
        red_mask = mask1 | mask2

        # Close small gaps in the bar
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 3))
        red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        frame_h, frame_w = frame.shape[:2]
        min_width = frame_w * 0.2  # Bar must be at least 20% of frame width
        best_confidence = 0.0

        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if h == 0:
                continue
            aspect_ratio = w / h

            # Health bar: wide, thin, high aspect ratio
            if w >= min_width and aspect_ratio >= 8:
                confidence = min(1.0, (w / frame_w) * (aspect_ratio / 20))
                best_confidence = max(best_confidence, confidence)

        self.last_confidence = best_confidence
        logger.trace("Health bar structural confidence: {:.3f}", best_confidence)
        return best_confidence >= 0.3

    def count_bars(self, frame: np.ndarray | None) -> int:
        """Count distinct boss health bars in the frame.

        Uses red-channel contour detection to find wide horizontal bars.
        Designed for the expanded DOUBLE_BOSS_BAR_REGION.

        Args:
            frame: BGR numpy array from screen capture.

        Returns:
            Number of distinct health bars found (0, 1, or 2).
        """
        if frame is None or frame.size == 0:
            return 0

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Red in HSV wraps around 0/180
        mask1 = cv2.inRange(hsv, np.array([0, 40, 40]), np.array([12, 255, 255]))
        mask2 = cv2.inRange(hsv, np.array([168, 40, 40]), np.array([180, 255, 255]))
        red_mask = mask1 | mask2

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 3))
        red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        frame_h, frame_w = frame.shape[:2]
        min_width = frame_w * 0.2

        bars: list[tuple[int, int, int, int]] = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if h == 0:
                continue
            aspect_ratio = w / h
            if w >= min_width and aspect_ratio >= 8:
                bars.append((x, y, w, h))

        if len(bars) <= 1:
            return len(bars)

        # Merge bars that overlap vertically (same bar split by damage)
        bars.sort(key=lambda b: b[1])  # sort by y
        merged: list[tuple[int, int, int, int]] = [bars[0]]
        for bar in bars[1:]:
            prev = merged[-1]
            prev_bottom = prev[1] + prev[3]
            # If this bar's top is within 20px of previous bar's bottom, merge
            if bar[1] - prev_bottom < 20:
                # Extend previous bar
                new_y = prev[1]
                new_h = (bar[1] + bar[3]) - new_y
                merged[-1] = (prev[0], new_y, max(prev[2], bar[2]), new_h)
            else:
                merged.append(bar)

        count = min(len(merged), 2)
        logger.debug("count_bars: found {} bars (raw contours: {})", count, len(bars))
        return count
