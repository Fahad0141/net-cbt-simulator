import { defineBank } from '@/engine/authoring';
import { num, numericOptions, statementQuestion, tex } from '@/engine/helpers';

/** A statement with the reason it is true, or the correction that shows it is false. */
interface Claim {
  s: string;
  why: string;
}

const reasonOf = (list: readonly Claim[], text: string): string =>
  list.find((c) => c.s === text)?.why ?? '';

const NL = '\n';
const KJMOL = '\\,\\mathrm{kJ\\,mol^{-1}}';

/** Signed enthalpy value for math mode: +121, -349, 0. */
const dh = (x: number, dp?: number): string => {
  const t = dp === undefined ? num(x) : num(x, { dp });
  return x > 0 ? `+${t}` : t;
};

/** Enthalpy option: `$-787\,\mathrm{kJ\,mol^{-1}}$`. */
const dh$ = (x: number, dp?: number): string => `$${dh(x, dp)}${KJMOL}$`;

/** Value in parentheses when negative, for substitution lines. */
const p = (x: number, dp?: number): string => {
  const t = dp === undefined ? num(x) : num(x, { dp });
  return x < 0 ? `(${t})` : t;
};

// ---------------------------------------------------------------- enthalpy statement pools

const ENTHALPY_TRUE: readonly Claim[] = [
  {
    s: 'Enthalpy is a state function.',
    why: 'The change in enthalpy depends only on the initial and final states of the system, not on the path followed.',
  },
  {
    s: tex`For an exothermic reaction $\Delta H$ is negative.`,
    why: tex`In an exothermic reaction the products have less enthalpy than the reactants, so $\Delta H = H_{\text{products}} - H_{\text{reactants}} < 0$.`,
  },
  {
    s: tex`At constant pressure, $\Delta H = \Delta E + P\Delta V$.`,
    why: tex`By definition $H = E + PV$, so at constant pressure $\Delta H = \Delta E + P\Delta V$.`,
  },
  {
    s: 'The standard enthalpy of formation of an element in its standard state is zero.',
    why: tex`Elements in their most stable form at $298\,\mathrm{K}$ and $1\,\mathrm{atm}$ (e.g. $\ce{O2(g)}$, graphite) are assigned $\Delta H_f^{\circ} = 0$ by convention.`,
  },
  {
    s: 'Heat absorbed at constant volume is equal to the change in internal energy.',
    why: tex`At constant volume no pressure-volume work is done, so by the first law $q_v = \Delta E$.`,
  },
  {
    s: 'The standard enthalpy of combustion of a substance is always negative.',
    why: 'Combustion always releases heat, so enthalpies of combustion are exothermic (negative).',
  },
];

const ENTHALPY_FALSE: readonly Claim[] = [
  {
    s: 'Heat absorbed by a system is given a negative sign.',
    why: tex`By convention heat absorbed by the system is positive ($+q$); heat released by the system is negative.`,
  },
  {
    s: 'In an endothermic reaction the products have less enthalpy than the reactants.',
    why: tex`In an endothermic reaction heat is absorbed, so the products have more enthalpy than the reactants and $\Delta H > 0$.`,
  },
  {
    s: 'Work done by a system is a state function.',
    why: 'Work depends on the path by which a change is carried out, so it is not a state function.',
  },
  {
    s: 'The absolute enthalpy of a substance can be measured directly.',
    why: tex`Only changes in enthalpy ($\Delta H$) can be measured; the absolute value of $H$ cannot.`,
  },
  {
    s: tex`Standard enthalpy changes are measured at $0^{\circ}\mathrm{C}$ and $1\,\mathrm{atm}$.`,
    why: tex`Standard conditions for thermochemistry are $25^{\circ}\mathrm{C}$ ($298\,\mathrm{K}$) and $1\,\mathrm{atm}$; $0^{\circ}\mathrm{C}$ belongs to STP for gases.`,
  },
  {
    s: tex`The standard enthalpy of formation of $\ce{O2(g)}$ is negative.`,
    why: tex`$\ce{O2(g)}$ is an element in its standard state, so its $\Delta H_f^{\circ}$ is zero.`,
  },
];

