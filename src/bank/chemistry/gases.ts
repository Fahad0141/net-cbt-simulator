import { defineBank } from '@/engine/authoring';
import { ce, num, numericOptions, pickDistractors, q$, qty, sci, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** `x` has at most `dp` decimal places, so it prints exactly. */
function isTidy(x: number, dp = 2): boolean {
  const scaled = x * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

/** `x` prints exactly with three significant figures. */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

interface Gas {
  /** mhchem formula. */
  f: string;
  /** Molar mass, g mol^-1 (FSc-rounded). */
  m: number;
  /** Atoms per molecule. */
  atoms: number;
}

const GASES: readonly Gas[] = [
  { f: 'H2', m: 2, atoms: 2 },
  { f: 'He', m: 4, atoms: 1 },
  { f: 'CH4', m: 16, atoms: 5 },
  { f: 'NH3', m: 17, atoms: 4 },
  { f: 'Ne', m: 20, atoms: 1 },
  { f: 'N2', m: 28, atoms: 2 },
  { f: 'O2', m: 32, atoms: 2 },
  { f: 'Ar', m: 40, atoms: 1 },
  { f: 'CO2', m: 44, atoms: 3 },
  { f: 'SO2', m: 64, atoms: 3 },
];

/** Kelvin temperatures that convert to whole Celsius values with 273. */
const KELVINS = [200, 250, 300, 350, 400, 450, 500, 600] as const;

/** General gas equation cases: V2 = P1 V1 T2 / (T1 P2), exact and realistic. */
const GAS_EQ_CASES = (() => {
  const out: Array<{ v1: number; p1: number; p2: number; t1: number; t2: number; v2: number }> = [];
  const pressures = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
  for (const v1 of [1, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20]) {
    for (const p1 of pressures) {
      for (const p2 of pressures) {
        if (p1 === p2) continue;
        for (const t1 of KELVINS) {
          for (const t2 of KELVINS) {
            if (t1 === t2) continue;
            const v2 = (p1 * v1 * t2) / (t1 * p2);
            if (v2 >= 0.5 && v2 <= 100 && isTidy(v2, 2) && exact3(v2)) out.push({ v1, p1, p2, t1, t2, v2 });
          }
        }
      }
    }
  }
  return out;
})();

/** Dalton's law cases: p_A = P n_A / (n_A + n_B), exact. */
const DALTON_CASES = (() => {
  const out: Array<{ na: number; nb: number; p: number; pa: number }> = [];
  const moles = [0.5, 1, 1.5, 2, 2.5, 3, 4];
  for (const na of moles) {
    for (const nb of moles) {
      if (na === nb) continue;
      for (let p = 1; p <= 12; p += 0.5) {
        const pa = (p * na) / (na + nb);
        if (isTidy(pa, 2) && exact3(pa)) out.push({ na, nb, p, pa });
      }
    }
  }
  return out;
})();

/** Graham's law pairs (light, heavy) whose molar-mass ratio is 2, 4 or 16. */
const GRAHAM_PAIRS: ReadonlyArray<readonly [Gas, Gas]> = (() => {
  const list = [...GASES, { f: 'HI', m: 128, atoms: 2 }];
  const out: Array<readonly [Gas, Gas]> = [];
  for (const a of list) {
    for (const b of list) {
      const k = b.m / a.m;
      if (k === 2 || k === 4 || k === 16) out.push([a, b]);
    }
  }
  return out;
})();

const ROOT_TEX: Readonly<Record<number, string>> = { 2: '\\sqrt{2}', 4: '2', 16: '4' };

/** Rate of the unknown gas as a fraction of the reference rate, for k = r_ref / r_x. */
const RATE_FRACTION: Readonly<Record<number, string>> = { 2: 'half', 3: 'one-third', 4: 'one-quarter' };

/** Statement pool items with their one-line reasons. */
const TRUE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'The average kinetic energy of gas molecules is directly proportional to the absolute temperature.',
    'Kinetic theory gives $\\bar{E}_k = \\frac{3}{2}kT$, so average kinetic energy depends only on absolute temperature.',
  ],
  [
    'Collisions between the molecules of an ideal gas are perfectly elastic.',
    'Kinetic theory assumes no loss of kinetic energy in molecular collisions.',
  ],
  [
    'Gas pressure results from molecules colliding with the walls of the container.',
    'Each collision transfers momentum to the wall; the force per unit area is the pressure.',
  ],
  [
    'Real gases deviate most from ideal behaviour at high pressure and low temperature.',
    'Under these conditions molecular volume and intermolecular attractions are no longer negligible.',
  ],
  [
    'The van der Waals constant b corrects for the finite volume of gas molecules.',
    'In $(V - nb)$, $b$ is the excluded volume per mole; $a$ corrects for attractions.',
  ],
  [
    'Plasma is a mixture of ions, free electrons and neutral particles that conducts electricity.',
    'Plasma is an ionised gas; its free charges make it a good conductor.',
  ],
  [
    'At the same temperature, lighter gas molecules move faster on average than heavier ones.',
    'Equal average kinetic energy $\\frac{1}{2}mv^2$ means a smaller $m$ gives a larger speed.',
  ],
];

