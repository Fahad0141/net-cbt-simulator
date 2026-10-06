import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { QuestionTemplate, SubjectId } from '@/engine/types';
import { publicAppUrl } from '@/platform/links';
import { QuestionView } from '@/ui/components/QuestionView';
import { RichText } from '@/ui/components/RichText';
import { Button, Callout, ui } from '@/ui/components/ui';
import { BankLink } from './BankLink';
import { reportProblemUrl, sourceFilePath, sourceFileUrl } from './links';
import { buildPreview, defaultSeed, localId, nextVariantSeed, questionsPerInstance } from './model';
import {
  announce,
  copyText,
  goBank,
  setShowAnswersPreference,
  showAnswersPreference,
} from './navigation';
import { ExternalLink, TagList, TemplateBadges } from './parts';
import s from './bank.module.css';

export interface TemplatePreviewProps {
  template: QuestionTemplate;
  subject: SubjectId;
  chapterName: string;
  /** Variant seed from the URL; parametric templates use a per-template default without one. */
  seed?: string;
  /** Registry path of the module that defines the template. */
  modulePath?: string;
}

function kindHeading(template: QuestionTemplate): string {
  if (template.kind === 'dynamic') return 'Parametric template';
  if (template.kind === 'set') return `Passage set · ${questionsPerInstance(template)} questions`;
  return 'Fixed question';
}

/**
 * One generated instance of a template with the answer and worked solution, a
 * "New variant" button for parametric templates, and contributor details.
 */
