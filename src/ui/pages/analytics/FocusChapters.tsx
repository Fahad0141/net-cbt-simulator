import { Card, LinkButton, ui } from '@/ui/components/ui';
import { href } from '@/ui/router';
import { formatPercent, plural } from './format';
import {
  type ChapterInsight,
  DRILL_QUESTIONS,
  drillPath,
  MIN_QUESTIONS_FOR_RATING,
  PRACTICE_PER_CHAPTER,
  practicePath,
  practiceSpec,
} from './model';
import s from './analytics.module.css';

/** "Weakest chapters" recommendations with one-click custom practice tests. */
export function FocusChapters({
  focus,
  rated,
}: {
  focus: readonly ChapterInsight[];
  rated: number;
}) {
  const spec = practiceSpec(focus, PRACTICE_PER_CHAPTER);
  const questions = spec ? spec.sections.reduce((sum, sec) => sum + sec.count, 0) : 0;

  return (
    <Card title="Weakest chapters" className={s.focusCard}>
      {focus.length === 0 ? (
        <p className={ui.muted}>
          {rated === 0
            ? `A chapter is rated once you have seen ${MIN_QUESTIONS_FOR_RATING} of its questions. Finish another paper to see recommendations.`
            : 'Every rated chapter is strong. Try a harder paper next.'}
        </p>
      ) : (
        <>
          <ol className={s.focusList}>
            {focus.map((c, i) => {
              const drill = drillPath(c);
              return (
                <li key={c.key} className={s.focusItem}>
                  <span className={s.focusRank} aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className={s.focusBody}>
                    <div className={s.focusName}>{c.name}</div>
                    <div className={s.focusMeta}>
                      <span>{c.subjectName}</span>
                      <span>
                        {c.correct.toLocaleString()} of {c.seen.toLocaleString()} right
                      </span>
                    </div>
                  </div>
                  {c.accuracy !== null ? (
                    <span className={s.focusScore}>
                      {formatPercent(c.accuracy)}
                      <span className="visually-hidden"> accuracy</span>
                    </span>
                  ) : null}
                  {drill ? (
                    <LinkButton
                      size="sm"
                      className={s.focusDrill}
                      href={href(drill)}
                      aria-label={`Drill ${c.name}: ${DRILL_QUESTIONS} questions`}
                    >
                      Drill
                    </LinkButton>
                  ) : (
                    <span className={`${ui.muted} ${ui.small}`}>No longer in the syllabus</span>
                  )}
                </li>
              );
            })}
          </ol>
          {spec ? (
            <div className={s.focusAction}>
              <LinkButton variant="primary" href={href(practicePath(spec))}>
                Start practice test on these chapters
              </LinkButton>
              <span className={`${ui.muted} ${ui.small}`}>
                {plural(questions, 'question')} in {spec.durationMinutes} min
              </span>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