// ---------------------------------------------------------------- formation-enthalpy data

/** FSc-level standard enthalpies of formation, kJ/mol. */
const HF: Readonly<Record<string, { tex: string; v: number }>> = {
  CH4: { tex: '\\ce{CH4(g)}', v: -74.8 },
  CO2: { tex: '\\ce{CO2(g)}', v: -393.5 },
  CO: { tex: '\\ce{CO(g)}', v: -110.5 },
  H2Ol: { tex: '\\ce{H2O(l)}', v: -285.8 },
  H2Og: { tex: '\\ce{H2O(g)}', v: -241.8 },
  C2H6: { tex: '\\ce{C2H6(g)}', v: -84.7 },
  C2H4: { tex: '\\ce{C2H4(g)}', v: 52.3 },
  C2H2: { tex: '\\ce{C2H2(g)}', v: 226.7 },
  C2H5OH: { tex: '\\ce{C2H5OH(l)}', v: -277.7 },
  NH3: { tex: '\\ce{NH3(g)}', v: -46.1 },
  NO: { tex: '\\ce{NO(g)}', v: 90.3 },
  SO2: { tex: '\\ce{SO2(g)}', v: -296.8 },
  SO3: { tex: '\\ce{SO3(g)}', v: -395.7 },
  Fe2O3: { tex: '\\ce{Fe2O3(s)}', v: -824.2 },
};

type Term = readonly [number, keyof typeof HF];

interface FormationReaction {
  equation: string;
  reactants: readonly Term[];
  products: readonly Term[];
  /** Elements in their standard states that appear in the equation. */
  elements: string;
}

const FORMATION_REACTIONS: readonly FormationReaction[] = [
  {
    equation: '\\ce{CH4(g) + 2O2(g) -> CO2(g) + 2H2O(l)}',
    reactants: [[1, 'CH4']],
    products: [[1, 'CO2'], [2, 'H2Ol']],
    elements: '\\ce{O2(g)}',
  },
  {
    equation: '\\ce{C2H4(g) + H2(g) -> C2H6(g)}',
    reactants: [[1, 'C2H4']],
    products: [[1, 'C2H6']],
    elements: '\\ce{H2(g)}',
  },
  {
    equation: '\\ce{C2H2(g) + 2H2(g) -> C2H6(g)}',
    reactants: [[1, 'C2H2']],
    products: [[1, 'C2H6']],
    elements: '\\ce{H2(g)}',
  },
  {
    equation: '\\ce{Fe2O3(s) + 3CO(g) -> 2Fe(s) + 3CO2(g)}',
    reactants: [[1, 'Fe2O3'], [3, 'CO']],
    products: [[3, 'CO2']],
    elements: '\\ce{Fe(s)}',
  },
  {
    equation: '\\ce{2SO2(g) + O2(g) -> 2SO3(g)}',
    reactants: [[2, 'SO2']],
    products: [[2, 'SO3']],
    elements: '\\ce{O2(g)}',
  },
  {
    equation: '\\ce{4NH3(g) + 5O2(g) -> 4NO(g) + 6H2O(g)}',
    reactants: [[4, 'NH3']],
    products: [[4, 'NO'], [6, 'H2Og']],
    elements: '\\ce{O2(g)}',
  },
  {
    equation: '\\ce{C2H5OH(l) + 3O2(g) -> 2CO2(g) + 3H2O(l)}',
    reactants: [[1, 'C2H5OH']],
    products: [[2, 'CO2'], [3, 'H2Ol']],
    elements: '\\ce{O2(g)}',
  },
  {
    equation: '\\ce{2CO(g) + O2(g) -> 2CO2(g)}',
    reactants: [[2, 'CO']],
    products: [[2, 'CO2']],
    elements: '\\ce{O2(g)}',
  },
];

const hfOf = (k: keyof typeof HF): number => (HF[k] as { v: number }).v;
const sumTerms = (terms: readonly Term[], ignoreCoef = false): number =>
  terms.reduce((acc, [c, k]) => acc + (ignoreCoef ? 1 : c) * hfOf(k), 0);
