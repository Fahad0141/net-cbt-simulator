import { defineBank } from '@/engine/authoring';
import { ce, num, numericOptions, statementQuestion, tex } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Exact integer with thin-space digit grouping (num() would round to 3 s.f.). */
function intTex(x: number): string {
  const s = String(Math.round(x));
  return s.length > 4 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : s;
}

const molarMass$ = (x: number): string => `$${intTex(x)}\\,\\mathrm{g\\,mol^{-1}}$`;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface AdditionPolymer {
  polymer: string;
  monomer: string;
  /** mhchem formula of the monomer. */
  f: string;
  /** Molar mass of the monomer (FSc-rounded). */
  m: number;
  work: string;
}

const ADDITION_POLYMERS: readonly AdditionPolymer[] = [
  { polymer: 'polyethene', monomer: 'ethene', f: 'CH2=CH2', m: 28, work: '2(12) + 4(1)' },
  { polymer: 'polypropene', monomer: 'propene', f: 'CH2=CH-CH3', m: 42, work: '3(12) + 6(1)' },
  { polymer: 'polyvinyl chloride (PVC)', monomer: 'vinyl chloride', f: 'CH2=CHCl', m: 62.5, work: '2(12) + 3(1) + 35.5' },
  { polymer: 'polystyrene', monomer: 'styrene', f: 'CH2=CH-C6H5', m: 104, work: '8(12) + 8(1)' },
  { polymer: 'Teflon', monomer: 'tetrafluoroethene', f: 'CF2=CF2', m: 100, work: '2(12) + 4(19)' },
  { polymer: 'polyacrylonitrile (Orlon)', monomer: 'acrylonitrile', f: 'CH2=CH-CN', m: 53, work: '3(12) + 3(1) + 14' },
  { polymer: 'natural rubber', monomer: 'isoprene', f: 'CH2=C(CH3)-CH=CH2', m: 68, work: '5(12) + 8(1)' },
  { polymer: 'neoprene', monomer: 'chloroprene', f: 'CH2=C(Cl)-CH=CH2', m: 88.5, work: '4(12) + 5(1) + 35.5' },
];

/** Vinyl-type polymers used in the degree-of-polymerization item (the diene rubbers are left out). */
const DP_POLYMERS = ADDITION_POLYMERS.filter((p) => p.polymer !== 'natural rubber' && p.polymer !== 'neoprene');

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const monomerOption = (p: AdditionPolymer): string => `${p.monomer}, $${ce(p.f)}$`;

type Base = 'A' | 'T' | 'G' | 'C';
const BASE_NAME: Record<Base, string> = { A: 'adenine', T: 'thymine', G: 'guanine', C: 'cytosine' };
const PARTNER: Record<Base, Base> = { A: 'T', T: 'A', G: 'C', C: 'G' };

const TRUE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['Starch is a polymer of α-glucose units.', 'Starch (amylose and amylopectin) is built from α-glucose; cellulose is built from β-glucose.'],
  [
    'Lactose gives glucose and galactose on hydrolysis.',
    'Lactose (milk sugar) is a disaccharide of glucose and galactose joined by a glycosidic link.',
  ],
  ['Glucose is an aldohexose whereas fructose is a ketohexose.', 'Both are six-carbon sugars; glucose carries an aldehyde group and fructose a ketone group.'],
  [
    'A nucleotide consists of a nitrogenous base, a pentose sugar and a phosphate group.',
    'Nucleotides are the monomers of nucleic acids; the sugar is ribose in RNA and deoxyribose in DNA.',
  ],
  [
    'Enzymes lower the activation energy of the reactions they catalyse.',
    'Like all catalysts, enzymes provide an alternative pathway of lower activation energy.',
  ],
  ['Fats are triesters of glycerol with long-chain fatty acids.', 'Fats and oils are triglycerides: each glycerol molecule is esterified by three fatty acid molecules.'],
  ['Vulcanization of rubber involves heating it with sulphur.', 'Sulphur forms cross-links between polyisoprene chains, making rubber harder, tougher and less sticky.'],
  [
    'The two strands of DNA are held together by hydrogen bonds between complementary bases.',
    'Adenine pairs with thymine (two H-bonds) and guanine with cytosine (three H-bonds).',
  ],
];

