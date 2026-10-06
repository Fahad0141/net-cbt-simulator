/**
 * Biology (FSc Part II): Biotechnology and Evolution.
 *
 * Sub-topics: recombinant DNA, PCR, cloning, evolution theories, Hardy-Weinberg.
 *
 * Computational items: Hardy-Weinberg allele and genotype frequencies, expected genotype
 * counts from a recessive-phenotype count, and PCR amplification (N = N0 x 2^n).
 * Conceptual items: statement pools, a scientist-contribution matcher and fixed
 * textbook-recall MCQs.
 */
import { defineBank } from '@/engine/authoring';
import { num, numericOptions, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** A false statement and the fact that corrects it. */
type Falsehood = readonly [statement: string, correction: string];

/** "Which statement is correct / incorrect?" with the correction of every false statement shown. */
function statementItem(
  r: Rng,
  pool: { stem: string; negativeStem: string; truths: readonly string[]; falsehoods: readonly Falsehood[] },
): AuthoredQuestion {
  if (r.chance(0.35)) {
    const [answer, why] = r.pick(pool.falsehoods);
    return {
      stem: pool.negativeStem,
      answer,
      distractors: r.sample(pool.truths, 3),
      explanation: `This statement is false: ${why} The other three statements are correct.`,
    };
  }
  const answer = r.pick(pool.truths);
  const wrong = r.sample(pool.falsehoods, 3);
  return {
    stem: pool.stem,
    answer,
    distractors: wrong.map(([s]) => s),
    explanation: `"${answer}" is correct. The others are false: ${wrong.map(([, why]) => why).join(' ')}`,
  };
}

/** Rounds away floating-point noise from products of one-decimal frequencies. */
const clean = (x: number): number => Number(x.toPrecision(10));

/**
 * Recessive-allele frequencies 0.1 ... 0.9 (one decimal). 0.5 is left out because p = q
 * makes several standard mistakes coincide with the answer.
 */
const TENTHS: readonly number[] = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9];

/** Integer digits, thin-space grouped in threes only when there are five or more digits. */
const grouped = (x: number): string => {
  const s = String(Math.round(x));
  return s.length < 5 ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
};

/** Integer in math mode. */
const intTex = (x: number): string => `$${grouped(x)}$`;

// ---------------------------------------------------------------------------
// Statement pools
// ---------------------------------------------------------------------------

const BIOTECH_TRUTHS: readonly string[] = [
  'Restriction endonucleases cut DNA at specific recognition sequences, many of which are palindromic.',
  'DNA ligase joins DNA fragments by sealing their sugar-phosphate backbones.',
  'A recombinant plasmid carries DNA from two different sources.',
  'PCR amplifies a chosen DNA segment in a test tube without living cells.',
  'Each PCR cycle roughly doubles the number of copies of the target DNA.',
  'PCR needs two short primers that flank the target sequence.',
  'Gel electrophoresis separates DNA fragments according to their size.',
  'Dolly the sheep was cloned using the nucleus of an adult udder cell.',
  'Antibiotic-resistance genes on plasmids are used as markers to select transformed bacteria.',
];

const BIOTECH_FALSEHOODS: readonly Falsehood[] = [
  ['DNA ligase cuts DNA at specific recognition sequences.', 'Restriction endonucleases cut DNA; ligase joins fragments.'],
  ['Taq polymerase is destroyed at the denaturation temperature of PCR.', 'Taq polymerase is heat-stable and survives about 95 °C.'],
  ['PCR requires living bacterial cells to copy the target DNA.', 'PCR is an in-vitro reaction run in a thermal cycler.'],
  ['In gel electrophoresis, larger DNA fragments move faster than smaller ones.', 'Smaller fragments move faster and travel farther.'],
  ['Plasmids are segments of the main bacterial chromosome.', 'Plasmids are extrachromosomal and replicate independently.'],
  ['Dolly the sheep was produced by fertilising an egg with sperm from a cloned ram.', 'Dolly came from somatic cell nuclear transfer, with no fertilisation.'],
  ['Reverse transcriptase makes RNA from a DNA template.', 'Reverse transcriptase makes DNA (cDNA) from an RNA template.'],
  ['During PCR annealing, the mixture is heated to about 95 °C.', 'Annealing occurs at about 50–65 °C; 95 °C is the denaturation step.'],
];

