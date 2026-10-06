/**
 * Physics - Vectors and Equilibrium (FSc Part I, chapter 2).
 *
 * Coverage
 * - vector addition: resultant of two forces at 60/120 degrees, range of the resultant, forces
 *   from the maximum and minimum resultant, angle-from-condition classics
 * - resolution: rectangular components (including weight on an incline), the missing component,
 *   direction of a vector in any quadrant, unit vectors
 * - dot and cross product: work and power as F.d and F.v, angle between vectors, perpendicular
 *   and parallel conditions, 3-D cross product, unit-vector products, 'doubled/halved' scaling,
 *   direction, area and properties of the products
 * - torque: r x F from components, rF sin(theta) with unit conversion, zero torque, dimensions, couples
 * - equilibrium conditions: third force for equilibrium, beam reactions, metre rule with its own
 *   weight, symmetric string tension, meaning of the two conditions, static vs dynamic equilibrium
 *
 * Every numerical answer is exact: forces come from integer triples (Pythagorean for 90 degrees,
 * a^2 + b^2 +/- ab squares for 60/120 degrees) and angles are special angles. Distractors model
 * real slips: sin/cos swap, the law-of-cosines sign, the j-component sign of a determinant,
 * F x r instead of r x F, centimetres not converted to metres, moments about the wrong support,
 * and forgetting that a uniform rule's weight acts at its centre.
 */
import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import {
  coefTex,
  degreeTex,
  exactTrig,
  frac,
  num,
  numericOptions,
  paren,
  pickDistractors,
  q$,
  qty,
  range,
  signedSum,
  sum,
  surdTex,
  tex,
  U,
} from '@/engine/helpers';

// ------------------------------------------------------------------------------------------
// Local helpers
// ------------------------------------------------------------------------------------------

const UNIT_VECTORS = ['\\hat{i}', '\\hat{j}', '\\hat{k}'];
const AXES = ['x', 'y', 'z'];

/** Integer components -> LaTeX vector with zero terms dropped: [2, -3, 1] -> 2\hat{i} - 3\hat{j} + \hat{k}. */
function vec(c: readonly number[]): string {
  return signedSum(c.map((v, i) => [v, UNIT_VECTORS[i]] as const));
}

/** Like `vec`, but the component at index `pos` is the unknown `p` (its value in `c` is ignored). */
function vecWithUnknown(c: readonly number[], pos: number): string {
  let out = '';
  c.forEach((v, i) => {
    if (i !== pos && v === 0) return;
    const negative = i !== pos && v < 0;
    const body = i === pos ? `p${UNIT_VECTORS[i]}` : coefTex(Math.abs(v), UNIT_VECTORS[i]);
    if (!out) out = negative ? `-${body}` : body;
    else out += negative ? ` - ${body}` : ` + ${body}`;
  });
  return out;
}

/** Vector product of two 3-component vectors. */
function cross(a: readonly number[], b: readonly number[]): number[] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Substitution display of a product: (2)(-3). */
const times = (a: number | string, b: number | string): string => `(${a})(${b})`;

/** Angle option: 150 -> $150^{\circ}$. */
const deg = (d: number): string => `$${degreeTex(d)}$`;

/** Vector option with a unit: $(2\hat{i} - 3\hat{j})\,\mathrm{N}$. */
const vecQ = (c: readonly number[], unit: string): string => `$(${vec(c)})\\,\\mathrm{${unit}}$`;

/** Torque option along z: $-14\hat{k}\,\mathrm{N\,m}$. */
const kTorque = (v: number): string => `$${coefTex(v, '\\hat{k}')}\\,\\mathrm{N\\,m}$`;

/** Option for an exact rational value: $-\frac{3}{2}$. */
const fracOpt = (f: Fraction): string => `$${f.toTex()}$`;

/** Calls `make` until it returns a value (bounded and deterministic for a given rng), else `fallback`. */
function retry<T>(make: () => T | undefined, fallback: T): T {
  for (let i = 0; i < 500; i++) {
    const value = make();
    if (value !== undefined) return value;
  }
  return fallback;
}

/** (a, b, c) with c^2 = a^2 + b^2: perpendicular components or forces. */
const TRIPLES_90: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
];

/** (a, b, R) with R^2 = a^2 + b^2 + ab: the resultant of a and b acting at 60 degrees. */
const TRIPLES_60: ReadonlyArray<readonly [number, number, number]> = [
  [3, 5, 7],
  [7, 8, 13],
  [5, 16, 19],
  [11, 24, 31],
];

/** (a, b, R) with R^2 = a^2 + b^2 - ab: the resultant of a and b acting at 120 degrees. */
const TRIPLES_120: ReadonlyArray<readonly [number, number, number]> = [
  [3, 8, 7],
  [5, 8, 7],
  [7, 15, 13],
  [8, 15, 13],
  [5, 21, 19],
  [16, 21, 19],
];

/** Integer vectors with an integer magnitude: [components, magnitude]. */
const INTEGER_MAGNITUDE: ReadonlyArray<readonly [readonly number[], number]> = [
  [[3, 4], 5],
  [[5, 12], 13],
  [[8, 15], 17],
  [[7, 24], 25],
  [[1, 2, 2], 3],
  [[2, 3, 6], 7],
  [[1, 4, 8], 9],
  [[4, 4, 7], 9],
  [[2, 6, 9], 11],
  [[6, 6, 7], 11],
  [[3, 4, 12], 13],
  [[2, 10, 11], 15],
  [[8, 9, 12], 17],
  [[1, 12, 12], 17],
];

/**
 * Pairs of vectors at a special angle (60 or 45 degrees). Permuting axes, flipping the same axis
 * in both vectors and scaling each vector by a positive number keep the angle; reversing one
 * vector turns the angle into its supplement (120 or 135 degrees).
 */
const ANGLE_PAIRS: ReadonlyArray<readonly [readonly number[], readonly number[]]> = [
  [[1, 1, 0], [0, 1, 1]], // cos = 1/2
  [[1, 1, 0], [1, 0, 0]], // cos = 1/sqrt(2)
  [[3, 4, 0], [7, 1, 0]], // 25 / (5 * 5 sqrt(2))
  [[3, 4, 0], [-1, 7, 0]], // 25 / (5 * 5 sqrt(2))
];

