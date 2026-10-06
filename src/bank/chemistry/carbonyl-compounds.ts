import { defineBank } from '@/engine/authoring';
import { ce, num, numericOptions, pickDistractors, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const AG = 108;

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

interface Aldehyde {
  name: string;
  f: string;
  m: number;
}

/** Aldehydes (other than methanal) that react with Tollens' reagent in a 1 : 2 ratio of RCHO : Ag. */
const TOLLENS_ALDEHYDES: readonly Aldehyde[] = [
  { name: 'ethanal', f: 'CH3CHO', m: 44 },
  { name: 'propanal', f: 'CH3CH2CHO', m: 58 },
  { name: 'butanal', f: 'CH3CH2CH2CHO', m: 72 },
  { name: 'benzaldehyde', f: 'C6H5CHO', m: 106 },
];

interface Reducible {
  name: string;
  f: string;
  m: number;
  alcohol: string;
}

/** Carbonyl compound -> alcohol on complete reduction (adds H2, so M rises by 2). */
const REDUCIBLE: readonly Reducible[] = [
  { name: 'methanal', f: 'HCHO', m: 30, alcohol: 'methanol' },
  { name: 'ethanal', f: 'CH3CHO', m: 44, alcohol: 'ethanol' },
  { name: 'propanal', f: 'CH3CH2CHO', m: 58, alcohol: 'propan-1-ol' },
  { name: 'propanone', f: 'CH3COCH3', m: 58, alcohol: 'propan-2-ol' },
  { name: 'butanone', f: 'CH3COCH2CH3', m: 72, alcohol: 'butan-2-ol' },
];

interface IodoformCase {
  f: string;
  name: string;
}

/** Give a positive iodoform test: contain CH3CO- or CH3CH(OH)-. */
const IODOFORM_POSITIVE: readonly IodoformCase[] = [
  { f: 'CH3CHO', name: 'ethanal' },
  { f: 'CH3COCH3', name: 'propanone' },
  { f: 'CH3COCH2CH3', name: 'butanone' },
  { f: 'C6H5COCH3', name: 'acetophenone' },
  { f: 'CH3CH2OH', name: 'ethanol' },
  { f: 'CH3CH(OH)CH3', name: 'propan-2-ol' },
];

/** Give a negative iodoform test: no CH3CO- or CH3CH(OH)- unit. */
const IODOFORM_NEGATIVE: readonly IodoformCase[] = [
  { f: 'HCHO', name: 'methanal' },
  { f: 'CH3CH2CHO', name: 'propanal' },
  { f: 'CH3CH2COCH2CH3', name: 'pentan-3-one' },
  { f: 'C6H5CHO', name: 'benzaldehyde' },
  { f: 'CH3OH', name: 'methanol' },
  { f: 'CH3CH2CH2OH', name: 'propan-1-ol' },
  { f: 'C6H5COC6H5', name: 'benzophenone' },
];

interface RedoxCase {
  name: string;
  f: string;
  aldehyde: boolean;
  /** Product of reduction with NaBH4 / LiAlH4. */
  red: string;
  /** Carboxylic acid on oxidation (aldehydes only; for ketones a wrong option). */
  acid: string;
  /** Alkane / hydrocarbon (a wrong option: hydride reagents do not remove the oxygen). */
  hydrocarbon: string;
  /** Another wrong product. */
  other: string;
}

const REDOX: readonly RedoxCase[] = [
  { name: 'methanal', f: 'HCHO', aldehyde: true, red: 'methanol', acid: 'methanoic acid', hydrocarbon: 'methane', other: 'ethanol' },
  { name: 'ethanal', f: 'CH3CHO', aldehyde: true, red: 'ethanol', acid: 'ethanoic acid', hydrocarbon: 'ethane', other: 'methanol' },
  { name: 'propanal', f: 'CH3CH2CHO', aldehyde: true, red: 'propan-1-ol', acid: 'propanoic acid', hydrocarbon: 'propane', other: 'propan-2-ol' },
  { name: 'benzaldehyde', f: 'C6H5CHO', aldehyde: true, red: 'benzyl alcohol', acid: 'benzoic acid', hydrocarbon: 'toluene', other: 'phenol' },
  { name: 'propanone', f: 'CH3COCH3', aldehyde: false, red: 'propan-2-ol', acid: 'propanoic acid', hydrocarbon: 'propane', other: 'propan-1-ol' },
  { name: 'butanone', f: 'CH3COCH2CH3', aldehyde: false, red: 'butan-2-ol', acid: 'butanoic acid', hydrocarbon: 'butane', other: 'butan-1-ol' },
  { name: 'cyclohexanone', f: 'C6H10O', aldehyde: false, red: 'cyclohexanol', acid: 'hexanoic acid', hydrocarbon: 'cyclohexane', other: 'phenol' },
];

interface GrignardCase {
  carbonyl: string;
  carbonylName: string;
  rmgx: string;
  product: string;
  productF: string;
  cls: 'primary' | 'secondary' | 'tertiary';
  wrong: readonly [string, string, string];
}

const GRIGNARD: readonly GrignardCase[] = [
  {
    carbonyl: 'HCHO', carbonylName: 'methanal', rmgx: 'CH3MgBr', product: 'ethanol', productF: 'CH3CH2OH',
    cls: 'primary', wrong: ['methanol', 'propan-1-ol', 'propan-2-ol'],
  },
  {
    carbonyl: 'HCHO', carbonylName: 'methanal', rmgx: 'C2H5MgBr', product: 'propan-1-ol', productF: 'CH3CH2CH2OH',
    cls: 'primary', wrong: ['propan-2-ol', 'ethanol', 'butan-1-ol'],
  },
  {
    carbonyl: 'CH3CHO', carbonylName: 'ethanal', rmgx: 'CH3MgBr', product: 'propan-2-ol', productF: 'CH3CH(OH)CH3',
    cls: 'secondary', wrong: ['propan-1-ol', 'ethanol', '2-methylpropan-2-ol'],
  },
  {
    carbonyl: 'CH3CHO', carbonylName: 'ethanal', rmgx: 'C2H5MgBr', product: 'butan-2-ol', productF: 'CH3CH(OH)CH2CH3',
    cls: 'secondary', wrong: ['butan-1-ol', '2-methylpropan-2-ol', 'propan-2-ol'],
  },
  {
    carbonyl: 'CH3COCH3', carbonylName: 'propanone', rmgx: 'CH3MgBr', product: '2-methylpropan-2-ol', productF: '(CH3)3COH',
    cls: 'tertiary', wrong: ['propan-2-ol', 'butan-2-ol', 'butan-1-ol'],
  },
  {
    carbonyl: 'CH3COCH3', carbonylName: 'propanone', rmgx: 'C2H5MgBr', product: '2-methylbutan-2-ol', productF: '(CH3)2C(OH)CH2CH3',
    cls: 'tertiary', wrong: ['pentan-2-ol', '2-methylpropan-2-ol', 'butan-2-ol'],
  },
];

const ALCOHOL_CLASSES = ['a primary alcohol', 'a secondary alcohol', 'a tertiary alcohol', 'a carboxylic acid'];

/** [statement, reason] pairs for the statement pool. */
const TRUE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['The carbon atom of the carbonyl group is $sp^2$ hybridized.', 'The carbonyl carbon forms three σ bonds and one π bond, so it is $sp^2$ hybridized with bond angles near 120°.'],
  ['Aldehydes are generally more reactive than ketones towards nucleophilic addition.', 'Ketones have two electron-releasing alkyl groups that reduce the positive charge on the carbonyl carbon and also crowd the site of attack.'],
  ["Aldehydes reduce Tollens' reagent, whereas simple ketones do not.", "Aldehydes are easily oxidized to acids and reduce $\\ce{Ag+}$ to a silver mirror; ketones resist mild oxidation."],
  ['Aldehydes and ketones having an α-hydrogen undergo aldol condensation in dilute alkali.', 'Dilute base removes an α-hydrogen to form a carbanion that adds to a second carbonyl molecule.'],
  ['Methanal undergoes the Cannizzaro reaction with concentrated NaOH.', 'Methanal has no α-hydrogen, so in concentrated alkali it disproportionates into methanol and sodium methanoate.'],
  ['In the C=O bond the carbon atom carries a partial positive charge.', 'Oxygen is more electronegative than carbon, so the carbonyl carbon is electron-deficient and is attacked by nucleophiles.'],
  ['Reduction of a ketone gives a secondary alcohol.', 'Adding $\\ce{H2}$ across C=O of $\\ce{R2C=O}$ gives $\\ce{R2CHOH}$, a secondary alcohol.'],
];

