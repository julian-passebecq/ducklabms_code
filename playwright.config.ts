import {defineConfig} from '@playwright/test';
import path from 'node:path';

const port=process.env.DATAPASS_PORT??'8000';
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({
 testDir:'./tests/browser', workers:1, timeout:120_000,
 expect:{timeout:15_000}, reporter:[['list']],
 use:{actionTimeout:15000,baseURL,viewport:{width:1440,height:1000},trace:'retain-on-failure'},
 webServer:{
  command:`"${path.resolve(process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python')}" -m uvicorn apps.api.datapass.api:app --host 127.0.0.1 --port ${port}`,
  url:baseURL+'/api/health', reuseExistingServer:false,
  env:{DATAPASS_PORT:port,DATAPASS_TOKEN:'core-pass-browser',DATAPASS_STORAGE:'duckdb',DATAPASS_TRUSTED_PYTHON:'1',DATAPASS_TRUSTED_DBT:'1',DATAPASS_DATA_DIR:path.resolve('.local/browser-pass')},
 },
});


