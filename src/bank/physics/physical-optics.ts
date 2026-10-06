import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { frac, num, numericOptions, ordinal, pickDistractors, q$, qty, sci, tex, U } from '@/engine/helpers';

/*
 * Physical Optics (FSc Part I): interference, Young's double slit, thin films,
 * Newton's rings, Michelson interferometer, diffraction (grating, X-rays) and
 * polarization.
 *
 * Parameter tables are enumerated once at load time and filtered so that every
 * marked answer is exact and shows at most three significant figures.
 */

/** Micrometre, for qty(). */
const UM = '\\mu m';

/** True when num() displays `x` exactly (at most three significant figures). */
const exact3 = (x: number): boolean => x !== 0 && Math.abs(Number(x.toPrecision(3)) - x) <= 1e-9 * Math.abs(x);

// ---------------------------------------------------------------------------
// Young's double slit: wavelength (nm), slit separation (mm), screen distance (m)
// and the resulting fringe spacing (mm), all exact.
// ---------------------------------------------------------------------------
interface Ydse {
  lambda: number;
  d: number;
  L: number;
  beta: number;
}

const YDSE: Ydse[] = [];
for (const lambda of [400, 420, 450, 480, 500, 540, 560, 600, 630, 640, 650, 700]) {
  for (const dUm of [100, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000]) {
    for (const lCm of [50, 80, 100, 120, 150, 200, 250, 300]) {
      // beta = lambda L / d; in micrometres this is lambda[nm] * L[cm] * 10 / d[um].
      const betaUm = (lambda * lCm * 10) / dUm;
      if (!Number.isInteger(betaUm) || betaUm % 10 !== 0) continue;
      const beta = betaUm / 1000;
      if (beta >= 0.3 && beta <= 6 && exact3(beta)) YDSE.push({ lambda, d: dUm / 1000, L: lCm / 100, beta });
    }
  }
}

/** Distance of the n-th bright or dark fringe from the centre (mm), exact. */
interface FringeAt {
  set: Ydse;
  dark: boolean;
  n: number;
  y: number;
}

const FRINGE_POSITIONS: FringeAt[] = [];
for (const set of YDSE) {
  // Keep half a fringe spacing exact as well (dark fringes sit at odd multiples of beta/2).
  if (Math.round(set.beta * 1000) % 20 !== 0) continue;
  for (const n of [2, 3, 4, 5]) {
    for (const dark of [false, true]) {
      const y = (dark ? n - 0.5 : n) * set.beta;
      if (y <= 20 && exact3(y)) FRINGE_POSITIONS.push({ set, dark, n, y });
    }
  }
}

/** The order-n1 bright fringe of lambda1 falls on the order-n2 bright fringe of lambda2 (both visible, nm). */
interface Coincidence {
  l1: number;
  n1: number;
  l2: number;
  n2: number;
}

const COINCIDENCES: Coincidence[] = [];
for (let l1 = 400; l1 <= 700; l1 += 10) {
  for (let n1 = 2; n1 <= 6; n1++) {
    for (let n2 = 2; n2 <= 8; n2++) {
      const l2 = (n1 * l1) / n2;
      if (n1 !== n2 && Number.isInteger(l2) && l2 >= 400 && l2 <= 700) COINCIDENCES.push({ l1, n1, l2, n2 });
    }
  }
}

/** How the fringe spacing changes when the set-up is altered. */
interface SpacingChange {
  change: string;
  factor: Fraction;
  /** Factors produced by typical mistakes (inverse relation, one change only, squaring). */
  wrong: readonly Fraction[];
  work: string;
}

const SPACING_CHANGES: readonly SpacingChange[] = [
  {
    change: 'the slit separation is halved and the screen is moved to twice its distance from the slits',
    factor: frac(4),
    wrong: [frac(1, 4), frac(1), frac(2)],
    work: tex`$\beta' = \frac{\lambda(2L)}{d/2} = 4\,\frac{\lambda L}{d} = 4\beta$.`,
  },
  {
    change: 'the slit separation is doubled and the distance of the screen from the slits is halved',
    factor: frac(1, 4),
    wrong: [frac(4), frac(1), frac(1, 2)],
    work: tex`$\beta' = \frac{\lambda(L/2)}{2d} = \frac{1}{4}\cdot\frac{\lambda L}{d} = \frac{\beta}{4}$.`,
  },
  {
    change: 'the separation between the slits is doubled',
    factor: frac(1, 2),
    wrong: [frac(2), frac(1, 4), frac(4)],
    work: tex`$\beta' = \frac{\lambda L}{2d} = \frac{\beta}{2}$.`,
  },
  {
    change: 'the separation between the slits is halved',
    factor: frac(2),
    wrong: [frac(1, 2), frac(4), frac(1, 4)],
    work: tex`$\beta' = \frac{\lambda L}{d/2} = 2\beta$.`,
  },
  {
    change: 'the distance between the slits and the screen is tripled',
    factor: frac(3),
    wrong: [frac(1, 3), frac(9), frac(1)],
    work: tex`$\beta' = \frac{\lambda(3L)}{d} = 3\beta$.`,
  },
  {
    change: 'the wavelength is doubled and the distance of the screen from the slits is halved',
    factor: frac(1),
    wrong: [frac(4), frac(1, 4), frac(2)],
    work: tex`$\beta' = \frac{(2\lambda)(L/2)}{d} = \frac{\lambda L}{d} = \beta$, so the spacing is unchanged.`,
  },
  {
    change: 'both the slit separation and the distance of the screen from the slits are doubled',
    factor: frac(1),
    wrong: [frac(4), frac(1, 4), frac(2)],
    work: tex`$\beta' = \frac{\lambda(2L)}{2d} = \frac{\lambda L}{d} = \beta$, so the spacing is unchanged.`,
  },
  {
    change: tex`the whole apparatus is immersed in water of refractive index $\frac{4}{3}$`,
    factor: frac(3, 4),
    wrong: [frac(4, 3), frac(1), frac(9, 16)],
    work: tex`In water the wavelength becomes $\lambda' = \frac{\lambda}{n} = \frac{3\lambda}{4}$, so $\beta' = \frac{\lambda' L}{d} = \frac{3\beta}{4}$.`,
  },
  {
    change: tex`the whole apparatus is immersed in a liquid of refractive index $1.5$`,
    factor: frac(2, 3),
    wrong: [frac(3, 2), frac(1), frac(4, 9)],
    work: tex`In the liquid the wavelength becomes $\lambda' = \frac{\lambda}{1.5} = \frac{2\lambda}{3}$, so $\beta' = \frac{\lambda' L}{d} = \frac{2\beta}{3}$.`,
  },
  {
    change: tex`light of wavelength $600\,\mathrm{nm}$ is replaced by light of wavelength $400\,\mathrm{nm}$`,
    factor: frac(2, 3),
    wrong: [frac(3, 2), frac(4, 9), frac(9, 4)],
    work: tex`$\beta \propto \lambda$, so $\beta' = \frac{400}{600}\,\beta = \frac{2\beta}{3}$.`,
  },
  {
    change: tex`light of wavelength $450\,\mathrm{nm}$ is replaced by light of wavelength $600\,\mathrm{nm}$`,
    factor: frac(4, 3),
    wrong: [frac(3, 4), frac(16, 9), frac(9, 16)],
    work: tex`$\beta \propto \lambda$, so $\beta' = \frac{600}{450}\,\beta = \frac{4\beta}{3}$.`,
  },
  {
    change: 'the slit separation is reduced to one-third and the distance of the screen from the slits is doubled',
    factor: frac(6),
    wrong: [frac(2, 3), frac(3, 2), frac(1, 6)],
    work: tex`$\beta' = \frac{\lambda(2L)}{d/3} = 6\,\frac{\lambda L}{d} = 6\beta$.`,
  },
  {
    change: 'the distance of the screen from the slits is doubled and the slit separation is tripled',
    factor: frac(2, 3),
    wrong: [frac(3, 2), frac(6), frac(1, 6)],
    work: tex`$\beta' = \frac{\lambda(2L)}{3d} = \frac{2}{3}\cdot\frac{\lambda L}{d} = \frac{2\beta}{3}$.`,
  },
];

