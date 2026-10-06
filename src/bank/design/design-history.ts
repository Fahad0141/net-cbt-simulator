import { defineBank } from '@/engine/authoring';
import { pickDistractors } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import {
  ARTISTS,
  ART_FAMILY,
  BUILDINGS,
  CLIMATE_FEATURES,
  CRAFTS,
  DESIGNERS,
  DYNASTY_FAMILY,
  IDEAS,
  MONUMENTS,
  MOVEMENTS,
  PK_NOT_UNESCO,
  PK_UNESCO,
  SCRIPTS,
  STYLE_FAMILY,
  type Artist,
  type Building,
  type Craft,
  type Monument,
} from './_design-history';

/**
 * Design, chapter "Design History and Context": PART A (data-driven items built from the
 * verified tables in `_design-history.ts`). Part B (conceptual and fixed items) lives in
 * `design-history.concepts.ts`, whose ids all start with `c-`; the angles used here are
 * chosen so the two files do not ask the same question type.
 */

const TAGS = {
  people: 'iconic artists and designers',
  movements: 'design movements',
  crafts: 'local crafts',
  islamic: 'Islamic art and architecture',
  environment: 'man and environment',
} as const;

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** `n` distinct items of `pool` that pass `ok`; throws when the data cannot supply them. */
function pickOthers<T>(r: Rng, pool: readonly T[], ok: (x: T) => boolean, n = 3): T[] {
  const eligible = pool.filter(ok);
  if (eligible.length < n) throw new Error(`only ${eligible.length} eligible distractors`);
  return r.sample(eligible, n);
}

// ------------------------------------------------------------------ artists

/** Titles that take "the" in running text ("the Mona Lisa"). */
const THE_TITLES = new Set(['Mona Lisa']);
/** A painting title in quotes, or a lower-case description ("the Water Lilies series") as is. */
const workText = (w: string): string => (/^the /.test(w) ? w : THE_TITLES.has(w) ? `the "${w}"` : `"${w}"`);
const PAINTING_MOVEMENTS = Object.keys(ART_FAMILY);
const famOf = (movement: string): string => ART_FAMILY[movement] ?? movement;
/** True when artist `a` could arguably be linked with `movement`. */
const linked = (a: Artist, movement: string): boolean =>
  famOf(a.movement) === famOf(movement) || (a.avoid ?? []).includes(movement);
/** "the Renaissance" / "the Baroque" / "Cubism". */
const periodLabel = (m: string): string => (m === 'Renaissance' || m === 'Baroque' ? `the ${m}` : m);

// ------------------------------------------------------------------ movements

const ORIGIN_MOVEMENTS = MOVEMENTS.filter((m): m is (typeof MOVEMENTS)[number] & { origin: string } => m.origin !== null);
/** "the Netherlands", "the USA", "France". */
const country = (c: string): string => (c === 'Netherlands' || c === 'USA' ? `the ${c}` : c);
const ORIGINS = [...new Set(ORIGIN_MOVEMENTS.map((m) => m.origin))];

// ------------------------------------------------------------------ buildings

const NO_ARTICLE = new Set(['Fallingwater', 'Villa Savoye', '30 St Mary Axe ("the Gherkin")', 'Burj Khalifa', "Humayun's Tomb", 'Al-Azhar Mosque']);
/** "the Seagram Building" / "Fallingwater". */
const the = (name: string): string => (NO_ARTICLE.has(name) ? name : `the ${name}`);
const where = (loc: string | null): string => (loc ? ` in ${loc}` : '');
const an = (word: string): string => (/^[AEIOU]/.test(word) ? `an ${word}` : `a ${word}`);

