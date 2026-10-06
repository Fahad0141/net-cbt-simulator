import type { ChapterInsight } from './model';

export type SortKey = 'syllabus' | 'name' | 'papers' | 'correct' | 'accuracy' | 'mastery' | 'trend';
export type Direction = 'asc' | 'desc';

/** Readable column names, for the table caption ("sorted by accuracy, ascending"). */
export const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  syllabus: 'subject',
  name: 'chapter',
  papers: 'attempts',
  correct: 'correct answers',
  accuracy: 'accuracy',
  mastery: 'mastery',
  trend: 'trend',
};

/** Nulls always sort last, whatever the direction. */
function compareNullable(a: number | null, b: number | null, dir: Direction): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return dir === 'asc' ? a - b : b - a;
}

/**
 * Sorts chapter rows by a column. `chapters` must be in syllabus order (as `buildAnalytics`
 * returns them): ties keep that order, and the `syllabus` key flips the subject order while
 * keeping each subject's chapters in syllabus order.
 */
export function sortChapters(
  chapters: readonly ChapterInsight[],
  key: SortKey,
  dir: Direction,
): ChapterInsight[] {
  const position = new Map(chapters.map((c, i) => [c.key, i]));
  const subjectRank = new Map<string, number>();
  for (const c of chapters)
    if (!subjectRank.has(c.subject)) subjectRank.set(c.subject, subjectRank.size);
  const pos = (c: ChapterInsight) => position.get(c.key) ?? 0;
  const sign = dir === 'asc' ? 1 : -1;

  const byKey = (a: ChapterInsight, b: ChapterInsight): number => {
    switch (key) {
      case 'syllabus':
        return sign * ((subjectRank.get(a.subject) ?? 0) - (subjectRank.get(b.subject) ?? 0));
      case 'name':
        return sign * a.name.localeCompare(b.name);
      case 'papers':
        return sign * (a.papers - b.papers);
      case 'correct':
        return sign * (a.correct - b.correct || a.seen - b.seen);
      case 'accuracy':
        return compareNullable(a.accuracy, b.accuracy, dir);
      case 'mastery':
        // Unrated chapters always last; otherwise by smoothed share secured.
        if ((a.level === 'unrated') !== (b.level === 'unrated'))
          return a.level === 'unrated' ? 1 : -1;
        return sign * (a.secured - b.secured);
      case 'trend':
        return compareNullable(a.trend, b.trend, dir);
    }
  };
  return [...chapters].sort((a, b) => byKey(a, b) || pos(a) - pos(b));
}
