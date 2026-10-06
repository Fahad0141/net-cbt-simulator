import { useCallback, useEffect, useState } from 'react';
import { type AttemptRecord, type AttemptSummary, getAttempt, listAttempts } from '@/exam/store';

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
}

/** Runs an async function on mount / when `deps` change. */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({
    loading: true,
  });
  const [nonce, setNonce] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    run().then(
      (data) => !cancelled && setState({ data, loading: false }),
      (error: unknown) =>
        !cancelled &&
        setState({
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [run, nonce]);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    reload: () => setNonce((n) => n + 1),
  };
}

/** All archived attempts, newest first. */
export function useAttempts(): AsyncState<AttemptSummary[]> {
  return useAsync(listAttempts, []);
}

/** One archived attempt (full paper snapshot + answers). */
export function useAttempt(id: string): AsyncState<AttemptRecord | undefined> {
  return useAsync(() => getAttempt(id), [id]);
}
