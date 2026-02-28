"""Kill confirmation via template matching on gold-channel extraction.

The game displays gold text on kill:
- "ENNEMI ABATTU" / "ENNEMI MAJEUR ABATTU" / "DEMI-DIEU ABATTU"
- "DIEU OCCIS" (for god/demigod bosses like Elden Beast)

We match on "ABATTU" and "OCCIS" templates to cover all French variants.
Template matching on gold-channel binary is fast (<1ms) and avoids
false positives from other gold UI elements.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from loguru import logger


class EnemyFelledDetector:
    """Detect kill text via template matching on gold-channel binary.

    Args:
        template_dir: Directory containing template images.
        confirm_count: Consecutive hits needed before confirming.
        threshold: Template matching confidence threshold.
    """

    def __init__(
        self,
        template_dir: Path | None = None,
        confirm_count: int = 2,
        threshold: float = 0.65,
    ) -> None:
        self._threshold = threshold
        self._confirm_count = confirm_count
        self._consecutive_hits = 0
        self.last_confidence: float = 0.0
        self.last_raw_ocr: str | None = None
        self._confirmer = _ResetProxy(self)

        # Load kill text templates (ABATTU + OCCIS to cover all variants)
        self._templates: list[tuple[str, np.ndarray]] = []
        if template_dir is not None:
            for name in ("abattu.png", "occis.png"):
                tmpl_path = template_dir / name
                if tmpl_path.exists():
                    tmpl = cv2.imread(str(tmpl_path), cv2.IMREAD_GRAYSCALE)
                    self._templates.append((name, tmpl))
                    logger.debug(
                        "Kill template loaded: {} ({}x{})",
                        name, tmpl.shape[1], tmpl.shape[0],
                    )
                else:
                    logger.warning("Kill template not found: {}", tmpl_path)

    def detect(self, frame: np.ndarray | None) -> bool:
        """Detect if kill text is present via template matching.

        Args:
            frame: BGR numpy array from screen capture.

        Returns:
            True if kill text confirmed (N consecutive hits).
        """
        if frame is None or frame.size == 0:
            self._consecutive_hits = 0
            return False

        if not self._templates:
            return False

        detected = self._template_detect(frame)
        if detected:
            self._consecutive_hits += 1
            logger.debug(
                "Kill template hit ({}/{})",
                self._consecutive_hits,
                self._confirm_count,
            )
        else:
            self._consecutive_hits = 0

        return self._consecutive_hits >= self._confirm_count

    def _preprocess_gold(self, frame: np.ndarray) -> np.ndarray:
        """Gold-channel extraction → threshold → morph close."""
        b_ch, g_ch, r_ch = cv2.split(frame)
        gold = np.clip(
            np.minimum(r_ch.astype(int), g_ch.astype(int)) - b_ch.astype(int),
            0, 255,
        ).astype(np.uint8)
        _, binary = cv2.threshold(gold, 50, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        return cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    def _template_detect(self, frame: np.ndarray) -> bool:
        """Template matching on gold-channel binary. Fast (<1ms per template)."""
        binary = self._preprocess_gold(frame)

        # Check if there's any gold content at all
        gold_pixels = np.count_nonzero(binary)
        if gold_pixels > 100:
            logger.trace("Gold pixels in frame: {}", gold_pixels)

        # Try each template, return on first match
        best_val = 0.0
        for name, tmpl in self._templates:
            if tmpl.shape[0] > binary.shape[0] or tmpl.shape[1] > binary.shape[1]:
                continue
            result = cv2.matchTemplate(binary, tmpl, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)
            if max_val > best_val:
                best_val = max_val

        self.last_confidence = best_val
        if gold_pixels > 500:
            logger.debug("Kill template confidence: {:.3f} (threshold: {:.2f}, gold_px: {})",
                         best_val, self._threshold, gold_pixels)
        return best_val >= self._threshold

    def reset(self) -> None:
        """Reset detection state."""
        self._consecutive_hits = 0


class _ResetProxy:
    """Proxy so watcher._enemy_felled._confirmer.reset() still works."""

    def __init__(self, detector: EnemyFelledDetector) -> None:
        self._detector = detector

    def reset(self) -> None:
        self._detector.reset()
