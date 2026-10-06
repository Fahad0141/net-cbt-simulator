/**
 * Physics - Measurements (FSc Part I, chapter 1).
 *
 * Coverage
 * - SI units: base quantities, supplementary units, units of derived constants (viscosity)
 * - prefixes: prefixed unit to base unit, squared/cubed prefixes (cm^2, mm^3, g cm^-3)
 * - errors and uncertainties: percentage uncertainty of a reading, uncertainty of a difference,
 *   uncertainty of a power-law formula, accuracy vs precision, random vs systematic errors
 * - significant figures: counting, multiplication rule, recording to the least count
 * - dimensions: dimensions of constants, equal-dimension pairs, energy density as pressure,
 *   change of units
 * - dimensional analysis: solving for exponents, homogeneity check, its limitations
 *
 * Numerical answers are exact: products in the significant-figure item avoid exact halves at
 * every rounding cut, percentages come from pre-checked (reading, uncertainty) pairs, and
 * exponents are exact fractions. Distractors model real slips: counting leading zeros,
 * ignoring trailing zeros, forgetting to multiply by the power, subtracting uncertainties
 * for a quotient or difference, a linear factor for a squared or cubed prefix, and the sign
 * of the exponent.
 */
import { defineBank } from '@/engine/authoring';
import { frac, num, numericOptions, pickDistractors, sci, tex } from '@/engine/helpers';

// ------------------------------------------------------------------------------------------
// Local helpers
// ------------------------------------------------------------------------------------------

/** [M, L, T] exponents -> `[\mathrm{ML^{2}T^{-1}}]`. */
function dimTex(d: readonly number[]): string {
  const sym = ['M', 'L', 'T'];
  const parts = d
    .map((p, i) => (p === 0 ? '' : p === 1 ? sym[i] : `${sym[i]}^{${p}}`))
    .join('');
  return `[\\mathrm{${parts}}]`;
}

/** A value with a unit as an option, in scientific notation: $2.5 \times 10^{-3}\,\mathrm{m^{3}}$. */
const sciQ = (x: number, unit: string): string => `$${sci(x)}\\,\\mathrm{${unit}}$`;

/** Percentage option: $1.5\%$. */
const pct = (x: number): string => `$${num(x)}\\%$`;

/** Fixed-decimal display: fx(2.4, 2) -> 2.40. */
const fx = (x: number, dp: number): string => num(x, { dp, keepZeros: true });

// ------------------------------------------------------------------------------------------
// Data
// ------------------------------------------------------------------------------------------

interface DimEntry {
  name: string;
  dims: readonly [number, number, number];
  why: string;
}

const DIM_QUANTITIES: readonly DimEntry[] = [
  {
    name: tex`Planck's constant $h$`,
    dims: [1, 2, -1],
    why: tex`$h = E/f$, so $[h] = [\mathrm{ML^{2}T^{-2}}]/[\mathrm{T^{-1}}] = [\mathrm{ML^{2}T^{-1}}]$.`,
  },
  {
    name: tex`the gravitational constant $G$`,
    dims: [-1, 3, -2],
    why: tex`$G = Fr^{2}/(m_1m_2)$, so $[G] = [\mathrm{MLT^{-2}}][\mathrm{L^{2}}]/[\mathrm{M^{2}}] = [\mathrm{M^{-1}L^{3}T^{-2}}]$.`,
  },
  {
    name: tex`the coefficient of viscosity $\eta$`,
    dims: [1, -1, -1],
    why: tex`From Stokes' law $F = 6\pi\eta rv$, $[\eta] = [\mathrm{MLT^{-2}}]/([\mathrm{L}][\mathrm{LT^{-1}}]) = [\mathrm{ML^{-1}T^{-1}}]$.`,
  },
  {
    name: "Young's modulus",
    dims: [1, -1, -2],
    why: tex`Young's modulus is stress/strain and strain is dimensionless, so $[Y] = [F/A] = [\mathrm{MLT^{-2}}]/[\mathrm{L^{2}}] = [\mathrm{ML^{-1}T^{-2}}]$.`,
  },
  {
    name: 'surface tension',
    dims: [1, 0, -2],
    why: tex`Surface tension is force per unit length: $[\mathrm{MLT^{-2}}]/[\mathrm{L}] = [\mathrm{MT^{-2}}]$.`,
  },
  {
    name: tex`the spring constant $k$`,
    dims: [1, 0, -2],
    why: tex`$F = kx$, so $[k] = [\mathrm{MLT^{-2}}]/[\mathrm{L}] = [\mathrm{MT^{-2}}]$.`,
  },
  {
    name: 'power',
    dims: [1, 2, -3],
    why: tex`$P = W/t$, so $[P] = [\mathrm{ML^{2}T^{-2}}]/[\mathrm{T}] = [\mathrm{ML^{2}T^{-3}}]$.`,
  },
  {
    name: 'angular momentum',
    dims: [1, 2, -1],
    why: tex`Angular momentum $= mvr$, so its dimensions are $[\mathrm{M}][\mathrm{LT^{-1}}][\mathrm{L}] = [\mathrm{ML^{2}T^{-1}}]$.`,
  },
  {
    name: 'impulse',
    dims: [1, 1, -1],
    why: tex`Impulse $= Ft$, so its dimensions are $[\mathrm{MLT^{-2}}][\mathrm{T}] = [\mathrm{MLT^{-1}}]$, the same as momentum.`,
  },
  {
    name: 'pressure',
    dims: [1, -1, -2],
    why: tex`$P = F/A$, so $[P] = [\mathrm{MLT^{-2}}]/[\mathrm{L^{2}}] = [\mathrm{ML^{-1}T^{-2}}]$.`,
  },
  {
    name: 'torque',
    dims: [1, 2, -2],
    why: tex`$\tau = rF\sin\theta$, so $[\tau] = [\mathrm{L}][\mathrm{MLT^{-2}}] = [\mathrm{ML^{2}T^{-2}}]$.`,
  },
];

