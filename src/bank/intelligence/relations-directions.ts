import { defineBank } from '@/engine/authoring';
import { numericOptions, pickDistractors, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Shared data and helpers
// ---------------------------------------------------------------------------

const MALE_NAMES = [
  'Ali', 'Ahmed', 'Bilal', 'Hamza', 'Usman', 'Saad', 'Faisal', 'Imran', 'Kamran', 'Tariq',
  'Zubair', 'Asad', 'Danish', 'Haris', 'Junaid', 'Naveed', 'Omar', 'Rizwan', 'Shahid', 'Waqas',
] as const;
const FEMALE_NAMES = [
  'Ayesha', 'Fatima', 'Hina', 'Sana', 'Maryam', 'Zainab', 'Amna', 'Sadia', 'Rabia', 'Nida',
  'Mahnoor', 'Iqra', 'Kiran', 'Saima', 'Hira', 'Bushra', 'Areeba', 'Laiba', 'Noor', 'Uzma',
] as const;

/** Element `i` of a non-empty array (throws on a bad index, so templates fail loudly). */
function at<T>(items: readonly T[], i: number): T {
  const v = items[i];
  if (v === undefined) throw new RangeError(`index ${i} out of range`);
  return v;
}

interface Person {
  name: string;
  male: boolean;
  he: string;
  his: string;
  him: string;
}

function person(name: string, male: boolean): Person {
  return { name, male, he: male ? 'he' : 'she', his: male ? 'his' : 'her', him: male ? 'him' : 'her' };
}

/** A random person of either gender (or the requested one). */
function randomPerson(r: Rng, male?: boolean): Person {
  const m = male ?? r.chance(0.5);
  return person(r.pick(m ? MALE_NAMES : FEMALE_NAMES), m);
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// --- Directions -------------------------------------------------------------

/** The eight directions, clockwise from North (index step = 45 degrees). */
const DIRS = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'] as const;
const VX = [0, 1, 1, 1, 0, -1, -1, -1] as const;
const VY = [1, 1, 0, -1, -1, -1, 0, 1] as const;
const mod8 = (n: number): number => ((n % 8) + 8) % 8;
const dirName = (i: number): string => at(DIRS, mod8(i));

/** Direction index of the quadrant (or axis) containing the non-zero vector (x, y). */
function quadDir(x: number, y: number): number {
  const sx = Math.sign(x);
  const sy = Math.sign(y);
  for (let i = 0; i < 8; i++) if (at(VX, i) === sx && at(VY, i) === sy) return i;
  throw new RangeError('quadDir: zero vector');
}

/** Exact 8-point direction of (x, y), or -1 when it is not on an axis or a 45-degree line. */
function exactDir(x: number, y: number): number {
  if (x === 0 && y === 0) return -1;
  if (x !== 0 && y !== 0 && Math.abs(x) !== Math.abs(y)) return -1;
  return quadDir(x, y);
}

/** Mirror a direction in the North-South line (East <-> West). */
const mirrorEW = (i: number): number => quadDir(-at(VX, mod8(i)) || 0, at(VY, mod8(i)));
/** Mirror a direction in the East-West line (North <-> South). */
const mirrorNS = (i: number): number => quadDir(at(VX, mod8(i)), -at(VY, mod8(i)) || 0);

interface Leg {
  dir: number; // 0, 2, 4 or 6
  len: number;
}

/** "x = 10 + 14 = 24" style working for one axis (East / North positive). */
function axisWork(symbol: string, values: readonly number[]): string {
  const total = values.reduce((s, v) => s + v, 0);
  if (values.length === 0) return `${symbol} = 0`;
  if (values.length === 1) return `${symbol} = ${total}`;
  const terms = values.map((v, i) => (i === 0 ? String(v) : v < 0 ? `- ${-v}` : `+ ${v}`)).join(' ');
  return `${symbol} = ${terms} = ${total}`;
}

function legsNet(legs: readonly Leg[]): { x: number; y: number; xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const l of legs) {
    if (at(VX, l.dir) !== 0) xs.push(at(VX, l.dir) * l.len);
    else ys.push(at(VY, l.dir) * l.len);
  }
  return { x: xs.reduce((s, v) => s + v, 0), y: ys.reduce((s, v) => s + v, 0), xs, ys };
}

function legsText(legs: readonly Leg[], unit: string): string {
  const parts = legs.map((l) => `${l.len} ${unit} ${dirName(l.dir)}`);
  if (parts.length === 2) return `${at(parts, 0)} and then ${at(parts, 1)}`;
  return `${parts.slice(0, -1).join(', then ')} and finally ${at(parts, parts.length - 1)}`;
}

/** Signed value on an axis -> leg. */
function legOf(axis: 'x' | 'y', signed: number): Leg {
  if (axis === 'x') return { dir: signed > 0 ? 2 : 6, len: Math.abs(signed) };
  return { dir: signed > 0 ? 0 : 4, len: Math.abs(signed) };
}

/**
 * Builds `count` legs on alternating axes (starting with `first`) whose net displacement
 * is exactly (tx, ty). Returns null when the random split fails (caller retries).
 */
function buildWalk(r: Rng, tx: number, ty: number, count: 3 | 4, first: 'x' | 'y', step: number, maxUnits: number): Leg[] | null {
  const second: 'x' | 'y' = first === 'x' ? 'y' : 'x';
  const target = { x: tx, y: ty };
  const plan: Array<'x' | 'y'> = count === 3 ? [first, second, first] : [first, second, first, second];
  const split = (axis: 'x' | 'y'): number[] | null => {
    const n = plan.filter((a) => a === axis).length;
    const t = target[axis];
    if (n === 1) return t === 0 ? null : [t];
    const a = r.sign() * r.int(1, maxUnits) * step;
    const b = t - a;
    if (b === 0 || Math.abs(b) > maxUnits * step * 1.5) return null;
    return [a, b];
  };
  const xs = split('x');
  const ys = split('y');
  if (!xs || !ys) return null;
  const legs: Leg[] = [];
  let ix = 0;
  let iy = 0;
  for (const axis of plan) legs.push(axis === 'x' ? legOf('x', at(xs, ix++)) : legOf('y', at(ys, iy++)));
  return legs;
}

/** Pythagorean triples [a, b, c] with c <= 61 (both orders). */
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = (() => {
  const base: Array<[number, number, number]> = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [12, 35, 37], [9, 40, 41], [28, 45, 53], [11, 60, 61]];
  const out: Array<readonly [number, number, number]> = [];
  for (const [a, b, c] of base) {
    for (let k = 1; k * c <= 61; k++) {
      out.push([a * k, b * k, c * k], [b * k, a * k, c * k]);
    }
  }
  return out;
})();

// --- Families ---------------------------------------------------------------

