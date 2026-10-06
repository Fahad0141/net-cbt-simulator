/**
 * Biology (FSc XII): Ecosystems and Environment.
 *
 * Sub-topics: ecosystem, food chains, biogeochemical cycles, biomes, pollution.
 *
 * Conceptual items cover levels of ecological organisation, components of an
 * ecosystem, succession, trophic levels, ecological pyramids, productivity, the
 * nitrogen, carbon and phosphorus cycles, the major terrestrial biomes, and air
 * and water pollution (ozone depletion, acid rain, greenhouse effect,
 * eutrophication, BOD, biomagnification).
 *
 * Computational items: energy reaching a trophic level under the ten percent
 * law (forward and backward) and the efficiency of energy transfer.
 */
import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, statementQuestion, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

interface ReasonedStatement {
  text: string;
  reason: string;
}

/** "Which statement is correct / NOT correct?" with a reason for every displayed option. */
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
    if (!hit) throw new Error(`ecology: no reason recorded for "${text}"`);
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

/** Whole number with grouped thousands for math mode: 100000 becomes 100{,}000. */
const grouped = (x: number): string => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}');
const kj = (x: number): string => `$${grouped(x)}\\,\\mathrm{kJ}$`;
const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

/** Four-link grazing food chains with unambiguous trophic positions. */
const FOOD_CHAINS: readonly (readonly [string, string, string, string])[] = [
  ['grass', 'grasshopper', 'frog', 'snake'],
  ['phytoplankton', 'zooplankton', 'small fish', 'kingfisher'],
  ['wheat plant', 'mouse', 'snake', 'hawk'],
  ['grass', 'rabbit', 'snake', 'eagle'],
  ['cabbage plant', 'caterpillar', 'sparrow', 'hawk'],
  ['algae', 'mosquito larva', 'small fish', 'heron'],
  ['maize plant', 'locust', 'lizard', 'snake'],
];

const CONSUMER_ROLE = ['producer', 'primary consumer', 'secondary consumer', 'tertiary consumer'] as const;
const TROPHIC_ORDINAL = ['first', 'second', 'third', 'fourth'] as const;

/** Levels of organisation and their definitions. */
const TERMS: readonly { term: string; def: string }[] = [
  { term: 'Habitat', def: 'the particular place or physical surroundings in which an organism lives' },
  { term: 'Niche', def: 'the functional role of a species in its ecosystem, including what it eats and how it uses resources' },
  { term: 'Population', def: 'a group of individuals of the same species living in a particular area at the same time' },
  { term: 'Community', def: 'all the populations of different species living and interacting in a particular area' },
  { term: 'Ecosystem', def: 'a community of living organisms together with its non-living (abiotic) environment' },
  { term: 'Biosphere', def: 'the part of the Earth, including land, water and air, in which life exists' },
];

type Biome = 'tundra' | 'taiga (coniferous forest)' | 'tropical rain forest' | 'desert' | 'temperate grassland' | 'temperate deciduous forest';

