import { formatDuration } from '@/ui/components/ui';

/** `71` -> `71%`, `78.94` -> `78.9%` (non-finite values read as 0%). */
export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0%';
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return `${rounded === 0 ? 0 : rounded}%`;
}

/** Time for a question or an average: `45s`, `1m 05s`; sub-second times read `<1s`. */
export function formatQuestionTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  if (ms < 500) return '<1s';
  return formatDuration(ms);
}

/** `1 question`, `3 questions`. */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Text alternative for an outcome bar: `Correct 142, wrong 38, unattempted 20 of 200 questions`. */
export function outcomeLabel(counts: {
  correct: number;
  wrong: number;
  unattempted: number;
}): string {
  const total = counts.correct + counts.wrong + counts.unattempted;
  return `Correct ${counts.correct}, wrong ${counts.wrong}, unattempted ${counts.unattempted} of ${plural(total, 'question')}`;
}

/** Signed difference in seconds against a target pace, e.g. `+4s` / `-6s` / `on pace`. */
export function formatPaceDelta(ms: number, targetMs: number): string {
  const delta = Math.round((ms - targetMs) / 1000);
  if (delta === 0) return 'on pace';
  return delta > 0 ? `+${delta}s vs pace` : `${delta}s vs pace`.replace('-', '−');
}
