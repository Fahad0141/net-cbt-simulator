/**
 * Fundamentals of Trigonometry (FSc Part I): angle measure (sexagesimal and circular
 * systems, coterminal and quadrantal angles), conversion between degrees and radians,
 * arc length and sector area (l = r theta, A = r^2 theta / 2), the six trigonometric
 * ratios of an angle in standard position, their values at 30, 45 and 60 degrees and at
 * the quadrantal angles, their signs in the four quadrants and the fundamental
 * (Pythagorean) identities.
 */
import { defineBank } from '@/engine/authoring';
import type { Fraction, TrigFn } from '@/engine/helpers';
import {
  exactTrig,
  frac,
  gcd,
  normalizeOption,
  num,
  numericOptions,
  pickDistractors,
  radianTex,
  range,
  signedSum,
  tex,
} from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// --------------------------------------------------------------------------- helpers

type Quadrant = 1 | 2 | 3 | 4;

/** A point on the terminal side of an angle: coordinates and distance from the origin. */
interface Point {
  x: number;
  y: number;
  r: number;
}

const FN: Record<TrigFn, string> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  cot: '\\cot',
  sec: '\\sec',
  csc: '\\csc',
};
const ALL_FNS: readonly TrigFn[] = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc'];
const RECIPROCAL: Record<TrigFn, TrigFn> = { sin: 'csc', csc: 'sin', cos: 'sec', sec: 'cos', tan: 'cot', cot: 'tan' };
/** The ratio a student confuses with this one at quadrantal angles (sin/cos, tan/cot, sec/csc). */
const PARTNER: Record<TrigFn, TrigFn> = { sin: 'cos', cos: 'sin', tan: 'cot', cot: 'tan', sec: 'csc', csc: 'sec' };
/** A ratio and its reciprocal always share a sign; ratios from different families never fix the same quadrants. */
const FAMILIES: readonly (readonly [TrigFn, TrigFn])[] = [
  ['sin', 'csc'],
  ['cos', 'sec'],
  ['tan', 'cot'],
];
/** Sign of each ratio in quadrants I, II, III, IV (All, Sin, Tan, Cos). */
const SIGN: Record<TrigFn, readonly [number, number, number, number]> = {
  sin: [1, 1, -1, -1],
  csc: [1, 1, -1, -1],
  cos: [1, -1, -1, 1],
  sec: [1, -1, -1, 1],
  tan: [1, -1, 1, -1],
  cot: [1, -1, 1, -1],
};
const QUADRANTS: readonly Quadrant[] = [1, 2, 3, 4];
const QUADRANT_WORD: Record<Quadrant, string> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth' };
const ROMAN: Record<Quadrant, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
/** Bounds of each quadrant in degrees and in radians (with decimal approximations). */
const DEGREE_BOUNDS: Record<Quadrant, readonly [string, string]> = {
  1: ['0^{\\circ}', '90^{\\circ}'],
  2: ['90^{\\circ}', '180^{\\circ}'],
  3: ['180^{\\circ}', '270^{\\circ}'],
  4: ['270^{\\circ}', '360^{\\circ}'],
};
const RADIAN_BOUNDS: Record<Quadrant, readonly [string, string]> = {
  1: ['0', '\\frac{\\pi}{2} \\approx 1.57'],
  2: ['\\frac{\\pi}{2} \\approx 1.57', '\\pi \\approx 3.14'],
  3: ['\\pi \\approx 3.14', '\\frac{3\\pi}{2} \\approx 4.71'],
  4: ['\\frac{3\\pi}{2} \\approx 4.71', '2\\pi \\approx 6.28'],
};

const signOf = (f: TrigFn, q: Quadrant): number => SIGN[f][q - 1];
const rel = (sign: number): string => (sign > 0 ? '>' : '<');
const inline = (latex: string): string => `$${latex}$`;
const quadrantOption = (q: Quadrant): string => `${QUADRANT_WORD[q]} quadrant`;
const romanList = (qs: readonly Quadrant[]): string => qs.map((q) => ROMAN[q]).join(' and ');

/** Quadrant containing the terminal side of a non-quadrantal angle given in degrees. */
function quadrantOfDegrees(deg: number): Quadrant {
  const a = ((deg % 360) + 360) % 360;
  if (a < 90) return 1;
  if (a < 180) return 2;
  if (a < 270) return 3;
  return 4;
}

/** c * pi as LaTeX: 5/12 -> \frac{5\pi}{12}, 2 -> 2\pi, -1/2 -> -\frac{\pi}{2}. */
function piTex(c: Fraction): string {
  if (c.isZero()) return '0';
  const sign = c.sign() < 0 ? '-' : '';
  const n = Math.abs(c.n);
  const top = n === 1 ? '\\pi' : `${n}\\pi`;
  return c.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${c.d}}`;
}

/** c / pi as LaTeX: 6/7 -> \frac{6}{7\pi}. */
function overPiTex(c: Fraction): string {
  const sign = c.sign() < 0 ? '-' : '';
  const bottom = c.d === 1 ? '\\pi' : `${c.d}\\pi`;
  return `${sign}\\frac{${Math.abs(c.n)}}{${bottom}}`;
}

/** An angle in degrees written as D°M'S'' (exact for whole seconds): 22.5 -> 22°30'. */
function dmsTex(deg: number): string {
  const total = Math.round(Math.abs(deg) * 3600);
  const d = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  let out = `${deg < 0 ? '-' : ''}${d}^{\\circ}`;
  if (m || s) out += `\\,${m}'`;
  if (s) out += `\\,${s}''`;
  return out;
}

interface FracOptionsSpec {
  correct: Fraction;
  /** Values from plausible mistakes, best first; `null` entries (undefined slips) are skipped. */
  wrong: readonly (Fraction | null)[];
  format: (value: Fraction) => string;
  allowNegative?: boolean;
  allowZero?: boolean;
}

/** Exact-fraction counterpart of `numericOptions`: mistake-based distractors first, then nearby values. */
function fracOptions(r: Rng, spec: FracOptionsSpec): { answer: string; distractors: string[] } {
  const { correct, format, allowNegative = false, allowZero = false } = spec;
  const answer = format(correct);
  const seen = new Set([normalizeOption(answer)]);
  const distractors: string[] = [];
  const consider = (value: Fraction | null): void => {
    if (!value || distractors.length >= 3) return;
    if (value.equals(correct)) return;
    if (value.isZero() && !allowZero) return;
    if (value.sign() < 0 && correct.sign() > 0 && !allowNegative) return;
    const text = format(value);
    const key = normalizeOption(text);
    if (seen.has(key)) return;
    seen.add(key);
    distractors.push(text);
  };
  spec.wrong.forEach(consider);
  const factors = r.shuffle([frac(2), frac(1, 2), frac(3, 2), frac(2, 3), frac(3), frac(1, 3), frac(4, 3), frac(3, 4)]);
  factors.forEach((k) => consider(correct.mul(k)));
  [1, -1, 2, -2, 3, -3].forEach((k) => consider(correct.add(k)));
  if (distractors.length < 3) {
    throw new Error(`fracOptions: could not build 3 distractors for ${correct.toString()}`);
  }
  return { answer, distractors };
}

/** Numerator and denominator of a ratio at a point (x, y) at distance r from the origin. */
function ratioParts(f: TrigFn, p: Point): [number, number] {
  switch (f) {
    case 'sin':
      return [p.y, p.r];
    case 'cos':
      return [p.x, p.r];
    case 'tan':
      return [p.y, p.x];
    case 'cot':
      return [p.x, p.y];
    case 'sec':
      return [p.r, p.x];
    case 'csc':
      return [p.r, p.y];
  }
}

const ratioAt = (f: TrigFn, p: Point): Fraction => {
  const [top, bottom] = ratioParts(f, p);
  return frac(top, bottom);
};

const RATIO_DEF: Record<TrigFn, string> = {
  sin: '\\frac{y}{r}',
  cos: '\\frac{x}{r}',
  tan: '\\frac{y}{x}',
  cot: '\\frac{x}{y}',
  sec: '\\frac{r}{x}',
  csc: '\\frac{r}{y}',
};

/** `a(p) + b(q)` for showing a substitution, e.g. `3(2) - 5(7)`. */
const linearSub = (a: number, p: number, b: number, q: number): string =>
  `${a}(${p}) ${b < 0 ? '-' : '+'} ${Math.abs(b)}(${q})`;

/** `raw = simplified`, or just `raw` when it is already in simplest form (avoids "= 3/4 = 3/4"). */
const thenReduced = (raw: string, simplified: string): string => (raw === simplified ? raw : `${raw} = ${simplified}`);

// --------------------------------------------------------------------------- data

/** Whole-degree angles whose radian measure is a simple multiple of pi (non-quadrantal). */
const CONVERSION_DEGREES: readonly number[] = range(1, 359).filter(
  (d) => d % 90 !== 0 && (d % 15 === 0 || d % 18 === 0 || d % 20 === 0),
);
/** k such that 15k/4 degrees (= k pi / 48) is not a whole number of degrees: 3°45', 7°30', 11°15', ... */
const DMS_STEPS: readonly number[] = range(1, 71).filter((k) => k % 4 !== 0);

