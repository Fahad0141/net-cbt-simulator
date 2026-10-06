import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Paper, Question } from '@/engine/types';
import type * as papers from '@/exam/papers';
import { encodeSpec, type PaperRequest } from '@/exam/papers';
import { clearActiveSession, loadActiveSession } from '@/exam/store';
import { beginPaper } from '@/exam/start';
import NewPaperPage from './NewPaperPage';

const generateMock = vi.hoisted(() => vi.fn<(request: PaperRequest) => Promise<Paper>>());

vi.mock('@/exam/papers', async (importOriginal) => {
  const actual = await importOriginal<typeof papers>();
  return { ...actual, generatePaper: generateMock };
});

function question(
  index: number,
  subject: Question['subject'],
  chapter: string,
  extra: Partial<Question> = {},
): Question {
  return {
    index,
    uid: `Q#${index}`,
    templateId: `${subject}/${chapter}/t${index}`,
    templateKind: 'static',
    subject,
    chapter,
    difficulty: 2,
    origin: 'original',
    tags: [],
    stem: `Stem ${index + 1}`,
    options: ['a', 'b', 'c', 'd'],
    correct: 0,
    explanation: 'Because.',
    ...extra,
  };
}

/** A small hand-built paper standing in for the generator. */
function fakePaper(request: PaperRequest): Paper {
  const seed = request.seed ?? 'ABCD2345';
  const prefix = request.examType === 'custom' ? 'CUS' : 'ENG';
  return {
    code: `${prefix}-${seed.slice(0, 4)}-${seed.slice(4)}`,
    examType: request.examType,
    seed,
    title: request.custom?.title ?? 'NET-Engineering (Engineering / Computing)',
    durationMinutes: request.custom?.durationMinutes ?? 180,
    bankVersion: 'test',
    sections: [
      { subject: 'mathematics', title: 'Mathematics', start: 0, count: 3 },
      { subject: 'physics', title: 'Physics', start: 3, count: 1 },
    ],
    questions: [
      question(0, 'mathematics', 'differentiation', {
        difficulty: 1,
        templateKind: 'dynamic',
        origin: 'past-paper',
      }),
      question(1, 'mathematics', 'integration', { difficulty: 3, templateKind: 'dynamic' }),
      question(2, 'mathematics', 'integration'),
      question(3, 'physics', 'vectors'),
    ],
  };
}

function renderPage(query = '') {
  return render(<NewPaperPage query={new URLSearchParams(query)} />);
}

