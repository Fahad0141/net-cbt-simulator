import type { ReactNode } from 'react';
import styles from '../NewPaperPage.module.css';

/** A numbered section of the new-paper form; the number sits in an answer-sheet bubble. */
export function Step({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: ReactNode;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section id={id} className={styles.step} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.stepTitle}>
        <span className={styles.stepNumber} aria-hidden="true">
          {number}
        </span>
        <span className="visually-hidden">Step {number}: </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
