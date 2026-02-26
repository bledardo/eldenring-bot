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
GITHUB_REPO = "OWNER/elden-ring-watcher"

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
            "release_notes": data.get("body", "")[:500],
        }

    except Exception as exc:
        logger.debug("Update check failed: {}", exc)
        return None


def download_and_replace(download_url: str) -> bool:
    """Download new exe and create self-update batch script.

    The batch script:
    1. Waits for current process to exit
    2. Renames current exe to .old
    3. Renames new exe to current name
    4. Deletes .old
    5. Launches new exe
    6. Deletes itself

    Args:
        download_url: URL of the new .exe to download.

    Returns:
        True if update initiated (app will exit), False on failure.
    """
    try:
        current_exe = Path(sys.executable)
        if not current_exe.name.endswith(".exe"):
            logger.warning("Not running as .exe — skipping update")
            return False

        # Download to temp file alongside current exe
        temp_path = current_exe.parent / f"{current_exe.stem}_update.exe"

        logger.info("Downloading update from {}", download_url)
        response = requests.get(download_url, stream=True, timeout=60)
        response.raise_for_status()

        with open(temp_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        logger.info("Update downloaded to {}", temp_path)

        # Create batch script for self-update
        batch_path = current_exe.parent / "updater.bat"
        batch_content = f"""@echo off
timeout /t 2 /nobreak >nul
ren "{current_exe.name}" "{current_exe.stem}.old"
ren "{temp_path.name}" "{current_exe.name}"
del "{current_exe.stem}.old"
start "" "{current_exe.name}"
del "%~f0"
"""
        with open(batch_path, "w") as f:
            f.write(batch_content)

        # Launch updater and exit
        logger.info("Launching updater script, app will restart...")
        subprocess.Popen(
            ["cmd", "/c", str(batch_path)],
            creationflags=subprocess.CREATE_NEW_CONSOLE if hasattr(subprocess, "CREATE_NEW_CONSOLE") else 0,
        )
        sys.exit(0)

    except Exception as exc:
        logger.warning("Update download failed: {}", exc)
        # Clean up temp file if it exists
        try:
            temp_path = Path(sys.executable).parent / f"{Path(sys.executable).stem}_update.exe"
            if temp_path.exists():
                temp_path.unlink()
        except Exception:
            pass
        return False

    return True


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
