import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, statementQuestion } from '@/engine/helpers';

/** Groups digits with commas: 102400 -> "102,400" (plain text, not math). */
const grouped = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------------------------------------------------------------------------
// Curated data
// ---------------------------------------------------------------------------

type Kingdom = 'Monera' | 'Protista' | 'Fungi' | 'Plantae' | 'Animalia';
const KINGDOMS: readonly Kingdom[] = ['Monera', 'Protista', 'Fungi', 'Plantae', 'Animalia'];

/** Organisms whose kingdom is the same in every textbook version of the five-kingdom system. */
const KINGDOM_EXAMPLES: ReadonlyArray<{ name: string; kingdom: Kingdom; note: string }> = [
  { name: 'Escherichia coli', kingdom: 'Monera', note: 'a prokaryotic bacterium' },
  { name: 'Nostoc', kingdom: 'Monera', note: 'a prokaryotic cyanobacterium' },
  { name: 'Streptococcus', kingdom: 'Monera', note: 'a prokaryotic bacterium' },
  { name: 'Rhizobium', kingdom: 'Monera', note: 'a nitrogen-fixing prokaryotic bacterium' },
  { name: 'Amoeba', kingdom: 'Protista', note: 'a unicellular eukaryote (protozoan)' },
  { name: 'Paramecium', kingdom: 'Protista', note: 'a unicellular ciliate protozoan' },
  { name: 'Plasmodium', kingdom: 'Protista', note: 'a unicellular parasitic protozoan' },
  { name: 'Trypanosoma', kingdom: 'Protista', note: 'a unicellular flagellate protozoan' },
  { name: 'Rhizopus', kingdom: 'Fungi', note: 'a mould with chitinous hyphae' },
  { name: 'Penicillium', kingdom: 'Fungi', note: 'a mould with chitinous hyphae' },
  { name: 'Agaricus (mushroom)', kingdom: 'Fungi', note: 'a club fungus (basidiomycete)' },
  { name: 'Saccharomyces (yeast)', kingdom: 'Fungi', note: 'a unicellular sac fungus' },
  { name: 'Funaria (a moss)', kingdom: 'Plantae', note: 'a bryophyte' },
  { name: 'Pinus', kingdom: 'Plantae', note: 'a gymnosperm' },
  { name: 'Adiantum (a fern)', kingdom: 'Plantae', note: 'a seedless vascular plant' },
  { name: 'Brassica (mustard)', kingdom: 'Plantae', note: 'a flowering plant' },
  { name: 'Hydra', kingdom: 'Animalia', note: 'a cnidarian' },
  { name: 'Sycon (a sponge)', kingdom: 'Animalia', note: 'a multicellular sponge (Porifera)' },
  { name: 'Ascaris', kingdom: 'Animalia', note: 'a roundworm (Nematoda)' },
  { name: 'Pheretima (earthworm)', kingdom: 'Animalia', note: 'an annelid' },
];

type Agent = 'virus' | 'bacterium' | 'protozoan' | 'fungus';
const AGENT_OPTION: Record<Agent, string> = {
  virus: 'Virus',
  bacterium: 'Bacterium',
  protozoan: 'Protozoan',
  fungus: 'Fungus',
};
const AGENT_ADJ: Record<Agent, string> = {
  virus: 'viral',
  bacterium: 'bacterial',
  protozoan: 'protozoan',
  fungus: 'fungal',
};
const DISEASES: ReadonlyArray<{ disease: string; agent: Agent; organism: string }> = [
  { disease: 'Poliomyelitis', agent: 'virus', organism: 'the poliovirus' },
  { disease: 'Measles', agent: 'virus', organism: 'the measles virus' },
  { disease: 'Mumps', agent: 'virus', organism: 'the mumps virus' },
  { disease: 'Rabies', agent: 'virus', organism: 'the rabies virus' },
  { disease: 'AIDS', agent: 'virus', organism: 'the human immunodeficiency virus (HIV)' },
  { disease: 'Hepatitis B', agent: 'virus', organism: 'the hepatitis B virus' },
  { disease: 'Smallpox', agent: 'virus', organism: 'the variola virus' },
  { disease: 'Dengue fever', agent: 'virus', organism: 'the dengue virus' },
  { disease: 'Tuberculosis', agent: 'bacterium', organism: 'Mycobacterium tuberculosis' },
  { disease: 'Cholera', agent: 'bacterium', organism: 'Vibrio cholerae' },
  { disease: 'Typhoid fever', agent: 'bacterium', organism: 'Salmonella typhi' },
  { disease: 'Tetanus', agent: 'bacterium', organism: 'Clostridium tetani' },
  { disease: 'Diphtheria', agent: 'bacterium', organism: 'Corynebacterium diphtheriae' },
  { disease: 'Leprosy', agent: 'bacterium', organism: 'Mycobacterium leprae' },
  { disease: 'Whooping cough', agent: 'bacterium', organism: 'Bordetella pertussis' },
  { disease: 'Malaria', agent: 'protozoan', organism: 'Plasmodium' },
  { disease: 'Amoebic dysentery', agent: 'protozoan', organism: 'Entamoeba histolytica' },
  { disease: 'African sleeping sickness', agent: 'protozoan', organism: 'Trypanosoma' },
  { disease: 'Kala-azar (leishmaniasis)', agent: 'protozoan', organism: 'Leishmania' },
  { disease: 'Giardiasis', agent: 'protozoan', organism: 'Giardia' },
  { disease: 'Ringworm', agent: 'fungus', organism: 'dermatophyte fungi such as Trichophyton' },
  { disease: "Athlete's foot", agent: 'fungus', organism: 'dermatophyte fungi such as Trichophyton' },
  { disease: 'Candidiasis (thrush)', agent: 'fungus', organism: 'the yeast Candida albicans' },
  { disease: 'Aspergillosis', agent: 'fungus', organism: 'the mould Aspergillus' },
];

