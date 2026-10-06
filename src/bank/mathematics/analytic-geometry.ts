import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  Fraction,
  gcd,
  linearFactor,
  normalizeOption,
  paren,
  pickDistractors,
  signed,
  signedSum,
  simplifySurd,
  surdTex,
  tex,
} from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// Part A of Introduction to Analytic Geometry: computational / parametric items.
// Conceptual and fixed past-paper-style items live in analytic-geometry.concepts.ts.

type Num = number | Fraction;

/** LaTeX of a number or fraction. */
const ft = (v: Num): string => Fraction.of(v).toTex();
/** A point as LaTeX: (x, y). */
const pt = (x: Num, y: Num): string => `(${ft(x)}, ${ft(y)})`;
/** A point as an option string. */
const ptOpt = (x: Num, y: Num): string => `$${pt(x, y)}$`;
/** A number/fraction as an option string. */
const fOpt = (v: Num): string => `$${ft(v)}$`;
const F = (n: number, d = 1): Fraction => new Fraction(n, d);

/** Divides ax + by + c = 0 by the gcd of its coefficients and makes the leading coefficient positive. */
function normLine(a: number, b: number, c: number): [number, number, number] {
  const g = gcd(gcd(Math.abs(a), Math.abs(b)), Math.abs(c)) || 1;
  const s = a < 0 || (a === 0 && b < 0) ? -1 : 1;
  return [(s * a) / g + 0, (s * b) / g + 0, (s * c) / g + 0];
}

/** `ax + by + c = 0` (normalised) as LaTeX without `$`. */
function lineEq(a: number, b: number, c: number): string {
  const [p, q, r] = normLine(a, b, c);
  return `${signedSum([
    [p, 'x'],
    [q, 'y'],
    [r, ''],
  ])} = 0`;
}

/** `ax + by = c` with the leading coefficient made positive and common factors removed. */
function lineEqRhs(a: number, b: number, c: number): string {
  const [p, q, r] = normLine(a, b, -c);
  return `${signedSum([
    [p, 'x'],
    [q, 'y'],
  ])} = ${-r + 0}`;
}

/** LaTeX for (c * sqrt(rad)) / den, simplified (rad > 0, den > 0). */
function surdFrac(c: number, rad: number, den: number): string {
  const { c: c1, r: r1 } = simplifySurd(c, rad);
  const g = gcd(Math.abs(c1), den) || 1;
  const top = surdTex(c1 / g, r1);
  const bottom = den / g;
  return bottom === 1 ? top : `\\frac{${top}}{${bottom}}`;
}

/** Number of visibly distinct strings (after option normalisation). */
function distinctCount(items: readonly string[]): number {
  return new Set(items.map(normalizeOption)).size;
}

/** Repeats `make` until `ok` holds (bounded; the last draw is returned if none passes). */
function draw<T>(r: Rng, make: (r: Rng) => T, ok: (v: T) => boolean): T {
  let v = make(r);
  for (let i = 0; i < 200 && !ok(v); i++) v = make(r);
  return v;
}

const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 6, 10],
  [9, 12, 15],
  [12, 5, 13],
  [4, 3, 5],
];

/** Primitive triples for line coefficients (a, b, sqrt(a^2 + b^2)). */
const COEF_TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
];

