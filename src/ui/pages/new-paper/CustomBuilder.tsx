import { SYLLABUS } from '@/config/syllabus';
import { SUBJECT_IDS, type SubjectId } from '@/engine/types';
import { Button, ui } from '@/ui/components/ui';
import {
  type CustomAction,
  type CustomDraft,
  type CustomErrors,
  chapterIds,
  draftTotal,
  formatMinutes,
  LIMITS,
  type SectionDraft,
  type SectionErrors,
  suggestedDuration,
} from './model';
import styles from '../NewPaperPage.module.css';

function SectionEditor({
  section,
  position,
  usedElsewhere,
  canRemove,
  errors,
  dispatch,
}: {
  section: SectionDraft;
  position: number;
  usedElsewhere: ReadonlySet<SubjectId>;
  canRemove: boolean;
  errors: SectionErrors | undefined;
  dispatch: (action: CustomAction) => void;
}) {
  const id = `custom-${section.key}`;
  const subject = SYLLABUS[section.subject];
  const all = chapterIds(section.subject);
  const selected = new Set(section.chapters);
  const countError = errors?.count;
  const chapterError = errors?.chapters;
  const chapterSummary =
    section.chapters.length === all.length
      ? `Chapters: all ${all.length}`
      : `Chapters: ${section.chapters.length} of ${all.length} selected`;

  return (
    <li className={styles.sectionItem} aria-labelledby={`${id}-label`}>
      <div className={styles.sectionHead}>
        <span id={`${id}-label`} className={styles.sectionLabel}>
          Section {position} · {subject.name}
        </span>
        {canRemove ? (
          <Button
            size="sm"
            className={styles.tap}
            variant="ghost"
            onClick={() => dispatch({ kind: 'removeSection', key: section.key })}
            aria-label={`Remove section ${position} (${subject.name})`}
          >
            Remove
          </Button>
        ) : null}
      </div>
      <div className={styles.sectionFields}>
        <div className={ui.field}>
          <label className={ui.fieldLabel} htmlFor={`${id}-subject`}>
            Subject
          </label>
          <select
            id={`${id}-subject`}
            className={ui.select}
            value={section.subject}
            onChange={(e) =>
              dispatch({
                kind: 'sectionSubject',
                key: section.key,
                subject: e.target.value as SubjectId,
              })
            }
          >
            {SUBJECT_IDS.map((sid) => (
              <option key={sid} value={sid} disabled={usedElsewhere.has(sid)}>
                {SYLLABUS[sid].name}
              </option>
            ))}
          </select>
        </div>
        <div className={ui.field}>
          <label className={ui.fieldLabel} htmlFor={`${id}-count`}>
            Questions
          </label>
          <input
            id={`${id}-count`}
            className={`${ui.input} ${styles.numberInput}`}
            type="number"
            inputMode="numeric"
            min={LIMITS.sectionMin}
            max={LIMITS.sectionMax}
            step={1}
            value={section.count}
            aria-invalid={countError ? true : undefined}
            aria-describedby={countError ? `${id}-count-error` : undefined}
            onChange={(e) =>
              dispatch({ kind: 'sectionCount', key: section.key, value: e.target.value })
            }
          />
        </div>
      </div>
      {countError ? (
        <p id={`${id}-count-error`} className={styles.error}>
          {countError}
        </p>
      ) : null}
      <details className={styles.chapters}>
        <summary
          className={styles.chaptersSummary}
          data-invalid={chapterError ? '' : undefined}
          aria-describedby={chapterError ? `${id}-chapters-error` : undefined}
        >
          {chapterSummary}
        </summary>
        <div className={styles.chapterTools}>
          <Button
            size="sm"
            className={styles.tap}
            onClick={() => dispatch({ kind: 'sectionChapters', key: section.key, chapters: all })}
            disabled={section.chapters.length === all.length}
          >
            Select all
          </Button>
          <Button
            size="sm"
            className={styles.tap}
            onClick={() => dispatch({ kind: 'sectionChapters', key: section.key, chapters: [] })}
            disabled={section.chapters.length === 0}
          >
            Clear
          </Button>
        </div>
        <fieldset
          className={styles.chapterGrid}
          aria-invalid={chapterError ? true : undefined}
          aria-describedby={chapterError ? `${id}-chapters-error` : undefined}
        >
          <legend className="visually-hidden">{subject.name} chapters</legend>
          {subject.chapters.map((c) => (
            <label key={c.id} className={styles.check}>
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={(e) =>
                  dispatch({
                    kind: 'toggleChapter',
                    key: section.key,
                    chapter: c.id,
                    checked: e.target.checked,
                  })
                }
              />
              <span>
                {c.name}
                {c.part !== '-' ? (
                  <span className={styles.part}>{c.part === 'XI' ? 'Part I' : 'Part II'}</span>
                ) : null}
              </span>
            </label>
          ))}
        </fieldset>
      </details>
      {chapterError ? (
        <p id={`${id}-chapters-error`} className={styles.error}>
          {chapterError}
        </p>
      ) : null}
    </li>
  );
}

