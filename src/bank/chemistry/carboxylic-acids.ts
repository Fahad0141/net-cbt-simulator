import { defineBank } from '@/engine/authoring';
import { ce, num, numericOptions, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface Acid {
  /** mhchem formula. */
  f: string;
  name: string;
  /** Molar mass, g mol^-1 (FSc-rounded: C 12, H 1, O 16). */
  m: number;
  /** Number of carboxyl groups (replaceable H per molecule). */
  basicity: 1 | 2;
}

const ACIDS: readonly Acid[] = [
  { f: 'HCOOH', name: 'methanoic (formic) acid', m: 46, basicity: 1 },
  { f: 'CH3COOH', name: 'ethanoic (acetic) acid', m: 60, basicity: 1 },
  { f: 'CH3CH2COOH', name: 'propanoic acid', m: 74, basicity: 1 },
  { f: 'C6H5COOH', name: 'benzoic acid', m: 122, basicity: 1 },
  { f: 'HOOC-COOH', name: 'ethanedioic (oxalic) acid', m: 90, basicity: 2 },
];

interface StrengthItem {
  q: string;
  options: readonly string[];
  answer: string;
  e: string;
}

const CHLOROACETIC = ['CH3COOH', 'ClCH2COOH', 'Cl2CHCOOH', 'Cl3CCOOH'].map((f) => `$${ce(f)}$`);
const HALOACETIC = ['FCH2COOH', 'ClCH2COOH', 'BrCH2COOH', 'ICH2COOH'].map((f) => `$${ce(f)}$`);

const STRENGTH: readonly StrengthItem[] = [
  {
    q: 'Which of the following is the strongest acid?',
    options: CHLOROACETIC,
    answer: `$${ce('Cl3CCOOH')}$`,
    e: tex`Each Cl withdraws electron density (−I effect) and stabilises the carboxylate ion. Three Cl atoms give the greatest effect, so trichloroethanoic acid ($pK_a \approx 0.7$) is the strongest.`,
  },
  {
    q: 'Which of the following is the weakest acid?',
    options: CHLOROACETIC,
    answer: `$${ce('CH3COOH')}$`,
    e: tex`Ethanoic acid has no electron-withdrawing chlorine, so its anion is the least stabilised ($pK_a \approx 4.76$). Acidity rises with each Cl added.`,
  },
  {
    q: 'Which of the following is the strongest acid?',
    options: HALOACETIC,
    answer: `$${ce('FCH2COOH')}$`,
    e: tex`Fluorine is the most electronegative halogen, so its −I effect is largest and fluoroethanoic acid ($pK_a \approx 2.6$) is the strongest; iodoethanoic acid is the weakest of the four.`,
  },
  {
    q: 'Which of the following is the weakest acid?',
    options: HALOACETIC,
    answer: `$${ce('ICH2COOH')}$`,
    e: tex`Iodine is the least electronegative halogen, so it withdraws electrons least and iodoethanoic acid ($pK_a \approx 3.2$) is the weakest of the four.`,
  },
  {
    q: 'Which of the following is the strongest acid?',
    options: ['HCOOH', 'CH3COOH', 'CH3CH2COOH', 'CH3CH2CH2COOH'].map((f) => `$${ce(f)}$`),
    answer: `$${ce('HCOOH')}$`,
    e: tex`Alkyl groups donate electrons (+I effect) and destabilise the carboxylate ion. Methanoic acid has no alkyl group, so it is the strongest ($pK_a \approx 3.75$ against $4.76$ for ethanoic acid).`,
  },
  {
    q: 'Which of the following is the most acidic?',
    options: ['ethanoic acid', 'phenol', 'ethanol', 'water'],
    answer: 'ethanoic acid',
    e: tex`Ethanoic acid ($pK_a \approx 4.8$) is far stronger than phenol ($\approx 10$), water and ethanol (about $16$), because its anion is stabilised by resonance over two equivalent oxygen atoms.`,
  },
];

/** Reagents for conversions of carboxylic acids and their salts. */
const REAGENTS = {
  socl2: tex`thionyl chloride, $\ce{SOCl2}$`,
  p2o5: tex`phosphorus pentoxide, $\ce{P2O5}$, on heating`,
  lialh4: tex`lithium aluminium hydride, $\ce{LiAlH4}$`,
  nh3: tex`ammonia, then heating the ammonium salt`,
  ester: tex`ethanol and a little conc. $\ce{H2SO4}$`,
  sodaLime: tex`soda lime ($\ce{NaOH + CaO}$), on heating`,
} as const;

type ReagentKey = keyof typeof REAGENTS;

interface Conversion {
  q: string;
  answer: ReagentKey;
  e: string;
}

const CONVERSIONS: readonly Conversion[] = [
  {
    q: tex`Ethanoic acid is converted into ethanoyl chloride, $\ce{CH3COCl}$, by treating it with:`,
    answer: 'socl2',
    e: tex`$\ce{CH3COOH + SOCl2 -> CH3COCl + SO2 + HCl}$. The by-products are gases, so the acid chloride is easily obtained pure ($\ce{PCl5}$ or $\ce{PCl3}$ also work).`,
  },
  {
    q: tex`Ethanoic acid is converted into ethanoic anhydride, $\ce{(CH3CO)2O}$, by treating it with:`,
    answer: 'p2o5',
    e: tex`$\ce{P2O5}$ is a powerful dehydrating agent; it removes one $\ce{H2O}$ from two acid molecules: $\ce{2CH3COOH -> (CH3CO)2O + H2O}$.`,
  },
  {
    q: tex`Ethanoic acid is reduced to ethanol, $\ce{CH3CH2OH}$, by treating it with:`,
    answer: 'lialh4',
    e: tex`Carboxylic acids are reduced directly to primary alcohols by the strong hydride donor $\ce{LiAlH4}$ (in dry ether), followed by hydrolysis.`,
  },
  {
    q: tex`Ethanamide (acetamide), $\ce{CH3CONH2}$, is prepared from ethanoic acid by treating it with:`,
    answer: 'nh3',
    e: tex`$\ce{CH3COOH + NH3 -> CH3COONH4}$; on heating, the ammonium salt loses water: $\ce{CH3COONH4 -> CH3CONH2 + H2O}$.`,
  },
  {
    q: tex`Ethyl ethanoate, $\ce{CH3COOC2H5}$, is prepared from ethanoic acid by treating it with:`,
    answer: 'ester',
    e: tex`Esterification: $\ce{CH3COOH + C2H5OH <=> CH3COOC2H5 + H2O}$. Conc. $\ce{H2SO4}$ acts as catalyst and absorbs the water, shifting the equilibrium forward.`,
  },
  {
    q: tex`Methane is obtained from sodium ethanoate, $\ce{CH3COONa}$, by treating it with:`,
    answer: 'sodaLime',
    e: tex`Decarboxylation: $\ce{CH3COONa + NaOH ->[CaO][\Delta] CH4 + Na2CO3}$. The alkane formed has one carbon atom fewer than the acid.`,
  },
];

interface NamedAcid {
  f: string;
  common: string;
  iupac: string;
}

const NAMED_ACIDS: readonly NamedAcid[] = [
  { f: 'HCOOH', common: 'formic acid', iupac: 'methanoic acid' },
  { f: 'CH3COOH', common: 'acetic acid', iupac: 'ethanoic acid' },
  { f: 'CH3CH2COOH', common: 'propionic acid', iupac: 'propanoic acid' },
  { f: 'CH3(CH2)2COOH', common: 'butyric acid', iupac: 'butanoic acid' },
  { f: 'CH3(CH2)3COOH', common: 'valeric acid', iupac: 'pentanoic acid' },
  { f: 'HOOC-COOH', common: 'oxalic acid', iupac: 'ethanedioic acid' },
  { f: 'HOOC-CH2-COOH', common: 'malonic acid', iupac: 'propanedioic acid' },
  { f: 'HOOC-(CH2)2-COOH', common: 'succinic acid', iupac: 'butanedioic acid' },
  { f: 'CH3CH(OH)COOH', common: 'lactic acid', iupac: '2-hydroxypropanoic acid' },
  { f: 'CH2=CHCOOH', common: 'acrylic acid', iupac: 'propenoic acid' },
];

const TRUE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    tex`Carboxylic acids liberate $\ce{CO2}$ from sodium hydrogencarbonate solution.`,
    tex`They are stronger acids than carbonic acid: $\ce{RCOOH + NaHCO3 -> RCOONa + H2O + CO2}$. This effervescence distinguishes them from phenols.`,
  ],
  [
    'Both carbon-oxygen bonds in a carboxylate ion have the same length.',
    'The negative charge is delocalised by resonance over both oxygen atoms, so the two C–O bonds are equivalent (intermediate between single and double).',
  ],
  [
    'Lower carboxylic acids exist as hydrogen-bonded dimers in the vapour phase and in benzene.',
    'Two molecules are joined by a pair of O–H···O hydrogen bonds, which is also why their boiling points are high.',
  ],
  [
    "Methanoic acid reduces Tollens' reagent.",
    tex`$\ce{HCOOH}$ contains an aldehyde-like H–C=O unit, so it is oxidised to $\ce{CO2}$ and $\ce{H2O}$ while silver ions are reduced to a silver mirror.`,
  ],
  [
    'Electron-withdrawing groups near the carboxyl group increase acid strength.',
    'They disperse the negative charge of the carboxylate ion (−I effect), stabilising it and favouring ionisation.',
  ],
  [
    'Esterification of a carboxylic acid with an alcohol is a reversible reaction.',
    tex`$\ce{RCOOH + R'OH <=> RCOOR' + H2O}$ reaches equilibrium; conc. $\ce{H2SO4}$ catalyses it and removes water.`,
  ],
];

