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
        match_threshold: int = 75,
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

        1. Upscale 2x (more pixels for OCR)
        2. Convert to grayscale
        3. CLAHE for contrast on gradient backgrounds
        4. Binary threshold (Otsu's method)
        """
        # Upscale 2x
        h, w = frame.shape[:2]
        upscaled = cv2.resize(frame, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)

        # Grayscale
        gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)

        # CLAHE for adaptive contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Binary threshold (Otsu's)
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        return binary

    def extract_name(self, frame: np.ndarray) -> str | None:
        """Run EasyOCR on preprocessed frame.

        Args:
            frame: BGR numpy array of the boss bar region.

        Returns:
            Raw OCR text or None if no text detected.
        """
        if self._reader is None:
            return None

        preprocessed = self._preprocess(frame)

        try:
            results = self._reader.readtext(preprocessed, detail=0, paragraph=True)
            if results:
                text = " ".join(results).strip()
                self.last_raw_ocr = text
                logger.debug("OCR raw text: '{}'", text)
                return text if text else None
            return None
        except Exception as exc:
            logger.warning("EasyOCR failed: {}", exc)
            return None

    def match_name(self, ocr_text: str) -> tuple[str, int] | None:
        """Fuzzy match OCR text to canonical boss names.

        Args:
            ocr_text: Raw text from OCR.

        Returns:
            Tuple of (canonical_name, score) or None if no match.
        """
        if rfprocess is None or fuzz is None or not self._boss_names:
            return None

        try:
            result = rfprocess.extractOne(
                ocr_text,
                self._boss_names,
                scorer=fuzz.ratio,
                score_cutoff=self._match_threshold,
            )
            if result:
                name, score, _ = result
                self.last_match_score = int(score)
                logger.debug("Fuzzy match: '{}' -> '{}' (score={})", ocr_text, name, int(score))
                return (name, int(score))
            self.last_match_score = None
            return None
        except Exception as exc:
            logger.warning("Fuzzy match failed: {}", exc)
            return None

    def detect(self, frame: np.ndarray | None) -> str | None:
        """Convenience: extract name then fuzzy-match.

        WARNING: Expensive (~100-500ms). Only call when health bar first confirmed.

        Args:
            frame: BGR numpy array of the boss bar region.

        Returns:
            Canonical boss name or None.
        """
        if frame is None or frame.size == 0:
            return None

        raw_text = self.extract_name(frame)
        if raw_text is None:
            return None

        result = self.match_name(raw_text)
        if result:
            return result[0]
        return None
