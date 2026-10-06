import { defineBank } from '@/engine/authoring';
import { numericOptions, pickDistractors } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Local helpers (letter arithmetic on A-Z, positions A = 1 ... Z = 26)
// ---------------------------------------------------------------------------

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Alphabet position of an uppercase letter (A = 1). */
const pos = (ch: string): number => ch.charCodeAt(0) - 64;

/** Letter at position n, wrapping cyclically (0 -> Z, 27 -> A). */
const letter = (n: number): string => ALPHA[(((n - 1) % 26) + 26) % 26] as string;

const chars = (w: string): string[] => [...w];
const rev = (w: string): string => chars(w).reverse().join('');

/** Shifts the i-th letter of `w` by `shift(i)` places (cyclic). */
const shiftBy = (w: string, shift: (i: number) => number): string =>
  chars(w)
    .map((c, i) => letter(pos(c) + shift(i)))
    .join('');

/** True when shifting would run past A or Z (the correct code never needs wrap-around). */
const wraps = (w: string, shift: (i: number) => number): boolean =>
  chars(w).some((c, i) => {
    const p = pos(c) + shift(i);
    return p < 1 || p > 26;
  });

/** "W→X, O→P, ..." letter-by-letter mapping. */
const arrows = (from: string, to: string): string =>
  chars(from)
    .map((c, i) => `${c}→${to[i] ?? ''}`)
    .join(', ');

const places = (k: number): string =>
  `${Math.abs(k)} place${Math.abs(k) === 1 ? '' : 's'} ${k > 0 ? 'forward' : 'backward'}`;

const signedK = (k: number): string => (k > 0 ? `+${k}` : `${k}`);

/** Picks uniformly from the items satisfying `ok` (throws if none: a template bug). */
function choose<T>(r: Rng, pool: readonly T[], ok: (x: T) => boolean): T {
  const filtered = pool.filter(ok);
  if (filtered.length === 0) throw new Error('coding-decoding: no candidate satisfies the constraint');
  return r.pick(filtered);
}

const sumPos = (w: string): number => chars(w).reduce((s, c) => s + pos(c), 0);
const posList = (w: string): string =>
  chars(w)
    .map((c) => `${c}(${pos(c)})`)
    .join(' + ');

// ---------------------------------------------------------------------------
// Word pools
// ---------------------------------------------------------------------------

const WORDS = [
  'WORD', 'LAMP', 'ROAD', 'SALT', 'MILK', 'DESK', 'KING', 'BIRD', 'FISH', 'GOLD',
  'SHIP', 'COAT', 'FARM', 'HAND', 'NOSE', 'RAIN', 'SNOW', 'WIND', 'BOAT', 'CAKE',
  'DOOR', 'BOOK', 'POND', 'JUMP', 'CHAIR', 'TABLE', 'HOUSE', 'RIVER', 'PLANT', 'MOUSE',
  'STONE', 'CLOUD', 'FRUIT', 'GLASS', 'PAPER', 'MONEY', 'TRAIN', 'NIGHT', 'LIGHT', 'SMILE',
  'WATER', 'BREAD', 'SUGAR', 'BRICK', 'FLAME', 'DREAM', 'STORM', 'CROWN', 'GRAPE', 'LEMON',
  'HORSE', 'TIGER', 'EAGLE', 'PILOT', 'SHIRT', 'CAMEL', 'NURSE', 'MANGO', 'CLOCK', 'PRINT',
  'CANDLE', 'GARDEN', 'PENCIL', 'WINDOW', 'MARKET', 'FLOWER', 'BRIDGE', 'SILVER', 'DOCTOR', 'PLANET',
  'STREAM', 'ORANGE', 'BOTTLE', 'MIRROR', 'POCKET', 'FOREST', 'ISLAND', 'JACKET',
] as const;

const SIX = WORDS.filter((w) => w.length === 6);
const EIGHT = [
  'HOSPITAL', 'MOUNTAIN', 'ELEPHANT', 'TRIANGLE', 'NOTEBOOK', 'SANDWICH',
  'CHAMPION', 'BIRTHDAY', 'COMPUTER', 'DAUGHTER', 'UMBRELLA', 'PAINTING',
] as const;

const SHORT = [
  'CAT', 'DOG', 'SUN', 'PEN', 'CUP', 'BOX', 'HAT', 'MAP', 'BAT', 'BUS', 'KEY', 'RED',
  'TEN', 'ICE', 'JAM', 'OWL', 'FOX', 'BED', 'EGG', 'INK', 'NET', 'COW', 'BOOK', 'FISH',
  'GOLD', 'SHIP', 'MILK', 'ROAD', 'KING', 'TREE', 'DESK', 'LAMP', 'RAIN', 'WIND', 'SALT',
  'FARM', 'NOSE', 'DUCK', 'HILL', 'STAR',
] as const;

