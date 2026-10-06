import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, q$, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Family = 'alkane' | 'alkene' | 'alkyne';

const PREFIX = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'] as const;

/** IUPAC name of the straight-chain member with n carbons (multiple bond at C-1 for n >= 4). */
function familyName(family: Family, n: number): string {
  const stem = PREFIX[n] as string;
  if (family === 'alkane') return `${stem}ane`;
  const suffix = family === 'alkene' ? 'ene' : 'yne';
  return n >= 4 ? `${stem}-1-${suffix}` : `${stem}${suffix}`;
}

/** Hydrogen count of the straight-chain member with n carbons. */
const hydrogens = (family: Family, n: number): number =>
  family === 'alkane' ? 2 * n + 2 : family === 'alkene' ? 2 * n : 2 * n - 2;

/** mhchem formula C_nH_m (writes CH4 rather than C1H4). */
const formula = (n: number, m: number): string => `C${n === 1 ? '' : n}H${m}`;

interface BondCase {
  name: string;
  f: string;
  sigma: number;
  pi: number;
  why: string;
}

const SIGMA_PI: readonly BondCase[] = [
  { name: 'ethane', f: 'CH3-CH3', sigma: 7, pi: 0, why: 'one C–C and six C–H single bonds' },
  { name: 'ethene', f: 'CH2=CH2', sigma: 5, pi: 1, why: tex`four C–H bonds and one $\ce{C=C}$ (one $\sigma$ + one $\pi$)` },
  { name: 'ethyne', f: 'HC#CH', sigma: 3, pi: 2, why: tex`two C–H bonds and one $\ce{C#C}$ (one $\sigma$ + two $\pi$)` },
  { name: 'propene', f: 'CH2=CH-CH3', sigma: 8, pi: 1, why: tex`six C–H bonds, one C–C single bond and one $\ce{C=C}$` },
  { name: 'propyne', f: 'HC#C-CH3', sigma: 6, pi: 2, why: tex`four C–H bonds, one C–C single bond and one $\ce{C#C}$` },
  { name: 'buta-1,3-diene', f: 'CH2=CH-CH=CH2', sigma: 9, pi: 2, why: tex`six C–H bonds, one C–C single bond and two $\ce{C=C}$` },
  { name: 'but-2-yne', f: 'CH3-C#C-CH3', sigma: 9, pi: 2, why: tex`six C–H bonds, two C–C single bonds and one $\ce{C#C}$` },
  { name: 'but-1-en-3-yne', f: 'CH2=CH-C#CH', sigma: 7, pi: 3, why: tex`four C–H bonds, one C–C single bond, one $\ce{C=C}$ and one $\ce{C#C}$` },
  { name: 'benzene', f: 'C6H6', sigma: 12, pi: 3, why: 'six C–H bonds and six ring C–C $\\sigma$ bonds, with three $\\pi$ bonds in the Kekulé structure' },
  { name: 'cyclohexene', f: 'C6H10', sigma: 16, pi: 1, why: tex`ten C–H bonds, six ring C–C $\sigma$ bonds and one $\pi$ bond in the $\ce{C=C}$` },
];

const sigmaPiTex = (s: number, p: number): string => `$${s}\\sigma$ and $${p}\\pi$`;

interface Unsat {
  name: string;
  f: string;
  /** Molar mass in g/mol (FSc masses: C = 12, H = 1). */
  M: number;
  /** Moles of H2 taken up per mole for complete hydrogenation. */
  h2: number;
  product: string;
}

const UNSAT: readonly Unsat[] = [
  { name: 'ethene', f: 'C2H4', M: 28, h2: 1, product: 'ethane' },
  { name: 'propene', f: 'C3H6', M: 42, h2: 1, product: 'propane' },
  { name: 'but-1-ene', f: 'C4H8', M: 56, h2: 1, product: 'butane' },
  { name: 'ethyne', f: 'C2H2', M: 26, h2: 2, product: 'ethane' },
  { name: 'propyne', f: 'C3H4', M: 40, h2: 2, product: 'propane' },
  { name: 'buta-1,3-diene', f: 'C4H6', M: 54, h2: 2, product: 'butane' },
];

interface Ozonolysis {
  alkene: string;
  f: string;
  products: string;
  why: string;
}

