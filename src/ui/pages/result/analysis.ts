import { type ExamTypeConfig, examTypeById } from '@/config/exams';
import { chapterName, SYLLABUS } from '@/config/syllabus';
import {
  BANK_VERSION,
  type CustomPaperSpec,
  DIFFICULTY_PRESETS,
  encodeSpec,
  optionsToQuery,
} from '@/exam/papers';
import { type ScoreReport, scorePaper, type SubjectTally, type Tally } from '@/exam/scoring';
import type { ExamMode, ExamSession, FinishReason, QuestionState } from '@/exam/session';
import type { AttemptRecord } from '@/exam/store';
import type { Difficulty, Paper, PaperSection, Question, SubjectId } from '@/engine/types';
import { formatPercent, formatQuestionTime, plural } from './format';

/**
 * Pure analysis behind the score report: everything the result page shows is
 * derived here from the archived attempt (paper snapshot + answers), so it can be
 * unit-tested without rendering.
 */

export type Outcome = ScoreReport['outcomes'][number];

/** A real NET allows 180 minutes for 200 MCQs. */
export const NET_MINUTES_PER_QUESTION = 180 / 200;
/** How many weak chapters "Focus next" highlights. */
export const FOCUS_CHAPTERS = 5;
/** Questions per chapter in the focused practice test. */
export const FOCUS_QUESTIONS_PER_CHAPTER = 10;

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};

export interface SubjectRow extends SubjectTally {
  /** Average time per question of the section, in ms. */
  avgMs: number;
  /** Share of the total question time spent in this section (0-100). */
  timeShare: number;
  /** Share of the paper's questions in this section (0-100). */
  questionShare: number;
}

export interface ChapterRow extends Tally {
  key: string;
  subject: SubjectId;
  chapter: string;
  name: string;
  subjectTitle: string;
  /** Marks not earned (wrong + unattempted). */
  lost: number;
  avgMs: number;
}

export interface SlowQuestion {
  /** 0-based index in the paper. */
  index: number;
  /** 1-based question number as shown on the terminal. */
  number: number;
  subjectTitle: string;
  chapterName: string;
  timeMs: number;
  outcome: Outcome;
}

export interface TimingSummary {
  /** Time on the clock when the paper ended (never more than allowed). */
  usedMs: number;
  allowedMs: number;
  remainingMs: number;
  /** Allowed time per question, i.e. the pace that finishes exactly on time. */
  paceMs: number;
  /** Mean time per question over the whole paper. */
  avgMs: number;
  /** Mean time per attempted question. */
  avgAttemptedMs: number;
  /** Questions never opened. */
  unvisited: number;
  timedOut: boolean;
}

export interface SourceTally {
  total: number;
  attempted: number;
  correct: number;
  /** Correct as a percentage of attempted (0-100). */
  accuracy: number;
}

export interface SourceBreakdown {
  pastPaper: SourceTally;
  original: SourceTally;
  randomised: SourceTally;
  fixed: SourceTally;
}

export type PaperKind = 'standard' | 'custom' | 'unknown';

export interface ResultModel {
  /** Attempt id (route parameter). */
  id: string;
  paper: Paper;
  session: ExamSession;
  report: ScoreReport;
  exam: ExamTypeConfig | undefined;
  kind: PaperKind;
  /** A complete paper of a standard NET pattern (e.g. all 200 MCQs). */
  isFullLength: boolean;
  /** Exact NET score percentage (unrounded), as used by the merit aggregate. */
  netPercent: number;
  mode: ExamMode;
  finishReason: FinishReason;
  startedAt: number;
  finishedAt: number;
  candidateName: string;
  /** The question bank has changed since the paper was generated. */
  bankChanged: boolean;
  subjects: SubjectRow[];
  /** Every chapter in the paper, weakest first. */
  chapters: ChapterRow[];
  /** The weakest chapters that lost marks (at most FOCUS_CHAPTERS). */
  focus: ChapterRow[];
  timing: TimingSummary;
  slowest: SlowQuestion[];
  sources: SourceBreakdown;
}

