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
        """Structural fallback: detect long horizontal bar by contour analysis.

        Looks for a wide, thin horizontal rectangle (aspect ratio >= 8:1).
        The Elden Ring boss health bar has a distinctive elongated shape.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Apply edge detection
        edges = cv2.Canny(gray, 50, 150)
        # Dilate to close gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 1))
        edges = cv2.dilate(edges, kernel, iterations=1)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        frame_h, frame_w = frame.shape[:2]
        min_width = frame_w * 0.3  # Bar must be at least 30% of frame width
        max_height = frame_h * 0.15  # Bar should be thin

        best_confidence = 0.0

        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if h == 0:
                continue
            aspect_ratio = w / h

            # Health bar: wide (>30% frame), thin, high aspect ratio (>=8)
            if w >= min_width and h <= max_height and aspect_ratio >= 8:
                confidence = min(1.0, (aspect_ratio / 15) * (w / frame_w))
                best_confidence = max(best_confidence, confidence)

        self.last_confidence = best_confidence
        logger.trace("Health bar structural confidence: {:.3f}", best_confidence)
        return best_confidence >= 0.3  # Lower threshold for structural
