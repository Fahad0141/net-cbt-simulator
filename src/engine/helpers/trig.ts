import { Fraction } from './fraction';

export type TrigFn = 'sin' | 'cos' | 'tan' | 'cot' | 'sec' | 'csc';

export interface ExactValue {
  /** LaTeX of the exact value, e.g. `\frac{\sqrt{3}}{2}`. */
  tex: string;
  value: number;
}

/** Standard angles (degrees) that have well-known exact trigonometric values. */
export const STANDARD_ANGLES = [
  0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360,
] as const;

// Exact sine values on the first quadrant; everything else follows by symmetry.
const SIN_Q1: Record<number, ExactValue> = {
  0: { tex: '0', value: 0 },
  30: { tex: '\\frac{1}{2}', value: 0.5 },
  45: { tex: '\\frac{1}{\\sqrt{2}}', value: Math.SQRT1_2 },
  60: { tex: '\\frac{\\sqrt{3}}{2}', value: Math.sqrt(3) / 2 },
  90: { tex: '1', value: 1 },
};

const TAN_Q1: Record<number, ExactValue | null> = {
  0: { tex: '0', value: 0 },
  30: { tex: '\\frac{1}{\\sqrt{3}}', value: 1 / Math.sqrt(3) },
  45: { tex: '1', value: 1 },
  60: { tex: '\\sqrt{3}', value: Math.sqrt(3) },
  90: null,
};

function negate(v: ExactValue): ExactValue {
  if (v.value === 0) return v;
  return { tex: v.tex.startsWith('-') ? v.tex.slice(1) : `-${v.tex}`, value: -v.value };
}

function reciprocal(v: ExactValue | null): ExactValue | null {
  if (!v || v.value === 0) return null;
  const table: Record<string, string> = {
    '1': '1',
    '-1': '-1',
    '\\frac{1}{2}': '2',
    '-\\frac{1}{2}': '-2',
    '\\frac{1}{\\sqrt{2}}': '\\sqrt{2}',
    '-\\frac{1}{\\sqrt{2}}': '-\\sqrt{2}',
    '\\frac{\\sqrt{3}}{2}': '\\frac{2}{\\sqrt{3}}',
    '-\\frac{\\sqrt{3}}{2}': '-\\frac{2}{\\sqrt{3}}',
    '\\frac{1}{\\sqrt{3}}': '\\sqrt{3}',
    '-\\frac{1}{\\sqrt{3}}': '-\\sqrt{3}',
    '\\sqrt{3}': '\\frac{1}{\\sqrt{3}}',
    '-\\sqrt{3}': '-\\frac{1}{\\sqrt{3}}',
  };
  const texValue = table[v.tex];
  if (!texValue) throw new Error(`reciprocal: no exact form for ${v.tex}`);
  return { tex: texValue, value: 1 / v.value };
}

function reference(deg: number): { ref: number; quadrant: 1 | 2 | 3 | 4 } {
  const a = ((deg % 360) + 360) % 360;
  if (a <= 90) return { ref: a, quadrant: 1 };
  if (a <= 180) return { ref: 180 - a, quadrant: 2 };
  if (a <= 270) return { ref: a - 180, quadrant: 3 };
  return { ref: 360 - a, quadrant: 4 };
}

/**
 * Exact value of a trig function at a multiple of 30 or 45 degrees.
 * Returns `null` when undefined (e.g. tan 90).
 */
export function exactTrig(fn: TrigFn, degrees: number): ExactValue | null {
  if (degrees % 15 !== 0 || (degrees % 30 !== 0 && degrees % 45 !== 0)) {
    throw new RangeError(`exactTrig: ${degrees} is not a standard angle`);
  }
  const { ref, quadrant } = reference(degrees);
  const sinSign = quadrant === 1 || quadrant === 2 ? 1 : -1;
  const cosSign = quadrant === 1 || quadrant === 4 ? 1 : -1;
  const sinAbs = SIN_Q1[ref] as ExactValue;
  const cosAbs = SIN_Q1[90 - ref] as ExactValue;
  const sin = sinSign > 0 ? sinAbs : negate(sinAbs);
  const cos = cosSign > 0 ? cosAbs : negate(cosAbs);
  const tanAbs = TAN_Q1[ref] ?? null;
  const tan = tanAbs === null ? null : sinSign * cosSign > 0 ? tanAbs : negate(tanAbs);
  switch (fn) {
    case 'sin':
      return sin;
    case 'cos':
      return cos;
    case 'tan':
      return tan;
    case 'csc':
      return reciprocal(sin);
    case 'sec':
      return reciprocal(cos);
    case 'cot':
      if (cos.value === 0) return { tex: '0', value: 0 };
      return reciprocal(tan);
  }
}

/** Degrees -> LaTeX radian measure as a multiple of pi: 150 -> `\frac{5\pi}{6}`. */
export function radianTex(degrees: number): string {
  const f = new Fraction(degrees, 180);
  if (f.isZero()) return '0';
  const sign = f.sign() < 0 ? '-' : '';
  const n = Math.abs(f.n);
  const numerator = n === 1 ? '\\pi' : `${n}\\pi`;
  return f.d === 1 ? `${sign}${numerator}` : `${sign}\\frac{${numerator}}{${f.d}}`;
}

/** LaTeX degree measure: 150 -> `150^{\circ}`. */
export const degreeTex = (degrees: number): string => `${degrees}^{\\circ}`;