const finite = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Chapter display name; tolerant of subjects missing from the syllabus (old data). */
export function safeChapterName(subject: SubjectId, chapter: string): string {
  return SYLLABUS[subject] ? chapterName(subject, chapter) : chapter;
}

/** Section title for a subject (falls back to the syllabus name). */
export function subjectTitleOf(paper: Pick<Paper, 'sections'>, subject: SubjectId): string {
  return (
    paper.sections.find((s) => s.subject === subject)?.title ?? SYLLABUS[subject]?.name ?? subject
  );
}

/**
 * Orders tallies weakest first: lowest score percentage, then lowest accuracy, then
 * most marks lost, then most questions (bigger chapters matter more).
 */
export function compareWeakness(a: Tally, b: Tally): number {
  return (
    a.percent - b.percent ||
    a.accuracy - b.accuracy ||
    b.total - b.correct - (a.total - a.correct) ||
    b.total - a.total
  );
}

/** Ranks chapter rows weakest first (stable by name). */
export function rankChapters(rows: readonly ChapterRow[]): ChapterRow[] {
  return [...rows].sort((a, b) => compareWeakness(a, b) || a.name.localeCompare(b.name));
}

/** The `count` weakest chapters that actually lost marks. */
export function pickFocus(ranked: readonly ChapterRow[], count = FOCUS_CHAPTERS): ChapterRow[] {
  return ranked.filter((c) => c.lost > 0).slice(0, count);
}

/** The slowest questions (time > 0), slowest first. */
export function slowestQuestions(
  paper: Paper,
  states: readonly Pick<QuestionState, 'timeMs'>[],
  outcomes: readonly Outcome[],
  count = 5,
): SlowQuestion[] {
  return paper.questions
    .map((q, index) => ({ q, index, timeMs: finite(states[index]?.timeMs) }))
    .filter((item) => item.timeMs > 0)
    .sort((a, b) => b.timeMs - a.timeMs || a.index - b.index)
    .slice(0, count)
    .map(({ q, index, timeMs }) => ({
      index,
      number: index + 1,
      subjectTitle: subjectTitleOf(paper, q.subject),
      chapterName: safeChapterName(q.subject, q.chapter),
      timeMs,
      outcome: outcomes[index] ?? 'blank',
    }));
}

function sourceTally(
  paper: Paper,
  outcomes: readonly Outcome[],
  include: (q: Question) => boolean,
): SourceTally {
  let total = 0;
  let attempted = 0;
  let correct = 0;
  paper.questions.forEach((q, i) => {
    if (!include(q)) return;
    total++;
    const outcome = outcomes[i] ?? 'blank';
    if (outcome !== 'blank') attempted++;
    if (outcome === 'correct') correct++;
  });
  return {
    total,
    attempted,
    correct,
    accuracy: attempted ? Math.round((correct / attempted) * 1000) / 10 : 0,
  };
}

function timingOf(
  session: ExamSession,
  paper: Paper,
  report: ScoreReport,
  timedOut: boolean,
): TimingSummary {
  const total = paper.questions.length;
  const allowed = finite(session.durationMs);
  const allowedMs = allowed > 0 ? allowed : Math.max(0, finite(paper.durationMinutes) * 60_000);
  const elapsed = Math.max(0, finite(session.elapsedMs));
  const usedMs = allowedMs > 0 ? Math.min(elapsed, allowedMs) : elapsed;
  let attemptedTime = 0;
  let unvisited = 0;
  paper.questions.forEach((_q, i) => {
    const state = session.questions[i];
    if (report.outcomes[i] !== 'blank') attemptedTime += finite(state?.timeMs);
    if (!state?.visited) unvisited++;
  });
  const { attempted } = report.overall;
  return {
    usedMs,
    allowedMs,
    remainingMs: Math.max(0, allowedMs - usedMs),
    paceMs: total ? allowedMs / total : 0,
    avgMs: total ? report.overall.timeMs / total : 0,
    avgAttemptedMs: attempted ? attemptedTime / attempted : 0,
    unvisited,
    timedOut,
  };
}

