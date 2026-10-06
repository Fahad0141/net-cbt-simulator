import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EXAM_TYPES } from '@/config/exams';
import { encodeSpec } from '@/exam/papers';
import {
  archiveSession,
  clearActiveSession,
  deleteAttempt,
  listAttempts,
  loadActiveSession,
  saveActiveSession,
} from '@/exam/store';
import HomePage from './HomePage';
import { finishedSession, newSession, runningSession } from './home/testFixtures';

const DAY = 86_400_000;

async function resetStorage() {
  clearActiveSession();
  for (const attempt of await listAttempts()) await deleteAttempt(attempt.id);
}

beforeEach(async () => {
  window.location.hash = '#/';
  await resetStorage();
});

afterEach(async () => {
  await resetStorage();
});

describe('HomePage', () => {
  it('renders the hero, sets the document title and links to the generator', async () => {
    render(<HomePage />);
    expect(document.title).toBe('Dashboard · NET CBT Simulator');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('NET CBT Simulator');
    expect(screen.getByText(/faithful replica of NUST/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Generate a full-length paper/ })).toHaveAttribute(
      'href',
      '#/new',
    );
    expect(screen.queryByRole('heading', { name: 'Test in progress' })).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: 'No attempts yet' });
  });

  it('shows a friendly empty state when there are no attempts', async () => {
    render(<HomePage />);
    const empty = await screen.findByRole('heading', { name: 'No attempts yet' });
    const card = empty.closest('section') as HTMLElement;
    expect(within(card).getByRole('link', { name: /Generate your first paper/ })).toHaveAttribute(
      'href',
      '#/new',
    );
  });

  it('summarises progress and lists the last five attempts with result links', async () => {
    const now = Date.now();
    const scores = [6, 8, 4, 10, 5, 7];
    for (const [i, correct] of scores.entries()) {
      await archiveSession(
        finishedSession({ id: `a${i}`, correct, finishedAt: now - (scores.length - i) * DAY }),
      );
    }

    render(<HomePage />);
    const recent = await screen.findByRole('heading', { name: 'Recent attempts' });
    const card = recent.closest('section') as HTMLElement;

    expect(within(card).getByText('Papers taken').nextSibling).toHaveTextContent('6');
    expect(within(card).getByText('Best score').nextSibling).toHaveTextContent('100%');
    expect(within(card).getByText('Average score').nextSibling).toHaveTextContent('66.7%');

    const resultLinks = within(card)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('#/result/'));
    expect(resultLinks.map((link) => link.getAttribute('href'))).toEqual([
      '#/result/a5',
      '#/result/a4',
      '#/result/a3',
      '#/result/a2',
      '#/result/a1',
    ]);
    expect(within(card).getAllByRole('progressbar')).toHaveLength(5);
    expect(within(card).getByRole('link', { name: 'View all 6' })).toHaveAttribute(
      'href',
      '#/history',
    );
  });

  it('offers to resume a running test with time left and answered count', async () => {
    saveActiveSession(runningSession({ minutesAgo: 38, answered: 3 }));
    render(<HomePage />);

    const panel = screen
      .getByRole('heading', { name: 'Test in progress' })
      .closest('section') as HTMLElement;
    expect(within(panel).getByText('ENG-TEST-0001')).toBeInTheDocument();
    expect(within(panel).getByText('142 min')).toBeInTheDocument();
    expect(within(panel).getByText('3 of 10')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /Resume test/ })).toHaveAttribute(
      'href',
      '#/exam',
    );
    await screen.findByRole('heading', { name: 'No attempts yet' });
  });

  it('offers to resume a test still on the login screen', async () => {
    saveActiveSession(newSession({ id: 'login-1' }));
    render(<HomePage />);
    const panel = screen
      .getByRole('heading', { name: 'Test in progress' })
      .closest('section') as HTMLElement;
    expect(within(panel).getByText('Not started')).toBeInTheDocument();
    expect(within(panel).getByText('180 min')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'No attempts yet' });
  });

  it('does not offer to resume a finished session', async () => {
    saveActiveSession(finishedSession({ id: 'done', correct: 5, finishedAt: Date.now() }));
    render(<HomePage />);
    expect(screen.queryByRole('heading', { name: 'Test in progress' })).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: 'No attempts yet' });
  });

  it('discards a test in progress only after confirmation', async () => {
    const user = userEvent.setup();
    saveActiveSession(runningSession({ answered: 2 }));
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Discard…' }));
    expect(screen.getByText(/Your 2 saved answers will be lost/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.getByRole('button', { name: 'Discard…' })).toHaveFocus();
    expect(loadActiveSession()).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Discard…' }));
    await user.click(screen.getByRole('button', { name: 'Discard test' }));
    expect(loadActiveSession()).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Test in progress' })).not.toBeInTheDocument();
    expect(screen.getByText('The test in progress was discarded.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Generate a full-length paper/ })).toHaveFocus();
  });

  it('refreshes the resume panel and progress when another tab finishes the paper', async () => {
    saveActiveSession(runningSession({ id: 'other-tab', answered: 4 }));
    render(<HomePage />);
    await screen.findByRole('heading', { name: 'No attempts yet' });
    expect(screen.getByRole('heading', { name: 'Test in progress' })).toBeInTheDocument();

    clearActiveSession();
    await archiveSession(finishedSession({ id: 'other-tab', correct: 7, finishedAt: Date.now() }));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'net-cbt:active-session' }));
    });

    const recent = await screen.findByRole('heading', { name: 'Recent attempts' });
    expect(screen.queryByRole('heading', { name: 'Test in progress' })).not.toBeInTheDocument();
    const card = recent.closest('section') as HTMLElement;
    expect(within(card).getByRole('link', { name: /View result/ })).toHaveAttribute(
      'href',
      '#/result/other-tab',
    );
  });

  it('opens a full custom-test share link in the generator', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    const spec = encodeSpec({
      title: 'Vectors drill',
      durationMinutes: 20,
      sections: [{ subject: 'mathematics', count: 15 }],
    });
    const input = screen.getByLabelText('Paper code');
    await user.click(input);
    await user.paste(`https://example.org/#/new?type=custom&seed=K7Q29XM4&spec=${spec}`);
    expect(input).toHaveAccessibleDescription(/Vectors drill.*CUS-K7Q2-9XM4/);
    await user.click(screen.getByRole('button', { name: 'Open paper' }));
    await waitFor(() =>
      expect(window.location.hash).toBe(`#/new?type=custom&seed=K7Q29XM4&spec=${spec}`),
    );
    await screen.findByRole('heading', { name: 'No attempts yet' });
  });

  it('opens a valid paper code in the generator', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    const input = screen.getByLabelText('Paper code');
    await user.type(input, 'eng k7q2 9xm4');
    expect(input).toHaveAccessibleDescription(/NET Engineering.*ENG-K7Q2-9XM4/);
    await user.click(screen.getByRole('button', { name: 'Open paper' }));
    await waitFor(() => expect(window.location.hash).toBe('#/new?type=engineering&seed=K7Q29XM4'));
  });

  it('shows an inline error for an invalid paper code and clears it on edit', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    const input = screen.getByLabelText('Paper code');
    await user.type(input, 'XYZ-1234{Enter}');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('"XYZ" is not a known paper type');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    expect(window.location.hash).toBe('#/');

    await user.type(input, '5');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Open paper' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a paper code');
  });

  it('shows a card with a practise link for every current pattern and hides legacy ones in a disclosure', async () => {
    render(<HomePage />);
    const section = screen
      .getByRole('heading', { name: 'Current NET patterns' })
      .closest('section') as HTMLElement;
    for (const exam of EXAM_TYPES) {
      const card = within(section).getByRole('article', { name: exam.name });
      expect(within(card).getByRole('link', { name: /Practise/ })).toHaveAttribute(
        'href',
        `#/new?type=${encodeURIComponent(exam.id)}`,
      );
      const inLegacy = card.closest('details') !== null;
      expect(inLegacy).toBe(exam.era === 'legacy');
    }
    expect(within(section).getByText('Legacy (pre-2025) patterns')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'No attempts yet' });
  });

  it('explains how it works and carries the unofficial disclaimer', async () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A faithful CBT terminal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A hybrid question engine' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reproducible paper codes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Private by design' })).toBeInTheDocument();
    const disclaimer = screen.getByRole('complementary', { name: 'An unofficial practice tool' });
    expect(disclaimer).toHaveTextContent(/not affiliated with, endorsed by or connected to NUST/);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'How it works' }));
    expect(screen.getByRole('heading', { name: 'How it works' })).toHaveFocus();
    await screen.findByRole('heading', { name: 'No attempts yet' });
  });
});