interface Member {
  id: string;
  male: boolean;
  father?: string;
  mother?: string;
  spouse?: string;
}

/** A three-generation model family used to generate relation chains. */
const FAMILY: readonly Member[] = [
  { id: 'pgf', male: true, spouse: 'pgm' },
  { id: 'pgm', male: false, spouse: 'pgf' },
  { id: 'mgf', male: true, spouse: 'mgm' },
  { id: 'mgm', male: false, spouse: 'mgf' },
  { id: 'fa', male: true, father: 'pgf', mother: 'pgm', spouse: 'mo' },
  { id: 'mo', male: false, father: 'mgf', mother: 'mgm', spouse: 'fa' },
  { id: 'pu', male: true, father: 'pgf', mother: 'pgm', spouse: 'pua' },
  { id: 'pua', male: false, spouse: 'pu' },
  { id: 'pa', male: false, father: 'pgf', mother: 'pgm', spouse: 'pah' },
  { id: 'pah', male: true, spouse: 'pa' },
  { id: 'mu', male: true, father: 'mgf', mother: 'mgm' },
  { id: 'ma', male: false, father: 'mgf', mother: 'mgm' },
  { id: 'b1', male: true, father: 'fa', mother: 'mo', spouse: 'b1w' },
  { id: 'b1w', male: false, spouse: 'b1' },
  { id: 's1', male: false, father: 'fa', mother: 'mo', spouse: 's1h' },
  { id: 's1h', male: true, spouse: 's1' },
  { id: 'b2', male: true, father: 'fa', mother: 'mo' },
  { id: 's2', male: false, father: 'fa', mother: 'mo' },
  { id: 'n1', male: true, father: 'b1', mother: 'b1w' },
  { id: 'n2', male: false, father: 'b1', mother: 'b1w' },
  { id: 'n3', male: true, father: 's1h', mother: 's1' },
  { id: 'c1', male: true, father: 'pu', mother: 'pua' },
  { id: 'c2', male: false, father: 'pu', mother: 'pua' },
  { id: 'c3', male: true, father: 'pah', mother: 'pa' },
];
const MEMBER = new Map(FAMILY.map((m) => [m.id, m]));

function member(id: string): Member {
  const m = MEMBER.get(id);
  if (!m) throw new RangeError(`unknown family member ${id}`);
  return m;
}
const parentsOf = (id: string): string[] => {
  const m = member(id);
  return [m.father, m.mother].filter((x): x is string => x !== undefined);
};
const childrenOf = (id: string): string[] => FAMILY.filter((m) => m.father === id || m.mother === id).map((m) => m.id);
const siblingsOf = (id: string): string[] => {
  const m = member(id);
  if (!m.father) return [];
  return FAMILY.filter((o) => o.id !== id && o.father === m.father && o.mother === m.mother).map((o) => o.id);
};
const spouseOf = (id: string): string | undefined => member(id).spouse;

/** Single-word relation of `a` to `b` ("a is b's ___"), or null when there is no common term. */
function kinTerm(a: string, b: string): string | null {
  const A = member(a);
  const g = (m: string, f: string): string => (A.male ? m : f);
  const pa = parentsOf(a);
  const pb = parentsOf(b);
  const sb = spouseOf(b);
  if (A.spouse === b) return g('Husband', 'Wife');
  if (pb.includes(a)) return g('Father', 'Mother');
  if (pa.includes(b)) return g('Son', 'Daughter');
  if (siblingsOf(a).includes(b)) return g('Brother', 'Sister');
  if (pb.some((p) => parentsOf(p).includes(a))) return g('Grandfather', 'Grandmother');
  if (pa.some((p) => parentsOf(p).includes(b))) return g('Grandson', 'Granddaughter');
  if (pb.some((p) => siblingsOf(p).includes(a) || siblingsOf(p).some((s) => spouseOf(s) === a))) return g('Uncle', 'Aunt');
  if (pa.some((p) => siblingsOf(p).includes(b) || (sb !== undefined && siblingsOf(p).includes(sb)))) return g('Nephew', 'Niece');
  if (pa.some((p) => pb.some((q) => siblingsOf(q).includes(p)))) return 'Cousin';
  if (sb !== undefined && parentsOf(sb).includes(a)) return g('Father-in-law', 'Mother-in-law');
  if (childrenOf(b).some((c) => spouseOf(c) === a)) return g('Son-in-law', 'Daughter-in-law');
  if ((sb !== undefined && siblingsOf(sb).includes(a)) || siblingsOf(b).some((s) => spouseOf(s) === a)) {
    return g('Brother-in-law', 'Sister-in-law');
  }
  return null;
}

type EdgeKind = 'up' | 'down' | 'side' | 'spouse';
const EDGE_WORD: Record<EdgeKind, readonly [string, string]> = {
  up: ['son', 'daughter'],
  down: ['father', 'mother'],
  side: ['brother', 'sister'],
  spouse: ['husband', 'wife'],
};

function edgesOf(id: string): Array<{ to: string; kind: EdgeKind }> {
  const out: Array<{ to: string; kind: EdgeKind }> = [];
  for (const p of parentsOf(id)) out.push({ to: p, kind: 'up' });
  for (const c of childrenOf(id)) out.push({ to: c, kind: 'down' });
  for (const s of siblingsOf(id)) out.push({ to: s, kind: 'side' });
  const sp = spouseOf(id);
  if (sp) out.push({ to: sp, kind: 'spouse' });
  return out;
}

interface FamilyWalk {
  /** Members visited, first to last. */
  path: string[];
  /** words[i]: path[i] is the ___ of path[i + 1]. */
  words: string[];
  /** Relation of path[0] to the last member. */
  answer: string;
}

/**
 * A chain of `steps` primary relations through distinct members such that the first
 * member's relation to the last has a standard one-word name. A step "down" followed by
 * "up" (X is the father of Y, Y is the son of Z) is avoided because it only implies a
 * spouse indirectly.
 */
function familyWalk(r: Rng, steps: number): FamilyWalk {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const path = [r.pick(FAMILY).id];
    const words: string[] = [];
    let prev: EdgeKind | null = null;
    let ok = true;
    for (let s = 0; s < steps; s++) {
      const cur = at(path, path.length - 1);
      const options = edgesOf(cur).filter((e) => !path.includes(e.to) && !(prev === 'down' && e.kind === 'up'));
      if (options.length === 0) {
        ok = false;
        break;
      }
      const e = r.pick(options);
      words.push(at(EDGE_WORD[e.kind], member(cur).male ? 0 : 1));
      path.push(e.to);
      prev = e.kind;
    }
    if (!ok) continue;
    const answer = kinTerm(at(path, 0), at(path, path.length - 1));
    if (answer) return { path, words, answer };
  }
  throw new Error('familyWalk: no valid chain found');
}

