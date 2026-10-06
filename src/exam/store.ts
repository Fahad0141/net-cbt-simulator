import { kvDelete, kvGet, kvKeys, kvSet, local } from '@/storage/kv';
import type { ExamMode, ExamSession, FinishReason } from './session';
import { scorePaper } from './scoring';

/**
 * Persistence for the exam:
 * - the *active* session lives in localStorage and is written after every action,
 *   so a refresh, crash or accidental tab close never loses an attempt;
 * - finished attempts are archived in IndexedDB with a full paper snapshot, so
 *   results and reviews stay exact even after the question bank changes.
 */

const ACTIVE_KEY = 'net-cbt:active-session';
const INDEX_KEY = 'attempts:index';
const attemptKey = (id: string) => `attempt:${id}`;

export function loadActiveSession(): ExamSession | null {
  const session = local.get<ExamSession>(ACTIVE_KEY);
  return session && session.schema === 1 ? session : null;
}

export function saveActiveSession(session: ExamSession): boolean {
  return local.set(ACTIVE_KEY, session);
}

export function clearActiveSession(): void {
  local.remove(ACTIVE_KEY);
}

export interface SubjectSummary {
  subject: string;
  title: string;
  correct: number;
  attempted: number;
  total: number;
}

export interface AttemptSummary {
  id: string;
  paperCode: string;
  examType: string;
  title: string;
  mode: ExamMode;
  candidateName: string;
  startedAt: number;
  finishedAt: number;
  finishReason: FinishReason;
  elapsedMs: number;
  durationMs: number;
  score: number;
  maxScore: number;
  percent: number;
  attempted: number;
  correct: number;
  wrong: number;
  bySubject: SubjectSummary[];
}

export interface AttemptRecord {
  summary: AttemptSummary;
  session: ExamSession;
}

export function summarize(session: ExamSession): AttemptSummary {
  const report = scorePaper(session.paper, session.questions);
  return {
    id: session.id,
    paperCode: session.paper.code,
    examType: session.paper.examType,
    title: session.paper.title,
    mode: session.settings.mode,
    candidateName: session.candidate.name,
    startedAt: session.startedAt ?? session.createdAt,
    finishedAt: session.finishedAt ?? session.createdAt,
    finishReason: session.finishReason ?? 'submitted',
    elapsedMs: session.elapsedMs,
    durationMs: session.durationMs,
    score: report.overall.score,
    maxScore: report.overall.maxScore,
    percent: report.overall.percent,
    attempted: report.overall.attempted,
    correct: report.overall.correct,
    wrong: report.overall.wrong,
    bySubject: report.bySubject.map((s) => ({
      subject: s.subject,
      title: s.title,
      correct: s.correct,
      attempted: s.attempted,
      total: s.total,
    })),
  };
}

export async function listAttempts(): Promise<AttemptSummary[]> {
  const index = (await kvGet<AttemptSummary[]>(INDEX_KEY)) ?? [];
  return [...index].sort((a, b) => b.finishedAt - a.finishedAt);
}

export async function getAttempt(id: string): Promise<AttemptRecord | undefined> {
  return kvGet<AttemptRecord>(attemptKey(id));
}

/** Archives a finished session (idempotent) and returns its summary. */
export async function archiveSession(session: ExamSession): Promise<AttemptSummary> {
  const summary = summarize(session);
  await kvSet(attemptKey(session.id), { summary, session } satisfies AttemptRecord);
  const index = (await kvGet<AttemptSummary[]>(INDEX_KEY)) ?? [];
  const next = [summary, ...index.filter((a) => a.id !== session.id)];
  await kvSet(INDEX_KEY, next);
  return summary;
}

export async function deleteAttempt(id: string): Promise<void> {
  await kvDelete(attemptKey(id));
  const index = (await kvGet<AttemptSummary[]>(INDEX_KEY)) ?? [];
  await kvSet(
    INDEX_KEY,
    index.filter((a) => a.id !== id),
  );
}

/** Everything the user has, as a JSON-serialisable backup. */
export async function exportHistory(): Promise<{
  format: 'net-cbt-history';
  version: 1;
  attempts: AttemptRecord[];
}> {
  const keys = await kvKeys('attempt:');
  const attempts = (await Promise.all(keys.map((k) => kvGet<AttemptRecord>(k)))).filter(
    (a): a is AttemptRecord => Boolean(a),
  );
  return { format: 'net-cbt-history', version: 1, attempts };
}

const UNSAFE_SVG = /<script|\bon[a-z]+\s*=|javascript:|<foreignObject|<iframe|<object|<embed/i;

/**
 * Validates an imported session's shape and strips anything that could execute:
 * figures are the only HTML injected by the UI, so unsafe SVG is dropped. Returns
 * null when the record is not a usable session.
 */
export function sanitizeImportedSession(value: unknown): ExamSession | null {
  const s = value as ExamSession | undefined;
  if (!s || s.schema !== 1 || typeof s.id !== 'string' || !s.id) return null;
  const paper = s.paper;
  if (!paper || !Array.isArray(paper.questions) || !Array.isArray(paper.sections)) return null;
  if (!Array.isArray(s.questions) || s.questions.length !== paper.questions.length) return null;
  for (const q of paper.questions) {
    if (!q || typeof q.stem !== 'string' || !Array.isArray(q.options) || q.options.length !== 4)
      return null;
    if (!q.options.every((o) => typeof o === 'string') || !Number.isInteger(q.correct)) return null;
    if (
      q.figure !== undefined &&
      (typeof q.figure !== 'string' ||
        !q.figure.trim().startsWith('<svg') ||
        UNSAFE_SVG.test(q.figure))
    ) {
      delete (q as { figure?: string }).figure;
    }
  }
  for (const st of s.questions) {
    if (!st || (st.saved !== null && !Number.isInteger(st.saved)) || typeof st.timeMs !== 'number')
      return null;
  }
  return s;
}

/** Restores a backup produced by `exportHistory` (merges; same ids are overwritten). */
export async function importHistory(data: unknown): Promise<number> {
  const backup = data as { format?: string; attempts?: AttemptRecord[] };
  if (backup?.format !== 'net-cbt-history' || !Array.isArray(backup.attempts)) {
    throw new Error('Not a NET CBT Simulator history file');
  }
  let count = 0;
  for (const record of backup.attempts) {
    const session = sanitizeImportedSession(record?.session);
    if (!session) continue;
    await archiveSession(session);
    count++;
  }
  return count;
}

/** A short random id for sessions. */
export function newSessionId(): string {
  const bytes = new Uint8Array(9);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 14);
}
