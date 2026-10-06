import { SYLLABUS, type SubjectInfo } from '@/config/syllabus';
import type { Difficulty, Paper, Question, SubjectId } from '@/engine/types';
import type { QuestionState } from '@/exam/session';

/**
 * Pure helpers behind the review page: URL state, outcome classification,
 * filtering and the "Report a problem" link. Kept free of React and the DOM so
 * they are trivially testable.
 */

export type Outcome = 'correct' | 'wrong' | 'blank';
export type ReviewFilter = 'all' | 'correct' | 'wrong' | 'blank' | 'review';

export const REVIEW_FILTERS: readonly ReviewFilter[] = [
  'all',
  'correct',
  'wrong',
  'blank',
  'review',
];

export const FILTER_LABELS: Readonly<Record<ReviewFilter, string>> = {
  all: 'All',
  correct: 'Correct',
  wrong: 'Wrong',
  blank: 'Unattempted',
  review: 'Marked for review',
};

/** Lenient spellings accepted in `?filter=` (links from other pages, hand-typed URLs). */
const FILTER_ALIASES: Readonly<Record<string, ReviewFilter>> = {
  all: 'all',
  correct: 'correct',
  right: 'correct',
  wrong: 'wrong',
  incorrect: 'wrong',
  blank: 'blank',
  unattempted: 'blank',
  unanswered: 'blank',
  skipped: 'blank',
  review: 'review',
  marked: 'review',
};

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

/** What the review URL encodes: `?q=<number>&filter=<filter>&subject=<id>`. */
export interface ReviewView {
  filter: ReviewFilter;
  /** Subject id, or null for every subject. Validated against the paper by the page. */
  subject: string | null;
  /** 1-based question number in the paper, or null for "first in the list". */
  number: number | null;
}

export function parseReviewQuery(query: URLSearchParams): ReviewView {
  const filter = FILTER_ALIASES[(query.get('filter') ?? '').trim().toLowerCase()] ?? 'all';
  const subject = query.get('subject')?.trim() || null;
  const raw = (query.get('q') ?? '').trim();
  const number = /^\d{1,4}$/.test(raw) ? Number(raw) : NaN;
  return { filter, subject, number: number >= 1 ? number : null };
}

/** App path (for `href`/`navigate`) of a review view. Defaults are omitted. */
export function reviewPath(id: string, view: ReviewView): string {
  const params = new URLSearchParams();
  if (view.number !== null) params.set('q', String(view.number));
  if (view.filter !== 'all') params.set('filter', view.filter);
  if (view.subject) params.set('subject', view.subject);
  const qs = params.toString();
  return `/review/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`;
}

export function outcomeOf(correct: number, saved: number | null | undefined): Outcome {
  if (saved === null || saved === undefined) return 'blank';
  return saved === correct ? 'correct' : 'wrong';
}

export interface ReviewItem {
  /** 0-based position in the paper. */
  index: number;
  /** 1-based question number as printed. */
  number: number;
  question: Question;
  state: QuestionState;
  outcome: Outcome;
  /** Index into `ReviewModel.sections`. */
  section: number;
}

export interface ReviewSection {
  subject: SubjectId;
  title: string;
  /** First and last question numbers (1-based) of the section. */
  first: number;
  last: number;
}

export interface ReviewModel {
  items: ReviewItem[];
  sections: ReviewSection[];
  /** Subjects in paper order, labelled with their section titles. */
  subjects: Array<{ id: SubjectId; title: string }>;
  /** The paper's per-question time budget (duration / questions); 54 s on a real NET. */
  paceMs: number;
}

const SUBJECTS = SYLLABUS as Readonly<Partial<Record<string, SubjectInfo>>>;

/** `work-energy` -> `Work energy` (fallback label for ids the syllabus does not know). */
export function humanize(id: string): string {
  const text = String(id ?? '')
    .replace(/[-_/]+/g, ' ')
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unknown';
}

export function subjectName(subject: string): string {
  return SUBJECTS[subject]?.name ?? humanize(subject);
}

/** Chapter name from the syllabus; never throws for unknown subjects/chapters. */
export function chapterTitle(subject: string, chapter: string): string {
  return SUBJECTS[subject]?.chapters.find((c) => c.id === chapter)?.name ?? humanize(chapter);
}

const isFiniteInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

/**
 * Archived snapshots come from storage or imported backups, so every field the UI
 * reads is coerced to a safe value instead of trusting the stored shape.
 */
