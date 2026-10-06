import { useCallback, useState } from 'react';
import { listAttempts } from '@/exam/store';
import { storagePlace } from '@/platform/desktop';
import { LinkButton } from '@/ui/components/ui';
import { useAsync } from '@/ui/hooks';
import { href } from '@/ui/router';
import { useActiveSession, useDocumentTitle } from './home/hooks';
import { PaperCodeCard } from './home/PaperCodeCard';
import { PatternsSection } from './home/PatternsSection';
import { ProgressSection } from './home/ProgressSection';
import { ResumePanel } from './home/ResumePanel';
import { TerminalPreview } from './home/TerminalPreview';
import s from './HomePage.module.css';

const IDS = {
  title: 'home-title',
  cta: 'home-generate',
  patterns: 'home-patterns',
} as const;

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
          <h1 id={IDS.title} className={s.title}>
            NET CBT Simulator
          </h1>
          <p className={s.lede}>
            Sit full-length NET papers on a replica of the real test screen. Every paper is new, and
            every answer has a worked solution.
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
            </LinkButton>
            <LinkButton variant="ghost" size="lg" href={href('/about')} className={s.cta}>
              How it works
            </LinkButton>
          </div>
          <p className={s.fineprint}>Free and unofficial. Your attempts stay {storagePlace()}.</p>
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
        <PaperCodeCard />
      </div>

      <PatternsSection headingId={IDS.patterns} />
    </div>
  );
}