const FALSE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'At the same temperature, the average kinetic energy of gas molecules increases with molar mass.',
    'Average kinetic energy depends only on absolute temperature, not on the identity or mass of the gas.',
  ],
  [
    'Real gases behave most ideally at high pressure and low temperature.',
    'Real gases approach ideal behaviour at low pressure and high temperature, not the reverse.',
  ],
  [
    'In collisions between ideal gas molecules, some of the total kinetic energy is lost.',
    'Kinetic theory assumes perfectly elastic collisions, so no kinetic energy is lost.',
  ],
  [
    'The van der Waals constant a corrects for the finite volume of gas molecules.',
    'The constant $a$ corrects for intermolecular attractions; $b$ corrects for molecular volume.',
  ],
  [
    'Plasma is a poor conductor of electricity because it is electrically neutral overall.',
    'Plasma contains free ions and electrons, so it conducts electricity well.',
  ],
  [
    'Under the same conditions, heavier gases diffuse faster than lighter ones.',
    "Graham's law: rate is inversely proportional to the square root of molar mass, so lighter gases diffuse faster.",
  ],
  [
    'Attractive forces between molecules are taken into account in the ideal gas model.',
    'The ideal gas model assumes there are no intermolecular attractions.',
  ],
];

const STATEMENT_REASON = new Map<string, string>([...TRUE_STATEMENTS, ...FALSE_STATEMENTS]);

