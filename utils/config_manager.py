import json
import logging
import time
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class Theme(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"


class FFTWindow(str, Enum):
    HANN = "hann"
    HAMMING = "hamming"
    BLACKMAN = "blackman"
    RECTANGULAR = "rectangular"


@dataclass
class SecurityConfig:
    enable_authentication: bool = False
    secret_key: str = field(default_factory=lambda: "dev-secret-key-change-in-production")
    session_timeout: int = 3600
    cors_origins: List[str] = field(default_factory=lambda: ["*"])


@dataclass
class DatabaseConfig:
    enabled: bool = False
    connection_string: str = "sqlite:///rpt_data.db"
    backup_enabled: bool = True


@dataclass
class PerformanceConfig:
    max_workers: int = 4
    thread_pool_size: int = 10
    memory_limit_mb: int = 1024
    enable_caching: bool = True


@dataclass
class StreamingConfig:
    """流式处理配置"""
    target_fps: float = 10.0
    target_freq_resolution: float = 100.0
    max_chunk_size: int = 16384
    min_chunk_size: int = 256
    max_update_interval: float = 1.0
    min_update_interval: float = 0.05
    default_fft_size: int = 1024
    enable_dynamic_adjustment: bool = True
    overlap_ratio: float = 0.1


@dataclass
class VisualizationConfig:
    """可视化配置"""
    max_time_points: int = 2000
    max_freq_points: int = 800
    max_constellation_points: int = 2000
    fft_window: FFTWindow = FFTWindow.HANN
    spectral_averaging: bool = False
    chart_refresh_rate: int = 60
    show_frequency_crosshair: bool = True
    power_spectrum_y_min: float = -120.0
    power_spectrum_y_max: float = 20.0
    power_grid_enabled: bool = True
    power_ticks_enabled: bool = True
    eye_diagram_enabled: bool = True
    eye_diagram_samples_per_symbol: int = 8
    eye_diagram_window_symbols: float = 2.0
    eye_diagram_max_traces: int = 60
    eye_diagram_component: str = "iq"


@dataclass
class FileManagerConfig:
    data_directory: str = "./data"
    allowed_extensions: List[str] = field(
        default_factory=lambda: ['.h5', '.bin', '.dat', '.complex', '.raw', '.wav', '.csv', '.npy']
    )
    max_file_size: int = 1024 * 1024 * 1024
    auto_cleanup: bool = True
    cleanup_age_days: int = 30


@dataclass
class USRPConfig:
    default_ip: str = "192.168.10.2"
    default_sample_rate: float = 1e6
    default_center_freq: float = 100e6
    default_gain: float = 30.0
    max_channels: int = 2
    connection_timeout: int = 10


@dataclass
class SystemConfig:
    log_level: LogLevel = LogLevel.INFO
    log_file: str = "./logs/rpt_system.log"
    temp_directory: str = "./temp"
    max_memory_usage: int = 1024 * 1024 * 1024
    auto_save_config: bool = True


@dataclass
class UISettings:
    theme: Theme = Theme.LIGHT
    default_tab: str = "file-management"
    chart_animation: bool = True
    auto_refresh: bool = True
    refresh_interval: int = 5000


class AdvancedConfigManager:
    def __init__(self, config_dir: str = "./config"):
        self.config_dir = Path(config_dir)
        self.config_files = {
            'system': self.config_dir / "system_config.json",
            'user': self.config_dir / "user_settings.json"
        }

        # 初始化所有配置节
        self.security = SecurityConfig()
        self.database = DatabaseConfig()
        self.performance = PerformanceConfig()
        self.streaming = StreamingConfig()
        self.visualization = VisualizationConfig()
        self.file_manager = FileManagerConfig()
        self.usrp = USRPConfig()
        self.system = SystemConfig()
        self.ui = UISettings()

        # 设置验证规则
        self.validation_rules = self._setup_validation_rules()

        # 确保目录存在
        self.config_dir.mkdir(exist_ok=True)

        # 加载配置
        self.load_all_configs()

    def _setup_validation_rules(self):
        return {
            'streaming': {
                'target_fps': {'min': 1, 'max': 60, 'type': float},
                'target_freq_resolution': {'min': 1, 'max': 10000, 'type': float},
                'max_chunk_size': {'min': 64, 'max': 65536, 'type': int},
                'min_chunk_size': {'min': 16, 'max': 65536, 'type': int},
                'max_update_interval': {'min': 0.01, 'max': 5.0, 'type': float},
                'min_update_interval': {'min': 0.001, 'max': 2.0, 'type': float},
                'default_fft_size': {'min': 64, 'max': 65536, 'type': int},
                'overlap_ratio': {'min': 0.0, 'max': 0.9, 'type': float},
            },
            'performance': {
                'max_workers': {'min': 1, 'max': 32, 'type': int},
                'memory_limit_mb': {'min': 128, 'max': 32768, 'type': int}
            }
        }

    def validate_config(self, section: str, config_data: Dict[str, Any]) -> List[str]:
        errors = []
        if section in self.validation_rules:
            for key, rules in self.validation_rules[section].items():
                if key in config_data:
                    value = config_data[key]
                    expected_type = rules.get('type')

                    # resolve expected Python type
                    python_type = None
                    if isinstance(expected_type, str):
                        type_name = expected_type.lower()
                        if type_name in ('float', 'number'):
                            python_type = float
                        elif type_name in ('int', 'integer'):
                            python_type = int
                    elif isinstance(expected_type, type):
                        python_type = expected_type

                    if python_type is float:
                        if not isinstance(value, (int, float)):
                            errors.append(f"{key} must be a number")
                            continue
                        else:
                            try:
                                value = float(value)
                            except Exception:
                                errors.append(f"{key} must be a number")
                                continue
                    elif python_type is int:
                        if isinstance(value, bool):
                            errors.append(f"{key} must be an integer")
                            continue
                        if not isinstance(value, (int, float)):
                            errors.append(f"{key} must be an integer")
                            continue
                        try:
                            if int(value) != value:
                                errors.append(f"{key} must be an integer")
                                continue
                            value = int(value)
                        except Exception:
                            errors.append(f"{key} must be an integer")
                            continue
                    elif python_type and not isinstance(value, python_type):
                        errors.append(f"{key} must be {python_type.__name__}")
                        continue

                    config_data[key] = value

                    if 'min' in rules and value < rules['min']:
                        errors.append(f"{key} must be >= {rules['min']}")
                    elif 'max' in rules and value > rules['max']:
                        errors.append(f"{key} must be <= {rules['max']}")
        return errors

    def load_all_configs(self):
        try:
            # 加载系统配置
            if self.config_files['system'].exists():
                with open(self.config_files['system'], 'r', encoding='utf-8') as f:
                    system_data = json.load(f)
                    self.system = SystemConfig(**system_data)

            # 加载用户设置
            if self.config_files['user'].exists():
                with open(self.config_files['user'], 'r', encoding='utf-8') as f:
                    user_data = json.load(f)
                    self._load_section_configs(user_data)

            logger.info("All configurations loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load configurations: {e}")
            self._create_default_configs()

    def _load_section_configs(self, user_data: Dict[str, Any]):
        config_mapping = {
            'streaming': StreamingConfig,
            'visualization': VisualizationConfig,
            'file_manager': FileManagerConfig,
            'usrp': USRPConfig,
            'ui': UISettings,
            'performance': PerformanceConfig,
            'database': DatabaseConfig,
            'security': SecurityConfig
        }

        for section, config_class in config_mapping.items():
            if section in user_data:
                try:
                    setattr(self, section, config_class(**user_data[section]))
                except Exception as e:
                    logger.warning(f"Failed to load {section} config: {e}")

    def save_all_configs(self):
        try:
            # 保存系统配置
            with open(self.config_files['system'], 'w', encoding='utf-8') as f:
                json.dump(asdict(self.system), f, indent=2, ensure_ascii=False)

            # 保存用户设置
            user_settings = {
                'streaming': asdict(self.streaming),
                'visualization': asdict(self.visualization),
                'file_manager': asdict(self.file_manager),
                'usrp': asdict(self.usrp),
                'ui': asdict(self.ui),
                'performance': asdict(self.performance),
                'database': asdict(self.database),
                'security': asdict(self.security)
            }

            with open(self.config_files['user'], 'w', encoding='utf-8') as f:
                json.dump(user_settings, f, indent=2, ensure_ascii=False)

            logger.info("All configurations saved successfully")

        except Exception as e:
            logger.error(f"Failed to save configurations: {e}")

    def _create_default_configs(self):
        logger.info("Creating default configurations")
        self.save_all_configs()

    def update_config(self, section: str, **kwargs):
        try:
            if hasattr(self, section):
                config_obj = getattr(self, section)
                current_dict = asdict(config_obj)
                current_dict.update(kwargs)

                config_class = type(config_obj)
                setattr(self, section, config_class(**current_dict))

                if self.system.auto_save_config:
                    self.save_all_configs()

                logger.info(f"Updated {section} configuration")
                return True
            else:
                logger.error(f"Unknown configuration section: {section}")
                return False

        except Exception as e:
            logger.error(f"Failed to update {section} configuration: {e}")
            return False

    def get_config_dict(self, section: str = None) -> Dict[str, Any]:
        if section:
            if hasattr(self, section):
                return asdict(getattr(self, section))
            else:
                return {}
        else:
            return {
                'system': asdict(self.system),
                'streaming': asdict(self.streaming),
                'visualization': asdict(self.visualization),
                'file_manager': asdict(self.file_manager),
                'usrp': asdict(self.usrp),
                'ui': asdict(self.ui),
                'performance': asdict(self.performance),
                'database': asdict(self.database),
                'security': asdict(self.security)
            }

    def reset_to_defaults(self, section: str = None):
        if section == 'system' or section is None:
            self.system = SystemConfig()
        if section == 'streaming' or section is None:
            self.streaming = StreamingConfig()
        if section == 'visualization' or section is None:
            self.visualization = VisualizationConfig()
        if section == 'file_manager' or section is None:
            self.file_manager = FileManagerConfig()
        if section == 'usrp' or section is None:
            self.usrp = USRPConfig()
        if section == 'ui' or section is None:
            self.ui = UISettings()
        if section == 'performance' or section is None:
            self.performance = PerformanceConfig()
        if section == 'database' or section is None:
            self.database = DatabaseConfig()
        if section == 'security' or section is None:
            self.security = SecurityConfig()

        self.save_all_configs()
        logger.info(f"Reset {section or 'all'} configurations to defaults")

    def create_backup(self, backup_name: str = None):
        if backup_name is None:
            backup_name = f"config_backup_{int(time.time())}"

        backup_dir = self.config_dir / "backups"
        backup_dir.mkdir(exist_ok=True)

        backup_file = backup_dir / f"{backup_name}.json"

        try:
            all_configs = self.get_config_dict()
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(all_configs, f, indent=2, ensure_ascii=False)

            logger.info(f"Configuration backup created: {backup_file}")
            return str(backup_file)
        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            return None


default_config_manager: Optional['AdvancedConfigManager'] = None


def get_config_manager() -> AdvancedConfigManager:
    global default_config_manager
    if default_config_manager is None:
        default_config_manager = AdvancedConfigManager()
    return default_config_manager
