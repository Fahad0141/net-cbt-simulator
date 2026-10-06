import { defineBank } from '@/engine/authoring';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion, Difficulty } from '@/engine/types';
import { CONFLICTS, RELATIONS, type AnalogyPair, type Relation, type RelationType } from './_analogies';

/**
 * English, chapter "Analogies": SAT-style word-pair analogies (NET format).
 *
 * The stem shows the original pair in capitals; the options are four pairs. The correct option is
 * another pair of the SAME relationship type (written in the same canonical order). Wrong options are
 * pairs of OTHER relationship types, never of a type listed as conflicting in `CONFLICTS`, and one may
 * be a same-type pair written in reverse order (the classic reversed-order trap). No word appears twice
 * across the stem and the options.
 */

const DIRECTIONS =
  'Select the lettered pair that best expresses a relationship similar to that expressed in the original pair:';

const BY_TYPE = new Map<RelationType, Relation>(RELATIONS.map((rel) => [rel.type, rel]));
const ALL_TYPES: readonly RelationType[] = RELATIONS.map((rel) => rel.type);

function relation(type: RelationType): Relation {
  const rel = BY_TYPE.get(type);
  if (!rel) throw new Error(`analogies: unknown relation type ${type}`);
  return rel;
}

function conflicts(a: RelationType, b: RelationType): boolean {
  return CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);
const show = (x: string, y: string): string => `${cap(x)} : ${y}`;