/** Plausible wrong relations for each answer (same gender as the answer). */
const CONFUSE: Record<string, readonly string[]> = {
  Father: ['Grandfather', 'Uncle', 'Brother', 'Father-in-law', 'Son'],
  Mother: ['Grandmother', 'Aunt', 'Sister', 'Mother-in-law', 'Daughter'],
  Son: ['Brother', 'Nephew', 'Grandson', 'Son-in-law', 'Father'],
  Daughter: ['Sister', 'Niece', 'Granddaughter', 'Daughter-in-law', 'Mother'],
  Brother: ['Cousin', 'Son', 'Brother-in-law', 'Nephew', 'Uncle'],
  Sister: ['Cousin', 'Daughter', 'Sister-in-law', 'Niece', 'Aunt'],
  Husband: ['Brother-in-law', 'Father', 'Son-in-law', 'Brother'],
  Wife: ['Sister-in-law', 'Mother', 'Daughter-in-law', 'Sister'],
  Grandfather: ['Father', 'Uncle', 'Father-in-law', 'Grandson'],
  Grandmother: ['Mother', 'Aunt', 'Mother-in-law', 'Granddaughter'],
  Grandson: ['Son', 'Nephew', 'Grandfather', 'Son-in-law'],
  Granddaughter: ['Daughter', 'Niece', 'Grandmother', 'Daughter-in-law'],
  Uncle: ['Nephew', 'Father', 'Cousin', 'Brother', 'Grandfather'],
  Aunt: ['Niece', 'Mother', 'Cousin', 'Sister', 'Grandmother'],
  Nephew: ['Uncle', 'Son', 'Cousin', 'Grandson', 'Brother'],
  Niece: ['Aunt', 'Daughter', 'Cousin', 'Granddaughter', 'Sister'],
  'Cousin-m': ['Brother', 'Nephew', 'Uncle', 'Brother-in-law'],
  'Cousin-f': ['Sister', 'Niece', 'Aunt', 'Sister-in-law'],
  'Father-in-law': ['Father', 'Brother-in-law', 'Uncle', 'Son-in-law'],
  'Mother-in-law': ['Mother', 'Sister-in-law', 'Aunt', 'Daughter-in-law'],
  'Son-in-law': ['Son', 'Brother-in-law', 'Nephew', 'Father-in-law'],
  'Daughter-in-law': ['Daughter', 'Sister-in-law', 'Niece', 'Mother-in-law'],
  'Brother-in-law': ['Brother', 'Husband', 'Cousin', 'Son-in-law', 'Father-in-law'],
  'Sister-in-law': ['Sister', 'Wife', 'Cousin', 'Daughter-in-law', 'Mother-in-law'],
};

function relationDistractors(r: Rng, answer: string, male: boolean): string[] {
  const key = answer === 'Cousin' ? (male ? 'Cousin-m' : 'Cousin-f') : answer;
  const pool = CONFUSE[key];
  if (!pool) throw new Error(`no confusion list for ${answer}`);
  return pickDistractors(answer, pool, r);
}

/** Step-by-step explanation of a relation chain, using display labels for the members. */
function chainExplanation(walk: FamilyWalk, label: (id: string) => string): string {
  const first = label(at(walk.path, 0));
  const parts: string[] = [];
  walk.words.forEach((w, i) => {
    const stmt = `${label(at(walk.path, i))} is the ${w} of ${label(at(walk.path, i + 1))}`;
    if (i === 0) {
      parts.push(`${stmt}.`);
      return;
    }
    const t = kinTerm(at(walk.path, 0), at(walk.path, i + 1));
    const cur = label(at(walk.path, i));
    const next = label(at(walk.path, i + 1));
    if ((t === 'Husband' || t === 'Wife') && (w === 'son' || w === 'daughter')) {
      // "A is the father of C ... C is the son of D": D is C's other parent (D is not A).
      const [own, other] = t === 'Husband' ? ['father', 'mother'] : ['mother', 'father'];
      parts.push(`${stmt}. Since ${first} is ${cur}'s ${own} and ${next} is a different person, ${next} must be ${cur}'s ${other}, so ${first} is the ${t.toLowerCase()} of ${next}.`);
      return;
    }
    parts.push(t ? `${stmt}, so ${first} is the ${t.toLowerCase()} of ${next}.` : `${stmt}.`);
  });
  return parts.join(' ');
}

// --- Pointing statements ----------------------------------------------------

interface PointingItem {
  /** Speaker gender: true male, false female, undefined either. */
  sm?: boolean;
  /** Gender of the person pointed at. */
  tm: boolean;
  /** What the speaker says (without quotation marks). */
  say: string;
  ans: string;
  /** Hand-picked distractors for the trap items (otherwise the confusion list is used). */
  x?: readonly [string, string, string];
  /** Reason, given the speaker's name. */
  why: (s: string) => string;
}

const POINTING_SIMPLE: readonly PointingItem[] = [
  { tm: true, say: "He is the son of my mother's only brother.", ans: 'Cousin', why: (s) => `${s}'s mother's brother is ${s}'s (maternal) uncle, and an uncle's son is a cousin.` },
  { tm: false, say: "She is the daughter of my father's only sister.", ans: 'Cousin', why: (s) => `${s}'s father's sister is ${s}'s aunt, and an aunt's daughter is a cousin.` },
  { tm: false, say: 'She is the only daughter of my brother.', ans: 'Niece', why: (s) => `A brother's daughter is a niece, so she is ${s}'s niece.` },
  { tm: true, say: 'He is the son of my only sister.', ans: 'Nephew', why: (s) => `A sister's son is a nephew, so he is ${s}'s nephew.` },
  { sm: true, tm: true, say: 'He is the father of my wife.', ans: 'Father-in-law', why: (s) => `The father of ${s}'s wife is ${s}'s father-in-law.` },
  { sm: false, tm: false, say: 'She is the mother of my husband.', ans: 'Mother-in-law', why: (s) => `The mother of ${s}'s husband is ${s}'s mother-in-law.` },
  { tm: true, say: 'He is the husband of my daughter.', ans: 'Son-in-law', why: (s) => `A daughter's husband is a son-in-law, so he is ${s}'s son-in-law.` },
  { tm: false, say: 'She is the wife of my son.', ans: 'Daughter-in-law', why: (s) => `A son's wife is a daughter-in-law, so she is ${s}'s daughter-in-law.` },
  { tm: true, say: 'He is the father of my father.', ans: 'Grandfather', why: (s) => `A father's father is a grandfather, so he is ${s}'s grandfather.` },
  { tm: false, say: 'She is the mother of my mother.', ans: 'Grandmother', why: (s) => `A mother's mother is a grandmother, so she is ${s}'s grandmother.` },
  { tm: true, say: 'He is the son of my son.', ans: 'Grandson', why: (s) => `A son's son is a grandson, so he is ${s}'s grandson.` },
  { tm: false, say: 'She is the daughter of my son.', ans: 'Granddaughter', why: (s) => `A son's daughter is a granddaughter, so she is ${s}'s granddaughter.` },
  { sm: false, tm: true, say: 'He is the brother of my husband.', ans: 'Brother-in-law', why: (s) => `The brother of ${s}'s husband is ${s}'s brother-in-law.` },
  { sm: true, tm: false, say: 'She is the sister of my wife.', ans: 'Sister-in-law', why: (s) => `The sister of ${s}'s wife is ${s}'s sister-in-law.` },
  { tm: true, say: 'He is the brother of my father.', ans: 'Uncle', why: (s) => `A father's brother is an uncle, so he is ${s}'s uncle.` },
  { tm: false, say: 'She is the sister of my mother.', ans: 'Aunt', why: (s) => `A mother's sister is an aunt, so she is ${s}'s aunt.` },
  { tm: true, say: "He is the husband of my mother's sister.", ans: 'Uncle', why: (s) => `The husband of ${s}'s aunt (mother's sister) is ${s}'s uncle.` },
  { tm: true, say: "His mother is my mother's sister.", ans: 'Cousin', why: (s) => `His mother is ${s}'s aunt, so he is the son of ${s}'s aunt: a cousin.` },
  { tm: false, say: 'Her brother is my father.', ans: 'Aunt', why: (s) => `She is the sister of ${s}'s father, so she is ${s}'s aunt.` },
  { tm: true, say: 'His sister is my mother.', ans: 'Uncle', why: (s) => `He is the brother of ${s}'s mother, so he is ${s}'s (maternal) uncle.` },
];