type Phylum =
  | 'Porifera'
  | 'Cnidaria'
  | 'Platyhelminthes'
  | 'Nematoda'
  | 'Annelida'
  | 'Arthropoda'
  | 'Mollusca'
  | 'Echinodermata'
  | 'Chordata';
const PHYLA: readonly Phylum[] = [
  'Porifera',
  'Cnidaria',
  'Platyhelminthes',
  'Nematoda',
  'Annelida',
  'Arthropoda',
  'Mollusca',
  'Echinodermata',
  'Chordata',
];
/** [organism, phylum, a tempting wrong phylum] */
const ANIMALS: ReadonlyArray<readonly [string, Phylum, Phylum]> = [
  ['Sycon', 'Porifera', 'Cnidaria'],
  ['Spongilla (freshwater sponge)', 'Porifera', 'Cnidaria'],
  ['Hydra', 'Cnidaria', 'Porifera'],
  ['Aurelia (jellyfish)', 'Cnidaria', 'Mollusca'],
  ['the sea anemone', 'Cnidaria', 'Echinodermata'],
  ['Planaria', 'Platyhelminthes', 'Annelida'],
  ['Fasciola (liver fluke)', 'Platyhelminthes', 'Nematoda'],
  ['Taenia (tapeworm)', 'Platyhelminthes', 'Nematoda'],
  ['Ascaris', 'Nematoda', 'Annelida'],
  ['the hookworm (Ancylostoma)', 'Nematoda', 'Platyhelminthes'],
  ['Pheretima (earthworm)', 'Annelida', 'Nematoda'],
  ['the leech (Hirudo)', 'Annelida', 'Platyhelminthes'],
  ['Nereis', 'Annelida', 'Arthropoda'],
  ['the cockroach', 'Arthropoda', 'Annelida'],
  ['the scorpion', 'Arthropoda', 'Mollusca'],
  ['the prawn', 'Arthropoda', 'Mollusca'],
  ['the silverfish (Lepisma)', 'Arthropoda', 'Chordata'],
  ['Pila (apple snail)', 'Mollusca', 'Arthropoda'],
  ['the octopus', 'Mollusca', 'Cnidaria'],
  ['the cuttlefish (Sepia)', 'Mollusca', 'Chordata'],
  ['the starfish (Asterias)', 'Echinodermata', 'Cnidaria'],
  ['the sea urchin', 'Echinodermata', 'Mollusca'],
  ['the sea cucumber', 'Echinodermata', 'Mollusca'],
  ['the seahorse (Hippocampus)', 'Chordata', 'Echinodermata'],
  ['the frog (Rana)', 'Chordata', 'Arthropoda'],
];
const PHYLUM_NOTE: Record<Phylum, string> = {
  Porifera: 'pore-bearing sponges with a cellular level of organisation',
  Cnidaria: 'diploblastic, radially symmetrical animals with cnidocytes (stinging cells)',
  Platyhelminthes: 'dorsoventrally flattened, acoelomate flatworms',
  Nematoda: 'unsegmented, pseudocoelomate roundworms',
  Annelida: 'metamerically segmented, coelomate worms',
  Arthropoda: 'animals with jointed appendages and a chitinous exoskeleton',
  Mollusca: 'soft-bodied animals with a mantle, often secreting a shell',
  Echinodermata: 'spiny-skinned marine animals with a water vascular system',
  Chordata: 'animals with a notochord, a dorsal hollow nerve cord and pharyngeal slits',
};

