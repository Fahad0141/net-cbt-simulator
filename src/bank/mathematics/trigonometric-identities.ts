/**
 * Trigonometric Identities (FSc Part I): compound angles, double, half and triple angles,
 * sum-product formulas and allied angles.
 *
 * Surd answers such as sin 75° = (√6 + √2)/4 are computed exactly with `Surd`, a tiny
 * number type for Q(√2, √3). Every option is therefore an exact value printed in one
 * canonical, rationalised form, so two options can never show the same number in two
 * different disguises.
 */
import { defineBank } from '@/engine/authoring';
import {
  exactTrig,
  Fraction,
  frac,
  gcd,
  lcm,
  m$,
  pickDistractors,
  radianTex,
  range,
  tex,
} from '@/engine/helpers';
import type { TrigFn } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// --------------------------------------------------------------------------- notation

type Basic = 'sin' | 'cos' | 'tan';

const BASIC: readonly Basic[] = ['sin', 'cos', 'tan'];
const ALL_FNS: readonly TrigFn[] = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc'];

const FN: Readonly<Record<TrigFn, string>> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  cot: '\\cot',
  sec: '\\sec',
  csc: '\\csc',
};

/** Co-function: what a ratio turns into across an odd multiple of 90°. */
const CO: Readonly<Record<TrigFn, TrigFn>> = {
  sin: 'cos',
  cos: 'sin',
  tan: 'cot',
  cot: 'tan',
  sec: 'csc',
  csc: 'sec',
};

/** Quadrants in which each ratio is positive (the ASTC rule). */
const POSITIVE_IN: Readonly<Record<TrigFn, readonly number[]>> = {
  sin: [1, 2],
  csc: [1, 2],
  cos: [1, 4],
  sec: [1, 4],
  tan: [1, 3],
  cot: [1, 3],
};

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;

/** `30^{\circ}` */
const deg = (d: number): string => `${d}^{\\circ}`;

/** Angle in degrees, or as a multiple of pi. */
const angleTex = (d: number, radians: boolean): string => (radians ? radianTex(d) : deg(d));

/** `\sin 30^{\circ}`, `\sin(-30^{\circ})`, `\sin \frac{\pi}{6}`, `\sin\left(-\frac{\pi}{6}\right)`. */
function fnAt(fn: TrigFn, d: number, radians = false): string {
  const a = angleTex(d, radians);
  if (d >= 0) return `${FN[fn]} ${a}`;
  return radians ? `${FN[fn]}\\left(${a}\\right)` : `${FN[fn]}(${a})`;
}

/** `x`, `3x`: k times a variable. */
const kx = (k: number, v = 'x'): string => (k === 1 ? v : `${k}${v}`);

/** Negates a single-term LaTeX value: `\frac{1}{2}` <-> `-\frac{1}{2}`. */
const negTex = (t: string): string => (t === '0' ? t : t.startsWith('-') ? t.slice(1) : `-${t}`);

/** Always-parenthesised factor for substitutions: `\left(\frac{3}{5}\right)`. */
const pr = (t: string): string => `\\left(${t}\\right)`;

/** Parenthesises only negative values (for use after an operator). */
const par = (t: string): string => (t.startsWith('-') ? pr(t) : t);

/** `a + b` with the sign of the single-term value b folded in. */
const plus = (a: string, b: string): string => (b.startsWith('-') ? `${a} - ${b.slice(1)}` : `${a} + ${b}`);

/** `a - b` with the sign of the single-term value b folded in. */
const minus = (a: string, b: string): string => (b.startsWith('-') ? `${a} + ${b.slice(1)}` : `${a} - ${b}`);

/** Exact value of a ratio at a standard angle, as LaTeX (textbook form, e.g. `\frac{1}{\sqrt{2}}`). */
function exact(fn: TrigFn, d: number): string {
  const v = exactTrig(fn, d);
  if (!v) throw new RangeError(`${fn} ${d} is not defined`);
  return v.tex;
}

/** Standard values in exactTrig's canonical spelling: fallback distractors. */
const VALUE_POOL: readonly string[] = [
  '\\frac{1}{2}',
  '\\frac{\\sqrt{3}}{2}',
  '\\frac{1}{\\sqrt{2}}',
  '1',
  '\\sqrt{3}',
  '\\frac{1}{\\sqrt{3}}',
  '-\\frac{1}{2}',
  '-\\frac{\\sqrt{3}}{2}',
  '-\\frac{1}{\\sqrt{2}}',
  '-1',
  '-\\sqrt{3}',
  '-\\frac{1}{\\sqrt{3}}',
];

/**
 * Options for a question whose answer is `fn` at a standard angle `d`: the other ratios at
 * `d` and the sign slip first (typical mistakes), then other standard values.
 */
function standardValueOptions(r: Rng, fn: Basic, d: number): { ans: string; answer: string; distractors: string[] } {
  const ans = exact(fn, d);
  const others: TrigFn[] = fn === 'sin' ? ['cos', 'tan'] : fn === 'cos' ? ['sin', 'tan'] : ['cot', 'sin'];
  const near = others.flatMap((o) => {
    const v = exactTrig(o, d);
    return v ? [v.tex] : [];
  });
  const candidates = [...near.slice(0, 1), negTex(ans), ...near.slice(1), ...r.shuffle(VALUE_POOL)];
  return { ans, answer: m$(ans), distractors: pickDistractors(ans, candidates).map(m$) };
}

// --------------------------------------------------------------------------- exact surds

type Coefficients = readonly [Fraction, Fraction, Fraction, Fraction];

const RADICAL = ['', '\\sqrt{2}', '\\sqrt{3}', '\\sqrt{6}'] as const;
/** Print order of the basis terms: rational, √6, √3, √2 (gives (√6 + √2)/4, 2 + √3). */
const PRINT_ORDER = [0, 3, 2, 1] as const;

/**
 * Exact number a + b√2 + c√3 + d√6 with rational a, b, c, d. This set is a field, so sums,
 * products and quotients of exact trigonometric values at multiples of 15° stay exact.
 */
class Surd {
  readonly c: Coefficients;

  constructor(c: Coefficients) {
    this.c = c;
  }

  static of(
    a: number | Fraction,
    b: number | Fraction = 0,
    c: number | Fraction = 0,
    d: number | Fraction = 0,
  ): Surd {
    return new Surd([Fraction.of(a), Fraction.of(b), Fraction.of(c), Fraction.of(d)]);
  }

  add(o: Surd): Surd {
    const [a, b, c, d] = this.c;
    const [p, q, r, s] = o.c;
    return new Surd([a.add(p), b.add(q), c.add(r), d.add(s)]);
  }

  sub(o: Surd): Surd {
    return this.add(o.neg());
  }

  scale(k: number | Fraction): Surd {
    const [a, b, c, d] = this.c;
    return new Surd([a.mul(k), b.mul(k), c.mul(k), d.mul(k)]);
  }

  neg(): Surd {
    return this.scale(-1);
  }

  mul(o: Surd): Surd {
    // Basis 1, √2, √3, √6 with √2√2 = 2, √3√3 = 3, √6√6 = 6, √2√3 = √6, √2√6 = 2√3, √3√6 = 3√2.
    const [a0, a1, a2, a3] = this.c;
    const [b0, b1, b2, b3] = o.c;
    return new Surd([
      a0.mul(b0).add(a1.mul(b1).mul(2)).add(a2.mul(b2).mul(3)).add(a3.mul(b3).mul(6)),
      a0.mul(b1).add(a1.mul(b0)).add(a2.mul(b3).mul(3)).add(a3.mul(b2).mul(3)),
      a0.mul(b2).add(a2.mul(b0)).add(a1.mul(b3).mul(2)).add(a3.mul(b1).mul(2)),
      a0.mul(b3).add(a3.mul(b0)).add(a1.mul(b2)).add(a2.mul(b1)),
    ]);
  }

  /** Image under √2 -> -√2. */
  private conj2(): Surd {
    const [a, b, c, d] = this.c;
    return new Surd([a, b.neg(), c, d.neg()]);
  }

  /** Image under √3 -> -√3. */
  private conj3(): Surd {
    const [a, b, c, d] = this.c;
    return new Surd([a, b, c.neg(), d.neg()]);
  }

