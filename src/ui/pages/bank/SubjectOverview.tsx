import { useId, useMemo } from 'react';
import { SYLLABUS } from '@/config/syllabus';
import type { SubjectId } from '@/engine/types';
import { DEFAULT_GENERATION } from '@/exam/papers';
import { Callout, Stat, ui } from '@/ui/components/ui';
import { ChapterTable } from './ChapterTable';
import { DifficultyMix } from './DifficultyMix';
import { Explainer } from './Explainer';
import { AUTHORING_GUIDE_URL } from './links';
import { LoadIssues } from './LoadIssues';
import { paperReadiness, papersUsing, percent } from './model';
import { ExternalLink, Panel } from './parts';
import type { SubjectBank } from './store';
import { TemplateBrowser } from './TemplateBrowser';
import s from './bank.module.css';

function listText(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function UsedIn({ subject }: { subject: SubjectId }) {
  const { current, legacy } = papersUsing(subject);
  const patterns = legacy === 1 ? 'one pre-2025 pattern' : `${legacy} pre-2025 patterns`;
  let text: string;
  if (current.length) {
    text = `Tested in ${listText(current.map((p) => `${p.name} (${p.count} MCQs)`))}.`;
    if (legacy) text += ` Also part of ${patterns} kept for practice.`;
  } else {
    text = legacy
      ? `Not in the current (2025 onward) NET papers; part of ${patterns} kept for practice.`
      : 'Not part of any NET paper in this simulator.';
  }
  return <p className={s.lead}>{text}</p>;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Says when a subject has fewer questions than its largest paper section needs. */
function Readiness({ bank, name }: { bank: SubjectBank; name: string }) {
  const readiness = useMemo(() => paperReadiness(bank.subject, bank.templates, bank.mix), [bank]);
  if (!readiness || bank.mix.total === 0 || readiness.shortfall === 0) return null;
  const { needed, examName, distinct, shortfall, reusable } = readiness;
  if (reusable > 0) {
    return (
      <Callout>
        A {examName} paper needs {needed} {name} MCQs, {shortfall} more than the{' '}
        {plural(distinct, 'distinct question', 'distinct questions')} here. Generated papers make up
        the difference by reusing{' '}
        {reusable === 1
          ? 'the one template that produces'
          : `the ${reusable} templates that produce`}{' '}
        fresh values each time, so some question patterns repeat; more templates mean less
        repetition.
      </Callout>
    );
  }
  return (
    <Callout tone="warning">
      <strong>Not enough for a full paper yet.</strong> A {examName} paper needs {needed} {name}{' '}
      MCQs, but the bank has only {plural(distinct, 'distinct question', 'distinct questions')} and
      no template that produces fresh values when reused. Papers with a full {name} section cannot
      be generated until more templates are added.
    </Callout>
  );
}

function emptyReason(bank: SubjectBank): string {
  if (!bank.failures.length) return 'This part of the question bank is still being written.';
  return bank.failures.length >= bank.moduleCount
    ? 'None of the chapter files for this subject could be loaded (see above).'
    : 'Some chapter files failed to load (see above) and the others have no templates yet.';
}

/** Statistics, difficulty mix, chapter coverage and subject-wide search for one subject. */
export function SubjectOverview({
  bank,
  missingTemplate,
}: {
  bank: SubjectBank;
  missingTemplate?: string;
}) {
  const ids = useId();
  const subject = bank.subject;
  const name = SYLLABUS[subject].name;
  const { mix } = bank;
  const syllabusChapters = bank.chapters.filter((c) => c.inSyllabus);
  const covered = syllabusChapters.filter((c) => c.mix.total > 0).length;

  return (
    <div className={s.view}>
      <header className={s.viewHeader}>
        <h2 className={s.viewTitle} tabIndex={-1} data-focus-key="overview-heading">
          {name}
        </h2>
        <UsedIn subject={subject} />
      </header>

      {missingTemplate ? (
        <Callout tone="warning">
          There is no template with the id <code className={s.inlineCode}>{missingTemplate}</code>{' '}
          in this version of the bank. It may have been renamed or removed.
        </Callout>
      ) : null}

      <LoadIssues bank={bank} />

      {mix.total > 0 ? (
        <section className={s.summary} aria-label={`${name} bank summary`}>
          <div className={s.stats}>
            <Stat
              label="Templates"
              value={mix.total}
              hint={`in ${covered} of ${syllabusChapters.length} chapters`}
            />
            <Stat
              label="Parametric"
              value={mix.dynamic}
              hint={`${percent(mix.dynamic, mix.total)}% of templates`}
            />
            <Stat
              label="Fixed"
              value={mix.static}
              hint={`${percent(mix.static, mix.total)}% of templates`}
            />
            <Stat
              label="Passage sets"
              value={mix.set}
              hint={
                mix.set ? `${plural(mix.setQuestions, 'question', 'questions')} in all` : 'none yet'
              }
            />
            <Stat
              label="Past-paper style"
              value={`${percent(mix.pastPaper, mix.total)}%`}
              hint={`${mix.pastPaper} of ${mix.total} templates`}
            />
          </div>
        </section>
      ) : (
        <section className={`${ui.card} ${s.emptySubject}`} aria-labelledby={`${ids}-empty`}>
          <h3 id={`${ids}-empty`} className={s.emptyTitle}>
            No {name} templates yet
          </h3>
          <p>
            {emptyReason(bank)} Papers that include {name} cannot be generated until it has
            templates.
          </p>
          <p>
            <ExternalLink href={AUTHORING_GUIDE_URL} className={s.standaloneLink}>
              Help write {name} questions
            </ExternalLink>
          </p>
        </section>
      )}

      <Readiness bank={bank} name={name} />

      <div className={ui.grid2}>
        {mix.total > 0 ? (
          <Panel title="Difficulty mix" titleId={`${ids}-mix`}>
            <DifficultyMix mix={mix} target={DEFAULT_GENERATION.difficultyMix} />
          </Panel>
        ) : null}
        <Panel title="How the bank works" titleId={`${ids}-how`}>
          <Explainer />
        </Panel>
      </div>

      <Panel
        title="Chapters"
        titleId={`${ids}-chapters`}
        action={
          <span className={s.panelNote}>
            {covered} of {syllabusChapters.length} have templates
          </span>
        }
      >
        <ChapterTable bank={bank} subjectName={name} />
      </Panel>

      {mix.total > 0 ? (
        <Panel title={`Search all ${name} templates`} titleId={`${ids}-search`}>
          <TemplateBrowser
            scope={`${subject}/*`}
            subject={subject}
            templates={bank.templates}
            requireFilter
            showChapter
            label={`Search all ${name} templates`}
          />
        </Panel>
      ) : null}
    </div>
  );
}
