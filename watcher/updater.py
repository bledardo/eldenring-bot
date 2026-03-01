"""Auto-update checker and downloader via GitHub Releases.

Uses zip-based updates for --onedir PyInstaller builds.
Must never crash the app — all exceptions are caught.
"""

from __future__ import annotations

import io
import os
import subprocess
import sys
import zipfile
from pathlib import Path

import requests
from loguru import logger

from watcher import __version__

GITHUB_REPO = "bledardo/eldenring-bot"

CURRENT_VERSION = __version__


def _parse_version(version_str: str) -> tuple[int, ...]:
    """Parse version string to comparable tuple."""
    clean = version_str.lstrip("v").strip()
    try:
        return tuple(int(x) for x in clean.split("."))
    except (ValueError, AttributeError):
        return (0, 0, 0)


def _get_app_dir() -> Path:
    """Get the application directory (where EldenWatcher.exe lives)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def check_for_update(timeout: float = 5.0) -> dict | None:
    """Check GitHub Releases for a newer version.

    Returns:
        Dict with version, download_url, release_notes if update available, None otherwise.
    """
    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
        response = requests.get(url, timeout=timeout, headers={"Accept": "application/vnd.github.v3+json"})

        if response.status_code != 200:
            logger.debug("Update check: GitHub returned {}", response.status_code)
            return None

        data = response.json()
        latest_tag = data.get("tag_name", "")
        latest_version = _parse_version(latest_tag)
        current_version = _parse_version(CURRENT_VERSION)

        if latest_version <= current_version:
            logger.debug("No update available (current={}, latest={})", CURRENT_VERSION, latest_tag)
            return None

        # Find .zip asset (onedir distribution)
        download_url = None
        expected_size = None
        for asset in data.get("assets", []):
            if asset["name"].endswith(".zip"):
                download_url = asset["browser_download_url"]
                expected_size = asset.get("size")
                break

        # Fallback: try .exe for backward compat with old releases
        if download_url is None:
            for asset in data.get("assets", []):
                if asset["name"].endswith(".exe"):
                    download_url = asset["browser_download_url"]
                    expected_size = asset.get("size")
                    break

        if download_url is None:
            logger.debug("Update available ({}) but no .zip or .exe asset found", latest_tag)
            return None

        logger.info("Update available: {} -> {}", CURRENT_VERSION, latest_tag)
        return {
            "version": latest_tag.lstrip("v"),
            "download_url": download_url,
            "expected_size": expected_size,
            "release_notes": (data.get("body") or "")[:500],
        }

    except Exception as exc:
        logger.debug("Update check failed: {}", exc)
        return None


def download_and_replace(download_url: str, expected_size: int | None = None) -> bool:
    """Download update zip and create self-update batch script.

    For --onedir builds, the update is a zip containing the EldenWatcher folder.
    The batch script:
    1. Waits for current process to exit
    2. Renames current folder to .old
    3. Renames extracted folder to current name
    4. Launches new exe
    5. Cleans up

    Returns:
        True if update initiated (app will exit), False on failure.
    """
    try:
        current_exe = Path(sys.executable).resolve()
        if not current_exe.name.endswith(".exe"):
            logger.warning("Not running as .exe — skipping update")
            return False

        app_dir = current_exe.parent
        app_name = app_dir.name  # "EldenWatcher"
        parent_dir = app_dir.parent  # e.g. Desktop
        old_dir = parent_dir / f"{app_name}.old"
        update_dir = parent_dir / f"{app_name}_update"

        logger.info("Downloading update from {}", download_url)
        response = requests.get(download_url, stream=True, timeout=120)
        response.raise_for_status()

        # Download to memory
        data = io.BytesIO()
        for chunk in response.iter_content(chunk_size=8192):
            data.write(chunk)
        data.seek(0)

        actual_size = data.getbuffer().nbytes
        if expected_size is not None and actual_size != expected_size:
            logger.error("Download corrupted: expected {} bytes, got {} bytes", expected_size, actual_size)
            return False
        logger.info("Update downloaded ({} bytes, verified)", actual_size)

        # Extract zip
        if not zipfile.is_zipfile(data):
            logger.error("Downloaded file is not a valid zip")
            return False

        data.seek(0)
        # Clean up any leftover update dir
        if update_dir.exists():
            import shutil
            shutil.rmtree(update_dir, ignore_errors=True)

        with zipfile.ZipFile(data) as zf:
            zf.extractall(parent_dir)
            # The zip should contain an "EldenWatcher/" folder
            # If extracted as "EldenWatcher/", rename to update dir
            extracted = parent_dir / app_name
            if extracted.exists() and extracted != app_dir:
                # Extracted on top of current — move to update dir
                extracted.rename(update_dir)
            else:
                # Might have extracted with a different name, find it
                names = {n.split("/")[0] for n in zf.namelist() if "/" in n}
                for name in names:
                    candidate = parent_dir / name
                    if candidate.exists() and candidate != app_dir:
                        candidate.rename(update_dir)
                        break

        if not update_dir.exists():
            logger.error("Failed to extract update — folder not found")
            return False

        # Verify the new exe exists
        new_exe = update_dir / current_exe.name
        if not new_exe.exists():
            logger.error("Updated folder missing {}", current_exe.name)
            import shutil
            shutil.rmtree(update_dir, ignore_errors=True)
            return False

        logger.info("Update extracted to {}", update_dir)

        current_pid = os.getpid()
        batch_path = parent_dir / "updater.bat"
        update_log = parent_dir / "updater_debug.log"
        final_exe = app_dir / current_exe.name

        batch_content = f"""@echo off
