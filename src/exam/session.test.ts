import type { Paper, Question } from '@/engine/types';
import { nustAggregate, scorePaper } from './scoring';
import {
  buttonStates,
  createSession,
  DEFAULT_SETTINGS,
  type ExamSession,
  progressCounts,
  remainingMs,
  type SessionAction,
  sessionReducer,
} from './session';

function question(index: number, subject: Question['subject'], correct: number): Question {
  return {
    index,
    uid: `T#${index}`,
    templateId: `t/${index}`,
    templateKind: 'static',
    subject,
    chapter: 'c',
    difficulty: ((index % 3) + 1) as 1 | 2 | 3,
    origin: 'original',
    tags: [],
    stem: `Q${index}`,
    options: ['a', 'b', 'c', 'd'],
    correct,
    explanation: 'e',
  };
}

const paper: Paper = {
  code: 'TST-AAAA-BBBB',
  examType: 'test',
  seed: 'AAAABBBB',
  title: 'Test',
  durationMinutes: 10,
  bankVersion: 't',
  sections: [
    { subject: 'mathematics', title: 'Mathematics', start: 0, count: 3 },
    { subject: 'physics', title: 'Physics', start: 3, count: 2 },
  ],
  questions: [
    question(0, 'mathematics', 0),
    question(1, 'mathematics', 1),
    question(2, 'mathematics', 2),
    question(3, 'physics', 3),
    question(4, 'physics', 0),
  ],
};

const T0 = 1_000_000;
const candidate = { name: 'Test', userId: 'NUST-01', centre: 'ISB' };

function run(session: ExamSession, actions: SessionAction[]): ExamSession {
  return actions.reduce(sessionReducer, session);
}

function started(mode: 'exam' | 'practice' = 'exam') {
  const s = createSession({ id: 's1', paper, candidate, settings: DEFAULT_SETTINGS[mode], at: T0 });
  return run(s, [
    { type: 'login', candidate, at: T0 },
    { type: 'start', at: T0 },
  ]);
}

