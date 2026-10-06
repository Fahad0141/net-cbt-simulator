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
      <div className={s.heroGrid}>
        <div className={s.scoreBlock}>
          <span className={s.scoreLabel}>Your score</span>
          <p className={s.scoreLine}>
            <span className={s.scoreValue}>{overall.score}</span>
            <span className={s.scoreMax}>
              <span aria-hidden="true">/</span>
              <span className="visually-hidden">out of</span> {overall.maxScore}
            </span>
          </p>
          <p className={s.scorePercent}>{formatPercent(overall.percent)}</p>
        </div>

        <div className={s.heroDetail}>
          <div className={s.heroBar}>
            <OutcomeBar {...counts} size="lg" label={outcomeLabel(counts)} />
            <OutcomeLegend counts={counts} />
          </div>

          <dl className={s.kpis}>
            <div className={s.kpi}>
              <dt>Accuracy</dt>
              <dd className={s.kpiValue}>
                {overall.attempted ? formatPercent(overall.accuracy) : '—'}
              </dd>
            </div>
            <div className={s.kpi}>
              <dt>Attempted</dt>
              <dd className={s.kpiValue}>{overall.attempted}</dd>
              <dd className={s.kpiHint}>of {overall.total} questions</dd>
            </div>
            <div className={s.kpi}>
              <dt>Time used</dt>
              <dd className={s.kpiValue}>{formatDuration(timing.usedMs)}</dd>
              <dd className={s.kpiHint}>
                of {formatDuration(timing.allowedMs)}
                {timing.timedOut ? ', time up' : ''}
              </dd>
              <dd className={s.kpiMeter}>
                <ProgressBar
                  value={usedPercent}
                  label={`Time used: ${formatPercent(usedPercent, 0)} of the allowed time`}
                />
              </dd>
            </div>
          </dl>

          <p className={s.heroNote}>{blankInsight(overall.unattempted)}</p>
        </div>
      </div>
    </section>
  );
}
