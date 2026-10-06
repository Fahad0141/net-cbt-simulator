import { defineBank } from '@/engine/authoring';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion, Difficulty } from '@/engine/types';
import { RULE_TIPS, SPELLING, type SpellingEntry, type SpellingRule } from './_spelling';

/**
 * English, chapter "Spelling". Every item is generated from the curated list in `_spelling.ts`
 * (commonly misspelt words, each with hand-picked misspellings that copy real error patterns).
 *
 * - "Choose the correctly spelt word": one correct word + misspellings of three OTHER words.
 * - "Which word is spelt incorrectly?": one misspelt word + three OTHER words spelt correctly.
 * - "Choose the correct spelling": the correct word + three misspellings of the SAME word.
 * - "Same pattern": four words sharing one trap (ie/ei, doubled letters, endings ...).
 * - "Correct pair": the only option in which both words are spelt correctly.
 *
 * Words of one family (necessary/unnecessary, occur/occurrence ...) never share a question,
 * so no option gives the answer away.
 */

const CORRECT_STEM = 'Choose the correctly spelt word:';
const WRONG_STEM = 'Which of the following words is spelt **incorrectly**?';
const SAME_WORD_STEM = 'Which of the following is the correct spelling?';
const PAIR_STEM = 'In which option are **both** words spelt correctly?';

const family = (s: SpellingEntry): string => s.f ?? s.w;

/** `count` entries from `pool`, all of different families, in random order. */
function pickEntries(r: Rng, pool: readonly SpellingEntry[], count: number): SpellingEntry[] {
  const out: SpellingEntry[] = [];
  const used = new Set<string>();
  for (const s of r.shuffle(pool)) {
    if (used.has(family(s))) continue;
    used.add(family(s));
    out.push(s);
    if (out.length === count) return out;
  }
  throw new Error(`spelling: pool too small for ${count} words`);
}

const levels = (...ds: Difficulty[]): SpellingEntry[] => SPELLING.filter((s) => ds.includes(s.d));

/** "misspelt should be **correct**" for every misspelt option. */
const corrections = (pairs: ReadonlyArray<readonly [string, SpellingEntry]>): string =>
  pairs.map(([shown, s]) => `${shown} should be **${s.w}** (${s.n})`).join('; ');

/** One correct word among misspellings of three other words. */
function correctWord(r: Rng, pool: readonly SpellingEntry[], tip = '', keyPool = pool): AuthoredQuestion {
  const key = r.pick(keyPool);
  const others = pickEntries(
    r,
    pool.filter((s) => family(s) !== family(key)),
    3,
  );
  const shown = others.map((s) => [r.pick(s.x), s] as const);
  return {
    stem: CORRECT_STEM,
    answer: key.w,
    distractors: shown.map(([m]) => m),
    explanation: `${tip ? `${tip} ` : ''}**${key.w}** is spelt correctly (${key.n}). The other options are misspelt: ${corrections(shown)}.`,
  };
}

/** One misspelt word among three other words spelt correctly. */
function misspeltWord(r: Rng, pool: readonly SpellingEntry[]): AuthoredQuestion {
  const [key, ...others] = pickEntries(r, pool, 4) as [SpellingEntry, ...SpellingEntry[]];
  const answer = r.pick(key.x);
  return {
    stem: WRONG_STEM,
    answer,
    distractors: others.map((s) => s.w),
    explanation: `**${answer}** is misspelt; the correct spelling is **${key.w}** (${key.n}). The other three words (${others
      .map((s) => s.w)
      .join(', ')
      .replace(/, ([^,]*)$/, ' and $1')}) are spelt correctly.`,
  };
}

/** The correct spelling of one word among three of its misspellings. */
function correctSpelling(r: Rng, pool: readonly SpellingEntry[]): AuthoredQuestion {
  const key = r.pick(pool);
  return {
    stem: SAME_WORD_STEM,
    answer: key.w,
    distractors: r.sample(key.x, 3),
    explanation: `The correct spelling is **${key.w}** (${key.n}).`,
  };
}

const PATTERNS: readonly Exclude<SpellingRule, 'other'>[] = ['double', 'ie', 'suffix', 'silent', 'cede'];

export default defineBank('english', 'spelling', (b) => [
  // ------------------------------------------------------------ correctly spelt word
  b.dynamic('correct-word-easy', { difficulty: 1, origin: 'past-paper', tags: ['correctly spelt word'] }, (r) =>
    correctWord(r, levels(1)),
  ),
  b.dynamic('correct-word', { difficulty: 2, tags: ['correctly spelt word'] }, (r) => correctWord(r, levels(2))),
  b.dynamic('correct-word-hard', { difficulty: 3, tags: ['correctly spelt word'] }, (r) =>
    // The key is an advanced word; the misspelt options mix typical and advanced words.
    correctWord(r, levels(2, 3), '', levels(3)),
  ),
  b.dynamic('correct-spelling-easy', { difficulty: 1, tags: ['correctly spelt word'] }, (r) =>
    correctSpelling(r, levels(1)),
  ),
  b.dynamic('correct-spelling', { difficulty: 2, origin: 'past-paper', tags: ['correctly spelt word'] }, (r) =>
    correctSpelling(r, levels(2, 3)),
  ),
  b.dynamic('same-pattern', { difficulty: 2, tags: ['correctly spelt word'] }, (r) => {
    const rule = r.weighted(PATTERNS, [3, 2, 3, 3, 1]);
    return correctWord(
      r,
      SPELLING.filter((s) => s.r === rule),
      RULE_TIPS[rule],
    );
  }),
  b.dynamic('correct-pair', { difficulty: 3, tags: ['correctly spelt word', 'misspelt word'] }, (r) => {
    const [a, b2, ...rest] = pickEntries(r, levels(2, 3), 8) as [SpellingEntry, SpellingEntry, ...SpellingEntry[]];
    const wrongs: (readonly [string, SpellingEntry])[] = [];
    const distractors: string[] = [];
    for (let i = 0; i < 3; i++) {
      const good = rest[2 * i]!;
      const bad = rest[2 * i + 1]!;
      const m = r.pick(bad.x);
      wrongs.push([m, bad]);
      distractors.push(r.chance(0.5) ? `${good.w}, ${m}` : `${m}, ${good.w}`);
    }
    return {
      stem: PAIR_STEM,
      answer: `${a.w}, ${b2.w}`,
      distractors,
      explanation: `**${a.w}** (${a.n}) and **${b2.w}** (${b2.n}) are both spelt correctly. Each other option contains one misspelt word: ${corrections(wrongs)}.`,
    };
  }),

  // ------------------------------------------------------------ misspelt word
  b.dynamic('misspelt-word-easy', { difficulty: 1, tags: ['misspelt word'] }, (r) => misspeltWord(r, levels(1))),
  b.dynamic('misspelt-word', { difficulty: 2, origin: 'past-paper', tags: ['misspelt word'] }, (r) =>
    misspeltWord(r, levels(2)),
  ),
]);
