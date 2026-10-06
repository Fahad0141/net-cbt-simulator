/**
 * Drives the UNPACKED Windows desktop app (desktop/release/win-unpacked) through a full CBT attempt
 * and the desktop-specific behaviour: the app:// origin, the preload marker and wording, no
 * service worker, the clipboard, history export and import, external links, the single-instance
 * lock, and a test that survives closing and relaunching the app. It runs with a throw-away
 * profile (NETCBT_USER_DATA_DIR), so your own history is never touched, and it never runs the
 * installer.
 *
 *   npm run desktop:dist        (or: npm run build && npm --prefix desktop run pack)
 *   npm run desktop:smoke [screenshot-dir]
 *
 * It also refreshes docs/screenshots/desktop-cbt.png.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exe = join(root, 'desktop', 'release', 'win-unpacked', 'NET CBT Simulator.exe');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const shots = process.argv[2] ? resolve(process.argv[2]) : null;
if (shots) mkdirSync(shots, { recursive: true });

if (!existsSync(exe)) {
  console.error(`${exe} not found. Build it first: npm run desktop:dist`);
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'netcbt-desktop-smoke-'));
const env = { ...process.env, NETCBT_USER_DATA_DIR: profile };
delete env.ELECTRON_RUN_AS_NODE;

const errors = [];
const check = (ok, message) => {
  if (!ok) throw new Error(`FAILED: ${message}`);
  console.log(`ok  ${message}`);
};
const capture = async (page, name) => {
  if (shots) await page.screenshot({ path: join(shots, `${name}.png`) });
};

async function launch() {
  const app = await electron.launch({ executablePath: exe, env, timeout: 60_000 });
  const page = await app.firstWindow();
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
  });
  // The page's beforeunload is answered by the app's own dialog (will-prevent-unload), not by a
  // page dialog; this listener only stops Playwright from handling it itself.
  page.on('dialog', (dialog) => void dialog.accept().catch(() => {}));
  await page.waitForLoadState('domcontentloaded');
  return { app, page };
}

/** Answers the app's "Leave the test?" question with `button` (0 Close, 1 Keep working). */
const answerLeaveQuestion = (app, button) =>
  app.evaluate(({ dialog }, choice) => {
    globalThis.__asked ??= 0;
    dialog.showMessageBoxSync = () => {
      globalThis.__asked += 1;
      return choice;
    };
  }, button);

/** Closes the window the way a user does (title bar X), so the window state is saved. */
async function closeApp(app) {
  const closed = app.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
  await closed;
}