const BIOMES: readonly { name: Biome; features: readonly string[]; note: string }[] = [
  {
    name: 'tundra',
    features: [
      'treeless plains with permanently frozen subsoil (permafrost), where mosses and lichens dominate',
      'a very short summer, permafrost below the surface and low-growing mosses, lichens and sedges',
    ],
    note: 'Tundra lies near the Arctic; its subsoil stays frozen (permafrost), so trees cannot root deeply.',
  },
  {
    name: 'taiga (coniferous forest)',
    features: [
      'long, very cold winters and forests dominated by evergreen conifers such as pine, spruce and fir',
      'needle-leaved, cone-bearing evergreen trees and long, snowy winters, in a belt just south of the tundra',
    ],
    note: 'Taiga is the northern coniferous forest of needle-leaved evergreens such as pine and spruce.',
  },
  {
    name: 'tropical rain forest',
    features: [
      'high temperature and heavy rainfall all year round, with a dense multi-layered canopy of broad-leaved evergreen trees',
      'warm, wet conditions throughout the year, many climbers and epiphytes, and a closed tall canopy',
    ],
    note: 'Tropical rain forests are hot and wet all year, with a layered canopy of broad-leaved evergreens.',
  },
  {
    name: 'desert',
    features: [
      'annual rainfall below about 25 cm and xerophytic plants such as cacti with water-storing tissues',
      'very low, irregular rainfall, extreme day-night temperature differences and drought-adapted plants',
    ],
    note: 'Deserts receive less than about 25 cm of rain a year, and their plants are xerophytes.',
  },
  {
    name: 'temperate grassland',
    features: [
      'rainfall too low to support forest but high enough to prevent desert, with grasses as the dominant plants',
      'deep fertile soils, few trees and large herds of grazing mammals feeding on grasses',
    ],
    note: 'Temperate grasslands get moderate rainfall, enough for grasses but too little for forest.',
  },
  {
    name: 'temperate deciduous forest',
    features: [
      'four distinct seasons and broad-leaved trees such as oak and maple that shed their leaves in autumn',
      'moderate rainfall and trees that lose all their leaves before winter and regrow them in spring',
    ],
    note: 'Temperate deciduous forests have four seasons; their broad-leaved trees shed leaves in autumn.',
  },
];

/** Pollutant-effect pairs; `conflicts` lists effects that would be arguably true for this pollutant. */
interface PollutantPair {
  id: string;
  pollutant: string;
  effect: string;
  /** The effect as a noun phrase that reads well after "responsible for". */
  phrase: string;
  note: string;
  conflicts: readonly string[];
}

const POLLUTANTS: readonly PollutantPair[] = [
  {
    id: 'cfc',
    pollutant: 'chlorofluorocarbons (CFCs)',
    effect: 'depletion of the ozone layer',
    phrase: 'the depletion of the ozone layer',
    note: 'CFCs release chlorine atoms in the stratosphere, and each chlorine atom destroys many ozone molecules.',
    conflicts: ['co2'],
  },
  {
    id: 'so2',
    pollutant: 'sulphur dioxide',
    effect: 'acid rain',
    phrase: 'acid rain',
    note: 'Sulphur dioxide dissolves in rainwater to form sulphurous and sulphuric acids, producing acid rain.',
    conflicts: [],
  },
  {
    id: 'co2',
    pollutant: 'carbon dioxide and methane',
    effect: 'enhanced greenhouse effect (global warming)',
    phrase: 'the enhanced greenhouse effect (global warming)',
    note: 'Carbon dioxide and methane absorb infrared radiation from the Earth, trapping heat and warming the planet.',
    conflicts: ['cfc', 'fert'],
  },
  {
    id: 'fert',
    pollutant: 'nitrates and phosphates from fertilisers',
    effect: 'eutrophication of lakes and ponds',
    phrase: 'the eutrophication of lakes and ponds',
    note: 'Excess nitrates and phosphates cause algal blooms; their decay uses up dissolved oxygen (eutrophication).',
    conflicts: ['co2', 'co'],
  },
  {
    id: 'co',
    pollutant: 'carbon monoxide',
    effect: 'reduced oxygen-carrying capacity of blood',
    phrase: 'a reduced oxygen-carrying capacity of the blood',
    note: 'Carbon monoxide binds haemoglobin far more strongly than oxygen, forming carboxyhaemoglobin.',
    conflicts: ['fert'],
  },
  {
    id: 'ddt',
    pollutant: 'DDT',
    effect: 'biomagnification along food chains',
    phrase: 'biomagnification along food chains',
    note: 'DDT is fat-soluble and not broken down, so its concentration rises at each higher trophic level.',
    conflicts: [],
  },
];

