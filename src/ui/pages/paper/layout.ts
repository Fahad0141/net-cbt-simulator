import { examTypeById } from '@/config/exams';
import { type Inline, parseRich } from '@/engine/rich';
import type { Difficulty, Paper, PaperSection, Question } from '@/engine/types';

/** Option letters as printed on the paper, the answer sheet and the key. */
export const LETTERS = ['A', 'B', 'C', 'D'] as const;

export const letterOf = (index: number): string => LETTERS[index] ?? '?';

export const DIFFICULTY_LABEL: Readonly<Record<Difficulty, string>> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

/** `12–40`, or `7` for a single question. */
export function rangeLabel(from: number, to: number): string {
  return from === to ? String(from) : `${from}–${to}`;
}

/** 1-based first and last question numbers of a section. */
export function sectionRange(section: PaperSection): { from: number; to: number } {
  return { from: section.start + 1, to: section.start + section.count };
}

export function sectionQuestions(paper: Paper, section: PaperSection): Question[] {
  return paper.questions.slice(section.start, section.start + section.count);
}

/** A printable unit: a lone question, or a passage followed by the questions on it. */
export type PaperBlock =
  | { kind: 'question'; question: Question }
  | { kind: 'passage'; id: string; title?: string; text: string; questions: Question[] };

/**
 * Groups consecutive questions that share a passage, so the passage is printed once
 * before its questions instead of being repeated for every question.
 */
