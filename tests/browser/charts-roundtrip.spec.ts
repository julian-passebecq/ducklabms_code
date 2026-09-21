import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('Charts YAML imports as design, executes locally, and exports a replayable board',async({page,request})=>{
 await page.goto('/#token=core-pass-browser');
 await page.getByRole('button',{name:/Free coding canvas/}).click();
 await expect(page.getByLabel('Open workspace')).not.toHaveValue('');
 const wid=await page.getByLabel('Open workspace').inputValue();
 await page.getByRole('button',{name:'Find / Ctrl K',exact:true}).click();
 await page.getByRole('dialog',{name:'Open workspace resource'}).getByRole('button',{name:'New Chart board',exact:true}).click();
 const yaml=`title: Imported revenue
source: db
queries:
  revenue: SELECT 'Jan' AS month, CAST(12.34 AS DECIMAL(10,2)) AS revenue
charts:
  bar:
    query: revenue
    type: bar
    x: month
    y: revenue
rows: [bar]
`;
 const upload=page.getByLabel('Import dbt Charts YAML',{exact:true});
 await upload.setInputFiles({name:'board.yml',mimeType:'application/yaml',buffer:Buffer.from(yaml)});
 await expect(page.getByLabel('Board title')).toHaveValue('Imported revenue');
 await expect(page.getByText('Imported result snapshot',{exact:true})).toBeVisible();
 const jobs=await request.get(`/api/workspaces/${wid}/jobs`,{headers:{Authorization:'Bearer core-pass-browser'}});
 expect(jobs.ok()).toBeTruthy();expect(await jobs.json()).toEqual([]);
 const evidence=page.getByRole('region',{name:'Workspace local execution evidence'});
 await page.getByRole('button',{name:'Run SQL on shared catalog',exact:true}).click();
 await expect(evidence.locator('strong')).toHaveText('success');
 await page.getByRole('button',{name:'Use result in board',exact:true}).click();
 await expect(page.getByRole('img',{name:/Imported revenue, bar chart/})).toBeVisible();
 const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export dbt Charts YAML',exact:true}).click();
 const downloaded=await pending;const text=readFileSync((await downloaded.path())!,'utf8');
 expect(text).toContain('type: bar');expect(text).toContain('SELECT');
 await upload.setInputFiles({name:'roundtrip.yml',mimeType:'application/yaml',buffer:Buffer.from(text)});
 await expect(page.getByText('Imported result snapshot',{exact:true})).toBeVisible();
 await expect(page.getByRole('img',{name:/Imported revenue, bar chart/})).toHaveCount(0);
 const previous=await page.getByLabel('Select local run').inputValue();
 await page.getByRole('button',{name:'Run SQL on shared catalog',exact:true}).click();
 await expect(page.getByLabel('Select local run')).not.toHaveValue(previous);
 await expect(evidence.locator('strong')).toHaveText('success');
 await page.getByRole('button',{name:'Use result in board',exact:true}).click();
 await expect(page.getByRole('img',{name:/Imported revenue, bar chart/})).toBeVisible();
 await page.screenshot({path:'qa/qualification/charts-yaml-roundtrip.png',fullPage:true});
});
