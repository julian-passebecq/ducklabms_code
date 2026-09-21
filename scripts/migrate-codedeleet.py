"""Convert a verified JSON export into a disabled pack for human content review."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from apps.api.datapass.codedeleet_adapter import migrate_pack

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('destination', type=Path)
parser.add_argument('--id', required=True)
parser.add_argument('--version', required=True)
args = parser.parse_args()
result = migrate_pack(json.loads(args.source.read_text(encoding='utf-8')),args.id,args.version,str(args.source))
args.destination.mkdir(parents=True, exist_ok=False)
for name,key in [('manifest','manifest'),('exercises','exercises'),('grading.server','grading'),('migration-report','report')]:
    (args.destination/(name+'.json')).write_text(json.dumps(result[key],indent=2)+'\n',encoding='utf-8')
