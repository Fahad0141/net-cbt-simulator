import { useId } from 'react';
import { Badge, Card, formatDuration } from '@/ui/components/ui';
import { href } from '@/ui/router';
import { type Outcome, paceInsight, type ResultModel, reviewPath } from './analysis';
import { formatPaceDelta, formatPercent, formatQuestionTime, plural } from './format';
import s from './result.module.css';

const OUTCOME_BADGE: Record<Outcome, { tone: 'success' | 'danger' | 'neutral'; label: string }> = {
  correct: { tone: 'success', label: 'Correct' },
  wrong: { tone: 'danger', label: 'Wrong' },
  blank: { tone: 'neutral', label: 'Unattempted' },
};

/** Pacing: time used, average per question by subject, and the slowest questions. */
export function TimeAnalysis({ model }: { model: ResultModel }) {
  const paceHeadingId = useId();
  const slowHeadingId = useId();
  const { timing, subjects, slowest } = model;
  const totalQuestions = model.report.overall.total;
  const scaleMax = Math.max(timing.paceMs, ...subjects.map((sub) => sub.avgMs), 1) * 1.15;
  const pacePosition = (timing.paceMs / scaleMax) * 100;

  return (
    <Card className={s.cq} title="Time analysis">
      <dl className={s.miniStats}>
        <div className={s.miniStat}>
          <dt>Time used</dt>
          <dd className={s.miniValue}>{formatDuration(timing.usedMs)}</dd>
          <dd className={s.miniHint}>of {formatDuration(timing.allowedMs)} allowed</dd>
        </div>
        <div className={s.miniStat}>
          <dt>Average per question</dt>
          <dd className={s.miniValue}>{formatQuestionTime(timing.avgMs)}</dd>
          <dd className={s.miniHint}>target pace {formatQuestionTime(timing.paceMs)}</dd>
        </div>
        <div className={s.miniStat}>
          <dt>Per attempted question</dt>
          <dd className={s.miniValue}>
            {model.report.overall.attempted ? formatQuestionTime(timing.avgAttemptedMs) : '—'}
          </dd>
          <dd className={s.miniHint}>{plural(model.report.overall.attempted, 'answer')}</dd>
        </div>
        <div className={s.miniStat}>
          <dt>Never opened</dt>
          <dd className={s.miniValue}>{timing.unvisited}</dd>
          <dd className={s.miniHint}>of {plural(totalQuestions, 'question')}</dd>
        </div>
      </dl>

      <p className={s.insight}>{paceInsight(timing, model.report.overall.unattempted)}</p>

      {subjects.length ? (
        <section className={s.subsection} aria-labelledby={paceHeadingId}>
          <h3 id={paceHeadingId} className={s.subTitle}>
            Average time per question by subject
          </h3>
          <ul className={s.paceList}>
            {subjects.map((sub, i) => (
              <li key={`${sub.subject}-${i}`} className={s.paceRow}>
                <span className={s.paceName}>{sub.title}</span>
                <span className={s.paceTrack} aria-hidden="true">
                  <span
                    className={s.paceBar}
                    style={{ width: `${Math.min(100, (sub.avgMs / scaleMax) * 100)}%` }}
                  />
                  {timing.paceMs > 0 ? (
                    <span className={s.paceMarker} style={{ left: `${pacePosition}%` }} />
                  ) : null}
                </span>
                <span className={s.paceValue}>
                  <strong>{formatQuestionTime(sub.avgMs)}</strong>
                  <span className={s.paceDelta}>
                    {timing.paceMs > 0 ? formatPaceDelta(sub.avgMs, timing.paceMs) : ''}
                    {' · '}
                    {formatPercent(sub.timeShare, 0)} of time
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {timing.paceMs > 0 ? (
            <p className={s.paceKey}>
              <span className={s.paceKeyMark} aria-hidden="true" />
              Target pace: {formatQuestionTime(timing.paceMs)} per question (
              {formatDuration(timing.allowedMs)} for {plural(totalQuestions, 'question')})
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={s.subsection} aria-labelledby={slowHeadingId}>
        <h3 id={slowHeadingId} className={s.subTitle}>
          Slowest questions
        </h3>
        {slowest.length ? (
          <ol className={s.slowList}>
            {slowest.map((q) => {
              const badge = OUTCOME_BADGE[q.outcome];
              return (
                <li key={q.index} className={s.slowItem}>
                  <a className={s.slowLink} href={href(reviewPath(model.id, q.number))}>
                    Question {q.number}
                  </a>
                  <span className={s.slowMeta}>
                    {q.subjectTitle} &middot; {q.chapterName}
                  </span>
                  <span className={s.slowTime}>{formatQuestionTime(q.timeMs)}</span>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={s.muted}>No time was recorded on individual questions.</p>
        )}
      </section>
    </Card>
  );
}
