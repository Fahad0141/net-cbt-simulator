import { defineBank } from '@/engine/authoring';
import { num, numericOptions, statementQuestion, tex } from '@/engine/helpers';

/** A statement with the reason it is true, or the correction that shows it is false. */
interface Claim {
  s: string;
  why: string;
}

const PHOTO_TRUE: readonly Claim[] = [
  {
    s: 'The light-dependent reactions occur on the thylakoid membranes.',
    why: 'Photosystems, the electron carriers and ATP synthase of the light reactions are built into the thylakoid membranes.',
  },
  {
    s: tex`RuBisCO fixes $\ce{CO2}$ by joining it to ribulose bisphosphate.`,
    why: tex`RuBisCO carboxylates the 5C acceptor RuBP; the unstable 6C product splits into two molecules of 3-phosphoglycerate.`,
  },
  {
    s: 'Photolysis of water releases oxygen, protons and electrons.',
    why: tex`$\ce{2H2O -> 4H+ + 4e- + O2}$; the electrons replace those lost by P680 of photosystem II.`,
  },
  {
    s: 'ATP and NADPH from the light reactions drive the Calvin cycle.',
    why: 'The Calvin cycle uses ATP and NADPH to reduce 3-phosphoglycerate to PGAL, and more ATP to regenerate RuBP.',
  },
  {
    s: 'Carotenoids absorb light and protect chlorophyll from photo-oxidation.',
    why: 'Carotenoids are accessory pigments: they pass absorbed energy to chlorophyll a and dissipate excess energy.',
  },
  {
    s: 'Cyclic photophosphorylation involves only photosystem I.',
    why: 'In cyclic flow, electrons from P700 return to P700 through the cytochrome complex, making ATP only.',
  },
];

const PHOTO_FALSE: readonly Claim[] = [
  {
    s: 'The Calvin cycle takes place on the thylakoid membranes.',
    why: 'The Calvin cycle occurs in the stroma of the chloroplast, not on the thylakoids.',
  },
  {
    s: 'The oxygen released in photosynthesis comes from carbon dioxide.',
    why: tex`Isotope ($^{18}\mathrm{O}$) studies showed that the released oxygen comes from water, not from $\ce{CO2}$.`,
  },
  {
    s: 'Cyclic photophosphorylation produces NADPH and oxygen.',
    why: 'Cyclic photophosphorylation makes only ATP; it splits no water and reduces no NADP+.',
  },
  {
    s: 'Chlorophyll has an iron atom at the centre of its porphyrin ring.',
    why: 'The central atom of chlorophyll is magnesium; iron is the central atom of haem.',
  },
  {
    s: 'The first stable product of the Calvin cycle is a six-carbon sugar.',
    why: 'The first stable product is 3-phosphoglycerate (PGA), a three-carbon compound.',
  },
  {
    s: 'The reaction-centre chlorophyll of photosystem I is P680.',
    why: 'P680 belongs to photosystem II; the reaction centre of photosystem I is P700.',
  },
];

const RESP_TRUE: readonly Claim[] = [
  {
    s: 'Glycolysis occurs in the cytoplasm and does not need oxygen.',
    why: 'Glycolysis is the cytoplasmic, anaerobic first stage common to aerobic and anaerobic respiration.',
  },
  {
    s: 'Oxygen is the final electron acceptor of the electron transport chain.',
    why: 'Oxygen accepts electrons and protons at the end of the chain and is reduced to water.',
  },
  {
    s: tex`Each turn of the Krebs cycle releases two molecules of $\ce{CO2}$.`,
    why: tex`Two decarboxylations occur per turn (isocitrate and $\alpha$-ketoglutarate), so 4 $\ce{CO2}$ per glucose.`,
  },
  {
    s: 'Acetyl CoA combines with oxaloacetate to form citrate.',
    why: 'The 2C acetyl group joins 4C oxaloacetate to give 6C citrate, the first product of the Krebs cycle.',
  },
  {
    s: 'Most of the ATP of aerobic respiration is made by oxidative phosphorylation.',
    why: 'Glycolysis and the Krebs cycle make only 4 ATP per glucose; the rest comes from the electron transport chain.',
  },
  {
    s: 'Fermentation regenerates NAD+ so that glycolysis can continue.',
    why: 'Reducing pyruvate to lactate (or acetaldehyde to ethanol) reoxidises NADH to NAD+, which glycolysis needs.',
  },
];

