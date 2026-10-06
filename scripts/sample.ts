/**
 * Prints generated instances of question templates for eyeballing correctness.
 *
 *   npm run sample -- mathematics/differentiation            # every template in a chapter
 *   npm run sample -- mathematics/differentiation/chain-rule-trig 5
 *   npm run sample -- physics 2 --json
 *
 * Arguments: <id-prefix> [instances per template = 3] [--json]
 */
import { realize } from '../src/engine/instantiate';
import { loadBankModulesSettled } from '../src/engine/registry';
import { createRng } from '../src/engine/rng';

const args = process.argv.slice(2).filter((a) => a !== '--');
const json = args.includes('--json');
const positional = args.filter((a) => !a.startsWith('--'));
const prefix = positional[0] ?? '';
const count = Number(positional[1] ?? 3);

// Only import the modules we need, so a broken chapter elsewhere cannot interfere.
const segments = prefix.split('/').filter(Boolean);
const modulePrefix =
  segments.length >= 2
    ? `${segments[0]}/${segments[1]}`
    : segments.length === 1
      ? `${segments[0]}/`
      : '';
const settled = await loadBankModulesSettled(modulePrefix ? [modulePrefix] : undefined);
for (const m of settled) if (m.error) console.error(`FAILED TO LOAD ${m.path}: ${m.error}`);
const bank = settled.flatMap((m) => m.module?.templates ?? []);
const templates = bank.filter((t) => t.id.startsWith(prefix));
if (!templates.length) {
  console.error(
    `No templates match "${prefix}". Known subjects: ${[...new Set(bank.map((t) => t.subject))].join(', ')}`,
  );
  process.exit(1);
}

const out: unknown[] = [];
for (const t of templates) {
  const runs = t.kind === 'static' ? 1 : count;
  for (let i = 0; i < runs; i++) {
    const seed = `sample:${t.id}:${i}`;
    let items;
    try {
      items = realize(t, createRng(seed));
    } catch (error) {
      console.log(`\n### ${t.id} [${seed}] THREW: ${String(error)}`);
      continue;
    }
    for (const { question, passage } of items) {
      if (json) {
        out.push({ id: t.id, seed, difficulty: t.difficulty, passage: passage?.text, ...question });
        continue;
      }
      console.log(`\n### ${t.id}  (d${t.difficulty}, ${t.kind}, ${t.origin})  seed=${seed}`);
      if (passage) console.log(`PASSAGE: ${passage.text}\n`);
      console.log(`Q: ${question.stem}`);
      console.log(`  * ${question.answer}`);
      for (const d of question.distractors) console.log(`    ${d}`);
      console.log(`E: ${question.explanation}`);
    }
  }
}
if (json) console.log(JSON.stringify(out, null, 2));
