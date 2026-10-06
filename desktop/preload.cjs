'use strict';
/**
 * Runs in the sandboxed renderer before the web app. It only tells the web app that it runs
 * in the desktop app (src/platform/desktop.ts reads `window.netcbtDesktop`); it exposes no
 * Node.js or Electron API.
 */
const { contextBridge } = require('electron');

const PREFIX = '--netcbt-version=';
const versionArg = process.argv.find((arg) => arg.startsWith(PREFIX));

contextBridge.exposeInMainWorld(
  'netcbtDesktop',
  Object.freeze({
    platform: 'desktop',
    version: versionArg ? versionArg.slice(PREFIX.length) : '',
  }),
);
