/**
 * Type-checks only the given files (and what they import) - much faster and lighter
 * than checking the whole project while authoring a single bank chapter.
 *
 *   node scripts/typecheck-file.mjs src/bank/physics/optics.ts [more files...]
 */
import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';

const files = process.argv.slice(2).filter((f) => !f.startsWith('-'));
if (!files.length) {
  console.error('usage: node scripts/typecheck-file.mjs <file.ts> [...]');
  process.exit(2);
}

const config = `tsconfig.check-${process.pid}.json`;
writeFileSync(
  config,
  JSON.stringify({
    extends: './tsconfig.app.json',
    compilerOptions: { noEmit: true },
    include: [],
    files: files.map((f) => f.replace(/\\/g, '/')),
  }),
);

try {
  const result = spawnSync('npx', ['tsc', '-p', config], { stdio: 'inherit', shell: true });
  if (result.status === 0) console.log(`typecheck OK: ${files.join(', ')}`);
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(config, { force: true });
}
