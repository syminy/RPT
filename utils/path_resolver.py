from pathlib import Path

from utils.config_manager import get_config_manager


class PathResolver:
    def __init__(self):
        self.config_manager = get_config_manager()

    def resolve_data_path(self, relative_path: str = "") -> Path:
        base_path = Path(self.config_manager.file_manager.data_directory)
        if relative_path:
            return base_path / relative_path
        return base_path

    def resolve_temp_path(self, filename: str = "") -> Path:
        base_path = Path(self.config_manager.system.temp_directory)
        base_path.mkdir(exist_ok=True)
        if filename:
            return base_path / filename
        return base_path

    def ensure_directories(self):
        directories = [
            self.resolve_data_path(),
            self.resolve_temp_path(),
            Path(self.config_manager.system.log_file).parent,
            self.config_manager.config_dir / "backups",
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
