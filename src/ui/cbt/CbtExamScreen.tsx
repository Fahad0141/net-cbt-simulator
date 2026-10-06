import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buttonStates,
  currentQuestionTimeMs,
  filterQuestions,
  isPaused,
  progressCounts,
  type QuestionFilter,
  remainingMs,
  sectionIndexOf,
} from '@/exam/session';
import { RichText } from '@/ui/components/RichText';
import { FinishDialog, HelpDialog } from './CbtDialogs';
import { CbtPalette } from './CbtPalette';
import styles from './cbt.module.css';
import {
  ClockFace,
  FirstGlyph,
  GridGlyph,
  HelpGlyph,
  LastGlyph,
  MaximizeGlyph,
  NextGlyph,
  NextSectionGlyph,
  PauseGlyph,
  PhotoPlaceholder,
  PlayGlyph,
  PrevGlyph,
  PrevSectionGlyph,
  ReviewGlyph,
  SaveGlyph,
} from './icons';
import type { ExamController } from './useExamController';

const FONT_SIZES = [14, 16, 18, 20];

function formatClock(epoch: number | null): string {
  if (epoch === null) return '--:--';
  return new Date(epoch).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length ? parts.slice(0, 2).map((p) => p[0]) : ['?']).join('').toUpperCase();
}

