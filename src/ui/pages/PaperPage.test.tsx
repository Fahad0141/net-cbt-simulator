import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Paper, Question } from '@/engine/types';
import { encodeSpec, generatePaper } from '@/exam/papers';
import PaperPage from './PaperPage';

vi.mock('@/exam/papers', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, generatePaper: vi.fn() };
});

const mockedGenerate = vi.mocked(generatePaper);

const native = vi.hoisted(() => ({
  app: false,
  print: vi.fn((_options: unknown) => Promise.resolve()),
  share: vi.fn((_options: unknown) => Promise.resolve({})),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.app },
  registerPlugin: () => ({ print: native.print }),
}));
vi.mock('@capacitor/share', () => ({ Share: { share: native.share } }));
// A build that does not know the website's address (the app then shares the paper code).
vi.mock('@/config/site', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  SITE_URL: undefined,
}));

const SEED = 'K7Q29XM4';
const CODE = 'ENG-K7Q2-9XM4';

function question(
  index: number,
  subject: Question['subject'],
  extra: Partial<Question> = {},
): Question {
  return {
    index,
    uid: `${CODE}#${index}`,
    templateId: `${subject}/t${index}`,
    templateKind: 'static',
    subject,
    chapter: 'vectors',
    difficulty: 2,
    origin: 'original',
    tags: [],
    stem: `Stem of question ${index + 1}`,
    options: [`a${index}`, `b${index}`, `c${index}`, `d${index}`],
    correct: index % 4,
    explanation: `Working for question ${index + 1}.`,
    ...extra,
  };
}

const passage = { id: 'p1', title: 'On Rivers', text: 'Rivers flow to the sea.', of: 2 };

function makePaper(overrides: Partial<Paper> = {}): Paper {
  return {
    code: CODE,
    examType: 'engineering',
    seed: SEED,
    title: 'NET-Engineering',
    durationMinutes: 180,
    bankVersion: '2026.10.0',
    sections: [
      { subject: 'mathematics', title: 'Mathematics', start: 0, count: 3 },
      { subject: 'english', title: 'English', start: 3, count: 3 },
    ],
    questions: [
      question(0, 'mathematics', { templateKind: 'dynamic', difficulty: 1 }),
      question(1, 'mathematics', { origin: 'past-paper', difficulty: 3 }),
      question(2, 'mathematics'),
      question(3, 'english', { passage: { ...passage, part: 1 } }),
      question(4, 'english', { passage: { ...passage, part: 2 } }),
      question(5, 'english'),
    ],
    ...overrides,
  };
}

function renderPage(code = CODE, query = '') {
  window.location.hash = `#/paper/${code}${query ? `?${query}` : ''}`;
  return render(<PaperPage code={code} query={new URLSearchParams(query)} />);
}

beforeEach(() => {
  mockedGenerate.mockReset();
  native.app = false;
  native.print.mockClear();
  native.share.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
});

// Generous timeouts: the suite often runs alongside other heavy test files.
configure({ asyncUtilTimeout: 5000 });

