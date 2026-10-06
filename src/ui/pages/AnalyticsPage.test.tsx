import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { decodeSpec } from '@/exam/papers';
import { archiveSession, deleteAttempt, listAttempts } from '@/exam/store';
import { kvDelete, kvSet } from '@/storage/kv';
import AnalyticsPage from './AnalyticsPage';
import { finishedSession, makePaper } from './analytics/testFixtures';

const DAY = 24 * 60 * 60_000;
const BASE = new Date(2026, 8, 20, 10, 0).getTime();

// 20 questions: maths differentiation (8, easy), maths integration (6, hard), english vocabulary (6, medium).
const engPaper = (code: string) =>
  makePaper({
    code,
    examType: 'engineering',
    title: `Engineering ${code}`,
    sections: [
      {
        subject: 'mathematics',
        blocks: [
          { chapter: 'differentiation', count: 8, difficulty: 1 },
          { chapter: 'integration', count: 6, difficulty: 3 },
        ],
      },
      { subject: 'english', blocks: [{ chapter: 'vocabulary', count: 6, difficulty: 2 }] },
    ],
  });

const bizPaper = makePaper({
  code: 'BUS-AN-0003',
  examType: 'business',
  title: 'Business paper',
  sections: [{ subject: 'english', blocks: [{ chapter: 'vocabulary', count: 10 }] }],
});

/** Differentiation always right, integration always wrong, vocabulary half right. */
const pattern = (i: number) => (i < 8 ? 'correct' : i < 14 ? 'wrong' : i % 2 ? 'correct' : 'blank');

async function seed() {
  await archiveSession(
    finishedSession({
      id: 'a1',
      paper: engPaper('ENG-AN-0001'),
      finishedAt: BASE,
      outcome: pattern,
    }),
  );
  await archiveSession(
    finishedSession({
      id: 'a2',
      paper: engPaper('ENG-AN-0002'),
      finishedAt: BASE + DAY,
      outcome: pattern,
      mode: 'practice',
    }),
  );
  await archiveSession(
    finishedSession({
      id: 'a3',
      paper: bizPaper,
      finishedAt: BASE + 2 * DAY,
      outcome: (i) => (i < 9 ? 'correct' : 'wrong'),
    }),
  );
}

beforeEach(async () => {
  for (const a of await listAttempts()) await deleteAttempt(a.id);
  window.history.replaceState(null, '', '#/analytics');
});

