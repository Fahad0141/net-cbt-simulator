/**
 * Mathematics - Number Systems & Complex Numbers (FSc Part I, chapter 1).
 *
 * Real numbers: field and order properties, rational and irrational numbers, recurring decimals.
 * Complex numbers: powers of i, algebra in a + bi and ordered-pair form, conjugates, modulus,
 * argument, polar form and De Moivre's theorem.
 *
 * Conventions
 * - The principal argument is taken in (-pi, pi] and every stem that asks for an argument says so.
 *   Wrong angles are always inside that range, so no option is coterminal with the answer and no
 *   two polar-form options name the same complex number.
 * - Distractors come from typical slips: i^2 = +1, componentwise multiplication or division, a
 *   forgotten conjugate or square root, a wrong quadrant, x and y swapped in tan^-1(y/x).
 */
import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  degreeTex,
  exactTrig,
  frac,
  gcd,
  m$,
  n$,
  normalizeOption,
  numericOptions,
  paren,
  pickDistractors,
  radianTex,
  signed,
  signedSum,
  simplifySurd,
  surdTex,
  tex,
  texOf,
} from '@/engine/helpers';
import type { ExactValue, Fraction } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** re + im·i for integer or Fraction parts: `3 - 4i`, `-i`, `\frac{3}{25} + \frac{4}{25}i`, `0`. */
const cx = (re: number | Fraction, im: number | Fraction): string =>
  signedSum([
    [re, ''],
    [im, 'i'],
  ]);

/** A square for substitution displays: `3^{2}`, `(-4)^{2}`. */
const sq = (x: number): string => `${paren(x)}^{2}`;

/** i^0, i^1, i^2, i^3. */
const I_POW = ['1', 'i', '-1', '-i'] as const;
const mod4 = (n: number): number => ((n % 4) + 4) % 4;

/** A power of i takes one of four values; all four are offered, as on real papers. */
function powerOfIOptions(k: number): { answer: string; distractors: string[] } {
  return {
    answer: m$(I_POW[mod4(k)]),
    distractors: I_POW.filter((_, j) => j !== mod4(k)).map((v) => m$(v)),
  };
}

/** (x + yi)/den as one fraction in lowest terms: `\frac{3 + 4i}{25}`; plain `x + yi` when den = 1. */
function cFrac(x: number, y: number, den: number): string {
  const s = den < 0 ? -1 : 1;
  const g = gcd(gcd(x, y), den) || 1;
  const d = (s * den) / g;
  const body = cx((s * x) / g, (s * y) / g);
  return d === 1 ? body : `\\frac{${body}}{${d}}`;
}

/** (x + yi)/sqrt(den), surd simplified and common factors removed: `\frac{1 - 2i}{\sqrt{5}}`. */
function cOverRoot(x: number, y: number, den: number): string {
  const { c, r: rad } = simplifySurd(1, den);
  if (rad === 1) return cFrac(x, y, c);
  const g = gcd(gcd(x, y), c) || 1;
  const k = c / g;
  return `\\frac{${cx(x / g, y / g)}}{${k === 1 ? '' : k}\\sqrt{${rad}}}`;
}

/** c·sqrt(s) (s = 1 gives a plain integer): `2\sqrt{3}`, `-\sqrt{3}`, `5`. */
function surdTerm(c: number, s: number): string {
  if (s === 1) return String(c);
  const coef = c === 1 ? '' : c === -1 ? '-' : String(c);
  return `${coef}\\sqrt{${s}}`;
}

/** x + yi with x = xc·sqrt(xs) and y = yc·sqrt(ys): `-2 + 2\sqrt{3}\,i`, `\sqrt{3} - i`. */
function surdComplex(xc: number, xs: number, yc: number, ys: number): string {
  let out = xc === 0 ? '' : surdTerm(xc, xs);
  if (yc !== 0) {
    const mag = Math.abs(yc);
    const body = ys === 1 ? coefTex(mag, 'i') : `${mag === 1 ? '' : mag}\\sqrt{${ys}}\\,i`;
    if (!out) out = yc < 0 ? `-${body}` : body;
    else out += yc < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return out || '0';
}

/**
 * Directions with a standard reference angle alpha: x = k·sqrt(xs), y = k·sqrt(ys), so
 * |z| = 2k (alpha = 30 or 60 degrees) or k·sqrt(2) (alpha = 45 degrees).
 */
const SHAPES = [
  { alpha: 30, xs: 3, ys: 1, ratio: '\\frac{1}{\\sqrt{3}}' },
  { alpha: 45, xs: 1, ys: 1, ratio: '1' },
  { alpha: 60, xs: 1, ys: 3, ratio: '\\sqrt{3}' },
] as const;

type Quadrant = 1 | 2 | 3 | 4;
const QUADRANTS: readonly Quadrant[] = [1, 2, 3, 4];
const QUADRANT_SIGNS: Readonly<Record<Quadrant, readonly [number, number]>> = {
  1: [1, 1],
  2: [-1, 1],
  3: [-1, -1],
  4: [1, -1],
};
const QUADRANT_NAME: Readonly<Record<Quadrant, string>> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth' };

/** Principal argument in degrees, in (-180, 180], of a point with reference angle alpha. */
function principalDeg(alpha: number, q: Quadrant): number {
  switch (q) {
    case 1:
      return alpha;
    case 2:
      return 180 - alpha;
    case 3:
      return alpha - 180;
    case 4:
      return -alpha;
  }
}

/**
 * Wrong arguments (degrees) from typical slips, most likely first: reference angle used without
 * the quadrant, the formula of another quadrant, tan^-1(x/y) instead of tan^-1(y/x). All lie in
 * (-180, 180), so none is coterminal with the principal argument.
 */
function argumentSlips(alpha: number, q: Quadrant): number[] {
  switch (q) {
    case 1:
      return [90 - alpha, -alpha, 180 - alpha, alpha - 180];
    case 2:
      return [-alpha, alpha, 90 + alpha, alpha - 180];
    case 3:
      return [alpha, 180 - alpha, -alpha, -90 - alpha];
    case 4:
      return [alpha, alpha - 180, alpha - 90, 180 - alpha];
  }
}

function trig(fn: 'sin' | 'cos', deg: number): ExactValue {
  const v = exactTrig(fn, deg);
  if (!v) throw new Error(`no exact ${fn} at ${deg} degrees`);
  return v;
}

/** An angle as written after \cos or \sin: `\frac{\pi}{3}` or `\left(-\frac{\pi}{3}\right)`. */
const trigArg = (deg: number): string => (deg < 0 ? `\\left(${radianTex(deg)}\\right)` : radianTex(deg));

/** r(cos θ + i sin θ). */
const polarTex = (r: string, deg: number): string =>
  `${r}\\left(\\cos ${trigArg(deg)} + i\\sin ${trigArg(deg)}\\right)`;

/** Exact value of cos θ + i sin θ at a standard angle: `\frac{1}{2} - \frac{\sqrt{3}}{2}i`, `-i`. */
function cisTex(deg: number): string {
  const c = trig('cos', deg);
  const s = trig('sin', deg);
  let out = c.value === 0 ? '' : c.tex;
  if (s.value !== 0) {
    const neg = s.value < 0;
    const mag = neg ? s.tex.slice(1) : s.tex;
    const body = mag === '1' ? 'i' : `${mag}i`;
    if (!out) out = neg ? `-${body}` : body;
    else out += neg ? ` - ${body}` : ` + ${body}`;
  }
  return out || '0';
}

/** R·(cos θ + i sin θ) for θ a multiple of 90 degrees: `16`, `-8i`. */
function axisTex(magnitude: number, deg: number): string {
  return [`${magnitude}`, `${magnitude}i`, `-${magnitude}`, `-${magnitude}i`][mod4(deg / 90)] as string;
}

/** Pythagorean triples: a + bi with these legs has an integer modulus. */
const TRIPLES = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [9, 12, 15],
  [12, 16, 20],
  [20, 21, 29],
] as const;

interface Gaussian {
  a: number;
  b: number;
  mod: number;
}

