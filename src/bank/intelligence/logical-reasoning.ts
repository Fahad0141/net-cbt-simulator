import { defineBank } from '@/engine/authoring';
import { listText, numericOptions, pickDistractors } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);
/** 'a' or 'an' before a word. */
const aOrAn = (w: string): string => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);
/** Ordinal with digits: 1st, 2nd, 3rd, 4th, 11th, 22nd. */
function nth(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

const NAMES = [
  'Ali', 'Sara', 'Bilal', 'Hina', 'Usman', 'Ayesha', 'Hamza', 'Zainab', 'Omar', 'Fatima',
  'Kamran', 'Nida', 'Faisal', 'Sana', 'Tariq', 'Maryam', 'Imran', 'Rabia', 'Asad', 'Mehwish',
] as const;

/** Options for "which person" questions: the answer plus three other people. */
function nameOptions(r: Rng, answer: string, others: readonly string[]): { answer: string; distractors: string[] } {
  return { answer, distractors: pickDistractors(answer, r.shuffle(others.filter((n) => n !== answer))) };
}

/** Every permutation of 0..n-1 (as arrays). */
function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const rest of permutations(n - 1)) {
    for (let i = 0; i <= rest.length; i++) out.push([...rest.slice(0, i), n - 1, ...rest.slice(i)]);
  }
  return out;
}

/** The seat of each person when `order[seat] = person`. */
function seatsOf(order: readonly number[]): number[] {
  const pos = new Array<number>(order.length);
  order.forEach((person, seat) => {
    pos[person] = seat;
  });
  return pos;
}

interface Clue {
  text: string;
  /** Machine-readable fact, used to avoid asking what a clue states outright. */
  fact: string;
  test: (pos: readonly number[]) => boolean;
}

/**
 * Greedily picks clues (in random order) until exactly `target` candidate seatings remain,
 * then drops any clue that is not needed. Returns null if the clues cannot pin it down.
 */
function chooseClues(r: Rng, all: readonly Clue[], candidates: readonly (readonly number[])[], target: number): Clue[] | null {
  let sols = candidates;
  const chosen: Clue[] = [];
  for (const clue of r.shuffle(all)) {
    const next = sols.filter((p) => clue.test(p));
    if (next.length < sols.length) {
      chosen.push(clue);
      sols = next;
    }
    if (sols.length === target) break;
  }
  if (sols.length !== target) return null;
  // Remove redundant clues.
  for (const clue of r.shuffle(chosen)) {
    const rest = chosen.filter((c) => c !== clue);
    if (candidates.filter((p) => rest.every((c) => c.test(p))).length === target) {
      chosen.splice(chosen.indexOf(clue), 1);
    }
  }
  return chosen;
}

// ---------------------------------------------------------------------------
// Syllogism engine (Venn-region models)
// ---------------------------------------------------------------------------

type CatKind = 'all' | 'no' | 'some' | 'some-not';
interface Cat {
  k: CatKind;
  s: number;
  p: number;
}
const KINDS: readonly CatKind[] = ['all', 'no', 'some', 'some-not'];

const NOUNS = [
  'pens', 'books', 'chairs', 'tables', 'birds', 'trees', 'cars', 'boxes', 'lamps', 'cups', 'rings',
  'stones', 'kites', 'clocks', 'doors', 'bags', 'bottles', 'coins', 'shirts', 'flowers', 'roads',
  'bricks', 'windows', 'phones', 'keys', 'shoes', 'mangoes', 'apples', 'buses', 'pencils',
] as const;

/** Does the statement hold in a model? Bit (r - 1) of `model` says Venn region r is non-empty. */
function holds(c: Cat, model: number, regions: number): boolean {
  for (let r = 1; r < regions; r++) {
    if (((model >> (r - 1)) & 1) === 0) continue;
    const s = ((r >> c.s) & 1) === 1;
    const p = ((r >> c.p) & 1) === 1;
    if (c.k === 'all' && s && !p) return false;
    if (c.k === 'no' && s && p) return false;
    if (c.k === 'some' && s && p) return true;
    if (c.k === 'some-not' && s && !p) return true;
  }
  return c.k === 'all' || c.k === 'no';
}

interface Universe {
  regions: number;
  /** Every model of the premises (terms may be empty: modern logic). */
  all: number[];
  /** Models of the premises in which every term is non-empty (traditional convention). */
  full: number[];
}

function universe(n: number, premises: readonly Cat[]): Universe {
  const regions = 1 << n;
  const total = 1 << (regions - 1);
  const termMask: number[] = [];
  for (let t = 0; t < n; t++) {
    let mask = 0;
    for (let r = 1; r < regions; r++) if ((r >> t) & 1) mask |= 1 << (r - 1);
    termMask.push(mask);
  }
  const all: number[] = [];
  const full: number[] = [];
  for (let m = 0; m < total; m++) {
    if (!premises.every((c) => holds(c, m, regions))) continue;
    all.push(m);
    if (termMask.every((mask) => (m & mask) !== 0)) full.push(m);
  }
  return { regions, all, full };
}

/** Follows under every convention (true even when classes may be empty). */
const mustFollow = (u: Universe, c: Cat): boolean => u.all.every((m) => holds(c, m, u.regions));
/** Fails to follow under every convention (can be false even when all classes are non-empty). */
const canFail = (u: Universe, c: Cat): boolean => u.full.some((m) => !holds(c, m, u.regions));

function catText(c: Cat, T: readonly string[]): string {
  const S = T[c.s];
  const P = T[c.p];
  switch (c.k) {
    case 'all':
      return `All ${S} are ${P}`;
    case 'no':
      return `No ${S} are ${P}`;
    case 'some':
      return `Some ${S} are ${P}`;
    default:
      return `Some ${S} are not ${P}`;
  }
}

const sameCat = (a: Cat, b: Cat): boolean => a.k === b.k && a.s === b.s && a.p === b.p;

function catsOver(pairs: ReadonlyArray<readonly [number, number]>): Cat[] {
  return pairs.flatMap(([s, p]) => KINDS.map((k) => ({ k, s, p })));
}

/** A statement of kind k between terms x and y (random direction where direction matters). */
function relate(r: Rng, k: CatKind, x: number, y: number): Cat {
  return r.chance(0.5) ? { k, s: x, p: y } : { k, s: y, p: x };
}

/**
 * A one-step justification of `c` from the premises, or null if `c` is not one of the
 * standard valid two-premise inferences (or a conversion of a single premise).
 */
function reasonFor(prem: readonly Cat[], c: Cat, T: readonly string[]): string | null {
  const has = (k: CatKind, s: number, p: number): boolean => prem.some((x) => x.k === k && x.s === s && x.p === p);
  const sym = (k: CatKind, x: number, y: number): boolean => has(k, x, y) || has(k, y, x);
  for (const x of prem) {
    if ((x.k === 'no' || x.k === 'some') && x.k === c.k && x.s === c.p && x.p === c.s) {
      return `"${catText(x, T)}" may be reversed: ${catText(c, T)}.`;
    }
  }
  const a = c.s;
  const z = c.p;
  const A = T[a];
  const Z = T[z];
  for (let m = 0; m < T.length; m++) {
    if (m === a || m === z) continue;
    const M = T[m];
    if (c.k === 'all') {
      if (has('all', a, m) && has('all', m, z)) return `All ${A} are ${M} and all ${M} are ${Z}, so all ${A} are ${Z}.`;
    } else if (c.k === 'no') {
      if (has('all', a, m) && sym('no', m, z)) return `All ${A} are ${M}, and no ${M} are ${Z}; so no ${A} can be ${Z}.`;
      if (has('all', z, m) && sym('no', m, a)) {
        return `All ${Z} are ${M}, and no ${M} are ${A}; so no ${Z} are ${A}, which also means no ${A} are ${Z}.`;
      }
    } else if (c.k === 'some') {
      if (sym('some', a, m) && has('all', m, z)) return `Some ${A} are ${M}, and all ${M} are ${Z}; so those ${A} are ${Z}.`;
      if (sym('some', z, m) && has('all', m, a)) {
        return `Some ${Z} are ${M}, and all ${M} are ${A}; so some ${Z} are ${A}, which also means some ${A} are ${Z}.`;
      }
    } else {
      if (sym('some', a, m) && sym('no', m, z)) return `Some ${A} are ${M}, and no ${M} are ${Z}; so those ${A} are not ${Z}.`;
      if (has('all', z, m) && has('some-not', a, m)) return `All ${Z} are ${M}, but some ${A} are not ${M}; those ${A} cannot be ${Z}.`;
      if (has('some-not', m, z) && has('all', m, a)) {
        return `Some ${M} are not ${Z}, and all ${M} are ${A}; those ${M} are ${A} that are not ${Z}.`;
      }
    }
  }
  return null;
}

