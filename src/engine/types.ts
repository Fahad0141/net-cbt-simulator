import type { Rng } from './rng';

/**
 * Subjects that can appear in a NET paper. Every question template belongs to
 * exactly one subject and one chapter of that subject (see `src/config/syllabus.ts`).
 */
export const SUBJECT_IDS = [
  'mathematics',
  'physics',
  'chemistry',
  'computer',
  'english',
  'biology',
  'quantitative',
  'design',
  'intelligence',
] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];

/** 1 = easy, 2 = medium (typical NET), 3 = hard (top-end NET). */
export type Difficulty = 1 | 2 | 3;

/**
 * Where a template comes from.
 * - `past-paper`: modelled closely on a question reported from a real NET sitting
 *   (rewritten in our own words; values may be randomised).
 * - `original`: an original syllabus question written in NET style.
 */
export type Origin = 'past-paper' | 'original';

/**
 * A single multiple-choice question as written by a template author.
 *
 * All text fields use the project's rich-text syntax (see `src/engine/rich.ts`):
 * `$inline math$`, `$$display math$$`, `**bold**`, `__underline__`, `` `code` ``,
 * fenced code blocks, simple pipe tables and `\n` line breaks. Write LaTeX inside
 * `String.raw` / `tex` template literals so backslashes survive.
 */
export interface AuthoredQuestion {
  /** The question text. */
  stem: string;
  /** The single correct option. */
  answer: string;
  /** Exactly three incorrect options, distinct from each other and from `answer`. */
  distractors: readonly string[];
  /** Worked solution / reasoning shown during review. Required. */
  explanation: string;
  /**
   * Present the options in exactly this order instead of shuffling them.
   * Must be a permutation of `[answer, ...distractors]`. Needed whenever an option
   * refers to other options ("Both (a) and (b)", "None of these", "All of the above").
   */
  fixedOrder?: readonly string[];
  /** Optional trusted SVG markup rendered under the stem (diagrams, graphs, circuits). */
  figure?: string;
}

/** Fields shared by every template kind. */
export interface TemplateMeta {
  /** Globally unique id: `<subject>/<chapter>/<local-id>`. */
  id: string;
  subject: SubjectId;
  /** Chapter id within the subject (a key of the subject's syllabus). */
  chapter: string;
  difficulty: Difficulty;
  origin: Origin;
  /** Free-form topic tags (sub-topics) used by analytics and the bank browser. */
  tags: readonly string[];
}

/** A parametric template: every call with a different RNG yields a new variant. */
export interface DynamicTemplate extends TemplateMeta {
  kind: 'dynamic';
  generate(rng: Rng): AuthoredQuestion;
}

/** A fixed question (options are still shuffled unless `fixedOrder` is set). */
export interface StaticTemplate extends TemplateMeta {
  kind: 'static';
  question: AuthoredQuestion;
}

/** A group of questions that share a passage (e.g. English reading comprehension). */
export interface PassageSet {
  /** Passage text (rich text). Shown above each question of the set. */
  passage: string;
  /** Optional title of the passage. */
  title?: string;
  questions: AuthoredQuestion[];
}

/** A template that yields several consecutive questions sharing one passage. */
export interface SetTemplate extends TemplateMeta {
  kind: 'set';
  /** Number of questions the set always yields. */
  size: number;
  generate(rng: Rng): PassageSet;
}

export type QuestionTemplate = DynamicTemplate | StaticTemplate | SetTemplate;

/** What every `src/bank/<subject>/<chapter>.ts` module default-exports. */
export interface BankModule {
  subject: SubjectId;
  chapter: string;
  templates: QuestionTemplate[];
}

/** A fully generated, ready-to-display question inside a paper. */
export interface Question {
  /** Position in the paper (0-based). */
  index: number;
  /** Stable id of this instance: `<paper code>#<index>`. */
  uid: string;
  templateId: string;
  templateKind: QuestionTemplate['kind'];
  subject: SubjectId;
  chapter: string;
  difficulty: Difficulty;
  origin: Origin;
  tags: readonly string[];
  stem: string;
  /** Exactly four options in display order. */
  options: string[];
  /** Index (0-3) of the correct option in `options`. */
  correct: number;
  explanation: string;
  figure?: string;
  /** Present when the question belongs to a passage set. */
  passage?: { id: string; title?: string; text: string; part: number; of: number };
}

export interface PaperSection {
  subject: SubjectId;
  title: string;
  /** Index of the first question of this section in `Paper.questions`. */
  start: number;
  count: number;
}

export interface Paper {
  /** Human-friendly reproducible code, e.g. `ENG-K7Q2-9XM4`. */
  code: string;
  examType: string;
  seed: string;
  title: string;
  durationMinutes: number;
  /** Version of the question bank the paper was generated from. */
  bankVersion: string;
  sections: PaperSection[];
  questions: Question[];
}
