"""Gold text detection for kill confirmation ("ENNEMI ABATTU" / "DEMI-DIEU ABATTU").

The game displays gold/yellow text on a dark background in the center of the screen
when a boss or enemy is defeated. Same screen region as YOU DIED.
"""

from __future__ import annotations

import cv2
import numpy as np
from loguru import logger

from watcher.detectors import ConsecutiveConfirmer


class EnemyFelledDetector:
    """Detect gold "ENNEMI ABATTU" / "DEMI-DIEU ABATTU" text.

    Uses color heuristic: gold/yellow pixels (HSV) on a dark background.
    The kill text stays visible for ~3 seconds, so 2 frames is sufficient.

    Args:
        confirm_frames: Consecutive frames for confirmation.
    """

    def __init__(self, confirm_frames: int = 2) -> None:
        self._confirmer = ConsecutiveConfirmer(confirm_frames)
        self.last_confidence: float = 0.0

    def detect(self, frame: np.ndarray | None) -> bool:
        """Detect if gold kill text is present.

        Args:
            frame: BGR numpy array from screen capture.

        Returns:
            True if gold text confirmed (N consecutive frames).
        """
        if frame is None or frame.size == 0:
            self._confirmer.update(False)
            return False

        detected = self._color_detect(frame)
        return self._confirmer.update(detected)

    def _color_detect(self, frame: np.ndarray) -> bool:
        """Gold color heuristic detection.

        The kill text is gold/yellow on a dark/black background:
        - Dark background: grayscale mean brightness < 80
        - Gold pixels: HSV hue 15-45, saturation > 80, value > 150
        - Ratio of gold pixels to total must exceed threshold
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray)

        if mean_brightness > 80:
            self.last_confidence = 0.0
            return False

        # Analyze center portion where text appears
        h, w = frame.shape[:2]
        center = frame[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4]

        # Convert to HSV and create gold mask
        hsv = cv2.cvtColor(center, cv2.COLOR_BGR2HSV)
        gold_mask = cv2.inRange(hsv, (15, 80, 150), (45, 255, 255))

        # Calculate gold pixel ratio
        total_pixels = gold_mask.size
        gold_pixels = cv2.countNonZero(gold_mask)
        gold_ratio = gold_pixels / total_pixels if total_pixels > 0 else 0

        # Compute confidence
        darkness_score = max(0, (80 - mean_brightness) / 80)
        gold_score = min(1.0, gold_ratio / 0.01)  # normalize: 1% gold pixels = max score
        confidence = darkness_score * 0.3 + gold_score * 0.7

        self.last_confidence = confidence
        logger.trace(
            "Enemy felled heuristic: brightness={:.0f}, gold_ratio={:.4f}, conf={:.3f}",
            mean_brightness,
            gold_ratio,
            confidence,
        )
        return confidence >= 0.4