interface ExpVar {
  sym: string;
  exp: readonly [number, number];
}

interface ExpScenario {
  stem: string;
  vars: readonly ExpVar[];
  solve: string;
}

const EXP_SCENARIOS: readonly ExpScenario[] = [
  {
    stem: tex`The period $T$ of a simple pendulum is assumed to depend on its length $l$, the acceleration due to gravity $g$ and the mass $m$ of the bob as $T = k\,l^{a}g^{b}m^{c}$, where $k$ is a dimensionless constant.`,
    vars: [
      { sym: 'a', exp: [1, 2] },
      { sym: 'b', exp: [-1, 2] },
      { sym: 'c', exp: [0, 1] },
    ],
    solve: tex`$[\mathrm{T}] = [\mathrm{L}]^{a}[\mathrm{LT^{-2}}]^{b}[\mathrm{M}]^{c}$. M: $c = 0$; T: $-2b = 1$, so $b = -\frac{1}{2}$; L: $a + b = 0$, so $a = \frac{1}{2}$. Hence $T = k\sqrt{l/g}$, independent of the mass.`,
  },
  {
    stem: tex`The speed $v$ of a transverse wave on a stretched string is assumed to depend on the tension $F$ and the mass per unit length $\mu$ as $v = k\,F^{a}\mu^{b}$, where $k$ is a dimensionless constant.`,
    vars: [
      { sym: 'a', exp: [1, 2] },
      { sym: 'b', exp: [-1, 2] },
    ],
    solve: tex`$[\mathrm{LT^{-1}}] = [\mathrm{MLT^{-2}}]^{a}[\mathrm{ML^{-1}}]^{b}$. T: $-2a = -1$, so $a = \frac{1}{2}$; M: $a + b = 0$, so $b = -\frac{1}{2}$ (L check: $a - b = 1$). Hence $v = k\sqrt{F/\mu}$.`,
  },
  {
    stem: tex`The viscous drag $F$ on a small sphere is assumed to depend on the coefficient of viscosity $\eta$, the radius $r$ and the speed $v$ as $F = k\,\eta^{a}r^{b}v^{c}$, where $k$ is a dimensionless constant.`,
    vars: [
      { sym: 'a', exp: [1, 1] },
      { sym: 'b', exp: [1, 1] },
      { sym: 'c', exp: [1, 1] },
    ],
    solve: tex`$[\mathrm{MLT^{-2}}] = [\mathrm{ML^{-1}T^{-1}}]^{a}[\mathrm{L}]^{b}[\mathrm{LT^{-1}}]^{c}$. M: $a = 1$; T: $-a - c = -2$, so $c = 1$; L: $-a + b + c = 1$, so $b = 1$. Hence $F = k\eta rv$ (Stokes' law, $k = 6\pi$).`,
  },
  {
    stem: tex`The period $T$ of a mass-spring system is assumed to depend on the mass $m$ and the spring constant $s$ as $T = k\,m^{a}s^{b}$, where $k$ is a dimensionless constant.`,
    vars: [
      { sym: 'a', exp: [1, 2] },
      { sym: 'b', exp: [-1, 2] },
    ],
    solve: tex`$[\mathrm{T}] = [\mathrm{M}]^{a}[\mathrm{MT^{-2}}]^{b}$. T: $-2b = 1$, so $b = -\frac{1}{2}$; M: $a + b = 0$, so $a = \frac{1}{2}$. Hence $T = k\sqrt{m/s}$.`,
  },
  {
    stem: tex`The speed $v$ of sound in a solid is assumed to depend on its Young's modulus $E$ and density $\rho$ as $v = k\,E^{a}\rho^{b}$, where $k$ is a dimensionless constant.`,
    vars: [
      { sym: 'a', exp: [1, 2] },
      { sym: 'b', exp: [-1, 2] },
    ],
    solve: tex`$[\mathrm{LT^{-1}}] = [\mathrm{ML^{-1}T^{-2}}]^{a}[\mathrm{ML^{-3}}]^{b}$. T: $-2a = -1$, so $a = \frac{1}{2}$; M: $a + b = 0$, so $b = -\frac{1}{2}$ (L check: $-a - 3b = 1$). Hence $v = k\sqrt{E/\rho}$.`,
  },
  {
    stem: tex`The centripetal force $F$ on a body is assumed to depend on its mass $m$, speed $v$ and the radius $r$ of its path as $F = k\,m^{a}v^{b}r^{c}$, where $k$ is a dimensionless constant.`,
    vars: [
      { sym: 'a', exp: [1, 1] },
      { sym: 'b', exp: [2, 1] },
      { sym: 'c', exp: [-1, 1] },
    ],
    solve: tex`$[\mathrm{MLT^{-2}}] = [\mathrm{M}]^{a}[\mathrm{LT^{-1}}]^{b}[\mathrm{L}]^{c}$. M: $a = 1$; T: $-b = -2$, so $b = 2$; L: $b + c = 1$, so $c = -1$. Hence $F = kmv^{2}/r$.`,
  },
  {
    stem: tex`The escape speed $v$ from a planet is assumed to depend on the gravitational constant $G$, the planet's mass $M$ and its radius $R$ as $v = k\,G^{a}M^{b}R^{c}$, where $k$ is a dimensionless constant.`,
    vars: [
      { sym: 'a', exp: [1, 2] },
      { sym: 'b', exp: [1, 2] },
      { sym: 'c', exp: [-1, 2] },
    ],
    solve: tex`$[\mathrm{LT^{-1}}] = [\mathrm{M^{-1}L^{3}T^{-2}}]^{a}[\mathrm{M}]^{b}[\mathrm{L}]^{c}$. T: $-2a = -1$, so $a = \frac{1}{2}$; M: $-a + b = 0$, so $b = \frac{1}{2}$; L: $3a + c = 1$, so $c = -\frac{1}{2}$. Hence $v = k\sqrt{GM/R}$.`,
  },
  {
    stem: tex`The frequency $f$ of a vibrating string is assumed to depend on its length $l$, tension $F$ and mass per unit length $\mu$ as $f = k\,l^{a}F^{b}\mu^{c}$, where $k$ is a dimensionless constant.`,
    vars: [
      { sym: 'a', exp: [-1, 1] },
      { sym: 'b', exp: [1, 2] },
      { sym: 'c', exp: [-1, 2] },
    ],
    solve: tex`$[\mathrm{T^{-1}}] = [\mathrm{L}]^{a}[\mathrm{MLT^{-2}}]^{b}[\mathrm{ML^{-1}}]^{c}$. T: $-2b = -1$, so $b = \frac{1}{2}$; M: $b + c = 0$, so $c = -\frac{1}{2}$; L: $a + b - c = 0$, so $a = -1$. Hence $f = \frac{k}{l}\sqrt{F/\mu}$.`,
  },
];

