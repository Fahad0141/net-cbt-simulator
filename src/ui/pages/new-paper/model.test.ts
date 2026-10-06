import { describe, expect, it } from 'vitest';
import type { Paper, Question } from '@/engine/types';
import { decodeSpec, DIFFICULTY_PRESETS, encodeSpec } from '@/exam/papers';
import { createSession, DEFAULT_SETTINGS, type ExamSession } from '@/exam/session';
import {
  CUSTOM,
  describeActiveSession,
  describeGenerationError,
  draftFromSpec,
  formReducer,
  initialForm,
  LIMITS,
  newPaperPath,
  paperStats,
  parseSeedInput,
  prepareRequest,
  printablePath,
  suggestedDuration,
  validateCustom,
} from './model';

const q = (
  index: number,
  subject: Question['subject'],
  chapter: string,
  extra: Partial<Question> = {},
): Question => ({
  index,
  uid: `Q#${index}`,
  templateId: `${subject}/${chapter}/t${index}`,
  templateKind: 'static',
  subject,
  chapter,
  difficulty: 2,
  origin: 'original',
  tags: [],
  stem: 'Stem',
  options: ['a', 'b', 'c', 'd'],
  correct: 0,
  explanation: '',
  ...extra,
});

const paper: Paper = {
  code: 'CUS-K7Q2-9XM4',
  examType: CUSTOM,
  seed: 'K7Q29XM4',
  title: 'Mini',
  durationMinutes: 10,
  bankVersion: 'test',
  sections: [{ subject: 'physics', title: 'Physics', start: 0, count: 3 }],
  questions: [
    q(0, 'physics', 'vectors-equilibrium', {
      templateKind: 'dynamic',
      difficulty: 1,
      origin: 'past-paper',
    }),
    q(1, 'physics', 'vectors-equilibrium', { templateKind: 'set' }),
    q(2, 'physics', 'nuclear-physics', { difficulty: 3 }),
  ],
};

function session(phase: ExamSession['phase'], patch: Partial<ExamSession> = {}): ExamSession {
  const base = createSession({
    id: 's1',
    paper,
    candidate: { name: 'A', userId: 'U', centre: 'C' },
    settings: DEFAULT_SETTINGS.exam,
    at: 0,
  });
  return { ...base, phase, ...patch };
}

describe('parseSeedInput', () => {
  it('reads empty, full codes, bare seeds and garbage', () => {
    expect(parseSeedInput('  ')).toEqual({ kind: 'random' });
    expect(parseSeedInput('eng-k7q2-9xm4')).toEqual({
      kind: 'seed',
      seed: 'K7Q29XM4',
      examType: 'engineering',
    });
    expect(parseSeedInput('CUS K7Q2 9XM4')).toEqual({
      kind: 'seed',
      seed: 'K7Q29XM4',
      examType: CUSTOM,
    });
    expect(parseSeedInput('k7q29xm4')).toEqual({ kind: 'seed', seed: 'K7Q29XM4' });
    expect(parseSeedInput('!!')).toEqual({ kind: 'invalid' });
    expect(parseSeedInput('ENG-!!')).toEqual({ kind: 'invalid' });
  });
});

describe('custom drafts', () => {
  it('suggests one minute per question within the limits', () => {
    expect(suggestedDuration(0)).toBe(LIMITS.durationMin);
    expect(suggestedDuration(37)).toBe(37);
    expect(suggestedDuration(400)).toBe(LIMITS.durationMax);
  });

  it('round-trips a shared specification', () => {
    const spec = {
      title: 'Weak',
      durationMinutes: 25,
      sections: [{ subject: 'physics' as const, count: 25, chapters: ['vectors-equilibrium'] }],
    };
    const draft = draftFromSpec(spec);
    expect(draft.durationAuto).toBe(true);
    expect(validateCustom(draft).spec).toEqual(spec);
  });

  it('reports every problem and accepts a full-length 200-question test', () => {
    const spec = decodeSpec(
      encodeSpec({ durationMinutes: 180, sections: [{ subject: 'mathematics', count: 200 }] }),
    );
    expect(spec).not.toBeNull();
    const ok = draftFromSpec(spec!);
    expect(validateCustom(ok).spec?.sections[0]?.count).toBe(200);

    const bad = {
      ...ok,
      sections: [
        { ...ok.sections[0]!, count: 'abc', chapters: [] },
        { ...ok.sections[0]!, key: 'x', subject: 'physics' as const, count: '199' },
      ],
      durationAuto: false,
      duration: '999',
    };
    const { spec: none, errors } = validateCustom(bad);
    expect(none).toBeNull();
    expect(errors.sections[bad.sections[0]!.key]).toEqual({
      count: expect.stringMatching(/5 to 200/),
      chapters: expect.stringMatching(/at least one chapter/),
    });
    expect(errors.total).toBeUndefined();
    expect(errors.duration).toMatch(/5 to 240/);
  });
});