const SYLLOGISM_NOTE = '(Take the statements to be true even if they seem to contradict commonly known facts.)';

function statementsBlock(prem: readonly Cat[], T: readonly string[]): string {
  return prem.map((c) => `${catText(c, T)}.`).join('\n');
}

// ---------------------------------------------------------------------------
// Odd one out helpers
// ---------------------------------------------------------------------------

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
const isSquare = (n: number): boolean => Math.round(Math.sqrt(n)) ** 2 === n;
const isCube = (n: number): boolean => Math.round(Math.cbrt(n)) ** 3 === n;
const gcd2 = (a: number, c: number): number => (c === 0 ? a : gcd2(c, a % c));
const smallestFactor = (n: number): number => {
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d;
  return n;
};

/** Properties a candidate might use to single out one number. */
const NUMBER_PROPERTIES: ReadonlyArray<(n: number) => boolean> = [
  isPrime,
  isSquare,
  isCube,
  (n) => n >= 100,
  (n) => n < 10,
  ...[2, 3, 5].map((d) => (n: number) => n % d === 0),
];
/**
 * Weaker properties that compete only when three of the four numbers share them
 * (12, 24, 44, 18: multiples of 4 would single out 18 instead of 44).
 */
const SHARED_NUMBER_PROPERTIES: ReadonlyArray<(n: number) => boolean> = [
  ...Array.from({ length: 22 }, (_, i) => (n: number) => n % (i + 4) === 0), // multiples of 4 to 25
  (n) => n >= 10 && String(n) === [...String(n)].reverse().join(''),
];

