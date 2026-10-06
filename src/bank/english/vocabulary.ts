import { defineBank } from '@/engine/authoring';
import { pickDistractors } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';
import { entriesAtLevel, lexiconIssues, lookup } from './_lexicon';
import type { LexiconEntry, LexLevel } from './_lexicon';

// Fail loudly (the bank gate reports it) if the curated data ever becomes inconsistent.
const problems = lexiconIssues();
if (problems.length) throw new Error(`english/_lexicon is inconsistent:\n${problems.join('\n')}`);

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const q = (s: string) => `“${s}”`;
const HEAD = (e: LexiconEntry) => `**${e.word.toUpperCase()}**`;

/** Meaning of another headword of the same part of speech (distractors are headwords). */
const gloss = (word: string, pos: LexiconEntry['pos']): string => {
  const entry = lookup(word, pos);
  if (!entry) throw new Error(`No lexicon entry for ${pos} "${word}"`);
  return entry.meaning;
};

/** "Fragile means “easily broken or damaged”" for each unrelated distractor shown. */
const unrelated = (e: LexiconEntry, shown: readonly string[]): string =>
  shown.map((w) => `**${cap(w)}** means ${q(gloss(w.toLowerCase(), e.pos))}`).join('; ');

const POOL: Record<LexLevel, LexiconEntry[]> = {
  1: entriesAtLevel(1),
  2: entriesAtLevel(2),
  3: entriesAtLevel(3),
};

const SYNONYM_STEMS = [
  (w: string) => `Choose the word most nearly **similar** in meaning to ${w}:`,
  (w: string) => `Which of the following is a synonym of ${w}?`,
  (w: string) => `${w} most nearly means:`,
];
const ANTONYM_STEMS = [
  (w: string) => `Choose the word most nearly **opposite** in meaning to ${w}:`,
  (w: string) => `Which of the following is an antonym of ${w}?`,
  (w: string) => `The antonym of ${w} is:`,
];
const DEFINITION_STEMS = [
  (m: string) => `Which word means ${q(m)}?`,
  (m: string) => `Choose the word that best matches the definition ${q(m)}:`,
];
const MEANING_STEMS = [
  (w: string) => `What is the meaning of ${w}?`,
  (w: string) => `Choose the best definition of ${w}:`,
];
const PHRASE_STEMS = [
  (w: string) => `Choose the phrase most nearly **opposite** in meaning to ${w}:`,
  (w: string) => `Which phrase is most nearly the **antonym** of ${w}?`,
];

/** Word options: a synonym is correct; an antonym is the classic trap. */
function synonymQuestion(r: Rng, e: LexiconEntry): AuthoredQuestion {
  const syn = r.pick(e.synonyms);
  const answer = cap(syn);
  const trap = cap(r.pick(e.antonyms));
  const distractors = pickDistractors(answer, [trap, ...r.shuffle(e.distractors).map(cap)]);
  const others = e.synonyms.filter((s) => s !== syn);
  return {
    stem: r.pick(SYNONYM_STEMS)(HEAD(e)),
    answer,
    distractors,
    explanation:
      `**${cap(e.word)}** means ${q(e.meaning)}, so its synonym is **${answer}**` +
      `${others.length ? ` (also: ${others.join(', ')})` : ''}. ` +
      `**${trap}** is an antonym, the opposite meaning. ${unrelated(e, distractors.slice(1))}.`,
  };
}

/** Word options: an antonym is correct; a synonym is the classic trap. */
function antonymQuestion(r: Rng, e: LexiconEntry): AuthoredQuestion {
  const ant = r.pick(e.antonyms);
  const answer = cap(ant);
  const trap = cap(r.pick(e.synonyms));
  const distractors = pickDistractors(answer, [trap, ...r.shuffle(e.distractors).map(cap)]);
  const others = e.antonyms.filter((s) => s !== ant);
  return {
    stem: r.pick(ANTONYM_STEMS)(HEAD(e)),
    answer,
    distractors,
    explanation:
      `**${cap(e.word)}** means ${q(e.meaning)}; its opposite is **${answer}**` +
      `${others.length ? ` (also: ${others.join(', ')})` : ''}. ` +
      `**${trap}** is a synonym, not an antonym. ${unrelated(e, distractors.slice(1))}.`,
  };
}

/** "Which word means ...?" with the headword's antonym as the trap. */
function definitionToWord(r: Rng, e: LexiconEntry): AuthoredQuestion {
  const answer = cap(e.word);
  const trap = cap(r.pick(e.antonyms));
  const distractors = pickDistractors(answer, [trap, ...r.shuffle(e.distractors).map(cap)]);
  return {
    stem: r.pick(DEFINITION_STEMS)(e.meaning),
    answer,
    distractors,
    explanation:
      `**${answer}** means ${q(e.meaning)} (synonyms: ${e.synonyms.join(', ')}). ` +
      `**${trap}** means the opposite. ${unrelated(e, distractors.slice(1))}.`,
  };
}

