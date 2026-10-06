import { defineBank } from '@/engine/authoring';
import {
  exactTrig,
  Fraction,
  gcd,
  num,
  numericOptions,
  ordinal,
  pickDistractors,
  qty,
  tex,
  U,
} from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

/*
 * Motion and Force (FSc Part I): kinematics, equations of motion, Newton's laws,
 * momentum and impulse, collisions and projectile motion.
 *
 * Every numerical item takes g = 10 m s^-2 and says so in the stem. Parameters are
 * drawn so that the correct answer is exact (an integer or a short decimal), and the
 * distractors come from the mistakes candidates really make.
 */

const G = 10;
const G_NOTE = tex`taking $g = 10\,\mathrm{m\,s^{-2}}$`;
const MPS = tex`\,\mathrm{m\,s^{-1}}`;
const KG_PER_S = 'kg\\,s^{-1}';
const N_S = 'N\\,s';

/** True when `x` has at most `sig` significant figures, so it can be printed exactly. */
const isExact = (x: number, sig = 4): boolean => Number(x.toPrecision(sig)) === Number(x.toPrecision(12));

/** Exact terminating decimals print in full (up to 6 s.f.); anything else is rounded to 3 s.f. */
const fmt = (x: number): string => num(x, { sig: isExact(x, 6) ? 6 : 3 });

/** An option with a unit, e.g. `$12.5\,\mathrm{m\,s^{-1}}$`. */
const opt = (x: number, unit: string): string => `$${qty(fmt(x), unit)}$`;

/**
 * Options for a numerical answer with a unit. Mistake values within 3% of the answer are
 * dropped first: an option that close reads as a rounding trap rather than a different method.
 */
function choices(
  r: Rng,
  correct: number,
  wrong: readonly number[],
  unit: string,
  flags: { allowNegative?: boolean; allowZero?: boolean } = {},
): { answer: string; distractors: string[] } {
  const apart = wrong.filter((w) => Math.abs(w - correct) >= 0.03 * Math.abs(correct));
  return numericOptions(r, { correct, wrong: apart, format: (x) => opt(x, unit), ...flags });
}

/** Draws parameters until `ok` accepts them. Uses only the seeded rng, so it stays deterministic. */
function draw<T>(make: () => T, ok: (value: T) => boolean): T {
  for (let i = 0; i < 500; i++) {
    const value = make();
    if (ok(value)) return value;
  }
  throw new Error('motion-force: could not draw valid parameters');
}

/** Exact LaTeX value of sin at a standard angle. */
const sinTex = (deg: number): string => exactTrig('sin', deg)?.tex ?? '';

// ---------------------------------------------------------------------------
// Kinematics data
// ---------------------------------------------------------------------------

/**
 * Speed pairs whose harmonic mean 2ab/(a + b) is a whole number. The faster speed is at
 * least 1.5 times the slower one, so the harmonic and arithmetic means differ clearly.
 */
function harmonicPairs(lo: number, hi: number, step: number): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (let a = lo; a <= hi; a += step) {
    for (let b = a + step; b <= hi; b += step) {
      if ((2 * a * b) % (a + b) === 0 && 2 * b >= 3 * a) out.push([a, b]);
    }
  }
  return out;
}
const KMH_PAIRS = harmonicPairs(10, 120, 5);
const MPS_PAIRS = harmonicPairs(2, 24, 1);

/** Velocity-time graph: rest -> v in t1, constant until t2, back to rest at t3. Drawn for a white background. */
function vtGraphSvg(v: number, t1: number, t2: number, t3: number): string {
  const ox = 56;
  const oy = 176;
  const w = 232;
  const top = 60;
  const x = (t: number): number => Math.round(ox + (w * t) / t3);
  const xs = [x(t1), x(t2), x(t3)];
  const [a, b, c] = xs;
  const ticks = [t1, t2, t3]
    .map((t, i) => `<text x="${xs[i]}" y="${oy + 19}" text-anchor="middle">${t}</text>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="206" viewBox="0 0 340 206" font-family="Times New Roman, serif" font-size="14" fill="#000">` +
    `<path d="M${ox} ${oy}H${ox + w + 30}M${ox} ${oy}V${top - 32}" stroke="#000" stroke-width="1.4" fill="none"/>` +
    `<path d="M${ox + w + 36} ${oy}l-10 -4v8zM${ox} ${top - 38}l-4 10h8z"/>` +
    `<path d="M${ox} ${top}H${a}M${a} ${top}V${oy}M${b} ${top}V${oy}" stroke="#666" stroke-width="1" stroke-dasharray="4 3" fill="none"/>` +
    `<polyline points="${ox},${oy} ${a},${top} ${b},${top} ${c},${oy}" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<text x="${ox - 8}" y="${top + 5}" text-anchor="end">${v}</text>` +
    `<text x="${ox - 6}" y="${oy + 19}" text-anchor="end">0</text>` +
    ticks +
    `<text x="${ox + 10}" y="${top - 30}">v (m s⁻¹)</text>` +
    `<text x="${ox + w + 36}" y="${oy - 10}" text-anchor="end">t (s)</text>` +
    `</svg>`
  );
}

interface GraphFact {
  stem: string;
  answer: string;
  /** Definitely-wrong readings of the same graph (three are drawn per instance). */
  wrong: readonly string[];
  why: string;
}

const GRAPH_FACTS: readonly GraphFact[] = [
  {
    stem: 'The slope of a displacement-time graph gives the:',
    answer: 'velocity',
    wrong: ['acceleration', 'displacement', 'impulse', 'net force', 'change in velocity'],
    why: tex`Slope $= \frac{\Delta d}{\Delta t}$, the rate of change of displacement, which is velocity.`,
  },
  {
    stem: 'The slope of a velocity-time graph gives the:',
    answer: 'acceleration',
    wrong: ['velocity', 'displacement', 'impulse', 'momentum', 'kinetic energy'],
    why: tex`Slope $= \frac{\Delta v}{\Delta t}$, the rate of change of velocity, which is acceleration. (The area under the same graph gives displacement.)`,
  },
  {
    stem: 'The area under a velocity-time graph gives the:',
    answer: 'displacement',
    wrong: ['acceleration', 'velocity', 'impulse', 'momentum', 'net force'],
    why: tex`Each thin strip of area is $v\,\Delta t$, a small displacement; adding the strips gives the displacement. (The slope gives acceleration.)`,
  },
  {
    stem: 'The area under an acceleration-time graph gives the:',
    answer: 'change in velocity',
    wrong: ['displacement', 'acceleration', 'net force', 'kinetic energy'],
    why: tex`Each thin strip of area is $a\,\Delta t = \Delta v$, so the total area equals the change in velocity.`,
  },
  {
    stem: 'The area under a force-time graph gives the:',
    answer: 'impulse',
    wrong: ['work done', 'power', 'acceleration', 'kinetic energy', 'displacement'],
    why: tex`Each thin strip of area is $F\,\Delta t$, so the area is the impulse (equal to the change in momentum). Work done is the area under a force-**displacement** graph.`,
  },
  {
    stem: 'The slope of a momentum-time graph gives the:',
    answer: 'net force',
    wrong: ['impulse', 'kinetic energy', 'power', 'velocity', 'work done'],
    why: tex`Slope $= \frac{\Delta p}{\Delta t}$, and by Newton's second law the rate of change of momentum equals the net force. (The area under a force-time graph is impulse.)`,
  },
];

// ---------------------------------------------------------------------------
// Newton's laws and collisions data
// ---------------------------------------------------------------------------

/**
 * [m1, m2] (kg) for which the connected-body answers are exact with g = 10. For the
 * Atwood machine m1 >= 1.5 m2, so the tension is clearly below the mean of the weights.
 */
function connectedPairs(atwood: boolean): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (let m1 = 1; m1 <= 12; m1++) {
    for (let m2 = 1; m2 <= 12; m2++) {
      if (atwood ? 2 * m1 < 3 * m2 : m2 === m1) continue;
      const a = atwood ? ((m1 - m2) * G) / (m1 + m2) : (m2 * G) / (m1 + m2);
      const t = atwood ? (2 * m1 * m2 * G) / (m1 + m2) : (m1 * m2 * G) / (m1 + m2);
      if (isExact(a, 3) && isExact(t)) out.push([m1, m2]);
    }
  }
  return out;
}
const ATWOOD_PAIRS = connectedPairs(true);
const TABLE_PAIRS = connectedPairs(false);

