import type { AnchorHTMLAttributes, ReactNode } from 'react';
import type { Difficulty, QuestionTemplate } from '@/engine/types';
import { externalLinkTarget } from '@/platform/links';
import { ui } from '@/ui/components/ui';
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  KIND_LABEL,
  ORIGIN_LABEL,
  questionsPerInstance,
} from './model';
import s from './bank.module.css';

/** A card section with an h3 title (the page's h2 is the subject or chapter name). */
export function Panel({
  title,
  titleId,
  action,
  children,
  className,
}: {
  title: ReactNode;
  titleId: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={[ui.card, className].filter(Boolean).join(' ')} aria-labelledby={titleId}>
      <div className={`${ui.cardHeader} ${s.panelHeader}`}>
        <h3 id={titleId} className={ui.cardTitle}>
          {title}
        </h3>
        {action ? <div className={s.panelAction}>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Link to another site, opened in a new tab and announced as such. */
export function ExternalLink({ children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="visually-hidden"> (opens {externalLinkTarget()})</span>
    </a>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`${ui.badge} ${s.difficultyBadge}`}>
      <span className={s.pips} aria-hidden="true">
        {DIFFICULTIES.map((d) => (
          <span key={d} className={d <= difficulty ? `${s.pip} ${s.pipOn}` : s.pip} />
        ))}
      </span>
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

export function KindBadge({ template }: { template: QuestionTemplate }) {
  const extra = template.kind === 'set' ? ` · ${questionsPerInstance(template)} Qs` : '';
  const tone =
    template.kind === 'dynamic' ? ui.badgeInfo : template.kind === 'set' ? s.badgeSet : '';
  return (
    <span
      className={[ui.badge, tone].filter(Boolean).join(' ')}
    >{`${KIND_LABEL[template.kind]}${extra}`}</span>
  );
}

export function OriginBadge({ template }: { template: QuestionTemplate }) {
  const past = template.origin === 'past-paper';
  return (
    <span
      className={past ? `${ui.badge} ${s.badgePast}` : ui.badge}
      title={
        past
          ? 'Modelled on a topic reported from a real NET sitting, rewritten in original words'
          : undefined
      }
    >
      {ORIGIN_LABEL[past ? 'past-paper' : 'original']}
    </span>
  );
}

/** Kind, difficulty and origin of a template. */
export function TemplateBadges({ template }: { template: QuestionTemplate }) {
  return (
    <span className={s.badges}>
      <KindBadge template={template} />
      <DifficultyBadge difficulty={template.difficulty} />
      <OriginBadge template={template} />
    </span>
  );
}

export function TagList({ tags }: { tags: readonly string[] }) {
  if (!tags.length) return null;
  return (
    <ul className={s.tags} aria-label="Tags">
      {tags.map((tag, i) => (
        <li key={`${i}:${tag}`} className={s.tag}>
          {tag}
        </li>
      ))}
    </ul>
  );
}
