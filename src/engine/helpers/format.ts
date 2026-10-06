import { Fraction } from './fraction';

/**
 * `String.raw` under a shorter name. Use it for every string that contains LaTeX so
 * that `\frac`, `\times`, `\theta`, ... keep their backslashes:
 *
 *   stem: tex`Find $\frac{dy}{dx}$ if $y = ${a}x^2$.`
 *
 * Note: inside a template literal `${` starts an interpolation. Never write `${}^{14}C`;
 * write `$^{14}\mathrm{C}$` instead.
 */
export const tex = String.raw;

export interface NumberFormat {
  /** Significant figures for non-integers (default 3). Ignored when `dp` is set. */
  sig?: number;
  /** Fixed number of decimal places (trailing zeros kept only if `keepZeros`). */
  dp?: number;
  keepZeros?: boolean;
  /** Switch to scientific notation outside [1e-3, 1e6) (default true). */
  autoSci?: boolean;
}

function stripZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/** A number that `num`/`sci` displayed with fewer digits than its exact value. */
export interface RoundedValue {
  shown: string;
  exact: number;
}

let roundingLog: RoundedValue[] | undefined;

/**
 * Runs `fn` and also returns every value that `num`/`sci` rounded while it ran
 * (12.75 shown as `12.8`). The quality gate uses this to find stems that show a
 * rounded number while the key is computed from the exact one.
 */
export function trackRounding<T>(fn: () => T): { result: T; rounded: RoundedValue[] } {
  const outer = roundingLog;
  const rounded: RoundedValue[] = [];
  roundingLog = rounded;
  try {
    return { result: fn(), rounded };
  } finally {
    roundingLog = outer;
  }
}

function noteRounding(shown: string, exact: number): string {
  if (roundingLog) {
    const [mantissa = '', exponent = '0'] = shown.split(' \\times 10^');
    const value = Number(mantissa) * 10 ** Number(exponent.replace(/[{}]/g, ''));
    if (Math.abs(value - exact) > 1e-9 * Math.abs(exact)) roundingLog.push({ shown, exact });
  }
  return shown;
}

/**
 * Formats a number for display inside math mode (no `$`).
 * Integers print exactly; other values are rounded to 3 significant figures
 * (or `dp` decimals) with trailing zeros removed; very large/small magnitudes
 * become `a \times 10^{n}`.
 */
export function num(value: number, format: NumberFormat = {}): string {
  if (!Number.isFinite(value)) throw new RangeError(`num: non-finite value ${value}`);
  const { sig = 3, dp, keepZeros = false, autoSci = true } = format;
  const clean = Number(value.toPrecision(12));
  if (clean === 0) return '0';
  const magnitude = Math.abs(clean);
  if (autoSci && (magnitude >= 1e6 || magnitude < 1e-3) && dp === undefined) {
    return sci(clean, sig);
  }
  if (dp !== undefined) {
    const fixed = clean.toFixed(dp);
    const out = keepZeros ? fixed : stripZeros(fixed);
    return noteRounding(out === '-0' ? '0' : out, clean);
  }
  if (Number.isInteger(clean)) return String(clean);
  const decimals = Math.max(0, sig - 1 - Math.floor(Math.log10(magnitude)));
  const out = stripZeros(clean.toFixed(Math.min(decimals, 12)));
  return noteRounding(out === '-0' ? '0' : out, clean);
}

/** Scientific notation for math mode: `3.2 \times 10^{-4}`. */
export function sci(value: number, sig = 3): string {
  if (!Number.isFinite(value)) throw new RangeError(`sci: non-finite value ${value}`);
  if (value === 0) return '0';
  let exponent = Math.floor(Math.log10(Math.abs(value)));
  let mantissa = Number((value / 10 ** exponent).toPrecision(sig));
  if (Math.abs(mantissa) >= 10) {
    mantissa /= 10;
    exponent += 1;
  }
  const m = stripZeros(mantissa.toFixed(Math.max(0, sig - 1)));
  return noteRounding(exponent === 0 ? m : `${m} \\times 10^{${exponent}}`, value);
}

/** Common SI units as LaTeX (use with `qty`). */
export const U = {
  m: 'm',
  cm: 'cm',
  mm: 'mm',
  km: 'km',
  nm: 'nm',
  s: 's',
  ms: 'ms',
  kg: 'kg',
  g: 'g',
  N: 'N',
  J: 'J',
  kJ: 'kJ',
  eV: 'eV',
  MeV: 'MeV',
  W: 'W',
  kW: 'kW',
  Pa: 'Pa',
  Hz: 'Hz',
  V: 'V',
  A: 'A',
  mA: 'mA',
  C: 'C',
  muC: '\\mu C',
  F: 'F',
  muF: '\\mu F',
  T: 'T',
  Wb: 'Wb',
  H: 'H',
  ohm: '\\Omega',
  K: 'K',
  degC: '^{\\circ}C',
  deg: '^{\\circ}',
  rad: 'rad',
  mol: 'mol',
  L: 'L',
  dm3: 'dm^{3}',
  cm3: 'cm^{3}',
  m3: 'm^{3}',
  m2: 'm^{2}',
  mps: 'm\\,s^{-1}',
  mps2: 'm\\,s^{-2}',
  kmph: 'km\\,h^{-1}',
  radps: 'rad\\,s^{-1}',
  Nm: 'N\\,m',
  kgm2: 'kg\\,m^{2}',
  kgmps: 'kg\\,m\\,s^{-1}',
  NpC: 'N\\,C^{-1}',
  Vpm: 'V\\,m^{-1}',
  molL: 'mol\\,dm^{-3}',
  gmol: 'g\\,mol^{-1}',
  Jmol: 'J\\,mol^{-1}',
  kJmol: 'kJ\\,mol^{-1}',
  JK: 'J\\,K^{-1}',
  atm: 'atm',
} as const;

