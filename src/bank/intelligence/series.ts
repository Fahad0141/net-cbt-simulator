import { defineBank } from '@/engine/authoring';
import { isPrime, numericOptions, ordinal, pickDistractors, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Element `i` of an array (throws instead of returning undefined). */
function at<T>(xs: readonly T[], i: number): T {
  const v = xs[i < 0 ? xs.length + i : i];
  if (v === undefined) throw new RangeError(`index ${i} out of range`);
  return v;
}

const inAlpha = (p: number): boolean => Number.isInteger(p) && p >= 1 && p <= 26;

/** Letter at alphabet position `p` (A = 1 ... Z = 26). */
function L(p: number): string {
  if (!inAlpha(p)) throw new RangeError(`letter position ${p} out of range`);
  return ALPHA.charAt(p - 1);
}

/** 'C (3)' style label used in explanations. */
const Lp = (p: number): string => `${L(p)} (${p})`;

const list = (terms: readonly (number | string)[]): string => terms.join(', ');

/** Numeric options for an integer answer, formatted as plain numbers. */
function intOptions(r: Rng, correct: number, wrong: readonly number[]): { answer: string; distractors: string[] } {
  return numericOptions(r, { correct, wrong, format: (v) => String(v), fallback: 'integer' });
}

/**
 * Three letter distractors from candidate alphabet positions (mistake-based first),
 * skipping positions outside A-Z and the answer itself; nearby letters fill any gap.
 */
function letterDistractors(answerPos: number, candidates: readonly number[]): string[] {
  const near = [1, -1, 2, -2, 3, -3, 4, -4].map((o) => answerPos + o);
  const pool = [...candidates, ...near].filter(inAlpha).map(L);
  return pickDistractors(L(answerPos), pool);
}

/** Uniform start position so that `count` letters stepping by `step` stay inside A-Z. */
function letterStart(r: Rng, step: number, jumps: number): number {
  return step > 0 ? r.int(1, 26 - jumps * step) : r.int(1 + jumps * -step, 26);
}

const signWord = (d: number): string => (d > 0 ? 'forward' : 'backward');
const op = (d: number): string => (d < 0 ? `- ${-d}` : `+ ${d}`);

function nextNumberStem(r: Rng, terms: readonly number[]): string {
  return r.pick([
    `What number comes next in the series ${list(terms)}, ...?`,
    `Find the next term of the series: ${list(terms)}, ?`,
  ]);
}

function nextLetterStem(r: Rng, terms: readonly string[]): string {
  return r.pick([
    `What comes next in the letter series ${list(terms)}, ...?`,
    `Find the next term of the series: ${list(terms)}, ?`,
  ]);
}

const PRIMES = Array.from({ length: 120 }, (_, i) => i).filter(isPrime);

/** Random letter groups that spell something rude; letter-group items never show them. */
const BLOCKED_GROUPS = new Set([
  'ASS', 'SEX', 'FAG', 'CUM', 'TIT', 'FUK', 'FCK', 'FUC', 'DIK', 'DIC', 'NIG', 'KKK', 'WTF', 'KYS',
  'XXX', 'PIS', 'NAZ', 'HOE', 'COK', 'SUK', 'JIZ', 'VAG', 'GAY', 'POO', 'PEE', 'BUM', 'SOB', 'FKU',
]);

export default defineBank('intelligence', 'series', (b) => [
  // =========================================================================
  // Number series: next term
  // =========================================================================
  b.dynamic('arithmetic-next-term', { difficulty: 1, origin: 'past-paper', tags: ['number series'] }, (r) => {
    const d = r.pick([-9, -8, -7, -6, -5, -4, -3, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15]);
    const a = d > 0 ? r.int(2, 60) : r.int(60, 140);
    const terms = Array.from({ length: 5 }, (_, i) => a + i * d);
    const next = a + 5 * d;
    const { answer, distractors } = intOptions(r, next, [
      next + d, // skipped a term
      next + (d > 0 ? 1 : -1), // used a difference one too large
      next - (d > 0 ? 1 : -1), // used a difference one too small
    ]);
    return {
      stem: nextNumberStem(r, terms),
      answer,
      distractors,
      explanation: tex`Each term ${d > 0 ? 'increases' : 'decreases'} by ${Math.abs(d)} (common difference $${d}$), so the next term is $${at(terms, -1)} ${op(d)} = ${next}$.`,
    };
  }),

  b.dynamic('geometric-next-term', { difficulty: 1, tags: ['number series'] }, (r) => {
    const ratio = r.pick([2, 2, 3, 3, 4, 5]);
    const count = ratio <= 3 ? 5 : 4;
    const a = ratio === 2 ? r.int(1, 9) : ratio === 3 ? r.int(1, 4) : ratio === 4 ? r.int(1, 3) : r.int(1, 2);
    const terms = Array.from({ length: count }, (_, i) => a * ratio ** i);
    const last = at(terms, -1);
    const prev = at(terms, -2);
    const next = last * ratio;
    const { answer, distractors } = intOptions(r, next, [
      2 * last - prev, // treated it as an arithmetic series
      last * (ratio + 1), // multiplied by one more than the ratio
      next * ratio, // skipped a term
    ]);
    return {
      stem: nextNumberStem(r, terms),
      answer,
      distractors,
      explanation: tex`Each term is ${ratio} times the one before it (${list(terms.slice(1).map((t, i) => tex`$${at(terms, i)} \times ${ratio} = ${t}$`))}), so the next term is $${last} \times ${ratio} = ${next}$.`,
    };
  }),

  b.dynamic('squares-cubes-offset', { difficulty: 2, origin: 'past-paper', tags: ['number series'] }, (r) => {
    const p = r.pick([2, 2, 3]);
    const k = r.nonZero(-5, 5);
    let s = p === 2 ? r.int(2, 9) : r.int(1, 5);
    while (s ** p + k < 1) s++;
    const f = (n: number): number => n ** p + k;
    const ns = [0, 1, 2, 3, 4].map((i) => s + i);
    const terms = ns.map(f);
    const next = f(s + 5);
    const last = at(terms, -1);
    const prev = at(terms, -2);
    const { answer, distractors } = intOptions(r, next, [
      f(s + 6), // skipped a value of n
      (s + 5) ** p - k, // applied the offset with the wrong sign
      2 * last - prev, // repeated the last difference
      (s + 5) ** p, // forgot the offset
    ]);
    const kTex = op(k);
    const word = p === 2 ? 'square' : 'cube';
    return {
      stem: nextNumberStem(r, terms),
      answer,
      distractors,
      explanation: tex`Each term is a perfect ${word} ${k > 0 ? 'plus' : 'minus'} ${Math.abs(k)}: ${list(ns.map((n) => `$${n}^{${p}} ${kTex} = ${f(n)}$`))}. The next term is $${s + 5}^{${p}} ${kTex} = ${next}$.`,
    };
  }),

  b.dynamic('consecutive-products', { difficulty: 2, origin: 'past-paper', tags: ['number series'] }, (r) => {
    const fam = r.pick(['pronic', 'cube-minus', 'cube-plus'] as const);
    const s = fam === 'pronic' ? r.int(1, 10) : fam === 'cube-minus' ? r.int(2, 5) : r.int(1, 5);
    const f = (n: number): number => (fam === 'pronic' ? n * (n + 1) : fam === 'cube-minus' ? n ** 3 - n : n ** 3 + n);
    const ns = [0, 1, 2, 3, 4].map((i) => s + i);
    const terms = ns.map(f);
    const next = f(s + 5);
    const [t2, t3, t4] = [at(terms, -3), at(terms, -2), at(terms, -1)];
    const d1 = t4 - t3;
    const dd = d1 - (t3 - t2);
    const { answer, distractors } = intOptions(r, next, [
      t4 + d1 + dd, // assumed the second differences are constant
      t4 + d1, // repeated the last difference
      f(s + 6), // skipped a term
      (s + 5) ** 2, // used n squared only
    ]);
    const show = (n: number): string =>
      fam === 'pronic' ? tex`${n} \times ${n + 1}` : fam === 'cube-minus' ? `${n}^3 - ${n}` : `${n}^3 + ${n}`;
    const rule =
      fam === 'pronic'
        ? 'the product of two consecutive integers, $n(n+1)$'
        : fam === 'cube-minus'
          ? 'of the form $n^3 - n = (n-1)n(n+1)$'
          : 'of the form $n^3 + n$';
    return {
      stem: nextNumberStem(r, terms),
      answer,
      distractors,
      explanation: tex`Each term is ${rule}: ${list(ns.map((n) => `$${show(n)} = ${f(n)}$`))}. The next term is $${show(s + 5)} = ${next}$.`,
    };
  }),

  b.dynamic('increasing-differences', { difficulty: 1, tags: ['number series'] }, (r) => {
    const kind = r.pick(['ap', 'ap', 'double'] as const);
    let diffs: number[];
    let nextDiff: number;
    let rule: string;
    if (kind === 'ap') {
      const d0 = r.int(1, 5);
      const e = r.int(1, 3);
      diffs = [0, 1, 2, 3, 4].map((i) => d0 + i * e);
      nextDiff = d0 + 5 * e;
      rule = `increase by ${e} each time`;
    } else {
      const d0 = r.pick([1, 2, 3]);
      diffs = [0, 1, 2, 3].map((i) => d0 * 2 ** i);
      nextDiff = d0 * 16;
      rule = 'double each time';
    }
    const a = r.int(2, 30);
    const terms = [a];
    for (const d of diffs) terms.push(at(terms, -1) + d);
    const last = at(terms, -1);
    const lastDiff = at(diffs, -1);
    const next = last + nextDiff;
    const { answer, distractors } = intOptions(r, next, [
      last + lastDiff, // repeated the last difference
      last + nextDiff + (nextDiff - lastDiff), // jumped one difference too far
      2 * last, // doubled the last term
      next + 1,
    ]);
    return {
      stem: nextNumberStem(r, terms),
      answer,
      distractors,
      explanation: tex`The differences between consecutive terms are ${list(diffs)}; they ${rule}, so the next difference is ${nextDiff}. Next term $= ${last} + ${nextDiff} = ${next}$.`,
    };
  }),

  b.dynamic('multiply-and-add', { difficulty: 2, tags: ['number series'] }, (r) => {
    const m = r.pick([2, 2, 3]);
    const c = r.nonZero(-3, 3);
    let a = m === 2 ? r.int(2, 9) : r.int(1, 4);
    while (a * m + c <= a) a++;
    const terms = [a];
    for (let i = 0; i < 4; i++) terms.push(at(terms, -1) * m + c);
    const last = at(terms, -1);
    const prev = at(terms, -2);
    const next = last * m + c;
    const { answer, distractors } = intOptions(r, next, [
      last * m, // forgot the constant
      last * m + 2 * c, // added the constant twice
      last * m - c, // constant with the wrong sign
      2 * last - prev, // repeated the last difference
    ]);
    return {
      stem: nextNumberStem(r, terms),
      answer,
      distractors,
      explanation: tex`Each term is ${m} times the previous term ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}: $${a} \times ${m} ${op(c)} = ${at(terms, 1)}$, $${at(terms, 1)} \times ${m} ${op(c)} = ${at(terms, 2)}$, and so on. Next term $= ${last} \times ${m} ${op(c)} = ${next}$.`,
    };
  }),

  b.dynamic('alternating-operations', { difficulty: 2, tags: ['number series'] }, (r) => {
    type Op = { f: (x: number) => number; label: string };
    const kind = r.pick(['add-mul', 'mul-sub', 'add-sub'] as const);
    let ops: [Op, Op];
    let a: number;
    if (kind === 'add-mul') {
      const p = r.int(1, 9);
      const q = r.pick([2, 3]);
      ops = [
        { f: (x) => x + p, label: `+${p}` },
        { f: (x) => x * q, label: `\\times ${q}` },
      ];
      a = r.int(1, q === 2 ? 12 : 6);
    } else if (kind === 'mul-sub') {
      const q = r.pick([2, 3]);
      const p = r.int(1, 9);
      ops = [
        { f: (x) => x * q, label: `\\times ${q}` },
        { f: (x) => x - p, label: `-${p}` },
      ];
      // a(q - 1) > p keeps every "×q then −p" pair rising, so no term reaches zero or goes negative.
      a = r.int(Math.floor(p / (q - 1)) + 1, q === 2 ? 15 : 7);
    } else {
      const p = r.int(5, 15);
      const s = r.int(1, p - 3);
      ops = [
        { f: (x) => x + p, label: `+${p}` },
        { f: (x) => x - s, label: `-${s}` },
      ];
      a = r.int(5, 50);
    }
    const shown = r.pick([6, 7]);
    const terms = [a];
    for (let i = 0; i < shown - 1; i++) terms.push(at(ops, i % 2).f(at(terms, -1)));
    const nextOp = at(ops, (shown - 1) % 2);
    const otherOp = at(ops, shown % 2);
    const last = at(terms, -1);
    const next = nextOp.f(last);
    const { answer, distractors } = intOptions(r, next, [
      otherOp.f(last), // repeated the previous operation
      nextOp.f(otherOp.f(last)), // applied both operations
      nextOp.f(next), // applied the right operation twice
    ]);
    const seq = Array.from({ length: shown - 1 }, (_, i) => `$${at(ops, i % 2).label}$`);
    return {
      stem: nextNumberStem(r, terms),
      answer,
      distractors,
      explanation: tex`Two operations alternate: ${list(seq)}. The next step is $${nextOp.label}$: $${last} \to ${next}$.`,
    };
  }),

  b.dynamic('interleaved-series', { difficulty: 2, origin: 'past-paper', tags: ['number series'] }, (r) => {
    const a1 = r.int(1, 20);
    const d1 = r.int(2, 9);
    const geometricB = r.chance(0.3);
    let fB: (j: number) => number;
    let ruleB: string;
    if (geometricB) {
      const b1 = r.int(1, 6);
      fB = (j) => b1 * 2 ** j;
      ruleB = 'double each time';
    } else {
      const d2 = r.intExcept(-6, 9, [-1, 0, 1, d1]);
      const b1 = d2 < 0 ? r.int(30, 60) : r.int(20, 60);
      fB = (j) => b1 + j * d2;
      ruleB = d2 > 0 ? `increase by ${d2}` : `decrease by ${-d2}`;
    }
    const fA = (j: number): number => a1 + j * d1;
    const shown = r.pick([7, 8]);
    const term = (i: number): number => (i % 2 === 0 ? fA(i / 2) : fB((i - 1) / 2));
    const terms = Array.from({ length: shown }, (_, i) => term(i));
    const next = term(shown);
    const ownNext = term(shown + 2);
    const otherNext = term(shown + 1);
    const last = at(terms, -1);
    const { answer, distractors } = intOptions(r, next, [
      otherNext, // continued the wrong sub-series
      ownNext, // skipped a term of the right sub-series
      2 * last - at(terms, -2), // treated the whole list as one arithmetic series
      last + d1,
    ]);
    const odd = terms.filter((_, i) => i % 2 === 0);
    const even = terms.filter((_, i) => i % 2 === 1);
    const which = shown % 2 === 0 ? '1st, 3rd, 5th, ...' : '2nd, 4th, 6th, ...';
    return {
      stem: nextNumberStem(r, terms),
      answer,
      distractors,
      explanation: tex`Two series are interleaved. Terms in odd positions (${list(odd)}) increase by ${d1}; terms in even positions (${list(even)}) ${ruleB}. The next term is in the ${which} positions, so it is ${next}.`,
    };
  }),

  b.dynamic('fibonacci-like', { difficulty: 1, tags: ['number series'] }, (r) => {
    const a = r.int(1, 9);
    const c = r.int(1, 9);
    const terms = [a, c];
    while (terms.length < 6) terms.push(at(terms, -1) + at(terms, -2));
    const [t3, t4, t5] = [at(terms, -3), at(terms, -2), at(terms, -1)];
    const next = t4 + t5;
    const { answer, distractors } = intOptions(r, next, [
      t5 + t3, // repeated the last difference (t5 - t4 = t3), i.e. added the wrong pair
      2 * t5, // doubled the last term (same as adding the last three terms)
      next + t5, // skipped a term
      next + 1,
    ]);
    return {
      stem: nextNumberStem(r, terms),
      answer,
      distractors,
      explanation: tex`From the third term on, each term is the sum of the two before it ($${a} + ${c} = ${at(terms, 2)}$, $${c} + ${at(terms, 2)} = ${at(terms, 3)}$, ...). Next term $= ${t4} + ${t5} = ${next}$.`,
    };
  }),

  b.dynamic('prime-series', { difficulty: 1, tags: ['number series'] }, (r) => {
    let start = 0;
    let window: number[] = [];
    let next = 0;
    for (let tries = 0; tries < 50; tries++) {
      start = r.int(2, 18);
      window = PRIMES.slice(start, start + 5);
      next = at(PRIMES, start + 5);
      const d = window.slice(1).map((p, i) => p - at(window, i));
      const periodic = d.every((x, i) => i < 2 || x === at(d, i - 2));
      // Reject windows whose gaps alternate (e.g. +2, +4, +2, +4) unless the alternation also gives the next prime.
      if (!periodic || at(window, -1) + at(d, -2) === next) break;
    }
    const last = at(window, -1);
    const gaps = window.slice(1).map((p, i) => p - at(window, i));
    // Gaps such as 6, 6, 2, 6 also read as a repeating 3-gap cycle; never offer that cycle's prediction.
    const cycle3 = at(gaps, 3) === at(gaps, 0) ? last + at(gaps, 1) : NaN;
    const wrong = [2 * last - at(window, -2), at(PRIMES, start + 6)];
    for (let x = last + 2; x < next; x += 2) wrong.push(x); // odd composites before the next prime
    for (let x = next + 2; x <= next + 12; x += 2) if (!isPrime(x)) wrong.push(x); // odd composites after it
    const { answer, distractors } = intOptions(
      r,
      next,
      wrong.filter((x) => (!isPrime(x) || x > next) && x !== cycle3),
    );
    return {
      stem: nextNumberStem(r, window),
      answer,
      distractors,
      explanation: tex`The terms are consecutive prime numbers. The next prime after ${last} is ${next}${next - last > 2 ? ` (${list(Array.from({ length: (next - last) / 2 - 1 }, (_, i) => last + 2 * (i + 1)))} ${(next - last) / 2 - 1 > 1 ? 'are' : 'is'} composite)` : ''}.`,
    };
  }),

  // =========================================================================
  // Number series: missing and wrong terms
  // =========================================================================
  b.dynamic('missing-number', { difficulty: 2, origin: 'past-paper', tags: ['missing terms', 'number series'] }, (r) => {
    const fam = r.pick(['arithmetic', 'geometric', 'squares', 'times-two', 'diffs'] as const);
    let terms: number[] = [];
    let rule = '';
    if (fam === 'arithmetic') {
      const a = r.int(2, 40);
      const d = r.int(3, 12);
      terms = Array.from({ length: 6 }, (_, i) => a + i * d);
      rule = `The series is arithmetic with common difference ${d}.`;
    } else if (fam === 'geometric') {
      const q = r.pick([2, 3]);
      const a = q === 2 ? r.int(1, 7) : r.int(1, 3);
      terms = Array.from({ length: 6 }, (_, i) => a * q ** i);
      rule = `Each term is ${q} times the previous one.`;
    } else if (fam === 'squares') {
      const s = r.int(1, 8);
      const k = r.int(-1, 5);
      terms = Array.from({ length: 6 }, (_, i) => (s + i) ** 2 + k);
      rule =
        k === 0
          ? `The terms are the squares of consecutive integers ${s}, ${s + 1}, ..., ${s + 5}.`
          : tex`Each term is a perfect square ${k > 0 ? 'plus' : 'minus'} ${Math.abs(k)} ($n^2 ${op(k)}$ for $n = ${s}, ${s + 1}, \ldots, ${s + 5}$).`;
    } else if (fam === 'times-two') {
      const c = r.pick([-1, 1, 2, 3]);
      const a = r.int(c < 0 ? 3 : 1, 8);
      terms = [a];
      while (terms.length < 6) terms.push(2 * at(terms, -1) + c);
      rule = `Each term is twice the previous one ${c > 0 ? 'plus' : 'minus'} ${Math.abs(c)}.`;
    } else {
      const a = r.int(1, 20);
      const d0 = r.int(1, 4);
      const e = r.int(1, 3);
      terms = [a];
      for (let i = 0; i < 5; i++) terms.push(at(terms, -1) + d0 + i * e);
      rule = `The differences ${list([0, 1, 2, 3, 4].map((i) => d0 + i * e))} increase by ${e} each time.`;
    }
    const j = r.int(1, 4);
    const x = at(terms, j);
    const before = at(terms, j - 1);
    const after = at(terms, j + 1);
    const wrong: number[] = [];
    if ((before + after) % 2 === 0) wrong.push((before + after) / 2); // averaged the neighbours
    if (j >= 2) wrong.push(2 * before - at(terms, j - 2)); // repeated the previous difference
    wrong.push(x + 1, x - 1, x + 2);
    const { answer, distractors } = intOptions(r, x, wrong);
    const shown = terms.map((t, i) => (i === j ? '?' : String(t)));
    return {
      stem: r.pick([
        `Which number should replace the question mark in the series ${list(shown)}?`,
        `What is the missing term in the series ${list(shown)}?`,
      ]),
      answer,
      distractors,
      explanation: tex`${rule} Hence the missing term is ${x} (check: ${before}, ${x}, ${after}).`,
    };
  }),

  b.dynamic('wrong-term', { difficulty: 3, tags: ['missing terms', 'number series'] }, (r) => {
    const fam = r.pick(['arithmetic', 'squares', 'cubes', 'doubling', 'primes'] as const);
    for (let tries = 0; ; tries++) {
      if (tries > 100) throw new Error('wrong-term: no valid variant');
      let terms: number[];
      let rule: string;
      let deltas = [-2, -1, 1, 2];
      if (fam === 'arithmetic') {
        const a = r.int(2, 30);
        const d = r.int(4, 12);
        terms = Array.from({ length: 7 }, (_, i) => a + i * d);
        rule = `The series should increase by ${d} each time`;
      } else if (fam === 'squares') {
        const s = r.int(2, 8);
        terms = Array.from({ length: 7 }, (_, i) => (s + i) ** 2);
        rule = tex`The terms should be the squares $${s}^2, ${s + 1}^2, \ldots, ${s + 6}^2$`;
      } else if (fam === 'cubes') {
        const s = r.int(1, 4);
        terms = Array.from({ length: 7 }, (_, i) => (s + i) ** 3);
        rule = tex`The terms should be the cubes $${s}^3, ${s + 1}^3, \ldots, ${s + 6}^3$`;
        deltas = [-3, -2, -1, 1, 2, 3];
      } else if (fam === 'doubling') {
        const a = r.int(2, 5);
        terms = Array.from({ length: 7 }, (_, i) => a * 2 ** i);
        rule = 'Each term should be twice the previous one';
        deltas = [-1, 1];
      } else {
        const s = r.int(3, 8);
        terms = PRIMES.slice(s, s + 7);
        rule = 'The terms should be consecutive prime numbers';
      }
      const j = r.int(1, 5);
      const v = at(terms, j);
      const lo = at(terms, j - 1);
      const hi = at(terms, j + 1);
      let w: number;
      if (fam === 'primes') {
        const comps: number[] = [];
        for (let x = lo + 2; x < hi; x += 2) if (!isPrime(x)) comps.push(x);
        if (!comps.length) continue;
        w = r.pick(comps);
      } else {
        w = v + r.pick(deltas);
      }
      if (w <= lo || w >= hi || w === v) continue;
      const shown = terms.map((t, i) => (i === j ? w : t));
      const others = shown.filter((_, i) => i !== j);
      const distractors = r.sample(others, 3).map(String);
      const reason =
        fam === 'primes'
          ? tex`${w} is not prime ($${w} = ${smallestFactor(w)} \times ${w / smallestFactor(w)}$); the ${ordinal(j + 1)} term should be ${v}`
          : `so the ${ordinal(j + 1)} term should be ${v}, not ${w}`;
      return {
        stem: `In the series ${list(shown)}, which number is wrong?`,
        answer: String(w),
        distractors,
        explanation: tex`${rule}: ${list(terms)}. ${fam === 'primes' ? 'But' : 'Every term fits except one,'} ${reason}.`,
      };
    }
  }),

  // =========================================================================
  // Letter series
  // =========================================================================
  b.dynamic('letter-skip', { difficulty: 1, origin: 'past-paper', tags: ['letter series'] }, (r) => {
    const k = r.int(2, 6) * (r.chance(0.3) ? -1 : 1);
    const count = Math.abs(k) <= 4 ? 5 : 4;
    const start = letterStart(r, k, count);
    const ps = Array.from({ length: count }, (_, i) => start + i * k);
    const last = at(ps, -1);
    const ans = last + k;
    const s = Math.sign(k);
    const distractors = letterDistractors(ans, [ans + s, ans - s, ans + k, ans + 2 * s]);
    return {
      stem: nextLetterStem(r, ps.map(L)),
      answer: L(ans),
      distractors,
      explanation: tex`Each letter moves ${Math.abs(k)} places ${signWord(k)} in the alphabet: ${list(ps.map(Lp))}. The next is ${Lp(last)} $${op(k)}$ = ${Lp(ans)}.`,
    };
  }),

  b.dynamic('letter-increasing-gaps', { difficulty: 2, tags: ['letter series'] }, (r) => {
    const kind = r.pick(['up1', 'up2', 'down'] as const);
    const gaps = kind === 'up1' ? [1, 2, 3, 4, 5] : kind === 'up2' ? [2, 3, 4, 5, 6] : [6, 5, 4, 3, 2];
    const dir = r.chance(0.3) ? -1 : 1;
    const total = gaps.reduce((s, g) => s + g, 0);
    const start = dir > 0 ? r.int(1, 26 - total) : r.int(1 + total, 26);
    const ps = [start];
    for (let i = 0; i < 4; i++) ps.push(at(ps, -1) + dir * at(gaps, i));
    const last = at(ps, -1);
    const nextGap = at(gaps, 4);
    const lastGap = at(gaps, 3);
    const ans = last + dir * nextGap;
    const distractors = letterDistractors(ans, [
      last + dir * lastGap, // repeated the last gap
      ans + dir, // gap one too large
      ans - dir, // gap one too small
      ans + dir * (nextGap - lastGap), // jumped one gap too far
    ]);
    return {
      stem: nextLetterStem(r, ps.map(L)),
      answer: L(ans),
      distractors,
      explanation: tex`Positions: ${list(ps.map(Lp))}. The gaps are ${list(gaps.slice(0, 4))} (moving ${signWord(dir)}), so the next gap is ${nextGap}: ${Lp(last)} $${op(dir * nextGap)}$ = ${Lp(ans)}.`,
    };
  }),

  b.dynamic('alternating-letters', { difficulty: 2, origin: 'past-paper', tags: ['letter series'] }, (r) => {
    const steps = [-3, -2, -1, 1, 2, 3];
    const shown = r.pick([5, 6]);
    const cntA = Math.ceil((shown + 1) / 2);
    const cntB = Math.floor((shown + 1) / 2);
    let sa = 1;
    let sb = 1;
    let pa = 1;
    let pb = 1;
    for (let tries = 0; tries < 50; tries++) {
      sa = r.pick(steps);
      sb = r.pick(steps);
      pa = letterStart(r, sa, cntA - 1);
      pb = r.chance(0.4) && sb < 0 ? 26 : letterStart(r, sb, cntB - 1);
      const at0 = (i: number): number => (i % 2 === 0 ? pa + (i / 2) * sa : pb + ((i - 1) / 2) * sb);
      const gaps = Array.from({ length: shown - 1 }, (_, i) => at0(i + 1) - at0(i));
      // Gaps like -4, +1, +1, -4 (K, G, H, I, E) also read as a repeating 3-gap cycle with another answer.
      const cycle3 = gaps.every((g, i) => i < 3 || g === at(gaps, i - 3));
      if (Math.abs(pa - pb) >= 4 && !cycle3) break;
    }
    const pos = (i: number): number => (i % 2 === 0 ? pa + (i / 2) * sa : pb + ((i - 1) / 2) * sb);
    const ps = Array.from({ length: shown }, (_, i) => pos(i));
    const ans = pos(shown);
    const own = shown % 2 === 0 ? sa : sb;
    const ownLast = pos(shown - 2);
    const distractors = letterDistractors(ans, [
      pos(shown + 1), // continued the other sub-series
      ans + own, // skipped a letter of the sub-series
      ownLast - own, // moved the wrong way
      at(ps, -1) + 1, // continued the alphabet from the last letter
    ]);
    const odd = ps.filter((_, i) => i % 2 === 0).map(L);
    const even = ps.filter((_, i) => i % 2 === 1).map(L);
    const move = (s: number): string => `${Math.abs(s)} ${Math.abs(s) === 1 ? 'place' : 'places'} ${signWord(s)}`;
    return {
      stem: nextLetterStem(r, ps.map(L)),
      answer: L(ans),
      distractors,
      explanation: tex`Two letter series alternate. Odd positions: ${list(odd)} (each ${move(sa)}); even positions: ${list(even)} (each ${move(sb)}). The next term is in the ${shown % 2 === 0 ? 'odd' : 'even'} positions: ${Lp(ownLast)} $${op(own)}$ = ${Lp(ans)}.`,
    };
  }),

  b.dynamic('letter-groups', { difficulty: 3, tags: ['letter series'] }, (r) => {
    const size = r.pick([2, 3]);
    const steps = [-3, -2, -1, 1, 2, 3];
    let st: number[] = [];
    let p0: number[] = [];
    const group = (g: number): number[] => p0.map((p, i) => p + g * at(st, i));
    const word = (ps: readonly number[]): string => ps.map(L).join('');
    for (let tries = 0; tries < 50; tries++) {
      st = Array.from({ length: size }, () => r.pick(steps));
      p0 = st.map((s) => letterStart(r, s, 4));
      const clean = [0, 1, 2, 3, 4].every((g) => !BLOCKED_GROUPS.has(word(group(g))));
      if (new Set(p0).size === size && new Set(st).size > 1 && clean) break;
    }
    const shownGroups = [0, 1, 2, 3].map((g) => word(group(g)));
    const ansPs = group(4);
    const answer = word(ansPs);
    const cands: string[] = [];
    for (let i = 0; i < size; i++) {
      for (const delta of [1, -1, -2 * at(st, i)]) {
        const alt = ansPs.map((p, k) => (k === i ? p + delta : p));
        if (alt.every(inAlpha)) cands.push(word(alt));
      }
    }
    const rev = [...ansPs].reverse();
    const distractors = pickDistractors(
      answer,
      [word(rev), ...r.shuffle(cands)].filter((w) => !BLOCKED_GROUPS.has(w)),
    );
    const move = (s: number): string => `$${op(s)}$`;
    const parts = st.map(
      (s, i) => `${ordinal(i + 1)} letters ${list([0, 1, 2, 3].map((g) => L(at(group(g), i))))} (${move(s)}) give ${L(at(ansPs, i))}`,
    );
    return {
      stem: r.pick([
        `What comes next in the series ${list(shownGroups)}, ...?`,
        `Choose the group that continues the series: ${list(shownGroups)}, ?`,
      ]),
      answer,
      distractors,
      explanation: tex`Treat each position separately: ${parts.join('; ')}. So the next group is ${answer}.`,
    };
  }),

  b.dynamic('letter-number-pairs', { difficulty: 1, tags: ['letter series'] }, (r) => {
    const kind = r.pick(['pos', 'pos', 'rev', 'double'] as const);
    const k = r.int(2, 5);
    const start = letterStart(r, k, 4);
    const ps = Array.from({ length: 4 }, (_, i) => start + i * k);
    const n = (p: number): number => (kind === 'pos' ? p : kind === 'rev' ? 27 - p : 2 * p);
    const term = (p: number, v: number): string => `${L(p)}${v}`;
    const ans = start + 4 * k;
    const answer = term(ans, n(ans));
    const cands = [term(ans, n(ans) + 1)]; // number off by one
    const tooFar = 2 * n(ans) - n(at(ps, -1));
    if (tooFar > 0) cands.push(term(ans, tooFar)); // number moved one step too far
    for (const p of [ans + 1, ans - 1]) {
      if (inAlpha(p)) cands.push(term(p, n(ans)), term(p, n(p))); // letter one place off
    }
    const distractors = pickDistractors(answer, cands);
    const ruleText =
      kind === 'pos'
        ? 'the alphabetical position of its letter'
        : kind === 'rev'
          ? 'the reverse alphabetical position of its letter ($27 -$ position)'
          : 'twice the alphabetical position of its letter';
    const calc = kind === 'pos' ? String(n(ans)) : kind === 'rev' ? tex`$27 - ${ans} = ${n(ans)}$` : tex`$2 \times ${ans} = ${n(ans)}$`;
    return {
      stem: `What comes next in the series ${list(ps.map((p) => term(p, n(p))))}, ...?`,
      answer,
      distractors,
      explanation: tex`The letters move ${k} places forward (${list(ps.map(L))}, so next ${L(ans)}), and each number is ${ruleText}. ${L(ans)} is letter ${ans}, so its number is ${calc} and the next term is ${answer}.`,
    };
  }),

  b.dynamic('missing-letter', { difficulty: 1, tags: ['missing terms', 'letter series'] }, (r) => {
    const kind = r.pick(['step', 'step', 'gaps'] as const);
    const dir = r.chance(0.3) ? -1 : 1;
    const k = r.int(2, 5);
    const gaps = kind === 'step' ? [k, k, k, k, k] : [1, 2, 3, 4, 5];
    const total = gaps.reduce((s, g) => s + g, 0);
    const start = dir > 0 ? r.int(1, 26 - total) : r.int(1 + total, 26);
    const ps: number[] = [start];
    for (const g of gaps) ps.push(at(ps, -1) + dir * g);
    const j = r.int(1, 4);
    const ans = at(ps, j);
    const distractors = letterDistractors(ans, [ans + 1, ans - 1, ans + 2, ans - 2]);
    const shown = ps.map((p, i) => (i === j ? '?' : L(p)));
    const rule =
      kind === 'step'
        ? `Each letter moves ${at(gaps, 0)} places ${signWord(dir)}`
        : `The gaps are 1, 2, 3, 4, 5 (moving ${signWord(dir)})`;
    return {
      stem: `Which letter replaces the question mark in the series ${list(shown)}?`,
      answer: L(ans),
      distractors,
      explanation: tex`${rule}: ${list(ps.map(Lp))}. The missing letter is ${L(ans)}.`,
    };
  }),

  // =========================================================================
  // Fixed questions (conceptual patterns)
  // =========================================================================
  ...b.mcqs([
    {
      id: 'factorial-series',
      d: 2,
      t: ['number series'],
      q: 'What number comes next in the series 1, 2, 6, 24, 120, ...?',
      a: '720',
      x: ['600', '480', '840'],
      e: tex`The multipliers increase by one: $1 \times 2 = 2$, $2 \times 3 = 6$, $6 \times 4 = 24$, $24 \times 5 = 120$, so next is $120 \times 6 = 720$. The terms are the factorials $1!, 2!, 3!, 4!, 5!$, so the next is $6! = 720$.`,
    },
    {
      id: 'self-powers-series',
      d: 2,
      t: ['number series'],
      q: 'Find the next term of the series: 1, 4, 27, 256, ?',
      a: '3125',
      x: ['625', '1024', '7776'],
      e: tex`The terms are $n^n$: $1^1, 2^2, 3^3, 4^4$. The next is $5^5 = 3125$ (625 is $5^4$ and 1024 is $4^5$).`,
    },
    {
      id: 'weekday-initials',
      d: 1,
      t: ['letter series'],
      q: 'What letter comes next in the series M, T, W, T, F, ...?',
      a: 'S',
      x: ['G', 'T', 'M'],
      e: 'The letters are the initials of the weekdays Monday, Tuesday, Wednesday, Thursday, Friday; the next day is Saturday, so S.',
    },
    {
      id: 'number-word-initials',
      d: 3,
      t: ['letter series'],
      q: 'What letter comes next in the series O, T, T, F, F, S, S, ...?',
      a: 'E',
      x: ['T', 'N', 'F'],
      e: 'The letters are the initials of One, Two, Three, Four, Five, Six, Seven; the next number is Eight, so E (N would be Nine, one step too far).',
    },
  ]),
]);

/** Smallest prime factor of a composite number. */
function smallestFactor(n: number): number {
  for (let f = 2; f * f <= n; f++) if (n % f === 0) return f;
  return n;
}
