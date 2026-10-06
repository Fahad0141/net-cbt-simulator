'use strict';
/**
 * Electron main process of the Windows desktop app. It shows the same web build as the website
 * (copied into ./web by scripts/prepare.mjs) from the privileged app://bundle/ origin, so
 * localStorage and IndexedDB keep the user's history across launches and updates.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  nativeTheme,
  protocol,
  screen,
  session,
  shell,
} = require('electron');
const policy = require('./lib/policy.cjs');
const windowState = require('./lib/windowState.cjs');

const APP_ID = 'com.netcbt.simulator.desktop';
const TITLE = 'NET CBT Simulator';
const WEB_ROOT = path.join(__dirname, 'web');
/** Matches --bg of src/ui/styles/global.css, so the window never flashes white. */
const BACKGROUND = { light: '#f3f6fb', dark: '#0e1522' };
/** Web permissions the app uses (copying a paper code or link, full screen); the rest are denied. */
const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write', 'fullscreen']);

// A separate profile (for the smoke test, or to try a build without touching your history).
// Must be set before the single-instance lock, which lives in the profile folder.
if (process.env.NETCBT_USER_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.NETCBT_USER_DATA_DIR));
}

// Registered before `ready`: a standard, secure scheme gets a real origin (storage, clipboard,
// fetch) instead of the opaque origin of file://.
protocol.registerSchemesAsPrivileged([
  {
    scheme: policy.APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      codeCache: true,
    },
  },
]);

/** @type {BrowserWindow | null} */
let mainWindow = null;

const isAppUrl = (url) => policy.linkAction(url) === 'internal';

/** Opens web links in the default browser; ignores every other scheme. */
function openOutside(url) {
  if (policy.linkAction(url) === 'external') {
    shell.openExternal(url).catch((error) => console.warn('Could not open link:', error));
  }
}

function readIndexHtml() {
  try {
    return fs.readFileSync(path.join(WEB_ROOT, 'index.html'), 'utf8');
  } catch {
    return null;
  }
}

/** Serves the bundled web build at app://bundle/ (read-only, nothing outside ./web). */
function registerAppProtocol(indexHtml) {
  const csp = policy.contentSecurityPolicy(indexHtml);
  protocol.handle(policy.APP_SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405 });
    }
    const file = policy.resolveAppFile(WEB_ROOT, request.url);
    if (!file) return new Response('Not found', { status: 404 });
    try {
      const body = await fs.promises.readFile(file);
      const headers = {
        'Content-Type': policy.mimeType(file),
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      };
      if (file.endsWith('.html')) headers['Content-Security-Policy'] = csp;
      return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

function restrictPermissions() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_contents, permission, callback, details) => {
    callback(ALLOWED_PERMISSIONS.has(permission) && isAppUrl(details.requestingUrl ?? ''));
  });
  ses.setPermissionCheckHandler((_contents, permission, requestingOrigin) => {
    return ALLOWED_PERMISSIONS.has(permission) && isAppUrl(requestingOrigin);
  });
}

/**
 * Export history is a download (<a download>): Electron asks where to save it with the Windows
 * Save dialog. Without these options the dialog is titled with the blob: URL.
 */
function configureDownloads() {
  session.defaultSession.on('will-download', (_event, item) => {
    const filename = item.getFilename();
    const json = path.extname(filename).toLowerCase() === '.json';
    item.setSaveDialogOptions({
      title: json ? 'Save history backup' : 'Save file',
      defaultPath: path.join(app.getPath('downloads'), filename),
      filters: json
        ? [
            { name: 'History backup (JSON)', extensions: ['json'] },
            { name: 'All files', extensions: ['*'] },
          ]
        : [],
    });
  });
}

/** Zoom keys that the menu's accelerators miss (Ctrl+= without Shift, the numeric keypad). */
function handleZoomKeys(contents, input) {
  if (input.type !== 'keyDown' || !(input.control || input.meta) || input.alt) return false;
  const level = contents.getZoomLevel();
  if (input.key === '=' || input.key === '+') contents.setZoomLevel(Math.min(level + 0.5, 5));
  else if (input.key === '-' || input.key === '_') contents.setZoomLevel(Math.max(level - 0.5, -3));
  else if (input.key === '0' && !input.shift) contents.setZoomLevel(0);
  else return false;
  return true;
}

