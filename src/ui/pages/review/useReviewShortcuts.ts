import { useEffect, useRef } from 'react';

/** Widgets that use the horizontal arrow keys themselves. */
const ARROW_KEY_OWNERS =
  'input, [role="radiogroup"], [role="listbox"], [role="menu"], [role="menubar"], [role="slider"], [role="tablist"], [role="grid"], [role="tree"], [data-arrow-keys]';

/** `<input>` types that take no typed text, so letter keys are free for shortcuts. */
const NON_TEXT_INPUTS = new Set([
  'radio',
  'checkbox',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'file',
  'image',
]);

/** True when letter keys are meant for the focused element: a text field, a `<select>` (type-ahead) or editable content. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  if (target.closest('textarea, select, [contenteditable=""], [contenteditable="true"]'))
    return true;
  return target instanceof HTMLElement && target.isContentEditable === true;
}

export interface ReviewShortcutHandlers {
  next: () => void;
  previous: () => void;
}

/**
 * `j` / `→` = next question, `k` / `←` = previous question. Ignored while typing,
 * with modifier keys held, or when a widget already handled the key. The arrow keys
 * are also left to form controls (e.g. the filter radios) and widgets that use them
 * (the question navigator moves focus with them), but `j`/`k` keep working after a
 * filter chip or the explanations switch was clicked.
 */
export function useReviewShortcuts(handlers: ReviewShortcutHandlers, enabled = true): void {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing
      )
        return;
      if (isTypingTarget(event.target)) return;
      const { key } = event;
      const arrow = key === 'ArrowRight' || key === 'ArrowLeft';
      if (arrow && event.target instanceof Element && event.target.closest(ARROW_KEY_OWNERS))
        return;
      if (key === 'j' || key === 'J' || key === 'ArrowRight') {
        event.preventDefault();
        latest.current.next();
      } else if (key === 'k' || key === 'K' || key === 'ArrowLeft') {
        event.preventDefault();
        latest.current.previous();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
