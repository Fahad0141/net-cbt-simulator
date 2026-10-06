import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { EXAM_TYPES } from '@/config/exams';
import { BANK_VERSION } from '@/exam/papers';
import AboutPage from './AboutPage';

afterEach(() => {
  window.location.hash = '';
});

describe('AboutPage', () => {
  it('sets the document title and renders every section', () => {
    render(<AboutPage />);
    expect(document.title).toBe('About · NET CBT Simulator');
    expect(
      screen.getByRole('heading', { level: 1, name: /about net cbt simulator/i }),
    ).toBeInTheDocument();
    for (const name of [
      'What this is',
      'The NET at a glance',
      'How the CBT replica behaves',
      'How papers are generated',
      'FAQ',
      'Keyboard shortcuts',
      'Credits & licence',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });

  it('states clearly that the app is unofficial and private', () => {
    render(<AboutPage />);
    expect(
      screen.getByText(/not affiliated with, endorsed by or connected to/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/stay in this browser/i)).toBeInTheDocument();
  });

  it('talks about this computer and the Windows print dialog in the desktop app', () => {
    window.netcbtDesktop = { platform: 'desktop', version: '1.0.0' };
    try {
      render(<AboutPage />);
      expect(screen.getByText(/stay on this computer/i)).toBeInTheDocument();
      expect(screen.getByText(/the Windows print dialog/i)).toBeInTheDocument();
      expect(screen.getByText(/nothing leaves this computer/i)).toBeInTheDocument();
      expect(screen.queryByText(/in this browser/i)).not.toBeInTheDocument();
    } finally {
      delete window.netcbtDesktop;
    }
  });

  it('builds the current pattern table from EXAM_TYPES with counts and weightage', () => {
    render(<AboutPage />);
    const table = screen.getByRole('table', { name: /current net papers/i });
    for (const exam of EXAM_TYPES.filter((e) => e.era === 'current')) {
      expect(within(table).getByText(exam.name)).toBeInTheDocument();
    }
    // Engineering: Mathematics 100 of 200 = 50%.
    const engineering = within(table)
      .getAllByRole('rowgroup')
      .find((g) => within(g).queryByText('NET Engineering'));
    expect(engineering).toBeDefined();
    const mathsRow = within(engineering as HTMLElement).getByRole('row', { name: /^mathematics/i });
    expect(within(mathsRow).getByText('100')).toBeInTheDocument();
    expect(within(mathsRow).getByText('50%')).toBeInTheDocument();
    expect(
      within(table).getByRole('link', { name: /^practise this paper\s*: net engineering$/i }),
    ).toHaveAttribute('href', '#/new?type=engineering');
  });

  it('keeps legacy patterns in a collapsible section', async () => {
    const user = userEvent.setup();
    render(<AboutPage />);
    const summary = screen.getByText(/legacy patterns \(up to net-2024\)/i);
    const details = summary.closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    await user.click(summary);
    expect(details.open).toBe(true);
    const table = within(details).getByRole('table', { name: /legacy net papers/i });
    expect(within(table).getByText('Engineering — pre-2025 pattern')).toBeInTheDocument();
    expect(within(table).getAllByText('Intelligence').length).toBeGreaterThan(0);
    // Legacy Engineering: Chemistry 30 of 200 = 15%, as on the Sep 2023 weightings page.
    const legacyEngineering = within(table)
      .getAllByRole('rowgroup')
      .find((g) => within(g).queryByText('Engineering — pre-2025 pattern'));
    const chemistry = within(legacyEngineering as HTMLElement).getByRole('row', {
      name: /^chemistry/i,
    });
    expect(within(chemistry).getByText('30')).toBeInTheDocument();
    expect(within(chemistry).getByText('15%')).toBeInTheDocument();
  });

  it('lists every paper-code prefix, including legacy ones', () => {
    render(<AboutPage />);
    const prefixes = screen.getByRole('list', { name: /paper code prefixes/i });
    for (const exam of EXAM_TYPES)
      expect(within(prefixes).getByText(exam.code)).toBeInTheDocument();
  });

  it('lists the key exam facts and merit formula', () => {
    render(<AboutPage />);
    expect(screen.getByText(/1 mark each, no negative marking/)).toBeInTheDocument();
    expect(screen.getByText('180 min')).toBeInTheDocument();
    expect(screen.getByText(/NET 75% \+ HSSC/)).toBeInTheDocument();
    expect(screen.getByText(/→ 74\.25%/)).toBeInTheDocument();
    expect(screen.getByText('Islamabad')).toBeInTheDocument();
    expect(screen.getByText('Gilgit')).toBeInTheDocument();
  });

  it('describes the CBT terminal and its finish confirmation', () => {
    render(<AboutPage />);
    expect(screen.getByText('Question No : 12 of 200')).toBeInTheDocument();
    expect(screen.getByText(/You will not be able to Logon again/)).toBeInTheDocument();
    expect(screen.getByText(/An answer counts only after you press Save/)).toBeInTheDocument();
    for (const label of ['Next Section', 'Prev Section', 'First', 'Last', 'Help', 'Review']) {
      expect(screen.getByText(label, { selector: 'span' })).toBeInTheDocument();
    }
    const aids = screen.getByRole('heading', { name: /simulator aids/i })
      .nextElementSibling as HTMLElement;
    for (const aid of [
      /question navigator/i,
      /pause/i,
      /keyboard shortcuts/i,
      /instant feedback/i,
    ]) {
      expect(within(aids).getByRole('heading', { level: 4, name: aid })).toBeInTheDocument();
    }
  });

  it('gives shortcut keys spoken names', () => {
    render(<AboutPage />);
    const table = screen.getByRole('table', { name: /keyboard shortcuts/i });
    expect(
      within(table).getByRole('row', {
        name: /right arrow or left arrow next \/ previous question/i,
      }),
    ).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /^R Mark for review$/ })).toBeInTheDocument();
  });

  it('explains what happens to data when storage is unavailable', async () => {
    const user = userEvent.setup();
    render(<AboutPage />);
    await user.click(screen.getByText('What happens to my data?'));
    expect(screen.getByText(/if your browser blocks storage/i)).toBeVisible();
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '#/history');
  });

  it('shows the bank version and paper code prefixes', () => {
    render(<AboutPage />);
    expect(screen.getByText(BANK_VERSION)).toBeInTheDocument();
    const prefixes = screen.getByRole('list', { name: /paper code prefixes/i });
    expect(within(prefixes).getByText('CUS')).toBeInTheDocument();
    expect(within(prefixes).getByText('ENG')).toBeInTheDocument();
  });

  it('opens FAQ answers', async () => {
    const user = userEvent.setup();
    render(<AboutPage />);
    const q = screen.getByText('Are these real past papers?');
    await user.click(q);
    expect((q.closest('details') as HTMLDetailsElement).open).toBe(true);
    expect(screen.getByText(/NUST does not publish NET papers/)).toBeVisible();
  });

  it('table of contents scrolls in-page without changing the route', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/about';
    render(<AboutPage />);
    const toc = screen.getByRole('navigation', { name: /on this page/i });
    const link = within(toc).getByRole('link', { name: 'FAQ' });
    await user.click(link);
    expect(window.location.hash).toBe('#/about');
    expect(link).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'FAQ' })).toHaveFocus();
  });

  it('leaves modified clicks on table-of-contents links to the browser', () => {
    render(<AboutPage />);
    const toc = screen.getByRole('navigation', { name: /on this page/i });
    const link = within(toc).getByRole('link', { name: 'FAQ' });
    // fireEvent returns false when the handler called preventDefault().
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    expect(link).not.toHaveAttribute('aria-current');
  });

  it('external links open safely in a new tab', () => {
    render(<AboutPage />);
    for (const link of screen.getAllByRole('link')) {
      if (link.getAttribute('target') === '_blank') {
        expect(link.getAttribute('rel')).toContain('noopener');
      }
    }
    expect(screen.getAllByRole('link', { name: /github/i }).length).toBeGreaterThan(0);
  });
});
