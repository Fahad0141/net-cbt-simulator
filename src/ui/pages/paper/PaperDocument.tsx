import { type CSSProperties, useMemo } from 'react';
import type { Paper } from '@/engine/types';
import { AnswerKey } from './AnswerKey';
import { AnswerSheet } from './AnswerSheet';
import { Cover } from './Cover';
import { footerText, groupBlocks, type PaperHeading, sectionQuestions } from './layout';
import { QuestionSection } from './QuestionSection';
import { FONT_SIZE_PT, type PrintSettings } from './settings';
import { Solutions } from './Solutions';
import css from './PaperDocument.module.css';

export interface PaperDocumentProps {
  paper: Paper;
  heading: PaperHeading;
  settings: PrintSettings;
  generatedAt: number;
  /** Questions rendered so far (progressive rendering); the rest follow during idle time. */
  renderedCount: number;
  /** Render everything now (printing). */
  renderAll: boolean;
}

/**
 * The printable Full Length Paper: cover, sections, answer sheet, answer key and
 * worked solutions. On screen it previews the printout as white A4 sheets.
 */
export function PaperDocument({
  paper,
  heading,
  settings,
  generatedAt,
  renderedCount,
  renderAll,
}: PaperDocumentProps) {
  const sections = useMemo(() => paper.sections.filter((s) => s.count > 0), [paper]);
  const blocks = useMemo(
    () => sections.map((s) => groupBlocks(sectionQuestions(paper, s))),
    [paper, sections],
  );
  const limit = renderAll ? paper.questions.length : renderedCount;
  const complete = limit >= paper.questions.length;
  const style = { '--paper-size': `${FONT_SIZE_PT[settings.fontSize]}pt` } as CSSProperties;

  return (
    <article className={css.document} style={style} aria-label="Printable paper">
      <Cover paper={paper} heading={heading} settings={settings} generatedAt={generatedAt} />
      {sections.map((section, i) =>
        section.start < limit ? (
          <QuestionSection
            key={`${section.subject}-${section.start}`}
            section={section}
            number={i + 1}
            sectionCount={sections.length}
            blocks={blocks[i] ?? []}
            limit={Math.min(limit, section.start + section.count)}
            sideBySide={settings.twoColumnOptions}
          />
        ) : null,
      )}
      {complete && settings.answerSheet ? <AnswerSheet paper={paper} heading={heading} /> : null}
      {complete && settings.answerKey ? <AnswerKey paper={paper} /> : null}
      {complete && settings.solutions ? <Solutions paper={paper} renderAll={renderAll} /> : null}
      {complete ? (
        <footer className={css.docFooter}>
          <p>{footerText(paper.code)}</p>
          <p className={css.docFooterNote}>
            Question bank v{paper.bankVersion} · not affiliated with or endorsed by NUST · for
            practice only
          </p>
        </footer>
      ) : (
        <p className={css.pending} aria-hidden="true">
          Laying out questions…
        </p>
      )}
    </article>
  );
}