/** A stored answer state with every field coerced to a valid value (missing = unattempted). */
export function normalizeState(raw: unknown): QuestionState {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<QuestionState>;
  return {
    saved: isFiniteInt(s.saved) && s.saved >= 0 ? s.saved : null,
    selected: isFiniteInt(s.selected) && s.selected >= 0 ? s.selected : null,
    review: s.review === true,
    visited: s.visited === true,
    timeMs:
      typeof s.timeMs === 'number' && Number.isFinite(s.timeMs) && s.timeMs > 0 ? s.timeMs : 0,
    revisions: isFiniteInt(s.revisions) && s.revisions > 0 ? s.revisions : 0,
  };
}

export function normalizeQuestion(
  raw: unknown,
  index: number,
  fallbackSubject: SubjectId,
): Question {
  const q = (raw && typeof raw === 'object' ? raw : {}) as Partial<Question>;
  const passage =
    q.passage && typeof q.passage.text === 'string'
      ? {
          ...q.passage,
          part: isFiniteInt(q.passage.part) ? q.passage.part : 1,
          of: isFiniteInt(q.passage.of) ? q.passage.of : 1,
        }
      : undefined;
  return {
    ...q,
    index,
    uid: typeof q.uid === 'string' ? q.uid : `#${index}`,
    templateId: typeof q.templateId === 'string' && q.templateId ? q.templateId : 'unknown',
    templateKind:
      q.templateKind === 'dynamic' || q.templateKind === 'set' ? q.templateKind : 'static',
    subject: typeof q.subject === 'string' && q.subject ? q.subject : fallbackSubject,
    chapter: typeof q.chapter === 'string' ? q.chapter : '',
    difficulty: q.difficulty === 1 || q.difficulty === 3 ? q.difficulty : 2,
    origin: q.origin === 'past-paper' ? 'past-paper' : 'original',
    tags: Array.isArray(q.tags) ? q.tags : [],
    stem: typeof q.stem === 'string' ? q.stem : '',
    options: Array.isArray(q.options)
      ? q.options.map((o) => (typeof o === 'string' ? o : String(o ?? '')))
      : [],
    correct: isFiniteInt(q.correct) ? q.correct : -1,
    explanation: typeof q.explanation === 'string' ? q.explanation : '',
    figure: typeof q.figure === 'string' && q.figure ? q.figure : undefined,
    passage,
  };
}

/**
 * Joins a paper snapshot with the candidate's answers. Defensive about the shape of
 * archived data: missing states count as unattempted, and questions outside every
 * section are grouped under "Other questions" instead of disappearing.
 */
export function buildReviewModel(
  paper: Paper,
  states: readonly QuestionState[] | undefined,
  durationMs?: number,
): ReviewModel {
  const questions = Array.isArray(paper.questions) ? paper.questions : [];
  const raw = (Array.isArray(paper.sections) ? paper.sections : []).filter(
    (s) =>
      s &&
      typeof s.subject === 'string' &&
      isFiniteInt(s.start) &&
      isFiniteInt(s.count) &&
      s.count > 0,
  );
  const answers: readonly unknown[] = Array.isArray(states) ? states : [];
  const sections: ReviewSection[] = raw.map((s) => ({
    subject: s.subject,
    title: s.title || subjectName(s.subject),
    first: s.start + 1,
    last: s.start + s.count,
  }));
  let other = -1;

  const items = questions.map((rawQuestion, index): ReviewItem => {
    let section = raw.findIndex((s) => index >= s.start && index < s.start + s.count);
    const question = normalizeQuestion(
      rawQuestion,
      index,
      raw[section]?.subject ?? raw[0]?.subject ?? 'mathematics',
    );
    const state = normalizeState(answers[index]);
    if (section < 0) {
      if (other < 0) {
        other = sections.length;
        sections.push({
          subject: question.subject,
          title: 'Other questions',
          first: index + 1,
          last: index + 1,
        });
      }
      section = other;
      const group = sections[other] as ReviewSection;
      group.first = Math.min(group.first, index + 1);
      group.last = Math.max(group.last, index + 1);
    }
    return {
      index,
      number: index + 1,
      question,
      state,
      outcome: outcomeOf(question.correct, state.saved),
      section,
    };
  });

  const subjects: ReviewModel['subjects'] = [];
  const addSubject = (id: SubjectId, title: string) => {
    if (!subjects.some((s) => s.id === id)) subjects.push({ id, title });
  };
  for (const s of raw) addSubject(s.subject, s.title || subjectName(s.subject));
  for (const item of items) addSubject(item.question.subject, subjectName(item.question.subject));

  const fallbackDuration = (paper.durationMinutes || 0) * 60_000;
  const duration = durationMs && durationMs > 0 ? durationMs : fallbackDuration;
  return { items, sections, subjects, paceMs: questions.length ? duration / questions.length : 0 };
}

