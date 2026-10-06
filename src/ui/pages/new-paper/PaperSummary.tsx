import { useEffect, useRef, useState } from 'react';
import type { Paper } from '@/engine/types';
import type { CustomPaperSpec, GenerationOptions } from '@/exam/papers';
import { paperShareText, publicAppUrl } from '@/platform/links';
import { isNativeApp, shareContent } from '@/platform/native';
import { href } from '@/ui/router';
import { Button, LinkButton } from '@/ui/components/ui';
import { copyText } from './browser';
import {
  DIFFICULTY_META,
  formatMinutes,
  isSubjectId,
  newPaperPath,
  paperStats,
  percentOf,
  printablePath,
  shortSectionTitle,
  SUBJECT_COLORS,
} from './model';
import styles from '../NewPaperPage.module.css';

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={styles.miniStat}>
      <span className={styles.miniLabel}>{label}</span>
      <span className={styles.miniValue}>{value}</span>
      {hint ? <span className={styles.miniHint}>{hint}</span> : null}
    </div>
  );
}

function ShareRow({
  label,
  value,
  total,
  color,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  hint: string;
}) {
  const pct = percentOf(value, total);
  return (
    <li className={styles.shareRow}>
      <span>{label}</span>
      <span className={styles.shareValue}>
        {value} · {pct}%
      </span>
      <span className={styles.shareTrack} aria-hidden="true">
        <span className={styles.shareFill} style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className={styles.shareHint}>{hint}</span>
    </li>
  );
}

/** Id of the "Start test" button (focus returns here after the confirm dialog). */
export const START_BUTTON_ID = 'start-test';

