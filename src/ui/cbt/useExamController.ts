import { useCallback, useEffect, useRef, useState } from 'react';
import {
  archiveSession,
  clearActiveSession,
  saveActiveSession,
  type AttemptSummary,
} from '@/exam/store';
import { type ExamSession, type SessionAction, sessionReducer } from '@/exam/session';
import { onAppPause } from '@/platform/native';

type ActionInput = SessionAction extends infer A
  ? A extends SessionAction
    ? Omit<A, 'at'>
    : never
  : never;

export interface ExamController {
  session: ExamSession;
  /** Wall clock, refreshed every second while the paper is running. */
  now: number;
  dispatch: (action: ActionInput) => void;
  /** Summary of the archived attempt once the paper is finished. */
  archived: AttemptSummary | null;
  archiveError: string | null;
}

/**
 * Owns an exam session: applies actions, persists after every change, drives the
 * clock (auto-finishing at time-out) and archives the attempt when it ends.
 */
export function useExamController(initial: ExamSession): ExamController {
  const [session, setSession] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [archived, setArchived] = useState<AttemptSummary | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const archiving = useRef(false);
  const latest = useRef(session);

  const dispatch = useCallback((action: ActionInput) => {
    const at = Date.now();
    setNow(at);
    setSession((prev) => sessionReducer(prev, { ...action, at } as SessionAction));
  }, []);

  // Persist every change so a refresh or crash resumes exactly where the candidate was.
  useEffect(() => {
    latest.current = session;
    if (session.phase !== 'finished') saveActiveSession(session);
  }, [session]);

  // Drive the clock while running. It reads the wall clock, so time spent with the app in
  // the background (when timers are suspended) counts, and the next tick ends a paper whose
  // time ran out meanwhile.
  const running = session.phase === 'running';
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      setSession((prev) => sessionReducer(prev, { type: 'tick', at }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Android app: save again when it goes to the background, where the system may kill it.
  useEffect(() => {
    if (!running) return;
    return onAppPause(() => {
      if (latest.current.phase !== 'finished') saveActiveSession(latest.current);
    });
  }, [running]);

  // Warn before closing the tab mid-paper (the attempt is saved either way).
  useEffect(() => {
    if (!running) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [running]);

  // Archive once finished.
  useEffect(() => {
    if (session.phase !== 'finished' || archiving.current) return;
    archiving.current = true;
    archiveSession(session)
      .then((summary) => {
        clearActiveSession();
        setArchived(summary);
      })
      .catch((error: unknown) => {
        archiving.current = false;
        setArchiveError(error instanceof Error ? error.message : String(error));
      });
  }, [session]);

  return { session, now, dispatch, archived, archiveError };
}