const EVOLUTION_TRUTHS: readonly string[] = [
  'Lamarck proposed the inheritance of acquired characteristics.',
  'Darwin and Wallace independently proposed natural selection.',
  'Homologous organs share a common origin but may perform different functions.',
  'Analogous organs perform similar functions but differ in origin.',
  'Vestigial organs are reduced structures with little or no function.',
  'Natural selection acts on heritable variation already present in a population.',
  'Darwin published "On the Origin of Species" in 1859.',
  'Fossils provide direct evidence of organisms that lived in the past.',
];

const EVOLUTION_FALSEHOODS: readonly Falsehood[] = [
  ["Lamarck's theory is based mainly on natural selection.", 'Lamarck relied on use and disuse and the inheritance of acquired characters.'],
  ['The forelimbs of a whale and a bat are analogous organs.', 'Whale and bat forelimbs share one bone plan, so they are homologous.'],
  ['The wings of a butterfly and a bird are homologous organs.', 'Butterfly and bird wings differ in origin, so they are analogous.'],
  ['Natural selection produces new variations whenever they are needed.', 'Variation arises from mutation and recombination; selection only sorts it.'],
  ['An individual organism evolves during its lifetime by natural selection.', 'Populations evolve over generations, not individuals.'],
  ["Weismann's mouse-tail experiments supported Lamarck's theory.", 'Mice with cut tails still produced tailed offspring, contradicting Lamarck.'],
  ['The human vermiform appendix is an example of an analogous organ.', 'The human appendix is a vestigial organ.'],
];

// ---------------------------------------------------------------------------
// Scientists and contributions
// ---------------------------------------------------------------------------

interface Contribution {
  who: string;
  what: string;
  /** Names that must not appear as distractors (arguably also right). */
  exclude?: readonly string[];
}

const CONTRIBUTIONS: readonly Contribution[] = [
  { who: 'Jean-Baptiste Lamarck', what: 'the inheritance of acquired characteristics through use and disuse' },
  { who: 'Charles Darwin', what: 'the book "On the Origin of Species" (1859)', exclude: ['Alfred Russel Wallace'] },
  { who: 'Alfred Russel Wallace', what: 'an 1858 essay, sent to Darwin, that independently described natural selection', exclude: ['Charles Darwin'] },
  { who: 'Thomas Malthus', what: 'an essay arguing that populations grow faster than their food supply' },
  { who: 'Charles Lyell', what: 'the book "Principles of Geology", describing slow, gradual change of the Earth' },
  { who: 'Georges Cuvier', what: 'catastrophism, explaining extinctions by sudden natural catastrophes' },
  { who: 'August Weismann', what: 'the germ plasm theory and the mouse-tail experiment against Lamarckism' },
  { who: 'Hugo de Vries', what: 'the mutation theory, based on studies of the evening primrose' },
  { who: 'Gregor Mendel', what: 'the laws of inheritance from crosses of the garden pea' },
  { who: 'Kary Mullis', what: 'the invention of the polymerase chain reaction (PCR) in 1983' },
  { who: 'Ian Wilmut', what: 'leading the team that cloned Dolly the sheep in 1996' },
];

const ALL_SCIENTISTS: readonly string[] = CONTRIBUTIONS.map((c) => c.who);

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

type HwTarget = 'q' | 'p' | 'carriers' | 'AA';

