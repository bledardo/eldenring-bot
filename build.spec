# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec file for Elden Ring Watcher.

Bundles all dependencies including Tesseract OCR and OpenCV.
Expected exe size: ~50-100MB (much smaller without PyTorch).
"""

import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules, collect_dynamic_libs, collect_data_files

# Import build helper for Tesseract data
sys.path.insert(0, str(Path(SPECPATH)))
from build import get_tesseract_datas

# Collect ALL numpy submodules + compiled binaries (.pyd/.so)
numpy_hiddenimports = collect_submodules("numpy")
numpy_binaries = collect_dynamic_libs("numpy")
numpy_datas = collect_data_files("numpy")

# Collect Tesseract data and binaries
tesseract_datas, tesseract_binaries = get_tesseract_datas()

a = Analysis(
    ["watcher/main.py"],
    pathex=["watcher"],
    binaries=tesseract_binaries + numpy_binaries,
    datas=[
        ("watcher/assets/boss_names.json", "watcher/assets"),
        ("watcher/assets/templates", "watcher/assets/templates"),
    ]
    + tesseract_datas
    + numpy_datas,
    hiddenimports=numpy_hiddenimports + [
        # OCR
        "pytesseract",
        # Image processing
        "PIL",
        "PIL.Image",
        "cv2",
        # System tray (Windows-specific)
        "pystray._win32",
        # Windows APIs
        "win32gui",
        "win32con",
        "win32process",
        # State machine
        "transitions",
        # Fuzzy matching
        "rapidfuzz",
        # Logging
        "loguru",
        # Config
        "tomli",
        "tomli_w",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "matplotlib",
        # EasyOCR / PyTorch — no longer needed (Tesseract replaces them)
        "torch",
        "torchvision",
        "torchaudio",
        "easyocr",
        "caffe2",
        "triton",
        # Heavy ML/science libs pulled in transitively
        "scipy",
        "sklearn",
        "scikit-learn",
        "pandas",
        "transformers",
        "datasets",
        "huggingface_hub",
        "timm",
        "numba",
        "llvmlite",
        "bitsandbytes",
        "wandb",
        "tensorboard",
        "librosa",
        "soundfile",
        "pyarrow",
        "sqlalchemy",
        "boto3",
        "botocore",
        "sentry_sdk",
        "uvicorn",
        "lxml",
        "imageio",
        "imageio_ffmpeg",
        "av",
        "pygments",
        "jinja2",
        "google",
        "skimage",
    ],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="EldenWatcher",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    icon="watcher/assets/icon.ico",
    console=False,  # GUI app — no console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
