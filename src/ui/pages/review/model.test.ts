import type { Paper, Question } from '@/engine/types';
import type { QuestionState } from '@/exam/session';
import {
  buildIssueUrl,
  buildReviewModel,
  chapterTitle,
  countFilters,
  filterItems,
  humanize,
  normalizeQuestion,
  optionLetter,
  outcomeOf,
  outcomeSentence,
  parseReviewQuery,
  resolvePosition,
  reviewPath,
} from './model';

function question(
  index: number,
  subject: Question['subject'],
  correct = 1,
  extra: Partial<Question> = {},
): Question {
  return {
    index,
    uid: `T#${index}`,
    templateId: `${subject}/chapter/t${index}`,
    templateKind: 'static',
    subject,
    chapter: 'differentiation',
    difficulty: 2,
    origin: 'original',
    tags: [],
    stem: `Q${index}`,
    options: ['a', 'b', 'c', 'd'],
    correct,
    explanation: 'e',
    ...extra,
  };
}

const state = (patch: Partial<QuestionState> = {}): QuestionState => ({
  saved: null,
  selected: null,
  review: false,
  visited: true,
  timeMs: 0,
  revisions: 0,
  ...patch,
});

const paper: Paper = {
  code: 'ENG-AAAA-BBBB',
  examType: 'engineering',
  seed: 'AAAABBBB',
  title: 'Test',
  durationMinutes: 10,
  bankVersion: '2026.10.0',
  sections: [
    { subject: 'mathematics', title: 'Mathematics', start: 0, count: 3 },
    { subject: 'english', title: 'English (Verbal)', start: 3, count: 2 },
  ],
  questions: [
    question(0, 'mathematics'),
    question(1, 'mathematics'),
    question(2, 'mathematics'),
    question(3, 'english'),
    question(4, 'english'),
  ],
};

const states = [
  state({ saved: 1 }),
  state({ saved: 0, review: true }),
  state(),
  state({ saved: 1, review: true }),
  state({ saved: 3 }),
];

describe('review URL state', () => {
  it('parses filters (with aliases), subject and question number', () => {
    expect(parseReviewQuery(new URLSearchParams('q=37&filter=wrong&subject=physics'))).toEqual({
      filter: 'wrong',
      subject: 'physics',
      number: 37,
    });
    expect(parseReviewQuery(new URLSearchParams('filter=Unattempted')).filter).toBe('blank');
    expect(parseReviewQuery(new URLSearchParams('filter=marked')).filter).toBe('review');
    expect(parseReviewQuery(new URLSearchParams('filter=nonsense')).filter).toBe('all');
  });

  it('rejects invalid question numbers', () => {
    for (const q of ['0', '-3', 'abc', '2.5', '', '1e3']) {
      expect(parseReviewQuery(new URLSearchParams({ q })).number).toBeNull();
    }
  });

  it('builds canonical paths, omitting defaults', () => {
    expect(reviewPath('abc', { filter: 'all', subject: null, number: 3 })).toBe('/review/abc?q=3');
    expect(reviewPath('abc', { filter: 'wrong', subject: 'physics', number: 12 })).toBe(
      '/review/abc?q=12&filter=wrong&subject=physics',
    );
    expect(reviewPath('a b', { filter: 'all', subject: null, number: null })).toBe('/review/a%20b');
  });
});

