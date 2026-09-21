import {defineConfig} from '@playwright/test';
// AUTHORED for external QA against the actual production build; not executed here.
export default defineConfig({
 testDir:'./tests/browser',testMatch:'analytics-m2.spec.ts',workers:1,timeout:45000,
 use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1500,height:1050},trace:'retain-on-failure'},
 webServer:{command:'npm exec --no --workspace apps/web -- vite preview --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173/?preview=2',reuseExistingServer:false},
});
