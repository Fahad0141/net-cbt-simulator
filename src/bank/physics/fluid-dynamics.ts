/**
 * Physics - Fluid Dynamics (FSc Part I).
 *
 * Coverage
 * - viscosity: equivalent units, temperature dependence
 * - Stokes law: drag force F = 6 pi eta r v
 * - terminal velocity: value, r^2 scaling, coalescing and splitting drops, the force condition
 * - equation of continuity: steady flow, speeds in pipes, volume and mass flow rates
 * - Bernoulli equation: Torricelli's theorem, pressure difference and venturi meter, lift on wings
 *   and roofs, range of a jet from a tank, meaning of its terms, everyday applications, ideal fluid,
 *   blood pressure
 *
 * Parameter tables are built once at load time and keep only combinations whose answers and
 * distractors are exact short decimals (no rounding in the options).
 */
import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { coefTex, frac, num, numericOptions, pickDistractors, q$, qty, sci, tex, U } from '@/engine/helpers';

// ------------------------------------------------------------------------------------------
// Local helpers
// ------------------------------------------------------------------------------------------

/** Units used in this chapter that are not in `U` (LaTeX, for `qty`/`q$`). */
const UNIT = {
  viscosity: 'N\\,s\\,m^{-2}',
  cmps: 'cm\\,s^{-1}',
  mmps: 'mm\\,s^{-1}',
  um: '\\mu m',
  density: 'kg\\,m^{-3}',
  cm2: 'cm^{2}',
  kPa: 'kPa',
  kN: 'kN',
  kgps: 'kg\\,s^{-1}',
} as const;

/** Removes binary floating-point noise: 0.1 * 3 -> 0.3. */
const clean = (x: number): number => Number(x.toPrecision(12));

/** True when `x` is non-zero and has at most `sig` significant figures (printed exactly by `num`/`sci`). */
function isNice(x: number, sig = 3): boolean {
  if (!Number.isFinite(x) || x === 0) return false;
  return Math.abs(Number(x.toPrecision(sig)) - x) <= 1e-9 * Math.abs(x);
}

/** `x` when it prints exactly, otherwise NaN (which `numericOptions` skips): for optional distractors. */
const exact = (x: number): number => (isNice(clean(x)) ? clean(x) : NaN);

/** k times pi in scientific form, for math mode: 7.2e-4 -> `7.2\pi \times 10^{-4}`. */
function piTex(k: number): string {
  const [mantissa = '', power] = sci(k).split(' \\times ');
  const coefficient = mantissa === '1' ? '' : mantissa;
  return power ? `${coefficient}\\pi \\times ${power}` : `${coefficient}\\pi`;
}

/** A multiple of v as an option: `$4v$`, `$\frac{1}{4}v$`, `$v$`. */
const timesV = (f: Fraction): string => `$${coefTex(f, 'v')}$`;

/** Groups cases by a key so a template can first pick the key uniformly (balances variety). */
function groupBy<T>(items: readonly T[], key: (item: T) => number): T[][] {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return [...groups.values()];
}

// ------------------------------------------------------------------------------------------
// Parameter tables (exact answers only)
// ------------------------------------------------------------------------------------------

/** Stokes drag: [eta (N s m^-2), radius (mm), speed (cm s^-1)]; F/pi = 6 eta r v stays a short decimal. */
const STOKES_CASES: ReadonlyArray<readonly [number, number, number]> = (() => {
  const out: Array<readonly [number, number, number]> = [];
  for (const eta of [0.5, 0.8, 1, 1.2, 1.5, 2]) {
    for (let a = 1; a <= 5; a++) {
      for (const c of [1, 2, 3, 4, 5, 6, 8, 10]) {
        const k = clean(6 * eta * a * c);
        if ([k, k / 6, k / 2].every((x) => isNice(clean(x)))) out.push([eta, a, c]);
      }
    }
  }
  return out;
})();

/**
 * Tiny spheres falling through air (eta = 1.8e-5 N s m^-2, g = 10 m s^-2):
 * v = 2 rho g r^2 / (9 eta) = (rho a^2 / 81) x 10^-5 m/s for a radius of a micrometres.
 * Keep [rho (kg m^-3), a (um)] where 81 divides rho a^2 (exact answer) and v <= 5 cm/s (Stokes regime).
 */
const AIR_DROP_CASES: ReadonlyArray<readonly [number, number]> = (() => {
  const out: Array<readonly [number, number]> = [];
  for (const rho of [800, 900, 1000, 1200, 1800, 2700]) {
    for (let a = 1; a <= 20; a++) {
      const units = (rho * a * a) / 81;
      // 0.75 v (forgot the 4/3 in the volume) must also be exact, as it is used as a distractor.
      if (Number.isInteger(units) && isNice(units, 2) && isNice(0.75 * units) && units <= 5000) out.push([rho, a]);
    }
  }
  return out;
})();

/** What a falling sphere of each density in `AIR_DROP_CASES` is called in the stem. */
const PARTICLE_NAMES: Readonly<Record<number, string>> = {
  800: 'oil droplet',
  900: 'oil droplet',
  1000: 'water droplet',
  1200: 'plastic bead',
  1800: 'dust particle',
  2700: 'aluminium particle',
};

interface PipeCase {
  big: number;
  small: number;
  vWide: number;
  vNarrow: number;
}

/**
 * Pipe sizes (cm) and speeds (m s^-1) for continuity, grouped by size ratio. `narrowing` cases ask
 * for the speed in the narrow part, `widening` cases for the speed in the wide part; each keeps the
 * answer and the main distractors exact.
 */
