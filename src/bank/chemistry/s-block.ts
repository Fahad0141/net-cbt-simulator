import { defineBank } from '@/engine/authoring';
import { ce, num, numericOptions, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface Carbonate {
  /** mhchem formula of the carbonate. */
  f: string;
  /** mhchem formula of the oxide left on heating. */
  ox: string;
  /** Molar masses, g mol^-1 (FSc-rounded). */
  m: number;
  mOx: number;
}

/** Carbonates that decompose on heating: MCO3 -> MO + CO2 (1 : 1 : 1). */
const CARBONATES: readonly Carbonate[] = [
  { f: 'MgCO3', ox: 'MgO', m: 84, mOx: 40 },
  { f: 'CaCO3', ox: 'CaO', m: 100, mOx: 56 },
  { f: 'BaCO3', ox: 'BaO', m: 197, mOx: 153 },
  { f: 'Li2CO3', ox: 'Li2O', m: 74, mOx: 30 },
];

interface ActiveMetal {
  sym: string;
  name: string;
  ar: number;
  /** Moles of H2 released per mole of metal. */
  h2: number;
  eq: string;
}

const WATER_METALS: readonly ActiveMetal[] = [
  { sym: 'Li', name: 'lithium', ar: 7, h2: 0.5, eq: '2Li + 2H2O -> 2LiOH + H2' },
  { sym: 'Na', name: 'sodium', ar: 23, h2: 0.5, eq: '2Na + 2H2O -> 2NaOH + H2' },
  { sym: 'K', name: 'potassium', ar: 39, h2: 0.5, eq: '2K + 2H2O -> 2KOH + H2' },
  { sym: 'Ca', name: 'calcium', ar: 40, h2: 1, eq: 'Ca + 2H2O -> Ca(OH)2 + H2' },
  { sym: 'Ba', name: 'barium', ar: 137, h2: 1, eq: 'Ba + 2H2O -> Ba(OH)2 + H2' },
];

interface MetalCompound {
  f: string;
  /** Total mass of the metal atoms in one formula unit. */
  metal: number;
  /** Formula mass. */
  total: number;
  name: string;
  work: string;
  /** Atomic masses given in the stem. */
  ar: string;
}

/** Compounds whose percentage of metal is an exact short decimal. */
const METAL_COMPOUNDS: readonly MetalCompound[] = [
  { f: 'CaCO3', metal: 40, total: 100, name: 'calcium', work: '40 + 12 + 3(16)', ar: 'Ca = 40, C = 12, O = 16' },
  { f: 'MgO', metal: 24, total: 40, name: 'magnesium', work: '24 + 16', ar: 'Mg = 24, O = 16' },
  { f: 'NaOH', metal: 23, total: 40, name: 'sodium', work: '23 + 16 + 1', ar: 'Na = 23, O = 16, H = 1' },
  { f: 'LiH', metal: 7, total: 8, name: 'lithium', work: '7 + 1', ar: 'Li = 7, H = 1' },
  { f: 'CaC2', metal: 40, total: 64, name: 'calcium', work: '40 + 2(12)', ar: 'Ca = 40, C = 12' },
  { f: 'Mg3N2', metal: 72, total: 100, name: 'magnesium', work: '3(24) + 2(14)', ar: 'Mg = 24, N = 14' },
  { f: 'MgSO4', metal: 24, total: 120, name: 'magnesium', work: '24 + 32 + 4(16)', ar: 'Mg = 24, S = 32, O = 16' },
  { f: 'KH', metal: 39, total: 40, name: 'potassium', work: '39 + 1', ar: 'K = 39, H = 1' },
];

interface TrendItem {
  q: string;
  options: readonly string[];
  answer: string;
  e: string;
}

const ALKALI = ['lithium', 'sodium', 'potassium', 'caesium'] as const;
const G2_SULPHATES = ['MgSO4', 'CaSO4', 'SrSO4', 'BaSO4'].map((f) => `$${ce(f)}$`);
const G2_HYDROXIDES = ['Mg(OH)2', 'Ca(OH)2', 'Sr(OH)2', 'Ba(OH)2'].map((f) => `$${ce(f)}$`);
const G2_CARBONATES = ['MgCO3', 'CaCO3', 'SrCO3', 'BaCO3'].map((f) => `$${ce(f)}$`);
const G2_OXIDES = ['BeO', 'MgO', 'CaO', 'BaO'].map((f) => `$${ce(f)}$`);

const TRENDS: readonly TrendItem[] = [
  {
    q: 'Among lithium, sodium, potassium and caesium, the element with the largest atomic radius is:',
    options: ALKALI,
    answer: 'caesium',
    e: 'Atomic radius increases down a group as new shells are added, so caesium (period 6) is the largest of these.',
  },
  {
    q: 'Among lithium, sodium, potassium and caesium, the element with the highest first ionization energy is:',
    options: ALKALI,
    answer: 'lithium',
    e: 'Lithium has the smallest atom, so its valence electron is held most strongly; ionization energy decreases down the group.',
  },
  {
    q: 'Among lithium, sodium, potassium and caesium, the metal with the highest melting point is:',
    options: ALKALI,
    answer: 'lithium',
    e: 'Metallic bonding weakens down the group as atoms grow larger, so melting points fall from lithium (about 181 °C) to caesium (about 28 °C).',
  },
  {
    q: 'Among lithium, sodium, potassium and caesium, the metal that reacts most vigorously with cold water is:',
    options: ALKALI,
    answer: 'caesium',
    e: 'Reactivity of alkali metals with water increases down the group because the valence electron is lost more easily; caesium reacts explosively.',
  },
  {
    q: 'Among the alkali metal ions, the one that is most heavily hydrated in water is:',
    options: ['$\\ce{Li+}$', '$\\ce{Na+}$', '$\\ce{K+}$', '$\\ce{Cs+}$'],
    answer: '$\\ce{Li+}$',
    e: tex`The smallest ion, $\ce{Li+}$, has the highest charge density and attracts the most water molecules, giving the largest hydration energy.`,
  },
  {
    q: 'Which of the following sulphates is the least soluble in water?',
    options: G2_SULPHATES,
    answer: `$${ce('BaSO4')}$`,
    e: tex`Solubility of group II sulphates decreases down the group because lattice energy falls more slowly than hydration energy; $\ce{BaSO4}$ is practically insoluble.`,
  },
  {
    q: 'Which of the following sulphates is the most soluble in water?',
    options: G2_SULPHATES,
    answer: `$${ce('MgSO4')}$`,
    e: tex`The small $\ce{Mg^2+}$ ion has a large hydration energy, so $\ce{MgSO4}$ is very soluble; sulphate solubility decreases down to $\ce{BaSO4}$.`,
  },
  {
    q: 'Which of the following hydroxides is the most soluble in water?',
    options: G2_HYDROXIDES,
    answer: `$${ce('Ba(OH)2')}$`,
    e: tex`Unlike the sulphates, group II hydroxides become more soluble down the group, so $\ce{Ba(OH)2}$ is the most soluble and $\ce{Mg(OH)2}$ the least.`,
  },
  {
    q: 'Which of the following carbonates is the most stable to heat?',
    options: G2_CARBONATES,
    answer: `$${ce('BaCO3')}$`,
    e: tex`Larger cations polarize the carbonate ion less, so thermal stability increases down the group; $\ce{BaCO3}$ decomposes at the highest temperature.`,
  },
  {
    q: 'Which of the following oxides is the most basic?',
    options: G2_OXIDES,
    answer: `$${ce('BaO')}$`,
    e: tex`Basic character of group II oxides increases down the group as metallic character increases; $\ce{BeO}$ is amphoteric and $\ce{BaO}$ is the most basic.`,
  },
];

const TRUE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'Sodium and potassium are stored under kerosene oil.',
    'They react quickly with oxygen and moisture in air, so they are kept under an inert liquid such as kerosene.',
  ],
  [
    'Beryllium oxide is amphoteric.',
    tex`$\ce{BeO}$ dissolves in both acids and strong bases, unlike the basic oxides of the heavier group II metals.`,
  ],
  [
    'Lithium carbonate decomposes on heating, unlike sodium carbonate.',
    tex`The small $\ce{Li+}$ ion polarizes the carbonate ion: $\ce{Li2CO3 -> Li2O + CO2}$. This is one way lithium resembles magnesium.`,
  ],
  [
    'Solubility of group II sulphates decreases down the group.',
    tex`Hydration energy falls faster than lattice energy, so $\ce{MgSO4}$ is soluble while $\ce{BaSO4}$ is practically insoluble.`,
  ],
  [
    'Thermal stability of group II carbonates increases down the group.',
    'Larger cations have lower polarizing power and distort the carbonate ion less, so the carbonate is harder to decompose.',
  ],
  [
    'Lithium reacts directly with nitrogen to form a nitride.',
    tex`$\ce{6Li + N2 -> 2Li3N}$; among alkali metals only lithium does this, another resemblance to magnesium.`,
  ],
  [
    'Alkali metals are strong reducing agents.',
    'They lose their single valence electron easily (low ionization energy), so they readily reduce other species.',
  ],
];

