import { EXAM_TYPES, type ExamTypeConfig } from '@/config/exams';
import { Badge, LinkButton } from '@/ui/components/ui';
import { href } from '@/ui/router';
import { IconArrowRight, IconChevron } from './icons';
import { SectionBreakdown } from './SectionBreakdown';
import s from './PatternCards.module.css';

const totalOf = (exam: ExamTypeConfig) =>
  exam.sections.reduce((sum, section) => sum + section.count, 0);

function PatternCard({ exam }: { exam: ExamTypeConfig }) {
  const titleId = `pattern-${exam.id}`;
  const legacy = exam.era === 'legacy';
  return (
    <article className={legacy ? `${s.card} ${s.cardLegacy}` : s.card} aria-labelledby={titleId}>
      <header className={s.cardHead}>
        <h3 id={titleId} className={s.cardTitle}>
          {exam.name}
        </h3>
        <Badge title="Paper-code prefix">{exam.code}</Badge>
      </header>
      <p className={s.audience}>{exam.audience}</p>
      <SectionBreakdown sections={exam.sections} label={exam.name} />
      {exam.programmes.length ? (
        <p className={s.programmes}>
          {legacy ? null : <span className={s.programmesLabel}>Programmes include </span>}
          {exam.programmes.join(' · ')}
        </p>
      ) : null}
      <footer className={s.cardFoot}>
        <span className={s.meta}>
          {totalOf(exam)} MCQs · {exam.durationMinutes} min
        </span>
        <LinkButton
          size="sm"
          href={href(`/new?type=${encodeURIComponent(exam.id)}`)}
          className={s.practise}
        >
          Practise<span className="visually-hidden"> {exam.name}</span>
          <IconArrowRight size={16} />
        </LinkButton>
      </footer>
    </article>
  );
}

/** Lead sentence derived from the data, so it stays true if the pattern changes. */
function currentLead(current: readonly ExamTypeConfig[]): string {
  const totals = new Set(current.map(totalOf));
  const durations = new Set(current.map((e) => e.durationMinutes));
  if (totals.size === 1 && durations.size === 1) {
    return `Since 2025 every NET has ${[...totals][0]} MCQs in ${[...durations][0]} minutes, one mark each and no negative marking. Pick the paper for the programmes you are applying to.`;
  }
  return 'One mark per question and no negative marking. Pick the paper for the programmes you are applying to.';
}

/** Current NET patterns as cards, plus the legacy patterns in a collapsible group. */
export function PatternsSection({ headingId }: { headingId: string }) {
  const current = EXAM_TYPES.filter((e) => e.era === 'current');
  const legacy = EXAM_TYPES.filter((e) => e.era === 'legacy');
  return (
    <section className={s.section} aria-labelledby={headingId}>
      <header className={s.sectionHead}>
        <h2 id={headingId}>Current NET patterns</h2>
        <p>{currentLead(current)}</p>
      </header>

      <ul className={s.grid}>
        {current.map((exam) => (
          <li key={exam.id} className={s.gridItem}>
            <PatternCard exam={exam} />
          </li>
        ))}
      </ul>

      {legacy.length ? (
        <details className={s.legacy}>
          <summary className={s.legacySummary}>
            <IconChevron size={18} className={s.chevron} />
            <span className={s.legacyTitle}>Legacy (pre-2025) patterns</span>
            <Badge>{legacy.length}</Badge>
            <span className={s.legacyHint}>
              Older papers with Chemistry, Computer Science and Intelligence sections
            </span>
          </summary>
          <p className={s.legacyLead}>
            NUST replaced these patterns in 2025. They stay here for extra practice: the Computer
            Science and Intelligence sections that no current paper has, and Chemistry for
            engineering candidates.
          </p>
          <ul className={`${s.grid} ${s.gridLegacy}`}>
            {legacy.map((exam) => (
              <li key={exam.id} className={s.gridItem}>
                <PatternCard exam={exam} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
