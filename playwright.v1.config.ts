/** Native production-shell proof; never the M1/M2 component harness. */
import {defineConfig} from '@playwright/test';
import path from 'node:path';
import {existsSync} from 'node:fs';
if(!existsSync(path.resolve('apps/web/dist/index.html')))throw new Error('BLOCKED: build the real React app with npm run build first. The diagnostic client is not a V1 browser pass.');
const python=process.env.DATAPASS_QA_PYTHON??path.resolve(process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
const port=process.env.DATAPASS_PORT??'8000';
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({
 testDir:'./tests/browser',testMatch:['v1-native.spec.ts','v1-resources.spec.ts','charts-roundtrip.spec.ts'],workers:1,timeout:120000,
 expect:{timeout:15000},reporter:[['list'],['json',{outputFile:'qa/qualification/native-browser.json'}]],
 use:{baseURL,viewport:{width:1600,height:1100},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:`"${python}" -m uvicorn apps.api.datapass.api:app --host 127.0.0.1 --port ${port}`,url:baseURL+'/api/health',reuseExistingServer:false,env:{DATAPASS_PORT:port,DATAPASS_TOKEN:'core-pass-browser',DATAPASS_STORAGE:process.env.DATAPASS_QA_STORAGE??'ducklake',DATAPASS_TRUSTED_PYTHON:'1',DATAPASS_TRUSTED_DBT:'1',DATAPASS_DATA_DIR:path.resolve('.local/v1-browser-proof')}}
});
