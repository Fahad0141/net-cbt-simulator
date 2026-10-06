/**
 * Biology (FSc XII): Reproduction, Growth and Development.
 *
 * Sub-topics: reproduction in plants and animals, human reproduction, development, ageing.
 *
 * Conceptual items cover the male and female reproductive systems and their hormones,
 * sexually transmitted diseases, double fertilisation, parthenocarpy, vernalisation,
 * phytochrome, oviparity, cleavage, gastrulation, the primary organiser, germ-layer
 * derivatives, apoptosis, teratogens, meristems and cellular ageing.
 *
 * Computational items: gamete counts from gametogenesis, chromosome numbers in the
 * tissues of a flowering plant (n, 2n, 3n) and photoperiodic flowering responses.
 */
import { defineBank } from '@/engine/authoring';
import { numericOptions, pickDistractors, statementQuestion } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** A true or false statement with its one-line reason. */
interface ReasonedStatement {
  text: string;
  reason: string;
}

/**
 * "Which statement is correct / NOT correct?" built with `statementQuestion`, with an
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
    if (!hit) throw new Error(`reproduction-development: no reason recorded for "${text}"`);
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

const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

type GermLayer = 'ectoderm' | 'mesoderm' | 'endoderm';

/** Textbook (FSc) derivatives of the three primary germ layers. */
const GERM_DERIVATIVES: Readonly<Record<GermLayer, readonly string[]>> = {
  ectoderm: ['the epidermis of the skin', 'the brain and spinal cord', 'the lens of the eye', 'the enamel of the teeth', 'hair and nails'],
  mesoderm: ['skeletal muscles', 'the heart', 'the kidneys', 'bones and cartilage', 'blood cells', 'the dermis of the skin'],
  endoderm: [
    'the lining of the alimentary canal',
    'the liver',
    'the pancreas',
    'the epithelial lining of the lungs',
    'the thyroid gland',
  ],
};

const LAYERS: readonly GermLayer[] = ['ectoderm', 'mesoderm', 'endoderm'];

/** Derivatives that take a plural verb ("develop", "are"). */
const PLURAL_DERIVATIVES: ReadonlySet<string> = new Set([
  'the brain and spinal cord',
  'hair and nails',
  'skeletal muscles',
  'the kidneys',
  'bones and cartilage',
  'blood cells',
]);

const layerOf = (structure: string): GermLayer =>
  LAYERS.find((l) => GERM_DERIVATIVES[l].includes(structure)) as GermLayer;

/** Ploidy (multiple of n) of cells in a flowering plant, with a short reason. */
const PLANT_PLOIDY: readonly { name: string; k: 1 | 2 | 3; reason: string }[] = [
  { name: 'an endosperm cell', k: 3, reason: 'The endosperm arises by triple fusion: one male gamete (n) fuses with the two polar nuclei (n + n), giving 3n.' },
  { name: 'the primary endosperm nucleus', k: 3, reason: 'It forms by triple fusion of a male gamete (n) with two polar nuclei (n + n), so it is 3n.' },
  { name: 'the egg cell', k: 1, reason: 'The egg is a cell of the haploid embryo sac (female gametophyte), so it is n.' },
  { name: 'a synergid', k: 1, reason: 'Synergids belong to the haploid embryo sac, so they are n.' },
  { name: 'an antipodal cell', k: 1, reason: 'Antipodal cells belong to the haploid embryo sac, so they are n.' },
  { name: 'a functional megaspore', k: 1, reason: 'The megaspore is formed by meiosis of the megaspore mother cell, so it is n.' },
  { name: 'the secondary nucleus (fused polar nuclei)', k: 2, reason: 'Two haploid polar nuclei fuse to form it, so it is 2n.' },
  { name: 'the zygote', k: 2, reason: 'The zygote forms when a male gamete (n) fuses with the egg (n), so it is 2n.' },
  { name: 'a cell of the nucellus', k: 2, reason: 'The nucellus is tissue of the diploid parent sporophyte, so it is 2n.' },
];