export function groupBlocks(questions: readonly Question[]): PaperBlock[] {
  const blocks: PaperBlock[] = [];
  for (const question of questions) {
    const passage = question.passage;
    if (!passage) {
      blocks.push({ kind: 'question', question });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.kind === 'passage' && last.id === passage.id) {
      last.questions.push(question);
    } else {
      blocks.push({
        kind: 'passage',
        id: passage.id,
        text: passage.text,
        questions: [question],
        ...(passage.title ? { title: passage.title } : {}),
      });
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Option layout
// ---------------------------------------------------------------------------

/** Approximate printed width of a LaTeX fragment, in characters. */
export function texWidth(tex: string): number {
  let s = tex;
  // A fraction is about as wide as its wider part (innermost fractions first).
  for (let pass = 0; pass < 4; pass++) {
    const next = s.replace(
      /\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
      (_m, a: string, b: string) => 'x'.repeat(Math.max(1, texWidth(a), texWidth(b))),
    );
    if (next === s) break;
    s = next;
  }
  // Scripts are set smaller.
  s = s.replace(/[_^]\{([^{}]*)\}/g, (_m, inner: string) =>
    'x'.repeat(Math.ceil(texWidth(inner) * 0.7)),
  );
  s = s
    .replace(/\\(?:left|right|[bB]igg?|displaystyle|textstyle|limits|nolimits)(?![a-zA-Z])/g, '')
    .replace(/\\(?:quad|qquad)(?![a-zA-Z])/g, '  ')
    .replace(/\\[,;:!> ]/g, ' ')
    // Any other command (\alpha, \times, \sqrt, \mathrm, ...) is roughly one glyph.
    .replace(/\\[a-zA-Z]+/g, 'x')
    .replace(/[{}^_\s~]/g, '');
  return s.length;
}

function inlineWidth(nodes: readonly Inline[]): number {
  let total = 0;
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
      case 'code':
        total += node.value.length;
        break;
      case 'math':
        total += texWidth(node.value);
        break;
      case 'strong':
      case 'underline':
        total += inlineWidth(node.children);
        break;
      case 'break':
        return Number.POSITIVE_INFINITY;
    }
  }
  return total;
}

/**
 * Approximate printed width of a rich-text option, in characters. Anything that
 * cannot sit on one line (display math, tables, code blocks, line breaks) is infinite.
 */
export function optionWidth(text: string): number {
  const { blocks } = parseRich(text);
  const only = blocks[0];
  if (blocks.length !== 1 || only?.type !== 'paragraph') return Number.POSITIVE_INFINITY;
  return inlineWidth(only.children);
}

export type OptionColumns = 1 | 2 | 4;

/** Widest option (in characters) that still fits four to a row / two to a row on A4. */
export const FOUR_UP_MAX = 13;
export const TWO_UP_MAX = 34;

/**
 * How many options to print per row. With side-by-side options enabled, very short
 * options share one line, typical ones go two per row and long ones stay stacked.
 */
export function optionColumns(options: readonly string[], sideBySide: boolean): OptionColumns {
  if (!sideBySide) return 1;
  const widest = Math.max(0, ...options.map(optionWidth));
  if (widest <= FOUR_UP_MAX) return 4;
  if (widest <= TWO_UP_MAX) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Answer sheet and key
// ---------------------------------------------------------------------------

export interface SheetColumn {
  /** 1-based, inclusive. */
  from: number;
  to: number;
}

/**
 * Splits `total` questions into answer-sheet columns: at most five columns per page
 * and at most 40 rows per column (a 200-question paper fits one A4 page).
 */
export function answerSheetColumns(total: number, maxRows = 40, columnsPerPage = 5): SheetColumn[] {
  if (total <= 0) return [];
  const rows = Math.min(maxRows, Math.max(10, Math.ceil(total / columnsPerPage / 10) * 10));
  const columns: SheetColumn[] = [];
  for (let from = 1; from <= total; from += rows)
    columns.push({ from, to: Math.min(total, from + rows - 1) });
  return columns;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Titles and summary
// ---------------------------------------------------------------------------

export interface PaperHeading {
  /** Cover title, e.g. `NET Engineering — Full Length Paper`. */
  title: string;
  /** Short name for the browser tab and running heads, e.g. `NET Engineering`. */
  shortName: string;
  /** Line above the title. */
  kicker: string;
  /** Test title as shown on the CBT terminal. */
  subtitle?: string;
  /** Which NET pattern the paper follows. */
  pattern?: string;
  custom: boolean;
}

export function paperHeading(paper: Pick<Paper, 'examType' | 'title'>): PaperHeading {
  const exam = examTypeById(paper.examType);
  if (!exam) {
    const title = paper.title.trim() || 'Custom Practice Test';
    return { title, shortName: title, kicker: 'Custom practice paper', custom: true };
  }
  // Legacy names read "Engineering — pre-2025 pattern": print "NET Engineering (pre-2025 pattern)"
  // so the title never has two dashes and always names the test.
  const [base = exam.name, ...qualifiers] = exam.name.split(/\s+[—–]\s+/);
  const named = /^NET\b/.test(base) ? base : `NET ${base}`;
  const shortName = qualifiers.length ? `${named} (${qualifiers.join(', ')})` : named;
  return {
    title: `${shortName} — Full Length Paper`,
    shortName,
    kicker: 'Full Length Paper (FLP)',
    subtitle: exam.cbtTitle,
    pattern:
      exam.era === 'current'
        ? 'Current pattern (NET-2025 onwards)'
        : 'Pre-2025 pattern (legacy practice)',
    custom: false,
  };
}

export interface PaperComposition {
  total: number;
  /** Questions generated from parametric templates (fresh values every paper). */
  parametric: number;
  pastPaper: number;
  /** Easy, medium, hard. */
  difficulty: [number, number, number];
  passages: number;
  figures: number;
}

export function paperComposition(paper: Paper): PaperComposition {
  const difficulty: [number, number, number] = [0, 0, 0];
  const passages = new Set<string>();
  let parametric = 0;
  let pastPaper = 0;
  let figures = 0;
  for (const q of paper.questions) {
    if (q.templateKind !== 'static') parametric++;
    if (q.origin === 'past-paper') pastPaper++;
    if (q.figure) figures++;
    if (q.passage) passages.add(q.passage.id);
    const d = q.difficulty - 1;
    if (d >= 0 && d < 3) difficulty[d] = (difficulty[d] as number) + 1;
  }
  return {
    total: paper.questions.length,
    parametric,
    pastPaper,
    difficulty,
    passages: passages.size,
    figures,
  };
}

/** `5 October 2026` in the reader's locale. */
export function formatLongDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Footer printed at the end of the paper and in the margin of every printed page. */
export const footerText = (code: string): string =>
  `Generated by NET CBT Simulator (unofficial) · Paper code ${code}`;

/** Plural helper: `1 question`, `2 questions`. */
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;
