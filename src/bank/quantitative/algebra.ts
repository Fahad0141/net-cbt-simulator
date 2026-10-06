import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  divisors,
  type Fraction,
  frac,
  lcm,
  linearFactor,
  num,
  numericOptions,
  ordinal,
  paren,
  pickDistractors,
  polyTex,
  q$,
  qty,
  signed,
  signedSum,
  tex,
  U,
} from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/** Wraps LaTeX in `$...$`. */
const m = (latex: string): string => `$${latex}$`;
/** Keeps only integer values (mistake-based distractors must stay "nice"). */
const ints = (xs: readonly number[]): number[] => xs.filter((x) => Number.isInteger(x));
/** ' + c' / ' - c', or nothing for zero. */
const plus = (c: number): string => (c === 0 ? '' : signed(c));
/** Plain integer option: `$-7$`. */
const intOpt = (v: number): string => m(num(v));
/** Fraction option: `$-\frac{3}{4}$`. */
const fracOpt = (f: Fraction): string => m(f.toTex());
/** Rupee amount with thousands separators: `Rs. 12,500`. */
const rs = (x: number): string => `Rs. ${String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

type Mat = number[][];
/** LaTeX bracket matrix (no `$`). */
const mat = (rows: ReadonlyArray<ReadonlyArray<number | string>>): string =>
  `\\begin{bmatrix} ${rows.map((row) => row.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
const mul2 = (A: Mat, B: Mat): Mat =>
  [0, 1].map((i) => [0, 1].map((j) => A[i]![0]! * B[0]![j]! + A[i]![1]! * B[1]![j]!));
const transpose2 = (A: Mat): Mat => [
  [A[0]![0]!, A[1]![0]!],
  [A[0]![1]!, A[1]![1]!],
];
const neg2 = (A: Mat): Mat => A.map((row) => row.map((v) => -v + 0));
const sameMat = (A: Mat, B: Mat): boolean => A.every((row, i) => row.every((v, j) => v === B[i]![j]!));
/** k * M written as a scalar in front of a matrix (k = 1/D). */
const invScaled = (D: number, M: Mat): string => {
  if (D === 1) return mat(M);
  if (D === -1) return mat(neg2(M));
  return `${D < 0 ? '-' : ''}\\frac{1}{${Math.abs(D)}}${mat(M)}`;
};

type Rel = '<' | '\\le' | '>' | '\\ge';
const flipRel = (rel: Rel): Rel => ({ '<': '>', '\\le': '\\ge', '>': '<', '\\ge': '\\le' } as const)[rel];
const toggleStrict = (rel: Rel): Rel => ({ '<': '\\le', '\\le': '<', '>': '\\ge', '\\ge': '>' } as const)[rel];
const isStrict = (rel: Rel): boolean => rel === '<' || rel === '>';

/** Two distinct non-zero integers, used where p = ±q would make options coincide. */
function rootPair(r: Rng, lo: number, hi: number): [number, number] {
  const p = r.nonZero(lo, hi);
  const q = r.intExcept(lo, hi, [0, p, -p]);
  return [p, q];
}

const CITIES = ['Lahore', 'Karachi', 'Rawalpindi', 'Multan', 'Peshawar', 'Faisalabad', 'Quetta', 'Islamabad'];
const NAMES = ['Ali', 'Ayesha', 'Hamza', 'Fatima', 'Usman', 'Zainab', 'Bilal', 'Sana'];

export default defineBank('quantitative', 'algebra', (b) => [
  // ---------------------------------------------------------------- linear and simultaneous equations
  b.dynamic('simultaneous-sum-difference', { difficulty: 1, origin: 'past-paper', tags: ['linear and simultaneous equations'] }, (r) => {
    const x = r.int(2, 12);
    const y = r.intExcept(1, 12, [x]);
    const a = r.int(1, 4);
    const s = x + y;
    const t = a * x - y;
    const askX = r.chance(0.5);
    const correct = askX ? x : y;
    const forgotOne = (s + t) / a; // added the equations but divided by a instead of a + 1
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: ints([askX ? y : x, askX ? forgotOne : s - forgotOne, s, askX ? s - t : t]),
      format: intOpt,
    });
    return {
      stem: tex`If $x + y = ${s}$ and $${coefTex(a, 'x')} - y = ${t}$, then the value of $${askX ? 'x' : 'y'}$ is:`,
      answer,
      distractors,
      explanation: tex`Adding the two equations eliminates $y$: $${a + 1}x = ${s} + ${paren(t)} = ${s + t}$, so $x = ${x}$. Then $y = ${s} - ${x} = ${y}$.`,
    };
  }),

  b.dynamic('simultaneous-solution-pair', { difficulty: 2, tags: ['linear and simultaneous equations'] }, (r) => {
    let a1 = 1;
    let b1 = 1;
    let a2 = 1;
    let b2 = 1;
    let D = 0;
    while (D === 0) {
      a1 = r.int(1, 5);
      b1 = r.nonZero(-5, 5);
      a2 = r.nonZero(-5, 5);
      b2 = r.nonZero(-5, 5);
      D = a1 * b2 - a2 * b1;
    }
    const x = r.nonZero(-6, 8);
    const y = r.nonZero(-6, 8);
    const c1 = a1 * x + b1 * y;
    const c2 = a2 * x + b2 * y;
    const Dx = c1 * b2 - c2 * b1;
    const Dy = a1 * c2 - a2 * c1;
    const pair = (u: number, v: number): string => m(tex`x = ${u},\; y = ${v}`);
    const answer = pair(x, y);
    const distractors = pickDistractors(answer, [
      pair(y, x), // swapped the variables
      pair(-x, y), // sign slip in x
      pair(x, -y), // sign slip in y
      pair(-x, -y), // both signs wrong
      pair(x + 1, y - 1),
    ]);
    return {
      stem: tex`The solution of the equations $${signedSum([[a1, 'x'], [b1, 'y']])} = ${c1}$ and $${signedSum([[a2, 'x'], [b2, 'y']])} = ${c2}$ is:`,
      answer,
      distractors,
      explanation: tex`By Cramer's rule, $D = (${a1})(${b2}) - (${a2})(${b1}) = ${D}$, $D_x = (${c1})(${b2}) - (${c2})(${b1}) = ${Dx}$ and $D_y = (${a1})(${c2}) - (${a2})(${c1}) = ${Dy}$. So $x = \frac{${Dx}}{${D}} = ${x}$ and $y = \frac{${Dy}}{${D}} = ${y}$.`,
    };
  }),

  b.dynamic('linear-equation-solve', { difficulty: 1, tags: ['linear and simultaneous equations'] }, (r) => {
    if (r.chance(0.5)) {
      const a = r.int(2, 7);
      const bb = r.intExcept(1, 9, [a]);
      const x0 = r.int(-9, 12);
      const p = r.nonZero(-6, 6);
      const c = a * (x0 + p) - bb * x0;
      const { answer, distractors } = numericOptions(r, {
        correct: x0,
        wrong: ints([
          (c - p) / (a - bb), // did not multiply p by a
          (c + a * p) / (a - bb), // sign slip moving the constant
          (c - a * p) / (a + bb), // sign slip moving bx
          -x0,
        ]),
        format: intOpt,
        allowNegative: true,
        allowZero: true,
      });
      return {
        stem: tex`The solution of $${a}(x${signed(p)}) = ${coefTex(bb, 'x')}${plus(c)}$ is $x =$`,
        answer,
        distractors,
        explanation: tex`Expand: $${a}x${signed(a * p)} = ${coefTex(bb, 'x')}${plus(c)}$. Collect terms: $${coefTex(a - bb, 'x')} = ${c - a * p}$, so $x = ${x0}$.`,
      };
    }
    const [p, q] = r.sample([2, 3, 4, 5, 6], 2) as [number, number];
    const N = lcm(p, q) * r.int(1, 6);
    const c = N / p + N / q;
    const { answer, distractors } = numericOptions(r, {
      correct: N,
      wrong: ints([c * (p + q), (c * (p + q)) / 2, c * p, c * q]),
      format: intOpt,
    });
    return {
      stem: tex`When $\frac{1}{${p}}$ of a number is added to $\frac{1}{${q}}$ of the same number, the result is $${c}$. The number is:`,
      answer,
      distractors,
      explanation: tex`Let the number be $x$: $\frac{x}{${p}} + \frac{x}{${q}} = ${c} \Rightarrow \frac{${p + q}x}{${p * q}} = ${c} \Rightarrow x = \frac{${c} \times ${p * q}}{${p + q}} = ${N}$.`,
    };
  }),

  b.dynamic('ticket-sales-equations', { difficulty: 2, origin: 'past-paper', tags: ['linear and simultaneous equations'] }, (r) => {
    const P = r.pick([500, 600, 800, 1000, 1200, 1500]);
    const Q = r.pick([150, 200, 250, 300, 400]);
    const n = r.multiple(120, 600, 20);
    const x = r.intExcept(Math.ceil(n * 0.15), Math.floor(n * 0.85), [n / 2]);
    const R = P * x + Q * (n - x);
    const city = r.pick(CITIES);
    const { answer, distractors } = numericOptions(r, {
      correct: x,
      wrong: ints([n - x, R / (P + Q), Math.round(R / P), n / 2]),
      format: intOpt,
    });
    return {
      stem: `For a T20 match in ${city}, enclosure tickets cost ${rs(P)} each and general tickets cost ${rs(Q)} each. A booth sold ${n} tickets and collected ${rs(R)}. How many enclosure tickets were sold?`,
      answer,
      distractors,
      explanation: tex`Let $x$ enclosure tickets be sold, so $${n} - x$ general tickets. Then $${P}x + ${Q}(${n} - x) = ${R} \Rightarrow ${P - Q}x = ${R} - ${Q * n} = ${R - Q * n} \Rightarrow x = ${x}$.`,
    };
  }),

  b.dynamic('no-solution-parameter', { difficulty: 3, tags: ['linear and simultaneous equations'] }, (r) => {
    const a2 = r.nonZero(-5, 5);
    const b2 = r.nonZero(-5, 5);
    const mult = r.pick([2, 3, -2, -3, 4]);
    const k = mult * a2;
    const b1 = mult * b2;
    const c2 = r.nonZero(-9, 9);
    const c1 = r.intExcept(-15, 15, [mult * c2]);
    const answer = intOpt(k);
    const distractors = pickDistractors(answer, [
      intOpt(-k), // sign slip
      fracOpt(frac(a2 * b2, b1)), // inverted the ratio b1/b2
      fracOpt(frac(a2 * c1, c2)), // used the ratio of the constants
      intOpt(b1),
      intOpt(k + a2),
    ]);
    return {
      stem: tex`For which value of $k$ does the system $kx${signed(b1)}y = ${c1}$, $${signedSum([[a2, 'x'], [b2, 'y']])} = ${c2}$ have **no** solution?`,
      answer,
      distractors,
      explanation: tex`No solution means the lines are parallel but distinct: $\frac{k}{${a2}} = \frac{${b1}}{${b2}} \ne \frac{${c1}}{${c2}}$. Since $\frac{${b1}}{${b2}} = ${mult}$, $k = ${mult} \times ${paren(a2)} = ${k}$, and $\frac{${c1}}{${c2}} \ne ${mult}$, so the lines do not coincide.`,
    };
  }),

  // ---------------------------------------------------------------- quadratic equations
  b.dynamic('quadratic-roots-factor', { difficulty: 1, origin: 'past-paper', tags: ['quadratic equations'] }, (r) => {
    const [p, q] = rootPair(r, -9, 9);
    const a = r.weighted([1, 2, 3], [6, 2, 1]);
    const eq = polyTex([a, -a * (p + q), a * p * q]);
    const pair = (u: number, v: number): string => m(tex`x = ${Math.min(u, v)},\ ${Math.max(u, v)}`);
    const answer = pair(p, q);
    const distractors = pickDistractors(answer, [pair(-p, -q), pair(p, -q), pair(-p, q)]);
    return {
      stem: tex`The roots of $${eq} = 0$ are:`,
      answer,
      distractors,
      explanation: tex`Factorise: $${eq} = ${a === 1 ? '' : a}${linearFactor(p)}${linearFactor(q)} = 0$, so $x = ${p}$ or $x = ${q}$ (check: sum $${p + q}$, product $${p * q}$).`,
    };
  }),

  b.dynamic('sum-product-of-roots', { difficulty: 1, origin: 'past-paper', tags: ['quadratic equations'] }, (r) => {
    const a = r.int(1, 6);
    const bb = r.nonZero(-12, 12);
    const c = r.intExcept(-12, 12, [0, bb, -bb]);
    const eq = polyTex([a, bb, c]);
    const askSum = r.chance(0.5);
    const correct = askSum ? frac(-bb, a) : frac(c, a);
    const answer = fracOpt(correct);
    const distractors = pickDistractors(
      answer,
      askSum
        ? [fracOpt(frac(bb, a)), fracOpt(frac(c, a)), fracOpt(frac(-c, a)), fracOpt(frac(-a, bb)), fracOpt(frac(-bb, c))]
        : [fracOpt(frac(-c, a)), fracOpt(frac(-bb, a)), fracOpt(frac(bb, a)), fracOpt(frac(a, c)), fracOpt(frac(c, bb))],
    );
    return {
      stem: tex`If $\alpha$ and $\beta$ are the roots of $${eq} = 0$, then $${askSum ? '\\alpha + \\beta' : '\\alpha\\beta'}$ equals:`,
      answer,
      distractors,
      explanation: askSum
        ? tex`For $ax^2 + bx + c = 0$, the sum of roots is $-\frac{b}{a} = -\frac{${bb}}{${a}}${a > 1 && correct.d === a && bb > 0 ? '' : ` = ${correct.toTex()}`}$.`
        : tex`For $ax^2 + bx + c = 0$, the product of roots is $\frac{c}{a} = \frac{${c}}{${a}}${a > 1 && correct.d === a && c > 0 ? '' : ` = ${correct.toTex()}`}$.`,
    };
  }),

  b.dynamic('nature-of-roots', { difficulty: 2, tags: ['quadratic equations'] }, (r) => {
    const LABELS = {
      rational: 'real, rational and unequal',
      irrational: 'real, irrational and unequal',
      equal: 'real and equal',
      complex: 'complex (non-real)',
    } as const;
    const kind = r.pick(['rational', 'irrational', 'equal', 'complex'] as const);
    let coeffs: [number, number, number];
    if (kind === 'equal') {
      const p = r.int(1, 3);
      const q = r.nonZero(-5, 5);
      coeffs = [p * p, 2 * p * q, q * q];
    } else if (kind === 'rational') {
      let a1 = 1;
      let a2 = 1;
      let r1 = 1;
      let r2 = 1;
      do {
        a1 = r.int(1, 3);
        a2 = r.int(1, 3);
        r1 = r.nonZero(-6, 6);
        r2 = r.nonZero(-6, 6);
      } while (r1 * a2 === r2 * a1);
      coeffs = [a1 * a2, a1 * r2 + a2 * r1, r1 * r2];
    } else {
      const want = kind;
      for (;;) {
        const a = r.int(1, 4);
        const bb = r.int(-9, 9);
        const c = r.nonZero(-9, 9);
        const D = bb * bb - 4 * a * c;
        const square = D >= 0 && Number.isInteger(Math.sqrt(D));
        if ((want === 'irrational' && D > 0 && !square) || (want === 'complex' && D < 0)) {
          coeffs = [a, bb, c];
          break;
        }
      }
    }
    const [a, bb, c] = coeffs;
    const D = bb * bb - 4 * a * c;
    const reason = {
      rational: tex`$D > 0$ and a perfect square ($${D} = ${Math.sqrt(Math.max(D, 0))}^2$), so the roots are real, rational and unequal`,
      irrational: tex`$D > 0$ but not a perfect square, so the roots are real, irrational and unequal`,
      equal: tex`$D = 0$, so the roots are real and equal`,
      complex: tex`$D < 0$, so the roots are complex (non-real)`,
    }[kind];
    return {
      stem: tex`The roots of $${polyTex(coeffs)} = 0$ are:`,
      answer: LABELS[kind],
      distractors: (Object.keys(LABELS) as (keyof typeof LABELS)[]).filter((k) => k !== kind).map((k) => LABELS[k]),
      explanation: tex`Discriminant $D = b^2 - 4ac = (${bb})^2 - 4(${a})(${c}) = ${D}$. ${reason}.`,
    };
  }),

  b.dynamic('equal-roots-parameter', { difficulty: 2, origin: 'past-paper', tags: ['quadratic equations'] }, (r) => {
    const p = r.pick([1, 1, 1, 2, 3]);
    const q = r.int(2, 7);
    const A = p * p;
    const C = q * q;
    const k = 2 * p * q;
    const pm = (v: number): string => m(tex`\pm ${v}`);
    const answer = pm(k);
    const distractors = pickDistractors(answer, [
      pm(p * q), // forgot the factor 2
      pm(4 * p * q), // used 4ac without the square root properly
      pm(4 * A * C), // forgot the square root
      pm(2 * q), // ignored the leading coefficient
      pm(A + C),
    ]);
    return {
      stem: tex`The equation $${coefTex(A, 'x^{2}')} + kx + ${C} = 0$ has equal roots when $k$ equals:`,
      answer,
      distractors,
      explanation: tex`Equal roots need $D = 0$: $k^2 - 4(${A})(${C}) = 0 \Rightarrow k^2 = ${4 * A * C} \Rightarrow k = \pm ${k}$.`,
    };
  }),

  b.dynamic('equation-from-roots', { difficulty: 2, tags: ['quadratic equations'] }, (r) => {
    let S: number;
    let P: number;
    let rootsText: string;
    if (r.chance(0.6)) {
      const [r1, r2] = rootPair(r, -8, 8);
      S = r1 + r2;
      P = r1 * r2;
      rootsText = tex`$${r1}$ and $${r2}$`;
    } else {
      const p = r.nonZero(-5, 5);
      const s = r.pick([2, 3, 5, 6, 7]);
      S = 2 * p;
      P = p * p - s;
      rootsText = tex`$${p} + \sqrt{${s}}$ and $${p} - \sqrt{${s}}$`;
    }
    const eq = (b1: number, c1: number): string => m(`${polyTex([1, b1, c1])} = 0`);
    const answer = eq(-S, P);
    const distractors = pickDistractors(answer, [
      eq(S, P), // used +sum
      eq(-S, -P), // sign of product
      eq(S, -P),
      eq(-P, S), // swapped sum and product
    ]);
    return {
      stem: `The quadratic equation whose roots are ${rootsText} is:`,
      answer,
      distractors,
      explanation: tex`An equation with given roots is $x^2 - (\text{sum})x + (\text{product}) = 0$. Sum $= ${S}$, product $= ${P}$, giving ${answer}.`,
    };
  }),

  b.dynamic('symmetric-functions-of-roots', { difficulty: 3, tags: ['quadratic equations'] }, (r) => {
    let bb = 1;
    let c = 1;
    do {
      bb = r.nonZero(-9, 9);
      c = r.nonZero(-9, 9);
    } while (bb * bb - 4 * c <= 0);
    const S = -bb;
    const P = c;
    const eq = polyTex([1, bb, c]);
    const kind = r.pick(['squares', 'reciprocals', 'difference'] as const);
    const intro = tex`If $\alpha$ and $\beta$ are the roots of $${eq} = 0$, then`;
    const base = tex`$\alpha + \beta = ${S}$ and $\alpha\beta = ${P}$.`;
    if (kind === 'reciprocals') {
      const correct = frac(S, P);
      const answer = fracOpt(correct);
      const distractors = pickDistractors(answer, [
        fracOpt(frac(P, S)), // inverted
        fracOpt(frac(-S, P)), // sign of the sum
        fracOpt(frac(1, S)),
        fracOpt(frac(S, P * P)),
        fracOpt(frac(-P, S)), // inverted and wrong sign
        intOpt(S * P), // multiplied instead of divided
        fracOpt(frac(2 * S, P)), // fallbacks for S = ±P, where the others collapse to ±1
        fracOpt(frac(S, 2 * P)),
      ]);
      return {
        stem: tex`${intro} $\frac{1}{\alpha} + \frac{1}{\beta}$ equals:`,
        answer,
        distractors,
        explanation: tex`${base} $\frac{1}{\alpha} + \frac{1}{\beta} = \frac{\alpha + \beta}{\alpha\beta} = \frac{${S}}{${P}} = ${correct.toTex()}$.`,
      };
    }
    const squares = kind === 'squares';
    const correct = squares ? S * S - 2 * P : S * S - 4 * P;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: squares ? [S * S + 2 * P, S * S - P, S * S - 4 * P, S * S] : [S * S + 4 * P, S * S - 2 * P, S * S - P, S * S],
      format: intOpt,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`${intro} $${squares ? '\\alpha^2 + \\beta^2' : '(\\alpha - \\beta)^2'}$ equals:`,
      answer,
      distractors,
      explanation: squares
        ? tex`${base} $\alpha^2 + \beta^2 = (\alpha + \beta)^2 - 2\alpha\beta = (${S})^2 - 2(${P}) = ${correct}$.`
        : tex`${base} $(\alpha - \beta)^2 = (\alpha + \beta)^2 - 4\alpha\beta = (${S})^2 - 4(${P}) = ${correct}$.`,
    };
  }),

  b.dynamic('rectangle-dimensions-quadratic', { difficulty: 2, tags: ['quadratic equations'] }, (r) => {
    const w = r.int(4, 25);
    const d = r.int(2, 12);
    const L = w + d;
    const A = w * L;
    const askWidth = r.chance(0.5);
    const city = r.pick(CITIES);
    const correct = askWidth ? w : L;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [askWidth ? L : w, askWidth ? w + 2 * d : L + d, Math.round(Math.sqrt(A)), askWidth ? Math.round(A / L / 2) : 2 * w],
      format: (v) => q$(v, U.m),
    });
    return {
      stem: tex`The length of a rectangular plot in ${city} is $${qty(d, U.m)}$ more than its width, and its area is $${A}\,\mathrm{m^{2}}$. The ${askWidth ? 'width' : 'length'} of the plot is:`,
      answer,
      distractors,
      explanation: tex`Let the width be $x$: $x(x + ${d}) = ${A} \Rightarrow x^2 + ${d}x - ${A} = 0 \Rightarrow (x - ${w})(x + ${L}) = 0$. Rejecting the negative root, width $= ${w}\,\mathrm{m}$ and length $= ${w} + ${d} = ${L}\,\mathrm{m}$.`,
    };
  }),

  // ---------------------------------------------------------------- inequalities
  b.dynamic('linear-inequality', { difficulty: 1, tags: ['inequalities'] }, (r) => {
    const x0 = r.int(-8, 9);
    const a = r.int(1, 9);
    const c = r.intExcept(1, 9, [a]);
    const k = r.int(-10, 10);
    const d = (a - c) * x0 + k;
    const rel = r.pick(['<', '\\le', '>', '\\ge'] as const);
    const sol: Rel = a - c > 0 ? rel : flipRel(rel);
    const opt = (rr: Rel, v: number): string => m(`x ${rr} ${v}`);
    const answer = opt(sol, x0);
    const distractors = pickDistractors(answer, [
      opt(flipRel(sol), x0), // forgot (or wrongly applied) the reversal
      opt(sol, -x0),
      opt(toggleStrict(sol), x0),
      opt(flipRel(toggleStrict(sol)), x0),
    ]);
    const step =
      a - c === 1
        ? 'This already isolates $x$'
        : a - c < 0
        ? `Dividing by the negative number $${a - c}$ reverses the inequality`
        : `Dividing by the positive number $${a - c}$ keeps the direction`;
    return {
      stem: tex`The solution of $${coefTex(a, 'x')}${plus(k)} ${rel} ${coefTex(c, 'x')}${plus(d)}$ is:`,
      answer,
      distractors,
      explanation: tex`Collect the $x$ terms on the left and the constants on the right: $${coefTex(a - c, 'x')} ${rel} ${d - k}$. ${step}: $x ${sol} ${x0}$.`,
    };
  }),

  b.dynamic('absolute-value-inequality', { difficulty: 2, tags: ['inequalities'] }, (r) => {
    const a = r.nonZero(-6, 8);
    const w = r.intExcept(1, 9, [Math.abs(a)]);
    const rel = r.pick(['<', '\\le', '>', '\\ge'] as const);
    const inside = (lo: number, hi: number, rr: Rel): string => m(`${lo} ${rr} x ${rr} ${hi}`);
    const outside = (lo: number, hi: number, rr: Rel): string => `$x ${flipRel(rr)} ${lo}$ or $x ${rr} ${hi}$`;
    const lessRel: Rel = isStrict(rel) ? '<' : '\\le';
    const moreRel: Rel = isStrict(rel) ? '>' : '\\ge';
    const lessType = rel === '<' || rel === '\\le';
    const answer = lessType ? inside(a - w, a + w, lessRel) : outside(a - w, a + w, moreRel);
    const distractors = pickDistractors(answer, [
      lessType ? outside(a - w, a + w, moreRel) : inside(a - w, a + w, lessRel), // wrong region
      lessType ? inside(-a - w, -a + w, lessRel) : outside(-a - w, -a + w, moreRel), // wrong centre
      lessType ? inside(-w, w, lessRel) : outside(-w, w, moreRel), // ignored the shift
      lessType ? m(`x ${lessRel} ${a + w}`) : m(`x ${moreRel} ${a + w}`), // kept one side only
    ]);
    const abs = `|x${signed(-a)}|`;
    return {
      stem: tex`The solution set of $${abs} ${rel} ${w}$ is:`,
      answer,
      distractors,
      explanation: lessType
        ? tex`$${abs} ${rel} ${w} \iff -${w} ${lessRel} x${signed(-a)} ${lessRel} ${w} \iff ${a - w} ${lessRel} x ${lessRel} ${a + w}$ (points whose distance from $${a}$ is ${isStrict(rel) ? 'less than' : 'at most'} $${w}$).`
        : tex`$${abs} ${rel} ${w}$ means $x${signed(-a)} ${moreRel} ${w}$ or $x${signed(-a)} ${flipRel(moreRel)} -${w}$, i.e. $x ${moreRel} ${a + w}$ or $x ${flipRel(moreRel)} ${a - w}$ (points whose distance from $${a}$ is ${isStrict(rel) ? 'more than' : 'at least'} $${w}$).`,
    };
  }),

  b.dynamic('quadratic-inequality', { difficulty: 3, tags: ['inequalities', 'quadratic equations'] }, (r) => {
    let p = 0;
    let q = 0;
    do {
      p = r.int(-7, 5);
      q = r.int(p + 1, 8);
    } while (p === -q);
    const rel = r.pick(['<', '\\le', '>', '\\ge'] as const);
    const lessRel: Rel = isStrict(rel) ? '<' : '\\le';
    const moreRel: Rel = isStrict(rel) ? '>' : '\\ge';
    const between = rel === '<' || rel === '\\le';
    const inside = (lo: number, hi: number, rr: Rel): string => m(`${lo} ${rr} x ${rr} ${hi}`);
    const outside = (lo: number, hi: number, rr: Rel): string => `$x ${flipRel(rr)} ${lo}$ or $x ${rr} ${hi}$`;
    const answer = between ? inside(p, q, lessRel) : outside(p, q, moreRel);
    const distractors = pickDistractors(answer, [
      between ? outside(p, q, moreRel) : inside(p, q, lessRel), // wrong region
      between ? inside(-q, -p, lessRel) : outside(-q, -p, moreRel), // sign slip in the roots
      between ? inside(p, q, toggleStrict(lessRel)) : outside(p, q, toggleStrict(moreRel)), // end-points
      between ? outside(-q, -p, moreRel) : inside(-q, -p, lessRel),
    ]);
    return {
      stem: tex`The solution of $${polyTex([1, -(p + q), p * q])} ${rel} 0$ is:`,
      answer,
      distractors,
      explanation: tex`Factorise: $${linearFactor(p)}${linearFactor(q)} ${rel} 0$ with roots $${p}$ and $${q}$. The parabola opens upwards, so it is ${between ? 'below' : 'above'} the axis ${between ? 'between' : 'outside'} the roots${isStrict(rel) ? '' : ' (and equals zero at the roots, which are included)'}: ${answer}.`,
    };
  }),

  b.dynamic('count-integer-solutions', { difficulty: 2, tags: ['inequalities'] }, (r) => {
    const k = r.int(2, 5);
    const c = r.nonZero(-9, 9);
    const L = r.int(-6, 4);
    const Up = L + r.int(4, 9);
    const leftStrict = r.chance(0.5);
    const rightStrict = r.chance(0.5);
    const lo = k * L + c;
    const hi = k * Up + c;
    const first = leftStrict ? L + 1 : L;
    const last = rightStrict ? Up - 1 : Up;
    const count = last - first + 1;
    const lr = leftStrict ? '<' : '\\le';
    const rr = rightStrict ? '<' : '\\le';
    const { answer, distractors } = numericOptions(r, {
      correct: count,
      wrong: [count + 1, count - 1, count + 2, hi - lo],
      format: intOpt,
    });
    return {
      stem: tex`How many integers $x$ satisfy $${lo} ${lr} ${coefTex(k, 'x')}${signed(c)} ${rr} ${hi}$?`,
      answer,
      distractors,
      explanation: tex`${c > 0 ? 'Subtract' : 'Add'} $${Math.abs(c)}$ and divide by $${k}$: $${L} ${lr} x ${rr} ${Up}$. The integers are $${count <= 4 ? Array.from({ length: count }, (_, i) => first + i).join(', ') : tex`${first}, ${first + 1}, \ldots, ${last}`}$, which is $${last} - (${first}) + 1 = ${count}$ integers.`,
    };
  }),

  // ---------------------------------------------------------------- functions
  b.dynamic('function-value', { difficulty: 1, origin: 'past-paper', tags: ['functions'] }, (r) => {
    const a = r.nonZero(-4, 5);
    const bb = r.nonZero(-9, 9);
    const c = r.int(-9, 9);
    const k = r.nonZero(-4, 4);
    const correct = a * k * k + bb * k + c;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        a * k * k - bb * k + c, // sign slip on bk
        -a * k * k + bb * k + c, // took (k)^2 as -k^2
        2 * a * k + bb * k + c, // doubled instead of squaring
        a * k * k + bb * k, // dropped the constant
      ],
      format: intOpt,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`If $f(x) = ${polyTex([a, bb, c])}$, then $f(${k})$ equals:`,
      answer,
      distractors,
      explanation: tex`$f(${k}) = ${a}(${k})^2${signed(bb)}(${k})${plus(c)} = ${a * k * k}${signed(bb * k)}${plus(c)} = ${correct}$.`,
    };
  }),

  b.dynamic('composite-function-value', { difficulty: 2, origin: 'past-paper', tags: ['functions'] }, (r) => {
    const a = r.pick([2, 3, 4, 5, -2, -3]);
    const bb = r.nonZero(-7, 7);
    const quadG = r.chance(0.5);
    const p = r.int(2, 4);
    const c = r.nonZero(-6, 6);
    const k = r.int(-3, 4);
    const f = (x: number): number => a * x + bb;
    const g = (x: number): number => (quadG ? x * x + c : p * x + c);
    const fTex = `${a}x${signed(bb)}`;
    const gTex = quadG ? `x^2${signed(c)}` : `${p}x${signed(c)}`;
    const fFirst = r.chance(0.6); // ask f(g(k))
    const inner = fFirst ? g(k) : f(k);
    const correct = fFirst ? f(inner) : g(inner);
    const other = fFirst ? g(f(k)) : f(g(k));
    const notation = r.chance(0.5);
    const asked = fFirst
      ? notation ? tex`(f \circ g)(${k})` : `f(g(${k}))`
      : notation ? tex`(g \circ f)(${k})` : `g(f(${k}))`;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [other, f(k) * g(k), f(k) + g(k), inner],
      format: intOpt,
      allowNegative: true,
      allowZero: true,
    });
    const outerName = fFirst ? 'f' : 'g';
    const innerName = fFirst ? 'g' : 'f';
    const innerTex = fFirst ? gTex : fTex;
    const outerTex = fFirst ? fTex : gTex;
    return {
      stem: tex`If $f(x) = ${fTex}$ and $g(x) = ${gTex}$, then $${asked}$ equals:`,
      answer,
      distractors,
      explanation: tex`First $${innerName}(${k}) = ${innerTex.replace(/x/g, `(${k})`)} = ${inner}$. Then $${outerName}(${inner}) = ${outerTex.replace(/x/g, `(${inner})`)} = ${correct}$.`,
    };
  }),

  b.dynamic('inverse-linear-function', { difficulty: 2, tags: ['functions'] }, (r) => {
    if (r.chance(0.5)) {
      const a = r.int(2, 7);
      const bb = r.nonZero(-9, 9);
      const answer = m(tex`\frac{x${signed(-bb)}}{${a}}`);
      const distractors = pickDistractors(answer, [
        m(tex`\frac{x${signed(bb)}}{${a}}`), // did not change the sign of b
        m(tex`\frac{x}{${a}}${signed(-bb)}`), // divided only x by a
        m(tex`${a}x${signed(-bb)}`), // undid the operations in the wrong way
        m(tex`\frac{1}{${a}x${signed(bb)}}`), // confused inverse with reciprocal
      ]);
      return {
        stem: tex`If $f(x) = ${a}x${signed(bb)}$, then $f^{-1}(x)$ is:`,
        answer,
        distractors,
        explanation: tex`Put $y = ${a}x${signed(bb)}$ and solve for $x$: $x = \frac{y${signed(-bb)}}{${a}}$. Interchanging $x$ and $y$ gives $f^{-1}(x) = \frac{x${signed(-bb)}}{${a}}$.`,
      };
    }
    const a = r.pick([2, 3, 4, 5, -2, -3, -4]);
    const bb = r.nonZero(-9, 9);
    const t = r.intExcept(-5, 8, [0]);
    const v = a * t + bb;
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: ints([a * v + bb, (v + bb) / a, v / a - bb, -t]),
      format: intOpt,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`If $f(x) = ${a}x${signed(bb)}$, then $f^{-1}(${v})$ equals:`,
      answer,
      distractors,
      explanation: tex`$f^{-1}(${v})$ is the $x$ with $f(x) = ${v}$: $${a}x${signed(bb)} = ${v} \Rightarrow x = \frac{${v}${signed(-bb)}}{${a}} = ${t}$.`,
    };
  }),

  // ---------------------------------------------------------------- sequences
  b.dynamic('ap-general-term', { difficulty: 1, origin: 'past-paper', tags: ['sequences'] }, (r) => {
    const a = r.int(-10, 20);
    const d = r.nonZero(-7, 9);
    const n = r.int(10, 40);
    const last = a + (n - 1) * d;
    const terms = `${a}, ${a + d}, ${a + 2 * d}, \\ldots`;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: last,
        wrong: [a + n * d, a + (n - 2) * d, n * d, (n - 1) * d],
        format: intOpt,
        allowNegative: true,
        allowZero: true,
      });
      return {
        stem: tex`The ${ordinal(n)} term of the arithmetic progression $${terms}$ is:`,
        answer,
        distractors,
        explanation: tex`$a_n = a + (n - 1)d$ with $a = ${a}$, $d = ${d}$: $a_{${n}} = ${a} + ${n - 1}(${d}) = ${last}$.`,
      };
    }
    // Numeric ordinals for every option (ordinal() spells out 1-10, which would mix 'tenth' with '11th').
    const ordNum = (v: number): string => `${v}${v % 100 >= 11 && v % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][v % 10] ?? 'th')}`;
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      wrong: [n - 1, n + 1, n - 2],
      format: ordNum,
    });
    return {
      stem: tex`Which term of the arithmetic progression $${terms}$ is $${last}$?`,
      answer,
      distractors,
      explanation: tex`$a + (n - 1)d = ${last} \Rightarrow ${a} + (n - 1)(${d}) = ${last} \Rightarrow n - 1 = \frac{${last - a}}{${d}} = ${n - 1} \Rightarrow n = ${n}$.`,
    };
  }),

  b.dynamic('ap-sum', { difficulty: 2, tags: ['sequences'] }, (r) => {
    const word = r.chance(0.5);
    const a = word ? r.multiple(500, 3000, 100) : r.int(-5, 15);
    const d = word ? r.multiple(100, 500, 50) : r.nonZero(-4, 6);
    const n = word ? r.pick([10, 12, 15, 18, 20, 24]) : r.int(8, 25);
    const S = (n * (2 * a + (n - 1) * d)) / 2;
    const fmt = word ? rs : intOpt;
    const { answer, distractors } = numericOptions(r, {
      correct: S,
      wrong: ints([n * (2 * a + (n - 1) * d), (n * (2 * a + n * d)) / 2, (n * (a + (n - 1) * d)) / 2, a + (n - 1) * d]),
      format: fmt,
      allowNegative: true,
      allowZero: true,
    });
    const name = r.pick(NAMES);
    const stem = word
      ? `${name} saves ${rs(a)} in the first month and then ${rs(d)} more each month than in the month before. ${name}'s total savings in ${n} months are:`
      : tex`The sum of the first $${n}$ terms of the arithmetic progression $${a}, ${a + d}, ${a + 2 * d}, \ldots$ is:`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`$S_n = \frac{n}{2}[2a + (n - 1)d] = \frac{${n}}{2}[2(${a}) + ${n - 1}(${d})] = \frac{${n}}{2}(${2 * a + (n - 1) * d}) = ${S}$${word ? ', i.e. ' + rs(S) : ''}.`,
    };
  }),

  b.dynamic('gp-general-term', { difficulty: 1, tags: ['sequences'] }, (r) => {
    const a = r.int(1, 6);
    const ratio = r.pick([2, 3, -2, -3, 2]);
    const n = Math.abs(ratio) === 2 ? r.int(5, 9) : r.int(4, 7);
    const correct = a * ratio ** (n - 1);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [a * ratio ** n, a * ratio ** (n - 2), a + (n - 1) * ratio, -correct],
      format: intOpt,
      allowNegative: true,
    });
    return {
      stem: tex`The ${ordinal(n)} term of the geometric progression $${a}, ${a * ratio}, ${a * ratio * ratio}, \ldots$ is:`,
      answer,
      distractors,
      explanation: tex`$a_n = ar^{n-1}$ with $a = ${a}$, $r = ${ratio}$: $a_{${n}} = ${a}(${ratio})^{${n - 1}} = ${correct}$.`,
    };
  }),

  b.dynamic('next-term-pattern', { difficulty: 1, tags: ['sequences'] }, (r) => {
    const kind = r.pick(['second-difference', 'multiply-add', 'squares'] as const);
    let terms: number[] = [];
    let next = 0;
    let wrong: number[] = [];
    let rule = '';
    if (kind === 'second-difference') {
      const t1 = r.int(1, 10);
      const d = r.int(1, 5);
      const k = r.int(1, 4);
      terms = [t1];
      for (let i = 0; i < 5; i++) terms.push(terms[i]! + d + i * k);
      next = terms[5]! + d + 5 * k;
      const lastDiff = d + 4 * k;
      wrong = [terms[5]! + lastDiff, terms[5]! + d + 6 * k, next + 1];
      rule = `The differences are $${terms.slice(1).map((t, i) => t - terms[i]!).join(', ')}$, increasing by $${k}$ each time, so the next difference is $${d + 5 * k}$`;
    } else if (kind === 'multiply-add') {
      const t1 = r.int(1, 5);
      const mul = r.pick([2, 3]);
      // c = -(mul - 1) * t1 makes t1 a fixed point (a constant sequence such as 2, 2, 2, ...).
      const c = r.intExcept(-2, 3, [-(mul - 1) * t1]);
      terms = [t1];
      for (let i = 0; i < 4; i++) terms.push(mul * terms[i]! + c);
      next = mul * terms[4]! + c;
      wrong = [terms[4]! + (terms[4]! - terms[3]!), mul * terms[4]!, next + mul];
      rule = `Each term is $${mul}$ times the previous term ${c === 0 ? '' : c > 0 ? `plus $${c}$` : `minus $${-c}$`}`.trim();
    } else {
      const s = r.int(1, 5);
      const c = r.int(-3, 4);
      terms = [0, 1, 2, 3, 4].map((i) => (i + s) ** 2 + c);
      next = (5 + s) ** 2 + c;
      wrong = [(6 + s) ** 2 + c, terms[4]! + (terms[4]! - terms[3]!), next + 1];
      rule = `The terms are $n^2${plus(c)}$ for $n = ${s}, ${s + 1}, \\ldots$, so the next is $${5 + s}^2${plus(c)}$`;
    }
    const { answer, distractors } = numericOptions(r, { correct: next, wrong, format: intOpt, allowNegative: true });
    return {
      stem: tex`The next term of the sequence $${terms.join(', ')}, \ldots$ is:`,
      answer,
      distractors,
      explanation: `${rule}: the next term is $${next}$.`,
    };
  }),

  // ---------------------------------------------------------------- matrices basics
  b.dynamic('matrix-linear-combination', { difficulty: 1, tags: ['matrices basics'] }, (r) => {
    const A: Mat = [[r.int(-5, 6), r.int(-5, 6)], [r.int(-5, 6), r.int(-5, 6)]];
    const B: Mat = [[r.nonZero(-5, 6), r.nonZero(-5, 6)], [r.nonZero(-5, 6), r.nonZero(-5, 6)]];
    const p = r.pick([2, 3]);
    const q = r.pick([1, 2, 3]);
    const s = r.sign();
    const comb = (u: number, v: number): Mat => A.map((row, i) => row.map((x, j) => u * x + v * B[i]![j]!));
    const answer = m(mat(comb(p, s * q)));
    const distractors = pickDistractors(answer, [
      m(mat(comb(p, -s * q))), // wrong sign on B
      m(mat(comb(p, s))), // forgot to multiply B by q
      m(mat(comb(1, s * q))), // forgot to multiply A by p
      m(mat(comb(p, s * p))), // used p for both
      m(mat(transpose2(comb(p, s * q)))),
    ]);
    const expr = `${p}A ${s > 0 ? '+' : '-'} ${q === 1 ? '' : q}B`;
    return {
      stem: tex`If $A = ${mat(A)}$ and $B = ${mat(B)}$, then $${expr}$ equals:`,
      answer,
      distractors,
      explanation: tex`Multiply every entry of $A$ by $${p}$ and every entry of $B$ by $${s * q}$, then add corresponding entries: $${expr} = ${mat(comb(p, s * q))}$.`,
    };
  }),

  b.dynamic('matrix-product-2x2', { difficulty: 2, origin: 'past-paper', tags: ['matrices basics'] }, (r) => {
    let A: Mat;
    let B: Mat;
    do {
      A = [[r.int(-3, 5), r.int(-3, 5)], [r.int(-3, 5), r.int(-3, 5)]];
      B = [[r.int(-3, 5), r.int(-3, 5)], [r.int(-3, 5), r.int(-3, 5)]];
    } while (sameMat(mul2(A, B), mul2(B, A)));
    const AB = mul2(A, B);
    const term = (i: number, j: number): string => `(${A[i]![0]})(${B[0]![j]}) + (${A[i]![1]})(${B[1]![j]})`;
    const stemBase = tex`If $A = ${mat(A)}$ and $B = ${mat(B)}$, then`;
    if (r.chance(0.5)) {
      const i = r.int(0, 1);
      const j = r.int(0, 1);
      const BA = mul2(B, A);
      const { answer, distractors } = numericOptions(r, {
        correct: AB[i]![j]!,
        wrong: [
          BA[i]![j]!, // multiplied in the wrong order
          A[i]![j]! * B[i]![j]!, // multiplied matching entries
          A[i]![0]! * B[j]![0]! + A[i]![1]! * B[j]![1]!, // row times row
          A[0]![j]! * B[0]![i]! + A[1]![j]! * B[1]![i]!,
        ],
        format: intOpt,
        allowNegative: true,
        allowZero: true,
      });
      return {
        stem: tex`${stemBase} the entry in row ${i + 1}, column ${j + 1} of $AB$ is:`,
        answer,
        distractors,
        explanation: tex`Row ${i + 1} of $A$ times column ${j + 1} of $B$: $${term(i, j)} = ${AB[i]![j]}$.`,
      };
    }
    const hadamard = A.map((row, i) => row.map((x, j) => x * B[i]![j]!));
    const answer = m(mat(AB));
    const flipped = AB.map((row) => [...row]);
    flipped[1]![1] = AB[1]![1] === 0 ? 1 : -AB[1]![1]!;
    const distractors = pickDistractors(answer, [
      m(mat(mul2(B, A))), // BA instead of AB
      m(mat(hadamard)), // entry-by-entry product
      m(mat(mul2(transpose2(A), B))),
      m(mat(mul2(A, transpose2(B)))),
      m(mat(flipped)),
    ]);
    return {
      stem: tex`${stemBase} $AB$ equals:`,
      answer,
      distractors,
      explanation: tex`Each entry is a row of $A$ times a column of $B$: $(AB)_{11} = ${term(0, 0)} = ${AB[0]![0]}$, $(AB)_{12} = ${term(0, 1)} = ${AB[0]![1]}$, $(AB)_{21} = ${term(1, 0)} = ${AB[1]![0]}$, $(AB)_{22} = ${term(1, 1)} = ${AB[1]![1]}$.`,
    };
  }),

  b.dynamic('determinant-2x2', { difficulty: 1, origin: 'past-paper', tags: ['matrices basics'] }, (r) => {
    if (r.chance(0.55)) {
      const a = r.int(-6, 9);
      const bb = r.nonZero(-6, 9);
      const c = r.nonZero(-6, 9);
      const d = r.int(-6, 9);
      const det = a * d - bb * c;
      const { answer, distractors } = numericOptions(r, {
        correct: det,
        wrong: [a * d + bb * c, bb * c - a * d, a * bb - c * d, a * c - bb * d],
        format: intOpt,
        allowNegative: true,
        allowZero: true,
      });
      return {
        stem: tex`The determinant of $${mat([[a, bb], [c, d]])}$ is:`,
        answer,
        distractors,
        explanation: tex`$\begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc = (${a})(${d}) - (${bb})(${c}) = ${det}$.`,
      };
    }
    // Singular matrix [[x, p], [q, s]]: sx - pq = 0.
    const x0 = r.intExcept(-8, 8, [-1, 0, 1]);
    const s = r.pick([1, 2, 3, -1, -2]);
    const p = r.pick(divisors(Math.abs(x0 * s)).filter((v) => v <= 9)) * r.sign();
    const q = (x0 * s) / p;
    const answer = intOpt(x0);
    const distractors = pickDistractors(answer, [
      intOpt(-x0), // sign slip
      fracOpt(frac(p * s, q)), // paired the wrong entries
      fracOpt(frac(q * s, p)),
      fracOpt(frac(s, p * q)), // inverted
      intOpt(p * q * s),
      intOpt(p * q), // forgot to divide by the diagonal entry
      intOpt(p + q),
    ]);
    return {
      stem: tex`The matrix $${mat([['x', p], [q, s]])}$ is singular when $x$ equals:`,
      answer,
      distractors,
      explanation: tex`A singular matrix has zero determinant: $${s === 1 ? '' : s === -1 ? '-' : s}x - (${p})(${q}) = 0 \Rightarrow ${s === 1 ? '' : tex`${coefTex(s, 'x')} = ${p * q} \Rightarrow `}x = ${x0}$.`,
    };
  }),

  b.dynamic('inverse-2x2', { difficulty: 3, tags: ['matrices basics'] }, (r) => {
    let a = 0;
    let bb = 0;
    let c = 0;
    let d = 0;
    let D = 0;
    do {
      a = r.int(-4, 6);
      bb = r.nonZero(-4, 6);
      c = r.nonZero(-4, 6);
      d = r.int(-4, 6);
      D = a * d - bb * c;
    } while (![1, -1, 2, -2, 3].includes(D) || a === d);
    const adj: Mat = [[d, -bb], [-c, a]];
    const answer = m(invScaled(D, adj));
    const distractors = pickDistractors(answer, [
      m(mat(adj)), // forgot to divide by |A|
      m(invScaled(D, [[a, -bb], [-c, d]])), // did not swap the diagonal
      m(invScaled(D, [[d, bb], [c, a]])), // did not negate the off-diagonal
      m(invScaled(-D, adj)), // sign of the determinant
      m(invScaled(D, [[d, -c], [-bb, a]])), // transposed adjoint
    ]);
    return {
      stem: tex`The inverse of $A = ${mat([[a, bb], [c, d]])}$ is:`,
      answer,
      distractors,
      explanation: tex`$|A| = (${a})(${d}) - (${bb})(${c}) = ${D}$. Swap the diagonal entries and change the signs of the others: $\operatorname{adj}A = ${mat(adj)}$, so $A^{-1} = \frac{1}{|A|}\operatorname{adj}A = ${invScaled(D, adj)}$.`,
    };
  }),

  b.dynamic('symmetric-matrix-unknown', { difficulty: 1, origin: 'past-paper', tags: ['matrices basics'] }, (r) => {
    const skew = r.chance(0.35);
    const x0 = r.int(-5, 8);
    const p = r.int(1, 4);
    const q = r.int(-6, 6);
    const expr = p * x0 + q;
    const v = skew ? -expr : expr;
    const [i, j] = r.pick([[0, 1], [0, 2], [1, 2]] as const);
    const M: (number | string)[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let s = 0; s < 3; s++) {
      for (let t = s; t < 3; t++) {
        const val = s === t ? (skew ? 0 : r.int(-5, 9)) : r.nonZero(-7, 9);
        M[s]![t] = val;
        M[t]![s] = skew && s !== t ? -val : val;
      }
    }
    M[i]![j] = `${coefTex(p, 'x')}${plus(q)}`;
    M[j]![i] = v;
    const { answer, distractors } = numericOptions(r, {
      correct: x0,
      wrong: ints(
        skew
          ? [(v - q) / p, (-v + q) / p, -x0, -v - q]
          : [(-v - q) / p, (v + q) / p, v - q, -x0],
      ),
      format: intOpt,
      allowNegative: true,
      allowZero: true,
    });
    const rel = skew ? `a_{${i + 1}${j + 1}} = -a_{${j + 1}${i + 1}}` : `a_{${i + 1}${j + 1}} = a_{${j + 1}${i + 1}}`;
    return {
      stem: tex`If $${mat(M)}$ is a ${skew ? 'skew-symmetric' : 'symmetric'} matrix, then $x$ equals:`,
      answer,
      distractors,
      explanation: tex`${skew ? 'A skew-symmetric matrix satisfies $A^{T} = -A$' : 'A symmetric matrix satisfies $A^{T} = A$'}, so $${rel}$: $${coefTex(p, 'x')}${plus(q)} = ${skew ? -v : v} \Rightarrow x = ${x0}$.`,
    };
  }),

  // ---------------------------------------------------------------- fixed questions
  ...b.mcqs([
    {
      id: 'symmetric-matrix-definition',
      d: 1,
      o: 'past-paper',
      t: ['matrices basics'],
      q: tex`A square matrix $A$ is called symmetric if:`,
      a: tex`$A^{T} = A$`,
      x: [tex`$A^{T} = -A$`, tex`$A^{2} = A$`, tex`$A^{-1} = A^{T}$`],
      e: tex`A symmetric matrix equals its transpose ($a_{ij} = a_{ji}$). $A^{T} = -A$ defines a skew-symmetric matrix, $A^{2} = A$ an idempotent matrix and $A^{-1} = A^{T}$ an orthogonal matrix.`,
    },
    {
      id: 'order-of-product',
      d: 1,
      o: 'past-paper',
      t: ['matrices basics'],
      q: tex`If $A$ is a $2 \times 3$ matrix and $B$ is a $3 \times 4$ matrix, the order of $AB$ is:`,
      a: tex`$2 \times 4$`,
      x: [tex`$3 \times 3$`, tex`$4 \times 2$`, tex`$2 \times 3$`],
      e: tex`For $AB$, the columns of $A$ must equal the rows of $B$ (both $3$); the product has the rows of $A$ and the columns of $B$: $2 \times 4$.`,
    },
    {
      id: 'domain-reciprocal-root',
      d: 2,
      t: ['functions'],
      q: tex`The domain of $f(x) = \frac{1}{\sqrt{x - 3}}$ is:`,
      a: tex`$x > 3$`,
      x: [tex`$x \ge 3$`, tex`$x \ne 3$`, tex`$x < 3$`],
      e: tex`The square root needs $x - 3 \ge 0$ and the denominator cannot be $0$, so $x - 3 > 0$, i.e. $x > 3$. ($x = 3$ is excluded because it makes the denominator zero.)`,
    },
    {
      id: 'multiply-by-negative',
      d: 1,
      t: ['inequalities'],
      q: tex`If $a < b$ and $c < 0$, which of the following is always true?`,
      a: tex`$ac > bc$`,
      x: [tex`$ac < bc$`, tex`$a + c > b + c$`, tex`$\frac{a}{c} < \frac{b}{c}$`],
      e: tex`Multiplying or dividing both sides by a negative number reverses the inequality, so $ac > bc$ (and $\frac{a}{c} > \frac{b}{c}$). Adding $c$ keeps the direction: $a + c < b + c$.`,
    },
    {
      id: 'determinant-of-scalar-multiple',
      d: 2,
      t: ['matrices basics'],
      q: tex`If $A$ is a $2 \times 2$ matrix with $|A| = 5$, then $|3A|$ equals:`,
      a: '$45$',
      x: ['$15$', '$135$', '$9$'],
      e: tex`Multiplying an $n \times n$ matrix by $k$ multiplies each of its $n$ rows by $k$, so $|kA| = k^{n}|A|$. Here $|3A| = 3^{2} \times 5 = 45$.`,
    },
    {
      id: 'relation-is-function',
      d: 1,
      t: ['functions'],
      q: 'Which of the following sets of ordered pairs represents a function?',
      a: tex`$\{(1, 4), (2, 5), (3, 4)\}$`,
      x: [tex`$\{(1, 4), (1, 5), (2, 6)\}$`, tex`$\{(2, 3), (3, 4), (2, 5)\}$`, tex`$\{(4, 1), (5, 2), (4, 3)\}$`],
      e: tex`In a function every input has exactly one output. Two inputs may share an output (here $1$ and $3$ both give $4$), but in the other sets the input $1$, $2$ or $4$ is paired with two different outputs.`,
    },
    {
      id: 'identify-geometric-progression',
      d: 1,
      t: ['sequences'],
      q: 'Which of the following sequences is a geometric progression?',
      a: tex`$3, 6, 12, 24, \ldots$`,
      x: [tex`$3, 6, 9, 12, \ldots$`, tex`$1, 4, 9, 16, \ldots$`, tex`$2, 4, 8, 14, \ldots$`],
      e: tex`In a geometric progression the ratio of consecutive terms is constant: $\frac{6}{3} = \frac{12}{6} = \frac{24}{12} = 2$. The sequence $3, 6, 9, 12$ is arithmetic, $1, 4, 9, 16$ are squares and $2, 4, 8, 14$ has ratios $2, 2, 1.75$.`,
    },
    {
      id: 'given-root-find-k',
      d: 1,
      t: ['quadratic equations'],
      q: tex`If $x = 3$ is a root of $x^{2} + kx - 12 = 0$, then $k$ equals:`,
      a: '$1$',
      x: ['$-1$', '$7$', '$-7$'],
      e: tex`Substitute $x = 3$: $9 + 3k - 12 = 0 \Rightarrow 3k = 3 \Rightarrow k = 1$. (The other root is $-4$, since the product of roots is $-12$.)`,
    },
    {
      id: 'inverse-of-product',
      d: 2,
      t: ['matrices basics'],
      q: tex`For invertible square matrices $A$ and $B$ of the same order, $(AB)^{-1}$ equals:`,
      a: tex`$B^{-1}A^{-1}$`,
      x: [tex`$A^{-1}B^{-1}$`, tex`$BA$`, tex`$A^{-1} + B^{-1}$`],
      e: tex`$(AB)(B^{-1}A^{-1}) = A(BB^{-1})A^{-1} = AA^{-1} = I$, so $(AB)^{-1} = B^{-1}A^{-1}$: the order reverses. Since matrix multiplication is not commutative, $A^{-1}B^{-1}$ is not equal to it in general.`,
    },
    {
      id: 'self-inverse-function',
      d: 3,
      t: ['functions'],
      q: tex`If $f(x) = \frac{x + 1}{x - 1}$ for $x \ne 1$, then $f(f(x))$ equals:`,
      a: '$x$',
      x: [tex`$\frac{1}{x}$`, tex`$-x$`, tex`$\frac{x - 1}{x + 1}$`],
      e: tex`$f(f(x)) = \frac{\frac{x+1}{x-1} + 1}{\frac{x+1}{x-1} - 1} = \frac{\frac{2x}{x-1}}{\frac{2}{x-1}} = x$. So $f$ is its own inverse.`,
    },
  ]),
]);