/** True when no option other than `answer` stands out under any simple property. */
function onlyAnswerStandsOut<T>(items: readonly T[], answer: number, props: ReadonlyArray<(x: T) => boolean>): boolean {
  for (const prop of props) {
    const has = items.map(prop);
    const count = has.filter(Boolean).length;
    if (count === 1 && has.indexOf(true) !== answer) return false;
    if (count === items.length - 1 && has.indexOf(false) !== answer) return false;
  }
  return true;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letter = (i: number): string => LETTERS[i];
const VOWELS = new Set([0, 4, 8, 14, 20]);

// ---------------------------------------------------------------------------
// Curated data
// ---------------------------------------------------------------------------

interface WordCategory {
  label: string;
  members: readonly string[];
  /** Outsiders with what they are instead. */
  outsiders: ReadonlyArray<readonly [string, string]>;
}

const WORD_CATEGORIES: readonly WordCategory[] = [
  {
    label: 'planets of the solar system',
    members: ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Neptune', 'Uranus'],
    outsiders: [['Moon', 'a natural satellite'], ['Sun', 'a star'], ['Titan', 'a moon of Saturn']],
  },
  {
    label: 'stringed instruments',
    members: ['Guitar', 'Violin', 'Sitar', 'Cello', 'Harp', 'Rabab'],
    outsiders: [['Flute', 'a wind instrument'], ['Tabla', 'a percussion instrument'], ['Trumpet', 'a wind instrument'], ['Drum', 'a percussion instrument']],
  },
  {
    label: 'metals',
    members: ['Iron', 'Copper', 'Zinc', 'Silver', 'Aluminium', 'Gold', 'Lead'],
    outsiders: [['Sulphur', 'a non-metal'], ['Carbon', 'a non-metal'], ['Phosphorus', 'a non-metal'], ['Iodine', 'a non-metal']],
  },
  {
    // Metric only: mixing in Inch or Mile would let "the only non-metric unit" compete.
    label: 'units of length',
    members: ['Metre', 'Kilometre', 'Centimetre', 'Millimetre'],
    outsiders: [['Litre', 'a unit of volume'], ['Gram', 'a unit of mass'], ['Second', 'a unit of time'], ['Hectare', 'a unit of area']],
  },
  {
    label: 'continents',
    members: ['Asia', 'Africa', 'Europe', 'Antarctica', 'North America', 'South America'],
    // No American countries: "North America, South America, Brazil" vs Asia would compete.
    outsiders: [['Germany', 'a country'], ['Egypt', 'a country'], ['Pakistan', 'a country'], ['Japan', 'a country']],
  },
  {
    label: 'birds',
    members: ['Sparrow', 'Eagle', 'Crow', 'Parrot', 'Pigeon', 'Owl', 'Peacock'],
    outsiders: [['Bat', 'a mammal (it flies but is not a bird)'], ['Butterfly', 'an insect'], ['Bee', 'an insect']],
  },
  {
    label: 'plane (two-dimensional) figures',
    // No Circle: "the only figure without corners" would compete with the intended answer.
    members: ['Square', 'Triangle', 'Rectangle', 'Pentagon', 'Hexagon', 'Rhombus'],
    outsiders: [['Cube', 'a solid (three-dimensional) figure'], ['Sphere', 'a solid (three-dimensional) figure'], ['Cone', 'a solid (three-dimensional) figure'], ['Cylinder', 'a solid (three-dimensional) figure']],
  },
  {
    label: 'input devices of a computer',
    members: ['Keyboard', 'Mouse', 'Scanner', 'Microphone', 'Joystick'],
    outsiders: [['Printer', 'an output device'], ['Monitor', 'an output device'], ['Speaker', 'an output device'], ['Plotter', 'an output device']],
  },
  {
    label: 'units of mass',
    members: ['Kilogram', 'Gram', 'Tonne', 'Milligram'],
    outsiders: [['Newton', 'a unit of force'], ['Joule', 'a unit of energy'], ['Litre', 'a unit of volume'], ['Pascal', 'a unit of pressure']],
  },
  {
    label: 'rivers',
    members: ['Indus', 'Nile', 'Amazon', 'Danube', 'Thames', 'Jhelum', 'Chenab'],
    // No Thar: with Indus/Jhelum/Chenab, "the only one not in Pakistan" would compete.
    outsiders: [['Everest', 'a mountain'], ['Sahara', 'a desert'], ['Gobi', 'a desert']],
  },
  {
    label: 'noble gases',
    members: ['Helium', 'Neon', 'Argon', 'Krypton', 'Xenon'],
    outsiders: [['Oxygen', 'a reactive gas, not a noble gas'], ['Nitrogen', 'not a noble gas'], ['Hydrogen', 'not a noble gas'], ['Chlorine', 'a halogen, not a noble gas']],
  },
  {
    label: 'fish',
    members: ['Salmon', 'Trout', 'Tuna', 'Shark', 'Mackerel', 'Rohu'],
    outsiders: [['Whale', 'a mammal'], ['Dolphin', 'a mammal'], ['Starfish', 'an echinoderm, not a fish'], ['Jellyfish', 'a cnidarian, not a fish']],
  },
];

type AnimalRel = 'young' | 'home' | 'sound';
interface Animal {
  name: string;
  young?: string;
  home?: string;
  sound?: string;
}
const ANIMALS: readonly Animal[] = [
  { name: 'Dog', young: 'Puppy', home: 'Kennel', sound: 'Bark' },
  { name: 'Horse', young: 'Foal', home: 'Stable', sound: 'Neigh' },
  { name: 'Lion', young: 'Cub', home: 'Den', sound: 'Roar' },
  { name: 'Pig', young: 'Piglet', home: 'Sty', sound: 'Grunt' },
  { name: 'Cat', young: 'Kitten', sound: 'Mew' },
  { name: 'Cow', young: 'Calf', home: 'Cowshed', sound: 'Moo' },
  { name: 'Bee', home: 'Hive', sound: 'Buzz' },
  { name: 'Hen', young: 'Chick', home: 'Coop', sound: 'Cluck' },
  { name: 'Duck', young: 'Duckling', sound: 'Quack' },
  { name: 'Frog', young: 'Tadpole', sound: 'Croak' },
  { name: 'Spider', home: 'Web' },
  { name: 'Owl', young: 'Owlet', sound: 'Hoot' },
  { name: 'Rabbit', home: 'Burrow' },
  { name: 'Elephant', young: 'Calf', sound: 'Trumpet' },
  { name: 'Goat', young: 'Kid', sound: 'Bleat' },
  { name: 'Donkey', young: 'Foal', sound: 'Bray' },
  { name: 'Snake', sound: 'Hiss' },
  { name: 'Bear', young: 'Cub', home: 'Den', sound: 'Growl' },
  { name: 'Wolf', young: 'Cub', home: 'Den', sound: 'Howl' },
];
const ANIMAL_REL_TEXT: Record<AnimalRel, string> = {
  young: 'young one',
  home: 'home',
  sound: 'sound',
};

type WorkerRel = 'tool' | 'place' | 'product';
interface Worker {
  name: string;
  tool?: string;
  place?: string;
  product?: string;
}
const WORKERS: readonly Worker[] = [
  { name: 'Carpenter', tool: 'Saw', place: 'Workshop', product: 'Furniture' },
  { name: 'Surgeon', tool: 'Scalpel', place: 'Operating theatre' },
  { name: 'Painter', tool: 'Brush', place: 'Studio', product: 'Painting' },
  { name: 'Farmer', tool: 'Plough', place: 'Field', product: 'Crops' },
  { name: 'Barber', tool: 'Razor', place: 'Salon' },
  { name: 'Astronomer', tool: 'Telescope', place: 'Observatory' },
  { name: 'Biologist', tool: 'Microscope', place: 'Laboratory' },
  { name: 'Judge', tool: 'Gavel', place: 'Court', product: 'Verdict' },
  { name: 'Mechanic', tool: 'Spanner', place: 'Garage' },
  { name: 'Sculptor', tool: 'Chisel', product: 'Statue' },
  { name: 'Author', tool: 'Pen', product: 'Book' },
  { name: 'Pilot', place: 'Cockpit' },
  { name: 'Chef', tool: 'Ladle', place: 'Kitchen', product: 'Meal' },
  { name: 'Blacksmith', tool: 'Anvil', place: 'Forge', product: 'Horseshoe' },
  { name: 'Potter', tool: 'Wheel', product: 'Pot' },
  { name: 'Poet', product: 'Poem' },
  { name: 'Baker', tool: 'Oven', place: 'Bakery', product: 'Bread' },
  { name: 'Weaver', tool: 'Loom', product: 'Cloth' },
  { name: 'Doctor', tool: 'Stethoscope', place: 'Hospital' },
  { name: 'Teacher', place: 'Classroom' },
];
const WORKER_REL_TEXT: Record<WorkerRel, string> = {
  tool: 'the tool the worker uses',
  place: 'the place where the worker works',
  product: 'what the worker produces',
};

const DICTIONARY_GROUPS: ReadonlyArray<readonly string[]> = [
  ['parent', 'paragraph', 'parallel', 'paradise', 'parasite', 'parade', 'partial', 'particle', 'parcel', 'pardon'],
  ['station', 'stationery', 'statue', 'status', 'stature', 'statement', 'static', 'statistic'],
  ['contract', 'contrast', 'control', 'contribute', 'contrary', 'contour', 'context', 'contest'],
  ['interest', 'interval', 'internal', 'interior', 'interview', 'interfere', 'internet', 'interact'],
  ['present', 'preserve', 'president', 'press', 'pressure', 'prestige', 'presume', 'pretend'],
  ['complete', 'complex', 'comply', 'compose', 'compound', 'compute', 'comrade', 'compare'],
  ['brain', 'brake', 'branch', 'brand', 'brass', 'brave', 'bread', 'breath', 'bracket'],
  ['material', 'mathematics', 'matrix', 'matter', 'mature', 'maximum', 'matron', 'match'],
  ['general', 'generous', 'genius', 'gentle', 'genuine', 'generate', 'genetic', 'genre'],
  ['transfer', 'transform', 'transit', 'translate', 'transmit', 'transport', 'trance', 'transparent'],
];

interface Conditional {
  rule: string;
  pYes: string;
  pNo: string;
  pClause: string;
  qYes: string;
  qNo: string;
  qClause: string;
}

/** `n` is a person's name where the scenario needs one. */
const CONDITIONALS: ReadonlyArray<(n: string) => Conditional> = [
  () => ({
    rule: 'Whenever it rains, the cricket match is called off.',
    pYes: 'It rained yesterday.', pNo: 'It did not rain yesterday.', pClause: 'it rained yesterday',
    qYes: 'The match was called off yesterday.', qNo: 'The match was not called off yesterday.', qClause: 'the match was called off yesterday',
  }),
  (n) => ({
    rule: 'Every candidate who passes the entry test is offered admission.',
    pYes: `${n} passed the entry test.`, pNo: `${n} did not pass the entry test.`, pClause: `${n} passed the entry test`,
    qYes: `${n} was offered admission.`, qNo: `${n} was not offered admission.`, qClause: `${n} was offered admission`,
  }),
  () => ({
    rule: 'Whenever the alarm rings, the guard opens the gate.',
    pYes: 'The alarm rang this morning.', pNo: 'The alarm did not ring this morning.', pClause: 'the alarm rang this morning',
    qYes: 'The guard opened the gate this morning.', qNo: 'The guard did not open the gate this morning.', qClause: 'the guard opened the gate this morning',
  }),
  () => ({
    rule: 'Whenever the temperature falls below zero, the pond freezes.',
    pYes: 'The temperature fell below zero last night.', pNo: 'The temperature did not fall below zero last night.', pClause: 'the temperature fell below zero last night',
    qYes: 'The pond froze last night.', qNo: 'The pond did not freeze last night.', qClause: 'the pond froze last night',
  }),
  () => ({
    rule: 'Whenever there is fog at the airport, the flights are delayed.',
    pYes: 'There was fog at the airport on Monday.', pNo: 'There was no fog at the airport on Monday.', pClause: 'there was fog at the airport on Monday',
    qYes: 'The flights were delayed on Monday.', qNo: 'The flights were not delayed on Monday.', qClause: 'the flights were delayed on Monday',
  }),
  (n) => ({
    rule: 'Every member who pays the annual fee receives a membership card.',
    pYes: `${n} paid the annual fee.`, pNo: `${n} did not pay the annual fee.`, pClause: `${n} paid the annual fee`,
    qYes: `${n} received a membership card.`, qNo: `${n} did not receive a membership card.`, qClause: `${n} received a membership card`,
  }),
  () => ({
    rule: 'Whenever the shop runs out of bread, it closes early.',
    pYes: 'The shop ran out of bread on Friday.', pNo: 'The shop did not run out of bread on Friday.', pClause: 'the shop ran out of bread on Friday',
    qYes: 'The shop closed early on Friday.', qNo: 'The shop did not close early on Friday.', qClause: 'the shop closed early on Friday',
  }),
  (n) => ({
    rule: 'Everyone who completes the course receives a certificate.',
    pYes: `${n} completed the course.`, pNo: `${n} did not complete the course.`, pClause: `${n} completed the course`,
    qYes: `${n} received a certificate.`, qNo: `${n} did not receive a certificate.`, qClause: `${n} received a certificate`,
  }),
  () => ({
    rule: 'Whenever the river rises above the danger mark, the bridge is closed.',
    pYes: 'The river rose above the danger mark on Sunday.', pNo: 'The river did not rise above the danger mark on Sunday.', pClause: 'the river rose above the danger mark on Sunday',
    qYes: 'The bridge was closed on Sunday.', qNo: 'The bridge was not closed on Sunday.', qClause: 'the bridge was closed on Sunday',
  }),
  () => ({
    rule: 'Whenever the electricity fails, the generator starts automatically.',
    pYes: 'The electricity failed at noon.', pNo: 'The electricity did not fail at noon.', pClause: 'the electricity failed at noon',
    qYes: 'The generator started at noon.', qNo: 'The generator did not start at noon.', qClause: 'the generator started at noon',
  }),
];

/** Number rules for analogies and odd-pair questions. */
interface NumRule {
  f: (n: number) => number;
  /** LaTeX of f(n) with n substituted, e.g. `5^2 + 1`. */
  show: (n: number) => string;
  /** Description of the rule. */
  name: string;
  max: number;
}
const NUM_RULES: readonly NumRule[] = [
  { name: 'the square of the number', f: (n) => n * n, show: (n) => `${n}^2`, max: 15 },
  { name: 'the cube of the number', f: (n) => n ** 3, show: (n) => `${n}^3`, max: 9 },
  { name: 'the square of the number plus 1', f: (n) => n * n + 1, show: (n) => `${n}^2 + 1`, max: 15 },
  { name: 'the square of the number minus 1', f: (n) => n * n - 1, show: (n) => `${n}^2 - 1`, max: 15 },
  { name: 'the number times the next number', f: (n) => n * (n + 1), show: (n) => `${n} \\times ${n + 1}`, max: 14 },
  { name: 'the cube of the number plus 1', f: (n) => n ** 3 + 1, show: (n) => `${n}^3 + 1`, max: 9 },
  { name: 'the cube of the number minus 1', f: (n) => n ** 3 - 1, show: (n) => `${n}^3 - 1`, max: 9 },
  { name: 'the square of the next number', f: (n) => (n + 1) ** 2, show: (n) => `(${n} + 1)^2`, max: 14 },
  { name: 'the cube of the number minus the number', f: (n) => n ** 3 - n, show: (n) => `${n}^3 - ${n}`, max: 9 },
  { name: 'twice the square of the number', f: (n) => 2 * n * n, show: (n) => `2 \\times ${n}^2`, max: 12 },
];
/** Extra simple rules used only to check that an analogy has a single reasonable answer. */
const CHECK_RULES: ReadonlyArray<(n: number) => number> = [
  ...NUM_RULES.map((r) => r.f),
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => (n: number) => k * n),
  ...Array.from({ length: 30 }, (_, k) => (n: number) => n + k + 1),
  (n) => 2 * n + 1,
  (n) => 2 * n - 1,
  (n) => n * n + n + 1,
  (n) => n * n - n,
  (n) => n * n + 2,
  (n) => n * n - 2,
];

