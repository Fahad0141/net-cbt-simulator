import { useId } from 'react';
import { ui } from '@/ui/components/ui';
import { FILTER_LABELS, REVIEW_FILTERS, type ReviewFilter } from './model';
import s from './review.module.css';

const DOT_CLASS: Readonly<Record<ReviewFilter, string | undefined>> = {
  all: s.dotAll,
  correct: s.dotCorrect,
  wrong: s.dotWrong,
  blank: s.dotBlank,
  review: s.dotReview,
};

interface ReviewToolbarProps {
  filter: ReviewFilter;
  counts: Readonly<Record<ReviewFilter, number>>;
  onFilter: (filter: ReviewFilter) => void;
  subjects: ReadonlyArray<{ id: string; title: string }>;
  subject: string | null;
  onSubject: (subject: string | null) => void;
  showExplanations: boolean;
  onShowExplanations: (show: boolean) => void;
}

/** Outcome filters (native radios styled as chips), subject filter and the explanations switch. */
export function ReviewToolbar({
  filter,
  counts,
  onFilter,
  subjects,
  subject,
  onSubject,
  showExplanations,
  onShowExplanations,
}: ReviewToolbarProps) {
  const name = useId();
  const subjectId = useId();
  return (
    <section className={`${ui.card} ${s.toolbar}`} aria-label="Review filters">
      <fieldset className={s.filters}>
        <legend className="visually-hidden">Show questions</legend>
        {REVIEW_FILTERS.map((value) => (
          <label key={value} className={s.chip}>
            <input
              type="radio"
              name={name}
              value={value}
              checked={filter === value}
              onChange={() => onFilter(value)}
            />
            <span className={s.chipBody}>
              <span className={`${s.dot} ${DOT_CLASS[value] ?? ''}`} aria-hidden="true" />
              {FILTER_LABELS[value]}{' '}
              <span className={s.count}>
                {counts[value]}
                <span className="visually-hidden">
                  {' '}
                  {counts[value] === 1 ? 'question' : 'questions'}
                </span>
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={s.toolbarControls}>
        {subjects.length > 1 ? (
          <div className={s.subjectField}>
            <label className={s.subjectLabel} htmlFor={subjectId}>
              Subject
            </label>
            <select
              id={subjectId}
              className={`${ui.select} ${s.subjectSelect}`}
              value={subject ?? ''}
              onChange={(event) => onSubject(event.target.value || null)}
            >
              <option value="">All subjects</option>
              {subjects.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <label className={s.switch}>
          <input
            type="checkbox"
            role="switch"
            checked={showExplanations}
            onChange={(event) => onShowExplanations(event.target.checked)}
          />
          <span>Show explanations</span>
        </label>
      </div>
    </section>
  );
}
