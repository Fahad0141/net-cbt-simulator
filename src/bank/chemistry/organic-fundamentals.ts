import { defineBank } from '@/engine/authoring';
import { numericOptions, pickDistractors, statementQuestion, tex } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Data (FSc Part II level)
// ---------------------------------------------------------------------------

type FgClass =
  | 'alcohol'
  | 'ether'
  | 'aldehyde'
  | 'ketone'
  | 'carboxylic acid'
  | 'ester'
  | 'amine'
  | 'amide'
  | 'nitrile'
  | 'alkyl halide'
  | 'acid chloride';

/** General formula of each class (math-mode LaTeX). */
const FG_GENERAL: Record<FgClass, string> = {
  alcohol: tex`\mathrm{R{-}OH}`,
  ether: tex`\mathrm{R{-}O{-}R'}`,
  aldehyde: tex`\mathrm{R{-}CHO}`,
  ketone: tex`\mathrm{R{-}CO{-}R'}`,
  'carboxylic acid': tex`\mathrm{R{-}COOH}`,
  ester: tex`\mathrm{R{-}COOR'}`,
  amine: tex`\mathrm{R{-}NH_2}`,
  amide: tex`\mathrm{R{-}CONH_2}`,
  nitrile: tex`\mathrm{R{-}CN}`,
  'alkyl halide': tex`\mathrm{R{-}X}`,
  'acid chloride': tex`\mathrm{R{-}COCl}`,
};

/** Classes most easily confused with each class, best distractors first. */
const FG_CONFUSERS: Record<FgClass, readonly FgClass[]> = {
  alcohol: ['ether', 'aldehyde', 'carboxylic acid'],
  ether: ['alcohol', 'ester', 'ketone'],
  aldehyde: ['ketone', 'carboxylic acid', 'alcohol'],
  ketone: ['aldehyde', 'ether', 'ester'],
  'carboxylic acid': ['ester', 'aldehyde', 'alcohol'],
  ester: ['carboxylic acid', 'ether', 'ketone'],
  amine: ['amide', 'nitrile', 'alkyl halide'],
  amide: ['amine', 'carboxylic acid', 'ester'],
  nitrile: ['amine', 'amide', 'alkyl halide'],
  'alkyl halide': ['acid chloride', 'amine', 'alcohol'],
  'acid chloride': ['alkyl halide', 'carboxylic acid', 'ester'],
};

interface FgCompound {
  /** mhchem condensed formula. */
  f: string;
  /** IUPAC name (shown only in the explanation). */
  name: string;
  cls: FgClass;
  /** The group as written in the explanation. */
  group: string;
}

