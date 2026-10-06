import { defineBank } from '@/engine/authoring';
import { ce, molarMass, num, numericOptions, pickDistractors, q$, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local data
// ---------------------------------------------------------------------------

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

interface Alkyl {
  /** Formula of the alkyl group, e.g. C2H5. */
  r: string;
  /** Name stem used in Grignard / halide names, e.g. ethyl. */
  name: string;
  /** Number of carbon atoms. */
  c: number;
}

const ALKYLS: readonly Alkyl[] = [
  { r: 'CH3', name: 'methyl', c: 1 },
  { r: 'C2H5', name: 'ethyl', c: 2 },
  { r: 'CH3CH2CH2', name: 'propyl', c: 3 },
];

/** Products of R-MgX with various reagents (after acidic hydrolysis), indexed by carbon count of R. */
const GRIGNARD_PRODUCTS: ReadonlyArray<{
  key: string;
  reagent: string;
  cls: string;
  names: readonly [string, string, string];
}> = [
  { key: 'water', reagent: ce('H2O'), cls: 'an alkane', names: ['methane', 'ethane', 'propane'] },
  {
    key: 'co2',
    reagent: tex`$\ce{CO2}$ (dry ice), followed by $\ce{H3O+}$`,
    cls: 'a carboxylic acid with one more carbon atom',
    names: ['ethanoic acid', 'propanoic acid', 'butanoic acid'],
  },
  {
    key: 'hcho',
    reagent: tex`methanal ($\ce{HCHO}$), followed by $\ce{H3O+}$`,
    cls: 'a primary alcohol',
    names: ['ethanol', 'propan-1-ol', 'butan-1-ol'],
  },
  {
    key: 'ch3cho',
    reagent: tex`ethanal ($\ce{CH3CHO}$), followed by $\ce{H3O+}$`,
    cls: 'a secondary alcohol',
    names: ['propan-2-ol', 'butan-2-ol', 'pentan-2-ol'],
  },
  {
    key: 'acetone',
    reagent: tex`propanone ($\ce{CH3COCH3}$), followed by $\ce{H3O+}$`,
    cls: 'a tertiary alcohol',
    names: ['2-methylpropan-2-ol', '2-methylbutan-2-ol', '2-methylpentan-2-ol'],
  },
];

const HALOGENS: ReadonlyArray<{ x: string; name: string }> = [
  { x: 'Cl', name: 'chloride' },
  { x: 'Br', name: 'bromide' },
  { x: 'I', name: 'iodide' },
];

const HALIDE_NAMES: Readonly<Record<string, string>> = { Cl: 'chloro', Br: 'bromo', I: 'iodo' };
const ALKANE_NAMES = ['methane', 'ethane', 'propane'] as const;
const ALKANE_FORMULAS = ['CH4', 'C2H6', 'C3H8'] as const;
const HALIDE_PARENTS = ['methane', 'ethane', 'propane'] as const;

type AmineClass = 'primary amine' | 'secondary amine' | 'tertiary amine' | 'quaternary ammonium salt';

const AMINES: ReadonlyArray<{ f: string; name: string; cls: AmineClass; groups: number; note?: string }> = [
  { f: 'CH3NH2', name: 'methylamine', cls: 'primary amine', groups: 1 },
  { f: 'C2H5NH2', name: 'ethylamine', cls: 'primary amine', groups: 1 },
  {
    f: '(CH3)2CHNH2',
    name: 'isopropylamine',
    cls: 'primary amine',
    groups: 1,
    note: 'The nitrogen carries only one carbon group even though that carbon is secondary; amines are classified by the nitrogen, not by the carbon.',
  },
  {
    f: '(CH3)3CNH2',
    name: 'tert-butylamine',
    cls: 'primary amine',
    groups: 1,
    note: 'The tert-butyl carbon is tertiary, but the nitrogen carries only one carbon group; amines are classified by the nitrogen.',
  },
  { f: 'C6H5NH2', name: 'aniline', cls: 'primary amine', groups: 1 },
  { f: '(CH3)2NH', name: 'dimethylamine', cls: 'secondary amine', groups: 2 },
  { f: 'CH3NHC2H5', name: 'N-methylethanamine', cls: 'secondary amine', groups: 2 },
  { f: '(C2H5)2NH', name: 'diethylamine', cls: 'secondary amine', groups: 2 },
  { f: 'C6H5NHCH3', name: 'N-methylaniline', cls: 'secondary amine', groups: 2 },
  { f: '(CH3)3N', name: 'trimethylamine', cls: 'tertiary amine', groups: 3 },
  { f: '(C2H5)3N', name: 'triethylamine', cls: 'tertiary amine', groups: 3 },
  { f: '(CH3)2NC2H5', name: 'N,N-dimethylethanamine', cls: 'tertiary amine', groups: 3 },
  { f: 'C6H5N(CH3)2', name: 'N,N-dimethylaniline', cls: 'tertiary amine', groups: 3 },
  { f: '(CH3)4N+Cl-', name: 'tetramethylammonium chloride', cls: 'quaternary ammonium salt', groups: 4 },
  { f: '(C2H5)4N+Br-', name: 'tetraethylammonium bromide', cls: 'quaternary ammonium salt', groups: 4 },
];

const AMINE_CLASSES: readonly AmineClass[] = [
  'primary amine',
  'secondary amine',
  'tertiary amine',
  'quaternary ammonium salt',
];

const SN1 = tex`$\mathrm{S_N1}$`;
const SN2 = tex`$\mathrm{S_N2}$`;

interface Substrate {
  name: string;
  f: string;
  kind: string;
}

const SN_SUBSTRATES: Readonly<Record<'sn1' | 'sn2', readonly Substrate[]>> = {
  sn2: [
    { name: 'bromomethane', f: 'CH3Br', kind: 'methyl' },
    { name: 'bromoethane', f: 'CH3CH2Br', kind: 'primary' },
    { name: '1-chloropropane', f: 'CH3CH2CH2Cl', kind: 'primary' },
    { name: 'iodoethane', f: 'CH3CH2I', kind: 'primary' },
  ],
  sn1: [
    { name: '2-bromo-2-methylpropane', f: '(CH3)3CBr', kind: 'tertiary' },
    { name: '2-chloro-2-methylpropane', f: '(CH3)3CCl', kind: 'tertiary' },
    { name: '2-bromo-2-methylbutane', f: 'CH3CH2C(CH3)2Br', kind: 'tertiary' },
  ],
};

const FACTOR_WORDS: Readonly<Record<number, string>> = { 2: 'doubled', 3: 'tripled', 4: 'quadrupled' };

const SN_TRUTHS = [
  tex`An ${SN2} reaction takes place in a single step through a transition state.`,
  tex`An ${SN1} reaction proceeds through a carbocation intermediate.`,
  tex`An ${SN2} reaction at a chiral carbon inverts its configuration.`,
  tex`The rate of an ${SN1} reaction depends only on the concentration of the alkyl halide.`,
  tex`Tertiary alkyl halides undergo substitution mainly by the ${SN1} mechanism.`,
  tex`In an ${SN2} reaction the nucleophile attacks from the side opposite the leaving group.`,
  tex`Primary alkyl halides undergo substitution mainly by the ${SN2} mechanism.`,
];

const SN_FALSEHOODS = [
  tex`An ${SN1} reaction is second order overall.`,
  tex`An ${SN2} reaction proceeds through a carbocation intermediate.`,
  tex`Primary alkyl halides undergo substitution mainly by the ${SN1} mechanism.`,
  tex`The rate of an ${SN2} reaction does not depend on the nucleophile concentration.`,
  tex`An ${SN1} reaction at a chiral carbon gives complete inversion of configuration.`,
  tex`In an ${SN2} reaction the nucleophile attacks from the same side as the leaving group.`,
  tex`Tertiary alkyl halides react fastest by the ${SN2} mechanism.`,
];

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'alkyl-halides-amines', (b) => [
  // ---- Dynamic -------------------------------------------------------------
  b.dynamic('grignard-product', { difficulty: 2, origin: 'past-paper', tags: ['Grignard reagent'] }, (r) => {
    const alkyl = r.pick(ALKYLS);
    const hal = r.pick(HALOGENS.filter((h) => h.x !== 'Cl'));
    const prod = r.pick(GRIGNARD_PRODUCTS);
    const i = alkyl.c - 1;
    const answer = prod.names[i];
    const others = GRIGNARD_PRODUCTS.filter((p) => p.key !== prod.key).map((p) => p.names[i]);
    const reagentText = prod.key === 'water' ? `$${prod.reagent}$` : prod.reagent;
    return {
      stem: tex`${capitalise(alkyl.name)}magnesium ${hal.name} ($\ce{${alkyl.r}Mg${hal.x}}$) is treated with ${reagentText}. The organic product is:`,
      answer,
      distractors: pickDistractors(answer, others, r),
      explanation: tex`A Grignard reagent supplies a nucleophilic ${alkyl.name} group (${alkyl.c} C). With ${reagentText}, it gives ${prod.cls}: **${answer}**. (Water gives an alkane; $\ce{CO2}$ an acid with one extra carbon; methanal a $1^{\circ}$ alcohol; other aldehydes a $2^{\circ}$ alcohol; ketones a $3^{\circ}$ alcohol.)`,
    };
  }),

  b.dynamic('grignard-mass-calc', { difficulty: 1, tags: ['Grignard reagent'] }, (r) => {
    const alkyl = r.pick(ALKYLS.slice(0, 2));
    const hal = r.pick(HALOGENS);
    const i = alkyl.c - 1;
    const halide = `${alkyl.r}${hal.x}`;
    const mRX = molarMass(halide);
    const mRMgX = molarMass(`${alkyl.r}Mg${hal.x}`);
    const mRH = molarMass(ALKANE_FORMULAS[i] as string);
    const n = r.pick(
      [0.1, 0.2, 0.25, 0.4, 0.5, 1, 1.5, 2, 2.5, 3].filter((k) => Math.abs(k * mRX * 100 - Math.round(k * mRX * 100)) < 1e-6),
    );
    const halideName = `${HALIDE_NAMES[hal.x]}${HALIDE_PARENTS[i]}`;
    const fmt = (x: number): string => q$(Number(x.toFixed(2)), U.g, { dp: 2 });
    if (r.chance(0.5)) {
      const correct = n * mRX;
      const half = correct / 2;
      const clean2 = Math.abs(half * 100 - Math.round(half * 100)) < 1e-6;
      const { answer, distractors } = numericOptions(r, {
        correct,
        // used M(RMgX); took 2 mol RX per mol RMgX; halved; forgot to multiply by n
        wrong: [n * mRMgX, 2 * correct, ...(clean2 ? [half] : []), mRX, n * mRH],
        format: fmt,
      });
      return {
        stem: tex`The mass of ${halideName} ($\ce{${halide}}$) needed to prepare $${num(n)}\,\mathrm{mol}$ of $\ce{${alkyl.r}Mg${hal.x}}$ (1 : 1 reaction with Mg) is:`,
        answer,
        distractors,
        explanation: tex`$\ce{${halide} + Mg -> ${alkyl.r}Mg${hal.x}}$, so moles of halide = $${num(n)}\,\mathrm{mol}$. $M(\ce{${halide}}) = ${num(mRX)}\,\mathrm{g\,mol^{-1}}$. Mass = $${num(n)} \times ${num(mRX)} = ${num(correct, { dp: 2 })}\,\mathrm{g}$.`,
      };
    }
    const given = n * mRX;
    const correct = n * mRH;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [n * (mRH - 1), (n * mRH) / 2, 2 * n * mRH, n * mRMgX],
      format: fmt,
    });
    return {
      stem: tex`$${num(given, { dp: 2 })}\,\mathrm{g}$ of ${halideName} is completely converted into $\ce{${alkyl.r}Mg${hal.x}}$, which is then hydrolysed with water. The mass of ${ALKANE_NAMES[i]} formed is:`,
      answer,
      distractors,
      explanation: tex`Moles of $\ce{${halide}} = \frac{${num(given, { dp: 2 })}}{${num(mRX)}} = ${num(n)}\,\mathrm{mol}$. $\ce{${alkyl.r}Mg${hal.x} + H2O -> ${ALKANE_FORMULAS[i]} + Mg(OH)${hal.x}}$ (1 : 1), so mass of $\ce{${ALKANE_FORMULAS[i]}} = ${num(n)} \times ${num(mRH)} = ${num(correct, { dp: 2 })}\,\mathrm{g}$.`,
    };
  }),

  b.dynamic('sn-rate-change', { difficulty: 2, tags: ['SN1 and SN2'] }, (r) => {
    const mech = r.pick(['sn1', 'sn2'] as const);
    const sub = r.pick(SN_SUBSTRATES[mech]);
    const a = r.pick([2, 3, 4]);
    const bf = r.intExcept(2, 4, [a]);
    const correct = mech === 'sn2' ? a * bf : a;
    const wrong = mech === 'sn2' ? [a, bf, a + bf] : [a * bf, bf, a + bf];
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong,
      format: (x) => `${num(x)} times`,
    });
    const law = mech === 'sn2' ? tex`$\text{rate} = k[\text{RX}][\ce{OH-}]$` : tex`$\text{rate} = k[\text{RX}]$`;
    return {
      stem: tex`${capitalise(sub.name)} ($\ce{${sub.f}}$) is hydrolysed by aqueous $\ce{NaOH}$. If the concentration of the alkyl halide is ${FACTOR_WORDS[a]} and that of $\ce{OH-}$ is ${FACTOR_WORDS[bf]}, the rate of reaction becomes:`,
      answer,
      distractors,
      explanation:
        mech === 'sn2'
          ? tex`A ${sub.kind} halide reacts by ${SN2}: ${law}, first order in each reactant. New rate $= ${a} \times ${bf} = ${correct}$ times.`
          : tex`A tertiary halide reacts by ${SN1}: ${law}; the slow step is ionisation of RX, so $[\ce{OH-}]$ has no effect. New rate $= ${a}$ times.`,
    };
  }),

  b.dynamic('sn-statements', { difficulty: 2, tags: ['SN1 and SN2'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about nucleophilic substitution in alkyl halides is correct?',
      negativeStem: 'Which statement about nucleophilic substitution in alkyl halides is incorrect?',
      truths: SN_TRUTHS,
      falsehoods: SN_FALSEHOODS,
      explain: (ans, inverted) =>
        tex`${inverted ? 'The false statement is' : 'The correct statement is'}: "${ans}" Key facts: ${SN1} is two-step, via a planar carbocation, first order (rate $= k[\text{RX}]$), favoured by $3^{\circ}$ halides and gives racemisation; ${SN2} is one-step, second order (rate $= k[\text{RX}][\text{Nu}^-]$), favoured by methyl and $1^{\circ}$ halides, with backside attack and inversion.`,
    }),
  ),

  b.dynamic('classify-amine', { difficulty: 1, tags: ['amines'] }, (r) => {
    const amine = r.pick(AMINES);
    return {
      stem: tex`The compound $\ce{${amine.f}}$ (${amine.name}) is classified as a:`,
      answer: amine.cls,
      distractors: AMINE_CLASSES.filter((c) => c !== amine.cls),
      explanation: tex`Nitrogen in $\ce{${amine.f}}$ is bonded to ${amine.groups} alkyl/aryl group${amine.groups > 1 ? 's' : ''}, so it is a ${amine.cls}.${amine.note ? ' ' + amine.note : ''}`,
    };
  }),

  // ---- Fixed: SN1 and SN2 --------------------------------------------------
  ...b.mcqs([
    {
      id: 'sn2-walden-inversion', d: 1, o: 'past-paper', t: ['SN1 and SN2'],
      q: tex`When an ${SN2} reaction occurs at a chiral carbon atom, the configuration of the product is:`,
      a: 'inverted relative to the substrate',
      x: ['retained as in the substrate', 'converted into a racemic mixture', 'converted into a meso form'],
      e: tex`In ${SN2} the nucleophile attacks from the back side as the leaving group departs, so the carbon turns "inside out" like an umbrella (Walden inversion). Racemisation is typical of ${SN1}.`,
    },
    {
      id: 'sn1-racemisation', d: 3, t: ['SN1 and SN2'],
      q: 'Hydrolysis of optically active 3-bromo-3-methylhexane in water gives mainly:',
      a: 'a nearly racemic mixture of the alcohol',
      x: [
        'the alcohol with complete inversion of configuration',
        'the alcohol with complete retention of configuration',
        'a single optically pure alkene',
      ],
      e: tex`The substrate is a tertiary halide, so it reacts by ${SN1}. The planar carbocation intermediate is attacked by water almost equally from both faces, giving both enantiomers of 3-methylhexan-3-ol (a nearly racemic mixture).`,
    },
    {
      id: 'carbon-halogen-reactivity', d: 1, o: 'past-paper', t: ['SN1 and SN2'],
      q: 'For the same alkyl group, the reactivity of alkyl halides in nucleophilic substitution follows the order:',
      a: 'R–I > R–Br > R–Cl > R–F',
      x: ['R–F > R–Cl > R–Br > R–I', 'R–Cl > R–Br > R–I > R–F', 'R–Br > R–I > R–F > R–Cl'],
      e: tex`The C–X bond becomes longer and weaker from C–F to C–I, and $\ce{I-}$ is the best leaving group. Hence R–I reacts fastest and R–F slowest.`,
    },
    {
      id: 'tertiary-favours-sn1', d: 1, t: ['SN1 and SN2'],
      q: tex`Which alkyl halide undergoes ${SN1} reaction most readily?`,
      a: tex`$\ce{(CH3)3CBr}$`,
      x: [tex`$\ce{CH3Br}$`, tex`$\ce{CH3CH2Br}$`, tex`$\ce{(CH3)2CHBr}$`],
      e: tex`${SN1} rate depends on carbocation stability: $3^{\circ} > 2^{\circ} > 1^{\circ} > \text{methyl}$. $\ce{(CH3)3CBr}$ gives the tertiary butyl cation, stabilised by three alkyl groups.`,
    },
  ]),

  // ---- Fixed: elimination --------------------------------------------------
  ...b.mcqs([
    {
      id: 'alcoholic-koh-elimination', d: 1, o: 'past-paper', t: ['elimination'],
      q: 'Bromoethane heated with alcoholic KOH gives mainly:',
      a: 'ethene',
      x: ['ethanol', 'ethane', 'ethyne'],
      e: tex`Alcoholic KOH (a strong base, little water) removes HBr from adjacent carbons (dehydrohalogenation): $\ce{CH3CH2Br + KOH ->[{alc.}] CH2=CH2 + KBr + H2O}$. Aqueous KOH would substitute to give ethanol.`,
    },
    {
      id: 'saytzeff-2-bromobutane', d: 2, t: ['elimination'],
      q: 'Dehydrobromination of 2-bromobutane with alcoholic KOH gives as the major product:',
      a: 'but-2-ene',
      x: ['but-1-ene', 'butan-2-ol', 'butane'],
      e: tex`Hydrogen can be lost from C-1 or C-3. By Saytzeff's rule the more substituted (more stable) alkene predominates, so $\ce{CH3CH=CHCH3}$ (but-2-ene) is major and but-1-ene is minor.`,
    },
    {
      id: 'e2-mechanism', d: 2, t: ['elimination'],
      q: 'The E2 mechanism of dehydrohalogenation is:',
      a: 'one step, with rate depending on both [alkyl halide] and [base]',
      x: [
        'two steps, through a carbocation intermediate',
        'one step, with rate depending only on [alkyl halide]',
        'two steps, with rate depending only on [base]',
      ],
      e: tex`In E2 (bimolecular elimination) the base removes a $\beta$-hydrogen while the halide leaves, all in one concerted step: rate $= k[\text{RX}][\text{B}^-]$. The carbocation pathway is E1.`,
    },
  ]),

  // ---- Fixed: Grignard reagent --------------------------------------------
  ...b.mcqs([
    {
      id: 'grignard-dry-ether', d: 1, o: 'past-paper', t: ['Grignard reagent'],
      q: 'Grignard reagents are prepared and used in dry ether because they:',
      a: 'react with water to form alkanes',
      x: ['are insoluble in dry ether', 'need water as a catalyst', 'are oxidised by ether'],
      e: tex`$\ce{RMgX + H2O -> RH + Mg(OH)X}$: even traces of moisture destroy the reagent. Dry ether is inert towards it and dissolves and stabilises $\ce{RMgX}$ by coordinating to Mg.`,
    },
    {
      id: 'grignard-carbanion', d: 2, t: ['Grignard reagent'],
      q: tex`In a Grignard reagent $\ce{R-MgX}$, the carbon atom bonded to magnesium acts as a:`,
      a: 'nucleophile with carbanion character',
      x: ['electrophile with carbocation character', 'free radical', 'Lewis acid'],
      e: tex`Carbon (EN 2.5) is more electronegative than magnesium (EN 1.2), so the C–Mg bond is polarised $\ce{C^{\delta -}-Mg^{\delta +}}$. The carbon behaves like a carbanion and attacks electrophilic centres such as the carbonyl carbon.`,
    },
  ]),

  // ---- Fixed: amines -------------------------------------------------------
  ...b.mcqs([
    {
      id: 'weakest-base-aniline', d: 2, t: ['amines'],
      q: 'Which of the following is the weakest base?',
      a: tex`aniline, $\ce{C6H5NH2}$`,
      x: [tex`ammonia, $\ce{NH3}$`, tex`methylamine, $\ce{CH3NH2}$`, tex`dimethylamine, $\ce{(CH3)2NH}$`],
      e: tex`In aniline the lone pair on nitrogen is delocalised into the benzene ring, so it is less available for a proton. Alkyl groups (+I effect) make methylamine and dimethylamine stronger bases than ammonia.`,
    },
    {
      id: 'carbylamine-test', d: 1, o: 'past-paper', t: ['amines'],
      q: 'A primary amine warmed with chloroform and alcoholic KOH gives an offensive-smelling:',
      a: 'isocyanide (carbylamine)',
      x: ['nitrile (alkyl cyanide)', 'nitro compound', 'quaternary ammonium salt'],
      e: tex`Carbylamine test: $\ce{RNH2 + CHCl3 + 3KOH -> RNC + 3KCl + 3H2O}$. The isocyanide has a very unpleasant smell; secondary and tertiary amines do not give this test.`,
    },
    {
      id: 'ammonolysis-mixture', d: 2, t: ['amines'],
      q: 'Heating an alkyl halide with alcoholic ammonia in a sealed tube gives:',
      a: 'a mixture of 1°, 2° and 3° amines and a quaternary salt',
      x: ['only a primary amine', 'only a tertiary amine', 'an alcohol and nitrogen gas'],
      e: tex`The primary amine formed ($\ce{RX + NH3 -> RNH2 + HX}$) is itself a nucleophile and reacts with more RX, giving $\ce{R2NH}$, $\ce{R3N}$ and finally $\ce{R4N+X-}$. This is why ammonolysis gives a mixture.`,
    },
    {
      id: 'tert-butyl-bromide-name', d: 1, t: ['SN1 and SN2'],
      q: tex`The IUPAC name of $\ce{(CH3)3C-Br}$ is:`,
      a: '2-bromo-2-methylpropane',
      x: ['1-bromo-2-methylpropane', '2-bromobutane', '1-bromo-1,1-dimethylethane'],
      e: 'The longest chain containing the C–Br carbon has three carbons (propane); bromine and a methyl group are both on C-2. Common name: tert-butyl bromide.',
    },
  ]),
]);
