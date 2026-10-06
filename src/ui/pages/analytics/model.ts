import { SYLLABUS } from '@/config/syllabus';
import type { Difficulty, SubjectId } from '@/engine/types';
import { type CustomPaperSpec, encodeSpec } from '@/exam/papers';
import { scorePaper, type Tally } from '@/exam/scoring';
import type { ExamMode } from '@/exam/session';
import type { AttemptRecord } from '@/exam/store';
import { dayKey, finite, shiftDay } from './format';

/**
 * Pure analytics over archived attempts.
 *
 * Every attempt is re-scored from its own paper snapshot with `scorePaper`, so the
 * numbers always agree with the result and review pages, and then reduced to a small
 * digest (question text is dropped). The page filters digests and aggregates them here.
 */

/** Official NET pace: 180 minutes for 200 MCQs, i.e. 54 seconds per question. */
export const NET_SECONDS_PER_QUESTION = (180 * 60) / 200;
/** A chapter gets a mastery rating only after this many questions. */
export const MIN_QUESTIONS_FOR_RATING = 3;
/** How many chapters the focus list recommends at most. */
export const FOCUS_LIMIT = 5;
/** Questions per chapter in the combined weak-chapter practice test. */
export const PRACTICE_PER_CHAPTER = 10;
/** Questions in a single-chapter drill. */
export const DRILL_QUESTIONS = 15;

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
};
const LEVELS = [1, 2, 3] as const satisfies readonly Difficulty[];

export interface Counts {
  /** Questions in the paper(s). */
  total: number;
  /** Questions answered. */
  attempted: number;
  correct: number;
  wrong: number;
  /** Questions left blank (skipped or never reached). */
  unattempted: number;
  timeMs: number;
}

export interface SubjectCounts extends Counts {
  subject: SubjectId;
  /** Questions the candidate opened at least once. */
  visited: number;
}

export interface ChapterCounts extends Counts {
  subject: SubjectId;
  chapter: string;
  /**
   * Questions the candidate actually saw: answered, or opened and skipped. Questions
   * never reached (time ran out, paper submitted early) say nothing about the chapter.
   */
  seen: number;
}

/** What analytics keeps from one archived attempt. */
export interface AttemptDigest {
  id: string;
  paperCode: string;
  examType: string;
  title: string;
  mode: ExamMode;
  finishedAt: number;
  elapsedMs: number;
  score: number;
  maxScore: number;
  percent: number;
  overall: Counts;
  subjects: SubjectCounts[];
  chapters: ChapterCounts[];
  difficulty: Record<Difficulty, Counts>;
}

const emptyCounts = (): Counts => ({
  total: 0,
  attempted: 0,
  correct: 0,
  wrong: 0,
  unattempted: 0,
  timeMs: 0,
});

function addCounts(into: Counts, from: Counts): void {
  into.total += from.total;
  into.attempted += from.attempted;
  into.correct += from.correct;
  into.wrong += from.wrong;
  into.unattempted += from.unattempted;
  into.timeMs += from.timeMs;
}

const countsOf = (t: Tally): Counts => ({
  total: t.total,
  attempted: t.attempted,
  correct: t.correct,
  wrong: t.wrong,
  unattempted: t.unattempted,
  timeMs: t.timeMs,
});

