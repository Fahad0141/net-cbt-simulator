/**
 * Mathematics - Sets, Functions and Groups (FSc Part I, chapter 2).
 *
 * Sets: roster and set-builder form, subsets and power sets, "is an element of" versus
 * "is a subset of", set operations and laws, counting with n(A u B) and three-set
 * inclusion-exclusion, Venn diagrams. Relations and functions: relations as subsets of A x B,
 * domain and range, inverse relations, one-one / onto / bijective functions. Binary operations
 * and groups: identity and inverse elements, operation (Cayley) tables, residue classes,
 * groupoid / semi-group / monoid / group. Logic: converse, inverse and contrapositive,
 * tautologies, contradictions, equivalences and quantifiers.
 *
 * Conventions
 * - N = {1, 2, 3, ...} as in the Punjab and Federal textbooks; the complement of A is A' and the
 *   negation of p is ~p.
 * - Correct by construction: set-algebra options are small expression trees evaluated on the
 *   regions of a Venn diagram, logical formulas are evaluated on their truth tables, statements
 *   with "in" and "subset of" are evaluated on actual nested sets and operation tables are
 *   computed from the group law. An option is marked correct only when the evaluation agrees, so
 *   no distractor can be secretly equivalent to the answer.
 * - Distractors come from typical slips: counting repeated elements, forgetting to subtract (or
 *   add back) an intersection, confusing domain with range, 2^(m+n) for 2^(mn), the converse
 *   for the contrapositive, the additive inverse for the multiplicative one, and so on.
 */
import { defineBank } from '@/engine/authoring';
import {
  divisors,
  frac,
  isPrime,
  listText,
  m$,
  num,
  numericOptions,
  paren,
  pickDistractors,
  polyTex,
  range,
  signed,
  tex,
} from '@/engine/helpers';
import type { Fraction } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** LaTeX roster of a finite set: `\{1, 2, 3\}`; no elements gives `\emptyset`. */
const setTex = (items: ReadonlyArray<string | number>): string =>
  items.length ? `\\{${items.join(', ')}\\}` : '\\emptyset';

/** An integer as an option: `$12$`. */
const intOption = (v: number): string => m$(num(v));

/** A Fraction (or integer) as an option: `$-\frac{3}{2}$`. */
const fracOption = (v: Fraction): string => m$(v.toTex());

/** Number of set bits of a small non-negative mask. */
function popcount(mask: number): number {
  let count = 0;
  for (let x = mask; x > 0; x >>= 1) count += x & 1;
  return count;
}

/** `count` distinct items; each draw is weighted by `weight`. */
function weightedSample<T>(r: Rng, items: readonly T[], weight: (item: T) => number, count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const chosen = r.weighted(pool, pool.map(weight));
    out.push(chosen);
    pool.splice(pool.indexOf(chosen), 1);
  }
  return out;
}

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Set algebra on two sets, evaluated on the four regions of a Venn diagram
// ---------------------------------------------------------------------------

type SetName = 'A' | 'B';
type Membership = Readonly<Record<SetName, boolean>>;

interface SetExpr {
  readonly tex: string;
  /** A set name or a complement: usable as an operand without brackets. */
  readonly simple: boolean;
  readonly has: (m: Membership) => boolean;
}

const setVar = (name: SetName): SetExpr => ({ tex: name, simple: true, has: (m) => m[name] });
const operand = (e: SetExpr): string => (e.simple ? e.tex : `(${e.tex})`);
const sComp = (e: SetExpr): SetExpr => ({ tex: `${operand(e)}'`, simple: true, has: (m) => !e.has(m) });
const sUnion = (x: SetExpr, y: SetExpr): SetExpr => ({
  tex: `${operand(x)} \\cup ${operand(y)}`,
  simple: false,
  has: (m) => x.has(m) || y.has(m),
});
const sInter = (x: SetExpr, y: SetExpr): SetExpr => ({
  tex: `${operand(x)} \\cap ${operand(y)}`,
  simple: false,
  has: (m) => x.has(m) && y.has(m),
});
const sDiff = (x: SetExpr, y: SetExpr): SetExpr => ({
  tex: `${operand(x)} - ${operand(y)}`,
  simple: false,
  has: (m) => x.has(m) && !y.has(m),
});

/** The four regions of a two-set Venn diagram; bit i of a mask stands for region i. */
const VENN_REGIONS = [
  { key: 'a', at: { A: true, B: false }, words: 'in $A$ only' },
  { key: 'b', at: { A: false, B: true }, words: 'in $B$ only' },
  { key: 'ab', at: { A: true, B: true }, words: 'in both $A$ and $B$' },
  { key: 'o', at: { A: false, B: false }, words: 'in neither $A$ nor $B$' },
] as const;

const vennMask = (e: SetExpr): number =>
  VENN_REGIONS.reduce((mask, region, i) => (e.has(region.at) ? mask | (1 << i) : mask), 0);

const SET_A = setVar('A');
const SET_B = setVar('B');

/** Expressions offered as options for shaded-region questions (several per region set). */
const VENN_EXPRESSIONS: readonly SetExpr[] = [
  sDiff(SET_A, SET_B),
  sInter(SET_A, sComp(SET_B)),
  sDiff(SET_B, SET_A),
  sInter(sComp(SET_A), SET_B),
  sUnion(sDiff(SET_A, SET_B), sDiff(SET_B, SET_A)),
  sDiff(sUnion(SET_A, SET_B), sInter(SET_A, SET_B)),
  sInter(SET_A, SET_B),
  sUnion(SET_A, SET_B),
  sComp(sUnion(SET_A, SET_B)),
  sInter(sComp(SET_A), sComp(SET_B)),
  sComp(sInter(SET_A, SET_B)),
  sUnion(sComp(SET_A), sComp(SET_B)),
  sComp(SET_A),
  sComp(SET_B),
  sUnion(SET_A, sComp(SET_B)),
  sUnion(sComp(SET_A), SET_B),
  sUnion(sInter(SET_A, SET_B), sComp(sUnion(SET_A, SET_B))),
  SET_A,
  SET_B,
];

// Circles of radius 55 centred at (105, 88) and (155, 88) cross at (130, 39.01) and (130, 136.99).
const VENN_PATHS: Readonly<Record<(typeof VENN_REGIONS)[number]['key'], string>> = {
  a: 'M130 39.01A55 55 0 1 0 130 136.99A55 55 0 0 1 130 39.01Z',
  b: 'M130 39.01A55 55 0 1 1 130 136.99A55 55 0 0 0 130 39.01Z',
  ab: 'M130 39.01A55 55 0 0 1 130 136.99A55 55 0 0 1 130 39.01Z',
  o: 'M10 10H250V160H10ZM130 39.01A55 55 0 1 0 130 136.99A55 55 0 1 0 130 39.01Z',
};

/** Two-set Venn diagram in a universal set with the regions of `mask` shaded. */
function vennFigure(mask: number): string {
  const shading = VENN_REGIONS.filter((_, i) => mask & (1 << i))
    .map((region) => `<path d="${VENN_PATHS[region.key]}" fill="#9cc3e8" fill-rule="evenodd"/>`)
    .join('');
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 170" width="260" height="170">' +
    shading +
    '<g fill="none" stroke="#000" stroke-width="1.5">' +
    '<rect x="10" y="10" width="240" height="150"/>' +
    '<circle cx="105" cy="88" r="55"/><circle cx="155" cy="88" r="55"/>' +
    '</g>' +
    '<g fill="#000" font-family="Times New Roman, serif" font-size="18" font-style="italic">' +
    '<text x="56" y="42">A</text><text x="192" y="42">B</text><text x="228" y="31">U</text>' +
    '</g></svg>'
  );
}

// ---------------------------------------------------------------------------
// Elements versus subsets: nested finite sets
// ---------------------------------------------------------------------------

/** An element of a set: a number or, recursively, a finite set. */
type Elem = number | readonly Elem[];

function sameElem(x: Elem, y: Elem): boolean {
  if (typeof x === 'number' || typeof y === 'number') return x === y;
  return x.every((e) => y.some((f) => sameElem(e, f))) && y.every((e) => x.some((f) => sameElem(e, f)));
}

const isElementOf = (x: Elem, s: readonly Elem[]): boolean => s.some((e) => sameElem(e, x));
const elemTex = (x: Elem): string => (typeof x === 'number' ? String(x) : setTex(x.map(elemTex)));

interface MembershipStatement {
  tex: string;
  truth: boolean;
  /** Why the statement is true or false (rich text, no final full stop). */
  why: string;
  /** The other reading (element versus subset) has the opposite truth value: a classic trap. */
  trap: boolean;
}