interface PctCase {
  stem: (a: number, b: number) => string;
  /** Powers of the measured quantities (second entry unused for one-variable formulas). */
  powers: readonly number[];
  formula: string;
}

const PCT_CASES: readonly PctCase[] = [
  {
    stem: (a, b) =>
      tex`The kinetic energy of a body is found from $K = \frac{1}{2}mv^{2}$. Its mass is measured with an uncertainty of $${num(a)}\%$ and its speed with $${num(b)}\%$. The percentage uncertainty in $K$ is:`,
    powers: [1, 2],
    formula: tex`K = \frac{1}{2}m^{1}v^{2}`,
  },
  {
    stem: (a, b) =>
      tex`In a pendulum experiment $g = 4\pi^{2}L/T^{2}$. The length $L$ has an uncertainty of $${num(a)}\%$ and the period $T$ has $${num(b)}\%$. The percentage uncertainty in $g$ is:`,
    powers: [1, -2],
    formula: tex`g = 4\pi^{2}L^{1}T^{-2}`,
  },
  {
    stem: (a, b) =>
      tex`The density of a cube is found from $\rho = m/l^{3}$. The mass $m$ has an uncertainty of $${num(a)}\%$ and the side $l$ has $${num(b)}\%$. The percentage uncertainty in $\rho$ is:`,
    powers: [1, -3],
    formula: tex`\rho = m^{1}l^{-3}`,
  },
  {
    stem: (a, b) =>
      tex`The power dissipated in a resistor is found from $P = I^{2}R$. The current has an uncertainty of $${num(a)}\%$ and the resistance has $${num(b)}\%$. The percentage uncertainty in $P$ is:`,
    powers: [2, 1],
    formula: tex`P = I^{2}R^{1}`,
  },
  {
    stem: (a, b) =>
      tex`The volume of a cylinder is found from $V = \pi r^{2}h$. The radius has an uncertainty of $${num(a)}\%$ and the height has $${num(b)}\%$. The percentage uncertainty in $V$ is:`,
    powers: [2, 1],
    formula: tex`V = \pi r^{2}h^{1}`,
  },
  {
    stem: (a) =>
      tex`The radius of a sphere is measured with an uncertainty of $${num(a)}\%$. The percentage uncertainty in its volume $V = \frac{4}{3}\pi r^{3}$ is:`,
    powers: [3],
    formula: tex`V = \frac{4}{3}\pi r^{3}`,
  },
];