/** `part` as a percentage of `whole` with one decimal, or null when `whole` is zero. */
export function percentOf(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

type SyllabusLookup = Partial<
  Record<string, { name: string; chapters: ReadonlyArray<{ id: string; name: string }> }>
>;
const syllabus = SYLLABUS as SyllabusLookup;

function humanize(id: string): string {
  const words = id.replace(/[-_/]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Unknown';
}

/** Display name of a subject id (tolerates ids from newer or older bank versions). */
export function subjectName(subject: string): string {
  return syllabus[subject]?.name ?? humanize(subject);
}

/** Display name of a chapter id within a subject. */
export function chapterTitle(subject: string, chapter: string): string {
  return syllabus[subject]?.chapters.find((c) => c.id === chapter)?.name ?? humanize(chapter);
}

function chapterOrder(subject: string, chapter: string): number {
  const index = syllabus[subject]?.chapters.findIndex((c) => c.id === chapter) ?? -1;
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

const SUBJECT_ORDER = Object.keys(SYLLABUS);

/** Syllabus position of a subject; unknown subjects (old backups) go last. */
function subjectOrder(subject: string): number {
  const index = SUBJECT_ORDER.indexOf(subject);
  return index < 0 ? SUBJECT_ORDER.length : index;
}

/**
 * Whether the current syllabus still has this chapter, so a custom practice test can
 * target it (attempts imported from older bank versions may use retired chapter ids).
 */
export function isPractisable(subject: string, chapter: string): boolean {
  return chapterOrder(subject, chapter) !== Number.MAX_SAFE_INTEGER;
}

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value ? value : fallback;

const chapterKey = (subject: string, chapter: string): string => `${subject}/${chapter}`;

/** Re-scores an archived attempt and keeps only what analytics needs. */
export function digestAttempt(record: AttemptRecord): AttemptDigest {
  const { session } = record;
  const summary: Partial<AttemptRecord['summary']> = record.summary ?? {};
  const paper = session.paper;
  const report = scorePaper(paper, session.questions);

  const subjects = new Map<SubjectId, SubjectCounts>();
  const subjectEntry = (subject: SubjectId): SubjectCounts => {
    let entry = subjects.get(subject);
    if (!entry) {
      entry = { ...emptyCounts(), subject, visited: 0 };
      subjects.set(subject, entry);
    }
    return entry;
  };
  for (const tally of report.bySubject) addCounts(subjectEntry(tally.subject), countsOf(tally));
  const seen = new Map<string, number>();
  paper.questions.forEach((question, i) => {
    const state = session.questions[i];
    const opened = Boolean(state && (state.visited || finite(state.timeMs) > 0));
    if (opened) subjectEntry(question.subject).visited++;
    if (opened || report.outcomes[i] !== 'blank') {
      const key = chapterKey(question.subject, question.chapter);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  });

  const mode = session.settings?.mode ?? summary.mode;
  return {
    id: text(session.id, text(summary.id, 'unknown')),
    paperCode: text(paper.code, text(summary.paperCode, '—')),
    examType: text(paper.examType, text(summary.examType, 'unknown')),
    title: text(paper.title, text(summary.title, 'Untitled paper')),
    mode: mode === 'practice' ? 'practice' : 'exam',
    finishedAt: finite(session.finishedAt ?? summary.finishedAt, finite(session.createdAt)),
    elapsedMs: finite(session.elapsedMs, finite(summary.elapsedMs)),
    score: report.overall.score,
    maxScore: report.overall.maxScore,
    percent: report.overall.percent,
    overall: countsOf(report.overall),
    subjects: [...subjects.values()],
    chapters: report.byChapter.map((c) => ({
      ...countsOf(c),
      subject: c.subject,
      chapter: c.chapter,
      seen: seen.get(chapterKey(c.subject, c.chapter)) ?? 0,
    })),
    difficulty: {
      1: countsOf(report.byDifficulty[1]),
      2: countsOf(report.byDifficulty[2]),
      3: countsOf(report.byDifficulty[3]),
    },
  };
}

/* ------------------------------------------------------------------ filters */

export type ModeFilter = 'all' | ExamMode;
export type RangeFilter = 'all' | 'last10' | 'last5';

export interface AnalyticsFilters {
  /** An exam type id, or `all`. */
  examType: string;
  mode: ModeFilter;
  range: RangeFilter;
}

export const DEFAULT_FILTERS: AnalyticsFilters = { examType: 'all', mode: 'all', range: 'all' };

const RANGE_LIMIT: Record<RangeFilter, number> = {
  all: Number.POSITIVE_INFINITY,
  last10: 10,
  last5: 5,
};

/** Attempts (oldest first) matching the filters; a range keeps the most recent matches. */
export function applyFilters(
  attempts: readonly AttemptDigest[],
  filters: AnalyticsFilters,
): AttemptDigest[] {
  const matches = attempts.filter(
    (a) =>
      (filters.examType === 'all' || a.examType === filters.examType) &&
      (filters.mode === 'all' || a.mode === filters.mode),
  );
  const limit = RANGE_LIMIT[filters.range];
  return matches.length > limit ? matches.slice(-limit) : matches;
}

/* ------------------------------------------------------------------ insights */

export interface SubjectInsight extends SubjectCounts {
  name: string;
  /** Correct as a share of answered questions (%), or null when nothing was answered. */
  accuracy: number | null;
  /** Correct as a share of all questions (%). */
  scoreRate: number | null;
  /** Average seconds per question viewed. */
  secondsPerQuestion: number | null;
}

export interface DifficultyInsight extends Counts {
  level: Difficulty;
  label: string;
  accuracy: number | null;
}

export type MasteryLevel = 'strong' | 'developing' | 'weak' | 'unrated';

export interface ChapterInsight extends ChapterCounts {
  /** `subject/chapter`. */
  key: string;
  subjectName: string;
  name: string;
  /** Position in the syllabus, for a natural default order. */
  order: number;
  /** The chapter exists in the current syllabus, so it can be practised. */
  practisable: boolean;
  /** Attempts in which the chapter appeared. */
  papers: number;
  /** Correct as a share of answered questions (%), or null. */
  accuracy: number | null;
  /**
   * Smoothed share of the chapter's *seen* questions answered correctly (0-1). A
   * question opened and skipped counts as a miss (NET has no negative marking, so a
   * blank is simply a lost mark); one never reached does not count at all. Laplace
   * smoothing keeps one lucky question from looking like mastery.
   */
  secured: number;
  level: MasteryLevel;
  /** Accuracy (%) in each attempt where the chapter had answered questions, oldest first. */
  history: number[];
  /** Latest accuracy minus the average of earlier attempts, in percentage points. */
  trend: number | null;
}

export interface Totals {
  attempts: number;
  exam: number;
  practice: number;
  questions: number;
  answered: number;
  correct: number;
  wrong: number;
  unanswered: number;
  accuracy: number | null;
  averagePercent: number | null;
  bestPercent: number | null;
  latestPercent: number | null;
  timeMs: number;
}

export interface Streak {
  /** Consecutive days with a finished attempt, ending today or yesterday. */
  current: number;
  longest: number;
  activeDays: number;
  /** A paper was finished today. */
  today: boolean;
}

export interface Analytics {
  attempts: readonly AttemptDigest[];
  totals: Totals;
  subjects: SubjectInsight[];
  difficulty: DifficultyInsight[];
  chapters: ChapterInsight[];
  /** The weakest rated chapters, weakest first. */
  focus: ChapterInsight[];
  /** Chapters with enough questions for a rating. */
  rated: number;
}

export function securedShare(correct: number, seen: number): number {
  return (correct + 1) / (seen + 2);
}

export function masteryLevel(correct: number, seen: number): MasteryLevel {
  if (seen < MIN_QUESTIONS_FOR_RATING) return 'unrated';
  const share = securedShare(correct, seen);
  return share >= 0.75 ? 'strong' : share >= 0.5 ? 'developing' : 'weak';
}

/** Latest value minus the mean of the earlier ones (rounded points), or null with fewer than two values. */
export function trendOf(history: readonly number[]): number | null {
  if (history.length < 2) return null;
  const earlier = history.slice(0, -1);
  const mean = earlier.reduce((sum, v) => sum + v, 0) / earlier.length;
  return Math.round((history.at(-1) ?? mean) - mean);
}

/** Day streaks from finish times (local calendar days). */
export function computeStreak(times: readonly number[], now: number): Streak {
  const days = new Set(times.map(dayKey));
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of [...days].sort()) {
    run = previous !== null && shiftDay(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  const today = dayKey(now);
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }
  return { current, longest, activeDays: days.size, today: days.has(today) };
}

type ChapterAccumulator = ChapterCounts & { papers: number; history: number[] };

/** Aggregates digests (oldest first) into everything the analytics page shows. */
export function buildAnalytics(attempts: readonly AttemptDigest[]): Analytics {
  const overall = emptyCounts();
  const subjectAcc = new Map<SubjectId, SubjectCounts>();
  const chapterAcc = new Map<string, ChapterAccumulator>();
  const difficulty: Record<Difficulty, Counts> = {
    1: emptyCounts(),
    2: emptyCounts(),
    3: emptyCounts(),
  };
  let exam = 0;
  let timeMs = 0;

  for (const attempt of attempts) {
    addCounts(overall, attempt.overall);
    if (attempt.mode === 'exam') exam++;
    timeMs += attempt.elapsedMs;
    for (const s of attempt.subjects) {
      let acc = subjectAcc.get(s.subject);
      if (!acc) {
        acc = { ...emptyCounts(), subject: s.subject, visited: 0 };
        subjectAcc.set(s.subject, acc);
      }
      addCounts(acc, s);
      acc.visited += s.visited;
    }
    for (const c of attempt.chapters) {
      const key = chapterKey(c.subject, c.chapter);
      let acc = chapterAcc.get(key);
      if (!acc) {
        acc = {
          ...emptyCounts(),
          subject: c.subject,
          chapter: c.chapter,
          seen: 0,
          papers: 0,
          history: [],
        };
        chapterAcc.set(key, acc);
      }
      addCounts(acc, c);
      acc.seen += c.seen;
      acc.papers++;
      const accuracy = percentOf(c.correct, c.attempted);
      if (accuracy !== null) acc.history.push(accuracy);
    }
    for (const level of LEVELS) addCounts(difficulty[level], attempt.difficulty[level]);
  }

  const subjects: SubjectInsight[] = [...subjectAcc.values()]
    .sort(
      (a, b) =>
        subjectOrder(a.subject) - subjectOrder(b.subject) || a.subject.localeCompare(b.subject),
    )
    .map((s) => ({
      ...s,
      name: subjectName(s.subject),
      accuracy: percentOf(s.correct, s.attempted),
      scoreRate: percentOf(s.correct, s.total),
      secondsPerQuestion: s.visited > 0 ? s.timeMs / 1000 / s.visited : null,
    }));

  const chapters: ChapterInsight[] = [...chapterAcc.entries()]
    .map(([key, c]) => ({
      ...c,
      key,
      subjectName: subjectName(c.subject),
      name: chapterTitle(c.subject, c.chapter),
      order: chapterOrder(c.subject, c.chapter),
      practisable: isPractisable(c.subject, c.chapter),
      accuracy: percentOf(c.correct, c.attempted),
      secured: securedShare(c.correct, c.seen),
      level: masteryLevel(c.correct, c.seen),
      trend: trendOf(c.history),
    }))
    .sort(
      (a, b) =>
        subjectOrder(a.subject) - subjectOrder(b.subject) ||
        a.subject.localeCompare(b.subject) ||
        a.order - b.order ||
        a.name.localeCompare(b.name),
    );

  const focus = chapters
    .filter((c) => c.level === 'weak' || c.level === 'developing')
    .sort((a, b) => a.secured - b.secured || b.seen - a.seen || a.name.localeCompare(b.name))
    .slice(0, FOCUS_LIMIT);

  const percents = attempts.map((a) => a.percent);
  const totals: Totals = {
    attempts: attempts.length,
    exam,
    practice: attempts.length - exam,
    questions: overall.total,
    answered: overall.attempted,
    correct: overall.correct,
    wrong: overall.wrong,
    unanswered: overall.unattempted,
    accuracy: percentOf(overall.correct, overall.attempted),
    averagePercent: percents.length
      ? Math.round((percents.reduce((sum, p) => sum + p, 0) / percents.length) * 10) / 10
      : null,
    bestPercent: percents.length ? Math.max(...percents) : null,
    latestPercent: percents.at(-1) ?? null,
    timeMs,
  };

  return {
    attempts,
    totals,
    subjects,
    difficulty: LEVELS.map((level) => ({
      ...difficulty[level],
      level,
      label: DIFFICULTY_LABELS[level],
      accuracy: percentOf(difficulty[level].correct, difficulty[level].attempted),
    })),
    chapters,
    focus,
    rated: chapters.filter((c) => c.level !== 'unrated').length,
  };
}

/* ------------------------------------------------------------------ practice */

/** Minutes for a practice test of `questions` questions at the NET pace (at least 5). */
export function practiceMinutes(questions: number): number {
  return Math.max(5, Math.ceil((questions * NET_SECONDS_PER_QUESTION) / 60));
}

/**
 * A custom practice test on the given chapters (`perChapter` questions each), or null when
 * none of them is in the current syllabus.
 */
export function practiceSpec(
  chapters: ReadonlyArray<Pick<ChapterInsight, 'subject' | 'chapter' | 'name'>>,
  perChapter: number,
): CustomPaperSpec | null {
  const usable = chapters.filter((c) => isPractisable(c.subject, c.chapter));
  if (!usable.length) return null;
  const groups = new Map<SubjectId, string[]>();
  for (const c of usable) {
    const ids = groups.get(c.subject) ?? [];
    if (!ids.includes(c.chapter)) ids.push(c.chapter);
    groups.set(c.subject, ids);
  }
  const sections = [...groups].map(([subject, ids]) => ({
    subject,
    count: Math.min(200, ids.length * perChapter),
    chapters: ids,
  }));
  const questions = sections.reduce((sum, s) => sum + s.count, 0);
  const only = usable.length === 1 ? usable[0] : undefined;
  return {
    title: only ? `Practice: ${only.name}` : 'Practice: weakest chapters',
    durationMinutes: practiceMinutes(questions),
    sections,
  };
}

/** App path that opens the custom-paper setup pre-filled with `spec`. */
export function practicePath(spec: CustomPaperSpec): string {
  return `/new?type=custom&spec=${encodeSpec(spec)}`;
}

/** Path of a single-chapter drill, or null when the chapter cannot be practised any more. */
export function drillPath(
  chapter: Pick<ChapterInsight, 'subject' | 'chapter' | 'name'>,
): string | null {
  const spec = practiceSpec([chapter], DRILL_QUESTIONS);
  return spec ? practicePath(spec) : null;
}
