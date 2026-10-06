import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  factorial,
  frac,
  Fraction,
  nCr,
  num,
  numericOptions,
  paren,
  pickDistractors,
  polyTex,
  range,
  signedSum,
  tex,
} from '@/engine/helpers';

/*
 * Mathematical Induction and Binomial Theorem (FSc Part I).
 *
 * - mathematical induction: divisibility for every n, the least n for an inequality, the
 *   inductive step, a statement whose inductive step works although its base case fails.
 * - binomial expansion: number of terms, sums of coefficients, (a + b)^n ± (a - b)^n with surds,
 *   the sum of r·C(n, r).
 * - general term: coefficient of x^k, the k-th term, the k-th term from the end, equal coefficients.
 * - middle term (one or two, n from the middle term); term independent of x.
 * - binomial series: standard expansions of (1 ± x)^-1 and (1 ± x)^-2, coefficients and validity
 *   of (a + bx)^m, small-x approximations, summing a series.
 *
 * Generators that compute a coefficient or a count re-derive it by brute-force expansion and
 * throw on a mismatch, so a wrong key fails the bank gate instead of reaching a paper.
 */

// ---------------------------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------------------------

/** Repeats a parameter draw until it is acceptable (the ranges make rejections rare). */
function draw<T>(make: () => T, ok: (value: T) => boolean): T {
  for (let i = 0; i < 500; i++) {
    const value = make();
    if (ok(value)) return value;
  }
  throw new Error('induction-binomial: no acceptable parameters found');
}

/** Throws when an internal self-check fails; the bank gate then reports the template. */
function verify(condition: boolean, what: string): void {
  if (!condition) throw new Error(`induction-binomial self-check failed: ${what}`);
}

/** 1 -> 1st, 2 -> 2nd, 3 -> 3rd, 12 -> 12th, 22 -> 22nd. */
function nth(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const last = n % 10;
  return `${n}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`;
}

/** `x`, `x^{3}`: a power of a variable (the exponent 1 is not written). */
const pow = (e: number, v = 'x'): string => (e === 1 ? v : `${v}^{${e}}`);

/** Monomial c·x^e: a constant when e = 0 and a fraction such as `\frac{20}{x^{3}}` when e < 0. */
function monoX(c: number, e: number): string {
  if (e === 0) return num(c);
  if (e > 0) return coefTex(c, pow(e));
  return `${c < 0 ? '-' : ''}\\frac{${num(Math.abs(c))}}{${pow(-e)}}`;
}

/** `35 \times 8 \times (-1)`: the factors of a worked product, dropping factors equal to 1. */
function timesTex(factors: readonly number[]): string {
  return factors
    .filter((f, i) => i === 0 || f !== 1)
    .map((f, i) => (i === 0 ? num(f) : paren(f)))
    .join(' \\times ');
}

/** `35 \times 8 = 280` (or just `35` when nothing is multiplied). */
function productTex(factors: readonly number[], value: number): string {
  const work = timesTex(factors);
  return work === num(value) ? work : `${work} = ${num(value)}`;
}

/** `(3)^{n-r}` in a worked solution; empty when the base is 1, and `(3)` for the exponent 1. */
const powerOf = (base: number, e: string | number): string =>
  base === 1 ? '' : e === 1 ? `(${base})` : `(${base})^{${e}}`;

/** Exponent as written in a power: `3`, `-2`, `1/2`, `-3/2`. */
const expTex = (m: Fraction): string => (m.isInteger() ? String(m.n) : `${m.n}/${m.d}`);

/** `1 + 2x`, `1 - x`. */
const onePlus = (a: number): string => `1 ${a < 0 ? '-' : '+'} ${coefTex(Math.abs(a), 'x')}`;

/** `1 + \frac{5}{2}x`, `1 - 3x`: a first-order approximation. */
const linear = (c: Fraction): string => signedSum([[1, ''], [c, 'x']]);

/** `$...$`-wrapped exact fraction. */
const fracOption = (f: Fraction): string => `$${f.toTex()}$`;

/** m(m - 1)(m - 2)...(m - k + 1). */
function falling(m: Fraction, k: number): Fraction {
  let out = frac(1);
  for (let i = 0; i < k; i++) out = out.mul(m.sub(i));
  return out;
}

/** m(m + 1)(m + 2)...(m + k - 1). */
function rising(m: Fraction, k: number): Fraction {
  let out = frac(1);
  for (let i = 0; i < k; i++) out = out.mul(m.add(i));
  return out;
}

/** A Laurent polynomial in x as a map power -> coefficient (used only for self-checks). */
type Poly = Map<number, number>;

function multiply(a: Poly, b: Poly): Poly {
  const out: Poly = new Map();
  for (const [e1, c1] of a) {
    for (const [e2, c2] of b) out.set(e1 + e2, (out.get(e1 + e2) ?? 0) + c1 * c2);
  }
  return out;
}

/** Brute-force expansion of (c1·x^e1 + c2·x^e2 + ...)^n; `terms` holds [coefficient, power] pairs. */
function expand(terms: ReadonlyArray<readonly [number, number]>, n: number): Poly {
  const base: Poly = new Map();
  for (const [c, e] of terms) base.set(e, (base.get(e) ?? 0) + c);
  let out: Poly = new Map([[0, 1]]);
  for (let i = 0; i < n; i++) out = multiply(out, base);
  return out;
}

const countTerms = (p: Poly): number => [...p.values()].filter((c) => c !== 0).length;

/** Variable pairs for symbolic binomials. */
const LETTERS = [
  ['a', 'b'],
  ['x', 'y'],
  ['p', 'q'],
] as const;

/** [p, q] in (A x^p + B / x^q)^n; (1, 1) is listed twice so the classic form appears more often. */
const INDEPENDENT_POWERS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [1, 1], [2, 1], [1, 2], [3, 1], [1, 3], [3, 2], [2, 3],
];
const MIDDLE_POWERS: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, 1], [2, 1], [1, 2], [3, 1], [1, 3]];

/** Indices that are not positive integers, so the binomial series is infinite. */
const SERIES_INDICES = [frac(-2), frac(-3), frac(1, 2), frac(-1, 2), frac(1, 3), frac(-1, 3), frac(3, 2), frac(-3, 2)];
/** Indices for small-x approximations: numerator or product factors, and denominator factors. */
const APPROX_INDICES = [frac(1, 2), frac(-1, 2), frac(1, 3), frac(-1, 3), frac(2), frac(-2), frac(3), frac(-1), frac(3, 2)];
const DENOMINATOR_INDICES = [frac(1), frac(2), frac(3), frac(1, 2), frac(1, 3)];

interface DivisibilityFact {
  expr: string;
  value: (n: number) => number;
  answer: number;
  /** Each fails for some small n (checked at generation time). */
  wrong: readonly number[];
  why: string;
}

