import { normalizeOption } from './helpers/distractors';
import { trackRounding } from './helpers/format';
import type { RoundedValue } from './helpers/format';
import { parseRich } from './rich';
import { createRng } from './rng';
import { realize } from './instantiate';
import type { AuthoredQuestion, QuestionTemplate } from './types';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  /** Which part of the question: stem, answer, distractor[1], explanation, figure, options, template. */
  field: string;
  message: string;
}

// Control characters other than \n. A TAB or form-feed here almost always means a LaTeX
// command lost its backslash in a non-raw string ("\times" -> TAB + "imes", "\frac" -> FF + "rac").
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0009\u000B-\u001F\u007F]/;
// `${` in output means a template expression was not interpolated: inside String.raw/tex,
// `\${x}` escapes the `$`. Build LaTeX commands in JS (`const f = '\\sin'`) and interpolate them.
const JS_LEAKS = /\bNaN\b|\[object \w+\]|\bInfinity\b|\$\{/;
// `undefined` glued to math/expression syntax is an interpolation bug ("$x = undefined$");
// the word in prose ("tan 90° is undefined", "undefined behaviour") is fine.
const UNDEFINED_LEAK = /[$={(\d^_+\-*/]\s*undefined|undefined\s*[$}^_)+\-*/\d]/;
const REFERS_TO_OTHERS =
  /\b(all|none|neither|any) of (the )?(above|these|them|those)\b|\b(both|either|neither)\s*\(?[a-dA-D]\)?\s*(and|or|nor|&)\s*\(?[a-dA-D]\)?(\s|$|[.,;])|\(\s*[a-dA-D]\s*\)\s*(and|&|or)\s*\(\s*[a-dA-D]\s*\)/i;

function checkText(field: string, text: unknown, issues: ValidationIssue[], required = true): void {
  if (typeof text !== 'string') {
    issues.push({ severity: 'error', field, message: `must be a string (got ${typeof text})` });
    return;
  }
  if (!text.trim()) {
    if (required) issues.push({ severity: 'error', field, message: 'is empty' });
    return;
  }
  if (CONTROL_CHARS.test(text)) {
    issues.push({
      severity: 'error',
      field,
      message:
        'contains a control character - a LaTeX backslash was probably lost (use the `tex` / String.raw tag)',
    });
  }
  const leak = JS_LEAKS.exec(text);
  if (leak)
    issues.push({ severity: 'error', field, message: `contains "${leak[0]}" (template bug?)` });
  if (UNDEFINED_LEAK.test(text)) {
    issues.push({
      severity: 'error',
      field,
      message: 'contains an interpolated "undefined" (template bug?)',
    });
  }
  for (const problem of parseRich(text).problems) {
    issues.push({ severity: 'error', field, message: problem });
  }
}

/** Structural checks for a single authored question (cheap; safe to run at runtime). */
export function validateQuestion(q: AuthoredQuestion): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkText('stem', q.stem, issues);
  checkText('answer', q.answer, issues);
  checkText('explanation', q.explanation, issues);

  if (!Array.isArray(q.distractors) || q.distractors.length !== 3) {
    issues.push({
      severity: 'error',
      field: 'distractors',
      message: `must contain exactly 3 items (got ${Array.isArray(q.distractors) ? q.distractors.length : typeof q.distractors})`,
    });
    return issues;
  }
  q.distractors.forEach((d, i) => checkText(`distractor[${i + 1}]`, d, issues));

  const options = [q.answer, ...q.distractors];
  const keys = options.map((o) => (typeof o === 'string' ? normalizeOption(o) : ''));
  if (new Set(keys).size !== keys.length) {
    issues.push({
      severity: 'error',
      field: 'options',
      message: `options are not distinct: ${JSON.stringify(options)}`,
    });
  }

  if (q.fixedOrder) {
    const sortedA = [...q.fixedOrder].sort();
    const sortedB = [...options].sort();
    if (sortedA.length !== 4 || sortedA.some((v, i) => v !== sortedB[i])) {
      issues.push({
        severity: 'error',
        field: 'fixedOrder',
        message: 'must be a permutation of answer + distractors',
      });
    }
  } else if (options.some((o) => typeof o === 'string' && REFERS_TO_OTHERS.test(o))) {
    issues.push({
      severity: 'error',
      field: 'options',
      message:
        'an option refers to other options ("all of the above", "both (a) and (b)") - set fixedOrder',
    });
  }

  if (typeof q.stem === 'string' && q.stem.length > 4000) {
    issues.push({
      severity: 'warning',
      field: 'stem',
      message: 'stem is very long (> 4000 chars)',
    });
  }
  options.forEach((o, i) => {
    if (typeof o === 'string' && o.length > 400) {
      issues.push({
        severity: 'warning',
        field: i === 0 ? 'answer' : `distractor[${i}]`,
        message: 'option is very long',
      });
    }
  });

  const lengths = options.map((o) => (typeof o === 'string' ? o.length : 0));
  const avgWrong = (lengths[1]! + lengths[2]! + lengths[3]!) / 3;
  if (lengths[0]! > 40 && lengths[0]! > 2.5 * avgWrong) {
    issues.push({
      severity: 'warning',
      field: 'answer',
      message: 'answer is much longer than the distractors (gives it away)',
    });
  }

  if (q.figure !== undefined) {
    if (typeof q.figure !== 'string' || !q.figure.trim().startsWith('<svg')) {
      issues.push({
        severity: 'error',
        field: 'figure',
        message: 'figure must be an <svg> string',
      });
    } else if (/<script|\bon[a-z]+\s*=|javascript:|<foreignObject/i.test(q.figure)) {
      issues.push({ severity: 'error', field: 'figure', message: 'figure contains scripting' });
    }
  }
  return issues;
}

