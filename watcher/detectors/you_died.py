"""YOU DIED screen detection via template matching and color heuristics.

The game displays "YOU DIED" in English even when language is French.
The text appears as red/dark-red on a dark background.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from loguru import logger

from watcher.detectors import ConsecutiveConfirmer


class YouDiedDetector:
    """Detect the "YOU DIED" screen.

    Uses template matching (primary) or color heuristic fallback.
    The death screen shows for several seconds, so 2 frames is sufficient.

    Args:
        template_dir: Directory containing template images.
        confirm_frames: Consecutive frames for confirmation.
        threshold: Template matching confidence threshold.
    """

    def __init__(
        self,
        template_dir: Path,
        confirm_frames: int = 2,
        threshold: float = 0.80,
    ) -> None:
        self._threshold = threshold
        self._confirmer = ConsecutiveConfirmer(confirm_frames)
        self._template: np.ndarray | None = None
        self.last_confidence: float = 0.0

        # Load template if available
        if template_dir.exists():
            for tpl_path in sorted(template_dir.glob("you_died_template*")):
                try:
                    tpl = cv2.imread(str(tpl_path), cv2.IMREAD_GRAYSCALE)
                    if tpl is not None:
                        self._template = tpl
                        logger.debug("Loaded YOU DIED template: {}", tpl_path.name)
                        break
                except Exception as exc:
                    logger.warning("Failed to load template {}: {}", tpl_path.name, exc)

        mode = "template" if self._template is not None else "color-heuristic"
        logger.debug("YouDiedDetector initialized (mode={})", mode)

    def detect(self, frame: np.ndarray | None) -> bool:
        """Detect if YOU DIED screen is present.

        Args:
            frame: BGR numpy array from screen capture.

        Returns:
            True if death screen confirmed (N consecutive frames).
        """
        if frame is None or frame.size == 0:
            self._confirmer.update(False)
            return False

        if self._template is not None:
            detected = self._template_detect(frame)
        else:
            detected = self._color_detect(frame)

        return self._confirmer.update(detected)

    def _template_detect(self, frame: np.ndarray) -> bool:
        """Template matching detection."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        template = self._template

        if template is None:
            return False

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
            self.last_confidence = 0.0
            return False

        result = cv2.matchTemplate(gray, template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, _ = cv2.minMaxLoc(result)
        self.last_confidence = max_val
        logger.trace("YOU DIED template confidence: {:.3f}", max_val)
        return max_val >= self._threshold

    def _color_detect(self, frame: np.ndarray) -> bool:
        """Color heuristic fallback.

        The YOU DIED screen has:
        - Dark/black background (mean brightness < threshold)
        - Red-tinted text in the center (red channel > blue/green)
        """
        # Check overall darkness
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray)

        if mean_brightness > 80:
            # Too bright for death screen
            self.last_confidence = 0.0
            return False

        # Check for red dominance in center portion
        h, w = frame.shape[:2]
        center = frame[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4]

        b_mean = np.mean(center[:, :, 0])
        g_mean = np.mean(center[:, :, 1])
        r_mean = np.mean(center[:, :, 2])

        # Red should dominate (death screen text is red)
        red_dominance = r_mean - max(b_mean, g_mean)

        # Compute confidence based on darkness + red dominance
        darkness_score = max(0, (80 - mean_brightness) / 80)
        red_score = max(0, min(1.0, red_dominance / 30))
        confidence = darkness_score * 0.4 + red_score * 0.6

        self.last_confidence = confidence
        logger.trace(
            "YOU DIED color heuristic: brightness={:.0f}, red_dom={:.1f}, conf={:.3f}",
            mean_brightness,
            red_dominance,
            confidence,
        )
        return confidence >= 0.4
