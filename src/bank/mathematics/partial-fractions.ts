/**
 * Partial Fractions (FSc Part I, Chapter 4).
 *
 * Coverage
 * - linear factors: cover-up rule, the standard results for x^2 - a^2, full decompositions,
 *   and telescoping sums built from partial fractions;
 * - repeated linear factors;
 * - irreducible quadratic factors, including x^3 - a^3 and x^3 + a^3 denominators;
 * - the form of a decomposition and the number of partial fractions (with factorisation traps);
 * - improper fractions (divide first).
 *
 * Computational templates build each fraction backwards from chosen integer constants, so
 * every instance has an exact, "nice" answer. Questions about forms and counts verify the
 * fraction with an exact solver (`decompose`) so that no constant of the decomposition
 * vanishes; that is what makes every under-inclusive "form" distractor definitely wrong.
 */
import { defineBank } from '@/engine/authoring';
import { coefTex, Fraction, pickDistractors, polyEval, polyTex, signed, signedSum, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ------------------------------------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------------------------------------

/** `x - 3`, `x + 2` or `x`: the linear factor with root `r`, without brackets. */
const lin = (r: number): string => (r === 0 ? 'x' : r > 0 ? `x - ${r}` : `x + ${-r}`);

/** `(x - 3)` or `x`, as written inside a product. */
const linP = (r: number): string => (r === 0 ? 'x' : `(${lin(r)})`);

/** `(x - 3)^{2}` or `x^{2}`; the plain factor when `k = 1`. */
const linPow = (r: number, k: number): string => {
  if (k === 1) return linP(r);
  return r === 0 ? `x^{${k}}` : `(${lin(r)})^{${k}}`;
};

/** Puts the root 0 (the factor `x`) first, keeping the order of the others. */
const zeroFirst = (roots: readonly number[]): number[] => [
  ...roots.filter((v) => v === 0),
  ...roots.filter((v) => v !== 0),
];

/** Product of linear factors with the factor `x` first: `x(x - 2)`, `(x - 1)(x + 3)`. */
const linProduct = (roots: readonly number[]): string => zeroFirst(roots).map((v) => linP(v)).join('');

/** `1` or `\frac{1}{n}`. */
const recip = (n: number): string => (n === 1 ? '1' : tex`\frac{1}{${n}}`);

/** An exact value as an option: `$-\frac{3}{2}$`. */
const val = (v: Fraction | number): string => `$${Fraction.of(v).toTex()}$`;

/**
 * The answer plus three wrong values: the mistake-based values first (in the given order),
 * then nearby values as a fallback. Every value different from the answer is definitely wrong.
 */
function valueOptions(
  correct: Fraction | number,
  wrong: ReadonlyArray<Fraction | number>,
): { answer: string; distractors: string[] } {
  const c = Fraction.of(correct);
  const answer = val(c);
  const near = [1, -1, 2, -2, 3, -3].map((k) => c.add(k));
  const pool = [...wrong.map((w) => Fraction.of(w)), ...near].filter((w) => !w.equals(c)).map((w) => val(w));
  return { answer, distractors: pickDistractors(answer, pool) };
}

/** One signed summand of an expression. */
interface Part {
  neg: boolean;
  body: string;
}

/** Joins summands with proper signs: `2 + \frac{3}{x - 1} - \frac{1}{x + 2}`. */
const joinParts = (parts: readonly Part[]): string =>
  parts.map((p, i) => (i === 0 ? (p.neg ? '-' : '') : p.neg ? ' - ' : ' + ') + p.body).join('');

/** An inline-math option made of summands. */
const opt = (parts: readonly Part[]): string => `$${joinParts(parts)}$`;

/** `k` times a denominator: `6(x - 3)`, `6x`, `6(x - 3)^{2}`, `6(3 - x)`. */
const times = (k: number, den: string): string => {
  if (k === 1) return den;
  return /^x(\^\{\d+\})?$/.test(den) || den.startsWith('(') ? `${k}${den}` : `${k}(${den})`;
};

/** The term `c / den` for a constant c; e.g. -1/6 over `x + 3` gives minus `\frac{1}{6(x + 3)}`. */
const over = (c: Fraction | number, den: string): Part => {
  const f = Fraction.of(c);
  return { neg: f.sign() < 0, body: tex`\frac{${Math.abs(f.n)}}{${times(f.d, den)}}` };
};

/** The term `(Bx + C) / den`; a negative leading coefficient is taken outside the fraction. */
const linearOver = (B: number, C: number, den: string): Part => {
  const neg = B < 0 || (B === 0 && C < 0);
  return { neg, body: tex`\frac{${polyTex(neg ? [-B, -C] : [B, C])}}{${den}}` };
};

/** A constant polynomial part. */
const constant = (k: number): Part => ({ neg: k < 0, body: String(Math.abs(k)) });

/** `[coefficient, root]` pairs of a sum of simple partial fractions c / (x - root). */
type Simple = ReadonlyArray<readonly [number, number]>;

const simpleParts = (terms: Simple): Part[] => terms.map(([c, root]) => over(c, lin(root)));

/** Order-independent key of `polynomial part + simple partial fractions` (equal key = equal function). */
const simpleKey = (poly: number, terms: Simple): string =>
  `${poly};${[...terms]
    .sort((p, q) => p[1] - q[1])
    .map(([c, root]) => `${root}:${c}`)
    .join('|')}`;

/** Keeps the candidates whose key differs from `exclude` and from every earlier candidate. */
function distinctBy<T>(items: readonly T[], key: (item: T) => string, exclude: string): T[] {
  const seen = new Set([exclude]);
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ------------------------------------------------------------------------------------------
// Exact partial-fraction solver (polynomials are integer arrays, lowest power first)
// ------------------------------------------------------------------------------------------

function pmul(p: readonly number[], q: readonly number[]): number[] {
  const out = new Array<number>(p.length + q.length - 1).fill(0);
  p.forEach((x, i) => {
    q.forEach((y, j) => {
      out[i + j] += x * y;
    });
  });
  return out;
}

function ppow(p: readonly number[], k: number): number[] {
  let out = [1];
  for (let i = 0; i < k; i++) out = pmul(out, p);
  return out;
}

/** An irreducible factor of a denominator raised to `power`. */
interface Block {
  /** Irreducible base, lowest power first: `[-a, 1]` or `[n, m, 1]`. */
  poly: number[];
  /** The base in LaTeX without brackets: `x - 2`, `x`, `x^{2} + 4`. */
  base: string;
  power: number;
}

const linBlock = (a: number, power = 1): Block => ({ poly: [-a, 1], base: lin(a), power });

const quadBlock = ([m, n]: readonly [number, number], power = 1): Block => ({
  poly: [n, m, 1],
  base: polyTex([1, m, n]),
  power,
});

const isQuad = (blk: Block): boolean => blk.poly.length === 3;

/** Degree of the product of the blocks. */
const degreeOf = (blocks: readonly Block[]): number =>
  blocks.reduce((s, blk) => s + (blk.poly.length - 1) * blk.power, 0);

/** Denominator of the term with the j-th power of a block: `x - 2`, `(x - 2)^{2}`, `x^{2}`. */
const powTex = (blk: Block, j: number): string => {
  if (j === 1) return blk.base;
  return blk.base === 'x' ? `x^{${j}}` : `(${blk.base})^{${j}}`;
};

/** The block as a factor of a product: `(x - 2)`, `x`, `(x^{2} + 4)^{2}`. */
const factorTex = (blk: Block): string =>
  blk.power > 1 ? powTex(blk, blk.power) : blk.base === 'x' ? 'x' : `(${blk.base})`;

/** Blocks with a bare `x` first (so products read `x(x - 1)^{2}`, not `(x - 1)^{2}x`). */
const xFirst = <T extends { base: string }>(items: readonly T[]): T[] => [
  ...items.filter((t) => t.base === 'x'),
  ...items.filter((t) => t.base !== 'x'),
];

/**
 * Exact partial-fraction numerators of N / D, where D is the product of pairwise coprime
 * blocks and deg N < deg D. For each block and each power j = 1..power it returns `[c]`
 * (linear base) or `[B, C]` meaning Bx + C (quadratic base). Found by matching coefficients.
 */
function decompose(numer: readonly number[], blocks: readonly Block[]): Fraction[][][] {
  const columns: number[][] = [];
  blocks.forEach((blk, i) => {
    const others = blocks.reduce<number[]>((acc, g, k) => (k === i ? acc : pmul(acc, ppow(g.poly, g.power))), [1]);
    for (let j = 1; j <= blk.power; j++) {
      const basis = pmul(others, ppow(blk.poly, blk.power - j));
      if (isQuad(blk)) columns.push(pmul(basis, [0, 1]));
      columns.push(basis);
    }
  });
  const size = columns.length;
  const rows = Array.from({ length: size }, (_, e) => [
    ...columns.map((col) => new Fraction(col[e] ?? 0)),
    new Fraction(numer[e] ?? 0),
  ]);
  for (let col = 0; col < size; col++) {
    const pivot = rows.findIndex((row, i) => i >= col && !row[col].isZero());
    if (pivot < 0) throw new Error('decompose: singular system');
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const pr = rows[col];
    for (let i = 0; i < size; i++) {
      const lead = rows[i][col];
      if (i === col || lead.isZero()) continue;
      const ratio = lead.div(pr[col]);
      rows[i] = rows[i].map((v, k) => v.sub(ratio.mul(pr[k])));
    }
  }
  const solution = rows.map((row, i) => row[size].div(row[i]));
  let next = 0;
  return blocks.map((blk) =>
    Array.from({ length: blk.power }, () => {
      const width = isQuad(blk) ? 2 : 1;
      const numerator = solution.slice(next, next + width);
      next += width;
      return numerator;
    }),
  );
}

/** Every single constant of the decomposition is non-zero. */
const allConstantsNonZero = (parts: Fraction[][][]): boolean =>
  parts.every((blk) => blk.every((numerator) => numerator.every((c) => !c.isZero())));

/** Every partial fraction (term) of the decomposition is non-zero. */
const allTermsNonZero = (parts: Fraction[][][]): boolean =>
  parts.every((blk) => blk.every((numerator) => numerator.some((c) => !c.isZero())));

/** A small numerator (lowest power first) of degree below `degD`. */
function smallNumerator(r: Rng, degD: number): number[] {
  const deg = r.int(0, Math.min(2, degD - 1));
  if (deg === 0) return [r.int(1, 9)];
  if (deg === 1) return [r.nonZero(-6, 6), r.pick([1, 1, 2, 3])];
  return [r.nonZero(-6, 6), r.int(-3, 3), 1];
}

const SAFE_NUMERATORS: number[][] = [[1], [1, 1], [-1, 1], [2, 1], [3, 1], [-2, 1], [1, 0, 1], [1, 1, 1], [5, 2]];

/** A small numerator for which `accept` holds (random tries, then a fixed safe list). */
function findNumerator(r: Rng, blocks: readonly Block[], accept: (parts: Fraction[][][]) => boolean): number[] {
  const degD = degreeOf(blocks);
  for (let attempt = 0; attempt < 30; attempt++) {
    const numer = smallNumerator(r, degD);
    if (accept(decompose(numer, blocks))) return numer;
  }
  const safe = SAFE_NUMERATORS.find((numer) => numer.length <= degD && accept(decompose(numer, blocks)));
  if (!safe) throw new Error('partial-fractions: no suitable numerator');
  return safe;
}

/** LaTeX of a polynomial stored lowest power first. */
const lowTex = (numer: readonly number[]): string => polyTex([...numer].reverse());

// ------------------------------------------------------------------------------------------
// Forms with letters A, B, C, ...
// ------------------------------------------------------------------------------------------

/** One term of an assumed form: a constant (`c`), linear (`lin`) or `Bx`-only (`x`) numerator. */
interface Slot {
  den: string;
  numer: 'c' | 'lin' | 'x';
}

const LETTERS = 'ABCDEFGH';

/** `\frac{A}{x - 1} + \frac{Bx + C}{x^{2} + 4}`, letters assigned left to right. */
function formTex(slots: readonly Slot[]): string {
  let k = 0;
  return slots
    .map(({ den, numer }) => {
      const top = numer === 'lin' ? `${LETTERS[k]}x + ${LETTERS[k + 1]}` : numer === 'x' ? `${LETTERS[k]}x` : LETTERS[k];
      k += numer === 'lin' ? 2 : 1;
      return tex`\frac{${top}}{${den}}`;
    })
    .join(' + ');
}

/** The standard form: a term for every power of every block, linear numerators over quadratics. */
const standardSlots = (blocks: readonly Block[]): Slot[] =>
  blocks.flatMap((blk) =>
    Array.from({ length: blk.power }, (_, i): Slot => ({ den: powTex(blk, i + 1), numer: isQuad(blk) ? 'lin' : 'c' })),
  );

/** How each block contributes to the form, for explanations. */
function blockRule(blk: Block): string {
  if (!isQuad(blk)) {
    if (blk.power === 1) return tex`$${blk.base}$ is a non-repeated linear factor: one term with a constant numerator`;
    const powers = Array.from({ length: blk.power }, (_, i) => `$${powTex(blk, i + 1)}$`);
    return tex`$${powTex(blk, blk.power)}$ is a repeated linear factor: terms over ${powers.join(', ')} with constant numerators`;
  }
  if (blk.power === 1) return tex`$${blk.base}$ is an irreducible quadratic: one term with a linear numerator`;
  return tex`$${powTex(blk, blk.power)}$ is a repeated irreducible quadratic: terms over $${blk.base}$ and $${powTex(blk, 2)}$, each with a linear numerator`;
}

// ------------------------------------------------------------------------------------------
// Data
// ------------------------------------------------------------------------------------------

/** Irreducible quadratics x^2 + mx + n as [m, n] (m^2 < 4n). */
const IRREDUCIBLE: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 9], [1, 1], [-1, 1], [1, 2], [2, 2], [-2, 2], [2, 5], [-2, 5],
];

