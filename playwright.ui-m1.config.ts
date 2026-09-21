import {defineConfig} from '@playwright/test';

/** UI M1 qualification without Python, DuckDB, Spark, Oracle, dbt, or credentials.
 * Run npm ci && npm run build first. These browser tests were AUTHORED, not run here.
 */
export default defineConfig({
  testDir: './tests/browser', testMatch: 'ui-m1.spec.ts', workers: 1,
  timeout: 45_000, expect: {timeout: 10_000}, reporter: [['list']],
  use: {baseURL: 'http://127.0.0.1:4173', viewport: {width: 1440, height: 1000}, trace: 'retain-on-failure'},
  webServer: {
    command: 'npm exec --no --workspace apps/web -- vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/?preview=1', reuseExistingServer: false,
  },
});