describe('buildReviewModel', () => {
  const model = buildReviewModel(paper, states, 10 * 60_000);

  it('classifies outcomes and assigns sections', () => {
    expect(model.items.map((i) => i.outcome)).toEqual([
      'correct',
      'wrong',
      'blank',
      'correct',
      'wrong',
    ]);
    expect(model.items.map((i) => i.section)).toEqual([0, 0, 0, 1, 1]);
    expect(model.sections[1]).toMatchObject({ title: 'English (Verbal)', first: 4, last: 5 });
    expect(model.subjects).toEqual([
      { id: 'mathematics', title: 'Mathematics' },
      { id: 'english', title: 'English (Verbal)' },
    ]);
    expect(model.paceMs).toBe(120_000);
  });

  it('counts and filters by outcome, review flag and subject', () => {
    expect(countFilters(model.items, null)).toEqual({
      all: 5,
      correct: 2,
      wrong: 2,
      blank: 1,
      review: 2,
    });
    expect(countFilters(model.items, 'english')).toEqual({
      all: 2,
      correct: 1,
      wrong: 1,
      blank: 0,
      review: 1,
    });
    expect(filterItems(model.items, 'review', null).map((i) => i.number)).toEqual([2, 4]);
    expect(filterItems(model.items, 'wrong', 'english').map((i) => i.number)).toEqual([5]);
  });

  it('resolves the requested question within a filtered list', () => {
    const wrong = filterItems(model.items, 'wrong', null);
    expect(resolvePosition(wrong, 5)).toBe(1);
    expect(resolvePosition(wrong, 1)).toBe(0);
    expect(resolvePosition(wrong, null)).toBe(0);
    expect(resolvePosition([], 3)).toBe(-1);
  });

  it('survives malformed archived data', () => {
    const broken = {
      ...paper,
      sections: [{ subject: 'mathematics', title: '', start: 0, count: 2 }, null],
      questions: [question(0, 'mathematics'), { stem: 42 }, question(2, 'physics')],
    } as unknown as Paper;
    const m = buildReviewModel(broken, [
      state({ saved: 1 }),
      null,
      { saved: '2' },
    ] as unknown as QuestionState[]);
    expect(m.items).toHaveLength(3);
    expect(m.items[1]?.question).toMatchObject({
      stem: '',
      options: [],
      correct: -1,
      subject: 'mathematics',
    });
    expect(m.items[1]?.outcome).toBe('blank');
    expect(m.items[2]?.state.saved).toBeNull();
    // Question 3 is outside every section: grouped as "Other questions".
    expect(m.sections[m.items[2]!.section]).toMatchObject({
      title: 'Other questions',
      first: 3,
      last: 3,
    });
    expect(m.sections[0]?.title).toBe('Mathematics');
    expect(m.subjects.map((s) => s.id)).toEqual(['mathematics', 'physics']);
    expect(m.paceMs).toBe((10 * 60_000) / 3);
  });

  it('normalises questions without losing figures and passages', () => {
    const q = normalizeQuestion(
      {
        ...question(0, 'english'),
        figure: '<svg></svg>',
        passage: { id: 'p', text: 'Once', part: 2, of: 3 },
      },
      0,
      'english',
    );
    expect(q.figure).toBe('<svg></svg>');
    expect(q.passage).toMatchObject({ text: 'Once', part: 2, of: 3 });
    expect(normalizeQuestion(null, 4, 'physics')).toMatchObject({
      index: 4,
      subject: 'physics',
      templateId: 'unknown',
    });
  });
});

describe('labels', () => {
  it('formats option letters and outcome sentences', () => {
    expect(optionLetter(0)).toBe('(A)');
    expect(optionLetter(3)).toBe('(D)');
    expect(optionLetter(null)).toBe('—');
    expect(outcomeOf(2, 2)).toBe('correct');
    expect(outcomeOf(2, 1)).toBe('wrong');
    expect(outcomeOf(2, null)).toBe('blank');
    const q = question(0, 'mathematics', 1);
    expect(outcomeSentence({ outcome: 'wrong', question: q, state: state({ saved: 2 }) })).toBe(
      'Wrong. You answered (C); the correct answer is (B).',
    );
    expect(outcomeSentence({ outcome: 'blank', question: q, state: state() })).toBe(
      'Not attempted. The correct answer is (B).',
    );
  });

  it('names chapters from the syllabus and falls back gracefully', () => {
    expect(chapterTitle('mathematics', 'differentiation')).toBe('Differentiation');
    expect(chapterTitle('mathematics', 'brand-new-chapter')).toBe('Brand new chapter');
    expect(chapterTitle('no-such-subject', 'x')).toBe('X');
    expect(humanize('')).toBe('Unknown');
  });
});

describe('buildIssueUrl', () => {
  it('pre-fills the wrong-question issue form and a plain body', () => {
    const q = question(36, 'physics', 1, {
      templateId: 'physics/work-energy/kinetic-energy',
      chapter: 'work-energy',
    });
    const url = new URL(
      buildIssueUrl('https://github.com/OWNER/net-cbt-simulator/', {
        paperCode: 'ENG-K7Q2-9XM4',
        bankVersion: '2026.10.0',
        number: 37,
        question: q,
        saved: 2,
      }),
    );
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://github.com/OWNER/net-cbt-simulator/issues/new',
    );
    expect(url.searchParams.get('template')).toBe('wrong-question.yml');
    expect(url.searchParams.get('title')).toBe(
      'Problem with ENG-K7Q2-9XM4 Q37 (physics/work-energy/kinetic-energy)',
    );
    expect(url.searchParams.get('paper')).toBe('ENG-K7Q2-9XM4, Q37');
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain('Paper: ENG-K7Q2-9XM4 (question bank 2026.10.0)');
    expect(body).toContain('Question: 37');
    expect(body).toContain('Template: physics/work-energy/kinetic-energy');
    expect(body).toContain('Topic: Physics / Work and Energy');
    expect(body).toContain('Answer key: (B) (I answered (C))');
    expect(url.searchParams.get('problem')).toBe(body);
    // Spaces are percent-encoded, never `+`.
    expect(url.search).not.toContain('+');
  });
});
