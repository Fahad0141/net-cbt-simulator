import { describe, expect, it } from 'vitest';
import type { SettledModule } from '@/engine/registry';
import type { QuestionTemplate } from '@/engine/types';
import { reportProblemUrl, sourceFilePath, sourceFileUrl } from './links';
import {
  buildPreview,
  defaultSeed,
  EMPTY_FILTER,
  filterTemplates,
  isFilterActive,
  localId,
  mixOf,
  nextVariantSeed,
  paperReadiness,
  parseSeed,
  shares,
  snippetOf,
  splitTemplateId,
  yieldsNewQuestions,
} from './model';
import { bankPath, parseBankQuery } from './navigation';
import { buildSubjectBank, isTemplate } from './store';

const parametric: QuestionTemplate = {
  id: 'physics/work-energy/add-one',
  subject: 'physics',
  chapter: 'work-energy',
  kind: 'dynamic',
  difficulty: 2,
  origin: 'past-paper',
  tags: ['power', 'arithmetic'],
  generate(rng) {
    const a = rng.int(10, 9000);
    return {
      stem: `What is ${a} + 1?`,
      answer: String(a + 1),
      distractors: [String(a + 2), String(a + 3), String(a - 1)],
      explanation: `${a} + 1 = ${a + 1}.`,
    };
  },
};

const fixed: QuestionTemplate = {
  id: 'physics/work-energy/unit-of-energy',
  subject: 'physics',
  chapter: 'work-energy',
  kind: 'static',
  difficulty: 1,
  origin: 'original',
  tags: ['units'],
  question: {
    stem: 'The **SI unit** of energy is the',
    answer: 'joule',
    distractors: ['watt', 'newton', 'pascal'],
    explanation: 'Energy is measured in joules.',
  },
};

const set: QuestionTemplate = {
  id: 'english/comprehension/river',
  subject: 'english',
  chapter: 'comprehension',
  kind: 'set',
  difficulty: 3,
  origin: 'original',
  tags: ['reading'],
  size: 2,
  generate() {
    return {
      title: 'The River',
      passage: 'The river flowed past the mill.',
      questions: [
        {
          stem: 'Where?',
          answer: 'Past the mill',
          distractors: ['Sea', 'Hill', 'Bridge'],
          explanation: 'It says so.',
        },
        {
          stem: 'What?',
          answer: 'The river',
          distractors: ['A boat', 'A fish', 'A cloud'],
          explanation: 'It says so.',
        },
      ],
    };
  },
};

const broken: QuestionTemplate = {
  ...parametric,
  id: 'physics/work-energy/broken',
  generate() {
    throw new Error('bad parameters');
  },
};

describe('ids', () => {
  it('splits template ids', () => {
    expect(localId('physics/work-energy/add-one')).toBe('add-one');
    expect(localId('lonely')).toBe('lonely');
    expect(splitTemplateId('physics/work-energy/a/b')).toEqual({
      subject: 'physics',
      chapter: 'work-energy',
      local: 'a/b',
    });
    expect(splitTemplateId('physics')).toEqual({ subject: 'physics' });
  });
});

