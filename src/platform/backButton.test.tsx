import { act, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamSession } from '@/exam/session';
import { backButtonAction, installBackButton, isTestInProgress } from './backButton';

const mocks = vi.hoisted(() => ({
  session: null as unknown,
  listener: null as ((event: { canGoBack: boolean }) => void) | null,
  leaveApp: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/exam/store', () => ({ loadActiveSession: () => mocks.session }));
vi.mock('./native', () => ({
  onBackButton: (listener: (event: { canGoBack: boolean }) => void) => {
    mocks.listener = listener;
    return () => {};
  },
  leaveApp: mocks.leaveApp,
}));

/** Enough of a stored session for `isResumable`. */
function storedSession(phase: ExamSession['phase']): unknown {
  return {
    id: 's1',
    phase,
    paper: { code: 'ENG-K7Q2-9XM4', questions: [] },
    questions: [],
    durationMs: 60_000,
    elapsedMs: 0,
    runningSince: phase === 'running' ? 1 : null,
  };
}

/** A dialog that closes on Escape through a document listener (as in the CBT terminal). */
function DocumentDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Submit">
      <button type="button">OK</button>
    </div>
  );
}

/** A dialog that closes on Escape through React's onKeyDown (as on the new-paper page). */
function ReactDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Discard"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <button type="button">Cancel</button>
    </div>
  );
}

function Harness({ kind }: { kind: 'document' | 'react' }) {
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  if (!open) return <p>closed</p>;
  return kind === 'document' ? <DocumentDialog onClose={close} /> : <ReactDialog onClose={close} />;
}

const press = (canGoBack: boolean) => mocks.listener?.({ canGoBack });

describe('backButtonAction', () => {
  it('closes a dialog first, even during a test', () => {
    expect(backButtonAction({ dialogOpen: true, inTest: true, canGoBack: true })).toBe(
      'close-dialog',
    );
    expect(backButtonAction({ dialogOpen: true, inTest: false, canGoBack: false })).toBe(
      'close-dialog',
    );
  });

  it('does nothing in the CBT terminal of a test in progress', () => {
    expect(backButtonAction({ dialogOpen: false, inTest: true, canGoBack: true })).toBe('ignore');
    expect(backButtonAction({ dialogOpen: false, inTest: true, canGoBack: false })).toBe('ignore');
  });

  it('goes back elsewhere, or leaves the app from the first page', () => {
    expect(backButtonAction({ dialogOpen: false, inTest: false, canGoBack: true })).toBe('back');
    expect(backButtonAction({ dialogOpen: false, inTest: false, canGoBack: false })).toBe('exit');
  });
});

describe('isTestInProgress', () => {
  beforeEach(() => {
    mocks.session = null;
  });

  it('is true on the exam route while the stored session is unfinished', () => {
    for (const phase of ['login', 'instructions', 'running'] as const) {
      mocks.session = storedSession(phase);
      expect(isTestInProgress('#/exam')).toBe(true);
    }
  });

  it('is false on other routes, without a session, or once it is finished', () => {
    mocks.session = storedSession('running');
    expect(isTestInProgress('#/')).toBe(false);
    expect(isTestInProgress('#/result/s1')).toBe(false);
    mocks.session = storedSession('finished');
    expect(isTestInProgress('#/exam')).toBe(false);
    mocks.session = null;
    expect(isTestInProgress('#/exam')).toBe(false);
  });
});

describe('installBackButton', () => {
  beforeEach(() => {
    mocks.session = null;
    mocks.listener = null;
    mocks.leaveApp.mockClear();
    installBackButton();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '#/');
  });

  it.each(['document', 'react'] as const)('closes a %s-handled dialog like Escape', (kind) => {
    render(<Harness kind={kind} />);
    const back = vi.spyOn(window.history, 'back');
    act(() => press(true));
    expect(screen.getByText('closed')).toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
  });

  it('ignores the button during a test, goes back or leaves the app elsewhere', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    window.history.replaceState(null, '', '#/exam');
    mocks.session = storedSession('running');
    press(true);
    expect(back).not.toHaveBeenCalled();
    expect(mocks.leaveApp).not.toHaveBeenCalled();

    window.history.replaceState(null, '', '#/history');
    press(true);
    expect(back).toHaveBeenCalledTimes(1);
    press(false);
    expect(mocks.leaveApp).toHaveBeenCalledTimes(1);
  });
});
