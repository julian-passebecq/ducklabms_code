import {test, expect} from '@playwright/test';

// Production React 19/Vite qualification: AUTHORED; DEFERRED TO EXTERNAL QA.
// This is distinct from the executed local React 16 DOM compatibility harness.
test('UI M1 preview edits one source across layouts and never calls the API', async ({page}) => {
  const errors: string[] = [], apiRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());});
  await page.goto('/?preview=1');
  const modes = page.getByRole('group', {name: 'Notebook presentation'});
  await expect(page.getByTestId('notebook-desktop')).toHaveCount(1);
  await expect(page.getByRole('button', {name: 'Run all', exact: true})).toBeDisabled();
  const source = page.getByRole('textbox', {name: 'Source: 01 / Aggregate valid orders', exact: true});
  await source.fill('SELECT 42 AS value;');
  await modes.getByRole('button', {name: 'Canvas', exact: true}).click();
  await expect(source).toHaveValue('SELECT 42 AS value;');
  await page.getByRole('button', {name: 'Resize 01 / Aggregate valid orders', exact: true}).focus();
  await page.keyboard.press('ArrowDown');
  await modes.getByRole('button', {name: 'Notebook', exact: true}).click();
  await expect(source).toHaveValue('SELECT 42 AS value;');
  await page.getByRole('button', {name: 'Move explorer to the other side', exact: true}).click();
  await expect(page.locator('.dp-right-slot .dp-explorer')).toBeVisible();
  await page.getByRole('button', {name: 'Save notebook', exact: true}).click();
  await expect(page.getByText('UI fixture notebook sources saved in this browser.', {exact: false})).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.entries(localStorage).some(([key, value]) => key.startsWith('datapass:desktop:v1:') && JSON.parse(value).explorerSide === 'right'))).toBe(true);
  await page.reload();
  await expect(source).toHaveValue('SELECT 42 AS value;');
  await expect(page.locator('.dp-right-slot .dp-explorer')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export notebook', exact: true}).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('m1-explore.json');
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('UI M1 arena keeps answers while switching fixtures and works on a narrow screen', async ({page}) => {
  await page.goto('/?preview=1');
  const nav = page.getByRole('navigation', {name: 'Preview fixtures'});
  await nav.getByRole('button', {name: 'SQL arena', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Run', exact: true})).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Submit', exact: true})).toBeDisabled();
  const answer = page.getByRole('textbox', {name: 'Source: Your solution', exact: true});
  await answer.fill('SELECT customer_id FROM source.orders;');
  await nav.getByRole('button', {name: 'Python arena', exact: true}).click();
  await answer.fill('def solve(rows):');
  await answer.press('End'); await answer.press('Enter');
  await expect(answer).toHaveValue('def solve(rows):\n    ');
  await nav.getByRole('button', {name: 'SQL arena', exact: true}).click();
  await expect(answer).toHaveValue('SELECT customer_id FROM source.orders;');
  await page.getByRole('tab', {name: 'Hints', exact: true}).click();
  await page.getByRole('button', {name: 'Reveal hint', exact: true}).click();
  await expect(page.getByText('Filter before aggregating.', {exact: false})).toBeVisible();
  await page.setViewportSize({width: 430, height: 932});
  await page.getByRole('button', {name: 'Toggle explorer', exact: true}).click();
  await expect(page.locator('.dp-mobile-explorer')).toBeVisible();
  await page.getByRole('button', {name: 'Close explorer', exact: true}).click();
  await expect(page.locator('.dp-mobile-explorer')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