/** Source words with targets spelt only from the source's letters. */
const SUBSTITUTION: ReadonlyArray<{ src: string; targets: readonly string[] }> = [
  { src: 'PLANET', targets: ['PLANT', 'PANEL', 'LATE'] },
  { src: 'MASTER', targets: ['STEAM', 'TEAMS', 'SMART', 'TREAT'] },
  { src: 'GARDEN', targets: ['DANGER', 'RANGE', 'GRADE'] },
  { src: 'PLEASE', targets: ['SLEEP', 'LEAPS', 'LEASE'] },
  { src: 'MOTHER', targets: ['OTHER', 'METRO', 'THEME'] },
  { src: 'STABLE', targets: ['TABLE', 'BLEAT', 'BEAST'] },
  { src: 'FRIEND', targets: ['FINDER', 'FRIED', 'DINER'] },
  { src: 'SILVER', targets: ['LIVER', 'LIVES', 'EVILS'] },
  { src: 'BRANCH', targets: ['RANCH', 'CRAB', 'BARN'] },
  { src: 'KINGDOM', targets: ['DOING', 'GOING', 'MONK'] },
  { src: 'CAPTION', targets: ['OPTIC', 'PATIO', 'POINT'] },
];

/** Two clue words and a target spelt from their combined letters (at most 9 distinct letters). */
const DIGIT_TRIPLES: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ['PALE', 'EARTH', ['PEARL', 'HEAP', 'PLATE']],
  ['MILK', 'SOAP', ['POLKA', 'SLIM', 'LAMPS']],
  ['GOLD', 'RING', ['GRIND', 'DOING', 'LONG']],
  ['FISH', 'BOAT', ['FAITH', 'BATH', 'SOFT']],
  ['CAKE', 'MILD', ['CAMEL', 'MEDAL', 'CLAIM']],
  ['TREND', 'SHOP', ['SPORT', 'SHORT', 'HORSE']],
  ['CHAIR', 'MOST', ['MARCH', 'COAST', 'STORM']],
];

/** Three phrases; each pair shares exactly one word and no word is in all three. */
const SENTENCES: ReadonlyArray<readonly [string, string, string]> = [
  ['cold winter night', 'long winter days', 'long dark night'],
  ['buy fresh mangoes', 'fresh green apples', 'eat green mangoes'],
  ['sky is blue', 'sea is deep', 'deep blue water'],
  ['read good books', 'good boys play', 'play with books'],
  ['bright red rose', 'red and white', 'white rose garden'],
  ['he plays cricket', 'she plays tennis', 'she likes cricket'],
  ['hot sweet tea', 'sweet cold drink', 'cold tea please'],
];

const SYLLABLES = ['ka', 'lo', 'mi', 'tu', 'pe', 'ri', 'sa', 'no', 'zi', 'bu', 'fe', 'go', 'ja', 'vo', 'xe', 'du', 'ho', 'ne'];

/** Things with a single obvious use / colour, for "X is called Y" chains. */
const CHAIN_THEMES: ReadonlyArray<ReadonlyArray<readonly [string, string]>> = [
  [
    ['chair', 'what do we sit on?'],
    ['bed', 'what do we sleep on?'],
    ['pen', 'what do we write with?'],
    ['cup', 'what do we drink tea from?'],
    ['knife', 'what do we cut vegetables with?'],
    ['umbrella', 'what do we hold over our heads in the rain?'],
    ['comb', 'what do we use to tidy our hair?'],
  ],
  [
    ['green', 'what is the colour of fresh grass?'],
    ['red', 'what is the colour of human blood?'],
    ['white', 'what is the colour of milk?'],
    ['black', 'what is the colour of coal?'],
    ['blue', 'what is the colour of a clear daytime sky?'],
    ['yellow', 'what is the colour of a ripe banana?'],
  ],
];

// ---------------------------------------------------------------------------
// Block-rearrangement rules (whole-word letter shuffles)
// ---------------------------------------------------------------------------

interface BlockRule {
  name: string;
  apply: (w: string) => string;
  describe: (w: string) => string;
}

const half = (w: string): [string, string] => [w.slice(0, w.length / 2), w.slice(w.length / 2)];

const BLOCK_RULES: readonly BlockRule[] = [
  {
    name: 'reverse-halves',
    apply: (w) => half(w).map(rev).join(''),
    describe: (w) => {
      const [a, b] = half(w);
      return `The word is split into two equal halves and each half is written backwards: ${a}|${b} → ${rev(a)}|${rev(b)}.`;
    },
  },
  {
    name: 'swap-pairs',
    apply: (w) => (w.match(/../g) ?? []).map(rev).join(''),
    describe: (w) => {
      const pairs = w.match(/../g) ?? [];
      return `Each pair of neighbouring letters is swapped: ${pairs.join('|')} → ${pairs.map(rev).join('|')}.`;
    },
  },
  {
    name: 'swap-halves',
    apply: (w) => {
      const [a, b] = half(w);
      return b + a;
    },
    describe: (w) => {
      const [a, b] = half(w);
      return `The two halves of the word change places: ${a}|${b} → ${b}|${a}.`;
    },
  },
  {
    name: 'reverse-whole',
    apply: rev,
    describe: (w) => `The whole word is written backwards: ${w} → ${rev(w)}.`,
  },
];