const STYLED = BUILDINGS.filter((x): x is Building & { style: string } => x.style !== null);
const STYLES = Object.keys(STYLE_FAMILY);
const styleFam = (s: string): string => STYLE_FAMILY[s] ?? s;
/** One-line hallmark of each style, for explanations. */
const STYLE_NOTE: Readonly<Record<string, string>> = {
  Modernism: 'plain, unornamented forms in steel, glass and concrete',
  'High-tech': 'structure and services exposed and celebrated',
  'Organic architecture': 'a building in harmony with its natural site',
  'De Stijl': 'planes and lines in primary colours, black and white',
  'Art Deco': 'stepped, geometric ornament and luxurious materials',
  'Art Nouveau': 'flowing, plant-like curves',
  'Arts and Crafts': 'handcraft and honest vernacular materials',
  Postmodernism: 'playful historical references, colour and ornament',
  Deconstructivism: 'fragmented, distorted, non-rectilinear forms',
};
const styleNote = (s: string): string => STYLE_NOTE[s] ?? '';
/** International landmarks (Pakistani buildings are covered by the contemporary-practice chapter). */
const WORLD_BUILDINGS = BUILDINGS.filter((x) => !/Pakistan/.test(`${x.name} ${x.location ?? ''}`));
/**
 * Buildings for the matching-pair item. The Glass House is left out because Philip Johnson
 * co-designed the Seagram Building with Mies, so "Seagram Building - Philip Johnson" would
 * be arguable.
 */
const PAIR_BUILDINGS = WORLD_BUILDINGS.filter((x) => x.architect !== 'Philip Johnson');

// ------------------------------------------------------------------ designers

/** Objects already asked about by the sibling concepts file are left out here. */
const SIBLING_OBJECTS = new Set(['Marcel Breuer', 'Arne Jacobsen', 'Gerrit Rietveld']);
const ICON_DESIGNERS = DESIGNERS.filter((d) => !SIBLING_OBJECTS.has(d.name));
/** How a designer's movement reads after "associated with". */
const MOVEMENT_LABEL: Readonly<Record<string, string>> = {
  Bauhaus: 'the Bauhaus',
  'Memphis Group': 'the Memphis Group',
  'Arts and Crafts': 'the Arts and Crafts movement',
};
const movementLabel = (m: string): string => MOVEMENT_LABEL[m] ?? m;

/**
 * Writings and theories (the sibling file covers the famous one-line maxims). `notWith` lists
 * people too closely linked to the idea to serve as distractors (Wright took the "organic"
 * ideal from his mentor Louis Sullivan).
 */
const THEORIES: ReadonlyArray<{ idea: string; verb: string; notWith?: readonly string[] }> = [
  { idea: 'the term "organic architecture"', verb: 'is most closely associated with', notWith: ['Louis Sullivan'] },
  { idea: 'the book "A Pattern Language" (1977)', verb: 'was written chiefly by' },
  { idea: 'the book "The Seven Lamps of Architecture" (1849)', verb: 'was written by' },
  { idea: 'the "Five Points of a New Architecture" (pilotis, free plan, free facade, ribbon windows, roof garden)', verb: 'were set out by' },
  { idea: 'the book "Complexity and Contradiction in Architecture" (1966)', verb: 'was written by' },
];
const IDEA_PEOPLE = [...new Set(IDEAS.map((i) => i.person))];

// ------------------------------------------------------------------ Islamic monuments

const DYNASTIES = Object.keys(DYNASTY_FAMILY);
const dynFam = (d: string): string => DYNASTY_FAMILY[d] ?? d;
/** Monuments outside Pakistan (Pakistani sites and their cities are in the sibling file). */
const WORLD_MONUMENTS = MONUMENTS.filter(
  (m): m is Monument & { location: string } => m.location !== null && !/Pakistan/.test(m.location),
);

// ------------------------------------------------------------------ crafts

