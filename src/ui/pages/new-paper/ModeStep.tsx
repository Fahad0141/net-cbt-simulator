import type { ExamMode } from '@/exam/session';
import { Step } from './Step';
import styles from '../NewPaperPage.module.css';

const MODES: ReadonlyArray<{ value: ExamMode; title: string; summary: string }> = [
  {
    value: 'exam',
    title: 'Exam mode',
    summary: 'As on the real CBT: an answer counts only after Save, with no navigator or pause.',
  },
  {
    value: 'practice',
    title: 'Practice mode',
    summary: 'Answers save themselves. Navigator, pause, shortcuts and optional instant feedback.',
  },
];

/** Step 2: exam or practice mode. */
export function ModeStep({
  mode,
  instantFeedback,
  onMode,
  onInstantFeedback,
}: {
  mode: ExamMode;
  instantFeedback: boolean;
  onMode: (mode: ExamMode) => void;
  onInstantFeedback: (value: boolean) => void;
}) {
  return (
    <Step id="step-mode" number={2} title="Choose a mode">
      <fieldset className={styles.fieldset}>
        <legend className="visually-hidden">Mode</legend>
        <div className={styles.modeGrid}>
          {MODES.map((m) => {
            const checked = m.value === mode;
            const id = `mode-${m.value}`;
            return (
              <label
                key={m.value}
                className={`${styles.option} ${checked ? styles.optionChecked : ''}`}
              >
                <input
                  type="radio"
                  name="new-paper-mode"
                  value={m.value}
                  checked={checked}
                  onChange={() => onMode(m.value)}
                  className={styles.optionInput}
                  aria-labelledby={`${id}-title`}
                  aria-describedby={`${id}-text`}
                />
                <span className={styles.optionBody}>
                  <span id={`${id}-title`} className={styles.optionTitle}>
                    {m.title}
                  </span>
                  <span id={`${id}-text`} className={styles.optionText}>
                    {m.summary}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {mode === 'practice' ? (
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={instantFeedback}
            onChange={(e) => onInstantFeedback(e.target.checked)}
          />
          <span className={styles.toggleText}>
            <strong>Instant feedback</strong>
            <span className={styles.hint}>
              See right or wrong, with the solution, after each answer.
            </span>
          </span>
        </label>
      ) : null}
    </Step>
  );
}
