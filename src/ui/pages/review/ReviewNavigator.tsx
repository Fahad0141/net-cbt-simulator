import {
  type FocusEvent,
  type KeyboardEvent,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Outcome, ReviewItem } from './model';
import s from './review.module.css';

export interface NavigatorGroup {
  key: string;
  title: string;
  /** e.g. `Q1–100` */
  range: string;
  items: ReviewItem[];
}

const OUTCOME_WORDS: Readonly<Record<Outcome, string>> = {
  correct: 'correct',
  wrong: 'wrong',
  blank: 'not attempted',
};

const OUTCOME_CLASS: Readonly<Record<Outcome, string | undefined>> = {
  correct: s.cellCorrect,
  wrong: s.cellWrong,
  blank: s.cellBlank,
};

/** Columns assumed for ArrowUp/ArrowDown when the layout cannot be measured. */
const FALLBACK_COLUMNS = 8;

const cellNumber = (el: EventTarget | null): number =>
  el instanceof HTMLElement && el.dataset.number ? Number(el.dataset.number) : NaN;

/**
 * The cell visually above/below `from` (nearest row first, then nearest column);
 * `undefined` when there is no such row, `null` when the layout cannot be measured.
 */
function verticalNeighbour(
  root: HTMLElement,
  from: HTMLElement,
  direction: 1 | -1,
): number | undefined | null {
  const a = from.getBoundingClientRect();
  if (a.width === 0 && a.height === 0) return null;
  const centre = a.left + a.width / 2;
  let best: HTMLElement | undefined;
  let bestDy = Infinity;
  let bestDx = Infinity;
  for (const cell of root.querySelectorAll<HTMLElement>('[data-number]')) {
    if (cell === from) continue;
    const r = cell.getBoundingClientRect();
    const dy = direction > 0 ? r.top - a.top : a.top - r.top;
    if (dy < a.height / 2) continue;
    const dx = Math.abs(r.left + r.width / 2 - centre);
    if (dy < bestDy - 1 || (Math.abs(dy - bestDy) <= 1 && dx < bestDx)) {
      best = cell;
      bestDy = dy;
      bestDx = dx;
    }
  }
  return best ? cellNumber(best) : undefined;
}

interface ReviewNavigatorProps {
  groups: readonly NavigatorGroup[];
  /** Number of the question on screen. */
  current: number | null;
  onSelect: (number: number) => void;
  /** Shown instead of the grid when no question matches the filters. */
  emptyText?: string;
}

/**
 * Compact grid of question buttons coloured by outcome. One Tab stop (roving
 * tabindex): arrow keys move between cells, Home/End jump to the ends, Enter/Space opens.
 */
export const ReviewNavigator = memo(function ReviewNavigator({
  groups,
  current,
  onSelect,
  emptyText,
}: ReviewNavigatorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const order = useMemo(() => groups.flatMap((g) => g.items.map((item) => item.number)), [groups]);
  const listed = useMemo(() => new Set(order), [order]);

  const tabStop =
    focused !== null && listed.has(focused)
      ? focused
      : current !== null && listed.has(current)
        ? current
        : (order[0] ?? null);

  // Keep the current question visible when the panel scrolls on its own (desktop
  // sidebar). Only the panel is scrolled, never the page.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || current === null || root.scrollHeight <= root.clientHeight + 1) return;
    const cell = root.querySelector<HTMLElement>(`[data-number="${current}"]`);
    if (!cell) return;
    const box = root.getBoundingClientRect();
    const r = cell.getBoundingClientRect();
    const margin = 28;
    if (r.top < box.top + margin) root.scrollTop -= box.top + margin - r.top;
    else if (r.bottom > box.bottom - margin) root.scrollTop += r.bottom - (box.bottom - margin);
  }, [current, groups]);

  const focusCell = (n: number) =>
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-number="${n}"]`)?.focus();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const from = event.target as HTMLElement;
    const n = cellNumber(from);
    const position = order.indexOf(n);
    if (position < 0) return;
    let target: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
        target = order[position + 1];
        break;
      case 'ArrowLeft':
        target = order[position - 1];
        break;
      case 'ArrowDown':
      case 'ArrowUp': {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const found = rootRef.current ? verticalNeighbour(rootRef.current, from, direction) : null;
        target = found === null ? order[position + direction * FALLBACK_COLUMNS] : found;
        break;
      }
      case 'Home':
        target = order[0];
        break;
      case 'End':
        target = order[order.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (target !== undefined) focusCell(target);
  };

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const n = cellNumber(event.target);
    if (!Number.isNaN(n)) setFocused(n);
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setFocused(null);
  };

  if (!order.length) {
    return <p className={s.navEmpty}>{emptyText ?? 'No questions match these filters.'}</p>;
  }

  return (
    <div
      ref={rootRef}
      className={s.navScroll}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      data-arrow-keys=""
    >
      {groups.map((group) => (
        <div
          key={group.key}
          className={s.navGroup}
          role="group"
          aria-label={`${group.title}, ${group.range}`}
        >
          <div className={s.navGroupHead} aria-hidden="true">
            <span className={s.navGroupTitle}>{group.title}</span>
            <span className={s.navGroupRange}>{group.range}</span>
          </div>
          <div className={s.navGrid}>
            {group.items.map((item) => {
              const isCurrent = item.number === current;
              const cls = [s.cell, OUTCOME_CLASS[item.outcome], isCurrent ? s.cellCurrent : '']
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={item.number}
                  type="button"
                  className={cls}
                  data-number={item.number}
                  data-outcome={item.outcome}
                  tabIndex={item.number === tabStop ? 0 : -1}
                  aria-current={isCurrent ? 'true' : undefined}
                  aria-label={`Question ${item.number}: ${OUTCOME_WORDS[item.outcome]}${item.state.review ? ', marked for review' : ''}`}
                  onClick={() => onSelect(item.number)}
                >
                  {item.number}
                  {item.state.review ? <span className={s.reviewDot} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});

/** Colour key for the navigator. */
export function NavigatorLegend() {
  return (
    <ul className={s.legend} aria-label="Colour key">
      <li>
        <span className={`${s.swatch} ${s.cellCorrect}`} aria-hidden="true" /> Correct
      </li>
      <li>
        <span className={`${s.swatch} ${s.cellWrong}`} aria-hidden="true" /> Wrong
      </li>
      <li>
        <span className={`${s.swatch} ${s.cellBlank}`} aria-hidden="true" /> Unattempted
      </li>
      <li>
        <span className={`${s.swatch} ${s.swatchReview}`} aria-hidden="true">
          <span className={s.reviewDot} />
        </span>{' '}
        Marked for review
      </li>
    </ul>
  );
}
