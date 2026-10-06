/**
 * Mathematics - Quadratic Equations (FSc Part I).
 *
 * Coverage: solving quadratics and the discriminant, relations between roots and
 * coefficients (symmetric functions, forming and transforming equations), nature of
 * roots, cube and fourth roots of unity, equations reducible to quadratic form
 * (biquadratic, exponential, fractional-power and radical equations) and the
 * remainder / factor theorems with synthetic division.
 */
import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  Fraction,
  frac,
  gcd,
  numericOptions,
  pickDistractors,
  polyEval,
  polyTex,
  signed,
  signedSum,
  simplifySurd,
  tex,
} from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Retries a parameter draw until it is acceptable (returns non-null). */
function draw<T>(make: () => T | null): T {
  for (let i = 0; i < 500; i++) {
    const value = make();
    if (value !== null) return value;
  }
  throw new Error('quadratic-equations: no acceptable parameters found');
}

const isSquare = (n: number): boolean => n >= 0 && Number.isInteger(Math.sqrt(n));

/** LaTeX of an exact rational: `5`, `-\frac{3}{2}`. */
const ft = (v: number | Fraction): string => Fraction.of(v).toTex();

/** Rational wrapped in parentheses for substitutions: `(3)`, `(-\frac{1}{2})`. */
const pf = (v: number | Fraction): string => `(${ft(v)})`;

/** Option text for an exact rational. */
const f$ = (v: number | Fraction): string => `$${ft(v)}$`;

/** Option text for an integer. */
const int$ = (v: number): string => `$${v}$`;

/** Two roots in ascending order: `$-\frac{1}{2}$ and $3$`. */
function pairText(x: number | Fraction, y: number | Fraction): string {
  const [lo, hi] = [Fraction.of(x), Fraction.of(y)].sort((p, q) => p.compare(q));
  return `$${ft(lo as Fraction)}$ and $${ft(hi as Fraction)}$`;
}

/** Two values of a parameter in ascending order: `$-5$ or $3$`. */
function orText(x: number, y: number): string {
  return `$${Math.min(x, y)}$ or $${Math.max(x, y)}$`;
}

/** Solution set in ascending order: `$\{-27, 8\}$`. */
function setText(values: ReadonlyArray<number | Fraction>): string {
  const sorted = values.map((v) => Fraction.of(v)).sort((p, q) => p.compare(q));
  return `$\\{${sorted.map((f) => f.toTex()).join(', ')}\\}$`;
}

/** `$ax^2 + bx + c = 0$` reduced to lowest terms with a positive leading coefficient. */
function quadEq(a: number, b: number, c: number): string {
  const g = (gcd(gcd(a, b), c) || 1) * (a < 0 ? -1 : 1);
  return `$${polyTex([a / g, b / g, c / g])} = 0$`;
}

/** `$Ax^2 + Bx + C = 0$` for the monic quadratic with the given root sum and product. */
function eqFromSumProduct(sum: Fraction, product: Fraction): string {
  const l = (sum.d * product.d) / gcd(sum.d, product.d);
  return quadEq(l, sum.neg().mul(l).toNumber(), product.mul(l).toNumber());
}

/**
 * `(p ± k√m)/d` in lowest terms, optionally imaginary:
 * `2 \pm \sqrt{3}`, `\frac{-1 \pm \sqrt{3}\,i}{2}`, `-1 \pm 2i`.
 */
function pmTex(p: number, k: number, m: number, d: number, imag = false): string {
  const g = gcd(gcd(p, k), d) || 1;
  const P = p / g;
  const K = k / g;
  const D = d / g;
  const kText = K === 1 ? '' : String(K);
  const term = m === 1 ? (imag ? `${kText}i` : String(K)) : `${kText}\\sqrt{${m}}${imag ? '\\,i' : ''}`;
  if (D === 1) return P === 0 ? `\\pm ${term}` : `${P} \\pm ${term}`;
  return P === 0 ? `\\pm\\frac{${term}}{${D}}` : `\\frac{${P} \\pm ${term}}{${D}}`;
}

/** k·ω^j with j reduced mod 3: `2`, `-\omega`, `16\omega^2`. */
function omegaTex(k: number, j: number): string {
  const e = ((j % 3) + 3) % 3;
  if (e === 0 || k === 0) return String(k);
  const w = e === 1 ? '\\omega' : '\\omega^2';
  return k === 1 ? w : k === -1 ? `-${w}` : `${k}${w}`;
}

/** Shows the reduction of ω^p with ω³ = 1, e.g. `$\omega^{28} = (\omega^3)^{9}\,\omega = \omega$`. */
function omegaReduction(p: number): string {
  const m = Math.floor(p / 3);
  const rest = p % 3;
  if (rest === 0) return tex`$\omega^{${p}} = (\omega^3)^{${m}} = 1$`;
  const w = omegaTex(1, rest);
  return tex`$\omega^{${p}} = (\omega^3)^{${m}}\,${w} = ${w}$`;
}

/** Answer plus three distinct wrong rationals (mistake-based first, then small offsets). */
function fracOptions(correct: Fraction, wrong: readonly Fraction[]): { answer: string; distractors: string[] } {
  const answer = f$(correct);
  const pool = wrong.map(f$);
  for (const o of [1, -1, 2, -2, 3, -3, 5, -5]) pool.push(f$(correct.add(o)));
  return { answer, distractors: pickDistractors(answer, pool) };
}

/** Integer answer with mistake-based integer distractors. */
function intOptions(r: Rng, correct: number, wrong: readonly number[]): { answer: string; distractors: string[] } {
  return numericOptions(r, { correct, wrong, format: int$, allowNegative: true, allowZero: true, fallback: 'integer' });
}

/** Polynomial whose coefficient of x^kPow is the unknown `k` (coefficients highest power first). */
function polyWithK(coeffs: readonly number[], kPow: number): string {
  const deg = coeffs.length - 1;
  let out = '';
  coeffs.forEach((c, i) => {
    const p = deg - i;
    const v = p === 0 ? '' : p === 1 ? 'x' : `x^{${p}}`;
    if (p === kPow) {
      out += out ? ` + k${v}` : `k${v}`;
      return;
    }
    if (c === 0) return;
    const body = Math.abs(c) === 1 && v ? v : `${Math.abs(c)}${v}`;
    out += out ? (c < 0 ? ` - ${body}` : ` + ${body}`) : c < 0 ? `-${body}` : body;
  });
  return out;
}

/** Substitution display for P(x0): `(2)^{3} - 4(2)^{2} + 2(2) - 5` (a coefficient may be `'k'`). */
function substTex(coeffs: ReadonlyArray<number | 'k'>, x0: number): string {
  const deg = coeffs.length - 1;
  const parts: string[] = [];
  coeffs.forEach((c, i) => {
    const p = deg - i;
    const pow = p === 0 ? '' : p === 1 ? `(${x0})` : `(${x0})^{${p}}`;
    if (c === 'k') {
      parts.push(`${parts.length ? '+ ' : ''}k${pow}`);
      return;
    }
    if (c === 0) return;
    const mag = Math.abs(c);
    const body = p === 0 ? String(mag) : mag === 1 ? pow : `${mag}${pow}`;
    parts.push(parts.length ? `${c < 0 ? '-' : '+'} ${body}` : c < 0 ? `-${body}` : body);
  });
  return parts.join(' ');
}

/** `lead ± rest`, e.g. withLead('kx^2', [[-12, 'x'], [9, '']]) -> `kx^2 - 12x + 9`. */
function withLead(lead: string, terms: ReadonlyArray<readonly [number, string]>): string {
  const tail = signedSum(terms);
  return tail.startsWith('-') ? `${lead} - ${tail.slice(1)}` : `${lead} + ${tail}`;
}