describe('exam session (CBT semantics)', () => {
  it('starts on question 1, visited, with the full duration', () => {
    const s = started();
    expect(s.phase).toBe('running');
    expect(s.current).toBe(0);
    expect(s.questions[0]?.visited).toBe(true);
    expect(remainingMs(s, T0)).toBe(10 * 60_000);
  });

  it('requires Save to record an answer; leaving without saving discards the selection', () => {
    let s = started();
    s = sessionReducer(s, { type: 'select', option: 2, at: T0 + 1000 });
    expect(s.questions[0]).toMatchObject({ selected: 2, saved: null });
    expect(buttonStates(s).save).toBe(true);
    s = sessionReducer(s, { type: 'next', at: T0 + 2000 });
    expect(s.questions[0]).toMatchObject({ selected: null, saved: null });

    s = sessionReducer(s, { type: 'select', option: 1, at: T0 + 3000 });
    s = sessionReducer(s, { type: 'save', at: T0 + 3500 });
    expect(s.questions[1]).toMatchObject({ selected: 1, saved: 1 });
    expect(buttonStates(s).save).toBe(false);
    expect(buttonStates(s).review).toBe(true);
  });

  it('auto-saves in practice mode', () => {
    let s = started('practice');
    s = sessionReducer(s, { type: 'select', option: 3, at: T0 + 1000 });
    expect(s.questions[0]?.saved).toBe(3);
  });

  it('only allows Review after an answer is saved (exam mode)', () => {
    let s = started();
    expect(buttonStates(s).review).toBe(false);
    s = sessionReducer(s, { type: 'review', at: T0 + 1 });
    expect(s.questions[0]?.review).toBe(false);
    s = run(s, [
      { type: 'select', option: 0, at: T0 + 2 },
      { type: 'save', at: T0 + 3 },
      { type: 'review', at: T0 + 4 },
    ]);
    expect(s.questions[0]?.review).toBe(true);
    expect(buttonStates(s).review).toBe(false);
  });

  it('navigates continuously across sections and by section', () => {
    let s = started();
    s = run(s, [
      { type: 'next', at: T0 + 1 },
      { type: 'next', at: T0 + 2 },
      { type: 'next', at: T0 + 3 },
    ]);
    expect(s.current).toBe(3);
    s = sessionReducer(s, { type: 'previousSection', at: T0 + 4 });
    expect(s.current).toBe(0);
    expect(buttonStates(s).previousSection).toBe(false);
    s = sessionReducer(s, { type: 'nextSection', at: T0 + 5 });
    expect(s.current).toBe(3);
    expect(buttonStates(s).nextSection).toBe(false);
    s = sessionReducer(s, { type: 'last', at: T0 + 6 });
    expect(s.current).toBe(4);
    expect(buttonStates(s).next).toBe(false);
    s = sessionReducer(s, { type: 'first', at: T0 + 7 });
    expect(s.current).toBe(0);
    s = sessionReducer(s, { type: 'goto', index: 99, at: T0 + 8 });
    expect(s.current).toBe(4);
  });

  it('tracks time per question', () => {
    let s = started();
    s = run(s, [
      { type: 'next', at: T0 + 5000 },
      { type: 'previous', at: T0 + 12000 },
    ]);
    expect(s.questions[0]?.timeMs).toBe(5000);
    expect(s.questions[1]?.timeMs).toBe(7000);
  });

  it('finishes automatically when time is up', () => {
    let s = started();
    s = run(s, [
      { type: 'select', option: 0, at: T0 + 1 },
      { type: 'save', at: T0 + 2 },
      { type: 'tick', at: T0 + 10 * 60_000 + 1 },
    ]);
    expect(s.phase).toBe('finished');
    expect(s.finishReason).toBe('timeout');
    expect(s.elapsedMs).toBe(10 * 60_000);
    // further actions are ignored
    expect(sessionReducer(s, { type: 'select', option: 1, at: T0 + 10 * 60_000 + 2 })).toBe(s);
  });

  it('counts time spent away and submits at the deadline when noticed later', () => {
    // The app went to the background (no ticks) on Q2 and came back two hours later.
    let s = started('practice');
    s = run(s, [
      { type: 'next', at: T0 + 60_000 },
      { type: 'select', option: 2, at: T0 + 61_000 },
    ]);
    expect(remainingMs(s, T0 + 9 * 60_000)).toBe(60_000);
    s = sessionReducer(s, { type: 'tick', at: T0 + 2 * 60 * 60_000 });
    expect(s.phase).toBe('finished');
    expect(s.finishReason).toBe('timeout');
    expect(s.finishedAt).toBe(T0 + 10 * 60_000);
    expect(s.elapsedMs).toBe(10 * 60_000);
    expect(s.questions[0]?.timeMs).toBe(60_000);
    expect(s.questions[1]?.timeMs).toBe(9 * 60_000);
    expect(s.questions[1]?.saved).toBe(2);
  });

  it('pauses only when allowed', () => {
    const exam = sessionReducer(started(), { type: 'pause', at: T0 + 1000 });
    expect(exam.runningSince).not.toBeNull();

    let practice = started('practice');
    practice = sessionReducer(practice, { type: 'pause', at: T0 + 60_000 });
    expect(remainingMs(practice, T0 + 5 * 60_000)).toBe(9 * 60_000);
    expect(sessionReducer(practice, { type: 'select', option: 1, at: T0 + 61_000 })).toBe(practice);
    practice = sessionReducer(practice, { type: 'resume', at: T0 + 5 * 60_000 });
    expect(remainingMs(practice, T0 + 6 * 60_000)).toBe(8 * 60_000);
  });

  it('counts progress', () => {
    let s = started();
    s = run(s, [
      { type: 'select', option: 0, at: T0 + 1 },
      { type: 'save', at: T0 + 2 },
      { type: 'review', at: T0 + 3 },
      { type: 'next', at: T0 + 4 },
    ]);
    expect(progressCounts(s)).toEqual({ answered: 1, unanswered: 4, review: 1, notVisited: 3 });
  });
});

describe('scoring', () => {
  it('scores with no negative marking and breaks down by subject', () => {
    let s = started();
    // Q0 correct (0), Q1 wrong (answer 0, correct 1), Q3 correct (3)
    s = run(s, [
      { type: 'select', option: 0, at: T0 + 1 },
      { type: 'save', at: T0 + 2 },
      { type: 'next', at: T0 + 3 },
      { type: 'select', option: 0, at: T0 + 4 },
      { type: 'save', at: T0 + 5 },
      { type: 'goto', index: 3, at: T0 + 6 },
      { type: 'select', option: 3, at: T0 + 7 },
      { type: 'save', at: T0 + 8 },
      { type: 'finish', reason: 'submitted', at: T0 + 9 },
    ]);
    const report = scorePaper(paper, s.questions);
    expect(report.overall).toMatchObject({
      total: 5,
      attempted: 3,
      correct: 2,
      wrong: 1,
      unattempted: 2,
      score: 2,
      percent: 40,
    });
    expect(report.bySubject.map((t) => [t.subject, t.correct, t.total])).toEqual([
      ['mathematics', 1, 3],
      ['physics', 1, 2],
    ]);
    expect(report.outcomes).toEqual(['correct', 'wrong', 'blank', 'correct', 'blank']);
  });

  it('computes the NUST aggregate', () => {
    expect(nustAggregate(80, 90, 95)).toBe(83);
  });
});
