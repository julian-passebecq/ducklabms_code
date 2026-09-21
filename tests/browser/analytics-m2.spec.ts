import {test,expect} from '@playwright/test';
// External native React/Vite qualification. This is not the offline DOM harness.
test('M2 native preview keeps analytics and notebook source across save/reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?preview=2');
 const editor=page.getByRole('textbox',{name:'Source: 01 / Aggregate valid orders',exact:true});
 await editor.fill('SELECT 42 AS saved_m2;');
 const nav=page.getByRole('complementary',{name:'Analytics layers'});
 await nav.getByRole('button',{name:/dbt Studio/}).click();
 await page.getByLabel('dbt source editor',{exact:true}).fill('select 42 as saved_dbt;');
 await page.getByRole('button',{name:'Save notebook + views',exact:true}).click();
 await page.reload();
 await expect(page.getByLabel('dbt source editor',{exact:true})).toHaveValue('select 42 as saved_dbt;');
 await nav.getByRole('button',{name:/Notebook/}).click();
 await expect(editor).toHaveValue('SELECT 42 AS saved_m2;');
 await nav.getByRole('button',{name:/Charts/}).click();
 await page.getByRole('button',{name:'Split right',exact:true}).click();
 await nav.getByRole('button',{name:/Lineage/}).click();
 await expect(page.getByRole('region',{name:'Pane A',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Pane B',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Save notebook + views',exact:true}).click();
 await page.reload();
 await expect(page.locator('.an-pane')).toHaveCount(2);
 expect(errors).toEqual([]);
});
