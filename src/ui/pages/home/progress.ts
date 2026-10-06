import { examTypeById } from '@/config/exams';
import type { AttemptSummary } from '@/exam/store';

export interface ProgressSummary {
  count: number;
  examCount: number;
  practiceCount: number;
  /** Highest percentage (the most recent one on a tie). */
  best: AttemptSummary;
  /** Mean percentage, one decimal. */
  averagePercent: number;
  latest: AttemptSummary;
  /** Latest minus the previous attempt in percentage points; null with one attempt. */
  change: number | null;
  /** Time spent across all attempts. */
  totalTimeMs: number;
  /** Percentages of the most recent attempts, oldest first. */
  trend: number[];
  /** The most recent attempts, newest first. */
  recent: AttemptSummary[];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Drops records that are too damaged to display (old or hand-edited storage). */
function isUsable(attempt: AttemptSummary | null | undefined): attempt is AttemptSummary {
  return (
    !!attempt &&
    typeof attempt.id === 'string' &&
    attempt.id.length > 0 &&
    Number.isFinite(attempt.percent) &&
    Number.isFinite(attempt.finishedAt)
  );
}

/** Dashboard numbers for a list of attempts; null when there is nothing to show. */
export function summarizeProgress(
  attempts: readonly AttemptSummary[] | undefined,
  { recentSize = 5, trendSize = 12 }: { recentSize?: number; trendSize?: number } = {},
): ProgressSummary | null {
  const sorted = (attempts ?? []).filter(isUsable).sort((a, b) => b.finishedAt - a.finishedAt);
  const latest = sorted[0];
  if (!latest) return null;

  let best = latest;
  let total = 0;
  let totalTimeMs = 0;
  let examCount = 0;
  for (const attempt of sorted) {
    if (attempt.percent > best.percent) best = attempt;
    total += attempt.percent;
    totalTimeMs += Number.isFinite(attempt.elapsedMs) ? Math.max(0, attempt.elapsedMs) : 0;
    if (attempt.mode !== 'practice') examCount++;
  }
  const previous = sorted[1];

  return {
    count: sorted.length,
    examCount,
    practiceCount: sorted.length - examCount,
    best,
    averagePercent: round1(total / sorted.length),
    latest,
    change: previous ? round1(latest.percent - previous.percent) : null,
    totalTimeMs,
    trend: sorted
      .slice(0, trendSize)
      .map((a) => a.percent)
      .reverse(),
    recent: sorted.slice(0, recentSize),
  };
}

/** `76%`, `64.5%` (at most one decimal). */
export function formatPercent(value: number): string {
  const rounded = round1(Number.isFinite(value) ? value : 0);
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/** Signed change in percentage points: `+6.5 pts`, `−3 pts`, `no change`. */
export function formatChange(points: number): string {
  const rounded = round1(points);
  if (rounded === 0) return 'no change';
  const magnitude = Math.abs(rounded);
  const unit = magnitude === 1 ? 'pt' : 'pts';
  return `${rounded > 0 ? '+' : '−'}${Number.isInteger(magnitude) ? magnitude : magnitude.toFixed(1)} ${unit}`;
}

/** ISO timestamp for `<time dateTime>`, or undefined for an unusable epoch. */
export function isoDate(epoch: number): string | undefined {
  const date = new Date(epoch);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Friendly name of the paper an attempt was taken on. */
export function attemptName(attempt: Pick<AttemptSummary, 'examType' | 'title'>): string {
  return examTypeById(attempt.examType)?.name ?? (attempt.title || 'Practice paper');
}