const RESP_FALSE: readonly Claim[] = [
  {
    s: 'Glycolysis takes place in the mitochondrial matrix.',
    why: 'Glycolysis occurs in the cytoplasm (cytosol); the matrix is the site of the Krebs cycle.',
  },
  {
    s: 'The Krebs cycle occurs on the outer mitochondrial membrane.',
    why: 'The Krebs cycle runs in the mitochondrial matrix.',
  },
  {
    s: 'Human muscle cells convert pyruvate to ethanol when oxygen is short.',
    why: tex`Human muscle reduces pyruvate to lactic acid; ethanol and $\ce{CO2}$ are formed by yeast.`,
  },
  {
    s: 'Glycolysis splits glucose into two molecules of acetyl CoA.',
    why: 'Glycolysis ends with two molecules of pyruvate; acetyl CoA forms later in the mitochondria.',
  },
  {
    s: 'Water is the final electron acceptor of the electron transport chain.',
    why: 'Oxygen is the final acceptor; water is the product formed when oxygen is reduced.',
  },
  {
    s: 'The Krebs cycle directly produces most of the ATP of respiration.',
    why: 'The Krebs cycle makes only 2 ATP per glucose directly; most ATP comes from oxidative phosphorylation.',
  },
];

const claimText = (c: Claim): string => c.s;
const reasonOf = (pool: readonly Claim[], s: string): string => pool.find((c) => c.s === s)?.why ?? '';

/** Sites of bioenergetic processes; each site appears once so distractors are never correct. */
const SITES: readonly { site: string; processes: readonly string[] }[] = [
  { site: 'Cytoplasm (cytosol)', processes: ['glycolysis', 'lactic acid fermentation in muscle'] },
  {
    site: 'Mitochondrial matrix',
    processes: ['the Krebs cycle', 'the oxidation of pyruvate to acetyl CoA'],
  },
  {
    site: 'Inner mitochondrial membrane (cristae)',
    processes: ['the electron transport chain of respiration', 'oxidative phosphorylation'],
  },
  {
    site: 'Thylakoid membranes of the chloroplast',
    processes: ['the light-dependent reactions', 'photophosphorylation'],
  },
  { site: 'Stroma of the chloroplast', processes: ['the Calvin cycle', 'carbon dioxide fixation by RuBisCO'] },
];