/** Mass ratios m1 : m2 for elastic collisions with a stationary target. */
const ELASTIC_RATIOS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, 2],
  [2, 1],
  [1, 3],
  [3, 1],
  [2, 3],
  [3, 2],
  [1, 4],
  [4, 1],
];

// ---------------------------------------------------------------------------
// Projectile data: values of the form c * sqrt(r) so options stay exact
// ---------------------------------------------------------------------------

interface Surd {
  c: number;
  r: 1 | 2 | 3;
}
type StdAngle = 30 | 45 | 60;
const SIN: Record<StdAngle, Surd> = { 30: { c: 0.5, r: 1 }, 45: { c: 0.5, r: 2 }, 60: { c: 0.5, r: 3 } };
const COS: Record<StdAngle, Surd> = { 30: { c: 0.5, r: 3 }, 45: { c: 0.5, r: 2 }, 60: { c: 0.5, r: 1 } };
const SIN_2X: Record<StdAngle, Surd> = { 30: { c: 0.5, r: 3 }, 45: { c: 1, r: 1 }, 60: { c: 0.5, r: 3 } };
const SIN_SQ: Record<StdAngle, number> = { 30: 0.25, 45: 0.5, 60: 0.75 };
const COS_SQ: Record<StdAngle, number> = { 30: 0.75, 45: 0.5, 60: 0.25 };

const scaled = (s: Surd, k: number): Surd => ({ c: s.c * k, r: s.r });
const plain = (c: number): Surd => ({ c, r: 1 });
function surdTexOf(s: Surd): string {
  const c = fmt(s.c);
  if (s.r === 1) return c;
  return `${c === '1' ? '' : c}\\sqrt{${s.r}}`;
}
const surdOpt = (s: Surd, unit: string): string => `$${surdTexOf(s)}\\,\\mathrm{${unit}}$`;

function angledLaunch(r: Rng): AuthoredQuestion {
  const k = r.int(1, 6);
  const u = 10 * k;
  const th = r.pick([30, 45, 60] as const);
  const ask = r.pick(['range', 'height', 'time'] as const);
  // With u = 10k and g = 10: u^2/g = 10k^2, u^2/(2g) = 5k^2 and 2u/g = 2k.
  const range = scaled(SIN_2X[th], 10 * k * k);
  const height = plain(5 * k * k * SIN_SQ[th]);
  const time = scaled(SIN[th], 2 * k);
  const lead = tex`A ball is projected from level ground with a velocity of $${qty(u, U.mps)}$ at an angle of $${th}^{\circ}$ above the horizontal. Neglecting air resistance and ${G_NOTE},`;

  if (ask === 'range') {
    const answer = surdOpt(range, U.m);
    const wrong = [
      scaled(range, 0.5), // used 2g as in the height formula
      plain(10 * k * k), // used the maximum-range result u^2/g
      scaled(SIN[th], 10 * k * k), // sin(theta) instead of sin(2 theta)
      scaled(range, 2),
      height,
    ];
    return {
      stem: tex`${lead} its horizontal range is:`,
      answer,
      distractors: pickDistractors(answer, wrong.map((s) => surdOpt(s, U.m))),
      explanation: tex`$R = \frac{v_i^2\sin 2\theta}{g} = \frac{(${u})^2 \times \sin ${2 * th}^{\circ}}{10} = \frac{${u * u} \times ${sinTex(2 * th)}}{10} = ${surdTexOf(range)}\,\mathrm{m}$.`,
    };
  }
  if (ask === 'height') {
    const answer = surdOpt(height, U.m);
    const wrong = [
      scaled(height, 2), // forgot the 2 in 2g
      plain(5 * k * k * COS_SQ[th]), // cos instead of sin
      scaled(SIN[th], 5 * k * k), // sin(theta) instead of sin^2(theta)
      plain(5 * k * k), // ignored the angle (vertical throw)
      scaled(SIN_2X[th], 5 * k * k),
      range, // confused the maximum height with the range
      scaled(height, 0.5),
    ];
    return {
      stem: tex`${lead} the maximum height it reaches is:`,
      answer,
      distractors: pickDistractors(answer, wrong.map((s) => surdOpt(s, U.m))),
      explanation: tex`$H = \frac{v_i^2\sin^2\theta}{2g} = \frac{(${u})^2 \times \left(${sinTex(th)}\right)^2}{2 \times 10} = ${surdTexOf(height)}\,\mathrm{m}$.`,
    };
  }
  const answer = surdOpt(time, U.s);
  const wrong = [
    scaled(time, 0.5), // time to reach the highest point only
    scaled(COS[th], 2 * k), // cos instead of sin
    plain(2 * k), // ignored the angle
    scaled(time, 2),
  ];
  return {
    stem: tex`${lead} its time of flight is:`,
    answer,
    distractors: pickDistractors(answer, wrong.map((s) => surdOpt(s, U.s))),
    explanation: tex`$T = \frac{2v_i\sin\theta}{g} = \frac{2 \times ${u} \times ${sinTex(th)}}{10} = ${surdTexOf(time)}\,\mathrm{s}$.`,
  };
}

/**
 * Horizontal speeds u (5 to 60) for which sqrt(u^2 + vy^2) is a whole number and clearly
 * larger than either component (so "one component only" is not a near-copy of the answer).
 */
function pythagoreanPartners(vy: number): number[] {
  const out: number[] = [];
  for (let u = 5; u <= 60; u++) {
    const v = Math.hypot(u, vy);
    if (Number.isInteger(v) && v - Math.max(u, vy) >= 0.05 * v) out.push(u);
  }
  return out;
}

function horizontalLaunch(r: Rng): AuthoredQuestion {
  const ask = r.pick(['time', 'distance', 'speed'] as const);
  const t = ask === 'speed' ? r.pick([1, 2, 3, 4, 6]) : r.int(2, 6);
  const h = (G * t * t) / 2;
  const vy = G * t;
  const u = ask === 'speed' ? r.pick(pythagoreanPartners(vy)) : r.multiple(5, 40, 5);
  const lead = tex`A ball is thrown horizontally with a speed of $${qty(u, U.mps)}$ from the top of a cliff $${qty(h, U.m)}$ high. Neglecting air resistance and ${G_NOTE},`;
  const timeStep = tex`$h = \frac{1}{2}gt^2 \Rightarrow t = \sqrt{\frac{2h}{g}} = \sqrt{\frac{2 \times ${h}}{10}} = ${t}\,\mathrm{s}$`;

  if (ask === 'time') {
    // forgot the root, forgot the 2, divided height by horizontal speed, gave v_y = gt instead, used h/g
    const { answer, distractors } = choices(r, t, [t * t, t / Math.SQRT2, h / u, vy, (t * t) / 2], U.s);
    return {
      stem: tex`${lead} the time taken by the ball to reach the ground is:`,
      answer,
      distractors,
      explanation: tex`The ball starts with zero vertical velocity, so ${timeStep}. The horizontal speed does not affect the time of fall.`,
    };
  }
  if (ask === 'distance') {
    const x = u * t;
    // forgot the square root, forgot the 2, straight-line distance from the launch point
    const { answer, distractors } = choices(r, x, [u * t * t, x / Math.SQRT2, Math.hypot(x, h)], U.m);
    return {
      stem: tex`${lead} the horizontal distance from the foot of the cliff to the point where the ball lands is:`,
      answer,
      distractors,
      explanation: tex`Time of fall: ${timeStep}. The horizontal velocity stays constant, so $x = v_x t = ${u} \times ${t} = ${x}\,\mathrm{m}$.`,
    };
  }
  const v = Math.hypot(u, vy);
  // added the components as scalars, vertical part only, horizontal part only, used v_y^2 = gh
  const { answer, distractors } = choices(r, v, [u + vy, vy, u, Math.sqrt(u * u + G * h)], U.mps);
  return {
    stem: tex`${lead} the speed with which the ball strikes the ground is:`,
    answer,
    distractors,
    explanation: tex`Time of fall: ${timeStep}, so $v_y = gt = 10 \times ${t} = ${vy}${MPS}$ while $v_x = ${u}${MPS}$ stays constant. $v = \sqrt{v_x^2 + v_y^2} = \sqrt{${u}^2 + ${vy}^2} = ${v}${MPS}$.`,
  };
}

// ---------------------------------------------------------------------------
// "If X is doubled" scaling data
// ---------------------------------------------------------------------------

/** `n` when `y` is (numerically) the whole number n, otherwise null. */
function whole(y: number): number | null {
  const n = Math.round(y);
  return Math.abs(y - n) < 1e-9 ? n : null;
}