  inv(): Surd {
    if (this.isZero()) throw new RangeError('Surd: division by zero');
    // x * conj2(x) lies in Q(√3); multiplying that by its √3-conjugate gives a rational.
    const y = this.mul(this.conj2());
    const n = y.mul(y.conj3()).c[0];
    return this.conj2().mul(y.conj3()).scale(n.inv());
  }

  div(o: Surd): Surd {
    return this.mul(o.inv());
  }

  isZero(): boolean {
    return this.c.every((x) => x.isZero());
  }

  equals(o: Surd): boolean {
    return this.c.every((x, i) => x.equals(o.c[i] as Fraction));
  }

  /** Canonical LaTeX: `\frac{\sqrt{6}+\sqrt{2}}{4}`, `2-\sqrt{3}`, `-\frac{\sqrt{2}}{2}`. */
  toTex(): string {
    let den = 1;
    for (const x of this.c) if (!x.isZero()) den = lcm(den, x.d);
    const terms = PRINT_ORDER.map((i) => {
      const x = this.c[i];
      return { n: (x.n * den) / x.d, rad: RADICAL[i] as string };
    }).filter((t) => t.n !== 0);
    if (terms.length === 0) return '0';
    const mag = (t: { n: number; rad: string }): string => {
      const a = Math.abs(t.n);
      if (t.rad === '') return String(a);
      return a === 1 ? t.rad : `${a}${t.rad}`;
    };
    const allNegative = terms.every((t) => t.n < 0);
    if (allNegative && den > 1) return `-\\frac{${terms.map(mag).join('+')}}{${den}}`;
    const ordered = allNegative ? terms : [...terms.filter((t) => t.n > 0), ...terms.filter((t) => t.n < 0)];
    const body = ordered.map((t, k) => `${t.n < 0 ? '-' : k === 0 ? '' : '+'}${mag(t)}`).join('');
    return den === 1 ? body : `\\frac{${body}}{${den}}`;
  }
}

const S = (a: number | Fraction, b: number | Fraction = 0, c: number | Fraction = 0, d: number | Fraction = 0): Surd =>
  Surd.of(a, b, c, d);

/** Exact sines of 0°, 15°, ..., 90°. */
const SIN_Q1: Readonly<Record<number, Surd>> = {
  0: S(0),
  15: S(0, frac(-1, 4), 0, frac(1, 4)),
  30: S(frac(1, 2)),
  45: S(0, frac(1, 2)),
  60: S(0, 0, frac(1, 2)),
  75: S(0, frac(1, 4), 0, frac(1, 4)),
  90: S(1),
};

/** Exact sine of any multiple of 15°. */
function sinS(d: number): Surd {
  const a = ((d % 360) + 360) % 360;
  const q1 = (x: number): Surd => {
    const v = SIN_Q1[x];
    if (!v) throw new RangeError(`sinS: ${d} is not a multiple of 15 degrees`);
    return v;
  };
  if (a <= 90) return q1(a);
  if (a <= 180) return q1(180 - a);
  if (a <= 270) return q1(a - 180).neg();
  return q1(360 - a).neg();
}

const cosS = (d: number): Surd => sinS(d + 90);
const tanS = (d: number): Surd => sinS(d).div(cosS(d));
const trigS = (fn: Basic, d: number): Surd => (fn === 'sin' ? sinS(d) : fn === 'cos' ? cosS(d) : tanS(d));

// --------------------------------------------------------------------------- option builders

/** The first three candidates that differ from `correct` and from each other. */
function distinctWrong<T>(correct: T, candidates: readonly T[], same: (a: T, b: T) => boolean): T[] {
  const out: T[] = [];
  for (const c of candidates) {
    if (same(c, correct) || out.some((o) => same(o, c))) continue;
    out.push(c);
    if (out.length === 3) return out;
  }
  throw new Error(`only ${out.length} distinct distractors`);
}

function fractionOptions(correct: Fraction, wrong: readonly Fraction[]): { answer: string; distractors: string[] } {
  // Generic slips last, so there are always three distinct distractors.
  const fallback = [correct.neg(), correct.mul(2), correct.div(2), correct.add(1)];
  const picked = distinctWrong(correct, [...wrong, ...fallback], (a, b) => a.equals(b));
  return { answer: m$(correct.toTex()), distractors: picked.map((f) => m$(f.toTex())) };
}

function surdOptions(correct: Surd, wrong: readonly Surd[]): { answer: string; distractors: string[] } {
  const fallback = [correct.neg(), correct.scale(2), correct.scale(frac(1, 2)), correct.add(S(1))];
  const picked = distinctWrong(correct, [...wrong, ...fallback], (a, b) => a.equals(b));
  return { answer: m$(correct.toTex()), distractors: picked.map((s) => m$(s.toTex())) };
}

// --------------------------------------------------------------------------- data

type Triple = readonly [number, number, number];

/** Primitive Pythagorean triples [leg, leg, hypotenuse] with mental-math friendly ratios. */
const TRIPLES: readonly Triple[] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
];

/** Two different triples whose hypotenuses multiply to at most 221 (denominators 65, 85, 125, 221). */
const TRIPLE_PAIRS: ReadonlyArray<readonly [Triple, Triple]> = TRIPLES.flatMap((t1, i) =>
  TRIPLES.slice(i + 1)
    .filter((t2) => t1[2] * t2[2] <= 221)
    .map((t2) => [t1, t2] as const),
);

/** An angle with rational ratios: opposite o, adjacent a, hypotenuse h. */
interface RightAngle {
  o: number;
  a: number;
  h: number;
  s: Fraction;
  c: Fraction;
  t: Fraction;
}

function angleFromTriple(r: Rng, triple: Triple): RightAngle {
  const [p, q, h] = triple;
  const [o, a] = r.chance(0.5) ? [p, q] : [q, p];
  return { o, a, h, s: frac(o, h), c: frac(a, h), t: frac(o, a) };
}

/** Allied angle k(90°) ± θ, and the quadrant it lies in when θ is acute. */
interface Allied {
  k: number;
  s: 1 | -1;
  q: 1 | 2 | 3 | 4;
}

const ALLIED: readonly Allied[] = [
  { k: 1, s: -1, q: 1 },
  { k: 1, s: 1, q: 2 },
  { k: 2, s: -1, q: 2 },
  { k: 2, s: 1, q: 3 },
  { k: 3, s: -1, q: 3 },
  { k: 3, s: 1, q: 4 },
  { k: 4, s: -1, q: 4 },
  { k: 0, s: -1, q: 4 },
];

/** Standard angles off the axes (all six ratios defined and non-zero). */
const OFF_AXIS = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];

/** Double- and triple-angle expansions, written in terms of an angle X. */
interface MultipleForm {
  fn: Basic;
  k: 2 | 3;
  expr: (x: string) => string;
  identity: string;
}

const MULTIPLE_FORMS: readonly MultipleForm[] = [
  {
    fn: 'sin',
    k: 2,
    expr: (x) => tex`2\sin ${x}\cos ${x}`,
    identity: tex`\sin 2\theta = 2\sin\theta\cos\theta`,
  },
  {
    fn: 'cos',
    k: 2,
    expr: (x) => tex`\cos^{2} ${x} - \sin^{2} ${x}`,
    identity: tex`\cos 2\theta = \cos^{2}\theta - \sin^{2}\theta`,
  },
  {
    fn: 'cos',
    k: 2,
    expr: (x) => tex`1 - 2\sin^{2} ${x}`,
    identity: tex`\cos 2\theta = 1 - 2\sin^{2}\theta`,
  },
  {
    fn: 'cos',
    k: 2,
    expr: (x) => tex`2\cos^{2} ${x} - 1`,
    identity: tex`\cos 2\theta = 2\cos^{2}\theta - 1`,
  },
  {
    fn: 'tan',
    k: 2,
    expr: (x) => tex`\dfrac{2\tan ${x}}{1 - \tan^{2} ${x}}`,
    identity: tex`\tan 2\theta = \frac{2\tan\theta}{1 - \tan^{2}\theta}`,
  },
  {
    fn: 'sin',
    k: 3,
    expr: (x) => tex`3\sin ${x} - 4\sin^{3} ${x}`,
    identity: tex`\sin 3\theta = 3\sin\theta - 4\sin^{3}\theta`,
  },
  {
    fn: 'cos',
    k: 3,
    expr: (x) => tex`4\cos^{3} ${x} - 3\cos ${x}`,
    identity: tex`\cos 3\theta = 4\cos^{3}\theta - 3\cos\theta`,
  },
  {
    fn: 'tan',
    k: 3,
    expr: (x) => tex`\dfrac{3\tan ${x} - \tan^{3} ${x}}{1 - 3\tan^{2} ${x}}`,
    identity: tex`\tan 3\theta = \frac{3\tan\theta - \tan^{3}\theta}{1 - 3\tan^{2}\theta}`,
  },
];

