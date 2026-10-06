/**
 * Drives the DEBUG app on a connected Android device or emulator through a full CBT attempt and the
 * Android-specific behaviour (hardware back button, background/resume, print dialog, share sheet).
 * Release builds cannot be automated because their WebView is not debuggable.
 *
 *   npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)
 *   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
 *   node scripts/android-smoke.mjs [screenshot-dir]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { _android as android } from '@playwright/test';

const PKG = 'com.netcbt.simulator';
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });

const [device] = await android.devices();
if (!device) throw new Error('No Android device or emulator found (adb devices).');
const shell = async (command) => (await device.shell(command)).toString().trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// The activity in the foreground ("mResumedActivity" before Android 10, "ResumedActivity:" after).
const resumed = async () =>
  (await shell('dumpsys activity activities')).match(
    /(?:mResumedActivity|ResumedActivity:|topResumedActivity=)[^{]*\{[^}]*?\s(\S+\/\S+)/,
  )?.[1] ?? '';
const check = (ok, message) => {
  if (!ok) throw new Error(`FAILED: ${message}`);
  console.log(`ok  ${message}`);
};
const capture = async (name) => {
  if (shots) writeFileSync(`${shots}/${name}.png`, await device.screenshot());
};

try {
  await shell(`pm clear ${PKG}`);
  await shell(`am start -W -n ${PKG}/.MainActivity`);
  const webview = await device.webView({ pkg: PKG });
  const page = await webview.page();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.getByRole('heading', { level: 1 }).first().waitFor();
  check(
    await page
      .getByText(/on this device/i)
      .first()
      .isVisible(),
    'dashboard says data stays on this device',
  );
  await capture('android-dashboard');

  // A seeded link generates its paper straight away.
  await page.evaluate(() => (location.hash = '#/new?type=engineering&seed=ANDROID1'));
  await page
    .getByRole('button', { name: /start test/i })
    .first()
    .click({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('checkbox', { name: /read and understood/i }).check();
  await page.getByRole('button', { name: 'Start Test' }).click();
  await page.getByText(/Question No :/).waitFor();
  check(
    (await page.getByText(/Question No :/).textContent()).includes('1 of 200'),
    'CBT terminal opens at question 1 of 200',
  );

  for (let i = 0; i < 3; i++) {
    await page.getByRole('radio', { name: `Option ${i + 1}` }).check();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: /^next$/i }).click();
  }
  await page.getByText('Attempted: 3/200').waitFor();
  check(true, 'saved answers are counted');
  await capture('android-cbt-terminal');

  await shell('input keyevent KEYCODE_BACK');
  await sleep(1500);
  check(
    await page.getByText(/Question No :/).isVisible(),
    'the back button does not leave a running test',
  );

  await shell('input keyevent KEYCODE_HOME');
  await sleep(4000);
  await shell(`am start -W -n ${PKG}/.MainActivity`);
  await sleep(1500);
  check(
    await page.getByText('Attempted: 3/200').isVisible(),
    'the test survives going to the background',
  );

  await page.getByRole('button', { name: /FINISH/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
  await page.getByText(/logged out of the test/).waitFor();
  await page.getByRole('link', { name: /view detailed result/i }).click();
  await page
    .getByText(/your score/i)
    .first()
    .waitFor();
  check(true, 'finishing the test shows the result');
  await capture('android-result');

  await shell('input keyevent KEYCODE_BACK');
  await sleep(1500);
  check(
    !(await page
      .getByText(/your score/i)
      .first()
      .isVisible()
      .catch(() => false)),
    'the back button navigates back outside a test',
  );

  await page.evaluate(() => (location.hash = '#/paper/ENG-ANDR-PRNT?type=engineering'));
  await page
    .getByText(/answer key/i)
    .first()
    .waitFor({ timeout: 60_000 });
  await page
    .getByRole('button', { name: /print|pdf/i })
    .first()
    .click();
  await sleep(3000);
  const printer = await resumed();
  await sleep(12_000); // let the print preview of the 200-question paper render
  await capture('android-print-dialog');
  check(
    /printspooler|print/i.test(printer),
    `printing opens the Android print dialog (${printer})`,
  );
  await shell('input keyevent KEYCODE_BACK');
  await sleep(2000);

  await page.evaluate(() => (location.hash = '#/history'));
  await page
    .getByRole('button', { name: /export/i })
    .first()
    .click();
  await sleep(3000);
  const sharer = await resumed();
  await capture('android-share-sheet');
  check(
    /chooser|intentresolver|resolver/i.test(sharer),
    `history export opens the share sheet (${sharer})`,
  );
  await shell('input keyevent KEYCODE_BACK');

  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  console.log('Android smoke test passed.');
} finally {
  await device.close();
}