const isDifficulty = (value: unknown): value is Difficulty =>
  value === 1 || value === 2 || value === 3;

/**
 * Repairs per-question fields that older or imported records may lack, so scoring
 * never trips over them: an unknown difficulty counts as medium.
 */
function normalizePaper(paper: Paper): Paper {
  if (paper.questions.every((q) => isDifficulty(q.difficulty))) return paper;
  return {
    ...paper,
    questions: paper.questions.map((q) =>
      isDifficulty(q.difficulty) ? q : { ...q, difficulty: 2 },
    ),
  };
}

/** True when the record has the minimum structure the report needs. */
export function isUsableRecord(record: unknown): record is AttemptRecord {
  const r = record as Partial<AttemptRecord> | null | undefined;
  const paper = r?.session?.paper;
  return Boolean(
    paper &&
    Array.isArray(paper.questions) &&
    Array.isArray(paper.sections) &&
    Array.isArray(r?.session?.questions),
  );
}

/** Builds the complete report model for an archived attempt. Throws on unusable data. */
export function analyzeAttempt(record: AttemptRecord, id: string): ResultModel {
  if (!isUsableRecord(record)) throw new Error('The saved attempt is incomplete.');
  const { session, summary } = record;
  const paper = normalizePaper(session.paper);
  const report = scorePaper(paper, session.questions);
  const exam = examTypeById(paper.examType);
  const kind: PaperKind = exam ? 'standard' : paper.examType === 'custom' ? 'custom' : 'unknown';
  const fullCount = exam?.sections.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const finishReason = session.finishReason ?? summary?.finishReason ?? 'submitted';

  const subjects: SubjectRow[] = report.bySubject.map((s) => ({
    ...s,
    avgMs: s.total ? s.timeMs / s.total : 0,
    timeShare: report.overall.timeMs ? (s.timeMs / report.overall.timeMs) * 100 : 0,
    questionShare: report.overall.total ? (s.total / report.overall.total) * 100 : 0,
  }));

  const chapters = rankChapters(
    report.byChapter.map((c) => ({
      ...c,
      key: `${c.subject}/${c.chapter}`,
      name: safeChapterName(c.subject, c.chapter),
      subjectTitle: subjectTitleOf(paper, c.subject),
      lost: c.total - c.correct,
      avgMs: c.total ? c.timeMs / c.total : 0,
    })),
  );

  const createdAt = finite(session.createdAt);
  return {
    id,
    paper,
    session,
    report,
    exam,
    kind,
    isFullLength: Boolean(exam) && paper.questions.length === fullCount,
    netPercent: report.overall.maxScore
      ? (report.overall.score / report.overall.maxScore) * 100
      : 0,
    mode: session.settings?.mode ?? summary?.mode ?? 'exam',
    finishReason,
    startedAt: finite(session.startedAt ?? summary?.startedAt, createdAt),
    finishedAt: finite(session.finishedAt ?? summary?.finishedAt, createdAt),
    candidateName: session.candidate?.name?.trim() || summary?.candidateName || 'Candidate',
    bankChanged: Boolean(paper.bankVersion) && paper.bankVersion !== BANK_VERSION,
    subjects,
    chapters,
    focus: pickFocus(chapters),
    timing: timingOf(session, paper, report, finishReason === 'timeout'),
    slowest: slowestQuestions(paper, session.questions, report.outcomes),
    sources: {
      pastPaper: sourceTally(paper, report.outcomes, (q) => q.origin === 'past-paper'),
      original: sourceTally(paper, report.outcomes, (q) => q.origin !== 'past-paper'),
      randomised: sourceTally(paper, report.outcomes, (q) => q.templateKind !== 'static'),
      fixed: sourceTally(paper, report.outcomes, (q) => q.templateKind === 'static'),
    },
  };
}

