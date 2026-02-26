"""TOML-based configuration with sensible defaults."""

from __future__ import annotations

import sys
from dataclasses import dataclass, field, fields, asdict
from pathlib import Path
from typing import Any

from loguru import logger

if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib

import tomli_w


_DEFAULT_DATA_DIR = Path.home() / ".elden-watcher"
_CONFIG_FILENAME = "config.toml"


@dataclass
class Config:
    """Watcher configuration with sensible defaults."""

    api_url: str = ""
    api_key: str = ""
    capture_fps: int = 10
    game_process: str = "eldenring.exe"
    process_poll_interval: float = 2.0
    debug_screenshots: bool = False
    log_level: str = "INFO"
    data_dir: Path = field(default_factory=lambda: _DEFAULT_DATA_DIR)

    def __post_init__(self) -> None:
        if isinstance(self.data_dir, str):
            self.data_dir = Path(self.data_dir)


def load_config(path: Path | None = None) -> Config:
    """Load configuration from TOML file.

    If the file doesn't exist, creates it with defaults and returns default config.

    Args:
        path: Path to config file. Defaults to ~/.elden-watcher/config.toml.

    Returns:
        Config instance with loaded or default values.
    """
    if path is None:
        path = _DEFAULT_DATA_DIR / _CONFIG_FILENAME

    config = Config()

    if path.exists():
        try:
            with open(path, "rb") as f:
                data = tomllib.load(f)
            # Apply loaded values over defaults
            for fld in fields(Config):
                if fld.name in data:
                    value = data[fld.name]
                    if fld.name == "data_dir":
                        value = Path(value)
                    setattr(config, fld.name, value)
            logger.info("Config loaded from {}", path)
        except Exception as exc:
            logger.warning("Failed to load config from {}: {}. Using defaults.", path, exc)
    else:
        # Create config file with defaults
        path.parent.mkdir(parents=True, exist_ok=True)
        _write_config(config, path)
        logger.info("Default config created at {}", path)

    # Ensure data directory exists
    config.data_dir.mkdir(parents=True, exist_ok=True)

    return config


def _write_config(config: Config, path: Path) -> None:
    """Write config to TOML file."""
    data: dict[str, Any] = {}
    for fld in fields(Config):
        value = getattr(config, fld.name)
        if isinstance(value, Path):
            value = str(value)
        data[fld.name] = value

    with open(path, "wb") as f:
        tomli_w.dump(data, f)
