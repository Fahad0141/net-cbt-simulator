import { type FormEvent, useEffect, useMemo, useState } from 'react';
import type { Paper } from '@/engine/types';
import { generatePaper } from '@/exam/papers';
import { Button, Card, EmptyState, Field, LinkButton, PageHeader, ui } from '@/ui/components/ui';
import { useAsync } from '@/ui/hooks';
import { href, navigate } from '@/ui/router';
import { explainGenerationError } from './paper/errors';
import { paperHeading } from './paper/layout';
import { PaperView } from './paper/PaperView';
import { pathForTypedCode, type PaperResolution, resolvePaperUrl } from './paper/request';
import { settingsFromQuery } from './paper/settings';
import css from './PaperPage.module.css';

const APP_NAME = 'NET CBT Simulator';

const shorten = (text: string, max = 40): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    return () => {
      document.title = previous;
    };
  }, []);
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);
}

function OpenCodeForm() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const path = pathForTypedCode(value);
    if (path) navigate(path);
    else if (/^CUS[-_ ]/.test(value.trim().toUpperCase()))
      setError('Custom papers cannot be opened from their code alone: use their full link.');
    else
      setError(
        'Enter a code like ENG-K7Q2-9XM4: an exam prefix followed by eight letters and digits.',
      );
  };
  return (
    <form className={css.codeForm} onSubmit={submit} noValidate>
      <Field label="Paper code" htmlFor="paper-code-input">
        <input
          id="paper-code-input"
          className={ui.input}
          value={value}
          onChange={(event) => {
            setValue(event.currentTarget.value);
            setError('');
          }}
          placeholder="ENG-K7Q2-9XM4"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'paper-code-error' : undefined}
        />
      </Field>
      <Button type="submit" variant="primary">
        Open paper
      </Button>
      {error ? (
        <p id="paper-code-error" className={css.formError} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function Unresolved({ resolution }: { resolution: Extract<PaperResolution, { ok: false }> }) {
  const missingSpec = resolution.problem === 'missing-spec';
  return (
    <div className={css.root}>
      <PageHeader title="Printable paper" />
      <Card>
        <EmptyState
          title={
            missingSpec ? 'This custom paper link is incomplete' : 'That paper code is not valid'
          }
        >
          {missingSpec ? (
            <>
              A custom paper needs its full link. Open it again from your history, or set up a new
              custom test.
            </>
          ) : (
            <>
              <strong className={css.badCode}>{shorten(resolution.code) || '(empty)'}</strong> is
              not a paper code. Codes look like <strong>ENG-K7Q2-9XM4</strong>.
            </>
          )}
        </EmptyState>
        {missingSpec ? null : <OpenCodeForm />}
        <div className={css.emptyActions}>
          <LinkButton href={href('/new')} variant={missingSpec ? 'primary' : 'default'}>
            Generate a new paper
          </LinkButton>
          <LinkButton href={href('/history')} variant="ghost">
            Your history
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}

function Loading({ code }: { code: string }) {
  return (
    <div className={css.root}>
      <PageHeader title="Preparing your paper" subtitle={`Paper code ${code}`} />
      <Card>
        <div className={css.loading} role="status" aria-live="polite">
          <span className={css.spinner} aria-hidden="true" />
          <div>
            <strong>Generating paper {code}…</strong>
            <p>A full paper takes a moment.</p>
          </div>
        </div>
      </Card>
      <div className={css.skeleton} aria-hidden="true">
        {[72, 48, 90, 64, 84, 56, 92, 40].map((width, i) => (
          <div key={i} className={css.skeletonLine} style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  );
}

function Failed({ code, error, onRetry }: { code: string; error: Error; onRetry: () => void }) {
  const problem = explainGenerationError(error);
  return (
    <div className={css.root}>
      <PageHeader title="Printable paper" subtitle={`Paper code ${code}`} />
      <Card>
        <div role="alert">
          <EmptyState title={problem.title}>{problem.message}</EmptyState>
        </div>
        <div className={css.emptyActions}>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
          <LinkButton href={href('/new')}>Generate a different paper</LinkButton>
          <LinkButton href={href('/bank')} variant="ghost">
            Browse the question bank
          </LinkButton>
        </div>
        <details className={css.details}>
          <summary>Technical details</summary>
          <pre>{error.message}</pre>
        </details>
      </Card>
    </div>
  );
}

interface Generated {
  paper: Paper;
  generatedAt: number;
}

/**
 * `#/paper/<code>?type=..&dyn=..&mix=..&pp=..&spec=..&solutions=1`: the printable Full
 * Length Paper for a paper code, with an OMR answer sheet, answer key and worked solutions.
 */
export default function PaperPage({ code, query }: { code: string; query: URLSearchParams }) {
  // `query` is a new object on every route render; its text is its identity.
  const queryText = query.toString();
  const resolution = useMemo(
    () => resolvePaperUrl(code, new URLSearchParams(queryText)),
    [code, queryText],
  );
  // Read once: later option changes live in PaperView's state (and the URL).
  const [initialSettings] = useState(() => settingsFromQuery(query));
  const key = resolution.ok ? resolution.key : `invalid|${code}`;

  const state = useAsync<Generated | null>(async () => {
    if (!resolution.ok) return null;
    const paper = await generatePaper(resolution.request);
    return { paper, generatedAt: Date.now() };
  }, [key]);

  const generated = resolution.ok && !state.loading ? state.data : undefined;
  const title = !resolution.ok
    ? 'Paper not found'
    : generated
      ? `${paperHeading(generated.paper).shortName} paper ${generated.paper.code}`
      : state.error && !state.loading
        ? 'Paper unavailable'
        : `Paper ${resolution.code}`;
  useDocumentTitle(title);

  if (!resolution.ok) return <Unresolved resolution={resolution} />;
  if (state.error && !state.loading)
    return <Failed code={resolution.code} error={state.error} onRetry={state.reload} />;
  if (!generated) return <Loading code={resolution.code} />;
  if (generated.paper.questions.length === 0) {
    return (
      <div className={css.root}>
        <PageHeader title="Printable paper" subtitle={`Paper code ${generated.paper.code}`} />
        <Card>
          <EmptyState
            title="This paper has no questions"
            action={<LinkButton href={href('/new')}>Generate a new paper</LinkButton>}
          >
            The specification produced an empty paper. Choose at least one subject with one or more
            questions.
          </EmptyState>
        </Card>
      </div>
    );
  }
  return (
    <PaperView
      key={generated.paper.code}
      resolved={resolution}
      paper={generated.paper}
      generatedAt={generated.generatedAt}
      initialSettings={initialSettings}
    />
  );
}