/** Builder for a custom test: sections, chapters, duration and title. */
export function CustomBuilder({
  draft,
  errors,
  dispatch,
}: {
  draft: CustomDraft;
  /** Validation problems to show (undefined until the candidate tries to generate). */
  errors: CustomErrors | undefined;
  dispatch: (action: CustomAction) => void;
}) {
  const total = draftTotal(draft);
  const suggested = suggestedDuration(total);
  const used = draft.sections.map((s) => s.subject);
  const allUsed = SUBJECT_IDS.every((sid) => used.includes(sid));
  const over = total > LIMITS.totalMax;

  return (
    <div className={styles.builder}>
      <div className={styles.builderHead}>
        <h3>Build your test</h3>
        <p>
          Pick subjects and, optionally, the chapters to draw from. {LIMITS.sectionMin}–
          {LIMITS.sectionMax} questions per section, up to {LIMITS.totalMax} in total.
        </p>
      </div>

      <ol className={styles.sectionList} aria-label="Sections">
        {draft.sections.map((section, i) => (
          <SectionEditor
            key={section.key}
            section={section}
            position={i + 1}
            usedElsewhere={new Set(used.filter((_, j) => j !== i))}
            canRemove={draft.sections.length > 1}
            errors={errors?.sections[section.key]}
            dispatch={dispatch}
          />
        ))}
      </ol>
      {errors?.empty ? <p className={styles.error}>{errors.empty}</p> : null}

      <div className={styles.builderFoot}>
        <Button
          size="sm"
          className={styles.tap}
          onClick={() => dispatch({ kind: 'addSection' })}
          disabled={allUsed}
        >
          + Add section
        </Button>
        <span className={`${styles.total} ${over ? styles.totalOver : ''}`} aria-live="polite">
          Total: {total} question{total === 1 ? '' : 's'}
          {over ? ` (max ${LIMITS.totalMax})` : ''}
        </span>
      </div>
      {errors?.total ? <p className={styles.error}>{errors.total}</p> : null}

      <div className={ui.field}>
        <label className={ui.fieldLabel} htmlFor="custom-duration">
          Time limit (minutes)
        </label>
        <div className={styles.inline}>
          <input
            id="custom-duration"
            className={`${ui.input} ${styles.numberInput}`}
            type="number"
            inputMode="numeric"
            min={LIMITS.durationMin}
            max={LIMITS.durationMax}
            step={1}
            value={draft.durationAuto ? String(suggested) : draft.duration}
            aria-invalid={errors?.duration ? true : undefined}
            aria-describedby={`custom-duration-hint${errors?.duration ? ' custom-duration-error' : ''}`}
            onChange={(e) => dispatch({ kind: 'duration', value: e.target.value })}
          />
          {draft.durationAuto ? null : (
            <Button
              size="sm"
              className={styles.tap}
              variant="ghost"
              onClick={() => dispatch({ kind: 'durationAuto' })}
            >
              Use suggested ({formatMinutes(suggested)})
            </Button>
          )}
        </div>
        <span id="custom-duration-hint" className={ui.fieldHint}>
          {draft.durationAuto
            ? 'Follows the NET pace of about one minute per question.'
            : `${LIMITS.durationMin}–${LIMITS.durationMax} minutes. The NET pace is about one minute per question.`}
        </span>
      </div>
      {errors?.duration ? (
        <p id="custom-duration-error" className={styles.error}>
          {errors.duration}
        </p>
      ) : null}

      <div className={ui.field}>
        <label className={ui.fieldLabel} htmlFor="custom-title">
          Title <span className={styles.hint}>(optional)</span>
        </label>
        <input
          id="custom-title"
          className={ui.input}
          type="text"
          maxLength={LIMITS.titleMax}
          placeholder="Custom Practice Test"
          value={draft.title}
          onChange={(e) => dispatch({ kind: 'customTitle', value: e.target.value })}
        />
      </div>
    </div>
  );
}
