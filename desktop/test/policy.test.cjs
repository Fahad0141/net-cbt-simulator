'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { test } = require('node:test');
const {
  APP_HOME,
  contentSecurityPolicy,
  inlineScriptHashes,
  linkAction,
  mimeType,
  resolveAppFile,
} = require('../lib/policy.cjs');

const ROOT = path.resolve(__dirname, 'fixture-web');

test('serves files of the bundle, and index.html for the root', () => {
  assert.equal(resolveAppFile(ROOT, APP_HOME), path.join(ROOT, 'index.html'));
  assert.equal(resolveAppFile(ROOT, 'app://bundle/'), path.join(ROOT, 'index.html'));
  assert.equal(resolveAppFile(ROOT, 'app://bundle'), path.join(ROOT, 'index.html'));
  assert.equal(
    resolveAppFile(ROOT, 'app://bundle/assets/index-abc.js?v=1#/exam'),
    path.join(ROOT, 'assets', 'index-abc.js'),
  );
  assert.equal(
    resolveAppFile(ROOT, 'app://bundle/assets/KaTeX%20Main.woff2'),
    path.join(ROOT, 'assets', 'KaTeX Main.woff2'),
  );
});

test('never leaves the bundle folder', () => {
  for (const url of [
    'app://bundle/../secret.txt',
    'app://bundle/%2e%2e/secret.txt',
    'app://bundle/assets/%2e%2e%2f%2e%2e%2fsecret.txt',
    'app://bundle/..%5c..%5csecret.txt',
    'app://bundle/C:%5cWindows%5cwin.ini',
    'app://bundle/%5c%5cserver%5cshare%5cfile',
    'app://bundle/index.html%00.png',
    'app://bundle/%E0%A4%A',
  ]) {
    const file = resolveAppFile(ROOT, url);
    assert.ok(
      file === null || file.startsWith(ROOT + path.sep),
      `${url} resolved outside the bundle: ${file}`,
    );
  }
  assert.equal(resolveAppFile(ROOT, 'app://bundle/..%5c..%5csecret.txt'), null);
  assert.equal(resolveAppFile(ROOT, 'app://bundle/%E0%A4%A'), null);
});

test('serves only the app host and scheme', () => {
  assert.equal(resolveAppFile(ROOT, 'app://other/index.html'), null);
  assert.equal(resolveAppFile(ROOT, 'https://bundle/index.html'), null);
  assert.equal(resolveAppFile(ROOT, 'file:///C:/Windows/win.ini'), null);
  assert.equal(resolveAppFile(ROOT, 'not a url'), null);
});

test('names content types by extension', () => {
  assert.equal(mimeType('index.html'), 'text/html; charset=utf-8');
  assert.equal(mimeType('assets/index-abc.JS'), 'text/javascript; charset=utf-8');
  assert.equal(mimeType('a.css'), 'text/css; charset=utf-8');
  assert.equal(mimeType('manifest.webmanifest'), 'application/manifest+json; charset=utf-8');
  assert.equal(mimeType('favicon.svg'), 'image/svg+xml');
  assert.equal(mimeType('KaTeX_Main-Regular.woff2'), 'font/woff2');
  assert.equal(mimeType('icon-512.png'), 'image/png');
  assert.equal(mimeType('README'), 'application/octet-stream');
});

test('keeps app pages in the app, sends web links to the browser, ignores the rest', () => {
  assert.equal(linkAction('app://bundle/index.html#/history'), 'internal');
  assert.equal(linkAction('https://github.com/OWNER/net-cbt-simulator'), 'external');
  assert.equal(linkAction('http://example.org/'), 'external');
  assert.equal(linkAction('app://evil/index.html'), 'block');
  assert.equal(linkAction('file:///C:/Windows/System32/calc.exe'), 'block');
  assert.equal(linkAction('javascript:alert(1)'), 'block');
  assert.equal(linkAction('ms-settings:privacy'), 'block');
  assert.equal(linkAction('mailto:someone@example.org'), 'block');
  assert.equal(linkAction(''), 'block');
});

test('allows the inline theme script by hash and nothing from the network', () => {
  const script = "\n      try { document.documentElement.dataset.x = '1'; } catch (e) {}\n    ";
  const html = `<html><head><script>${script}</script><script type="module" crossorigin src="./assets/index.js"></script></head></html>`;
  const hash = crypto.createHash('sha256').update(script, 'utf8').digest('base64');
  assert.deepEqual(inlineScriptHashes(html), [`'sha256-${hash}'`]);

  const csp = contentSecurityPolicy(html);
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, new RegExp(`script-src 'self' 'sha256-${hash.replace(/[+/]/g, '\\$&')}'`));
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /https?:/);
  assert.doesNotMatch(csp, /'unsafe-eval'/);
  assert.equal(contentSecurityPolicy('<p>no scripts</p>').includes("script-src 'self';"), true);
});
