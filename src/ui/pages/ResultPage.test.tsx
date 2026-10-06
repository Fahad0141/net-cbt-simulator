import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Paper, Question } from '@/engine/types';
import { decodeSpec } from '@/exam/papers';
import {
  createSession,
  DEFAULT_SETTINGS,
  type ExamSession,
  type QuestionState,
} from '@/exam/session';
import type * as StoreModule from '@/exam/store';
import { type AttemptRecord, archiveSession } from '@/exam/store';
import { ACADEMICS_KEY, parsePercentInput } from './result/academics';
import { analyzeSafely, blankInsight, focusPracticeSpec, retakePath } from './result/analysis';
import ResultPage from './ResultPage';

// Lets tests simulate a storage failure or a damaged record; otherwise the real store is used.
const storeControl = vi.hoisted(() => ({ fail: false, record: undefined as unknown }));
vi.mock('@/exam/store', async (importOriginal) => {
  const actual = await importOriginal<typeof StoreModule>();
  return {
    ...actual,
    getAttempt: (id: string) => {
      if (storeControl.fail) return Promise.reject(new Error('IndexedDB is unavailable'));
      if (storeControl.record) return Promise.resolve(storeControl.record);
      return actual.getAttempt(id);
    },
  };
});

function question(
  index: number,
  subject: Question['subject'],
  chapter: string,
  extra: Partial<Question> = {},
): Question {
  return {
    index,
    uid: `ENG-TEST-0001#${index}`,
    templateId: `${subject}/${chapter}/t${index}`,
    templateKind: 'static',
    subject,
    chapter,
    difficulty: 2,
    origin: 'original',
    tags: [],
    stem: `Stem of question ${index + 1}`,
    options: ['alpha', 'beta', 'gamma', 'delta'],
    correct: 1,
    explanation: `Because of reason ${index + 1}.`,
    ...extra,
  };
}

const PAPER: Paper = {
  code: 'ENG-TEST-0001',
  examType: 'engineering',
  seed: 'TEST0001',
  title: 'NET-Engineering (Engineering / Computing)',
  durationMinutes: 6,
  bankVersion: '2026.10.0',
  sections: [
    { subject: 'mathematics', title: 'Mathematics', start: 0, count: 4 },
    { subject: 'physics', title: 'Physics', start: 4, count: 2 },
  ],
  questions: [
    question(0, 'mathematics', 'differentiation', {
      difficulty: 1,
      origin: 'past-paper',
      templateKind: 'dynamic',
    }),
    question(1, 'mathematics', 'integration', { difficulty: 3 }),
    question(2, 'mathematics', 'vectors'),
    question(3, 'mathematics', 'conic-sections'),
    question(4, 'physics', 'work-energy'),
    question(5, 'physics', 'electrostatics'),
  ],
};

// Q1 correct · Q2 wrong · Q3 blank · Q4 correct · Q5 wrong · Q6 blank (never opened)
const ANSWERS: Array<Partial<QuestionState>> = [
  { saved: 1, visited: true, timeMs: 30_000 },
  { saved: 2, visited: true, timeMs: 95_000 },
  { saved: null, visited: true, timeMs: 4_000 },
  { saved: 1, visited: true, timeMs: 50_000 },
  { saved: 0, visited: true, timeMs: 61_000 },
  { saved: null, visited: false, timeMs: 0 },
];

let sequence = 0;

function buildSession(
  paper: Paper = PAPER,
  answers = ANSWERS,
  extra: Partial<ExamSession> = {},
): ExamSession {
  const id = `result-test-${++sequence}`;
  const at = Date.UTC(2026, 9, 1, 9, 0);
  const base = createSession({
    id,
    paper,
    candidate: { name: 'Test Candidate', userId: 'NET26-12345', centre: 'ISB-H12' },
    settings: DEFAULT_SETTINGS.exam,
    at,
  });
  return {
    ...base,
    phase: 'finished',
    startedAt: at,
    finishedAt: at + 4 * 60_000,
    finishReason: 'submitted',
    elapsedMs: 4 * 60_000,
    questions: base.questions.map((s, i) => ({ ...s, ...answers[i] })),
    ...extra,
  };
}

async function seedAttempt(...args: Parameters<typeof buildSession>): Promise<string> {
  const session = buildSession(...args);
  await archiveSession(session);
  return session.id;
}

function renderResult(id: string) {
  window.history.replaceState(null, '', `#/result/${id}`);
  return render(<ResultPage id={id} />);
}

const linkHref = (name: RegExp | string) => screen.getByRole('link', { name }).getAttribute('href');

beforeEach(() => {
  storeControl.fail = false;
  storeControl.record = undefined;
  localStorage.clear();
  window.history.replaceState(null, '', '#/');
});