const OZONOLYSIS: readonly Ozonolysis[] = [
  { alkene: 'ethene', f: 'CH2=CH2', products: 'Methanal only (two molecules)', why: tex`each $\ce{CH2=}$ end becomes $\ce{HCHO}$` },
  { alkene: 'propene', f: 'CH3-CH=CH2', products: 'Ethanal and methanal', why: tex`$\ce{CH3CH=}$ gives $\ce{CH3CHO}$ and $\ce{=CH2}$ gives $\ce{HCHO}$` },
  { alkene: 'but-2-ene', f: 'CH3-CH=CH-CH3', products: 'Ethanal only (two molecules)', why: tex`both halves are $\ce{CH3CH=}$, each giving $\ce{CH3CHO}$` },
  { alkene: 'but-1-ene', f: 'CH3CH2-CH=CH2', products: 'Propanal and methanal', why: tex`$\ce{CH3CH2CH=}$ gives $\ce{CH3CH2CHO}$ and $\ce{=CH2}$ gives $\ce{HCHO}$` },
  { alkene: '2-methylpropene', f: '(CH3)2C=CH2', products: 'Propanone and methanal', why: tex`$\ce{(CH3)2C=}$ gives $\ce{CH3COCH3}$ and $\ce{=CH2}$ gives $\ce{HCHO}$` },
  { alkene: '2,3-dimethylbut-2-ene', f: '(CH3)2C=C(CH3)2', products: 'Propanone only (two molecules)', why: tex`both halves are $\ce{(CH3)2C=}$, each giving $\ce{CH3COCH3}$` },
];

// Must not restate any OZONOLYSIS product pair in a different order (that would be a second key).
const OZONOLYSIS_EXTRA = ['Ethanoic acid and methanoic acid', 'Ethanal and propanone', 'Propanal only (two molecules)'];

interface HbrCase {
  alkene: string;
  f: string;
  /** Markovnikov product. */
  mark: string;
  /** Anti-Markovnikov product. */
  anti: string;
  /** Carbocation formed in the ionic mechanism. */
  cation: string;
  /** Other wrong names. */
  other: readonly string[];
}

const HBR: readonly HbrCase[] = [
  { alkene: 'propene', f: 'CH3CH=CH2', mark: '2-Bromopropane', anti: '1-Bromopropane', cation: tex`secondary carbocation $\mathrm{CH_3\overset{+}{C}HCH_3}$`, other: ['1,2-Dibromopropane', '2-Bromopropene'] },
  { alkene: 'but-1-ene', f: 'CH3CH2CH=CH2', mark: '2-Bromobutane', anti: '1-Bromobutane', cation: tex`secondary carbocation $\mathrm{CH_3CH_2\overset{+}{C}HCH_3}$`, other: ['1,2-Dibromobutane', '2-Bromobut-1-ene'] },
  { alkene: '2-methylpropene', f: '(CH3)2C=CH2', mark: '2-Bromo-2-methylpropane', anti: '1-Bromo-2-methylpropane', cation: tex`tertiary carbocation $\ce{(CH3)3C+}$`, other: ['1,2-Dibromo-2-methylpropane', '2-Bromobutane'] },
];

const HC_TRUE: ReadonlyArray<readonly [string, string]> = [
  ['Alkanes react with chlorine in sunlight by substitution.', 'Being saturated, alkanes cannot add; in UV light a free-radical chain replaces H by Cl.'],
  [tex`Ethene is a planar molecule with bond angles of about $120^{\circ}$.`, tex`Both carbons are $sp^{2}$ hybridised, so all six atoms lie in one plane at about $120^{\circ}$.`],
  [tex`Ethyne is a linear molecule with an H–C–C angle of $180^{\circ}$.`, tex`Both carbons are $sp$ hybridised, giving a linear molecule.`],
  [tex`A $\pi$ bond is formed by sideways overlap of unhybridised p orbitals.`, tex`Head-on overlap gives a $\sigma$ bond; parallel p orbitals overlap sideways to give a $\pi$ bond.`],
  ['But-2-ene shows cis–trans (geometric) isomerism.', tex`Each doubly bonded carbon carries two different groups ($\ce{H}$ and $\ce{CH3}$), so cis and trans forms exist.`],
  [tex`The $\ce{C#C}$ bond is shorter than the $\ce{C=C}$ bond.`, tex`Bond length falls as bond order rises: C–C 1.54 Å, $\ce{C=C}$ 1.34 Å, $\ce{C#C}$ 1.20 Å.`],
  ['Alkenes decolourise bromine water at room temperature.', tex`Bromine adds across the $\ce{C=C}$ bond, so its brown colour disappears; this is a test for unsaturation.`],
  ['A branched alkane boils lower than its straight-chain isomer.', 'Branching makes the molecule more compact, reducing surface contact and London (dispersion) forces.'],
  ['Terminal alkynes are weakly acidic.', tex`The $sp$ carbon (50% s character) holds the C–H bonding pair tightly, so $\ce{H}$ can be removed, e.g. by ammoniacal $\ce{AgNO3}$.`],
];

