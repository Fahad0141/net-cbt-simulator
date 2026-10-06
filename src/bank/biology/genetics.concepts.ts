import { defineBank } from '@/engine/authoring';
import { listText, pickDistractors, statementQuestion, tex } from '@/engine/helpers';

/**
 * Biology, chapter "Chromosomes, Cell Cycle and Genetics": PART B (conceptual items).
 * Part A (computational items) lives in `genetics.ts`. Every local id here starts with `c-`.
 */

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * When the item asks for the TRUE statement, replaces the generic explanation with a
 * refutation of each falsehood actually shown as an option.
 */
function refuteShown(
  q: ReturnType<typeof statementQuestion>,
  why: Readonly<Record<string, string>>,
): ReturnType<typeof statementQuestion> {
  if (!q.distractors.every((d) => d in why)) return q;
  return {
    ...q,
    explanation: `"${q.answer}" is true. The other three statements are false. ${q.distractors.map((d) => cap(why[d] ?? '')).join(' ')}`,
  };
}

// ------------------------------------------------------------------ data

const DNA_FALSE: Readonly<Record<string, string>> = {
  'Adenine pairs with cytosine and guanine pairs with thymine.':
    'complementary pairing is A with T and G with C; only these purine–pyrimidine pairs match in hydrogen bonding.',
  'Guanine and cytosine are held together by two hydrogen bonds.':
    'G and C are joined by three hydrogen bonds; A and T are joined by two.',
  'DNA contains ribose sugar and the base uracil.':
    'DNA contains deoxyribose and thymine; ribose and uracil are found in RNA.',
  'The two strands of DNA run parallel, both in the 5′→3′ direction.':
    'the strands are antiparallel: one runs 5′→3′ and its partner runs 3′→5′.',
  'The nitrogenous bases form the outer backbone of the double helix.':
    'the sugar–phosphate backbone is on the outside; the bases project inwards and pair in the core.',
  'Adjacent nucleotides of a strand are linked by peptide bonds.':
    'nucleotides are linked by phosphodiester bonds; peptide bonds join amino acids.',
  'Thymine and cytosine are purines with a double-ring structure.':
    'thymine and cytosine are single-ring pyrimidines; adenine and guanine are the double-ring purines.',
};

const DIVISION_FALSE: Readonly<Record<string, string>> = {
  'Mitosis halves the chromosome number of the parent cell.':
    'mitosis keeps the chromosome number unchanged; only meiosis halves it.',
  'Crossing over normally occurs during prophase of mitosis.':
    'crossing over occurs between homologous chromosomes during prophase I of meiosis (pachytene).',
  'Sister chromatids separate from each other during anaphase I.':
    'in anaphase I homologous chromosomes separate; sister chromatids separate in anaphase II.',
  'DNA replicates again during interkinesis, between meiosis I and II.':
    'there is no DNA replication (no S phase) in interkinesis.',
  'Meiosis II is the reduction division in which homologues separate.':
    'meiosis I is the reduction division; meiosis II is an equational division like mitosis.',
  'Meiosis takes place in somatic cells for growth and repair.':
    'growth and repair depend on mitosis; meiosis occurs in germ cells to form gametes or spores.',
  'The four products of meiosis are genetically identical to one another.':
    'crossing over and independent assortment make the four meiotic products genetically different.',
};

/** Mitotic phases and events that occur only in that phase. */
const PHASE_EVENTS: ReadonlyArray<{ phase: string; event: string }> = [
  { phase: 'Interphase', event: 'the DNA of each chromosome is replicated' },
  { phase: 'Prophase', event: 'chromatin condenses so that chromosomes first become visible' },
  { phase: 'Prophase', event: 'the nucleolus disappears and the spindle starts to form' },
  { phase: 'Metaphase', event: 'chromosomes line up on the equatorial (metaphase) plate' },
  { phase: 'Metaphase', event: 'the condensed chromosomes are best seen and counted' },
  { phase: 'Anaphase', event: 'sister chromatids separate and move to opposite poles' },
  { phase: 'Anaphase', event: 'daughter chromosomes are pulled poleward, centromere first, as spindle fibres shorten' },
  { phase: 'Telophase', event: 'a nuclear envelope re-forms around each group of chromosomes' },
  { phase: 'Telophase', event: 'chromosomes uncoil and the nucleoli reappear' },
];
const PHASES = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase'] as const;