const FALSE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'Ethanoic acid is a stronger acid than hydrochloric acid.',
    tex`Carboxylic acids are weak acids; ethanoic acid is only slightly ionised ($K_a \approx 1.8 \times 10^{-5}$), whereas $\ce{HCl}$ ionises completely.`,
  ],
  [
    'Electron-donating alkyl groups increase the strength of carboxylic acids.',
    'Alkyl groups (+I effect) intensify the negative charge on the carboxylate ion and decrease acid strength; methanoic acid is stronger than ethanoic acid.',
  ],
  [
    "Ethanoic acid reduces Fehling's solution.",
    "Ethanoic acid has no aldehyde-like hydrogen and does not reduce Fehling's solution; among the simple monocarboxylic acids only methanoic acid, with its H–C=O unit, is a reducing agent.",
  ],
  [
    tex`$\ce{LiAlH4}$ reduces carboxylic acids to aldehydes.`,
    tex`$\ce{LiAlH4}$ reduces carboxylic acids all the way to primary alcohols; the aldehyde is not isolated.`,
  ],
  [
    'Carboxylic acids boil at lower temperatures than alcohols of similar molar mass.',
    'They boil higher: ethanoic acid (118 °C) versus propan-1-ol (97 °C), both with M = 60, because the acid forms hydrogen-bonded dimers.',
  ],
  [
    tex`Phenol, like carboxylic acids, liberates $\ce{CO2}$ from sodium hydrogencarbonate solution.`,
    tex`Phenol ($pK_a \approx 10$) is weaker than carbonic acid and gives no effervescence with $\ce{NaHCO3}$; only carboxylic acids do.`,
  ],
];

