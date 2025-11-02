"""Configuration module for the file cleaner utility.

This module defines the :class:`CleanerConfig` dataclass which holds all
runtime configuration options.  It also provides a helper to construct a
configuration instance from parsed ``argparse`` arguments and a default
configuration instance that can be imported by other modules.
"""

from __future__ import annotations

import os
import argparse
from dataclasses import dataclass, field
from typing import List, Optional


def _default_target_path() -> str:
    """Return the default target path – the current working directory.

    Using a function ensures the value is evaluated at import time, which is
    appropriate for a default that should reflect the process's cwd when the
    module is first imported.
    """
    return os.getcwd()


@dataclass
class CleanerConfig:
    """Configuration for the file cleaner.

    Attributes
    ----------
    target_path: str
        Path to clean. Defaults to the current working directory.
    dry_run: bool
        If ``True`` only simulate deletions.
    backup: bool
        Enable backup before deletion.
    backup_dir: str
        Directory where backups are stored. Defaults to ``<target_path>/backup``.
    exclude_patterns: List[str]
        Glob patterns to exclude from cleaning.
    log_file: str
        Path to the log file. Defaults to ``<target_path>/file_cleaner.log``.
    confirm: bool
        Require user confirmation before performing actions.
    """

    target_path: str = field(default_factory=_default_target_path)
    dry_run: bool = False
    backup: bool = False
    backup_dir: Optional[str] = None
    exclude_patterns: List[str] = field(
        default_factory=lambda: [".git", "README.md", "*.pyc", "__pycache__"]
    )
    log_file: Optional[str] = None
    confirm: bool = True

    def __post_init__(self) -> None:
        # Resolve dependent defaults after all fields have been initialised.
        if self.backup_dir is None:
            self.backup_dir = os.path.join(self.target_path, "backup")
        if self.log_file is None:
            self.log_file = os.path.join(self.target_path, "file_cleaner.log")


def load_config_from_args(args: argparse.Namespace) -> CleanerConfig:
    """Create a :class:`CleanerConfig` instance from parsed CLI arguments.

    Parameters
    ----------
    args: argparse.Namespace
        The namespace returned by ``argparse.ArgumentParser.parse_args``.

    Returns
    -------
    CleanerConfig
        Configuration populated with values from ``args`` where provided,
        falling back to defaults for any missing attributes.
    """
    # ``getattr`` with a default of ``None`` allows us to distinguish between
    # arguments that were omitted (``None``) and those explicitly set to a
    # falsy value such as ``False`` or an empty string.
    cfg_kwargs = {
        "target_path": getattr(args, "target_path", None),
        "dry_run": getattr(args, "dry_run", None),
        "backup": getattr(args, "backup", None),
        "backup_dir": getattr(args, "backup_dir", None),
        "exclude_patterns": getattr(args, "exclude_patterns", None),
        "log_file": getattr(args, "log_file", None),
        "confirm": getattr(args, "confirm", None),
    }

    # Filter out ``None`` values so that the dataclass defaults are used.
    filtered_kwargs = {k: v for k, v in cfg_kwargs.items() if v is not None}
    return CleanerConfig(**filtered_kwargs)


# Export a default configuration instance for modules that need a quick
# reference without parsing command‑line arguments.
DEFAULT_CONFIG = CleanerConfig()