const CYCLE_TRUE: readonly ReasonedStatement[] = [
  {
    text: 'Rhizobium fixes atmospheric nitrogen in the root nodules of leguminous plants.',
    reason: 'Rhizobium lives symbiotically in root nodules of legumes such as peas, beans and gram.',
  },
  {
    text: 'Nitrosomonas oxidises ammonia to nitrite.',
    reason: 'This is the first step of nitrification.',
  },
  {
    text: 'Nitrobacter oxidises nitrite to nitrate.',
    reason: 'This is the second step of nitrification; plants absorb the nitrate.',
  },
  {
    text: 'Denitrifying bacteria convert nitrates back into nitrogen gas.',
    reason: 'Bacteria such as Pseudomonas return nitrogen to the atmosphere, mainly in waterlogged soils.',
  },
  {
    text: 'Photosynthesis removes carbon dioxide from the atmosphere and respiration returns it.',
    reason: 'These two processes are the main biological fluxes of the carbon cycle.',
  },
  {
    text: 'Lightning converts some atmospheric nitrogen into oxides of nitrogen.',
    reason: 'This atmospheric fixation adds nitrates to the soil through rain.',
  },
  {
    text: 'Ammonification releases ammonia from the proteins of dead organisms.',
    reason: 'Decomposers break down organic nitrogen compounds into ammonia.',
  },
];

