import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { BarChart, Donut, LineChart, type LineSeries } from '@/ui/components/charts';
import {
  Button,
  Callout,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Segmented,
  Stat,
  formatDuration,
  ui,
} from '@/ui/components/ui';
import { useAsync } from '@/ui/hooks';
import { href } from '@/ui/router';
import { ChapterMastery } from './analytics/ChapterMastery';
import { FocusChapters } from './analytics/FocusChapters';
import {
  examTypeName,
  examTypeOptions,
  formatPercent,
  formatSeconds,
  plural,
} from './analytics/format';
import { loadAttemptDigests } from './analytics/load';
import {
  type AnalyticsFilters,
  type AttemptDigest,
  applyFilters,
  buildAnalytics,
  computeStreak,
  DEFAULT_FILTERS,
  type ModeFilter,
  NET_SECONDS_PER_QUESTION,
  type RangeFilter,
} from './analytics/model';
import s from './analytics/analytics.module.css';

const TITLE = 'Analytics · NET CBT Simulator';

const MODE_OPTIONS: ReadonlyArray<{ value: ModeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'exam', label: 'Exam' },
  { value: 'practice', label: 'Practice' },
];

const RANGE_OPTIONS: ReadonlyArray<{ value: RangeFilter; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 'last10', label: 'Last 10' },
  { value: 'last5', label: 'Last 5' },
];

const shortDate = (epoch: number) =>
  new Date(epoch).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** One line per exam type; x is the attempt's position in the filtered (chronological) list. */
function trendSeries(attempts: readonly AttemptDigest[]): LineSeries[] {
  const groups = new Map<string, LineSeries & { points: Array<LineSeries['points'][number]> }>();
  attempts.forEach((a, i) => {
    let group = groups.get(a.examType);
    if (!group) {
      group = { id: a.examType, label: examTypeName(a.examType), points: [] };
      groups.set(a.examType, group);
    }
    group.points.push({
      x: i + 1,
      y: a.percent,
      label: `${shortDate(a.finishedAt)} · ${a.title} (${a.mode})`,
    });
  });
  return [...groups.values()];
}

function trendDescription(attempts: readonly AttemptDigest[]): string {
  if (!attempts.length) return 'No attempts.';
  const first = attempts[0];
  const last = attempts.at(-1);
  if (!first || !last) return 'No attempts.';
  if (attempts.length === 1) return `One attempt so far, scoring ${formatPercent(first.percent)}.`;
  const diff = Math.round((last.percent - first.percent) * 10) / 10;
  const direction =
    diff > 0 ? `up ${diff} points` : diff < 0 ? `down ${Math.abs(diff)} points` : 'unchanged';
  const best = Math.max(...attempts.map((a) => a.percent));
  return `Score over ${attempts.length} attempts: ${formatPercent(first.percent)} in the first and ${formatPercent(
    last.percent,
  )} in the latest (${direction}); best ${formatPercent(best)}.`;
}

/** Warns that some archived attempts were skipped (missing record or data that cannot be scored). */
function UnreadableNotice({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Callout tone="warning">
      {plural(count, 'saved attempt')} could not be read and {count === 1 ? 'was' : 'were'} skipped.
    </Callout>
  );
}

