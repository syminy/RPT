import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from core.file_manager import FileManager as CoreFileManager, SignalMetadata
from utils.config_manager import get_config_manager

logger = logging.getLogger(__name__)


class FileManager:
    """配置感知的文件管理器包装器"""

    def __init__(self) -> None:
        self.config_manager = get_config_manager()
        self.config = self.config_manager.file_manager

        self._core_manager = CoreFileManager()
        self._base_path = Path(self.config.data_directory)
        self._core_manager.base_dir = self._base_path

        self._base_path.mkdir(parents=True, exist_ok=True)
        logger.info("File manager initialized with data directory: %s", self._base_path)

    def get_allowed_extensions(self) -> List[str]:
        return list(self.config.allowed_extensions)

    def validate_file_size(self, file_size: int) -> bool:
        return file_size <= self.config.max_file_size

    def get_data_directory(self) -> str:
        return str(self._base_path)

    def resolve_path(self, filename: str) -> Path:
        path = Path(filename)
        if not path.is_absolute():
            path = self._base_path / path
        return path

    def load_signal(self, filename: str) -> Tuple[Optional[np.ndarray], Optional[SignalMetadata]]:
        file_path = self.resolve_path(filename)
        return self._core_manager.load_signal(str(file_path))

    def list_files(self) -> List[Dict[str, object]]:
        files: List[Dict[str, object]] = []
        allowed = {ext.lower() for ext in self.config.allowed_extensions}

        for entry in self._base_path.iterdir():
            if entry.is_file() and entry.suffix.lower() in allowed:
                try:
                    stat = entry.stat()
                    files.append(
                        {
                            'name': entry.name,
                            'size': stat.st_size,
                            'modified': stat.st_mtime,
                            'path': str(entry),
                        }
                    )
                except OSError as exc:
                    logger.warning("Failed to stat file %s: %s", entry, exc)
        return files

    def cleanup_old_files(self) -> None:
        if not self.config.auto_cleanup:
            return

        max_age_seconds = max(0, int(self.config.cleanup_age_days)) * 24 * 3600
        if max_age_seconds <= 0:
            return

        now = time.time()
        for entry in self._base_path.iterdir():
            if not entry.is_file():
                continue
            try:
                file_age = now - entry.stat().st_mtime
                if file_age > max_age_seconds:
                    entry.unlink()
                    logger.info("Cleaned up old file: %s", entry.name)
            except Exception as exc:
                logger.error("Failed to cleanup file %s: %s", entry.name, exc)
