import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { REPO_URL } from '@/config/site';
import type { AttemptRecord } from '@/exam/store';
import { isInstalledApp } from '@/platform/desktop';
import { local } from '@/storage/kv';
import {
  Button,
  Callout,
  Card,
  EmptyState,
  formatDate,
  LinkButton,
  PageHeader,
  ui,
} from '@/ui/components/ui';
import { useAttempt } from '@/ui/hooks';
import { href, navigate, parseHash } from '@/ui/router';
import {
  buildIssueUrl,
  buildReviewModel,
  countFilters,
  FILTER_LABELS,
  filterItems,
  outcomeSentence,
  parseReviewQuery,
  resolvePosition,
  type ReviewFilter,
  type ReviewItem,
  reviewPath,
  type ReviewView,
  subjectName,
} from './review/model';
import { type NavigatorGroup, ReviewNavigator } from './review/ReviewNavigator';
import { ReviewQuestion } from './review/ReviewQuestion';
import { ReviewToolbar } from './review/ReviewToolbar';
import { useReviewShortcuts } from './review/useReviewShortcuts';
import styles from './ReviewPage.module.css';

const TITLE = 'Review · NET CBT Simulator';
const EXPLANATIONS_KEY = 'net-cbt:review-explanations';
/** Roughly the height of the sticky site header. */
const HEADER_OFFSET = 64;

const EMPTY_FILTER_TEXT: Readonly<Record<ReviewFilter, { title: string; text: string }>> = {
  all: {
    title: 'No questions to show',
    text: 'This attempt has no questions for the selected subject.',
  },
  correct: {
    title: 'No correct answers here',
    text: 'None of the questions in this view were answered correctly.',
  },
  wrong: {
    title: 'No wrong answers here',
    text: 'Every question you attempted in this view was answered correctly.',
  },
  blank: { title: 'Nothing left unattempted', text: 'You answered every question in this view.' },
  review: {
    title: 'Nothing marked for review',
    text: 'Questions you mark for review during a test are collected here.',
  },
};

/**
 * Writes the review state into the URL without firing `hashchange`. App keys each
 * page on the hash, so `navigate()` would remount the review on every question
 * (reloading the attempt, dropping keyboard focus and resetting the live region).
 * Falls back to `navigate()` where `history` is unavailable.
 */
function replaceUrl(path: string): void {
  const target = href(path);
  if (window.location.hash === target) return;
  try {
    window.history.replaceState(window.history.state, '', target);
  } catch {
    navigate(path, { replace: true });
  }
}

function readExplanationsPreference(): boolean {
  return local.get<boolean>(EXPLANATIONS_KEY) !== false;
}

function isReviewable(record: AttemptRecord | undefined): record is AttemptRecord {
  const questions = record?.session?.paper?.questions;
  return Array.isArray(questions) && questions.length > 0;
}

/** Question-by-question review of an archived attempt: `#/review/<id>?q=&filter=&subject=`. */
export default function ReviewPage({ id, query }: { id: string; query: URLSearchParams }) {
  useEffect(() => {
    document.title = TITLE;
  }, []);

  const attempt = useAttempt(id);

  // While "Try again" is running, show the skeleton rather than the stale error.
  if (attempt.loading && !attempt.data) return <ReviewSkeleton />;
  if (attempt.error) return <LoadError message={attempt.error.message} onRetry={attempt.reload} />;

  const record = attempt.data;
  if (!record) {
    return (
      <MissingAttempt
        title="Attempt not found"
        text={
          isInstalledApp()
            ? 'This attempt is not saved in this app. It may have been deleted, or it was taken on another device.'
            : 'This attempt is not saved in this browser. It may have been deleted, or it was taken on another device or in a private window.'
        }
      />
    );
  }
  if (!isReviewable(record)) {
    return (
      <MissingAttempt
        title="This attempt cannot be reviewed"
        text="Its saved paper is incomplete, so there are no questions to show."
      />
    );
  }
  return <ReviewScreen key={id} id={id} record={record} query={query} />;
}

