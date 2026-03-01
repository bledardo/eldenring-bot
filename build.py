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
import shutil
import subprocess
import sys
from pathlib import Path


def get_tesseract_datas() -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    """Locate Tesseract binary/DLLs and tessdata for bundling.

    Returns:
        Tuple of (datas, binaries) lists for PyInstaller.
    """
    datas: list[tuple[str, str]] = []
    binaries: list[tuple[str, str]] = []

    # Bundle tessdata from watcher/assets/tessdata
    tessdata_dir = Path("watcher/assets/tessdata")
    if tessdata_dir.exists():
        datas.append((str(tessdata_dir), "watcher/assets/tessdata"))
    else:
        print("WARNING: tessdata not found at watcher/assets/tessdata")

    # Bundle Tesseract binary + DLLs from Program Files
    tesseract_dir = Path(os.environ.get("TESSERACT_DIR", r"C:\Program Files\Tesseract-OCR"))
    if tesseract_dir.exists():
        tesseract_exe = tesseract_dir / "tesseract.exe"
        if tesseract_exe.exists():
            binaries.append((str(tesseract_exe), "tesseract"))
            # Bundle all DLLs in the Tesseract directory
            for dll in tesseract_dir.glob("*.dll"):
                binaries.append((str(dll), "tesseract"))
    else:
        print(f"WARNING: Tesseract not found at {tesseract_dir}")

    return datas, binaries


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