const FG_COMPOUNDS: readonly FgCompound[] = [
  { f: 'CH3CH2OH', name: 'ethanol', cls: 'alcohol', group: tex`hydroxyl group $\mathrm{{-}OH}$ on a saturated carbon` },
  { f: 'CH3CH(OH)CH3', name: 'propan-2-ol', cls: 'alcohol', group: tex`hydroxyl group $\mathrm{{-}OH}$ on a saturated carbon` },
  { f: 'CH3OCH3', name: 'methoxymethane', cls: 'ether', group: tex`oxygen bridge $\mathrm{{-}O{-}}$ between two alkyl groups` },
  { f: 'C2H5OC2H5', name: 'ethoxyethane', cls: 'ether', group: tex`oxygen bridge $\mathrm{{-}O{-}}$ between two alkyl groups` },
  { f: 'CH3CHO', name: 'ethanal', cls: 'aldehyde', group: tex`$\mathrm{{-}CHO}$ group (carbonyl carbon carrying an H atom)` },
  { f: 'CH3CH2CHO', name: 'propanal', cls: 'aldehyde', group: tex`$\mathrm{{-}CHO}$ group (carbonyl carbon carrying an H atom)` },
  { f: 'CH3COCH3', name: 'propanone', cls: 'ketone', group: tex`carbonyl group $\mathrm{C{=}O}$ bonded to two carbon atoms` },
  { f: 'CH3COC2H5', name: 'butanone', cls: 'ketone', group: tex`carbonyl group $\mathrm{C{=}O}$ bonded to two carbon atoms` },
  { f: 'CH3COOH', name: 'ethanoic acid', cls: 'carboxylic acid', group: tex`carboxyl group $\mathrm{{-}COOH}$` },
  { f: 'CH3CH2COOH', name: 'propanoic acid', cls: 'carboxylic acid', group: tex`carboxyl group $\mathrm{{-}COOH}$` },
  { f: 'CH3COOC2H5', name: 'ethyl ethanoate', cls: 'ester', group: tex`ester group $\mathrm{{-}COOR}$ (the acidic H of $\mathrm{{-}COOH}$ replaced by an alkyl group)` },
  { f: 'CH3COOCH3', name: 'methyl ethanoate', cls: 'ester', group: tex`ester group $\mathrm{{-}COOR}$ (the acidic H of $\mathrm{{-}COOH}$ replaced by an alkyl group)` },
  { f: 'CH3CH2NH2', name: 'ethanamine', cls: 'amine', group: tex`amino group $\mathrm{{-}NH_2}$ on an alkyl carbon` },
  { f: 'CH3NH2', name: 'methanamine', cls: 'amine', group: tex`amino group $\mathrm{{-}NH_2}$ on an alkyl carbon` },
  { f: 'CH3CONH2', name: 'ethanamide', cls: 'amide', group: tex`amide group $\mathrm{{-}CONH_2}$ (carbonyl carbon bonded to N)` },
  { f: 'CH3CN', name: 'ethanenitrile', cls: 'nitrile', group: tex`cyano group $\mathrm{{-}C{\equiv}N}$` },
  { f: 'C2H5CN', name: 'propanenitrile', cls: 'nitrile', group: tex`cyano group $\mathrm{{-}C{\equiv}N}$` },
  { f: 'CH3CH2Cl', name: 'chloroethane', cls: 'alkyl halide', group: tex`halogen atom bonded to a saturated (alkyl) carbon` },
  { f: 'CH3CH2CH2Br', name: '1-bromopropane', cls: 'alkyl halide', group: tex`halogen atom bonded to a saturated (alkyl) carbon` },
  { f: 'CH3COCl', name: 'ethanoyl chloride', cls: 'acid chloride', group: tex`$\mathrm{{-}COCl}$ group (OH of the acid replaced by Cl)` },
];

const HYB = [tex`$sp$`, tex`$sp^{2}$`, tex`$sp^{3}$`] as const;
const HYB_PLAIN = ['sp', 'sp^{2}', 'sp^{3}'] as const;
const HYB_WRONG_EXTRA = [tex`$dsp^{2}$`, tex`$sp^{3}d$`] as const;

interface CarbonCase {
  /** Phrase identifying the carbon atom. */
  label: string;
  /** 0 = sp, 1 = sp2, 2 = sp3. */
  h: 0 | 1 | 2;
  /** Bonds formed by that carbon. */
  why: string;
}

const SIGMA4 = tex`forms four $\sigma$ bonds and no $\pi$ bond`;
const SIGMA3 = tex`forms three $\sigma$ bonds and one $\pi$ bond`;
const SIGMA2 = tex`forms two $\sigma$ bonds and two $\pi$ bonds`;

const CARBONS: readonly CarbonCase[] = [
  { label: tex`the $\ce{CH3}$ carbon in propene, $\ce{CH3-CH=CH2}$`, h: 2, why: SIGMA4 },
  { label: tex`the terminal $\ce{CH2}$ carbon in propene, $\ce{CH3-CH=CH2}$`, h: 1, why: SIGMA3 },
  { label: tex`the carbonyl carbon in ethanal, $\ce{CH3CHO}$`, h: 1, why: tex`${SIGMA3} (to O)` },
  { label: tex`the $\ce{CH3}$ carbon in ethanal, $\ce{CH3CHO}$`, h: 2, why: SIGMA4 },
  { label: tex`the carboxyl carbon in ethanoic acid, $\ce{CH3COOH}$`, h: 1, why: tex`${SIGMA3} (C=O)` },
  { label: tex`the carbon atom in methanol, $\ce{CH3OH}$`, h: 2, why: SIGMA4 },
  { label: tex`the carbon atom in chloroform, $\ce{CHCl3}$`, h: 2, why: SIGMA4 },
  { label: tex`the cyano carbon in ethanenitrile, $\ce{CH3-C#N}$`, h: 0, why: tex`${SIGMA2} (C≡N)` },
  { label: tex`the $\ce{CH3}$ carbon in ethanenitrile, $\ce{CH3-C#N}$`, h: 2, why: SIGMA4 },
  { label: tex`the central carbon in propa-1,2-diene (allene), $\ce{CH2=C=CH2}$`, h: 0, why: tex`${SIGMA2} (two C=C)` },
  { label: tex`a terminal carbon in propa-1,2-diene (allene), $\ce{CH2=C=CH2}$`, h: 1, why: SIGMA3 },
  { label: tex`the middle carbon in propyne, $\ce{CH3-C#CH}$`, h: 0, why: tex`${SIGMA2} (C≡C)` },
  { label: 'each carbon atom of benzene', h: 1, why: tex`forms three $\sigma$ bonds and its remaining p orbital joins the delocalised $\pi$ cloud` },
  { label: 'each carbon atom of cyclohexane', h: 2, why: SIGMA4 },
  { label: tex`the carbon atom in hydrogen cyanide, $\ce{H-C#N}$`, h: 0, why: tex`${SIGMA2} (C≡N)` },
  { label: tex`the carbon atom in urea, $\ce{(NH2)2CO}$`, h: 1, why: tex`${SIGMA3} (C=O)` },
];