/**
 * Rounded numbers (from `num`/`sci`) that the candidate sees in `text`. A stem that shows
 * 12.8 g while the key was computed from 12.75 g has two defensible answers. Values marked
 * as approximate (`\approx`, `≈`) are fine.
 */
export function roundedValuesShown(text: string, rounded: readonly RoundedValue[]): RoundedValue[] {
  const found = new Map<string, RoundedValue>();
  for (const value of rounded) {
    if (found.has(value.shown)) continue;
    const escaped = value.shown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<![\\d.])${escaped}(?!\\d|\\.\\d)`, 'g');
    for (const match of text.matchAll(pattern)) {
      const before = text.slice(Math.max(0, match.index - 12), match.index);
      if (!/\\approx|≈|approx/.test(before)) {
        found.set(value.shown, value);
        break;
      }
    }
  }
  return [...found.values()];
}

export interface TemplateReport {
  templateId: string;
  issues: Array<ValidationIssue & { seed: string }>;
  samples: number;
  distinctInstances: number;
}

/**
 * Generates `samples` instances of a template and validates each one, plus
 * determinism (same seed -> same output) and, for dynamic templates, variety.
 */
export function validateTemplate(template: QuestionTemplate, samples = 30): TemplateReport {
  const issues: TemplateReport['issues'] = [];
  const fingerprints = new Set<string>();
  const runs = template.kind === 'static' ? 1 : samples;

  for (let i = 0; i < runs; i++) {
    const seed = `validate:${template.id}:${i}`;
    let first: ReturnType<typeof realize>;
    let rounded: RoundedValue[];
    try {
      ({ result: first, rounded } = trackRounding(() => realize(template, createRng(seed))));
    } catch (error) {
      issues.push({
        severity: 'error',
        field: 'template',
        message: `generate() threw: ${String(error)}`,
        seed,
      });
      continue;
    }
    if (template.kind === 'set') {
      if (first.length !== template.size) {
        issues.push({
          severity: 'error',
          field: 'template',
          message: `set yielded ${first.length} questions, declared size ${template.size}`,
          seed,
        });
      }
      const passage = first[0]?.passage?.text ?? '';
      checkText('passage', passage, issues as ValidationIssue[]);
    }
    for (const item of first) {
      for (const issue of validateQuestion(item.question)) issues.push({ ...issue, seed });
      const shown = `${item.passage?.text ?? ''}\n${item.question.stem}`;
      for (const value of roundedValuesShown(shown, rounded)) {
        issues.push({
          severity: 'error',
          field: 'stem',
          message: `shows the rounded value ${value.shown} (exact ${value.exact}): display the exact value or compute the key from the shown one`,
          seed,
        });
      }
    }
    const again = JSON.stringify(realize(template, createRng(seed)));
    if (again !== JSON.stringify(first)) {
      issues.push({
        severity: 'error',
        field: 'template',
        message:
          'not deterministic: same seed produced different output (do not use Math.random/Date)',
        seed,
      });
    }
    fingerprints.add(JSON.stringify(first.map((r) => [r.question.stem, r.question.answer])));
  }

  if (template.kind === 'dynamic' && runs >= 10) {
    if (fingerprints.size === 1) {
      issues.push({
        severity: 'error',
        field: 'template',
        message: 'dynamic template always produces the same question - make it static',
        seed: '-',
      });
    } else if (fingerprints.size < Math.min(5, runs)) {
      issues.push({
        severity: 'warning',
        field: 'template',
        message: `low variety: only ${fingerprints.size} distinct instances in ${runs} samples`,
        seed: '-',
      });
    }
  }
  return { templateId: template.id, issues, samples: runs, distinctInstances: fingerprints.size };
}