cd /d "{parent_dir}"

set LOGFILE="{update_log.name}"
echo === Update started at %DATE% %TIME% === >> %LOGFILE%

echo Waiting for watcher (PID {current_pid}) to exit...
echo [%TIME%] Waiting for PID {current_pid} to exit... >> %LOGFILE%
:WAIT_EXIT
tasklist /FI "PID eq {current_pid}" 2>nul | find /I "{current_pid}" >nul
if not errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto WAIT_EXIT
)
echo [%TIME%] Watcher exited. >> %LOGFILE%

REM Wait for file handles to be released
timeout /t 3 /nobreak >nul

REM Kill any lingering processes
tasklist /FI "IMAGENAME eq {current_exe.name}" 2>nul | find /I "{current_exe.name}" >nul
if not errorlevel 1 (
    echo [%TIME%] Killing lingering process... >> %LOGFILE%
    taskkill /F /IM "{current_exe.name}" >nul 2>&1
    timeout /t 2 /nobreak >nul
)

REM Remove old backup if exists
if exist "{old_dir.name}" (
    echo [%TIME%] Removing old backup dir... >> %LOGFILE%
    rmdir /s /q "{old_dir.name}" 2>&1 >> %LOGFILE%
    if exist "{old_dir.name}" (
        timeout /t 3 /nobreak >nul
        rmdir /s /q "{old_dir.name}" 2>&1 >> %LOGFILE%
    )
)

REM Rename current app dir to .old
set RETRY=0
:RENAME_OLD
echo [%TIME%] Renaming {app_name} to {old_dir.name}... >> %LOGFILE%
ren "{app_name}" "{old_dir.name}" 2>&1 >> %LOGFILE%
if errorlevel 1 (
    set /a RETRY+=1
    if %RETRY% GEQ 10 (
        echo [%TIME%] ERROR: Failed to rename after 10 retries >> %LOGFILE%
        goto CLEANUP_FAIL
    )
    echo [%TIME%] Retry %RETRY%/10 - dir locked >> %LOGFILE%
    timeout /t 2 /nobreak >nul
    goto RENAME_OLD
)
echo [%TIME%] Rename to .old OK >> %LOGFILE%

REM Rename update dir to app name
echo [%TIME%] Renaming {update_dir.name} to {app_name}... >> %LOGFILE%
ren "{update_dir.name}" "{app_name}" 2>&1 >> %LOGFILE%
if errorlevel 1 (
    echo [%TIME%] ERROR: Failed to rename update dir, rolling back >> %LOGFILE%
    ren "{old_dir.name}" "{app_name}" 2>&1 >> %LOGFILE%
    goto CLEANUP_FAIL
)
echo [%TIME%] Rename update dir OK >> %LOGFILE%

echo [%TIME%] Starting new version... >> %LOGFILE%
start "" "{final_exe}"

REM Clean up old dir (best effort)
timeout /t 5 /nobreak >nul
rmdir /s /q "{old_dir.name}" >nul 2>&1

echo [%TIME%] Update complete. >> %LOGFILE%
del /f /q "%~f0" >nul 2>&1
exit /b 0

:CLEANUP_FAIL
echo [%TIME%] Update FAILED. >> %LOGFILE%
if exist "{update_dir.name}" rmdir /s /q "{update_dir.name}" 2>&1 >> %LOGFILE%
echo [%TIME%] Starting original version... >> %LOGFILE%
if exist "{app_name}\\{current_exe.name}" start "" "{app_dir}\\{current_exe.name}"
del /f /q "%~f0" >nul 2>&1
exit /b 1
"""
        with open(batch_path, "w") as f:
            f.write(batch_content)

        logger.info("Launching updater script, caller must exit the process...")
        subprocess.Popen(
            ["cmd", "/c", str(batch_path)],
            cwd=str(parent_dir),
            creationflags=subprocess.CREATE_NEW_CONSOLE if hasattr(subprocess, "CREATE_NEW_CONSOLE") else 0,
        )
        return True

    except Exception as exc:
        logger.warning("Update download failed: {}", exc)
        try:
            if update_dir.exists():
                import shutil
                shutil.rmtree(update_dir, ignore_errors=True)
        except Exception:
            pass
        return False


def perform_update_if_available() -> bool:
    """Convenience: check + download + replace.

    Returns:
        True if update initiated (app will exit), False otherwise.
    """
    update_info = check_for_update()
    if update_info is None:
        return False

    logger.info("New version available: v{}", update_info["version"])
    if update_info["release_notes"]:
        logger.info("Release notes: {}", update_info["release_notes"][:200])

    return download_and_replace(update_info["download_url"], update_info.get("expected_size"))
