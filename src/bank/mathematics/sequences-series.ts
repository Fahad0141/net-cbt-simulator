import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  divisors,
  Fraction,
  frac,
  gcd,
  numericOptions,
  paren,
  pickDistractors,
  polyTex,
  q$,
  range,
  signed,
  tex,
  U,
} from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/*
 * Sequences and Series (FSc Part I).
 *
 *   A.P.          nth term, which term / number of terms, first or later term from two given
 *                 terms, S_n (series and word problems), S_n given as a quadratic in n, sums
 *                 of multiples.
 *   G.P.          nth term, which term, S_n, geometric means, products of terms and of means.
 *   Infinite G.P. sum to infinity, first term or ratio from the sum, recurring decimals,
 *                 bouncing ball, convergence condition.
 *   H.P.          nth term, term from two given terms, definition.
 *   Means         arithmetic / geometric / harmonic means, A > G > H, G^2 = AH.
 *   Sum of series sums of squares, cubes, k(k + 1) and linear terms; sigma sums not starting
 *                 at k = 1; telescoping and arithmetico-geometric series; triangular numbers.
 */

type Exact = Fraction | number;

/** Digit ordinal for stems: 4 -> '4th', 21 -> '21st', 12 -> '12th'. */
function nth(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number): string => WORDS[n] ?? String(n);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** LaTeX of an exact value (integer or reduced fraction). */
const ft = (x: Exact): string => Fraction.of(x).toTex();
/** An option showing an exact value. */
const fo = (x: Exact): string => `$${ft(x)}$`;
/** ' - x' or ' + |x|': writes `1 - r` after substituting r. */
const minus = (x: Fraction): string => (x.sign() < 0 ? ` + ${x.abs().toTex()}` : ` - ${x.toTex()}`);

/** '3, -6, 12, \ldots' */
const listTex = (terms: readonly Exact[]): string => tex`${terms.map(ft).join(', ')}, \ldots`;

/** '5 + 2 - 1 - 4 + \cdots'; the sign before the dots follows `next` when it is given. */
function seriesTex(terms: readonly Exact[], next?: Exact): string {
  const [first, ...rest] = terms.map((t) => Fraction.of(t));
  let out = first ? first.toTex() : '';
  for (const t of rest) out += t.sign() < 0 ? ` - ${t.abs().toTex()}` : ` + ${t.toTex()}`;
  const tail = next !== undefined && Fraction.of(next).sign() < 0 ? ' - ' : ' + ';
  return tex`${out}${tail}\cdots`;
}

/** `\frac{n}{d}`, followed by its lowest-terms form when that differs. */
function fracSteps(n: number, d: number): string {
  const reduced = frac(n, d);
  const raw = tex`\frac{${n}}{${d}}`;
  return reduced.d === d ? raw : `${raw} = ${reduced.toTex()}`;
}

/** Options for an integer answer. Non-integer slips are skipped; fallbacks stay integral. */
function intOptions(
  r: Rng,
  correct: number,
  wrong: readonly number[],
  allowNegative = true,
): { answer: string; distractors: string[] } {
  return numericOptions(r, {
    correct,
    wrong: wrong.filter((w) => Number.isSafeInteger(w)),
    format: (v) => `$${v}$`,
    fallback: 'integer',
    allowNegative,
  });
}

/**
 * Options for an exact rational answer. Slips equal in value to the answer (for example an
 * unreduced form of it) are dropped, so every distractor is genuinely wrong; duplicates by
 * display are skipped and generic fallbacks top the list up only when needed.
 */
function ratOptions(
  correct: Fraction,
  wrong: ReadonlyArray<Exact | null>,
): { answer: string; distractors: string[] } {
  const answer = fo(correct);
  const fallbacks = [correct.mul(2), correct.add(1), correct.sub(1), correct.div(2), correct.neg(), correct.add(2)];
  const pool = [...wrong, ...fallbacks]
    .filter((w): w is Exact => w !== null)
    .map((w) => Fraction.of(w))
    .filter((w) => !w.equals(correct))
    .map((w) => fo(w));
  return { answer, distractors: pickDistractors(answer, pool) };
}

/** `new Fraction(n, d)`, or null for a zero denominator (a slip that cannot be shown). */
const safeFrac = (n: number, d: number): Fraction | null => (d === 0 ? null : frac(n, d));

/** Pairs x > y > 0 whose A.M. and G.M. are both integers (x + y even, xy a perfect square). */
const AM_GM_PAIRS: ReadonlyArray<readonly [number, number]> = range(2, 64).flatMap((x) =>
  range(1, x - 1)
    .filter((y) => (x + y) % 2 === 0 && Number.isInteger(Math.sqrt(x * y)))
    .map((y) => [x, y] as const),
);

