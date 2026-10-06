import { externalLinkTarget } from '@/platform/links';
import { IconExternal, IconInfo } from './icons';
import s from './Sections.module.css';

/** Prominent statement that the simulator is independent of NUST. */
export function Disclaimer({ headingId }: { headingId: string }) {
  return (
    <aside className={s.disclaimer} aria-labelledby={headingId}>
      <span className={s.disclaimerIcon} aria-hidden="true">
        <IconInfo size={22} />
      </span>
      <div className={s.disclaimerBody}>
        <h2 id={headingId} className={s.disclaimerTitle}>
          An unofficial practice tool
        </h2>
        <p>
          NET CBT Simulator is an independent, open-source project. It is{' '}
          <strong>not affiliated with, endorsed by or connected to NUST</strong> (National
          University of Sciences and Technology). The terminal is a recreation for practice, and the
          questions are original or modelled on publicly reported topics; they are not leaked or
          official papers. Scores here are practice estimates, not predictions of an official
          result.
        </p>
        <p>
          Always confirm test dates, patterns and rules on the official NUST website,{' '}
          <a
            href="https://nust.edu.pk"
            target="_blank"
            rel="noopener noreferrer"
            className={s.external}
          >
            nust.edu.pk
            <IconExternal size={14} />
            <span className="visually-hidden"> (opens {externalLinkTarget()})</span>
          </a>
          .
        </p>
      </div>
    </aside>
  );
}
