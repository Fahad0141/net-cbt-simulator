/**
 * Pure helpers behind the question-bank browser: labels, statistics, search and
 * preview generation. Nothing here touches the DOM, so it is unit-tested in Node.
 */
import { blueprintFor, EXAM_TYPES } from '@/config/exams';
import { arrangeOptions, realize } from '@/engine/instantiate';
import { toPlainText } from '@/engine/rich';
import { createRng, cyrb128, isValidSeed, normalizeSeed, randomSeed } from '@/engine/rng';
import type { Difficulty, Origin, QuestionTemplate, SubjectId } from '@/engine/types';
import { type ValidationIssue, validateQuestion } from '@/engine/validate';
import { texIssues } from '@/engine/validate-tex';

export type TemplateKind = QuestionTemplate['kind'];

export const KIND_LABEL: Readonly<Record<TemplateKind, string>> = {
  dynamic: 'Parametric',
  static: 'Fixed',
  set: 'Passage set',
};

export const DIFFICULTY_LABEL: Readonly<Record<Difficulty, string>> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

export const ORIGIN_LABEL: Readonly<Record<Origin, string>> = {
  'past-paper': 'Past-paper style',
  original: 'Original',
};

export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3];

/** Last segment of a template id: `physics/work-energy/kinetic-energy` -> `kinetic-energy`. */
export function localId(id: string): string {
  const parts = id.split('/');
  return parts[parts.length - 1] || id;
}

/** Splits `<subject>/<chapter>/<local>` (any part may be missing in malformed input). */
export function splitTemplateId(id: string): {
  subject?: string;
  chapter?: string;
  local?: string;
} {
  const [subject, chapter, ...rest] = id.split('/');
  return {
    ...(subject ? { subject } : {}),
    ...(chapter ? { chapter } : {}),
    ...(rest.length ? { local: rest.join('/') } : {}),
  };
}

// ---------------------------------------------------------------------------
// Statistics

/** Composition of a group of templates (a chapter, a subject). */
export interface Mix {
  total: number;
  dynamic: number;
  static: number;
  set: number;
  /** Questions yielded by one instance of every passage set together. */
  setQuestions: number;
  pastPaper: number;
  /** Template counts for difficulty 1, 2 and 3. */
  difficulty: [number, number, number];
}

export const EMPTY_MIX: Mix = {
  total: 0,
  dynamic: 0,
  static: 0,
  set: 0,
  setQuestions: 0,
  pastPaper: 0,
  difficulty: [0, 0, 0],
};

export function mixOf(templates: readonly QuestionTemplate[]): Mix {
  const mix: Mix = { ...EMPTY_MIX, difficulty: [0, 0, 0] };
  for (const t of templates) {
    mix.total++;
    if (t.kind === 'dynamic') mix.dynamic++;
    else if (t.kind === 'static') mix.static++;
    else {
      mix.set++;
      mix.setQuestions += Number.isFinite(t.size) ? t.size : 0;
    }
    if (t.origin === 'past-paper') mix.pastPaper++;
    const d = t.difficulty - 1;
    if (d === 0 || d === 1 || d === 2) mix.difficulty[d]++;
  }
  return mix;
}

/** Integer percentage of `part` in `total` (0 when the total is 0). */
export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((100 * part) / total) : 0;
}

/**
 * Whole-number percentages that always add up to exactly 100 (largest remainder),
 * so a legend never reads "33% / 33% / 33%". All zeros when the total is 0.
 */
