import type { Difficulty, Paper, SubjectId } from '@/engine/types';
import type { QuestionState } from './session';

export interface MarkingScheme {
  correct: number;
  wrong: number;
  blank: number;
}

/** NET awards one mark per correct answer with no negative marking. */
export const NET_MARKING: MarkingScheme = { correct: 1, wrong: 0, blank: 0 };

export interface Tally {
  total: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  score: number;
  maxScore: number;
  /** Score as a percentage of the maximum (0-100). */
  percent: number;
  /** Correct as a percentage of attempted (0-100); 0 when nothing attempted. */
  accuracy: number;
  timeMs: number;
}

export interface SubjectTally extends Tally {
  subject: SubjectId;
  title: string;
}

export interface ChapterTally extends Tally {
  subject: SubjectId;
  chapter: string;
}

export interface ScoreReport {
  overall: Tally;
  bySubject: SubjectTally[];
  byChapter: ChapterTally[];
  byDifficulty: Record<Difficulty, Tally>;
  /** Per-question outcome in paper order. */
  outcomes: Array<'correct' | 'wrong' | 'blank'>;
}

function emptyTally(): Tally {
  return {
    total: 0,
    attempted: 0,
    correct: 0,
    wrong: 0,
    unattempted: 0,
    score: 0,
    maxScore: 0,
    percent: 0,
    accuracy: 0,
    timeMs: 0,
  };
}

function add(
  t: Tally,
  outcome: 'correct' | 'wrong' | 'blank',
  marking: MarkingScheme,
  timeMs: number,
): void {
  t.total++;
  t.maxScore += marking.correct;
  t.timeMs += timeMs;
  if (outcome === 'blank') {
    t.unattempted++;
    t.score += marking.blank;
  } else {
    t.attempted++;
    if (outcome === 'correct') {
      t.correct++;
      t.score += marking.correct;
    } else {
      t.wrong++;
      t.score += marking.wrong;
    }
  }
}

function finalize<T extends Tally>(t: T): T {
  t.percent = t.maxScore ? Math.round((t.score / t.maxScore) * 1000) / 10 : 0;
  t.accuracy = t.attempted ? Math.round((t.correct / t.attempted) * 1000) / 10 : 0;
  return t;
}

export function scorePaper(
  paper: Paper,
  states: readonly Pick<QuestionState, 'saved' | 'timeMs'>[],
  marking: MarkingScheme = NET_MARKING,
): ScoreReport {
  const overall = emptyTally();
  const bySubject = paper.sections.map((s) => ({
    ...emptyTally(),
    subject: s.subject,
    title: s.title,
  }));
  const chapters = new Map<string, ChapterTally>();
  const byDifficulty: Record<Difficulty, Tally> = {
    1: emptyTally(),
    2: emptyTally(),
    3: emptyTally(),
  };
  const outcomes: ScoreReport['outcomes'] = [];

  paper.questions.forEach((q, i) => {
    const state = states[i];
    const saved = state?.saved ?? null;
    const outcome = saved === null ? 'blank' : saved === q.correct ? 'correct' : 'wrong';
    const time = state?.timeMs ?? 0;
    outcomes.push(outcome);
    add(overall, outcome, marking, time);
    const sectionIdx = paper.sections.findIndex((s) => i >= s.start && i < s.start + s.count);
    const sectionTally = bySubject[sectionIdx];
    if (sectionTally) add(sectionTally, outcome, marking, time);
    const key = `${q.subject}/${q.chapter}`;
    let ch = chapters.get(key);
    if (!ch) {
      ch = { ...emptyTally(), subject: q.subject, chapter: q.chapter };
      chapters.set(key, ch);
    }
    add(ch, outcome, marking, time);
    add(byDifficulty[q.difficulty], outcome, marking, time);
  });

  return {
    overall: finalize(overall),
    bySubject: bySubject.map(finalize),
    byChapter: [...chapters.values()].map(finalize),
    byDifficulty: {
      1: finalize(byDifficulty[1]),
      2: finalize(byDifficulty[2]),
      3: finalize(byDifficulty[3]),
    },
    outcomes,
  };
}

/**
 * NUST merit aggregate: NET 75%, HSSC/FSc 15%, SSC/Matric 10% (all as percentages).
 * Returns the aggregate percentage rounded to 2 decimals.
 */
export function nustAggregate(netPercent: number, hsscPercent: number, sscPercent: number): number {
  const value = netPercent * 0.75 + hsscPercent * 0.15 + sscPercent * 0.1;
  return Math.round(value * 100) / 100;
}