export function TemplatePreview({
  template,
  subject,
  chapterName,
  seed,
  modulePath,
}: TemplatePreviewProps) {
  const ids = useId();
  const parametric = template.kind !== 'static';
  const activeSeed = parametric && seed ? seed : defaultSeed(template.id);
  const preview = useMemo(() => buildPreview(template, activeSeed), [template, activeSeed]);
  const [showAnswers, setShowAnswers] = useState(showAnswersPreference);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const issues = preview.ok
    ? preview.questions.flatMap((q, i) => q.issues.map((issue) => ({ ...issue, question: i + 1 })))
    : [];
  const errors = issues.filter((issue) => issue.severity === 'error');
  const generatorErrors = errors.filter((issue) => issue.check === 'generator').length;
  const errorCount = errors.length;
  const multiple = preview.ok && preview.questions.length > 1;

  const copyId = async () => {
    const ok = await copyText(template.id);
    setCopyState(ok ? 'copied' : 'failed');
    announce(
      ok
        ? `Copied template id ${template.id}`
        : 'Could not copy. Select the id and copy it manually.',
    );
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState('idle'), 2500);
  };

  const newVariant = () => {
    const next = nextVariantSeed(template, activeSeed);
    announce(`New variant generated with seed ${next}.`);
    goBank(
      { subject, chapter: template.chapter, template: template.id, seed: next },
      'new-variant',
    );
  };

  const toggleAnswers = (value: boolean) => {
    setShowAnswers(value);
    setShowAnswersPreference(value);
  };

  return (
    <article className={`${ui.card} ${s.preview}`} aria-labelledby={`${ids}-title`}>
      <BankLink
        to={{ subject, chapter: template.chapter }}
        focus={`item:${template.id}`}
        className={s.backLink}
      >
        <span aria-hidden="true">←</span>
        All templates in {chapterName}
      </BankLink>

      <header className={s.previewHeader}>
        <p className={s.eyebrow}>{kindHeading(template)}</p>
        <h3
          id={`${ids}-title`}
          className={s.previewTitle}
          tabIndex={-1}
          data-focus-key="preview-heading"
        >
          {localId(template.id)}
        </h3>
        <TemplateBadges template={template} />
        <div className={s.idRow}>
          <code className={s.fullId}>{template.id}</code>
          <Button onClick={() => void copyId()}>
            {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy id'}
          </Button>
        </div>
        <TagList tags={template.tags} />
      </header>

      {parametric ? (
        <div className={s.variantBar}>
          <p className={s.variantText}>
            Variant seed <code className={s.seed}>{activeSeed}</code>
            {seed ? null : ' (default)'}
          </p>
          <Button variant="primary" onClick={newVariant} data-focus-key="new-variant">
            New variant
          </Button>
        </div>
      ) : (
        <p className={s.note}>
          A fixed question appears exactly like this in every paper; only the order of its options
          is shuffled.
        </p>
      )}

      <label className={s.toggle}>
        <input
          type="checkbox"
          checked={showAnswers}
          onChange={(e) => toggleAnswers(e.target.checked)}
        />
        Show {multiple ? 'answers and explanations' : 'answer and explanation'}
      </label>

      {preview.ok ? (
        <>
          {generatorErrors > 0 ? (
            <Callout tone="warning">
              This {parametric ? 'variant' : 'question'} fails{' '}
              {generatorErrors === 1
                ? 'one structural check'
                : `${generatorErrors} structural checks`}
              , so the paper generator would{' '}
              {parametric ? 'discard it and try other values' : 'never use it'}. Details are under{' '}
              <em>For contributors</em> below.
            </Callout>
          ) : errorCount > 0 ? (
            <Callout tone="warning">
              Some maths in this {parametric ? 'variant' : 'question'} cannot be typeset, so it
              would show up broken in a paper. Details are under <em>For contributors</em> below.
            </Callout>
          ) : null}
          {preview.passage ? (
            <section className={s.passage} aria-labelledby={`${ids}-passage`}>
              <h4 id={`${ids}-passage`} className={s.passageTitle}>
                {preview.passage.title ?? 'Passage'}
              </h4>
              <RichText text={preview.passage.text} />
            </section>
          ) : null}
          <div className={s.questions}>
            {preview.questions.map((q, i) => (
              <QuestionView
                key={i}
                number={multiple ? i + 1 : undefined}
                stem={q.stem}
                options={q.options}
                correct={q.correct}
                reveal={showAnswers}
                explanation={q.explanation}
                showExplanation={showAnswers}
                figure={q.figure}
              />
            ))}
          </div>
        </>
      ) : (
        <Callout tone="warning">
          <strong>This template failed to generate a question.</strong>{' '}
          <span className={s.errorText}>{preview.error}</span>
        </Callout>
      )}

      <footer className={s.previewFooter}>
        <ExternalLink
          className={s.standaloneLink}
          href={reportProblemUrl({
            templateId: template.id,
            ...(parametric ? { seed: activeSeed } : {}),
            pageUrl: typeof window !== 'undefined' ? (publicAppUrl() ?? undefined) : undefined,
          })}
        >
          Report a problem with this question
        </ExternalLink>
        <details className={s.contrib} open={errorCount > 0 || !preview.ok}>
          <summary>For contributors</summary>
          <dl className={s.contribList}>
            {modulePath ? (
              <div>
                <dt>Source file</dt>
                <dd>
                  <ExternalLink href={sourceFileUrl(modulePath)}>
                    {sourceFilePath(modulePath)}
                  </ExternalLink>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Print samples locally</dt>
              <dd>
                <code>npm run sample -- {template.id} 3</code>
              </dd>
            </div>
            <div>
              <dt>Checks on this variant</dt>
              <dd>
                {!preview.ok ? (
                  'Not run: the template threw an error.'
                ) : issues.length ? (
                  <ul className={s.issues}>
                    {issues.map((issue, i) => (
                      <li
                        key={i}
                        className={issue.severity === 'error' ? s.issueError : s.issueWarning}
                      >
                        <strong>{issue.severity === 'error' ? 'Error' : 'Warning'}</strong>
                        {multiple ? ` (question ${issue.question})` : ''} in {issue.field}:{' '}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  'Passes the structural checks of the paper generator, and all its maths typesets with KaTeX.'
                )}
              </dd>
            </div>
          </dl>
        </details>
      </footer>
    </article>
  );
}
