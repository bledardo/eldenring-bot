"""Resolve asset paths for both development and PyInstaller bundles."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def asset_path(relative: str) -> Path:
    """Return the absolute path to a bundled asset.

    In development, resolves relative to the project root.
    In a PyInstaller bundle, resolves relative to sys._MEIPASS.

    Args:
        relative: Path relative to project root (e.g. "watcher/assets/boss_names.json").
    """
    if getattr(sys, "frozen", False):
        # Running as PyInstaller bundle
        base = Path(sys._MEIPASS)  # type: ignore[attr-defined]
    else:
        # Running from source — project root is one level up from watcher/
        base = Path(__file__).resolve().parent.parent

    return base / relative


def configure_tesseract() -> None:
    """Configure Tesseract binary and tessdata paths for both dev and PyInstaller.

    In development: uses system-installed Tesseract.
    In PyInstaller bundle: uses bundled Tesseract binary and tessdata.
    """
    try:
        import pytesseract
    except ImportError:
        return

    if getattr(sys, "frozen", False):
        # PyInstaller bundle — Tesseract binary is bundled
        base = Path(sys._MEIPASS)  # type: ignore[attr-defined]
        tesseract_exe = base / "tesseract" / "tesseract.exe"
        if tesseract_exe.exists():
            pytesseract.pytesseract.tesseract_cmd = str(tesseract_exe)

    # Set tessdata path (bundled in both dev and PyInstaller)
    tessdata_dir = asset_path("watcher/assets/tessdata")
    if tessdata_dir.exists():
        os.environ["TESSDATA_PREFIX"] = str(tessdata_dir)