type PlantGroup = 'Bryophytes' | 'Pteridophytes' | 'Gymnosperms' | 'Angiosperms';
const PLANT_GROUPS: readonly PlantGroup[] = ['Bryophytes', 'Pteridophytes', 'Gymnosperms', 'Angiosperms'];
const PLANT_GROUP_NOTE: Record<PlantGroup, string> = {
  Bryophytes: 'non-vascular plants with a dominant gametophyte',
  Pteridophytes: 'seedless vascular plants with a dominant sporophyte',
  Gymnosperms: 'vascular plants bearing naked seeds (not enclosed in a fruit)',
  Angiosperms: 'flowering plants whose seeds are enclosed in a fruit',
};
const PLANTS: ReadonlyArray<readonly [string, PlantGroup]> = [
  ['Funaria (a moss)', 'Bryophytes'],
  ['Marchantia (a liverwort)', 'Bryophytes'],
  ['Anthoceros (a hornwort)', 'Bryophytes'],
  ['Polytrichum (a moss)', 'Bryophytes'],
  ['Riccia (a liverwort)', 'Bryophytes'],
  ['Adiantum (maidenhair fern)', 'Pteridophytes'],
  ['Dryopteris (a fern)', 'Pteridophytes'],
  ['Equisetum (horsetail)', 'Pteridophytes'],
  ['Selaginella (spike moss)', 'Pteridophytes'],
  ['Lycopodium (club moss)', 'Pteridophytes'],
  ['Pinus (pine)', 'Gymnosperms'],
  ['Cycas', 'Gymnosperms'],
  ['Ephedra', 'Gymnosperms'],
  ['Ginkgo', 'Gymnosperms'],
  ['Cedrus deodara (deodar)', 'Gymnosperms'],
  ['Rosa (rose)', 'Angiosperms'],
  ['Triticum (wheat)', 'Angiosperms'],
  ['Pisum sativum (pea)', 'Angiosperms'],
  ['Brassica (mustard)', 'Angiosperms'],
  ['Mangifera indica (mango)', 'Angiosperms'],
];

type Locomotion = 'pseudopodia' | 'cilia' | 'flagella' | 'none';
const LOCOMOTION_OPTION: Record<Locomotion, string> = {
  pseudopodia: 'Pseudopodia',
  cilia: 'Cilia',
  flagella: 'Flagella',
  none: 'None; it lacks locomotory organelles',
};
const PROTOZOA: ReadonlyArray<readonly [string, Locomotion, string]> = [
  ['Amoeba proteus', 'pseudopodia', 'an amoeboid protozoan (sarcodine)'],
  ['Entamoeba histolytica', 'pseudopodia', 'an amoeboid protozoan (sarcodine)'],
  ['Paramecium', 'cilia', 'a ciliate'],
  ['Trypanosoma', 'flagella', 'a zooflagellate'],
  ['Giardia', 'flagella', 'a zooflagellate'],
  ['Trichonympha', 'flagella', 'a zooflagellate living in the gut of termites'],
  ['Euglena', 'flagella', 'a euglenoid flagellate'],
  [
    'Plasmodium',
    'none',
    'an apicomplexan (sporozoan). Sporozoans have no cilia, flagella or pseudopodia for locomotion; their infective stages glide or are carried passively in body fluids (only the short-lived male gametes formed inside the mosquito bear flagella)',
  ],
];

// ---------------------------------------------------------------------------

