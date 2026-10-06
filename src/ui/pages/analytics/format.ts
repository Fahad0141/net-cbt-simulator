import { EXAM_TYPES, examTypeById } from '@/config/exams';

/**
 * Label and number helpers shared by the History and Analytics pages.
 * Everything here is pure and safe to call with data imported from old backups.
 */

/** Human name of an exam type id, e.g. `NET Engineering`; custom and unknown ids degrade gracefully. */
export function examTypeName(id: string): string {
  if (id === 'custom') return 'Custom test';
  return examTypeById(id)?.name ?? (id || 'Unknown paper');
}

/** Sort rank: configured exam types in their configured order, then custom tests, then anything else. */
function examTypeRank(id: string): number {
  const index = EXAM_TYPES.findIndex((e) => e.id === id);
  if (index >= 0) return index;
  return id === 'custom' ? EXAM_TYPES.length : EXAM_TYPES.length + 1;
}

export interface ExamTypeOption {
  id: string;
  label: string;
  count: number;
}

/** Exam types present in `items`, with how many items each has, in a stable order. */
export function examTypeOptions(items: ReadonlyArray<{ examType: string }>): ExamTypeOption[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.examType, (counts.get(item.examType) ?? 0) + 1);
  return [...counts]
    .map(([id, count]) => ({ id, label: examTypeName(id), count }))
    .sort((a, b) => examTypeRank(a.id) - examTypeRank(b.id) || a.label.localeCompare(b.label));
}

/** `1 attempt`, `1,204 attempts`. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
}

/** A percentage with at most one decimal: `72%`, `71.5%`. */
export function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

/** Seconds as `48s` or `1m 12s` (matches `formatDuration` in the shared UI kit). */
export function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`;
}

/** Local calendar day of an epoch time as `YYYY-MM-DD` (sorts chronologically as a string). */
export function dayKey(epoch: number): string {
  const d = new Date(epoch);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** `dayKey` shifted by whole calendar days (safe across DST changes). */
export function shiftDay(key: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = key.split('-').map(Number);
  return dayKey(new Date(year, month - 1, day + days).getTime());
}

/** A finite number, or `fallback` for anything else (guards against malformed imported data). */
export function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Message of an unknown thrown value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