const NATURE = {
  equal: 'real and equal',
  rational: 'real, rational and unequal',
  irrational: 'real, irrational and unequal',
  complex: 'imaginary (complex conjugates)',
} as const;
type Nature = keyof typeof NATURE;
const NATURES = Object.keys(NATURE) as Nature[];

const OMEGA_INTRO = tex`If $\omega$ is a complex cube root of unity, then`;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('mathematics', 'quadratic-equations', (b) => [
  // ------------------------------------------------------------- roots
  b.dynamic('quadratic-roots', { difficulty: 1, tags: ['roots and discriminant'] }, (r) => {
    const kind = r.weighted(['factor', 'surd', 'complex'] as const, [2, 1.5, 1]);

    if (kind === 'factor') {
      // (q1 x - p1)(q2 x - p2) = 0 with roots p1/q1 and p2/q2 (not equal, not opposite).
      const { p1, q1, p2, q2 } = draw(() => {
        const q1 = r.pick([1, 1, 2, 3]);
        const q2 = r.pick([1, 2, 3]);
        const p1 = r.nonZero(-6, 6);
        const p2 = r.nonZero(-6, 6);
        const ok = gcd(p1, q1) === 1 && gcd(p2, q2) === 1 && Math.abs(p1 * q2) !== Math.abs(p2 * q1);
        return ok ? { p1, q1, p2, q2 } : null;
      });
      const r1 = frac(p1, q1);
      const r2 = frac(p2, q2);
      const eq = polyTex([q1 * q2, -(p1 * q2 + p2 * q1), p1 * p2]);
      const answer = pairText(r1, r2);
      return {
        stem: tex`The roots of the equation $${eq} = 0$ are:`,
        answer,
        distractors: pickDistractors(answer, [
          pairText(r1.neg(), r2.neg()), // sign slip when reading roots off the factors
          pairText(r1.inv(), r2.inv()), // roots of the reversed equation cx^2 + bx + a = 0
          pairText(r1.neg(), r2),
          pairText(r1, r2.neg()),
        ]),
        explanation: tex`Factorise: $${eq} = (${polyTex([q1, -p1])})(${polyTex([q2, -p2])}) = 0$. Setting each factor equal to zero gives $x = ${ft(r1)}$ or $x = ${ft(r2)}$.`,
      };
    }

    if (kind === 'surd') {
      const { B, C } = draw(() => {
        const B = r.chance(0.7) ? 2 * r.nonZero(-4, 4) : r.pick([-5, -3, -1, 1, 3, 5]);
        const C = r.nonZero(-9, 9);
        const D = B * B - 4 * C;
        return D > 0 && !isSquare(D) ? { B, C } : null;
      });
      const D = B * B - 4 * C;
      const { c: k, r: m } = simplifySurd(1, D);
      const roots = pmTex(-B, k, m, 2);
      const candidates = [
        `$${pmTex(B, k, m, 2)}$`, // took -b as b
        `$${pmTex(-B, 2 * k, m, 2)}$`, // did not halve the square root
        `$${pmTex(-B, k, m, 1)}$`, // did not divide by 2a at all
      ];
      const D2 = B * B + 4 * C; // used b^2 + 4ac
      if (D2 > 0 && !isSquare(D2)) {
        const s = simplifySurd(1, D2);
        candidates.splice(1, 0, `$${pmTex(-B, s.c, s.r, 2)}$`);
      }
      return {
        stem: tex`The roots of the equation $${polyTex([1, B, C])} = 0$ are:`,
        answer: `$${roots}$`,
        distractors: pickDistractors(`$${roots}$`, candidates),
        explanation: tex`By the quadratic formula with $a = 1$, $b = ${B}$, $c = ${C}$: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} = \frac{${-B} \pm \sqrt{${D}}}{2} = ${roots}$.`,
      };
    }

    // complex roots
    const { B, C } = draw(() => {
      const B = r.chance(0.75) ? 2 * r.nonZero(-4, 4) : r.pick([-3, -1, 1, 3]);
      const C = r.int(1, 25);
      return B * B - 4 * C < 0 ? { B, C } : null;
    });
    const D = B * B - 4 * C;
    const { c: k, r: m } = simplifySurd(1, -D);
    const roots = pmTex(-B, k, m, 2, true);
    const candidates = [
      `$${pmTex(B, k, m, 2, true)}$`, // took -b as b
      `$${pmTex(-B, 2 * k, m, 2, true)}$`, // did not halve the square root
      `$${pmTex(-B, k, m, 1, true)}$`, // did not divide by 2a
    ];
    if (m > 1) candidates.splice(1, 0, `$${pmTex(-B, k, m, 2)}$`); // dropped the i
    return {
      stem: tex`The roots of the equation $${polyTex([1, B, C])} = 0$ are:`,
      answer: `$${roots}$`,
      distractors: pickDistractors(`$${roots}$`, candidates),
      explanation: tex`By the quadratic formula with $a = 1$, $b = ${B}$, $c = ${C}$: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} = \frac{${-B} \pm \sqrt{${D}}}{2} = ${roots}$, since $\sqrt{${D}} = ${pmTex(0, k, m, 1, true).replace('\\pm ', '')}$.`,
    };
  }),

  b.dynamic('sum-and-product', { difficulty: 1, tags: ['sum and product of roots'] }, (r) => {
    const kind = r.weighted(['rearranged', 'form', 'other-root'] as const, [1.2, 1, 1]);

    if (kind === 'rearranged') {
      const { A, B, C } = draw(() => {
        const A = r.int(1, 6);
        const B = r.nonZero(-9, 9);
        const C = r.nonZero(-9, 9);
        return gcd(gcd(A, B), C) === 1 ? { A, B, C } : null;
      });
      const shown = r.pick([
        `${polyTex([A, 0, 0])} = ${polyTex([-B, -C])}`,
        `${polyTex([A, 0, C])} = ${polyTex([-B, 0])}`,
        `${polyTex([A, B, 0])} = ${-C}`,
        `x(${polyTex([A, B])}) = ${-C}`,
      ]);
      const S = frac(-B, A);
      const P = frac(C, A);
      const askSum = r.chance(0.5);
      const { answer, distractors } = askSum
        ? fracOptions(S, [S.neg(), P, P.neg()])
        : fracOptions(P, [P.neg(), S, S.neg()]);
      return {
        stem: tex`The ${askSum ? 'sum' : 'product'} of the roots of the equation $${shown}$ is:`,
        answer,
        distractors,
        explanation:
          tex`In standard form the equation is $${polyTex([A, B, C])} = 0$, so $a = ${A}$, $b = ${B}$, $c = ${C}$. ` +
          (askSum
            ? tex`Sum of the roots $= -\frac{b}{a} = ${ft(S)}$.`
            : tex`Product of the roots $= \frac{c}{a} = ${ft(P)}$.`),
      };
    }

    if (kind === 'form') {
      const sub = r.pick(['integer', 'surd', 'complex'] as const);
      let rootsText: string;
      let work: string;
      let S: number;
      let P: number;
      let slipP: number;
      if (sub === 'integer') {
        const { r1, r2 } = draw(() => {
          const r1 = r.nonZero(-7, 7);
          const r2 = r.nonZero(-7, 7);
          return r1 !== r2 && r1 + r2 !== 0 ? { r1, r2 } : null;
        });
        const [lo, hi] = [Math.min(r1, r2), Math.max(r1, r2)];
        S = r1 + r2;
        P = r1 * r2;
        slipP = -P;
        rootsText = `$${lo}$ and $${hi}$`;
        work = tex`Sum of the roots $= ${lo} ${signed(hi).trim()} = ${S}$ and product $= ${pf(lo)}${pf(hi)} = ${P}$.`;
      } else if (sub === 'surd') {
        const p = r.nonZero(-5, 5);
        const q = r.pick([2, 3, 5, 6, 7, 10, 11]);
        S = 2 * p;
        P = p * p - q;
        slipP = p * p + q;
        rootsText = tex`$${p} + \sqrt{${q}}$ and $${p} - \sqrt{${q}}$`;
        work = tex`Sum of the roots $= 2${pf(p)} = ${S}$ and product $= ${pf(p)}^2 - (\sqrt{${q}})^2 = ${P}$.`;
      } else {
        const p = r.nonZero(-5, 5);
        const q = r.int(1, 5);
        const qi = q === 1 ? 'i' : `${q}i`;
        S = 2 * p;
        P = p * p + q * q;
        slipP = p * p - q * q;
        rootsText = `$${p} + ${qi}$ and $${p} - ${qi}$`;
        work = tex`Sum of the roots $= 2${pf(p)} = ${S}$ and product $= ${pf(p)}^2 - (${qi})^2 = ${p * p} + ${q * q} = ${P}$.`;
      }
      const answer = quadEq(1, -S, P);
      return {
        stem: `The quadratic equation whose roots are ${rootsText} is:`,
        answer,
        distractors: pickDistractors(answer, [
          quadEq(1, S, P), // sign of the sum
          quadEq(1, -S, slipP), // wrong product
          quadEq(1, -S, -P),
          quadEq(1, S, -P),
        ]),
        explanation: tex`${work} The equation is $x^2 - (\text{sum})x + (\text{product}) = 0$, i.e. ${answer}.`,
      };
    }

    // other root, given one root
    if (r.chance(0.5)) {
      // Unknown middle coefficient: use the product of the roots.
      const { A, r1, n } = draw(() => {
        const A = r.pick([1, 2, 3]);
        const r1 = r.nonZero(-4, 4);
        const n = r.nonZero(-9, 9);
        return Math.abs(n) !== Math.abs(A * r1) ? { A, r1, n } : null;
      });
      const r2 = frac(n, A);
      const C = r1 * n;
      const P = frac(C, A);
      const k = -(A * r1 + n);
      const { answer, distractors } = fracOptions(r2, [r2.neg(), P.mul(r1), P.sub(r1), frac(k)]);
      return {
        stem: tex`If one root of $${coefTex(A, 'x^2')} + kx${signed(C)} = 0$ is $${r1}$, then the other root is:`,
        answer,
        distractors,
        explanation: tex`The product of the roots is $\frac{c}{a} = ${ft(P)}$. If the other root is $\beta$, then $${coefTex(r1, '\\beta')} = ${ft(P)}$, so $\beta = ${ft(r2)}$.`,
      };
    }
    // Unknown constant term: use the sum of the roots.
    const { r1, r2 } = draw(() => {
      const r1 = r.nonZero(-8, 8);
      const r2 = r.nonZero(-8, 8);
      return r1 !== r2 && r1 + r2 !== 0 ? { r1, r2 } : null;
    });
    const B = -(r1 + r2);
    const { answer, distractors } = intOptions(r, r2, [-r2, 2 * r1 + r2, r1 * r2]);
    return {
      stem: tex`If one root of $${polyTex([1, B, 0])} + k = 0$ is $${r1}$, then the other root is:`,
      answer,
      distractors,
      explanation: tex`The sum of the roots is $-\frac{b}{a} = ${-B}$. If the other root is $\beta$, then $${r1} + \beta = ${-B}$, so $\beta = ${r2}$.`,
    };
  }),

  b.dynamic(
    'equal-roots-find-k',
    { difficulty: 2, origin: 'past-paper', tags: ['roots and discriminant', 'nature of roots'] },
    (r) => {
      const kind = r.weighted(['middle', 'constant', 'leading', 'shifted'] as const, [1.5, 1, 1, 1]);

      if (kind === 'middle') {
        const { A, C, K } = draw(() => {
          const g = r.pick([1, 1, 2, 3]);
          const u = r.int(1, 4);
          const v = r.int(1, 5);
          const K = 2 * g * u * v;
          return g * u * v > 1 && K <= 24 ? { A: g * u * u, C: g * v * v, K } : null;
        });
        const answer = `$\\pm ${K}$`;
        return {
          stem: tex`If the roots of $${coefTex(A, 'x^2')} ${r.pick(['+', '-'])} kx + ${C} = 0$ are equal, then $k$ equals:`,
          answer,
          distractors: pickDistractors(
            answer,
            // forgot the 4; doubled; forgot the square root; forgot the root of 4ac
            [K / 2, 2 * K, 4 * A * C, 2 * A * C].map((v) => `$\\pm ${v}$`),
          ),
          explanation: tex`For equal roots the discriminant is zero: $k^2 - 4(${A})(${C}) = 0$, so $k^2 = ${4 * A * C}$ and $k = \pm ${K}$.`,
        };
      }

      if (kind === 'constant') {
        const { A, B } = draw(() => {
          const A = r.int(1, 4);
          const B = r.nonZero(-12, 12);
          return (B * B) % (4 * A) === 0 ? { A, B } : null;
        });
        const K = (B * B) / (4 * A);
        const { answer, distractors } = intOptions(r, K, [-K, 2 * K, 4 * K, B * B]);
        return {
          stem: tex`If the equation $${polyTex([A, B, 0])} + k = 0$ has equal roots, then $k$ equals:`,
          answer,
          distractors,
          explanation: tex`Equal roots require $b^2 - 4ac = 0$: $(${B})^2 - 4(${A})k = 0$, so $${4 * A}k = ${B * B}$ and $k = ${K}$.`,
        };
      }

      if (kind === 'leading') {
        const { B, C } = draw(() => {
          const C = r.nonZero(-6, 9);
          const B = r.nonZero(-12, 12);
          return (B * B) % (4 * C) === 0 ? { B, C } : null;
        });
        const K = (B * B) / (4 * C);
        const { answer, distractors } = intOptions(r, K, [-K, 2 * K, 4 * K]);
        return {
          stem: tex`If the equation $${withLead('kx^2', [[B, 'x'], [C, '']])} = 0$ has equal roots, then $k$ equals:`,
          answer,
          distractors,
          explanation: tex`Equal roots require $b^2 - 4ac = 0$: $(${B})^2 - 4k(${C}) = 0$, so $${4 * C}k = ${B * B}$ and $k = ${K}$.`,
        };
      }

      // k appears inside the middle coefficient: x^2 + (k - m)x + s^2 = 0
      const m = r.nonZero(-6, 6);
      const s = r.int(1, 5);
      const inner = `k${signed(-m)}`;
      const answer = orText(m - 2 * s, m + 2 * s);
      return {
        stem: tex`If the roots of $x^2 + (${inner})x + ${s * s} = 0$ are equal, then $k$ equals:`,
        answer,
        distractors: pickDistractors(answer, [
          orText(-m - 2 * s, -m + 2 * s), // sign slip when solving for k
          orText(m - s, m + s), // forgot the 4 in b^2 - 4ac
          orText(-2 * s, 2 * s), // ignored the constant inside the bracket
        ]),
        explanation: tex`Equal roots require $(${inner})^2 - 4(1)(${s * s}) = 0$, so $(${inner})^2 = ${4 * s * s}$ and $${inner} = \pm ${2 * s}$. Hence $k = ${m - 2 * s}$ or $k = ${m + 2 * s}$.`,
      };
    },
  ),

  b.dynamic(
    'nature-of-roots',
    { difficulty: 1, origin: 'past-paper', tags: ['nature of roots', 'roots and discriminant'] },
    (r) => {
      const kind = r.pick(NATURES);
      const { A, B, C } = draw(() => {
        switch (kind) {
          case 'equal': {
            const p = r.int(1, 4);
            const q = r.int(1, 7);
            return gcd(p, q) === 1 ? { A: p * p, B: r.sign() * 2 * p * q, C: q * q } : null;
          }
          case 'rational': {
            const p1 = r.int(1, 3);
            const p2 = r.int(1, 3);
            const q1 = r.nonZero(-6, 6);
            const q2 = r.nonZero(-6, 6);
            const B = -(p1 * q2 + p2 * q1);
            const ok = gcd(p1, q1) === 1 && gcd(p2, q2) === 1 && p1 * q2 !== p2 * q1 && B !== 0;
            return ok ? { A: p1 * p2, B, C: q1 * q2 } : null;
          }
          default: {
            const A = r.int(1, 5);
            const B = r.nonZero(-9, 9);
            const C = kind === 'complex' ? r.int(1, 12) : r.nonZero(-9, 9);
            const D = B * B - 4 * A * C;
            const ok = gcd(gcd(A, B), C) === 1 && (kind === 'complex' ? D < 0 : D > 0 && !isSquare(D));
            return ok ? { A, B, C } : null;
          }
        }
      });
      const D = B * B - 4 * A * C;
      const reason = {
        equal: tex`Since $D = 0$, the roots are real and equal.`,
        rational: tex`Since $D = ${Math.round(Math.sqrt(D))}^2$ is a positive perfect square, the roots are real, rational and unequal.`,
        irrational: tex`Since $D > 0$ but is not a perfect square, the roots are real, irrational and unequal.`,
        complex: tex`Since $D < 0$, the roots are imaginary (a pair of complex conjugates).`,
      }[kind];
      return {
        stem: tex`The roots of the equation $${polyTex([A, B, C])} = 0$ are:`,
        answer: NATURE[kind],
        distractors: NATURES.filter((n) => n !== kind).map((n) => NATURE[n]),
        explanation: tex`Discriminant $D = b^2 - 4ac = (${B})^2 - 4(${A})(${C}) = ${D}$. ${reason}`,
      };
    },
  ),

  // ------------------------------------------------- sum and product of roots
  b.dynamic(
    'symmetric-functions',
    { difficulty: 2, origin: 'past-paper', tags: ['sum and product of roots'] },
    (r) => {
      const kind = r.weighted(
        ['squares', 'reciprocals', 'difference', 'mixed', 'ratios', 'cubes', 'reciprocal-squares'] as const,
        [1.5, 1.2, 1, 1, 1, 1, 0.8],
      );
      const heavy = kind === 'cubes' || kind === 'reciprocal-squares';
      const { A, B, C } = draw(() => {
        const A = heavy ? 1 : r.pick([1, 1, 2, 3]);
        const B = heavy ? r.nonZero(-6, 6) : r.nonZero(-9, 9);
        const C = heavy ? r.nonZero(-6, 6) : r.nonZero(-9, 9);
        return gcd(gcd(A, B), C) === 1 ? { A, B, C } : null;
      });
      const S = frac(-B, A);
      const P = frac(C, A);
      const S2 = S.mul(S);
      const sumSq = S2.sub(P.mul(2));
      let expr: string;
      let value: Fraction;
      let wrong: Fraction[];
      let work: string;
      switch (kind) {
        case 'squares':
          expr = tex`\alpha^2 + \beta^2`;
          value = sumSq;
          wrong = [S2.add(P.mul(2)), S2, S2.sub(P.mul(4))];
          work = tex`(\alpha + \beta)^2 - 2\alpha\beta = ${pf(S)}^2 - 2${pf(P)}`;
          break;
        case 'reciprocals':
          expr = tex`\frac{1}{\alpha} + \frac{1}{\beta}`;
          value = S.div(P);
          wrong = [P.div(S), S.div(P).neg(), S.inv()];
          work = tex`\frac{\alpha + \beta}{\alpha\beta} = ${pf(S)} \div ${pf(P)}`;
          break;
        case 'difference':
          expr = tex`(\alpha - \beta)^2`;
          value = S2.sub(P.mul(4));
          wrong = [sumSq, S2.add(P.mul(4)), P.mul(4).sub(S2)];
          work = tex`(\alpha + \beta)^2 - 4\alpha\beta = ${pf(S)}^2 - 4${pf(P)}`;
          break;
        case 'mixed':
          expr = tex`\alpha^2\beta + \alpha\beta^2`;
          value = P.mul(S);
          wrong = [P.mul(S).neg(), P.add(S), S2.mul(P)];
          work = tex`\alpha\beta(\alpha + \beta) = ${pf(P)}${pf(S)}`;
          break;
        case 'ratios':
          expr = tex`\frac{\alpha}{\beta} + \frac{\beta}{\alpha}`;
          value = sumSq.div(P);
          wrong = [S2.div(P), S2.add(P.mul(2)).div(P), sumSq];
          work = tex`\frac{\alpha^2 + \beta^2}{\alpha\beta} = \frac{(\alpha + \beta)^2 - 2\alpha\beta}{\alpha\beta} = \left[${pf(S)}^2 - 2${pf(P)}\right] \div ${pf(P)}`;
          break;
        case 'cubes':
          expr = tex`\alpha^3 + \beta^3`;
          value = S.pow(3).sub(P.mul(S).mul(3));
          wrong = [S.pow(3).sub(P.mul(3)), S.pow(3).add(P.mul(S).mul(3)), S.pow(3).sub(P.mul(S).mul(3)).neg()];
          work = tex`(\alpha + \beta)^3 - 3\alpha\beta(\alpha + \beta) = ${pf(S)}^3 - 3${pf(P)}${pf(S)}`;
          break;
        default:
          expr = tex`\frac{1}{\alpha^2} + \frac{1}{\beta^2}`;
          value = sumSq.div(P.mul(P));
          wrong = [sumSq.div(P), S2.div(P.mul(P)), S2.add(P.mul(2)).div(P.mul(P))];
          work = tex`\frac{\alpha^2 + \beta^2}{(\alpha\beta)^2} = \left[${pf(S)}^2 - 2${pf(P)}\right] \div ${pf(P)}^2`;
          break;
      }
      const { answer, distractors } = fracOptions(value, wrong);
      return {
        stem: tex`If $\alpha$ and $\beta$ are the roots of $${polyTex([A, B, C])} = 0$, then $${expr}$ equals:`,
        answer,
        distractors,
        explanation: tex`Here $\alpha + \beta = -\frac{b}{a} = ${ft(S)}$ and $\alpha\beta = \frac{c}{a} = ${ft(P)}$. So $${expr} = ${work} = ${ft(value)}$.`,
      };
    },
  ),

  b.dynamic(
    'transformed-roots',
    { difficulty: 3, origin: 'past-paper', tags: ['sum and product of roots'] },
    (r) => {
      const { A, B, C } = draw(() => {
        const A = r.pick([1, 1, 2, 3]);
        const B = r.nonZero(-7, 7);
        const C = r.nonZero(-7, 7);
        return gcd(gcd(A, B), C) === 1 ? { A, B, C } : null;
      });
      const S = frac(-B, A);
      const P = frac(C, A);
      const kind = r.weighted(['reciprocal', 'square', 'ratio', 'shift', 'scale'] as const, [1, 1.2, 0.8, 1, 1]);
      let rootsText: string;
      let newS: Fraction;
      let newP: Fraction;
      let work: string;
      let slips: Array<[number, number, number]>;
      switch (kind) {
        case 'reciprocal':
          rootsText = tex`$\frac{1}{\alpha}$ and $\frac{1}{\beta}$`;
          newS = S.div(P);
          newP = P.inv();
          work = tex`$\frac{1}{\alpha} + \frac{1}{\beta} = \frac{\alpha + \beta}{\alpha\beta} = ${ft(newS)}$ and $\frac{1}{\alpha\beta} = ${ft(newP)}$`;
          slips = [
            [C, -B, A], // roots -1/alpha, -1/beta
            [B * C, A * C, A * B], // took reciprocals of the coefficients
            [A, -B, C], // roots -alpha, -beta
          ];
          break;
        case 'square':
          rootsText = tex`$\alpha^2$ and $\beta^2$`;
          newS = S.mul(S).sub(P.mul(2));
          newP = P.mul(P);
          work = tex`$\alpha^2 + \beta^2 = (\alpha + \beta)^2 - 2\alpha\beta = ${ft(newS)}$ and $\alpha^2\beta^2 = (\alpha\beta)^2 = ${ft(newP)}$`;
          slips = [
            [A * A, -(B * B + 2 * A * C), C * C], // used S^2 + 2P
            [A * A, B * B, C * C], // squared every coefficient
            [A * A, -B * B, C * C], // took alpha^2 + beta^2 = (alpha + beta)^2
          ];
          break;
        case 'ratio':
          rootsText = tex`$\frac{\alpha}{\beta}$ and $\frac{\beta}{\alpha}$`;
          newS = S.mul(S).sub(P.mul(2)).div(P);
          newP = frac(1);
          work = tex`$\frac{\alpha}{\beta} + \frac{\beta}{\alpha} = \frac{(\alpha + \beta)^2 - 2\alpha\beta}{\alpha\beta} = ${ft(newS)}$ and $\frac{\alpha}{\beta} \cdot \frac{\beta}{\alpha} = 1$`;
          slips = [
            [A * C, B * B - 2 * A * C, A * C], // sign of the sum
            [A * C, -B * B, A * C], // forgot -2(alpha)(beta)
            [A * C, -(B * B + 2 * A * C), A * C], // used +2(alpha)(beta)
          ];
          break;
        case 'shift': {
          const h = r.pick([-3, -2, -1, 1, 2, 3]);
          rootsText = `$\\alpha${signed(h)}$ and $\\beta${signed(h)}$`;
          newS = S.add(2 * h);
          newP = P.add(S.mul(h)).add(h * h);
          work = tex`$(\alpha${signed(h)}) + (\beta${signed(h)}) = (\alpha + \beta)${signed(2 * h)} = ${ft(newS)}$ and $(\alpha${signed(h)})(\beta${signed(h)}) = \alpha\beta ${h < 0 ? '-' : '+'} ${Math.abs(h)}(\alpha + \beta) + ${h * h} = ${ft(newP)}$`;
          slips = [
            [A, B + 2 * A * h, A * h * h + B * h + C], // shifted the wrong way
            [A, B - 2 * A * h, C - B * h], // forgot the h^2 term
            [A, B - A * h, A * h * h - B * h + C], // added h to the sum only once
          ];
          break;
        }
        default: {
          const k = r.pick([2, 3, -2, -1]);
          const ka = coefTex(k, '\\alpha');
          const kb = coefTex(k, '\\beta');
          rootsText = `$${ka}$ and $${kb}$`;
          newS = S.mul(k);
          newP = P.mul(k * k);
          work = tex`$${ka} + ${k < 0 ? `(${kb})` : kb} = ${coefTex(k, '(\\alpha + \\beta)')} = ${ft(newS)}$ and $(${ka})(${kb}) = ${coefTex(k * k, '\\alpha\\beta')} = ${ft(newP)}$`;
          slips = [
            [k * k * A, k * B, C], // roots alpha/k, beta/k
            [A, k * B, k * C], // multiplied the product by k only once
            [A, -k * B, k * k * C], // sign of the sum
          ];
          break;
        }
      }
      const answer = eqFromSumProduct(newS, newP);
      // Generic wrong equations, used only when the slips above coincide (e.g. A = C).
      const fallback: Array<[number, number, number]> = [
        [A, -B, C],
        [C, B, A],
        [C, -B, A],
        [A, B, -C],
        [A, -B, -C],
        [C, B, -A],
        [A, 2 * B, C],
        [A, B, 2 * C],
      ];
      return {
        stem: tex`If $\alpha$ and $\beta$ are the roots of $${polyTex([A, B, C])} = 0$, then the equation whose roots are ${rootsText} is:`,
        answer,
        distractors: pickDistractors(
          answer,
          [...slips, ...fallback].map(([a2, b2, c2]) => quadEq(a2, b2, c2)),
        ),
        explanation: tex`Here $\alpha + \beta = ${ft(S)}$ and $\alpha\beta = ${ft(P)}$. For the new roots: ${work}. The required equation is $x^2 - (\text{sum})x + (\text{product}) = 0$, i.e. ${answer}.`,
      };
    },
  ),

  // ------------------------------------------------------ cube roots of unity
  b.dynamic('omega-powers', { difficulty: 1, tags: ['cube roots of unity'] }, (r) => {
    const kind = r.weighted(['pair', 'triple', 'negative'] as const, [2, 1, 1]);

    if (kind === 'pair') {
      // ω^x + ω^y: equal residues give 2ω^x, different ones give minus the missing power.
      const sumOf = (x: number, y: number): [number, number] => (x === y ? [2, x] : [-1, 3 - x - y]);
      const p = r.int(4, 60);
      const q = p + r.int(1, 40);
      const rp = p % 3;
      const rq = q % 3;
      const [k, j] = sumOf(rp, rq);
      const answer = `$${omegaTex(k, j)}$`;
      const candidates: Array<[number, number]> = [
        sumOf(rp, (rq + 1) % 3), // mis-reduced an exponent
        sumOf((rp + 1) % 3, rq),
        [-k, j], // sign slip, e.g. 1 + ω = ω²
        sumOf(rp, (rq + 2) % 3),
        sumOf((rp + 2) % 3, rq),
      ];
      const finish = rp === rq ? '' : tex` (using $1 + \omega + \omega^2 = 0$)`;
      return {
        stem: tex`${OMEGA_INTRO} $\omega^{${p}} + \omega^{${q}}$ equals:`,
        answer,
        distractors: pickDistractors(
          answer,
          candidates.map(([kk, jj]) => `$${omegaTex(kk, jj)}$`),
        ),
        explanation: tex`Since $\omega^3 = 1$: ${omegaReduction(p)} and ${omegaReduction(q)}. Hence $\omega^{${p}} + \omega^{${q}} = ${omegaTex(1, rp)} + ${omegaTex(1, rq)} = ${omegaTex(k, j)}$${finish}.`,
      };
    }

    if (kind === 'triple') {
      const n = r.int(2, 50);
      const value = n % 3 === 0 ? 3 : 0;
      return {
        stem: tex`${OMEGA_INTRO} $1 + \omega^{${n}} + \omega^{${2 * n}}$ equals:`,
        answer: int$(value),
        distractors: value === 0 ? ['$3$', '$1$', '$-1$'] : ['$0$', '$1$', '$-1$'],
        explanation:
          value === 3
            ? tex`$${n}$ is a multiple of $3$, so $\omega^{${n}} = \omega^{${2 * n}} = 1$ and the sum is $1 + 1 + 1 = 3$.`
            : tex`Using $\omega^3 = 1$: $\omega^{${n}} = ${omegaTex(1, n)}$ and $\omega^{${2 * n}} = ${omegaTex(1, 2 * n)}$, so the sum is $1 + \omega + \omega^2 = 0$.`,
      };
    }

    // negative power
    const n = r.int(2, 40);
    const j = (3 - (n % 3)) % 3;
    const next = n + j; // smallest multiple of 3 that is >= n
    const answer = `$${omegaTex(1, j)}$`;
    return {
      stem: tex`${OMEGA_INTRO} $\omega^{-${n}}$ equals:`,
      answer,
      distractors: pickDistractors(answer, [
        `$${omegaTex(1, n)}$`, // ignored the minus sign
        `$${omegaTex(-1, j)}$`,
        `$${omegaTex(1, j + 1)}$`,
        `$${omegaTex(1, j + 2)}$`,
      ]),
      explanation: tex`Multiply by $\omega^{${next}} = (\omega^3)^{${next / 3}} = 1$: $\omega^{-${n}} = \omega^{-${n}} \cdot \omega^{${next}} = \omega^{${j}} = ${omegaTex(1, j)}$.`,
    };
  }),

  b.dynamic(
    'omega-expressions',
    { difficulty: 3, origin: 'past-paper', tags: ['cube roots of unity'] },
    (r) => {
      const kind = r.weighted(['sum', 'power', 'pairs'] as const, [1, 1.2, 1]);

      if (kind === 'sum') {
        const n = r.int(2, 9);
        const lead = (-2) ** n;
        const factor = n % 3 === 0 ? 2 : -1;
        const value = lead * factor;
        const wrongFactor = n % 3 === 0 ? -1 : 2;
        const { answer, distractors } = intOptions(r, value, [
          -value,
          lead * wrongFactor, // mis-evaluated ω^n + ω^2n
          -lead * wrongFactor,
          2 ** n,
          lead,
        ]);
        const inner =
          n % 3 === 0
            ? tex`\omega^{${n}} + \omega^{${2 * n}} = 1 + 1 = 2`
            : tex`\omega^{${n}} + \omega^{${2 * n}} = \omega + \omega^2 = -1`;
        return {
          stem: tex`${OMEGA_INTRO} $(1 - \omega + \omega^2)^{${n}} + (1 + \omega - \omega^2)^{${n}}$ equals:`,
          answer,
          distractors,
          explanation: tex`Since $1 + \omega + \omega^2 = 0$: $1 - \omega + \omega^2 = -2\omega$ and $1 + \omega - \omega^2 = -2\omega^2$. So the expression is $(-2)^{${n}}\left(\omega^{${n}} + \omega^{${2 * n}}\right)$, and $${inner}$. The value is $${lead} \times ${pf(factor)} = ${value}$.`,
        };
      }

      if (kind === 'power') {
        const base = r.pick([
          { t: tex`1 + \omega - \omega^2`, c: -2, j: 2, why: tex`(1 + \omega + \omega^2) - 2\omega^2` },
          { t: tex`1 - \omega + \omega^2`, c: -2, j: 1, why: tex`(1 + \omega + \omega^2) - 2\omega` },
          { t: tex`1 + \omega`, c: -1, j: 2, why: tex`(1 + \omega + \omega^2) - \omega^2` },
          { t: tex`1 + \omega^2`, c: -1, j: 1, why: tex`(1 + \omega + \omega^2) - \omega` },
        ]);
        const n = base.c === -2 ? r.int(3, 8) : r.int(4, 25);
        const k = base.c ** n;
        const jj = (base.j * n) % 3;
        const answer = `$${omegaTex(k, jj)}$`;
        const candidates: Array<[number, number]> = [
          [-k, jj], // sign of (-2)^n or (-1)^n
          [k, 3 - jj], // confused ω with ω²
          [-k, 3 - jj],
          [k, jj + 1],
          [k, jj + 2],
          [-k, jj + 1],
        ];
        return {
          stem: tex`${OMEGA_INTRO} $(${base.t})^{${n}}$ equals:`,
          answer,
          distractors: pickDistractors(
            answer,
            candidates.map(([kk, e]) => `$${omegaTex(kk, e)}$`),
          ),
          explanation: tex`$${base.t} = ${base.why} = ${omegaTex(base.c, base.j)}$. Hence $(${base.t})^{${n}} = (${base.c})^{${n}}\,\omega^{${base.j * n}} = ${omegaTex(k, jj)}$, since $\omega^3 = 1$.`,
        };
      }

      // products of complementary pairs (1 ∓ ω^a)(1 ∓ ω^b) with a ≡ 1, b ≡ 2 (mod 3)
      const pairs = r.int(1, 3);
      const plus = r.chance(0.35);
      const exps = [...r.sample([1, 4, 7, 10, 13], pairs), ...r.sample([2, 5, 8, 11, 14], pairs)].sort(
        (x, y) => x - y,
      );
      const op = plus ? '+' : '-';
      const product = exps.map((e) => `(1 ${op} ${e === 1 ? '\\omega' : `\\omega^{${e}}`})`).join('');
      const value = plus ? 1 : 3 ** pairs;
      const { answer, distractors } = intOptions(
        r,
        value,
        plus ? [0, -1, 2 ** pairs, 3 ** pairs] : [1, 0, -(3 ** pairs), 2 ** pairs, 3 * pairs],
      );
      const count = ['one such pair', 'two such pairs', 'three such pairs'][pairs - 1];
      return {
        stem: tex`${OMEGA_INTRO} $${product}$ equals:`,
        answer,
        distractors,
        explanation: plus
          ? tex`Reducing the exponents with $\omega^3 = 1$, the factors pair up as $(1 + \omega)(1 + \omega^2) = 1 + \omega + \omega^2 + \omega^3 = 0 + 1 = 1$. There ${pairs === 1 ? 'is' : 'are'} ${count}, so the product is $1$.`
          : tex`Reducing the exponents with $\omega^3 = 1$, the factors pair up as $(1 - \omega)(1 - \omega^2) = 1 - (\omega + \omega^2) + \omega^3 = 1 + 1 + 1 = 3$. There ${pairs === 1 ? 'is' : 'are'} ${count}, so the product is $3^{${pairs}} = ${value}$.`,
      };
    },
  ),

  // ------------------------------------------- equations reducible to quadratic
  b.dynamic('reducible-equations', { difficulty: 2, tags: ['equations reducible to quadratic'] }, (r) => {
    const kind = r.weighted(
      ['biquadratic', 'biquadratic-real', 'exponential', 'cube-root', 'reciprocal'] as const,
      [1.2, 0.8, 1.2, 1, 0.8],
    );

    if (kind === 'biquadratic') {
      const [p, q] = r.sample([1, 2, 3, 4, 5, 6], 2).sort((x, y) => x - y) as [number, number];
      const eq = polyTex([1, 0, -(p * p + q * q), 0, p * p * q * q]);
      const answer = setText([-q, -p, p, q]);
      return {
        stem: tex`The solution set of $${eq} = 0$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          setText([p * p, q * q]), // stopped at the values of x^2
          setText([p, q]), // dropped the negative roots
          setText([-q * q, -p * p, p * p, q * q]),
        ]),
        explanation: tex`Put $y = x^2$: $y^2 - ${p * p + q * q}y + ${p * p * q * q} = 0 \Rightarrow (y - ${p * p})(y - ${q * q}) = 0$. So $x^2 = ${p * p}$ or $x^2 = ${q * q}$, giving $x = \pm ${p}$ or $x = \pm ${q}$.`,
      };
    }

    if (kind === 'biquadratic-real') {
      const [p, q] = r.sample([1, 2, 3, 4, 5], 2) as [number, number];
      const eq = polyTex([1, 0, q * q - p * p, 0, -p * p * q * q]);
      const answer = setText([-p, p]);
      return {
        stem: tex`The set of all real solutions of $${eq} = 0$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          setText([-q, -p, p, q]), // did not reject x^2 = -q^2
          setText([-q * q, p * p]), // stopped at the values of x^2
          setText([p]), // dropped the negative root
        ]),
        explanation: tex`Put $y = x^2$: $y^2${signed(q * q - p * p)}y - ${p * p * q * q} = 0 \Rightarrow (y - ${p * p})(y + ${q * q}) = 0$. So $x^2 = ${p * p}$ or $x^2 = -${q * q}$. The second has no real solution, hence $x = \pm ${p}$.`,
      };
    }

    if (kind === 'exponential') {
      const base = r.pick([2, 3]);
      const [m, n] = r.sample(base === 2 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3], 2).sort((x, y) => x - y) as [
        number,
        number,
      ];
      const y1 = base ** m;
      const y2 = base ** n;
      const lhs = r.chance(0.5) ? `${base * base}^{x}` : `${base}^{2x}`;
      const answer = setText([m, n]);
      return {
        stem: tex`The solution set of $${lhs} - ${y1 + y2} \cdot ${base}^{x} + ${y1 * y2} = 0$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          setText([y1, y2]), // stopped at the values of base^x
          setText([-m, -n]),
          setText([n]), // lost the smaller root
          setText([m + 1, n + 1]),
        ]),
        explanation: tex`Put $y = ${base}^{x}$, so $${lhs} = y^2$: $y^2 - ${y1 + y2}y + ${y1 * y2} = 0 \Rightarrow (y - ${y1})(y - ${y2}) = 0$. Then $${base}^{x} = ${y1} = ${base}^{${m}}$ or $${base}^{x} = ${y2} = ${base}^{${n}}$, so $x = ${m}$ or $x = ${n}$.`,
      };
    }

    if (kind === 'reciprocal') {
      // x ± 1/x = t ± 1/t with t = p/q has roots t and ±1/t.
      const [p, q] = r.pick([[2, 1], [3, 1], [4, 1], [5, 1], [3, 2], [5, 2], [4, 3], [5, 3], [5, 4]] as const);
      const minus = r.chance(0.4);
      const t = frac(p, q);
      const other = minus ? t.inv().neg() : t.inv();
      const rhs = minus ? t.sub(t.inv()) : t.add(t.inv());
      const answer = setText([t, other]);
      return {
        stem: tex`The solution set of $x ${minus ? '-' : '+'} \frac{1}{x} = ${ft(rhs)}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          setText([t.neg(), other.neg()]), // sign slip when factorising
          setText([t]), // lost the second root
          setText([t, other.neg()]), // answer of the equation with the other sign
        ]),
        explanation: tex`Multiply both sides by $${p * q}x$: $${polyTex([p * q, -(minus ? p * p - q * q : p * p + q * q), minus ? -p * q : p * q])} = 0 \Rightarrow (${polyTex([p, minus ? q : -q])})(${polyTex([q, -p])}) = 0$, so $x = ${ft(other)}$ or $x = ${ft(t)}$.`,
      };
    }

    // x^{2/3} + Bx^{1/3} + C = 0
    const { y1, y2 } = draw(() => {
      const y1 = r.nonZero(-4, 4);
      const y2 = r.nonZero(-4, 4);
      return Math.abs(y1) !== Math.abs(y2) ? { y1, y2 } : null;
    });
    const B = -(y1 + y2);
    const C = y1 * y2;
    const answer = setText([y1 ** 3, y2 ** 3]);
    return {
      stem: tex`The solution set of $${signedSum([[1, 'x^{2/3}'], [B, 'x^{1/3}'], [C, '']])} = 0$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        setText([y1, y2]), // forgot to cube
        setText([-(y1 ** 3), -(y2 ** 3)]),
        setText([y1 * y1, y2 * y2]), // squared instead of cubing
      ]),
      explanation: tex`Put $y = x^{1/3}$: $${signedSum([[1, 'y^2'], [B, 'y'], [C, '']])} = 0 \Rightarrow (y${signed(-y1)})(y${signed(-y2)}) = 0$, so $y = ${y1}$ or $y = ${y2}$. Cubing, $x = ${y1 ** 3}$ or $x = ${y2 ** 3}$.`,
    };
  }),

  b.dynamic('radical-equation', { difficulty: 3, tags: ['equations reducible to quadratic'] }, (r) => {
    // sqrt(px + q) = x + h squares to (x - s)(x - t) = 0; a root is valid only if x + h >= 0.
    const bothValid = r.chance(0.3);
    const { h, s, t, p, q } = draw(() => {
      const h = r.int(-2, 4);
      const s = r.int(-6, 8);
      const t = r.int(-6, 8);
      const p = s + t + 2 * h;
      const q = h * h - s * t;
      if (s === t || p === 0 || Math.abs(p) > 12 || Math.abs(q) > 40) return null;
      const okS = s + h >= 0;
      const okT = t + h >= 0;
      return (bothValid ? okS && okT : okS && !okT) ? { h, s, t, p, q } : null;
    });
    const radicand = polyTex([p, q]);
    const rhs = polyTex([1, h]);
    const answer = bothValid ? setText([s, t]) : setText([s]);
    const linFactor = (v: number): string => (v === 0 ? 'x' : `(${polyTex([1, -v])})`);
    const check = (x: number): string => {
      const valid = x + h >= 0;
      return tex`for $x = ${x}$, $\sqrt{${p * x + q}} = ${Math.abs(x + h)}$ while $${rhs} = ${x + h}$${valid ? ' (valid)' : ', so it is extraneous'}`;
    };
    return {
      stem: tex`The solution set of $\sqrt{${radicand}} = ${rhs}$ is:`,
      answer,
      distractors: pickDistractors(
        answer,
        bothValid
          ? [setText([s]), setText([t]), tex`$\varnothing$`]
          : [setText([s, t]), setText([t]), tex`$\varnothing$`],
      ),
      explanation: tex`Squaring: $${radicand} = ${h === 0 ? 'x^2' : `(${rhs})^2`} \Rightarrow ${polyTex([1, -(s + t), s * t])} = 0 \Rightarrow ${linFactor(s)}${linFactor(t)} = 0$, so $x = ${s}$ or $x = ${t}$. Check each in the original equation: ${check(s)}; ${check(t)}. Hence the solution set is ${answer}.`,
    };
  }),

  // ------------------------------------------------ remainder and factor theorem
  b.dynamic(
    'remainder-theorem',
    { difficulty: 1, origin: 'past-paper', tags: ['remainder and factor theorem'] },
    (r) => {
      const quartic = r.chance(0.3);
      const coeffs = quartic
        ? [1, r.int(-3, 3), r.int(-4, 4), r.int(-5, 5), r.nonZero(-9, 9)]
        : [r.pick([1, 1, 2, 3]), r.int(-6, 6), r.int(-7, 7), r.nonZero(-9, 9)];
      const a = quartic ? r.nonZero(-2, 2) : r.nonZero(-3, 3);
      const R = polyEval(coeffs, a);
      const c0 = coeffs[coeffs.length - 1] as number;
      const { answer, distractors } = intOptions(r, R, [
        polyEval(coeffs, -a), // substituted the wrong sign
        -R,
        R - c0, // dropped the constant term
      ]);
      return {
        stem: tex`The remainder when $${polyTex(coeffs)}$ is divided by $${polyTex([1, -a])}$ is:`,
        answer,
        distractors,
        explanation: tex`By the remainder theorem the remainder is $P(${a})$, where $P(x) = ${polyTex(coeffs)}$: $P(${a}) = ${substTex(coeffs, a)} = ${R}$.`,
      };
    },
  ),

  b.dynamic('factor-theorem', { difficulty: 2, tags: ['remainder and factor theorem'] }, (r) => {
    if (r.chance(0.6)) {
      // Find k so that x - a is a factor (or leaves a given remainder).
      const a = r.pick([-3, -2, -1, 1, 2, 3]);
      const kPow = r.pick([2, 1, 0]);
      const remainder = r.chance(0.3) ? r.nonZero(-9, 9) : 0;
      const lead = r.pick([1, 1, 2]);
      const { coeffs, K } = draw(() => {
        const coeffs = [lead, r.int(-6, 6), r.int(-8, 8), 0];
        if (kPow === 0) {
          const K = remainder - polyEval(coeffs, a);
          coeffs[3] = K;
          return K !== 0 && Math.abs(K) <= 60 ? { coeffs, K } : null;
        }
        const K = r.nonZero(-8, 8);
        coeffs[3 - kPow] = K;
        const c0 = remainder - polyEval(coeffs, a);
        coeffs[3] = c0;
        return c0 !== 0 && Math.abs(c0) <= 60 ? { coeffs, K } : null;
      });
      const rest = (x: number): number => polyEval(coeffs, x) - K * x ** kPow;
      const wrong = [
        frac(-K), // sign slip in the last step
        frac(remainder - rest(-a), (-a) ** kPow), // substituted x = -a
      ];
      if (kPow > 0) wrong.push(frac(K * a ** kPow)); // forgot to divide by the coefficient of k
      if (remainder !== 0) wrong.push(frac(-rest(a), a ** kPow)); // treated it as a factor
      const { answer, distractors } = fracOptions(frac(K), wrong);
      const poly = polyWithK(coeffs, kPow);
      const divisor = polyTex([1, -a]);
      const withK = coeffs.map((c, i) => (i === 3 - kPow ? ('k' as const) : c));
      return {
        stem:
          remainder === 0
            ? tex`If $${divisor}$ is a factor of $${poly}$, then $k$ equals:`
            : tex`If $${poly}$ leaves a remainder of $${remainder}$ when divided by $${divisor}$, then $k$ equals:`,
        answer,
        distractors,
        explanation: tex`By the ${remainder === 0 ? 'factor' : 'remainder'} theorem, $P(${a}) = ${remainder}$: $${substTex(withK, a)} = ${remainder}$, i.e. $${signedSum([[a ** kPow, 'k'], [rest(a), '']])} = ${remainder}$, so $k = ${K}$.`,
      };
    }

    // Given one root of a cubic, find the other two (synthetic division).
    const { r1, r2, r3 } = draw(() => {
      const r1 = r.nonZero(-4, 4);
      const r2 = r.nonZero(-5, 5);
      const r3 = r.nonZero(-5, 5);
      // |r2|, |r3| != |r1| so that no distractor pair contains the given root (e.g. 3 and -3).
      const distinct = new Set([Math.abs(r1), Math.abs(r2), Math.abs(r3)]).size === 3;
      return distinct ? { r1, r2, r3 } : null;
    });
    const cubic = polyTex([1, -(r1 + r2 + r3), r1 * r2 + r1 * r3 + r2 * r3, -r1 * r2 * r3]);
    const quotient = polyTex([1, -(r2 + r3), r2 * r3]);
    const answer = pairText(r2, r3);
    return {
      stem: tex`If $x = ${r1}$ is a root of $${cubic} = 0$, then the other two roots are:`,
      answer,
      distractors: pickDistractors(answer, [
        pairText(-r2, -r3), // sign slip when factorising the quotient
        pairText(-r2, r3),
        pairText(r2, -r3),
      ]),
      explanation: tex`Dividing by $${polyTex([1, -r1])}$ (synthetic division with $${r1}$) leaves remainder $0$ and quotient $${quotient}$. Then $${quotient} = (${polyTex([1, -r2])})(${polyTex([1, -r3])}) = 0$ gives $x = ${r2}$ or $x = ${r3}$.`,
    };
  }),

  // ------------------------------------------------------- fixed questions
  ...b.mcqs([
    {
      id: 'complex-cube-roots-of-unity',
      d: 1,
      t: ['cube roots of unity'],
      q: 'The two complex (non-real) cube roots of unity are:',
      a: tex`$\frac{-1 \pm \sqrt{3}\,i}{2}$`,
      x: [tex`$\frac{1 \pm \sqrt{3}\,i}{2}$`, tex`$-1 \pm \sqrt{3}\,i$`, tex`$\frac{-\sqrt{3} \pm i}{2}$`],
      e: tex`$x^3 - 1 = (x - 1)(x^2 + x + 1) = 0$. The quadratic factor gives $x = \frac{-1 \pm \sqrt{1 - 4}}{2} = \frac{-1 \pm \sqrt{3}\,i}{2}$; these are $\omega$ and $\omega^2$.`,
    },
    {
      id: 'omega-cyclic-quotient',
      d: 2,
      t: ['cube roots of unity'],
      q: tex`If $\omega$ is a complex cube root of unity and $a$, $b$, $c$ are real numbers, not all equal, then $\dfrac{a + b\omega + c\omega^2}{c + a\omega + b\omega^2}$ equals:`,
      a: tex`$\omega^2$`,
      x: [tex`$\omega$`, '$1$', tex`$-\omega^2$`],
      e: tex`$\omega^2(c + a\omega + b\omega^2) = c\omega^2 + a\omega^3 + b\omega^4 = a + b\omega + c\omega^2$, because $\omega^3 = 1$ and $\omega^4 = \omega$. So the quotient is $\omega^2$.`,
    },
    {
      id: 'fourth-roots-of-unity-product',
      d: 1,
      t: ['cube roots of unity'],
      q: 'The product of the four fourth roots of unity is:',
      a: '$-1$',
      x: ['$1$', '$0$', '$i$'],
      e: tex`The fourth roots of unity are $1, -1, i, -i$. Their product is $(1)(-1)(i)(-i) = (-1)(-i^2) = (-1)(1) = -1$. (It is their sum that equals $0$.)`,
    },
    {
      id: 'reciprocal-roots-condition',
      d: 1,
      o: 'past-paper',
      t: ['sum and product of roots', 'nature of roots'],
      q: tex`The roots of $ax^2 + bx + c = 0$ $(a \neq 0)$ are reciprocals of each other if:`,
      a: '$c = a$',
      x: ['$b = 0$', '$c = 0$', '$a + c = 0$'],
      e: tex`If the roots are $\alpha$ and $\frac{1}{\alpha}$, their product is $1$. The product of the roots is $\frac{c}{a}$, so $\frac{c}{a} = 1$, i.e. $c = a$. ($b = 0$ makes the roots negatives of each other, $c = 0$ makes one root zero, and $a + c = 0$ makes the product $-1$.)`,
    },
    {
      id: 'roots-always-real',
      d: 3,
      t: ['nature of roots'],
      q: tex`For all real values of $a$, $b$ and $k$, the roots of $(x - a)(x - b) = k^2$ are always:`,
      a: 'real',
      x: ['real and unequal', 'rational', 'imaginary'],
      e: tex`The equation is $x^2 - (a + b)x + ab - k^2 = 0$, with discriminant $(a + b)^2 - 4(ab - k^2) = (a - b)^2 + 4k^2 \geq 0$. So the roots are always real. They are equal when $a = b$ and $k = 0$, and $a = 1$, $b = 0$, $k = 1$ gives $x^2 - x - 1 = 0$ with irrational roots.`,
    },
    {
      id: 'factor-of-xn-plus-an',
      d: 2,
      t: ['remainder and factor theorem'],
      q: tex`If $a \neq 0$, then $x + a$ is a factor of $x^n + a^n$ when $n$ is:`,
      a: 'an odd positive integer',
      x: ['an even positive integer', 'any positive integer', 'a multiple of 4'],
      e: tex`By the factor theorem, $x + a$ is a factor of $P(x) = x^n + a^n$ exactly when $P(-a) = (-a)^n + a^n = 0$, i.e. when $(-1)^n = -1$. This happens precisely when $n$ is odd.`,
    },
    {
      id: 'coefficients-sum-zero',
      d: 2,
      t: ['roots and discriminant', 'sum and product of roots'],
      q: tex`If $a + b + c = 0$ and $a \neq 0$, then the roots of $ax^2 + bx + c = 0$ are:`,
      a: tex`$1$ and $\frac{c}{a}$`,
      x: [tex`$-1$ and $\frac{c}{a}$`, tex`$1$ and $-\frac{b}{a}$`, tex`$-1$ and $-\frac{b}{a}$`],
      e: tex`Putting $x = 1$ gives $a + b + c = 0$, so $1$ is a root. The product of the roots is $\frac{c}{a}$, so the other root is $\frac{c}{a}$. (Note $-\frac{b}{a} = 1 + \frac{c}{a}$ is the sum of the roots, not a root.)`,
    },
  ]),
]);