describe('ResultPage', () => {
  it('shows the header, score hero and title for an archived attempt', async () => {
    const id = await seedAttempt();
    renderResult(id);

    expect(screen.getByText(/loading result/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: PAPER.title })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Result ENG-TEST-0001 · NET CBT Simulator'));

    // Header facts
    expect(screen.getByText('Exam mode')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Test Candidate')).toBeInTheDocument();
    expect(screen.getAllByText('ENG-TEST-0001').length).toBeGreaterThan(0);

    // Score hero: 2 correct of 6, 4 attempted, 50% accuracy
    const hero = screen.getByRole('region', { name: 'Score summary' });
    const h = within(hero);
    expect(h.getByText('Your score').parentElement).toHaveTextContent(/2\s*\/\s*out of\s*6/);
    expect(h.getByText('33.3%')).toBeInTheDocument();
    const kpi = (label: string) => h.getByText(label, { selector: 'dt' }).parentElement!;
    expect(kpi('Attempted')).toHaveTextContent('4of 6 questions');
    expect(kpi('Correct')).toHaveTextContent('2');
    expect(kpi('Wrong')).toHaveTextContent('2');
    expect(kpi('Unattempted')).toHaveTextContent('2');
    expect(kpi('Accuracy')).toHaveTextContent('50%');
    expect(kpi('Time used')).toHaveTextContent('4m 00s');
    expect(kpi('Time used')).toHaveTextContent('of 6m 00s');
    expect(
      h.getByText(/no negative marking: each of your 2 unattempted questions was a lost mark/i),
    ).toBeInTheDocument();
  });

  it('links to review, retake, print, new paper and history', async () => {
    const id = await seedAttempt();
    renderResult(id);
    await screen.findByRole('heading', { level: 1 });

    expect(linkHref('Review answers')).toBe(`#/review/${id}`);
    expect(linkHref('Retake this paper')).toBe('#/new?type=engineering&seed=TEST0001');
    expect(linkHref(/printable paper/i)).toBe('#/paper/ENG-TEST-0001?type=engineering');
    expect(linkHref('New paper')).toBe('#/new?type=engineering');
    expect(linkHref(/back to history/i)).toBe('#/history');
  });

  it('reports subject-wise results with accuracy and average time', async () => {
    const id = await seedAttempt();
    renderResult(id);
    await screen.findByRole('heading', { level: 1 });

    const card = screen
      .getByRole('heading', { name: 'Subject-wise performance' })
      .closest('section')!;
    const maths = within(card)
      .getByRole('rowheader', { name: /mathematics/i })
      .closest('tr')!;
    // 2/4 correct, 1 wrong, 1 blank, 66.7% accuracy, (30+95+4+50)/4 = 44.75s
    expect(maths).toHaveTextContent('2/4');
    expect(maths).toHaveTextContent('66.7%');
    expect(maths).toHaveTextContent('45s');
    const physics = within(card)
      .getByRole('rowheader', { name: /physics/i })
      .closest('tr')!;
    expect(physics).toHaveTextContent('0/2');
    expect(physics).toHaveTextContent('0%');
  });

  it('ranks chapters weakest first and links a focused custom test', async () => {
    const id = await seedAttempt();
    renderResult(id);
    await screen.findByRole('heading', { level: 1 });

    const focus = screen.getByRole('region', { name: 'Focus next' });
    const items = within(focus).getAllByRole('listitem');
    // The four chapters that lost a mark; the two perfect chapters are not listed.
    expect(items).toHaveLength(4);
    const names = items.map((li) => li.textContent ?? '');
    expect(names.some((t) => t.includes('Integration'))).toBe(true);
    expect(names.some((t) => t.includes('Work and Energy'))).toBe(true);
    expect(names.some((t) => t.includes('Differentiation'))).toBe(false);

    const practise = within(focus).getByRole('link', { name: 'Practise these 4 chapters' });
    const url = new URL(practise.getAttribute('href')!.slice(1), 'https://x.test');
    expect(url.pathname).toBe('/new');
    expect(url.searchParams.get('type')).toBe('custom');
    const spec = decodeSpec(url.searchParams.get('spec'));
    expect(spec).not.toBeNull();
    expect(spec!.sections.map((s) => s.subject)).toEqual(['mathematics', 'physics']);
    expect([...spec!.sections[0]!.chapters!].sort()).toEqual(['integration', 'vectors']);
    expect([...spec!.sections[1]!.chapters!].sort()).toEqual(['electrostatics', 'work-energy']);
    expect(spec!.sections[0]!.count).toBe(20);
    expect(spec!.durationMinutes).toBeGreaterThan(0);

    // The full chapter table lists the perfect chapters last.
    const table = screen.getByRole('table', { name: /chapters ranked weakest first/i });
    const rows = within(table).getAllByRole('rowheader');
    expect(rows).toHaveLength(6);
    expect(rows[4]).toHaveTextContent(/conic sections|differentiation/i);
    expect(rows[5]).toHaveTextContent(/conic sections|differentiation/i);
  });

  it('lists the slowest questions with review links and a difficulty breakdown', async () => {
    const id = await seedAttempt();
    renderResult(id);
    await screen.findByRole('heading', { level: 1 });

    const slow = screen.getByRole('region', { name: 'Slowest questions' });
    const links = within(slow).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual([
      'Question 2',
      'Question 5',
      'Question 4',
      'Question 1',
      'Question 3',
    ]);
    expect(links[0]).toHaveAttribute('href', `#/review/${id}?q=2`);
    expect(within(slow).getByText('1m 35s')).toBeInTheDocument();

    const difficulty = screen.getByRole('heading', { name: /difficulty/i }).closest('section')!;
    expect(within(difficulty).getByText('Easy')).toBeInTheDocument();
    expect(within(difficulty).getByText('Hard')).toBeInTheDocument();
  });

  it('estimates the NUST aggregate and remembers HSSC / SSC entries', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    const { unmount } = renderResult(id);
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByText(/enter your hssc and ssc results/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText('HSSC / FSc percentage'), '90');
    await user.type(screen.getByLabelText('SSC / Matric percentage'), '1000/1100');

    // NET 2/6 = 33.333% (unrounded) * 0.75 + 90 * 0.15 + 90.91 * 0.10 = 47.59
    const card = screen
      .getByRole('heading', { name: 'NUST aggregate estimator' })
      .closest('section')!;
    expect(within(card).getByText('Estimated aggregate').parentElement).toHaveTextContent('47.59%');
    expect(JSON.parse(localStorage.getItem(ACADEMICS_KEY) ?? '{}')).toMatchObject({
      hssc: 90,
      ssc: 90.91,
    });

    // Invalid input is flagged and does not produce an aggregate.
    await user.clear(screen.getByLabelText('HSSC / FSc percentage'));
    await user.type(screen.getByLabelText('HSSC / FSc percentage'), '120');
    expect(screen.getByText('A percentage cannot be more than 100.')).toBeInTheDocument();
    expect(screen.getByLabelText('HSSC / FSc percentage')).toHaveAttribute('aria-invalid', 'true');
    await user.clear(screen.getByLabelText('HSSC / FSc percentage'));
    await user.type(screen.getByLabelText('HSSC / FSc percentage'), '90');

    unmount();
    renderResult(id);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByLabelText('HSSC / FSc percentage')).toHaveValue('90');
    expect(screen.getByLabelText('SSC / Matric percentage')).toHaveValue('1000/1100');
  });

  it('marks a timed-out practice attempt', async () => {
    const id = await seedAttempt(PAPER, ANSWERS, {
      finishReason: 'timeout',
      elapsedMs: 6 * 60_000,
      settings: DEFAULT_SETTINGS.practice,
    });
    renderResult(id);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText('Time up')).toBeInTheDocument();
    expect(screen.getByText('Practice mode')).toBeInTheDocument();
    expect(screen.getByText(/time ran out with 2 questions unattempted/i)).toBeInTheDocument();
  });

  it('offers "Practise again" instead of a retake for custom papers', async () => {
    const custom: Paper = {
      ...PAPER,
      code: 'CUS-TEST-0001',
      examType: 'custom',
      title: 'My custom test',
    };
    const id = await seedAttempt(custom);
    renderResult(id);
    await screen.findByRole('heading', { level: 1, name: 'My custom test' });
    expect(screen.queryByRole('link', { name: 'Retake this paper' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /printable paper/i })).not.toBeInTheDocument();
    const href = linkHref('Practise again')!;
    const spec = decodeSpec(new URLSearchParams(href.split('?')[1]).get('spec'));
    expect(spec?.sections.map((s) => [s.subject, s.count])).toEqual([
      ['mathematics', 4],
      ['physics', 2],
    ]);
  });

  it('celebrates a perfect paper with no focus chapters', async () => {
    const perfect = PAPER.questions.map(() => ({ saved: 1, visited: true, timeMs: 10_000 }));
    const id = await seedAttempt(PAPER, perfect);
    renderResult(id);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(/no weak chapters/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try a harder paper' })).toBeInTheDocument();
    expect(screen.getByText(/you attempted every question/i)).toBeInTheDocument();
  });

  it('marks a legacy pattern and survives questions with an unknown difficulty', async () => {
    const legacy: Paper = {
      ...PAPER,
      examType: 'legacy-engineering',
      code: 'LEN-TEST-0001',
      questions: PAPER.questions.map((q, i) =>
        i === 2 ? { ...q, difficulty: 7 as unknown as Question['difficulty'] } : q,
      ),
    };
    // Archiving would reject such a paper, so hand the record straight to the page.
    const session = buildSession(legacy);
    storeControl.record = { summary: undefined, session };
    renderResult(session.id);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText('Pre-2025 pattern')).toBeInTheDocument();
    const difficulty = screen.getByRole('heading', { name: /difficulty/i }).closest('section')!;
    // Q3 (unknown difficulty) counts as medium: Q3, Q4, Q5, Q6 = 4 medium questions.
    expect(within(difficulty).getByText('4 questions')).toBeInTheDocument();
  });

  it('moves between answer-map squares with the arrow keys', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    renderResult(id);
    await screen.findByRole('heading', { level: 1 });

    const first = screen.getByRole('link', { name: 'Question 1: correct' });
    expect(first).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('link', { name: 'Question 2: wrong' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(first).toHaveAttribute('href', `#/review/${id}?q=1`);
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('link', { name: 'Question 2: wrong' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('link', { name: 'Question 6: unattempted' })).toHaveFocus();
  });

  it('shows a damaged-record state instead of crashing', async () => {
    storeControl.record = { summary: {}, session: { id: 'broken', paper: { questions: null } } };
    renderResult('broken');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'This result cannot be shown' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/incomplete/i);
  });

  it('shows a not-found state for an unknown attempt', async () => {
    renderResult('does-not-exist');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Result not found' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Result · NET CBT Simulator'));
    expect(linkHref('Go to history')).toBe('#/history');
  });

  it('shows an error with a retry when storage fails', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    storeControl.fail = true;
    renderResult(id);
    expect(await screen.findByRole('alert')).toHaveTextContent(/IndexedDB is unavailable/);

    storeControl.fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: PAPER.title })).toBeInTheDocument();
  });
});