const FALSE_STATEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['Sucrose is a reducing sugar.', 'Sucrose is non-reducing because the glycosidic link joins the reducing carbons of both glucose and fructose.'],
  [
    'Enzymes shift the position of equilibrium of the reactions they catalyse.',
    'A catalyst speeds up the forward and reverse reactions equally; it does not change the equilibrium position.',
  ],
  ['Thymine is present in RNA but absent from DNA.', 'It is the other way round: DNA contains thymine, while RNA contains uracil instead.'],
  ['In DNA, adenine pairs with cytosine.', 'Adenine pairs with thymine; cytosine pairs with guanine.'],
  ['Proteins are polymers of monosaccharides.', 'Proteins are polymers of α-amino acids joined by peptide links; polysaccharides are polymers of monosaccharides.'],
  ['Nylon-6,6 is an addition polymer.', 'Nylon-6,6 is a condensation polymer: water is eliminated as the diamine and diacid join.'],
  ['Saturated fats are usually liquids at room temperature.', 'Saturated fats pack closely and are usually solids; unsaturated oils are liquids.'],
  ['Cellulose is digested by humans into glucose.', 'Humans lack the enzyme (cellulase) that hydrolyses the β-glycosidic links of cellulose.'],
];

const STATEMENT_REASON = new Map<string, string>([...TRUE_STATEMENTS, ...FALSE_STATEMENTS]);

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'macromolecules', (b) => [
  b.dynamic('degree-of-polymerization', { difficulty: 2, tags: ['polymers'] }, (r) => {
    const p = r.pick(DP_POLYMERS);
    const n = r.multiple(200, 6000, 100);
    const big = n * p.m;
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      // Shuffled so the answer is not always the second-smallest option.
      wrong: r.shuffle([2 * n, n / 2, 4 * n, n / 4]),
      format: (x) => `$${intTex(x)}$`,
    });
    return {
      stem: tex`A sample of ${p.polymer} has an average molar mass of $${intTex(big)}\,\mathrm{g\,mol^{-1}}$. The average number of monomer units per chain (degree of polymerization) is:`,
      answer,
      distractors,
      explanation: tex`The monomer is ${p.monomer}, $\ce{${p.f}}$, with $M = ${p.work} = ${num(p.m)}\,\mathrm{g\,mol^{-1}}$. Degree of polymerization $= \dfrac{${intTex(big)}}{${num(p.m)}} = ${intTex(n)}$.`,
    };
  }),

  b.dynamic('condensation-count', { difficulty: 2, tags: ['proteins', 'carbohydrates'] }, (r) => {
    const mode = r.pick(['bonds', 'water', 'glycine', 'glucose'] as const);
    if (mode === 'bonds' || mode === 'water') {
      const n = r.int(4, 30);
      const thing = mode === 'bonds' ? 'peptide bonds present in' : 'water molecules eliminated in forming';
      const { answer, distractors } = numericOptions(r, {
        correct: n - 1,
        wrong: [n, n + 1, n - 2, 2 * (n - 1)],
        format: (x) => `$${x}$`,
      });
      return {
        stem: `The number of ${thing} a linear polypeptide made of ${n} amino acid units is:`,
        answer,
        distractors,
        explanation: tex`Each peptide link joins two neighbouring amino acids and releases one $\ce{H2O}$. A chain of $${n}$ units has $${n} - 1 = ${n - 1}$ links, so $${n - 1}$ water molecules are eliminated.`,
      };
    }
    if (mode === 'glycine') {
      const n = r.int(3, 12);
      const m = 75 * n - 18 * (n - 1);
      const { answer, distractors } = numericOptions(r, {
        correct: m,
        wrong: [75 * n, 57 * n, m - 36, m + 18], // no water lost; n waters lost; n + 1 lost; n - 2 lost
        format: molarMass$,
      });
      return {
        stem: tex`Glycine ($\ce{H2NCH2COOH}$, $M = 75\,\mathrm{g\,mol^{-1}}$) forms a linear polypeptide of ${n} units. The molar mass of this polypeptide is:`,
        answer,
        distractors,
        explanation: tex`Joining $${n}$ units forms $${n - 1}$ peptide bonds and eliminates $${n - 1}$ molecules of water: $M = ${n}(75) - ${n - 1}(18) = ${75 * n} - ${18 * (n - 1)} = ${m}\,\mathrm{g\,mol^{-1}}$.`,
      };
    }
    const n = r.int(2, 8);
    const m = 180 * n - 18 * (n - 1);
    const { answer, distractors } = numericOptions(r, {
      correct: m,
      wrong: [180 * n, 162 * n, m - 36, m + 18], // no water lost; n waters lost; n + 1 lost; n - 2 lost
      format: molarMass$,
    });
    return {
      stem: tex`A linear chain is formed when ${n} glucose molecules ($\ce{C6H12O6}$, $M = 180\,\mathrm{g\,mol^{-1}}$) join through glycosidic links. The molar mass of the product is:`,
      answer,
      distractors,
      explanation: tex`Forming $${n - 1}$ glycosidic links eliminates $${n - 1}$ molecules of water: $M = ${n}(180) - ${n - 1}(18) = ${180 * n} - ${18 * (n - 1)} = ${m}\,\mathrm{g\,mol^{-1}}$.${n === 2 ? ' This is the molar mass of maltose, $\\ce{C12H22O11}$.' : ''}`,
    };
  }),

  b.dynamic('chargaff-base-percentage', { difficulty: 2, origin: 'past-paper', tags: ['nucleic acids'] }, (r) => {
    const given = r.pick(['A', 'T', 'G', 'C'] as const);
    const p = r.intExcept(12, 38, [25]);
    const target = r.pick((['A', 'T', 'G', 'C'] as const).filter((x) => x !== given));
    const paired = PARTNER[given] === target;
    const correct = paired ? p : 50 - p;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [paired ? 50 - p : p, 100 - p, 100 - 2 * p, 2 * p],
      format: (x) => tex`$${num(x)}\%$`,
    });
    const pairing = paired
      ? tex`${BASE_NAME[target]} pairs with ${BASE_NAME[given]}, so it is also $${p}\%$`
      : tex`${BASE_NAME[PARTNER[given]]} is also $${p}\%$, leaving $100 - 2(${p}) = ${100 - 2 * p}\%$ for the other pair, so ${BASE_NAME[target]} $= \dfrac{${100 - 2 * p}}{2} = ${50 - p}\%$`;
    return {
      stem: `In a sample of double-stranded DNA, ${p}% of the bases are ${BASE_NAME[given]}. The percentage of ${BASE_NAME[target]} is:`,
      answer,
      distractors,
      explanation: tex`Base pairing (Chargaff's rule) gives A = T and G = C, with all four totalling $100\%$. Here ${pairing}.`,
    };
  }),

  b.dynamic('monomer-polymer', { difficulty: 1, tags: ['polymers'] }, (r) => {
    const [p, ...others] = r.sample(ADDITION_POLYMERS, 4) as [AdditionPolymer, ...AdditionPolymer[]];
    if (r.chance(0.5)) {
      return {
        stem: `The monomer of ${p.polymer} is:`,
        answer: monomerOption(p),
        distractors: others.map(monomerOption),
        explanation: tex`${cap(p.polymer)} is an addition polymer of ${p.monomer}, $\ce{${p.f}}$: the monomer units join through their $\ce{C=C}$ bonds into a long chain with no by-product. Of the others, ${others.map((o) => `${o.monomer} gives ${o.polymer}`).join('; ')}.`,
      };
    }
    return {
      stem: tex`Which polymer is made up of ${p.monomer} ($${ce(p.f)}$) units?`,
      answer: cap(p.polymer),
      distractors: others.map((o) => cap(o.polymer)),
      explanation: tex`${cap(p.polymer)} is the addition polymer of ${p.monomer}. Of the others, ${others.map((o) => `${o.polymer} comes from ${o.monomer}`).join('; ')}.`,
    };
  }),

  b.dynamic('macromolecule-statements', { difficulty: 1, tags: ['carbohydrates', 'proteins', 'lipids', 'enzymes', 'nucleic acids', 'polymers'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about biomolecules and polymers is correct?',
      negativeStem: 'Which of the following statements about biomolecules and polymers is incorrect?',
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
      id: 'sucrose-hydrolysis',
      d: 1,
      o: 'past-paper',
      t: ['carbohydrates'],
      q: 'Hydrolysis of sucrose (cane sugar) gives:',
      a: 'glucose and fructose',
      x: ['glucose and galactose', 'glucose only', 'fructose and galactose'],
      e: tex`$\ce{C12H22O11 + H2O -> C6H12O6 (glucose) + C6H12O6 (fructose)}$, catalysed by acid or the enzyme invertase. Glucose and galactose come from lactose; maltose gives glucose only.`,
    },
    {
      id: 'cellulose-monomer',
      d: 2,
      t: ['carbohydrates'],
      q: 'Cellulose is a linear polymer of:',
      a: 'β-glucose',
      x: ['α-glucose', 'fructose', 'galactose'],
      e: 'Cellulose consists of β-glucose units joined by β-1,4-glycosidic links. Starch and glycogen are built from α-glucose, which is why humans digest starch but not cellulose.',
    },
    {
      id: 'peptide-linkage',
      d: 1,
      o: 'past-paper',
      t: ['proteins'],
      q: 'Amino acids in a protein are joined together by:',
      a: tex`amide (peptide) links, $\ce{-CO-NH\bond{-}}$`,
      x: [tex`glycosidic links, $\ce{-O-}$`, tex`ester links, $\ce{-CO-O\bond{-}}$`, tex`phosphodiester links, $\ce{-O-P-O\bond{-}}$`],
      e: tex`The $\ce{-COOH}$ of one amino acid condenses with the $\ce{-NH2}$ of the next, eliminating water and forming the amide (peptide) link $\ce{-CO-NH\bond{-}}$. Glycosidic links join sugars; phosphodiester links join nucleotides.`,
    },
    {
      id: 'tripeptide-sequences',
      d: 3,
      t: ['proteins'],
      q: 'Three different amino acids, each used exactly once, can be joined to form how many different linear tripeptides?',
      a: '6',
      x: ['3', '9', '27'],
      e: tex`A peptide chain has distinct ends (free $\ce{-NH2}$ and free $\ce{-COOH}$), so order matters: $3! = 3 \times 2 \times 1 = 6$ sequences. The value 27 would allow each amino acid to be repeated.`,
    },
    {
      id: 'protein-denaturation',
      d: 2,
      t: ['proteins'],
      q: 'Denaturation of a protein by heat or strong acid destroys its:',
      a: 'secondary and tertiary structure',
      x: ['primary structure only', 'peptide bonds', 'constituent amino acids'],
      e: 'Denaturation breaks the hydrogen bonds and other weak interactions that hold the folded shape, so the protein loses its biological activity. The peptide bonds and amino acid sequence (primary structure) remain intact.',
    },
    {
      id: 'urease-substrate',
      d: 1,
      t: ['enzymes'],
      q: 'The enzyme urease catalyses the hydrolysis of:',
      a: 'urea',
      x: ['starch', 'sucrose', 'proteins'],
      e: tex`$\ce{NH2CONH2 + H2O ->[urease] 2NH3 + CO2}$. Starch is hydrolysed by amylase, sucrose by invertase and proteins by proteases such as pepsin.`,
    },
    {
      id: 'enzyme-cofactor',
      d: 2,
      t: ['enzymes'],
      q: 'The non-protein part that some enzymes need in order to be active is called the:',
      a: 'cofactor',
      x: ['apoenzyme', 'substrate', 'active site'],
      e: 'An apoenzyme (the protein part) combines with a cofactor (a metal ion, or an organic coenzyme or prosthetic group) to form the active holoenzyme. The substrate is the molecule acted upon.',
    },
    {
      id: 'fat-saponification',
      d: 1,
      o: 'past-paper',
      t: ['lipids'],
      q: 'Heating a fat with aqueous sodium hydroxide gives:',
      a: 'soap and glycerol',
      x: ['soap and ethanol', 'fatty acids and glucose', 'glycerol and amino acids'],
      e: 'This is saponification: the triglyceride (a triester of glycerol) is hydrolysed by alkali into glycerol and the sodium salts of fatty acids, which are soap.',
    },
    {
      id: 'vegetable-ghee-catalyst',
      d: 1,
      o: 'past-paper',
      t: ['lipids'],
      q: 'Vegetable ghee is manufactured by hydrogenating vegetable oils in the presence of:',
      a: 'finely divided nickel',
      x: ['iron with a molybdenum promoter', 'vanadium pentoxide', 'anhydrous aluminium chloride'],
      e: tex`Unsaturated oils add hydrogen across their $\ce{C=C}$ bonds over a nickel catalyst at about 150–200 °C, giving semi-solid fat. Iron is the Haber process catalyst, $\ce{V2O5}$ the Contact process catalyst and $\ce{AlCl3}$ the Friedel-Crafts catalyst.`,
    },
    {
      id: 'iodine-number',
      d: 2,
      t: ['lipids'],
      q: 'The iodine number of a fat or oil is a measure of its:',
      a: 'degree of unsaturation',
      x: ['free fatty acid content', 'average molar mass', 'rate of hydrolysis'],
      e: tex`Iodine adds across $\ce{C=C}$ bonds, so the mass of iodine absorbed by 100 g of fat rises with the number of double bonds. Free acid content is given by the acid value, and the average molar mass is indicated by the saponification number (which falls as molar mass rises).`,
    },
    {
      id: 'rna-uracil',
      d: 1,
      o: 'past-paper',
      t: ['nucleic acids'],
      q: 'In RNA, the base thymine of DNA is replaced by:',
      a: 'uracil',
      x: ['cytosine', 'adenine', 'guanine'],
      e: 'RNA contains adenine, guanine, cytosine and uracil; uracil pairs with adenine in place of thymine. RNA also contains ribose instead of deoxyribose.',
    },
    {
      id: 'nylon-66-monomers',
      d: 1,
      o: 'past-paper',
      t: ['polymers'],
      q: 'Nylon-6,6 is prepared by condensation polymerization of hexamethylenediamine with:',
      a: 'adipic acid',
      x: ['terephthalic acid', 'ethylene glycol', 'caprolactam'],
      e: tex`$\ce{H2N(CH2)6NH2}$ and adipic acid $\ce{HOOC(CH2)4COOH}$ (six carbons each, hence 6,6) join with loss of water. Terephthalic acid with ethylene glycol gives the polyester terylene; caprolactam gives nylon-6.`,
    },
  ]),
]);
