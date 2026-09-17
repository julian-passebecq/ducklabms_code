"""Start the single-user local service and print a token-bearing launch URL."""
from __future__ import annotations
import argparse
import os
import secrets
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description='Datapass Studio local root')
    parser.add_argument('--storage',choices=['auto','duckdb','ducklake','sqlite'],default='auto')
    parser.add_argument('--trusted-local-python',action='store_true',help='Enable arbitrary trusted Python in a local worker. NOT a secure sandbox.')
    parser.add_argument('--data-dir',default=str(Path(__file__).parent/'.local'/'workspaces'))
    args = parser.parse_args()
    token = secrets.token_urlsafe(32)
    os.environ['DATAPASS_TOKEN']=token
    os.environ['DATAPASS_STORAGE']=args.storage
    os.environ['DATAPASS_DATA_DIR']=args.data_dir
    os.environ['DATAPASS_TRUSTED_PYTHON']='1' if args.trusted_local_python else '0'
    print('\nDatapass Studio - LOCAL, SINGLE USER',flush=True)
    print(f'Open: http://127.0.0.1:8000/#token={token}',flush=True)
    print(f'React dev: http://127.0.0.1:5173/#token={token}',flush=True)
    print('If React is not built, port 8000 serves the explicitly labeled diagnostic client.',flush=True)
    if args.trusted_local_python:
        print('WARNING: trusted Python can access this computer as your OS user. Process separation is not sandboxing.',flush=True)
    import uvicorn
    uvicorn.run('apps.api.datapass.api:app',host='127.0.0.1',port=8000,workers=1)


if __name__=='__main__':
    main()
