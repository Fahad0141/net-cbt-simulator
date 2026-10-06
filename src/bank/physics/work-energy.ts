import { defineBank } from '@/engine/authoring';
import {
  Fraction,
  frac,
  gcd,
  num,
  numericOptions,
  pickDistractors,
  q$,
  qty,
  range,
  signedSum,
  simplifySurd,
  sum,
  tex,
  U,
} from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** `x` has at most `dp` decimal places, so it prints exactly. */
function isTidy(x: number, dp = 2): boolean {
  const scaled = x * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

/** `x` prints exactly with three significant figures (num() would not round it). */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

/**
 * LaTeX for the square root of n/d in the form FSc books use:
 * 2, \frac{1}{2}, \sqrt{2}, \frac{1}{\sqrt{2}}, 2\sqrt{2}, \sqrt{\frac{3}{2}}.
 */
function sqrtRatioTex(n: number, d: number): string {
  const g = gcd(n, d);
  const top = simplifySurd(1, n / g);
  const bottom = simplifySurd(1, d / g);
  const surd = (c: number, r: number): string => (r === 1 ? String(c) : `${c === 1 ? '' : c}\\sqrt{${r}}`);
  if (top.r === 1 && bottom.r === 1) return new Fraction(top.c, bottom.c).toTex();
  if (bottom.r === 1) return bottom.c === 1 ? surd(top.c, top.r) : `\\frac{${surd(top.c, top.r)}}{${bottom.c}}`;
  if (top.r === 1) return `\\frac{${top.c}}{${surd(bottom.c, bottom.r)}}`;
  return `\\sqrt{\\frac{${n / g}}{${d / g}}}`;
}

/** Force in N, switching every option to kN when the correct value is 10 kN or more. */
function forceFormatter(correct: number): { fmt: (x: number) => string; texOf: (x: number) => string } {
  const kilo = correct >= 1e4;
  const texOf = (x: number): string => (kilo ? qty(x / 1000, 'kN') : qty(x, U.N));
  return { fmt: (x) => `$${texOf(x)}$`, texOf };
}

/**
 * Black-on-white force-displacement graph (the UI shows figures on a white card in
 * every theme). `points` are [x in m, F in N] vertices of a piecewise-linear graph.
 */
function forceGraphSvg(points: ReadonlyArray<readonly [number, number]>, fMax: number): string {
  const ox = 48;
  const oy = 150;
  const w = 230;
  const h = 105;
  const xMax = Math.max(...points.map(([x]) => x));
  const px = (x: number): number => Math.round((ox + (x / xMax) * w) * 10) / 10;
  const py = (f: number): number => Math.round((oy - (f / fMax) * h) * 10) / 10;
  const top = py(fMax);
  const el: string[] = [];
  for (const [x, f] of points) {
    if (x > 0 && f > 0) {
      el.push(`<line x1="${px(x)}" y1="${py(f)}" x2="${px(x)}" y2="${oy}" stroke="#000" stroke-width="1" stroke-dasharray="4 3"/>`);
    }
  }
  const firstTop = points.find(([, f]) => f === fMax);
  if (firstTop && firstTop[0] > 0) {
    el.push(`<line x1="${ox}" y1="${top}" x2="${px(firstTop[0])}" y2="${top}" stroke="#000" stroke-width="1" stroke-dasharray="4 3"/>`);
  }
  el.push(`<line x1="${ox}" y1="${oy}" x2="${ox + w + 24}" y2="${oy}" stroke="#000" stroke-width="1.4"/>`);
  el.push(`<path d="M${ox + w + 30} ${oy} l-8 -4 v8 z" fill="#000"/>`);
  el.push(`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy - h - 24}" stroke="#000" stroke-width="1.4"/>`);
  el.push(`<path d="M${ox} ${oy - h - 30} l-4 8 h8 z" fill="#000"/>`);
  el.push(`<text x="${ox + w + 36}" y="${oy + 5}" font-style="italic">x (m)</text>`);
  el.push(`<text x="${ox + 10}" y="${oy - h - 20}" font-style="italic">F (N)</text>`);
  el.push(`<text x="${ox - 8}" y="${oy + 17}" text-anchor="end">0</text>`);
  el.push(`<text x="${ox - 8}" y="${top + 5}" text-anchor="end">${fMax}</text>`);
  for (const [x] of points) {
    if (x <= 0) continue;
    el.push(`<line x1="${px(x)}" y1="${oy}" x2="${px(x)}" y2="${oy + 4}" stroke="#000" stroke-width="1.2"/>`);
    el.push(`<text x="${px(x)}" y="${oy + 19}" text-anchor="middle">${x}</text>`);
  }
  const path = points.map(([x, f]) => `${px(x)},${py(f)}`).join(' ');
  el.push(`<polyline points="${path}" fill="none" stroke="#000" stroke-width="2.4" stroke-linejoin="round"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 185" width="360" height="185" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#000">${el.join('')}</svg>`;
}

// ---------------------------------------------------------------------------
// Pre-computed parameter sets (pure and deterministic), chosen so that every
// correct answer is exact and every scenario is physically realistic.
// ---------------------------------------------------------------------------

/** Bullets stopped in wood: mass in g, speed in m/s, depth in cm, average force in N. */
const BULLET_CASES = (() => {
  const out: Array<{ m: number; v: number; s: number; f: number }> = [];
  for (const m of [5, 8, 10, 12, 15, 20, 25, 40, 50]) {
    for (const v of [100, 120, 150, 200, 250, 300, 360, 400, 450, 500, 600]) {
      for (const s of [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30]) {
        const f = (m * v * v) / (20 * s); // F = (1/2)(m/1000)v^2 / (s/100)
        if (Number.isInteger(f) && f >= 200 && f <= 2e5 && (f < 1e4 || exact3(f))) out.push({ m, v, s, f });
      }
    }
  }
  return out;
})();

/** Cars braking to rest: mass in kg, speed in m/s, distance in m; deceleration 1-8 m/s^2. */
const CAR_CASES = (() => {
  const out: Array<{ m: number; v: number; s: number; f: number }> = [];
  for (const m of [500, 800, 1000, 1200, 1500, 1600, 2000]) {
    for (const v of [8, 10, 12, 15, 16, 20, 24, 25, 30]) {
      for (const s of [8, 10, 12, 15, 16, 20, 24, 25, 30, 40, 50, 60, 75, 80, 100]) {
        const a = (v * v) / (2 * s);
        const f = m * a;
        if (a >= 1 && a <= 8 && Number.isInteger(f) && (f < 1e4 || exact3(f))) out.push({ m, v, s, f });
      }
    }
  }
  return out;
})();

/** Same car, same braking force, new speed: speeds in km/h, distances in m. */
const STOPPING_CASES = (() => {
  const out: Array<{ v1: number; v2: number; d1: number; p: number; q: number }> = [];
  const ratios: ReadonlyArray<readonly [number, number]> = [
    [2, 1], [3, 1], [3, 2], [1, 2], [5, 2], [4, 3], [2, 3], [1, 3], [5, 4],
  ];
  for (const v1 of [18, 20, 24, 30, 36, 40, 45, 48, 54, 60, 72, 90]) {
    for (const [p, q] of ratios) {
      const v2 = (v1 * p) / q;
      if (!Number.isInteger(v2) || v2 < 10 || v2 > 144) continue;
      for (let d1 = 2; d1 <= 40; d1++) {
        const d2 = (d1 * p * p) / (q * q);
        if (d2 >= 1 && d2 <= 250 && isTidy(d2, 1) && exact3(d2)) out.push({ v1, v2, d1, p, q });
      }
    }
  }
  return out;
})();

/**
 * Launch speed u, "drop" speed w = sqrt(2gh) and final speed v from Pythagorean
 * triples, so v = sqrt(u^2 + 2gh) is exact and the common wrong answers (w, u + w,
 * u) are clean numbers too. h = w^2 / 20 (g = 10) has at most one decimal place.
 */
const LAUNCH_CASES = (() => {
  const out: Array<{ u: number; w: number; v: number }> = [];
  const triples: ReadonlyArray<readonly [number, number, number]> = [
    [3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41], [12, 35, 37],
  ];
  for (const [a, b2, c] of triples) {
    for (let k = 1; c * k <= 50; k++) {
      const legs: ReadonlyArray<readonly [number, number]> = [[a * k, b2 * k], [b2 * k, a * k]];
      for (const [u, w] of legs) {
        const h = (w * w) / 20;
        if (w % 2 === 0 && h >= 0.8 && h <= 125 && exact3(h)) out.push({ u, w, v: c * k });
      }
    }
  }
  return out;
})();

const G10 = tex`(take $g = 10\,\mathrm{m\,s^{-2}}$)`;

export default defineBank('physics', 'work-energy', (b) => [
  // =========================================================================
  // Work
  // =========================================================================
  b.dynamic('lifting-work', { difficulty: 1, tags: ['work'] }, (r) => {
    const m = r.int(2, 50);
    const h = r.int(2, 25);
    const w = m * 10 * h;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: w,
        // forgot g; gave the weight mg instead of the work; halved (confused with 1/2 mv^2)
        wrong: [m * h, m * 10, w / 2],
        format: (x) => q$(x, U.J),
      });
      return {
        stem: tex`The work done in slowly lifting a box of mass $${qty(m, U.kg)}$ vertically through $${qty(h, U.m)}$ is ${G10}:`,
        answer,
        distractors,
        explanation: tex`Lifting slowly, the applied force equals the weight $mg$, so $W = mgh = ${m} \times 10 \times ${h} = ${w}\,\mathrm{J}$.`,
      };
    }
    const len = r.int(h + 2, 3 * h + 2);
    const { answer, distractors } = numericOptions(r, {
      correct: w,
      // used the length of the plane instead of the height; forgot g; halved
      wrong: [m * 10 * len, m * h, w / 2],
      format: (x) => q$(x, U.J),
    });
    return {
      stem: tex`A box of mass $${qty(m, U.kg)}$ is pushed slowly up a smooth inclined plane $${qty(len, U.m)}$ long, rising through a vertical height of $${qty(h, U.m)}$. The work done in pushing the box up the plane is ${G10}:`,
      answer,
      distractors,
      explanation: tex`Along a smooth plane the push needed is $F = mg\sin\theta$ with $\sin\theta = \frac{h}{L} = ${frac(h, len).toTex()}$, so $W = F \times L = mgh = ${m} \times 10 \times ${h} = ${w}\,\mathrm{J}$. The length of the plane does not matter: gravity is a conservative force.`,
    };
  }),

  b.dynamic('work-at-angle', { difficulty: 1, tags: ['work'] }, (r) => {
    const theta = r.pick([30, 45, 60] as const);
    const f = r.multiple(10, 100, 5);
    let d = r.int(2, 20);
    if ((f * d) % 2 !== 0) d += 1; // keeps Fd/2 an integer
    const p = f * d;
    const half = p / 2;
    type Surd = readonly [number, number]; // value = c * sqrt(k)
    const surdTexOf = ([c, k]: Surd): string => (k === 1 ? num(c) : `${num(c)}\\sqrt{${k}}`);
    const joules = (s: Surd): string => `$${surdTexOf(s)}\\,\\mathrm{J}$`;
    const table: Record<30 | 45 | 60, { cos: string; ans: Surd; wrong: readonly Surd[] }> = {
      // used sin instead of cos; ignored the angle; divided by cos instead of multiplying
      60: { cos: '\\frac{1}{2}', ans: [half, 1], wrong: [[half, 3], [p, 1], [2 * p, 1]] },
      // used sin instead of cos; ignored the angle; forgot the 1/2 in cos 30
      30: { cos: '\\frac{\\sqrt{3}}{2}', ans: [half, 3], wrong: [[half, 1], [p, 1], [p, 3]] },
      // ignored the angle; divided by cos; took cos 45 as 1/2
      45: { cos: '\\frac{1}{\\sqrt{2}}', ans: [half, 2], wrong: [[p, 1], [p, 2], [half, 1]] },
    };
    const row = table[theta];
    const answer = joules(row.ans);
    return {
      stem: tex`A force of $${qty(f, U.N)}$ acting at $${qty(theta, U.deg)}$ above the horizontal pulls a trolley through $${qty(d, U.m)}$ along a straight, level road. The work done by this force is:`,
      answer,
      distractors: pickDistractors(answer, row.wrong.map(joules)),
      explanation: tex`Only the component of the force along the displacement does work: $W = Fd\cos\theta = (${f})(${d})\cos ${theta}^{\circ} = ${p} \times ${row.cos} = ${surdTexOf(row.ans)}\,\mathrm{J}$.`,
    };
  }),

  b.dynamic('work-dot-product', { difficulty: 2, origin: 'past-paper', tags: ['work'] }, (r) => {
    const threeD = r.chance(0.75);
    const n = threeD ? 3 : 2;
    // Mostly positive work, sometimes negative, so the sign of the answer is never a giveaway.
    const negative = r.chance(0.25);
    // Fallbacks satisfy the constraints below; the loop almost always replaces them.
    let F = threeD ? (negative ? [2, -3, 1] : [2, -3, 4]) : negative ? [3, -4] : [3, -2];
    let D = threeD ? (negative ? [1, 4, 2] : [3, 1, 2]) : negative ? [2, 3] : [4, 1];
    for (let i = 0; i < 60; i++) {
      const f = range(1, n).map(() => r.nonZero(-6, 6));
      const d = range(1, n).map(() => r.nonZero(-6, 6));
      const prods = f.map((x, j) => x * d[j]);
      const total = sum(prods);
      // Terms of both signs, so that sign handling matters.
      if ((negative ? total < 0 : total > 0) && prods.some((x) => x < 0) && prods.some((x) => x > 0)) {
        F = f;
        D = d;
        break;
      }
    }
    const prods = F.map((x, j) => x * D[j]);
    const w = sum(prods);
    const unit = ['\\hat{i}', '\\hat{j}', '\\hat{k}'];
    const vec = (c: number[]): string => signedSum(c.map((x, j) => [x, unit[j]] as const));
    const absSum = sum(prods.map(Math.abs));
    // Sign slips in a single term (largest positive / most negative), distinct from ignoring all signs.
    const flipMax = w - 2 * Math.max(...prods);
    const flipMin = w - 2 * Math.min(...prods);
    const wrong = threeD
      ? // ignored the minus signs; overall sign error; sign slip in one term; dropped the k-term
        [absSum, -w, flipMax, flipMin, prods[0] + prods[1]]
      : // ignored the minus signs; paired i with j; overall sign error; sign slips; added components first
        [absSum, F[0] * D[1] + F[1] * D[0], -w, flipMax, flipMin, (F[0] + F[1]) * (D[0] + D[1])];
    const { answer, distractors } = numericOptions(r, {
      correct: w,
      wrong,
      format: (x) => q$(x, U.J),
      allowNegative: true,
      allowZero: true,
    });
    const pairs = F.map((x, j) => `(${x})(${D[j]})`).join(' + ');
    return {
      stem: tex`A force $\vec{F} = (${vec(F)})\,\mathrm{N}$ acts on a body while it undergoes a displacement $\vec{d} = (${vec(D)})\,\mathrm{m}$. The work done by the force is:`,
      answer,
      distractors,
      explanation: tex`Work is the scalar product: $W = \vec{F}\cdot\vec{d} = ${pairs} = ${signedSum(prods.map((x) => [x, ''] as const))} = ${w}\,\mathrm{J}$.`,
    };
  }),

  b.dynamic('work-from-force-graph', { difficulty: 2, tags: ['work'] }, (r) => {
    const f0 = r.multiple(4, 60, 2);
    const shape = r.pick(['trapezium', 'step-down', 'ramp-up'] as const);
    let points: Array<[number, number]>;
    if (shape === 'trapezium') {
      const x1 = r.int(1, 4);
      const x2 = x1 + r.int(1, 5);
      const x3 = x2 + r.int(1, 4);
      points = [[0, 0], [x1, f0], [x2, f0], [x3, 0]];
    } else if (shape === 'step-down') {
      const x2 = r.int(2, 7);
      const x3 = x2 + r.int(1, 5);
      points = [[0, f0], [x2, f0], [x3, 0]];
    } else {
      const x1 = r.int(1, 5);
      const x3 = x1 + r.int(2, 7);
      points = [[0, 0], [x1, f0], [x3, f0]];
    }
    const xEnd = (points[points.length - 1] as [number, number])[0];
    let area = 0;
    let flat = 0;
    const terms: string[] = [];
    for (let i = 1; i < points.length; i++) {
      const [xa, fa] = points[i - 1] as [number, number];
      const [xb, fb] = points[i] as [number, number];
      const dx = xb - xa;
      if (fa === fb) {
        area += f0 * dx;
        flat += dx;
        terms.push(`(${dx})(${f0})`);
      } else {
        area += (f0 * dx) / 2;
        terms.push(`\\tfrac{1}{2}(${dx})(${f0})`);
      }
    }
    const { answer, distractors } = numericOptions(r, {
      correct: area,
      // treated F as constant at its maximum; treated the whole area as one triangle;
      // counted only the constant-force part; counted only the sloping parts
      wrong: [f0 * xEnd, (f0 * xEnd) / 2, f0 * flat, (f0 * (xEnd - flat)) / 2],
      format: (x) => q$(x, U.J),
    });
    return {
      stem: tex`The graph shows how the force $F$ acting on a body along its direction of motion varies with its displacement $x$. The work done by the force as the body moves from $x = 0$ to $x = ${xEnd}\,\mathrm{m}$ is:`,
      answer,
      distractors,
      figure: forceGraphSvg(points, f0),
      explanation: tex`The work done by a variable force is the area under the force-displacement graph. Splitting it into triangles and rectangles: $W = ${terms.join(' + ')} = ${area}\,\mathrm{J}$.`,
    };
  }),

  // =========================================================================
  // Power
  // =========================================================================
  b.dynamic('power-force-velocity', { difficulty: 2, tags: ['power'] }, (r) => {
    const f = r.multiple(200, 3000, 100);
    const kmph = r.pick([18, 36, 54, 72, 90, 108]);
    const v = (kmph * 1000) / 3600;
    const watts = f * v;
    const { answer, distractors } = numericOptions(r, {
      correct: watts / 1000,
      // speed left in km/h; multiplied by 3.6 instead of dividing; spurious 1/2
      wrong: [(f * kmph) / 1000, (f * kmph * 3.6) / 1000, watts / 2000],
      format: (x) => q$(x, U.kW),
    });
    return {
      stem: tex`A car moves at a constant speed of $${qty(kmph, U.kmph)}$ against a constant resistive force of $${qty(f, U.N)}$. The power developed by its engine is:`,
      answer,
      distractors,
      explanation: tex`At constant speed the engine force equals the resistance. $v = ${kmph} \times \frac{1000}{3600} = ${num(v)}\,\mathrm{m\,s^{-1}}$, so $P = Fv = ${f} \times ${num(v)} = ${num(watts)}\,\mathrm{W} = ${num(watts / 1000)}\,\mathrm{kW}$.`,
    };
  }),

  b.dynamic('lifting-power', { difficulty: 2, tags: ['power'] }, (r) => {
    const scenario = r.pick(['pump', 'crane', 'stairs'] as const);
    // [min power W, max power W, max lifting speed m/s] keep every scenario realistic.
    const limits = { pump: [100, 20000, Infinity], crane: [500, 60000, 2], stairs: [100, 1000, 1.5] } as const;
    const [pMin, pMax, vMax] = limits[scenario];
    // Per-scenario fallbacks (1 kW, 6 kW, 300 W); the loop below almost always replaces them.
    const fallback = { pump: [600, 20, 120], crane: [500, 12, 10], stairs: [50, 6, 10] } as const;
    let [m, h, t]: number[] = [...fallback[scenario]];
    for (let i = 0; i < 60; i++) {
      let mm: number;
      let hh: number;
      let times: number[];
      if (scenario === 'pump') {
        mm = r.multiple(100, 1500, 50);
        hh = r.pick([5, 6, 8, 10, 12, 15, 16, 18, 20, 24, 25, 30, 36, 40, 45, 50]);
        times = [60, 120, 180, 240, 300, 360, 600];
      } else if (scenario === 'crane') {
        mm = r.multiple(100, 3000, 50);
        hh = r.int(4, 30);
        times = range(5, 60);
      } else {
        mm = r.int(40, 90);
        hh = r.int(3, 15);
        times = range(4, 20);
      }
      const energy = mm * 10 * hh;
      const ok = times.filter((s) => {
        const p = energy / s;
        return energy % s === 0 && p >= pMin && p <= pMax && exact3(p) && hh / s <= vMax;
      });
      if (ok.length) {
        m = mm;
        h = hh;
        t = r.pick(ok);
        break;
      }
    }
    const energy = m * 10 * h;
    const power = energy / t;
    const useKw = power >= 1000 && exact3(power / 1000);
    const format = (x: number): string => (useKw ? q$(x / 1000, U.kW) : q$(x, U.W));
    const tail = useKw ? tex` = ${num(power / 1000)}\,\mathrm{kW}` : '';
    const minutes = t / 60;
    let stem: string;
    let wrong: number[];
    let given: string;
    if (scenario === 'pump') {
      const timeText = minutes === 1 ? 'one minute' : `${minutes} minutes`;
      stem = tex`A pump raises $${qty(m, U.L)}$ of water into a tank $${qty(h, U.m)}$ above it in ${timeText}. The output power of the pump is (mass of $1\,\mathrm{L}$ of water $= 1\,\mathrm{kg}$; take $g = 10\,\mathrm{m\,s^{-2}}$):`;
      // time left in minutes; forgot g; forgot to divide by the time (gave the energy);
      // spurious 1/2 (needed when t is one minute, where the first and third coincide)
      wrong = [energy / minutes, (m * h) / t, energy, energy / (2 * t)];
      given = tex`Here $m = ${m}\,\mathrm{kg}$ and $t = ${minutes} \times 60 = ${t}\,\mathrm{s}$. `;
    } else if (scenario === 'crane') {
      stem = tex`A crane lifts a load of mass $${qty(m, U.kg)}$ vertically upward through $${qty(h, U.m)}$ at a steady speed in $${qty(t, U.s)}$. The power developed by the crane is ${G10}:`;
      // forgot to divide by the time; forgot g; spurious 1/2
      wrong = [energy, (m * h) / t, energy / (2 * t)];
      given = '';
    } else {
      stem = tex`A student of mass $${qty(m, U.kg)}$ runs up a staircase of vertical height $${qty(h, U.m)}$ in $${qty(t, U.s)}$. The average power developed against gravity is ${G10}:`;
      wrong = [energy, (m * h) / t, energy / (2 * t)];
      given = '';
    }
    const { answer, distractors } = numericOptions(r, { correct: power, wrong, format });
    return {
      stem,
      answer,
      distractors,
      explanation: tex`${given}$P = \frac{W}{t} = \frac{mgh}{t} = \frac{(${m})(10)(${h})}{${t}} = ${num(power)}\,\mathrm{W}${tail}$.`,
    };
  }),

  // =========================================================================
  // Kinetic and potential energy
  // =========================================================================
  b.dynamic('kinetic-energy', { difficulty: 1, tags: ['kinetic and potential energy'] }, (r) => {
    // Even masses keep 1/2 mv^2 an exact integer, as in real MCQs.
    const m = r.pick([2, 4, 6, 8, 10, 12]);
    const v = r.int(3, 20);
    const ke = 0.5 * m * v * v;
    const { answer, distractors } = numericOptions(r, {
      correct: ke,
      // forgot the 1/2; forgot to square v; computed the momentum mv instead
      wrong: [m * v * v, 0.5 * m * v, m * v],
      format: (x) => q$(x, U.J),
    });
    return {
      stem: tex`A body of mass $${qty(m, U.kg)}$ moves with a speed of $${qty(v, U.mps)}$. Its kinetic energy is:`,
      answer,
      distractors,
      explanation: tex`$K.E. = \frac{1}{2}mv^2 = \frac{1}{2}(${num(m)})(${v})^2 = ${num(ke)}\,\mathrm{J}$.`,
    };
  }),

  b.dynamic('ke-percent-change', { difficulty: 2, origin: 'past-paper', tags: ['kinetic and potential energy'] }, (r) => {
    const pct = (x: number): string => `$${num(x)}\\%$`;
    const mode = r.pick(['speed-up', 'momentum-up', 'ke-to-momentum', 'speed-down'] as const);
    if (mode === 'speed-down') {
      const x = r.pick([10, 20, 30, 40, 50]);
      const f = (100 - x) / 100;
      const left = (100 - x) ** 2 / 100; // new K.E. as a percentage of the old
      const drop = 100 - left;
      const answer = pct(drop);
      return {
        stem: `If the speed of a body is reduced by ${x}%, its kinetic energy decreases by:`,
        answer,
        // doubled the percentage; took K.E. proportional to v; gave the K.E. that remains
        distractors: pickDistractors(answer, [pct(2 * x), pct(x), pct(left)]),
        explanation: tex`$K.E. \propto v^2$. The new speed is $${num(f)}v$, so the new K.E. is $(${num(f)})^2 = ${num(left / 100)}$ of the old one: a decrease of $100\% - ${num(left)}\% = ${num(drop)}\%$.`,
      };
    }
    const x = r.pick([10, 20, 30, 40, 50, 100, 200]);
    const f = (100 + x) / 100;
    const f2 = (100 + x) ** 2 / 10000;
    const rise = (100 + x) ** 2 / 100 - 100; // percentage rise in K.E.
    if (mode === 'ke-to-momentum') {
      const answer = pct(x);
      return {
        stem: `If the kinetic energy of a body increases by ${rise}%, its momentum increases by:`,
        answer,
        // halved the percentage; took p proportional to K.E.; gave the new momentum as a percentage of the old
        distractors: pickDistractors(answer, [pct(rise / 2), pct(rise), pct(100 + x)]),
        explanation: tex`$p = \sqrt{2mK} \propto \sqrt{K}$. The new K.E. is $${num(f2)}K$, so the new momentum is $\sqrt{${num(f2)}}\,p = ${num(f)}p$: an increase of $${x}\%$.`,
      };
    }
    const answer = pct(rise);
    const what = mode === 'speed-up' ? 'speed' : 'momentum';
    const law = mode === 'speed-up' ? tex`$K.E. = \frac{1}{2}mv^2 \propto v^2$` : tex`$K.E. = \frac{p^2}{2m} \propto p^2$`;
    return {
      stem: `If the ${what} of a body is increased by ${x}%${mode === 'momentum-up' ? ' (its mass remaining constant)' : ''}, its kinetic energy increases by:`,
      answer,
      // doubled the percentage; took K.E. proportional to the quantity; gave the new K.E. as a percentage of the old
      distractors: pickDistractors(answer, [pct(2 * x), pct(x), pct(100 + rise)]),
      explanation: tex`${law}. The ${what} becomes $${num(f)}$ times as large, so the K.E. becomes $(${num(f)})^2 = ${num(f2)}$ times as large: an increase of $${num(rise)}\%$.`,
    };
  }),

  // =========================================================================
  // Work-energy theorem
  // =========================================================================
  b.dynamic('stopping-force', { difficulty: 2, tags: ['work-energy theorem'] }, (r) => {
    if (r.chance(0.6)) {
      const { m, v, s, f } = r.pick(BULLET_CASES);
      const mk = m / 1000;
      const sm = s / 100;
      const { fmt, texOf } = forceFormatter(f);
      const { answer, distractors } = numericOptions(r, {
        correct: f,
        // forgot the 1/2; used the depth in cm as metres; used momentum/distance; grams as kg
        wrong: [2 * f, f / 100, (mk * v) / sm, f * 1000],
        format: fmt,
      });
      return {
        stem: tex`A bullet of mass $${qty(m, U.g)}$ moving at $${qty(v, U.mps)}$ penetrates $${qty(s, U.cm)}$ into a fixed wooden block before coming to rest. The average resistive force exerted by the wood on the bullet is:`,
        answer,
        distractors,
        explanation: tex`By the work-energy theorem, the work done against the resistive force equals the loss of K.E.: $Fs = \frac{1}{2}mv^2$, so $F = \frac{mv^2}{2s} = \frac{(${num(mk)})(${v})^2}{2(${num(sm)})} = ${texOf(f)}$.`,
      };
    }
    const { m, v, s, f } = r.pick(CAR_CASES);
    const { fmt, texOf } = forceFormatter(f);
    const { answer, distractors } = numericOptions(r, {
      correct: f,
      // forgot the 1/2; gave the K.E. itself; used momentum/distance
      wrong: [2 * f, 0.5 * m * v * v, (m * v) / s],
      format: fmt,
    });
    return {
      stem: tex`A car of mass $${qty(m, U.kg)}$ moving at $${qty(v, U.mps)}$ is brought to rest by its brakes over a distance of $${qty(s, U.m)}$. The average braking force is:`,
      answer,
      distractors,
      explanation: tex`The work done by the braking force removes all the K.E.: $Fs = \frac{1}{2}mv^2$, so $F = \frac{mv^2}{2s} = \frac{(${m})(${v})^2}{2(${s})} = ${texOf(f)}$.`,
    };
  }),

  b.dynamic('stopping-distance-scaling', { difficulty: 2, origin: 'past-paper', tags: ['work-energy theorem'] }, (r) => {
    const { v1, v2, d1, p, q } = r.pick(STOPPING_CASES);
    const ratio2 = frac(p * p, q * q);
    const d2 = ratio2.toNumber() * d1;
    // assumed d proportional to v; inverted the speed ratio; thought d is unchanged; cubed the ratio
    const candidates = [(d1 * p) / q, (d1 * q * q) / (p * p), d1, (d1 * p ** 3) / q ** 3].filter(
      (x) => isTidy(x, 2) && exact3(x),
    );
    const { answer, distractors } = numericOptions(r, {
      correct: d2,
      wrong: candidates,
      format: (x) => q$(x, U.m),
    });
    return {
      stem: tex`A car moving at $${qty(v1, U.kmph)}$ can be stopped by its brakes within a distance of $${qty(d1, U.m)}$. If the car is moving at $${qty(v2, U.kmph)}$, the minimum stopping distance with the same braking force is:`,
      answer,
      distractors,
      explanation: tex`The work done by the braking force removes the K.E.: $Fd = \frac{1}{2}mv^2$, so with $F$ fixed $d \propto v^2$. Hence $d_2 = d_1\left(\frac{v_2}{v_1}\right)^2 = ${d1}\left(\frac{${v2}}{${v1}}\right)^2 = ${d1} \times ${ratio2.toTex()} = ${num(d2)}\,\mathrm{m}$.`,
    };
  }),

  // =========================================================================
  // Conservation of energy
  // =========================================================================
  b.dynamic('speed-from-energy-conservation', { difficulty: 2, tags: ['conservation of energy'] }, (r) => {
    const { u, w, v } = r.pick(LAUNCH_CASES);
    const h = (w * w) / 20;
    const mode = r.pick(['down', 'up', 'horizontal', 'angle', 'track'] as const);
    const angle = r.pick([30, 45, 60]);
    const uq = qty(u, U.mps);
    const hq = qty(h, U.m);
    const stems = {
      down: tex`A ball is thrown vertically downward with a speed of $${uq}$ from the top of a tower $${hq}$ high. Neglecting air resistance, its speed just before it hits the ground is ${G10}:`,
      up: tex`A ball is thrown vertically upward with a speed of $${uq}$ from the edge of a flat roof $${hq}$ above the ground. It rises, falls past the roof and lands on the ground. Neglecting air resistance, its speed just before it hits the ground is ${G10}:`,
      horizontal: tex`A stone is thrown horizontally with a speed of $${uq}$ from the top of a cliff $${hq}$ high. Neglecting air resistance, the speed with which it strikes the level ground below is ${G10}:`,
      angle: tex`A stone is projected with a speed of $${uq}$ at $${qty(angle, U.deg)}$ above the horizontal from the top of a cliff $${hq}$ high. Neglecting air resistance, its speed just before it strikes the level ground below is ${G10}:`,
      track: tex`A small block moving at $${uq}$ at the top of a smooth curved track slides down through a vertical height of $${hq}$. Its speed at the bottom of the track is ${G10}:`,
    };
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      // ignored the initial speed; added the speeds; ignored the drop
      wrong: [w, u + w, u],
      format: (x) => q$(x, U.mps),
    });
    return {
      stem: stems[mode],
      answer,
      distractors,
      explanation: tex`Mechanical energy is conserved, and the result does not depend on the direction of launch or the shape of the path: $\frac{1}{2}mv^2 = \frac{1}{2}mu^2 + mgh$, so $v = \sqrt{u^2 + 2gh} = \sqrt{${u}^2 + 2(10)(${num(h)})} = \sqrt{${u * u} + ${w * w}} = ${v}\,\mathrm{m\,s^{-1}}$.`,
    };
  }),

  b.dynamic('ke-pe-ratio-height', { difficulty: 3, origin: 'past-paper', tags: ['conservation of energy'] }, (r) => {
    const n = r.pick([2, 3, 4, 5, 9] as const);
    // H is a multiple of lcm(2n, n + 1), so every candidate height below is a whole number.
    const base = { 2: 12, 3: 12, 4: 40, 5: 30, 9: 90 }[n];
    const H = base * r.int(1, Math.floor(240 / base));
    const times = { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times', 9: 'nine times' }[n];
    const keAsked = r.chance(0.6);
    const x = keAsked ? H / (n + 1) : (n * H) / (n + 1);
    const candidates = keAsked
      ? // swapped K and U; took h = H/n; assumed the midpoint; other slips
        [(n * H) / (n + 1), H / n, H / 2, H / (2 * n), H / (n + 2), H / 4]
      : [H / (n + 1), H / 2, ((n - 1) * H) / n, H / n, ((n + 1) * H) / (n + 2), H / 4];
    const { answer, distractors } = numericOptions(r, {
      correct: x,
      wrong: candidates.filter((c) => Number.isInteger(c) && c > 0 && c < H),
      format: (y) => q$(y, U.m),
    });
    const relation = keAsked
      ? tex`Setting $K = ${n}U$: $H - h = ${n}h$, so $h = \frac{H}{${n + 1}} = \frac{${H}}{${n + 1}} = ${x}\,\mathrm{m}$.`
      : tex`Setting $U = ${n}K$: $h = ${n}(H - h)$, so $h = \frac{${n}H}{${n + 1}} = \frac{${n} \times ${H}}{${n + 1}} = ${x}\,\mathrm{m}$.`;
    return {
      stem: tex`A stone is dropped from rest from a height of $${qty(H, U.m)}$ above the ground. Neglecting air resistance and taking the potential energy at the ground as zero, at what height above the ground is its ${keAsked ? 'kinetic' : 'potential'} energy ${times} its ${keAsked ? 'potential' : 'kinetic'} energy?`,
      answer,
      distractors,
      explanation: tex`The total energy stays $mgH$. At height $h$: $U = mgh$ and $K = mg(H - h)$. ${relation}`,
    };
  }),

  b.dynamic(
    'projectile-energy-at-top',
    { difficulty: 3, tags: ['kinetic and potential energy', 'conservation of energy'] },
    (r) => {
      const theta = r.pick([30, 45, 60] as const);
      const cos2 = { 30: frac(3, 4), 45: frac(1, 2), 60: frac(1, 4) }[theta];
      const sin2 = frac(1).sub(cos2);
      const mode = r.pick(['ke', 'ke', 'pe', 'mass'] as const);
      const fmt = (x: number): string => q$(x, U.J);
      if (mode === 'mass') {
        // Only (m, u) pairs whose energies print exactly (e.g. not 168.75 J -> "169 J").
        const pairs: Array<[number, number]> = [];
        for (const mass of [0.1, 0.2, 0.4, 0.5, 1, 2]) {
          for (const speed of [10, 20, 30, 40]) {
            const total = 0.5 * mass * speed * speed;
            if (exact3(total * cos2.toNumber()) && exact3(total * sin2.toNumber())) pairs.push([mass, speed]);
          }
        }
        const [m, u] = r.pick(pairs);
        const e = 0.5 * m * u * u;
        const ke = e * cos2.toNumber();
        const { answer, distractors } = numericOptions(r, {
          correct: ke,
          // used sin^2 instead of cos^2; thought K.E. is zero at the top; thought it is unchanged
          wrong: [e * sin2.toNumber(), 0, e, e / 2, e / 4, (3 * e) / 4],
          format: fmt,
          allowZero: true,
        });
        return {
          stem: tex`A ball of mass $${qty(m, U.kg)}$ is thrown with a speed of $${qty(u, U.mps)}$ at $${qty(theta, U.deg)}$ above the horizontal. Neglecting air resistance, its kinetic energy at the highest point of its path is:`,
          answer,
          distractors,
          explanation: tex`At the highest point the vertical velocity is zero but the horizontal component $u\cos\theta$ is unchanged, so $K_{top} = \frac{1}{2}m(u\cos\theta)^2 = \frac{1}{2}(${num(m)})(${u})^2 \times ${cos2.toTex()} = ${num(e)} \times ${cos2.toTex()} = ${num(ke)}\,\mathrm{J}$.`,
        };
      }
      // Multiples of 40 keep E/4, E/2 and 3E/4 whole numbers (no "113 J" for 112.5 J).
      const e = r.multiple(40, 800, 40);
      const launch = tex`A ball is projected from level ground with a kinetic energy of $${qty(e, U.J)}$ at $${qty(theta, U.deg)}$ to the horizontal. Neglecting air resistance,`;
      if (mode === 'pe') {
        const pe = e * sin2.toNumber();
        const { answer, distractors } = numericOptions(r, {
          correct: pe,
          // used cos^2 (that is the K.E. left); assumed all K.E. becomes P.E.; other fractions
          wrong: [e * cos2.toNumber(), e, e / 2, e / 4, (3 * e) / 4],
          format: fmt,
        });
        return {
          stem: tex`${launch} the gain in its gravitational potential energy when it reaches the highest point of its path is:`,
          answer,
          distractors,
          explanation: tex`At the top only the horizontal velocity $u\cos\theta$ remains, so $K_{top} = E\cos^2\theta$. By conservation of energy the gain in P.E. is $E - E\cos^2\theta = E\sin^2\theta = ${e} \times ${sin2.toTex()} = ${num(pe)}\,\mathrm{J}$.`,
        };
      }
      const ke = e * cos2.toNumber();
      const { answer, distractors } = numericOptions(r, {
        correct: ke,
        wrong: [e * sin2.toNumber(), 0, e, e / 2, e / 4, (3 * e) / 4],
        format: fmt,
        allowZero: true,
      });
      return {
        stem: tex`${launch} its kinetic energy at the highest point of its path is:`,
        answer,
        distractors,
        explanation: tex`At the highest point the vertical velocity is zero but the horizontal component $u\cos\theta$ is unchanged, so $K_{top} = \frac{1}{2}m(u\cos\theta)^2 = E\cos^2\theta = ${e} \times ${cos2.toTex()} = ${num(ke)}\,\mathrm{J}$ (not zero).`,
      };
    },
  ),

  // =========================================================================
  // Escape velocity
  // =========================================================================
  b.dynamic('escape-velocity-scaling', { difficulty: 2, origin: 'past-paper', tags: ['escape velocity'] }, (r) => {
    // Multipliers as [numerator, denominator]; [1, 1] means unchanged.
    const word = (n: number, d: number): string => {
      const key = `${n}/${d}`;
      const words: Record<string, string> = {
        '2/1': 'doubled',
        '3/1': 'tripled',
        '4/1': 'made four times as large',
        '8/1': 'made eight times as large',
        '9/1': 'made nine times as large',
        '1/2': 'halved',
        '1/3': 'reduced to one-third',
        '1/4': 'reduced to one-fourth',
        '1/9': 'reduced to one-ninth',
      };
      return words[key] ?? key;
    };
    const cases: ReadonlyArray<readonly [number, number, number, number]> = [
      // [mass n, mass d, radius n, radius d]
      [2, 1, 1, 2],
      [4, 1, 1, 1],
      [1, 1, 4, 1],
      [9, 1, 1, 1],
      [2, 1, 2, 1],
      [8, 1, 2, 1],
      [2, 1, 1, 1],
      [1, 2, 1, 1],
      [1, 1, 2, 1],
      [1, 1, 1, 2],
      [4, 1, 1, 4],
      [3, 1, 1, 3],
      [1, 2, 2, 1],
      [4, 1, 2, 1],
      [1, 1, 9, 1],
      [9, 1, 4, 1],
    ];
    const [mn, md, rn, rd] = r.pick(cases);
    const kn = mn * rd; // M/R ratio = (mn/md) / (rn/rd)
    const kd = md * rn;
    const option = (n: number, d: number): string => {
      const t = sqrtRatioTex(n, d);
      return t === '1' ? '$v_e$' : `$${t}\\,v_e$`;
    };
    const answer = option(kn, kd);
    const distractors = pickDistractors(answer, [
      option(kn * kn, kd * kd), // forgot the square root
      option(kd, kn), // inverted the ratio (used R/M)
      option(mn * rn, md * rd), // multiplied the factors instead of dividing
      option(1, 1), // thought it is unchanged
      option(kd * kd, kn * kn),
      option(4, 1),
      option(1, 4),
      option(2, 1),
      option(16, 1),
    ]);
    const changed = (n: number, d: number): boolean => n !== d;
    let condition: string;
    if (!changed(rn, rd)) condition = `the mass of the planet is ${word(mn, md)} while its radius stays the same`;
    else if (!changed(mn, md)) condition = `the radius of the planet is ${word(rn, rd)} while its mass stays the same`;
    else condition = `the mass of the planet is ${word(mn, md)} and its radius is ${word(rn, rd)}`;
    const result = sqrtRatioTex(kn, kd);
    const resultTex = result === '1' ? 'v_e' : `${result}\\,v_e`;
    const factor = frac(kn, kd).toTex();
    // Skip "= sqrt(2) v_e" after "sqrt(2) v_e" when the surd does not simplify.
    const rootTex = `\\sqrt{${factor}}\\,v_e${result === `\\sqrt{${factor}}` ? '' : ` = ${resultTex}`}`;
    return {
      stem: tex`The escape velocity from the surface of a planet is $v_e$. If ${condition}, the escape velocity from its surface becomes:`,
      answer,
      distractors,
      explanation: tex`$v_e = \sqrt{\frac{2GM}{R}}$, so $v_e \propto \sqrt{\frac{M}{R}}$. Here $\frac{M}{R}$ is multiplied by $${frac(mn, md).toTex()} \div ${frac(rn, rd).toTex()} = ${factor}$, so the escape velocity becomes $${rootTex}$.`,
    };
  }),

  // =========================================================================
  // Fixed (conceptual) questions
  // =========================================================================
  ...b.mcqs([
    {
      id: 'centripetal-force-work',
      d: 1,
      t: ['work'],
      q: 'The work done by the centripetal force on a body moving uniformly in a circle, during one complete revolution, is:',
      a: 'zero',
      x: [tex`$2\pi mv^2$`, tex`$mv^2$`, tex`$\frac{1}{2}mv^2$`],
      e: tex`The centripetal force is always perpendicular to the velocity, so at every instant $W = Fd\cos 90^{\circ} = 0$. Multiplying the force $\frac{mv^2}{r}$ by the circumference $2\pi r$ (to get $2\pi mv^2$) wrongly assumes they are parallel.`,
    },
    {
      id: 'conservative-force',
      d: 1,
      t: ['work'],
      q: 'Which of the following is a non-conservative force?',
      a: 'Frictional force',
      x: ['Gravitational force', 'Electrostatic force', 'Elastic spring force'],
      e: 'Work done by friction depends on the path taken, so friction is non-conservative; the others do path-independent work (zero work round any closed path).',
    },
    {
      id: 'kwh-is-energy',
      d: 1,
      t: ['power'],
      q: 'The kilowatt-hour (kWh) is a unit of:',
      a: 'energy',
      x: ['power', 'force', 'momentum'],
      e: tex`$1\,\mathrm{kWh} = 1000\,\mathrm{W} \times 3600\,\mathrm{s} = 3.6 \times 10^{6}\,\mathrm{J}$, so it measures energy.`,
    },
    {
      id: 'momentum-doubled-ke',
      d: 1,
      o: 'past-paper',
      t: ['kinetic and potential energy'],
      q: 'If the momentum of a body is doubled, its kinetic energy becomes:',
      a: 'four times',
      x: ['two times', tex`$\sqrt{2}$ times`, 'eight times'],
      e: tex`$K.E. = \frac{p^2}{2m}$, so doubling $p$ (same mass) multiplies the kinetic energy by $2^2 = 4$.`,
    },
    {
      id: 'absolute-potential-energy',
      d: 2,
      t: ['kinetic and potential energy'],
      q: tex`Taking the potential energy to be zero at infinity, the gravitational potential energy of a body of mass $m$ on the surface of the Earth (mass $M$, radius $R$) is:`,
      a: tex`$-\frac{GMm}{R}$`,
      x: [tex`$\frac{GMm}{R}$`, tex`$-\frac{GMm}{R^{2}}$`, tex`$0$`],
      e: tex`With the zero level at infinity, gravity does positive work $\frac{GMm}{R}$ as the body comes in to the surface, so its potential energy falls below zero: $U = -\frac{GMm}{R}$. The expression $\frac{GMm}{R^{2}}$ is the weight of the body, a force.`,
    },
    {
      id: 'work-to-height-of-earth-radius',
      d: 3,
      o: 'past-paper',
      t: ['kinetic and potential energy'],
      q: tex`The work done in slowly raising a body of mass $m$ from the Earth's surface to a height equal to the Earth's radius $R$ is ($g$ is the acceleration due to gravity at the Earth's surface):`,
      a: tex`$\frac{1}{2}mgR$`,
      x: [tex`$mgR$`, tex`$2mgR$`, tex`$\frac{1}{4}mgR$`],
      e: tex`$g$ does not stay constant over such a height, so use $U = -\frac{GMm}{r}$: $W = GMm\left(\frac{1}{R} - \frac{1}{2R}\right) = \frac{GMm}{2R} = \frac{1}{2}mgR$, since $GM = gR^2$. The answer $mgR$ wrongly assumes $g$ is the same at every height.`,
    },
    {
      id: 'net-work-at-constant-velocity',
      d: 2,
      t: ['work-energy theorem'],
      q: 'A crate is pushed across a rough horizontal floor at constant velocity. The net work done on the crate by all the forces acting on it is:',
      a: 'zero, as its kinetic energy does not change',
      x: [
        'positive, as the applied force does positive work',
        'negative, as friction does negative work',
        'positive, as heat is produced by friction',
      ],
      e: 'By the work-energy theorem, net work = change in kinetic energy. At constant velocity the K.E. does not change, so the positive work of the push exactly cancels the negative work of friction and the net work is zero.',
    },
    {
      id: 'escape-velocity-independent-of-mass',
      d: 1,
      t: ['escape velocity'],
      q: 'The escape velocity of a body from the surface of the Earth does **not** depend on:',
      a: 'the mass of the body',
      x: ['the mass of the Earth', 'the radius of the Earth', 'the mean density of the Earth'],
      e: tex`From $\frac{1}{2}mv_e^2 = \frac{GMm}{R}$, the mass $m$ of the body cancels: $v_e = \sqrt{\frac{2GM}{R}}$ depends only on the Earth's mass and radius (and hence its density).`,
    },
    {
      id: 'escape-and-orbital-speed',
      d: 2,
      o: 'past-paper',
      t: ['escape velocity'],
      q: tex`A satellite orbits the Earth just above its surface with orbital speed $v_o$. The escape velocity from the Earth's surface is:`,
      a: tex`$\sqrt{2}\,v_o$`,
      x: [tex`$2\,v_o$`, tex`$\frac{v_o}{\sqrt{2}}$`, tex`$v_o$`],
      e: tex`For a close orbit gravity supplies the centripetal force, $mg = \frac{mv_o^2}{R}$, so $v_o = \sqrt{gR}$, while $v_e = \sqrt{2gR}$. Hence $v_e = \sqrt{2}\,v_o$ (about $7.9$ and $11.2\,\mathrm{km\,s^{-1}}$ for the Earth).`,
    },
    {
      id: 'work-by-gravity-when-lifting',
      d: 2,
      t: ['work'],
      q: tex`A body of mass $m$ is lifted vertically upward through a height $h$ at a constant speed. The work done on the body by gravity is:`,
      a: tex`negative ($-mgh$), as gravity acts opposite to the displacement`,
      x: [
        tex`positive ($+mgh$), as the body gains potential energy`,
        'zero, as the speed of the body is constant',
        'zero, as gravity is a conservative force',
      ],
      e: tex`$W_g = mgh\cos 180^{\circ} = -mgh$. The lifting force does $+mgh$, so the net work is zero (no change in K.E.), but the work of gravity alone is not. Gravity does zero work only round a closed path.`,
    },
    {
      id: 'not-a-unit-of-energy',
      d: 1,
      t: ['work', 'power'],
      q: 'Which of the following is **not** a unit of energy?',
      a: 'watt',
      x: ['joule', 'electron-volt', 'kilowatt-hour'],
      e: tex`The watt ($1\,\mathrm{W} = 1\,\mathrm{J\,s^{-1}}$) is a unit of power. The joule, the electron-volt ($1.6 \times 10^{-19}\,\mathrm{J}$) and the kilowatt-hour ($3.6 \times 10^{6}\,\mathrm{J}$) all measure energy.`,
    },
    {
      id: 'power-is-force-dot-velocity',
      d: 1,
      t: ['power'],
      q: tex`The scalar product $\vec{F}\cdot\vec{v}$ of the force acting on a body and the velocity of the body gives:`,
      a: 'the power delivered by the force',
      x: ['the work done by the force', 'the impulse of the force', 'the kinetic energy of the body'],
      e: tex`Power is the rate of doing work: $P = \frac{\Delta W}{\Delta t} = \frac{\vec{F}\cdot\Delta\vec{d}}{\Delta t} = \vec{F}\cdot\vec{v}$. Work itself is $\vec{F}\cdot\vec{d}$, and impulse is $\vec{F}\,t$.`,
    },
    {
      id: 'dimensions-of-power',
      d: 1,
      t: ['power'],
      q: 'The dimensions of power are:',
      a: tex`$[ML^{2}T^{-3}]$`,
      x: [tex`$[ML^{2}T^{-2}]$`, tex`$[MLT^{-3}]$`, tex`$[MLT^{-2}]$`],
      e: tex`Power is work per unit time: $[ML^{2}T^{-2}] \div [T] = [ML^{2}T^{-3}]$. $[ML^{2}T^{-2}]$ is the dimension of work or energy and $[MLT^{-2}]$ that of force.`,
    },
    {
      id: 'horsepower-in-watts',
      d: 1,
      t: ['power'],
      q: 'One horsepower (hp) is equal to about:',
      a: tex`$746\,\mathrm{W}$`,
      x: [tex`$1000\,\mathrm{W}$`, tex`$550\,\mathrm{W}$`, tex`$746\,\mathrm{kW}$`],
      e: tex`The horsepower is an older unit of power: $1\,\mathrm{hp} \approx 746\,\mathrm{W}$, about three-quarters of a kilowatt. The number $550$ belongs to its definition in foot-pounds per second, not in watts.`,
    },
    {
      id: 'work-energy-principle-statement',
      d: 1,
      t: ['work-energy theorem'],
      q: 'According to the work-energy principle, the work done by the net force acting on a body is equal to the change in its:',
      a: 'kinetic energy',
      x: ['potential energy', 'momentum', 'total mechanical energy'],
      e: tex`The work-energy principle states $W_{net} = \Delta K.E. = \frac{1}{2}mv_f^2 - \frac{1}{2}mv_i^2$. The change in momentum equals the impulse of the net force, not its work.`,
    },
    {
      id: 'free-fall-mechanical-energy',
      d: 1,
      t: ['conservation of energy'],
      q: 'A stone falls freely from rest. Neglecting air resistance, its total mechanical energy during the fall:',
      a: 'remains constant',
      x: ['increases', 'decreases', 'first increases and then decreases'],
      e: 'Only gravity, a conservative force, does work on the stone, so the loss of potential energy equals the gain of kinetic energy and their sum stays constant.',
    },
    {
      id: 'fall-against-air-resistance',
      d: 2,
      t: ['conservation of energy'],
      q: tex`A body of mass $m$ falls from rest through a height $h$ in air and reaches a speed $v$. If $f$ is the average force of air resistance on it, which relation is correct?`,
      a: tex`$mgh = \frac{1}{2}mv^2 + fh$`,
      x: [tex`$mgh = \frac{1}{2}mv^2 - fh$`, tex`$mgh = \frac{1}{2}mv^2$`, tex`$fh = mgh + \frac{1}{2}mv^2$`],
      e: tex`Loss of P.E. = gain of K.E. + work done against friction: $mgh = \frac{1}{2}mv^2 + fh$. Part of the P.E. is used up against air resistance, so the K.E. gained is less than $mgh$.`,
    },
    {
      id: 'escape-velocity-of-earth',
      d: 1,
      t: ['escape velocity'],
      q: 'The escape velocity from the surface of the Earth is about:',
      a: tex`$11.2\,\mathrm{km\,s^{-1}}$`,
      x: [tex`$7.9\,\mathrm{km\,s^{-1}}$`, tex`$9.8\,\mathrm{km\,s^{-1}}$`, tex`$2.4\,\mathrm{km\,s^{-1}}$`],
      e: tex`$v_e = \sqrt{2gR} = \sqrt{2(9.8)(6.4 \times 10^{6})} \approx 1.12 \times 10^{4}\,\mathrm{m\,s^{-1}} = 11.2\,\mathrm{km\,s^{-1}}$. $7.9\,\mathrm{km\,s^{-1}}$ is the orbital speed just above the surface, and $2.4\,\mathrm{km\,s^{-1}}$ is the escape velocity from the Moon.`,
    },
  ]),
]);