/** a + bi built from a triple's legs in random order with random signs. */
function gaussian(r: Rng, triple: readonly [number, number, number]): Gaussian {
  const [x, y, mod] = triple;
  const swap = r.chance(0.5);
  return { a: (swap ? y : x) * r.sign(), b: (swap ? x : y) * r.sign(), mod };
}

const legSum = (z: Gaussian): number => Math.abs(z.a) + Math.abs(z.b);

/** |Re w| + |Im w| for w = (a + bi)^n: the value a student gets from the slip |x + iy| = |x| + |y|. */
function legSumOfPower(a: number, b: number, n: number): number {
  let re = 1;
  let im = 0;
  for (let k = 0; k < n; k++) [re, im] = [re * a - im * b, re * b + im * a];
  return Math.abs(re) + Math.abs(im);
}

/** (m, n): θ = π/m and nθ is a standard angle (multiple of 30 or 45 degrees, at most 2π). */
const DE_MOIVRE_CASES: ReadonlyArray<readonly [number, number]> = (() => {
  const out: Array<readonly [number, number]> = [];
  for (const m of [5, 6, 9, 10, 12, 15, 18, 20, 36]) {
    for (let n = 2; n <= 12; n++) {
      const phi = (n * 180) / m;
      if (Number.isInteger(phi) && phi <= 360 && (phi % 30 === 0 || phi % 45 === 0)) out.push([m, n]);
    }
  }
  return out;
})();

// ---------------------------------------------------------------------------
// Properties of real numbers (FSc names)
// ---------------------------------------------------------------------------

const PROP = {
  commAdd: 'Commutative property of addition',
  commMul: 'Commutative property of multiplication',
  assocAdd: 'Associative property of addition',
  assocMul: 'Associative property of multiplication',
  addId: 'Additive identity',
  mulId: 'Multiplicative identity',
  addInv: 'Additive inverse',
  mulInv: 'Multiplicative inverse',
  dist: 'Distributive property',
  tricho: 'Trichotomy property',
  trans: 'Transitive property',
  addIneq: 'Additive property of inequality',
  mulIneq: 'Multiplicative property of inequality',
  refl: 'Reflexive property of equality',
  symm: 'Symmetric property of equality',
  cancelAdd: 'Cancellation property for addition',
  cancelMul: 'Cancellation property for multiplication',
} as const;

interface PropertyItem {
  stem: string;
  answer: string;
  /** Three confusable but clearly different properties. */
  others: readonly [string, string, string];
  why: string;
}

const illustrated = (statement: string): string =>
  tex`Which property of real numbers is illustrated by $${statement}$?`;

/** Brackets a negative value that follows an operator: `-7` -> `(-7)`. */
const wrap = (v: string): string => (v.startsWith('-') ? `(${v})` : v);

const SAMPLE_REALS = ['\\sqrt{2}', '\\sqrt{3}', '\\sqrt{5}', '\\pi', '\\frac{2}{3}', '\\frac{5}{7}', '-\\frac{3}{4}', '-7', '11'];
const POSITIVE_REALS = ['\\sqrt{2}', '\\sqrt{3}', '\\sqrt{7}', '\\pi', '\\frac{3}{5}', '\\frac{4}{9}', '6', '13'];
const LETTERS: ReadonlyArray<readonly [string, string, string]> = [
  ['a', 'b', 'c'],
  ['x', 'y', 'z'],
  ['p', 'q', 'r'],
];

