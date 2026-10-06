import { useCallback, useEffect, useState } from 'react';
import type { ExamSession } from '@/exam/session';
import { loadActiveSession } from '@/exam/store';
import { isResumable } from './activeSession';

/** Sets `document.title` while the page is shown. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

function readActiveSession(): ExamSession | null {
  try {
    const session = loadActiveSession();
    return isResumable(session) ? session : null;
  } catch {
    return null;
  }
}

export interface ActiveSessionState {
  session: ExamSession | null;
  /** Re-reads the stored session (after this tab changed it). */
  refresh: () => void;
  /**
   * Increases whenever storage may have changed elsewhere (another tab wrote the
   * session, or this tab became visible again), so callers can re-read other data too.
   */
  revision: number;
}

/**
 * The resumable test in progress, if any. Re-reads storage when another tab changes
 * it (e.g. the paper is finished in a second window) and when this tab becomes visible.
 */
export function useActiveSession(): ActiveSessionState {
  const [session, setSession] = useState<ExamSession | null>(readActiveSession);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setSession(readActiveSession()), []);

  useEffect(() => {
    const external = () => {
      refresh();
      setRevision((n) => n + 1);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith('net-cbt:')) external();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') external();
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return { session, refresh, revision };
}

/** Wall-clock time in ms, refreshed every `intervalMs` while `enabled`. */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}
