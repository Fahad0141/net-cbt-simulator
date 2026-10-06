import { Card } from '@/ui/components/ui';
import { DIFFICULTY_LABELS, difficultyInsight, type ResultModel } from './analysis';
import { formatPercent, plural } from './format';
import { OutcomeBar } from './OutcomeBar';
import s from './result.module.css';

const LEVELS = [1, 2, 3] as const;

/** Accuracy on easy / medium / hard questions. */
export function DifficultyBreakdown({ model }: { model: ResultModel }) {
  const { byDifficulty } = model.report;
  const insight = difficultyInsight(byDifficulty);

  return (
    <Card className={s.cq} title="Difficulty breakdown">
      <ul className={s.levelList}>
        {LEVELS.map((level) => {
          const t = byDifficulty[level];
          return (
            <li key={level} className={s.levelItem}>
              <div className={s.levelHead}>
                <span className={s.levelName}>{DIFFICULTY_LABELS[level]}</span>
                <span className={s.muted}>{plural(t.total, 'question')}</span>
              </div>
              {t.total ? (
                <>
                  <OutcomeBar correct={t.correct} wrong={t.wrong} unattempted={t.unattempted} />
                  <div className={s.levelStats}>
                    <span>
                      <strong>
                        {t.correct}/{t.total}
                      </strong>{' '}
                      correct
                    </span>
                    <span>
                      <strong>{t.attempted ? formatPercent(t.accuracy) : '—'}</strong> accuracy
                    </span>
                  </div>
                </>
              ) : (
                <p className={s.levelEmpty}>
                  No {DIFFICULTY_LABELS[level].toLowerCase()} questions in this paper.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {insight ? <p className={s.insight}>{insight}</p> : null}
    </Card>
  );
}
