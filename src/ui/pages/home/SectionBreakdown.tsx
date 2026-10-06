import type { CSSProperties } from 'react';
import type { ExamSectionConfig } from '@/config/exams';
import { sectionTint } from './tints';
import s from './PatternCards.module.css';

type Tinted = CSSProperties & { '--tint': string };

/**
 * Part-to-whole bar of a paper's sections in exam order, with a legend that carries
 * every value (the bar itself is hidden from assistive tech). Sections are told apart
 * by position, a 2px gap and an ordinal lightness ramp of the primary colour.
 */
export function SectionBreakdown({
  sections,
  label,
}: {
  sections: readonly ExamSectionConfig[];
  label: string;
}) {
  const total = sections.reduce((sum, section) => sum + section.count, 0);
  return (
    <div className={s.breakdown}>
      <div className={s.bar} aria-hidden="true">
        {sections.map((section, i) => (
          <span
            key={`${section.subject}-${i}`}
            className={s.segment}
            title={`${section.title}: ${section.count} MCQs`}
            style={{ flexGrow: section.count, '--tint': sectionTint(i, sections.length) } as Tinted}
          />
        ))}
      </div>
      <ul className={s.legend} aria-label={`${label}: ${total} MCQs by section`}>
        {sections.map((section, i) => (
          <li key={`${section.subject}-${i}`} className={s.legendItem}>
            <span
              className={s.swatch}
              style={{ '--tint': sectionTint(i, sections.length) } as Tinted}
              aria-hidden="true"
            />
            <span className={s.legendName}>{section.title}</span>
            <span className={s.legendCount}>
              {section.count}
              <span className="visually-hidden"> MCQs</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