/** Region questions (the sibling file covers the town-based crafts of Multan, Chiniot and Peshawar). */
const REGION_ITEMS: ReadonlyArray<{ craft: string; stem: string; why: string }> = [
  {
    craft: 'Ajrak',
    stem: 'Ajrak, the block-printed cloth in deep indigo and crimson, is a traditional craft of:',
    why: 'Ajrak is resist block-printed in indigo and madder red, and is a symbol of Sindhi identity, worn as a shawl or turban and gifted as a mark of respect.',
  },
  {
    craft: 'Chunri',
    stem: 'Chunri, the brightly dotted tie-and-dye cloth worn as a dupatta, is a traditional craft of:',
    why: 'Chunri is made in Sindh by tying thousands of tiny points of cloth with thread before dyeing, which leaves a pattern of small undyed dots.',
  },
  {
    craft: 'Ralli quilts',
    stem: 'Ralli, the quilt made from patchwork and applique of cotton scraps, is a traditional craft of:',
    why: 'Ralli quilts are stitched by women in Sindh (and neighbouring desert areas) from cotton scraps joined with running stitch into bold geometric patterns.',
  },
  {
    craft: 'Kashi (glazed tile) work',
    stem: 'Kashi-kari, the craft of blue-and-white glazed tiles seen on Sufi shrines, is most closely associated with:',
    why: 'Multan, with its tile-clad shrines such as that of Shah Rukn-e-Alam, is the best-known centre of kashi-kari (Hala in Sindh is another).',
  },
  {
    craft: 'Onyx carving',
    stem: 'The banded onyx that Pakistani craftsmen turn into vases and bowls is mainly quarried in:',
    why: 'Pakistani onyx comes mainly from the Chagai district of Balochistan; it is then cut and polished in workshops in cities such as Karachi and Peshawar.',
  },
];
const CRAFT_BY_NAME = new Map(CRAFTS.map((c) => [c.craft, c] as const));
const craftNamed = (name: string): Craft => {
  const c = CRAFT_BY_NAME.get(name);
  if (!c) throw new Error(`unknown craft ${name}`);
  return c;
};
const PROVINCE_CRAFTS = CRAFTS.filter(
  (c): c is Craft & { region: string } => c.region === 'Sindh' || c.region === 'Balochistan',
);
/** Craft names as options ("Kashi (glazed tile) work" reads fine; "Ajrak" etc. are proper names). */
const craftOpt = (c: Craft): string => c.craft;

// ------------------------------------------------------------------ man and environment

/**
 * Wind catchers and thick walls already have questions in the sibling file, and the jali,
 * courtyard and evaporative pool are asked clue-to-name by `c-passive-strategy` in the
 * contemporary-practice chapter; they stay here only as distractors.
 */
const FEATURE_TARGETS = CLIMATE_FEATURES.filter(
  (f) => !/^Wind catcher|^Thick|^Jali|^Central shaded courtyard|^Fountain/.test(f.feature),
);

