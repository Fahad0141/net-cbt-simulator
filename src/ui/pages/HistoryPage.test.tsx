import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import {
  type AttemptSummary,
  archiveSession,
  deleteAttempt,
  exportHistory,
  listAttempts,
} from '@/exam/store';
import type * as kv from '@/storage/kv';
import { kvGet, kvSet } from '@/storage/kv';
import { finishedSession, makePaper } from './analytics/testFixtures';
import HistoryPage from './HistoryPage';

const persistentMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>());

const native = vi.hoisted(() => ({
  app: false,
  writeFile: vi.fn((_options: unknown) => Promise.resolve({ uri: 'file:///cache/history.json' })),
  share: vi.fn((_options: unknown) => Promise.resolve({})),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.app },
  registerPlugin: () => ({}),
}));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: native.writeFile },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: native.share } }));

vi.mock('@/storage/kv', async (importOriginal) => {
  const actual = await importOriginal<typeof kv>();
  return { ...actual, isPersistentStorage: persistentMock };
});

const DAY = 24 * 60 * 60_000;
const BASE = new Date(2026, 8, 20, 10, 0).getTime();

const engPaper = makePaper({
  code: 'ENG-HIST-0001',
  examType: 'engineering',
  title: 'NET Engineering mock',
  sections: [
    { subject: 'mathematics', blocks: [{ chapter: 'differentiation', count: 6 }] },
    { subject: 'english', blocks: [{ chapter: 'vocabulary', count: 4 }] },
  ],
});

const bizPaper = makePaper({
  code: 'BUS-HIST-0002',
  examType: 'business',
  title: 'NET Business mock',
  sections: [{ subject: 'english', blocks: [{ chapter: 'vocabulary', count: 10 }] }],
});

async function seed() {
  // Older: engineering 7/10; newer: business 4/10 (practice, timed out).
  await archiveSession(
    finishedSession({
      id: 'h-eng',
      paper: engPaper,
      finishedAt: BASE,
      outcome: (i) => (i < 7 ? 'correct' : 'wrong'),
    }),
  );
  await archiveSession(
    finishedSession({
      id: 'h-biz',
      paper: bizPaper,
      finishedAt: BASE + DAY,
      mode: 'practice',
      finishReason: 'timeout',
      outcome: (i) => (i < 4 ? 'correct' : 'blank'),
    }),
  );
}

async function clearAll() {
  for (const a of await listAttempts()) await deleteAttempt(a.id);
}

