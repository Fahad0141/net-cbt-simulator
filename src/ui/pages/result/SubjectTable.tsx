import { Card } from '@/ui/components/ui';
import type { ResultModel } from './analysis';
import { formatPercent, formatQuestionTime, plural } from './format';
import { OutcomeBar } from './OutcomeBar';
import s from './result.module.css';

/** Inline label shown above a value when the table collapses into cards on phones. */
function CellLabel({ children }: { children: string }) {
  return (
    <span className={s.cellLabel} aria-hidden="true">
      {children}
    </span>
  );
}

/**
 * Section-by-section marks. The table keeps explicit ARIA roles because on narrow
 * screens CSS turns its rows into cards, which would otherwise drop table semantics.
 */
export function SubjectTable({ model }: { model: ResultModel }) {
  const { subjects } = model;
  const { overall } = model.report;
  const showTotal = subjects.length > 1;

  return (
    <Card className={s.cq} title="Subject-wise performance">
      {subjects.length === 0 ? (
        <p className={s.muted}>This paper has no sections to report.</p>
      ) : (
        <>
          <table className={`${s.table} ${s.subjectTable}`} role="table">
            <caption className="visually-hidden">
              Score, answers, accuracy and average time per question for each section
            </caption>
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">
                  Subject
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Score
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Correct
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Wrong
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Unattempted
                </th>
                <th scope="col" role="columnheader" className={s.barHead}>
                  Result
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Accuracy
                </th>
                <th scope="col" role="columnheader" className={s.n}>
                  Avg time / Q
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {subjects.map((sub, i) => (
                <tr role="row" key={`${sub.subject}-${i}`}>
                  <th scope="row" role="rowheader" className={s.nameCell}>
                    <span className={s.rowTitle}>{sub.title}</span>
                    <span className={s.rowMeta}>{plural(sub.total, 'question')}</span>
                  </th>
                  <td role="cell" className={s.n}>
                    <CellLabel>Score</CellLabel>
                    {sub.score}/{sub.maxScore}
                  </td>
                  <td role="cell" className={`${s.n} ${s.optional}`}>
                    <CellLabel>Correct</CellLabel>
                    {sub.correct}
                  </td>
                  <td role="cell" className={`${s.n} ${s.optional}`}>
                    <CellLabel>Wrong</CellLabel>
                    {sub.wrong}
                  </td>
                  <td role="cell" className={`${s.n} ${s.optional}`}>
                    <CellLabel>Unattempted</CellLabel>
                    {sub.unattempted}
                  </td>
                  <td role="cell" className={s.barCell}>
                    <span className={s.barWithValue}>
                      <OutcomeBar
                        correct={sub.correct}
                        wrong={sub.wrong}
                        unattempted={sub.unattempted}
                      />
                      <span className={s.barValue}>{formatPercent(sub.percent)}</span>
                    </span>
                  </td>
                  <td role="cell" className={s.n}>
                    <CellLabel>Accuracy</CellLabel>
                    {sub.attempted ? formatPercent(sub.accuracy) : '—'}
                  </td>
                  <td role="cell" className={s.n}>
                    <CellLabel>Avg time / Q</CellLabel>
                    {formatQuestionTime(sub.avgMs)}
                  </td>
                </tr>
              ))}
            </tbody>
            {showTotal ? (
              <tfoot role="rowgroup">
                <tr role="row" className={s.totalRow}>
                  <th scope="row" role="rowheader" className={s.nameCell}>
                    <span className={s.rowTitle}>Total</span>
                    <span className={s.rowMeta}>{plural(overall.total, 'question')}</span>
                  </th>
                  <td role="cell" className={s.n}>
                    <CellLabel>Score</CellLabel>
                    {overall.score}/{overall.maxScore}
                  </td>
                  <td role="cell" className={`${s.n} ${s.optional}`}>
                    <CellLabel>Correct</CellLabel>
                    {overall.correct}
                  </td>
                  <td role="cell" className={`${s.n} ${s.optional}`}>
                    <CellLabel>Wrong</CellLabel>
                    {overall.wrong}
                  </td>
                  <td role="cell" className={`${s.n} ${s.optional}`}>
                    <CellLabel>Unattempted</CellLabel>
                    {overall.unattempted}
                  </td>
                  <td role="cell" className={s.barCell}>
                    <span className={s.barWithValue}>
                      <OutcomeBar
                        correct={overall.correct}
                        wrong={overall.wrong}
                        unattempted={overall.unattempted}
                      />
                      <span className={s.barValue}>{formatPercent(overall.percent)}</span>
                    </span>
                  </td>
                  <td role="cell" className={s.n}>
                    <CellLabel>Accuracy</CellLabel>
                    {overall.attempted ? formatPercent(overall.accuracy) : '—'}
                  </td>
                  <td role="cell" className={s.n}>
                    <CellLabel>Avg time / Q</CellLabel>
                    {formatQuestionTime(model.timing.avgMs)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
          <p className={s.tableNote}>
            Target pace: {formatQuestionTime(model.timing.paceMs)} per question
          </p>
        </>
      )}
    </Card>
  );
}