const STATEMENT_REASON = new Map<string, string>([...TRUE_STATEMENTS, ...FALSE_STATEMENTS]);

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'carboxylic-acids', (b) => [
  b.dynamic('neutralization-volume', { difficulty: 2, tags: ['acidity'] }, (r) => {
    const acid = r.pick(ACIDS);
    let n = 0;
    let c = 0;
    let v = 0;
    do {
      n = r.pick([0.01, 0.02, 0.04, 0.05, 0.1]);
      c = r.pick([0.1, 0.2, 0.25, 0.5, 1]);
      v = (n * acid.basicity * 1000) / c;
    } while (v < 20 || v > 500);
    const mass = n * acid.m;
    const nOH = n * acid.basicity;
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      wrong: [
        acid.basicity === 2 ? v / 2 : v * 2, // wrong mole ratio (basicity)
        n * acid.basicity * c * 1000, // multiplied by molarity instead of dividing
        v / 10,
        v * 1.5,
      ],
      format: (x) => q$(x, U.cm3),
    });
    const eq =
      acid.basicity === 2
        ? tex`\ce{HOOC-COOH + 2NaOH -> NaOOC-COONa + 2H2O}`
        : tex`\ce{${acid.f} + NaOH -> ${acid.f.replace(/COOH$/, 'COONa')} + H2O}`;
    const nOHTex = acid.basicity === 2 ? `2(${num(n)}) = ${num(nOH)}` : num(nOH);
    return {
      stem: tex`The volume of $${qty(c, U.molL)}$ $${ce('NaOH')}$ needed to neutralise $${qty(mass, U.g)}$ of ${acid.name}, $${ce(acid.f)}$, completely is: ($M = ${acid.m}\,\mathrm{g\,mol^{-1}}$)`,
      answer,
      distractors,
      explanation: tex`$${eq}$. $n_{\text{acid}} = \dfrac{${num(mass)}}{${acid.m}} = ${num(n)}\,\mathrm{mol}$, so $n_{\ce{NaOH}} = ${nOHTex}\,\mathrm{mol}$. $V = \dfrac{n}{c} = \dfrac{${num(nOH)}}{${num(c)}} = ${num(v / 1000)}\,\mathrm{dm^{3}} = ${num(v)}\,\mathrm{cm^{3}}$.`,
    };
  }),

  b.dynamic('bicarbonate-co2-volume', { difficulty: 1, tags: ['acidity'] }, (r) => {
    const acid = r.pick(ACIDS);
    const n = r.pick([0.05, 0.1, 0.2, 0.25, 0.5, 1]);
    const mass = n * acid.m;
    const nCO2 = n * acid.basicity;
    const v = nCO2 * 22.4;
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      wrong: [
        acid.basicity === 2 ? n * 22.4 : 2 * n * 22.4, // wrong mole ratio
        nCO2 * 11.2, // halved the molar volume
        nCO2 * 24, // room-temperature molar volume
        nCO2 * 44, // used the molar mass of CO2
      ],
      format: (x) => q$(x, U.dm3),
    });
    const eq =
      acid.basicity === 2
        ? tex`\ce{HOOC-COOH + 2NaHCO3 -> NaOOC-COONa + 2H2O + 2CO2}`
        : tex`\ce{${acid.f} + NaHCO3 -> ${acid.f.replace(/COOH$/, 'COONa')} + H2O + CO2}`;
    return {
      stem: tex`$${qty(mass, U.g)}$ of ${acid.name}, $${ce(acid.f)}$, reacts completely with excess sodium hydrogencarbonate. The volume of $${ce('CO2')}$ evolved at STP is: ($M = ${acid.m}\,\mathrm{g\,mol^{-1}}$)`,
      answer,
      distractors,
      explanation: tex`$${eq}$. $n_{\text{acid}} = \dfrac{${num(mass)}}{${acid.m}} = ${num(n)}\,\mathrm{mol}$, giving $${num(nCO2)}\,\mathrm{mol}$ $\ce{CO2}$. $V = (${num(nCO2)})(22.4) = ${num(v)}\,\mathrm{dm^{3}}$.`,
    };
  }),

  b.dynamic('acid-strength-order', { difficulty: 2, origin: 'past-paper', tags: ['acidity'] }, (r) => {
    const t = r.pick(STRENGTH);
    return {
      stem: t.q,
      answer: t.answer,
      distractors: t.options.filter((o) => o !== t.answer),
      explanation: t.e,
    };
  }),

  b.dynamic('derivative-reagent', { difficulty: 1, tags: ['derivatives', 'preparation'] }, (r) => {
    const conv = r.pick(CONVERSIONS);
    const others = (Object.keys(REAGENTS) as ReagentKey[]).filter((k) => k !== conv.answer);
    return {
      stem: conv.q,
      answer: REAGENTS[conv.answer],
      distractors: r.sample(others, 3).map((k) => REAGENTS[k]),
      explanation: conv.e,
    };
  }),

  b.dynamic('iupac-common-names', { difficulty: 1, origin: 'past-paper', tags: ['acidity'] }, (r) => {
    const acid = r.pick(NAMED_ACIDS);
    const wrong = r.sample(
      NAMED_ACIDS.filter((a) => a !== acid),
      3,
    ).map((a) => a.iupac);
    const byFormula = r.chance(0.5);
    return {
      stem: byFormula
        ? tex`The IUPAC name of $${ce(acid.f)}$ is:`
        : `The IUPAC name of ${acid.common} is:`,
      answer: acid.iupac,
      distractors: wrong,
      explanation: tex`${acid.common[0]?.toUpperCase() ?? ''}${acid.common.slice(1)} is $${ce(acid.f)}$; its IUPAC name is ${acid.iupac} (count the longest chain including the carboxyl carbon(s) and use the suffix -oic acid, or -dioic acid for two $\ce{COOH}$ groups).`,
    };
  }),

  b.dynamic('carboxylic-statements', { difficulty: 1, tags: ['acidity', 'derivatives'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about carboxylic acids is correct?',
      negativeStem: 'Which of the following statements about carboxylic acids is incorrect?',
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
      id: 'grignard-carbon-dioxide',
      d: 1,
      o: 'past-paper',
      t: ['preparation'],
      q: tex`Methylmagnesium bromide, $\ce{CH3MgBr}$, reacts with dry $\ce{CO2}$ and the product is hydrolysed with dilute acid. The final product is:`,
      a: 'ethanoic acid',
      x: ['methanoic acid', 'propanoic acid', 'ethanal'],
      e: tex`The Grignard reagent adds to $\ce{CO2}$ to give $\ce{CH3COOMgBr}$, which is hydrolysed to $\ce{CH3COOH}$. The acid has one carbon more than the alkyl group of the Grignard reagent.`,
    },
    {
      id: 'nitrile-hydrolysis',
      d: 1,
      t: ['preparation'],
      q: tex`Acid hydrolysis of ethanenitrile, $\ce{CH3CN}$, gives:`,
      a: 'ethanoic acid',
      x: ['methanoic acid', 'propanoic acid', 'ethanamine'],
      e: tex`$\ce{CH3CN + 2H2O + H+ -> CH3COOH + NH4+}$. The nitrile carbon becomes the carboxyl carbon, so no carbon is gained or lost. Ethanamine would come from reducing the nitrile.`,
    },
    {
      id: 'primary-alcohol-oxidation',
      d: 1,
      t: ['preparation'],
      q: tex`Propan-1-ol is heated under reflux with excess acidified $\ce{K2Cr2O7}$. The final organic product is:`,
      a: 'propanoic acid',
      x: ['propanone', 'ethanoic acid', 'propene'],
      e: tex`A primary alcohol is oxidised first to the aldehyde (propanal) and, with excess oxidant under reflux, on to the carboxylic acid with the same number of carbons: $\ce{CH3CH2CH2OH -> CH3CH2COOH}$. Propanone would come from propan-2-ol.`,
    },
    {
      id: 'formic-acid-source',
      d: 1,
      o: 'past-paper',
      t: ['acidity'],
      q: 'Formic acid gets its name because it was first obtained from:',
      a: 'red ants',
      x: ['vinegar', 'rancid butter', 'sour milk'],
      e: 'The name comes from the Latin formica, meaning ant; formic acid was first obtained by distilling red ants. Rancid butter contains butyric acid and sour milk contains lactic acid.',
    },
    {
      id: 'vinegar-composition',
      d: 1,
      t: ['acidity'],
      q: 'Vinegar is a dilute aqueous solution containing about:',
      a: '4–5% ethanoic acid',
      x: ['4–5% methanoic acid', '40–50% ethanoic acid', '4–5% oxalic acid'],
      e: 'Vinegar, made by bacterial oxidation of ethanol, contains roughly 4–5% ethanoic (acetic) acid; acetic acid takes its name from the Latin acetum, vinegar.',
    },
    {
      id: 'glacial-acetic-acid',
      d: 1,
      t: ['acidity'],
      q: 'Pure, water-free ethanoic acid is commonly called:',
      a: 'glacial acetic acid',
      x: ['vinegar', 'formalin', 'wood spirit'],
      e: 'Pure ethanoic acid freezes at about 17 °C into an ice-like solid, hence "glacial". Formalin is aqueous methanal and wood spirit is methanol.',
    },
    {
      id: 'derivative-reactivity-order',
      d: 2,
      o: 'past-paper',
      t: ['derivatives'],
      q: 'The correct order of reactivity of acid derivatives towards nucleophilic acyl substitution is:',
      a: 'acid chloride > acid anhydride > ester > amide',
      x: [
        'amide > ester > acid anhydride > acid chloride',
        'acid anhydride > acid chloride > amide > ester',
        'ester > acid chloride > amide > acid anhydride',
      ],
      e: tex`Reactivity depends on how good the leaving group is: $\ce{Cl-}$ (best) > $\ce{RCOO-}$ > $\ce{RO-}$ > $\ce{NH2-}$ (worst). Amides are also stabilised by strong resonance, so they are the least reactive.`,
    },
    {
      id: 'acid-dimer-boiling-point',
      d: 2,
      t: ['acidity'],
      q: 'Ethanoic acid (M = 60) boils at 118 °C while propan-1-ol (M = 60) boils at 97 °C. This is mainly because ethanoic acid:',
      a: 'forms hydrogen-bonded dimers',
      x: ['has a higher molar mass', 'is an ionic compound', 'has only London forces'],
      e: 'Two acid molecules are held together by two O–H···O hydrogen bonds, so the dimer behaves like a much larger molecule and more energy is needed to vaporise it. The molar masses are equal.',
    },
    {
      id: 'carboxylate-resonance',
      d: 2,
      t: ['acidity'],
      q: 'Carboxylic acids are much stronger acids than alcohols mainly because:',
      a: 'the carboxylate ion is stabilised by resonance',
      x: [
        'the alkoxide ion is stabilised by resonance',
        'the O–H bond in acids is stronger',
        'carboxylic acids have higher molar masses',
      ],
      e: tex`In $\ce{RCOO-}$ the negative charge is delocalised equally over two oxygen atoms, which stabilises the anion and favours ionisation. In an alkoxide, $\ce{RO-}$, the charge is localised on one oxygen with no resonance.`,
    },
    {
      id: 'chloro-position-acidity',
      d: 2,
      t: ['acidity'],
      q: 'Which of the following is the strongest acid?',
      a: '2-chlorobutanoic acid',
      x: ['3-chlorobutanoic acid', '4-chlorobutanoic acid', 'butanoic acid'],
      e: tex`The −I effect of chlorine weakens rapidly with distance. On the carbon next to $\ce{COOH}$ it stabilises the anion most ($pK_a \approx 2.9$, against about $4.1$, $4.5$ and $4.8$ for the 3-chloro, 4-chloro and unsubstituted acids).`,
    },
    {
      id: 'ester-odour',
      d: 1,
      t: ['derivatives'],
      q: 'Simple esters such as ethyl ethanoate are recognised by their:',
      a: 'pleasant fruity smell',
      x: ['sharp vinegar smell', 'fishy smell', 'smell of bitter almonds'],
      e: 'Low-molecular-mass esters have sweet fruity odours and are used as flavourings. A vinegar smell is typical of ethanoic acid, a fishy smell of amines and a bitter-almond smell of benzaldehyde.',
    },
    {
      id: 'amino-acid-zwitterion',
      d: 1,
      o: 'past-paper',
      t: ['amino acids'],
      q: 'In aqueous solution near their isoelectric point, amino acids exist mainly as:',
      a: 'zwitterions (dipolar ions)',
      x: ['non-polar molecules', 'free radicals', 'covalent dimers'],
      e: tex`The acidic $\ce{-COOH}$ group gives its proton to the basic $\ce{-NH2}$ group, giving $\ce{H3N+-CHR-COO-}$, which carries both charges but has no net charge.`,
    },
    {
      id: 'glycine-optically-inactive',
      d: 1,
      o: 'past-paper',
      t: ['amino acids'],
      q: 'The only common α-amino acid that is optically inactive is:',
      a: 'glycine',
      x: ['alanine', 'valine', 'serine'],
      e: tex`Glycine, $\ce{H2N-CH2-COOH}$, has two hydrogen atoms on its α-carbon, so that carbon is not chiral. All the other common α-amino acids have a chiral α-carbon.`,
    },
    {
      id: 'peptide-linkage',
      d: 1,
      t: ['amino acids'],
      q: 'Amino acids join together in proteins through a peptide linkage, which is:',
      a: tex`$\ce{-CO-NH\bond{-}}$`,
      x: [tex`$\ce{-CO-O\bond{-}}$`, tex`$\ce{-NH-NH\bond{-}}$`, tex`$\ce{-O\bond{-}}$`],
      e: tex`The $\ce{-COOH}$ of one amino acid condenses with the $\ce{-NH2}$ of the next, losing water and forming an amide (peptide) bond, $\ce{-CO-NH\bond{-}}$. $\ce{-CO-O\bond{-}}$ is an ester link and $\ce{-O\bond{-}}$ an ether (glycosidic) link.`,
    },
  ]),
]);
