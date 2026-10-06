import { useMemo } from 'react';
import type { AttemptSummary } from '@/exam/store';
import { storagePlace } from '@/platform/desktop';
import {
  Badge,
  Button,
  Callout,
  Card,
  formatDate,
  formatDuration,
  LinkButton,
  ProgressBar,
  Stat,
} from '@/ui/components/ui';
import type { AsyncState } from '@/ui/hooks';
import { href } from '@/ui/router';
import {
  attemptName,
  formatChange,
  formatPercent,
  isoDate,
  type ProgressSummary,
  summarizeProgress,
} from './progress';
import { Sparkline } from './Sparkline';
import s from './ProgressSection.module.css';

function Change({ points }: { points: number | null }) {
  if (points === null) return <span>Your first paper</span>;
  const direction = points > 0 ? 'up' : points < 0 ? 'down' : 'flat';
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '▬';
  return (
    <span className={s.change} data-direction={direction}>
      <span className={s.arrow} aria-hidden="true">
        {arrow}
      </span>{' '}
      {formatChange(points)} <span className={s.changeContext}>vs previous</span>
    </span>
  );
}

function AttemptRow({ attempt }: { attempt: AttemptSummary }) {
  const name = attemptName(attempt);
  return (
    <li className={s.attempt}>
      <div className={s.attemptMain}>
        <a className={s.attemptLink} href={href(`/result/${encodeURIComponent(attempt.id)}`)}>
          {name}
          <span className="visually-hidden">
            , {formatDate(attempt.finishedAt)}, scored {formatPercent(attempt.percent)}. View result
          </span>
        </a>
        <div className={s.attemptMeta}>
          <code className={s.code}>{attempt.paperCode}</code>
          <time dateTime={isoDate(attempt.finishedAt)}>{formatDate(attempt.finishedAt)}</time>
          {attempt.mode === 'practice' ? <Badge>Practice</Badge> : null}
          {attempt.finishReason === 'timeout' ? <Badge tone="warning">Timed out</Badge> : null}
        </div>
      </div>
      <div className={s.attemptScore}>
        <div className={s.scoreLine}>
          <span className={s.score}>
            {attempt.score}
            <span className={s.scoreMax}>/{attempt.maxScore}</span>
          </span>
          <span className={s.percent}>{formatPercent(attempt.percent)}</span>
        </div>
        <ProgressBar
          value={attempt.percent}
          label={`${name} score ${formatPercent(attempt.percent)}`}
        />
      </div>
    </li>
  );
}

function ProgressBody({ summary }: { summary: ProgressSummary }) {
  const { best, latest, trend } = summary;
  const trendLabel = `Scores of your last ${trend.length} papers, oldest first: ${trend.map(formatPercent).join(', ')}.`;
  return (
    <>
      <div className={s.kpis}>
        <Stat
          label="Papers taken"
          value={summary.count.toLocaleString()}
          hint={`${summary.examCount} exam · ${summary.practiceCount} practice`}
        />
        <Stat
          label="Best score"
          value={formatPercent(best.percent)}
          hint={`${best.score}/${best.maxScore} · ${attemptName(best)}`}
        />
        <Stat
          label="Average score"
          value={formatPercent(summary.averagePercent)}
          hint={`${formatDuration(summary.totalTimeMs)} practised`}
        />
        <Stat
          label="Latest score"
          value={formatPercent(latest.percent)}
          hint={
            <span className={s.latestHint}>
              <Change points={summary.change} />
              {trend.length >= 2 ? <Sparkline values={trend} label={trendLabel} /> : null}
            </span>
          }
        />
      </div>

      <div className={s.recentHead}>
        <h3 className={s.recentTitle}>Recent attempts</h3>
        {summary.count > summary.recent.length ? (
          <a className={s.viewAll} href={href('/history')}>
            View all {summary.count}
          </a>
        ) : null}
      </div>
      <ol className={s.recent}>
        {summary.recent.map((attempt) => (
          <AttemptRow key={attempt.id} attempt={attempt} />
        ))}
      </ol>
    </>
  );
}

function EmptyProgress() {
  return (
    <div className={s.empty}>
      <h3 className={s.emptyTitle}>No attempts yet</h3>
      <p className={s.emptyText}>
        Your scores and their trend show up here after your first paper.
      </p>
      <LinkButton href={href('/new')}>Generate your first paper</LinkButton>
    </div>
  );
}

/** "Your progress": headline numbers and the latest attempts, or a friendly empty state. */
export function ProgressSection({ attempts }: { attempts: AsyncState<AttemptSummary[]> }) {
  const summary = useMemo(() => summarizeProgress(attempts.data), [attempts.data]);
  const showLinks = Boolean(summary);

  let body;
  if (attempts.error && !attempts.data) {
    body = (
      <Callout tone="warning">
        <p className={s.errorText}>
          Your saved attempts could not be loaded ({attempts.error.message}). They are still stored{' '}
          {storagePlace()}.
        </p>
        <Button size="sm" className={s.retry} onClick={attempts.reload}>
          Try again
        </Button>
      </Callout>
    );
  } else if (attempts.loading && !attempts.data) {
    body = (
      <p className={s.loading} role="status">
        Loading your attempts…
      </p>
    );
  } else if (summary) {
    body = <ProgressBody summary={summary} />;
  } else {
    body = <EmptyProgress />;
  }

  return (
    <Card
      title="Your progress"
      className={s.card}
      action={
        showLinks ? (
          <nav className={s.links} aria-label="Progress pages">
            <a href={href('/history')}>History</a>
            <a href={href('/analytics')}>Analytics</a>
          </nav>
        ) : undefined
      }
    >
      {body}
    </Card>
  );
}