interface BondCount {
  name: string;
  /** mhchem formula. */
  f: string;
  sigma: number;
  pi: number;
  /** Number of bonds to hydrogen (for the "forgot the C–H bonds" slip). */
  ch: number;
  why: string;
}

const ALKENE_NAMES = ['ethene', 'propene', 'but-1-ene', 'pent-1-ene', 'hex-1-ene', 'hept-1-ene'] as const;
const ALKYNE_NAMES = ['ethyne', 'propyne', 'but-1-yne', 'pent-1-yne', 'hex-1-yne', 'hept-1-yne'] as const;

const formulaCH = (c: number, h: number): string => `C${c === 1 ? '' : c}H${h}`;

/** "1 C–C σ bond (the one in C=C)" / "3 C–C σ bonds (one of them in C=C)". */
const ccSigma = (n: number, bond: string): string =>
  n === 2 ? tex`1 C–C $\sigma$ bond (the one in ${bond})` : tex`${n - 1} C–C $\sigma$ bonds (one of them in ${bond})`;

function homologueCase(r: { pick<T>(items: readonly T[]): T; int(a: number, b: number): number }): BondCount {
  const n = r.int(2, 7);
  if (r.int(0, 1) === 0) {
    const h = 2 * n;
    return {
      name: ALKENE_NAMES[n - 2] as string,
      f: formulaCH(n, h),
      sigma: 3 * n - 1,
      pi: 1,
      ch: h,
      why: tex`${ccSigma(n, 'C=C')} + ${h} C–H $\sigma$ bonds $= ${3 * n - 1}\sigma$; the C=C bond adds $1\pi$`,
    };
  }
  const h = 2 * n - 2;
  return {
    name: ALKYNE_NAMES[n - 2] as string,
    f: formulaCH(n, h),
    sigma: 3 * n - 3,
    pi: 2,
    ch: h,
    why: tex`${ccSigma(n, 'C≡C')} + ${h} C–H $\sigma$ bonds $= ${3 * n - 3}\sigma$; the C≡C bond adds $2\pi$`,
  };
}

const SPECIAL_BONDS: readonly BondCount[] = [
  { name: 'benzene', f: 'C6H6', sigma: 12, pi: 3, ch: 6, why: tex`6 C–C + 6 C–H $\sigma$ bonds $= 12\sigma$; three alternate double bonds give $3\pi$` },
  { name: 'buta-1,3-diene', f: 'CH2=CH-CH=CH2', sigma: 9, pi: 2, ch: 6, why: tex`3 C–C + 6 C–H $\sigma$ bonds $= 9\sigma$; two C=C bonds give $2\pi$` },
  { name: 'propanone', f: 'CH3COCH3', sigma: 9, pi: 1, ch: 6, why: tex`2 C–C + 6 C–H + 1 C–O $\sigma$ bonds $= 9\sigma$; the C=O bond gives $1\pi$` },
  { name: 'ethanoic acid', f: 'CH3COOH', sigma: 7, pi: 1, ch: 3, why: tex`1 C–C + 3 C–H + 2 C–O + 1 O–H $\sigma$ bonds $= 7\sigma$; the C=O bond gives $1\pi$` },
  { name: 'ethanenitrile', f: 'CH3C#N', sigma: 5, pi: 2, ch: 3, why: tex`1 C–C + 3 C–H + 1 C–N $\sigma$ bonds $= 5\sigma$; the C≡N bond gives $2\pi$` },
  { name: 'but-1-en-3-yne', f: 'CH2=CH-C#CH', sigma: 7, pi: 3, ch: 4, why: tex`3 C–C + 4 C–H $\sigma$ bonds $= 7\sigma$; C=C gives $1\pi$ and C≡C gives $2\pi$` },
  { name: 'propenal', f: 'CH2=CH-CHO', sigma: 7, pi: 2, ch: 4, why: tex`2 C–C + 4 C–H + 1 C–O $\sigma$ bonds $= 7\sigma$; C=C and C=O give $2\pi$` },
];

