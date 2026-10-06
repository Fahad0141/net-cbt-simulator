import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { chapterName, SYLLABUS } from '@/config/syllabus';
import type { SubjectId } from '@/engine/types';
import { BANK_VERSION } from '@/exam/papers';
import { externalLinkTarget } from '@/platform/links';
import { Button, Callout, LinkButton, PageHeader, ui } from '@/ui/components/ui';
import { ChapterView } from './bank/ChapterView';
import { AUTHORING_GUIDE_URL } from './bank/links';
import { localId } from './bank/model';
import {
  announce,
  BANK_SUBJECTS,
  parseBankQuery,
  requestFocus,
  useRestoreFocus,
} from './bank/navigation';
import { SubjectOverview } from './bank/SubjectOverview';
import { SubjectTabs } from './bank/SubjectTabs';
import {
  loadSubject,
  type SubjectState,
  useLoadedCounts,
  usePrefetchSubjects,
  useSubjectState,
} from './bank/store';
import styles from './BankPage.module.css';

/** Tells screen-reader users when a subject they were waiting for has loaded. */
function useLoadAnnouncement(subject: SubjectId, state: SubjectState | undefined) {
  const waiting = useRef(false);
  useEffect(() => {
    if (!state || state.status === 'loading') {
      waiting.current = true;
      return;
    }
    if (!waiting.current) return;
    waiting.current = false;
    const name = SYLLABUS[subject].name;
    if (state.status === 'ready') {
      const n = state.bank.templates.length;
      announce(`${name} question bank loaded: ${n} ${n === 1 ? 'template' : 'templates'}.`);
    } else {
      announce(`The ${name} question bank could not be loaded.`);
    }
  }, [subject, state]);
}

function LoadingView({ subject }: { subject: SubjectId }) {
  return (
    <div className={styles.loading}>
      <p role="status" className={styles.loadingText}>
        Loading {SYLLABUS[subject].name} templates…
      </p>
      <div className={styles.skeleton} aria-hidden="true">
        <span className={styles.skeletonTitle} />
        <span className={styles.skeletonRow} />
        <span className={styles.skeletonRow} />
        <span className={styles.skeletonBlock} />
      </div>
    </div>
  );
}

/**
 * Question-bank browser: `#/bank?subject=<id>&chapter=<id>&t=<template id>&seed=<seed>`.
 * Students preview real generated questions with worked solutions; contributors
 * see coverage, broken modules and per-variant quality checks.
 */
export default function BankPage({ query }: { query: URLSearchParams }) {
  const queryKey = query.toString();
  const location = useMemo(() => parseBankQuery(new URLSearchParams(queryKey)), [queryKey]);
  const { subject } = location;
  const subjectName = SYLLABUS[subject].name;
  const state = useSubjectState(subject);
  const counts = useLoadedCounts();
  const rootRef = useRef<HTMLDivElement>(null);
  const bank = state?.status === 'ready' ? state.bank : undefined;

  // Keyed on `state` too: whenever the store has nothing for this subject (first
  // visit, or the store was reset), ask again. Errors wait for "Try again".
  useEffect(() => {
    if (!state) void loadSubject(subject);
  }, [subject, state]);
  usePrefetchSubjects(Boolean(bank), BANK_SUBJECTS);
  useLoadAnnouncement(subject, state);
  useRestoreFocus(rootRef, state !== undefined && state.status !== 'loading');

  // A template id is authoritative for the chapter (links may carry a stale one).
  const template = location.template && bank ? bank.byId.get(location.template) : undefined;
  const chapter = template?.chapter ?? location.chapter;

  const viewTitle = template
    ? localId(template.id)
    : chapter
      ? `${chapterName(subject, chapter)} (${subjectName})`
      : subjectName;
  useEffect(() => {
    document.title = `${viewTitle} · Question bank · NET CBT Simulator`;
  }, [viewTitle]);

  let content: ReactNode;
  if (!state || state.status === 'loading') {
    content = <LoadingView subject={subject} />;
  } else if (state.status === 'error') {
    content = (
      <Callout tone="warning">
        <div className={styles.errorBox}>
          <p>
            <strong>The {subjectName} question bank could not be loaded.</strong> {state.error}
          </p>
          <div>
            <Button
              onClick={() => {
                // Land on the heading of whatever view the URL asks for once it loads.
                requestFocus(
                  location.template
                    ? 'preview-heading'
                    : chapter
                      ? 'chapter-heading'
                      : 'overview-heading',
                );
                void loadSubject(subject, { force: true });
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      </Callout>
    );
  } else if (chapter) {
    content = (
      <ChapterView
        key={`${subject}/${chapter}`}
        bank={state.bank}
        chapterId={chapter}
        templateId={location.template}
        seed={location.seed}
      />
    );
  } else {
    content = (
      <SubjectOverview
        key={subject}
        bank={state.bank}
        missingTemplate={location.template && !template ? location.template : undefined}
      />
    );
  }

  return (
    <div ref={rootRef} className={`${ui.page} ${styles.page}`}>
      <PageHeader
        title="Question bank"
        subtitle={
          <>
            The templates behind every generated paper, each with a worked solution.{' '}
            <span className={styles.version}>Bank version {BANK_VERSION}.</span>
          </>
        }
        actions={
          <LinkButton href={AUTHORING_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            Authoring guide<span aria-hidden="true"> ↗</span>
            <span className="visually-hidden"> (opens {externalLinkTarget()})</span>
          </LinkButton>
        }
      />
      <SubjectTabs current={subject} counts={counts} />
      {location.unknownSubject ? (
        <Callout tone="warning">
          <span className={styles.wrap}>
            There is no subject called “{location.unknownSubject}”. Showing {subjectName} instead.
          </span>
        </Callout>
      ) : null}
      {content}
    </div>
  );
}