/** A factor as LaTeX: 4, \frac{1}{4}, \sqrt{2} or \frac{1}{\sqrt{2}}. */
function factorTex(f: number): string {
  const big = f >= 1 ? f : 1 / f;
  const n = whole(big);
  const sq = whole(big * big);
  if (n === null && sq === null) throw new Error(`motion-force: no exact form for the factor ${f}`);
  const body = n !== null ? String(n) : `\\sqrt{${sq}}`;
  return f >= 1 ? body : `\\frac{1}{${body}}`;
}

/** `f` times the symbol `x` as LaTeX: 4R, \frac{R}{4}, \sqrt{2}\,R, \frac{R}{\sqrt{2}} or R. */
function timesTex(f: number, x: string): string {
  if (whole(f) === 1) return x;
  const t = factorTex(f);
  if (f > 1) return t.startsWith('\\') ? `${t}\\,${x}` : `${t}${x}`;
  return `\\frac{${x}}{${t.slice('\\frac{1}{'.length, -1)}}`;
}

interface ScalingCase {
  /** The asked quantity is proportional to (changed variable)^power. */
  power: 0.5 | 1 | 2;
  /** Factors applied to the changed variable. */
  ks: readonly number[];
  /** Symbol of the changed variable and of the asked quantity. */
  variable: string;
  symbol: string;
  stem: (changed: string) => string;
  why: string;
}

const SCALING_CASES: readonly ScalingCase[] = [
  {
    power: 2,
    ks: [2, 3, 0.5],
    variable: 'v',
    symbol: 'R',
    stem: (kv) =>
      tex`A projectile launched from level ground with speed $v$ at an angle $\theta$ above the horizontal has a horizontal range $R$. If it is launched with speed $${kv}$ at the same angle, its horizontal range becomes (neglect air resistance):`,
    why: tex`$R = \frac{v^2\sin 2\theta}{g}$, so at a fixed angle $R \propto v^2$.`,
  },
  {
    power: 2,
    ks: [2, 3, 0.5],
    variable: 'v',
    symbol: 'H',
    stem: (kv) =>
      tex`A projectile launched with speed $v$ at an angle $\theta$ above the horizontal rises to a maximum height $H$. If it is launched with speed $${kv}$ at the same angle, its maximum height becomes (neglect air resistance):`,
    why: tex`$H = \frac{v^2\sin^2\theta}{2g}$, so at a fixed angle $H \propto v^2$.`,
  },
  {
    power: 1,
    ks: [2, 3, 0.5],
    variable: 'v',
    symbol: 'T',
    stem: (kv) =>
      tex`A projectile launched from level ground with speed $v$ at an angle $\theta$ above the horizontal has a time of flight $T$. If it is launched with speed $${kv}$ at the same angle, its time of flight becomes (neglect air resistance):`,
    why: tex`$T = \frac{2v\sin\theta}{g}$, so at a fixed angle $T \propto v$.`,
  },
  {
    power: 0.5,
    ks: [4, 9, 0.25],
    variable: 'h',
    symbol: 't',
    stem: (kh) =>
      tex`A stone dropped from rest from a height $h$ takes a time $t$ to reach the ground. If it is dropped from a height $${kh}$ instead, the time it takes to reach the ground is (neglect air resistance):`,
    why: tex`$h = \frac{1}{2}gt^2$ gives $t = \sqrt{\frac{2h}{g}}$, so $t \propto \sqrt{h}$.`,
  },
  {
    power: 2,
    ks: [2, 3, 0.5],
    variable: 't',
    symbol: 'h',
    stem: (kt) =>
      tex`A stone dropped from rest falls through a distance $h$ in a time $t$. Neglecting air resistance, the distance it falls in a time $${kt}$ from the moment it is released is:`,
    why: tex`Starting from rest, $h = \frac{1}{2}gt^2$, so $h \propto t^2$.`,
  },
];