const ARC_ANGLES: readonly number[] = [30, 36, 40, 45, 60, 72, 75, 80, 90, 100, 108, 120, 135, 144, 150, 160, 210, 225, 240, 270, 300];
const SECTOR_ANGLES: readonly number[] = [30, 36, 40, 45, 60, 72, 90, 120, 135, 144, 150, 210, 240, 270, 300];
const RATIO_ANGLES: readonly number[] = [30, 36, 40, 45, 60, 72, 75, 90, 100, 120, 135, 150];
const CLOCK_MINUTES: readonly number[] = [5, 10, 12, 15, 18, 20, 24, 25, 30, 35, 36, 40, 45, 48, 50, 55];
/** Minutes past the hour (even, so the hands' angle is a whole number of degrees). */
const CLOCK_TIMES: readonly number[] = [6, 10, 12, 18, 20, 24, 30, 36, 40, 42, 48, 50, 54];
const TRACK_RADII: readonly number[] = [100, 120, 150, 200, 240, 250, 300, 360, 400, 450, 500, 600, 750, 800, 900, 1000, 1200, 1500];
const TRACK_TIMES: readonly number[] = [4, 5, 6, 8, 10, 12, 15, 20, 24, 30];
/** Integer radian measures whose terminal side is at least 0.1 rad away from an axis. */
const WHOLE_RADIANS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, -1, -2, -3, -4, -5];

/** Central angles (radians) used when an angle is found from a length or an area. */
const THETA_RADIANS: readonly Fraction[] = [
  frac(1, 2), frac(2, 3), frac(3, 4), frac(4, 5), frac(5, 4), frac(4, 3), frac(3, 2),
  frac(5, 3), frac(2), frac(5, 2), frac(3), frac(7, 4), frac(6, 5), frac(7, 5),
];
const AREA_THETAS: readonly Fraction[] = [
  frac(1, 2), frac(2, 3), frac(3, 4), frac(4, 5), frac(1), frac(6, 5), frac(5, 4),
  frac(4, 3), frac(3, 2), frac(5, 3), frac(2), frac(5, 2), frac(3),
];

/**
 * Primitive Pythagorean triples [leg, leg, hypotenuse] whose missing side is quick to find
 * mentally (e.g. 41^2 - 40^2 = 81); larger triples such as 65-72-97 are not NET-style arithmetic.
 */
const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [12, 35, 37], [9, 40, 41],
];

/** Fractions p/q (q <= 9) with 0 < p/q < sqrt 2 and p != q: admissible values of sin x +/- cos x. */
const SUM_VALUES: readonly Fraction[] = range(2, 9).flatMap((q) =>
  range(1, Math.floor(q * Math.SQRT2))
    .filter((p) => p !== q && gcd(p, q) === 1)
    .map((p) => frac(p, q)),
);
/** Fractions m = p/q (q <= 9) with 0 < m <= 1/2: admissible values of sin x cos x. */
const PRODUCT_VALUES: readonly Fraction[] = range(2, 9).flatMap((q) =>
  range(1, Math.floor(q / 2))
    .filter((p) => gcd(p, q) === 1)
    .map((p) => frac(p, q)),
);

/** Values for the "impossible value" question. */
interface Val {
  tex: string;
  v: number;
}
/** |v| < 1 (possible for sin and cos, impossible for sec and csc). */
const SMALL_VALUES: readonly Val[] = [
  { tex: tex`\frac{2}{3}`, v: 2 / 3 },
  { tex: tex`-\frac{3}{4}`, v: -3 / 4 },
  { tex: tex`\frac{\sqrt{3}}{2}`, v: Math.sqrt(3) / 2 },
  { tex: tex`-\frac{1}{\sqrt{2}}`, v: -Math.SQRT1_2 },
  { tex: tex`\frac{\pi}{4}`, v: Math.PI / 4 },
  { tex: tex`\frac{5}{7}`, v: 5 / 7 },
  { tex: tex`-\frac{1}{3}`, v: -1 / 3 },
  { tex: tex`\frac{\sqrt{2}}{3}`, v: Math.SQRT2 / 3 },
  { tex: tex`\frac{1}{\pi}`, v: 1 / Math.PI },
  { tex: '0.99', v: 0.99 },
  { tex: tex`-\frac{\sqrt{5}}{3}`, v: -Math.sqrt(5) / 3 },
  { tex: tex`\frac{\pi}{6}`, v: Math.PI / 6 },
  { tex: '0', v: 0 },
];
/** |v| > 1 (possible for sec and csc, impossible for sin and cos). */
const LARGE_VALUES: readonly Val[] = [
  { tex: tex`\frac{4}{3}`, v: 4 / 3 },
  { tex: tex`-\frac{5}{2}`, v: -5 / 2 },
  { tex: tex`\sqrt{2}`, v: Math.SQRT2 },
  { tex: tex`-\frac{2}{\sqrt{3}}`, v: -2 / Math.sqrt(3) },
  { tex: tex`\frac{\pi}{2}`, v: Math.PI / 2 },
  { tex: tex`\frac{\pi}{3}`, v: Math.PI / 3 },
  { tex: tex`\frac{\sqrt{5}}{2}`, v: Math.sqrt(5) / 2 },
  { tex: tex`-\frac{7}{5}`, v: -7 / 5 },
  { tex: '1.01', v: 1.01 },
  { tex: tex`\sqrt{3}`, v: Math.sqrt(3) },
  { tex: tex`-\pi`, v: -Math.PI },
  { tex: tex`\frac{3}{2}`, v: 3 / 2 },
];
/** |v| = 1 (possible for all six ratios). */
const UNIT_VALUES: readonly Val[] = [
  { tex: '1', v: 1 },
  { tex: '-1', v: -1 },
];

