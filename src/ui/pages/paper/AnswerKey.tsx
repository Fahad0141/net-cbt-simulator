import { memo } from 'react';
import type { Paper } from '@/engine/types';
import { chunk, letterOf, rangeLabel, sectionQuestions, sectionRange } from './layout';
import css from './PaperDocument.module.css';

const PER_ROW = 10;

/** Question -> correct letter, ten questions per row, one table per section. */
export const AnswerKey = memo(function AnswerKey({ paper }: { paper: Paper }) {
  const sections = paper.sections.filter((s) => s.count > 0);
  return (
    <section
      className={`${css.sheet} ${css.newPage} ${css.key}`}
      aria-labelledby="paper-answer-key"
    >
      <header className={css.keyHead}>
        <h2 id="paper-answer-key" className={css.keyTitle}>
          Answer Key
        </h2>
        <p className={css.keySub}>
          Paper code <strong className={css.code}>{paper.code}</strong> · one mark per correct
          answer, no negative marking: your score is the number of correct answers.
        </p>
      </header>
      {sections.map((section, i) => {
        const { from, to } = sectionRange(section);
        const rows = chunk(sectionQuestions(paper, section), PER_ROW);
        return (
          <div key={`${section.subject}-${section.start}`} className={css.keyBlock}>
            <table className={css.keyTable}>
              <caption>
                Section {i + 1} · {section.title}{' '}
                <span className={css.keyRange}>(questions {rangeLabel(from, to)})</span>
              </caption>
              <tbody>
                {rows.map((row) => {
                  const first = row[0];
                  const last = row[row.length - 1];
                  if (!first || !last) return null;
                  return (
                    <tr key={first.uid}>
                      <th scope="row">{rangeLabel(first.index + 1, last.index + 1)}</th>
                      {row.map((q) => (
                        <td key={q.uid}>
                          <span className={css.keyNum}>{q.index + 1}</span>{' '}
                          <span className={css.keyLetter}>{letterOf(q.correct)}</span>
                        </td>
                      ))}
                      {row.length < PER_ROW
                        ? Array.from({ length: PER_ROW - row.length }, (_, k) => (
                            <td key={`pad-${k}`} className={css.keyPad} aria-hidden="true" />
                          ))
                        : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
});