describe('form state', () => {
  it('prefills from a link and builds the same request', () => {
    const { state, autoGenerate, optionsOpen, notices } = initialForm(
      new URLSearchParams('type=APS&seed=k7q2-9xm4&dyn=80&mix=20-50-30'),
    );
    expect(state.examType).toBe('applied-sciences');
    expect(state.seedInput).toBe('APS-K7Q2-9XM4');
    expect(state.difficulty).toBe('harder');
    expect(autoGenerate).toBe(true);
    expect(optionsOpen).toBe(true);
    expect(notices).toEqual([]);
    const { prepared } = prepareRequest(state);
    expect(prepared?.request).toMatchObject({
      examType: 'applied-sciences',
      seed: 'K7Q29XM4',
      options: { dynamicShare: 0.8, difficultyMix: DIFFICULTY_PRESETS.harder },
    });
  });

  it('falls back with a notice for an unknown type or unreadable spec', () => {
    expect(initialForm(new URLSearchParams('type=nope')).state.examType).toBe('engineering');
    expect(initialForm(new URLSearchParams('type=nope')).notices).toHaveLength(1);
    const custom = initialForm(new URLSearchParams('type=custom&spec=%%%&seed=K7Q29XM4'));
    expect(custom.state.examType).toBe(CUSTOM);
    expect(custom.autoGenerate).toBe(false);
    expect(custom.notices[0]).toMatch(/could not be read/);
  });

  it('switches the test type when a full paper code is typed', () => {
    const { state } = initialForm(new URLSearchParams());
    const next = formReducer(state, { kind: 'seedInput', value: 'NAT-K7Q2-9XM4' });
    expect(next.examType).toBe('natural-sciences');
    const back = formReducer(next, { kind: 'examType', value: 'engineering' });
    expect(back.seedInput).toBe('ENG-K7Q2-9XM4');
  });
});

describe('links', () => {
  it('builds share and printable links with the spec helpers', () => {
    const spec = { durationMinutes: 10, sections: [{ subject: 'physics' as const, count: 5 }] };
    const share = new URLSearchParams(
      newPaperPath(paper, { dynamicShare: 0.8 }, spec).split('?')[1],
    );
    expect(share.get('type')).toBe(CUSTOM);
    expect(share.get('seed')).toBe('K7Q29XM4');
    expect(share.get('dyn')).toBe('80');
    expect(decodeSpec(share.get('spec'))).toEqual(spec);
    expect(initialForm(share).autoGenerate).toBe(true);

    const print = printablePath(paper, {}, spec);
    expect(print.startsWith('/paper/CUS-K7Q2-9XM4?')).toBe(true);
    expect(print).toContain('type=custom');
    expect(print).toContain(`spec=${encodeSpec(spec)}`);
  });
});

describe('paperStats', () => {
  it('counts difficulty, sources and chapter coverage', () => {
    const stats = paperStats(paper, {
      durationMinutes: 10,
      sections: [{ subject: 'physics', count: 3, chapters: ['vectors-equilibrium'] }],
    });
    expect(stats.difficulty).toEqual({ 1: 1, 2: 1, 3: 1 });
    expect(stats.randomised).toBe(2);
    expect(stats.fixed).toBe(1);
    expect(stats.pastPaper).toBe(1);
    expect(stats.chaptersCovered).toBe(1);
    expect(stats.chaptersInScope).toBe(1);
    expect(stats.outOfScope).toBe(1);
    expect(stats.sections).toEqual([
      { subject: 'physics', title: 'Physics', count: 3, first: 1, last: 3 },
    ]);
  });
});

describe('describeGenerationError', () => {
  it('explains a bank shortage and suggests another test', () => {
    const info = describeGenerationError(
      new Error('Bank too small for physics: needed 60, produced 12'),
      'engineering',
    );
    expect(info.bankShortage).toBe(true);
    expect(info.title).toBe('Not enough Physics questions yet');
    expect(info.suggestion).toMatch(/another test type/);
    expect(
      describeGenerationError(new Error('No templates available for subject "design"'), CUSTOM)
        .suggestion,
    ).toMatch(/Remove the Design Aptitude section/);
    expect(describeGenerationError('boom', 'engineering').bankShortage).toBe(false);
  });
});

describe('describeActiveSession', () => {
  it('ignores missing and finished sessions', () => {
    expect(describeActiveSession(null, 0)).toBeNull();
    expect(describeActiveSession(session('finished'), 0)).toBeNull();
  });

  it('describes an unfinished session', () => {
    expect(describeActiveSession(session('login'), 0)).toMatchObject({
      status: 'not-started',
      total: 3,
      answered: 0,
    });
    const running = session('running', { runningSince: 0, elapsedMs: 0, durationMs: 10 * 60_000 });
    expect(describeActiveSession(running, 4 * 60_000)).toMatchObject({
      status: 'running',
      minutesLeft: 6,
    });
    expect(describeActiveSession({ ...running, runningSince: null }, 0)).toMatchObject({
      status: 'paused',
    });
    expect(describeActiveSession(running, 11 * 60_000)).toMatchObject({ status: 'time-up' });
  });
});
