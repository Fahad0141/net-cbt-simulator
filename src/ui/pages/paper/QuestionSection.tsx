import { memo, type ReactNode } from 'react';
import type { PaperSection, Question } from '@/engine/types';
import { QuestionView } from '@/ui/components/QuestionView';
import { RichText } from '@/ui/components/RichText';
import { optionColumns, type PaperBlock, plural, rangeLabel, sectionRange } from './layout';
import css from './PaperDocument.module.css';

const COLUMN_CLASS = { 1: css.opt1, 2: css.opt2, 4: css.opt4 } as const;

/** One printed question: never split across pages, options laid out to save paper. */
export const PrintedQuestion = memo(function PrintedQuestion({
  question,
  sideBySide,
}: {
  question: Question;
  sideBySide: boolean;
}) {
  const columns = optionColumns(question.options, sideBySide);
  return (
    <div className={`${css.q} ${COLUMN_CLASS[columns]}`} data-question={question.index + 1}>
      <QuestionView
        number={question.index + 1}
        stem={question.stem}
        options={question.options}
        figure={question.figure}
        compact={columns > 1}
      />
    </div>
  );
});

interface QuestionSectionProps {
  section: PaperSection;
  /** 1-based section number. */
  number: number;
  sectionCount: number;
  blocks: readonly PaperBlock[];
  /** Render only questions whose paper index is below this (progressive rendering). */
  limit: number;
  sideBySide: boolean;
}

/** A section of the paper, starting on a new page, with continuous question numbers. */
export const QuestionSection = memo(function QuestionSection({
  section,
  number,
  sectionCount,
  blocks,
  limit,
  sideBySide,
}: QuestionSectionProps) {
  const { from, to } = sectionRange(section);
  const headingId = `paper-section-${number}`;
  const header = (
    <header className={css.sectionHead}>
      <p className={css.sectionKicker}>
        Section {number} of {sectionCount}
      </p>
      <h2 id={headingId} className={css.sectionTitle}>
        {section.title}
      </h2>
      <p className={css.sectionMeta}>
        Questions {rangeLabel(from, to)} · {plural(section.count, 'mark')}
      </p>
    </header>
  );

  const rendered: ReactNode[] = [];
  for (const [i, block] of blocks.entries()) {
    const lead = i === 0 ? header : null;
    if (block.kind === 'question') {
      if (block.question.index >= limit) break;
      const item = (
        <PrintedQuestion
          key={block.question.uid}
          question={block.question}
          sideBySide={sideBySide}
        />
      );
      rendered.push(
        lead ? (
          // Keep the section heading on the same page as its first question.
          <div key={block.question.uid} className={css.keep}>
            {lead}
            {item}
          </div>
        ) : (
          item
        ),
      );
      continue;
    }

    const [first, ...rest] = block.questions;
    if (!first || first.index >= limit) break;
    const last = block.questions[block.questions.length - 1] ?? first;
    rendered.push(
      <div key={block.id} className={css.passageGroup}>
        {/* Keep the passage on the same page as its first question. */}
        <div className={css.keep}>
          {lead}
          <div
            className={css.passage}
            role="group"
            aria-label={`Passage for questions ${rangeLabel(first.index + 1, last.index + 1)}`}
          >
            <p className={css.passageLead}>
              Read the passage and answer question{first === last ? '' : 's'}{' '}
              {rangeLabel(first.index + 1, last.index + 1)}.
            </p>
            {block.title ? <h3 className={css.passageTitle}>{block.title}</h3> : null}
            <RichText text={block.text} className={css.passageText} />
          </div>
          <PrintedQuestion question={first} sideBySide={sideBySide} />
        </div>
        {rest
          .filter((q) => q.index < limit)
          .map((q) => (
            <PrintedQuestion key={q.uid} question={q} sideBySide={sideBySide} />
          ))}
      </div>,
    );
  }

  return (
    <section
      className={`${css.sheet} ${css.newPage} ${css.sectionSheet}`}
      aria-labelledby={headingId}
    >
      {rendered.length ? rendered : header}
    </section>
  );
});
