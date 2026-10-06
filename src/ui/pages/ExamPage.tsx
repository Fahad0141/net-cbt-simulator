import { useState } from 'react';
import { loadActiveSession } from '@/exam/store';
import { CbtBanner, CbtFooter } from '@/ui/cbt/CbtChrome';
import { CbtTerminal } from '@/ui/cbt/CbtTerminal';
import cbt from '@/ui/cbt/cbt.module.css';
import { href } from '@/ui/router';

/** Hosts the CBT terminal for the active (persisted) session. */
export default function ExamPage() {
  const [session] = useState(loadActiveSession);

  if (!session) {
    return (
      <div className={cbt.terminal}>
        <CbtBanner />
        <div className={cbt.panelWrap}>
          <section className={cbt.panel}>
            <div className={cbt.panelTitle}>No test in progress</div>
            <div className={cbt.panelBody}>
              <p>
                There is no active paper on this device. Generate a new full-length paper to begin.
              </p>
            </div>
            <div className={cbt.panelFooter}>
              <span />
              <span style={{ display: 'flex', gap: 8 }}>
                <a className={cbt.classicButton} href={href('/new')}>
                  Generate a paper
                </a>
                <a className={cbt.classicButton} href={href('/')}>
                  Main page
                </a>
              </span>
            </div>
          </section>
        </div>
        <CbtFooter />
      </div>
    );
  }

  return <CbtTerminal key={session.id} initial={session} />;
}
