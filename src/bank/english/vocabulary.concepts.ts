import { defineBank } from '@/engine/authoring';
import type { Builder } from '@/engine/authoring';
import { pickDistractors } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion, Difficulty, Origin } from '@/engine/types';
import { LEXICON_NV } from './_lexicon-nv';
import type { NvEntry } from './_lexicon-nv';

/**
 * English, chapter "Vocabulary: Synonyms and Antonyms": PART B (nouns and verbs).
 * Part A (`vocabulary.ts`) works from the adjective lexicon `_lexicon.ts`; this file draws only
 * on the noun/verb lexicon `_lexicon-nv.ts`. Every local id here starts with `c-`.
 *
 * Difficulty follows the headword level: easy templates use level-1 words, typical templates
 * level-2 words and hard templates level-3 words, so the same question type spans the range.
 */

const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

const withLevels = (...levels: number[]): readonly NvEntry[] => {
  const pool = LEXICON_NV.filter((e) => levels.includes(e.level));
  if (pool.length < 10) throw new Error(`vocabulary.concepts: only ${pool.length} entries at ${levels}`);
  return pool;
};

const L1 = withLevels(1);
const L2 = withLevels(2);
const L3 = withLevels(3);
const L12 = withLevels(1, 2);
const L23 = withLevels(2, 3);

const wordsOf = (e: NvEntry): Set<string> =>
  new Set([e.word, ...e.synonyms, ...e.antonyms].map((w) => w.toLowerCase()));

/**
 * True when `b` can safely supply a distractor (its headword or one of its definitions) for a
 * question on `a`: same part of speech, a different semantic group, no shared synonym/antonym and
 * not listed in either entry's `avoid` list.
 */
function unrelated(a: NvEntry, b: NvEntry): boolean {
  if (a.word === b.word || a.pos !== b.pos || a.group === b.group) return false;
  if (a.avoid?.includes(b.word) || b.avoid?.includes(a.word)) return false;
  const wa = wordsOf(a);
  for (const w of wordsOf(b)) if (wa.has(w)) return false;
  return true;
}

/** `n` entries that are safe sources of distractors for `e`. */
function othersFor(r: Rng, e: NvEntry, n: number): NvEntry[] {
  const ok = LEXICON_NV.filter((o) => unrelated(e, o));
  if (ok.length < n) throw new Error(`vocabulary.concepts: too few unrelated entries for ${e.word}`);
  return r.sample(ok, n);
}

/** The sentence with the headword in bold and the final full stop removed (it sits inside quotes). */
function marked(e: NvEntry): string {
  const re = new RegExp(`\\b${e.word}\\b`, 'i');
  if (!re.test(e.sentence)) throw new Error(`vocabulary.concepts: "${e.word}" missing from its sentence`);
  return e.sentence.replace(re, (m) => `**${m}**`).replace(/\.$/, '');
}

const gloss = (e: NvEntry): string => `**${cap(e.word)}** (${e.pos}) means "${e.meaning}".`;

const head = (e: NvEntry): string => `**${e.word.toUpperCase()}**`;

interface Spec {
  id: string;
  difficulty: Difficulty;
  origin: Origin;
  pool: readonly NvEntry[];
}

/** Synonym MCQ: one synonym is right; `trap` adds an antonym as the most tempting wrong option. */
function synonymTemplate(b: Builder, s: Spec, trap: boolean) {
  return b.dynamic(s.id, { difficulty: s.difficulty, origin: s.origin, tags: ['synonyms'] }, (r): AuthoredQuestion => {
    const e = r.pick(s.pool);
    const answer = cap(r.pick(e.synonyms));
    const opposite = cap(r.pick(e.antonyms));
    const curated = r.shuffle(e.distractors).map(cap);
    const stem = r.pick([
      `Choose the word most nearly **similar** in meaning to ${head(e)}:`,
      `Which word is closest in meaning to ${head(e)}?`,
    ]);
    return {
      stem,
      answer,
      distractors: pickDistractors(answer, trap ? [opposite, ...curated] : curated),
      explanation: trap
        ? `${gloss(e)} ${answer} has the same meaning. ${opposite} is the trap: it means the opposite.`
        : `${gloss(e)} ${answer} has the same meaning; the other words are unrelated.`,
    };
  });
}

