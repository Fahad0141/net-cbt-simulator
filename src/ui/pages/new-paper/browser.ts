import { CANDIDATE_NAME_KEY, LIMITS } from './model';

/** Browser side effects of the new-paper page, each one safe when the API is missing or blocked. */

/** The candidate name saved on this device ('' when none or when storage is blocked). */
export function readCandidateName(): string {
  try {
    const raw = globalThis.localStorage?.getItem(CANDIDATE_NAME_KEY) ?? '';
    // Tolerate a JSON-encoded string written by another part of the app.
    if (raw.startsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === 'string') return parsed.slice(0, LIMITS.nameMax);
      } catch {
        // not JSON: use the raw text
      }
    }
    return raw.slice(0, LIMITS.nameMax);
  } catch {
    return '';
  }
}

/** Remembers the candidate name for next time (an empty name forgets it). */
export function storeCandidateName(name: string): void {
  try {
    const value = name.trim().slice(0, LIMITS.nameMax);
    if (value) globalThis.localStorage?.setItem(CANDIDATE_NAME_KEY, value);
    else globalThis.localStorage?.removeItem(CANDIDATE_NAME_KEY);
  } catch {
    // Storage unavailable (private mode, quota): the name still applies to this test.
  }
}

/** Copies text to the clipboard; resolves to false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall back to a temporary text area (older browsers, insecure origins)
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = typeof document.execCommand === 'function' && document.execCommand('copy');
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

/**
 * Resolves after the browser has had a chance to paint, so a "Generating…" state is
 * visible before the (synchronous, CPU-bound) paper assembly starts.
 */
export function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setTimeout(resolve, 0);
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(finish);
    }
    // Background tabs do not run animation frames.
    setTimeout(finish, 60);
  });
}
