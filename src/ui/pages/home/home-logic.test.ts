import { describe, expect, it } from 'vitest';
import { type CustomPaperSpec, decodeSpec, encodeSpec } from '@/exam/papers';
import { summarize } from '@/exam/store';
import { describeSession, isResumable } from './activeSession';
import { editDistance, notFoundHints } from './notFound';
import { checkPaperCode, hasCustomSettings, paperCodePath } from './paperCode';
import { formatChange, formatPercent, summarizeProgress } from './progress';
import { finishedSession, makePaper, newSession, runningSession } from './testFixtures';
import { sectionTint } from './tints';

const DAY = 86_400_000;

describe('checkPaperCode', () => {
  it('accepts the canonical spelling and loose spellings', () => {
    for (const input of ['ENG-K7Q2-9XM4', 'eng-k7q2-9xm4', '  eng k7q2 9xm4 ', 'ENGK7Q29XM4']) {
      const result = checkPaperCode(input);
      expect(result).toMatchObject({
        ok: true,
        examType: 'engineering',
        seed: 'K7Q29XM4',
        code: 'ENG-K7Q2-9XM4',
      });
    }
  });

  it('finds a code inside pasted text and app links', () => {
    expect(checkPaperCode('Paper code: APS-ABCD-2345')).toMatchObject({
      ok: true,
      examType: 'applied-sciences',
    });
    expect(checkPaperCode('https://example.org/net/#/paper/BUS-7Q2K-X9M4?print=1')).toMatchObject({
      ok: true,
      examType: 'business',
    });
    expect(
      checkPaperCode('https://example.org/#/new?type=natural-sciences&seed=K7Q29XM4'),
    ).toMatchObject({
      ok: true,
      examType: 'natural-sciences',
      seed: 'K7Q29XM4',
    });
  });

  it('accepts legacy prefixes', () => {
    expect(checkPaperCode('LEN-K7Q2-9XM4')).toMatchObject({
      ok: true,
      examType: 'legacy-engineering',
    });
  });

  it('explains why a code is rejected', () => {
    expect(checkPaperCode('   ')).toMatchObject({ ok: false, reason: 'empty' });
    expect(checkPaperCode('CUS-K7Q2-9XM4')).toMatchObject({ ok: false, reason: 'custom' });
    expect(checkPaperCode('XYZ-K7Q2-9XM4')).toMatchObject({ ok: false, reason: 'unknown-type' });
    expect(checkPaperCode('ENG-!!')).toMatchObject({ ok: false, reason: 'malformed' });
    expect(checkPaperCode('hello')).toMatchObject({ ok: false, reason: 'malformed' });
  });

  it('builds the /new path for a code', () => {
    const result = checkPaperCode('ARC-K7Q2-9XM4');
    if (!result.ok) throw new Error('expected a valid code');
    expect(paperCodePath(result)).toBe('/new?type=architecture&seed=K7Q29XM4');
  });

  it('keeps the generation settings of a pasted share link', () => {
    const link =
      'https://example.org/net/#/new?type=engineering&seed=K7Q29XM4&dyn=80&mix=30-40-30&pp=3';
    const result = checkPaperCode(link);
    if (!result.ok) throw new Error('expected a valid link');
    expect(result).toMatchObject({ examType: 'engineering', code: 'ENG-K7Q2-9XM4', custom: null });
    expect(hasCustomSettings(result)).toBe(true);
    expect(paperCodePath(result)).toBe(
      '/new?type=engineering&seed=K7Q29XM4&dyn=80&mix=30-40-30&pp=3',
    );

    const printable = checkPaperCode(
      'https://example.org/#/paper/BUS-7Q2K-X9M4?dyn=20&type=business',
    );
    if (!printable.ok) throw new Error('expected a valid printable link');
    expect(paperCodePath(printable)).toBe('/new?type=business&seed=7Q2KX9M4&dyn=20');

    const plain = checkPaperCode('ENG-K7Q2-9XM4');
    if (!plain.ok) throw new Error('expected a valid code');
    expect(hasCustomSettings(plain)).toBe(false);
  });

  it('opens a custom test from its full link but not from its code alone', () => {
    const spec: CustomPaperSpec = {
      title: 'Calculus drill',
      durationMinutes: 30,
      sections: [{ subject: 'mathematics', count: 20 }],
    };
    const result = checkPaperCode(
      `https://example.org/#/new?type=custom&seed=K7Q29XM4&spec=${encodeSpec(spec)}`,
    );
    if (!result.ok) throw new Error('expected a valid custom link');
    expect(result).toMatchObject({
      examType: 'custom',
      examName: 'Calculus drill',
      code: 'CUS-K7Q2-9XM4',
    });
    expect(result.custom).toEqual(spec);
    const path = new URLSearchParams(paperCodePath(result).split('?')[1]);
    expect(path.get('type')).toBe('custom');
    expect(path.get('seed')).toBe('K7Q29XM4');
    expect(decodeSpec(path.get('spec'))).toEqual(spec);

    expect(
      checkPaperCode('https://example.org/#/new?type=custom&seed=K7Q29XM4&spec=broken!'),
    ).toMatchObject({
      ok: false,
      reason: 'custom',
    });
    expect(checkPaperCode('CUS-K7Q2-9XM4')).toMatchObject({ ok: false, reason: 'custom' });
  });

  it('ignores a question mark that is not part of a link', () => {
    expect(checkPaperCode('Is ENG-K7Q2-9XM4 right?')).toMatchObject({
      ok: true,
      code: 'ENG-K7Q2-9XM4',
    });
  });
});

