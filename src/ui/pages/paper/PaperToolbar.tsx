import type { ReactNode } from 'react';
import { Button, Card, LinkButton, ProgressBar, Segmented } from '@/ui/components/ui';
import { type PaperComposition, plural } from './layout';
import { FONT_SIZE_LABEL, type FontSize, type PrintSettings } from './settings';
import css from '../PaperPage.module.css';

function Check({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={css.check}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <label htmlFor={id}>{label}</label>
      <span id={`${id}-hint`} className={css.checkHint}>
        {hint}
      </span>
    </div>
  );
}

const SIZE_OPTIONS = (Object.keys(FONT_SIZE_LABEL) as FontSize[]).map((value) => ({
  value,
  label: FONT_SIZE_LABEL[value],
}));

export interface PaperToolbarProps {
  settings: PrintSettings;
  onChange: (patch: Partial<PrintSettings>) => void;
  composition: PaperComposition;
  sectionCount: number;
  bankVersion: string;
  /** Questions laid out so far. */
  rendered: number;
  status: string;
  cbtHref: string;
  /**
   * Label of the link button in the installed apps (Android shares instead of copying; the
   * desktop app without a known website copies the paper code), or null for "Copy link".
   */
  shareLabel?: string | null;
  onPrint: () => void;
  onCopyLink: () => void;
  onAnotherPaper: () => void;
}

/** Print options: what to include, layout, and actions. Hidden when printing. */
export function PaperToolbar({
  settings,
  onChange,
  composition,
  sectionCount,
  bankVersion,
  rendered,
  status,
  cbtHref,
  shareLabel,
  onPrint,
  onCopyLink,
  onAnotherPaper,
}: PaperToolbarProps) {
  const total = composition.total;
  const [easy, medium, hard] = composition.difficulty;
  return (
    <section className={`${css.side} ${css.screenOnly}`} aria-labelledby="paper-options-title">
      <Card as="div" className={css.panel}>
        <h2 id="paper-options-title" className={css.panelHeading}>
          Print options
        </h2>
        <div className={css.actions}>
          <Button variant="primary" size="lg" onClick={onPrint}>
            Print / Save as PDF
          </Button>
          <LinkButton href={cbtHref}>Take this paper as a CBT test</LinkButton>
          <p className={css.status} role="status" aria-live="polite">
            {status}
          </p>
          {rendered < total ? (
            <div className={css.progress}>
              <span>
                Laying out pages… {rendered} of {total} questions
              </span>
              <ProgressBar
                value={(rendered / Math.max(1, total)) * 100}
                label="Laying out pages"
                color="var(--primary)"
              />
            </div>
          ) : null}
        </div>

        <div className={css.groups}>
          <fieldset className={css.group}>
            <legend className={css.legend}>Include</legend>
            <Check
              id="paper-opt-omr"
              label="Answer sheet (OMR)"
              hint="Bubble sheet after the last question"
              checked={settings.answerSheet}
              onChange={(answerSheet) => onChange({ answerSheet })}
            />
            <Check
              id="paper-opt-key"
              label="Answer key"
              hint="Correct option for every question"
              checked={settings.answerKey}
              onChange={(answerKey) => onChange({ answerKey })}
            />
            <Check
              id="paper-opt-solutions"
              label="Worked solutions"
              hint="Explanation for every question, at the end"
              checked={settings.solutions}
              onChange={(solutions) => onChange({ solutions })}
            />
          </fieldset>
          <fieldset className={css.group}>
            <legend className={css.legend}>Layout</legend>
            <Check
              id="paper-opt-columns"
              label="Two-column options"
              hint="Options side by side; very short ones share a line"
              checked={settings.twoColumnOptions}
              onChange={(twoColumnOptions) => onChange({ twoColumnOptions })}
            />
            <div className={css.sizeField}>
              <span className={css.fieldLabel} aria-hidden="true">
                Text size
              </span>
              <Segmented
                label="Text size"
                value={settings.fontSize}
                options={SIZE_OPTIONS}
                onChange={(fontSize) => onChange({ fontSize })}
              />
            </div>
          </fieldset>
        </div>

        <div className={css.about}>
          <h3 className={css.aboutTitle}>This paper</h3>
          <dl className={css.facts}>
            <dt>Questions</dt>
            <dd>
              {total} in {plural(sectionCount, 'section')}
            </dd>
            <dt>Fresh values</dt>
            <dd>{composition.parametric} randomised</dd>
            <dt>Past-paper style</dt>
            <dd>{composition.pastPaper}</dd>
            <dt>Difficulty</dt>
            <dd>
              {easy} easy · {medium} medium · {hard} hard
            </dd>
            <dt>Question bank</dt>
            <dd>v{bankVersion}</dd>
          </dl>
        </div>

        <div className={css.secondary}>
          <Button onClick={onAnotherPaper}>New paper code</Button>
          <Button onClick={onCopyLink}>{shareLabel ?? 'Copy link'}</Button>
        </div>

        <details className={css.tips}>
          <summary>Printing tips</summary>
          <ul>
            <li>
              Choose <strong>Save as PDF</strong> as the printer to keep a copy.
            </li>
            <li>Use A4 paper at 100% scale with the default margins.</li>
            <li>The paper prints in black and white; background graphics are not needed.</li>
            <li>
              The answer sheet, answer key and solutions each start on a new page, so you can print
              them separately.
            </li>
          </ul>
        </details>
      </Card>
    </section>
  );
}
