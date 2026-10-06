/**
 * Biology (FSc XII): Homeostasis.
 *
 * Sub-topics: osmoregulation, excretion, kidney, thermoregulation.
 *
 * Conceptual items cover osmoconformers and osmoregulators, water balance in
 * freshwater, marine and cartilaginous fishes, plant adaptations, nitrogenous
 * wastes and the animals that excrete them, excretory organs of invertebrates,
 * the nephron and its hormones, kidney disorders and body-temperature control.
 *
 * Computational items: volume of glomerular filtrate from the GFR, percentage of
 * filtrate reabsorbed, and net filtration pressure in the glomerulus.
 */
import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, statementQuestion, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Exact short decimal for math mode (up to two decimal places, no rounding surprises). */
const dec = (x: number): string => num(x, { dp: 2 });

/** A pool of true/false statements, each with its own one-line reason. */
interface ReasonedStatement {
  text: string;
  reason: string;
}

/**
 * "Which statement is correct / incorrect?" built with `statementQuestion`, then given an
 * explanation that comments on every option actually displayed.
 */
function reasonedStatementQuestion(
  r: Rng,
  stem: string,
  negativeStem: string,
  truths: readonly ReasonedStatement[],
  falsehoods: readonly ReasonedStatement[],
): AuthoredQuestion {
  const all = [...truths, ...falsehoods];
  const reasonOf = (text: string): string => {
    const hit = all.find((s) => s.text === text);
    if (!hit) throw new Error(`homeostasis: no reason recorded for "${text}"`);
    return hit.reason;
  };
  const q = statementQuestion(r, {
    stem,
    negativeStem,
    truths: truths.map((s) => s.text),
    falsehoods: falsehoods.map((s) => s.text),
    explain: () => '',
  });
  const isTrue = (text: string): boolean => truths.some((s) => s.text === text);
  const lines = [q.answer, ...q.distractors].map(
    (text) => `**${isTrue(text) ? 'True' : 'False'}:** ${text} ${reasonOf(text)}`,
  );
  return { ...q, explanation: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

type Waste = 'ammonia' | 'urea' | 'uric acid';

/** Organisms whose principal nitrogenous waste is beyond dispute at FSc level (Amoeba is a protist). */
const EXCRETORS: Readonly<Record<Waste, readonly string[]>> = {
  ammonia: ['a bony fish such as rohu (Labeo)', 'the tadpole of a frog', 'Hydra', 'Amoeba'],
  urea: ['man', 'an adult frog', 'a rabbit', 'a shark', 'a cow'],
  'uric acid': ['a pigeon', 'a lizard', 'a snake', 'a cockroach', 'a land snail'],
};

const WASTE_TERM: Readonly<Record<Waste, string>> = {
  ammonia: 'ammonotelic',
  urea: 'ureotelic',
  'uric acid': 'uricotelic',
};

const WASTE_NOTE: Readonly<Record<Waste, string>> = {
  ammonia:
    'Ammonia is highly toxic and very soluble, so it is excreted by aquatic organisms that have plenty of water to dilute and wash it away (ammonotelic).',
  urea: 'Urea is less toxic than ammonia and needs moderate water; mammals, adult amphibians and cartilaginous fishes are ureotelic.',
  'uric acid':
    'Uric acid is almost insoluble and least toxic, so it is excreted as a paste with very little water by birds, reptiles, insects and land snails (uricotelic).',
};

const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const KIDNEY_TRUE: readonly ReasonedStatement[] = [
  { text: 'Each human kidney contains about one million nephrons.', reason: 'A human kidney has roughly $10^6$ nephrons.' },
  {
    text: 'Glomeruli and Bowman’s capsules lie in the renal cortex.',
    reason: 'The renal corpuscles are cortical; the loops of Henle and collecting ducts extend into the medulla.',
  },
  {
    text: 'Glucose in the filtrate is normally reabsorbed completely in the proximal convoluted tubule.',
    reason: 'At normal blood glucose levels the PCT reabsorbs all filtered glucose by active transport.',
  },
  {
    text: 'The loop of Henle builds up a high salt concentration in the medulla by a countercurrent mechanism.',
    reason: 'This medullary gradient lets the collecting ducts produce concentrated (hypertonic) urine.',
  },
  {
    text: 'Antidiuretic hormone increases the permeability of the collecting ducts to water.',
    reason: 'More water is then reabsorbed and a small volume of concentrated urine is formed.',
  },
  {
    text: 'Ultrafiltration occurs from the glomerulus into Bowman’s capsule.',
    reason: 'Blood pressure in the glomerulus forces water and small solutes into the capsule.',
  },
  {
    text: 'Urine flows from each kidney to the urinary bladder through a ureter.',
    reason: 'The ureters drain the renal pelvis into the bladder.',
  },
];

const KIDNEY_FALSE: readonly ReasonedStatement[] = [
  {
    text: 'Plasma proteins are normally filtered freely into Bowman’s capsule.',
    reason: 'Plasma proteins are too large to cross the filtration membrane, so the filtrate is almost protein-free.',
  },
  { text: 'Urea is synthesised in the kidneys.', reason: 'Urea is made in the liver by the ornithine cycle; the kidneys only excrete it.' },
  {
    text: 'Aldosterone decreases the reabsorption of sodium ions in the kidney.',
    reason: 'Aldosterone increases $\\mathrm{Na^+}$ reabsorption in the distal tubule and collecting duct.',
  },
  {
    text: 'The ascending limb of the loop of Henle is freely permeable to water.',
    reason: 'The ascending limb is impermeable to water; it pumps out salt, which builds the medullary gradient.',
  },
  {
    text: 'The urethra carries urine from the kidneys to the urinary bladder.',
    reason: 'The ureters do this; the urethra carries urine from the bladder to the outside.',
  },
  {
    text: 'The efferent arteriole carries blood into the glomerulus.',
    reason: 'The afferent arteriole brings blood in; the efferent arteriole carries it away.',
  },
  {
    text: 'Antidiuretic hormone is secreted by the adrenal cortex.',
    reason: 'ADH is made in the hypothalamus and released from the posterior pituitary.',
  },
];

const THERMO_TRUE: readonly ReasonedStatement[] = [
  { text: 'The hypothalamus acts as the thermostat of the body.', reason: 'It compares body temperature with a set point and triggers corrections.' },
  {
    text: 'Vasoconstriction of skin arterioles reduces heat loss in cold surroundings.',
    reason: 'Less warm blood reaches the skin surface, so less heat is radiated away.',
  },
  { text: 'Evaporation of sweat cools the surface of the skin.', reason: 'Evaporating water absorbs latent heat from the skin.' },
  { text: 'Brown fat produces heat without shivering.', reason: 'Its mitochondria release energy as heat (non-shivering thermogenesis).' },
  { text: 'Birds and mammals are endotherms.', reason: 'They generate most of their body heat by their own metabolism.' },
  {
    text: 'Shivering generates heat by rapid involuntary contractions of skeletal muscles.',
    reason: 'The contractions release heat while doing little external work.',
  },
];

const THERMO_FALSE: readonly ReasonedStatement[] = [
  {
    text: 'Vasodilation of skin arterioles conserves heat in cold surroundings.',
    reason: 'Vasodilation brings more blood to the skin and increases heat loss; it is a response to heat.',
  },
  { text: 'Amphibians and reptiles are endotherms.', reason: 'They are ectotherms, gaining heat mainly from their surroundings.' },
  {
    text: 'Sweating increases when body temperature falls below the set point.',
    reason: 'Sweating increases when the body is too hot, not too cold.',
  },
  { text: 'The cerebellum is the main thermoregulatory centre of the body.', reason: 'The hypothalamus, not the cerebellum, regulates temperature.' },
  { text: 'Pyrogens lower the set point of the hypothalamus, causing fever.', reason: 'Pyrogens raise the set point; the body then heats itself up to it.' },
  {
    text: 'Raising the body hairs in the cold reduces the insulating layer of air.',
    reason: 'Erect hairs (or fluffed feathers) trap a thicker layer of insulating air.',
  },
];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('biology', 'homeostasis', (b) => [
  // ---------------- Excretion: nitrogenous wastes (dynamic) ----------------
  b.dynamic('waste-by-animal', { difficulty: 1, origin: 'past-paper', tags: ['excretion'] }, (r) => {
    const wastes: Waste[] = ['ammonia', 'urea', 'uric acid'];
    const waste = r.pick(wastes);
    if (r.chance(0.5)) {
      // Given an animal, name its main nitrogenous waste.
      const animal = r.pick(EXCRETORS[waste]);
      const distractors = wastes.filter((w) => w !== waste) as string[];
      distractors.push('creatinine');
      return {
        stem: `The main nitrogenous waste excreted by ${animal} is:`,
        answer: waste,
        distractors,
        explanation: `${WASTE_NOTE[waste]} Creatinine is a minor waste formed from creatine in muscles; it is not the main nitrogenous waste of any of these organisms.`,
      };
    }
    // Given a category, pick the animal that belongs to it.
    const answer = r.pick(EXCRETORS[waste]);
    const others = wastes.filter((w) => w !== waste);
    const candidates = r.shuffle([...EXCRETORS[others[0] as Waste], ...EXCRETORS[others[1] as Waste]]);
    const distractors = pickDistractors(answer, candidates);
    const term = WASTE_TERM[waste];
    const reasons = distractors
      .map((d) => {
        const w = others.find((o) => EXCRETORS[o].includes(d)) as Waste;
        return `${capFirst(d)} is ${WASTE_TERM[w]}.`;
      })
      .join(' ');
    return {
      stem: `Which of the following organisms is ${term} (excretes mainly ${waste})?`,
      answer: capFirst(answer),
      distractors: distractors.map(capFirst),
      explanation: `${WASTE_NOTE[waste]} ${reasons}`,
    };
  }),

  // ---------------- Kidney: statements (dynamic) ----------------
  b.dynamic('kidney-statements', { difficulty: 2, tags: ['kidney'] }, (r) =>
    reasonedStatementQuestion(
      r,
      'Which of the following statements about the human kidney is correct?',
      'Which of the following statements about the human kidney is NOT correct?',
      KIDNEY_TRUE,
      KIDNEY_FALSE,
    ),
  ),

  // ---------------- Thermoregulation: statements (dynamic) ----------------
  b.dynamic('thermoregulation-statements', { difficulty: 2, tags: ['thermoregulation'] }, (r) =>
    reasonedStatementQuestion(
      r,
      'Which of the following statements about thermoregulation is correct?',
      'Which of the following statements about thermoregulation is NOT correct?',
      THERMO_TRUE,
      THERMO_FALSE,
    ),
  ),

  // ---------------- Kidney: filtrate volume from GFR (dynamic) ----------------
  b.dynamic('filtrate-from-gfr', { difficulty: 2, tags: ['kidney'] }, (r) => {
    const gfr = r.multiple(100, 140, 5); // mL per minute
    const hours = r.pick([2, 3, 4, 6, 8, 10, 12, 24]);
    const litres = (gfr * 60 * hours) / 1000;
    const { answer, distractors } = numericOptions(r, {
      correct: litres,
      wrong: [
        (gfr * hours) / 1000, // forgot to convert minutes to hours
        (gfr * 60) / 1000, // gave the volume for one hour only
        (gfr * 60 * hours) / 100, // mL to L slip (divided by 100)
        (gfr * 3600 * hours) / 1000, // multiplied by 3600 as if GFR were per second
      ],
      format: (v) => `$${num(v, { dp: 3 })}\\,\\mathrm{L}$`,
    });
    return {
      stem: tex`The glomerular filtration rate (GFR) of a person is $${gfr}\,\mathrm{mL\,min^{-1}}$. The volume of glomerular filtrate formed in $${hours}$ hours is:`,
      answer,
      distractors,
      explanation: tex`Volume $=$ GFR $\times$ time $= ${gfr}\,\mathrm{mL\,min^{-1}} \times (${hours} \times 60)\,\mathrm{min} = ${gfr * 60 * hours}\,\mathrm{mL} = ${dec(litres)}\,\mathrm{L}$. (A normal GFR of about $125\,\mathrm{mL\,min^{-1}}$ gives about $180\,\mathrm{L}$ of filtrate per day.)`,
    };
  }),

  // ---------------- Kidney: percentage reabsorbed (dynamic) ----------------
  b.dynamic('percent-reabsorbed', { difficulty: 2, tags: ['kidney'] }, (r) => {
    let filtrate = 180;
    let urine = 1.8;
    for (let tries = 0; tries < 200; tries++) {
      filtrate = r.pick([120, 125, 150, 160, 175, 180, 200]);
      urine = r.pick([1.2, 1.25, 1.5, 1.6, 1.75, 1.8, 2, 2.4, 2.5, 3]);
      const excreted = (100 * urine) / filtrate;
      if (Math.abs(excreted * 100 - Math.round(excreted * 100)) < 1e-9) break;
    }
    const excreted = Number(((100 * urine) / filtrate).toFixed(2));
    const reabsorbed = Number((100 - excreted).toFixed(2));
    const { answer, distractors } = numericOptions(r, {
      correct: reabsorbed,
      wrong: [
        excreted, // gave the percentage excreted
        100 - urine, // subtracted litres from 100
        Number((100 - 10 * excreted).toFixed(2)), // decimal slip
        Number((100 - excreted / 10).toFixed(2)),
      ],
      format: (v) => `$${dec(v)}\\%$`,
    });
    return {
      stem: tex`The kidneys of a person form $${filtrate}\,\mathrm{L}$ of glomerular filtrate in a day, and $${dec(urine)}\,\mathrm{L}$ of urine is passed. The percentage of filtrate reabsorbed is:`,
      answer,
      distractors,
      explanation: tex`Reabsorbed $= \dfrac{\text{filtrate} - \text{urine}}{\text{filtrate}} \times 100 = \dfrac{${filtrate} - ${dec(urine)}}{${filtrate}} \times 100 = ${dec(reabsorbed)}\%$. Only $${dec(excreted)}\%$ leaves as urine.`,
    };
  }),

  // ---------------- Kidney: net filtration pressure (dynamic) ----------------
  b.dynamic('net-filtration-pressure', { difficulty: 3, tags: ['kidney'] }, (r) => {
    let ghp = 55;
    let chp = 15;
    let cop = 30;
    for (let tries = 0; tries < 200; tries++) {
      ghp = r.int(50, 64);
      chp = r.int(10, 18);
      cop = r.int(24, 32);
      const nfp = ghp - chp - cop;
      if (nfp >= 4 && nfp <= 20 && chp !== cop) break;
    }
    const nfp = ghp - chp - cop;
    const { answer, distractors } = numericOptions(r, {
      correct: nfp,
      wrong: [
        ghp - chp + cop, // added the osmotic pressure
        ghp + chp - cop, // added the capsular pressure
        ghp - cop, // ignored capsular pressure
        ghp - chp, // ignored colloid osmotic pressure
      ],
      format: (v) => `$${v}\\,\\mathrm{mmHg}$`,
    });
    return {
      stem: tex`In a glomerulus, the blood hydrostatic pressure is $${ghp}\,\mathrm{mmHg}$, the hydrostatic pressure of fluid in Bowman’s capsule is $${chp}\,\mathrm{mmHg}$ and the colloid osmotic pressure of the blood is $${cop}\,\mathrm{mmHg}$. The net filtration pressure is:`,
      answer,
      distractors,
      explanation: tex`Only the glomerular blood pressure favours filtration; both other pressures oppose it. Net filtration pressure $= ${ghp} - (${chp} + ${cop}) = ${nfp}\,\mathrm{mmHg}$.`,
    };
  }),

  // ---------------- Fixed questions ----------------
  ...b.mcqs([
    // Osmoregulation
    {
      id: 'osmoconformers',
      d: 1,
      t: ['osmoregulation'],
      q: 'Most marine invertebrates, whose body fluids are isotonic with sea water, are described as:',
      a: 'osmoconformers',
      x: ['osmoregulators', 'endotherms', 'uricotelic animals'],
      e: 'Osmoconformers do not regulate their internal osmolarity; it matches that of the surrounding sea water. Osmoregulators (e.g. bony fishes) actively keep it different from the medium.',
    },
    {
      id: 'freshwater-fish',
      d: 1,
      t: ['osmoregulation'],
      q: 'A freshwater bony fish is hypertonic to its surroundings. To keep its water balance, it:',
      a: 'excretes large volumes of dilute urine',
      x: ['drinks large amounts of water', 'excretes small volumes of concentrated urine', 'actively excretes salts through its gills'],
      e: 'Water constantly enters the fish by osmosis, so it drinks very little, produces copious dilute urine and actively absorbs salts through its gills. Excreting salts through the gills is what marine bony fishes do.',
    },
    {
      id: 'marine-bony-fish',
      d: 2,
      t: ['osmoregulation'],
      q: 'A marine bony fish tends to lose water to the sea by osmosis. It makes up for this by:',
      a: 'drinking sea water and excreting excess salts through its gills',
      x: [
        'producing large volumes of dilute urine',
        'actively absorbing salts from the sea through its gills',
        'gaining water from the sea by osmosis through its gills',
      ],
      e: 'Its body fluids are hypotonic to sea water, so it loses water. It drinks sea water, actively secretes the extra $\\mathrm{Na^+}$ and $\\mathrm{Cl^-}$ through its gills and passes a small volume of urine.',
    },
    {
      id: 'cartilaginous-fish-urea',
      d: 2,
      t: ['osmoregulation'],
      q: 'Sharks and rays keep their body fluids slightly hyperosmotic to sea water mainly by retaining:',
      a: 'urea and trimethylamine oxide (TMAO)',
      x: ['ammonia and uric acid', 'sodium and chloride ions', 'glucose and amino acids'],
      e: 'Cartilaginous fishes hold high concentrations of urea (with TMAO to protect proteins from it) in their blood, so water tends to enter rather than leave. Their salt levels are kept below those of sea water; excess salt is removed by the rectal gland.',
    },
    {
      id: 'xerophytes',
      d: 1,
      t: ['osmoregulation'],
      q: 'Plants adapted to very dry habitats, often with sunken stomata and reduced leaves, are called:',
      a: 'xerophytes',
      x: ['hydrophytes', 'mesophytes', 'epiphytes'],
      e: 'Xerophytes (e.g. cacti) reduce water loss by sunken stomata, thick cuticles and reduced leaves. Hydrophytes live in water and mesophytes in moderately moist soil; epiphytes grow on other plants.',
    },

    // Excretion
    {
      id: 'birds-uric-acid',
      d: 1,
      o: 'past-paper',
      t: ['excretion'],
      q: 'Birds and reptiles conserve water by excreting their nitrogenous waste mainly as:',
      a: 'uric acid',
      x: ['ammonia', 'urea', 'creatinine'],
      e: 'Uric acid is nearly insoluble and relatively non-toxic, so it can be passed as a semi-solid paste with very little water. Ammonia needs the most water and urea a moderate amount.',
    },
    {
      id: 'urea-in-liver',
      d: 1,
      o: 'past-paper',
      t: ['excretion'],
      q: 'In mammals, urea is formed from ammonia and carbon dioxide in the:',
      a: 'liver',
      x: ['kidneys', 'urinary bladder', 'pancreas'],
      e: 'Liver cells deaminate excess amino acids and convert the ammonia, with $\\mathrm{CO_2}$, into urea by the ornithine (urea) cycle. The kidneys only filter urea out of the blood.',
    },
    {
      id: 'malpighian-tubules',
      d: 1,
      o: 'past-paper',
      t: ['excretion'],
      q: 'The main excretory organs of insects such as the cockroach are:',
      a: 'Malpighian tubules',
      x: ['nephridia', 'flame cells', 'green glands'],
      e: 'Malpighian tubules remove wastes from the haemolymph and empty them into the gut, where uric acid is passed with the faeces. Nephridia occur in earthworms, flame cells in planarians and green glands in crustaceans.',
    },
    {
      id: 'flame-cells',
      d: 1,
      t: ['excretion'],
      q: 'Protonephridia ending in flame cells are the excretory structures of:',
      a: 'Planaria',
      x: ['earthworm', 'cockroach', 'Hydra'],
      e: 'Planaria, a flatworm, has a network of protonephridia ending in ciliated flame cells. Earthworms have nephridia, cockroaches have Malpighian tubules and Hydra has no special excretory organ (wastes diffuse out).',
    },

    // Kidney
    {
      id: 'nephron-unit',
      d: 1,
      o: 'past-paper',
      t: ['kidney'],
      q: 'The structural and functional unit of the kidney is the:',
      a: 'nephron',
      x: ['neuron', 'glomerulus', 'renal pyramid'],
      e: 'Each nephron filters blood and forms urine. The glomerulus is only one part of a nephron, a renal pyramid is a region of the medulla, and a neuron is a nerve cell.',
    },
    {
      id: 'adh-target',
      d: 2,
      o: 'past-paper',
      t: ['kidney'],
      q: 'Antidiuretic hormone (ADH) conserves body water by increasing the water permeability of the:',
      a: 'distal tubules and collecting ducts',
      x: ['glomerular capillaries', 'ascending limb of the loop of Henle', 'Bowman’s capsule'],
      e: 'ADH, released from the posterior pituitary when the blood becomes concentrated, makes the distal tubules and collecting ducts more permeable to water, so more water is reabsorbed and the urine becomes concentrated.',
    },
    {
      id: 'aldosterone-source',
      d: 2,
      t: ['kidney'],
      q: 'Aldosterone, which increases the reabsorption of sodium ions in the kidney, is secreted by the:',
      a: 'adrenal cortex',
      x: ['adrenal medulla', 'posterior pituitary', 'thyroid gland'],
      e: 'Aldosterone is a mineralocorticoid from the adrenal cortex. The adrenal medulla secretes adrenaline, and the posterior pituitary releases ADH.',
    },
    {
      id: 'pct-reabsorption',
      d: 2,
      t: ['kidney'],
      q: 'Most of the glucose, amino acids and water of the glomerular filtrate are reabsorbed in the:',
      a: 'proximal convoluted tubule',
      x: ['distal convoluted tubule', 'collecting duct', 'descending limb of the loop of Henle'],
      e: 'The proximal convoluted tubule, lined by cells with microvilli and many mitochondria, reabsorbs all the glucose and amino acids and about two-thirds of the water and salts. The later segments reabsorb smaller amounts and adjust the final composition of the urine.',
    },
    {
      id: 'kidney-stone-type',
      d: 1,
      o: 'past-paper',
      t: ['kidney'],
      q: 'The most common type of kidney stone is made mainly of:',
      a: 'calcium oxalate',
      x: ['calcium carbonate', 'sodium chloride', 'potassium nitrate'],
      e: 'Most renal stones are calcium oxalate, which precipitates when urine is concentrated. Sodium chloride and potassium nitrate are soluble and do not form stones; calcium carbonate stones are rare.',
    },
    {
      id: 'lithotripsy',
      d: 2,
      t: ['kidney'],
      q: 'Lithotripsy treats kidney stones by:',
      a: 'breaking them into small fragments with shock waves',
      x: [
        'dissolving them with strong acids',
        'removing the whole kidney surgically',
        'filtering the blood through a dialysis machine',
      ],
      e: 'In lithotripsy, focused shock waves shatter the stone into fine pieces that pass out with the urine, so open surgery is avoided. Dialysis removes wastes from blood and does not treat stones.',
    },

    // Thermoregulation
    {
      id: 'hypothalamus-thermostat',
      d: 1,
      o: 'past-paper',
      t: ['thermoregulation'],
      q: 'The thermoregulatory centre (thermostat) of the human body is located in the:',
      a: 'hypothalamus',
      x: ['cerebellum', 'medulla oblongata', 'pituitary gland'],
      e: 'The hypothalamus senses blood temperature and starts sweating and vasodilation when it is too high, or shivering and vasoconstriction when it is too low.',
    },
    {
      id: 'ectotherms',
      d: 1,
      t: ['thermoregulation'],
      q: 'Animals such as lizards and frogs, which obtain most of their body heat from the environment, are called:',
      a: 'ectotherms',
      x: ['endotherms', 'homeotherms', 'osmoconformers'],
      e: 'Ectotherms depend on external heat sources, so their body temperature varies with the surroundings. Endotherms (homeotherms) such as birds and mammals produce heat by metabolism and keep a steady temperature.',
    },
    {
      id: 'brown-fat',
      d: 2,
      t: ['thermoregulation'],
      q: 'Non-shivering thermogenesis in newborn babies and hibernating mammals occurs mainly in:',
      a: 'brown adipose tissue',
      x: ['white adipose tissue', 'skeletal muscles', 'red bone marrow'],
      e: 'Brown fat cells are rich in mitochondria whose respiration releases energy as heat instead of making ATP. Heat from skeletal muscles is produced by shivering, which is the other mechanism.',
    },
    {
      id: 'pyrogens-fever',
      d: 3,
      t: ['thermoregulation'],
      q: 'Fever during an infection develops because pyrogens:',
      a: 'raise the set point of the hypothalamic thermostat',
      x: [
        'lower the set point of the hypothalamic thermostat',
        'directly stimulate the sweat glands',
        'stop heat production in skeletal muscles',
      ],
      e: 'Pyrogens (from microbes or white blood cells) reset the hypothalamus to a higher temperature. The body then feels cold, shivers and constricts skin vessels until it reaches the new set point.',
    },
  ]),
]);
