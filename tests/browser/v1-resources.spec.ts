import {test,expect,type Page} from '@playwright/test';
const headers={Authorization:'Bearer core-pass-browser'};
async function create(page:Page,name:string){
 await page.getByRole('button',{name:'Find / Ctrl K',exact:true}).click();
 await page.getByRole('dialog',{name:'Open workspace resource'}).getByRole('button',{name:'New '+name,exact:true}).click();
}
test('native dbt, catalog charts, pipeline tasks, model/SCD and durable resource views',async({page,request})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#token=core-pass-browser');
 await page.getByLabel('New workspace name',{exact:true}).fill('V1 native resource journey');
 await page.getByRole('button',{name:/Free coding canvas/}).click();
 await expect(page.getByLabel('Open workspace')).not.toHaveValue('');
 const wid=await page.getByLabel('Open workspace').inputValue();
 const saved=async()=>(await request.get(`/api/workspaces/${wid}`,{headers})).json();
 await create(page,'dbt project');
 await page.getByRole('button',{name:'Run dbt build',exact:true}).click();
 const evidence=page.getByRole('region',{name:'Workspace local execution evidence'});
 await expect(evidence.locator('strong')).toHaveText('success',{timeout:90000});
 await page.locator('.an-file-tree').getByRole('button',{name:/fct_sales.sql/}).click();
 await page.getByRole('tab',{name:'Compiled SQL',exact:true}).click();
 await expect(page.getByLabel('Local dbt compiled SQL')).toContainText('select');
 await page.getByRole('button',{name:'Lineage view',exact:true}).click();
 await expect(page.getByLabel('Lineage direction')).toBeVisible();
 const catalogResponse=await request.get(`/api/workspaces/${wid}/catalog`,{headers});
 const catalog=await catalogResponse.json();
 expect(catalogResponse.ok(),JSON.stringify(catalog)).toBeTruthy();
 expect(catalog.some((a:any)=>a.name==='warehouse.fct_sales'&&a.row_count===8)).toBeTruthy();
 await create(page,'Chart board');
 await page.getByRole('button',{name:'Run SQL on shared catalog',exact:true}).click();
 await expect(evidence.locator('strong')).toHaveText('success');
 await page.getByRole('button',{name:'Use result in board',exact:true}).click();
 await expect(page.getByText('Verified local query snapshot',{exact:true})).toBeVisible();
 await expect(page.getByRole('img',{name:/Revenue over time, bar chart/})).toBeVisible();
 await page.getByRole('button',{name:'Save workspace',exact:true}).click();
 await expect.poll(async()=>((await saved()).workbench.resources.find((r:any)=>r.kind==='chart-board'&&r.board.snapshot.origin==='real_local')?.board.snapshot.rows.length)).toBe(8);
 await create(page,'Pipeline Lab');
 await page.getByRole('button',{name:'Run saved pipeline',exact:true}).click();
 await expect(evidence.locator('strong')).toHaveText('success');
 await expect(page.locator('.dp-task-runs tbody tr')).toHaveCount(2);
 await expect(page.locator('.dp-task-runs')).toContainText('valid_orders');
 await create(page,'Data model / SCD');
 await expect(page.locator('.an-model-table')).toHaveCount(3);
 await page.getByRole('button',{name:'DDL preview',exact:true}).click();
 await expect(page.getByLabel('Schema DDL preview')).toContainText('CREATE TABLE');
 await page.getByRole('button',{name:'SCD 1 / 2 / 3',exact:true}).click();
 for(const type of [1,2,3]){
  await page.getByRole('button',{name:new RegExp('Type '+type)}).click();
  await page.getByLabel('SCD event step').focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('button',{name:'Previous event',exact:true})).toBeEnabled();
 }
 await page.getByRole('button',{name:'Save workspace',exact:true}).click();
 await expect.poll(async()=>((await saved()).workbench.resources.filter((r:any)=>r.kind==='model-design').at(-1)?.scd.type)).toBe(3);
 const before=await saved();await page.reload();
 await expect(page.getByRole('button',{name:'SCD 1 / 2 / 3',exact:true})).toBeVisible();
 expect((await saved()).workbench.resources).toEqual(before.workbench.resources);
 await page.screenshot({path:'qa/qualification/native-resources.png',fullPage:true});
 expect(errors).toEqual([]);
});