/** d = A + sB for the classic non-standard angles. */
const SPLITS: Readonly<Record<number, readonly [number, number, 1 | -1]>> = {
  15: [45, 30, -1],
  75: [45, 30, 1],
  105: [60, 45, 1],
  165: [120, 45, 1],
};

/** Sum-to-product building blocks for angles mx and nx (m > n, S = (m+n)/2, D = (m-n)/2). */
type SumKind = 'sinSum' | 'sinDiff' | 'cosSum' | 'cosDiff';

function sumTex(kind: SumKind, m: number, n: number): string {
  switch (kind) {
    case 'sinSum':
      return tex`\sin ${kx(m)} + \sin ${kx(n)}`;
    case 'sinDiff':
      return tex`\sin ${kx(m)} - \sin ${kx(n)}`;
    case 'cosSum':
      return tex`\cos ${kx(m)} + \cos ${kx(n)}`;
    case 'cosDiff':
      return tex`\cos ${kx(n)} - \cos ${kx(m)}`;
  }
}

function productTex(kind: SumKind, s: number, d: number): string {
  switch (kind) {
    case 'sinSum':
      return tex`2\sin ${kx(s)}\cos ${kx(d)}`;
    case 'sinDiff':
      return tex`2\cos ${kx(s)}\sin ${kx(d)}`;
    case 'cosSum':
      return tex`2\cos ${kx(s)}\cos ${kx(d)}`;
    case 'cosDiff':
      return tex`2\sin ${kx(s)}\sin ${kx(d)}`;
  }
}

/** Quotients that collapse to a single ratio of S or D. */
const QUOTIENTS: ReadonlyArray<{ num: SumKind; den: SumKind; fn: 'tan' | 'cot'; arg: 'S' | 'D' }> = [
  { num: 'sinSum', den: 'cosSum', fn: 'tan', arg: 'S' },
  { num: 'sinDiff', den: 'cosSum', fn: 'tan', arg: 'D' },
  { num: 'sinSum', den: 'cosDiff', fn: 'cot', arg: 'D' },
  { num: 'sinDiff', den: 'cosDiff', fn: 'cot', arg: 'S' },
  { num: 'cosSum', den: 'sinSum', fn: 'cot', arg: 'S' },
  { num: 'cosDiff', den: 'sinSum', fn: 'tan', arg: 'D' },
  { num: 'cosSum', den: 'sinDiff', fn: 'cot', arg: 'D' },
  { num: 'cosDiff', den: 'sinDiff', fn: 'tan', arg: 'S' },
];

/** m > n with m - n even, so (m + n)/2 and (m - n)/2 are whole numbers. */
const MN_PAIRS: ReadonlyArray<readonly [number, number]> = range(2, 9).flatMap((m) =>
  range(1, m - 1)
    .filter((n) => (m - n) % 2 === 0)
    .map((n) => [m, n] as const),
);

/** Odd multiples of 15° in (0°, 180°): products of these turn into standard angles. */
const ODD15 = [15, 45, 75, 105, 135, 165];
const PRODUCT_PAIRS: ReadonlyArray<readonly [number, number]> = ODD15.flatMap((a) =>
  ODD15.filter((bb) => bb < a && !(a % 45 === 0 && bb % 45 === 0)).map((bb) => [a, bb] as const),
);

/** Pairs whose half-sum and half-difference are both standard angles. */
const SUM_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [75, 15],
  [105, 15],
  [165, 75],
  [165, 105],
];

/** tan alpha = p/q style values (p/q in lowest terms, p != q, both at most 6). */
const RATIONAL_TANS: readonly Fraction[] = range(1, 6).flatMap((p) =>
  range(1, 6)
    .filter((q) => q !== p && gcd(p, q) === 1)
    .map((q) => frac(p, q)),
);

// --------------------------------------------------------------------------- bank

