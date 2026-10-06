import { useCallback, useState } from 'react';
import { listAttempts } from '@/exam/store';
import { Button, LinkButton } from '@/ui/components/ui';
import { useAsync } from '@/ui/hooks';
import { href } from '@/ui/router';
import { Disclaimer } from './home/Disclaimer';
import { GlanceCard } from './home/GlanceCard';
import { useActiveSession, useDocumentTitle } from './home/hooks';
import { HowItWorks } from './home/HowItWorks';
import { IconArrowRight, IconCheck } from './home/icons';
import { PaperCodeCard } from './home/PaperCodeCard';
import { PatternsSection } from './home/PatternsSection';
import { ProgressSection } from './home/ProgressSection';
import { ResumePanel } from './home/ResumePanel';
import { TerminalPreview } from './home/TerminalPreview';
import s from './HomePage.module.css';

const IDS = {
  title: 'home-title',
  cta: 'home-generate',
  how: 'home-how',
  patterns: 'home-patterns',
  disclaimer: 'home-disclaimer',
} as const;

const HIGHLIGHTS = [
  '200 MCQs in 180 minutes',
  'No negative marking',
  'Review with worked solutions',
  'No sign-up: stays on your device',
];

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  target.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}

/** Dashboard and landing page (`#/`). */
export default function HomePage() {
  useDocumentTitle('Dashboard · NET CBT Simulator');
  const { session, refresh, revision } = useActiveSession();
  // Re-read the history too when another tab may have finished a paper. (The arrow
  // matters: `useAsync` re-runs when its memoised function changes identity.)
  const attempts = useAsync(() => listAttempts(), [revision]);
  const [announcement, setAnnouncement] = useState('');

  const onDiscarded = useCallback(() => {
    refresh();
    setAnnouncement('The test in progress was discarded.');
    document.getElementById(IDS.cta)?.focus();
  }, [refresh]);

  return (
    <div className={s.home}>
      <section className={s.hero} aria-labelledby={IDS.title}>
        <div className={s.heroText}>
          <p className={s.eyebrow}>
            <span className={s.eyebrowDot} aria-hidden="true" />
            Unofficial · free and open source
          </p>
          <h1 id={IDS.title} className={s.title}>
            <span className={s.titleAccent}>NET CBT</span> Simulator
          </h1>
          <p className={s.lede}>
            Practise on a faithful replica of NUST&apos;s computer-based NET terminal with unique,
            reproducible full-length papers.
          </p>
          <div className={s.ctaRow}>
            <LinkButton
              id={IDS.cta}
              variant="primary"
              size="lg"
              href={href('/new')}
              className={s.cta}
            >
              Generate a full-length paper
              <IconArrowRight size={18} />
            </LinkButton>
            <Button
              variant="ghost"
              size="lg"
              className={s.cta}
              onClick={() => scrollToSection(IDS.how)}
            >
              How it works
            </Button>
          </div>
          <ul className={s.highlights} aria-label="Highlights">
            {HIGHLIGHTS.map((item) => (
              <li key={item}>
                <IconCheck size={16} className={s.highlightIcon} />
                {item}
              </li>
            ))}
          </ul>
          {session ? (
            <ResumePanel key={session.id} session={session} onDiscarded={onDiscarded} />
          ) : null}
        </div>
        <TerminalPreview />
      </section>

      <p className="visually-hidden" role="status">
        {announcement}
      </p>

      <div className={s.dashboard}>
        <ProgressSection attempts={attempts} />
        <div className={s.side}>
          <PaperCodeCard />
          <GlanceCard />
        </div>
      </div>

      <PatternsSection headingId={IDS.patterns} />
      <HowItWorks headingId={IDS.how} />
      <Disclaimer headingId={IDS.disclaimer} />
    </div>
  );
}