const POINTING_COMPOUND: readonly PointingItem[] = [
  {
    sm: true, tm: true, say: "He is the son of my father's only son.", ans: 'Son', x: ['Brother', 'Nephew', 'Grandson'],
    why: (s) => `${s} is male, so the only son of ${s}'s father is ${s} himself. The man is therefore ${s}'s son.`,
  },
  {
    sm: false, tm: true, say: "His father is my father's only son.", ans: 'Nephew', x: ['Son', 'Brother', 'Cousin'],
    why: (s) => `${s} is a woman, so her father's only son is her brother. The man's father is her brother, so he is her nephew.`,
  },
  {
    sm: true, tm: false, say: 'She is the daughter of the only son of my paternal grandfather.', ans: 'Sister', x: ['Cousin', 'Aunt', 'Niece'],
    why: (s) => `The only son of ${s}'s paternal grandfather is ${s}'s father. His daughter is ${s}'s sister.`,
  },
  {
    sm: false, tm: false, say: "Her brother's father is my father-in-law.", ans: 'Sister-in-law', x: ['Sister', 'Mother-in-law', 'Daughter-in-law'],
    why: (s) => `Her father is ${s}'s father-in-law, so she is a daughter of ${s}'s husband's father, that is, ${s}'s husband's sister: a sister-in-law.`,
  },
  {
    sm: true, tm: true, say: "His mother is the wife of my mother's only son.", ans: 'Son', x: ['Brother', 'Nephew', 'Grandson'],
    why: (s) => `${s} is male, so his mother's only son is ${s} himself. The man's mother is ${s}'s wife, so the man is ${s}'s son.`,
  },
  {
    sm: true, tm: false, say: "She is the wife of my father's only son.", ans: 'Wife', x: ['Sister-in-law', 'Mother', 'Sister'],
    why: (s) => `${s} is male, so his father's only son is ${s} himself. She is the wife of ${s}.`,
  },
  {
    sm: false, tm: true, say: "He is the father of my husband's only sister.", ans: 'Father-in-law', x: ['Father', 'Brother-in-law', 'Husband'],
    why: (s) => `The father of ${s}'s husband's sister is also the father of ${s}'s husband, so he is ${s}'s father-in-law.`,
  },
  {
    sm: false, tm: false, say: "She is the daughter of my husband's only brother.", ans: 'Niece', x: ['Daughter', 'Sister-in-law', 'Cousin'],
    why: (s) => `${s}'s husband's brother is ${s}'s brother-in-law; his daughter is ${s}'s niece.`,
  },
  {
    tm: true, say: 'His father is the only brother of my mother.', ans: 'Cousin', x: ['Brother', 'Nephew', 'Uncle'],
    why: (s) => `His father is ${s}'s maternal uncle, so he is the son of ${s}'s uncle: a cousin.`,
  },
  {
    sm: false, tm: true, say: "He is the only son of my mother's only daughter.", ans: 'Son', x: ['Brother', 'Nephew', 'Grandson'],
    why: (s) => `${s} is a woman, so her mother's only daughter is ${s} herself. He is ${s}'s son.`,
  },
  {
    sm: true, tm: false, say: 'Her father is the only son of my mother.', ans: 'Daughter', x: ['Sister', 'Niece', 'Granddaughter'],
    why: (s) => `${s} is male, so his mother's only son is ${s} himself. Her father is ${s}, so she is his daughter.`,
  },
  {
    tm: false, say: "Her mother's brother is my father.", ans: 'Cousin', x: ['Sister', 'Niece', 'Aunt'],
    why: (s) => `Her mother is the sister of ${s}'s father, that is, ${s}'s aunt. The daughter of an aunt is a cousin.`,
  },
  {
    sm: false, tm: true, say: 'He is the son of the only daughter-in-law of my mother.', ans: 'Nephew', x: ['Son', 'Brother', 'Cousin'],
    why: (s) => `${s} is her mother's daughter, not her daughter-in-law, so the only daughter-in-law is ${s}'s brother's wife. Her son is ${s}'s nephew.`,
  },
];