export default defineBank('mathematics', 'trigonometric-identities', (b) => [
  // ------------------------------------------------------------------ allied angles
  b.dynamic('allied-angle-reduction', { difficulty: 1, origin: 'past-paper', tags: ['allied angles'] }, (r) => {
    const f = r.pick(ALL_FNS);
    const allied = r.pick(ALLIED);
    const radians = r.chance(0.5);
    const base = angleTex(90 * allied.k, radians);
    const arg = allied.k === 0 ? '-\\theta' : `${base} ${allied.s < 0 ? '-' : '+'} \\theta`;
    const res = allied.k % 2 === 1 ? CO[f] : f;
    const other = res === f ? CO[f] : f;
    const positive = POSITIVE_IN[f].includes(allied.q);
    const opt = (fn: TrigFn, negative: boolean): string => `${negative ? '-' : ''}${FN[fn]}\\theta`;
    const ans = opt(res, !positive);
    const turn = radians ? '\\frac{\\pi}{2}' : '90^{\\circ}';
    const rule =
      allied.k === 0
        ? 'the function itself does not change'
        : allied.k % 2 === 1
          ? tex`$${base}$ is an odd multiple of $${turn}$, so $${FN[f]}$ changes to its co-function $${FN[res]}$`
          : tex`$${base}$ is an even multiple of $${turn}$, so the function stays $${FN[f]}$`;
    return {
      stem: tex`$${FN[f]}\left(${arg}\right)$ is equal to:`,
      answer: m$(ans),
      distractors: [opt(res, positive), opt(other, !positive), opt(other, positive)].map(m$),
      explanation: tex`Treat $\theta$ as acute. Then $${arg}$ lies in quadrant ${ROMAN[allied.q]}, where $${FN[f]}$ is ${positive ? 'positive' : 'negative'}; also ${rule}. Hence $${FN[f]}\left(${arg}\right) = ${ans}$.`,
    };
  }),

  b.dynamic('allied-large-angle-value', { difficulty: 2, tags: ['allied angles'] }, (r) => {
    const f = r.weighted(ALL_FNS, [3, 3, 3, 1, 1, 1]);
    const angle = (r.chance(0.35) ? -1 : 1) * (360 * r.int(1, 4) + r.pick(OFF_AXIS));
    const radians = r.chance(0.3);
    const ans = exact(f, angle);
    const rem = ((angle % 360) + 360) % 360;
    const quadrant = rem < 90 ? 1 : rem < 180 ? 2 : rem < 270 ? 3 : 4;
    const ref = [rem, 180 - rem, rem - 180, 360 - rem][quadrant - 1] as number;
    const positive = POSITIVE_IN[f].includes(quadrant);
    const signed = (t: string): string => (positive ? t : negTex(t));
    // Typical slips: wrong sign, the 30°/60° values swapped, the co-function used instead.
    const swapped = signed(exact(f, 90 - ref));
    const candidates = [
      negTex(ans),
      swapped,
      negTex(swapped),
      signed(exact(f, 30)),
      signed(exact(f, 60)),
      exact(CO[f], angle),
      ...r.shuffle([...VALUE_POOL, '2', '-2', '\\sqrt{2}', '-\\sqrt{2}', '\\frac{2}{\\sqrt{3}}', '-\\frac{2}{\\sqrt{3}}']),
    ];
    const A = angleTex(angle, radians);
    const chain = [fnAt(f, angle, radians), fnAt(f, rem, radians)];
    if (quadrant !== 1) {
      const anchor = angleTex(quadrant === 4 ? 360 : 180, radians);
      chain.push(
        `${FN[f]}\\left(${anchor} ${quadrant === 3 ? '+' : '-'} ${angleTex(ref, radians)}\\right)`,
        `${positive ? '' : '-'}${fnAt(f, ref, radians)}`,
      );
    }
    chain.push(ans);
    const signNote =
      quadrant === 1
        ? '.'
        : tex`, as $${FN[f]}$ is ${positive ? 'positive' : 'negative'} in quadrant ${ROMAN[quadrant]}.`;
    return {
      stem: tex`The value of $${fnAt(f, angle, radians)}$ is:`,
      answer: m$(ans),
      distractors: pickDistractors(ans, candidates).map(m$),
      explanation:
        tex`Remove whole turns: $${A} = ${angleTex(angle - rem, radians)} + ${angleTex(rem, radians)}$. So $${chain.join(' = ')}$` +
        signNote,
    };
  }),

  // ------------------------------------------------------------------ compound angles
  b.dynamic(
    'expansion-recognition',
    { difficulty: 1, tags: ['compound angles', 'double and half angles'] },
    (r) => {
      if (r.chance(0.5)) {
        // sin A cos B + cos A sin B = sin(A + B), etc., with A and B non-standard.
        const fn = r.pick(BASIC);
        const sum = r.chance(0.6);
        let target: number;
        let A: number;
        if (sum) {
          target = r.pick(fn === 'tan' ? [30, 45, 60, 120, 135, 150] : [30, 45, 60, 90, 120, 135, 150]);
          A = r.pick(range(Math.max(1, target - 89), Math.min(89, target - 1)).filter((a) => a % 15 !== 0));
        } else {
          target = r.pick([30, 45, 60]);
          A = r.pick(range(target + 1, 89).filter((a) => a % 15 !== 0));
        }
        const B = sum ? target - A : A - target;
        const [a, c] = [deg(A), deg(B)];
        const op = sum ? '+' : '-';
        const opp = sum ? '-' : '+';
        const expr =
          fn === 'sin'
            ? tex`\sin ${a}\cos ${c} ${op} \cos ${a}\sin ${c}`
            : fn === 'cos'
              ? tex`\cos ${a}\cos ${c} ${opp} \sin ${a}\sin ${c}`
              : tex`\dfrac{\tan ${a} ${op} \tan ${c}}{1 ${opp} \tan ${a}\tan ${c}}`;
        const { ans, answer, distractors } = standardValueOptions(r, fn, target);
        return {
          stem: tex`The value of $${expr}$ is:`,
          answer,
          distractors,
          explanation: tex`The expression is the expansion of $${FN[fn]}(A ${op} B)$ with $A = ${a}$ and $B = ${c}$. So it equals $${FN[fn]}(${a} ${op} ${c}) = ${fnAt(fn, target)} = ${ans}$.`,
        };
      }
      // Double- and triple-angle expansions at angles whose multiple is standard.
      const form = r.pick(MULTIPLE_FORMS);
      const x = r.pick(form.k === 2 ? [15, 22.5, 67.5, 75, 105] : [10, 20, 40, 50, 70, 80]);
      const target = form.k * x;
      const { ans, answer, distractors } = standardValueOptions(r, form.fn, target);
      return {
        stem: tex`The value of $${form.expr(deg(x))}$ is:`,
        answer,
        distractors,
        explanation: tex`Since $${form.identity}$, putting $\theta = ${deg(x)}$ gives $${fnAt(form.fn, target)} = ${ans}$.`,
      };
    },
  ),

  b.dynamic('exact-value-compound', { difficulty: 2, origin: 'past-paper', tags: ['compound angles'] }, (r) => {
    const d = r.pick([15, 75, 105, 165]);
    const fn = r.pick(BASIC);
    const radians = r.chance(0.35);
    const [A, B, s] = SPLITS[d] as readonly [number, number, 1 | -1];
    const value = trigS(fn, d);
    const flipped = trigS(fn, A - s * B); // sign slip inside the expansion
    let wrong: Surd[];
    if (fn === 'tan') {
      const tA = tanS(A);
      const tB = tanS(B);
      const numerator = s > 0 ? tA.add(tB) : tA.sub(tB);
      const slipDen = s > 0 ? S(1).add(tA.mul(tB)) : S(1).sub(tA.mul(tB));
      wrong = [flipped, numerator.div(slipDen), numerator, value.neg(), value.inv()];
    } else {
      const linear = s > 0 ? trigS(fn, A).add(trigS(fn, B)) : trigS(fn, A).sub(trigS(fn, B));
      wrong = [flipped, linear, value.neg(), trigS(fn === 'sin' ? 'cos' : 'sin', d)];
    }
    const { answer, distractors } = surdOptions(value, wrong);
    const [aT, bT] = [angleTex(A, radians), angleTex(B, radians)];
    const op = s > 0 ? '+' : '-';
    const opp = s > 0 ? '-' : '+';
    const v = (f: TrigFn, x: number): string => pr(exact(f, x));
    const work =
      fn === 'sin'
        ? tex`\sin ${aT}\cos ${bT} ${op} \cos ${aT}\sin ${bT} = ${v('sin', A)}${v('cos', B)} ${op} ${v('cos', A)}${v('sin', B)}`
        : fn === 'cos'
          ? tex`\cos ${aT}\cos ${bT} ${opp} \sin ${aT}\sin ${bT} = ${v('cos', A)}${v('cos', B)} ${opp} ${v('sin', A)}${v('sin', B)}`
          : tex`\frac{\tan ${aT} ${op} \tan ${bT}}{1 ${opp} \tan ${aT}\tan ${bT}} = \frac{${exact('tan', A)} ${op} ${exact('tan', B)}}{1 ${opp} ${v('tan', A)}${v('tan', B)}}`;
    return {
      stem: tex`The exact value of $${fnAt(fn, d, radians)}$ is:`,
      answer,
      distractors,
      explanation: tex`$${fnAt(fn, d, radians)} = ${FN[fn]}\left(${aT} ${op} ${bT}\right) = ${work} = ${value.toTex()}$.`,
    };
  }),

  b.dynamic('compound-ratio-acute-angles', { difficulty: 2, origin: 'past-paper', tags: ['compound angles'] }, (r) => {
    const [t1, t2] = r.shuffle(r.pick(TRIPLE_PAIRS)) as [Triple, Triple];
    const al = angleFromTriple(r, t1);
    const be = angleFromTriple(r, t2);
    const given = (x: RightAngle, name: string): string => {
      const which = r.weighted(BASIC, [2, 2, 1]);
      const val = which === 'sin' ? x.s : which === 'cos' ? x.c : x.t;
      return tex`$${FN[which]}${name} = ${val.toTex()}$`;
    };
    const [target, sign] = r.weighted(
      [
        ['sin', 1],
        ['sin', -1],
        ['cos', 1],
        ['cos', -1],
        ['tan', 1],
        ['tan', -1],
      ] as const,
      [3, 2, 3, 2, 1, 1],
    );
    const sinSum = al.s.mul(be.c).add(al.c.mul(be.s));
    const sinDiff = al.s.mul(be.c).sub(al.c.mul(be.s));
    const cosSum = al.c.mul(be.c).sub(al.s.mul(be.s));
    const cosDiff = al.c.mul(be.c).add(al.s.mul(be.s));
    const tanSum = sinSum.div(cosSum);
    const tanDiff = sinDiff.div(cosDiff);
    const one = frac(1);
    const op = sign > 0 ? '+' : '-';
    const opp = sign > 0 ? '-' : '+';
    const angleSum = tex`\alpha ${op} \beta`;
    const H = al.h * be.h;
    let correct: Fraction;
    let wrong: Fraction[];
    let work: string;
    if (target === 'sin') {
      correct = sign > 0 ? sinSum : sinDiff;
      wrong =
        sign > 0
          ? [sinDiff, cosDiff, cosSum, al.s.add(be.s)]
          : [sinSum, cosSum, cosDiff, al.s.sub(be.s)];
      work = tex`\sin\alpha\cos\beta ${op} \cos\alpha\sin\beta = ${pr(al.s.toTex())}${pr(be.c.toTex())} ${op} ${pr(al.c.toTex())}${pr(be.s.toTex())} = \frac{${al.o * be.a} ${op} ${al.a * be.o}}{${H}}`;
    } else if (target === 'cos') {
      correct = sign > 0 ? cosSum : cosDiff;
      wrong =
        sign > 0
          ? [cosDiff, sinSum, sinDiff, al.c.add(be.c)]
          : [cosSum, sinDiff, sinSum, al.c.sub(be.c)];
      work = tex`\cos\alpha\cos\beta ${opp} \sin\alpha\sin\beta = ${pr(al.c.toTex())}${pr(be.c.toTex())} ${opp} ${pr(al.s.toTex())}${pr(be.s.toTex())} = \frac{${al.a * be.a} ${opp} ${al.o * be.o}}{${H}}`;
    } else {
      correct = sign > 0 ? tanSum : tanDiff;
      const slip = sign > 0 ? al.t.add(be.t).div(one.add(al.t.mul(be.t))) : al.t.sub(be.t).div(one.sub(al.t.mul(be.t)));
      wrong =
        sign > 0
          ? [tanDiff, slip, al.t.add(be.t), tanSum.inv()]
          : [tanSum, slip, al.t.sub(be.t), tanDiff.inv()];
      work = tex`\frac{\tan\alpha ${op} \tan\beta}{1 ${opp} \tan\alpha\tan\beta} = \frac{${al.t.toTex()} ${op} ${be.t.toTex()}}{1 ${opp} ${pr(al.t.toTex())}${pr(be.t.toTex())}}`;
    }
    const { answer, distractors } = fractionOptions(correct, wrong);
    const ratios =
      target === 'tan'
        ? tex`$\tan\alpha = ${al.t.toTex()}$ and $\tan\beta = ${be.t.toTex()}$`
        : tex`$\sin\alpha = ${al.s.toTex()}$, $\cos\alpha = ${al.c.toTex()}$, $\sin\beta = ${be.s.toTex()}$ and $\cos\beta = ${be.c.toTex()}$`;
    return {
      stem: tex`If ${given(al, '\\alpha')} and ${given(be, '\\beta')}, where $\alpha$ and $\beta$ are acute angles, then $${FN[target]}(${angleSum})$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Both angles are acute, so all their ratios are positive: ${ratios}. Hence $${FN[target]}(${angleSum}) = ${work} = ${correct.toTex()}$.`,
    };
  }),

  b.dynamic('tan-sum-special-angle', { difficulty: 2, tags: ['compound angles'] }, (r) => {
    const kind = r.weighted(['sum45', 'sum135', 'diff45', 'sum90'] as const, [4, 2, 2, 1]);
    const one = frac(1);
    let p: Fraction;
    let q: Fraction;
    if (kind === 'sum45') {
      p = r.pick(RATIONAL_TANS.filter((t) => t.compare(1) < 0));
      q = one.sub(p).div(one.add(p));
    } else if (kind === 'sum135') {
      p = r.pick(RATIONAL_TANS.filter((t) => t.compare(1) > 0));
      q = p.add(1).div(p.sub(1));
    } else if (kind === 'diff45') {
      p = r.pick(RATIONAL_TANS.filter((t) => t.compare(1) > 0));
      q = p.sub(1).div(p.add(1));
    } else {
      p = r.pick(RATIONAL_TANS);
      q = p.inv();
    }
    const swap = kind !== 'diff45' && r.chance(0.5);
    const [ta, tb] = swap ? [q, p] : [p, q];
    const radians = r.chance(0.5);
    const show = (d: number): string => m$(angleTex(d, radians));
    const correctDeg = kind === 'sum135' ? 135 : kind === 'sum90' ? 90 : 45;
    const pool =
      kind === 'sum135' ? [45, 120, 150, 90] : kind === 'sum90' ? [45, 60, 135, 120] : [135, 60, 30, 90];
    const op = kind === 'diff45' ? '-' : '+';
    const opp = kind === 'diff45' ? '+' : '-';
    const lhs = tex`\alpha ${op} \beta`;
    const numer = kind === 'diff45' ? ta.sub(tb) : ta.add(tb);
    const denom = kind === 'diff45' ? one.add(ta.mul(tb)) : one.sub(ta.mul(tb));
    const halfTurn = radians ? '\\pi' : '180^{\\circ}';
    const quarter = radians ? '\\frac{\\pi}{2}' : '90^{\\circ}';
    const formula = tex`\tan(${lhs}) = \frac{\tan\alpha ${op} \tan\beta}{1 ${opp} \tan\alpha\tan\beta} = \frac{${ta.toTex()} ${op} ${tb.toTex()}}{1 ${opp} ${pr(ta.toTex())}${pr(tb.toTex())}}`;
    let explanation: string;
    if (kind === 'sum90') {
      explanation = tex`Here $1 - \tan\alpha\tan\beta = 1 - ${pr(ta.toTex())}${pr(tb.toTex())} = 0$, so $\tan(\alpha + \beta)$ is not defined. Since $0 < \alpha + \beta < ${halfTurn}$, $\alpha + \beta = ${angleTex(90, radians)}$.`;
    } else {
      const value = numer.div(denom);
      const bounds =
        kind === 'diff45' ? tex`-${quarter} < \alpha - \beta < ${quarter}` : tex`0 < \alpha + \beta < ${halfTurn}`;
      explanation = tex`$${formula} = \frac{${numer.toTex()}}{${denom.toTex()}} = ${value.toTex()}$. Since $${bounds}$, the only angle with this tangent is $${lhs} = ${angleTex(correctDeg, radians)}$.`;
    }
    return {
      stem: tex`If $\tan\alpha = ${ta.toTex()}$ and $\tan\beta = ${tb.toTex()}$, where $\alpha$ and $\beta$ are acute angles, then $${lhs}$ is equal to:`,
      answer: show(correctDeg),
      distractors: r.sample(pool, 3).map(show),
      explanation,
    };
  }),

  // ------------------------------------------------------------------ double and half angles
  b.dynamic('double-half-from-ratio', { difficulty: 2, origin: 'past-paper', tags: ['double and half angles'] }, (r) => {
    const one = frac(1);
    if (r.chance(0.6)) {
      // Double angle from tan(theta) by the t-formulas (valid in every quadrant).
      const t = r.pick(RATIONAL_TANS).mul(r.chance(0.25) ? -1 : 1);
      const t2 = t.mul(t);
      const sin2 = t.mul(2).div(one.add(t2));
      const cos2 = one.sub(t2).div(one.add(t2));
      const tan2 = t.mul(2).div(one.sub(t2));
      const ask = r.pick(BASIC);
      const T = pr(t.toTex());
      let correct: Fraction;
      let wrong: Fraction[];
      let formula: string;
      if (ask === 'sin') {
        correct = sin2;
        wrong = [tan2, cos2, t.div(one.add(t2)), t.mul(2)];
        formula = tex`\sin 2\theta = \frac{2\tan\theta}{1 + \tan^{2}\theta} = \frac{2${T}}{1 + ${T}^{2}}`;
      } else if (ask === 'cos') {
        correct = cos2;
        wrong = [cos2.neg(), sin2, one.add(t2).div(one.sub(t2)), one.sub(t2.mul(2))];
        formula = tex`\cos 2\theta = \frac{1 - \tan^{2}\theta}{1 + \tan^{2}\theta} = \frac{1 - ${T}^{2}}{1 + ${T}^{2}}`;
      } else {
        correct = tan2;
        wrong = [tan2.neg(), sin2, t.mul(2), t.div(one.sub(t2))];
        formula = tex`\tan 2\theta = \frac{2\tan\theta}{1 - \tan^{2}\theta} = \frac{2${T}}{1 - ${T}^{2}}`;
      }
      const { answer, distractors } = fractionOptions(correct, wrong);
      return {
        stem: tex`If $\tan\theta = ${t.toTex()}$, then $${FN[ask]} 2\theta$ is equal to:`,
        answer,
        distractors,
        explanation: tex`$${formula} = ${correct.toTex()}$.`,
      };
    }
    // Half angle: cos(theta) given with 0 < theta < pi, so theta/2 is acute.
    const half = r.pick(RATIONAL_TANS);
    const [p, q] = [half.n, half.d];
    const cos = frac(q * q - p * p, q * q + p * p);
    const sin = frac(2 * p * q, q * q + p * p);
    const interval = p < q ? tex`0 < \theta < \frac{\pi}{2}` : tex`\frac{\pi}{2} < \theta < \pi`;
    const { answer, distractors } = fractionOptions(half, [
      frac(q, p), // cot(theta/2)
      frac(p * p, q * q), // forgot the square root
      frac(p * q, q * q - p * p), // took half of tan(theta)
      frac(p * p, p * p + q * q), // sin^2(theta/2)
    ]);
    return {
      stem: tex`If $\cos\theta = ${cos.toTex()}$ and $${interval}$, then $\tan\frac{\theta}{2}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`For $${interval}$, $\sin\theta > 0$, so $\sin\theta = \sqrt{1 - \cos^{2}\theta} = ${sin.toTex()}$. Then $\tan\frac{\theta}{2} = \frac{1 - \cos\theta}{\sin\theta} = \frac{1 - ${par(cos.toTex())}}{${sin.toTex()}} = \frac{${one.sub(cos).toTex()}}{${sin.toTex()}} = ${half.toTex()}$.`,
    };
  }),

  b.dynamic('double-angle-quadrant', { difficulty: 3, tags: ['double and half angles'] }, (r) => {
    const x = angleFromTriple(r, r.pick(TRIPLES));
    const quadrant = r.pick([2, 3, 4] as const);
    const s = x.s.mul(quadrant === 2 ? 1 : -1);
    const c = x.c.mul(quadrant === 4 ? 1 : -1);
    const radians = r.chance(0.5);
    const bounds: Record<2 | 3 | 4, [number, number]> = { 2: [90, 180], 3: [180, 270], 4: [270, 360] };
    const [lo, hi] = bounds[quadrant];
    const interval = tex`${angleTex(lo, radians)} < \theta < ${angleTex(hi, radians)}`;
    const givenSin = r.chance(0.5);
    const [gFn, gVal, hFn, hVal] = givenSin ? (['sin', s, 'cos', c] as const) : (['cos', c, 'sin', s] as const);
    const ask = r.pick(['sin', 'tan'] as const);
    const one = frac(1);
    const t = s.div(c);
    const sin2 = s.mul(c).mul(2);
    const cos2 = c.mul(c).sub(s.mul(s));
    const tan2 = t.mul(2).div(one.sub(t.mul(t)));
    const hidden = tex`$${FN[hFn]}\theta ${hVal.sign() < 0 ? '<' : '>'} 0$, so $${FN[hFn]}\theta = ${hVal.sign() < 0 ? '-' : ''}\sqrt{1 - ${FN[gFn]}^{2}\theta} = ${hVal.toTex()}$`;
    let correct: Fraction;
    let wrong: Fraction[];
    let work: string;
    if (ask === 'sin') {
      correct = sin2;
      wrong = [sin2.neg(), s.mul(c), cos2, s.mul(c).neg()];
      work = tex`$\sin 2\theta = 2\sin\theta\cos\theta = 2${pr(s.toTex())}${pr(c.toTex())} = ${sin2.toTex()}$`;
    } else {
      correct = tan2;
      wrong = [tan2.neg(), sin2, t.mul(2), t.mul(-2)];
      work = tex`$\tan\theta = \frac{\sin\theta}{\cos\theta} = ${t.toTex()}$, so $\tan 2\theta = \frac{2\tan\theta}{1 - \tan^{2}\theta} = \frac{2${pr(t.toTex())}}{1 - ${pr(t.toTex())}^{2}} = ${tan2.toTex()}$`;
    }
    const { answer, distractors } = fractionOptions(correct, wrong);
    return {
      stem: tex`If $${FN[gFn]}\theta = ${gVal.toTex()}$ and $${interval}$, then $${FN[ask]} 2\theta$ is equal to:`,
      answer,
      distractors,
      explanation: tex`In quadrant ${ROMAN[quadrant]}, ${hidden}. ${work}.`,
    };
  }),

  // ------------------------------------------------------------------ sum-product formulas
  b.dynamic('sum-product-formula', { difficulty: 1, tags: ['sum-product formulas'] }, (r) => {
    const H = tex`\frac{C + D}{2}`;
    const K = tex`\frac{C - D}{2}`;
    // Right-hand sides that students mix up; every entry is a different function of the angles.
    const product = {
      sc: tex`2\sin${H}\cos${K}`,
      cs: tex`2\cos${H}\sin${K}`,
      cc: tex`2\cos${H}\cos${K}`,
      mss: tex`-2\sin${H}\sin${K}`,
      ss: tex`2\sin${H}\sin${K}`,
    };
    const sum = {
      sPlus: tex`\sin(A + B) + \sin(A - B)`,
      sMinus: tex`\sin(A + B) - \sin(A - B)`,
      cPlus: tex`\cos(A + B) + \cos(A - B)`,
      cMinus: tex`\cos(A - B) - \cos(A + B)`,
      cMinusSlip: tex`\cos(A + B) - \cos(A - B)`,
    };
    const items = [
      {
        lhs: tex`\sin C + \sin D`,
        ans: product.sc,
        wrong: [product.cs, product.cc, product.ss],
        why: tex`\sin C + \sin D = \sin(A + B) + \sin(A - B) = 2\sin A\cos B`,
      },
      {
        lhs: tex`\sin C - \sin D`,
        ans: product.cs,
        wrong: [product.sc, product.mss, product.cc],
        why: tex`\sin C - \sin D = \sin(A + B) - \sin(A - B) = 2\cos A\sin B`,
      },
      {
        lhs: tex`\cos C + \cos D`,
        ans: product.cc,
        wrong: [product.ss, product.sc, product.mss],
        why: tex`\cos C + \cos D = \cos(A + B) + \cos(A - B) = 2\cos A\cos B`,
      },
      {
        lhs: tex`\cos C - \cos D`,
        ans: product.mss,
        wrong: [product.ss, product.cc, product.cs],
        why: tex`\cos C - \cos D = \cos(A + B) - \cos(A - B) = -2\sin A\sin B`,
      },
      {
        lhs: tex`2\sin A\cos B`,
        ans: sum.sPlus,
        wrong: [sum.sMinus, sum.cPlus, sum.cMinus],
        why: tex`\sin(A \pm B) = \sin A\cos B \pm \cos A\sin B`,
      },
      {
        lhs: tex`2\cos A\sin B`,
        ans: sum.sMinus,
        wrong: [sum.sPlus, sum.cMinus, sum.cMinusSlip],
        why: tex`\sin(A \pm B) = \sin A\cos B \pm \cos A\sin B`,
      },
      {
        lhs: tex`2\cos A\cos B`,
        ans: sum.cPlus,
        wrong: [sum.cMinus, sum.sPlus, sum.cMinusSlip],
        why: tex`\cos(A \pm B) = \cos A\cos B \mp \sin A\sin B`,
      },
      {
        lhs: tex`2\sin A\sin B`,
        ans: sum.cMinus,
        wrong: [sum.cMinusSlip, sum.cPlus, sum.sMinus],
        why: tex`\cos(A \pm B) = \cos A\cos B \mp \sin A\sin B`,
      },
    ];
    const k = r.int(0, items.length - 1);
    const item = items[k] as (typeof items)[number];
    const explanation =
      k < 4
        ? tex`Put $C = A + B$ and $D = A - B$, so $A = ${H}$ and $B = ${K}$. Then $${item.why}$, i.e. $${item.lhs} = ${item.ans}$.`
        : tex`From $${item.why}$, adding or subtracting the two expansions gives $${item.lhs} = ${item.ans}$.`;
    return {
      stem: tex`$${item.lhs}$ is equal to:`,
      answer: m$(item.ans),
      distractors: item.wrong.map(m$),
      explanation,
    };
  }),

  b.dynamic('sum-to-product-quotient', { difficulty: 2, origin: 'past-paper', tags: ['sum-product formulas'] }, (r) => {
    const [m, n] = r.pick(MN_PAIRS) as readonly [number, number];
    const form = r.pick(QUOTIENTS);
    const S2 = (m + n) / 2;
    const D2 = (m - n) / 2;
    const k = form.arg === 'S' ? S2 : D2;
    const otherK = form.arg === 'S' ? D2 : S2;
    const co = form.fn === 'tan' ? 'cot' : 'tan';
    const opt = (fn: TrigFn, kk: number): string => m$(`${FN[fn]} ${kx(kk)}`);
    const answer = opt(form.fn, k);
    const distractors = pickDistractors(answer, [
      opt(form.fn, otherK), // wrong half-angle
      opt(co, k), // tan and cot interchanged
      ...r.shuffle([opt(co, otherK), opt(form.fn, m + n), opt(form.fn, 2 * k)]), // forgot to halve
    ]);
    const [top, bottom] = form.fn === 'tan' ? ['\\sin', '\\cos'] : ['\\cos', '\\sin'];
    return {
      stem: tex`$\dfrac{${sumTex(form.num, m, n)}}{${sumTex(form.den, m, n)}}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`By the sum-to-product formulas, $${sumTex(form.num, m, n)} = ${productTex(form.num, S2, D2)}$ and $${sumTex(form.den, m, n)} = ${productTex(form.den, S2, D2)}$. Cancelling the common factor leaves $\frac{${top} ${kx(k)}}{${bottom} ${kx(k)}} = ${FN[form.fn]} ${kx(k)}$.`,
    };
  }),

  b.dynamic('sum-product-numeric', { difficulty: 2, tags: ['sum-product formulas'] }, (r) => {
    if (r.chance(0.5)) {
      // Product to sum: 2 sin A cos B = sin(A + B) + sin(A - B), etc.
      const kind = r.pick(['sc', 'cs', 'cc', 'ss'] as const);
      const pair = r.pick(PRODUCT_PAIRS);
      const [A, B] = r.chance(0.3) ? [pair[1], pair[0]] : [pair[0], pair[1]];
      const sP = sinS(A + B);
      const sM = sinS(A - B);
      const cP = cosS(A + B);
      const cM = cosS(A - B);
      const [f1, f2] = { sc: ['sin', 'cos'], cs: ['cos', 'sin'], cc: ['cos', 'cos'], ss: ['sin', 'sin'] }[kind] as [
        TrigFn,
        TrigFn,
      ];
      let correct: Surd;
      let wrong: Surd[];
      let rule: string;
      let step: string;
      if (kind === 'sc') {
        correct = sP.add(sM);
        wrong = [sP.sub(sM), cP.add(cM), correct.scale(frac(1, 2))];
        rule = tex`2\sin A\cos B = \sin(A + B) + \sin(A - B)`;
        step = tex`${fnAt('sin', A + B)} + ${fnAt('sin', A - B)} = ${plus(sP.toTex(), sM.toTex())}`;
      } else if (kind === 'cs') {
        correct = sP.sub(sM);
        wrong = [sP.add(sM), cM.sub(cP), correct.scale(frac(1, 2))];
        rule = tex`2\cos A\sin B = \sin(A + B) - \sin(A - B)`;
        step = tex`${fnAt('sin', A + B)} - ${fnAt('sin', A - B)} = ${minus(sP.toTex(), sM.toTex())}`;
      } else if (kind === 'cc') {
        correct = cP.add(cM);
        wrong = [cM.sub(cP), sP.add(sM), correct.scale(frac(1, 2))];
        rule = tex`2\cos A\cos B = \cos(A + B) + \cos(A - B)`;
        step = tex`${fnAt('cos', A + B)} + ${fnAt('cos', A - B)} = ${plus(cP.toTex(), cM.toTex())}`;
      } else {
        correct = cM.sub(cP);
        wrong = [cP.sub(cM), cP.add(cM), sP.sub(sM), correct.scale(frac(1, 2))];
        rule = tex`2\sin A\sin B = \cos(A - B) - \cos(A + B)`;
        step = tex`${fnAt('cos', A - B)} - ${fnAt('cos', A + B)} = ${minus(cM.toTex(), cP.toTex())}`;
      }
      const { answer, distractors } = surdOptions(correct, wrong);
      const expr = tex`2${fnAt(f1, A)}${fnAt(f2, B)}`;
      return {
        stem: tex`The value of $${expr}$ is:`,
        answer,
        distractors,
        explanation: tex`Using $${rule}$: $${expr} = ${step} = ${correct.toTex()}$.`,
      };
    }
    // Sum to product: sin C + sin D = 2 sin((C + D)/2) cos((C - D)/2), etc.
    const kind = r.pick(['s+', 's-', 'c+', 'c-'] as const);
    const pair = r.pick(SUM_PAIRS);
    const swap = (kind === 's-' || kind === 'c-') && r.chance(0.4);
    const [C, D] = swap ? [pair[1], pair[0]] : [pair[0], pair[1]];
    const half = (C + D) / 2;
    const diff = (C - D) / 2;
    const sH = sinS(half);
    const cH = cosS(half);
    const sD = sinS(diff);
    const cD = cosS(diff);
    const forms = {
      sc: sH.mul(cD).scale(2),
      cs: cH.mul(sD).scale(2),
      cc: cH.mul(cD).scale(2),
      ss: sH.mul(sD).scale(-2),
    };
    const key = ({ 's+': 'sc', 's-': 'cs', 'c+': 'cc', 'c-': 'ss' } as const)[kind];
    const correct = forms[key];
    const wrong = [
      ...(['sc', 'cs', 'cc', 'ss'] as const).filter((k) => k !== key).map((k) => forms[k]),
      correct.neg(),
      correct.scale(frac(1, 2)),
    ];
    const { answer, distractors } = surdOptions(correct, r.shuffle(wrong));
    const fn = kind[0] === 's' ? 'sin' : 'cos';
    const expr = `${fnAt(fn, C)} ${kind[1]} ${fnAt(fn, D)}`;
    const [g1, g2, lead] = {
      sc: ['sin', 'cos', '2'],
      cs: ['cos', 'sin', '2'],
      cc: ['cos', 'cos', '2'],
      ss: ['sin', 'sin', '-2'],
    }[key] as [TrigFn, TrigFn, string];
    const ruleRhs = `${lead}${FN[g1]}\\frac{C + D}{2}${FN[g2]}\\frac{C - D}{2}`;
    const ruleLhs = `${FN[fn]} C ${kind[1]} ${FN[fn]} D`;
    const v1 = (g1 === 'sin' ? sH : cH).toTex();
    const v2 = (g2 === 'sin' ? sD : cD).toTex();
    return {
      stem: tex`The value of $${expr}$ is:`,
      answer,
      distractors,
      explanation: tex`Using $${ruleLhs} = ${ruleRhs}$: $${expr} = ${lead}${fnAt(g1, half)}${fnAt(g2, diff)} = ${lead}${pr(v1)}${pr(v2)} = ${correct.toTex()}$.`,
    };
  }),

  b.dynamic('product-of-three-ratios', { difficulty: 3, origin: 'past-paper', tags: ['sum-product formulas'] }, (r) => {
    const theta = r.weighted([20, 10, 15], [2, 2, 1]);
    const fn = theta === 15 ? r.pick(['sin', 'cos'] as const) : r.pick(BASIC);
    const extra = fn !== 'tan' && theta !== 15 && r.chance(0.35) ? (theta === 20 ? 60 : 30) : null;
    const angles = [theta, 60 - theta, 60 + theta, ...(extra === null ? [] : [extra])].sort((p, q) => p - q);
    const expr = angles.map((a) => fnAt(fn, a)).join('');
    const triple = trigS(fn, 3 * theta);
    let correct: Surd;
    let wrong: Surd[];
    let explanation: string;
    const base = `${fnAt(fn, theta)}${fnAt(fn, 60 - theta)}${fnAt(fn, 60 + theta)}`;
    if (fn === 'tan') {
      correct = triple;
      wrong = [triple.inv(), triple.scale(frac(1, 4)), S(1), triple.scale(3)];
      explanation = tex`$\tan(60^{\circ} - \theta)\tan(60^{\circ} + \theta) = \frac{3 - \tan^{2}\theta}{1 - 3\tan^{2}\theta}$, so $\tan\theta\tan(60^{\circ} - \theta)\tan(60^{\circ} + \theta) = \frac{3\tan\theta - \tan^{3}\theta}{1 - 3\tan^{2}\theta} = \tan 3\theta$. With $\theta = ${deg(theta)}$: $${base} = ${fnAt('tan', 3 * theta)} = ${correct.toTex()}$.`;
    } else {
      const quarter = triple.scale(frac(1, 4));
      const coQuarter = trigS(fn === 'sin' ? 'cos' : 'sin', 3 * theta).scale(frac(1, 4));
      const square = fn === 'sin' ? tex`\sin^{2}60^{\circ}` : tex`\cos^{2}60^{\circ}`;
      const sqVal = fn === 'sin' ? tex`\frac{3}{4}` : tex`\frac{1}{4}`;
      const cubic = fn === 'sin' ? tex`3\sin\theta - 4\sin^{3}\theta` : tex`4\cos^{3}\theta - 3\cos\theta`;
      const F = FN[fn];
      const derivation = tex`$${F}(60^{\circ} - \theta)${F}(60^{\circ} + \theta) = ${square} - \sin^{2}\theta = ${sqVal} - \sin^{2}\theta$, so $${F}\theta\,${F}(60^{\circ} - \theta)${F}(60^{\circ} + \theta) = \frac{1}{4}(${cubic}) = \frac{1}{4}${F} 3\theta$. With $\theta = ${deg(theta)}$: $${base} = \frac{1}{4}${fnAt(fn, 3 * theta)} = ${quarter.toTex()}$.`;
      if (extra === null) {
        correct = quarter;
        wrong = [triple, triple.scale(frac(1, 2)), coQuarter, quarter.scale(frac(1, 2))];
        explanation = derivation;
      } else {
        const extraVal = trigS(fn, extra);
        correct = quarter.mul(extraVal);
        wrong = [quarter, correct.scale(4), coQuarter.mul(extraVal), correct.scale(frac(1, 2)), correct.scale(2)];
        explanation = `${derivation} ${tex`Multiplying by $${fnAt(fn, extra)} = ${extraVal.toTex()}$ gives $${correct.toTex()}$.`}`;
      }
    }
    const { answer, distractors } = surdOptions(correct, wrong);
    return {
      stem: tex`The value of $${expr}$ is:`,
      answer,
      distractors,
      explanation,
    };
  }),

  // ------------------------------------------------------------------ fixed questions
  ...b.mcqs([
    {
      id: 'tan-sum-45-product',
      d: 2,
      o: 'past-paper',
      t: ['compound angles'],
      q: tex`If $A + B = 45^{\circ}$, then $(1 + \tan A)(1 + \tan B)$ is equal to:`,
      a: '$2$',
      x: ['$1$', '$0$', tex`$\frac{1}{2}$`],
      e: tex`$\tan(A + B) = 1$ gives $\frac{\tan A + \tan B}{1 - \tan A\tan B} = 1$, i.e. $\tan A + \tan B + \tan A\tan B = 1$. Hence $(1 + \tan A)(1 + \tan B) = 1 + (\tan A + \tan B + \tan A\tan B) = 1 + 1 = 2$.`,
    },
    {
      id: 'tan-quarter-turn-plus-theta',
      d: 1,
      t: ['compound angles'],
      q: tex`$\tan\left(\frac{\pi}{4} + \theta\right)$ is equal to:`,
      a: tex`$\dfrac{1 + \tan\theta}{1 - \tan\theta}$`,
      x: [tex`$\dfrac{1 - \tan\theta}{1 + \tan\theta}$`, tex`$\dfrac{\tan\theta - 1}{\tan\theta + 1}$`, tex`$\dfrac{\tan\theta + 1}{\tan\theta - 1}$`],
      e: tex`$\tan\left(\frac{\pi}{4} + \theta\right) = \frac{\tan\frac{\pi}{4} + \tan\theta}{1 - \tan\frac{\pi}{4}\tan\theta} = \frac{1 + \tan\theta}{1 - \tan\theta}$, since $\tan\frac{\pi}{4} = 1$. (The expression $\frac{1 - \tan\theta}{1 + \tan\theta}$ is $\tan\left(\frac{\pi}{4} - \theta\right)$, and the other two options are the negatives of these.)`,
    },
    {
      id: 'tan-sum-triangle-identity',
      d: 2,
      t: ['compound angles'],
      q: tex`If $A + B + C = \pi$ (with $\tan A$, $\tan B$ and $\tan C$ all defined), then $\tan A + \tan B + \tan C$ is equal to:`,
      a: tex`$\tan A\tan B\tan C$`,
      x: [tex`$\cot A\cot B\cot C$`, tex`$-\tan A\tan B\tan C$`, tex`$\tan A\tan B + \tan B\tan C + \tan C\tan A$`],
      e: tex`$A + B = \pi - C$, so $\tan(A + B) = -\tan C$, i.e. $\frac{\tan A + \tan B}{1 - \tan A\tan B} = -\tan C$. Cross-multiplying, $\tan A + \tan B = -\tan C + \tan A\tan B\tan C$, so $\tan A + \tan B + \tan C = \tan A\tan B\tan C$.`,
    },
    {
      id: 'sin-sum-times-sin-difference',
      d: 1,
      t: ['compound angles', 'sum-product formulas'],
      q: tex`$\sin(A + B)\sin(A - B)$ is equal to:`,
      a: tex`$\sin^{2}A - \sin^{2}B$`,
      x: [tex`$\cos^{2}A - \sin^{2}B$`, tex`$\sin^{2}A + \sin^{2}B$`, tex`$\sin^{2}A - \cos^{2}B$`],
      e: tex`$(\sin A\cos B + \cos A\sin B)(\sin A\cos B - \cos A\sin B) = \sin^{2}A\cos^{2}B - \cos^{2}A\sin^{2}B = \sin^{2}A(1 - \sin^{2}B) - (1 - \sin^{2}A)\sin^{2}B = \sin^{2}A - \sin^{2}B$. (The expression $\cos^{2}A - \sin^{2}B$ equals $\cos(A + B)\cos(A - B)$ instead.)`,
    },
    {
      id: 'one-minus-cos-over-sin',
      d: 1,
      t: ['double and half angles'],
      q: tex`The expression $\dfrac{1 - \cos\theta}{\sin\theta}$ is identically equal to:`,
      a: tex`$\tan\frac{\theta}{2}$`,
      x: [tex`$\cot\frac{\theta}{2}$`, tex`$\tan\theta$`, tex`$\tan 2\theta$`],
      e: tex`$1 - \cos\theta = 2\sin^{2}\frac{\theta}{2}$ and $\sin\theta = 2\sin\frac{\theta}{2}\cos\frac{\theta}{2}$, so the quotient is $\frac{\sin\frac{\theta}{2}}{\cos\frac{\theta}{2}} = \tan\frac{\theta}{2}$.`,
    },
    {
      id: 'cos-double-angle-odd-one-out',
      d: 1,
      t: ['double and half angles'],
      q: tex`Which of the following is **not** equal to $\cos 2\theta$?`,
      a: tex`$1 - 2\cos^{2}\theta$`,
      x: [tex`$\cos^{2}\theta - \sin^{2}\theta$`, tex`$2\cos^{2}\theta - 1$`, tex`$\frac{1 - \tan^{2}\theta}{1 + \tan^{2}\theta}$`],
      e: tex`$\cos 2\theta = \cos^{2}\theta - \sin^{2}\theta = 2\cos^{2}\theta - 1 = 1 - 2\sin^{2}\theta = \frac{1 - \tan^{2}\theta}{1 + \tan^{2}\theta}$, whereas $1 - 2\cos^{2}\theta = -\cos 2\theta$.`,
    },
    {
      id: 'complementary-sine-squares',
      d: 3,
      t: ['allied angles'],
      q: tex`The value of $\sin^{2}6^{\circ} + \sin^{2}12^{\circ} + \sin^{2}18^{\circ} + \cdots + \sin^{2}84^{\circ}$ is:`,
      a: '$7$',
      x: ['$14$', tex`$\frac{15}{2}$`, tex`$\frac{13}{2}$`],
      e: tex`There are $14$ terms ($6^{\circ}, 12^{\circ}, \ldots, 84^{\circ}$) and they pair off as $\theta$ and $90^{\circ} - \theta$: $(6^{\circ}, 84^{\circ}), (12^{\circ}, 78^{\circ}), \ldots, (42^{\circ}, 48^{\circ})$. Since $\sin^{2}\theta + \sin^{2}(90^{\circ} - \theta) = \sin^{2}\theta + \cos^{2}\theta = 1$, the sum is $7 \times 1 = 7$.`,
    },
    {
      id: 'tan-product-complementary',
      d: 1,
      t: ['allied angles'],
      q: tex`The value of $\tan 1^{\circ}\tan 2^{\circ}\tan 3^{\circ}\cdots\tan 89^{\circ}$ is:`,
      a: '$1$',
      x: ['$0$', '$-1$', '$2$'],
      e: tex`$\tan(90^{\circ} - \theta) = \cot\theta$, so $\tan\theta\tan(90^{\circ} - \theta) = 1$. The factors pair off as $(1^{\circ}, 89^{\circ}), (2^{\circ}, 88^{\circ}), \ldots, (44^{\circ}, 46^{\circ})$, each pair giving $1$, and the middle factor is $\tan 45^{\circ} = 1$. Hence the product is $1$.`,
    },
  ]),
]);
