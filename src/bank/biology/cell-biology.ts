import { defineBank } from '@/engine/authoring';
import type { AuthoredQuestion } from '@/engine/types';
import { num, numericOptions, pickDistractors, q$, statementQuestion, tex } from '@/engine/helpers';

/** Micrometre as a LaTeX unit for `q$` / `qty`. */
const UM = '\\mu m';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * For the "which is correct" variant of a statement question, explains why each
 * displayed false statement is wrong, using the correction map.
 */
function withCorrections(q: AuthoredQuestion, corrections: Readonly<Record<string, string>>): AuthoredQuestion {
  if (q.answer in corrections) return q; // inverted variant: the explanation already covers the false answer
  const why = q.distractors.map((d) => `"${d}" is false: ${corrections[d] ?? ''}`).join(' ');
  return { ...q, explanation: `"${q.answer}" is true. ${why}` };
}

/** Organelles with one function each that no other entry shares. */
const ORGANELLES: ReadonlyArray<{ name: string; fn: string }> = [
  { name: 'mitochondrion', fn: 'aerobic respiration, producing most of the cell’s ATP' },
  { name: 'chloroplast', fn: 'photosynthesis, trapping light energy to make sugars' },
  { name: 'ribosome', fn: 'protein synthesis by translating mRNA' },
  { name: 'smooth endoplasmic reticulum', fn: 'lipid synthesis and detoxification of drugs' },
  { name: 'Golgi apparatus', fn: 'modifying, packaging and secreting proteins' },
  { name: 'lysosome', fn: 'intracellular digestion by hydrolytic enzymes' },
  { name: 'peroxisome', fn: 'breaking down hydrogen peroxide with catalase' },
  { name: 'centriole', fn: 'organising the spindle in dividing animal cells' },
  { name: 'nucleolus', fn: 'making rRNA and assembling ribosomal subunits' },
  { name: 'central vacuole', fn: 'storing cell sap and keeping a plant cell turgid' },
];

/** Scientists and contributions that do not overlap. */
const SCIENTISTS: ReadonlyArray<{ name: string; did: string; note: string }> = [
  { name: 'Robert Hooke', did: 'coined the term "cell" after observing thin slices of cork', note: 'in 1665' },
  { name: 'Antonie van Leeuwenhoek', did: 'first observed bacteria and protozoa ("animalcules") with simple microscopes', note: 'in the 1670s' },
  { name: 'Robert Brown', did: 'discovered the nucleus in plant cells', note: 'in 1831' },
  { name: 'Matthias Schleiden', did: 'concluded that all plants are made of cells', note: 'in 1838' },
  { name: 'Theodor Schwann', did: 'concluded that all animals are made of cells', note: 'in 1839' },
  { name: 'Rudolf Virchow', did: 'stated that new cells arise only from pre-existing cells', note: 'in 1855 (omnis cellula e cellula)' },
  { name: 'Louis Pasteur', did: 'disproved spontaneous generation with swan-neck flasks', note: 'around 1860' },
  { name: 'Singer and Nicolson', did: 'proposed the fluid mosaic model of the cell membrane', note: 'in 1972' },
  { name: 'Camillo Golgi', did: 'first described the Golgi apparatus in nerve cells', note: 'in 1898' },
  { name: 'Knoll and Ruska', did: 'built the first electron microscope', note: 'in the early 1930s' },
];

/** Ribosome sources: whole ribosome and subunits. */
const RIBOSOMES: ReadonlyArray<{ where: string; type: 70 | 80 }> = [
  { where: 'a bacterial cell', type: 70 },
  { where: 'a cyanobacterium', type: 70 },
  { where: 'a chloroplast', type: 70 },
  { where: 'the cytosol of a liver cell', type: 80 },
  { where: 'the rough ER of a pancreatic cell', type: 80 },
  { where: 'the cytosol of a yeast cell', type: 80 },
];

