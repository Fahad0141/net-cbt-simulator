import { formatPercent } from './format';
import s from './result.module.css';

export interface OutcomeCounts {
  correct: number;
  wrong: number;
  unattempted: number;
}

const SEGMENTS = [
  { key: 'correct', name: 'Correct', className: s.segCorrect },
  { key: 'wrong', name: 'Wrong', className: s.segWrong },
  { key: 'unattempted', name: 'Unattempted', className: s.segBlank },
] as const;

/**
 * Part-to-whole bar of correct / wrong / unattempted answers. Without `label` it is
 * decorative (the numbers must be shown next to it); with `label` it is an image
 * with that text alternative.
 */
export function OutcomeBar({
  correct,
  wrong,
  unattempted,
  label,
  size = 'md',
}: OutcomeCounts & { label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const counts = { correct, wrong, unattempted };
  const total = correct + wrong + unattempted;
  const sizeClass = size === 'sm' ? s.barSm : size === 'lg' ? s.barLg : s.barMd;
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const);
  return (
    <div className={`${s.outcomeBar} ${sizeClass}`} {...a11y}>
      {total > 0
        ? SEGMENTS.filter((seg) => counts[seg.key] > 0).map((seg) => (
            <span
              key={seg.key}
              className={`${s.segment} ${seg.className}`}
              style={{ flexGrow: counts[seg.key] }}
              title={`${seg.name}: ${counts[seg.key]} (${formatPercent((counts[seg.key] / total) * 100)})`}
            />
          ))
        : null}
    </div>
  );
}

/** Legend for outcome bars; with counts it doubles as the data table of the bar. */
export function OutcomeLegend({ counts }: { counts?: OutcomeCounts }) {
  return (
    <ul className={s.legend}>
      {SEGMENTS.map((seg) => (
        <li key={seg.key} className={s.legendItem}>
          <span className={`${s.swatch} ${seg.className}`} aria-hidden="true" />
          <span>{seg.name}</span>
          {counts ? <strong className={s.legendValue}>{counts[seg.key]}</strong> : null}
        </li>
      ))}
    </ul>
  );
}
