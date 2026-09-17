"""Exercise the actual HTTP server without pretending this is a browser UI test."""
import argparse,json
from pathlib import Path
import httpx
p=argparse.ArgumentParser();p.add_argument('--token',required=True);p.add_argument('--url',default='http://127.0.0.1:8000');args=p.parse_args()
checks=[]
with httpx.Client(base_url=args.url,headers={'Authorization':'Bearer '+args.token},timeout=30) as client:
 for path in ('/','/diagnostic-assets/app.js','/diagnostic-assets/style.css'):
  assert client.get(path).status_code==200;checks.append('serves '+path)
 cases=client.get('/api/cases').json();assert len(cases)==8;checks.append('eight case definitions over HTTP')
 w=client.post('/api/workspaces',json={'case_id':'retail-medallion'}).json();id=w['id']
 result=client.post(f'/api/workspaces/{id}/workflow',json={}).json()
 assert result['status']=='success',result
 assert result['runs'][-1]['result']['rows']==[{'total_revenue':4985.0,'valid_orders':10,'customers':5}]
 checks.append('full retail workflow executes in worker over HTTP')
 report=client.post(f'/api/workspaces/{id}/check',json={}).json();assert all(c['passed'] for c in report.values());checks.append('four result checks pass')
 code={'notebook_id':'case-notebook','cell_id':'clean','step_id':'clean','language':'sparklab','code':'from pyspark.sql import functions as F\nresult = spark.table("bronze.orders").filter(F.col("net_amount") > 10000)','output_asset':'silver.orders'}
 run=client.post(f'/api/workspaces/{id}/execute',json=code).json();assert run['status']=='success' and run['check']['passed'] is False;checks.append('edited wrong source fails result acceptance')
 report=client.post(f'/api/workspaces/{id}/check',json={}).json();assert report['aggregate']['passed'] is False;checks.append('downstream acceptance invalidated')
 before=client.get(f'/api/workspaces/{id}/catalog').json()
 client.post(f'/api/workspaces/{id}/restart',json={}).raise_for_status()
 after=client.get(f'/api/workspaces/{id}/catalog').json();assert before==after;checks.append('catalog persists through worker restart')
 report={'kind':'real local HTTP integration; not browser or React','passed':len(checks),'checks':checks}
 print(json.dumps(report,indent=2))
 (Path(__file__).resolve().parents[1]/'evidence/http-smoke.json').write_text(json.dumps(report,indent=2))
