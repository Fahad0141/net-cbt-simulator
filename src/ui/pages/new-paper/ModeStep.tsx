import type { ExamMode } from '@/exam/session';
import { Step } from './Step';
import styles from '../NewPaperPage.module.css';

const MODES: ReadonlyArray<{
  value: ExamMode;
  title: string;
  summary: string;
  points: readonly string[];
}> = [
  {
    value: 'exam',
    title: 'Exam mode',
    summary: 'Faithful to the real CBT terminal.',
    points: [
      'An answer counts only after you press Save & Next',
      'No question navigator, no pause, no keyboard shortcuts',
      'The clock runs until you submit or time is up',
    ],
  },
  {
    value: 'practice',
    title: 'Practice mode',
    summary: 'Relaxed, for learning.',
    points: [
      'Answers save automatically',
      'Question navigator, pause and keyboard shortcuts',
      'Optional instant feedback after each answer',
    ],
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
    <Step
      id="step-mode"
      number={2}
      title="Choose a mode"
      description="Both modes use the same paper and scoring; they differ in how much the terminal helps you."
    >
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
                    {/* A label may only hold phrasing content, so the list is built from spans. */}
                    <span className={styles.points} role="list">
                      {m.points.map((p) => (
                        <span key={p} role="listitem" className={styles.point}>
                          {p}
                        </span>
                      ))}
                    </span>
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
              Show whether each answer is right, with the explanation, as soon as you answer.
            </span>
          </span>
        </label>
      ) : null}
    </Step>
  );
}