export default defineBank('biology', 'biotechnology-evolution', (b) => [
  // ---------------------------- Dynamic: Hardy-Weinberg ----------------------------
  b.dynamic('hw-from-recessive-phenotype', { difficulty: 2, origin: 'past-paper', tags: ['Hardy-Weinberg'] }, (r) => {
    const q = r.pick(TENTHS);
    const p = clean(1 - q);
    const q2 = clean(q * q);
    const pct = Math.round(q2 * 100);
    const target = r.pick<HwTarget>(['q', 'p', 'carriers', 'AA']);
    const pq2 = clean(2 * p * q);
    const p2 = clean(p * p);
    const spec: Record<HwTarget, { what: string; correct: number; wrong: number[]; last: string }> = {
      q: { what: 'the recessive allele (a)', correct: q, wrong: [q2, clean(1 - q2), p], last: `q = \\sqrt{${num(q2)}} = ${num(q)}` },
      p: { what: 'the dominant allele (A)', correct: p, wrong: [q, clean(1 - q2), q2], last: `p = 1 - q = 1 - ${num(q)} = ${num(p)}` },
      carriers: {
        what: 'heterozygous carriers (Aa)',
        correct: pq2,
        wrong: [clean(p * q), clean(1 - q2), p2],
        last: `2pq = 2(${num(p)})(${num(q)}) = ${num(pq2)}`,
      },
      AA: {
        what: 'homozygous dominant individuals (AA)',
        correct: p2,
        wrong: [clean(1 - q2), pq2, p],
        last: `p^2 = (${num(p)})^2 = ${num(p2)}`,
      },
    };
    const s = spec[target];
    const { answer, distractors } = numericOptions(r, {
      correct: s.correct,
      wrong: s.wrong,
      format: (x) => `$${num(x)}$`,
      fallback: 'scale',
    });
    return {
      stem: `In a population in Hardy-Weinberg equilibrium, ${pct}% of individuals show a recessive trait (genotype aa). The frequency of ${s.what} is:`,
      answer,
      distractors,
      explanation: tex`$q^2 = ${num(q2)}$, so $q = \sqrt{${num(q2)}} = ${num(q)}$ and $p = 1 - q = ${num(p)}$. The required frequency is $${s.last}$.`,
    };
  }),

  b.dynamic('hw-expected-genotype-count', { difficulty: 3, tags: ['Hardy-Weinberg'] }, (r) => {
    const q = r.pick(TENTHS);
    const p = clean(1 - q);
    const total = r.int(2, 30) * 100;
    const aa = Math.round(q * q * total);
    const askCarriers = r.chance(0.6);
    const het = Math.round(2 * p * q * total);
    const dom = Math.round(p * p * total);
    const correct = askCarriers ? het : dom;
    const wrong = askCarriers
      ? [Math.round(p * q * total), dom, total - aa]
      : [het, total - aa, Math.round(p * total)];
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: intTex, fallback: 'integer' });
    const what = askCarriers ? 'heterozygous (Aa)' : 'homozygous dominant (AA)';
    const last = askCarriers
      ? tex`2pqN = 2(${num(p)})(${num(q)})(${total}) = ${het}`
      : tex`p^2N = (${num(p)})^2(${total}) = ${dom}`;
    return {
      stem: `A population of ${total} individuals is in Hardy-Weinberg equilibrium for one gene with alleles A and a. If ${aa} individuals show the recessive phenotype (aa), the expected number of ${what} individuals is:`,
      answer,
      distractors,
      explanation: tex`$q^2 = \frac{${aa}}{${total}} = ${num(clean(q * q))}$, so $q = ${num(q)}$ and $p = 1 - q = ${num(p)}$. Expected number $= ${last}$.`,
    };
  }),

  // ---------------------------- Dynamic: PCR ----------------------------
  b.dynamic('pcr-copy-number', { difficulty: 2, origin: 'past-paper', tags: ['PCR'] }, (r) => {
    const n0 = r.pick([1, 2, 3, 4, 5, 10]);
    const n = r.int(3, 12);
    const correct = n0 * 2 ** n;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [n0 * 2 * n, n0 * 2 ** (n - 1), n0 * 2 ** (n + 1), 2 ** n, n0 + 2 ** n],
      format: intTex,
      fallback: 'integer',
    });
    const start = n0 === 1 ? 'a single copy' : `${n0} copies`;
    return {
      stem: `A PCR reaction starts with ${start} of a double-stranded target DNA. Assuming the target doubles in every cycle, the number of copies after ${n} cycles is:`,
      answer,
      distractors,
      explanation: tex`Each cycle doubles the target: $N = N_0 \times 2^{n} = ${n0} \times 2^{${n}} = ${n0} \times ${grouped(2 ** n)} = ${grouped(correct)}$.`,
    };
  }),

  // ---------------------------- Dynamic: statements and scientists ----------------------------
  b.dynamic('biotechnology-statements', { difficulty: 2, tags: ['recombinant DNA', 'PCR', 'cloning'] }, (r) =>
    statementItem(r, {
      stem: 'Which statement about recombinant DNA technology, PCR and cloning is correct?',
      negativeStem: 'Which statement about recombinant DNA technology, PCR and cloning is incorrect?',
      truths: BIOTECH_TRUTHS,
      falsehoods: BIOTECH_FALSEHOODS,
    }),
  ),

  b.dynamic('evolution-statements', { difficulty: 2, tags: ['evolution theories'] }, (r) =>
    statementItem(r, {
      stem: 'Which statement about evolution is correct?',
      negativeStem: 'Which statement about evolution is incorrect?',
      truths: EVOLUTION_TRUTHS,
      falsehoods: EVOLUTION_FALSEHOODS,
    }),
  ),

  b.dynamic('scientist-contribution', { difficulty: 1, tags: ['evolution theories', 'PCR', 'cloning'] }, (r) => {
    const c = r.pick(CONTRIBUTIONS);
    const pool = ALL_SCIENTISTS.filter((s) => s !== c.who && !(c.exclude ?? []).includes(s));
    return {
      stem: `Which scientist is best known for ${c.what}?`,
      answer: c.who,
      distractors: r.sample(pool, 3),
      explanation: `${c.who} is known for ${c.what}.`,
    };
  }),

  // ---------------------------- Fixed: recombinant DNA ----------------------------
  ...b.mcqs([
    {
      id: 'restriction-enzyme-role', d: 1, o: 'past-paper', t: ['recombinant DNA'],
      q: 'In recombinant DNA technology, restriction endonucleases are used to:',
      a: 'cut DNA at specific recognition sequences',
      x: ['join DNA fragments into a vector', 'copy mRNA into complementary DNA', 'separate DNA fragments by size'],
      e: 'Restriction endonucleases ("molecular scissors") cut DNA at specific sequences. Joining is done by DNA ligase, cDNA synthesis by reverse transcriptase and size separation by gel electrophoresis.',
    },
    {
      id: 'dna-ligase-role', d: 1, t: ['recombinant DNA'],
      q: 'The enzyme that joins the sticky ends of a DNA insert and a plasmid vector is:',
      a: 'DNA ligase',
      x: ['restriction endonuclease', 'reverse transcriptase', 'RNA polymerase'],
      e: 'DNA ligase seals the sugar-phosphate backbone between adjacent nucleotides, joining the insert to the vector.',
    },
    {
      id: 'ecori-recognition-site', d: 2, t: ['recombinant DNA'],
      q: 'The recognition sequence of the restriction enzyme EcoRI is:',
      a: '5′-GAATTC-3′',
      x: ['5′-GGATCC-3′', '5′-AAGCTT-3′', '5′-GATATC-3′'],
      e: 'EcoRI (from E. coli) cuts between G and A in GAATTC, leaving AATT sticky ends. GGATCC is the BamHI site, AAGCTT the HindIII site and GATATC the EcoRV site.',
    },
    {
      id: 'plasmid-definition', d: 1, o: 'past-paper', t: ['recombinant DNA'],
      q: 'Plasmids used as cloning vectors are:',
      a: 'small circular DNA molecules that replicate independently of the chromosome',
      x: [
        'large linear DNA molecules that form the main bacterial chromosome',
        'small circular RNA molecules that code for ribosomal proteins',
        'protein molecules that cut DNA at specific base sequences',
      ],
      e: 'Plasmids are small, circular, extrachromosomal DNA molecules (mainly in bacteria) with their own origin of replication, so inserted genes are copied along with them.',
    },
    {
      id: 'reverse-transcriptase-cdna', d: 2, t: ['recombinant DNA'],
      q: 'Complementary DNA (cDNA) is synthesised from an mRNA template by:',
      a: 'reverse transcriptase',
      x: ['DNA ligase', 'restriction endonuclease', 'RNA polymerase'],
      e: 'Reverse transcriptase (from retroviruses) makes DNA from an RNA template. cDNA lacks introns, so eukaryotic genes made this way can be expressed in bacteria.',
    },
    {
      id: 'first-recombinant-medicine', d: 1, t: ['recombinant DNA'],
      q: 'The first medicine made by recombinant DNA technology and approved for human use (1982) was:',
      a: 'human insulin produced by bacteria',
      x: ['human growth hormone', 'interferon', 'hepatitis B vaccine'],
      e: 'Human insulin made in E. coli was approved in 1982. Recombinant growth hormone (1985), interferon and hepatitis B vaccine (both 1986) followed later.',
    },
    {
      id: 'bt-crop-gene-source', d: 1, t: ['recombinant DNA'],
      q: 'Bt cotton resists insect pests because it carries a toxin gene taken from:',
      a: 'Bacillus thuringiensis',
      x: ['Agrobacterium tumefaciens', 'Escherichia coli', 'Thermus aquaticus'],
      e: 'Bt crops express the Cry (crystal) protein gene of Bacillus thuringiensis, which is toxic to certain insect larvae. Agrobacterium is used as a vector, not as the toxin source.',
    },

    // ---------------------------- Fixed: PCR ----------------------------
    {
      id: 'taq-polymerase-heat-stable', d: 1, o: 'past-paper', t: ['PCR'],
      q: 'Taq polymerase is used in PCR because it:',
      a: 'stays active after repeated heating to about 95 °C',
      x: ['can copy DNA without any primers', 'copies RNA into complementary DNA', 'cuts DNA at specific recognition sites'],
      e: 'Taq polymerase comes from the hot-spring bacterium Thermus aquaticus and is heat-stable, so it survives the denaturation step of every cycle. It still needs primers.',
    },
    {
      id: 'pcr-step-sequence', d: 2, t: ['PCR'],
      q: 'The correct sequence of steps in one PCR cycle is:',
      a: 'denaturation → annealing → extension',
      x: ['annealing → denaturation → extension', 'extension → annealing → denaturation', 'denaturation → extension → annealing'],
      e: 'Heating (about 95 °C) separates the strands (denaturation); cooling (about 50–65 °C) lets primers bind (annealing); at about 72 °C Taq polymerase extends the primers (extension).',
    },
    {
      id: 'pcr-annealing-purpose', d: 2, t: ['PCR'],
      q: 'In PCR, the mixture is cooled to about 55 °C after denaturation so that:',
      a: 'primers can bind to complementary sequences on the single strands',
      x: [
        'the two DNA strands can separate from each other',
        'Taq polymerase can be inactivated before the next cycle',
        'restriction enzymes can cut the new DNA into fragments',
      ],
      e: 'This is the annealing step: primers base-pair with the flanks of the target. Strand separation needs high temperature (about 95 °C), and Taq is not inactivated between cycles.',
    },

    // ---------------------------- Fixed: cloning ----------------------------
    {
      id: 'dolly-scnt', d: 1, o: 'past-paper', t: ['cloning'],
      q: 'Dolly the sheep (1996), the first mammal cloned from an adult cell, was produced by:',
      a: 'transferring an udder-cell nucleus into an enucleated egg',
      x: [
        'fertilising an egg with sperm from a selected ram',
        'splitting an early embryo into two halves',
        'inserting a jellyfish gene into a fertilised egg',
      ],
      e: 'Dolly was made by somatic cell nuclear transfer: the nucleus of an adult mammary (udder) cell was fused with an egg whose own nucleus had been removed. No fertilisation was involved.',
    },

    // ---------------------------- Fixed: evolution ----------------------------
    {
      id: 'analogous-wings', d: 1, o: 'past-paper', t: ['evolution theories'],
      q: 'The wings of a bird and the wings of an insect are examples of:',
      a: 'analogous organs',
      x: ['homologous organs', 'vestigial organs', 'transitional forms'],
      e: 'They do the same job (flight) but have different structure and origin, so they are analogous and show convergent evolution.',
    },
    {
      id: 'vestigial-appendix', d: 1, t: ['evolution theories'],
      q: 'Which of the following is a vestigial organ in humans?',
      a: 'Vermiform appendix',
      x: ['Thyroid gland', 'Pancreas', 'Kidney'],
      e: 'The vermiform appendix is a reduced remnant of the caecum, which is large and aids cellulose digestion in many herbivorous mammals. The thyroid, pancreas and kidney are fully functional organs.',
    },
    {
      id: 'darwin-finches-beaks', d: 1, t: ['evolution theories'],
      q: "The Galápagos finches studied by Darwin differ from one another mainly in the:",
      a: 'shape and size of their beaks',
      x: ['number of toes on their feet', 'number of chambers in the heart', 'colour pattern of their eggs'],
      e: 'Each finch species has a beak adapted to its food (seeds, insects, cactus). This adaptive radiation from a common ancestor supported natural selection.',
    },
    {
      id: 'modern-synthesis-addition', d: 2, t: ['evolution theories'],
      q: "The modern synthetic theory (Neo-Darwinism) mainly added which idea to Darwin's original theory?",
      a: 'A genetic basis of variation through mutation and recombination',
      x: [
        'Overproduction of offspring in every generation',
        'A struggle for existence among individuals',
        'Survival of the fittest by natural selection',
      ],
      e: "Darwin could not explain how variations arise and are inherited. The modern synthesis combined natural selection with Mendelian genetics, mutation and recombination. The other three ideas were already part of Darwin's theory.",
    },

    // ---------------------------- Fixed: Hardy-Weinberg ----------------------------
    {
      id: 'hw-not-a-condition', d: 2, o: 'past-paper', t: ['Hardy-Weinberg'],
      q: 'Which of the following is NOT a condition for Hardy-Weinberg equilibrium?',
      a: 'Natural selection favouring one genotype',
      x: ['A very large population', 'Random mating among individuals', 'No migration into or out of the population'],
      e: 'Equilibrium requires a large population, random mating, no migration, no mutation and no natural selection. Selection changes allele frequencies, so it disturbs equilibrium.',
    },
    {
      id: 'hw-max-heterozygosity', d: 3, t: ['Hardy-Weinberg'],
      q: 'For a gene with two alleles in Hardy-Weinberg equilibrium, the frequency of heterozygotes is greatest when the frequency of the dominant allele (p) is:',
      a: '$0.5$',
      x: ['$0.25$', '$0.75$', '$1$'],
      e: tex`$2pq = 2p(1-p)$ is largest at $p = 0.5$, giving $2pq = 2(0.5)(0.5) = 0.5$. At $p = 0.25$ or $0.75$ it is $0.375$; at $p = 1$ it is $0$.`,
    },
  ]),
]);
