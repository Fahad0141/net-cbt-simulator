import type { Paper } from '@/engine/types';

/**
 * The exam session state machine.
 *
 * It models the behaviour of the VUTES client used for NUST's computer-based NET:
 * - clicking an option only *selects* it; the answer is recorded when **Save** is
 *   pressed (`requireSave`); leaving the question without saving discards the selection;
 * - **Review** (mark for review) is available once the question has a saved answer;
 * - **Next/Previous** move through the whole paper continuously (crossing sections),
 *   **Next/Previous Section** jump to the first question of the adjacent section,
 *   **First/Last** jump to the first/last question of the paper;
 * - the paper ends when the candidate finishes or the time runs out.
 *
 * The reducer is pure: time is always passed in (`at`, epoch ms) so it is fully testable.
 */

export type ExamMode = 'exam' | 'practice';

export interface QuestionState {
  /** The recorded answer (what is scored), or null. */
  saved: number | null;
  /** The option currently selected on screen (may differ from `saved` until Save). */
  selected: number | null;
  /** Marked for review. */
  review: boolean;
  /** The candidate has opened this question at least once. */
  visited: boolean;
  /** Time spent on this question in ms. */
  timeMs: number;
  /** How many times the recorded answer changed after the first save. */
  revisions: number;
}

export interface Candidate {
  name: string;
  /** Login/user id shown in the header (e.g. `NUST-24-58213`). */
  userId: string;
  /** Short code shown next to the id, e.g. the test centre. */
  centre: string;
}

export interface SessionSettings {
  mode: ExamMode;
  /** Answers are recorded only when Save is pressed (faithful to the real CBT). */
  requireSave: boolean;
  /** Show the question palette (a simulator aid that the real CBT does not have). */
  showPalette: boolean;
  /** Allow pausing the clock (practice mode only). */
  allowPause: boolean;
  /** Reveal the correct answer immediately after saving (practice mode only). */
  instantFeedback: boolean;
  /**
   * Dim/blink the question area after spending the per-question budget
   * (duration / questions = 54 s on a real paper), as candidates report on the CBT.
   * Optional so sessions saved by older versions stay valid (undefined = on).
   */
  pacingBlink?: boolean;
}

export type SessionPhase = 'login' | 'instructions' | 'running' | 'finished';
export type FinishReason = 'submitted' | 'timeout';

export interface ExamSession {
  schema: 1;
  id: string;
  paper: Paper;
  candidate: Candidate;
  settings: SessionSettings;
  phase: SessionPhase;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  finishReason: FinishReason | null;
  /** Allowed duration in ms. */
  durationMs: number;
  /** Time consumed during completed running stretches (pauses split stretches). */
  elapsedMs: number;
  /** Start of the current running stretch, or null while paused / not running. */
  runningSince: number | null;
  /** Index of the question on screen. */
  current: number;
  /** When the current question was entered during the current stretch. */
  enteredAt: number | null;
  questions: QuestionState[];
}

export type SessionAction =
  | { type: 'login'; candidate: Candidate; at: number }
  | { type: 'start'; at: number }
  | { type: 'select'; option: number; at: number }
  | { type: 'save'; at: number }
  | { type: 'clear'; at: number }
  | { type: 'review'; at: number }
  | { type: 'goto'; index: number; at: number }
  | { type: 'next'; at: number }
  | { type: 'previous'; at: number }
  | { type: 'first'; at: number }
  | { type: 'last'; at: number }
  | { type: 'nextSection'; at: number }
  | { type: 'previousSection'; at: number }
  | { type: 'pause'; at: number }
  | { type: 'resume'; at: number }
  | { type: 'tick'; at: number }
  | { type: 'finish'; reason: FinishReason; at: number };

export const DEFAULT_SETTINGS: Record<ExamMode, SessionSettings> = {
  exam: {
    mode: 'exam',
    requireSave: true,
    showPalette: false,
    allowPause: false,
    instantFeedback: false,
    pacingBlink: true,
  },
  practice: {
    mode: 'practice',
    requireSave: false,
    showPalette: true,
    allowPause: true,
    instantFeedback: false,
    pacingBlink: true,
  },
};

export type QuestionFilter = 'all' | 'attempted' | 'unattempted' | 'reviewable';