/** Simple letter rearrangements (null when not defined for that length). */
const REARRANGEMENTS: ReadonlyArray<(w: string) => string | null> = [
  rev,
  (w) => (w.match(/..?/g) ?? []).map(rev).join(''), // swap neighbours
  (w) => (w.length % 2 ? null : half(w).map(rev).join('')),
  (w) => (w.length % 2 ? null : half(w)[1] + half(w)[0]),
  (w) => w.slice(1) + w.slice(0, 1),
  (w) => w.slice(-1) + w.slice(0, -1),
];

/** True when `code` is also some rearrangement of `w` followed by one constant (cyclic) shift. */
const rearrangedShift = (w: string, code: string): boolean =>
  REARRANGEMENTS.some((f) => {
    const fw = f(w);
    if (!fw || fw === w) return false;
    const k = pos(code[0] as string) - pos(fw[0] as string);
    return shiftBy(fw, () => k) === code;
  });

/**
 * True when the example pair `w → code` admits two simple readings that encode some word of the
 * pool differently. A reading is: keep the word or apply a simple rearrangement, then either shift
 * the letters (one constant shift, shifts in a ±1..±4 progression, or two alternating shifts; at
 * most 6 places each) or take opposite letters with a constant shift of at most 3 places.
 * (E.g. HAND → SZMW is "opposite letters" but also "swap the halves, then +5, −4 alternately".)
 */
const ambiguousExample = (w: string, code: string): boolean => {
  const readings: Array<(x: string) => string | null> = [];
  for (const f of [(x: string): string | null => x, ...REARRANGEMENTS]) {
    const fw = f(w);
    if (!fw || fw.length !== code.length) continue;
    for (const opp of [false, true]) {
      const val = (c: string): number => (opp ? 27 - pos(c) : pos(c));
      const sh = chars(fw).map((c, i) => {
        const d = (((pos(code[i] as string) - val(c)) % 26) + 26) % 26;
        return d > 13 ? d - 26 : d;
      });
      const s0 = sh[0] as number;
      const s1 = sh[1] as number;
      const lim = opp ? 3 : 6;
      if (sh.some((s) => Math.abs(s) > lim)) continue;
      let at: ((i: number) => number) | null = null;
      if (sh.every((s) => s === s0)) at = () => s0;
      else if (!opp && Math.abs(s1 - s0) <= 4 && sh.every((s, i) => s === s0 + i * (s1 - s0)))
        at = (i) => s0 + i * (s1 - s0);
      else if (!opp && sh.every((s, i) => s === (i % 2 ? s1 : s0))) at = (i) => (i % 2 ? s1 : s0);
      if (!at) continue;
      const shiftAt = at;
      readings.push((x) => {
        const fx = f(x);
        return fx ? chars(fx).map((c, i) => letter(val(c) + shiftAt(i))).join('') : null;
      });
    }
  }
  return WORDS.some((x) => new Set(readings.map((g) => g(x)).filter((y) => y !== null)).size > 1);
};

// ---------------------------------------------------------------------------
// Number-coding rules for "word value" questions
// ---------------------------------------------------------------------------

interface ValueRule {
  id: string;
  value: (w: string) => number;
  /** Shows how `w` gets its value under this rule. */
  show: (w: string) => string;
  rule: string;
}

const revPos = (w: string): number => chars(w).reduce((s, c) => s + 27 - pos(c), 0);

const VALUE_RULES: readonly ValueRule[] = [
  {
    id: 'sum',
    value: sumPos,
    show: (w) => `${posList(w)} = ${sumPos(w)}`,
    rule: 'the sum of the alphabet positions of the letters',
  },
  {
    id: 'double',
    value: (w) => 2 * sumPos(w),
    show: (w) => `2 × (${posList(w)}) = 2 × ${sumPos(w)} = ${2 * sumPos(w)}`,
    rule: 'twice the sum of the alphabet positions',
  },
  {
    id: 'triple',
    value: (w) => 3 * sumPos(w),
    show: (w) => `3 × (${posList(w)}) = 3 × ${sumPos(w)} = ${3 * sumPos(w)}`,
    rule: 'three times the sum of the alphabet positions',
  },
  {
    id: 'reverse',
    value: revPos,
    show: (w) =>
      `${chars(w)
        .map((c) => `${c}(${27 - pos(c)})`)
        .join(' + ')} = ${revPos(w)}`,
    rule: 'the sum of the positions counted from Z (Z = 1, Y = 2, ..., A = 26)',
  },
  {
    id: 'times-length',
    value: (w) => w.length * sumPos(w),
    show: (w) => `${w.length} letters × (${posList(w)}) = ${w.length} × ${sumPos(w)} = ${w.length * sumPos(w)}`,
    rule: 'the number of letters multiplied by the sum of the alphabet positions',
  },
  {
    id: 'plus-length',
    value: (w) => sumPos(w) + w.length,
    show: (w) =>
      `${chars(w)
        .map((c) => `${c}(${pos(c) + 1})`)
        .join(' + ')} = ${sumPos(w) + w.length}`,
    rule: 'the sum of letter values when A = 2, B = 3, ..., Z = 27 (each position plus one)',
  },
];

