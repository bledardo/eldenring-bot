"""Co-op phantom icon detection.

Detects when summoned phantom player icons are present in the top-left
corner, indicating a co-op session (solo fights only should be tracked).
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from loguru import logger

from watcher.detectors import ConsecutiveConfirmer


class CoopDetector:
    """Detect co-op phantom player icons.

    Uses template matching (primary) or structural fallback looking for
    small horizontal bar-like structures in the co-op region.

    Args:
        template_dir: Directory containing template images.
        confirm_frames: Consecutive frames for confirmation.
        threshold: Template matching confidence threshold.
    """

    def __init__(
        self,
        template_dir: Path,
        confirm_frames: int = 3,
        threshold: float = 0.70,
    ) -> None:
        self._threshold = threshold
        self._confirmer = ConsecutiveConfirmer(confirm_frames)
        self._templates: list[np.ndarray] = []
        self.last_confidence: float = 0.0

        # Load templates if available
        if template_dir.exists():
            for tpl_path in sorted(template_dir.glob("coop_template*")):
                try:
                    tpl = cv2.imread(str(tpl_path), cv2.IMREAD_GRAYSCALE)
                    if tpl is not None:
                        self._templates.append(tpl)
                        logger.debug("Loaded co-op template: {}", tpl_path.name)
                except Exception as exc:
                    logger.warning("Failed to load template {}: {}", tpl_path.name, exc)

        mode = "template" if self._templates else "structural"
        logger.debug("CoopDetector initialized (mode={}, {} templates)", mode, len(self._templates))

    def detect(self, frame: np.ndarray | None) -> bool:
        """Detect if co-op phantom icons are present.

        Args:
            frame: BGR numpy array from the co-op screen region.

        Returns:
            True if co-op confirmed (N consecutive frames).
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
        """Template matching for co-op icons."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        best_confidence = 0.0

        for template in self._templates:
            if template.shape[0] > gray.shape[0] or template.shape[1] > gray.shape[1]:
                continue

            result = cv2.matchTemplate(gray, template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)
            best_confidence = max(best_confidence, max_val)

        self.last_confidence = best_confidence
        logger.trace("Co-op template confidence: {:.3f}", best_confidence)
        return best_confidence >= self._threshold

    def _structural_detect(self, frame: np.ndarray) -> bool:
        """Structural fallback: detect small horizontal bars.

        Co-op phantom icons show as small golden-bordered health bar icons.
        Look for small rectangles with ~3:1 aspect ratio.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 30, 100)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        frame_h, frame_w = frame.shape[:2]
        small_bar_count = 0

        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if h == 0 or w == 0:
                continue

            aspect_ratio = w / h

            # Small horizontal bars: reasonable size, ~3:1 aspect ratio
            min_w = frame_w * 0.05
            max_w = frame_w * 0.4
            min_h = frame_h * 0.01
            max_h = frame_h * 0.08

            if (min_w <= w <= max_w and min_h <= h <= max_h and 2.0 <= aspect_ratio <= 6.0):
                small_bar_count += 1

        # Multiple small bars suggest co-op phantom health bars
        detected = small_bar_count >= 2
        self.last_confidence = min(1.0, small_bar_count / 3)
        logger.trace("Co-op structural: {} small bars found", small_bar_count)
        return detected