export function CbtExamScreen({ controller }: { controller: ExamController }) {
  const { session, now, dispatch } = controller;
  const [maximized, setMaximized] = useState(false);
  const [dialog, setDialog] = useState<'finish' | 'help' | null>(null);
  const [showPalette, setShowPalette] = useState(session.settings.showPalette);
  const [fontIndex, setFontIndex] = useState(1);
  const [feedback, setFeedback] = useState(session.settings.instantFeedback);
  const [filter, setFilter] = useState<QuestionFilter>('all');
  const [pacing, setPacing] = useState(session.settings.pacingBlink !== false);

  const practice = session.settings.mode === 'practice';
  const paused = isPaused(session);
  const question = session.paper.questions[session.current];
  const state = session.questions[session.current];
  const sectionIdx = sectionIndexOf(session, session.current);
  const section = session.paper.sections[sectionIdx];
  const buttons = buttonStates(session);
  const remaining = remainingMs(session, now);
  const minutesLeft = Math.ceil(remaining / 60_000);
  const lowTime = practice && remaining <= 5 * 60_000;
  const counts = useMemo(() => progressCounts(session), [session]);
  const filtered = useMemo(() => filterQuestions(session, filter), [session, filter]);

  // Pacing cue reported by candidates: the screen dims/blinks after the average time
  // per question (180 min / 200 = 54 s). Re-keyed each time another budget elapses.
  const budgetMs = session.durationMs / Math.max(1, session.questions.length);
  const blinkCount =
    pacing && !paused ? Math.floor(currentQuestionTimeMs(session, now) / budgetMs) : 0;

  const message =
    remaining <= 60_000
      ? `Less than a minute remaining`
      : remaining <= 15 * 60_000
        ? `${minutesLeft} minutes remaining`
        : '';
  const unsaved = state !== undefined && state.selected !== null && state.selected !== state.saved;
  const showFeedback = practice && feedback && state?.saved !== null && state?.saved !== undefined;

  const go = useCallback((index: number) => dispatch({ type: 'goto', index }), [dispatch]);

  // Keyboard shortcuts are a simulator convenience, enabled in practice mode.
  useEffect(() => {
    if (!practice || dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) &&
        (target as HTMLInputElement).type !== 'radio'
      )
        return;
      const key = e.key.toLowerCase();
      const option =
        ['1', '2', '3', '4'].indexOf(key) >= 0
          ? Number(key) - 1
          : ['a', 'b', 'c', 'd'].indexOf(key);
      if (option >= 0) {
        dispatch({ type: 'select', option });
        e.preventDefault();
      } else if (key === 'enter') {
        dispatch({ type: 'save' });
        e.preventDefault();
      } else if (key === 'arrowright') {
        dispatch({ type: 'next' });
        e.preventDefault();
      } else if (key === 'arrowleft') {
        dispatch({ type: 'previous' });
        e.preventDefault();
      } else if (key === 'r') {
        dispatch({ type: 'review' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [practice, dialog, dispatch]);

  if (!question || !state || !section) return null;

  const optionClass = (i: number) => {
    const cls = [styles.option];
    if (state.saved === i) cls.push(styles.saved);
    if (showFeedback) {
      if (i === question.correct) cls.push(styles.revealCorrect);
      else if (i === state.saved) cls.push(styles.revealWrong);
    }
    return cls.join(' ');
  };

  return (
    <>
      <div
        className={styles.page}
        style={{ ['--cbt-font' as string]: `${FONT_SIZES[fontIndex]}px` }}
      >
        <div className={styles.frame}>
          {/* Section / test / candidate */}
          <div className={`${styles.cellWhite} ${styles.infoRow}`}>
            <span>
              <span className={styles.sectionTitle}>{section.title}</span>
              <span
                className={styles.attempted}
                aria-label={`Attempted ${counts.answered} of ${session.questions.length}`}
              >
                Attempted: {counts.answered}/{session.questions.length}
              </span>
            </span>
            <span className={styles.testName}>{session.paper.title}</span>
            <span className={styles.candidate}>
              <span className={styles.userId}>{session.candidate.userId}</span>{' '}
              <span className={styles.centre}>({session.candidate.centre})</span>
            </span>
          </div>

          <div
            className={`${styles.paperGrid} ${maximized ? styles.maximized : ''} ${styles.paperRelative}`}
          >
            {paused ? (
              <div className={styles.paused} role="status">
                <strong>Paper paused</strong>
                <span>The clock is stopped. Questions are hidden while paused.</span>
                <button
                  type="button"
                  className={styles.classicButton}
                  onClick={() => dispatch({ type: 'resume' })}
                >
                  Resume
                </button>
              </div>
            ) : null}

            <div className={`${styles.heading} ${styles.qHeading}`}>
              <span aria-live="polite">
                Question No : <span className={styles.blue}>{session.current + 1} of </span>
                <span className={styles.blue}>{session.questions.length}</span>
              </span>
              <span className={styles.qHeadingRight}>
                <span>
                  Marks: <span className={styles.blue}>1</span>
                </span>
                <button
                  type="button"
                  className={styles.iconButton}
                  title={maximized ? 'Restore' : 'Maximize'}
                  aria-label={maximized ? 'Restore layout' : 'Maximize question area'}
                  aria-pressed={maximized}
                  onClick={() => setMaximized((m) => !m)}
                >
                  <MaximizeGlyph restore={maximized} />
                </button>
              </span>
            </div>

            {!maximized ? (
              <div className={styles.photoCell}>
                <div className={styles.photoPanel}>
                  <span className={styles.photoLabel}>Photograph</span>
                  <PhotoPlaceholder initials={initialsOf(session.candidate.name)} />
                </div>
              </div>
            ) : null}

            <div className={`${styles.questionCell} ${styles.paperRelative}`}>
              {blinkCount > 0 ? (
                <div
                  key={`${session.current}-${blinkCount}`}
                  className={styles.blink}
                  aria-hidden="true"
                />
              ) : null}
              <div className={styles.tabStrip} role="tablist">
                <span className={styles.tab} role="tab" aria-selected="true">
                  Question
                </span>
              </div>
              <div className={styles.tabBody} role="tabpanel">
                <div
                  className={styles.questionBox}
                  tabIndex={0}
                  aria-label={`Question ${session.current + 1}`}
                >
                  {question.passage ? (
                    <div className={styles.passage}>
                      <div className={styles.passageNote}>
                        Read the passage and answer the question ({question.passage.part} of{' '}
                        {question.passage.of}).
                      </div>
                      {question.passage.title ? (
                        <div className={styles.passageTitle}>{question.passage.title}</div>
                      ) : null}
                      <RichText text={question.passage.text} />
                    </div>
                  ) : null}
                  <RichText text={question.stem} />
                  {question.figure ? (
                    <div
                      className={styles.figure}
                      dangerouslySetInnerHTML={{ __html: question.figure }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className={`${styles.heading} ${styles.answerHeading}`}>
              <span>
                Answer <span className={styles.blue}>( Please select your correct option )</span>
              </span>
            </div>

            <div className={styles.options} role="radiogroup" aria-label="Options">
              {question.options.map((option, i) => (
                <label key={i} className={optionClass(i)}>
                  <span className={styles.optionRadio}>
                    <input
                      type="radio"
                      name={`q-${session.current}`}
                      checked={state.selected === i}
                      onChange={() => dispatch({ type: 'select', option: i })}
                      aria-label={`Option ${i + 1}`}
                    />
                  </span>
                  <span className={styles.optionBox}>
                    <RichText text={option} inline />
                  </span>
                </label>
              ))}
              {showFeedback ? (
                <div
                  className={styles.optionBox}
                  style={{ display: 'block', margin: '2px 4px 0 30px' }}
                >
                  <strong>{state.saved === question.correct ? 'Correct. ' : 'Incorrect. '}</strong>
                  <RichText text={question.explanation} />
                </div>
              ) : null}
            </div>

            <div className={styles.controls}>
              <div className={styles.timer} aria-label="Timer">
                <div className={styles.startTime}>
                  Start Time: <span>{formatClock(session.startedAt)}</span>
                </div>
                <div className={`${styles.countdown} ${lowTime ? styles.low : ''}`}>
                  <div className={styles.countdownText} role="timer" aria-live="off">
                    <span className={styles.minutes}>{minutesLeft}</span>
                    <span className={styles.minLabel}>min</span>
                    <span className={styles.remainingLabel}>Remaining</span>
                  </div>
                  <div className={styles.clockCell}>
                    <ClockFace minutesLeft={minutesLeft} />
                  </div>
                </div>
              </div>

              <div className={styles.middle}>
                <div className={styles.messageArea} role="status">
                  {message}
                </div>
                <div className={styles.jumpRow}>
                  <label className={styles.jumpLabel}>
                    <span>Show</span>
                    <select
                      className={styles.jumpSelect}
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as QuestionFilter)}
                    >
                      <option value="all">All</option>
                      <option value="attempted">Attempted</option>
                      <option value="unattempted">Unattempted</option>
                      <option value="reviewable">Reviewable</option>
                    </select>
                  </label>
                  <label className={styles.jumpLabel}>
                    <span>Question</span>
                    <select
                      className={styles.jumpSelect}
                      value={filtered.includes(session.current) ? String(session.current) : ''}
                      disabled={filtered.length === 0}
                      onChange={(e) => e.target.value !== '' && go(Number(e.target.value))}
                    >
                      {!filtered.includes(session.current) ? (
                        <option value="">{filtered.length ? 'Go to…' : 'None'}</option>
                      ) : null}
                      {filtered.map((i) => (
                        <option key={i} value={i}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className={styles.navButtons} role="toolbar" aria-label="Question navigation">
                <button
                  type="button"
                  className={styles.cbtButton}
                  title="Save"
                  disabled={!buttons.save}
                  onClick={() => dispatch({ type: 'save' })}
                >
                  <SaveGlyph />
                  Save
                </button>
                <button
                  type="button"
                  className={styles.cbtButton}
                  title="Next Question"
                  disabled={!buttons.next}
                  onClick={() => dispatch({ type: 'next' })}
                >
                  <NextGlyph />
                  Next
                </button>
                <button
                  type="button"
                  className={styles.cbtButton}
                  title="Previous Question"
                  disabled={!buttons.previous}
                  onClick={() => dispatch({ type: 'previous' })}
                >
                  <PrevGlyph />
                  Prev
                </button>
                <button
                  type="button"
                  className={styles.cbtButton}
                  title={state.review ? 'Remove review mark' : 'Mark for review'}
                  disabled={!(buttons.review || (practice && buttons.unreview))}
                  aria-pressed={state.review}
                  onClick={() => dispatch({ type: 'review' })}
                >
                  <ReviewGlyph />
                  Review
                </button>
                <button
                  type="button"
                  className={styles.cbtButton}
                  title="Next Section"
                  disabled={!buttons.nextSection}
                  onClick={() => dispatch({ type: 'nextSection' })}
                >
                  <NextSectionGlyph />
                  <span className={styles.twoLine}>
                    Next
                    <br />
                    Section
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.cbtButton}
                  title="Previous Section"
                  disabled={!buttons.previousSection}
                  onClick={() => dispatch({ type: 'previousSection' })}
                >
                  <PrevSectionGlyph />
                  <span className={styles.twoLine}>
                    Prev
                    <br />
                    Section
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.cbtButton}
                  title="First Question"
                  disabled={!buttons.first}
                  onClick={() => dispatch({ type: 'first' })}
                >
                  <FirstGlyph />
                  First
                </button>
                <button
                  type="button"
                  className={styles.cbtButton}
                  title="Last Question"
                  disabled={!buttons.last}
                  onClick={() => dispatch({ type: 'last' })}
                >
                  <LastGlyph />
                  Last
                </button>
                <button
                  type="button"
                  className={styles.cbtButton}
                  title="Help"
                  onClick={() => setDialog('help')}
                >
                  <HelpGlyph />
                  Help
                </button>
              </div>
            </div>

            <div className={styles.finishRow}>
              <button
                type="button"
                className={styles.finishLink}
                onClick={() => setDialog('finish')}
              >
                Click here to <strong>FINISH</strong> Your Test
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator aids, visually separate from the faithful terminal frame. */}
      <div className={styles.simBar}>
        <span className={styles.simBadge}>
          {practice ? 'Practice mode' : 'Exam mode'} · {counts.answered} saved · {counts.review} for
          review
          {unsaved ? ' · unsaved selection — press Save' : ''}
        </span>
        <div className={styles.simTools}>
          <button
            type="button"
            className={styles.simButton}
            aria-pressed={showPalette}
            onClick={() => setShowPalette((v) => !v)}
          >
            <GridGlyph /> Navigator
          </button>
          <button
            type="button"
            className={styles.simButton}
            onClick={() => setFontIndex((i) => (i + 1) % FONT_SIZES.length)}
            title="Change text size"
          >
            A<span style={{ fontSize: 10 }}>A</span> Text size
          </button>
          <button
            type="button"
            className={styles.simButton}
            aria-pressed={pacing}
            onClick={() => setPacing((v) => !v)}
            title="Dim the question after the average time per question, as on the real terminal"
          >
            ◐ Pacing blink
          </button>
          {practice ? (
            <button
              type="button"
              className={styles.simButton}
              aria-pressed={feedback}
              onClick={() => setFeedback((v) => !v)}
            >
              ✓ Instant feedback
            </button>
          ) : null}
          {session.settings.allowPause ? (
            <button
              type="button"
              className={styles.simButton}
              onClick={() => dispatch({ type: paused ? 'resume' : 'pause' })}
            >
              {paused ? <PlayGlyph /> : <PauseGlyph />} {paused ? 'Resume' : 'Pause'}
            </button>
          ) : null}
        </div>
      </div>
      {showPalette && !paused ? <CbtPalette session={session} onGoto={go} /> : null}

      {dialog === 'finish' ? (
        <FinishDialog
          counts={counts}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            dispatch({ type: 'finish', reason: 'submitted' });
          }}
        />
      ) : null}
      {dialog === 'help' ? (
        <HelpDialog shortcuts={practice} onClose={() => setDialog(null)} />
      ) : null}
    </>
  );
}