function buildMenu() {
  const dev = !app.isPackaged;
  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    { label: '&File', submenu: [{ role: 'quit', label: 'E&xit' }] },
    {
      label: '&Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '&View',
      submenu: [
        ...(dev
          ? /** @type {Electron.MenuItemConstructorOptions[]} */ ([
              { role: 'reload' },
              { role: 'toggleDevTools' },
              { type: 'separator' },
            ])
          : []),
        { role: 'resetZoom', label: 'Actual size' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Full screen' },
      ],
    },
    { label: '&Help', submenu: [{ role: 'about', label: `About ${TITLE}` }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const primary = screen.getPrimaryDisplay();
  const others = screen.getAllDisplays().filter((display) => display.id !== primary.id);
  const workAreas = [primary, ...others].map((display) => display.workArea);
  const state = windowState.loadWindowState(app.getPath('userData'), workAreas);

  const window = new BrowserWindow({
    ...(state.x !== undefined ? { x: state.x, y: state.y } : {}),
    width: state.width,
    height: state.height,
    minWidth: windowState.MIN_SIZE.width,
    minHeight: windowState.MIN_SIZE.height,
    title: TITLE,
    // The packaged .exe carries the icon; `electron .` would otherwise show Electron's.
    icon: app.isPackaged ? undefined : path.join(__dirname, 'build', 'icon.ico'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light,
    autoHideMenuBar: true, // the menu appears with Alt; the CBT terminal gets the whole window
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      additionalArguments: [`--netcbt-version=${app.getVersion()}`],
    },
  });
  mainWindow = window;

  window.once('ready-to-show', () => {
    if (state.maximized) window.maximize();
    window.show();
  });
  window.on('close', () => windowState.saveWindowState(app.getPath('userData'), window));
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  const contents = window.webContents;
  contents.on('before-input-event', (event, input) => {
    if (handleZoomKeys(contents, input)) event.preventDefault();
  });
  // A running test asks before the page unloads (beforeunload). Electron would silently keep
  // the window open, so ask the way a browser does. The attempt is saved either way.
  contents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'question',
      buttons: ['Close', 'Keep working'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      title: TITLE,
      message: 'Leave the test?',
      detail:
        'Your answers are saved. Open the app again to resume the test; the exam clock keeps ' +
        'running while it is closed, as in the real exam.',
    });
    if (choice === 0) event.preventDefault(); // ignore beforeunload and go ahead
  });
  // Reload after a renderer crash, but not in a loop when the page crashes again right away.
  let lastCrash = 0;
  contents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit' || window.isDestroyed()) return;
    const now = Date.now();
    if (now - lastCrash < 15_000) {
      dialog.showErrorBox(
        TITLE,
        `The app stopped unexpectedly (${details.reason}). Your answers are saved: close the ` +
          'app and open it again to continue.',
      );
      return;
    }
    lastCrash = now;
    contents.reload();
  });

  void window.loadURL(policy.APP_HOME);
}

/** Policies for every web page the app creates: no pop-ups, no leaving the app, no <webview>. */
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // A same-app link with target="_blank" opens in the window itself.
    if (isAppUrl(url)) void contents.loadURL(url);
    else openOutside(url);
    return { action: 'deny' };
  });
  // event.url is the current API; the positional url argument is deprecated.
  contents.on('will-navigate', (event, legacyUrl) => {
    const url = event.url ?? legacyUrl;
    if (isAppUrl(url)) return;
    event.preventDefault();
    openOutside(url);
  });
  contents.on('will-redirect', (event, legacyUrl) => {
    if (!isAppUrl(event.url ?? legacyUrl)) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
});

if (!app.requestSingleInstanceLock()) {
  // Another window is already open: it is brought to the front (second-instance below).
  app.quit();
} else {
  app.setAppUserModelId(APP_ID);
  app.setAboutPanelOptions({
    applicationName: TITLE,
    applicationVersion: app.getVersion(),
    copyright: 'MIT licence. Unofficial practice tool, not affiliated with NUST.',
  });

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on('window-all-closed', () => app.quit());

  app
    .whenReady()
    .then(() => {
      const indexHtml = readIndexHtml();
      if (indexHtml === null) {
        dialog.showErrorBox(
          TITLE,
          `The web app is missing (${path.join(WEB_ROOT, 'index.html')}).\n\n` +
            'Run "npm run desktop:dev" from the project folder, which builds it first.',
        );
        app.quit();
        return;
      }
      registerAppProtocol(indexHtml);
      restrictPermissions();
      configureDownloads();
      buildMenu();
      createWindow();
    })
    .catch((error) => {
      console.error(error);
      app.quit();
    });
}
