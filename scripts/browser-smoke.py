"""Real browser/API smoke test for the explicitly labeled offline diagnostic client.
Does not certify the unbuilt React bundle. Start local API with the test token first.
"""
from pathlib import Path
import json, os, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1060},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/#token=diagnostic-test-token')
 page.locator('#case-grid .case-card').first.wait_for()
 assert page.locator('#case-grid .case-card').count()==8
 checks.append('eight API-defined case cards')
 page.select_option('#cases','retail-medallion')
 page.click('#create')
 page.locator('#workspace').wait_for(state='visible')
 page.wait_for_function("document.querySelector('#engine').textContent==='sqlite'")
 checks.append('explicit SQLite compatibility label')
 page.click('#workflow')
 page.wait_for_function("document.querySelector('#message').textContent.startsWith('Workflow success')")
 assert '4985' in page.locator('#result').inner_text()
 checks.append('retail workflow produces 4985 revenue from shared real tables')
 page.click('#check')
 page.wait_for_function("document.querySelector('#case-status').textContent.includes('4 / 4')")
 checks.append('four result-based checks pass')
 page.screenshot(path=str(ROOT/'evidence/diagnostic-kpi.png'),full_page=True)
 # Open the transformation step, verify actual source is editable and output belongs to it.
 page.locator('#steps button').nth(1).click()
 assert 'spark.table' in page.locator('#code').input_value()
 page.screenshot(path=str(ROOT/'evidence/diagnostic-notebook.png'),full_page=True)
 page.locator('[data-layout=pages]').click()
 assert page.locator('#notebook').get_attribute('class')=='layout-pages'
 checks.append('diagnostic layout change preserves source')
 page.locator('#code').fill('from pyspark.sql import functions as F\nresult = spark.table("bronze.orders").filter(F.col("net_amount") > 10000)')
 page.click('#run')
 page.wait_for_function("document.querySelector('#message').textContent==='Cell executed against the shared catalog.'")
 assert 'ACCEPTANCE PASSED' not in page.locator('#result').inner_text()
 checks.append('edited wrong transformation does not pass acceptance')
 page.click('#check')
 page.wait_for_function("document.querySelector('#case-status').textContent!=='4 / 4 checks passed'")
 checks.append('upstream mutation invalidates downstream acceptance')
 # Diagnose narrow screen, not the unbuilt React UI.
 page.set_viewport_size({'width':720,'height':1000})
 page.screenshot(path=str(ROOT/'evidence/diagnostic-narrow.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
 checks.append('diagnostic narrow viewport has no document overflow')
 assert not errors,errors
 checks.append('no browser JavaScript errors')
 browser.close()
(ROOT/'evidence/browser-smoke.json').write_text(json.dumps({'client':'offline diagnostic HTML, NOT React','passed':len(checks),'checks':checks,'browser_errors':errors},indent=2))
print(json.dumps({'passed':len(checks),'checks':checks},indent=2))