/** Polynomial expressions that are divisible by a fixed number for every positive integer n. */
const POLYNOMIAL_DIVISIBILITY: readonly DivisibilityFact[] = [
  {
    expr: 'n^{3} - n',
    value: (n) => n ** 3 - n,
    answer: 6,
    wrong: [4, 5, 9, 12],
    why: tex`$n^{3} - n = (n - 1)n(n + 1)$ is a product of three consecutive integers, so it is divisible by $2$ and by $3$, hence by $6$. For $n = 2$ its value is $6$, which is not divisible by any of the other options.`,
  },
  {
    expr: 'n(n + 1)(n + 2)',
    value: (n) => n * (n + 1) * (n + 2),
    answer: 6,
    wrong: [4, 5, 9, 12],
    why: tex`Among three consecutive integers one is even and one is a multiple of $3$, so the product is divisible by $6$. For $n = 1$ its value is $6$, which is not divisible by any of the other options.`,
  },
  {
    expr: 'n^{3} + 5n',
    value: (n) => n ** 3 + 5 * n,
    answer: 6,
    wrong: [4, 5, 9, 12],
    why: tex`$n^{3} + 5n = (n^{3} - n) + 6n = (n - 1)n(n + 1) + 6n$, and both parts are multiples of $6$. For $n = 1$ its value is $6$, which is not divisible by any of the other options.`,
  },
  {
    expr: '2n^{3} + 3n^{2} + n',
    value: (n) => 2 * n ** 3 + 3 * n ** 2 + n,
    answer: 6,
    wrong: [4, 5, 9, 12],
    why: tex`$2n^{3} + 3n^{2} + n = n(n + 1)(2n + 1) = 6\left(1^{2} + 2^{2} + \cdots + n^{2}\right)$, a multiple of $6$. For $n = 1$ its value is $6$, which is not divisible by any of the other options.`,
  },
  {
    expr: 'n^{2} + n',
    value: (n) => n * n + n,
    answer: 2,
    wrong: [3, 4, 5, 6],
    why: tex`$n^{2} + n = n(n + 1)$, and one of two consecutive integers is even. For $n = 1$ its value is $2$, which is not divisible by any of the other options.`,
  },
  {
    expr: 'n^{3} + 2n',
    value: (n) => n ** 3 + 2 * n,
    answer: 3,
    wrong: [2, 4, 6, 9],
    why: tex`$n^{3} + 2n = (n - 1)n(n + 1) + 3n$, a sum of two multiples of $3$. For $n = 1$ its value is $3$, which is not divisible by any of the other options.`,
  },
];