/** Antonym MCQ: one antonym is right; `trap` adds a synonym as the most tempting wrong option. */
function antonymTemplate(b: Builder, s: Spec, trap: boolean) {
  return b.dynamic(s.id, { difficulty: s.difficulty, origin: s.origin, tags: ['antonyms'] }, (r): AuthoredQuestion => {
    const e = r.pick(s.pool);
    const answer = cap(r.pick(e.antonyms));
    const same = cap(r.pick(e.synonyms));
    const curated = r.shuffle(e.distractors).map(cap);
    const stem = r.pick([
      `Choose the word most nearly **opposite** in meaning to ${head(e)}:`,
      `Which word is the best antonym of ${head(e)}?`,
    ]);
    return {
      stem,
      answer,
      distractors: pickDistractors(answer, trap ? [same, ...curated] : curated),
      explanation: trap
        ? `${gloss(e)} Its opposite is ${answer}. ${same} is the trap: it is a synonym, not an antonym.`
        : `${gloss(e)} Its opposite is ${answer}; the other words are unrelated.`,
    };
  });
}

export default defineBank('english', 'vocabulary', (b) => [
  // ---------------------------------------------------------------- synonyms (nouns and verbs)
  synonymTemplate(b, { id: 'c-synonym-easy', difficulty: 1, origin: 'past-paper', pool: L1 }, false),
  synonymTemplate(b, { id: 'c-synonym', difficulty: 2, origin: 'past-paper', pool: L2 }, true),
  synonymTemplate(b, { id: 'c-synonym-advanced', difficulty: 3, origin: 'original', pool: L3 }, true),

  // ---------------------------------------------------------------- antonyms (nouns and verbs)
  antonymTemplate(b, { id: 'c-antonym-easy', difficulty: 1, origin: 'original', pool: L1 }, false),
  antonymTemplate(b, { id: 'c-antonym', difficulty: 2, origin: 'past-paper', pool: L2 }, true),
  antonymTemplate(b, { id: 'c-antonym-advanced', difficulty: 3, origin: 'original', pool: L3 }, true),

  // ---------------------------------------------------------------- word in context
  b.dynamic('c-in-context', { difficulty: 2, origin: 'original', tags: ['word meaning', 'synonyms'] }, (r) => {
    const e = r.pick(L23);
    const answer = cap(r.pick(e.synonyms));
    const opposite = cap(r.pick(e.antonyms));
    return {
      stem: `In the sentence "${marked(e)}", the word **${e.word}** most nearly means:`,
      answer,
      distractors: pickDistractors(answer, [opposite, ...r.shuffle(e.distractors).map(cap)]),
      explanation: `In this sentence **${e.word}** (${e.pos}) means "${e.meaning}", so ${answer} is the closest meaning. ${opposite} means the opposite.`,
    };
  }),

  b.dynamic('c-context-opposite', { difficulty: 1, origin: 'original', tags: ['antonyms'] }, (r) => {
    const e = r.pick(L1);
    const answer = cap(r.pick(e.antonyms));
    const same = cap(r.pick(e.synonyms));
    return {
      stem: `In the sentence "${marked(e)}", which word is most nearly **opposite** in meaning to **${e.word}**?`,
      answer,
      distractors: pickDistractors(answer, [same, ...r.shuffle(e.distractors).map(cap)]),
      explanation: `Here **${e.word}** (${e.pos}) means "${e.meaning}". ${answer} is its opposite; ${same} is a synonym.`,
    };
  }),

  // ---------------------------------------------------------------- word meaning (definitional options)
  b.dynamic('c-word-meaning', { difficulty: 1, origin: 'original', tags: ['word meaning'] }, (r) => {
    // Level-1 headwords only: defining a level-2 word is a d2 task (see c-antonym-phrase).
    const e = r.pick(L1);
    const others = othersFor(r, e, 2);
    return {
      stem: `The word ${head(e)} (${e.pos}) means:`,
      answer: cap(e.meaning),
      distractors: pickDistractors(cap(e.meaning), [e.opposite, ...others.map((o) => o.meaning)].map(cap)),
      explanation: `${gloss(e)} For example: "${e.sentence}" The option "${cap(e.opposite)}" gives the opposite meaning.`,
    };
  }),

  b.dynamic('c-antonym-phrase', { difficulty: 2, origin: 'past-paper', tags: ['antonym phrases', 'antonyms'] }, (r) => {
    const e = r.pick(L23);
    const others = othersFor(r, e, 2);
    const answer = cap(e.opposite);
    return {
      stem: `Choose the option that is most nearly **opposite** in meaning to ${head(e)}:`,
      answer,
      distractors: pickDistractors(answer, [e.meaning, ...others.map((o) => o.meaning)].map(cap)),
      explanation: `${gloss(e)} The opposite is "${answer}" (for example, ${cap(e.antonyms[0] as string)}). The option "${cap(e.meaning)}" is the trap: it is the meaning of the word itself.`,
    };
  }),

  b.dynamic('c-word-for-meaning', { difficulty: 2, origin: 'original', tags: ['word meaning'] }, (r) => {
    const e = r.pick(L23);
    const others = othersFor(r, e, 2);
    const answer = cap(e.word);
    const opposite = cap(r.pick(e.antonyms));
    return {
      stem: `Which ${e.pos} means "${e.meaning}"?`,
      answer,
      distractors: pickDistractors(answer, [opposite, ...others.map((o) => cap(o.word))]),
      explanation: `${gloss(e)} ${opposite} means the opposite. ${others
        .map((o) => `${cap(o.word)} means "${o.meaning}"`)
        .join('; ')}.`,
    };
  }),

  // ---------------------------------------------------------------- pairs
  b.dynamic('c-pair', { difficulty: 1, origin: 'original', tags: ['synonyms', 'antonyms'] }, (r) => {
    const wantOpposite = r.chance(0.5);
    // The correct pair uses a common (level-1) word; the three other entries share no word with
    // it or with each other, so no option repeats a word (e.g. "Harmony : Discord" beside
    // "Discord : Harmony").
    const e = r.pick(L1);
    const picked: NvEntry[] = [e];
    for (const o of r.shuffle(L12)) {
      const wo = wordsOf(o);
      if (picked.some((p) => [...wordsOf(p)].some((w) => wo.has(w)))) continue;
      picked.push(o);
      if (picked.length === 4) break;
    }
    if (picked.length < 4) throw new Error(`vocabulary.concepts: too few disjoint pair entries for ${e.word}`);
    const [o1, o2, o3] = picked.slice(1) as [NvEntry, NvEntry, NvEntry];
    const pair = (a: string, z: string): string => `${cap(a)} : ${cap(z)}`;
    const partner = r.pick(wantOpposite ? e.antonyms : e.synonyms);
    const answer = pair(e.word, partner);
    // Two pairs of the other relation and one pair of unrelated words: all definitely wrong.
    const wrong = [
      ...[o1, o2].map((o) => pair(o.word, r.pick(wantOpposite ? o.synonyms : o.antonyms))),
      pair(o3.word, r.pick(o3.distractors)),
    ];
    return {
      stem: wantOpposite
        ? 'Which pair consists of words that are **opposite** in meaning?'
        : 'Which pair consists of words that are **similar** in meaning?',
      answer,
      distractors: pickDistractors(answer, wrong),
      explanation: `${gloss(e)} ${cap(partner)} means ${wantOpposite ? 'the opposite' : 'the same'}, so the pair ${answer} is correct. In ${wrong[0]} and in ${wrong[1]} the words are ${wantOpposite ? 'synonyms' : 'antonyms'}; in ${wrong[2]} they are unrelated.`,
    };
  }),
]);
