import { useEffect, useState } from 'react';

type Cancel = () => void;

/** Runs `callback` when the browser is idle (or soon, where idle callbacks are missing). */
function whenIdle(callback: () => void): Cancel {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function' && typeof w.cancelIdleCallback === 'function') {
    const id = w.requestIdleCallback(callback, { timeout: 150 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, 16);
  return () => window.clearTimeout(id);
}

export interface IncrementalOptions {
  /** Items rendered in the first pass. */
  initial?: number;
  /** Items added per idle slice. */
  step?: number;
  /** Render everything immediately (e.g. right before printing). */
  all?: boolean;
}

/**
 * How many of `total` items to render now. Long documents paint their first page
 * at once and fill in the rest during idle time, so a 200-question paper never
 * blocks the main thread for long; `all` switches to rendering everything.
 */
export function useIncrementalCount(
  total: number,
  { initial = 24, step = 32, all = false }: IncrementalOptions = {},
): number {
  const [count, setCount] = useState(initial);
  const target = all ? total : Math.min(count, total);

  useEffect(() => {
    if (all || count >= total) return;
    return whenIdle(() => setCount((c) => c + step));
  }, [all, count, total, step]);

  return target;
}
