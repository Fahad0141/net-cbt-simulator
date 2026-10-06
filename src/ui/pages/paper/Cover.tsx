import type { Paper } from '@/engine/types';
import { formatLongDate, type PaperHeading, plural, rangeLabel, sectionRange } from './layout';
import type { PrintSettings } from './settings';
import css from './PaperDocument.module.css';

interface CoverProps {
  paper: Paper;
  heading: PaperHeading;
  settings: PrintSettings;
  generatedAt: number;
}

function BlankField({ label, wide = false }: { label: string; wide?: boolean }) {
  return (
    <div className={`${css.blank} ${wide ? css.blankWide : ''}`}>
      <span className={css.blankLabel}>{label}</span>
      <span className={css.blankLine} aria-hidden="true" />
    </div>
  );
}

/** First page: title, paper facts, candidate details, sections and instructions. */
export function Cover({ paper, heading, settings, generatedAt }: CoverProps) {
  const total = paper.questions.length;
  const minutes = paper.durationMinutes;
  const secondsPerQuestion = total > 0 ? Math.round((minutes * 60) / total) : 0;
  const sections = paper.sections.filter((s) => s.count > 0);
  const afterward = [
    settings.answerKey ? 'answer key' : null,
    settings.solutions ? 'worked solutions' : null,
  ].filter(Boolean);

  return (
    <section className={`${css.sheet} ${css.cover}`} aria-labelledby="paper-title">
      <div className={css.coverTop}>
        <span className={css.coverBrand}>NET CBT Simulator · Unofficial practice paper</span>
        <span className={css.codeBox}>
          <span className={css.codeLabel}>Paper code</span>{' '}
          <strong className={css.code}>{paper.code}</strong>
        </span>
      </div>

      <div className={css.titleBlock}>
        <p className={css.kicker}>{heading.kicker}</p>
        <h2 id="paper-title" className={css.title}>
          {heading.title}
        </h2>
        {heading.subtitle ? <p className={css.subtitle}>{heading.subtitle}</p> : null}
        {heading.pattern ? <p className={css.pattern}>{heading.pattern}</p> : null}
      </div>

      <dl className={css.facts}>
        <div>
          <dt>Questions</dt>
          <dd>{total} MCQs</dd>
        </div>
        <div>
          <dt>Time allowed</dt>
          <dd>{minutes} minutes</dd>
        </div>
        <div>
          <dt>Total marks</dt>
          <dd>{total}</dd>
        </div>
        <div>
          <dt>Negative marking</dt>
          <dd>None</dd>
        </div>
      </dl>

      <div className={css.candidate}>
        <BlankField label="Candidate's name" wide />
        <BlankField label="Roll / application no." />
        <BlankField label="Date" />
        <BlankField label="Start time" />
        <BlankField label="Finish time" />
      </div>

      <div className={css.tableWrap}>
        <table className={css.sectionsTable}>
          <caption>Paper structure</caption>
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">Subject</th>
              <th scope="col" className={css.numCell}>
                MCQs
              </th>
              <th scope="col">Question numbers</th>
              <th scope="col" className={css.numCell}>
                Marks
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, i) => {
              const { from, to } = sectionRange(section);
              return (
                <tr key={`${section.subject}-${section.start}`}>
                  <td>{i + 1}</td>
                  <th scope="row">{section.title}</th>
                  <td className={css.numCell}>{section.count}</td>
                  <td>{rangeLabel(from, to)}</td>
                  <td className={css.numCell}>{section.count}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <th scope="row">Total</th>
              <td className={css.numCell}>{total}</td>
              <td>{total > 0 ? rangeLabel(1, total) : '–'}</td>
              <td className={css.numCell}>{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={css.instructionsBlock}>
        <h3 className={css.coverHeading}>Instructions</h3>
        <ol className={css.instructions}>
          <li>
            This paper has <strong>{plural(total, 'multiple-choice question')}</strong> in{' '}
            <strong>{plural(sections.length, 'section')}</strong>. Attempt all of them.
          </li>
          <li>
            Time allowed: <strong>{minutes} minutes</strong>
            {secondsPerQuestion > 0 ? (
              <> (about {secondsPerQuestion} seconds per question)</>
            ) : null}
            . Do not spend too long on any one question.
          </li>
          <li>
            Each question has four options, (A) to (D). Exactly <strong>one</strong> option is
            correct.
          </li>
          <li>
            Each correct answer earns <strong>one mark</strong>. There is{' '}
            <strong>no negative marking</strong>, so do not leave any question blank.
          </li>
          <li>
            {settings.answerSheet ? (
              <>
                Mark your answers on the <strong>answer sheet</strong> after the last question: fill
                exactly one bubble per question, completely, with a dark pen.
              </>
            ) : (
              <>
                Mark your answers on a <strong>separate answer sheet</strong>, one answer per
                question.
              </>
            )}
          </li>
          <li>
            Calculators, mobile phones, smart watches and other electronic devices are not allowed.
            Use the blank space on these pages for rough work.
          </li>
          {afterward.length ? (
            <li>
              When the time is up, stop writing. Then mark your attempt with the{' '}
              <strong>{afterward.join(' and ')}</strong> at the end of this paper.
            </li>
          ) : null}
        </ol>
      </div>

      <div className={css.selfCheck}>
        <BlankField label={`Score (out of ${total})`} />
        <BlankField label="Time taken (minutes)" />
        <p className={css.selfCheckNote}>
          NUST merit aggregate = 75% NET + 15% HSSC (FSc) + 10% SSC (Matric).
        </p>
      </div>

      <div className={css.coverBottom}>
        <dl className={css.coverMeta}>
          <div>
            <dt>Paper code</dt>
            <dd className={css.code}>{paper.code}</dd>
          </div>
          <div>
            <dt>Question bank</dt>
            <dd>v{paper.bankVersion}</dd>
          </div>
          <div>
            <dt>Generated</dt>
            <dd>{formatLongDate(generatedAt)}</dd>
          </div>
        </dl>
        <p className={css.disclaimer}>
          Unofficial practice paper generated by NET CBT Simulator, an independent open-source
          project. It is not affiliated with or endorsed by NUST. Questions are original or modelled
          on publicly reported NET topics. The same paper code regenerates this exact paper (with
          this question-bank version), so it can also be taken on screen in the simulator&apos;s
          computer-based test.
        </p>
      </div>
    </section>
  );
}