beforeEach(async () => {
  native.app = false;
  native.writeFile.mockClear();
  native.share.mockClear();
  persistentMock.mockReset();
  persistentMock.mockResolvedValue(true);
  await clearAll();
  window.history.replaceState(null, '', '#/history');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

const rows = () => screen.getAllByRole('row').slice(1);

describe('HistoryPage', () => {
  it('shows an empty state linking to a new paper', async () => {
    render(<HistoryPage />);
    expect(await screen.findByRole('heading', { name: 'No attempts yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a paper' })).toHaveAttribute('href', '#/new');
    expect(screen.getByRole('button', { name: 'Export history' })).toBeDisabled();
    expect(document.title).toBe('History · NET CBT Simulator');
  });

  it('lists attempts newest first with score, mode and actions', async () => {
    await seed();
    render(<HistoryPage />);
    await screen.findByText('NET Business mock');

    const [first, second] = rows();
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const newest = within(first as HTMLElement);
    expect(newest.getByText('NET Business mock')).toBeInTheDocument();
    expect(newest.getByText('BUS-HIST-0002')).toBeInTheDocument();
    expect(newest.getByText('Practice')).toBeInTheDocument();
    expect(newest.getByText('Timed out')).toBeInTheDocument();
    expect(newest.getByText('40%')).toBeInTheDocument();
    expect(newest.getByRole('link', { name: /^Result of NET Business mock/ })).toHaveAttribute(
      'href',
      '#/result/h-biz',
    );
    expect(newest.getByRole('link', { name: /^Review NET Business mock/ })).toHaveAttribute(
      'href',
      '#/review/h-biz',
    );

    const older = within(second as HTMLElement);
    expect(older.getByText('NET Engineering mock')).toBeInTheDocument();
    expect(older.getByText('Exam')).toBeInTheDocument();
    expect(older.getByText('70%')).toBeInTheDocument();
    expect(older.getByRole('progressbar', { name: 'Score 70%' })).toHaveAttribute(
      'aria-valuenow',
      '70',
    );
  });

  it('filters by exam type', async () => {
    await seed();
    const user = userEvent.setup();
    render(<HistoryPage />);
    await screen.findByText('NET Business mock');

    await user.selectOptions(screen.getByLabelText('Exam type'), 'engineering');
    expect(rows()).toHaveLength(1);
    expect(screen.queryByText('NET Business mock')).not.toBeInTheDocument();
    expect(screen.getByText('NET Engineering mock')).toBeInTheDocument();
  });

  it('deletes an attempt only after confirmation', async () => {
    await seed();
    const user = userEvent.setup();
    render(<HistoryPage />);
    await screen.findByText('NET Business mock');

    await user.click(screen.getByRole('button', { name: /^Delete NET Business mock/ }));
    const confirm = screen.getByRole('button', { name: 'Yes, delete' });
    expect(confirm).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('NET Business mock')).toBeInTheDocument();
    // Focus returns to the button that opened the confirmation.
    expect(screen.getByRole('button', { name: /^Delete NET Business mock/ })).toHaveFocus();

    // Escape cancels too.
    await user.click(screen.getByRole('button', { name: /^Delete NET Business mock/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Yes, delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Delete NET Business mock/ })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /^Delete NET Business mock/ }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(screen.queryByText('NET Business mock')).not.toBeInTheDocument());
    const message = screen.getByRole('status');
    expect(message).toHaveTextContent(/Deleted “NET Business mock”/);
    // The deleted row took the focused button with it, so focus moves to the message.
    expect(message).toHaveFocus();
    expect((await listAttempts()).map((a) => a.id)).toEqual(['h-eng']);
  });

  it('keeps one live region mounted and announces repeated messages', async () => {
    await seed();
    const created = vi.fn(() => 'blob:history');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: created });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<HistoryPage />);
    await screen.findByText('NET Business mock');

    // The region exists (empty) before anything is said, so screen readers track it.
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    await user.click(screen.getByRole('button', { name: 'Export history' }));
    await waitFor(() => expect(region).toHaveTextContent('Exported 2 attempts.'));
    const first = region.firstElementChild;
    await user.click(screen.getByRole('button', { name: 'Export history' }));
    await waitFor(() => expect(created).toHaveBeenCalledTimes(2));
    // Same text, new node: the live region announces it again.
    expect(region).toHaveTextContent('Exported 2 attempts.');
    expect(region.firstElementChild).not.toBe(first);

    // Dismissing hands focus back to the toolbar instead of dropping it.
    await user.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Export history' })).toHaveFocus();
  });

  it('shows "Unknown date" for an attempt without a valid finish time', async () => {
    await seed();
    const index = (await kvGet<AttemptSummary[]>('attempts:index')) ?? [];
    await kvSet(
      'attempts:index',
      index.map((a) => (a.id === 'h-eng' ? { ...a, finishedAt: Number.NaN } : a)),
    );
    render(<HistoryPage />);
    const row = (await screen.findByText('NET Engineering mock')).closest('tr') as HTMLElement;
    expect(within(row).getByText('Unknown date')).toBeInTheDocument();
    expect(row.querySelector('time')).toBeNull();
    expect(
      within(row).getByRole('link', { name: /^Result of NET Engineering mock, Unknown date/ }),
    ).toBeInTheDocument();
  });

  it('exports history as a dated JSON download', async () => {
    await seed();
    const created: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob);
      return 'blob:history';
    });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this);
    });

    const user = userEvent.setup();
    render(<HistoryPage />);
    await screen.findByText('NET Business mock');
    await user.click(screen.getByRole('button', { name: 'Export history' }));

    await screen.findByText('Exported 2 attempts.');
    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.download).toMatch(/^net-cbt-history-\d{4}-\d{2}-\d{2}\.json$/);
    const json = JSON.parse(await blobText(created[0] as Blob)) as {
      format: string;
      attempts: unknown[];
    };
    expect(json.format).toBe('net-cbt-history');
    expect(json.attempts).toHaveLength(2);
  });

  it('in the Android app, saves the export to a file and opens the share sheet', async () => {
    native.app = true;
    await seed();
    const createObjectURL = vi.fn(() => 'blob:history');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });

    const user = userEvent.setup();
    render(<HistoryPage />);
    await screen.findByText('NET Business mock');
    // Android pickers grey out .json files of unknown type: the app accepts any file.
    expect(screen.getByLabelText('Import history file')).not.toHaveAttribute('accept');
    await user.click(screen.getByRole('button', { name: 'Export history' }));

    await screen.findByText('Exported 2 attempts.');
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(native.writeFile).toHaveBeenCalledTimes(1);
    const written = native.writeFile.mock.calls[0]?.[0] as {
      path: string;
      data: string;
      directory: string;
      encoding: string;
    };
    expect(written.path).toMatch(/^net-cbt-history-\d{4}-\d{2}-\d{2}\.json$/);
    expect(written).toMatchObject({ directory: 'CACHE', encoding: 'utf8' });
    expect((JSON.parse(written.data) as { attempts: unknown[] }).attempts).toHaveLength(2);
    expect(native.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['file:///cache/history.json'] }),
    );

    // Closing the share sheet is not an error.
    native.share.mockRejectedValueOnce(new Error('Share canceled'));
    await user.click(screen.getByRole('button', { name: 'Export history' }));
    expect(await screen.findByText('Export cancelled.')).toBeInTheDocument();
  });

  it('accepts JSON files on the website', async () => {
    render(<HistoryPage />);
    await screen.findByRole('heading', { name: 'No attempts yet' });
    expect(screen.getByLabelText('Import history file')).toHaveAttribute(
      'accept',
      'application/json,.json',
    );
  });

  it('imports a backup and reloads the list', async () => {
    await seed();
    const backup = await exportHistory();
    await clearAll();

    render(<HistoryPage />);
    await screen.findByRole('heading', { name: 'No attempts yet' });

    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
    const input = screen.getByLabelText('Import history file');
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(await screen.findByText('Imported 2 attempts from backup.json.')).toBeInTheDocument();
    expect(await screen.findByText('NET Business mock')).toBeInTheDocument();
    expect(rows()).toHaveLength(2);
  });

  it('reports an invalid import file', async () => {
    render(<HistoryPage />);
    await screen.findByRole('heading', { name: 'No attempts yet' });

    const input = screen.getByLabelText('Import history file');
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['not json'], 'bad.json')] } });
    });
    expect(
      await screen.findByText('Import failed: The file is not valid JSON.'),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['{"hello":1}'], 'other.json')] } });
    });
    expect(
      await screen.findByText(/Import failed: Not a NET CBT Simulator history file/),
    ).toBeInTheDocument();
  });

  it('reloads the list even when an import fails part-way', async () => {
    render(<HistoryPage />);
    await screen.findByRole('heading', { name: 'No attempts yet' });

    // Simulates records saved before the failure.
    await archiveSession(
      finishedSession({ id: 'h-eng', paper: engPaper, finishedAt: BASE, outcome: () => 'correct' }),
    );
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Import history file'), {
        target: { files: [new File(['{"format":"other"}'], 'broken.json')] },
      });
    });
    expect(await screen.findByText(/Import failed/)).toBeInTheDocument();
    expect(await screen.findByText('NET Engineering mock')).toBeInTheDocument();
  });

  it('shows a load error with a retry button', async () => {
    const store = await import('@/exam/store');
    const spy = vi
      .spyOn(store, 'listAttempts')
      .mockRejectedValueOnce(new Error('Storage is unavailable'));
    render(<HistoryPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage is unavailable');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'No attempts yet' })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('warns when attempts cannot be saved beyond this tab', async () => {
    persistentMock.mockResolvedValue(false);
    render(<HistoryPage />);
    expect(await screen.findByText(/kept only for this tab/)).toHaveTextContent(
      /Use Export history to keep a backup/,
    );
  });

  it('shows no storage warning when attempts are saved in the browser', async () => {
    render(<HistoryPage />);
    expect(await screen.findByText('No attempts yet')).toBeInTheDocument();
    await waitFor(() => expect(persistentMock).toHaveBeenCalled());
    expect(screen.queryByText(/kept only for this tab/)).not.toBeInTheDocument();
  });
});