const ruleById = (id: string): ValueRule => VALUE_RULES.find((x) => x.id === id) as ValueRule;

/**
 * Other simple rules a solver might try: a × sum + b × letters + c, the same with positions
 * counted from Z, and (letters + d) × sum + c.
 */
const SIMPLE_RULES: ReadonlyArray<(w: string) => number> = (() => {
  const out: Array<(w: string) => number> = [];
  for (const a of [1, 2, 3, 4, 5]) {
    for (let b = -5; b <= 5; b++) {
      for (let c = -6; c <= 6; c++) {
        out.push((w) => a * sumPos(w) + b * w.length + c);
        out.push((w) => a * revPos(w) + b * w.length + c);
      }
    }
  }
  for (let d = -2; d <= 2; d++) {
    for (let c = -6; c <= 6; c++) {
      out.push((w) => (w.length + d) * sumPos(w) + c);
      out.push((w) => (w.length + d) * revPos(w) + c);
    }
  }
  return out;
})();

// ---------------------------------------------------------------------------

export default defineBank('intelligence', 'coding-decoding', (b) => [
  // ---------------------------------------------------------------- letter coding
  b.dynamic('constant-shift', { difficulty: 1, origin: 'past-paper', tags: ['letter coding'] }, (r) => {
    const k = r.pick([-3, -2, -1, 1, 2, 3, 4]);
    const sh = (): number => k;
    const ex = choose(r, WORDS, (w) => w.length <= 5 && !wraps(w, sh) && !ambiguousExample(w, shiftBy(w, sh)));
    const tg = choose(r, WORDS, (w) => w !== ex && !wraps(w, sh));
    const exCode = shiftBy(ex, sh);
    const answer = shiftBy(tg, sh);
    const s = Math.sign(k);
    const distractors = pickDistractors(answer, [
      shiftBy(tg, () => k + s), // one place too far
      shiftBy(tg, () => -k), // shifted the wrong way
      rev(answer), // also reversed the order
      shiftBy(tg, () => k - s || 2 * k),
      shiftBy(tg, () => 2 * k),
    ]);
    return {
      stem: `In a certain code, ${ex} is written as ${exCode}. How is ${tg} written in that code?`,
      answer,
      distractors,
      explanation: `Each letter moves ${places(k)}: ${arrows(ex, exCode)}. Applying the same shift: ${arrows(tg, answer)}, so ${tg} is written as ${answer}.`,
    };
  }),

  b.dynamic('shift-then-reverse', { difficulty: 2, origin: 'past-paper', tags: ['letter coding'] }, (r) => {
    const k = r.pick([-2, -1, 1, 2]);
    const sh = (): number => k;
    // Skip examples like PLANT → VPCNR, whose letter-by-letter shifts (+6, +4, +2, 0, -2) also form a
    // simple progression, so the code could be read without any reversal.
    const progression = (w: string): boolean => {
      const code = rev(shiftBy(w, sh));
      const d = chars(w).map((c, i) => pos(code[i] as string) - pos(c));
      return d.every((x, i) => i < 2 || x - (d[i - 1] as number) === (d[1] as number) - (d[0] as number));
    };
    const ex = choose(
      r,
      WORDS,
      (w) => w.length >= 4 && w.length <= 5 && w !== rev(w) &&
        !wraps(w, sh) &&
        !progression(w) &&
        !ambiguousExample(w, rev(shiftBy(w, sh))),
    );
    const tg = choose(r, WORDS, (w) => w !== ex && w.length <= 6 && !wraps(w, sh));
    const exCode = rev(shiftBy(ex, sh));
    const shifted = shiftBy(tg, sh);
    const answer = rev(shifted);
    const distractors = pickDistractors(answer, [
      shifted, // forgot to reverse
      rev(shiftBy(tg, () => -k)), // shifted the wrong way
      rev(shiftBy(tg, () => k + Math.sign(k))), // wrong size of shift
      rev(tg), // reversed only
    ]);
    return {
      stem: `In a certain code, ${ex} is written as ${exCode}. Using the same code, ${tg} is written as:`,
      answer,
      distractors,
      explanation: `Each letter of ${ex} is moved ${places(k)} (${arrows(ex, shiftBy(ex, sh))}) and the result is written in reverse order: ${exCode}. For ${tg}: ${arrows(tg, shifted)} gives ${shifted}; reversing it gives ${answer}.`,
    };
  }),

  b.dynamic('increasing-shift', { difficulty: 3, tags: ['letter coding'] }, (r) => {
    const d = r.sign();
    const s = r.pick([1, 2]);
    const sh = (i: number): number => d * (s + i);
    const ex = choose(
      r,
      WORDS,
      (w) => w.length >= 4 && w.length <= 5 && !wraps(w, sh) && !ambiguousExample(w, shiftBy(w, sh)),
    );
    const tg = choose(r, WORDS, (w) => w !== ex && w.length <= 5 && !wraps(w, sh));
    const exCode = shiftBy(ex, sh);
    const answer = shiftBy(tg, sh);
    const L = tg.length;
    const distractors = pickDistractors(answer, [
      shiftBy(tg, () => d * s), // same shift for every letter
      shiftBy(tg, (i) => -sh(i)), // wrong direction
      shiftBy(tg, (i) => d * (s + L - 1 - i)), // counted the positions from the right
      shiftBy(tg, (i) => d * (s + 1 + i)), // started one step too far
    ]);
    const steps = chars(tg)
      .map((_, i) => signedK(sh(i)))
      .join(', ');
    return {
      stem: `In a certain code, ${ex} is written as ${exCode}. How will ${tg} be written in the same code?`,
      answer,
      distractors,
      explanation: `The shifts in ${ex} → ${exCode} are ${chars(ex)
        .map((_, i) => signedK(sh(i)))
        .join(', ')}: the 1st letter moves ${places(d * s)} and each next letter moves one place more. For ${tg} the shifts are ${steps}: ${arrows(tg, answer)}, giving ${answer}.`,
    };
  }),

  b.dynamic('alternating-shift', { difficulty: 2, tags: ['letter coding'] }, (r) => {
    const a = r.pick([1, 2, 3]);
    const sg = r.sign();
    const sh = (i: number): number => (i % 2 === 0 ? sg * a : -sg * a);
    // Skip examples like FARM (F - A = R - M), whose code also reads as "swap neighbours, then shift".
    const samePairGap = (w: string): boolean =>
      w.length % 2 === 0 &&
      (w.match(/../g) ?? []).every((p) => pos(p[0] as string) - pos(p[1] as string) === pos(w[0] as string) - pos(w[1] as string));
    const ex = choose(r, WORDS, (w) => w.length >= 4 && w.length <= 6 && !wraps(w, sh) && !samePairGap(w) && !ambiguousExample(w, shiftBy(w, sh)),
    );
    const tg = choose(r, WORDS, (w) => w !== ex && !wraps(w, sh));
    const exCode = shiftBy(ex, sh);
    const answer = shiftBy(tg, sh);
    const distractors = pickDistractors(answer, [
      shiftBy(tg, () => sg * a), // every letter shifted the same way
      shiftBy(tg, (i) => -sh(i)), // directions swapped
      shiftBy(tg, (i) => (i % 2 === 0 ? sg * a : 0)), // left the even letters unchanged
      shiftBy(tg, (i) => (i % 2 === 0 ? sg * (a + 1) : -sg * (a + 1))),
    ]);
    const odd = places(sg * a);
    const even = places(-sg * a);
    return {
      stem: `If ${ex} is coded as ${exCode}, then ${tg} will be coded as:`,
      answer,
      distractors,
      explanation: `Letters in the 1st, 3rd, 5th, ... positions move ${odd}, and letters in the 2nd, 4th, ... positions move ${even}: ${arrows(ex, exCode)}. For ${tg}: ${arrows(tg, answer)}, giving ${answer}.`,
    };
  }),

  b.dynamic('opposite-letters', { difficulty: 2, tags: ['letter coding'] }, (r) => {
    const opp = (w: string): string => shiftBy(w, (i) => 27 - 2 * pos(w[i] as string));
    // Skip examples like FARM → UZIN, which is also "write FARM backwards, then move each letter 8 places forward".
    const ex = choose(r, WORDS, (w) => w.length >= 4 && w.length <= 5 && !rearrangedShift(w, opp(w)) && !ambiguousExample(w, opp(w)),
    );
    const tg = choose(r, WORDS, (w) => w !== ex);
    const exCode = opp(ex);
    const answer = opp(tg);
    const distractors = pickDistractors(answer, [
      shiftBy(tg, (i) => 26 - 2 * pos(tg[i] as string)), // used 26 - position
      rev(answer), // also reversed the order
      shiftBy(tg, (i) => 28 - 2 * pos(tg[i] as string)), // used 28 - position
      rev(tg),
    ]);
    return {
      stem: `In a certain code, ${ex} is written as ${exCode}. How is ${tg} written in that code?`,
      answer,
      distractors,
      explanation: `Each letter is replaced by its opposite letter in the alphabet (A↔Z, B↔Y, C↔X, ...; the two positions add up to 27): ${arrows(ex, exCode)}. So ${arrows(tg, answer)}, giving ${answer}.`,
    };
  }),

  b.dynamic('block-rearrangement', { difficulty: 2, tags: ['letter coding'] }, (r) => {
    const distinctUnder = (w: string): boolean =>
      new Set(BLOCK_RULES.map((rule) => rule.apply(w))).size === BLOCK_RULES.length;
    const rule = r.pick(BLOCK_RULES);
    // Example and target have the same length, so "halves" and "pairs" mean the same blocks.
    const pool: readonly string[] = r.chance(0.6) ? SIX : EIGHT;
    // A palindromic half (MIR|ROR) would make "reverse each half" look like "reverse the first half only".
    const ex = choose(r, pool, (w) => distinctUnder(w) && half(w).every((h) => h !== rev(h)));
    const tg = choose(r, pool, (w) => w !== ex && distinctUnder(w));
    const answer = rule.apply(tg);
    const distractors = BLOCK_RULES.filter((x) => x !== rule).map((x) => x.apply(tg));
    return {
      stem: `In a certain code, ${ex} is written as ${rule.apply(ex)}. Following the same pattern, how is ${tg} written?`,
      answer,
      distractors,
      explanation: `${rule.describe(ex)} Applying the same rule to ${tg}: ${rule.describe(tg).replace(/^.*?: /, '')}`,
    };
  }),

  b.dynamic('substitution-cipher', { difficulty: 2, origin: 'past-paper', tags: ['letter coding'] }, (r) => {
    const entry = r.pick(SUBSTITUTION);
    const tg = r.pick(entry.targets);
    const letters = [...new Set(chars(entry.src))];
    const pool = r.shuffle(chars(ALPHA));
    const map = new Map<string, string>();
    for (const c of letters) {
      const img = pool.find((p) => p !== c && ![...map.values()].includes(p)) as string;
      map.set(c, img);
    }
    const enc = (w: string): string =>
      chars(w)
        .map((c) => map.get(c) ?? c)
        .join('');
    const srcCode = enc(entry.src);
    const answer = enc(tg);
    const swapAt = (w: string, i: number): string =>
      w.slice(0, i) + (w[i + 1] ?? '') + (w[i] ?? '') + w.slice(i + 2);
    const i1 = r.int(0, answer.length - 2);
    const i2 = (i1 + 2) % (answer.length - 1);
    // Replace one letter of the answer with the code of a different source letter.
    const j = r.int(0, tg.length - 1);
    const wrongImg = enc(r.pick(letters.filter((c) => c !== tg[j])));
    const oneWrong = answer.slice(0, j) + wrongImg + answer.slice(j + 1);
    const distractors = pickDistractors(answer, [
      oneWrong,
      swapAt(answer, i1),
      rev(answer),
      swapAt(answer, i2),
      swapAt(oneWrong, i1),
    ]);
    return {
      stem: `If ${srcCode} is the code for ${entry.src}, what is the code for ${tg}?`,
      answer,
      distractors,
      explanation: `Match the letters one by one: ${letters.map((c) => `${c}→${map.get(c) ?? ''}`).join(', ')}. Then ${tg} → ${arrows(tg, answer)}, i.e. ${answer}.`,
    };
  }),

  b.dynamic('coded-sentences', { difficulty: 2, origin: 'past-paper', tags: ['letter coding'] }, (r) => {
    const sentences = r.pick(SENTENCES).map((s) => s.split(' '));
    const words = [...new Set(sentences.flat())];
    const codeList = r.sample(SYLLABLES, words.length);
    const code = new Map(words.map((w, i) => [w, codeList[i] as string]));
    const c = (w: string): string => code.get(w) ?? '';
    const asked = r.pick(words);
    const inS = [0, 1, 2].filter((i) => (sentences[i] as string[]).includes(asked));
    const ord = ['first', 'second', 'third'];
    const coded = sentences.map((s) => r.shuffle(s.map(c)).join(' '));
    const lines = sentences.map((s, i) => `'${coded[i] ?? ''}' means '${s.join(' ')}'`);
    const answer = c(asked);
    let reason: string;
    if (inS.length === 2) {
      const [p, q] = inS as [number, number];
      reason = `'${asked}' is the only word common to the ${ord[p]} and ${ord[q]} phrases, and '${answer}' is the only code common to them, so '${asked}' = '${answer}'.`;
    } else {
      const k = inS[0] as number;
      const others = (sentences[k] as string[]).filter((w) => w !== asked);
      const shared = others.map((w) => {
        const j = [0, 1, 2].find((i) => i !== k && (sentences[i] as string[]).includes(w)) as number;
        return `'${w}' (also in the ${ord[j]} phrase) = '${c(w)}'`;
      });
      reason = `In the ${ord[k]} phrase, ${shared.join(' and ')}. The remaining code of that phrase, '${answer}', must stand for '${asked}'.`;
    }
    const sameSentence = sentences
      .filter((s) => s.includes(asked))
      .flat()
      .filter((w) => w !== asked)
      .map(c);
    const distractors = pickDistractors(answer, [...r.shuffle(sameSentence), ...r.shuffle(words.map(c))]);
    return {
      stem: `In a certain code language, ${lines[0] ?? ''}, ${lines[1] ?? ''} and ${lines[2] ?? ''}. (The code words are not necessarily in the same order as the words.) Which code stands for '${asked}'?`,
      answer,
      distractors,
      explanation: reason,
    };
  }),

  b.dynamic('naming-chain', { difficulty: 1, origin: 'past-paper', tags: ['letter coding'] }, (r) => {
    const theme = r.pick(CHAIN_THEMES);
    const chain = r.sample(theme, 5);
    const j = r.int(0, 3);
    const item = chain[j] as readonly [string, string];
    const name = (i: number): string => (chain[i] as readonly [string, string])[0];
    const answer = name(j + 1);
    const links = [0, 1, 2, 3].map((i) => `'${name(i)}' is called '${name(i + 1)}'`);
    const candidates = [name(j), j > 0 ? name(j - 1) : name(j + 2), ...r.shuffle([0, 1, 2, 3, 4].map(name))];
    return {
      stem: `In a certain code language, ${links.slice(0, 3).join(', ')} and ${links[3] ?? ''}. In this language, ${item[1]}`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: `The real answer is '${item[0]}', but in this language '${item[0]}' is called '${answer}'. So the answer is '${answer}'.`,
    };
  }),

  // ---------------------------------------------------------------- number coding
  b.dynamic('letter-position-sum', { difficulty: 1, tags: ['number coding'] }, (r) => {
    // Skip examples like SALT = 52 (average position 13) or SUN = 54, whose value also fits a rule
    // with positions counted from Z (SALT: Z = 0, Y = 1, ..., A = 25; SUN: twice the Z = 1 positions).
    const fromZFits = (w: string): boolean =>
      [1, 2, 3].some((a) => [-2, -1, 0, 1, 2].some((b) => a * revPos(w) + b * w.length === sumPos(w)));
    const ex = choose(r, SHORT, (w) => w.length <= 4 && !fromZFits(w));
    const tg = choose(r, SHORT, (w) => w !== ex && sumPos(w) !== sumPos(ex));
    const v = sumPos(tg);
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      wrong: [
        revPos(tg), // counted from Z
        v + tg.length, // took A = 2
        v - tg.length, // took A = 0
        v + 1,
      ],
      format: (x) => String(x),
    });
    return {
      stem: `In a certain code, ${ex} is written as ${sumPos(ex)}. In the same code, ${tg} is written as:`,
      answer,
      distractors,
      explanation: `The code is the sum of the alphabet positions of the letters: ${posList(ex)} = ${sumPos(ex)}. So ${tg} = ${posList(tg)} = ${v}.`,
    };
  }),

  b.dynamic('position-number-code', { difficulty: 1, origin: 'past-paper', tags: ['number coding'] }, (r) => {
    const kind = r.weighted(['shift', 'reverse'] as const, [3, 1]);
    const k = kind === 'shift' ? r.pick([-1, 1, 2, 3]) : 0;
    const val = (c: string): number => (kind === 'shift' ? pos(c) + k : 27 - pos(c));
    // Keep every code number in 1..26, so "position + k" cannot be read as a cyclic letter shift.
    const ok = (w: string): boolean => chars(w).every((c) => val(c) >= 1 && val(c) <= 26);
    const code = (w: string, f: (c: string) => number = val): string => chars(w).map(f).join('-');
    // The example must not also fit "write the word backwards, then (27 -) position + constant"
    // (e.g. FOX = 21-12-3 is both 27 - position and XOF with each position minus 3;
    // FOX = 8-17-26 is both position + 2 and XOF with each letter's 27 - position, plus 5).
    const reversedFits = (w: string): boolean => {
      const rw = rev(w);
      return [pos, (c: string): number => 27 - pos(c)].some((f) => {
        const off = val(w[0] as string) - f(rw[0] as string);
        return chars(rw).every((c, j) => val(w[j] as string) - f(c) === off);
      });
    };
    const ex = choose(r, SHORT, (w) => w.length === 3 && ok(w) && !reversedFits(w));
    const tg = choose(r, SHORT, (w) => w !== ex && ok(w));
    const answer = code(tg);
    const wrongK = kind === 'shift' ? (k === -1 ? 1 : k + 1) : 0;
    const candidates =
      kind === 'shift'
        ? [
            code(tg, (c) => pos(c)), // plain positions, forgot the shift
            code(tg, (c) => pos(c) + wrongK),
            code(tg, (c) => 27 - pos(c)),
            answer.split('-').reverse().join('-'),
          ]
        : [
            code(tg, (c) => pos(c)),
            code(tg, (c) => 26 - pos(c)), // used 26 - position
            answer.split('-').reverse().join('-'),
          ];
    const explain =
      kind === 'shift'
        ? `Each letter is replaced by its alphabet position ${k > 0 ? `plus ${k}` : `minus ${-k}`}: ${chars(ex)
            .map((c) => `${c} = ${pos(c)}${k > 0 ? '+' : '-'}${Math.abs(k)} = ${val(c)}`)
            .join(', ')}.`
        : `Each letter is replaced by its position counted from Z (Z = 1, Y = 2, ..., A = 26), i.e. 27 minus its usual position: ${chars(ex)
            .map((c) => `${c} → 27-${pos(c)} = ${val(c)}`)
            .join(', ')}.`;
    return {
      stem: `If ${ex} is coded as ${code(ex)}, how is ${tg} coded?`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: `${explain} Hence ${tg} → ${answer}.`,
    };
  }),

  b.dynamic('word-digit-code', { difficulty: 2, origin: 'past-paper', tags: ['number coding'] }, (r) => {
    const [w1, w2, targets] = r.pick(DIGIT_TRIPLES);
    const tg = r.pick(targets);
    const letters = [...new Set(chars(w1 + w2))];
    const digits = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], letters.length);
    const map = new Map(letters.map((c, i) => [c, String(digits[i])]));
    const enc = (w: string): string =>
      chars(w)
        .map((c) => map.get(c) ?? '')
        .join('');
    const answer = enc(tg);
    const swapAt = (w: string, i: number): string =>
      w.slice(0, i) + (w[i + 1] ?? '') + (w[i] ?? '') + w.slice(i + 2);
    const j = r.int(0, tg.length - 1);
    const wrongDigit = r.pick(digits.filter((d) => String(d) !== answer[j]));
    const oneWrong = answer.slice(0, j) + String(wrongDigit) + answer.slice(j + 1);
    const i1 = r.int(0, answer.length - 2);
    const distractors = pickDistractors(answer, [
      oneWrong,
      swapAt(answer, i1),
      rev(answer),
      swapAt(answer, (i1 + 2) % (answer.length - 1)),
      swapAt(oneWrong, i1),
    ]);
    return {
      stem: `In a certain code, ${w1} is written as ${enc(w1)} and ${w2} is written as ${enc(w2)}. How is ${tg} written in that code?`,
      answer,
      distractors,
      explanation: `Each letter stands for one digit. From the two codes: ${letters.map((c) => `${c} = ${map.get(c) ?? ''}`).join(', ')}. So ${tg} → ${chars(tg)
        .map((c) => map.get(c) ?? '')
        .join(' ')}, i.e. ${answer}.`,
    };
  }),

  b.dynamic('word-value-rule', { difficulty: 3, tags: ['number coding'] }, (r) => {
    const rule = ruleById(r.pick(['double', 'triple', 'reverse', 'times-length', 'plus-length']));
    // Two examples that only this rule explains among all the rules considered. They must
    // differ in length: with two 4-letter words "number of letters × sum" is
    // indistinguishable from "4 × sum", and "3 × sum" from "(letters − 1) × sum".
    let pair: [string, string] | null = null;
    for (let t = 0; t < 200 && !pair; t++) {
      const [e1, e2] = r.sample(SHORT, 2) as [string, string];
      if (e1.length === e2.length || sumPos(e1) === sumPos(e2) || rule.value(e1) === rule.value(e2)) continue;
      // No other rule may fit both examples, not even after adding a constant
      // (e.g. HAT = 52, ROAD = 70 is "counted from Z" but also "2 × sum − 6").
      const rivals = VALUE_RULES.filter(
        (x) => x !== rule && rule.value(e1) - x.value(e1) === rule.value(e2) - x.value(e2),
      );
      // Nor may any other simple rule (SHIP = 104, NET = 78 is "2 × sum" but also "2 × (sum counted from Z = 0)").
      const simpleRival = SIMPLE_RULES.some(
        (f) =>
          f(e1) === rule.value(e1) &&
          f(e2) === rule.value(e2) &&
          SHORT.some((w) => f(w) !== rule.value(w)),
      );
      if (rivals.length === 0 && !simpleRival) pair = [e1, e2];
    }
    if (!pair) throw new Error('word-value-rule: no unambiguous example pair');
    const [e1, e2] = pair;
    const tg = choose(r, SHORT, (w) => w !== e1 && w !== e2);
    const v = rule.value(tg);
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      wrong: r.shuffle(VALUE_RULES.filter((x) => x !== rule).map((x) => x.value(tg))),
      format: (x) => String(x),
    });
    return {
      stem: `In a certain code, ${e1} = ${rule.value(e1)} and ${e2} = ${rule.value(e2)}. Following the same rule, ${tg} = ?`,
      answer,
      distractors,
      explanation: `The code is ${rule.rule}. Check: ${e1}: ${rule.show(e1)}; ${e2}: ${rule.show(e2)}. Hence ${tg}: ${rule.show(tg)}.`,
    };
  }),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'opposite-letter-pair', d: 1, t: ['letter coding'],
      q: 'In the English alphabet, A is paired with Z, B with Y, C with X, and so on. Which of the following pairs follows the same rule?',
      a: 'G and T',
      x: ['G and S', 'H and T', 'F and V'],
      e: 'Opposite letters have positions adding up to 27 (A + Z = 1 + 26). G + T = 7 + 20 = 27. The others give 7 + 19 = 26, 8 + 20 = 28 and 6 + 22 = 28.',
    },
    {
      id: 'identify-shift', d: 1, t: ['letter coding'],
      q: 'If FOUR is written as GPVS in a code, each letter of the word has been:',
      a: 'moved one place forward',
      x: ['moved one place backward', 'moved two places forward', 'replaced by its opposite letter'],
      e: 'F→G, O→P, U→V, R→S: every letter is replaced by the next letter of the alphabet. (The opposite of F would be U, not G.)',
    },
    {
      id: 'cyclic-backward-shift', d: 1, t: ['letter coding'],
      q: 'In a code, each letter is replaced by the letter three places before it, counting cyclically (before A comes Z). How is BAD written in this code?',
      a: 'YXA',
      x: ['EDG', 'ZYB', 'AXY'],
      e: 'Counting three places back with wrap-around: B → A → Z → Y, A → Z → Y → X, D → C → B → A. So BAD becomes YXA. (EDG moves forward; ZYB moves only two places; AXY is YXA reversed.)',
    },
  ]),
]);
