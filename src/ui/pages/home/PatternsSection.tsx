import { EXAM_TYPES, type ExamTypeConfig } from '@/config/exams';
import { Badge } from '@/ui/components/ui';
import { href } from '@/ui/router';
import { IconChevron } from './icons';
import { SectionBreakdown } from './SectionBreakdown';
import s from './PatternCards.module.css';

const totalOf = (exam: ExamTypeConfig) =>
  exam.sections.reduce((sum, section) => sum + section.count, 0);

function PatternCard({ exam, showShape }: { exam: ExamTypeConfig; showShape: boolean }) {
  const titleId = `pattern-${exam.id}`;
  const legacy = exam.era === 'legacy';
  return (
    <article className={legacy ? `${s.card} ${s.cardLegacy}` : s.card} aria-labelledby={titleId}>
      <h3 id={titleId} className={s.cardTitle}>
        {exam.name}
      </h3>
      <p className={s.audience}>{exam.audience}</p>
      <SectionBreakdown sections={exam.sections} label={exam.name} />
      <footer className={s.cardFoot}>
        {showShape ? (
          <span className={s.meta}>
            {totalOf(exam)} MCQs in {exam.durationMinutes} min
          </span>
        ) : null}
        <a href={href(`/new?type=${encodeURIComponent(exam.id)}`)} className={s.practise}>
          Practise<span className="visually-hidden"> {exam.name}</span>
        </a>
      </footer>
    </article>
  );
}

/** The paper shape every current pattern shares, or null when they differ. */
function sharedShape(current: readonly ExamTypeConfig[]): string | null {
  const totals = new Set(current.map(totalOf));
  const durations = new Set(current.map((e) => e.durationMinutes));
  if (totals.size !== 1 || durations.size !== 1) return null;
  return `${[...totals][0]} MCQs in ${[...durations][0]} minutes, one mark each, no negative marking.`;
}

/** Current NET patterns as cards, plus the legacy patterns in a collapsible group. */
export function PatternsSection({ headingId }: { headingId: string }) {
  const current = EXAM_TYPES.filter((e) => e.era === 'current');
  const legacy = EXAM_TYPES.filter((e) => e.era === 'legacy');
  const shape = sharedShape(current);
  return (
    <section className={s.section} aria-labelledby={headingId}>
      <header className={s.sectionHead}>
        <h2 id={headingId}>Current NET patterns</h2>
        {shape ? <p>{shape}</p> : null}
      </header>

      <ul className={s.grid}>
        {current.map((exam) => (
          <li key={exam.id} className={s.gridItem}>
            <PatternCard exam={exam} showShape={!shape} />
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
              Extra Chemistry, Computer Science and Intelligence practice
            </span>
          </summary>
          <ul className={`${s.grid} ${s.gridLegacy}`}>
            {legacy.map((exam) => (
              <li key={exam.id} className={s.gridItem}>
                <PatternCard exam={exam} showShape />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