// ---------------------------------------------------------------------------
// The chapter
// ---------------------------------------------------------------------------

export default defineBank('intelligence', 'logical-reasoning', (b) => [
  // ---------------------------------------------------------------- syllogisms
  b.dynamic('syllogism-valid-conclusion', { difficulty: 1, origin: 'past-paper', tags: ['syllogisms'] }, (r) => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const T = r.sample(NOUNS, 3);
      const p1 = relate(r, r.weighted(KINDS, [4, 3, 3, 2]), 0, 1);
      const p2 = relate(r, r.weighted(KINDS, [4, 3, 3, 2]), 1, 2);
      const prem = r.chance(0.5) ? [p1, p2] : [p2, p1];
      const u = universe(3, prem);
      if (!u.full.length) continue;
      const ends = catsOver([[0, 2], [2, 0]]);
      const valid = ends.filter((c) => mustFollow(u, c));
      if (!valid.length) continue;
      const correct = r.pick(valid);
      const reason = reasonFor(prem, correct, T);
      if (!reason) continue;
      const wrong = [
        ...r.shuffle(ends.filter((c) => canFail(u, c))),
        ...r.shuffle(catsOver([[0, 1], [1, 0], [1, 2], [2, 1]]).filter((c) => canFail(u, c))),
      ].map((c) => catText(c, T));
      const answer = catText(correct, T);
      const distractors = pickDistractors(answer, wrong);
      return {
        stem: `Statements:\n${statementsBlock(prem, T)}\n\n${SYLLOGISM_NOTE}\n\nWhich conclusion definitely follows from the statements?`,
        answer,
        distractors,
        explanation: `${reason} Each of the other conclusions can be false while both statements are true, so it does not necessarily follow.`,
      };
    }
    throw new Error('syllogism-valid-conclusion: no premises found');
  }),

  b.dynamic('syllogism-two-conclusions', { difficulty: 2, origin: 'past-paper', tags: ['syllogisms', 'statements and conclusions'] }, (r) => {
    const ONLY_I = 'Only conclusion I follows';
    const ONLY_II = 'Only conclusion II follows';
    const BOTH = 'Both I and II follow';
    const NEITHER = 'Neither I nor II follows';
    const target = r.weighted(['i', 'ii', 'both', 'neither'] as const, [3, 3, 2, 2]);
    for (let attempt = 0; attempt < 500; attempt++) {
      const T = r.sample(NOUNS, 3);
      const prem = r.shuffle([relate(r, r.weighted(KINDS, [4, 3, 3, 2]), 0, 1), relate(r, r.weighted(KINDS, [4, 3, 3, 2]), 1, 2)]);
      const u = universe(3, prem);
      if (!u.full.length) continue;
      const pool = r
        .shuffle([...catsOver([[0, 2], [2, 0]]), ...catsOver([[0, 2], [2, 0]]), ...catsOver([[0, 1], [1, 0], [1, 2], [2, 1]])])
        .filter((c) => !prem.some((x) => sameCat(x, c)));
      const valid = pool.filter((c) => mustFollow(u, c) && reasonFor(prem, c, T));
      const invalid = pool.filter((c) => canFail(u, c));
      // A conclusion and its simple converse ("No A are B" / "No B are A") say the same thing.
      const sameClaim = (a: Cat, c: Cat): boolean =>
        sameCat(a, c) || ((a.k === 'no' || a.k === 'some') && a.k === c.k && a.s === c.p && a.p === c.s);
      let c1: Cat | undefined;
      let c2: Cat | undefined;
      if (target === 'both') {
        c1 = valid[0];
        c2 = valid.find((c) => !sameClaim(c, valid[0]));
      } else if (target === 'i') {
        c1 = valid[0];
        c2 = invalid[0];
      } else if (target === 'ii') {
        c1 = invalid[0];
        c2 = valid[0];
      } else {
        // Avoid "either-or" pairs: some situation must make both conclusions false.
        c1 = invalid[0];
        c2 = invalid.find(
          (c) => !sameClaim(c, invalid[0]) && u.full.some((m) => !holds(c, m, u.regions) && !holds(invalid[0], m, u.regions)),
        );
      }
      if (!c1 || !c2) continue;
      const first = c1;
      const second = c2;
      const verdict = (c: Cat, label: string): string =>
        mustFollow(u, c)
          ? `Conclusion ${label} follows: ${reasonFor(prem, c, T) ?? ''}`
          : `Conclusion ${label} does not follow: it can be false while both statements are true.`;
      const answer = { i: ONLY_I, ii: ONLY_II, both: BOTH, neither: NEITHER }[target];
      const order = [ONLY_I, ONLY_II, BOTH, NEITHER];
      return {
        stem: `Statements:\n${statementsBlock(prem, T)}\n\nConclusions:\nI. ${catText(first, T)}.\nII. ${catText(second, T)}.\n\n${SYLLOGISM_NOTE}\n\nWhich of the following is correct?`,
        answer,
        distractors: order.filter((o) => o !== answer),
        fixedOrder: order,
        explanation: `${verdict(first, 'I')} ${verdict(second, 'II')}`,
      };
    }
    throw new Error('syllogism-two-conclusions: no premises found');
  }),

  b.dynamic('syllogism-three-statements', { difficulty: 3, tags: ['syllogisms'] }, (r) => {
    const ends = catsOver([[0, 3], [3, 0]]);
    for (let attempt = 0; attempt < 2000; attempt++) {
      const T = r.sample(NOUNS, 4);
      const kinds = [0, 1, 2].map(() => r.weighted(KINDS, [5, 2, 3, 1]));
      if (kinds.every((k) => k === 'all')) continue;
      const p1 = relate(r, kinds[0], 0, 1);
      const p2 = relate(r, kinds[1], 1, 2);
      const p3 = relate(r, kinds[2], 2, 3);
      // Find a two-step derivation of a conclusion linking the end terms.
      let found: { c: Cat; steps: string } | null = null;
      for (const c of r.shuffle(ends)) {
        for (const mid of catsOver([[0, 2], [2, 0]])) {
          const s1 = reasonFor([p1, p2], mid, T);
          const s2 = s1 && reasonFor([mid, p3], c, T);
          if (s1 && s2) found = { c, steps: `${s1} Then, with "${catText(p3, T)}": ${s2}` };
          if (found) break;
        }
        if (found) break;
        for (const mid of catsOver([[1, 3], [3, 1]])) {
          const s1 = reasonFor([p2, p3], mid, T);
          const s2 = s1 && reasonFor([p1, mid], c, T);
          if (s1 && s2) found = { c, steps: `${s1} Then, with "${catText(p1, T)}": ${s2}` };
          if (found) break;
        }
        if (found) break;
      }
      if (!found) continue;
      const prem = r.shuffle([p1, p2, p3]);
      const u = universe(4, prem);
      if (!u.full.length || !mustFollow(u, found.c)) continue;
      const wrong = [
        ...r.shuffle(ends.filter((c) => canFail(u, c))),
        ...r.shuffle(catsOver([[0, 2], [2, 0], [1, 3], [3, 1]]).filter((c) => canFail(u, c))),
      ].map((c) => catText(c, T));
      const answer = catText(found.c, T);
      return {
        stem: `Statements:\n${statementsBlock(prem, T)}\n\n${SYLLOGISM_NOTE}\n\nWhich conclusion definitely follows from the statements?`,
        answer,
        distractors: pickDistractors(answer, wrong),
        explanation: `${found.steps} The other conclusions can be false while all three statements are true.`,
      };
    }
    throw new Error('syllogism-three-statements: no premises found');
  }),

  // ---------------------------------------------------------------- arrangements
  b.dynamic('linear-seating', { difficulty: 2, origin: 'past-paper', tags: ['arrangements'] }, (r) => {
    const n = 5;
    const perms = permutations(n).map(seatsOf);
    for (let attempt = 0; attempt < 200; attempt++) {
      const N = r.sample(NAMES, n);
      const order = r.shuffle([0, 1, 2, 3, 4]);
      const pos = seatsOf(order);
      const clues: Clue[] = [];
      for (let x = 0; x < n; x++) {
        const px = pos[x];
        if (px === 0) clues.push({ text: `${N[x]} sits at the extreme left end.`, fact: `left-end:${x}`, test: (p) => p[x] === 0 });
        if (px === n - 1) clues.push({ text: `${N[x]} sits at the extreme right end.`, fact: `right-end:${x}`, test: (p) => p[x] === n - 1 });
        if (px === 0 || px === n - 1) {
          clues.push({ text: `${N[x]} sits at one of the two ends.`, fact: `end:${x}`, test: (p) => p[x] === 0 || p[x] === n - 1 });
        } else {
          clues.push({ text: `${N[x]} does not sit at either end.`, fact: `not-end:${x}`, test: (p) => p[x] !== 0 && p[x] !== n - 1 });
        }
        if (px === 2) clues.push({ text: `${N[x]} sits exactly in the middle.`, fact: `middle:${x}`, test: (p) => p[x] === 2 });
        if (px === 1) clues.push({ text: `${N[x]} sits second from the left end.`, fact: `second-left:${x}`, test: (p) => p[x] === 1 });
        if (px === n - 2) clues.push({ text: `${N[x]} sits second from the right end.`, fact: `second-right:${x}`, test: (p) => p[x] === n - 2 });
        for (let y = 0; y < n; y++) {
          if (y === x) continue;
          const py = pos[y];
          if (px === py - 1) {
            clues.push({ text: `${N[x]} sits immediately to the left of ${N[y]}.`, fact: `imm:${x}:${y}`, test: (p) => p[x] === p[y] - 1 });
            clues.push({ text: `${N[y]} sits immediately to the right of ${N[x]}.`, fact: `imm:${x}:${y}`, test: (p) => p[x] === p[y] - 1 });
          }
          if (px < py - 1) clues.push({ text: `${N[x]} sits somewhere to the left of ${N[y]}.`, fact: `left:${x}:${y}`, test: (p) => p[x] < p[y] });
          if (x < y) {
            const d = Math.abs(px - py);
            if (d === 1) clues.push({ text: `${N[x]} and ${N[y]} sit next to each other.`, fact: `adj:${x}:${y}`, test: (p) => Math.abs(p[x] - p[y]) === 1 });
            else clues.push({ text: `${N[x]} does not sit next to ${N[y]}.`, fact: `nadj:${x}:${y}`, test: (p) => Math.abs(p[x] - p[y]) !== 1 });
            if (d === 2) clues.push({ text: `Exactly one person sits between ${N[x]} and ${N[y]}.`, fact: `gap1:${x}:${y}`, test: (p) => Math.abs(p[x] - p[y]) === 2 });
          }
        }
        if (px > 0 && px < n - 1) {
          const [y, z] = r.shuffle([order[px - 1], order[px + 1]]);
          // "Immediately": in a row, a bare "between" could also mean anywhere between the two.
          clues.push({
            text: `${N[x]} sits immediately between ${N[y]} and ${N[z]}.`,
            fact: `between:${x}`,
            test: (p) => Math.abs(p[x] - p[y]) === 1 && Math.abs(p[x] - p[z]) === 1,
          });
        }
      }
      const chosen = chooseClues(r, clues, perms, 1);
      if (!chosen || chosen.length < 3 || chosen.length > 6) continue;
      const facts = new Set(chosen.map((c) => c.fact));
      const questions: Array<{ q: string; ans: number; fact: string; exclude: number }> = [
        { q: 'Who sits exactly in the middle?', ans: order[2], fact: `middle:${order[2]}`, exclude: -1 },
        { q: 'Who sits at the extreme left end?', ans: order[0], fact: `left-end:${order[0]}`, exclude: -1 },
        { q: 'Who sits at the extreme right end?', ans: order[n - 1], fact: `right-end:${order[n - 1]}`, exclude: -1 },
        { q: 'Who sits second from the left end?', ans: order[1], fact: `second-left:${order[1]}`, exclude: -1 },
        { q: 'Who sits second from the right end?', ans: order[n - 2], fact: `second-right:${order[n - 2]}`, exclude: -1 },
      ];
      for (let s = 0; s < n - 1; s++) {
        const [x, y] = [order[s], order[s + 1]];
        questions.push({ q: `Who sits immediately to the right of ${N[x]}?`, ans: y, fact: `imm:${x}:${y}`, exclude: x });
        questions.push({ q: `Who sits immediately to the left of ${N[y]}?`, ans: x, fact: `imm:${x}:${y}`, exclude: y });
      }
      const open = questions.filter((q) => !facts.has(q.fact));
      if (!open.length) continue;
      const question = r.pick(open);
      const answer = N[question.ans];
      return {
        stem: `Five friends, ${listText(r.shuffle(N))}, sit in a row, all facing north.\n${chosen.map((c) => c.text).join('\n')}\n\n${question.q}`,
        ...nameOptions(r, answer, N.filter((_, i) => i !== question.exclude)),
        explanation: `The only order (left to right) that satisfies every clue is: ${order.map((i) => N[i]).join(', ')}. Hence the answer is ${answer}.`,
      };
    }
    throw new Error('linear-seating: no puzzle found');
  }),

  b.dynamic('circular-seating', { difficulty: 3, tags: ['arrangements'] }, (r) => {
    const n = 6;
    // Person 0 is fixed at seat 0 (rotations are the same seating).
    const perms = permutations(n - 1).map((rest) => seatsOf([0, ...rest.map((v) => v + 1)]));
    const dist = (a: number, b2: number): number => {
      const d = Math.abs(a - b2) % n;
      return Math.min(d, n - d);
    };
    for (let attempt = 0; attempt < 200; attempt++) {
      const N = r.sample(NAMES, n);
      const order = [0, ...r.shuffle([1, 2, 3, 4, 5])];
      const pos = seatsOf(order);
      const clues: Clue[] = [];
      for (let x = 0; x < n; x++) {
        for (let y = x + 1; y < n; y++) {
          const d = dist(pos[x], pos[y]);
          if (d === 3) clues.push({ text: `${N[x]} sits directly opposite ${N[y]}.`, fact: `opp:${x}:${y}`, test: (p) => dist(p[x], p[y]) === 3 });
          if (d === 1) clues.push({ text: `${N[x]} sits next to ${N[y]}.`, fact: `adj:${x}:${y}`, test: (p) => dist(p[x], p[y]) === 1 });
          else clues.push({ text: `${N[x]} does not sit next to ${N[y]}.`, fact: `nadj:${x}:${y}`, test: (p) => dist(p[x], p[y]) !== 1 });
        }
        const [y, z] = r.shuffle([order[(pos[x] + 1) % n], order[(pos[x] + n - 1) % n]]);
        // "Immediately": around a table, anyone is "between" two others along the longer arc.
        clues.push({
          text: `${N[x]} sits immediately between ${N[y]} and ${N[z]}.`,
          fact: `between:${x}`,
          test: (p) => dist(p[x], p[y]) === 1 && dist(p[x], p[z]) === 1,
        });
      }
      // Mirror images always satisfy the same clues, so two seatings must remain.
      const chosen = chooseClues(r, clues, perms, 2);
      if (!chosen || chosen.length < 3 || chosen.length > 6) continue;
      const facts = new Set(chosen.map((c) => c.fact));
      // Is the (true) adjacency of a and c stated outright by some clue?
      const stated = (a: number, c: number): boolean =>
        facts.has(`adj:${Math.min(a, c)}:${Math.max(a, c)}`) || facts.has(`between:${a}`) || facts.has(`between:${c}`);
      const questions: Array<{ q: string; ans: number; fact: string; exclude: number[]; given?: boolean }> = [];
      for (let x = 0; x < n; x++) {
        const opp = order[(pos[x] + 3) % n];
        questions.push({ q: `Who sits directly opposite ${N[x]}?`, ans: opp, fact: `opp:${Math.min(x, opp)}:${Math.max(x, opp)}`, exclude: [x] });
        const left = order[(pos[x] + n - 1) % n];
        const right = order[(pos[x] + 1) % n];
        questions.push({
          q: `Who sits next to both ${N[left]} and ${N[right]}?`,
          ans: x,
          fact: `between:${x}`,
          exclude: [left, right],
          given: stated(x, left) && stated(x, right),
        });
      }
      const open = questions.filter((q) => !facts.has(q.fact) && !q.given);
      if (!open.length) continue;
      const question = r.pick(open);
      const answer = N[question.ans];
      const others = N.filter((_, i) => !question.exclude.includes(i));
      return {
        stem: `Six friends, ${listText(r.shuffle(N))}, sit around a circular table, facing the centre.\n${chosen.map((c) => c.text).join('\n')}\n\n${question.q}`,
        ...nameOptions(r, answer, others),
        explanation: `Going round the table, the only seating that fits every clue is ${order.map((i) => N[i]).join(', ')} (or the same order in the opposite direction, which gives the same answer). Hence the answer is ${answer}.`,
      };
    }
    throw new Error('circular-seating: no puzzle found');
  }),

  b.dynamic('comparison-ranking', { difficulty: 1, origin: 'past-paper', tags: ['arrangements'] }, (r) => {
    const scale = r.pick([
      { more: 'taller', less: 'shorter', most: 'tallest', least: 'shortest' },
      { more: 'heavier', less: 'lighter', most: 'heaviest', least: 'lightest' },
      { more: 'older', less: 'younger', most: 'oldest', least: 'youngest' },
    ]);
    const N = r.sample(NAMES, 5);
    // N[0] is the most, N[4] the least; build the four adjacent comparisons.
    const pair = (hi: number): string =>
      r.chance(0.5) ? `${N[hi]} is ${scale.more} than ${N[hi + 1]}` : `${N[hi + 1]} is ${scale.less} than ${N[hi]}`;
    const merge = r.int(0, 2); // merge comparisons merge and merge + 1 into one sentence
    const sentences: string[] = [];
    for (let i = 0; i < 4; i++) {
      if (i === merge) {
        sentences.push(`${N[i + 1]} is ${scale.less} than ${N[i]} but ${scale.more} than ${N[i + 2]}.`);
        i++;
      } else {
        sentences.push(`${pair(i)}.`);
      }
    }
    const question = r.pick([
      { q: `Who is the ${scale.most}?`, ans: 0 },
      { q: `Who is the ${scale.least}?`, ans: 4 },
      { q: `Who is the second ${scale.most}?`, ans: 1 },
      { q: `Who is the second ${scale.least}?`, ans: 3 },
      { q: `Who is in the middle (third from either end)?`, ans: 2 },
    ]);
    const answer = N[question.ans];
    return {
      stem: `Among five friends:\n${r.shuffle(sentences).join('\n')}\n\n${question.q}`,
      ...nameOptions(r, answer, N),
      explanation: `Joining the comparisons gives the order from ${scale.most} to ${scale.least}: ${N.join(' > ')}. Hence the answer is ${answer}.`,
    };
  }),

  b.dynamic('rank-from-both-ends', { difficulty: 1, origin: 'past-paper', tags: ['arrangements'] }, (r) => {
    const name = r.pick(NAMES);
    if (r.chance(0.5)) {
      const left = r.int(4, 25);
      const right = r.int(4, 25);
      const total = left + right - 1;
      return {
        stem: `In a row of students, ${name} is ${nth(left)} from the left end and ${nth(right)} from the right end. How many students are there in the row?`,
        ...numericOptions(r, { correct: total, wrong: [left + right, left + right - 2, left + right + 1], format: (x) => `${x}` }),
        explanation: `${name} is counted in both positions, so total $= ${left} + ${right} - 1 = ${total}$.`,
      };
    }
    const total = r.int(20, 60);
    const top = r.int(3, total - 3);
    const bottom = total - top + 1;
    return {
      stem: `In a class of ${total} students ranked by marks, ${name} is ${nth(top)} from the top. What is ${name}'s rank from the bottom?`,
      ...numericOptions(r, { correct: bottom, wrong: [total - top, total - top + 2, total - top - 1], format: (x) => nth(x) }),
      explanation: `Rank from bottom $= \\text{total} - \\text{rank from top} + 1 = ${total} - ${top} + 1 = ${bottom}$.`,
    };
  }),

  b.dynamic('persons-between-ranks', { difficulty: 2, tags: ['arrangements'] }, (r) => {
    const [A, B] = r.sample(NAMES, 2);
    for (let attempt = 0; attempt < 200; attempt++) {
      const total = r.int(20, 50);
      const p = r.int(3, total - 3); // A from the left
      const q = r.int(3, total - 3); // B from the right
      const bLeft = total - q + 1; // B from the left
      const crossed = bLeft < p;
      const between = crossed ? p - bLeft - 1 : bLeft - p - 1;
      if (between < 2) continue;
      const wrong = crossed ? [p + q - total, p + q - total - 1, between + 2, total - p - q] : [between + 1, between - 1, p + q, between + 2];
      return {
        stem: `In a row of ${total} children, ${A} is ${nth(p)} from the left end and ${B} is ${nth(q)} from the right end. How many children are there between ${A} and ${B}?`,
        ...numericOptions(r, { correct: between, wrong, format: (x) => `${x}` }),
        explanation: crossed
          ? `${B}'s position from the left $= ${total} - ${q} + 1 = ${bLeft}$, which is to the left of ${A} (position ${p}). Children between them $= ${p} - ${bLeft} - 1 = ${between}$.`
          : `${B}'s position from the left $= ${total} - ${q} + 1 = ${bLeft}$. Children between positions ${p} and ${bLeft} $= ${bLeft} - ${p} - 1 = ${between}$.`,
      };
    }
    throw new Error('persons-between-ranks: no values found');
  }),

  b.dynamic('dictionary-order', { difficulty: 1, tags: ['arrangements'] }, (r) => {
    const words = r.sample(r.pick(DICTIONARY_GROUPS), 5);
    const sorted = [...words].sort();
    const k = r.int(0, 4);
    const place = ['first', 'second', 'third', 'fourth', 'last'][k];
    const answer = cap(sorted[k]);
    return {
      stem: `If the following words are arranged in dictionary (alphabetical) order, which word comes ${place}?\n\n${words.map(cap).join(', ')}`,
      answer,
      distractors: pickDistractors(answer, r.shuffle(words.map(cap))),
      explanation: `Comparing letter by letter, the dictionary order is: ${sorted.map(cap).join(', ')}. The ${place} word is ${answer}.`,
    };
  }),

  // ---------------------------------------------------------------- statements and conclusions
  b.dynamic('conditional-statement', { difficulty: 2, tags: ['statements and conclusions'] }, (r) => {
    const s = r.pick(CONDITIONALS)(r.pick(NAMES));
    const unknownP = `It cannot be determined whether ${s.pClause}.`;
    const unknownQ = `It cannot be determined whether ${s.qClause}.`;
    const kind = r.pick(['mp', 'mt', 'ac', 'da'] as const);
    const cases = {
      mp: { fact: s.pYes, answer: s.qYes, wrong: [s.qNo, unknownQ, s.pNo], why: `The rule applies: the condition happened, so the result must follow.` },
      mt: { fact: s.qNo, answer: s.pNo, wrong: [s.pYes, unknownP, s.qYes], why: `Had the condition occurred, the result would have followed. The result did not follow, so the condition cannot have occurred.` },
      ac: { fact: s.qYes, answer: unknownP, wrong: [s.pYes, s.pNo, s.qNo], why: `The rule says what happens when the condition occurs; it does not say the result can happen only then. The result may have had another cause, so the condition is not known.` },
      da: { fact: s.pNo, answer: unknownQ, wrong: [s.qYes, s.qNo, s.pYes], why: `The rule says nothing about what happens when the condition does not occur, so the result is not known.` },
    }[kind];
    return {
      stem: `Statement: ${s.rule} ${cases.fact}\n\nBased only on the statement, which of the following is definitely correct?`,
      answer: cases.answer,
      distractors: cases.wrong,
      explanation: `${cases.why} Hence: ${cases.answer}`,
    };
  }),

  ...b.mcqs([
    {
      id: 'closed-shop-neither',
      d: 1,
      o: 'past-paper',
      t: ['statements and conclusions'],
      q: "Statement: All the shops in the main bazaar close on Sundays. Hamid's shop is closed today.\n\nConclusions:\nI. Today is Sunday.\nII. Hamid's shop is in the main bazaar.\n\nWhich of the following is correct?",
      a: 'Neither I nor II follows',
      x: ['Only conclusion I follows', 'Only conclusion II follows', 'Both I and II follow'],
      fixed: ['Only conclusion I follows', 'Only conclusion II follows', 'Both I and II follow', 'Neither I nor II follows'],
      e: "The statement does not say where Hamid's shop is, and a shop can be closed for many reasons, so neither the day nor the location can be concluded.",
    },
    {
      id: 'valid-ticket-only-i',
      d: 2,
      t: ['statements and conclusions'],
      q: 'Statement: Only people with a valid ticket are allowed into the stadium. Rehan is inside the stadium, having been allowed in.\n\nConclusions:\nI. Rehan has a valid ticket.\nII. Everyone with a valid ticket is inside the stadium.\n\nWhich of the following is correct?',
      a: 'Only conclusion I follows',
      x: ['Only conclusion II follows', 'Both I and II follow', 'Neither I nor II follows'],
      fixed: ['Only conclusion I follows', 'Only conclusion II follows', 'Both I and II follow', 'Neither I nor II follows'],
      e: '"Only ticket holders are allowed in" means anyone allowed in holds a ticket, so I follows. It does not say every ticket holder actually came, so II does not follow.',
    },
    {
      id: 'club-smokers-only-i',
      d: 3,
      t: ['statements and conclusions', 'syllogisms'],
      q: 'Statement: No member of the sports club smokes. Some smokers are athletes.\n\nConclusions:\nI. Some athletes are not members of the sports club.\nII. No athlete is a member of the sports club.\n\nWhich of the following is correct?',
      a: 'Only conclusion I follows',
      x: ['Only conclusion II follows', 'Both I and II follow', 'Neither I nor II follows'],
      fixed: ['Only conclusion I follows', 'Only conclusion II follows', 'Both I and II follow', 'Neither I nor II follows'],
      e: 'The athletes who smoke cannot be club members (no member smokes), so some athletes are not members: I follows. Non-smoking athletes may still be members, so II does not follow.',
    },
    {
      id: 'book-early-assumption',
      d: 1,
      t: ['statements and conclusions'],
      q: 'Statement: "Book your seats early to avoid disappointment," an airline advises its passengers.\n\nAssumptions:\nI. Many people may want to travel on the same flights.\nII. The airline has no seats left on its flights.\n\nWhich assumption is implicit in the statement?',
      a: 'Only assumption I is implicit',
      x: ['Only assumption II is implicit', 'Both I and II are implicit', 'Neither I nor II is implicit'],
      fixed: ['Only assumption I is implicit', 'Only assumption II is implicit', 'Both I and II are implicit', 'Neither I nor II is implicit'],
      e: 'The advice makes sense only if seats may run out because many people want them (I). Asking people to book means seats are still available, so II contradicts the statement.',
    },
    {
      id: 'tree-plantation-assumption',
      d: 2,
      t: ['statements and conclusions'],
      q: 'Statement: The city government has decided to plant one million trees to reduce air pollution in the city.\n\nAssumptions:\nI. Trees help to reduce air pollution.\nII. There is enough space in or around the city to plant the trees.\n\nWhich assumption is implicit in the statement?',
      a: 'Both I and II are implicit',
      x: ['Only assumption I is implicit', 'Only assumption II is implicit', 'Neither I nor II is implicit'],
      fixed: ['Only assumption I is implicit', 'Only assumption II is implicit', 'Both I and II are implicit', 'Neither I nor II is implicit'],
      e: 'The plan only makes sense if trees reduce pollution (I) and if the trees can actually be planted, i.e. space is available (II). Both are taken for granted.',
    },
  ]),

  // ---------------------------------------------------------------- odd one out
  b.dynamic('odd-number-out', { difficulty: 1, origin: 'past-paper', tags: ['odd one out'] }, (r) => {
    const family = r.weighted(['prime', 'square', 'cube', 'multiple'] as const, [3, 2, 2, 3]);
    for (let attempt = 0; attempt < 5000; attempt++) {
      let members: number[];
      let odd: number;
      let why: string;
      if (family === 'prime') {
        const three = r.chance(0.4);
        const primes = Array.from({ length: three ? 160 : 89 }, (_, i) => i + (three ? 101 : 11)).filter(isPrime);
        members = r.sample(primes, 3);
        odd = r.pick(three ? [111, 117, 119, 121, 133, 143, 161, 169, 187, 203, 209, 217, 221, 247, 253] : [49, 51, 57, 77, 87, 91]);
        const f = smallestFactor(odd);
        why = `${listText(members.map(String))} are prime numbers, but $${odd} = ${f} \\times ${odd / f}$ is not prime.`;
      } else if (family === 'square') {
        const roots = r.sample(Array.from({ length: 12 }, (_, i) => i + 4), 3);
        members = roots.map((k) => k * k);
        const base = r.int(4, 15);
        odd = base * base + r.pick([1, -1, 2, -2, 3]);
        why = `${listText(roots.map((k) => `$${k * k} = ${k}^2$`))} are perfect squares, but ${odd} is not.`;
      } else if (family === 'cube') {
        const roots = r.sample([2, 3, 4, 5, 6, 7, 8, 9], 3);
        members = roots.map((k) => k ** 3);
        const base = r.int(2, 9);
        odd = r.chance(0.5) ? base ** 3 + r.pick([1, -1, 2, -2, 3, 4]) : r.pick([36, 49, 81, 100, 144, 196]);
        why = `${listText(roots.map((k) => `$${k ** 3} = ${k}^3$`))} are perfect cubes, but ${odd} is not.`;
      } else {
        const k = r.pick([6, 7, 8, 9, 11, 12, 13]);
        const ms = r.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3);
        members = ms.map((m) => m * k);
        odd = r.int(2, 12) * k + r.int(1, k - 1);
        why = `${listText(members.map(String))} are all multiples of ${k}, but ${odd} is not ($${odd} = ${k} \\times ${Math.floor(odd / k)} + ${odd % k}$).`;
      }
      if (members.includes(odd)) continue;
      const items = [...members, odd];
      const divisor = members.reduce((g, m) => gcd2(g, m));
      const isMember = { prime: isPrime, square: isSquare, cube: isCube, multiple: (x: number) => x % divisor === 0 }[family];
      if (isMember(odd)) continue;
      if (!onlyAnswerStandsOut(items, 3, NUMBER_PROPERTIES)) continue;
      if (SHARED_NUMBER_PROPERTIES.some((prop) => items.filter(prop).length === 3 && prop(odd))) continue;
      return {
        stem: 'Find the odd one out:',
        answer: `${odd}`,
        distractors: members.map(String),
        explanation: why,
      };
    }
    throw new Error('odd-number-out: no set found');
  }),

  b.dynamic('odd-word-out', { difficulty: 1, tags: ['odd one out'] }, (r) => {
    // Spelling patterns a candidate might use instead (Moon, Mercury, Mars vs Venus).
    const surface: ReadonlyArray<(w: string) => string> = [(w) => w.charAt(0), (w) => w.slice(-2)];
    for (let attempt = 0; attempt < 200; attempt++) {
      const cat = r.pick(WORD_CATEGORIES);
      const members = r.sample(cat.members, 3);
      const [odd, what] = r.pick(cat.outsiders);
      const items = [...members, odd];
      const misleading = surface.some((f) => {
        const keys = items.map((w) => f(w).toLowerCase());
        return [0, 1, 2].some((i) => {
          const rest = keys.filter((_, j) => j !== i);
          return rest.every((k) => k === rest[0]) && keys[i] !== rest[0];
        });
      });
      if (misleading) continue;
      return {
        stem: 'Which word is the odd one out?',
        answer: odd,
        distractors: members,
        explanation: `${listText(members)} are all ${cat.label}; ${odd} is ${what}.`,
      };
    }
    throw new Error('odd-word-out: no set found');
  }),

  b.dynamic('odd-letter-group', { difficulty: 2, tags: ['odd one out'] }, (r) => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const variant = r.pick(['triple', 'pair-shift', 'opposite'] as const);
      let groups: number[][];
      let why: string;
      if (variant === 'opposite') {
        const firsts = r.sample(Array.from({ length: 12 }, (_, i) => i), 4);
        groups = firsts.map((i) => [i, 25 - i]);
        const off = r.pick([1, -1]);
        groups[3] = [firsts[3], 25 - firsts[3] + off];
        const [a, z] = groups[3];
        why = `In each of the others the two letters are opposite in the alphabet: their positions add up to 27 (e.g. ${letter(groups[0][0])} = ${groups[0][0] + 1}, ${letter(groups[0][1])} = ${groups[0][1] + 1}). In ${letter(a)}${letter(z)}, $${a + 1} + ${z + 1} = ${a + z + 2}$.`;
      } else if (variant === 'pair-shift') {
        const g = r.int(2, 5);
        const firsts = r.sample(Array.from({ length: 25 - g - 1 }, (_, i) => i), 4);
        const g2 = g + r.pick([1, -1]);
        groups = firsts.map((i, j) => [i, i + (j === 3 ? g2 : g)]);
        why = `In the other pairs the second letter is ${g} places after the first; in ${letter(groups[3][0])}${letter(groups[3][1])} it is ${g2} places after.`;
      } else {
        const g = r.int(2, 4);
        const firsts = r.sample(Array.from({ length: 25 - 2 * g - 1 }, (_, i) => i), 4);
        const second = r.chance(0.5);
        groups = firsts.map((i, j) => (j === 3 ? (second ? [i, i + g, i + 2 * g + 1] : [i, i + g + 1, i + 2 * g + 1]) : [i, i + g, i + 2 * g]));
        const og = groups[3];
        why = `In the other groups each letter is ${g} places after the previous one; in ${og.map(letter).join('')} the gaps are ${og[1] - og[0]} and ${og[2] - og[1]}.`;
      }
      if (groups.some((gp) => gp.some((x) => x < 0 || x > 25 || !Number.isInteger(x)))) continue;
      if (groups[3][groups[3].length - 1] === groups[3][0]) continue;
      const texts = groups.map((gp) => gp.map(letter).join(''));
      if (new Set(texts).size !== 4) continue;
      // No other group may stand out by containing (or lacking) a vowel or a repeated first letter.
      const vowelProps = [(gp: number[]) => gp.some((x) => VOWELS.has(x)), (gp: number[]) => gp[0] < 13];
      if (!onlyAnswerStandsOut(groups, 3, vowelProps)) continue;
      return {
        stem: 'Find the odd one out:',
        answer: texts[3],
        distractors: texts.slice(0, 3),
        explanation: why,
      };
    }
    throw new Error('odd-letter-group: no set found');
  }),

  b.dynamic('odd-number-pair', { difficulty: 2, tags: ['odd one out'] }, (r) => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const rule = r.pick(NUM_RULES);
      const ns = r.sample(Array.from({ length: rule.max - 1 }, (_, i) => i + 2), 4);
      const values = ns.map(rule.f);
      const delta = r.pick([1, -1, 2, -2, 10, -10]);
      values[3] += delta;
      if (values[3] <= 0) continue;
      const fits = (f: (n: number) => number): boolean[] => ns.map((n, i) => f(n) === values[i]);
      // No alternative rule may fit all four, or single out a different pair.
      let ok = true;
      for (const f of CHECK_RULES) {
        const fit = fits(f);
        const count = fit.filter(Boolean).length;
        if (count === 4 || (count === 3 && fit.indexOf(false) !== 3)) ok = false;
      }
      if (!ok) continue;
      const texts = ns.map((n, i) => `$${n} : ${values[i]}$`);
      return {
        stem: 'Find the odd pair out:',
        answer: texts[3],
        distractors: texts.slice(0, 3),
        explanation: `In each other pair the second number is ${rule.name}: ${ns
          .slice(0, 3)
          .map((n) => `$${rule.show(n)} = ${rule.f(n)}$`)
          .join(', ')}. But $${rule.show(ns[3])} = ${rule.f(ns[3])}$, not ${values[3]}.`,
      };
    }
    throw new Error('odd-number-pair: no set found');
  }),

  // ---------------------------------------------------------------- analogies
  b.dynamic('number-analogy', { difficulty: 2, origin: 'past-paper', tags: ['analogies'] }, (r) => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const rule = r.pick(NUM_RULES);
      const [a, c2, c] = r.sample(Array.from({ length: rule.max - 1 }, (_, i) => i + 2), 3);
      const ya = rule.f(a);
      const yb = rule.f(c2);
      const answer = rule.f(c);
      const fitting = CHECK_RULES.filter((f) => f(a) === ya && f(c2) === yb);
      if (fitting.some((f) => f(c) !== answer)) continue;
      // The straight-line extrapolation through the two examples is not offered as a distractor.
      const linear = ya + ((yb - ya) / (c2 - a)) * (c - a);
      const wrong = NUM_RULES.filter((x) => x !== rule)
        .map((x) => x.f(c))
        .filter((v) => v !== linear);
      const picked = [...r.shuffle(wrong).slice(0, 2), answer + r.pick([1, -1]), rule.f(c + 1), rule.f(c - 1)].filter((v) => v !== linear);
      return {
        stem: `Find the missing number: $${a} : ${ya} :: ${c2} : ${yb} :: ${c} : \\;?$`,
        ...numericOptions(r, { correct: answer, wrong: picked, format: (x) => `${x}` }),
        explanation: `In each pair the second number is ${rule.name}: $${rule.show(a)} = ${ya}$ and $${rule.show(c2)} = ${yb}$. So the missing number is $${rule.show(c)} = ${answer}$.`,
      };
    }
    throw new Error('number-analogy: no values found');
  }),

  b.dynamic('animal-analogy', { difficulty: 1, tags: ['analogies'] }, (r) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const rel = r.pick(['young', 'home', 'sound'] as const);
      const withRel = ANIMALS.filter((x) => x[rel]);
      const [ex, target] = r.sample(withRel, 2);
      const answer = target[rel] as string;
      if (answer === ex[rel]) continue;
      const otherRels = (['young', 'home', 'sound'] as const).filter((x) => x !== rel);
      const own = otherRels.map((x) => target[x]).filter((v): v is string => Boolean(v));
      const others = r.shuffle(ANIMALS.filter((x) => x !== target).flatMap((x) => otherRels.map((k) => x[k]).filter((v): v is string => Boolean(v))));
      return {
        stem: `Choose the word that completes the analogy:\n\n**${ex.name} : ${ex[rel]} :: ${target.name} : ?**`,
        answer,
        distractors: pickDistractors(answer, [...r.shuffle(own), ...others]),
        explanation: `${ex[rel]} is the ${ANIMAL_REL_TEXT[rel]} of ${aOrAn(ex.name.toLowerCase())}; likewise ${answer} is the ${ANIMAL_REL_TEXT[rel]} of ${aOrAn(target.name.toLowerCase())}.`,
      };
    }
    throw new Error('animal-analogy: no pair found');
  }),

  b.dynamic('worker-analogy', { difficulty: 1, tags: ['analogies'] }, (r) => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const rel = r.pick(['tool', 'place', 'product'] as const);
      const withRel = WORKERS.filter((x) => x[rel]);
      const [ex, target] = r.sample(withRel, 2);
      const answer = target[rel] as string;
      if (answer === ex[rel]) continue;
      const otherRels = (['tool', 'place', 'product'] as const).filter((x) => x !== rel);
      const own = otherRels.map((x) => target[x]).filter((v): v is string => Boolean(v));
      const others = r.shuffle(WORKERS.filter((x) => x !== target).flatMap((x) => otherRels.map((k) => x[k]).filter((v): v is string => Boolean(v))));
      return {
        stem: `Choose the word that completes the analogy:\n\n**${ex.name} : ${ex[rel]} :: ${target.name} : ?**`,
        answer,
        distractors: pickDistractors(answer, [...r.shuffle(own), ...others]),
        explanation: `The relation is ${WORKER_REL_TEXT[rel]}: ${aOrAn(ex.name.toLowerCase())} → ${String(ex[rel]).toLowerCase()}, so ${aOrAn(target.name.toLowerCase())} → ${answer.toLowerCase()}.`,
      };
    }
    throw new Error('worker-analogy: no pair found');
  }),

  b.dynamic('letter-analogy', { difficulty: 1, tags: ['analogies'] }, (r) => {
    const WORDS = ['CAT', 'DOG', 'PEN', 'SUN', 'MAP', 'BOX', 'CUP', 'HAT', 'KEY', 'LAMP', 'FISH', 'BIRD', 'MILK', 'GOLD', 'ROSE', 'TREE', 'BOOK', 'RAIN', 'STAR', 'DESK'];
    const code = (w: string, f: (i: number) => number): string =>
      [...w].map((ch) => letter(f(LETTERS.indexOf(ch)))).join('');
    for (let attempt = 0; attempt < 500; attempt++) {
      const [w1, w2] = r.sample(WORDS, 2);
      const mirror = r.chance(0.3);
      const k = r.pick([1, 2, 3, 4, -1, -2, -3]);
      const ok = (w: string, kk: number): boolean => [...w].every((ch) => LETTERS.indexOf(ch) + kk >= 0 && LETTERS.indexOf(ch) + kk <= 25);
      const shift = (w: string, kk: number): string => code(w, (i) => i + kk);
      const opp = (w: string): string => code(w, (i) => 25 - i);
      let e1: string;
      let answer: string;
      let wrong: string[];
      let why: string;
      if (mirror) {
        e1 = opp(w1);
        answer = opp(w2);
        const near = (kk: number): string => code(answer, (i) => Math.min(25, Math.max(0, i + kk)));
        wrong = [near(1), near(-1), ok(w2, 1) ? shift(w2, 1) : near(2), [...answer].reverse().join(''), near(2), near(-2), w2];
        why = `Each letter is replaced by its opposite letter in the alphabet (A ↔ Z, B ↔ Y, ..., positions adding to 27): ${w1} → ${e1}, so ${w2} → ${answer}.`;
      } else {
        if (!ok(w1, k) || !ok(w2, k) || !ok(w2, k + Math.sign(k)) || !ok(w2, -k)) continue;
        e1 = shift(w1, k);
        answer = shift(w2, k);
        wrong = [shift(w2, k + Math.sign(k)), shift(w2, -k), Math.abs(k) > 1 ? shift(w2, k - Math.sign(k)) : opp(w2), [...answer].reverse().join(''), opp(w2), w2];
        const dir = k > 0 ? 'forward' : 'back';
        why = `Each letter moves ${Math.abs(k)} place${Math.abs(k) > 1 ? 's' : ''} ${dir} in the alphabet: ${w1} → ${e1}, so ${w2} → ${answer}.`;
      }
      // The example must not also fit the other rule.
      if (opp(w1) === shift(w1, k)) continue;
      return {
        stem: `Choose the letters that complete the analogy:\n\n**${w1} : ${e1} :: ${w2} : ?**`,
        answer,
        distractors: pickDistractors(answer, wrong),
        explanation: why,
      };
    }
    throw new Error('letter-analogy: no pair found');
  }),
]);
