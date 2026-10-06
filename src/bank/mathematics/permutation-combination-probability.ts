import { defineBank } from '@/engine/authoring';
import {
  factorial,
  frac,
  Fraction,
  isPrime,
  lcm,
  listText,
  nCr,
  nPr,
  num,
  numericOptions,
  range,
  tex,
} from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/*
 * Permutation, Combination and Probability (FSc Part I, Chapter 7).
 *
 *   Factorial      evaluating n!/(n-k)! style expressions; solving factorial and nPr/nCr equations.
 *   Permutations   numbers formed from digits (with/without repetition, parity, digit 0), words
 *                  with repeated letters, blocks kept together, "no two together" (gap method),
 *                  prizes to students (n^k vs k^n).
 *   Circular       round tables, necklaces/garlands/key rings, two persons together/apart,
 *                  men and women alternately.
 *   Combinations   nCa = nCb, handshakes/lines/diagonals/triangles, committees with conditions,
 *                  collinear points, nPr/nCr = r!, Pascal's rule.
 *   Probability    two dice and coins, playing cards, drawing two items without replacement,
 *                  leap-year Sundays, divisibility on arranged digits, the range 0 <= P <= 1.
 *   Laws           addition law (general, mutually exclusive, exhaustive, divisible by a or b),
 *                  multiplication law for independent events, counting principles.
 */

type Options = { answer: string; distractors: string[] };

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Integer for math mode; five or more digits are grouped with commas (34{,}650). */
function int(x: number): string {
  if (!Number.isSafeInteger(x)) throw new RangeError(`int: ${x} is not a safe integer`);
  const digits = String(Math.abs(x));
  const grouped = digits.length > 4 ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '{,}') : digits;
  return x < 0 ? `-${grouped}` : grouped;
}

const int$ = (x: number): string => `$${int(x)}$`;

/**
 * FSc notation ^nP_r and ^nC_r, for use inside math mode. The leading space keeps the
 * character pair "${" out of the output when the symbol opens a formula.
 */
const P = (n: number | string, r: number | string): string => ` {}^{${n}}P_{${r}}`;
const C = (n: number | string, r: number | string): string => ` {}^{${n}}C_{${r}}`;

/** `\frac{n!}{a!\,b!}`, or just `n!` when nothing is divided out. */
function factFrac(n: number, below: readonly number[]): string {
  if (below.length === 0) return `${n}!`;
  return `\\frac{${n}!}{${below.map((k) => `${k}!`).join('\\,')}}`;
}

/** `n \times (n-1) \times ...` with `count` factors. */
function fallingTex(n: number, count: number): string {
  return Array.from({ length: count }, (_, i) => String(n - i)).join(' \\times ');
}

/** `\frac{k}{total}`, followed by its lowest-terms form when that differs. */
function ratioTex(k: number, total: number): string {
  const reduced = new Fraction(k, total);
  const raw = `\\frac{${k}}{${total}}`;
  return reduced.d === total ? raw : `${raw} = ${reduced.toTex()}`;
}

/** A probability given in hundredths, shown as a decimal (35 -> 0.35). */
const dec = (h: number): string => num(h / 100);

/** English list of digits: '1, 4, 6 and 9'. */
const digitList = (ds: readonly number[]): string => listText(ds.map(String));

const NUMBER_WORDS =['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n: number): string => NUMBER_WORDS[n] ?? String(n);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

// ---------------------------------------------------------------------------
// Option builders
// ---------------------------------------------------------------------------

/** Options for a positive whole-number answer: mistake values first, then nearby integers. */
function intOptions(r: Rng, correct: number, wrong: readonly number[]): Options {
  return numericOptions(r, {
    correct,
    wrong: wrong.filter((w) => Number.isSafeInteger(w) && w > 0),
    format: int$,
    fallback: 'integer',
  });
}

const f$ = (p: Fraction): string => `$${p.toTex()}$`;

/**
 * Options for a probability strictly between 0 and 1, shown as reduced fractions.
 * Mistake values outside (0, 1) are skipped; the complement and nearby fractions fill gaps.
 */
function probOptions(r: Rng, correct: Fraction, wrong: readonly Fraction[]): Options {
  if (correct.compare(0) <= 0 || correct.compare(1) >= 0) {
    throw new RangeError(`probOptions: ${correct.toString()} is not strictly between 0 and 1`);
  }
  const seen = new Set<string>([correct.toString()]);
  const distractors: string[] = [];
  const consider = (p: Fraction): void => {
    if (distractors.length >= 3 || p.compare(0) <= 0 || p.compare(1) >= 0 || seen.has(p.toString())) return;
    seen.add(p.toString());
    distractors.push(f$(p));
  };
  wrong.forEach(consider);
  consider(new Fraction(1).sub(correct));
  for (const m of [1, 2, 3, 4]) {
    for (const k of r.shuffle([1, -1, 2, -2])) consider(new Fraction(correct.n * m + k, correct.d * m));
  }
  if (distractors.length < 3) throw new Error(`probOptions: too few distractors for ${correct.toString()}`);
  return { answer: f$(correct), distractors };
}

/** Options for a probability measured in hundredths and shown as a decimal. */
function decOptions(r: Rng, correct: number, wrong: readonly number[]): Options {
  const seen = new Set<number>([correct]);
  const distractors: string[] = [];
  const consider = (h: number): void => {
    if (distractors.length >= 3 || !Number.isInteger(h) || h <= 0 || h >= 100 || seen.has(h)) return;
    seen.add(h);
    distractors.push(`$${dec(h)}$`);
  };
  wrong.forEach(consider);
  r.shuffle([5, -5, 10, -10, 15, -15]).forEach((k) => consider(correct + k));
  if (distractors.length < 3) throw new Error(`decOptions: too few distractors for ${correct}`);
  return { answer: `$${dec(correct)}$`, distractors };
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** Words with repeated letters (multiplicities are counted in code). */
const REPEAT_WORDS = [
  'PAKISTAN', 'ISLAMABAD', 'KARACHI', 'PESHAWAR', 'RAWALPINDI', 'QUETTA', 'SUCCESS', 'BANANA',
  'ARRANGE', 'COLLEGE', 'CALCULUS', 'ALGEBRA', 'STATISTICS', 'MATHEMATICS', 'MISSISSIPPI',
  'COMMITTEE', 'BOOKKEEPER', 'EXCELLENCE', 'ENGINEERING', 'INDEPENDENCE', 'PARALLEL', 'REFERENCE',
  'ATTENTION', 'BALLOON', 'GEOMETRY', 'INTEGRATION', 'PROBABILITY', 'ASSASSINATION',
] as const;

/** Words whose letters are all different and contain no Y or W (so "vowel" is unambiguous). */
const DISTINCT_WORDS = [
  'LAHORE', 'MULTAN', 'ORANGE', 'SQUARE', 'FIGURE', 'PENCIL', 'PLANET', 'DESIGN', 'NUMBER',
  'FORMULA', 'EQUATION', 'TRIANGLE', 'DAUGHTER', 'COMPUTER', 'LOGARITHM', 'FACTOR', 'SOLDIER',
] as const;

const isVowel = (ch: string): boolean => 'AEIOU'.includes(ch);

/** Letter multiplicities in order of first appearance. */
function letterCounts(w: string): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const ch of w) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts.entries()];
}

const POLYGON_NAMES: Record<number, string> = { 6: 'a hexagon', 8: 'an octagon', 10: 'a decagon', 12: 'a dodecagon' };
const polygon = (n: number): string => POLYGON_NAMES[n] ?? `a polygon with ${n} sides`;

/** Simple probabilities used for independent events. */
const SIMPLE_PROBS = [
  frac(1, 2), frac(1, 3), frac(2, 3), frac(1, 4), frac(3, 4), frac(1, 5),
  frac(2, 5), frac(3, 5), frac(4, 5), frac(1, 6), frac(5, 6),
];

const RANKS = [
  { name: 'king', one: 'a king', many: 'kings', per: 1 },
  { name: 'queen', one: 'a queen', many: 'queens', per: 1 },
  { name: 'jack', one: 'a jack', many: 'jacks', per: 1 },
  { name: 'ace', one: 'an ace', many: 'aces', per: 1 },
  { name: 'face card', one: 'a face card', many: 'face cards', per: 3 },
] as const;

const SUITS = [
  { one: 'a heart', many: 'hearts', suits: 1 },
  { one: 'a spade', many: 'spades', suits: 1 },
  { one: 'a diamond', many: 'diamonds', suits: 1 },
  { one: 'a club', many: 'clubs', suits: 1 },
  { one: 'a red card', many: 'red cards', suits: 2, colour: 'red' },
  { one: 'a black card', many: 'black cards', suits: 2, colour: 'black' },
] as const;

// ---------------------------------------------------------------------------
// Random experiments (two dice, coins)
// ---------------------------------------------------------------------------

type DicePredicate = (a: number, b: number) => boolean;

const DICE: ReadonlyArray<readonly [number, number]> = Array.from(
  { length: 36 },
  (_, i) => [Math.floor(i / 6) + 1, (i % 6) + 1] as const,
);
const diceCount = (pred: DicePredicate): number => DICE.filter(([a, b]) => pred(a, b)).length;
/** The count a candidate gets by wrongly treating (1, 2) and (2, 1) as one outcome. */
const diceUnordered = (pred: DicePredicate): number => DICE.filter(([a, b]) => a <= b && pred(a, b)).length;
const diceList = (pred: DicePredicate): string =>
  DICE.filter(([a, b]) => pred(a, b))
    .map(([a, b]) => `(${a}, ${b})`)
    .join(', ');
/** Number of ways of throwing a total of s with two dice. */
const sumWays = (s: number): number => 6 - Math.abs(s - 7);