const termsTex = (terms: readonly Term[]): string =>
  terms.map(([c, k]) => (c === 1 ? p(hfOf(k), 1) : `${c}(${num(hfOf(k), { dp: 1 })})`)).join(' + ');

// ---------------------------------------------------------------- Born-Haber data

interface BornHaber {
  salt: string;
  metal: string;
  halogen: string;
  /** Enthalpy of formation of the solid salt. */
  hf: number;
  /** Atomization (sublimation) of the metal. */
  sub: number;
  /** First ionization energy of the metal. */
  ie: number;
  /** Atomization of the halogen, per mole of halogen atoms (half the bond energy, or from Br2(l)). */
  half: number;
  /** Electron affinity of the halogen. */
  ea: number;
}

const BORN_HABER: readonly BornHaber[] = [
  { salt: 'NaCl', metal: 'Na', halogen: 'Cl', hf: -411, sub: 108, ie: 496, half: 121, ea: -349 },
  { salt: 'KCl', metal: 'K', halogen: 'Cl', hf: -437, sub: 89, ie: 419, half: 121, ea: -349 },
  { salt: 'LiF', metal: 'Li', halogen: 'F', hf: -616, sub: 161, ie: 520, half: 79, ea: -328 },
  { salt: 'NaF', metal: 'Na', halogen: 'F', hf: -574, sub: 108, ie: 496, half: 79, ea: -328 },
  { salt: 'KBr', metal: 'K', halogen: 'Br', hf: -394, sub: 89, ie: 419, half: 112, ea: -325 },
];

const latticeOf = (d: BornHaber): number => d.hf - d.sub - d.ie - d.half - d.ea;