export default defineBank('biology', 'diversity-of-life', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('organism-kingdom', { difficulty: 1, origin: 'past-paper', tags: ['classification'] }, (r) => {
    const o = r.pick(KINGDOM_EXAMPLES);
    const wrong = r.sample(
      KINGDOMS.filter((k) => k !== o.kingdom),
      3,
    );
    return {
      stem: `In the five-kingdom system of classification, ${o.name} is placed in kingdom:`,
      answer: o.kingdom,
      distractors: wrong,
      explanation: `${o.name} is ${o.note}, so it belongs to kingdom ${o.kingdom}. (Monera: prokaryotes; Protista: simple eukaryotes; Fungi: absorptive heterotrophs with chitin walls; Plantae: multicellular photosynthetic eukaryotes; Animalia: multicellular ingestive heterotrophs.)`,
    };
  }),

  b.dynamic(
    'disease-causative-agent',
    { difficulty: 1, origin: 'past-paper', tags: ['viruses', 'bacteria', 'protists', 'fungi'] },
    (r) => {
      if (r.chance(0.5)) {
        const d = r.pick(DISEASES);
        return {
          stem: `${d.disease} is caused by a:`,
          answer: AGENT_OPTION[d.agent],
          distractors: (Object.keys(AGENT_OPTION) as Agent[])
            .filter((a) => a !== d.agent)
            .map((a) => AGENT_OPTION[a]),
          explanation: `${d.disease} is a ${AGENT_ADJ[d.agent]} disease: it is caused by ${d.organism}.`,
        };
      }
      const agent = r.pick(Object.keys(AGENT_OPTION) as Agent[]);
      const right = r.pick(DISEASES.filter((d) => d.agent === agent));
      const others = (Object.keys(AGENT_OPTION) as Agent[])
        .filter((a) => a !== agent)
        .map((a) => r.pick(DISEASES.filter((d) => d.agent === a)));
      return {
        stem: `Which of the following diseases is caused by a ${agent}?`,
        answer: right.disease,
        distractors: others.map((d) => d.disease),
        explanation: `${right.disease} is a ${AGENT_ADJ[agent]} disease: it is caused by ${right.organism}. ${others
          .map((d) => `${d.disease} is a ${AGENT_ADJ[d.agent]} disease`)
          .join('; ')}.`,
      };
    },
  ),

  b.dynamic('bacterial-population-growth', { difficulty: 2, tags: ['bacteria'] }, (r) => {
    const n0 = r.pick([2, 3, 4, 5, 10, 20, 50, 100]);
    const g = r.pick([15, 20, 30]);
    const n = r.int(3, 10);
    const t = n * g;
    const N = n0 * 2 ** n;
    const time = t % 60 === 0 ? `${t / 60} hour${t === 60 ? '' : 's'}` : `${t} minutes`;
    const { answer, distractors } = numericOptions(r, {
      correct: N,
      wrong: [n0 * 2 ** (n - 1), n0 * 2 ** (n + 1), 2 ** n, n0 * 2 * n, n0 * 2 ** (n + 2)],
      format: (x) => `${grouped(x)} bacteria`,
    });
    return {
      stem: `A bacterium divides by binary fission once every ${g} minutes. Starting with ${n0} bacteria and assuming no cell dies, the number of bacteria after ${time} is:`,
      answer,
      distractors,
      explanation: `Number of generations $n = \\dfrac{t}{g} = \\dfrac{${t}}{${g}} = ${n}$. Each generation doubles the population, so $N = N_0 \\times 2^n = ${n0} \\times 2^{${n}} = ${n0} \\times ${2 ** n} = ${N}$ bacteria.`,
    };
  }),

  b.dynamic('bacterial-generation-time', { difficulty: 3, tags: ['bacteria'] }, (r) => {
    const g = r.pick([15, 20, 25, 30, 40, 45]);
    const n = r.int(3, 8);
    const t = n * g;
    const n0 = r.pick([10, 50, 100, 200, 500, 1000]);
    const N = n0 * 2 ** n;
    const { answer, distractors } = numericOptions(r, {
      correct: g,
      wrong: [t / (n - 1), t / (n + 1), t / 2 ** n, t / (2 * n), 2 * g],
      format: (x) => `${num(x)} min`,
    });
    return {
      stem: `A culture of ${grouped(n0)} bacterial cells grows to ${grouped(N)} cells in ${t} minutes during the log phase. The generation (doubling) time of the bacterium is:`,
      answer,
      distractors,
      explanation: `$\\dfrac{N}{N_0} = \\dfrac{${N}}{${n0}} = ${2 ** n} = 2^{${n}}$, so the population passed through $n = ${n}$ generations. Generation time $= \\dfrac{t}{n} = \\dfrac{${t}}{${n}} = ${g}$ min. (Dividing $${t}$ by the fold increase $${2 ** n}$ instead of by $n$ is the common slip.)`,
    };
  }),

  b.dynamic('animal-phylum', { difficulty: 1, origin: 'past-paper', tags: ['animal kingdom'] }, (r) => {
    const [name, phylum, trap] = r.pick(ANIMALS);
    const rest = r.shuffle(PHYLA.filter((p) => p !== phylum && p !== trap));
    const distractors = pickDistractors(phylum, [trap, ...rest]);
    return {
      stem: `${name.charAt(0).toUpperCase()}${name.slice(1)} belongs to phylum:`,
      answer: phylum,
      distractors,
      explanation: `${name.charAt(0).toUpperCase()}${name.slice(1)} is a member of ${phylum}: ${PHYLUM_NOTE[phylum]}.`,
    };
  }),

  b.dynamic('plant-group', { difficulty: 1, tags: ['plant kingdom'] }, (r) => {
    const [name, group] = r.pick(PLANTS);
    return {
      stem: `${name} belongs to the group:`,
      answer: group,
      distractors: PLANT_GROUPS.filter((g) => g !== group),
      explanation: `${name} is one of the ${group.toLowerCase()}: ${PLANT_GROUP_NOTE[group]}.`,
    };
  }),

  b.dynamic('protozoan-locomotion', { difficulty: 1, tags: ['protists'] }, (r) => {
    const [name, mode, note] = r.pick(PROTOZOA);
    return {
      stem: `Which type of locomotory organelle does ${name} use?`,
      answer: LOCOMOTION_OPTION[mode],
      distractors: (Object.keys(LOCOMOTION_OPTION) as Locomotion[])
        .filter((m) => m !== mode)
        .map((m) => LOCOMOTION_OPTION[m]),
      explanation:
        mode === 'none'
          ? `${name} is ${note}.`
          : `${name} is ${note}; it moves by ${
              mode === 'pseudopodia'
                ? 'pseudopodia (amoeboid movement)'
                : mode === 'cilia'
                  ? 'the beating of its cilia'
                  : 'the lashing of its flagellum (or flagella)'
            }.`,
    };
  }),

  b.dynamic('virus-statements', { difficulty: 2, origin: 'past-paper', tags: ['viruses'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about viruses is correct?',
      negativeStem: 'Which of the following statements about viruses is NOT correct?',
      truths: [
        'Viruses can reproduce only inside living host cells.',
        'A virion contains either DNA or RNA as its genetic material.',
        'Viruses have no ribosomes of their own.',
        'Tobacco mosaic virus can be crystallised.',
        'Bacteriophages are viruses that infect bacteria.',
        'Antibiotics are not effective against viral infections.',
        'The capsid of a virus is built from protein subunits called capsomeres.',
      ],
      falsehoods: [
        'Viruses reproduce by binary fission.',
        'Viruses have a cell wall made of peptidoglycan.',
        'Viruses carry out respiration to make their own ATP.',
        'Penicillin destroys most viruses.',
        'All viruses contain both DNA and RNA.',
        'Viruses use their own ribosomes to make proteins.',
        'Viruses are typically larger than bacteria.',
      ],
      explain: (a, inverted) =>
        inverted
          ? `"${a}" is false. Viruses are acellular obligate parasites: they have no cell wall, ribosomes or metabolism of their own, contain a single type of nucleic acid, are much smaller than typical bacteria and are unaffected by antibiotics.`
          : `"${a}" is true. Viruses are acellular obligate intracellular parasites; they lack ribosomes and enzymes for metabolism, contain a single type of nucleic acid and are unaffected by antibiotics.`,
    }),
  ),

  b.dynamic('fungi-statements', { difficulty: 2, tags: ['fungi'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about fungi is correct?',
      negativeStem: 'Which of the following statements about fungi is NOT correct?',
      truths: [
        'The cell walls of fungi are made mainly of chitin.',
        'Fungi absorb food after digesting it outside their bodies.',
        'Fungi store surplus food mainly as glycogen and oil.',
        'The body of most fungi is a mycelium of thread-like hyphae.',
        'Yeasts are unicellular fungi that reproduce asexually by budding.',
        'Many fungi are saprotrophs that decompose dead organic matter.',
      ],
      falsehoods: [
        'Fungi contain chlorophyll and make their own food.',
        'The cell walls of fungi are made mainly of cellulose.',
        'Fungi store surplus food mainly as starch.',
        'Fungi are prokaryotes with no nuclear envelope.',
        'All fungi are multicellular.',
        'Fungi take in food particles by phagocytosis.',
      ],
      explain: (a, inverted) =>
        inverted
          ? `"${a}" is false. Fungi are eukaryotic, non-photosynthetic absorptive heterotrophs with chitin cell walls; they store glycogen (not starch), and some, such as yeasts, are unicellular.`
          : `"${a}" is true. Fungi are eukaryotic absorptive heterotrophs (no chlorophyll) with chitin cell walls and glycogen as stored food; most are made of hyphae, while yeasts are unicellular.`,
    }),
  ),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    // classification
    {
      id: 'binomial-nomenclature-founder', d: 1, o: 'past-paper', t: ['classification'],
      q: 'The binomial system of naming organisms was introduced by:',
      a: 'Carolus Linnaeus',
      x: ['Aristotle', 'Robert Whittaker', 'Ernst Haeckel'],
      e: 'Carolus Linnaeus (18th century) gave every species a two-part name: genus + specific epithet. Whittaker proposed the five kingdoms and Haeckel the kingdom Protista.',
    },
    {
      id: 'five-kingdom-proposer', d: 1, o: 'past-paper', t: ['classification'],
      q: 'The five-kingdom system of classification was proposed by:',
      a: 'Robert Whittaker',
      x: ['Carolus Linnaeus', 'Ernst Haeckel', 'Carl Woese'],
      e: 'Robert Whittaker proposed five kingdoms (Monera, Protista, Fungi, Plantae, Animalia) in 1969. Haeckel proposed a third kingdom, Protista, and Woese the three-domain system.',
    },
    {
      id: 'taxa-sequence', d: 1, t: ['classification'],
      q: 'Which sequence of taxonomic ranks runs correctly from the highest to the lowest?',
      a: 'Phylum, Class, Order, Family, Genus',
      x: [
        'Phylum, Order, Class, Family, Genus',
        'Class, Phylum, Order, Genus, Family',
        'Phylum, Class, Family, Order, Genus',
      ],
      e: 'The hierarchy is Kingdom > Phylum (Division in plants) > Class > Order > Family > Genus > Species.',
    },
    {
      id: 'three-domains-not', d: 2, t: ['classification'],
      q: 'Which of the following is NOT one of the three domains of life?',
      a: 'Protista',
      x: ['Archaea', 'Bacteria', 'Eukarya'],
      e: "Carl Woese's three domains are Bacteria, Archaea and Eukarya. Protista is a kingdom inside the domain Eukarya.",
    },

    // viruses
    {
      id: 'tmv-crystallised', d: 2, o: 'past-paper', t: ['viruses'],
      q: 'Tobacco mosaic virus was first isolated in crystalline form by:',
      a: 'W. M. Stanley',
      x: ['D. Ivanowsky', 'M. W. Beijerinck', 'Louis Pasteur'],
      e: 'W. M. Stanley crystallised TMV in 1935. Ivanowsky (1892) showed the agent passes through bacterial filters, and Beijerinck called it a "contagious living fluid".',
    },
    {
      id: 'virus-capsid', d: 1, t: ['viruses'],
      q: 'The protein coat that surrounds the nucleic acid of a virus is called the:',
      a: 'capsid',
      x: ['envelope', 'capsomere', 'cell wall'],
      e: 'The capsid is the protein coat; it is made of many subunits called capsomeres. An envelope is an extra lipid membrane that only some viruses have, and viruses never have a cell wall.',
    },
    {
      id: 'hiv-reverse-transcriptase', d: 2, o: 'past-paper', t: ['viruses'],
      q: 'HIV makes a DNA copy of its RNA genome with the help of the enzyme:',
      a: 'reverse transcriptase',
      x: ['RNA polymerase', 'restriction endonuclease', 'DNA ligase'],
      e: 'HIV is a retrovirus. Its reverse transcriptase (an RNA-dependent DNA polymerase) copies viral RNA into DNA, which is then integrated into the host genome.',
    },
    {
      id: 'hiv-target-cells', d: 1, t: ['viruses'],
      q: 'HIV mainly attacks and destroys the:',
      a: 'helper T lymphocytes',
      x: ['red blood cells', 'B lymphocytes', 'blood platelets'],
      e: 'HIV binds to the CD4 receptor on helper T lymphocytes. Losing these cells weakens the whole immune response, producing AIDS.',
    },
    {
      id: 'prophage', d: 1, t: ['viruses'],
      q: 'In the lysogenic cycle, phage DNA that has been inserted into the bacterial chromosome is called a:',
      a: 'prophage',
      x: ['capsid', 'plasmid', 'virion'],
      e: 'Integrated phage DNA is a prophage; it is copied along with the bacterial chromosome until it is induced to enter the lytic cycle. A plasmid is a separate, free circle of DNA.',
    },
    {
      id: 'viroid', d: 2, t: ['viruses'],
      q: 'Infectious agents made only of a short circular RNA molecule with no protein coat are called:',
      a: 'viroids',
      x: ['prions', 'virions', 'bacteriophages'],
      e: 'Viroids are naked circular RNA molecules that infect plants. Prions are infectious proteins with no nucleic acid, while virions and bacteriophages have protein coats.',
    },

    // bacteria
    {
      id: 'gram-positive-wall', d: 2, t: ['bacteria'],
      q: 'Gram-positive bacteria stay purple after Gram staining because their cell wall has:',
      a: 'a thick peptidoglycan layer',
      x: ['an outer lipopolysaccharide membrane', 'a thick layer of cellulose', 'a thick layer of chitin'],
      e: 'The thick peptidoglycan (murein) layer holds the crystal violet-iodine complex. Gram-negative bacteria have a thin peptidoglycan layer and an outer lipopolysaccharide membrane, so they lose the dye and take up the pink counterstain.',
    },
    {
      id: 'staphylococci', d: 1, t: ['bacteria'],
      q: 'Spherical bacteria that occur in irregular, grape-like clusters are called:',
      a: 'staphylococci',
      x: ['streptococci', 'diplococci', 'bacilli'],
      e: 'Staphylo- means "bunch of grapes". Streptococci form chains, diplococci form pairs, and bacilli are rod-shaped.',
    },
    {
      id: 'transduction', d: 2, o: 'past-paper', t: ['bacteria'],
      q: 'The transfer of bacterial genes from one bacterium to another by a bacteriophage is called:',
      a: 'transduction',
      x: ['transformation', 'conjugation', 'binary fission'],
      e: 'In transduction a phage carries bacterial DNA to a new host. In transformation a cell takes up free DNA from its surroundings, and in conjugation DNA passes through a pilus between two cells.',
    },
    {
      id: 'endospore-function', d: 2, t: ['bacteria'],
      q: 'The main role of endospores formed by bacteria such as Bacillus and Clostridium is to:',
      a: 'survive unfavourable conditions',
      x: ['reproduce sexually', 'carry out photosynthesis', 'move towards nutrients'],
      e: 'One cell forms one endospore, which germinates into one cell, so the number of cells does not increase. Endospores are resistant resting structures that survive heat, drying and chemicals.',
    },
    {
      id: 'nostoc-prokaryote', d: 2, t: ['bacteria'],
      q: 'Which of the following is a prokaryote?',
      a: 'Nostoc',
      x: ['Chlamydomonas', 'Spirogyra', 'Euglena'],
      e: 'Nostoc is a cyanobacterium (once called a "blue-green alga") and has no nucleus. Chlamydomonas, Spirogyra and Euglena are eukaryotes.',
    },

    // protists
    {
      id: 'malaria-vector', d: 1, o: 'past-paper', t: ['protists'],
      q: 'Plasmodium, the malarial parasite, is passed to humans by the bite of the:',
      a: 'female Anopheles mosquito',
      x: ['male Anopheles mosquito', 'female Culex mosquito', 'sand fly'],
      e: 'Only female Anopheles mosquitoes feed on blood and inject Plasmodium sporozoites. Male mosquitoes feed on plant juices, Culex spreads filariasis, and the sand fly spreads Leishmania.',
    },
    {
      id: 'diatom-wall', d: 1, t: ['protists'],
      q: 'The cell walls (frustules) of diatoms are made mainly of:',
      a: 'silica',
      x: ['chitin', 'calcium carbonate', 'peptidoglycan'],
      e: 'Diatoms have glass-like walls of silica made in two overlapping halves. Their deposits form diatomaceous earth.',
    },
    {
      id: 'brown-algae-pigment', d: 2, t: ['protists'],
      q: 'The brown colour of brown algae such as kelps is due to the pigment:',
      a: 'fucoxanthin',
      x: ['phycoerythrin', 'phycocyanin', 'anthocyanin'],
      e: 'Brown algae (Phaeophyta) contain the brown carotenoid fucoxanthin, which masks their chlorophyll. Phycoerythrin colours red algae, and phycocyanin colours cyanobacteria blue-green.',
    },

    // fungi
    {
      id: 'penicillin-source', d: 1, o: 'past-paper', t: ['fungi'],
      q: 'The antibiotic penicillin is obtained from:',
      a: 'Penicillium, a fungus',
      x: ['Streptomyces, a bacterium', 'Rhizopus, a fungus', 'Agaricus, a fungus'],
      e: 'Alexander Fleming discovered penicillin (1928) from the mould Penicillium. Streptomyces gives streptomycin; Rhizopus is a bread mould and Agaricus is a mushroom.',
    },
    {
      id: 'lichen-partners', d: 1, t: ['fungi'],
      q: 'A lichen is a mutualistic association between a fungus and:',
      a: 'an alga or a cyanobacterium',
      x: ['the roots of a seed plant', 'a nitrogen-fixing virus', 'a parasitic nematode'],
      e: 'In a lichen the photosynthetic partner (a green alga or cyanobacterium) supplies food, and the fungus gives shelter, water and minerals. A fungus living with plant roots forms a mycorrhiza.',
    },
    {
      id: 'rhizopus-group', d: 2, t: ['fungi'],
      q: 'The black bread mould Rhizopus belongs to the fungal group:',
      a: 'Zygomycota',
      x: ['Ascomycota', 'Basidiomycota', 'Deuteromycota'],
      e: 'Rhizopus forms thick-walled zygospores in sexual reproduction, so it is a zygomycete. Yeasts and Penicillium are ascomycetes, and mushrooms are basidiomycetes.',
    },

    // plant kingdom
    {
      id: 'moss-dominant-generation', d: 2, t: ['plant kingdom'],
      q: 'In mosses, the dominant and independent generation of the life cycle is the:',
      a: 'haploid gametophyte',
      x: ['diploid sporophyte', 'haploid sporophyte', 'diploid gametophyte'],
      e: 'The leafy moss plant is the haploid ($n$) gametophyte. The diploid ($2n$) sporophyte grows on it and depends on it for food. In vascular plants the sporophyte is dominant.',
    },
    {
      id: 'double-fertilisation', d: 1, t: ['plant kingdom'],
      q: 'Double fertilisation, which forms a zygote and a triploid endosperm, is a characteristic feature of:',
      a: 'angiosperms',
      x: ['gymnosperms', 'ferns', 'mosses'],
      e: 'In angiosperms one sperm fuses with the egg (forming a $2n$ zygote) and the other with two polar nuclei (forming the $3n$ endosperm). Gymnosperms have a haploid nutritive tissue, not a triploid endosperm.',
    },
    {
      id: 'monocot-feature', d: 2, t: ['plant kingdom'],
      q: 'Which feature is typical of monocots?',
      a: 'Parallel venation in leaves',
      x: ['Two cotyledons in the seed', 'Reticulate venation in leaves', 'Floral parts in fours or fives'],
      e: 'Monocots have one cotyledon, parallel venation, scattered vascular bundles and floral parts in threes. The other options are dicot features.',
    },

    // animal kingdom
    {
      id: 'pseudocoelomate-phylum', d: 2, t: ['animal kingdom'],
      q: 'Which phylum is made up of pseudocoelomate animals?',
      a: 'Nematoda',
      x: ['Platyhelminthes', 'Annelida', 'Mollusca'],
      e: 'Roundworms (Nematoda) have a body cavity that is not fully lined by mesoderm (a pseudocoelom). Flatworms are acoelomate, while annelids and molluscs are true coelomates.',
    },
    {
      id: 'chordate-character-not', d: 2, t: ['animal kingdom'],
      q: 'Which of the following is NOT a fundamental characteristic of chordates?',
      a: 'A ventral solid nerve cord',
      x: ['A notochord', 'A dorsal hollow nerve cord', 'Pharyngeal gill slits'],
      e: 'Chordates have, at some stage, a notochord, a dorsal hollow nerve cord and pharyngeal gill slits. A ventral solid nerve cord is found in non-chordates such as annelids and arthropods.',
    },
    {
      id: 'true-fish', d: 3, o: 'past-paper', t: ['animal kingdom'],
      q: 'Which of the following animals is a true fish?',
      a: 'Seahorse',
      x: ['Starfish', 'Jellyfish', 'Cuttlefish'],
      e: 'The seahorse (Hippocampus) is a bony fish with gills, fins and a vertebral column. The starfish is an echinoderm, the jellyfish a cnidarian and the cuttlefish a mollusc, despite their names.',
    },
    {
      id: 'echinoderm-deuterostome', d: 3, t: ['animal kingdom'],
      q: 'Echinoderms are placed with chordates as deuterostomes because in their embryos:',
      a: 'the blastopore becomes the anus',
      x: ['the blastopore becomes the mouth', 'the body is radially symmetrical', 'a water vascular system develops'],
      e: 'In deuterostomes (echinoderms, chordates) the blastopore forms the anus and the mouth forms later; in protostomes it forms the mouth. Adult radial symmetry and the water vascular system are features of echinoderms only.',
    },
  ]),
]);