const PROK_FALSE: Readonly<Record<string, string>> = {
  'Prokaryotic cells contain mitochondria for aerobic respiration.':
    'prokaryotes have no mitochondria; aerobic bacteria respire using enzymes on the plasma membrane.',
  'The cell wall of bacteria is made mainly of cellulose.':
    'bacterial walls are made of peptidoglycan (murein); cellulose is found in plant walls.',
  'Prokaryotic DNA is enclosed by a double nuclear membrane.':
    'prokaryotic DNA lies free in the nucleoid; there is no nuclear envelope.',
  'The ribosomes in the cytosol of eukaryotic cells are of the 70S type.':
    'cytosolic ribosomes of eukaryotes are 80S; 70S ribosomes occur in prokaryotes (and in chloroplasts).',
  'Cyanobacteria photosynthesise inside membrane-bound chloroplasts.':
    'cyanobacteria are prokaryotes; their photosynthetic membranes (thylakoids) lie free in the cytoplasm.',
  'Prokaryotic cells are generally larger than eukaryotic cells.':
    'prokaryotes are typically about 1–10 µm, much smaller than most eukaryotic cells (10–100 µm).',
  'Prokaryotic cells divide by mitosis.':
    'prokaryotes divide by binary fission; mitosis occurs only in eukaryotes.',
};

const MEMBRANE_FALSE: Readonly<Record<string, string>> = {
  'The hydrophilic phosphate heads face the interior of the bilayer.':
    'the hydrophilic heads face the watery surroundings; the hydrophobic tails face the interior.',
  'Facilitated diffusion moves solutes against their concentration gradient.':
    'facilitated diffusion is passive and moves solutes only down their concentration gradient.',
  'Membrane proteins are fixed in place and cannot move laterally.':
    'in the fluid mosaic model many proteins drift laterally within the fluid bilayer.',
  'Active transport takes place without any use of energy.':
    'active transport needs energy, usually from ATP, because it works against the gradient.',
  'The carbohydrate chains of the membrane project into the cytoplasm.':
    'glycoprotein and glycolipid carbohydrate chains project from the outer (extracellular) surface.',
  'The plasma membrane is freely permeable to all solutes.':
    'the membrane is selectively (partially) permeable; ions and large polar molecules need proteins to cross.',
  'Simple diffusion requires carrier proteins and ATP.':
    'simple diffusion needs neither carriers nor ATP; molecules move down their gradient directly through the bilayer.',
};

