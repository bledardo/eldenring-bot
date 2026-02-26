"""Build helper script for PyInstaller packaging.

Usage:
    python build.py

Output:
    dist/EldenWatcher.exe

Test:
    Copy exe to a machine without Python and run it.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def find_easyocr_data() -> list[tuple[str, str]]:
    """Locate EasyOCR package directory and return data file tuples.

    Returns:
        List of (source, destination) tuples for PyInstaller datas.
    """
    datas = []
    try:
        import easyocr

        easyocr_dir = Path(easyocr.__file__).parent

        # Include model directory
        model_dir = easyocr_dir / "model"
        if model_dir.exists():
            datas.append((str(model_dir), "easyocr/model"))

        # Include character directory
        char_dir = easyocr_dir / "character"
        if char_dir.exists():
            datas.append((str(char_dir), "easyocr/character"))

        # Also check user's .EasyOCR model directory
        user_model_dir = Path.home() / ".EasyOCR" / "model"
        if user_model_dir.exists():
            datas.append((str(user_model_dir), "easyocr_models"))

    except ImportError:
        print("WARNING: easyocr not installed, models will not be bundled")

    return datas


def build() -> None:
    """Run PyInstaller with the spec file."""
    spec_file = Path("build.spec")
    if not spec_file.exists():
        print(f"ERROR: {spec_file} not found")
        sys.exit(1)

    print("Building EldenWatcher.exe...")
    result = subprocess.run(
        [sys.executable, "-m", "PyInstaller", str(spec_file), "--noconfirm"],
        capture_output=False,
    )

    if result.returncode != 0:
        print("BUILD FAILED")
        sys.exit(1)

    # Check output
    exe_path = Path("dist/EldenWatcher.exe")
    if exe_path.exists():
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f"\nBUILD SUCCESS: {exe_path}")
        print(f"Size: {size_mb:.0f} MB")
        print("\nTest: Copy exe to a machine without Python and run it")
    else:
        print("WARNING: Expected output not found at dist/EldenWatcher.exe")


if __name__ == "__main__":
    build()
