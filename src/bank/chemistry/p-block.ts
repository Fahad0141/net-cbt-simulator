import { defineBank } from '@/engine/authoring';
import { ce, num, numericOptions, pickDistractors, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Oxidation numbers of p-block elements in common compounds
// ---------------------------------------------------------------------------

interface OxCase {
  /** mhchem formula of the compound. */
  f: string;
  /** Element whose oxidation number is asked. */
  el: string;
  /** Correct oxidation number. */
  ox: number;
  /** Balance equation in LaTeX (x = oxidation number of `el`). */
  eq: string;
  tag: string;
  /** The atoms of `el` are not all equivalent, so ask for the average oxidation number. */
  avg?: boolean;
  /** Extra remark appended to the explanation. */
  note?: string;
}

const OX_CASES: readonly OxCase[] = [
  { f: 'HNO3', el: 'N', ox: 5, eq: '(+1) + x + 3(-2) = 0', tag: 'nitrogen and phosphorus' },
  { f: 'HNO2', el: 'N', ox: 3, eq: '(+1) + x + 2(-2) = 0', tag: 'nitrogen and phosphorus' },
  { f: 'NH3', el: 'N', ox: -3, eq: 'x + 3(+1) = 0', tag: 'nitrogen and phosphorus' },
  { f: 'N2O', el: 'N', ox: 1, eq: '2x + (-2) = 0', tag: 'nitrogen and phosphorus', avg: true },
  { f: 'NO2', el: 'N', ox: 4, eq: 'x + 2(-2) = 0', tag: 'nitrogen and phosphorus' },
  { f: 'N2H4', el: 'N', ox: -2, eq: '2x + 4(+1) = 0', tag: 'nitrogen and phosphorus' },
  { f: 'H3PO4', el: 'P', ox: 5, eq: '3(+1) + x + 4(-2) = 0', tag: 'nitrogen and phosphorus' },
  { f: 'H3PO3', el: 'P', ox: 3, eq: '3(+1) + x + 3(-2) = 0', tag: 'nitrogen and phosphorus' },
  { f: 'H2SO4', el: 'S', ox: 6, eq: '2(+1) + x + 4(-2) = 0', tag: 'oxygen and sulphur' },
  { f: 'H2SO3', el: 'S', ox: 4, eq: '2(+1) + x + 3(-2) = 0', tag: 'oxygen and sulphur' },
  { f: 'Na2S2O3', el: 'S', ox: 2, eq: '2(+1) + 2x + 3(-2) = 0', tag: 'oxygen and sulphur', avg: true },
  { f: 'H2S', el: 'S', ox: -2, eq: '2(+1) + x = 0', tag: 'oxygen and sulphur' },
  { f: 'H2S2O7', el: 'S', ox: 6, eq: '2(+1) + 2x + 7(-2) = 0', tag: 'oxygen and sulphur' },
  { f: 'OF2', el: 'O', ox: 2, eq: 'x + 2(-1) = 0', tag: 'oxygen and sulphur', note: 'Fluorine, the most electronegative element, is always $-1$, so oxygen is positive here.' },
  { f: 'H2O2', el: 'O', ox: -1, eq: '2(+1) + 2x = 0', tag: 'oxygen and sulphur', note: 'In peroxides oxygen is $-1$, not $-2$.' },
  { f: 'HClO4', el: 'Cl', ox: 7, eq: '(+1) + x + 4(-2) = 0', tag: 'halogens' },
  { f: 'KClO3', el: 'Cl', ox: 5, eq: '(+1) + x + 3(-2) = 0', tag: 'halogens' },
  { f: 'HClO2', el: 'Cl', ox: 3, eq: '(+1) + x + 2(-2) = 0', tag: 'halogens' },
  { f: 'HOCl', el: 'Cl', ox: 1, eq: '(+1) + (-2) + x = 0', tag: 'halogens' },
  { f: 'Cl2O7', el: 'Cl', ox: 7, eq: '2x + 7(-2) = 0', tag: 'halogens' },
  { f: 'IF7', el: 'I', ox: 7, eq: 'x + 7(-1) = 0', tag: 'halogens' },
  { f: 'XeF4', el: 'Xe', ox: 4, eq: 'x + 4(-1) = 0', tag: 'noble gases' },
  { f: 'XeF6', el: 'Xe', ox: 6, eq: 'x + 6(-1) = 0', tag: 'noble gases' },
  { f: 'XeO3', el: 'Xe', ox: 6, eq: 'x + 3(-2) = 0', tag: 'noble gases' },
  { f: 'XeF2', el: 'Xe', ox: 2, eq: 'x + 2(-1) = 0', tag: 'noble gases' },
  { f: 'H3BO3', el: 'B', ox: 3, eq: '3(+1) + x + 3(-2) = 0', tag: 'boron and aluminium' },
  { f: 'Na2B4O7', el: 'B', ox: 3, eq: '2(+1) + 4x + 7(-2) = 0', tag: 'boron and aluminium' },
  { f: 'NaBH4', el: 'B', ox: 3, eq: '(+1) + x + 4(-1) = 0', tag: 'boron and aluminium', note: 'Hydrogen is bonded to the less electronegative boron, so it is a hydride ($-1$).' },
  { f: 'PbO2', el: 'Pb', ox: 4, eq: 'x + 2(-2) = 0', tag: 'carbon and silicon' },
  { f: 'SiCl4', el: 'Si', ox: 4, eq: 'x + 4(-1) = 0', tag: 'carbon and silicon' },
];

const oxTex = (x: number): string => `$${x > 0 ? '+' : ''}${x}$`;

// ---------------------------------------------------------------------------
// Stoichiometry of p-block reactions (all values exact)
// ---------------------------------------------------------------------------

interface StoichCase {
  /** Quantity given in the stem. */
  given: number;
  stem: string;
  correct: number;
  wrong: number[];
  unit: string;
  explanation: string;
  tag: string;
}

function stoichCase(kind: number, n: number): StoichCase {
  switch (kind) {
    case 0: {
      // 2Al + 6HCl -> 2AlCl3 + 3H2
      const mAl = 27 * n;
      const v = 1.5 * n * 22.4;
      return {
        given: mAl,
        stem: tex`Aluminium reacts with excess dilute hydrochloric acid: $\ce{2Al + 6HCl -> 2AlCl3 + 3H2}$. The volume of hydrogen at STP liberated by $${qty(mAl, U.g)}$ of aluminium is:`,
        correct: v,
        wrong: [n * 22.4, (2 / 3) * n * 22.4, 3 * n * 22.4, 0.5 * n * 22.4],
        unit: U.dm3,
        explanation: tex`$n_{\ce{Al}} = \dfrac{${num(mAl)}}{27} = ${num(n)}\,\mathrm{mol}$. From the equation, $2$ mol Al give $3$ mol $\ce{H2}$, so $n_{\ce{H2}} = \dfrac{3}{2}(${num(n)}) = ${num(1.5 * n)}\,\mathrm{mol}$ and $V = (${num(1.5 * n)})(22.4) = ${num(v)}\,\mathrm{dm^{3}}$.`,
        tag: 'boron and aluminium',
      };
    }
    case 1: {
      // N2 + 3H2 -> 2NH3 (Haber process)
      const mN2 = 28 * n;
      const v = 2 * n * 22.4;
      return {
        given: mN2,
        stem: tex`In the Haber process, $\ce{N2 + 3H2 <=> 2NH3}$. If $${qty(mN2, U.g)}$ of nitrogen is completely converted, the volume of ammonia formed at STP is:`,
        correct: v,
        wrong: [n * 22.4, 3 * n * 22.4, 0.5 * n * 22.4, 4 * n * 22.4],
        unit: U.dm3,
        explanation: tex`$n_{\ce{N2}} = \dfrac{${num(mN2)}}{28} = ${num(n)}\,\mathrm{mol}$. One mole of $\ce{N2}$ gives $2$ mol $\ce{NH3}$, so $V = 2(${num(n)})(22.4) = ${num(v)}\,\mathrm{dm^{3}}$.`,
        tag: 'nitrogen and phosphorus',
      };
    }
    case 2: {
      // 2SO2 + O2 -> 2SO3 (Contact process)
      const mSO2 = 64 * n;
      const mSO3 = 80 * n;
      return {
        given: mSO2,
        stem: tex`In the Contact process, $\ce{2SO2 + O2 <=> 2SO3}$. The mass of $\ce{SO3}$ obtained by complete conversion of $${qty(mSO2, U.g)}$ of $\ce{SO2}$ is:`,
        correct: mSO3,
        wrong: [mSO2, 40 * n, 160 * n, 32 * n],
        unit: U.g,
        explanation: tex`$n_{\ce{SO2}} = \dfrac{${num(mSO2)}}{64} = ${num(n)}\,\mathrm{mol}$. The mole ratio $\ce{SO2 : SO3}$ is $2 : 2 = 1 : 1$, so $m_{\ce{SO3}} = (${num(n)})(80) = ${num(mSO3)}\,\mathrm{g}$.`,
        tag: 'oxygen and sulphur',
      };
    }
    case 3: {
      // 4NH3 + 5O2 -> 4NO + 6H2O (gas volumes, same T and P)
      const vNH3 = 8 * n;
      const vO2 = 10 * n;
      return {
        given: vNH3,
        stem: tex`Ammonia is oxidised to nitric oxide: $\ce{4NH3 + 5O2 -> 4NO + 6H2O}$. At the same temperature and pressure, the volume of oxygen needed for $${qty(vNH3, U.dm3)}$ of ammonia is:`,
        correct: vO2,
        wrong: [vNH3, 6.4 * n, 12 * n, 5 * n],
        unit: U.dm3,
        explanation: tex`At the same $T$ and $P$, volume ratios equal mole ratios (Avogadro's law): $V_{\ce{O2}} = \dfrac{5}{4}V_{\ce{NH3}} = \dfrac{5}{4}(${num(vNH3)}) = ${num(vO2)}\,\mathrm{dm^{3}}$.`,
        tag: 'nitrogen and phosphorus',
      };
    }
    default: {
      // 2Al + Fe2O3 -> Al2O3 + 2Fe (thermite)
      const mAl = 27 * n;
      const mFe = 56 * n;
      return {
        given: mAl,
        stem: tex`In the thermite reaction, $\ce{2Al + Fe2O3 -> Al2O3 + 2Fe}$. The mass of iron produced when $${qty(mAl, U.g)}$ of aluminium reacts completely is:`,
        correct: mFe,
        wrong: [mAl, 28 * n, 112 * n, 51 * n],
        unit: U.g,
        explanation: tex`$n_{\ce{Al}} = \dfrac{${num(mAl)}}{27} = ${num(n)}\,\mathrm{mol}$. The mole ratio $\ce{Al : Fe}$ is $2 : 2 = 1 : 1$, so $m_{\ce{Fe}} = (${num(n)})(56) = ${num(mFe)}\,\mathrm{g}$.`,
        tag: 'boron and aluminium',
      };
    }
  }
}

/** Candidate mole amounts; only those giving exact 3-significant-figure values are used. */
const STOICH_MOLES = [0.1, 0.2, 0.25, 0.4, 0.5, 1, 1.5, 2, 2.5, 3, 4];

/** `x` prints exactly with three significant figures. */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

// ---------------------------------------------------------------------------
// Group trends: which member has the extreme property
// ---------------------------------------------------------------------------

interface TrendItem {
  q: string;
  a: string;
  x: readonly [string, string, string];
  e: string;
}

const TRENDS: readonly TrendItem[] = [
  {
    q: 'Among the halogens, the element with the highest electronegativity is:',
    a: 'fluorine',
    x: ['chlorine', 'bromine', 'iodine'],
    e: 'Electronegativity decreases down group VIIA; fluorine (4.0) is the most electronegative element of all.',
  },
  {
    q: 'Among the halogens, the element with the highest electron affinity is:',
    a: 'chlorine',
    x: ['fluorine', 'bromine', 'iodine'],
    e: 'Fluorine is so small that electron-electron repulsion in its compact 2p shell lowers its electron affinity; chlorine therefore has the highest value.',
  },
  {
    q: 'The strongest oxidising agent among the halogens is:',
    a: tex`$\ce{F2}$`,
    x: [tex`$\ce{Cl2}$`, tex`$\ce{Br2}$`, tex`$\ce{I2}$`],
    e: 'Fluorine combines a low F-F bond energy, a very high hydration energy of the small fluoride ion and the highest electronegativity, so it gains electrons most readily.',
  },
  {
    q: 'In aqueous solution, the strongest acid among the hydrogen halides is:',
    a: tex`$\ce{HI}$`,
    x: [tex`$\ce{HF}$`, tex`$\ce{HCl}$`, tex`$\ce{HBr}$`],
    e: 'Acid strength rises down the group because the H-X bond becomes longer and weaker; the H-I bond breaks most easily.',
  },
  {
    q: 'The halogen that is a liquid at room temperature is:',
    a: 'bromine',
    x: ['fluorine', 'chlorine', 'iodine'],
    e: 'Fluorine and chlorine are gases, bromine is a red-brown liquid and iodine is a violet-black solid at room temperature.',
  },
  {
    q: 'Among the following noble gases, the one with the highest boiling point is:',
    a: 'xenon',
    x: ['helium', 'neon', 'argon'],
    e: 'London dispersion forces grow with atomic size and polarisability, so boiling points rise down group VIIIA; xenon is the largest atom listed.',
  },
  {
    q: 'The most abundant noble gas in the Earth’s atmosphere is:',
    a: 'argon',
    x: ['helium', 'neon', 'krypton'],
    e: 'Argon makes up about 0.93% of dry air by volume, far more than all the other noble gases together.',
  },
  {
    q: 'The noble gas that forms the largest number of stable compounds is:',
    a: 'xenon',
    x: ['helium', 'neon', 'argon'],
    e: 'Xenon has the lowest ionisation energy of the stable noble gases, so it forms fluorides, oxides and oxyfluorides such as $\\ce{XeF2}$, $\\ce{XeF4}$ and $\\ce{XeO3}$.',
  },
  {
    q: 'The element with the lowest boiling point of all is:',
    a: 'helium',
    x: ['neon', 'hydrogen', 'argon'],
    e: 'Helium atoms are tiny and barely polarisable, so dispersion forces are extremely weak; helium boils at about 4 K, the lowest of all elements.',
  },
  {
    q: 'The only element of group IIIA that is not a metal is:',
    a: 'boron',
    x: ['aluminium', 'gallium', 'indium'],
    e: 'Boron is a small atom with a high ionisation energy; it forms only covalent compounds and shows non-metallic behaviour, while aluminium, gallium and indium are metals.',
  },
  {
    q: 'The group IVA element for which the +2 oxidation state is the most stable is:',
    a: 'lead',
    x: ['carbon', 'silicon', 'germanium'],
    e: 'The inert pair effect (reluctance of the $ns^2$ electrons to take part in bonding) increases down the group and is most marked in lead, so $\\ce{Pb^{2+}}$ is more stable than $\\ce{Pb^{4+}}$.',
  },
  {
    q: 'The group IVA element with the greatest tendency to show catenation is:',
    a: 'carbon',
    x: ['silicon', 'germanium', 'tin'],
    e: 'The C-C bond is short and strong, so carbon links to itself in long chains and rings far more than any other element.',
  },
  {
    q: 'The most basic hydride of group VA is:',
    a: tex`$\ce{NH3}$`,
    x: [tex`$\ce{PH3}$`, tex`$\ce{AsH3}$`, tex`$\ce{SbH3}$`],
    e: 'The lone pair on the small, electronegative nitrogen atom is most available for donation; basic character falls down the group.',
  },
  {
    q: 'Among the hydrides of group VIA, the one with the highest boiling point is:',
    a: tex`$\ce{H2O}$`,
    x: [tex`$\ce{H2S}$`, tex`$\ce{H2Se}$`, tex`$\ce{H2Te}$`],
    e: 'Water molecules are held together by strong hydrogen bonds, which the other group VIA hydrides cannot form; so water boils far higher (100 °C).',
  },
  {
    q: 'The element of group VA that is a typical metal is:',
    a: 'bismuth',
    x: ['nitrogen', 'phosphorus', 'arsenic'],
    e: 'Metallic character increases down group VA: nitrogen and phosphorus are non-metals, arsenic is a metalloid and bismuth is a metal.',
  },
];

// ---------------------------------------------------------------------------
// Statement pools
// ---------------------------------------------------------------------------

const GROUP_34_TRUE: ReadonlyArray<readonly [string, string]> = [
  [
    'Boric acid is a weak monobasic acid that acts by accepting a hydroxide ion.',
    'In water $\\ce{B(OH)3 + H2O -> [B(OH)4]^- + H+}$: boric acid is a Lewis acid, not a proton donor.',
  ],
  [
    'Aluminium is rendered passive by concentrated nitric acid.',
    'Concentrated $\\ce{HNO3}$ forms a thin protective oxide film on aluminium, which stops further attack.',
  ],
  [
    'Aluminium oxide is amphoteric and dissolves in both acids and alkalis.',
    '$\\ce{Al2O3}$ reacts with acids to give $\\ce{Al^{3+}}$ salts and with alkalis to give aluminates.',
  ],
  [
    'Silicon dioxide has a giant covalent (network) structure.',
    'Each Si atom is bonded tetrahedrally to four O atoms in a three-dimensional network, giving $\\ce{SiO2}$ a very high melting point.',
  ],
  [
    'Graphite conducts electricity whereas diamond does not.',
    'Each carbon in graphite is $sp^2$ hybridised and leaves one delocalised electron free to move; in diamond all four electrons are used in $sp^3$ bonds.',
  ],
  [
    'Carbon monoxide is a neutral oxide.',
    'CO shows neither acidic nor basic behaviour: it gives no acid with water and forms no salts with dilute acids or alkalis, so it is classed as neutral.',
  ],
  [
    'Aluminium chloride exists as the dimer $\\ce{Al2Cl6}$ in the vapour state at moderate temperatures.',
    'Electron-deficient $\\ce{AlCl3}$ completes its octet through chlorine bridges, forming the dimer $\\ce{Al2Cl6}$.',
  ],
];

const GROUP_34_FALSE: ReadonlyArray<readonly [string, string]> = [
  [
    'Boric acid is a strong tribasic protonic acid.',
    'Boric acid is a weak monobasic acid; it accepts $\\ce{OH-}$ rather than donating its three protons.',
  ],
  [
    'Aluminium dissolves rapidly in concentrated nitric acid.',
    'Concentrated $\\ce{HNO3}$ makes aluminium passive by forming a protective oxide layer.',
  ],
  [
    'Silicon dioxide consists of discrete linear molecules like carbon dioxide.',
    '$\\ce{SiO2}$ is a giant covalent network solid; only $\\ce{CO2}$ exists as discrete linear molecules.',
  ],
  [
    'Diamond is a better conductor of electricity than graphite.',
    'Diamond has no free electrons and is an insulator; graphite conducts through its delocalised electrons.',
  ],
  [
    'Carbon monoxide dissolves in water to form carbonic acid.',
    'It is $\\ce{CO2}$ that forms carbonic acid; CO is a neutral oxide.',
  ],
  [
    'Aluminium oxide is a purely basic oxide.',
    '$\\ce{Al2O3}$ is amphoteric: it also dissolves in sodium hydroxide to form sodium aluminate.',
  ],
  [
    'Boron is a typical metal that forms $\\ce{B^{3+}}$ ions in its compounds.',
    'Boron has a very high ionisation energy and forms covalent compounds; it is a non-metal.',
  ],
];

const GROUP_5_8_TRUE: ReadonlyArray<readonly [string, string]> = [
  [
    'Nitrogen is unreactive at room temperature because of its strong triple bond.',
    'The $\\ce{N#N}$ bond energy is about $946\\,\\mathrm{kJ\\,mol^{-1}}$, so the molecule is very difficult to break apart.',
  ],
  [
    'White phosphorus is more reactive than red phosphorus.',
    'White phosphorus consists of strained $\\ce{P4}$ tetrahedra and ignites in air; red phosphorus is polymeric and much less reactive.',
  ],
  [
    'Concentrated sulphuric acid chars sugar by removing the elements of water.',
    'It is a strong dehydrating agent: $\\ce{C12H22O11 -> 12C + 11H2O}$.',
  ],
  [
    'Ozone is an allotrope of oxygen.',
    'Ozone $\\ce{O3}$ and dioxygen $\\ce{O2}$ are different molecular forms of the same element.',
  ],
  [
    'Noble gases have the highest first ionisation energies in their respective periods.',
    'Their completely filled valence shells ($ns^2np^6$, or $1s^2$ for helium) hold electrons very tightly.',
  ],
  [
    'Nitric oxide combines with atmospheric oxygen to form brown nitrogen dioxide.',
    '$\\ce{2NO + O2 -> 2NO2}$; $\\ce{NO2}$ is a reddish-brown gas.',
  ],
  [
    'Fluorine is the strongest oxidising agent among the halogens.',
    'Its low F-F bond energy and the high hydration energy of $\\ce{F-}$ make $\\ce{F2}$ the best electron acceptor.',
  ],
];

const GROUP_5_8_FALSE: ReadonlyArray<readonly [string, string]> = [
  [
    'Red phosphorus is more reactive than white phosphorus.',
    'White phosphorus is the more reactive allotrope; it is stored under water because it catches fire in air.',
  ],
  [
    'Ozone is an isotope of oxygen.',
    'Isotopes differ in neutron number; ozone is an allotrope ($\\ce{O3}$), a different molecule of the same element.',
  ],
  [
    'Iodine is the strongest oxidising agent among the halogens.',
    'Oxidising power decreases down group VIIA; fluorine is the strongest and iodine the weakest.',
  ],
  [
    'Noble gases have the lowest first ionisation energies in their respective periods.',
    'Their filled valence shells give them the highest, not the lowest, ionisation energies of their periods.',
  ],
  [
    'The nitrogen-nitrogen triple bond is weak, which makes nitrogen highly reactive at room temperature.',
    'The $\\ce{N#N}$ bond is one of the strongest known; nitrogen is inert at room temperature.',
  ],
  [
    'Helium was the first noble gas found to form a stable compound.',
    'The first noble gas compound, $\\ce{XePtF6}$, was a xenon compound (Bartlett, 1962); helium forms no compound that is stable under ordinary conditions.',
  ],
  [
    'Hydrogen fluoride is the strongest acid among the hydrogen halides in water.',
    'HF is the weakest hydrohalic acid because the H-F bond is very strong; HI is the strongest.',
  ],
];

const REASON = new Map<string, string>([...GROUP_34_TRUE, ...GROUP_34_FALSE, ...GROUP_5_8_TRUE, ...GROUP_5_8_FALSE]);

const explainStatement = (answer: string, inverted: boolean): string =>
  `${inverted ? 'This statement is false.' : 'This statement is true.'} ${REASON.get(answer) ?? ''}`;

export default defineBank('chemistry', 'p-block', (b) => [
  // -------------------------------------------------------------------------
  // Dynamic templates
  // -------------------------------------------------------------------------
  b.dynamic(
    'oxidation-number-p-block',
    {
      difficulty: 1,
      origin: 'past-paper',
      tags: ['nitrogen and phosphorus', 'oxygen and sulphur', 'halogens', 'noble gases', 'boron and aluminium', 'carbon and silicon'],
    },
    (r) => {
      const c = r.pick(OX_CASES);
      const { answer, distractors } = numericOptions(r, {
        correct: c.ox,
        wrong: [-c.ox, c.ox - 2, c.ox + 2, c.ox - 1, c.ox + 1].filter((x) => x >= -4 && x <= 8),
        format: oxTex,
        allowNegative: true,
        allowZero: true,
      });
      return {
        stem: tex`The ${c.avg ? 'average ' : ''}oxidation number of $\ce{${c.el}}$ in $${ce(c.f)}$ is:`,
        answer,
        distractors,
        explanation: tex`Let the ${c.avg ? 'average ' : ''}oxidation number of $\ce{${c.el}}$ be $x$. The compound is neutral: $${c.eq}$, so $x = ${c.ox > 0 ? '+' : ''}${c.ox}$.${c.note ? ` ${c.note}` : ''}`,
      };
    },
  ),

  b.dynamic('p-block-reaction-stoichiometry', { difficulty: 2, tags: ['boron and aluminium', 'nitrogen and phosphorus', 'oxygen and sulphur'] }, (r) => {
    const kind = r.int(0, 4);
    const moles = STOICH_MOLES.filter((n) => {
      const t = stoichCase(kind, n);
      return exact3(t.correct) && exact3(t.given);
    });
    const c = stoichCase(kind, r.pick(moles));
    const { answer, distractors } = numericOptions(r, {
      correct: c.correct,
      wrong: c.wrong.filter(exact3),
      format: (x) => q$(x, c.unit),
    });
    return { stem: c.stem, answer, distractors, explanation: c.explanation };
  }),

  b.dynamic(
    'group-trend-extremes',
    { difficulty: 1, tags: ['halogens', 'noble gases', 'carbon and silicon', 'boron and aluminium', 'nitrogen and phosphorus', 'oxygen and sulphur'] },
    (r) => {
      const t = r.pick(TRENDS);
      return { stem: t.q, answer: t.a, distractors: pickDistractors(t.a, t.x), explanation: t.e };
    },
  ),

  b.dynamic('statements-groups-iiia-iva', { difficulty: 2, tags: ['boron and aluminium', 'carbon and silicon'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about group IIIA and IVA elements is correct?',
      negativeStem: 'Which of the following statements about group IIIA and IVA elements is incorrect?',
      truths: GROUP_34_TRUE.map(([s]) => s),
      falsehoods: GROUP_34_FALSE.map(([s]) => s),
      explain: explainStatement,
    }),
  ),

  b.dynamic(
    'statements-groups-va-viiia',
    { difficulty: 2, tags: ['nitrogen and phosphorus', 'oxygen and sulphur', 'halogens', 'noble gases'] },
    (r) =>
      statementQuestion(r, {
        stem: 'Which of the following statements about the elements of groups VA to VIIIA is correct?',
        negativeStem: 'Which of the following statements about the elements of groups VA to VIIIA is incorrect?',
        truths: GROUP_5_8_TRUE.map(([s]) => s),
        falsehoods: GROUP_5_8_FALSE.map(([s]) => s),
        explain: explainStatement,
      }),
  ),

  // -------------------------------------------------------------------------
  // Fixed recall items
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'borax-formula', d: 1, o: 'past-paper', t: ['boron and aluminium'],
      q: 'The chemical formula of borax is:',
      a: tex`$\ce{Na2B4O7.10H2O}$`,
      x: [tex`$\ce{H3BO3}$`, tex`$\ce{Ca2B6O11.5H2O}$`, tex`$\ce{NaBO2}$`],
      e: tex`Borax is sodium tetraborate decahydrate, $\ce{Na2B4O7.10H2O}$. $\ce{H3BO3}$ is boric acid, $\ce{Ca2B6O11.5H2O}$ is colemanite and $\ce{NaBO2}$ is sodium metaborate.`,
    },
    {
      id: 'boric-acid-lewis-acid', d: 2, t: ['boron and aluminium'],
      q: 'Boric acid, $\\ce{H3BO3}$, behaves as an acid in water because it:',
      a: 'accepts a hydroxide ion from water, releasing $\\ce{H+}$',
      x: [
        'donates all three of its hydrogen ions',
        'donates a lone pair of electrons to water',
        'ionises completely to give $\\ce{BO3^{3-}}$ ions',
      ],
      e: tex`Boron in $\ce{B(OH)3}$ has an incomplete octet, so it acts as a Lewis acid: $\ce{B(OH)3 + H2O -> [B(OH)4]^- + H+}$. It is therefore a weak monobasic acid, not a tribasic proton donor.`,
    },
    {
      id: 'potash-alum-formula', d: 1, t: ['boron and aluminium'],
      q: 'The formula of potash alum is:',
      a: tex`$\ce{K2SO4.Al2(SO4)3.24H2O}$`,
      x: [tex`$\ce{K2SO4.Al2(SO4)3.12H2O}$`, tex`$\ce{Na2SO4.Al2(SO4)3.24H2O}$`, tex`$\ce{K2SO4.Fe2(SO4)3.24H2O}$`],
      e: tex`Potash alum is the double salt $\ce{K2SO4.Al2(SO4)3.24H2O}$ (equivalently $\ce{KAl(SO4)2.12H2O}$). The sodium double salt is soda alum and $\ce{K2SO4.Fe2(SO4)3.24H2O}$ is potassium iron(III) (ferric) alum.`,
    },
    {
      id: 'carborundum-use', d: 1, t: ['carbon and silicon'],
      q: 'Silicon carbide (carborundum) is mainly used as:',
      a: 'an abrasive for cutting and grinding',
      x: ['a fertilizer for acidic soils', 'a bleaching agent for paper', 'a fuel in blast furnaces'],
      e: tex`$\ce{SiC}$ has a diamond-like covalent network, so it is extremely hard and is used as an abrasive.`,
    },
    {
      id: 'glass-etched-by-hf', d: 1, o: 'past-paper', t: ['halogens', 'carbon and silicon'],
      q: 'Glass is etched by:',
      a: 'hydrofluoric acid',
      x: ['hydrochloric acid', 'hydrobromic acid', 'hydriodic acid'],
      e: tex`HF attacks the silica in glass: $\ce{SiO2 + 4HF -> SiF4 + 2H2O}$. The other hydrohalic acids do not react with silica.`,
    },
    {
      id: 'brown-ring-test', d: 1, o: 'past-paper', t: ['nitrogen and phosphorus'],
      q: 'The brown ring test is used to detect the:',
      a: 'nitrate ion',
      x: ['sulphate ion', 'chloride ion', 'phosphate ion'],
      e: tex`Freshly prepared $\ce{FeSO4}$ and concentrated $\ce{H2SO4}$ reduce nitrate to NO, which forms the brown complex $\ce{[Fe(H2O)5NO]^{2+}}$ at the junction of the two layers.`,
    },
    {
      id: 'white-phosphorus-under-water', d: 1, t: ['nitrogen and phosphorus'],
      q: 'White phosphorus is stored under water because it:',
      a: 'catches fire spontaneously in air',
      x: ['dissolves in water to form phosphoric acid', 'absorbs carbon dioxide from the air', 'reacts violently with atmospheric nitrogen'],
      e: 'White phosphorus has a very low ignition temperature (about 30 °C) and burns in air; it does not react with water, so water protects it from oxygen.',
    },
    {
      id: 'contact-process-catalyst', d: 1, o: 'past-paper', t: ['oxygen and sulphur'],
      q: tex`In the modern Contact process, the catalyst used for the oxidation of $\ce{SO2}$ to $\ce{SO3}$ is:`,
      a: tex`vanadium pentoxide, $\ce{V2O5}$`,
      x: [tex`finely divided iron, $\ce{Fe}$`, tex`finely divided nickel, $\ce{Ni}$`, tex`manganese dioxide, $\ce{MnO2}$`],
      e: tex`$\ce{2SO2 + O2 <=> 2SO3}$ is catalysed by $\ce{V2O5}$ at about 450 °C. Iron is the Haber-process catalyst and nickel is used for hydrogenation.`,
    },
    {
      id: 'oleum-formula', d: 1, t: ['oxygen and sulphur'],
      q: 'Oleum (fuming sulphuric acid) is:',
      a: tex`$\ce{H2S2O7}$`,
      x: [tex`$\ce{H2SO3}$`, tex`$\ce{H2S2O8}$`, tex`$\ce{H2S2O3}$`],
      e: tex`In the Contact process $\ce{SO3}$ is absorbed in concentrated sulphuric acid: $\ce{SO3 + H2SO4 -> H2S2O7}$ (oleum, pyrosulphuric acid). $\ce{H2S2O8}$ is peroxodisulphuric acid and $\ce{H2S2O3}$ is thiosulphuric acid.`,
    },
    {
      id: 'bleaching-powder-formula', d: 1, o: 'past-paper', t: ['halogens'],
      q: 'The formula of bleaching powder is:',
      a: tex`$\ce{Ca(OCl)Cl}$`,
      x: [tex`$\ce{CaCl2}$`, tex`$\ce{Ca(ClO3)2}$`, tex`$\ce{Ca(ClO4)2}$`],
      e: tex`Bleaching powder is made by passing chlorine over slaked lime: $\ce{Ca(OH)2 + Cl2 -> Ca(OCl)Cl + H2O}$. Its bleaching action comes from the hypochlorite ($\ce{OCl-}$) group.`,
    },
    {
      id: 'fluorine-only-minus-one', d: 2, t: ['halogens'],
      q: 'Fluorine shows only the $-1$ oxidation state in its compounds because it:',
      a: 'is the most electronegative element and has no d-orbitals in its valence shell',
      x: [
        'has the largest atomic radius in group VIIA',
        'has the lowest electronegativity among the halogens',
        'already has a completely filled valence shell',
      ],
      e: 'Being the most electronegative element, fluorine always attracts the shared electrons, and with no 2d orbitals it cannot expand its octet to show positive oxidation states like Cl, Br and I.',
    },
    {
      id: 'first-noble-gas-compound', d: 1, o: 'past-paper', t: ['noble gases'],
      q: 'The first compound of a noble gas, prepared by Neil Bartlett in 1962, was:',
      a: tex`$\ce{XePtF6}$`,
      x: [tex`$\ce{XeO3}$`, tex`$\ce{KrF2}$`, tex`$\ce{XeF6}$`],
      e: tex`Bartlett noticed that $\ce{PtF6}$ oxidises $\ce{O2}$, and since xenon has a similar ionisation energy he reacted the two to obtain the orange-yellow solid $\ce{XePtF6}$.`,
    },
    {
      id: 'xef4-shape', d: 2, t: ['noble gases'],
      q: tex`The shape of the $\ce{XeF4}$ molecule is:`,
      a: 'square planar',
      x: ['tetrahedral', 'see-saw', 'square pyramidal'],
      e: tex`Xe has 8 valence electrons: 4 form Xe-F bonds and 4 remain as 2 lone pairs. Six electron pairs ($sp^3d^2$) take an octahedral arrangement; the two lone pairs sit opposite each other, leaving a square planar molecule.`,
    },
  ]),
]);
