import {test, expect} from '@playwright/test';

// Uses the EXISTING Python webServer in playwright.config.ts, not the UI-only config.
// Authored but NOT EXECUTED in the constrained implementation environment.
test('UI M1 connected notebook preserves its chosen view and canonical source after reopen', async ({page, request}) => {
  const headers = {Authorization: 'Bearer core-pass-browser'};
  await page.goto('/#token=core-pass-browser');
  await page.getByRole('button', {name: /Free coding canvas/}).click();
  const modes = page.getByRole('group', {name: 'Notebook presentation'});
  await expect(modes.getByRole('button', {name: 'Canvas', exact: true})).toHaveAttribute('aria-pressed', 'true');
  const id = await page.getByLabel('Open workspace').inputValue();
  const get = async () => (await request.get(`/api/workspaces/${id}`, {headers})).json();
  const before = await get();
  await modes.getByRole('button', {name: 'Notebook', exact: true}).click();
  await page.getByRole('button', {name: 'Save notebook', exact: true}).click();
  await expect.poll(async () => (await get()).notebook.preferredView).toBe('notebook');
  await page.reload();
  await expect(modes.getByRole('button', {name: 'Notebook', exact: true})).toHaveAttribute('aria-pressed', 'true');
  const after = await get();
  expect(after.notebook.blocks.map((b: {id: string}) => b.id)).toEqual(before.notebook.blocks.map((b: {id: string}) => b.id));
  expect(after.notebook.blockState).toEqual(before.notebook.blockState);
  expect(after.runs).toEqual(before.runs);
});