const CheckIcon = () => (
  <svg
    className={styles.readyIcon}
    width="20"
    height="20"
    viewBox="0 0 20 20"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <path
      d="M6 10.5l2.6 2.6L14 7.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** What the generated paper contains, plus the start / print / share actions. */
export function PaperSummary({
  paper,
  options,
  spec,
  modeText,
  focusHeading,
  onStart,
  onNewCode,
  startError,
}: {
  paper: Paper;
  options: GenerationOptions;
  spec: CustomPaperSpec | null;
  modeText: string;
  focusHeading: boolean;
  onStart: () => void;
  onNewCode: () => void;
  startError: string | null;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copyStatus, setCopyStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const stats = paperStats(paper, spec);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [paper, focusHeading]);

  useEffect(() => setCopyStatus(null), [paper]);

  async function copy(text: string, what: string) {
    const ok = await copyText(text);
    setCopyStatus(
      ok ? { text: `${what} copied.`, ok } : { text: `Could not copy. ${what}: ${text}`, ok },
    );
  }

  const sharePath = newPaperPath(paper, options, spec);
  const shareUrl = publicAppUrl(sharePath);
  const native = isNativeApp();

  // The Android app shares through the share sheet: a link to the website, or the code.
  async function share() {
    try {
      await shareContent(
        shareUrl
          ? { title: paper.title, text: `${paper.title} · ${paper.code}`, url: shareUrl }
          : { title: paper.title, text: paperShareText(paper.code, sharePath) },
      );
    } catch {
      setCopyStatus({ text: 'Could not open the share sheet.', ok: false });
    }
  }

  return (
    <div className={styles.summary}>
      <div className={styles.readyHead}>
        <h2 ref={headingRef} tabIndex={-1} className={styles.panelTitle}>
          <CheckIcon />
          Paper ready
        </h2>
        <p className={styles.paperTitle}>{paper.title}</p>
      </div>

      <div className={styles.codeBox}>
        <span className={styles.codeLabel} id="paper-code-label">
          Paper code
        </span>
        <span className={styles.code} aria-labelledby="paper-code-label" data-testid="paper-code">
          {paper.code}
        </span>
        <Button
          size="sm"
          className={styles.tap}
          onClick={() => void copy(paper.code, 'Paper code')}
          aria-label={`Copy paper code ${paper.code}`}
        >
          Copy
        </Button>
      </div>

      <div className={styles.miniStats}>
        <MiniStat label="Questions" value={String(stats.total)} hint={`${stats.total} marks`} />
        <MiniStat label="Time" value={formatMinutes(paper.durationMinutes)} />
        <MiniStat
          label="Chapters"
          value={String(stats.chaptersCovered)}
          hint={stats.chaptersInScope ? `of ${stats.chaptersInScope}` : undefined}
        />
      </div>

      <div>
        <h3 className={styles.subheading}>Sections</h3>
        <div className={styles.bar} aria-hidden="true">
          {stats.sections.map((s) => (
            <span
              key={`${s.subject}-${s.first}`}
              style={{
                flexGrow: s.count,
                background: isSubjectId(s.subject) ? SUBJECT_COLORS[s.subject] : 'var(--muted)',
              }}
            />
          ))}
        </div>
        <ul className={styles.legend}>
          {stats.sections.map((s) => (
            <li key={`${s.subject}-${s.first}`}>
              <span
                className={styles.dot}
                style={{
                  background: isSubjectId(s.subject) ? SUBJECT_COLORS[s.subject] : 'var(--muted)',
                }}
                aria-hidden="true"
              />
              {shortSectionTitle(s.title)} {s.count}
              <span className={styles.legendPct}>
                (Q{s.first}–{s.last})
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className={styles.subheading}>Difficulty</h3>
        <div className={styles.bar} aria-hidden="true">
          {DIFFICULTY_META.map((d) =>
            stats.difficulty[d.level] ? (
              <span
                key={d.level}
                style={{ flexGrow: stats.difficulty[d.level], background: d.color }}
              />
            ) : null,
          )}
        </div>
        <ul className={styles.legend}>
          {DIFFICULTY_META.map((d) => (
            <li key={d.level}>
              <span className={styles.dot} style={{ background: d.color }} aria-hidden="true" />
              {d.label} {stats.difficulty[d.level]}
              <span className={styles.legendPct}>
                ({percentOf(stats.difficulty[d.level], stats.total)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className={styles.subheading}>Question sources</h3>
        <ul className={styles.shares}>
          <ShareRow
            label="Randomised values"
            value={stats.randomised}
            total={stats.total}
            color="var(--primary)"
            hint="Built afresh for every paper (new numbers or passages), so they cannot be memorised."
          />
          <ShareRow
            label="Fixed questions"
            value={stats.fixed}
            total={stats.total}
            color="var(--purple)"
            hint="Concept and vocabulary items worded as on the NET."
          />
          <ShareRow
            label="Past-paper style"
            value={stats.pastPaper}
            total={stats.total}
            color="var(--accent)"
            hint="Modelled on questions reported from real NET sittings (overlaps the two above)."
          />
        </ul>
      </div>

      {stats.outOfScope > 0 ? (
        <p className={styles.note}>
          {stats.outOfScope} question{stats.outOfScope === 1 ? ' comes' : 's come'} from outside
          your chosen chapters because the bank had too few questions there.
        </p>
      ) : null}

      <p className={styles.startNote}>
        {modeText} · {formatMinutes(paper.durationMinutes)}. The timer starts after the instructions
        screen.
      </p>
      <Button
        id={START_BUTTON_ID}
        variant="primary"
        size="lg"
        className={styles.block}
        onClick={onStart}
      >
        Start test
      </Button>
      {startError ? (
        <p className={styles.error} role="alert">
          {startError}
        </p>
      ) : null}

      <div className={styles.secondaryActions}>
        <LinkButton
          className={styles.actionButton}
          href={href(printablePath(paper, options, spec))}
        >
          Printable paper (PDF)
        </LinkButton>
        {native ? (
          <Button className={styles.actionButton} onClick={() => void share()}>
            {shareUrl ? 'Share link' : 'Share paper code'}
          </Button>
        ) : shareUrl ? (
          <Button className={styles.actionButton} onClick={() => void copy(shareUrl, 'Share link')}>
            Copy share link
          </Button>
        ) : (
          // The desktop app without a known website: the code, which "Open a paper code" accepts.
          <Button
            className={styles.actionButton}
            onClick={() => void copy(paperShareText(paper.code, sharePath), 'Share message')}
          >
            Copy share message
          </Button>
        )}
        <Button className={styles.actionButton} onClick={onNewCode}>
          New code
        </Button>
      </div>
      <p
        className={`${styles.copyStatus} ${copyStatus && !copyStatus.ok ? styles.copyStatusWarn : ''}`}
        role="status"
      >
        {copyStatus?.text ?? ''}
      </p>
    </div>
  );
}
