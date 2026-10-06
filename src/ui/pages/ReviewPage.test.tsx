import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Paper, Question } from '@/engine/types';
import {
  createSession,
  DEFAULT_SETTINGS,
  type ExamSession,
  type QuestionState,
} from '@/exam/session';
import * as store from '@/exam/store';
import { archiveSession } from '@/exam/store';
import ReviewPage from './ReviewPage';

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

// Q1 correct · Q2 wrong + review · Q3 blank · Q4 correct + review · Q5 wrong · Q6 blank (never opened)
const ANSWERS: Array<Partial<QuestionState>> = [
  { saved: 1, visited: true, timeMs: 30_000 },
  { saved: 2, review: true, visited: true, timeMs: 95_000, revisions: 2 },
  { saved: null, visited: true, timeMs: 4_000 },
  { saved: 1, review: true, visited: true, timeMs: 50_000, revisions: 1 },
  { saved: 0, visited: true, timeMs: 61_000 },
  { saved: null, visited: false, timeMs: 0 },
];

let sequence = 0;

async function seedAttempt(paper: Paper = PAPER, answers = ANSWERS): Promise<string> {
  const id = `review-test-${++sequence}`;
  const at = Date.UTC(2026, 9, 1, 9, 0);
  const base = createSession({
    id,
    paper,
    candidate: { name: 'Test Candidate', userId: 'NET26-12345', centre: 'ISB-H12' },
    settings: DEFAULT_SETTINGS.exam,
    at,
  });
  const session: ExamSession = {
    ...base,
    phase: 'finished',
    startedAt: at,
    finishedAt: at + 4 * 60_000,
    finishReason: 'submitted',
    elapsedMs: 4 * 60_000,
    questions: base.questions.map((s, i) => ({ ...s, ...answers[i] })),
  };
  await archiveSession(session);
  return id;
}

function renderReview(id: string, search = '') {
  window.history.replaceState(null, '', `#/review/${id}${search ? `?${search}` : ''}`);
  return render(<ReviewPage id={id} query={new URLSearchParams(search)} />);
}

const questionCard = (n: number, total = 6) =>
  screen.findByRole('article', { name: `Question ${n} of ${total}` });
const navigator = () => screen.getByRole('navigation', { name: /question navigator/i });
const hashParams = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '');

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '#/');
});