beforeEach(() => {
  generateMock.mockReset();
  generateMock.mockImplementation((request) => Promise.resolve(fakePaper(request)));
  localStorage.clear();
  clearActiveSession();
  window.location.hash = '#/new';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NewPaperPage', () => {
  it('sets the title and preselects the default test with its section breakdown', () => {
    renderPage();
    expect(document.title).toBe('New test · NET CBT Simulator');
    const radio = screen.getByRole('radio', { name: 'NET Engineering' });
    expect(radio).toBeChecked();
    expect(radio).toHaveAccessibleDescription('Mathematics 100, Physics 60, English 40');
    const details = screen.getByRole('region', { name: 'About NET Engineering' });
    expect(within(details).getByText('Who sits it')).toBeInTheDocument();
  });

  it('preselects the test type from the link', () => {
    renderPage('type=applied-sciences');
    const checked = screen
      .getAllByRole('radio')
      .find(
        (r) => (r as HTMLInputElement).checked && r.getAttribute('name') === 'new-paper-test-type',
      );
    expect(checked).toHaveAttribute('value', 'applied-sciences');
  });

  it('prefills the custom builder from a spec link', () => {
    const spec = encodeSpec({
      title: 'Weak chapters',
      durationMinutes: 25,
      sections: [{ subject: 'physics', count: 25, chapters: ['nuclear-physics'] }],
    });
    renderPage(`type=custom&spec=${spec}`);
    expect(screen.getByRole('radio', { name: 'Custom test' })).toBeChecked();
    expect(screen.getByLabelText('Questions')).toHaveValue(25);
    expect(screen.getByLabelText(/Title/)).toHaveValue('Weak chapters');
    expect(screen.getByLabelText('Subject')).toHaveValue('physics');
    expect(screen.getByText(/Chapters: 1 of/)).toBeInTheDocument();
  });

  it('validates the custom builder before generating', async () => {
    const user = userEvent.setup();
    renderPage('type=custom');
    const counts = screen.getAllByLabelText('Questions');
    await user.clear(counts[0]!);
    await user.type(counts[0]!, '2');
    await user.click(screen.getByRole('button', { name: 'Generate paper' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Fix the highlighted problem/);
    expect(screen.getByText(/Enter a whole number from 5 to 200/)).toBeInTheDocument();
    // Focus goes to the first field with a problem.
    await waitFor(() => expect(counts[0]).toHaveFocus());
    expect(counts[0]).toHaveAttribute('aria-invalid', 'true');
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('generates when the settings form is submitted (Enter in a field)', async () => {
    renderPage();
    const form = screen.getByRole('form', { name: 'Test settings' });
    const button = screen.getByRole('button', { name: 'Generate paper' });
    // The button sits in the side panel but submits the settings form, so Enter in any field generates.
    expect(button).toHaveAttribute('type', 'submit');
    expect((button as HTMLButtonElement).form).toBe(form);
    fireEvent.submit(form);
    expect(await screen.findByRole('heading', { name: 'Paper ready' })).toBeInTheDocument();
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('generates a paper, shows its summary and starts the test', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/Candidate name/), 'Ayesha');
    await user.click(screen.getByRole('button', { name: 'Generate paper' }));

    expect(await screen.findByRole('heading', { name: 'Paper ready' })).toBeInTheDocument();
    expect(generateMock).toHaveBeenCalledWith(expect.objectContaining({ examType: 'engineering' }));
    expect(screen.getByTestId('paper-code')).toHaveTextContent('ENG-ABCD-2345');
    expect(screen.getByText('Easy 1')).toBeInTheDocument();
    expect(screen.getByText('Hard 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Printable paper (PDF)' })).toHaveAttribute(
      'href',
      '#/paper/ENG-ABCD-2345?type=engineering',
    );

    await user.click(screen.getByRole('button', { name: 'Start test' }));
    const session = loadActiveSession();
    expect(session?.paper.code).toBe('ENG-ABCD-2345');
    expect(session?.candidate.name).toBe('Ayesha');
    expect(session?.settings.mode).toBe('exam');
    expect(window.location.hash).toBe('#/exam');
    expect(localStorage.getItem('net-cbt:candidate-name')).toBe('Ayesha');
  });

  it('remembers the candidate name from a previous visit', () => {
    localStorage.setItem('net-cbt:candidate-name', 'Bilal');
    renderPage();
    expect(screen.getByLabelText(/Candidate name/)).toHaveValue('Bilal');
  });

  it('builds the paper from a shared link at once', async () => {
    renderPage('type=engineering&seed=K7Q29XM4&dyn=80');
    expect(await screen.findByRole('heading', { name: 'Paper ready' })).toBeInTheDocument();
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        examType: 'engineering',
        seed: 'K7Q29XM4',
        options: expect.objectContaining({ dynamicShare: 0.8 }),
      }),
    );
    expect(screen.getByRole('textbox', { name: /Paper code/ })).toHaveValue('ENG-K7Q2-9XM4');
  });

  it('explains a bank shortage', async () => {
    generateMock.mockRejectedValue(new Error('Bank too small for physics: needed 60, produced 12'));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Generate paper' }));
    expect(await screen.findByText('Not enough Physics questions yet')).toBeInTheDocument();
    expect(screen.getAllByText(/Try another test type/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Choose another test' }));
    expect(screen.getByRole('radio', { name: 'NET Engineering' })).toHaveFocus();
  });

  it('shows a failed custom paper inline, focuses it and lets the candidate adjust and retry', async () => {
    const spec = encodeSpec({
      title: 'Weak chapters',
      durationMinutes: 120,
      sections: [{ subject: 'physics', count: 150, chapters: ['nuclear-physics'] }],
    });
    generateMock.mockRejectedValueOnce(
      new Error('Bank too small for physics: needed 150, produced 9'),
    );
    const user = userEvent.setup();
    renderPage(`type=custom&spec=${spec}`);
    await user.click(screen.getByRole('button', { name: 'Generate paper' }));

    const title = await screen.findByText('Not enough Physics questions yet');
    const message = title.closest('[tabindex="-1"]');
    // Focus moves in an effect, just after the message is committed.
    await waitFor(() => expect(message).toHaveFocus());
    expect(message).toHaveTextContent(/needs 150 Physics questions but could only build 9/);
    expect(message).toHaveTextContent(/select more chapters/);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Edit the sections' }));
    const count = screen.getByLabelText('Questions');
    expect(count).toHaveFocus();
    await user.clear(count);
    await user.type(count, '20');
    await user.click(screen.getByRole('button', { name: 'Generate paper' }));
    expect(await screen.findByRole('heading', { name: 'Paper ready' })).toBeInTheDocument();
    expect(generateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        custom: expect.objectContaining({
          sections: [expect.objectContaining({ subject: 'physics', count: 20 })],
        }),
      }),
    );
  });

  it('catches any generation failure, not only a bank shortage', async () => {
    generateMock.mockImplementationOnce(() => Promise.reject(new TypeError('x is undefined')));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Generate paper' }));
    const title = await screen.findByText('Could not generate the paper');
    await waitFor(() => expect(title.closest('[tabindex="-1"]')).toHaveFocus());
    expect(screen.getByText(/x is undefined/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });

  it('rejects an invalid paper code', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Advanced paper options'));
    await user.type(screen.getByLabelText(/Paper code/), '!!');
    await user.click(screen.getByRole('button', { name: 'Generate paper' }));
    expect(await screen.findByText(/Paper codes look like/)).toBeInTheDocument();
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('asks before discarding an unfinished test', async () => {
    const user = userEvent.setup();
    beginPaper(fakePaper({ examType: 'engineering', seed: 'OLDD1111' }), {
      mode: 'practice',
      candidateName: 'Old',
    });
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Generate paper' }));
    await user.click(await screen.findByRole('button', { name: 'Start test' }));

    const dialog = screen.getByRole('alertdialog', { name: 'Discard your unfinished test?' });
    expect(dialog).toHaveTextContent('ENG-OLDD-1111');
    await user.click(within(dialog).getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(loadActiveSession()?.paper.code).toBe('ENG-OLDD-1111');

    await user.click(screen.getByRole('button', { name: 'Start test' }));
    await user.click(screen.getByRole('button', { name: 'Discard and start new' }));
    expect(loadActiveSession()?.paper.code).toBe('ENG-ABCD-2345');
  });

  it('marks the paper out of date when settings change and makes a new code on request', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Generate paper' }));
    await screen.findByRole('heading', { name: 'Paper ready' });

    generateMock.mockImplementation((request) =>
      Promise.resolve(fakePaper({ ...request, seed: 'ZZZZ9999' })),
    );
    await user.click(screen.getByRole('button', { name: 'New code' }));
    await waitFor(() =>
      expect(screen.getByTestId('paper-code')).toHaveTextContent('ENG-ZZZZ-9999'),
    );

    await act(async () => {
      await user.click(screen.getByRole('radio', { name: 'Practice mode' }));
    });
    // Mode does not change the paper itself.
    expect(screen.getByRole('heading', { name: 'Paper ready' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Instant feedback/ })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Custom test' }));
    expect(screen.getByRole('button', { name: 'Generate updated paper' })).toBeInTheDocument();
  });
});