export default defineBank('biology', 'bioenergetics', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('respiration-counts', { difficulty: 2, origin: 'past-paper', tags: ['respiration'] }, (r) => {
    const n = r.int(2, 10);
    const g = `${n} molecules of glucose`;
    const v = r.pick([
      {
        q: `The net gain of ATP from glycolysis of ${g} is:`,
        k: 2,
        w: [4, 1, 3],
        e: 'Glycolysis uses 2 ATP and forms 4 ATP per glucose, a net gain of 2 ATP',
      },
      {
        q: `The number of pyruvate molecules formed by glycolysis of ${g} is:`,
        k: 2,
        w: [1, 4, 3],
        e: 'One 6C glucose is split into two 3C pyruvate molecules',
      },
      {
        q: `The number of turns of the Krebs cycle needed to oxidise ${g} completely is:`,
        k: 2,
        w: [1, 4, 6],
        e: 'Each glucose gives two acetyl CoA, and each acetyl CoA drives one turn of the cycle',
      },
      {
        q: tex`The number of $\ce{CO2}$ molecules released in the Krebs cycle alone from ${g} is:`,
        k: 4,
        w: [6, 2, 3],
        e: tex`Each turn releases 2 $\ce{CO2}$ and there are 2 turns per glucose (the 2 $\ce{CO2}$ of the link reaction are not part of the cycle)`,
      },
      {
        q: tex`The total number of $\ce{CO2}$ molecules released by complete aerobic respiration of ${g} is:`,
        k: 6,
        w: [4, 2, 12],
        e: tex`$\ce{C6H12O6 + 6O2 -> 6CO2 + 6H2O}$: 2 $\ce{CO2}$ from the link reaction plus 4 from the Krebs cycle`,
      },
      {
        q: `The number of NADH molecules produced in the Krebs cycle from ${g} is:`,
        k: 6,
        w: [3, 10, 2],
        e: 'Each turn produces 3 NADH and there are 2 turns per glucose',
      },
      {
        q: tex`The number of $\mathrm{FADH_2}$ molecules produced in the Krebs cycle from ${g} is:`,
        k: 2,
        w: [1, 6, 4],
        e: tex`Each turn produces 1 $\mathrm{FADH_2}$ (succinate to fumarate) and there are 2 turns per glucose`,
      },
      {
        q: `The total number of NADH molecules formed during complete aerobic respiration of ${g} is:`,
        k: 10,
        w: [6, 8, 12],
        e: 'Per glucose: 2 NADH (glycolysis) + 2 NADH (link reaction) + 6 NADH (Krebs cycle) = 10 NADH',
      },
      {
        q: `The number of oxygen molecules consumed in complete aerobic respiration of ${g} is:`,
        k: 6,
        w: [3, 12, 2],
        e: tex`$\ce{C6H12O6 + 6O2 -> 6CO2 + 6H2O}$, so 6 $\ce{O2}$ per glucose`,
      },
    ]);
    const { answer, distractors } = numericOptions(r, {
      correct: v.k * n,
      wrong: v.w.map((m) => m * n),
      format: (x) => `${x}`,
      fallback: 'integer',
    });
    return {
      stem: v.q,
      answer,
      distractors,
      explanation: tex`${v.e}. For ${n} glucose molecules: $${v.k} \times ${n} = ${v.k * n}$.`,
    };
  }),

  b.dynamic('photosynthesis-counts', { difficulty: 3, tags: ['photosynthesis'] }, (r) => {
    const n = r.int(2, 8);
    const g = `${n} molecules of glucose`;
    const v = r.pick([
      {
        q: tex`The number of $\ce{CO2}$ molecules that must be fixed by the Calvin cycle to make ${g} is:`,
        k: 6,
        w: [1, 3, 12],
        e: tex`A hexose contains 6 carbon atoms and each turn of the cycle fixes one $\ce{CO2}$, so 6 $\ce{CO2}$ per glucose`,
      },
      {
        q: `The number of ATP molecules used by the Calvin cycle to make ${g} is:`,
        k: 18,
        w: [12, 6, 36],
        e: tex`Each $\ce{CO2}$ fixed needs 3 ATP and 2 NADPH; one glucose needs 6 $\ce{CO2}$, so $6 \times 3 = 18$ ATP`,
      },
      {
        q: `The number of NADPH molecules used by the Calvin cycle to make ${g} is:`,
        k: 12,
        w: [18, 6, 24],
        e: tex`Each $\ce{CO2}$ fixed needs 2 NADPH; one glucose needs 6 $\ce{CO2}$, so $6 \times 2 = 12$ NADPH`,
      },
      {
        q: tex`The number of $\ce{O2}$ molecules released by photosynthesis when ${g} are formed is:`,
        k: 6,
        w: [12, 3, 1],
        e: tex`$\ce{6CO2 + 12H2O -> C6H12O6 + 6O2 + 6H2O}$, so 6 $\ce{O2}$ per glucose`,
      },
      {
        q: `The number of water molecules split by photolysis when ${g} are formed is:`,
        k: 12,
        w: [6, 24, 18],
        e: tex`$\ce{2H2O -> 4H+ + 4e- + O2}$; 6 $\ce{O2}$ per glucose need $6 \times 2 = 12$ $\ce{H2O}$`,
      },
    ]);
    const { answer, distractors } = numericOptions(r, {
      correct: v.k * n,
      wrong: v.w.map((m) => m * n),
      format: (x) => `${x}`,
      fallback: 'integer',
    });
    return {
      stem: v.q,
      answer,
      distractors,
      explanation: tex`${v.e}. For ${n} glucose molecules: $${v.k} \times ${n} = ${v.k * n}$.`,
    };
  }),

  b.dynamic('atp-hydrolysis-energy', { difficulty: 1, tags: ['ATP'] }, (r) => {
    const n = r.int(2, 13);
    const e = Math.round(7.3 * n * 10) / 10;
    const { answer, distractors } = numericOptions(r, {
      correct: e,
      // counted both terminal bonds; used the kJ figure as kcal; halved the value
      wrong: [14.6 * n, 30.5 * n, 3.65 * n],
      format: (x) => `$${num(x)}\\,\\mathrm{kcal}$`,
    });
    return {
      stem: `Under standard conditions, the energy released when ${n} moles of ATP are hydrolysed to ADP and inorganic phosphate is about:`,
      answer,
      distractors,
      explanation: tex`Hydrolysis of the terminal phosphate bond releases about $7.3\,\mathrm{kcal\,mol^{-1}}$ ($\approx 30.5\,\mathrm{kJ\,mol^{-1}}$). Energy $= 7.3 \times ${n} = ${num(e)}\,\mathrm{kcal}$.`,
    };
  }),

  b.dynamic('process-site', { difficulty: 1, origin: 'past-paper', tags: ['respiration', 'photosynthesis'] }, (r) => {
    const target = r.pick(SITES);
    const process = r.pick(target.processes);
    const others = SITES.filter((s) => s !== target).map((s) => s.site);
    return {
      stem: `In a eukaryotic cell, the site of ${process} is the:`,
      answer: target.site,
      distractors: r.sample(others, 3),
      explanation: `Glycolysis: cytosol; link reaction and Krebs cycle: mitochondrial matrix; electron transport and oxidative phosphorylation: inner membrane (cristae); light reactions: thylakoid membranes; Calvin cycle: stroma. Hence the site of ${process} is the ${target.site.toLowerCase()}.`,
    };
  }),

  b.dynamic('photosynthesis-statements', { difficulty: 2, tags: ['photosynthesis'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about photosynthesis is correct?',
      negativeStem: 'Which statement about photosynthesis is NOT correct?',
      truths: PHOTO_TRUE.map(claimText),
      falsehoods: PHOTO_FALSE.map(claimText),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false. ${reasonOf(PHOTO_FALSE, answer)}`
          : `This statement is true. ${reasonOf(PHOTO_TRUE, answer)}`,
    }),
  ),

  b.dynamic('respiration-statements', { difficulty: 2, tags: ['respiration'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about cellular respiration is correct?',
      negativeStem: 'Which statement about cellular respiration is NOT correct?',
      truths: RESP_TRUE.map(claimText),
      falsehoods: RESP_FALSE.map(claimText),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false. ${reasonOf(RESP_FALSE, answer)}`
          : `This statement is true. ${reasonOf(RESP_TRUE, answer)}`,
    }),
  ),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'atp-components', d: 1, o: 'past-paper', t: ['ATP'],
      q: 'A molecule of ATP is made of:',
      a: 'Adenine, ribose sugar and three phosphate groups',
      x: [
        'Adenine, deoxyribose sugar and three phosphate groups',
        'Adenine, ribose sugar and two phosphate groups',
        'Guanine, ribose sugar and three phosphate groups',
      ],
      e: 'ATP (adenosine triphosphate) is adenosine (adenine + ribose) carrying three phosphate groups. Deoxyribose occurs in DNA; ADP has two phosphates; guanine forms GTP.',
    },
    {
      id: 'chlorophyll-central-atom', d: 1, o: 'past-paper', t: ['photosynthesis'],
      q: 'The metal atom at the centre of the porphyrin ring of chlorophyll is:',
      a: 'Magnesium',
      x: ['Iron', 'Manganese', 'Copper'],
      e: 'Chlorophyll has a magnesium atom held in its porphyrin head. Iron is the central atom of haem in haemoglobin and cytochromes.',
    },
    {
      id: 'chlorophyll-b-difference', d: 2, t: ['photosynthesis'],
      q: 'Chlorophyll b differs from chlorophyll a in having:',
      a: tex`A $-\mathrm{CHO}$ group in place of a $-\mathrm{CH_3}$ group`,
      x: [
        'An iron atom in place of the magnesium atom',
        'No phytol (hydrocarbon) tail at all',
        tex`A $-\mathrm{COOH}$ group in place of a $-\mathrm{CH_3}$ group`,
      ],
      e: tex`Both chlorophylls have a Mg-porphyrin head and a phytol tail; chlorophyll b carries an aldehyde ($-\mathrm{CHO}$) group where chlorophyll a has a methyl ($-\mathrm{CH_3}$) group.`,
    },
    {
      id: 'p700-photosystem', d: 1, t: ['photosynthesis'],
      q: 'P700 is the reaction-centre chlorophyll of:',
      a: 'Photosystem I',
      x: ['Photosystem II', 'The cytochrome complex', 'The ATP synthase complex'],
      e: 'The reaction centre of photosystem I absorbs best at 700 nm (P700); that of photosystem II absorbs best at 680 nm (P680).',
    },
    {
      id: 'chlorophyll-absorption', d: 1, t: ['photosynthesis'],
      q: 'Chlorophyll absorbs light most strongly in the:',
      a: 'Blue-violet and red regions',
      x: ['Green and yellow regions', 'Yellow and orange regions', 'Green and far-red regions'],
      e: 'Chlorophyll shows absorption peaks in the blue-violet and red parts of the spectrum; green light is mostly reflected, which is why leaves look green.',
    },
    {
      id: 'oxygen-source', d: 1, o: 'past-paper', t: ['photosynthesis'],
      q: 'The oxygen released during photosynthesis comes from:',
      a: 'Water',
      x: ['Carbon dioxide', 'Glucose', 'Both carbon dioxide and water'],
      e: tex`Experiments with the isotope $^{18}\mathrm{O}$ showed that labelled oxygen appears as $\ce{O2}$ only when the water is labelled. It is released by photolysis of water.`,
    },
    {
      id: 'rubisco', d: 1, t: ['photosynthesis'],
      q: 'The enzyme that fixes carbon dioxide in the Calvin cycle is:',
      a: 'RuBisCO',
      x: ['ATP synthase', 'Hexokinase', 'Cytochrome oxidase'],
      e: tex`Ribulose bisphosphate carboxylase/oxygenase (RuBisCO) joins $\ce{CO2}$ to RuBP in the stroma. It is the most abundant protein on Earth.`,
    },
    {
      id: 'calvin-first-stable-product', d: 2, o: 'past-paper', t: ['photosynthesis'],
      q: 'The first stable product of carbon fixation in the Calvin cycle is:',
      a: '3-phosphoglycerate (PGA)',
      x: ['Glyceraldehyde 3-phosphate (PGAL)', 'Ribulose bisphosphate (RuBP)', 'Oxaloacetate'],
      e: tex`$\ce{CO2}$ + RuBP gives an unstable 6C compound that splits at once into two molecules of 3-phosphoglycerate. PGAL is formed later by reduction; oxaloacetate is the first product in C4 plants.`,
    },
    {
      id: 'glycolysis-end-product', d: 1, o: 'past-paper', t: ['respiration'],
      q: 'The end product of glycolysis is:',
      a: 'Pyruvic acid',
      x: ['Acetyl CoA', 'Citric acid', 'Oxaloacetic acid'],
      e: 'Glycolysis splits one glucose into two molecules of pyruvic acid (pyruvate). Acetyl CoA forms afterwards in the mitochondria; citric and oxaloacetic acids belong to the Krebs cycle.',
    },
    {
      id: 'krebs-first-product', d: 2, o: 'past-paper', t: ['respiration'],
      q: 'Acetyl CoA combines with oxaloacetate at the start of the Krebs cycle to form:',
      a: 'Citric acid',
      x: ['Alpha-ketoglutaric acid', 'Succinic acid', 'Malic acid'],
      e: 'The 2C acetyl group joins 4C oxaloacetate to form 6C citric acid (hence the name citric acid cycle). The other compounds appear at later steps.',
    },
    {
      id: 'final-electron-acceptor', d: 1, o: 'past-paper', t: ['respiration'],
      q: 'The final electron acceptor in the electron transport chain of aerobic respiration is:',
      a: 'Oxygen',
      x: ['NAD+', 'Cytochrome c', 'FAD'],
      e: 'At the end of the chain, cytochrome oxidase passes electrons to oxygen, which combines with protons to form water. NAD+, FAD and cytochrome c are carriers earlier in the pathway.',
    },
    {
      id: 'yeast-fermentation', d: 1, t: ['respiration'],
      q: 'The products of anaerobic respiration (alcoholic fermentation) in yeast are:',
      a: 'Ethanol and carbon dioxide',
      x: ['Lactic acid and carbon dioxide', 'Ethanol and water', 'Lactic acid and water'],
      e: tex`Yeast decarboxylates pyruvate to acetaldehyde, releasing $\ce{CO2}$, and then reduces acetaldehyde to ethanol, regenerating NAD+.`,
    },
    {
      id: 'muscle-lactic-acid', d: 1, t: ['respiration'],
      q: 'When oxygen is in short supply in human skeletal muscle, pyruvate is reduced to:',
      a: 'Lactic acid',
      x: ['Ethanol', 'Acetyl CoA', 'Citric acid'],
      e: 'Muscle cells reduce pyruvate to lactic acid using NADH, which regenerates NAD+ for glycolysis. Ethanol is formed by yeast, not by human cells.',
    },
    {
      id: 'chemiosmosis-mitchell', d: 2, o: 'past-paper', t: ['respiration', 'ATP'],
      q: 'The chemiosmotic theory of ATP synthesis was proposed by:',
      a: 'Peter Mitchell',
      x: ['Hans Krebs', 'Melvin Calvin', 'Jan Ingenhousz'],
      e: 'Peter Mitchell explained that a proton gradient across a membrane drives ATP synthase. Krebs described the citric acid cycle, Calvin the carbon-fixation cycle, and Ingenhousz showed that plants need light to release oxygen.',
    },
    {
      id: 'cyclic-photophosphorylation', d: 2, t: ['photosynthesis', 'ATP'],
      q: 'Cyclic photophosphorylation differs from non-cyclic photophosphorylation because it:',
      a: 'Produces ATP but neither NADPH nor oxygen',
      x: [
        'Produces NADPH but no ATP',
        'Involves photosystem II only',
        'Releases oxygen by photolysis of water',
      ],
      e: 'In cyclic flow, electrons leave P700 of photosystem I and return to it via the cytochrome complex, so only ATP is made. No water is split and NADP+ is not reduced.',
    },
    {
      id: 'photorespiration', d: 3, t: ['photosynthesis'],
      q: 'Photorespiration begins when RuBisCO combines ribulose bisphosphate with:',
      a: 'Oxygen',
      x: ['Carbon dioxide', 'Water', 'NADPH'],
      e: tex`RuBisCO also acts as an oxygenase. When $\ce{O2}$ is high relative to $\ce{CO2}$, it adds $\ce{O2}$ to RuBP, giving one 3-phosphoglycerate and one phosphoglycolate; carbon is then lost as $\ce{CO2}$ and ATP is used up rather than made. Adding $\ce{CO2}$ is normal carboxylation, not photorespiration.`,
    },
    {
      id: 'action-spectrum', d: 2, t: ['photosynthesis'],
      q: 'A graph that shows the rate of photosynthesis at different wavelengths of light is called the:',
      a: 'Action spectrum',
      x: ['Absorption spectrum', 'Emission spectrum', 'Electromagnetic spectrum'],
      e: 'An action spectrum plots the activity of a process against wavelength; an absorption spectrum plots how much light a pigment absorbs at each wavelength.',
    },
    {
      id: 'glycolysis-atp-mechanism', d: 2, t: ['respiration', 'ATP'],
      q: 'ATP is formed during glycolysis by:',
      a: 'Substrate-level phosphorylation',
      x: ['Oxidative phosphorylation', 'Photophosphorylation', 'Chemiosmosis across the cristae'],
      e: 'In glycolysis, enzymes transfer a phosphate group from a phosphorylated substrate directly to ADP. Oxidative phosphorylation and chemiosmosis happen on the inner mitochondrial membrane; photophosphorylation happens in chloroplasts.',
    },
    {
      id: 'accessory-pigment', d: 1, t: ['photosynthesis'],
      q: 'Which of the following is an accessory photosynthetic pigment?',
      a: 'Carotene',
      x: ['Haemoglobin', 'Melanin', 'Myoglobin'],
      e: 'Carotenes and xanthophylls (carotenoids) absorb light that chlorophyll a absorbs poorly and pass the energy on to it. Haemoglobin and myoglobin carry oxygen; melanin is a skin pigment.',
    },
  ]),
]);
