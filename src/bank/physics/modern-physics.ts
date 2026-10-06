import { defineBank } from '@/engine/authoring';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';
import { num, numericOptions, pickDistractors, q$, qty, sci, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const PM = 'pm';
const NM = 'nm';

/** One decimal place, trailing zero kept (2.0 eV, 3.4 eV). */
const dp1 = { dp: 1, keepZeros: true } as const;

/** LaTeX for `sym` multiplied by n^e, e.g. 2\lambda, \frac{\lambda}{3}, \frac{\lambda}{\sqrt{2}}. */
function scaledTex(sym: string, n: number, e: number): string {
  const v = n ** e;
  if (Math.abs(v - 1) < 1e-9) return sym;
  const iv = Math.round(v);
  if (Math.abs(v - iv) < 1e-9) return `${iv}${sym}`;
  const inv = Math.round(1 / v);
  if (Math.abs(1 / v - inv) < 1e-9) return `\\frac{${sym}}{${inv}}`;
  if (e === 0.5) return `\\sqrt{${n}}\\,${sym}`;
  if (e === -0.5) return `\\frac{${sym}}{\\sqrt{${n}}}`;
  throw new Error(`scaledTex: unsupported factor ${n}^${e}`);
}

const scaledOpt = (sym: string, n: number, e: number): string => `$${scaledTex(sym, n, e)}$`;

const INCREASE: Readonly<Record<number, string>> = {
  2: 'doubled',
  3: 'tripled',
  4: 'made four times as large',
  9: 'made nine times as large',
  16: 'made sixteen times as large',
};
const DECREASE: Readonly<Record<number, string>> = {
  2: 'halved',
  3: 'reduced to one-third',
  4: 'reduced to one-fourth',
};

interface ScalingCase {
  ns: readonly number[];
  /** Exponent of the change factor in the answer. */
  e: number;
  /** Exponents giving wrong answers (from typical slips). */
  wrong: readonly number[];
  sym: string;
  stem: (n: number) => string;
  why: string;
}

/** Builds a proportional-reasoning MCQ from a scaling case. */
function scalingQuestion(r: Rng, c: ScalingCase): AuthoredQuestion {
  const n = r.pick(c.ns);
  const answer = scaledOpt(c.sym, n, c.e);
  const distractors = pickDistractors(
    answer,
    c.wrong.map((w) => scaledOpt(c.sym, n, w)),
    r,
  );
  return {
    stem: c.stem(n),
    answer,
    distractors,
    explanation: `${c.why} The quantity therefore becomes ${answer}.`,
  };
}

// ---------------------------------------------------------------------------
// Parameter tables (exact answers)
// ---------------------------------------------------------------------------

/** Work function (eV) and threshold wavelength (nm) with hc = 1240 eV nm. */
const THRESHOLD_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1.24, 1000], [1.55, 800], [1.6, 775], [2, 620], [2.48, 500], [2.5, 496],
  [3.1, 400], [4, 310], [4.96, 250], [5, 248], [6.2, 200],
];

/** Speeds as fractions of c, with sqrt(1 - v^2/c^2) = a/b. */
const SPEEDS: ReadonlyArray<{ v: string; a: number; b: number; kMax: number }> = [
  { v: '0.6', a: 4, b: 5, kMax: 12 },
  { v: '0.8', a: 3, b: 5, kMax: 15 },
  { v: '0.28', a: 24, b: 25, kMax: 3 },
  { v: '0.96', a: 7, b: 25, kMax: 6 },
];

/** Mass mantissa (x 1e-27 kg) and speed (x 1e3 m/s) giving a clean de Broglie wavelength with h = 6.6e-34. */
const DB_CASES = (() => {
  const out: Array<{ a: number; b: number; lam: number }> = [];
  for (const a of [1.1, 1.32, 1.65, 2.2, 3.3, 6.6]) {
    for (let b = 1; b <= 10; b++) {
      const m = 6.6 / (a * b);
      const scaled = m * 100;
      if (Math.abs(scaled - Math.round(scaled)) < 1e-9) out.push({ a, b, lam: Math.round(scaled) / 100 });
    }
  }
  return out;
})();