export default defineBank('mathematics', 'sequences-series', (b) => [
  // ─────────────────────────── Arithmetic progression ───────────────────────────
  b.dynamic('ap-nth-term', { difficulty: 1, origin: 'past-paper', tags: ['arithmetic progression'] }, (r) => {
    const a = r.nonZero(-20, 30);
    const d = r.nonZero(-9, 9);
    const seq = listTex([a, a + d, a + 2 * d]);
    const dLine = tex`Here $a = ${a}$ and $d = ${a + d} - ${paren(a)} = ${d}$.`;

    if (r.chance(0.5)) {
      const n = r.int(12, 40);
      const tn = a + (n - 1) * d;
      const { answer, distractors } = intOptions(r, tn, [
        a + n * d, // used n instead of n - 1
        (n - 1) * d, // forgot the first term
        a + (n - 2) * d, // used n - 2
        a - (n - 1) * d, // sign slip
      ]);
      return {
        stem: tex`The ${nth(n)} term of the A.P. $${seq}$ is:`,
        answer,
        distractors,
        explanation: tex`${dLine} Using $a_n = a + (n - 1)d$: $a_{${n}} = ${a} + ${n - 1}(${d}) = ${tn}$.`,
      };
    }

    const n = r.int(13, 60);
    const last = a + (n - 1) * d;
    const explanation = tex`${dLine} Solve $a + (n - 1)d = ${last}$: $n - 1 = \frac{${last} - ${paren(a)}}{${d}} = ${n - 1}$, so $n = ${n}$.`;
    if (r.chance(0.5)) {
      const others = r.sample([n + 1, n + 2, n - 2, n - 3], 2);
      return {
        stem: tex`Which term of the A.P. $${seq}$ is $${last}$?`,
        answer: `${nth(n)} term`,
        // n - 1 is the classic slip of forgetting to add 1.
        distractors: [n - 1, ...others].map((k) => `${nth(k)} term`),
        explanation,
      };
    }
    const { answer, distractors } = intOptions(r, n, [n - 1, ...r.sample([n + 1, n + 2, n - 2], 2)], false);
    return {
      stem: tex`The number of terms in the A.P. $${a}, ${a + d}, ${a + 2 * d}, \ldots, ${last}$ is:`,
      answer,
      distractors,
      explanation,
    };
  }),

  b.dynamic('ap-terms-and-means', { difficulty: 2, tags: ['arithmetic progression', 'means'] }, (r) => {
    const variant = r.pick(['two-terms', 'kth-mean', 'sum-of-means'] as const);

    if (variant === 'two-terms' && r.chance(0.4)) {
      // Reported NET theme: two terms of an A.P. are given; find the first term.
      const p = r.int(3, 10);
      const q = r.int(p + 3, 20);
      const a = r.nonZero(-20, 20);
      const d = r.nonZero(-5, 6);
      const ap = a + (p - 1) * d;
      const aq = a + (q - 1) * d;
      const { answer, distractors } = intOptions(r, a, [
        a - d, // used a + pd instead of a + (p - 1)d
        d, // gave the common difference
        a + 2 * (p - 1) * d, // sign slip: a = a_p + (p - 1)d
        a + (p - q) * d, // subtracted (q - 1)d from the pth term
      ]);
      return {
        stem: tex`The ${nth(p)} term of an A.P. is $${ap}$ and its ${nth(q)} term is $${aq}$. Its first term is:`,
        answer,
        distractors,
        explanation: tex`$a + ${p - 1}d = ${ap}$ and $a + ${q - 1}d = ${aq}$. Subtracting, $${q - p}d = ${aq - ap}$, so $d = ${d}$. Then $a = ${ap} - ${p - 1}(${d}) = ${a}$.`,
      };
    }

    if (variant === 'two-terms') {
      const p = r.int(2, 6);
      const q = r.int(p + 2, 12);
      const k = r.int(q + 3, 30);
      const a = r.int(-15, 20);
      const d = r.nonZero(-8, 9);
      const ap = a + (p - 1) * d;
      const aq = a + (q - 1) * d;
      const ak = a + (k - 1) * d;
      const { answer, distractors } = intOptions(r, ak, [
        ak + d, // used k instead of k - 1
        ap + (k - 1) * d, // took the given term as the first term
        (k - 1) * d, // forgot the first term
        ak - d,
      ]);
      return {
        stem: tex`The ${nth(p)} term of an A.P. is $${ap}$ and its ${nth(q)} term is $${aq}$. Its ${nth(k)} term is:`,
        answer,
        distractors,
        explanation: tex`$a + ${coefTex(p - 1, 'd')} = ${ap}$ and $a + ${q - 1}d = ${aq}$. Subtracting, $${q - p}d = ${aq - ap}$, so $d = ${d}$ and $a = ${ap} - ${p - 1}(${d}) = ${a}$. Hence $a_{${k}} = ${a} + ${k - 1}(${d}) = ${ak}$.`,
      };
    }

    if (variant === 'kth-mean') {
      const n = r.int(3, 9);
      const a = r.int(-10, 30);
      const d = r.nonZero(-7, 9);
      const end = a + (n + 1) * d;
      const k = r.int(2, n - 1);
      const mean = a + k * d;
      const { answer, distractors } = ratOptions(frac(mean), [
        a + (k - 1) * d, // took the kth term instead of the (k + 1)th
        frac(a).add(frac(k * (end - a), n)), // divided b - a by n instead of n + 1
        a + (k + 1) * d,
        end - k * d, // counted from the wrong end
      ]);
      return {
        stem: tex`${cap(word(n))} arithmetic means are inserted between $${a}$ and $${end}$. The ${nth(k)} of these means, counting from $${a}$, is:`,
        answer,
        distractors,
        explanation: tex`With ${word(n)} means the A.P. has ${n + 2} terms, so $${end} = ${a} + ${n + 1}d$, giving $d = ${d}$. The ${nth(k)} mean is the ${nth(k + 1)} term: $${a} + ${k}(${d}) = ${mean}$.`,
      };
    }

    const n = r.int(4, 12);
    const d = r.nonZero(-6, 8);
    const a = r.intExcept(-10, 30, [-((n + 1) * d) / 2]); // keeps a + b non-zero
    const end = a + (n + 1) * d;
    const total = (n * (a + end)) / 2;
    const { answer, distractors } = ratOptions(frac(total), [
      frac((n + 2) * (a + end), 2), // included the end terms
      n * (a + end), // forgot to halve
      frac(a + end, 2), // a single mean
      frac((n + 1) * (a + end), 2),
    ]);
    return {
      stem: tex`If ${word(n)} arithmetic means are inserted between $${a}$ and $${end}$, their sum is:`,
      answer,
      distractors,
      explanation: tex`Together with $${a}$ and $${end}$ the means $A_1, \ldots, A_{${n}}$ form an A.P. If its common difference is $d$, then $A_1 + A_{${n}} = (${a} + d) + (${end} - d) = ${a + end}$, so the sum of the ${n} means is $\frac{${n}}{2}(A_1 + A_{${n}}) = \frac{${n}}{2}(${a + end}) = ${total}$.`,
    };
  }),

  b.dynamic('ap-sum-n-terms', { difficulty: 2, origin: 'past-paper', tags: ['arithmetic progression', 'sum of series'] }, (r) => {
    const context = r.pick(['series', 'series', 'seats', 'savings'] as const);

    if (context === 'series') {
      const d = r.nonZero(-6, 8);
      const n = r.int(10, 30);
      let a = r.nonZero(-15, 25);
      while (2 * a + (n - 1) * d === 0) a = r.nonZero(-15, 25); // S_n = 0 is degenerate
      const last = a + (n - 1) * d;
      const total = (n * (a + last)) / 2;
      const { answer, distractors } = intOptions(r, total, [
        (n * (2 * a + n * d)) / 2, // used n instead of n - 1
        2 * total, // forgot the 1/2
        (n * (a + (n - 1) * d)) / 2, // used a instead of 2a
        last, // gave the nth term
      ]);
      return {
        stem: tex`The sum of the first ${n} terms of the series $${seriesTex([a, a + d, a + 2 * d, a + 3 * d], a + 4 * d)}$ is:`,
        answer,
        distractors,
        explanation: tex`Here $a = ${a}$ and $d = ${d}$. $S_n = \frac{n}{2}\left[2a + (n - 1)d\right] = \frac{${n}}{2}\left[2(${a}) + ${n - 1}(${d})\right] = \frac{${n}}{2}(${2 * a + (n - 1) * d}) = ${total}$.`,
      };
    }

    if (context === 'seats') {
      const a = r.int(12, 30);
      const d = r.int(1, 4);
      const n = r.int(15, 30);
      const last = a + (n - 1) * d;
      const total = (n * (a + last)) / 2;
      const { answer, distractors } = intOptions(
        r,
        total,
        [(n * (2 * a + n * d)) / 2, n * last, last, 2 * total],
        false,
      );
      return {
        stem: tex`A hall has ${a} seats in the first row, and every row after that has ${d} more seat${d > 1 ? 's' : ''} than the row in front of it. If the hall has ${n} rows, the total number of seats is:`,
        answer,
        distractors,
        explanation: tex`The rows form an A.P. with $a = ${a}$, $d = ${d}$, $n = ${n}$: $S_{${n}} = \frac{${n}}{2}\left[2(${a}) + ${n - 1}(${d})\right] = \frac{${n}}{2}(${2 * a + (n - 1) * d}) = ${total}$.`,
      };
    }

    const a = r.multiple(500, 3000, 100);
    const d = r.multiple(50, 500, 50);
    const n = r.int(10, 24);
    const last = a + (n - 1) * d;
    const total = (n * (a + last)) / 2;
    const { answer, distractors } = numericOptions(r, {
      correct: total,
      wrong: [(n * (2 * a + n * d)) / 2, n * last, 2 * total, last],
      format: (v) => `Rs. ${v}`,
      fallback: 'integer',
    });
    return {
      stem: tex`A student saves Rs. ${a} in the first month and then increases the saving by Rs. ${d} every month. The total amount saved in ${n} months is:`,
      answer,
      distractors,
      explanation: tex`The monthly savings form an A.P. with $a = ${a}$, $d = ${d}$: $S_{${n}} = \frac{${n}}{2}\left[2(${a}) + ${n - 1}(${d})\right] = \frac{${n}}{2}(${2 * a + (n - 1) * d}) = ${total}$, i.e. Rs. ${total}.`,
    };
  }),

  b.dynamic('ap-sum-formula', { difficulty: 2, origin: 'past-paper', tags: ['arithmetic progression', 'sum of series'] }, (r) => {
    const p = r.nonZero(-4, 5);
    const q = r.int(-7, 9);
    const Sn = polyTex([p, q, 0], 'n');
    const an = polyTex([2 * p, q - p], 'n');

    if (r.chance(0.5)) {
      const d = 2 * p;
      const { answer, distractors } = intOptions(r, d, [
        p, // forgot the factor 2
        p + q, // the first term S_1
        3 * p + q, // the second term
        2 * p + q,
        4 * p + 2 * q, // S_2
      ]);
      return {
        stem: tex`The sum of the first $n$ terms of an A.P. is $S_n = ${Sn}$. Its common difference is:`,
        answer,
        distractors,
        explanation: tex`$a_n = S_n - S_{n-1} = ${an}$. So $a_1 = ${p + q}$, $a_2 = ${3 * p + q}$ and $d = a_2 - a_1 = ${d}$ (twice the coefficient of $n^2$).`,
      };
    }

    const k = r.int(5, 15);
    const Sk = p * k * k + q * k;
    const Sk1 = p * (k - 1) ** 2 + q * (k - 1);
    const ak = Sk - Sk1;
    const { answer, distractors } = intOptions(r, ak, [
      Sk, // gave S_k
      p * (2 * k + 1) + q, // computed S_(k+1) - S_k
      2 * p * k + q, // "differentiated" S_n
      p * (2 * k - 1), // dropped the linear part
    ]);
    return {
      stem: tex`If the sum of the first $n$ terms of an A.P. is $S_n = ${Sn}$, then its ${nth(k)} term is:`,
      answer,
      distractors,
      explanation: tex`$a_n = S_n - S_{n-1}$. Here $S_{${k}} = ${Sk}$ and $S_{${k - 1}} = ${Sk1}$, so $a_{${k}} = ${Sk} - ${paren(Sk1)} = ${ak}$. (In general $a_n = ${an}$.)`,
    };
  }),

  b.dynamic('sum-of-multiples', { difficulty: 2, tags: ['arithmetic progression', 'sum of series'] }, (r) => {
    const k = r.pick([3, 4, 6, 7, 8, 9, 11, 12, 13]);
    const mode = r.weighted(['between', 'two-digit', 'three-digit'] as const, [3, 1, 1]);
    let first: number;
    let last: number;
    let stem: string;
    if (mode === 'between') {
      const m = r.int(1, 20);
      const M = r.int(m + 10, m + 40);
      // Bounds that are not multiples of k, so "between" is unambiguous.
      const lo = k * m + r.int(1, k - 1);
      const hi = k * M + r.int(1, k - 1);
      first = k * (m + 1);
      last = k * M;
      stem = tex`The sum of all natural numbers between $${lo}$ and $${hi}$ that are divisible by $${k}$ is:`;
    } else {
      const [lo, hi, label] = mode === 'two-digit' ? [10, 99, 'two-digit'] : [100, 999, 'three-digit'];
      first = k * Math.ceil(lo / k);
      last = k * Math.floor(hi / k);
      stem = tex`The sum of all ${label} natural numbers that are divisible by $${k}$ is:`;
    }
    const count = (last - first) / k + 1;
    const total = (count * (first + last)) / 2;
    const { answer, distractors } = intOptions(
      r,
      total,
      [
        total - last, // one term short (forgot the +1 in the count)
        total + first - k, // started from one multiple too early
        total + last + k, // ran one multiple too far
        total - first,
      ],
      false,
    );
    return {
      stem,
      answer,
      distractors,
      explanation: tex`The numbers $${first}, ${first + k}, \ldots, ${last}$ form an A.P. with $d = ${k}$. Number of terms: $n = \frac{${last} - ${first}}{${k}} + 1 = ${count}$. Sum $= \frac{n}{2}(a + l) = \frac{${count}}{2}(${first} + ${last}) = ${total}$.`,
    };
  }),

  // ─────────────────────────── Geometric progression ───────────────────────────
  b.dynamic('gp-nth-term', { difficulty: 1, tags: ['geometric progression'] }, (r) => {
    if (r.chance(0.3)) {
      const rr = r.pick([2, 3, 4, -2, -3]);
      const a = r.int(1, 6) * r.pick([1, 1, -1]);
      // n >= 6 keeps every distractor (down to n - 2) beyond the three terms shown in the stem.
      const choices = range(6, 10).filter((n) => Math.abs(a * rr ** (n - 1)) <= 20000);
      const n = r.pick(choices);
      const L = a * rr ** (n - 1);
      const power = `${paren(rr)}^{${n - 1}}`;
      const ratioStep = a === 1 ? `${L}` : tex`\frac{${L}}{${a}} = ${L / a}`;
      const others = r.sample([n + 1, n + 2, n - 2], 2);
      return {
        stem: tex`Which term of the G.P. $${listTex([a, a * rr, a * rr * rr])}$ is $${L}$?`,
        answer: `${nth(n)} term`,
        // n - 1 is the exponent of r, a common stopping point.
        distractors: [n - 1, ...others].map((k) => `${nth(k)} term`),
        explanation: tex`Here $a = ${a}$ and $r = ${rr}$. Setting $ar^{n-1} = ${L}$ gives $${paren(rr)}^{n-1} = ${ratioStep} = ${power}$, so $n - 1 = ${n - 1}$ and $n = ${n}$.`,
      };
    }

    let a: Fraction;
    let ratio: Fraction;
    let n: number;
    if (r.chance(0.6)) {
      const rr = r.pick([2, 3, 4, 5, -2, -3]);
      const a0 = r.int(1, 5) * r.pick([1, 1, -1]);
      n = r.pick(range(5, 9).filter((m) => Math.abs(a0 * rr ** (m - 1)) <= 20000));
      a = frac(a0);
      ratio = frac(rr);
    } else {
      // Fractional ratio p/q; the first term q^m * c keeps the displayed terms integral.
      const [p, q] = r.pick([[1, 2], [-1, 2], [1, 3], [-1, 3], [2, 3], [3, 2]] as const);
      // A ratio of 3/2 stops at the 6th term so that the power stays mental-math sized.
      const m = q === 2 && p !== 3 ? r.int(2, 5) : 2;
      a = frac(r.int(1, 3) * q ** m);
      ratio = frac(p, q);
      n = p === 3 ? r.int(4, 6) : r.int(m + 2, m + 5);
    }
    const term = (i: number): Fraction => a.mul(ratio.pow(i));
    const ans = term(n - 1);
    const { answer, distractors } = ratOptions(ans, [
      term(n), // used r^n
      term(n - 2), // used r^(n-2)
      ratio.sign() < 0 ? ans.neg() : null, // sign slip
      a.add(term(1).sub(a).mul(n - 1)), // treated the G.P. as an A.P.
    ]);
    return {
      stem: tex`The ${nth(n)} term of the G.P. $${listTex([term(0), term(1), term(2)])}$ is:`,
      answer,
      distractors,
      explanation: tex`Here $a = ${ft(a)}$ and $r = \frac{${ft(term(1))}}{${ft(a)}} = ${ft(ratio)}$. Using $a_n = ar^{n-1}$: $a_{${n}} = ${ft(a)}\left(${ft(ratio)}\right)^{${n - 1}} = ${ft(ans)}$.`,
    };
  }),

  b.dynamic('gp-sum-n-terms', { difficulty: 2, tags: ['geometric progression', 'sum of series'] }, (r) => {
    const kind = r.weighted(['int', 'half', 'third'] as const, [3, 2, 1]);
    let a: number;
    let ratio: Fraction;
    let n: number;
    if (kind === 'int') {
      const rr = r.pick([2, 3, 4, 5, -2, -3]);
      a = r.int(1, 5);
      n = r.pick(range(4, 8).filter((m) => Math.abs(a * rr ** m) <= 20000));
      ratio = frac(rr);
    } else if (kind === 'half') {
      n = r.int(4, 7);
      ratio = frac(r.pick([1, -1]), 2);
      a = r.pick([1, 3, 5]) * 2 ** (n - 1);
    } else {
      // n >= 4: with n = 3 the answer would just be the sum of the three terms shown.
      n = r.int(4, 5);
      ratio = frac(r.pick([1, -1, 2]), 3);
      a = r.pick([1, 2]) * 3 ** (n - 1);
    }
    const one = frac(1);
    const term = (i: number): Fraction => ratio.pow(i).mul(a);
    const sum = (m: number): Fraction => one.sub(ratio.pow(m)).mul(a).div(one.sub(ratio));
    const S = sum(n);
    const big = Math.abs(ratio.toNumber()) > 1;
    const { answer, distractors } = ratOptions(S, [
      sum(n - 1), // one term short
      big ? ratio.pow(n).sub(1).mul(a) : one.sub(ratio.pow(n)).mul(a), // forgot to divide by r - 1 (or 1 - r)
      sum(n + 1), // one term too many
      term(n - 1), // gave the nth term
      big ? null : frac(a).div(one.sub(ratio)), // used the sum to infinity
    ]);
    const rn = ratio.pow(n);
    const working = big
      ? tex`S_n = \frac{a(r^n - 1)}{r - 1} = \frac{${a}\left(${ft(rn)} - 1\right)}{${ft(ratio)} - 1}`
      : tex`S_n = \frac{a(1 - r^n)}{1 - r} = \frac{${a}\left(1${minus(rn)}\right)}{1${minus(ratio)}}`;
    return {
      stem: tex`The sum of the first ${n} terms of the series $${seriesTex([term(0), term(1), term(2)], term(3))}$ is:`,
      answer,
      distractors,
      explanation: tex`Here $a = ${a}$ and $r = ${ft(ratio)}$. $${working} = ${ft(S)}$.`,
    };
  }),

  b.dynamic('geometric-means', { difficulty: 2, tags: ['means', 'geometric progression'] }, (r) => {
    const n = r.pick([2, 3, 4, 5]);
    const a = r.int(1, 5);
    const rr =
      n === 2 ? r.pick([2, 3, 4, 5, -2, -3, -4]) : n === 3 ? r.pick([2, 3, 4]) : n === 4 ? r.pick([2, 3, -2, -3]) : r.pick([2, 3]);
    const end = a * rr ** (n + 1);
    // With an odd number of means r = +/-|r|; asking for an even-numbered mean keeps the answer unique.
    const k = n % 2 === 1 ? r.pick(n === 3 ? [2] : [2, 4]) : r.int(1, n);
    const mean = a * rr ** k;
    const { answer, distractors } = ratOptions(frac(mean), [
      a * rr ** (k + 1), // off by one place
      frac(a).add(frac(k * (end - a), n + 1)), // inserted arithmetic means instead
      -mean, // sign slip
      a * rr ** (k - 1),
      a * rr ** (n + 1 - k), // counted from the other end
    ]);
    const ratioLine =
      n % 2 === 0
        ? tex`$r^{${n + 1}} = \frac{${end}}{${a}} = ${end / a}$, so $r = ${rr}$.`
        : tex`$r^{${n + 1}} = \frac{${end}}{${a}} = ${end / a}$, so $r = \pm ${rr}$; the ${nth(k)} mean contains the even power $r^{${k}}$, so both signs give the same value.`;
    return {
      stem: tex`If ${word(n)} geometric means are inserted between $${a}$ and $${end}$, the ${nth(k)} of these means, counting from $${a}$, is:`,
      answer,
      distractors,
      explanation: tex`With ${word(n)} means the G.P. has ${n + 2} terms, so $${end} = ${a}r^{${n + 1}}$: ${ratioLine} The ${nth(k)} mean is the ${nth(k + 1)} term: $${a}\left(${rr}\right)^{${k}} = ${mean}$.`,
    };
  }),

  b.dynamic('gp-products', { difficulty: 3, origin: 'past-paper', tags: ['geometric progression', 'means'] }, (r) => {
    if (r.chance(0.5)) {
      // n = 3 or 4 keeps the product unambiguous (for n = 5 a negative ratio would flip its sign).
      const n = r.pick([3, 4]);
      const G = r.int(2, n === 3 ? 12 : 7);
      const a = r.pick(divisors(G * G).filter((x) => x < G));
      const end = (G * G) / a;
      const product = G ** n;
      const { answer, distractors } = intOptions(
        r,
        product,
        [
          G ** (n + 2), // multiplied in the end terms too
          G ** (2 * n), // used (ab)^n, forgetting the square root
          n * G, // n times the single G.M.
          G ** (n - 1),
        ],
        false,
      );
      return {
        stem: tex`The product of ${word(n)} geometric means inserted between $${a}$ and $${end}$ is:`,
        answer,
        distractors,
        explanation: tex`If $G_1, \ldots, G_{${n}}$ are the means, then $${a}, G_1, \ldots, G_{${n}}, ${end}$ is a G.P., and terms equidistant from the ends have the same product $${a} \times ${end} = ${G * G}$. Hence $(G_1 G_2 \cdots G_{${n}})^2 = ${G * G}^{${n}}$ and the product is $\left(\sqrt{${G * G}}\right)^{${n}} = ${G}^{${n}} = ${product}$.`,
      };
    }

    const m = r.pick([1, 2, 2, 3]);
    const count = 2 * m + 1;
    const t = r.pick(m === 3 ? [2, 3, -2] : [2, 3, 4, 5, -2, -3]);
    const product = t ** count;
    const { answer, distractors } = intOptions(r, product, [
      t ** (count - 1), // miscounted the terms
      t ** (count + 1),
      -product, // sign slip
      count * t, // added instead of multiplied
    ]);
    return {
      stem: tex`The ${nth(m + 1)} term of a G.P. is $${t}$. The product of its first ${count} terms is:`,
      answer,
      distractors,
      explanation: tex`The product $a \cdot ar \cdot ar^2 \cdots ar^{${count - 1}} = a^{${count}}r^{${count * m}} = \left(ar^{${m}}\right)^{${count}}$, and $ar^{${m}}$ is the ${nth(m + 1)} term. So the product is $(${t})^{${count}} = ${product}$.`,
    };
  }),

  // ─────────────────────────── Infinite geometric series ───────────────────────────
  b.dynamic('infinite-gp-sum', { difficulty: 1, origin: 'past-paper', tags: ['infinite geometric series'] }, (r) => {
    const q = r.pick([2, 3, 4, 5]);
    const p = r.pick([1, 2, 3, 4].filter((x) => x < q && gcd(x, q) === 1));
    const s = r.pick([1, 1, -1]);
    const c = r.int(1, 3);
    const ratio = frac(s * p, q);
    const a = c * q * q;
    const one = frac(1);
    const S = frac(a).div(one.sub(ratio));
    const kind = r.weighted(['sum', 'first', 'ratio'] as const, [5, 2, 2]);

    if (kind === 'ratio') {
      // Reported NET theme: first term and sum to infinity given, find r. With a = k(q - sp)
      // the sum kq is an integer.
      const k = r.int(1, 6);
      const first = k * (q - s * p);
      const sum = k * q;
      const { answer, distractors } = ratOptions(ratio, [
        one.sub(ratio), // took r = a / S, forgetting the "1 -"
        ratio.neg(), // sign slip: r = a / S - 1
        one.sub(one.div(one.sub(ratio))), // inverted the fraction: r = 1 - S / a
        one.div(one.sub(ratio)), // took r = S / a
      ]);
      return {
        stem: tex`An infinite geometric series has first term $${first}$ and sum $${sum}$. Its common ratio is:`,
        answer,
        distractors,
        explanation: tex`$S_\infty = \frac{a}{1 - r} \Rightarrow 1 - r = \frac{a}{S_\infty} = ${fracSteps(first, sum)}$, so $r = 1 - ${ft(frac(first, sum))} = ${ft(ratio)}$ (and $|r| < 1$, as required).`,
      };
    }

    if (kind === 'sum') {
      const second = s * c * p * q;
      const { answer, distractors } = ratOptions(S, [
        frac(a).div(one.add(ratio)), // sign slip in 1 - r
        frac(a).mul(ratio).div(one.sub(ratio)), // started from the second term
        frac(a).mul(one.sub(ratio)), // multiplied instead of divided
        frac(a).div(one.sub(ratio.mul(ratio))),
      ]);
      return {
        stem: tex`The sum of the infinite geometric series $${seriesTex([a, second, c * p * p], frac(s * c * p ** 3, q))}$ is:`,
        answer,
        distractors,
        explanation: tex`$a = ${a}$ and $r = \frac{${second}}{${a}} = ${ft(ratio)}$; since $|r| < 1$, $S_\infty = \frac{a}{1 - r} = \frac{${a}}{1${minus(ratio)}} = ${ft(S)}$.`,
      };
    }

    const { answer, distractors } = ratOptions(frac(a), [
      S.mul(one.add(ratio)), // sign slip
      S.mul(ratio),
      S.div(one.sub(ratio)), // divided instead of multiplied
    ]);
    return {
      stem: tex`The sum of an infinite geometric series is $${ft(S)}$ and its common ratio is $${ft(ratio)}$. Its first term is:`,
      answer,
      distractors,
      explanation: tex`$S_\infty = \frac{a}{1 - r} \Rightarrow a = S_\infty(1 - r) = ${ft(S)}\left(1${minus(ratio)}\right) = ${a}$.`,
    };
  }),

  b.dynamic('recurring-decimal', { difficulty: 2, origin: 'past-paper', tags: ['infinite geometric series'] }, (r) => {
    const kind = r.weighted(['pure2', 'mixed', 'whole', 'pure3'] as const, [3, 3, 2, 2]);

    if (kind === 'pure2') {
      const x = r.int(1, 9);
      const y = r.intExcept(0, 9, [x]);
      const n = 10 * x + y;
      const value = frac(n, 99);
      const { answer, distractors } = ratOptions(value, [frac(n, 100), frac(n, 90), frac(n - x, 90), frac(n, 999)]);
      return {
        stem: tex`The recurring decimal $0.\overline{${x}${y}} = 0.${n}${n}${n}\ldots$ is equal to:`,
        answer,
        distractors,
        explanation: tex`$0.\overline{${n}} = \frac{${n}}{100} + \frac{${n}}{100^2} + \cdots$, an infinite G.P. with $a = \frac{${n}}{100}$ and $r = \frac{1}{100}$. Its sum is $\frac{${n}/100}{1 - 1/100} = ${fracSteps(n, 99)}$.`,
      };
    }

    if (kind === 'mixed') {
      const x = r.int(1, 9);
      const y = r.intExcept(1, 9, [x]);
      const value = frac(9 * x + y, 90);
      const { answer, distractors } = ratOptions(value, [
        frac(10 * x + y, 99), // treated it as a pure recurring decimal
        frac(10 * x + y, 90), // forgot to subtract the non-recurring part
        frac(10 * x + y, 100), // treated it as terminating
        frac(9 * x + y, 99),
      ]);
      return {
        stem: tex`The recurring decimal $0.${x}\overline{${y}} = 0.${x}${y}${y}${y}\ldots$ is equal to:`,
        answer,
        distractors,
        explanation: tex`$0.${x}\overline{${y}} = \frac{${x}}{10} + \left(\frac{${y}}{100} + \frac{${y}}{1000} + \cdots\right) = \frac{${x}}{10} + \frac{${y}/100}{1 - 1/10} = \frac{${x}}{10} + \frac{${y}}{90} = ${fracSteps(9 * x + y, 90)}$.`,
      };
    }

    if (kind === 'whole') {
      const N = r.int(1, 5);
      const y = r.int(1, 8);
      const value = frac(9 * N + y, 9);
      const { answer, distractors } = ratOptions(value, [
        frac(10 * N + y, 10), // treated it as terminating
        frac(10 * N + y, 9), // forgot to subtract the whole number part
        frac(99 * N + y, 99),
        frac(y, 9), // lost the whole number part
      ]);
      return {
        stem: tex`The recurring decimal $${N}.\overline{${y}} = ${N}.${y}${y}${y}\ldots$ is equal to:`,
        answer,
        distractors,
        explanation: tex`$${N}.\overline{${y}} = ${N} + \left(\frac{${y}}{10} + \frac{${y}}{100} + \cdots\right) = ${N} + \frac{${y}/10}{1 - 1/10} = ${N} + \frac{${y}}{9} = ${ft(value)}$.`,
      };
    }

    let n = r.int(101, 998);
    while (n % 111 === 0) n = r.int(101, 998); // 111, 222, ... recur with period 1
    const lead = Math.floor(n / 100);
    const value = frac(n, 999);
    const { answer, distractors } = ratOptions(value, [frac(n, 1000), frac(n, 990), frac(n - lead, 990), frac(n, 9990)]);
    return {
      stem: tex`The recurring decimal $0.\overline{${n}} = 0.${n}${n}\ldots$ is equal to:`,
      answer,
      distractors,
      explanation: tex`$0.\overline{${n}} = \frac{${n}}{1000} + \frac{${n}}{1000^2} + \cdots$, an infinite G.P. with $r = \frac{1}{1000}$. Its sum is $\frac{${n}/1000}{1 - 1/1000} = ${fracSteps(n, 999)}$.`,
    };
  }),

  b.dynamic('bouncing-ball', { difficulty: 3, tags: ['infinite geometric series'] }, (r) => {
    const [p, q] = r.pick([[1, 2], [2, 3], [3, 4], [4, 5], [3, 5], [1, 3], [2, 5]] as const);
    const step = q - p;
    const h = step * r.int(Math.ceil(6 / step), Math.floor(48 / step));
    const total = (h * (q + p)) / step;
    const rebound = (2 * h * p) / step;
    const { answer, distractors } = numericOptions(r, {
      correct: total,
      wrong: [
        (h * q) / step, // counted each rebound only once
        (2 * h * q) / step, // doubled the first drop as well
        rebound, // left out the first drop
        total + h,
        2 * total,
      ],
      format: (v) => q$(v, U.m),
      fallback: 'integer',
    });
    const rTex = tex`\frac{${p}}{${q}}`;
    return {
      stem: tex`A ball is dropped from a height of $${h}\,\mathrm{m}$. Each time it hits the ground it rebounds to $${rTex}$ of the height from which it fell. The total distance travelled by the ball before it comes to rest is:`,
      answer,
      distractors,
      explanation: tex`The ball first falls $${h}\,\mathrm{m}$; after that each rebound height is travelled twice (up and down). With $r = ${rTex}$: $D = ${h} + 2\left(${h}r + ${h}r^2 + \cdots\right) = ${h} + \frac{2(${h})r}{1 - r} = ${h} + \frac{${2 * h} \times ${rTex}}{1 - ${rTex}} = ${h} + ${rebound} = ${total}\,\mathrm{m}$.`,
    };
  }),

  // ─────────────────────────── Harmonic progression and means ───────────────────────────
  b.dynamic('harmonic-progression', { difficulty: 2, tags: ['harmonic progression'] }, (r) => {
    if (r.chance(0.55)) {
      const v = r.weighted([1, 2, 3], [5, 2, 1]);
      const n = r.int(6, 15);
      let u: number;
      let w: number;
      if (r.chance(0.8)) {
        u = r.int(1, 9);
        w = r.int(1, 5);
      } else {
        w = -r.int(1, 3);
        u = (n - 1) * -w + r.int(1, 8); // reciprocals stay positive up to the nth term
      }
      const hp = (i: number): Fraction => frac(v, u + i * w);
      const ans = hp(n - 1);
      const { answer, distractors } = ratOptions(ans, [
        safeFrac(v, u + n * w), // used n instead of n - 1
        frac(u + (n - 1) * w, v), // forgot to take the reciprocal
        hp(0).add(hp(1).sub(hp(0)).mul(n - 1)), // treated the H.P. as an A.P.
        safeFrac(v, u + (n - 2) * w),
      ]);
      return {
        stem: tex`The ${nth(n)} term of the H.P. $${listTex([hp(0), hp(1), hp(2)])}$ is:`,
        answer,
        distractors,
        explanation: tex`The reciprocals $${listTex([frac(u, v), frac(u + w, v), frac(u + 2 * w, v)])}$ form an A.P. with first term $${ft(frac(u, v))}$ and common difference $${ft(frac(w, v))}$. Its ${nth(n)} term is $${ft(frac(u, v))} + ${n - 1}\left(${ft(frac(w, v))}\right) = ${ft(frac(u + (n - 1) * w, v))}$, so the ${nth(n)} term of the H.P. is $${ft(ans)}$.`,
      };
    }

    const A = r.int(1, 9);
    const D = r.int(1, 6);
    const p = r.int(2, 5);
    const q = r.int(p + 2, 10);
    const k = r.int(q + 2, 25);
    const x = A + (p - 1) * D;
    const y = A + (q - 1) * D;
    const z = A + (k - 1) * D;
    const hx = frac(1, x);
    const hy = frac(1, y);
    const { answer, distractors } = ratOptions(frac(1, z), [
      frac(1, z + D), // used k instead of k - 1
      z, // forgot to take the reciprocal
      hx.add(hy.sub(hx).div(q - p).mul(k - p)), // treated the H.P. as an A.P.
      frac(1, z - D),
    ]);
    return {
      stem: tex`The ${nth(p)} term of an H.P. is $\frac{1}{${x}}$ and its ${nth(q)} term is $\frac{1}{${y}}$. Its ${nth(k)} term is:`,
      answer,
      distractors,
      explanation: tex`The reciprocals form an A.P.: $a + ${coefTex(p - 1, 'd')} = ${x}$ and $a + ${q - 1}d = ${y}$, so $d = ${D}$ and $a = ${A}$. Its ${nth(k)} term is $${A} + ${k - 1}(${D}) = ${z}$, so the ${nth(k)} term of the H.P. is $\frac{1}{${z}}$.`,
    };
  }),

  b.dynamic('means-of-two-numbers', { difficulty: 2, origin: 'past-paper', tags: ['means', 'harmonic progression'] }, (r) => {
    const variant = r.pick(['hm', 'numbers', 'gm-from-am-hm'] as const);

    if (variant === 'hm') {
      const a = r.int(2, 20);
      const c = r.intExcept(2, 30, [a]);
      const H = frac(2 * a * c, a + c);
      const g = Math.sqrt(a * c);
      const { answer, distractors } = ratOptions(H, [
        frac(a + c, 2), // the A.M.
        frac(a + c, 2 * a * c), // inverted the formula
        frac(a * c, a + c), // forgot the 2
        Number.isInteger(g) ? g : null, // the G.M.
      ]);
      return {
        stem: tex`The harmonic mean between $${a}$ and $${c}$ is:`,
        answer,
        distractors,
        explanation: tex`$H = \frac{2ab}{a + b} = \frac{2(${a})(${c})}{${a} + ${c}} = ${fracSteps(2 * a * c, a + c)}$.`,
      };
    }

    const [x, y] = r.pick(AM_GM_PAIRS);
    const A = (x + y) / 2;
    const G = Math.round(Math.sqrt(x * y));

    if (variant === 'numbers') {
      const pair = (u: number, v: number): string => `$${Math.max(u, v)}$ and $${Math.min(u, v)}$`;
      const answer = pair(x, y);
      const sameProduct = divisors(G * G).filter((dv) => dv < G && dv !== y);
      // Every option below has the wrong sum or the wrong product, so exactly one pair fits.
      const pool = [pair(A + G, A - G)]; // took the numbers as A +/- G: right sum, wrong product
      if (sameProduct.length) {
        const dv = r.pick(sameProduct);
        pool.push(pair((G * G) / dv, dv)); // right product, wrong sum
      }
      for (const s of r.shuffle([1, 2, 3])) {
        // right sum, wrong product
        if (y - s > 0) pool.push(pair(x + s, y - s));
        if (x - s > y + s) pool.push(pair(x - s, y + s));
      }
      pool.push(pair(A, G)); // confused the means with the numbers
      return {
        stem: tex`The arithmetic mean of two positive numbers is $${A}$ and their geometric mean is $${G}$. The numbers are:`,
        answer,
        distractors: pickDistractors(answer, pool),
        explanation: tex`$x + y = 2A = ${2 * A}$ and $xy = G^2 = ${G * G}$, so $x$ and $y$ are the roots of $t^2 - ${2 * A}t + ${G * G} = 0$, i.e. $(t - ${x})(t - ${y}) = 0$. The numbers are $${x}$ and $${y}$.`,
      };
    }

    const H = frac(G * G, A);
    const { answer, distractors } = ratOptions(frac(G), [
      G * G, // forgot the square root of AH
      H.add(A).div(2), // took G as the A.M. of A and H
      2 * G, // near miss: twice the G.M.
    ]);
    return {
      stem: tex`The arithmetic mean and the harmonic mean of two positive numbers are $${A}$ and $${ft(H)}$ respectively. Their geometric mean is:`,
      answer,
      distractors,
      explanation: tex`For two positive numbers $AH = \frac{a + b}{2} \cdot \frac{2ab}{a + b} = ab = G^2$. So $G = \sqrt{${A} \times ${ft(H)}} = \sqrt{${G * G}} = ${G}$.`,
    };
  }),

  // ─────────────────────────── Sum of series ───────────────────────────
  b.dynamic('power-sums', { difficulty: 2, tags: ['sum of series'] }, (r) => {
    const kind = r.pick(['squares', 'cubes', 'products', 'linear', 'cubes-inverse'] as const);

    if (kind === 'squares') {
      const n = r.int(8, 30);
      const S = (n * (n + 1) * (2 * n + 1)) / 6;
      const { answer, distractors } = intOptions(
        r,
        S,
        [
          (n * (n + 1) * (2 * n + 1)) / 3, // divided by 3 instead of 6
          ((n * (n + 1)) / 2) ** 2, // used the sum-of-cubes formula
          ((n - 1) * n * (2 * n - 1)) / 6, // one term short
          (n * (n + 1)) / 2,
        ],
        false,
      );
      return {
        stem: tex`The sum $1^2 + 2^2 + 3^2 + \cdots + ${n}^2$ is:`,
        answer,
        distractors,
        explanation: tex`$\sum_{k=1}^{n} k^2 = \frac{n(n+1)(2n+1)}{6} = \frac{${n}(${n + 1})(${2 * n + 1})}{6} = ${S}$.`,
      };
    }

    if (kind === 'cubes') {
      const n = r.int(6, 25);
      const T = (n * (n + 1)) / 2;
      const S = T * T;
      const { answer, distractors } = intOptions(
        r,
        S,
        [
          (n * (n + 1) * (2 * n + 1)) / 6, // used the sum-of-squares formula
          (n * n * (n + 1) ** 2) / 2, // divided by 2 instead of 4
          (((n - 1) * n) / 2) ** 2, // one term short
          T, // forgot to square
        ],
        false,
      );
      return {
        stem: tex`The sum $1^3 + 2^3 + 3^3 + \cdots + ${n}^3$ is:`,
        answer,
        distractors,
        explanation: tex`$\sum_{k=1}^{n} k^3 = \left[\frac{n(n+1)}{2}\right]^2 = \left[\frac{${n}(${n + 1})}{2}\right]^2 = ${T}^2 = ${S}$.`,
      };
    }

    if (kind === 'products') {
      const n = r.int(6, 25);
      const S = (n * (n + 1) * (n + 2)) / 3;
      const { answer, distractors } = intOptions(
        r,
        S,
        [
          (n * (n + 1) * (2 * n + 1)) / 6, // only the sum of squares
          (n * (n + 1) * (n + 2)) / 6, // divided by 6 instead of 3
          ((n - 1) * n * (n + 1)) / 3, // one term short
          n * (n + 1) * (n + 2),
        ],
        false,
      );
      return {
        stem: tex`The sum $1 \cdot 2 + 2 \cdot 3 + 3 \cdot 4 + \cdots + ${n} \cdot ${n + 1}$ is:`,
        answer,
        distractors,
        explanation: tex`$\sum_{k=1}^{n} k(k+1) = \sum k^2 + \sum k = \frac{n(n+1)(2n+1)}{6} + \frac{n(n+1)}{2} = \frac{n(n+1)(n+2)}{3} = \frac{${n}(${n + 1})(${n + 2})}{3} = ${S}$.`,
      };
    }

    if (kind === 'linear') {
      const p = r.int(2, 6);
      const q = r.nonZero(-5, 9);
      const n = r.int(10, 40);
      const tri = (n * (n + 1)) / 2;
      const S = p * tri + q * n;
      const { answer, distractors } = intOptions(r, S, [
        p * tri + q, // added q only once
        2 * p * tri + q * n, // forgot the 1/2 in the sum of k
        (p * n * (n - 1)) / 2 + q * n, // used n(n - 1)/2
        (p * n * n) / 2 + q * n,
      ]);
      return {
        stem: tex`The value of $\displaystyle\sum_{k=1}^{${n}} (${p}k${signed(q)})$ is:`,
        answer,
        distractors,
        explanation: tex`$\sum_{k=1}^{n} (pk + q) = p\sum k + qn = ${p} \cdot \frac{${n}(${n + 1})}{2}${signed(q)}(${n}) = ${p * tri}${signed(q * n)} = ${S}$.`,
      };
    }

    const n = r.int(5, 20);
    const T = (n * (n + 1)) / 2;
    const { answer, distractors } = intOptions(r, n, [T, n - 1, n + 1, n + 2], false);
    return {
      stem: tex`If $1^3 + 2^3 + 3^3 + \cdots + n^3 = ${T * T}$, then $n$ is:`,
      answer,
      distractors,
      explanation: tex`$\left[\frac{n(n+1)}{2}\right]^2 = ${T * T} \Rightarrow \frac{n(n+1)}{2} = ${T} \Rightarrow n(n+1) = ${2 * T} = ${n} \times ${n + 1}$, so $n = ${n}$.`,
    };
  }),

  b.dynamic('sigma-lower-limit', { difficulty: 1, origin: 'past-paper', tags: ['sum of series'] }, (r) => {
    // Reported NET theme: a sum of k that does not start at k = 1 (off-by-one trap).
    const m = r.pick([2, 2, 3, 4, 5]);
    const n = r.int(15, 40);
    const tri = (k: number): number => (k * (k + 1)) / 2;
    const S = tri(n) - tri(m - 1);
    const { answer, distractors } = intOptions(
      r,
      S,
      [
        tri(n), // summed from k = 1
        tri(n) - tri(m), // removed the k = m term as well
        tri(n - 1) - tri(m - 1), // stopped one term early
        tri(n) - m, // subtracted only k = m
      ],
      false,
    );
    const removed = m === 2 ? '1' : `(${range(1, m - 1).join(' + ')})`;
    return {
      stem: tex`The value of $\displaystyle\sum_{k=${m}}^{${n}} k$ is:`,
      answer,
      distractors,
      explanation: tex`The sum runs from $k = ${m}$, so remove the missing terms from $\sum_{k=1}^{${n}} k$: $\frac{${n}(${n + 1})}{2} - ${removed} = ${tri(n)} - ${tri(m - 1)} = ${S}$.`,
    };
  }),

  b.dynamic('special-series', { difficulty: 3, tags: ['sum of series', 'infinite geometric series'] }, (r) => {
    const kind = r.pick(['unit', 'odd', 'agp'] as const);

    if (kind === 'unit') {
      const n = r.int(6, 40);
      const { answer, distractors } = ratOptions(frac(n, n + 1), [
        frac(n + 2, n + 1), // sign slip: 1 + 1/(n + 1)
        frac(n - 1, n), // one term short
        frac(n + 1, n + 2), // one term too many
        frac(1, n + 1),
      ]);
      return {
        stem: tex`The sum $\frac{1}{1 \cdot 2} + \frac{1}{2 \cdot 3} + \frac{1}{3 \cdot 4} + \cdots + \frac{1}{${n} \cdot ${n + 1}}$ is:`,
        answer,
        distractors,
        explanation: tex`Since $\frac{1}{k(k+1)} = \frac{1}{k} - \frac{1}{k+1}$, the sum telescopes: $\left(1 - \frac{1}{2}\right) + \left(\frac{1}{2} - \frac{1}{3}\right) + \cdots + \left(\frac{1}{${n}} - \frac{1}{${n + 1}}\right) = 1 - \frac{1}{${n + 1}} = \frac{${n}}{${n + 1}}$.`,
      };
    }

    if (kind === 'odd') {
      const n = r.int(5, 30);
      const { answer, distractors } = ratOptions(frac(n, 2 * n + 1), [
        frac(2 * n, 2 * n + 1), // forgot the factor 1/2
        frac(n + 1, 2 * n + 1), // sign slip: (1/2)(1 + 1/(2n + 1))
        frac(n - 1, 2 * n - 1), // one term short
        frac(n + 1, 2 * n + 3),
      ]);
      return {
        stem: tex`The sum $\frac{1}{1 \cdot 3} + \frac{1}{3 \cdot 5} + \frac{1}{5 \cdot 7} + \cdots + \frac{1}{${2 * n - 1} \cdot ${2 * n + 1}}$ is:`,
        answer,
        distractors,
        explanation: tex`$\frac{1}{(2k-1)(2k+1)} = \frac{1}{2}\left(\frac{1}{2k-1} - \frac{1}{2k+1}\right)$, so the ${n} terms telescope to $\frac{1}{2}\left(1 - \frac{1}{${2 * n + 1}}\right) = \frac{${n}}{${2 * n + 1}}$.`,
      };
    }

    const [p, q] = r.pick([[1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 5], [3, 4]] as const);
    const x = frac(p, q);
    const one = frac(1);
    const gap = one.sub(x);
    const S = one.div(gap.pow(2));
    const xt = tex`\frac{${p}}{${q}}`;
    const series =
      p === 1
        ? tex`1 + \frac{2}{${q}} + \frac{3}{${q * q}} + \frac{4}{${q ** 3}} + \cdots`
        : tex`1 + 2\left(${xt}\right) + 3\left(${xt}\right)^2 + 4\left(${xt}\right)^3 + \cdots`;
    const { answer, distractors } = ratOptions(S, [
      one.div(gap), // summed only the geometric part
      x.div(gap.pow(2)),
      one.add(x).div(gap.pow(2)),
      one.div(gap.pow(3)),
    ]);
    return {
      stem: tex`The sum of the infinite series $${series}$ is:`,
      answer,
      distractors,
      explanation: tex`Let $S = 1 + 2x + 3x^2 + \cdots$ with $x = ${xt}$. Then $xS = x + 2x^2 + \cdots$, so $S - xS = 1 + x + x^2 + \cdots = \frac{1}{1 - x}$ and $S = \frac{1}{(1 - x)^2} = \frac{1}{\left(1 - ${xt}\right)^2} = ${ft(S)}$.`,
    };
  }),

  // ─────────────────────────── Fixed conceptual questions ───────────────────────────
  ...b.mcqs([
    {
      id: 'hp-definition',
      d: 1,
      t: ['harmonic progression'],
      q: 'A sequence of non-zero numbers is called a harmonic progression (H.P.) if the reciprocals of its terms form:',
      a: 'an arithmetic progression',
      x: ['a geometric progression', 'a harmonic progression', 'an increasing sequence'],
      e: tex`By definition $a_1, a_2, a_3, \ldots$ is an H.P. when $\frac{1}{a_1}, \frac{1}{a_2}, \frac{1}{a_3}, \ldots$ is an A.P. For example, $\frac{1}{2}, \frac{1}{5}, \frac{1}{8}, \ldots$ is an H.P. because $2, 5, 8, \ldots$ is an A.P.`,
    },
    {
      id: 'infinite-gp-convergence',
      d: 1,
      o: 'past-paper',
      t: ['infinite geometric series'],
      q: tex`The infinite geometric series $a + ar + ar^2 + \cdots$ $(a \neq 0)$ has a finite sum if and only if:`,
      a: '$|r| < 1$',
      x: ['$r < 1$', tex`$|r| \le 1$`, '$|r| > 1$'],
      e: tex`$S_n = \frac{a(1 - r^n)}{1 - r}$ approaches the finite limit $\frac{a}{1 - r}$ only when $r^n \to 0$, i.e. $|r| < 1$. For $r = 1$ the partial sums $na$ grow without bound, for $r = -1$ they oscillate between $a$ and $0$, and "$r < 1$" wrongly admits values such as $r = -2$.`,
    },
    {
      id: 'sum-of-odd-numbers',
      d: 1,
      t: ['sum of series', 'arithmetic progression'],
      q: tex`The sum of the first $n$ odd natural numbers, $1 + 3 + 5 + \cdots + (2n - 1)$, is:`,
      a: '$n^2$',
      x: ['$n(n+1)$', tex`$\frac{n(n+1)}{2}$`, '$2n - 1$'],
      e: tex`The series is an A.P. with $a = 1$, $d = 2$: $S_n = \frac{n}{2}\left[2(1) + (n - 1)(2)\right] = \frac{n}{2}(2n) = n^2$. ($n(n+1)$ is the sum of the first $n$ even numbers, $\frac{n(n+1)}{2}$ that of the first $n$ natural numbers, and $2n - 1$ is only the last term.)`,
    },
    {
      id: 'ap-multiplied-by-constant',
      d: 1,
      t: ['arithmetic progression'],
      q: tex`Each term of an A.P. whose common difference is $d \neq 0$ is multiplied by $3$. The new sequence is:`,
      a: tex`an A.P. with common difference $3d$`,
      x: [tex`an A.P. with common difference $d$`, tex`an A.P. with common difference $\frac{d}{3}$`, tex`a G.P. with common ratio $3$`],
      e: tex`If the terms are $a, a + d, a + 2d, \ldots$, the new terms are $3a, 3a + 3d, 3a + 6d, \ldots$. Consecutive terms differ by the constant $3d$, so the new sequence is an A.P. with common difference $3d$.`,
    },
    {
      id: 'agh-inequality',
      d: 1,
      t: ['means'],
      q: tex`If $A$, $G$ and $H$ are respectively the arithmetic, geometric and harmonic means of two distinct positive numbers, then:`,
      a: '$A > G > H$',
      x: ['$H > G > A$', '$G > A > H$', '$A > H > G$'],
      e: tex`For distinct positive $a, b$: $A - G = \frac{a + b}{2} - \sqrt{ab} = \frac{(\sqrt{a} - \sqrt{b})^2}{2} > 0$. Also $G^2 = AH$, so $\frac{G}{H} = \frac{A}{G} > 1$. Hence $A > G > H$ (all three are equal only when $a = b$).`,
    },
    {
      id: 'logs-of-gp-terms',
      d: 2,
      t: ['geometric progression', 'arithmetic progression'],
      q: tex`If the positive numbers $a$, $b$, $c$ are in G.P. with common ratio $r \neq 1$, then $\log a$, $\log b$, $\log c$ are in:`,
      a: 'A.P.',
      x: ['G.P.', 'H.P.', 'neither A.P. nor G.P.'],
      e: tex`$b = ar$ and $c = ar^2$, so $\log b = \log a + \log r$ and $\log c = \log a + 2\log r$. The logarithms increase by the constant $\log r \neq 0$, so they form an A.P. (with a non-zero common difference, which cannot also be a G.P. or an H.P.).`,
    },
    {
      id: 'ap-and-gp-together',
      d: 2,
      t: ['arithmetic progression', 'geometric progression'],
      q: tex`If three non-zero numbers $a$, $b$, $c$ are in A.P. and also in G.P., then:`,
      a: '$a = b = c$',
      x: [tex`$a = c \neq b$`, '$a + c = 0$', '$a = 2b = c$'],
      e: tex`A.P.: $2b = a + c$; G.P.: $b^2 = ac$. Then $(a + c)^2 = 4b^2 = 4ac$, so $(a - c)^2 = 0$ and $a = c$; now $2b = 2a$ gives $b = a$. Hence $a = b = c$.`,
    },
    {
      id: 'triangular-numbers',
      d: 1,
      t: ['sum of series'],
      q: tex`The $n$th term of the sequence $1, 3, 6, 10, 15, \ldots$ is:`,
      a: tex`$\frac{n(n+1)}{2}$`,
      x: [tex`$\frac{n(n-1)}{2}$`, '$2n - 1$', tex`$\frac{n(n+1)(n+2)}{6}$`],
      e: tex`The differences $2, 3, 4, 5, \ldots$ show that $T_n = 1 + 2 + 3 + \cdots + n = \frac{n(n+1)}{2}$; check: $T_4 = \frac{4 \cdot 5}{2} = 10$. ($2n - 1$ fits only the first two terms, and $\frac{n(n+1)(n+2)}{6}$ is the sum of the first $n$ terms.)`,
    },
    {
      id: 'pth-term-q-qth-term-p',
      d: 3,
      o: 'past-paper',
      t: ['arithmetic progression'],
      q: tex`In an A.P. the $p$th term is $q$ and the $q$th term is $p$, where $p \neq q$. The $(p + q)$th term is:`,
      a: '$0$',
      x: ['$p + q - 1$', '$-1$', '$p + q$'],
      e: tex`$a + (p - 1)d = q$ and $a + (q - 1)d = p$. Subtracting, $(p - q)d = q - p$, so $d = -1$ and $a = p + q - 1$. Then $a_{p+q} = a + (p + q - 1)d = (p + q - 1) - (p + q - 1) = 0$. ($p + q - 1$ is the first term and $-1$ the common difference.)`,
    },
  ]),
]);
