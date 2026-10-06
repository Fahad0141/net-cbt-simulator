'use strict';
/**
 * Remembers the window's size, position and maximised state between launches, in
 * <userData>/window-state.json. Bounds that no longer fit any display are dropped.
 */
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SIZE = { width: 1280, height: 820 };
const MIN_SIZE = { width: 960, height: 600 };

/** Visible area shared by two rectangles, in pixels (0 when they do not overlap). */
function overlapArea(a, b) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

/** The default size, made to fit the primary display's work area (a 1366x768 laptop). */
function defaultSize(workAreas) {
  const [primary] = workAreas;
  if (!primary) return { ...DEFAULT_SIZE };
  return {
    width: Math.max(MIN_SIZE.width, Math.min(DEFAULT_SIZE.width, primary.width)),
    height: Math.max(MIN_SIZE.height, Math.min(DEFAULT_SIZE.height, primary.height)),
  };
}

/**
 * The stored state when it is well formed, at least the minimum size, and at least partly on
 * one of `workAreas` (primary display first), so a window from a disconnected monitor does
 * not open off screen; otherwise the default size, centred by Electron.
 */
function sanitizeWindowState(stored, workAreas) {
  const fallback = { ...defaultSize(workAreas), maximized: false };
  if (!stored || typeof stored !== 'object') return fallback;
  const maximized = stored.maximized === true;
  const numbers = ['x', 'y', 'width', 'height'].map((key) => stored[key]);
  if (!numbers.every((n) => Number.isFinite(n))) return { ...fallback, maximized };
  const [x, y, width, height] = numbers.map((n) => Math.round(n));
  if (width < MIN_SIZE.width || height < MIN_SIZE.height) return { ...fallback, maximized };
  const bounds = { x, y, width, height };
  const visible = workAreas.some((area) => overlapArea(bounds, area) >= 100 * 100);
  return visible ? { ...bounds, maximized } : { ...fallback, maximized };
}

function stateFile(userDataDir) {
  return path.join(userDataDir, 'window-state.json');
}

function loadWindowState(userDataDir, workAreas) {
  try {
    return sanitizeWindowState(
      JSON.parse(fs.readFileSync(stateFile(userDataDir), 'utf8')),
      workAreas,
    );
  } catch {
    return sanitizeWindowState(null, workAreas);
  }
}

/** Saves the window's normal (un-maximised) bounds and whether it is maximised. */
function saveWindowState(userDataDir, window) {
  if (window.isDestroyed() || window.isMinimized() || window.isFullScreen()) return;
  const state = { ...window.getNormalBounds(), maximized: window.isMaximized() };
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(stateFile(userDataDir), JSON.stringify(state));
  } catch {
    // Not worth bothering the user about: the next launch uses the default size.
  }
}

module.exports = {
  DEFAULT_SIZE,
  MIN_SIZE,
  defaultSize,
  sanitizeWindowState,
  loadWindowState,
  saveWindowState,
};