interface Experiment {
  intro: string;
  /** Completes "The probability ..." (ends with "is:"). */
  question: string;
  favourable: number;
  total: number;
  /** LaTeX for how the total is counted, e.g. `6 \times 6`. */
  totalTex: string;
  wrong: Fraction[];
  detail: string;
}

function twoDice(r: Rng): Experiment {
  const kind = r.pick([
    'sum', 'sum', 'at-least', 'at-most', 'doublet', 'prime', 'multiple', 'product', 'difference', 'six', 'greater',
  ] as const);
  const of36 = (k: number): Fraction => new Fraction(k, 36);
  const base = { intro: 'Two fair dice are thrown together.', total: 36, totalTex: '6 \\times 6' };

  switch (kind) {
    case 'sum': {
      const s = r.int(3, 11);
      const pred: DicePredicate = (a, b) => a + b === s;
      const c = diceCount(pred);
      const u = diceUnordered(pred);
      return {
        ...base,
        question: `that the sum of the two numbers is ${s} is:`,
        favourable: c,
        wrong: [of36(u), new Fraction(u, 21), new Fraction(1, 11)],
        detail: tex`A total of ${s} comes from $${diceList(pred)}$, i.e. ${c} outcomes.`,
      };
    }
    case 'at-least':
    case 'at-most': {
      const atLeast = kind === 'at-least';
      const s = atLeast ? r.int(8, 11) : r.int(3, 6);
      const totals = atLeast ? range(s, 12) : range(2, s);
      const c = totals.reduce((acc, t) => acc + sumWays(t), 0);
      return {
        ...base,
        question: `that the sum of the two numbers is at ${atLeast ? 'least' : 'most'} ${s} is:`,
        favourable: c,
        wrong: [of36(sumWays(s)), of36(c - sumWays(s)), of36(36 - c)],
        detail: tex`Totals ${totals[0]} to ${totals[totals.length - 1]} occur in $${totals.map(sumWays).join(' + ')} = ${c}$ ways.`,
      };
    }
    case 'doublet':
      return {
        ...base,
        question: 'that both dice show the same number is:',
        favourable: 6,
        wrong: [of36(1), new Fraction(6, 21), of36(30)],
        detail: tex`The favourable outcomes are $(1, 1), (2, 2), \ldots, (6, 6)$, i.e. 6 outcomes.`,
      };
    case 'prime': {
      const pred: DicePredicate = (a, b) => isPrime(a + b);
      return {
        ...base,
        question: 'that the sum of the two numbers is a prime number is:',
        favourable: diceCount(pred),
        wrong: [new Fraction(5, 11), of36(diceUnordered(pred)), of36(36 - diceCount(pred))],
        detail: tex`The prime totals 2, 3, 5, 7 and 11 occur in $1 + 2 + 4 + 6 + 2 = 15$ ways.`,
      };
    }
    case 'multiple': {
      const k = r.pick([3, 4, 5]);
      const pred: DicePredicate = (a, b) => (a + b) % k === 0;
      const totals = range(2, 12).filter((t) => t % k === 0);
      const c = diceCount(pred);
      return {
        ...base,
        question: `that the sum of the two numbers is a multiple of ${k} is:`,
        favourable: c,
        wrong: [new Fraction(totals.length, 11), of36(diceUnordered(pred)), new Fraction(1, k)],
        detail: tex`The totals ${listText(totals.map(String))} occur in $${totals.map(sumWays).join(' + ')} = ${c}$ ways.`,
      };
    }
    case 'product': {
      const even = r.chance(0.5);
      return {
        ...base,
        question: `that the product of the two numbers is ${even ? 'even' : 'odd'} is:`,
        favourable: even ? 27 : 9,
        wrong: even
          ? [new Fraction(1, 2), new Fraction(1, 4), new Fraction(15, 21)]
          : [new Fraction(1, 2), new Fraction(3, 4), new Fraction(6, 21)],
        detail: even
          ? tex`The product is odd only when both numbers are odd ($3 \times 3 = 9$ outcomes), so it is even in $36 - 9 = 27$ outcomes.`
          : tex`The product is odd only when both numbers are odd: $3 \times 3 = 9$ outcomes.`,
      };
    }
    case 'difference': {
      const d = r.int(1, 4);
      const pred: DicePredicate = (a, b) => Math.abs(a - b) === d;
      const c = diceCount(pred);
      return {
        ...base,
        question: `that the two numbers differ by ${d} is:`,
        favourable: c,
        wrong: [of36(diceUnordered(pred)), new Fraction(diceUnordered(pred), 21), new Fraction(1, 6)],
        detail: tex`The favourable outcomes are $${diceList(pred)}$, i.e. ${c} outcomes.`,
      };
    }
    case 'six':
      return {
        ...base,
        question: 'that at least one of the dice shows a six is:',
        favourable: 11,
        wrong: [new Fraction(1, 3), of36(1), of36(25)],
        detail: tex`No six appears in $5 \times 5 = 25$ outcomes, so at least one six appears in $36 - 25 = 11$ outcomes.`,
      };
    case 'greater':
      return {
        ...base,
        intro: 'Two fair dice, one red and one green, are thrown together.',
        question: 'that the number on the red die is greater than the number on the green die is:',
        favourable: 15,
        wrong: [new Fraction(1, 2), new Fraction(1, 6), new Fraction(7, 12)],
        detail: 'Leaving out the 6 doublets, the other 30 outcomes split evenly, so the red number is greater in 15 outcomes.',
      };
  }
}

