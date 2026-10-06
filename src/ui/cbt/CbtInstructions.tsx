import { useState } from 'react';
import type { ExamSession } from '@/exam/session';
import styles from './cbt.module.css';

/** Pre-test instructions shown after login, in the terminal's visual style. */
export function CbtInstructions({
  session,
  onStart,
}: {
  session: ExamSession;
  onStart: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const { paper, settings } = session;
  const minutes = Math.round(session.durationMs / 60_000);

  return (
    <div className={styles.panelWrap}>
      <section className={styles.panel} aria-labelledby="instructions-title">
        <div className={styles.panelTitle} id="instructions-title">
          Instructions for Candidates — {paper.title}
        </div>
        <div className={styles.panelBody}>
          <table className={styles.sectionTable}>
            <thead>
              <tr>
                <th>Section</th>
                <th>Questions</th>
                <th>Numbers</th>
              </tr>
            </thead>
            <tbody>
              {paper.sections.map((s) => (
                <tr key={s.start}>
                  <td>{s.title}</td>
                  <td>{s.count}</td>
                  <td>
                    {s.start + 1}–{s.start + s.count}
                  </td>
                </tr>
              ))}
              <tr>
                <th>Total</th>
                <th>{paper.questions.length}</th>
                <th>{minutes} minutes</th>
              </tr>
            </tbody>
          </table>

          <h3>General</h3>
          <ol>
            <li>
              The paper contains <strong>{paper.questions.length}</strong> multiple-choice questions
              to be attempted in <strong>{minutes} minutes</strong>. Each question carries{' '}
              <strong>one mark</strong>; there is <strong>no negative marking</strong>.
            </li>
            <li>Each question has four options and exactly one correct answer.</li>
            <li>
              Calculators, mobile phones and other electronic devices are not allowed. Use the rough
              sheet for working.
            </li>
            <li>
              The clock starts when you press <em>Start Test</em> and cannot be paused. The paper is
              submitted automatically when the time runs out.
            </li>
          </ol>

          <h3>Answering</h3>
          <ol>
            <li>Click the round button beside an option to select it.</li>
            <li>
              {settings.requireSave ? (
                <>
                  Press <strong>Save</strong> to record your answer.{' '}
                  <strong>A selection that is not saved is not recorded</strong> and is cleared when
                  you move to another question.
                </>
              ) : (
                <>Your selection is recorded as soon as you click an option (practice setting).</>
              )}
            </li>
            <li>
              After saving you may press <strong>Review</strong> to mark the question for review and
              return to it later.
            </li>
            <li>To change an answer, select another option and press Save again.</li>
          </ol>

          <h3>Moving around the paper</h3>
          <ul>
            <li>
              <strong>Next</strong> / <strong>Prev</strong> move one question forward or back (they
              continue across sections).
            </li>
            <li>
              <strong>Next Section</strong> / <strong>Prev Section</strong> jump to the first
              question of the adjacent section.
            </li>
            <li>
              <strong>First</strong> / <strong>Last</strong> jump to the first or last question of
              the paper.
            </li>
            <li>
              The <strong>Show</strong> and <strong>Question</strong> lists at the bottom jump to
              any question, or list only Attempted, Unattempted or Reviewable questions. The top bar
              shows how many questions you have attempted.
            </li>
            <li>
              Pace yourself: the question area blinks once you have spent longer than the average
              time per question (about 54 seconds).
            </li>
            <li>
              When you are done, click <strong>“Click here to FINISH Your Test”</strong>. Once
              finished you cannot log in again.
            </li>
          </ul>

          {settings.mode === 'practice' ? (
            <p>
              <strong>Practice mode:</strong> pausing, the question navigator, keyboard shortcuts
              and instant feedback are available. Switch to Exam mode for real test conditions.
            </p>
          ) : null}
        </div>
        <div className={styles.panelFooter}>
          <label className={styles.agree}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I have read and understood the instructions.
          </label>
          <button
            type="button"
            className={styles.classicButton}
            disabled={!agreed}
            onClick={onStart}
          >
            Start Test
          </button>
        </div>
      </section>
    </div>
  );
}