/** Scientists and contributions that do not overlap. */
const SCIENTISTS: ReadonlyArray<{ name: string; did: string; note: string }> = [
  { name: 'Gregor Mendel', did: 'worked out the laws of inheritance from crosses of garden pea plants', note: 'published in 1866' },
  { name: 'Watson and Crick', did: 'proposed the double-helix model of DNA', note: 'in 1953' },
  { name: 'Meselson and Stahl', did: 'showed with heavy nitrogen (¹⁵N) that DNA replicates semi-conservatively', note: 'in 1958' },
  { name: 'Thomas Hunt Morgan', did: 'discovered sex-linked inheritance and gene linkage in Drosophila', note: 'from about 1910' },
  { name: 'Frederick Griffith', did: 'discovered bacterial transformation in Streptococcus pneumoniae', note: 'in 1928' },
  { name: 'Hershey and Chase', did: 'used radioactively labelled bacteriophages to show that DNA is the genetic material', note: 'in 1952' },
  { name: 'Erwin Chargaff', did: 'found that DNA contains equal amounts of A and T, and of G and C', note: 'around 1950' },
  { name: 'Rosalind Franklin', did: 'obtained X-ray diffraction images showing that DNA is a helix', note: 'in the early 1950s' },
  { name: 'Beadle and Tatum', did: 'proposed the one gene–one enzyme hypothesis from work on Neurospora', note: 'in 1941' },
  { name: 'Sutton and Boveri', did: 'proposed that genes are carried on chromosomes (chromosome theory of inheritance)', note: 'in 1902–1903' },
];

/** Genetic terms and their definitions (mutually exclusive). */
const TERMS: ReadonlyArray<{ term: string; def: string }> = [
  { term: 'allele', def: 'one of the alternative forms of a gene found at the same locus' },
  { term: 'locus', def: 'the fixed position occupied by a gene on a chromosome' },
  { term: 'genotype', def: 'the genetic make-up (set of alleles) of an organism for a trait' },
  { term: 'phenotype', def: 'the observable characteristics of an organism' },
  { term: 'homozygous', def: 'having two identical alleles of a gene' },
  { term: 'heterozygous', def: 'having two different alleles of a gene' },
  { term: 'recessive allele', def: 'an allele expressed only when no dominant allele is present' },
  { term: 'epistasis', def: 'the masking of one gene’s effect by another, non-allelic gene' },
  { term: 'pleiotropy', def: 'the effect of a single gene on several different traits' },
  { term: 'polygenic inheritance', def: 'control of one trait by several genes with additive effects' },
];

/** Molecules and enzymes of replication and protein synthesis with unique roles. */
const ROLES: ReadonlyArray<{ name: string; role: string }> = [
  { name: 'helicase', role: 'unwinds the double helix by breaking hydrogen bonds between base pairs' },
  { name: 'primase', role: 'makes the short RNA primer needed to start DNA synthesis' },
  { name: 'DNA polymerase', role: 'adds DNA nucleotides to the 3′ end of a growing strand' },
  { name: 'DNA ligase', role: 'joins Okazaki fragments by forming phosphodiester bonds' },
  { name: 'RNA polymerase', role: 'transcribes a gene into mRNA using a DNA template' },
  { name: 'aminoacyl-tRNA synthetase', role: 'attaches a specific amino acid to its tRNA' },
  { name: 'transfer RNA (tRNA)', role: 'brings amino acids to the ribosome and pairs its anticodon with a codon' },
  { name: 'messenger RNA (mRNA)', role: 'carries the coded message from DNA in the nucleus to the ribosome' },
  { name: 'topoisomerase (gyrase)', role: 'relieves the twisting (supercoiling) ahead of the replication fork' },
];