export default defineBank('biology', 'cell-biology', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('organelle-to-function', { difficulty: 1, origin: 'past-paper', tags: ['organelles'] }, (r) => {
    const [target, ...others] = r.sample(ORGANELLES, 4) as [typeof ORGANELLES[number], ...typeof ORGANELLES];
    return {
      stem: `The main function of the **${target.name}** is:`,
      answer: cap(target.fn),
      distractors: others.map((o) => cap(o.fn)),
      explanation: `The ${target.name} is responsible for ${target.fn}. ${others
        .map((o) => `The ${o.name} is responsible for ${o.fn}.`)
        .join(' ')}`,
    };
  }),

  b.dynamic('function-to-organelle', { difficulty: 1, tags: ['organelles'] }, (r) => {
    const [target, ...others] = r.sample(ORGANELLES, 4) as [typeof ORGANELLES[number], ...typeof ORGANELLES];
    return {
      stem: `Which cell structure is mainly responsible for ${target.fn}?`,
      answer: cap(target.name),
      distractors: others.map((o) => cap(o.name)),
      explanation: `The ${target.name} is responsible for ${target.fn}. ${others
        .map((o) => `The ${o.name} is responsible for ${o.fn}.`)
        .join(' ')}`,
    };
  }),

  b.dynamic('scientist-contribution', { difficulty: 1, origin: 'past-paper', tags: ['cell theory'] }, (r) => {
    const [target, ...others] = r.sample(SCIENTISTS, 4) as [typeof SCIENTISTS[number], ...typeof SCIENTISTS];
    const fact = `${target.name} ${target.did} ${target.note}.`;
    if (r.chance(0.5)) {
      return {
        stem: `Who ${target.did}?`,
        answer: target.name,
        distractors: others.map((o) => o.name),
        explanation: fact,
      };
    }
    return {
      stem: `Which of the following describes the contribution of **${target.name}** to cell biology?`,
      answer: `${cap(target.did)}`,
      distractors: others.map((o) => cap(o.did)),
      explanation: `${fact} The other options are the work of ${others.map((o) => o.name).join(', ')}.`,
    };
  }),

  b.dynamic('ribosome-types', { difficulty: 2, origin: 'past-paper', tags: ['prokaryotic and eukaryotic cells', 'organelles'] }, (r) => {
    const src = r.pick(RIBOSOMES);
    const big = src.type === 70 ? 50 : 60;
    const small = src.type === 70 ? 30 : 40;
    const why = tex`Ribosomes of prokaryotes and chloroplasts are 70S (50S + 30S subunits); cytosolic and rough-ER ribosomes of eukaryotes are 80S (60S + 40S subunits). Svedberg (S) units measure sedimentation rate and are not additive.`;
    const mode = r.pick(['whole', 'subunits', 'small'] as const);
    if (mode === 'whole') {
      const answer = `${src.type}S`;
      return {
        stem: `The ribosomes of ${src.where} are of the type:`,
        answer,
        distractors: pickDistractors(answer, ['70S', '80S', '60S', '50S', '40S', '120S'], r),
        explanation: why,
      };
    }
    if (mode === 'subunits') {
      const answer = `${big}S and ${small}S`;
      return {
        stem: `The two subunits of a ribosome from ${src.where} are:`,
        answer,
        distractors: pickDistractors(answer, ['50S and 30S', '60S and 40S', '60S and 30S', '50S and 40S', '40S and 30S'], r),
        explanation: why,
      };
    }
    const answer = `${small}S`;
    return {
      stem: `The **smaller** subunit of a ribosome from ${src.where} is:`,
      answer,
      distractors: pickDistractors(answer, ['30S', '40S', '50S', '60S', '20S'], r),
      explanation: why,
    };
  }),

  b.dynamic('prokaryote-eukaryote-statements', { difficulty: 2, tags: ['prokaryotic and eukaryotic cells'] }, (r) =>
    withCorrections(statementQuestion(r, {
      stem: 'Which of the following statements about prokaryotic and eukaryotic cells is correct?',
      negativeStem: 'Which of the following statements about prokaryotic and eukaryotic cells is NOT correct?',
      truths: [
        'Prokaryotic cells lack a nuclear envelope; their DNA lies in a nucleoid.',
        'Ribosomes are present in both prokaryotic and eukaryotic cells.',
        'The cell wall of bacteria contains peptidoglycan (murein).',
        'Prokaryotic cells lack membrane-bound organelles such as the Golgi apparatus.',
        'Many bacteria carry plasmids, small circular DNA molecules separate from the main chromosome.',
        'Eukaryotic chromosomes are linear and associated with histone proteins.',
      ],
      falsehoods: Object.keys(PROK_FALSE),
      explain: (answer) => `The statement is false: ${PROK_FALSE[answer] ?? ''} The other three statements are true.`,
    }), PROK_FALSE),
  ),

  b.dynamic('membrane-statements', { difficulty: 2, tags: ['membranes'] }, (r) =>
    withCorrections(statementQuestion(r, {
      stem: 'Which of the following statements about the plasma membrane is correct?',
      negativeStem: 'Which of the following statements about the plasma membrane is NOT correct?',
      truths: [
        'The membrane is a fluid phospholipid bilayer with a mosaic of embedded proteins (fluid mosaic model).',
        'The hydrophobic fatty-acid tails of phospholipids face the interior of the bilayer.',
        'Cholesterol in animal cell membranes helps regulate membrane fluidity.',
        'Active transport moves substances against their concentration gradient using ATP.',
        'Facilitated diffusion uses carrier or channel proteins but needs no ATP.',
        'Small non-polar molecules such as oxygen cross the bilayer by simple diffusion.',
      ],
      falsehoods: Object.keys(MEMBRANE_FALSE),
      explain: (answer) => `The statement is false: ${MEMBRANE_FALSE[answer] ?? ''} The other three statements are true.`,
    }), MEMBRANE_FALSE),
  ),

  b.dynamic('microscope-magnification', { difficulty: 2, tags: ['cell theory'] }, (r) => {
    if (r.chance(0.4)) {
      const eye = r.pick([5, 10, 15, 20]);
      const obj = r.pick([4, 10, 40, 45, 100]);
      const total = eye * obj;
      const { answer, distractors } = numericOptions(r, {
        correct: total,
        wrong: [eye + obj, total * 10, total / 10, obj],
        format: (x) => tex`$${num(x)}\times$`,
      });
      return {
        stem: tex`A light microscope has an eyepiece of $${eye}\times$ and an objective lens of $${obj}\times$. The total magnification of the image is:`,
        answer,
        distractors,
        explanation: tex`Total magnification $=$ eyepiece $\times$ objective $= ${eye} \times ${obj} = ${total}\times$.`,
      };
    }
    // Actual size from image size; image comes out as a whole number (or .5) of millimetres.
    let actual = 0;
    let mag = 0;
    let imageMm = 0;
    do {
      actual = r.pick([2, 4, 5, 6, 8, 10, 12, 15, 20, 25, 40, 50]);
      mag = r.pick([400, 500, 800, 1000, 1500, 2000, 2500, 3000, 5000]);
      imageMm = (actual * mag) / 1000;
    } while (!Number.isInteger(imageMm * 2) || imageMm < 2 || imageMm > 120);
    const { answer, distractors } = numericOptions(r, {
      correct: actual,
      wrong: [actual * 10, actual / 10, actual * 1000, actual / 1000],
      format: (x) => q$(x, UM),
    });
    return {
      stem: tex`In a photomicrograph taken at a magnification of $${mag}\times$, a cell measures $${num(imageMm)}\,\mathrm{mm}$. The actual size of the cell is:`,
      answer,
      distractors,
      explanation: tex`Actual size $= \dfrac{\text{image size}}{\text{magnification}} = \dfrac{${num(imageMm)}\,\mathrm{mm}}{${mag}} = \dfrac{${num(imageMm * 1000)}\,\mu\mathrm{m}}{${mag}} = ${num(actual)}\,\mu\mathrm{m}$ (since $1\,\mathrm{mm} = 1000\,\mu\mathrm{m}$).`,
    };
  }),

  b.dynamic('surface-area-volume', { difficulty: 2, tags: ['cell theory'] }, (r) => {
    if (r.chance(0.5)) {
      const side = r.pick([1, 2, 4, 5, 8, 10, 16, 20, 25]);
      const ratio = 6 / side;
      const { answer, distractors } = numericOptions(r, {
        correct: ratio,
        wrong: [1 / side, 3 / side, 2 / side, 6 * side],
        format: (x) => tex`$${num(x)}\,\mu\mathrm{m}^{-1}$`,
      });
      return {
        stem: tex`A cube-shaped cell has sides of $${side}\,\mu\mathrm{m}$. Its surface-area-to-volume ratio is:`,
        answer,
        distractors,
        explanation: tex`For a cube of side $L$: $\dfrac{\text{SA}}{V} = \dfrac{6L^2}{L^3} = \dfrac{6}{L} = \dfrac{6}{${side}} = ${num(ratio)}\,\mu\mathrm{m}^{-1}$.`,
      };
    }
    const small = r.pick([1, 2, 3, 4, 5]);
    const k = r.int(2, 6);
    const large = small * k;
    const answer = `${k} times`;
    return {
      stem: tex`Two cube-shaped cells have sides of $${small}\,\mu\mathrm{m}$ and $${large}\,\mu\mathrm{m}$. The surface-area-to-volume ratio of the smaller cell is how many times that of the larger cell?`,
      answer,
      distractors: pickDistractors(answer, [k * k, k * k * k, 6 * k, 2 * k].map((v) => `${v} times`)),
      explanation: tex`For a cube, $\dfrac{\text{SA}}{V} = \dfrac{6}{L}$. Ratio $= \dfrac{6/${small}}{6/${large}} = \dfrac{${large}}{${small}} = ${k}$. Smaller cells have a larger SA:V ratio, which is why cells stay small.`,
    };
  }),

  b.dynamic('sodium-potassium-pump', { difficulty: 2, tags: ['membranes'] }, (r) => {
    if (r.chance(0.5)) {
      const n = r.int(2, 40);
      const answer = `${3 * n} Na⁺ out and ${2 * n} K⁺ in`;
      return {
        stem: `The sodium-potassium pump hydrolyses one ATP molecule per cycle. If the pumps in a region of membrane hydrolyse ${n} ATP molecules, the ions moved are:`,
        answer,
        distractors: [
          `${2 * n} Na⁺ out and ${3 * n} K⁺ in`,
          `${3 * n} Na⁺ in and ${2 * n} K⁺ out`,
          `${n} Na⁺ out and ${n} K⁺ in`,
        ],
        explanation: `Each ATP drives 3 Na⁺ out of the cell and 2 K⁺ into it. For ${n} ATP: 3 × ${n} = ${3 * n} Na⁺ out and 2 × ${n} = ${2 * n} K⁺ in.`,
      };
    }
    const atp = r.int(3, 40);
    const k = 2 * atp;
    const na = 3 * atp;
    const { answer, distractors } = numericOptions(r, {
      correct: na,
      wrong: [k, atp, 2 * k, 2 * na],
      format: (x) => `${num(x)} Na⁺ ions`,
    });
    return {
      stem: `While taking ${k} K⁺ ions into a cell, the sodium-potassium pump expels:`,
      answer,
      distractors,
      explanation: `The pump exchanges 3 Na⁺ (out) for 2 K⁺ (in) per ATP. Na⁺ expelled = ${k} × 3/2 = ${na}, using ${atp} ATP.`,
    };
  }),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    // cell theory and techniques
    {
      id: 'not-a-cell-theory-postulate', d: 1, o: 'past-paper', t: ['cell theory'],
      q: 'Which of the following is NOT a postulate of the modern cell theory?',
      a: 'Cells can arise spontaneously from non-living matter',
      x: [
        'All living organisms are composed of one or more cells',
        'The cell is the basic unit of structure and function of life',
        'New cells arise only from pre-existing cells',
      ],
      e: 'Spontaneous generation was disproved by Pasteur; Virchow (1855) added that all cells come from pre-existing cells. The other three are postulates of the cell theory.',
    },
    {
      id: 'viruses-exception', d: 1, t: ['cell theory'],
      q: 'Viruses are regarded as an exception to the cell theory because they:',
      a: 'have no cellular structure and reproduce only inside host cells',
      x: [
        'contain both DNA and RNA in every particle',
        'possess 70S ribosomes for protein synthesis',
        'reproduce independently by binary fission',
      ],
      e: 'A virus is acellular (nucleic acid in a protein coat) and multiplies only inside a living host cell. A virus has either DNA or RNA, has no ribosomes and cannot reproduce on its own.',
    },
    {
      id: 'light-microscope-resolution', d: 2, o: 'past-paper', t: ['cell theory'],
      q: 'The limit of resolution of a good light microscope is about:',
      a: tex`$0.2\,\mu\mathrm{m}$`,
      x: [tex`$0.1\,\mathrm{mm}$`, tex`$0.2\,\mathrm{nm}$`, tex`$20\,\mu\mathrm{m}$`],
      e: tex`Resolution is limited by the wavelength of visible light to about $0.2\,\mu\mathrm{m}$. The unaided eye resolves about $0.1\,\mathrm{mm}$; electron microscopes resolve down to the nanometre range.`,
    },
    {
      id: 'differential-centrifugation', d: 2, t: ['organelles'],
      q: 'During cell fractionation by differential centrifugation, the first pellet (at the lowest speed) consists mainly of:',
      a: 'nuclei',
      x: ['mitochondria', 'ribosomes', 'fragments of ER (microsomes)'],
      e: 'Larger, denser components sediment first: nuclei at low speed, then mitochondria (and chloroplasts) at higher speed, and microsomes and ribosomes only at very high speeds.',
    },
    // organelles
    {
      id: 'ribosome-composition', d: 1, t: ['organelles'],
      q: 'Ribosomes are chemically composed of:',
      a: 'rRNA and proteins',
      x: ['DNA and proteins', 'phospholipids and proteins', 'mRNA and carbohydrates'],
      e: 'Each ribosome is a non-membranous particle of ribosomal RNA (rRNA) combined with proteins.',
    },
    {
      id: 'nuclear-envelope', d: 1, t: ['organelles'],
      q: 'The nuclear envelope of a eukaryotic cell is:',
      a: 'a double membrane perforated by nuclear pores',
      x: ['a single membrane without any pores', 'a double membrane without any pores', 'a rigid layer of cellulose'],
      e: 'The nucleus is bounded by two membranes; nuclear pores allow mRNA, ribosomal subunits and proteins to pass between nucleus and cytoplasm.',
    },
    {
      id: 'tay-sachs-lysosome', d: 2, o: 'past-paper', t: ['organelles'],
      q: 'Tay-Sachs disease, in which lipids accumulate in nerve cells, results from the absence of an enzyme normally found in:',
      a: 'lysosomes',
      x: ['peroxisomes', 'mitochondria', 'ribosomes'],
      e: 'Tay-Sachs is a lysosomal storage disease: a missing lysosomal enzyme leaves a lipid undigested, so it builds up in brain cells.',
    },
    {
      id: 'glyoxysomes', d: 2, t: ['organelles'],
      q: 'In germinating fatty seeds, the glyoxylate cycle that helps convert stored fat into carbohydrate occurs in:',
      a: 'glyoxysomes',
      x: ['lysosomes', 'chromoplasts', 'dictyosomes'],
      e: 'Glyoxysomes are specialised peroxisomes of fat-storing seeds; their enzymes break fatty acids down and run the glyoxylate cycle, providing material for sugar synthesis.',
    },
    {
      id: 'granum', d: 1, t: ['organelles'],
      q: 'A stack of thylakoids inside a chloroplast is called a:',
      a: 'granum',
      x: ['crista', 'stroma', 'cisterna'],
      e: 'Thylakoids are stacked into grana, where the light reactions occur. Cristae are folds of the inner mitochondrial membrane; the stroma is the chloroplast matrix.',
    },
    {
      id: 'leucoplasts', d: 1, t: ['organelles'],
      q: 'Colourless plastids that store starch, oils or proteins are called:',
      a: 'leucoplasts',
      x: ['chromoplasts', 'chloroplasts', 'glyoxysomes'],
      e: 'Leucoplasts (e.g. starch-storing amyloplasts in potato) lack pigment. Chromoplasts contain carotenoids and chloroplasts contain chlorophyll.',
    },
    {
      id: 'dictyosomes', d: 1, o: 'past-paper', t: ['organelles'],
      q: 'In plant cells, the units of the Golgi apparatus are commonly called:',
      a: 'dictyosomes',
      x: ['mesosomes', 'polysomes', 'glyoxysomes'],
      e: 'Plant Golgi stacks are called dictyosomes. Mesosomes are infoldings described in the bacterial plasma membrane; polysomes are groups of ribosomes on one mRNA; glyoxysomes are microbodies of fatty seeds.',
    },
    {
      id: 'smooth-er-detoxification', d: 1, o: 'past-paper', t: ['organelles'],
      q: 'Detoxification of drugs and poisons in liver cells is mainly a function of the:',
      a: 'smooth endoplasmic reticulum',
      x: ['rough endoplasmic reticulum', 'Golgi apparatus', 'nucleolus'],
      e: 'Smooth ER (no ribosomes) synthesises lipids and steroids and, in liver cells, carries enzymes that detoxify drugs and poisons. Rough ER is mainly for protein synthesis.',
    },
    {
      id: 'centriole-structure', d: 2, o: 'past-paper', t: ['organelles'],
      q: 'Each centriole is a short cylinder made of:',
      a: 'nine triplets of microtubules',
      x: [
        'nine doublets of microtubules around two central singlets',
        'nine doublets of microtubules with no central tubules',
        'nine triplets of actin microfilaments',
      ],
      e: 'A centriole has a 9 × 3 arrangement of microtubules with no central pair. The 9 + 2 pattern (nine doublets plus two singlets) is the axoneme of cilia and flagella.',
    },
    {
      id: 'microfilament-protein', d: 1, t: ['organelles'],
      q: 'Microfilaments of the cytoskeleton are made of the protein:',
      a: 'actin',
      x: ['tubulin', 'keratin', 'collagen'],
      e: 'Microfilaments are actin polymers. Microtubules are made of tubulin; keratin forms intermediate filaments in epithelial cells; collagen is extracellular.',
    },
    {
      id: 'chromatin-composition', d: 1, t: ['organelles'],
      q: 'Chromatin in the nucleus consists mainly of:',
      a: 'DNA and histone proteins',
      x: ['RNA and phospholipids', 'DNA and cellulose', 'rRNA and tubulin'],
      e: 'Chromatin is DNA wound around histone proteins (forming nucleosomes); it condenses into chromosomes during division.',
    },
    {
      id: 'tonoplast', d: 1, o: 'past-paper', t: ['organelles', 'membranes'],
      q: 'The membrane surrounding the central vacuole of a plant cell is called the:',
      a: 'tonoplast',
      x: ['plasmalemma', 'middle lamella', 'nuclear envelope'],
      e: 'The vacuolar membrane is the tonoplast. The plasmalemma is the plasma membrane; the middle lamella cements neighbouring cell walls.',
    },
    {
      id: 'middle-lamella', d: 2, o: 'past-paper', t: ['organelles'],
      q: 'The middle lamella between adjacent plant cells is composed mainly of:',
      a: 'calcium and magnesium pectates',
      x: ['cellulose microfibrils', 'lignin and suberin', 'chitin'],
      e: 'The middle lamella is the first layer formed and cements cells together with calcium and magnesium pectates. Cellulose forms the primary wall; lignin strengthens the secondary wall.',
    },
    {
      id: 'fungal-cell-wall', d: 1, t: ['organelles'],
      q: 'The cell wall of most fungi is made mainly of:',
      a: 'chitin',
      x: ['cellulose', 'peptidoglycan', 'calcium pectate'],
      e: 'Fungal walls contain chitin, a nitrogen-containing polysaccharide. Cellulose is in plant walls and peptidoglycan in bacterial walls.',
    },
    // membranes
    {
      id: 'cholesterol-fluidity', d: 2, t: ['membranes'],
      q: 'In animal cell membranes, the lipid that helps keep membrane fluidity stable over a range of temperatures is:',
      a: 'cholesterol',
      x: ['triglyceride', 'wax', 'testosterone'],
      e: 'Cholesterol sits between phospholipids, restraining their movement when warm and preventing tight packing when cold, so fluidity stays moderate.',
    },
    {
      id: 'cell-recognition', d: 2, t: ['membranes'],
      q: 'Recognition of one cell by another at the plasma membrane is mainly due to:',
      a: 'glycoproteins and glycolipids on the outer surface',
      x: ['phospholipid tails inside the bilayer', 'cholesterol between the phospholipids', 'microtubules beneath the membrane'],
      e: 'The carbohydrate chains of glycoproteins and glycolipids (the glycocalyx) act as identification markers, e.g. blood group antigens.',
    },
    {
      id: 'pinocytosis', d: 1, o: 'past-paper', t: ['membranes'],
      q: 'The uptake of fluid droplets by the plasma membrane in small vesicles ("cell drinking") is called:',
      a: 'pinocytosis',
      x: ['phagocytosis', 'exocytosis', 'plasmolysis'],
      e: 'Pinocytosis is endocytosis of liquid; phagocytosis ("cell eating") takes in solid particles; exocytosis releases materials from the cell.',
    },
    {
      id: 'rbc-in-water', d: 1, t: ['membranes'],
      q: 'A red blood cell placed in distilled water will:',
      a: 'swell and burst as water enters by osmosis',
      x: ['shrink as water leaves by osmosis', 'remain the same size', 'become plasmolysed'],
      e: 'Distilled water is hypotonic to the cell, so water enters by osmosis; without a cell wall the cell bursts (haemolysis). Plasmolysis happens only in walled cells in hypertonic solutions.',
    },
    // prokaryotic and eukaryotic cells
    {
      id: 'common-structure', d: 1, o: 'past-paper', t: ['prokaryotic and eukaryotic cells'],
      q: 'Which of the following structures is present in both prokaryotic and eukaryotic cells?',
      a: 'Ribosomes',
      x: ['Mitochondria', 'Nuclear envelope', 'Golgi apparatus'],
      e: 'All cells need ribosomes to make proteins (70S in prokaryotes, 80S in eukaryotic cytoplasm). Prokaryotes lack membrane-bound organelles and a nuclear envelope.',
    },
    {
      id: 'bacterial-wall', d: 1, t: ['prokaryotic and eukaryotic cells'],
      q: 'The cell wall of bacteria is composed mainly of:',
      a: 'peptidoglycan (murein)',
      x: ['cellulose', 'chitin', 'calcium pectate'],
      e: 'Bacterial walls are made of peptidoglycan, polysaccharide chains cross-linked by short peptides.',
    },
    {
      id: 'cyanobacterium-vs-alga', d: 3, t: ['prokaryotic and eukaryotic cells'],
      q: 'Which feature would distinguish a cyanobacterium from a unicellular green alga such as Chlamydomonas?',
      a: 'Absence of a nuclear envelope and of chloroplasts',
      x: ['Presence of chlorophyll a', 'Release of oxygen in photosynthesis', 'Presence of ribosomes'],
      e: 'Both organisms contain chlorophyll a, release oxygen and have ribosomes. Only the cyanobacterium, being prokaryotic, lacks a nucleus and membrane-bound chloroplasts.',
    },
    {
      id: 'endosymbiosis-evidence', d: 3, t: ['prokaryotic and eukaryotic cells', 'organelles'],
      q: 'Which observation most strongly supports the idea that mitochondria evolved from free-living prokaryotes?',
      a: 'They have circular DNA and bacteria-like ribosomes',
      x: [
        'They lie in the cytoplasm of eukaryotic cells',
        'They are more numerous in active cells',
        'All their proteins are coded by nuclear genes',
      ],
      e: 'Their own circular DNA, bacteria-like ribosomes, double membrane and division by fission resemble bacteria. Location and number say nothing about origin, and many (not all) mitochondrial proteins are coded in the nucleus.',
    },
    {
      id: 'secretory-pathway', d: 3, t: ['organelles'],
      q: 'The correct route of a protein that is made for secretion from a cell is:',
      a: 'rough ER → Golgi apparatus → secretory vesicle → plasma membrane',
      x: [
        'Golgi apparatus → rough ER → secretory vesicle → plasma membrane',
        'rough ER → lysosome → Golgi apparatus → plasma membrane',
        'smooth ER → nucleus → Golgi apparatus → plasma membrane',
      ],
      e: 'The protein is made by ribosomes on the rough ER and enters its lumen, moves in transport vesicles to the Golgi for modification and packaging, and leaves in secretory vesicles that fuse with the plasma membrane (exocytosis).',
    },
  ]),
]);
