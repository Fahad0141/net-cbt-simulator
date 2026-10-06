/**
 * Gets the desktop package ready to run or build:
 *  - its version follows `version` in the root package.json (the installer and the app's
 *    About box show it);
 *  - the website build (../dist, from `npm run build` in the project root) is copied to ./web,
 *    without source maps. ./web is git-ignored.
 */
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(desktop, '..');
const dist = join(root, 'dist');
const web = join(desktop, 'web');

const rootVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
for (const file of ['package.json', 'package-lock.json']) {
  const target = join(desktop, file);
  const json = JSON.parse(readFileSync(target, 'utf8'));
  const tops = file === 'package-lock.json' ? [json, json.packages?.['']] : [json];
  let changed = false;
  for (const entry of tops) {
    if (entry && entry.version !== rootVersion) {
      entry.version = rootVersion;
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(target, `${JSON.stringify(json, null, 2)}\n`);
    console.log(`desktop/${file}: version set to ${rootVersion}`);
  }
}

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run "npm run build" in the project root first.');
  process.exit(1);
}
rmSync(web, { recursive: true, force: true });
cpSync(dist, web, { recursive: true, filter: (source) => extname(source) !== '.map' });
console.log(`Copied the web build to desktop/web (version ${rootVersion}).`);
