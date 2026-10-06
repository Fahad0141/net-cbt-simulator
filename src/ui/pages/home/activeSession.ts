import { examTypeById } from '@/config/exams';
import { type ExamMode, type ExamSession, progressCounts, remainingMs } from '@/exam/session';

/**
 * - `not-started`: the candidate is still on the login / instructions screen;
 * - `running`: the clock is ticking (it keeps running while the tab is closed, as in the real CBT);
 * - `paused`: a practice paper with the clock stopped;
 * - `time-up`: the time ran out while the terminal was closed; opening it submits the paper.
 */
export type ResumeStatus = 'not-started' | 'running' | 'paused' | 'time-up';

export interface ResumeInfo {
  id: string;
  title: string;
  code: string;
  mode: ExamMode;
  status: ResumeStatus;
  remainingMs: number;
  /** Whole minutes left, rounded up like the terminal clock. */
  minutesLeft: number;
  answered: number;
  review: number;
  total: number;
}

const RESUMABLE_PHASES: ReadonlySet<string> = new Set(['login', 'instructions', 'running']);

/** A stored session that can be resumed (and is complete enough to describe safely). */
export function isResumable(session: unknown): session is ExamSession {
  if (!session || typeof session !== 'object') return false;
  const s = session as Partial<ExamSession>;
  return (
    typeof s.phase === 'string' &&
    RESUMABLE_PHASES.has(s.phase) &&
    typeof s.id === 'string' &&
    !!s.paper &&
    typeof s.paper.code === 'string' &&
    Array.isArray(s.paper.questions) &&
    Array.isArray(s.questions) &&
    Number.isFinite(s.durationMs) &&
    Number.isFinite(s.elapsedMs) &&
    (s.runningSince === null || Number.isFinite(s.runningSince))
  );
}

/** What the dashboard says about a test in progress at time `now`. */
export function describeSession(session: ExamSession, now: number): ResumeInfo {
  const remaining =
    session.phase === 'running'
      ? remainingMs(session, now)
      : Math.max(0, session.durationMs - session.elapsedMs);
  let status: ResumeStatus;
  if (session.phase !== 'running') status = 'not-started';
  else if (remaining <= 0) status = 'time-up';
  else if (session.runningSince === null) status = 'paused';
  else status = 'running';

  const counts = progressCounts(session);
  return {
    id: session.id,
    title: examTypeById(session.paper.examType)?.name ?? session.paper.title,
    code: session.paper.code,
    mode: session.settings?.mode === 'practice' ? 'practice' : 'exam',
    status,
    remainingMs: remaining,
    minutesLeft: Math.ceil(remaining / 60_000),
    answered: counts.answered,
    review: counts.review,
    total: session.questions.length,
  };
}
