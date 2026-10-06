import type { AttemptSummary } from '@/exam/store';
import type { ExamSession } from '@/exam/session';
import { href } from '@/ui/router';
import styles from './cbt.module.css';

/**
 * Shown on the terminal after the paper ends. The real CBT does not reliably show a
 * score (NUST uploads CBT results within 24 hours), so in exam mode the terminal only
 * confirms submission and the score appears in a separate simulator panel.
 */
export function CbtSubmitted({
  session,
  archived,
  archiveError,
}: {
  session: ExamSession;
  archived: AttemptSummary | null;
  archiveError: string | null;
}) {
  const timeout = session.finishReason === 'timeout';
  const exam = session.settings.mode === 'exam';

  const scorePanel = archived ? (
    <>
      <p className={styles.scoreLine}>
        Score: {archived.score} / {archived.maxScore} ({archived.percent}%)
      </p>
      <p>
        Attempted {archived.attempted}, correct {archived.correct}, wrong {archived.wrong},
        unattempted {archived.maxScore - archived.attempted}.
      </p>
    </>
  ) : archiveError ? (
    <p role="alert">Your answers could not be saved to the history: {archiveError}</p>
  ) : (
    <p>Saving your answers…</p>
  );

  const actions = (
    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {archived ? (
        <>
          <a className={styles.classicButton} href={href(`/result/${archived.id}`)}>
            View detailed result
          </a>
          <a className={styles.classicButton} href={href(`/review/${archived.id}`)}>
            Review answers
          </a>
        </>
      ) : null}
      <a className={styles.classicButton} href={href('/')}>
        Main page
      </a>
    </span>
  );

  return (
    <div
      className={styles.panelWrap}
      style={{ flexDirection: 'column', alignItems: 'center', gap: 16 }}
    >
      <section className={styles.panel} aria-labelledby="submitted-title" aria-live="polite">
        <div className={styles.panelTitle} id="submitted-title">
          {timeout ? 'Time is up — your test has been submitted' : 'Your test has been submitted'}
        </div>
        <div className={styles.panelBody}>
          <p>
            {session.candidate.userId} ({session.candidate.centre}) · {session.paper.title}
          </p>
          {exam ? (
            <p>
              Your saved answers have been recorded and you have been logged out of the test. You
              cannot log in to this paper again. On the real NET, computer-based test results are
              uploaded within 24 hours and viewed with your roll number.
            </p>
          ) : (
            scorePanel
          )}
          <p className={styles.passageNote}>Paper code {session.paper.code}</p>
        </div>
        {!exam ? (
          <div className={styles.panelFooter}>
            <span />
            {actions}
          </div>
        ) : null}
      </section>

      {exam ? (
        <section className={styles.panel} aria-label="Simulator result">
          <div className={styles.panelTitle} style={{ background: '#2b5d8a' }}>
            Simulator: your result is ready now
          </div>
          <div className={styles.panelBody}>{scorePanel}</div>
          <div className={styles.panelFooter}>
            <span />
            {actions}
          </div>
        </section>
      ) : null}
    </div>
  );
}
