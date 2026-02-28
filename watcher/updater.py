"""Auto-update checker and downloader via GitHub Releases.

Checks for new releases on startup and offers self-update via batch script.
Must never crash the app — all exceptions are caught.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import requests
from loguru import logger

from watcher import __version__

# Placeholder — user sets this to their actual repo
GITHUB_REPO = "bledardo/eldenring-bot"

CURRENT_VERSION = __version__


def _parse_version(version_str: str) -> tuple[int, ...]:
    """Parse version string to comparable tuple."""
    clean = version_str.lstrip("v").strip()
    try:
        return tuple(int(x) for x in clean.split("."))
    except (ValueError, AttributeError):
        return (0, 0, 0)


def check_for_update(timeout: float = 5.0) -> dict | None:
    """Check GitHub Releases for a newer version.

    Args:
        timeout: HTTP request timeout in seconds.

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

        # Find .exe asset
        download_url = None
        for asset in data.get("assets", []):
            if asset["name"].endswith(".exe"):
                download_url = asset["browser_download_url"]
                break

        if download_url is None:
            logger.debug("Update available ({}) but no .exe asset found", latest_tag)
            return None

        logger.info("Update available: {} -> {}", CURRENT_VERSION, latest_tag)
        return {
            "version": latest_tag.lstrip("v"),
            "download_url": download_url,
            "release_notes": (data.get("body") or "")[:500],
        }

    except Exception as exc:
        logger.debug("Update check failed: {}", exc)
        return None


def download_and_replace(download_url: str) -> bool:
    """Download new exe and create self-update batch script.

    The batch script:
    1. Waits for current process to fully exit (retry loop)
    2. Deletes any leftover .old from a previous update
    3. Renames current exe to .old
    4. Renames downloaded exe to current name
    5. Launches new exe
    6. Cleans up .old and deletes itself

    Args:
        download_url: URL of the new .exe to download.

    Returns:
        True if update initiated (app will exit), False on failure.
    """
    try:
        current_exe = Path(sys.executable).resolve()
        if not current_exe.name.endswith(".exe"):
            logger.warning("Not running as .exe — skipping update")
            return False

        exe_dir = current_exe.parent
        old_path = exe_dir / f"{current_exe.stem}.old"
        temp_path = exe_dir / f"{current_exe.stem}_update.exe"

        logger.info("Downloading update from {}", download_url)
        response = requests.get(download_url, stream=True, timeout=60)
        response.raise_for_status()

        with open(temp_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        logger.info("Update downloaded to {}", temp_path)

        current_pid = os.getpid()

        # Create batch script for self-update
        # Uses full paths, retry loops, and proper error handling.
        batch_path = exe_dir / "updater.bat"
        batch_content = f"""@echo off
cd /d "{exe_dir}"

echo Waiting for watcher (PID {current_pid}) to exit...
:WAIT_EXIT
tasklist /FI "PID eq {current_pid}" 2>nul | find /I "{current_pid}" >nul
if not errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto WAIT_EXIT
)
echo Watcher exited.

REM Delete leftover .old from previous update
if exist "{old_path.name}" (
    del /f /q "{old_path.name}" >nul 2>&1
    if exist "{old_path.name}" (
        echo WARNING: Could not delete old file, retrying...
        timeout /t 2 /nobreak >nul
        del /f /q "{old_path.name}" >nul 2>&1
    )
)

REM Rename current exe to .old
set RETRY=0
:RENAME_OLD
ren "{current_exe.name}" "{old_path.name}" >nul 2>&1
if errorlevel 1 (
    set /a RETRY+=1
    if %RETRY% GEQ 10 (
        echo ERROR: Failed to rename current exe after 10 retries. Aborting.
        goto CLEANUP_FAIL
    )
    echo Retry %RETRY%/10 — file may be locked...
    timeout /t 2 /nobreak >nul
    goto RENAME_OLD
)

REM Rename downloaded exe to current name
ren "{temp_path.name}" "{current_exe.name}" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to rename update file. Rolling back...
    ren "{old_path.name}" "{current_exe.name}" >nul 2>&1
    goto CLEANUP_FAIL
)

echo Update successful, starting new version...
start "" "{current_exe}"

REM Clean up .old file (best effort)
timeout /t 3 /nobreak >nul
del /f /q "{old_path.name}" >nul 2>&1

REM Delete this script
del /f /q "%~f0" >nul 2>&1
exit /b 0

:CLEANUP_FAIL
echo Update failed. Cleaning up...
if exist "{temp_path.name}" del /f /q "{temp_path.name}" >nul 2>&1
echo Starting original version...
if exist "{current_exe.name}" start "" "{current_exe}"
del /f /q "%~f0" >nul 2>&1
exit /b 1
"""
        with open(batch_path, "w") as f:
            f.write(batch_content)

        # Launch updater script (caller is responsible for exiting the process)
        logger.info("Launching updater script, caller must exit the process...")
        subprocess.Popen(
            ["cmd", "/c", str(batch_path)],
            cwd=str(exe_dir),
            creationflags=subprocess.CREATE_NEW_CONSOLE if hasattr(subprocess, "CREATE_NEW_CONSOLE") else 0,
        )
        return True

    except Exception as exc:
        logger.warning("Update download failed: {}", exc)
        # Clean up temp file if it exists
        try:
            temp_path = Path(sys.executable).resolve().parent / f"{Path(sys.executable).stem}_update.exe"
            if temp_path.exists():
                temp_path.unlink()
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

    return download_and_replace(update_info["download_url"])
