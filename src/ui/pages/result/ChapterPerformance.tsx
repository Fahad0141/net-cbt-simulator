import { useId, useMemo, useState } from 'react';
import type { SubjectId } from '@/engine/types';
import { Button, Card, LinkButton, Segmented } from '@/ui/components/ui';
import { href } from '@/ui/router';
import {
  bankPath,
  type ChapterRow,
  customPracticePath,
  FOCUS_CHAPTERS,
  focusPracticeSpec,
  harderPaperPath,
  type ResultModel,
} from './analysis';
import { formatPercent, formatQuestionTime, plural } from './format';
import { OutcomeBar, OutcomeLegend } from './OutcomeBar';
import s from './result.module.css';

/** Rows shown before "Show all chapters". */
const INITIAL_ROWS = 10;

function CellLabel({ children }: { children: string }) {
  return (
    <span className={s.cellLabel} aria-hidden="true">
      {children}
    </span>
  );
}

function FocusNext({ model }: { model: ResultModel }) {
  const headingId = useId();
  const { focus } = model;
  const spec = useMemo(
    () => focusPracticeSpec(focus, model.paper.sections),
    [focus, model.paper.sections],
  );

  if (!focus.length) {
    const harder = harderPaperPath(model);
    return (
      <section className={s.focus} aria-labelledby={headingId}>
        <h3 id={headingId} className={s.focusTitle}>
          Focus next
        </h3>
        <p className={s.focusIntro}>No weak chapters: you did not drop a single mark.</p>
        {harder ? (
          <LinkButton variant="primary" href={href(harder)}>
            Try a harder paper
          </LinkButton>
        ) : null}
      </section>
    );
  }

  const questions = spec?.sections.reduce((sum, sec) => sum + sec.count, 0) ?? 0;
  const chapters = spec?.sections.reduce((sum, sec) => sum + (sec.chapters?.length ?? 0), 0) ?? 0;
  return (
    <section className={s.focus} aria-labelledby={headingId}>
      <h3 id={headingId} className={s.focusTitle}>
        Focus next
      </h3>
      <ol className={s.focusList}>
        {focus.map((c) => (
          <li key={c.key} className={s.focusItem}>
            <div className={s.focusBody}>
              <span className={s.focusName}>{c.name}</span>
              <span className={s.focusMeta}>
                {c.subjectTitle}, {c.correct} of {c.total} correct
              </span>
              <OutcomeBar
                correct={c.correct}
                wrong={c.wrong}
                unattempted={c.unattempted}
                size="sm"
              />
            </div>
            <a
              className={s.focusLink}
              href={href(bankPath(c.subject, c.chapter))}
              aria-label={`Browse ${c.name} questions in the question bank`}
            >
              Browse
            </a>
          </li>
        ))}
      </ol>
      {spec ? (
        <div className={s.focusCta}>
          <LinkButton variant="primary" href={href(customPracticePath(spec))}>
            {chapters === 1 ? 'Practise this chapter' : `Practise these ${chapters} chapters`}
          </LinkButton>
          <span className={s.focusCtaNote}>
            {plural(questions, 'question')} in {spec.durationMinutes} minutes
            {chapters < focus.length
              ? `, skipping ${focus.length - chapters} no longer in the syllabus`
              : ''}
          </span>
        </div>
      ) : (
        <p className={s.focusCtaNote}>
          These chapters are no longer in the syllabus, so there is no practice test for them.
        </p>
      )}
    </section>
  );
}

