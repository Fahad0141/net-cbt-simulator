'use strict';
/**
 * Pure helpers of the desktop shell (no Electron imports), unit-tested in test/policy.test.cjs:
 * where an app:// request is served from, its content type, what happens to a link, and the
 * Content-Security-Policy of the bundled pages.
 */
const crypto = require('node:crypto');
const path = require('node:path');

/** The web build is served from app://bundle/, a stable secure origin across launches. */
const APP_SCHEME = 'app';
const APP_HOST = 'bundle';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const APP_HOME = `${APP_ORIGIN}/index.html`;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
};

/** Content type of a bundled file, from its extension. */
function mimeType(file) {
  return MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * The file under `webRoot` that an app:// request asks for, or null when the request is for
 * another host, is malformed, or would leave `webRoot` (`..`, encoded separators, drive letters,
 * UNC paths). `/` serves index.html; the hash route never reaches the protocol handler.
 */
function resolveAppFile(webRoot, requestUrl) {
  let url;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (url.protocol !== `${APP_SCHEME}:` || url.host !== APP_HOST) return null;

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  // Decoded backslashes, NUL bytes and drive letters have no business in a bundle path.
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.includes(':')) return null;
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (pathname.endsWith('/')) pathname += 'index.html';

  const root = path.resolve(webRoot);
  const file = path.resolve(root, `.${path.posix.normalize(pathname)}`);
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return file;
}

/**
 * What happens when the page navigates to or opens `url`: pages of the app stay in the app,
 * web links (http/https) open in the system browser, anything else (file:, javascript:,
 * custom schemes) is ignored.
 */
function linkAction(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return 'block';
  }
  if (parsed.protocol === `${APP_SCHEME}:` && parsed.host === APP_HOST) return 'internal';
  if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return 'external';
  return 'block';
}

/** sha256 sources of the inline <script> elements of an HTML page, for script-src. */
function inlineScriptHashes(html) {
  const hashes = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const [, attributes = '', body = ''] = match;
    if (/\bsrc\s*=/i.test(attributes) || body.trim() === '') continue;
    hashes.push(`'sha256-${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return hashes;
}

/**
 * Content-Security-Policy for the bundled pages: everything comes from the bundle itself
 * (plus the inline theme script of index.html, by hash); nothing is loaded from the network.
 */
function contentSecurityPolicy(indexHtml) {
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes(indexHtml).join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

module.exports = {
  APP_SCHEME,
  APP_HOST,
  APP_ORIGIN,
  APP_HOME,
  mimeType,
  resolveAppFile,
  linkAction,
  inlineScriptHashes,
  contentSecurityPolicy,
};