const HUMAN_TRUE: readonly ReasonedStatement[] = [
  {
    text: 'Sertoli cells nourish the developing sperms in the seminiferous tubules.',
    reason: 'Sertoli (nurse) cells support and feed the cells undergoing spermatogenesis.',
  },
  { text: 'FSH stimulates the growth of follicles in the ovary.', reason: 'Follicle-stimulating hormone from the anterior pituitary promotes follicle development.' },
  { text: 'A surge of LH triggers ovulation.', reason: 'The mid-cycle LH surge causes the mature (Graafian) follicle to rupture and release the secondary oocyte.' },
  { text: 'After ovulation the ruptured follicle develops into the corpus luteum.', reason: 'The corpus luteum then secretes progesterone.' },
  {
    text: 'Human chorionic gonadotropin (hCG) maintains the corpus luteum in early pregnancy.',
    reason: 'hCG from the developing embryo (chorion) keeps the corpus luteum secreting progesterone; pregnancy tests detect it.',
  },
  { text: 'Fertilization in humans normally takes place in the oviduct.', reason: 'The secondary oocyte meets sperms in the upper part (ampulla) of the Fallopian tube.' },
  { text: 'A normal human sperm contains 23 chromosomes.', reason: 'Sperms are haploid: 22 autosomes plus an X or a Y chromosome.' },
  { text: 'The blastocyst implants in the endometrium of the uterus.', reason: 'Implantation occurs in the lining of the uterus about a week after fertilization.' },
];

const HUMAN_FALSE: readonly ReasonedStatement[] = [
  {
    text: 'Sperms are produced in the epididymis.',
    reason: 'Sperms are produced in the seminiferous tubules of the testes; the epididymis only stores them while they mature.',
  },
  { text: 'Progesterone is secreted mainly by the anterior pituitary.', reason: 'Progesterone comes from the corpus luteum and, later in pregnancy, the placenta.' },
  {
    text: 'At ovulation, the human ovary releases an ovum that has already completed meiosis II.',
    reason: 'A secondary oocyte arrested in metaphase II is released; it completes meiosis II only when a sperm enters it.',
  },
  {
    text: 'The mitochondria of a sperm are located in its acrosome.',
    reason: 'The acrosome holds enzymes that digest the coverings of the egg; the mitochondria lie in the middle piece and power the tail.',
  },
  { text: 'The prostate gland produces sperms.', reason: 'The prostate adds an alkaline fluid to semen; sperms are made in the testes.' },
  {
    text: 'Each primary oocyte gives rise to four functional ova.',
    reason: 'Unequal divisions give one functional ovum and small polar bodies that degenerate.',
  },
  { text: 'Menstruation is caused by a rise in the level of progesterone.', reason: 'Menstruation follows a fall in progesterone when the corpus luteum degenerates.' },
  {
    text: 'The testes are kept at a temperature slightly higher than core body temperature.',
    reason: 'The scrotum keeps the testes about 2 to 3 °C below core body temperature, which spermatogenesis requires.',
  },
];

const DEV_TRUE: readonly ReasonedStatement[] = [
  {
    text: 'Cleavage increases the number of cells without increasing the overall size of the embryo.',
    reason: 'The blastomeres divide rapidly with no growth phase, so they become smaller and smaller.',
  },
  { text: 'The three primary germ layers are established during gastrulation.', reason: 'Gastrulation rearranges the blastula into ectoderm, mesoderm and endoderm.' },
  { text: 'The neural tube develops from ectoderm.', reason: 'The neural plate of dorsal ectoderm folds to form the neural tube (neurulation).' },
  { text: 'The notochord develops from mesoderm.', reason: 'The notochord is a rod of chordamesoderm that induces the overlying ectoderm to form the neural plate.' },
  {
    text: 'Apoptosis removes the tissue between the developing fingers of the human embryo.',
    reason: 'Programmed cell death sculpts the digits by removing the webbing.',
  },
  { text: 'Skin loses elasticity with ageing.', reason: 'Collagen and elastic fibres of the dermis decline, so the skin wrinkles.' },
  { text: 'Menopause marks the permanent end of menstrual cycles in women.', reason: 'The ovaries stop releasing ova and oestrogen secretion falls.' },
];

