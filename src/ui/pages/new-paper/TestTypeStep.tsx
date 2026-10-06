import type { ReactNode } from 'react';
import type { ExamSectionConfig, ExamTypeConfig } from '@/config/exams';
import { Badge, ui } from '@/ui/components/ui';
import {
  CURRENT_TYPES,
  CUSTOM,
  formatMinutes,
  isLegacyType,
  LEGACY_TYPES,
  LIMITS,
  percentOf,
  shortSectionTitle,
  SUBJECT_COLORS,
  sumCounts,
} from './model';
import { Step } from './Step';
import styles from '../NewPaperPage.module.css';

const RADIO_NAME = 'new-paper-test-type';

/** Decorative bar showing each section's share of the paper (the text says the same). */
function CompositionBar({ sections }: { sections: readonly ExamSectionConfig[] }) {
  return (
    <span className={styles.composition} aria-hidden="true">
      {sections.map((s) => (
        <span
          key={`${s.subject}-${s.title}`}
          style={{ flexGrow: s.count, flexBasis: 0, background: SUBJECT_COLORS[s.subject] }}
        />
      ))}
    </span>
  );
}

function OptionCard({
  value,
  checked,
  onSelect,
  title,
  text,
  visual,
  foot,
}: {
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  title: ReactNode;
  text: ReactNode;
  visual?: ReactNode;
  foot: ReactNode;
}) {
  const id = `${RADIO_NAME}-${value}`;
  return (
    <label className={`${styles.option} ${checked ? styles.optionChecked : ''}`}>
      <input
        type="radio"
        name={RADIO_NAME}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className={styles.optionInput}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text ${id}-foot`}
      />
      <span className={styles.optionBody}>
        <span id={`${id}-title`} className={styles.optionTitle}>
          {title}
        </span>
        <span id={`${id}-text`} className={styles.optionText}>
          {text}
        </span>
        {visual}
        <span id={`${id}-foot`} className={styles.optionFoot}>
          {foot}
        </span>
      </span>
    </label>
  );
}

function TypeOption({
  exam,
  checked,
  onSelect,
}: {
  exam: ExamTypeConfig;
  checked: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <OptionCard
      value={exam.id}
      checked={checked}
      onSelect={onSelect}
      title={exam.name}
      text={exam.sections.map((s) => `${shortSectionTitle(s.title)} ${s.count}`).join(' · ')}
      visual={<CompositionBar sections={exam.sections} />}
      foot={`${sumCounts(exam.sections)} MCQs · ${formatMinutes(exam.durationMinutes)}`}
    />
  );
}

/** Step 1: which paper to sit. `children` shows the selected pattern or the custom builder. */
export function TestTypeStep({
  value,
  onChange,
  legacyOpen,
  onLegacyToggle,
  children,
}: {
  value: string;
  onChange: (examType: string) => void;
  legacyOpen: boolean;
  onLegacyToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  const legacySelected = isLegacyType(value);
  return (
    <Step
      id="step-test"
      number={1}
      title="Choose a test"
      description="Every current NET is 200 MCQs in 3 hours. Pick the paper you are preparing for, or build your own test."
    >
      <fieldset className={styles.fieldset}>
        <legend className="visually-hidden">Test type</legend>
        <div className={styles.optionGrid}>
          {CURRENT_TYPES.map((exam) => (
            <TypeOption key={exam.id} exam={exam} checked={value === exam.id} onSelect={onChange} />
          ))}
          <OptionCard
            value={CUSTOM}
            checked={value === CUSTOM}
            onSelect={onChange}
            title="Custom test"
            text="Your choice of subjects, chapters, length and time"
            foot={`${LIMITS.sectionMin}–${LIMITS.totalMax} MCQs · your time limit`}
          />
        </div>
        <details
          className={styles.legacy}
          open={legacyOpen}
          onToggle={(e) => onLegacyToggle(e.currentTarget.open)}
        >
          <summary className={styles.legacySummary}>
            Pre-2025 patterns{' '}
            <span className={styles.legacyHint}>
              for extra Chemistry, Computer Science and Intelligence practice
            </span>
            {legacySelected && !legacyOpen ? (
              <>
                {' '}
                <Badge tone="info">Selected</Badge>
              </>
            ) : null}
          </summary>
          <div className={styles.legacyBody}>
            <p className={styles.legacyNote}>
              NET papers up to the 2024 cycle followed these patterns. Current papers have no
              Intelligence or Computer Science sections, and Chemistry appears only in Applied
              Sciences.
            </p>
            <div className={styles.optionGrid}>
              {LEGACY_TYPES.map((exam) => (
                <TypeOption
                  key={exam.id}
                  exam={exam}
                  checked={value === exam.id}
                  onSelect={onChange}
                />
              ))}
            </div>
          </div>
        </details>
      </fieldset>
      {children}
    </Step>
  );
}

/** Who sits the selected pattern and how its 200 questions are split. */
export function ExamTypeDetails({ exam }: { exam: ExamTypeConfig }) {
  const total = sumCounts(exam.sections);
  const current = exam.era === 'current';
  return (
    <div className={styles.details}>
      <div className={styles.detailsHead}>
        <h3 className={styles.detailsTitle}>{exam.name}</h3>
        <Badge tone={current ? 'success' : 'warning'}>
          {current ? 'Current pattern' : 'Pre-2025 pattern'}
        </Badge>
      </div>
      <dl className={styles.facts}>
        <dt>Who sits it</dt>
        <dd>{exam.audience}</dd>
        <dt>{current ? 'Leads to' : 'Good for'}</dt>
        <dd>{exam.programmes.join(' · ')}</dd>
      </dl>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <caption className="visually-hidden">Sections of the {exam.name} paper</caption>
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col" className={ui.num}>
                MCQs
              </th>
              <th scope="col" className={ui.num}>
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {exam.sections.map((s) => (
              <tr key={`${s.subject}-${s.title}`}>
                <td>
                  <span
                    className={styles.dot}
                    style={{ background: SUBJECT_COLORS[s.subject] }}
                    aria-hidden="true"
                  />
                  {s.title}
                </td>
                <td className={ui.num}>{s.count}</td>
                <td className={ui.num}>{percentOf(s.count, total)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td>Total</td>
              <td className={ui.num}>{total}</td>
              <td className={ui.num}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className={styles.detailsNote}>
        {total} marks in {formatMinutes(exam.durationMinutes)} · four options per MCQ · one mark
        each · no negative marking
      </p>
      {exam.note ? (
        <p className={styles.detailsNote}>
          <strong>Weighting:</strong> {exam.note}
        </p>
      ) : null}
    </div>
  );
}