const CYCLE_FALSE: readonly ReasonedStatement[] = [
  {
    text: 'Plants absorb nitrogen gas directly from the air through their stomata to make proteins.',
    reason: 'Plants cannot use $\\mathrm{N_2}$; they absorb nitrates and ammonium ions from the soil.',
  },
  {
    text: 'Rhizobium fixes nitrogen in the root nodules of wheat.',
    reason: 'Wheat is a cereal, not a legume; Rhizobium forms nodules on leguminous plants.',
  },
  {
    text: 'Denitrification increases the amount of nitrate in the soil.',
    reason: 'Denitrification removes nitrate from the soil by converting it into nitrogen gas.',
  },
  {
    text: 'Respiration removes carbon dioxide from the atmosphere.',
    reason: 'Respiration releases carbon dioxide; photosynthesis removes it.',
  },
  {
    text: 'Nitrogen makes up about 21% of the atmosphere.',
    reason: 'Nitrogen is about 78% of the atmosphere; oxygen is about 21%.',
  },
  {
    text: 'Nitrobacter converts ammonia directly into nitrogen gas.',
    reason: 'Nitrobacter oxidises nitrite to nitrate; denitrifying bacteria produce nitrogen gas.',
  },
];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('biology', 'ecology', (b) => [
  // ---------------- Food chains: ten percent law (dynamic) ----------------
  b.dynamic('ten-percent-energy', { difficulty: 2, origin: 'past-paper', tags: ['food chains'] }, (r) => {
    const mode = r.weighted(['forward', 'backward', 'efficiency'] as const, [2, 1, 1]);
    if (mode === 'efficiency') {
      const pct = r.pick([5, 8, 10, 12, 15, 20, 25]);
      const plants = r.multiple(2000, 40000, 1000);
      const herb = (plants * pct) / 100;
      const inverted = plants / herb; // producer ÷ herbivore instead of the reverse
      const { answer, distractors } = numericOptions(r, {
        correct: pct,
        // energy lost (100 − η), forgot ×100, inverted ratio (only when it terminates), decimal slip
        wrong: [100 - pct, pct / 100, ...(Number.isInteger(inverted * 10) ? [inverted] : []), pct / 10],
        format: (v) => `$${num(v)}\\%$`,
      });
      return {
        stem: `Producers in a field fix ${kj(plants)} of energy, of which ${kj(herb)} is transferred to the herbivores feeding on them. The efficiency of energy transfer from producers to herbivores is:`,
        answer,
        distractors,
        explanation: tex`Efficiency $= \dfrac{\text{energy at herbivore level}}{\text{energy at producer level}} \times 100 = \dfrac{${grouped(herb)}}{${grouped(plants)}} \times 100 = ${num(pct)}\%$.`,
      };
    }
    const k = r.int(1, 3); // 1 = primary, 2 = secondary, 3 = tertiary consumer
    const role = CONSUMER_ROLE[k] as string;
    if (mode === 'forward') {
      const producer = r.int(1, 9) * 10 ** r.int(4, 5);
      const energy = producer / 10 ** k;
      const { answer, distractors } = numericOptions(r, {
        correct: energy,
        // one level too few / too many, "10% lost" (×0.9 per level), divided by 10k
        wrong: [producer / 10 ** (k - 1), producer / 10 ** (k + 1), Math.round(producer * 0.9 ** k), producer / (10 * k)],
        format: kj,
      });
      return {
        stem: `In a food chain, producers fix ${kj(producer)} of energy. According to the ten percent law, the energy available to the ${role} is:`,
        answer,
        distractors,
        explanation: tex`About 10% of the energy passes from one trophic level to the next. The ${role} is ${k} transfer${k > 1 ? 's' : ''} above the producers, so energy $= ${grouped(producer)} \times (0.1)^{${k}} = ${grouped(energy)}\,\mathrm{kJ}$.`,
      };
    }
    const top = r.int(1, 9) * 10 ** r.int(1, 2);
    const producer = top * 10 ** k;
    const { answer, distractors } = numericOptions(r, {
      correct: producer,
      wrong: [top * 10 ** (k - 1), top * 10 ** (k + 1), top * 10 * k, top / 10],
      format: kj,
    });
    return {
      stem: `A ${role} in a food chain receives ${kj(top)} of energy. Assuming the ten percent law, the energy fixed by the producers of this chain was:`,
      answer,
      distractors,
      explanation: tex`Each trophic level receives about 10% of the energy of the level below. The ${role} is ${k} transfer${k > 1 ? 's' : ''} above the producers, so producers $= ${top} \times 10^{${k}} = ${grouped(producer)}\,\mathrm{kJ}$.`,
    };
  }),

  // ---------------- Food chains: trophic level of an organism (dynamic) ----------------
  b.dynamic('trophic-level-in-chain', { difficulty: 1, origin: 'past-paper', tags: ['food chains'] }, (r) => {
    const chain = r.pick(FOOD_CHAINS);
    const i = r.int(0, 3);
    const organism = chain[i] as string;
    const chainText = chain.join(' → ');
    const roles = chain.map((o, j) => `${capFirst(o)}: ${CONSUMER_ROLE[j]} (${TROPHIC_ORDINAL[j]} trophic level)`).join('; ');
    if (r.chance(0.5)) {
      const answer = CONSUMER_ROLE[i] as string;
      return {
        stem: `In the food chain ${chainText}, the ${organism} is the:`,
        answer,
        distractors: CONSUMER_ROLE.filter((x) => x !== answer),
        explanation: `${roles}. Producers make food; each consumer feeds on the level before it.`,
      };
    }
    const answer = `${TROPHIC_ORDINAL[i]} trophic level`;
    return {
      stem: `In the food chain ${chainText}, the ${organism} occupies the:`,
      answer,
      distractors: TROPHIC_ORDINAL.filter((_, j) => j !== i).map((o) => `${o} trophic level`),
      explanation: `${roles}. Trophic levels are counted from the producers, which form the first level.`,
    };
  }),

  // ---------------- Ecosystem: levels of organisation (dynamic) ----------------
  b.dynamic('ecological-terms', { difficulty: 1, tags: ['ecosystem'] }, (r) => {
    const item = r.pick(TERMS);
    const distractors = pickDistractors(
      item.term,
      TERMS.filter((t) => t !== item).map((t) => t.term),
      r,
    );
    const defs = [item, ...distractors.map((d) => TERMS.find((t) => t.term === d))]
      .map((t) => (t ? `${t.term}: ${t.def}.` : ''))
      .join(' ');
    return {
      stem: `The ecological term for ${item.def} is:`,
      answer: item.term,
      distractors,
      explanation: defs,
    };
  }),

  // ---------------- Biomes: identify from features (dynamic) ----------------
  b.dynamic('biome-by-feature', { difficulty: 1, tags: ['biomes'] }, (r) => {
    const biome = r.pick(BIOMES);
    const feature = r.pick(biome.features);
    const distractors = r.sample(
      BIOMES.filter((x) => x !== biome).map((x) => x.name),
      3,
    );
    return {
      stem: `Which biome is characterised by ${feature}?`,
      answer: biome.name,
      distractors,
      explanation: biome.note,
    };
  }),

  // ---------------- Pollution: pollutant and effect (dynamic) ----------------
  b.dynamic('pollutant-effect', { difficulty: 1, origin: 'past-paper', tags: ['pollution'] }, (r) => {
    const item = r.pick(POLLUTANTS);
    const others = POLLUTANTS.filter((p) => p !== item && !item.conflicts.includes(p.id));
    const chosen = r.sample(others, 3);
    if (r.chance(0.5)) {
      return {
        stem: `The main environmental or health problem caused by ${item.pollutant} is:`,
        answer: capFirst(item.effect),
        distractors: chosen.map((p) => capFirst(p.effect)),
        explanation: item.note,
      };
    }
    return {
      stem: `Which of the following is chiefly responsible for ${item.phrase}?`,
      answer: capFirst(item.pollutant),
      distractors: chosen.map((p) => capFirst(p.pollutant)),
      explanation: item.note,
    };
  }),

  // ---------------- Biogeochemical cycles: statements (dynamic) ----------------
  b.dynamic('cycle-statements', { difficulty: 2, tags: ['biogeochemical cycles'] }, (r) =>
    reasonedStatementQuestion(
      r,
      'Which of the following statements about biogeochemical cycles is correct?',
      'Which of the following statements about biogeochemical cycles is NOT correct?',
      CYCLE_TRUE,
      CYCLE_FALSE,
    ),
  ),

  // ---------------- Fixed items ----------------
  ...b.mcqs([
    // Ecosystem
    {
      id: 'decomposers', d: 1, t: ['ecosystem'],
      q: 'Most of the decomposers in an ecosystem are:',
      a: 'bacteria and fungi',
      x: ['green plants and algae', 'insects and birds', 'snakes and lizards'],
      e: 'Bacteria and fungi break down dead organic matter and release mineral nutrients back into the soil and water.',
    },
    {
      id: 'pioneer-on-bare-rock', d: 1, o: 'past-paper', t: ['ecosystem'],
      q: 'The pioneer organisms that first colonise bare rock during primary succession are usually:',
      a: 'lichens',
      x: ['mosses', 'ferns', 'grasses'],
      e: 'Lichens secrete acids that weather rock and begin soil formation; mosses, then grasses and ferns, follow later.',
    },
    {
      id: 'energy-one-way', d: 1, t: ['ecosystem'],
      q: 'In an ecosystem, the flow of energy and the movement of nutrients are respectively:',
      a: 'one-way; cyclic',
      x: ['cyclic; one-way', 'cyclic; cyclic', 'one-way; one-way'],
      e: 'Energy enters as sunlight and is lost as heat at every level, so it flows one way; nutrients are recycled by decomposers.',
    },
    {
      id: 'ultimate-energy-source', d: 1, t: ['ecosystem'],
      q: 'The ultimate source of energy for almost all ecosystems is:',
      a: 'sunlight',
      x: ['green plants', 'glucose', 'ATP'],
      e: 'Producers capture solar energy by photosynthesis; glucose and ATP only store energy that came from sunlight.',
    },
    {
      id: 'net-primary-productivity', d: 2, t: ['ecosystem'],
      q: 'Net primary productivity (NPP) of an ecosystem is equal to:',
      a: 'gross primary productivity minus energy used by producers in respiration',
      x: [
        'gross primary productivity plus energy used by producers in respiration',
        'gross primary productivity minus energy passed on to herbivores',
        'energy assimilated by herbivores minus their respiratory loss',
      ],
      e: 'NPP = GPP − R, where R is the producers’ own respiration. NPP is the energy stored as plant biomass and available to herbivores.',
    },
    // Food chains
    {
      id: 'detritus-chain-start', d: 1, t: ['food chains'],
      q: 'A detritus food chain begins with:',
      a: 'dead organic matter',
      x: ['living green plants', 'herbivorous animals', 'top carnivores'],
      e: 'Detritus chains start with dead remains and wastes, eaten by detritivores and decomposers; grazing chains start with living plants.',
    },
    {
      id: 'pyramid-of-energy', d: 2, o: 'past-paper', t: ['food chains'],
      q: 'Which ecological pyramid is always upright and can never be inverted?',
      a: 'pyramid of energy',
      x: ['pyramid of numbers', 'pyramid of biomass', 'age pyramid'],
      e: 'Energy is lost at each transfer, so each level always has less energy than the one below. Pyramids of numbers (tree ecosystem) and biomass (pond) can be inverted.',
    },
    {
      id: 'inverted-pyramid-of-numbers', d: 2, t: ['food chains'],
      q: 'A completely inverted pyramid of numbers is found in:',
      a: 'a parasitic food chain',
      x: ['a grassland food chain', 'a pond food chain', 'a crop-field food chain'],
      e: 'In a parasitic chain one host supports many parasites, which in turn support even more hyperparasites, so numbers increase upwards. In a pond the pyramid of biomass, not of numbers, is inverted.',
    },
    // Biogeochemical cycles
    {
      id: 'nitrogen-fixer-legumes', d: 1, o: 'past-paper', t: ['biogeochemical cycles'],
      q: 'Nitrogen-fixing bacteria living in the root nodules of leguminous plants belong to the genus:',
      a: 'Rhizobium',
      x: ['Nitrosomonas', 'Nitrobacter', 'Pseudomonas'],
      e: 'Rhizobium fixes $\\mathrm{N_2}$ in legume root nodules. Nitrosomonas and Nitrobacter are nitrifying bacteria; Pseudomonas is a denitrifier.',
    },
    {
      id: 'denitrification', d: 2, t: ['biogeochemical cycles'],
      q: 'Denitrification is the conversion of:',
      a: 'nitrates into nitrogen gas',
      x: ['nitrogen gas into ammonia', 'ammonia into nitrites', 'nitrites into nitrates'],
      e: 'Denitrifying bacteria reduce nitrates to $\\mathrm{N_2}$, returning nitrogen to the air. $\\mathrm{N_2}$ to ammonia is fixation; ammonia to nitrite to nitrate is nitrification.',
    },
    {
      id: 'nitrification-sequence', d: 2, o: 'past-paper', t: ['biogeochemical cycles'],
      q: 'During nitrification, Nitrosomonas and Nitrobacter respectively convert:',
      a: 'ammonia to nitrite; nitrite to nitrate',
      x: ['nitrite to nitrate; ammonia to nitrite', 'nitrate to nitrite; nitrite to ammonia', 'nitrogen gas to ammonia; ammonia to nitrate'],
      e: 'Nitrosomonas: $\\mathrm{NH_3 \\to NO_2^-}$; Nitrobacter: $\\mathrm{NO_2^- \\to NO_3^-}$. Both are chemosynthetic soil bacteria.',
    },
    {
      id: 'sedimentary-cycle', d: 2, t: ['biogeochemical cycles'],
      q: 'Which biogeochemical cycle has no significant gaseous phase, its main reservoir being rocks and sediments?',
      a: 'phosphorus cycle',
      x: ['carbon cycle', 'nitrogen cycle', 'water cycle'],
      e: 'Phosphorus is released by weathering of phosphate rocks and has no important gaseous form. Carbon ($\\mathrm{CO_2}$), nitrogen ($\\mathrm{N_2}$) and water (vapour) all cycle through the atmosphere.',
    },
    // Biomes
    {
      id: 'greatest-biodiversity', d: 1, o: 'past-paper', t: ['biomes'],
      q: 'The terrestrial biome with the greatest diversity of species is the:',
      a: 'tropical rain forest',
      x: ['taiga', 'tundra', 'temperate grassland'],
      e: 'Year-round warmth, heavy rainfall and a layered canopy create many niches, so tropical rain forests hold the most species of any land biome.',
    },
    {
      id: 'rain-forest-soil', d: 3, t: ['biomes'],
      q: 'Although tropical rain forests are highly productive, their soils are generally poor in nutrients because:',
      a: 'most nutrients are held in the living vegetation and are rapidly recycled',
      x: [
        'decomposition is extremely slow in the hot, wet climate',
        'the trees absorb no minerals from the soil',
        'low rainfall prevents minerals from dissolving',
      ],
      e: 'Decomposition is fast in hot, wet conditions, and released minerals are quickly taken up by roots (or leached by heavy rain), so most nutrients are stored in the biomass rather than the soil.',
    },
    // Pollution
    {
      id: 'ozone-layer-location', d: 1, o: 'past-paper', t: ['pollution'],
      q: 'The ozone layer that absorbs most of the harmful ultraviolet radiation from the Sun lies mainly in the:',
      a: 'stratosphere',
      x: ['troposphere', 'mesosphere', 'thermosphere'],
      e: 'The ozone layer lies in the stratosphere, roughly 15 to 35 km above the Earth, where it absorbs most UV-B radiation.',
    },
    {
      id: 'not-greenhouse-gas', d: 1, o: 'past-paper', t: ['pollution'],
      q: 'Which of the following is NOT a greenhouse gas?',
      a: 'nitrogen gas',
      x: ['carbon dioxide', 'methane', 'water vapour'],
      e: 'Greenhouse gases absorb infrared radiation. Diatomic $\\mathrm{N_2}$ does not; $\\mathrm{CO_2}$, $\\mathrm{CH_4}$ and water vapour do.',
    },
    {
      id: 'high-bod', d: 2, t: ['pollution'],
      q: 'A high biochemical oxygen demand (BOD) of a water sample indicates that the water:',
      a: 'is heavily polluted with organic matter',
      x: ['is pure and rich in dissolved oxygen', 'contains no microorganisms', 'is free of sewage'],
      e: 'BOD is the oxygen used by microorganisms to decompose organic matter in water; much organic waste (e.g. sewage) means a high BOD.',
    },
    {
      id: 'acid-rain-ph', d: 2, t: ['pollution'],
      q: 'Rain is described as acid rain when its pH falls below about:',
      a: '5.6',
      x: ['7.0', '6.5', '8.0'],
      e: 'Unpolluted rain is already slightly acidic (pH about 5.6) because dissolved $\\mathrm{CO_2}$ forms carbonic acid; rain more acidic than this, mainly from $\\mathrm{SO_2}$ and nitrogen oxides, is acid rain.',
    },
    {
      id: 'eutrophication-sequence', d: 3, t: ['pollution'],
      q: 'Which sequence correctly describes the eutrophication of a lake?',
      a: 'nutrient enrichment → algal bloom → decay by bacteria → fall in dissolved oxygen → death of fish',
      x: [
        'algal bloom → nutrient enrichment → fall in dissolved oxygen → decay by bacteria → death of fish',
        'nutrient enrichment → fall in dissolved oxygen → algal bloom → death of fish → decay by bacteria',
        'decay by bacteria → nutrient enrichment → death of fish → algal bloom → fall in dissolved oxygen',
      ],
      e: 'Fertiliser or sewage nutrients cause an algal bloom; when the algae die, aerobic bacteria decompose them and use up dissolved oxygen, so fish suffocate.',
    },
  ]),
]);
