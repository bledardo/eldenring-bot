"""Boss name OCR with EasyOCR and fuzzy matching against canonical names.

EasyOCR model loading is expensive (~2-3s). Initialize Reader once at startup.
The detect() method is expensive (~100-500ms) — only call when health bar first confirmed.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import cv2
import numpy as np
from loguru import logger

try:
    import easyocr
except ImportError:
    easyocr = None  # type: ignore[assignment]
    logger.warning("easyocr not available — boss name OCR disabled")

try:
    from rapidfuzz import fuzz, process as rfprocess
except ImportError:
    fuzz = None  # type: ignore[assignment]
    rfprocess = None  # type: ignore[assignment]
    logger.warning("rapidfuzz not available — fuzzy matching disabled")


class BossNameDetector:
    """Extract boss names via OCR and fuzzy-match to canonical list.

    Args:
        boss_names_path: Path to JSON file with canonical boss names.
        ocr_languages: Languages for EasyOCR.
        match_threshold: Minimum fuzzy match score (0-100).
    """

    def __init__(
        self,
        boss_names_path: Path,
        ocr_languages: list[str] | None = None,
        match_threshold: int = 60,
    ) -> None:
        self._match_threshold = match_threshold
        self._boss_names: list[str] = []
        self._reader = None
        self.last_raw_ocr: str | None = None
        self.last_match_score: int | None = None

        if ocr_languages is None:
            ocr_languages = ["fr", "en"]

        # Load boss names
        try:
            with open(boss_names_path, "r", encoding="utf-8") as f:
                self._boss_names = json.load(f)
            logger.info("Loaded {} canonical boss names", len(self._boss_names))
        except Exception as exc:
            logger.error("Failed to load boss names from {}: {}", boss_names_path, exc)

        # Initialize EasyOCR reader (expensive — do once)
        if easyocr is not None:
            try:
                start = time.time()
                self._reader = easyocr.Reader(ocr_languages, gpu=False, verbose=False)
                elapsed = time.time() - start
                logger.info("EasyOCR reader initialized ({:.1f}s)", elapsed)
            except Exception as exc:
                logger.error("EasyOCR init failed: {}", exc)

    def _preprocess(self, frame: np.ndarray) -> np.ndarray:
        """Preprocessing pipeline for OCR accuracy.

        1. Upscale 4x (more pixels for OCR)
        2. Convert to grayscale
        3. CLAHE for contrast on gradient backgrounds
        4. Binary threshold (Otsu's method)
        """
        h, w = frame.shape[:2]
        upscaled = cv2.resize(frame, (w * 4, h * 4), interpolation=cv2.INTER_CUBIC)

        gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        return binary

    def _preprocess_white_text(self, frame: np.ndarray) -> np.ndarray:
        """Isolate bright text (white/light grey) from complex backgrounds.

        Uses 4x upscale and tight HSV thresholds to reject colorful background
        elements (grass, sky) while keeping the neutral-colored boss name text.
        Morphological close fills small gaps in letter strokes.
        """
        h, w = frame.shape[:2]
        upscaled = cv2.resize(frame, (w * 4, h * 4), interpolation=cv2.INTER_CUBIC)

        hsv = cv2.cvtColor(upscaled, cv2.COLOR_BGR2HSV)
        # White/light text: low saturation (<60) AND high value (>160)
        mask = (hsv[:, :, 1] < 60) & (hsv[:, :, 2] > 160)
        result = np.zeros(upscaled.shape[:2], dtype=np.uint8)
        result[mask] = 255

        # Close small gaps in letter strokes
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        result = cv2.morphologyEx(result, cv2.MORPH_CLOSE, kernel)

        return result

    def _preprocess_white_text_relaxed(self, frame: np.ndarray) -> np.ndarray:
        """Same as white_text but with relaxed thresholds for darker scenes."""
        h, w = frame.shape[:2]
        upscaled = cv2.resize(frame, (w * 4, h * 4), interpolation=cv2.INTER_CUBIC)

        hsv = cv2.cvtColor(upscaled, cv2.COLOR_BGR2HSV)
        # Relaxed: saturation < 100, value > 120
        mask = (hsv[:, :, 1] < 100) & (hsv[:, :, 2] > 120)
        result = np.zeros(upscaled.shape[:2], dtype=np.uint8)
        result[mask] = 255

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        result = cv2.morphologyEx(result, cv2.MORPH_CLOSE, kernel)

        return result

    def _preprocess_bright_threshold(self, frame: np.ndarray) -> np.ndarray:
        """Simple grayscale threshold for bright white text.

        Color-space agnostic — works regardless of BGR/RGB channel order.
        """
        h, w = frame.shape[:2]
        upscaled = cv2.resize(frame, (w * 4, h * 4), interpolation=cv2.INTER_CUBIC)

        gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)
        # Boss name text is bright white (180+)
        _, result = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        result = cv2.morphologyEx(result, cv2.MORPH_CLOSE, kernel)

        return result

    def _ocr_frame(self, preprocessed: np.ndarray) -> str | None:
        """Run EasyOCR on a single preprocessed frame."""
        if self._reader is None:
            return None
        try:
            results = self._reader.readtext(preprocessed, detail=0, paragraph=True)
            if results:
                text = " ".join(results).strip()
                return text if text else None
        except Exception as exc:
            logger.warning("EasyOCR failed: {}", exc)
        return None

    def match_name(self, ocr_text: str) -> tuple[str, int] | None:
        """Fuzzy match OCR text to canonical boss names.

        Tries ratio, then token_sort_ratio, then token_set_ratio
        (progressively more tolerant of OCR noise).

        Args:
            ocr_text: Raw text from OCR.

        Returns:
            Tuple of (canonical_name, score) or None if no match.
        """
        if rfprocess is None or fuzz is None or not self._boss_names:
            logger.warning("Fuzzy matching unavailable (rapidfuzz not loaded)")
            return None

        try:
            scorers = [
                ("ratio", fuzz.ratio, self._match_threshold),
                ("token_sort", fuzz.token_sort_ratio, self._match_threshold),
                ("token_set", fuzz.token_set_ratio, self._match_threshold),
            ]

            for scorer_name, scorer, cutoff in scorers:
                result = rfprocess.extractOne(
                    ocr_text,
                    self._boss_names,
                    scorer=scorer,
                    score_cutoff=cutoff,
                )
                if result:
                    name, score, _ = result
                    self.last_match_score = int(score)
                    logger.debug(
                        "Fuzzy match ({}): '{}' -> '{}' (score={})",
                        scorer_name, ocr_text, name, int(score),
                    )
                    return (name, int(score))

            # Log best candidate even if below threshold for debugging
            best = rfprocess.extractOne(ocr_text, self._boss_names, scorer=fuzz.ratio)
            if best:
                logger.debug(
                    "Fuzzy match below threshold: '{}' -> '{}' (score={}, threshold={})",
                    ocr_text, best[0], int(best[1]), self._match_threshold,
                )
            self.last_match_score = None
            return None
        except Exception as exc:
            logger.warning("Fuzzy match failed: {}", exc)
            return None

    def detect(self, frame: np.ndarray | None) -> str | None:
        """Try each preprocessing strategy, OCR, and fuzzy-match end-to-end.

        Returns the first strategy that produces a valid boss name match.
        WARNING: Expensive (~100-500ms). Only call when health bar first confirmed.

        Args:
            frame: BGR numpy array of the boss name region.

        Returns:
            Canonical boss name or None.
        """
        if frame is None or frame.size == 0:
            return None
        if self._reader is None:
            logger.warning("EasyOCR reader not initialized — OCR disabled")
            return None

        # Ensure contiguous BGR array (BetterCam may return non-contiguous)
        frame = np.ascontiguousarray(frame[:, :, :3])

        logger.debug(
            "OCR input frame: shape={}, dtype={}, range=[{},{}]",
            frame.shape, frame.dtype, frame.min(), frame.max(),
        )

        strategies = [
            ("white_text", self._preprocess_white_text),
            ("bright_thresh", self._preprocess_bright_threshold),
            ("white_text_relaxed", self._preprocess_white_text_relaxed),
            ("otsu", self._preprocess),
        ]

        # Save preprocessed debug images on first call per detect()
        debug_preprocessed: dict[str, np.ndarray] = {}

        for label, preprocess_fn in strategies:
            preprocessed = preprocess_fn(frame)
            debug_preprocessed[label] = preprocessed
            raw_text = self._ocr_frame(preprocessed)
            if not raw_text:
                continue
            self.last_raw_ocr = raw_text
            logger.debug("OCR [{}] raw text: '{}'", label, raw_text)

            result = self.match_name(raw_text)
            if result:
                return result[0]

        # Store debug images for the watcher to save on failure
        self._last_debug_frames = debug_preprocessed
        self._last_input_frame = frame

        logger.debug("OCR: no valid match from any strategy")
        return None