/** Every "x in A" and "x subset of A" statement about a fixed list of probe objects. */
function membershipStatements(set: readonly Elem[], a: number, b: number): MembershipStatement[] {
  const probes: Elem[] = [a, b, [], [a], [b], [a, b], [[a]], [[b]], [[a, b]], [[]], [a, [a, b]]];
  const out: MembershipStatement[] = [];
  for (const x of probes) {
    const xt = elemTex(x);
    const isEl = isElementOf(x, set);
    if (typeof x === 'number') {
      const singletonIsEl = isElementOf([x], set);
      out.push({
        tex: `${xt} \\in A`,
        truth: isEl,
        why: isEl
          ? `$${xt}$ is one of the listed elements of $A$`
          : `$${xt}$ is not one of the listed elements of $A$${singletonIsEl ? ` (the element is $\\{${xt}\\}$, not $${xt}$)` : ''}`,
        trap: isEl !== singletonIsEl,
      });
      continue;
    }
    const missing = x.find((e) => !isElementOf(e, set));
    const isSub = missing === undefined;
    out.push({
      tex: `${xt} \\in A`,
      truth: isEl,
      why: isEl
        ? `$${xt}$ is one of the listed elements of $A$`
        : `$${xt}$ is not one of the listed elements of $A$${isSub ? ' (it is only a subset of $A$)' : ''}`,
      trap: isEl !== isSub,
    });
    out.push({
      tex: `${xt} \\subseteq A`,
      truth: isSub,
      why:
        missing === undefined
          ? x.length === 0
            ? '$\\emptyset$ is a subset of every set'
            : `every element of $${xt}$ is an element of $A$`
          : `$${elemTex(missing)}$ belongs to $${xt}$ but is not an element of $A$${isEl ? ` ($${xt}$ is an element of $A$, not a subset of it)` : ''}`,
      trap: isEl !== isSub,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Propositional logic in p and q, evaluated on truth tables
// ---------------------------------------------------------------------------

type PropVar = 'p' | 'q';
type Valuation = Readonly<Record<PropVar, boolean>>;

interface Prop {
  readonly tex: string;
  /** A variable or a negation: usable as an operand without brackets. */
  readonly simple: boolean;
  readonly value: (v: Valuation) => boolean;
}

const propVar = (name: PropVar): Prop => ({ tex: name, simple: true, value: (v) => v[name] });
/** Round brackets around a compound operand, square ones if it already contains brackets. */
const wrapProp = (x: Prop): string => (x.simple ? x.tex : x.tex.includes('(') ? `[${x.tex}]` : `(${x.tex})`);
const lNot = (x: Prop): Prop => ({ tex: `\\mathord{\\sim}${wrapProp(x)}`, simple: true, value: (v) => !x.value(v) });
const binary =
  (symbol: string, fn: (x: boolean, y: boolean) => boolean) =>
  (x: Prop, y: Prop): Prop => ({
    tex: `${wrapProp(x)} ${symbol} ${wrapProp(y)}`,
    simple: false,
    value: (v) => fn(x.value(v), y.value(v)),
  });
const lAnd = binary('\\wedge', (x, y) => x && y);
const lOr = binary('\\vee', (x, y) => x || y);
const lImp = binary('\\rightarrow', (x, y) => !x || y);
const lIff = binary('\\leftrightarrow', (x, y) => x === y);

/** Truth-table rows in textbook order: TT, TF, FT, FF. */
const TT_ROWS: readonly Valuation[] = [
  { p: true, q: true },
  { p: true, q: false },
  { p: false, q: true },
  { p: false, q: false },
];
const truthMask = (f: Prop): number => TT_ROWS.reduce((mask, v, i) => (f.value(v) ? mask | (1 << i) : mask), 0);
const truthColumn = (f: Prop): string => TT_ROWS.map((v) => (f.value(v) ? 'T' : 'F')).join(', ');
const rowText = (v: Valuation): string =>
  `$p$ is ${v.p ? 'true' : 'false'} and $q$ is ${v.q ? 'true' : 'false'}`;

const P = propVar('p');
const Q = propVar('q');

/** Formulas in p and q; each is classified by its truth table when a question is built. */
const LOGIC_POOL: readonly Prop[] = [
  lOr(P, lNot(P)),
  lAnd(P, lNot(P)),
  lImp(P, P),
  lImp(P, Q),
  lImp(Q, P),
  lAnd(P, Q),
  lOr(P, Q),
  lImp(lAnd(P, Q), P),
  lImp(P, lOr(P, Q)),
  lImp(lAnd(P, Q), lOr(P, Q)),
  lNot(lAnd(P, lNot(P))),
  lNot(lOr(P, lNot(P))),
  lIff(lImp(P, Q), lImp(lNot(Q), lNot(P))),
  lIff(P, lNot(P)),
  lImp(lOr(P, Q), P),
  lImp(P, lAnd(P, Q)),
  lAnd(lAnd(P, Q), lNot(Q)),
  lAnd(lNot(P), lAnd(P, Q)),
  lIff(P, Q),
  lImp(lAnd(lImp(P, Q), P), Q),
  lImp(lAnd(lImp(P, Q), lNot(Q)), lNot(P)),
  lAnd(lNot(lImp(P, Q)), Q),
  lOr(lImp(P, Q), lImp(Q, P)),
  lIff(lNot(lAnd(P, Q)), lOr(lNot(P), lNot(Q))),
  lOr(lNot(P), Q),
  lAnd(P, lNot(Q)),
  lAnd(lNot(P), lNot(Q)),
  lNot(lAnd(P, Q)),
  lNot(lOr(P, Q)),
  lImp(lNot(P), Q),
  lImp(P, lNot(Q)),
  lIff(lNot(P), Q),
  lImp(lNot(Q), lNot(P)),
  lAnd(lNot(P), Q),
  lOr(P, lNot(Q)),
];

/** Equivalence questions: every `answers` entry must match the target's truth table, no `traps` entry may. */
const EQUIVALENCES: ReadonlyArray<{ target: Prop; answers: readonly Prop[]; traps: readonly Prop[]; law: string }> = [
  {
    target: lImp(P, Q),
    answers: [lImp(lNot(Q), lNot(P)), lOr(lNot(P), Q)],
    traps: [lImp(Q, P), lImp(lNot(P), lNot(Q)), lAnd(P, lNot(Q)), lOr(P, lNot(Q))],
    law: 'a conditional is equivalent to its contrapositive and to $\\mathord{\\sim}p \\vee q$',
  },
  {
    target: lNot(lAnd(P, Q)),
    answers: [lOr(lNot(P), lNot(Q)), lImp(P, lNot(Q))],
    traps: [lAnd(lNot(P), lNot(Q)), lOr(lNot(P), Q), lAnd(lNot(P), Q), lAnd(P, lNot(Q))],
    law: "De Morgan's law",
  },
  {
    target: lNot(lOr(P, Q)),
    answers: [lAnd(lNot(P), lNot(Q))],
    traps: [lOr(lNot(P), lNot(Q)), lAnd(lNot(P), Q), lOr(lNot(P), Q), lImp(P, lNot(Q))],
    law: "De Morgan's law",
  },
  {
    target: lNot(lImp(P, Q)),
    answers: [lAnd(P, lNot(Q))],
    traps: [lImp(lNot(P), lNot(Q)), lImp(Q, P), lAnd(lNot(P), Q), lOr(lNot(P), Q)],
    law: 'the negation of $p \\rightarrow q$ is $p \\wedge \\mathord{\\sim}q$',
  },
  {
    target: lIff(P, Q),
    answers: [lAnd(lImp(P, Q), lImp(Q, P)), lIff(lNot(P), lNot(Q))],
    traps: [lOr(lImp(P, Q), lImp(Q, P)), lAnd(P, Q), lImp(P, Q), lIff(P, lNot(Q))],
    law: 'a biconditional is a conditional both ways',
  },
  {
    target: lImp(lNot(P), Q),
    answers: [lOr(P, Q)],
    traps: [lAnd(P, Q), lOr(lNot(P), Q), lAnd(lNot(P), Q), lImp(P, lNot(Q))],
    law: '$\\mathord{\\sim}p \\rightarrow q$ is false only when $p$ and $q$ are both false',
  },
];

// ---------------------------------------------------------------------------
// Data for word problems and the function catalogue
// ---------------------------------------------------------------------------

/** Words with repeated letters: as a set, each letter is listed once. */
const WORDS = [
  'MISSISSIPPI', 'ASSASSINATION', 'BOOKKEEPER', 'COMMITTEE', 'PAKISTAN', 'ISLAMABAD', 'BANANA',
  'MATHEMATICS', 'ENGINEERING', 'STATISTICS', 'SUCCESS', 'ADDRESS', 'BALLOON', 'REFERENCE',
  'PARALLEL', 'ALGEBRA', 'CALCULUS', 'PEPPER', 'RAWALPINDI', 'PESHAWAR', 'APPLE', 'COFFEE',
  'TOMATO', 'ACCESS', 'ATTITUDE',
] as const;

interface DescribedSet {
  /** Defines A inside the stem: "If <def>, then ...". */
  def: string;
  /** LaTeX roster of A. */
  roster: string;
  n: number;
  /** n(A) as miscounted by the classic slip for this description. */
  slip: number;
  /** Start of the explanation, ending in "so " (points out the trap). */
  lead: string;
}

const DESCRIBED_SETS: ReadonlyArray<(r: Rng) => DescribedSet> = [
  (r) => {
    const word = r.pick(WORDS);
    const letters = [...new Set(word)];
    return {
      def: `$A$ is the set of letters of the word ${word}`,
      roster: tex`\{\text{${letters.join(', ')}}\}`,
      n: letters.length,
      slip: word.length,
      lead: 'A set lists each element only once (a repeated letter counts once), so ',
    };
  },
  (r) => {
    const bound = r.pick([10, 12, 14, 18, 20]);
    const primes = range(2, bound - 1).filter(isPrime);
    return {
      def: tex`$A = \{x : x \text{ is a prime number less than } ${bound}\}$`,
      roster: setTex(primes),
      n: primes.length,
      slip: primes.length + 1,
      lead: '$1$ is not a prime number, so ',
    };
  },
  (r) => {
    const k = r.pick([10, 12, 16, 18, 20, 24, 28, 30]);
    const ds = divisors(k);
    return {
      def: tex`$A = \{x \in \mathbb{N} : x \text{ is a divisor of } ${k}\}$`,
      roster: setTex(ds),
      n: ds.length,
      slip: ds.length - 2,
      lead: tex`The divisors of $${k}$ include $1$ and $${k}$ itself, so `,
    };
  },
  (r) => {
    const n = r.int(3, 7);
    const lo = r.int(-4, 2);
    const strictLo = r.chance(0.5);
    const strictHi = r.chance(0.5);
    const first = strictLo ? lo + 1 : lo;
    const last = first + n - 1;
    const hi = strictHi ? last + 1 : last;
    const strict = Number(strictLo) + Number(strictHi);
    return {
      def: tex`$A = \{x \in \mathbb{Z} : ${lo} ${strictLo ? '<' : '\\le'} x ${strictHi ? '<' : '\\le'} ${hi}\}$`,
      roster: setTex(range(first, last)),
      n,
      slip: strict > 0 ? n + strict : n - 1,
      lead: strict > 0 ? 'A strict inequality excludes its end point, so ' : 'Both end points are included, so ',
    };
  },
];

const SURVEY_PAIRS = [
  { place: 'class', who: 'students', verb: 'study', verbs: 'studies', a: 'Physics', b: 'Chemistry' },
  { place: 'class', who: 'students', verb: 'study', verbs: 'studies', a: 'Mathematics', b: 'Computer Science' },
  { place: 'group', who: 'students', verb: 'play', verbs: 'plays', a: 'cricket', b: 'hockey' },
  { place: 'survey', who: 'people', verb: 'drink', verbs: 'drinks', a: 'tea', b: 'coffee' },
  { place: 'group', who: 'people', verb: 'speak', verbs: 'speaks', a: 'Urdu', b: 'English' },
] as const;

const SURVEY_TRIPLES = [
  { who: 'students', verb: 'study', what: 'subjects', names: ['Mathematics', 'Physics', 'Chemistry'], sym: ['M', 'P', 'C'] },
  { who: 'students', verb: 'play', what: 'games', names: ['cricket', 'hockey', 'football'], sym: ['C', 'H', 'F'] },
  { who: 'people', verb: 'drink', what: 'beverages', names: ['tea', 'coffee', 'milk'], sym: ['T', 'C', 'M'] },
  { who: 'students', verb: 'learn', what: 'languages', names: ['Arabic', 'French', 'Chinese'], sym: ['A', 'F', 'C'] },
] as const;

type MapKind = 'bijective' | 'injective' | 'surjective' | 'neither';

const MAP_LABEL: Readonly<Record<MapKind, string>> = {
  bijective: 'one-one and onto',
  injective: 'one-one but not onto',
  surjective: 'onto but not one-one',
  neither: 'neither one-one nor onto',
};

interface MapCase {
  /** Complete stem. */
  stem: string;
  /** Reasons for the one-one and onto verdicts. */
  why: string;
}

const REALS = '\\mathbb{R}';
const INTS = '\\mathbb{Z}';
const NATS = '\\mathbb{N}';

/** Stem for a function given by a formula. */
const formulaStem = (domain: string, codomain: string, rule: string, v = 'x'): string =>
  `The function $f: ${domain} \\to ${codomain}$ defined by $f(${v}) = ${rule}$ is:`;

/** A function between small finite sets, built to have the requested kind and checked. */
function finiteMap(r: Rng, kind: MapKind): MapCase {
  const sizes: Record<MapKind, readonly [number, number]> = {
    bijective: [3, 3],
    injective: [2, 3],
    surjective: [3, 2],
    neither: [3, 3],
  };
  const [na, nb] = sizes[kind];
  const domain = range(1, na);
  const codomain = ['a', 'b', 'c'].slice(0, nb);
  let images: string[];
  if (kind === 'bijective') images = r.shuffle(codomain);
  else if (kind === 'injective') images = r.sample(codomain, 2);
  else if (kind === 'surjective') images = r.shuffle([...codomain, r.pick(codomain)]);
  else {
    const [u, w] = r.sample(codomain, 2);
    images = r.shuffle([u as string, u as string, w as string]);
  }
  const oneOne = new Set(images).size === images.length;
  const missing = codomain.find((c) => !images.includes(c));
  const actual: MapKind = oneOne ? (missing ? 'injective' : 'bijective') : missing ? 'neither' : 'surjective';
  if (actual !== kind) throw new Error(`finiteMap: built ${actual}, wanted ${kind}`);
  const pairs = domain.map((x, i) => `(${x}, ${images[i]})`);
  let oneOneWhy = `the images ${listText(images.map((y) => `$${y}$`))} are ${images.length > 2 ? 'all ' : ''}different, so $f$ is one-one`;
  if (!oneOne) {
    const i = images.findIndex((y, k) => images.indexOf(y) !== k);
    const j = images.indexOf(images[i] as string);
    oneOneWhy = `$f(${domain[j]}) = f(${domain[i]}) = ${images[i]}$, so $f$ is not one-one`;
  }
  const ontoWhy = missing
    ? `$${missing}$ is not the image of any element, so $f$ is not onto`
    : 'every element of $B$ is an image, so $f$ is onto';
  return {
    stem: tex`Let $A = ${setTex(domain)}$ and $B = ${setTex(codomain)}$. The function $f: A \to B$ given by $f = ${setTex(pairs)}$ is:`,
    why: `${capitalize(oneOneWhy)}; ${ontoWhy}.`,
  };
}

const MAP_CASES: Readonly<Record<MapKind, ReadonlyArray<(r: Rng) => MapCase>>> = {
  bijective: [
    (r) => {
      const a = r.pick([-7, -5, -4, -3, -2, 2, 3, 4, 5, 7]);
      const c = r.nonZero(-9, 9);
      return {
        stem: formulaStem(REALS, REALS, polyTex([a, c])),
        why: tex`If $f(x_1) = f(x_2)$, then $${a}x_1 ${signed(c)} = ${a}x_2 ${signed(c)}$, so $x_1 = x_2$: $f$ is one-one. Every $y \in \mathbb{R}$ is the image of $x = \frac{y ${signed(-c)}}{${a}}$, so $f$ is onto.`,
      };
    },
    (r) => {
      const c = r.int(-9, 9);
      return {
        stem: formulaStem(REALS, REALS, polyTex([1, 0, 0, c])),
        why: tex`$x^3$ is strictly increasing, so different inputs give different outputs (one-one), and every real $y$ is the image of $x = \sqrt[3]{y${c === 0 ? '' : signed(-c)}}$ (onto).`,
      };
    },
    () => ({
      stem: formulaStem('[0, \\infty)', '[0, \\infty)', 'x^{2}'),
      why: tex`For $x_1, x_2 \ge 0$, $x_1^2 = x_2^2$ gives $x_1 = x_2$ (one-one), and every $y \ge 0$ equals $(\sqrt{y})^2$ (onto).`,
    }),
    () => ({
      stem: formulaStem('\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]', '[-1, 1]', '\\sin x'),
      why: tex`On $\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]$, $\sin x$ increases steadily from $-1$ to $1$, so it is one-one and takes every value in $[-1, 1]$ (onto).`,
    }),
    (r) => {
      const k = r.nonZero(-9, 9);
      return {
        stem: formulaStem(INTS, INTS, `n ${signed(k)}`.replace('n  ', 'n '), 'n'),
        why: tex`$n_1 ${signed(k)} = n_2 ${signed(k)}$ gives $n_1 = n_2$ (one-one), and every integer $m$ is the image of $m ${signed(-k)}$ (onto).`,
      };
    },
    (r) => {
      const base = r.pick([2, 3, 5]);
      return {
        stem: formulaStem(REALS, '(0, \\infty)', `${base}^{x}`),
        why: tex`$${base}^x$ is strictly increasing (one-one), and every $y > 0$ equals $${base}^{\log_{${base}} y}$ (onto).`,
      };
    },
    (r) => finiteMap(r, 'bijective'),
  ],
  injective: [
    () => ({
      stem: formulaStem('[0, \\infty)', REALS, 'x^{2}'),
      why: tex`For $x_1, x_2 \ge 0$, $x_1^2 = x_2^2$ gives $x_1 = x_2$ (one-one), but a negative number such as $-1$ is never a value of $x^2$ (not onto).`,
    }),
    (r) => {
      const base = r.pick([2, 3, 5]);
      return {
        stem: formulaStem(REALS, REALS, `${base}^{x}`),
        why: tex`$${base}^x$ is strictly increasing (one-one), but $${base}^x > 0$, so $0$ and the negative numbers have no pre-image (not onto).`,
      };
    },
    (r) => {
      const k = r.pick([2, 3]);
      return {
        stem: formulaStem(NATS, NATS, `${k}n`, 'n'),
        why: tex`$${k}n_1 = ${k}n_2$ gives $n_1 = n_2$ (one-one), but $1$ is not of the form $${k}n$ with $n \in \mathbb{N}$, so it has no pre-image (not onto).`,
      };
    },
    (r) => {
      const k = r.int(1, 5);
      return {
        stem: formulaStem(NATS, NATS, `n + ${k}`, 'n'),
        why: tex`$n_1 + ${k} = n_2 + ${k}$ gives $n_1 = n_2$ (one-one), but $n + ${k} \ge ${k + 1}$, so $1$ has no pre-image (not onto).`,
      };
    },
    (r) => {
      const k = r.pick([2, 3, 4, 5]);
      return {
        stem: formulaStem(INTS, INTS, `${k}n`, 'n'),
        why: tex`$${k}n_1 = ${k}n_2$ gives $n_1 = n_2$ (one-one), but $1$ is not a multiple of $${k}$, so it has no pre-image (not onto).`,
      };
    },
    () => ({
      stem: formulaStem(NATS, NATS, 'n^{2}', 'n'),
      why: tex`For natural numbers, $n_1^2 = n_2^2$ gives $n_1 = n_2$ (one-one), but $2$ is not a perfect square, so it has no pre-image (not onto).`,
    }),
    (r) => finiteMap(r, 'injective'),
  ],
  surjective: [
    (r) => {
      const c = r.int(-5, 5);
      return {
        stem: formulaStem(REALS, `[${c}, \\infty)`, polyTex([1, 0, c])),
        why: tex`$f(-1) = f(1)$, so $f$ is not one-one; every $y \ge ${c}$ is the image of $x = \sqrt{y${c === 0 ? '' : signed(-c)}}$, so $f$ is onto.`,
      };
    },
    () => ({
      stem: formulaStem(REALS, '[0, \\infty)', '|x|'),
      why: tex`$|-1| = |1|$, so $f$ is not one-one; every $y \ge 0$ equals $|y|$, so $f$ is onto.`,
    }),
    (r) => {
      const fn = r.pick(['\\sin', '\\cos']);
      const twin = fn === '\\sin' ? '0 = \\sin \\pi' : '0 = \\cos 2\\pi';
      return {
        stem: formulaStem(REALS, '[-1, 1]', `${fn} x`),
        why: tex`$${fn} ${twin}$, so $f$ is not one-one; $${fn} x$ takes every value in $[-1, 1]$, so $f$ is onto.`,
      };
    },
    (r) => {
      const h = r.nonZero(-4, 4);
      return {
        stem: formulaStem(REALS, '[0, \\infty)', `(x ${signed(-h)})^{2}`),
        why: tex`$f(${h - 1}) = f(${h + 1}) = 1$, so $f$ is not one-one; every $y \ge 0$ is the image of $x = ${h} + \sqrt{y}$, so $f$ is onto.`,
      };
    },
    (r) => finiteMap(r, 'surjective'),
  ],
  neither: [
    (r) => {
      const c = r.int(-5, 5);
      return {
        stem: formulaStem(REALS, REALS, polyTex([1, 0, c])),
        why: tex`$f(-1) = f(1)$, so $f$ is not one-one; $f(x) \ge ${c}$ for every $x$, so the values below $${c}$ have no pre-image (not onto).`,
      };
    },
    () => ({
      stem: formulaStem(REALS, REALS, '|x|'),
      why: tex`$|-1| = |1|$, so $f$ is not one-one; $|x| \ge 0$, so negative numbers have no pre-image (not onto).`,
    }),
    (r) => {
      const fn = r.pick(['\\sin', '\\cos']);
      const twin = fn === '\\sin' ? '\\sin 0 = \\sin \\pi' : '\\cos 0 = \\cos 2\\pi';
      return {
        stem: formulaStem(REALS, REALS, `${fn} x`),
        why: tex`$${twin}$, so $f$ is not one-one; $|${fn} x| \le 1$, so $2$ has no pre-image (not onto).`,
      };
    },
    () => ({
      stem: formulaStem(INTS, INTS, 'n^{2}', 'n'),
      why: tex`$(-1)^2 = 1^2$, so $f$ is not one-one; $2$ is not a perfect square, so it has no pre-image (not onto).`,
    }),
    (r) => {
      const c = r.int(-9, 9);
      return {
        stem: formulaStem(REALS, REALS, String(c)),
        why: tex`$f(0) = f(1) = ${c}$, so $f$ is not one-one; $${c}$ is its only value, so $f$ is not onto.`,
      };
    },
    (r) => finiteMap(r, 'neither'),
  ],
};

// ---------------------------------------------------------------------------
// Finite groups for operation tables
// ---------------------------------------------------------------------------

interface FiniteGroup {
  order: number;
  op: (x: number, y: number) => number;
  inv: (x: number) => number;
}

const cyclicGroup = (n: number): FiniteGroup => ({ order: n, op: (x, y) => (x + y) % n, inv: (x) => (n - x) % n });
const KLEIN_GROUP: FiniteGroup = { order: 4, op: (x, y) => x ^ y, inv: (x) => x };

const TABLE_LABELS: Readonly<Record<4 | 5, ReadonlyArray<readonly string[]>>> = {
  4: [
    ['a', 'b', 'c', 'd'],
    ['p', 'q', 'r', 's'],
    ['k', 'l', 'm', 'n'],
  ],
  5: [
    ['p', 'q', 'r', 's', 't'],
    ['a', 'b', 'c', 'd', 'f'],
  ],
};

/** Multiplicative inverse of x modulo a prime p (by search; p is small). */
const inverseMod = (x: number, p: number): number => range(1, p - 1).find((y) => (x * y) % p === 1) as number;

// ---------------------------------------------------------------------------
// Conditionals for converse / inverse / contrapositive
// ---------------------------------------------------------------------------

const CONDITIONALS = [
  { subj: 'a triangle', p: 'is equilateral', q: 'is isosceles', np: 'is not equilateral', nq: 'is not isosceles' },
  { subj: 'a number', p: 'is divisible by 6', q: 'is divisible by 3', np: 'is not divisible by 6', nq: 'is not divisible by 3' },
  { subj: 'a quadrilateral', p: 'is a square', q: 'is a rectangle', np: 'is not a square', nq: 'is not a rectangle' },
  { subj: 'an integer', p: 'is a multiple of 4', q: 'is even', np: 'is not a multiple of 4', nq: 'is not even' },
  { subj: 'a function', p: 'is bijective', q: 'is one-one', np: 'is not bijective', nq: 'is not one-one' },
  { subj: 'a prime number', p: 'is greater than 2', q: 'is odd', np: 'is not greater than 2', nq: 'is not odd' },
  { subj: 'a quadrilateral', p: 'is a rhombus', q: 'has perpendicular diagonals', np: 'is not a rhombus', nq: 'does not have perpendicular diagonals' },
  { subj: 'a real number', p: 'is an integer', q: 'is rational', np: 'is not an integer', nq: 'is not rational' },
  { subj: 'a square matrix', p: 'has two identical rows', q: 'is singular', np: 'does not have two identical rows', nq: 'is not singular' },
] as const;

/** A literal: a propositional variable or its negation. */
interface Literal {
  name: string;
  neg: boolean;
}
const litTex = (l: Literal): string => (l.neg ? `\\mathord{\\sim}${l.name}` : l.name);
const flip = (l: Literal): Literal => ({ name: l.name, neg: !l.neg });
const condTex = (x: Literal, y: Literal): string => `${litTex(x)} \\rightarrow ${litTex(y)}`;

// ---------------------------------------------------------------------------
// The chapter
// ---------------------------------------------------------------------------

export default defineBank('mathematics', 'sets-functions-groups', (b) => [
  // ----- Set operations -------------------------------------------------------
  b.dynamic('subsets-of-described-set', { difficulty: 1, origin: 'past-paper', tags: ['set operations'] }, (r) => {
    const set = r.weighted(DESCRIBED_SETS, [3, 1, 1, 1])(r);
    const ask = r.weighted(['subsets', 'power-set', 'proper'] as const, [2, 2, 1]);
    const { n } = set;
    const all = 2 ** n;
    const correct = ask === 'proper' ? all - 1 : all;
    // 2^n - 2 is deliberately not offered for proper subsets: books that also call the empty set
    // "improper" make it arguably correct.
    const wrong =
      ask === 'proper'
        ? [2 ** set.slip - 1, all, ...r.shuffle([2 ** (n - 1), 2 * n, n * n])].filter((v) => v !== all - 2)
        : [2 ** set.slip, all - 1, ...r.shuffle([2 * n, n * n, 2 ** (n + 1), 2 ** (n - 1)])];
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: intOption });
    const asked = {
      subsets: 'the number of subsets of $A$',
      'power-set': 'the number of elements in the power set $P(A)$',
      proper: 'the number of proper subsets of $A$',
    }[ask];
    const count = {
      subsets: tex`A set with $n$ elements has $2^{n}$ subsets, so $A$ has $2^{${n}} = ${all}$ subsets.`,
      'power-set': tex`$P(A)$ is the set of all subsets of $A$, so $n(P(A)) = 2^{n(A)} = 2^{${n}} = ${all}$.`,
      proper: tex`Every subset except $A$ itself is a proper subset (including $\emptyset$), so the number of proper subsets is $2^{${n}} - 1 = ${all - 1}$.`,
    }[ask];
    return {
      stem: `If ${set.def}, then ${asked} is:`,
      answer,
      distractors,
      explanation: `${set.lead}$A = ${set.roster}$ and $n(A) = ${n}$. ${count}`,
    };
  }),

  b.dynamic('two-set-cardinality', { difficulty: 2, origin: 'past-paper', tags: ['set operations', 'Venn diagrams'] }, (r) => {
    const onlyA = r.int(4, 30);
    const onlyB = r.int(4, 30);
    const both = r.int(2, 15);
    const none = r.int(3, 20);
    const nA = onlyA + both;
    const nB = onlyB + both;
    const union = nA + nB - both;
    const total = union + none;
    const unionWork = tex`n(A \cup B) = n(A) + n(B) - n(A \cap B) = ${nA} + ${nB} - ${both} = ${union}`;

    if (r.chance(0.5)) {
      // Symbolic data, as in the textbook exercises.
      const target = r.pick(['union', 'difference', 'outside', 'not-both'] as const);
      let lhs: string;
      let correct: number;
      let wrong: number[];
      let work: string;
      if (target === 'union') {
        lhs = tex`A \cup B`;
        correct = union;
        wrong = [nA + nB, nA + nB - 2 * both, nA + nB + both];
        work = `$${unionWork}$.`;
      } else if (target === 'difference') {
        lhs = r.pick(['A - B', "A \\cap B'"]);
        correct = onlyA;
        wrong = [nA, onlyB, nA - nB, union, both];
        work = tex`$n(${lhs}) = n(A) - n(A \cap B) = ${nA} - ${both} = ${onlyA}$.`;
      } else if (target === 'outside') {
        lhs = r.pick(["(A \\cup B)'", "A' \\cap B'"]);
        correct = none;
        wrong = [total - nA - nB, union, total - both, none + both];
        work =
          (lhs.startsWith('(') ? '' : tex`By De Morgan's law $A' \cap B' = (A \cup B)'$. `) +
          tex`$${unionWork}$, so $n(${lhs}) = n(U) - n(A \cup B) = ${total} - ${union} = ${none}$.`;
      } else {
        lhs = r.pick(["(A \\cap B)'", "A' \\cup B'"]);
        correct = total - both;
        wrong = [none, 2 * total - nA - nB, union, both];
        work =
          (lhs.startsWith('(') ? '' : tex`By De Morgan's law $A' \cup B' = (A \cap B)'$. `) +
          tex`$n(${lhs}) = n(U) - n(A \cap B) = ${total} - ${both} = ${total - both}$.`;
      }
      const universe = target === 'outside' || target === 'not-both' ? `$n(U) = ${total}$, ` : '';
      const { answer, distractors } = numericOptions(r, { correct, wrong, format: intOption });
      return {
        stem: tex`If ${universe}$n(A) = ${nA}$, $n(B) = ${nB}$ and $n(A \cap B) = ${both}$, then $n(${lhs})$ is equal to:`,
        answer,
        distractors,
        explanation: work,
      };
    }

    // Survey word problem.
    const s = r.pick(SURVEY_PAIRS);
    const ask = r.pick(['neither', 'only', 'exactly-one', 'both'] as const);
    const setup = `Let $A$ and $B$ be the sets of ${s.who} who ${s.verb} ${s.a} and ${s.b} respectively. `;
    const facts = `In a ${s.place} of ${total} ${s.who}, ${nA} ${s.verb} ${s.a}, ${nB} ${s.verb} ${s.b} and ${both} ${s.verb} both.`;
    let stem: string;
    let correct: number;
    let wrong: number[];
    let work: string;
    if (ask === 'neither') {
      stem = `${facts} How many ${s.who} ${s.verb} neither ${s.a} nor ${s.b}?`;
      correct = none;
      wrong = [total - nA - nB, union, none + both, both];
      work = tex`$${unionWork}$ ${s.verb} at least one of them, so $${total} - ${union} = ${none}$ ${s.verb} neither.`;
    } else if (ask === 'only') {
      stem = `${facts} How many ${s.who} ${s.verb} ${s.a} only?`;
      correct = onlyA;
      wrong = [nA, onlyB, onlyA + onlyB, both];
      work = tex`The ${both} who ${s.verb} both are included in $n(A) = ${nA}$, so ${s.a} only $= n(A) - n(A \cap B) = ${nA} - ${both} = ${onlyA}$.`;
    } else if (ask === 'exactly-one') {
      stem = `${facts} How many ${s.who} ${s.verb} exactly one of ${s.a} and ${s.b}?`;
      correct = onlyA + onlyB;
      wrong = [union, nA + nB, total - both, onlyA];
      work = tex`Exactly one $= [n(A) - n(A \cap B)] + [n(B) - n(A \cap B)] = (${nA} - ${both}) + (${nB} - ${both}) = ${onlyA + onlyB}$.`;
    } else {
      stem = `In a ${s.place} of ${union} ${s.who}, each ${s.verbs} ${s.a} or ${s.b} or both. If ${nA} ${s.verb} ${s.a} and ${nB} ${s.verb} ${s.b}, how many ${s.verb} both?`;
      correct = both;
      wrong = [union - nA, union - nB, Math.abs(nA - nB), onlyA + onlyB];
      work = tex`Here $n(A \cup B) = ${union}$, so $n(A \cap B) = n(A) + n(B) - n(A \cup B) = ${nA} + ${nB} - ${union} = ${both}$.`;
    }
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: intOption });
    return { stem, answer, distractors, explanation: setup + work };
  }),

  b.dynamic('three-set-survey', { difficulty: 3, tags: ['Venn diagrams', 'set operations'] }, (r) => {
    const ctx = r.pick(SURVEY_TRIPLES);
    const [X, Y, Z] = ctx.sym;
    const [xName] = ctx.names;
    // Sizes of the eight regions: exactly one set, exactly two sets, all three, none.
    const o1 = r.int(4, 20);
    const o2 = r.int(4, 20);
    const o3 = r.int(4, 20);
    const pXY = r.int(2, 10);
    const pXZ = r.int(2, 10);
    const pYZ = r.int(2, 10);
    const all = r.int(1, 8);
    const none = r.int(2, 15);
    const nX = o1 + pXY + pXZ + all;
    const nY = o2 + pXY + pYZ + all;
    const nZ = o3 + pXZ + pYZ + all;
    const nXY = pXY + all;
    const nXZ = pXZ + all;
    const nYZ = pYZ + all;
    const total = o1 + o2 + o3 + pXY + pXZ + pYZ + all + none;
    const s1 = nX + nY + nZ;
    const s2 = nXY + nXZ + nYZ;
    const union = s1 - s2 + all;
    const exactlyOne = o1 + o2 + o3;
    const exactlyTwo = pXY + pXZ + pYZ;

    const ask = r.pick(['none', 'exactly-one', 'at-least-two', 'only-first'] as const);
    const question = {
      none: `How many ${ctx.who} ${ctx.verb} none of the three ${ctx.what}?`,
      'exactly-one': `How many ${ctx.who} ${ctx.verb} exactly one of the three ${ctx.what}?`,
      'at-least-two': `How many ${ctx.who} ${ctx.verb} at least two of the three ${ctx.what}?`,
      'only-first': `How many ${ctx.who} ${ctx.verb} ${xName} only?`,
    }[ask];
    const onlyWork = (s: string, n: number, i: number, j: number, o: number): string =>
      `${s}: $${n} - ${i} - ${j} + ${all} = ${o}$`;
    let correct: number;
    let wrong: number[];
    let work: string;
    if (ask === 'none') {
      correct = none;
      wrong = [none + all, union, none + 2 * all, none - all];
      work = tex`$n(${X} \cup ${Y} \cup ${Z}) = (${nX} + ${nY} + ${nZ}) - (${nXY} + ${nXZ} + ${nYZ}) + ${all} = ${s1} - ${s2} + ${all} = ${union}$, so $${total} - ${union} = ${none}$ ${ctx.verb} none of them.`;
    } else if (ask === 'exactly-one') {
      correct = exactlyOne;
      wrong = [exactlyOne - 3 * all, union, exactlyOne - 2 * all, exactlyTwo];
      work = tex`Only one set (each pairwise count already contains the ${all} in all three, so they are added back): ${onlyWork(`only $${X}$`, nX, nXY, nXZ, o1)}, ${onlyWork(`only $${Y}$`, nY, nXY, nYZ, o2)}, ${onlyWork(`only $${Z}$`, nZ, nXZ, nYZ, o3)}. Exactly one $= ${o1} + ${o2} + ${o3} = ${exactlyOne}$.`;
    } else if (ask === 'at-least-two') {
      correct = exactlyTwo + all;
      wrong = [s2, exactlyTwo, s2 - all, exactlyOne];
      work = tex`Exactly two $= (${nXY} - ${all}) + (${nXZ} - ${all}) + (${nYZ} - ${all}) = ${exactlyTwo}$ and all three $= ${all}$, so at least two $= ${exactlyTwo} + ${all} = ${exactlyTwo + all}$.`;
    } else {
      correct = o1;
      wrong = [o1 - all, o1 + all, nX - nXY, nX - all];
      work = tex`${xName} only $= n(${X}) - n(${X} \cap ${Y}) - n(${X} \cap ${Z}) + n(${X} \cap ${Y} \cap ${Z}) = ${nX} - ${nXY} - ${nXZ} + ${all} = ${o1}$ (the ${all} in all three are subtracted twice, so they are added back once).`;
    }
    const { answer, distractors } = numericOptions(r, { correct, wrong, format: intOption });
    return {
      stem: [
        `In a survey of ${total} ${ctx.who}, $${X}$, $${Y}$ and $${Z}$ are the sets of ${ctx.who} who ${ctx.verb} ${listText([...ctx.names])} respectively, where`,
        tex`$n(${X}) = ${nX},\quad n(${Y}) = ${nY},\quad n(${Z}) = ${nZ},$`,
        tex`$n(${X} \cap ${Y}) = ${nXY},\quad n(${X} \cap ${Z}) = ${nXZ},\quad n(${Y} \cap ${Z}) = ${nYZ},\quad n(${X} \cap ${Y} \cap ${Z}) = ${all}.$`,
        question,
      ].join('\n'),
      answer,
      distractors,
      explanation: work,
    };
  }),

  b.dynamic('venn-shaded-region', { difficulty: 2, tags: ['Venn diagrams', 'set operations'] }, (r) => {
    const byMask = new Map<number, SetExpr[]>();
    for (const e of VENN_EXPRESSIONS) {
      const key = vennMask(e);
      byMask.set(key, [...(byMask.get(key) ?? []), e]);
    }
    // Shading a whole circle is too easy, so A and B themselves are only ever distractors.
    const trivial = new Set([vennMask(SET_A), vennMask(SET_B)]);
    const target = r.pick([...byMask.keys()].filter((k) => !trivial.has(k)));
    const forms = byMask.get(target) ?? [];
    const answerExpr = r.pick(forms);
    // Near misses first: regions that differ from the shaded part in one or two places.
    const nearest = r
      .shuffle([...byMask.keys()].filter((k) => k !== target))
      .sort((x, y) => popcount(x ^ target) - popcount(y ^ target))
      .slice(0, 5);
    const distractors = r.sample(nearest, 3).map((k) => m$(r.pick(byMask.get(k) ?? []).tex));
    const parts = VENN_REGIONS.filter((_, i) => target & (1 << i)).map((region) => region.words);
    const alt = forms.find((e) => e.tex !== answerExpr.tex);
    return {
      stem: 'The shaded region in the Venn diagram represents:',
      answer: m$(answerExpr.tex),
      distractors,
      explanation: `The shaded part consists of the elements ${listText(parts, 'or')}. These are exactly the elements of $${answerExpr.tex}$${alt ? ` (which can also be written $${alt.tex}$)` : ''}; every other option adds or leaves out at least one region.`,
      figure: vennFigure(target),
    };
  }),

  b.dynamic('element-or-subset', { difficulty: 3, tags: ['set operations'] }, (r) => {
    const [a, c] = r.sample(range(1, 9), 2) as [number, number];
    const shapes: ReadonlyArray<readonly Elem[]> = [
      [a, c, [a, c]],
      [a, [c], [a, c]],
      [a, [a], c],
      [[], a, [a, c]],
    ];
    const set = r.pick(shapes);
    const statements = membershipStatements(set, a, c);
    const truths = statements.filter((s) => s.truth);
    const falsehoods = statements.filter((s) => !s.truth);
    const askFalse = r.chance(0.6);
    const [pool, rest] = askFalse ? [falsehoods, truths] : [truths, falsehoods];
    const chosen = r.weighted(pool, pool.map((s) => (s.trap ? 4 : 1)));
    const others = weightedSample(r, rest, (s) => (s.trap ? 3 : 1), 3);
    const verdict = askFalse ? 'false' : 'true';
    return {
      stem: `Let $A = ${elemTex(set)}$. Which of the following statements is **${verdict}**?`,
      answer: m$(chosen.tex),
      distractors: others.map((s) => m$(s.tex)),
      explanation: `The elements of $A$ are ${listText(set.map((e) => `$${elemTex(e)}$`))}. The statement $${chosen.tex}$ is ${verdict}: ${chosen.why}. Each of the other three statements is ${askFalse ? 'true' : 'false'}.`,
    };
  }),

  // ----- Relations and functions ----------------------------------------------
  b.dynamic('relation-domain-range', { difficulty: 1, tags: ['relations and functions'] }, (r) => {
    const n = r.int(6, 9);
    const universe = range(1, n);
    const k = r.int(1, 3);
    const rule = r.pick([
      { tex: `y = x + ${k}`, f: (x: number) => x + k },
      { tex: `y = x - ${k}`, f: (x: number) => x - k },
      { tex: 'y = 2x', f: (x: number) => 2 * x },
      { tex: 'y = 2x - 1', f: (x: number) => 2 * x - 1 },
      { tex: 'y = 2x + 1', f: (x: number) => 2 * x + 1 },
      { tex: 'y = 3x', f: (x: number) => 3 * x },
      { tex: 'y = x^{2}', f: (x: number) => x * x },
    ]);
    const pairs = universe.filter((x) => universe.includes(rule.f(x))).map((x) => [x, rule.f(x)] as const);
    const dom = pairs.map(([x]) => x);
    const ran = pairs.map(([, y]) => y).sort((u, v) => u - v);
    const images = universe.map(rule.f).sort((u, v) => u - v);
    /** xs plus the nearest element of A just outside it (an off-by-one slip). */
    const grow = (xs: readonly number[]): number[] => {
      const above = Math.max(...xs) + 1;
      const below = Math.min(...xs) - 1;
      const extra = above <= n ? above : below;
      return [...xs, extra].sort((u, v) => u - v);
    };
    const ask = r.pick(['dom', 'ran', 'dom-inverse', 'ran-inverse'] as const);
    const wantsDomain = ask === 'dom' || ask === 'ran-inverse';
    const correct = wantsDomain ? dom : ran;
    const candidates = wantsDomain ? [ran, universe, grow(dom), images] : [dom, images, universe, grow(ran)];
    const answer = m$(setTex(correct));
    const question = {
      dom: 'The domain of $R$ is:',
      ran: 'The range of $R$ is:',
      'dom-inverse': 'The domain of $R^{-1}$ is:',
      'ran-inverse': 'The range of $R^{-1}$ is:',
    }[ask];
    const reading = {
      dom: tex`The domain is the set of first elements: $\operatorname{Dom} R = ${setTex(dom)}$.`,
      ran: tex`The range is the set of second elements: $\operatorname{Ran} R = ${setTex(ran)}$.`,
      'dom-inverse': tex`$R^{-1}$ is obtained by interchanging the elements of every pair, so $\operatorname{Dom} R^{-1} = \operatorname{Ran} R = ${setTex(ran)}$.`,
      'ran-inverse': tex`$R^{-1}$ is obtained by interchanging the elements of every pair, so $\operatorname{Ran} R^{-1} = \operatorname{Dom} R = ${setTex(dom)}$.`,
    }[ask];
    return {
      stem: tex`Let $A = ${setTex(universe)}$ and $R = \{(x, y) \in A \times A : ${rule.tex}\}$. ${question}`,
      answer,
      distractors: pickDistractors(answer, candidates.map((c) => m$(setTex(c)))),
      explanation: tex`Listing the pairs, $R = ${setTex(pairs.map(([x, y]) => `(${x}, ${y})`))}$. ${reading}`,
    };
  }),

  b.dynamic('number-of-relations', { difficulty: 2, origin: 'past-paper', tags: ['relations and functions'] }, (r) => {
    const explicit = r.chance(0.5);
    if (r.chance(0.65)) {
      const [m, n] = r.pick([
        [2, 3],
        [3, 2],
        [3, 3],
        [4, 2],
        [2, 4],
        [4, 3],
        [3, 4],
        [2, 1],
        [3, 1],
      ] as const);
      const cells = m * n;
      const correct = 2 ** cells;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: r.shuffle([cells, 2 ** (m + n), correct - 1, n ** m, m ** n]),
        format: intOption,
      });
      const given = explicit
        ? tex`$A = ${setTex(range(1, m))}$ and $B = ${setTex(['a', 'b', 'c', 'd'].slice(0, n))}$`
        : tex`$n(A) = ${m}$ and $n(B) = ${n}$`;
      return {
        stem: tex`If ${given}, then the number of binary relations from $A$ to $B$ is:`,
        answer,
        distractors,
        explanation: tex`A relation from $A$ to $B$ is any subset of $A \times B$ (the empty relation included). Since $n(A \times B) = ${m} \times ${n} = ${cells}$, the number of relations is $2^{${cells}} = ${correct}$.`,
      };
    }
    const m = r.int(2, 4);
    const cells = m * m;
    const correct = 2 ** cells;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: r.shuffle([cells, 2 ** (2 * m), correct - 1, m ** m, 2 ** m, 2 * cells]),
      format: intOption,
    });
    const given = explicit ? tex`$A = ${setTex(range(1, m))}$` : tex`$n(A) = ${m}$`;
    return {
      stem: tex`If ${given}, then the number of binary relations on $A$ (relations from $A$ to $A$) is:`,
      answer,
      distractors,
      explanation: tex`A relation on $A$ is any subset of $A \times A$, and $n(A \times A) = ${m}^{2} = ${cells}$. Hence there are $2^{${cells}} = ${correct}$ relations on $A$.`,
    };
  }),

  b.dynamic('one-one-onto', { difficulty: 2, tags: ['relations and functions'] }, (r) => {
    const kind = r.pick(['bijective', 'injective', 'surjective', 'neither'] as const);
    const item = r.pick(MAP_CASES[kind])(r);
    const answer = MAP_LABEL[kind];
    return {
      stem: item.stem,
      answer,
      distractors: (Object.keys(MAP_LABEL) as MapKind[]).filter((k) => k !== kind).map((k) => MAP_LABEL[k]),
      explanation: `${item.why} Hence $f$ is ${answer}.`,
    };
  }),

  // ----- Binary operations and groups -----------------------------------------
  b.dynamic('binary-operation-identity-inverse', { difficulty: 2, origin: 'past-paper', tags: ['binary operations', 'groups'] }, (r) => {
    const family = r.pick(['shift', 'shift', 'scaled-product', 'scaled-product', 'a+b-ab', 'a+b+ab', 'k-ab'] as const);
    const askIdentity = (family === 'shift' || family === 'scaled-product' || family === 'k-ab') && r.chance(0.4);
    const finish = (stem: string, correct: Fraction, slips: readonly Fraction[], explanation: string) => {
      const answer = fracOption(correct);
      return { stem, answer, distractors: pickDistractors(answer, slips.map(fracOption), r), explanation };
    };

    if (family === 'shift') {
      const k = r.nonZero(-9, 9);
      const rule = `a * b = a + b ${signed(k)}`;
      if (askIdentity) {
        return finish(
          tex`A binary operation $*$ is defined on $\mathbb{Z}$ by $${rule}$. The identity element of $\mathbb{Z}$ under $*$ is:`,
          frac(-k),
          [frac(k), frac(0), frac(1), frac(-2 * k)],
          tex`If $e$ is the identity, then $a * e = a$ for every $a$: $a + e ${signed(k)} = a$, so $e = ${-k}$. Check: $a * ${paren(-k)} = a ${signed(-k)} ${signed(k)} = a$.`,
        );
      }
      const m = r.intExcept(-9, 9, [0, -k]);
      return finish(
        tex`$\mathbb{Z}$ is a group under the operation $${rule}$. The inverse of $${m}$ in this group is:`,
        frac(-m - 2 * k),
        [frac(-m), frac(-m - k), frac(-m + 2 * k), frac(m + 2 * k)],
        tex`The identity is $e = ${-k}$, since $a ${signed(-k)} ${signed(k)} = a$. The inverse $x$ of $${m}$ satisfies $${m} * x = e$: $${m} + x ${signed(k)} = ${-k}$, so $x = ${-m - 2 * k}$.`,
      );
    }

    if (family === 'scaled-product') {
      const k = r.pick([2, 3, 4, 5, 6, 8, 10]);
      const rule = `a * b = \\frac{ab}{${k}}`;
      if (askIdentity) {
        return finish(
          tex`A binary operation $*$ is defined on $\mathbb{Q} \setminus \{0\}$ by $${rule}$. The identity element under $*$ is:`,
          frac(k),
          [frac(1), frac(1, k), frac(k * k), frac(0)],
          tex`If $e$ is the identity, then $a * e = a$: $\frac{ae}{${k}} = a$, so $e = ${k}$.`,
        );
      }
      const m = r.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 5, 6, 7, 9, 12].filter((v) => v !== k));
      const inv = frac(k * k, m);
      const raw = `\\frac{${k * k}}{${m}}`;
      const invSteps = raw === inv.toTex() ? raw : `${raw} = ${inv.toTex()}`;
      return finish(
        tex`$\mathbb{Q} \setminus \{0\}$ is a group under the operation $${rule}$. The inverse of $${m}$ in this group is:`,
        inv,
        [frac(k, m), frac(1, m), frac(m, k * k), frac(k * k * m)],
        tex`The identity is $${k}$, since $\frac{a \cdot ${k}}{${k}} = a$. The inverse $x$ of $${m}$ satisfies $\frac{${m}x}{${k}} = ${k}$, so $x = ${invSteps}$.`,
      );
    }

    if (family === 'a+b-ab') {
      const m = r.pick([-5, -4, -3, -2, -1, 2, 3, 4, 5, 6, 7]);
      const inv = frac(m, m - 1);
      const raw = `\\frac{${-m}}{${1 - m}}`;
      const invSteps = raw === inv.toTex() ? raw : `${raw} = ${inv.toTex()}`;
      return finish(
        tex`$\mathbb{R} \setminus \{1\}$ is a group under the operation $a * b = a + b - ab$. The inverse of $${m}$ in this group is:`,
        inv,
        [frac(m, 1 - m), frac(m - 1, m), frac(-m), frac(1, 1 - m)],
        tex`The identity is $0$, since $a * 0 = a + 0 - 0 = a$. The inverse $x$ of $${m}$ satisfies $${m} + x - ${paren(m)}x = 0$, i.e. $(1 ${signed(-m)})x = ${-m}$, so $x = ${invSteps}$.`,
      );
    }

    if (family === 'a+b+ab') {
      const m = r.pick([-5, -4, -3, -2, 1, 2, 3, 4, 5, 6]);
      const inv = frac(-m, 1 + m);
      return finish(
        tex`$\mathbb{R} \setminus \{-1\}$ is a group under the operation $a * b = a + b + ab$. The inverse of $${m}$ in this group is:`,
        inv,
        [frac(m, 1 + m), frac(-m), frac(-1, 1 + m), frac(-(1 + m), m)],
        tex`The identity is $0$, since $a * 0 = a + 0 + 0 = a$. The inverse $x$ of $${m}$ satisfies $${m} + x + ${paren(m)}x = 0$, i.e. $(1 ${signed(m)})x = ${-m}$, so $x = \frac{${-m}}{${1 + m}} = ${inv.toTex()}$.`,
      );
    }

    // family === 'k-ab'
    const k = r.pick([2, 3, 4, 5]);
    const rule = `a * b = ${k}ab`;
    if (askIdentity) {
      return finish(
        tex`A binary operation $*$ is defined on $\mathbb{R} \setminus \{0\}$ by $${rule}$. The identity element under $*$ is:`,
        frac(1, k),
        [frac(k), frac(1), frac(1, k * k), frac(-k)],
        tex`If $e$ is the identity, then $a * e = a$: $${k}ae = a$, so $e = \frac{1}{${k}}$.`,
      );
    }
    const m = r.pick([-5, -4, -3, -2, -1, 2, 3, 4, 5]);
    const inv = frac(1, k * k * m);
    return finish(
      tex`$\mathbb{R} \setminus \{0\}$ is a group under the operation $${rule}$. The inverse of $${m}$ in this group is:`,
      inv,
      [frac(1, k * m), frac(1, m), frac(k, m), frac(-1, k * k * m)],
      tex`The identity is $\frac{1}{${k}}$, since $${k} \cdot a \cdot \frac{1}{${k}} = a$. The inverse $x$ of $${m}$ satisfies $${k} \cdot ${paren(m)} \cdot x = \frac{1}{${k}}$, so $x = ${inv.toTex()}$.`,
    );
  }),

  b.dynamic('inverse-in-standard-group', { difficulty: 1, origin: 'past-paper', tags: ['groups'] }, (r) => {
    const mode = r.pick(['fourth-roots', 'cube-roots', 'addition-mod'] as const);
    if (mode === 'fourth-roots') {
      const x = r.pick(['i', '-i', '-1'] as const);
      const inverse = { i: '-i', '-i': 'i', '-1': '-1' }[x];
      const work = {
        i: tex`$i \cdot (-i) = -i^{2} = 1$`,
        '-i': tex`$(-i) \cdot i = -i^{2} = 1$`,
        '-1': tex`$(-1)(-1) = 1$`,
      }[x];
      return {
        stem: tex`In the group $\{1, -1, i, -i\}$ under multiplication, the inverse of $${x}$ is:`,
        answer: m$(inverse),
        distractors: ['1', '-1', 'i', '-i'].filter((e) => e !== inverse).map(m$),
        explanation: tex`The identity is $1$ and ${work}, so the inverse of $${x}$ is $${inverse}$.`,
      };
    }
    if (mode === 'cube-roots') {
      const [x, inverse] = r.pick([
        ['\\omega', '\\omega^{2}'],
        ['\\omega^{2}', '\\omega'],
      ] as const);
      return {
        stem: tex`In the multiplicative group $\{1, \omega, \omega^{2}\}$ of cube roots of unity, the inverse of $${x}$ is:`,
        answer: m$(inverse),
        distractors: [x, '1', `-${inverse}`].map(m$),
        explanation: tex`The identity is $1$ and $\omega \cdot \omega^{2} = \omega^{3} = 1$, so $\omega$ and $\omega^{2}$ are inverses of each other: the inverse of $${x}$ is $${inverse}$.`,
      };
    }
    const n = r.int(4, 9);
    const x = r.int(1, n - 1);
    const inverse = n - x;
    const answer = intOption(inverse);
    const others = r.shuffle(range(1, n - 1).filter((v) => v !== x && v !== inverse));
    return {
      stem: tex`In the group $${setTex(range(0, n - 1))}$ under addition modulo $${n}$, the inverse of $${x}$ is:`,
      answer,
      distractors: pickDistractors(answer, [x, 0, ...others].map(intOption)),
      explanation: tex`The identity is $0$. Since $${x} + ${inverse} = ${n} \equiv 0 \pmod{${n}}$, the inverse of $${x}$ is $${inverse}$.`,
    };
  }),

  b.dynamic('group-operation-table', { difficulty: 2, tags: ['groups', 'binary operations'] }, (r) => {
    if (r.chance(0.25)) {
      // Residue classes under multiplication modulo a prime.
      const p = r.pick([5, 7, 11]);
      const x = r.int(2, p - 1);
      const y = inverseMod(x, p);
      const answer = intOption(y);
      const rest = r.shuffle(range(2, p - 1));
      return {
        stem: tex`In the group $G = ${setTex(range(1, p - 1))}$ under multiplication modulo $${p}$, the inverse of $${x}$ is:`,
        answer,
        distractors: pickDistractors(answer, [p - x, x, 1, (x * x) % p, ...rest].map(intOption)),
        // In Z_5 the inverses of 2 and 3 coincide with their additive inverses, so no slip note then.
        explanation: tex`The identity is $1$. Since $${x} \times ${y} = ${x * y} = ${(x * y - 1) / p}(${p}) + 1 \equiv 1 \pmod{${p}}$, the inverse of $${x}$ is $${y}$.${p - x === y ? '' : tex` (The additive inverse $${p - x}$ is a common slip.)`}`,
      };
    }

    const group = r.pick([cyclicGroup(4), cyclicGroup(4), KLEIN_GROUP, cyclicGroup(5)]);
    const labels = r.pick(TABLE_LABELS[group.order as 4 | 5]);
    // Element g is shown as name[g]; rows and columns are listed in alphabetical order.
    const name = r.shuffle(labels);
    const sorted = [...labels].sort();
    const elementOf = (label: string): number => name.indexOf(label);
    const cell = (x: string, y: string): string => name[group.op(elementOf(x), elementOf(y))] as string;
    const table = [
      `| $*$ | ${sorted.map((l) => `$${l}$`).join(' | ')} |`,
      `|${'---|'.repeat(sorted.length + 1)}`,
      ...sorted.map((row) => `| $${row}$ | ${sorted.map((col) => `$${cell(row, col)}$`).join(' | ')} |`),
    ].join('\n');
    const e = name[0] as string;
    const intro = `The table below defines a group operation $*$ on $G = ${setTex(sorted)}$.`;
    const finish = (question: string, correct: string, preferred: readonly string[], explanation: string) => {
      const answer = m$(correct);
      const pool = [...preferred, ...r.shuffle(labels)].map(m$);
      return {
        stem: [intro, '', table, '', question].join('\n'),
        answer,
        distractors: pickDistractors(answer, pool),
        explanation,
      };
    };
    const identityNote = `The identity is $${e}$, because its row repeats the column headings and its column repeats the row headings.`;

    const mode = r.pick(['identity', 'inverse', 'inverse', 'solve', 'solve'] as const);
    if (mode === 'identity') {
      return finish('The identity element of $G$ is:', e, [], tex`The row of $${e}$ reads exactly like the heading row, and its column like the heading column, so $${e} * x = x * ${e} = x$ for every $x \in G$. Hence $${e}$ is the identity.`);
    }
    if (mode === 'inverse') {
      const g = r.int(1, group.order - 1);
      const x = name[g] as string;
      const y = name[group.inv(g)] as string;
      return finish(
        tex`The inverse of $${x}$ is:`,
        y,
        [x, e, name[group.op(g, g)] as string],
        tex`${identityNote} In the row of $${x}$, the identity $${e}$ appears in the column of $${y}$, so $${x} * ${y} = ${e}$ and $${x}^{-1} = ${y}$.`,
      );
    }
    const g = r.int(1, group.order - 1);
    const h = r.intExcept(0, group.order - 1, [g]);
    const sol = group.op(group.inv(g), h);
    const [gl, hl, sl, gInv] = [name[g], name[h], name[sol], name[group.inv(g)]] as string[];
    return finish(
      tex`The element $x \in G$ that satisfies $${gl} * x = ${hl}$ is:`,
      sl as string,
      [hl as string, name[group.op(g, h)] as string, gInv as string, e],
      tex`In the row of $${gl}$, the entry $${hl}$ stands in the column of $${sl}$, so $${gl} * ${sl} = ${hl}$. Equivalently, $x = ${gl}^{-1} * ${hl} = ${gInv} * ${hl} = ${sl}$, since $${gl}^{-1} = ${gInv}$ (${identityNote.charAt(0).toLowerCase() + identityNote.slice(1, -1)}).`,
    );
  }),

  // ----- Logic ----------------------------------------------------------------
  b.dynamic('converse-inverse-contrapositive', { difficulty: 1, origin: 'past-paper', tags: ['logic'] }, (r) => {
    const ask = r.weighted(['converse', 'inverse', 'contrapositive', 'equivalent'] as const, [3, 2, 3, 2]);
    const pickedWord = { converse: 'converse', inverse: 'inverse', contrapositive: 'contrapositive', equivalent: '' }[ask];
    if (r.chance(0.5)) {
      // Symbolic form.
      const [u, v] = r.pick([
        ['p', 'q'],
        ['p', 'q'],
        ['q', 'r'],
        ['p', 'r'],
      ] as const);
      const A: Literal = { name: u, neg: r.chance(0.3) };
      const C: Literal = { name: v, neg: r.chance(0.3) };
      const cond = condTex(A, C);
      const forms = {
        converse: condTex(C, A),
        inverse: condTex(flip(A), flip(C)),
        contrapositive: condTex(flip(C), flip(A)),
        negation: `${litTex(A)} \\wedge ${litTex(flip(C))}`,
        half: r.chance(0.5) ? condTex(flip(C), A) : condTex(C, flip(A)),
        disjunction: `${litTex(flip(A))} \\vee ${litTex(C)}`,
      };
      let answer: string;
      let wrong: string[];
      let stem: string;
      let last: string;
      if (ask === 'equivalent') {
        answer = r.chance(0.6) ? forms.contrapositive : forms.disjunction;
        wrong = [forms.converse, forms.inverse, forms.negation];
        stem = `Which of the following is logically equivalent to $${cond}$?`;
        last =
          answer === forms.contrapositive
            ? 'A conditional is always equivalent to its contrapositive, while the converse and the inverse (which are equivalent to each other) are not.'
            : tex`A conditional is false only when its hypothesis is true and its conclusion false, which is exactly when $${forms.disjunction}$ is false; so $${cond} \equiv ${forms.disjunction}$. The converse and inverse are not equivalent to it, and $${forms.negation}$ is its negation.`;
      } else {
        answer = forms[ask];
        wrong = (['converse', 'inverse', 'contrapositive'] as const).filter((f) => f !== ask).map((f) => forms[f]);
        wrong.push(r.chance(0.5) ? forms.negation : forms.half);
        stem = `The ${pickedWord} of $${cond}$ is:`;
        last = `So the ${pickedWord} is $${answer}$.`;
      }
      return {
        stem,
        answer: m$(answer),
        distractors: wrong.map(m$),
        explanation: `For $${cond}$: the converse is $${forms.converse}$ (hypothesis and conclusion interchanged), the inverse is $${forms.inverse}$ (both negated) and the contrapositive is $${forms.contrapositive}$ (interchanged and negated). ${last}`,
      };
    }

    // Verbal form. For "equivalent" items skip conditionals whose converse is also a true statement
    // (odd primes are exactly the primes above 2), or the converse could be argued to be equivalent.
    const c = r.pick(ask === 'equivalent' ? CONDITIONALS.filter((x) => x.subj !== 'a prime number') : CONDITIONALS);
    const sentence = (x: string, y: string): string => `If ${c.subj} ${x}, then it ${y}.`;
    const original = sentence(c.p, c.q).slice(0, -1);
    const forms = {
      converse: sentence(c.q, c.p),
      inverse: sentence(c.np, c.nq),
      contrapositive: sentence(c.nq, c.np),
      half: r.chance(0.5) ? sentence(c.nq, c.p) : sentence(c.q, c.np),
    };
    const target = ask === 'equivalent' ? 'contrapositive' : ask;
    const answer = forms[target];
    const wrong = [
      ...(['converse', 'inverse', 'contrapositive'] as const).filter((f) => f !== target).map((f) => forms[f]),
      forms.half,
    ];
    return {
      stem:
        ask === 'equivalent'
          ? `Which of the following is logically equivalent to the statement “${original}”?`
          : `The ${pickedWord} of the statement “${original}” is:`,
      answer,
      distractors: wrong,
      explanation: `The converse interchanges the hypothesis and the conclusion, the inverse negates both, and the contrapositive does both. ${
        ask === 'equivalent'
          ? 'Only the contrapositive is logically equivalent to the original conditional'
          : `So the ${pickedWord} is`
      }: “${answer.slice(0, -1)}”.`,
    };
  }),

  b.dynamic('tautology-contradiction-equivalence', { difficulty: 2, tags: ['logic'] }, (r) => {
    const mode = r.pick(['tautology', 'contradiction', 'valuation', 'equivalent'] as const);
    const formulas = LOGIC_POOL.map((f) => ({ f, mask: truthMask(f) }));
    const tautologies = formulas.filter((x) => x.mask === 15);
    const contradictions = formulas.filter((x) => x.mask === 0);
    const contingent = formulas.filter((x) => x.mask !== 0 && x.mask !== 15);
    const cases = '$(p, q) = (T, T), (T, F), (F, T), (F, F)$';

    if (mode === 'tautology' || mode === 'contradiction') {
      const wantTrue = mode === 'tautology';
      const answer = r.pick(wantTrue ? tautologies : contradictions).f;
      const others = formulas.filter((x) => x.mask !== (wantTrue ? 15 : 0));
      // Prefer near misses (true in three rows / in one row) plus the opposite extreme.
      const weight = (x: { mask: number }): number => {
        const k = popcount(x.mask);
        return wantTrue ? [2, 1, 2, 4, 0][k] ?? 1 : [0, 4, 2, 1, 2][k] ?? 1;
      };
      const picks = weightedSample(r, others, weight, 3).map((x) => x.f);
      const foil = picks[0] as Prop;
      const row = TT_ROWS.find((v) => foil.value(v) !== wantTrue) as Valuation;
      const word = wantTrue ? 'a tautology' : 'a contradiction (absurdity)';
      return {
        stem: `Which of the following is ${word}?`,
        answer: m$(answer.tex),
        distractors: picks.map((f) => m$(f.tex)),
        explanation: `In the four cases ${cases}, $${answer.tex}$ takes the values ${truthColumn(answer)}: it is ${wantTrue ? 'true' : 'false'} in every case, so it is ${word}. Each other option is ${wantTrue ? 'false' : 'true'} in at least one case; for example $${foil.tex}$ is ${wantTrue ? 'false' : 'true'} when ${rowText(row)}.`,
      };
    }

    if (mode === 'valuation') {
      const row = r.pick(TT_ROWS);
      const wantTrue = r.chance(0.7);
      const good = contingent.filter((x) => x.f.value(row) === wantTrue).map((x) => x.f);
      const bad = contingent.filter((x) => x.f.value(row) !== wantTrue).map((x) => x.f);
      const answer = r.pick(good);
      const picks = r.sample(bad, 3);
      const verdict = wantTrue ? 'true' : 'false';
      return {
        stem: `If ${rowText(row)}, which of the following statements is **${verdict}**?`,
        answer: m$(answer.tex),
        distractors: picks.map((f) => m$(f.tex)),
        explanation: `When ${rowText(row)}, $${answer.tex}$ is ${verdict}, whereas ${listText(picks.map((f) => `$${f.tex}$`))} are all ${wantTrue ? 'false' : 'true'}.`,
      };
    }

    const item = r.pick(EQUIVALENCES);
    const targetMask = truthMask(item.target);
    if (item.answers.some((f) => truthMask(f) !== targetMask) || item.traps.some((f) => truthMask(f) === targetMask)) {
      throw new Error(`EQUIVALENCES entry for ${item.target.tex} is inconsistent`);
    }
    const answer = r.pick(item.answers);
    const picks = r.sample(item.traps, 3);
    return {
      stem: `Which of the following is logically equivalent to $${item.target.tex}$?`,
      answer: m$(answer.tex),
      distractors: picks.map((f) => m$(f.tex)),
      explanation: `In the four cases ${cases}, both $${item.target.tex}$ and $${answer.tex}$ take the values ${truthColumn(answer)}, so they are equivalent (${item.law}). Each other option differs in at least one case.`,
    };
  }),

  // ----- Fixed questions --------------------------------------------------------
  ...b.mcqs([
    {
      id: 'de-morgan-intersection',
      d: 1,
      o: 'past-paper',
      t: ['set operations'],
      q: tex`For any subsets $A$ and $B$ of a universal set $U$, $(A \cap B)'$ is equal to:`,
      a: tex`$A' \cup B'$`,
      x: [tex`$A' \cap B'$`, tex`$A \cup B$`, tex`$A \cap B'$`],
      e: tex`By De Morgan's law: $x \in (A \cap B)' \iff x \notin A \cap B \iff x \notin A$ or $x \notin B \iff x \in A' \cup B'$. (The other law gives $(A \cup B)' = A' \cap B'$.)`,
    },
    {
      id: 'power-set-of-power-set-of-empty-set',
      d: 3,
      t: ['set operations'],
      q: tex`The power set of $P(\emptyset)$, that is $P(P(\emptyset))$, is:`,
      a: tex`$\{\emptyset, \{\emptyset\}\}$`,
      x: [tex`$\{\emptyset\}$`, tex`$\emptyset$`, tex`$\{\{\emptyset\}\}$`],
      e: tex`The only subset of $\emptyset$ is $\emptyset$, so $P(\emptyset) = \{\emptyset\}$, a set with one element. A one-element set has $2^{1} = 2$ subsets, namely $\emptyset$ and $\{\emptyset\}$. Hence $P(P(\emptyset)) = \{\emptyset, \{\emptyset\}\}$.`,
    },
    {
      id: 'inverse-function-needs-bijection',
      d: 1,
      t: ['relations and functions'],
      q: tex`A function $f: A \to B$ has an inverse function $f^{-1}: B \to A$ if and only if $f$ is:`,
      a: 'one-one and onto',
      x: ['one-one but not onto', 'onto but not one-one', 'neither one-one nor onto'],
      e: tex`$f^{-1}$ must send every $y \in B$ to exactly one $x \in A$ with $f(x) = y$. "At least one" needs $f$ to be onto and "at most one" needs $f$ to be one-one, so $f$ must be bijective.`,
    },
    {
      id: 'natural-numbers-under-addition',
      d: 2,
      t: ['binary operations', 'groups'],
      q: tex`The set $\mathbb{N} = \{1, 2, 3, \dots\}$ under ordinary addition is:`,
      a: 'a semi-group but not a monoid',
      x: ['a group', 'a monoid but not a group', 'a groupoid but not a semi-group'],
      e: tex`The sum of two natural numbers is a natural number and addition is associative, so $(\mathbb{N}, +)$ is a semi-group. The additive identity $0$ is not in $\mathbb{N}$, so it is not a monoid, and hence not a group.`,
    },
    {
      id: 'subtraction-on-integers',
      d: 2,
      t: ['binary operations'],
      q: tex`The binary operation $*$ on $\mathbb{Z}$ is defined by $a * b = a - b$. Which of the following is true?`,
      a: tex`$*$ is neither commutative nor associative`,
      x: [
        tex`$*$ is associative but not commutative`,
        tex`$*$ is commutative but not associative`,
        tex`$0$ is the identity element of $*$`,
      ],
      e: tex`$3 * 1 = 2$ but $1 * 3 = -2$, so $*$ is not commutative. $(a - b) - c = a - b - c$ while $a - (b - c) = a - b + c$, so it is not associative. Also $a * 0 = a$ but $0 * a = -a$, so $0$ is only a right identity, not an identity element.`,
    },
    {
      id: 'reversal-law',
      d: 1,
      t: ['groups'],
      q: tex`If $a$ and $b$ are elements of a group $G$, then $(ab)^{-1}$ is always equal to:`,
      a: tex`$b^{-1}a^{-1}$`,
      x: [tex`$a^{-1}b^{-1}$`, tex`$ba$`, tex`$a^{-1}b$`],
      e: tex`$(ab)(b^{-1}a^{-1}) = a(bb^{-1})a^{-1} = aa^{-1} = e$, so $(ab)^{-1} = b^{-1}a^{-1}$ (the reversal law). The form $a^{-1}b^{-1}$ agrees with it only when $G$ is abelian.`,
    },
    {
      id: 'linear-equation-in-a-group',
      d: 2,
      t: ['groups'],
      q: tex`In a group $(G, *)$ with $a, b \in G$, the equation $a * x = b$ has the unique solution:`,
      a: tex`$x = a^{-1} * b$`,
      x: [tex`$x = b * a^{-1}$`, tex`$x = b^{-1} * a$`, tex`$x = a * b^{-1}$`],
      e: tex`Operate on the left by $a^{-1}$: $a^{-1} * (a * x) = a^{-1} * b$, so $(a^{-1} * a) * x = a^{-1} * b$, that is $x = a^{-1} * b$. The element $b * a^{-1}$ solves $x * a = b$ instead; the two agree only when $G$ is abelian.`,
    },
    {
      id: 'negation-of-universal-statement',
      d: 1,
      t: ['logic'],
      q: 'The negation of the statement “Every prime number is odd” is:',
      a: 'Some prime number is not odd.',
      x: ['No prime number is odd.', 'Some prime number is odd.', 'Every odd number is prime.'],
      e: tex`The negation of "for every $x$, $P(x)$" is "for some $x$, $\mathord{\sim}P(x)$". So the negation is "Some prime number is not odd", which is true because $2$ is an even prime. "No prime number is odd" denies the property for every prime, which is far more than a negation.`,
    },
  ]),
]);
