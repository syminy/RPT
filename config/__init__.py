"""Configuration package shim used during tests and CI.

This minimal package provides a small `settings` module with lightweight
dataclasses used across the codebase. It's intentionally small and safe for
unit tests and CI smoke runs. If the project provides a more complete
configuration in other branches, this file is merely a fallback to keep
headless tests running during the refactor branch work.
"""

__all__ = ["settings"]