function ReviewScreen({
  id,
  record,
  query,
}: {
  id: string;
  record: AttemptRecord;
  query: URLSearchParams;
}) {
  const { session, summary } = record;
  const paper = session.paper;
  const model = useMemo(
    () => buildReviewModel(paper, session.questions, session.durationMs),
    [paper, session.questions, session.durationMs],
  );

  // --- view state: initialised from the URL, mirrored back into it ---------------
  const queryKey = query.toString();
  const [view, setView] = useState<ReviewView>(() => parseReviewQuery(query));
  const [seenQuery, setSeenQuery] = useState(queryKey);
  if (seenQuery !== queryKey) {
    setSeenQuery(queryKey);
    setView(parseReviewQuery(query));
  }

  // A hash change back to the URL this page was mounted with does not re-render App
  // (its snapshot is unchanged), so follow such edits here. `newURL` is used because
  // our own replaceUrl() may already have rewritten `location` by the time this runs.
  useEffect(() => {
    const onHashChange = (event: HashChangeEvent) => {
      let hash = window.location.hash;
      try {
        if (event.newURL) hash = new URL(event.newURL).hash;
      } catch {
        // keep location.hash
      }
      const route = parseHash(hash);
      if (route.name === 'review' && route.id === id) setView(parseReviewQuery(route.query));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [id]);

  const subject =
    view.subject !== null && model.subjects.some((s) => s.id === view.subject)
      ? view.subject
      : null;
  const list = useMemo(
    () => filterItems(model.items, view.filter, subject),
    [model.items, view.filter, subject],
  );
  const counts = useMemo(() => countFilters(model.items, subject), [model.items, subject]);
  const position = resolvePosition(list, view.number);
  const item: ReviewItem | undefined = list[position];
  const shownNumber = item?.number ?? view.number;

  useEffect(() => {
    replaceUrl(reviewPath(id, { filter: view.filter, subject, number: shownNumber }));
  }, [id, view.filter, subject, shownNumber]);

  // --- navigation ----------------------------------------------------------------
  const [navigations, setNavigations] = useState(0);
  const go = useCallback((patch: Partial<ReviewView>) => {
    setNavigations((n) => n + 1);
    setView((v) => ({ ...v, ...patch }));
  }, []);

  const step = (delta: 1 | -1) => {
    const target = list[position + delta];
    if (target) go({ number: target.number });
  };

  /** Stay on the current question if the new view lists it, else start at its first. */
  const numberFor = (filter: ReviewFilter, subjectId: string | null): number | null => {
    const next = filterItems(model.items, filter, subjectId);
    if (shownNumber !== null && next.some((it) => it.number === shownNumber)) return shownNumber;
    return next[0]?.number ?? shownNumber;
  };

  const changeFilter = (filter: ReviewFilter) => go({ filter, number: numberFor(filter, subject) });
  const changeSubject = (subjectId: string | null) =>
    go({ subject: subjectId, number: numberFor(view.filter, subjectId) });
  const showEverything = () => go({ filter: 'all', subject: null, number: shownNumber });
  const select = useCallback((number: number) => go({ number }), [go]);

  useReviewShortcuts({ next: () => step(1), previous: () => step(-1) }, list.length > 1);

  // Bring the question into view when navigating from below it (e.g. the grid on phones).
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (navigations === 0) return;
    const card = cardRef.current;
    if (!card || typeof card.scrollIntoView !== 'function') return;
    if (card.getBoundingClientRect().top < HEADER_OFFSET) card.scrollIntoView({ block: 'start' });
  }, [navigations]);

  const [showExplanations, setShowExplanations] = useState(readExplanationsPreference);
  const toggleExplanations = (show: boolean) => {
    setShowExplanations(show);
    local.set(EXPLANATIONS_KEY, show);
  };

  // --- derived display data ----------------------------------------------------------
  const subjectLabel = (id: string) =>
    model.subjects.find((s) => s.id === id)?.title ?? subjectName(id);
  const subjectTitle = subject ? subjectLabel(subject) : null;
  const filterLabel = view.filter === 'all' ? null : FILTER_LABELS[view.filter];
  const scopeLabel = [filterLabel, subjectTitle].filter(Boolean).join(' · ') || null;

  const groups = useMemo<NavigatorGroup[]>(() => {
    const bySection = new Map<number, ReviewItem[]>();
    for (const it of list) {
      const bucket = bySection.get(it.section);
      if (bucket) bucket.push(it);
      else bySection.set(it.section, [it]);
    }
    return [...bySection.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, items]) => {
        const section = model.sections[index];
        return {
          key: String(index),
          title: section?.title ?? 'Questions',
          range: section ? `Q${section.first}–${section.last}` : '',
          items,
        };
      });
  }, [list, model.sections]);

  // The repository must contain `.github/ISSUE_TEMPLATE/wrong-question.yml`.
  const reportHref = useMemo(
    () =>
      item
        ? buildIssueUrl(REPO_URL, {
            paperCode: paper.code,
            bankVersion: paper.bankVersion,
            number: item.number,
            question: item.question,
            saved: item.state.saved,
          })
        : '',
    [item, paper.code, paper.bankVersion],
  );

  const total = model.items.length;
  const correct = summary?.correct ?? model.items.filter((it) => it.outcome === 'correct').length;
  const score = summary?.score ?? correct;
  const maxScore = summary?.maxScore ?? total;
  const percent = summary?.percent ?? (maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0);
  const finishedAt = summary?.finishedAt ?? session.finishedAt ?? session.createdAt;

  const announcement =
    navigations === 0
      ? ''
      : item
        ? `Question ${item.number} of ${total}${scopeLabel ? ` (${position + 1} of ${list.length}, ${scopeLabel})` : ''}. ${outcomeSentence(item)}`
        : `${EMPTY_FILTER_TEXT[view.filter].title}.`;

  const navHeadingId = useId();
  const empty = EMPTY_FILTER_TEXT[view.filter];

  return (
    <div className={ui.page}>
      <PageHeader
        title="Answer review"
        subtitle={
          <span className={styles.subtitle}>
            <span>{paper.title || 'Practice paper'}</span>
            <span className={styles.code}>{paper.code}</span>
            {finishedAt ? <span>{formatDate(finishedAt)}</span> : null}
            <span className={styles.score}>
              Score {score}/{maxScore} ({percent}%)
            </span>
          </span>
        }
        actions={
          <div className={styles.actions}>
            <LinkButton href={href(`/result/${encodeURIComponent(id)}`)}>Back to result</LinkButton>
            <LinkButton href={href('/history')} variant="ghost">
              All attempts
            </LinkButton>
          </div>
        }
      />

      <ReviewToolbar
        filter={view.filter}
        counts={counts}
        onFilter={changeFilter}
        subjects={model.subjects}
        subject={subject}
        onSubject={changeSubject}
        showExplanations={showExplanations}
        onShowExplanations={toggleExplanations}
      />

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          {item ? (
            <ReviewQuestion
              ref={cardRef}
              item={item}
              subjectTitle={subjectLabel(item.question.subject)}
              total={total}
              position={position}
              count={list.length}
              scopeLabel={scopeLabel}
              showExplanations={showExplanations}
              paceMs={model.paceMs}
              paperCode={paper.code}
              reportHref={reportHref}
              onPrevious={() => step(-1)}
              onNext={() => step(1)}
            />
          ) : (
            <Card>
              <EmptyState
                title={empty.title}
                action={
                  <Button variant="primary" onClick={showEverything}>
                    Show all questions
                  </Button>
                }
              >
                {empty.text}
              </EmptyState>
            </Card>
          )}
        </div>

        <div className={styles.aside}>
          <nav className={`${ui.card} ${styles.navCard}`} aria-labelledby={navHeadingId}>
            <h2 id={navHeadingId} className={styles.navTitle}>
              Question navigator{' '}
              <span className={styles.navCount}>
                {list.length === total ? `${total} questions` : `${list.length} of ${total}`}
              </span>
            </h2>
            <ReviewNavigator
              groups={groups}
              current={item?.number ?? null}
              onSelect={select}
              emptyText={empty.title}
            />
            <p className={styles.hint}>
              Move with <kbd>J</kbd> <kbd>K</kbd> or <kbd>←</kbd> <kbd>→</kbd>
            </p>
          </nav>
        </div>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className={ui.page} aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading attempt…
      </p>
      <div aria-hidden="true">
        <span className={`${styles.skeleton} ${styles.skelTitle}`} />
        <span className={`${styles.skeleton} ${styles.skelSubtitle}`} />
      </div>
      <span className={`${styles.skeleton} ${styles.skelChips}`} aria-hidden="true" />
      <div className={styles.layout} aria-hidden="true">
        <div className={ui.card}>
          <span
            className={`${styles.skeleton} ${styles.skelBar}`}
            style={{ width: '40%', marginTop: 0 }}
          />
          <span className={`${styles.skeleton} ${styles.skelBar}`} style={{ width: '95%' }} />
          <span className={`${styles.skeleton} ${styles.skelBar}`} style={{ width: '85%' }} />
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`${styles.skeleton} ${styles.skelBar}`}
              style={{ width: `${70 - i * 8}%`, height: 34 }}
            />
          ))}
        </div>
        <div className={ui.card}>
          <span
            className={`${styles.skeleton} ${styles.skelBar}`}
            style={{ width: '60%', marginTop: 0 }}
          />
          <div className={styles.skelGrid}>
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} className={`${styles.skeleton} ${styles.skelCell}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MissingAttempt({ title, text }: { title: string; text: string }) {
  return (
    <div className={ui.page}>
      <PageHeader title="Answer review" />
      <Card>
        <EmptyState
          title={title}
          action={
            <div className={styles.emptyActions}>
              <LinkButton href={href('/history')} variant="primary">
                View attempt history
              </LinkButton>
              <LinkButton href={href('/new')}>Generate a new paper</LinkButton>
            </div>
          }
        >
          {text}
        </EmptyState>
      </Card>
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={ui.page}>
      <PageHeader title="Answer review" />
      <div role="alert">
        <Callout tone="warning">
          <div className={styles.errorBody}>
            <p>
              <strong>This attempt could not be loaded.</strong> Your browser&rsquo;s storage may be
              blocked or unavailable.
            </p>
            {message ? <p className={styles.errorDetail}>{message}</p> : null}
            <div className={styles.actions}>
              <Button variant="primary" onClick={onRetry}>
                Try again
              </Button>
              <LinkButton href={href('/history')}>Back to history</LinkButton>
            </div>
          </div>
        </Callout>
      </div>
    </div>
  );
}
