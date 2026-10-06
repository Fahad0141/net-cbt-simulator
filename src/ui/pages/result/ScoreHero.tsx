import { useId } from 'react';
import { formatDuration, ProgressBar, ui } from '@/ui/components/ui';
import { blankInsight, type ResultModel } from './analysis';
import { formatPercent, outcomeLabel } from './format';
import { OutcomeBar, OutcomeLegend } from './OutcomeBar';
import s from './result.module.css';

/** The headline: score, percentage, answer counts, accuracy and time. */
export function ScoreHero({ model }: { model: ResultModel }) {
  const headingId = useId();
  const { overall } = model.report;
  const { timing } = model;
  const usedPercent = timing.allowedMs ? (timing.usedMs / timing.allowedMs) * 100 : 0;
  const counts = {
    correct: overall.correct,
    wrong: overall.wrong,
    unattempted: overall.unattempted,
  };

  return (
    <section className={`${ui.card} ${s.hero}`} aria-labelledby={headingId}>
      <h2 id={headingId} className="visually-hidden">
        Score summary
      </h2>
      <div className={s.heroTop}>
        <div className={s.scoreBlock}>
          <span className={s.scoreLabel}>Your score</span>
          <p className={s.scoreLine}>
            <span className={s.scoreValue}>{overall.score}</span>
            <span className={s.scoreMax}>
              <span aria-hidden="true">/</span>
              <span className="visually-hidden">out of</span> {overall.maxScore}
            </span>
          </p>
          <p className={s.scorePercent}>
            <strong>{formatPercent(overall.percent)}</strong> of total marks
          </p>
        </div>

        <dl className={s.kpis}>
          <div className={s.kpi}>
            <dt>Attempted</dt>
            <dd className={s.kpiValue}>{overall.attempted}</dd>
            <dd className={s.kpiHint}>of {overall.total} questions</dd>
          </div>
          <div className={s.kpi}>
            <dt>Correct</dt>
            <dd className={s.kpiValue}>{overall.correct}</dd>
            <dd className={s.kpiHint}>+1 mark each</dd>
          </div>
          <div className={s.kpi}>
            <dt>Wrong</dt>
            <dd className={s.kpiValue}>{overall.wrong}</dd>
            <dd className={s.kpiHint}>no marks deducted</dd>
          </div>
          <div className={s.kpi}>
            <dt>Unattempted</dt>
            <dd className={s.kpiValue}>{overall.unattempted}</dd>
            <dd className={s.kpiHint}>marks lost</dd>
          </div>
          <div className={s.kpi}>
            <dt>Accuracy</dt>
            <dd className={s.kpiValue}>
              {overall.attempted ? formatPercent(overall.accuracy) : '—'}
            </dd>
            <dd className={s.kpiHint}>correct &divide; attempted</dd>
          </div>
          <div className={s.kpi}>
            <dt>Time used</dt>
            <dd className={s.kpiValue}>{formatDuration(timing.usedMs)}</dd>
            <dd className={s.kpiHint}>
              of {formatDuration(timing.allowedMs)}
              {timing.timedOut
                ? ' · time up'
                : timing.remainingMs >= 1000
                  ? ` · ${formatDuration(timing.remainingMs)} left`
                  : ''}
            </dd>
            <dd className={s.kpiMeter}>
              <ProgressBar
                value={usedPercent}
                label={`Time used: ${formatPercent(usedPercent, 0)} of the allowed time`}
                color="var(--primary)"
              />
            </dd>
          </div>
        </dl>
      </div>

      <div className={s.heroBar}>
        <OutcomeBar {...counts} size="lg" label={outcomeLabel(counts)} />
        <OutcomeLegend counts={counts} />
      </div>

      <p className={s.heroNote}>
        <span className={s.noteIcon} aria-hidden="true">
          i
        </span>
        <span>{blankInsight(overall.unattempted)}</span>
      </p>
    </section>
  );
}
