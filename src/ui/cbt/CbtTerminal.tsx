import type { ExamSession } from '@/exam/session';
import { remainingMs } from '@/exam/session';
import { CbtBanner, CbtFooter } from './CbtChrome';
import { CbtExamScreen } from './CbtExamScreen';
import { CbtInstructions } from './CbtInstructions';
import { CbtLogin } from './CbtLogin';
import { CbtSubmitted } from './CbtSubmitted';
import styles from './cbt.module.css';
import { useExamController } from './useExamController';

/**
 * The complete CBT terminal: login -> instructions -> paper -> submitted.
 * Mount it with a fresh or resumed session; it persists itself.
 */
export function CbtTerminal({ initial }: { initial: ExamSession }) {
  const controller = useExamController(initial);
  const { session, dispatch, now } = controller;

  const aside =
    session.phase === 'running' ? (
      <>
        {session.paper.code}
        <br />
        {Math.ceil(remainingMs(session, now) / 60_000)} min left
      </>
    ) : (
      <>Paper code {session.paper.code}</>
    );

  return (
    <div className={styles.terminal}>
      <CbtBanner aside={aside} />
      <main className={styles.page} style={{ width: '100%' }}>
        {session.phase === 'login' ? (
          <CbtLogin
            candidate={session.candidate}
            onLogin={(candidate) => dispatch({ type: 'login', candidate })}
          />
        ) : session.phase === 'instructions' ? (
          <CbtInstructions session={session} onStart={() => dispatch({ type: 'start' })} />
        ) : session.phase === 'running' ? (
          <CbtExamScreen controller={controller} />
        ) : (
          <CbtSubmitted
            session={session}
            archived={controller.archived}
            archiveError={controller.archiveError}
          />
        )}
      </main>
      <CbtFooter />
    </div>
  );
}