export default defineBank('mathematics', 'analytic-geometry', (b) => [
  // ---------------------------------------------------------------- distance and section formula
  b.dynamic('distance-two-points', { difficulty: 1, origin: 'past-paper', tags: ['distance and section formula'] }, (r) => {
    const [p, q, h] = r.pick(TRIPLES);
    const dx = p * r.sign();
    const dy = q * r.sign();
    const x1 = r.int(-6, 6);
    const y1 = r.int(-6, 6);
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const sumSq = (x1 + x2) ** 2 + (y1 + y2) ** 2;
    const answer = `$${h}$`;
    const distractors = pickDistractors(answer, [
      `$${p + q}$`, // added the differences instead of using Pythagoras
      `$${h * h}$`, // forgot the square root
      ...(sumSq > 0 ? [`$${surdTex(1, sumSq)}$`] : []), // added coordinates instead of subtracting
      `$${surdTex(1, Math.abs(p * p - q * q))}$`, // subtracted the squares
    ]);
    return {
      stem: tex`The distance between the points $A${pt(x1, y1)}$ and $B${pt(x2, y2)}$ is:`,
      answer,
      distractors,
      explanation: tex`$|AB| = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} = \sqrt{(${x2} - ${paren(x1)})^2 + (${y2} - ${paren(y1)})^2} = \sqrt{(${dx})^2 + (${dy})^2} = \sqrt{${h * h}} = ${h}$.`,
    };
  }),

  b.dynamic('midpoint-other-end', { difficulty: 1, tags: ['distance and section formula'] }, (r) => {
    const [x1, y1, mx, my] = draw(
      r,
      (g) => [g.int(-8, 8), g.int(-8, 8), g.int(-6, 6), g.int(-6, 6)] as const,
      ([a, c, m, n]) => a !== m && c !== n,
    );
    const bx = 2 * mx - x1;
    const by = 2 * my - y1;
    const answer = ptOpt(bx, by);
    const distractors = pickDistractors(answer, [
      ptOpt(F(x1 + mx, 2), F(y1 + my, 2)), // averaged the two given points
      ptOpt(2 * x1 - mx, 2 * y1 - my), // swapped the roles of A and M
      ptOpt(mx - x1, my - y1), // just subtracted
      ptOpt(mx + x1, my + y1),
    ]);
    return {
      stem: tex`The point $M${pt(mx, my)}$ is the midpoint of the segment $AB$. If $A$ is the point $${pt(x1, y1)}$, then $B$ is:`,
      answer,
      distractors,
      explanation: tex`From $M = \left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)$: $x_2 = 2(${mx}) - ${paren(x1)} = ${bx}$ and $y_2 = 2(${my}) - ${paren(y1)} = ${by}$, so $B = ${pt(bx, by)}$.`,
    };
  }),

  b.dynamic('centroid-of-triangle', { difficulty: 1, tags: ['distance and section formula'] }, (r) => {
    const [gx, gy, ax, ay, bx, by] = draw(
      r,
      (g) => [g.nonZero(-4, 4), g.nonZero(-4, 4), g.int(-7, 7), g.int(-7, 7), g.int(-7, 7), g.int(-7, 7)] as const,
      ([gx0, gy0, ax0, ay0, bx0, by0]) => {
        const cx0 = 3 * gx0 - ax0 - bx0;
        const cy0 = 3 * gy0 - ay0 - by0;
        const area2 = (bx0 - ax0) * (cy0 - ay0) - (by0 - ay0) * (cx0 - ax0);
        return area2 !== 0 && Math.abs(cx0) <= 12 && Math.abs(cy0) <= 12;
      },
    );
    const cx = 3 * gx - ax - bx;
    const cy = 3 * gy - ay - by;
    const sx = 3 * gx;
    const sy = 3 * gy;
    const answer = ptOpt(gx, gy);
    const distractors = pickDistractors(answer, [
      ptOpt(F(sx, 2), F(sy, 2)), // divided by 2 as for a midpoint
      ptOpt(sx, sy), // forgot to divide by 3
      ptOpt(F(ax + bx, 2), F(ay + by, 2)), // midpoint of one side only
      ptOpt(-gx, -gy),
    ]);
    return {
      stem: tex`The centroid of the triangle with vertices $A${pt(ax, ay)}$, $B${pt(bx, by)}$ and $C${pt(cx, cy)}$ is:`,
      answer,
      distractors,
      explanation: tex`$G = \left(\frac{x_1 + x_2 + x_3}{3}, \frac{y_1 + y_2 + y_3}{3}\right) = \left(\frac{${ax} + ${paren(bx)} + ${paren(cx)}}{3}, \frac{${ay} + ${paren(by)} + ${paren(cy)}}{3}\right) = \left(\frac{${sx}}{3}, \frac{${sy}}{3}\right) = ${pt(gx, gy)}$.`,
    };
  }),

  b.dynamic('section-formula-internal', { difficulty: 2, tags: ['distance and section formula'] }, (r) => {
    const [m, n] = r.pick([
      [1, 2],
      [2, 1],
      [1, 3],
      [3, 1],
      [2, 3],
      [3, 2],
      [1, 4],
      [4, 1],
    ] as const);
    const s = m + n;
    const x1 = r.int(-6, 6);
    const y1 = r.int(-6, 6);
    const u = r.nonZero(-2, 2);
    const v = r.nonZero(-2, 2);
    const x2 = x1 + s * u;
    const y2 = y1 + s * v;
    const px = x1 + m * u;
    const py = y1 + m * v;
    const answer = ptOpt(px, py);
    const distractors = pickDistractors(answer, [
      ptOpt(x1 + n * u, y1 + n * v), // ratio applied the wrong way round
      ptOpt(F(x1 + x2, 2), F(y1 + y2, 2)), // took the midpoint
      ptOpt(F(m * x2 - n * x1, m - n), F(m * y2 - n * y1, m - n)), // external division
    ]);
    return {
      stem: tex`The point that divides the join of $A${pt(x1, y1)}$ and $B${pt(x2, y2)}$ internally in the ratio $${m} : ${n}$ is:`,
      answer,
      distractors,
      explanation: tex`$P = \left(\frac{m x_2 + n x_1}{m + n}, \frac{m y_2 + n y_1}{m + n}\right) = \left(\frac{${m}(${x2}) + ${n}(${x1})}{${s}}, \frac{${m}(${y2}) + ${n}(${y1})}{${s}}\right) = \left(\frac{${s * px}}{${s}}, \frac{${s * py}}{${s}}\right) = ${pt(px, py)}$.`,
    };
  }),

  // ---------------------------------------------------------------- slope
  b.dynamic('slope-through-points', { difficulty: 1, tags: ['slope'] }, (r) => {
    const [x1, y1, dx, dy] = draw(
      r,
      (g) => [g.int(-7, 7), g.int(-7, 7), g.nonZero(-8, 8), g.nonZero(-8, 8)] as const,
      ([, , ddx, ddy]) => Math.abs(ddx) !== Math.abs(ddy),
    );
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const slope = F(dy, dx);
    const answer = fOpt(slope);
    const distractors = pickDistractors(answer, [
      fOpt(F(dx, dy)), // run over rise
      fOpt(slope.neg()), // sign slip
      fOpt(F(-dx, dy)), // perpendicular slope
      ...(x1 + x2 !== 0 && y1 + y2 !== 0 ? [fOpt(F(y1 + y2, x1 + x2))] : []),
    ]);
    return {
      stem: tex`The slope of the line through $A${pt(x1, y1)}$ and $B${pt(x2, y2)}$ is:`,
      answer,
      distractors,
      explanation: tex`$m = \frac{y_2 - y_1}{x_2 - x_1} = \frac{${y2} - ${paren(y1)}}{${x2} - ${paren(x1)}} = \frac{${dy}}{${dx}}${dx > 1 && gcd(Math.abs(dy), dx) === 1 ? '' : ` = ${slope.toTex()}`}$.`,
    };
  }),

  // ---------------------------------------------------------------- equations of lines
  b.dynamic('intersection-of-lines', { difficulty: 1, tags: ['equations of lines'] }, (r) => {
    const [p, q, a1, b1, a2, b2] = draw(
      r,
      (g) => [g.nonZero(-5, 5), g.nonZero(-5, 5), g.int(1, 4), g.nonZero(-4, 4), g.int(1, 4), g.nonZero(-4, 4)] as const,
      ([pp, qq, A1, B1, A2, B2]) => pp !== qq && A1 * B2 - A2 * B1 !== 0,
    );
    const [A1, B1, n1] = normLine(a1, b1, -(a1 * p + b1 * q));
    const [A2, B2, n2] = normLine(a2, b2, -(a2 * p + b2 * q));
    const C1 = -n1;
    const C2 = -n2;
    const det = A1 * B2 - A2 * B1;
    const answer = ptOpt(p, q);
    const distractors = pickDistractors(answer, [ptOpt(q, p), ptOpt(-p, -q), ptOpt(p, -q), ptOpt(-p, q)]);
    return {
      stem: tex`The lines $${lineEqRhs(A1, B1, C1)}$ and $${lineEqRhs(A2, B2, C2)}$ intersect at the point:`,
      answer,
      distractors,
      explanation: tex`Solving simultaneously (Cramer's rule with $a_1 = ${A1}, b_1 = ${B1}, c_1 = ${C1}$ and $a_2 = ${A2}, b_2 = ${B2}, c_2 = ${C2}$): $x = \frac{c_1 b_2 - c_2 b_1}{a_1 b_2 - a_2 b_1} = \frac{${C1 * B2 - C2 * B1}}{${det}} = ${p}$, $y = \frac{a_1 c_2 - a_2 c_1}{a_1 b_2 - a_2 b_1} = \frac{${A1 * C2 - A2 * C1}}{${det}} = ${q}$. Check: both equations hold at $${pt(p, q)}$.`,
    };
  }),

  b.dynamic('line-through-two-points', { difficulty: 2, tags: ['equations of lines', 'slope'] }, (r) => {
    const [x1, y1, dx, dy] = draw(
      r,
      (g) => [g.int(-6, 6), g.int(-6, 6), g.nonZero(-5, 5), g.nonZero(-5, 5)] as const,
      ([, , ddx, ddy]) => Math.abs(ddx) !== Math.abs(ddy),
    );
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const c = dx * y1 - dy * x1;
    const answer = `$${lineEq(dy, -dx, c)}$`;
    const distractors = pickDistractors(answer, [
      `$${lineEq(dx, -dy, dy * y1 - dx * x1)}$`, // slope taken as run/rise
      `$${lineEq(dy, dx, -(dy * x1 + dx * y1))}$`, // slope sign flipped
      `$${lineEq(dy, -dx, -c)}$`, // sign slip in the constant
      `$${lineEq(dy, -dx, c + dy)}$`,
    ]);
    const m = F(dy, dx);
    const sx = dx < 0 ? -1 : 1; // clear the fraction with a positive multiplier
    return {
      stem: tex`The equation of the line through $${pt(x1, y1)}$ and $${pt(x2, y2)}$ is:`,
      answer,
      distractors,
      explanation: tex`Slope $m = \frac{${y2} - ${paren(y1)}}{${x2} - ${paren(x1)}} = ${m.toTex()}$. Point-slope form: $${linearFactor(y1, 'y')} = ${m.toTex()}${linearFactor(x1, 'x')}$, i.e. $${coefTex(sx * dx, linearFactor(y1, 'y'))} = ${coefTex(sx * dy, linearFactor(x1, 'x'))}$, which simplifies to $${lineEq(dy, -dx, c)}$.`,
    };
  }),

  b.dynamic('perpendicular-through-point', { difficulty: 2, origin: 'past-paper', tags: ['equations of lines', 'slope'] }, (r) => {
    const [a, bb] = draw(
      r,
      (g) => [g.int(1, 5), g.nonZero(-5, 5)] as const,
      ([A, B]) => Math.abs(A) !== Math.abs(B) && gcd(A, Math.abs(B)) === 1,
    );
    const c = r.int(-9, 9);
    const x0 = r.int(-5, 5);
    const y0 = r.int(-5, 5);
    const k = a * y0 - bb * x0;
    // The same perpendicular family written with a positive x coefficient: Px + Qy + kk = 0.
    const [P, Q] = bb > 0 ? [bb, -a] : [-bb, a];
    const kk = -(P * x0 + Q * y0);
    const answer = `$${lineEq(bb, -a, k)}$`;
    const distractors = pickDistractors(answer, [
      `$${lineEq(a, bb, -(a * x0 + bb * y0))}$`, // parallel line through the point
      `$${lineEq(bb, a, -(bb * x0 + a * y0))}$`, // swapped coefficients without changing a sign
      `$${lineEq(bb, -a, -k)}$`, // sign slip in the constant
      `$${lineEq(bb, -a, k + 1)}$`,
    ]);
    return {
      stem: tex`The equation of the line through $${pt(x0, y0)}$ perpendicular to $${lineEq(a, bb, c)}$ is:`,
      answer,
      distractors,
      explanation: tex`The given line has slope $${F(-a, bb).toTex()}$, so a perpendicular line has slope $${F(bb, a).toTex()}$ and the form $${signedSum([
        [P, 'x'],
        [Q, 'y'],
      ])} + k = 0$. Through $${pt(x0, y0)}$: $${P}(${x0})${Q < 0 ? ' - ' : ' + '}${Math.abs(Q)}(${y0}) + k = 0 \Rightarrow k = ${kk}$. Hence $${lineEq(bb, -a, k)}$.`,
    };
  }),

  b.dynamic('triangle-with-axes-area', { difficulty: 2, tags: ['equations of lines'] }, (r) => {
    const [p, q] = draw(
      r,
      (g) => [g.nonZero(-8, 8), g.nonZero(-8, 8)] as const,
      ([pp, qq]) => Math.abs(pp * qq) > 1,
    );
    // x/p + y/q = 1  <=>  qx + py = pq
    const g0 = gcd(Math.abs(p), Math.abs(q));
    const s = q < 0 ? -1 : 1;
    const A = (s * q) / g0;
    const B = (s * p) / g0;
    const C = (s * p * q) / g0;
    const area = F(Math.abs(p * q), 2);
    const answer = fOpt(area);
    const distractors = pickDistractors(answer, [
      fOpt(Math.abs(p * q)), // forgot the 1/2
      fOpt(F(Math.abs(A * B), 2 * C * C)), // took intercepts as A/C and B/C
      fOpt(F(Math.abs(p * q), 4)),
      fOpt(F(Math.abs(C), 2)),
    ]);
    return {
      stem: tex`The area of the triangle formed by the line $${signedSum([
        [A, 'x'],
        [B, 'y'],
      ])} = ${C}$ and the coordinate axes is (in square units):`,
      answer,
      distractors,
      explanation: tex`The intercepts are $x = \frac{${C}}{${A}} = ${p}$ and $y = \frac{${C}}{${B}} = ${q}$. Area $= \frac{1}{2}\,|x\text{-intercept}| \cdot |y\text{-intercept}| = \frac{1}{2}(${Math.abs(p)})(${Math.abs(q)}) = ${area.toTex()}$.`,
    };
  }),

  // ---------------------------------------------------------------- angle between lines
  b.dynamic('angle-between-lines-tan', { difficulty: 2, origin: 'past-paper', tags: ['angle between lines', 'slope'] }, (r) => {
    const [a1, b1, a2, b2] = draw(
      r,
      (g) => [g.int(1, 5), g.nonZero(-5, 5), g.int(1, 5), g.nonZero(-5, 5)] as const,
      ([A1, B1, A2, B2]) =>
        gcd(A1, Math.abs(B1)) === 1 &&
        gcd(A2, Math.abs(B2)) === 1 &&
        A1 * B2 - A2 * B1 !== 0 &&
        A1 * A2 + B1 * B2 !== 0,
    );
    const c1 = r.int(-9, 9);
    const c2 = r.int(-9, 9);
    const m1 = F(-a1, b1);
    const m2 = F(-a2, b2);
    const cross = Math.abs(a2 * b1 - a1 * b2);
    const dot = Math.abs(a1 * a2 + b1 * b2);
    const tanT = F(cross, dot);
    const answer = fOpt(tanT);
    const alt = Math.abs(a1 * a2 - b1 * b2);
    const sumNum = Math.abs(a1 * b2 + a2 * b1);
    const distractors = pickDistractors(answer, [
      fOpt(F(dot, cross)), // inverted the formula
      ...(alt !== 0 ? [fOpt(F(cross, alt))] : []), // used 1 - m1 m2
      fOpt(F(cross, Math.abs(b1 * b2))), // |m1 - m2| only
      ...(sumNum !== 0 ? [fOpt(F(sumNum, dot))] : []), // used m1 + m2
      fOpt(F(cross + dot, dot)),
    ]);
    const diff = m1.sub(m2);
    const one = m1.mul(m2).add(1);
    return {
      stem: tex`The tangent of the acute angle between the lines $${lineEq(a1, b1, c1)}$ and $${lineEq(a2, b2, c2)}$ is:`,
      answer,
      distractors,
      explanation: tex`Slopes: $m_1 = ${m1.toTex()}$, $m_2 = ${m2.toTex()}$. $\tan\theta = \left|\frac{m_1 - m_2}{1 + m_1 m_2}\right| = \left|\frac{${diff.toTex()}}{${one.toTex()}}\right| = ${tanT.toTex()}$.`,
    };
  }),

  // ---------------------------------------------------------------- distance from a point to a line
  b.dynamic('point-line-distance', { difficulty: 1, origin: 'past-paper', tags: ['distance from a point to a line'] }, (r) => {
    const [a, b0, h] = r.pick(COEF_TRIPLES);
    const bb = b0 * r.sign();
    const [x0, y0, c] = draw(
      r,
      (g) => [g.int(-5, 5), g.int(-5, 5), g.nonZero(-20, 20)] as const,
      ([X, Y, C]) => a * X + bb * Y + C !== 0,
    );
    const N = Math.abs(a * x0 + bb * y0 + c);
    const slip = Math.abs(a * x0 + bb * y0 - c);
    const d = F(N, h);
    const answer = fOpt(d);
    const distractors = pickDistractors(answer, [
      fOpt(N), // forgot to divide by sqrt(a^2 + b^2)
      fOpt(F(N, h * h)), // divided by a^2 + b^2
      fOpt(F(N, a + Math.abs(bb))), // divided by |a| + |b|
      ...(slip !== 0 ? [fOpt(F(slip, h))] : []), // sign slip on c
    ]);
    const line = `${signedSum([
      [a, 'x'],
      [bb, 'y'],
      [c, ''],
    ])} = 0`;
    return {
      stem: tex`The perpendicular distance of the point $${pt(x0, y0)}$ from the line $${line}$ is:`,
      answer,
      distractors,
      explanation: tex`$d = \frac{|a x_0 + b y_0 + c|}{\sqrt{a^2 + b^2}} = \frac{|${a}(${x0}) + (${bb})(${y0})${signed(c)}|}{\sqrt{${a}^2 + (${bb})^2}} = \frac{${N}}{${h}}${d.isInteger() ? ` = ${d.toTex()}` : ''}$.`,
    };
  }),

  b.dynamic('parallel-lines-distance', { difficulty: 3, tags: ['distance from a point to a line'] }, (r) => {
    const [a, b0, h] = r.pick(COEF_TRIPLES.slice(0, 4));
    const bb = b0 * r.sign();
    const k = r.pick([2, 3, -2]);
    const options = (C1: number, C2: number): string[] => [
      fOpt(F(Math.abs(k * C1 - C2), Math.abs(k) * h)), // correct
      fOpt(F(Math.abs(C1 - C2), h)), // subtracted constants without making coefficients equal
      fOpt(F(Math.abs(k * C1 + C2), Math.abs(k) * h)), // sign slip
      fOpt(F(Math.abs(k * C1 - C2), h)), // scaled the first line by k but kept sqrt(a^2 + b^2) unscaled
    ];
    const [c1, c2] = draw(
      r,
      (g) => [g.nonZero(-12, 12), g.int(-20, 20)] as const,
      ([C1, C2]) => k * C1 - C2 !== 0 && C1 - C2 !== 0 && k * C1 + C2 !== 0 && distinctCount(options(C1, C2)) === 4,
    );
    const d = F(Math.abs(k * c1 - c2), Math.abs(k) * h);
    const [answer, ...distractors] = options(c1, c2) as [string, ...string[]];
    const L1 = `${signedSum([
      [a, 'x'],
      [bb, 'y'],
      [c1, ''],
    ])} = 0`;
    const L2 = `${signedSum([
      [k * a, 'x'],
      [k * bb, 'y'],
      [c2, ''],
    ])} = 0`;
    return {
      stem: tex`The distance between the parallel lines $${L1}$ and $${L2}$ is:`,
      answer,
      distractors,
      explanation: tex`Divide the second equation by $${k}$ so both have the same $x$ and $y$ coefficients: $${signedSum([
        [a, 'x'],
        [bb, 'y'],
        [F(c2, k), ''],
      ])} = 0$. Then $d = \frac{|c_1 - c_2|}{\sqrt{a^2 + b^2}} = \frac{\left|${c1} - \left(${F(c2, k).toTex()}\right)\right|}{${h}} = ${d.toTex()}$.`,
    };
  }),

  // ---------------------------------------------------------------- concurrency
  b.dynamic('concurrent-lines-k', { difficulty: 2, origin: 'past-paper', tags: ['concurrency'] }, (r) => {
    const v = draw(
      r,
      (g) => {
        const p = g.nonZero(-4, 4);
        const q = g.nonZero(-4, 4);
        const a1 = g.int(1, 4);
        const b1 = g.nonZero(-4, 4);
        const a2 = g.int(1, 4);
        const b2 = g.nonZero(-4, 4);
        const k = g.nonZero(-5, 5);
        const b3 = g.nonZero(-4, 4);
        return { p, q, a1, b1, a2, b2, k, b3, c3: -(k * p + b3 * q) };
      },
      ({ p, q, a1, b1, a2, b2, k, b3, c3 }) => {
        if (p === q || a1 * b2 - a2 * b1 === 0 || c3 === 0) return false;
        if (k * b1 === a1 * b3 || k * b2 === a2 * b3) return false;
        const cands = [ft(k), ft(-k), ft(F(-(b3 * p + c3), q)), ft(F(-(b3 * q - c3), p))];
        return distinctCount(cands) === 4;
      },
    );
    const { p, q, a1, b1, a2, b2, k, b3, c3 } = v;
    const c1 = -(a1 * p + b1 * q);
    const c2 = -(a2 * p + b2 * q);
    const answer = fOpt(k);
    const distractors = pickDistractors(answer, [
      fOpt(-k), // sign slip when isolating k
      fOpt(F(-(b3 * p + c3), q)), // substituted x and y the wrong way round
      fOpt(F(-(b3 * q - c3), p)), // sign slip on the constant
    ]);
    const L3 = `kx ${b3 < 0 ? '-' : '+'} ${coefTex(Math.abs(b3), 'y')}${signed(c3)} = 0`;
    return {
      stem: tex`The lines $${lineEq(a1, b1, c1)}$, $${lineEq(a2, b2, c2)}$ and $${L3}$ are concurrent. The value of $k$ is:`,
      answer,
      distractors,
      explanation: tex`The first two lines meet at $${pt(p, q)}$ (check: both equations are satisfied there). Concurrency means the third line passes through this point: $k(${p}) + (${b3})(${q})${signed(c3)} = 0${p === 1 ? '' : ` \\Rightarrow ${coefTex(p, 'k')} = ${-(b3 * q + c3)}`} \Rightarrow k = ${k}$.`,
    };
  }),

  // ---------------------------------------------------------------- pair of lines
  b.dynamic('pair-of-lines-angle', { difficulty: 3, tags: ['pair of lines', 'angle between lines'] }, (r) => {
    const options = (x: number, y: number): string[] => {
      const t = F(Math.abs(x - y), Math.abs(1 + x * y));
      return [
        fOpt(t), // correct
        fOpt(t.inv()), // inverted
        fOpt(t.div(2)), // dropped the factor 2
        fOpt(F(Math.abs(x - y), Math.abs(x * y - 1))), // used a - b in the denominator
        // took the whole xy coefficient as h: 2 sqrt((2h)^2 - ab) / |a + b|
        `$${surdFrac(2, (x + y) ** 2 - x * y, Math.abs(1 + x * y))}$`,
      ];
    };
    const [m1, m2] = draw(
      r,
      (g) => [g.int(-4, 4), g.int(-4, 4)] as const,
      // x * y = 0 would drop the x^2 term and print a leading "-kxy"; exclude it with the
      // perpendicular (x * y = -1) and coincident cases.
      ([x, y]) => x < y && x * y !== 0 && x * y !== -1 && x * y !== 1 && distinctCount(options(x, y)) >= 4,
    );
    const s = r.pick([1, 1, 2, 3]);
    // (y - m1 x)(y - m2 x) = 0, scaled by s and by -1 if needed so the x^2 term is positive.
    const sg = m1 * m2 < 0 ? -s : s;
    const a = sg * m1 * m2;
    const H = -sg * (m1 + m2); // coefficient of xy, i.e. 2h
    const bb = sg;
    const tanT = F(Math.abs(m1 - m2), Math.abs(1 + m1 * m2));
    const [answer, ...cands] = options(m1, m2) as [string, ...string[]];
    const distractors = pickDistractors(answer, cands);
    const h = F(H, 2);
    const h2 = h.mul(h);
    const D = h2.sub(a * bb);
    const root = F(s * Math.abs(m1 - m2), 2);
    const eq = `${signedSum([
      [a, 'x^{2}'],
      [H, 'xy'],
      [bb, 'y^{2}'],
    ])} = 0`;
    return {
      stem: tex`The tangent of the acute angle between the pair of lines $${eq}$ is:`,
      answer,
      distractors,
      explanation: tex`Compare with $ax^2 + 2hxy + by^2 = 0$: $a = ${a}$, $h = ${h.toTex()}$, $b = ${bb}$. $\tan\theta = \frac{2\sqrt{h^2 - ab}}{|a + b|} = \frac{2\sqrt{${h2.toTex()} - (${a})(${bb})}}{${Math.abs(a + bb)}} = \frac{2\sqrt{${D.toTex()}}}{${Math.abs(a + bb)}} = \frac{2 \cdot ${root.toTex()}}{${Math.abs(a + bb)}} = ${tanT.toTex()}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'joint-equation-two-lines',
      d: 1,
      t: ['pair of lines'],
      q: tex`The joint (combined) equation of the lines $x - 2y = 0$ and $3x + y = 0$ is:`,
      a: tex`$3x^{2} - 5xy - 2y^{2} = 0$`,
      x: [tex`$3x^{2} + 5xy - 2y^{2} = 0$`, tex`$3x^{2} - 5xy + 2y^{2} = 0$`, tex`$3x^{2} - 7xy - 2y^{2} = 0$`],
      e: tex`Multiply the two equations: $(x - 2y)(3x + y) = 3x^{2} + xy - 6xy - 2y^{2} = 3x^{2} - 5xy - 2y^{2} = 0$.`,
    },
    {
      id: 'foot-of-perpendicular-origin',
      d: 2,
      t: ['distance from a point to a line', 'equations of lines'],
      q: tex`The foot of the perpendicular from the origin to the line $3x + 4y = 25$ is:`,
      a: '$(3, 4)$',
      x: ['$(4, 3)$', '$(-3, -4)$', '$(15, 20)$'],
      e: tex`The perpendicular from $O$ has direction $(3, 4)$, so the foot is $(3t, 4t)$. Substituting: $9t + 16t = 25 \Rightarrow t = 1$, giving $(3, 4)$. (Dividing $25$ by $\sqrt{3^2 + 4^2} = 5$ instead of by $3^2 + 4^2 = 25$ gives the wrong point $(15, 20)$.)`,
    },
    {
      id: 'equal-intercepts-line',
      d: 2,
      o: 'past-paper',
      t: ['equations of lines'],
      q: tex`The equation of the line through $(3, -1)$ that makes equal non-zero intercepts on the coordinate axes is:`,
      a: '$x + y = 2$',
      x: ['$x - y = 4$', '$x + y = 4$', '$x + 3y = 0$'],
      e: tex`Equal intercepts $a$: $\frac{x}{a} + \frac{y}{a} = 1$, i.e. $x + y = a$. Through $(3, -1)$: $a = 3 + (-1) = 2$, so $x + y = 2$. ($x - y = 4$ has intercepts $4$ and $-4$; $x + 3y = 0$ passes through the origin.)`,
    },
  ]),
]);
