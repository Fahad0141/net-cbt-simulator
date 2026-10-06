import { defineBank } from '@/engine/authoring';
import { frac, gcd, num, numericOptions, pickDistractors, q$, qty, sci, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local data and helpers
// ---------------------------------------------------------------------------

/** Nuclides used for composition questions: symbol, name, Z, A. */
const NUCLIDES: ReadonlyArray<readonly [string, string, number, number]> = [
  ['U', 'uranium', 92, 235],
  ['U', 'uranium', 92, 238],
  ['Ra', 'radium', 88, 226],
  ['Rn', 'radon', 86, 222],
  ['Po', 'polonium', 84, 210],
  ['Pb', 'lead', 82, 206],
  ['Pb', 'lead', 82, 208],
  ['Th', 'thorium', 90, 234],
  ['Co', 'cobalt', 27, 60],
  ['Fe', 'iron', 26, 56],
  ['Sr', 'strontium', 38, 90],
  ['Cs', 'caesium', 55, 137],
  ['I', 'iodine', 53, 131],
  ['Na', 'sodium', 11, 23],
  ['Al', 'aluminium', 13, 27],
  ['C', 'carbon', 6, 14],
  ['Cl', 'chlorine', 17, 37],
  ['K', 'potassium', 19, 40],
  ['Kr', 'krypton', 36, 92],
  ['Ba', 'barium', 56, 141],
  ['P', 'phosphorus', 15, 32],
  ['Am', 'americium', 95, 241],
];

/** Heavy radioactive parents for decay-series questions: symbol, Z, A. */
const PARENTS: ReadonlyArray<readonly [string, number, number]> = [
  ['U', 92, 238],
  ['U', 92, 235],
  ['Th', 90, 232],
  ['Ra', 88, 226],
  ['Np', 93, 237],
  ['Pu', 94, 239],
  ['Am', 95, 241],
];

/** Light nuclei with a given mass defect (u): symbol, Z, A, mass defect. */
const DEFECTS: ReadonlyArray<readonly [string, number, number, number]> = [
  ['He', 2, 4, 0.0304],
  ['Li', 3, 7, 0.0421],
  ['C', 6, 12, 0.099],
  ['N', 7, 14, 0.1124],
  ['O', 8, 16, 0.137],
  ['Ne', 10, 20, 0.1725],
  ['Mg', 12, 24, 0.2129],
  ['Si', 14, 28, 0.2539],
  ['Ca', 20, 40, 0.3669],
  ['Fe', 26, 56, 0.5285],
];

/** Time units for half-life questions: unit, then the range of half-life values used with it. */
const TIME_UNITS: ReadonlyArray<readonly [string, number, number]> = [
  ['s', 2, 40],
  ['min', 2, 30],
  ['h', 2, 24],
  ['days', 2, 30],
  ['years', 5, 60],
];

/** LaTeX for a nuclide, e.g. ^{235}_{92}\mathrm{U}. */
function nuclideTex(sym: string, z: number, a: number): string {
  return `^{${a}}_{${z}}\\mathrm{${sym}}`;
}

/** Simplified ratio "a : b" as LaTeX. */
function ratioTex(a: number, b: number): string {
  const g = gcd(a, b);
  return `${a / g} : ${b / g}`;
}

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('physics', 'nuclear-physics', (b) => [
  // ---------------- Nuclear composition ----------------
  b.dynamic('neutron-count', { difficulty: 1, origin: 'past-paper', tags: ['nuclear composition'] }, (r) => {
    const [sym, name, z, a] = r.pick(NUCLIDES);
    const n = a - z;
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      wrong: [a, z, a + z, n - 2, n + 2],
      format: (x) => `$${num(x)}$`,
    });
    const stem = r.chance(0.5)
      ? tex`The number of neutrons in the nucleus $${nuclideTex(sym, z, a)}$ is:`
      : tex`The nucleus of ${name}-${a} contains $${z}$ protons. The number of neutrons in it is:`;
    return {
      stem,
      answer,
      distractors,
      explanation: tex`Neutron number $N = A - Z = ${a} - ${z} = ${n}$. The mass number $A = ${a}$ counts all nucleons; $Z = ${z}$ counts protons only.`,
    };
  }),

  b.dynamic('nuclear-radius', { difficulty: 2, origin: 'past-paper', tags: ['nuclear composition'] }, (r) => {
    if (r.chance(0.5)) {
      const [c1, c2] = r.sample([2, 3, 4, 5, 6], 2) as [number, number];
      const a1 = c1 ** 3;
      const a2 = c2 ** 3;
      const answer = `$${ratioTex(c1, c2)}$`;
      const distractors = pickDistractors(answer, [
        `$${ratioTex(a1, a2)}$`,
        `$${ratioTex(c1 * c1, c2 * c2)}$`,
        `$${ratioTex(c2, c1)}$`,
        `$${ratioTex(a2, a1)}$`,
      ]);
      return {
        stem: tex`Two nuclei have mass numbers $${a1}$ and $${a2}$. The ratio of their radii is:`,
        answer,
        distractors,
        explanation: tex`$R = R_0A^{1/3}$, so $\dfrac{R_1}{R_2} = \left(\dfrac{${a1}}{${a2}}\right)^{1/3} = \dfrac{${c1}}{${c2}}$, i.e. $${ratioTex(c1, c2)}$. The ratio $${ratioTex(a1, a2)}$ is the ratio of their volumes.`,
      };
    }
    const c = r.pick([2, 3, 4, 5, 6]);
    const a = c ** 3;
    const r0 = r.pick([1.2, 1.3, 1.4]);
    const { answer, distractors } = numericOptions(r, {
      correct: r0 * c,
      wrong: [r0 * a, r0 * c * c, r0 * Math.sqrt(a), r0 * a / 3],
      format: (x) => q$(x, 'fm'),
    });
    return {
      stem: tex`Taking $R_0 = ${qty(r0, 'fm')}$, the radius of a nucleus of mass number $${a}$ is:`,
      answer,
      distractors,
      explanation: tex`$R = R_0A^{1/3} = ${num(r0)}\,(${a})^{1/3} = ${num(r0)} \times ${c} = ${num(r0 * c)}\,\mathrm{fm}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'isotopes-definition', d: 1, o: 'past-paper', t: ['nuclear composition'],
      q: 'Isotopes of an element have:',
      a: 'the same atomic number but different mass numbers',
      x: [
        'the same mass number but different atomic numbers',
        'the same number of neutrons but different numbers of protons',
        'different atomic numbers and different chemical properties',
      ],
      e: 'Isotopes have the same number of protons (same $Z$, so the same chemistry) but different numbers of neutrons, hence different $A$. Equal $A$ with different $Z$ describes isobars; equal neutron number describes isotones.',
    },
    {
      id: 'nuclear-density-ratio', d: 3, t: ['nuclear composition'],
      q: 'Two nuclei have mass numbers $27$ and $125$. The ratio of their nuclear densities is:',
      a: '$1 : 1$',
      x: ['$27 : 125$', '$3 : 5$', '$9 : 25$'],
      e: tex`Mass $\propto A$ and volume $= \frac{4}{3}\pi R_0^3A$ is also $\propto A$, so density $\propto A/A$ is the same for all nuclei. The ratio $3 : 5$ is the ratio of their radii.`,
    },
    {
      id: 'strong-force-nature', d: 2, t: ['nuclear composition'],
      q: 'The strong nuclear force between nucleons is:',
      a: 'short-ranged and nearly independent of charge',
      x: [
        'long-ranged and inversely proportional to the square of distance',
        'attractive between protons only and zero for neutrons',
        'weaker than the electric repulsion between two protons 1 fm apart',
      ],
      e: 'The strong force acts only over about $1$ to $3\\,\\mathrm{fm}$ and binds p-p, n-n and n-p pairs almost equally. At nuclear separations it far exceeds the Coulomb repulsion, which is why nuclei are stable.',
    },
  ]),

  // ---------------- Mass defect and binding energy ----------------
  b.dynamic('mass-energy-equivalence', { difficulty: 1, tags: ['mass defect and binding energy'] }, (r) => {
    const useMg = r.chance(0.4);
    const val = useMg ? r.pick([2, 5, 10, 20, 40, 50, 100, 200, 500]) : r.pick([1, 2, 3, 4, 5, 6, 8, 10]);
    const mKg = useMg ? val * 1e-6 : val * 1e-3;
    const c = 3e8;
    const e = mKg * c * c;
    const slip = useMg ? val * 1e-3 * c * c : val * c * c; // mass left in g (or mg read as g)
    const { answer, distractors } = numericOptions(r, {
      correct: e,
      wrong: [slip, mKg * c, 0.5 * e, e / 1000],
      format: (x) => `$${sci(x)}\\,\\mathrm{J}$`,
    });
    const unit = useMg ? 'mg' : U.g;
    return {
      stem: tex`If a mass of $${qty(val, unit)}$ is completely converted into energy, the energy released is (take $c = 3 \times 10^{8}\,\mathrm{m\,s^{-1}}$):`,
      answer,
      distractors,
      explanation: tex`$E = mc^2 = (${num(mKg)}\,\mathrm{kg})(3 \times 10^{8})^2 = ${num(e)}\,\mathrm{J}$. The mass must be in kilograms.`,
    };
  }),

  b.dynamic('binding-energy-per-nucleon', { difficulty: 2, tags: ['mass defect and binding energy'] }, (r) => {
    const [sym, z, a, dm] = r.pick(DEFECTS);
    const total = dm * 931;
    const per = total / a;
    const asTotal = r.chance(0.35);
    if (asTotal) {
      const { answer, distractors } = numericOptions(r, {
        correct: total,
        wrong: [per, total / z, total / (a - z), total / 2],
        format: (x) => q$(x, U.MeV),
      });
      return {
        stem: tex`The mass defect of the nucleus $${nuclideTex(sym, z, a)}$ is $${num(dm, { sig: 4 })}\,\mathrm{u}$. Taking $1\,\mathrm{u} \equiv 931\,\mathrm{MeV}$, its total binding energy is about:`,
        answer,
        distractors,
        explanation: tex`$E_b = \Delta m \times 931\,\mathrm{MeV} = ${num(dm, { sig: 4 })} \times 931 \approx ${num(total)}\,\mathrm{MeV}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: per,
      wrong: [total, total / z, total / (a - z), per / 2],
      format: (x) => q$(x, U.MeV),
    });
    return {
      stem: tex`The mass defect of the nucleus $${nuclideTex(sym, z, a)}$ is $${num(dm, { sig: 4 })}\,\mathrm{u}$. Taking $1\,\mathrm{u} \equiv 931\,\mathrm{MeV}$, its binding energy per nucleon is about:`,
      answer,
      distractors,
      explanation: tex`$E_b = \Delta m \times 931 = ${num(dm, { sig: 4 })} \times 931 \approx ${num(total, { sig: 4 })}\,\mathrm{MeV}$. Per nucleon: $\dfrac{E_b}{A} = \dfrac{${num(total, { sig: 4 })}}{${a}} \approx ${num(per)}\,\mathrm{MeV}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'binding-energy-peak', d: 2, o: 'past-paper', t: ['mass defect and binding energy'],
      q: 'The binding energy per nucleon is greatest for nuclei close to:',
      a: '$^{56}\\mathrm{Fe}$',
      x: ['$^{4}\\mathrm{He}$', '$^{235}\\mathrm{U}$', '$^{2}\\mathrm{H}$'],
      e: 'The binding-energy-per-nucleon curve peaks at about $8.8\\,\\mathrm{MeV}$ near iron-56, so iron nuclei are the most stable. Heavier nuclei release energy by fission and lighter ones by fusion, moving towards this peak.',
    },
  ]),

  // ---------------- Radioactivity ----------------
  b.dynamic('decay-series', { difficulty: 2, origin: 'past-paper', tags: ['radioactivity'] }, (r) => {
    const [sym, z, a] = r.pick(PARENTS);
    const na = r.int(1, 8);
    // At least one beta (so "alpha and beta emissions" is literally true); realistic chains have no more beta than alpha emissions.
    const nb = r.int(1, Math.min(6, na));
    const a2 = a - 4 * na;
    const z2 = z - 2 * na + nb;
    if (r.chance(0.5)) {
      const opt = (aa: number, zz: number): string => tex`$A = ${aa},\ Z = ${zz}$`;
      const answer = opt(a2, z2);
      const distractors = pickDistractors(answer, [
        opt(a2, z - 2 * na - nb), // beta taken as lowering Z
        opt(a - 2 * na, z - 4 * na + nb), // alpha changes swapped
        opt(a2 - nb, z2), // beta taken as lowering A
        opt(a2, z - 2 * na), // beta ignored
        opt(a2, z - na + nb), // alpha taken as lowering Z by 1
        opt(a - 2 * na, z2), // alpha taken as lowering A by 2
      ]);
      return {
        stem: tex`The nucleus $${nuclideTex(sym, z, a)}$ emits $${na}$ alpha particle${na > 1 ? 's' : ''} and $${nb}$ beta ($\beta^-$) particle${nb === 1 ? '' : 's'}. The mass number $A$ and atomic number $Z$ of the final nucleus are:`,
        answer,
        distractors,
        explanation: tex`Each $\alpha$ lowers $A$ by 4 and $Z$ by 2; each $\beta^-$ leaves $A$ unchanged and raises $Z$ by 1. $A = ${a} - 4(${na}) = ${a2}$, $Z = ${z} - 2(${na}) + ${nb} = ${z2}$.`,
      };
    }
    const opt = (x: number, y: number): string => tex`$${x}$ alpha and $${y}$ beta`;
    const answer = opt(na, nb);
    const distractors = pickDistractors(
      answer,
      [opt(nb, na), opt(na, nb + 2), opt(na + 1, nb), opt(na, Math.abs(nb - 2)), opt(na - 1 > 0 ? na - 1 : na + 2, nb), opt(na, nb + 1)],
      r,
    );
    return {
      stem: tex`$${nuclideTex(sym, z, a)}$ decays to $^{${a2}}_{${z2}}\mathrm{X}$ by a series of alpha and $\beta^-$ emissions. The numbers of alpha and beta particles emitted are:`,
      answer,
      distractors,
      explanation: tex`Only $\alpha$ changes $A$: $n_\alpha = \dfrac{${a} - ${a2}}{4} = ${na}$. Then $Z$: $${z} - 2(${na}) + n_\beta = ${z2}$, so $n_\beta = ${nb}$.`,
    };
  }),

  b.dynamic('radiation-properties', { difficulty: 1, origin: 'past-paper', tags: ['radioactivity'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about alpha, beta and gamma radiations is correct?',
      negativeStem: 'Which statement about alpha, beta and gamma radiations is NOT correct?',
      truths: [
        'Alpha particles have the greatest ionizing power of the three radiations.',
        'Gamma rays are not deflected by electric or magnetic fields.',
        'Gamma rays have the greatest penetrating power of the three radiations.',
        'An alpha particle is a helium nucleus carrying a charge of $+2e$.',
        'Beta particles emitted by a given nuclide have a continuous range of energies.',
        'Alpha particles are usually stopped by a thin sheet of paper.',
      ],
      falsehoods: [
        'Gamma rays carry a charge of $-e$.',
        'Alpha particles are more penetrating than gamma rays.',
        'Gamma rays have the greatest ionizing power of the three radiations.',
        'An alpha particle consists of two protons and two electrons.',
        'Emission of a gamma ray reduces the mass number of the nucleus by one.',
        'In a magnetic field, alpha particles are deflected more than beta particles.',
      ],
      explain: (ans, inverted) =>
        inverted
          ? `"${ans}" is false. Alpha: helium nucleus ($+2e$), most ionizing, least penetrating, heavy so little deflected. Beta: fast electrons with a continuous energy spread, strongly deflected. Gamma: uncharged photons, undeflected, most penetrating and least ionizing; their emission changes neither $A$ nor $Z$.`
          : `"${ans}" is true. Alpha: helium nucleus ($+2e$), most ionizing, least penetrating. Beta: fast electrons, continuous energies. Gamma: uncharged photons, undeflected, most penetrating, least ionizing.`,
    }),
  ),

  ...b.mcqs([
    {
      id: 'beta-electron-origin', d: 2, t: ['radioactivity'],
      q: 'In $\\beta^-$ decay, the emitted electron is produced when:',
      a: 'a neutron in the nucleus changes into a proton',
      x: [
        'an electron is ejected from the innermost shell of the atom',
        'a proton in the nucleus changes into a neutron',
        'an electron already present in the nucleus escapes',
      ],
      e: tex`Nuclei contain no electrons. In $\beta^-$ decay, $n \to p + e^- + \bar{\nu}$: a neutron becomes a proton, so $Z$ rises by 1 while $A$ is unchanged. Proton-to-neutron conversion gives $\beta^+$ decay.`,
    },
  ]),

  // ---------------- Half-life ----------------
  b.dynamic('half-life-remaining', { difficulty: 1, origin: 'past-paper', tags: ['half-life'] }, (r) => {
    const [unit, lo, hi] = r.pick(TIME_UNITS);
    const T = r.int(lo, hi);
    const n = r.int(2, 5);
    const t = n * T;
    const p = 2 ** n;
    if (r.chance(0.5)) {
      const k = r.int(1, 12);
      const m0 = k * p;
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        wrong: [m0 / n, m0 - k, m0 / (2 * n), m0 / 2 ** (n - 1), m0 / 2 ** (n + 1)],
        format: (x) => q$(x, U.g),
      });
      return {
        stem: tex`The half-life of a radioactive nuclide is $${qty(T, unit)}$. Of a $${qty(m0, U.g)}$ sample of this nuclide, the mass that remains undecayed after $${qty(t, unit)}$ is:`,
        answer,
        distractors,
        explanation: tex`$n = \dfrac{t}{T_{1/2}} = \dfrac{${t}}{${T}} = ${n}$ half-lives, so $m = \dfrac{m_0}{2^{n}} = \dfrac{${m0}}{${p}} = ${num(k)}\,\mathrm{g}$. (The amount decayed is $${num(m0 - k)}\,\mathrm{g}$.)`,
      };
    }
    const decayed = frac(p - 1, p);
    const answer = `$${decayed.toTex()}$`;
    const distractors = pickDistractors(answer, [
      `$${frac(1, p).toTex()}$`,
      `$${frac(n - 1, n).toTex()}$`,
      `$${frac(p / 2 - 1, p / 2).toTex()}$`,
      `$${frac(1, n).toTex()}$`,
      `$${frac(2 * p - 1, 2 * p).toTex()}$`,
    ]);
    return {
      stem: tex`A radioactive sample has a half-life of $${qty(T, unit)}$. The fraction of the original nuclei that has DECAYED after $${qty(t, unit)}$ is:`,
      answer,
      distractors,
      explanation: tex`$t = ${n}\,T_{1/2}$, so the fraction remaining is $\left(\frac{1}{2}\right)^{${n}} = ${frac(1, p).toTex()}$ and the fraction decayed is $1 - ${frac(1, p).toTex()} = ${decayed.toTex()}$.`,
    };
  }),

  b.dynamic('half-life-from-data', { difficulty: 2, tags: ['half-life'] }, (r) => {
    const [unit, lo, hi] = r.pick(TIME_UNITS);
    const T = r.int(lo, hi);
    const n = r.int(2, 5);
    const t = n * T;
    const p = 2 ** n;
    const k = r.pick([5, 10, 25, 50, 100, 125, 200]);
    const useActivity = r.chance(0.5);
    const start = k * p;
    const qUnit = useActivity ? 'Bq' : U.g;
    const { answer, distractors } = numericOptions(r, {
      correct: T,
      wrong: [t / p, t / (n + 1), t / 2, n > 2 ? t / (n - 1) : t / 3, t * n],
      format: (x) => q$(x, unit),
    });
    const what = useActivity ? 'The activity of a radioactive source falls' : 'The undecayed mass of a radioactive nuclide in a sample falls';
    return {
      stem: tex`${what} from $${qty(start, qUnit)}$ to $${qty(k, qUnit)}$ in $${qty(t, unit)}$. Its half-life is:`,
      answer,
      distractors,
      explanation: tex`$\dfrac{${start}}{${k}} = ${p} = 2^{${n}}$, so $${n}$ half-lives have passed. $T_{1/2} = \dfrac{${t}}{${n}} = ${T}\,\mathrm{${unit}}$.`,
    };
  }),

  b.dynamic('count-rate-background', { difficulty: 3, tags: ['half-life', 'radiation detectors'] }, (r) => {
    const n = r.int(2, 4);
    const p = 2 ** n;
    const S = p * r.int(5, 60);
    const B = r.intExcept(10, 40, [S / p]);
    const C = S + B;
    const T = r.int(2, 12);
    const unit = r.pick(['h', 'min', 'days']);
    const correct = B + S / p;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [C / p, S / p, B + S / (2 * n), B + S / 2 ** (n - 1)],
      format: (x) => tex`$${num(x)}$ counts per minute`,
    });
    return {
      stem: tex`A G.M. counter placed near a source records $${C}$ counts per minute, of which $${B}$ counts per minute are background. The half-life of the source is $${qty(T, unit)}$. After $${qty(n * T, unit)}$ the counter will record about:`,
      answer,
      distractors,
      explanation: tex`Source rate $= ${C} - ${B} = ${S}$ counts/min. After $${n}$ half-lives it is $\dfrac{${S}}{${p}} = ${num(S / p)}$. The background does not decay, so the reading is $${num(S / p)} + ${B} = ${num(correct)}$ counts per minute.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'half-life-depends-on', d: 1, t: ['half-life'],
      q: 'The half-life of a radioactive nuclide depends on:',
      a: 'the identity of the nuclide only',
      x: ['the temperature of the sample', 'the initial mass of the sample', 'the pressure acting on the sample'],
      e: 'Radioactive decay is a nuclear process governed by the decay constant $\\lambda$ of the nuclide; $T_{1/2} = 0.693/\\lambda$ is unaffected by temperature, pressure, chemical state or the amount of material.',
    },
  ]),

  // ---------------- Fission and fusion ----------------
  ...b.mcqs([
    {
      id: 'fission-energy', d: 1, o: 'past-paper', t: ['fission and fusion'],
      q: 'The energy released in the fission of a single $^{235}\\mathrm{U}$ nucleus is about:',
      a: '$200\\,\\mathrm{MeV}$',
      x: ['$20\\,\\mathrm{MeV}$', '$2\\,\\mathrm{MeV}$', '$931\\,\\mathrm{MeV}$'],
      e: 'Fission of $^{235}\\mathrm{U}$ releases roughly $200\\,\\mathrm{MeV}$, mostly as kinetic energy of the fission fragments. $931\\,\\mathrm{MeV}$ is the energy equivalent of $1\\,\\mathrm{u}$, not the fission yield.',
    },
    {
      id: 'reactor-moderator', d: 2, t: ['fission and fusion'],
      q: 'In a nuclear reactor, the moderator (such as graphite or heavy water) is used to:',
      a: 'slow down fast neutrons so that they can cause further fission',
      x: [
        'absorb surplus neutrons to control the rate of the chain reaction',
        'carry heat from the reactor core to the steam generator',
        'shield the operators from gamma radiation produced in the core',
      ],
      e: 'Slow (thermal) neutrons are far more likely to cause fission of $^{235}\\mathrm{U}$, so the moderator slows the fast fission neutrons by collisions. Absorbing neutrons is the job of control rods (cadmium or boron); carrying heat is the coolant\'s job.',
    },
    {
      id: 'fusion-high-temperature', d: 1, t: ['fission and fusion'],
      q: 'Nuclear fusion needs an extremely high temperature because:',
      a: 'the nuclei must overcome their mutual electrostatic repulsion',
      x: [
        'heat is required to split the nuclei into smaller fragments',
        'the neutrons released must first be slowed down',
        'the strong nuclear force acts only at high temperatures',
      ],
      e: 'Light nuclei are positively charged and repel each other. Only at temperatures of about $10^{7}\\,\\mathrm{K}$ do they move fast enough to come within the short range of the strong force and fuse.',
    },
  ]),

  // ---------------- Radiation detectors ----------------
  ...b.mcqs([
    {
      id: 'cloud-chamber-tracks', d: 1, t: ['radiation detectors'],
      q: 'In a Wilson cloud chamber, thick, straight and well-defined tracks are produced by:',
      a: 'alpha particles',
      x: ['beta particles', 'gamma rays', 'neutrons'],
      e: 'Alpha particles are heavy and strongly ionizing, so they leave dense, straight tracks of definite length. Beta tracks are thin and twisted, gamma rays give faint scattered tracks, and neutrons (uncharged) leave none.',
    },
    {
      id: 'gm-quenching', d: 2, t: ['radiation detectors'],
      q: 'A small amount of quenching gas (such as bromine) is added to a G.M. tube to:',
      a: 'stop the discharge so the tube is ready for the next particle',
      x: [
        'increase the ionization produced by each incoming particle',
        'absorb gamma rays before they can enter the tube',
        'convert the energy of each particle into flashes of light',
      ],
      e: 'After each pulse the positive ions drifting to the cathode could start a fresh, continuous discharge. The quenching gas absorbs this energy and stops the discharge. Producing light flashes describes a scintillation counter.',
    },
  ]),

  // ---------------- Elementary particles ----------------
  ...b.mcqs([
    {
      id: 'proton-quark-content', d: 1, t: ['elementary particles'],
      q: 'A proton is made up of:',
      a: 'two up quarks and one down quark',
      x: ['one up quark and two down quarks', 'three up quarks', 'one up quark and one anti-down quark'],
      e: tex`Up quark charge $+\frac{2}{3}e$, down quark $-\frac{1}{3}e$: $uud$ gives $\frac{2}{3} + \frac{2}{3} - \frac{1}{3} = +1$. The combination $udd$ is a neutron, and $u\bar{d}$ is a $\pi^+$ meson.`,
    },
    {
      id: 'identify-lepton', d: 1, t: ['elementary particles'],
      q: 'Which of the following particles is a lepton?',
      a: 'muon',
      x: ['proton', 'neutron', 'pi meson'],
      e: 'Leptons (electron, muon, tau and their neutrinos) do not feel the strong force and are not made of quarks. Protons and neutrons are baryons and the pi meson is a meson; all three are hadrons.',
    },
  ]),
]);
