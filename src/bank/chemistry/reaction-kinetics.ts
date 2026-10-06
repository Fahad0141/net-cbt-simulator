import { defineBank } from '@/engine/authoring';
import { ce, num, numericOptions, paren, pickDistractors, q$, qty, sci, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers and data
// ---------------------------------------------------------------------------

/** `x` prints exactly with three significant figures. */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

/** `x` has at most `dp` decimal places. */
function isTidy(x: number, dp = 2): boolean {
  const scaled = x * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

/** Half-lives T for which k = 0.693 / T prints exactly (3 s.f.). */
const HALF_LIFE_K_CASES = (() => {
  const out: Array<{ t: number; k: number }> = [];
  for (let t = 1; t <= 300; t++) {
    const k = 0.693 / t;
    if (exact3(k)) out.push({ t, k: Number(k.toPrecision(3)) });
  }
  return out;
})();

/** Units of the rate constant for overall orders 0-3. */
const K_UNITS: readonly string[] = [
  tex`$\mathrm{mol\,dm^{-3}\,s^{-1}}$`,
  tex`$\mathrm{s^{-1}}$`,
  tex`$\mathrm{dm^{3}\,mol^{-1}\,s^{-1}}$`,
  tex`$\mathrm{dm^{6}\,mol^{-2}\,s^{-1}}$`,
];

const ORDER_WORDS: readonly string[] = ['zero', 'first', 'second', 'third', 'fourth'];

/** Power of a concentration term in a rate law, as LaTeX (exponent 1 is omitted). */
function powTex(species: string, n: number): string {
  if (n === 0) return '';
  return n === 1 ? `[\\mathrm{${species}}]` : `[\\mathrm{${species}}]^{${n}}`;
}

interface Reaction {
  /** mhchem equation. */
  eq: string;
  /** Species with stoichiometric coefficients; `r` = reactant. */
  sp: ReadonlyArray<{ f: string; c: number; r: boolean }>;
}

const REACTIONS: readonly Reaction[] = [
  {
    eq: '2N2O5 -> 4NO2 + O2',
    sp: [
      { f: 'N2O5', c: 2, r: true },
      { f: 'NO2', c: 4, r: false },
      { f: 'O2', c: 1, r: false },
    ],
  },
  {
    eq: 'N2 + 3H2 -> 2NH3',
    sp: [
      { f: 'N2', c: 1, r: true },
      { f: 'H2', c: 3, r: true },
      { f: 'NH3', c: 2, r: false },
    ],
  },
  {
    eq: '4NH3 + 5O2 -> 4NO + 6H2O',
    sp: [
      { f: 'NH3', c: 4, r: true },
      { f: 'O2', c: 5, r: true },
      { f: 'H2O', c: 6, r: false },
    ],
  },
  {
    eq: '2HI -> H2 + I2',
    sp: [
      { f: 'HI', c: 2, r: true },
      { f: 'H2', c: 1, r: false },
      { f: 'I2', c: 1, r: false },
    ],
  },
  {
    eq: '2NO + O2 -> 2NO2',
    sp: [
      { f: 'NO', c: 2, r: true },
      { f: 'O2', c: 1, r: true },
      { f: 'NO2', c: 2, r: false },
    ],
  },
  {
    eq: '2SO2 + O2 -> 2SO3',
    sp: [
      { f: 'SO2', c: 2, r: true },
      { f: 'O2', c: 1, r: true },
      { f: 'SO3', c: 2, r: false },
    ],
  },
  {
    eq: '2H2O2 -> 2H2O + O2',
    sp: [
      { f: 'H2O2', c: 2, r: true },
      { f: 'O2', c: 1, r: false },
    ],
  },
];

/** True statements with reasons. */
const TRUE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'The order of a reaction is found experimentally and may be zero or fractional.',
    'Order is the sum of the exponents in the experimental rate law, so it can be 0, a whole number or a fraction.',
  ],
  [
    'The molecularity of an elementary step is always a whole number.',
    'Molecularity counts the particles colliding in one step, so it can only be 1, 2 or 3.',
  ],
  [
    'A catalyst lowers the activation energy of the forward and the reverse reactions by the same amount.',
    'The catalysed path joins the same reactants and products, so both barriers fall equally and the equilibrium position is unchanged.',
  ],
  [
    'A catalyst is left unchanged in amount and chemical composition at the end of the reaction.',
    'A catalyst takes part in intermediate steps but is regenerated, so it is not used up.',
  ],
  [
    'The half-life of a first-order reaction is independent of the initial concentration.',
    tex`For first order, $t_{1/2} = \dfrac{0.693}{k}$, which contains no concentration term.`,
  ],
  [
    'Raising the temperature increases the fraction of molecules having energy equal to or greater than the activation energy.',
    'At a higher temperature the energy distribution spreads to higher energies, so more collisions are effective.',
  ],
  [
    'The rate constant of a reaction changes when the temperature changes.',
    tex`By the Arrhenius equation $k = Ae^{-E_a/RT}$, $k$ increases with temperature.`,
  ],
];

