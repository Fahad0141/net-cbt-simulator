import { type ReactNode, useEffect, useRef } from 'react';
import type { ProgressCounts } from '@/exam/session';
import styles from './cbt.module.css';
import {
  FirstGlyph,
  HelpGlyph,
  LastGlyph,
  NextGlyph,
  NextSectionGlyph,
  PrevGlyph,
  PrevSectionGlyph,
  ReviewGlyph,
  SaveGlyph,
} from './icons';

function Dialog({
  title,
  children,
  actions,
  wide = false,
  onClose,
}: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  wide?: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={`${styles.dialog} ${wide ? styles.dialogWide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbt-dialog-title"
      >
        <div className={styles.dialogTitle} id="cbt-dialog-title">
          {title}
        </div>
        <div className={styles.dialogBody}>{children}</div>
        <div className={styles.dialogActions}>{actions}</div>
      </div>
    </div>
  );
}

function QuestionIcon() {
  return (
    <svg
      className={styles.dialogIcon}
      viewBox="0 0 32 32"
      width="32"
      height="32"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="15" fill="#2b6cd4" />
      <path
        d="M12 12.2a4 4 0 1 1 5.6 3.7c-1.1.5-1.6 1.2-1.6 2.4v.8"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="23.6" r="1.6" fill="#fff" />
    </svg>
  );
}

/** The terminal's finish confirmation (wording as on the real CBT), plus a progress summary. */
export function FinishDialog({
  counts,
  onConfirm,
  onCancel,
}: {
  counts: ProgressCounts;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      title="Message from webpage"
      onClose={onCancel}
      actions={
        <>
          <button type="button" className={styles.classicButton} onClick={onConfirm} data-autofocus>
            OK
          </button>
          <button type="button" className={styles.classicButton} onClick={onCancel}>
            Cancel
          </button>
        </>
      }
    >
      <QuestionIcon />
      <div>
        {'Once you Finish the paper, You will not be able to Logon again.\n\nAre you sure?'}
        <div className={styles.dialogStats} aria-label="Progress summary">
          <span>Answered (saved)</span>
          <strong>{counts.answered}</strong>
          <span>Not answered</span>
          <strong>{counts.unanswered}</strong>
          <span>Marked for review</span>
          <strong>{counts.review}</strong>
          <span>Not visited</span>
          <strong>{counts.notVisited}</strong>
        </div>
      </div>
    </Dialog>
  );
}

const HELP_ROWS: Array<[ReactNode, string, string]> = [
  [
    <SaveGlyph key="s" />,
    'Save',
    'Records the option you selected. An answer is NOT recorded until you press Save; moving away discards an unsaved selection.',
  ],
  [<NextGlyph key="n" />, 'Next', 'Moves to the next question (continues into the next section).'],
  [<PrevGlyph key="p" />, 'Prev', 'Moves to the previous question.'],
  [
    <ReviewGlyph key="r" />,
    'Review',
    'Marks a saved question for review so you can come back to it.',
  ],
  [
    <NextSectionGlyph key="ns" />,
    'Next Section',
    'Jumps to the first question of the next section.',
  ],
  [
    <PrevSectionGlyph key="ps" />,
    'Prev Section',
    'Jumps to the first question of the previous section.',
  ],
  [<FirstGlyph key="f" />, 'First', 'Jumps to the first question of the paper.'],
  [<LastGlyph key="l" />, 'Last', 'Jumps to the last question of the paper.'],
  [<HelpGlyph key="h" />, 'Help', 'Shows this help.'],
];

export function HelpDialog({ onClose, shortcuts }: { onClose: () => void; shortcuts: boolean }) {
  return (
    <Dialog
      title="Help"
      wide
      onClose={onClose}
      actions={
        <button type="button" className={styles.classicButton} onClick={onClose} data-autofocus>
          Close
        </button>
      }
    >
      <div style={{ width: '100%' }}>
        <table className={styles.helpTable}>
          <tbody>
            {HELP_ROWS.map(([icon, label, text]) => (
              <tr key={label}>
                <td style={{ width: 64 }}>
                  <span className={styles.cbtButton} aria-hidden="true">
                    {icon}
                  </span>
                </td>
                <td style={{ width: 110 }}>
                  <strong>{label}</strong>
                </td>
                <td>{text}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Use the <strong>Show</strong> and <strong>Question</strong> lists at the bottom to jump
          straight to any question, or to list only Attempted, Unattempted or Reviewable questions.
          The top bar shows how many questions you have attempted.
        </p>
        <p>
          The countdown in the green box shows the minutes remaining. When it reaches zero the paper
          is submitted automatically. The question area blinks when you spend longer than the
          average time per question (about 54 seconds on a 200-question, 180-minute paper). Use{' '}
          <strong>“Click here to FINISH Your Test”</strong> to submit early — you cannot log in
          again afterwards.
        </p>
        {shortcuts ? (
          <p>
            <strong>Simulator shortcuts:</strong> 1–4 or A–D select an option, Enter saves, → / ←
            next / previous, R marks for review.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