test('Arena pipeline Run/Submit grades DAG design and persists attempts',async({page,request})=>{
 await page.goto('/#token=core-pass-browser');
 await page.getByLabel('Arena',{exact:true}).click();
 await page.locator('.case-card').filter({has:page.getByRole('heading',{name:'Gate publication on data quality',exact:true})}).getByRole('button',{name:'Open exercise',exact:true}).click();
 await page.getByRole('button',{name:'Use plain editor',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'python cell source',exact:true});
 await page.locator('.dp-run-actions').getByRole('button',{name:'Run',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Run: passed',exact:true})).toBeVisible();
 await page.locator('.dp-run-actions').getByRole('button',{name:'Submit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Submit: failed',exact:true})).toBeVisible();
 await editor.fill((await editor.inputValue()).replace('extract >> publish','extract >> check >> publish'));
 await page.locator('.dp-run-actions').getByRole('button',{name:'Submit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Submit: passed',exact:true})).toBeVisible();
 await expect(page.getByLabel('Open workspace')).not.toHaveValue('');
 const wid=await page.getByLabel('Open workspace').inputValue();
 const attempts=await (await request.get(`/api/workspaces/${wid}/attempts`,{headers})).json();
 expect(attempts).toHaveLength(2);expect(attempts[0].truth).toBe('design-only');
 expect(attempts[0].checks[1].expected).toBeUndefined();
 const doc=await (await request.get(`/api/workspaces/${wid}`,{headers})).json();
 expect(doc.runs).toHaveLength(0);
});

test('imported notebook executes real SQL, pandas and Polars; guided Run stays unavailable',async({page,request})=>{
 await page.goto('/#token=core-pass-browser');
 await page.getByRole('button',{name:/Free coding canvas/}).click();
 await expect(page.getByLabel('Shared notebook layout')).toBeVisible();
 await expect(page.getByLabel('Open workspace')).not.toHaveValue('');
 const wid=await page.getByLabel('Open workspace').inputValue();
 const cells=[
  {id:'sql-proof',cell_type:'code',metadata:{datapass:{kernel:'sql'}},source:['SELECT 42 AS answer'],outputs:[],execution_count:null},
  {id:'pandas-proof',cell_type:'code',metadata:{datapass:{kernel:'python'}},source:['import pandas as pd\ndisplay(pd.DataFrame({"answer": [42]}))'],outputs:[],execution_count:null},
  {id:'polars-proof',cell_type:'code',metadata:{datapass:{kernel:'polars'}},source:['import polars as pl\ndisplay(pl.DataFrame({"answer": [42]}))'],outputs:[],execution_count:null},
 ];
 const file={nbformat:4,nbformat_minor:5,metadata:{kernelspec:{name:'python3',display_name:'Python 3',language:'python'}},cells};
 await page.locator('.command-bar input[type=file]').setInputFiles({name:'runtime-proof.ipynb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});
 await expect(page.getByText(/Imported without execution/)).toBeVisible();
 await page.getByRole('button',{name:'Run notebook',exact:true}).click();
 const saved=async()=>(await request.get(`/api/workspaces/${wid}`,{headers})).json();
 await expect.poll(async()=>((await saved()).runs.length)).toBe(3);
 const doc=await saved();
 expect(doc.runs.map((r:any)=>r.language)).toEqual(['sql','python','polars']);
 expect(doc.runs.every((r:any)=>r.status==='success'&&r.result.rows[0].answer===42)).toBeTruthy();
 await page.getByLabel('Arena',{exact:true}).click();
 await page.locator('.case-card').filter({has:page.getByRole('heading',{name:/Guided.*filter/i})}).getByRole('button',{name:'Open exercise',exact:true}).click();
 await expect(page.locator('.dp-guided-connection')).toContainText('Unavailable:');
 await expect(page.locator('.dp-run-actions').getByRole('button',{name:'Run',exact:true})).toBeDisabled();
 await expect(page.locator('.dp-run-actions').getByRole('button',{name:'Submit',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Run notebook',exact:true})).toBeDisabled();
});