/** `analyzeAttempt` that reports failures instead of throwing (for rendering). */
export function analyzeSafely(
  record: AttemptRecord,
  id: string,
): { model: ResultModel; error?: undefined } | { model?: undefined; error: string } {
  try {
    return { model: analyzeAttempt(record, id) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

// ---------------------------------------------------------------------------
// Links (app paths without the leading `#`; wrap them with `href()`).
// ---------------------------------------------------------------------------

export function reviewPath(id: string, questionNumber?: number): string {
  const base = `/review/${encodeURIComponent(id)}`;
  return questionNumber ? `${base}?q=${questionNumber}` : base;
}

/** Regenerates the same paper code (standard patterns only). */
export function retakePath(model: Pick<ResultModel, 'kind' | 'paper'>): string | null {
  if (model.kind !== 'standard') return null;
  return `/new?${new URLSearchParams({ type: model.paper.examType, seed: model.paper.seed })}`;
}

/** Printable paper with answer key (standard patterns only: custom codes cannot be rebuilt). */
export function printPath(model: Pick<ResultModel, 'kind' | 'paper'>): string | null {
  if (model.kind !== 'standard') return null;
  const query = new URLSearchParams({ type: model.paper.examType });
  return `/paper/${encodeURIComponent(model.paper.code)}?${query}`;
}

/** A fresh paper of the same pattern. */
export function newPaperPath(model: Pick<ResultModel, 'kind' | 'paper'>): string {
  return model.kind === 'standard'
    ? `/new?${new URLSearchParams({ type: model.paper.examType })}`
    : '/new';
}

/** A tougher paper of the same pattern (used when nothing was lost). */
export function harderPaperPath(model: Pick<ResultModel, 'kind' | 'paper'>): string | null {
  if (model.kind !== 'standard') return null;
  const query = new URLSearchParams({ type: model.paper.examType });
  optionsToQuery({ difficultyMix: DIFFICULTY_PRESETS.harder }, query);
  return `/new?${query}`;
}

/**
 * The settings of a custom (or unrecognised) paper, so it can be practised again with
 * new questions. Chapters are the ones the paper drew from; a section that covered
 * every chapter of its subject is left unrestricted.
 */
export function specFromPaper(paper: Paper, durationMs?: number): CustomPaperSpec {
  const minutes = durationMs && durationMs > 0 ? durationMs / 60_000 : paper.durationMinutes;
  return {
    title: paper.title,
    durationMinutes: Math.max(1, Math.round(finite(minutes, 60))),
    sections: paper.sections
      .filter((s) => s.count > 0)
      .map((s) => {
        const drawn = [
          ...new Set(paper.questions.slice(s.start, s.start + s.count).map((q) => q.chapter)),
        ];
        const all = SYLLABUS[s.subject]?.chapters.map((c) => c.id) ?? [];
        const coversAll = all.length > 0 && all.every((id) => drawn.includes(id));
        const defaultTitle = SYLLABUS[s.subject]?.name;
        return {
          subject: s.subject,
          count: s.count,
          ...(coversAll || !drawn.length ? {} : { chapters: drawn }),
          ...(s.title && s.title !== defaultTitle ? { title: s.title } : {}),
        };
      }),
  };
}

export function customPracticePath(spec: CustomPaperSpec): string {
  return `/new?${new URLSearchParams({ type: 'custom', spec: encodeSpec(spec) })}`;
}

/** "Practise again" for custom / unrecognised papers (new questions, same settings). */
export function practiseAgainPath(
  model: Pick<ResultModel, 'kind' | 'paper' | 'session'>,
): string | null {
  if (model.kind === 'standard' || !model.paper.sections.length) return null;
  return customPracticePath(specFromPaper(model.paper, model.session.durationMs));
}

/**
 * A custom test that drills the focus chapters: FOCUS_QUESTIONS_PER_CHAPTER questions
 * each, grouped by subject in paper order, timed at the real NET pace. Chapters that
 * are no longer in the syllabus (old records) are skipped, since they cannot be drawn.
 */
export function focusPracticeSpec(
  focus: readonly Pick<ChapterRow, 'subject' | 'chapter'>[],
  sections: readonly Pick<PaperSection, 'subject'>[] = [],
): CustomPaperSpec | null {
  const usable = focus.filter((c) =>
    SYLLABUS[c.subject]?.chapters.some((chapter) => chapter.id === c.chapter),
  );
  if (!usable.length) return null;
  const bySubject = new Map<SubjectId, string[]>();
  for (const c of usable) {
    const list = bySubject.get(c.subject) ?? [];
    if (!list.includes(c.chapter)) list.push(c.chapter);
    bySubject.set(c.subject, list);
  }
  const order = (subject: SubjectId) => {
    const i = sections.findIndex((s) => s.subject === subject);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const specSections = [...bySubject.entries()]
    .sort((a, b) => order(a[0]) - order(b[0]))
    .map(([subject, chapters]) => ({
      subject,
      count: Math.min(200, chapters.length * FOCUS_QUESTIONS_PER_CHAPTER),
      chapters,
    }));
  const questions = specSections.reduce((sum, s) => sum + s.count, 0);
  const chapters = specSections.reduce((sum, s) => sum + s.chapters.length, 0);
  return {
    title: `Focus practice: ${plural(chapters, 'weakest chapter')}`,
    durationMinutes: Math.max(5, Math.round(questions * NET_MINUTES_PER_QUESTION)),
    sections: specSections,
  };
}

export function bankPath(subject: SubjectId, chapter: string): string {
  return `/bank?${new URLSearchParams({ subject, chapter })}`;
}

// ---------------------------------------------------------------------------
// Plain-language insights
// ---------------------------------------------------------------------------

/** What the "no negative marking" rule meant for this attempt. */
export function blankInsight(unattempted: number): string {
  if (unattempted <= 0) {
    return 'You attempted every question: the right call when there is no negative marking.';
  }
  if (unattempted === 1) {
    return 'No negative marking: your 1 unattempted question was a lost mark. Even a blind guess is right 1 time in 4.';
  }
  const expected = Math.round(unattempted / 4);
  return `No negative marking: each of your ${unattempted} unattempted questions was a lost mark. Blind guesses are right 1 time in 4, so guessing them all was worth about ${plural(expected, 'mark')} on average.`;
}

/** Compares accuracy across difficulty levels. */
export function difficultyInsight(
  byDifficulty: Readonly<Record<Difficulty, Tally>>,
): string | null {
  const levels = ([1, 2, 3] as const).filter((d) => byDifficulty[d].attempted > 0);
  if (levels.length < 2) return null;
  const sorted = [...levels].sort(
    (a, b) => byDifficulty[b].accuracy - byDifficulty[a].accuracy || a - b,
  );
  const best = sorted[0] as Difficulty;
  const worst = sorted[sorted.length - 1] as Difficulty;
  const bestAcc = byDifficulty[best].accuracy;
  const worstAcc = byDifficulty[worst].accuracy;
  if (bestAcc === worstAcc) {
    return `Your accuracy was the same (${formatPercent(bestAcc)}) at every difficulty level you attempted.`;
  }
  return `Accuracy was highest on ${DIFFICULTY_LABELS[best].toLowerCase()} questions (${formatPercent(bestAcc)}) and lowest on ${DIFFICULTY_LABELS[worst].toLowerCase()} ones (${formatPercent(worstAcc)}).`;
}

/** One sentence on time management. */
export function paceInsight(timing: TimingSummary, unattempted: number): string {
  if (timing.timedOut) {
    return unattempted > 0
      ? `Time ran out with ${plural(unattempted, 'question')} unattempted. Practise moving on from slow questions and coming back to them.`
      : 'Time ran out, but every question had an answer.';
  }
  if (unattempted > 0 && timing.remainingMs >= 60_000) {
    return `You finished with ${formatQuestionTime(timing.remainingMs)} left and ${plural(unattempted, 'question')} blank. With no negative marking, spare time is best spent answering them.`;
  }
  if (timing.paceMs > 0 && timing.avgMs > timing.paceMs * 1.05) {
    return `You averaged ${formatQuestionTime(timing.avgMs)} per question, slower than the ${formatQuestionTime(timing.paceMs)} pace this paper allows.`;
  }
  return `You averaged ${formatQuestionTime(timing.avgMs)} per question against a pace of ${formatQuestionTime(timing.paceMs)}.`;
}
