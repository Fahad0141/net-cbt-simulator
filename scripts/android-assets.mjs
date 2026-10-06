/**
 * Renders the Android icon and splash sources in assets/ from the app logo (public/favicon.svg),
 * then `npx @capacitor/assets generate --android` turns them into launcher icons and splash screens.
 *
 *   node scripts/android-assets.mjs && npx @capacitor/assets generate --android
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BLUE_TOP = '#087ebb';
const BLUE_BOTTOM = '#01405f';
const BRAND = '#0a5d91';

// The shield and check of public/favicon.svg, drawn in its 64-unit space (centre at 32, 33).
const SHIELD = `
  <path d="M18 44V22l14-6 14 6v22l-14 6z" fill="#f4c430" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M24.5 32.5l5 5 10-11" fill="none" stroke="#04486b" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;

const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${BLUE_TOP}"/><stop offset="1" stop-color="${BLUE_BOTTOM}"/></linearGradient></defs>`;

/** The shield scaled by `scale` and centred in a size x size canvas. */
const shield = (size, scale) =>
  `<g transform="translate(${size / 2 - 32 * scale} ${size / 2 - 33 * scale}) scale(${scale})">${SHIELD}</g>`;

const svg = (size, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;

const IMAGES = {
  // Full icon for older Android versions (and the round icon).
  'icon-only.png': svg(
    1024,
    `${gradient}<rect width="1024" height="1024" rx="224" fill="url(#g)"/>${shield(1024, 16)}`,
  ),
  // Adaptive icon layers. @capacitor/assets insets both layers to the visible 72dp area, so the shield
  // keeps the icon-only proportions and stays well inside the 66dp safe circle of every launcher mask.
  'icon-foreground.png': svg(1024, shield(1024, 16)),
  'icon-background.png': svg(1024, `${gradient}<rect width="1024" height="1024" fill="url(#g)"/>`),
  // Splash screens: the shield on the brand colour (light) or the dark end of the gradient (dark).
  'splash.png': svg(2732, `<rect width="2732" height="2732" fill="${BRAND}"/>${shield(2732, 14)}`),
  'splash-dark.png': svg(
    2732,
    `<rect width="2732" height="2732" fill="${BLUE_BOTTOM}"/>${shield(2732, 14)}`,
  ),
};

const out = new URL('../assets/', import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, markup] of Object.entries(IMAGES)) {
    const size = Number(/width="(\d+)"/.exec(markup)[1]);
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${markup}</body></html>`,
    );
    await page.screenshot({
      path: new URL(name, out).pathname.replace(/^\/(\w:)/, '$1'),
      omitBackground: true,
    });
    await page.close();
    console.log(`assets/${name}`);
  }
} finally {
  await browser.close();
}