/** (reading, uncertainty) pairs whose percentage uncertainty is a short exact decimal. */
const READING_CASES = (() => {
  const out: Array<{ value: number; delta: number; dp: number; unit: string; what: string; p: number }> = [];
  // [min, max] keeps every reading physically sensible for the object named.
  const instruments = [
    { delta: 0.1, dp: 1, unit: 'cm', what: 'The length of a rod', min: 10, max: 100 },
    { delta: 0.01, dp: 2, unit: 'cm', what: 'The diameter of a cylinder', min: 1, max: 10 },
    { delta: 0.05, dp: 2, unit: 'cm', what: 'The thickness of a block', min: 1, max: 12.5 },
    { delta: 0.1, dp: 1, unit: 's', what: 'The time for 20 oscillations of a pendulum', min: 10, max: 50 },
    { delta: 0.2, dp: 1, unit: 's', what: 'The time taken by an athlete to run a race', min: 10, max: 200 },
    { delta: 0.5, dp: 1, unit: 'g', what: 'The mass of a stone', min: 10, max: 500 },
    { delta: 1, dp: 0, unit: 'mm', what: 'The length of a book', min: 200, max: 400 },
  ];
  for (const { min, max, ...ins } of instruments) {
    for (const p of [0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.25, 2, 2.5, 4, 5]) {
      const value = Number(((ins.delta * 100) / p).toPrecision(12));
      const scaled = value * 10 ** ins.dp;
      if (Math.abs(scaled - Math.round(scaled)) > 1e-9) continue;
      if (value < min || value > max) continue;
      out.push({ ...ins, value, p });
    }
  }
  return out;
})();

const PREFIXES: Readonly<Record<string, number>> = { G: 9, M: 6, k: 3, m: -3, '\\mu ': -6, n: -9, p: -12 };

const PREFIX_CASES: ReadonlyArray<{ unit: string; prefixes: readonly string[] }> = [
  { unit: 'Hz', prefixes: ['k', 'M', 'G'] },
  { unit: 'F', prefixes: ['\\mu ', 'n', 'p'] },
  { unit: 'A', prefixes: ['m', '\\mu '] },
  { unit: 'm', prefixes: ['n', '\\mu ', 'k'] },
  { unit: 'W', prefixes: ['k', 'M'] },
  { unit: 's', prefixes: ['m', '\\mu ', 'n'] },
  { unit: 'J', prefixes: ['k', 'M'] },
  { unit: 'V', prefixes: ['k', 'm'] },
];

const POWER_UNIT_CASES: ReadonlyArray<{
  from: string;
  to: string;
  what: string;
  /** Realistic magnitudes for the object named (in `from` units). */
  values: readonly number[];
  e: number;
  wrong: readonly number[];
  why: string;
}> = [
  {
    from: 'cm^{2}', to: 'm^{2}', what: 'The area of a postage stamp', values: [2, 2.5, 3, 4, 5, 6, 8], e: -4, wrong: [-2, -6, 4],
    why: tex`$1\,\mathrm{cm} = 10^{-2}\,\mathrm{m}$, so $1\,\mathrm{cm^{2}} = (10^{-2})^{2}\,\mathrm{m^{2}} = 10^{-4}\,\mathrm{m^{2}}$.`,
  },
  {
    from: 'mm^{2}', to: 'm^{2}', what: 'The cross-sectional area of a wire', values: [0.5, 1.5, 2, 2.5, 4, 6], e: -6, wrong: [-3, -9, 6],
    why: tex`$1\,\mathrm{mm} = 10^{-3}\,\mathrm{m}$, so $1\,\mathrm{mm^{2}} = (10^{-3})^{2}\,\mathrm{m^{2}} = 10^{-6}\,\mathrm{m^{2}}$.`,
  },
  {
    from: 'cm^{3}', to: 'm^{3}', what: 'The volume of a metal block', values: [8, 12, 25, 40, 75, 125], e: -6, wrong: [-2, -3, -9],
    why: tex`$1\,\mathrm{cm} = 10^{-2}\,\mathrm{m}$, so $1\,\mathrm{cm^{3}} = (10^{-2})^{3}\,\mathrm{m^{3}} = 10^{-6}\,\mathrm{m^{3}}$.`,
  },
  {
    from: 'mm^{3}', to: 'm^{3}', what: 'The volume of a small drop', values: [5, 8, 12, 25, 40, 50], e: -9, wrong: [-3, -6, 9],
    why: tex`$1\,\mathrm{mm} = 10^{-3}\,\mathrm{m}$, so $1\,\mathrm{mm^{3}} = (10^{-3})^{3}\,\mathrm{m^{3}} = 10^{-9}\,\mathrm{m^{3}}$.`,
  },
  {
    from: 'g\\,cm^{-3}', to: 'kg\\,m^{-3}', what: 'The density of a liquid', values: [0.8, 0.9, 1.2, 1.5, 1.8, 13.6], e: 3, wrong: [-3, -1, 6],
    why: tex`$1\,\mathrm{g\,cm^{-3}} = \frac{10^{-3}\,\mathrm{kg}}{(10^{-2})^{3}\,\mathrm{m^{3}}} = 10^{-3} \times 10^{6} = 10^{3}\,\mathrm{kg\,m^{-3}}$.`,
  },
  {
    from: 'dm^{3}', to: 'm^{3}', what: 'The volume of a container', values: [1.5, 2, 2.5, 4, 5, 12, 25], e: -3, wrong: [-1, -6, 3],
    why: tex`$1\,\mathrm{dm} = 10^{-1}\,\mathrm{m}$, so $1\,\mathrm{dm^{3}} = (10^{-1})^{3}\,\mathrm{m^{3}} = 10^{-3}\,\mathrm{m^{3}}$.`,
  },
];

