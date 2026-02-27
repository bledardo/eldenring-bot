"""Resolve asset paths for both development and PyInstaller bundles."""

from __future__ import annotations

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
