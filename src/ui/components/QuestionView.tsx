import type { ReactNode } from 'react';
import { RichText } from './RichText';
import { Figure } from './ui';
import styles from './QuestionView.module.css';

// eslint-disable-next-line react-refresh/only-export-components -- small shared helper kept next to its component
export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export interface QuestionViewProps {
  /** Number shown before the stem (1-based). */
  number?: number;
  stem: string;
  options: readonly string[];
  /** Correct option index; when given together with `reveal`, it is highlighted. */
  correct?: number;
  /** The candidate's answer, highlighted as right or wrong when revealed. */
  selected?: number | null;
  reveal?: boolean;
  explanation?: string;
  showExplanation?: boolean;
  figure?: string;
  passage?: { title?: string; text: string; part: number; of: number };
  /** Extra content under the header line (badges etc.). */
  meta?: ReactNode;
  /** Compact two-column options for print. */
  compact?: boolean;
}

/** Read-only rendering of a question for review, printing and the bank browser. */
export function QuestionView({
  number,
  stem,
  options,
  correct,
  selected,
  reveal = false,
  explanation,
  showExplanation = false,
  figure,
  passage,
  meta,
  compact = false,
}: QuestionViewProps) {
  return (
    <div className={styles.question}>
      {meta ? <div className={styles.meta}>{meta}</div> : null}
      {passage ? (
        <div className={styles.passage}>
          <div className={styles.passageNote}>
            Passage{passage.title ? `: ${passage.title}` : ''} (question {passage.part} of{' '}
            {passage.of})
          </div>
          <RichText text={passage.text} />
        </div>
      ) : null}
      <div className={styles.stemRow}>
        {number !== undefined ? <span className={styles.number}>{number}.</span> : null}
        <RichText text={stem} className={styles.stem} />
      </div>
      {figure ? (
        <div className={styles.figureRow}>
          <Figure svg={figure} label={`Figure for question ${number ?? ''}`} />
        </div>
      ) : null}
      <ol className={`${styles.options} ${compact ? styles.compact : ''}`} type="A">
        {options.map((option, i) => {
          const isCorrect = reveal && i === correct;
          const isWrongPick = reveal && selected === i && i !== correct;
          const cls = [
            styles.option,
            isCorrect ? styles.correct : '',
            isWrongPick ? styles.wrong : '',
            selected === i ? styles.selected : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={i} className={cls}>
              <span className={styles.label} aria-hidden="true">
                ({OPTION_LABELS[i]})
              </span>
              <RichText text={option} inline className={styles.optionText} />
              {isCorrect ? <span className={styles.tag}>Correct answer</span> : null}
              {selected === i && reveal ? (
                <span className={`${styles.tag} ${isWrongPick ? styles.tagWrong : ''}`}>
                  Your answer
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {showExplanation && explanation ? (
        <div className={styles.explanation}>
          <strong>Explanation. </strong>
          <RichText text={explanation} />
        </div>
      ) : null}
    </div>
  );
}