export default defineBank('physics', 'motion-force', (b) => [
  // -------------------------------------------------------------------------
  // Kinematics
  // -------------------------------------------------------------------------
  b.dynamic('average-speed-equal-halves', { difficulty: 2, origin: 'past-paper', tags: ['kinematics'] }, (r) => {
    const road = r.chance(0.6);
    const [lo, hi] = r.pick(road ? KMH_PAIRS : MPS_PAIRS);
    const [v1, v2] = r.chance(0.5) ? [lo, hi] : [hi, lo];
    const unit = road ? U.kmph : U.mps;
    const unitTex = tex`\,\mathrm{${unit}}`;
    const mover = road ? r.pick(['car', 'bus', 'train', 'van']) : r.pick(['cyclist', 'runner', 'boy']);
    const harmonic = (2 * v1 * v2) / (v1 + v2);
    const arithmetic = (v1 + v2) / 2;
    const byDistance = r.chance(0.65);
    const { answer, distractors } = byDistance
      ? choices(r, harmonic, [arithmetic, harmonic / 2, v1 + v2], unit) // simple mean, forgot the 2, added speeds
      : choices(r, arithmetic, [harmonic, v1 + v2, harmonic / 2], unit); // equal-distance result, added speeds
    const s1 = qty(v1, unit);
    const s2 = qty(v2, unit);
    return {
      stem: byDistance
        ? tex`A ${mover} covers the first half of the distance between two places at $${s1}$ and the second half at $${s2}$. The average speed for the whole journey is:`
        : tex`A ${mover} travels in a straight line at $${s1}$ for the first half of the total travel time and at $${s2}$ for the remaining half. The average speed for the whole journey is:`,
      answer,
      distractors,
      explanation: byDistance
        ? tex`Let each half be $d$. The total time is $\frac{d}{v_1} + \frac{d}{v_2}$, so $v_{av} = \frac{2d}{d/v_1 + d/v_2} = \frac{2v_1v_2}{v_1 + v_2} = \frac{2 \times ${v1} \times ${v2}}{${v1} + ${v2}} = ${fmt(harmonic)}${unitTex}$. The simple mean $${fmt(arithmetic)}${unitTex}$ is wrong because more time is spent at the lower speed.`
        : tex`Let each half of the time be $t$. The total distance is $v_1t + v_2t$, so $v_{av} = \frac{(v_1 + v_2)t}{2t} = \frac{v_1 + v_2}{2} = \frac{${v1} + ${v2}}{2} = ${fmt(arithmetic)}${unitTex}$. (The result $\frac{2v_1v_2}{v_1 + v_2}$ applies to equal distances, not equal times.)`,
    };
  }),

  b.dynamic('velocity-time-graph', { difficulty: 2, tags: ['kinematics', 'equations of motion'] }, (r) => {
    const t1 = r.pick([2, 4, 5]);
    const t2 = t1 + r.pick([4, 5, 6, 8, 10]);
    const t3 = t2 + r.pick([2, 4, 5, 8]);
    const v = r.pick([4, 6, 8, 10, 12, 16, 20, 24, 30]);
    const ask = r.weighted(['distance', 'acceleration', 'deceleration'] as const, [2, 1, 1]);
    const intro = 'The velocity-time graph of a car moving along a straight road is shown.';
    const figure = vtGraphSvg(v, t1, t2, t3);

    if (ask === 'distance') {
      const d = (v * (t3 + t2 - t1)) / 2;
      // whole rectangle, one big triangle, flat part only, missed the last stage, missed the first stage
      const wrong = [v * t3, (v * t3) / 2, v * (t2 - t1), (v * t1) / 2 + v * (t2 - t1), v * (t2 - t1) + (v * (t3 - t2)) / 2];
      const { answer, distractors } = choices(r, d, wrong, U.m);
      return {
        stem: `${intro} The total distance covered by the car is:`,
        answer,
        distractors,
        figure,
        explanation: tex`Distance $=$ area under the graph, a trapezium with parallel sides $${t3}\,\mathrm{s}$ and $(${t2} - ${t1})\,\mathrm{s}$: $\frac{1}{2}\left[${t3} + (${t2} - ${t1})\right] \times ${v} = ${fmt(d)}\,\mathrm{m}$.`,
      };
    }
    if (ask === 'acceleration') {
      const acc = v / t1;
      // wrong time interval, area instead of slope, inverted slope, whole time of motion
      const { answer, distractors } = choices(r, acc, [v / t2, (v * t1) / 2, t1 / v, v / t3], U.mps2);
      return {
        stem: tex`${intro} The acceleration of the car during the first $${qty(t1, U.s)}$ is:`,
        answer,
        distractors,
        figure,
        explanation: tex`Acceleration $=$ slope $= \frac{\Delta v}{\Delta t} = \frac{${v} - 0}{${t1} - 0} = ${fmt(acc)}\,\mathrm{m\,s^{-2}}$.`,
      };
    }
    const dec = v / (t3 - t2);
    // clock reading instead of the interval, area instead of slope, wrong interval, inverted slope
    const { answer, distractors } = choices(r, dec, [v / t3, (v * (t3 - t2)) / 2, v / (t3 - t1), (t3 - t2) / v], U.mps2);
    return {
      stem: `${intro} The magnitude of the deceleration of the car during the last stage of its motion is:`,
      answer,
      distractors,
      figure,
      explanation: tex`Slope of the last segment $= \frac{0 - ${v}}{${t3} - ${t2}} = -${fmt(dec)}\,\mathrm{m\,s^{-2}}$, so the deceleration is $${fmt(dec)}\,\mathrm{m\,s^{-2}}$.`,
    };
  }),

  b.dynamic('graph-slope-and-area', { difficulty: 1, tags: ['kinematics', 'momentum and impulse'] }, (r) => {
    const fact = r.pick(GRAPH_FACTS);
    return {
      stem: fact.stem,
      answer: fact.answer,
      distractors: r.sample(fact.wrong, 3),
      explanation: fact.why,
    };
  }),

  // -------------------------------------------------------------------------
  // Equations of motion
  // -------------------------------------------------------------------------
  b.dynamic('distance-in-nth-second', { difficulty: 2, origin: 'past-paper', tags: ['equations of motion'] }, (r) => {
    const freeFall = r.chance(0.35);
    // The nearest wrong option is a/2 away, so keep it at least 4% of the answer.
    const { u, a, n } = draw(
      () => ({
        u: freeFall || r.chance(0.3) ? 0 : r.int(2, 15),
        a: freeFall ? G : r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6]),
        n: r.int(3, 9),
      }),
      (p) => p.a / 2 >= 0.04 * (p.u + (p.a * (2 * p.n - 1)) / 2),
    );
    const sn = u + (a * (2 * n - 1)) / 2;
    const total = u * n + (a * n * n) / 2;
    // total distance in n s, velocity at the end of the nth second, off by one (2n + 1)
    const { answer, distractors } = choices(r, sn, [total, u + a * n, u + (a * (2 * n + 1)) / 2], U.m);
    const nth = ordinal(n);
    let stem: string;
    if (freeFall) {
      stem = tex`A stone is dropped from rest from the top of a high tower. Neglecting air resistance and ${G_NOTE}, the distance fallen by the stone during the ${nth} second of its fall is:`;
    } else if (u === 0) {
      stem = tex`A car starts from rest and moves along a straight road with a uniform acceleration of $${qty(a, U.mps2)}$. The distance it covers during the ${nth} second of its motion is:`;
    } else {
      stem = tex`A body moving in a straight line with an initial velocity of $${qty(u, U.mps)}$ has a uniform acceleration of $${qty(a, U.mps2)}$ in the direction of motion. The distance it covers during the ${nth} second is:`;
    }
    return {
      stem,
      answer,
      distractors,
      explanation: tex`Distance in the $n$th second $= v_i + \frac{a}{2}(2n - 1) = ${u} + \frac{${fmt(a)}}{2}(2 \times ${n} - 1) = ${fmt(sn)}\,\mathrm{m}$. This is the distance covered in ${n} s minus that covered in ${n - 1} s; the total distance in ${n} s would be $${fmt(total)}\,\mathrm{m}$.`,
    };
  }),

  b.dynamic('vertical-throw', { difficulty: 1, tags: ['equations of motion'] }, (r) => {
    // Even speeds and odd multiples of 5 keep u^2/20 a short terminating decimal.
    const u = r.chance(0.7) ? 2 * r.int(6, 30) : r.pick([15, 25, 35, 45, 55]);
    const ask = r.pick(['height', 'rise-time', 'flight-time'] as const);
    const lead = tex`A ball is thrown vertically upward with a speed of $${qty(u, U.mps)}$. Neglecting air resistance and ${G_NOTE},`;

    if (ask === 'height') {
      const h = (u * u) / (2 * G);
      // forgot the 2, used the whole flight time in h = gt^2/2, an extra factor 1/2
      const { answer, distractors } = choices(r, h, [(u * u) / G, (2 * u * u) / G, (u * u) / (4 * G)], U.m);
      return {
        stem: tex`${lead} the maximum height reached by the ball is:`,
        answer,
        distractors,
        explanation: tex`At the highest point $v_f = 0$. From $v_f^2 = v_i^2 - 2gh$: $h = \frac{v_i^2}{2g} = \frac{(${u})^2}{2 \times 10} = ${fmt(h)}\,\mathrm{m}$.`,
      };
    }
    if (ask === 'rise-time') {
      const t = u / G;
      // whole flight time, used t = h/u (extra 1/2), inverted ratio
      const { answer, distractors } = choices(r, t, [(2 * u) / G, u / (2 * G), G / u], U.s);
      return {
        stem: tex`${lead} the time taken by the ball to reach its highest point is:`,
        answer,
        distractors,
        explanation: tex`At the highest point $v_f = 0$. From $v_f = v_i - gt$: $t = \frac{v_i}{g} = \frac{${u}}{10} = ${fmt(t)}\,\mathrm{s}$.`,
      };
    }
    const T = (2 * u) / G;
    // upward journey only, doubled twice, quartered
    const { answer, distractors } = choices(r, T, [u / G, (4 * u) / G, u / (2 * G)], U.s);
    return {
      stem: tex`${lead} the ball returns to the thrower's hand after a time of:`,
      answer,
      distractors,
      explanation: tex`The rise takes $\frac{v_i}{g}$ and the fall back takes the same time, so $T = \frac{2v_i}{g} = \frac{2 \times ${u}}{10} = ${fmt(T)}\,\mathrm{s}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Newton's laws
  // -------------------------------------------------------------------------
  b.dynamic('lift-scale-reading', { difficulty: 2, origin: 'past-paper', tags: ['Newton laws'] }, (r) => {
    const m = r.multiple(40, 90, 5);
    const a = r.pick([1, 1.5, 2, 2.5, 3, 4]); // not g/2, where ma would equal m(g - a)
    const motion = r.weighted(
      [
        { text: tex`accelerating upward at $${qty(a, U.mps2)}$`, sign: 1 },
        { text: tex`moving downward and slowing down at $${qty(a, U.mps2)}$`, sign: 1 },
        { text: tex`accelerating downward at $${qty(a, U.mps2)}$`, sign: -1 },
        { text: tex`moving upward and slowing down at $${qty(a, U.mps2)}$`, sign: -1 },
        { text: tex`moving upward with a constant speed of $${qty(a, U.mps)}$`, sign: 0 },
      ],
      [1, 1, 1, 1, 0.7],
    );
    const reading = m * (G + motion.sign * a);
    // opposite direction of acceleration, true weight, ma alone (or: speed treated as acceleration, weightless)
    const wrong = motion.sign === 0 ? [m * (G + a), m * (G - a), 0] : [m * (G - motion.sign * a), m * G, m * a];
    const { answer, distractors } = choices(r, reading, wrong, U.N, { allowZero: true });
    let explanation: string;
    if (motion.sign > 0) {
      explanation = tex`The acceleration is upward (speeding up while rising, or slowing down while descending). Taking upward as positive, $R - mg = ma \Rightarrow R = m(g + a) = ${m} \times (10 + ${fmt(a)}) = ${fmt(reading)}\,\mathrm{N}$.`;
    } else if (motion.sign < 0) {
      explanation = tex`The acceleration is downward (speeding up while descending, or slowing down while rising). Taking downward as positive, $mg - R = ma \Rightarrow R = m(g - a) = ${m} \times (10 - ${fmt(a)}) = ${fmt(reading)}\,\mathrm{N}$.`;
    } else {
      explanation = tex`At constant velocity the acceleration is zero, so $R - mg = 0 \Rightarrow R = mg = ${m} \times 10 = ${fmt(reading)}\,\mathrm{N}$. The value of the constant speed does not matter.`;
    }
    return {
      stem: tex`A person of mass $${qty(m, U.kg)}$ stands on a weighing machine (calibrated in newtons) on the floor of a lift. If the lift is ${motion.text}, the reading of the machine is (take $g = 10\,\mathrm{m\,s^{-2}}$):`,
      answer,
      distractors,
      explanation,
    };
  }),

  b.dynamic('connected-bodies', { difficulty: 2, tags: ['Newton laws'] }, (r) => {
    const atwood = r.chance(0.5);
    const askTension = r.chance(0.5);
    const [m1, m2] = r.pick(atwood ? ATWOOD_PAIRS : TABLE_PAIRS);
    const sum = m1 + m2;
    const unit = askTension ? U.N : U.mps2;
    const finish = askTension ? 'the tension in the string' : 'the magnitude of the acceleration of the bodies';
    const tail = tex`When the system is released, ${finish} is (take $g = 10\,\mathrm{m\,s^{-2}}$):`;

    if (atwood) {
      const acc = ((m1 - m2) * G) / sum;
      const tension = (2 * m1 * m2 * G) / sum;
      const { answer, distractors } = askTension
        ? // either weight, the mean of the weights, forgot the factor 2
          choices(r, tension, [m1 * G, m2 * G, (sum * G) / 2, (m1 * m2 * G) / sum], unit)
        : // ignored the lighter weight, divided by one mass, did not divide by the mass at all
          choices(r, acc, [(m1 * G) / sum, ((m1 - m2) * G) / m1, (m1 - m2) * G], unit);
      return {
        stem: tex`Two bodies of masses $${qty(m1, U.kg)}$ and $${qty(m2, U.kg)}$ hang from the ends of a light inextensible string that passes over a light frictionless pulley. ${tail}`,
        answer,
        distractors,
        explanation: askTension
          ? tex`For the heavier body $m_1g - T = m_1a$ and for the lighter body $T - m_2g = m_2a$. Eliminating $a$: $T = \frac{2m_1m_2g}{m_1 + m_2} = \frac{2 \times ${m1} \times ${m2} \times 10}{${m1} + ${m2}} = ${fmt(tension)}\,\mathrm{N}$.`
          : tex`For the heavier body $m_1g - T = m_1a$ and for the lighter body $T - m_2g = m_2a$. Adding: $a = \frac{(m_1 - m_2)g}{m_1 + m_2} = \frac{(${m1} - ${m2}) \times 10}{${m1} + ${m2}} = ${fmt(acc)}\,\mathrm{m\,s^{-2}}$.`,
      };
    }

    const acc = (m2 * G) / sum;
    const tension = (m1 * m2 * G) / sum;
    const { answer, distractors } = askTension
      ? // the hanging weight, the Atwood result, the weight of the block
        choices(r, tension, [m2 * G, (2 * m1 * m2 * G) / sum, m1 * G], unit)
      : // left out the hanging mass, free fall, swapped the masses
        choices(r, acc, [(m2 * G) / m1, G, (m1 * G) / sum], unit);
    return {
      stem: tex`A block of mass $${qty(m1, U.kg)}$ lies on a smooth horizontal table. It is tied to a light string that passes over a frictionless pulley at the edge of the table and carries a body of mass $${qty(m2, U.kg)}$ hanging vertically. ${tail}`,
      answer,
      distractors,
      explanation: askTension
        ? tex`For the hanging body $m_2g - T = m_2a$ and for the block $T = m_1a$, so $a = \frac{m_2g}{m_1 + m_2}$ and $T = \frac{m_1m_2g}{m_1 + m_2} = \frac{${m1} \times ${m2} \times 10}{${m1} + ${m2}} = ${fmt(tension)}\,\mathrm{N}$. This is less than the hanging weight because the hanging body accelerates downward.`
        : tex`For the hanging body $m_2g - T = m_2a$ and for the block $T = m_1a$. Adding: $a = \frac{m_2g}{m_1 + m_2} = \frac{${m2} \times 10}{${m1} + ${m2}} = ${fmt(acc)}\,\mathrm{m\,s^{-2}}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Momentum and impulse
  // -------------------------------------------------------------------------
  b.dynamic('force-from-momentum-change', { difficulty: 2, tags: ['momentum and impulse', 'Newton laws'] }, (r) => {
    const mode = r.weighted(['wall-force', 'wall-impulse', 'water'] as const, [0.45, 0.2, 0.35]);

    if (mode === 'water') {
      const rate = r.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
      const v = r.int(5, 20);
      const force = rate * v;
      // assumed the water rebounds, used the average speed, rate of kinetic energy
      const { answer, distractors } = choices(r, force, [2 * force, force / 2, (rate * v * v) / 2], U.N);
      return {
        stem: tex`Water flows out of a horizontal pipe at the rate of $${qty(rate, KG_PER_S)}$ with a speed of $${qty(v, U.mps)}$ and strikes a vertical wall normally. If the water comes to rest on striking the wall, the force exerted by the water on the wall is:`,
        answer,
        distractors,
        explanation: tex`Force $=$ rate of change of momentum $= \frac{\Delta m}{\Delta t}(v_i - v_f) = ${rate} \times (${v} - 0) = ${force}\,\mathrm{N}$.`,
      };
    }

    const p = draw(
      () => {
        const grams = r.multiple(100, 500, 50);
        const u = r.int(6, 30);
        const v = r.int(2, u - 2);
        const ms = r.pick([10, 20, 50, 100, 200]);
        // m(u + v)/dt with m in kg and dt in s equals grams * (u + v) / ms.
        return { grams, u, v, ms, impulse: (grams * (u + v)) / 1000, force: (grams * (u + v)) / ms };
      },
      (q) => isExact(q.impulse) && isExact(q.force),
    );
    const mass = p.grams / 1000;
    const change = tex`$\Delta p = m(v_f - v_i) = ${fmt(mass)} \times (-${p.v} - ${p.u}) = -${fmt(p.impulse)}\,\mathrm{kg\,m\,s^{-1}}$`;
    const lead = tex`A ball of mass $${qty(p.grams, U.g)}$ moving horizontally at $${qty(p.u, U.mps)}$ strikes a vertical wall normally and rebounds along the same line with a speed of $${qty(p.v, U.mps)}$.`;

    if (mode === 'wall-impulse') {
      // subtracted the speeds, ignored the rebound, assumed it rebounds at the same speed
      const { answer, distractors } = choices(
        r,
        p.impulse,
        [(p.grams * (p.u - p.v)) / 1000, mass * p.u, 2 * mass * p.u],
        N_S,
      );
      return {
        stem: tex`${lead} The magnitude of the impulse exerted by the wall on the ball is:`,
        answer,
        distractors,
        explanation: tex`Take the direction towards the wall as positive. Impulse $=$ ${change}, so its magnitude is $${fmt(p.impulse)}\,\mathrm{N\,s}$, directed away from the wall. The speeds add because the velocity reverses.`,
      };
    }

    // subtracted the speeds, ignored the rebound, used the rebound speed only, forgot to divide by the time
    const { answer, distractors } = choices(
      r,
      p.force,
      [(p.grams * (p.u - p.v)) / p.ms, (p.grams * p.u) / p.ms, (p.grams * p.v) / p.ms, p.impulse],
      U.N,
    );
    return {
      stem: tex`${lead} If the ball is in contact with the wall for $${qty(p.ms / 1000, U.s)}$, the magnitude of the average force exerted on the ball by the wall is:`,
      answer,
      distractors,
      explanation: tex`Take the direction towards the wall as positive. ${change}. Then $F = \frac{|\Delta p|}{\Delta t} = \frac{${fmt(p.impulse)}}{${fmt(p.ms / 1000)}} = ${fmt(p.force)}\,\mathrm{N}$. The speeds add because the velocity reverses.`,
    };
  }),

  b.dynamic('recoil-and-explosion', { difficulty: 1, tags: ['momentum and impulse'] }, (r) => {
    const mode = r.pick(['gun', 'shell', 'boat'] as const);

    if (mode === 'gun') {
      const p = draw(
        () => {
          const grams = r.pick([10, 20, 25, 40, 50]);
          const gun = r.pick([2, 2.5, 4, 5, 8, 10]);
          const speed = r.pick([200, 250, 300, 400, 500, 600, 800]);
          return { grams, gun, speed, recoil: (grams * speed) / (1000 * gun) };
        },
        (q) => isExact(q.recoil, 3),
      );
      // grams not converted, grams divided by 100, "equal and opposite velocities", inverted mass ratio
      const wrong = [1000 * p.recoil, 10 * p.recoil, p.speed, (p.gun * p.speed * 1000) / p.grams];
      const { answer, distractors } = choices(r, p.recoil, wrong, U.mps);
      const mb = fmt(p.grams / 1000);
      return {
        stem: tex`A gun of mass $${qty(p.gun, U.kg)}$ fires a bullet of mass $${qty(p.grams, U.g)}$ horizontally with a speed of $${qty(p.speed, U.mps)}$. The recoil speed of the gun is:`,
        answer,
        distractors,
        explanation: tex`Before firing the total momentum is zero, so $m_bv_b = MV$. With $m_b = ${p.grams}\,\mathrm{g} = ${mb}\,\mathrm{kg}$: $V = \frac{m_bv_b}{M} = \frac{${mb} \times ${p.speed}}{${fmt(p.gun)}} = ${fmt(p.recoil)}${MPS}$, opposite to the bullet.`,
      };
    }

    if (mode === 'shell') {
      const m1 = r.int(1, 8);
      const m2 = r.intExcept(1, 8, [m1]);
      const g = gcd(m1, m2);
      const step = r.int(1, Math.floor((40 * g) / Math.max(m1, m2)));
      const v1 = (m2 / g) * step;
      const v2 = (m1 / g) * step;
      const total = m1 + m2;
      // divided by the total mass, assumed equal speeds, inverted the mass ratio
      const { answer, distractors } = choices(r, v2, [(m1 * v1) / total, v1, (m2 * v1) / m1], U.mps);
      return {
        stem: tex`A shell of mass $${qty(total, U.kg)}$ at rest explodes into two fragments. A fragment of mass $${qty(m1, U.kg)}$ flies off with a speed of $${qty(v1, U.mps)}$. The speed of the other fragment is:`,
        answer,
        distractors,
        explanation: tex`The initial momentum is zero, so the fragments have equal and opposite momenta: $m_1v_1 = m_2v_2 \Rightarrow v_2 = \frac{m_1v_1}{m_2} = \frac{${m1} \times ${v1}}{${total} - ${m1}} = ${fmt(v2)}${MPS}$.`,
      };
    }

    const p = draw(
      () => {
        const boy = r.multiple(40, 80, 5);
        const boat = r.pick([100, 120, 150, 160, 200, 240, 250, 300, 400]);
        const jump = r.pick([2, 2.5, 3, 4, 5, 6]);
        return { boy, boat, jump, recoil: (boy * jump) / boat };
      },
      (q) => isExact(q.recoil, 3),
    );
    // added the boy's mass to the boat, assumed equal speeds, inverted the mass ratio
    const { answer, distractors } = choices(
      r,
      p.recoil,
      [(p.boy * p.jump) / (p.boat + p.boy), p.jump, (p.boat * p.jump) / p.boy],
      U.mps,
    );
    return {
      stem: tex`A boy of mass $${qty(p.boy, U.kg)}$ jumps horizontally with a speed of $${qty(p.jump, U.mps)}$ (relative to the water) from a stationary boat of mass $${qty(p.boat, U.kg)}$ floating on still water. Neglecting water resistance, the boat moves backward with a speed of:`,
      answer,
      distractors,
      explanation: tex`The total momentum is zero before the jump, so $mv = MV \Rightarrow V = \frac{mv}{M} = \frac{${p.boy} \times ${fmt(p.jump)}}{${p.boat}} = ${fmt(p.recoil)}${MPS}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Collisions
  // -------------------------------------------------------------------------
  b.dynamic('elastic-collision-stationary-target', { difficulty: 3, origin: 'past-paper', tags: ['collisions'] }, (r) => {
    const ask = r.weighted(['target', 'striker', 'energy'] as const, [2, 2, 1]);
    const [k1, k2] = r.pick(ask === 'energy' ? ELASTIC_RATIOS.filter(([p, q]) => p !== q) : ELASTIC_RATIOS);
    const base = r.pick([1, 2]);
    const m1 = k1 * base;
    const m2 = k2 * base;
    const s = k1 + k2;
    const j = r.int(1, Math.floor(30 / s));
    const u = s * j;
    const v1 = (k1 - k2) * j; // (m1 - m2) u / (m1 + m2)
    const v2 = 2 * k1 * j; // 2 m1 u / (m1 + m2)
    const stuck = k1 * j; // common velocity if the balls had stuck together
    const lead = tex`A ball of mass $${qty(m1, U.kg)}$ moving with a velocity of $${qty(u, U.mps)}$ collides head-on and perfectly elastically with a stationary ball of mass $${qty(m2, U.kg)}$.`;

    if (ask === 'energy') {
      const fraction = new Fraction(4 * k1 * k2, s * s);
      const kept = new Fraction((k1 - k2) ** 2, s * s);
      const answer = `$${fraction.toTex()}$`;
      const candidates = [
        kept, // the fraction kept by the first ball
        new Fraction(k1, s),
        new Fraction(k2, s),
        new Fraction(2 * k1, s), // the velocity ratio v2'/u
        new Fraction(1, 2),
        new Fraction(k1 * k2, s * s), // forgot the factor 4
        new Fraction(1),
      ].map((f) => `$${f.toTex()}$`);
      return {
        stem: tex`${lead} The fraction of the first ball's kinetic energy that is transferred to the second ball is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`$v_2' = \frac{2m_1}{m_1 + m_2}v_1$, so the fraction transferred is $\frac{\frac{1}{2}m_2(v_2')^2}{\frac{1}{2}m_1v_1^2} = \frac{4m_1m_2}{(m_1 + m_2)^2} = \frac{4 \times ${m1} \times ${m2}}{(${m1} + ${m2})^2} = ${fraction.toTex()}$. The rest, $${kept.toTex()}$, stays with the first ball.`,
      };
    }

    if (ask === 'target') {
      // stuck together, "velocities exchange", striker assumed to stop, the striker's formula, heavy-ball limit
      const { answer, distractors } = choices(r, v2, [stuck, u, (k1 * u) / k2, v1, 2 * u], U.mps, {
        allowNegative: true,
        allowZero: true,
      });
      return {
        stem: tex`${lead} The velocity of the second ball just after the collision is:`,
        answer,
        distractors,
        explanation: tex`For an elastic collision with the second ball at rest, $v_2' = \frac{2m_1}{m_1 + m_2}v_1 = \frac{2 \times ${m1}}{${m1} + ${m2}} \times ${u} = ${fmt(v2)}${MPS}$.`,
      };
    }

    let meaning = '; it continues forward with a smaller speed.';
    if (v1 < 0) meaning = '; the negative sign means the first ball rebounds.';
    if (v1 === 0) meaning = '; equal masses exchange velocities, so the first ball stops.';
    // wrong direction, assumed it stops, stuck together, the target's velocity, full rebound, no change
    const { answer, distractors } = choices(r, v1, [-v1, 0, stuck, v2, -u, u], U.mps, {
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`${lead} Taking the initial direction of motion as positive, the velocity of the first ball just after the collision is:`,
      answer,
      distractors,
      explanation: tex`$v_1' = \frac{m_1 - m_2}{m_1 + m_2}v_1 = \frac{${m1} - ${m2}}{${m1} + ${m2}} \times ${u} = ${fmt(v1)}${MPS}$${meaning}`,
    };
  }),

  b.dynamic('perfectly-inelastic-collision', { difficulty: 2, tags: ['collisions', 'momentum and impulse'] }, (r) => {
    const kind = r.weighted(['rest', 'chase', 'head-on'] as const, [0.35, 0.25, 0.4]);
    const sign = kind === 'head-on' ? -1 : 1;
    const { m1, m2, u1, u2, vel } = draw(
      () => {
        const m1 = r.int(1, 8);
        const m2 = r.intExcept(1, 8, [m1]);
        const u1 = r.int(2, 15);
        const u2 = kind === 'rest' ? 0 : kind === 'chase' ? r.int(1, u1 - 1) : r.int(1, 12);
        return { m1, m2, u1, u2, vel: (m1 * u1 + sign * m2 * u2) / (m1 + m2) };
      },
      (q) => q.vel !== 0 && isExact(q.vel, 3),
    );
    const total = m1 + m2;
    let wrong: number[];
    let stem: string;
    let explanation: string;
    if (kind === 'rest') {
      // equal-mass assumption, swapped masses, no change, mass ratio only
      wrong = [u1 / 2, (m2 * u1) / total, u1, (m1 * u1) / m2];
      stem = tex`A trolley of mass $${qty(m1, U.kg)}$ moving at $${qty(u1, U.mps)}$ collides with a stationary trolley of mass $${qty(m2, U.kg)}$, and the two stick together. Their common velocity just after the collision is:`;
      explanation = tex`Momentum is conserved and the trolleys move together: $m_1v_1 = (m_1 + m_2)V \Rightarrow V = \frac{${m1} \times ${u1}}{${m1} + ${m2}} = ${fmt(vel)}${MPS}$.`;
    } else if (kind === 'chase') {
      // treated as opposite directions, mean of the speeds, ignored the second trolley's motion, wrong total mass, no change
      wrong = [(m1 * u1 - m2 * u2) / total, (u1 + u2) / 2, (m1 * u1) / total, (m1 * u1 + m2 * u2) / m1, u1];
      stem = tex`A trolley of mass $${qty(m1, U.kg)}$ moving at $${qty(u1, U.mps)}$ runs into a trolley of mass $${qty(m2, U.kg)}$ moving at $${qty(u2, U.mps)}$ in the same direction along the same line. If they stick together, their common velocity just after the collision is:`;
      explanation = tex`$m_1v_1 + m_2v_2 = (m_1 + m_2)V \Rightarrow V = \frac{${m1} \times ${u1} + ${m2} \times ${u2}}{${m1} + ${m2}} = ${fmt(vel)}${MPS}$.`;
    } else {
      // wrong direction, ignored the opposite directions, mean of the velocities, wrong total mass, relative velocity
      wrong = [-vel, (m1 * u1 + m2 * u2) / total, (u1 - u2) / 2, (m1 * u1 - m2 * u2) / m1, u1 - u2];
      stem = tex`Two balls of putty, of masses $${qty(m1, U.kg)}$ and $${qty(m2, U.kg)}$, move towards each other along a straight line with speeds of $${qty(u1, U.mps)}$ and $${qty(u2, U.mps)}$ respectively. They collide and stick together. Taking the direction of motion of the $${qty(m1, U.kg)}$ ball as positive, their common velocity just after the collision is:`;
      const where = vel < 0 ? tex`; the negative sign means the combined ball moves in the original direction of the $${qty(m2, U.kg)}$ ball` : '';
      explanation = tex`The $${qty(m2, U.kg)}$ ball has velocity $-${u2}${MPS}$. Momentum is conserved: $V = \frac{${m1} \times ${u1} + ${m2} \times (-${u2})}{${m1} + ${m2}} = ${fmt(vel)}${MPS}$${where}.`;
    }
    const { answer, distractors } = choices(r, vel, wrong, U.mps, { allowNegative: kind === 'head-on' });
    return { stem, answer, distractors, explanation };
  }),

  // -------------------------------------------------------------------------
  // Projectile motion
  // -------------------------------------------------------------------------
  b.dynamic('projectile-range-height-time', { difficulty: 2, origin: 'past-paper', tags: ['projectile motion'] }, (r) =>
    r.chance(0.65) ? angledLaunch(r) : horizontalLaunch(r),
  ),

  b.dynamic('if-doubled-scaling', { difficulty: 1, origin: 'past-paper', tags: ['projectile motion', 'equations of motion'] }, (r) => {
    const c = r.pick(SCALING_CASES);
    const k = r.pick(c.ks);
    const f = k ** c.power;
    const answer = `$${timesTex(f, c.symbol)}$`;
    // the factor family: k^2, k, sqrt(k) and "unchanged"
    const distractors = pickDistractors(
      answer,
      [k * k, k, Math.sqrt(k), 1].map((x) => `$${timesTex(x, c.symbol)}$`),
    );
    const kT = factorTex(k);
    const squared = whole(k) === null ? tex`\left(${kT}\right)^2` : `${kT}^2`;
    const step = c.power === 2 ? `${squared} = ${factorTex(f)}` : c.power === 1 ? kT : tex`\sqrt{${kT}} = ${factorTex(f)}`;
    return {
      stem: c.stem(timesTex(k, c.variable)),
      answer,
      distractors,
      explanation: tex`${c.why} Multiplying $${c.variable}$ by $${kT}$ multiplies $${c.symbol}$ by $${step}$, so the new value is $${timesTex(f, c.symbol)}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Conceptual items
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'stopping-distance-doubled-speed',
      d: 1,
      o: 'past-paper',
      t: ['equations of motion'],
      q: 'A car moving on a level road can be stopped in a minimum distance $s$ by applying its brakes. If the car moves twice as fast and the brakes produce the same retardation, the minimum stopping distance becomes:',
      a: '$4s$',
      x: ['$2s$', '$s$', tex`$\sqrt{2}\,s$`],
      e: tex`With $v_f = 0$, $v_f^2 = v_i^2 - 2as$ gives $s = \frac{v_i^2}{2a}$. For the same retardation $s \propto v_i^2$, so doubling the speed makes the stopping distance $2^2 = 4$ times larger, i.e. $4s$.`,
    },
    {
      id: 'free-fall-successive-seconds',
      d: 2,
      t: ['equations of motion'],
      q: 'A body falls freely from rest. Neglecting air resistance, the distances it covers during the first, second and third seconds of its fall are in the ratio:',
      a: '$1 : 3 : 5$',
      x: ['$1 : 4 : 9$', '$1 : 2 : 3$', '$1 : 1 : 1$'],
      e: tex`From $S = \frac{1}{2}gt^2$ the total distances fallen after $1$, $2$ and $3\,\mathrm{s}$ are in the ratio $1 : 4 : 9$. The distances covered **during** each second are the differences: $1 : (4 - 1) : (9 - 4) = 1 : 3 : 5$.`,
    },
    {
      id: 'mass-measures-inertia',
      d: 1,
      t: ['Newton laws'],
      q: 'The inertia of a body is measured by its:',
      a: 'mass',
      x: ['speed', 'volume', 'acceleration'],
      e: "Inertia is the tendency of a body to keep its state of rest or of uniform motion in a straight line (Newton's first law). The greater the mass, the greater the force needed to produce a given change in velocity, so mass is the quantitative measure of inertia. Inertia does not depend on the speed, volume or acceleration of the body.",
    },
    {
      id: 'uniform-velocity-zero-net-force',
      d: 1,
      t: ['Newton laws'],
      q: 'A body moves along a straight line with a constant velocity. The net force acting on it is:',
      a: 'zero',
      x: ['in the direction of its motion', 'opposite to the direction of its motion', 'equal to its weight'],
      e: tex`Constant velocity means zero acceleration, so by Newton's second law $F_{net} = ma = 0$. By the first law no net force is needed to keep a body moving uniformly; forces may act on it, but they balance.`,
    },
    {
      id: 'inertial-frame',
      d: 1,
      t: ['Newton laws'],
      q: "Newton's laws of motion hold in an inertial frame of reference. An inertial frame is one that:",
      a: 'is at rest or moves with a uniform velocity',
      x: ['moves with a uniform acceleration', 'rotates with a constant angular speed', 'moves in a circle with a constant speed'],
      e: "An inertial frame is a non-accelerated frame: it is at rest or moves with constant velocity, and in it a body with no net force on it stays at rest or keeps moving uniformly in a straight line (Newton's first law). A frame that accelerates, rotates or moves in a circle has an acceleration, so it is non-inertial.",
    },
    {
      id: 'action-reaction-do-not-cancel',
      d: 1,
      t: ['Newton laws'],
      q: "According to Newton's third law, action and reaction are equal and opposite, yet they do not cancel each other because they:",
      a: 'act on different bodies',
      x: ['act at different times', 'are not exactly equal in magnitude', 'act along different lines'],
      e: 'Two forces can cancel only when they act on the same body. Action and reaction always act on two different bodies (A on B and B on A), at the same instant and along the same line, so each one affects the motion of the body it acts on.',
    },
    {
      id: 'catching-ball-hands-back',
      d: 1,
      t: ['momentum and impulse'],
      q: 'A fielder moves his hands backward while catching a fast cricket ball. He does this to:',
      a: 'increase the time of impact and so reduce the force on his hands',
      x: [
        'reduce the time of impact and so reduce the force on his hands',
        'reduce the change in momentum of the ball',
        'increase the impulse given to the ball',
      ],
      e: tex`The ball has to be brought to rest whatever he does, so the change in its momentum (the impulse) is fixed. Since $F = \frac{\Delta p}{\Delta t}$, moving the hands back increases the stopping time $\Delta t$ and so reduces the average force on his hands.`,
    },
    {
      id: 'maximum-range-angle',
      d: 1,
      o: 'past-paper',
      t: ['projectile motion'],
      q: 'For a given speed of projection, the horizontal range of a projectile on level ground is maximum when the angle of projection is (neglect air resistance):',
      a: tex`$45^{\circ}$`,
      x: [tex`$30^{\circ}$`, tex`$60^{\circ}$`, tex`$90^{\circ}$`],
      e: tex`$R = \frac{v_i^2\sin 2\theta}{g}$ is greatest when $\sin 2\theta = 1$, i.e. $2\theta = 90^{\circ}$ and $\theta = 45^{\circ}$; then $R_{max} = \frac{v_i^2}{g}$. Angles of $30^{\circ}$ and $60^{\circ}$ give equal but smaller ranges, and at $90^{\circ}$ the range is zero.`,
    },
    {
      id: 'dropped-and-thrown-horizontally',
      d: 1,
      t: ['projectile motion'],
      q: 'From the top of a tower, ball A is dropped from rest and, at the same instant, ball B is thrown horizontally. Neglecting air resistance:',
      a: 'both balls reach the ground at the same time',
      x: ['ball A reaches the ground first', 'ball B reaches the ground first', 'the heavier ball reaches the ground first'],
      e: tex`Both balls start with zero vertical velocity and have the same downward acceleration $g$, so both fall the height $h$ in the same time $t = \sqrt{\frac{2h}{g}}$. B's horizontal velocity only carries it farther from the tower, and the mass does not affect the time of fall.`,
    },
    {
      id: 'projectile-false-statement',
      d: 2,
      t: ['projectile motion'],
      q: 'Neglecting air resistance, which of the following statements about a projectile launched at an angle above the horizontal is NOT correct?',
      a: 'Its time of flight depends on the horizontal component of its velocity.',
      x: [
        'Its acceleration is the same at every point of its path.',
        'The horizontal component of its velocity remains constant.',
        'Its speed is least at the highest point of its path.',
      ],
      e: tex`The time of flight $T = \frac{2v_i\sin\theta}{g}$ depends only on the vertical component $v_i\sin\theta$, so the statement about the time of flight is false. The other three are true: the acceleration is $g$ downward throughout, the horizontal component $v_i\cos\theta$ never changes, and the speed is least at the top, where the vertical component is zero.`,
    },
    {
      id: 'horse-and-cart',
      d: 3,
      t: ['Newton laws'],
      q: "A horse pulls a cart along a level road. By Newton's third law the cart pulls back on the horse with an equal and opposite force, yet the horse and cart accelerate forward. This is possible because:",
      a: 'the forward push of the ground on the horse exceeds the backward forces on the system',
      x: [
        'the horse pulls the cart slightly harder than the cart pulls the horse',
        'the reaction of the cart acts only after the cart has started moving',
        'the pull of the horse is an internal force that accelerates the system',
      ],
      e: "Action and reaction act on **different** bodies and are always equal and simultaneous. For the horse-cart system the horse's pull and the cart's pull are internal forces that cancel, so they cannot accelerate the system. The horse pushes backward on the ground and the ground pushes the horse forward (friction); the system accelerates when this external forward force exceeds the external backward forces such as friction on the cart's wheels.",
    },
    {
      id: 'projectile-highest-point',
      d: 1,
      t: ['projectile motion'],
      q: tex`A ball is projected at an angle $\theta$ ($0^{\circ} < \theta < 90^{\circ}$) above the horizontal. Neglecting air resistance, at the highest point of its path:`,
      a: 'its velocity is horizontal and its acceleration is $g$ downward',
      x: [
        'its velocity and its acceleration are both zero',
        'its velocity is zero and its acceleration is $g$ downward',
        'its velocity is horizontal and its acceleration is zero',
      ],
      e: tex`The horizontal component $v_i\cos\theta$ never changes; only the vertical component becomes zero at the top, so the velocity there is $v_i\cos\theta$, directed horizontally. Gravity acts throughout the flight, so the acceleration is $g$ vertically downward at every point.`,
    },
    {
      id: 'complementary-angles-equal-range',
      d: 2,
      o: 'past-paper',
      t: ['projectile motion'],
      q: tex`Two stones are projected from the same point with equal speeds, one at $35^{\circ}$ and the other at $55^{\circ}$ above the horizontal. Neglecting air resistance, which quantity is the same for both stones?`,
      a: 'Horizontal range',
      x: ['Maximum height', 'Time of flight', 'Horizontal component of velocity'],
      e: tex`$R = \frac{v_i^2\sin 2\theta}{g}$ and $\sin 70^{\circ} = \sin 110^{\circ}$, so complementary angles give equal ranges. The maximum height ($\propto \sin^2\theta$), the time of flight ($\propto \sin\theta$) and $v_i\cos\theta$ all differ for the two angles.`,
    },
    {
      id: 'range-equals-maximum-height',
      d: 3,
      t: ['projectile motion'],
      q: 'A projectile is launched so that its horizontal range is equal to its maximum height. Its angle of projection above the horizontal is:',
      a: tex`$\tan^{-1}(4)$`,
      x: [tex`$45^{\circ}$`, tex`$\tan^{-1}\left(\frac{1}{4}\right)$`, tex`$\tan^{-1}(2)$`],
      e: tex`$R = \frac{2v_i^2\sin\theta\cos\theta}{g}$ and $H = \frac{v_i^2\sin^2\theta}{2g}$. Setting $R = H$: $2\sin\theta\cos\theta = \frac{\sin^2\theta}{2}$, so $\tan\theta = 4$ and $\theta = \tan^{-1}(4) \approx 76^{\circ}$. (At $45^{\circ}$ the range is $4H$.)`,
    },
    {
      id: 'heavy-ball-hits-light-ball',
      d: 2,
      t: ['collisions'],
      q: 'A very heavy ball moving with velocity $v$ collides head-on and perfectly elastically with a very light ball at rest. Just after the collision, the light ball moves with a velocity of nearly:',
      a: '$2v$',
      x: ['$v$', tex`$\frac{v}{2}$`, '$0$'],
      e: tex`For an elastic collision with the target at rest, $v_2' = \frac{2m_1}{m_1 + m_2}v_1$. When $m_1 \gg m_2$, $\frac{2m_1}{m_1 + m_2} \approx 2$, so the light ball moves off at about $2v$ while the heavy ball continues at almost $v$.`,
    },
    {
      id: 'rocket-acceleration-increases',
      d: 2,
      t: ['momentum and impulse'],
      q: 'A rocket in deep space ejects its exhaust gases at a constant rate and at a constant speed relative to the rocket. As the fuel burns, the acceleration of the rocket:',
      a: 'increases, because the mass of the rocket decreases',
      x: [
        'decreases, because the fuel is being used up',
        'remains constant, because the thrust is constant',
        'decreases, because momentum is carried away by the gases',
      ],
      e: tex`The thrust $\frac{\Delta m}{\Delta t}\,v$ is constant because the ejection rate and the exhaust speed are constant, while the mass $M$ of the rocket keeps decreasing. Hence $a = \frac{\text{thrust}}{M}$ increases.`,
    },
    {
      id: 'impulse-unit',
      d: 1,
      t: ['momentum and impulse'],
      q: 'The SI unit of impulse, the newton-second, is equivalent to:',
      a: tex`$\mathrm{kg\,m\,s^{-1}}$`,
      x: [tex`$\mathrm{kg\,m\,s^{-2}}$`, tex`$\mathrm{kg\,m^{2}\,s^{-1}}$`, tex`$\mathrm{kg\,m^{2}\,s^{-2}}$`],
      e: tex`$1\,\mathrm{N\,s} = (1\,\mathrm{kg\,m\,s^{-2}})(1\,\mathrm{s}) = 1\,\mathrm{kg\,m\,s^{-1}}$, the unit of momentum, as expected since impulse $= F\,\Delta t = \Delta p$.`,
    },
    {
      id: 'inelastic-collision-conservation',
      d: 1,
      t: ['collisions'],
      q: 'In a perfectly inelastic collision between two bodies, with no external force acting on them:',
      a: 'momentum is conserved but kinetic energy is not',
      x: [
        'kinetic energy is conserved but momentum is not',
        'both momentum and kinetic energy are conserved',
        'neither momentum nor kinetic energy is conserved',
      ],
      e: 'The total linear momentum of an isolated system is conserved in every collision. In a perfectly inelastic collision the bodies stick together and part of the kinetic energy becomes heat, sound and work of deformation, so kinetic energy is not conserved.',
    },
  ]),
]);
