import os
import shutil
import tempfile

import pytest

from utils.config_manager import AdvancedConfigManager


class TestConfigSystem:
    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.config_manager = AdvancedConfigManager(self.temp_dir)

    def teardown_method(self):
        shutil.rmtree(self.temp_dir)

    def test_config_loading(self):
        config = self.config_manager.get_config_dict()
        assert 'streaming' in config
        assert 'system' in config

    def test_config_validation(self):
        invalid_data = {'target_fps': 100}
        errors = self.config_manager.validate_config('streaming', invalid_data)
        assert len(errors) > 0

    def test_config_update(self):
        new_fps = 15.0
        success = self.config_manager.update_config('streaming', target_fps=new_fps)
        assert success
        assert self.config_manager.streaming.target_fps == new_fps

    def test_config_backup(self):
        backup_path = self.config_manager.create_backup()
        assert backup_path is not None
        assert os.path.exists(backup_path)