const bondOption = (s: number, p: number): string => tex`$${s}\sigma$ and $${p}\pi$`;

interface IsomerCount {
  stem: string;
  n: number;
  list: string;
}

const ISOMER_COUNTS: readonly IsomerCount[] = [
  { stem: tex`The number of structural isomers of the alkane $\ce{C4H10}$ is:`, n: 2, list: 'butane and 2-methylpropane' },
  { stem: tex`The number of structural isomers of the alkane $\ce{C5H12}$ is:`, n: 3, list: 'pentane, 2-methylbutane and 2,2-dimethylpropane' },
  { stem: tex`The number of structural isomers of the alkane $\ce{C6H14}$ is:`, n: 5, list: 'hexane, 2-methylpentane, 3-methylpentane, 2,2-dimethylbutane and 2,3-dimethylbutane' },
  { stem: tex`The number of structural isomers of the alkane $\ce{C7H16}$ is:`, n: 9, list: 'heptane, 2- and 3-methylhexane, 2,2-, 2,3-, 2,4- and 3,3-dimethylpentane, 3-ethylpentane and 2,2,3-trimethylbutane' },
  { stem: tex`The number of structural isomers having the molecular formula $\ce{C2H6O}$ is:`, n: 2, list: 'ethanol and methoxymethane' },
  { stem: tex`The number of structural isomers having the molecular formula $\ce{C3H8O}$ is:`, n: 3, list: 'propan-1-ol, propan-2-ol and methoxyethane' },
  { stem: tex`The number of structurally isomeric alcohols with the molecular formula $\ce{C4H10O}$ is:`, n: 4, list: 'butan-1-ol, butan-2-ol, 2-methylpropan-1-ol and 2-methylpropan-2-ol' },
  { stem: tex`The number of structurally isomeric ethers with the molecular formula $\ce{C4H10O}$ is:`, n: 3, list: 'ethoxyethane, 1-methoxypropane and 2-methoxypropane' },
  { stem: tex`The number of structural isomers of $\ce{C3H7Cl}$ is:`, n: 2, list: '1-chloropropane and 2-chloropropane' },
  { stem: tex`The number of structural isomers of $\ce{C4H9Cl}$ is:`, n: 4, list: '1-chlorobutane, 2-chlorobutane, 1-chloro-2-methylpropane and 2-chloro-2-methylpropane' },
  { stem: tex`The number of structural isomers of $\ce{C2H4Cl2}$ is:`, n: 2, list: '1,1-dichloroethane and 1,2-dichloroethane' },
  { stem: tex`The number of structural isomers of $\ce{C3H6Cl2}$ is:`, n: 4, list: '1,1-, 1,2-, 1,3- and 2,2-dichloropropane' },
  { stem: tex`Ignoring cis-trans isomers, the number of open-chain alkenes with the molecular formula $\ce{C4H8}$ is:`, n: 3, list: 'but-1-ene, but-2-ene and 2-methylpropene' },
];

type IsoType = 'chain' | 'position' | 'functional group' | 'metamerism' | 'tautomerism' | 'cis-trans';

const ISO_LABEL: Record<IsoType, string> = {
  chain: 'chain isomerism',
  position: 'position isomerism',
  'functional group': 'functional group isomerism',
  metamerism: 'metamerism',
  tautomerism: 'tautomerism',
  'cis-trans': 'cis-trans (geometric) isomerism',
};

interface IsoPair {
  pair: string;
  type: IsoType;
  /** Types that must not be offered as distractors (arguably also true). */
  avoid?: readonly IsoType[];
  why: string;
}