describe('statistics', () => {
  it('counts kinds, origins, difficulties and passage-set questions', () => {
    expect(mixOf([parametric, fixed, set])).toEqual({
      total: 3,
      dynamic: 1,
      static: 1,
      set: 1,
      setQuestions: 2,
      pastPaper: 1,
      difficulty: [1, 1, 1],
    });
  });

  it('splits percentages so they always add up to 100', () => {
    expect(shares([1, 1, 1])).toEqual([34, 33, 33]);
    expect(shares([0, 0, 0])).toEqual([0, 0, 0]);
    expect(shares([2, 1, 0])).toEqual([67, 33, 0]);
    for (const counts of [
      [7, 11, 13],
      [1, 0, 0],
      [45, 42, 13],
      [3, 3, 1],
    ]) {
      expect(shares(counts).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });
});

describe('search', () => {
  const all = [parametric, fixed, set];
  const ids = (list: readonly QuestionTemplate[]) => list.map((t) => t.id);

  it('matches ids, tags and the stem text of fixed questions only', () => {
    expect(ids(filterTemplates(all, { ...EMPTY_FILTER, query: 'ADD-ONE' }))).toEqual([
      parametric.id,
    ]);
    expect(ids(filterTemplates(all, { ...EMPTY_FILTER, query: 'arithmetic' }))).toEqual([
      parametric.id,
    ]);
    // Rich-text markup is stripped before matching.
    expect(ids(filterTemplates(all, { ...EMPTY_FILTER, query: 'si unit' }))).toEqual([fixed.id]);
    // Parametric stems change with every variant, so they are not searched.
    expect(filterTemplates(all, { ...EMPTY_FILTER, query: 'what is' })).toEqual([]);
    // Every term must match.
    expect(ids(filterTemplates(all, { ...EMPTY_FILTER, query: 'work-energy units' }))).toEqual([
      fixed.id,
    ]);
  });

  it('filters by kind, difficulty and origin', () => {
    expect(ids(filterTemplates(all, { ...EMPTY_FILTER, kind: 'set' }))).toEqual([set.id]);
    expect(ids(filterTemplates(all, { ...EMPTY_FILTER, difficulty: '1' }))).toEqual([fixed.id]);
    expect(ids(filterTemplates(all, { ...EMPTY_FILTER, origin: 'past-paper' }))).toEqual([
      parametric.id,
    ]);
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, query: '   ' })).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, origin: 'original' })).toBe(true);
  });
});

