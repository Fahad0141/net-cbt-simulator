'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  DEFAULT_SIZE,
  MIN_SIZE,
  defaultSize,
  loadWindowState,
  sanitizeWindowState,
} = require('../lib/windowState.cjs');

const SCREEN = [{ x: 0, y: 0, width: 1920, height: 1040 }];

test('restores bounds that are on a screen', () => {
  const stored = { x: 100, y: 80, width: 1300, height: 860, maximized: true };
  assert.deepEqual(sanitizeWindowState(stored, SCREEN), stored);
});

test('falls back to the default size for missing, broken, tiny or off-screen bounds', () => {
  const fallback = { ...DEFAULT_SIZE, maximized: false };
  assert.deepEqual(sanitizeWindowState(null, SCREEN), fallback);
  assert.deepEqual(sanitizeWindowState('nope', SCREEN), fallback);
  assert.deepEqual(sanitizeWindowState({ x: 0, y: 0, width: 'big' }, SCREEN), fallback);
  assert.deepEqual(sanitizeWindowState({ x: 0, y: 0, width: 300, height: 200 }, SCREEN), fallback);
  // A window last shown on a monitor that is no longer connected.
  assert.deepEqual(
    sanitizeWindowState({ x: 2500, y: 100, width: 1280, height: 820, maximized: true }, SCREEN),
    { ...DEFAULT_SIZE, maximized: true },
  );
});

test('fits the default size to a small primary screen, down to the minimum', () => {
  assert.deepEqual(defaultSize(SCREEN), DEFAULT_SIZE);
  assert.deepEqual(defaultSize([{ x: 0, y: 0, width: 1366, height: 728 }]), {
    width: 1280,
    height: 728,
  });
  assert.deepEqual(defaultSize([{ x: 0, y: 0, width: 800, height: 500 }]), MIN_SIZE);
  assert.deepEqual(defaultSize([]), DEFAULT_SIZE);
  assert.deepEqual(sanitizeWindowState(null, [{ x: 0, y: 0, width: 1366, height: 728 }]), {
    width: 1280,
    height: 728,
    maximized: false,
  });
});

test('reads the saved state file, or uses the defaults without one', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'netcbt-window-'));
  try {
    assert.deepEqual(loadWindowState(dir, SCREEN), { ...DEFAULT_SIZE, maximized: false });
    const saved = { x: 10, y: 20, width: 1000, height: 700, maximized: false };
    fs.writeFileSync(path.join(dir, 'window-state.json'), JSON.stringify(saved));
    assert.deepEqual(loadWindowState(dir, SCREEN), saved);
    fs.writeFileSync(path.join(dir, 'window-state.json'), '{broken');
    assert.deepEqual(loadWindowState(dir, SCREEN), { ...DEFAULT_SIZE, maximized: false });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