describe('result analysis helpers', () => {
  it('reports damaged records instead of throwing', () => {
    const broken = {
      summary: {},
      session: { paper: { questions: null } },
    } as unknown as AttemptRecord;
    const result = analyzeSafely(broken, 'x');
    expect(result.model).toBeUndefined();
    expect(result.error).toMatch(/incomplete/i);
  });

  it('builds a model with retake path and focus spec', () => {
    const session = buildSession();
    const { model } = analyzeSafely({ summary: undefined as never, session }, session.id);
    expect(model).toBeDefined();
    expect(retakePath(model!)).toBe('/new?type=engineering&seed=TEST0001');
    expect(model!.focus.every((c) => c.lost > 0)).toBe(true);
    expect(model!.slowest[0]).toMatchObject({ number: 2, outcome: 'wrong' });
    expect(focusPracticeSpec([])).toBeNull();
  });

  it('builds focus practice only from chapters that are still in the syllabus', () => {
    const spec = focusPracticeSpec(
      [
        { subject: 'physics', chapter: 'work-energy' },
        { subject: 'mathematics', chapter: 'retired-chapter' },
        { subject: 'mathematics', chapter: 'integration' },
      ],
      PAPER.sections,
    );
    expect(spec?.sections).toEqual([
      { subject: 'mathematics', count: 10, chapters: ['integration'] },
      { subject: 'physics', count: 10, chapters: ['work-energy'] },
    ]);
    expect(spec?.title).toBe('Focus practice: 2 weakest chapters');
    // 20 questions at the NET pace of 0.9 min each.
    expect(spec?.durationMinutes).toBe(18);
    expect(focusPracticeSpec([{ subject: 'mathematics', chapter: 'retired-chapter' }])).toBeNull();
  });

  it('parses percentages and marks', () => {
    expect(parsePercentInput('88.5%')).toEqual({ value: 88.5, error: null });
    expect(parsePercentInput('968/1100').value).toBe(88);
    expect(parsePercentInput('').error).toBeNull();
    expect(parsePercentInput('abc').error).toMatch(/enter a percentage/i);
    expect(parsePercentInput('1200/1100').error).toMatch(/cannot be more/i);
  });

  it('explains blank questions under no negative marking', () => {
    expect(blankInsight(0)).toMatch(/attempted every question/);
    expect(blankInsight(1)).toMatch(/1 unattempted question/);
    expect(blankInsight(20)).toMatch(/about 5 marks/);
  });
});

it('keeps waiting for data without rendering a stale attempt', async () => {
  const first = await seedAttempt();
  const second = await seedAttempt({ ...PAPER, title: 'Second paper' });
  const { rerender } = renderResult(first);
  await screen.findByRole('heading', { level: 1, name: PAPER.title });
  rerender(<ResultPage id={second} />);
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Second paper'),
  );
});