describe('PaperPage', { timeout: 20_000 }, () => {
  it('explains an invalid paper code without generating anything', async () => {
    renderPage('NOT-A-CODE!');
    expect(await screen.findByText('That paper code is not valid')).toBeInTheDocument();
    expect(screen.getByLabelText('Paper code')).toBeInTheDocument();
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(document.title).toBe('Paper not found · NET CBT Simulator');
  });

  it('validates a typed paper code', async () => {
    const user = userEvent.setup();
    renderPage('nope');
    const input = screen.getByLabelText('Paper code');
    await user.type(input, 'garbage');
    await user.click(screen.getByRole('button', { name: 'Open paper' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Enter a code like/);
    expect(input).toHaveAttribute('aria-invalid', 'true');

    await user.clear(input);
    await user.type(input, 'CUS-K7Q2-9XM4');
    await user.click(screen.getByRole('button', { name: 'Open paper' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/full link/);

    await user.clear(input);
    await user.type(input, 'eng k7q2 9xm4');
    await user.click(screen.getByRole('button', { name: 'Open paper' }));
    expect(window.location.hash).toBe(`#/paper/${CODE}`);
  });

  it('keeps an absurdly long invalid code short', async () => {
    renderPage('X'.repeat(500));
    expect(await screen.findByText('That paper code is not valid')).toBeInTheDocument();
    expect(screen.getByText(/^X+…$/).textContent).toHaveLength(40);
  });

  it('shows a loading state, then the full printable paper', async () => {
    let resolve: (paper: Paper) => void = () => {};
    mockedGenerate.mockReturnValue(new Promise<Paper>((r) => (resolve = r)));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(`Generating paper ${CODE}`);
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ examType: 'engineering', seed: SEED }),
    );

    resolve(makePaper());
    const title = await screen.findByRole('heading', { level: 2, name: /Full Length Paper/ });
    expect(title).toHaveTextContent('NET Engineering — Full Length Paper');
    expect(document.title).toBe(`NET Engineering paper ${CODE} · NET CBT Simulator`);

    // Cover: instructions and sections table.
    expect(screen.getAllByText(/no negative marking/i).length).toBeGreaterThan(0);
    const structure = screen.getByRole('table', { name: 'Paper structure' });
    expect(within(structure).getByRole('rowheader', { name: 'Mathematics' })).toBeInTheDocument();
    expect(within(structure).getByText('4–6')).toBeInTheDocument();

    // Sections with continuous numbering and every question.
    expect(screen.getByRole('heading', { level: 2, name: 'Mathematics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'English' })).toBeInTheDocument();
    for (let i = 1; i <= 6; i++)
      expect(screen.getByText(`Stem of question ${i}`)).toBeInTheDocument();

    // The passage is printed once, before its questions.
    expect(screen.getAllByText('Rivers flow to the sea.')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Passage for questions 4–5' })).toBeInTheDocument();

    // Answer sheet and key on by default; solutions off; answers never revealed in the questions.
    expect(screen.getByRole('heading', { name: 'Answer Sheet' })).toBeInTheDocument();
    const key = screen
      .getByRole('heading', { name: 'Answer Key' })
      .closest('section') as HTMLElement;
    expect(within(key).getAllByRole('table')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Worked Solutions' })).not.toBeInTheDocument();
    expect(screen.queryByText('Working for question 1.')).not.toBeInTheDocument();

    // Footer and CBT link.
    expect(
      screen.getByText(`Generated by NET CBT Simulator (unofficial) · Paper code ${CODE}`),
    ).toBeInTheDocument();
    const cbt = screen.getByRole('link', { name: 'Take this paper as a CBT test' });
    expect(cbt.getAttribute('href')).toBe(`#/new?type=engineering&seed=${SEED}`);
  });

  it('prints the answer key letters for every question', async () => {
    mockedGenerate.mockResolvedValue(makePaper());
    renderPage();
    const key = (await screen.findByRole('heading', { name: 'Answer Key' })).closest(
      'section',
    ) as HTMLElement;
    const cells = within(key)
      .getAllByRole('cell')
      .filter((cell) => cell.textContent);
    expect(cells.map((cell) => cell.textContent)).toEqual([
      '1 A',
      '2 B',
      '3 C',
      '4 D',
      '5 A',
      '6 B',
    ]);
  });

  it('toggles options and keeps them in the URL', async () => {
    const user = userEvent.setup();
    mockedGenerate.mockResolvedValue(makePaper());
    renderPage();
    await screen.findByRole('heading', { name: 'Answer Key' });

    await user.click(screen.getByRole('checkbox', { name: 'Worked solutions' }));
    expect(screen.getByRole('heading', { name: 'Worked Solutions' })).toBeInTheDocument();
    expect(screen.getByText('Working for question 1.')).toBeInTheDocument();
    expect(window.location.hash).toContain('solutions=1');

    await user.click(screen.getByRole('checkbox', { name: 'Answer key' }));
    expect(screen.queryByRole('heading', { name: 'Answer Key' })).not.toBeInTheDocument();
    expect(window.location.hash).toContain('key=0');

    await user.click(screen.getByRole('checkbox', { name: 'Answer sheet (OMR)' }));
    expect(screen.queryByRole('heading', { name: 'Answer Sheet' })).not.toBeInTheDocument();
  });

  it('honours print settings from the query', async () => {
    mockedGenerate.mockResolvedValue(makePaper());
    renderPage(CODE, 'solutions=1&key=0');
    expect(await screen.findByRole('heading', { name: 'Worked Solutions' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Answer Key' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Worked solutions' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Answer key' })).not.toBeChecked();
  });

  it('opens the print dialog', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    mockedGenerate.mockResolvedValue(makePaper());
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Print / Save as PDF' }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });

  it('prints through Android and shares the paper code in the app', async () => {
    native.app = true;
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    mockedGenerate.mockResolvedValue(makePaper());
    renderPage(CODE, 'key=0');
    await user.click(await screen.findByRole('button', { name: 'Print / Save as PDF' }));
    await waitFor(() => expect(native.print).toHaveBeenCalledTimes(1));
    expect(native.print.mock.calls[0]?.[0]).toMatchObject({ name: expect.stringContaining(CODE) });
    expect(print).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Share paper code' }));
    await waitFor(() => expect(native.share).toHaveBeenCalledTimes(1));
    const shared = native.share.mock.calls[0]?.[0] as { text: string; url?: string };
    expect(shared.url).toBeUndefined();
    expect(shared.text).toContain(CODE);
    expect(shared.text).toContain(`#/paper/${CODE}?key=0`);
  });

  it('prints with window.print and copies the paper code in the desktop app', async () => {
    window.netcbtDesktop = { platform: 'desktop', version: '1.0.0' };
    try {
      const user = userEvent.setup();
      const print = vi.spyOn(window, 'print').mockImplementation(() => {});
      mockedGenerate.mockResolvedValue(makePaper());
      renderPage(CODE, 'key=0');
      await user.click(await screen.findByRole('button', { name: 'Print / Save as PDF' }));
      await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
      expect(native.print).not.toHaveBeenCalled();

      // No website address in this build: the app:// address is never shared.
      await user.click(screen.getByRole('button', { name: 'Copy share message' }));
      expect(await screen.findByText(/share message copied/i)).toBeInTheDocument();
      const copied = await navigator.clipboard.readText();
      expect(copied).toContain(CODE);
      expect(copied).toContain(`#/paper/${CODE}?key=0`);
      expect(copied).not.toContain('app://');
      expect(native.share).not.toHaveBeenCalled();
    } finally {
      delete window.netcbtDesktop;
    }
  });

  it('explains a bank that is too small and can retry', async () => {
    const user = userEvent.setup();
    mockedGenerate.mockRejectedValueOnce(
      new Error('Bank too small for mathematics: needed 100, produced 12'),
    );
    mockedGenerate.mockResolvedValueOnce(makePaper());
    renderPage();
    expect(await screen.findByText('Not enough Mathematics questions yet')).toBeInTheDocument();
    expect(document.title).toBe('Paper unavailable · NET CBT Simulator');

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Answer Key' })).toBeInTheDocument();
    expect(mockedGenerate).toHaveBeenCalledTimes(2);
  });

  it('asks for the full link when a custom paper has no spec', async () => {
    renderPage(`CUS-${SEED}`, 'type=custom');
    expect(await screen.findByText('This custom paper link is incomplete')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Paper not found · NET CBT Simulator'));
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it('generates a custom paper from its spec', async () => {
    const spec = {
      title: 'Calculus drill',
      durationMinutes: 30,
      sections: [{ subject: 'mathematics' as const, count: 3 }],
    };
    const paper = makePaper({
      code: `CUS-K7Q2-9XM4`,
      examType: 'custom',
      title: 'Calculus drill',
      durationMinutes: 30,
      sections: [{ subject: 'mathematics', title: 'Mathematics', start: 0, count: 3 }],
      questions: makePaper().questions.slice(0, 3),
    });
    mockedGenerate.mockResolvedValue(paper);
    renderPage(`CUS-${SEED}`, `type=custom&spec=${encodeSpec(spec)}`);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Calculus drill' }),
    ).toBeInTheDocument();
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        examType: 'custom',
        seed: SEED,
        custom: expect.objectContaining({ title: 'Calculus drill' }),
      }),
    );
    const cbt =
      screen.getByRole('link', { name: 'Take this paper as a CBT test' }).getAttribute('href') ??
      '';
    expect(cbt).toContain('type=custom');
    expect(cbt).toContain(`seed=${SEED}`);
    expect(cbt).toContain(`spec=${encodeSpec(spec)}`);
  });

  it('lays out a full 200-question paper with its answer sheet and key', async () => {
    const sections = [
      { subject: 'mathematics' as const, title: 'Mathematics', start: 0, count: 100 },
      { subject: 'physics' as const, title: 'Physics', start: 100, count: 60 },
      { subject: 'english' as const, title: 'English', start: 160, count: 40 },
    ];
    const questions = sections.flatMap((s) =>
      Array.from({ length: s.count }, (_, i) => question(s.start + i, s.subject)),
    );
    mockedGenerate.mockResolvedValue(makePaper({ sections, questions }));
    const { container } = renderPage();

    // Progressive rendering finishes on its own, then the end matter appears.
    const key = (await screen.findByRole('heading', { name: 'Answer Key' })).closest(
      'section',
    ) as HTMLElement;
    expect(container.querySelectorAll('[data-question]')).toHaveLength(200);
    expect(screen.getByText('Stem of question 200')).toBeInTheDocument();
    expect(within(key).getAllByRole('table')).toHaveLength(3);
    expect(
      within(key)
        .getAllByRole('cell')
        .filter((cell) => cell.textContent),
    ).toHaveLength(200);
    expect(
      screen.getByText(/four bubbles, A to D, for each question from 1 to 200/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('titles a legacy paper and links its CBT test', async () => {
    mockedGenerate.mockResolvedValue(
      makePaper({ code: 'LEN-K7Q2-9XM4', examType: 'legacy-engineering' }),
    );
    renderPage('LEN-K7Q2-9XM4');
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'NET Engineering (pre-2025 pattern) — Full Length Paper',
      }),
    ).toBeInTheDocument();
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ examType: 'legacy-engineering', seed: SEED }),
    );
    expect(screen.getByRole('link', { name: 'Take this paper as a CBT test' })).toHaveAttribute(
      'href',
      `#/new?type=legacy-engineering&seed=${SEED}`,
    );
  });

  it('passes generation options through and starts a new code with the same settings', async () => {
    const user = userEvent.setup();
    mockedGenerate.mockResolvedValue(makePaper());
    renderPage(CODE, 'dyn=80&size=l');
    await screen.findByRole('heading', { name: 'Answer Key' });
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ options: { dynamicShare: 0.8 } }),
    );
    expect(screen.getByRole('radio', { name: 'Large' })).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('link', { name: 'Take this paper as a CBT test' }).getAttribute('href'),
    ).toBe(`#/new?type=engineering&seed=${SEED}&dyn=80`);

    await user.click(screen.getByRole('button', { name: 'New paper code' }));
    expect(window.location.hash).toMatch(/^#\/paper\/ENG-[0-9A-Z]{4}-[0-9A-Z]{4}\?dyn=80&size=l$/);
    expect(window.location.hash).not.toContain(CODE);
  });

  it('handles an empty generated paper', async () => {
    mockedGenerate.mockResolvedValue(makePaper({ questions: [], sections: [] }));
    renderPage();
    expect(await screen.findByText('This paper has no questions')).toBeInTheDocument();
  });
});
