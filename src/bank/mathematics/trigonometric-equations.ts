/**
 * Solutions of Trigonometric Equations (FSc Part I): general solutions and solutions in a
 * given interval.
 *
 * Every solution set is found by scanning the standard angles (multiples of 30 and 45
 * degrees) numerically, so answers and distractors are always computed, never hand-typed.
 * Option sets are printed in ascending order in one canonical form, so two options can
 * never show the same set in two disguises.
 */
import { defineBank } from '@/engine/authoring';
import { Fraction, n$, numericOptions, pickDistractors, radianTex, tex } from '@/engine/helpers';

// --------------------------------------------------------------------------- notation

type Basic = 'sin' | 'cos' | 'tan';

const FN: Readonly<Record<Basic, string>> = { sin: '\\sin', cos: '\\cos', tan: '\\tan' };

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;

const SQ2 = Math.SQRT1_2;
const SQ3 = Math.sqrt(3);

interface Val {
  tex: string;
  v: number;
}

const V = (t: string, v: number): Val => ({ tex: t, v });

/** Values of sin / cos at standard angles, excluding 0 and +-1. */
const SC_VALUES: readonly Val[] = [
  V('\\frac{1}{2}', 0.5),
  V('-\\frac{1}{2}', -0.5),
  V('\\frac{\\sqrt{3}}{2}', SQ3 / 2),
  V('-\\frac{\\sqrt{3}}{2}', -SQ3 / 2),
  V('\\frac{1}{\\sqrt{2}}', SQ2),
  V('-\\frac{1}{\\sqrt{2}}', -SQ2),
];

/** Values of tan at standard angles, excluding 0. */
const TAN_VALUES: readonly Val[] = [
  V('\\frac{1}{\\sqrt{3}}', 1 / SQ3),
  V('-\\frac{1}{\\sqrt{3}}', -1 / SQ3),
  V('1', 1),
  V('-1', -1),
  V('\\sqrt{3}', SQ3),
  V('-\\sqrt{3}', -SQ3),
];

const ZERO_ONE: readonly Val[] = [V('0', 0), V('1', 1), V('-1', -1)];

/** Value of a basic ratio at an angle in degrees (NaN where tan is undefined). */
function trig(fn: Basic, d: number): number {
  const r = (d * Math.PI) / 180;
  if (fn === 'sin') return Math.sin(r);
  if (fn === 'cos') return Math.cos(r);
  return Math.abs(Math.cos(r)) < 1e-9 ? NaN : Math.tan(r);
}

const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/** Standard angles (multiples of 30 or 45 degrees) in [lo, hi] (hi excluded unless `incHi`). */
function standardAngles(lo: number, hi: number, incHi: boolean): number[] {
  const out: number[] = [];
  for (let d = lo; d < hi || (incHi && d === hi); d += 15) {
    if (d % 30 === 0 || d % 45 === 0) out.push(d);
  }
  return out;
}

/** All standard-angle solutions of fn(x) = v in [lo, hi]. */
function solve(fn: Basic, v: number, lo = 0, hi = 360, incHi = true): number[] {
  return standardAngles(lo, hi, incHi).filter((d) => close(trig(fn, d), v));
}

const deg = (d: number): string => `${d}^{\\circ}`;
const ang = (d: number, radians: boolean): string => (radians ? radianTex(d) : deg(d));

/** `\left\{ \frac{\pi}{6}, \frac{5\pi}{6} \right\}` (sorted, de-duplicated). */
function setTex(angles: readonly number[], radians: boolean): string {
  const sorted = [...new Set(angles)].sort((a, b) => a - b);
  return `\\left\\{ ${sorted.map((d) => ang(d, radians)).join(', ')} \\right\\}`;
}

const setOpt = (angles: readonly number[], radians: boolean): string => `$${setTex(angles, radians)}$`;

function quadrant(d: number): number {
  const a = ((d % 360) + 360) % 360;
  if (a < 90) return 1;
  if (a < 180) return 2;
  if (a < 270) return 3;
  return 4;
}

/** Reference (acute) angle of d. */
function refAngle(d: number): number {
  const a = ((d % 360) + 360) % 360;
  return Math.min(a % 180, 180 - (a % 180));
}

