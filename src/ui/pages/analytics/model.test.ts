import { decodeSpec } from '@/exam/papers';
import { dayKey } from './format';
import {
  type AttemptDigest,
  applyFilters,
  buildAnalytics,
  computeStreak,
  digestAttempt,
  drillPath,
  masteryLevel,
  practicePath,
  practiceSpec,
  trendOf,
} from './model';
import { sortChapters } from './sortChapters';
import { finishedSession, makePaper } from './testFixtures';

const DAY = 24 * 60 * 60_000;
const NOW = new Date(2026, 9, 5, 12, 0).getTime();

const paper = makePaper({
  code: 'ENG-MODEL-0001',
  examType: 'engineering',
  sections: [
    { subject: 'english', blocks: [{ chapter: 'vocabulary', count: 4, difficulty: 1 }] },
    {
      subject: 'mathematics',
      blocks: [
        { chapter: 'integration', count: 4, difficulty: 3 },
        { chapter: 'differentiation', count: 4, difficulty: 2 },
      ],
    },
  ],
});

function digest(
  id: string,
  finishedAt: number,
  correctBelow: number,
  mode: 'exam' | 'practice' = 'exam',
): AttemptDigest {
  return digestAttempt({
    summary: undefined as never,
    session: finishedSession({
      id,
      paper,
      finishedAt,
      mode,
      // The first `correctBelow` questions are right; after that, alternately blank and wrong.
      outcome: (i) => (i < correctBelow ? 'correct' : i % 2 ? 'wrong' : 'blank'),
    }),
  });
}