export function shares(counts: readonly number[]): number[] {
  const total = counts.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return counts.map(() => 0);
  const raw = counts.map((c) => (100 * Math.max(0, c)) / total);
  const out = raw.map(Math.floor);
  let remaining = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remaining > 0 && order.length; k = (k + 1) % order.length, remaining--) {
    const i = order[k].i;
    out[i] = out[i] + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Search and filters

export type KindFilter = 'all' | TemplateKind;
export type DifficultyFilter = 'all' | '1' | '2' | '3';
export type OriginFilter = 'all' | Origin;

export interface TemplateFilter {
  query: string;
  kind: KindFilter;
  difficulty: DifficultyFilter;
  origin: OriginFilter;
}

export const EMPTY_FILTER: TemplateFilter = {
  query: '',
  kind: 'all',
  difficulty: 'all',
  origin: 'all',
};

export function isFilterActive(filter: TemplateFilter): boolean {
  return (
    filter.query.trim() !== '' ||
    filter.kind !== 'all' ||
    filter.difficulty !== 'all' ||
    filter.origin !== 'all'
  );
}

function safePlainText(text: unknown): string {
  if (typeof text !== 'string') return '';
  try {
    return toPlainText(text);
  } catch {
    return text;
  }
}

const haystacks = new WeakMap<QuestionTemplate, string>();

/**
 * Lower-cased text a template is searched by: its id and tags and, for fixed
 * questions, the stem (parametric stems change with every variant).
 */
export function searchHaystack(template: QuestionTemplate): string {
  let text = haystacks.get(template);
  if (text === undefined) {
    const parts = [template.id, ...(Array.isArray(template.tags) ? template.tags : [])];
    if (template.kind === 'static') parts.push(safePlainText(template.question?.stem));
    text = parts.join('\n').toLowerCase().replace(/\s+/g, ' ');
    haystacks.set(template, text);
  }
  return text;
}

/** Whitespace-separated search terms; every term must match. */
export function searchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesFilter(
  template: QuestionTemplate,
  filter: TemplateFilter,
  terms = searchTerms(filter.query),
): boolean {
  if (filter.kind !== 'all' && template.kind !== filter.kind) return false;
  if (filter.difficulty !== 'all' && String(template.difficulty) !== filter.difficulty)
    return false;
  if (filter.origin !== 'all' && template.origin !== filter.origin) return false;
  if (!terms.length) return true;
  const haystack = searchHaystack(template);
  return terms.every((term) => haystack.includes(term));
}

export function filterTemplates(
  templates: readonly QuestionTemplate[],
  filter: TemplateFilter,
): QuestionTemplate[] {
  const terms = searchTerms(filter.query);
  return templates.filter((t) => matchesFilter(t, filter, terms));
}

// ---------------------------------------------------------------------------
// Seeds

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * The seed a template is previewed with until someone asks for a new variant.
 * Derived from the id, so every template has its own stable default variant.
 */
export function defaultSeed(templateId: string): string {
  const [a, b] = cyrb128(`bank-preview:${templateId}`);
  let out = '';
  for (let i = 0; i < 8; i++) {
    const word = i < 4 ? a : b;
    out += CROCKFORD[(word >>> ((i % 4) * 5)) & 31];
  }
  return out;
}

/** Normalises a seed from the URL; `undefined` when it is missing or invalid. */
export function parseSeed(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const seed = normalizeSeed(value);
  return isValidSeed(seed) ? seed : undefined;
}

// ---------------------------------------------------------------------------
// Preview

/**
 * A quality-check finding. `generator` checks are the ones the paper generator runs
 * before accepting a variant (it discards variants with errors); `katex` checks
 * compile the maths the way the bank's test suite does (the generator does not, so
 * a KaTeX error shows up as broken maths in a paper).
 */
export interface PreviewIssue extends ValidationIssue {
  check: 'generator' | 'katex';
}

export interface PreviewQuestion {
  stem: string;
  options: string[];
  /** Index of the correct option in `options`; -1 when the template is broken. */
  correct: number;
  explanation: string;
  figure?: string;
  issues: PreviewIssue[];
}

export type Preview =
  | {
      ok: true;
      seed: string;
      passage?: { title?: string; text: string };
      questions: PreviewQuestion[];
    }
  | { ok: false; seed: string; error: string };

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

function errorMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/** Runs one quality check; a check that crashes on malformed output is itself an error. */
function runCheck(check: PreviewIssue['check'], run: () => ValidationIssue[]): PreviewIssue[] {
  try {
    return run().map((issue) => ({ ...issue, check }));
  } catch (error) {
    return [
      {
        severity: 'error',
        field: 'template',
        message: `checks failed: ${errorMessage(error)}`,
        check,
      },
    ];
  }
}

/**
 * Generates one instance of a template exactly as the paper engine would:
 * `realize(template, createRng(seed))`, then the options are arranged with a
 * seeded RNG. Never throws: a failing template yields `{ ok: false }`.
 * With `checks`, every question also goes through the structural checks the paper
 * generator applies and the KaTeX checks of the bank's test suite.
 */
export function buildPreview(
  template: QuestionTemplate,
  seed: string,
  { checks = true }: { checks?: boolean } = {},
): Preview {
  try {
    const realized = realize(template, createRng(seed));
    if (!realized.length) return { ok: false, seed, error: 'The template produced no questions.' };
    const first = realized[0]?.passage;
    const questions = realized.map(({ question, passage }, i): PreviewQuestion => {
      const arranged = arrangeOptions(question, createRng(`${seed}|opt|${i}`));
      const issues = checks
        ? [
            ...runCheck('generator', () => validateQuestion(question)),
            ...runCheck('katex', () => texIssues(question, i === 0 ? passage?.text : undefined)),
          ]
        : [];
      return {
        stem: asText(question.stem),
        options: arranged.options.map(asText),
        correct: arranged.correct,
        explanation: asText(question.explanation),
        ...(typeof question.figure === 'string' && question.figure
          ? { figure: question.figure }
          : {}),
        issues,
      };
    });
    return {
      ok: true,
      seed,
      ...(first
        ? {
            passage: {
              ...(first.title ? { title: asText(first.title) } : {}),
              text: asText(first.text),
            },
          }
        : {}),
      questions,
    };
  } catch (error) {
    return { ok: false, seed, error: errorMessage(error) };
  }
}

/** Identity of a preview, used to make sure "New variant" really shows something new. */
export function previewFingerprint(preview: Preview): string {
  if (!preview.ok) return `error:${preview.error}`;
  return JSON.stringify([
    preview.passage?.text ?? '',
    ...preview.questions.map((q) => [q.stem, q.options]),
  ]);
}

/**
 * A fresh random seed whose variant differs from the one currently shown (tries a
 * few seeds; templates with very little variety may still repeat).
 */
export function nextVariantSeed(
  template: QuestionTemplate,
  currentSeed: string,
  makeSeed: () => string = () => randomSeed(),
): string {
  const fast = { checks: false };
  const current = previewFingerprint(buildPreview(template, currentSeed, fast));
  let seed = makeSeed();
  for (let attempt = 0; attempt < 12; attempt++) {
    if (seed !== currentSeed && previewFingerprint(buildPreview(template, seed, fast)) !== current)
      return seed;
    seed = makeSeed();
  }
  return seed;
}

// ---------------------------------------------------------------------------
// List snippets

export type Snippet =
  { ok: true; text: string; title?: string; questions: number } | { ok: false; error: string };

const snippets = new WeakMap<QuestionTemplate, Snippet>();

/**
 * Short text shown for a template in lists: the stem of a fixed question, the stem
 * of the default variant of a parametric one, or the passage of a set. Cached.
 */
export function snippetOf(template: QuestionTemplate): Snippet {
  let snippet = snippets.get(template);
  if (!snippet) {
    if (template.kind === 'static') {
      snippet = { ok: true, text: asText(template.question?.stem), questions: 1 };
    } else {
      const preview = buildPreview(template, defaultSeed(template.id), { checks: false });
      if (!preview.ok) snippet = { ok: false, error: preview.error };
      else if (preview.passage) {
        snippet = {
          ok: true,
          text: preview.passage.text,
          ...(preview.passage.title ? { title: preview.passage.title } : {}),
          questions: preview.questions.length,
        };
      } else {
        snippet = {
          ok: true,
          text: preview.questions[0]?.stem ?? '',
          questions: preview.questions.length,
        };
      }
    }
    snippets.set(template, snippet);
  }
  return snippet;
}

/** Questions one instance of the template yields (sets yield several). */
export function questionsPerInstance(template: QuestionTemplate): number {
  return template.kind === 'set' && Number.isFinite(template.size) ? template.size : 1;
}

// ---------------------------------------------------------------------------
// Papers

export interface ChapterExpectation {
  examId: string;
  examName: string;
  /** MCQs of the subject in that paper. */
  sectionCount: number;
  /** Questions from the chapter a generated paper aims for (by syllabus weight). */
  expected: number;
}

/**
 * How many questions of a chapter a generated paper of each current NET type aims
 * for, from the paper blueprint's chapter weights. (Real papers jitter around it,
 * and chapters without templates hand their share to the others.)
 */
export function chapterExpectations(subject: SubjectId, chapterId: string): ChapterExpectation[] {
  const out: ChapterExpectation[] = [];
  for (const exam of EXAM_TYPES) {
    if (exam.era !== 'current') continue;
    for (const section of blueprintFor(exam).sections) {
      if (section.subject !== subject) continue;
      const weights = Object.values(section.chapterWeights).map((w) => Math.max(0, w));
      const total = weights.reduce((a, b) => a + b, 0);
      const weight = Math.max(0, section.chapterWeights[chapterId] ?? 0);
      out.push({
        examId: exam.id,
        examName: exam.name,
        sectionCount: section.count,
        expected: total > 0 ? (section.count * weight) / total : 0,
      });
    }
  }
  return out;
}

const varieties = new WeakMap<QuestionTemplate, boolean>();

/**
 * Whether using a template again yields a new question. The paper generator repeats
 * parametric templates and passage sets (never fixed questions) to cover a shortfall,
 * but only when the repeat differs from what the paper already has; a set with a
 * fixed passage and fixed questions cannot repeat. Probes a few seeds; cached.
 */
export function yieldsNewQuestions(template: QuestionTemplate): boolean {
  if (template.kind === 'static') return false;
  let result = varieties.get(template);
  if (result === undefined) {
    const prints = new Set<string>();
    for (let i = 0; i < 4 && prints.size < 2; i++) {
      try {
        const items = realize(template, createRng(`bank-variety:${template.id}:${i}`));
        prints.add(
          items
            .map(({ question }) => `${asText(question.stem)}␞${asText(question.answer)}`)
            .join('␟'),
        );
      } catch {
        // a run that throws adds no variety
      }
    }
    result = prints.size > 1;
    varieties.set(template, result);
  }
  return result;
}

export interface Readiness {
  /** Most MCQs of the subject in one paper (current papers first, else pre-2025 ones). */
  needed: number;
  /** The paper that needs them. */
  examName: string;
  /** Questions the bank yields without using any template twice. */
  distinct: number;
  /** `needed - distinct`, or 0 when the bank has enough distinct questions. */
  shortfall: number;
  /**
   * Templates that give a new question when reused (see `yieldsNewQuestions`), which
   * generated papers repeat to cover the shortfall. Only counted when there is a
   * shortfall (0 otherwise), because probing every template has a cost.
   */
  reusable: number;
}

/**
 * Whether a subject has enough material for its largest paper section. Fixed
 * questions never repeat within a paper, so a subject with fewer questions than a
 * section needs and no template that yields new questions on reuse makes paper
 * generation fail ("Bank too small"). `null` when no paper tests the subject.
 */
export function paperReadiness(
  subject: SubjectId,
  templates: readonly QuestionTemplate[],
  mix: Mix = mixOf(templates),
): Readiness | null {
  for (const era of ['current', 'legacy'] as const) {
    let best: { count: number; name: string } | undefined;
    for (const exam of EXAM_TYPES) {
      if (exam.era !== era) continue;
      const count = exam.sections
        .filter((s) => s.subject === subject)
        .reduce((a, s) => a + s.count, 0);
      if (count > (best?.count ?? 0)) best = { count, name: exam.name };
    }
    if (best) {
      const distinct = mix.static + mix.dynamic + mix.setQuestions;
      const shortfall = Math.max(0, best.count - distinct);
      return {
        needed: best.count,
        examName: best.name,
        distinct,
        shortfall,
        reusable: shortfall > 0 ? templates.filter(yieldsNewQuestions).length : 0,
      };
    }
  }
  return null;
}

/** Current-era papers that test a subject, with the subject's MCQ count. */
export function papersUsing(subject: SubjectId): {
  current: Array<{ name: string; count: number }>;
  legacy: number;
} {
  const current: Array<{ name: string; count: number }> = [];
  let legacy = 0;
  for (const exam of EXAM_TYPES) {
    const count = exam.sections
      .filter((s) => s.subject === subject)
      .reduce((a, s) => a + s.count, 0);
    if (!count) continue;
    if (exam.era === 'current') current.push({ name: exam.name, count });
    else legacy++;
  }
  return { current, legacy };
}
