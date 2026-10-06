import type { Paper } from '@/engine/types';
import { createRng } from '@/engine/rng';
import {
  type Candidate,
  createSession,
  DEFAULT_SETTINGS,
  type ExamMode,
  type ExamSession,
} from './session';
import { newSessionId, saveActiveSession } from './store';

const CENTRES = ['ISB-H12', 'ISB-SEECS', 'ISB-NBS', 'QTA-CBNET', 'ISB-SMME', 'ISB-SCME'];

/** A plausible candidate identity for the terminal header (derived from the session id). */
export function makeCandidate(
  name: string,
  sessionId: string,
  year = new Date().getFullYear(),
): Candidate {
  const rng = createRng(`candidate|${sessionId}`);
  const roll = String(rng.int(10000, 99999));
  return {
    name: name.trim() || 'Candidate',
    userId: `NET${String(year).slice(-2)}-${roll}`,
    centre: rng.pick(CENTRES),
  };
}

export interface BeginOptions {
  mode: ExamMode;
  candidateName: string;
  /** Override the paper's duration (custom tests). */
  durationMinutes?: number;
  /** Practice-mode overrides. */
  instantFeedback?: boolean;
}

/** Creates a session for `paper`, makes it the active session and returns it. */
export function beginPaper(paper: Paper, options: BeginOptions): ExamSession {
  const id = newSessionId();
  const settings = {
    ...DEFAULT_SETTINGS[options.mode],
    ...(options.mode === 'practice' && options.instantFeedback !== undefined
      ? { instantFeedback: options.instantFeedback }
      : {}),
  };
  const session = createSession({
    id,
    paper,
    candidate: makeCandidate(options.candidateName, id),
    settings,
    at: Date.now(),
    ...(options.durationMinutes ? { durationMinutes: options.durationMinutes } : {}),
  });
  if (!saveActiveSession(session)) {
    throw new Error('Could not save the session: browser storage is full or disabled.');
  }
  return session;
}
