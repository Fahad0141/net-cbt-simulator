import type { ReactNode } from 'react';
import { ui } from '@/ui/components/ui';
import styles from '../NewPaperPage.module.css';

/** A numbered section of the new-paper form. */
export function Step({
  id,
  number,
  title,
  description,
  badge,
  children,
}: {
  id: string;
  number: number;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section id={id} className={`${ui.card} ${styles.step}`} aria-labelledby={titleId}>
      <div className={styles.stepHeader}>
        <span className={styles.stepNumber} aria-hidden="true">
          {number}
        </span>
        <div className={styles.stepHeading}>
          <h2 id={titleId} className={styles.stepTitle}>
            <span className="visually-hidden">Step {number}: </span>
            {title}
            {badge}
          </h2>
          {description ? <p className={styles.stepDescription}>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