/** Expressions that reduce, by the fundamental identities, to one simple form. */
interface IdentityItem {
  expr: string;
  answer: string;
  /** Plausible wrong simplifications (none identically equal to the answer or to each other). */
  wrong: readonly string[];
  /** Working, written as the right-hand side of `expr = ...`, ending with the answer. */
  steps: string;
}
const IDENTITIES: readonly IdentityItem[] = [
  {
    expr: tex`(1 - \sin^{2}\theta)(1 + \tan^{2}\theta)`,
    answer: '1',
    wrong: [tex`\cos^{2}\theta`, tex`\sec^{2}\theta`, tex`\tan^{2}\theta`],
    steps: tex`\cos^{2}\theta \cdot \sec^{2}\theta = 1`,
  },
  {
    expr: tex`(\sec^{2}\theta - 1)\cos^{2}\theta`,
    answer: tex`\sin^{2}\theta`,
    wrong: [tex`\cos^{2}\theta`, tex`\tan^{2}\theta`, '1'],
    steps: tex`\tan^{2}\theta\cos^{2}\theta = \frac{\sin^{2}\theta}{\cos^{2}\theta} \cdot \cos^{2}\theta = \sin^{2}\theta`,
  },
  {
    expr: tex`(\csc^{2}\theta - 1)\sin^{2}\theta`,
    answer: tex`\cos^{2}\theta`,
    wrong: [tex`\sin^{2}\theta`, tex`\cot^{2}\theta`, '1'],
    steps: tex`\cot^{2}\theta\sin^{2}\theta = \frac{\cos^{2}\theta}{\sin^{2}\theta} \cdot \sin^{2}\theta = \cos^{2}\theta`,
  },
  {
    expr: tex`(1 + \cot^{2}\theta)\tan^{2}\theta`,
    answer: tex`\sec^{2}\theta`,
    wrong: [tex`\csc^{2}\theta`, '1', tex`\cot^{2}\theta`],
    steps: tex`\tan^{2}\theta + \cot^{2}\theta\tan^{2}\theta = \tan^{2}\theta + 1 = \sec^{2}\theta`,
  },
  {
    expr: tex`(1 + \tan^{2}\theta)\cot^{2}\theta`,
    answer: tex`\csc^{2}\theta`,
    wrong: [tex`\sec^{2}\theta`, '1', tex`\tan^{2}\theta`],
    steps: tex`\cot^{2}\theta + \tan^{2}\theta\cot^{2}\theta = \cot^{2}\theta + 1 = \csc^{2}\theta`,
  },
  {
    expr: tex`\cos\theta(\sec\theta - \cos\theta)`,
    answer: tex`\sin^{2}\theta`,
    wrong: [tex`\cos^{2}\theta`, tex`\tan^{2}\theta`, '1'],
    steps: tex`\cos\theta\sec\theta - \cos^{2}\theta = 1 - \cos^{2}\theta = \sin^{2}\theta`,
  },
  {
    expr: tex`\sin\theta(\csc\theta - \sin\theta)`,
    answer: tex`\cos^{2}\theta`,
    wrong: [tex`\sin^{2}\theta`, tex`\cot^{2}\theta`, '1'],
    steps: tex`\sin\theta\csc\theta - \sin^{2}\theta = 1 - \sin^{2}\theta = \cos^{2}\theta`,
  },
  {
    expr: tex`\sec\theta - \sin\theta\tan\theta`,
    answer: tex`\cos\theta`,
    wrong: [tex`\sin\theta`, tex`\sec\theta`, tex`\tan\theta`],
    steps: tex`\frac{1}{\cos\theta} - \frac{\sin^{2}\theta}{\cos\theta} = \frac{\cos^{2}\theta}{\cos\theta} = \cos\theta`,
  },
  {
    expr: tex`\csc\theta - \cos\theta\cot\theta`,
    answer: tex`\sin\theta`,
    wrong: [tex`\cos\theta`, tex`\csc\theta`, tex`\cot\theta`],
    steps: tex`\frac{1}{\sin\theta} - \frac{\cos^{2}\theta}{\sin\theta} = \frac{\sin^{2}\theta}{\sin\theta} = \sin\theta`,
  },
  {
    expr: tex`\sin^{2}\theta + \sin^{2}\theta\cot^{2}\theta`,
    answer: '1',
    wrong: [tex`\sin^{2}\theta`, tex`\cos^{2}\theta`, tex`\csc^{2}\theta`],
    steps: tex`\sin^{2}\theta(1 + \cot^{2}\theta) = \sin^{2}\theta\csc^{2}\theta = 1`,
  },
  {
    expr: tex`(\sin\theta + \cos\theta)^{2} + (\sin\theta - \cos\theta)^{2}`,
    answer: '2',
    wrong: ['1', '0', tex`4\sin\theta\cos\theta`],
    steps: tex`2\sin^{2}\theta + 2\cos^{2}\theta = 2`,
  },
  {
    expr: tex`(\sec\theta - \tan\theta)(\sec\theta + \tan\theta)`,
    answer: '1',
    wrong: ['-1', '0', tex`\sec^{2}\theta + \tan^{2}\theta`],
    steps: tex`\sec^{2}\theta - \tan^{2}\theta = 1`,
  },
  {
    expr: tex`\tan\theta + \cot\theta`,
    answer: tex`\sec\theta\csc\theta`,
    wrong: ['1', tex`\sin\theta\cos\theta`, tex`\sec\theta + \csc\theta`],
    steps: tex`\frac{\sin^{2}\theta + \cos^{2}\theta}{\sin\theta\cos\theta} = \frac{1}{\sin\theta\cos\theta} = \sec\theta\csc\theta`,
  },
  {
    expr: tex`\sec^{2}\theta + \csc^{2}\theta`,
    answer: tex`\sec^{2}\theta\csc^{2}\theta`,
    wrong: ['1', tex`\sec\theta\csc\theta`, tex`\tan^{2}\theta + \cot^{2}\theta`],
    steps: tex`\frac{\sin^{2}\theta + \cos^{2}\theta}{\sin^{2}\theta\cos^{2}\theta} = \frac{1}{\sin^{2}\theta\cos^{2}\theta} = \sec^{2}\theta\csc^{2}\theta`,
  },
  {
    expr: tex`\frac{1}{1 + \sin\theta} + \frac{1}{1 - \sin\theta}`,
    answer: tex`2\sec^{2}\theta`,
    wrong: ['2', tex`\sec^{2}\theta`, tex`2\cos^{2}\theta`],
    steps: tex`\frac{2}{1 - \sin^{2}\theta} = \frac{2}{\cos^{2}\theta} = 2\sec^{2}\theta`,
  },
  {
    expr: tex`\frac{1}{1 + \cos\theta} + \frac{1}{1 - \cos\theta}`,
    answer: tex`2\csc^{2}\theta`,
    wrong: ['2', tex`\csc^{2}\theta`, tex`2\sin^{2}\theta`],
    steps: tex`\frac{2}{1 - \cos^{2}\theta} = \frac{2}{\sin^{2}\theta} = 2\csc^{2}\theta`,
  },
  {
    expr: tex`\sec^{4}\theta - \tan^{4}\theta`,
    answer: tex`\sec^{2}\theta + \tan^{2}\theta`,
    wrong: ['1', tex`\sec^{2}\theta\tan^{2}\theta`, tex`2\tan^{2}\theta`],
    steps: tex`(\sec^{2}\theta - \tan^{2}\theta)(\sec^{2}\theta + \tan^{2}\theta) = \sec^{2}\theta + \tan^{2}\theta`,
  },
  {
    expr: tex`\tan^{2}\theta - \sin^{2}\theta`,
    answer: tex`\tan^{2}\theta\sin^{2}\theta`,
    wrong: [tex`\cos^{2}\theta`, tex`\sec^{2}\theta`, tex`\tan^{2}\theta\cos^{2}\theta`],
    steps: tex`\sin^{2}\theta\left(\frac{1}{\cos^{2}\theta} - 1\right) = \sin^{2}\theta(\sec^{2}\theta - 1) = \tan^{2}\theta\sin^{2}\theta`,
  },
  {
    expr: tex`\cot^{2}\theta - \cos^{2}\theta`,
    answer: tex`\cot^{2}\theta\cos^{2}\theta`,
    wrong: [tex`\sin^{2}\theta`, '1', tex`\cot^{2}\theta\sin^{2}\theta`],
    steps: tex`\cos^{2}\theta\left(\frac{1}{\sin^{2}\theta} - 1\right) = \cos^{2}\theta(\csc^{2}\theta - 1) = \cot^{2}\theta\cos^{2}\theta`,
  },
  {
    expr: tex`(1 + \tan\theta)^{2} + (1 - \tan\theta)^{2}`,
    answer: tex`2\sec^{2}\theta`,
    wrong: ['2', tex`\sec^{2}\theta`, tex`2\tan^{2}\theta`],
    steps: tex`2 + 2\tan^{2}\theta = 2(1 + \tan^{2}\theta) = 2\sec^{2}\theta`,
  },
  {
    expr: tex`\sin^{4}\theta + \sin^{2}\theta\cos^{2}\theta`,
    answer: tex`\sin^{2}\theta`,
    wrong: [tex`\cos^{2}\theta`, '1', tex`\tan^{2}\theta`],
    steps: tex`\sin^{2}\theta(\sin^{2}\theta + \cos^{2}\theta) = \sin^{2}\theta`,
  },
  {
    expr: tex`\frac{\sin\theta}{\csc\theta} + \frac{\cos\theta}{\sec\theta}`,
    answer: '1',
    wrong: ['2', '0', tex`\tan\theta + \cot\theta`],
    steps: tex`\sin\theta \cdot \sin\theta + \cos\theta \cdot \cos\theta = \sin^{2}\theta + \cos^{2}\theta = 1`,
  },
  {
    expr: tex`\cot\theta\sec\theta`,
    answer: tex`\csc\theta`,
    wrong: [tex`\sec\theta`, tex`\sin\theta`, tex`\tan\theta`],
    steps: tex`\frac{\cos\theta}{\sin\theta} \cdot \frac{1}{\cos\theta} = \frac{1}{\sin\theta} = \csc\theta`,
  },
  {
    expr: tex`\frac{\tan\theta}{\sec\theta}`,
    answer: tex`\sin\theta`,
    wrong: [tex`\cos\theta`, tex`\csc\theta`, tex`\cot\theta`],
    steps: tex`\frac{\sin\theta}{\cos\theta} \cdot \cos\theta = \sin\theta`,
  },
];

// --------------------------------------------------------------------------- bank

