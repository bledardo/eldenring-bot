"""Shared test fixtures for the Watcher test suite.

Screenshot naming convention:
  - boss_bar_*.png — boss health bar visible
  - you_died_*.png — YOU DIED screen
  - normal_*.png — normal gameplay, no boss bar
  - coop_*.png — co-op phantom icons visible

Screenshots should be full-screen captures or the relevant region.
Place all test screenshots in tests/screenshots/.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
import pytest


TESTS_DIR = Path(__file__).parent
PROJECT_ROOT = TESTS_DIR.parent


def load_screenshot(path: Path) -> np.ndarray:
    """Load a screenshot as a BGR numpy array.

    Args:
        path: Path to the screenshot file (PNG/JPG).

    Returns:
        BGR numpy array.

    Raises:
        FileNotFoundError: If the screenshot file doesn't exist.
        ValueError: If the image couldn't be loaded.
    """
    if not path.exists():
        raise FileNotFoundError(f"Screenshot not found: {path}")
    img = cv2.imread(str(path))
    if img is None:
        raise ValueError(f"Failed to load image: {path}")
    return img


@pytest.fixture
def screenshot_dir() -> Path:
    """Path to test screenshots directory."""
    return TESTS_DIR / "screenshots"


@pytest.fixture
def boss_names_path() -> Path:
    """Path to canonical boss names JSON."""
    return PROJECT_ROOT / "watcher" / "assets" / "boss_names.json"


@pytest.fixture
def template_dir() -> Path:
    """Path to template images directory."""
    return PROJECT_ROOT / "watcher" / "assets" / "templates"


@pytest.fixture
def health_bar_detector(template_dir: Path):
    """Pre-initialized HealthBarDetector."""
    from watcher.detectors.health_bar import HealthBarDetector
    return HealthBarDetector(template_dir)


@pytest.fixture
def you_died_detector(template_dir: Path):
    """Pre-initialized YouDiedDetector."""
    from watcher.detectors.you_died import YouDiedDetector
    return YouDiedDetector(template_dir)


@pytest.fixture
def boss_name_detector(boss_names_path: Path):
    """Pre-initialized BossNameDetector."""
    from watcher.detectors.boss_name import BossNameDetector
    return BossNameDetector(boss_names_path)
