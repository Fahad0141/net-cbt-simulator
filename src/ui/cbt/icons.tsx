/**
 * Original SVG glyphs for the CBT toolbar (drawn for this project; they mirror the
 * meaning of the buttons on the real terminal without reproducing its artwork).
 */
import type { ReactElement } from 'react';

const glyph = (children: ReactElement | ReactElement[]) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const SaveGlyph = () =>
  glyph([
    <rect key="a" x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity="0.95" />,
    <rect key="b" x="7" y="3.5" width="10" height="6" rx="0.8" fill="#dfe6f2" />,
    <rect key="c" x="13.2" y="4.5" width="2.2" height="4" fill="#7c8592" />,
    <rect key="d" x="6" y="13" width="12" height="7" rx="0.8" fill="#eef2f8" />,
    <path key="e" d="M8 15.5h8M8 17.8h6" stroke="#9aa3b0" strokeWidth="0.9" />,
  ]);

export const NextGlyph = () => glyph(<path d="M8 5l10 7-10 7z" fill="currentColor" />);
export const PrevGlyph = () => glyph(<path d="M16 5L6 12l10 7z" fill="currentColor" />);
export const FirstGlyph = () =>
  glyph([
    <rect key="a" x="5" y="5" width="2.6" height="14" fill="currentColor" />,
    <path key="b" d="M19 5L9 12l10 7z" fill="currentColor" />,
  ]);
export const LastGlyph = () =>
  glyph([
    <path key="a" d="M5 5l10 7-10 7z" fill="currentColor" />,
    <rect key="b" x="16.4" y="5" width="2.6" height="14" fill="currentColor" />,
  ]);

export const ReviewGlyph = () =>
  glyph([
    <path key="a" d="M5 2.5h9.5L19 7v13.5H5z" fill="#f4f6fa" stroke="#5d6673" strokeWidth="1" />,
    <path key="b" d="M8 8h7M8 11h8M8 14h5" stroke="#6b7480" strokeWidth="1.1" />,
    <circle key="c" cx="16.5" cy="17.5" r="4.6" fill="#2f9e44" stroke="#fff" strokeWidth="1" />,
    <path
      key="d"
      d="M14.4 17.6l1.5 1.5 2.8-3"
      fill="none"
      stroke="#fff"
      strokeWidth="1.5"
      strokeLinecap="round"
    />,
  ]);

export const NextSectionGlyph = () =>
  glyph([
    <path
      key="a"
      d="M4 18c0-6 4-9 10-9h2"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />,
    <path key="b" d="M14.5 4.5L21 9l-6.5 4.5z" fill="currentColor" />,
  ]);

export const PrevSectionGlyph = () =>
  glyph([
    <path
      key="a"
      d="M20 18c0-6-4-9-10-9H8"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />,
    <path key="b" d="M9.5 4.5L3 9l6.5 4.5z" fill="currentColor" />,
  ]);

export const HelpGlyph = () =>
  glyph([
    <circle key="a" cx="12" cy="12" r="9.5" fill="#f5b52e" stroke="#9a6a07" strokeWidth="1" />,
    <path
      key="b"
      d="M9.3 9.4a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.8v.6"
      fill="none"
      stroke="#3b2a05"
      strokeWidth="1.9"
      strokeLinecap="round"
    />,
    <circle key="c" cx="12" cy="17.4" r="1.15" fill="#3b2a05" />,
  ]);

export const PauseGlyph = () =>
  glyph([
    <rect key="a" x="6" y="5" width="4" height="14" fill="currentColor" />,
    <rect key="b" x="14" y="5" width="4" height="14" fill="currentColor" />,
  ]);
export const PlayGlyph = () => glyph(<path d="M7 5l12 7-12 7z" fill="currentColor" />);
export const GridGlyph = () =>
  glyph(
    [0, 1, 2].flatMap((r) =>
      [0, 1, 2].map((c) => (
        <rect
          key={`${r}${c}`}
          x={4 + c * 6}
          y={4 + r * 6}
          width="4.4"
          height="4.4"
          rx="0.6"
          fill="currentColor"
        />
      )),
    ),
  );

/** Analogue clock face like the one beside the countdown. */
export function ClockFace({ minutesLeft }: { minutesLeft: number }) {
  // Minute hand sweeps once per hour of remaining time; purely decorative.
  const angle = ((60 - (minutesLeft % 60)) / 60) * 360;
  return (
    <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
      <circle cx="22" cy="22" r="19" fill="#fff" stroke="#333" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r1 = i % 3 === 0 ? 14 : 15.5;
        return (
          <line
            key={i}
            x1={22 + Math.sin(a) * r1}
            y1={22 - Math.cos(a) * r1}
            x2={22 + Math.sin(a) * 17}
            y2={22 - Math.cos(a) * 17}
            stroke="#333"
            strokeWidth={i % 3 === 0 ? 2 : 1}
          />
        );
      })}
      <line
        x1="22"
        y1="22"
        x2="22"
        y2="9"
        stroke="#222"
        strokeWidth="1.6"
        transform={`rotate(${angle} 22 22)`}
        strokeLinecap="round"
      />
      <line x1="22" y1="22" x2="29" y2="22" stroke="#222" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="22" cy="22" r="1.8" fill="#c00" />
    </svg>
  );
}

/** Placeholder candidate photograph. */
export function PhotoPlaceholder({ initials }: { initials: string }) {
  return (
    <svg
      viewBox="0 0 134 160"
      width="134"
      height="160"
      role="img"
      aria-label="Candidate photograph placeholder"
    >
      <rect x="1" y="1" width="132" height="158" fill="#fafbfd" stroke="#b02a3c" strokeWidth="2" />
      <circle cx="67" cy="60" r="26" fill="#cfd6e2" />
      <path d="M22 150c4-30 22-46 45-46s41 16 45 46z" fill="#cfd6e2" />
      <text
        x="67"
        y="67"
        textAnchor="middle"
        fontFamily="Arial"
        fontSize="20"
        fontWeight="bold"
        fill="#5a6474"
      >
        {initials}
      </text>
    </svg>
  );
}

export function MaximizeGlyph({ restore }: { restore: boolean }) {
  return (
    <svg viewBox="0 0 15 15" width="15" height="15" aria-hidden="true">
      <rect x="0.5" y="0.5" width="14" height="14" rx="2" fill="#2f6fd6" stroke="#174a9c" />
      {restore ? (
        <>
          <rect x="5" y="3" width="7" height="6" fill="none" stroke="#fff" strokeWidth="1.3" />
          <rect x="3" y="6" width="7" height="6" fill="#2f6fd6" stroke="#fff" strokeWidth="1.3" />
        </>
      ) : (
        <rect x="3.5" y="3.5" width="8" height="8" fill="none" stroke="#fff" strokeWidth="1.6" />
      )}
    </svg>
  );
}
