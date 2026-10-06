/**
 * Quality gate for the whole question bank. Every template in every chapter module
 * is generated many times with different seeds and each instance must pass
 * structural validation and render with KaTeX.
 *
 * Run one chapter while authoring (fast, isolated from other chapters):
 *   BANK_ONLY=physics/optics npx vitest run src/bank
 * Several prefixes:  BANK_ONLY=physics/,english/vocabulary npx vitest run src/bank
 */
import { SYLLABUS } from '@/config/syllabus';
import { realize } from '@/engine/instantiate';
import { chapterOfPath, loadBankModulesSettled, subjectOfPath } from '@/engine/registry';
import { createRng } from '@/engine/rng';
import { SUBJECT_IDS } from '@/engine/types';
import { validateTemplate } from '@/engine/validate';
import { texIssues } from '@/engine/validate-tex';

const only = (process.env.BANK_ONLY ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const settled = await loadBankModulesSettled(only);
const loaded = settled.filter((m) => m.module);
const SAMPLES = 30;
const TEX_SAMPLES = 8;

describe('question bank', () => {
  it('has chapter modules', () => {
    expect(settled.length).toBeGreaterThan(0);
  });

  it('uses globally unique template ids', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const { path, module } of loaded) {
      for (const t of module!.templates) {
        if (seen.has(t.id)) duplicates.push(`${t.id} (${seen.get(t.id)} and ${path})`);
        seen.set(t.id, path);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('has no two fixed questions with the same stem and answer', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const { module } of loaded) {
      for (const t of module!.templates) {
        if (t.kind !== 'static') continue;
        const key = `${t.question.stem.trim().toLowerCase()}|${t.question.answer.trim().toLowerCase()}`;
        if (seen.has(key)) duplicates.push(`${t.id} duplicates ${seen.get(key)}`);
        seen.set(key, t.id);
      }
    }
    expect(duplicates).toEqual([]);
  });
});

describe.each(settled.map((m) => [m.path.replace('../bank/', '').replace(/\.ts$/, ''), m] as const))(
  '%s',
  (_name, { path, module, error }) => {
    it('loads', () => {
      expect(error ?? null).toBeNull();
    });

    if (!module) return;

    it('declares the subject and chapter matching its path and the syllabus', () => {
      expect(SUBJECT_IDS).toContain(module.subject);
      expect(module.subject).toBe(subjectOfPath(path));
      expect(module.chapter).toBe(chapterOfPath(path));
      const chapters = SYLLABUS[module.subject].chapters.map((c) => c.id);
      expect(chapters).toContain(module.chapter);
      expect(module.templates.length).toBeGreaterThan(0);
    });

    it.each(module.templates.map((t) => [t.id, t] as const))('%s', (_id, template) => {
      const report = validateTemplate(template, SAMPLES);
      const errors = report.issues
        .filter((i) => i.severity === 'error')
        .map((i) => `[${i.field}] ${i.message} (seed ${i.seed})`);

      const runs = template.kind === 'static' ? 1 : TEX_SAMPLES;
      for (let s = 0; s < runs; s++) {
        let items: ReturnType<typeof realize> = [];
        try {
          items = realize(template, createRng(`validate:${template.id}:${s}`));
        } catch {
          continue; // already reported by validateTemplate
        }
        for (const item of items) {
          for (const issue of texIssues(item.question, item.passage?.text)) {
            errors.push(`[${issue.field}] ${issue.message} (seed validate:${template.id}:${s})`);
          }
        }
      }
      expect(errors).toEqual([]);
    });
  },
);
