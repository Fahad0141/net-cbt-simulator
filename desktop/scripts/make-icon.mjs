/**
 * Regenerates the Windows icon (build/icon.ico and build/icon.png) from ../assets/icon-only.png.
 * Windows only: the resizing uses PowerShell's System.Drawing (high-quality bicubic). The .ico
 * holds PNG-compressed images from 16 to 256 px, so shortcuts and the taskbar stay sharp.
 *
 *   node scripts/make-icon.mjs        (run in desktop/, then commit the two files)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(desktop, '../assets/icon-only.png');
const outDir = join(desktop, 'build');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

const work = mkdtempSync(join(tmpdir(), 'netcbt-icon-'));
try {
  const ps = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${source.replace(/'/g, "''")}')
foreach ($size in @(${SIZES.join(',')})) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.DrawImage($src, 0, 0, $size, $size)
  $bmp.Save('${work.replace(/'/g, "''")}\\' + $size + '.png', [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
$src.Dispose()
`;
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    stdio: 'inherit',
  });

  const images = SIZES.map((size) => ({ size, data: readFileSync(join(work, `${size}.png`)) }));
  // ICONDIR (6 bytes) + one ICONDIRENTRY (16 bytes) per image, then the PNG data.
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry); // 0 means 256
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2); // no palette
    header.writeUInt8(0, entry + 3); // reserved
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'icon.ico'), Buffer.concat([header, ...images.map((i) => i.data)]));
  writeFileSync(join(outDir, 'icon.png'), images[images.length - 1].data);
  console.log(`Wrote build/icon.ico (${SIZES.join(', ')} px) and build/icon.png (256 px).`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
