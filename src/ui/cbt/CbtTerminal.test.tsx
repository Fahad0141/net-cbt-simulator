import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Paper, Question } from '@/engine/types';
import { createSession, DEFAULT_SETTINGS } from '@/exam/session';
import { getAttempt, loadActiveSession } from '@/exam/store';
import { CbtTerminal } from './CbtTerminal';

function q(index: number, subject: Question['subject'], correct: number): Question {
  return {
    index,
    uid: `T#${index}`,
    templateId: `t/${index}`,
    templateKind: 'static',
    subject,
    chapter: 'c',
    difficulty: 2,
    origin: 'original',
    tags: [],
    stem: `Question text number ${index + 1}: what is $${index} + 1$?`,
    options: ['alpha', 'beta', 'gamma', 'delta'],
    correct,
    explanation: 'Because.',
  };
}

const paper: Paper = {
  code: 'ENG-TEST-0001',
  examType: 'engineering',
  seed: 'TEST0001',
  title: 'NET-Engineering (Engineering / Computing)',
  durationMinutes: 3,
  bankVersion: 'test',
  sections: [
    { subject: 'mathematics', title: 'Mathematics', start: 0, count: 2 },
    { subject: 'physics', title: 'Physics', start: 2, count: 1 },
  ],
  questions: [q(0, 'mathematics', 1), q(1, 'mathematics', 0), q(2, 'physics', 3)],
};

function freshSession(mode: 'exam' | 'practice' = 'exam') {
  return createSession({
    id: `test-${mode}-${Math.random().toString(36).slice(2)}`,
    paper,
    candidate: { name: 'Ayesha Khan', userId: 'NET26-12345', centre: 'ISB-H12' },
    settings: DEFAULT_SETTINGS[mode],
    at: Date.now(),
  });
}

async function loginAndStart(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  await user.click(screen.getByRole('checkbox', { name: /read and understood/i }));
  await user.click(screen.getByRole('button', { name: 'Start Test' }));
}

describe('CbtTerminal', () => {
  beforeEach(() => localStorage.clear());

  it('walks through login, instructions and the faithful header', async () => {
    const user = userEvent.setup();
    render(<CbtTerminal initial={freshSession()} />);
    expect(screen.getByLabelText('User:')).toHaveValue('NET26-12345');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByText(/Instructions for Candidates/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Test' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /read and understood/i }));
    await user.click(screen.getByRole('button', { name: 'Start Test' }));

    expect(screen.getByText('Mathematics', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('NET26-12345')).toBeInTheDocument();
    expect(screen.getByText(/Question No :/)).toHaveTextContent('Question No : 1 of 3');
    expect(screen.getByText('( Please select your correct option )')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('3min');
    expect(screen.getByText(/Start Time:/)).toBeInTheDocument();
  });

  it('records an answer only after Save, and discards unsaved selections on navigation', async () => {
    const user = userEvent.setup();
    render(<CbtTerminal initial={freshSession()} />);
    await loginAndStart(user);

    const save = screen.getByRole('button', { name: /save/i });
    const review = screen.getByRole('button', { name: /review/i });
    expect(save).toBeDisabled();
    expect(review).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Option 2' }));
    expect(save).toBeEnabled();
    // Move on without saving: the selection must be lost.
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await user.click(screen.getByRole('button', { name: /^prev$/i }));
    expect(screen.getByRole('radio', { name: 'Option 2' })).not.toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Option 2' }));
    await user.click(save);
    expect(save).toBeDisabled();
    expect(review).toBeEnabled();
    await user.click(review);
    expect(loadActiveSession()?.questions[0]).toMatchObject({ saved: 1, review: true });
  });

  it('navigates by section and to first/last question', async () => {
    const user = userEvent.setup();
    render(<CbtTerminal initial={freshSession()} />);
    await loginAndStart(user);
    expect(screen.getByRole('button', { name: /prev\s*section/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /next\s*section/i }));
    expect(screen.getByText(/Question No :/)).toHaveTextContent('3 of 3');
    expect(screen.getByText('Physics', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^next$/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /^first/i }));
    expect(screen.getByText(/Question No :/)).toHaveTextContent('1 of 3');
  });

  it('finishes after the confirmation dialog and archives the attempt', async () => {
    const user = userEvent.setup();
    const session = freshSession();
    render(<CbtTerminal initial={session} />);
    await loginAndStart(user);
    await user.click(screen.getByRole('radio', { name: 'Option 2' }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await user.click(screen.getByRole('button', { name: /FINISH/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/You will not be able to Logon again/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /FINISH/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'OK' }));

    expect(await screen.findByText(/Score: 1 \/ 3/)).toBeInTheDocument();
    expect(loadActiveSession()).toBeNull();
    const record = await getAttempt(session.id);
    expect(record?.summary.correct).toBe(1);
  });

  it('auto-submits when the clock runs out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<CbtTerminal initial={freshSession()} />);
      await loginAndStart(user);
      await act(async () => {
        vi.advanceTimersByTime(3 * 60_000 + 2_000);
      });
      expect(await screen.findByText(/Time is up/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the attempted counter and jumps with the filter/question lists', async () => {
    const user = userEvent.setup();
    render(<CbtTerminal initial={freshSession()} />);
    await loginAndStart(user);
    expect(screen.getByText('Attempted: 0/3')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Option 1' }));
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByText('Attempted: 1/3')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Show' }), 'unattempted');
    const questionList = screen.getByRole('combobox', { name: 'Question' });
    expect(
      within(questionList)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Go to…', '2', '3']);
    await user.selectOptions(questionList, '3');
    expect(screen.getByText(/Question No :/)).toHaveTextContent('3 of 3');
  });

  it('blinks the question area after the per-question time budget', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { container } = render(<CbtTerminal initial={freshSession()} />);
      await loginAndStart(user);
      // 3 minutes / 3 questions = 60 s budget per question.
      expect(container.querySelector('[class*="blink"]')).toBeNull();
      await act(async () => {
        vi.advanceTimersByTime(61_000);
      });
      expect(container.querySelector('[class*="blink"]')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides the score on the terminal in exam mode but shows it in the simulator panel', async () => {
    const user = userEvent.setup();
    render(<CbtTerminal initial={freshSession()} />);
    await loginAndStart(user);
    await user.click(screen.getByRole('button', { name: /FINISH/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'OK' }));
    expect(screen.getByText(/logged out of the test/)).toBeInTheDocument();
    const simulator = await screen.findByRole('region', { name: 'Simulator result' });
    expect(await within(simulator).findByText(/Score: 0 \/ 3/)).toBeInTheDocument();
  });

  it('offers practice-mode aids: auto-save and pause', async () => {
    const user = userEvent.setup();
    render(<CbtTerminal initial={freshSession('practice')} />);
    await loginAndStart(user);
    await user.click(screen.getByRole('radio', { name: 'Option 4' }));
    expect(loadActiveSession()?.questions[0]?.saved).toBe(3);
    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(screen.getByText('Paper paused')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /resume/i })[0]!);
    expect(screen.queryByText('Paper paused')).not.toBeInTheDocument();
  });
});