const HC_FALSE: ReadonlyArray<readonly [string, string]> = [
  ['Alkanes readily undergo addition reactions.', 'Alkanes are saturated (only single bonds), so they undergo substitution, not addition.'],
  [tex`The carbon atoms of ethene are $sp^{3}$ hybridised.`, tex`Each ethene carbon forms three $\sigma$ bonds and one $\pi$ bond, so it is $sp^{2}$ hybridised.`],
  [tex`Ethyne is a bent molecule with bond angles of $109.5^{\circ}$.`, tex`Ethyne carbons are $sp$ hybridised, so the molecule is linear ($180^{\circ}$).`],
  [tex`A $\pi$ bond is stronger than a $\sigma$ bond.`, tex`Sideways overlap is less effective than head-on overlap, so a $\pi$ bond is weaker than a $\sigma$ bond.`],
  ['But-1-ene shows cis–trans (geometric) isomerism.', tex`C-1 of but-1-ene carries two hydrogen atoms, so cis and trans forms are not possible.`],
  [tex`The $\ce{C=C}$ bond is longer than the C–C single bond.`, tex`A double bond (1.34 Å) is shorter than a single bond (1.54 Å).`],
  ['Alkanes decolourise bromine water in the dark.', 'Alkanes have no multiple bond to add bromine and do not react with it in the dark.'],
  ['Ethane is more acidic than ethyne.', tex`Acidity follows s character: ethyne ($sp$) > ethene ($sp^{2}$) > ethane ($sp^{3}$).`],
];

const BZ_TRUE: ReadonlyArray<readonly [string, string]> = [
  ['All six carbon–carbon bonds in benzene have the same length.', 'The π electrons are delocalised, so every C–C bond is identical (1.397 Å), between a single and a double bond.'],
  ['Benzene prefers substitution reactions to addition reactions.', 'Substitution keeps the stable delocalised π system intact, while addition would destroy it.'],
  [tex`Benzene is a planar molecule with C–C–C angles of $120^{\circ}$.`, tex`All carbons are $sp^{2}$ hybridised and lie in one plane in a regular hexagon.`],
  ['Benzene burns with a smoky (sooty) flame.', 'Its high carbon content (92.3% by mass) leads to incomplete combustion and soot.'],
  [tex`The $\ce{-NO2}$ group deactivates the ring and directs incoming groups to the meta position.`, tex`$\ce{-NO2}$ withdraws electron density from the ring, mostly from the ortho and para positions.`],
  [tex`The $\ce{-CH3}$ group activates the ring and is ortho/para directing.`, tex`$\ce{-CH3}$ releases electrons into the ring, making ortho and para positions richer in electrons.`],
  ['Benzene is more stable than the hypothetical cyclohexa-1,3,5-triene.', 'Its heat of hydrogenation is much less than three times that of cyclohexene; the difference is the resonance (delocalisation) energy.'],
];

const BZ_FALSE: ReadonlyArray<readonly [string, string]> = [
  ['Benzene rapidly decolourises bromine water at room temperature.', 'Benzene does not add bromine readily; with a Lewis acid catalyst it substitutes instead.'],
  ['Benzene contains three short and three long carbon–carbon bonds.', 'Delocalisation makes all six C–C bonds equal (1.397 Å).'],
  [tex`The carbon atoms of benzene are $sp^{3}$ hybridised.`, tex`Each benzene carbon forms three $\sigma$ bonds and shares in the π system, so it is $sp^{2}$ hybridised.`],
  [tex`The $\ce{-NO2}$ group is ortho/para directing.`, tex`$\ce{-NO2}$ is an electron-withdrawing, meta-directing group.`],
  ['Benzene is a puckered, non-planar ring like cyclohexane.', tex`$sp^{2}$ carbons make the benzene ring flat.`],
  [tex`The $\ce{-CH3}$ group deactivates the benzene ring.`, tex`$\ce{-CH3}$ is electron-releasing, so toluene reacts faster than benzene.`],
  [tex`Benzene readily decolourises cold dilute alkaline $\ce{KMnO4}$.`, tex`Benzene resists oxidation by Baeyer's reagent; unlike alkenes and alkynes, it does not decolourise it.`],
];

