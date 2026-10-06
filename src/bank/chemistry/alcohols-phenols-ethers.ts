import { defineBank } from '@/engine/authoring';
import { num, numericOptions, q$, qty, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type HydroxyClass = 'primary alcohol' | 'secondary alcohol' | 'tertiary alcohol' | 'phenol';

const CLASSES: readonly HydroxyClass[] = ['primary alcohol', 'secondary alcohol', 'tertiary alcohol', 'phenol'];

interface HydroxyCompound {
  /** mhchem condensed formula. */
  f: string;
  name: string;
  cls: HydroxyClass;
  why: string;
}

const HYDROXY_COMPOUNDS: readonly HydroxyCompound[] = [
  { f: 'CH3CH2OH', name: 'ethanol', cls: 'primary alcohol', why: 'the carbon bearing $\\ce{-OH}$ is attached to only one other carbon' },
  { f: 'CH3CH2CH2CH2OH', name: 'butan-1-ol', cls: 'primary alcohol', why: 'the carbon bearing $\\ce{-OH}$ is attached to only one other carbon' },
  { f: '(CH3)2CHCH2OH', name: '2-methylpropan-1-ol', cls: 'primary alcohol', why: 'the $\\ce{-OH}$ is on a $\\ce{-CH2-}$ carbon attached to only one other carbon; branching elsewhere does not matter' },
  { f: 'C6H5CH2OH', name: 'benzyl alcohol', cls: 'primary alcohol', why: 'the $\\ce{-OH}$ is on a side-chain $\\ce{-CH2-}$ carbon (attached to one carbon), not on the ring, so it is an alcohol and not a phenol' },
  { f: '(CH3)2CHOH', name: 'propan-2-ol', cls: 'secondary alcohol', why: 'the carbon bearing $\\ce{-OH}$ is attached to two other carbons' },
  { f: 'CH3CH2CH(OH)CH3', name: 'butan-2-ol', cls: 'secondary alcohol', why: 'the carbon bearing $\\ce{-OH}$ is attached to two other carbons' },
  { f: '(CH3CH2)2CHOH', name: 'pentan-3-ol', cls: 'secondary alcohol', why: 'the carbon bearing $\\ce{-OH}$ is attached to two other carbons' },
  { f: 'C6H11OH', name: 'cyclohexanol', cls: 'secondary alcohol', why: 'the ring carbon bearing $\\ce{-OH}$ is $sp^3$ and attached to two other carbons; the ring is not aromatic' },
  { f: '(CH3)3COH', name: '2-methylpropan-2-ol', cls: 'tertiary alcohol', why: 'the carbon bearing $\\ce{-OH}$ is attached to three other carbons' },
  { f: 'CH3CH2C(OH)(CH3)2', name: '2-methylbutan-2-ol', cls: 'tertiary alcohol', why: 'the carbon bearing $\\ce{-OH}$ is attached to three other carbons' },
  { f: 'C6H5OH', name: 'hydroxybenzene', cls: 'phenol', why: 'the $\\ce{-OH}$ is bonded directly to a carbon of the benzene ring' },
  { f: 'CH3C6H4OH', name: 'p-cresol', cls: 'phenol', why: 'the $\\ce{-OH}$ is bonded directly to a carbon of the benzene ring' },
];

interface HydroxyReactant {
  f: string;
  name: string;
  m: number;
  /** Number of -OH groups (moles of H2 per mole = oh / 2). */
  oh: number;
  eq: string;
}

const NA_REACTANTS: readonly HydroxyReactant[] = [
  { f: 'CH3OH', name: 'methanol', m: 32, oh: 1, eq: '2CH3OH + 2Na -> 2CH3ONa + H2' },
  { f: 'C2H5OH', name: 'ethanol', m: 46, oh: 1, eq: '2C2H5OH + 2Na -> 2C2H5ONa + H2' },
  { f: 'C3H7OH', name: 'propan-1-ol', m: 60, oh: 1, eq: '2C3H7OH + 2Na -> 2C3H7ONa + H2' },
  { f: 'C4H9OH', name: 'butan-1-ol', m: 74, oh: 1, eq: '2C4H9OH + 2Na -> 2C4H9ONa + H2' },
  { f: 'HOCH2CH2OH', name: 'ethane-1,2-diol', m: 62, oh: 2, eq: 'HOCH2CH2OH + 2Na -> NaOCH2CH2ONa + H2' },
];

const ALKANOLS: readonly { n: number; name: string; f: string }[] = [
  { n: 1, name: 'methanol', f: 'CH3OH' },
  { n: 2, name: 'ethanol', f: 'C2H5OH' },
  { n: 3, name: 'propan-1-ol', f: 'C3H7OH' },
  { n: 4, name: 'butan-1-ol', f: 'C4H9OH' },
  { n: 5, name: 'pentan-1-ol', f: 'C5H11OH' },
];

/** Acids in strictly decreasing order of acidity (FSc textbook order). */
const ACIDITY_ORDER: readonly { label: string; note: string }[] = [
  { label: '2,4,6-trinitrophenol (picric acid)', note: 'three $\\ce{-NO2}$ groups strongly stabilise the phenoxide ion' },
  { label: 'ethanoic acid', note: 'the carboxylate ion has two equivalent oxygen atoms sharing the charge' },
  { label: '4-nitrophenol', note: 'the $\\ce{-NO2}$ group withdraws electrons and stabilises the phenoxide ion' },
  { label: 'phenol', note: 'the phenoxide ion is resonance-stabilised by the ring' },
  { label: '4-methylphenol (p-cresol)', note: 'the electron-donating $\\ce{-CH3}$ group destabilises the phenoxide ion' },
  { label: 'water', note: 'the hydroxide ion has no resonance stabilisation' },
  { label: 'ethanol', note: 'the electron-donating ethyl group destabilises the ethoxide ion, making ethanol weaker than water' },
];

interface Statement {
  s: string;
  why: string;
  /** Statements sharing a topic are never shown together (avoids mirror-image pairs that give the answer away). */
  topic: string;
}

const TRUE_STATEMENTS: readonly Statement[] = [
  { topic: 'phenol-acidity', s: 'Phenol is a stronger acid than ethanol.', why: 'The phenoxide ion is stabilised by delocalising its negative charge into the benzene ring; the ethoxide ion has no such resonance.' },
  { topic: 'ether-bp', s: 'Ethers boil at lower temperatures than isomeric alcohols.', why: 'Ether molecules have no $\\ce{O-H}$ bond, so they cannot hydrogen-bond to one another, unlike alcohol molecules.' },
  { topic: 'tertiary-oxidation', s: tex`Tertiary alcohols resist oxidation by acidified $\ce{K2Cr2O7}$ under ordinary conditions.`, why: 'The carbon bearing $\\ce{-OH}$ in a tertiary alcohol carries no hydrogen atom to lose, so it is not easily oxidised.' },
  { topic: 'para-substituent', s: 'A nitro group at the para position increases the acidity of phenol.', why: 'The electron-withdrawing $\\ce{-NO2}$ group further stabilises the phenoxide ion.' },
  { topic: 'solubility', s: 'Lower alcohols such as methanol and ethanol are miscible with water.', why: 'Their $\\ce{-OH}$ groups form hydrogen bonds with water molecules.' },
  { topic: 'ring-activation', s: 'The $\\ce{-OH}$ group activates the benzene ring of phenol towards electrophilic substitution.', why: 'Lone pairs on oxygen are donated into the ring, increasing electron density at the ortho and para positions.' },
  { topic: 'sodium', s: 'Ethanol reacts with sodium metal to liberate hydrogen gas.', why: 'The $\\ce{O-H}$ hydrogen is replaced: $\\ce{2C2H5OH + 2Na -> 2C2H5ONa + H2}$.' },
];

const FALSE_STATEMENTS: readonly Statement[] = [
  { topic: 'alcohol-water-acidity', s: 'Ethanol is a stronger acid than water.', why: 'Alcohols are slightly weaker acids than water because the alkyl group donates electrons and destabilises the alkoxide ion.' },
  { topic: 'bicarbonate', s: 'Phenol liberates carbon dioxide from aqueous sodium hydrogencarbonate.', why: 'Phenol is a weaker acid than carbonic acid, so it cannot displace $\\ce{CO2}$ from $\\ce{NaHCO3}$.' },
  { topic: 'tertiary-oxidation', s: tex`Tertiary alcohols are readily oxidised to ketones by acidified $\ce{K2Cr2O7}$.`, why: 'Secondary alcohols give ketones; tertiary alcohols resist oxidation under these conditions.' },
  { topic: 'para-substituent', s: 'A methyl group at the para position makes 4-methylphenol more acidic than phenol.', why: 'The electron-donating methyl group destabilises the phenoxide ion, so p-cresol is less acidic than phenol.' },
  { topic: 'ether-bp', s: 'Ethers boil at higher temperatures than isomeric alcohols.', why: 'Ethers lack an $\\ce{O-H}$ bond and cannot hydrogen-bond among themselves, so they boil lower.' },
  { topic: 'ring-activation', s: 'The $\\ce{-OH}$ group of phenol deactivates the ring and directs substitution to the meta position.', why: 'The $\\ce{-OH}$ group is an activating ortho/para director.' },
  { topic: 'iodoform', s: 'Methanol gives a positive iodoform test.', why: tex`The iodoform test needs a $\ce{CH3CH(OH)-}$ or $\ce{CH3CO-}$ unit; methanol has neither (ethanol does).` },
];

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'alcohols-phenols-ethers', (b) => [
  // -------------------------------------------------------------------------
  // Dynamic templates
  // -------------------------------------------------------------------------
  b.dynamic('classify-hydroxy-compound', { difficulty: 1, tags: ['classification'] }, (r) => {
    const c = r.pick(HYDROXY_COMPOUNDS);
    return {
      stem: tex`The compound $\ce{${c.f}}$ (${c.name}) is classified as a:`,
      answer: c.cls,
      distractors: CLASSES.filter((k) => k !== c.cls),
      explanation: `It is a ${c.cls} because ${c.why}.`,
    };
  }),

  b.dynamic('sodium-hydrogen-volume', { difficulty: 2, origin: 'past-paper', tags: ['reactions'] }, (r) => {
    const s = r.pick(NA_REACTANTS);
    const moles = r.pick([0.1, 0.2, 0.25, 0.5, 1, 1.5, 2]);
    const mass = moles * s.m;
    const h2 = (moles * s.oh) / 2;
    const v = h2 * 22.4;
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      // mono-ol: forgot the 1 : 2 ratio of H2 to -OH; halved twice; doubled.
      // diol: forgot the ratio; counted only one -OH; counted one -OH and halved twice.
      wrong: s.oh === 2 ? [moles * 44.8, moles * 11.2, moles * 5.6] : [moles * 22.4, moles * 5.6, moles * 44.8],
      format: (x) => q$(x, U.dm3),
    });
    return {
      stem: tex`When $${qty(mass, U.g)}$ of ${s.name} ($\ce{${s.f}}$, $M = ${s.m}\,\mathrm{g\,mol^{-1}}$) reacts completely with excess sodium${s.oh === 2 ? ' (both hydroxyl groups react)' : ''}, the volume of hydrogen evolved at STP is:`,
      answer,
      distractors,
      explanation: tex`$\ce{${s.eq}}$. Moles of ${s.name} $= \dfrac{${num(mass)}}{${s.m}} = ${num(moles)}\,\mathrm{mol}$, giving $${num(h2)}\,\mathrm{mol}$ $\ce{H2}$. Volume $= ${num(h2)} \times 22.4 = ${num(v)}\,\mathrm{dm^{3}}$.`,
    };
  }),

  b.dynamic('fermentation-mass', { difficulty: 2, tags: ['preparation'] }, (r) => {
    const k = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 10]);
    const glucose = 180 * k;
    const askEthanol = r.chance(0.6);
    const correct = askEthanol ? 92 * k : 88 * k;
    const wrong = askEthanol ? [46 * k, 88 * k, 184 * k, 90 * k] : [44 * k, 92 * k, 176 * k, 90 * k];
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: (x) => q$(x, U.g) });
    const product = askEthanol ? 'ethanol' : 'carbon dioxide';
    const pf = askEthanol ? 'C2H5OH' : 'CO2';
    const pm = askEthanol ? 46 : 44;
    return {
      stem: tex`In the fermentation $\ce{C6H12O6 ->[zymase] 2C2H5OH + 2CO2}$, the mass of ${product} formed from $${qty(glucose, U.g)}$ of glucose is ($\ce{C} = 12$, $\ce{H} = 1$, $\ce{O} = 16$):`,
      answer,
      distractors,
      explanation: tex`Moles of glucose $= \dfrac{${num(glucose)}}{180} = ${num(k)}\,\mathrm{mol}$; each mole gives $2$ mol $\ce{${pf}}$, i.e. $${num(2 * k)}\,\mathrm{mol}$. Mass $= ${num(2 * k)} \times ${pm} = ${num(correct)}\,\mathrm{g}$.`,
    };
  }),

  b.dynamic('combustion-oxygen', { difficulty: 2, tags: ['reactions'] }, (r) => {
    const a = r.pick(ALKANOLS);
    const k = r.pick([1, 2, 3, 0.5]);
    const n = a.n;
    const o2 = 1.5 * n * k;
    const { answer, distractors } = numericOptions(r, {
      correct: o2,
      wrong: [((3 * n + 1) / 2) * k, 3 * n * k, 2 * n * k, (n + 1) * k, ((3 * n - 1) / 2) * k],
      format: (x) => q$(x, U.mol),
    });
    const eqO2 = n % 2 === 0 ? `${(3 * n) / 2}O2` : `${3 * n}/2O2`;
    const eq = `${a.f} + ${eqO2} -> ${n === 1 ? '' : n}CO2 + ${n + 1}H2O`;
    return {
      stem: tex`The number of moles of oxygen gas ($\ce{O2}$) needed for the complete combustion of $${num(k)}\,\mathrm{mol}$ of ${a.name} ($\ce{${a.f}}$) is:`,
      answer,
      distractors,
      explanation: tex`$\ce{${eq}}$. Oxygen atoms needed: $2(${n}) + ${n + 1} = ${3 * n + 1}$, of which one comes from the alcohol, so $\dfrac{${3 * n}}{2} = ${num(1.5 * n)}$ mol $\ce{O2}$ per mole. For $${num(k)}$ mol: $${num(1.5 * n)} \times ${num(k)} = ${num(o2)}\,\mathrm{mol}$.`,
    };
  }),

  b.dynamic('acidity-order', { difficulty: 2, origin: 'past-paper', tags: ['acidity of phenol'] }, (r) => {
    const idx = r.sample([0, 1, 2, 3, 4, 5, 6], 4).sort((x, y) => x - y);
    const strongest = r.chance(0.5);
    const pick = strongest ? idx[0] : idx[3];
    const chosen = ACIDITY_ORDER[pick as number];
    const others = idx.filter((i) => i !== pick).map((i) => ACIDITY_ORDER[i]?.label ?? '');
    const order = idx.map((i) => ACIDITY_ORDER[i]?.label ?? '').join(' > ');
    return {
      stem: `Which of the following is the ${strongest ? 'strongest' : 'weakest'} acid?`,
      answer: chosen?.label ?? '',
      distractors: others,
      explanation: `Acid strength: ${order}. For ${chosen?.label ?? ''}, ${chosen?.note ?? ''}.`,
    };
  }),

  b.dynamic('alcohol-phenol-statements', { difficulty: 2, tags: ['classification', 'reactions', 'acidity of phenol', 'tests'] }, (r) => {
    const inverted = r.chance(0.35);
    const chosen = r.pick(inverted ? FALSE_STATEMENTS : TRUE_STATEMENTS);
    const others = (inverted ? TRUE_STATEMENTS : FALSE_STATEMENTS).filter((x) => x.topic !== chosen.topic);
    return {
      stem: `Which of the following statements is ${inverted ? 'incorrect' : 'correct'}?`,
      answer: chosen.s,
      distractors: r.sample(others, 3).map((x) => x.s),
      explanation: `${inverted ? 'This statement is false.' : 'This statement is true.'} ${chosen.why}`,
    };
  }),

  // -------------------------------------------------------------------------
  // Fixed recall items
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'lucas-reagent',
      d: 1,
      o: 'past-paper',
      t: ['tests'],
      q: 'Lucas reagent, used to distinguish primary, secondary and tertiary alcohols, is:',
      a: tex`concentrated $\ce{HCl}$ with anhydrous $\ce{ZnCl2}$`,
      x: [tex`concentrated $\ce{H2SO4}$ with $\ce{K2Cr2O7}$`, tex`ammoniacal $\ce{AgNO3}$ solution`, tex`$\ce{I2}$ with aqueous $\ce{NaOH}$`],
      e: tex`Lucas reagent is concentrated $\ce{HCl}$ containing anhydrous $\ce{ZnCl2}$; it converts alcohols to insoluble alkyl chlorides, seen as turbidity. Ammoniacal $\ce{AgNO3}$ is Tollens reagent and $\ce{I2}/\ce{NaOH}$ is the iodoform test.`,
    },
    {
      id: 'lucas-tertiary-immediate',
      d: 1,
      t: ['tests'],
      q: 'With Lucas reagent at room temperature, turbidity appears immediately with:',
      a: '2-methylpropan-2-ol',
      x: ['propan-2-ol', 'butan-1-ol', 'methanol'],
      e: 'Tertiary alcohols react at once because they form a stable tertiary carbocation. Secondary alcohols (propan-2-ol) take about five minutes, and primary alcohols show no turbidity at room temperature.',
    },
    {
      id: 'iodoform-ethanol',
      d: 2,
      o: 'past-paper',
      t: ['tests'],
      q: tex`Which alcohol gives a yellow precipitate of iodoform when warmed with $\ce{I2}$ and aqueous $\ce{NaOH}$?`,
      a: 'ethanol',
      x: ['methanol', 'propan-1-ol', '2-methylpropan-2-ol'],
      e: tex`A positive iodoform test needs a $\ce{CH3CH(OH)-}$ unit (oxidised to $\ce{CH3CO-}$). Ethanol, $\ce{CH3CH2OH}$, has it; methanol, propan-1-ol and 2-methylpropan-2-ol do not.`,
    },
    {
      id: 'phenol-ferric-chloride',
      d: 1,
      o: 'past-paper',
      t: ['tests'],
      q: tex`Phenol gives which colour with neutral $\ce{FeCl3}$ solution?`,
      a: 'violet',
      x: ['blood red', 'brick red', 'yellow'],
      e: tex`Phenol forms a violet-coloured iron(III) phenoxide complex with neutral $\ce{FeCl3}$; this distinguishes phenols from alcohols.`,
    },
    {
      id: 'phenol-bromine-water',
      d: 1,
      t: ['reactions'],
      q: 'Phenol reacts with bromine water at room temperature to give a white precipitate of:',
      a: '2,4,6-tribromophenol',
      x: ['3-bromophenol', 'bromobenzene', '2,4,6-tribromobenzoic acid'],
      e: tex`The strongly activating $\ce{-OH}$ group allows bromination at all three ortho/para positions without a catalyst: $\ce{C6H5OH + 3Br2 -> C6H2Br3OH v + 3HBr}$.`,
    },
    {
      id: 'williamson-synthesis',
      d: 1,
      o: 'past-paper',
      t: ['preparation'],
      q: 'In the Williamson synthesis, an ether is prepared by reacting an alkyl halide with:',
      a: 'a sodium alkoxide',
      x: ['a Grignard reagent', 'concentrated sulphuric acid', 'an aldehyde'],
      e: tex`Williamson synthesis: $\ce{RONa + R'X -> ROR' + NaX}$, a nucleophilic substitution by the alkoxide ion.`,
    },
    {
      id: 'ethanol-dehydration-140',
      d: 2,
      t: ['reactions'],
      q: tex`Excess ethanol heated with concentrated $\ce{H2SO4}$ at about $140^{\circ}\mathrm{C}$ mainly gives:`,
      a: 'diethyl ether',
      x: ['ethene', 'ethanal', 'ethanoic acid'],
      e: tex`At about $140^{\circ}\mathrm{C}$ with excess alcohol, intermolecular dehydration gives $\ce{C2H5OC2H5}$. At about $170^{\circ}\mathrm{C}$ with excess acid, intramolecular dehydration gives ethene.`,
    },
    {
      id: 'carbolic-acid',
      d: 1,
      o: 'past-paper',
      t: ['classification'],
      q: 'Carbolic acid is the common name of:',
      a: 'phenol',
      x: ['ethanoic acid', 'benzoic acid', 'methanoic acid'],
      e: tex`Phenol, $\ce{C6H5OH}$, was called carbolic acid because it is weakly acidic and was obtained from coal tar.`,
    },
    {
      id: 'zymase-enzyme',
      d: 1,
      o: 'past-paper',
      t: ['preparation'],
      q: 'In the fermentation of molasses, the enzyme that converts glucose into ethanol is:',
      a: 'zymase',
      x: ['invertase', 'diastase', 'urease'],
      e: 'Invertase hydrolyses sucrose to glucose and fructose; zymase (from yeast) then converts these into ethanol and carbon dioxide. Diastase acts on starch and urease on urea.',
    },
    {
      id: 'methanol-industrial',
      d: 2,
      t: ['preparation'],
      q: tex`Methanol is manufactured industrially from $\ce{CO}$ and $\ce{H2}$ using the catalyst:`,
      a: tex`$\ce{ZnO + Cr2O3}$`,
      x: [tex`$\ce{V2O5}$`, tex`$\ce{Fe + Mo}$`, tex`$\ce{Pd/BaSO4}$`],
      e: tex`$\ce{CO + 2H2 ->[ZnO/Cr2O3] CH3OH}$ at about $400$-$450^{\circ}\mathrm{C}$ and $200\,\mathrm{atm}$. $\ce{V2O5}$ is the contact-process catalyst, $\ce{Fe}$/$\ce{Mo}$ is used in the Haber process and $\ce{Pd/BaSO4}$ is Rosenmund's catalyst.`,
    },
    {
      id: 'phenol-no-bicarbonate',
      d: 2,
      t: ['acidity of phenol'],
      q: tex`Phenol dissolves in aqueous $\ce{NaOH}$ but does not liberate $\ce{CO2}$ from aqueous $\ce{NaHCO3}$ because:`,
      a: 'phenol is a weaker acid than carbonic acid',
      x: ['phenol is a stronger acid than carbonic acid', 'phenol is a base, not an acid', 'phenol is insoluble in water'],
      e: tex`A weaker acid cannot displace a stronger one from its salt. Phenol ($pK_a \approx 10$) is weaker than carbonic acid ($pK_{a1} \approx 6.4$), yet strong enough to react with the strong base $\ce{NaOH}$.`,
    },
    {
      id: 'secondary-alcohol-oxidation',
      d: 1,
      t: ['reactions'],
      q: tex`Oxidation of propan-2-ol with acidified $\ce{K2Cr2O7}$ gives:`,
      a: 'propanone',
      x: ['propanal', 'propanoic acid', 'propene'],
      e: tex`Secondary alcohols are oxidised to ketones: $\ce{(CH3)2CHOH + [O] -> (CH3)2CO + H2O}$. Primary alcohols give aldehydes (then acids).`,
    },
    {
      id: 'grignard-ketone-tertiary',
      d: 2,
      t: ['preparation'],
      q: tex`Methylmagnesium bromide reacts with propanone and the product is hydrolysed with dilute acid. The alcohol formed is:`,
      a: '2-methylpropan-2-ol',
      x: ['propan-2-ol', 'butan-2-ol', '2-methylpropan-1-ol'],
      e: tex`$\ce{CH3MgBr}$ adds to the carbonyl carbon of $\ce{(CH3)2CO}$; hydrolysis gives $\ce{(CH3)3COH}$, a tertiary alcohol. A Grignard reagent gives a primary alcohol with methanal, a secondary with other aldehydes and a tertiary with ketones.`,
    },
    {
      id: 'ethanol-ether-boiling',
      d: 2,
      o: 'past-paper',
      t: ['classification'],
      q: tex`Ethanol ($\ce{C2H5OH}$) boils much higher than its isomer dimethyl ether ($\ce{CH3OCH3}$) because ethanol:`,
      a: 'forms intermolecular hydrogen bonds',
      x: ['has a higher molar mass', 'is a non-polar molecule', 'has stronger London forces only'],
      e: tex`Both have $M = 46\,\mathrm{g\,mol^{-1}}$, so molar mass is not the reason. Ethanol's $\ce{O-H}$ group hydrogen-bonds between molecules ($78^{\circ}\mathrm{C}$); the ether has no $\ce{O-H}$ and boils at about $-24^{\circ}\mathrm{C}$.`,
    },
    {
      id: 'phenol-zinc-dust',
      d: 1,
      t: ['reactions'],
      q: 'When phenol is distilled with zinc dust, the organic product is:',
      a: 'benzene',
      x: ['cyclohexanol', 'benzoic acid', 'toluene'],
      e: tex`Zinc dust removes the oxygen: $\ce{C6H5OH + Zn -> C6H6 + ZnO}$.`,
    },
  ]),
]);