/** Irreducible quadratics with small coefficients, used where powers of them appear. */
const SMALL_QUADS: ReadonlyArray<readonly [number, number]> = [[0, 1], [0, 2], [0, 4], [1, 1], [-1, 1]];

/** Root pairs (p < q) of a factorisable trinomial x^2 - (p + q)x + pq that is not x^2 - k^2. */
const TRINOMIAL_ROOTS: ReadonlyArray<readonly [number, number]> = [-4, -3, -2, -1, 1, 2, 3, 4].flatMap((p) =>
  [-4, -3, -2, -1, 1, 2, 3, 4].filter((q) => q > p && p + q !== 0).map((q) => [p, q] as const),
);

/** Root pairs for a quadratic denominator with a non-zero x-coefficient. */
const ROOT_PAIRS: ReadonlyArray<readonly [number, number]> = [-4, -3, -2, -1, 0, 1, 2, 3, 4].flatMap((p) =>
  [-4, -3, -2, -1, 0, 1, 2, 3, 4].filter((q) => q !== p && p + q !== 0).map((q) => [p, q] as const),
);

/** A displayed factor of a denominator together with its complete factorisation. */
interface Piece {
  tex: string;
  base: string;
  blocks: Block[];
  /** Number of partial fractions a student would count without factorising this piece further. */
  naive: number;
}

