"""Build helper script for PyInstaller packaging.

Usage:
    python build.py

Output:
    dist/EldenWatcher/EldenWatcher.exe  (onedir)
    dist/EldenWatcher.zip               (for distribution/auto-update)

Test:
    Extract the zip to a machine without Python and run EldenWatcher.exe
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import zipfile
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

    # Check output (onedir mode: dist/EldenWatcher/ folder)
    dist_dir = Path("dist/EldenWatcher")
    exe_path = dist_dir / "EldenWatcher.exe"
    if exe_path.exists():
        # Create zip for distribution
        zip_path = Path("dist/EldenWatcher.zip")
        print(f"Creating {zip_path}...")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for file in dist_dir.rglob("*"):
                if file.is_file():
                    arcname = file.relative_to(dist_dir.parent)  # EldenWatcher/...
                    zf.write(file, arcname)

        zip_mb = zip_path.stat().st_size / (1024 * 1024)
        dir_size = sum(f.stat().st_size for f in dist_dir.rglob("*") if f.is_file())
        dir_mb = dir_size / (1024 * 1024)
        print(f"\nBUILD SUCCESS: {dist_dir}/")
        print(f"Folder size: {dir_mb:.0f} MB")
        print(f"Zip size:    {zip_mb:.0f} MB ({zip_path})")
        print(f"\nUpload {zip_path} to GitHub Releases")
    else:
        print("WARNING: Expected output not found at dist/EldenWatcher/EldenWatcher.exe")


if __name__ == "__main__":
    build()
