import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { Card } from '@/ui/components/ui';
import { href } from '@/ui/router';
import { type Outcome, type ResultModel, reviewPath } from './analysis';
import s from './result.module.css';

const OUTCOME_TEXT: Record<Outcome, string> = {
  correct: 'correct',
  wrong: 'wrong',
  blank: 'unattempted',
};

const CELL_CLASS: Record<Outcome, string | undefined> = {
  correct: s.cellCorrect,
  wrong: s.cellWrong,
  blank: s.cellBlank,
};

/** Index of the cell in the next/previous visual row closest to the current column. */
function verticalNeighbour(cells: readonly (HTMLElement | null)[], from: number, step: 1 | -1) {
  const current = cells[from];
  if (!current) return from;
  let rowTop: number | null = null;
  let best = from;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = from + step; i >= 0 && i < cells.length; i += step) {
    const cell = cells[i];
    if (!cell || cell.offsetTop === current.offsetTop) continue;
    if (rowTop === null) rowTop = cell.offsetTop;
    else if (cell.offsetTop !== rowTop) break;
    const distance = Math.abs(cell.offsetLeft - current.offsetLeft);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

interface MapGroup {
  key: string;
  title: string;
  start: number;
  end: number;
}

/** Section groups when they tile the paper exactly; otherwise one group of everything. */
function groupsOf(sections: ResultModel['paper']['sections'], count: number): MapGroup[] {
  const groups = sections
    .filter((sec) => sec.count > 0)
    .map((sec) => ({
      key: `${sec.subject}-${sec.start}`,
      title: sec.title,
      start: sec.start,
      end: sec.start + sec.count,
    }))
    .sort((a, b) => a.start - b.start);
  let next = 0;
  for (const g of groups) {
    if (g.start !== next) break;
    next = g.end;
  }
  return groups.length && next === count
    ? groups
    : [{ key: 'all', title: 'All questions', start: 0, end: count }];
}

/**
 * Every question as an answer-sheet bubble, grouped by section; each bubble opens that
 * question in the review. One tab stop: arrow keys, Home and End move between bubbles.
 */
export function AnswerMap({ model }: { model: ResultModel }) {
  const { paper, report } = model;
  const count = paper.questions.length;
  const [active, setActive] = useState(0);
  const cells = useRef<(HTMLAnchorElement | null)[]>([]);
  const hintId = useId();

  if (!count) return null;
  const focusIndex = Math.min(active, count - 1);
  const groups = groupsOf(paper.sections, count);

  const move = (to: number) => {
    const target = Math.max(0, Math.min(count - 1, to));
    setActive(target);
    cells.current[target]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        move(index + 1);
        break;
      case 'ArrowLeft':
        move(index - 1);
        break;
      case 'ArrowDown':
        move(verticalNeighbour(cells.current, index, 1));
        break;
      case 'ArrowUp':
        move(verticalNeighbour(cells.current, index, -1));
        break;
      case 'Home':
        move(0);
        break;
      case 'End':
        move(count - 1);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <Card className={s.cq} title="Answer map">
      <ul className={s.mapLegend}>
        <li>
          <span className={`${s.mapKey} ${s.cellCorrect}`} aria-hidden="true" />
          Correct
        </li>
        <li>
          <span className={`${s.mapKey} ${s.cellWrong}`} aria-hidden="true" />
          Wrong
        </li>
        <li>
          <span className={`${s.mapKey} ${s.cellBlank}`} aria-hidden="true" />
          Unattempted
        </li>
      </ul>
      <p id={hintId} className="visually-hidden">
        Select a question to review it. The arrow keys move between questions.
      </p>
      <div className={s.mapSections}>
        {groups.map((group) => {
          const outcomes = report.outcomes.slice(group.start, group.end);
          const correct = outcomes.filter((o) => o === 'correct').length;
          return (
            <div
              key={group.key}
              className={s.mapSection}
              role="group"
              aria-label={group.title}
              aria-describedby={hintId}
            >
              <div className={s.mapSectionHead}>
                <span className={s.mapSectionTitle}>{group.title}</span>
                <span className={s.muted}>
                  {correct}/{group.end - group.start} correct
                </span>
              </div>
              <ol className={s.mapGrid}>
                {Array.from({ length: group.end - group.start }, (_unused, offset) => {
                  const index = group.start + offset;
                  const outcome = report.outcomes[index] ?? 'blank';
                  const number = index + 1;
                  return (
                    <li key={index} className={s.mapItem}>
                      <a
                        ref={(el) => {
                          cells.current[index] = el;
                        }}
                        className={`${s.mapCell} ${CELL_CLASS[outcome] ?? ''}`}
                        href={href(reviewPath(model.id, number))}
                        tabIndex={index === focusIndex ? 0 : -1}
                        aria-label={`Question ${number}: ${OUTCOME_TEXT[outcome]}`}
                        onFocus={() => setActive(index)}
                        onKeyDown={(event) => onKeyDown(event, index)}
                      >
                        {number}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
