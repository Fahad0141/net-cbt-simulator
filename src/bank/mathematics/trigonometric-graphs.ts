/**
 * Trigonometric Functions and their Graphs (FSc Part I): domain and range, period,
 * graphs, and maximum / minimum values of trigonometric expressions.
 *
 * Periods are exact multiples of pi, held as `Fraction` coefficients of pi so options
 * are always printed in one canonical form.
 */
import { defineBank } from '@/engine/authoring';
import { frac, gcd, lcm, m$, numericOptions, pickDistractors, signed, tex } from '@/engine/helpers';
import type { Fraction } from '@/engine/helpers';

// --------------------------------------------------------------------------- notation

type Fn = 'sin' | 'cos' | 'tan' | 'cot' | 'sec' | 'csc';

const FN: Readonly<Record<Fn, string>> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  cot: '\\cot',
  sec: '\\sec',
  csc: '\\csc',
};

/** Period of the basic function as a multiple of pi. */
const BASE_PERIOD: Readonly<Record<Fn, number>> = { sin: 2, cos: 2, sec: 2, csc: 2, tan: 1, cot: 1 };

/** `f` times pi: `\pi`, `\frac{\pi}{3}`, `4\pi`, `\frac{2\pi}{3}`. */
function piTex(f: Fraction): string {
  const n = Math.abs(f.n);
  const sign = f.n < 0 ? '-' : '';
  const top = n === 1 ? '\\pi' : `${n}\\pi`;
  return f.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${f.d}}`;
}

/** `b x` for a positive rational b: `3x`, `x`, `\frac{x}{2}`, `\frac{2x}{3}`. */
function bxTex(b: Fraction): string {
  if (b.d === 1) return b.n === 1 ? 'x' : `${b.n}x`;
  return `\\frac{${b.n === 1 ? '' : b.n}x}{${b.d}}`;
}

/** `\sin 3x`, `\sin\frac{x}{2}`, `\sin\left(3x + \frac{\pi}{4}\right)`. */
function fnOf(fn: Fn, b: Fraction, phase = ''): string {
  if (phase) return `${FN[fn]}\\left(${bxTex(b)} ${phase}\\right)`;
  return b.d === 1 ? `${FN[fn]} ${bxTex(b)}` : `${FN[fn]}${bxTex(b)}`;
}

/** Leading coefficient: 1 -> '', -1 -> '-', 3 -> '3'. */
const lead = (k: number): string => (k === 1 ? '' : k === -1 ? '-' : `${k}`);

/** Closed interval `[a, b]`. */
const closed = (a: number, b: number): string => `[${a}, ${b}]`;

/** `(-\infty, a] \cup [b, \infty)`, closed or open at the finite ends. */
const outside = (a: number, b: number, open = false): string =>
  open ? `(-\\infty, ${a}) \\cup (${b}, \\infty)` : `(-\\infty, ${a}] \\cup [${b}, \\infty)`;

/** Least common multiple of two positive rationals. */
const lcmFrac = (x: Fraction, y: Fraction): Fraction => frac(lcm(x.n, y.n), gcd(x.d, y.d));

/** Greatest common divisor of two positive rationals. */
const gcdFrac = (x: Fraction, y: Fraction): Fraction => frac(gcd(x.n, y.n), lcm(x.d, y.d));

/** Formats a multiple of 1/2 exactly: 3.5 -> `\frac{7}{2}`. */
const halfTex = (v: number): string => m$(frac(Math.round(v * 2), 2).toTex());

const B_VALUES: readonly Fraction[] = [
  frac(2),
  frac(3),
  frac(4),
  frac(5),
  frac(6),
  frac(8),
  frac(1, 2),
  frac(1, 3),
  frac(2, 3),
  frac(3, 2),
  frac(3, 4),
];

const PHASES: readonly string[] = [
  '',
  '',
  '+ \\frac{\\pi}{3}',
  '- \\frac{\\pi}{4}',
  '+ \\frac{\\pi}{6}',
  '- \\frac{\\pi}{2}',
  '+ 1',
];

/** Pythagorean pairs so that sqrt(a^2 + b^2) is an integer. */
const PYTH: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [4, 3, 5],
  [6, 8, 10],
  [8, 6, 10],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
  [9, 12, 15],
  [12, 9, 15],
  [7, 24, 25],
  [24, 7, 25],
];

export default defineBank('mathematics', 'trigonometric-graphs', (b) => [
  // ------------------------------------------------------------------------- period
  b.dynamic('period-of-transformed-ratio', { difficulty: 1, origin: 'past-paper', tags: ['period'] }, (r) => {
    const fn = r.pick<Fn>(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sin', 'cos']);
    const k = r.pick(B_VALUES);
    const amp = r.pick([1, 2, 3, 4, 5, -1, -2, -3]);
    const shift = r.pick([0, 0, 1, 2, 3, -1, -2, -4]);
    const phase = r.pick(PHASES);
    const base = BASE_PERIOD[fn];
    const period = frac(base).div(k);
    const other = frac(3 - base).div(k); // used the period of the other family (pi vs 2pi)
    const answer = m$(piTex(period));
    const distractors = pickDistractors(answer, [
      m$(piTex(other)),
      m$(piTex(frac(base).mul(k))), // multiplied by b instead of dividing
      m$(piTex(frac(base))), // ignored the coefficient of x
      m$(piTex(period.mul(2))),
      m$(piTex(period.div(2))),
    ]);
    const y = `${lead(amp)}${fnOf(fn, k, phase)}${shift ? signed(shift) : ''}`;
    const baseTex = piTex(frac(base));
    const kTex = k.toTex();
    // `\frac{2\pi}{4} = \frac{\pi}{2}`, `2\pi \div \frac{3}{4} = \frac{8\pi}{3}`; no `= x` when nothing simplifies.
    const raw = k.d === 1 ? `\\frac{${baseTex}}{${kTex}}` : `${baseTex} \\div ${kTex}`;
    const working = raw === piTex(period) ? raw : `${raw} = ${piTex(period)}`;
    return {
      stem: tex`The period of $y = ${y}$ is:`,
      answer,
      distractors,
      explanation: tex`The period of $${FN[fn]} x$ is $${baseTex}$, so the period of $${FN[fn]}(bx + c)$ is $\frac{${baseTex}}{|b|}$. Here $b = ${kTex}$, giving $${working}$. The multiplier in front of the ratio, the phase and the vertical shift do not change the period.`,
    };
  }),

  b.dynamic('period-of-sum', { difficulty: 3, tags: ['period'] }, (r) => {
    // Redraw until neither period is a multiple of the other, so the L.C.M. is a genuine step.
    let f1: Fn, f2: Fn, a: number, c: number, p1: Fraction, p2: Fraction, period: Fraction;
    do {
      f1 = r.pick<Fn>(['sin', 'cos', 'tan']);
      f2 = f1 === 'tan' ? r.pick<Fn>(['sin', 'cos']) : r.pick<Fn>(['sin', 'cos', 'cos', 'tan']);
      const m = r.pick([1, 1, 2, 2, 3, 4]);
      a = m * r.int(1, 4);
      c = m * r.intExcept(1, 4, [a / m]);
      p1 = frac(BASE_PERIOD[f1], a);
      p2 = frac(BASE_PERIOD[f2], c);
      period = lcmFrac(p1, p2);
    } while (period.equals(p1) || period.equals(p2));
    const small = p1.compare(p2) < 0 ? p1 : p2;
    const large = p1.compare(p2) < 0 ? p2 : p1;
    const answer = m$(piTex(period));
    const distractors = pickDistractors(answer, [
      m$(piTex(small)), // took the smaller period
      m$(piTex(gcdFrac(p1, p2))), // took the HCF instead of the LCM
      m$(piTex(large)),
      m$(piTex(p1.add(p2))), // added the periods
      m$(piTex(period.mul(2))),
      m$(piTex(period.div(2))),
      m$(piTex(period.mul(3))),
    ]);
    const term = (fn: Fn, k: number): string => `${FN[fn]} ${k === 1 ? 'x' : `${k}x`}`;
    return {
      stem: tex`The period of $f(x) = ${term(f1, a)} + ${term(f2, c)}$ is:`,
      answer,
      distractors,
      explanation: tex`Period of $${term(f1, a)}$ is $${piTex(p1)}$ and period of $${term(f2, c)}$ is $${piTex(p2)}$. The sum repeats only when both terms repeat, so its period is the L.C.M. of the two (L.C.M. of the numerators over H.C.F. of the denominators): $\operatorname{LCM}\left(${piTex(p1)}, ${piTex(p2)}\right) = ${piTex(period)}$.`,
    };
  }),

  // ------------------------------------------------------------------------- domain and range
  b.dynamic('range-of-shifted-sine', { difficulty: 1, origin: 'past-paper', tags: ['domain and range', 'maximum and minimum values'] }, (r) => {
    const fn = r.pick<Fn>(['sin', 'cos']);
    const p = r.nonZero(-5, 6);
    const q = r.int(2, 6) * r.sign();
    const k = r.int(1, 5);
    const aq = Math.abs(q);
    const lo = p - aq;
    const hi = p + aq;
    const answer = m$(closed(lo, hi));
    const distractors = pickDistractors(answer, [
      m$(closed(-aq, aq)), // ignored the constant term
      m$(closed(p - 1, p + 1)), // ignored the amplitude
      m$(closed(p, hi)), // assumed the ratio is never negative
      m$(closed(p - 2 * aq, p + 2 * aq)),
    ]);
    const arg = k === 1 ? 'x' : `${k}x`;
    const y = `${p} ${q < 0 ? '-' : '+'} ${aq}${FN[fn]} ${arg}`;
    return {
      stem: tex`The range of $y = ${y}$ is:`,
      answer,
      distractors,
      explanation: tex`Since $-1 \le ${FN[fn]} ${arg} \le 1$, the term $${q < 0 ? '-' : ''}${aq}${FN[fn]} ${arg}$ lies in $[-${aq}, ${aq}]$. Adding $${p}$ gives $${lo} \le y \le ${hi}$, so the range is $${closed(lo, hi)}$.`,
    };
  }),

  b.dynamic('range-of-shifted-secant', { difficulty: 2, tags: ['domain and range'] }, (r) => {
    const fn = r.pick<Fn>(['sec', 'csc']);
    const p = r.nonZero(-5, 5);
    const q = r.int(1, 5) * r.sign();
    const k = r.int(1, 4);
    const aq = Math.abs(q);
    const lo = p - aq;
    const hi = p + aq;
    const answer = m$(outside(lo, hi));
    const distractors = pickDistractors(answer, [
      m$(closed(lo, hi)), // treated it like sine
      m$(outside(-aq, aq)), // ignored the constant term
      m$(outside(lo, hi, true)), // excluded the attained values
    ]);
    const arg = k === 1 ? 'x' : `${k}x`;
    const y = `${p} ${q < 0 ? '-' : '+'} ${aq === 1 ? '' : aq}${FN[fn]} ${arg}`;
    return {
      stem: tex`The range of $y = ${y}$ is:`,
      answer,
      distractors,
      explanation: tex`$|${FN[fn]} ${arg}| \ge 1$, so $${q < 0 ? '-' : ''}${aq === 1 ? '' : aq}${FN[fn]} ${arg} \le -${aq}$ or $\ge ${aq}$ (both values attained). Adding $${p}$: $y \le ${lo}$ or $y \ge ${hi}$, i.e. the range is $${outside(lo, hi)}$.`,
    };
  }),

  b.dynamic('domain-of-tangent-type', { difficulty: 2, tags: ['domain and range'] }, (r) => {
    const fn = r.pick<Fn>(['tan', 'sec', 'cot', 'csc']);
    const k = r.int(1, 6);
    const over = (top: string, d: number): string => (d === 1 ? top : `\\frac{${top}}{${d}}`);
    const oddHalf = over('(2n+1)\\pi', 2 * k);
    const whole = over('n\\pi', k);
    const oddWhole = over('(2n+1)\\pi', k);
    const half = over('n\\pi', 2 * k);
    const set = (s: string): string => m$(`\\mathbb{R} - \\left\\{${s}\\right\\}`);
    const cosType = fn === 'tan' || fn === 'sec';
    const ans = cosType ? oddHalf : whole;
    const answer = set(ans);
    const distractors = pickDistractors(answer, [set(cosType ? whole : oddHalf), set(oddWhole), set(half)]);
    const arg = k === 1 ? 'x' : `${k}x`;
    const zeroOf = cosType ? '\\cos' : '\\sin';
    const zeros = cosType ? '(2n+1)\\frac{\\pi}{2}' : 'n\\pi';
    return {
      stem: tex`The domain of $y = ${FN[fn]} ${arg}$ is ($n \in \mathbb{Z}$):`,
      answer,
      distractors,
      explanation: tex`$${FN[fn]} ${arg}$ is undefined where $${zeroOf} ${arg} = 0$, i.e. $${arg} = ${zeros}$${k === 1 ? '' : `, so $x = ${ans}$`}. The domain is all reals except these points.`,
    };
  }),

  // ------------------------------------------------------------------------- maximum and minimum
  b.dynamic('extreme-of-a-sin-plus-b-cos', { difficulty: 2, origin: 'past-paper', tags: ['maximum and minimum values'] }, (r) => {
    const [a0, b0, R] = r.pick(PYTH);
    const a = a0 * r.sign();
    const bb = b0 * r.sign();
    const c = r.pick([0, 0, 1, 2, 3, 4, -1, -2, -3]);
    const k = r.pick([1, 1, 2, 3]);
    const wantMax = r.chance(0.6);
    const s = wantMax ? 1 : -1;
    const correct = c + s * R;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        c + s * (a0 + b0), // added the coefficients
        c - s * R, // the other extreme
        s * R, // forgot the constant
        c + s * R * R, // forgot the square root
      ],
      format: (v) => `$${v}$`,
      allowNegative: true,
      allowZero: true,
    });
    const arg = k === 1 ? 'x' : `${k}x`;
    const expr = `${lead(a)}\\sin ${arg} ${bb < 0 ? '-' : '+'} ${b0}\\cos ${arg}${c ? signed(c) : ''}`;
    return {
      stem: tex`The ${wantMax ? 'maximum' : 'minimum'} value of $${expr}$ is:`,
      answer,
      distractors,
      explanation: tex`$a\sin\theta + b\cos\theta$ ranges over $\left[-\sqrt{a^2+b^2}, \sqrt{a^2+b^2}\right]$. Here $\sqrt{${a0}^2 + ${b0}^2} = ${R}$, so the ${wantMax ? 'maximum' : 'minimum'} value is $${c ? `${c}${wantMax ? ' + ' : ' - '}${R} = ` : ''}${correct}$.`,
    };
  }),

  b.dynamic('extreme-of-sin-cos-product', { difficulty: 2, tags: ['maximum and minimum values'] }, (r) => {
    const a = r.int(2, 12);
    const c = r.pick([0, 0, 1, 2, 3, -1, -2, -3]);
    const wantMax = r.chance(0.6);
    const s = wantMax ? 1 : -1;
    const correct = c + (s * a) / 2;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        c + s * a, // took max of sin x cos x as 1
        c - (s * a) / 2, // the other extreme
        c + s * 2 * a, // used sin x cos x = 2 sin 2x
        (s * a) / 2, // forgot the constant
        c + (s * a) / 4,
      ],
      format: halfTex,
      allowNegative: true,
      allowZero: true,
    });
    const half = frac(a, 2).toTex();
    const expr = `${a}\\sin x\\cos x${c ? signed(c) : ''}`;
    return {
      stem: tex`The ${wantMax ? 'maximum' : 'minimum'} value of $${expr}$ is:`,
      answer,
      distractors,
      explanation: tex`$${a}\sin x\cos x = ${a === 2 ? '' : half}\sin 2x$ and $-1 \le \sin 2x \le 1$, so the ${wantMax ? 'maximum' : 'minimum'} is $${c ? `${c}${wantMax ? ' + ' : ' - '}${half} = ` : ''}${frac(Math.round(correct * 2), 2).toTex()}$.`,
    };
  }),

  b.dynamic('extreme-of-reciprocal', { difficulty: 2, tags: ['maximum and minimum values'] }, (r) => {
    const p = r.int(2, 7);
    const aq = r.int(1, p - 1);
    const q = aq * r.sign();
    const k = r.int(1, 6);
    const fn = r.pick<Fn>(['sin', 'cos']);
    const wantMax = r.chance(0.5);
    const big = frac(k, p - aq);
    const small = frac(k, p + aq);
    const ans = wantMax ? big : small;
    const answer = m$(ans.toTex());
    const distractors = pickDistractors(answer, [
      m$((wantMax ? small : big).toTex()), // the other extreme
      m$(frac(k, p).toTex()), // put the ratio equal to 0
      m$(ans.inv().toTex()), // inverted the fraction
      m$(frac(k, p + 2 * aq).toTex()),
      m$(frac(2 * k, p).toTex()),
    ]);
    const den = `${p} ${q < 0 ? '-' : '+'} ${aq === 1 ? '' : aq}${FN[fn]} x`;
    const num = k === 1 ? '1' : `${k}`;
    return {
      stem: tex`The ${wantMax ? 'maximum' : 'minimum'} value of $\dfrac{${num}}{${den}}$ is:`,
      answer,
      distractors,
      explanation: tex`Since $-1 \le ${FN[fn]} x \le 1$, the denominator lies between $${p - aq}$ and $${p + aq}$ (always positive). The fraction is ${wantMax ? 'largest when the denominator is smallest' : 'smallest when the denominator is largest'}: $\frac{${k}}{${wantMax ? p - aq : p + aq}}${ans.n === k && ans.d !== 1 && ans.d === (wantMax ? p - aq : p + aq) ? '' : ` = ${ans.toTex()}`}$.`,
    };
  }),

  // ------------------------------------------------------------------------- fixed items
  ...b.mcqs([
    {
      id: 'range-of-tangent',
      d: 1,
      o: 'past-paper',
      t: ['domain and range'],
      q: tex`The range of $y = \tan x$ is:`,
      a: tex`$\mathbb{R}$`,
      x: [tex`$[-1, 1]$`, tex`$\left(-\frac{\pi}{2}, \frac{\pi}{2}\right)$`, tex`$[0, \infty)$`],
      e: tex`As $x \to \frac{\pi}{2}^-$, $\tan x \to +\infty$ and as $x \to -\frac{\pi}{2}^+$, $\tan x \to -\infty$, so $\tan x$ takes every real value. $\left(-\frac{\pi}{2}, \frac{\pi}{2}\right)$ is the principal domain, not the range.`,
    },
    {
      id: 'range-of-cosecant',
      d: 1,
      t: ['domain and range'],
      q: tex`The range of $y = \csc x$ is:`,
      a: tex`$(-\infty, -1] \cup [1, \infty)$`,
      x: [tex`$[-1, 1]$`, tex`$(-\infty, -1) \cup (1, \infty)$`, tex`$\mathbb{R} - \{0\}$`],
      e: tex`$\csc x = \frac{1}{\sin x}$ with $0 < |\sin x| \le 1$, so $|\csc x| \ge 1$. The values $\pm 1$ are attained at $x = \pm\frac{\pi}{2}$, so the endpoints are included.`,
    },
    {
      id: 'cosine-graph-symmetry',
      d: 1,
      t: ['graphs'],
      q: tex`The graph of $y = \cos x$ is symmetric about the:`,
      a: tex`$y$-axis`,
      x: [tex`$x$-axis`, 'origin', tex`line $y = x$`],
      e: tex`$\cos(-x) = \cos x$, so cosine is an even function and its graph is symmetric about the $y$-axis. (Sine is odd: its graph is symmetric about the origin.)`,
    },
    {
      id: 'sine-graph-x-intercepts',
      d: 1,
      t: ['graphs'],
      q: tex`On the interval $[0, 2\pi]$, the graph of $y = \sin x$ meets the $x$-axis at:`,
      a: tex`$x = 0, \pi, 2\pi$`,
      x: [tex`$x = \frac{\pi}{2}, \frac{3\pi}{2}$`, tex`$x = \pi, 2\pi$`, tex`$x = 0, \frac{\pi}{2}, \pi$`],
      e: tex`$\sin x = 0$ when $x = n\pi$. In $[0, 2\pi]$ this gives $x = 0, \pi, 2\pi$. The points $\frac{\pi}{2}, \frac{3\pi}{2}$ are where the graph of $\cos x$ crosses the axis.`,
    },
    {
      id: 'period-of-absolute-sine',
      d: 2,
      o: 'past-paper',
      t: ['period', 'graphs'],
      q: tex`The period of $y = |\sin x|$ is:`,
      a: tex`$\pi$`,
      x: [tex`$2\pi$`, tex`$\frac{\pi}{2}$`, tex`$4\pi$`],
      e: tex`$|\sin(x + \pi)| = |-\sin x| = |\sin x|$, and no smaller positive number works, so the period is $\pi$. Taking the modulus reflects the negative arch of the graph above the $x$-axis, halving the period $2\pi$.`,
    },
    {
      id: 'period-of-sin4-plus-cos4',
      d: 3,
      t: ['period'],
      q: tex`The period of $y = \sin^4 x + \cos^4 x$ is:`,
      a: tex`$\frac{\pi}{2}$`,
      x: [tex`$\pi$`, tex`$2\pi$`, tex`$\frac{\pi}{4}$`],
      e: tex`$\sin^4 x + \cos^4 x = (\sin^2 x + \cos^2 x)^2 - 2\sin^2 x\cos^2 x = 1 - \frac{1}{2}\sin^2 2x = \frac{3}{4} + \frac{1}{4}\cos 4x$. The period of $\cos 4x$ is $\frac{2\pi}{4} = \frac{\pi}{2}$.`,
    },
  ]),
]);