// ------------------------------------------------------------------------------------------
// Bank
// ------------------------------------------------------------------------------------------

export default defineBank('physics', 'measurements', (b) => [
  // ---------------------------------------------------------------- significant figures
  b.dynamic('count-significant-figures', { difficulty: 1, origin: 'past-paper', tags: ['significant figures'] }, (r) => {
    const coreLen = r.int(1, 4);
    const digits: number[] = [r.int(1, 9)];
    for (let i = 1; i < coreLen - 1; i++) digits.push(r.chance(0.5) ? 0 : r.int(1, 9));
    if (coreLen > 1) digits.push(r.int(1, 9));
    const core = digits.join('');
    const trailing = coreLen === 1 ? r.int(1, 2) : r.int(0, 2);
    const zeros = '0'.repeat(trailing);
    const sf = coreLen + trailing;
    const embedded = digits.filter((d) => d === 0).length;
    const kind = r.pick(['small', 'mixed', 'sci'] as const);

    let shown: string;
    let allDigits: number;
    let note: string;
    if (kind === 'small') {
      const lead = r.int(0, 3);
      shown = `0.${'0'.repeat(lead)}${core}${zeros}`;
      allDigits = 1 + lead + sf;
      note = 'the zeros before the first non-zero digit only locate the decimal point and are not significant';
    } else if (kind === 'mixed') {
      const cut = r.int(1, coreLen);
      const dec = core.slice(cut) + zeros;
      shown = dec ? `${core.slice(0, cut)}.${dec}` : core.slice(0, cut);
      allDigits = sf;
      note = 'there are no leading zeros';
    } else {
      const e = r.intExcept(-6, 8, [0, 1]);
      const rest = core.slice(1) + zeros;
      shown = `${core[0]}${rest ? `.${rest}` : ''} \\times 10^{${e}}`;
      allDigits = sf + String(Math.abs(e)).length;
      note = 'the power of ten does not affect the number of significant figures';
    }
    const { answer, distractors } = numericOptions(r, {
      correct: sf,
      wrong: [allDigits, sf - trailing, coreLen - embedded, sf + 1],
      format: (x) => `$${x}$`,
      fallback: 'integer',
    });
    const rules: string[] = [note];
    if (embedded > 0) rules.push('zeros between non-zero digits are significant');
    if (trailing > 0) rules.push('trailing zeros after the decimal point are significant');
    return {
      stem: tex`The number of significant figures in $${shown}$ is:`,
      answer,
      distractors,
      explanation: `In $${shown}$, ${rules.join('; ')}. The significant digits are ${(core + zeros).split('').join(', ')}, i.e. ${sf} significant figures.`,
    };
  }),

  b.dynamic('area-significant-figures', { difficulty: 2, tags: ['significant figures'] }, (r) => {
    for (;;) {
      const A = r.int(101, 999);
      const B = r.int(11, 99);
      if (A % 10 === 0 || B % 10 === 0) continue;
      const N = A * B;
      if (N < 10000 || N % 10 === 0) continue;
      const s = String(N);
      if (s[2] === '5' || s[3] === '5' || s[4] === '5') continue; // no exact halves at any cut
      const da = r.int(1, 2);
      const db = r.int(1, 2);
      const d = da + db;
      const P = N / 10 ** d;
      if (P < 0.1 || P >= 99.5) continue;
      const p2 = P.toPrecision(2);
      if (p2.endsWith('0')) continue;
      const exact = P.toFixed(d);
      const opts = [p2, P.toPrecision(3), P.toPrecision(4), exact].map((x) => tex`$${x}\,\mathrm{cm^{2}}$`);
      const lenText = (A / 10 ** da).toFixed(da);
      const widText = (B / 10 ** db).toFixed(db);
      return {
        stem: tex`The two sides of a rectangular strip are measured as $${lenText}\,\mathrm{cm}$ and $${widText}\,\mathrm{cm}$. Its area, recorded to the correct number of significant figures, is:`,
        answer: opts[0] as string,
        distractors: opts.slice(1),
        explanation: tex`In multiplication the result keeps as many significant figures as the factor with the fewest significant figures. $${lenText}$ has 3 and $${widText}$ has 2 significant figures, so area $= ${lenText} \times ${widText} = ${exact} \approx ${p2}\,\mathrm{cm^{2}}$ (2 significant figures).`,
      };
    }
  }),

  // ---------------------------------------------------------------- prefixes
  b.dynamic('prefix-to-base-unit', { difficulty: 1, tags: ['prefixes', 'SI units'] }, (r) => {
    const c = r.pick(PREFIX_CASES);
    const p = r.pick(c.prefixes);
    const e = PREFIXES[p] as number;
    const v = r.pick([1.2, 1.5, 2, 2.5, 3, 3.6, 4, 4.5, 5, 6, 7.5, 8]);
    const { answer, distractors } = numericOptions(r, {
      correct: v * 10 ** e,
      wrong: [v * 10 ** (e + 3), v * 10 ** (e - 3), v * 10 ** -e],
      format: (x) => sciQ(x, c.unit),
    });
    return {
      stem: tex`The quantity $${num(v)}\,\mathrm{${p}${c.unit}}$ expressed in $\mathrm{${c.unit}}$ is:`,
      answer,
      distractors,
      explanation: tex`The prefix $\mathrm{${p}}$ stands for $10^{${e}}$, so $${num(v)}\,\mathrm{${p}${c.unit}} = ${sci(v * 10 ** e)}\,\mathrm{${c.unit}}$.`,
    };
  }),

  b.dynamic('squared-cubed-prefix', { difficulty: 2, tags: ['prefixes', 'SI units'] }, (r) => {
    const c = r.pick(POWER_UNIT_CASES);
    const v = r.pick(c.values);
    const { answer, distractors } = numericOptions(r, {
      correct: v * 10 ** c.e,
      wrong: c.wrong.map((w) => v * 10 ** w),
      format: (x) => sciQ(x, c.to),
    });
    return {
      stem: tex`${c.what} is $${num(v)}\,\mathrm{${c.from}}$. In $\mathrm{${c.to}}$ this is:`,
      answer,
      distractors,
      explanation: tex`${c.why} Hence $${num(v)}\,\mathrm{${c.from}} = ${sci(v * 10 ** c.e)}\,\mathrm{${c.to}}$.`,
    };
  }),

  // ---------------------------------------------------------------- errors and uncertainties
  b.dynamic('reading-uncertainty', { difficulty: 1, tags: ['errors and uncertainties'] }, (r) => {
    if (r.chance(0.6)) {
      const c = r.pick(READING_CASES);
      const shown = tex`(${fx(c.value, c.dp)} \pm ${fx(c.delta, c.dp)})\,\mathrm{${c.unit}}`;
      const { answer, distractors } = numericOptions(r, {
        correct: c.p,
        wrong: [c.delta / c.value, 2 * c.p, c.p / 2, 10 * c.p],
        format: pct,
      });
      return {
        stem: tex`${c.what} is recorded as $${shown}$. The percentage uncertainty in this measurement is:`,
        answer,
        distractors,
        explanation: tex`Percentage uncertainty $= \frac{\Delta x}{x} \times 100\% = \frac{${num(c.delta)}}{${num(c.value)}} \times 100\% = ${num(c.p)}\%$.`,
      };
    }
    const [d1, d2] = r.sample([1, 2, 3], 2) as [number, number];
    const L1 = r.int(150, 400);
    const L2 = r.int(50, 140);
    const t = (x: number): string => fx(x / 10, 1);
    const opt = (centre: number, u: number): string => tex`$(${t(centre)} \pm ${t(u)})\,\mathrm{cm}$`;
    const answer = opt(L1 - L2, d1 + d2);
    const distractors = pickDistractors(answer, [
      opt(L1 - L2, Math.abs(d1 - d2)),
      opt(L1 - L2, Math.max(d1, d2)),
      opt(L1 + L2, d1 + d2),
      opt(L1 - L2, Math.min(d1, d2)),
    ]);
    return {
      stem: tex`Two lengths are measured as $(${t(L1)} \pm ${t(d1)})\,\mathrm{cm}$ and $(${t(L2)} \pm ${t(d2)})\,\mathrm{cm}$. Their difference, with its uncertainty, is:`,
      answer,
      distractors,
      explanation: tex`When quantities are added or subtracted, their absolute uncertainties are always added: $${t(L1)} - ${t(L2)} = ${t(L1 - L2)}\,\mathrm{cm}$ and $\Delta = ${t(d1)} + ${t(d2)} = ${t(d1 + d2)}\,\mathrm{cm}$.`,
    };
  }),

  b.dynamic('power-law-uncertainty', { difficulty: 2, origin: 'past-paper', tags: ['errors and uncertainties'] }, (r) => {
    const c = r.pick(PCT_CASES);
    const a = r.pick([0.5, 1, 1.5, 2, 2.5, 3]);
    const bb = r.pick([0.5, 1, 1.5, 2].filter((x) => x !== a));
    const u = c.powers.length === 1 ? [a] : [a, bb];
    const p = c.powers;
    const correct = p.reduce((s, k, i) => s + Math.abs(k) * (u[i] as number), 0);
    const wrong =
      p.length === 1
        ? [a, 4 * a, 2 * a, 9 * a]
        : [
            (u[0] as number) + (u[1] as number),
            Math.abs((p[0] as number) * (u[0] as number) + (p[1] as number) * (u[1] as number)),
            Math.abs(p[1] as number) * (u[0] as number) + Math.abs(p[0] as number) * (u[1] as number),
          ];
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: pct, fallback: 'offset' });
    const terms = p.map((k, i) => `${Math.abs(k)}(${num(u[i] as number)}\\%)`).join(' + ');
    return {
      stem: c.stem(a, bb),
      answer,
      distractors,
      explanation: tex`For $${c.formula}$, each percentage uncertainty is multiplied by the magnitude of its power and the results are always added (even for quantities in the denominator): $${terms} = ${num(correct)}\%$.`,
    };
  }),

  // ---------------------------------------------------------------- dimensions
  b.dynamic('dimensions-of-quantity', { difficulty: 2, origin: 'past-paper', tags: ['dimensions'] }, (r) => {
    const q = r.pick(DIM_QUANTITIES);
    const [m, l, t] = q.dims;
    const near: Array<[number, number, number]> = r.shuffle([
      [m, l, t - 1],
      [m, l, t + 1],
      [m, l + 1, t],
      [m, l - 1, t],
      [-m, l, t],
      [m, -l, t],
      [m, l + 1, t - 1],
    ]);
    const answer = `$${dimTex(q.dims)}$`;
    const distractors = pickDistractors(
      answer,
      near.filter((d) => d.some((x) => x !== 0)).map((d) => `$${dimTex(d)}$`),
    );
    return {
      stem: tex`The dimensions of ${q.name} are:`,
      answer,
      distractors,
      explanation: q.why,
    };
  }),

  b.dynamic('dimensional-exponent', { difficulty: 3, tags: ['dimensional analysis'] }, (r) => {
    const s = r.pick(EXP_SCENARIOS);
    const v = r.pick(s.vars);
    const ans = frac(v.exp[0], v.exp[1]);
    const fTex = (n: number, d: number): string => `$${frac(n, d).toTex()}$`;
    const others = s.vars.filter((o) => o !== v).map((o) => fTex(o.exp[0], o.exp[1]));
    const generic = r.shuffle([fTex(1, 2), fTex(-1, 2), fTex(1, 1), fTex(-1, 1), fTex(2, 1), fTex(0, 1), fTex(-2, 1)]);
    const answer = `$${ans.toTex()}$`;
    const distractors = pickDistractors(answer, [
      `$${ans.neg().toTex()}$`,
      ...others,
      `$${ans.mul(2).toTex()}$`,
      ...generic,
    ]);
    return {
      stem: tex`${s.stem} The value of $${v.sym}$ is:`,
      answer,
      distractors,
      explanation: s.solve,
    };
  }),

  // ---------------------------------------------------------------- fixed items
  ...b.mcqs([
    {
      id: 'si-base-quantity',
      d: 1,
      o: 'past-paper',
      t: ['SI units'],
      q: 'Which of the following is a base quantity in the SI system?',
      a: 'Electric current',
      x: ['Electric charge', 'Electric potential', 'Electric resistance'],
      e: tex`The seven SI base quantities are length, mass, time, electric current, thermodynamic temperature, amount of substance and luminous intensity. Charge ($1\,\mathrm{C} = 1\,\mathrm{A\,s}$), potential and resistance are derived quantities.`,
    },
    {
      id: 'solid-angle-unit',
      d: 1,
      t: ['SI units'],
      q: 'The SI unit of solid angle is the:',
      a: 'steradian',
      x: ['radian', 'degree', 'candela'],
      e: tex`A solid angle is measured in steradians (sr): $\Omega = A/r^{2}$. The radian measures a plane angle and the candela is the unit of luminous intensity.`,
    },
    {
      id: 'viscosity-si-unit',
      d: 1,
      o: 'past-paper',
      t: ['SI units', 'dimensions'],
      q: 'The SI unit of the coefficient of viscosity is:',
      a: tex`$\mathrm{N\,s\,m^{-2}}$`,
      x: [tex`$\mathrm{N\,m^{-2}}$`, tex`$\mathrm{N\,m\,s^{-1}}$`, tex`$\mathrm{N\,s^{-1}\,m^{2}}$`],
      e: tex`From $F = 6\pi\eta rv$: $\eta = \frac{F}{6\pi rv}$ ($6\pi$ has no unit), with units $\frac{\mathrm{N}}{\mathrm{m}\,(\mathrm{m\,s^{-1}})} = \mathrm{N\,s\,m^{-2}}$ (equivalently $\mathrm{Pa\,s}$ or $\mathrm{kg\,m^{-1}\,s^{-1}}$).`,
    },
    {
      id: 'accuracy-vs-precision',
      d: 1,
      t: ['errors and uncertainties'],
      q: 'The accuracy of a measurement is judged by its:',
      a: 'fractional (percentage) uncertainty',
      x: ['absolute uncertainty alone', 'number of repeated readings', 'unit of measurement'],
      e: 'Precision is set by the absolute uncertainty (the least count of the instrument), while accuracy is set by the fractional or percentage uncertainty: a smaller relative uncertainty means a more accurate result.',
    },
    {
      id: 'reduce-random-error',
      d: 1,
      t: ['errors and uncertainties'],
      q: 'Random errors in a set of measurements can be reduced by:',
      a: 'taking the mean of many repeated readings',
      x: [
        'applying a zero correction to every reading',
        'calibrating the instrument against a standard',
        'recording only the first careful reading',
      ],
      e: 'Random errors scatter readings on both sides of the true value, so averaging many repeated readings reduces them. Zero correction and calibration remove systematic errors, not random ones.',
    },
    {
      id: 'vernier-recorded-reading',
      d: 1,
      o: 'past-paper',
      t: ['significant figures', 'errors and uncertainties'],
      q: tex`The diameter of a rod is measured with vernier callipers of least count $0.01\,\mathrm{cm}$. The zero of the vernier scale coincides exactly with the $2.4\,\mathrm{cm}$ mark of the main scale. The reading is correctly recorded as:`,
      a: tex`$2.40\,\mathrm{cm}$`,
      x: [tex`$2.4\,\mathrm{cm}$`, tex`$2.400\,\mathrm{cm}$`, tex`$2.4000\,\mathrm{cm}$`],
      e: tex`A reading is recorded up to the least count of the instrument. With a least count of $0.01\,\mathrm{cm}$ it must show two decimal places: $2.40\,\mathrm{cm}$ (the final zero is significant).`,
    },
    {
      id: 'same-dimensions-pair',
      d: 2,
      o: 'past-paper',
      t: ['dimensions'],
      q: 'Which pair of quantities has the same dimensions?',
      a: 'Work and torque',
      x: ['Force and impulse', 'Momentum and energy', 'Power and pressure'],
      e: tex`Work $= Fd$ and torque $= rF\sin\theta$ both have dimensions $[\mathrm{ML^{2}T^{-2}}]$. Impulse $[\mathrm{MLT^{-1}}]$ differs from force $[\mathrm{MLT^{-2}}]$, momentum $[\mathrm{MLT^{-1}}]$ from energy $[\mathrm{ML^{2}T^{-2}}]$, and power $[\mathrm{ML^{2}T^{-3}}]$ from pressure $[\mathrm{ML^{-1}T^{-2}}]$.`,
    },
    {
      id: 'dimensionally-wrong-equation',
      d: 1,
      t: ['dimensional analysis'],
      q: tex`Which of the following equations is dimensionally **incorrect**?`,
      a: tex`$v = u + \frac{1}{2}at^{2}$`,
      x: [tex`$v^{2} = u^{2} + 2as$`, tex`$s = ut + \frac{1}{2}at^{2}$`, tex`$v = u + at$`],
      e: tex`Each term of a valid equation must have the same dimensions. In $v = u + \frac{1}{2}at^{2}$, the term $at^{2}$ has dimensions $[\mathrm{LT^{-2}}][\mathrm{T^{2}}] = [\mathrm{L}]$, which cannot be added to a velocity $[\mathrm{LT^{-1}}]$.`,
    },
    {
      id: 'dimensional-analysis-limitation',
      d: 2,
      t: ['dimensional analysis'],
      q: tex`Dimensional analysis **cannot** be used to:`,
      a: 'find the value of a dimensionless constant in a formula',
      x: [
        'check whether an equation is dimensionally consistent',
        'convert a quantity from one system of units to another',
        'derive the form of a relation among a few quantities',
      ],
      e: tex`Dimensionless constants (such as $2\pi$ in $T = 2\pi\sqrt{l/g}$) carry no dimensions, so dimensional analysis cannot find them; they come from experiment or theory. It can check homogeneity, convert units and derive power-law relations.`,
    },
    {
      id: 'unit-change-energy',
      d: 2,
      t: ['dimensions', 'SI units'],
      q: 'If the units of force and length are each increased four times, the unit of energy becomes:',
      a: '16 times larger',
      x: ['4 times larger', '8 times larger', 'unchanged'],
      e: tex`Energy $=$ force $\times$ length, so the new unit of energy is $4 \times 4 = 16$ times the old one.`,
    },
    {
      id: 'energy-density-dimensions',
      d: 3,
      t: ['dimensions', 'dimensional analysis'],
      q: tex`The quantity $\frac{1}{2}\varepsilon_0E^{2}$, where $E$ is the electric field intensity, has the same dimensions as:`,
      a: 'pressure',
      x: ['energy', 'force', 'electric potential'],
      e: tex`$\frac{1}{2}\varepsilon_0E^{2}$ is the energy stored per unit volume of the field, with units $\mathrm{J\,m^{-3}} = \mathrm{N\,m\,m^{-3}} = \mathrm{N\,m^{-2}}$, i.e. $[\mathrm{ML^{-1}T^{-2}}]$, the dimensions of pressure.`,
    },
  ]),
]);