type SexSystem = 'XY' | 'XO' | 'ZW' | 'HD';
const SEX_SYSTEMS: Readonly<Record<SexSystem, string>> = {
  XY: 'XX–XY type (male heterogametic, XY)',
  XO: 'XX–XO type (male has a single X, XO)',
  ZW: 'ZZ–ZW type (female heterogametic, ZW)',
  HD: 'haplodiploidy (males develop from unfertilised eggs)',
};
const SEX_ORGANISMS: ReadonlyArray<{ name: string; sys: SexSystem }> = [
  { name: 'humans', sys: 'XY' },
  { name: 'the fruit fly Drosophila', sys: 'XY' },
  { name: 'the flowering plant Melandrium', sys: 'XY' },
  { name: 'grasshoppers', sys: 'XO' },
  { name: 'cockroaches', sys: 'XO' },
  { name: 'birds such as the domestic fowl', sys: 'ZW' },
  { name: 'pigeons', sys: 'ZW' },
  { name: 'honeybees', sys: 'HD' },
  { name: 'ants', sys: 'HD' },
];
const SEX_NOTE: Readonly<Record<SexSystem, string>> = {
  XY: 'XX–XY: females are XX and males XY (humans, Drosophila, Melandrium)',
  XO: 'XX–XO: females are XX and males have only one X (grasshoppers, cockroaches)',
  ZW: 'ZZ–ZW: males are ZZ and females ZW (birds)',
  HD: 'haplodiploidy: males are haploid from unfertilised eggs and females diploid (honeybees, ants)',
};

// ------------------------------------------------------------------ bank