describe('summarizeProgress', () => {
  const at = Date.UTC(2026, 9, 1);
  const summaries = [
    summarize(finishedSession({ id: 'a', correct: 5, finishedAt: at })), // 50%
    summarize(finishedSession({ id: 'b', correct: 8, finishedAt: at + DAY, mode: 'practice' })), // 80%
    summarize(finishedSession({ id: 'c', correct: 6, finishedAt: at + 2 * DAY })), // 60%
  ];

  it('returns null when there is nothing to show', () => {
    expect(summarizeProgress(undefined)).toBeNull();
    expect(summarizeProgress([])).toBeNull();
  });

  it('computes the headline numbers newest first', () => {
    const summary = summarizeProgress(summaries);
    expect(summary).not.toBeNull();
    expect(summary?.count).toBe(3);
    expect(summary?.examCount).toBe(2);
    expect(summary?.practiceCount).toBe(1);
    expect(summary?.best.id).toBe('b');
    expect(summary?.latest.id).toBe('c');
    expect(summary?.averagePercent).toBe(63.3);
    expect(summary?.change).toBe(-20);
    expect(summary?.trend).toEqual([50, 80, 60]);
    expect(summary?.recent.map((a) => a.id)).toEqual(['c', 'b', 'a']);
    expect(summary?.totalTimeMs).toBe(3 * 90 * 60_000);
  });

  it('limits the recent list and trend, and ignores damaged records', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      summarize(finishedSession({ id: `m${i}`, correct: i, finishedAt: at + i * DAY })),
    );
    const damaged = { ...many[0]!, id: 'broken', percent: Number.NaN };
    const summary = summarizeProgress([...many, damaged], { recentSize: 5, trendSize: 6 });
    expect(summary?.count).toBe(8);
    expect(summary?.recent).toHaveLength(5);
    expect(summary?.recent[0]?.id).toBe('m7');
    expect(summary?.trend).toEqual([20, 30, 40, 50, 60, 70]);
    expect(summary?.change).toBe(10);
  });

  it('formats percentages and changes', () => {
    expect(formatPercent(76)).toBe('76%');
    expect(formatPercent(64.46)).toBe('64.5%');
    expect(formatPercent(Number.NaN)).toBe('0%');
    expect(formatChange(6.5)).toBe('+6.5 pts');
    expect(formatChange(-3)).toBe('−3 pts');
    expect(formatChange(1)).toBe('+1 pt');
    expect(formatChange(0)).toBe('no change');
  });
});