function pointingQuestion(r: Rng, items: readonly PointingItem[]) {
  const it = r.pick(items);
  const speaker = randomPerson(r, it.sm);
  const noun = it.tm ? 'man' : 'woman';
  const frame = r.int(0, 2);
  const lead =
    frame === 0
      ? `Pointing to a ${noun} in a photograph, ${speaker.name} said,`
      : frame === 1
        ? `Introducing a ${noun} at a wedding, ${speaker.name} said,`
        : `Pointing to a ${noun} across the street, ${speaker.name} said,`;
  return {
    stem: `${lead} "${it.say}" How is the ${noun} related to ${speaker.name}?`,
    answer: it.ans,
    distractors: it.x ? [...it.x] : relationDistractors(r, it.ans, it.tm),
    explanation: it.why(speaker.name),
  };
}

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('intelligence', 'relations-directions', (b) => [
  // ======================= Direction sense ===============================

  b.dynamic('walk-net-distance', { difficulty: 1, origin: 'past-paper', tags: ['direction sense'] }, (r) => {
    // Small triples only (hypotenuse <= 30) so this stays a quick difficulty-1 item.
    const [P, Q, c] = r.pick(TRIPLES.filter(([, , h]) => h <= 30));
    const unit = r.pick(['m', 'km']);
    const main = r.pick([0, 2, 4, 6]);
    const cross = mod8(main + r.pick([2, 6]));
    const back = r.chance(0.35);
    let l1: number;
    let l3: number;
    if (back) {
      l3 = r.int(1, Math.max(2, Math.floor(P / 2)));
      l1 = P + l3;
    } else {
      l1 = r.int(1, P - 1);
      l3 = P - l1;
    }
    const legs: Leg[] = [
      { dir: main, len: l1 },
      { dir: cross, len: Q },
      { dir: back ? mod8(main + 4) : main, len: l3 },
    ];
    const who = randomPerson(r);
    const path = l1 + Q + l3;
    const { answer, distractors } = numericOptions(r, {
      correct: c,
      wrong: [path, P + Q, Math.abs(P - Q), back ? Math.round(Math.sqrt((l1 + l3) ** 2 + Q * Q)) : c + 1],
      format: (v) => `${v} ${unit}`,
    });
    const mainWork = back ? `${l1} - ${l3} = ${P}` : `${l1} + ${l3} = ${P}`;
    return {
      stem: `Starting from ${who.his} house, ${who.name} walks ${legsText(legs, unit)}. How far is ${who.he} now from ${who.his} house?`,
      answer,
      distractors,
      explanation: tex`Net ${dirName(main)} displacement $= ${mainWork}$ ${unit}; net ${dirName(cross)} displacement $= ${Q}$ ${unit}. These are at right angles, so the distance $= \sqrt{${P}^2 + ${Q}^2} = \sqrt{${P * P + Q * Q}} = ${c}$ ${unit}. (${path} ${unit} is the length of the path walked, not the distance from the start.)`,
    };
  }),

  b.dynamic('walk-final-direction', { difficulty: 1, origin: 'past-paper', tags: ['direction sense'] }, (r) => {
    const unit = r.pick(['m', 'km']);
    const step = unit === 'm' ? 5 : 1;
    for (;;) {
      const target = r.int(0, 7);
      const n = r.int(1, 6) * step;
      const tx = at(VX, target) * n;
      const ty = at(VY, target) * n;
      const count: 3 | 4 = r.chance(0.5) ? 3 : 4;
      const first: 'x' | 'y' = r.chance(0.5) ? 'x' : 'y';
      const legs = buildWalk(r, tx, ty, count, first, step, 6);
      if (!legs) continue;
      const net = legsNet(legs);
      const d = exactDir(net.x, net.y);
      if (d !== target) continue;
      const who = randomPerson(r);
      const answer = dirName(d);
      const distractors = pickDistractors(answer, [d + 4, mirrorEW(d), mirrorNS(d), d + 2, d - 2].map(dirName));
      const desc =
        net.x !== 0 && net.y !== 0
          ? `${Math.abs(net.x)} ${unit} ${net.x > 0 ? 'East' : 'West'} and ${Math.abs(net.y)} ${unit} ${net.y > 0 ? 'North' : 'South'} of the start (equal amounts)`
          : `${n} ${unit} ${answer} of the start (no net ${net.x === 0 ? 'East-West' : 'North-South'} movement)`;
      return {
        stem: `${who.name} starts from point O and walks ${legsText(legs, unit)}. In which direction is ${who.he} now from point O?`,
        answer,
        distractors,
        explanation: `Take East and North as positive: $${axisWork('x', net.xs)}$ and $${axisWork('y', net.ys)}$. So ${who.he} is ${desc}, that is, ${answer} of O. (${dirName(d + 4)} would be the direction of O from ${who.him}.)`,
      };
    }
  }),

  b.dynamic('walk-distance-and-direction', { difficulty: 2, tags: ['direction sense'] }, (r) => {
    const unit = r.pick(['m', 'km']);
    for (;;) {
      // Skip lopsided triples (e.g. 40 W, 9 S) whose "South-West" label would be debatable.
      const [P, Q, c] = r.pick(TRIPLES.filter(([a, b2, h]) => h <= 41 && Math.min(a, b2) / Math.max(a, b2) >= 0.4));
      const tx = r.sign() * P;
      const ty = r.sign() * Q;
      const legs = buildWalk(r, tx, ty, 4, r.chance(0.5) ? 'x' : 'y', 1, Math.max(4, Math.ceil(Math.max(P, Q) * 0.8)));
      if (!legs) continue;
      const net = legsNet(legs);
      const backtracks = net.xs.some((v) => Math.sign(v) !== Math.sign(net.x)) || net.ys.some((v) => Math.sign(v) !== Math.sign(net.y));
      if (!backtracks) continue;
      const d = quadDir(net.x, net.y);
      const path = legs.reduce((s, l) => s + l.len, 0);
      const opt = (dist: number, dir: number): string => `${dist} ${unit}, ${dirName(dir)}`;
      const answer = opt(c, d);
      const distractors = pickDistractors(answer, [opt(c, d + 4), opt(path, d), ...r.shuffle([opt(P + Q, d), opt(c, mirrorEW(d)), opt(c, mirrorNS(d))])]);
      const who = randomPerson(r);
      return {
        stem: `${who.name} walks ${legsText(legs, unit)}. How far and in which direction is ${who.he} now from the starting point?`,
        answer,
        distractors,
        explanation: tex`Take East and North as positive: $${axisWork('x', net.xs)}$, $${axisWork('y', net.ys)}$. So ${who.he} is ${P} ${unit} ${net.x > 0 ? 'East' : 'West'} and ${Q} ${unit} ${net.y > 0 ? 'North' : 'South'} of the start, i.e. towards the ${dirName(d)}. Distance $= \sqrt{${P}^2 + ${Q}^2} = \sqrt{${P * P + Q * Q}} = ${c}$ ${unit}.`,
      };
    }
  }),

  b.dynamic('turns-final-facing', { difficulty: 1, tags: ['direction sense'] }, (r) => {
    const start = r.pick([0, 2, 4, 6]);
    const n = r.int(2, 3);
    const turns: Array<{ deg: number; cw: boolean; text: string }> = [];
    for (let i = 0; i < n; i++) {
      const deg = r.pick([45, 90, 90, 135, 180]);
      const cw = r.chance(0.5);
      let text: string;
      if (deg === 180) text = 'turns through 180°';
      else if (deg === 90) text = cw ? r.pick(['turns right', 'turns 90° clockwise']) : r.pick(['turns left', 'turns 90° anticlockwise']);
      else text = `turns ${deg}° ${cw ? 'clockwise' : 'anticlockwise'}`;
      turns.push({ deg, cw: deg === 180 ? true : cw, text });
    }
    const signed = turns.map((t) => (t.cw ? t.deg : -t.deg));
    const net = signed.reduce((s, v) => s + v, 0);
    const ans = mod8(start + net / 45);
    const allCw = mod8(start + turns.reduce((s, t) => s + t.deg, 0) / 45);
    const answer = dirName(ans);
    const distractors = pickDistractors(answer, [allCw, start - net / 45, ans + 4, start, ans + 2, ans - 2].map(dirName));
    const who = randomPerson(r);
    const turnText = turns.map((t) => t.text);
    const steps = turnText.length === 2 ? `${at(turnText, 0)} and then ${at(turnText, 1)}` : `${at(turnText, 0)}, then ${at(turnText, 1)} and then ${at(turnText, 2)}`;
    const expr = signed.map((v, i) => (i === 0 ? `${v}°` : v < 0 ? `- ${-v}°` : `+ ${v}°`)).join(' ');
    const netMod = ((net % 360) + 360) % 360;
    const turnSummary =
      netMod === 0
        ? `${net === 0 ? 'no net turn' : 'a whole number of full turns'}, so ${who.he} faces ${dirName(start)} again.`
        : netMod <= 180
          ? `i.e. ${netMod}° clockwise. Turning ${netMod}° clockwise from ${dirName(start)} gives ${answer}.`
          : `i.e. ${360 - netMod}° anticlockwise. Turning ${360 - netMod}° anticlockwise from ${dirName(start)} gives ${answer}.`;
    return {
      stem: `${who.name} is standing facing ${dirName(start)}. ${cap(who.he)} ${steps}. Which direction is ${who.he} facing now?`,
      answer,
      distractors,
      explanation: `Take clockwise turns as positive (right = clockwise, left = anticlockwise): net turn $= ${expr.replace(/°/g, '^\\circ')} = ${net}^\\circ$, ${turnSummary}`,
    };
  }),

  b.dynamic('shadow-facing', { difficulty: 2, origin: 'past-paper', tags: ['direction sense'] }, (r) => {
    const morning = r.chance(0.5);
    const shadow = morning ? 6 : 2;
    const time = morning
      ? r.pick(['At 8 a.m.', 'Soon after sunrise', 'Early one morning', 'At 8 o\'clock one morning'])
      : r.pick(['At 5 p.m.', 'Shortly before sunset', 'Late one afternoon', 'One evening, just before sunset']);
    const sunFact = morning
      ? 'In the morning the Sun is in the East, so shadows fall towards the West.'
      : 'In the late afternoon and evening the Sun is in the West, so shadows fall towards the East.';
    const cardinals = [0, 2, 4, 6];
    if (r.chance(0.45)) {
      const aMale = r.chance(0.5);
      const A = randomPerson(r, aMale);
      const B = randomPerson(r, !aMale);
      const right = r.chance(0.5);
      const bFacing = mod8(shadow - (right ? 2 : 6));
      const aFacing = mod8(bFacing + 4);
      const answer = dirName(aFacing);
      return {
        stem: `${time}, ${A.name} and ${B.name} were standing face to face. ${A.name}'s shadow fell exactly to ${B.name}'s ${right ? 'right' : 'left'}. Which direction was ${A.name} facing?`,
        answer,
        distractors: cardinals.filter((d) => d !== aFacing).map(dirName),
        explanation: `${sunFact} ${B.name}'s ${right ? 'right' : 'left'} therefore points ${dirName(shadow)}, so ${B.name} faces ${dirName(bFacing)}. ${A.name} faces ${B.name}, i.e. the opposite way: ${answer}.`,
      };
    }
    const who = randomPerson(r);
    const where = r.pick([
      { off: 2, text: `to ${who.his} right`, why: `${cap(who.his)} right hand points ${dirName(shadow)}` },
      { off: 6, text: `to ${who.his} left`, why: `${cap(who.his)} left hand points ${dirName(shadow)}` },
      { off: 4, text: `behind ${who.him}`, why: `${cap(who.his)} back is towards the ${dirName(shadow)}` },
      { off: 0, text: `in front of ${who.him}`, why: `${cap(who.he)} is looking towards the ${dirName(shadow)}` },
      { off: 2, text: `to ${who.his} right`, why: `${cap(who.his)} right hand points ${dirName(shadow)}` },
      { off: 6, text: `to ${who.his} left`, why: `${cap(who.his)} left hand points ${dirName(shadow)}` },
    ]);
    const facing = mod8(shadow - where.off);
    const answer = dirName(facing);
    return {
      stem: `${time}, ${who.name} was standing in an open field and ${who.his} shadow fell exactly ${where.text}. Which direction was ${who.he} facing?`,
      answer,
      distractors: cardinals.filter((d) => d !== facing).map(dirName),
      explanation: `${sunFact} ${where.why}, so ${who.he} is facing ${answer}.`,
    };
  }),

  b.dynamic('relative-position', { difficulty: 2, tags: ['direction sense'] }, (r) => {
    const unit = r.pick(['km', 'm']);
    const scale = unit === 'm' ? 10 : 1;
    for (;;) {
      const labels = r.sample(['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'], 4);
      const pos: Array<[number, number]> = [[0, 0]];
      const stated = new Set<string>();
      const lines: string[] = [];
      let ok = true;
      for (let i = 1; i < 4; i++) {
        const ref = r.int(0, i - 1);
        const dir = r.pick([0, 2, 4, 6]);
        const d = r.int(2, 9);
        const [rx, ry] = at(pos, ref);
        const p: [number, number] = [rx + at(VX, dir) * d, ry + at(VY, dir) * d];
        if (pos.some(([x, y]) => x === p[0] && y === p[1])) {
          ok = false;
          break;
        }
        pos.push(p);
        stated.add(`${Math.min(i, ref)}-${Math.max(i, ref)}`);
        lines.push(`${at(labels, i)} is ${d * scale} ${unit} ${dirName(dir)} of ${at(labels, ref)}.`);
      }
      if (!ok) continue;
      const pairs: Array<{ u: number; v: number; dir: number }> = [];
      for (let u = 0; u < 4; u++) {
        for (let v = 0; v < 4; v++) {
          if (u === v || stated.has(`${Math.min(u, v)}-${Math.max(u, v)}`)) continue;
          const dir = exactDir(at(pos, u)[0] - at(pos, v)[0], at(pos, u)[1] - at(pos, v)[1]);
          if (dir >= 0) pairs.push({ u, v, dir });
        }
      }
      if (pairs.length === 0) continue;
      const diagonal = pairs.filter((p) => p.dir % 2 === 1);
      if (diagonal.length === 0 && r.chance(0.8)) continue;
      const { u, v, dir } = r.pick(diagonal.length > 0 && r.chance(0.75) ? diagonal : pairs);
      const answer = dirName(dir);
      const distractors = pickDistractors(answer, [dir + 4, mirrorEW(dir), mirrorNS(dir), dir + 2, dir - 2].map(dirName));
      const coords = pos
        .slice(1)
        .map(([x, y], i) => `${at(labels, i + 1)}$(${x * scale}, ${y * scale})$`)
        .join(', ');
      const [ux, uy] = at(pos, u);
      const [vx, vy] = at(pos, v);
      return {
        stem: `${lines.join(' ')} In which direction is ${at(labels, u)} from ${at(labels, v)}?`,
        answer,
        distractors,
        explanation: `Put ${at(labels, 0)} at the origin with East and North positive (in ${unit}): ${coords}. Position of ${at(labels, u)} relative to ${at(labels, v)} $= (${(ux - vx) * scale}, ${(uy - vy) * scale})$, so ${at(labels, u)} is ${answer} of ${at(labels, v)}. (${dirName(dir + 4)} is the direction of ${at(labels, v)} from ${at(labels, u)}.)`,
      };
    }
  }),

  b.dynamic('turn-walk-distance-direction', { difficulty: 3, tags: ['direction sense'] }, (r) => {
    const BASE: ReadonlyArray<readonly [number, number, number]> = [
      [3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [0, 4, 4], [4, 0, 4], [0, 6, 6], [6, 0, 6], [0, 5, 5], [5, 0, 5],
    ];
    const unit = r.pick(['m', 'm', 'km']);
    const step = unit === 'm' ? r.pick([5, 10]) : 1;
    for (;;) {
      const [p, q, c] = r.pick(BASE);
      const start = r.pick([0, 2, 4, 6]);
      const turns = [r.chance(0.5), r.chance(0.5), r.chance(0.5)]; // true = right
      const sameA = at(turns, 0) !== at(turns, 1); // leg 3 parallel to leg 1
      const sameB = at(turns, 1) !== at(turns, 2); // leg 4 parallel to leg 2
      const split = (t: number, same: boolean): [number, number] | null => {
        if (same) {
          if (t < 2) return null;
          const a = r.int(1, t - 1);
          return [a, t - a];
        }
        const small = r.int(1, 6);
        if (t === 0) return [small, small];
        return r.chance(0.5) || small <= t ? [small + t, small] : [small, small - t];
      };
      const a = split(p, sameA);
      const bb = split(q, sameB);
      if (!a || !bb) continue;
      const lens = [a[0], bb[0], a[1], bb[1]].map((v) => v * step);
      const simulate = (swap: boolean): Leg[] => {
        let dir = start;
        return lens.map((len, i) => {
          if (i > 0) dir = mod8(dir + ((at(turns, i - 1) !== swap) ? 2 : -2));
          return { dir, len };
        });
      };
      const legs = simulate(false);
      const net = legsNet(legs);
      if (Math.abs(net.x) + Math.abs(net.y) === 0) continue;
      const d = quadDir(net.x, net.y);
      const mirrored = legsNet(simulate(true));
      const dm = quadDir(mirrored.x, mirrored.y);
      const dist = c * step;
      const path = lens.reduce((s, v) => s + v, 0);
      const opt = (len: number, dir: number): string => `${len} ${unit}, ${dirName(dir)}`;
      const answer = opt(dist, d);
      const distractors = pickDistractors(
        answer,
        [opt(dist, d + 4), opt(path, d), opt((p + q) * step, d), opt(dist, dm), opt(dist, d + 2), opt(dist, d - 2)],
      );
      const who = randomPerson(r);
      const turnWord = (right: boolean): string => (right ? 'right' : 'left');
      const stem = `${who.name} starts facing ${dirName(start)} and walks ${at(lens, 0)} ${unit}. ${cap(who.he)} turns ${turnWord(at(turns, 0))} and walks ${at(lens, 1)} ${unit}, turns ${turnWord(at(turns, 1))} and walks ${at(lens, 2)} ${unit}, and then turns ${turnWord(at(turns, 2))} and walks ${at(lens, 3)} ${unit}. How far and in which direction is ${who.he} from the starting point?`;
      const moves = legs.map((l) => `${l.len} ${unit} ${dirName(l.dir)}`).join(', ');
      const distWork =
        net.x === 0 || net.y === 0
          ? `Only one component is non-zero, so the distance is ${dist} ${unit}.`
          : tex`Distance $= \sqrt{${Math.abs(net.x)}^2 + ${Math.abs(net.y)}^2} = ${dist}$ ${unit}.`;
      return {
        stem,
        answer,
        distractors,
        explanation: `Track the facing direction after each turn: the moves are ${moves}. Taking East and North as positive, $${axisWork('x', net.xs)}$ and $${axisWork('y', net.ys)}$, so the final position is towards the ${dirName(d)} of the start. ${distWork}`,
      };
    }
  }),

  b.dynamic('direction-renaming', { difficulty: 2, tags: ['direction sense'] }, (r) => {
    const k = r.int(1, 7);
    const e1 = r.int(0, 7);
    const e2 = mod8(e1 + r.pick([1, 2, 3, 5, 6, 7]));
    const inverse = r.chance(0.4);
    const used = inverse ? [mod8(e1 + k), mod8(e2 + k)] : [e1, e2];
    const t = r.intExcept(0, 7, used);
    const ans = inverse ? t - k : t + k;
    const wrongSense = inverse ? t + k : t - k;
    const answer = dirName(ans);
    const distractors = pickDistractors(answer, [wrongSense, ans + 4, t, ans + 2, ans - 2].map(dirName));
    const q = (i: number): string => `'${dirName(i)}'`;
    const intro = `If ${q(e1)} is called ${q(e1 + k)}, ${q(e2)} is called ${q(e2 + k)}, and every other direction is renamed by turning it through the same angle in the same sense,`;
    const angle = k <= 4 ? `${45 * k}° clockwise` : `${360 - 45 * k}° anticlockwise`;
    const backAngle = k < 4 ? `${45 * k}° anticlockwise` : `${360 - 45 * k}° clockwise`;
    return {
      stem: inverse ? `${intro} which direction will be called ${q(t)}?` : `${intro} what will ${q(t)} be called?`,
      answer,
      distractors,
      explanation: inverse
        ? `${dirName(e1)} → ${dirName(e1 + k)} is a turn of ${angle}. The direction called ${dirName(t)} is the one that lands on ${dirName(t)} after this turn, so undo the turn: turning ${dirName(t)} back through ${backAngle} gives ${answer}.`
        : `${dirName(e1)} → ${dirName(e1 + k)} is a turn of ${angle} (check: ${dirName(e2)} → ${dirName(e2 + k)}). Turning ${dirName(t)} by ${angle} gives ${answer}.`,
    };
  }),

  // ======================= Family relations ==============================

  b.dynamic('pointing-relation', { difficulty: 1, origin: 'past-paper', tags: ['family relations'] }, (r) =>
    pointingQuestion(r, POINTING_SIMPLE),
  ),

  b.dynamic('pointing-self-reference', { difficulty: 2, tags: ['family relations'] }, (r) =>
    pointingQuestion(r, POINTING_COMPOUND),
  ),

  b.dynamic('relation-chain', { difficulty: 2, origin: 'past-paper', tags: ['family relations'] }, (r) => {
    const walk = familyWalk(r, r.chance(0.5) ? 2 : 3);
    const males = [...MALE_NAMES];
    const females = [...FEMALE_NAMES];
    const names = new Map<string, string>();
    for (const id of walk.path) {
      const list = member(id).male ? males : females;
      const i = r.int(0, list.length - 1);
      names.set(id, at(list, i));
      list.splice(i, 1);
    }
    const label = (id: string): string => names.get(id) ?? id;
    const statements = walk.words.map((w, i) => `${label(at(walk.path, i))} is the ${w} of ${label(at(walk.path, i + 1))}.`);
    const first = at(walk.path, 0);
    const last = at(walk.path, walk.path.length - 1);
    return {
      stem: `${statements.join(' ')} How is ${label(first)} related to ${label(last)}?`,
      answer: walk.answer,
      distractors: relationDistractors(r, walk.answer, member(first).male),
      explanation: chainExplanation(walk, label),
    };
  }),

  b.dynamic('coded-relations', { difficulty: 3, tags: ['family relations'] }, (r) => {
    const walk = familyWalk(r, 3);
    const letters = r.sample(['A', 'B', 'C', 'D', 'P', 'Q', 'R', 'S', 'T', 'M', 'N', 'K'], 4);
    const label = (id: string): string => at(letters, walk.path.indexOf(id));
    const used = [...new Set(walk.words)];
    const pool = ['father', 'mother', 'son', 'daughter', 'brother', 'sister', 'husband', 'wife'].filter((w) => !used.includes(w));
    const defined = r.shuffle([...used, ...r.sample(pool, 5 - used.length)]);
    const symbols = r.sample(['+', '-', '\\times', '\\div', '\\star', '\\#'], defined.length);
    const symOf = new Map(defined.map((w, i) => [w, at(symbols, i)]));
    const defs = defined.map((w) => `$X ${symOf.get(w) ?? ''} Y$ means $X$ is the ${w} of $Y$`).join('; ');
    let expr = at(letters, 0);
    walk.words.forEach((w, i) => {
      expr += ` ${symOf.get(w) ?? ''} ${at(letters, i + 1)}`;
    });
    const decode = walk.words
      .map((w, i) => `$${at(letters, i)} ${symOf.get(w) ?? ''} ${at(letters, i + 1)}$: ${at(letters, i)} is the ${w} of ${at(letters, i + 1)}`)
      .join('; ');
    return {
      stem: `In a certain code, ${defs}. If $${expr}$, how is ${at(letters, 0)} related to ${at(letters, 3)}?`,
      answer: walk.answer,
      distractors: relationDistractors(r, walk.answer, member(at(walk.path, 0)).male),
      explanation: `Decode each link: ${decode}. ${chainExplanation(walk, label)}`,
    };
  }),

  b.dynamic('family-member-count', { difficulty: 1, tags: ['family relations'] }, (r) => {
    const variant = r.int(0, 3);
    if (variant === 0) {
      const n = r.int(2, 6);
      const k = r.int(1, 4);
      const parent = randomPerson(r, true);
      const { answer, distractors } = numericOptions(r, {
        correct: n + k,
        wrong: [n + n * k, n * k, n + k + 1, n + k - 1],
        format: (v) => String(v),
      });
      return {
        stem: `Mr. ${parent.name} has ${n} sons, and each son has exactly ${k} ${k === 1 ? 'sister' : 'sisters'}. How many children does Mr. ${parent.name} have?`,
        answer,
        distractors,
        explanation: `All the sons share the same ${k === 1 ? 'sister' : 'sisters'}, so there are ${k} ${k === 1 ? 'daughter' : 'daughters'} in all (not ${n} × ${k}). Children $= ${n} + ${k} = ${n + k}$.`,
      };
    }
    const child = randomPerson(r);
    const bro = r.int(1, 5);
    const sis = r.int(1, 5);
    const sons = bro + (child.male ? 1 : 0);
    const daughters = sis + (child.male ? 0 : 1);
    const ask = variant === 1 ? 'sons' : variant === 2 ? 'daughters' : 'children';
    const correct = variant === 1 ? sons : variant === 2 ? daughters : sons + daughters;
    const wrong =
      variant === 1 ? [bro + (child.male ? 0 : 1), bro + sis, sons + 1] : variant === 2 ? [sis + (child.male ? 1 : 0), bro + sis, daughters + 1] : [bro + sis, bro + sis + 2, bro + sis + 3];
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: (v) => String(v) });
    const self = child.male ? `${child.name} is a boy, so he is one of the sons` : `${child.name} is a girl, so she is one of the daughters`;
    return {
      stem: `${child.name} has ${bro} ${bro === 1 ? 'brother' : 'brothers'} and ${sis} ${sis === 1 ? 'sister' : 'sisters'}. How many ${ask} do ${child.his} parents have?`,
      answer,
      distractors,
      explanation: `${self}. Sons $= ${child.male ? `${bro} + 1 = ${sons}` : bro}$ and daughters $= ${child.male ? sis : `${sis} + 1 = ${daughters}`}$${variant === 3 ? `, so children $= ${sons} + ${daughters} = ${sons + daughters}$` : ''}. The answer is ${correct}.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'mother-only-daughter', d: 1, o: 'past-paper', t: ['family relations'],
      q: 'Introducing a woman, Hina said, "Her mother is the only daughter of my mother." How is the woman related to Hina?',
      a: 'Daughter',
      x: ['Sister', 'Niece', 'Cousin'],
      e: "The only daughter of Hina's mother is Hina herself. So the woman's mother is Hina, and the woman is Hina's daughter.",
    },
    {
      id: 'setting-sun-left-hand', d: 1, t: ['direction sense'],
      q: 'In the evening, Faisal stands facing the setting Sun. In which direction does his left hand point?',
      a: 'South',
      x: ['North', 'East', 'West'],
      e: 'The Sun sets in the West, so Faisal faces West. For a person facing West, the left hand points South and the right hand points North.',
    },
    {
      id: 'father-in-law-only-son', d: 2, t: ['family relations'],
      q: 'Pointing to a boy, Sana said, "He is the son of the only son of my father-in-law." How is the boy related to Sana?',
      a: 'Son',
      x: ['Nephew', 'Brother-in-law', 'Grandson'],
      e: "The only son of Sana's father-in-law is Sana's husband. The son of her husband is Sana's son.",
    },
  ]),
]);