/** `k beta` as LaTeX: \beta, 4\beta, \frac{\beta}{4}, \frac{3\beta}{4}. */
function betaTex(f: Fraction): string {
  if (f.equals(1)) return '\\beta';
  if (f.d === 1) return `${f.n}\\beta`;
  if (f.n === 1) return `\\frac{\\beta}{${f.d}}`;
  return `\\frac{${f.n}\\beta}{${f.d}}`;
}

// ---------------------------------------------------------------------------
// Thin films: a film in air (one phase reversal, at the front surface).
// Bright in reflection: 2nt = (m + 1/2) lambda; dark: 2nt = m lambda.
// ---------------------------------------------------------------------------
interface FilmCase {
  n: number;
  t: number;
  lambda: number;
  bright: boolean;
}

const FILM_CASES: FilmCase[] = [];
for (const n of [1.2, 1.25, 1.33, 1.4, 1.5, 1.6]) {
  for (let t = 50; t <= 300; t += 5) {
    for (const bright of [true, false]) {
      const lambda = Math.round((bright ? 4 : 2) * n * t * 1000) / 1000;
      if (Number.isInteger(lambda) && lambda >= 400 && lambda <= 700) FILM_CASES.push({ n, t, lambda, bright });
    }
  }
}

// ---------------------------------------------------------------------------
// Michelson interferometer: mirror shift x (mm) = N lambda / 2.
// ---------------------------------------------------------------------------
interface MichelsonCase {
  lambda: number;
  count: number;
  x: number;
}

const MICHELSON: MichelsonCase[] = [];
for (const lambda of [450, 480, 500, 540, 560, 600, 620, 640, 650, 680]) {
  for (const count of [100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000]) {
    const x = (count * lambda) / 2 / 1e6;
    if (x >= 0.02 && x <= 1 && exact3(x)) MICHELSON.push({ lambda, count, x });
  }
}

// ---------------------------------------------------------------------------
// Diffraction grating. Line densities chosen so that d = 1/N is exact.
// ---------------------------------------------------------------------------
interface GratingCase {
  /** lines per cm */
  lines: number;
  n: number;
  lambda: number;
  /** sin(theta) of the n-th order maximum (a multiple of 0.05) */
  s: number;
}

const GRATING_WAVELENGTHS = [425, 475, 525, 575, 625, 675];
for (let lambda = 400; lambda <= 700; lambda += 10) GRATING_WAVELENGTHS.push(lambda);

const GRATING: GratingCase[] = [];
for (const lines of [2000, 2500, 4000, 5000, 6250, 8000, 10000, 12500]) {
  for (const n of [1, 2, 3]) {
    for (const lambda of GRATING_WAVELENGTHS) {
      // sin(theta) = n lambda / d = n * lambda[nm] * lines[cm^-1] * 1e-7; keep it a multiple of 0.05.
      const p = n * lambda * lines;
      if (p % 500000 !== 0) continue;
      const s = p / 1e7;
      if (s >= 0.1 && s <= 0.9) GRATING.push({ lines, n, lambda, s });
    }
  }
}
/** The classic "maximum at 30 degrees" sets (sin 30 = 0.5), boosted when drawing. */
const GRATING_AT_30 = GRATING.filter((c) => c.s === 0.5);

interface OrderCase {
  lines: number;
  lambda: number;
  ratio: number;
  nmax: number;
}

const MAX_ORDER: OrderCase[] = [];
for (const lines of [2000, 2500, 4000, 5000, 6250, 8000, 10000]) {
  for (let lambda = 400; lambda <= 700; lambda += 10) {
    const ratio = 1e7 / lines / lambda; // d / lambda
    const nmax = Math.floor(ratio);
    const f = ratio - nmax;
    // Stay clear of whole-number ratios (that order would sit exactly at 90 degrees).
    if (nmax >= 1 && nmax <= 8 && f >= 0.1 && f <= 0.9) MAX_ORDER.push({ lines, lambda, ratio, nmax });
  }
}

/** "5000 lines per cm" or, for variety, "500 lines per mm". */
function gratingDensity(lines: number, perMm: boolean): { text: string; dWork: string } {
  const dm = sci(0.01 / lines);
  return perMm
    ? { text: tex`$${num(lines / 10)}$ lines per mm`, dWork: tex`d = \frac{1}{${num(lines / 10)}}\,\mathrm{mm} = ${dm}\,\mathrm{m}` }
    : { text: tex`$${num(lines)}$ lines per cm`, dWork: tex`d = \frac{1}{${num(lines)}}\,\mathrm{cm} = ${dm}\,\mathrm{m}` };
}

// ---------------------------------------------------------------------------
// Bragg reflection: 2 d sin(theta) = n lambda (lengths in nm).
// ---------------------------------------------------------------------------
interface BraggCase {
  lambda: number;
  n: number;
  s: number;
  d: number;
}