describe('seeds and previews', () => {
  it('gives every template a stable, valid default seed', () => {
    const seed = defaultSeed(parametric.id);
    expect(seed).toBe(defaultSeed(parametric.id));
    expect(seed).not.toBe(defaultSeed(fixed.id));
    expect(parseSeed(seed)).toBe(seed);
    expect(parseSeed('')).toBeUndefined();
    expect(parseSeed('not a seed!')).toBeUndefined();
  });

  it('rebuilds the same variant from the same seed, with the answer at `correct`', () => {
    const a = buildPreview(parametric, 'ABCD2345');
    const b = buildPreview(parametric, 'ABCD2345');
    expect(a).toEqual(b);
    if (!a.ok) throw new Error('preview failed');
    const [q] = a.questions;
    const n = Number(/What is (\d+)/.exec(q!.stem)![1]);
    expect(q!.options[q!.correct]).toBe(String(n + 1));
    expect(q!.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('shows every question of a passage set with its passage', () => {
    const preview = buildPreview(set, defaultSeed(set.id));
    expect(preview.ok && preview.passage).toEqual({
      title: 'The River',
      text: 'The river flowed past the mill.',
    });
    expect(preview.ok && preview.questions.map((q) => q.stem)).toEqual(['Where?', 'What?']);
  });

  it('reports a throwing template instead of throwing', () => {
    const preview = buildPreview(broken, 'ABCD2345');
    expect(preview).toEqual({ ok: false, seed: 'ABCD2345', error: 'Error: bad parameters' });
    expect(snippetOf(broken)).toEqual({ ok: false, error: 'Error: bad parameters' });
  });

  it('picks a new seed whose variant differs from the current one', () => {
    const seeds = ['ABCD2345', 'ABCD2345', 'WXYZ6789'];
    const next = nextVariantSeed(parametric, 'ABCD2345', () => seeds.shift() ?? 'QRST2345');
    expect(next).toBe('WXYZ6789');
  });
});

describe('paper readiness', () => {
  // A passage set whose passage changes with the seed: the paper generator can reuse it.
  const varyingSet: QuestionTemplate = {
    ...set,
    id: 'english/comprehension/numbers',
    generate(rng) {
      const n = rng.int(2, 900);
      return {
        passage: `There were ${n} birds on the wire.`,
        questions: [
          {
            stem: `How many birds were there (${n})?`,
            answer: String(n),
            distractors: [String(n + 1), String(n + 2), String(n + 3)],
            explanation: 'Stated.',
          },
          {
            stem: `Where were the ${n} birds?`,
            answer: 'On the wire',
            distractors: ['In a tree', 'On a roof', 'In the sky'],
            explanation: 'Stated.',
          },
        ],
      };
    },
  };

  it('treats parametric templates and varying passage sets as reusable, like the paper generator', () => {
    expect(yieldsNewQuestions(parametric)).toBe(true);
    expect(yieldsNewQuestions(varyingSet)).toBe(true);
    // Fixed questions never repeat, and neither does a set that ignores its seed.
    expect(yieldsNewQuestions(fixed)).toBe(false);
    expect(yieldsNewQuestions(set)).toBe(false);
    expect(yieldsNewQuestions(broken)).toBe(false);
  });

  it('flags subjects with fewer questions than their largest section and nothing that can be reused', () => {
    const english = paperReadiness('english', [set]);
    expect(english).toMatchObject({ distinct: 2, reusable: 0 });
    expect(english!.needed).toBeGreaterThanOrEqual(40);
    expect(english!.shortfall).toBe(english!.needed - 2);

    expect(paperReadiness('english', [set, varyingSet])).toMatchObject({
      distinct: 4,
      reusable: 1,
    });
    expect(paperReadiness('physics', [parametric, fixed, broken])).toMatchObject({
      distinct: 3,
      reusable: 1,
    });
  });

  it('skips the reuse probe when the bank already has enough distinct questions', () => {
    const many = Array.from({ length: 120 }, (_, i): QuestionTemplate => ({
      ...fixed,
      id: `physics/work-energy/f${i}`,
    }));
    expect(paperReadiness('physics', [...many, parametric])).toMatchObject({
      shortfall: 0,
      reusable: 0,
    });
  });
});

describe('quality checks', () => {
  it('separates the checks the paper generator applies from the KaTeX checks', () => {
    const badStem: QuestionTemplate = {
      ...fixed,
      id: 'physics/work-energy/bad-stem',
      question: { ...fixed.question, stem: '   ' },
    };
    const badTex: QuestionTemplate = {
      ...fixed,
      id: 'physics/work-energy/bad-tex',
      question: { ...fixed.question, stem: 'Evaluate $\\frac{1}{$ now' },
    };
    const stem = buildPreview(badStem, 'ABCD2345');
    const tex = buildPreview(badTex, 'ABCD2345');
    if (!stem.ok || !tex.ok) throw new Error('preview failed');
    expect(stem.questions[0]!.issues).toContainEqual(
      expect.objectContaining({ field: 'stem', severity: 'error', check: 'generator' }),
    );
    expect(
      tex.questions[0]!.issues.some((i) => i.check === 'katex' && i.severity === 'error'),
    ).toBe(true);
    expect(
      tex.questions[0]!.issues.filter((i) => i.check === 'generator' && i.severity === 'error'),
    ).toEqual([]);
  });
});

describe('bank URLs', () => {
  it('reads subject, chapter, template and seed, with the template id taking precedence', () => {
    expect(parseBankQuery(new URLSearchParams('subject=physics&chapter=optics'))).toEqual({
      subject: 'physics',
      chapter: 'optics',
    });
    expect(
      parseBankQuery(
        new URLSearchParams(
          'subject=english&chapter=x&t=physics/work-energy/add-one&seed=abcd2345',
        ),
      ),
    ).toEqual({
      subject: 'physics',
      chapter: 'work-energy',
      template: 'physics/work-energy/add-one',
      seed: 'ABCD2345',
    });
  });

  it('falls back to the first subject for unknown subjects and drops invalid seeds', () => {
    const parsed = parseBankQuery(new URLSearchParams('subject=alchemy&seed=%%%'));
    expect(parsed.unknownSubject).toBe('alchemy');
    expect(parsed.seed).toBeUndefined();
    expect(parseBankQuery(new URLSearchParams('')).unknownSubject).toBeUndefined();
    // Subject ids are not case-sensitive in links.
    expect(parseBankQuery(new URLSearchParams('subject=Physics'))).toEqual({ subject: 'physics' });
  });

  it('builds readable links that parse back to the same location', () => {
    const location = {
      subject: 'physics',
      chapter: 'work-energy',
      template: parametric.id,
      seed: 'ABCD2345',
    } as const;
    const path = bankPath(location);
    expect(path).toBe(
      '/bank?subject=physics&chapter=work-energy&t=physics/work-energy/add-one&seed=ABCD2345',
    );
    expect(parseBankQuery(new URLSearchParams(path.split('?')[1]))).toEqual(location);
  });

  it('links to source files and pre-filled problem reports on GitHub', () => {
    expect(sourceFilePath('../bank/physics/optics.ts')).toBe('src/bank/physics/optics.ts');
    expect(sourceFileUrl('../bank/physics/optics.ts')).toMatch(
      /^https:\/\/github\.com\/.+\/blob\/main\/src\/bank\/physics\/optics\.ts$/,
    );
    const url = new URL(reportProblemUrl({ templateId: parametric.id, seed: 'ABCD2345' }));
    expect(url.pathname).toMatch(/\/issues\/new$/);
    expect(url.searchParams.get('template')).toBe('wrong-question.yml');
    expect(url.searchParams.get('title')).toContain(parametric.id);
    expect(url.searchParams.get('paper')).toContain('ABCD2345');
  });
});

describe('buildSubjectBank', () => {
  it('collects templates by chapter and reports failed modules, duplicates and malformed entries', () => {
    const settled: SettledModule[] = [
      {
        path: '../bank/physics/work-energy.ts',
        module: {
          subject: 'physics',
          chapter: 'work-energy',
          templates: [parametric, fixed, { ...fixed }],
        },
      },
      {
        path: '../bank/physics/mystery.ts',
        module: {
          subject: 'physics',
          chapter: 'mystery',
          templates: [
            { ...fixed, id: 'physics/mystery/x', chapter: 'mystery' },
            { id: 'half-written' } as unknown as QuestionTemplate,
          ],
        },
      },
      { path: '../bank/physics/waves.ts', error: 'SyntaxError: Unexpected token' },
    ];
    const bank = buildSubjectBank('physics', settled);

    expect(bank.templates.map((t) => t.id)).toEqual([parametric.id, fixed.id, 'physics/mystery/x']);
    expect(bank.duplicates).toEqual([fixed.id]);
    expect(bank.malformed).toBe(1);
    expect(bank.failures).toEqual([
      {
        path: '../bank/physics/waves.ts',
        file: 'physics/waves.ts',
        chapter: 'waves',
        error: 'SyntaxError: Unexpected token',
      },
    ]);
    expect(bank.pathById.get(parametric.id)).toBe('../bank/physics/work-energy.ts');

    const work = bank.chapters.find((c) => c.id === 'work-energy')!;
    expect(work).toMatchObject({ inSyllabus: true, failed: 0, mix: { total: 2, dynamic: 1 } });
    expect(bank.chapters.find((c) => c.id === 'waves')).toMatchObject({
      failed: 1,
      mix: { total: 0 },
    });
    // Chapter ids missing from the syllabus are listed last.
    expect(bank.chapters[bank.chapters.length - 1]).toMatchObject({
      id: 'mystery',
      inSyllabus: false,
    });
    const shareSum = bank.chapters.reduce((sum, c) => sum + c.share, 0);
    expect(shareSum).toBeCloseTo(100);
  });

  it('accepts only structurally valid templates', () => {
    expect(isTemplate(parametric)).toBe(true);
    expect(isTemplate(set)).toBe(true);
    expect(isTemplate(null)).toBe(false);
    expect(isTemplate({ ...fixed, difficulty: 4 })).toBe(false);
    expect(isTemplate({ ...fixed, question: undefined })).toBe(false);
    expect(isTemplate({ ...parametric, generate: 'nope' })).toBe(false);
  });
});