describe('AnalyticsPage', () => {
  it('shows an empty state without attempts', async () => {
    render(<AnalyticsPage />);
    expect(await screen.findByRole('heading', { name: 'No analytics yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a paper' })).toHaveAttribute('href', '#/new');
    expect(document.title).toBe('Analytics · NET CBT Simulator');
  });

  it('summarises all attempts with charts and text alternatives', async () => {
    await seed();
    render(<AnalyticsPage />);
    await screen.findByRole('heading', { name: 'Score trend' });

    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('Attempts').nextSibling).toHaveTextContent('3');
    expect(within(summary).getByText('2 exam · 1 practice')).toBeInTheDocument();
    // Answered: 17 + 17 + 10 = 44 of 50; correct 11 + 11 + 9 = 31.
    expect(within(summary).getByText('44')).toBeInTheDocument();
    expect(within(summary).getByText('of 50 questions in these papers')).toBeInTheDocument();

    const chart = screen.getByRole('img', { name: /score trend/i });
    expect(chart).toBeInTheDocument();
    expect(
      screen.getByText(
        /Score over 3 attempts: 55% in the first and 90% in the latest \(up 35 points\)/,
        { selector: 'figcaption' },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent(/Engineering/);

    const subjects = screen.getByRole('list', { name: 'Accuracy by subject' });
    expect(within(subjects).getByText('Mathematics')).toBeInTheDocument();
    // Maths: 16 of 28 answered correctly.
    expect(within(subjects).getByText(/16 of 28 answered correctly/)).toBeInTheDocument();

    expect(screen.getByRole('list', { name: 'Accuracy by difficulty' })).toHaveTextContent(
      /Easy100%/,
    );
    expect(screen.getByRole('img', { name: /answer outcomes/i })).toBeInTheDocument();
    expect(screen.getByText(/NET pace: 54s per question/)).toBeInTheDocument();
  });

  it('recommends the weakest chapters with a custom practice link', async () => {
    await seed();
    render(<AnalyticsPage />);
    await screen.findByRole('heading', { name: 'Weakest chapters' });

    const focus = screen
      .getByRole('heading', { name: 'Weakest chapters' })
      .closest('section') as HTMLElement;
    const items = within(focus).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Integration');

    const start = within(focus).getByRole('link', {
      name: 'Start practice test on these chapters',
    });
    const url = new URL(start.getAttribute('href')?.replace('#', 'http://x') ?? '', 'http://x');
    expect(url.pathname).toBe('/new');
    expect(url.searchParams.get('type')).toBe('custom');
    const spec = decodeSpec(url.searchParams.get('spec'));
    expect(spec?.sections.find((sec) => sec.subject === 'mathematics')?.chapters).toContain(
      'integration',
    );
    expect(spec?.durationMinutes).toBeGreaterThan(0);
  });

  it('sorts the chapter mastery table', async () => {
    await seed();
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    const table = await screen.findByRole('table', { name: /chapter mastery/i });

    const chapterNames = () =>
      within(table)
        .getAllByRole('rowheader')
        .map((h) => h.textContent);
    expect(chapterNames()).toHaveLength(3);

    await user.click(within(table).getByRole('button', { name: /accuracy/i }));
    expect(within(table).getByRole('columnheader', { name: /accuracy/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(chapterNames()[0]).toMatch(/integration/i);

    await user.click(within(table).getByRole('button', { name: /accuracy/i }));
    expect(within(table).getByRole('columnheader', { name: /accuracy/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(chapterNames()[0]).toMatch(/differentiation/i);
  });

  it('sorts by subject in both directions, keeping chapters in syllabus order', async () => {
    await seed();
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    const table = await screen.findByRole('table', { name: /chapter mastery/i });
    const chapterNames = () =>
      within(table)
        .getAllByRole('rowheader')
        .map((h) => h.textContent);

    expect(chapterNames()).toEqual([
      'Differentiation',
      'Integration',
      'Vocabulary: Synonyms and Antonyms',
    ]);
    const subjectButton = within(table).getByRole('button', { name: /subject/i });
    await user.click(subjectButton);
    expect(within(table).getByRole('columnheader', { name: /subject/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(chapterNames()).toEqual([
      'Vocabulary: Synonyms and Antonyms',
      'Differentiation',
      'Integration',
    ]);
    // Only the active column carries aria-sort.
    expect(within(table).getByRole('columnheader', { name: /accuracy/i })).not.toHaveAttribute(
      'aria-sort',
    );
    expect(table.querySelector('caption')).toHaveTextContent('sorted by subject, descending');
  });

  it('skips unreadable attempts with a warning', async () => {
    await seed();
    await kvDelete('attempt:a3');
    // A corrupt record (no paper snapshot) is skipped too, rather than breaking the page.
    await kvSet('attempt:a2', { summary: {}, session: { id: 'a2', paper: null } });
    render(<AnalyticsPage />);
    expect(
      await screen.findByText('2 saved attempts could not be read and were skipped.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Showing 1 attempt.')).toBeInTheDocument();
  });

  it('offers no practice link for chapters missing from the current syllabus', async () => {
    const legacy = makePaper({
      code: 'ENG-AN-0009',
      examType: 'engineering',
      sections: [{ subject: 'mathematics', blocks: [{ chapter: 'retired-chapter', count: 6 }] }],
    });
    await archiveSession(
      finishedSession({ id: 'old', paper: legacy, finishedAt: BASE, outcome: () => 'wrong' }),
    );
    render(<AnalyticsPage />);
    const table = await screen.findByRole('table', { name: /chapter mastery/i });

    const row = within(table)
      .getByRole('rowheader', { name: 'Retired chapter' })
      .closest('tr') as HTMLElement;
    expect(within(row).queryByRole('link')).not.toBeInTheDocument();
    const focus = screen
      .getByRole('heading', { name: 'Weakest chapters' })
      .closest('section') as HTMLElement;
    expect(within(focus).getByText('No longer in the syllabus')).toBeInTheDocument();
    expect(
      within(focus).queryByRole('link', { name: /start practice test/i }),
    ).not.toBeInTheDocument();
  });

  it('filters by exam type and mode', async () => {
    await seed();
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await screen.findByRole('heading', { name: 'Score trend' });

    await user.selectOptions(screen.getByLabelText('Exam type'), 'business');
    expect(screen.getByText('Showing 1 attempt of 3.')).toBeInTheDocument();
    expect(
      screen.getByText(/One attempt so far, scoring 90%\./, { selector: 'figcaption' }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Exam type'), 'all');
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Mode' })).getByRole('radio', {
        name: 'Practice',
      }),
    );
    expect(screen.getByText('Showing 1 attempt of 3.')).toBeInTheDocument();
    // The streak is a habit measure over every paper: three consecutive days, whatever the filter.
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('Longest 3 days · all papers')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Exam type'), 'business');
    expect(
      screen.getByRole('heading', { name: 'No attempts match these filters' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByText('Showing 3 attempts.')).toBeInTheDocument();
    // The reset button is gone; focus lands on the first filter instead of the page body.
    expect(screen.getByLabelText('Exam type')).toHaveFocus();
  });
});
