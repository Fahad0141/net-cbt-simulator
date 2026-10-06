import { type Ref, useId } from 'react';
import { externalLinkTarget } from '@/platform/links';
import { QuestionView } from '@/ui/components/QuestionView';
import { Badge, Button, formatDuration, ui } from '@/ui/components/ui';
import {
  ArchiveIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CrossIcon,
  DashIcon,
  DiceIcon,
  DifficultyBars,
  ExternalIcon,
  FlagIcon,
  SwapIcon,
} from './icons';
import { chapterTitle, DIFFICULTY_LABELS, optionLetter, type ReviewItem } from './model';
import s from './review.module.css';

const OUTCOME_TITLE = { correct: 'Correct', wrong: 'Wrong', blank: 'Not attempted' } as const;
const OUTCOME_ICON = { correct: CheckIcon, wrong: CrossIcon, blank: DashIcon } as const;
const BANNER_CLASS = {
  correct: s.bannerCorrect,
  wrong: s.bannerWrong,
  blank: s.bannerBlank,
} as const;

function OutcomeBanner({ item }: { item: ReviewItem }) {
  const { outcome, state, question } = item;
  const Icon = OUTCOME_ICON[outcome];
  return (
    <div className={`${s.banner} ${BANNER_CLASS[outcome] ?? ''}`} data-outcome={outcome}>
      <span className={s.bannerTitle}>
        <Icon className={s.bannerIcon} width={18} height={18} />
        {OUTCOME_TITLE[outcome]}
      </span>
      <span className={s.bannerDetail}>
        {outcome === 'correct' ? (
          <>
            You answered <strong>{optionLetter(state.saved)}</strong>.
          </>
        ) : outcome === 'wrong' ? (
          <>
            You answered <strong>{optionLetter(state.saved)}</strong>; the correct answer is{' '}
            <strong>{optionLetter(question.correct)}</strong>.
          </>
        ) : (
          <>
            The correct answer is <strong>{optionLetter(question.correct)}</strong>.
          </>
        )}
      </span>
      {state.review ? (
        <span className={s.reviewTag}>
          <FlagIcon /> Marked for review
        </span>
      ) : null}
    </div>
  );
}

function MetaBadges({ item, subjectTitle }: { item: ReviewItem; subjectTitle: string }) {
  const q = item.question;
  const difficulty = DIFFICULTY_LABELS[q.difficulty] ?? 'Unrated';
  return (
    <>
      <Badge tone="info">
        <span className="visually-hidden">Subject: </span>
        <span className={s.badgeText}>{subjectTitle}</span>
      </Badge>
      <Badge>
        <span className="visually-hidden">Chapter: </span>
        <span className={s.badgeText}>{chapterTitle(q.subject, q.chapter)}</span>
      </Badge>
      <Badge>
        <DifficultyBars level={q.difficulty} />
        <span className="visually-hidden">Difficulty: </span>
        {difficulty}
      </Badge>
      {q.origin === 'past-paper' ? (
        <Badge tone="warning" title="Modelled on a question reported from a real NET sitting">
          <ArchiveIcon width={13} height={13} /> Past-paper style
        </Badge>
      ) : null}
      {q.templateKind === 'dynamic' ? (
        <Badge title="The numbers in this question are generated afresh for every paper">
          <DiceIcon width={13} height={13} /> Randomised values
        </Badge>
      ) : null}
    </>
  );
}

function Facts({ item, paceMs }: { item: ReviewItem; paceMs: number }) {
  const { state } = item;
  const opened = state.visited || state.timeMs > 0;
  const overPace = opened && paceMs > 0 && state.timeMs > paceMs;
  const changes = Math.max(0, state.revisions || 0);
  return (
    <dl className={s.facts}>
      <div>
        <dt>
          <ClockIcon /> Time spent
        </dt>
        <dd>
          {opened ? formatDuration(state.timeMs) : 'Not opened'}
          {overPace ? (
            <span className={s.overPace}> · over the {formatDuration(paceMs)} pace</span>
          ) : null}
        </dd>
      </div>
      <div>
        <dt>
          <SwapIcon /> Answer changes
        </dt>
        <dd>{changes}</dd>
      </div>
    </dl>
  );
}

export interface ReviewQuestionProps {
  item: ReviewItem;
  /** Display name of the question's subject (the paper's section title where there is one). */
  subjectTitle: string;
  /** Questions in the paper. */
  total: number;
  /** 0-based position of `item` in the filtered list, and the list's length. */
  position: number;
  count: number;
  /** Describes an active filter, e.g. "Wrong · Physics"; null when everything is shown. */
  scopeLabel: string | null;
  showExplanations: boolean;
  paceMs: number;
  paperCode: string;
  reportHref: string;
  onPrevious: () => void;
  onNext: () => void;
  ref?: Ref<HTMLElement>;
}

/** The question on screen, with its outcome, metadata and previous/next controls. */
export function ReviewQuestion({
  item,
  subjectTitle,
  total,
  position,
  count,
  scopeLabel,
  showExplanations,
  paceMs,
  paperCode,
  reportHref,
  onPrevious,
  onNext,
  ref,
}: ReviewQuestionProps) {
  const headingId = useId();
  const { question, state, number } = item;
  const hasPrevious = position > 0;
  const hasNext = position < count - 1;
  return (
    <article ref={ref} className={`${ui.card} ${s.questionCard}`} aria-labelledby={headingId}>
      <header className={s.qHeader}>
        <h2 id={headingId} className={s.qTitle}>
          Question {number} <span className={s.qOf}>of {total}</span>
        </h2>
        {scopeLabel ? (
          <p className={s.scope}>
            {position + 1} of {count} · {scopeLabel}
          </p>
        ) : null}
      </header>

      <OutcomeBanner item={item} />

      <QuestionView
        number={number}
        stem={question.stem}
        options={question.options}
        correct={question.correct}
        selected={state.saved}
        reveal
        explanation={question.explanation}
        showExplanation={showExplanations}
        figure={question.figure}
        passage={question.passage}
        meta={<MetaBadges item={item} subjectTitle={subjectTitle} />}
      />

      <Facts item={item} paceMs={paceMs} />

      <div className={s.reportRow}>
        <p className={s.reference}>
          <span className={s.referenceLabel}>Reference</span>{' '}
          <code>
            {paperCode} · Q{number}
          </code>{' '}
          <code className={s.templateId}>{question.templateId}</code>
        </p>
        <a className={s.reportLink} href={reportHref} target="_blank" rel="noopener noreferrer">
          Report a problem
          <span className="visually-hidden">
            {' '}
            with question {number} (opens GitHub {externalLinkTarget()})
          </span>
          <ExternalIcon width={14} height={14} />
        </a>
      </div>

      <nav className={s.navBar} aria-label="Previous and next question">
        <Button
          aria-disabled={!hasPrevious}
          onClick={hasPrevious ? onPrevious : undefined}
          className={s.navButton}
        >
          <ChevronLeftIcon /> Previous<span className="visually-hidden"> question</span>
        </Button>
        <span className={s.navPosition} aria-hidden="true">
          {position + 1} / {count}
        </span>
        <Button
          variant="primary"
          aria-disabled={!hasNext}
          onClick={hasNext ? onNext : undefined}
          className={s.navButton}
        >
          Next<span className="visually-hidden"> question</span> <ChevronRightIcon />
        </Button>
      </nav>
    </article>
  );
}
