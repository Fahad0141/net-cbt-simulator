/**
 * Biology (FSc Part I): Biological Molecules and Enzymes.
 *
 * Sub-topics: carbohydrates, proteins, lipids, nucleic acids, enzymes, enzyme inhibition.
 *
 * Computational items: Chargaff base percentages, hydrogen bonds in a DNA segment,
 * peptide bonds / water released in polypeptides, and the formula or molar mass of a
 * linear glucose polymer. Conceptual items: statement pools (carbohydrates, lipids,
 * enzymes), a molecule-classification pool and textbook-recall MCQs.
 */
import { defineBank } from '@/engine/authoring';
import { numericOptions, pickDistractors, statementQuestion, tex } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local data
// ---------------------------------------------------------------------------

/** A statement with a short reason (truth) or correction (falsehood). */
type Note = readonly [statement: string, note: string];

function notePool(truths: readonly Note[], falsehoods: readonly Note[]) {
  const lookup = new Map<string, string>([...truths, ...falsehoods]);
  return {
    truths: truths.map(([s]) => s),
    falsehoods: falsehoods.map(([s]) => s),
    explain: (answer: string, inverted: boolean): string => {
      const note = lookup.get(answer) ?? '';
      return inverted
        ? `This statement is false: ${note} The other three statements are correct.`
        : `This statement is true: ${note} Each of the other options contains a factual error.`;
    },
  };
}

const CARB_TRUTHS: readonly Note[] = [
  [tex`Glucose and fructose share the formula $\mathrm{C_6H_{12}O_6}$ but differ in structure.`, 'they are structural isomers; glucose is an aldose and fructose a ketose.'],
  ['Maltose is formed by joining two α-glucose units.', 'an α-1,4 glycosidic bond links the two glucose residues of maltose.'],
  ['Starch is a mixture of amylose and amylopectin.', 'amylose is an unbranched chain and amylopectin a branched one.'],
  ['Glycogen is more highly branched than amylopectin.', 'glycogen has α-1,6 branch points far more frequently than amylopectin.'],
  ['Ribose and deoxyribose are pentose sugars.', 'both are five-carbon monosaccharides found in nucleotides.'],
  ['Glucose is an aldose, whereas fructose is a ketose.', 'glucose carries an aldehyde group and fructose a ketone group.'],
];
const CARB_FALSEHOODS: readonly Note[] = [
  ['Sucrose is a reducing sugar.', 'sucrose is non-reducing because the glycosidic bond involves the reducing carbons of both glucose and fructose.'],
  ['Lactose is made of glucose and fructose.', 'lactose is made of glucose and galactose; glucose and fructose form sucrose.'],
  ['Glycogen is the main storage polysaccharide of plants.', 'plants store starch; glycogen is the storage polysaccharide of animals and fungi.'],
  ['Fructose is a pentose sugar.', 'fructose is a hexose (six carbons).'],
  ['Starch is a polymer of β-glucose.', 'starch is a polymer of α-glucose; cellulose is the β-glucose polymer.'],
  ['Polysaccharides are sweet and readily soluble in water.', 'polysaccharides are generally tasteless and insoluble or only sparingly soluble.'],
  ['Human digestive enzymes readily hydrolyse cellulose.', 'humans lack cellulase, so cellulose passes through the gut as fibre.'],
];

