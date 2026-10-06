import type { CSSProperties, ReactNode } from 'react';
import type { ExamSectionConfig, ExamTypeConfig } from '@/config/exams';
import { Badge } from '@/ui/components/ui';
import { sectionTint } from '../home/tints';
import {
  CURRENT_TYPES,
  CUSTOM,
  formatMinutes,
  isLegacyType,
  LEGACY_TYPES,
  LIMITS,
  shortSectionTitle,
  sumCounts,
} from './model';
import { Step } from './Step';
import styles from '../NewPaperPage.module.css';

const RADIO_NAME = 'new-paper-test-type';

type Tinted = CSSProperties & { '--tint': string };

/** The questions and minutes every current pattern shares, so the cards need not repeat them. */
const SHARED_SHAPE = (() => {
  const totals = new Set(CURRENT_TYPES.map((e) => sumCounts(e.sections)));
  const minutes = new Set(CURRENT_TYPES.map((e) => e.durationMinutes));
  return totals.size === 1 && minutes.size === 1
    ? { total: [...totals][0], minutes: [...minutes][0] }
    : null;
})();

const hasSharedShape = (exam: ExamTypeConfig) =>
  SHARED_SHAPE !== null &&
  sumCounts(exam.sections) === SHARED_SHAPE.total &&
  exam.durationMinutes === SHARED_SHAPE.minutes;

/**
 * Decorative bar of each section's share of the paper (the text says the same), in the
 * same ordinal ramp of the ink colour as the dashboard's pattern cards.
 */
function CompositionBar({ sections }: { sections: readonly ExamSectionConfig[] }) {
  return (
    <span className={styles.composition} aria-hidden="true">
      {sections.map((s, i) => (
        <span
          key={`${s.subject}-${s.title}`}
          style={
            { flexGrow: s.count, flexBasis: 0, '--tint': sectionTint(i, sections.length) } as Tinted
          }
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
  foot?: ReactNode;
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
        aria-describedby={foot ? `${id}-text ${id}-foot` : `${id}-text`}
      />
      <span className={styles.optionBody}>
        <span id={`${id}-title`} className={styles.optionTitle}>
          {title}
        </span>
        {visual}
        <span id={`${id}-text`} className={styles.optionText}>
          {text}
        </span>
        {foot ? (
          <span id={`${id}-foot`} className={styles.optionFoot}>
            {foot}
          </span>
        ) : null}
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
      visual={<CompositionBar sections={exam.sections} />}
      text={exam.sections.map((s) => `${shortSectionTitle(s.title)} ${s.count}`).join(', ')}
      foot={
        hasSharedShape(exam)
          ? undefined
          : `${sumCounts(exam.sections)} MCQs in ${formatMinutes(exam.durationMinutes)}`
      }
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
    <Step id="step-test" number={1} title="Choose a test">
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
            text="Your subjects, chapters, length and time"
            foot={`${LIMITS.sectionMin}–${LIMITS.totalMax} MCQs`}
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
              extra Chemistry, Computer Science and Intelligence practice
            </span>
            {legacySelected && !legacyOpen ? (
              <>
                {' '}
                <Badge tone="info">Selected</Badge>
              </>
            ) : null}
          </summary>
          <div className={styles.legacyBody}>
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

/** Who sits the selected pattern and where it leads (the card above shows its split). */
export function ExamTypeDetails({ exam }: { exam: ExamTypeConfig }) {
  const current = exam.era === 'current';
  return (
    <section className={styles.details} aria-label={`About ${exam.name}`}>
      {current ? null : <Badge tone="warning">Pre-2025 pattern</Badge>}
      <dl className={styles.facts}>
        <dt>Who sits it</dt>
        <dd>{exam.audience}</dd>
        {exam.programmes.length ? (
          <>
            <dt>{current ? 'Leads to' : 'Good for'}</dt>
            <dd>{exam.programmes.join('; ')}</dd>
          </>
        ) : null}
        {exam.note ? (
          <>
            <dt>Weighting</dt>
            <dd>{exam.note}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