export default function AnalyticsPage() {
  const { data, error, loading, reload } = useAsync(loadAttemptDigests, []);
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const examId = useId();
  const examSelect = useRef<HTMLSelectElement>(null);
  const focusExamSelect = useRef(false);

  useEffect(() => {
    document.title = TITLE;
  }, []);

  const digests = useMemo(() => data?.digests ?? [], [data]);
  const typeOptions = useMemo(() => examTypeOptions(digests), [digests]);
  const examType =
    filters.examType !== 'all' && typeOptions.some((o) => o.id === filters.examType)
      ? filters.examType
      : 'all';
  const effective = useMemo(() => ({ ...filters, examType }), [filters, examType]);
  const filtered = useMemo(() => applyFilters(digests, effective), [digests, effective]);
  const analytics = useMemo(() => buildAnalytics(filtered), [filtered]);
  // A habit measure: counts every finished paper, whatever the filters show.
  const streak = useMemo(
    () =>
      computeStreak(
        digests.map((d) => d.finishedAt),
        Date.now(),
      ),
    [digests],
  );
  const filtersActive =
    effective.examType !== 'all' || effective.mode !== 'all' || effective.range !== 'all';

  // "Reset filters" disappears once it has worked: hand focus to the first filter.
  useEffect(() => {
    if (focusExamSelect.current && filtered.length > 0) {
      focusExamSelect.current = false;
      examSelect.current?.focus();
    }
  }, [filtered.length]);

  const resetFilters = () => {
    focusExamSelect.current = true;
    setFilters(DEFAULT_FILTERS);
  };

  const header = (
    <PageHeader
      title="Analytics"
      subtitle="Your performance across every finished paper on this device: score trend, subject and chapter strengths, pacing and what to practise next."
      actions={
        digests.length ? <LinkButton href={href('/history')}>All attempts</LinkButton> : null
      }
    />
  );

  if (loading && !data) {
    return (
      <div className={ui.page}>
        {header}
        <p role="status" aria-live="polite" className={ui.muted}>
          Crunching your attempts…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={ui.page}>
        {header}
        <Card>
          <div role="alert" className={ui.stack}>
            <h2 className={s.errorTitle}>Could not load your attempts</h2>
            <p className={ui.muted}>{error.message}</p>
            <div>
              <Button variant="primary" onClick={reload}>
                Try again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!digests.length) {
    return (
      <div className={ui.page}>
        {header}
        <Card>
          <EmptyState
            title="No analytics yet"
            action={
              <div className={s.emptyActions}>
                <LinkButton variant="primary" href={href('/new')}>
                  Start a paper
                </LinkButton>
                <LinkButton href={href('/history')}>Import history</LinkButton>
              </div>
            }
          >
            Finish a full-length paper or a practice test and this page will chart your scores, rate
            every chapter and recommend what to practise next.
          </EmptyState>
        </Card>
        <UnreadableNotice count={data?.unreadable ?? 0} />
      </div>
    );
  }

  const { totals, subjects, difficulty } = analytics;
  const latest = filtered.at(-1);
  const series = trendSeries(filtered);
  const maxSeconds = Math.max(
    NET_SECONDS_PER_QUESTION * 2,
    ...subjects.map((x) => (x.secondsPerQuestion ?? 0) * 1.1),
  );

  return (
    <div className={ui.page}>
      {header}

      <section className={`${ui.card} ${s.filters}`} aria-label="Filters">
        <div className={s.filterField}>
          <label htmlFor={examId} className={s.filterLabel}>
            Exam type
          </label>
          <select
            ref={examSelect}
            id={examId}
            className={ui.select}
            value={examType}
            onChange={(e) => setFilters((f) => ({ ...f, examType: e.target.value }))}
          >
            <option value="all">All papers ({digests.length})</option>
            {typeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} ({o.count})
              </option>
            ))}
          </select>
        </div>
        <div className={s.filterField}>
          <span className={s.filterLabel} aria-hidden="true">
            Mode
          </span>
          <Segmented
            label="Mode"
            value={filters.mode}
            options={MODE_OPTIONS}
            onChange={(mode) => setFilters((f) => ({ ...f, mode }))}
          />
        </div>
        <div className={s.filterField}>
          <span className={s.filterLabel} aria-hidden="true">
            Range
          </span>
          <Segmented
            label="Range"
            value={filters.range}
            options={RANGE_OPTIONS}
            onChange={(range) => setFilters((f) => ({ ...f, range }))}
          />
        </div>
        <p className={s.filterSummary} role="status" aria-live="polite">
          Showing {plural(filtered.length, 'attempt')}
          {filtersActive ? ` of ${digests.length}` : ''}.
        </p>
      </section>

      <UnreadableNotice count={data?.unreadable ?? 0} />

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No attempts match these filters"
            action={
              <Button variant="primary" onClick={resetFilters}>
                Reset filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <section className={`${ui.card} ${s.stats}`} aria-label="Summary">
            <Stat
              label="Attempts"
              value={totals.attempts.toLocaleString()}
              hint={`${totals.exam} exam · ${totals.practice} practice`}
            />
            <Stat
              label="Average score"
              value={totals.averagePercent === null ? '—' : formatPercent(totals.averagePercent)}
              hint={
                totals.bestPercent === null
                  ? undefined
                  : `Best ${formatPercent(totals.bestPercent)}`
              }
            />
            <Stat
              label="Latest"
              value={totals.latestPercent === null ? '—' : formatPercent(totals.latestPercent)}
              hint={latest ? shortDate(latest.finishedAt) : undefined}
            />
            <Stat
              label="Questions answered"
              value={totals.answered.toLocaleString()}
              hint={`of ${plural(totals.questions, 'question')} in these papers`}
            />
            <Stat
              label="Accuracy"
              value={totals.accuracy === null ? '—' : formatPercent(totals.accuracy)}
              hint={`${totals.correct.toLocaleString()} correct`}
            />
            <Stat
              label="Streak"
              value={plural(streak.current, 'day')}
              hint={
                streak.current > 0 && !streak.today
                  ? `Finish a paper today to keep it · longest ${plural(streak.longest, 'day')}`
                  : `Longest ${plural(streak.longest, 'day')} · all papers`
              }
            />
            <Stat label="Time practised" value={formatDuration(totals.timeMs)} />
          </section>

          <Card title="Score trend">
            <LineChart
              title="Score trend"
              description={trendDescription(filtered)}
              series={series}
              formatX={(x) => `#${x}`}
              formatY={formatPercent}
              xLabel="Attempt"
              yLabel="Score (%)"
            />
          </Card>

          <div className={ui.grid2}>
            <FocusChapters focus={analytics.focus} rated={analytics.rated} />

            <Card title="Subject accuracy">
              <BarChart
                title="Accuracy by subject"
                data={subjects.map((x) => ({
                  key: x.subject,
                  label: x.name,
                  text: x.name,
                  value: x.accuracy,
                  display: x.accuracy === null ? '—' : formatPercent(x.accuracy),
                  hint: `${x.correct.toLocaleString()} of ${x.attempted.toLocaleString()} answered correctly · ${x.unattempted.toLocaleString()} left blank`,
                }))}
              />
            </Card>

            <Card title="By difficulty">
              <div className={s.difficulty}>
                <Donut
                  title="Answer outcomes"
                  centre={totals.accuracy === null ? '—' : formatPercent(totals.accuracy)}
                  centreHint="accuracy"
                  slices={[
                    {
                      key: 'correct',
                      label: 'Correct',
                      value: totals.correct,
                      color: 'var(--success)',
                    },
                    { key: 'wrong', label: 'Wrong', value: totals.wrong, color: 'var(--danger)' },
                    {
                      key: 'blank',
                      label: 'Left blank',
                      value: totals.unanswered,
                      color: 'var(--border-strong)',
                    },
                  ]}
                />
                <BarChart
                  title="Accuracy by difficulty"
                  data={difficulty
                    .filter((d) => d.total > 0)
                    .map((d) => ({
                      key: String(d.level),
                      label: d.label,
                      text: d.label,
                      value: d.accuracy,
                      display: d.accuracy === null ? '—' : formatPercent(d.accuracy),
                      hint: `${d.correct.toLocaleString()} of ${d.attempted.toLocaleString()} answered correctly · ${plural(d.total, 'question')}`,
                    }))}
                />
              </div>
            </Card>

            <Card title="Time per question">
              <BarChart
                title="Average time per question by subject"
                scale="neutral"
                max={maxSeconds}
                marker={{
                  value: NET_SECONDS_PER_QUESTION,
                  label: `NET pace: ${formatSeconds(NET_SECONDS_PER_QUESTION)} per question (180 min / 200)`,
                }}
                data={subjects.map((x) => {
                  const sec = x.secondsPerQuestion;
                  return {
                    key: x.subject,
                    label: x.name,
                    text: x.name,
                    value: sec,
                    display: sec === null ? '—' : formatSeconds(sec),
                    color:
                      sec !== null && sec > NET_SECONDS_PER_QUESTION
                        ? 'var(--warning)'
                        : 'var(--primary)',
                    hint:
                      sec === null
                        ? 'No questions opened'
                        : sec > NET_SECONDS_PER_QUESTION
                          ? `Slower than NET pace · ${plural(x.visited, 'question')} opened`
                          : `Within NET pace · ${plural(x.visited, 'question')} opened`,
                  };
                })}
              />
            </Card>
          </div>

          <ChapterMastery chapters={analytics.chapters} />
        </>
      )}
    </div>
  );
}