const PIPE_GROUPS = (() => {
  const sizes: ReadonlyArray<readonly [number, number]> = [
    [2, 1], [3, 1], [4, 1], [4, 2], [6, 2], [6, 3], [3, 2], [6, 4], [5, 2], [8, 4], [10, 5], [9, 6], [8, 2], [9, 3],
  ];
  const speeds = [0.2, 0.25, 0.3, 0.4, 0.45, 0.5, 0.6, 0.8, 0.9, 1, 1.2, 1.5, 1.6, 1.8, 2, 2.4, 2.5, 2.7, 3, 3.6, 4];
  const narrowing: PipeCase[] = [];
  const widening: PipeCase[] = [];
  for (const [big, small] of sizes) {
    const k = big / small;
    for (const vWide of speeds) {
      const vNarrow = clean(vWide * k * k);
      if (vNarrow < 0.5 || vNarrow > 30) continue;
      const item = { big, small, vWide, vNarrow };
      if ([vWide, vNarrow, vWide * k, vWide / k, vWide / (k * k)].every((x) => isNice(clean(x)))) narrowing.push(item);
      if ([vWide, vNarrow, vWide * k, vWide * k ** 3, vWide * k ** 4].every((x) => isNice(clean(x)))) widening.push(item);
    }
  }
  const ratio = (c: PipeCase) => c.big / c.small;
  return { narrowing: groupBy(narrowing, ratio), widening: groupBy(widening, ratio) };
})();

/** Filling a tank: [area (cm^2), speed (m s^-1), volume (litres)] with t = 10 L / (a v) a whole number of seconds. */
const FILL_CASES: ReadonlyArray<readonly [number, number, number]> = (() => {
  const out: Array<readonly [number, number, number]> = [];
  for (const a of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    for (const v of [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]) {
      for (const litres of [10, 12, 15, 18, 20, 24, 25, 30, 36, 40, 45, 50, 60, 75, 80, 90, 100, 120, 150, 200]) {
        const t = clean((10 * litres) / (a * v));
        if (Number.isInteger(t) && t >= 5 && t <= 600) out.push([a, v, litres]);
      }
    }
  }
  return out;
})();

/** Mass flow of water: [area (cm^2), speed (m s^-1)] with rho A v = 0.1 a v kg/s exact. */
const MASS_FLOW_CASES: ReadonlyArray<readonly [number, number]> = (() => {
  const out: Array<readonly [number, number]> = [];
  for (const a of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20]) {
    for (const v of [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]) {
      if (isNice(clean(0.1 * a * v))) out.push([a, v]);
    }
  }
  return out;
})();

/** Horizontal water pipe: [v_A, v_B] (m s^-1), v_B > v_A, every option an exact number of kPa. */
const SPEED_PAIRS: ReadonlyArray<readonly [number, number]> = (() => {
  const out: Array<readonly [number, number]> = [];
  for (const v1 of [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]) {
    for (const v2 of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10]) {
      if (v2 <= v1) continue;
      const values = [v2 * v2 - v1 * v1, (v2 - v1) ** 2, v2 * v2 + v1 * v1, v2 * v2].map((x) => clean(0.5 * x));
      if (values.every((x) => isNice(x))) out.push([v1, v2]);
    }
  }
  return out;
})();

/** Venturi: [narrow area (cm^2), area ratio k, wide-section speed (m s^-1)] with exact kPa options. */
const VENTURI_CASES: ReadonlyArray<readonly [number, number, number]> = (() => {
  const out: Array<readonly [number, number, number]> = [];
  for (const a2 of [2, 3, 4, 5, 6, 8, 10, 12]) {
    for (const k of [2, 3, 4]) {
      for (const v1 of [0.5, 1, 1.5, 2, 2.5, 3]) {
        const v2 = k * v1;
        const values = [v2 * v2 - v1 * v1, v2 * v2, (v2 - v1) ** 2].map((x) => clean(0.5 * x));
        if (v2 <= 12 && values.every((x) => isNice(x))) out.push([a2, k, v1]);
      }
    }
  }
  return out;
})();

/** Aeroplane wing in air of density 1.2: [speed below, speed above (m s^-1), area (m^2)], exact kN. */
const WING_CASES: ReadonlyArray<readonly [number, number, number]> = (() => {
  const out: Array<readonly [number, number, number]> = [];
  for (const below of [40, 50, 60, 70, 80, 90, 100]) {
    for (const extra of [10, 20, 30]) {
      for (const area of [10, 12, 15, 16, 20, 24, 25, 30, 40]) {
        const above = below + extra;
        const values = [above * above - below * below, (above - below) ** 2, above * above].map((x) => clean((0.6 * x * area) / 1000));
        if (values.every((x) => isNice(x))) out.push([below, above, area]);
      }
    }
  }
  return out;
})();

/** Wind over a flat roof (air density 1.2): [wind speed (m s^-1), roof area (m^2)], exact kN. */
const ROOF_CASES: ReadonlyArray<readonly [number, number]> = (() => {
  const out: Array<readonly [number, number]> = [];
  for (const v of [15, 20, 25, 30, 35, 40]) {
    for (const area of [40, 50, 60, 75, 80, 100, 120, 150, 200]) {
      const values = [0.6 * v * v * area, 0.6 * v * area, 0.6 * v * v].map((x) => clean(x / 1000));
      if (values.every((x) => isNice(x))) out.push([v, area]);
    }
  }
  return out;
})();