export default defineBank('design', 'design-history', (b) => [
  // ================================================================ artists and designers
  b.dynamic('painter-movement', { difficulty: 1, origin: 'past-paper', tags: [TAGS.people, TAGS.movements] }, (r) => {
    const artist = r.pick(ARTISTS);
    const work = workText(r.pick(artist.works));
    if (r.chance(0.55)) {
      const wrong = pickOthers(r, PAINTING_MOVEMENTS, (m) => !linked(artist, m));
      return {
        stem: `${artist.name}, the ${artist.nationality} artist who created ${work}, is associated with which art movement or period?`,
        answer: artist.movement,
        distractors: wrong,
        explanation: `${artist.name} is a leading figure of ${periodLabel(artist.movement)}; ${work} is among the artist's best-known works. ${wrong.join(', ')} belong to other periods and artists.`,
      };
    }
    const wrong = pickOthers(r, ARTISTS, (a) => !linked(a, artist.movement) && a.name !== artist.name);
    return {
      stem: `Which of the following artists is associated with **${periodLabel(artist.movement)}**?`,
      answer: artist.name,
      distractors: wrong.map((a) => a.name),
      explanation: `${artist.name} (${work}) belongs to ${periodLabel(artist.movement)}. ${wrong.map((a) => `${a.name}: ${a.movement}`).join('; ')}.`,
    };
  }),

  b.dynamic('painting-artist', { difficulty: 1, origin: 'past-paper', tags: [TAGS.people] }, (r) => {
    const [artist, ...others] = r.sample(ARTISTS, 4) as [Artist, Artist, Artist, Artist];
    const work = r.pick(artist.works);
    if (r.chance(0.5)) {
      return {
        stem: `Which artist created ${workText(work)}?`,
        answer: artist.name,
        distractors: others.map((a) => a.name),
        explanation: `${cap(workText(work))} is by ${artist.name} (${artist.movement}). ${others.map((a) => `${a.name} is known for ${workText(a.works[0] ?? '')}`).join('; ')}.`,
      };
    }
    const wrongWorks = others.map((a) => r.pick(a.works));
    return {
      stem: `Which of the following is a famous work of **${artist.name}**?`,
      answer: cap(work),
      distractors: wrongWorks.map(cap),
      explanation: `${cap(workText(work))} is by ${artist.name}. The others: ${others.map((a, i) => `${workText(wrongWorks[i] ?? '')} is by ${a.name}`).join('; ')}.`,
    };
  }),

  b.dynamic('designer-icon', { difficulty: 1, origin: 'past-paper', tags: [TAGS.people] }, (r) => {
    const [d, ...others] = r.sample(ICON_DESIGNERS, 4) as [
      (typeof DESIGNERS)[number],
      (typeof DESIGNERS)[number],
      (typeof DESIGNERS)[number],
      (typeof DESIGNERS)[number],
    ];
    const role = d.name.includes(' and ') ? 'designers' : 'designer';
    const label = d.movement ? `${d.nationality} ${role} associated with ${movementLabel(d.movement)}` : `${d.nationality} graphic ${role}`;
    if (r.chance(0.5)) {
      return {
        stem: `Who designed ${d.work}?`,
        answer: d.name,
        distractors: others.map((o) => o.name),
        explanation: `${cap(d.work)} is by ${d.name}, the ${label}. ${others.map((o) => `${o.name}: ${o.work}`).join('; ')}.`,
      };
    }
    return {
      stem: `Which of the following is a celebrated design by **${d.name}**?`,
      answer: cap(d.work),
      distractors: others.map((o) => cap(o.work)),
      explanation: `${d.name}, the ${label}, created ${d.work}. The others are by ${others.map((o) => o.name).join(', ')}.`,
    };
  }),

  b.dynamic('theory-author', { difficulty: 3, tags: [TAGS.people, TAGS.movements] }, (r) => {
    const t = r.pick(THEORIES);
    const info = IDEAS.find((i) => i.idea === t.idea);
    if (!info) throw new Error(`missing idea ${t.idea}`);
    const wrong = pickOthers(r, IDEA_PEOPLE, (p) => p !== info.person && !(t.notWith ?? []).includes(p));
    return {
      stem: `${cap(t.idea)} ${t.verb}:`,
      answer: info.person,
      distractors: wrong,
      explanation: `${cap(t.idea)} ${t.verb} ${info.person}. ${info.note}`,
    };
  }),

  // ================================================================ movements
  b.dynamic('movement-origin', { difficulty: 2, tags: [TAGS.movements] }, (r) => {
    const m = r.pick(ORIGIN_MOVEMENTS);
    const label = m.name === 'Bauhaus' ? 'the Bauhaus' : m.name;
    if (r.chance(0.5)) {
      const wrong = pickOthers(r, ORIGINS, (o) => o !== m.origin);
      return {
        stem: `In which country did **${label}** originate?`,
        answer: m.origin,
        distractors: wrong,
        explanation: `${cap(label)} began in ${country(m.origin)}; period: ${m.era}. Key figures: ${m.figures}. Defining idea: ${lower(m.trait)}.`,
      };
    }
    const wrong = pickOthers(r, ORIGIN_MOVEMENTS, (x) => x.origin !== m.origin);
    return {
      stem: `Which of the following movements originated in **${country(m.origin)}**?`,
      answer: m.name,
      distractors: wrong.map((x) => x.name),
      explanation: `${cap(label)} began in ${country(m.origin)}; period: ${m.era}; key figures: ${m.figures}. ${wrong.map((x) => `${x.name}: ${x.origin}`).join('; ')}.`,
    };
  }),

  // ================================================================ buildings
  b.dynamic('building-style', { difficulty: 2, tags: [TAGS.movements, TAGS.people] }, (r) => {
    const bd = r.pick(STYLED);
    const wrong = pickOthers(
      r,
      STYLES,
      (s) => styleFam(s) !== styleFam(bd.style) && !(bd.avoid ?? []).includes(s),
    );
    return {
      stem: `${cap(the(bd.name))}${where(bd.location)}, designed by ${bd.architect}, is a landmark of which architectural style?`,
      answer: bd.style,
      distractors: wrong,
      explanation: `${cap(the(bd.name))} by ${bd.architect} is a key example of ${bd.style} (${styleNote(bd.style)}). The other styles: ${wrong.map((s) => `${s} (${styleNote(s)})`).join('; ')}.`,
    };
  }),

  b.dynamic('building-architect-pair', { difficulty: 2, origin: 'past-paper', tags: [TAGS.people] }, (r) => {
    // Four buildings by four different architects.
    const chosen: Building[] = [];
    for (const bd of r.shuffle(PAIR_BUILDINGS)) {
      if (chosen.every((c) => c.architect !== bd.architect)) chosen.push(bd);
      if (chosen.length === 4) break;
    }
    const [right, p, q, s] = chosen as [Building, Building, Building, Building];
    // Rotate the architects of the other three, so every wrong pair is a genuine mismatch.
    const wrongPairs: Array<[Building, string]> = [
      [p, q.architect],
      [q, s.architect],
      [s, p.architect],
    ];
    const pair = (name: string, who: string): string => `${name} – ${who}`;
    return {
      stem: 'Which building is correctly matched with its architect?',
      answer: pair(right.name, right.architect),
      distractors: wrongPairs.map(([bd, who]) => pair(bd.name, who)),
      explanation: `${cap(the(right.name))} was designed by ${right.architect}. Correct pairs for the others: ${[p, q, s].map((x) => `${the(x.name)} – ${x.architect}`).join('; ')}.`,
    };
  }),

  // ================================================================ Islamic art and architecture
  b.dynamic('monument-dynasty', { difficulty: 2, origin: 'past-paper', tags: [TAGS.islamic] }, (r) => {
    const m = r.pick(MONUMENTS);
    const wrong = pickOthers(r, DYNASTIES, (d) => dynFam(d) !== dynFam(m.dynasty));
    const plural = /\bGardens\b/.test(m.name);
    return {
      stem: `${cap(the(m.name))}${where(m.location)}${m.location?.includes(',') ? ',' : ''} ${plural ? 'were' : 'was'} built under which dynasty?`,
      answer: m.dynasty,
      distractors: wrong,
      explanation: `${cap(the(m.name))} ${plural ? 'are' : 'is'} ${an(m.dynasty)} monument (${m.note}). ${wrong.join(', ')} are other Islamic dynasties.`,
    };
  }),

  b.dynamic('monument-location', { difficulty: 1, tags: [TAGS.islamic] }, (r) => {
    const m = r.pick(WORLD_MONUMENTS);
    const wrong = pickDistractors(m.location, WORLD_MONUMENTS.map((x) => x.location), r);
    return {
      stem: `${cap(the(m.name))} is located in:`,
      answer: m.location,
      distractors: wrong,
      explanation: `${cap(the(m.name))}, ${an(m.dynasty)} monument, stands in ${m.location} (${m.note}).`,
    };
  }),

  b.dynamic('calligraphy-script', { difficulty: 2, tags: [TAGS.islamic] }, (r) => {
    const [s, ...others] = r.sample(SCRIPTS, 4) as [
      (typeof SCRIPTS)[number],
      (typeof SCRIPTS)[number],
      (typeof SCRIPTS)[number],
      (typeof SCRIPTS)[number],
    ];
    if (r.chance(0.5)) {
      return {
        stem: `Which style of Islamic calligraphy fits this description: "${s.meaning}"?`,
        answer: s.term,
        distractors: others.map((o) => o.term),
        explanation: `${s.term}: ${lower(s.meaning)}. ${others.map((o) => `${o.term}: ${lower(o.meaning)}`).join('; ')}.`,
      };
    }
    return {
      stem: `The **${s.term}** script of Islamic calligraphy is best described as:`,
      answer: s.meaning,
      distractors: others.map((o) => o.meaning),
      explanation: `${s.term} is ${lower(s.meaning)}. The other descriptions fit ${others.map((o) => o.term).join(', ')}.`,
    };
  }),

  // ================================================================ crafts of Pakistan
  b.dynamic('craft-region', { difficulty: 1, origin: 'past-paper', tags: [TAGS.crafts] }, (r) => {
    if (r.chance(0.6)) {
      const item = r.pick(REGION_ITEMS);
      const c = craftNamed(item.craft);
      const answer = c.region ?? '';
      const wrong = pickOthers(r, ['Sindh', 'Multan', 'Balochistan', 'Chiniot', 'Peshawar', 'Gilgit-Baltistan'], (x) => !c.regions.includes(x));
      return {
        stem: item.stem,
        answer,
        distractors: wrong,
        explanation: `${item.why} ${wrong.join(', ')} are known for other crafts.`,
      };
    }
    const c = r.pick(PROVINCE_CRAFTS);
    const wrong = pickOthers(r, CRAFTS, (x) => x.region !== null && !x.regions.includes(c.region));
    return {
      stem: `Which traditional craft is most closely associated with **${c.region}**?`,
      answer: craftOpt(c),
      distractors: wrong.map(craftOpt),
      explanation: `The craft of ${c.craft} (${lower(c.technique)}) belongs to ${c.region}. ${wrong.map((x) => `${x.craft}: ${x.region ?? ''}`).join('; ')}.`,
    };
  }),

  b.dynamic('craft-technique', { difficulty: 2, tags: [TAGS.crafts] }, (r) => {
    const c = r.pick(CRAFTS);
    const wrong = pickOthers(r, CRAFTS, (x) => x.craft !== c.craft && (x.group === undefined || x.group !== c.group));
    if (r.chance(0.5)) {
      return {
        stem: `Which description best matches the Pakistani craft of **${c.craft}**?`,
        answer: c.technique,
        distractors: wrong.map((x) => x.technique),
        explanation: `${c.craft}: ${lower(c.technique)}. The other techniques belong to ${wrong.map((x) => x.craft).join(', ')}.`,
      };
    }
    return {
      stem: `Which Pakistani craft matches this description: "${c.technique}"?`,
      answer: c.craft,
      distractors: wrong.map((x) => x.craft),
      explanation: `${c.craft}: ${lower(c.technique)}. ${wrong.map((x) => `${x.craft}: ${lower(x.technique)}`).join('; ')}.`,
    };
  }),

  // ================================================================ man and environment
  b.dynamic('climate-feature', { difficulty: 1, tags: [TAGS.environment] }, (r) => {
    const f = r.pick(FEATURE_TARGETS);
    const wrong = pickOthers(r, CLIMATE_FEATURES, (x) => x.feature !== f.feature && !x.tags.some((t) => f.tags.includes(t)));
    if (r.chance(0.5)) {
      return {
        stem: `In traditional climate-responsive buildings, what is the main purpose of this feature?\n\n**${f.feature}**`,
        answer: f.purpose,
        distractors: wrong.map((x) => x.purpose),
        explanation: `${f.feature}: ${lower(f.purpose)}. The other purposes belong to these features: ${wrong.map((x) => lower(x.feature)).join('; ')}.`,
      };
    }
    return {
      stem: `Which traditional building feature ${lower(f.purpose)}?`,
      answer: f.feature,
      distractors: wrong.map((x) => x.feature),
      explanation: `${f.feature}: ${lower(f.purpose)}. ${wrong.map((x) => `${x.feature}: ${lower(x.purpose)}`).join('; ')}.`,
    };
  }),

  b.dynamic('unesco-not-listed', { difficulty: 2, origin: 'past-paper', tags: [TAGS.islamic, TAGS.environment] }, (r) => {
    const answer = r.pick(PK_NOT_UNESCO);
    const wrong = r.sample(PK_UNESCO, 3);
    return {
      stem: 'Which of the following is NOT a UNESCO World Heritage Site in Pakistan?',
      answer,
      distractors: wrong,
      explanation: `${answer} is a modern landmark and is not on the World Heritage List. Pakistan's six cultural World Heritage Sites are: ${PK_UNESCO.join('; ')}.`,
    };
  }),

  // ================================================================ fixed items
  ...b.mcqs([
    {
      id: 'impressionism-name', d: 1, o: 'past-paper', t: [TAGS.movements, TAGS.people],
      q: 'The name "Impressionism" was taken from the title of a painting by:',
      a: 'Claude Monet',
      x: ['Edgar Degas', 'Paul Cezanne', 'Vincent van Gogh'],
      e: 'A critic mocked Monet\'s "Impression, Sunrise" at the 1874 group exhibition in Paris, and the label stuck. Degas exhibited with the group but did not paint that picture; Cezanne and van Gogh are Post-Impressionists.',
    },
    {
      id: 'guernica-subject', d: 1, t: [TAGS.people],
      q: 'Pablo Picasso\'s large monochrome painting "Guernica" (1937) responds to:',
      a: 'the bombing of a Basque town during the Spanish Civil War',
      x: [
        'the sinking of a passenger liner in the Atlantic Ocean',
        'a peaceful harvest festival in the French countryside',
        'the opening of the first Paris Metro line in 1900',
      ],
      e: 'Guernica shows the suffering caused by the April 1937 aerial bombing of the Basque town of Guernica by German and Italian aircraft supporting Franco. Its grey, black and white palette and fragmented Cubist forms heighten the horror.',
    },
    {
      id: 'art-nouveau-names', d: 3, t: [TAGS.movements],
      q: 'Art Nouveau was known in Germany as Jugendstil. In Austria (Vienna) it was known as:',
      a: 'the Secession style',
      x: ['Stile Liberty', 'Modernisme', 'De Stijl'],
      e: 'In Vienna the style grew out of the Vienna Secession (1897) of Gustav Klimt, Josef Hoffmann and Joseph Maria Olbrich, hence "Secession style". Stile Liberty is the Italian name and Modernisme the Catalan one (Gaudi); De Stijl is a separate Dutch movement of straight lines and primary colours.',
    },
    {
      id: 'bauhaus-founded-weimar', d: 2, t: [TAGS.movements, TAGS.people],
      q: 'Walter Gropius founded the Bauhaus school in 1919 in the city of:',
      a: 'Weimar',
      x: ['Dessau', 'Berlin', 'Munich'],
      e: 'The Bauhaus opened in Weimar in 1919. It moved to Dessau in 1925, into the building Gropius designed for it, then to Berlin in 1932, and closed under Nazi pressure in 1933. It never had a base in Munich.',
    },
    {
      id: 'memphis-group', d: 3, t: [TAGS.movements, TAGS.people],
      q: 'The Memphis Group, formed in Milan in the early 1980s around Ettore Sottsass, is best known for:',
      a: 'bold colours, clashing patterns and playful plastic-laminate furniture',
      x: [
        'hand-woven textiles that revived medieval guild craftsmanship',
        'severe white furniture built strictly on a modular grid',
        'organic, whiplash-curved ironwork drawn from plant stems',
      ],
      e: 'Memphis was a Postmodern reaction against "good taste" Modernism: loud colours, kitsch patterns and cheap laminates (for example Sottsass\'s Carlton room divider). Guild craftsmanship describes Arts and Crafts, white modular austerity describes Modernism, and whiplash curves describe Art Nouveau.',
    },
    {
      id: 'hypostyle-mosque', d: 2, t: [TAGS.islamic],
      q: 'A mosque plan in which a large flat-roofed prayer hall is carried on many rows of columns, as in the Great Mosque of Cordoba, is called:',
      a: 'a hypostyle plan',
      x: ['a four-iwan plan', 'a central-dome plan', 'a charbagh plan'],
      e: '"Hypostyle" means "under columns": the early Arab mosques (Damascus, Kairouan, Cordoba) spread a forest of columns across the prayer hall. The four-iwan plan is Persian, the central-dome plan is Ottoman, and a charbagh is a four-part garden, not a mosque.',
    },
    {
      id: 'ottoman-mosque-form', d: 2, t: [TAGS.islamic],
      q: 'A vast central dome buttressed by cascading semi-domes and flanked by slender, pencil-shaped minarets is characteristic of:',
      a: 'Ottoman mosques',
      x: ['Mughal mosques', 'Umayyad mosques', 'Fatimid mosques'],
      e: 'Ottoman architects such as Mimar Sinan (Suleymaniye and Selimiye mosques) developed the central dome on semi-domes with needle-like minarets. Mughal mosques use bulbous domes and chhatri-topped minarets; Umayyad mosques are hypostyle halls; Fatimid mosques in Cairo are courtyard-and-arcade buildings.',
    },
    {
      id: 'mughal-double-dome', d: 3, t: [TAGS.islamic],
      q: 'Mughal tombs such as Humayun\'s Tomb and the Taj Mahal use a double dome (an inner and an outer shell) mainly to:',
      a: 'give a tall outer silhouette while keeping the inner ceiling in proportion',
      x: [
        'store rainwater in the gap between the two shells',
        'let daylight reach the tomb chamber through the gap',
        'remove the need for walls under the dome',
      ],
      e: 'The outer shell rises high to dominate the skyline, while the lower inner shell keeps the chamber\'s ceiling at a height that suits the room. The cavity is not a water tank or a light shaft, and the domes still rest on massive walls. Humayun\'s Tomb is usually credited as the first major Mughal building with a tall Persian-style double dome.',
    },
    {
      id: 'dancing-girl', d: 1, o: 'past-paper', t: [TAGS.crafts],
      q: 'The famous bronze statuette known as the "Dancing Girl" (c. 2500 BCE) was discovered at:',
      a: 'Mohenjo-daro',
      x: ['Taxila', 'Takht-i-Bahi', 'Rohtas'],
      e: 'The Dancing Girl was found at Mohenjo-daro in 1926; it was cast by the lost-wax method by craftsmen of the Indus Valley Civilisation. Taxila and Takht-i-Bahi are much later Gandharan Buddhist sites, and Rohtas is a 16th-century fort.',
    },
    {
      id: 'gandhara-art', d: 1, o: 'past-paper', t: [TAGS.crafts, TAGS.movements],
      q: 'Gandhara art, which flourished around Taxila, Peshawar and the Swat valley, is best known for:',
      a: 'Buddhist sculpture showing strong Greco-Roman influence',
      x: [
        'glazed blue-and-white tiles on the tombs of Sufi saints',
        'Mughal miniature paintings of royal court life',
        'brightly painted decoration on trucks and buses',
      ],
      e: 'Between about the 1st and 5th centuries CE, Gandharan sculptors carved the Buddha in grey schist and stucco with wavy hair and draped robes borrowed from Hellenistic and Roman art. Tile work, Mughal miniatures and truck art belong to much later traditions.',
    },
    {
      id: 'phulkari-region', d: 1, t: [TAGS.crafts],
      q: 'Phulkari, meaning "flower work", is a traditional embroidery of:',
      a: 'Punjab',
      x: ['Gilgit-Baltistan', 'Balochistan', 'Chitral'],
      e: 'Phulkari is the Punjabi craft of darning-stitch embroidery in silk floss on coarse cotton, covering shawls and dupattas with flowers and geometric motifs. Balochistan is known for its own mirror-and-needlework embroidery, and the northern regions for woollen weaving.',
    },
    {
      id: 'mohenjo-daro-planning', d: 1, t: [TAGS.environment],
      q: 'Town planners admire Mohenjo-daro of the Indus Valley Civilisation mainly for its:',
      a: 'grid of straight streets served by covered brick drains',
      x: [
        'radial streets spreading out from a central royal palace',
        'winding lanes that follow the contours of steep hills',
        'ring of defensive canals encircling a round city',
      ],
      e: 'Mohenjo-daro (c. 2500 BCE) was laid out on a grid of streets running roughly north-south and east-west, with standard-sized baked bricks, house drains and covered street sewers, an early example of planned urban sanitation. No central palace, hill-contour plan or ring of canals has been found.',
    },
  ]),
]);