export default defineBank('chemistry', 'gases', (b) => [
  // -------------------------------------------------------------------------
  // Dynamic templates
  // -------------------------------------------------------------------------
  b.dynamic('general-gas-equation', { difficulty: 2, tags: ['gas laws'] }, (r) => {
    const { v1, p1, p2, t1, t2, v2 } = r.pick(GAS_EQ_CASES);
    const c1 = t1 - 273;
    const c2 = t2 - 273;
    const wrong = [
      (p1 * v1 * t1) / (t2 * p2), // inverted temperature ratio
      (p2 * v1 * t2) / (t1 * p1), // inverted pressure ratio
      (p2 * v1 * t1) / (t2 * p1), // both ratios inverted
      (p1 * v1) / p2, // ignored the temperature change
      (p1 * v1 * c2) / (c1 * p2), // used Celsius temperatures
    ];
    const { answer, distractors } = numericOptions(r, {
      correct: v2,
      wrong,
      format: (x) => q$(x, U.dm3),
    });
    return {
      stem: tex`A sample of gas occupies $${qty(v1, U.dm3)}$ at $${qty(p1, U.atm)}$ and $${qty(c1, U.degC)}$. Its volume at $${qty(p2, U.atm)}$ and $${qty(c2, U.degC)}$ is:`,
      answer,
      distractors,
      explanation: tex`Convert to kelvin: $T_1 = ${t1}\,\mathrm{K}$, $T_2 = ${t2}\,\mathrm{K}$. Then $V_2 = \dfrac{P_1V_1T_2}{T_1P_2} = \dfrac{(${num(p1)})(${num(v1)})(${t2})}{(${t1})(${num(p2)})} = ${num(v2)}\,\mathrm{dm^{3}}$.`,
    };
  }),

  b.dynamic('molar-volume-stp', { difficulty: 1, origin: 'past-paper', tags: ['ideal gas equation'] }, (r) => {
    const gas = r.pick(GASES);
    const mode = r.pick(['volume', 'molecules', 'mass'] as const);
    const gasTex = ce(gas.f);
    if (mode === 'molecules') {
      // Keep only amounts whose mass prints exactly (0.75 mol NH3 = 12.75 g would show as 12.8 g).
      const n = r.pick([0.1, 0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5].filter((x) => exact3(x * gas.m)));
      const mass = n * gas.m;
      const count = n * 6.02e23;
      const { answer, distractors } = numericOptions(r, {
        correct: count,
        wrong: [count * gas.atoms, mass * 6.02e23, count / 2, count * 2, 6.02e23 / n],
        format: (x) => `$${sci(x, 4)}$`,
      });
      return {
        stem: tex`How many molecules are present in $${qty(mass, U.g)}$ of $${gasTex}$ $(M = ${qty(gas.m, U.gmol)})$? (Take $N_A = 6.02 \times 10^{23}\,\mathrm{mol^{-1}}$)`,
        answer,
        distractors,
        explanation: tex`$n = \dfrac{m}{M} = \dfrac{${num(mass)}}{${gas.m}} = ${num(n)}\,\mathrm{mol}$, so $N = nN_A = (${num(n)})(6.02 \times 10^{23}) = ${sci(count, 4)}$ molecules.`,
      };
    }
    const n = r.pick([0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5].filter((x) => exact3(x * gas.m)));
    const vol = n * 22.4;
    const mass = n * gas.m;
    if (mode === 'volume') {
      const { answer, distractors } = numericOptions(r, {
        correct: vol,
        wrong: [mass * 22.4, vol * 2, vol / 2, 22.4 / n, n * 24],
        format: (x) => q$(x, U.dm3),
      });
      return {
        stem: tex`What volume is occupied by $${qty(mass, U.g)}$ of $${gasTex}$ gas $(M = ${qty(gas.m, U.gmol)})$ at STP? (Molar volume at STP $= ${qty(22.4, U.dm3)}$)`,
        answer,
        distractors,
        explanation: tex`$n = \dfrac{m}{M} = \dfrac{${num(mass)}}{${gas.m}} = ${num(n)}\,\mathrm{mol}$, so $V = n \times 22.4 = (${num(n)})(22.4) = ${num(vol)}\,\mathrm{dm^{3}}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: mass,
      wrong: [vol * gas.m, mass * 2, mass / 2, gas.m / n, n * 22.4],
      format: (x) => q$(x, U.g),
    });
    return {
      stem: tex`What is the mass of $${qty(vol, U.dm3)}$ of $${gasTex}$ gas $(M = ${qty(gas.m, U.gmol)})$ at STP? (Molar volume at STP $= ${qty(22.4, U.dm3)}$)`,
      answer,
      distractors,
      explanation: tex`$n = \dfrac{V}{22.4} = \dfrac{${num(vol)}}{22.4} = ${num(n)}\,\mathrm{mol}$, so $m = nM = (${num(n)})(${gas.m}) = ${num(mass)}\,\mathrm{g}$.`,
    };
  }),

  b.dynamic('graham-law', { difficulty: 2, origin: 'past-paper', tags: ['Graham law'] }, (r) => {
    if (r.chance(0.5)) {
      // Ratio of rates of two known gases.
      const [light, heavy] = r.pick(GRAHAM_PAIRS);
      const k = heavy.m / light.m;
      const root = ROOT_TEX[k] as string;
      const lightFirst = r.chance(0.5);
      const [a, bGas] = lightFirst ? [light, heavy] : [heavy, light];
      const ratio = (x: string, y: string): string => `$${x} : ${y}$`;
      const answer = lightFirst ? ratio(root, '1') : ratio('1', root);
      const distractors = pickDistractors(answer, [
        lightFirst ? ratio('1', root) : ratio(root, '1'), // inverted
        lightFirst ? ratio(String(k), '1') : ratio('1', String(k)), // forgot the square root
        lightFirst ? ratio('1', String(k)) : ratio(String(k), '1'), // both mistakes
      ]);
      return {
        stem: tex`Under identical conditions, the ratio of the rates of diffusion of $${ce(a.f)}$ and $${ce(bGas.f)}$ $(r_{${ce(a.f)}} : r_{${ce(bGas.f)}})$ is: (molar masses $${ce(a.f)} = ${a.m}$ and $${ce(bGas.f)} = ${bGas.m}\,\mathrm{g\,mol^{-1}}$)`,
        answer,
        distractors,
        explanation: tex`Graham's law: $\dfrac{r_1}{r_2} = \sqrt{\dfrac{M_2}{M_1}}$. Here $\dfrac{r_{${ce(a.f)}}}{r_{${ce(bGas.f)}}} = \sqrt{\dfrac{${bGas.m}}{${a.m}}}$, giving ${answer}. The lighter gas diffuses faster.`,
      };
    }
    // Molar mass of an unknown gas from relative rates.
    const ref = r.pick(GASES.filter((g) => g.m <= 32));
    const k = r.pick(ref.m <= 4 ? [2, 3, 4] : [2, 3]);
    const mx = k * k * ref.m;
    const { answer, distractors } = numericOptions(r, {
      correct: mx,
      wrong: [k * ref.m, ref.m / (k * k), ref.m / k, 2 * k * ref.m],
      format: (x) => q$(x, U.gmol),
    });
    return {
      stem: tex`Under the same conditions, an unknown gas diffuses at ${RATE_FRACTION[k] as string} the rate of $${ce(ref.f)}$ $(M = ${qty(ref.m, U.gmol)})$. The molar mass of the unknown gas is:`,
      answer,
      distractors,
      explanation: tex`$\dfrac{r_{${ce(ref.f)}}}{r_x} = \sqrt{\dfrac{M_x}{M_{${ce(ref.f)}}}} = ${k}$, so $M_x = (${k})^2(${ref.m}) = ${num(mx)}\,\mathrm{g\,mol^{-1}}$.`,
    };
  }),

  b.dynamic('dalton-partial-pressure', { difficulty: 2, tags: ['Dalton law'] }, (r) => {
    const { na, nb, p, pa } = r.pick(DALTON_CASES);
    const nonReactive = GASES.filter((g) => g.f !== 'NH3');
    const [ga, gb] = r.sample(nonReactive, 2) as [Gas, Gas];
    const ma = na * ga.m;
    const mb = nb * gb.m;
    const massShare = (p * ma) / (ma + mb);
    const { answer, distractors } = numericOptions(r, {
      correct: pa,
      wrong: [
        (p * nb) / (na + nb), // partial pressure of the other gas
        // used mass fraction (skipped when similar molar masses put it within 10% of the answer)
        Math.abs(massShare - pa) > 0.1 * pa ? massShare : NaN,
        p / 2, // assumed an equal split
        (p * na) / nb, // ratio of moles instead of mole fraction
      ],
      format: (x) => q$(x, U.atm),
    });
    return {
      stem: tex`A container holds $${qty(ma, U.g)}$ of $${ce(ga.f)}$ $(M = ${qty(ga.m, U.gmol)})$ and $${qty(mb, U.g)}$ of $${ce(gb.f)}$ $(M = ${qty(gb.m, U.gmol)})$, which do not react. If the total pressure is $${qty(p, U.atm)}$, the partial pressure of $${ce(ga.f)}$ is:`,
      answer,
      distractors,
      explanation: tex`$n_{${ce(ga.f)}} = \dfrac{${num(ma)}}{${ga.m}} = ${num(na)}$ mol, $n_{${ce(gb.f)}} = \dfrac{${num(mb)}}{${gb.m}} = ${num(nb)}$ mol. By Dalton's law $p = xP = \dfrac{${num(na)}}{${num(na + nb)}} \times ${num(p)} = ${num(pa)}\,\mathrm{atm}$.`,
    };
  }),

  b.dynamic('kinetic-theory-statements', { difficulty: 1, tags: ['kinetic theory', 'non-ideal behaviour', 'plasma'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about gases is correct?',
      negativeStem: 'Which of the following statements about gases is incorrect?',
      truths: TRUE_STATEMENTS.map(([s]) => s),
      falsehoods: FALSE_STATEMENTS.map(([s]) => s),
      explain: (answer, inverted) =>
        `${inverted ? 'This statement is false.' : 'This statement is true.'} ${STATEMENT_REASON.get(answer) ?? ''}`,
    }),
  ),

  // -------------------------------------------------------------------------
  // Fixed recall items
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'absolute-zero',
      d: 1,
      o: 'past-paper',
      t: ['gas laws'],
      q: "By extrapolating Charles's law, the volume of an ideal gas would become zero at:",
      a: tex`$-273.15\,^{\circ}\mathrm{C}$`,
      x: [tex`$0\,^{\circ}\mathrm{C}$`, tex`$273.15\,^{\circ}\mathrm{C}$`, tex`$-173.15\,^{\circ}\mathrm{C}$`],
      e: tex`Charles's law gives $V \propto T$ (in kelvin); $V = 0$ at $0\,\mathrm{K} = -273.15\,^{\circ}\mathrm{C}$, called absolute zero (some older textbooks quote $-273.16\,^{\circ}\mathrm{C}$).`,
    },
    {
      id: 'value-of-r',
      d: 1,
      o: 'past-paper',
      t: ['ideal gas equation'],
      q: tex`The value of the general gas constant $R$ in $\mathrm{dm^{3}\,atm\,K^{-1}\,mol^{-1}}$ is:`,
      a: '$0.0821$',
      x: ['$8.314$', '$1.987$', '$22.414$'],
      e: tex`$R = \dfrac{PV}{nT} = \dfrac{(1)(22.414)}{(1)(273.15)} = 0.0821\,\mathrm{dm^{3}\,atm\,K^{-1}\,mol^{-1}}$. $8.314$ is $R$ in $\mathrm{J\,K^{-1}\,mol^{-1}}$ and $1.987$ in $\mathrm{cal\,K^{-1}\,mol^{-1}}$.`,
    },
    {
      id: 'ideal-behaviour-conditions',
      d: 1,
      o: 'past-paper',
      t: ['non-ideal behaviour'],
      q: 'Real gases show nearly ideal behaviour at:',
      a: 'high temperature and low pressure',
      x: ['low temperature and high pressure', 'low temperature and low pressure', 'high temperature and high pressure'],
      e: 'At low pressure the molecular volume is negligible compared with the container volume, and at high temperature the molecules move too fast for attractions to matter.',
    },
    {
      id: 'van-der-waals-a',
      d: 2,
      t: ['non-ideal behaviour'],
      q: tex`In the van der Waals equation $\left(P + \dfrac{an^2}{V^2}\right)(V - nb) = nRT$, the constant $a$ accounts for:`,
      a: 'attractive forces between gas molecules',
      x: ['the finite volume of gas molecules', 'the speed of gas molecules', 'the mass of gas molecules'],
      e: tex`Attractions reduce the force with which molecules hit the walls, so the observed pressure is less than the ideal pressure; adding $\dfrac{an^2}{V^2}$ to $P$ corrects for this. The constant $b$ (not $a$) corrects for molecular volume.`,
    },
    {
      id: 'compressibility-hydrogen',
      d: 3,
      t: ['non-ideal behaviour'],
      q: tex`At $0\,^{\circ}\mathrm{C}$, which gas has a compressibility factor $Z = \dfrac{PV}{nRT}$ greater than 1 at all pressures?`,
      a: tex`$\ce{H2}$`,
      x: [tex`$\ce{CO2}$`, tex`$\ce{NH3}$`, tex`$\ce{CH4}$`],
      e: tex`$\ce{H2}$ (like He) has very weak intermolecular attractions, so the molecular-volume effect dominates and $Z > 1$ at every pressure. $\ce{CO2}$, $\ce{NH3}$ and $\ce{CH4}$ first show $Z < 1$ at moderate pressures because of attractions.`,
    },
    {
      id: 'linde-method',
      d: 2,
      t: ['non-ideal behaviour'],
      q: "Linde's method for the liquefaction of gases is based on:",
      a: 'the Joule-Thomson effect',
      x: ["Graham's law of diffusion", "Dalton's law of partial pressures", "Boyle's law"],
      e: 'A compressed gas cools when it expands through a small nozzle into a low-pressure region (Joule-Thomson effect), because work is done against intermolecular attractions. Repeating this cools the gas until it liquefies.',
    },
    {
      id: 'plasma-discovery',
      d: 1,
      o: 'past-paper',
      t: ['plasma'],
      q: 'Plasma, often called the fourth state of matter, was first identified in 1879 by:',
      a: 'William Crookes',
      x: ['Robert Boyle', 'John Dalton', 'Thomas Graham'],
      e: 'William Crookes identified plasma ("radiant matter") in a discharge tube in 1879; Irving Langmuir later named it plasma. Boyle, Dalton and Graham are known for gas laws.',
    },
    {
      id: 'kinetic-energy-temperature',
      d: 1,
      t: ['kinetic theory'],
      q: 'According to the kinetic molecular theory, the average kinetic energy of gas molecules is directly proportional to:',
      a: 'the absolute temperature',
      x: ['the temperature in degrees Celsius', 'the molar mass of the gas', 'the square root of the absolute temperature'],
      e: tex`$\bar{E}_k = \frac{3}{2}kT$ with $T$ in kelvin, so average kinetic energy is proportional to absolute temperature and is the same for all gases at a given $T$.`,
    },
    {
      id: 'rms-speed-temperature',
      d: 2,
      t: ['kinetic theory'],
      q: 'If the absolute temperature of a gas is made four times as large, the root mean square speed of its molecules:',
      a: 'is doubled',
      x: ['becomes four times as large', 'becomes sixteen times as large', 'is halved'],
      e: tex`$v_{rms} = \sqrt{\dfrac{3RT}{M}} \propto \sqrt{T}$; making $T$ four times as large multiplies $v_{rms}$ by $\sqrt{4} = 2$.`,
    },
    {
      id: 'dalton-not-applicable',
      d: 2,
      o: 'past-paper',
      t: ['Dalton law'],
      q: "Dalton's law of partial pressures is NOT applicable to a mixture of:",
      a: tex`$\ce{NH3}$ and $\ce{HCl}$`,
      x: [tex`$\ce{N2}$ and $\ce{O2}$`, tex`$\ce{H2}$ and $\ce{He}$`, tex`$\ce{CO2}$ and $\ce{N2}$`],
      e: tex`Dalton's law holds only for gases that do not react. $\ce{NH3}$ and $\ce{HCl}$ react at once: $\ce{NH3 + HCl -> NH4Cl}$ (a white solid).`,
    },
    {
      id: 'boyle-graph',
      d: 2,
      t: ['gas laws'],
      q: tex`For a fixed mass of an ideal gas at constant temperature, a graph of $P$ against $\dfrac{1}{V}$ is:`,
      a: 'a straight line passing through the origin',
      x: ['a hyperbola', 'a straight line parallel to the pressure axis', 'a straight line with a negative slope'],
      e: tex`Boyle's law: $P = \dfrac{k}{V} = k\left(\dfrac{1}{V}\right)$, so $P$ against $\dfrac{1}{V}$ is a straight line through the origin with slope $k$. The hyperbola is the $P$ against $V$ graph.`,
    },
  ]),
]);