export default defineBank('mathematics', 'induction-binomial', (b) => [
  // -------------------------------------------------------------------------------------------
  // General term
  // -------------------------------------------------------------------------------------------
  b.dynamic(
    'coefficient-in-linear-binomial',
    { difficulty: 1, origin: 'past-paper', tags: ['general term', 'binomial expansion'] },
    (r) => {
      // (c + dx)^n or (dx + c)^n; at most one of the two terms is negative.
      const { n, k, c, d, constFirst } = draw(
        () => {
          const n = r.int(4, 9);
          const constFirst = r.chance(0.6);
          return {
            n,
            constFirst,
            k: r.int(2, n - 1),
            c: r.pick([1, 2, 3]) * (constFirst ? 1 : r.sign()),
            d: r.pick([1, 2, 3]) * (constFirst ? r.sign() : 1),
          };
        },
        // |c| = |d| > 1 gives odd-looking binomials such as (2 + 2x)^n; the cap keeps the
        // arithmetic mental (35 x 81, 20 x 8 x 27) for a one-step item.
        (s) =>
          Math.abs(s.c) + Math.abs(s.d) > 2 &&
          Math.abs(s.c) !== Math.abs(s.d) &&
          Math.abs(nCr(s.n, s.k) * s.c ** (s.n - s.k) * s.d ** s.k) <= 5000,
      );
      const C = nCr(n, k);
      const value = C * c ** (n - k) * d ** k;
      verify(expand([[c, 0], [d, 1]], n).get(k) === value, 'coefficient of x^k');

      const dx = coefTex(d, 'x');
      const expr = constFirst
        ? `(${c} ${d < 0 ? '-' : '+'} ${coefTex(Math.abs(d), 'x')})^{${n}}`
        : `(${dx} ${c < 0 ? '-' : '+'} ${Math.abs(c)})^{${n}}`;
      const wrong = [
        C * Math.abs(c) ** (n - k) * Math.abs(d) ** k, // dropped the minus sign
        ...r.shuffle([
          nCr(n, k - 1) * c ** (n - k + 1) * d ** (k - 1), // took r = k - 1, i.e. the k-th term
          C * c ** k * d ** (n - k), // exponents of the two terms interchanged
          C * c ** (n - k) * d, // wrote (dx)^k as d x^k
          C * d ** k, // forgot the power of the constant term
          c ** (n - k) * d ** k, // forgot the binomial coefficient
          nCr(n, k + 1) * c ** (n - k - 1) * d ** (k + 1), // coefficient of the next power
        ]),
      ].filter((v) => Math.abs(v) < 1e6);
      const { answer, distractors } = numericOptions(r, {
        correct: value,
        wrong,
        format: (v) => `$${num(v)}$`,
        allowNegative: true,
      });
      const xTerm = d === 1 ? 'x' : `(${dx})`;
      const explanation = constFirst
        ? tex`$T_{r+1} = \binom{${n}}{r}${powerOf(c, `${n}-r`)}${xTerm}^{r}$. The power of $x$ in $T_{r+1}$ is $r$, so take $r = ${k}$: the coefficient is $\binom{${n}}{${k}}${powerOf(c, n - k)}${powerOf(d, k)} = ${productTex([C, c ** (n - k), d ** k], value)}$.`
        : tex`$T_{r+1} = \binom{${n}}{r}${xTerm}^{${n}-r}${powerOf(c, 'r')}$. The power of $x$ in $T_{r+1}$ is $${n} - r$, so take $r = ${n - k}$: the coefficient is $\binom{${n}}{${n - k}}${powerOf(d, k)}${powerOf(c, n - k)} = ${productTex([C, d ** k, c ** (n - k)], value)}$.`;
      return {
        stem: tex`The coefficient of $x^{${k}}$ in the expansion of $${expr}$ is:`,
        answer,
        distractors,
        explanation,
      };
    },
  ),

  b.dynamic('term-position', { difficulty: 1, tags: ['general term', 'middle term'] }, (r) => {
    const [u, v] = r.pick(LETTERS);
    const kind = r.weighted(['middle', 'from-end', 'kth-term'] as const, [0.3, 0.3, 0.4]);

    if (kind === 'middle') {
      // Even n: one middle term; odd n: two (the classic trap). The stem does not say which.
      const n = r.int(6, 20);
      const stem = tex`Which term or terms are in the middle of the expansion of $(${u} + ${v})^{${n}}$?`;
      if (n % 2 === 0) {
        const m = n / 2;
        return {
          stem,
          answer: `${nth(m + 1)} term`,
          distractors: [`${nth(m)} term`, `${nth(m)} and ${nth(m + 1)} terms`, `${nth(m + 1)} and ${nth(m + 2)} terms`],
          explanation: tex`The expansion has $${n} + 1 = ${n + 1}$ terms, an odd number, so there is exactly one middle term: $T_{\frac{${n}}{2} + 1} = T_{${m + 1}}$, the ${nth(m + 1)} term.`,
        };
      }
      const m1 = (n + 1) / 2;
      const m2 = m1 + 1;
      return {
        stem,
        answer: `${nth(m1)} and ${nth(m2)} terms`,
        distractors: [`${nth(m2)} term`, `${nth(m1 - 1)} and ${nth(m1)} terms`, `${nth(m2)} and ${nth(m2 + 1)} terms`],
        explanation: tex`The expansion has $${n} + 1 = ${n + 1}$ terms, an even number, so there are two middle terms: $T_{\frac{${n} + 1}{2}} = T_{${m1}}$ and $T_{\frac{${n} + 3}{2}} = T_{${m2}}$, the ${nth(m1)} and ${nth(m2)} terms.`,
      };
    }

    if (kind === 'from-end') {
      const { n, k } = draw(
        () => {
          const n = r.int(6, 20);
          return { n, k: r.int(2, n - 1) };
        },
        (s) => 2 * s.k !== s.n + 2, // otherwise the k-th terms from both ends coincide
      );
      const position = n - k + 2;
      const answer = `${nth(position)} term`;
      return {
        stem: tex`In the expansion of $(${u} + ${v})^{${n}}$, the ${nth(k)} term from the end is which term from the beginning?`,
        answer,
        distractors: pickDistractors(
          answer,
          [n - k + 1, n - k + 3, k, n - k].filter((t) => t >= 1).map((t) => `${nth(t)} term`),
        ),
        explanation: tex`The expansion has $${n} + 1 = ${n + 1}$ terms, so the ${nth(k)} term from the end is term number $${n + 1} - ${k} + 1 = ${position}$ from the beginning.`,
      };
    }

    const n = r.int(6, 12);
    const k = r.int(3, n - 1);
    const term = (c: number, i: number, j: number): string => `$${coefTex(c, `${pow(i, u)}${pow(j, v)}`)}$`;
    const answer = term(nCr(n, k - 1), n - k + 1, k - 1);
    return {
      stem: tex`The ${nth(k)} term in the expansion of $(${u} + ${v})^{${n}}$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        term(nCr(n, k), n - k, k), // used r = k
        term(nCr(n, k - 1), k - 1, n - k + 1), // exponents interchanged
        term(nCr(n, k - 2), n - k + 2, k - 2), // used r = k - 2
        term(1, n - k + 1, k - 1), // binomial coefficient forgotten
      ]),
      explanation: tex`$T_{r+1} = \binom{${n}}{r}${u}^{${n}-r}${v}^{r}$, so the ${nth(k)} term has $r = ${k - 1}$: $T_{${k}} = \binom{${n}}{${k - 1}}${u}^{${n - k + 1}}${v}^{${k - 1}} = ${answer.slice(1, -1)}$.`,
    };
  }),

  b.dynamic('equal-coefficients', { difficulty: 2, origin: 'past-paper', tags: ['general term'] }, (r) => {
    const kind = r.weighted(['positions', 'powers', 'value'] as const, [0.4, 0.3, 0.3]);
    const options = (correct: number, wrong: readonly number[]) =>
      numericOptions(r, { correct, wrong, format: (v) => `$${v}$` });

    if (kind === 'positions') {
      const p = r.int(2, 9);
      const q = r.int(p + 2, p + 13);
      const n = p + q - 2;
      verify(nCr(n, p - 1) === nCr(n, q - 1), 'equal coefficients of two terms');
      const [s, t] = r.chance(0.5) ? [p, q] : [q, p];
      // Slips: using the positions as the indices (p + q), or C(n, r) = C(n, n - r) read as n = q - p.
      const { answer, distractors } = options(n, [p + q, p + q - 1, q - p, p + q - 3]);
      return {
        stem: tex`If the coefficients of the ${nth(s)} and ${nth(t)} terms in the expansion of $(1 + x)^{n}$ are equal, then $n$ is:`,
        answer,
        distractors,
        explanation: tex`The coefficient of $T_{r+1}$ in $(1 + x)^{n}$ is $\binom{n}{r}$, so $\binom{n}{${p - 1}} = \binom{n}{${q - 1}}$. As $${p - 1} \neq ${q - 1}$, this needs $${p - 1} + ${q - 1} = n$, so $n = ${n}$.`,
      };
    }

    if (kind === 'powers') {
      const a = r.int(2, 9);
      const c = r.int(a + 2, a + 12);
      verify(nCr(a + c, a) === nCr(a + c, c), 'equal coefficients of two powers');
      const [s, t] = r.chance(0.5) ? [a, c] : [c, a];
      const { answer, distractors } = options(a + c, [a + c - 2, a + c + 2, a + c - 1, c - a]);
      return {
        stem: tex`If the coefficients of $x^{${s}}$ and $x^{${t}}$ in the expansion of $(1 + x)^{n}$ are equal, then $n$ is:`,
        answer,
        distractors,
        explanation: tex`The coefficient of $x^{r}$ in $(1 + x)^{n}$ is $\binom{n}{r}$. Since $\binom{n}{${a}} = \binom{n}{${c}}$ with $${a} \neq ${c}$, we need $${a} + ${c} = n$, so $n = ${a + c}$.`,
      };
    }

    const a = r.int(2, 7);
    const c = r.int(a + 2, 16 - a);
    const n = a + c;
    const k = r.pick([2, 3]);
    const value = nCr(n, k);
    const [s, t] = r.chance(0.5) ? [a, c] : [c, a];
    const { answer, distractors } = options(value, [
      nCr(n - 1, k), // n off by one
      nCr(n + 1, k),
      value * factorial(k), // forgot to divide by k!
      nCr(c - a, k), // took n = c - a
    ]);
    const top = range(0, k - 1)
      .map((i) => n - i)
      .join(' \\times ');
    return {
      stem: tex`If $\binom{n}{${s}} = \binom{n}{${t}}$, then $\binom{n}{${k}}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`$\binom{n}{${a}} = \binom{n}{${c}}$ with $${a} \neq ${c}$ is possible only when $${a} + ${c} = n$, so $n = ${n}$. Hence $\binom{${n}}{${k}} = \frac{${top}}{${k}!} = ${value}$.`,
    };
  }),

  // -------------------------------------------------------------------------------------------
  // Term independent of x and middle term
  // -------------------------------------------------------------------------------------------
  b.dynamic(
    'term-independent-of-x',
    { difficulty: 2, origin: 'past-paper', tags: ['term independent of x', 'general term'] },
    (r) => {
      const { p, q, n, A, B } = draw(
        () => {
          const [p, q] = r.pick(INDEPENDENT_POWERS);
          const n = r.pick(range(4, 12).filter((v) => v % (p + q) === 0));
          return { p, q, n, A: r.pick([1, 1, 2, 3]), B: r.pick([1, 2, 3]) * r.sign() };
        },
        (s) => {
          const k = (s.p * s.n) / (s.p + s.q);
          return Math.abs(nCr(s.n, k) * s.A ** (s.n - k) * s.B ** k) <= 10000;
        },
      );
      // T_{k+1} = C(n, k) A^(n-k) B^k x^(p(n-k) - qk) is free of x when k = pn / (p + q).
      const k = (p * n) / (p + q);
      const C = nCr(n, k);
      const value = C * A ** (n - k) * B ** k;
      verify(expand([[A, p], [B, -q]], n).get(0) === value, 'term independent of x');

      const first = coefTex(A, pow(p));
      const second = `${B < 0 ? '-' : ''}\\frac{${Math.abs(B)}}{${pow(q)}}`;
      const expr = `\\left(${first} ${B < 0 ? '-' : '+'} \\frac{${Math.abs(B)}}{${pow(q)}}\\right)^{${n}}`;
      const power = `${p * n} - ${p + q}r`;
      const general = tex`T_{r+1} = \binom{${n}}{r}\left(${first}\right)^{${n}-r}\left(${second}\right)^{r} = \binom{${n}}{r}${powerOf(A, `${n}-r`)}${powerOf(B, 'r')}\,x^{${power}}`;

      if (r.chance(0.35)) {
        const position = k + 1;
        const answer = `${nth(position)} term`;
        // r itself (forgot the +1), the index found with the two terms interchanged, near misses.
        const candidates = [k, n - k + 1, k + 2, k - 1, k + 3]
          .filter((t) => t >= 1 && t <= n + 1)
          .map((t) => `${nth(t)} term`);
        return {
          stem: tex`Which term in the expansion of $${expr}$ is independent of $x$?`,
          answer,
          distractors: pickDistractors(answer, candidates),
          explanation: tex`$${general}$. This is free of $x$ when $${power} = 0$, i.e. $r = ${k}$, so the required term is $T_{${position}}$, the ${nth(position)} term.`,
        };
      }

      const wrong = [
        C * A ** (n - k) * Math.abs(B) ** k, // sign of the second term ignored
        ...r.shuffle([
          C * A ** k * B ** (n - k), // the two terms interchanged
          C, // numerical factors ignored
          nCr(n, k + 1) * A ** (n - k - 1) * B ** (k + 1), // a neighbouring term
          nCr(n, k - 1) * A ** (n - k + 1) * B ** (k - 1),
        ]),
      ].filter((v) => Math.abs(v) < 1e6);
      const { answer, distractors } = numericOptions(r, {
        correct: value,
        wrong,
        format: (v) => `$${num(v)}$`,
        allowNegative: true,
      });
      return {
        stem: tex`The term independent of $x$ in the expansion of $${expr}$ is:`,
        answer,
        distractors,
        explanation: tex`$${general}$. For the term independent of $x$, $${power} = 0$, so $r = ${k}$ and $T_{${k + 1}} = \binom{${n}}{${k}}${powerOf(A, n - k)}${powerOf(B, k)} = ${productTex([C, A ** (n - k), B ** k], value)}$.`,
      };
    },
  ),

  b.dynamic('middle-term', { difficulty: 2, origin: 'past-paper', tags: ['middle term'] }, (r) => {
    const { p, q, n, A, B } = draw(
      () => {
        const [p, q] = r.pick(MIDDLE_POWERS);
        return { p, q, n: r.pick([4, 6, 8, 10]), A: r.pick([1, 2, 3]), B: r.pick([1, 2, 3]) * r.sign() };
      },
      (s) => Math.abs(nCr(s.n, s.n / 2) * (s.A * s.B) ** (s.n / 2)) <= 10000,
    );
    const m = n / 2;
    // T_{k+1} = C(n, k) A^(n-k) B^k x^(p(n-k) - qk), as [coefficient, power of x].
    const termAt = (k: number): [number, number] => [nCr(n, k) * A ** (n - k) * B ** k, p * (n - k) - q * k];
    const [coef, e] = termAt(m);
    verify(expand([[A, p], [B, -q]], n).get(e) === coef, 'middle term');

    const answer = `$${monoX(coef, e)}$`;
    const candidates: Array<[number, number]> = [
      termAt(m - 1), // the term before the middle one
      termAt(m + 1), // the term after it
      [-coef, e], // sign slip
      [coef, (p + q) * m], // added the powers of x instead of subtracting them
      [nCr(n, m), e], // numerical factors left out
    ];
    const first = coefTex(A, pow(p));
    const second = `${B < 0 ? '-' : ''}\\frac{${Math.abs(B)}}{${pow(q)}}`;
    return {
      stem: tex`The middle term in the expansion of $\left(${first} ${B < 0 ? '-' : '+'} \frac{${Math.abs(B)}}{${pow(q)}}\right)^{${n}}$ is:`,
      answer,
      distractors: pickDistractors(
        answer,
        candidates.filter(([c]) => Math.abs(c) < 1e6).map(([c, power]) => `$${monoX(c, power)}$`),
      ),
      explanation: tex`Since $n = ${n}$ is even, there are $${n + 1}$ terms and the middle one is $T_{\frac{${n}}{2} + 1} = T_{${m + 1}}$: $T_{${m + 1}} = \binom{${n}}{${m}}\left(${first}\right)^{${m}}\left(${second}\right)^{${m}} = ${timesTex([nCr(n, m), A ** m, B ** m])}\,x^{${p * m} - ${q * m}} = ${monoX(coef, e)}$.`,
    };
  }),

  // -------------------------------------------------------------------------------------------
  // Binomial expansion
  // -------------------------------------------------------------------------------------------
  b.dynamic('number-of-terms', { difficulty: 2, tags: ['binomial expansion'] }, (r) => {
    const kind = r.pick(['sum', 'difference', 'square', 'product'] as const);
    const build = (stem: string, correct: number, wrong: readonly number[], explanation: string) => {
      const { answer, distractors } = numericOptions(r, { correct, wrong, format: (v) => `$${v}$` });
      return { stem, answer, distractors, explanation };
    };

    if (kind === 'sum' || kind === 'difference') {
      const [u, v] = r.pick(LETTERS);
      const n = r.int(5, 20);
      const plus = kind === 'sum';
      const sign = plus ? '+' : '-';
      // Count the surviving terms by expanding in powers of the second letter.
      const first = expand([[1, 0], [1, 1]], n);
      const second = expand([[1, 0], [-1, 1]], n);
      const combined: Poly = new Map([...first].map(([e, c]) => [e, c + (plus ? 1 : -1) * (second.get(e) ?? 0)]));
      const correct = countTerms(combined);
      const survivors = range(0, n).filter((k) => (k % 2 === 0) === plus);
      verify(correct === survivors.length, 'number of terms (sum or difference)');
      const list =
        survivors.length <= 4
          ? survivors.join(', ')
          : `${survivors.slice(0, 3).join(', ')}, \\ldots, ${survivors[survivors.length - 1]}`;
      return build(
        tex`The number of terms in the expansion of $(${u} + ${v})^{${n}} ${sign} (${u} - ${v})^{${n}}$ is:`,
        correct,
        // all n + 1 terms, both expansions counted, the cancelled terms counted instead, ...
        [n + 1, 2 * (n + 1), plus ? Math.ceil(n / 2) : Math.floor(n / 2) + 1, correct + 1, n],
        tex`The terms with ${plus ? 'odd' : 'even'} powers of $${v}$ cancel and the others double, so only the terms containing $${v}^{r}$ with $r = ${list}$ survive: $${correct}$ terms.`,
      );
    }

    if (kind === 'square') {
      const n = r.int(3, 15);
      const p0 = r.pick([1, 2, 3]);
      const q0 = r.pick([1, 2, 3]);
      const s = r.sign();
      const trinomial = polyTex([q0 * q0, 2 * p0 * q0 * s, p0 * p0]);
      const base = signedSum([[q0, 'x'], [s * p0, '']]);
      const correct = countTerms(expand([[q0 * q0, 2], [2 * p0 * q0 * s, 1], [p0 * p0, 0]], n));
      verify(correct === 2 * n + 1, 'number of terms (perfect square)');
      return build(
        tex`The number of terms in the expansion of $(${trinomial})^{${n}}$ is:`,
        correct,
        // treated as a binomial power n, forgot the +1, trinomial count formula, ...
        [n + 1, 2 * n, 2 * n + 2, ((n + 1) * (n + 2)) / 2, 3 * n],
        tex`$${trinomial} = (${base})^{2}$, so the expression equals $(${base})^{${2 * n}}$, whose expansion has $${2 * n} + 1 = ${2 * n + 1}$ terms.`,
      );
    }

    const n = r.int(4, 15);
    const [u, v] = r.pick(LETTERS);
    const useOne = r.chance(0.5);
    const left = useOne ? `(1 + x)^{${n}}(1 - x)^{${n}}` : `(${u} + ${v})^{${n}}(${u} - ${v})^{${n}}`;
    const right = useOne ? `(1 - x^{2})^{${n}}` : `(${u}^{2} - ${v}^{2})^{${n}}`;
    const correct = countTerms(multiply(expand([[1, 0], [1, 1]], n), expand([[1, 0], [-1, 1]], n)));
    verify(correct === n + 1, 'number of terms (product)');
    return build(
      tex`The number of terms in the expansion of $${left}$ is:`,
      correct,
      // degree 2n suggests 2n + 1 terms; both expansions counted; terms multiplied pairwise
      [2 * n + 1, 2 * n + 2, (n + 1) ** 2, n, 2 * n],
      tex`$${left} = ${right}$, and this expansion has $${n} + 1 = ${n + 1}$ terms (only even powers appear).`,
    );
  }),

  b.dynamic(
    'binomial-basics',
    { difficulty: 1, tags: ['binomial expansion', 'middle term', 'binomial series'] },
    (r) => {
      const kind = r.weighted(['count', 'terms-to-n', 'middle-to-n', 'series'] as const, [0.3, 0.2, 0.25, 0.25]);
      const [u, v] = r.pick(LETTERS);
      const options = (correct: number, wrong: readonly number[]) =>
        numericOptions(r, { correct, wrong, format: (x) => `$${x}$` });

      if (kind === 'count') {
        const n = r.int(6, 25);
        const expr = `(${coefTex(r.pick([1, 1, 2, 3]), u)} ${r.chance(0.5) ? '-' : '+'} ${coefTex(r.pick([1, 2, 3, 5]), v)})^{${n}}`;
        // forgot the +1, overshot by one, counted 2n
        const { answer, distractors } = options(n + 1, [n, n + 2, 2 * n]);
        return {
          stem: tex`The number of terms in the expansion of $${expr}$ is:`,
          answer,
          distractors,
          explanation: tex`The expansion of $(a + b)^{n}$ has one term for each $r = 0, 1, 2, \ldots, n$, i.e. $n + 1$ terms; the coefficients and signs do not change this. Here $n = ${n}$, so there are $${n + 1}$ terms.`,
        };
      }

      if (kind === 'terms-to-n') {
        const n = r.int(7, 20);
        const { answer, distractors } = options(n, [n + 1, n - 1, n + 2]);
        return {
          stem: tex`If the expansion of $(${u} + ${v})^{n}$ has $${n + 1}$ terms, then $n$ is:`,
          answer,
          distractors,
          explanation: tex`The expansion of $(${u} + ${v})^{n}$ has $n + 1$ terms, so $n + 1 = ${n + 1}$ and $n = ${n}$.`,
        };
      }

      if (kind === 'middle-to-n') {
        const t = r.int(4, 11);
        const n = 2 * (t - 1);
        // took n/2 = t, used the odd-n formula (n + 1)/2 = t, took n/2 = t - 1 as n, ...
        const { answer, distractors } = options(n, [2 * t, 2 * t - 1, t - 1, 2 * t - 3]);
        return {
          stem: tex`If the ${nth(t)} term is the only middle term in the expansion of $(${u} + ${v})^{n}$, then $n$ is:`,
          answer,
          distractors,
          explanation: tex`A single middle term means that $n + 1$ is odd, i.e. $n$ is even, and the middle term is then $T_{\frac{n}{2} + 1}$. So $\frac{n}{2} + 1 = ${t}$, giving $n = ${n}$.`,
        };
      }

      const series = [
        tex`$1 + x + x^{2} + x^{3} + \cdots$`,
        tex`$1 - x + x^{2} - x^{3} + \cdots$`,
        tex`$1 + 2x + 3x^{2} + 4x^{3} + \cdots$`,
        tex`$1 - 2x + 3x^{2} - 4x^{3} + \cdots$`,
      ];
      const cases = [
        {
          expr: '(1 - x)^{-1}',
          answer: 0,
          work: tex`1 + (-1)(-x) + \frac{(-1)(-2)}{2!}(-x)^{2} + \frac{(-1)(-2)(-3)}{3!}(-x)^{3} + \cdots = 1 + x + x^{2} + x^{3} + \cdots`,
        },
        {
          expr: '(1 + x)^{-1}',
          answer: 1,
          work: tex`1 + (-1)x + \frac{(-1)(-2)}{2!}x^{2} + \frac{(-1)(-2)(-3)}{3!}x^{3} + \cdots = 1 - x + x^{2} - x^{3} + \cdots`,
        },
        {
          expr: '(1 + x)^{-2}',
          answer: 3,
          work: tex`1 + (-2)x + \frac{(-2)(-3)}{2!}x^{2} + \frac{(-2)(-3)(-4)}{3!}x^{3} + \cdots = 1 - 2x + 3x^{2} - 4x^{3} + \cdots`,
        },
      ];
      const pick = r.pick(cases);
      return {
        stem: tex`For $|x| < 1$, the expansion of $${pick.expr}$ in ascending powers of $x$ is:`,
        answer: series[pick.answer] as string,
        distractors: series.filter((_, i) => i !== pick.answer),
        explanation: tex`Using $(1 + y)^{m} = 1 + my + \frac{m(m-1)}{2!}y^{2} + \frac{m(m-1)(m-2)}{3!}y^{3} + \cdots$: $${pick.expr} = ${pick.work}$.`,
      };
    },
  ),

  b.dynamic('sum-of-coefficients', { difficulty: 1, origin: 'past-paper', tags: ['binomial expansion'] }, (r) => {
    const kind = r.weighted(['all', 'even', 'odd', 'find-n', 'two-variables'] as const, [0.2, 0.15, 0.15, 0.2, 0.3]);
    const options = (correct: number, wrong: readonly number[]) =>
      numericOptions(r, { correct, wrong: r.shuffle(wrong), format: (v) => `$${num(v)}$`, allowNegative: true });

    if (kind === 'all') {
      const n = r.int(5, 12);
      const { answer, distractors } = options(2 ** n, [2 ** (n - 1), 2 ** (n + 1), n * 2 ** (n - 1), n + 1]);
      return {
        stem: tex`The value of $\binom{${n}}{0} + \binom{${n}}{1} + \binom{${n}}{2} + \cdots + \binom{${n}}{${n}}$ is:`,
        answer,
        distractors,
        explanation: tex`Putting $x = 1$ in $(1 + x)^{${n}} = \sum_{r=0}^{${n}} \binom{${n}}{r}x^{r}$ gives $\sum_{r=0}^{${n}} \binom{${n}}{r} = 2^{${n}} = ${2 ** n}$.`,
      };
    }

    if (kind === 'even' || kind === 'odd') {
      const even = kind === 'even';
      const n = r.int(7, 12);
      const start = even ? 0 : 1;
      const last = (n % 2 === 0) === even ? n : n - 1;
      const total = range(0, n)
        .filter((k) => k % 2 === start)
        .reduce((acc, k) => acc + nCr(n, k), 0);
      verify(total === 2 ** (n - 1), 'alternate binomial coefficients');
      const { answer, distractors } = options(total, [2 ** n, 2 ** (n - 2), 2 ** (n + 1), n * 2 ** (n - 2)]);
      return {
        stem: tex`The value of $\binom{${n}}{${start}} + \binom{${n}}{${start + 2}} + \binom{${n}}{${start + 4}} + \cdots + \binom{${n}}{${last}}$ is:`,
        answer,
        distractors,
        explanation: tex`Putting $x = 1$ and $x = -1$ in $(1 + x)^{${n}} = \sum_{r=0}^{${n}} \binom{${n}}{r}x^{r}$ gives $\sum \binom{${n}}{r} = 2^{${n}}$ and $\sum (-1)^{r}\binom{${n}}{r} = 0$. ${even ? 'Adding' : 'Subtracting'} these, $2\left[\binom{${n}}{${start}} + \binom{${n}}{${start + 2}} + \cdots\right] = 2^{${n}}$, so the sum is $2^{${n - 1}} = ${2 ** (n - 1)}$.`,
      };
    }

    if (kind === 'find-n') {
      const n = r.int(5, 12);
      const total = 2 ** n;
      const { answer, distractors } = options(n, [n - 1, n + 1, n + 2, 2 * n]);
      return {
        stem: tex`If the sum of the binomial coefficients in the expansion of $(1 + x)^{n}$ is $${total}$, then $n$ equals:`,
        answer,
        distractors,
        explanation: tex`Putting $x = 1$ shows that the binomial coefficients of $(1 + x)^{n}$ add up to $2^{n}$. So $2^{n} = ${total} = 2^{${n}}$, giving $n = ${n}$.`,
      };
    }

    const { A, B, n } = draw(
      () => ({ A: r.int(1, 4), B: r.pick([1, 2, 3]) * r.sign(), n: r.int(3, 8) }),
      (s) => s.A + s.B !== 0 && !(s.A === 1 && s.B === 1) && (Math.abs(s.A) + Math.abs(s.B)) ** s.n <= 1e4,
    );
    const correct = (A + B) ** n;
    const allCoefficients = [...expand([[A, 1], [B, 0]], n).values()].reduce((x, y) => x + y, 0);
    verify(allCoefficients === correct, 'sum of all coefficients');
    const { answer, distractors } = options(correct, [
      2 ** n, // summed only the binomial coefficients
      (Math.abs(A) + Math.abs(B)) ** n, // ignored the minus sign
      A ** n + B ** n, // (a + b)^n taken as a^n + b^n
      (A - B) ** n, // sign slip
      (A + B) ** (n - 1), // exponent off by one (as in 2^(n-1))
    ]);
    return {
      stem: tex`The sum of the coefficients in the expansion of $(${coefTex(A, 'x')} ${B < 0 ? '-' : '+'} ${coefTex(Math.abs(B), 'y')})^{${n}}$ is:`,
      answer,
      distractors,
      explanation: tex`The sum of all the coefficients is the value of the expansion at $x = y = 1$: $(${A} ${B < 0 ? '-' : '+'} ${Math.abs(B)})^{${n}} = ${paren(A + B)}^{${n}} = ${num(correct)}$.`,
    };
  }),

  b.dynamic('surd-binomial-sum', { difficulty: 3, tags: ['binomial expansion'] }, (r) => {
    const setup = draw(
      () => {
        const n = r.weighted([4, 5, 6], [0.45, 0.3, 0.25]);
        const plus = r.chance(0.6);
        const s = r.pick([2, 3, 5, 6, 7]);
        const t = r.pick([1, 1, 2, 3]);
        const surdFirst = r.chance(0.7);
        // (a + b)^n ± (a - b)^n = 2 * sum of C(n, k) a^(n-k) b^k over even k (+) or odd k (-).
        const kept = range(0, n).filter((k) => (k % 2 === 0) === plus);
        /** C(n, k) a^(n-k) b^k as an integer multiple of sqrt(s)^parity. */
        const termValue = (k: number, withCoefficient = true): number => {
          const e = surdFirst ? n - k : k; // power of sqrt(s) in this term
          return (withCoefficient ? nCr(n, k) : 1) * t ** (n - e) * s ** Math.floor(e / 2);
        };
        const total = 2 * kept.reduce((acc, k) => acc + termValue(k), 0);
        const surd = (surdFirst ? n - (kept[0] as number) : (kept[0] as number)) % 2 === 1;
        return { n, plus, s, t, surdFirst, kept, termValue, total, surd };
      },
      (P) => P.total <= 1000,
    );
    const { n, plus, s, t, surdFirst, kept, termValue, total, surd } = setup;

    const a = surdFirst ? Math.sqrt(s) : t;
    const bb = surdFirst ? t : Math.sqrt(s);
    const exact = (a + bb) ** n + (plus ? 1 : -1) * (a - bb) ** n;
    const claimed = total * (surd ? Math.sqrt(s) : 1);
    verify(Math.abs(exact - claimed) < 1e-6 * Math.max(1, Math.abs(claimed)), 'surd binomial sum');

    const show = (value: number): string => (surd ? `${value}\\sqrt{${s}}` : `${value}`);
    const firstKept = kept[0] as number;
    const lastKept = kept[kept.length - 1] as number;
    const answer = `$${show(total)}$`;
    const pool = [
      total / 2, // forgot the factor 2
      2 * kept.reduce((acc, k) => acc + termValue(k, false), 0), // binomial coefficients left out
      2 * termValue(firstKept), // kept only the leading term
      2 * (termValue(firstKept) + termValue(lastKept)), // kept only the first and last terms
      2 * total, // doubled twice
    ].map((v) => `$${show(v)}$`);

    const surdTerm = `\\sqrt{${s}}`;
    const pair = (sign: string): string => (surdFirst ? `(${surdTerm} ${sign} ${t})` : `(${t} ${sign} ${surdTerm})`);
    const keptPoly = kept
      .map((k) => coefTex(nCr(n, k), `${k === n ? '' : pow(n - k, 'a')}${k === 0 ? '' : pow(k, 'b')}`))
      .join(' + ');
    return {
      stem: tex`The value of $${pair('+')}^{${n}} ${plus ? '+' : '-'} ${pair('-')}^{${n}}$ is:`,
      answer,
      distractors: pickDistractors(answer, pool),
      explanation: tex`$(a + b)^{${n}} ${plus ? '+' : '-'} (a - b)^{${n}} = 2\left[${keptPoly}\right]$, because the terms with ${plus ? 'odd' : 'even'} powers of $b$ cancel. With $a = ${surdFirst ? surdTerm : t}$ and $b = ${surdFirst ? t : surdTerm}$ this is $2\left[${kept.map((k) => show(termValue(k))).join(' + ')}\right] = ${show(total)}$.`,
    };
  }),

  // -------------------------------------------------------------------------------------------
  // Binomial series
  // -------------------------------------------------------------------------------------------
  b.dynamic('binomial-series-coefficient', { difficulty: 2, tags: ['binomial series'] }, (r) => {
    if (r.chance(0.3)) {
      // Range of validity of (a + bx)^m. With a < |b| every wrong option is a strictly larger
      // interval (or all x), so it is definitely wrong rather than merely incomplete.
      const a = r.int(1, 4);
      const B = r.int(a + 1, 9);
      const sign = r.sign();
      const m = r.pick(SERIES_INDICES);
      const op = sign < 0 ? '-' : '+';
      const expr = `(${a} ${op} ${B}x)^{${expTex(m)}}`;
      const below = (f: Fraction): string => `$|x| < ${f.toTex()}$`;
      const answer = below(frac(a, B));
      const pool = [below(frac(B, a)), below(frac(1)), 'all real $x$', ...(a > 1 ? [below(frac(a))] : [])];
      const y = coefTex(frac(B, a), 'x'); // (a + Bx)^m = a^m (1 + y)^m with y = (B/a)x
      const explanation =
        a === 1
          ? tex`The binomial series for $(1 + y)^{m}$, with $m$ not a positive integer, is valid only for $|y| < 1$. Here $y = ${coefTex(sign * B, 'x')}$, so we need $|${B}x| < 1$, i.e. $|x| < ${frac(1, B).toTex()}$.`
          : tex`$${expr} = ${a}^{${expTex(m)}}\left(1 ${op} ${y}\right)^{${expTex(m)}}$, and the binomial series for $(1 + y)^{m}$, with $m$ not a positive integer, is valid only for $|y| < 1$. So $\left|${y}\right| < 1$, i.e. $|x| < ${frac(a, B).toTex()}$.`;
      return {
        stem: tex`The binomial expansion of $${expr}$ in ascending powers of $x$ is valid for:`,
        answer,
        distractors: pickDistractors(answer, pool, r),
        explanation,
      };
    }

    const { m, a, k, value } = draw(
      () => {
        const m = r.pick(SERIES_INDICES);
        const a = r.pick([1, 2, 3]) * r.sign();
        const k = r.pick([2, 3]);
        return { m, a, k, value: falling(m, k).div(factorial(k)).mul(Fraction.of(a).pow(k)) };
      },
      (s) => s.value.d <= 32 && Math.abs(s.value.n) <= 300,
    );
    const base = falling(m, k).div(factorial(k));
    const ak = a ** k;
    const answer = fracOption(value);
    const natural = [
      value.neg(), // sign slip
      falling(m, k).mul(ak), // forgot to divide by k!
      base, // forgot the factor a^k
      base.mul(a), // used a instead of a^k
      rising(m, k).div(factorial(k)).mul(ak), // m(m + 1)... instead of m(m - 1)...
    ].filter((f) => !f.isZero());
    const fallback = [value.mul(2), value.div(2), value.add(1)];
    const factorTex = (f: Fraction): string => (f.isInteger() ? `(${f.toTex()})` : `\\left(${f.toTex()}\\right)`);
    const numerator = range(0, k - 1)
      .map((i) => factorTex(m.sub(i)))
      .join('');
    const middle = ak === 1 ? '' : `${base.toTex()} \\times ${paren(ak)} = `;
    return {
      stem: tex`The coefficient of $x^{${k}}$ in the expansion of $(${onePlus(a)})^{${expTex(m)}}$ in ascending powers of $x$ is:`,
      answer,
      distractors: pickDistractors(answer, [...r.shuffle(natural), ...fallback].map(fracOption)),
      explanation: tex`$(1 + y)^{m} = 1 + my + \frac{m(m-1)}{2!}y^{2} + \frac{m(m-1)(m-2)}{3!}y^{3} + \cdots$. With $m = ${m.toTex()}$ and $y = ${coefTex(a, 'x')}$, the coefficient of $x^{${k}}$ is $\frac{${numerator}}{${k}!}${powerOf(a, k)} = ${middle}${value.toTex()}$.`,
    };
  }),

  b.dynamic('small-x-approximation', { difficulty: 2, tags: ['binomial series'] }, (r) => {
    const quotient = r.chance(0.5);
    const sqrtStyle = r.chance(0.4);
    const { p, q, m1, m2, c } = draw(
      () => {
        const p = r.pick([1, 2, 3, 4]) * r.sign();
        const q = r.pick([1, 2, 3, 4]) * r.sign();
        const m1 = r.pick(APPROX_INDICES);
        const m2 = r.pick(quotient ? DENOMINATOR_INDICES : APPROX_INDICES);
        return { p, q, m1, m2, c: m1.mul(p).add(m2.mul(quotient ? -q : q)) };
      },
      (s) => s.p !== s.q && !s.c.isZero() && s.c.d <= 12 && Math.abs(s.c.toNumber()) <= 12,
    );
    // First-order terms of the two factors (the second is inverted for a quotient).
    const e1 = m1.mul(p);
    const e2 = m2.mul(quotient ? -q : q);
    // Self-check: the expression's derivative at x = 0 (central difference) is the coefficient of x.
    const f = (x: number): number =>
      (1 + p * x) ** m1.toNumber() * (1 + q * x) ** ((quotient ? -1 : 1) * m2.toNumber());
    const h = 1e-6;
    verify(Math.abs((f(h) - f(-h)) / (2 * h) - c.toNumber()) < 1e-4, 'small-x approximation');

    const factor = (a: number, m: Fraction): string => {
      if (m.equals(1)) return `(${onePlus(a)})`;
      if (sqrtStyle && m.equals(frac(1, 2))) return `\\sqrt{${onePlus(a)}}`;
      return `(${onePlus(a)})^{${expTex(m)}}`;
    };
    const expr = quotient ? `\\dfrac{${factor(p, m1)}}{${factor(q, m2)}}` : `${factor(p, m1)}${factor(q, m2)}`;
    const answer = `$${linear(c)}$`;
    const natural = [
      m1.mul(p).add(m2.mul(quotient ? q : -q)), // sign of the second term slipped
      frac(quotient ? p - q : p + q), // indices ignored
      m1.add(quotient ? m2.neg() : m2), // coefficients of x ignored
      c.neg(), // overall sign slip
      e1, // second factor ignored
    ].filter((v) => !v.isZero());
    const fallback = [c.add(1), c.sub(1), c.mul(2)].filter((v) => !v.isZero());
    const second = quotient
      ? tex`$\frac{1}{${factor(q, m2)}} = (${onePlus(q)})^{${expTex(m2.neg())}} \approx ${linear(e2)}$`
      : tex`$${factor(q, m2)} \approx ${linear(e2)}$`;
    return {
      stem: tex`If $x$ is so small that $x^{2}$ and higher powers of $x$ can be neglected, then $${expr}$ is approximately equal to:`,
      answer,
      distractors: pickDistractors(answer, [...r.shuffle(natural), ...fallback].map((v) => `$${linear(v)}$`)),
      explanation: tex`For small $y$, $(1 + y)^{k} \approx 1 + ky$. So $${factor(p, m1)} \approx ${linear(e1)}$ and ${second}. Multiplying and dropping the $x^{2}$ term: $(${linear(e1)})(${linear(e2)}) \approx ${linear(c)}$.`,
    };
  }),

  // -------------------------------------------------------------------------------------------
  // Mathematical induction
  // -------------------------------------------------------------------------------------------
  b.dynamic('divisibility-for-all-n', { difficulty: 1, tags: ['mathematical induction'] }, (r) => {
    const kind = r.weighted(['difference', 'even-power', 'polynomial', 'symbolic'] as const, [0.4, 0.15, 0.25, 0.2]);
    const stemFor = (expr: string): string => tex`For every positive integer $n$, $${expr}$ is divisible by:`;
    const asOption = (v: number): string => `$${v}$`;

    if (kind === 'difference') {
      const b0 = r.pick([1, 1, 2, 3]);
      const a0 = r.int(b0 + 2, Math.min(b0 + 9, 12));
      const d = a0 - b0;
      // For n = 1 the expression equals d, so a divisor valid for every n must divide d.
      const pool = [a0 + b0, a0, ...r.shuffle([a0 * b0, 2 * d, a0 * a0 - b0 * b0])];
      verify(
        pool.every((x) => d % x !== 0) && range(1, 8).every((n) => (a0 ** n - b0 ** n) % d === 0),
        'a^n - b^n divisibility',
      );
      const answer = asOption(d);
      return {
        stem: stemFor(b0 === 1 ? `${a0}^{n} - 1` : `${a0}^{n} - ${b0}^{n}`),
        answer,
        distractors: pickDistractors(answer, pool.map(asOption)),
        explanation:
          b0 === 1
            ? tex`$${a0}^{n} - 1 = (${a0} - 1)\left(${a0}^{n-1} + ${a0}^{n-2} + \cdots + 1\right)$, so it is divisible by $${d}$ for every $n$ (by induction: if $${a0}^{k} - 1 = ${d}m$, then $${a0}^{k+1} - 1 = ${a0}(${a0}^{k} - 1) + ${d}$). For $n = 1$ its value is $${d}$, so no larger option divides it for every $n$.`
            : tex`$${a0}^{n} - ${b0}^{n} = (${a0} - ${b0})\left(${a0}^{n-1} + ${a0}^{n-2} \cdot ${b0} + \cdots + ${b0}^{n-1}\right)$, so it is divisible by $${a0} - ${b0} = ${d}$ for every $n$. For $n = 1$ its value is $${d}$, so no larger option divides it for every $n$.`,
      };
    }

    if (kind === 'even-power') {
      const a = r.pick([2, 3, 4, 5]);
      const d = a * a - 1;
      const pool = [a * a, a * a + 1, 2 * a + 1, 2 * a, a ** 3, a * a + 2].filter((x) => d % x !== 0);
      verify(range(1, 5).every((n) => (a ** (2 * n) - 1) % d === 0), 'a^(2n) - 1 divisibility');
      const answer = asOption(d);
      return {
        stem: stemFor(`${a}^{2n} - 1`),
        answer,
        distractors: pickDistractors(answer, pool.map(asOption), r),
        explanation: tex`$${a}^{2n} - 1 = ${a * a}^{n} - 1 = (${a * a} - 1)\left(${a * a}^{n-1} + ${a * a}^{n-2} + \cdots + 1\right)$, so it is divisible by $${d}$ for every $n$. For $n = 1$ its value is $${d}$, which is not divisible by any of the other options.`,
      };
    }

    if (kind === 'polynomial') {
      const fact = r.pick(POLYNOMIAL_DIVISIBILITY);
      verify(
        range(1, 30).every((n) => fact.value(n) % fact.answer === 0) &&
          fact.wrong.every((x) => range(1, 5).some((n) => fact.value(n) % x !== 0)),
        fact.expr,
      );
      const answer = asOption(fact.answer);
      return {
        stem: stemFor(fact.expr),
        answer,
        distractors: pickDistractors(answer, fact.wrong.map(asOption), r),
        explanation: fact.why,
      };
    }

    if (r.chance(0.5)) {
      return {
        stem: stemFor('x^{n} - y^{n}'),
        answer: '$x - y$',
        distractors: ['$x + y$', '$xy$', '$x^{2} - y^{2}$'],
        explanation: tex`$x^{n} - y^{n} = (x - y)\left(x^{n-1} + x^{n-2}y + \cdots + y^{n-1}\right)$ for every $n$ (a standard induction result). For $n = 1$ the expression is $x - y$ itself, which is not divisible by $x + y$, $xy$ or $x^{2} - y^{2}$.`,
      };
    }
    return {
      stem: stemFor('x^{2n-1} + y^{2n-1}'),
      answer: '$x + y$',
      distractors: ['$x - y$', '$xy$', '$x^{2} + y^{2}$'],
      explanation: tex`$2n - 1$ is odd, and for odd $m$, $x^{m} + y^{m} = (x + y)\left(x^{m-1} - x^{m-2}y + \cdots + y^{m-1}\right)$. For $n = 1$ the expression is $x + y$ itself, which is not divisible by $x - y$, $xy$ or $x^{2} + y^{2}$.`,
    };
  }),

  // -------------------------------------------------------------------------------------------
  // Fixed questions
  // -------------------------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'factorial-exceeds-power-of-two',
      d: 2,
      o: 'past-paper',
      t: ['mathematical induction'],
      q: tex`The least positive integer $n_0$ such that $n! > 2^{n}$ for every integer $n \geq n_0$ is:`,
      a: '$4$',
      x: ['$2$', '$3$', '$5$'],
      e: tex`$2! = 2 < 4$ and $3! = 6 < 8$, but $4! = 24 > 16$. If $k! > 2^{k}$ for some $k \geq 4$, then $(k + 1)! = (k + 1)\,k! > 2 \cdot 2^{k} = 2^{k+1}$, so by induction the inequality holds for every $n \geq 4$. Since it fails at $n = 3$, $n_0 = 4$.`,
    },
    {
      id: 'inductive-step',
      d: 1,
      t: ['mathematical induction'],
      q: tex`In a proof by mathematical induction, after showing that $P(1)$ is true, we assume that $P(k)$ is true and then prove that:`,
      a: tex`$P(k + 1)$ is true`,
      x: [tex`$P(k - 1)$ is true`, tex`$P(2k)$ is true`, tex`$P(k + 2)$ is true`],
      e: tex`The inductive step is $P(k) \Rightarrow P(k + 1)$. Starting from $P(1)$ it gives $P(2), P(3), \ldots$ in turn, so $P(n)$ holds for every $n \in \mathbb{N}$. Proving $P(k + 2)$ or $P(2k)$ instead would skip values of $n$.`,
    },
    {
      id: 'inductive-step-without-base-case',
      d: 2,
      t: ['mathematical induction'],
      q: tex`Let $P(n)$ be the statement $1 + 3 + 5 + \cdots + (2n - 1) = n^{2} + 3$. Which of the following is correct?`,
      a: tex`$P(k) \Rightarrow P(k + 1)$ holds, but $P(1)$ is false`,
      x: [
        tex`$P(1)$ is true, so $P(n)$ holds for all $n$`,
        tex`$P(1)$ is false and $P(k) \Rightarrow P(k + 1)$ fails`,
        tex`$P(n)$ is true for all $n \geq 2$`,
      ],
      e: tex`If $1 + 3 + \cdots + (2k - 1) = k^{2} + 3$, adding $2k + 1$ gives $(k + 1)^{2} + 3$, so the inductive step works. But $P(1)$ says $1 = 4$, which is false. In fact the sum is always $n^{2}$, so $P(n)$ is never true: induction needs both the base case and the inductive step.`,
    },
    {
      id: 'negative-index-expansion',
      d: 1,
      t: ['binomial series'],
      q: tex`If $n$ is a negative integer or a fraction, the expansion of $(1 + x)^{n}$ in powers of $x$:`,
      a: tex`is an infinite series, valid only for $|x| < 1$`,
      x: [
        tex`has $n + 1$ terms and is valid for all $x$`,
        tex`is an infinite series, valid for all $x$`,
        tex`has $n + 1$ terms, valid only for $|x| < 1$`,
      ],
      e: tex`For such $n$ the coefficients $\frac{n(n-1)\cdots(n-r+1)}{r!}$ never become zero, so the series does not terminate; it converges to $(1 + x)^{n}$ only when $|x| < 1$.`,
    },
    {
      id: 'series-one-plus-two-x',
      d: 1,
      t: ['binomial series'],
      q: tex`For $|x| < 1$, the sum $1 + 2x + 3x^{2} + 4x^{3} + \cdots$ is equal to:`,
      a: tex`$(1 - x)^{-2}$`,
      x: [tex`$(1 + x)^{-2}$`, tex`$(1 - x)^{-1}$`, tex`$(1 - x)^{2}$`],
      e: tex`$(1 - x)^{-2} = 1 + (-2)(-x) + \frac{(-2)(-3)}{2!}(-x)^{2} + \frac{(-2)(-3)(-4)}{3!}(-x)^{3} + \cdots = 1 + 2x + 3x^{2} + 4x^{3} + \cdots$, whose general term is $(r + 1)x^{r}$. By contrast, $(1 + x)^{-2} = 1 - 2x + 3x^{2} - \cdots$ and $(1 - x)^{-1} = 1 + x + x^{2} + \cdots$.`,
    },
    {
      id: 'series-sum-root-two',
      d: 3,
      t: ['binomial series'],
      q: tex`The sum of the series $1 + \frac{1}{4} + \frac{1 \cdot 3}{4 \cdot 8} + \frac{1 \cdot 3 \cdot 5}{4 \cdot 8 \cdot 12} + \cdots$ is:`,
      a: tex`$\sqrt{2}$`,
      x: [tex`$\frac{1}{\sqrt{2}}$`, tex`$\sqrt{\frac{2}{3}}$`, '$2$'],
      e: tex`$(1 - x)^{-1/2} = 1 + \frac{1}{2}x + \frac{1 \cdot 3}{2 \cdot 4}x^{2} + \frac{1 \cdot 3 \cdot 5}{2 \cdot 4 \cdot 6}x^{3} + \cdots$. With $x = \frac{1}{2}$ the terms become $\frac{1}{4}, \frac{1 \cdot 3}{4 \cdot 8}, \frac{1 \cdot 3 \cdot 5}{4 \cdot 8 \cdot 12}, \ldots$, so the sum is $\left(1 - \frac{1}{2}\right)^{-1/2} = \sqrt{2}$.`,
    },
    {
      id: 'weighted-binomial-sum',
      d: 3,
      t: ['binomial expansion'],
      q: tex`For every positive integer $n$, $\binom{n}{1} + 2\binom{n}{2} + 3\binom{n}{3} + \cdots + n\binom{n}{n}$ is equal to:`,
      a: tex`$n \cdot 2^{n-1}$`,
      x: [tex`$2^{n} - 1$`, tex`$n \cdot 2^{n}$`, tex`$(n + 2) \cdot 2^{n-1}$`],
      e: tex`Since $r\binom{n}{r} = n\binom{n-1}{r-1}$, the sum is $n\left[\binom{n-1}{0} + \binom{n-1}{1} + \cdots + \binom{n-1}{n-1}\right] = n \cdot 2^{n-1}$ (equivalently, differentiate $(1 + x)^{n}$ and put $x = 1$). Check with $n = 2$: $2 + 2 = 4 = 2 \cdot 2^{1}$, whereas $2^{2} - 1 = 3$.`,
    },
  ]),
]);
