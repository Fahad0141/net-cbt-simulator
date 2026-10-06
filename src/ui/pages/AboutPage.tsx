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
    <section id={sectionDomId(id)} aria-labelledby={headingDomId(id)} className={styles.section}>
      <h2 id={headingDomId(id)} className={styles.sectionTitle} tabIndex={-1}>
        {label}
      </h2>
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
                      {total} MCQs in {exam.durationMinutes} min
                    </span>
                    {practiceLinks ? (
                      <a
                        className={styles.groupLink}
                        href={href(`/new?type=${encodeURIComponent(exam.id)}`)}
                      >
                        Practise this paper<span className="visually-hidden">: {exam.name}</span>
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
        subtitle="An unofficial, open-source practice tool for NUST's computer-based Entry Test."
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
              A replica of the NUST Entry Test terminal, filled with freshly generated full-length
              papers, so you can rehearse the 200-question, 180-minute sitting as often as you like.
            </p>
            <Callout tone="warning">
              <strong>Unofficial.</strong> This project is not affiliated with, endorsed by or
              connected to the National University of Sciences &amp; Technology (NUST). Always
              confirm dates, eligibility and the paper pattern on{' '}
              <Ext to={OFFICIAL.weightings}>NUST&apos;s official website</Ext>.
            </Callout>
            <dl className={styles.points}>
              <div>
                <dt>Open source</dt>
                <dd>MIT-licensed code and questions. Anyone can check or fix an answer.</dd>
              </div>
              <div>
                <dt>Private</dt>
                <dd>
                  No accounts and no tracking. Your attempts stay{' '}
                  {app ? storagePlace() : 'in this browser'}.
                </dd>
              </div>
              <div>
                <dt>Unlimited papers</dt>
                <dd>Every paper is new, and its short code rebuilds it exactly.</dd>
              </div>
              <div>
                <dt>Faithful terminal</dt>
                <dd>Save-to-record answers, section buttons and a minutes clock.</dd>
              </div>
            </dl>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="pattern">
            <ul className={styles.stats} aria-label="Key facts">
              <li>
                <Stat label="Questions" value="200" hint="MCQs, 200 marks" />
              </li>
              <li>
                <Stat label="Time" value="180 min" hint="one sitting" />
              </li>
              <li>
                <Stat label="Options" value="4" hint="per question" />
              </li>
              <li>
                <Stat label="Marking" value="+1 / 0" hint="1 mark each, no negative marking" />
              </li>
            </ul>

            <h3>Current papers (since NET-2025)</h3>
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
                <PatternTable
                  exams={LEGACY_EXAMS}
                  caption="Legacy NET papers (up to NET-2024): sections, MCQ counts and weightage"
                  practiceLinks
                />
              </div>
            </details>

            <dl className={styles.terms}>
              <div>
                <dt>Where</dt>
                <dd>
                  Computer-based in <strong>Islamabad</strong> and <strong>Quetta</strong>;
                  paper-based in <strong>Karachi</strong> and <strong>Gilgit</strong>.
                </dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>Four series in each admission year.</dd>
              </div>
              <div>
                <dt>Merit</dt>
                <dd>
                  NET 75% + HSSC (FSc / A-level equivalence) 15% + SSC (Matric / O-level
                  equivalence) 10%.{' '}
                  <span className={styles.formula}>
                    e.g. NET 70%, HSSC 85%, SSC 90% → {example.toFixed(2)}%
                  </span>
                </dd>
              </div>
              <div>
                <dt>English</dt>
                <dd>SAT-style vocabulary, sentence completion, analogies, grammar and passages.</dd>
              </div>
            </dl>
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
              Exam mode reproduces the official CBNET terminal shown in NUST&apos;s{' '}
              <Ext to={OFFICIAL.sample}>sample test</Ext>.
            </p>
            <ol className={styles.flow} aria-label="Sitting a paper, step by step">
              <li>
                <strong>Login</strong>
                Check your details and the test title.
              </li>
              <li>
                <strong>Instructions</strong>
                Read the rules, then start.
              </li>
              <li>
                <strong>Answer</strong>
                The clock runs without a break.
              </li>
              <li>
                <strong>Finish</strong>
                Submit, or it submits itself at zero.
              </li>
            </ol>

            <h3>On the exam screen</h3>
            <dl className={styles.terms}>
              <div>
                <dt>Header</dt>
                <dd>
                  <span className={styles.cbtLabel}>Question No : 12 of 200</span>
                  <span className={styles.cbtLabel}>Marks: 1</span> and the section name, with a
                  photograph box beside the question.
                </dd>
              </div>
              <div>
                <dt>
                  <span className={styles.cbtLabel}>Save</span>
                </dt>
                <dd>
                  <strong>An answer counts only after you press Save</strong>; moving away drops an
                  unsaved choice.
                </dd>
              </div>
              <div>
                <dt>
                  <span className={styles.cbtLabel}>Review</span>
                </dt>
                <dd>Marks a saved question to come back to.</dd>
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
                    question, or to attempted, unattempted or reviewable ones.
                  </span>
                </dd>
              </div>
              <div>
                <dt>Clock</dt>
                <dd>
                  Minutes remaining, submitted at zero. The question area blinks after about 54
                  seconds on one question; you can switch that off here.
                </dd>
              </div>
              <div>
                <dt>Finishing</dt>
                <dd>
                  <span className={styles.cbtLabel}>Click here to FINISH Your Test</span> asks
                  first: “Once you Finish the paper, You will not be able to Logon again.”
                </dd>
              </div>
            </dl>

            <h3>Simulator aids (not on the real terminal)</h3>
            <ul className={styles.aids}>
              <li>
                <h4>
                  Question navigator <Badge>Both modes</Badge>
                </h4>
                <p>A grid of every question. Shown in Practice, off by default in Exam.</p>
              </li>
              <li>
                <h4>
                  Answers save on select <Badge>Practice</Badge>
                </h4>
                <p>No Save button needed.</p>
              </li>
              <li>
                <h4>
                  Pause <Badge>Practice</Badge>
                </h4>
                <p>Stops the clock and hides the questions.</p>
              </li>
              <li>
                <h4>
                  Keyboard shortcuts <Badge>Practice</Badge>
                </h4>
                <p>See the list below.</p>
              </li>
              <li>
                <h4>
                  Instant feedback <Badge>Optional</Badge>
                </h4>
                <p>Shows the right answer as soon as you save.</p>
              </li>
            </ul>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="generator">
            <p className={styles.prose}>
              NUST does not publish past papers, so every paper is assembled from an open bank of
              original questions: <strong>parametric templates</strong> that compute new values,
              answers and distractors each time, and <strong>fixed questions</strong> modelled on
              themes candidates report.
            </p>
            <ol className={styles.pipeline} aria-label="How a paper is built">
              <li>
                <h4>Blueprint</h4>
                <p>The paper type fixes the sections and their MCQ counts.</p>
              </li>
              <li>
                <h4>Chapter weighting</h4>
                <p>
                  Each section is spread over the syllabus by estimated chapter weights, varied by
                  up to ±25% per paper.
                </p>
              </li>
              <li>
                <h4>Difficulty mix</h4>
                <p>
                  About {easy}% easy, {medium}% medium and {hard}% hard by default; easier and
                  harder mixes are available.
                </p>
              </li>
              <li>
                <h4>Hybrid share</h4>
                <p>
                  Randomised questions make up about {share('mathematics')} of Mathematics,{' '}
                  {share('physics')} of Physics and {share('chemistry')} of Chemistry (paper default{' '}
                  {Math.round(NOMINAL_DYNAMIC_SHARE * 100)}%).
                </p>
              </li>
              <li>
                <h4>Shuffle &amp; seal</h4>
                <p>Options are shuffled, duplicates avoided and the paper gets its code.</p>
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
                  <strong>ENG</strong> paper type
                </span>
                <span>
                  <strong>K7Q2-9XM4</strong> seed
                </span>
                <span>
                  Bank version <strong>{BANK_VERSION}</strong>
                </span>
              </figcaption>
            </figure>
            <p className={styles.prose}>
              The same code and bank version always rebuild the same paper, so friends can sit an
              identical test.
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
                    computer-based NET. Your score here is a readiness estimate, not a prediction.
                  </p>
                </div>
              </details>
              <details className={styles.faqItem}>
                <summary>Are these real past papers?</summary>
                <div className={styles.faqBody}>
                  <p>
                    No. NUST does not publish NET papers. Every question is original, modelled on
                    topics and styles that candidates report.
                  </p>
                </div>
              </details>
              <details className={styles.faqItem}>
                <summary>Can I print a paper?</summary>
                <div className={styles.faqBody}>
                  <p>
                    Yes, with an answer key: choose <strong>Printable paper</strong> when you{' '}
                    <a href={href('/new')}>set up a new paper</a>, or{' '}
                    <strong>Printable paper + key</strong> on a result, then{' '}
                    {desktop ? (
                      <>
                        <strong>Print / Save as PDF</strong>. The Windows print dialog prints it, or
                        saves a PDF with <strong>Microsoft Print to PDF</strong>.
                      </>
                    ) : app ? (
                      <>
                        <strong>Print / Save as PDF</strong>. Android&apos;s print dialog prints it
                        or saves a PDF.
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
                    <p>Yes. Papers are generated on your device, so no connection is needed.</p>
                  ) : (
                    <p>
                      Yes. After your first visit the app caches itself and can be installed to your
                      home screen. Papers are generated on your device.
                    </p>
                  )}
                </div>
              </details>
              <details className={styles.faqItem}>
                <summary>What happens to my data?</summary>
                <div className={styles.faqBody}>
                  {desktop ? (
                    <p>
                      Nothing leaves this computer: no accounts, no tracking, no server. Attempts
                      live in your Windows profile (the app&apos;s folder in %APPDATA%), and the
                      paper in progress is saved after every action. Export, import or delete
                      attempts on the <a href={href('/history')}>History</a> page. Uninstalling
                      keeps your history; delete that folder to remove it.
                    </p>
                  ) : app ? (
                    <p>
                      Nothing leaves this device: no accounts, no tracking, no server. The paper in
                      progress is saved after every action. Export, import or delete attempts on the{' '}
                      <a href={href('/history')}>History</a> page; uninstalling removes everything.
                    </p>
                  ) : (
                    <>
                      <p>
                        Nothing leaves your browser: no accounts, no tracking, no server. Attempts
                        are stored locally, and the paper in progress is saved after every action.
                        Export, import or delete attempts on the{' '}
                        <a href={href('/history')}>History</a> page; clearing site data removes
                        everything.
                      </p>
                      <p>
                        If your browser blocks storage (some private windows do), attempts last only
                        until the tab closes, so export anything you want to keep.
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
                    issue. You can also <Ext to={ISSUES_URL}>open an issue</Ext> directly.
                  </p>
                </div>
              </details>
            </div>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section id="shortcuts">
            <p className={styles.prose}>
              Practice mode only; the real terminal is mouse-driven, so Exam mode is too.
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
              the National University of Sciences &amp; Technology, used only to describe the test.
            </p>
            <ul className={styles.links}>
              <li>
                <Ext to={REPO_URL}>GitHub repository</Ext>
              </li>
              <li>
                <Ext to={AUTHORING_GUIDE_URL}>Contribute questions</Ext>
              </li>
              <li>
                <Ext to={DOCS_URL}>Exam pattern sources</Ext>
              </li>
              <li>
                <a href={href('/bank')}>Question bank</a>
              </li>
            </ul>
            <p className={styles.fine}>
              Official information: <Ext to={OFFICIAL.weightings}>NET weightings</Ext>,{' '}
              <Ext to={OFFICIAL.faq}>UG admission FAQ</Ext>,{' '}
              <Ext to={OFFICIAL.sample}>official CBNET sample test</Ext>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
