// Bounded browser smoke only. The inherited release suite remains external QA.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'@playwright/test');
import {writeFileSync,mkdirSync} from 'node:fs';
const output='verification/foundation-pass-1';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1800,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const checks=[];
const ensure=(condition,message)=>{if(!condition)throw new Error(message);checks.push(message)};
try{
 await page.goto('http://127.0.0.1:8000/#token=foundation-smoke');
 await page.getByLabel('New case study',{exact:true}).selectOption('retail-medallion');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByText('Notebook and workbench checkpoints saved to the shared workspace.').waitFor();
 await page.getByRole('button',{name:'Workbench',exact:true}).click();
 await page.getByRole('region',{name:'Modular workbench',exact:true}).waitFor();
 const links=page.locator('.foundation-resources details').filter({hasText:'Link existing notebook'});
 await links.locator('summary').click();await links.getByRole('button').first().click();
 await page.getByRole('button',{name:'Split pane',exact:true}).click();
 ensure(await page.locator('.foundation-pane').count()===2,'Two pane layout opened');
 ensure(await page.locator('.foundation-live-notebook').count()===1,'Exactly one live notebook editor across duplicate views');
 ensure(await page.locator('.foundation-notebook-preview').count()===1,'Second notebook pane is reference-only preview');
 await page.getByRole('button',{name:'Workflow example',exact:true}).click();
 await page.getByTestId('foundation-graph').waitFor();
 await page.getByRole('button',{name:'Add task',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.react-flow__node').length===3);
 ensure(await page.locator('.react-flow__node').count()===3,'Workflow graph contains added task');
 await page.getByLabel('Resource title',{exact:true}).fill('Delivery workflow');
 await page.getByRole('button',{name:'Split pane',exact:true}).click();
 await page.getByRole('button',{name:'Lineage example',exact:true}).click();
 ensure(await page.getByTestId('foundation-graph').count()===2,'One shared canvas renderer handles workflow and lineage');
 await page.getByRole('button',{name:'Save workspace',exact:true}).click();
 await page.getByText('Notebook and workbench checkpoints saved to the shared workspace.').waitFor();
 const saved=await page.evaluate(async()=>{const headers={Authorization:'Bearer foundation-smoke'};const list=await fetch('/api/workspaces',{headers}).then(r=>r.json());return fetch('/api/workspaces/'+list[0].id,{headers}).then(r=>r.json())});
 ensure(saved.workbench.resources.filter(r=>r.kind==='notebook').length===1,'Saved resource registry contains one canonical notebook reference');
 ensure(saved.workbench.resources.find(r=>r.title==='Delivery workflow').tasks.length===3,'Authored workflow changes persisted');
 ensure(saved.runs.length===0,'Design editing and save did not execute a kernel');
 await page.reload();await page.getByRole('button',{name:'Workbench',exact:true}).click();
 await page.getByRole('region',{name:'Modular workbench',exact:true}).waitFor();
 ensure(await page.locator('.foundation-pane').count()===3,'Three-pane layout restored after reload');
 await page.locator('.foundation').screenshot({path:output+'/workbench-smoke.png'});
 ensure(errors.length===0,'No browser page errors in bounded smoke');
 writeFileSync(output+'/browser-smoke.json',JSON.stringify({status:'passed',scope:'targeted Chromium / SQLite local compatibility',browser_version:browser.version(),playwright_module:process.env.PLAYWRIGHT_MODULE??'@playwright/test',checks,errors},null,2));
 console.log(JSON.stringify({status:'passed',checks,errors},null,2));
}catch(e){
 await page.screenshot({path:output+'/browser-failure.png',fullPage:true});
 writeFileSync(output+'/browser-smoke.json',JSON.stringify({status:'failed',checks,errors,failure:String(e)},null,2));throw e;
}finally{await browser.close()}