const FALSE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'Atomic radius of alkali metals decreases down the group.',
    'Atomic radius increases down the group because a new shell is added in each period.',
  ],
  [
    'Reactivity of alkali metals with water decreases from lithium to caesium.',
    'Reactivity with water increases down the group; caesium reacts most violently.',
  ],
  [
    'Beryllium hydroxide is a strong base.',
    tex`$\ce{Be(OH)2}$ is amphoteric; basic strength of group II hydroxides increases down the group.`,
  ],
  [
    'Barium carbonate decomposes on heating more easily than magnesium carbonate.',
    tex`Thermal stability of group II carbonates increases down the group, so $\ce{MgCO3}$ decomposes far more easily than $\ce{BaCO3}$.`,
  ],
  [
    'Solubility of group II hydroxides decreases down the group.',
    tex`Hydroxide solubility increases down the group: $\ce{Mg(OH)2}$ is sparingly soluble while $\ce{Ba(OH)2}$ is fairly soluble.`,
  ],
  [
    'Sodium carbonate decomposes into sodium oxide on gentle heating.',
    tex`$\ce{Na2CO3}$ is stable to heat; among alkali metal carbonates only $\ce{Li2CO3}$ decomposes.`,
  ],
  [
    'Alkaline earth metals have lower first ionization energies than the alkali metals of the same period.',
    'Group II atoms are smaller and have a higher nuclear charge, so their first ionization energies are higher.',
  ],
];

