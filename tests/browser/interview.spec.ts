import {test,expect} from '@playwright/test';

// Authored in the coding pass; execution is DEFERRED TO EXTERNAL QA.
test('standalone practice shares notebook, saves drafts and separates Run from Submit',async({page,request})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const headers={Authorization:'Bearer core-pass-browser'};
 await page.goto('/#token=core-pass-browser');
 await page.getByRole('button',{name:'Arena',exact:true}).click();
 const sum=page.locator('.case-card').filter({has:page.getByRole('heading',{name:'Sum with duplicates and NULL',exact:true})});
 await sum.getByRole('button').click();
 await page.getByText('Canvas presets, notebook skins and source tools',{exact:true}).click();
 await page.getByText('Review and advanced exercise actions',{exact:true}).click();
 await expect(page.getByRole('group',{name:'Notebook presentation'}).getByRole('button',{name:'Arena',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.monaco-editor')).toBeVisible();
 const id=await page.getByLabel('Open workspace').inputValue();
 const idle=()=>expect(page.getByRole('button',{name:'Save',exact:true})).toBeEnabled();
 const attempts=async()=>{const response=await request.get(`/api/workspaces/${id}/attempts`,{headers});return response.json()};
 const before=(await attempts()).length;
 await page.getByRole('button',{name:'Use plain editor',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'sql cell source',exact:true});
 await editor.fill('SELECT 5 AS total');
 await page.getByRole('button',{name:'Run visible checks',exact:true}).click();await idle();
 await expect(page.getByRole('heading',{name:'Run: passed',exact:true})).toBeVisible();
 expect((await attempts()).length).toBe(before);
 await page.locator('.practice-toolbar').getByRole('button',{name:'Submit',exact:true}).click();await idle();
 await expect(page.getByRole('heading',{name:'Submit: failed',exact:true})).toBeVisible();
 await editor.fill('SELECT COALESCE(SUM(value), 0) AS total FROM input');
 for(const layout of ['Notebook','Two-page','Code + explanation','2 + 1','Interview']){
  await page.getByRole('tab',{name:layout,exact:true}).click();
 }
 await page.locator('.practice-toolbar').getByRole('button',{name:'Submit',exact:true}).click();await idle();
 await expect(page.getByRole('heading',{name:'Submit: passed',exact:true})).toBeVisible();
 expect((await attempts())[0].source).toBe('SELECT COALESCE(SUM(value), 0) AS total FROM input');
 await page.getByRole('button',{name:'Reveal next hint',exact:true}).click();
 await page.getByRole('button',{name:'Reveal reference solution',exact:true}).click();await idle();
 await expect(page.locator('.lesson-pane').getByText('SELECT COALESCE(SUM(value), 0) AS total FROM input',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Save',exact:true}).click();await idle();
 await page.reload();await expect(page.locator('.monaco-editor')).toBeVisible();
 const doc=await (await request.get(`/api/workspaces/${id}`,{headers})).json();
 expect(doc.notebook.blockState['mosaic:v2:code:answer']).toBe('SELECT COALESCE(SUM(value), 0) AS total FROM input');
 await page.getByText('Canvas presets, notebook skins and source tools',{exact:true}).click();
 await page.getByText('Review and advanced exercise actions',{exact:true}).click();
 await page.getByRole('button',{name:'Reset exercise to starter',exact:true}).click();
 await page.getByRole('button',{name:'Undo operation',exact:true}).click();
 await page.getByRole('button',{name:'Save',exact:true}).click();await idle();
 // Browser file selection is driven directly; malformed imports must preserve source.
 await page.locator('.command-bar input[type=file]').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
 await idle();expect((await (await request.get(`/api/workspaces/${id}`,{headers})).json()).notebook.blockState).toEqual(doc.notebook.blockState);
 await page.setViewportSize({width:480,height:900});
 await expect(page.locator('.narrow-notebook')).toBeVisible();
 await page.screenshot({path:'qa/qualification/interview-pass-1-narrow.png',fullPage:true});
 expect(errors).toEqual([]);
});