/** Generators for "name the property" items; numbers and letters vary per instance. */
const PROPERTY_ITEMS: ReadonlyArray<(r: Rng) => PropertyItem> = [
  (r) => {
    const p = r.pick(SAMPLE_REALS);
    const q = r.int(2, 9);
    return {
      stem: illustrated(`${wrap(p)} + ${q} = ${q} + ${wrap(p)}`),
      answer: PROP.commAdd,
      others: [PROP.assocAdd, PROP.commMul, PROP.addId],
      why: tex`Only the order of the two terms of the sum changes: $a + b = b + a$ is the commutative property of addition.`,
    };
  },
  (r) => {
    const p = r.int(2, 9);
    const f = r.pick(['\\frac{2}{3}', '\\frac{3}{4}', '\\frac{5}{7}', '\\sqrt{3}', '\\sqrt{5}', '\\pi']);
    return {
      stem: illustrated(`${p} \\times ${f} = ${f} \\times ${p}`),
      answer: PROP.commMul,
      others: [PROP.assocMul, PROP.commAdd, PROP.mulId],
      why: tex`Only the order of the two factors changes: $ab = ba$ is the commutative property of multiplication.`,
    };
  },
  (r) => {
    const [x, y, z] = r.sample([2, 3, 4, 5, 6, 7, 8, 9, 11], 3);
    return {
      stem: illustrated(`(${x} + ${y}) + ${z} = ${x} + (${y} + ${z})`),
      answer: PROP.assocAdd,
      others: [PROP.commAdd, PROP.assocMul, PROP.dist],
      why: tex`The order of the terms is unchanged; only their grouping changes: $(a + b) + c = a + (b + c)$ is the associative property of addition.`,
    };
  },
  (r) => {
    const [x, y, z] = r.sample([2, 3, 4, 5, 6, 7, 8, 9, 11], 3);
    return {
      stem: illustrated(`(${x} \\times ${y}) \\times ${z} = ${x} \\times (${y} \\times ${z})`),
      answer: PROP.assocMul,
      others: [PROP.commMul, PROP.assocAdd, PROP.dist],
      why: tex`The order of the factors is unchanged; only their grouping changes: $(ab)c = a(bc)$ is the associative property of multiplication.`,
    };
  },
  (r) => {
    const x = r.pick(SAMPLE_REALS);
    return {
      stem: illustrated(r.chance(0.5) ? `${x} + 0 = ${x}` : `0 + ${wrap(x)} = ${x}`),
      answer: PROP.addId,
      others: [PROP.addInv, PROP.mulId, PROP.commAdd],
      why: tex`Adding $0$ leaves every real number unchanged, so $0$ is the additive identity: $a + 0 = 0 + a = a$.`,
    };
  },
  (r) => {
    const x = r.pick(SAMPLE_REALS);
    return {
      stem: illustrated(r.chance(0.5) ? `${wrap(x)} \\times 1 = ${x}` : `1 \\times ${wrap(x)} = ${x}`),
      answer: PROP.mulId,
      others: [PROP.mulInv, PROP.addId, PROP.commMul],
      why: tex`Multiplying by $1$ leaves every real number unchanged, so $1$ is the multiplicative identity: $a \times 1 = 1 \times a = a$.`,
    };
  },
  (r) => {
    const x = r.pick(POSITIVE_REALS);
    return {
      stem: illustrated(r.chance(0.5) ? `${x} + (-${x}) = 0` : `(-${x}) + ${x} = 0`),
      answer: PROP.addInv,
      others: [PROP.addId, PROP.mulInv, PROP.cancelAdd],
      why: tex`A number added to its negative gives the additive identity $0$, so $-a$ is the additive inverse of $a$.`,
    };
  },
  (r) => {
    const [u, v] = r.pick([
      [2, 3],
      [3, 5],
      [2, 7],
      [4, 9],
      [5, 8],
      [3, 7],
      [5, 6],
      [7, 9],
    ] as const);
    const [p, q] = r.chance(0.5) ? [u, v] : [v, u];
    return {
      stem: illustrated(`\\frac{${p}}{${q}} \\times \\frac{${q}}{${p}} = 1`),
      answer: PROP.mulInv,
      others: [PROP.mulId, PROP.addInv, PROP.commMul],
      why: tex`A non-zero number multiplied by its reciprocal gives the multiplicative identity $1$, so $\frac{1}{a}$ is the multiplicative inverse of $a$.`,
    };
  },
  (r) => {
    const p = r.int(2, 9);
    const [s, t, u] = r.pick(LETTERS);
    return {
      stem: illustrated(r.chance(0.5) ? `${p}(${s} + ${t}) = ${p}${s} + ${p}${t}` : `(${s} + ${t})${u} = ${s}${u} + ${t}${u}`),
      answer: PROP.dist,
      others: [PROP.assocMul, PROP.commMul, PROP.assocAdd],
      why: tex`The multiplication is distributed over the sum: $a(b + c) = ab + ac$ and $(a + b)c = ac + bc$ are the distributive property.`,
    };
  },
  (r) => {
    const [x, y] = r.pick(LETTERS);
    return {
      stem: tex`For any two real numbers $${x}$ and $${y}$, exactly one of $${x} < ${y}$, $${x} = ${y}$ or $${x} > ${y}$ is true. This is the:`,
      answer: PROP.tricho,
      others: [PROP.trans, PROP.refl, PROP.addIneq],
      why: tex`"Exactly one of $a < b$, $a = b$, $a > b$" is the trichotomy property, the basic order property of real numbers.`,
    };
  },
  (r) => {
    const [x, y, z] = r.pick(LETTERS);
    const rel = r.pick(['>', '<']);
    return {
      stem: illustrated(`${x} ${rel} ${y} \\text{ and } ${y} ${rel} ${z} \\Rightarrow ${x} ${rel} ${z}`),
      answer: PROP.trans,
      others: [PROP.tricho, PROP.addIneq, PROP.symm],
      why: tex`An inequality passed along a chain ($a ${rel} b$ and $b ${rel} c$ give $a ${rel} c$) is the transitive property.`,
    };
  },
  (r) => {
    const p = r.int(2, 9);
    const q = r.int(2, 9);
    const rel = r.pick(['>', '<']);
    return {
      stem: illustrated(`x ${rel} ${p} \\Rightarrow x + ${q} ${rel} ${p + q}`),
      answer: PROP.addIneq,
      others: [PROP.mulIneq, PROP.trans, PROP.tricho],
      why: tex`The same number $${q}$ is added to both sides, which keeps the direction of the inequality: $a ${rel} b \Rightarrow a + c ${rel} b + c$.`,
    };
  },
  (r) => {
    const p = r.int(2, 9);
    const q = r.int(2, 6);
    const negative = r.chance(0.5);
    return {
      stem: illustrated(negative ? `x > ${p} \\Rightarrow -${q}x < -${p * q}` : `x > ${p} \\Rightarrow ${q}x > ${p * q}`),
      answer: PROP.mulIneq,
      others: [PROP.addIneq, PROP.trans, PROP.tricho],
      why: negative
        ? tex`Both sides are multiplied by the negative number $-${q}$, which reverses the inequality: $a > b,\ c < 0 \Rightarrow ac < bc$ (multiplicative property).`
        : tex`Both sides are multiplied by the positive number $${q}$, which keeps the inequality: $a > b,\ c > 0 \Rightarrow ac > bc$ (multiplicative property).`,
    };
  },
  (r) => {
    const v = r.pick(SAMPLE_REALS);
    return {
      stem: illustrated(`x = ${v} \\Rightarrow ${v} = x`),
      answer: PROP.symm,
      others: [PROP.refl, PROP.trans, PROP.commAdd],
      why: tex`If $a = b$ then $b = a$: the two sides of an equation may be interchanged (symmetric property of equality).`,
    };
  },
  (r) => {
    const p = r.pick(SAMPLE_REALS);
    return {
      stem: illustrated(`x + ${wrap(p)} = y + ${wrap(p)} \\Rightarrow x = y`),
      answer: PROP.cancelAdd,
      others: [PROP.commAdd, PROP.assocAdd, PROP.trans],
      why: tex`The common term $${p}$ is cancelled from both sides: $a + c = b + c \Rightarrow a = b$ is the cancellation property for addition.`,
    };
  },
  (r) => {
    const p = r.pick(['3', '5', '7', '\\sqrt{2}', '\\sqrt{3}', '\\pi', '\\frac{2}{5}']);
    return {
      stem: illustrated(`${p}x = ${p}y \\Rightarrow x = y`),
      answer: PROP.cancelMul,
      others: [PROP.commMul, PROP.assocMul, PROP.dist],
      why: tex`The common non-zero factor $${p}$ is cancelled: $ac = bc,\ c \ne 0 \Rightarrow a = b$ is the cancellation property for multiplication.`,
    };
  },
  (r) => {
    const v = r.pick(SAMPLE_REALS);
    return {
      stem: illustrated(`${v} = ${v}`),
      answer: PROP.refl,
      others: [PROP.symm, PROP.trans, PROP.addId],
      why: tex`Every real number is equal to itself, $a = a$: the reflexive property of equality.`,
    };
  },
];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('mathematics', 'number-systems', (b) => [
  b.dynamic('power-of-i', { difficulty: 1, origin: 'past-paper', tags: ['complex numbers'] }, (r) => {
    const form = r.weighted(['positive', 'negative', 'minus-i', 'symbolic'] as const, [3, 2, 2, 2]);

    if (form === 'symbolic') {
      const step = r.pick([4, 8]);
      const offset = r.pick([-3, -2, -1, 1, 2, 3, 5, 6, 7]);
      const k = mod4(offset);
      const power = signedSum([
        [step, 'k'],
        [offset, ''],
      ]);
      const reduce = offset >= 0 && offset <= 3 ? '' : ` = i^{${k}}`;
      return {
        stem: tex`If $k$ is a positive integer, then $i^{${power}}$ is equal to:`,
        ...powerOfIOptions(k),
        explanation: tex`Since $i^{4} = 1$: $\;i^{${power}} = \left(i^{4}\right)^{${step === 4 ? 'k' : '2k'}} \cdot i^{${offset}} = i^{${offset}}${reduce} = ${I_POW[k]}$.`,
      };
    }

    if (form === 'minus-i') {
      const n = r.int(5, 99);
      const k0 = n % 4;
      const odd = n % 2 === 1;
      const k = odd ? k0 + 2 : k0;
      return {
        stem: tex`The value of $(-i)^{${n}}$ is:`,
        ...powerOfIOptions(k),
        explanation: tex`$(-i)^{${n}} = (-1)^{${n}}\, i^{${n}}$. Here $(-1)^{${n}} = ${odd ? '-1' : '1'}$ and, since $${n} = 4(${Math.floor(n / 4)}) + ${k0}$, $i^{${n}} = i^{${k0}} = ${I_POW[k0]}$. So $(-i)^{${n}} = ${odd ? `-(${I_POW[k0]}) = ` : ''}${I_POW[mod4(k)]}$.`,
      };
    }

    // i^n or i^(-n): write the exponent as 4q + k with 0 <= k <= 3.
    const negative = form === 'negative';
    const n = negative ? r.int(5, 99) : r.int(13, 299);
    const e = negative ? -n : n;
    const q = Math.floor(e / 4);
    const k = e - 4 * q;
    return {
      stem: tex`The value of $i^{${e}}$ is:`,
      ...powerOfIOptions(k),
      explanation: tex`Since $i^{4} = 1$, write $${e} = 4(${q}) + ${k}$. Then $i^{${e}} = \left(i^{4}\right)^{${q}} \cdot i^{${k}} = i^{${k}} = ${I_POW[k]}$.`,
    };
  }),

  b.dynamic('sum-of-powers-of-i', { difficulty: 2, tags: ['complex numbers'] }, (r) => {
    const form = r.weighted(['from-i', 'from-one', 'product'] as const, [2, 2, 1]);

    if (form === 'product') {
      const n = r.int(6, 30);
      const e = (n * (n + 1)) / 2;
      const k = e % 4;
      return {
        stem: tex`The value of the product $i \cdot i^{2} \cdot i^{3} \cdots i^{${n}}$ is:`,
        ...powerOfIOptions(k),
        explanation: tex`Multiplying powers adds the exponents: $1 + 2 + \cdots + ${n} = \frac{${n}(${n + 1})}{2} = ${e}$. Since $${e} = 4(${Math.floor(e / 4)}) + ${k}$, the product is $i^{${e}} = i^{${k}} = ${I_POW[k]}$.`,
      };
    }

    const n = r.int(10, 150);
    const fromOne = form === 'from-one';
    const count = fromOne ? n + 1 : n;
    const q = Math.floor(count / 4);
    const rest = count % 4;
    // Sums of the first 0, 1, 2, 3 terms of the cycle; groups of four consecutive powers vanish.
    const values = fromOne ? ['0', '1', '1 + i', 'i'] : ['0', 'i', '-1 + i', '-1'];
    const value = values[rest] as string;
    const start = (fromOne ? 0 : 1) + 4 * q;
    const leftover = Array.from({ length: rest }, (_, j) => start + j);
    const powers = leftover.map((p) => `i^{${p}}`).join(' + ');
    const parts = leftover.map((p) => paren(I_POW[p % 4])).join(' + ');
    const tail =
      rest === 0
        ? tex`. The terms cancel in complete groups of four, so the sum is $0$.`
        : tex`, so the first $${4 * q}$ terms cancel in groups of four and the sum equals the remaining ${rest === 1 ? 'term' : `${rest} terms`}: $${powers} = ${parts}${rest > 1 ? ` = ${value}` : ''}$.`;
    return {
      stem: fromOne
        ? tex`The sum $1 + i + i^{2} + \cdots + i^{${n}}$ is equal to:`
        : tex`The sum $i + i^{2} + i^{3} + \cdots + i^{${n}}$ is equal to:`,
      answer: m$(value),
      distractors: values.filter((v) => v !== value).map((v) => m$(v)),
      explanation:
        tex`Any four consecutive powers of $i$ add up to $0$, because $i^{m}(1 + i + i^{2} + i^{3}) = i^{m}(1 + i - 1 - i) = 0$. The sum has $${count} = 4(${q}) + ${rest}$ terms` +
        tail,
    };
  }),

  b.dynamic('product-of-complex-numbers', { difficulty: 1, tags: ['complex numbers', 'conjugates'] }, (r) => {
    const form = r.weighted(['standard', 'ordered-pair', 'conjugate-pair'] as const, [3, 2, 2]);

    if (form === 'conjugate-pair') {
      let a = 0;
      let bb = 0;
      do {
        a = r.nonZero(-9, 9);
        bb = r.nonZero(-9, 9);
      } while (Math.abs(a) === Math.abs(bb));
      const z = cx(a, bb);
      const zBar = cx(a, -bb);
      const mod2 = a * a + bb * bb;
      const answer = m$(String(mod2));
      return {
        stem: tex`If $z = ${z}$, then $z\bar{z}$ is equal to:`,
        answer,
        distractors: pickDistractors(answer, [
          m$(String(a * a - bb * bb)), // took i^2 = +1
          m$(cx(a * a - bb * bb, 2 * a * bb)), // squared z instead
          m$(surdTex(1, mod2)), // gave |z| instead of |z|^2
          m$(cx(a * a, -bb * bb)), // wrote (bi)^2 as b^2 i
        ]),
        explanation: tex`$\bar{z} = ${zBar}$, so $z\bar{z} = (${z})(${zBar}) = ${sq(a)} - (${coefTex(bb, 'i')})^{2} = ${a * a} + ${bb * bb} = ${mod2}$. In general $z\bar{z} = a^{2} + b^{2} = |z|^{2}$, which is always real.`,
      };
    }

    let a = 0;
    let bb = 0;
    let c = 0;
    let d = 0;
    let re = 0;
    let im = 0;
    do {
      a = r.nonZero(-6, 6);
      bb = r.nonZero(-6, 6);
      c = r.nonZero(-6, 6);
      d = r.nonZero(-6, 6);
      re = a * c - bb * d;
      im = a * d + bb * c;
    } while (re === 0 || im === 0);

    if (form === 'ordered-pair') {
      const pair = (x: number, y: number): string => `$(${x}, ${y})$`;
      const answer = pair(re, im);
      return {
        stem: tex`In ordered-pair form, the product of the complex numbers $(${a}, ${bb})$ and $(${c}, ${d})$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          pair(a * c, bb * d), // multiplied componentwise
          pair(a * c + bb * d, im), // took i^2 = +1
          pair(re, -im), // sign slip in the second component
          pair(re, a * d - bb * c),
        ]),
        explanation: tex`$(a, b)(c, d) = (ac - bd,\ ad + bc)$, so the product is $\left((${a})(${c}) - (${bb})(${d}),\ (${a})(${d}) + (${bb})(${c})\right) = (${re}, ${im})$.`,
      };
    }

    const z1 = cx(a, bb);
    const z2 = cx(c, d);
    const answer = m$(cx(re, im));
    const expanded = signedSum([
      [a * c, ''],
      [a * d, 'i'],
      [bb * c, 'i'],
      [bb * d, 'i^{2}'],
    ]);
    return {
      stem: tex`The product $(${z1})(${z2})$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, [
        m$(cx(a * c + bb * d, im)), // took i^2 = +1
        m$(cx(a * c, bb * d)), // multiplied real and imaginary parts separately
        m$(cx(re, -im)), // sign slip in the imaginary part
        m$(cx(re, a * d - bb * c)),
      ]),
      explanation: tex`$(${z1})(${z2}) = ${expanded}$. Using $i^{2} = -1$, the real part is $${a * c}${signed(-bb * d)} = ${re}$ and the imaginary part is $${a * d}${signed(bb * c)} = ${im}$, so the product is $${cx(re, im)}$.`,
    };
  }),

  b.dynamic('quotient-and-inverse', { difficulty: 2, origin: 'past-paper', tags: ['complex numbers', 'conjugates'] }, (r) => {
    const form = r.weighted(['divide', 'conjugate', 'inverse', 'pair-inverse'] as const, [3, 1, 2, 2]);

    if (form === 'inverse' || form === 'pair-inverse') {
      let a = 0;
      let bb = 0;
      do {
        a = r.nonZero(-7, 7);
        bb = r.nonZero(-7, 7);
      } while (Math.abs(a) === Math.abs(bb));
      const mod2 = a * a + bb * bb;

      if (form === 'pair-inverse') {
        const pairTex = (x: number | Fraction, y: number | Fraction): string => `\\left(${texOf(x)}, ${texOf(y)}\\right)`;
        const inverse = pairTex(frac(a, mod2), frac(-bb, mod2));
        const answer = m$(inverse);
        return {
          stem: tex`In ordered-pair form, the multiplicative inverse of the complex number $(${a}, ${bb})$ is:`,
          answer,
          distractors: pickDistractors(answer, [
            m$(pairTex(frac(a, mod2), frac(bb, mod2))), // forgot the minus sign
            m$(pairTex(frac(1, a), frac(1, bb))), // took reciprocals componentwise
            m$(pairTex(-a, -bb)), // additive inverse instead
          ]),
          explanation: tex`For $(a, b) \ne (0, 0)$ the multiplicative inverse is $\left(\frac{a}{a^{2} + b^{2}}, \frac{-b}{a^{2} + b^{2}}\right)$. Here $a^{2} + b^{2} = ${sq(a)} + ${sq(bb)} = ${mod2}$, so the inverse is $${inverse}$. Check: $(${a}, ${bb}) \cdot ${inverse} = (1, 0)$, the multiplicative identity.`,
        };
      }

      const z = cx(a, bb);
      const zBar = cx(a, -bb);
      const inverse = cFrac(a, -bb, mod2);
      const unreduced = `\\frac{${zBar}}{${mod2}}`;
      const answer = m$(inverse);
      return {
        stem: tex`The multiplicative inverse of $${z}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m$(cFrac(a, bb, mod2)), // did not conjugate the numerator
          m$(cOverRoot(a, -bb, mod2)), // divided by |z| instead of |z|^2
          m$(cFrac(a, -bb, a * a - bb * bb)), // took i^2 = +1 in the denominator
          m$(cx(-a, -bb)), // additive inverse instead
        ]),
        explanation: tex`$\frac{1}{${z}} = \frac{${zBar}}{(${z})(${zBar})} = \frac{${zBar}}{${sq(a)} + ${sq(bb)}} = ${unreduced}${inverse === unreduced ? '' : ` = ${inverse}`}$.`,
      };
    }

    // Division with a Gaussian-integer quotient p + qi.
    const p = r.nonZero(-5, 5);
    const q = r.nonZero(-5, 5);
    const c = r.nonZero(-4, 4);
    const d = r.nonZero(-4, 4);
    const nRe = p * c - q * d;
    const nIm = p * d + q * c;
    const mod2 = c * c + d * d;
    const top = cx(nRe, nIm);
    const den = cx(c, d);
    const denBar = cx(c, -d);
    const working = tex`\dfrac{${top}}{${den}} = \dfrac{(${top})(${denBar})}{(${den})(${denBar})} = \dfrac{${cx(p * mod2, q * mod2)}}{${mod2}} = ${cx(p, q)}`;

    if (form === 'conjugate') {
      const answer = m$(cx(p, -q));
      return {
        stem: tex`The conjugate of $\dfrac{${top}}{${den}}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m$(cx(p, q)), // simplified but forgot to conjugate
          m$(cx(-p, q)), // changed the sign of the real part
          m$(cx(-p, -q)), // changed both signs
          m$(cx(q, -p)),
        ]),
        explanation: tex`First write the number in the form $a + bi$ by multiplying by the conjugate of the denominator: $${working}$. Its conjugate changes only the sign of the imaginary part: $${cx(p, -q)}$.`,
      };
    }

    const answer = m$(cx(p, q));
    return {
      stem: tex`The complex number $\dfrac{${top}}{${den}}$ in the form $a + bi$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        m$(cx(frac(nRe, c), frac(nIm, d))), // divided real by real and imaginary by imaginary
        ...r.shuffle([m$(cx(p, -q)), m$(cx(-p, q)), m$(cx(q, p))]), // sign or order slips
        m$(cx(-p, -q)),
      ]),
      explanation: tex`Multiply the numerator and the denominator by $${denBar}$, the conjugate of the denominator: $${working}$.`,
    };
  }),

  b.dynamic('equality-of-complex-numbers', { difficulty: 2, tags: ['complex numbers'] }, (r) => {
    // Real part a1·x + b1·y, imaginary part a2·x + b2·y; every system has a non-zero determinant.
    const [a1, b1, a2, b2] = r.pick([
      [1, 1, 1, -1],
      [1, 2, 2, -1],
      [2, 1, 1, -1],
      [1, -2, 1, 1],
      [3, 1, 1, -1],
      [2, -1, 1, 1],
      [1, 3, 1, -1],
      [2, 3, 1, 1],
      [1, 1, 2, -1],
    ] as const);
    let x = 0;
    let y = 0;
    let p = 0;
    let q = 0;
    do {
      x = r.nonZero(-5, 5);
      y = r.nonZero(-5, 5);
      p = a1 * x + b1 * y;
      q = a2 * x + b2 * y;
    } while (p === 0 || q === 0 || p === q);
    const det = a1 * b2 - b1 * a2;
    const pairTex = (u: number | Fraction, v: number | Fraction): string => `$x = ${texOf(u)},\\ y = ${texOf(v)}$`;
    const re = signedSum([
      [a1, 'x'],
      [b1, 'y'],
    ]);
    const im = signedSum([
      [a2, 'x'],
      [b2, 'y'],
    ]);
    const subst = (u: number, v: number): string =>
      `${u === 1 ? '' : u}(${x}) ${v < 0 ? '-' : '+'} ${Math.abs(v) === 1 ? '' : Math.abs(v)}(${y})`;
    // Matching the real part with the imaginary part of the right side; kept only when it gives small integers.
    const mx = frac(q * b2 - b1 * p, det);
    const my = frac(a1 * p - a2 * q, det);
    const mismatched = mx.d === 1 && my.d === 1 && Math.abs(mx.n) <= 9 && Math.abs(my.n) <= 9 ? [pairTex(mx, my)] : [];
    const answer = pairTex(x, y);
    return {
      stem: tex`If $x$ and $y$ are real numbers such that $(${re}) + (${im})i = ${cx(p, q)}$, then:`,
      answer,
      distractors: pickDistractors(answer, [
        pairTex(y, x), // swapped x and y
        ...mismatched,
        pairTex(x, -y), // sign slip
        pairTex(-x, y),
        pairTex(-x, -y),
      ]),
      explanation: tex`Two complex numbers are equal only when their real parts are equal and their imaginary parts are equal: $${re} = ${p}$ and $${im} = ${q}$. Solving these simultaneously gives $x = ${x}$ and $y = ${y}$. Check: $${subst(a1, b1)} = ${p}$ and $${subst(a2, b2)} = ${q}$.`,
    };
  }),

  b.dynamic('modulus-of-product-quotient', { difficulty: 2, origin: 'past-paper', tags: ['modulus and argument'] }, (r) => {
    const form = r.weighted(['product', 'quotient', 'power'] as const, [2, 2, 1]);

    if (form === 'power') {
      // Keep |z|^(2n) below 10^6 so every option prints as a plain integer.
      const z = gaussian(r, r.chance(0.5) ? TRIPLES[0] : r.pick(TRIPLES));
      const n = z.mod === 5 ? r.int(2, 4) : 2;
      const { answer, distractors } = numericOptions(r, {
        correct: z.mod ** n,
        wrong: [
          n * z.mod, // multiplied |z| by n
          legSum(z) ** n, // took |a + bi| = |a| + |b|
          legSumOfPower(z.a, z.b, n), // expanded z^n, then took |x + iy| = |x| + |y|
          z.mod ** (2 * n), // forgot the square root in |z|
        ],
        format: n$,
      });
      return {
        stem: tex`If $z = ${cx(z.a, z.b)}$, then $\left|z^{${n}}\right|$ is equal to:`,
        answer,
        distractors,
        explanation: tex`$|z^{n}| = |z|^{n}$ and $|z| = \sqrt{${sq(z.a)} + ${sq(z.b)}} = ${z.mod}$, so $\left|z^{${n}}\right| = ${z.mod}^{${n}} = ${z.mod ** n}$.`,
      };
    }

    if (form === 'product') {
      const [t1, t2] = r.sample(TRIPLES, 2);
      const z1 = gaussian(r, t1 as (typeof TRIPLES)[number]);
      const z2 = gaussian(r, t2 as (typeof TRIPLES)[number]);
      const product = z1.mod * z2.mod;
      const re = z1.a * z2.a - z1.b * z2.b;
      const im = z1.a * z2.b + z1.b * z2.a;
      const { answer, distractors } = numericOptions(r, {
        correct: product,
        wrong: [
          z1.mod + z2.mod, // added the moduli
          legSum(z1) * legSum(z2), // took |a + bi| = |a| + |b|
          Math.abs(re) + Math.abs(im), // multiplied out, then took |x + iy| = |x| + |y|
          product * product, // forgot the square roots
        ],
        format: n$,
      });
      return {
        stem: tex`If $z_1 = ${cx(z1.a, z1.b)}$ and $z_2 = ${cx(z2.a, z2.b)}$, then $|z_1 z_2|$ is equal to:`,
        answer,
        distractors,
        explanation: tex`$|z_1 z_2| = |z_1|\,|z_2| = \sqrt{${sq(z1.a)} + ${sq(z1.b)}}\;\sqrt{${sq(z2.a)} + ${sq(z2.b)}} = ${z1.mod} \times ${z2.mod} = ${product}$.`,
      };
    }

    // Quotient: avoid similar triangles, whose leg-sum ratio equals the true ratio.
    let z1: Gaussian;
    let z2: Gaussian;
    do {
      const [t1, t2] = r.sample(TRIPLES, 2);
      z1 = gaussian(r, t1 as (typeof TRIPLES)[number]);
      z2 = gaussian(r, t2 as (typeof TRIPLES)[number]);
    } while (legSum(z1) * z2.mod === legSum(z2) * z1.mod);
    const ratio = frac(z1.mod, z2.mod);
    const answer = m$(ratio.toTex());
    return {
      stem: tex`If $z_1 = ${cx(z1.a, z1.b)}$ and $z_2 = ${cx(z2.a, z2.b)}$, then $\left|\dfrac{z_1}{z_2}\right|$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, [
        m$(frac(z2.mod, z1.mod).toTex()), // inverted
        m$(frac(z1.mod ** 2, z2.mod ** 2).toTex()), // forgot the square roots
        m$(frac(legSum(z1), legSum(z2)).toTex()), // took |a + bi| = |a| + |b|
        m$(String(z1.mod * z2.mod)), // multiplied instead of dividing
      ]),
      explanation: tex`$\left|\dfrac{z_1}{z_2}\right| = \dfrac{|z_1|}{|z_2|} = \dfrac{\sqrt{${sq(z1.a)} + ${sq(z1.b)}}}{\sqrt{${sq(z2.a)} + ${sq(z2.b)}}} = \dfrac{${z1.mod}}{${z2.mod}}${ratio.d === z2.mod ? '' : ` = ${ratio.toTex()}`}$.`,
    };
  }),

  b.dynamic('modulus-of-several-factors', { difficulty: 2, origin: 'past-paper', tags: ['modulus and argument'] }, (r) => {
    // Legs with a non-square |z|^2: 2, 5, 10, 13, 17, 26. Four factors use only the small ones.
    const LEGS = [
      [1, 1],
      [1, 2],
      [2, 1],
      [1, 3],
      [3, 1],
      [2, 3],
      [3, 2],
      [1, 4],
      [4, 1],
      [1, 5],
      [5, 1],
    ] as const;
    let factors: Array<{ a: number; b: number; m: number }> = [];
    let answer = '';
    let candidates: string[] = [];
    let total = 0;
    let sumSq = 0;
    do {
      const count = r.weighted([3, 4], [2, 1]);
      factors = r.sample(count === 4 ? LEGS.slice(0, 7) : LEGS, count).map(([x, y]) => ({
        a: x * r.sign(),
        b: y * r.sign(),
        m: x * x + y * y,
      }));
      total = factors.reduce((acc, f) => acc * f.m, 1);
      sumSq = factors.reduce((acc, f) => acc + f.m, 0);
      const legProduct = factors.reduce((acc, f) => acc * (Math.abs(f.a) + Math.abs(f.b)), 1);
      answer = m$(surdTex(1, total));
      candidates = [
        m$(String(total)), // forgot the square root
        m$(surdTex(1, sumSq)), // added the squared moduli instead of multiplying
        m$(String(legProduct)), // took |a + bi| = |a| + |b|
      ];
    } while (new Set([answer, ...candidates].map(normalizeOption)).size !== 4);
    const product = factors.map((f) => `(${cx(f.a, f.b)})`).join('');
    const moduli = factors.map((f) => `\\left|${cx(f.a, f.b)}\\right|`).join('\\,');
    const roots = factors.map((f) => `\\sqrt{${f.m}}`).join('\\,');
    const simplified = surdTex(1, total);
    return {
      stem: tex`The value of $\left|${product}\right|$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`The modulus of a product is the product of the moduli, and $|a + bi| = \sqrt{a^{2} + b^{2}}$: $\left|${product}\right| = ${moduli} = ${roots} = \sqrt{${total}}${simplified === `\\sqrt{${total}}` ? '' : ` = ${simplified}`}$.`,
    };
  }),

  b.dynamic('principal-argument', { difficulty: 2, origin: 'past-paper', tags: ['modulus and argument'] }, (r) => {
    const shape = r.pick(SHAPES);
    const quadrant = r.pick(QUADRANTS);
    const k = r.int(1, 4);
    const [sx, sy] = QUADRANT_SIGNS[quadrant];
    const z = surdComplex(sx * k, shape.xs, sy * k, shape.ys);
    const theta = principalDeg(shape.alpha, quadrant);
    const inDegrees = r.chance(0.3);
    const angle = inDegrees ? degreeTex : radianTex;
    const answer = m$(angle(theta));
    const half = inDegrees ? '180^{\\circ}' : '\\pi';
    const range = `-${half} < \\arg z \\le ${half}`;
    const formula = { 1: '\\alpha', 2: `${half} - \\alpha`, 3: `-(${half} - \\alpha)`, 4: '-\\alpha' }[quadrant];
    return {
      stem: tex`The principal argument of $z = ${z}$ (taking $${range}$) is:`,
      answer,
      distractors: pickDistractors(
        answer,
        argumentSlips(shape.alpha, quadrant).map((deg) => m$(angle(deg))),
      ),
      explanation: tex`Here $x ${sx < 0 ? '<' : '>'} 0$ and $y ${sy < 0 ? '<' : '>'} 0$, so $z$ lies in the ${QUADRANT_NAME[quadrant]} quadrant. The reference angle is $\alpha = \tan^{-1}\left|\frac{y}{x}\right| = \tan^{-1}\left(${shape.ratio}\right) = ${angle(shape.alpha)}$, so $\arg z = ${formula} = ${angle(theta)}$.`,
    };
  }),

  b.dynamic('polar-form', { difficulty: 2, tags: ['polar form', 'modulus and argument'] }, (r) => {
    const shape = r.pick(SHAPES);
    const k = r.int(1, 4);
    const root2 = shape.alpha === 45;
    const rTex = root2 ? surdTerm(k, 2) : String(2 * k);

    if (r.chance(0.5)) {
      // Cartesian -> polar.
      const quadrant = r.pick(QUADRANTS);
      const [sx, sy] = QUADRANT_SIGNS[quadrant];
      const z = surdComplex(sx * k, shape.xs, sy * k, shape.ys);
      const theta = principalDeg(shape.alpha, quadrant);
      const rSquared = String(root2 ? 2 * k * k : 4 * k * k);
      const answer = m$(polarTex(rTex, theta));
      return {
        stem: tex`The polar form of $z = ${z}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m$(polarTex(rSquared, theta)), // forgot the square root in |z|
          ...argumentSlips(shape.alpha, quadrant).map((deg) => m$(polarTex(rTex, deg))), // wrong angle
        ]),
        explanation: tex`$r = |z| = \sqrt{${k * k * shape.xs} + ${k * k * shape.ys}} = ${rTex}$. The point lies in the ${QUADRANT_NAME[quadrant]} quadrant with reference angle $${radianTex(shape.alpha)}$, so $\theta = ${radianTex(theta)}$ and $z = ${polarTex(rTex, theta)}$.`,
      };
    }

    // Polar -> Cartesian.
    const pool: Record<number, number[]> = {
      30: [30, 150, 210, 330, -30, -150],
      45: [45, 135, 225, 315, -45, -135],
      60: [60, 120, 240, 300, -60, -120],
    };
    const theta = r.pick(pool[shape.alpha] as number[]);
    const cos = trig('cos', theta);
    const sin = trig('sin', theta);
    const sx = Math.sign(cos.value);
    const sy = Math.sign(sin.value);
    const polar = polarTex(rTex, theta);
    const value = surdComplex(sx * k, shape.xs, sy * k, shape.ys);
    const answer = m$(value);
    return {
      stem: tex`The complex number $${polar}$ in the form $a + bi$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        m$(surdComplex(sy * k, shape.ys, sx * k, shape.xs)), // swapped cos and sin
        m$(surdComplex(k, shape.xs, k, shape.ys)), // ignored the signs of cos and sin
        m$(surdComplex(sx * k, shape.xs, -sy * k, shape.ys)), // sign slip in sin
        m$(surdComplex(-sx * k, shape.xs, sy * k, shape.ys)), // sign slip in cos
        m$(surdComplex(-sx * k, shape.xs, -sy * k, shape.ys)), // both signs wrong
      ]),
      explanation: tex`$a = r\cos\theta = ${rTex}\left(${cos.tex}\right) = ${surdTerm(sx * k, shape.xs)}$ and $b = r\sin\theta = ${rTex}\left(${sin.tex}\right) = ${surdTerm(sy * k, shape.ys)}$, so the number is $${value}$.`,
    };
  }),

  b.dynamic('de-moivre-power', { difficulty: 3, tags: ['polar form', 'complex numbers'] }, (r) => {
    const form = r.weighted(['cis', 'binomial', 'ratio'] as const, [2, 3, 1]);

    if (form === 'cis') {
      const [m, n0] = r.pick(DE_MOIVRE_CASES) as readonly [number, number];
      const n = r.chance(0.3) ? -n0 : n0;
      const thetaDeg = 180 / m;
      const phi = n * thetaDeg;
      const theta = radianTex(thetaDeg);
      const answer = m$(cisTex(phi));
      return {
        stem: tex`The value of $\left(\cos ${theta} + i\sin ${theta}\right)^{${n}}$ is:`,
        answer,
        distractors: pickDistractors(
          answer,
          // conjugate (sign slip), negative, cos and sin swapped, a quarter-turn off
          [-phi, phi + 180, 90 - phi, phi + 90, phi - 90].map((deg) => m$(cisTex(deg))),
        ),
        explanation: tex`By De Moivre's theorem, $(\cos\theta + i\sin\theta)^{n} = \cos n\theta + i\sin n\theta$. Here $n\theta = ${paren(n)} \times ${theta} = ${radianTex(phi)}$, so the value is $\cos ${trigArg(phi)} + i\sin ${trigArg(phi)} = ${cisTex(phi)}$.`,
      };
    }

    if (form === 'ratio') {
      const n = r.int(5, 60);
      const flip = r.chance(0.5);
      const k0 = n % 4;
      const k = flip && n % 2 === 1 ? k0 + 2 : k0;
      const why = `$${n} = 4(${Math.floor(n / 4)}) + ${k0}$`;
      return {
        stem: flip
          ? tex`The value of $\left(\dfrac{1 - i}{1 + i}\right)^{${n}}$ is:`
          : tex`The value of $\left(\dfrac{1 + i}{1 - i}\right)^{${n}}$ is:`,
        ...powerOfIOptions(k),
        explanation: flip
          ? tex`$\dfrac{1 - i}{1 + i} = \dfrac{(1 - i)^{2}}{(1 + i)(1 - i)} = \dfrac{1 - 2i + i^{2}}{2} = -i$, so the value is $(-i)^{${n}} = (-1)^{${n}}\,i^{${n}} = ${I_POW[mod4(k)]}$, using ${why} so that $i^{${n}} = ${I_POW[k0]}$.`
          : tex`$\dfrac{1 + i}{1 - i} = \dfrac{(1 + i)^{2}}{(1 - i)(1 + i)} = \dfrac{1 + 2i + i^{2}}{2} = i$, so the value is $i^{${n}} = i^{${k0}} = ${I_POW[k0]}$, using ${why}.`,
      };
    }

    // (x + iy)^n with |z| = sqrt(2) or 2 and n·arg z a multiple of pi/2: a real or purely imaginary result.
    const shape = r.pick(SHAPES);
    const quadrant = r.pick(QUADRANTS);
    const [sx, sy] = QUADRANT_SIGNS[quadrant];
    const root2 = shape.alpha === 45;
    const n = root2 ? r.pick([4, 6, 8, 10]) : r.pick([3, 6]);
    const alpha = principalDeg(shape.alpha, quadrant);
    const phi = n * alpha;
    const size = root2 ? 2 ** (n / 2) : 2 ** n;
    const wrongSize = root2 ? 2 ** n : 4 ** n; // |z| taken without the square root
    const z = surdComplex(sx, shape.xs, sy, shape.ys);
    const rTex = root2 ? '\\sqrt{2}' : '2';
    const value = axisTex(size, phi);
    const answer = m$(value);
    return {
      stem: tex`The value of $(${z})^{${n}}$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        m$(axisTex(size, phi + 180)), // sign slip
        m$(axisTex(wrongSize, phi)), // forgot the square root in |z|
        m$(axisTex(size, phi + 90)), // argument a quarter-turn off
        m$(axisTex(size, phi - 90)),
      ]),
      explanation: tex`In polar form $${z} = ${rTex}\left(\cos ${trigArg(alpha)} + i\sin ${trigArg(alpha)}\right)$. By De Moivre's theorem, $(${z})^{${n}} = ${root2 ? '\\left(\\sqrt{2}\\right)' : '2'}^{${n}}\left(\cos ${trigArg(phi)} + i\sin ${trigArg(phi)}\right) = ${size}\left(${cisTex(phi)}\right) = ${value}$.`,
    };
  }),

  b.dynamic('recurring-decimal-fraction', { difficulty: 2, tags: ['real number properties'] }, (r) => {
    const form = r.pick(['pure', 'mixed', 'whole'] as const);
    const f = (n: number, d: number): string => m$(frac(n, d).toTex());
    /** Slip results as options, skipping any that simplify to a whole number (no recurring decimal equals one). */
    const slips = (pairs: ReadonlyArray<readonly [number, number]>): string[] =>
      pairs.filter(([n, d]) => frac(n, d).d !== 1).map(([n, d]) => f(n, d));
    const lowest = (n: number, d: number): string => (gcd(n, d) === 1 ? '' : ` = ${frac(n, d).toTex()}`);
    const ending = 'written as a fraction in its lowest terms is:';

    if (form === 'pure') {
      // 0.(d1 d2) repeating = (10 d1 + d2)/99
      const d1 = r.int(1, 9);
      const d2 = r.intExcept(1, 9, [d1]);
      const n = 10 * d1 + d2;
      const answer = f(n, 99);
      return {
        stem: tex`The recurring decimal $0.\overline{${d1}${d2}}$ $(= 0.${`${d1}${d2}`.repeat(3)}\ldots)$ ${ending}`,
        answer,
        distractors: pickDistractors(
          answer,
          slips([
            [n, 100], // treated it as terminating
            [n, 90], // wrong denominator
            [n - d1, 90], // used the mixed-recurring rule
            [n, 999],
          ]),
        ),
        explanation: tex`Let $x = 0.\overline{${d1}${d2}}$. Then $100x = ${n}.\overline{${d1}${d2}}$; subtracting, $99x = ${n}$, so $x = \frac{${n}}{99}${lowest(n, 99)}$.`,
      };
    }

    if (form === 'mixed') {
      // 0.d1 (d2) repeating = (10 d1 + d2 - d1)/90
      const d1 = r.int(1, 9);
      const d2 = r.intExcept(1, 8, [d1]);
      const n = 9 * d1 + d2;
      const answer = f(n, 90);
      return {
        stem: tex`The recurring decimal $0.${d1}\overline{${d2}}$ $(= 0.${d1}${String(d2).repeat(4)}\ldots)$ ${ending}`,
        answer,
        distractors: pickDistractors(
          answer,
          slips([
            [10 * d1 + d2, 90], // forgot to subtract the non-recurring part
            [10 * d1 + d2, 99], // treated both digits as recurring
            [n, 99],
            [10 * d1 + d2, 100],
          ]),
        ),
        explanation: tex`Let $x = 0.${d1}\overline{${d2}}$. Then $10x = ${d1}.\overline{${d2}}$ and $100x = ${10 * d1 + d2}.\overline{${d2}}$; subtracting, $90x = ${10 * d1 + d2} - ${d1} = ${n}$, so $x = \frac{${n}}{90}${lowest(n, 90)}$.`,
      };
    }

    // w.(d) repeating = (10w + d - w)/9
    const w = r.int(1, 9);
    const d = r.int(1, 8);
    const n = 9 * w + d;
    const answer = f(n, 9);
    return {
      stem: tex`The recurring decimal $${w}.\overline{${d}}$ $(= ${w}.${String(d).repeat(4)}\ldots)$ ${ending}`,
      answer,
      distractors: pickDistractors(
        answer,
        slips([
          [10 * w + d, 9], // forgot to subtract the whole-number part
          [10 * w + d, 10], // treated it as terminating
          [99 * w + d, 99], // used 99 for a one-digit period
          [90 * w + d, 90], // used 90 as for a mixed recurring decimal
        ]),
      ),
      explanation: tex`Let $x = ${w}.\overline{${d}}$. Then $10x = ${10 * w + d}.\overline{${d}}$; subtracting, $9x = ${10 * w + d} - ${w} = ${n}$, so $x = \frac{${n}}{9}${lowest(n, 9)}$.`,
    };
  }),

  b.dynamic('rational-or-irrational', { difficulty: 1, tags: ['real number properties'] }, (r) => {
    // [number, reason]; reasons are rich text with their own $...$ delimiters.
    const IRRATIONAL: ReadonlyArray<readonly [string, string]> = [
      [tex`\sqrt{2}`, tex`$2$ is not a perfect square`],
      [tex`\sqrt{3}`, tex`$3$ is not a perfect square`],
      [tex`\sqrt{5}`, tex`$5$ is not a perfect square`],
      [tex`\sqrt{7}`, tex`$7$ is not a perfect square`],
      [tex`\sqrt{8}`, tex`$\sqrt{8} = 2\sqrt{2}$`],
      [tex`\sqrt{12}`, tex`$\sqrt{12} = 2\sqrt{3}$`],
      [tex`\pi`, tex`$\pi = 3.14159\ldots$ neither terminates nor recurs`],
      [tex`2 + \sqrt{3}`, tex`a rational number plus an irrational number is irrational`],
    ];
    const RATIONAL: ReadonlyArray<readonly [string, string]> = [
      [tex`\frac{22}{7}`, tex`a ratio of two integers; it is only an approximation of $\pi$`],
      [tex`\sqrt{16}`, tex`$\sqrt{16} = 4$`],
      [tex`\sqrt{49}`, tex`$\sqrt{49} = 7$`],
      [tex`\sqrt{\frac{9}{4}}`, tex`$\sqrt{\frac{9}{4}} = \frac{3}{2}$`],
      [tex`0.\overline{3}`, tex`$0.\overline{3} = \frac{1}{3}$`],
      [tex`3.14`, tex`$3.14 = \frac{314}{100}$`],
      [tex`\sqrt[3]{27}`, tex`$\sqrt[3]{27} = 3$`],
      [tex`\sqrt{0.25}`, tex`$\sqrt{0.25} = 0.5 = \frac{1}{2}$`],
      [tex`\frac{\sqrt{18}}{\sqrt{2}}`, tex`$\frac{\sqrt{18}}{\sqrt{2}} = \sqrt{9} = 3$`],
    ];
    const askIrrational = r.chance(0.5);
    const [hit, hitWhy] = r.pick(askIrrational ? IRRATIONAL : RATIONAL);
    const others = r.sample(askIrrational ? RATIONAL : IRRATIONAL, 3);
    const listed = others.map(([v, w]) => `$${v}$: ${w}`).join('; ');
    return {
      stem: askIrrational ? 'Which of the following is an irrational number?' : 'Which of the following is a rational number?',
      answer: m$(hit),
      distractors: others.map(([v]) => m$(v)),
      explanation:
        tex`A rational number can be written as $\frac{p}{q}$ with integers $p, q$ and $q \ne 0$; its decimal expansion terminates or recurs. ` +
        (askIrrational
          ? `$${hit}$ is irrational because ${hitWhy}. The others are rational (${listed}).`
          : `$${hit}$ is rational (${hitWhy}). The others are irrational (${listed}).`),
    };
  }),

  b.dynamic('name-the-property', { difficulty: 1, origin: 'past-paper', tags: ['real number properties'] }, (r) => {
    const item = r.pick(PROPERTY_ITEMS)(r);
    return {
      stem: item.stem,
      answer: item.answer,
      distractors: pickDistractors(item.answer, item.others),
      explanation: item.why,
    };
  }),

  ...b.mcqs([
    {
      id: 'sqrt-of-negatives',
      d: 3,
      t: ['complex numbers'],
      q: tex`The value of $\sqrt{-3}\,\sqrt{-12}$ is:`,
      a: '$-6$',
      x: ['$6$', '$6i$', '$-6i$'],
      e: tex`$\sqrt{-3} = i\sqrt{3}$ and $\sqrt{-12} = 2i\sqrt{3}$, so the product is $2i^{2}\left(\sqrt{3}\right)^{2} = 2(-1)(3) = -6$. The rule $\sqrt{a}\,\sqrt{b} = \sqrt{ab}$ fails when $a$ and $b$ are both negative, which is why $\sqrt{(-3)(-12)} = \sqrt{36} = 6$ is wrong.`,
    },
    {
      id: 'argument-of-product',
      d: 3,
      t: ['modulus and argument', 'polar form'],
      q: tex`If $z_1 = -1 + i$ and $z_2 = 1 + \sqrt{3}\,i$, then the principal argument of $z_1 z_2$ (taking $-\pi < \arg z \le \pi$) is:`,
      a: tex`$-\frac{11\pi}{12}$`,
      x: [tex`$\frac{11\pi}{12}$`, tex`$\frac{5\pi}{12}$`, tex`$\frac{7\pi}{12}$`],
      e: tex`$\arg z_1 = \frac{3\pi}{4}$ (second quadrant) and $\arg z_2 = \frac{\pi}{3}$, so $\arg(z_1 z_2) = \frac{3\pi}{4} + \frac{\pi}{3} = \frac{13\pi}{12}$ up to a multiple of $2\pi$. Since $\frac{13\pi}{12} > \pi$, subtract $2\pi$: the principal argument is $-\frac{11\pi}{12}$. Check: $z_1 z_2 = -(1 + \sqrt{3}) + (1 - \sqrt{3})i$ lies in the third quadrant.`,
    },
    {
      id: 'complex-numbers-not-ordered',
      d: 1,
      t: ['complex numbers', 'real number properties'],
      q: 'Which property of the real numbers does **not** hold in the set of complex numbers?',
      a: 'Order (trichotomy) property',
      x: ['Commutative property of multiplication', 'Distributive property', 'Multiplicative inverse property'],
      e: tex`Like $\mathbb{R}$, the set $\mathbb{C}$ is a field, so the commutative, distributive and inverse properties all hold. But $\mathbb{C}$ cannot be ordered: $i > 0$ would give $i \cdot i > 0$, i.e. $-1 > 0$, and $i < 0$ would give $-i > 0$, so $(-i)(-i) = -1 > 0$. Both are false, so the order (trichotomy) property fails.`,
    },
    {
      id: 'additive-inverse-ordered-pair',
      d: 1,
      t: ['complex numbers'],
      q: tex`The additive inverse of the complex number $(a, b)$ is:`,
      a: tex`$(-a, -b)$`,
      x: [tex`$(a, -b)$`, tex`$(-a, b)$`, tex`$(0, 0)$`],
      e: tex`$(a, b) + (-a, -b) = (0, 0)$, the additive identity, so $(-a, -b)$ is the additive inverse. $(a, -b)$ is the conjugate of $(a, b)$, and $(0, 0)$ is the additive identity itself.`,
    },
    {
      id: 'modulus-not-additive',
      d: 1,
      t: ['modulus and argument', 'conjugates'],
      q: tex`Which of the following is **not** true in general for complex numbers $z_1$ and $z_2$?`,
      a: tex`$|z_1 + z_2| = |z_1| + |z_2|$`,
      x: [tex`$|z_1 z_2| = |z_1|\,|z_2|$`, tex`$\overline{z_1 + z_2} = \overline{z_1} + \overline{z_2}$`, tex`$z_1\overline{z_1} = |z_1|^{2}$`],
      e: tex`$|z_1 z_2| = |z_1|\,|z_2|$, $\overline{z_1 + z_2} = \overline{z_1} + \overline{z_2}$ and $z_1\overline{z_1} = |z_1|^{2}$ hold for all complex numbers. But $|z_1 + z_2| = |z_1| + |z_2|$ fails in general: for $z_1 = 1$, $z_2 = -1$ the left side is $0$ and the right side is $2$. Only the triangle inequality $|z_1 + z_2| \le |z_1| + |z_2|$ always holds.`,
    },
    {
      id: 'irrational-decimal-expansion',
      d: 1,
      t: ['real number properties'],
      q: 'The decimal expansion of an irrational number is:',
      a: 'non-terminating and non-recurring',
      x: ['terminating', 'non-terminating and recurring', 'either terminating or recurring'],
      e: tex`A number is rational exactly when its decimal expansion terminates (e.g. $\frac{3}{8} = 0.375$) or recurs (e.g. $\frac{1}{3} = 0.333\ldots$). Irrational numbers such as $\sqrt{2} = 1.41421\ldots$ and $\pi = 3.14159\ldots$ never terminate and never repeat.`,
    },
  ]),
]);
