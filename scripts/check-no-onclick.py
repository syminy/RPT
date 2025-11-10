#!/usr/bin/env python3
"""
Check for inline onclick handlers in templates and static files.
Ignores data-old-onclick attributes (preserved fallbacks).
"""

import os
import re
import sys
from pathlib import Path

def scan_for_inline_onclick(root_dir="."):
    """Scan for inline onclick handlers, ignoring data-old-onclick."""
    root_path = Path(root_dir)
    patterns = [
        "**/*.html",
        "**/*.js",
        "**/*.jsx",
        "**/*.ts",
        "**/*.tsx"
    ]
    
    # Ignore node_modules, .git, and other non-source directories
    ignore_dirs = {
        "node_modules", ".git", "backups", "__pycache__", 
        ".venv", "venv", "dist", "build"
    }
    
    inline_onclick_pattern = re.compile(r'(?<!data-old-)onclick\s*=\s*["\'][^"\']*["\']')
    occurrences = []
    
    for pattern in patterns:
        for file_path in root_path.glob(pattern):
            # Skip ignored directories
            if any(ignore in str(file_path) for ignore in ignore_dirs):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.split('\n')
                    
                    for line_num, line in enumerate(lines, 1):
                        if inline_onclick_pattern.search(line):
                            occurrences.append({
                                'file': str(file_path),
                                'line': line_num,
                                'content': line.strip()
                            })
            except (UnicodeDecodeError, IOError):
                # Skip binary files or unreadable files
                continue
    
    return occurrences


def main():
    root_dir = os.getcwd()
    occurrences = scan_for_inline_onclick(root_dir)
    
    if occurrences:
        print(f"Found {len(occurrences)} inline onclick occurrences:")
        for occ in occurrences:
            print(f"  {occ['file']}:{occ['line']} - {occ['content'][:100]}...")
        print("\nPlease replace with data-action delegation or comment/backup.")
        sys.exit(1)
    else:
        print("No inline onclick occurrences found.")
        sys.exit(0)

if __name__ == "__main__":
    main()
