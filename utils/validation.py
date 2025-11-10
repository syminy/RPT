import re
from pathlib import Path


class ConfigValidator:
    @staticmethod
    def validate_ip_address(ip: str) -> bool:
        pattern = r'^([0-9]{1,3}\.){3}[0-9]{1,3}$'
        if not re.match(pattern, ip):
            return False

        parts = ip.split('.')
        for part in parts:
            if not 0 <= int(part) <= 255:
                return False
        return True

    @staticmethod
    def validate_directory_path(path: str) -> bool:
        try:
            path_obj = Path(path)
            return path_obj.is_dir() or not path_obj.exists()
        except Exception:
            return False
