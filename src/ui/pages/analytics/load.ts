import { getAttempt, listAttempts } from '@/exam/store';
import { type AttemptDigest, digestAttempt } from './model';

export interface LoadedDigests {
  /** Readable attempts, oldest first. */
  digests: AttemptDigest[];
  /** Attempts listed in the index whose record is missing or could not be scored. */
  unreadable: number;
}

/**
 * Records are read a few at a time: each one holds a full paper snapshot (a 200-question
 * paper with explanations), so reading a long history all at once would hold every
 * snapshot in memory together. Only the small digest of each record is kept.
 */
const CONCURRENT_READS = 4;

async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Loads every archived attempt and digests it for analytics. Never rejects for a single bad record. */
export async function loadAttemptDigests(): Promise<LoadedDigests> {
  const summaries = await listAttempts();
  const results = await mapLimited(summaries, CONCURRENT_READS, async (summary) => {
    try {
      const record = await getAttempt(summary.id);
      return record ? digestAttempt(record) : null;
    } catch {
      return null;
    }
  });
  const digests = results
    .filter((d): d is AttemptDigest => d !== null)
    .sort((a, b) => a.finishedAt - b.finishedAt);
  return { digests, unreadable: summaries.length - digests.length };
}
