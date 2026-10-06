/**
 * Captures README screenshots from the production build.
 *
 *   npm run build && npm run preview -- --port 4173 --strictPort &
 *   node scripts/screenshots.mjs [baseUrl]
 *
 * Writes PNGs into docs/screenshots/.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const out = new URL('../docs/screenshots/', import.meta.url);
mkdirSync(out, { recursive: true });
const shot = (page, name) =>
  page.screenshot({ path: new URL(`${name}.png`, out).pathname.replace(/^\/(\w:)/, '$1') });

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 820 },
    colorScheme: 'light',
  });
  const page = await context.newPage();

  await page.goto(`${base}/#/`);
  await page.waitForLoadState('networkidle');
  await shot(page, 'dashboard');

  // A seeded link generates a reproducible engineering paper straight away; take the CBT tour.
  await page.goto(`${base}/#/new?type=engineering&seed=README01`);
  await page
    .getByRole('button', { name: /start test/i })
    .first()
    .waitFor({ timeout: 60_000 });
  await shot(page, 'paper-generator');
  await page
    .getByRole('button', { name: /start test/i })
    .first()
    .click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('checkbox', { name: /read and understood/i }).check();
  await page.getByRole('button', { name: 'Start Test' }).click();
  await page.getByText(/Question No :/).waitFor();

  // Answer like a typical candidate (7 right, 2 wrong, 1 skipped in every 10 of the first 150),
  // reading the key from the saved session so the result and review pages look realistic.
  const correct = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('net-cbt:active-session') ?? 'null');
    return session?.paper?.questions?.map((q) => q.correct) ?? [];
  });
  const choice = (i) => {
    const key = correct[i] ?? 0;
    return i % 10 < 7 ? key : i % 10 < 9 ? (key + 1 + (i % 3)) % 4 : -1;
  };
  await page.getByRole('radio', { name: `Option ${choice(0) + 1}` }).check();
  await page.waitForTimeout(400);
  await shot(page, 'cbt-terminal');

  for (let i = 0; i < 150; i++) {
    const option = choice(i);
    if (option >= 0) {
      await page.getByRole('radio', { name: `Option ${option + 1}` }).check();
      await page.getByRole('button', { name: 'Save' }).click();
    }
    await page.getByRole('button', { name: /^next$/i }).click();
  }
  await page.getByRole('button', { name: /FINISH/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
  await page.getByRole('link', { name: /view detailed result/i }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await shot(page, 'result');

  await page
    .getByRole('link', { name: /review answers/i })
    .first()
    .click();
  await page.waitForTimeout(800);
  await shot(page, 'review');

  await page.goto(`${base}/#/paper/ENG-READ-ME01?type=engineering`);
  await page.waitForTimeout(3000);
  await shot(page, 'printable-paper');

  await page.goto(`${base}/#/bank?subject=physics`);
  await page.waitForTimeout(2500);
  await shot(page, 'question-bank');

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  await phone.goto(`${base}/#/`);
  await phone.waitForLoadState('networkidle');
  await shot(phone, 'mobile-dashboard');
  console.log('Screenshots written to docs/screenshots/');
} finally {
  await browser.close();
}