const PIECE = {
  lin: (a: number): Piece => ({ tex: linP(a), base: lin(a), blocks: [linBlock(a)], naive: 1 }),
  linPow: (a: number, k: number): Piece => ({ tex: linPow(a, k), base: lin(a), blocks: [linBlock(a, k)], naive: k }),
  quad: (q: readonly [number, number]): Piece => ({
    tex: `(${polyTex([1, q[0], q[1]])})`,
    base: polyTex([1, q[0], q[1]]),
    blocks: [quadBlock(q)],
    naive: 1,
  }),
  quadPow: (q: readonly [number, number]): Piece => ({
    tex: `(${polyTex([1, q[0], q[1]])})^{2}`,
    base: polyTex([1, q[0], q[1]]),
    blocks: [quadBlock(q, 2)],
    naive: 2,
  }),
  // The four "traps": they look like single (irreducible) factors but are not.
  diffSq: (k: number): Piece => ({ tex: `(x^{2} - ${k * k})`, base: '', blocks: [linBlock(k), linBlock(-k)], naive: 1 }),
  trinomial: ([p, q]: readonly [number, number]): Piece => ({
    tex: `(${polyTex([1, -(p + q), p * q])})`,
    base: '',
    blocks: [linBlock(p), linBlock(q)],
    naive: 1,
  }),
  perfectSq: (k: number): Piece => ({ tex: `(${polyTex([1, -2 * k, k * k])})`, base: '', blocks: [linBlock(k, 2)], naive: 1 }),
  cubic: (rr: number): Piece => ({
    tex: `(${polyTex([1, 0, 0, -(rr ** 3)])})`,
    base: '',
    blocks: [linBlock(rr), quadBlock([rr, rr * rr])],
    naive: 1,
  }),
};

function regularPiece(r: Rng): Piece {
  const kind = r.weighted(['lin', 'linPow', 'quad', 'quadPow'] as const, [3, 3, 2, 1]);
  const a = r.int(-3, 3);
  if (kind === 'lin') return PIECE.lin(a);
  if (kind === 'linPow') return PIECE.linPow(a, r.pick([2, 2, 3]));
  if (kind === 'quad') return PIECE.quad(r.pick(IRREDUCIBLE));
  return PIECE.quadPow(r.pick(SMALL_QUADS));
}

function trapPiece(r: Rng): Piece {
  const kind = r.pick(['diffSq', 'trinomial', 'perfectSq', 'cubic'] as const);
  if (kind === 'diffSq') return PIECE.diffSq(r.int(1, 4));
  if (kind === 'trinomial') return PIECE.trinomial(r.pick(TRINOMIAL_ROOTS));
  if (kind === 'perfectSq') return PIECE.perfectSq(r.nonZero(-3, 3));
  return PIECE.cubic(r.pick([1, -1, 2, -2]));
}

/**
 * A denominator of 2-3 pairwise coprime pieces, degree at most 6, one of which is a "trap"
 * that must be factorised further before counting.
 */
function countDenominator(r: Rng): Piece[] {
  for (let attempt = 0; attempt < 60; attempt++) {
    const size = r.chance(0.3) ? 3 : 2;
    const pieces: Piece[] = [trapPiece(r)];
    while (pieces.length < size) pieces.push(regularPiece(r));
    const blocks = pieces.flatMap((p) => p.blocks);
    const keys = new Set(blocks.map((blk) => blk.poly.join(',')));
    if (keys.size === blocks.length && degreeOf(blocks) <= 6) return pieces;
  }
  return [PIECE.diffSq(2), PIECE.linPow(1, 2)];
}

type FormShape = 'repeated-linear' | 'linear-quadratic' | 'repeated-linear-quadratic' | 'repeated-quadratic';

/** "The partial fractions of ... are of the form" for a denominator of the given shape. */
function assumedForm(r: Rng, shape: FormShape): AuthoredQuestion {
  const [ra, rb] = r.sample([-3, -2, -1, 0, 1, 2, 3], 2) as [number, number];
  const cs = (den: string): Slot => ({ den, numer: 'c' });
  const ls = (den: string): Slot => ({ den, numer: 'lin' });
  let blocks: Block[];
  let wrong: Slot[][];
  if (shape === 'repeated-linear') {
    const rep = linBlock(ra, 2);
    const single = linBlock(rb);
    blocks = xFirst([rep, single]);
    wrong = [
      [cs(powTex(rep, 1)), cs(single.base)], // repeated factor treated as a single factor
      [cs(powTex(rep, 2)), cs(single.base)], // lower power left out
      [cs(powTex(rep, 1)), cs(powTex(rep, 2)), cs(powTex(single, 2))], // squared the wrong factor
    ];
  } else if (shape === 'linear-quadratic') {
    const q = r.pick(IRREDUCIBLE);
    const L = linBlock(ra);
    const Qb = quadBlock(q);
    const k = q[0] === 0 ? Math.sqrt(q[1]) : 0;
    const factorSlip = Number.isInteger(k) && k > 0 && Math.abs(ra) !== k;
    blocks = [L, Qb];
    wrong = [
      [cs(L.base), cs(Qb.base)], // constant numerator over the quadratic factor
      [ls(L.base), cs(Qb.base)], // numerators interchanged
      factorSlip
        ? [cs(L.base), cs(lin(k)), cs(lin(-k))] // x^2 + k^2 "factorised" as (x - k)(x + k)
        : [cs(L.base), { den: Qb.base, numer: 'x' }], // constant term of the numerator left out
    ];
  } else if (shape === 'repeated-linear-quadratic') {
    const rep = linBlock(ra, 2);
    const Qb = quadBlock(r.pick(SMALL_QUADS));
    blocks = [rep, Qb];
    wrong = r.sample(
      [
        [cs(powTex(rep, 2)), ls(Qb.base)], // lower power left out
        [cs(powTex(rep, 1)), cs(powTex(rep, 2)), cs(Qb.base)], // constant numerator over the quadratic
        [cs(powTex(rep, 1)), ls(Qb.base)], // repeated factor treated as a single factor
        [cs(powTex(rep, 2)), cs(Qb.base)], // both slips
      ],
      3,
    );
  } else {
    // With deg N <= 2, matching x^4 and x^3 forces C = -A(m + a), so the root must avoid a = -m.
    const q = r.pick(SMALL_QUADS);
    const L = linBlock(r.pick([-3, -2, -1, 0, 1, 2, 3].filter((v) => v + q[0] !== 0)));
    const rep = quadBlock(q, 2);
    blocks = [L, rep];
    wrong = r.sample(
      [
        [cs(L.base), ls(powTex(rep, 2))], // lower power left out
        [cs(L.base), cs(powTex(rep, 1)), cs(powTex(rep, 2))], // constant numerators
        [cs(L.base), ls(powTex(rep, 1))], // repeated quadratic treated as a single factor
        [cs(L.base), cs(powTex(rep, 1)), ls(powTex(rep, 2))], // constant numerator over the lower power
      ],
      3,
    );
  }
  const numer = findNumerator(r, blocks, allConstantsNonZero);
  const answer = `$${formTex(standardSlots(blocks))}$`;
  const distractors = pickDistractors(
    answer,
    wrong.map((slots) => `$${formTex(slots)}$`),
  );
  return {
    stem: tex`The partial fractions of $\frac{${lowTex(numer)}}{${blocks.map(factorTex).join('')}}$ are of the form:`,
    answer,
    distractors,
    explanation: `${blocks.map(blockRule).join('; ')}. Every constant turns out non-zero for this fraction, so no term can be left out. The form is ${answer}.`,
  };
}

