import { Badge, ui } from '@/ui/components/ui';
import type { SubjectId } from '@/engine/types';
import { BankLink } from './BankLink';
import type { SubjectBank } from './store';
import s from './bank.module.css';

const PART_LABEL = { XI: 'XI', XII: 'XII', '-': '—' } as const;

/** Column header that shortens on phones; screen readers always hear the full label. */
function ColumnLabel({ full, short }: { full: string; short: string }) {
  return (
    <>
      <span className={s.fullLabel}>{full}</span>
      <span className={s.shortLabel} aria-hidden="true">
        {short}
      </span>
    </>
  );
}

function formatShare(share: number): string {
  if (share <= 0) return '0%';
  return share < 1 ? '<1%' : `${Math.round(share)}%`;
}

/**
 * Syllabus chapters of one subject with template counts. Chapters without templates
 * (or whose module failed to load) are flagged. On phones, part and weight move
 * under the chapter name instead of taking their own columns.
 */
export function ChapterTable({ bank, subjectName }: { bank: SubjectBank; subjectName: string }) {
  const subject: SubjectId = bank.subject;
  const showPart = bank.chapters.some((c) => c.part !== '-');
  const weighted = bank.chapters.some((c) => c.share > 0);
  const totals = bank.chapters.reduce(
    (acc, c) => ({ templates: acc.templates + c.mix.total, dynamic: acc.dynamic + c.mix.dynamic }),
    { templates: 0, dynamic: 0 },
  );

  return (
    <div className={ui.tableWrap}>
      <table className={`${ui.table} ${s.chapterTable}`}>
        <caption className="visually-hidden">
          {subjectName} chapters with the number of question templates in each. Weight is the
          chapter&apos;s relative share of {subjectName} questions in a generated paper.
        </caption>
        <thead>
          <tr>
            <th scope="col">Chapter</th>
            {showPart ? (
              <th scope="col" className={s.wideOnly}>
                Part
              </th>
            ) : null}
            <th scope="col" className={`${ui.num} ${s.wideOnly}`}>
              Weight
            </th>
            <th scope="col" className={ui.num}>
              <ColumnLabel full="Templates" short="Total" />
            </th>
            <th scope="col" className={ui.num}>
              <ColumnLabel full="Parametric" short="Param." />
            </th>
          </tr>
        </thead>
        <tbody>
          {bank.chapters.map((c) => {
            const empty = c.mix.total === 0;
            return (
              <tr key={c.id} className={empty ? s.rowEmpty : undefined}>
                <th scope="row">
                  <span className={s.chapterCell}>
                    <BankLink
                      to={{ subject, chapter: c.id }}
                      focus="chapter-heading"
                      className={s.chapterLink}
                    >
                      {c.name}
                    </BankLink>
                    {!c.inSyllabus ? <Badge tone="danger">Not in syllabus</Badge> : null}
                    {c.failed > 0 ? (
                      <Badge tone="danger">
                        {c.failed === 1 ? 'Failed to load' : `${c.failed} files failed`}
                      </Badge>
                    ) : empty ? (
                      <span className={`${ui.badge} ${ui.badgeWarning}`}>No templates yet</span>
                    ) : null}
                  </span>
                  {c.inSyllabus ? (
                    <span className={s.narrowMeta}>
                      {showPart && c.part !== '-' ? `Part ${c.part} · ` : ''}weight {c.weight} (
                      {formatShare(c.share)})
                    </span>
                  ) : null}
                </th>
                {showPart ? <td className={s.wideOnly}>{PART_LABEL[c.part]}</td> : null}
                <td className={`${ui.num} ${s.wideOnly}`}>
                  {c.inSyllabus ? (
                    <>
                      {c.weight} <span className={s.muted}>({formatShare(c.share)})</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={ui.num}>{c.mix.total}</td>
                <td className={ui.num}>{c.mix.dynamic}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={s.totalRow}>
            <th scope="row">All chapters</th>
            {showPart ? <td className={s.wideOnly} /> : null}
            <td className={`${ui.num} ${s.wideOnly}`}>{weighted ? '100%' : '—'}</td>
            <td className={ui.num}>{totals.templates}</td>
            <td className={ui.num}>{totals.dynamic}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
