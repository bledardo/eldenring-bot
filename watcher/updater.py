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
        expected_size = None
        for asset in data.get("assets", []):
            if asset["name"].endswith(".exe"):
                download_url = asset["browser_download_url"]
                expected_size = asset.get("size")
                break

        if download_url is None:
            logger.debug("Update available ({}) but no .exe asset found", latest_tag)
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

        # Verify download integrity (size check)
        actual_size = temp_path.stat().st_size
        if expected_size is not None and actual_size != expected_size:
            logger.error(
                "Download corrupted: expected {} bytes, got {} bytes",
                expected_size, actual_size,
            )
            temp_path.unlink(missing_ok=True)
            return False
        logger.info("Update downloaded to {} ({} bytes, verified)", temp_path, actual_size)

        current_pid = os.getpid()

        # Create batch script for self-update
        # Uses full paths, retry loops, and proper error handling.
        batch_path = exe_dir / "updater.bat"
        update_log = exe_dir / "updater_debug.log"
        batch_content = f"""@echo off
cd /d "{exe_dir}"

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
echo Watcher exited.
echo [%TIME%] Watcher exited. >> %LOGFILE%

REM Wait extra time for Windows to release all file handles (DLLs, _MEI dir)
echo Waiting 5s for file handles to be released...
echo [%TIME%] Waiting 5s for file handle release... >> %LOGFILE%
timeout /t 5 /nobreak >nul

REM Kill any lingering EldenWatcher processes (zombie child processes)
tasklist /FI "IMAGENAME eq {current_exe.name}" 2>nul | find /I "{current_exe.name}" >nul
if not errorlevel 1 (
    echo [%TIME%] WARNING: Found lingering process, killing it... >> %LOGFILE%
    taskkill /F /IM "{current_exe.name}" >nul 2>&1
    timeout /t 3 /nobreak >nul
)

REM List files before update
echo [%TIME%] Files in directory before update: >> %LOGFILE%
dir /b "{exe_dir}" >> %LOGFILE% 2>&1

REM Delete leftover .old from previous update
if exist "{old_path.name}" (
    echo [%TIME%] Deleting leftover .old file... >> %LOGFILE%
    del /f /q "{old_path.name}" 2>&1 >> %LOGFILE%
    if exist "{old_path.name}" (
        echo WARNING: Could not delete old file, retrying...
        echo [%TIME%] WARNING: Could not delete .old, retrying... >> %LOGFILE%
        timeout /t 2 /nobreak >nul
        del /f /q "{old_path.name}" 2>&1 >> %LOGFILE%
    )
)

REM Rename current exe to .old
set RETRY=0
:RENAME_OLD
echo [%TIME%] Renaming {current_exe.name} to {old_path.name}... >> %LOGFILE%
ren "{current_exe.name}" "{old_path.name}" 2>&1 >> %LOGFILE%
if errorlevel 1 (
    set /a RETRY+=1
    if %RETRY% GEQ 10 (
        echo ERROR: Failed to rename current exe after 10 retries. Aborting.
        echo [%TIME%] ERROR: Failed to rename after 10 retries >> %LOGFILE%
        goto CLEANUP_FAIL
    )
    echo Retry %RETRY%/10 — file may be locked...
    echo [%TIME%] Retry %RETRY%/10 - file locked >> %LOGFILE%
    timeout /t 2 /nobreak >nul
    goto RENAME_OLD
)
echo [%TIME%] Rename to .old OK >> %LOGFILE%

REM Rename downloaded exe to current name
echo [%TIME%] Renaming {temp_path.name} to {current_exe.name}... >> %LOGFILE%
ren "{temp_path.name}" "{current_exe.name}" 2>&1 >> %LOGFILE%
if errorlevel 1 (
    echo ERROR: Failed to rename update file. Rolling back...
    echo [%TIME%] ERROR: Failed to rename update file, rolling back >> %LOGFILE%
    ren "{old_path.name}" "{current_exe.name}" 2>&1 >> %LOGFILE%
    goto CLEANUP_FAIL
)
echo [%TIME%] Rename update file OK >> %LOGFILE%

echo Unblocking exe (remove Windows download security flag)...
powershell -Command "Unblock-File -Path '{current_exe}'" >nul 2>&1

REM List files after rename
echo [%TIME%] Files in directory after rename: >> %LOGFILE%
dir /b "{exe_dir}" >> %LOGFILE% 2>&1

echo [%TIME%] Starting new version... >> %LOGFILE%
echo Update successful, starting new version...
start "" "{current_exe}"

REM Wait and check if the new exe is still running
timeout /t 5 /nobreak >nul
tasklist /FI "IMAGENAME eq {current_exe.name}" 2>nul | find /I "{current_exe.name}" >nul
if errorlevel 1 (
    echo [%TIME%] WARNING: New exe does not appear to be running! It may have crashed. >> %LOGFILE%
    echo [%TIME%] Check watcher logs for ModuleNotFoundError or ImportError details. >> %LOGFILE%
) else (
    echo [%TIME%] New exe is running OK >> %LOGFILE%
)

REM Clean up .old file (best effort)
timeout /t 3 /nobreak >nul
del /f /q "{old_path.name}" >nul 2>&1

echo [%TIME%] Update complete. >> %LOGFILE%

REM Delete this script
del /f /q "%~f0" >nul 2>&1
exit /b 0

:CLEANUP_FAIL
echo [%TIME%] Update FAILED. >> %LOGFILE%
echo Update failed. Cleaning up...
if exist "{temp_path.name}" del /f /q "{temp_path.name}" 2>&1 >> %LOGFILE%
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

    return download_and_replace(update_info["download_url"], update_info.get("expected_size"))