/**
 * A quantity with unit inside math mode, e.g. `qty(12.5, U.mps)` -> `12.5\,\mathrm{m\,s^{-1}}`.
 * Degree-style units attach without a space.
 */
export function qty(value: number | string, unit: string, format?: NumberFormat): string {
  const v = typeof value === 'number' ? num(value, format) : value;
  if (unit.startsWith('^')) return `${v}${unit}`;
  return `${v}\\,\\mathrm{${unit}}`;
}

/** `$...$`-wrapped `qty` for options: `$12.5\,\mathrm{m\,s^{-1}}$`. */
export const q$ = (value: number | string, unit: string, format?: NumberFormat): string =>
  `$${qty(value, unit, format)}$`;

/** `$...$`-wrapped `num`: `$0.25$`. */
export const n$ = (value: number, format?: NumberFormat): string => `$${num(value, format)}$`;

/** Wraps LaTeX in inline math delimiters. */
export const m$ = (latex: string): string => `$${latex}$`;

/** LaTeX for a number or Fraction (fractions as `\frac`). */
export function texOf(value: number | Fraction): string {
  return value instanceof Fraction ? value.toTex() : num(value);
}

/**
 * Coefficient in front of a variable part: (1,'x') -> 'x', (-1,'x') -> '-x',
 * (3,'x') -> '3x', (frac(1,2),'x') -> '\frac{1}{2}x', (5,'') -> '5'.
 */
export function coefTex(coef: number | Fraction, variable: string): string {
  const c = Fraction.of(coef);
  if (variable === '') return c.toTex();
  if (c.equals(1)) return variable;
  if (c.equals(-1)) return `-${variable}`;
  return `${c.toTex()}${variable}`;
}

/**
 * Joins signed terms into a clean expression, dropping zero terms:
 * signedSum([[3,'x^2'],[-1,'x'],[0,'y'],[-5,'']]) -> '3x^2 - x - 5'
 */
export function signedSum(terms: ReadonlyArray<readonly [number | Fraction, string]>): string {
  let out = '';
  for (const [coef, variable] of terms) {
    const c = Fraction.of(coef);
    if (c.isZero()) continue;
    const body = coefTex(c.abs(), variable);
    if (!out) out = c.sign() < 0 ? `-${body}` : body;
    else out += c.sign() < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return out || '0';
}

/** Polynomial from coefficients (highest power first): [3,0,-2,1] -> '3x^3 - 2x + 1'. */
export function polyTex(coeffs: ReadonlyArray<number | Fraction>, variable = 'x'): string {
  const degree = coeffs.length - 1;
  return signedSum(
    coeffs.map((c, i) => {
      const p = degree - i;
      const part = p === 0 ? '' : p === 1 ? variable : `${variable}^{${p}}`;
      return [c, part] as const;
    }),
  );
}

/** ' + 3' / ' - 3' for appending a constant to an expression. */
export function signed(value: number | Fraction): string {
  const v = Fraction.of(value);
  return v.sign() < 0 ? ` - ${v.abs().toTex()}` : ` + ${v.toTex()}`;
}

/** `(x - 3)` / `(x + 2)` / `x` for a linear factor x - root. */
export function linearFactor(root: number | Fraction, variable = 'x'): string {
  const r = Fraction.of(root);
  if (r.isZero()) return variable;
  return `(${variable}${signed(r.neg())})`;
}

/** Wraps negative numbers in parentheses for substitution displays: -3 -> '(-3)'. */
export function paren(value: number | string): string {
  const text = typeof value === 'number' ? num(value) : value;
  return text.startsWith('-') ? `(${text})` : text;
}

/** Ordinal words for small numbers (1 -> 'first'). */
export function ordinal(n: number): string {
  const words = [
    'zeroth',
    'first',
    'second',
    'third',
    'fourth',
    'fifth',
    'sixth',
    'seventh',
    'eighth',
    'ninth',
    'tenth',
  ];
  if (n >= 0 && n < words.length) return words[n] as string;
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** English list: ['a','b','c'] -> 'a, b and c'. */
export function listText(items: readonly string[], conjunction = 'and'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}
