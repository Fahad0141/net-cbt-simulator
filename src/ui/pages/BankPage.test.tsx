import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Registry from '@/engine/registry';
import type { SettledModule } from '@/engine/registry';
import type { QuestionTemplate } from '@/engine/types';
import { useRoute } from '@/ui/router';
import { announce, resetBankMemory } from './bank/navigation';
import { resetBankStore } from './bank/store';
import BankPage from './BankPage';

const bankMock = vi.hoisted(() => ({
  modules: {} as Record<string, () => Promise<SettledModule[]>>,
  calls: [] as string[][],
}));

vi.mock('@/engine/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof Registry>();
  return {
    ...actual,
    loadBankModulesSettled: vi.fn(async (only?: readonly string[]) => {
      const prefix = only?.[0] ?? '';
      bankMock.calls.push([...(only ?? [])]);
      const loader = bankMock.modules[prefix];
      return loader ? loader() : [];
    }),
  };
});

// ---------------------------------------------------------------------------
// Fixtures

const addOne: QuestionTemplate = {
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
      stem: `Work done is ${a} J. What is ${a} + 1?`,
      answer: String(a + 1),
      distractors: [String(a + 2), String(a + 3), String(a - 1)],
      explanation: `Simply ${a} + 1 = ${a + 1}.`,
    };
  },
};

const fixedEnergy: QuestionTemplate = {
  id: 'physics/work-energy/unit-of-energy',
  subject: 'physics',
  chapter: 'work-energy',
  kind: 'static',
  difficulty: 1,
  origin: 'original',
  tags: ['units'],
  question: {
    stem: 'The SI unit of energy is the',
    answer: 'joule',
    distractors: ['watt', 'newton', 'pascal'],
    explanation: 'Energy is measured in joules.',
  },
};

const fixedMeasure: QuestionTemplate = {
  id: 'physics/measurements/prefix-mega',
  subject: 'physics',
  chapter: 'measurements',
  kind: 'static',
  difficulty: 3,
  origin: 'original',
  tags: ['prefixes'],
  question: {
    stem: 'The prefix mega stands for',
    answer: '10^6',
    distractors: ['10^3', '10^9', '10^-6'],
    explanation: 'Mega means one million.',
  },
};

const passageSet: QuestionTemplate = {
  id: 'english/comprehension/river-passage',
  subject: 'english',
  chapter: 'comprehension',
  kind: 'set',
  difficulty: 2,
  origin: 'original',
  tags: ['reading'],
  size: 2,
  generate() {
    return {
      title: 'The River',
      passage: 'The river flowed quietly past the old mill every morning.',
      questions: [
        {
          stem: 'Where did the river flow?',
          answer: 'Past the mill',
          distractors: ['Into the sea', 'Over the hill', 'Under the bridge'],
          explanation: 'The passage says it flowed past the old mill.',
        },
        {
          stem: 'When did the river flow past the mill?',
          answer: 'Every morning',
          distractors: ['Every night', 'Only in winter', 'Never'],
          explanation: 'The passage says every morning.',
        },
      ],
    };
  },
};

function physicsModules(): SettledModule[] {
  return [
    {
      path: '../bank/physics/work-energy.ts',
      module: { subject: 'physics', chapter: 'work-energy', templates: [addOne, fixedEnergy] },
    },
    {
      path: '../bank/physics/measurements.ts',
      module: { subject: 'physics', chapter: 'measurements', templates: [fixedMeasure] },
    },
    { path: '../bank/physics/waves.ts', error: 'SyntaxError: Unexpected token' },
  ];
}

// ---------------------------------------------------------------------------
// Harness: like App, re-render the page from the hash route and re-mount it on
// every hash change (App keys its error boundary by the hash).

function Harness() {
  const route = useRoute();
  return route.name === 'bank' ? (
    <BankPage key={window.location.hash} query={route.query} />
  ) : (
    <p>Left the bank</p>
  );
}

function renderAt(path: string) {
  window.location.hash = `#${path}`;
  return render(<Harness />);
}

const currentQuery = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '');

beforeEach(() => {
  resetBankStore();
  resetBankMemory();
  bankMock.calls.length = 0;
  bankMock.modules = {
    'physics/': async () => physicsModules(),
    'english/': async () => [
      {
        path: '../bank/english/comprehension.ts',
        module: { subject: 'english', chapter: 'comprehension', templates: [passageSet] },
      },
    ],
  };
});

