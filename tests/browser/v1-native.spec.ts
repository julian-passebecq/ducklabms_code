import {test,expect} from '@playwright/test';
// Authored native test: its results are meaningful only after a real production build.
test('native shell: one canonical figure, independent panes, persisted skins and source',async({page,request})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#token=core-pass-browser');
 await expect(page.locator('.dp-appearance')).toBeVisible();
 await page.getByRole('button',{name:/Free coding canvas/}).click();
 const root=page.locator('section[aria-label="Modular workbench"]');
 await expect(root).toBeVisible();
 const wid=await page.getByLabel('Open workspace').inputValue();
 const headers={Authorization:'Bearer core-pass-browser'};
 const saved=async()=>(await request.get(`/api/workspaces/${wid}`,{headers})).json();
 await page.keyboard.press('Control+k');
 await page.getByRole('dialog',{name:'Open workspace resource'}).getByRole('button',{name:'New ConceptMotion',exact:true}).click();
 await root.getByLabel('Canonical resource title').fill('Shared join figure');
 await root.getByRole('button',{name:'Split right',exact:true}).click();
 await expect(root.locator('.foundation-pane')).toHaveCount(2);
 await expect(root.getByLabel('Canonical resource title')).toHaveCount(2);
 await root.getByLabel('Canonical resource title').last().fill('Canonical join');
 await expect(root.getByLabel('Canonical resource title').first()).toHaveValue('Canonical join');
 await root.getByRole('button',{name:'Focus pane',exact:true}).last().click();
 await expect(root.locator('.foundation-pane')).toHaveCount(1);
 await root.getByRole('button',{name:'Show all panes',exact:true}).click();
 await expect(root.locator('.foundation-pane')).toHaveCount(2);
 for(const theme of ['fluent','neutral','dark']){
  await root.getByLabel('Workbench theme').selectOption(theme);
  await expect(page.locator('.dp-appearance')).toHaveAttribute('data-theme',theme);
 }
 for(const skin of ['studio','fabric','databricks','arena']){
  await root.getByLabel('Experience skin').selectOption(skin);
  await expect(page.locator('.dp-appearance')).toHaveAttribute('data-skin',skin);
 }
 await root.getByRole('button',{name:'Save workspace',exact:true}).click();
 await expect.poll(async()=>{const d=await saved();return d.workbench?.ui?.skin}).toBe('arena');
 const before=await saved(),figures=before.workbench.resources.filter((r:{kind:string})=>r.kind==='figure');
 expect(figures).toHaveLength(1);
 expect(before.workbench.views.filter((v:{resource_id:string})=>v.resource_id===figures[0].id)).toHaveLength(2);
 await page.reload();
 await expect(page.locator('.dp-appearance')).toHaveAttribute('data-theme','dark');
 await expect(root.getByLabel('Canonical resource title').first()).toHaveValue('Canonical join');
 await root.getByRole('button',{name:'Close pane',exact:true}).last().click();
 await root.getByRole('button',{name:'Save workspace',exact:true}).click();
 await expect.poll(async()=>{const d=await saved();return d.workbench.panes.length}).toBe(1);
 const after=await saved();expect(after.workbench.resources).toEqual(before.workbench.resources);
 expect(after.runs).toEqual(before.runs);expect(after.notebook.blockState).toEqual(before.notebook.blockState);
 await page.screenshot({path:'qa/qualification/native-primary-journey.png',fullPage:true});
 expect(errors).toEqual([]);
});
