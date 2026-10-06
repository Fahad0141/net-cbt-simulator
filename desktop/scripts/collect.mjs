/**
 * Copies the installer that electron-builder wrote to ./release into ../dist-desktop
 * (git-ignored), as NET-CBT-Simulator-Setup-<version>.exe.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(desktop, 'package.json'), 'utf8'));
const name = `NET-CBT-Simulator-Setup-${version}.exe`;
const source = join(desktop, 'release', name);
if (!existsSync(source)) {
  console.error(`${source} not found. Did electron-builder succeed?`);
  process.exit(1);
}
const outDir = resolve(desktop, '..', 'dist-desktop');
mkdirSync(outDir, { recursive: true });
copyFileSync(source, join(outDir, name));
const size = (statSync(join(outDir, name)).size / 1024 / 1024).toFixed(1);
console.log(`Installer: dist-desktop/${name} (${size} MB)`);
