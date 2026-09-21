import {test,expect} from '@playwright/test';

test('live guided Spark qualifies, enables Run and Submit, and persists truthful evidence',async({page,request})=>{
 test.skip(!process.env.DATAPASS_GUIDED_SPARK_QA_URL,'Explicit live service QA opt-in required');
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#token=core-pass-browser');
 await page.getByLabel('Arena',{exact:true}).click();
 await page.locator('.case-card').filter({has:page.getByRole('heading',{name:'Guided Spark: filter valid retail orders',exact:true})}).getByRole('button',{name:'Open exercise',exact:true}).click();
 const connection=page.locator('.dp-guided-connection');
 const run=page.locator('.dp-run-actions').getByRole('button',{name:'Run',exact:true});
 const submit=page.locator('.dp-run-actions').getByRole('button',{name:'Submit',exact:true});
 await expect(run).toBeDisabled();
 await connection.getByRole('checkbox').check();
 await connection.getByRole('button',{name:'Verify and enable this lesson',exact:true}).click();
 await expect(connection).toContainText('Protocol qualified.',{timeout:30000});
 await expect(run).toBeEnabled();await expect(submit).toBeEnabled();
 await page.getByRole('button',{name:'Use plain editor',exact:true}).click();
 await page.getByRole('textbox',{name:'sparklab cell source',exact:true}).fill('df = spark.table("orders")\ndf = df.filter("net_amount > 0")\ndf = df.select("order_id", "customer_id", "net_amount")');
 await run.click();await expect(page.getByRole('heading',{name:'Run: passed',exact:true})).toBeVisible({timeout:30000});
 await submit.click();await expect(page.getByRole('heading',{name:'Submit: passed',exact:true})).toBeVisible({timeout:30000});
 const wid=await page.getByLabel('Open workspace').inputValue();
 const headers={Authorization:'Bearer core-pass-browser'};
 const attempts=await (await request.get(`/api/workspaces/${wid}/attempts`,{headers})).json();
 expect(attempts).toHaveLength(1);expect(attempts[0].status).toBe('passed');
 expect(attempts[0].checks.filter((c:any)=>c.visibility!=='visible').every((c:any)=>c.actual===undefined&&c.expected===undefined)).toBeTruthy();
 const doc=await (await request.get(`/api/workspaces/${wid}`,{headers})).json();
 expect(doc.runs).toHaveLength(2);
 for(const result of doc.runs){
  expect(result.guided_evidence.physical_engine).toBe('duckdb');
  expect(result.guided_evidence.execution_id).toMatch(/^dps_[0-9a-f]{16}$/);
  expect(result.guided_evidence.metrics.disclaimer.toLowerCase()).toContain('simulat');
  expect(result.result.rows).toHaveLength(2);
 }
 await page.screenshot({path:'qa/qualification/guided-live-browser.png',fullPage:true});
 await connection.getByRole('checkbox').uncheck();await expect(run).toBeDisabled();
 expect(errors).toEqual([]);
});