/** Question indexes matching the terminal's filter dropdown. */
export function filterQuestions(session: ExamSession, filter: QuestionFilter): number[] {
  const out: number[] = [];
  session.questions.forEach((q, i) => {
    if (
      filter === 'all' ||
      (filter === 'attempted' && q.saved !== null) ||
      (filter === 'unattempted' && q.saved === null) ||
      (filter === 'reviewable' && q.review)
    ) {
      out.push(i);
    }
  });
  return out;
}

/** Time spent on the current question so far (ms), including the running stretch. */
export function currentQuestionTimeMs(session: ExamSession, now: number): number {
  const q = session.questions[session.current];
  if (!q) return 0;
  return q.timeMs + (session.enteredAt === null ? 0 : Math.max(0, now - session.enteredAt));
}

export function createSession(params: {
  id: string;
  paper: Paper;
  candidate: Candidate;
  settings: SessionSettings;
  at: number;
  /** Override the paper's duration (custom tests). */
  durationMinutes?: number;
}): ExamSession {
  const { paper } = params;
  return {
    schema: 1,
    id: params.id,
    paper,
    candidate: params.candidate,
    settings: params.settings,
    phase: 'login',
    createdAt: params.at,
    startedAt: null,
    finishedAt: null,
    finishReason: null,
    durationMs: (params.durationMinutes ?? paper.durationMinutes) * 60_000,
    elapsedMs: 0,
    runningSince: null,
    current: 0,
    enteredAt: null,
    questions: paper.questions.map(() => ({
      saved: null,
      selected: null,
      review: false,
      visited: false,
      timeMs: 0,
      revisions: 0,
    })),
  };
}

/** Time used so far in ms. */
export function elapsedMs(session: ExamSession, now: number): number {
  return (
    session.elapsedMs +
    (session.runningSince === null ? 0 : Math.max(0, now - session.runningSince))
  );
}

/** Time left in ms (never negative). */
export function remainingMs(session: ExamSession, now: number): number {
  return Math.max(0, session.durationMs - elapsedMs(session, now));
}

export function isPaused(session: ExamSession): boolean {
  return session.phase === 'running' && session.runningSince === null;
}

/** Index of the section containing question `index`. */
export function sectionIndexOf(session: ExamSession, index: number): number {
  const sections = session.paper.sections;
  for (let s = sections.length - 1; s >= 0; s--) {
    if (index >= (sections[s]?.start ?? 0)) return s;
  }
  return 0;
}

function updateQuestion(
  session: ExamSession,
  index: number,
  patch: Partial<QuestionState>,
): ExamSession {
  const questions = session.questions.slice();
  questions[index] = { ...(questions[index] as QuestionState), ...patch };
  return { ...session, questions };
}

/** Closes the timing of the current question (adds the time spent since `enteredAt`). */
function closeQuestionTimer(session: ExamSession, at: number): ExamSession {
  if (session.enteredAt === null) return session;
  const q = session.questions[session.current] as QuestionState;
  const spent = Math.max(0, at - session.enteredAt);
  return {
    ...updateQuestion(session, session.current, { timeMs: q.timeMs + spent }),
    enteredAt: null,
  };
}

function navigate(session: ExamSession, target: number, at: number): ExamSession {
  const count = session.questions.length;
  if (count === 0) return session;
  const index = Math.min(count - 1, Math.max(0, target));
  if (index === session.current) return session;
  let next = closeQuestionTimer(session, at);
  // Leaving a question without saving discards the on-screen selection.
  const leaving = next.questions[next.current] as QuestionState;
  if (leaving.selected !== leaving.saved) {
    next = updateQuestion(next, next.current, { selected: leaving.saved });
  }
  next = updateQuestion(next, index, { visited: true });
  return { ...next, current: index, enteredAt: next.runningSince === null ? null : at };
}

function saveCurrent(session: ExamSession): ExamSession {
  const q = session.questions[session.current] as QuestionState;
  if (q.selected === null || q.selected === q.saved) return session;
  return updateQuestion(session, session.current, {
    saved: q.selected,
    revisions: q.saved === null ? q.revisions : q.revisions + 1,
  });
}

function finish(session: ExamSession, reason: FinishReason, at: number): ExamSession {
  if (session.phase === 'finished') return session;
  let next = closeQuestionTimer(session, at);
  if (!next.settings.requireSave) next = saveCurrent(next);
  const used = Math.min(next.durationMs, elapsedMs(next, at));
  return {
    ...next,
    phase: 'finished',
    finishedAt: at,
    finishReason: reason,
    elapsedMs: used,
    runningSince: null,
    enteredAt: null,
  };
}

