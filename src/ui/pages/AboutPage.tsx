import { type MouseEvent, type ReactNode, useEffect, useState } from 'react';
import { EXAM_TYPES, type ExamTypeConfig, NOMINAL_DYNAMIC_SHARE } from '@/config/exams';
import { REPO_URL, repoFileUrl } from '@/config/site';
import { SUBJECT_DYNAMIC_SHARE } from '@/config/syllabus';
import { BANK_VERSION, DIFFICULTY_PRESETS } from '@/exam/papers';
import { nustAggregate } from '@/exam/scoring';
import { externalLinkTarget } from '@/platform/links';
import { isDesktopApp, isInstalledApp, storagePlace } from '@/platform/desktop';
import { Badge, Callout, LinkButton, PageHeader, Stat, ui } from '../components/ui';
import { href } from '../router';
import { AUTHORING_GUIDE_URL } from './bank/links';
import styles from './AboutPage.module.css';

/* ------------------------------------------------------------------ */
/* Static content                                                      */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: 'what', label: 'What this is' },
  { id: 'pattern', label: 'The NET at a glance' },
  { id: 'cbt', label: 'How the CBT replica behaves' },
  { id: 'generator', label: 'How papers are generated' },
  { id: 'faq', label: 'FAQ' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
  { id: 'credits', label: 'Credits & licence' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const sectionDomId = (id: SectionId) => `about-${id}`;
const headingDomId = (id: SectionId) => `about-${id}-title`;

const DOCS_URL = repoFileUrl('docs/EXAM_PATTERN.md');
const ISSUES_URL = `${REPO_URL}/issues`;
const LICENSE_URL = repoFileUrl('LICENSE');

const OFFICIAL = {
  weightings:
    'https://nust.edu.pk/admissions/undergraduates/subjects-included-in-net-with-weightings/',
  faq: 'https://nust.edu.pk/faq-category/ug-admission/',
  brochure: 'https://ugadmissions.nust.edu.pk/PublishingImages/UG_Brochure_2026.pdf',
  sample: 'https://ugadmissions.nust.edu.pk/demo/index.htm',
} as const;

const CURRENT_EXAMS = EXAM_TYPES.filter((e) => e.era === 'current');
const LEGACY_EXAMS = EXAM_TYPES.filter((e) => e.era === 'legacy');

/** Spoken names for keys whose glyph a screen reader may not announce well. */
const KEY_NAMES: Readonly<Record<string, string>> = { '→': 'Right arrow', '←': 'Left arrow' };

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
const fmtPct = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)}%`;

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function Icon({ name }: { name: SectionId }) {
  const paths: Record<SectionId, ReactNode> = {
    what: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7.5v.01" />
      </>
    ),
    pattern: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 10h16M10 10v10" />
      </>
    ),
    cbt: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
    generator: (
      <>
        <path d="M4 7h10M4 12h16M4 17h7" />
        <circle cx="17" cy="7" r="2.5" />
        <circle cx="14" cy="17" r="2.5" />
      </>
    ),
    faq: (
      <>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z" />
        <path d="M10 9.5a2 2 0 1 1 2.8 1.8c-.5.2-.8.7-.8 1.2v.5M12 15.5v.01" />
      </>
    ),
    shortcuts: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
      </>
    ),
    credits: (
      <>
        <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />
      </>
    ),
  };
  return (
    <span className={styles.sectionIcon} aria-hidden="true">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </svg>
    </span>
  );
}

function ExternalIcon() {
  return (
    <svg
      className={styles.extIcon}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

/** Link that leaves the app: new tab, no referrer, and says so to screen readers. */
function Ext({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <ExternalIcon />
      <span className="visually-hidden"> (opens {externalLinkTarget()})</span>
    </a>
  );
}

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const label = SECTIONS.find((s) => s.id === id)?.label ?? id;
  return (
    <section
      id={sectionDomId(id)}
      aria-labelledby={headingDomId(id)}
      className={[ui.card, styles.section].join(' ')}
    >
      <div className={styles.sectionHead}>
        <Icon name={id} />
        <h2 id={headingDomId(id)} className={styles.sectionTitle} tabIndex={-1}>
          {label}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Keys({ keys }: { keys: ReadonlyArray<string | readonly string[]> }) {
  return (
    <span className={styles.keys}>
      {keys.map((group, i) => (
        <span key={i} className={styles.keys}>
          {i > 0 ? <span className={styles.or}>or</span> : null}
          {(typeof group === 'string' ? [group] : group).map((k) => (
            <kbd key={k} className={styles.kbd}>
              {KEY_NAMES[k] ? (
                <>
                  <span aria-hidden="true">{k}</span>
                  <span className="visually-hidden">{KEY_NAMES[k]}</span>
                </>
              ) : (
                k
              )}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  );
}

/** One `<tbody>` per paper: a heading row followed by one row per section. */
function PatternTable({
  exams,
  caption,
  practiceLinks,
}: {
  exams: readonly ExamTypeConfig[];
  caption: string;
  practiceLinks?: boolean;
}) {
  return (
    <div className={ui.tableWrap}>
      <table className={[ui.table, styles.patternTable].join(' ')}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Section</th>
            <th scope="col" className={ui.num}>
              MCQs
            </th>
            <th scope="col" className={styles.weightCol}>
              Weightage
            </th>
          </tr>
        </thead>
        {exams.map((exam) => {
          const total = exam.sections.reduce((sum, s) => sum + s.count, 0);
          const headId = `pattern-${exam.id}`;
          return (
            <tbody key={exam.id}>
              <tr>
                <th scope="rowgroup" colSpan={3} id={headId} className={styles.groupCell}>
                  <div className={styles.groupHead}>
                    <span className={styles.groupName}>{exam.name}</span>
                    <span className={styles.groupMeta}>
                      {total} MCQs · {exam.durationMinutes} min · code {exam.code}
                    </span>
                    {practiceLinks ? (
                      <a
                        className={styles.groupLink}
                        href={href(`/new?type=${encodeURIComponent(exam.id)}`)}
                      >
                        Practise this paper<span className="visually-hidden">: {exam.name}</span>{' '}
                        <span aria-hidden="true">→</span>
                      </a>
                    ) : null}
                  </div>
                  <p className={styles.audience}>{exam.audience}</p>
                </th>
              </tr>
              {exam.sections.map((section) => {
                const weight = pct(section.count, total);
                return (
                  <tr key={`${section.subject}-${section.title}`}>
                    <th scope="row" headers={headId} className={styles.subjectCell}>
                      {section.title}
                    </th>
                    <td className={ui.num}>{section.count}</td>
                    <td>
                      <span className={styles.weight}>
                        <span className={styles.weightValue}>{fmtPct(weight)}</span>
                        <span className={styles.weightTrack} aria-hidden="true">
                          <span className={styles.weightFill} style={{ width: `${weight}%` }} />
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AboutPage() {
  const [active, setActive] = useState<SectionId>('what');
  // The Android and Windows apps have no browser, address bar or site cache to talk about.
  const app = isInstalledApp();
  const desktop = isDesktopApp();

  useEffect(() => {
    const previous = document.title;
    document.title = 'About · NET CBT Simulator';
    return () => {
      document.title = previous;
    };
  }, []);

  // Highlight the table-of-contents entry for the section in view.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Map<SectionId, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id.replace(/^about-/, '') as SectionId;
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
          else visible.delete(id);
        }
        const first = SECTIONS.find((s) => visible.has(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-80px 0px -55% 0px' },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(sectionDomId(s.id));
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // Hash routing owns `location.hash`, so in-page links scroll instead of navigating.
  const jump = (id: SectionId) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const section = document.getElementById(sectionDomId(id));
    // Keep the heading clear of the sticky app header, whose height varies with the viewport.
    const header = document.querySelector('header');
    if (section && header)
      section.style.scrollMarginTop = `${Math.ceil(header.getBoundingClientRect().height) + 16}px`;
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    document.getElementById(headingDomId(id))?.focus({ preventScroll: true });
    setActive(id);
  };

  const netMix = DIFFICULTY_PRESETS.net;
  const mixTotal = netMix[0] + netMix[1] + netMix[2];
  const [easy, medium, hard] = netMix.map((v) => Math.round((v / mixTotal) * 100));
  const share = (subject: keyof typeof SUBJECT_DYNAMIC_SHARE) =>
    `${Math.round(SUBJECT_DYNAMIC_SHARE[subject] * 100)}%`;
  const example = nustAggregate(70, 85, 90);

  return (
    <div className={ui.page}>
      <PageHeader
        title="About NET CBT Simulator"
        subtitle="An unofficial, open-source practice environment for NUST's computer-based Entry Test — how it works, what the real test looks like, and where the questions come from."
        actions={
          <>
            <LinkButton href={href('/new')} variant="primary">
              Start a practice paper
            </LinkButton>
            <LinkButton href={REPO_URL} target="_blank" rel="noopener noreferrer">
              Source on GitHub
              <span className="visually-hidden"> (opens {externalLinkTarget()})</span>
            </LinkButton>
          </>
        }
      />

      <div className={styles.layout}>
        <nav className={styles.toc} aria-label="On this page">
          <p className={styles.tocTitle}>On this page</p>
          <ul className={styles.tocList}>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  className={styles.tocLink}
                  href={href('/about')}
                  onClick={jump(s.id)}
                  aria-current={active === s.id ? 'true' : undefined}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.content}>
          {/* ---------------------------------------------------------- */}
          <Section id="what">
            <p className={styles.lead}>
              NET CBT Simulator recreates the look and rules of the NUST Entry Test terminal and
              fills it with freshly generated, full-length papers, so you can rehearse the real
              200-question, 180-minute sitting as often as you like.
            </p>
            <Callout tone="warning">
              <strong>Unofficial.</strong> This project is not affiliated with, endorsed by or
              connected to the National University of Sciences &amp; Technology (NUST). Always
              confirm dates, eligibility and the paper pattern on{' '}
              <Ext to={OFFICIAL.weightings}>NUST&apos;s official website</Ext>.
            </Callout>
            <ul className={styles.features}>
              <li className={styles.feature}>
                <h3>Open source</h3>
                <p>
                  MIT-licensed code and question bank. Anyone can audit an answer, fix a mistake or
                  add questions.
                </p>
              </li>
              <li className={styles.feature}>
                <h3>Private by design</h3>
                <p>
                  No accounts, no tracking, no server. Your attempts and history stay{' '}
                  {app ? storagePlace() : "in this browser's storage"} until you delete or export
                  them.
                </p>
              </li>
              <li className={styles.feature}>
                <h3>Unlimited unique papers</h3>
                <p>
                  A hybrid engine builds a new paper every time, and every paper has a short code
                  that rebuilds it exactly.
                </p>
              </li>
              <li className={styles.feature}>
                <h3>Faithful terminal</h3>
                <p>
                  The exam mode follows the real CBT screen: Save-to-record answers, section buttons
                  and a minutes clock.
                </p>
              </li>
            </ul>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="pattern">
            <ul className={styles.stats} aria-label="Key facts">
              <li className={styles.statTile}>
                <Stat label="Questions" value="200" hint="MCQs, 200 marks" />
              </li>
              <li className={styles.statTile}>
                <Stat label="Time" value="180 min" hint="one sitting" />
              </li>
              <li className={styles.statTile}>
                <Stat label="Options" value="4" hint="per question" />
              </li>
              <li className={styles.statTile}>
                <Stat label="Marking" value="+1 / 0" hint="1 mark each, no negative marking" />
              </li>
            </ul>

            <h3>Current papers (since NET-2025)</h3>
            <p className={styles.prose}>
              Every current NET has the same shape; only the subject mix changes with the programme
              you apply for. Weightage is the share of the 200 marks.
            </p>
            <PatternTable
              exams={CURRENT_EXAMS}
              caption="Current NET papers: sections, MCQ counts and weightage"
              practiceLinks
            />

            <details className={styles.details}>
              <summary>
                Legacy patterns (up to NET-2024)
                <span className={styles.summaryHint}>
                  Chemistry, Computer Science and Intelligence sections
                </span>
              </summary>
              <div className={styles.detailsBody}>
                <p className={styles.prose}>
                  Before 2025 the papers also tested Intelligence, and engineering candidates sat
                  Chemistry (or Computer Science for ICS). These are kept for extra practice;
                  sections are listed in terminal order.
                </p>
                <PatternTable
                  exams={LEGACY_EXAMS}
                  caption="Legacy NET papers (up to NET-2024): sections, MCQ counts and weightage"
                  practiceLinks
                />
              </div>
            </details>

            <ul className={styles.facts}>
              <li className={styles.fact}>
                <h3>Where you sit it</h3>
                <p>
                  Computer-based NET (CBNET) in <strong>Islamabad</strong> and{' '}
                  <strong>Quetta</strong>; paper-based NET (PBNET) in <strong>Karachi</strong> and{' '}
                  <strong>Gilgit</strong>.
                </p>
              </li>
              <li className={styles.fact}>
                <h3>Four series a year</h3>
                <p>
                  NET is held in four series per admission cycle, so candidates can choose when to
                  sit it.
                </p>
              </li>
              <li className={styles.fact}>
                <h3>Merit aggregate</h3>
                <p>
                  NET 75% + HSSC (FSc / A-level equivalence) 15% + SSC (Matric / O-level
                  equivalence) 10%.
                </p>
                <p className={styles.formula}>
                  e.g. NET 70%, HSSC 85%, SSC 90% → {example.toFixed(2)}%
                </p>
              </li>
              <li className={styles.fact}>
                <h3>English is SAT-pattern</h3>
                <p>
                  Vocabulary, sentence completion, analogies, grammar and short reading passages —
                  not textbook English.
                </p>
              </li>
            </ul>
            <p className={styles.fine}>
              Sources: <Ext to={OFFICIAL.weightings}>Subjects included in NET with weightings</Ext>,{' '}
              <Ext to={OFFICIAL.faq}>UG admission FAQ</Ext>,{' '}
              <Ext to={OFFICIAL.brochure}>UG Brochure 2026</Ext>. Full write-up with archived
              snapshots: <Ext to={DOCS_URL}>docs/EXAM_PATTERN.md</Ext>.
            </p>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="cbt">
            <p className={styles.prose}>
              The <strong>Exam</strong> mode reproduces the official CBNET terminal as shown in
              NUST&apos;s <Ext to={OFFICIAL.sample}>sample test</Ext> and described by candidates.
            </p>
            <ol className={styles.flow} aria-label="Sitting a paper, step by step">
              <li>
                <strong>Login</strong>
                Sign in at the User / Password box (pre-filled here), then check your details and
                the test title.
              </li>
              <li>
                <strong>Instructions</strong>
                Read the rules and the button legend, then start the test.
              </li>
              <li>
                <strong>Answer</strong>
                Work through each section; the clock runs continuously.
              </li>
              <li>
                <strong>Finish</strong>
                Submit, or the paper submits itself when time runs out.
              </li>
            </ol>

            <h3>On the exam screen</h3>
            <dl className={styles.terms}>
              <div>
                <dt>Question header</dt>
                <dd>
                  <span className={styles.cbtLabel}>Question No : 12 of 200</span>
                  <span className={styles.cbtLabel}>Marks: 1</span> and the current section name.
                </dd>
              </div>
              <div>
                <dt>Photograph panel</dt>
                <dd>
                  A photograph box sits beside the question, as on the real terminal (the simulator
                  shows your initials).
                </dd>
              </div>
              <div>
                <dt>Options</dt>
                <dd>Four options, each with a radio button.</dd>
              </div>
              <div>
                <dt>
                  <span className={styles.cbtLabel}>Save</span>
                </dt>
                <dd>
                  Records the selected option.{' '}
                  <strong>An answer counts only after you press Save</strong>; moving away discards
                  an unsaved selection.
                </dd>
              </div>
              <div>
                <dt>
                  <span className={styles.cbtLabel}>Review</span>
                </dt>
                <dd>Marks a saved question for review so you can come back to it.</dd>
              </div>
              <div>
                <dt>Navigation</dt>
                <dd>
                  <span className={styles.cbtLabel}>Next</span>
                  <span className={styles.cbtLabel}>Prev</span>
                  <span className={styles.cbtLabel}>Next Section</span>
                  <span className={styles.cbtLabel}>Prev Section</span>
                  <span className={styles.cbtLabel}>First</span>
                  <span className={styles.cbtLabel}>Last</span>
                  <span className={styles.cbtLabel}>Help</span>
                  <span className={styles.termNote}>
                    The <strong>Show</strong> and <strong>Question</strong> lists jump to any
                    question or list only attempted, unattempted or reviewable ones.
                  </span>
                </dd>
              </div>
              <div>
                <dt>Clock</dt>
                <dd>
                  Shows the start time and the minutes remaining; the paper is submitted
                  automatically at zero. As candidates describe, the question area blinks once you
                  pass the average time per question (about 54 seconds); the simulator lets you
                  switch this off.
                </dd>
              </div>
              <div>
                <dt>Finishing</dt>
                <dd>
                  <span className={styles.cbtLabel}>Click here to FINISH Your Test</span> asks for
                  confirmation: “Once you Finish the paper, You will not be able to Logon again.”
                </dd>
              </div>
            </dl>

            <h3>Simulator aids (not on the real terminal)</h3>
            <ul className={styles.aids}>
              <li className={styles.aid}>
                <h4>
                  Question navigator <Badge tone="info">Both modes</Badge>
                </h4>
                <p>
                  A colour-coded grid of all questions showing what is saved or marked. Shown in
                  Practice; off by default in Exam.
                </p>
              </li>
              <li className={styles.aid}>
                <h4>
                  Pause <Badge tone="info">Practice</Badge>
                </h4>
                <p>Stops the clock and hides the questions. The real CBT cannot be paused.</p>
              </li>
              <li className={styles.aid}>
                <h4>
                  Keyboard shortcuts <Badge tone="info">Practice</Badge>
                </h4>
                <p>Answer and move with the keyboard — see the list below.</p>
              </li>
              <li className={styles.aid}>
                <h4>
                  Instant feedback <Badge tone="info">Optional</Badge>
                </h4>
                <p>
                  Shows the correct answer as soon as you save, for learning rather than testing.
                </p>
              </li>
            </ul>

            <h3>Exam vs Practice mode</h3>
            <div className={ui.tableWrap}>
              <table className={[ui.table, styles.modeTable].join(' ')}>
                <caption className="visually-hidden">
                  Differences between exam mode and practice mode
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Behaviour</th>
                    <th scope="col">Exam</th>
                    <th scope="col">Practice</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Answers recorded</th>
                    <td>Only on Save</td>
                    <td>As soon as you select</td>
                  </tr>
                  <tr>
                    <th scope="row">Question navigator</th>
                    <td>Off by default</td>
                    <td>Shown</td>
                  </tr>
                  <tr>
                    <th scope="row">Pause</th>
                    <td>No</td>
                    <td>Yes</td>
                  </tr>
                  <tr>
                    <th scope="row">Keyboard shortcuts</th>
                    <td>No</td>
                    <td>Yes</td>
                  </tr>
                  <tr>
                    <th scope="row">Instant feedback</th>
                    <td>No</td>
                    <td>Optional</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="generator">
            <p className={styles.prose}>
              NUST does not publish past papers, so every paper here is assembled from an open bank
              of original questions by a hybrid engine.
            </p>
            <div className={styles.kinds}>
              <div className={styles.kind}>
                <h3>Parametric templates</h3>
                <p>
                  Questions with randomised values whose answer and distractors are computed — the
                  same idea, new numbers, every time.
                </p>
              </div>
              <div className={styles.kind}>
                <h3>Fixed questions</h3>
                <p>
                  Hand-written conceptual items modelled on themes that recur in candidates&apos;
                  reports of past sittings.
                </p>
              </div>
            </div>

            <h3>How a paper is built</h3>
            <ol className={styles.pipeline}>
              <li>
                <h4>Blueprint</h4>
                <p>The paper type fixes the sections and their MCQ counts (see the table above).</p>
              </li>
              <li>
                <h4>Chapter weighting</h4>
                <p>
                  Each section is spread across the syllabus by chapter weights, varied by up to
                  ±25% per paper so no two papers have quite the same emphasis. NUST publishes no
                  chapter weightages; ours are estimates from candidate reports.
                </p>
              </li>
              <li>
                <h4>Difficulty mix</h4>
                <p>
                  The NET-like default is about {easy}% easy, {medium}% medium and {hard}% hard. You
                  can choose an easier or harder mix.
                </p>
              </li>
              <li>
                <h4>Hybrid share</h4>
                <p>
                  The default share of parametric questions depends on the subject — about{' '}
                  {share('mathematics')} in Mathematics, {share('physics')} in Physics and{' '}
                  {share('chemistry')} in Chemistry (paper-level setting{' '}
                  {Math.round(NOMINAL_DYNAMIC_SHARE * 100)}%). The slider gives you more or fewer
                  questions with randomised values than this NET-like default.
                </p>
              </li>
              <li>
                <h4>Shuffle &amp; seal</h4>
                <p>
                  Options are shuffled, duplicates are avoided and the paper is given a reproducible
                  code.
                </p>
              </li>
            </ol>

            <h3>Paper codes</h3>
            <figure className={styles.codeFigure}>
              <div className={styles.code}>
                <span className={styles.codePrefix}>ENG</span>-
                <span className={styles.codeSeed}>K7Q2-9XM4</span>
              </div>
              <figcaption className={styles.codeCaption}>
                <span>
                  <strong>ENG</strong> = paper type
                </span>
                <span>
                  <strong>K7Q2-9XM4</strong> = seed
                </span>
                <span>
                  Bank version <strong>{BANK_VERSION}</strong>
                </span>
              </figcaption>
            </figure>
            <p className={styles.prose}>
              The same code and bank version always produce the same paper, so friends can sit an
              identical test or you can re-print one. When the bank is updated, an old code may
              produce a slightly different paper.
            </p>
            <ul className={styles.prefixes} aria-label="Paper code prefixes">
              {EXAM_TYPES.map((e) => (
                <li key={e.code}>
                  <code>{e.code}</code>
                  {e.name}
                </li>
              ))}
              <li>
                <code>CUS</code>
                Custom test
              </li>
            </ul>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="faq">
            <div className={styles.faq}>
              <details className={styles.faqItem}>
                <summary>Is this the real NET?</summary>
                <div className={styles.faqBody}>
                  <p>
                    No. It is an independent practice tool that copies the format and rules of the
                    computer-based NET. Your score here is an estimate of readiness, not a
                    prediction of your NET result.
                  </p>
                </div>
              </details>
              <details className={styles.faqItem}>
                <summary>Are these real past papers?</summary>
                <div className={styles.faqBody}>
                  <p>
                    No. NUST does not publish NET papers. Every question is original, written or
                    generated for this project and modelled on topics and styles that candidates
                    report recurring. Answers are computed or written independently.
                  </p>
                </div>
              </details>
              <details className={styles.faqItem}>
                <summary>Can I print a paper?</summary>
                <div className={styles.faqBody}>
                  <p>
                    Yes. Every paper has a printable version with an answer key: choose{' '}
                    <strong>Printable paper</strong> when you{' '}
                    <a href={href('/new')}>set up a new paper</a>, or{' '}
                    <strong>Printable paper + key</strong> on a result, then{' '}
                    {desktop ? (
                      <>
                        choose <strong>Print / Save as PDF</strong>: the Windows print dialog prints
                        it, or saves it as a PDF with <strong>Microsoft Print to PDF</strong>.
                      </>
                    ) : app ? (
                      <>
                        choose <strong>Print / Save as PDF</strong>: Android&apos;s print dialog
                        prints it or saves it as a PDF.
                      </>
                    ) : (
                      <>use your browser&apos;s Print or “Save as PDF”.</>
                    )}
                  </p>
                </div>
              </details>
              <details className={styles.faqItem}>
                <summary>Does it work offline?</summary>
                <div className={styles.faqBody}>
                  {app ? (
                    <p>
                      Yes. Everything the app needs is installed with it, and papers are generated
                      on your device, so no connection is needed to practise.
                    </p>
                  ) : (
                    <p>
                      Yes. After your first visit the app caches itself, and you can install it to
                      your home screen. Papers are generated on your device, so no connection is
                      needed to practise.
                    </p>
                  )}
                </div>
              </details>
              <details className={styles.faqItem}>
                <summary>What happens to my data?</summary>
                <div className={styles.faqBody}>
                  {desktop ? (
                    <p>
                      Nothing leaves this computer: there are no accounts, no tracking and no back
                      end. Attempts are stored in your Windows profile (the app&apos;s folder in
                      %APPDATA%), and the paper in progress is saved after every action so closing
                      the app does not lose it. Export, import or delete attempts on the{' '}
                      <a href={href('/history')}>History</a> page. Uninstalling keeps your history
                      for a later reinstall; delete that folder to remove everything.
                    </p>
                  ) : app ? (
                    <p>
                      Nothing leaves this device: there are no accounts, no tracking and no back
                      end. Attempts are stored in the app, and the paper in progress is saved after
                      every action so closing the app does not lose it. Export, import or delete
                      attempts on the <a href={href('/history')}>History</a> page; clearing the
                      app&apos;s storage or uninstalling it removes everything.
                    </p>
                  ) : (
                    <>
                      <p>
                        Nothing leaves your browser: there are no accounts, no tracking and no back
                        end. Attempts are stored locally (IndexedDB), and the paper in progress is
                        saved after every action so a refresh does not lose it. Export, import or
                        delete attempts on the <a href={href('/history')}>History</a> page; clearing
                        site data removes everything.
                      </p>
                      <p>
                        If your browser blocks storage (some private windows do), attempts are kept
                        only until the tab is closed, so export anything you want to keep.
                      </p>
                    </>
                  )}
                </div>
              </details>
              <details className={styles.faqItem}>
                <summary>I found a wrong answer. How do I report it?</summary>
                <div className={styles.faqBody}>
                  <p>
                    Use <strong>Report a problem</strong> on the question in the review screen or
                    the <a href={href('/bank')}>question bank</a>. It opens a pre-filled GitHub
                    issue with the paper code, bank version and question, so it can be reproduced.
                    You can also <Ext to={ISSUES_URL}>open an issue</Ext> directly.
                  </p>
                </div>
              </details>
            </div>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="shortcuts">
            <p className={styles.prose}>
              Available in <strong>Practice</strong> mode only. The real terminal is mouse-driven,
              so Exam mode keeps it that way.
            </p>
            <div className={ui.tableWrap}>
              <table className={[ui.table, styles.shortcutTable].join(' ')}>
                <caption className="visually-hidden">Keyboard shortcuts in practice mode</caption>
                <thead>
                  <tr>
                    <th scope="col">Keys</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <Keys
                        keys={[
                          ['1', '2', '3', '4'],
                          ['A', 'B', 'C', 'D'],
                        ]}
                      />
                    </td>
                    <td>Select option (A)–(D)</td>
                  </tr>
                  <tr>
                    <td>
                      <Keys keys={['Enter']} />
                    </td>
                    <td>Save the answer</td>
                  </tr>
                  <tr>
                    <td>
                      <Keys keys={[['→'], ['←']]} />
                    </td>
                    <td>Next / previous question</td>
                  </tr>
                  <tr>
                    <td>
                      <Keys keys={['R']} />
                    </td>
                    <td>Mark for review</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="credits">
            <p className={styles.prose}>
              Released under the <Ext to={LICENSE_URL}>MIT licence</Ext> by the NET CBT Simulator
              contributors. Built with React, TypeScript, Vite and KaTeX. NUST and NET are names of
              the National University of Sciences &amp; Technology, used here only to describe the
              test this tool helps you prepare for.
            </p>
            <ul className={styles.linkGrid}>
              <li>
                <a
                  className={styles.linkCard}
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.linkTitle}>
                    GitHub repository
                    <ExternalIcon />
                  </span>
                  <span className={styles.linkText}>Code, issues and releases.</span>
                  <span className="visually-hidden"> (opens {externalLinkTarget()})</span>
                </a>
              </li>
              <li>
                <a
                  className={styles.linkCard}
                  href={AUTHORING_GUIDE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.linkTitle}>
                    Contribute questions
                    <ExternalIcon />
                  </span>
                  <span className={styles.linkText}>The question-authoring guide.</span>
                  <span className="visually-hidden"> (opens {externalLinkTarget()})</span>
                </a>
              </li>
              <li>
                <a
                  className={styles.linkCard}
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.linkTitle}>
                    Exam pattern sources
                    <ExternalIcon />
                  </span>
                  <span className={styles.linkText}>
                    Current and legacy patterns, with citations.
                  </span>
                  <span className="visually-hidden"> (opens {externalLinkTarget()})</span>
                </a>
              </li>
              <li>
                <a className={styles.linkCard} href={href('/bank')}>
                  <span className={styles.linkTitle}>Question bank</span>
                  <span className={styles.linkText}>
                    Browse every template by subject and chapter.
                  </span>
                </a>
              </li>
            </ul>
            <p className={[styles.fine, styles.official].join(' ')}>
              Official information: <Ext to={OFFICIAL.weightings}>NET weightings</Ext> ·{' '}
              <Ext to={OFFICIAL.faq}>UG admission FAQ</Ext> ·{' '}
              <Ext to={OFFICIAL.sample}>official CBNET sample test</Ext>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
