# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec file for Elden Ring Watcher.

Bundles all dependencies including EasyOCR models, PyTorch, and OpenCV.
Expected exe size: ~300-500MB.
"""

import sys
from pathlib import Path

# Import build helper for EasyOCR data
sys.path.insert(0, str(Path(SPECPATH)))
from build import find_easyocr_data

# Collect EasyOCR model data
easyocr_datas = find_easyocr_data()

a = Analysis(
    ["watcher/main.py"],
    pathex=["watcher"],
    binaries=[],
    datas=[
        ("watcher/assets/boss_names.json", "watcher/assets"),
        ("watcher/assets/templates", "watcher/assets/templates"),
    ]
    + easyocr_datas,
    hiddenimports=[
        # PyTorch
        "torch",
        "torch.jit",
        "torch._C",
        # EasyOCR
        "easyocr",
        # scikit-image (easyocr dependency)
        "skimage",
        "skimage.transform",
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
        "tkinter",
        "matplotlib",
        "scipy.spatial.cython_blas",
        "scipy.spatial.cython_lapack",
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
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # GUI app — no console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
