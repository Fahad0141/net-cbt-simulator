import type { ReactNode, SVGProps } from 'react';

/** Small decorative 16px icons for the review page (always `aria-hidden`; text carries the meaning). */
function Icon({
  children,
  size = 16,
  ...rest
}: SVGProps<SVGSVGElement> & { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3.2 8.4l3 3 6.6-6.8" />
    </Icon>
  );
}

export function CrossIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  );
}

export function DashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.6" />
      <path d="M5.4 8h5.2" />
    </Icon>
  );
}

export function FlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3.5 14.5V2.5" />
      <path d="M3.5 3h8.2l-1.8 2.8 1.8 2.8H3.5" fill="currentColor" fillOpacity="0.25" />
    </Icon>
  );
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.6V8l2.3 1.6" />
    </Icon>
  );
}

export function SwapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M2.5 5.5h10l-2.5-2.5M13.5 10.5h-10l2.5 2.5" />
    </Icon>
  );
}

export function DiceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" />
      <circle cx="5.7" cy="5.7" r="0.6" fill="currentColor" />
      <circle cx="10.3" cy="10.3" r="0.6" fill="currentColor" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" />
    </Icon>
  );
}

export function ArchiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 2.5h6l2.5 2.5v8.5h-8.5z" />
      <path d="M6 7.5h4.5M6 10h4.5" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M10 3.5L5.5 8l4.5 4.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 3.5L10.5 8 6 12.5" />
    </Icon>
  );
}

export function ExternalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M9 2.5h4.5V7M13.5 2.5L7.5 8.5" />
      <path d="M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" />
    </Icon>
  );
}

/** Three signal bars, `level` of them filled (difficulty 1-3). */
export function DifficultyBars({ level }: { level: number }) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" focusable="false">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={i * 5}
          y={8 - i * 4}
          width="3.4"
          height={4 + i * 4}
          rx="1"
          fill="currentColor"
          opacity={i < level ? 1 : 0.28}
        />
      ))}
    </svg>
  );
}
