import { isTypingTarget } from './useReviewShortcuts';

function element(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html;
  const el = host.querySelector('[data-target]');
  if (!el) throw new Error('missing [data-target]');
  return el;
}

describe('isTypingTarget', () => {
  it('protects text entry, selects and editable content', () => {
    expect(isTypingTarget(element('<input data-target />'))).toBe(true);
    expect(isTypingTarget(element('<input type="search" data-target />'))).toBe(true);
    expect(isTypingTarget(element('<input type="number" data-target />'))).toBe(true);
    expect(isTypingTarget(element('<textarea data-target></textarea>'))).toBe(true);
    expect(isTypingTarget(element('<select data-target><option>a</option></select>'))).toBe(true);
    expect(isTypingTarget(element('<div contenteditable="true"><b data-target>x</b></div>'))).toBe(
      true,
    );
  });

  it('leaves letter keys free on choice controls, buttons and plain content', () => {
    expect(isTypingTarget(element('<input type="radio" data-target />'))).toBe(false);
    expect(isTypingTarget(element('<input type="checkbox" role="switch" data-target />'))).toBe(
      false,
    );
    expect(isTypingTarget(element('<button data-target>Next</button>'))).toBe(false);
    expect(isTypingTarget(element('<p data-target>text</p>'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(window)).toBe(false);
  });
});