function ChapterTableRow({ c, focusRank }: { c: ChapterRow; focusRank: number }) {
  return (
    <tr role="row" className={focusRank > 0 ? s.focusRow : undefined}>
      <th scope="row" role="rowheader" className={s.nameCell}>
        <span className={s.rowTitle}>
          {c.name}
          {focusRank > 0 ? (
            <>
              {' '}
              <span
                className={s.focusTag}
                title={`Focus chapter ${focusRank} of ${FOCUS_CHAPTERS}`}
              >
                Focus
              </span>
            </>
          ) : null}
        </span>
        <span className={s.rowMeta}>{c.subjectTitle}</span>
      </th>
      <td role="cell" className={s.n}>
        <CellLabel>Score</CellLabel>
        {c.correct}/{c.total}
      </td>
      <td role="cell" className={s.barCell}>
        <span className={s.barWithValue}>
          <OutcomeBar correct={c.correct} wrong={c.wrong} unattempted={c.unattempted} />
          <span className={s.barValue}>{formatPercent(c.percent)}</span>
        </span>
      </td>
      <td role="cell" className={s.n}>
        <CellLabel>Accuracy</CellLabel>
        {c.attempted ? formatPercent(c.accuracy) : '—'}
      </td>
      <td role="cell" className={`${s.n} ${s.optional}`}>
        <CellLabel>Wrong</CellLabel>
        {c.wrong}
      </td>
      <td role="cell" className={`${s.n} ${s.optional}`}>
        <CellLabel>Unattempted</CellLabel>
        {c.unattempted}
      </td>
      <td role="cell" className={s.n}>
        <CellLabel>Avg time / Q</CellLabel>
        {formatQuestionTime(c.avgMs)}
      </td>
    </tr>
  );
}

/** Every chapter of the paper, weakest first, with the "Focus next" shortlist on top. */
export function ChapterPerformance({ model }: { model: ResultModel }) {
  const tableId = useId();
  const [subject, setSubject] = useState<'all' | SubjectId>('all');
  const [expanded, setExpanded] = useState(false);

  const subjectOptions = useMemo(() => {
    const seen = new Map<SubjectId, string>();
    for (const sec of model.paper.sections) {
      if (!seen.has(sec.subject) && model.chapters.some((c) => c.subject === sec.subject)) {
        seen.set(sec.subject, sec.title);
      }
    }
    for (const c of model.chapters) if (!seen.has(c.subject)) seen.set(c.subject, c.subjectTitle);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [model]);

  const focusRank = useMemo(
    () => new Map(model.focus.map((c, i) => [c.key, i + 1])),
    [model.focus],
  );

  const activeSubject = subjectOptions.some((o) => o.value === subject) ? subject : 'all';
  const rows =
    activeSubject === 'all'
      ? model.chapters
      : model.chapters.filter((c) => c.subject === activeSubject);
  const visible = expanded ? rows : rows.slice(0, INITIAL_ROWS);
  const filterLabel =
    activeSubject === 'all'
      ? ''
      : ` in ${subjectOptions.find((o) => o.value === activeSubject)?.label ?? ''}`;

  return (
    <Card className={s.cq} title="Chapter-wise performance">
      {model.chapters.length ? (
        <>
          <FocusNext model={model} />
          <div className={s.toolbar}>
            <h3 className={s.subTitle}>All chapters, weakest first</h3>
            {subjectOptions.length > 1 ? (
              <div className={s.filter}>
                <Segmented
                  label="Show chapters for"
                  value={activeSubject}
                  options={[{ value: 'all', label: 'All' }, ...subjectOptions]}
                  onChange={(value) => setSubject(value)}
                />
              </div>
            ) : null}
          </div>

          <table className={`${s.table} ${s.chapterTable}`} role="table" id={tableId}>
            <caption className="visually-hidden">
              Chapters ranked weakest first{filterLabel}
            </caption>
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">
                  Chapter
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Score
                </th>
                <th scope="col" role="columnheader" className={s.barHead}>
                  Result
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Accuracy
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Wrong
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Unattempted
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Avg time / Q
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {visible.map((c) => (
                <ChapterTableRow key={c.key} c={c} focusRank={focusRank.get(c.key) ?? 0} />
              ))}
            </tbody>
          </table>

          <div className={s.tableFoot}>
            <OutcomeLegend />
            <p className={s.muted} aria-live="polite">
              Showing {visible.length} of {plural(rows.length, 'chapter')}
              {filterLabel}
            </p>
            {rows.length > INITIAL_ROWS ? (
              <Button
                aria-expanded={expanded}
                aria-controls={tableId}
                onClick={() => setExpanded((open) => !open)}
              >
                {expanded ? 'Show fewer chapters' : `Show all ${rows.length} chapters`}
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <p className={s.muted}>This paper has no questions to analyse by chapter.</p>
      )}
    </Card>
  );
}
