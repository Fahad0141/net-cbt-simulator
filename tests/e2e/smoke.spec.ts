import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('dashboard, about and bank pages render', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('./#/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/not affiliated/i).first()).toBeVisible();

    await page.goto('./#/about');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    await page.goto('./#/bank?subject=mathematics');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('a full CBT attempt: generate, answer with Save, finish, see the result', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // A link with a seed generates its paper straight away.
    await page.goto('./#/new?type=engineering&seed=E2ETEST1');
    const start = page.getByRole('button', { name: /start test/i }).first();
    await expect(start).toBeVisible({ timeout: 60_000 });
    await start.click();

    // Terminal: login -> instructions -> paper.
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('checkbox', { name: /read and understood/i }).check();
    await page.getByRole('button', { name: 'Start Test' }).click();
    await expect(page.getByText(/Question No :/)).toContainText('1 of 200');

    // An unsaved selection is lost when moving on.
    await page.getByRole('radio', { name: 'Option 1' }).check();
    await page.getByRole('button', { name: /^next$/i }).click();
    await page.getByRole('button', { name: /^prev$/i }).click();
    await expect(page.getByRole('radio', { name: 'Option 1' })).not.toBeChecked();

    // Saved answers count.
    for (let i = 0; i < 3; i++) {
      await page.getByRole('radio', { name: `Option ${i + 1}` }).check();
      await page.getByRole('button', { name: 'Save' }).click();
      await page.getByRole('button', { name: /^next$/i }).click();
    }
    await expect(page.getByText('Attempted: 3/200')).toBeVisible();

    // Survives a reload mid-paper.
    await page.reload();
    await expect(page.getByText('Attempted: 3/200')).toBeVisible();

    await page.getByRole('button', { name: /FINISH/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
    await expect(page.getByText(/logged out of the test/)).toBeVisible();
    await page.getByRole('link', { name: /view detailed result/i }).click();
    await expect(page.getByText(/200/).first()).toBeVisible();
  });

  test('printable paper renders 200 questions', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('./#/paper/ENG-E2E0-PRNT?type=engineering');
    await expect(page.getByText(/answer key/i).first()).toBeVisible({ timeout: 60_000 });
  });
});