describe('analytics model', () => {
  it('digests an attempt from its paper snapshot', () => {
    const d = digest('d1', NOW, 6);
    expect(d.percent).toBe(50);
    expect(d.overall).toMatchObject({
      total: 12,
      attempted: 9,
      correct: 6,
      wrong: 3,
      unattempted: 3,
    });
    expect(d.subjects.map((s) => s.subject)).toEqual(['english', 'mathematics']);
    expect(d.difficulty[3]).toMatchObject({ total: 4, correct: 2 });
  });

  it('orders subjects and chapters by the syllabus, not by first appearance', () => {
    const analytics = buildAnalytics([digest('d1', NOW, 6)]);
    expect(analytics.subjects.map((s) => s.subject)).toEqual(['mathematics', 'english']);
    expect(analytics.chapters.map((c) => c.chapter)).toEqual([
      'differentiation',
      'integration',
      'vocabulary',
    ]);
  });

  it('applies exam type, mode and range filters', () => {
    const list = [
      digest('a', NOW - 3 * DAY, 2),
      digest('b', NOW - 2 * DAY, 4, 'practice'),
      digest('c', NOW - DAY, 8),
    ];
    expect(
      applyFilters(list, { examType: 'all', mode: 'exam', range: 'all' }).map((d) => d.id),
    ).toEqual(['a', 'c']);
    expect(applyFilters(list, { examType: 'business', mode: 'all', range: 'all' })).toEqual([]);
    const many = Array.from({ length: 7 }, (_, i) => digest(`m${i}`, NOW - (7 - i) * DAY, i));
    expect(
      applyFilters(many, { examType: 'all', mode: 'all', range: 'last5' }).map((d) => d.id),
    ).toEqual(['m2', 'm3', 'm4', 'm5', 'm6']);
  });

  it('computes day streaks across local calendar days', () => {
    const times = [NOW, NOW - DAY, NOW - 2 * DAY, NOW - 5 * DAY, NOW - 6 * DAY];
    expect(computeStreak(times, NOW)).toEqual({
      current: 3,
      longest: 3,
      activeDays: 5,
      today: true,
    });
    // A streak ending yesterday still counts; one ending two days ago does not.
    expect(computeStreak([NOW - DAY], NOW).current).toBe(1);
    expect(computeStreak([NOW - 2 * DAY], NOW).current).toBe(0);
    expect(computeStreak([], NOW)).toEqual({ current: 0, longest: 0, activeDays: 0, today: false });
    expect(dayKey(NOW)).toBe('2026-10-05');
  });

  it('digests a full 200-question NET paper', () => {
    const full = makePaper({
      code: 'ENG-FULL-0001',
      examType: 'engineering',
      sections: [
        {
          subject: 'mathematics',
          blocks: [
            { chapter: 'differentiation', count: 50, difficulty: 1 },
            { chapter: 'integration', count: 50, difficulty: 3 },
          ],
        },
        { subject: 'physics', blocks: [{ chapter: 'electrostatics', count: 60 }] },
        { subject: 'english', blocks: [{ chapter: 'vocabulary', count: 40 }] },
      ],
    });
    const d = digestAttempt({
      summary: undefined as never,
      session: finishedSession({
        id: 'full',
        paper: full,
        finishedAt: NOW,
        outcome: (i) => (i % 4 === 3 ? 'blank' : i % 4 === 2 ? 'wrong' : 'correct'),
      }),
    });
    expect(d.maxScore).toBe(200);
    expect(d.score).toBe(100);
    expect(d.percent).toBe(50);
    expect(d.overall).toMatchObject({ total: 200, attempted: 150, correct: 100, unattempted: 50 });
    expect(d.subjects.map((s) => [s.subject, s.total])).toEqual([
      ['mathematics', 100],
      ['physics', 60],
      ['english', 40],
    ]);
    const { totals, chapters } = buildAnalytics([d]);
    expect(totals.questions).toBe(200);
    expect(chapters).toHaveLength(4);
  });

  it('ignores never-reached questions when rating chapters, but counts skipped ones', () => {
    // english vocabulary (0-3): right, right, opened and skipped, opened and skipped.
    // maths integration (4-7): never reached. maths differentiation (8-11): all wrong.
    const session = finishedSession({
      id: 'timeout',
      paper,
      finishedAt: NOW,
      finishReason: 'timeout',
      outcome: (i) => (i < 2 ? 'correct' : i < 8 ? 'blank' : 'wrong'),
    });
    session.questions = session.questions.map((q, i) =>
      i >= 4 && i < 8 ? { ...q, visited: false, timeMs: 0 } : q,
    );
    const { chapters, focus } = buildAnalytics([
      digestAttempt({ summary: undefined as never, session }),
    ]);
    const byId = new Map(chapters.map((c) => [c.chapter, c]));
    expect(byId.get('integration')).toMatchObject({ total: 4, seen: 0, level: 'unrated' });
    expect(byId.get('vocabulary')).toMatchObject({ total: 4, seen: 4, correct: 2 });
    expect(byId.get('vocabulary')?.level).toBe('developing'); // (2 + 1) / (4 + 2) = 0.5
    expect(byId.get('differentiation')).toMatchObject({ seen: 4, level: 'weak' });
    // Only chapters the candidate actually saw are recommended.
    expect(focus.map((c) => c.chapter)).toEqual(['differentiation', 'vocabulary']);
  });

  it('rates mastery with smoothing and needs a minimum sample', () => {
    expect(masteryLevel(2, 2)).toBe('unrated');
    expect(masteryLevel(10, 10)).toBe('strong');
    expect(masteryLevel(1, 3)).toBe('weak');
    expect(masteryLevel(5, 8)).toBe('developing');
  });

  it('measures the trend against the mean of earlier attempts', () => {
    expect(trendOf([50])).toBeNull();
    expect(trendOf([40, 60, 80])).toBe(30);
    expect(trendOf([80, 60])).toBe(-20);
  });

  it('builds custom practice specs that survive the URL round trip', () => {
    const chapters = [
      { subject: 'mathematics' as const, chapter: 'integration', name: 'Integration' },
      { subject: 'mathematics' as const, chapter: 'differentiation', name: 'Differentiation' },
      { subject: 'english' as const, chapter: 'vocabulary', name: 'Vocabulary' },
      { subject: 'mathematics' as const, chapter: 'retired-chapter', name: 'Retired' },
    ];
    const spec = practiceSpec(chapters, 10);
    expect(spec?.sections).toEqual([
      { subject: 'mathematics', count: 20, chapters: ['integration', 'differentiation'] },
      { subject: 'english', count: 10, chapters: ['vocabulary'] },
    ]);
    expect(spec?.durationMinutes).toBe(27); // 30 questions at 54 s each
    const param = new URLSearchParams(
      practicePath(spec as NonNullable<typeof spec>).split('?')[1],
    ).get('spec');
    expect(decodeSpec(param)).toEqual(spec);

    expect(
      practiceSpec([{ subject: 'mathematics', chapter: 'retired-chapter', name: 'Retired' }], 10),
    ).toBeNull();
    expect(
      drillPath({ subject: 'mathematics', chapter: 'retired-chapter', name: 'Retired' }),
    ).toBeNull();
    expect(drillPath({ subject: 'english', chapter: 'vocabulary', name: 'Vocabulary' })).toMatch(
      /^\/new\?type=custom&spec=/,
    );
  });

  it('sorts chapters with nulls last and a reversible syllabus order', () => {
    const { chapters } = buildAnalytics([digest('d1', NOW - DAY, 6), digest('d2', NOW, 9)]);
    const names = (list: typeof chapters) => list.map((c) => c.chapter);
    expect(names(sortChapters(chapters, 'syllabus', 'asc'))).toEqual([
      'differentiation',
      'integration',
      'vocabulary',
    ]);
    expect(names(sortChapters(chapters, 'syllabus', 'desc'))).toEqual([
      'vocabulary',
      'differentiation',
      'integration',
    ]);
    expect(names(sortChapters(chapters, 'accuracy', 'desc'))[0]).toBe('vocabulary');
    expect(names(sortChapters(chapters, 'trend', 'asc'))).toHaveLength(3);
  });
});
