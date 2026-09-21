"""Optional trusted-local CLI launcher. Dry-run by default; --execute is explicit.

No shell interpolation, server, scheduler, Docker, credential storage or package install.
The dbt project itself is executable code and is NOT sandboxed by this wrapper.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

def command(project: Path, action: str) -> tuple[list[str], Path]:
    root = project.expanduser().resolve()
    if not (root / 'dbt_project.yml').is_file():
        raise ValueError('Choose a local folder containing dbt_project.yml')
    if action in {'build', 'parse', 'test'}:
        if not (root / 'profiles.yml').is_file():
            raise ValueError('Local profiles.yml is required; generate it or configure it explicitly')
        return ['dbt', action, '--project-dir', str(root), '--profiles-dir', str(root), '--profile', 'datapass_retail'], root
    if action == 'charts-validate':
        return ['dct', 'validate', str(root / 'charts')], root
    if action == 'charts-render':
        if not (root / 'charts/revenue.yml').is_file():
            raise ValueError('Export a board to charts/revenue.yml first')
        return ['dct', 'render', str(root / 'charts/revenue.yml'), '--format', 'html'], root
    raise ValueError('Unsupported action')

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', required=True, type=Path)
    parser.add_argument('--action', choices=['parse', 'build', 'test', 'charts-validate', 'charts-render'], default='build')
    parser.add_argument('--execute', action='store_true', help='Run reviewed local project code as your OS user')
    args = parser.parse_args()
    try:
        argv, root = command(args.project, args.action)
        print(json.dumps({'command': argv, 'cwd': str(root), 'execute': args.execute}, indent=2), flush=True)
        if not args.execute:
            print('DRY RUN. Add --execute only after reviewing the local project. No process was launched.')
            return 0
        executable = shutil.which(argv[0])
        if not executable:
            raise ValueError(f'{argv[0]} is not installed in PATH. Install the optional dependency in your virtual environment.')
        print('Trusted local code: no sandbox. This process can read your files and use your configured credentials.', flush=True)
        completed = subprocess.run([executable, *argv[1:]], cwd=root, env={**os.environ, 'DBT_PROFILES_DIR': str(root)}, shell=False, timeout=600, check=False)
        return completed.returncode
    except (ValueError, OSError, subprocess.TimeoutExpired) as error:
        print(f'Not completed: {error}', file=sys.stderr)
        return 2
if __name__ == '__main__':
    raise SystemExit(main())