const ISO_PAIRS: readonly IsoPair[] = [
  { pair: 'Butane and 2-methylpropane', type: 'chain', why: 'They differ in the carbon skeleton: a straight chain of four carbons versus a branched chain.' },
  { pair: 'Pentane and 2,2-dimethylpropane', type: 'chain', why: 'They differ only in the arrangement of the carbon chain (straight versus branched).' },
  { pair: 'Propan-1-ol and propan-2-ol', type: 'position', why: 'Same carbon chain and same –OH group; only the position of the –OH group differs.' },
  { pair: '1-Chloropropane and 2-chloropropane', type: 'position', why: 'Same chain and same substituent; only the position of the Cl atom differs.' },
  { pair: 'But-1-ene and but-2-ene', type: 'position', why: 'Same chain; only the position of the C=C double bond differs.' },
  { pair: 'Ethanol and methoxymethane', type: 'functional group', why: 'Both are $\\ce{C2H6O}$, but one is an alcohol (–OH) and the other an ether (–O–).' },
  { pair: 'Propanal and propanone', type: 'functional group', why: 'Both are $\\ce{C3H6O}$, but one is an aldehyde (–CHO) and the other a ketone (C=O).' },
  { pair: 'Propanoic acid and methyl ethanoate', type: 'functional group', why: 'Both are $\\ce{C3H6O2}$, but one is a carboxylic acid and the other an ester.' },
  { pair: 'Ethoxyethane and 1-methoxypropane', type: 'metamerism', avoid: ['position', 'chain'], why: 'Both are ethers ($\\ce{C4H10O}$) that differ in how the carbon atoms are distributed on the two sides of the –O– group.' },
  { pair: 'Pentan-3-one and pentan-2-one', type: 'metamerism', avoid: ['position', 'chain'], why: 'Both are ketones ($\\ce{C5H10O}$) with unequal distribution of carbon atoms on the two sides of the C=O group (ethyl/ethyl versus methyl/propyl).' },
  { pair: 'cis-But-2-ene and trans-but-2-ene', type: 'cis-trans', why: 'The two methyl groups lie on the same or on opposite sides of the C=C bond, about which rotation is restricted.' },
  { pair: 'cis- and trans-1,2-dichloroethene', type: 'cis-trans', why: 'The two Cl atoms lie on the same or on opposite sides of the rigid C=C bond.' },
  { pair: 'Maleic acid and fumaric acid', type: 'cis-trans', why: 'They are the cis and trans forms of butenedioic acid; rotation about C=C is restricted.' },
  { pair: 'Propanone and prop-1-en-2-ol (keto and enol forms)', type: 'tautomerism', avoid: ['functional group', 'position'], why: 'The two forms differ in the position of an H atom and a double bond and exist in dynamic equilibrium (keto-enol tautomerism).' },
  { pair: 'Ethanal and ethenol (keto and enol forms)', type: 'tautomerism', avoid: ['functional group', 'position'], why: 'The keto and enol forms interconvert by migration of an H atom and exist in dynamic equilibrium.' },
];

type Claim = readonly [text: string, reason: string];

const ORG_TRUE: readonly Claim[] = [
  ['Carbon atoms can link with one another to form long chains and rings.', 'This property, catenation, is the main reason for the enormous number of organic compounds.'],
  [tex`Successive members of a homologous series differ by a $\ce{CH2}$ unit.`, tex`Each member has one more $\ce{CH2}$ group (14 mass units) than the previous one.`],
  ['Structural isomers have the same molecular formula but different structural formulas.', 'This is the definition of structural isomerism; the isomers differ in the order in which their atoms are bonded.'],
  ['In ethene, all six atoms lie in the same plane.', tex`Both carbons are $sp^{2}$ hybridized and the sideways overlap needed for the $\pi$ bond holds the molecule planar.`],
  ['Free rotation about a carbon–carbon double bond is not possible.', tex`Rotating one carbon would break the sideways p-orbital overlap of the $\pi$ bond.`],
  [tex`An $sp$-hybridized carbon atom has two unhybridized p orbitals.`, tex`Only one s and one p orbital are mixed, leaving two p orbitals free to form two $\pi$ bonds.`],
  [tex`A carbon–carbon $\pi$ bond is weaker than a carbon–carbon $\sigma$ bond.`, tex`Sideways overlap of p orbitals is less effective than head-on overlap, so the $\pi$ bond is weaker.`],
];

