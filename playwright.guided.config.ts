/** Explicit live-service proof, separate from offline/local browser gates. */
import {defineConfig} from '@playwright/test';
import path from 'node:path';
const endpoint=process.env.DATAPASS_GUIDED_SPARK_QA_URL;
if(!endpoint)throw new Error('Set DATAPASS_GUIDED_SPARK_QA_URL for deliberate live qualification.');
const port=process.env.DATAPASS_PORT??'18080';
const baseURL=`http://127.0.0.1:${port}`;
const python=process.env.DATAPASS_QA_PYTHON??path.resolve(process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
export default defineConfig({
 testDir:'./tests/browser',testMatch:'guided-live.spec.ts',workers:1,timeout:120000,
 expect:{timeout:15000},reporter:[['list'],['json',{outputFile:'qa/qualification/guided-live-browser.json'}]],
 use:{baseURL,viewport:{width:1600,height:1100},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:`"${python}" -m uvicorn apps.api.datapass.api:app --host 127.0.0.1 --port ${port}`,
  url:baseURL+'/api/health',reuseExistingServer:false,
  env:{DATAPASS_PORT:port,DATAPASS_GUIDED_SPARK_URL:endpoint,DATAPASS_TOKEN:'core-pass-browser',DATAPASS_STORAGE:'ducklake',DATAPASS_TRUSTED_PYTHON:'1',DATAPASS_TRUSTED_DBT:'1',DATAPASS_DATA_DIR:path.resolve('.local/guided-live-proof')}}
});