export default defineBank('chemistry', 'thermochemistry', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('calorimetry-heat', { difficulty: 1, origin: 'past-paper', tags: ['calorimetry'] }, (r) => {
    const m = r.multiple(50, 500, 50);
    const dT = r.int(2, 25);
    const qJ = 4.18 * m * dT; // integer because 4.18 x 50 = 209
    const qkJ = qJ / 1000;
    const fmtKJ = (x: number): string => `$${num(x, { dp: 3 })}\\,\\mathrm{kJ}$`;

    if (r.chance(0.6)) {
      const { answer, distractors } = numericOptions(r, {
        correct: qkJ,
        wrong: [qJ, (m * dT) / 1000, (4.18 * m * (dT + 273)) / 1000, (4.18 * m) / dT / 1000],
        format: fmtKJ,
        fallback: 'scale',
      });
      return {
        stem: tex`In a calorimeter, $${m}\,\mathrm{g}$ of water ($c = 4.18\,\mathrm{J\,g^{-1}\,K^{-1}}$) is warmed by $${dT}\,\mathrm{K}$. The heat absorbed by the water is:`,
        answer,
        distractors,
        explanation: tex`$q = mc\Delta T = (${m})(4.18)(${dT}) = ${num(qJ)}\,\mathrm{J} = ${num(qkJ, { dp: 3 })}\,\mathrm{kJ}$.`,
      };
    }

    const { answer, distractors } = numericOptions(r, {
      correct: dT,
      wrong: [4.18 * dT, dT + 273, dT / 1000, 2 * dT],
      format: (x) => `$${num(x)}\\,\\mathrm{K}$`,
      fallback: 'integer',
    });
    return {
      stem: tex`When $${num(qkJ, { dp: 3 })}\,\mathrm{kJ}$ of heat is absorbed by $${m}\,\mathrm{g}$ of water ($c = 4.18\,\mathrm{J\,g^{-1}\,K^{-1}}$) in a calorimeter, its temperature rises by:`,
      answer,
      distractors,
      explanation: tex`$\Delta T = \dfrac{q}{mc} = \dfrac{${num(qJ)}\,\mathrm{J}}{(${m})(4.18)} = ${dT}\,\mathrm{K}$. A temperature change has the same size in kelvin and in degrees Celsius, so no 273 is added.`,
    };
  }),

  b.dynamic('hess-law-combine', { difficulty: 2, tags: ['Hess law'] }, (r) => {
    let a = 0;
    let c = 0;
    let target = 0;
    let correct = 0;
    for (let i = 0; i < 20; i++) {
      a = r.nonZero(-40, 40) * 10;
      c = r.nonZero(-30, 30) * 10;
      target = r.int(0, 2);
      correct = target === 0 ? a + 2 * c : target === 1 ? -(a + 2 * c) : a / 2 + c;
      if (correct !== 0 && a + c !== 0 && Math.abs(a) !== Math.abs(2 * c)) break;
    }
    const equations = ['\\ce{A -> 2C}', '\\ce{2C -> A}', '\\ce{1/2A -> C}'];
    const wrongs =
      target === 0
        ? [a + c, a - 2 * c, -(a + 2 * c), 2 * a + c]
        : target === 1
          ? [a + 2 * c, -(a + c), 2 * c - a, -a - c / 2]
          : [a + c, (a + c) / 2, a + 2 * c, -(a / 2 + c)];
    const working =
      target === 0
        ? tex`Target $=$ (i) $+\,2\times$(ii): $\Delta H = ${p(a)} + 2(${num(c)})$`
        : target === 1
          ? tex`Target $=$ reverse of [(i) $+\,2\times$(ii)]: $\Delta H = -[${p(a)} + 2(${num(c)})]$`
          : tex`Target $= \tfrac{1}{2}\times$(i) $+$ (ii): $\Delta H = \tfrac{1}{2}(${num(a)}) + ${p(c)}$`;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: wrongs,
      format: (x) => dh$(x),
      fallback: 'offset',
      allowNegative: true,
    });
    return {
      stem: tex`For the hypothetical reactions${NL}(i) $\ce{A -> 2B}$, $\Delta H_1 = ${dh(a)}${KJMOL}$${NL}(ii) $\ce{B -> C}$, $\Delta H_2 = ${dh(c)}${KJMOL}$${NL}By Hess's law, $\Delta H$ for $${equations[target] as string}$ is:`,
      answer,
      distractors,
      explanation: tex`${working} $= ${dh(correct)}${KJMOL}$. Multiplying an equation multiplies its $\Delta H$, and reversing it changes the sign.`,
    };
  }),

  b.dynamic('enthalpy-from-formation', { difficulty: 2, tags: ['enthalpy', 'Hess law'] }, (r) => {
    const rx = r.pick(FORMATION_REACTIONS);
    const prod = sumTerms(rx.products);
    const reac = sumTerms(rx.reactants);
    const correct = prod - reac;
    const species = [...rx.reactants, ...rx.products].map(([, k]) => HF[k] as { tex: string; v: number });
    const data = species.map((s) => `$${s.tex}$: $${dh(s.v, 1)}$`).join(', ');
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        -correct,
        sumTerms(rx.products, true) - sumTerms(rx.reactants, true),
        prod + reac,
        prod,
      ],
      format: (x) => dh$(x, 1),
      fallback: 'offset',
      allowNegative: true,
    });
    return {
      stem: tex`Standard enthalpies of formation (in $\mathrm{kJ\,mol^{-1}}$) are: ${data}. The standard enthalpy change for $${rx.equation}$ is:`,
      answer,
      distractors,
      explanation: tex`$\Delta H^{\circ} = \sum \Delta H_f^{\circ}(\text{products}) - \sum \Delta H_f^{\circ}(\text{reactants}) = [${termsTex(rx.products)}] - [${termsTex(rx.reactants)}] = ${dh(correct, 1)}${KJMOL}$. $\Delta H_f^{\circ}$ of $${rx.elements}$ (an element in its standard state) is zero.`,
    };
  }),

  b.dynamic('born-haber-cycle', { difficulty: 2, origin: 'past-paper', tags: ['Born-Haber cycle'] }, (r) => {
    const d = r.pick(BORN_HABER);
    const U = latticeOf(d);
    const unknown = r.weighted(['lattice', 'formation', 'affinity'] as const, [3, 1, 1]);
    const M = d.metal;
    const X = d.halogen;
    const lines: Record<string, string> = {
      formation: tex`enthalpy of formation of $\ce{${d.salt}(s)}$ $= ${dh(d.hf)}$`,
      sub: tex`atomization of $\ce{${M}}$ $= ${dh(d.sub)}$`,
      ie: tex`first ionization energy of $\ce{${M}}$ $= ${dh(d.ie)}$`,
      half: tex`atomization of the halogen (per mole of $\ce{${X}}$ atoms) $= ${dh(d.half)}$`,
      affinity: tex`electron affinity of $\ce{${X}}$ $= ${dh(d.ea)}$`,
      lattice: tex`lattice energy of $\ce{${d.salt}}$ $= ${dh(U)}$`,
    };
    const given = ['formation', 'sub', 'ie', 'half', 'affinity', 'lattice']
      .filter((k) => k !== unknown)
      .map((k) => lines[k] as string)
      .join('; ');
    const cycle = tex`$\Delta H_f = \Delta H_{at}(\ce{${M}}) + IE + \Delta H_{at}(\ce{${X}}) + EA + U$`;

    let correct: number;
    let wrong: number[];
    let ask: string;
    let solve: string;
    if (unknown === 'lattice') {
      correct = U;
      wrong = [U - d.half, U + 2 * d.ea, -U, U + d.ie];
      ask = tex`the lattice energy of $\ce{${d.salt}}$ ($\Delta H$ for $\ce{${M}+(g) + ${X}-(g) -> ${d.salt}(s)}$)`;
      solve = tex`$U = ${p(d.hf)} - ${d.sub} - ${d.ie} - ${d.half} - ${p(d.ea)} = ${dh(U)}${KJMOL}$`;
    } else if (unknown === 'formation') {
      correct = d.hf;
      wrong = [d.hf + d.half, d.hf - 2 * d.ea, -d.hf, d.hf - 2 * U];
      ask = tex`the enthalpy of formation of $\ce{${d.salt}(s)}$`;
      solve = tex`$\Delta H_f = ${d.sub} + ${d.ie} + ${d.half} + ${p(d.ea)} + ${p(U)} = ${dh(d.hf)}${KJMOL}$`;
    } else {
      correct = d.ea;
      wrong = [-d.ea, d.ea - d.half, d.ea + d.half, d.ea - d.ie];
      ask = tex`the electron affinity of $\ce{${X}}$ ($\Delta H$ for $\ce{${X}(g) + e- -> ${X}-(g)}$)`;
      solve = tex`$EA = ${p(d.hf)} - ${d.sub} - ${d.ie} - ${d.half} - ${p(U)} = ${dh(d.ea)}${KJMOL}$`;
    }
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong,
      format: (x) => dh$(x),
      fallback: 'offset',
      allowNegative: true,
    });
    return {
      stem: tex`Use the following data (all in $\mathrm{kJ\,mol^{-1}}$): ${given}. By the Born-Haber cycle, ${ask} is:`,
      answer,
      distractors,
      explanation: tex`By Hess's law, ${cycle}. Hence ${solve}.`,
    };
  }),

  b.dynamic('enthalpy-statements', { difficulty: 1, tags: ['enthalpy'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about thermochemistry is correct?',
      negativeStem: 'Which of the following statements about thermochemistry is NOT correct?',
      truths: ENTHALPY_TRUE.map((c) => c.s),
      falsehoods: ENTHALPY_FALSE.map((c) => c.s),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false: ${reasonOf(ENTHALPY_FALSE, answer)}`
          : `This statement is true: ${reasonOf(ENTHALPY_TRUE, answer)}`,
    }),
  ),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'neutralization-strong',
      d: 1,
      o: 'past-paper',
      t: ['enthalpy'],
      q: 'The enthalpy of neutralization of a strong acid by a strong base in dilute aqueous solution is:',
      a: tex`about $-57\,\mathrm{kJ\,mol^{-1}}$`,
      x: [tex`about $+57\,\mathrm{kJ\,mol^{-1}}$`, tex`about $-114\,\mathrm{kJ\,mol^{-1}}$`, tex`about $-13.7\,\mathrm{kJ\,mol^{-1}}$`],
      e: tex`Every strong acid-strong base pair reacts as $\ce{H+(aq) + OH-(aq) -> H2O(l)}$, which releases about $57\,\mathrm{kJ}$ per mole of water formed, so $\Delta H \approx -57\,\mathrm{kJ\,mol^{-1}}$ (about $-13.7\,\mathrm{kcal\,mol^{-1}}$, not kJ).`,
    },
    {
      id: 'neutralization-weak-acid',
      d: 2,
      t: ['enthalpy'],
      q: tex`The heat released when $\ce{CH3COOH}$ is neutralized by $\ce{NaOH}$ is less than that for $\ce{HCl}$ with $\ce{NaOH}$ because:`,
      a: 'part of the heat is used to ionize the weak acid',
      x: [
        'acetic acid is a stronger acid than hydrochloric acid',
        'less water is formed per mole of acid',
        'sodium acetate is insoluble in water',
      ],
      e: tex`Acetic acid is only partly ionized; some of the energy released by $\ce{H+ + OH- -> H2O}$ is absorbed in ionizing the remaining $\ce{CH3COOH}$, so the net heat evolved is less than $57\,\mathrm{kJ\,mol^{-1}}$.`,
    },
    {
      id: 'standard-conditions',
      d: 1,
      o: 'past-paper',
      t: ['enthalpy'],
      q: 'Standard enthalpy changes are measured at:',
      a: tex`$25^{\circ}\mathrm{C}$ and $1\,\mathrm{atm}$`,
      x: [
        tex`$0^{\circ}\mathrm{C}$ and $1\,\mathrm{atm}$`,
        tex`$25^{\circ}\mathrm{C}$ and $2\,\mathrm{atm}$`,
        tex`$100^{\circ}\mathrm{C}$ and $1\,\mathrm{atm}$`,
      ],
      e: tex`Thermochemical standard conditions are $298\,\mathrm{K}$ ($25^{\circ}\mathrm{C}$) and $1\,\mathrm{atm}$; $0^{\circ}\mathrm{C}$ and $1\,\mathrm{atm}$ is STP used for gas volumes.`,
    },
    {
      id: 'zero-formation-enthalpy',
      d: 1,
      o: 'past-paper',
      t: ['enthalpy'],
      q: 'Which of the following has a standard enthalpy of formation equal to zero?',
      a: tex`$\ce{O2(g)}$`,
      x: [tex`$\ce{O3(g)}$`, tex`$\ce{H2O(l)}$`, tex`$\ce{C}$ (diamond)`],
      e: tex`$\Delta H_f^{\circ}$ is zero only for an element in its most stable (standard) form. $\ce{O2(g)}$ qualifies; ozone and diamond are less stable allotropes, and water is a compound.`,
    },
    {
      id: 'hess-law-basis',
      d: 1,
      o: 'past-paper',
      t: ['Hess law'],
      q: "Hess's law of constant heat summation is a consequence of the:",
      a: 'law of conservation of energy',
      x: ['law of conservation of mass', 'law of mass action', 'Le Chatelier principle'],
      e: "If two routes between the same initial and final states gave different heat changes, energy could be created by going one way and returning the other. Hess's law follows from the first law of thermodynamics (conservation of energy).",
    },
    {
      id: 'born-haber-purpose',
      d: 1,
      t: ['Born-Haber cycle'],
      q: 'The Born-Haber cycle is mainly used to calculate the:',
      a: 'lattice energy of an ionic compound',
      x: ['bond energy of a covalent molecule', 'activation energy of a reaction', 'heat of neutralization of an acid'],
      e: "Lattice energy cannot be measured directly. The Born-Haber cycle applies Hess's law to the formation of an ionic solid from its elements to calculate it from measurable quantities.",
    },
    {
      id: 'largest-lattice-energy',
      d: 2,
      t: ['Born-Haber cycle'],
      q: 'Which of the following has the largest magnitude of lattice energy?',
      a: tex`$\ce{MgO}$`,
      x: [tex`$\ce{NaCl}$`, tex`$\ce{KCl}$`, tex`$\ce{NaF}$`],
      e: tex`Lattice energy increases with the charges on the ions and decreases with their size. $\ce{MgO}$ contains small doubly charged ions ($\ce{Mg^2+}$, $\ce{O^2-}$), so its lattice energy (about $-3800\,\mathrm{kJ\,mol^{-1}}$) is far larger than that of the singly charged salts.`,
    },
    {
      id: 'bomb-calorimeter',
      d: 2,
      t: ['calorimetry'],
      q: 'The heat change measured directly in a bomb calorimeter is equal to the:',
      a: tex`change in internal energy, $\Delta E$`,
      x: [tex`change in enthalpy, $\Delta H$`, tex`change in entropy, $\Delta S$`, tex`change in free energy, $\Delta G$`],
      e: tex`A bomb calorimeter is a sealed steel vessel, so the reaction occurs at constant volume and $q_v = \Delta E$. $\Delta H$ ($= q_p$) is measured at constant pressure, e.g. in a glass calorimeter.`,
    },
    {
      id: 'delta-h-equals-delta-e',
      d: 2,
      t: ['enthalpy'],
      q: tex`For which reaction is $\Delta H$ equal to $\Delta E$?`,
      a: tex`$\ce{H2(g) + Cl2(g) -> 2HCl(g)}$`,
      x: [
        tex`$\ce{N2(g) + 3H2(g) -> 2NH3(g)}$`,
        tex`$\ce{PCl5(g) -> PCl3(g) + Cl2(g)}$`,
        tex`$\ce{2SO2(g) + O2(g) -> 2SO3(g)}$`,
      ],
      e: tex`$\Delta H = \Delta E + \Delta n_g RT$. For $\ce{H2 + Cl2 -> 2HCl}$, $\Delta n_g = 2 - 2 = 0$, so $\Delta H = \Delta E$. The others have $\Delta n_g = -2$, $+1$ and $-1$.`,
    },
    {
      id: 'endothermic-process',
      d: 1,
      t: ['enthalpy'],
      q: 'Which of the following processes is endothermic?',
      a: tex`Decomposition of $\ce{CaCO3}$ into $\ce{CaO}$ and $\ce{CO2}$`,
      x: [
        'Combustion of methane in air',
        tex`Neutralization of $\ce{HCl}$ by $\ce{NaOH}$`,
        'Formation of water from hydrogen and oxygen',
      ],
      e: tex`Strong heating is needed to decompose limestone ($\Delta H \approx +178\,\mathrm{kJ\,mol^{-1}}$). Combustion, neutralization and the formation of water all release heat.`,
    },
    {
      id: 'not-state-function',
      d: 1,
      t: ['enthalpy'],
      q: 'Which of the following is NOT a state function?',
      a: 'Work',
      x: ['Enthalpy', 'Internal energy', 'Temperature'],
      e: 'Work (like heat) depends on the path by which a change is made. Enthalpy, internal energy and temperature depend only on the state of the system.',
    },
    {
      id: 'combustion-equals-formation',
      d: 2,
      t: ['enthalpy', 'Hess law'],
      q: 'The standard enthalpy of combustion of graphite is numerically equal to the standard enthalpy of formation of:',
      a: tex`$\ce{CO2(g)}$`,
      x: [tex`$\ce{CO(g)}$`, tex`$\ce{O2(g)}$`, tex`$\ce{C}$ (diamond)`],
      e: tex`Complete combustion of graphite, $\ce{C(graphite) + O2(g) -> CO2(g)}$, is also the formation of one mole of $\ce{CO2}$ from its elements in their standard states, so both equal $-393.5\,\mathrm{kJ\,mol^{-1}}$. Burning to $\ce{CO}$ is incomplete combustion.`,
    },
  ]),
]);