/** "What is the meaning of WORD?" with the opposite definition as the trap. */
function wordToDefinition(r: Rng, e: LexiconEntry): AuthoredQuestion {
  const shown = r.shuffle(e.distractors);
  const distractors = pickDistractors(e.meaning, [e.opposite, ...shown.map((w) => gloss(w, e.pos))]);
  const used = shown.filter((w) => distractors.includes(gloss(w, e.pos))).slice(0, 2);
  return {
    stem: r.pick(MEANING_STEMS)(HEAD(e)),
    answer: e.meaning,
    distractors,
    explanation:
      `**${cap(e.word)}** means ${q(e.meaning)} (synonyms: ${e.synonyms.join(', ')}). ` +
      `${q(e.opposite)} is the opposite, describing words such as ${e.antonyms.join(' and ')}. ` +
      `The other options define ${used.map((w) => `**${w}**`).join(' and ')}.`,
  };
}

/** SAT/NUST-style antonym whose options are short definitional phrases. */
function antonymPhrase(r: Rng, e: LexiconEntry): AuthoredQuestion {
  const shown = r.shuffle(e.distractors);
  const distractors = pickDistractors(e.opposite, [e.meaning, ...shown.map((w) => gloss(w, e.pos))]);
  const used = shown.filter((w) => distractors.includes(gloss(w, e.pos))).slice(0, 2);
  return {
    stem: r.pick(PHRASE_STEMS)(HEAD(e)),
    answer: e.opposite,
    distractors,
    explanation:
      `**${cap(e.word)}** means ${q(e.meaning)}, so its opposite is ${q(e.opposite)}, ` +
      `the sense of antonyms such as ${e.antonyms.join(' and ')}. ` +
      `${q(e.meaning)} restates the word's own meaning (a synonym trap); ` +
      `the other options define ${used.map((w) => `**${w}**`).join(' and ')}, which are unrelated.`,
  };
}

const pickAt = (r: Rng, level: LexLevel) => r.pick(POOL[level]);

export default defineBank('english', 'vocabulary', (b) => [
  // ------------------------------------------------------------------ synonyms
  b.dynamic('synonym-common', { difficulty: 1, origin: 'past-paper', tags: ['synonyms'] }, (r) =>
    synonymQuestion(r, pickAt(r, 1)),
  ),
  b.dynamic('synonym', { difficulty: 2, origin: 'past-paper', tags: ['synonyms'] }, (r) =>
    synonymQuestion(r, pickAt(r, 2)),
  ),

  // ------------------------------------------------------------------ antonyms
  b.dynamic('antonym-common', { difficulty: 1, origin: 'past-paper', tags: ['antonyms'] }, (r) =>
    antonymQuestion(r, pickAt(r, 1)),
  ),
  b.dynamic('antonym', { difficulty: 2, origin: 'past-paper', tags: ['antonyms'] }, (r) =>
    antonymQuestion(r, pickAt(r, 2)),
  ),

  // ------------------------------------------------------------------ advanced synonym / antonym
  b.dynamic('synonym-antonym-advanced', { difficulty: 3, tags: ['synonyms', 'antonyms'] }, (r) => {
    const e = pickAt(r, 3);
    return r.chance(0.5) ? synonymQuestion(r, e) : antonymQuestion(r, e);
  }),

  // ------------------------------------------------------------------ word meaning
  b.dynamic('definition-to-word-common', { difficulty: 1, tags: ['word meaning'] }, (r) =>
    definitionToWord(r, pickAt(r, 1)),
  ),
  b.dynamic('definition-to-word', { difficulty: 2, tags: ['word meaning'] }, (r) =>
    definitionToWord(r, pickAt(r, 2)),
  ),
  b.dynamic('word-to-definition-common', { difficulty: 1, tags: ['word meaning'] }, (r) =>
    wordToDefinition(r, pickAt(r, 1)),
  ),
  b.dynamic('word-to-definition', { difficulty: 2, tags: ['word meaning'] }, (r) =>
    wordToDefinition(r, pickAt(r, 2)),
  ),
  b.dynamic('word-meaning-advanced', { difficulty: 3, tags: ['word meaning'] }, (r) => {
    const e = pickAt(r, 3);
    return r.chance(0.5) ? definitionToWord(r, e) : wordToDefinition(r, e);
  }),

  // ------------------------------------------------------------------ SAT-style antonym phrases
  b.dynamic('antonym-phrase-common', { difficulty: 1, tags: ['antonym phrases', 'antonyms'] }, (r) =>
    antonymPhrase(r, pickAt(r, 1)),
  ),
  b.dynamic(
    'antonym-phrase',
    { difficulty: 2, origin: 'past-paper', tags: ['antonym phrases', 'antonyms'] },
    (r) => antonymPhrase(r, pickAt(r, 2)),
  ),
  b.dynamic('antonym-phrase-advanced', { difficulty: 3, tags: ['antonym phrases', 'antonyms'] }, (r) =>
    antonymPhrase(r, pickAt(r, 3)),
  ),
]);