const BRAGG: BraggCase[] = [];
for (const lpm of [100, 120, 150, 160, 180, 200, 240]) {
  for (const n of [1, 2]) {
    for (const s of [0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.8]) {
      const dpm = (n * lpm) / (2 * s);
      const rounded = Math.round(dpm);
      if (Math.abs(dpm - rounded) < 1e-9 && rounded >= 100 && rounded <= 600) {
        BRAGG.push({ lambda: lpm / 1000, n, s, d: rounded / 1000 });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Polaroids: exact cos^2 values and LaTeX for intensities as fractions of I0.
// ---------------------------------------------------------------------------
const COS2: Readonly<Record<number, Fraction>> = { 30: frac(3, 4), 45: frac(1, 2), 60: frac(1, 4), 90: frac(0) };
const SIN2: Readonly<Record<number, Fraction>> = { 30: frac(1, 4), 45: frac(1, 2), 60: frac(3, 4), 90: frac(1) };
/** I0 cos(theta) and (I0/2) cos(theta): the "forgot to square" mistake. */
const COS_ONCE: Readonly<Record<number, string>> = {
  30: '\\frac{\\sqrt{3}}{2}I_0',
  45: '\\frac{I_0}{\\sqrt{2}}',
  60: '\\frac{I_0}{2}',
  90: '0',
};
const HALF_COS_ONCE: Readonly<Record<number, string>> = {
  30: '\\frac{\\sqrt{3}}{4}I_0',
  45: '\\frac{I_0}{2\\sqrt{2}}',
  60: '\\frac{I_0}{4}',
  90: '0',
};
/** Exact cos(theta) for the reverse (find-the-angle) variant. */
const COS_EXACT: Readonly<Record<number, string>> = {
  30: '\\frac{\\sqrt{3}}{2}',
  45: '\\frac{1}{\\sqrt{2}}',
  60: '\\frac{1}{2}',
};

/** Canonical LaTeX for k I0 (k rational): 0, I_0, \frac{I_0}{8}, \frac{3}{8}I_0. */
function intensityTex(f: Fraction): string {
  if (f.isZero()) return '0';
  if (f.equals(1)) return 'I_0';
  if (f.n === 1) return `\\frac{I_0}{${f.d}}`;
  return `\\frac{${f.n}}{${f.d}}I_0`;
}

export default defineBank('physics', 'physical-optics', (b) => [
  // -------------------------------------------------------------------------
  // Young's double-slit experiment
  // -------------------------------------------------------------------------
  b.dynamic('ydse-fringe-spacing', { difficulty: 1, tags: ['Young double slit'] }, (r) => {
    const { lambda, d, L, beta } = r.pick(YDSE);
    const ask = r.weighted(['spacing', 'wavelength', 'separation'] as const, [2, 1, 1]);
    if (ask === 'wavelength') {
      const { answer, distractors } = numericOptions(r, {
        correct: lambda,
        // used beta = lambda L / 2d, slit separation read in cm, power-of-ten slip
        wrong: r.shuffle([2 * lambda, lambda / 2, 10 * lambda, lambda / 10]),
        format: (x) => q$(x, U.nm),
      });
      return {
        stem: tex`In Young's double-slit experiment the slits are $${qty(d, U.mm)}$ apart and the screen is $${qty(L, U.m)}$ from the slits. If the fringe spacing is $${qty(beta, U.mm)}$, the wavelength of the light used is:`,
        answer,
        distractors,
        explanation: tex`$\Delta y = \frac{\lambda L}{d}$, so $\lambda = \frac{\Delta y\,d}{L} = \frac{(${num(beta)} \times 10^{-3})(${num(d)} \times 10^{-3})}{${num(L)}} = ${sci(lambda * 1e-9)}\,\mathrm{m} = ${lambda}\,\mathrm{nm}$.`,
      };
    }
    if (ask === 'separation') {
      const { answer, distractors } = numericOptions(r, {
        correct: d,
        wrong: r.shuffle([2 * d, d / 2, 10 * d, d / 10]),
        format: (x) => q$(x, U.mm),
      });
      return {
        stem: tex`In Young's double-slit experiment, light of wavelength $${qty(lambda, U.nm)}$ produces fringes of spacing $${qty(beta, U.mm)}$ on a screen $${qty(L, U.m)}$ from the slits. The separation of the slits is:`,
        answer,
        distractors,
        explanation: tex`$\Delta y = \frac{\lambda L}{d}$, so $d = \frac{\lambda L}{\Delta y} = \frac{(${lambda} \times 10^{-9})(${num(L)})}{${num(beta)} \times 10^{-3}} = ${sci(d / 1000)}\,\mathrm{m} = ${num(d)}\,\mathrm{mm}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: beta,
      // half spacing (dark-fringe formula), doubled, mm/cm slips
      wrong: r.shuffle([beta / 2, 2 * beta, 10 * beta, beta / 10]),
      format: (x) => q$(x, U.mm),
    });
    return {
      stem: tex`In Young's double-slit experiment, light of wavelength $${qty(lambda, U.nm)}$ falls on two slits $${qty(d, U.mm)}$ apart, and the fringes are observed on a screen $${qty(L, U.m)}$ from the slits. The fringe spacing is:`,
      answer,
      distractors,
      explanation: tex`$\Delta y = \frac{\lambda L}{d} = \frac{(${lambda} \times 10^{-9})(${num(L)})}{${num(d)} \times 10^{-3}} = ${sci(beta / 1000)}\,\mathrm{m} = ${num(beta)}\,\mathrm{mm}$.`,
    };
  }),

  b.dynamic('ydse-spacing-change', { difficulty: 2, origin: 'past-paper', tags: ['Young double slit'] }, (r) => {
    const c = r.pick(SPACING_CHANGES);
    const answer = `$${betaTex(c.factor)}$`;
    const fallback = [frac(2), frac(1, 2), frac(4), frac(1, 4), frac(1)];
    return {
      stem: tex`In Young's double-slit experiment the fringe spacing is $\beta$. If ${c.change}, the new fringe spacing is:`,
      answer,
      distractors: pickDistractors(answer, [...c.wrong, ...fallback].map((f) => `$${betaTex(f)}$`)),
      explanation: tex`The fringe spacing is $\beta = \frac{\lambda L}{d}$. ${c.work}`,
    };
  }),

  b.dynamic('ydse-fringe-position', { difficulty: 2, tags: ['Young double slit'] }, (r) => {
    const { set, dark, n, y } = r.pick(FRINGE_POSITIONS);
    const { lambda, d, L, beta } = set;
    // For a bright fringe, (n - 1) beta is never offered: readers who count the central fringe as the
    // first bright fringe would (defensibly) choose it. Explicit pools keep any fallback from adding it.
    const wrong = dark
      ? // took m = n in (m + 1/2), used the bright formula, miscounted, used (m - 3/2), counted both sides
        [(n + 0.5) * beta, n * beta, (n - 1) * beta, (n - 1.5) * beta, (2 * n - 1) * beta]
      : // used a dark-fringe formula (m - 1/2 or m + 1/2), used lambda L / 2d, counted both sides, overcounted
        [(n - 0.5) * beta, (n + 0.5) * beta, ...(n === 2 ? [] : [(n * beta) / 2]), 2 * n * beta, (n + 1) * beta];
    const answer = q$(y, U.mm);
    const distractors = pickDistractors(answer, wrong.map((x) => q$(x, U.mm)));
    const kind = dark ? 'dark' : 'bright';
    const spacing = tex`The fringe spacing is $\Delta y = \frac{\lambda L}{d} = \frac{(${lambda} \times 10^{-9})(${num(L)})}{${num(d)} \times 10^{-3}} = ${num(beta)}\,\mathrm{mm}$.`;
    const place = dark
      ? tex`Dark fringes lie at $y = (m + \frac{1}{2})\Delta y$ with $m = 0$ for the first one, so the ${ordinal(n)} dark fringe ($m = ${n - 1}$) is at $y = ${num(n - 0.5)} \times ${num(beta)} = ${num(y)}\,\mathrm{mm}$.`
      : tex`Bright fringes lie at $y = m\,\Delta y$ with $m = 0$ for the central fringe, so the ${ordinal(n)} bright fringe is at $y = ${n} \times ${num(beta)} = ${num(y)}\,\mathrm{mm}$.`;
    return {
      stem: tex`In Young's double-slit experiment the slits are $${qty(d, U.mm)}$ apart and the screen is $${qty(L, U.m)}$ from the slits. With light of wavelength $${qty(lambda, U.nm)}$, the distance of the ${ordinal(n)} ${kind} fringe from the centre of the central bright fringe is:`,
      answer,
      distractors,
      explanation: `${spacing} ${place}`,
    };
  }),

  b.dynamic('ydse-coinciding-fringes', { difficulty: 2, tags: ['Young double slit', 'interference'] }, (r) => {
    const { l1, n1, l2, n2 } = r.pick(COINCIDENCES);
    // "Order" (m = 0 for the central fringe) keeps the fringe numbering unambiguous.
    const rule = tex`Bright fringes lie at $y = \frac{m\lambda L}{d}$, where $m$ is the order ($m = 0$ for the central fringe), so two bright fringes coincide when $m_1\lambda_1 = m_2\lambda_2$`;
    if (r.chance(0.5)) {
      // Which order of the second colour lands on a given fringe of the first?
      const answer = `$${n2}$`;
      // The same order as the first colour (the classic slip), then neighbouring orders.
      const candidates = [n1, n2 + 1, n2 - 1, n2 + 2, n2 + 3].map((m) => `$${m}$`);
      return {
        stem: tex`In Young's double-slit experiment the slits are illuminated simultaneously by light of wavelengths $${qty(l1, U.nm)}$ and $${qty(l2, U.nm)}$. The ${ordinal(n1)}-order bright fringe of the $${qty(l1, U.nm)}$ light coincides with a bright fringe of the $${qty(l2, U.nm)}$ light whose order is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`${rule}: $m_2 = \frac{m_1\lambda_1}{\lambda_2} = \frac{${n1} \times ${l1}}{${l2}} = ${n2}$.`,
      };
    }
    // Keep mistake-based distractors in a believable range; numericOptions fills any gap.
    const visible = (x: number) => (x >= 350 && x <= 800 ? Math.round(x) : NaN);
    const { answer, distractors } = numericOptions(r, {
      correct: l2,
      wrong: [
        visible((n2 * l1) / n1), // inverted the ratio
        visible(((2 * n1 - 1) * l1) / (2 * n2 - 1)), // used the dark-fringe condition (m - 1/2)
        visible(((2 * n1 + 1) * l1) / (2 * n2 + 1)), // used the dark-fringe condition (m + 1/2)
      ],
      format: (x) => q$(x, U.nm),
    });
    return {
      stem: tex`In Young's double-slit experiment the slits are illuminated by light containing two wavelengths. The ${ordinal(n1)}-order bright fringe of the $${qty(l1, U.nm)}$ light falls at the same point on the screen as the ${ordinal(n2)}-order bright fringe of the other light. The other wavelength is:`,
      answer,
      distractors,
      explanation: tex`${rule}: $\lambda_2 = \frac{m_1\lambda_1}{m_2} = \frac{${n1} \times ${l1}}{${n2}} = ${l2}\,\mathrm{nm}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Interference conditions and the Michelson interferometer
  // -------------------------------------------------------------------------
  b.dynamic('path-difference-fringe', { difficulty: 2, tags: ['interference', 'Young double slit'] }, (r) => {
    const lambda = r.pick([400, 450, 480, 500, 540, 560, 600, 640, 700]);
    const p = r.pick([1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]);
    const delta = p * lambda; // nm, an integer because every lambda is even
    const k = Math.floor(p);
    const isDark = p !== k;
    const fringe = (m: number, kind: 'bright' | 'dark') => `${ordinal(m)} ${kind} fringe`;
    const answer = isDark ? fringe(k + 1, 'dark') : fringe(k, 'bright');
    // For a bright point the (k + 1)th bright fringe is never offered: readers who count the central
    // fringe as the first bright fringe would (defensibly) choose it.
    const candidates = isDark
      ? [fringe(k, 'dark'), fringe(k + 1, 'bright'), fringe(k, 'bright'), fringe(k + 2, 'dark')]
      : [fringe(k, 'dark'), fringe(k + 1, 'dark'), ...(k > 1 ? [fringe(k - 1, 'bright')] : []), fringe(k + 2, 'dark')];
    const deltaText = exact3(delta / 1000) && r.chance(0.5) ? qty(delta / 1000, UM) : qty(delta, U.nm);
    const ratio = tex`$\frac{\Delta}{\lambda} = \frac{${delta}\,\mathrm{nm}}{${lambda}\,\mathrm{nm}} = ${num(p)}$`;
    return {
      stem: tex`In Young's double-slit experiment with light of wavelength $${qty(lambda, U.nm)}$, the path difference between the waves reaching a point P on the screen from the two slits is $${deltaText}$. The point P lies on the:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: isDark
        ? tex`${ratio}, i.e. $\Delta = (${k} + \frac{1}{2})\lambda$, so the waves arrive in antiphase and interfere destructively. A path difference of $(m + \frac{1}{2})\lambda$ gives a dark fringe with $m = 0$ for the first one, so $m = ${k}$ is the ${ordinal(k + 1)} dark fringe.`
        : tex`${ratio}, a whole number of wavelengths, so the waves arrive in phase and interfere constructively. Counting the central bright fringe as $m = 0$, a path difference of $${k}\lambda$ gives the ${ordinal(k)} bright fringe.`,
    };
  }),

  b.dynamic('michelson-mirror-shift', { difficulty: 2, tags: ['interference'] }, (r) => {
    const { lambda, count, x } = r.pick(MICHELSON);
    const ask = r.pick(['wavelength', 'distance', 'count'] as const);
    const intro = tex`Moving the mirror through $x$ changes the path of its beam by $2x$, so one fringe crosses for every $\frac{\lambda}{2}$ of mirror movement: $x = \frac{N\lambda}{2}$.`;
    const xm = sci(x / 1000);
    const lm = sci(lambda * 1e-9);
    if (ask === 'wavelength') {
      const { answer, distractors } = numericOptions(r, {
        correct: lambda,
        wrong: [lambda / 2, 2 * lambda, lambda / 4], // x/N (forgot the double pass), 4x/N, x/2N
        format: (v) => q$(v, U.nm),
      });
      return {
        stem: tex`In a Michelson interferometer, $${count}$ fringes cross the field of view when the movable mirror is displaced through $${qty(x, U.mm)}$. The wavelength of the light used is:`,
        answer,
        distractors,
        explanation: tex`${intro} Hence $\lambda = \frac{2x}{N} = \frac{2 \times ${xm}}{${count}} = ${lm}\,\mathrm{m} = ${lambda}\,\mathrm{nm}$.`,
      };
    }
    if (ask === 'distance') {
      const { answer, distractors } = numericOptions(r, {
        correct: x,
        wrong: [2 * x, x / 2, 4 * x], // N lambda (forgot the 1/2), N lambda / 4, 2 N lambda
        format: (v) => q$(v, U.mm),
      });
      return {
        stem: tex`A Michelson interferometer is illuminated with light of wavelength $${qty(lambda, U.nm)}$. For $${count}$ fringes to cross the field of view, the movable mirror must be displaced through:`,
        answer,
        distractors,
        explanation: tex`${intro} Hence $x = \frac{${count} \times ${lm}}{2} = ${xm}\,\mathrm{m} = ${num(x)}\,\mathrm{mm}$.`,
      };
    }
    const whole = (v: number) => (Number.isInteger(v) ? v : NaN);
    const { answer, distractors } = numericOptions(r, {
      correct: count,
      wrong: [whole(count / 2), whole(2 * count), whole(count / 4)], // x/lambda, 4x/lambda, x/2lambda
      format: (v) => `$${num(v)}$`,
    });
    return {
      stem: tex`In a Michelson interferometer illuminated with light of wavelength $${qty(lambda, U.nm)}$, the movable mirror is displaced through $${qty(x, U.mm)}$. The number of fringes that cross the field of view is:`,
      answer,
      distractors,
      explanation: tex`${intro} Hence $N = \frac{2x}{\lambda} = \frac{2 \times ${xm}}{${lm}} = ${count}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'coherent-sources',
      d: 1,
      t: ['interference'],
      q: 'Two sources of light are said to be coherent if they emit waves of:',
      a: 'the same frequency with a constant phase difference',
      x: [
        'the same amplitude with a varying phase difference',
        'different frequencies but the same amplitude',
        'the same intensity but different wavelengths',
      ],
      e: 'A steady interference pattern needs sources that keep a fixed phase relationship, which is possible only when they have the same frequency (and wavelength) and a constant phase difference. Equal amplitude or intensity alone does not make two sources coherent.',
    },
    {
      id: 'white-light-central-fringe',
      d: 1,
      t: ['Young double slit'],
      q: "In Young's double-slit experiment performed with white light, the central fringe is:",
      a: 'white',
      x: ['dark', 'red', 'violet'],
      e: 'At the centre of the screen the path difference is zero for every wavelength, so all colours interfere constructively there and the central fringe is white. Away from the centre the fringes of different colours separate, giving coloured fringes.',
    },
    {
      id: 'huygens-principle',
      d: 1,
      t: ['interference'],
      q: "According to Huygens' principle, every point on a wavefront:",
      a: 'acts as a source of secondary wavelets that spread out with the speed of the wave',
      x: [
        'reflects the wave back towards its source',
        'vibrates out of phase with the neighbouring points on the wavefront',
        'emits secondary wavelets that travel faster than the wave itself',
      ],
      e: "Huygens' principle states that every point of a wavefront may be regarded as a source of secondary wavelets, which spread out in the forward direction with the speed of the wave. The surface touching all these wavelets gives the new position of the wavefront. All points on a wavefront vibrate in phase.",
    },
    {
      id: 'ray-normal-to-wavefront',
      d: 1,
      t: ['interference'],
      q: 'The angle between a ray of light and the wavefront to which it belongs is:',
      a: tex`$90^{\circ}$`,
      x: [tex`$0^{\circ}$`, tex`$45^{\circ}$`, tex`$180^{\circ}$`],
      e: 'A ray shows the direction in which the wave travels, and this direction is always normal (perpendicular) to the wavefront.',
    },
    {
      id: 'same-wavefront-phase',
      d: 1,
      t: ['interference'],
      q: 'The phase difference between any two points on the same wavefront is:',
      a: '$0$',
      x: [tex`$\frac{\pi}{4}$`, tex`$\frac{\pi}{2}$`, tex`$\pi$`],
      e: 'A wavefront is a surface on which every point is in the same phase of vibration, so the phase difference between any two of its points is zero.',
    },
    {
      id: 'half-wave-path-phase',
      d: 1,
      t: ['interference'],
      q: tex`Two waves of wavelength $\lambda$ from coherent sources reach a point with a path difference of $\frac{\lambda}{2}$. The phase difference between them at that point is:`,
      a: tex`$\pi\,\mathrm{rad}$`,
      x: [tex`$\frac{\pi}{2}\,\mathrm{rad}$`, tex`$2\pi\,\mathrm{rad}$`, tex`$\frac{\pi}{4}\,\mathrm{rad}$`],
      e: tex`Phase difference $= \frac{2\pi}{\lambda} \times$ path difference $= \frac{2\pi}{\lambda} \times \frac{\lambda}{2} = \pi\,\mathrm{rad}$. A path difference of one whole wavelength would correspond to $2\pi$.`,
    },
    {
      id: 'ydse-bright-to-dark',
      d: 1,
      t: ['Young double slit'],
      q: tex`In Young's double-slit experiment the fringe spacing is $\beta$. The distance between the centre of a bright fringe and the centre of the next dark fringe is:`,
      a: tex`$\frac{\beta}{2}$`,
      x: [tex`$\beta$`, tex`$2\beta$`, tex`$\frac{\beta}{4}$`],
      e: tex`Bright fringes lie at $y = m\beta$ and dark fringes at $y = (m + \frac{1}{2})\beta$, so each dark fringe lies midway between two bright fringes, at a distance $\frac{\beta}{2}$ from each.`,
    },
    {
      id: 'ydse-one-slit-covered',
      d: 2,
      t: ['Young double slit', 'interference'],
      q: "In Young's double-slit experiment, one of the two slits is covered with an opaque sheet. On the screen:",
      a: 'the interference fringes disappear and only the diffraction pattern of the open slit is seen',
      x: [
        'the fringe spacing is doubled',
        'the fringe spacing is halved',
        'the same fringes are seen, only less bright',
      ],
      e: 'Interference needs two coherent sources. With one slit covered there is only one source, so there is no superposition of two waves and the equally spaced interference fringes vanish. The screen shows the broad diffraction pattern of the single open slit: a wide central bright band with fainter bands on either side.',
    },
  ]),

  // -------------------------------------------------------------------------
  // Thin films and Newton's rings
  // -------------------------------------------------------------------------
  b.dynamic('thin-film-min-thickness', { difficulty: 3, tags: ['thin films'] }, (r) => {
    const { n, t, lambda, bright } = r.pick(FILM_CASES);
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: bright
        ? [lambda / (2 * n), lambda / 4, (n * lambda) / 4] // ignored the phase change, forgot n, multiplied by n
        : [lambda / (4 * n), lambda / 2, lambda / n], // swapped the conditions, forgot n, forgot the round trip
      format: (x) => q$(x, U.nm),
    });
    const phase = tex`Reflection at the front (air-to-film) surface adds a phase change of $\pi$, equivalent to an extra path of $\frac{\lambda}{2}$; reflection at the back (film-to-air) surface adds none.`;
    return {
      stem: bright
        ? tex`A thin transparent film of refractive index $${num(n)}$ is surrounded by air and illuminated normally with light of wavelength $${qty(lambda, U.nm)}$. The minimum thickness of the film for which it appears bright in reflected light is:`
        : tex`A thin transparent film of refractive index $${num(n)}$ is surrounded by air and illuminated normally with light of wavelength $${qty(lambda, U.nm)}$. The smallest non-zero thickness of the film for which it appears dark in reflected light is:`,
      answer,
      distractors,
      explanation: bright
        ? tex`${phase} The reflected waves reinforce when $2nt = (m + \frac{1}{2})\lambda$. For the thinnest film ($m = 0$): $t = \frac{\lambda}{4n} = \frac{${lambda}}{4 \times ${num(n)}} = ${t}\,\mathrm{nm}$.`
        : tex`${phase} The reflected waves cancel when $2nt = m\lambda$. The smallest non-zero thickness ($m = 1$) is $t = \frac{\lambda}{2n} = \frac{${lambda}}{2 \times ${num(n)}} = ${t}\,\mathrm{nm}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'oil-film-colours',
      d: 1,
      o: 'past-paper',
      t: ['thin films'],
      q: 'The brilliant colours seen in a thin film of oil spread on water are due to:',
      a: 'interference of light',
      x: ['dispersion of light', 'diffraction of light', 'polarization of light'],
      e: 'Light reflected from the upper (air-oil) and lower (oil-water) surfaces of the film interferes. The path difference depends on the local thickness of the film, so different wavelengths are reinforced at different places and the film shows colours.',
    },
    {
      id: 'soap-film-black',
      d: 3,
      t: ['thin films'],
      q: 'A soap film in air, viewed by reflected white light, looks black just before it bursts. This is because:',
      a: tex`its thickness is negligible, so the $\pi$ phase change on reflection makes the waves cancel`,
      x: [
        'it becomes so thick that the two reflected waves are no longer coherent',
        'the soap solution then absorbs every wavelength of visible light',
        'the two reflected waves then have a path difference of one wavelength',
      ],
      e: tex`Reflection at the front (air-to-soap) surface adds a phase change of $\pi$; reflection at the back (soap-to-air) surface does not. Just before bursting the film is far thinner than the wavelength, so the extra path $2nt \approx 0$ and the only phase difference left is $\pi$. The reflected waves cancel for every colour and the film looks black.`,
    },
    {
      id: 'newton-rings-dark-centre',
      d: 2,
      o: 'past-paper',
      t: ['Newton rings'],
      q: "In Newton's rings seen by reflected light, the central spot (where the lens touches the glass plate) is dark because:",
      a: tex`the wave reflected from the glass plate undergoes a phase change of $\pi$`,
      x: [
        'the air film is thickest at the point of contact',
        'the two reflected waves differ in path by one wavelength',
        'the lens absorbs all the light at the point of contact',
      ],
      e: tex`At the point of contact the air film has zero thickness, so the geometric path difference is zero. The wave reflected at the top of the plate (air to glass, rarer to denser) undergoes a phase change of $\pi$, equivalent to an extra path of $\frac{\lambda}{2}$, while the wave reflected at the lower surface of the lens (glass to air) does not. The two waves are in antiphase and cancel, so the centre is dark.`,
    },
    {
      id: 'newton-rings-circular',
      d: 2,
      t: ['Newton rings'],
      q: "Newton's rings are circular in shape because:",
      a: 'the air film has the same thickness all along circles centred on the point of contact',
      x: [
        'the light source used to illuminate the lens is circular',
        'light is diffracted at the circular rim of the lens',
        'the glass plate on which the lens rests is circular',
      ],
      e: 'Each ring joins points where the air film between the curved lens surface and the flat plate has the same thickness, so the path difference is the same all round it. Because the lens surface is spherical, these loci are circles centred on the point of contact; the shapes of the source, the rim or the plate play no part.',
    },
  ]),

  // -------------------------------------------------------------------------
  // Diffraction: grating and X-ray (Bragg) diffraction
  // -------------------------------------------------------------------------
  b.dynamic('grating-wavelength-lines', { difficulty: 2, origin: 'past-paper', tags: ['diffraction grating'] }, (r) => {
    const { lines, n, lambda, s } = r.pick(r.chance(0.35) ? GRATING_AT_30 : GRATING);
    const at30 = s === 0.5;
    const where = at30
      ? tex`is observed at $30^{\circ}$ to the normal`
      : tex`is observed at an angle $\theta$ to the normal, where $\sin\theta = ${num(s)}$`;
    const sinTex = at30 ? '\\sin 30^{\\circ}' : '\\sin\\theta';
    const lm = sci(lambda * 1e-9);
    if (r.chance(0.6)) {
      const density = gratingDensity(lines, lines % 10 === 0 && r.chance(0.3));
      const { answer, distractors } = numericOptions(r, {
        correct: lambda,
        wrong: [
          n * lambda, // forgot to divide by the order
          2 * lambda, // used 2d sin(theta) = n lambda (Bragg's law)
          at30 ? lambda * Math.sqrt(3) : NaN, // used cos 30 instead of sin 30
          lambda / 2,
        ],
        format: (x) => q$(Math.round(x), U.nm),
      });
      return {
        stem: tex`A diffraction grating has ${density.text}. When monochromatic light falls normally on it, the ${ordinal(n)}-order maximum ${where}. The wavelength of the light is:`,
        answer,
        distractors,
        explanation: tex`Grating element $${density.dWork}$. From $d\sin\theta = n\lambda$: $\lambda = \frac{d${sinTex}}{n} = \frac{(${sci(0.01 / lines)})(${num(s)})}{${n}} = ${lm}\,\mathrm{m} = ${lambda}\,\mathrm{nm}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: lines,
      wrong: [n * lines, 2 * lines, lines / 2, 10 * lines, lines / 10], // forgot n, Bragg factor 2, unit slips
      format: (x) => `$${num(x)}$`,
    });
    return {
      stem: tex`Monochromatic light of wavelength $${qty(lambda, U.nm)}$ falls normally on a diffraction grating, and the ${ordinal(n)}-order maximum ${where}. The number of lines per centimetre on the grating is:`,
      answer,
      distractors,
      explanation: tex`From $d\sin\theta = n\lambda$: $d = \frac{n\lambda}{${sinTex}} = \frac{${n} \times ${lm}}{${num(s)}} = ${sci(0.01 / lines)}\,\mathrm{m} = ${sci(1 / lines)}\,\mathrm{cm}$. Number of lines per cm $= \frac{1}{d} = ${lines}$.`,
    };
  }),

  b.dynamic('grating-highest-order', { difficulty: 2, origin: 'past-paper', tags: ['diffraction grating'] }, (r) => {
    const { lines, lambda, ratio, nmax } = r.pick(MAX_ORDER);
    const density = gratingDensity(lines, lines % 10 === 0 && r.chance(0.3));
    const { answer, distractors } = numericOptions(r, {
      correct: nmax,
      wrong: [nmax + 1, 2 * nmax + 1, nmax - 1, nmax + 2], // rounded up, counted all maxima, ...
      format: (x) => `$${x}$`,
    });
    return {
      stem: tex`Monochromatic light of wavelength $${qty(lambda, U.nm)}$ falls normally on a diffraction grating having ${density.text}. The highest order of the spectrum that can be observed is:`,
      answer,
      distractors,
      explanation: tex`Grating element $${density.dWork}$. Since $\sin\theta \le 1$, the condition $d\sin\theta = n\lambda$ requires $n \le \frac{d}{\lambda} = \frac{${sci(0.01 / lines)}}{${sci(lambda * 1e-9)}} ${exact3(ratio) ? '=' : '\\approx'} ${num(ratio)}$. The order must be a whole number, so the highest order that can be observed is $${nmax}$.`,
    };
  }),

  b.dynamic('bragg-x-ray-diffraction', { difficulty: 2, tags: ['diffraction grating'] }, (r) => {
    const { lambda, n, s, d } = r.pick(BRAGG);
    const angle =
      s === 0.5 ? tex`a glancing angle of $30^{\circ}$` : tex`a glancing angle $\theta$ for which $\sin\theta = ${num(s)}$`;
    const order = `${ordinal(n)}-order`;
    // Taking theta from the normal instead of the planes swaps sin for cos (no glancing angle here is 45 degrees).
    const cos = Math.sqrt(1 - s * s);
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: d,
        // forgot the 2, used cos, ignored the order, put the 2 on the wrong side
        wrong: [(n * lambda) / s, (n * lambda) / (2 * cos), lambda / (2 * s), (n * lambda) / (4 * s)],
        format: (x) => q$(x, U.nm),
      });
      return {
        stem: tex`X-rays of wavelength $${qty(lambda, U.nm)}$ are reflected from a set of parallel atomic planes in a crystal. The ${order} Bragg reflection occurs at ${angle}. The spacing between the planes is:`,
        answer,
        distractors,
        explanation: tex`Bragg's law: $2d\sin\theta = n\lambda$, so $d = \frac{n\lambda}{2\sin\theta} = \frac{${n} \times ${num(lambda)}}{2 \times ${num(s)}} = ${num(d)}\,\mathrm{nm}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: lambda,
      // forgot the 2, used cos, ignored the order, put the 2 on the wrong side
      wrong: [(d * s) / n, (2 * d * cos) / n, 2 * d * s, (d * s) / (2 * n)],
      format: (x) => q$(x, U.nm),
    });
    return {
      stem: tex`The spacing between adjacent atomic planes of a crystal is $${qty(d, U.nm)}$. X-rays falling on these planes give a ${order} Bragg reflection at ${angle}. The wavelength of the X-rays is:`,
      answer,
      distractors,
      explanation: tex`Bragg's law: $2d\sin\theta = n\lambda$, so $\lambda = \frac{2d\sin\theta}{n} = \frac{2 \times ${num(d)} \times ${num(s)}}{${n}} = ${num(lambda)}\,\mathrm{nm}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'grating-red-deviates-most',
      d: 3,
      t: ['diffraction grating'],
      q: 'White light falls normally on a diffraction grating. In the first-order spectrum, the colour deviated most from the direction of the incident light is:',
      a: 'red',
      x: ['violet', 'blue', 'green'],
      e: tex`For a grating $d\sin\theta = n\lambda$, so in a given order $\sin\theta \propto \lambda$. Red light has the longest wavelength in the visible spectrum and is diffracted through the largest angle. (A prism does the opposite: there violet is deviated most.)`,
    },
    {
      id: 'diffraction-slit-width',
      d: 1,
      t: ['diffraction grating'],
      q: 'The diffraction of light passing through a slit is most noticeable when the width of the slit is:',
      a: 'comparable to the wavelength of the light',
      x: [
        'much larger than the wavelength of the light',
        'much larger than the distance from the slit to the screen',
        'about one centimetre, whatever the wavelength',
      ],
      e: 'Light bends appreciably into the geometrical shadow only when the opening is of the order of its wavelength. Through a slit many wavelengths wide the spreading is negligible and light appears to travel in straight lines; because visible wavelengths (about 400 to 700 nm) are so small, the diffraction of light is seldom noticed in everyday life.',
    },
    {
      id: 'single-slit-narrower',
      d: 1,
      t: ['diffraction grating'],
      q: 'In the diffraction of monochromatic light by a single narrow slit, if the width of the slit is reduced, the central bright band:',
      a: 'becomes wider',
      x: ['becomes narrower', 'keeps the same width', 'disappears completely'],
      e: tex`The first minima on either side of the centre lie where $a\sin\theta = \lambda$ ($a$ = slit width). Reducing $a$ increases $\sin\theta = \frac{\lambda}{a}$, so the minima move outwards and the central bright band spreads out: the narrower the slit, the greater the diffraction.`,
    },
    {
      id: 'x-ray-crystal-grating',
      d: 2,
      t: ['diffraction grating'],
      q: 'A crystal acts as a diffraction grating for X-rays but not for visible light because:',
      a: 'the spacing of its atomic planes is comparable to the wavelength of X-rays',
      x: [
        'X-rays have a lower frequency than visible light',
        'X-rays are longitudinal waves while light is transverse',
        'visible light cannot pass into any crystal',
      ],
      e: tex`Noticeable diffraction needs a grating spacing comparable to the wavelength. The spacing of atomic planes in a crystal is about $10^{-10}\,\mathrm{m}$, similar to X-ray wavelengths, whereas visible light ($\approx 5 \times 10^{-7}\,\mathrm{m}$) is thousands of times longer. So the regular array of atoms diffracts X-rays according to Bragg's law, $2d\sin\theta = n\lambda$, but not light.`,
    },
  ]),

  // -------------------------------------------------------------------------
  // Polarization
  // -------------------------------------------------------------------------
  b.dynamic('polaroid-intensity', { difficulty: 2, tags: ['polarization'] }, (r) => {
    const unpolarized = r.chance(0.6);
    const findAngle = r.chance(0.3);
    const theta = unpolarized && !findAngle ? r.pick([30, 45, 60, 90]) : r.pick([30, 45, 60]);
    const cos2 = COS2[theta];
    const sin2 = SIN2[theta];
    const half = frac(1, 2);
    const result = unpolarized ? half.mul(cos2) : cos2;
    if (findAngle) {
      const answer = `$${theta}^{\\circ}$`;
      const setUp = unpolarized
        ? tex`The first polaroid passes half of the unpolarized light, $\frac{I_0}{2}$; by Malus's law $\frac{I_0}{2}\cos^2\theta = ${intensityTex(result)}$`
        : tex`By Malus's law $I_0\cos^2\theta = ${intensityTex(result)}$`;
      return {
        stem: unpolarized
          ? tex`Unpolarized light of intensity $I_0$ passes through two ideal polaroids placed one behind the other. If the intensity of the light emerging from the second polaroid is $${intensityTex(result)}$, the angle between their transmission axes is:`
          : tex`Plane-polarized light of intensity $I_0$ falls on an ideal polaroid and the transmitted intensity is $${intensityTex(result)}$. The angle between the transmission axis and the direction of vibration (electric field) of the incident light is:`,
        answer,
        distractors: pickDistractors(answer, [30, 45, 60, 90].map((a) => `$${a}^{\\circ}$`)),
        explanation: tex`${setUp}, so $\cos^2\theta = ${cos2.toTex()}$, $\cos\theta = ${COS_EXACT[theta]}$ and $\theta = ${theta}^{\circ}$.`,
      };
    }
    const answer = `$${intensityTex(result)}$`;
    const fallback = [frac(1, 2), frac(1, 4), frac(1, 8), frac(1), frac(3, 8)].map((f) => `$${intensityTex(f)}$`);
    const candidates = unpolarized
      ? [
          `$${intensityTex(cos2)}$`, // forgot that the first polaroid halves unpolarized light
          `$${intensityTex(half.mul(sin2))}$`, // used sin^2 instead of cos^2
          `$${HALF_COS_ONCE[theta]}$`, // forgot to square the cosine
          ...fallback,
        ]
      : [
          `$${intensityTex(half.mul(cos2))}$`, // halved as if the light were unpolarized
          `$${intensityTex(sin2)}$`, // used sin^2 instead of cos^2
          `$${COS_ONCE[theta]}$`, // forgot to square the cosine
          ...fallback,
        ];
    return {
      stem: unpolarized
        ? tex`Unpolarized light of intensity $I_0$ passes through two ideal polaroids whose transmission axes are inclined at $${theta}^{\circ}$ to each other. The intensity of the light emerging from the second polaroid is:`
        : tex`Plane-polarized light of intensity $I_0$ falls on an ideal polaroid whose transmission axis makes an angle of $${theta}^{\circ}$ with the direction of vibration (electric field) of the light. The intensity of the transmitted light is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: unpolarized
        ? tex`An ideal polaroid transmits half the intensity of unpolarized light, so $I_1 = \frac{I_0}{2}$. By Malus's law the second polaroid transmits $I = I_1\cos^2\theta = \frac{I_0}{2}\cos^2 ${theta}^{\circ} = \frac{I_0}{2} \times ${cos2.toTex()} = ${intensityTex(result)}$.`
        : tex`By Malus's law, $I = I_0\cos^2\theta = I_0\cos^2 ${theta}^{\circ} = I_0 \times ${cos2.toTex()} = ${intensityTex(result)}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'polarization-transverse',
      d: 1,
      o: 'past-paper',
      t: ['polarization'],
      q: 'The polarization of light shows that light waves are:',
      a: 'transverse',
      x: ['longitudinal', 'stationary', 'mechanical'],
      e: 'Only a transverse wave, whose vibrations are perpendicular to its direction of travel, can have its vibrations confined to a single plane. Light can be polarized, so it is a transverse wave; longitudinal waves such as sound cannot be polarized.',
    },
    {
      id: 'sound-not-polarized',
      d: 1,
      o: 'past-paper',
      t: ['polarization'],
      q: 'Which of the following waves cannot be polarized?',
      a: 'sound waves in air',
      x: ['radio waves', 'X-rays', 'microwaves'],
      e: 'Only transverse waves can be polarized. Radio waves, microwaves and X-rays are electromagnetic (transverse) waves, but sound waves in air are longitudinal: the air particles vibrate along the direction of travel, so there is no transverse vibration for a polarizer to select.',
    },
    {
      id: 'optical-activity',
      d: 1,
      t: ['polarization'],
      q: 'When plane-polarized light passes through a sugar solution, its plane of vibration is rotated. This property of the solution is called:',
      a: 'optical activity',
      x: ['double refraction', 'dispersion', 'total internal reflection'],
      e: 'Substances such as sugar solution and quartz rotate the plane of vibration of plane-polarized light passing through them; they are optically active and the effect is called optical activity (optical rotation). The angle of rotation is used, for example, to measure the concentration of a sugar solution.',
    },
  ]),
]);
