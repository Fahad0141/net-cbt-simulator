import { loadActiveSession } from '@/exam/store';
import { isResumable } from '@/ui/pages/home/activeSession';
import { parseHash } from '@/ui/router';
import { leaveApp, onBackButton } from './native';

export type BackAction = 'close-dialog' | 'ignore' | 'back' | 'exit';

export interface BackState {
  /** A modal dialog is open. */
  dialogOpen: boolean;
  /** The CBT terminal shows a test that is not finished (login, instructions or the paper). */
  inTest: boolean;
  /** The WebView has an earlier page to go back to. */
  canGoBack: boolean;
}

/**
 * What the Android back button does. A dialog closes first, as with Escape. The real
 * exam terminal has no back navigation (candidates end the paper with FINISH), so
 * the button does nothing during a test. Elsewhere it goes back, or leaves the app.
 */
export function backButtonAction(state: BackState): BackAction {
  if (state.dialogOpen) return 'close-dialog';
  if (state.inTest) return 'ignore';
  return state.canGoBack ? 'back' : 'exit';
}

/** True on `#/exam` while a stored session is still in progress. */
export function isTestInProgress(hash: string): boolean {
  if (parseHash(hash).name !== 'exam') return false;
  try {
    return isResumable(loadActiveSession());
  } catch {
    return false;
  }
}

/** The topmost open modal dialog, if any. */
function openDialog(): HTMLElement | null {
  const dialogs = document.querySelectorAll<HTMLElement>('[aria-modal="true"]');
  return dialogs[dialogs.length - 1] ?? null;
}

/** Closes a dialog through its own Escape handling (focus is restored as usual). */
function pressEscape(dialog: HTMLElement): void {
  const active = document.activeElement;
  const target = active instanceof HTMLElement && dialog.contains(active) ? active : dialog;
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Registers the back-button policy (once, at startup, in the Android app only). */
export function installBackButton(): void {
  onBackButton(({ canGoBack }) => {
    const dialog = openDialog();
    const action = backButtonAction({
      dialogOpen: dialog !== null,
      inTest: isTestInProgress(window.location.hash),
      canGoBack,
    });
    if (action === 'close-dialog' && dialog) pressEscape(dialog);
    else if (action === 'back') window.history.back();
    else if (action === 'exit') void leaveApp();
  });
}
