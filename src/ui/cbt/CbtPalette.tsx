import type { ExamSession } from '@/exam/session';
import styles from './cbt.module.css';

/**
 * Question navigator. The real terminal has no such grid (navigation is Next/Prev,
 * First/Last and Next/Prev Section only), so this is shown as a clearly labelled
 * simulator aid that candidates can switch off to practise under real conditions.
 */
export function CbtPalette({
  session,
  onGoto,
}: {
  session: ExamSession;
  onGoto: (index: number) => void;
}) {
  return (
    <section className={styles.palette} aria-label="Question navigator (simulator aid)">
      <div className={styles.paletteHead}>
        <strong>Question navigator — simulator aid (not available on the real CBT)</strong>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.swatch} /> Not visited
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ background: '#fdecea', borderColor: '#e3a29a' }}
            />{' '}
            Not answered
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ background: '#2e9b4a', borderColor: '#1e7a37' }}
            />{' '}
            Answered
          </span>
          <span className={styles.legendItem}>
            <span
              className={`${styles.swatch} ${styles.pq} ${styles.review}`}
              style={{ height: 14, minWidth: 14 }}
            />{' '}
            Marked for review
          </span>
        </div>
      </div>
      {session.paper.sections.map((section) => (
        <div key={section.start} className={styles.paletteSection}>
          <div className={styles.paletteSectionTitle}>
            {section.title} ({section.start + 1}–{section.start + section.count})
          </div>
          <div className={styles.paletteGrid}>
            {Array.from({ length: section.count }, (_, k) => {
              const index = section.start + k;
              const q = session.questions[index];
              if (!q) return null;
              const cls = [
                styles.pq,
                q.saved !== null ? styles.answered : q.visited ? styles.visited : '',
                q.review ? styles.review : '',
                index === session.current ? styles.current : '',
              ]
                .filter(Boolean)
                .join(' ');
              const state =
                q.saved !== null ? 'answered' : q.visited ? 'not answered' : 'not visited';
              return (
                <button
                  key={index}
                  type="button"
                  className={cls}
                  onClick={() => onGoto(index)}
                  aria-label={`Question ${index + 1}, ${state}${q.review ? ', marked for review' : ''}`}
                  aria-current={index === session.current ? 'true' : undefined}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
