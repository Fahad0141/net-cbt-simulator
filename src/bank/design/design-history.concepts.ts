import { defineBank } from '@/engine/authoring';
import { statementQuestion } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/**
 * Design, chapter "Design History and Context": PART B (conceptual items).
 * Part A (`design-history.ts`, data in `_design-history.ts`) asks the direct look-ups
 * (trait -> movement, person -> movement, building -> architect, monument -> patron/place,
 * term -> meaning, craft -> region, climate feature -> purpose). This part asks the
 * conceptual angles instead: philosophies in a designer's own words, odd-one-out and
 * EXCEPT items, sequences, the meaning of famous maxims, statement pools, Pakistani
 * monuments by character and period, craft materials and vernacular responses to climate.
 * Every local id here starts with `c-`.
 */

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Picks `n` items from `pool` that pass `ok`, throwing if there are too few (guards bad data). */
function pickOthers<T>(r: Rng, pool: readonly T[], ok: (x: T) => boolean, n = 3): T[] {
  const eligible = pool.filter(ok);
  if (eligible.length < n) throw new Error(`only ${eligible.length} eligible items`);
  return r.sample(eligible, n);
}

/** Joins a list as "a, b and c". */
const andList = (xs: readonly string[]): string =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1] ?? ''}`;

const TAGS = {
  people: 'iconic artists and designers',
  movements: 'design movements',
  crafts: 'local crafts',
  islamic: 'Islamic art and architecture',
  environment: 'man and environment',
} as const;

// ------------------------------------------------------------------ movements

type MovementName =
  | 'Arts and Crafts'
  | 'Art Nouveau'
  | 'Art Deco'
  | 'Bauhaus'
  | 'De Stijl'
  | 'Brutalism'
  | 'Minimalism'
  | 'Postmodernism'
  | 'Deconstructivism'
  | 'Modernism';

/** How the movement reads inside a sentence. */
const LABEL: Readonly<Record<MovementName, string>> = {
  'Arts and Crafts': 'the Arts and Crafts movement',
  'Art Nouveau': 'Art Nouveau',
  'Art Deco': 'Art Deco',
  Bauhaus: 'the Bauhaus',
  'De Stijl': 'De Stijl',
  Brutalism: 'Brutalism',
  Minimalism: 'Minimalism',
  Postmodernism: 'Postmodernism',
  Deconstructivism: 'Deconstructivism',
  Modernism: 'Modernism',
};

/**
 * Pairs of movements whose ideas overlap enough to be arguable; they are never set
 * against each other as answer and distractor.
 */
const CLASH: ReadonlyArray<readonly [MovementName, MovementName]> = [
  ['Arts and Crafts', 'Art Nouveau'],
  ['Bauhaus', 'Modernism'],
  ['Bauhaus', 'De Stijl'],
  ['Bauhaus', 'Minimalism'],
  ['De Stijl', 'Minimalism'],
  ['De Stijl', 'Modernism'],
  ['Brutalism', 'Modernism'],
  ['Minimalism', 'Modernism'],
];
const clashes = (a: MovementName, b: MovementName): boolean =>
  a === b || CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** Original first-person statements that capture each movement's philosophy. */
const MANIFESTO: ReadonlyArray<{ name: MovementName; says: string; why: string }> = [
  {
    name: 'Arts and Crafts',
    says: 'Every chair in my workshop is made by hand so that its maker can take pride in it; cheap factory goods have degraded both the object and the worker.',
    why: 'pride in hand craftsmanship and protest against shoddy machine-made goods are the core of Arts and Crafts',
  },
  {
    name: 'Art Nouveau',
    says: 'I let my iron railings grow like vines, taking their sinuous curves from stems and flowers instead of copying old historical styles.',
    why: 'sinuous, plant-inspired "whiplash" lines and a break from historical revivals define Art Nouveau',
  },
  {
    name: 'Art Deco',
    says: 'My designs celebrate the glamour of the machine age with zigzags, sunbursts, stepped outlines, chrome and glossy lacquer.',
    why: 'geometric zigzag and sunburst ornament with luxurious, streamlined materials is the language of Art Deco',
  },
  {
    name: 'Bauhaus',
    says: 'Artists and craftsmen must train side by side in the workshop and create prototypes that industry can mass-produce well.',
    why: 'uniting art, craft and industrial production was the founding aim of the Bauhaus',
  },
  {
    name: 'De Stijl',
    says: 'I allow myself only straight horizontal and vertical lines and the three primary colours, with black, white and grey.',
    why: 'De Stijl restricted itself to orthogonal lines and primary colours with black, white and grey',
  },
  {
    name: 'Brutalism',
    says: 'Let the raw concrete keep the marks of its timber formwork; a building should never hide its structure or its material.',
    why: 'exposed, board-marked raw concrete and an honest display of structure are the signature of Brutalism',
  },
  {
    name: 'Minimalism',
    says: 'I strip a work down until only a few plain geometric forms remain; nothing decorative or expressive is left.',
    why: 'reduction to a few simple forms with no ornament or expression is the essence of Minimalism',
  },
  {
    name: 'Postmodernism',
    says: 'Plain modernist boxes are dull; I mix classical columns, bright colours and a touch of irony so that buildings speak to everyone.',
    why: 'the playful, ironic return of colour, ornament and historical quotation is typical of Postmodernism',
  },
  {
    name: 'Deconstructivism',
    says: 'My buildings break the box apart: tilted planes and fragmented volumes unsettle our ideas of order and stability.',
    why: 'fragmented, tilted, non-rectilinear forms that challenge harmony and stability define Deconstructivism',
  },
  {
    name: 'Modernism',
    says: 'Historical ornament has no place today; a building should be a rational, functional object of steel, glass and concrete with an open plan.',
    why: 'rejecting historical ornament in favour of rational, functional steel-glass-concrete buildings is the core of Modernism',
  },
];

/** Firm members of each movement (used for EXCEPT questions). */
const MEMBERS: Readonly<Partial<Record<MovementName, readonly string[]>>> = {
  'Arts and Crafts': ['William Morris', 'John Ruskin', 'Philip Webb', 'C. R. Ashbee', 'C. F. A. Voysey'],
  'Art Nouveau': ['Victor Horta', 'Hector Guimard', 'Alphonse Mucha', 'Émile Gallé', 'Louis Comfort Tiffany'],
  'Art Deco': ['A. M. Cassandre', 'Tamara de Lempicka', 'William Van Alen', 'Erté', 'Jean Dunand'],
  Bauhaus: ['Walter Gropius', 'Johannes Itten', 'Paul Klee', 'Marcel Breuer', 'Josef Albers', 'Marianne Brandt', 'László Moholy-Nagy'],
  'De Stijl': ['Piet Mondrian', 'Theo van Doesburg', 'Gerrit Rietveld', 'J. J. P. Oud', 'Bart van der Leck'],
  Brutalism: ['Alison and Peter Smithson', 'Paul Rudolph', 'Ernő Goldfinger', 'Denys Lasdun'],
  Minimalism: ['Donald Judd', 'Dan Flavin', 'Carl Andre', 'Sol LeWitt'],
  Postmodernism: ['Robert Venturi', 'Michael Graves', 'Charles Moore', 'Ettore Sottsass', 'Aldo Rossi'],
  Deconstructivism: ['Frank Gehry', 'Daniel Libeskind', 'Zaha Hadid', 'Peter Eisenman', 'Bernard Tschumi'],
};
/** Figures with a genuine second link: never offered as the odd one out for these movements. */
const ALSO: Readonly<Record<string, readonly MovementName[]>> = {
  'Theo van Doesburg': ['Bauhaus'],
  'Marcel Breuer': ['Brutalism'],
  'Josef Albers': ['Minimalism'],
  'Frank Gehry': ['Postmodernism'],
  'Peter Eisenman': ['Postmodernism'],
};
const MEMBER_MOVEMENTS = Object.keys(MEMBERS) as MovementName[];
const ALL_MEMBERS: ReadonlyArray<{ who: string; movement: MovementName }> = MEMBER_MOVEMENTS.flatMap((m) =>
  (MEMBERS[m] ?? []).map((who) => ({ who, movement: m })),
);

/** Movements with clearly separated starting periods (equal `era` = overlapping, never together). */
const CHRONO: ReadonlyArray<{ name: MovementName; when: string; era: number }> = [
  { name: 'Arts and Crafts', when: 'from the 1860s', era: 1 },
  { name: 'Art Nouveau', when: 'about 1890', era: 2 },
  { name: 'De Stijl', when: '1917', era: 3 },
  { name: 'Bauhaus', when: '1919', era: 3 },
  { name: 'Art Deco', when: 'the 1920s', era: 3 },
  { name: 'Brutalism', when: 'the 1950s', era: 4 },
  { name: 'Postmodernism', when: 'the late 1960s and 1970s', era: 5 },
  { name: 'Deconstructivism', when: 'the late 1980s', era: 6 },
];

const MOVEMENT_FALSE: Readonly<Record<string, string>> = {
  'The Bauhaus rejected industrial production in favour of purely hand-made objects.':
    'the Bauhaus set out to unite art and craft with industry and designed prototypes for mass production.',
  'Art Deco is known for asymmetric whiplash curves taken from plant stems.':
    'whiplash curves belong to Art Nouveau; Art Deco is geometric, stepped and streamlined.',
  'De Stijl compositions are built mainly from curved lines and pastel colours.':
    'De Stijl used straight horizontal and vertical lines with primary colours, black, white and grey.',
  'The Arts and Crafts movement celebrated cheap, machine-made mass-produced goods.':
    'Arts and Crafts was a protest against shoddy machine-made goods and revived hand craftsmanship.',
  'Minimalism favours rich surface ornament and many competing colours.':
    'Minimalism strips design down to a few simple forms and a restrained palette with no ornament.',
  'Brutalist buildings usually hide their concrete behind polished stone cladding.':
    'Brutalism exposes its raw, board-marked concrete rather than covering it.',
  'Postmodernism insisted on strict functionalism and rejected all ornament.':
    'that describes Modernism; Postmodernism brought back ornament, colour and historical references.',
};

// ------------------------------------------------------------------ people: works and maxims

/** Architects with at least three firmly attributed works (city given to avoid same-name clashes). */
const WORKS_BY: ReadonlyArray<{ who: string; works: readonly string[] }> = [
  { who: 'Le Corbusier', works: ['Villa Savoye, Poissy', "Unité d'Habitation, Marseille", 'Notre-Dame du Haut chapel, Ronchamp', 'Capitol Complex, Chandigarh'] },
  { who: 'Frank Lloyd Wright', works: ['Fallingwater, Pennsylvania', 'Guggenheim Museum, New York', 'Robie House, Chicago', 'Taliesin West, Arizona'] },
  { who: 'Ludwig Mies van der Rohe', works: ['Barcelona Pavilion, Barcelona', 'Seagram Building, New York', 'Farnsworth House, Illinois', 'Neue Nationalgalerie, Berlin'] },
  { who: 'Antoni Gaudí', works: ['Sagrada Família, Barcelona', 'Casa Batlló, Barcelona', 'Park Güell, Barcelona', 'Casa Milà, Barcelona'] },
  { who: 'Zaha Hadid', works: ['Heydar Aliyev Centre, Baku', 'MAXXI Museum, Rome', 'London Aquatics Centre, London', 'Vitra Fire Station, Weil am Rhein'] },
  { who: 'Frank Gehry', works: ['Guggenheim Museum, Bilbao', 'Walt Disney Concert Hall, Los Angeles', 'Fondation Louis Vuitton, Paris'] },
  { who: 'Louis Kahn', works: ['National Assembly Building, Dhaka', 'Salk Institute, La Jolla', 'Kimbell Art Museum, Fort Worth'] },
  { who: 'I. M. Pei', works: ['Louvre Pyramid, Paris', 'Bank of China Tower, Hong Kong', 'Museum of Islamic Art, Doha'] },
  { who: 'Norman Foster', works: ['30 St Mary Axe (the Gherkin), London', 'Reichstag dome, Berlin', 'HSBC Main Building, Hong Kong'] },
];
const ALL_WORKS: ReadonlyArray<{ who: string; work: string }> = WORKS_BY.flatMap((a) =>
  a.works.map((work) => ({ who: a.who, work })),
);

/** Famous maxims and what they mean. `clash` = keys whose meaning is too close to offer together. */
const MAXIMS: ReadonlyArray<{ key: string; stem: string; meaning: string; source: string; clash: readonly string[] }> = [
  {
    key: 'mies',
    stem: 'Mies van der Rohe’s maxim "Less is more" expresses the idea that:',
    meaning: 'a simple, pared-down design can achieve more than an elaborate one',
    source: 'Mies van der Rohe used "Less is more" to sum up his reductive Modernism',
    clash: ['rams', 'loos'],
  },
  {
    key: 'venturi',
    stem: 'Robert Venturi’s retort "Less is a bore" expresses the idea that:',
    meaning: 'complexity, ornament and contradiction make architecture richer than austere simplicity',
    source: 'Venturi’s "Less is a bore" mocked Mies and argued for complexity and contradiction',
    clash: [],
  },
  {
    key: 'corb',
    stem: 'Le Corbusier’s description of a house as "a machine for living in" expresses the idea that:',
    meaning: 'a dwelling should be planned as efficiently and rationally as a machine for its purpose',
    source: 'Le Corbusier wanted the house to be as rational and efficient as a machine',
    clash: [],
  },
  {
    key: 'loos',
    stem: 'Adolf Loos’s essay "Ornament and Crime" argues that:',
    meaning: 'applied decoration wastes labour and material and has no place in modern design',
    source: 'Loos attacked applied ornament as wasteful and outdated',
    clash: ['mies', 'rams'],
  },
  {
    key: 'rams',
    stem: 'Dieter Rams’s motto "Less, but better" expresses the idea that:',
    meaning: 'a product should concentrate on its essential features and drop everything unnecessary',
    source: 'Rams’s "Less, but better" asks designers to focus on the essentials',
    clash: ['mies', 'loos', 'morris'],
  },
  {
    key: 'morris',
    stem: 'William Morris’s advice to "have nothing in your houses that you do not know to be useful, or believe to be beautiful" means that:',
    meaning: 'every household object should earn its place by being useful or beautiful',
    source: 'Morris asked that every object in a home be either useful or beautiful',
    clash: ['rams'],
  },
  {
    key: 'truth',
    stem: 'The design principle of "truth to materials" holds that:',
    meaning: 'a material should be used so that its natural character shows, not disguised as another',
    source: '"Truth to materials" means letting wood look like wood and concrete like concrete',
    clash: [],
  },
];

// ------------------------------------------------------------------ Pakistan monuments

const SHAH_JAHAN_WORKS: ReadonlyArray<{ work: string; note: string }> = [
  { work: 'Shalimar Gardens, Lahore', note: 'laid out in 1641-42' },
  { work: 'Wazir Khan Mosque, Lahore', note: 'built in 1634-41 by his governor Wazir Khan' },
  { work: 'Sheesh Mahal, Lahore Fort', note: 'added to the fort in the 1630s' },
  { work: 'Shah Jahan Mosque, Thatta', note: 'begun in 1644 on his orders and named after him' },
  { work: 'Tomb of Jahangir, Shahdara', note: 'completed about 1637, ten years after Jahangir’s death' },
];
/** Not from Shah Jahan's reign (Hiran Minar is left out: its tank was completed under Shah Jahan). */
const NOT_SHAH_JAHAN: ReadonlyArray<{ work: string; note: string }> = [
  { work: 'Badshahi Mosque, Lahore', note: 'built under Aurangzeb and completed in 1673' },
  { work: 'Alamgiri Gate, Lahore Fort', note: 'built under Aurangzeb in 1674' },
  { work: 'Maryam Zamani Mosque, Lahore', note: 'built in 1611-14, in the reign of Jahangir' },
  { work: 'Rohtas Fort, Jhelum', note: 'begun in 1541 by Sher Shah Suri, a century before Shah Jahan' },
];

/** Signature features (all phrased "its ...", so options stay parallel). */
const FEATURES: ReadonlyArray<{ site: string; feature: string }> = [
  { site: 'Wazir Khan Mosque', feature: 'its kashi-kari tile mosaic and painted frescoes covering almost every surface' },
  { site: 'Sheesh Mahal, Lahore Fort', feature: 'its walls and ceilings inlaid with thousands of small convex mirrors' },
  { site: 'Shalimar Gardens, Lahore', feature: 'its three descending terraces watered by hundreds of fountains' },
  { site: 'Rohtas Fort', feature: 'its massive defensive walls, about 4 km long, pierced by twelve gates' },
  { site: 'Minar-e-Pakistan', feature: 'its location on the very ground where the Lahore Resolution was passed in 1940' },
  { site: 'Shah Jahan Mosque, Thatta', feature: 'its roof of over ninety brick domes and acoustics that carry the imam’s voice' },
  { site: 'Tomb of Shah Rukn-e-Alam, Multan', feature: 'its massive octagonal brick form banded with glazed blue tiles' },
  { site: 'Hiran Minar, Sheikhupura', feature: 'its tower raised in memory of an emperor’s pet antelope' },
  { site: 'Badshahi Mosque', feature: 'its vast courtyard, one of the largest of any mosque in the world' },
  { site: 'Makli Necropolis, Thatta', feature: 'its thousands of carved stone tombs built over four centuries' },
];
/** The Thatta mosque is also renowned for its tile work, so it is never set against the Wazir Khan tile feature. */
const FEATURE_CLASH: ReadonlyArray<readonly [string, string]> = [['Wazir Khan Mosque', 'Shah Jahan Mosque, Thatta']];
const featureClash = (a: string, b: string): boolean =>
  FEATURE_CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

const MODERN_LANDMARKS: ReadonlyArray<{ name: string; date: string }> = [
  { name: 'Faisal Mosque, Islamabad', date: 'completed in 1986' },
  { name: 'Minar-e-Pakistan, Lahore', date: 'completed in 1968' },
  { name: 'Mazar-e-Quaid, Karachi', date: 'completed in 1971' },
  { name: 'Parliament House, Islamabad', date: 'completed in 1986' },
];
const HISTORIC_LANDMARKS: ReadonlyArray<{ name: string; date: string }> = [
  { name: 'Badshahi Mosque, Lahore', date: 'completed in 1673' },
  { name: 'Wazir Khan Mosque, Lahore', date: 'completed in 1641' },
  { name: 'Shalimar Gardens, Lahore', date: 'laid out in 1641-42' },
  { name: 'Rohtas Fort, Jhelum', date: 'begun in 1541' },
  { name: 'Hiran Minar, Sheikhupura', date: 'built in 1606' },
  { name: 'Tomb of Jahangir, Lahore', date: 'completed about 1637' },
  { name: 'Shah Jahan Mosque, Thatta', date: 'begun in 1644' },
  { name: 'Tomb of Shah Rukn-e-Alam, Multan', date: 'built in the 1320s' },
  { name: 'Mahabat Khan Mosque, Peshawar', date: 'built in the seventeenth century' },
];

const MUGHAL_FALSE: Readonly<Record<string, string>> = {
  'Mughal mosques were usually built of timber because stone and brick were unavailable.':
    'Mughal builders used fired brick, red sandstone and white marble.',
  'Mughal gardens were laid out with winding, irregular paths in the manner of an English landscape park.':
    'Mughal gardens are strictly geometric, with axial water channels dividing them into quarters (chahar bagh).',
  'The Faisal Mosque in Islamabad is a seventeenth-century Mughal monument.':
    'it is a modern concrete building, completed in 1986.',
  'Minar-e-Pakistan was built by the Mughal emperor Shah Jahan.':
    'it is a modern tower completed in 1968 to mark the 1940 Lahore Resolution.',
  'Mughal architecture avoided domes and arches in favour of flat-roofed boxes.':
    'bulbous domes, pointed arches and chhatris are hallmarks of Mughal architecture.',
  'Rohtas Fort was built by Akbar as a pleasure palace with gardens.':
    'it is a military fort begun in 1541 by Sher Shah Suri to block the Mughal Humayun.',
};

// ------------------------------------------------------------------ Islamic geometric design

const GEOMETRY_FALSE: Readonly<Record<string, string>> = {
  'Islamic geometric patterns are built mainly from realistic human and animal figures.':
    'Islamic ornament avoids figural images in sacred settings and relies on geometry, vegetal motifs and calligraphy.',
  'The patterns are deliberately asymmetrical and avoid any repetition.':
    'symmetry and systematic repetition are the governing principles of Islamic geometric design.',
  'Islamic geometric design is drawn freehand with no underlying grid.':
    'patterns are constructed on a regular grid derived from a subdivided circle.',
  'Only fivefold stars were used, because square and hexagonal grids were avoided.':
    'square, triangular and hexagonal grids are the most common bases, giving 4-, 6-, 8- and 12-fold stars as well as 5- and 10-fold ones.',
  'Calligraphy was never combined with geometric ornament.':
    'calligraphic bands are routinely framed by geometric and arabesque ornament on the same surface.',
};

// ------------------------------------------------------------------ crafts

type CraftGroup = 'textile' | 'ceramic' | 'wood' | 'metal' | 'leather' | 'stone';
/** `near` = a group the craft arguably also belongs to; it is never offered as outside that group. */
const CRAFTS: ReadonlyArray<{ name: string; group: CraftGroup; how: string; near?: CraftGroup }> = [
  { name: 'Ajrak block printing', group: 'textile', how: 'resist-printed cotton cloth' },
  { name: 'Phulkari embroidery', group: 'textile', how: 'silk-floss embroidery on cotton cloth' },
  { name: 'Ralli quilting', group: 'textile', how: 'patchwork quilts of cotton scraps' },
  { name: 'Sussi weaving', group: 'textile', how: 'striped hand-woven cotton cloth' },
  { name: 'Khes weaving', group: 'textile', how: 'hand-woven cotton sheets and blankets' },
  { name: 'Chunri tie-dyeing', group: 'textile', how: 'tie-dyed cloth' },
  { name: 'Blue pottery', group: 'ceramic', how: 'glazed earthenware' },
  { name: 'Kashi glazed-tile work', group: 'ceramic', how: 'fired, glazed clay tiles' },
  { name: 'Terracotta pottery', group: 'ceramic', how: 'unglazed fired clay' },
  { name: 'Chiniot wood carving', group: 'wood', how: 'carved hardwood furniture' },
  { name: 'Jandi lacquer turning', group: 'wood', how: 'lathe-turned wood coloured with lac' },
  { name: 'Swat wood carving', group: 'wood', how: 'carved timber doors, pillars and furniture' },
  { name: 'Copper and brass engraving', group: 'metal', how: 'hammered and engraved metal vessels' },
  { name: 'Wazirabad cutlery making', group: 'metal', how: 'forged steel knives and cutlery' },
  // Many khussas have embroidered fabric uppers, so khussa is kept out of textile items.
  { name: 'Khussa making', group: 'leather', how: 'hand-stitched leather shoes', near: 'textile' },
  { name: 'Naqashi on camel-skin lamps', group: 'leather', how: 'painted camel hide' },
  { name: 'Onyx carving', group: 'stone', how: 'turned and polished onyx stone' },
];
const GROUP_LABEL: Readonly<Record<'textile' | 'ceramic' | 'wood', string>> = {
  textile: 'textile (cloth-based)',
  ceramic: 'ceramic (fired clay)',
  wood: 'woodworking',
};

// ------------------------------------------------------------------ man and environment

type Climate = 'hotDry' | 'warmHumid' | 'cold';
const CLIMATES: Readonly<Record<Climate, { name: readonly string[]; good: readonly string[]; why: string }>> = {
  hotDry: {
    name: ['a hot-dry desert climate such as Thar', 'the hot-dry climate of interior Sindh', 'a hot, arid climate such as Cholistan'],
    good: [
      'Thick mud walls, small windows and a shaded courtyard with a pool for evaporative cooling',
      'Heavy walls, small openings onto a shaded courtyard, and a wind catcher to scoop breezes into the rooms',
    ],
    why: 'heavy walls store daytime heat and release it at night, small openings keep out glare and hot dust-laden wind, a wind catcher draws cooler breezes inside, and evaporation from a courtyard pool cools the dry air',
  },
  warmHumid: {
    name: ['a warm-humid coastal climate such as Karachi', 'a warm, humid coastal climate with muggy nights and little daily temperature swing', 'a warm-humid climate where the air stays damp day and night'],
    good: [
      'Lightweight, open, raised buildings with large openings for cross-ventilation and deep overhangs',
      'Widely spaced buildings oriented to the sea breeze, with shaded verandahs and through-ventilation',
    ],
    why: 'humid air cannot be cooled much by evaporation and the nights stay warm, so moving air across the body and shading bring comfort; heavy walls would only store heat',
  },
  cold: {
    name: ['a cold mountain climate such as Gilgit-Baltistan', 'the cold climate of upper Chitral', 'a cold, snowy climate such as Skardu'],
    good: [
      'A compact, sealed form huddled around a central hearth, with its main rooms facing south to catch the winter sun',
      'Rooms clustered around a central heat source, with sunlit south walls and few north openings',
    ],
    why: 'the aim is to collect and keep heat: a compact, sealed form loses little heat, a central hearth warms every room, and the south side catches the low winter sun',
  },
};
const SUITS: Readonly<Record<Climate, string>> = {
  hotDry: 'thermal mass, shaded courtyards, wind catchers and evaporative cooling suit hot-dry climates',
  warmHumid: 'lightweight, open, cross-ventilated buildings suit warm-humid climates',
  cold: 'compact, sealed forms around a central hearth that face the winter sun suit cold climates',
};
const ALWAYS_WRONG = [
  'Large unshaded west-facing glass walls under a thin, uninsulated metal roof',
  'A fully glazed, air-tight box with no shading, relying entirely on air-conditioning',
] as const;

const ENV_FALSE: Readonly<Record<string, string>> = {
  'Vernacular buildings depend on imported materials and specialist foreign architects.':
    'vernacular building uses local materials and the inherited skills of local builders.',
  'Traditional houses in the cold northern mountains use large glass walls and thin partitions to admit breezes.':
    'cold-climate houses are compact, with thick walls and few, small openings to keep heat in.',
  'Built-up areas have no effect on the local climate around them.':
    'paving, dark roofs and waste heat make cities warmer than the countryside (the urban heat-island effect).',
  'Clearing forests from hill slopes reduces the risk of landslides and flash floods.':
    'tree roots bind soil and slow run-off, so deforestation increases landslides and flooding.',
  'The narrow, winding streets of old walled cities trap the sun and make them hotter than wide boulevards in summer.':
    'narrow streets between tall buildings stay shaded for most of the day and are cooler than wide, sunlit roads.',
};

// ------------------------------------------------------------------ bank

export default defineBank('design', 'design-history', (b) => [
  // ---------------- movements
  b.dynamic('c-movement-manifesto', { difficulty: 1, origin: 'past-paper', tags: [TAGS.movements] }, (r) => {
    const target = r.pick(MANIFESTO);
    // Deconstructivism is often taught as a strand of Postmodernism, so they are never paired here.
    const pomoDecon = (a: MovementName, b: MovementName): boolean =>
      (a === 'Postmodernism' && b === 'Deconstructivism') || (a === 'Deconstructivism' && b === 'Postmodernism');
    const others = pickOthers(r, MANIFESTO, (m) => !clashes(m.name, target.name) && !pomoDecon(m.name, target.name));
    if (r.chance(0.5)) {
      return {
        stem: `A designer says: "${target.says}" These views belong most closely to which movement?`,
        answer: target.name,
        distractors: others.map((m) => m.name),
        explanation: `The statement matches ${LABEL[target.name]}: ${target.why}. It does not fit ${andList(others.map((m) => LABEL[m.name]))}, whose ideals are different.`,
      };
    }
    return {
      stem: `Which statement would most likely be made by a designer associated with **${LABEL[target.name]}**?`,
      answer: `"${target.says}"`,
      distractors: others.map((m) => `"${m.says}"`),
      explanation: `${cap(target.why)}. The other statements express ${andList(others.map((m) => LABEL[m.name]))}.`,
    };
  }),

  b.dynamic('c-movement-odd-figure', { difficulty: 2, tags: [TAGS.people, TAGS.movements] }, (r) => {
    const movement = r.pick(MEMBER_MOVEMENTS);
    const members = r.sample(MEMBERS[movement] ?? [], 3);
    // Deconstructivism is often taught as a strand of Postmodernism, so its figures are
    // never the odd one out of a Postmodernism list.
    const odd = r.pick(
      ALL_MEMBERS.filter(
        (p) =>
          !clashes(p.movement, movement) &&
          !(ALSO[p.who] ?? []).includes(movement) &&
          !(movement === 'Postmodernism' && p.movement === 'Deconstructivism'),
      ),
    );
    return {
      stem: `All of the following are associated with ${LABEL[movement]} EXCEPT:`,
      answer: odd.who,
      distractors: members,
      explanation: `${andList(members)} are figures of ${LABEL[movement]}. ${odd.who} ${odd.who.includes(' and ') ? 'belong' : 'belongs'} to ${LABEL[odd.movement]}.`,
    };
  }),

  b.dynamic('c-movement-sequence', { difficulty: 3, tags: [TAGS.movements] }, (r) => {
    const eras = r.sample([1, 2, 3, 4, 5, 6], 4).sort((x, y) => x - y);
    const chosen = eras.map((e) => r.pick(CHRONO.filter((c) => c.era === e)));
    const names: string[] = chosen.map((c) => c.name);
    const fmt = (xs: readonly string[]): string => xs.join(' → ');
    const swap = (i: number): string[] => {
      const xs = [...names];
      const a = xs[i] as string;
      xs[i] = xs[i + 1] as string;
      xs[i + 1] = a;
      return xs;
    };
    // Two near-miss orders (one adjacent pair swapped) and one more scrambled order.
    const near = r.sample([0, 1, 2], 2).map((i) => fmt(swap(i)));
    const scrambled = r.pick([
      fmt([...names].reverse()),
      fmt([names[1], names[0], names[3], names[2]] as string[]),
      fmt([names[2], names[0], names[1], names[3]] as string[]),
    ]);
    return {
      stem: 'Which sequence lists these design movements in the order in which they emerged, earliest first?',
      answer: fmt(names),
      distractors: [...near, scrambled],
      explanation: `${chosen.map((c) => `${c.name} (${c.when})`).join(', then ')}.`,
    };
  }),

  b.dynamic('c-movement-statements', { difficulty: 2, tags: [TAGS.movements] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about design movements is correct?',
      negativeStem: 'Which of the following statements about design movements is NOT correct?',
      truths: [
        'The Bauhaus aimed to unite fine art, craft and industrial production.',
        'William Morris and John Ruskin inspired the Arts and Crafts movement.',
        'De Stijl artists limited their palette to primary colours, black, white and grey.',
        'Art Nouveau drew its flowing, curvilinear motifs from plant forms.',
        'Brutalist buildings typically leave their raw concrete exposed.',
        'Postmodernism reintroduced ornament and historical references into architecture.',
        'Deconstructivist buildings often appear fragmented and non-rectilinear.',
      ],
      falsehoods: Object.keys(MOVEMENT_FALSE),
      explain: (answer, inverted) =>
        inverted
          ? `The statement is false: ${MOVEMENT_FALSE[answer] ?? ''} The other three statements are true.`
          : `"${answer}" is true. The others are false: the Bauhaus embraced industry, whiplash curves belong to Art Nouveau (Art Deco is geometric), De Stijl used straight lines and primaries, Arts and Crafts opposed machine-made goods, Minimalism rejects ornament, Brutalism exposes its concrete and Postmodernism revived ornament.`,
    }),
  ),

  // ---------------- people and ideas
  b.dynamic('c-works-except', { difficulty: 2, origin: 'past-paper', tags: [TAGS.people] }, (r) => {
    const architect = r.pick(WORKS_BY);
    const works = r.sample(architect.works, 3);
    const odd = r.pick(ALL_WORKS.filter((w) => w.who !== architect.who));
    return {
      stem: `All of the following were designed by **${architect.who}** EXCEPT:`,
      answer: odd.work,
      distractors: works,
      explanation: `${architect.who} designed all of these: ${works.join('; ')}. The exception, ${odd.work}, was designed by ${odd.who}.`,
    };
  }),

  b.dynamic('c-maxim-meaning', { difficulty: 2, tags: [TAGS.people, TAGS.movements] }, (r) => {
    const target = r.pick(MAXIMS);
    const others = pickOthers(r, MAXIMS, (m) => m.key !== target.key && !target.clash.includes(m.key) && !m.clash.includes(target.key));
    return {
      stem: target.stem,
      answer: cap(target.meaning),
      distractors: others.map((m) => cap(m.meaning)),
      explanation: `${cap(target.source)}. The other options paraphrase different ideas: ${others.map((m) => m.source).join('; ')}.`,
    };
  }),

  // ---------------- Pakistan monuments and Islamic design
  b.dynamic('c-shah-jahan-except', { difficulty: 2, tags: [TAGS.islamic] }, (r) => {
    const works = r.sample(SHAH_JAHAN_WORKS, 3);
    const odd = r.pick(NOT_SHAH_JAHAN);
    return {
      stem: 'All of the following were built during the reign of Shah Jahan EXCEPT:',
      answer: odd.work,
      distractors: works.map((w) => w.work),
      explanation: `The ${odd.work} was ${odd.note}. ${works.map((w) => `${w.work}: ${w.note}`).join('; ')}.`,
    };
  }),

  b.dynamic('c-monument-feature', { difficulty: 1, origin: 'past-paper', tags: [TAGS.islamic] }, (r) => {
    const target = r.pick(FEATURES);
    const others = pickOthers(r, FEATURES, (f) => f.site !== target.site && !featureClash(f.site, target.site));
    if (r.chance(0.5)) {
      return {
        stem: `Which monument of Pakistan is famous for ${target.feature}?`,
        answer: target.site,
        distractors: others.map((o) => o.site),
        explanation: `The ${target.site} is famous for ${target.feature}. ${others.map((o) => `${o.site}: ${o.feature}`).join('; ')}.`,
      };
    }
    return {
      stem: `The **${target.site}** is especially well known for:`,
      answer: cap(target.feature),
      distractors: others.map((o) => cap(o.feature)),
      explanation: `The ${target.site} is known for ${target.feature}. The other features belong to: ${others.map((o) => o.site).join('; ')}.`,
    };
  }),

  b.dynamic('c-landmark-period', { difficulty: 1, tags: [TAGS.islamic] }, (r) => {
    if (r.chance(0.5)) {
      const modern = r.pick(MODERN_LANDMARKS);
      const old = r.sample(HISTORIC_LANDMARKS, 3);
      return {
        stem: 'Which of the following landmarks of Pakistan was built in the twentieth century?',
        answer: modern.name,
        distractors: old.map((o) => o.name),
        explanation: `The ${modern.name} was ${modern.date}. The others are much older: ${old.map((o) => `${o.name} (${o.date})`).join('; ')}.`,
      };
    }
    const old = r.pick(HISTORIC_LANDMARKS);
    const modern = r.sample(MODERN_LANDMARKS, 3);
    return {
      stem: 'Which of the following landmarks of Pakistan dates from BEFORE the twentieth century?',
      answer: old.name,
      distractors: modern.map((o) => o.name),
      explanation: `The ${old.name} was ${old.date}. The others are modern: ${modern.map((o) => `${o.name} (${o.date})`).join('; ')}.`,
    };
  }),

  b.dynamic('c-mughal-statements', { difficulty: 1, tags: [TAGS.islamic] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about Mughal and Indo-Islamic architecture in Pakistan is correct?',
      negativeStem: 'Which of the following statements about Mughal and Indo-Islamic architecture in Pakistan is NOT correct?',
      truths: [
        'Mughal buildings often combine red sandstone with white marble inlay.',
        'Mughal gardens such as the Shalimar Gardens use terraces, axial water channels and fountains.',
        'The Wazir Khan Mosque is richly decorated with glazed tile mosaic and frescoes.',
        'The Sheesh Mahal in Lahore Fort is decorated with inlaid mirror work.',
        'Bulbous domes, pointed arches and chhatris are typical features of Mughal architecture.',
        'The Shah Jahan Mosque at Thatta is roofed by many brick domes and decorated with glazed tiles.',
      ],
      falsehoods: Object.keys(MUGHAL_FALSE),
      explain: (answer, inverted) =>
        inverted
          ? `The statement is false: ${MUGHAL_FALSE[answer] ?? ''} The other three statements are true.`
          : `"${answer}" is true. The others are false: Mughal builders used brick, sandstone and marble rather than timber; their gardens are geometric, not winding; the Faisal Mosque (1986) and Minar-e-Pakistan (1968) are modern; domes and arches are Mughal hallmarks; and Rohtas Fort is Sher Shah Suri’s military fort.`,
    }),
  ),

  b.dynamic('c-islamic-geometry-statements', { difficulty: 2, tags: [TAGS.islamic] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about Islamic geometric design is correct?',
      negativeStem: 'Which of the following statements about Islamic geometric design is NOT correct?',
      truths: [
        'Patterns are laid out on repeating square, triangular or hexagonal grids and can be extended indefinitely.',
        'Star polygons with 8, 10 or 12 points are common motifs.',
        'Geometric patterns sit alongside vegetal (arabesque) ornament and calligraphy as the three main elements of Islamic ornament.',
        'Rotational and mirror symmetry govern the arrangement of motifs.',
        'Repeating tiles tessellate, covering a surface without gaps or overlaps.',
      ],
      falsehoods: Object.keys(GEOMETRY_FALSE),
      explain: (answer, inverted) =>
        inverted
          ? `The statement is false: ${GEOMETRY_FALSE[answer] ?? ''} The other three statements are true.`
          : `"${answer}" is true. The others are false: Islamic design avoids figural imagery, is symmetrical and repetitive, is constructed on a geometric grid from a subdivided circle, uses many star orders, and freely combines calligraphy with geometry.`,
    }),
  ),

  // ---------------- crafts
  b.dynamic('c-craft-material', { difficulty: 1, origin: 'past-paper', tags: [TAGS.crafts] }, (r) => {
    const group = r.pick(['textile', 'ceramic', 'wood'] as const);
    const inGroup = CRAFTS.filter((c) => c.group === group);
    const outGroup = CRAFTS.filter((c) => c.group !== group && c.near !== group);
    const describe = (c: (typeof CRAFTS)[number]): string => `${c.name}: ${c.how}`;
    if (r.chance(0.5)) {
      const members = r.sample(inGroup, 3);
      const odd = r.pick(outGroup);
      return {
        stem: `Which of the following traditional crafts of Pakistan is NOT a ${GROUP_LABEL[group]} craft?`,
        answer: odd.name,
        distractors: members.map((c) => c.name),
        explanation: `${describe(odd)}, which is not ${group === 'wood' ? 'woodwork' : group}. The others are ${group === 'wood' ? 'woodwork' : group} crafts: ${members.map(describe).join('; ')}.`,
      };
    }
    const answer = r.pick(inGroup);
    const others = r.sample(outGroup, 3);
    return {
      stem: `Which of the following traditional crafts of Pakistan is a ${GROUP_LABEL[group]} craft?`,
      answer: answer.name,
      distractors: others.map((c) => c.name),
      explanation: `${describe(answer)}. The others use different materials: ${others.map(describe).join('; ')}.`,
    };
  }),

  // ---------------- man and environment
  b.dynamic('c-climate-strategy', { difficulty: 2, origin: 'past-paper', tags: [TAGS.environment] }, (r) => {
    const keys: Climate[] = ['hotDry', 'warmHumid', 'cold'];
    const key = r.pick(keys);
    const c = CLIMATES[key];
    const otherKeys = keys.filter((k) => k !== key);
    const others = otherKeys.map((k) => r.pick(CLIMATES[k].good));
    return {
      stem: `Which traditional (passive) building response is most appropriate for a house in ${r.pick(c.name)}?`,
      answer: r.pick(c.good),
      distractors: [...others, r.pick(ALWAYS_WRONG)],
      explanation: `In this climate ${c.why}. The other options suit other climates (${otherKeys.map((k) => SUITS[k]).join('; ')}), and the all-glass option is not a passive response at all: unshaded glazing overheats in summer and loses heat in winter.`,
    };
  }),

  b.dynamic('c-man-environment-statements', { difficulty: 1, tags: [TAGS.environment] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about man, environment and traditional settlements is correct?',
      negativeStem: 'Which of the following statements about man, environment and traditional settlements is NOT correct?',
      truths: [
        'Vernacular buildings are shaped by local climate, materials and ways of life rather than by a single famous designer.',
        'Courtyard havelis turn inward, giving shade, privacy and a cool open space at the heart of the house.',
        'Flat roofs in hot, dry regions are traditionally used for sleeping outdoors on summer nights.',
        'Raising houses on plinths helps protect them in flood-prone river plains.',
        'Traditional houses in cold mountain valleys are compact, with thick walls and small windows.',
        'The narrow lanes of old walled cities such as Lahore stay shaded for much of the day.',
      ],
      falsehoods: Object.keys(ENV_FALSE),
      explain: (answer, inverted) =>
        inverted
          ? `The statement is false: ${ENV_FALSE[answer] ?? ''} The other three statements are true.`
          : `"${answer}" is true. The others are false: vernacular building relies on local materials and builders, cold-climate houses keep openings small, cities create heat islands, deforestation increases landslides and floods, and narrow old streets are cooler because they are shaded.`,
    }),
  ),

  // ---------------- fixed items
  ...b.mcqs([
    // movements
    {
      id: 'c-form-follows-function-meaning', d: 1, o: 'past-paper', t: [TAGS.movements],
      q: 'The design principle "form follows function" means that:',
      a: 'the shape of a building or object should arise from its purpose',
      x: [
        'the purpose of an object should adapt to its decoration',
        'a design should copy the forms of an admired historical style',
        'ornament should be decided before the function is considered',
      ],
      e: 'Coined by Louis Sullivan and adopted by the Modernists, the phrase means that a design’s form should be derived from the job it has to do, not from applied decoration or past styles.',
    },
    {
      id: 'c-arts-crafts-reaction', d: 2, o: 'past-paper', t: [TAGS.movements],
      q: 'The Arts and Crafts movement in nineteenth-century Britain arose mainly as a reaction against:',
      a: 'poor-quality machine-made goods of the Industrial Revolution',
      x: [
        'the austere, unornamented products of the Bauhaus',
        'the geometric glamour of Art Deco skyscrapers',
        'the ironic historicism of Postmodern architecture',
      ],
      e: 'Led by William Morris and inspired by John Ruskin (from the 1860s), Arts and Crafts protested against shoddy industrial products. The Bauhaus (1919), Art Deco (1920s) and Postmodernism (1960s-70s) all came later, so it could not have reacted against them.',
    },
    {
      id: 'c-brutalism-name', d: 2, t: [TAGS.movements],
      q: 'The term "Brutalism" in architecture is derived from:',
      a: 'the French béton brut, meaning raw concrete',
      x: [
        'the Italian brutto, meaning ugly',
        'the German Brücke, meaning bridge',
        'the English phrase brute-force engineering',
      ],
      e: 'Le Corbusier described the board-marked, unfinished concrete of his post-war buildings as béton brut ("raw concrete"), and the critic Reyner Banham popularised the label "New Brutalism" in the 1950s. The name refers to the material, not to ugliness; Die Brücke was an Expressionist painters’ group.',
    },
    {
      id: 'c-bauhaus-vorkurs', d: 2, t: [TAGS.movements, TAGS.people],
      q: 'At the Bauhaus, every new student first took the preliminary course (Vorkurs), which aimed to:',
      a: 'free students from old habits and teach the basics of form, colour and materials by experiment',
      x: [
        'train students to copy historical ornament accurately from pattern books',
        'prepare students to paint realistic portraits in oils for wealthy patrons',
        'teach students to run a commercial printing business before designing anything',
      ],
      e: 'The Vorkurs, devised by Johannes Itten and later taught by Moholy-Nagy and Albers, cleared away academic habits and let students explore basic shapes, colours, textures and materials before entering a workshop. Copying historical ornament or academic portraiture is exactly what the Bauhaus rejected.',
    },
    {
      id: 'c-international-style', d: 3, t: [TAGS.movements, TAGS.people],
      q: 'The label "International Style", for the early Modernist architecture of Gropius, Le Corbusier and Mies van der Rohe, was popularised by:',
      a: 'a 1932 exhibition at the Museum of Modern Art, New York',
      x: [
        'the 1925 Paris Exposition des Arts Décoratifs',
        'the 1851 Great Exhibition in London',
        'the 1988 "Deconstructivist Architecture" exhibition',
      ],
      e: 'Henry-Russell Hitchcock and Philip Johnson coined the term for their 1932 "Modern Architecture: International Exhibition" at MoMA and its book "The International Style". The 1925 Paris fair gave Art Deco its name, the 1851 exhibition featured the Crystal Palace, and the 1988 show labelled Deconstructivism.',
    },
    {
      id: 'c-deconstruction-derrida', d: 3, t: [TAGS.movements],
      q: 'The philosophical idea of "deconstruction", which lent its name to Deconstructivist architecture, is associated with:',
      a: 'Jacques Derrida',
      x: ['Jean-Paul Sartre', 'Friedrich Nietzsche', 'Karl Marx'],
      e: 'Deconstruction is the method of the French philosopher Jacques Derrida. Architects such as Peter Eisenman and Bernard Tschumi engaged with his ideas, and the 1988 MoMA exhibition "Deconstructivist Architecture" fixed the label. Sartre is linked with existentialism, Nietzsche with the critique of morality and Marx with historical materialism.',
    },
    {
      id: 'c-pruitt-igoe', d: 3, t: [TAGS.movements],
      q: 'The critic Charles Jencks dated the "death of modern architecture" to the 1972 demolition of:',
      a: 'the Pruitt-Igoe housing project, St Louis',
      x: ['the Villa Savoye, Poissy', 'the Crystal Palace, London', 'the Seagram Building, New York'],
      e: 'Jencks, a leading voice of Postmodernism, symbolically dated Modernism’s end to the dynamiting of the Pruitt-Igoe housing blocks in St Louis in 1972. The Villa Savoye and the Seagram Building still stand, and the Crystal Palace burned down in 1936.',
    },
    // Islamic art and architecture
    {
      id: 'c-islamic-geometry-circle', d: 2, t: [TAGS.islamic],
      q: 'In traditional Islamic geometric design, a pattern is usually generated by:',
      a: 'dividing a circle into equal parts and joining the points into a grid',
      x: [
        'tracing the outlines of plants and animals directly from nature',
        'scattering motifs at random without any underlying structure',
        'enlarging a single human figure in proportional steps',
      ],
      e: 'Craftsmen start from a circle divided into equal parts with compass and straightedge; joining the points gives the polygons and stars that are repeated across a grid. Nature tracing, randomness and human figures are not the basis of this geometry.',
    },
    {
      id: 'c-eight-point-star', d: 1, o: 'past-paper', t: [TAGS.islamic],
      q: 'The eight-pointed star common in Islamic geometric patterns is formed by overlapping two:',
      a: 'squares, one rotated 45° relative to the other',
      x: [
        'equilateral triangles, one pointing up and one down',
        'regular pentagons, one rotated 36° relative to the other',
        'regular hexagons placed side by side',
      ],
      e: 'Two squares share a centre; turning one by 45° places their 4 + 4 corners evenly at every 45°, giving an eight-pointed star (as in the Rub el Hizb symbol). Two triangles make a six-pointed star, and two pentagons a ten-pointed one.',
    },
    {
      id: 'c-aniconism', d: 1, o: 'past-paper', t: [TAGS.islamic],
      q: 'Decoration in mosques relies mainly on geometry, arabesque and calligraphy because Islamic religious art:',
      a: 'avoids figural images of humans and animals in sacred spaces',
      x: [
        'lacked the tools needed to draw in realistic perspective',
        'was made only by craftsmen untrained in figure drawing',
        'was meant to be read solely as written religious text',
      ],
      e: 'Aniconism, the avoidance of figural imagery in religious settings, led artists to develop geometric, vegetal (arabesque) and calligraphic ornament. Islamic artists were highly skilled, and figural painting flourished in secular works such as Mughal miniatures.',
    },
    {
      id: 'c-badshahi-material', d: 1, t: [TAGS.islamic],
      q: 'The Badshahi Mosque in Lahore is built mainly of:',
      a: 'red sandstone, with white marble domes and inlay',
      x: [
        'white marble throughout, like the Taj Mahal',
        'brick faced entirely with glazed blue tiles',
        'exposed reinforced concrete',
      ],
      e: 'Built under Aurangzeb (completed 1673), the Badshahi Mosque is faced in red sandstone with white marble inlay and three white marble domes. All-marble cladding belongs to the Taj Mahal, tile-faced brick to buildings such as the Wazir Khan Mosque, and concrete to modern buildings.',
    },
    {
      id: 'c-makli-character', d: 1, o: 'past-paper', t: [TAGS.islamic],
      q: 'The Makli Necropolis near Thatta, Sindh, is best described as:',
      a: 'one of the world’s largest burial grounds, with carved stone and glazed-brick tombs',
      x: [
        'a terraced Mughal pleasure garden watered by fountains',
        'the ruins of a Buddhist monastery from the Gandhara period',
        'a sixteenth-century hill fort guarding the Grand Trunk Road',
      ],
      e: 'Makli holds hundreds of thousands of graves and monumental tombs of the Samma, Arghun, Tarkhan and Mughal periods (14th-18th centuries), with finely carved stone and glazed tile work. The garden describes Shalimar, the monastery Takht-i-Bahi and the fort Rohtas.',
    },
    // local crafts
    {
      id: 'c-khussa', d: 1, t: [TAGS.crafts],
      q: 'The traditional khussa of Punjab is a hand-made:',
      a: 'leather shoe, often with an upturned toe and embroidery',
      x: [
        'woollen shawl woven on a handloom',
        'block-printed cotton bed cover',
        'glazed clay water pitcher',
      ],
      e: 'Khussas are flat leather shoes, hand-stitched and often embellished with embroidery, with a pointed or curled-up toe. Shawls, block-printed cloth and glazed pottery are separate crafts.',
    },
    {
      id: 'c-sindhi-topi', d: 1, t: [TAGS.crafts],
      q: 'The traditional Sindhi topi (cap) is distinctive for its:',
      a: 'embroidery set with small mirrors and a cut-out arch at the front',
      x: [
        'flat, rolled woollen brim like the Chitrali cap',
        'tall conical shape of woven palm leaf',
        'plain white crocheted cotton dome',
      ],
      e: 'The Sindhi topi is a cylindrical cap covered in colourful embroidery with tiny mirror pieces (shisha work), with an arch cut out at the front. The rolled woollen brim is the Chitrali pakol; the other descriptions fit neither.',
    },
    // man and environment
    {
      id: 'c-vernacular-definition', d: 1, o: 'past-paper', t: [TAGS.environment],
      q: 'Vernacular architecture is best described as:',
      a: 'building by local people with local materials, shaped by climate and tradition',
      x: [
        'architecture designed by famous architects for international clients',
        'buildings assembled from standardised prefabricated steel and glass',
        'monumental architecture commissioned by emperors and kings',
      ],
      e: 'Vernacular architecture is the everyday, usually anonymous building of a region (the mud huts of Thar, the stone-and-timber houses of the north) that uses local materials and inherited know-how to suit the local climate and way of life.',
    },
    {
      id: 'c-chaunra', d: 2, t: [TAGS.environment, TAGS.crafts],
      q: 'The chaunra, a traditional dwelling of the Thar Desert, is:',
      a: 'a circular mud-walled hut with a conical thatched roof',
      x: [
        'a multi-storey timber house with carved wooden balconies',
        'a tent of woven goat hair moved with the herds',
        'a flat-roofed stone house built into a hillside',
      ],
      e: 'The chaunra has a round plan of thick mud (or mud-plastered) walls and a conical thatch roof. The round form exposes little wall to the sun, the mud stores heat, and the thatch insulates and sheds the rare rain: a vernacular answer to the hot, dry desert.',
    },
    {
      id: 'c-timber-laced-masonry', d: 2, t: [TAGS.environment],
      q: 'Traditional houses in the mountains of northern Pakistan often lace their stone walls with horizontal timber bands mainly to:',
      a: 'tie the masonry together so the walls resist earthquake shaking',
      x: [
        'keep rainwater from soaking into the stone',
        'decorate the facade with contrasting colours',
        'make the walls lighter so that they need no foundation',
      ],
      e: 'In this seismic region, timber bands (as in bhatar or cator-and-cribbage construction) hold loose stone courses together and let the wall flex during an earthquake instead of collapsing. Rain protection comes from roofs and plinths, and every wall still needs a foundation.',
    },
    {
      id: 'c-hassan-fathy', d: 2, t: [TAGS.environment, TAGS.people],
      q: 'The Egyptian architect who revived traditional mud-brick building for low-cost housing, described in his book "Architecture for the Poor", was:',
      a: 'Hassan Fathy',
      x: ['Geoffrey Bawa', 'Charles Correa', 'Vedat Dalokay'],
      e: 'Hassan Fathy built New Gourna (1940s) in mud brick with vaults, domes and courtyards suited to the hot climate, and argued for local materials and skills. Geoffrey Bawa was Sri Lankan, Charles Correa Indian, and Vedat Dalokay the Turkish designer of the Faisal Mosque.',
    },
  ]),
]);
