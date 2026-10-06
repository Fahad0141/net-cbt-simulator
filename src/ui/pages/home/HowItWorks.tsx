import type { ReactNode } from 'react';
import { BANK_VERSION } from '@/exam/papers';
import { storagePlace } from '@/platform/desktop';
import { IconHash, IconLock, IconShuffle, IconTerminal } from './icons';
import { EXAMPLE_PAPER_CODE } from './paperCode';
import s from './Sections.module.css';

interface Feature {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  keys?: readonly string[];
}

const FEATURES: readonly Feature[] = [
  {
    icon: <IconTerminal size={22} />,
    title: 'A faithful CBT terminal',
    body: (
      <>
        The exam screen follows the computer-based NET. An answer counts only after you press{' '}
        <strong>Save</strong>, <strong>Review</strong> marks a saved answer to revisit,{' '}
        <strong>Next Section</strong> and <strong>Prev Section</strong> jump between subjects, and
        the clock counts the minutes remaining. Practice mode adds a question navigator, pausing and
        instant feedback.
      </>
    ),
    keys: ['Save', 'Review', 'Next Section', 'Prev Section', 'min Remaining'],
  },
  {
    icon: <IconShuffle size={22} />,
    title: 'A hybrid question engine',
    body: (
      <>
        Parametric templates generate fresh values, options and worked solutions for every paper,
        mixed with fixed questions modelled on topics reported from past NETs. Chapter weights and
        the easy, medium and hard mix follow the real paper; when you generate one you can make it
        easier or harder, and use more or fewer questions with randomised values.
      </>
    ),
  },
  {
    icon: <IconHash size={22} />,
    title: 'Reproducible paper codes',
    body: (
      <>
        Every paper has a code such as <code className={s.inlineCode}>{EXAMPLE_PAPER_CODE}</code>.
        The same code, or its share link when you changed the generation settings, rebuilds the
        identical paper on any device (for the same question-bank version, currently {BANK_VERSION}
        ), so you can retake it, print it with an answer key, or challenge a friend to the same
        questions.
      </>
    ),
  },
  {
    icon: <IconLock size={22} />,
    title: 'Private by design',
    body: (
      <>
        No account, no server and no tracking. Attempts are stored only {storagePlace()}, a test in
        progress survives a refresh or a crash, and you can export your history as a backup file
        from the History page.
      </>
    ),
  },
];

/** The "How it works" section. `headingId` lets the hero scroll to and focus it. */
export function HowItWorks({ headingId }: { headingId: string }) {
  return (
    <section className={s.section} aria-labelledby={headingId}>
      <header className={s.sectionHead}>
        <h2 id={headingId} tabIndex={-1} className={s.anchorHeading}>
          How it works
        </h2>
        <p>Built so that practice feels like the real sitting, and every paper feels new.</p>
      </header>
      <ul className={s.features}>
        {FEATURES.map((feature) => (
          <li key={feature.title} className={s.feature}>
            <span className={s.featureIcon}>{feature.icon}</span>
            <h3 className={s.featureTitle}>{feature.title}</h3>
            <p className={s.featureBody}>{feature.body}</p>
            {feature.keys ? (
              <ul className={s.keys} aria-label="Terminal controls">
                {feature.keys.map((key) => (
                  <li key={key} className={s.key}>
                    {key}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