let app;
try {
  ({ app } = await launch());
  let page = await app.firstWindow();

  // --- Shell: origin, security, window -------------------------------------------------------
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  const info = await page.evaluate(async () => ({
    href: location.href,
    origin: location.origin,
    marker: window.netcbtDesktop,
    nodeGlobals: typeof require !== 'undefined' || typeof process !== 'undefined',
    canPrint: typeof window.print === 'function',
    serviceWorkers: navigator.serviceWorker
      ? (await navigator.serviceWorker.getRegistrations().catch(() => [])).length
      : 0,
  }));
  check(
    info.href.startsWith('app://bundle/'),
    `the app is served from app://bundle/ (${info.href})`,
  );
  check(info.origin === 'app://bundle', `the page has a stable origin (${info.origin})`);
  check(
    info.marker?.platform === 'desktop' && info.marker?.version === version,
    `the preload marker says desktop ${version}`,
  );
  check(!info.nodeGlobals, 'the page has no Node.js globals (sandbox, context isolation)');
  check(info.canPrint, 'window.print is available for the printable paper');
  check(info.serviceWorkers === 0, 'no service worker is registered');

  const shell = await app.evaluate(({ BrowserWindow, Menu, screen }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const items = [];
    const walk = (menu) =>
      menu?.items.forEach((item) => {
        items.push(item.role || item.label);
        walk(item.submenu);
      });
    walk(Menu.getApplicationMenu());
    return {
      windows: BrowserWindow.getAllWindows().length,
      title: win.getTitle(),
      size: win.getSize(),
      workArea: screen.getPrimaryDisplay().workAreaSize,
      minSize: win.getMinimumSize(),
      menuAutoHide: win.isMenuBarAutoHide(),
      prefs: win.webContents.getLastWebPreferences?.() ?? null,
      menu: items.map((i) => String(i).toLowerCase()),
    };
  });
  check(/NET CBT Simulator/.test(shell.title), `window title (${shell.title})`);
  // 1280x820, or smaller to fit the screen's work area (1366x768 laptops).
  const expected = [
    Math.max(960, Math.min(1280, shell.workArea.width)),
    Math.max(600, Math.min(820, shell.workArea.height)),
  ];
  check(
    shell.size[0] === expected[0] && shell.size[1] === expected[1],
    `default window size ${expected.join('x')} (${shell.size.join('x')})`,
  );
  check(shell.minSize[0] === 960 && shell.minSize[1] === 600, 'minimum window size 960x600');
  check(shell.menuAutoHide, 'the menu bar is hidden until Alt is pressed');
  for (const role of ['copy', 'paste', 'zoomin', 'zoomout', 'resetzoom', 'togglefullscreen']) {
    check(shell.menu.includes(role), `the menu has ${role}`);
  }
  check(!shell.menu.includes('toggledevtools'), 'no developer tools menu in the packaged app');
  if (shell.prefs) {
    check(
      shell.prefs.contextIsolation === true &&
        shell.prefs.nodeIntegration === false &&
        shell.prefs.sandbox === true,
      'contextIsolation on, nodeIntegration off, sandbox on',
    );
  }

  check(
    await page
      .getByText(/on this computer/i)
      .first()
      .isVisible(),
    'the dashboard says data stays on this computer',
  );
  check(
    (await page.getByText(/in this browser/i).count()) === 0,
    'the dashboard does not talk about "this browser"',
  );
  await capture(page, 'desktop-dashboard');

  // --- Keyboard: zoom and full screen -------------------------------------------------------
  // Real key presses (through Electron's input pipeline, like the keyboard; Playwright's own
  // key presses go straight to the page and skip the app's shortcuts).
  const press = async (keyCode, modifiers = []) => {
    await app.evaluate(
      ({ BrowserWindow }, key) => {
        const contents = BrowserWindow.getAllWindows()[0].webContents;
        contents.sendInputEvent({
          type: 'keyDown',
          keyCode: key.keyCode,
          modifiers: key.modifiers,
        });
        contents.sendInputEvent({ type: 'keyUp', keyCode: key.keyCode, modifiers: key.modifiers });
      },
      { keyCode, modifiers },
    );
    await page.waitForTimeout(300);
  };
  const zoomLevel = () =>
    app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.getZoomLevel(),
    );
  await press('=', ['control']);
  const zoomedIn = await zoomLevel();
  await press('-', ['control']);
  await press('-', ['control']);
  const zoomedOut = await zoomLevel();
  await press('0', ['control']);
  const zoomReset = await zoomLevel();
  check(
    zoomedIn > 0 && zoomedOut < 0 && zoomReset === 0,
    `Ctrl+= / Ctrl+- / Ctrl+0 zoom (${zoomedIn}, ${zoomedOut}, ${zoomReset})`,
  );
  const fullScreen = () =>
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen());
  await press('F11');
  await page.waitForTimeout(800);
  const enteredFullScreen = await fullScreen();
  await press('F11');
  await page.waitForTimeout(800);
  check(enteredFullScreen && !(await fullScreen()), 'F11 toggles full screen');

  // --- A full CBT attempt ---------------------------------------------------------------------
  await page.evaluate(() => (location.hash = '#/new?type=engineering&seed=DESKTOP1'));
  const start = page.getByRole('button', { name: /start test/i }).first();
  await start.waitFor({ timeout: 60_000 });

  // The clipboard works on the app:// origin (copying the paper code).
  await page.getByRole('button', { name: /^copy paper code/i }).click();
  await page.getByText('Paper code copied.').waitFor();
  const clip = await app.evaluate(({ clipboard }) => clipboard.readText());
  check(/^ENG-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clip), `the paper code is copied (${clip})`);
  const shareButton = page.getByRole('button', { name: /copy share (link|message)/i });
  await shareButton.click();
  const shared = await app.evaluate(({ clipboard }) => clipboard.readText());
  check(!shared.includes('app://'), 'a shared paper never points at app://');

  await start.click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('checkbox', { name: /read and understood/i }).check();
  await page.getByRole('button', { name: 'Start Test' }).click();
  await page.getByText(/Question No :/).waitFor();
  check(
    (await page.getByText(/Question No :/).textContent()).includes('1 of 200'),
    'the CBT terminal opens at question 1 of 200',
  );
  for (let i = 0; i < 3; i++) {
    await page.getByRole('radio', { name: `Option ${i + 1}` }).check();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: /^next$/i }).click();
  }
  await page.getByText('Attempted: 3/200').waitFor();
  check(true, 'saved answers are counted (Attempted: 3/200)');
  mkdirSync(join(root, 'docs', 'screenshots'), { recursive: true });
  // The documentation screenshot shows the whole terminal at 1280x860, even on a small screen.
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1280, 860),
  );
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: join(root, 'docs', 'screenshots', 'desktop-cbt.png'),
    fullPage: true,
  });
  await capture(page, 'desktop-cbt-terminal');

  // A second launch only brings the open window to the front.
  const second = spawn(exe, [], { env, stdio: 'ignore' });
  const secondExit = await new Promise((resolveExit, reject) => {
    const timer = setTimeout(() => reject(new Error('the second instance did not exit')), 30_000);
    second.on('exit', (code) => {
      clearTimeout(timer);
      resolveExit(code);
    });
  });
  const windowsAfter = await app.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
  );
  check(
    secondExit === 0 && windowsAfter === 1,
    'a second launch exits and keeps the single window (single-instance lock)',
  );

  // --- Close and relaunch: the test is still there ------------------------------------------
  // Closing mid-test asks first; "Keep working" keeps the window open.
  await answerLeaveQuestion(app, 1);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
  await page.waitForTimeout(1500);
  const kept = await app.evaluate(({ BrowserWindow }) => ({
    asked: globalThis.__asked,
    windows: BrowserWindow.getAllWindows().length,
  }));
  check(
    kept.asked === 1 && kept.windows === 1,
    'closing during a test asks first, and "Keep working" keeps the window',
  );
  await answerLeaveQuestion(app, 0);
  await closeApp(app);
  check(existsSync(join(profile, 'window-state.json')), 'the window size and position are saved');
  ({ app } = await launch());
  page = await app.firstWindow();
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.evaluate(() => (location.hash = '#/exam'));
  await page.getByText('Attempted: 3/200').waitFor({ timeout: 30_000 });
  check(true, 'the test survives closing and relaunching the app');

  await page.getByRole('button', { name: /FINISH/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
  await page.getByText(/logged out of the test/).waitFor();
  await page.getByRole('link', { name: /view detailed result/i }).click();
  await page
    .getByText(/your score/i)
    .first()
    .waitFor();
  check(true, 'finishing the test shows the result');
  await capture(page, 'desktop-result');

  // --- History export (a download) and import (a file input) ---------------------------------
  const backup = join(profile, 'history-export.json');
  await app.evaluate(({ session }, file) => {
    // Without this the user picks the place in the Save dialog; the app's own will-download
    // listener (registered first) has already set that dialog's title, file name and filter.
    session.defaultSession.once('will-download', (_event, item) => {
      globalThis.__saveDialog = item.getSaveDialogOptions();
      item.setSavePath(file);
    });
  }, backup);
  await page.evaluate(() => (location.hash = '#/history'));
  await page.getByRole('button', { name: 'Export history' }).click();
  await page.getByText(/Exported 1 attempt/).waitFor();
  for (let i = 0; i < 50 && !existsSync(backup); i++) await new Promise((r) => setTimeout(r, 100));
  const exported = JSON.parse(readFileSync(backup, 'utf8'));
  check(
    exported.format === 'net-cbt-history' && exported.attempts.length === 1,
    'history export saves a file through the download',
  );
  const saveDialog = await app.evaluate(() => globalThis.__saveDialog ?? {});
  check(
    saveDialog.title === 'Save history backup' &&
      /^net-cbt-.*\.json$/i.test(String(saveDialog.defaultPath).split(/[\\/]/).pop()) &&
      saveDialog.filters?.[0]?.extensions?.includes('json'),
    `the Save dialog is titled and suggests the backup's file name (${saveDialog.defaultPath})`,
  );
  await page.locator('input[type=file]').setInputFiles(backup);
  await page.getByText(/Imported 1 attempt from history-export\.json/).waitFor();
  check(true, 'history import reads the chosen file');

  // --- The printable paper (KaTeX fonts and styles pass the Content-Security-Policy) ---------
  await page.evaluate(() => (location.hash = '#/paper/ENG-DESK-PRNT?type=engineering'));
  await page
    .getByText(/answer key/i)
    .first()
    .waitFor({ timeout: 60_000 });
  check(
    await page.getByRole('button', { name: 'Print / Save as PDF' }).isVisible(),
    'the printable paper renders with its Print / Save as PDF button',
  );
  await capture(page, 'desktop-printable');

  // --- Links that leave the app open in the system browser, never in a new window ----------
  await app.evaluate(({ shell: electronShell }) => {
    globalThis.__opened = [];
    electronShell.openExternal = async (url) => {
      globalThis.__opened.push(url);
    };
  });
  await page.evaluate(() => (location.hash = '#/about'));
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  const external = page.locator('a[target="_blank"][href^="https://"]').first();
  const externalHref = await external.getAttribute('href');
  await external.click();
  await page.evaluate(() => {
    location.href = 'https://example.org/navigated';
  });
  await page.waitForTimeout(1000);
  const links = await app.evaluate(({ BrowserWindow }) => ({
    windows: BrowserWindow.getAllWindows().length,
    opened: globalThis.__opened,
  }));
  check(links.windows === 1, 'an external link does not open a new Electron window');
  check(
    links.opened.includes(externalHref),
    `the link goes to the system browser (${externalHref})`,
  );
  check(
    links.opened.includes('https://example.org/navigated') &&
      (await page.evaluate(() => location.href)).startsWith('app://bundle/'),
    'navigating away is blocked and handed to the system browser',
  );

  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  console.log('Desktop smoke test passed.');
} finally {
  await app?.close().catch(() => {});
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