export function matchesFilter(item: ReviewItem, filter: ReviewFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'review') return item.state.review;
  return item.outcome === filter;
}

export function filterItems(
  items: readonly ReviewItem[],
  filter: ReviewFilter,
  subject: string | null,
): ReviewItem[] {
  return items.filter(
    (item) => (!subject || item.question.subject === subject) && matchesFilter(item, filter),
  );
}

/** How many questions each filter would show (within the subject filter). */
export function countFilters(
  items: readonly ReviewItem[],
  subject: string | null,
): Record<ReviewFilter, number> {
  const counts: Record<ReviewFilter, number> = {
    all: 0,
    correct: 0,
    wrong: 0,
    blank: 0,
    review: 0,
  };
  for (const item of items) {
    if (subject && item.question.subject !== subject) continue;
    counts.all++;
    counts[item.outcome]++;
    if (item.state.review) counts.review++;
  }
  return counts;
}

/** Position in `list` of the requested question; the first item when it is not listed; -1 when empty. */
export function resolvePosition(list: readonly ReviewItem[], number: number | null): number {
  if (!list.length) return -1;
  if (number !== null) {
    const position = list.findIndex((item) => item.number === number);
    if (position >= 0) return position;
  }
  return 0;
}

/** `(A)`..`(D)`; an em dash for a missing answer. */
export function optionLetter(index: number | null | undefined): string {
  return isFiniteInt(index) && index >= 0 && index < 26
    ? `(${String.fromCharCode(65 + index)})`
    : '—';
}

/** One sentence describing the outcome, for the banner and screen-reader announcements. */
export function outcomeSentence(item: Pick<ReviewItem, 'outcome' | 'question' | 'state'>): string {
  const key = optionLetter(item.question.correct);
  switch (item.outcome) {
    case 'correct':
      return `Correct. You answered ${key}.`;
    case 'wrong':
      return `Wrong. You answered ${optionLetter(item.state.saved)}; the correct answer is ${key}.`;
    default:
      return `Not attempted. The correct answer is ${key}.`;
  }
}

function excerpt(text: string, max: number): string {
  const flat = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export interface IssueContext {
  paperCode: string;
  bankVersion?: string;
  number: number;
  question: Pick<Question, 'templateId' | 'subject' | 'chapter' | 'stem' | 'options' | 'correct'>;
  /** The candidate's recorded answer, if any. */
  saved: number | null;
}

/**
 * A "new issue" URL for `.github/ISSUE_TEMPLATE/wrong-question.yml`.
 *
 * GitHub ignores `body` for issue forms and instead pre-fills form fields whose ids
 * are passed as parameters, so the context goes into both: `paper` and `problem` for
 * the form, `body` for a plain issue. (The form's `template` field cannot be
 * pre-filled because its id clashes with the `template` parameter that selects the
 * form, which is why the template id is repeated in `problem`.)
 */
export function buildIssueUrl(repoUrl: string, ctx: IssueContext): string {
  const { question } = ctx;
  const reference = `${ctx.paperCode}, Q${ctx.number}`;
  const options = (Array.isArray(question.options) ? question.options : []).map(
    (option, i) =>
      `${optionLetter(i)} ${excerpt(option, 90)}${i === question.correct ? '   <- answer key' : ''}`,
  );
  const details = [
    `Paper: ${ctx.paperCode}${ctx.bankVersion ? ` (question bank ${ctx.bankVersion})` : ''}`,
    `Question: ${ctx.number}`,
    `Template: ${question.templateId}`,
    `Topic: ${subjectName(question.subject)} / ${chapterTitle(question.subject, question.chapter)}`,
    `Answer key: ${optionLetter(question.correct)}${ctx.saved !== null ? ` (I answered ${optionLetter(ctx.saved)})` : ''}`,
    '',
    '```text',
    excerpt(question.stem, 300),
    ...options,
    '```',
    '',
    'What is wrong? (please include the correct answer and your working or a reference)',
    '',
  ].join('\n');
  const params: Array<[string, string]> = [
    ['template', 'wrong-question.yml'],
    ['title', `Problem with ${ctx.paperCode} Q${ctx.number} (${question.templateId})`],
    ['paper', reference],
    ['problem', details],
    ['body', details],
  ];
  const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `${repoUrl.replace(/\/+$/, '')}/issues/new?${query}`;
}