const LIPID_TRUTHS: readonly Note[] = [
  [tex`Unsaturated fatty acids contain one or more $\mathrm{C{=}C}$ double bonds.`, 'the double bonds in the hydrocarbon chain make them unsaturated, whereas saturated fatty acids have only C–C single bonds.'],
  ['Fats rich in unsaturated fatty acids are usually liquid at room temperature.', 'kinks at the double bonds stop the chains packing closely, so such fats are oils.'],
  ['A triglyceride is an ester of glycerol and three fatty acids.', 'each of the three –OH groups of glycerol forms an ester bond with a fatty acid.'],
  ['Lipids are insoluble in water but soluble in organic solvents such as ether.', 'their long hydrocarbon chains are non-polar.'],
  ['One gram of fat releases more energy than one gram of carbohydrate.', 'fats yield roughly twice as much energy per gram as carbohydrates.'],
  ['Cholesterol is classified as a steroid.', 'it has the four fused carbon rings typical of steroids.'],
];
const LIPID_FALSEHOODS: readonly Note[] = [
  [tex`Saturated fatty acids contain $\mathrm{C{=}C}$ double bonds.`, 'saturated fatty acids contain only C–C single bonds.'],
  ['Triglycerides are polymers of repeating glycerol units.', 'a triglyceride is a single glycerol esterified with three fatty acids, not a polymer.'],
  ['Waxes are esters of glycerol and three fatty acids.', 'a wax is an ester of a long-chain fatty acid with a long-chain alcohol, not glycerol; glycerol plus three fatty acids is a triglyceride.'],
  ['Phospholipids have a hydrophobic head and hydrophilic tails.', 'the phosphate head is hydrophilic and the fatty-acid tails are hydrophobic.'],
  ['Cholesterol is made of glycerol and three fatty acids.', 'that describes a triglyceride; cholesterol is a ring-based steroid.'],
  ['Lecithin is a steroid.', 'lecithin is a phospholipid (glycerol, two fatty acids and a phosphate-containing group); steroids such as cholesterol are built from four fused rings.'],
];

const ENZYME_TRUTHS: readonly Note[] = [
  ['Enzymes are not used up in the reactions they catalyse.', 'an enzyme is released unchanged and can act again.'],
  ['Most enzymes are globular proteins.', 'their folded tertiary structure forms the active site.'],
  ['An enzyme protein without its cofactor is called an apoenzyme.', 'apoenzyme plus cofactor makes the active holoenzyme.'],
  ['Above the optimum temperature, the reaction rate falls because the enzyme is denatured.', 'heat disrupts the bonds that hold the active site in shape.'],
  ['Enzymes speed up reactions by lowering the activation energy.', 'they provide an alternative pathway with a lower energy barrier.'],
  ['When all active sites are occupied, adding more substrate does not raise the rate.', 'the enzyme is saturated and the rate has reached its maximum.'],
];
const ENZYME_FALSEHOODS: readonly Note[] = [
  ['Enzymes shift the equilibrium of a reaction towards the products.', 'enzymes only speed up the attainment of equilibrium; they do not change its position.'],
  ['Enzymes act equally well on any substrate.', 'enzymes are specific; the shape of the active site fits only a particular substrate or a group of closely related substrates.'],
  ['An apoenzyme together with its cofactor is called a coenzyme.', 'the complete active enzyme is a holoenzyme; a coenzyme is one kind of cofactor.'],
  ['Low temperatures permanently denature enzymes.', 'low temperature only inactivates enzymes reversibly; activity returns on warming.'],
  ['All enzymes work best at pH 7.', 'optimum pH varies, for example about 2 for pepsin and about 7.8 for trypsin.'],
  ['The active site makes up most of the enzyme molecule.', 'the active site is a small region of the enzyme formed by only a few amino acids.'],
];

type MolClass = 'carbohydrate' | 'protein' | 'lipid' | 'nucleic acid';
const CLASSES: readonly MolClass[] = ['carbohydrate', 'protein', 'lipid', 'nucleic acid'];
const CLASS_LABEL: Record<MolClass, string> = {
  carbohydrate: 'Carbohydrate',
  protein: 'Protein',
  lipid: 'Lipid',
  'nucleic acid': 'Nucleic acid',
};

