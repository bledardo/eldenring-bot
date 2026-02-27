"""Loguru-based logging setup with file rotation."""

from __future__ import annotations

import sys

from loguru import logger

from watcher.config import Config


def setup_logging(config: Config) -> None:
    """Configure loguru logging with console and file outputs.

    Args:
        config: Watcher configuration instance.
    """
    # Remove default handler
    logger.remove()

    # Console output (colorized) — skip when no console (PyInstaller --windowed)
    if sys.stderr is not None:
        logger.add(
            sys.stderr,
            level=config.log_level,
            format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
            colorize=True,
        )

    # File output with rotation and retention
    log_dir = config.data_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    logger.add(
        str(log_dir / "watcher_{time:YYYY-MM-DD}.log"),
        level=config.log_level,
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation="10 MB",
        retention="7 days",
        encoding="utf-8",
    )

    # Create debug screenshot directory if enabled
    if config.debug_screenshots:
        screenshots_dir = config.data_dir / "screenshots"
        screenshots_dir.mkdir(parents=True, exist_ok=True)
        logger.debug("Debug screenshots enabled, saving to {}", screenshots_dir)

    logger.info("Logging initialized (level={})", config.log_level)