export function sessionReducer(session: ExamSession, action: SessionAction): ExamSession {
  if (session.phase === 'finished') return session;

  // Time is checked on every action, so an expired paper finishes even without ticks.
  // It finishes at the moment time ran out, even when noticed later (the app was in the
  // background or closed), so that wait is not added to the question on screen.
  if (
    session.phase === 'running' &&
    session.runningSince !== null &&
    remainingMs(session, action.at) <= 0
  ) {
    const deadline = session.runningSince + session.durationMs - session.elapsedMs;
    return finish(session, 'timeout', Math.min(action.at, deadline));
  }

  switch (action.type) {
    case 'login':
      return session.phase === 'login'
        ? { ...session, candidate: action.candidate, phase: 'instructions' }
        : session;

    case 'start': {
      if (session.phase !== 'instructions' && session.phase !== 'login') return session;
      const started = {
        ...session,
        phase: 'running' as const,
        startedAt: action.at,
        runningSince: action.at,
        enteredAt: action.at,
      };
      return updateQuestion(started, 0, { visited: true });
    }

    case 'tick':
      return session;

    case 'pause':
      if (
        session.phase !== 'running' ||
        !session.settings.allowPause ||
        session.runningSince === null
      )
        return session;
      return {
        ...closeQuestionTimer(session, action.at),
        elapsedMs: elapsedMs(session, action.at),
        runningSince: null,
      };

    case 'resume':
      if (session.phase !== 'running' || session.runningSince !== null) return session;
      return { ...session, runningSince: action.at, enteredAt: action.at };

    case 'finish':
      if (session.phase !== 'running') return session;
      return finish(session, action.reason, action.at);
  }

  // Remaining actions need a running, unpaused paper.
  if (session.phase !== 'running' || session.runningSince === null) return session;
  const q = session.questions[session.current] as QuestionState;
  const sections = session.paper.sections;
  const sectionIdx = sectionIndexOf(session, session.current);

  switch (action.type) {
    case 'select': {
      if (action.option < 0 || action.option > 3) return session;
      const selected = updateQuestion(session, session.current, { selected: action.option });
      return session.settings.requireSave ? selected : saveCurrent(selected);
    }
    case 'save':
      return saveCurrent(session);
    case 'clear':
      return updateQuestion(session, session.current, {
        selected: null,
        saved: null,
        review: false,
        revisions: q.saved === null ? q.revisions : q.revisions + 1,
      });
    case 'review':
      return q.saved === null && session.settings.requireSave
        ? session
        : updateQuestion(session, session.current, { review: !q.review });
    case 'goto':
      return navigate(session, action.index, action.at);
    case 'next':
      return navigate(session, session.current + 1, action.at);
    case 'previous':
      return navigate(session, session.current - 1, action.at);
    case 'first':
      return navigate(session, 0, action.at);
    case 'last':
      return navigate(session, session.questions.length - 1, action.at);
    case 'nextSection': {
      const target = sections[sectionIdx + 1];
      return target ? navigate(session, target.start, action.at) : session;
    }
    case 'previousSection': {
      const target = sections[sectionIdx - 1];
      return target ? navigate(session, target.start, action.at) : session;
    }
    default:
      return session;
  }
}

/** Which navigation buttons are enabled for the current question (mirrors the CBT). */
export function buttonStates(session: ExamSession) {
  const running = session.phase === 'running' && session.runningSince !== null;
  const q = session.questions[session.current];
  const last = session.questions.length - 1;
  const sectionIdx = sectionIndexOf(session, session.current);
  const sectionCount = session.paper.sections.length;
  return {
    save: running && q !== undefined && q.selected !== null && q.selected !== q.saved,
    review:
      running &&
      q !== undefined &&
      (q.saved !== null || !session.settings.requireSave) &&
      !q.review,
    unreview: running && q !== undefined && q.review,
    next: running && session.current < last,
    previous: running && session.current > 0,
    first: running && session.current > 0,
    last: running && session.current < last,
    nextSection: running && sectionIdx < sectionCount - 1,
    previousSection: running && sectionIdx > 0,
  };
}

export interface ProgressCounts {
  answered: number;
  unanswered: number;
  review: number;
  notVisited: number;
}

export function progressCounts(session: ExamSession): ProgressCounts {
  let answered = 0;
  let review = 0;
  let notVisited = 0;
  for (const q of session.questions) {
    if (q.saved !== null) answered++;
    if (q.review) review++;
    if (!q.visited) notVisited++;
  }
  return { answered, unanswered: session.questions.length - answered, review, notVisited };
}