/** Black-body temperatures (K) with lambda_max = 2.9e-3 / T a clean number of nm. */
const WIEN_TEMPS: readonly number[] = [1000, 1450, 2000, 2500, 2900, 4000, 5000, 5800, 7250, 10000];

/** Celsius heating pairs whose kelvin ratio is an integer. */
const CELSIUS_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [27, 327], [127, 527], [27, 627], [227, 727], [127, 927], [77, 427],
];

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('physics', 'modern-physics', (b) => [
  // ---------------- Photoelectric effect ----------------
  b.dynamic('photoelectric-energy-balance', { difficulty: 1, origin: 'past-paper', tags: ['photoelectric effect'] }, (r) => {
    const phiT = r.pick([18, 20, 21, 23, 25, 28, 30, 32, 42, 45, 47, 50]); // tenths of eV
    const kT = r.intExcept(5, 40, [phiT]);
    const eT = phiT + kT;
    const phi = phiT / 10;
    const k = kT / 10;
    const E = eT / 10;
    const mode = r.pick(['kmax', 'stopping', 'work'] as const);
    if (mode === 'work') {
      const { answer, distractors } = numericOptions(r, {
        correct: phi,
        wrong: [E + k, E, k],
        format: (x) => q$(num(x, dp1), U.eV),
        fallback: 'offset',
      });
      return {
        stem: tex`Photons of energy $${qty(num(E, dp1), U.eV)}$ eject electrons from a metal surface with a maximum kinetic energy of $${qty(num(k, dp1), U.eV)}$. The work function of the metal is:`,
        answer,
        distractors,
        explanation: tex`Einstein's equation: $hf = \phi + K_{\max}$, so $\phi = hf - K_{\max} = ${num(E, dp1)} - ${num(k, dp1)} = ${num(phi, dp1)}\,\mathrm{eV}$.`,
      };
    }
    const stopping = mode === 'stopping';
    const unit = stopping ? U.V : U.eV;
    const { answer, distractors } = numericOptions(r, {
      correct: k,
      wrong: [E + phi, E, phi],
      format: (x) => q$(num(x, dp1), unit),
      fallback: 'offset',
    });
    return {
      stem: stopping
        ? tex`Light whose photons each carry $${qty(num(E, dp1), U.eV)}$ falls on a metal of work function $${qty(num(phi, dp1), U.eV)}$. The stopping potential is:`
        : tex`Photons of energy $${qty(num(E, dp1), U.eV)}$ fall on a metal surface of work function $${qty(num(phi, dp1), U.eV)}$. The maximum kinetic energy of the emitted photoelectrons is:`,
      answer,
      distractors,
      explanation: stopping
        ? tex`$eV_0 = K_{\max} = hf - \phi = ${num(E, dp1)} - ${num(phi, dp1)} = ${num(k, dp1)}\,\mathrm{eV}$, so $V_0 = ${num(k, dp1)}\,\mathrm{V}$.`
        : tex`$K_{\max} = hf - \phi = ${num(E, dp1)} - ${num(phi, dp1)} = ${num(k, dp1)}\,\mathrm{eV}$.`,
    };
  }),

  b.dynamic('threshold-wavelength', { difficulty: 2, origin: 'past-paper', tags: ['photoelectric effect'] }, (r) => {
    const [phi, lam] = r.pick(THRESHOLD_PAIRS);
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: lam,
        wrong: [10 * lam, lam / 2, 2 * lam],
        format: (x) => q$(x, NM),
      });
      return {
        stem: tex`The work function of a metal is $${qty(phi, U.eV)}$. Taking $hc = 1240\,\mathrm{eV\,nm}$, its threshold wavelength is:`,
        answer,
        distractors,
        explanation: tex`$\lambda_0 = \dfrac{hc}{\phi} = \dfrac{1240\,\mathrm{eV\,nm}}{${num(phi)}\,\mathrm{eV}} = ${num(lam)}\,\mathrm{nm}$. Longer wavelengths cannot eject electrons.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: phi,
      wrong: [2 * phi, phi / 2, 10 * phi],
      format: (x) => q$(x, U.eV),
    });
    return {
      stem: tex`The threshold wavelength for photoelectric emission from a metal is $${qty(lam, NM)}$. Taking $hc = 1240\,\mathrm{eV\,nm}$, the work function of the metal is:`,
      answer,
      distractors,
      explanation: tex`$\phi = \dfrac{hc}{\lambda_0} = \dfrac{1240\,\mathrm{eV\,nm}}{${num(lam)}\,\mathrm{nm}} = ${num(phi)}\,\mathrm{eV}$.`,
    };
  }),

  b.dynamic('photoelectric-statements', { difficulty: 1, tags: ['photoelectric effect'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about the photoelectric effect is correct?',
      negativeStem: 'Which statement about the photoelectric effect is NOT correct?',
      truths: [
        'The maximum kinetic energy of photoelectrons increases linearly with the frequency of the light.',
        'No electrons are emitted below the threshold frequency, however intense the light is.',
        'Emission of photoelectrons begins without any noticeable time delay.',
        'Above the threshold frequency, the number of photoelectrons emitted per second increases with the intensity of the light.',
        'The stopping potential does not depend on the intensity of the light.',
      ],
      falsehoods: [
        'The maximum kinetic energy of photoelectrons increases with the intensity of the light.',
        'Light of any frequency can eject electrons if it is intense enough.',
        'The photoelectric effect is fully explained by the classical wave theory of light.',
        'Emission begins only after the metal has absorbed light for some time.',
        'The threshold frequency is the same for all metals.',
      ],
      explain: (answer, inverted) =>
        tex`Einstein's equation $hf = \phi + K_{\max}$: each electron absorbs one photon, so $K_{\max}$ (and $V_0$) depends only on the frequency (a straight-line graph), emission is instantaneous and needs $f \ge f_0 = \phi/h$, which differs from metal to metal. Intensity only changes the number of photons, hence the number of electrons per second. The classical wave theory cannot explain these facts. ` +
        (inverted ? `The incorrect statement is: "${answer}"` : `The correct statement is: "${answer}"`),
    }),
  ),

  ...b.mcqs([
    {
      id: 'kmax-frequency-graph-slope', d: 2, t: ['photoelectric effect'],
      q: 'A graph of the maximum kinetic energy of photoelectrons in joules (vertical axis) against the frequency of the incident light (horizontal axis) is a straight line. Its slope is equal to:',
      a: "Planck's constant $h$",
      x: ['the work function of the metal', 'the threshold frequency of the metal', "the reciprocal of Planck's constant, $1/h$"],
      e: tex`$K_{\max} = hf - \phi$ has the form $y = mx + c$ with slope $h$ (the same for every metal); the intercept on the frequency axis is $f_0$ and the intercept on the energy axis is $-\phi$. (A graph of stopping potential against frequency would instead have slope $h/e$.)`,
    },
  ]),

  // ---------------- Black-body radiation ----------------
  b.dynamic('radiation-scaling', { difficulty: 2, origin: 'past-paper', tags: ['black-body radiation'] }, (r) => {
    const law = r.pick(['stefan', 'wien'] as const);
    const celsius = r.chance(0.4);
    let change: string;
    let n: number;
    let convert = '';
    if (celsius) {
      const [c1, c2] = r.pick(CELSIUS_PAIRS);
      const t1 = c1 + 273;
      const t2 = c2 + 273;
      n = t2 / t1;
      change = tex`A black body is heated from $${c1}^{\circ}\mathrm{C}$ to $${c2}^{\circ}\mathrm{C}$.`;
      convert = tex`In kelvin the temperature rises from $${t1}\,\mathrm{K}$ to $${t2}\,\mathrm{K}$, a factor of $${n}$. `;
    } else {
      n = r.pick([2, 3]);
      change = `The absolute temperature of a black body is ${INCREASE[n] ?? ''}.`;
    }
    if (law === 'stefan') {
      return scalingQuestion(r, {
        ns: [n],
        e: 4,
        wrong: [2, 1, 3],
        sym: 'P',
        stem: () => `${change} If it originally radiated power $P$, it now radiates:`,
        why: tex`${convert}By the Stefan-Boltzmann law $P = \sigma A T^4$, so $P \propto T^4$ and the power is multiplied by $${n}^4 = ${n ** 4}$.`,
      });
    }
    return scalingQuestion(r, {
      ns: [n],
      e: -1,
      wrong: [1, -2, -4, 0],
      sym: '\\lambda_{\\max}',
      stem: () => tex`${change} If its emission was originally strongest at wavelength $\lambda_{\max}$, the new wavelength of maximum emission is:`,
      why: tex`${convert}By Wien's displacement law $\lambda_{\max} T = \text{constant}$, so $\lambda_{\max} \propto 1/T$ and is divided by $${n}$.`,
    });
  }),

  b.dynamic('wien-numeric', { difficulty: 1, tags: ['black-body radiation'] }, (r) => {
    const T = r.pick(WIEN_TEMPS);
    const lam = 2.9e6 / T; // nm
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: lam,
        wrong: [10 * lam, lam / 10, 2 * lam],
        format: (x) => q$(x, NM),
      });
      return {
        stem: tex`A black body is at a temperature of $${qty(T, U.K)}$. Taking Wien's constant as $2.9 \times 10^{-3}\,\mathrm{m\,K}$, the wavelength at which it emits most strongly is:`,
        answer,
        distractors,
        explanation: tex`$\lambda_{\max} = \dfrac{2.9 \times 10^{-3}}{T} = \dfrac{2.9 \times 10^{-3}}{${T}} = ${sci(lam * 1e-9)}\,\mathrm{m} = ${num(lam)}\,\mathrm{nm}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: T,
      wrong: [10 * T, T / 10, T - 273],
      format: (x) => q$(x, U.K),
    });
    return {
      stem: tex`The radiation from a black body is most intense at a wavelength of $${qty(lam, NM)}$. Taking Wien's constant as $2.9 \times 10^{-3}\,\mathrm{m\,K}$, the temperature of the body is:`,
      answer,
      distractors,
      explanation: tex`$T = \dfrac{2.9 \times 10^{-3}}{\lambda_{\max}} = \dfrac{2.9 \times 10^{-3}}{${sci(lam * 1e-9)}} = ${num(T)}\,\mathrm{K}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'planck-quantum-hypothesis', d: 1, t: ['black-body radiation'],
      q: 'To explain the spectrum of black-body radiation, Planck assumed that radiant energy is:',
      a: 'emitted and absorbed in discrete packets of energy $hf$',
      x: [
        'emitted continuously in any amount at every frequency',
        'emitted only at the wavelength of maximum intensity',
        'emitted in packets whose energy is independent of frequency',
      ],
      e: tex`Planck proposed that an oscillator of frequency $f$ can emit or absorb energy only in whole quanta $E = hf$. Classical (continuous) emission led to the "ultraviolet catastrophe".`,
    },
    {
      id: 'heated-iron-colour', d: 1, t: ['black-body radiation'],
      q: 'A piece of iron heated in a furnace glows first dull red, then orange-yellow and finally white. This happens because, as the temperature rises, the peak of its emission spectrum:',
      a: 'shifts towards shorter wavelengths',
      x: [
        'shifts towards longer wavelengths',
        'stays at the same wavelength but grows taller',
        'stays at the same wavelength but becomes broader',
      ],
      e: tex`Wien's displacement law: $\lambda_{\max} T = \text{constant}$, so a hotter body has its peak at a shorter wavelength. More and more of the emitted light comes from the shorter-wavelength (blue) end of the visible spectrum, so the glow changes from red through orange and yellow to white.`,
    },
    {
      id: 'planck-constant-unit', d: 1, o: 'past-paper', t: ['black-body radiation'],
      q: "The SI unit of Planck's constant is:",
      a: tex`$\mathrm{J\,s}$`,
      x: [tex`$\mathrm{J\,s^{-1}}$`, tex`$\mathrm{kg\,m^{2}\,s^{-2}}$`, tex`$\mathrm{N\,s}$`],
      e: tex`$h = E/f$, so its unit is $\mathrm{J}/\mathrm{s^{-1}} = \mathrm{J\,s}$ (equivalently $\mathrm{kg\,m^{2}\,s^{-1}}$). $\mathrm{J\,s^{-1}}$ is the watt and $\mathrm{kg\,m^{2}\,s^{-2}}$ is the joule.`,
    },
  ]),

  // ---------------- Relativity ----------------
  b.dynamic('relativity-gamma', { difficulty: 2, origin: 'past-paper', tags: ['relativity'] }, (r) => {
    const s = r.pick(SPEEDS);
    const k = r.int(1, s.kMax);
    const what = r.pick(['time', 'length', 'mass'] as const);
    const root = tex`\sqrt{1 - v^2/c^2} = \sqrt{1 - (${s.v})^2} = ${num(s.a / s.b)}`;
    if (what === 'length') {
      const L0 = k * s.b;
      const L = k * s.a;
      const { answer, distractors } = numericOptions(r, {
        correct: L,
        wrong: [(L0 * s.b) / s.a, L0, (L0 * s.a * s.a) / (s.b * s.b)],
        format: (x) => q$(x, U.m),
      });
      return {
        stem: tex`A rod of proper length $${qty(L0, U.m)}$ moves along its own length at a speed of $${s.v}c$. Its length as measured by a stationary observer is:`,
        answer,
        distractors,
        explanation: tex`Length contraction: $L = L_0\sqrt{1 - v^2/c^2}$, with $${root}$. So $L = ${L0} \times ${num(s.a / s.b)} = ${num(L)}\,\mathrm{m}$.`,
      };
    }
    if (what === 'mass') {
      const m0 = k * s.a;
      const m = k * s.b;
      const { answer, distractors } = numericOptions(r, {
        correct: m,
        wrong: [(m0 * s.a) / s.b, m0, (m0 * s.b * s.b) / (s.a * s.a)],
        format: (x) => q$(x, U.kg),
      });
      return {
        stem: tex`A body has a rest mass of $${qty(m0, U.kg)}$. According to special relativity, its mass when moving at $${s.v}c$ is:`,
        answer,
        distractors,
        explanation: tex`$m = \dfrac{m_0}{\sqrt{1 - v^2/c^2}}$, with $${root}$. So $m = \dfrac{${m0}}{${num(s.a / s.b)}} = ${num(m)}\,\mathrm{kg}$.`,
      };
    }
    const t0 = k * s.a;
    const t = k * s.b;
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: [(t0 * s.a) / s.b, t0, (t0 * s.b * s.b) / (s.a * s.a)],
      format: (x) => q$(x, 's'),
    });
    return {
      stem: tex`A clock on a spaceship moving past the Earth at $${s.v}c$ records a time interval of $${qty(t0, 's')}$. The same interval measured by an observer on the Earth is:`,
      answer,
      distractors,
      explanation: tex`Time dilation: $t = \dfrac{t_0}{\sqrt{1 - v^2/c^2}}$, with $${root}$. So $t = \dfrac{${t0}}{${num(s.a / s.b)}} = ${num(t)}\,\mathrm{s}$; moving clocks run slow.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'invariant-speed-of-light', d: 1, t: ['relativity'],
      q: 'According to the special theory of relativity, which quantity has the same value for all inertial observers?',
      a: 'the speed of light in free space',
      x: ['the length of a moving rod', 'the time interval between two events', 'the mass of a moving body'],
      e: 'The second postulate of special relativity states that the speed of light in free space is the same for all inertial observers. Length, time intervals and mass all depend on the relative speed of the observer.',
    },
    {
      id: 'cannot-reach-light-speed', d: 1, t: ['relativity'],
      q: 'A material body can never be accelerated to the speed of light because, as its speed approaches $c$, its:',
      a: 'mass increases without limit',
      x: ['rest mass falls to zero', 'length increases without limit', 'kinetic energy falls to zero'],
      e: tex`$m = m_0/\sqrt{1 - v^2/c^2}$ tends to infinity as $v \to c$, so an infinite force (or energy) would be needed. Length contracts rather than grows, and the rest mass does not change.`,
    },
  ]),

  // ---------------- Compton effect ----------------
  b.dynamic('compton-shift', { difficulty: 2, origin: 'past-paper', tags: ['Compton effect'] }, (r) => {
    const lc = 2.43;
    const angles: ReadonlyArray<readonly [number, number, string]> = [
      [60, 0.5, '\\tfrac{1}{2}'],
      [90, 1, '1'],
      [120, 1.5, '\\tfrac{3}{2}'],
      [180, 2, '2'],
    ];
    const [theta, f, fTex] = r.pick(angles);
    const shift = lc * f;
    const fmt = (x: number): string => q$(num(x, { dp: 3 }), PM);
    const others = angles.filter(([th]) => th !== theta).map(([, g]) => lc * g);
    const given = tex`Take $\dfrac{h}{m_e c} = ${qty(lc, PM)}$.`;
    const working = tex`$\Delta\lambda = \dfrac{h}{m_e c}(1 - \cos\theta) = ${lc}(1 - \cos ${theta}^{\circ}) = ${lc} \times ${fTex} = ${num(shift, { dp: 3 })}\,\mathrm{pm}$`;
    if (r.chance(0.5)) {
      return {
        stem: tex`X-rays are scattered by free electrons through an angle of $${theta}^{\circ}$. ${given} The Compton shift in wavelength is:`,
        answer: fmt(shift),
        distractors: others.map(fmt),
        explanation: tex`${working}.`,
      };
    }
    const lam = r.pick([10, 15, 20, 25, 30, 40, 50, 60, 70, 80]);
    const correct = lam + shift;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [lam - shift, lam, lam + others[0]!, lam + others[others.length - 1]!],
      format: fmt,
    });
    return {
      stem: tex`X-rays of wavelength $${qty(lam, PM)}$ are Compton-scattered by free electrons through $${theta}^{\circ}$. ${given} The wavelength of the scattered X-rays is:`,
      answer,
      distractors,
      explanation: tex`${working}. The scattered photon loses energy, so its wavelength increases: $\lambda' = ${lam} + ${num(shift, { dp: 3 })} = ${num(correct, { dp: 3 })}\,\mathrm{pm}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'compton-maximum-shift', d: 1, t: ['Compton effect'],
      q: 'The Compton shift in the wavelength of X-rays scattered by free electrons is greatest when the scattering angle is:',
      a: tex`$180^{\circ}$`,
      x: [tex`$90^{\circ}$`, tex`$45^{\circ}$`, tex`$0^{\circ}$`],
      e: tex`$\Delta\lambda = \dfrac{h}{m_e c}(1 - \cos\theta)$ is largest when $\cos\theta = -1$, i.e. $\theta = 180^{\circ}$ (back-scattering), giving $\Delta\lambda = 2h/(m_e c)$. At $0^{\circ}$ there is no shift.`,
    },
  ]),

  // ---------------- Pair production ----------------
  ...b.mcqs([
    {
      id: 'pair-production-threshold', d: 1, o: 'past-paper', t: ['pair production'],
      q: 'The minimum energy of a photon that can create an electron-positron pair is:',
      a: tex`$1.02\,\mathrm{MeV}$`,
      x: [tex`$0.51\,\mathrm{MeV}$`, tex`$2.04\,\mathrm{MeV}$`, tex`$931\,\mathrm{MeV}$`],
      e: tex`The photon must supply the rest energy of two particles: $E_{\min} = 2m_0c^2 = 2(0.51\,\mathrm{MeV}) = 1.02\,\mathrm{MeV}$. Any extra energy appears as kinetic energy of the pair.`,
    },
    {
      id: 'pair-production-needs-nucleus', d: 3, t: ['pair production'],
      q: 'A high-energy photon cannot create an electron-positron pair in empty space; pair production takes place near a heavy nucleus. The nucleus is needed because it:',
      a: 'takes up recoil momentum so that momentum is conserved',
      x: [
        'supplies the extra energy needed to create the pair',
        'supplies the positive charge carried away by the positron',
        'absorbs the photon before the pair is created',
      ],
      e: 'In empty space a single photon cannot turn into a pair while conserving both energy and momentum. A massive nucleus absorbs the excess momentum while taking almost no energy. Charge is conserved anyway, because the pair has zero net charge.',
    },
    {
      id: 'annihilation-two-photons', d: 3, t: ['pair production'],
      q: 'An electron and a positron, both practically at rest, annihilate each other. The radiation produced consists of:',
      a: tex`two photons of $0.51\,\mathrm{MeV}$ each, moving in opposite directions`,
      x: [
        tex`a single photon of $1.02\,\mathrm{MeV}$`,
        tex`two photons of $0.51\,\mathrm{MeV}$ each, moving in the same direction`,
        tex`two photons of $1.02\,\mathrm{MeV}$ each, moving in opposite directions`,
      ],
      e: tex`The initial momentum is zero, so at least two photons with equal and opposite momenta are needed (a single photon always carries momentum). Energy conservation shares $2m_0c^2 = 1.02\,\mathrm{MeV}$ equally: $0.51\,\mathrm{MeV}$ each.`,
    },
  ]),

  // ---------------- de Broglie waves and uncertainty ----------------
  b.dynamic('de-broglie-wavelength', { difficulty: 2, tags: ['de Broglie waves'] }, (r) => {
    const c = r.pick(DB_CASES);
    const v = c.b * 1000;
    const lam = c.lam * 1e-10;
    const { answer, distractors } = numericOptions(r, {
      correct: lam,
      wrong: [lam / 2, 2 * lam, 10 * lam, lam / 10],
      format: (x) => q$(x, U.m),
    });
    return {
      stem: tex`A particle of mass $${num(c.a)} \times 10^{-27}\,\mathrm{kg}$ moves with a speed of $${qty(v, U.mps)}$. Taking $h = 6.6 \times 10^{-34}\,\mathrm{J\,s}$, its de Broglie wavelength is:`,
      answer,
      distractors,
      explanation: tex`$\lambda = \dfrac{h}{mv} = \dfrac{6.6 \times 10^{-34}}{(${num(c.a)} \times 10^{-27})(${v})} = ${sci(lam)}\,\mathrm{m}$.`,
    };
  }),

  b.dynamic('quantum-scaling', { difficulty: 2, tags: ['de Broglie waves', 'uncertainty principle', 'photoelectric effect'] }, (r) => {
    const cases: readonly ScalingCase[] = [
      {
        ns: [2, 3, 4], e: -1, wrong: [1, -2, 2, -0.5], sym: '\\lambda',
        stem: (n) => `The momentum of a particle is ${INCREASE[n] ?? ''}. Its de Broglie wavelength, originally $\\lambda$, becomes:`,
        why: tex`$\lambda = h/p$, so $\lambda \propto 1/p$.`,
      },
      {
        ns: [2, 3, 4], e: -1, wrong: [1, -2, 2, -0.5], sym: '\\lambda',
        stem: (n) => `The speed of a slow-moving electron is ${INCREASE[n] ?? ''}. Its de Broglie wavelength, originally $\\lambda$, becomes:`,
        why: tex`$\lambda = h/(mv)$, so for a fixed mass $\lambda \propto 1/v$.`,
      },
      {
        ns: [2, 4, 9, 16], e: -0.5, wrong: [-1, 0.5, 1, -2], sym: '\\lambda',
        stem: (n) => `The kinetic energy of a non-relativistic particle is ${INCREASE[n] ?? ''}. Its de Broglie wavelength, originally $\\lambda$, becomes:`,
        why: tex`$p = \sqrt{2mK}$, so $\lambda = h/\sqrt{2mK} \propto 1/\sqrt{K}$.`,
      },
      {
        ns: [2, 4, 9], e: -0.5, wrong: [-1, 0.5, 1, -2], sym: '\\lambda',
        stem: (n) => `An electron is accelerated from rest through a potential difference $V$. If $V$ is ${INCREASE[n] ?? ''}, its de Broglie wavelength, originally $\\lambda$, becomes:`,
        why: tex`$K = eV$ and $\lambda = h/\sqrt{2meV} \propto 1/\sqrt{V}$.`,
      },
      {
        ns: [2, 3, 4], e: 1, wrong: [-1, 2, -2, 0.5], sym: 'E',
        stem: (n) => `The wavelength of a photon is ${DECREASE[n] ?? ''}. Its energy, originally $E$, becomes:`,
        why: tex`$E = hc/\lambda$, so $E \propto 1/\lambda$.`,
      },
      {
        ns: [2, 3], e: 1, wrong: [-1, 2, -2, 0], sym: 'p',
        stem: (n) => `The frequency of a photon is ${INCREASE[n] ?? ''}. Its momentum, originally $p$, becomes:`,
        why: tex`$p = h/\lambda = hf/c$, so $p \propto f$.`,
      },
      {
        ns: [2, 3, 4], e: 1, wrong: [-1, 2, -2, 0], sym: '\\Delta p',
        stem: (n) => `The uncertainty in the position of a particle is ${DECREASE[n] ?? ''}. The minimum uncertainty in its momentum, originally $\\Delta p$, becomes:`,
        why: tex`By the uncertainty principle $\Delta x\,\Delta p \approx h$, so the minimum $\Delta p \propto 1/\Delta x$.`,
      },
    ];
    return scalingQuestion(r, r.pick(cases));
  }),

  ...b.mcqs([
    {
      id: 'davisson-germer', d: 1, t: ['de Broglie waves'],
      q: 'The wave nature of moving electrons was confirmed experimentally by:',
      a: 'the diffraction of electrons by a crystal (Davisson and Germer)',
      x: [
        'the scattering of X-rays by free electrons (Compton)',
        'the emission of electrons from metals by light (photoelectric effect)',
        "the measurement of the electron's charge (Millikan's oil drop)",
      ],
      e: 'Davisson and Germer obtained diffraction maxima when an electron beam struck a nickel crystal, at angles that matched the de Broglie wavelength $h/p$. The Compton and photoelectric effects show the particle nature of light.',
    },
    {
      id: 'shortest-de-broglie-wavelength', d: 2, t: ['de Broglie waves'],
      q: 'An electron, a proton, a neutron and an alpha particle all move with the same speed. The one with the shortest de Broglie wavelength is the:',
      a: 'alpha particle',
      x: ['electron', 'proton', 'neutron'],
      e: tex`$\lambda = \dfrac{h}{mv}$; at equal speed the wavelength is inversely proportional to mass, so the most massive particle (the alpha particle, about $4$ times the proton mass) has the shortest wavelength and the electron the longest.`,
    },
    {
      id: 'exact-position-uncertainty', d: 2, t: ['uncertainty principle'],
      q: 'According to the uncertainty principle, if the position of an electron could be measured with zero uncertainty, its momentum would be:',
      a: 'completely uncertain',
      x: ['exactly zero', 'known exactly', 'equal to Planck\'s constant'],
      e: tex`$\Delta x\,\Delta p \approx h$: as $\Delta x \to 0$, $\Delta p \to \infty$, so nothing at all could be said about the momentum. Position and momentum cannot both be known precisely.`,
    },
  ]),
]);