afterEach(() => {
  window.location.hash = '';
  document.querySelectorAll('[data-bank-announcer]').forEach((el) => el.remove());
});

describe('BankPage', () => {
  it('shows subject tabs, an overview of the selected subject and flags empty or broken chapters', async () => {
    renderAt('/bank?subject=physics');

    expect(screen.getByText('Loading Physics templates…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Physics' })).toBeInTheDocument();
    expect(bankMock.calls).toContainEqual(['physics/']);
    expect(document.title).toBe('Physics · Question bank · NET CBT Simulator');

    // Tabs: the current subject is marked and shows its count once loaded.
    const tabs = screen.getByRole('navigation', { name: 'Subjects' });
    const current = within(tabs).getByRole('link', { current: 'page' });
    expect(current).toHaveTextContent('Physics');
    expect(current).toHaveTextContent('3 templates');

    // Summary stats.
    const summary = screen.getByRole('region', { name: 'Physics bank summary' });
    expect(within(summary).getByText('Templates').nextSibling).toHaveTextContent('3');
    expect(within(summary).getByText('Parametric').nextSibling).toHaveTextContent('1');
    expect(within(summary).getByText('Fixed').nextSibling).toHaveTextContent('2');
    expect(within(summary).getByText('Past-paper style').nextSibling).toHaveTextContent('33%');
    // Too few distinct questions for a full section: the parametric template makes up the rest.
    expect(screen.getByText(/57 more than the 3 distinct questions here/)).toBeInTheDocument();
    expect(
      screen.getByText(/reusing the one template that produces fresh values/),
    ).toBeInTheDocument();

    // Difficulty mix as text.
    const legend = screen.getByRole('list', { name: 'Templates by difficulty' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Easy134%', 'Medium133%', 'Hard133%']);

    // Chapter table: counts, flagged empty chapters, failed module.
    const table = screen.getByRole('table');
    // Phones see short header text, but the accessible names stay complete.
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toContain('TemplatesTotal');
    expect(within(table).getByRole('columnheader', { name: 'Templates' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Parametric' })).toBeInTheDocument();
    const workRow = within(table)
      .getByRole('rowheader', { name: /Work and Energy/ })
      .closest('tr')!;
    expect(
      within(workRow)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['XI', expect.stringMatching(/^5 /), '2', '1']);
    const fluidRow = within(table)
      .getByRole('rowheader', { name: /Fluid Dynamics/ })
      .closest('tr')!;
    expect(within(fluidRow).getByText('No templates yet')).toBeInTheDocument();
    const wavesRow = within(table).getByRole('rowheader', { name: /Waves/ }).closest('tr')!;
    expect(within(wavesRow).getByText('Failed to load')).toBeInTheDocument();

    // Load warning for the broken module.
    expect(screen.getByText(/One chapter file/)).toBeInTheDocument();
    expect(screen.getByText('physics/waves.ts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry loading' })).toBeInTheDocument();
  });

  it('explains parametric templates and links to the authoring guide', async () => {
    renderAt('/bank?subject=physics');
    await screen.findByRole('heading', { level: 2, name: 'Physics' });
    expect(screen.getByRole('heading', { name: 'How the bank works' })).toBeInTheDocument();
    expect(screen.getByText(/A small program instead of a fixed text/)).toBeInTheDocument();
    const guide = screen.getByRole('link', { name: /question authoring guide/ });
    expect(guide).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/github\.com\/.+\/docs\/QUESTION_AUTHORING\.md$/),
    );
    expect(guide).toHaveAttribute('target', '_blank');
    expect(guide).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('opens a chapter, lists its templates and filters them with the search box', async () => {
    const user = userEvent.setup();
    renderAt('/bank?subject=physics');
    await screen.findByRole('heading', { level: 2, name: 'Physics' });

    await user.click(screen.getByRole('link', { name: 'Work and Energy' }));
    const heading = await screen.findByRole('heading', { level: 2, name: 'Work and Energy' });
    // Focus follows the navigation for keyboard and screen-reader users.
    await waitFor(() => expect(heading).toHaveFocus());
    expect(currentQuery().get('chapter')).toBe('work-energy');
    expect(document.title).toBe('Work and Energy (Physics) · Question bank · NET CBT Simulator');

    const list = screen.getByRole('list', { name: 'Templates' });
    expect(within(list).getByRole('link', { name: 'add-one' })).toBeInTheDocument();
    expect(within(list).getByRole('link', { name: 'unit-of-energy' })).toBeInTheDocument();
    expect(within(list).getAllByText('Parametric').length).toBeGreaterThan(0);
    expect(within(list).getByText('Past-paper style')).toBeInTheDocument();

    const search = screen.getByRole('searchbox', { name: 'Search' });
    // Stem text of a fixed question.
    await user.type(search, 'SI unit');
    await waitFor(() => expect(screen.getByText('1 of 2 templates match.')).toBeInTheDocument());
    const matches = screen.getByRole('list', { name: 'Matching templates' });
    expect(within(matches).getByRole('link', { name: 'unit-of-energy' })).toBeInTheDocument();
    expect(within(matches).queryByRole('link', { name: 'add-one' })).not.toBeInTheDocument();

    // Tags.
    await user.clear(search);
    await user.type(search, 'arithmetic');
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Matching templates' })).getByRole('link', {
          name: 'add-one',
        }),
      ).toBeInTheDocument(),
    );

    // No match.
    await user.clear(search);
    await user.type(search, 'zzzz');
    expect(await screen.findByText('No templates match.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    await waitFor(() => expect(screen.getByText('2 templates.')).toBeInTheDocument());
  });

  it('previews a parametric template and generates a new variant with a new seed', async () => {
    const user = userEvent.setup();
    renderAt('/bank?t=physics/work-energy/add-one');

    const article = await screen.findByRole('article', { name: 'add-one' });
    expect(document.title).toBe('add-one · Question bank · NET CBT Simulator');
    expect(within(article).getByText('physics/work-energy/add-one')).toBeInTheDocument();
    expect(within(article).getByText(/\(default\)/)).toBeInTheDocument();
    const firstSeed = within(article).getByText(/^[0-9A-Z]{8}$/).textContent!;
    const firstStem = within(article).getByText(/^Work done is \d+ J/).textContent;

    // Answer and explanation are revealed.
    expect(within(article).getByText('Correct answer')).toBeInTheDocument();
    expect(within(article).getByText(/Simply \d+ \+ 1/)).toBeInTheDocument();
    expect(
      within(article).getByText(/Passes the structural checks of the paper generator/),
    ).toBeInTheDocument();

    await user.click(within(article).getByRole('button', { name: 'New variant' }));
    await waitFor(() => expect(currentQuery().get('seed')).toBeTruthy());
    const seed = currentQuery().get('seed')!;
    expect(seed).not.toBe(firstSeed);
    expect(currentQuery().get('t')).toBe('physics/work-energy/add-one');

    const updated = await screen.findByRole('article', { name: 'add-one' });
    expect(within(updated).getByText(seed)).toBeInTheDocument();
    expect(within(updated).queryByText(/\(default\)/)).not.toBeInTheDocument();
    expect(within(updated).getByText(/^Work done is \d+ J/).textContent).not.toBe(firstStem);

    // The same seed reproduces the same variant.
    const stemForSeed = within(updated).getByText(/^Work done is \d+ J/).textContent;
    window.location.hash = `#/bank?t=physics/work-energy/add-one&seed=${seed}`;
    await waitFor(() => {
      const again = screen.getByRole('article', { name: 'add-one' });
      expect(within(again).getByText(/^Work done is \d+ J/).textContent).toBe(stemForSeed);
    });
  });

  it('hides the answer on request and copies the template id', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderAt('/bank?t=physics/work-energy/unit-of-energy');

    const article = await screen.findByRole('article', { name: 'unit-of-energy' });
    expect(within(article).queryByRole('button', { name: 'New variant' })).not.toBeInTheDocument();
    expect(
      within(article).getByText(/A fixed question appears exactly like this/),
    ).toBeInTheDocument();
    expect(within(article).getByText('Correct answer')).toBeInTheDocument();

    await user.click(
      within(article).getByRole('checkbox', { name: /Show answer and explanation/ }),
    );
    expect(within(article).queryByText('Correct answer')).not.toBeInTheDocument();
    expect(within(article).queryByText('Energy is measured in joules.')).not.toBeInTheDocument();

    await user.click(within(article).getByRole('button', { name: 'Copy id' }));
    expect(writeText).toHaveBeenCalledWith('physics/work-energy/unit-of-energy');
    expect(await within(article).findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('shows every question of a passage set', async () => {
    renderAt('/bank?t=english/comprehension/river-passage');
    const article = await screen.findByRole('article', { name: 'river-passage' });
    expect(within(article).getByRole('heading', { name: 'The River' })).toBeInTheDocument();
    expect(within(article).getByText(/flowed quietly past the old mill/)).toBeInTheDocument();
    expect(within(article).getByText('Where did the river flow?')).toBeInTheDocument();
    expect(within(article).getByText('When did the river flow past the mill?')).toBeInTheDocument();
    expect(within(article).getAllByText('Correct answer')).toHaveLength(2);
    expect(within(article).getByRole('button', { name: 'New variant' })).toBeInTheDocument();
  });

  it('switches subjects through the tabs and keeps the URL in sync', async () => {
    const user = userEvent.setup();
    renderAt('/bank?subject=physics');
    await screen.findByRole('heading', { level: 2, name: 'Physics' });
    const tabs = screen.getByRole('navigation', { name: 'Subjects' });
    await user.click(within(tabs).getByRole('link', { name: /English/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'English' })).toBeInTheDocument();
    expect(currentQuery().get('subject')).toBe('english');
    // Two fixed passage questions cannot fill an English section.
    expect(screen.getByText('Not enough for a full paper yet.')).toBeInTheDocument();
    expect(bankMock.calls).toContainEqual(['english/']);
    // Physics stays loaded and keeps its count.
    expect(
      within(screen.getByRole('navigation', { name: 'Subjects' })).getByRole('link', {
        name: /Physics/,
      }),
    ).toHaveTextContent('3 templates');
  });

  it('shows an empty state for a subject without templates', async () => {
    renderAt('/bank?subject=biology');
    expect(
      await screen.findByRole('heading', { name: 'No Biology templates yet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Help write Biology questions/ })).toBeInTheDocument();
  });

  it('recovers from a failed load with Try again', async () => {
    const user = userEvent.setup();
    let fail = true;
    bankMock.modules['physics/'] = async () => {
      if (fail) throw new Error('network down');
      return physicsModules();
    };
    renderAt('/bank?subject=physics');
    expect(await screen.findByText(/could not be loaded/)).toBeInTheDocument();
    expect(screen.getByText(/network down/)).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Physics' })).toBeInTheDocument();
  });

  it('handles unknown subjects, chapters and template ids without crashing', async () => {
    const view = renderAt('/bank?subject=alchemy');
    expect(await screen.findByText(/There is no subject called/)).toBeInTheDocument();
    view.unmount();

    await act(async () => {
      window.location.hash = '#/bank?subject=physics&chapter=no-such-chapter';
    });
    const second = render(<Harness />);
    expect(await screen.findByRole('heading', { name: 'Chapter not found' })).toBeInTheDocument();
    second.unmount();

    window.location.hash =
      '#/bank?subject=physics&chapter=work-energy&t=physics/work-energy/missing';
    render(<Harness />);
    expect(await screen.findByText(/It may have been renamed or removed/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Work and Energy' })).toBeInTheDocument();
  });

  it('reports a template that throws instead of crashing', async () => {
    const broken: QuestionTemplate = {
      ...addOne,
      id: 'physics/work-energy/broken',
      generate() {
        throw new Error('bad parameters');
      },
    };
    bankMock.modules['physics/'] = async () => [
      {
        path: '../bank/physics/work-energy.ts',
        module: { subject: 'physics', chapter: 'work-energy', templates: [broken] },
      },
    ];
    renderAt('/bank?t=physics/work-energy/broken');
    const article = await screen.findByRole('article', { name: 'broken' });
    expect(
      within(article).getByText('This template failed to generate a question.'),
    ).toBeInTheDocument();
    expect(within(article).getByText(/bad parameters/)).toBeInTheDocument();
  });

  it('says what a failed check means: discarded by the generator, or broken maths only', async () => {
    const noStem: QuestionTemplate = {
      ...fixedEnergy,
      id: 'physics/work-energy/no-stem',
      question: { ...fixedEnergy.question, stem: ' ' },
    };
    const badTex: QuestionTemplate = {
      ...fixedEnergy,
      id: 'physics/work-energy/bad-tex',
      question: { ...fixedEnergy.question, stem: 'Evaluate $\\frac{1}{$ in joules' },
    };
    bankMock.modules['physics/'] = async () => [
      {
        path: '../bank/physics/work-energy.ts',
        module: { subject: 'physics', chapter: 'work-energy', templates: [noStem, badTex] },
      },
    ];

    renderAt('/bank?t=physics/work-energy/no-stem');
    const first = await screen.findByRole('article', { name: 'no-stem' });
    expect(
      within(first).getByText(
        /fails one structural check, so the paper generator would never use it/,
      ),
    ).toBeInTheDocument();
    // Contributor details open by themselves when something is wrong.
    expect(
      within(first).getByText('For contributors', { selector: 'summary' }).closest('details'),
    ).toHaveAttribute('open');

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'bad-tex' }));
    const second = await screen.findByRole('article', { name: 'bad-tex' });
    expect(
      within(second).getByText(/cannot be typeset, so it would show up broken in a paper/),
    ).toBeInTheDocument();
    expect(within(second).queryByText(/paper generator would/)).not.toBeInTheDocument();
  });

  it('remembers the search across views and returns focus to the template it came from', async () => {
    const user = userEvent.setup();
    renderAt('/bank?subject=physics&chapter=work-energy');
    await screen.findByRole('heading', { level: 2, name: 'Work and Energy' });

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'arithmetic');
    const matches = await screen.findByRole('list', { name: 'Matching templates' });
    await user.click(within(matches).getByRole('link', { name: 'add-one' }));

    // The page re-mounted for the new URL; the preview heading takes focus.
    const article = await screen.findByRole('article', { name: 'add-one' });
    await waitFor(() =>
      expect(within(article).getByRole('heading', { name: 'add-one' })).toHaveFocus(),
    );
    expect(currentQuery().get('t')).toBe('physics/work-energy/add-one');
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('arithmetic');
    expect(
      within(screen.getByRole('list', { name: 'Matching templates' })).getByRole('link', {
        name: 'add-one',
      }),
    ).toHaveAttribute('aria-current', 'true');

    await user.click(
      within(article).getByRole('link', { name: /All templates in Work and Energy/ }),
    );
    await waitFor(() => expect(screen.queryByRole('article')).not.toBeInTheDocument());
    expect(currentQuery().get('t')).toBeNull();
    await waitFor(() => expect(screen.getByRole('link', { name: 'add-one' })).toHaveFocus());
  });

  it('loads the subject again if the store forgets it while the page is open', async () => {
    renderAt('/bank?subject=physics');
    await screen.findByRole('heading', { level: 2, name: 'Physics' });
    expect(bankMock.calls.filter((c) => c[0] === 'physics/')).toHaveLength(1);

    act(() => resetBankStore());
    expect(await screen.findByRole('heading', { level: 2, name: 'Physics' })).toBeInTheDocument();
    expect(bankMock.calls.filter((c) => c[0] === 'physics/')).toHaveLength(2);
  });

  it('moves focus to the loaded view after Try again', async () => {
    const user = userEvent.setup();
    let fail = true;
    bankMock.modules['physics/'] = async () => {
      if (fail) throw new Error('offline');
      return physicsModules();
    };
    renderAt('/bank?subject=physics&chapter=work-energy');
    await screen.findByText(/could not be loaded/);
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    const heading = await screen.findByRole('heading', { level: 2, name: 'Work and Energy' });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('accepts a subject id in any case', async () => {
    renderAt('/bank?subject=English');
    expect(await screen.findByRole('heading', { level: 2, name: 'English' })).toBeInTheDocument();
    expect(screen.queryByText(/There is no subject called/)).not.toBeInTheDocument();
  });
});

describe('announce', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('speaks through a polite live region and clears it again', () => {
    vi.useFakeTimers();
    announce('Copied template id x');
    const region = document.querySelector('[data-bank-announcer]')!;
    expect(region).toHaveAttribute('aria-live', 'polite');
    vi.advanceTimersByTime(100);
    expect(region).toHaveTextContent('Copied template id x');
    vi.advanceTimersByTime(8000);
    expect(region).toHaveTextContent('');
  });
});