const ORG_FALSE: readonly Claim[] = [
  [tex`Successive members of a homologous series differ by a $\ce{CH3}$ unit.`, tex`They differ by a $\ce{CH2}$ unit, not $\ce{CH3}$.`],
  ['Members of a homologous series have identical physical properties.', 'Physical properties (boiling point, density) change gradually along the series; only chemical properties are similar.'],
  ['But-1-ene shows cis-trans isomerism.', tex`C1 of but-1-ene carries two H atoms, so cis and trans forms are not possible; but-2-ene shows this isomerism.`],
  [tex`In ethyne, the H–C–C bond angle is $120^{\circ}$.`, tex`Each carbon in ethyne is $sp$ hybridized, so the molecule is linear with $180^{\circ}$ angles.`],
  ['A carbon–carbon double bond consists of two sigma bonds.', tex`A double bond consists of one $\sigma$ bond and one $\pi$ bond.`],
  ['Structural isomers have the same structural formula but different molecular formulas.', 'It is the reverse: isomers share a molecular formula but differ in structural formula.'],
  [tex`An $sp^{3}$ hybrid orbital has 50% s-character.`, tex`$sp^{3}$ is made from one s and three p orbitals, so its s-character is 25%.`],
];

const reasonOf = (claims: readonly Claim[], text: string): string =>
  claims.find(([t]) => t === text)?.[1] ?? '';

// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'organic-fundamentals', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('functional-group-class', { difficulty: 1, origin: 'past-paper', tags: ['functional groups'] }, (r) => {
    const c = r.pick(FG_COMPOUNDS);
    const confusers = FG_CONFUSERS[c.cls];
    if (r.chance(0.6)) {
      return {
        stem: tex`The compound $\ce{${c.f}}$ belongs to the class of:`,
        answer: `${c.cls}s`,
        distractors: confusers.map((k) => `${k}s`),
        explanation: tex`$\ce{${c.f}}$ (${c.name}) contains the ${c.group}, so it belongs to the ${c.cls}s.`,
      };
    }
    return {
      stem: tex`The general formula $${FG_GENERAL[c.cls]}$ (${FG_GENERAL[c.cls].includes("R'") ? "R, R' = alkyl groups" : c.cls === 'alkyl halide' ? 'R = alkyl group, X = halogen atom' : 'R = alkyl group'}) represents:`,
      answer: `${c.cls}s`,
      distractors: confusers.map((k) => `${k}s`),
      explanation: tex`$${FG_GENERAL[c.cls]}$ is the general formula of ${c.cls}s; for example, ${c.name} ($\ce{${c.f}}$) contains the ${c.group}.`,
    };
  }),

  b.dynamic('carbon-hybridization', { difficulty: 2, origin: 'past-paper', tags: ['hybridization in carbon'] }, (r) => {
    const c = r.pick(CARBONS);
    const answer = HYB[c.h] as string;
    const others = HYB.filter((_, i) => i !== c.h);
    return {
      stem: tex`What is the hybridization of ${c.label}?`,
      answer,
      distractors: [...others, r.pick(HYB_WRONG_EXTRA)],
      explanation: tex`This carbon ${c.why}. A carbon with four $\sigma$ bonds is $sp^{3}$, with three $\sigma$ + one $\pi$ is $sp^{2}$, and with two $\sigma$ + two $\pi$ is $sp$. Hence it is $${HYB_PLAIN[c.h]}$.`,
    };
  }),

  b.dynamic('sigma-pi-count', { difficulty: 2, tags: ['hybridization in carbon'] }, (r) => {
    const m = r.chance(0.5) ? homologueCase(r) : r.pick(SPECIAL_BONDS);
    const answer = bondOption(m.sigma, m.pi);
    const candidates = [
      bondOption(m.sigma + m.pi, m.pi), // counted each pi bond as an extra sigma bond
      bondOption(m.sigma - m.pi, m.pi), // treated the multiple bond as pi only
      bondOption(m.sigma - m.ch, m.pi), // forgot the bonds to hydrogen
      bondOption(m.sigma, m.pi + 1),
      bondOption(m.sigma + 1, m.pi === 1 ? 2 : m.pi - 1),
    ];
    return {
      stem: tex`The numbers of sigma ($\sigma$) and pi ($\pi$) bonds in ${m.name} ($\ce{${m.f}}$) are:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`Every single bond is one $\sigma$ bond; a double bond is $1\sigma + 1\pi$ and a triple bond is $1\sigma + 2\pi$. In ${m.name}: ${m.why}.`,
    };
  }),

  b.dynamic('isomer-count', { difficulty: 2, origin: 'past-paper', tags: ['isomerism'] }, (r) => {
    const c = r.pick(ISOMER_COUNTS);
    const { answer, distractors } = numericOptions(r, {
      correct: c.n,
      wrong: r.shuffle([c.n + 1, c.n - 1, c.n + 2, c.n === 2 ? 4 : c.n - 2]),
      format: (v) => `$${v}$`,
      fallback: 'integer',
    });
    return {
      stem: c.stem,
      answer,
      distractors,
      explanation: `There are ${c.n} isomers: ${c.list}.`,
    };
  }),

  b.dynamic('isomerism-type', { difficulty: 2, tags: ['isomerism'] }, (r) => {
    const p = r.pick(ISO_PAIRS);
    const pool = (Object.keys(ISO_LABEL) as IsoType[]).filter(
      (t) => t !== p.type && !(p.avoid ?? []).includes(t),
    );
    return {
      stem: `${p.pair} are an example of:`,
      answer: ISO_LABEL[p.type],
      distractors: r.sample(pool, 3).map((t) => ISO_LABEL[t]),
      explanation: `${p.why} Hence they show ${ISO_LABEL[p.type]}.`,
    };
  }),

  b.dynamic('organic-statements', { difficulty: 2, tags: ['classification', 'isomerism', 'hybridization in carbon'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about organic compounds is correct?',
      negativeStem: 'Which statement about organic compounds is NOT correct?',
      truths: ORG_TRUE.map(([t]) => t),
      falsehoods: ORG_FALSE.map(([t]) => t),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false. ${reasonOf(ORG_FALSE, answer)}`
          : `This statement is true. ${reasonOf(ORG_TRUE, answer)}`,
    }),
  ),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'wohler-urea', d: 1, o: 'past-paper', t: ['classification'],
      q: 'In 1828 Friedrich Wöhler obtained urea, an organic compound, by heating the inorganic salt:',
      a: 'ammonium cyanate',
      x: ['ammonium nitrate', 'ammonium carbonate', 'calcium carbide'],
      e: tex`On heating, ammonium cyanate rearranges into urea: $\ce{NH4CNO -> (NH2)2CO}$. This laboratory synthesis weakened the vital force theory.`,
    },
    {
      id: 'vital-force-theory', d: 1, o: 'past-paper', t: ['classification'],
      q: 'The vital force theory, which held that organic compounds could be made only by living organisms, was proposed by:',
      a: 'Jöns Jacob Berzelius',
      x: ['Friedrich Wöhler', 'Hermann Kolbe', 'Marcellin Berthelot'],
      e: 'Berzelius proposed the vital force theory. Wöhler (urea, 1828), Kolbe (acetic acid) and Berthelot (methane and other compounds) helped disprove it by laboratory syntheses.',
    },
    {
      id: 'catenation', d: 1, t: ['classification'],
      q: 'The ability of carbon atoms to link with one another to form long chains and rings is called:',
      a: 'catenation',
      x: ['isomerism', 'polymerization', 'hybridization'],
      e: 'Self-linking of atoms of the same element into chains and rings is catenation; carbon shows it to the greatest extent because C–C bonds are strong.',
    },
    {
      id: 'heterocyclic-example', d: 1, t: ['classification'],
      q: 'Which of the following is a heterocyclic compound?',
      a: 'Pyridine',
      x: ['Benzene', 'Cyclohexane', 'Naphthalene'],
      e: 'A heterocyclic ring contains at least one atom other than carbon. Pyridine has a nitrogen atom in its six-membered ring; benzene, cyclohexane and naphthalene have rings made of carbon only.',
    },
    {
      id: 'alicyclic-example', d: 1, t: ['classification'],
      q: 'Which of the following is an alicyclic (non-aromatic carbocyclic) compound?',
      a: 'Cyclohexane',
      x: ['Benzene', 'Pyridine', 'Hexane'],
      e: 'Cyclohexane has a closed ring of carbon atoms only and is not aromatic. Benzene is aromatic, pyridine is heterocyclic and hexane is open-chain.',
    },
    {
      id: 'homologous-mass-difference', d: 1, o: 'past-paper', t: ['classification'],
      q: 'Two successive members of a homologous series differ in molar mass by:',
      a: tex`$14\,\mathrm{g\,mol^{-1}}$`,
      x: [tex`$12\,\mathrm{g\,mol^{-1}}$`, tex`$16\,\mathrm{g\,mol^{-1}}$`, tex`$28\,\mathrm{g\,mol^{-1}}$`],
      e: tex`Successive members differ by one $\ce{CH2}$ unit: $12 + 2(1) = 14\,\mathrm{g\,mol^{-1}}$.`,
    },
    {
      id: 'natural-gas-methane', d: 1, t: ['classification'],
      q: 'The main constituent of natural gas is:',
      a: 'methane',
      x: ['ethane', 'propane', 'butane'],
      e: 'Natural gas is mostly methane (roughly 85% or more), with smaller amounts of ethane, propane and butane.',
    },
    {
      id: 'carbon-compound-inorganic', d: 1, t: ['classification'],
      q: 'Which carbon compound is classified as inorganic?',
      a: 'Carbon monoxide',
      x: ['Urea', 'Methane', 'Ethanoic acid'],
      e: 'Oxides of carbon, carbonates and metal cyanides are traditionally treated as inorganic compounds. Urea, methane and ethanoic acid are organic.',
    },
    {
      id: 'geometric-isomer-alkene', d: 1, o: 'past-paper', t: ['isomerism'],
      q: 'Which alkene shows cis-trans (geometric) isomerism?',
      a: 'But-2-ene',
      x: ['But-1-ene', 'Propene', '2-Methylpropene'],
      e: tex`Cis-trans isomerism needs two different groups on each doubly bonded carbon. In but-2-ene ($\ce{CH3CH=CHCH3}$) each carbon carries H and $\ce{CH3}$. In the others one alkene carbon carries two identical groups ($\ce{=CH2}$ or $\ce{=C(CH3)2}$).`,
    },
    {
      id: 'restricted-rotation-reason', d: 2, t: ['isomerism', 'hybridization in carbon'],
      q: 'Alkenes can show cis-trans isomerism because:',
      a: tex`the $\pi$ bond prevents free rotation about the C=C bond`,
      x: [
        tex`the doubly bonded carbon atoms are $sp^{3}$ hybridized`,
        tex`the $\pi$ bond lies along the internuclear axis`,
        'the molecule contains an asymmetric carbon atom',
      ],
      e: tex`Rotation about C=C would destroy the sideways p-orbital overlap of the $\pi$ bond, so groups are fixed on the same (cis) or opposite (trans) sides. The carbons are $sp^{2}$ and the $\pi$ electron cloud lies above and below the axis.`,
    },
    {
      id: 'chiral-alcohol', d: 2, t: ['isomerism'],
      q: 'Which alcohol contains an asymmetric (chiral) carbon atom?',
      a: 'Butan-2-ol',
      x: ['Propan-2-ol', '2-Methylpropan-2-ol', 'Ethanol'],
      e: tex`In butan-2-ol, C2 carries four different groups: H, OH, $\ce{CH3}$ and $\ce{C2H5}$. In propan-2-ol and 2-methylpropan-2-ol the OH carbon has two or three identical $\ce{CH3}$ groups; ethanol has no such carbon.`,
    },
    {
      id: 'sp2-s-character', d: 1, o: 'past-paper', t: ['hybridization in carbon'],
      q: tex`The percentage s-character of an $sp^{2}$ hybrid orbital is about:`,
      a: '33.3%',
      x: ['25%', '50%', '66.7%'],
      e: tex`An $sp^{2}$ orbital is formed from one s and two p orbitals, so its s-character is $\frac{1}{3} \approx 33.3\%$ ($sp$: 50%, $sp^{3}$: 25%).`,
    },
    {
      id: 'propene-hybridization-sequence', d: 2, t: ['hybridization in carbon'],
      q: tex`The hybridization states of the carbon atoms in propene, $\ce{CH3-CH=CH2}$, taken from left to right, are:`,
      a: tex`$sp^{3}$, $sp^{2}$, $sp^{2}$`,
      x: [tex`$sp^{3}$, $sp^{3}$, $sp^{2}$`, tex`$sp^{2}$, $sp^{2}$, $sp^{2}$`, tex`$sp^{3}$, $sp$, $sp^{2}$`],
      e: tex`The $\ce{CH3}$ carbon forms four $\sigma$ bonds ($sp^{3}$); both carbons of C=C form three $\sigma$ bonds and one $\pi$ bond ($sp^{2}$).`,
    },
  ]),
]);
