"""Boss name OCR with Tesseract and fuzzy matching against canonical names.

Tesseract is fast (~10-50ms) compared to EasyOCR (~100-500ms).
The detect() method runs OCR with multiple preprocessing strategies and
fuzzy-matches against canonical boss names.
"""

from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path

import cv2
import numpy as np
from loguru import logger

try:
    import pytesseract
except ImportError:
    pytesseract = None  # type: ignore[assignment]
    logger.warning("pytesseract not available — boss name OCR disabled")

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
        match_threshold: Minimum fuzzy match score (0-100).
        tessdata_dir: Path to tessdata directory (for bundled deployments).
    """

    def __init__(
        self,
        boss_names_path: Path,
        match_threshold: int = 60,
        tessdata_dir: Path | None = None,
    ) -> None:
        self._match_threshold = match_threshold
        self._boss_names: list[str] = []
        self._ocr_available = False
        self.last_raw_ocr: str | None = None
        self.last_match_score: int | None = None
        self.last_was_fallback: bool = False

        # Load boss names
        try:
            with open(boss_names_path, "r", encoding="utf-8") as f:
                self._boss_names = json.load(f)
            logger.info("Loaded {} canonical boss names", len(self._boss_names))
        except Exception as exc:
            logger.error("Failed to load boss names from {}: {}", boss_names_path, exc)

        # Set tessdata directory if provided
        if tessdata_dir is not None and tessdata_dir.exists():
            os.environ["TESSDATA_PREFIX"] = str(tessdata_dir)
            logger.debug("TESSDATA_PREFIX set to {}", tessdata_dir)

        # Verify Tesseract is available
        if pytesseract is not None:
            try:
                version = pytesseract.get_tesseract_version()
                self._ocr_available = True
                logger.info("Tesseract OCR initialized (v{})", version)
            except Exception as exc:
                logger.error("Tesseract not found or not working: {}", exc)

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
        """Run Tesseract OCR on a single preprocessed frame."""
        if not self._ocr_available:
            return None
        try:
            text = pytesseract.image_to_string(
                preprocessed,
                config="--psm 7 -l fra+eng",
            ).strip()
            return text if text else None
        except Exception as exc:
            logger.warning("Tesseract OCR failed: {}", exc)
        return None

    @staticmethod
    def _clean_ocr_text(raw: str) -> str | None:
        """Strip OCR noise (stray punctuation, pipes, quotes) from raw text.

        Returns cleaned text if it looks like a plausible boss name (≥3 alpha
        chars), or None if it's just garbage."""
        # Remove leading/trailing non-alpha characters (pipes, quotes, dashes, digits, etc.)
        cleaned = re.sub(r'^[^a-zA-ZÀ-ÿ]+', '', raw)
        cleaned = re.sub(r'[^a-zA-ZÀ-ÿ]+$', '', cleaned)
        # Remove stray pipes and isolated single characters surrounded by spaces/punctuation
        cleaned = re.sub(r'\s*\|.*', '', cleaned)
        cleaned = cleaned.strip()
        # Must have at least 4 alphabetic characters to be plausible
        alpha_count = sum(1 for c in cleaned if c.isalpha())
        if alpha_count < 4:
            return None
        # Reject garbage: real boss names are mostly letters+spaces, not
        # scattered symbols/digits.  Require ≥65% alphabetic characters.
        if len(cleaned) > 0 and alpha_count / len(cleaned) < 0.65:
            return None
        # Reject text with too many short tokens (≤2 chars) — OCR noise
        # produces scattered fragments like "ae Pe er QR".
        # Real boss names have mostly long words; French articles are exempt.
        _FR_ARTICLES = {"de", "du", "le", "la", "l", "d", "des", "au"}
        tokens = cleaned.split()
        if len(tokens) > 3:
            short_noise = sum(
                1 for t in tokens
                if len(t) <= 2 and t.lower() not in _FR_ARTICLES
            )
            if short_noise / len(tokens) > 0.3:
                return None
        return cleaned

    @staticmethod
    def _looks_like_boss_name(text: str) -> bool:
        """Extra validation for OCR fallback — stricter than _clean_ocr_text.

        A real boss name (in French) has:
        - At least one capitalized word ≥4 chars (e.g. "Margit", "Radahn")
        - Not too many words (boss names are ≤8 words)
        - At least 6 total alpha chars
        - No digits (no boss name contains numbers)
        - Not ALL CAPS (French boss names use Title Case)
        """
        # Reject text with digits — no boss name contains numbers
        if any(c.isdigit() for c in text):
            return False
        tokens = text.split()
        # Too many words = likely OCR reading UI/subtitles
        if len(tokens) > 8:
            return False
        # Reject ALL CAPS tokens — real French boss names use Title Case
        all_caps_tokens = sum(1 for t in tokens if len(t) >= 3 and t == t.upper())
        if all_caps_tokens >= 2:
            return False
        # Must have enough total alpha chars
        alpha_total = sum(1 for c in text if c.isalpha())
        if alpha_total < 6:
            return False
        # Must have at least one capitalized word ≥4 chars
        has_proper_word = any(
            len(t) >= 4 and t[0].isupper()
            for t in tokens
        )
        return has_proper_word

    @staticmethod
    def _length_ratio(ocr_text: str, candidate: str) -> float:
        """Return len(ocr) / len(candidate).  Prevents short OCR fragments
        from matching long boss names via token_set (e.g. "de l'Arbre" matching
        "Sentinelle de l'Arbre")."""
        if not candidate:
            return 0.0
        return len(ocr_text) / len(candidate)

    def match_name(self, ocr_text: str) -> tuple[str, int] | None:
        """Fuzzy match OCR text to canonical boss names.

        Tries ratio, then token_sort_ratio, then token_set_ratio
        (progressively more tolerant of OCR noise).  Each match is also
        checked against a minimum length ratio to reject partial OCR
        fragments that share common words with the wrong boss
        (e.g. "Sentinelle" vs "Chien de Garde").

        Args:
            ocr_text: Raw text from OCR.

        Returns:
            Tuple of (canonical_name, score) or None if no match.
        """
        if rfprocess is None or fuzz is None or not self._boss_names:
            logger.warning("Fuzzy matching unavailable (rapidfuzz not loaded)")
            return None

        min_length_ratio = 0.55  # OCR text must be ≥55% of candidate length

        try:
            scorers = [
                ("ratio", fuzz.ratio, 65),
                ("token_sort", fuzz.token_sort_ratio, 65),
                ("token_set", fuzz.token_set_ratio, 75),
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
                    lr = self._length_ratio(ocr_text, name)
                    if lr < min_length_ratio:
                        logger.debug(
                            "Fuzzy match ({}) rejected — length ratio too low: "
                            "'{}' -> '{}' (score={}, length_ratio={:.2f}, min={})",
                            scorer_name, ocr_text, name, int(score),
                            lr, min_length_ratio,
                        )
                        continue
                    self.last_match_score = int(score)
                    logger.debug(
                        "Fuzzy match ({}): '{}' -> '{}' (score={}, length_ratio={:.2f})",
                        scorer_name, ocr_text, name, int(score), lr,
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
        WARNING: Expensive (~10-50ms). Only call when health bar first confirmed.

        Args:
            frame: BGR numpy array of the boss name region.

        Returns:
            Canonical boss name or None.
        """
        self.last_was_fallback = False
        if frame is None or frame.size == 0:
            return None
        if not self._ocr_available:
            logger.warning("Tesseract OCR not available — OCR disabled")
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
        all_raw_texts: list[str] = []

        for label, preprocess_fn in strategies:
            preprocessed = preprocess_fn(frame)
            debug_preprocessed[label] = preprocessed
            raw_text = self._ocr_frame(preprocessed)
            if not raw_text:
                continue
            self.last_raw_ocr = raw_text
            all_raw_texts.append(raw_text)
            logger.debug("OCR [{}] raw text: '{}'", label, raw_text)

            # Try matching raw text first, then cleaned version (without trailing noise)
            result = self.match_name(raw_text)
            if result:
                return result[0]
            cleaned = self._clean_ocr_text(raw_text)
            if cleaned and cleaned != raw_text:
                result = self.match_name(cleaned)
                if result:
                    return result[0]

        # Store debug images for the watcher to save on failure
        self._last_debug_frames = debug_preprocessed
        self._last_input_frame = frame

        # Fallback: pick the cleanest OCR text across all strategies
        # so the boss is tracked even if not in the canonical list.
        # Stricter than _clean_ocr_text — must look like a real boss name
        # AND have a minimum fuzzy proximity to at least one known boss
        # (rejects total garbage like "WOT ARES TRON 7l").
        min_fallback_proximity = 55  # must vaguely resemble a real boss
        best_cleaned: str | None = None
        best_alpha = 0
        for raw in all_raw_texts:
            cleaned = self._clean_ocr_text(raw)
            if cleaned and self._looks_like_boss_name(cleaned):
                # Check fuzzy proximity to any known boss
                if fuzz is not None and rfprocess is not None and self._boss_names:
                    best_match = rfprocess.extractOne(
                        cleaned, self._boss_names, scorer=fuzz.token_set_ratio,
                    )
                    if not best_match or best_match[1] < min_fallback_proximity:
                        logger.debug(
                            "OCR fallback rejected — too far from any known boss: "
                            "'{}' (best: '{}', score={})",
                            cleaned,
                            best_match[0] if best_match else "?",
                            int(best_match[1]) if best_match else 0,
                        )
                        continue
                alpha = sum(1 for c in cleaned if c.isalpha())
                if alpha > best_alpha:
                    best_alpha = alpha
                    best_cleaned = cleaned
        if best_cleaned:
            self.last_was_fallback = True
            logger.info(
                "OCR fallback: no canonical match, using cleaned text: '{}'",
                best_cleaned,
            )
            return best_cleaned

        logger.debug("OCR: no valid match from any strategy")
        return None