const STATEMENT_REASON = new Map<string, string>([...TRUE_STATEMENTS, ...FALSE_STATEMENTS]);

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 's-block', (b) => [
  b.dynamic('metal-water-hydrogen', { difficulty: 2, origin: 'past-paper', tags: ['alkali metals', 'alkaline earth metals'] }, (r) => {
    const metal = r.pick(WATER_METALS);
    const n = r.pick(metal.ar > 100 ? [0.1, 0.2, 0.5, 1] : [0.1, 0.2, 0.4, 0.5, 1, 1.5, 2, 3]);
    const mass = n * metal.ar;
    const nH2 = n * metal.h2;
    const vol = nH2 * 22.4;
    const wrongRatio = metal.h2 === 1 ? 0.5 : 1;
    const { answer, distractors } = numericOptions(r, {
      correct: vol,
      wrong: [
        n * wrongRatio * 22.4, // wrong mole ratio of metal to hydrogen
        nH2 * 44.8, // counted H2 as two moles of hydrogen atoms
        nH2 * 11.2, // halved the molar volume
        nH2 * 24, // used the room-temperature molar volume
      ],
      format: (x) => q$(x, U.dm3),
    });
    return {
      stem: tex`$${qty(mass, U.g)}$ of ${metal.name} reacts completely with water. The volume of hydrogen gas produced at STP is:`,
      answer,
      distractors,
      explanation: tex`$\ce{${metal.eq}}$. $n_{\ce{${metal.sym}}} = \dfrac{${num(mass)}}{${metal.ar}} = ${num(n)}\,\mathrm{mol}$. The mole ratio $\ce{${metal.sym}}$ : $\ce{H2}$ is ${metal.h2 === 1 ? '1 : 1' : '2 : 1'}, so $n_{\ce{H2}} = ${num(nH2)}\,\mathrm{mol}$ and $V = (${num(nH2)})(22.4) = ${num(vol)}\,\mathrm{dm^{3}}$.`,
    };
  }),

  b.dynamic('carbonate-decomposition', { difficulty: 2, tags: ['alkaline earth metals', 'compounds and uses'] }, (r) => {
    const c = r.pick(CARBONATES);
    const n = r.pick(c.m > 150 ? [0.1, 0.2, 0.5, 1] : [0.1, 0.2, 0.25, 0.5, 1, 1.5, 2]);
    const mass = n * c.m;
    const eqn = tex`$\ce{${c.f} -> ${c.ox} + CO2}$`;
    const mode = r.pick(['co2-mass', 'co2-volume', 'oxide-mass'] as const);
    const lead = tex`When $${qty(mass, U.g)}$ of $${ce(c.f)}$ is heated strongly until it decomposes completely,`;
    const moles = tex`${eqn}. $n = \dfrac{${num(mass)}}{${c.m}} = ${num(n)}\,\mathrm{mol}$`;
    if (mode === 'co2-volume') {
      const v = n * 22.4;
      const { answer, distractors } = numericOptions(r, {
        correct: v,
        wrong: [v * 2, v / 2, n * 24, n * 44],
        format: (x) => q$(x, U.dm3),
      });
      return {
        stem: tex`${lead} the volume of $${ce('CO2')}$ released at STP is:`,
        answer,
        distractors,
        explanation: tex`${moles}, giving $${num(n)}\,\mathrm{mol}$ $\ce{CO2}$. $V = (${num(n)})(22.4) = ${num(v)}\,\mathrm{dm^{3}}$.`,
      };
    }
    if (mode === 'co2-mass') {
      const m = n * 44;
      const { answer, distractors } = numericOptions(r, {
        correct: m,
        wrong: [n * c.mOx, n * 22.4, m * 2, m / 2],
        format: (x) => q$(x, U.g),
      });
      return {
        stem: tex`${lead} the mass of $${ce('CO2')}$ released is:`,
        answer,
        distractors,
        explanation: tex`${moles}, giving $${num(n)}\,\mathrm{mol}$ $\ce{CO2}$. $m = (${num(n)})(44) = ${num(m)}\,\mathrm{g}$.`,
      };
    }
    const m = n * c.mOx;
    const { answer, distractors } = numericOptions(r, {
      correct: m,
      wrong: [n * 44, mass, m * 2, m / 2],
      format: (x) => q$(x, U.g),
    });
    return {
      stem: tex`${lead} the mass of $${ce(c.ox)}$ left behind is:`,
      answer,
      distractors,
      explanation: tex`${moles}, giving $${num(n)}\,\mathrm{mol}$ $\ce{${c.ox}}$. $m = (${num(n)})(${c.mOx}) = ${num(m)}\,\mathrm{g}$ (equivalently $${num(mass)} - ${num(n * 44)} = ${num(m)}\,\mathrm{g}$ after losing $\ce{CO2}$).`,
    };
  }),

  b.dynamic('percent-metal', { difficulty: 1, tags: ['compounds and uses'] }, (r) => {
    const c = r.pick(METAL_COMPOUNDS);
    const p = (100 * c.metal) / c.total;
    const { answer, distractors } = numericOptions(r, {
      correct: p,
      wrong: [
        100 - p, // percentage of the rest of the compound
        c.metal < c.total - c.metal ? (100 * c.metal) / (c.total - c.metal) : NaN, // divided by the non-metal mass
        p / 2,
        Math.min(99, p + 10),
      ],
      format: (x) => tex`$${num(x)}\%$`,
    });
    return {
      stem: tex`Using the atomic masses ${c.ar}, the percentage by mass of ${c.name} in $${ce(c.f)}$ is:`,
      answer,
      distractors,
      explanation: tex`$M(\ce{${c.f}}) = ${c.work} = ${c.total}\,\mathrm{g\,mol^{-1}}$. Percentage $= \dfrac{${c.metal}}{${c.total}} \times 100 = ${num(p)}\%$.`,
    };
  }),

  b.dynamic('group-trends', { difficulty: 1, tags: ['alkali metals', 'alkaline earth metals'] }, (r) => {
    const t = r.pick(TRENDS);
    return {
      stem: t.q,
      answer: t.answer,
      distractors: t.options.filter((o) => o !== t.answer),
      explanation: t.e,
    };
  }),

  b.dynamic('s-block-statements', { difficulty: 1, tags: ['alkali metals', 'alkaline earth metals', 'diagonal relationship'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about s-block elements is correct?',
      negativeStem: 'Which of the following statements about s-block elements is incorrect?',
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
      id: 'castner-kellner-by-products',
      d: 1,
      o: 'past-paper',
      t: ['compounds and uses'],
      q: tex`Besides $\ce{NaOH}$, the two other products of the Castner-Kellner process (electrolysis of brine) are:`,
      a: tex`$\ce{Cl2}$ and $\ce{H2}$`,
      x: [tex`$\ce{O2}$ and $\ce{H2}$`, tex`$\ce{Cl2}$ and $\ce{O2}$`, tex`$\ce{Na}$ and $\ce{Cl2}$`],
      e: tex`Chlorine is released at the graphite anodes. Sodium discharged at the flowing mercury cathode forms sodium amalgam, whose sodium then reacts with water, $\ce{2Na + 2H2O -> 2NaOH + H2}$, and the mercury is recycled. Sodium metal and chlorine are the products of the Downs cell (molten $\ce{NaCl}$).`,
    },
    {
      id: 'lithium-diagonal-partner',
      d: 1,
      o: 'past-paper',
      t: ['diagonal relationship'],
      q: 'Lithium shows a diagonal relationship with:',
      a: 'magnesium',
      x: ['sodium', 'beryllium', 'aluminium'],
      e: tex`Lithium (group I, period 2) and magnesium (group II, period 3) lie diagonally to each other; $\ce{Li+}$ (76 pm) and $\ce{Mg^2+}$ (72 pm) are similar in size and have comparable polarizing power, and the two metals have similar electronegativities. Beryllium pairs diagonally with aluminium.`,
    },
    {
      id: 'beryllium-aluminium-similarity',
      d: 2,
      t: ['diagonal relationship'],
      q: 'Due to their diagonal relationship, beryllium and aluminium both:',
      a: 'form amphoteric oxides and hydroxides',
      x: ['form strongly ionic chlorides', 'react vigorously with cold water', 'form stable superoxides on burning'],
      e: tex`$\ce{BeO}$ and $\ce{Al2O3}$ (and their hydroxides) dissolve in both acids and alkalis. Their chlorides are largely covalent, and neither metal reacts readily with cold water.`,
    },
    {
      id: 'plaster-of-paris',
      d: 1,
      o: 'past-paper',
      t: ['compounds and uses'],
      q: 'The chemical formula of plaster of Paris is:',
      a: tex`$\ce{CaSO4.1/2H2O}$`,
      x: [tex`$\ce{CaSO4.2H2O}$`, tex`$\ce{MgSO4.7H2O}$`, tex`$\ce{Ca(OH)2}$`],
      e: tex`Heating gypsum, $\ce{CaSO4.2H2O}$, to about 120 °C removes most of its water and gives plaster of Paris, $\ce{CaSO4.1/2H2O}$ (that is, $\ce{(CaSO4)2.H2O}$). $\ce{MgSO4.7H2O}$ is Epsom salt.`,
    },
    {
      id: 'potassium-flame-colour',
      d: 1,
      o: 'past-paper',
      t: ['alkali metals'],
      q: 'Potassium salts give a flame colour that is:',
      a: 'lilac (violet)',
      x: ['golden yellow', 'crimson red', 'apple green'],
      e: 'Potassium gives a lilac flame. Golden yellow is sodium, crimson red is lithium (or strontium) and apple green is barium.',
    },
    {
      id: 'slaked-lime',
      d: 1,
      o: 'past-paper',
      t: ['compounds and uses'],
      q: 'Slaked lime is the common name of:',
      a: tex`$\ce{Ca(OH)2}$`,
      x: [tex`$\ce{CaO}$`, tex`$\ce{CaCO3}$`, tex`$\ce{CaSO4}$`],
      e: tex`Quicklime, $\ce{CaO}$, is "slaked" by water: $\ce{CaO + H2O -> Ca(OH)2}$. $\ce{CaCO3}$ is limestone.`,
    },
    {
      id: 'epsom-salt',
      d: 1,
      t: ['compounds and uses'],
      q: 'Epsom salt, used as a purgative, is:',
      a: tex`$\ce{MgSO4.7H2O}$`,
      x: [tex`$\ce{CaSO4.2H2O}$`, tex`$\ce{Na2SO4.10H2O}$`, tex`$\ce{Na2CO3.10H2O}$`],
      e: tex`Epsom salt is hydrated magnesium sulphate. $\ce{CaSO4.2H2O}$ is gypsum, $\ce{Na2SO4.10H2O}$ is Glauber's salt and $\ce{Na2CO3.10H2O}$ is washing soda.`,
    },
    {
      id: 'potassium-superoxide',
      d: 2,
      t: ['alkali metals'],
      q: 'When potassium burns in excess oxygen, the main product is:',
      a: tex`$\ce{KO2}$`,
      x: [tex`$\ce{K2O}$`, tex`$\ce{K2O2}$`, tex`$\ce{KOH}$`],
      e: tex`The large $\ce{K+}$ ion stabilizes the large superoxide ion $\ce{O2^-}$, so $\ce{K + O2 -> KO2}$. Lithium gives the normal oxide $\ce{Li2O}$ and sodium the peroxide $\ce{Na2O2}$.`,
    },
    {
      id: 'lithium-strongest-reductant',
      d: 3,
      t: ['alkali metals'],
      q: 'In aqueous solution, the strongest reducing agent among the alkali metals is:',
      a: 'lithium',
      x: ['caesium', 'potassium', 'sodium'],
      e: tex`Although lithium has the highest ionization energy, the very large hydration energy of the small $\ce{Li+}$ ion gives lithium the most negative standard electrode potential ($E^\circ \approx -3.04\,\mathrm{V}$), so it is the strongest reducing agent in water.`,
    },
    {
      id: 'lithium-nitride',
      d: 1,
      t: ['alkali metals', 'diagonal relationship'],
      q: 'Which alkali metal combines directly with nitrogen to form a nitride?',
      a: 'lithium',
      x: ['sodium', 'potassium', 'rubidium'],
      e: tex`$\ce{6Li + N2 -> 2Li3N}$. Like magnesium (which gives $\ce{Mg3N2}$), lithium forms a nitride; the other alkali metals do not.`,
    },
    {
      id: 'becl2-covalent',
      d: 2,
      t: ['alkaline earth metals'],
      q: tex`Beryllium chloride, $\ce{BeCl2}$, is largely covalent because:`,
      a: tex`the small $\ce{Be^2+}$ ion has a very high polarizing power`,
      x: [
        tex`beryllium has the lowest ionization energy in group II`,
        tex`the $\ce{Be^2+}$ ion is larger than the $\ce{Cl-}$ ion`,
        tex`beryllium has a completely filled $p$ subshell`,
      ],
      e: tex`A tiny, doubly charged cation strongly distorts the electron cloud of $\ce{Cl-}$, giving covalent character (Fajans' rules). Beryllium actually has the highest ionization energy in group II.`,
    },
  ]),
]);
