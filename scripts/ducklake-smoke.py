"""Explicit opt-in real DuckLake smoke test; failure is not a successful fallback.
Install the DuckDB package and make the ducklake extension available first.
Set DATAPASS_INSTALL_DUCKLAKE=1 only when extension download is authorized.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from apps.api.datapass.execution import Engine
with TemporaryDirectory() as directory:
 p=Path(directory)
 e=Engine(p,'ducklake')
 try:
  result=e.workflow({'case_id':'retail-medallion','notebook_id':'n'})
  assert result['status']=='success',result
  assert e.capabilities()['ducklake_active'] is True
 finally:e.catalog.close()
 files=list((p/'lake-files').rglob('*.parquet'))
 assert files,'No actual Parquet file evidence found in the DuckLake data path.'
 reopened=Engine(p,'ducklake')
 try:
  rows=reopened.catalog.query('SELECT SUM(revenue) AS revenue FROM gold.customer_revenue')['rows']
  assert rows==[{'revenue':4985.0}],rows
 finally:reopened.catalog.close()
 print('Real DuckLake attach/write/Parquet/reopen passed. Files:',len(files))