/** Crude word keys so that "scales"/"scale" or a word shared between two pairs is detected. */
function keys(pair: AnalogyPair): string[] {
  return `${pair.a} ${pair.b}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));
}

const disjoint = (pair: AnalogyPair, used: ReadonlySet<string>): boolean => keys(pair).every((k) => !used.has(k));

interface Spec {
  /** Relationship types the original pair is drawn from. */
  types: readonly RelationType[];
  /** Vocabulary levels allowed for the original pair and the answer. */
  levels: readonly Difficulty[];
  /** Extra condition on the levels of the original pair and the answer. */
  levelRule?: (x: Difficulty, y: Difficulty) => boolean;
  /** Vocabulary levels allowed for wrong options. */
  distractorLevels: readonly Difficulty[];
  /** Probability of including the reversed-order trap (asymmetric types only). */
  reversedChance: number;
  /** Preferred trap type for each stem type (a related but different relationship). */
  traps?: Partial<Record<RelationType, RelationType>>;
}

interface Wrong {
  text: string;
  why: string;
}

function attempt(r: Rng, spec: Spec): AuthoredQuestion | null {
  const rel = relation(r.pick(spec.types));
  const pool = rel.pairs.filter((x) => spec.levels.includes(x.lv));
  const stem = r.pick(pool);
  const used = new Set(keys(stem));
  const answers = pool.filter(
    (x) => x !== stem && disjoint(x, used) && (!spec.levelRule || spec.levelRule(stem.lv, x.lv)),
  );
  if (answers.length === 0) return null;
  // Prefer a pair from the same sub-group (person : trait with person : trait, etc.).
  const sameGroup = stem.g ? answers.filter((x) => x.g === stem.g) : [];
  const ans = r.pick(sameGroup.length > 0 ? sameGroup : answers);
  keys(ans).forEach((k) => used.add(k));

  const wrong: Wrong[] = [];
  const usedTypes = new Set<RelationType>([rel.type]);
  const take = (type: RelationType): boolean => {
    const other = relation(type);
    const options = other.pairs.filter((x) => spec.distractorLevels.includes(x.lv) && disjoint(x, used));
    if (options.length === 0) return false;
    const pick = r.pick(options);
    keys(pick).forEach((k) => used.add(k));
    usedTypes.add(type);
    wrong.push({ text: show(pick.a, pick.b), why: `${other.label}: ${pick.bridge}` });
    return true;
  };

  // 1. A related-but-different relationship (e.g. worker : product when the stem is worker : tool).
  const trap = spec.traps?.[rel.type];
  if (trap && !conflicts(trap, rel.type)) take(trap);

  // 2. The reversed-order trap: a same-type pair written back to front.
  if (rel.reversed && r.chance(spec.reversedChance)) {
    const options = rel.pairs.filter(
      (x) => x !== stem && x !== ans && spec.distractorLevels.includes(x.lv) && disjoint(x, used),
    );
    if (options.length > 0) {
      const pick = r.pick(options);
      keys(pick).forEach((k) => used.add(k));
      wrong.push({ text: show(pick.b, pick.a), why: `reversed order (${rel.reversed}): ${pick.bridge}` });
    }
  }

  // 3. Fill with pairs of other, non-conflicting relationship types (one per type).
  const others = r.shuffle(ALL_TYPES.filter((t) => !usedTypes.has(t) && !conflicts(t, rel.type)));
  for (const t of others) {
    if (wrong.length >= 3) break;
    take(t);
  }
  if (wrong.length < 3) return null;

  const answer = show(ans.a, ans.b);
  const original = `${stem.a.toUpperCase()} : ${stem.b.toUpperCase()}`;
  return {
    stem: `${DIRECTIONS}\n\n**${original}**`,
    answer,
    distractors: wrong.map((w) => w.text),
    explanation:
      `**${original}** (${rel.label}): ${stem.bridge}.\n\n` +
      `**${answer}** shows the same relationship${rel.reversed ? ' in the same order' : ''}: ${ans.bridge}.\n\n` +
      wrong.map((w) => `${w.text} — ${w.why}.`).join('\n'),
  };
}

function generate(r: Rng, spec: Spec): AuthoredQuestion {
  for (let i = 0; i < 40; i++) {
    const q = attempt(r, spec);
    if (q) return q;
  }
  throw new Error('analogies: could not assemble a question (check the pair data)');
}

/** Difficulty 1: common words throughout. */
const EASY = { levels: [1], distractorLevels: [1, 2], reversedChance: 0.5 } as const;
/** Difficulty 2: everyday or SAT vocabulary, at least one SAT-level pair among the stem and the answer. */
const MEDIUM = {
  levels: [1, 2],
  levelRule: (x: Difficulty, y: Difficulty) => Math.max(x, y) === 2,
  distractorLevels: [1, 2],
  reversedChance: 0.6,
} as const;

const T1 = ['word relationships'] as const;
const T2 = ['word relationships', 'SAT-style pairs'] as const;
const T3 = ['SAT-style pairs'] as const;

export default defineBank('english', 'analogies', (b) => [
  // ---------------------------------------------------------------- difficulty 1
  b.dynamic('category-member', { difficulty: 1, origin: 'past-paper', tags: T1 }, (r) =>
    generate(r, { ...EASY, types: ['type-of'], reversedChance: 0.8 }),
  ),
  b.dynamic('part-whole', { difficulty: 1, origin: 'past-paper', tags: T1 }, (r) =>
    generate(r, { ...EASY, types: ['part-whole'], reversedChance: 0.7 }),
  ),
  b.dynamic('worker-tool-product', { difficulty: 1, origin: 'past-paper', tags: T1 }, (r) =>
    generate(r, {
      ...EASY,
      types: ['worker-tool', 'worker-product'],
      traps: { 'worker-tool': 'worker-product', 'worker-product': 'worker-tool' },
    }),
  ),
  b.dynamic('function-measure', { difficulty: 1, tags: T1 }, (r) =>
    generate(r, {
      ...EASY,
      types: ['function', 'measure'],
      traps: { function: 'worker-tool', measure: 'worker-tool' },
    }),
  ),
  b.dynamic('location-symbol', { difficulty: 1, tags: T1 }, (r) =>
    generate(r, { ...EASY, types: ['location', 'symbol'] }),
  ),

  // ---------------------------------------------------------------- difficulty 2
  b.dynamic('synonym-antonym', { difficulty: 2, origin: 'past-paper', tags: T2 }, (r) =>
    generate(r, {
      ...MEDIUM,
      types: ['synonym', 'antonym'],
      traps: { synonym: 'antonym', antonym: 'synonym' },
    }),
  ),
  b.dynamic('degree-intensity', { difficulty: 2, tags: T2 }, (r) =>
    generate(r, { ...MEDIUM, types: ['degree'], traps: { degree: 'antonym' } }),
  ),
  b.dynamic('cause-effect', { difficulty: 2, tags: T2 }, (r) =>
    generate(r, { ...MEDIUM, types: ['cause-effect'], reversedChance: 0.8 }),
  ),
  b.dynamic('characteristic', { difficulty: 2, tags: T2 }, (r) =>
    generate(r, { ...MEDIUM, types: ['characteristic'], traps: { characteristic: 'lack-of' } }),
  ),
  b.dynamic('sequence-stage', { difficulty: 2, tags: T2 }, (r) =>
    generate(r, { ...MEDIUM, types: ['sequence'], reversedChance: 0.8, traps: { sequence: 'type-of' } }),
  ),

  // ---------------------------------------------------------------- difficulty 3
  b.dynamic('lack-of', { difficulty: 3, tags: T3 }, (r) =>
    generate(r, {
      types: ['lack-of'],
      levels: [1, 2, 3],
      levelRule: (x, y) => Math.max(x, y) >= 2 && x + y >= 4,
      distractorLevels: [2, 3],
      reversedChance: 0.5,
      traps: { 'lack-of': 'characteristic' },
    }),
  ),
  b.dynamic('advanced-vocabulary', { difficulty: 3, tags: T3 }, (r) =>
    generate(r, {
      types: ALL_TYPES,
      levels: [3],
      distractorLevels: [2, 3],
      reversedChance: 1,
    }),
  ),
]);