export default defineBank('mathematics', 'trigonometry-fundamentals', (b) => [
  // ------------------------------------------------------------ radians and degrees
  b.dynamic(
    'angle-conversion',
    { difficulty: 1, origin: 'past-paper', tags: ['radians and degrees', 'angle measure'] },
    (r) => {
      const mode = r.weighted(['deg-to-rad', 'rad-to-deg', 'dms-to-rad', 'rad-to-dms'] as const, [4, 3, 2, 1.5]);
      const piOption = (c: Fraction): string => inline(piTex(c));

      if (mode === 'deg-to-rad') {
        const d = r.pick(CONVERSION_DEGREES) * (r.chance(0.2) ? -1 : 1);
        const c = frac(d, 180);
        const answer = piOption(c);
        // used pi = 360, used pi = 90, inverted the fraction, then supplement / explement / dropped sign
        const fourth = d < 0 ? c.neg() : d < 180 ? frac(1).sub(c) : frac(2).sub(c);
        return {
          stem: tex`The radian measure of an angle of $${d}^{\circ}$ is:`,
          answer,
          distractors: pickDistractors(answer, [c.div(2), c.mul(2), c.inv(), fourth].map(piOption)),
          explanation: tex`Since $180^{\circ} = \pi$ radians, multiply by $\frac{\pi}{180}$: $${d}^{\circ} = ${d} \times \frac{\pi}{180} = ${piTex(c)}$ radians.`,
        };
      }

      if (mode === 'rad-to-deg') {
        const d = r.pick(CONVERSION_DEGREES);
        const c = frac(d, 180);
        const option = (x: number): string => inline(`${num(x, { dp: 2 })}^{\\circ}`);
        const answer = option(d);
        // used pi = 360, used pi = 90, confused with the supplement / explement
        const candidates = [2 * d, d / 2, d < 180 ? 180 - d : 360 - d, d + 180];
        return {
          stem: tex`An angle of $${piTex(c)}$ radians is equal to:`,
          answer,
          distractors: pickDistractors(answer, candidates.map(option)),
          explanation: tex`Replace $\pi$ by $180^{\circ}$: $${piTex(c)} = ${c.toTex()} \times 180^{\circ} = ${d}^{\circ}$.`,
        };
      }

      const k = r.pick(mode === 'dms-to-rad' ? DMS_STEPS : DMS_STEPS.filter((s) => s < 48));
      const deg = (15 * k) / 4;
      const whole = Math.floor(deg);
      const part = deg - whole; // 0.25, 0.5 or 0.75
      const minutes = Math.round(part * 60);
      const c = frac(k, 48);

      if (mode === 'dms-to-rad') {
        const answer = piOption(c);
        return {
          stem: tex`The angle $${dmsTex(deg)}$ expressed in radians is:`,
          answer,
          // ignored the minutes, used pi = 360, used pi = 90
          distractors: pickDistractors(answer, [frac(whole, 180), frac(k, 96), frac(k, 24)].map(piOption)),
          explanation: tex`$${dmsTex(deg)} = \left(${whole} + \frac{${minutes}}{60}\right)^{\circ} = ${num(deg, { dp: 2 })}^{\circ}$, so in radians it is $${num(deg, { dp: 2 })} \times \frac{\pi}{180} = ${piTex(c)}$.`,
        };
      }

      const option = (x: number): string => inline(dmsTex(x));
      const answer = option(deg);
      // read the decimal part as minutes (0.5 -> 50'), used pi = 360, used pi = 90
      const misread = whole + (part * 100) / 60;
      return {
        stem: tex`An angle of $${piTex(c)}$ radians is equal to:`,
        answer,
        distractors: pickDistractors(answer, [misread, 2 * deg, deg / 2].map(option)),
        explanation: tex`$${piTex(c)} \times \frac{180^{\circ}}{\pi} = ${num(deg, { dp: 2 })}^{\circ}$, and $${num(part, { dp: 2 })}^{\circ} = ${num(part, { dp: 2 })} \times 60' = ${minutes}'$. So the angle is $${dmsTex(deg)}$.`,
      };
    },
  ),

  // ------------------------------------------------------------ arc length
  b.dynamic('arc-length', { difficulty: 1, origin: 'past-paper', tags: ['arc length and sector area'] }, (r) => {
    const unit = r.pick(['cm', 'cm', 'm'] as const);
    const u = (x: string | number): string => `${x}\\,\\mathrm{${unit}}`;
    const mode = r.weighted(['find-length', 'find-angle', 'find-radius'] as const, [4.5, 3, 2.5]);

    if (mode === 'find-length') {
      const deg = r.pick(ARC_ANGLES);
      const radius = r.pick(range(3, 24).filter((x) => frac(x * deg, 180).d <= 4));
      const c = frac(radius * deg, 180);
      const option = (x: Fraction): string => inline(u(piTex(x)));
      const answer = option(c);
      const candidates = [
        inline(u(radius * deg)), // multiplied by the angle in degrees
        option(frac(radius * radius * deg, 360)), // used the sector-area formula
        option(c.mul(2)), // used the diameter
        option(c.div(2)),
      ];
      return {
        stem: tex`The length of an arc of a circle of radius $${u(radius)}$ that subtends an angle of $${deg}^{\circ}$ at the centre is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`First convert the angle to radians: $${deg}^{\circ} = ${radianTex(deg)}$. Then $l = r\theta = ${radius} \times ${radianTex(deg)} = ${u(piTex(c))}$.`,
      };
    }

    if (mode === 'find-angle') {
      const theta = r.pick(THETA_RADIANS);
      const mult = r.int(Math.ceil(3 / theta.d), Math.floor(30 / theta.d));
      const radius = theta.d * mult;
      const length = theta.n * mult;
      const { answer, distractors } = fracOptions(r, {
        correct: theta,
        // r / l (inverted), used the diameter, doubled, multiplied l by r
        wrong: [theta.inv(), theta.div(2), theta.mul(2), frac(length * radius)],
        format: (x) => inline(`${x.toTex()}\\,\\mathrm{rad}`),
      });
      return {
        stem: tex`An arc of length $${u(length)}$ subtends an angle $\theta$ at the centre of a circle of radius $${u(radius)}$. The value of $\theta$ is:`,
        answer,
        distractors,
        explanation: tex`$\theta = \frac{l}{r} = ${thenReduced(`\\frac{${length}}{${radius}}`, theta.toTex())}\,\mathrm{rad}$.`,
      };
    }

    const deg = r.pick(ARC_ANGLES);
    const radius = r.pick(range(3, 30).filter((x) => frac(x * deg, 180).d <= 4));
    const c = frac(radius * deg, 180);
    const option = (x: number): string => inline(u(num(x, { dp: 2 })));
    const answer = option(radius);
    const candidates = [
      option(2 * radius), // used pi = 360 when converting
      option(radius / 2), // used pi = 90 when converting
      inline(u(piTex(frac(radius, 180)))), // divided by the angle in degrees
    ];
    return {
      stem: tex`An arc of length $${u(piTex(c))}$ subtends an angle of $${deg}^{\circ}$ at the centre of a circle. The radius of the circle is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`$\theta = ${deg}^{\circ} = ${radianTex(deg)}$, so $r = \frac{l}{\theta} = \frac{${piTex(c)}}{${radianTex(deg)}} = ${u(radius)}$.`,
    };
  }),

  // ------------------------------------------------------------ quadrants and signs
  b.dynamic('quadrant-signs', { difficulty: 1, tags: ['signs in quadrants', 'angle measure'] }, (r) => {
    const mode = r.weighted(
      ['two-signs', 'positive-ratio', 'which-negative', 'degree-angle', 'radian-angle'] as const,
      [3, 1.5, 2, 2, 1.5],
    );
    const quadrantChoices = (q: Quadrant) => ({
      answer: quadrantOption(q),
      distractors: QUADRANTS.filter((x) => x !== q).map(quadrantOption),
    });

    if (mode === 'two-signs') {
      const q = r.pick(QUADRANTS);
      const [fa, fb] = r.sample(FAMILIES, 2);
      const f1 = r.pick(fa);
      const f2 = r.pick(fb);
      const where = (f: TrigFn): Quadrant[] => QUADRANTS.filter((x) => signOf(f, x) === signOf(f, q));
      return {
        stem: tex`If $${FN[f1]}\theta ${rel(signOf(f1, q))} 0$ and $${FN[f2]}\theta ${rel(signOf(f2, q))} 0$, then the terminal side of $\theta$ lies in the:`,
        ...quadrantChoices(q),
        explanation: tex`$${FN[f1]}\theta ${rel(signOf(f1, q))} 0$ in quadrants ${romanList(where(f1))}, and $${FN[f2]}\theta ${rel(signOf(f2, q))} 0$ in quadrants ${romanList(where(f2))}. Both hold only in quadrant ${ROMAN[q]}.`,
      };
    }

    if (mode === 'positive-ratio') {
      const q = r.pick([2, 3, 4] as const);
      const positive = ALL_FNS.filter((f) => signOf(f, q) > 0);
      const negative = ALL_FNS.filter((f) => signOf(f, q) < 0);
      const fnOption = (f: TrigFn): string => inline(`${FN[f]}\\theta`);
      const sx = q === 4 ? 1 : -1;
      const sy = q === 2 ? 1 : -1;
      return {
        stem: tex`If the terminal side of $\theta$ lies in the ${QUADRANT_WORD[q]} quadrant, which of the following is positive?`,
        answer: fnOption(r.pick(positive)),
        distractors: r.sample(negative, 3).map(fnOption),
        explanation: tex`In the ${QUADRANT_WORD[q]} quadrant $x ${rel(sx)} 0$ and $y ${rel(sy)} 0$ (and $r > 0$), so only $${FN[positive[0]]}\theta = ${RATIO_DEF[positive[0]]}$ and its reciprocal $${FN[positive[1]]}\theta$ are positive; the other four ratios are negative.`,
      };
    }

    if (mode === 'which-negative') {
      // Exactly one of four values has the asked sign.
      const target = r.chance(0.5) ? -1 : 1;
      const angles = range(1, 71)
        .map((i) => 5 * i)
        .filter((a) => a % 90 !== 0);
      const make = (wanted: number): { f: TrigFn; deg: number } => {
        for (;;) {
          const f = r.pick(ALL_FNS);
          const deg = r.pick(angles) - (r.chance(0.2) ? 360 : 0);
          if (signOf(f, quadrantOfDegrees(deg)) === wanted) return { f, deg };
        }
      };
      const show = ({ f, deg }: { f: TrigFn; deg: number }): string =>
        inline(deg < 0 ? `${FN[f]}(${deg}^{\\circ})` : `${FN[f]} ${deg}^{\\circ}`);
      const hit = make(target);
      const misses = [make(-target), make(-target), make(-target), make(-target), make(-target)];
      const q = quadrantOfDegrees(hit.deg);
      const word = target < 0 ? 'negative' : 'positive';
      const coterminal = hit.deg < 0 ? tex` (coterminal with $${hit.deg + 360}^{\circ}$)` : '';
      return {
        stem: tex`Which of the following is ${target < 0 ? '**negative**' : '**positive**'}?`,
        answer: show(hit),
        distractors: pickDistractors(show(hit), misses.map(show)),
        explanation: tex`$${hit.deg}^{\circ}$${coterminal} lies in quadrant ${ROMAN[q]}, where $${FN[hit.f]}$ is ${word}. Each of the other angles lies in a quadrant where its ratio has the opposite sign (All, Sin, Tan, Cos are positive in quadrants I, II, III, IV respectively).`,
      };
    }

    if (mode === 'degree-angle') {
      const base = r.pick(
        range(1, 71)
          .map((i) => 5 * i)
          .filter((a) => a % 90 !== 0),
      );
      const k = r.pick([-3, -2, -1, 1, 2, 3]);
      const deg = base + 360 * k;
      const q = quadrantOfDegrees(base);
      const turns = Math.abs(k) === 1 ? '360^{\\circ}' : `${Math.abs(k)}(360^{\\circ})`;
      const [lo, hi] = DEGREE_BOUNDS[q];
      return {
        stem: tex`In standard position, the terminal side of an angle of $${deg}^{\circ}$ lies in the:`,
        ...quadrantChoices(q),
        explanation: tex`$${deg}^{\circ} = ${base}^{\circ} ${k > 0 ? '+' : '-'} ${turns}$, so the angle is coterminal with $${base}^{\circ}$. Since $${lo} < ${base}^{\circ} < ${hi}$, the terminal side lies in the ${QUADRANT_WORD[q]} quadrant.`,
      };
    }

    const t = r.pick(WHOLE_RADIANS);
    const turn = 2 * Math.PI;
    const reduced = t - turn * Math.floor(t / turn);
    const q = (Math.floor(reduced / (Math.PI / 2)) + 1) as Quadrant;
    const [lo, hi] = RADIAN_BOUNDS[q];
    const shift =
      t > turn
        ? tex`$${t} - 2\pi \approx ${num(reduced, { dp: 2 })}$ is coterminal with it, and `
        : t < 0
          ? tex`$${t} + 2\pi \approx ${num(reduced, { dp: 2 })}$ is coterminal with it, and `
          : '';
    return {
      stem: tex`In standard position, the terminal side of an angle of $${t}$ radians lies in the:`,
      ...quadrantChoices(q),
      explanation: tex`Here the angle is in radians, not degrees (take $\pi \approx 3.14$). ${shift}$${lo} < ${num(reduced, { dp: 2 })} < ${hi}$, so the terminal side lies in the ${QUADRANT_WORD[q]} quadrant.`,
    };
  }),

  // ------------------------------------------------------------ sectors and arcs
  b.dynamic('sector-and-arc-problems', { difficulty: 2, tags: ['arc length and sector area'] }, (r) => {
    const mode = r.weighted(
      ['area-from-angle', 'area-from-arc', 'area-from-perimeter', 'angle-from-area', 'equal-arcs', 'minute-hand'] as const,
      [2.5, 1, 1.5, 1.5, 2, 2],
    );
    const cm = (x: string | number): string => `${x}\\,\\mathrm{cm}`;
    const cm2 = (x: string | number): string => `${x}\\,\\mathrm{cm^{2}}`;

    if (mode === 'area-from-angle') {
      const deg = r.pick(SECTOR_ANGLES);
      const radius = r.pick(range(3, 16).filter((x) => frac(x * x * deg, 360).d <= 4));
      const c = frac(radius * radius * deg, 360);
      const option = (x: Fraction): string => inline(cm2(piTex(x)));
      const answer = option(c);
      const candidates = [
        option(c.mul(2)), // forgot the 1/2
        option(frac(radius * deg, 180)), // found the arc length r * theta instead
        inline(cm2(num((radius * radius * deg) / 2))), // used the angle in degrees
        option(c.mul(4)), // used the diameter as the radius
      ];
      return {
        stem: tex`The area of a sector of a circle of radius $${cm(radius)}$ with central angle $${deg}^{\circ}$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`$\theta = ${deg}^{\circ} = ${radianTex(deg)}$, so $A = \frac{1}{2}r^{2}\theta = \frac{1}{2}(${radius})^{2}\left(${radianTex(deg)}\right) = ${cm2(piTex(c))}$.`,
      };
    }

    if (mode === 'area-from-arc') {
      const radius = r.int(3, 20);
      const length = r.pick(
        range(2, 6 * radius).filter((l) => (l * radius) % 2 === 0 && l !== radius && l !== 2 * radius && l !== radius * radius),
      );
      const area = (radius * length) / 2;
      const option = (x: number): string => inline(cm2(num(x, { dp: 1 })));
      const answer = option(area);
      const candidates = [
        option(radius * length), // forgot the 1/2
        option((radius * radius * length) / 2), // put l in place of theta
        option((length * length) / 2), // used l as the radius
      ];
      return {
        stem: tex`A sector of a circle of radius $${cm(radius)}$ has an arc of length $${cm(length)}$. The area of the sector is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`$\theta = \frac{l}{r}$, so $A = \frac{1}{2}r^{2}\theta = \frac{1}{2}rl = \frac{1}{2}(${radius})(${length}) = ${cm2(num(area, { dp: 1 }))}$.`,
      };
    }

    if (mode === 'area-from-perimeter') {
      const radius = r.int(3, 15);
      const length = r.pick(range(2, 6 * radius).filter((l) => (l * radius) % 2 === 0 && l !== radius && l !== 2 * radius));
      const perimeter = 2 * radius + length;
      const area = (radius * length) / 2;
      const option = (x: number): string => inline(cm2(num(x, { dp: 1 })));
      const answer = option(area);
      const candidates = [
        option((radius * perimeter) / 2), // took the whole perimeter as the arc
        option((radius * (perimeter - radius)) / 2), // subtracted only one radius
        option(radius * length), // forgot the 1/2
      ];
      return {
        stem: tex`The perimeter of a sector of a circle of radius $${cm(radius)}$ is $${cm(perimeter)}$. The area of the sector is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`Perimeter $= 2r + l$, so $l = ${perimeter} - 2(${radius}) = ${cm(length)}$. Then $A = \frac{1}{2}rl = \frac{1}{2}(${radius})(${length}) = ${cm2(num(area, { dp: 1 }))}$.`,
      };
    }

    if (mode === 'angle-from-area') {
      const theta = r.pick(AREA_THETAS);
      const radius = r.pick(range(2, 12).filter((x) => theta.mul(x * x).div(2).isInteger()));
      const area = theta.mul(radius * radius).div(2).toNumber();
      const { answer, distractors } = fracOptions(r, {
        correct: theta,
        // forgot the 2, divided by r instead of r^2, inverted, doubled
        wrong: [theta.div(2), theta.mul(radius), theta.inv(), theta.mul(2)],
        format: (x) => inline(`${x.toTex()}\\,\\mathrm{rad}`),
      });
      return {
        stem: tex`A sector of a circle of radius $${cm(radius)}$ has an area of $${cm2(area)}$. The central angle of the sector is:`,
        answer,
        distractors,
        explanation: tex`$A = \frac{1}{2}r^{2}\theta \Rightarrow \theta = \frac{2A}{r^{2}} = \frac{2(${area})}{${radius}^{2}} = ${theta.toTex()}\,\mathrm{rad}$.`,
      };
    }

    if (mode === 'equal-arcs') {
      const [a1, a2] = r.sample(RATIO_ANGLES, 2);
      const g = gcd(a1, a2);
      const [p, q] = [a2 / g, a1 / g];
      const ratio = (x: number, y: number): string => inline(`${x} : ${y}`);
      const answer = ratio(p, q);
      return {
        stem: tex`In two circles, arcs of the same length subtend angles of $${a1}^{\circ}$ and $${a2}^{\circ}$ at their centres. The ratio of the radius of the first circle to that of the second is:`,
        answer,
        // inverted the ratio, squared it (area thinking), assumed equal arcs mean equal radii
        distractors: pickDistractors(answer, [ratio(q, p), ratio(p * p, q * q), ratio(1, 1)]),
        explanation: tex`For equal arcs $r_{1}\theta_{1} = r_{2}\theta_{2}$, so $\frac{r_{1}}{r_{2}} = \frac{\theta_{2}}{\theta_{1}} = \frac{${a2}}{${a1}} = \frac{${p}}{${q}}$, i.e. $r_{1} : r_{2} = ${p} : ${q}$. The larger angle belongs to the smaller circle.`,
      };
    }

    const minutes = r.pick(CLOCK_MINUTES);
    const radius = r.pick(range(2, 15).filter((x) => frac(x * minutes, 30).d <= 3));
    const turned = frac(minutes, 30); // angle turned, as a multiple of pi
    const c = turned.mul(radius);
    const option = (x: Fraction): string => inline(cm(piTex(x)));
    const answer = option(c);
    const candidates = [
      option(c.div(2)), // used pi instead of 2 pi for a full turn
      inline(cm(6 * minutes * radius)), // multiplied by the angle in degrees
      option(turned.mul(radius * radius).div(2)), // found the sector area
      option(frac(radius * minutes, 360)), // used the hour hand's rate
    ];
    return {
      stem: tex`The minute hand of a clock is $${cm(radius)}$ long. The distance moved by its tip in $${minutes}$ minutes is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`The minute hand turns through $2\pi$ radians in $60$ minutes, so in $${minutes}$ minutes it turns $\theta = \frac{${minutes}}{60} \times 2\pi = ${piTex(turned)}$. The tip moves $l = r\theta = ${radius} \times ${piTex(turned)} = ${cm(piTex(c))}$.`,
    };
  }),

  // ------------------------------------------------------------ ratios from one ratio
  b.dynamic(
    'ratio-from-quadrant',
    { difficulty: 2, origin: 'past-paper', tags: ['trigonometric ratios', 'signs in quadrants'] },
    (r) => {
      const [leg1, leg2, hyp] = r.pick(TRIPLES);
      const [opp, adj] = r.chance(0.5) ? [leg1, leg2] : [leg2, leg1];
      const q = r.pick(QUADRANTS);
      const sx = q === 1 || q === 4 ? 1 : -1;
      const sy = q <= 2 ? 1 : -1;
      const option = (v: Fraction): string => inline(v.toTex());

      if (r.chance(0.35)) {
        // A point on the terminal side.
        const k = r.pick([1, 1, 2, 3].filter((m) => m * hyp <= 100));
        const P: Point = { x: sx * adj * k, y: sy * opp * k, r: hyp * k };
        const swappedPoint: Point = { x: sx * opp * k, y: sy * adj * k, r: hyp * k };
        const ask = r.pick(ALL_FNS);
        const correct = ratioAt(ask, P);
        const swapped = ratioAt(ask, swappedPoint);
        const { answer, distractors } = fracOptions(r, {
          correct,
          // wrong sign, x and y interchanged, both
          wrong: [correct.neg(), swapped, swapped.neg()],
          format: option,
          allowNegative: true,
        });
        const [top, bottom] = ratioParts(ask, P);
        return {
          stem: tex`The terminal side of an angle $\theta$ in standard position passes through the point $(${P.x}, ${P.y})$. The value of $${FN[ask]}\theta$ is:`,
          answer,
          distractors,
          explanation: tex`Here $x = ${P.x}$, $y = ${P.y}$ and $r = \sqrt{x^{2} + y^{2}} = \sqrt{${P.x ** 2} + ${P.y ** 2}} = ${P.r}$. So $${FN[ask]}\theta = ${RATIO_DEF[ask]} = ${thenReduced(`\\frac{${top}}{${bottom}}`, correct.toTex())}$.`,
        };
      }

      // One ratio given; the quadrant is named or fixed by the sign of a ratio from the third family.
      const P: Point = { x: sx * adj, y: sy * opp, r: hyp };
      const swappedPoint: Point = { x: sx * opp, y: sy * adj, r: hyp };
      const given = r.weighted(ALL_FNS, [3, 3, 3, 1, 1, 1]);
      const ask = r.pick(ALL_FNS.filter((f) => f !== given && f !== RECIPROCAL[given]));
      const third = FAMILIES.find((fam) => !fam.includes(given) && !fam.includes(ask)) ?? FAMILIES[0];
      const cond = r.pick(third);
      const bySign = r.chance(0.5);
      const correct = ratioAt(ask, P);
      const swapped = ratioAt(ask, swappedPoint);
      const { answer, distractors } = fracOptions(r, {
        correct,
        // wrong sign for the quadrant, opposite and adjacent interchanged, both
        wrong: [correct.neg(), swapped, swapped.neg()],
        format: option,
        allowNegative: true,
      });
      const condition = bySign
        ? tex`$${FN[cond]}\theta ${rel(signOf(cond, q))} 0$`
        : tex`$\theta$ lies in the ${QUADRANT_WORD[q]} quadrant`;
      const located = bySign
        ? tex`$${FN[given]}\theta ${rel(signOf(given, q))} 0$ and $${FN[cond]}\theta ${rel(signOf(cond, q))} 0$ hold together only in the ${QUADRANT_WORD[q]} quadrant, where`
        : tex`In the ${QUADRANT_WORD[q]} quadrant`;
      let solve: string;
      if (given === 'sin' || given === 'csc') {
        solve = tex`Take $y = ${P.y}$ and $r = ${hyp}$; then $x = \pm\sqrt{${hyp}^{2} - ${opp}^{2}} = \pm ${adj}$, so $x = ${P.x}$.`;
      } else if (given === 'cos' || given === 'sec') {
        solve = tex`Take $x = ${P.x}$ and $r = ${hyp}$; then $y = \pm\sqrt{${hyp}^{2} - ${adj}^{2}} = \pm ${opp}$, so $y = ${P.y}$.`;
      } else {
        solve = tex`Take $x = ${P.x}$ and $y = ${P.y}$; then $r = \sqrt{${adj}^{2} + ${opp}^{2}} = ${hyp}$.`;
      }
      const [top, bottom] = ratioParts(ask, P);
      return {
        stem: tex`If $${FN[given]}\theta = ${ratioAt(given, P).toTex()}$ and ${condition}, then $${FN[ask]}\theta$ is equal to:`,
        answer,
        distractors,
        explanation: tex`${located} $x ${rel(sx)} 0$ and $y ${rel(sy)} 0$. ${solve} Hence $${FN[ask]}\theta = ${RATIO_DEF[ask]} = ${thenReduced(`\\frac{${top}}{${bottom}}`, correct.toTex())}$.`,
      };
    },
  ),

  // ------------------------------------------------------------ quadrantal angles
  b.dynamic('quadrantal-values', { difficulty: 2, tags: ['trigonometric ratios', 'angle measure'] }, (r) => {
    const radians = r.chance(0.35);
    const angleTex = (deg: number): string => (radians ? radianTex(deg) : `${deg}^{\\circ}`);
    const at = (f: TrigFn, deg: number): string =>
      deg < 0
        ? radians
          ? `${FN[f]}\\left(${angleTex(deg)}\\right)`
          : `${FN[f]}(${angleTex(deg)})`
        : `${FN[f]} ${angleTex(deg)}`;
    const value = (f: TrigFn, deg: number): number | null => {
      const v = exactTrig(f, deg);
      return v ? v.value : null;
    };
    const termCount = r.chance(0.6) ? 3 : 2;
    const terms: { c: number; f: TrigFn; deg: number; v: number }[] = [];
    let guard = 0;
    while (terms.length < termCount && guard++ < 200) {
      const f = r.pick(ALL_FNS);
      const deg = 90 * r.int(-8, 8);
      const v = value(f, deg);
      if (v === null || terms.some((t) => t.f === f)) continue;
      // At most one term may vanish, and the angle must not be a plain 0 degrees.
      if (deg === 0 || (v === 0 && terms.some((t) => t.v === 0))) continue;
      terms.push({ c: r.int(1, 5) * (terms.length === 0 ? 1 : r.sign()), f, deg, v });
    }
    const total = (vals: readonly (number | null)[]): number | null =>
      vals.some((v) => v === null) ? null : terms.reduce((s, t, i) => s + t.c * (vals[i] as number), 0);
    const correct = total(terms.map((t) => t.v)) as number;
    const wrong = [
      total(terms.map((t) => Math.abs(t.v))), // ignored the sign of the value
      total(terms.map((t) => value(PARTNER[t.f], t.deg))), // used sin for cos (and so on)
      total(terms.map((t) => value(t.f, 90 * (Math.round(t.deg / 90) % 2)))), // reduced the angle by multiples of 180 degrees
    ].filter((v): v is number => v !== null);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong,
      format: (x) => inline(num(x)),
      allowNegative: true,
      allowZero: true,
      fallback: 'offset',
    });
    const expr = signedSum(terms.map((t) => [t.c, at(t.f, t.deg)] as const));
    const reduce = terms
      .map((t) => {
        const base = ((t.deg % 360) + 360) % 360;
        return base === t.deg ? `${at(t.f, t.deg)} = ${t.v}` : `${at(t.f, t.deg)} = ${at(t.f, base)} = ${t.v}`;
      })
      .join(',\\; ');
    const substitution = terms
      .map((t, i) => (i === 0 ? `${t.c}(${t.v})` : ` ${t.c < 0 ? '-' : '+'} ${Math.abs(t.c)}(${t.v})`))
      .join('');
    return {
      stem: tex`The value of $${expr}$ is:`,
      answer,
      distractors,
      explanation: tex`Remove whole turns (coterminal angles) and use the values at $0^{\circ}, 90^{\circ}, 180^{\circ}, 270^{\circ}$: $${reduce}$. So the value is $${substitution} = ${correct}$.`,
    };
  }),

  // ------------------------------------------------------------ values at 30, 45, 60 degrees
  b.dynamic('standard-angle-values', { difficulty: 1, tags: ['trigonometric ratios'] }, (r) => {
    const radians = r.chance(0.4);
    const angleTex = (deg: number): string => (radians ? radianTex(deg) : `${deg}^{\\circ}`);
    const exact = (f: TrigFn, deg: number) => {
      const v = exactTrig(f, deg);
      if (!v) throw new Error(`standard-angle-values: ${f} ${deg} is undefined`);
      return v;
    };
    // Squares of the ratios at 30, 45 and 60 degrees are rational with denominator dividing 12.
    const square = (f: TrigFn, deg: number): Fraction => frac(Math.round(exact(f, deg).value ** 2 * 12), 12);
    const unsquared = (f: TrigFn, deg: number): Fraction | null => {
      const twice = exact(f, deg).value * 2;
      return Math.abs(twice - Math.round(twice)) < 1e-9 ? frac(Math.round(twice), 2) : null;
    };
    // Keep the arithmetic light (a one-step recall item): small coefficients, mostly 1 with three terms.
    const count = r.chance(0.6) ? 3 : 2;
    const terms = r.sample(ALL_FNS, count).map((f, i) => ({
      f,
      deg: r.pick([30, 45, 60]),
      c: r.pick(count === 3 ? [1, 1, 1, 2] : [1, 1, 2, 3]) * (i > 0 && r.chance(0.3) ? -1 : 1),
    }));
    const total = (value: (f: TrigFn, deg: number, c: number) => Fraction | null): Fraction | null => {
      let sum = frac(0);
      for (const t of terms) {
        const v = value(t.f, t.deg, t.c);
        if (!v) return null;
        sum = sum.add(v.mul(t.c));
      }
      return sum;
    };
    const correct = total(square) as Fraction;
    const { answer, distractors } = fracOptions(r, {
      correct,
      wrong: [
        total((f, deg) => square(f, 90 - deg)), // interchanged the 30 and 60 degree values
        total(unsquared), // forgot to square (possible only when every value is rational)
        total((f, deg, c) => square(f, deg).mul(Math.sign(c))), // dropped the minus signs
        total((f, deg) => square(f, deg).inv()), // used the reciprocal ratio
      ],
      format: (x) => inline(x.toTex()),
      allowNegative: true,
      allowZero: true,
    });
    const at = (f: TrigFn, deg: number): string => `${FN[f]} ${angleTex(deg)}`;
    const expr = signedSum(terms.map((t) => [t.c, `${FN[t.f]}^{2}${angleTex(t.deg)}`] as const));
    const values = terms.map((t) => `${at(t.f, t.deg)} = ${exact(t.f, t.deg).tex}`).join(',\\; ');
    const substitution = terms
      .map((t, i) => `${i === 0 ? '' : t.c < 0 ? ' - ' : ' + '}${Math.abs(t.c) === 1 ? '' : Math.abs(t.c)}\\left(${square(t.f, t.deg).toTex()}\\right)`)
      .join('');
    return {
      stem: tex`The value of $${expr}$ is:`,
      answer,
      distractors,
      explanation: tex`Use the standard values $${values}$ and square them: $${expr} = ${substitution} = ${correct.toTex()}$.`,
    };
  }),

  // ------------------------------------------------------------ fundamental identities
  b.dynamic('identity-simplify', { difficulty: 2, tags: ['trigonometric ratios'] }, (r) => {
    const item = r.pick(IDENTITIES);
    const answer = inline(item.answer);
    return {
      stem: r.chance(0.5) ? tex`The expression $${item.expr}$ simplifies to:` : tex`$${item.expr}$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, r.shuffle(item.wrong).map(inline)),
      explanation: tex`Using $\sin^{2}\theta + \cos^{2}\theta = 1$, $1 + \tan^{2}\theta = \sec^{2}\theta$ and $1 + \cot^{2}\theta = \csc^{2}\theta$: $${item.expr} = ${item.steps}$.`,
    };
  }),

  // ------------------------------------------------------------ range of the ratios
  b.dynamic('impossible-value', { difficulty: 2, tags: ['trigonometric ratios'] }, (r) => {
    const statement = (f: TrigFn, v: Val): string => inline(`${FN[f]}\\theta = ${v.tex}`);
    const bounded: readonly TrigFn[] = ['sin', 'cos'];
    const reciprocals: readonly TrigFn[] = ['sec', 'csc'];
    const unbounded: readonly TrigFn[] = ['tan', 'cot'];
    const tooLarge = r.chance(0.5);
    const badFn = r.pick(tooLarge ? bounded : reciprocals);
    const bad = r.pick(tooLarge ? LARGE_VALUES : SMALL_VALUES);
    const answer = statement(badFn, bad);
    const possible = [
      statement(r.pick(bounded), r.pick([...SMALL_VALUES, ...UNIT_VALUES])),
      statement(r.pick(reciprocals), r.pick([...LARGE_VALUES, ...UNIT_VALUES])),
      statement(r.pick(unbounded), r.pick([...SMALL_VALUES, ...LARGE_VALUES])),
      statement(r.pick(unbounded), r.pick(LARGE_VALUES)),
      statement(r.pick(bounded), r.pick(SMALL_VALUES)),
      statement(r.pick(reciprocals), r.pick(LARGE_VALUES)),
    ];
    const approx = /\\(pi|sqrt)/.test(bad.tex) ? tex` \approx ${num(Math.abs(bad.v))}` : '';
    const reason = tooLarge
      ? tex`For every real $\theta$, $-1 \le \sin\theta \le 1$ and $-1 \le \cos\theta \le 1$. Here $\left|${bad.tex}\right|${approx} > 1$, so $${FN[badFn]}\theta = ${bad.tex}$ is impossible.`
      : tex`Since $|\sin\theta| \le 1$ and $|\cos\theta| \le 1$, their reciprocals satisfy $|\csc\theta| \ge 1$ and $|\sec\theta| \ge 1$. Here $\left|${bad.tex}\right|${approx} < 1$, so $${FN[badFn]}\theta = ${bad.tex}$ is impossible.`;
    return {
      stem: r.chance(0.5)
        ? tex`Which of the following is **not** possible for any real angle $\theta$?`
        : tex`For a real angle $\theta$, which of the following equations has **no** solution?`,
      answer,
      distractors: pickDistractors(answer, possible),
      explanation: tex`${reason} The other options are possible: $\sin\theta$ and $\cos\theta$ take every value in $[-1, 1]$, $\sec\theta$ and $\csc\theta$ every value with absolute value at least $1$, and $\tan\theta$ and $\cot\theta$ every real value.`,
    };
  }),

  // ------------------------------------------------------------ applications (multi-step)
  b.dynamic(
    'circular-measure-applications',
    { difficulty: 3, tags: ['angle measure', 'arc length and sector area'] },
    (r) => {
      const mode = r.weighted(['clock-hands', 'train', 'wire'] as const, [4, 3, 3]);

      if (mode === 'clock-hands') {
        const smaller = (x: number): number => {
          const a = ((x % 360) + 360) % 360;
          return Math.min(a, 360 - a);
        };
        let h = 1;
        let m = CLOCK_TIMES[0];
        let angle = 0;
        do {
          h = r.int(1, 12);
          m = r.pick(CLOCK_TIMES);
          angle = smaller(30 * (h % 12) - 5.5 * m);
        } while (angle < 10);
        const hourHand = 30 * (h % 12) + m / 2;
        const minuteHand = 6 * m;
        const raw = Math.abs(hourHand - minuteHand);
        const c = frac(angle, 180);
        const { answer, distractors } = fracOptions(r, {
          correct: c,
          wrong: [
            frac(smaller(30 * (h % 12) - 6 * m), 180), // ignored the hour hand's own motion
            frac(360 - angle, 180), // gave the reflex angle
            frac(smaller(30 * (h % 12) - 5 * m), 180), // moved the hour hand 1 degree per minute
            c.div(2),
          ],
          format: (x) => inline(piTex(x)),
        });
        const hourWork = h === 12 ? tex`0.5^{\circ} \times ${m}` : tex`30^{\circ} \times ${h} + 0.5^{\circ} \times ${m}`;
        const reflexNote = raw > 180 ? tex`, so the smaller angle is $360^{\circ} - ${raw}^{\circ} = ${angle}^{\circ}$` : '';
        return {
          stem: tex`The smaller angle (in radians) between the hour hand and the minute hand of a clock at ${h}:${String(m).padStart(2, '0')} is:`,
          answer,
          distractors,
          explanation: tex`Measured from 12, the minute hand is at $6^{\circ} \times ${m} = ${minuteHand}^{\circ}$ and the hour hand (which moves $0.5^{\circ}$ per minute) is at $${hourWork} = ${hourHand}^{\circ}$. They differ by $${raw}^{\circ}$${reflexNote}. In radians: $${angle} \times \frac{\pi}{180} = ${piTex(c)}$.`,
        };
      }

      if (mode === 'train') {
        const speed = r.pick([5, 10, 15, 20, 25, 30]); // m/s
        const kmph = (speed * 18) / 5;
        const choices = TRACK_TIMES.flatMap((t) =>
          TRACK_RADII.filter((R) => {
            const th = frac(speed * t, R);
            return th.d <= 10 && th.compare(frac(3, 2)) <= 0;
          }).map((R) => [t, R] as const),
        );
        const [t, R] = r.pick(choices);
        const arc = speed * t;
        const theta = frac(arc, R);
        const { answer, distractors } = fracOptions(r, {
          correct: theta,
          // kept the speed in km/h, used the diameter, doubled
          wrong: [theta.mul(frac(18, 5)), theta.div(2), theta.mul(2)],
          format: (x) => inline(`${x.toTex()}\\,\\mathrm{rad}`),
        });
        return {
          stem: tex`A train runs at a constant speed of $${kmph}\,\mathrm{km\,h^{-1}}$ along a circular track of radius $${R}\,\mathrm{m}$. The angle through which it turns in $${t}\,\mathrm{s}$ is:`,
          answer,
          distractors,
          explanation: tex`$v = ${kmph} \times \frac{1000}{3600} = ${speed}\,\mathrm{m\,s^{-1}}$, so in $${t}\,\mathrm{s}$ it covers an arc $l = ${speed} \times ${t} = ${arc}\,\mathrm{m}$. Hence $\theta = \frac{l}{r} = \frac{${arc}}{${R}} = ${theta.toTex()}\,\mathrm{rad}$.`,
        };
      }

      const r1 = r.int(2, 10);
      const r2 = r.pick(range(r1 + 1, 4 * r1).filter((x) => frac(2 * r1, x).d <= 12));
      const c = frac(2 * r1, r2);
      const answer = inline(piTex(c));
      const candidates = [
        inline(piTex(c.div(2))), // took the circumference as pi r
        inline(piTex(frac(2 * r2, r1))), // interchanged the two radii
        inline(overPiTex(frac(r2, 2 * r1))), // inverted l / r
        inline(piTex(c.mul(2))), // used the diameter in 2 pi r
      ];
      return {
        stem: tex`A wire bent into a circle of radius $${r1}\,\mathrm{cm}$ is straightened and bent again into an arc of a circle of radius $${r2}\,\mathrm{cm}$. The angle (in radians) subtended by this arc at the centre is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`The length of the wire is the circumference $2\pi(${r1}) = ${2 * r1}\pi\,\mathrm{cm}$. As an arc of radius $${r2}\,\mathrm{cm}$ it subtends $\theta = \frac{l}{r} = ${thenReduced(`\\frac{${2 * r1}\\pi}{${r2}}`, piTex(c))}$.`,
      };
    },
  ),

  // ------------------------------------------------------------ algebra with the ratios
  // Two-step items (square once, or divide through by cos); the harder power sums are a separate d3 template.
  b.dynamic('ratio-algebra', { difficulty: 2, origin: 'past-paper', tags: ['trigonometric ratios'] }, (r) => {
    const mode = r.weighted(['sum', 'difference', 'tan-quotient'] as const, [2, 1.5, 3]);
    const option = (x: Fraction): string => inline(x.toTex());
    const one = frac(1);

    if (mode === 'sum' || mode === 'difference') {
      const k = r.pick(SUM_VALUES).mul(r.chance(0.25) ? -1 : 1);
      const k2 = k.mul(k);
      const isSum = mode === 'sum';
      const correct = isSum ? k2.sub(1).div(2) : one.sub(k2).div(2);
      const wrong = isSum
        ? [k2.sub(1), one.sub(k2).div(2), k2.add(1).div(2)] // forgot the 1/2, sign slip, used 1 - 2 sin cos
        : [k2.sub(1).div(2), one.sub(k2), k2.add(1).div(2)];
      const { answer, distractors } = fracOptions(r, { correct, wrong, format: option, allowNegative: true });
      const op = isSum ? '+' : '-';
      return {
        stem: tex`If $\sin\theta ${op} \cos\theta = ${k.toTex()}$, then $\sin\theta\cos\theta$ is equal to:`,
        answer,
        distractors,
        explanation: isSum
          ? tex`Squaring, $\sin^{2}\theta + \cos^{2}\theta + 2\sin\theta\cos\theta = ${k2.toTex()}$, i.e. $1 + 2\sin\theta\cos\theta = ${k2.toTex()}$. So $\sin\theta\cos\theta = \frac{1}{2}\left(${k2.toTex()} - 1\right) = ${correct.toTex()}$.`
          : tex`Squaring, $\sin^{2}\theta + \cos^{2}\theta - 2\sin\theta\cos\theta = ${k2.toTex()}$, i.e. $1 - 2\sin\theta\cos\theta = ${k2.toTex()}$. So $\sin\theta\cos\theta = \frac{1}{2}\left(1 - ${k2.toTex()}\right) = ${correct.toTex()}$.`,
      };
    }

    // tan-quotient: divide numerator and denominator by cos(theta).
    let p = 1;
    let q = 2;
    do {
      p = r.int(1, 9);
      q = r.int(1, 9);
    } while (p === q || gcd(p, q) !== 1);
    const t = frac(p, q);
    const classic = r.chance(0.45);
    let a = p;
    let bb = -q;
    let c = p;
    let d = q;
    if (!classic) {
      let guard = 0;
      do {
        a = r.int(1, 5);
        bb = r.nonZero(-5, 5);
        c = r.int(1, 5);
        d = r.nonZero(-5, 5);
      } while (guard++ < 200 && (a * d - bb * c === 0 || a * p + bb * q === 0 || c * p + d * q === 0));
    }
    const N = a * p + bb * q;
    const D = c * p + d * q;
    const correct = frac(N, D);
    const safe = (n: number, den: number): Fraction | null => (den === 0 ? null : frac(n, den));
    const wrong = classic
      ? [frac(p - q, p + q), safe(p * p + q * q, p * p - q * q), frac(q * q - p * p, p * p + q * q)] // forgot to square, inverted, sign slip
      : [safe(a * q + bb * p, c * q + d * p), safe(a * p - bb * q, c * p - d * q), safe(D, N)]; // used cot for tan, sign slip, inverted
    const { answer, distractors } = fracOptions(r, { correct, wrong, format: option, allowNegative: true, allowZero: true });
    const sinCos = (x: number, y: number): string => signedSum([
      [x, '\\sin\\theta'],
      [y, '\\cos\\theta'],
    ]);
    const tanForm = (x: number, y: number): string => signedSum([
      [x, '\\tan\\theta'],
      [y, ''],
    ]);
    return {
      stem: tex`If $\tan\theta = ${t.toTex()}$, then $\frac{${sinCos(a, bb)}}{${sinCos(c, d)}}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Divide the numerator and the denominator by $\cos\theta$: $\frac{${tanForm(a, bb)}}{${tanForm(c, d)}}$. Put $\tan\theta = ${t.toTex()}$ and multiply through by $${q}$: $\frac{${linearSub(a, p, bb, q)}}{${linearSub(c, p, d, q)}} = ${thenReduced(`\\frac{${N}}{${D}}`, correct.toTex())}$.`,
    };
  }),

  b.dynamic('power-sums', { difficulty: 3, tags: ['trigonometric ratios'] }, (r) => {
    const option = (x: Fraction): string => inline(x.toTex());
    const one = frac(1);
    const m = r.pick(PRODUCT_VALUES).mul(r.chance(0.3) ? -1 : 1);
    const m2 = m.mul(m);
    const fourth = r.chance(0.6);
    const correct = fourth ? one.sub(m2.mul(2)) : one.sub(m2.mul(3));
    const wrong = fourth
      ? [one.sub(m.mul(2)), one.sub(m2), one.add(m2.mul(2))] // forgot to square, forgot the 2, sign slip
      : [one.sub(m2.mul(2)), one.sub(m.mul(3)), one.add(m2.mul(3))]; // used the fourth-power result, forgot to square, sign slip
    const { answer, distractors } = fracOptions(r, { correct, wrong, format: option, allowNegative: true, allowZero: true });
    const n = fourth ? 4 : 6;
    return {
      stem: tex`If $\sin\theta\cos\theta = ${m.toTex()}$, then $\sin^{${n}}\theta + \cos^{${n}}\theta$ is equal to:`,
      answer,
      distractors,
      explanation: fourth
        ? tex`$\sin^{4}\theta + \cos^{4}\theta = (\sin^{2}\theta + \cos^{2}\theta)^{2} - 2\sin^{2}\theta\cos^{2}\theta = 1 - 2\left(${m.toTex()}\right)^{2} = ${correct.toTex()}$.`
        : tex`With $a = \sin^{2}\theta$, $b = \cos^{2}\theta$ and $a + b = 1$: $a^{3} + b^{3} = (a + b)^{3} - 3ab(a + b) = 1 - 3\sin^{2}\theta\cos^{2}\theta = 1 - 3\left(${m.toTex()}\right)^{2} = ${correct.toTex()}$.`,
    };
  }),

  // ------------------------------------------------------------ fixed concept questions
  ...b.mcqs([
    {
      id: 'radian-definition',
      d: 1,
      t: ['angle measure', 'radians and degrees'],
      q: 'The angle subtended at the centre of a circle by an arc whose length is equal to the radius of the circle is:',
      a: '$1$ radian',
      x: [tex`$60^{\circ}$`, tex`$1^{\circ}$`, tex`$\pi$ radians`],
      e: tex`By definition $\theta = \frac{l}{r}$; when $l = r$, $\theta = 1$ radian $\approx 57.3^{\circ}$. An angle of $60^{\circ}$ is subtended by a **chord** equal to the radius (the triangle formed is equilateral), not by an arc of that length.`,
    },
    {
      id: 'one-radian-in-degrees',
      d: 1,
      o: 'past-paper',
      t: ['radians and degrees'],
      q: 'One radian is equal to:',
      a: tex`$\left(\frac{180}{\pi}\right)^{\circ}$`,
      x: [tex`$\left(\frac{\pi}{180}\right)^{\circ}$`, tex`$\left(\frac{90}{\pi}\right)^{\circ}$`, tex`$\left(\frac{360}{\pi}\right)^{\circ}$`],
      e: tex`$\pi$ radians $= 180^{\circ}$, so $1$ radian $= \left(\frac{180}{\pi}\right)^{\circ} \approx 57.3^{\circ}$ (about $57^{\circ}\,17'\,45''$). The number $\frac{\pi}{180}$ is the size of $1^{\circ}$ in radians, not of $1$ radian in degrees.`,
    },
    {
      id: 'not-defined-at-quadrantal-angle',
      d: 1,
      t: ['trigonometric ratios', 'signs in quadrants'],
      q: 'Which of the following is **not defined**?',
      a: tex`$\tan 270^{\circ}$`,
      x: [tex`$\cot 270^{\circ}$`, tex`$\sec 180^{\circ}$`, tex`$\csc 90^{\circ}$`],
      e: tex`The terminal side of $270^{\circ}$ passes through $(0, -1)$, so $\tan 270^{\circ} = \frac{y}{x} = \frac{-1}{0}$ is not defined. The others exist: $\cot 270^{\circ} = \frac{0}{-1} = 0$, $\sec 180^{\circ} = \frac{1}{-1} = -1$ and $\csc 90^{\circ} = \frac{1}{1} = 1$.`,
    },
    {
      id: 'sine-squares-ratio',
      d: 1,
      t: ['trigonometric ratios', 'radians and degrees'],
      q: tex`The ratio $\sin^{2}\frac{\pi}{6} : \sin^{2}\frac{\pi}{4} : \sin^{2}\frac{\pi}{3} : \sin^{2}\frac{\pi}{2}$ is equal to:`,
      a: '$1 : 2 : 3 : 4$',
      x: [tex`$1 : \sqrt{2} : \sqrt{3} : 2$`, '$3 : 2 : 1 : 4$', '$3 : 2 : 1 : 0$'],
      e: tex`$\sin\frac{\pi}{6} = \frac{1}{2}$, $\sin\frac{\pi}{4} = \frac{1}{\sqrt{2}}$, $\sin\frac{\pi}{3} = \frac{\sqrt{3}}{2}$ and $\sin\frac{\pi}{2} = 1$, so the squares are $\frac{1}{4}, \frac{2}{4}, \frac{3}{4}, \frac{4}{4}$, in the ratio $1 : 2 : 3 : 4$. The ratio $1 : \sqrt{2} : \sqrt{3} : 2$ is that of the sines themselves (not squared), and $3 : 2 : 1 : 0$ is that of the squared cosines.`,
    },
    {
      id: 'tan-sec-identity-domain',
      d: 2,
      t: ['trigonometric ratios'],
      q: tex`The identity $1 + \tan^{2}\theta = \sec^{2}\theta$ holds for all real $\theta$ except ($n$ is an integer):`,
      a: tex`$\theta = (2n + 1)\frac{\pi}{2}$`,
      x: [tex`$\theta = n\pi$`, tex`$\theta = 2n\pi$`, tex`$\theta = (2n + 1)\pi$`],
      e: tex`The identity comes from dividing $\sin^{2}\theta + \cos^{2}\theta = 1$ by $\cos^{2}\theta$, which needs $\cos\theta \ne 0$. Both $\tan\theta$ and $\sec\theta$ fail to exist exactly when $\cos\theta = 0$, i.e. at the odd multiples of $\frac{\pi}{2}$.`,
    },
    {
      id: 'sector-radius-doubled-angle-halved',
      d: 2,
      t: ['arc length and sector area'],
      q: 'If the radius of a sector is doubled and its central angle is halved, then its area:',
      a: 'becomes twice the original',
      x: ['remains unchanged', 'becomes half the original', 'becomes four times the original'],
      e: tex`$A = \frac{1}{2}r^{2}\theta$, so the new area is $\frac{1}{2}(2r)^{2}\left(\frac{\theta}{2}\right) = 2 \times \frac{1}{2}r^{2}\theta = 2A$. (It is the arc length $l = r\theta$ that stays unchanged.)`,
    },
    {
      id: 'sine-of-one-radian',
      d: 3,
      t: ['radians and degrees', 'trigonometric ratios'],
      q: 'Which of the following is true?',
      a: tex`$\sin 1 > \sin 1^{\circ}$`,
      x: [tex`$\sin 1 < \sin 1^{\circ}$`, tex`$\sin 1 = \sin 1^{\circ}$`, tex`$\sin 1 = \frac{180}{\pi}\sin 1^{\circ}$`],
      e: tex`An angle of $1$ (radian) is about $57.3^{\circ}$, and $\sin$ increases from $0^{\circ}$ to $90^{\circ}$, so $\sin 1 \approx 0.841$ is far larger than $\sin 1^{\circ} \approx 0.0175$. Sine is not proportional to the angle, so $\sin 1 \ne \frac{180}{\pi}\sin 1^{\circ}$ (the right side is about $1.00$).`,
    },
  ]),
]);