/** [name, class, reason] */
const MOLECULES: ReadonlyArray<readonly [string, MolClass, string]> = [
  ['Cellulose', 'carbohydrate', 'a polysaccharide of β-glucose forming plant cell walls'],
  ['Glycogen', 'carbohydrate', 'a branched polysaccharide of α-glucose stored in liver and muscle'],
  ['Chitin', 'carbohydrate', 'a polysaccharide of N-acetylglucosamine in fungal walls and arthropod exoskeletons'],
  ['Maltose', 'carbohydrate', 'a disaccharide of two glucose units'],
  ['Lactose', 'carbohydrate', 'a disaccharide of glucose and galactose (milk sugar)'],
  ['Keratin', 'protein', 'a fibrous protein of hair, nails and horns'],
  ['Collagen', 'protein', 'a fibrous protein of tendons, skin and bone'],
  ['Insulin', 'protein', 'a small protein hormone of two polypeptide chains'],
  ['Haemoglobin', 'protein', 'a conjugated globular protein of four polypeptide chains'],
  ['Pepsin', 'protein', 'a protein-digesting enzyme of the stomach'],
  ['Cholesterol', 'lipid', 'a steroid with four fused carbon rings'],
  ['Lecithin', 'lipid', 'a phospholipid found in cell membranes'],
  ['Testosterone', 'lipid', 'a steroid hormone derived from cholesterol'],
  ['Beeswax', 'lipid', 'a wax, an ester of a long-chain fatty acid and a long-chain alcohol'],
  ['Transfer RNA (tRNA)', 'nucleic acid', 'a polynucleotide that carries amino acids to the ribosome'],
  ['Messenger RNA (mRNA)', 'nucleic acid', 'a polynucleotide copied from DNA that carries the genetic code'],
  ['Ribosomal RNA (rRNA)', 'nucleic acid', 'a polynucleotide that forms part of the ribosome'],
];

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('biology', 'biological-molecules', (b) => [
  // ---------------- dynamic ----------------
  b.dynamic('chargaff-base-percentage', { difficulty: 1, origin: 'past-paper', tags: ['nucleic acids'] }, (r) => {
    const a = r.intExcept(12, 38, [25]);
    const target = r.pick(['thymine', 'guanine', 'cytosine', 'G+C'] as const);
    const t = a;
    const g = 50 - a;
    let correct: number;
    let wrong: number[];
    let ask: string;
    let working: string;
    if (target === 'thymine') {
      correct = t;
      wrong = [g, 100 - a, 100 - 2 * a];
      ask = 'thymine';
      working = tex`$\%T = \%A = ${a}\%$`;
    } else if (target === 'G+C') {
      correct = 100 - 2 * a;
      wrong = [g, 100 - a, 2 * a];
      ask = 'guanine plus cytosine together';
      working = tex`$\%(G + C) = 100 - (\%A + \%T) = 100 - 2(${a}) = ${correct}\%$`;
    } else {
      correct = g;
      wrong = [a, 100 - a, 100 - 2 * a];
      ask = target;
      working = tex`$\%G = \%C = \dfrac{100 - 2(${a})}{2} = ${g}\%$`;
    }
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong,
      format: (v) => tex`$${v}\%$`,
      fallback: 'offset',
    });
    return {
      stem: `A sample of double-stranded DNA contains ${a}% adenine. The percentage of ${ask} in the sample is:`,
      answer,
      distractors,
      explanation: tex`By Chargaff's rule A pairs with T and G pairs with C, so $\%A = \%T$ and $\%G = \%C$. ${working}.`,
    };
  }),

  b.dynamic('dna-hydrogen-bonds', { difficulty: 2, tags: ['nucleic acids'] }, (r) => {
    const n = r.int(20, 150);
    let gc = r.int(5, n - 5);
    if (2 * gc === n) gc += 1;
    const at = n - gc;
    const correct = 2 * at + 3 * gc;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [3 * at + 2 * gc, 2 * n, 3 * n],
      format: (v) => `${v}`,
    });
    return {
      stem: `A DNA segment has ${n} base pairs, of which ${gc} are G–C pairs. The total number of hydrogen bonds between its two strands is:`,
      answer,
      distractors,
      explanation: tex`A–T pairs form 2 hydrogen bonds and G–C pairs form 3. A–T pairs $= ${n} - ${gc} = ${at}$, so total $= 2(${at}) + 3(${gc}) = ${correct}$.`,
    };
  }),

  b.dynamic('peptide-bond-count', { difficulty: 2, origin: 'past-paper', tags: ['proteins'] }, (r) => {
    const chains = r.weighted([1, 2, 3, 4], [4, 3, 2, 1]);
    const n = r.int(40, 600);
    const correct = n - chains;
    const what = r.pick(['peptide bonds', 'water molecules released during its synthesis'] as const);
    const wrong = chains === 1 ? [n, n + 1, n - 2] : [n - 1, n, n + chains];
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: (v) => `${v}` });
    const chainText = chains === 1 ? 'a single polypeptide chain' : `${chains} separate polypeptide chains`;
    return {
      stem: `A protein contains ${n} amino acids arranged in ${chainText}. The number of ${what} is:`,
      answer,
      distractors,
      explanation: tex`A chain of $k$ amino acids has $k - 1$ peptide bonds, and each bond releases one water molecule. For ${chains} chain${chains === 1 ? '' : 's'} with ${n} amino acids in total: $${n} - ${chains} = ${correct}$.`,
    };
  }),

  b.dynamic('glucose-polymer-formula', { difficulty: 3, tags: ['carbohydrates'] }, (r) => {
    const n = r.int(3, 14);
    const waters = n - 1;
    if (r.chance(0.5)) {
      const fmt = (c: number, h: number, o: number): string => tex`$\mathrm{C_{${c}}H_{${h}}O_{${o}}}$`;
      const answer = fmt(6 * n, 10 * n + 2, 5 * n + 1);
      const distractors = pickDistractors(answer, [
        fmt(6 * n, 12 * n, 6 * n),
        fmt(6 * n, 10 * n, 5 * n),
        fmt(6 * n, 12 * n - 2, 6 * n - 1),
      ]);
      return {
        stem: tex`${n} glucose molecules ($\mathrm{C_6H_{12}O_6}$) are joined by condensation into an unbranched chain. The molecular formula of the product is:`,
        answer,
        distractors,
        explanation: tex`Joining $${n}$ units forms $${n} - 1 = ${waters}$ glycosidic bonds, each removing one $\mathrm{H_2O}$. Formula $= ${n}(\mathrm{C_6H_{12}O_6}) - ${waters}(\mathrm{H_2O})$ = C $${6 * n}$, H $${12 * n} - ${2 * waters} = ${10 * n + 2}$, O $${6 * n} - ${waters} = ${5 * n + 1}$.`,
      };
    }
    const correct = 180 * n - 18 * waters;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [180 * n, 162 * n, 180 * n - 18],
      format: (v) => tex`$${v}\,\mathrm{g\,mol^{-1}}$`,
    });
    return {
      stem: `${n} glucose molecules (molar mass 180 g/mol; water 18 g/mol) are joined by condensation into an unbranched chain. The molar mass of the product is:`,
      answer,
      distractors,
      explanation: tex`$${n}$ units form $${waters}$ glycosidic bonds, releasing $${waters}$ water molecules (18 g/mol each). $M = ${n}(180) - ${waters}(18) = ${180 * n} - ${18 * waters} = ${correct}\,\mathrm{g\,mol^{-1}}$.`,
    };
  }),

  b.dynamic('carbohydrate-statements', { difficulty: 1, tags: ['carbohydrates'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about carbohydrates is correct?',
      negativeStem: 'Which statement about carbohydrates is NOT correct?',
      ...notePool(CARB_TRUTHS, CARB_FALSEHOODS),
    }),
  ),

  b.dynamic('lipid-statements', { difficulty: 1, tags: ['lipids'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about lipids is correct?',
      negativeStem: 'Which statement about lipids is NOT correct?',
      ...notePool(LIPID_TRUTHS, LIPID_FALSEHOODS),
    }),
  ),

  b.dynamic('enzyme-statements', { difficulty: 2, tags: ['enzymes'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about enzymes is correct?',
      negativeStem: 'Which statement about enzymes is NOT correct?',
      ...notePool(ENZYME_TRUTHS, ENZYME_FALSEHOODS),
    }),
  ),

  b.dynamic('classify-biomolecule', { difficulty: 1, tags: ['carbohydrates', 'proteins', 'lipids', 'nucleic acids'] }, (r) => {
    if (r.chance(0.5)) {
      const [name, cls, why] = r.pick(MOLECULES);
      return {
        stem: `${name} belongs to which class of biological molecules?`,
        answer: CLASS_LABEL[cls],
        distractors: CLASSES.filter((c) => c !== cls).map((c) => CLASS_LABEL[c]),
        explanation: `${name} is ${why}, so it is a ${cls}.`,
      };
    }
    const cls = r.pick(CLASSES);
    const pickOf = (c: MolClass) => r.pick(MOLECULES.filter((m) => m[1] === c));
    const right = pickOf(cls);
    const wrongs = CLASSES.filter((c) => c !== cls).map(pickOf);
    return {
      stem: `Which of the following is a ${cls}?`,
      answer: right[0],
      distractors: wrongs.map((m) => m[0]),
      explanation: `${right[0]} is ${right[2]}. ${wrongs.map((m) => `${m[0]} is a ${m[1]}.`).join(' ')}`,
    };
  }),

  // ---------------- fixed: carbohydrates ----------------
  ...b.mcqs([
    {
      id: 'sucrose-monomers', d: 1, o: 'past-paper', t: ['carbohydrates'],
      q: 'Hydrolysis of sucrose yields:',
      a: 'glucose and fructose',
      x: ['glucose and glucose', 'glucose and galactose', 'fructose and galactose'],
      e: 'Sucrose (cane sugar) is a disaccharide of α-glucose and fructose. Glucose + glucose is maltose and glucose + galactose is lactose.',
    },
    {
      id: 'cellulose-linkage', d: 2, o: 'past-paper', t: ['carbohydrates'],
      q: 'The glucose units in cellulose are joined by:',
      a: 'β-1,4 glycosidic bonds',
      x: ['α-1,4 glycosidic bonds', 'α-1,6 glycosidic bonds', 'peptide bonds'],
      e: 'Cellulose is an unbranched polymer of β-glucose linked by β-1,4 glycosidic bonds. α-1,4 links occur in starch and glycogen chains, and α-1,6 links form their branch points.',
    },
    {
      id: 'non-reducing-sugar', d: 2, o: 'past-paper', t: ['carbohydrates'],
      q: 'Which of the following is a non-reducing sugar?',
      a: 'Sucrose',
      x: ['Maltose', 'Lactose', 'Glucose'],
      e: 'In sucrose the glycosidic bond joins C-1 of glucose to C-2 of fructose, so neither reducing group is free. Glucose, maltose and lactose all have a free reducing group.',
    },
    {
      id: 'animal-storage-polysaccharide', d: 1, t: ['carbohydrates'],
      q: 'The main storage polysaccharide in the liver and muscles of animals is:',
      a: 'glycogen',
      x: ['starch', 'cellulose', 'chitin'],
      e: 'Animals store glucose as glycogen ("animal starch"). Starch is the plant store, while cellulose and chitin are structural polysaccharides.',
    },
    {
      id: 'chitin-location', d: 2, t: ['carbohydrates'],
      q: 'The structural polysaccharide found in the cell walls of fungi and the exoskeleton of arthropods is:',
      a: 'chitin',
      x: ['cellulose', 'glycogen', 'peptidoglycan'],
      e: 'Chitin is a polymer of N-acetylglucosamine. Cellulose forms plant cell walls, peptidoglycan forms bacterial cell walls, and glycogen is a storage molecule.',
    },
  ]),

  // ---------------- fixed: proteins ----------------
  ...b.mcqs([
    {
      id: 'peptide-bond-formation', d: 1, o: 'past-paper', t: ['proteins'],
      q: 'A peptide bond is formed between:',
      a: 'the carboxyl group of one amino acid and the amino group of another',
      x: [
        'the amino groups of two adjacent amino acids',
        'the carboxyl groups of two adjacent amino acids',
        'the R groups of two adjacent amino acids',
      ],
      e: 'Condensation between –COOH of one amino acid and –NH₂ of the next forms a –CO–NH– (peptide) link and releases one water molecule.',
    },
    {
      id: 'alpha-helix-bonds', d: 2, t: ['proteins'],
      q: 'The α-helix of a protein is held in shape mainly by:',
      a: 'hydrogen bonds between C=O and N–H groups of the backbone',
      x: [
        'disulfide bonds between cysteine side chains',
        'peptide bonds between the R groups',
        'ionic bonds between phosphate groups',
      ],
      e: 'Secondary structure (α-helix, β-pleated sheet) is stabilised by hydrogen bonds between backbone C=O and N–H groups. Disulfide bonds mainly stabilise tertiary structure.',
    },
    {
      id: 'haemoglobin-quaternary', d: 2, t: ['proteins'],
      q: 'Haemoglobin is said to have a quaternary structure because it:',
      a: 'is made of four polypeptide chains held together',
      x: [
        'contains an iron-containing haem group',
        'has a specific sequence of amino acids',
        'is coiled into α-helices',
      ],
      e: 'Quaternary structure means two or more polypeptide chains associate; haemoglobin has four (two α and two β). The amino-acid sequence is primary structure and α-helices are secondary structure.',
    },
    {
      id: 'denaturation-primary-intact', d: 3, t: ['proteins'],
      q: 'When a protein is denatured by moderate heat, which level of its structure normally remains intact?',
      a: 'Primary structure',
      x: ['Secondary structure', 'Tertiary structure', 'Quaternary structure'],
      e: 'Denaturation breaks the weak hydrogen, ionic and hydrophobic interactions that maintain the 3-D shape, but the covalent peptide bonds of the primary structure (amino-acid sequence) survive.',
    },
  ]),

  // ---------------- fixed: lipids ----------------
  ...b.mcqs([
    {
      id: 'triglyceride-composition', d: 1, o: 'past-paper', t: ['lipids'],
      q: 'A triglyceride is formed when one glycerol molecule combines with:',
      a: 'three fatty acid molecules',
      x: ['two fatty acids and a phosphate group', 'three glucose molecules', 'one long-chain alcohol'],
      e: 'The three –OH groups of glycerol each form an ester bond with a fatty acid, releasing three water molecules. Two fatty acids plus a phosphate group describes a phospholipid.',
    },
    {
      id: 'phospholipid-difference', d: 2, t: ['lipids'],
      q: 'A phospholipid differs from a triglyceride in that one of the fatty acids is replaced by:',
      a: 'a phosphate-containing group',
      x: ['a second glycerol molecule', 'a sugar residue', 'a long-chain alcohol'],
      e: 'In a phospholipid such as lecithin, glycerol carries two fatty acids and a phosphate-containing group, giving a hydrophilic head and two hydrophobic tails.',
    },
    {
      id: 'steroid-structure', d: 1, t: ['lipids'],
      q: 'Which lipid is built from four fused carbon rings and contains no fatty acids?',
      a: 'Cholesterol',
      x: ['Lecithin', 'Tristearin', 'Beeswax'],
      e: 'Cholesterol is a steroid (four fused rings). Lecithin is a phospholipid, tristearin a triglyceride and beeswax a wax; all three contain fatty acids.',
    },
  ]),

  // ---------------- fixed: nucleic acids ----------------
  ...b.mcqs([
    {
      id: 'rna-specific-components', d: 1, o: 'past-paper', t: ['nucleic acids'],
      q: 'Which pair of components is found in RNA but not in DNA?',
      a: 'Ribose and uracil',
      x: ['Deoxyribose and thymine', 'Ribose and thymine', 'Deoxyribose and uracil'],
      e: 'RNA contains the sugar ribose and the base uracil; DNA contains deoxyribose and thymine instead.',
    },
    {
      id: 'purine-bases', d: 1, t: ['nucleic acids'],
      q: 'Which of the following is a pair of purine bases?',
      a: 'Adenine and guanine',
      x: ['Cytosine and thymine', 'Adenine and thymine', 'Guanine and cytosine'],
      e: 'Purines (adenine, guanine) have a double ring; pyrimidines (cytosine, thymine, uracil) have a single ring.',
    },
    {
      id: 'phosphodiester-bond', d: 2, t: ['nucleic acids'],
      q: 'Adjacent nucleotides in the same strand of a polynucleotide are joined by:',
      a: 'phosphodiester bonds',
      x: ['hydrogen bonds', 'peptide bonds', 'glycosidic bonds between the bases'],
      e: "The phosphate of one nucleotide links the 3' carbon of one sugar to the 5' carbon of the next, forming the sugar-phosphate backbone. Hydrogen bonds join the bases of the two opposite strands.",
    },
  ]),

  // ---------------- fixed: enzymes ----------------
  ...b.mcqs([
    {
      id: 'lock-and-key-model', d: 1, o: 'past-paper', t: ['enzymes'],
      q: 'The lock-and-key model of enzyme action was proposed by:',
      a: 'Emil Fischer',
      x: ['Daniel Koshland', 'Hans Krebs', 'Louis Pasteur'],
      e: 'Emil Fischer proposed the lock-and-key model in 1894. Koshland later proposed the induced-fit model, in which the active site changes shape on binding the substrate.',
    },
    {
      id: 'enzyme-activation-energy', d: 1, t: ['enzymes'],
      q: 'Enzymes increase the rate of a reaction by:',
      a: 'lowering its activation energy',
      x: ['raising its activation energy', 'increasing the temperature of the mixture', 'shifting its equilibrium towards the products'],
      e: 'Enzymes provide an alternative pathway with a lower energy barrier. They do not heat the mixture or change the position of equilibrium.',
    },
    {
      id: 'prosthetic-group', d: 2, t: ['enzymes'],
      q: 'A non-protein organic cofactor that is tightly (covalently) bound to an enzyme is called:',
      a: 'a prosthetic group',
      x: ['a coenzyme', 'an activator', 'an apoenzyme'],
      e: 'A prosthetic group is an organic cofactor bound tightly to the enzyme. A coenzyme is loosely attached and detaches after the reaction, an activator is a detachable inorganic ion, and the apoenzyme is the protein part.',
    },
    {
      id: 'pepsin-optimum-ph', d: 1, o: 'past-paper', t: ['enzymes'],
      q: 'The optimum pH for the activity of pepsin is about:',
      a: '2.0',
      x: ['7.0', '7.8', '9.7'],
      e: 'Pepsin works in the acidic stomach, with an optimum pH near 2. Trypsin works best near 7.8 and arginase near 9.7.',
    },
  ]),

  // ---------------- fixed: enzyme inhibition ----------------
  ...b.mcqs([
    {
      id: 'malonate-inhibition', d: 2, o: 'past-paper', t: ['enzyme inhibition'],
      q: 'Malonate inhibits the enzyme succinate dehydrogenase. This is an example of:',
      a: 'competitive inhibition',
      x: ['non-competitive inhibition', 'irreversible inhibition', 'feedback activation'],
      e: 'Malonate resembles succinate in structure, so it competes for the active site of succinate dehydrogenase: a classic case of competitive inhibition.',
    },
    {
      id: 'overcome-competitive', d: 2, t: ['enzyme inhibition'],
      q: 'The effect of a competitive inhibitor on an enzyme can be reduced by:',
      a: 'increasing the substrate concentration',
      x: ['increasing the inhibitor concentration', 'decreasing the substrate concentration', 'lowering the temperature to 0 °C'],
      e: 'Substrate and inhibitor compete for the same active site; more substrate molecules out-compete the inhibitor, so the maximum rate can still be reached.',
    },
    {
      id: 'non-competitive-effect', d: 3, t: ['enzyme inhibition'],
      q: 'Which statement correctly describes a non-competitive inhibitor?',
      a: 'It binds away from the active site and lowers the maximum rate even at high substrate concentration.',
      x: [
        'It binds to the active site, and its effect disappears at high substrate concentration.',
        'It binds to the substrate itself and prevents it from reaching the enzyme.',
        'It binds away from the active site and raises the maximum rate of the reaction.',
      ],
      e: 'A non-competitive inhibitor attaches to a site other than the active site and changes the shape of the enzyme, so fewer enzyme molecules can work; adding substrate cannot restore the maximum rate. An inhibitor that binds the active site and is out-competed by excess substrate is competitive, not non-competitive.',
    },
  ]),
]);