// ------------------------------------------------------------------------------------------
// The chapter
// ------------------------------------------------------------------------------------------

export default defineBank('mathematics', 'partial-fractions', (b) => [
  // ---------------------------------------------------------------- linear factors
  b.dynamic('linear-factor-constant', { difficulty: 1, origin: 'past-paper', tags: ['linear factors'] }, (r) => {
    if (r.chance(0.3)) {
      // Three distinct linear factors: one substitution gives each constant.
      const [ra, rb, rc] = zeroFirst(r.sample([-3, -2, -1, 0, 1, 2, 3], 3)) as [number, number, number];
      const consts = r.sample([-3, -2, -1, 1, 2, 3], 3);
      const [A, B, C] = consts as [number, number, number];
      // N = A(x - rb)(x - rc) + B(x - ra)(x - rc) + C(x - ra)(x - rb)
      const N = [
        A + B + C,
        -(A * (rb + rc) + B * (ra + rc) + C * (ra + rb)),
        A * rb * rc + B * ra * rc + C * ra * rb,
      ];
      const k = r.int(0, 2);
      const letter = 'ABC'.charAt(k);
      const roots = [ra, rb, rc];
      const rt = roots[k];
      const [o1, o2] = roots.filter((_, i) => i !== k) as [number, number];
      const value = consts[k];
      const Nt = polyEval(N, rt);
      const { answer, distractors } = valueOptions(
        value,
        r.shuffle([
          ...consts.filter((_, i) => i !== k), // the value of another constant
          -value, // sign slip
          new Fraction(Nt, rt - o1), // divided by one factor only
          Nt, // forgot to divide
        ]),
      );
      return {
        stem: tex`If $\frac{${polyTex(N)}}{${linP(ra)}${linP(rb)}${linP(rc)}} = \frac{A}{${lin(ra)}} + \frac{B}{${lin(rb)}} + \frac{C}{${lin(rc)}}$, then $${letter}$ is equal to:`,
        answer,
        distractors,
        explanation: tex`Write $${polyTex(N)} \equiv A${linP(rb)}${linP(rc)} + B${linP(ra)}${linP(rc)} + C${linP(ra)}${linP(rb)}$. Putting $x = ${rt}$ makes the other two terms zero: $${Nt} = ${coefTex((rt - o1) * (rt - o2), letter)}$, so $${letter} = ${value}$.`,
      };
    }

    const [ra, rb] = zeroFirst(r.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], 2)) as [number, number];
    const A = r.nonZero(-6, 6);
    const B = r.intExcept(-6, 6, [0, A]);
    const N = [A + B, -(A * rb + B * ra)];
    const Na = polyEval(N, ra);
    const Nb = polyEval(N, rb);
    const mode = r.weighted(['A', 'B', 'A + B'] as const, [2, 2, 1]);
    const identity = tex`Write $${polyTex(N)} \equiv A${linP(rb)} + B${linP(ra)}$.`;
    // Substituting x = -root instead of x = root is a common slip with factors like (x + 3).
    const wrongRoot = (root: number, other: number): Fraction[] =>
      root !== 0 && root + other !== 0 ? [new Fraction(polyEval(N, -root), -root - other)] : [];
    let value: number;
    let wrong: Array<number | Fraction>;
    let work: string;
    if (mode === 'A') {
      value = A;
      wrong = [B, -A, Na, ...wrongRoot(ra, rb)];
      work = tex`Putting $x = ${ra}$: $${Na} = ${coefTex(ra - rb, 'A')}$, so $A = ${A}$.`;
    } else if (mode === 'B') {
      value = B;
      wrong = [A, -B, Nb, ...wrongRoot(rb, ra)];
      work = tex`Putting $x = ${rb}$: $${Nb} = ${coefTex(rb - ra, 'B')}$, so $B = ${B}$.`;
    } else {
      value = A + B;
      wrong = [A - B, B - A, -(A + B)];
      work = tex`Putting $x = ${ra}$ gives $A = ${A}$ and putting $x = ${rb}$ gives $B = ${B}$, so $A + B = ${A + B}$ (the coefficient of $x$ in the numerator).`;
    }
    const { answer, distractors } = valueOptions(value, r.shuffle(wrong));
    return {
      stem: tex`If $\frac{${polyTex(N)}}{${linP(ra)}${linP(rb)}} = \frac{A}{${lin(ra)}} + \frac{B}{${lin(rb)}}$, then $${mode}$ is equal to:`,
      answer,
      distractors,
      explanation: `${identity} ${work}`,
    };
  }),

  b.dynamic('difference-of-squares', { difficulty: 1, origin: 'past-paper', tags: ['linear factors'] }, (r) => {
    type Pair = readonly [Fraction | number, Fraction | number];
    const kind = r.pick(['unit', 'reversed', 'x-over', 'scaled'] as const);
    const a = kind === 'scaled' ? r.int(1, 6) : r.int(1, 9);
    const m = r.int(1, 3);
    const sq = a * a;
    const h = new Fraction(1, 2 * a); // 1/(2a)
    const half = new Fraction(1, 2);
    const inv = new Fraction(1, a);
    const dens: readonly [string, string] = kind === 'reversed' ? [`${a} - x`, `${a} + x`] : [lin(a), lin(-a)];
    const factorised = kind === 'reversed' ? `(${a} - x)(${a} + x)` : `(x - ${a})(x + ${a})`;

    let fraction: string;
    let correct: Pair;
    let wrong: Pair[];
    let work: string;
    if (kind === 'unit') {
      fraction = tex`\frac{1}{x^{2} - ${sq}}`;
      correct = [h, h.neg()];
      wrong = [[h.neg(), h], [inv, inv.neg()], [h, h], [half, half.neg()]];
      work = tex`From $1 = A(x + ${a}) + B(x - ${a})$: putting $x = ${a}$ gives $A = \frac{1}{${2 * a}}$, and putting $x = -${a}$ gives $B = -\frac{1}{${2 * a}}$.`;
    } else if (kind === 'reversed') {
      fraction = tex`\frac{1}{${sq} - x^{2}}`;
      correct = [h, h];
      wrong = [[h, h.neg()], [inv, inv], [h.neg(), h], [half, half]];
      work = tex`From $1 = A(${a} + x) + B(${a} - x)$: putting $x = ${a}$ gives $A = \frac{1}{${2 * a}}$, and putting $x = -${a}$ gives $B = \frac{1}{${2 * a}}$.`;
    } else if (kind === 'x-over') {
      fraction = tex`\frac{x}{x^{2} - ${sq}}`;
      correct = [half, half];
      wrong = [[half, half.neg()], [h, h.neg()], [1, 1], [half.neg(), half.neg()], [half.mul(a), half.mul(a)]];
      work = tex`From $x = A(x + ${a}) + B(x - ${a})$: putting $x = ${a}$ gives $${a} = ${2 * a}A$, so $A = \frac{1}{2}$; putting $x = -${a}$ gives $-${a} = -${2 * a}B$, so $B = \frac{1}{2}$.`;
    } else {
      const k = 2 * a * m;
      fraction = tex`\frac{${k}}{x^{2} - ${sq}}`;
      correct = [m, -m];
      wrong = [[-m, m], [m, m], [2 * m, -2 * m], [a * m, -a * m], [k, -k]];
      work = tex`From $${k} = A(x + ${a}) + B(x - ${a})$: putting $x = ${a}$ gives $A = \frac{${k}}{${2 * a}} = ${m}$, and putting $x = -${a}$ gives $B = -${m}$.`;
    }
    const key = ([c1, c2]: Pair): string => `${Fraction.of(c1).toString()}|${Fraction.of(c2).toString()}`;
    const show = ([c1, c2]: Pair): string => opt([over(c1, dens[0]), over(c2, dens[1])]);
    const answer = show(correct);
    const distractors = pickDistractors(answer, distinctBy(r.shuffle(wrong), key, key(correct)).map(show));
    const denominator = kind === 'reversed' ? `${sq} - x^{2}` : `x^{2} - ${sq}`;
    return {
      stem: tex`The partial fractions of $${fraction}$ are:`,
      answer,
      distractors,
      explanation: tex`$${denominator} = ${factorised}$. ${work} Hence $${fraction} = ${answer.slice(1, -1)}$.`,
    };
  }),

  b.dynamic('linear-factors-decomposition', { difficulty: 2, tags: ['linear factors'] }, (r) => {
    const [ra, rb] = r.sample([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], 2) as [number, number];
    const A = r.nonZero(-5, 5);
    const B = r.intExcept(-5, 5, [0, A]);
    const N = [A + B, -(A * rb + B * ra)];
    const D = [1, -(ra + rb), ra * rb];
    const correct: Simple = [
      [A, ra],
      [B, rb],
    ];
    const slips: Simple[] = [
      ...r.shuffle<Simple>([
        [[B, ra], [A, rb]], // constants attached to the wrong factors
        [[A, -ra], [B, -rb]], // sign slip when factorising the denominator
        [[-A, ra], [-B, rb]], // sign slip in both substitutions
      ]),
      ...r.shuffle<Simple>([
        [[A, ra], [-B, rb]],
        [[-A, ra], [B, rb]],
      ]),
    ];
    const key = (s: Simple): string => simpleKey(0, s);
    const answer = opt(simpleParts(correct));
    const distractors = pickDistractors(
      answer,
      distinctBy(slips, key, key(correct)).map((s) => opt(simpleParts(s))),
    );
    return {
      stem: tex`The partial fractions of $\frac{${polyTex(N)}}{${polyTex(D)}}$ are:`,
      answer,
      distractors,
      explanation: tex`$${polyTex(D)} = ${linProduct([ra, rb])}$. Write $${polyTex(N)} \equiv A${linP(rb)} + B${linP(ra)}$. Putting $x = ${ra}$: $${polyEval(N, ra)} = ${coefTex(ra - rb, 'A')}$, so $A = ${A}$. Putting $x = ${rb}$: $${polyEval(N, rb)} = ${coefTex(rb - ra, 'B')}$, so $B = ${B}$. Hence the partial fractions are ${answer}.`,
    };
  }),

  b.dynamic('telescoping-sum', { difficulty: 3, origin: 'past-paper', tags: ['linear factors'] }, (r) => {
    const d = r.pick([1, 1, 2, 2, 3]);
    const a = r.pick(d === 1 ? [1, 1, 2, 3] : [1, 1, 2]);
    const n = r.int(5, Math.min(Math.floor((100 - a) / d), d === 1 ? 99 : 40)); // number of terms
    const L = a + n * d; // second factor of the last term
    const sumTo = (last: number): Fraction => new Fraction(1, a).sub(new Fraction(1, last)).div(d);
    const S = sumTo(L);
    const term = (u: number): string => tex`\frac{1}{${u} \cdot ${u + d}}`;
    const series = tex`${term(a)} + ${term(a + d)} + ${term(a + 2 * d)} + \cdots + ${term(L - d)}`;
    const { answer, distractors } = valueOptions(S, [
      ...(d > 1 ? [S.mul(d)] : []), // forgot the factor 1/d
      sumTo(L - d), // stopped at the first factor of the last term
      sumTo(L + d), // one term too many
      new Fraction(n, n + 1), // the formula n/(n + 1) used blindly
      new Fraction(n, L), // forgot the factor 1/a
      S.mul(2),
      S.div(2),
    ]);
    const split =
      d === 1
        ? tex`\frac{1}{k(k + 1)} = \frac{1}{k} - \frac{1}{k + 1}`
        : tex`\frac{1}{k(k + ${d})} = \frac{1}{${d}}\left(\frac{1}{k} - \frac{1}{k + ${d}}\right)`;
    const total =
      d === 1
        ? tex`${recip(a)} - \frac{1}{${L}}`
        : tex`\frac{1}{${d}}\left(${recip(a)} - \frac{1}{${L}}\right)`;
    return {
      stem: tex`The sum $${series}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`By partial fractions, $${split}$. Writing every term this way, all the middle fractions cancel, leaving $${total} = ${S.toTex()}$.`,
    };
  }),

  // ---------------------------------------------------------------- repeated factors
  b.dynamic('repeated-factor-constant', { difficulty: 2, origin: 'past-paper', tags: ['repeated factors'] }, (r) => {
    const [ra, rb] = r.sample([-4, -3, -2, -1, 0, 1, 2, 3, 4], 2) as [number, number];
    const [A, B, C] = r.sample([-4, -3, -2, -1, 1, 2, 3, 4], 3) as [number, number, number];
    // N = A(x - ra)(x - rb) + B(x - rb) + C(x - ra)^2
    const N = [A + C, -A * (ra + rb) + B - 2 * ra * C, A * ra * rb - B * rb + C * ra * ra];
    const den = xFirst([
      { base: lin(ra), tex: linPow(ra, 2) },
      { base: lin(rb), tex: linP(rb) },
    ])
      .map((f) => f.tex)
      .join('');
    const Na = polyEval(N, ra); // = B(ra - rb)
    const Nb = polyEval(N, rb); // = C(rb - ra)^2
    const sq = (rb - ra) ** 2;
    const ask = r.weighted(['A', 'B', 'C'] as const, [3, 4, 4]);
    const identity = tex`Write $${polyTex(N)} \equiv A${linProduct([ra, rb])} + B${linP(rb)} + C${linPow(ra, 2)}$.`;
    const findC = tex`Putting $x = ${rb}$: $${Nb} = ${coefTex(sq, 'C')}$, so $C = ${C}$.`;
    let value: number;
    let wrong: Array<number | Fraction>;
    let work: string;
    if (ask === 'B') {
      value = B;
      wrong = [A, C, -B, Na, new Fraction(Na, (ra - rb) ** 2)];
      work = tex`Putting $x = ${ra}$ removes the $A$ and $C$ terms: $${Na} = ${coefTex(ra - rb, 'B')}$, so $B = ${B}$.`;
    } else if (ask === 'C') {
      value = C;
      wrong = [A, B, -C, new Fraction(Nb, rb - ra), Nb];
      work = findC;
    } else {
      value = A;
      wrong = [B, C, A + C, -A, A + 2 * C];
      work = tex`${findC} Comparing coefficients of $x^{2}$: $A + C = ${A + C}$, so $A = ${A}$.`;
    }
    const { answer, distractors } = valueOptions(value, r.shuffle(wrong));
    return {
      stem: tex`If $\frac{${polyTex(N)}}{${den}} = \frac{A}{${lin(ra)}} + \frac{B}{${linPow(ra, 2)}} + \frac{C}{${lin(rb)}}$, then the value of $${ask}$ is:`,
      answer,
      distractors,
      explanation: `${identity} ${work}`,
    };
  }),

  b.dynamic('repeated-linear-split', { difficulty: 1, tags: ['repeated factors'] }, (r) => {
    // (px + q)/(x - a)^2 = p/(x - a) + (pa + q)/(x - a)^2
    type Pair = readonly [number, number];
    const a = r.nonZero(-4, 4);
    const p = r.pick([1, 1, 2, 3, -1, -2]);
    const q = r.intExcept(-6, 6, [-p * a]); // pa + q = 0 would cancel the fraction to p/(x - a)
    const K = p * a + q;
    const sq = linPow(a, 2);
    const show = ([c1, c2]: Pair): string => opt([over(c1, lin(a)), over(c2, sq)]);
    const key = ([c1, c2]: Pair): string => `${c1}|${c2}`;
    const fallback: Pair[] = [
      [p, -K],
      [-p, K],
      [-p, -K],
      [K, -p],
    ];
    const slips: Pair[] = [
      ...r.shuffle<Pair>([
        [p, q], // split the numerator without rewriting it in terms of (x - a)
        [p, q - p * a], // wrote x = (x - a) - a
        [K, p], // constants attached to the wrong powers
      ]),
      ...fallback,
    ].filter(([c1, c2]) => c1 !== 0 && c2 !== 0);
    const correct: Pair = [p, K];
    const answer = show(correct);
    const distractors = pickDistractors(answer, distinctBy(slips, key, key(correct)).map(show));
    const N = polyTex([p, q]);
    return {
      stem: tex`The partial fractions of $\frac{${N}}{${sq}}$ are:`,
      answer,
      distractors,
      explanation: tex`Write $${N} = ${coefTex(p, `(${lin(a)})`)}${signed(K)}$ and divide by $${sq}$: $\frac{${N}}{${sq}} = ${answer.slice(1, -1)}$. (Equivalently, $\frac{${N}}{${sq}} = \frac{A}{${lin(a)}} + \frac{B}{${sq}}$ gives $${N} \equiv A(${lin(a)}) + B$; comparing coefficients of $x$ gives $A = ${p}$, and putting $x = ${a}$ gives $B = ${K}$.)`,
    };
  }),

  // ---------------------------------------------------------------- quadratic factors
  b.dynamic('quadratic-factor-constant', { difficulty: 2, tags: ['quadratic factors'] }, (r) => {
    const [m, n] = r.pick(IRREDUCIBLE);
    const a = r.int(-3, 3);
    const [A, B, C] = r.sample([-4, -3, -2, -1, 1, 2, 3, 4], 3) as [number, number, number];
    // N = A(x^2 + mx + n) + (Bx + C)(x - a)
    const N = [A + B, A * m + C - a * B, A * n - a * C];
    const Q = polyTex([1, m, n]);
    const Qa = a * a + m * a + n; // > 0 because the quadratic is irreducible
    const Na = polyEval(N, a); // = A * Qa
    const ask = r.pick(['A', 'B', 'C'] as const);
    const findA = tex`Putting $x = ${a}$: $${Na} = ${coefTex(Qa, 'A')}$, so $A = ${A}$.`;
    let value: number;
    let wrong: Array<number | Fraction>;
    let work: string;
    if (ask === 'A') {
      value = A;
      wrong = [B, C, -A, Na];
      work = findA;
    } else if (ask === 'B') {
      value = B;
      wrong = [A, C, -B, A + B, 2 * A + B];
      work = tex`${findA} Comparing coefficients of $x^{2}$: $A + B = ${A + B}$, so $B = ${B}$.`;
    } else if (a !== 0) {
      value = C;
      wrong = [A, B, -C, new Fraction(N[2], -a)];
      work = tex`${findA} Putting $x = 0$: $${N[2]} = ${signedSum([
        [A * n, ''],
        [-a, 'C'],
      ])}$, so $C = ${C}$.`;
    } else {
      value = C;
      wrong = [A, B, -C, N[1]];
      work = tex`${findA} Comparing coefficients of $x$: $${N[1]} = ${signedSum([
        [A * m, ''],
        [1, 'C'],
      ])}$, so $C = ${C}$.`;
    }
    const { answer, distractors } = valueOptions(value, r.shuffle(wrong));
    return {
      stem: tex`If $\frac{${polyTex(N)}}{${linP(a)}(${Q})} = \frac{A}{${lin(a)}} + \frac{Bx + C}{${Q}}$, then $${ask}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Write $${polyTex(N)} \equiv A(${Q}) + (Bx + C)${linP(a)}$. ${work}`,
    };
  }),

  b.dynamic('cubic-denominator', { difficulty: 3, tags: ['quadratic factors'] }, (r) => {
    const c = r.pick([1, 1, 2]);
    const rr = r.pick([c, -c]); // root of the linear factor: D = x^3 - rr^3
    const D = polyTex([1, 0, 0, -(rr ** 3)]);
    const Q = polyTex([1, rr, rr * rr]); // x^3 - rr^3 = (x - rr)(x^2 + rr x + rr^2)
    const Qwrong = polyTex([1, -rr, rr * rr]); // the usual sign slip in the quadratic factor
    const A = r.nonZero(-3, 3);
    const B = r.nonZero(-3, 3);
    const C = r.nonZero(-4, 4);
    // N = A(x^2 + rr x + rr^2) + (Bx + C)(x - rr)
    const N = [A + B, A * rr + C - rr * B, A * rr * rr - rr * C];
    interface Dec {
      A: number;
      B: number;
      C: number;
      q: string;
    }
    const show = (s: Dec): string => opt([over(s.A, lin(rr)), linearOver(s.B, s.C, s.q)]);
    const key = (s: Dec): string => `${s.A},${s.B},${s.C},${s.q}`;
    const correct: Dec = { A, B, C, q: Q };
    const slips: Dec[] = [
      ...r.shuffle<Dec>([
        { A, B: -B, C: -C, q: Q }, // sign slip in the quadratic part
        { A, B: 0, C, q: Q }, // constant numerator over the quadratic factor
        { A, B, C, q: Qwrong }, // wrong factorisation of the cubic
      ]),
      ...r.shuffle<Dec>([
        { A: -A, B, C, q: Q },
        { A, B, C: -C, q: Q },
        { A, B: -B, C, q: Q },
      ]),
    ];
    const answer = show(correct);
    const distractors = pickDistractors(answer, distinctBy(slips, key, key(correct)).map(show));
    return {
      stem: tex`The partial fractions of $\frac{${polyTex(N)}}{${D}}$ are:`,
      answer,
      distractors,
      explanation: tex`$${D} = ${linP(rr)}(${Q})$, and $${Q}$ is irreducible. Write $${polyTex(N)} \equiv A(${Q}) + (Bx + C)${linP(rr)}$. Putting $x = ${rr}$: $${polyEval(N, rr)} = ${coefTex(3 * rr * rr, 'A')}$, so $A = ${A}$. Comparing coefficients of $x^{2}$: $A + B = ${A + B}$, so $B = ${B}$. Putting $x = 0$: $${N[2]} = ${signedSum([
        [A * rr * rr, ''],
        [-rr, 'C'],
      ])}$, so $C = ${C}$. Hence the partial fractions are ${answer}.`,
    };
  }),

  // ---------------------------------------------------------------- forms and counts
  // One rule (d1) and two rules combined (d2).
  b.dynamic('assumed-form-basic', { difficulty: 1, tags: ['repeated factors', 'quadratic factors'] }, (r) =>
    assumedForm(r, r.pick(['repeated-linear', 'linear-quadratic'] as const)),
  ),

  b.dynamic('assumed-form', { difficulty: 2, tags: ['repeated factors', 'quadratic factors'] }, (r) =>
    assumedForm(r, r.pick(['repeated-linear-quadratic', 'repeated-quadratic'] as const)),
  ),

  b.dynamic(
    'number-of-partial-fractions',
    { difficulty: 3, tags: ['repeated factors', 'quadratic factors'] },
    (r) => {
      const pieces = xFirst(countDenominator(r));
      const blocks = xFirst(pieces.flatMap((p) => p.blocks));
      const numer = findNumerator(r, blocks, allTermsNonZero);
      const D = pieces.map((p) => p.tex).join('');
      const full = blocks.map(factorTex).join('');
      const terms = blocks.reduce((s, blk) => s + blk.power, 0);
      const constants = degreeOf(blocks);
      const naive = pieces.reduce((s, p) => s + p.naive, 0);
      const askTerms = r.chance(0.7);
      const value = askTerms ? terms : constants;
      const wrong = askTerms
        ? [naive, constants, pieces.length]
        : [terms, blocks.reduce((s, blk) => s + blk.poly.length - 1, 0), pieces.length];
      const pool = [...wrong, value + 1, value - 1, value + 2, value + 3].filter((v) => v >= 1 && v !== value);
      const answer = `$${value}$`;
      const distractors = pickDistractors(
        answer,
        pool.map((v) => `$${v}$`),
      );
      const fraction = tex`\frac{${lowTex(numer)}}{${D}}`;
      const factorStep = tex`Factorising completely, $${D} = ${full}$.`;
      return {
        stem: askTerms
          ? tex`When $${fraction}$ is resolved into partial fractions, the number of partial fractions obtained is:`
          : tex`To resolve $${fraction}$ into partial fractions, the number of unknown constants ($A, B, C, \dots$) to be found is:`,
        answer,
        distractors,
        explanation: tex`${factorStep} The partial fractions have the form $${formTex(standardSlots(blocks))}$: ${terms} fractions containing ${constants} unknown constants (a quadratic factor carries a linear numerator, and each power of a repeated factor gets its own term).`,
      };
    },
  ),

  // ---------------------------------------------------------------- improper fractions
  b.dynamic('improper-fraction', { difficulty: 2, origin: 'past-paper', tags: ['improper fractions'] }, (r) => {
    if (r.chance(0.6)) {
      // (quadratic) / (quadratic) = p + A/(x - a) + B/(x - b)
      const [ra, rb] = r.sample([-4, -3, -2, -1, 0, 1, 2, 3, 4], 2) as [number, number];
      const p = r.pick([1, 1, 2, 3]);
      const A = r.nonZero(-5, 5);
      const B = r.intExcept(-5, 5, [0, A]);
      const N = [p, A + B - p * (ra + rb), p * ra * rb - A * rb - B * ra];
      const factored = r.chance(0.6);
      const Dexp = polyTex([1, -(ra + rb), ra * rb]);
      const Dtex = factored ? linProduct([ra, rb]) : Dexp;
      interface Split {
        k: number;
        terms: Simple;
      }
      const show = (s: Split): string => opt([...(s.k ? [constant(s.k)] : []), ...simpleParts(s.terms)]);
      const key = (s: Split): string => simpleKey(s.k, s.terms);
      const correct: Split = { k: p, terms: [[A, ra], [B, rb]] };
      const slips: Split[] = [
        ...r.shuffle<Split>([
          { k: 0, terms: [[A, ra], [B, rb]] }, // treated as a proper fraction
          { k: p, terms: [[B, ra], [A, rb]] }, // constants attached to the wrong factors
          { k: p, terms: [[-A, ra], [-B, rb]] }, // sign slips in the substitutions
        ]),
        { k: 0, terms: [[B, ra], [A, rb]] },
        { k: p, terms: [[A, ra], [-B, rb]] },
        { k: p, terms: [[-A, ra], [B, rb]] },
      ];
      const answer = show(correct);
      const distractors = pickDistractors(answer, distinctBy(slips, key, key(correct)).map(show));
      const Na = polyEval(N, ra);
      const Nb = polyEval(N, rb);
      const write = factored ? 'Write' : tex`Since $${Dexp} = ${linProduct([ra, rb])}$, write`;
      return {
        stem: tex`Resolved into partial fractions, $\frac{${polyTex(N)}}{${Dtex}}$ is equal to:`,
        answer,
        distractors,
        explanation: tex`The numerator and denominator both have degree 2, so the fraction is improper: dividing first gives the quotient $${p}$. ${write} $${polyTex(N)} \equiv ${p === 1 ? '' : p}${linProduct([ra, rb])} + A${linP(rb)} + B${linP(ra)}$. Putting $x = ${ra}$: $${Na} = ${coefTex(ra - rb, 'A')}$, so $A = ${A}$; putting $x = ${rb}$: $${Nb} = ${coefTex(rb - ra, 'B')}$, so $B = ${B}$. Hence the result is ${answer}.`,
      };
    }

    // (cubic) / (quadratic): only the polynomial part is asked.
    const [ra, rb] = r.pick(ROOT_PAIRS);
    const s = -(ra + rb);
    const t = ra * rb;
    const c = r.int(-5, 5);
    let u = 0;
    let v = 1;
    for (let attempt = 0; attempt < 20; attempt++) {
      const u1 = r.int(-4, 4);
      const v1 = r.int(-6, 6);
      // a non-zero remainder that does not cancel with either factor of the denominator
      if (u1 * ra + v1 !== 0 && u1 * rb + v1 !== 0) {
        u = u1;
        v = v1;
        break;
      }
    }
    // N = (x + c)(x^2 + s x + t) + (u x + v)
    const N = [1, s + c, t + c * s + u, c * t + v];
    const D = polyTex([1, s, t]);
    const quotient = (k: number): string => `$${polyTex([1, k])}$`;
    const answer = quotient(c);
    const distractors = pickDistractors(
      answer,
      [
        ...r.shuffle([
          c + 2 * s, // added instead of subtracted in the second step of the division
          c + s, // divided the leading terms only
          0, // stopped after the first step
          -c,
        ]),
        c + 1,
        c - 1,
        c + 2,
      ].map(quotient),
    );
    // The remainder u x + v, written with its sign outside: `+ (2x + 1)`, `- (x + 1)`, `+ 6`.
    const remNeg = u < 0 || (u === 0 && v < 0);
    const R = polyTex(remNeg ? [-u, -v] : [u, v]);
    const sign = remNeg ? '-' : '+';
    const remTerm = u !== 0 && v !== 0 ? `(${R})` : R;
    return {
      stem: tex`When the improper fraction $\frac{${polyTex(N)}}{${D}}$ is written as a polynomial plus a proper fraction, the polynomial part is:`,
      answer,
      distractors,
      explanation: tex`Long division gives $${polyTex(N)} = ${c === 0 ? 'x' : `(${polyTex([1, c])})`}(${D}) ${sign} ${remTerm}$, so $\frac{${polyTex(N)}}{${D}} = ${polyTex([1, c])} ${sign} \frac{${R}}{${D}}$. The polynomial part is ${answer}.`,
    };
  }),

  // ---------------------------------------------------------------- fixed questions
  ...b.mcqs([
    {
      id: 'cover-up-rule',
      d: 1,
      t: ['linear factors'],
      q: tex`If $\frac{f(x)}{(x - a)\,g(x)} = \frac{A}{x - a} + \frac{h(x)}{g(x)}$ is an identity and $g(a) \neq 0$, then $A$ is equal to:`,
      a: tex`$\frac{f(a)}{g(a)}$`,
      x: [tex`$\frac{g(a)}{f(a)}$`, tex`$f(a)\,g(a)$`, tex`$\frac{f(0)}{g(0)}$`],
      e: tex`Multiply both sides by $(x - a)$: $\frac{f(x)}{g(x)} = A + \frac{(x - a)\,h(x)}{g(x)}$. Putting $x = a$ makes the last term zero, so $A = \frac{f(a)}{g(a)}$ (the cover-up rule).`,
    },
    {
      id: 'linear-times-quadratic',
      d: 2,
      t: ['quadratic factors'],
      q: tex`The partial fractions of $\frac{4}{x(x^{2} + 4)}$ are:`,
      a: tex`$\frac{1}{x} - \frac{x}{x^{2} + 4}$`,
      x: [tex`$\frac{1}{x} + \frac{x}{x^{2} + 4}$`, tex`$\frac{4}{x} - \frac{4x}{x^{2} + 4}$`, tex`$\frac{1}{x} - \frac{1}{x^{2} + 4}$`],
      e: tex`Let $\frac{4}{x(x^{2} + 4)} = \frac{A}{x} + \frac{Bx + C}{x^{2} + 4}$, so $4 = A(x^{2} + 4) + (Bx + C)x$. Putting $x = 0$ gives $A = 1$. Comparing coefficients of $x^{2}$: $A + B = 0$, so $B = -1$; comparing coefficients of $x$: $C = 0$. Hence $\frac{1}{x} - \frac{x}{x^{2} + 4}$.`,
    },
    {
      id: 'irreducible-quadratic-denominator',
      d: 2,
      t: ['quadratic factors'],
      q: tex`Which of the following proper fractions **cannot** be split into simpler partial fractions with real coefficients?`,
      a: tex`$\frac{2x + 3}{x^{2} + x + 1}$`,
      x: [tex`$\frac{2x + 3}{x^{2} + x - 2}$`, tex`$\frac{2x + 3}{x^{2} - 9}$`, tex`$\frac{2x + 3}{x^{2} + 2x + 1}$`],
      e: tex`The discriminant of $x^{2} + x + 1$ is $1 - 4 = -3 < 0$, so it is an irreducible quadratic and $\frac{2x + 3}{x^{2} + x + 1}$ is already a partial fraction. The other denominators factorise: $x^{2} + x - 2 = (x + 2)(x - 1)$, $x^{2} - 9 = (x - 3)(x + 3)$ and $x^{2} + 2x + 1 = (x + 1)^{2}$.`,
    },
    {
      id: 'proper-fraction-by-degree',
      d: 1,
      t: ['improper fractions'],
      q: 'Which of the following is a proper rational fraction?',
      a: tex`$\frac{x^{2} + 5}{(x + 1)(x - 2)(x + 3)}$`,
      x: [tex`$\frac{x^{2} + 5}{(x + 1)(x - 2)}$`, tex`$\frac{x^{3} - 1}{x^{2} + 4}$`, tex`$\frac{3x + 2}{x - 7}$`],
      e: tex`A rational fraction is proper when the degree of the numerator is less than the degree of the denominator. For $\frac{x^{2} + 5}{(x + 1)(x - 2)(x + 3)}$ the degrees are $2 < 3$. The other three are improper: their degrees are $2 = 2$, $3 > 2$ and $1 = 1$.`,
    },
    {
      id: 'improper-equal-degree',
      d: 1,
      t: ['improper fractions'],
      q: tex`Resolved into partial fractions, $\frac{2x^{2} + 5}{x^{2} + 2}$ is equal to:`,
      a: tex`$2 + \frac{1}{x^{2} + 2}$`,
      x: [tex`$2 + \frac{5}{x^{2} + 2}$`, tex`$2 - \frac{1}{x^{2} + 2}$`, tex`$2 + \frac{9}{x^{2} + 2}$`],
      e: tex`The degrees are equal, so the fraction is improper and we divide first: $2x^{2} + 5 = 2(x^{2} + 2) + 1$. Hence $\frac{2x^{2} + 5}{x^{2} + 2} = 2 + \frac{1}{x^{2} + 2}$; as $x^{2} + 2$ is irreducible, nothing more can be split.`,
    },
  ]),
]);