/** False statements with reasons. */
const FALSE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'A catalyst changes the enthalpy change of the reaction it speeds up.',
    tex`$\Delta H$ depends only on the reactants and products; a catalyst changes the path, not the energies of the end states.`,
  ],
  [
    'A catalyst shifts the position of equilibrium towards the products.',
    'A catalyst speeds up the forward and reverse reactions equally, so equilibrium is reached sooner but its position does not change.',
  ],
  [
    'The molecularity of an elementary step can be zero or fractional.',
    'Molecularity is a count of colliding particles and is always a whole number; only order can be zero or fractional.',
  ],
  [
    'The rate constant of a reaction depends on the initial concentrations of the reactants.',
    'The rate constant depends on temperature (and catalyst), not on concentration; the rate itself depends on concentration.',
  ],
  [
    'Raising the temperature increases the rate mainly by lowering the activation energy.',
    'Temperature does not change the activation energy; it increases the fraction of molecules that can cross it.',
  ],
  [
    'The half-life of a first-order reaction doubles when the initial concentration is doubled.',
    tex`For first order, $t_{1/2} = \dfrac{0.693}{k}$ is independent of the initial concentration.`,
  ],
];

const STATEMENT_REASON = new Map<string, string>([...TRUE_STATEMENTS, ...FALSE_STATEMENTS]);

