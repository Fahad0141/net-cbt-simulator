import { type KeyboardEvent, useEffect, useRef } from 'react';
import { Button, LinkButton } from '@/ui/components/ui';
import { href } from '@/ui/router';
import type { ActiveSessionInfo } from './model';
import styles from '../NewPaperPage.module.css';

function statusText(info: ActiveSessionInfo): string {
  switch (info.status) {
    case 'not-started':
      return 'not started yet';
    case 'paused':
      return `paused with about ${info.minutesLeft} min left`;
    case 'time-up':
      return 'out of time but not submitted';
    default:
      return `in progress with about ${info.minutesLeft} min left`;
  }
}

/** Modal asking before an unfinished test is discarded. */
export function ConfirmDialog({
  info,
  onConfirm,
  onCancel,
}: {
  info: ActiveSessionInfo;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    if (!focusable?.length) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-title"
        aria-describedby="discard-body"
        onKeyDown={onKeyDown}
      >
        <h2 id="discard-title" className={styles.dialogTitle}>
          Discard your unfinished test?
        </h2>
        <div id="discard-body" className={styles.dialogBody}>
          <p>
            <strong>{info.title}</strong> ({info.code}, {info.mode === 'exam' ? 'exam' : 'practice'}{' '}
            mode) is {statusText(info)}. You have answered {info.answered} of {info.total}{' '}
            questions.
          </p>
          <p>Starting a new test discards it; it will not be scored or saved in your history.</p>
        </div>
        <div className={styles.dialogActions}>
          <Button data-autofocus onClick={onCancel}>
            Keep it
          </Button>
          <LinkButton href={href('/exam')}>Resume it</LinkButton>
          <Button variant="danger" onClick={onConfirm}>
            Discard and start new
          </Button>
        </div>
      </div>
    </div>
  );
}