const FALSE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['The carbon atom of the carbonyl group is $sp^3$ hybridized.', 'The carbonyl carbon has a π bond to oxygen, so it is $sp^2$, not $sp^3$, hybridized.'],
  ['Ketones are generally more reactive than aldehydes towards nucleophilic addition.', 'The reverse is true: aldehydes are more reactive because they have less steric hindrance and less electron release at the carbonyl carbon.'],
  ["Simple ketones give a red precipitate with Fehling's solution.", "Fehling's solution is reduced by aliphatic aldehydes, not by ketones."],
  ['Methanal undergoes aldol condensation in dilute NaOH.', 'Aldol condensation needs an α-hydrogen; methanal has none and undergoes the Cannizzaro reaction instead.'],
  ['Reduction of a ketone gives a primary alcohol.', 'Reducing $\\ce{R2C=O}$ gives $\\ce{R2CHOH}$, which is a secondary alcohol.'],
  ['Oxidation of a secondary alcohol gives an aldehyde.', 'A secondary alcohol is oxidized to a ketone; primary alcohols give aldehydes.'],
  ['In the C=O bond the oxygen atom carries a partial positive charge.', 'Oxygen is the more electronegative atom, so it carries the partial negative charge.'],
];

const STATEMENT_REASON = new Map<string, string>([...TRUE_STATEMENTS, ...FALSE_STATEMENTS]);

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'carbonyl-compounds', (b) => [
  // Tollens' test stoichiometry: RCHO + 2Ag+ -> 2Ag
  b.dynamic('silver-mirror-mass', { difficulty: 2, tags: ['identification tests'] }, (r) => {
    const ald = r.pick(TOLLENS_ALDEHYDES);
    const n = r.pick([0.05, 0.1, 0.15, 0.2, 0.25, 0.5]);
    const mass = Number((n * ald.m).toFixed(2));
    const ag = Number((2 * n * AG).toFixed(2));
    const { answer, distractors } = numericOptions(r, {
      correct: ag,
      wrong: [n * AG, 4 * n * AG, 2 * mass], // 1:1 ratio, methanal-style 1:4 ratio, mass ratio instead of mole ratio
      format: (x) => q$(x, U.g),
    });
    return {
      stem: tex`$${qty(mass, U.g)}$ of ${ald.name} ($${ce(ald.f)}$) is warmed with excess Tollens' reagent. The mass of silver deposited is (C = 12, H = 1, O = 16, Ag = 108):`,
      answer,
      distractors,
      explanation: tex`$\ce{RCHO + 2[Ag(NH3)2]+ + 3OH- -> RCOO- + 2Ag + 4NH3 + 2H2O}$, so 1 mol aldehyde gives 2 mol Ag. Moles of aldehyde $= \frac{${num(mass)}}{${ald.m}} = ${num(n)}\,\mathrm{mol}$; mass of Ag $= 2(${num(n)})(108) = ${num(ag)}\,\mathrm{g}$.`,
    };
  }),

  // Reduction stoichiometry: carbonyl + H2 -> alcohol
  b.dynamic('reduction-stoichiometry', { difficulty: 2, tags: ['oxidation and reduction'] }, (r) => {
    const c = r.pick(REDUCIBLE);
    const n = r.pick([0.1, 0.2, 0.25, 0.4, 0.5, 1.5, 2, 2.5]);
    const mass = Number((n * c.m).toFixed(2));
    if (r.chance(0.5)) {
      const prod = Number((n * (c.m + 2)).toFixed(2));
      const { answer, distractors } = numericOptions(r, {
        correct: prod,
        wrong: [mass, n * (c.m + 4), n * (c.m - 2)],
        format: (x) => q$(x, U.g),
      });
      return {
        stem: tex`$${qty(mass, U.g)}$ of ${c.name} ($${ce(c.f)}$) is completely reduced to ${c.alcohol}. The mass of ${c.alcohol} formed is (C = 12, H = 1, O = 16):`,
        answer,
        distractors,
        explanation: tex`Adding $\ce{H2}$ across C=O, 1 mol carbonyl compound gives 1 mol alcohol whose molar mass is $2\,\mathrm{g\,mol^{-1}}$ higher. Moles $= \frac{${num(mass)}}{${c.m}} = ${num(n)}$; mass of alcohol $= ${num(n)}(${c.m + 2}) = ${num(prod)}\,\mathrm{g}$.`,
      };
    }
    const vol = Number((n * 22.4).toFixed(3));
    const { answer, distractors } = numericOptions(r, {
      correct: vol,
      wrong: [n * 11.2, n * 44.8, (n * 22.4) / 1000],
      format: (x) => q$(x, U.dm3),
    });
    return {
      stem: tex`The volume of hydrogen at STP needed to reduce $${qty(mass, U.g)}$ of ${c.name} ($${ce(c.f)}$) completely to ${c.alcohol} (in the presence of Ni) is (C = 12, H = 1, O = 16):`,
      answer,
      distractors,
      explanation: tex`One C=O bond takes up one $\ce{H2}$. Moles of ${c.name} $= \frac{${num(mass)}}{${c.m}} = ${num(n)}$, so $V(\ce{H2}) = ${num(n)} \times 22.4 = ${num(vol)}\,\mathrm{dm^{3}}$.`,
    };
  }),

  // Iodoform (haloform) test
  b.dynamic('iodoform-test-compound', { difficulty: 2, origin: 'past-paper', tags: ['identification tests'] }, (r) => {
    const negative = r.chance(0.35);
    const [right, wrongPool] = negative ? [IODOFORM_NEGATIVE, IODOFORM_POSITIVE] : [IODOFORM_POSITIVE, IODOFORM_NEGATIVE];
    const ans = r.pick(right);
    const wrong = r.sample(wrongPool, 3);
    const opt = (c: IodoformCase): string => `$${ce(c.f)}$`;
    const reason = negative
      ? `${ans.name} has neither a $\\ce{CH3CO}$ group nor a $\\ce{CH3CH(OH)}$ group, so it gives no iodoform`
      : `${ans.name} contains a $\\ce{${ans.f.includes('OH') ? 'CH3CH(OH)' : 'CH3CO'}}$ unit and forms yellow $\\ce{CHI3}$`;
    return {
      stem: negative
        ? 'Which of the following does NOT give a yellow precipitate when warmed with iodine and sodium hydroxide?'
        : 'Which of the following gives a positive iodoform test?',
      answer: opt(ans),
      distractors: wrong.map(opt),
      explanation: `The iodoform test is given by compounds containing the $\\ce{CH3CO}$ group (ethanal and methyl ketones) or the $\\ce{CH3CH(OH)}$ group (alcohols oxidized to these). Here ${reason}. The other three ${negative ? 'all contain one of these units' : 'contain neither unit'}.`,
    };
  }),

  // Reduction / oxidation products
  b.dynamic('redox-product', { difficulty: 1, tags: ['oxidation and reduction'] }, (r) => {
    const c = r.pick(REDOX);
    const oxidize = c.aldehyde && r.chance(0.4);
    if (oxidize) {
      return {
        stem: tex`Oxidation of ${c.name} ($${ce(c.f)}$) with acidified $\ce{K2Cr2O7}$ gives:`,
        answer: c.acid,
        distractors: pickDistractors(c.acid, [c.red, c.hydrocarbon, c.other]),
        explanation: tex`Aldehydes are readily oxidized: $\ce{RCHO + [O] -> RCOOH}$. So ${c.name} gives ${c.acid}; the alcohol ${c.red} would be the reduction product.`,
      };
    }
    const reagent = r.pick(['NaBH4', 'LiAlH4']);
    const cls = c.aldehyde ? 'a primary alcohol' : 'a secondary alcohol';
    return {
      stem: tex`Reduction of ${c.name} ($${ce(c.f)}$) with $${ce(reagent)}$ followed by acidification gives:`,
      answer: c.red,
      distractors: pickDistractors(c.red, [c.acid, c.hydrocarbon, c.other]),
      explanation: tex`The hydride ion adds to the carbonyl carbon and acidification protonates the oxygen, so the net change is addition of two H atoms across C=O: ${c.aldehyde ? 'aldehydes give primary alcohols' : 'ketones give secondary alcohols'}. ${cap(c.name)} gives ${c.red}, ${cls}; the oxygen is not removed, so no hydrocarbon forms.`,
    };
  }),

  // Grignard reagent + carbonyl compound
  b.dynamic('grignard-alcohol', { difficulty: 2, origin: 'past-paper', tags: ['nucleophilic addition'] }, (r) => {
    const g = r.pick(GRIGNARD);
    const askClass = r.chance(0.5);
    const rule = tex`Methanal gives primary, other aldehydes give secondary and ketones give tertiary alcohols.`;
    const eqn = `$${ce(`${g.carbonyl} + ${g.rmgx}`)}$, then $${ce('H3O+')}$, gives $${ce(g.productF)}$ (${g.product}).`;
    if (askClass) {
      const answer = `a ${g.cls} alcohol`;
      return {
        stem: tex`${cap(g.carbonylName)} ($${ce(g.carbonyl)}$) reacts with $${ce(g.rmgx)}$ and the adduct is hydrolysed with dilute acid. The product is:`,
        answer,
        distractors: pickDistractors(answer, ALCOHOL_CLASSES),
        explanation: `${eqn} ${rule}`,
      };
    }
    return {
      stem: tex`${cap(g.carbonylName)} ($${ce(g.carbonyl)}$) is treated with $${ce(g.rmgx)}$ followed by acid hydrolysis. The alcohol formed is:`,
      answer: g.product,
      distractors: [...g.wrong],
      explanation: `${eqn} ${rule}`,
    };
  }),

  // Statement pool
  b.dynamic('carbonyl-statements', { difficulty: 2, tags: ['nucleophilic addition', 'oxidation and reduction'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about aldehydes and ketones is correct?',
      negativeStem: 'Which of the following statements about aldehydes and ketones is incorrect?',
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
      id: 'formalin',
      d: 1,
      o: 'past-paper',
      t: ['preparation'],
      q: 'A 40% aqueous solution of formaldehyde is commercially known as:',
      a: 'formalin',
      x: ['carbolic acid', 'glacial acetic acid', 'rectified spirit'],
      e: 'Formalin (about 40% methanal in water) is used to preserve biological specimens. Carbolic acid is phenol, glacial acetic acid is pure ethanoic acid and rectified spirit is about 95% ethanol.',
    },
    {
      id: 'tollens-reagent',
      d: 1,
      o: 'past-paper',
      t: ['identification tests'],
      q: "Tollens' reagent is:",
      a: 'ammoniacal silver nitrate solution',
      x: ['alkaline copper(II) sulphate with Rochelle salt', 'alkaline potassium permanganate solution', 'iodine in sodium hydroxide solution'],
      e: "Tollens' reagent contains $[\\ce{Ag(NH3)2}]^+$; aldehydes reduce it to a silver mirror. Copper(II) sulphate with Rochelle salt is Fehling's solution, alkaline $\\ce{KMnO4}$ is Baeyer's reagent, and $\\ce{I2}$/NaOH is the iodoform reagent.",
    },
    {
      id: 'fehling-red-precipitate',
      d: 1,
      o: 'past-paper',
      t: ['identification tests'],
      q: "The red precipitate formed when an aliphatic aldehyde is warmed with Fehling's solution is:",
      a: tex`$\ce{Cu2O}$`,
      x: [tex`$\ce{CuO}$`, tex`$\ce{Cu(OH)2}$`, tex`$\ce{Ag2O}$`],
      e: tex`The aldehyde reduces the blue complexed $\ce{Cu^2+}$ to copper(I), which precipitates as red $\ce{Cu2O}$: $\ce{RCHO + 2Cu^2+ + 5OH- -> RCOO- + Cu2O + 3H2O}$.`,
    },
    {
      id: 'ethyne-hydration',
      d: 1,
      o: 'past-paper',
      t: ['preparation'],
      q: tex`When ethyne is passed into dilute $\ce{H2SO4}$ containing $\ce{HgSO4}$ at about 75 °C, the product is:`,
      a: 'ethanal',
      x: ['ethanol', 'ethanoic acid', 'propanone'],
      e: tex`Water adds across the triple bond to give vinyl alcohol, which tautomerizes to ethanal: $\ce{HC#CH + H2O ->[HgSO4/H2SO4] CH3CHO}$.`,
    },
    {
      id: 'secondary-alcohol-oxidation',
      d: 1,
      t: ['preparation', 'oxidation and reduction'],
      q: tex`Oxidation of butan-2-ol with acidified $\ce{K2Cr2O7}$ gives:`,
      a: 'butanone',
      x: ['butanal', 'butanoic acid', 'but-2-ene'],
      e: tex`A secondary alcohol loses two hydrogens to form a ketone: $\ce{CH3CH(OH)CH2CH3 + [O] -> CH3COCH2CH3 + H2O}$. Butanal and butanoic acid come from butan-1-ol, and but-2-ene from dehydration, not oxidation.`,
    },
    {
      id: 'calcium-acetate-distillation',
      d: 1,
      t: ['preparation'],
      q: 'Dry distillation of calcium acetate gives:',
      a: 'acetone',
      x: ['acetaldehyde', 'formaldehyde', 'acetic acid'],
      e: tex`$\ce{(CH3COO)2Ca ->[\Delta] CH3COCH3 + CaCO3}$. Acetaldehyde forms only when calcium acetate is heated with calcium formate.`,
    },
    {
      id: 'aldol-no-alpha-hydrogen',
      d: 2,
      o: 'past-paper',
      t: ['nucleophilic addition'],
      q: 'Which of the following does NOT undergo aldol condensation?',
      a: 'methanal',
      x: ['ethanal', 'propanal', 'propanone'],
      e: 'Aldol condensation requires an α-hydrogen, which dilute alkali removes to form a carbanion. Methanal (HCHO) has no α-carbon, so it cannot undergo aldol condensation; the other three have α-hydrogens.',
    },
    {
      id: 'cannizzaro-products',
      d: 2,
      t: ['oxidation and reduction'],
      q: 'When methanal is heated with concentrated NaOH solution, the products are:',
      a: 'methanol and sodium methanoate',
      x: ['ethanol and sodium ethanoate', 'methanol and carbon dioxide', 'sodium methanoate and hydrogen'],
      e: tex`This is the Cannizzaro reaction: one molecule is oxidized and another reduced, $\ce{2HCHO + NaOH -> CH3OH + HCOONa}$.`,
    },
    {
      id: 'carbonyl-hybridization',
      d: 1,
      t: ['nucleophilic addition'],
      q: 'The hybridization of the carbonyl carbon and the approximate bond angle around it are:',
      a: tex`$sp^2$ and 120°`,
      x: [tex`$sp^3$ and 109.5°`, tex`$sp$ and 180°`, tex`$sp^2$ and 109.5°`],
      e: tex`The carbonyl carbon forms three σ bonds (trigonal planar) and one π bond with oxygen, so it is $sp^2$ hybridized with angles near 120°.`,
    },
    {
      id: 'most-reactive-carbonyl',
      d: 2,
      t: ['nucleophilic addition'],
      q: 'Which of the following is the most reactive towards nucleophilic addition?',
      a: tex`$\ce{HCHO}$`,
      x: [tex`$\ce{CH3CHO}$`, tex`$\ce{CH3COCH3}$`, tex`$\ce{C6H5COCH3}$`],
      e: 'Methanal has no electron-releasing alkyl groups and the least steric hindrance, so its carbonyl carbon is the most electrophilic and most accessible. Reactivity falls as alkyl or aryl groups are added.',
    },
    {
      id: 'dnph-test',
      d: 1,
      t: ['identification tests'],
      q: 'The reagent that gives an orange-yellow precipitate with both aldehydes and ketones is:',
      a: '2,4-dinitrophenylhydrazine',
      x: ["Tollens' reagent", "Fehling's solution", "Baeyer's reagent"],
      e: "2,4-DNPH condenses with any C=O group to form a coloured 2,4-dinitrophenylhydrazone, so it detects both aldehydes and ketones. Tollens' and Fehling's reagents respond only to aldehydes.",
    },
    {
      id: 'hcn-nucleophile',
      d: 2,
      t: ['nucleophilic addition'],
      q: 'In the base-catalysed addition of HCN to an aldehyde, the species that attacks the carbonyl carbon is:',
      a: tex`$\ce{CN-}$`,
      x: [tex`$\ce{H+}$`, tex`$\ce{OH-}$`, tex`$\ce{HCN}$`],
      e: tex`The base converts HCN into the cyanide ion; the nucleophile $\ce{CN-}$ attacks the electron-poor carbonyl carbon, and the alkoxide formed takes $\ce{H+}$ from HCN to give a cyanohydrin.`,
    },
    {
      id: 'iodoform-precipitate',
      d: 1,
      t: ['identification tests'],
      q: tex`The yellow precipitate formed when propanone is warmed with $\ce{I2}$ and NaOH is:`,
      a: tex`$\ce{CHI3}$`,
      x: [tex`$\ce{CH3I}$`, tex`$\ce{CH2I2}$`, tex`$\ce{NaI}$`],
      e: tex`$\ce{CH3COCH3 + 3I2 + 4NaOH -> CHI3 + CH3COONa + 3NaI + 3H2O}$. Iodoform ($\ce{CHI3}$) is the yellow solid; NaI stays in solution.`,
    },
  ]),
]);
