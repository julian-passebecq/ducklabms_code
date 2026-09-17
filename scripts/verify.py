"""Run release gates without converting missing dependencies into a pass."""
from pathlib import Path
import argparse, importlib.util, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--engines',action='store_true');p.add_argument('--frontend',action='store_true');p.add_argument('--browser',action='store_true');args=p.parse_args()
if args.browser and not (args.frontend and args.engines):p.error('--browser requires --frontend and --engines')
if args.engines:
 for package in ('duckdb','polars'):
  if importlib.util.find_spec(package) is None:sys.exit(f'BLOCKED: real {package} is not installed. Install requirements-engines.txt.')
commands=[[sys.executable,'-m','pytest','-q'],['npm','test']]
if args.frontend:commands.extend([['npm','run','typecheck'],['npm','run','build']])
if args.browser:commands.append(['npm','run','test:browser'])
for command in commands:
 print('GATE: '+' '.join(command),flush=True)
 subprocess.run(command,cwd=ROOT,check=True,shell=sys.platform=='win32')
print('Requested gates passed. DuckLake and start.py startup are separate smoke gates.' if args.browser else 'Requested gates passed. This command does not certify browser or DuckLake behavior.')