describe('describeSession', () => {
  it('describes a running paper with the clock and answers', () => {
    const session = runningSession({ minutesAgo: 38, answered: 3 });
    const info = describeSession(session, Date.now());
    expect(info).toMatchObject({
      status: 'running',
      minutesLeft: 142,
      answered: 3,
      total: 10,
      mode: 'exam',
    });
    expect(info.title).toBe('NET Engineering');
    expect(info.code).toBe('ENG-TEST-0001');
  });

  it('describes a paper that has not started', () => {
    const info = describeSession(newSession(), Date.now());
    expect(info).toMatchObject({ status: 'not-started', minutesLeft: 180, answered: 0 });
  });

  it('detects a paper whose time ran out while closed', () => {
    const info = describeSession(runningSession({ minutesAgo: 200 }), Date.now());
    expect(info).toMatchObject({ status: 'time-up', minutesLeft: 0 });
  });

  it('detects a paused practice paper', () => {
    const session = runningSession({ minutesAgo: 10, mode: 'practice' });
    const paused = { ...session, elapsedMs: 10 * 60_000, runningSince: null, enteredAt: null };
    const info = describeSession(paused, Date.now() + 60 * 60_000);
    expect(info).toMatchObject({ status: 'paused', minutesLeft: 170, mode: 'practice' });
  });

  it('only accepts complete, unfinished sessions', () => {
    expect(isResumable(null)).toBe(false);
    expect(isResumable({ phase: 'running' })).toBe(false);
    expect(isResumable(newSession())).toBe(true);
    expect(isResumable(finishedSession({ id: 'f', correct: 1, finishedAt: Date.now() }))).toBe(
      false,
    );
    expect(isResumable({ ...newSession(), paper: { ...makePaper(), questions: undefined } })).toBe(
      false,
    );
  });
});

describe('notFoundHints', () => {
  it('spots a paper code in the path', () => {
    const hints = notFoundHints('/ENG-K7Q2-9XM4');
    expect(hints.paper?.code).toBe('ENG-K7Q2-9XM4');
    expect(hints.paper?.path).toBe('/new?type=engineering&seed=K7Q29XM4');
    expect(hints.route).toBeNull();
  });

  it('suggests the page a typo meant', () => {
    expect(notFoundHints('/histroy').route).toEqual({ path: '/history', label: 'History' });
    expect(notFoundHints('/analitycs').route?.path).toBe('/analytics');
    expect(notFoundHints('/results').route?.path).toBe('/history');
    expect(notFoundHints('/zzzzzz').route).toBeNull();
    expect(notFoundHints('/ab').route).toBeNull();
  });

  it('shows the missing location readably', () => {
    expect(notFoundHints('/some/where').display).toBe('#/some/where');
    expect(notFoundHints('main').display).toBe('#/main');
  });

  it('measures edit distance', () => {
    expect(editDistance('history', 'history')).toBe(0);
    expect(editDistance('histroy', 'history')).toBe(2);
    expect(editDistance('a', 'abcdefgh', 3)).toBe(4);
  });
});

describe('sectionTint', () => {
  it('spreads sections evenly from 100% to 43%', () => {
    expect([0, 1].map((i) => sectionTint(i, 2))).toEqual(['100%', '43%']);
    expect([0, 1, 2].map((i) => sectionTint(i, 3))).toEqual(['100%', '72%', '43%']);
    expect([0, 1, 2, 3, 4].map((i) => sectionTint(i, 5))).toEqual([
      '100%',
      '86%',
      '72%',
      '57%',
      '43%',
    ]);
    expect(sectionTint(0, 1)).toBe('100%');
  });
});