/** `[0, 2\pi]` or `[0^{\circ}, 360^{\circ}]`. */
const intervalTex = (hi: number, radians: boolean, open = false): string =>
  `${open ? '(' : '['}0${radians ? '' : '^{\\circ}'}, ${ang(hi, radians)}${open ? ')' : ']'}`;

/** `\frac{\pi}{12}` from a Fraction m meaning m*pi (sign included). */
function piTex(m: Fraction): string {
  if (m.isZero()) return '0';
  const sign = m.sign() < 0 ? '-' : '';
  const n = Math.abs(m.n);
  const top = n === 1 ? '\\pi' : `${n}\\pi`;
  return m.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${m.d}}`;
}

/** `n\pi`, `2n\pi`, `\frac{n\pi}{3}`, `\frac{2n\pi}{3}` for m * n * pi. */
function nPiTex(m: Fraction): string {
  const top = m.n === 1 ? 'n\\pi' : `${m.n}n\\pi`;
  return m.d === 1 ? top : `\\frac{${top}}{${m.d}}`;
}

/**
 * Canonical key of the set {n*per + c : n in Z, c in cs} (all in units of pi), built from its
 * members in [0, 24). Two families with the same key are the same solution set, e.g.
 * n pi/4 + pi/3 and n pi/4 + pi/12, or n pi +- 2 pi/3 and n pi +- pi/3.
 */
function familyKey(per: Fraction, cs: readonly Fraction[]): string {
  const p = per.toNumber();
  const keys = new Set<number>();
  for (const c of cs) {
    const c0 = c.toNumber();
    for (let n = Math.ceil(-c0 / p - 1e-9); c0 + n * p < 24 - 1e-9; n++) keys.add(Math.round((c0 + n * p) * 144));
  }
  return [...keys].sort((x, y) => x - y).join(',');
}

/** `A + B` / `A - B` where B is a signed single term. */
const plusTerm = (a: string, b: string): string => (b.startsWith('-') ? `${a} - ${b.slice(1)}` : `${a} + ${b}`);

// General-solution families (angles in degrees, period multiplier as Fraction of pi).
const famTan = (alpha: number, per = new Fraction(1)): string => `x = ${plusTerm(nPiTex(per), radianTex(alpha))}`;
const famCos = (alpha: number, per = new Fraction(2)): string => `x = ${nPiTex(per)} \\pm ${radianTex(Math.abs(alpha))}`;
const famSin = (alpha: number): string =>
  alpha >= 0 ? `x = n\\pi + (-1)^{n}${radianTex(alpha)}` : `x = n\\pi - (-1)^{n}${radianTex(-alpha)}`;

const m$ = (t: string): string => `$${t}$`;

/** Argument after a function name: negative values are bracketed. */
const arg = (t: string): string => (t.startsWith('-') ? `\\left(${t}\\right)` : t);

const NZ = tex`$n \in \mathbb{Z}$`;

// --------------------------------------------------------------------------- bank

export default defineBank('mathematics', 'trigonometric-equations', (b) => [
  // ------------------------------------------------------------------ general solutions
  b.dynamic('general-solution-basic', { difficulty: 1, origin: 'past-paper', tags: ['general solutions'] }, (r) => {
    const fn = r.pick<Basic>(['sin', 'cos', 'tan']);
    const alpha =
      fn === 'cos' ? r.pick([30, 45, 60, 120, 135, 150]) : r.pick([30, 45, 60, -30, -45, -60]);
    const value = fn === 'tan' ? TAN_VALUES.find((x) => close(x.v, trig('tan', alpha))) : SC_VALUES.find((x) => close(x.v, trig(fn, alpha)));
    if (!value) throw new Error('no value');
    let ans: string;
    let wrong: string[];
    let rule: string;
    if (fn === 'sin') {
      ans = famSin(alpha);
      wrong = [famCos(alpha), famSin(-alpha), famTan(alpha), `x = ${plusTerm('2n\\pi', radianTex(alpha))}`];
      rule = tex`$\sin x = \sin\alpha \Rightarrow x = n\pi + (-1)^{n}\alpha$`;
    } else if (fn === 'cos') {
      ans = famCos(alpha);
      wrong = [famCos(alpha, new Fraction(1)), famCos(180 - alpha), famSin(alpha), famTan(alpha)];
      rule = tex`$\cos x = \cos\alpha \Rightarrow x = 2n\pi \pm \alpha$`;
    } else {
      ans = famTan(alpha);
      wrong = [famTan(alpha, new Fraction(2)), famTan(-alpha), famSin(alpha), famCos(alpha)];
      rule = tex`$\tan x = \tan\alpha \Rightarrow x = n\pi + \alpha$`;
    }
    return {
      stem: tex`The general solution of $${FN[fn]} x = ${value.tex}$, where ${NZ}, is:`,
      answer: m$(ans),
      distractors: pickDistractors(m$(ans), wrong.map(m$)),
      explanation: tex`The principal value is $\alpha = ${radianTex(alpha)}$ since $${FN[fn]} ${arg(radianTex(alpha))} =${value.tex}$. Using ${rule}, the general solution is $${ans}$.`,
    };
  }),

  b.dynamic('zero-and-unit-values', { difficulty: 1, tags: ['general solutions'] }, (r) => {
    const cases: ReadonlyArray<{ fn: Basic; v: string; a: string; x: readonly string[]; why: string }> = [
      { fn: 'sin', v: '0', a: 'n\\pi', x: ['(2n+1)\\frac{\\pi}{2}', '2n\\pi', '\\frac{n\\pi}{2}'], why: tex`$\sin x = 0$ at every integer multiple of $\pi$` },
      { fn: 'sin', v: '1', a: '2n\\pi + \\frac{\\pi}{2}', x: ['n\\pi + \\frac{\\pi}{2}', '2n\\pi', '2n\\pi - \\frac{\\pi}{2}'], why: tex`$\sin x = 1$ only at $\frac{\pi}{2}$ in one revolution, and the period of $\sin$ is $2\pi$` },
      { fn: 'sin', v: '-1', a: '2n\\pi - \\frac{\\pi}{2}', x: ['2n\\pi + \\frac{\\pi}{2}', 'n\\pi + \\frac{\\pi}{2}', '(2n+1)\\pi'], why: tex`$\sin x = -1$ only at $-\frac{\pi}{2}$ (that is, $\frac{3\pi}{2}$) in one revolution, and the period of $\sin$ is $2\pi$` },
      { fn: 'cos', v: '0', a: '(2n+1)\\frac{\\pi}{2}', x: ['n\\pi', '2n\\pi', '2n\\pi + \\frac{\\pi}{2}'], why: tex`$\cos x = 0$ at every odd multiple of $\frac{\pi}{2}$` },
      { fn: 'cos', v: '1', a: '2n\\pi', x: ['n\\pi', '(2n+1)\\pi', '2n\\pi + \\frac{\\pi}{2}'], why: tex`$\cos x = 1$ only at $0$ in one revolution, and the period of $\cos$ is $2\pi$` },
      { fn: 'cos', v: '-1', a: '(2n+1)\\pi', x: ['2n\\pi', 'n\\pi', '(2n+1)\\frac{\\pi}{2}'], why: tex`$\cos x = -1$ only at $\pi$ in one revolution, so $x$ is an odd multiple of $\pi$` },
      { fn: 'tan', v: '0', a: 'n\\pi', x: ['(2n+1)\\frac{\\pi}{2}', '2n\\pi', '\\frac{n\\pi}{2}'], why: tex`$\tan x = 0$ exactly where $\sin x = 0$, at every integer multiple of $\pi$` },
      { fn: 'tan', v: '1', a: 'n\\pi + \\frac{\\pi}{4}', x: ['2n\\pi + \\frac{\\pi}{4}', 'n\\pi - \\frac{\\pi}{4}', '\\frac{n\\pi}{2} + \\frac{\\pi}{4}'], why: tex`$\tan\frac{\pi}{4} = 1$ and the period of $\tan$ is $\pi$` },
      { fn: 'tan', v: '-1', a: 'n\\pi - \\frac{\\pi}{4}', x: ['n\\pi + \\frac{\\pi}{4}', '2n\\pi - \\frac{\\pi}{4}', '2n\\pi + \\frac{3\\pi}{4}'], why: tex`$\tan\left(-\frac{\pi}{4}\right) = -1$ and the period of $\tan$ is $\pi$` },
    ];
    const c = r.pick(cases);
    const answer = m$(`x = ${c.a}`);
    return {
      stem: tex`If $${FN[c.fn]} x = ${c.v}$, then the general value of $x$ (${NZ}) is:`,
      answer,
      distractors: pickDistractors(answer, c.x.map((s) => m$(`x = ${s}`))),
      explanation: tex`${c.why}; hence $x = ${c.a}$, ${NZ}.`,
    };
  }),

  b.dynamic('multiple-angle-general', { difficulty: 2, tags: ['general solutions'] }, (r) => {
    const fn = r.pick<'tan' | 'cos'>(['tan', 'cos']);
    const k = r.pick([2, 3, 4]);
    const alpha = fn === 'tan' ? r.pick([30, 45, 60, -30, -45, -60]) : r.pick([30, 45, 60, 120, 135, 150]);
    const value = (fn === 'tan' ? TAN_VALUES : SC_VALUES).find((x) => close(x.v, trig(fn, alpha)));
    if (!value) throw new Error('no value');
    const a = new Fraction(alpha, 180);
    const ak = a.div(k);
    type Fam = { text: string; key: string };
    let ans: Fam;
    let wrong: Fam[];
    let step: string;
    if (fn === 'tan') {
      const fam = (per: Fraction, c: Fraction): Fam => ({
        text: `x = ${plusTerm(nPiTex(per), piTex(c))}`,
        key: familyKey(per, [c]),
      });
      ans = fam(new Fraction(1, k), ak);
      wrong = [
        fam(new Fraction(1), ak), // period not divided by k
        fam(new Fraction(1, k), a), // principal value not divided by k
        fam(new Fraction(2, k), ak), // used 2n pi for tan
        fam(new Fraction(1, k), ak.neg()), // sign slip
        fam(new Fraction(k), a.mul(k)), // multiplied instead of dividing
      ];
      step = `${k}x = ${plusTerm('n\\pi', piTex(a))}`;
    } else {
      const fam = (per: Fraction, c: Fraction): Fam => ({
        text: `x = ${nPiTex(per)} \\pm ${piTex(c)}`,
        key: familyKey(per, [c, c.neg()]),
      });
      ans = fam(new Fraction(2, k), ak);
      wrong = [
        fam(new Fraction(2), ak), // period not divided by k
        fam(new Fraction(2, k), a), // principal value not divided by k
        fam(new Fraction(1, k), ak), // used n pi for cos
        fam(new Fraction(2, k), new Fraction(1).sub(a).div(k)), // sign slip: solved cos kx = -value
        fam(new Fraction(2 * k), a.mul(k)),
      ];
      step = `${k}x = 2n\\pi \\pm ${piTex(a)}`;
    }
    // Drop any "distractor" that is the answer's solution set in disguise
    // (e.g. tan 4x = sqrt 3: n pi/4 + pi/3 is the same set as n pi/4 + pi/12).
    const shown = wrong.filter((w) => w.key !== ans.key).map((w) => m$(w.text));
    return {
      stem: tex`The general solution of $${FN[fn]} ${k}x = ${value.tex}$, where ${NZ}, is:`,
      answer: m$(ans.text),
      distractors: pickDistractors(m$(ans.text), shown),
      explanation: tex`Since $${FN[fn]} ${arg(piTex(a))} =${value.tex}$, we get $${step}$. Dividing every term by $${k}$: $${ans.text}$.`,
    };
  }),

  // ------------------------------------------------------------------ solutions in an interval
  b.dynamic('solutions-in-interval', { difficulty: 1, origin: 'past-paper', tags: ['solutions in an interval'] }, (r) => {
    const fn = r.pick<Basic>(['sin', 'cos', 'tan']);
    const value = r.pick(fn === 'tan' ? TAN_VALUES : SC_VALUES);
    const radians = r.chance(0.6);
    const sol = solve(fn, value.v);
    const s1 = sol[0] as number;
    const norm = (xs: number[]): number[] => xs.map((d) => ((d % 360) + 360) % 360);
    const candidates = [
      solve(fn, -value.v), // sign slip
      norm([s1, 360 - s1]),
      norm([s1, 180 - s1]),
      norm([s1, 180 + s1]),
      [s1], // principal value only
    ];
    const answer = setOpt(sol, radians);
    const ref = refAngle(s1);
    const quads = sol.map(quadrant);
    return {
      stem: tex`The solution set of $${FN[fn]} x = ${value.tex}$ in the interval $${intervalTex(360, radians)}$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates.map((c) => setOpt(c, radians))),
      explanation: tex`The reference angle is $${ang(ref, radians)}$. Since $${FN[fn]} x ${value.v > 0 ? '> 0' : '< 0'}$, $x$ lies in quadrants ${ROMAN[quads[0] as number]} and ${ROMAN[quads[1] as number]}, so $x = ${sol.map((d) => ang(d, radians)).join(', ')}$.`,
    };
  }),

  b.dynamic('sin-cos-linear-zero', { difficulty: 1, origin: 'past-paper', tags: ['solutions in an interval'] }, (r) => {
    // a sin x + b cos x = 0  =>  tan x = -b/a
    const forms: ReadonlyArray<{ eq: string; t: number; tt: string; inv: number }> = [
      { eq: '\\sin x + \\cos x = 0', t: -1, tt: '-1', inv: -1 },
      { eq: '\\sin x - \\cos x = 0', t: 1, tt: '1', inv: 1 },
      { eq: '\\sqrt{3}\\sin x + \\cos x = 0', t: -1 / SQ3, tt: '-\\frac{1}{\\sqrt{3}}', inv: -SQ3 },
      { eq: '\\sqrt{3}\\sin x - \\cos x = 0', t: 1 / SQ3, tt: '\\frac{1}{\\sqrt{3}}', inv: SQ3 },
      { eq: '\\sin x + \\sqrt{3}\\cos x = 0', t: -SQ3, tt: '-\\sqrt{3}', inv: -1 / SQ3 },
      { eq: '\\sin x - \\sqrt{3}\\cos x = 0', t: SQ3, tt: '\\sqrt{3}', inv: 1 / SQ3 },
    ];
    const f = r.pick(forms);
    const radians = r.chance(0.5);
    const sol = solve('tan', f.t);
    const s1 = sol[0] as number;
    const candidates = [
      solve('tan', -f.t), // sign slip
      solve('tan', f.inv), // inverted ratio
      [s1, 180 - s1].map((d) => (d + 360) % 360),
      [s1],
    ];
    const answer = setOpt(sol, radians);
    return {
      stem: tex`The solutions of $${f.eq}$ in $${intervalTex(360, radians)}$ are:`,
      answer,
      distractors: pickDistractors(answer, candidates.map((c) => setOpt(c, radians))),
      explanation: tex`Divide by $\cos x$ ($\cos x \neq 0$ here, otherwise $\sin x$ would also be $0$): $\tan x = ${f.tt}$. $\tan$ is ${f.t > 0 ? 'positive in quadrants I and III' : 'negative in quadrants II and IV'}, so $x = ${sol.map((d) => ang(d, radians)).join(', ')}$.`,
    };
  }),

  b.dynamic('count-solutions-multiple-angle', { difficulty: 2, tags: ['solutions in an interval'] }, (r) => {
    const fn = r.pick<Basic>(['sin', 'cos', 'tan']);
    const k = r.pick([2, 3, 4]);
    const pool = fn === 'tan' ? [...TAN_VALUES, V('0', 0)] : [...SC_VALUES, ...ZERO_ONE];
    const value = r.pick(pool);
    const hi = r.pick([360, 360, 180]);
    const radians = r.chance(0.7);
    const thetas = solve(fn, value.v, 0, k * hi, true);
    const count = thetas.length;
    const base = solve(fn, value.v, 0, hi, true).length; // forgot the multiple angle
    const { answer, distractors } = numericOptions(r, {
      correct: count,
      wrong: [base, count + 1, count - 1, 2 * k, k * base + 1],
      format: (x) => n$(x),
      fallback: 'integer',
    });
    return {
      stem: tex`The number of solutions of $${FN[fn]} ${k}x = ${value.tex}$ in the interval $${intervalTex(hi, radians)}$ is:`,
      answer,
      distractors,
      explanation: tex`As $x$ runs over $${intervalTex(hi, radians)}$, $\theta = ${k}x$ runs over $${intervalTex(k * hi, radians)}$. There $${FN[fn]}\theta = ${value.tex}$ gives $\theta = ${thetas.map((d) => ang(d, radians)).join(', ')}$, so there are $${count}$ values of $x$.`,
    };
  }),

  b.dynamic('tan-equals-k-cot', { difficulty: 2, origin: 'past-paper', tags: ['solutions in an interval'] }, (r) => {
    const k = r.pick([3, 1, 1 / 3]);
    const form = r.pick(['cot', 'cot', 'sec'] as const);
    const radians = r.chance(0.6);
    let eq: string;
    if (form === 'cot') {
      // tan x = 3 cot x, 3 tan x = cot x, tan x = cot x, or the "... = 0" form
      const lhs = k === 1 / 3 ? '3' : '';
      const rhs = k === 3 ? '3' : '';
      eq = r.chance(0.5) ? `${lhs}\\tan x = ${rhs}\\cot x` : `${lhs}\\tan x - ${rhs}\\cot x = 0`;
    } else {
      eq = `\\sec^2 x = ${k === 3 ? '4' : k === 1 ? '2' : '\\frac{4}{3}'}`;
    }
    const root = Math.sqrt(k);
    const rootTex = k === 3 ? '\\sqrt{3}' : k === 1 ? '1' : '\\frac{1}{\\sqrt{3}}';
    const sol = [...solve('tan', root, 0, 360, false), ...solve('tan', -root, 0, 360, false)];
    const alpha = solve('tan', root)[0] as number;
    const other = k === 1 ? Math.sqrt(3) : 1;
    const candidates = [
      solve('tan', root), // forgot the negative root
      [alpha, 180 - alpha],
      [...solve('tan', 1 / root), ...solve('tan', -1 / root)], // inverted ratio
      [...solve('tan', other), ...solve('tan', -other)],
      solve('tan', -root),
    ];
    const answer = setOpt(sol, radians);
    const first =
      form === 'cot'
        ? tex`Since $\cot x = \frac{1}{\tan x}$, the equation gives $\tan^2 x = ${k === 1 / 3 ? '\\frac{1}{3}' : k}$`
        : tex`Using $\sec^2 x = 1 + \tan^2 x$, we get $\tan^2 x = ${k === 1 / 3 ? '\\frac{1}{3}' : k}$`;
    return {
      stem: tex`The solutions of $${eq}$ in the interval $${intervalTex(360, radians, true)}$ are:`,
      answer,
      distractors: pickDistractors(answer, candidates.map((c) => setOpt(c, radians))),
      explanation: tex`${first}, so $\tan x = \pm ${rootTex}$. The positive value gives quadrants I and III, the negative value quadrants II and IV: $x = ${sol
        .sort((p, q) => p - q)
        .map((d) => ang(d, radians))
        .join(', ')}$.`,
    };
  }),

  b.dynamic('quadratic-in-sin-cos', { difficulty: 2, tags: ['solutions in an interval'] }, (r) => {
    const fn = r.pick<'sin' | 'cos'>(['sin', 'cos']);
    // roots p/q of the quadratic in s = sin x (or cos x)
    const valid: ReadonlyArray<readonly [number, number]> = [
      [1, 2],
      [-1, 2],
      [1, 1],
      [-1, 1],
      [0, 1],
    ];
    const all: ReadonlyArray<readonly [number, number]> = [...valid, [2, 1], [-2, 1]];
    let r1: readonly [number, number];
    let r2: readonly [number, number];
    // distinct roots; a rejected root (+-2) is paired only with +-1/2 so two angles survive
    do {
      r1 = r.pick(valid);
      r2 = r.pick(all);
    } while (r1[0] * r2[1] === r2[0] * r1[1] || (r1[0] === 0 && r2[0] === 0) || (Math.abs(r2[0]) === 2 && r1[1] !== 2));
    const [p1, q1] = r1;
    const [p2, q2] = r2;
    const A = q1 * q2;
    const B = -(q1 * p2 + q2 * p1);
    const C = p1 * p2;
    const f = FN[fn];
    const coef = (c: number, term: string, first: boolean): string => {
      if (c === 0) return '';
      const mag = Math.abs(c) === 1 && term ? '' : `${Math.abs(c)}`;
      const sign = c < 0 ? '-' : first ? '' : '+';
      return `${first ? sign : ` ${sign} `}${mag}${term}`;
    };
    const lhs = `${coef(A, `${f}^2 x`, true)}${coef(B, `${f} x`, false)}${coef(C, '', false)}`;
    const factor = (p: number, q: number): string => {
      if (p === 0) return `${f} x`;
      return `(${q === 1 ? '' : q}${f} x ${p > 0 ? '-' : '+'} ${Math.abs(p)})`;
    };
    const factored = p1 === 0 ? `${factor(p1, q1)}${factor(p2, q2)}` : `${factor(p2, q2)}${factor(p1, q1)}`;
    const v1 = p1 / q1;
    const v2 = p2 / q2;
    const sols = (vs: number[], g: Basic = fn): number[] =>
      [...new Set(vs.flatMap((v) => (Math.abs(v) <= 1 ? solve(g, v, 0, 360, false) : [])))];
    const sol = sols([v1, v2]);
    const radians = r.chance(0.7);
    const fracTex = (p: number, q: number): string => (q === 1 ? `${p}` : `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q}}`);
    const candidates = [
      sols([v1]),
      sols([v2]),
      sols([-v1, -v2]), // factorised with the wrong signs
      [...new Set([v1, v2].filter((v) => Math.abs(v) <= 1).map((v) => solve(fn, v, 0, 360, false)[0] as number))], // principal values only
      sols([v1, v2], fn === 'sin' ? 'cos' : 'sin'), // used the other ratio
      sol.map((d) => (d + 180) % 360), // wrong quadrants
      sol.map((d) => (540 - d) % 360),
      sols([-v1, -v2], fn === 'sin' ? 'cos' : 'sin'),
      sol.includes(0) ? [...sol, 360] : [], // counted 2 pi although the interval is half-open
    ].filter((c) => c.length > 0);
    const answer = setOpt(sol, radians);
    const rejected = Math.abs(v2) > 1 ? tex` The value $${f} x = ${fracTex(p2, q2)}$ is rejected because $|${f} x| \le 1$.` : '';
    return {
      stem: tex`The solutions of $${lhs} = 0$ for $${ang(0, radians)} \le x < ${ang(360, radians)}$ are:`,
      answer,
      distractors: pickDistractors(answer, candidates.map((c) => setOpt(c, radians))),
      explanation: tex`Factorise: $${factored} = 0$, so $${f} x = ${fracTex(p1, q1)}$ or $${f} x = ${fracTex(p2, q2)}$.${rejected} Collecting all angles in $[${ang(0, radians)}, ${ang(360, radians)})$: $x = ${[...sol]
        .sort((p, q) => p - q)
        .map((d) => ang(d, radians))
        .join(', ')}$.`,
    };
  }),

  // ------------------------------------------------------------------ fixed items
  ...b.mcqs([
    {
      id: 'sin-equals-cos-general',
      d: 1,
      o: 'past-paper',
      t: ['general solutions'],
      q: tex`The general solution of $\sin x = \cos x$, where $n \in \mathbb{Z}$, is:`,
      a: tex`$x = n\pi + \frac{\pi}{4}$`,
      x: [tex`$x = 2n\pi + \frac{\pi}{4}$`, tex`$x = n\pi - \frac{\pi}{4}$`, tex`$x = \frac{n\pi}{2} + \frac{\pi}{4}$`],
      e: tex`Dividing by $\cos x$ gives $\tan x = 1 = \tan\frac{\pi}{4}$, and $\tan$ has period $\pi$, so $x = n\pi + \frac{\pi}{4}$. ($2n\pi + \frac{\pi}{4}$ misses $\frac{5\pi}{4}$.)`,
    },
    {
      id: 'equation-with-no-solution',
      d: 1,
      t: ['general solutions'],
      q: 'Which of the following equations has no real solution?',
      a: tex`$\sin x = \frac{3}{2}$`,
      x: [tex`$\tan x = 5$`, tex`$\csc x = 2$`, tex`$\cos x = -1$`],
      e: tex`$-1 \le \sin x \le 1$, so $\sin x = \frac{3}{2}$ is impossible. $\tan x$ takes every real value, $\csc x = 2$ means $\sin x = \frac{1}{2}$, and $\cos \pi = -1$.`,
    },
    {
      id: 'sin-2x-equals-sin-x',
      d: 2,
      t: ['solutions in an interval'],
      q: tex`The solutions of $\sin 2x = \sin x$ in $[0, \pi]$ are:`,
      a: tex`$\left\{ 0, \frac{\pi}{3}, \pi \right\}$`,
      x: [
        tex`$\left\{ \frac{\pi}{3} \right\}$`,
        tex`$\left\{ 0, \pi \right\}$`,
        tex`$\left\{ 0, \frac{\pi}{3}, \frac{2\pi}{3}, \pi \right\}$`,
      ],
      e: tex`$2\sin x\cos x - \sin x = 0 \Rightarrow \sin x(2\cos x - 1) = 0$. So $\sin x = 0$ ($x = 0, \pi$) or $\cos x = \frac{1}{2}$ ($x = \frac{\pi}{3}$). Cancelling $\sin x$ loses the roots $0$ and $\pi$.`,
    },
    {
      id: 'tan-plus-cot-surd',
      d: 2,
      t: ['general solutions'],
      q: tex`The general solution of $\tan x + \cot x = \frac{4}{\sqrt{3}}$, where $n \in \mathbb{Z}$, is:`,
      a: tex`$x = n\pi + \frac{\pi}{6}$ or $x = n\pi + \frac{\pi}{3}$`,
      x: [
        tex`$x = 2n\pi + \frac{\pi}{6}$ or $x = 2n\pi + \frac{\pi}{3}$`,
        tex`$x = n\pi - \frac{\pi}{6}$ or $x = n\pi - \frac{\pi}{3}$`,
        tex`$x = n\pi + \frac{\pi}{6}$ or $x = n\pi + \frac{2\pi}{3}$`,
      ],
      e: tex`With $t = \tan x$: $t + \frac{1}{t} = \frac{4}{\sqrt{3}} \Rightarrow \sqrt{3}t^2 - 4t + \sqrt{3} = 0 \Rightarrow (\sqrt{3}t - 1)(t - \sqrt{3}) = 0$. So $\tan x = \frac{1}{\sqrt{3}}$ or $\sqrt{3}$, giving $x = n\pi + \frac{\pi}{6}$ or $x = n\pi + \frac{\pi}{3}$.`,
    },
    {
      id: 'sum-to-product-general',
      d: 3,
      t: ['general solutions'],
      q: tex`The general solution of $\sin x + \sin 3x = 0$, where $n \in \mathbb{Z}$, is:`,
      a: tex`$x = \frac{n\pi}{2}$`,
      x: [tex`$x = n\pi$`, tex`$x = \frac{n\pi}{4}$`, tex`$x = (2n+1)\frac{\pi}{2}$`],
      e: tex`$\sin 3x + \sin x = 2\sin 2x\cos x = 0$. $\sin 2x = 0 \Rightarrow x = \frac{n\pi}{2}$; $\cos x = 0 \Rightarrow x = (2n+1)\frac{\pi}{2}$, which is already contained in $\frac{n\pi}{2}$. Hence $x = \frac{n\pi}{2}$.`,
    },
    {
      id: 'cos-squared-reduction',
      d: 3,
      t: ['solutions in an interval'],
      q: tex`The solutions of $2\cos^2 x + 3\sin x = 3$ in $[0, 2\pi]$ are:`,
      a: tex`$\left\{ \frac{\pi}{6}, \frac{\pi}{2}, \frac{5\pi}{6} \right\}$`,
      x: [
        tex`$\left\{ \frac{\pi}{6}, \frac{5\pi}{6} \right\}$`,
        tex`$\left\{ \frac{7\pi}{6}, \frac{3\pi}{2}, \frac{11\pi}{6} \right\}$`,
        tex`$\left\{ \frac{\pi}{6}, \frac{\pi}{2} \right\}$`,
      ],
      e: tex`Put $\cos^2 x = 1 - \sin^2 x$: $2 - 2\sin^2 x + 3\sin x - 3 = 0 \Rightarrow 2\sin^2 x - 3\sin x + 1 = 0 \Rightarrow (2\sin x - 1)(\sin x - 1) = 0$. So $\sin x = \frac{1}{2}$ ($x = \frac{\pi}{6}, \frac{5\pi}{6}$) or $\sin x = 1$ ($x = \frac{\pi}{2}$).`,
    },
  ]),
]);