function coins(r: Rng): Experiment {
  const n = r.int(2, 5);
  const repeated = r.chance(0.5);
  const total = 2 ** n;
  const over = (k: number): Fraction => new Fraction(k, total);
  const base = {
    intro: repeated
      ? `A fair coin is tossed ${n === 2 ? 'twice' : `${n} times`}.`
      : `${cap(word(n))} fair coins are tossed together.`,
    total,
    totalTex: `2^{${n}}`,
  };
  const kinds = n >= 3 ? (['exactly', 'exactly', 'at-least-one', 'at-most-one', 'same'] as const) : (['exactly', 'at-least-one', 'at-most-one'] as const);
  const kind = r.pick<(typeof kinds)[number]>(kinds);

  if (kind === 'exactly') {
    const k = r.int(1, n - 1);
    const c = nCr(n, k);
    const atLeastK = range(k, n).reduce((acc, j) => acc + nCr(n, j), 0);
    return {
      ...base,
      question: `of getting exactly ${k} ${plural(k, 'head', 'heads')} is:`,
      favourable: c,
      wrong: [over(1), over(atLeastK), new Fraction(1, n + 1)],
      detail:
        k === 1
          ? tex`The single head can be in any one of the ${n} places: $${C(n, 1)} = ${c}$ outcomes.`
          : tex`The ${k} heads can occupy any ${k} of the ${n} places: $${C(n, k)} = ${c}$ outcomes.`,
    };
  }
  if (kind === 'at-least-one') {
    return {
      ...base,
      question: 'of getting at least one head is:',
      favourable: total - 1,
      wrong: [over(1), over(n), new Fraction(1, 2)],
      detail: tex`Only one outcome (all tails) has no head, so $${total} - 1 = ${total - 1}$ outcomes have at least one head.`,
    };
  }
  if (kind === 'at-most-one') {
    return {
      ...base,
      question: 'of getting at most one head is:',
      favourable: n + 1,
      wrong: [over(n), over(1), over(total - n - 1)],
      detail: tex`No head: 1 outcome; exactly one head: ${n} outcomes. Favourable outcomes $= 1 + ${n} = ${n + 1}$.`,
    };
  }
  return {
    ...base,
    question: `that ${repeated ? `the same face appears in all ${n} tosses` : `all ${n} coins show the same face`} is:`,
    favourable: 2,
    wrong: [over(1), new Fraction(1, 2), over(total - 2)],
    detail: 'Only two outcomes qualify: all heads or all tails.',
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('mathematics', 'permutation-combination-probability', (b) => [
  // ============================================================ factorial
  b.dynamic('factorial-evaluate', { difficulty: 1, tags: ['factorial'] }, (r) => {
    const form = r.pick(['two-factors', 'three-factors', 'choose-two', 'difference'] as const);
    if (form === 'two-factors') {
      const n = r.int(6, 20);
      const value = n * (n - 1);
      return {
        stem: tex`The value of $\frac{${n}!}{${n - 2}!}$ is:`,
        // one factor too many; started one factor low; "(n - (n-2))! = 2!"
        ...intOptions(r, value, [value * (n - 2), (n - 1) * (n - 2), 2]),
        explanation: tex`$\frac{${n}!}{${n - 2}!} = \frac{${n} \times ${n - 1} \times ${n - 2}!}{${n - 2}!} = ${n} \times ${n - 1} = ${int(value)}$.`,
      };
    }
    if (form === 'three-factors') {
      const n = r.int(6, 13);
      const value = n * (n - 1) * (n - 2);
      return {
        stem: tex`The value of $\frac{${n}!}{${n - 3}!}$ is:`,
        ...intOptions(r, value, [value * (n - 3), n * (n - 1), 6]),
        explanation: tex`$\frac{${n}!}{${n - 3}!} = \frac{${n} \times ${n - 1} \times ${n - 2} \times ${n - 3}!}{${n - 3}!} = ${n} \times ${n - 1} \times ${n - 2} = ${int(value)}$.`,
      };
    }
    if (form === 'choose-two') {
      const n = r.int(6, 20);
      const value = (n * (n - 1)) / 2;
      return {
        stem: tex`The value of $\frac{${n}!}{2!\,${n - 2}!}$ is:`,
        // forgot the 2!; one factor too many; started one factor low
        ...intOptions(r, value, [n * (n - 1), value * (n - 2), ((n - 1) * (n - 2)) / 2]),
        explanation: tex`$\frac{${n}!}{2!\,${n - 2}!} = \frac{${n} \times ${n - 1} \times ${n - 2}!}{2 \times ${n - 2}!} = \frac{${n} \times ${n - 1}}{2} = ${int(value)}$.`,
      };
    }
    const n = r.int(5, 16);
    const value = (n - 1) * (n - 1);
    return {
      stem: tex`The value of $\frac{${n}! - ${n - 1}!}{${n - 2}!}$ is:`,
      // dropped the second term; sign slip; took (n-1)!/(n-2)! as 1
      ...intOptions(r, value, [n * (n - 1), (n - 1) * (n + 1), n * (n - 1) - 1]),
      explanation: tex`$${n}! - ${n - 1}! = ${n} \times ${n - 1}! - ${n - 1}! = ${n - 1} \times ${n - 1}!$, so the expression equals $\frac{${n - 1} \times ${n - 1}!}{${n - 2}!} = ${n - 1} \times ${n - 1} = ${int(value)}$.`,
    };
  }),

  b.dynamic(
    'solve-for-n-or-r',
    { difficulty: 2, origin: 'past-paper', tags: ['factorial', 'permutations', 'combinations'] },
    (r) => {
      const form = r.pick(['factorial-1', 'factorial-2', 'perm-2', 'comb-2', 'ratio', 'perm-comb', 'perm-r'] as const);
      if (form === 'factorial-1') {
        const n = r.int(4, 15);
        const k = (n + 1) * n;
        return {
          stem: tex`If $\frac{(n+1)!}{(n-1)!} = ${k}$, then $n$ is equal to:`,
          ...intOptions(r, n, [n + 1, n - 1, n + 2]),
          explanation: tex`$\frac{(n+1)!}{(n-1)!} = (n+1)n$, so $n^2 + n - ${k} = 0$, i.e. $(n - ${n})(n + ${n + 1}) = 0$. Since $n$ cannot be negative, $n = ${n}$.`,
        };
      }
      if (form === 'factorial-2') {
        const n = r.int(3, 14);
        const k = (n + 2) * (n + 1);
        return {
          stem: tex`If $(n+2)! = ${k} \times n!$, then $n$ is equal to:`,
          ...intOptions(r, n, [n + 2, n + 1, n - 1]),
          explanation: tex`Dividing by $n!$ gives $(n+2)(n+1) = ${k}$, so $n^2 + 3n - ${k - 2} = 0$, i.e. $(n - ${n})(n + ${n + 3}) = 0$. Since $n$ cannot be negative, $n = ${n}$.`,
        };
      }
      if (form === 'perm-2') {
        const n = r.int(4, 20);
        const k = n * (n - 1);
        return {
          stem: tex`If $${P('n', 2)} = ${k}$, then $n$ is equal to:`,
          ...intOptions(r, n, [n - 1, n + 1, n + 2]),
          explanation: tex`$${P('n', 2)} = \frac{n!}{(n-2)!} = n(n-1) = ${k}$, so $n^2 - n - ${k} = 0$, i.e. $(n - ${n})(n + ${n - 1}) = 0$. Hence $n = ${n}$.`,
        };
      }
      if (form === 'comb-2') {
        const n = r.int(4, 20);
        const k = (n * (n - 1)) / 2;
        return {
          stem: tex`If $${C('n', 2)} = ${k}$, then $n$ is equal to:`,
          ...intOptions(r, n, [n - 1, n + 1, n + 2]),
          explanation: tex`$${C('n', 2)} = \frac{n(n-1)}{2} = ${k}$, so $n^2 - n - ${2 * k} = 0$, i.e. $(n - ${n})(n + ${n - 1}) = 0$. Hence $n = ${n}$.`,
        };
      }
      if (form === 'ratio') {
        const k = r.int(3, 5);
        const m = r.int(k + 2, 15);
        return {
          stem: tex`If $${P('n', k)} : ${P('n-1', k - 1)} = ${m} : 1$, then $n$ is equal to:`,
          // confused with nPr = (n - r + 1) nP(r-1)
          ...intOptions(r, m, [m + k - 1, m - 1, m + 1]),
          explanation: tex`$${P('n', k)} = \frac{n!}{(n-${k})!} = n \cdot \frac{(n-1)!}{(n-${k})!} = n \cdot ${P('n-1', k - 1)}$, so the ratio is simply $n : 1$. Hence $n = ${m}$.`,
        };
      }
      if (form === 'perm-comb') {
        const n = r.int(5, 10);
        const k = r.int(3, Math.min(5, n - 1));
        const X = nPr(n, k);
        const Y = nCr(n, k);
        return {
          stem: tex`If $${P('n', 'r')} = ${int(X)}$ and $${C('n', 'r')} = ${int(Y)}$, then $r$ is equal to:`,
          // reported r! instead of r
          ...intOptions(r, k, [factorial(k), k - 1, k + 1]),
          explanation: tex`$\frac{${P('n', 'r')}}{${C('n', 'r')}} = r!$, so $r! = \frac{${int(X)}}{${int(Y)}} = ${factorial(k)} = ${k}!$. Hence $r = ${k}$.`,
        };
      }
      const n = r.int(6, 10);
      const k = r.int(2, 4);
      const X = nPr(n, k);
      return {
        stem: tex`If $${P(n, 'r')} = ${int(X)}$, then $r$ is equal to:`,
        // n - r comes from solving (n - r)! = n!/X and reporting n - r
        ...intOptions(r, k, [k + 1, k - 1, n - k]),
        explanation: tex`$${P(n, 'r')} = ${n}(${n - 1})(${n - 2})\cdots$ is the product of $r$ consecutive integers counting down from $${n}$. Since $${int(X)} = ${fallingTex(n, k)}$, a product of ${k} such integers, $r = ${k}$.`,
      };
    },
  ),

  // ============================================================ permutations
  b.dynamic('digit-numbers', { difficulty: 1, tags: ['permutations', 'addition and multiplication laws'] }, (r) => {
    const mode = r.pick(['distinct', 'repetition'] as const);
    const m = r.int(4, 7);
    const digits = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], m).sort((x, y) => x - y);
    if (mode === 'repetition') {
      const k = r.int(2, 4);
      const correct = m ** k;
      return {
        stem: `How many ${k}-digit numbers can be formed from the digits ${digitList(digits)} if the digits may be repeated?`,
        // no repetition; base and power swapped; multiplied instead of raising to a power
        ...intOptions(r, correct, [nPr(m, k), k ** m, m * k]),
        explanation: tex`Each of the ${k} places can be filled with any of the ${m} digits, so by the multiplication law the number is $${m}^{${k}} = ${int(correct)}$.`,
      };
    }
    const k = r.int(2, Math.min(4, m - 1));
    const correct = nPr(m, k);
    return {
      stem: `How many ${k}-digit numbers can be formed from the digits ${digitList(digits)} if no digit is repeated?`,
      // order ignored; repetition allowed; used all the digits
      ...intOptions(r, correct, [nCr(m, k), m ** k, factorial(m)]),
      explanation: tex`The first place can be filled in ${m} ways, the next in ${m - 1} ways, and so on, so the number is $${P(m, k)} = ${fallingTex(m, k)} = ${int(correct)}$.`,
    };
  }),

  b.dynamic('digit-numbers-restricted', { difficulty: 2, tags: ['permutations', 'addition and multiplication laws'] }, (r) => {
    const mode = r.pick(['parity', 'with-zero'] as const);
    const m = r.int(4, 7);

    if (mode === 'parity') {
      const evenCount = r.int(Math.max(1, m - 5), Math.min(4, m - 1));
      const evens = r.sample([2, 4, 6, 8], evenCount).sort((x, y) => x - y);
      const odds = r.sample([1, 3, 5, 7, 9], m - evenCount).sort((x, y) => x - y);
      const digits = [...evens, ...odds].sort((x, y) => x - y);
      const k = r.int(2, Math.min(4, m - 1));
      const parity = r.pick(['even', 'odd'] as const);
      const good = parity === 'even' ? evens : odds;
      const rest = nPr(m - 1, k - 1);
      const correct = good.length * rest;
      const places = k === 2 ? 'The other place is' : `The other ${k - 1} places are`;
      return {
        stem: `How many ${k}-digit ${parity} numbers can be formed from the digits ${digitList(digits)} if no digit is repeated?`,
        // "half of them are even"; forgot the units digit is used up; counted the other parity
        ...intOptions(r, correct, [nPr(m, k) / 2, good.length * nPr(m, k - 1), (m - good.length) * rest]),
        explanation: tex`The units digit must be ${parity}: ${good.length} ${plural(good.length, 'choice', 'choices')} (${digitList(good)}). ${places} filled from the remaining ${m - 1} digits in $${P(m - 1, k - 1)} = ${int(rest)}$ ways. Total $= ${good.length} \times ${int(rest)} = ${int(correct)}$.`,
      };
    }

    const digits = [0, ...r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], m - 1).sort((x, y) => x - y)];
    const k = r.int(2, Math.min(4, m - 1));
    const rest = nPr(m - 1, k - 1);
    const correct = (m - 1) * rest;
    const places = k === 2 ? 'The other place is' : `The other ${k - 1} places are`;
    return {
      stem: `How many ${k}-digit numbers can be formed from the digits ${digitList(digits)} if no digit is repeated?`,
      // allowed a leading zero; dropped 0 altogether; forgot the first digit is used up
      ...intOptions(r, correct, [nPr(m, k), nPr(m - 1, k), (m - 1) * nPr(m, k - 1)]),
      explanation: tex`A number cannot begin with $0$, so the first digit can be chosen in ${m - 1} ways. ${places} filled from the remaining ${m - 1} digits (now including $0$) in $${P(m - 1, k - 1)} = ${int(rest)}$ ways. Total $= ${m - 1} \times ${int(rest)} = ${int(correct)}$.`,
    };
  }),

  b.dynamic('repeated-letters', { difficulty: 1, origin: 'past-paper', tags: ['permutations'] }, (r) => {
    const w = r.pick(REPEAT_WORDS);
    const n = w.length;
    const repeats = letterCounts(w)
      .filter(([, c]) => c >= 2)
      .sort((x, y) => y[1] - x[1]);
    const below = repeats.map(([, c]) => c);
    const divisor = below.reduce((acc, c) => acc * factorial(c), 1);
    const correct = factorial(n) / divisor;

    // [value, LaTeX] of typical slips, best first.
    const slips: Array<[number, string]> = [[factorial(n), `${n}!`]]; // ignored the repetitions
    if (below.length >= 2) {
      const kept = below.slice(0, -1); // forgot one repeated letter
      slips.push([factorial(n) / kept.reduce((acc, c) => acc * factorial(c), 1), factFrac(n, kept)]);
    }
    const plainProduct = below.reduce((acc, c) => acc * c, 1); // divided by the counts, not their factorials
    slips.push([factorial(n) / plainProduct, `\\frac{${n}!}{${below.join(' \\times ')}}`]);
    slips.push([factorial(n - 1) / divisor, factFrac(n - 1, below)]); // used (n - 1)! as for a circle
    if (below.length >= 2) {
      const sum = below.reduce((acc, c) => acc + c, 0); // divided by (p + q + ...)!
      slips.push([factorial(n) / factorial(sum), factFrac(n, [sum])]);
    }
    slips.push([correct / 2, factFrac(n, [...below, 2])]); // divided by an extra 2!

    const counts = listText(repeats.map(([ch, c]) => `${ch} occurs ${c === 2 ? 'twice' : `${c} times`}`));
    const stem = `The number of different arrangements of all the letters of the word **${w}** is:`;
    const explanation = tex`**${w}** has ${n} letters, in which ${counts}. Number of arrangements $= ${factFrac(n, below)} = ${int(correct)}$.`;

    if (correct <= 99999) {
      return { stem, ...intOptions(r, correct, slips.map(([v]) => v)), explanation };
    }
    // Large answers are offered in factorial form, as NET does.
    const seen = new Set<number>([correct]);
    const distractors: string[] = [];
    for (const [v, t] of slips) {
      if (distractors.length === 3 || !Number.isInteger(v) || seen.has(v)) continue;
      seen.add(v);
      distractors.push(`$${t}$`);
    }
    return { stem, answer: `$${factFrac(n, below)}$`, distractors, explanation };
  }),

  b.dynamic('kept-together', { difficulty: 2, tags: ['permutations'] }, (r) => {
    const kind = r.pick(['vowels', 'vowels', 'girls', 'books-two', 'books-three'] as const);
    if (kind === 'vowels') {
      const w = r.pick(DISTINCT_WORDS);
      const vowels = [...w].filter(isVowel);
      const v = vowels.length;
      const c = w.length - v;
      const correct = factorial(c + 1) * factorial(v);
      return {
        stem: `In how many ways can the letters of the word **${w}** be arranged so that all the vowels come together?`,
        // block not counted as a unit; vowels not arranged inside the block; "vowels not all together"
        ...intOptions(r, correct, [factorial(c) * factorial(v), factorial(c + 1), factorial(w.length) - correct]),
        explanation: tex`Treat the vowels ${listText(vowels)} as one block. The block and the ${c} consonants are ${c + 1} units, arranged in $${c + 1}! = ${int(factorial(c + 1))}$ ways, and the vowels can be arranged inside the block in $${v}! = ${factorial(v)}$ ways. Total $= ${int(factorial(c + 1))} \times ${factorial(v)} = ${int(correct)}$.`,
      };
    }
    if (kind === 'girls') {
      const a = r.int(3, 6);
      const g = r.int(2, 4);
      const correct = factorial(a + 1) * factorial(g);
      return {
        stem: `In how many ways can ${a} boys and ${g} girls be seated in a row so that all the girls sit together?`,
        ...intOptions(r, correct, [factorial(a) * factorial(g), factorial(a + 1), factorial(a + g) - correct]),
        explanation: tex`Treat the ${g} girls as one unit. This unit and the ${a} boys are ${a + 1} units, arranged in $${a + 1}! = ${int(factorial(a + 1))}$ ways, and the girls can be arranged within their unit in $${g}! = ${factorial(g)}$ ways. Total $= ${int(factorial(a + 1))} \times ${factorial(g)} = ${int(correct)}$.`,
      };
    }
    if (kind === 'books-two') {
      const m = r.int(2, 5);
      const p = r.int(2, 5);
      const correct = 2 * factorial(m) * factorial(p);
      return {
        stem: `In how many ways can ${m} different Mathematics books and ${p} different Physics books be arranged on a shelf so that the books of each subject are kept together?`,
        // forgot to order the two subjects; ignored the condition; added instead of multiplied
        ...intOptions(r, correct, [factorial(m) * factorial(p), factorial(m + p), 2 * (factorial(m) + factorial(p))]),
        explanation: tex`The two subject blocks can be placed in $2!$ orders; inside the blocks the books can be arranged in $${m}!$ and $${p}!$ ways. Total $= 2! \times ${m}! \times ${p}! = 2 \times ${factorial(m)} \times ${factorial(p)} = ${int(correct)}$.`,
      };
    }
    const [m, p, q] = [r.int(2, 4), r.int(2, 4), r.int(2, 3)];
    const inner = factorial(m) * factorial(p) * factorial(q);
    const correct = 6 * inner;
    return {
      stem: `${m} Mathematics, ${p} Physics and ${q} Chemistry books (all different) are to be arranged on a shelf so that the books of each subject are together. The number of possible arrangements is:`,
      ...intOptions(r, correct, [inner, factorial(m + p + q), 3 * inner]),
      explanation: tex`The three subject blocks can be ordered in $3! = 6$ ways, and the books inside them in $${m}!$, $${p}!$ and $${q}!$ ways. Total $= 3! \times ${m}! \times ${p}! \times ${q}! = 6 \times ${int(inner)} = ${int(correct)}$.`,
    };
  }),

  b.dynamic('no-two-together', { difficulty: 3, tags: ['permutations'] }, (r) => {
    const a = r.int(3, 6);
    const g = r.int(3, Math.min(4, a + 1));
    const [stem, big, small] = r.pick([
      [
        `${a} boys and ${g} girls are to stand in a row. In how many ways can they stand if no two girls are next to each other?`,
        'boys',
        'girls',
      ],
      [
        `${a} different Physics books and ${g} different Chemistry books are to be arranged on a shelf. In how many ways can this be done if no two Chemistry books are side by side?`,
        'Physics books',
        'Chemistry books',
      ],
      [
        `${a} men and ${g} women are to sit in a row of ${a + g} chairs. In how many ways can they sit if no two women sit next to each other?`,
        'men',
        'women',
      ],
    ] as const);
    const gaps = nPr(a + 1, g);
    const correct = factorial(a) * gaps;
    return {
      stem,
      ...intOptions(r, correct, [
        factorial(a + g) - factorial(a + 1) * factorial(g), // "not all together" mistaken for "no two together"
        factorial(a) * nCr(a + 1, g), // gaps chosen but not arranged
        factorial(a) * nPr(a - 1, g), // end gaps forgotten
        factorial(a) * factorial(g),
      ]),
      explanation: tex`Arrange the ${a} ${big} first: $${a}! = ${int(factorial(a))}$ ways. They leave ${a + 1} gaps (including both ends), and the ${g} ${small} must occupy ${g} different gaps: $${P(a + 1, g)} = ${int(gaps)}$ ways. Total $= ${int(factorial(a))} \times ${int(gaps)} = ${int(correct)}$. (Subtracting the cases with all ${g} ${small} together is wrong: that still allows two of them side by side.)`,
    };
  }),

  // ============================================================ circular permutations
  b.dynamic('round-table-necklace', { difficulty: 1, origin: 'past-paper', tags: ['circular permutations'] }, (r) => {
    const kind = r.pick(['table', 'table', 'necklace', 'key-ring', 'garland'] as const);
    if (kind === 'table') {
      const n = r.int(4, 9);
      const stem = r.pick([
        `In how many ways can ${n} persons be seated around a round table?`,
        `In how many ways can ${n} guests be seated at a round dinner table?`,
        `In how many ways can ${n} friends sit around a circular table?`,
      ]);
      const correct = factorial(n - 1);
      return {
        stem,
        // linear arrangement; necklace formula; halved the linear count
        ...intOptions(r, correct, [factorial(n), correct / 2, factorial(n) / 2]),
        explanation: tex`Around a table only the relative order matters, so fix one person and arrange the other ${n - 1}: $(${n} - 1)! = ${n - 1}! = ${int(correct)}$.`,
      };
    }
    const n = r.int(5, 10);
    const [stem, thing] =
      kind === 'necklace'
        ? [`In how many ways can ${n} different beads be strung together to form a necklace?`, 'a necklace']
        : kind === 'key-ring'
          ? [`In how many ways can ${n} different keys be arranged on a key ring?`, 'a key ring']
          : [`In how many ways can ${n} different flowers be strung together to form a garland?`, 'a garland'];
    const circular = factorial(n - 1);
    const correct = circular / 2;
    return {
      stem,
      // forgot that it can be turned over; halved the linear count; linear count
      ...intOptions(r, correct, [circular, factorial(n) / 2, factorial(n)]),
      explanation: tex`A circular arrangement of ${n} objects can be made in $(${n} - 1)! = ${int(circular)}$ ways, but ${thing} can be turned over, so each clockwise order is the same as its anticlockwise order. Number of ways $= \frac{${n - 1}!}{2} = ${int(correct)}$.`,
    };
  }),

  b.dynamic('circular-with-condition', { difficulty: 3, tags: ['circular permutations'] }, (r) => {
    const kind = r.pick(['together', 'apart', 'alternate'] as const);
    if (kind === 'alternate') {
      const m = r.int(3, 6);
      const correct = factorial(m - 1) * factorial(m);
      return {
        stem: `In how many ways can ${m} men and ${m} women be seated around a round table so that men and women sit alternately?`,
        // circular adjustment missed; doubled as in a row; ignored the condition
        ...intOptions(r, correct, [factorial(m) * factorial(m), 2 * correct, factorial(2 * m - 1)]),
        explanation: tex`Seat the ${m} men round the table first: $(${m} - 1)! = ${int(factorial(m - 1))}$ ways. This leaves ${m} seats between them for the women: $${m}! = ${int(factorial(m))}$ ways. Total $= ${int(factorial(m - 1))} \times ${int(factorial(m))} = ${int(correct)}$.`,
      };
    }
    if (kind === 'together') {
      const n = r.int(5, 10);
      const correct = 2 * factorial(n - 2);
      return {
        stem: `In how many ways can ${n} persons be seated around a round table if two particular persons must always sit next to each other?`,
        // forgot the 2!; treated the units as in a row; complement; one unit too few
        ...intOptions(r, correct, [factorial(n - 2), 2 * factorial(n - 1), factorial(n - 1) - correct, 2 * factorial(n - 3)]),
        explanation: tex`Tie the two particular persons together as one unit. Then ${n - 1} units sit round the table in $(${n - 1} - 1)! = ${n - 2}! = ${int(factorial(n - 2))}$ ways, and the two can change places in $2!$ ways. Total $= 2 \times ${int(factorial(n - 2))} = ${int(correct)}$.`,
      };
    }
    const n = r.int(6, 10);
    const all = factorial(n - 1);
    const together = 2 * factorial(n - 2);
    const correct = all - together;
    return {
      stem: `In how many ways can ${n} persons be seated around a round table if two particular persons must never sit next to each other?`,
      // the "together" count; forgot the 2!; used the formula for a row
      ...intOptions(r, correct, [together, all - factorial(n - 2), factorial(n) - 2 * factorial(n - 1)]),
      explanation: tex`Without any restriction: $(${n} - 1)! = ${int(all)}$ ways. With the two together: $2 \times ${n - 2}! = ${int(together)}$ ways. So they are apart in $${int(all)} - ${int(together)} = ${int(correct)}$ ways.`,
    };
  }),

  // ============================================================ combinations
  b.dynamic('ncr-equal-indices', { difficulty: 2, origin: 'past-paper', tags: ['combinations'] }, (r) => {
    const n = r.int(9, 24);
    const a = r.int(2, Math.floor((n - 3) / 2));
    const c = n - a;
    const [first, second] = r.chance(0.5) ? [a, c] : [c, a];
    const given = tex`$${C('n', first)} = ${C('n', second)}$`;
    const why = tex`Since $${C('n', 'r')} = ${C('n', 'n-r')}$, the equality with $${first} \ne ${second}$ requires $${first} + ${second} = n$, so $n = ${n}$.`;
    if (r.chance(0.4)) {
      return {
        stem: tex`If ${given}, then $n$ is equal to:`,
        ...intOptions(r, n, [c - a, n + 1, n - 1]),
        explanation: why,
      };
    }
    const pairs = nCr(n, 2);
    return {
      stem: tex`If ${given}, then $${C('n', 2)}$ is equal to:`,
      // forgot the 2!; took n as the difference of the indices; n off by one
      ...intOptions(r, pairs, [nPr(n, 2), nCr(c - a, 2), nCr(n + 1, 2)]),
      explanation: tex`${why} Therefore $${C(n, 2)} = \frac{${n} \times ${n - 1}}{2} = ${int(pairs)}$.`,
    };
  }),

  b.dynamic('handshakes-diagonals', { difficulty: 1, origin: 'past-paper', tags: ['combinations'] }, (r) => {
    const kind = r.pick(['handshakes', 'lines', 'diagonals', 'diagonals', 'triangles', 'matches'] as const);
    if (kind === 'handshakes' || kind === 'lines') {
      const n = r.int(6, 25);
      const value = nCr(n, 2);
      return {
        stem:
          kind === 'handshakes'
            ? `At a meeting, each of ${n} persons shakes hands with every other person exactly once. The total number of handshakes is:`
            : `How many straight lines can be drawn by joining pairs of ${n} points in a plane, no three of which are collinear?`,
        // each pair counted twice; added 1 + 2 + ... + n
        ...intOptions(r, value, [n * (n - 1), (n * (n + 1)) / 2]),
        explanation: tex`Each ${kind === 'handshakes' ? 'handshake' : 'line'} corresponds to a pair of ${kind === 'handshakes' ? 'persons' : 'points'}: $${C(n, 2)} = \frac{${n} \times ${n - 1}}{2} = ${int(value)}$.`,
      };
    }
    if (kind === 'diagonals') {
      const n = r.int(6, 20);
      const value = (n * (n - 3)) / 2;
      return {
        stem: `The number of diagonals of ${polygon(n)} is:`,
        // sides not removed; forgot to halve; counted n - 2 vertices per vertex
        ...intOptions(r, value, [nCr(n, 2), n * (n - 3), (n * (n - 2)) / 2]),
        explanation: tex`Any two of the ${n} vertices give a side or a diagonal: $${C(n, 2)} = ${nCr(n, 2)}$. Removing the ${n} sides leaves $${nCr(n, 2)} - ${n} = ${value}$ diagonals $\left(= \frac{n(n-3)}{2}\right)$.`,
      };
    }
    if (kind === 'triangles') {
      const n = r.int(5, 15);
      const value = nCr(n, 3);
      return {
        stem: `How many triangles can be formed by joining the vertices of ${polygon(n)}?`,
        // order counted; pairs instead of triples; divided by 2 instead of 3!
        ...intOptions(r, value, [nPr(n, 3), nCr(n, 2), nPr(n, 3) / 2]),
        explanation: tex`No three vertices of a polygon are collinear, so every choice of 3 vertices gives a triangle: $${C(n, 3)} = \frac{${n} \times ${n - 1} \times ${n - 2}}{3!} = ${int(value)}$.`,
      };
    }
    const n = r.int(5, 16);
    const value = n * (n - 1);
    return {
      stem: `In a tournament, each of ${n} teams plays every other team twice (once at home and once away). The total number of matches is:`,
      // played once only; counted a team against itself; 2 per team
      ...intOptions(r, value, [nCr(n, 2), n * n, 2 * n]),
      explanation: tex`Each pair of teams plays 2 matches: $2 \times ${C(n, 2)} = ${P(n, 2)} = ${n} \times ${n - 1} = ${int(value)}$.`,
    };
  }),

  b.dynamic('committee-selection', { difficulty: 2, tags: ['combinations', 'addition and multiplication laws'] }, (r) => {
    const kind = r.pick(['split', 'split', 'include', 'exclude', 'at-least-one'] as const);
    if (kind === 'split') {
      const p = r.int(5, 9);
      const q = r.int(4, 8);
      const a = r.int(2, 3);
      const w = r.int(1, 3);
      const [stem, unitA, unitB] = r.pick([
        [
          `A committee of ${a} men and ${w} ${plural(w, 'woman', 'women')} is to be formed from ${p} men and ${q} women. In how many ways can this be done?`,
          'the men',
          plural(w, 'the woman', 'the women'),
        ],
        [
          `A selector must pick ${a} batsmen and ${w} ${plural(w, 'bowler', 'bowlers')} from a squad of ${p} batsmen and ${q} bowlers. In how many ways can the selection be made?`,
          'the batsmen',
          plural(w, 'the bowler', 'the bowlers'),
        ],
        [
          `A student must answer ${a} questions from Section A (${p} questions) and ${w} ${plural(w, 'question', 'questions')} from Section B (${q} questions). In how many ways can the questions be chosen?`,
          'the Section A questions',
          plural(w, 'the Section B question', 'the Section B questions'),
        ],
      ] as const);
      const ca = nCr(p, a);
      const cb = nCr(q, w);
      const correct = ca * cb;
      return {
        stem,
        // added the two counts; ignored the split; used permutations
        ...intOptions(r, correct, [ca + cb, nCr(p + q, a + w), nPr(p, a) * nPr(q, w)]),
        explanation: tex`${cap(unitA)} can be chosen in $${C(p, a)} = ${ca}$ ways and ${unitB} in $${C(q, w)} = ${cb}$ ways. By the multiplication law the number of ways is $${ca} \times ${cb} = ${int(correct)}$.`,
      };
    }
    if (kind === 'at-least-one') {
      const k = r.int(3, 4);
      const p = r.int(k + 1, 8);
      const q = r.int(3, 6);
      const total = nCr(p + q, k);
      const noWoman = nCr(p, k);
      const correct = total - noWoman;
      return {
        stem: `A committee of ${k} is to be chosen from ${p} men and ${q} women. In how many ways can this be done if the committee must include at least one woman?`,
        // fixed one woman then chose freely (overcounts); ignored the condition; subtracted the all-women committees
        ...intOptions(r, correct, [q * nCr(p + q - 1, k - 1), total, total - nCr(q, k)]),
        explanation: tex`All committees: $${C(p + q, k)} = ${total}$. Committees with no woman (all men): $${C(p, k)} = ${noWoman}$. Hence at least one woman in $${total} - ${noWoman} = ${correct}$ ways.`,
      };
    }
    const n = r.int(7, 12);
    const k = r.int(3, 5);
    if (kind === 'include') {
      const correct = nCr(n - 1, k - 1);
      return {
        stem: `In how many ways can a committee of ${k} be chosen from ${n} persons if one particular person must be included?`,
        ...intOptions(r, correct, [nCr(n, k), nCr(n - 1, k), nCr(n, k - 1)]),
        explanation: tex`Put the particular person on the committee; the other ${k - 1} members are chosen from the remaining ${n - 1} persons: $${C(n - 1, k - 1)} = ${correct}$.`,
      };
    }
    const correct = nCr(n - 1, k);
    return {
      stem: `In how many ways can a committee of ${k} be chosen from ${n} persons if one particular person must be left out?`,
      ...intOptions(r, correct, [nCr(n, k), nCr(n - 1, k - 1), nCr(n, k) - 1]),
      explanation: tex`Leave the particular person out and choose all ${k} members from the remaining ${n - 1} persons: $${C(n - 1, k)} = ${correct}$.`,
    };
  }),

  b.dynamic('collinear-points', { difficulty: 3, tags: ['combinations'] }, (r) => {
    const kind = r.pick(['lines', 'triangles', 'parallel-lines'] as const);
    if (kind === 'parallel-lines') {
      const n = r.int(4, 8);
      const m = r.int(3, 7);
      const correct = nCr(n, 2) * m + nCr(m, 2) * n;
      return {
        stem: `${n} points lie on a straight line and ${m} other points lie on a second line parallel to it. How many triangles can be formed with vertices at these ${n + m} points?`,
        // ignored collinearity; only one type of triangle; removed the collinear triples of one line only
        ...intOptions(r, correct, [nCr(n + m, 3), nCr(n, 2) * m, nCr(n + m, 3) - nCr(n, 3)]),
        explanation: tex`A triangle needs two vertices on one line and one on the other: $${C(n, 2)} \times ${m} + ${C(m, 2)} \times ${n} = ${nCr(n, 2)} \times ${m} + ${nCr(m, 2)} \times ${n} = ${int(correct)}$.`,
      };
    }
    const n = r.int(8, 15);
    const m = r.int(3, Math.min(6, n - 3));
    const intro = `There are ${n} points in a plane, of which exactly ${m} are collinear; no other three of them are collinear.`;
    if (kind === 'lines') {
      const correct = nCr(n, 2) - nCr(m, 2) + 1;
      return {
        stem: `${intro} The number of straight lines obtained by joining pairs of these points is:`,
        // ignored collinearity; forgot the one common line; subtracted m instead of mC2
        ...intOptions(r, correct, [nCr(n, 2), nCr(n, 2) - nCr(m, 2), nCr(n, 2) - m + 1]),
        explanation: tex`Pairs of points: $${C(n, 2)} = ${nCr(n, 2)}$. The ${m} collinear points give only 1 line instead of $${C(m, 2)} = ${nCr(m, 2)}$. Lines $= ${nCr(n, 2)} - ${nCr(m, 2)} + 1 = ${correct}$.`,
      };
    }
    const correct = nCr(n, 3) - nCr(m, 3);
    return {
      stem: `${intro} The number of triangles that can be formed with vertices at these points is:`,
      // ignored collinearity; added 1 as for lines; subtracted m instead of mC3; used only the non-collinear points
      ...intOptions(r, correct, [nCr(n, 3), correct + 1, nCr(n, 3) - m, nCr(n - m, 3)]),
      explanation: tex`Triples of points: $${C(n, 3)} = ${nCr(n, 3)}$. Triples taken from the ${m} collinear points form no triangle: $${C(m, 3)} = ${nCr(m, 3)}$. Triangles $= ${nCr(n, 3)} - ${nCr(m, 3)} = ${correct}$.`,
    };
  }),

  // ============================================================ probability
  b.dynamic('dice-and-coins', { difficulty: 2, origin: 'past-paper', tags: ['probability'] }, (r) => {
    const ex = r.chance(0.6) ? twoDice(r) : coins(r);
    return {
      stem: `${ex.intro} The probability ${ex.question}`,
      ...probOptions(r, new Fraction(ex.favourable, ex.total), ex.wrong),
      explanation: tex`There are $${ex.totalTex} = ${ex.total}$ equally likely outcomes. ${ex.detail} Hence $P = ${ratioTex(ex.favourable, ex.total)}$.`,
    };
  }),

  b.dynamic('card-draw', { difficulty: 2, origin: 'past-paper', tags: ['probability', 'addition and multiplication laws'] }, (r) => {
    const rank = r.pick(RANKS);
    const intro = 'A card is drawn at random from a well-shuffled pack of 52 playing cards.';
    const ask = r.pick(['or', 'or', 'neither', 'colour'] as const);
    if (ask === 'colour') {
      const colour = r.pick(['red', 'black'] as const);
      const k = 2 * rank.per;
      return {
        stem: `${intro} The probability that it is a ${colour} ${rank.name} is:`,
        // ignored the colour; "red or king"; only one such card
        ...probOptions(r, new Fraction(k, 52), [
          new Fraction(4 * rank.per, 52),
          new Fraction(26 + 4 * rank.per - k, 52),
          new Fraction(rank.per, 52),
        ]),
        explanation: tex`Half of the ${4 * rank.per} ${rank.many} are ${colour}, i.e. ${k} cards, so $P = ${ratioTex(k, 52)}$.`,
      };
    }
    const suit = r.pick(SUITS);
    const inRank = 4 * rank.per;
    const inSuit = 13 * suit.suits;
    const inBoth = rank.per * suit.suits;
    const union = inRank + inSuit - inBoth;
    const bothText =
      'colour' in suit
        ? `the ${inBoth} ${suit.colour} ${rank.many}`
        : rank.per === 1
          ? `the ${rank.name} of ${suit.many} is`
          : `the ${inBoth} ${rank.many} of ${suit.many}`;
    const counted = inBoth === 1 && !('colour' in suit) ? `${bothText} counted in both` : `${bothText} are counted in both`;
    if (ask === 'or') {
      return {
        stem: `${intro} The probability that it is ${rank.one} or ${suit.one} is:`,
        // overlap not subtracted; "and" instead of "or"; neither
        ...probOptions(r, new Fraction(union, 52), [
          new Fraction(inRank + inSuit, 52),
          new Fraction(inBoth, 52),
          new Fraction(52 - union, 52),
        ]),
        explanation: tex`There are ${inRank} ${rank.many} and ${inSuit} ${suit.many}; ${counted}. By the addition law, $P = \frac{${inRank}}{52} + \frac{${inSuit}}{52} - \frac{${inBoth}}{52} = ${ratioTex(union, 52)}$.`,
      };
    }
    return {
      stem: `${intro} The probability that it is neither ${rank.one} nor ${suit.one} is:`,
      // overlap not subtracted; the "or" probability; "not both"
      ...probOptions(r, new Fraction(52 - union, 52), [
        new Fraction(52 - inRank - inSuit, 52),
        new Fraction(union, 52),
        new Fraction(52 - inBoth, 52),
      ]),
      explanation: tex`Cards that are ${rank.many} or ${suit.many}: $${inRank} + ${inSuit} - ${inBoth} = ${union}$ (${counted}). The remaining $52 - ${union} = ${52 - union}$ cards are neither, so $P = ${ratioTex(52 - union, 52)}$.`,
    };
  }),

  b.dynamic('two-balls-drawn', { difficulty: 2, tags: ['probability', 'combinations'] }, (r) => {
    const setting = r.pick(['balls', 'balls', 'bulbs', 'students'] as const);
    let a: number;
    let b2: number;
    let intro: string;
    let unit: string;
    let phrases: { bothA: string; bothB: string; mixed: string; same?: string };
    /** Group names after "Both ..." (plural) and after "One ..." (singular). */
    let names: [string, string];
    let single: [string, string];
    let third: { colour: string; count: number } | null = null;
    if (setting === 'balls') {
      a = r.int(2, 8);
      b2 = r.int(2, 8);
      if (r.chance(0.5)) third = { colour: r.pick(['blue', 'green', 'yellow'] as const), count: r.int(2, 5) };
      intro = third
        ? `A bag contains ${a} red, ${b2} white and ${third.count} ${third.colour} balls. Two balls are drawn at random without replacement.`
        : `A bag contains ${a} red and ${b2} white balls. Two balls are drawn at random without replacement.`;
      unit = 'balls';
      names = ['red', 'white'];
      single = ['red', 'white'];
      phrases = {
        bothA: 'both balls are red',
        bothB: 'both balls are white',
        mixed: 'one ball is red and the other is white',
        same: 'both balls are of the same colour',
      };
    } else if (setting === 'bulbs') {
      a = r.int(2, 4);
      b2 = r.int(6, 11);
      intro = `A box contains ${a + b2} bulbs, of which ${a} are defective. Two bulbs are taken out at random.`;
      unit = 'bulbs';
      names = ['defective', 'good'];
      single = ['defective', 'good'];
      phrases = {
        bothA: 'both bulbs are defective',
        bothB: 'neither bulb is defective',
        mixed: 'exactly one of the two bulbs is defective',
      };
    } else {
      a = r.int(3, 9);
      b2 = r.int(3, 9);
      intro = `A class has ${a} boys and ${b2} girls. Two students are chosen at random.`;
      unit = 'students';
      names = ['boys', 'girls'];
      single = ['boy', 'girl'];
      phrases = {
        bothA: 'both are boys',
        bothB: 'both are girls',
        mixed: 'one is a boy and the other is a girl',
      };
    }
    const groups = third ? [a, b2, third.count] : [a, b2];
    const n = groups.reduce((acc, k) => acc + k, 0);
    const total = nCr(n, 2);
    const asks = phrases.same ? (['bothA', 'bothB', 'mixed', 'same'] as const) : (['bothA', 'bothB', 'mixed'] as const);
    const ask = r.pick<(typeof asks)[number]>(asks);
    const over = (x: number, y: number): Fraction => new Fraction(x, y);
    let fav: number;
    let wrong: Fraction[];
    let how: string;
    if (ask === 'bothA' || ask === 'bothB') {
      const k = ask === 'bothA' ? a : b2;
      const name = ask === 'bothA' ? names[0] : names[1];
      fav = nCr(k, 2);
      // with replacement; a single draw; reduced the numerator but not the denominator
      wrong = [over(k * k, n * n), over(k, n), over(k * (k - 1), n * n)];
      if (third) wrong.unshift(over(fav, nCr(a + b2, 2))); // left the third colour out of the total
      how = tex`Both ${name}: $${C(k, 2)} = ${fav}$ ways.`;
    } else if (ask === 'mixed') {
      fav = a * b2;
      // order counted in the total only; with replacement (both orders); with replacement (one order)
      wrong = [over(a * b2, n * (n - 1)), over(2 * a * b2, n * n), over(a * b2, n * n)];
      how = tex`One ${single[0]} and one ${single[1]}: $${a} \times ${b2} = ${fav}$ ways.`;
    } else {
      fav = groups.reduce((acc, k) => acc + nCr(k, 2), 0);
      // only one colour; with replacement; the complementary event
      wrong = [
        over(nCr(a, 2), total),
        over(groups.reduce((acc, k) => acc + k * k, 0), n * n),
        over(total - fav, total),
      ];
      const which = third ? `Both red, both white or both ${third.colour}` : 'Both red or both white';
      how = tex`${which}: $${groups.map((k) => C(k, 2)).join(' + ')} = ${groups.map((k) => nCr(k, 2)).join(' + ')} = ${fav}$ ways.`;
    }
    return {
      stem: `${intro} The probability that ${phrases[ask] ?? ''} is:`,
      ...probOptions(r, over(fav, total), wrong),
      explanation: tex`Two of the ${n} ${unit} can be chosen in $${C(n, 2)} = ${total}$ ways. ${how} Hence $P = ${ratioTex(fav, total)}$.`,
    };
  }),

  // ============================================================ addition and multiplication laws
  b.dynamic('addition-law', { difficulty: 1, tags: ['probability', 'addition and multiplication laws'] }, (r) => {
    const kind = r.pick(['union', 'union', 'intersection', 'exclusive', 'exhaustive'] as const);
    if (kind === 'union' || kind === 'intersection') {
      const both = r.multiple(5, 25, 5);
      const pa = r.multiple(both + 10, 70, 5);
      const pb = r.multiple(both + 10, Math.min(70, 95 - pa + both), 5);
      const union = pa + pb - both;
      if (kind === 'union') {
        return {
          stem: tex`If $P(A) = ${dec(pa)}$, $P(B) = ${dec(pb)}$ and $P(A \cap B) = ${dec(both)}$, then $P(A \cup B)$ is equal to:`,
          // overlap not subtracted; exactly one of A, B; neither
          ...decOptions(r, union, [pa + pb, pa + pb - 2 * both, 100 - union]),
          explanation: tex`By the addition law, $P(A \cup B) = P(A) + P(B) - P(A \cap B) = ${dec(pa)} + ${dec(pb)} - ${dec(both)} = ${dec(union)}$.`,
        };
      }
      return {
        stem: tex`If $P(A) = ${dec(pa)}$, $P(B) = ${dec(pb)}$ and $P(A \cup B) = ${dec(union)}$, then $P(A \cap B)$ is equal to:`,
        // assumed independence; B only; A only; neither
        ...decOptions(r, both, [(pa * pb) / 100, union - pa, union - pb, 100 - union]),
        explanation: tex`From the addition law, $P(A \cap B) = P(A) + P(B) - P(A \cup B) = ${dec(pa)} + ${dec(pb)} - ${dec(union)} = ${dec(both)}$.`,
      };
    }
    if (kind === 'exclusive') {
      const pa = r.multiple(10, 60, 10);
      const pb = r.multiple(10, 90 - pa, 10);
      const union = pa + pb;
      return {
        stem: tex`$A$ and $B$ are mutually exclusive events with $P(A) = ${dec(pa)}$ and $P(B) = ${dec(pb)}$. Then $P(A \cup B)$ is equal to:`,
        // treated as independent; product; difference
        ...decOptions(r, union, [union - (pa * pb) / 100, (pa * pb) / 100, Math.abs(pa - pb)]),
        explanation: tex`Mutually exclusive events cannot occur together, so $P(A \cap B) = 0$ and $P(A \cup B) = P(A) + P(B) = ${dec(pa)} + ${dec(pb)} = ${dec(union)}$.`,
      };
    }
    const k = r.int(2, 5);
    const askA = r.chance(0.5);
    return {
      stem: tex`$A$ and $B$ are mutually exclusive and exhaustive events with $P(A) = ${k}\,P(B)$. Then $P(${askA ? 'A' : 'B'})$ is equal to:`,
      ...probOptions(
        r,
        askA ? new Fraction(k, k + 1) : new Fraction(1, k + 1),
        askA
          ? [new Fraction(1, k + 1), new Fraction(k - 1, k), new Fraction(k, k + 2)]
          : [new Fraction(k, k + 1), new Fraction(1, k), new Fraction(1, k + 2)],
      ),
      explanation: tex`Mutually exclusive and exhaustive events satisfy $P(A) + P(B) = 1$, so $${k}\,P(B) + P(B) = 1$, giving $P(B) = \frac{1}{${k + 1}}$ and $P(A) = \frac{${k}}{${k + 1}}$.`,
    };
  }),

  b.dynamic('divisible-by-a-or-b', { difficulty: 2, tags: ['probability', 'addition and multiplication laws'] }, (r) => {
    const [a, c] = r.pick([
      [2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7], [3, 7], [4, 6], [6, 8], [6, 9], [4, 10], [5, 7],
    ] as const);
    const l = lcm(a, c);
    const N = r.pick([20, 30, 40, 50, 60, 100].filter((x) => x >= 2 * l));
    const na = Math.floor(N / a);
    const nc = Math.floor(N / c);
    const nl = Math.floor(N / l);
    const fav = na + nc - nl;
    const wrong = [new Fraction(na + nc, N), new Fraction(nl, N), new Fraction(na + nc - 2 * nl, N)];
    if (l !== a * c) wrong.unshift(new Fraction(na + nc - Math.floor(N / (a * c)), N)); // used ab instead of the LCM
    return {
      stem: `A number is chosen at random from the integers 1 to ${N}. The probability that it is divisible by ${a} or ${c} is:`,
      ...probOptions(r, new Fraction(fav, N), wrong),
      explanation: tex`Multiples of ${a}: ${na}; multiples of ${c}: ${nc}; multiples of both, i.e. of ${l}: ${nl}. By the addition law, $P = \frac{${na} + ${nc} - ${nl}}{${N}} = ${ratioTex(fav, N)}$.`,
    };
  }),

  b.dynamic('independent-events', { difficulty: 2, tags: ['probability', 'addition and multiplication laws'] }, (r) => {
    const [p, q] = r.sample(SIMPLE_PROBS, 2) as [Fraction, Fraction];
    const one = new Fraction(1);
    const notP = one.sub(p);
    const notQ = one.sub(q);
    const both = p.mul(q);
    const neither = notP.mul(notQ);
    const atLeast = one.sub(neither);
    const exactly = p.mul(notQ).add(notP.mul(q));
    const [pt, qt] = [p.toTex(), q.toTex()];
    const setting = r.pick(['problem', 'target', 'events'] as const);
    const ask = r.pick(['at-least-one', 'at-least-one', 'both', 'exactly-one', 'neither'] as const);

    const intro = {
      problem: tex`The probabilities that two students A and B can solve a problem are $${pt}$ and $${qt}$ respectively. They try it independently.`,
      target: tex`The probabilities that two marksmen hit a target are $${pt}$ and $${qt}$ respectively. Each fires one shot, independently.`,
      events: tex`$A$ and $B$ are independent events with $P(A) = ${pt}$ and $P(B) = ${qt}$.`,
    }[setting];
    const phrase = {
      problem: { 'at-least-one': 'the problem is solved', both: 'both of them solve it', 'exactly-one': 'exactly one of them solves it', neither: 'the problem remains unsolved' },
      target: { 'at-least-one': 'the target is hit', both: 'both shots hit the target', 'exactly-one': 'exactly one shot hits the target', neither: 'the target is not hit' },
      events: { 'at-least-one': 'at least one of $A$ and $B$ occurs', both: 'both $A$ and $B$ occur', 'exactly-one': 'exactly one of $A$ and $B$ occurs', neither: 'neither $A$ nor $B$ occurs' },
    }[setting][ask];
    const fails = tex`$(1 - ${pt})(1 - ${qt}) = ${notP.toTex()} \times ${notQ.toTex()} = ${neither.toTex()}$`;
    const none = { problem: 'neither student solves it', target: 'neither shot hits', events: 'neither event occurs' }[setting];

    let correct: Fraction;
    let wrong: Fraction[];
    let explanation: string;
    if (ask === 'at-least-one') {
      correct = atLeast;
      // added the probabilities; both; exactly one; "not both"
      wrong = [p.add(q), both, exactly, one.sub(both)];
      explanation = tex`By independence, the probability that ${none} is ${fails}. Hence the required probability is $1 - ${neither.toTex()} = ${atLeast.toTex()}$.`;
    } else if (ask === 'both') {
      correct = both;
      wrong = [p.add(q), atLeast, exactly];
      explanation = tex`For independent events, $P(A \cap B) = P(A)\,P(B) = ${pt} \times ${qt} = ${both.toTex()}$.`;
    } else if (ask === 'exactly-one') {
      correct = exactly;
      // at least one; only the first succeeds; the complement (both or neither)
      wrong = [atLeast, p.mul(notQ), both.add(neither), p.add(q)];
      explanation = tex`Either only the first happens or only the second: $${pt} \times ${notQ.toTex()} + ${notP.toTex()} \times ${qt} = ${p.mul(notQ).toTex()} + ${notP.mul(q).toTex()} = ${exactly.toTex()}$.`;
    } else {
      correct = neither;
      // 1 - p - q; both; at least one; "not both"
      wrong = [one.sub(p).sub(q), both, atLeast, one.sub(both)];
      explanation = tex`By independence, the probability that ${none} is ${fails}.`;
    }
    return { stem: `${intro} The probability that ${phrase} is:`, ...probOptions(r, correct, wrong), explanation };
  }),

  b.dynamic('counting-principle', { difficulty: 1, tags: ['addition and multiplication laws'] }, (r) => {
    const kind = r.pick(['menu', 'round-trip', 'answers', 'sample-space', 'either-or'] as const);
    if (kind === 'menu') {
      const [a, m, d] = [r.int(3, 6), r.int(3, 8), r.int(2, 5)];
      const correct = a * m * d;
      return {
        stem: `A restaurant offers ${a} starters, ${m} main courses and ${d} desserts. In how many ways can a customer choose a meal of one starter, one main course and one dessert?`,
        // added; any 3 dishes; ordered the courses
        ...intOptions(r, correct, [a + m + d, nCr(a + m + d, 3), 6 * correct]),
        explanation: tex`By the multiplication law: $${a} \times ${m} \times ${d} = ${correct}$.`,
      };
    }
    if (kind === 'round-trip') {
      const [p, q] = [r.int(2, 5), r.int(2, 5)];
      const oneWay = p * q;
      const correct = oneWay * oneWay;
      return {
        stem: `There are ${p} roads from town A to town B and ${q} roads from town B to town C. In how many ways can a person travel from A to C through B and come back to A through B?`,
        // one way only; doubled instead of squared; added the roads
        ...intOptions(r, correct, [oneWay, 2 * oneWay, (p + q) ** 2]),
        explanation: tex`Going from A to C: $${p} \times ${q} = ${oneWay}$ ways; coming back: again $${oneWay}$ ways. By the multiplication law the total is $${oneWay} \times ${oneWay} = ${correct}$.`,
      };
    }
    if (kind === 'answers') {
      const n = r.int(5, 8);
      const k = r.int(2, 4);
      const correct = k ** n;
      const each = k === 2 ? '2 options (True or False)' : `${k} options`;
      return {
        stem: `A test has ${n} questions, each with ${each}. In how many different ways can a student answer all the questions (one option per question)?`,
        // multiplied; base and power swapped
        ...intOptions(r, correct, [k * n, n ** k]),
        explanation: tex`Each question can be answered in ${k} ways, so by the multiplication law the number of ways is $${k}^{${n}} = ${int(correct)}$.`,
      };
    }
    if (kind === 'sample-space') {
      const nc = r.int(1, 3);
      const nd = nc === 1 ? 2 : r.int(1, 2);
      const correct = 2 ** nc * 6 ** nd;
      const coinsText = nc === 1 ? 'A coin is' : `${cap(word(nc))} coins are`;
      const diceText = nd === 1 ? 'a die is' : `${word(nd)} dice are`;
      return {
        stem: `${coinsText} tossed and ${diceText} thrown together. The number of outcomes in the sample space is:`,
        // added; multiplied the counts; added the two sample spaces
        ...intOptions(r, correct, [2 * nc + 6 * nd, 2 * nc * 6 * nd, 2 ** nc + 6 ** nd]),
        explanation: tex`Each coin has 2 outcomes and each die 6, so the sample space has $2^{${nc}} \times 6^{${nd}} = ${2 ** nc} \times ${6 ** nd} = ${int(correct)}$ outcomes.`,
      };
    }
    const [a, c] = [r.int(3, 8), r.int(3, 8)];
    return {
      stem: `A student must choose one optional subject, either from a group of ${a} science subjects or from a group of ${c} arts subjects. In how many ways can the choice be made?`,
      // multiplied instead of added; chose two subjects
      ...intOptions(r, a + c, [a * c, nCr(a + c, 2)]),
      explanation: tex`Only one subject is chosen, from one group or the other, so by the addition law the number of ways is $${a} + ${c} = ${a + c}$.`,
    };
  }),

  // ============================================================ fixed questions
  ...b.mcqs([
    {
      id: 'npr-over-ncr',
      d: 1,
      o: 'past-paper',
      t: ['permutations', 'combinations'],
      q: tex`$\frac{${P('n', 'r')}}{${C('n', 'r')}}$ is equal to:`,
      a: tex`$r!$`,
      x: [tex`$(n-r)!$`, tex`$n!$`, tex`$\frac{1}{r!}$`],
      e: tex`$${P('n', 'r')} = \frac{n!}{(n-r)!}$ and $${C('n', 'r')} = \frac{n!}{r!\,(n-r)!}$, so the ratio is $r!$: each selection of $r$ objects can be ordered in $r!$ ways.`,
    },
    {
      id: 'pascal-rule',
      d: 1,
      t: ['combinations'],
      q: tex`$${C('n', 'r')} + ${C('n', 'r-1')}$ is equal to:`,
      a: tex`$${C('n+1', 'r')}$`,
      x: [tex`$${C('n+1', 'r-1')}$`, tex`$${C('n', 'r+1')}$`, tex`$${C('2n', '2r-1')}$`],
      e: tex`Choose $r$ objects from $n + 1$: a particular object is either left out ($${C('n', 'r')}$ ways) or included ($${C('n', 'r-1')}$ ways). Hence $${C('n', 'r')} + ${C('n', 'r-1')} = ${C('n+1', 'r')}$.`,
    },
    {
      id: 'leap-year-53-sundays',
      d: 2,
      o: 'past-paper',
      t: ['probability'],
      q: 'A leap year is selected at random. The probability that it contains 53 Sundays is:',
      a: tex`$\frac{2}{7}$`,
      x: [tex`$\frac{1}{7}$`, tex`$\frac{53}{366}$`, tex`$\frac{3}{7}$`],
      e: tex`A leap year has $366 = 52 \times 7 + 2$ days: 52 full weeks (52 Sundays) and 2 extra consecutive days. These two days are one of 7 equally likely pairs (Sun-Mon, Mon-Tue, ..., Sat-Sun), and 2 of the pairs contain a Sunday, so $P = \frac{2}{7}$.`,
    },
    {
      id: 'two-aces-without-replacement',
      d: 2,
      o: 'past-paper',
      t: ['probability', 'combinations'],
      q: 'Two cards are drawn at random, without replacement, from a well-shuffled pack of 52 playing cards. The probability that both are aces is:',
      a: tex`$\frac{1}{221}$`,
      x: [tex`$\frac{1}{169}$`, tex`$\frac{3}{26}$`, tex`$\frac{2}{13}$`],
      e: tex`Two cards can be chosen in $${C(52, 2)} = 1326$ ways and two aces in $${C(4, 2)} = 6$ ways, so $P = \frac{6}{1326} = \frac{1}{221}$ (equivalently $\frac{4}{52} \times \frac{3}{51}$). The value $\frac{1}{169}$ would be correct only with replacement.`,
    },
    {
      id: 'independent-not-exclusive',
      d: 3,
      t: ['addition and multiplication laws'],
      q: tex`If $A$ and $B$ are independent events with $P(A) > 0$ and $P(B) > 0$, then $A$ and $B$:`,
      a: 'cannot be mutually exclusive',
      x: ['must be mutually exclusive', 'must be exhaustive', tex`must satisfy $P(A \cup B) = P(A) + P(B)$`],
      e: tex`Independence gives $P(A \cap B) = P(A)\,P(B) > 0$, so $A$ and $B$ can occur together: they are not mutually exclusive, and $P(A \cup B) = P(A) + P(B) - P(A)P(B) < P(A) + P(B)$. Nothing forces $P(A \cup B) = 1$, so they need not be exhaustive.`,
    },
    {
      id: 'prizes-to-students',
      d: 2,
      t: ['addition and multiplication laws', 'permutations'],
      q: 'In how many ways can 4 different prizes be given to 3 students if a student may receive any number of prizes?',
      a: '$81$',
      x: ['$64$', '$24$', '$12$'],
      e: tex`Each of the 4 prizes can go to any of the 3 students, so by the multiplication law the number of ways is $3 \times 3 \times 3 \times 3 = 3^{4} = 81$. (The value $4^{3} = 64$ wrongly lets each student choose a prize.)`,
    },
    {
      id: 'most-likely-dice-total',
      d: 1,
      t: ['probability'],
      q: 'Two fair dice are thrown. Which total is the most likely to occur?',
      a: '$7$',
      x: ['$6$', '$8$', '$12$'],
      e: tex`The totals 2 to 12 occur in 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1 of the 36 equally likely outcomes. A total of 7 occurs in 6 ways, more than any other, so $P(7) = \frac{6}{36} = \frac{1}{6}$; totals 6 and 8 occur in only 5 ways each.`,
    },
    {
      id: 'divisible-by-four-arrangement',
      d: 3,
      t: ['permutations', 'probability'],
      q: 'The digits 1, 2, 3, 4 and 5 are arranged at random to form a five-digit number, each digit being used once. The probability that the number is divisible by 4 is:',
      a: tex`$\frac{1}{5}$`,
      x: [tex`$\frac{1}{4}$`, tex`$\frac{2}{5}$`, tex`$\frac{4}{25}$`],
      e: tex`A number is divisible by 4 when its last two digits are. The possible endings are 12, 24, 32 and 52, and for each the other three digits can be arranged in $3! = 6$ ways: $4 \times 6 = 24$ numbers out of $5! = 120$. Hence $P = \frac{24}{120} = \frac{1}{5}$.`,
    },
    {
      id: 'not-a-probability',
      d: 1,
      t: ['probability'],
      q: 'Which of the following cannot be the probability of an event?',
      a: tex`$\frac{6}{5}$`,
      x: ['$0$', '$1$', tex`$\frac{5}{6}$`],
      e: tex`For every event $E$, $0 \le P(E) \le 1$. The values $0$ (impossible event), $1$ (sure event) and $\frac{5}{6}$ are all possible, but $\frac{6}{5} > 1$ is not.`,
    },
  ]),
]);