const DEV_FALSE: readonly ReasonedStatement[] = [
  { text: 'Cleavage of the hen’s egg is holoblastic.', reason: 'The yolky hen’s egg shows meroblastic (discoidal) cleavage confined to a small disc.' },
  { text: 'The blastula is a solid ball of cells.', reason: 'The solid ball is the morula; the blastula is hollow, enclosing the blastocoel.' },
  { text: 'The archenteron forms during cleavage.', reason: 'The archenteron (primitive gut) forms during gastrulation.' },
  { text: 'The lens of the eye develops from mesoderm.', reason: 'The lens develops from surface ectoderm, induced by the optic vesicle of the brain.' },
  {
    text: 'Apoptosis is cell death in which injured cells swell, burst and cause inflammation.',
    reason: 'That describes necrosis; apoptosis is orderly, programmed cell death without inflammation.',
  },
  { text: 'Basal metabolic rate rises steadily in old age.', reason: 'Basal metabolic rate declines with age.' },
  {
    text: 'Normal human body cells can divide indefinitely in culture.',
    reason: 'They stop after a limited number of divisions (the Hayflick limit) as their telomeres shorten.',
  },
];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('biology', 'reproduction-development', (b) => [
  // ---------------- Human reproduction: gametogenesis counts (dynamic) ----------------
  b.dynamic('gametogenesis-counts', { difficulty: 2, tags: ['human reproduction'] }, (r) => {
    const mode = r.pick(['sperms', 'secondary', 'spermatids', 'ova', 'needed'] as const);
    if (mode === 'needed') {
      const k = r.int(5, 60);
      const sperms = 4 * k;
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        wrong: [2 * k, sperms, 4 * sperms],
        format: (v) => String(v),
      });
      return {
        stem: `How many primary spermatocytes must complete meiosis to produce ${sperms} sperms?`,
        answer,
        distractors,
        explanation: `Each primary spermatocyte gives 2 secondary spermatocytes, then 4 spermatids, and each spermatid becomes one sperm. Primary spermatocytes needed = ${sperms} ÷ 4 = ${k}.`,
      };
    }
    const n = r.int(4, 60);
    if (mode === 'ova') {
      const { answer, distractors } = numericOptions(r, {
        correct: n,
        wrong: [4 * n, 3 * n, 2 * n],
        format: (v) => String(v),
      });
      return {
        stem: `If ${n} primary oocytes complete both meiotic divisions, the number of functional ova formed is:`,
        answer,
        distractors,
        explanation: `Both meiotic divisions in oogenesis are unequal: each primary oocyte gives one large ovum and small polar bodies that degenerate. So ${n} primary oocytes give ${n} ova (4 × ${n} = ${4 * n} would be the count for spermatogenesis).`,
      };
    }
    const spec = {
      sperms: {
        stem: `In spermatogenesis, ${n} primary spermatocytes complete meiosis. The number of sperms formed is:`,
        correct: 4 * n,
        wrong: [n, 2 * n, 8 * n],
        why: `Each primary spermatocyte gives 4 spermatids, which change into 4 sperms. Sperms = 4 × ${n} = ${4 * n}.`,
      },
      secondary: {
        stem: `In spermatogenesis, ${n} primary spermatocytes complete the first meiotic division. The number of secondary spermatocytes formed is:`,
        correct: 2 * n,
        wrong: [n, 4 * n, 8 * n],
        why: `Meiosis I divides each primary spermatocyte into 2 secondary spermatocytes. Secondary spermatocytes = 2 × ${n} = ${2 * n}.`,
      },
      spermatids: {
        stem: `In spermatogenesis, ${n} secondary spermatocytes complete the second meiotic division. The number of spermatids formed is:`,
        correct: 2 * n,
        wrong: [n, 4 * n, 8 * n],
        why: `Meiosis II divides each secondary spermatocyte into 2 spermatids. Spermatids = 2 × ${n} = ${2 * n}.`,
      },
    }[mode];
    const { answer, distractors } = numericOptions(r, {
      correct: spec.correct,
      wrong: spec.wrong,
      format: (v) => String(v),
    });
    return { stem: spec.stem, answer, distractors, explanation: spec.why };
  }),

  // ---------------- Plant reproduction: ploidy of tissues (dynamic) ----------------
  b.dynamic('angiosperm-ploidy', { difficulty: 2, origin: 'past-paper', tags: ['reproduction in plants and animals'] }, (r) => {
    const diploid = r.pick([12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 42, 44, 48]);
    const n = diploid / 2;
    const cell = r.weighted(PLANT_PLOIDY, PLANT_PLOIDY.map((c) => (c.k === 3 ? 2 : 1)));
    const values = [n, 2 * n, 3 * n, 4 * n];
    const correct = cell.k * n;
    return {
      stem: `The leaf cells of a flowering plant have ${diploid} chromosomes. The number of chromosomes in ${cell.name} of this plant is:`,
      answer: String(correct),
      distractors: values.filter((v) => v !== correct).map(String),
      explanation: `Leaf cells are diploid, so 2n = ${diploid} and n = ${n}. ${cell.reason} Chromosomes = ${cell.k === 1 ? 'n' : `${cell.k} × ${n}`} = ${correct}.`,
    };
  }),

  // ---------------- Development: germ-layer derivatives (dynamic) ----------------
  b.dynamic('germ-layer-derivatives', { difficulty: 1, tags: ['development'] }, (r) => {
    if (r.chance(0.5)) {
      const layer = r.pick(LAYERS);
      const structure = r.pick(GERM_DERIVATIVES[layer]);
      const plural = PLURAL_DERIVATIVES.has(structure);
      return {
        stem: `In vertebrate embryos, ${structure} ${plural ? 'develop' : 'develops'} from the:`,
        answer: layer,
        distractors: [...LAYERS.filter((l) => l !== layer), 'trophoblast'],
        explanation: `${capFirst(structure)} ${plural ? 'are' : 'is'} derived from ${layer}. Ectoderm forms the epidermis and nervous system, mesoderm forms muscles, bones, blood, heart and kidneys, and endoderm forms the gut lining and its glands. The trophoblast is not a germ layer; it helps form the placenta.`,
      };
    }
    const layer = r.pick(LAYERS);
    const answer = r.pick(GERM_DERIVATIVES[layer]);
    const others = LAYERS.filter((l) => l !== layer).flatMap((l) => GERM_DERIVATIVES[l]);
    const distractors = pickDistractors(answer, others, r);
    const notes = distractors.map((d) => `${capFirst(d)}: ${layerOf(d)}.`).join(' ');
    return {
      stem: `Which of the following develops from the ${layer} of a vertebrate embryo?`,
      answer: capFirst(answer),
      distractors: distractors.map(capFirst),
      explanation: `${capFirst(answer)}: ${layer}. ${notes}`,
    };
  }),

  // ---------------- Plant reproduction: photoperiodism (dynamic) ----------------
  b.dynamic('photoperiod-flowering', { difficulty: 2, tags: ['reproduction in plants and animals'] }, (r) => {
    const shortDay = r.chance(0.5);
    const c = r.int(10, 15);
    const below = [c - 1, c - 2, c - 3, c - 4];
    const above = [c + 1, c + 2, c + 3, c + 4];
    const fav = shortDay ? below : above;
    const unfav = shortDay ? above : below;
    const negative = r.chance(0.4);
    const answer = r.pick(negative ? unfav : fav);
    const distractors = r.sample(negative ? fav : unfav, 3);
    const kind = shortDay ? 'short-day' : 'long-day';
    const rule = shortDay
      ? `A short-day plant (such as chrysanthemum) flowers only when the day length is shorter than its critical day length, i.e. when it gets a long enough uninterrupted night. Here it flowers below ${c} hours.`
      : `A long-day plant (such as spinach) flowers only when the day length is longer than its critical day length, i.e. when the night is short enough. Here it flowers above ${c} hours.`;
    return {
      stem: `A ${kind} plant has a critical day length of ${c} hours. With an uninterrupted dark period, it will ${negative ? 'NOT ' : ''}flower under a day length of:`,
      answer: `${answer} hours`,
      distractors: distractors.map((d) => `${d} hours`),
      explanation: `${rule} So ${answer} hours ${negative ? 'does not' : 'does'} induce flowering, while ${[...distractors].sort((p, q) => p - q).join(', ')} hours ${negative ? 'do' : 'do not'}.`,
    };
  }),

  // ---------------- Human reproduction: statements (dynamic) ----------------
  b.dynamic('human-reproduction-statements', { difficulty: 2, origin: 'past-paper', tags: ['human reproduction'] }, (r) =>
    reasonedStatementQuestion(
      r,
      'Which of the following statements about human reproduction is correct?',
      'Which of the following statements about human reproduction is NOT correct?',
      HUMAN_TRUE,
      HUMAN_FALSE,
    ),
  ),

  // ---------------- Development and ageing: statements (dynamic) ----------------
  b.dynamic('development-ageing-statements', { difficulty: 3, tags: ['development', 'ageing'] }, (r) =>
    reasonedStatementQuestion(
      r,
      'Which of the following statements about animal development and ageing is correct?',
      'Which of the following statements about animal development and ageing is NOT correct?',
      DEV_TRUE,
      DEV_FALSE,
    ),
  ),

  // ---------------- Fixed questions ----------------
  ...b.mcqs([
    // Human reproduction
    {
      id: 'testosterone-source', d: 1, o: 'past-paper', t: ['human reproduction'],
      q: 'In the human testis, the male sex hormone testosterone is secreted by the:',
      a: 'interstitial (Leydig) cells',
      x: ['Sertoli cells', 'spermatogonia', 'cells of the epididymis'],
      e: 'Interstitial (Leydig) cells lying between the seminiferous tubules secrete testosterone under the influence of LH. Sertoli cells nourish developing sperms, and spermatogonia are the germ cells that divide to form sperms.',
    },
    {
      id: 'sperm-maturation-site', d: 1, t: ['human reproduction'],
      q: 'Sperms leaving the testes are stored and complete their maturation in the:',
      a: 'epididymis',
      x: ['seminal vesicle', 'prostate gland', 'urethra'],
      e: 'The epididymis, a coiled tube on the testis, stores sperms while they become motile and able to fertilise. The seminal vesicles and prostate add secretions to semen; the urethra only conducts it.',
    },
    {
      id: 'fertilization-site', d: 1, o: 'past-paper', t: ['human reproduction'],
      q: 'In humans, fertilization normally takes place in the:',
      a: 'oviduct (Fallopian tube)',
      x: ['uterus', 'ovary', 'cervix'],
      e: 'The released secondary oocyte is fertilised in the upper part (ampulla) of the oviduct. The embryo then travels to the uterus and implants in its wall.',
    },
    {
      id: 'corpus-luteum-hormone', d: 1, o: 'past-paper', t: ['human reproduction'],
      q: 'After ovulation, the corpus luteum mainly secretes:',
      a: 'progesterone',
      x: ['FSH', 'LH', 'prolactin'],
      e: 'The corpus luteum secretes mainly progesterone (with some oestrogen), which keeps the endometrium ready for implantation. FSH, LH and prolactin are anterior pituitary hormones.',
    },
    {
      id: 'syphilis-pathogen', d: 1, t: ['human reproduction'],
      q: 'The sexually transmitted disease syphilis is caused by:',
      a: 'Treponema pallidum',
      x: ['Neisseria gonorrhoeae', 'human immunodeficiency virus', 'herpes simplex virus'],
      e: 'Syphilis is caused by the spirochaete bacterium Treponema pallidum. Neisseria gonorrhoeae causes gonorrhoea, HIV causes AIDS and herpes simplex virus causes genital herpes.',
    },
    // Reproduction in plants and animals
    {
      id: 'triple-fusion-group', d: 1, o: 'past-paper', t: ['reproduction in plants and animals'],
      q: 'Double fertilization, in which one male gamete fuses with the egg and the other with the two polar nuclei, occurs in:',
      a: 'angiosperms',
      x: ['gymnosperms', 'ferns', 'mosses'],
      e: 'Double fertilization (syngamy plus triple fusion) is a hallmark of flowering plants and produces the zygote and the triploid endosperm. Gymnosperms have no triple fusion; their endosperm is the haploid female gametophyte.',
    },
    {
      id: 'parthenocarpy', d: 1, t: ['reproduction in plants and animals'],
      q: 'Development of a fruit without fertilization, giving seedless fruits such as banana, is called:',
      a: 'parthenocarpy',
      x: ['parthenogenesis', 'apomixis', 'polyembryony'],
      e: 'Parthenocarpy is fruit formation without fertilization, so no seeds develop. Parthenogenesis is development of an embryo from an unfertilised egg, apomixis is seed formation without fertilization, and polyembryony is more than one embryo in a seed.',
    },
    {
      id: 'vernalization', d: 1, o: 'past-paper', t: ['reproduction in plants and animals'],
      q: 'Promotion of flowering by exposing young plants or soaked seeds to a period of low temperature is called:',
      a: 'vernalization',
      x: ['photoperiodism', 'phototropism', 'apical dominance'],
      e: 'Vernalization is the cold treatment that induces or hastens flowering, as in winter wheat. Photoperiodism is the flowering response to day length, phototropism is growth towards light and apical dominance is suppression of lateral buds by the apical bud.',
    },
    {
      id: 'phytochrome-reversal', d: 2, t: ['reproduction in plants and animals'],
      q: 'Red light converts phytochrome from the Pr form to the Pfr form. Pfr is rapidly converted back to Pr by:',
      a: 'far-red light',
      x: ['blue light', 'green light', 'ultraviolet light'],
      e: 'Phytochrome is photoreversible: red light (about 660 nm) gives Pfr and far-red light (about 730 nm) converts it back to Pr. This switch lets plants measure night length in photoperiodism.',
    },
    {
      id: 'platypus-oviparous', d: 1, t: ['reproduction in plants and animals'],
      q: 'The duck-billed platypus is a mammal that is:',
      a: 'oviparous',
      x: ['viviparous', 'ovoviviparous', 'marsupial'],
      e: 'The platypus is a monotreme: it lays shelled eggs that hatch outside the body, so it is oviparous. Marsupials and placental mammals give birth to live young.',
    },
    // Development
    {
      id: 'germ-layers-formed', d: 1, t: ['development'],
      q: 'The three primary germ layers of an animal embryo are established during:',
      a: 'gastrulation',
      x: ['cleavage', 'neurulation', 'organogenesis'],
      e: 'During gastrulation cells of the blastula move inwards to form ectoderm, mesoderm and endoderm. Cleavage comes before it; neurulation and organogenesis use the germ layers already formed.',
    },
    {
      id: 'primary-organizer', d: 2, o: 'past-paper', t: ['development'],
      q: 'In amphibian embryos, the dorsal lip of the blastopore, which induces the formation of the neural tube, is known as the:',
      a: 'primary organizer',
      x: ['archenteron', 'blastocoel', 'yolk plug'],
      e: 'Spemann and Mangold showed that the dorsal lip of the blastopore, transplanted to another embryo, induces a second nervous system; it is the primary organizer. The archenteron is the primitive gut, the blastocoel is the cavity of the blastula and the yolk plug is yolky endoderm filling the blastopore.',
    },
    {
      id: 'chick-cleavage', d: 2, t: ['development'],
      q: 'Because the hen’s egg contains a very large amount of yolk, its cleavage is:',
      a: 'meroblastic and discoidal',
      x: ['holoblastic and equal', 'holoblastic and unequal', 'superficial'],
      e: 'Yolk resists cleavage, so in the hen’s egg only a small disc of cytoplasm on top of the yolk divides (meroblastic, discoidal). Holoblastic cleavage divides the whole egg (frog, human); superficial cleavage occurs in insect eggs.',
    },
    {
      id: 'apoptosis-digits', d: 2, t: ['development'],
      q: 'Removal of the webbing between the developing fingers of a human embryo is an example of:',
      a: 'apoptosis',
      x: ['necrosis', 'regeneration', 'metamorphosis'],
      e: 'Apoptosis is programmed cell death; cells shrink and are removed without inflammation, sculpting the separate digits. Necrosis is uncontrolled death after injury, regeneration replaces lost parts, and metamorphosis is a change of body form after hatching.',
    },
    {
      id: 'thalidomide-defect', d: 2, t: ['development'],
      q: 'The drug thalidomide, taken by women in early pregnancy around 1960, caused many babies to be born with:',
      a: 'severely shortened or missing limbs',
      x: ['an extra copy of chromosome 21', 'albinism', 'red-green colour blindness'],
      e: 'Thalidomide is a teratogen: it disturbed limb development, causing phocomelia (short or absent limbs). An extra chromosome 21 (Down syndrome) is a chromosomal error, while albinism and colour blindness are inherited gene defects, not drug effects.',
    },
    {
      id: 'lateral-meristem-girth', d: 1, t: ['development'],
      q: 'Increase in the girth of a dicot stem is brought about mainly by:',
      a: 'lateral meristems',
      x: ['apical meristems', 'intercalary meristems', 'permanent tissues'],
      e: 'Lateral meristems (vascular cambium and cork cambium) produce secondary growth, increasing thickness. Apical meristems increase length, intercalary meristems (at the bases of grass internodes) add length, and permanent tissues have stopped dividing.',
    },
    // Ageing
    {
      id: 'telomere-ageing', d: 3, t: ['ageing'],
      q: 'Normal human body cells stop dividing after a limited number of divisions (the Hayflick limit). This is linked with the progressive shortening of their:',
      a: 'telomeres',
      x: ['centromeres', 'centrioles', 'kinetochores'],
      e: 'Telomeres are repetitive DNA caps at chromosome ends that shorten at each replication in cells lacking telomerase; very short telomeres stop cell division, a cellular basis of ageing. Centromeres, centrioles and kinetochores do not shorten with division.',
    },
  ]),
]);