// ------------------------------------------------------------------------------------------
// Templates
// ------------------------------------------------------------------------------------------

export default defineBank('physics', 'fluid-dynamics', (b) => [
  // ---------------------------------------------------------------- viscosity and Stokes law
  b.dynamic('stokes-drag-force', { difficulty: 1, tags: ['Stokes law', 'viscosity'] }, (r) => {
    const [eta, a, c] = r.pick(STOKES_CASES);
    const k = clean(6 * eta * a * c * 1e-5); // drag force divided by pi, in newtons
    const { answer, distractors } = numericOptions(r, {
      correct: k,
      // Three of: forgot the 6; used F = 3 pi eta d v with the radius; left v in cm/s; left r in mm.
      wrong: r.shuffle([k / 6, k / 2, k * 100, k * 1000]),
      format: (x) => q$(piTex(x), U.N),
    });
    return {
      stem: tex`A small sphere of radius $${qty(a, U.mm)}$ moves with a steady speed of $${qty(c, UNIT.cmps)}$ through a liquid whose coefficient of viscosity is $${qty(eta, UNIT.viscosity)}$. The viscous drag on the sphere is:`,
      answer,
      distractors,
      explanation: tex`By Stokes' law, $F = 6\pi\eta rv = 6\pi(${num(eta)})(${sci(a * 1e-3)})(${sci(c * 1e-2)}) = ${piTex(k)}\,\mathrm{N}$.`,
    };
  }),

  b.dynamic('terminal-velocity-value', { difficulty: 2, tags: ['terminal velocity', 'Stokes law'] }, (r) => {
    const [rho, a] = r.pick(AIR_DROP_CASES);
    const v = clean(((rho * a * a) / 81) * 1e-5);
    const particle = PARTICLE_NAMES[rho] ?? 'particle';
    const byDiameter = r.chance(0.4);
    const size = byDiameter ? tex`diameter $${qty(2 * a, UNIT.um)}$` : tex`radius $${qty(a, UNIT.um)}$`;
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      // used the diameter as the radius; dropped the factor 2; used 3 pi eta r v; forgot the 4/3 in the volume
      wrong: byDiameter ? [4 * v, v / 2, 2 * v, 0.75 * v] : [v / 2, 2 * v, 0.75 * v, 4 * v],
      format: (x) => q$(sci(x), U.mps),
    });
    return {
      stem: tex`A tiny spherical ${particle} of density $${qty(rho, UNIT.density)}$ and ${size} falls through air of viscosity $1.8 \times 10^{-5}\,\mathrm{N\,s\,m^{-2}}$. Neglecting the upthrust of air and taking $g = 10\,\mathrm{m\,s^{-2}}$, its terminal velocity is:`,
      answer,
      distractors,
      explanation: tex`${byDiameter ? tex`The radius is half the diameter: $r = ${qty(a, UNIT.um)}$. ` : ''}At terminal velocity the weight balances the Stokes drag: $\frac{4}{3}\pi r^3\rho g = 6\pi\eta r v_t$, so $v_t = \frac{2\rho g r^2}{9\eta} = \frac{2(${rho})(10)(${sci(a * 1e-6)})^2}{9(1.8 \times 10^{-5})} = ${sci(v)}\,\mathrm{m\,s^{-1}}$.`,
    };
  }),

  b.dynamic('terminal-velocity-scaling', { difficulty: 2, origin: 'past-paper', tags: ['terminal velocity'] }, (r) => {
    const [object, liquid] = [r.pick(['steel ball', 'glass bead', 'brass ball', 'lead pellet']), r.pick(['glycerine', 'castor oil', 'honey'])];
    const radius = r.pick([
      { k: frac(2), text: 'twice the radius' },
      { k: frac(3), text: 'three times the radius' },
      { k: frac(1, 2), text: 'half the radius' },
      { k: frac(1, 3), text: 'one-third the radius' },
    ]);
    const viscosity = r.pick([
      null,
      { m: frac(2), text: 'twice' },
      { m: frac(3), text: 'three times' },
      { m: frac(1, 2), text: 'half' },
    ]);
    const k = radius.k;
    const m = viscosity ? viscosity.m : frac(1);
    const factor = k.pow(2).div(m);
    const answer = timesV(factor);
    const candidates = viscosity
      ? // multiplied by the viscosity factor; linear in r; ignored the new liquid; took v proportional to r^3
        [k.pow(2).mul(m), k.div(m), k.pow(2), k.pow(3).div(m), m.div(k.pow(2))]
      : // linear in r; proportional to volume; inverted; inverse linear
        [k, k.pow(3), k.pow(-2), k.inv()];
    const where = viscosity
      ? `a liquid of the same density but ${viscosity.text} the viscosity`
      : 'the same liquid';
    const step = viscosity
      ? tex`v' = \frac{(${k.toTex()})^2}{${m.toTex()}}\,v`
      : tex`v' = (${k.toTex()})^2\,v`;
    return {
      stem: `A small ${object} dropped into a tall jar of ${liquid} reaches a terminal velocity $v$. Another ${object} of the same material but with ${radius.text} is dropped into ${where}. Its terminal velocity will be:`,
      answer,
      distractors: pickDistractors(answer, candidates.map(timesV)),
      explanation: tex`$v_t = \frac{2r^2(\rho - \sigma)g}{9\eta}$, where $\sigma$ is the density of the liquid (neglecting upthrust gives the FSc form $\frac{2\rho g r^2}{9\eta}$). With the same densities, $v_t \propto \frac{r^2}{\eta}$, so $${step} = ${coefTex(factor, 'v')}$.`,
    };
  }),

  b.dynamic('coalescing-drops', { difficulty: 3, tags: ['terminal velocity', 'Stokes law'] }, (r) => {
    const n = r.int(2, 5); // cube root of the number of drops
    const count = n ** 3;
    const format = (x: number) => q$(x, UNIT.mmps);
    if (r.chance(0.6)) {
      const small = r.int(1, 9);
      const big = small * n * n;
      // Three of: took v proportional to r; proportional to volume; thought v does not depend on
      // size; forgot the cube root (R = N r) - kept only while that value stays below 5 m/s.
      const slips = [small * n, small * count, small];
      if (small * count * count <= 5000) slips.push(small * count * count);
      const { answer, distractors } = numericOptions(r, { correct: big, wrong: r.shuffle(slips), format });
      return {
        stem: tex`$${count}$ identical tiny water droplets, each falling through air with a terminal velocity of $${qty(small, UNIT.mmps)}$, coalesce to form a single spherical drop. Assuming Stokes' law holds, the terminal velocity of the new drop is:`,
        answer,
        distractors,
        explanation: tex`Volume is conserved: $${count} \times \frac{4}{3}\pi r^3 = \frac{4}{3}\pi R^3$, so $R = \sqrt[3]{${count}}\,r = ${n}r$. Since $v_t = \frac{2\rho g r^2}{9\eta} \propto r^2$, the new drop falls at $(${n})^2 \times ${small} = ${big}\,\mathrm{mm\,s^{-1}}$.`,
      };
    }
    // j >= 2 so the drop's speed never equals the number of droplets (an odd coincidence).
    const j = n === 2 ? r.int(2, 4) : n === 5 ? 2 : r.int(2, 3);
    const small = n * j;
    const big = small * n * n;
    const { answer, distractors } = numericOptions(r, {
      correct: small,
      // divided by the cube root only; divided by the number of droplets; assumed no change
      wrong: [small * n, j, big],
      format,
    });
    return {
      stem: tex`A spherical water drop falls through air with a terminal velocity of $${qty(big, UNIT.mmps)}$. It splits into $${count}$ identical spherical droplets. Assuming Stokes' law holds, the terminal velocity of each droplet is:`,
      answer,
      distractors,
      explanation: tex`Volume is conserved: $\frac{4}{3}\pi R^3 = ${count} \times \frac{4}{3}\pi r^3$, so $r = \frac{R}{\sqrt[3]{${count}}} = \frac{R}{${n}}$. Since $v_t \propto r^2$, each droplet falls at $\frac{${big}}{(${n})^2} = ${small}\,\mathrm{mm\,s^{-1}}$.`,
    };
  }),

  // ---------------------------------------------------------------- equation of continuity
  b.dynamic('continuity-pipe-speed', { difficulty: 2, origin: 'past-paper', tags: ['equation of continuity'] }, (r) => {
    const widening = r.chance(0.4);
    const { big, small, vWide, vNarrow } = r.pick(r.pick(widening ? PIPE_GROUPS.widening : PIPE_GROUPS.narrowing));
    const k = big / small;
    const dimension = r.pick(['diameter', 'radius']);
    const format = (x: number) => q$(clean(x), U.mps);
    if (!widening) {
      const { answer, distractors } = numericOptions(r, {
        correct: vNarrow,
        // used the ratio of sizes instead of areas; inverted the ratio; then one of: mixed up radius
        // and diameter for one pipe (factor 4), or made both of the first two slips
        wrong: [vWide * k, vWide / (k * k), ...r.shuffle([exact(4 * vNarrow), vWide / k])],
        format,
      });
      return {
        stem: tex`Water flows steadily through a horizontal pipe whose internal ${dimension} decreases from $${qty(big, U.cm)}$ to $${qty(small, U.cm)}$. If the speed of the water in the wider part is $${qty(vWide, U.mps)}$, its speed in the narrower part is:`,
        answer,
        distractors,
        explanation: tex`Equation of continuity: $A_1v_1 = A_2v_2$ with $A \propto (\text{${dimension}})^2$, so $v_2 = v_1\left(\frac{${big}}{${small}}\right)^2 = ${num(vWide)} \times ${num(k * k)} = ${num(vNarrow)}\,\mathrm{m\,s^{-1}}$. Using the plain ratio $\frac{${big}}{${small}}$ forgets that area depends on the square of the ${dimension}.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: vWide,
      // used the ratio of sizes instead of areas; inverted the ratio; then one of: mixed up radius
      // and diameter for one pipe (factor 4), or made both of the first two slips
      wrong: [vNarrow / k, vNarrow * k * k, ...r.shuffle([exact(vWide / 4), vNarrow * k])],
      format,
    });
    return {
      stem: tex`Water moving at $${qty(vNarrow, U.mps)}$ in a pipe of internal ${dimension} $${qty(small, U.cm)}$ flows steadily into a pipe of internal ${dimension} $${qty(big, U.cm)}$. Its speed in the wider pipe is:`,
      answer,
      distractors,
      explanation: tex`Equation of continuity: $A_1v_1 = A_2v_2$ with $A \propto (\text{${dimension}})^2$, so $v_2 = v_1\left(\frac{${small}}{${big}}\right)^2 = \frac{${num(vNarrow)}}{${num(k * k)}} = ${num(vWide)}\,\mathrm{m\,s^{-1}}$. The wider the pipe, the slower the flow.`,
    };
  }),

  b.dynamic('flow-rate', { difficulty: 2, tags: ['equation of continuity'] }, (r) => {
    if (r.chance(0.55)) {
      const [a, v, litres] = r.pick(FILL_CASES);
      const t = clean((10 * litres) / (a * v));
      const flow = clean(a * 1e-4 * v);
      const { answer, distractors } = numericOptions(r, {
        correct: t,
        // Three of: no unit conversions at all; took 1 cm^2 = 10^-2 m^2; took 1 cm^2 = 10^-6 m^2;
        // did not convert litres to m^3.
        wrong: r.shuffle([t / 10, t / 100, t * 100, t * 1000]),
        format: (x) => q$(x, U.s),
      });
      return {
        stem: tex`Water flows out of a pipe of cross-sectional area $${qty(a, UNIT.cm2)}$ with a speed of $${qty(v, U.mps)}$. The time needed to fill an empty tank of capacity ${litres} litres is:`,
        answer,
        distractors,
        explanation: tex`Volume flow rate $Q = Av = (${sci(a * 1e-4)}\,\mathrm{m^{2}})(${num(v)}\,\mathrm{m\,s^{-1}}) = ${sci(flow)}\,\mathrm{m^{3}\,s^{-1}}$. With $${litres}\,\mathrm{L} = ${sci(litres * 1e-3)}\,\mathrm{m^{3}}$, $t = \frac{V}{Q} = \frac{${sci(litres * 1e-3)}}{${sci(flow)}} = ${num(t)}\,\mathrm{s}$.`,
      };
    }
    const [a, v] = r.pick(MASS_FLOW_CASES);
    const mass = clean(0.1 * a * v);
    const { answer, distractors } = numericOptions(r, {
      correct: mass,
      // Three of: did not convert cm^2 at all; took 1 cm^2 = 10^-2 m^2; took 1 cm^2 = 10^-6 m^2;
      // gave the volume flow rate (forgot the density).
      wrong: r.shuffle([mass * 1e4, mass * 100, mass / 100, mass / 1000]),
      format: (x) => q$(x, UNIT.kgps),
    });
    return {
      stem: tex`Water (density $1000\,\mathrm{kg\,m^{-3}}$) flows through a pipe of cross-sectional area $${qty(a, UNIT.cm2)}$ with a speed of $${qty(v, U.mps)}$. The mass of water passing any cross-section per second is:`,
      answer,
      distractors,
      explanation: tex`Mass flow rate $= \rho Av = (1000)(${sci(a * 1e-4)})(${num(v)}) = ${num(mass)}\,\mathrm{kg\,s^{-1}}$ (remember $1\,\mathrm{cm^{2}} = 10^{-4}\,\mathrm{m^{2}}$).`,
    };
  }),

  // ---------------------------------------------------------------- Bernoulli equation
  b.dynamic('torricelli-efflux-speed', { difficulty: 1, origin: 'past-paper', tags: ['Bernoulli equation'] }, (r) => {
    const g = r.pick([10, 9.8]);
    // g = 10: depth n^2/20 m gives v = n; g = 9.8: depth n^2/10 m gives v = 1.4n.
    const n = g === 10 ? r.int(2, 12) : r.int(1, 10);
    const h = clean(g === 10 ? (n * n) / 20 : (n * n) / 10);
    const v = clean(g === 10 ? n : 1.4 * n);
    const inCm = h < 1;
    const depth = inCm ? qty(clean(h * 100), U.cm) : qty(h, U.m);
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      // left h in cm; forgot the square root; used sqrt(2h/g); dropped the 2
      wrong: [inCm ? 10 * v : NaN, 2 * g * h, Math.sqrt((2 * h) / g), Math.sqrt(g * h)],
      format: (x) => q$(x, U.mps),
    });
    return {
      stem: tex`A large open tank is filled with water. A small hole is made in its side at a depth of $${depth}$ below the free surface of the water. Taking $g = ${num(g)}\,\mathrm{m\,s^{-2}}$, the speed with which water flows out of the hole is:`,
      answer,
      distractors,
      explanation: tex`By Torricelli's theorem (Bernoulli's equation between the free surface and the hole), $v = \sqrt{2gh} = \sqrt{2(${num(g)})(${num(h)})} = \sqrt{${num(clean(2 * g * h), { sig: 6 })}} = ${num(v)}\,\mathrm{m\,s^{-1}}$${inCm ? tex`, with $h = ${depth} = ${qty(h, U.m)}$` : ''}.`,
    };
  }),

  b.dynamic('bernoulli-pressure-difference', { difficulty: 2, tags: ['Bernoulli equation', 'equation of continuity'] }, (r) => {
    const format = (x: number) => q$(clean(x), UNIT.kPa);
    if (r.chance(0.5)) {
      const [v1, v2] = r.pick(SPEED_PAIRS);
      const dp = clean(0.5 * (v2 * v2 - v1 * v1)); // kPa, since rho = 1000
      const { answer, distractors } = numericOptions(r, {
        correct: dp,
        // Three of: squared the difference of speeds; forgot the 1/2; added the squares; ignored the
        // speed at A; forgot to square the speeds.
        wrong: r.shuffle([0.5 * (v2 - v1) ** 2, v2 * v2 - v1 * v1, 0.5 * (v2 * v2 + v1 * v1), 0.5 * v2 * v2, 0.5 * (v2 - v1)]),
        format,
      });
      return {
        stem: tex`Water (density $1000\,\mathrm{kg\,m^{-3}}$) flows steadily through a horizontal pipe of varying cross-section. Its speed is $${qty(v1, U.mps)}$ at point A and $${qty(v2, U.mps)}$ at point B. The pressure at A exceeds the pressure at B by:`,
        answer,
        distractors,
        explanation: tex`For a horizontal pipe, $P_A + \frac{1}{2}\rho v_A^2 = P_B + \frac{1}{2}\rho v_B^2$, so $P_A - P_B = \frac{1}{2}\rho(v_B^2 - v_A^2) = \frac{1}{2}(1000)\left[(${num(v2)})^2 - (${num(v1)})^2\right] = ${num(dp * 1000)}\,\mathrm{Pa} = ${num(dp)}\,\mathrm{kPa}$.`,
      };
    }
    const [a2, k, v1] = r.pick(VENTURI_CASES);
    const a1 = a2 * k;
    const v2 = clean(k * v1);
    const dp = clean(0.5 * (v2 * v2 - v1 * v1));
    const { answer, distractors } = numericOptions(r, {
      correct: dp,
      // Three of: ignored the speed in the wide section; squared the difference of speeds; forgot
      // the 1/2; took the narrow section to be slower (v2 = v1 / k) and gave the magnitude.
      wrong: r.shuffle([0.5 * v2 * v2, 0.5 * (v2 - v1) ** 2, v2 * v2 - v1 * v1, exact(0.5 * v1 * v1 * (1 - 1 / (k * k)))]),
      format,
    });
    return {
      stem: tex`Water (density $1000\,\mathrm{kg\,m^{-3}}$) flows through a horizontal pipe whose cross-sectional area is $${qty(a1, UNIT.cm2)}$ at a wide section and $${qty(a2, UNIT.cm2)}$ at a narrow section. If the speed of the water in the wide section is $${qty(v1, U.mps)}$, the pressure in the wide section exceeds that in the narrow section by:`,
      answer,
      distractors,
      explanation: tex`Continuity: $v_2 = \frac{A_1}{A_2}v_1 = \frac{${a1}}{${a2}}(${num(v1)}) = ${num(v2)}\,\mathrm{m\,s^{-1}}$. Bernoulli for a horizontal pipe: $P_1 - P_2 = \frac{1}{2}\rho(v_2^2 - v_1^2) = \frac{1}{2}(1000)\left[(${num(v2)})^2 - (${num(v1)})^2\right] = ${num(dp * 1000)}\,\mathrm{Pa} = ${num(dp)}\,\mathrm{kPa}$.`,
    };
  }),

  b.dynamic('lift-on-wing-or-roof', { difficulty: 2, tags: ['Bernoulli equation'] }, (r) => {
    const format = (x: number) => q$(clean(x), UNIT.kN);
    if (r.chance(0.5)) {
      const [below, above, area] = r.pick(WING_CASES);
      const dp = clean(0.6 * (above * above - below * below)); // Pa
      const force = clean((dp * area) / 1000); // kN
      const { answer, distractors } = numericOptions(r, {
        correct: force,
        // Three of: forgot the 1/2; squared the difference of speeds; ignored the air below the
        // wing; forgot to multiply the pressure difference by the area.
        wrong: r.shuffle([2 * force, (0.6 * (above - below) ** 2 * area) / 1000, (0.6 * above * above * area) / 1000, exact(dp / 1000)]),
        format,
      });
      return {
        stem: tex`Air of density $1.2\,\mathrm{kg\,m^{-3}}$ streams past an aeroplane wing at $${qty(above, U.mps)}$ over the upper surface and at $${qty(below, U.mps)}$ past the lower surface. If the area of the wing is $${qty(area, U.m2)}$, the lift on the wing is:`,
        answer,
        distractors,
        explanation: tex`By Bernoulli's equation (heights nearly equal), $P_{\text{below}} - P_{\text{above}} = \frac{1}{2}\rho(v_{\text{above}}^2 - v_{\text{below}}^2) = \frac{1}{2}(1.2)\left[(${above})^2 - (${below})^2\right] = ${num(dp)}\,\mathrm{Pa}$. Lift $F = \Delta P \times A = ${num(dp)} \times ${area} = ${num(force * 1000)}\,\mathrm{N} = ${num(force)}\,\mathrm{kN}$.`,
      };
    }
    const [v, area] = r.pick(ROOF_CASES);
    const dp = clean(0.6 * v * v); // Pa
    const force = clean((dp * area) / 1000); // kN
    const { answer, distractors } = numericOptions(r, {
      correct: force,
      // forgot the 1/2; forgot to square the speed; forgot to multiply by the area
      wrong: [2 * force, (0.6 * v * area) / 1000, dp / 1000],
      format,
    });
    return {
      stem: tex`During a storm, wind blows horizontally at $${qty(v, U.mps)}$ over a flat roof of area $${qty(area, U.m2)}$, while the air inside the house is still. Taking the density of air as $1.2\,\mathrm{kg\,m^{-3}}$, the net upward force on the roof is:`,
      answer,
      distractors,
      explanation: tex`The still air inside is at atmospheric pressure; by Bernoulli's equation the moving air above the roof is at a pressure lower by $\frac{1}{2}\rho v^2 = \frac{1}{2}(1.2)(${v})^2 = ${num(dp)}\,\mathrm{Pa}$. Net upward force $F = \frac{1}{2}\rho v^2 A = ${num(dp)} \times ${area} = ${num(force * 1000)}\,\mathrm{N} = ${num(force)}\,\mathrm{kN}$.`,
    };
  }),

  b.dynamic('jet-range-from-tank', { difficulty: 3, tags: ['Bernoulli equation'] }, (r) => {
    // Hole height y = u p^2 and depth below the surface d = u q^2, so the range 2 sqrt(y d) = 2upq is exact.
    const u = r.pick([0.1, 0.2, 0.5]);
    const [p = 1, q = 2] = r.sample([1, 2, 3, 4], 2);
    const y = clean(u * p * p);
    const d = clean(u * q * q);
    const height = clean(y + d);
    const range = clean(2 * u * p * q);
    // Options are shown to a fixed number of decimals, so irrational distractors look as tidy as the answer.
    const places = range < 10 ? 2 : 1;
    const { answer, distractors } = numericOptions(r, {
      correct: range,
      // Three of: used the full height for the efflux speed; used the full height for the fall;
      // dropped the 2; used the projectile formula R = v^2/g.
      wrong: r.shuffle([2 * Math.sqrt(y * height), 2 * Math.sqrt(d * height), Math.sqrt(y * d), 2 * d]),
      format: (x) => q$(num(x, { dp: places, keepZeros: true }), U.m),
    });
    return {
      stem: tex`A large open tank standing on level ground is filled with water to a height of $${qty(height, U.m)}$. A small hole is made in its vertical side at a height of $${qty(y, U.m)}$ above the ground. Neglecting air resistance, the water jet strikes the ground at a horizontal distance from the tank of:`,
      answer,
      distractors,
      explanation: tex`The hole is $h = ${num(height)} - ${num(y)} = ${num(d)}\,\mathrm{m}$ below the surface, so the water leaves horizontally at $v = \sqrt{2gh}$ (Torricelli). It falls $${num(y)}\,\mathrm{m}$ in $t = \sqrt{\frac{2y}{g}}$. Range $R = vt = 2\sqrt{hy} = 2\sqrt{(${num(d)})(${num(y)})} = 2(${num(clean(u * p * q))}) = ${num(range)}\,\mathrm{m}$, independent of $g$.`,
    };
  }),

  // ---------------------------------------------------------------- fixed conceptual questions
  ...b.mcqs([
    {
      // The plain "SI unit of viscosity" item lives in measurements; this one asks for the odd one out.
      id: 'viscosity-unit-not-equivalent',
      d: 2,
      o: 'past-paper',
      t: ['viscosity'],
      q: 'Which of the following is NOT a correct unit of the coefficient of viscosity?',
      a: tex`$\mathrm{N\,m^{-2}\,s^{-1}}$`,
      x: [tex`$\mathrm{N\,s\,m^{-2}}$`, tex`$\mathrm{Pa\,s}$`, tex`$\mathrm{kg\,m^{-1}\,s^{-1}}$`],
      e: tex`From Stokes' law $F = 6\pi\eta rv$, $\eta = \frac{F}{6\pi rv}$, so its unit is $\frac{\mathrm{N}}{\mathrm{m} \times \mathrm{m\,s^{-1}}} = \mathrm{N\,s\,m^{-2}} = \mathrm{Pa\,s} = \mathrm{kg\,m^{-1}\,s^{-1}}$ (using $1\,\mathrm{N} = 1\,\mathrm{kg\,m\,s^{-2}}$). $\mathrm{N\,m^{-2}\,s^{-1}}$ is pascal per second, a rate of change of pressure.`,
    },
    {
      id: 'viscosity-and-temperature',
      d: 2,
      t: ['viscosity'],
      q: 'When the temperature rises, the viscosity of a liquid and the viscosity of a gas, respectively:',
      a: 'decreases and increases',
      x: ['increases and decreases', 'decreases and decreases', 'increases and increases'],
      e: 'In a liquid, viscosity comes mainly from cohesive forces between molecules, which weaken on heating, so it falls. In a gas, viscosity comes from molecules carrying momentum between layers; hotter molecules move faster, so it rises.',
    },
    {
      id: 'terminal-velocity-condition',
      d: 1,
      t: ['terminal velocity'],
      q: 'A small sphere released in a viscous liquid soon falls with a constant (terminal) velocity. This happens when:',
      a: 'the net force on the sphere becomes zero',
      x: [
        'the viscous drag on the sphere becomes zero',
        'the acceleration of the sphere becomes equal to $g$',
        'the viscous drag becomes greater than its weight',
      ],
      e: tex`The drag $F = 6\pi\eta rv$ grows with speed. When the drag (together with the upthrust) balances the weight, the net force and hence the acceleration become zero, so the sphere moves on at a constant velocity.`,
    },
    {
      id: 'conservation-laws-behind-equations',
      d: 1,
      o: 'past-paper',
      t: ['equation of continuity', 'Bernoulli equation'],
      q: "The equation of continuity and Bernoulli's equation follow, respectively, from the law of conservation of:",
      a: 'mass and energy',
      x: ['energy and mass', 'momentum and energy', 'mass and momentum'],
      e: tex`Continuity, $A_1v_1 = A_2v_2$, says the mass of fluid entering a tube of flow per second equals the mass leaving it (conservation of mass). Bernoulli's equation comes from applying the work-energy principle to the moving fluid (conservation of energy).`,
    },
    {
      id: 'ideal-fluid-assumptions',
      d: 1,
      t: ['Bernoulli equation', 'equation of continuity'],
      q: "Bernoulli's equation is derived for an ideal fluid, which is assumed to be:",
      a: 'incompressible and non-viscous',
      x: ['compressible and non-viscous', 'incompressible and viscous', 'compressible and viscous'],
      e: 'An ideal fluid has a constant density (incompressible) and no internal friction (non-viscous), so no mechanical energy is lost; its flow is also taken to be steady (streamline).',
    },
    {
      id: 'air-blown-between-balls',
      d: 2,
      t: ['Bernoulli equation'],
      q: 'Two light table-tennis balls hang side by side from threads, a few centimetres apart. What happens when air is blown briskly through the gap between them?',
      a: 'They move towards each other',
      x: ['They move away from each other', 'They stay where they are', 'Only one of them moves'],
      e: tex`The fast-moving air in the gap is at a lower pressure than the still air on the outer sides (Bernoulli: where the speed is high, the pressure is low, since $P + \frac{1}{2}\rho v^2$ stays constant). The pressure difference pushes both balls inwards, so they move together.`,
    },
    {
      id: 'efflux-speed-independent-of-density',
      d: 2,
      t: ['Bernoulli equation'],
      q: 'Two large open tanks, one containing water and the other mercury (13.6 times denser), each have a small hole in the side at the same depth below the free surface. The ratio of the speed of efflux of water to that of mercury is:',
      a: '$1 : 1$',
      x: ['$13.6 : 1$', '$1 : 13.6$', tex`$\sqrt{13.6} : 1$`],
      e: tex`By Torricelli's theorem $v = \sqrt{2gh}$, which does not involve the density: the larger pressure of the mercury column is exactly offset by its larger inertia. Equal depths give equal speeds, so the ratio is $1 : 1$.`,
    },
    {
      id: 'blood-pressure-values',
      d: 2,
      o: 'past-paper',
      t: ['Bernoulli equation'],
      q: 'For a healthy adult, the systolic and diastolic blood pressures are about:',
      a: '120 torr and 80 torr',
      x: ['80 torr and 120 torr', '120 Pa and 80 Pa', '160 torr and 120 torr'],
      e: 'Systolic pressure (heart contracting) is about 120 torr and diastolic pressure (heart relaxing) about 75 to 80 torr. Since 1 torr = 1 mm of mercury, about 133 Pa, values of 120 Pa and 80 Pa are far too small.',
    },
    {
      id: 'steady-flow-meaning',
      d: 1,
      t: ['equation of continuity'],
      q: 'In steady (streamline) flow of a fluid:',
      a: 'the velocity of the fluid at any fixed point does not change with time',
      x: [
        'every particle of the fluid moves with the same velocity',
        'streamlines may cross one another',
        'the fluid particles move along irregular, zigzag paths',
      ],
      e: 'In steady flow every particle passing a given point follows the same path (streamline) with the same velocity, so the velocity at each point is constant in time; it may still differ from point to point. Streamlines never cross (a fluid particle cannot have two velocities at once), and irregular, zigzag motion describes turbulent flow.',
    },
    {
      id: 'wide-to-narrow-speed-pressure',
      d: 1,
      o: 'past-paper',
      t: ['equation of continuity', 'Bernoulli equation'],
      q: 'An ideal fluid flows steadily through a horizontal pipe from a wide section into a narrow section. In the narrow section, the speed and the pressure of the fluid, respectively:',
      a: 'increase and decrease',
      x: ['decrease and increase', 'increase and increase', 'decrease and decrease'],
      e: tex`By the equation of continuity $Av = \text{constant}$, so the speed increases where the area is smaller. For a horizontal pipe Bernoulli's equation gives $P + \frac{1}{2}\rho v^2 = \text{constant}$, so where the speed is higher the pressure is lower.`,
    },
    {
      id: 'bernoulli-terms-energy-per-volume',
      d: 2,
      t: ['Bernoulli equation'],
      q: tex`Each term in Bernoulli's equation, $P + \frac{1}{2}\rho v^2 + \rho gh = \text{constant}$, represents:`,
      a: 'energy per unit volume',
      x: ['energy per unit mass', 'momentum per unit volume', 'power per unit volume'],
      e: tex`$\frac{1}{2}\rho v^2 = \frac{\frac{1}{2}mv^2}{V}$ is kinetic energy per unit volume and $\rho gh = \frac{mgh}{V}$ is potential energy per unit volume; pressure has the same unit, $\mathrm{N\,m^{-2}} = \mathrm{J\,m^{-3}}$. Dividing the whole equation by $\rho$ would give energy per unit mass, but not in the form written.`,
    },
    {
      id: 'venturi-meter-use',
      d: 1,
      t: ['Bernoulli equation'],
      q: 'A venturi meter is used to measure:',
      a: 'the speed of flow of a liquid in a pipe',
      x: ['the coefficient of viscosity of a liquid', 'the density of a liquid', 'the pressure of the atmosphere'],
      e: tex`A venturi meter has a constriction in the pipe. The pressure difference between the wide and narrow parts, read from a manometer, is related to the flow speed by Bernoulli's equation and the equation of continuity: $P_1 - P_2 = \frac{1}{2}\rho(v_2^2 - v_1^2)$.`,
    },
    {
      id: 'aeroplane-lift-principle',
      d: 1,
      t: ['Bernoulli equation'],
      q: 'The upward lift on the wings of an aeroplane in flight is explained by:',
      a: "Bernoulli's principle",
      x: ["Pascal's principle", "Archimedes' principle", "Stokes' law"],
      e: "The wing (aerofoil) is shaped and tilted so that air flows faster over its upper surface than under its lower surface. By Bernoulli's principle the pressure above the wing is then lower than below it, and this pressure difference gives the upward lift. Archimedes' upthrust from the displaced air is negligible, Pascal's principle concerns pressure in enclosed fluids and Stokes' law gives viscous drag.",
    },
  ]),
]);
