import { Fragment, memo } from 'react';
import type { Paper } from '@/engine/types';
import { answerSheetColumns, LETTERS, type PaperHeading, rangeLabel, sectionRange } from './layout';
import css from './PaperDocument.module.css';

function Bubble({ letter, mark }: { letter: string; mark?: 'filled' | 'tick' | 'cross' | 'dot' }) {
  const glyph = mark === 'tick' ? '✓' : mark === 'cross' ? '✗' : mark === 'dot' ? '•' : letter;
  return (
    <span className={`${css.bubble} ${mark === 'filled' ? css.bubbleFilled : ''}`}>
      {mark === 'filled' ? '' : glyph}
    </span>
  );
}

/** OMR-style bubble sheet: four bubbles for every question, in numbered columns. */
export const AnswerSheet = memo(function AnswerSheet({
  paper,
  heading,
}: {
  paper: Paper;
  heading: PaperHeading;
}) {
  const total = paper.questions.length;
  const columns = answerSheetColumns(total);
  const sectionStarts = new Map(
    paper.sections.filter((s) => s.count > 0).map((s) => [s.start + 1, s.title]),
  );

  return (
    <section
      className={`${css.sheet} ${css.newPage} ${css.omr}`}
      aria-labelledby="paper-answer-sheet"
    >
      <header className={css.omrHead}>
        <div>
          <h2 id="paper-answer-sheet" className={css.omrTitle}>
            Answer Sheet
          </h2>
          <p className={css.omrSub}>{heading.shortName}</p>
        </div>
        <span className={css.codeBox}>
          <span className={css.codeLabel}>Paper code</span>{' '}
          <strong className={css.code}>{paper.code}</strong>
        </span>
      </header>

      <div className={css.omrFields}>
        <div className={`${css.blank} ${css.blankWide}`}>
          <span className={css.blankLabel}>Name</span>
          <span className={css.blankLine} aria-hidden="true" />
        </div>
        <div className={css.blank}>
          <span className={css.blankLabel}>Roll / application no.</span>
          <span className={css.blankLine} aria-hidden="true" />
        </div>
        <div className={css.blank}>
          <span className={css.blankLabel}>Signature</span>
          <span className={css.blankLine} aria-hidden="true" />
        </div>
      </div>

      <div className={css.omrHelp}>
        <p>
          Use a black or blue ball-point pen. Fill <strong>one</strong> bubble per question{' '}
          <strong>completely</strong>. Do not tick, cross or half-fill bubbles; marks outside the
          bubbles are ignored.
        </p>
        <p className={css.omrExamples} aria-hidden="true">
          <span className={css.omrExample}>
            Correct <Bubble letter="B" mark="filled" />
          </span>
          <span className={css.omrExample}>
            Wrong <Bubble letter="B" mark="tick" />
            <Bubble letter="B" mark="cross" />
            <Bubble letter="B" mark="dot" />
          </span>
        </p>
      </div>

      <p className={css.omrLegend}>
        {paper.sections
          .filter((s) => s.count > 0)
          .map((s) => {
            const { from, to } = sectionRange(s);
            return (
              <span key={`${s.subject}-${s.start}`} className={css.omrLegendItem}>
                {s.title}: {rangeLabel(from, to)}
              </span>
            );
          })}
      </p>

      <p className="visually-hidden">
        The printed grid has four bubbles, A to D, for each question from 1 to {total}.
      </p>
      <div className={css.omrGrid} aria-hidden="true">
        {columns.map((column) => (
          <div key={column.from} className={css.omrCol}>
            {Array.from({ length: column.to - column.from + 1 }, (_, i) => {
              const n = column.from + i;
              const section = sectionStarts.get(n);
              return (
                <Fragment key={n}>
                  {section ? <div className={css.omrSection}>{section}</div> : null}
                  <div className={`${css.omrRow} ${n % 5 === 0 ? css.omrRowGap : ''}`}>
                    <span className={css.omrNum}>{n}</span>
                    {LETTERS.map((letter) => (
                      <Bubble key={letter} letter={letter} />
                    ))}
                  </div>
                </Fragment>
              );
            })}
          </div>
        ))}
      </div>

      <div className={css.omrTally}>
        <span>Correct ______</span>
        <span>Wrong ______</span>
        <span>Unattempted ______</span>
        <span>Score ______ / {total}</span>
      </div>
    </section>
  );
});