export default defineBank('chemistry', 'reaction-kinetics', (b) => [
  // -------------------------------------------------------------------------
  // Dynamic templates
  // -------------------------------------------------------------------------
  b.dynamic('first-order-half-life', { difficulty: 1, origin: 'past-paper', tags: ['half-life'] }, (r) => {
    const mode = r.pick(['remaining', 'find-half-life', 'from-k'] as const);
    const unit = r.pick([
      { u: 's', word: 'seconds' },
      { u: 'min', word: 'minutes' },
    ]);
    if (mode === 'remaining') {
      const n = r.int(2, 5);
      const m0 = r.pick([16, 24, 32, 40, 48, 64, 80, 96, 120, 128, 160, 200, 240, 256, 320, 400].filter((m) => isTidy(m / 2 ** n, 2)));
      const t = r.pick([5, 10, 12, 15, 20, 25, 30, 40, 45, 50, 60]);
      const left = m0 / 2 ** n;
      const { answer, distractors } = numericOptions(r, {
        correct: left,
        wrong: [m0 / 2 ** (n - 1), m0 / 2 ** (n + 1), m0 - left, m0 / (2 * n), m0 / n].filter(exact3),
        format: (x) => q$(x, U.g),
      });
      return {
        stem: tex`A reactant decomposes by first-order kinetics with a half-life of $${qty(t, unit.u)}$. Starting with $${qty(m0, U.g)}$, the mass left undecomposed after $${qty(n * t, unit.u)}$ is:`,
        answer,
        distractors,
        explanation: tex`Number of half-lives $= \dfrac{${n * t}}{${t}} = ${n}$. Mass left $= \dfrac{m_0}{2^{n}} = \dfrac{${m0}}{2^{${n}}} = ${num(left)}\,\mathrm{g}$.`,
      };
    }
    if (mode === 'find-half-life') {
      const n = r.int(3, 5);
      const t = r.pick([4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40]);
      const total = n * t;
      const denom = 2 ** n;
      const { answer, distractors } = numericOptions(r, {
        correct: t,
        wrong: [total / denom, total * n, total / (n - 1), total / (n + 1), total / 2],
        format: (x) => q$(x, unit.u),
      });
      return {
        stem: tex`In a first-order reaction, $\dfrac{1}{${denom}}$ of the reactant remains unreacted after $${qty(total, unit.u)}$. The half-life of the reaction is:`,
        answer,
        distractors,
        explanation: tex`$\dfrac{1}{${denom}} = \left(\dfrac{1}{2}\right)^{${n}}$, so ${n} half-lives have passed. $t_{1/2} = \dfrac{${total}}{${n}} = ${num(t)}\,\mathrm{${unit.u}}$.`,
      };
    }
    const { t, k } = r.pick(HALF_LIFE_K_CASES);
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: [1 / k, 0.693 * k, 0.693 / (2 * k), (2 * 0.693) / k, k / 0.693],
      format: (x) => q$(x, unit.u),
    });
    return {
      stem: tex`The rate constant of a first-order reaction is $${qty(num(k), `${unit.u}^{-1}`)}$. Its half-life is:`,
      answer,
      distractors,
      explanation: tex`For a first-order reaction $t_{1/2} = \dfrac{0.693}{k} = \dfrac{0.693}{${num(k)}} = ${num(t)}\,\mathrm{${unit.u}}$.`,
    };
  }),

  b.dynamic('rate-law-scaling', { difficulty: 2, origin: 'past-paper', tags: ['order'] }, (r) => {
    const m = r.int(1, 2);
    const n = r.int(0, 2);
    const law = tex`\text{Rate} = k${powTex('A', m)}${powTex('B', n)}`;
    if (r.chance(0.3)) {
      // Units of k from the rate law.
      const overall = m + n;
      if (overall <= 3) {
        const answer = K_UNITS[overall] as string;
        return {
          stem: tex`For the rate law $${law}$, with concentration in $\mathrm{mol\,dm^{-3}}$ and time in seconds, the unit of the rate constant $k$ is:`,
          answer,
          distractors: K_UNITS.filter((u) => u !== answer),
          explanation: tex`Overall order $= ${m} + ${n} = ${overall}$. $k = \dfrac{\text{rate}}{(\text{conc.})^{${overall}}}$ has unit $\mathrm{mol^{1-n}\,dm^{3(n-1)}\,s^{-1}}$ with $n = ${overall}$, i.e. ${answer}.`,
        };
      }
    }
    const fa = r.pick([2, 3]);
    const fb = r.pick(n === 0 ? [2, 3] : [1, 2, 3]);
    const factor = fa ** m * fb ** n;
    const change =
      fb === 1
        ? `$[\\mathrm{A}]$ is ${fa === 2 ? 'doubled' : 'tripled'} while $[\\mathrm{B}]$ is kept constant`
        : `$[\\mathrm{A}]$ is ${fa === 2 ? 'doubled' : 'tripled'} and $[\\mathrm{B}]$ is ${fb === 2 ? 'doubled' : 'tripled'}`;
    // Mistakes: orders swapped, B taken as first order, orders ignored, effects added,
    // factor multiplied by the order, B ignored; then simple multiples (never 1 = "1 times").
    const wrong = [
      fa ** n * fb ** m,
      fa ** m * fb,
      fa * fb,
      fa ** m + fb ** n,
      m * fa * Math.max(1, n * fb),
      fa ** m,
      2 * factor,
      factor + 1,
      3 * factor,
    ].filter((v) => v >= 2);
    const { answer, distractors } = numericOptions(r, {
      correct: factor,
      wrong,
      format: (x) => `$${num(x)}$ times`,
      fallback: 'integer',
    });
    return {
      stem: tex`For the reaction $\ce{A + B -> products}$, $${law}$. If ${change} (temperature constant), the rate becomes:`,
      answer,
      distractors,
      explanation: tex`New rate / old rate $= (${fa})^{${m}}(${fb})^{${n}} = ${factor}$, since each concentration factor is raised to the order of that reactant.`,
    };
  }),

  b.dynamic('order-from-initial-rates', { difficulty: 2, tags: ['order', 'rate of reaction'] }, (r) => {
    let m = r.int(0, 2);
    let n = r.int(0, 2);
    if (m === 0 && n === 0) {
      if (r.chance(0.5)) m = r.int(1, 2);
      else n = r.int(1, 2);
    }
    const a0 = r.pick([0.1, 0.2]);
    const b0 = r.pick([0.1, 0.2, 0.3]);
    const fa = r.pick([2, 3]);
    const fb = r.pick([2, 3]);
    const r0 = r.pick([1.2, 1.5, 2, 2.4, 2.5, 3, 4, 5]) * 1e-3;
    const rows = [
      [1, a0, b0, r0],
      [2, a0 * fa, b0, r0 * fa ** m],
      [3, a0, b0 * fb, r0 * fb ** n],
    ] as const;
    const table = [
      tex`| Expt. | $[\mathrm{A}]$ / $\mathrm{mol\,dm^{-3}}$ | $[\mathrm{B}]$ / $\mathrm{mol\,dm^{-3}}$ | Initial rate / $\mathrm{mol\,dm^{-3}\,s^{-1}}$ |`,
      '|---|---|---|---|',
      ...rows.map(([e, a, bb, rate]) => `| ${e} | $${num(a)}$ | $${num(bb)}$ | $${sci(rate)}$ |`),
    ].join('\n');
    const ask = r.pick(['A', 'B', 'overall'] as const);
    const correct = ask === 'A' ? m : ask === 'B' ? n : m + n;
    const fmt = (k: number): string => `${ORDER_WORDS[k] as string} order`;
    const answer = fmt(correct);
    const pool = [0, 1, 2, 3, 4].filter((k) => k !== correct).sort((x, y) => Math.abs(x - correct) - Math.abs(y - correct));
    const distractors = pickDistractors(answer, pool.slice(0, 3).map(fmt));
    const what = ask === 'overall' ? 'The overall order of the reaction is:' : `The order of the reaction with respect to $\\mathrm{${ask}}$ is:`;
    return {
      stem: `For the reaction $\\ce{A + B -> products}$ at constant temperature, the following initial-rate data were obtained:\n\n${table}\n\n${what}`,
      answer,
      distractors,
      explanation: tex`Expts 1 and 2: $[\mathrm{A}]$ multiplied by $${fa}$ multiplies the rate by $${fa ** m} = ${fa}^{${m}}$, so order in A $= ${m}$. Expts 1 and 3: $[\mathrm{B}]$ multiplied by $${fb}$ multiplies the rate by $${fb ** n} = ${fb}^{${n}}$, so order in B $= ${n}$. Rate $= k${powTex('A', m)}${powTex('B', n)}$; overall order $= ${m + n}$.`,
    };
  }),

  b.dynamic('stoichiometric-rates', { difficulty: 2, tags: ['rate of reaction'] }, (r) => {
    type Species = Reaction['sp'][number];
    const rx = r.pick(REACTIONS);
    const pairs: Array<[Species, Species]> = [];
    for (const p of rx.sp) for (const q of rx.sp) if (p.c !== q.c) pairs.push([p, q]);
    const [x, y] = r.pick(pairs);
    const u = r.pick([0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2]);
    const vx = x.c * u;
    const vy = y.c * u;
    const word = (s: { r: boolean }): string => (s.r ? 'disappearance' : 'formation');
    const { answer, distractors } = numericOptions(r, {
      correct: vy,
      wrong: [(vx * x.c) / y.c, vx, vx * y.c, u, vx + vy],
      format: (v) => q$(v, 'mol\\,dm^{-3}\\,s^{-1}'),
    });
    return {
      stem: tex`For the reaction $\ce{${rx.eq}}$, the rate of ${word(x)} of $${ce(x.f)}$ is $${qty(vx, 'mol\\,dm^{-3}\\,s^{-1}')}$. The rate of ${word(y)} of $${ce(y.f)}$ is:`,
      answer,
      distractors,
      explanation: tex`Rates of the species are proportional to their coefficients: $\dfrac{\text{rate}(${ce(y.f)})}{\text{rate}(${ce(x.f)})} = \dfrac{${y.c}}{${x.c}}$, so rate $= ${num(vx)} \times \dfrac{${y.c}}{${x.c}} = ${num(vy)}\,\mathrm{mol\,dm^{-3}\,s^{-1}}$.`,
    };
  }),

  b.dynamic('activation-energy-reverse', { difficulty: 2, tags: ['activation energy'] }, (r) => {
    const ef = r.multiple(40, 250, 5);
    const exo = r.chance(0.5);
    const mag = r.multiple(10, Math.min(150, exo ? 150 : ef - 10), 5);
    const dh = exo ? -mag : mag;
    const er = ef - dh;
    const dhTex = qty(dh, U.kJmol);
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: er,
        wrong: [ef + dh, ef, Math.abs(dh), dh - ef, 2 * ef - dh],
        format: (v) => q$(v, U.kJmol),
      });
      return {
        stem: tex`For a reaction, the activation energy of the forward reaction is $${qty(ef, U.kJmol)}$ and $\Delta H = ${dhTex}$. The activation energy of the reverse reaction is:`,
        answer,
        distractors,
        explanation: tex`$\Delta H = E_{a(f)} - E_{a(r)}$, so $E_{a(r)} = E_{a(f)} - \Delta H = ${ef} - ${paren(dh)} = ${er}\,\mathrm{kJ\,mol^{-1}}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: dh,
      wrong: [-dh, ef + er, -(ef + er), ef, er],
      format: (v) => q$(v, U.kJmol),
      allowNegative: true,
    });
    return {
      stem: tex`The activation energy of a forward reaction is $${qty(ef, U.kJmol)}$ and that of the reverse reaction is $${qty(er, U.kJmol)}$. The enthalpy change $\Delta H$ of the forward reaction is:`,
      answer,
      distractors,
      explanation: tex`$\Delta H = E_{a(f)} - E_{a(r)} = ${ef} - ${er} = ${dh}\,\mathrm{kJ\,mol^{-1}}$ (${exo ? 'exothermic' : 'endothermic'}).`,
    };
  }),

  b.dynamic('kinetics-statements', { difficulty: 1, tags: ['order', 'activation energy', 'catalysis'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about reaction kinetics is correct?',
      negativeStem: 'Which of the following statements about reaction kinetics is incorrect?',
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
      id: 'unit-of-rate',
      d: 1,
      o: 'past-paper',
      t: ['rate of reaction'],
      q: 'The rate of a reaction is commonly expressed in the unit:',
      a: tex`$\mathrm{mol\,dm^{-3}\,s^{-1}}$`,
      x: [tex`$\mathrm{mol\,dm^{-3}}$`, tex`$\mathrm{dm^{3}\,mol^{-1}\,s^{-1}}$`, tex`$\mathrm{mol\,s}$`],
      e: tex`Rate $= \dfrac{\text{change in concentration}}{\text{time}}$, so its unit is $\mathrm{mol\,dm^{-3}}$ per second. $\mathrm{dm^{3}\,mol^{-1}\,s^{-1}}$ is the unit of a second-order rate constant.`,
    },
    {
      id: 'first-order-half-life-independent',
      d: 1,
      o: 'past-paper',
      t: ['half-life'],
      q: 'The half-life of a first-order reaction:',
      a: 'is independent of the initial concentration',
      x: [
        'is directly proportional to the initial concentration',
        'is inversely proportional to the initial concentration',
        'is proportional to the square of the initial concentration',
      ],
      e: tex`$t_{1/2} = \dfrac{0.693}{k}$ for a first-order reaction, which has no concentration term. (In general $t_{1/2} \propto \dfrac{1}{a^{n-1}}$, and $n - 1 = 0$ here.)`,
    },
    {
      id: 'second-order-half-life',
      d: 2,
      t: ['half-life', 'order'],
      q: 'For a second-order reaction, if the initial concentration of the reactant is doubled, the half-life:',
      a: 'becomes half',
      x: ['becomes double', 'remains unchanged', 'becomes one-fourth'],
      e: tex`$t_{1/2} \propto \dfrac{1}{a^{n-1}}$; for $n = 2$, $t_{1/2} \propto \dfrac{1}{a}$, so doubling $a$ halves the half-life. It stays unchanged only for first order.`,
    },
    {
      id: 'zero-order-example',
      d: 2,
      t: ['order'],
      q: 'Which of the following is a zero-order reaction?',
      a: tex`photochemical combination of $\ce{H2}$ and $\ce{Cl2}$`,
      x: [tex`decomposition of $\ce{N2O5}$`, tex`$\ce{2NO + O2 -> 2NO2}$`, tex`$\ce{H2 + I2 -> 2HI}$`],
      e: tex`In light, the rate of $\ce{H2 + Cl2 -> 2HCl}$ depends on the light intensity, not on the reactant concentrations, so it is zero order. Decomposition of $\ce{N2O5}$ is first order, $\ce{2NO + O2}$ is third order and $\ce{H2 + I2}$ is second order.`,
    },
    {
      id: 'pseudo-first-order',
      d: 2,
      t: ['order'],
      q: 'The acid-catalysed hydrolysis of ethyl acetate in a large excess of water behaves as a:',
      a: 'first-order (pseudo-first-order) reaction',
      x: ['zero-order reaction', 'second-order reaction', 'third-order reaction'],
      e: tex`Rate $= k[\text{ester}][\ce{H2O}]$, but water is in such excess that its concentration stays practically constant, so rate $= k'[\text{ester}]$: first order.`,
    },
    {
      id: 'catalyst-lowers-ea',
      d: 1,
      o: 'past-paper',
      t: ['catalysis', 'activation energy'],
      q: 'A catalyst increases the rate of a reaction by:',
      a: 'providing an alternative path of lower activation energy',
      x: [
        'increasing the activation energy of the reaction',
        'increasing the average kinetic energy of the molecules',
        'making the reaction more exothermic',
      ],
      e: 'A catalyst opens a new reaction path with a lower energy barrier, so more collisions are effective at the same temperature. It does not change the kinetic energy of molecules or $\\Delta H$.',
    },
    {
      id: 'catalyst-and-equilibrium',
      d: 2,
      t: ['catalysis'],
      q: 'When a catalyst is added to a reversible reaction:',
      a: 'equilibrium is reached sooner but its position is unchanged',
      x: [
        'the equilibrium constant increases',
        'the equilibrium shifts towards the products',
        'only the forward reaction becomes faster',
      ],
      e: 'A catalyst lowers the activation energy of the forward and reverse reactions equally, so both speed up by the same factor; the equilibrium constant and composition stay the same.',
    },
    {
      id: 'autocatalysis-permanganate',
      d: 2,
      o: 'past-paper',
      t: ['catalysis'],
      q: tex`In the titration of oxalic acid with acidified $\ce{KMnO4}$, the reaction speeds up after it starts because of the autocatalytic action of:`,
      a: tex`$\ce{Mn^{2+}}$ ions`,
      x: [tex`$\ce{K+}$ ions`, tex`$\ce{SO4^{2-}}$ ions`, tex`$\ce{CO2}$ gas`],
      e: tex`$\ce{Mn^{2+}}$ ions are a product of the reduction of $\ce{MnO4-}$ and catalyse the reaction, so the rate rises as they form. A product acting as catalyst is called autocatalysis.`,
    },
    {
      id: 'arrhenius-plot-slope',
      d: 2,
      t: ['activation energy'],
      q: tex`According to the Arrhenius equation, a graph of $\ln k$ against $\dfrac{1}{T}$ is a straight line with slope:`,
      a: tex`$-\dfrac{E_a}{R}$`,
      x: [tex`$\dfrac{E_a}{R}$`, tex`$-\dfrac{E_a}{RT}$`, tex`$\ln A$`],
      e: tex`$k = Ae^{-E_a/RT}$ gives $\ln k = \ln A - \dfrac{E_a}{R}\cdot\dfrac{1}{T}$. The slope is $-\dfrac{E_a}{R}$ and the intercept is $\ln A$.`,
    },
    {
      id: 'ten-degree-rule',
      d: 1,
      o: 'past-paper',
      t: ['activation energy', 'rate of reaction'],
      q: tex`For many reactions near room temperature, a rise of $10\,\mathrm{K}$ in temperature:`,
      a: 'roughly doubles the rate',
      x: ['roughly halves the rate', 'increases the rate about ten times', 'leaves the rate unchanged'],
      e: 'A 10 K rise roughly doubles the fraction of molecules with energy at least equal to the activation energy, so the rate nearly doubles.',
    },
    {
      id: 'promoter-haber',
      d: 2,
      t: ['catalysis'],
      q: 'In the Haber process, molybdenum added to the iron catalyst acts as a:',
      a: 'promoter',
      x: ['catalytic poison', 'negative catalyst', 'autocatalyst'],
      e: tex`A promoter is a substance that increases the activity of a catalyst. Molybdenum enhances the activity of iron in $\ce{N2 + 3H2 <=> 2NH3}$.`,
    },
    {
      id: 'catalytic-poison',
      d: 1,
      t: ['catalysis'],
      q: 'A substance that reduces or destroys the activity of a catalyst is called a:',
      a: 'catalytic poison',
      x: ['promoter', 'autocatalyst', 'homogeneous catalyst'],
      e: tex`Poisons, such as arsenic compounds for the platinum catalyst in the contact process, block the active sites of a catalyst. A promoter does the opposite.`,
    },
    {
      id: 'heterogeneous-catalysis',
      d: 2,
      t: ['catalysis'],
      q: 'Which of the following is an example of heterogeneous catalysis?',
      a: 'hydrogenation of vegetable oil in the presence of nickel',
      x: [
        'oxidation of sulphur dioxide catalysed by nitric oxide in the lead chamber process',
        'hydrolysis of an ester catalysed by dilute acid',
        'oxidation of oxalic acid catalysed by manganese(II) ions',
      ],
      e: 'In hydrogenation, solid Ni catalyses a reaction of liquid oil and gaseous hydrogen, so catalyst and reactants are in different phases. In the other three, catalyst and reactants are in the same phase (homogeneous catalysis).',
    },
  ]),
]);
