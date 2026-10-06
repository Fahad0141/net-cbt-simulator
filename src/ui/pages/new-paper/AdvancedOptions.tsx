import { useState } from 'react';
import { Button, Segmented, ui } from '@/ui/components/ui';
import {
  DEFAULT_DYNAMIC_PERCENT,
  DIFFICULTY_CHOICES,
  type DifficultyChoice,
  describeMix,
  difficultyLabel,
  type FormAction,
  type FormState,
  optionsAreDefault,
  paperCodeFor,
  parseSeedInput,
  SEED_ERROR,
} from './model';
import { DIFFICULTY_PRESETS } from '@/exam/papers';
import styles from '../NewPaperPage.module.css';

function sliderText(percent: number): string {
  if (percent === DEFAULT_DYNAMIC_PERCENT) return 'NET-like default';
  return percent > DEFAULT_DYNAMIC_PERCENT
    ? 'more questions with randomised values than the NET-like default'
    : 'fewer questions with randomised values than the NET-like default';
}

/** "Advanced" disclosure: difficulty preset, hybrid share and paper code. */
export function AdvancedOptions({
  state,
  dispatch,
  open,
  onToggle,
  showSeedError,
}: {
  state: FormState;
  dispatch: (action: FormAction) => void;
  open: boolean;
  onToggle: (open: boolean) => void;
  showSeedError: boolean;
}) {
  const [seedTouched, setSeedTouched] = useState(false);
  const seed = parseSeedInput(state.seedInput);
  const seedError =
    seed.kind === 'invalid' && (seedTouched || showSeedError) ? SEED_ERROR : undefined;
  const choices: Array<{ value: DifficultyChoice; label: string }> = [...DIFFICULTY_CHOICES];
  if (state.linkMix) choices.push({ value: 'link', label: 'From link' });
  const mix =
    state.difficulty === 'link'
      ? (state.linkMix ?? DIFFICULTY_PRESETS.net)
      : DIFFICULTY_PRESETS[state.difficulty];
  const isDefault = optionsAreDefault(state);
  const current = [
    difficultyLabel(state),
    `${state.dynamicPercent}% randomised`,
    seed.kind === 'seed' ? 'fixed code' : 'random code',
  ].join(' · ');

  return (
    <details
      className={styles.advanced}
      open={open}
      onToggle={(e) => onToggle(e.currentTarget.open)}
    >
      <summary className={styles.advancedSummary}>
        <span className={styles.advancedLabel}>Advanced paper options</span>
        <span className={styles.advancedCurrent}>{isDefault ? 'NET-like defaults' : current}</span>
      </summary>
      <div className={styles.advancedBody}>
        <div className={ui.field}>
          <span className={ui.fieldLabel} aria-hidden="true">
            Difficulty
          </span>
          <Segmented
            label="Difficulty"
            value={state.difficulty}
            options={choices}
            onChange={(value) => dispatch({ kind: 'difficulty', value })}
          />
          <span className={ui.fieldHint}>
            {describeMix(mix)}. NET-like matches the reported mix of mostly easy-to-moderate items.
          </span>
        </div>

        <div className={ui.field}>
          <label className={ui.fieldLabel} htmlFor="dynamic-share">
            Question style: <span className={styles.rangeValue}>{state.dynamicPercent}%</span> with
            randomised values
          </label>
          <input
            id="dynamic-share"
            className={styles.range}
            type="range"
            min={0}
            max={100}
            step={5}
            value={state.dynamicPercent}
            aria-valuetext={`${state.dynamicPercent}%: ${sliderText(state.dynamicPercent)}`}
            onChange={(e) => dispatch({ kind: 'dynamicPercent', value: Number(e.target.value) })}
          />
          <div className={styles.rangeScale} aria-hidden="true">
            <span>Fixed past-paper-style questions</span>
            <span>Questions with randomised values</span>
          </div>
          <span className={ui.fieldHint}>
            {sliderText(state.dynamicPercent)}. The share is scaled per subject (Mathematics has the
            most randomised questions, Chemistry the fewest).
          </span>
        </div>

        <div className={ui.field}>
          <label className={ui.fieldLabel} htmlFor="paper-code">
            Paper code <span className={styles.hint}>(optional)</span>
          </label>
          <input
            id="paper-code"
            className={`${ui.input} ${styles.codeInput}`}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            placeholder="Leave empty for a new random paper"
            value={state.seedInput}
            aria-invalid={seedError ? true : undefined}
            aria-describedby={`paper-code-hint${seedError ? ' paper-code-error' : ''}`}
            onChange={(e) => dispatch({ kind: 'seedInput', value: e.target.value })}
            onBlur={() => setSeedTouched(true)}
          />
          <span id="paper-code-hint" className={ui.fieldHint}>
            Enter a code a friend shared (e.g. ENG-K7Q2-9XM4) to sit exactly the same paper with the
            same options.
          </span>
        </div>
        {seedError ? (
          <p id="paper-code-error" className={styles.error}>
            {seedError}
          </p>
        ) : seed.kind === 'seed' ? (
          <p className={styles.preview}>
            This builds paper <code>{paperCodeFor(state.examType, seed.seed)}</code>.
          </p>
        ) : null}

        {isDefault ? null : (
          <div>
            <Button
              size="sm"
              className={styles.tap}
              variant="ghost"
              onClick={() => dispatch({ kind: 'resetOptions' })}
            >
              Reset to NET-like defaults
            </Button>
          </div>
        )}
      </div>
    </details>
  );
}