export default defineBank('biology', 'genetics', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('c-dna-structure-statements', { difficulty: 2, tags: ['DNA structure and replication'] }, (r) =>
    refuteShown(statementQuestion(r, {
      stem: 'Which of the following statements about the structure of DNA is correct?',
      negativeStem: 'Which of the following statements about the structure of DNA is NOT correct?',
      truths: [
        'The two strands of DNA are antiparallel.',
        'Adenine pairs with thymine through two hydrogen bonds.',
        'Guanine pairs with cytosine through three hydrogen bonds.',
        'In double-stranded DNA, the total of purines equals the total of pyrimidines.',
        'The sugar–phosphate backbone lies on the outside of the double helix.',
        'Nucleotides within one strand are joined by phosphodiester bonds.',
      ],
      falsehoods: Object.keys(DNA_FALSE),
      // The "correct statement" variant is re-explained by refuteShown().
      explain: (answer) => `The statement is false: ${DNA_FALSE[answer] ?? ''} The other three statements are true.`,
    }), DNA_FALSE),
  ),

  b.dynamic('c-division-statements', { difficulty: 2, tags: ['mitosis and meiosis'] }, (r) =>
    refuteShown(statementQuestion(r, {
      stem: 'Which of the following statements about mitosis and meiosis is correct?',
      negativeStem: 'Which of the following statements about mitosis and meiosis is NOT correct?',
      truths: [
        'Mitosis produces two daughter cells genetically identical to the parent cell.',
        'Meiosis produces four cells, each with half the chromosome number of the parent.',
        'Crossing over in prophase I produces new combinations of alleles.',
        'Meiosis I is the reduction division, while meiosis II resembles mitosis.',
        'Homologous chromosomes pair (synapsis) in meiosis but not in mitosis.',
        'DNA is not replicated between meiosis I and meiosis II.',
      ],
      falsehoods: Object.keys(DIVISION_FALSE),
      // The "correct statement" variant is re-explained by refuteShown().
      explain: (answer) => `The statement is false: ${DIVISION_FALSE[answer] ?? ''} The other three statements are true.`,
    }), DIVISION_FALSE),
  ),

  b.dynamic('c-mitosis-phase-event', { difficulty: 1, origin: 'past-paper', tags: ['mitosis and meiosis'] }, (r) => {
    const target = r.pick(PHASE_EVENTS);
    const others = r.sample(PHASES.filter((p) => p !== target.phase), 3);
    return {
      stem: `In the cell cycle of an animal cell, the stage in which ${target.event} is:`,
      answer: target.phase,
      distractors: others,
      explanation: `${cap(target.event)} during ${target.phase.toLowerCase()}. Sequence: interphase (DNA replication) → prophase (condensation, spindle forms) → metaphase (chromosomes on the equator) → anaphase (chromatids separate) → telophase (nuclei re-form).`,
    };
  }),

  b.dynamic('c-genetics-scientist', { difficulty: 1, origin: 'past-paper', tags: ['DNA structure and replication', 'Mendelian genetics', 'linkage'] }, (r) => {
    const [target, ...others] = r.sample(SCIENTISTS, 4) as [typeof SCIENTISTS[number], ...typeof SCIENTISTS];
    const fact = `${target.name} ${target.did}, ${target.note}.`;
    if (r.chance(0.5)) {
      return {
        stem: `Which scientist(s) ${target.did}?`,
        answer: target.name,
        distractors: others.map((o) => o.name),
        explanation: fact,
      };
    }
    return {
      stem: `Which of the following is the contribution of **${target.name}** to genetics?`,
      answer: cap(target.did),
      distractors: others.map((o) => cap(o.did)),
      explanation: `${fact} The other options describe the work of ${others.map((o) => o.name).join(', ')}.`,
    };
  }),

  b.dynamic('c-genetic-terms', { difficulty: 1, tags: ['Mendelian genetics'] }, (r) => {
    const target = r.pick(TERMS);
    // Never pair "allele" with "recessive allele": one term would partly describe the other.
    const others = r.sample(
      TERMS.filter((t) => t !== target && !t.term.includes(target.term) && !target.term.includes(t.term)),
      3,
    );
    if (r.chance(0.5)) {
      return {
        stem: `In genetics, the term **${target.term}** means:`,
        answer: cap(target.def),
        distractors: others.map((o) => cap(o.def)),
        explanation: `${cap(target.term)}: ${target.def}. The other options define ${others.map((o) => o.term).join(', ')}.`,
      };
    }
    return {
      stem: `Which term describes ${target.def}?`,
      answer: cap(target.term),
      distractors: others.map((o) => cap(o.term)),
      explanation: `${cap(target.def)} is called "${target.term}". ${others.map((o) => `"${cap(o.term)}" means ${o.def}`).join('; ')}.`,
    };
  }),

  b.dynamic('c-replication-translation-roles', { difficulty: 1, tags: ['DNA structure and replication', 'protein synthesis'] }, (r) => {
    const target = r.pick(ROLES);
    // Primase is itself a specialised RNA polymerase, so never offer one against the other.
    const clash = (a: string, b: string) => a === 'primase' && b === 'RNA polymerase';
    const others = r.sample(
      ROLES.filter((o) => o !== target && !clash(o.name, target.name) && !clash(target.name, o.name)),
      3,
    );
    if (r.chance(0.5)) {
      return {
        stem: `Which molecule ${target.role}?`,
        answer: cap(target.name),
        distractors: others.map((o) => cap(o.name)),
        explanation: `${cap(target.name)} ${target.role}. ${others.map((o) => `${cap(o.name)} ${o.role}`).join('. ')}.`,
      };
    }
    return {
      stem: `The role of **${target.name}** is that it:`,
      answer: target.role,
      distractors: others.map((o) => o.role),
      explanation: `${cap(target.name)} ${target.role}. The other roles belong to ${listText(others.map((o) => o.name))}.`,
    };
  }),

  b.dynamic('c-sex-determination-system', { difficulty: 2, origin: 'past-paper', tags: ['sex determination'] }, (r) => {
    const target = r.pick(SEX_ORGANISMS);
    const why = `Chromosomal sex determination: ${(['XY', 'XO', 'ZW', 'HD'] as const).map((s) => SEX_NOTE[s]).join('; ')}.`;
    if (r.chance(0.55)) {
      const answer = SEX_SYSTEMS[target.sys];
      return {
        stem: `The mechanism of sex determination in ${target.name} is:`,
        answer: cap(answer),
        distractors: pickDistractors(answer, Object.values(SEX_SYSTEMS), r).map(cap),
        explanation: why,
      };
    }
    const others = (['XY', 'XO', 'ZW', 'HD'] as const)
      .filter((s) => s !== target.sys)
      .map((s) => r.pick(SEX_ORGANISMS.filter((o) => o.sys === s)).name);
    return {
      stem: `Which of the following shows the **${SEX_SYSTEMS[target.sys]}** mechanism of sex determination?`,
      answer: cap(target.name),
      distractors: others.map(cap),
      explanation: why,
    };
  }),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    // DNA structure and replication
    {
      id: 'c-semiconservative-meaning', d: 1, o: 'past-paper', t: ['DNA structure and replication'],
      q: 'DNA replication is called semi-conservative because each daughter DNA molecule contains:',
      a: 'one parental strand and one newly made strand',
      x: [
        'two newly made strands',
        'two parental strands',
        'old and new segments scattered along each strand',
      ],
      e: 'Each parental strand acts as a template for a new complementary strand, so every daughter double helix keeps one old strand. Meselson and Stahl (1958) confirmed this with ¹⁵N/¹⁴N density labelling; "scattered segments" describes the rejected dispersive model.',
    },
    {
      id: 'c-okazaki-lagging-strand', d: 2, t: ['DNA structure and replication'],
      q: 'During DNA replication, Okazaki fragments are formed on the:',
      a: 'lagging strand',
      x: ['leading strand', 'mRNA transcript', 'coding strand during transcription'],
      e: 'DNA polymerase can build only in the 5′→3′ direction. The leading strand is made continuously towards the fork, while the lagging strand is made discontinuously as short Okazaki fragments, later joined by DNA ligase.',
    },
    {
      id: 'c-dna-replication-s-phase', d: 1, t: ['DNA structure and replication', 'mitosis and meiosis'],
      q: 'In the eukaryotic cell cycle, DNA replication takes place during the:',
      a: 'S phase',
      x: ['G₁ phase', 'G₂ phase', 'M phase'],
      e: 'The S (synthesis) phase of interphase is when DNA is replicated, so each chromosome comes to have two sister chromatids. G₁ and G₂ are growth phases and M is division.',
    },
    {
      id: 'c-nucleosome-octamer', d: 2, t: ['DNA structure and replication'],
      q: 'A nucleosome consists of DNA wound around a core of:',
      a: 'eight histone molecules',
      x: ['four histone molecules', 'a single H1 histone molecule', 'RNA and non-histone proteins'],
      e: 'The nucleosome core is a histone octamer (two each of H2A, H2B, H3 and H4) with about 147 base pairs of DNA wrapped around it; histone H1 binds the linker DNA outside the core.',
    },
    {
      id: 'c-centromere-sister-chromatids', d: 1, t: ['mitosis and meiosis'],
      q: 'The two sister chromatids of a replicated chromosome remain attached at the:',
      a: 'centromere',
      x: ['telomere', 'chiasma', 'nucleolar organiser'],
      e: 'Sister chromatids are held together at the centromere, where the kinetochore attaches to spindle fibres. A chiasma joins non-sister chromatids of homologous chromosomes; telomeres are the chromosome ends.',
    },

    // protein synthesis
    {
      id: 'c-start-codon', d: 1, o: 'past-paper', t: ['protein synthesis'],
      q: 'Translation of mRNA begins at the initiation (start) codon:',
      a: 'AUG',
      x: ['UAA', 'UAG', 'UGA'],
      e: 'AUG codes for methionine and signals the start of translation. UAA, UAG and UGA are stop (termination) codons that code for no amino acid.',
    },
    {
      id: 'c-anticodon-on-trna', d: 1, t: ['protein synthesis'],
      q: 'The anticodon that pairs with an mRNA codon during translation is part of:',
      a: 'tRNA',
      x: ['mRNA', 'rRNA', 'the DNA template strand'],
      e: 'Each tRNA carries a three-base anticodon in its anticodon loop; it base-pairs with the complementary codon of mRNA on the ribosome, placing the correct amino acid.',
    },
    {
      id: 'c-code-degenerate', d: 2, t: ['protein synthesis'],
      q: 'The genetic code is described as degenerate because:',
      a: 'most amino acids are coded by more than one codon',
      x: [
        'one codon codes for several different amino acids',
        'adjacent codons overlap and share bases',
        'the code differs from one organism to another',
      ],
      e: '61 sense codons code for only 20 amino acids, so most amino acids have several codons (e.g. leucine has six). The code is unambiguous (one codon, one amino acid), non-overlapping and nearly universal.',
    },
    {
      id: 'c-introns-removed', d: 2, t: ['protein synthesis'],
      q: 'In eukaryotes, the non-coding sequences removed from pre-mRNA during RNA processing are:',
      a: 'introns',
      x: ['exons', 'codons', 'promoters'],
      e: 'Introns are spliced out of the primary transcript and the coding exons are joined to form mature mRNA. A promoter is a DNA sequence where RNA polymerase binds; codons are base triplets in mRNA.',
    },

    // mitosis and meiosis
    {
      id: 'c-crossing-over-pachytene', d: 1, o: 'past-paper', t: ['mitosis and meiosis', 'linkage'],
      q: 'Crossing over between non-sister chromatids of homologous chromosomes occurs during:',
      a: 'pachytene',
      x: ['leptotene', 'zygotene', 'diakinesis'],
      e: 'Prophase I has five stages: leptotene (chromosomes condense), zygotene (synapsis begins), pachytene (crossing over), diplotene (chiasmata visible) and diakinesis (terminalisation of chiasmata).',
    },
    {
      id: 'c-synapsis-zygotene', d: 2, t: ['mitosis and meiosis'],
      q: 'Synapsis, the pairing of homologous chromosomes, begins during:',
      a: 'zygotene',
      x: ['leptotene', 'diplotene', 'diakinesis'],
      e: 'Homologues start pairing in zygotene to form bivalents held by the synaptonemal complex. In leptotene they are still unpaired threads; in diplotene and diakinesis they begin to separate, staying joined only at chiasmata.',
    },
    {
      id: 'c-homologues-separate', d: 2, t: ['mitosis and meiosis'],
      q: 'Homologous chromosomes separate and move to opposite poles during:',
      a: 'anaphase I of meiosis',
      x: ['anaphase II of meiosis', 'anaphase of mitosis', 'telophase II of meiosis'],
      e: 'In anaphase I whole homologous chromosomes (each still with two chromatids) move apart, halving the chromosome number. In anaphase II and in mitotic anaphase it is the sister chromatids that separate.',
    },
    {
      id: 'c-down-syndrome-trisomy', d: 1, t: ['mitosis and meiosis'],
      q: 'Down syndrome is caused by:',
      a: 'trisomy of chromosome 21',
      x: ['trisomy of chromosome 18', 'the karyotype 45, X', 'the karyotype 47, XXY'],
      e: 'Down syndrome results from an extra chromosome 21 (47 chromosomes in most cases), usually after non-disjunction in meiosis. Trisomy 18 is Edwards syndrome; 45, X is Turner syndrome and 47, XXY is Klinefelter syndrome.',
    },

    // Mendelian genetics
    {
      id: 'c-test-cross-definition', d: 1, o: 'past-paper', t: ['Mendelian genetics'],
      q: 'A test cross is a cross between an individual showing the dominant phenotype (unknown genotype) and:',
      a: 'a homozygous recessive individual',
      x: [
        'a homozygous dominant individual',
        'a heterozygous individual',
        'another individual of the same phenotype',
      ],
      e: 'Crossing with a homozygous recessive (aa) parent reveals the unknown genotype: all dominant offspring means AA, while a 1 : 1 ratio of dominant to recessive means Aa.',
    },
    {
      id: 'c-independent-assortment', d: 2, o: 'past-paper', t: ['Mendelian genetics', 'linkage'],
      q: 'Which pair of genes is expected to assort independently during gamete formation?',
      a: 'Genes located on different (non-homologous) chromosomes',
      x: [
        'Genes located close together on the same chromosome',
        'Two alleles of the same gene',
        'Genes completely linked on the X chromosome',
      ],
      e: 'Independent assortment follows from the random orientation of different homologous pairs at metaphase I, so it holds for genes on different chromosomes. Closely placed genes on one chromosome are linked and tend to be inherited together; two alleles of one gene segregate, they do not assort.',
    },
    {
      id: 'c-abo-codominance', d: 2, t: ['Mendelian genetics'],
      q: tex`A person with genotype $I^{A}I^{B}$ has blood group AB. This is because the alleles $I^{A}$ and $I^{B}$ show:`,
      a: 'codominance',
      x: ['incomplete dominance', 'epistasis', tex`complete dominance of $I^{A}$`],
      e: tex`Both $I^{A}$ and $I^{B}$ are fully expressed, so the red cells carry both A and B antigens: this is codominance. Incomplete dominance would give an intermediate phenotype, and $I^{A}$ dominance would give group A.`,
    },

    // linkage and sex determination
    {
      id: 'c-map-unit', d: 1, t: ['linkage'],
      q: 'One map unit (centimorgan) on a genetic (linkage) map corresponds to:',
      a: '1% recombination frequency',
      x: ['1% of the total DNA of the cell', '1000 base pairs of DNA', 'one micrometre of chromosome length'],
      e: 'Following Morgan and Sturtevant, map distance is measured by crossover (recombination) frequency: 1% recombinants between two genes = 1 map unit (1 cM). It is not a fixed physical length of DNA.',
    },
    {
      id: 'c-complete-linkage-test-cross', d: 3, t: ['linkage'],
      q: 'Two genes are completely linked (no crossing over). A heterozygote AB/ab is test-crossed with ab/ab. The offspring will show:',
      a: 'only the two parental types, in a 1 : 1 ratio',
      x: [
        'all four types, in a 1 : 1 : 1 : 1 ratio',
        'only the two recombinant types, in a 1 : 1 ratio',
        'four phenotypes in a 9 : 3 : 3 : 1 ratio',
      ],
      e: 'With no crossing over the AB/ab parent makes only AB and ab gametes, so the test cross gives AB/ab and ab/ab offspring (parental types) in a 1 : 1 ratio. A 1 : 1 : 1 : 1 ratio would mean independent assortment; 9 : 3 : 3 : 1 is a dihybrid F₂, not a test cross.',
    },
    {
      id: 'c-colour-blindness-males', d: 2, o: 'past-paper', t: ['sex determination'],
      q: 'Red–green colour blindness is far more common in men than in women because:',
      a: 'men have one X chromosome, so a single recessive allele is expressed',
      x: [
        'the allele for colour blindness is carried on the Y chromosome',
        'the allele is dominant in men but recessive in women',
        'women have two X chromosomes and so can never be affected',
      ],
      e: 'Colour blindness is X-linked recessive. Males are hemizygous (XY), so one recessive allele on the X shows. Females need two copies (XᶜXᶜ), which is rarer, but they can be affected; heterozygous women are carriers.',
    },
    {
      id: 'c-x-linked-dominant-pattern', d: 3, t: ['sex determination'],
      q: 'An affected father and an unaffected mother have children in whom every daughter is affected but no son is affected. The trait is most likely:',
      a: 'X-linked dominant',
      x: ['X-linked recessive', 'Y-linked', 'autosomal recessive'],
      e: 'A father passes his X to all daughters and his Y to all sons. If a dominant allele is on his X, every daughter shows the trait and no son does. An X-linked recessive allele would make daughters carriers only, and a Y-linked trait would appear in all sons.',
    },
  ]),
]);