export default defineBank('physics', 'vectors-equilibrium', (b) => [
  // ========================================================================================
  // Vector addition
  // ========================================================================================

  b.dynamic('resultant-two-forces', { difficulty: 2, origin: 'past-paper', tags: ['vector addition'] }, (r) => {
    const theta = r.pick([60, 120] as const);
    const N = (t: string): string => q$(t, U.N);
    if (r.chance(0.2)) {
      // Two equal forces: the parallelogram is a rhombus and R = 2F cos(theta / 2).
      const F = r.int(2, 25);
      const R = theta === 60 ? surdTex(F, 3) : String(F);
      const wrong = [theta === 60 ? String(F) : surdTex(F, 3), surdTex(F, 2), String(2 * F)];
      return {
        stem: tex`Two forces, each of magnitude $${qty(F, U.N)}$, act on a particle with an angle of $${theta}^{\circ}$ between them. The magnitude of their resultant is:`,
        answer: N(R),
        distractors: pickDistractors(N(R), wrong.map(N)),
        explanation: tex`For two equal forces the parallelogram is a rhombus and the resultant bisects the angle: $R = 2F\cos\frac{\theta}{2} = 2(${F})\cos ${theta / 2}^{\circ} = ${R}\,\mathrm{N}$.`,
      };
    }
    const [a0, b0, c0] = r.pick(theta === 60 ? TRIPLES_60 : TRIPLES_120);
    const k = r.int(1, Math.min(6, Math.floor(48 / Math.max(a0, b0))));
    const [f1, f2] = r.chance(0.5) ? [a0 * k, b0 * k] : [b0 * k, a0 * k];
    const R = c0 * k;
    const squares = f1 * f1 + f2 * f2;
    const product = f1 * f2; // 2 F1 F2 cos(theta) is +F1 F2 at 60 degrees and -F1 F2 at 120 degrees
    const sign = theta === 60 ? '+' : '-';
    // Law-of-cosines sign slip (interior angle instead of the angle between the forces).
    const wrongSign = theta === 60 ? squares - product : squares + product;
    const candidates = [
      surdTex(1, wrongSign),
      surdTex(1, squares), // treated the forces as perpendicular
      String(r.pick([f1 + f2, Math.abs(f1 - f2)])), // added or subtracted the magnitudes
      String(f1 + f2),
      String(Math.abs(f1 - f2)),
    ];
    return {
      stem: tex`Two forces of $${qty(f1, U.N)}$ and $${qty(f2, U.N)}$ act on a particle with an angle of $${theta}^{\circ}$ between them. The magnitude of their resultant is:`,
      answer: N(String(R)),
      distractors: pickDistractors(N(String(R)), candidates.map(N)),
      explanation: tex`$R = \sqrt{F_1^2 + F_2^2 + 2F_1F_2\cos\theta} = \sqrt{${f1}^2 + ${f2}^2 + 2(${f1})(${f2})\cos ${theta}^{\circ}} = \sqrt{${squares} ${sign} ${product}} = \sqrt{${R * R}} = ${R}\,\mathrm{N}$.`,
    };
  }),

  b.dynamic('resultant-range', { difficulty: 1, origin: 'past-paper', tags: ['vector addition'] }, (r) => {
    const mode = r.pick(['cannot', 'can', 'forces'] as const);
    if (mode === 'forces') {
      const big = r.int(6, 40);
      // Same parity as `big`, so the extremes are even and the halved-extremes slip stays whole.
      const small = big - 2 * r.int(1, Math.floor((big - 2) / 2));
      const max = big + small;
      const min = big - small;
      const pair = (x: number, y: number): string => `${q$(x, U.N)} and ${q$(y, U.N)}`;
      const answer = pair(big, small);
      return {
        stem: tex`The maximum and minimum magnitudes of the resultant of two forces acting at a point are $${qty(max, U.N)}$ and $${qty(min, U.N)}$ respectively. The magnitudes of the two forces are:`,
        answer,
        // took the extremes as the forces; forgot to halve; halved each extreme
        distractors: pickDistractors(answer, [pair(max, min), pair(2 * big, 2 * small), pair(max / 2, min / 2)]),
        explanation: tex`The resultant is greatest when the forces act in the same direction and least when they act in opposite directions: $F_1 + F_2 = ${max}$ and $F_1 - F_2 = ${min}$. Adding, $F_1 = \frac{${max} + ${min}}{2} = ${big}\,\mathrm{N}$, and then $F_2 = ${max} - ${big} = ${small}\,\mathrm{N}$.`,
      };
    }
    const f1 = r.int(3, 20);
    const f2 = f1 + r.int(3, 20);
    const min = f2 - f1;
    const max = f1 + f2;
    const inside = r.sample(range(min + 1, max - 1), 2);
    const above = [max + r.int(1, 4), max + r.int(5, 10)];
    const below = r.int(1, min - 1);
    const shown = r.chance(0.5) ? [f1, f2] : [f2, f1];
    const limits = tex`The resultant of two forces lies between $F_2 - F_1 = ${f2} - ${f1} = ${min}\,\mathrm{N}$ (forces opposite) and $F_1 + F_2 = ${max}\,\mathrm{N}$ (forces in the same direction), both limits included.`;
    if (mode === 'cannot') {
      const value = r.chance(0.65) ? r.pick(above) : below;
      return {
        stem: tex`Two forces of magnitudes $${qty(shown[0], U.N)}$ and $${qty(shown[1], U.N)}$ act on a body. Which of the following **cannot** be the magnitude of their resultant?`,
        answer: q$(value, U.N),
        distractors: r.sample([min, max, ...inside], 3).map((v) => q$(v, U.N)),
        explanation: tex`${limits} $${qty(value, U.N)}$ lies outside this range, so it is impossible; every other option lies within it.`,
      };
    }
    const value = inside[0];
    return {
      stem: tex`Two forces of magnitudes $${qty(shown[0], U.N)}$ and $${qty(shown[1], U.N)}$ act on a body. Which of the following **can** be the magnitude of their resultant?`,
      answer: q$(value, U.N),
      distractors: [above[0], above[1], below].map((v) => q$(v, U.N)),
      explanation: tex`${limits} Of the options only $${qty(value, U.N)}$ lies within this range.`,
    };
  }),

  // ========================================================================================
  // Resolution of vectors
  // ========================================================================================

  b.dynamic('force-components', { difficulty: 1, tags: ['resolution'] }, (r) => {
    const N = (t: string | number): string => q$(t, U.N);
    if (r.chance(0.25)) {
      // The missing rectangular component.
      const [p0, q0, c0] = r.pick(TRIPLES_90);
      const k = r.int(1, Math.max(1, Math.floor(60 / c0)));
      const [known, other] = r.chance(0.5) ? [p0 * k, q0 * k] : [q0 * k, p0 * k];
      const c = c0 * k;
      const horizontalKnown = r.chance(0.5);
      const answer = N(other);
      return {
        stem: tex`A force of $${qty(c, U.N)}$ has a ${horizontalKnown ? 'horizontal' : 'vertical'} component of $${qty(known, U.N)}$. Its ${horizontalKnown ? 'vertical' : 'horizontal'} component is:`,
        answer,
        // subtracted the magnitudes; added the squares; forgot the square root
        distractors: pickDistractors(answer, [N(c - known), N(surdTex(1, c * c + known * known)), N(c * c - known * known)]),
        explanation: tex`The rectangular components satisfy $F^2 = F_x^2 + F_y^2$, so the other component is $\sqrt{${c}^2 - ${known}^2} = \sqrt{${c * c - known * known}} = ${other}\,\mathrm{N}$.`,
      };
    }
    const F = r.pick([10, 12, 16, 20, 24, 30, 40, 50, 60, 80, 100, 120, 150, 200]);
    const theta = r.pick([30, 60] as const);
    const setting = r.pick(['horizontal', 'vertical', 'along', 'normal'] as const);
    const useSin = setting === 'vertical' || setting === 'along';
    const half = F / 2;
    // sin 30 = cos 60 = 1/2; sin 60 = cos 30 = sqrt(3)/2.
    const isHalf = useSin === (theta === 30);
    const answerTex = isHalf ? String(half) : surdTex(half, 3);
    // sin/cos swapped; did not resolve; divided by the trig ratio / dropped the 1/2
    const wrong = isHalf ? [surdTex(half, 3), String(F), String(2 * F)] : [String(half), String(F), surdTex(F, 3)];
    const fn = useSin ? '\\sin' : '\\cos';
    const ratio = isHalf ? '\\frac{1}{2}' : '\\frac{\\sqrt{3}}{2}';
    const incline = setting === 'along' || setting === 'normal';
    const stem = incline
      ? tex`A block of weight $${qty(F, U.N)}$ rests on a plane inclined at $${theta}^{\circ}$ to the horizontal. The component of its weight ${setting === 'along' ? 'acting down along the plane' : 'perpendicular to the plane'} is:`
      : tex`A force of $${qty(F, U.N)}$ acts at an angle of $${theta}^{\circ}$ above the horizontal. Its ${setting} component is:`;
    const symbol = incline
      ? setting === 'along'
        ? 'W_{\\parallel} = W'
        : 'W_{\\perp} = W'
      : setting === 'horizontal'
        ? 'F_x = F'
        : 'F_y = F';
    const lead = incline
      ? tex`On an incline the weight resolves into $W\sin\theta$ along the plane and $W\cos\theta$ perpendicular to it. `
      : '';
    return {
      stem,
      answer: N(answerTex),
      distractors: pickDistractors(N(answerTex), wrong.map(N)),
      explanation: tex`${lead}$${symbol}${fn} ${theta}^{\circ} = ${F} \times ${ratio} = ${answerTex}\,\mathrm{N}$.`,
    };
  }),

  b.dynamic('vector-direction-angle', { difficulty: 2, tags: ['resolution'] }, (r) => {
    const theta = r.pick([30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330]);
    const quadrant = Math.floor(theta / 90) + 1;
    const phi = [theta, 180 - theta, theta - 180, 360 - theta][quadrant - 1];
    const k = r.int(1, 6);
    const root = surdTex(k, 3);
    const plain = String(k);
    const [ax, ay] = phi === 30 ? [root, plain] : phi === 60 ? [plain, root] : [plain, plain];
    const sx = quadrant === 1 || quadrant === 4 ? 1 : -1;
    const sy = quadrant <= 2 ? 1 : -1;
    const term = (mag: string, unit: string): string => (mag === '1' ? unit : `${mag}${unit}`);
    const vector = `${sx < 0 ? '-' : ''}${term(ax, '\\hat{i}')} ${sy < 0 ? '-' : '+'} ${term(ay, '\\hat{j}')}`;
    // The angle with reference angle `ref` placed in this vector's quadrant.
    const place = (ref: number): number => [ref, 180 - ref, 180 + ref, 360 - ref][quadrant - 1];
    const sameReference = [phi, 180 - phi, 180 + phi, 360 - phi].filter((a) => a !== theta);
    const ordered = [
      ...(quadrant === 1 ? [] : [phi]), // ignored the signs of the components
      ...(phi === 45 ? [] : [place(90 - phi)]), // used Ax/Ay instead of Ay/Ax
      ...r.shuffle(sameReference), // wrong quadrant
    ];
    const answer = deg(theta);
    const tanTex = phi === 30 ? '\\frac{1}{\\sqrt{3}}' : phi === 60 ? '\\sqrt{3}' : '1';
    const rule = [
      '\\phi',
      `180^{\\circ} - ${phi}^{\\circ}`,
      `180^{\\circ} + ${phi}^{\\circ}`,
      `360^{\\circ} - ${phi}^{\\circ}`,
    ][quadrant - 1];
    const roman = ['I', 'II', 'III', 'IV'][quadrant - 1];
    return {
      stem: tex`The direction of the vector $\vec{A} = ${vector}$, measured anticlockwise from the positive $x$-axis, is:`,
      answer,
      distractors: pickDistractors(answer, ordered.map(deg)),
      explanation: tex`The reference angle $\phi$ satisfies $\tan\phi = \frac{|A_y|}{|A_x|} = \frac{${ay}}{${ax}} = ${tanTex}$, so $\phi = ${phi}^{\circ}$. Since $A_x ${sx < 0 ? '<' : '>'} 0$ and $A_y ${sy < 0 ? '<' : '>'} 0$, the vector lies in quadrant ${roman}, so $\theta = ${rule} = ${theta}^{\circ}$.`,
    };
  }),

  b.dynamic('unit-vector', { difficulty: 1, tags: ['resolution'] }, (r) => {
    const [base, n] = r.pick(INTEGER_MAGNITUDE);
    const c = r.shuffle(base).map((v) => v * r.sign());
    const body = vec(c);
    const total = sum(c.map((v) => Math.abs(v)));
    const option = (den: string, inner: string = body): string => `$\\frac{1}{${den}}\\left(${inner}\\right)$`;
    const answer = option(String(n));
    const candidates = [
      option(String(total)), // divided by the sum of the components
      option(String(n * n)), // forgot the square root in the magnitude
      option(surdTex(1, total)), // did not square the components
      option(String(n), vec(c.map((v) => Math.abs(v)))), // dropped the signs
      option(String(n + 1)), // safety fallback only: the three above are always distinct
    ];
    const squares = c.map((v) => `${paren(v)}^2`).join(' + ');
    return {
      stem: tex`The unit vector in the direction of $\vec{A} = ${body}$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`$|\vec{A}| = \sqrt{${squares}} = \sqrt{${n * n}} = ${n}$, so $\hat{A} = \frac{\vec{A}}{|\vec{A}|} = \frac{1}{${n}}\left(${body}\right)$.`,
    };
  }),

  // ========================================================================================
  // Scalar and vector products
  // ========================================================================================

  b.dynamic('work-dot-product', { difficulty: 1, origin: 'past-paper', tags: ['dot and cross product'] }, (r) => {
    const power = r.chance(0.35);
    const { F, d } = retry(
      () => {
        const F = [r.nonZero(-5, 8), r.nonZero(-5, 8), r.int(-4, 6)];
        const d = [r.nonZero(-4, 6), r.nonZero(-4, 6), r.int(-3, 5)];
        const p = F.map((f, i) => f * d[i]);
        const w = sum(p);
        // A positive result that needs at least one negative term, so sign slips show up.
        return w > 0 && w <= 60 && p.some((x) => x < 0) ? { F, d } : undefined;
      },
      { F: [2, 3, -1], d: [4, -1, 2] },
    );
    const p = F.map((f, i) => f * d[i]);
    const W = sum(p);
    const unit = power ? U.W : U.J;
    const { answer, distractors } = numericOptions(r, {
      correct: W,
      // ignored the signs; dropped the z-terms; multiplied the sums of components; sign reversed
      wrong: [sum(p.map((x) => Math.abs(x))), p[0] + p[1], sum(F) * sum(d), -W],
      format: (x) => q$(x, unit),
      allowNegative: true,
    });
    const v = power ? 'v' : 'd';
    const dims = F[2] === 0 && d[2] === 0 ? 2 : 3; // planar vectors: no z-term in the working
    const formula = AXES.slice(0, dims)
      .map((axis) => `F_${axis}${v}_${axis}`)
      .join(' + ');
    const substituted = F.slice(0, dims)
      .map((f, i) => times(f, d[i]))
      .join(' + ');
    const stem = power
      ? tex`A force $\vec{F} = (${vec(F)})\,\mathrm{N}$ acts on a body moving with velocity $\vec{v} = (${vec(d)})\,\mathrm{m\,s^{-1}}$. The power delivered by the force is:`
      : tex`A force $\vec{F} = (${vec(F)})\,\mathrm{N}$ acts on a body and displaces it by $\vec{d} = (${vec(d)})\,\mathrm{m}$. The work done by the force is:`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`$${power ? 'P' : 'W'} = \vec{F}\cdot\vec{${v}} = ${formula} = ${substituted} = ${signedSum(p.map((x) => [x, ''] as const))} = ${W}\,\mathrm{${unit}}$.`,
    };
  }),

  b.dynamic('dot-product-geometry', { difficulty: 2, origin: 'past-paper', tags: ['dot and cross product'] }, (r) => {
    const mode = r.pick(['angle', 'perpendicular', 'parallel'] as const);

    if (mode === 'angle') {
      const [u0, v0] = r.weighted(ANGLE_PAIRS, [3, 1, 1, 1]);
      const perm = r.shuffle([0, 1, 2]);
      const flip = perm.map(() => r.sign());
      const s = r.int(1, u0.some((x) => Math.abs(x) > 1) ? 2 : 3);
      const t = r.int(1, v0.some((x) => Math.abs(x) > 1) ? 2 : 3) * (r.chance(0.5) ? -1 : 1);
      let A = perm.map((axis, i) => s * flip[i] * u0[axis] + 0);
      let B = perm.map((axis, i) => t * flip[i] * v0[axis] + 0);
      if (r.chance(0.5)) [A, B] = [B, A];
      const dot = sum(A.map((x, i) => x * B[i]));
      const nA = sum(A.map((x) => x * x));
      const nB = sum(B.map((x) => x * x));
      const angle = Math.round((Math.acos(dot / Math.sqrt(nA * nB)) * 180) / Math.PI);
      const answer = deg(angle);
      // supplement (sign of the dot product ignored); complement (sin and cos confused); others
      const candidates = [180 - angle, angle < 90 ? 90 - angle : angle - 90, ...r.shuffle([30, 45, 60, 90, 120, 135, 150])];
      const products = A.map((x, i) => [x, B[i]])
        .filter(([x, y]) => x !== 0 || y !== 0)
        .map(([x, y]) => times(x, y))
        .join(' + ');
      return {
        stem: tex`The angle between the vectors $\vec{A} = ${vec(A)}$ and $\vec{B} = ${vec(B)}$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates.map(deg)),
        explanation: tex`$\cos\theta = \frac{\vec{A}\cdot\vec{B}}{|\vec{A}||\vec{B}|} = \frac{${products}}{(${surdTex(1, nA)})(${surdTex(1, nB)})} = \frac{${dot}}{${surdTex(1, nA * nB)}} = ${exactTrig('cos', angle)?.tex ?? ''}$, so $\theta = ${angle}^{\circ}$.`,
      };
    }

    if (mode === 'perpendicular') {
      const { A, B, pos, K, p } = retry(
        () => {
          const A = [r.nonZero(-5, 6), r.nonZero(-5, 6), r.nonZero(-5, 6)];
          const B = [r.nonZero(-5, 6), r.nonZero(-5, 6), r.nonZero(-5, 6)];
          const pos = r.int(0, 2);
          if (Math.abs(B[pos]) < 2) return undefined;
          const K = sum(A.map((x, i) => (i === pos ? 0 : x * B[i])));
          if (K === 0 || K % B[pos] !== 0) return undefined;
          const p = -K / B[pos];
          if (Math.abs(p) > 10) return undefined;
          A[pos] = p;
          return { A, B, pos, K, p };
        },
        { A: [2, 1, -1], B: [3, -2, 4], pos: 1, K: 2, p: 1 },
      );
      const { answer, distractors } = numericOptions(r, {
        correct: p,
        wrong: [-p, -K, K], // sign slip; did not divide by the coefficient; both
        format: (x) => `$${num(x)}$`,
        allowNegative: true,
        fallback: 'integer',
      });
      const terms = A.map((x, i) => (i === pos ? `${paren(B[i])}p` : times(x, B[i]))).join(' + ');
      return {
        stem: tex`For what value of $p$ are the vectors $\vec{A} = ${vecWithUnknown(A, pos)}$ and $\vec{B} = ${vec(B)}$ perpendicular to each other?`,
        answer,
        distractors,
        explanation: tex`Perpendicular vectors have $\vec{A}\cdot\vec{B} = 0$: $${terms} = 0 \Rightarrow ${signedSum([[K, ''], [B[pos], 'p']])} = 0 \Rightarrow p = ${p}$.`,
      };
    }

    // Parallel: one vector is a positive multiple of the other.
    const V = [r.nonZero(-4, 5), r.nonZero(-4, 5), r.nonZero(-4, 5)];
    const lambda = r.int(2, 4);
    const multiple = V.map((x) => lambda * x);
    const unknownInMultiple = r.chance(0.5);
    const A = unknownInMultiple ? multiple : V; // the vector that carries the unknown
    const B = unknownInMultiple ? V : multiple;
    const pos = r.int(0, 2);
    const p = A[pos];
    const ratio = unknownInMultiple ? frac(lambda) : frac(1, lambda); // A = ratio * B
    const j = pos === 0 ? 1 : 0;
    const otherDot = sum(A.map((x, i) => (i === pos ? 0 : x * B[i])));
    const answer = fracOpt(frac(p));
    const candidates = [
      fracOpt(frac(B[pos]).div(ratio)), // inverted the ratio
      fracOpt(frac(-otherDot, B[pos])), // applied the perpendicular condition instead
      fracOpt(frac(-p)), // sign slip
      // The perpendicular value equals -p when the other two squares of B sum to B[pos]^2; then:
      fracOpt(frac(B[pos] + A[j] - B[j])), // thought parallel components differ by a constant
      fracOpt(frac(p + B[pos])), // last resort, never equal to p, -p or the inverted ratio
    ];
    return {
      stem: tex`For what value of $p$ is the vector $\vec{A} = ${vecWithUnknown(A, pos)}$ parallel to the vector $\vec{B} = ${vec(B)}$?`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`Parallel vectors have proportional components, $\vec{A} = \lambda\vec{B}$. From the known ${AXES[j]}-components, $\lambda = \frac{${A[j]}}{${B[j]}} = ${ratio.toTex()}$, so $p = \lambda B_${AXES[pos]} = ${ratio.toTex()} \times ${paren(B[pos])} = ${p}$.`,
    };
  }),

  b.dynamic('cross-product-3d', { difficulty: 3, tags: ['dot and cross product'] }, (r) => {
    const { A, B } = retry(
      () => {
        const A = [r.nonZero(-3, 4), r.int(-3, 4), r.nonZero(-3, 4)];
        const B = [r.int(-3, 4), r.nonZero(-3, 4), r.nonZero(-3, 4)];
        return cross(A, B).every((x) => x !== 0) ? { A, B } : undefined;
      },
      { A: [2, -1, 3], B: [1, 2, -1] },
    );
    const C = cross(A, B);
    const componentwise = A.map((x, i) => x * B[i]);
    const added = [A[1] * B[2] + A[2] * B[1], A[2] * B[0] + A[0] * B[2], A[0] * B[1] + A[1] * B[0]];
    const answer = `$${vec(C)}$`;
    const candidates = [
      [C[0], -C[1], C[2]], // forgot the minus sign of the j-term
      C.map((x) => -x), // computed B x A
      ...(componentwise.filter((x) => x !== 0).length >= 2 ? [componentwise] : []), // multiplied matching components
      added, // added the cross terms instead of subtracting
      [C[0], C[1], -C[2]],
    ].map((v) => `$${vec(v)}$`);
    return {
      stem: tex`If $\vec{A} = ${vec(A)}$ and $\vec{B} = ${vec(B)}$, then $\vec{A}\times\vec{B}$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`$\vec{A}\times\vec{B} = \begin{vmatrix} \hat{i} & \hat{j} & \hat{k} \\ ${A[0]} & ${A[1]} & ${A[2]} \\ ${B[0]} & ${B[1]} & ${B[2]} \end{vmatrix} = \hat{i}\,[${times(A[1], B[2])} - ${times(A[2], B[1])}] - \hat{j}\,[${times(A[0], B[2])} - ${times(A[2], B[0])}] + \hat{k}\,[${times(A[0], B[1])} - ${times(A[1], B[0])}] = ${vec(C)}$.`,
    };
  }),

  b.dynamic('unit-vector-products', { difficulty: 1, tags: ['dot and cross product'] }, (r) => {
    const a = r.int(0, 2);
    const same = r.chance(0.25);
    const bi = same ? a : (a + r.pick([1, 2])) % 3;
    const isCross = r.chance(0.65);
    const ua = UNIT_VECTORS[a];
    const ub = UNIT_VECTORS[bi];
    const c = 3 - a - bi; // the third unit vector (only meaningful when a !== bi)
    const cyclic = bi === (a + 1) % 3; // i x j, j x k, k x i are positive
    const crossTex = same ? '0' : `${cyclic ? '' : '-'}${UNIT_VECTORS[c]}`;
    const m = (t: string): string => `$${t}$`;
    const product = `${ua}${isCross ? '\\times' : '\\cdot'}${ub}`;
    let answer: string;
    let wrong: string[];
    let explanation: string;
    if (isCross && !same) {
      answer = m(crossTex);
      wrong = [m(cyclic ? `-${UNIT_VECTORS[c]}` : UNIT_VECTORS[c]), m('0'), m('1')];
      explanation = tex`The unit vectors follow the cyclic order $\hat{i} \to \hat{j} \to \hat{k} \to \hat{i}$: $\hat{i}\times\hat{j} = \hat{k}$, $\hat{j}\times\hat{k} = \hat{i}$, $\hat{k}\times\hat{i} = \hat{j}$, and reversing the order reverses the sign. So $${product} = ${crossTex}$.`;
    } else if (isCross) {
      answer = m('0');
      wrong = [m('1'), m(ua), m(`-${ua}`)];
      explanation = tex`$${product} = (1)(1)\sin 0^{\circ}\,\hat{n} = 0$: the vector product of two parallel vectors is the null vector.`;
    } else if (!same) {
      answer = m('0');
      wrong = [m('1'), m(crossTex), m('-1')];
      explanation = tex`$\hat{i}$, $\hat{j}$ and $\hat{k}$ are mutually perpendicular, so $${product} = (1)(1)\cos 90^{\circ} = 0$. (The vector product $${ua}\times${ub}$ would be $${crossTex}$.)`;
    } else {
      answer = m('1');
      wrong = [m('0'), m(ua), m('-1')];
      explanation = tex`$${product} = (1)(1)\cos 0^{\circ} = 1$: the scalar product of a unit vector with itself is $1$.`;
    }
    return {
      stem: tex`The product $${product}$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, wrong),
      explanation,
    };
  }),

  // ========================================================================================
  // Torque
  // ========================================================================================

  b.dynamic('torque-r-cross-f', { difficulty: 2, origin: 'past-paper', tags: ['torque', 'dot and cross product'] }, (r) => {
    const { x, y, fx, fy } = retry(
      () => {
        const x = r.nonZero(-4, 6);
        const y = r.nonZero(-4, 6);
        const fx = r.nonZero(-5, 8);
        const fy = r.nonZero(-5, 8);
        const t = x * fy - y * fx;
        return t !== 0 && Math.abs(t) <= 70 ? { x, y, fx, fy } : undefined;
      },
      { x: 2, y: 3, fx: 4, fy: -1 },
    );
    const t = x * fy - y * fx;
    const answer = kTorque(t);
    const candidates = [
      -t, // F x r instead of r x F
      x * fy + y * fx, // sign slip: took j x i = +k
      x * fx + y * fy, // multiplied matching components (dot product)
      x * fy,
      2 * t,
    ].filter((v) => v !== 0);
    const position = r.chance(0.5)
      ? tex`at a point whose position vector relative to the origin $O$ is $\vec{r} = (${vec([x, y])})\,\mathrm{m}$`
      : tex`at the point $(${x}, ${y})\,\mathrm{m}$`;
    return {
      stem: tex`A force $\vec{F} = (${vec([fx, fy])})\,\mathrm{N}$ acts ${position}. The torque of this force about the origin $O$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates.map(kTorque)),
      explanation: tex`$\vec{\tau} = \vec{r}\times\vec{F} = (xF_y - yF_x)\,\hat{k}$, because $\hat{i}\times\hat{j} = \hat{k}$, $\hat{j}\times\hat{i} = -\hat{k}$ and $\hat{i}\times\hat{i} = \hat{j}\times\hat{j} = 0$. So $\vec{\tau} = [${times(x, fy)} - ${times(y, fx)}]\,\hat{k} = ${coefTex(t, '\\hat{k}')}\,\mathrm{N\,m}$.`,
    };
  }),

  b.dynamic('spanner-torque', { difficulty: 2, tags: ['torque'] }, (r) => {
    const L = r.pick([10, 15, 20, 25, 30, 40, 50, 60, 75, 80]); // cm
    // rF must be an even number of N m so that rF sin(30) is a whole number.
    const F = r.pick(range(8, 200).filter((f) => (L * f) % 200 === 0 && (L * f) / 100 <= 100));
    const theta = r.pick([30, 60] as const);
    const rF = (L * F) / 100;
    const half = rF / 2;
    const answerTex = theta === 30 ? String(half) : surdTex(half, 3);
    // used cos; ignored the angle; left r in centimetres
    const wrong =
      theta === 30
        ? [surdTex(half, 3), String(rF), String(100 * half)]
        : [String(half), String(rF), surdTex(100 * half, 3)];
    const Nm = (t: string): string => q$(t, U.Nm);
    return {
      stem: tex`A force of $${qty(F, U.N)}$ is applied at the free end of a spanner of length $${qty(L, U.cm)}$, at an angle of $${theta}^{\circ}$ to the spanner. The magnitude of the torque about the nut is:`,
      answer: Nm(answerTex),
      distractors: pickDistractors(Nm(answerTex), wrong.map(Nm)),
      explanation: tex`$r = ${L}\,\mathrm{cm} = ${num(L / 100)}\,\mathrm{m}$, so $\tau = rF\sin\theta = (${num(L / 100)})(${F})\sin ${theta}^{\circ} = ${rF} \times ${theta === 30 ? '\\frac{1}{2}' : '\\frac{\\sqrt{3}}{2}'} = ${answerTex}\,\mathrm{N\,m}$.`,
    };
  }),

  b.dynamic('product-scaling', { difficulty: 1, origin: 'past-paper', tags: ['torque', 'dot and cross product'] }, (r) => {
    // 'If X is doubled and Y is halved' proportional reasoning for rF sin(theta) and AB cos/sin(theta).
    const FACTORS = [frac(2), frac(3), frac(1, 2), frac(1, 3)];
    const fA = r.pick(FACTORS);
    const fB = r.pick(FACTORS);
    const product = fA.mul(fB);
    const verb = (f: Fraction): string =>
      f.equals(2) ? 'doubled' : f.equals(3) ? 'tripled' : f.equals(frac(1, 2)) ? 'halved' : 'reduced to one-third';
    const distance = (f: Fraction): string =>
      f.equals(2)
        ? 'twice the original distance'
        : f.equals(3)
          ? 'three times the original distance'
          : f.equals(frac(1, 2))
            ? 'half the original distance'
            : 'one-third of the original distance';
    const context = r.pick(['torque', 'dot', 'cross'] as const);
    const symbol = context === 'torque' ? '\\tau' : context === 'dot' ? 'S' : 'C';
    const option = (f: Fraction): string => `$${coefTex(f, symbol)}$`;
    const stem =
      context === 'torque'
        ? tex`A force applied perpendicular to a spanner produces a torque $\tau$ about the nut. If the force is ${verb(fA)} and it is applied at ${distance(fB)} from the nut, still perpendicular to the spanner, the new torque is:`
        : tex`The ${context === 'dot' ? tex`scalar product $\vec{A}\cdot\vec{B}$` : tex`magnitude of the vector product $|\vec{A}\times\vec{B}|$`} of two vectors is $${symbol}$. If ${fA.equals(fB) ? tex`the magnitudes of both $\vec{A}$ and $\vec{B}$ are ${verb(fA)}` : tex`the magnitude of $\vec{A}$ is ${verb(fA)} and that of $\vec{B}$ is ${verb(fB)}`}, with the angle between them unchanged, the new value is:`;
    const law =
      context === 'torque'
        ? tex`$\tau = rF\sin\theta$ is proportional to both the force and its distance from the axis`
        : context === 'dot'
          ? tex`$\vec{A}\cdot\vec{B} = AB\cos\theta$ is proportional to both magnitudes`
          : tex`$|\vec{A}\times\vec{B}| = AB\sin\theta$ is proportional to both magnitudes`;
    const answer = option(product);
    // changed only one factor (either one); divided the factors; added whole-number factors;
    // squared the overall factor; inverted it
    const candidates = [
      fA,
      fB,
      fA.div(fB),
      ...(fA.isInteger() && fB.isInteger() ? [fA.add(fB)] : []),
      product.mul(product),
      product.inv(),
      fB.div(fA),
    ].map(option);
    return {
      stem,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`${law}, so it is multiplied by $${fA.toTex()} \times ${fB.toTex()} = ${product.toTex()}$ and the new value is $${coefTex(product, symbol)}$.`,
    };
  }),

  // ========================================================================================
  // Equilibrium
  // ========================================================================================

  b.dynamic('third-force-equilibrium', { difficulty: 1, tags: ['equilibrium conditions', 'vector addition'] }, (r) => {
    if (r.chance(0.5)) {
      const [p0, q0, c0] = r.pick(TRIPLES_90);
      const k = r.int(1, Math.max(1, Math.floor(50 / c0)));
      const [f1, f2] = r.chance(0.5) ? [p0 * k, q0 * k] : [q0 * k, p0 * k];
      const c = c0 * k;
      const option = (v: number, where: string): string => `${q$(v, U.N)}, ${where} their resultant`;
      return {
        stem: tex`Two forces of $${qty(f1, U.N)}$ and $${qty(f2, U.N)}$ act on a particle at right angles to each other. The third force needed to keep the particle in equilibrium is:`,
        answer: option(c, 'opposite to'),
        distractors: [option(c, 'along'), option(f1 + f2, 'opposite to'), option(Math.abs(f1 - f2), 'opposite to')],
        explanation: tex`The resultant of the two forces is $\sqrt{${f1}^2 + ${f2}^2} = ${c}\,\mathrm{N}$. For equilibrium the net force must be zero, so the third force must be equal and opposite to this resultant: $${qty(c, U.N)}$ directed opposite to it.`,
      };
    }
    const { F1, F2 } = retry(
      () => {
        const F1 = [r.nonZero(-9, 9), r.nonZero(-9, 9)];
        const F2 = [r.nonZero(-9, 9), r.nonZero(-9, 9)];
        // Every option (sum and both differences) keeps two non-zero components.
        const ok = F1[0] + F2[0] !== 0 && F1[1] + F2[1] !== 0 && F1[0] !== F2[0] && F1[1] !== F2[1];
        return ok ? { F1, F2 } : undefined;
      },
      { F1: [3, -4], F2: [-5, 2] },
    );
    const S = [F1[0] + F2[0], F1[1] + F2[1]];
    const answer = vecQ(S.map((v) => -v), 'N');
    return {
      stem: tex`Two forces $\vec{F}_1 = (${vec(F1)})\,\mathrm{N}$ and $\vec{F}_2 = (${vec(F2)})\,\mathrm{N}$ act on a particle. The third force that will keep the particle in equilibrium is:`,
      answer,
      // the resultant itself; differences of the two forces
      distractors: pickDistractors(answer, [
        vecQ(S, 'N'),
        vecQ([F1[0] - F2[0], F1[1] - F2[1]], 'N'),
        vecQ([F2[0] - F1[0], F2[1] - F1[1]], 'N'),
      ]),
      explanation: tex`For equilibrium $\vec{F}_1 + \vec{F}_2 + \vec{F}_3 = 0$, so $\vec{F}_3 = -(\vec{F}_1 + \vec{F}_2) = -(${vec(S)}) = (${vec(S.map((v) => -v))})\,\mathrm{N}$.`,
    };
  }),

  b.dynamic('beam-reactions', { difficulty: 3, tags: ['equilibrium conditions', 'torque'] }, (r) => {
    const { L, x, W, P } = retry(
      () => {
        const L = r.pick([3, 4, 5, 6, 8, 10]);
        const x = r.int(1, L - 1);
        const W = r.multiple(40, 400, 20);
        const P = r.multiple(30, 600, 10);
        return 2 * x !== L && (P * x) % L === 0 ? { L, x, W, P } : undefined;
      },
      { L: 4, x: 1, W: 200, P: 400 },
    );
    const RB = W / 2 + (P * x) / L;
    const RA = W + P - RB;
    const askA = r.chance(0.5);
    const end = askA ? 'A' : 'B';
    const pivot = askA ? 'B' : 'A';
    const correct = askA ? RA : RB;
    const loadArm = askA ? L - x : x; // distance of the load from the pivot end
    const { answer, distractors } = numericOptions(r, {
      correct,
      // moments about the wrong end; shared equally; ignored the beam's weight; ignored the load
      wrong: [askA ? RB : RA, (W + P) / 2, (P * loadArm) / L, W / 2],
      format: (v) => q$(v, U.N),
    });
    return {
      stem: tex`A uniform beam $AB$ of length $${qty(L, U.m)}$ and weight $${qty(W, U.N)}$ rests horizontally on two supports, one at each end. A load of $${qty(P, U.N)}$ is placed on it at a distance of $${qty(x, U.m)}$ from end $A$. The upward force exerted on the beam by the support at $${end}$ is:`,
      answer,
      distractors,
      explanation: tex`Take moments about $${pivot}$ (second condition of equilibrium). The weight acts at the middle, $${num(L / 2)}\,\mathrm{m}$ from $${pivot}$, and the load is $${loadArm}\,\mathrm{m}$ from $${pivot}$: $R_${end} \times ${L} = ${W} \times ${num(L / 2)} + ${P} \times ${loadArm}$, so $R_${end} = \frac{${(W * L) / 2} + ${P * loadArm}}{${L}} = ${correct}\,\mathrm{N}$. Check with the first condition: $R_A + R_B = ${RA} + ${RB} = ${W + P}\,\mathrm{N} = W + P$.`,
    };
  }),

  b.dynamic('metre-rule-own-weight', { difficulty: 3, tags: ['torque', 'equilibrium conditions'] }, (r) => {
    if (r.chance(0.5)) {
      // Find the mass of the rule from the balance point.
      const { p, a, m, M } = retry(
        () => {
          const p = r.int(20, 45);
          const a = r.int(0, p - 10);
          const m = r.multiple(10, 200, 10);
          if ((m * (p - a)) % (50 - p) !== 0) return undefined;
          const M = (m * (p - a)) / (50 - p);
          // The inverted-lever-arm slip must also be a whole number, so no option looks rounded.
          if ((m * (50 - p)) % (p - a) !== 0) return undefined;
          return M >= 20 && M <= 400 && M !== m ? { p, a, m, M } : undefined;
        },
        { p: 40, a: 10, m: 20, M: 60 },
      );
      const { answer, distractors } = numericOptions(r, {
        correct: M,
        // inverted the lever arms; weight's arm taken as 50 cm; mass's arm measured from the zero
        // end; weight taken at the far end. Whole numbers only, like the answer.
        wrong: [
          (m * (50 - p)) / (p - a),
          (m * (p - a)) / 50,
          (m * a) / (50 - p),
          (m * (p - a)) / (100 - p),
        ].filter((v) => Number.isInteger(v)),
        format: (v) => q$(v, U.g),
        fallback: 'integer',
      });
      return {
        stem: tex`A uniform metre rule balances horizontally on a knife-edge placed at the $${p}\,\mathrm{cm}$ mark when a mass of $${qty(m, U.g)}$ is suspended from its $${a}\,\mathrm{cm}$ mark. The mass of the metre rule is:`,
        answer,
        distractors,
        explanation: tex`The weight of a uniform rule acts at its centre, the $50\,\mathrm{cm}$ mark, which is $${50 - p}\,\mathrm{cm}$ from the knife-edge. Taking moments about the knife-edge: $${m} \times (${p} - ${a}) = M \times (50 - ${p})$, so $M = \frac{${m} \times ${p - a}}{${50 - p}} = ${M}\,\mathrm{g}$.`,
      };
    }
    // Find the balance point of a loaded rule.
    const { M, m, a, x } = retry(
      () => {
        const M = r.multiple(40, 200, 10);
        const m = r.multiple(10, 200, 10);
        const a = r.int(5, 40);
        const top = m * a + 50 * M;
        if (top % (m + M) !== 0) return undefined;
        const x = top / (m + M);
        return x !== a && x < 50 && M !== m ? { M, m, a, x } : undefined;
      },
      { M: 100, m: 50, a: 20, x: 40 },
    );
    const { answer, distractors } = numericOptions(r, {
      correct: x,
      // swapped the masses (always whole: it equals a + 50 - x); ignored the masses (midpoint);
      // put the rule's weight at its far end. Whole numbers only, like the answer.
      wrong: [(M * a + 50 * m) / (m + M), (a + 50) / 2, (m * a + 100 * M) / (m + M)].filter((v) =>
        Number.isInteger(v),
      ),
      format: (v) => `$${num(v)}\\,\\mathrm{cm}$ mark`,
      fallback: 'integer',
    });
    return {
      stem: tex`A uniform metre rule of mass $${qty(M, U.g)}$ has a mass of $${qty(m, U.g)}$ hung from its $${a}\,\mathrm{cm}$ mark. For the rule to balance horizontally, the knife-edge must be placed at the:`,
      answer,
      distractors,
      explanation: tex`Let the knife-edge be at the $x\,\mathrm{cm}$ mark. The rule's own weight acts at the $50\,\mathrm{cm}$ mark. Taking moments about the knife-edge: $${m}(x - ${a}) = ${M}(50 - x)$, so $x = \frac{${m} \times ${a} + ${M} \times 50}{${m} + ${M}} = ${x}$, the $${x}\,\mathrm{cm}$ mark.`,
    };
  }),

  b.dynamic('rope-sag-tension', { difficulty: 2, tags: ['equilibrium conditions', 'resolution'] }, (r) => {
    const W = r.pick([12, 18, 24, 30, 36, 42, 48, 54, 60, 72, 84, 90, 96, 120, 150, 180]);
    const angle = r.pick([30, 45, 60] as const);
    const fromVertical = r.chance(0.4);
    const withHorizontal = fromVertical ? 90 - angle : angle;
    // T = W / (2 sin(angle with the horizontal)); W is a multiple of 6 so every form is exact.
    const forms: Record<number, { T: string; swapped: string | null; single: string }> = {
      30: { T: String(W), swapped: surdTex(W / 3, 3), single: String(2 * W) },
      45: { T: surdTex(W / 2, 2), swapped: null, single: surdTex(W, 2) },
      60: { T: surdTex(W / 3, 3), swapped: String(W), single: surdTex((2 * W) / 3, 3) },
    };
    const { T, swapped, single } = forms[withHorizontal];
    const N = (t: string): string => q$(t, U.N);
    // sin/cos swapped; ignored the angle; forgot that two string halves share the load; full weight
    const candidates = [swapped, String(W / 2), single, String(W)].filter((c): c is string => c !== null);
    const fn = fromVertical ? '\\cos' : '\\sin';
    const value = exactTrig(fromVertical ? 'cos' : 'sin', angle)?.tex ?? '';
    return {
      stem: tex`A picture of weight $${qty(W, U.N)}$ hangs at rest from a nail by a light string tied to two points on its frame. The two halves of the string are symmetric, each making an angle of $${angle}^{\circ}$ with the ${fromVertical ? 'vertical' : 'horizontal'}. The tension in the string is:`,
      answer: N(T),
      distractors: pickDistractors(N(T), candidates.map(N)),
      explanation: tex`The horizontal components of the two tensions cancel. With $${fromVertical ? '\\alpha' : '\\theta'}$ the angle each half makes with the ${fromVertical ? 'vertical' : 'horizontal'}, vertical equilibrium gives $2T${fn}${fromVertical ? '\\alpha' : '\\theta'} = W$, so $T = \frac{W}{2${fn} ${angle}^{\circ}} = \frac{${W}}{2 \times ${value}} = ${T}\,\mathrm{N}$.`,
    };
  }),

  // ========================================================================================
  // Conceptual items
  // ========================================================================================

  ...b.mcqs([
    {
      id: 'min-unequal-coplanar-forces',
      d: 1,
      o: 'past-paper',
      t: ['vector addition', 'equilibrium conditions'],
      q: 'The minimum number of unequal coplanar forces whose vector sum can be zero is:',
      a: 'three',
      x: ['two', 'four', 'one'],
      e: tex`Two unequal forces can never cancel: their resultant is at least $|F_1 - F_2| > 0$. Three unequal forces can be drawn head to tail to form a closed triangle, so their vector sum can be zero.`,
    },
    {
      id: 'sum-equals-difference-angle',
      d: 2,
      o: 'past-paper',
      t: ['vector addition', 'dot and cross product'],
      q: tex`If $|\vec{A} + \vec{B}| = |\vec{A} - \vec{B}|$ for two non-zero vectors $\vec{A}$ and $\vec{B}$, the angle between them is:`,
      a: tex`$90^{\circ}$`,
      x: [tex`$0^{\circ}$`, tex`$45^{\circ}$`, tex`$180^{\circ}$`],
      e: tex`Squaring both sides: $A^2 + B^2 + 2\vec{A}\cdot\vec{B} = A^2 + B^2 - 2\vec{A}\cdot\vec{B}$, so $\vec{A}\cdot\vec{B} = AB\cos\theta = 0$ and $\theta = 90^{\circ}$.`,
    },
    {
      id: 'equal-forces-equal-resultant',
      d: 2,
      o: 'past-paper',
      t: ['vector addition'],
      q: 'Two forces of equal magnitude $F$ act at a point. If their resultant also has magnitude $F$, the angle between the two forces is:',
      a: tex`$120^{\circ}$`,
      x: [tex`$60^{\circ}$`, tex`$90^{\circ}$`, tex`$180^{\circ}$`],
      e: tex`$R^2 = F^2 + F^2 + 2F^2\cos\theta$. Putting $R = F$ gives $1 = 2 + 2\cos\theta$, so $\cos\theta = -\frac{1}{2}$ and $\theta = 120^{\circ}$. (At $60^{\circ}$ the resultant would be $\sqrt{3}\,F$.)`,
    },
    {
      id: 'cross-root3-times-dot',
      d: 2,
      t: ['dot and cross product'],
      q: tex`If $|\vec{A}\times\vec{B}| = \sqrt{3}\,(\vec{A}\cdot\vec{B})$, the angle between $\vec{A}$ and $\vec{B}$ is:`,
      a: tex`$60^{\circ}$`,
      x: [tex`$30^{\circ}$`, tex`$45^{\circ}$`, tex`$90^{\circ}$`],
      e: tex`$AB\sin\theta = \sqrt{3}\,AB\cos\theta$, so $\tan\theta = \sqrt{3}$ and $\theta = 60^{\circ}$. (At $30^{\circ}$ the cross product would be $\frac{1}{\sqrt{3}}$ times the dot product.)`,
    },
    {
      id: 'resultant-perpendicular-to-smaller',
      d: 3,
      t: ['vector addition', 'resolution'],
      q: tex`Two forces of magnitudes $F$ and $\sqrt{2}\,F$ act at a point, and their resultant is perpendicular to the smaller force. The angle between the two forces is:`,
      a: tex`$135^{\circ}$`,
      x: [tex`$45^{\circ}$`, tex`$90^{\circ}$`, tex`$120^{\circ}$`],
      e: tex`The resultant has no component along the smaller force: $F + \sqrt{2}\,F\cos\theta = 0$, so $\cos\theta = -\frac{1}{\sqrt{2}}$ and $\theta = 135^{\circ}$. (The resultant then has magnitude $\sqrt{F^2 + 2F^2 - 2F^2} = F$.)`,
    },
    {
      id: 'torque-same-dimensions-as-work',
      d: 1,
      o: 'past-paper',
      t: ['torque'],
      q: 'Torque has the same dimensions as:',
      a: 'work',
      x: ['force', 'power', 'angular momentum'],
      e: tex`$\tau = rF\sin\theta$ has dimensions $[ML^2T^{-2}]$, the same as work, $W = Fd$. Torque is a vector and work is a scalar, so torque is expressed in $\mathrm{N\,m}$ rather than joules.`,
    },
    {
      id: 'couple-produces-rotation',
      d: 2,
      t: ['torque', 'equilibrium conditions'],
      q: 'A couple acting on a rigid body produces:',
      a: 'rotation only',
      x: ['translation only', 'both translation and rotation', 'neither translation nor rotation'],
      e: 'The two forces of a couple are equal, opposite and parallel but act along different lines. Their vector sum is zero, so there is no translation; their torque (one force times the perpendicular distance between them) is not zero, so the body rotates.',
    },
    {
      id: 'body-not-in-equilibrium',
      d: 2,
      o: 'past-paper',
      t: ['equilibrium conditions'],
      q: 'Which of the following bodies is **not** in equilibrium?',
      a: 'A ball at the highest point of its vertical upward flight',
      x: [
        'A book lying at rest on a horizontal table',
        'A car moving with constant velocity on a straight road',
        'A raindrop falling with constant terminal velocity',
      ],
      e: tex`At the highest point the ball is momentarily at rest, but the only force on it is its weight, so it accelerates downward at $g$. A body is in equilibrium only when the net force on it is zero, which is true for the book, the car and the raindrop.`,
    },
    {
      id: 'cross-product-direction',
      d: 1,
      t: ['dot and cross product'],
      q: tex`The vector product $\vec{A}\times\vec{B}$ of two non-parallel vectors is directed:`,
      a: tex`perpendicular to the plane containing $\vec{A}$ and $\vec{B}$`,
      x: [
        tex`along $\vec{A}$, in the plane of the two vectors`,
        tex`along $\vec{B}$, in the plane of the two vectors`,
        tex`along the bisector of the angle between $\vec{A}$ and $\vec{B}$`,
      ],
      e: tex`By definition $\vec{A}\times\vec{B} = AB\sin\theta\,\hat{n}$, where the unit vector $\hat{n}$ is perpendicular to the plane of $\vec{A}$ and $\vec{B}$, with its sense given by the right-hand rule.`,
    },
    {
      id: 'a-dot-a-cross-b',
      d: 2,
      t: ['dot and cross product'],
      q: tex`For two vectors $\vec{A}$ and $\vec{B}$ with angle $\theta$ between them, $\vec{A}\cdot(\vec{A}\times\vec{B})$ equals:`,
      a: '$0$',
      x: [tex`$A^2B\sin\theta$`, tex`$A^2B\cos\theta$`, tex`$AB\sin\theta$`],
      e: tex`$\vec{A}\times\vec{B}$ is perpendicular to $\vec{A}$, so the angle between $\vec{A}$ and $\vec{A}\times\vec{B}$ is $90^{\circ}$ and their scalar product is $A\,|\vec{A}\times\vec{B}|\cos 90^{\circ} = 0$.`,
    },
    {
      id: 'second-condition-meaning',
      d: 2,
      t: ['equilibrium conditions', 'torque'],
      q: tex`The second condition of equilibrium, $\Sigma\vec{\tau} = 0$, ensures that a body has no:`,
      a: 'angular acceleration',
      x: ['angular velocity', 'angular momentum', 'linear velocity'],
      e: tex`Zero net torque means zero angular acceleration ($\tau = I\alpha$): the body is either not rotating or rotating with constant angular velocity, and hence constant angular momentum. It may also move with constant linear velocity; linear acceleration is ruled out by the first condition, $\Sigma\vec{F} = 0$.`,
    },
    {
      id: 'zero-torque-condition',
      d: 1,
      t: ['torque'],
      q: 'The torque of a force about an axis is zero when:',
      a: 'the line of action of the force passes through the axis',
      x: [
        'the force is perpendicular to the position vector',
        'the force is applied at the point farthest from the axis',
        'the moment arm of the force is at its maximum',
      ],
      e: tex`$\tau = F \times (\text{moment arm})$. When the line of action passes through the axis the moment arm is zero ($\vec{r}$ is parallel to $\vec{F}$, so $\sin\theta = 0$) and $\tau = 0$. A force perpendicular to $\vec{r}$ gives the maximum torque.`,
    },
    {
      id: 'equal-forces-zero-resultant',
      d: 1,
      o: 'past-paper',
      t: ['vector addition'],
      q: 'Two forces of equal magnitude act at a point. Their resultant is zero when the angle between them is:',
      a: tex`$180^{\circ}$`,
      x: [tex`$0^{\circ}$`, tex`$90^{\circ}$`, tex`$120^{\circ}$`],
      e: tex`$R^2 = F^2 + F^2 + 2F^2\cos\theta = 2F^2(1 + \cos\theta)$, which is zero only when $\cos\theta = -1$, i.e. $\theta = 180^{\circ}$ (equal and opposite forces). At $0^{\circ}$, $90^{\circ}$ and $120^{\circ}$ the resultant is $2F$, $\sqrt{2}\,F$ and $F$ respectively.`,
    },
    {
      id: 'component-not-exceed-magnitude',
      d: 2,
      t: ['resolution'],
      q: 'Which statement about a rectangular component of a vector is correct?',
      a: 'It can never be greater than the magnitude of the vector.',
      x: [
        'It is always smaller than the magnitude of the vector.',
        tex`It is greater than the magnitude of the vector when the vector makes an angle of more than $45^{\circ}$ with the axis.`,
        'It can never be zero for a non-zero vector.',
      ],
      e: tex`$A_x = A\cos\theta$ and $|\cos\theta| \le 1$, so $|A_x| \le A$. The component equals $A$ when the vector lies along the axis (so it is not always smaller) and is zero when the vector is perpendicular to the axis.`,
    },
    {
      id: 'vector-product-quantity',
      d: 1,
      t: ['dot and cross product', 'torque'],
      q: 'Which of the following physical quantities is defined as the vector product of two vectors?',
      a: 'torque',
      x: ['work', 'power', 'electric flux'],
      e: tex`$\vec{\tau} = \vec{r}\times\vec{F}$ is a vector product. Work ($\vec{F}\cdot\vec{d}$), power ($\vec{F}\cdot\vec{v}$) and electric flux ($\vec{E}\cdot\vec{A}$) are scalar products.`,
    },
    {
      id: 'cross-product-anticommutative',
      d: 1,
      t: ['dot and cross product'],
      q: tex`Which of the following relations is true for any two vectors $\vec{A}$ and $\vec{B}$?`,
      a: tex`$\vec{A}\times\vec{B} = -\vec{B}\times\vec{A}$`,
      x: [
        tex`$\vec{A}\times\vec{B} = \vec{B}\times\vec{A}$`,
        tex`$\vec{A}\cdot\vec{B} = -\vec{B}\cdot\vec{A}$`,
        tex`$|\vec{A}\times\vec{B}| = AB\cos\theta$`,
      ],
      e: tex`The vector product is anticommutative: reversing the order reverses the direction given by the right-hand rule, so $\vec{B}\times\vec{A} = -\vec{A}\times\vec{B}$. The scalar product is commutative, $\vec{A}\cdot\vec{B} = \vec{B}\cdot\vec{A}$, and $|\vec{A}\times\vec{B}| = AB\sin\theta$.`,
    },
    {
      id: 'cross-product-zero-parallel',
      d: 1,
      t: ['dot and cross product'],
      q: tex`If $\vec{A}\times\vec{B} = 0$ for two non-zero vectors $\vec{A}$ and $\vec{B}$, the two vectors are:`,
      a: 'parallel or antiparallel',
      x: ['perpendicular to each other', 'equal in magnitude', tex`inclined at $45^{\circ}$ to each other`],
      e: tex`$|\vec{A}\times\vec{B}| = AB\sin\theta = 0$ with $A \ne 0$ and $B \ne 0$ requires $\sin\theta = 0$, i.e. $\theta = 0^{\circ}$ or $180^{\circ}$.`,
    },
    {
      id: 'cross-product-area',
      d: 1,
      t: ['dot and cross product'],
      q: tex`The magnitude of the vector product $\vec{A}\times\vec{B}$ is equal to the area of the:`,
      a: tex`parallelogram that has $\vec{A}$ and $\vec{B}$ as adjacent sides`,
      x: [
        tex`triangle that has $\vec{A}$ and $\vec{B}$ as two of its sides`,
        tex`rectangle whose sides have lengths $A$ and $B$`,
        tex`parallelogram that has $\vec{A} + \vec{B}$ and $\vec{A} - \vec{B}$ as adjacent sides`,
      ],
      e: tex`$|\vec{A}\times\vec{B}| = AB\sin\theta$ is base $\times$ height of the parallelogram with sides $\vec{A}$ and $\vec{B}$. The triangle has half this area, a rectangle of sides $A$ and $B$ has area $AB$ (equal only when $\theta = 90^{\circ}$), and $|(\vec{A} + \vec{B})\times(\vec{A} - \vec{B})| = 2|\vec{A}\times\vec{B}|$.`,
    },
    {
      id: 'translational-equilibrium',
      d: 1,
      t: ['equilibrium conditions'],
      q: 'A body is in translational equilibrium when:',
      a: 'the vector sum of all the forces acting on it is zero',
      x: [
        'the vector sum of all the torques acting on it is zero',
        'it is momentarily at rest',
        'all the forces acting on it have equal magnitudes',
      ],
      e: tex`The first condition of equilibrium, $\Sigma\vec{F} = 0$, means zero linear acceleration: translational equilibrium. Zero net torque is the second condition (rotational equilibrium), and a body momentarily at rest, such as a ball at the top of its flight, can still be accelerating.`,
    },
    {
      id: 'dynamic-equilibrium-example',
      d: 1,
      t: ['equilibrium conditions'],
      q: 'A paratrooper descending with a constant (terminal) velocity is in:',
      a: 'dynamic equilibrium',
      x: ['static equilibrium', 'unstable equilibrium', 'no equilibrium, because he is moving'],
      e: 'Air resistance balances his weight, so the net force on him is zero and he is in equilibrium. A body in equilibrium while moving with uniform velocity is in dynamic equilibrium; static equilibrium describes a body at rest.',
    },
  ]),
]);
