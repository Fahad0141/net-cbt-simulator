import { defineBank } from '@/engine/authoring';
import { gcd, num, numericOptions, pickDistractors, q$, qty, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers and data
// ---------------------------------------------------------------------------

/** Magnitude of the hydrogen level energy |E_n| = 13.6 / n^2 in eV (cleaned of float noise). */
const levelEV = (n: number): number => Number((13.6 / (n * n)).toPrecision(12));

/** Energy printed with up to five significant figures (13.056, 0.2125, ...). */
const ev$ = (x: number): string => q$(x, U.eV, { sig: 5 });

/** Ratio a : b reduced to lowest terms, as LaTeX. */
function ratioTex(a: number, b: number): string {
  const g = gcd(a, b);
  return `${a / g} : ${b / g}`;
}

/** n1^p : n2^p written with integers (negative p swaps the sides). */
function powerRatioTex(n1: number, n2: number, p: number): string {
  const k = Math.abs(p);
  return p >= 0 ? ratioTex(n1 ** k, n2 ** k) : ratioTex(n2 ** k, n1 ** k);
}

/** Hydrogen spectral series, indexed by the lower level. */
const SERIES: ReadonlyArray<{ name: string; low: number; region: string }> = [
  { name: 'Lyman', low: 1, region: 'ultraviolet' },
  { name: 'Balmer', low: 2, region: 'visible' },
  { name: 'Paschen', low: 3, region: 'infrared' },
  { name: 'Brackett', low: 4, region: 'infrared' },
  { name: 'Pfund', low: 5, region: 'infrared' },
];

/** Region distractors chosen so that none is even partly right for that series. */
const REGION_WRONG: Readonly<Record<string, readonly string[]>> = {
  ultraviolet: ['visible region', 'infrared region', 'microwave region'],
  visible: ['infrared region', 'X-ray region', 'microwave region'],
  infrared: ['ultraviolet region', 'visible region', 'X-ray region'],
};

/** Bohr-model quantities and how each scales with n. */
const BOHR_QUANTITIES: ReadonlyArray<{ name: string; p: number; law: string }> = [
  { name: 'radii of the orbits', p: 2, law: 'r_n = n^2 r_1 \\;\\Rightarrow\\; r \\propto n^2' },
  { name: 'orbital speeds of the electron in the orbits', p: -1, law: 'v_n = \\frac{v_1}{n} \\;\\Rightarrow\\; v \\propto \\frac{1}{n}' },
  {
    name: 'magnitudes of the total energy of the electron in the orbits',
    p: -2,
    law: '|E_n| = \\frac{13.6}{n^2}\\,\\mathrm{eV} \\;\\Rightarrow\\; |E| \\propto \\frac{1}{n^2}',
  },
  { name: 'angular momenta of the electron in the orbits', p: 1, law: 'L = \\frac{nh}{2\\pi} \\;\\Rightarrow\\; L \\propto n' },
];

/** lambda = n/(d R_H) as LaTeX. */
function overRTex(n: number, d: number): string {
  return d === 1 ? `\\frac{${n}}{R_H}` : `\\frac{${n}}{${d}R_H}`;
}

/** The reciprocal mistake d R_H / n as LaTeX. */
function rOverTex(n: number, d: number): string {
  const top = `${d === 1 ? '' : d}R_H`;
  return n === 1 ? top : `\\frac{${top}}{${n}}`;
}

/** Longest and shortest wavelengths of the series ending on level L, as [numerator, denominator] of 1/R_H. */
function seriesWavelengths(L: number): { longest: [number, number]; shortest: [number, number] } {
  const ln = L * L * (L + 1) * (L + 1);
  const ld = 2 * L + 1;
  const g = gcd(ln, ld);
  return { longest: [ln / g, ld / g], shortest: [L * L, 1] };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('physics', 'atomic-spectra', (b) => [
  // ---- Bohr model ---------------------------------------------------------
  b.dynamic('bohr-quantity-ratio', { difficulty: 2, origin: 'past-paper', tags: ['Bohr model'] }, (r) => {
    const quantity = r.pick(BOHR_QUANTITIES);
    const [n1, n2] = r.sample([1, 2, 3, 4, 5, 6], 2) as [number, number];
    const answer = `$${powerRatioTex(n1, n2, quantity.p)}$`;
    // Wrong powers: the inverse law first, then the other common slips.
    const wrongPowers = [-quantity.p, ...[2, 1, -1, -2, 3].filter((p) => p !== quantity.p && p !== -quantity.p)];
    const distractors = pickDistractors(
      answer,
      wrongPowers.map((p) => `$${powerRatioTex(n1, n2, p)}$`),
    );
    return {
      stem: tex`According to Bohr's model of the hydrogen atom, the ratio of the ${quantity.name} with $n = ${n1}$ and $n = ${n2}$ is:`,
      answer,
      distractors,
      explanation: tex`$${quantity.law}$, so the ratio for $n = ${n1}$ and $n = ${n2}$ is $${powerRatioTex(n1, n2, quantity.p)}$.`,
    };
  }),

  b.dynamic('hydrogen-level-energy', { difficulty: 1, tags: ['Bohr model', 'hydrogen spectrum'] }, (r) => {
    const n = r.pick([2, 4, 5, 10]);
    const mag = levelEV(n);
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: -mag,
        wrong: [-13.6 / n, mag, -Number((13.6 - mag).toPrecision(12))], // used 1/n, dropped the sign, took E_1 - E_n
        format: ev$,
        allowNegative: true,
      });
      return {
        stem: tex`The ground-state energy of the hydrogen atom is $-13.6\,\mathrm{eV}$. The energy of its electron in the $n = ${n}$ state is:`,
        answer,
        distractors,
        explanation: tex`$E_n = -\frac{13.6}{n^2}\,\mathrm{eV} = -\frac{13.6}{${n}^2} = ${num(-mag, { sig: 5 })}\,\mathrm{eV}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: mag,
      wrong: [13.6 / n, 13.6 - mag, 13.6], // used 1/n, energy to reach n from ground, ground-state value
      format: ev$,
    });
    return {
      stem: tex`The ground-state energy of the hydrogen atom is $-13.6\,\mathrm{eV}$. The minimum energy needed to ionize a hydrogen atom whose electron is in the $n = ${n}$ state is:`,
      answer,
      distractors,
      explanation: tex`Ionization lifts the electron from $E_{${n}}$ to $E_\infty = 0$: energy needed $= 0 - E_{${n}} = \frac{13.6}{${n}^2} = ${num(mag, { sig: 5 })}\,\mathrm{eV}$.`,
    };
  }),

  b.fixed('bohr-angular-momentum', { difficulty: 1, origin: 'past-paper', tags: ['Bohr model'] }, {
    stem: tex`According to Bohr's postulate, the angular momentum of the electron in the third orbit of the hydrogen atom is:`,
    answer: tex`$\frac{3h}{2\pi}$`,
    distractors: [tex`$\frac{3h}{\pi}$`, tex`$\frac{9h}{2\pi}$`, tex`$\frac{2\pi}{3h}$`],
    explanation: tex`Bohr quantized angular momentum: $mvr = \frac{nh}{2\pi}$. For $n = 3$, $L = \frac{3h}{2\pi}$ (it grows as $n$, not $n^2$).`,
  }),

  ...b.mcqs([
    {
      id: 'negative-total-energy', d: 1, t: ['Bohr model'],
      q: 'The total energy of the electron in any Bohr orbit of hydrogen is negative. This shows that the electron:',
      a: 'is bound to the nucleus',
      x: ['has negative kinetic energy', 'is spiralling into the nucleus', 'can leave the atom without gaining energy'],
      e: 'Zero energy is taken for a free electron at rest far away; a negative total energy means energy must be supplied to free it, so the electron is bound. Kinetic energy is never negative.',
    },
    {
      id: 'energy-level-spacing', d: 1, t: ['Bohr model', 'hydrogen spectrum'],
      q: tex`As the principal quantum number $n$ increases, the energy gap between successive levels of the hydrogen atom:`,
      a: 'decreases',
      x: ['increases', 'remains constant', 'first increases and then decreases'],
      e: tex`$E_n = -\frac{13.6}{n^2}\,\mathrm{eV}$, so the levels crowd together as $n$ grows: $10.2\,\mathrm{eV}$ between $n=1$ and $2$, but only $1.89\,\mathrm{eV}$ between $n=2$ and $3$.`,
    },
  ]),

  // ---- Hydrogen spectrum --------------------------------------------------
  b.dynamic('transition-photon-energy', { difficulty: 2, tags: ['hydrogen spectrum', 'Bohr model'] }, (r) => {
    const [lo, hi] = r.pick([
      [1, 2], [1, 4], [1, 5], [1, 10], [2, 4], [2, 5], [2, 10], [4, 5], [4, 10], [5, 10],
    ] as const);
    const e = Number((levelEV(lo) - levelEV(hi)).toPrecision(12));
    const emitted = r.chance(0.5);
    const { answer, distractors } = numericOptions(r, {
      correct: e,
      wrong: [
        levelEV(lo) + levelEV(hi), // added the level energies
        levelEV(lo), // ignored the upper level
        13.6 * (1 / lo - 1 / hi), // used 1/n instead of 1/n^2
        13.6 / (hi - lo) ** 2, // squared the difference of quantum numbers
        levelEV(hi), // used only the upper level
      ],
      format: ev$,
    });
    const action = emitted
      ? `falls from the $n = ${hi}$ level to the $n = ${lo}$ level. The energy of the emitted photon is:`
      : `is raised from the $n = ${lo}$ level to the $n = ${hi}$ level by absorbing a photon. The energy of that photon is:`;
    return {
      stem: tex`The energy levels of hydrogen are given by $E_n = -\frac{13.6}{n^2}\,\mathrm{eV}$. The electron of a hydrogen atom ${action}`,
      answer,
      distractors,
      explanation: tex`$\Delta E = 13.6\left(\frac{1}{${lo}^2} - \frac{1}{${hi}^2}\right) = ${num(levelEV(lo), { sig: 5 })} - ${num(levelEV(hi), { sig: 5 })} = ${num(e, { sig: 5 })}\,\mathrm{eV}$.`,
    };
  }),

  b.dynamic('spectral-series-identify', { difficulty: 1, origin: 'past-paper', tags: ['hydrogen spectrum'] }, (r) => {
    const s = r.pick(SERIES);
    const names = SERIES.map((x) => x.name);
    const mode = r.pick(['level', 'transition', 'region'] as const);
    if (mode === 'region') {
      const answer = `${s.region} region`;
      return {
        stem: `The lines of the ${s.name} series of hydrogen lie mainly in the:`,
        answer,
        distractors: [...(REGION_WRONG[s.region] as readonly string[])],
        explanation: tex`The ${s.name} series ends on $n = ${s.low}$. Lyman ($n=1$) is ultraviolet, Balmer ($n=2$) is visible, and Paschen, Brackett and Pfund ($n = 3, 4, 5$) are infrared.`,
      };
    }
    const distractors = pickDistractors(s.name, r.shuffle(names.filter((x) => x !== s.name)));
    if (mode === 'level') {
      return {
        stem: tex`The series of lines emitted when electrons in excited hydrogen atoms fall to the $n = ${s.low}$ level is called the:`,
        answer: `${s.name} series`,
        distractors: distractors.map((x) => `${x} series`),
        explanation: tex`The series is named by its lower level: Lyman $n=1$, Balmer $n=2$, Paschen $n=3$, Brackett $n=4$, Pfund $n=5$. Here $n = ${s.low}$ gives the ${s.name} series.`,
      };
    }
    const hi = s.low + r.int(1, 4);
    return {
      stem: tex`The spectral line produced when the electron of a hydrogen atom jumps from $n = ${hi}$ to $n = ${s.low}$ belongs to the:`,
      answer: `${s.name} series`,
      distractors: distractors.map((x) => `${x} series`),
      explanation: tex`Only the final level decides the series. A jump ending on $n = ${s.low}$ belongs to the ${s.name} series (Lyman 1, Balmer 2, Paschen 3, Brackett 4, Pfund 5).`,
    };
  }),

  b.dynamic('spectral-line-count', { difficulty: 2, tags: ['hydrogen spectrum'] }, (r) => {
    const n = r.int(3, 8);
    const lines = (n * (n - 1)) / 2;
    const { answer, distractors } = numericOptions(r, {
      correct: lines,
      wrong: [n - 1, (n * (n + 1)) / 2, n * (n - 1), n * n], // single-atom cascade, wrong formula, counted both ways, n^2
      format: (x) => `$${x}$`,
    });
    return {
      stem: tex`A sample of hydrogen gas is excited so that its atoms reach the $n = ${n}$ level. The maximum number of different spectral lines emitted as the atoms return to the ground state is:`,
      answer,
      distractors,
      explanation: tex`Every pair of the $${n}$ levels gives one line: $\frac{n(n-1)}{2} = \frac{${n}(${n - 1})}{2} = ${lines}$.`,
    };
  }),

  b.dynamic('series-wavelength-rydberg', { difficulty: 3, tags: ['hydrogen spectrum'] }, (r) => {
    const L = r.int(1, 4);
    const s = SERIES[L - 1] as (typeof SERIES)[number];
    const longest = r.chance(0.5);
    const w = seriesWavelengths(L);
    const [n, d] = longest ? w.longest : w.shortest;
    const [on, od] = longest ? w.shortest : w.longest;
    const other = seriesWavelengths(L === 4 ? 3 : L + 1);
    const [xn, xd] = longest ? other.longest : other.shortest;
    const answer = `$${overRTex(n, d)}$`;
    const distractors = pickDistractors(answer, [
      `$${overRTex(on, od)}$`, // longest and shortest swapped
      `$${rOverTex(n, d)}$`, // gave 1/lambda instead of lambda
      `$${overRTex(xn, xd)}$`, // neighbouring series
      `$${rOverTex(on, od)}$`,
    ]);
    const kind = longest ? 'longest' : 'shortest';
    const work = longest
      ? tex`The longest wavelength is the smallest jump, $n = ${L + 1} \to ${L}$: $\frac{1}{\lambda} = R_H\left(\frac{1}{${L}^2} - \frac{1}{${L + 1}^2}\right) = \frac{${d}R_H}{${n}}$, so $\lambda = ${overRTex(n, d)}$.`
      : tex`The shortest wavelength is the series limit, $n = \infty \to ${L}$: $\frac{1}{\lambda} = R_H\left(\frac{1}{${L}^2} - 0\right) = ${rOverTex(n, d)}$, so $\lambda = ${overRTex(n, d)}$.`;
    return {
      stem: tex`In terms of the Rydberg constant $R_H$, the ${kind} wavelength in the ${s.name} series of hydrogen is:`,
      answer,
      distractors,
      explanation: work,
    };
  }),

  b.fixed('shortest-wavelength-transition', { difficulty: 3, tags: ['hydrogen spectrum'] }, {
    stem: 'Which of the following transitions in a hydrogen atom emits the photon of the shortest wavelength?',
    answer: tex`$n = 4 \to n = 1$`,
    distractors: [tex`$n = 6 \to n = 2$`, tex`$n = 3 \to n = 2$`, tex`$n = 5 \to n = 3$`],
    explanation: tex`Shortest wavelength means largest energy. $\Delta E = 13.6\left(\frac{1}{n_1^2} - \frac{1}{n_2^2}\right)$ gives $12.75\,\mathrm{eV}$ for $4 \to 1$, but only $3.02$, $1.89$ and $0.97\,\mathrm{eV}$ for the others: a jump ending on $n = 1$ beats any jump ending higher, however many levels it spans.`,
  }),

  // ---- X-rays -------------------------------------------------------------
  b.dynamic('xray-cutoff-wavelength', { difficulty: 2, origin: 'past-paper', tags: ['X-rays'] }, (r) => {
    if (r.chance(0.5)) {
      const v = r.pick([10, 12.4, 15.5, 20, 24.8, 25, 31, 40, 50, 62, 80, 100, 124]);
      const lam = Number((1.24 / v).toPrecision(12)); // nm
      const { answer, distractors } = numericOptions(r, {
        correct: lam,
        wrong: [lam * 1000, lam * 10, lam / 2], // kV not converted to V, used 12.4/V(kV) (in angstrom) as nm, halved
        format: (x) => q$(x, U.nm),
      });
      return {
        stem: tex`An X-ray tube is operated at $${qty(v, 'kV')}$. Taking $hc = 1240\,\mathrm{eV\,nm}$, the cut-off (minimum) wavelength of the X-rays is:`,
        answer,
        distractors,
        explanation: tex`An electron gives all its energy $eV$ to one photon: $\lambda_{\min} = \frac{hc}{eV} = \frac{1240\,\mathrm{eV\,nm}}{${num(v * 1000)}\,\mathrm{eV}} = ${num(lam)}\,\mathrm{nm}$.`,
      };
    }
    const change = r.pick([
      { word: 'doubled', k: [2, 1] },
      { word: 'tripled', k: [3, 1] },
      { word: 'made four times as large', k: [4, 1] },
      { word: 'halved', k: [1, 2] },
    ] as const);
    const [p, q] = change.k;
    // lambda' = lambda * q / p
    const lamTex = (a: number, c: number): string => {
      const g = gcd(a, c);
      const top = a / g;
      const bot = c / g;
      const t = top === 1 ? '\\lambda' : `${top}\\lambda`;
      return bot === 1 ? t : `\\frac{${t}}{${bot}}`;
    };
    const sqrtTex = p === 4 ? lamTex(1, 2) : p > q ? `\\frac{\\lambda}{\\sqrt{${p}}}` : `\\sqrt{${q}}\\,\\lambda`;
    const answer = `$${lamTex(q, p)}$`;
    const distractors = pickDistractors(answer, [
      `$${lamTex(p, q)}$`, // thought lambda grows with V
      `$${lamTex(q * q, p * p)}$`, // inverse square
      `$${sqrtTex}$`,
      '$\\lambda$ (unchanged)',
    ]);
    return {
      stem: tex`The cut-off wavelength of the X-rays from a tube is $\lambda$. If the accelerating potential difference is ${change.word}, the new cut-off wavelength is:`,
      answer,
      distractors,
      explanation: tex`$\lambda_{\min} = \frac{hc}{eV} \propto \frac{1}{V}$. When $V$ is ${change.word}, $\lambda_{\min}$ changes by the inverse factor, giving $${lamTex(q, p)}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'characteristic-xray-origin', d: 1, t: ['X-rays'],
      q: 'Characteristic X-rays are emitted when:',
      a: 'an outer-shell electron fills a vacancy in an inner shell of a target atom',
      x: [
        'fast electrons are slowed down by the nuclei of the target atoms',
        'valence electrons of the target are excited by visible light',
        'nuclei of the target atoms undergo radioactive decay',
      ],
      e: 'A fast electron knocks out an inner (e.g. K-shell) electron; an outer electron drops into the vacancy and emits a photon whose energy is fixed by the target element. Slowing down of electrons (braking radiation) gives the continuous spectrum instead.',
    },
    {
      id: 'cutoff-depends-on-voltage', d: 2, o: 'past-paper', t: ['X-rays'],
      q: 'The cut-off (minimum) wavelength of the continuous X-ray spectrum from a tube depends on:',
      a: 'the accelerating potential difference only',
      x: [
        'the atomic number of the target only',
        'the filament current only',
        'the target material and the filament current',
      ],
      e: tex`$\lambda_{\min} = \frac{hc}{eV}$ contains only the accelerating voltage $V$. The target material fixes the characteristic lines and the filament current fixes the intensity.`,
    },
    {
      id: 'xray-filament-current', d: 2, t: ['X-rays'],
      q: 'In an X-ray tube, the filament current is increased while the accelerating voltage is kept fixed. As a result, the X-rays:',
      a: 'become more intense but no more penetrating',
      x: [
        'have a shorter cut-off wavelength',
        'consist of photons of higher energy',
        'become harder (more penetrating)',
      ],
      e: 'A larger filament current emits more electrons per second, so more photons are produced (higher intensity). Photon energies, and hence hardness and cut-off wavelength, depend only on the accelerating voltage.',
    },
  ]),

  // ---- Lasers -------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'laser-population-inversion', d: 1, o: 'past-paper', t: ['lasers'],
      q: 'Laser action is possible only when there is:',
      a: 'population inversion between two energy levels',
      x: [
        'more atoms in the ground state than in the excited state',
        'more spontaneous emission than stimulated emission',
        'an upper level with an extremely short lifetime',
      ],
      e: 'Stimulated emission can outweigh absorption only if more atoms are in the upper (metastable) level than in the lower one, i.e. a population inversion. A long-lived (metastable) upper level helps create it.',
    },
    {
      id: 'laser-not-property', d: 1, t: ['lasers'],
      q: 'Which of the following is NOT a property of laser light?',
      a: 'It is highly divergent',
      x: ['It is highly monochromatic', 'It is coherent', 'It is highly directional'],
      e: 'Laser light is monochromatic, coherent and travels as a narrow, almost parallel beam; it spreads very little, so "highly divergent" is not a property.',
    },
    {
      id: 'metastable-lifetime', d: 2, t: ['lasers'],
      q: 'A metastable state used in lasers is an excited state with a lifetime of about:',
      a: tex`$10^{-3}\,\mathrm{s}$`,
      x: [tex`$10^{-8}\,\mathrm{s}$`, tex`$10^{-15}\,\mathrm{s}$`, tex`$10^{3}\,\mathrm{s}$`],
      e: tex`An ordinary excited state decays in about $10^{-8}\,\mathrm{s}$; a metastable state lives about $10^{-3}\,\mathrm{s}$, long enough for atoms to pile up and give population inversion.`,
    },
    {
      id: 'he-ne-laser', d: 2, t: ['lasers'],
      q: 'In a helium-neon laser, the laser light is actually emitted by:',
      a: 'neon atoms',
      x: ['helium atoms', 'helium and neon atoms equally', 'free electrons of the discharge'],
      e: tex`The discharge excites helium atoms, which pass their energy to neon atoms by collisions. Neon atoms in the metastable level then undergo stimulated emission, giving red light of $632.8\,\mathrm{nm}$.`,
    },
  ]),
]);
