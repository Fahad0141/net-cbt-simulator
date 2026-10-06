import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useRef,
} from 'react';
import s from './ui.module.css';

/** Shared primitives for dashboard-style pages. Import `s` for layout classes. */
// eslint-disable-next-line react-refresh/only-export-components -- small shared helper kept next to its component
export { s as ui };

type Variant = 'default' | 'primary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const buttonClass = (variant: Variant = 'default', size: Size = 'md', extra?: string) =>
  [s.button, variant !== 'default' && s[variant], size !== 'md' && s[size], extra]
    .filter(Boolean)
    .join(' ');

export function Button({
  variant,
  size,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function LinkButton({
  variant,
  size,
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }) {
  return <a className={buttonClass(variant, size, className)} {...rest} />;
}

export function Card({
  title,
  action,
  children,
  className,
  as: Tag = 'section',
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag className={[s.card, className].filter(Boolean).join(' ')}>
      {title || action ? (
        <div className={s.cardHeader}>
          {title ? <h2 className={s.cardTitle}>{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={s.pageHeader}>
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className={s.row}>{actions}</div> : null}
    </header>
  );
}

export function Badge({
  tone = 'neutral',
  children,
  title,
}: {
  tone?: 'neutral' | 'info' | 'success' | 'danger' | 'warning';
  children: ReactNode;
  title?: string;
}) {
  const toneClass = {
    neutral: '',
    info: s.badgeInfo,
    success: s.badgeSuccess,
    danger: s.badgeDanger,
    warning: s.badgeWarning,
  }[tone];
  return (
    <span className={[s.badge, toneClass].filter(Boolean).join(' ')} title={title}>
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
      {hint ? <span className={s.statHint}>{hint}</span> : null}
    </div>
  );
}

/** Horizontal bar; `value` in 0-100. Colour follows the value unless `color` is given. */
export function ProgressBar({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const fill = color ?? (v >= 70 ? 'var(--success)' : v >= 45 ? 'var(--warning)' : 'var(--danger)');
  return (
    <div
      className={s.progress}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
    >
      <div className={s.progressFill} style={{ width: `${v}%`, background: fill }} />
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className={s.field}>
      <label className={s.fieldLabel} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <span className={s.fieldHint}>{hint}</span> : null}
    </div>
  );
}

/**
 * A WAI-ARIA radio group of buttons. Only the checked option is in the tab order
 * (the first enabled one when none is checked); the arrow keys move to the
 * next / previous enabled option, wrapping, and Home / End to the first / last,
 * selecting it as focus moves.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode; disabled?: boolean }>;
  onChange: (value: T) => void;
  label: string;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.flatMap((o, i) => (o.disabled ? [] : [i]));
  const checked = options.findIndex((o) => o.value === value && !o.disabled);
  const tabStop = checked >= 0 ? checked : enabled[0];

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const at = enabled.indexOf(index);
    if (at < 0) return;
    // In a right-to-left layout the next option is on the left.
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const steps: Partial<Record<string, number>> = {
      ArrowDown: 1,
      ArrowUp: -1,
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
    };
    const step = steps[event.key];
    let next: number | undefined;
    if (step) next = enabled[(at + step + enabled.length) % enabled.length];
    else if (event.key === 'Home') next = enabled[0];
    else if (event.key === 'End') next = enabled[enabled.length - 1];
    if (next === undefined) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    const option = options[next];
    if (option && option.value !== value) onChange(option.value);
  }

  return (
    <div className={s.segmented} role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === tabStop ? 0 : -1}
          disabled={o.disabled}
          className={s.segment}
          onClick={() => onChange(o.value)}
          onKeyDown={(event) => handleKeyDown(event, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Callout({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning';
  children: ReactNode;
}) {
  return (
    <div className={[s.callout, tone === 'warning' ? s.calloutWarning : ''].join(' ')}>
      {children}
    </div>
  );
}

/** Trusted SVG figure from the question bank, on a white background in every theme. */
export function Figure({ svg, label = 'Figure' }: { svg: string; label?: string }) {
  return (
    <div
      className={s.figure}
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Formats milliseconds as `1h 05m`, `12m 30s` or `45s`. */
// eslint-disable-next-line react-refresh/only-export-components -- small shared helper kept next to its component
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

// eslint-disable-next-line react-refresh/only-export-components -- small shared helper kept next to its component
export function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