describe('ReviewPage', () => {
  it('shows the question with its outcome, metadata and explanation', async () => {
    const id = await seedAttempt();
    renderReview(id);

    expect(screen.getByRole('status')).toHaveTextContent(/loading attempt/i);
    const card = await questionCard(1);
    expect(document.title).toBe('Review · NET CBT Simulator');
    expect(screen.getByRole('heading', { level: 1, name: 'Answer review' })).toBeInTheDocument();
    expect(screen.getByText(/score 2\/6/i)).toBeInTheDocument();

    const c = within(card);
    expect(c.getByText('Correct')).toBeInTheDocument();
    expect(c.getByText(/you answered/i)).toHaveTextContent('You answered (B).');
    expect(c.getByText('Stem of question 1')).toBeInTheDocument();
    expect(c.getByText('Correct answer')).toBeInTheDocument();
    expect(c.getByText('Your answer')).toBeInTheDocument();
    // meta badges
    expect(c.getByText('Mathematics')).toBeInTheDocument();
    expect(c.getByText('Differentiation')).toBeInTheDocument();
    expect(c.getByText('Easy')).toBeInTheDocument();
    expect(c.getByText('Past-paper style')).toBeInTheDocument();
    expect(c.getByText('Randomised values')).toBeInTheDocument();
    // time spent and answer changes
    expect(c.getByText('Time spent').nextElementSibling).toHaveTextContent('30s');
    expect(c.getByText('Answer changes').nextElementSibling).toHaveTextContent('0');
    // reference shown for reporting
    expect(c.getByText('mathematics/differentiation/t0')).toBeInTheDocument();
    expect(c.getByText('Because of reason 1.')).toBeInTheDocument();
    // URL canonicalised with the question shown
    await waitFor(() => expect(window.location.hash).toBe(`#/review/${id}?q=1`));
  });

  it('describes wrong and unattempted questions, pace and answer changes', async () => {
    const id = await seedAttempt();
    renderReview(id, 'q=2');
    let c = within(await questionCard(2));
    expect(c.getByText('Wrong')).toBeInTheDocument();
    expect(c.getByText(/you answered/i)).toHaveTextContent(
      'You answered (C); the correct answer is (B).',
    );
    expect(c.getByText('Marked for review')).toBeInTheDocument();
    expect(c.getByText('Hard')).toBeInTheDocument();
    expect(c.queryByText('Past-paper style')).not.toBeInTheDocument();
    expect(c.getByText('Time spent').nextElementSibling).toHaveTextContent(
      '1m 35s · over the 1m 00s pace',
    );
    expect(c.getByText('Answer changes').nextElementSibling).toHaveTextContent('2');

    fireEvent.keyDown(window, { key: 'End' }); // unrelated keys are ignored
    await userEvent.click(c.getByRole('button', { name: 'Next question' }));
    c = within(await questionCard(3));
    expect(c.getByText('Not attempted')).toBeInTheDocument();
    expect(c.getByText(/correct answer is/i)).toHaveTextContent('The correct answer is (B).');
  });

  it('filters by outcome with counts and keeps the view in the URL', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    renderReview(id);
    await questionCard(1);

    expect(screen.getByRole('radio', { name: 'All 6 questions' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Correct 2 questions' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Unattempted 2 questions' })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Marked for review 2 questions' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Wrong 2 questions' }));
    const card = await questionCard(2);
    expect(within(card).getByText('1 of 2 · Wrong')).toBeInTheDocument();
    expect(within(navigator()).getAllByRole('button')).toHaveLength(2);
    expect(hashParams().get('filter')).toBe('wrong');
    expect(hashParams().get('q')).toBe('2');
    expect(window.location.hash.startsWith(`#/review/${id}?`)).toBe(true);

    await user.click(within(card).getByRole('button', { name: 'Next question' }));
    await questionCard(5);
    expect(hashParams().get('q')).toBe('5');
    expect(screen.getByRole('button', { name: 'Next question' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    // Switching back to "All" keeps the question on screen.
    await user.click(screen.getByRole('radio', { name: 'All 6 questions' }));
    await questionCard(5);
    expect(hashParams().get('filter')).toBeNull();
  });

  it('keeps j/k working after a filter chip or the explanations switch is used', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    renderReview(id);
    await questionCard(1);

    await user.click(screen.getByRole('radio', { name: 'Marked for review 2 questions' }));
    await questionCard(2);
    expect(screen.getByRole('radio', { name: 'Marked for review 2 questions' })).toHaveFocus();
    await user.keyboard('j');
    await questionCard(4);
    // The arrow keys stay with the radio group (they switch the filter natively).
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Marked for review 2 questions' }), {
      key: 'ArrowLeft',
    });
    await questionCard(4);

    await user.click(screen.getByRole('switch', { name: 'Show explanations' }));
    await user.keyboard('k');
    await questionCard(2);
  });

  it('moves with Previous/Next and the j/k and arrow-key shortcuts', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    renderReview(id);
    const card = await questionCard(1);

    const previous = within(card).getByRole('button', { name: 'Previous question' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    await user.click(previous);
    await questionCard(1);

    await user.click(within(card).getByRole('button', { name: 'Next question' }));
    await questionCard(2);
    await user.keyboard('j');
    await questionCard(3);
    await user.keyboard('{ArrowRight}');
    await questionCard(4);
    await user.keyboard('k');
    await questionCard(3);
    await user.keyboard('{ArrowLeft}');
    await questionCard(2);
    expect(hashParams().get('q')).toBe('2');

    // Not while a form control has focus.
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Subject' }), { key: 'j' });
    fireEvent.keyDown(screen.getByRole('switch', { name: 'Show explanations' }), {
      key: 'ArrowRight',
    });
    // Nor with modifier keys.
    fireEvent.keyDown(document.body, { key: 'j', ctrlKey: true });
    await questionCard(2);

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Question 2 of 6. Wrong.'),
    );
  });

  it('jumps from the navigator and moves focus inside it with the arrow keys', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    renderReview(id);
    await questionCard(1);

    const nav = navigator();
    const cells = within(nav).getAllByRole('button');
    expect(cells).toHaveLength(6);
    expect(within(nav).getByRole('group', { name: 'Mathematics, Q1–4' })).toBeInTheDocument();
    expect(within(nav).getByRole('group', { name: 'Physics, Q5–6' })).toBeInTheDocument();
    expect(cells.map((cell) => cell.tabIndex)).toEqual([0, -1, -1, -1, -1, -1]);
    expect(cells[0]).toHaveAttribute('aria-current', 'true');
    expect(cells.map((cell) => cell.dataset.outcome)).toEqual([
      'correct',
      'wrong',
      'blank',
      'correct',
      'wrong',
      'blank',
    ]);

    await user.click(within(nav).getByRole('button', { name: 'Question 5: wrong' }));
    await questionCard(5);
    expect(hashParams().get('q')).toBe('5');
    const q5 = within(nav).getByRole('button', { name: 'Question 5: wrong' });
    expect(q5).toHaveFocus();
    expect(q5).toHaveAttribute('aria-current', 'true');

    // Arrow keys move focus only (and do not trigger the page's next/previous).
    await user.keyboard('{ArrowRight}');
    const q6 = within(nav).getByRole('button', { name: 'Question 6: not attempted' });
    expect(q6).toHaveFocus();
    expect(q6.tabIndex).toBe(0);
    expect(q5.tabIndex).toBe(-1);
    await questionCard(5);

    await user.keyboard('{Enter}');
    await questionCard(6);

    await user.keyboard('{Home}');
    expect(within(nav).getByRole('button', { name: 'Question 1: correct' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(q6).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(
      within(nav).getByRole('button', { name: 'Question 4: correct, marked for review' }),
    ).toHaveFocus();
    await questionCard(6);

    // Leaving the grid resets the tab stop to the current question.
    await user.tab();
    expect(within(nav).getByRole('button', { name: 'Question 6: not attempted' }).tabIndex).toBe(0);
  });

  it('limits questions and counts to the chosen subject', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    renderReview(id);
    await questionCard(1);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Subject' }), 'physics');
    await questionCard(5);
    expect(screen.getByRole('radio', { name: 'All 2 questions' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Wrong 1 question' })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'Marked for review 0 questions' }),
    ).toBeInTheDocument();
    expect(within(navigator()).getAllByRole('button')).toHaveLength(2);
    expect(within(screen.getByRole('article')).getByText('1 of 2 · Physics')).toBeInTheDocument();
    expect(hashParams().get('subject')).toBe('physics');

    // A filter with no matches shows an empty state with a way out.
    await user.click(screen.getByRole('radio', { name: 'Marked for review 0 questions' }));
    expect(
      await screen.findByRole('heading', { name: 'Nothing marked for review' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all questions' }));
    await questionCard(5);
    expect(screen.getByRole('combobox', { name: 'Subject' })).toHaveValue('');
    expect(screen.getByRole('radio', { name: 'All 6 questions' })).toBeChecked();
  });

  it('toggles explanations and remembers the choice', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    const { unmount } = renderReview(id);
    await questionCard(1);

    const toggle = screen.getByRole('switch', { name: 'Show explanations' });
    expect(toggle).toBeChecked();
    expect(screen.getByText('Because of reason 1.')).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(screen.queryByText('Because of reason 1.')).not.toBeInTheDocument();

    unmount();
    renderReview(id);
    await questionCard(1);
    expect(screen.getByRole('switch', { name: 'Show explanations' })).not.toBeChecked();
    expect(screen.queryByText('Because of reason 1.')).not.toBeInTheDocument();
  });

  it('links to a pre-filled GitHub issue for the question', async () => {
    const id = await seedAttempt();
    renderReview(id, 'q=5');
    await questionCard(5);

    const link = screen.getByRole('link', { name: /report a problem with question 5/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    const url = new URL(link.getAttribute('href') ?? '');
    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toMatch(/^\/[^/]+\/net-cbt-simulator\/issues\/new$/);
    expect(url.searchParams.get('template')).toBe('wrong-question.yml');
    expect(url.searchParams.get('title')).toContain('ENG-TEST-0001 Q5');
    expect(url.searchParams.get('paper')).toBe('ENG-TEST-0001, Q5');
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain('Paper: ENG-TEST-0001');
    expect(body).toContain('Question: 5');
    expect(body).toContain('Template: physics/work-energy/t4');
  });

  it('opens the question, filter and subject given in the URL', async () => {
    const id = await seedAttempt();
    const { unmount } = renderReview(id, 'q=5&filter=wrong');
    const card = await questionCard(5);
    expect(screen.getByRole('radio', { name: 'Wrong 2 questions' })).toBeChecked();
    expect(within(card).getByText('2 of 2 · Wrong')).toBeInTheDocument();
    unmount();

    // A question outside the filter falls back to the first match; bad params are dropped.
    renderReview(id, 'q=1&filter=unattempted&subject=chemistry');
    await questionCard(3);
    expect(screen.getByRole('radio', { name: 'Unattempted 2 questions' })).toBeChecked();
    await waitFor(() => expect(window.location.hash).toBe(`#/review/${id}?q=3&filter=blank`));
  });

  it('follows hash changes made while the page is open', async () => {
    const id = await seedAttempt();
    renderReview(id, 'q=2');
    await questionCard(2);
    window.location.hash = `#/review/${id}?q=4&filter=review`;
    await questionCard(4);
    expect(screen.getByRole('radio', { name: 'Marked for review 2 questions' })).toBeChecked();
  });

  it('explains when the attempt does not exist', async () => {
    renderReview('no-such-attempt');
    expect(await screen.findByRole('heading', { name: 'Attempt not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View attempt history' })).toHaveAttribute(
      'href',
      '#/history',
    );
  });

  it('offers a retry when storage cannot be read', async () => {
    const user = userEvent.setup();
    const id = await seedAttempt();
    const spy = vi.spyOn(store, 'getAttempt').mockRejectedValueOnce(new Error('IndexedDB blocked'));
    try {
      renderReview(id);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/could not be loaded/i);
      expect(alert).toHaveTextContent('IndexedDB blocked');
      await user.click(within(alert).getByRole('button', { name: 'Try again' }));
      await questionCard(1);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });

  it('groups questions outside every section and labels them by subject', async () => {
    const legacy: Paper = {
      ...PAPER,
      code: 'ENG-LEGA-0001',
      sections: [{ subject: 'mathematics', title: 'Mathematics', start: 0, count: 4 }],
      questions: [
        ...PAPER.questions.slice(0, 4),
        question(4, 'english', 'vocabulary'),
        question(5, 'english', 'grammar'),
      ],
    };
    const id = await seedAttempt(legacy);
    renderReview(id, 'q=5');
    const card = await questionCard(5);
    expect(within(card).getByText('English')).toBeInTheDocument();
    expect(
      within(navigator()).getByRole('group', { name: 'Other questions, Q5–6' }),
    ).toBeInTheDocument();
    expect(within(navigator()).getAllByRole('button')).toHaveLength(6);
  });

  it('explains when the saved paper is incomplete', async () => {
    const id = await seedAttempt({ ...PAPER, sections: [], questions: [] }, []);
    renderReview(id);
    expect(
      await screen.findByRole('heading', { name: 'This attempt cannot be reviewed' }),
    ).toBeInTheDocument();
  });

  it('handles a 200-question paper and renders only the current question', async () => {
    const big: Paper = {
      ...PAPER,
      code: 'ENG-BIG0-0200',
      durationMinutes: 180,
      sections: [
        { subject: 'mathematics', title: 'Mathematics', start: 0, count: 100 },
        { subject: 'physics', title: 'Physics', start: 100, count: 60 },
        { subject: 'english', title: 'English', start: 160, count: 40 },
      ],
      questions: Array.from({ length: 200 }, (_, i) =>
        question(i, i < 100 ? 'mathematics' : i < 160 ? 'physics' : 'english', 'any', {
          correct: i % 4,
        }),
      ),
    };
    const answers = Array.from({ length: 200 }, (_, i) => ({
      saved: i % 3 === 0 ? null : i % 4,
      visited: true,
      timeMs: 54_000,
    }));
    const id = await seedAttempt(big, answers);
    renderReview(id, 'q=150');
    await questionCard(150, 200);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(within(navigator()).getAllByRole('button')).toHaveLength(200);
    expect(screen.getByRole('radio', { name: 'Unattempted 67 questions' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Correct 133 questions' })).toBeInTheDocument();
  });
});
