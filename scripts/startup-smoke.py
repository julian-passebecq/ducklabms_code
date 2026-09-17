"""Verify the real local launcher and HTTP Retail path; never log its token."""
from pathlib import Path
import os
import queue
import re
import subprocess
import sys
import tempfile
import threading
import time

import httpx

ROOT = Path(__file__).resolve().parents[1]


def main():
    with tempfile.TemporaryDirectory(prefix='datapass-startup-') as directory:
        process = subprocess.Popen(
            [sys.executable, 'start.py', '--storage', 'duckdb', '--data-dir', directory],
            cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
        )
        lines = queue.Queue()
        def read():
            for line in process.stdout:
                lines.put(line)
        threading.Thread(target=read, daemon=True).start()
        try:
            deadline = time.monotonic() + 30
            token = None
            while time.monotonic() < deadline:
                try:
                    line = lines.get(timeout=1)
                except queue.Empty:
                    continue
                match = re.search(r'Open: http://127.0.0.1:8000/#token=(\S+)', line)
                if match:
                    token = match.group(1)
                    break
            assert token, 'Launcher did not print the local launch URL.'
            with httpx.Client(base_url='http://127.0.0.1:8000', headers={'Authorization':'Bearer '+token}) as client:
                while True:
                    try:
                        client.get('/api/health').raise_for_status()
                        break
                    except httpx.TransportError:
                        if time.monotonic() > deadline:
                            raise
                        time.sleep(.1)
                html = client.get('/').text
                assert '/assets/' in html and 'type="module"' in html, 'Production React bundle required.'
                smoke = subprocess.run([sys.executable,'scripts/http-smoke.py','--token',token,'--storage','duckdb'],cwd=ROOT)
                if smoke.returncode:
                    raise RuntimeError('HTTP smoke failed; launch token omitted from error.')
                # Stop workers before terminating the Windows launcher process.
                for workspace in client.get('/api/workspaces').json():
                    client.post(f"/api/workspaces/{workspace['id']}/restart").raise_for_status()
            print('PASS: start.py --storage duckdb, authenticated HTTP, production React assets, Retail workflow on '+sys.platform)
        finally:
            process.terminate()
            process.wait(timeout=10)
            process.stdout.close()


if __name__ == '__main__':
    main()