const reasonOf = (list: ReadonlyArray<readonly [string, string]>, s: string): string =>
  list.find(([t]) => t === s)?.[1] ?? '';

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'hydrocarbons', (b) => [
  // ------------------------------------------------------------- dynamic
  b.dynamic('molecular-formula-from-name', { difficulty: 1, origin: 'past-paper', tags: ['alkanes', 'alkenes', 'alkynes'] }, (r) => {
    const family = r.pick(['alkane', 'alkene', 'alkyne'] as const);
    const n = r.int(family === 'alkane' ? 3 : 2, 10);
    const name = familyName(family, n);
    const answer = tex`$\ce{${formula(n, hydrogens(family, n))}}$`;
    const others = (['alkane', 'alkene', 'alkyne'] as const).filter((f) => f !== family);
    const candidates = [
      ...others.map((f) => tex`$\ce{${formula(n, hydrogens(f, n))}}$`),
      // C_nH_(m-2) would be "C2H0" for ethyne, so only offer it when hydrogens remain.
      ...(hydrogens(family, n) > 2 ? [tex`$\ce{${formula(n, hydrogens(family, n) - 2)}}$`] : []),
      tex`$\ce{${formula(n + 1, hydrogens(family, n + 1))}}$`,
    ];
    const general = family === 'alkane' ? 'C_{n}H_{2n+2}' : family === 'alkene' ? 'C_{n}H_{2n}' : 'C_{n}H_{2n-2}';
    return {
      stem: tex`The molecular formula of ${name} is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`"${PREFIX[n]}-" means ${n} carbon atoms and the suffix shows an ${family}, general formula $${general}$. With $n = ${n}$: $\ce{${formula(n, hydrogens(family, n))}}$.`,
    };
  }),

  b.dynamic('sigma-pi-bond-count', { difficulty: 2, origin: 'past-paper', tags: ['alkenes', 'alkynes', 'benzene'] }, (r) => {
    const m = r.pick(SIGMA_PI);
    const answer = sigmaPiTex(m.sigma, m.pi);
    const candidates = [
      sigmaPiTex(m.sigma + m.pi, m.pi),
      sigmaPiTex(m.sigma - m.pi, m.pi),
      ...r.shuffle([
        sigmaPiTex(m.sigma, m.pi + 1),
        sigmaPiTex(m.sigma + 1, m.pi),
        sigmaPiTex(m.sigma - 1, m.pi),
        ...(m.pi > 0 ? [sigmaPiTex(m.sigma, m.pi - 1)] : []),
      ]),
    ];
    return {
      stem: tex`The numbers of sigma ($\sigma$) and pi ($\pi$) bonds in ${m.name} ($\ce{${m.f}}$) are:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`${m.name.charAt(0).toUpperCase()}${m.name.slice(1)} has ${m.why}. Every single, double or triple bond contains one $\sigma$ bond, and the second and third bonds of a multiple bond are $\pi$ bonds, giving ${sigmaPiTex(m.sigma, m.pi)}.`,
    };
  }),

  b.dynamic('combustion-oxygen-moles', { difficulty: 2, tags: ['alkanes', 'alkenes', 'alkynes'] }, (r) => {
    const family = r.pick(['alkane', 'alkene', 'alkyne'] as const);
    const n = r.int(family === 'alkane' ? 1 : 2, 8);
    const h = hydrogens(family, n);
    const o2 = n + h / 4;
    const { answer, distractors } = numericOptions(r, {
      correct: o2,
      wrong: [2 * n + h / 2, n + h / 2, n, h / 2, 2 * o2],
      format: (v) => q$(v, U.mol),
      fallback: 'offset',
    });
    const name = familyName(family, n);
    return {
      stem: tex`The number of moles of oxygen molecules ($\ce{O2}$) needed for the complete combustion of one mole of ${name} ($\ce{${formula(n, h)}}$) is:`,
      answer,
      distractors,
      explanation: tex`$\ce{${formula(n, h)}}$ gives ${n} mol $\ce{CO2}$ (needs ${n} mol $\ce{O2}$) and ${h / 2} mol $\ce{H2O}$ (needs ${num(h / 4)} mol $\ce{O2}$). For $\mathrm{C_xH_y}$, total $\ce{O2} = x + \frac{y}{4} = ${n} + \frac{${h}}{4} = ${num(o2)}\,\mathrm{mol}$.`,
    };
  }),

  b.dynamic('hydrogenation-h2-volume', { difficulty: 2, tags: ['alkenes', 'alkynes', 'reactions and mechanisms'] }, (r) => {
    const c = r.pick(UNSAT);
    const k = r.pick([0.1, 0.2, 0.25, 0.5, 1, 1.5, 2]);
    const mass = Number((k * c.M).toFixed(2));
    const v = Number((22.4 * k * c.h2).toFixed(2));
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      wrong: [
        c.h2 === 2 ? 22.4 * k : 44.8 * k,
        24 * k * c.h2,
        11.2 * k * c.h2,
        22.4 * k * (c.h2 + 1),
      ].map((x) => Number(x.toFixed(2))),
      format: (x) => q$(x, U.dm3, { dp: 2 }),
    });
    const bonds = c.h2 === 2 ? (c.name === 'buta-1,3-diene' ? 'two C=C bonds' : 'one triple bond') : 'one C=C bond';
    return {
      stem: tex`The volume of hydrogen at STP needed to convert ${num(mass)} g of ${c.name} ($\ce{${c.f}}$) completely into ${c.product} (Ni catalyst) is:`,
      answer,
      distractors,
      explanation: tex`$M(\ce{${c.f}}) = ${c.M}\,\mathrm{g\,mol^{-1}}$, so $n = \frac{${num(mass)}}{${c.M}} = ${num(k)}\,\mathrm{mol}$. With ${bonds} it takes up ${c.h2} mol $\ce{H2}$ per mole: $${num(k * c.h2)}\,\mathrm{mol}$ $\ce{H2}$ $= ${num(k * c.h2)} \times 22.4 = ${num(v)}\,\mathrm{dm^{3}}$.`,
    };
  }),

  b.dynamic('ozonolysis-products', { difficulty: 2, tags: ['alkenes', 'reactions and mechanisms'] }, (r) => {
    const c = r.pick(OZONOLYSIS);
    const answer = c.products;
    const candidates = [...OZONOLYSIS.filter((o) => o !== c).map((o) => o.products), ...OZONOLYSIS_EXTRA];
    return {
      stem: tex`Ozonolysis of ${c.alkene} ($\ce{${c.f}}$) followed by hydrolysis with zinc dust and water gives:`,
      answer,
      distractors: pickDistractors(answer, candidates, r),
      explanation: tex`Ozonolysis cleaves the $\ce{C=C}$ bond and each doubly bonded carbon becomes a $\ce{C=O}$ group (zinc prevents oxidation to acids): ${c.why}.`,
    };
  }),

  b.dynamic('hbr-addition-product', { difficulty: 2, origin: 'past-paper', tags: ['alkenes', 'reactions and mechanisms'] }, (r) => {
    const c = r.pick(HBR);
    const peroxide = r.chance(0.4);
    const answer = peroxide ? c.anti : c.mark;
    const candidates = [peroxide ? c.mark : c.anti, ...c.other];
    return {
      stem: peroxide
        ? tex`The major product of the addition of $\ce{HBr}$ to ${c.alkene} ($\ce{${c.f}}$) in the presence of an organic peroxide is:`
        : tex`The major product of the addition of $\ce{HBr}$ to ${c.alkene} ($\ce{${c.f}}$) is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: peroxide
        ? tex`With peroxide, $\ce{HBr}$ adds by a free-radical mechanism (peroxide effect) and bromine goes to the carbon with more hydrogens (anti-Markovnikov), giving ${c.anti.toLowerCase()}.`
        : tex`By Markovnikov's rule $\ce{H+}$ adds to the carbon with more hydrogens, forming the more stable ${c.cation}; $\ce{Br-}$ then attacks it to give ${c.mark.toLowerCase()}.`,
    };
  }),

  b.dynamic('aliphatic-hydrocarbon-statements', { difficulty: 2, tags: ['alkanes', 'alkenes', 'alkynes'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about aliphatic hydrocarbons is correct?',
      negativeStem: 'Which statement about aliphatic hydrocarbons is NOT correct?',
      truths: HC_TRUE.map(([t]) => t),
      falsehoods: HC_FALSE.map(([t]) => t),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false. ${reasonOf(HC_FALSE, answer)}`
          : `This statement is true. ${reasonOf(HC_TRUE, answer)}`,
    }),
  ),

  b.dynamic('benzene-statements', { difficulty: 2, tags: ['benzene', 'electrophilic substitution'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about benzene is correct?',
      negativeStem: 'Which statement about benzene is NOT correct?',
      truths: BZ_TRUE.map(([t]) => t),
      falsehoods: BZ_FALSE.map(([t]) => t),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false. ${reasonOf(BZ_FALSE, answer)}`
          : `This statement is true. ${reasonOf(BZ_TRUE, answer)}`,
    }),
  ),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'benzene-discovery', d: 1, o: 'past-paper', t: ['benzene'],
      q: 'Benzene was first isolated (from the oily residue of illuminating gas) by:',
      a: 'Michael Faraday in 1825',
      x: ['August Kekulé in 1865', 'Friedrich Wöhler in 1828', 'Robert Bunsen in 1855'],
      e: 'Faraday isolated benzene in 1825. Kekulé proposed its ring structure in 1865; Wöhler (1828) is known for the synthesis of urea.',
    },
    {
      id: 'benzene-cc-bond-length', d: 2, o: 'past-paper', t: ['benzene'],
      q: 'The carbon–carbon bond length in benzene is:',
      a: '1.397 Å',
      x: ['1.54 Å', '1.34 Å', '1.20 Å'],
      e: tex`Delocalisation makes all six bonds equal at 1.397 Å, between the C–C single bond (1.54 Å) and the $\ce{C=C}$ double bond (1.34 Å); 1.20 Å is the $\ce{C#C}$ bond.`,
    },
    {
      id: 'lindlar-catalyst', d: 1, o: 'past-paper', t: ['alkynes', 'reactions and mechanisms'],
      q: 'An alkyne is partially hydrogenated to a cis-alkene using:',
      a: "Lindlar's catalyst (partially poisoned palladium)",
      x: [tex`Anhydrous $\ce{AlCl3}$`, tex`Dilute $\ce{H2SO4}$ with $\ce{HgSO4}$`, tex`Cold dilute alkaline $\ce{KMnO4}$`],
      e: tex`Lindlar's catalyst is palladium on $\ce{CaCO3}$ (or $\ce{BaSO4}$) deactivated with lead acetate and quinoline; the poisoned palladium stops hydrogenation at the alkene stage and gives the cis isomer. $\ce{HgSO4/H2SO4}$ hydrates alkynes, $\ce{AlCl3}$ is a Friedel–Crafts catalyst and $\ce{KMnO4}$ oxidises.`,
    },
    {
      id: 'ethyne-hydration', d: 1, o: 'past-paper', t: ['alkynes', 'reactions and mechanisms'],
      q: tex`Ethyne passed into dilute $\ce{H2SO4}$ containing $\ce{HgSO4}$ at about $80^{\circ}\mathrm{C}$ gives:`,
      a: 'Ethanal (acetaldehyde)',
      x: ['Ethanol', 'Ethanoic acid', 'Propanone (acetone)'],
      e: tex`Water adds across the triple bond to give the unstable enol $\ce{CH2=CHOH}$, which tautomerises to ethanal, $\ce{CH3CHO}$. Propanone comes from propyne, not ethyne.`,
    },
    {
      id: 'friedel-crafts-catalyst', d: 1, o: 'past-paper', t: ['benzene', 'electrophilic substitution'],
      q: tex`Benzene reacts with $\ce{CH3Cl}$ to give toluene in the presence of:`,
      a: tex`Anhydrous $\ce{AlCl3}$`,
      x: [tex`Aqueous $\ce{NaOH}$`, tex`Nickel at $250^{\circ}\mathrm{C}$`, 'Ultraviolet light alone'],
      e: tex`In Friedel–Crafts alkylation the Lewis acid $\ce{AlCl3}$ takes $\ce{Cl-}$ from $\ce{CH3Cl}$, producing the electrophile $\ce{CH3+}$ that substitutes into the ring.`,
    },
    {
      id: 'nitration-electrophile', d: 1, t: ['benzene', 'electrophilic substitution'],
      q: tex`In the nitration of benzene with a mixture of concentrated $\ce{HNO3}$ and $\ce{H2SO4}$, the attacking electrophile is:`,
      a: tex`$\ce{NO2+}$ (nitronium ion)`,
      x: [tex`$\ce{NO3-}$ (nitrate ion)`, tex`$\ce{NO2-}$ (nitrite ion)`, tex`$\ce{HSO4-}$ (hydrogen sulphate ion)`],
      e: tex`$\ce{HNO3 + 2H2SO4 -> NO2+ + H3O+ + 2HSO4-}$. The positively charged nitronium ion attacks the π electrons of the ring; the anions are not electrophiles.`,
    },
    {
      id: 'meta-directing-group', d: 2, o: 'past-paper', t: ['electrophilic substitution'],
      q: 'Which substituent on a benzene ring directs an incoming electrophile to the meta position?',
      a: tex`$\ce{-NO2}$`,
      x: [tex`$\ce{-OH}$`, tex`$\ce{-CH3}$`, tex`$\ce{-Cl}$`],
      e: tex`$\ce{-NO2}$ withdraws electrons from the ortho and para positions, leaving meta relatively richer. $\ce{-OH}$ and $\ce{-CH3}$ (activating) and $\ce{-Cl}$ (deactivating) are all ortho/para directors.`,
    },
    {
      id: 'baeyer-test-product', d: 1, t: ['alkenes', 'reactions and mechanisms'],
      q: tex`Ethene decolourises cold dilute alkaline $\ce{KMnO4}$ (Baeyer's reagent). The organic product is:`,
      a: 'Ethane-1,2-diol (ethylene glycol)',
      x: ['Ethanol', 'Ethanal', 'Ethane'],
      e: tex`The pink permanganate adds two $\ce{-OH}$ groups across the $\ce{C=C}$ bond, giving $\ce{HOCH2CH2OH}$, and is reduced to brown $\ce{MnO2}$.`,
    },
    {
      id: 'ammoniacal-silver-nitrate', d: 2, t: ['alkynes'],
      q: 'Which reagent can be used to distinguish ethyne from ethene?',
      a: tex`Ammoniacal $\ce{AgNO3}$`,
      x: ['Bromine water', tex`Cold dilute alkaline $\ce{KMnO4}$`, tex`Hydrogen with a nickel catalyst`],
      e: tex`The acidic terminal hydrogens of ethyne are replaced by silver, giving a white precipitate of silver acetylide; ethene does not react. Both gases decolourise bromine water and $\ce{KMnO4}$ and both are hydrogenated.`,
    },
    {
      id: 'calcium-carbide-water', d: 1, o: 'past-paper', t: ['alkynes'],
      q: 'The gas produced when water is added to calcium carbide is:',
      a: 'Ethyne (acetylene)',
      x: ['Methane', 'Ethene', 'Hydrogen'],
      e: tex`$\ce{CaC2 + 2H2O -> C2H2 + Ca(OH)2}$. (Aluminium carbide, $\ce{Al4C3}$, is the one that gives methane.)`,
    },
    {
      id: 'ethyne-to-benzene', d: 1, t: ['alkynes', 'benzene'],
      q: 'When ethyne is passed through a red-hot iron or copper tube, it forms:',
      a: 'Benzene',
      x: ['Ethene', 'Cyclohexane', 'Toluene'],
      e: tex`Three ethyne molecules polymerise (cyclic trimerisation): $\ce{3C2H2 -> C6H6}$.`,
    },
    {
      id: 'kolbe-electrolysis', d: 2, t: ['alkanes'],
      q: 'Electrolysis of a concentrated aqueous solution of sodium ethanoate (Kolbe’s method) gives which hydrocarbon at the anode?',
      a: 'Ethane',
      x: ['Methane', 'Ethene', 'Butane'],
      e: tex`Two $\ce{CH3COO-}$ ions lose electrons and $\ce{CO2}$; the two $\ce{CH3}$ radicals join: $\ce{2CH3COO- -> C2H6 + 2CO2 + 2e-}$. Methane comes from heating sodium ethanoate with soda lime.`,
    },
    {
      id: 'wurtz-reaction', d: 1, t: ['alkanes'],
      q: 'In the Wurtz reaction, an alkyl halide is converted into a higher alkane by heating it with:',
      a: 'Sodium in dry ether',
      x: ['Magnesium in dry ether', 'Alcoholic potassium hydroxide', 'Soda lime'],
      e: tex`$\ce{2CH3Br + 2Na -> CH3-CH3 + 2NaBr}$. Magnesium in dry ether gives a Grignard reagent, alcoholic KOH causes elimination and soda lime decarboxylates salts.`,
    },
    {
      id: 'chlorination-initiation', d: 2, t: ['alkanes', 'reactions and mechanisms'],
      q: 'The chain-initiation step in the chlorination of methane in diffused sunlight is:',
      a: tex`$\mathrm{Cl_2 \rightarrow 2Cl^{\bullet}}$`,
      x: [tex`$\mathrm{CH_4 \rightarrow CH_3^{+} + H^{-}}$`, tex`$\mathrm{Cl^{\bullet} + CH_4 \rightarrow CH_3^{\bullet} + HCl}$`, tex`$\mathrm{CH_3^{\bullet} + Cl^{\bullet} \rightarrow CH_3Cl}$`],
      e: tex`Light splits the weaker Cl–Cl bond homolytically into two chlorine free radicals (initiation). $\mathrm{Cl^{\bullet} + CH_4}$ is a propagation step and radical combination is termination; no ions are formed.`,
    },
    {
      id: 'acidity-of-hydrocarbons', d: 2, t: ['alkanes', 'alkenes', 'alkynes'],
      q: 'The correct order of acidic strength is:',
      a: 'Ethyne > ethene > ethane',
      x: ['Ethane > ethene > ethyne', 'Ethene > ethyne > ethane', 'Ethene > ethane > ethyne'],
      e: tex`Acidity rises with s character of the C–H carbon: $sp$ (50%) > $sp^{2}$ (33%) > $sp^{3}$ (25%), so ethyne > ethene > ethane.`,
    },
    {
      id: 'benzene-hexachloride', d: 2, t: ['benzene', 'reactions and mechanisms'],
      q: tex`Benzene reacts with excess $\ce{Cl2}$ in bright sunlight (no catalyst) to give:`,
      a: tex`Benzene hexachloride, $\ce{C6H6Cl6}$, by addition`,
      x: [tex`Chlorobenzene, $\ce{C6H5Cl}$, by substitution`, tex`Hexachlorobenzene, $\ce{C6Cl6}$, by substitution`, tex`1,2-Dichlorobenzene, $\ce{C6H4Cl2}$, by addition`],
      e: tex`In UV light chlorine free radicals add to all three π bonds, giving $\ce{C6H6Cl6}$ (BHC, used as an insecticide). Substitution to chlorobenzene needs a Lewis acid such as $\ce{FeCl3}$ in the dark.`,
    },
    {
      id: 'arenium-ion-intermediate', d: 2, t: ['electrophilic substitution', 'reactions and mechanisms'],
      q: 'The intermediate formed when an electrophile attacks the benzene ring is:',
      a: 'A resonance-stabilised carbocation (arenium ion)',
      x: ['A resonance-stabilised carbanion', 'A free radical', 'A neutral addition product'],
      e: tex`The electrophile takes two π electrons to form a σ bond, leaving a positive charge delocalised over the ring (arenium ion). Loss of $\ce{H+}$ then restores aromaticity.`,
    },
    {
      id: 'ethanol-dehydration', d: 1, o: 'past-paper', t: ['alkenes'],
      q: 'Ethene is prepared in the laboratory by heating ethanol with:',
      a: tex`Excess concentrated $\ce{H2SO4}$ at about $170^{\circ}\mathrm{C}$`,
      x: [tex`Aqueous $\ce{NaOH}$ at about $100^{\circ}\mathrm{C}$`, 'Sodium metal', tex`$\ce{HgSO4}$ in dilute acid at $80^{\circ}\mathrm{C}$`],
      e: tex`Concentrated sulphuric acid removes water: $\ce{CH3CH2OH -> CH2=CH2 + H2O}$. Sodium gives sodium ethoxide and hydrogen.`,
    },
    {
      id: 'markovnikov-carbocation', d: 2, t: ['alkenes', 'reactions and mechanisms'],
      q: tex`Markovnikov's rule for the addition of $\ce{HX}$ to an unsymmetrical alkene is explained by the:`,
      a: 'Greater stability of the more substituted carbocation',
      x: ['Greater stability of the less substituted carbocation', 'Formation of a free-radical intermediate', 'Attack of the halide ion before the proton'],
      e: tex`The proton adds first so that the more stable (secondary or tertiary) carbocation forms, because alkyl groups release electrons; $\ce{X-}$ then bonds to that carbon. Free radicals arise only in the peroxide effect.`,
    },
  ]),
]);
