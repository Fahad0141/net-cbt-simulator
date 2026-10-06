import { useId } from 'react';
import { SYLLABUS } from '@/config/syllabus';
import type { SubjectId } from '@/engine/types';
import { BANK_VERSION } from '@/exam/papers';
import { Callout } from '@/ui/components/ui';
import { BankLink } from './BankLink';
import { AUTHORING_GUIDE_URL } from './links';
import { LoadIssues } from './LoadIssues';
import { chapterExpectations } from './model';
import { ExternalLink, Panel } from './parts';
import type { SubjectBank } from './store';
import { TemplateBrowser } from './TemplateBrowser';
import { TemplatePreview } from './TemplatePreview';
import s from './bank.module.css';

function Breadcrumb({ subject, current }: { subject: SubjectId; current: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={s.crumbs}>
        <li>
          <BankLink to={{ subject }} focus="overview-heading">
            {SYLLABUS[subject].name}
          </BankLink>
        </li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}

function formatShare(share: number): string {
  return share > 0 && share < 1 ? 'under 1%' : `${Math.round(share)}%`;
}

function Expectations({
  subject,
  chapterId,
  subjectName,
}: {
  subject: SubjectId;
  chapterId: string;
  subjectName: string;
}) {
  const rows = chapterExpectations(subject, chapterId).filter((r) => r.sectionCount > 0);
  if (!rows.length) return null;
  return (
    <p className={s.expected}>
      <span className={s.expectedLabel}>In a generated paper: </span>
      {rows.map((r, i) => (
        <span key={r.examId}>
          {i > 0 ? ' · ' : ''}
          {r.expected < 0.95 ? 'under 1' : `about ${Math.round(r.expected)}`} of the{' '}
          {r.sectionCount} {subjectName} MCQs in {r.examName}
        </span>
      ))}
    </p>
  );
}

export interface ChapterViewProps {
  bank: SubjectBank;
  chapterId: string;
  templateId?: string;
  seed?: string;
}

/** Templates of one chapter with search, and a preview of the selected template. */
export function ChapterView({ bank, chapterId, templateId, seed }: ChapterViewProps) {
  const ids = useId();
  const subject = bank.subject;
  const subjectName = SYLLABUS[subject].name;
  const summary = bank.chapters.find((c) => c.id === chapterId);
  const templates = bank.byChapter.get(chapterId) ?? [];
  const selected = templateId ? bank.byId.get(templateId) : undefined;

  if (!summary) {
    return (
      <div className={s.view}>
        <Breadcrumb subject={subject} current="Unknown chapter" />
        <h2 className={s.viewTitle} tabIndex={-1} data-focus-key="chapter-heading">
          Chapter not found
        </h2>
        <Callout tone="warning">
          {subjectName} has no chapter with the id <code className={s.inlineCode}>{chapterId}</code>
          .{' '}
          <BankLink to={{ subject }} focus="overview-heading">
            Show all {subjectName} chapters
          </BankLink>
          .
        </Callout>
      </div>
    );
  }

  const { mix } = summary;
  const parts = [`${mix.dynamic} parametric`, `${mix.static} fixed`];
  if (mix.set) parts.push(`${mix.set} passage ${mix.set === 1 ? 'set' : 'sets'}`);

  return (
    <div className={s.view}>
      <header className={s.viewHeader}>
        <Breadcrumb subject={subject} current={summary.name} />
        <h2 className={s.viewTitle} tabIndex={-1} data-focus-key="chapter-heading">
          {summary.name}
        </h2>
        <ul className={s.chapterMeta} aria-label="About this chapter">
          {summary.part !== '-' ? (
            <li>FSc Part {summary.part === 'XI' ? 'I (XI)' : 'II (XII)'}</li>
          ) : null}
          {summary.inSyllabus ? (
            <li>
              Weight {summary.weight} ({formatShare(summary.share)} of {subjectName})
            </li>
          ) : (
            <li>Not in the {subjectName} syllabus</li>
          )}
          <li>
            {mix.total} {mix.total === 1 ? 'template' : 'templates'}
            {mix.total ? `: ${parts.join(', ')}` : ''}
          </li>
        </ul>
        {summary.inSyllabus ? (
          <Expectations subject={subject} chapterId={chapterId} subjectName={subjectName} />
        ) : null}
        {summary.topics.length ? (
          <div className={s.topicsBlock}>
            <span className={s.topicsLabel} id={`${ids}-topics`}>
              Syllabus topics
            </span>
            <ul className={s.topics} aria-labelledby={`${ids}-topics`}>
              {summary.topics.map((topic) => (
                <li key={topic} className={s.topic}>
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>

      <LoadIssues bank={bank} chapter={chapterId} />

      {templateId && !selected ? (
        <Callout tone="warning">
          There is no template with the id <code className={s.inlineCode}>{templateId}</code> in
          bank version {BANK_VERSION}. It may have been renamed or removed.
        </Callout>
      ) : null}

      {templates.length === 0 ? (
        <section className={`${s.placeholder} ${s.emptyChapter}`} aria-labelledby={`${ids}-none`}>
          <h3 id={`${ids}-none`} className={s.emptyTitle}>
            No templates in this chapter yet
          </h3>
          <p>Papers skip this chapter and give its questions to other {subjectName} chapters.</p>
          <p>
            <ExternalLink href={AUTHORING_GUIDE_URL} className={s.standaloneLink}>
              Write the first template for this chapter
            </ExternalLink>
          </p>
        </section>
      ) : (
        <div className={selected ? `${s.chapterLayout} ${s.hasSelection}` : s.chapterLayout}>
          <div className={s.master}>
            <Panel title="Templates" titleId={`${ids}-templates`}>
              <TemplateBrowser
                scope={`${subject}/${chapterId}`}
                subject={subject}
                templates={templates}
                selectedId={selected?.id}
                label={`Search ${summary.name} templates`}
              />
            </Panel>
          </div>
          <div className={s.detail}>
            {selected ? (
              <TemplatePreview
                key={`${selected.id}|${seed ?? ''}`}
                template={selected}
                subject={subject}
                chapterName={summary.name}
                seed={seed}
                modulePath={bank.pathById.get(selected.id)}
              />
            ) : (
              <div className={s.placeholder}>
                <p className={s.placeholderTitle}>Pick a template to preview it</p>
                <p>See a generated question with its answer and worked solution.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
