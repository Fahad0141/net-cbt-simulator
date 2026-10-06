import { useEffect, useId, useRef, useState } from 'react';
import { clearActiveSession } from '@/exam/store';
import type { ExamSession } from '@/exam/session';
import { Badge, LinkButton, ProgressBar, ui } from '@/ui/components/ui';
import { href } from '@/ui/router';
import { describeSession, type ResumeInfo } from './activeSession';
import { useNow } from './hooks';
import { IconClock } from './icons';
import s from './ResumePanel.module.css';

const STATUS: Record<
  ResumeInfo['status'],
  { label: string; tone: 'info' | 'warning' | 'neutral' | 'danger' }
> = {
  'not-started': { label: 'Not started', tone: 'neutral' },
  running: { label: 'Clock running', tone: 'warning' },
  paused: { label: 'Paused', tone: 'info' },
  'time-up': { label: 'Time is up', tone: 'danger' },
};

function statusNote(info: ResumeInfo): string {
  switch (info.status) {
    case 'not-started':
      return 'The clock starts when you begin the paper.';
    case 'running':
      return 'The clock keeps running while the terminal is closed, just like the real test.';
    case 'paused':
      return 'Practice mode: the clock is stopped until you resume.';
    case 'time-up':
      return 'The time ran out while the terminal was closed. Open it to submit the paper and see your result.';
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * "Resume test in progress" panel for the hero: what is running, the time left and
 * the answers saved so far, with a guarded way to discard the attempt.
 */
export function ResumePanel({
  session,
  onDiscarded,
}: {
  session: ExamSession;
  onDiscarded: () => void;
}) {
  const now = useNow(15_000, session.phase === 'running' && session.runningSince !== null);
  const info = describeSession(session, now);
  const [confirming, setConfirming] = useState(false);
  const discardRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const titleId = useId();
  const questionId = useId();
  const status = STATUS[info.status];
  const answeredPercent = info.total ? (info.answered / info.total) * 100 : 0;

  useEffect(() => {
    if (confirming) {
      keepRef.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      discardRef.current?.focus();
    }
  }, [confirming]);

  const cancel = () => {
    restoreFocus.current = true;
    setConfirming(false);
  };

  const discard = () => {
    clearActiveSession();
    onDiscarded();
  };

  return (
    <section className={s.panel} aria-labelledby={titleId}>
      <div className={s.head}>
        <span className={s.pulse} data-status={info.status} aria-hidden="true" />
        <h2 id={titleId} className={s.title}>
          Test in progress
        </h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <p className={s.paper}>
        <strong>{info.title}</strong>
        <span className={s.dot} aria-hidden="true">
          ·
        </span>
        <span className="visually-hidden">paper code </span>
        <code className={s.code}>{info.code}</code>
        <span className={s.dot} aria-hidden="true">
          ·
        </span>
        <span>{info.mode === 'practice' ? 'Practice mode' : 'Exam mode'}</span>
      </p>

      <dl className={s.stats}>
        <div className={s.stat}>
          <dt>Time left</dt>
          <dd>
            <IconClock size={16} className={s.statIcon} />
            {info.status === 'time-up' ? 'None' : `${info.minutesLeft} min`}
          </dd>
        </div>
        <div className={s.stat}>
          <dt>Answered</dt>
          <dd>
            {info.answered} of {info.total}
          </dd>
        </div>
        {info.review > 0 ? (
          <div className={s.stat}>
            <dt>Marked for review</dt>
            <dd>{info.review}</dd>
          </div>
        ) : null}
      </dl>
      <ProgressBar value={answeredPercent} label="Questions answered" color="var(--primary)" />
      <p className={s.note}>{statusNote(info)}</p>

      {confirming ? (
        <div className={s.confirm} role="group" aria-labelledby={questionId}>
          <p id={questionId} className={s.confirmText}>
            Discard this test?{' '}
            {info.answered > 0
              ? `Your ${plural(info.answered, 'saved answer')} will be lost. `
              : ''}
            It will not be added to your history, and this cannot be undone.
          </p>
          <div className={s.actions}>
            <button type="button" className={`${ui.button} ${ui.danger}`} onClick={discard}>
              Discard test
            </button>
            <button type="button" ref={keepRef} className={ui.button} onClick={cancel}>
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <div className={s.actions}>
          <LinkButton variant="primary" href={href('/exam')} className={s.resumeButton}>
            {info.status === 'time-up' ? 'Submit and see result' : 'Resume test'}
          </LinkButton>
          <button
            type="button"
            ref={discardRef}
            className={`${ui.button} ${ui.ghost} ${s.discard}`}
            onClick={() => setConfirming(true)}
          >
            Discard…
          </button>
        </div>
      )}
    </section>
  );
}
