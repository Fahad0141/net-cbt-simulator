import { defineBank, type CompactMcq } from '@/engine/authoring';
import type { Difficulty } from '@/engine/types';

/**
 * English, chapter "Grammar and Sentence Correction": PART B (sentence-level correction).
 * Part A (`grammar.ts`) holds the remaining grammar items. Every local id here starts with `c-`.
 *
 * Three original formats, each built from a small data record:
 *
 * - `sentence`: "Choose the grammatically correct sentence". Exactly one option is standard
 *   British/Pakistani English; every distractor contains a definite, common error (agreement,
 *   tense, preposition, article, pronoun case, modifier, parallelism, redundancy, word order).
 * - `replace`: "Choose the best replacement for the underlined part". The sentence carries one
 *   `__underlined__` part; the original wording may appear as a (wrong) option, as on the SAT.
 * - `error`: "Which underlined part contains an error?". The sentence carries exactly four
 *   underlined parts; the options are those parts and exactly one of them is wrong.
 *
 * Items avoid usages on which standard references disagree (singular "they", collective nouns
 * with plural verbs, "different to", "than me", split infinitives), so that no distractor is
 * arguably right.
 */

type Kind = 'sentence' | 'replace' | 'error';

interface Item {
  id: string;
  d: Difficulty;
  /** `sentence` (default), `replace` or `error`. */
  k?: Kind;
  /** `replace` / `error`: the sentence with `__underlined__` parts. `sentence`: optional custom stem. */
  s?: string;
  /** Correct option (for `error`: the text of the wrong underlined part). */
  a: string;
  /** Three wrong options (omitted for `error`: they are the other underlined parts). */
  x?: readonly [string, string, string];
  e: string;
  t: readonly string[];
  /** Mirrors a recurring NET theme. */
  pp?: true;
}

const UNDERLINE = /__(.+?)__/g;

function toMcq(item: Item): CompactMcq {
  const kind: Kind = item.k ?? 'sentence';
  const tags = item.t.includes('sentence correction') ? item.t : [...item.t, 'sentence correction'];
  const base = { id: item.id, d: item.d, e: item.e, t: tags, ...(item.pp ? { o: 'past-paper' as const } : {}) };
  if (kind === 'sentence') {
    if (!item.x) throw new Error(`grammar/${item.id}: missing distractors`);
    return { ...base, q: item.s ?? 'Choose the grammatically correct sentence:', a: item.a, x: item.x };
  }
  const sentence = item.s;
  if (!sentence) throw new Error(`grammar/${item.id}: missing sentence`);
  const parts = [...sentence.matchAll(UNDERLINE)].map((m) => m[1]!);
  if (kind === 'replace') {
    if (parts.length !== 1) throw new Error(`grammar/${item.id}: expected exactly one underlined part`);
    if (!item.x) throw new Error(`grammar/${item.id}: missing distractors`);
    return { ...base, q: `Choose the best replacement for the underlined part:\n\n${sentence}`, a: item.a, x: item.x };
  }
  if (parts.length !== 4) throw new Error(`grammar/${item.id}: expected exactly four underlined parts`);
  const wrong = parts.filter((p) => p !== item.a);
  if (wrong.length !== 3) throw new Error(`grammar/${item.id}: the answer must be exactly one underlined part`);
  return {
    ...base,
    q: `Which underlined part of the sentence contains an error?\n\n${sentence}`,
    a: item.a,
    x: [wrong[0]!, wrong[1]!, wrong[2]!],
  };
}

// ------------------------------------------------------------------ subject-verb agreement

const AGREEMENT: readonly Item[] = [
  {
    id: 'c-agree-box-of-pens', d: 1, pp: true, t: ['subject-verb agreement'],
    a: "The box of pens was left on the teacher's desk.",
    x: [
      "The box of pens were left on the teacher's desk.",
      "The box of pens are left on the teacher's desk.",
      "The box of pens have been left on the teacher's desk.",
    ],
    e: 'The subject is "box" (singular); "of pens" is only a prepositional phrase and does not change the number of the verb, so the singular "was" is required.',
  },
  {
    id: 'c-agree-neither-nor', d: 2, pp: true, t: ['subject-verb agreement'],
    a: 'Neither the manager nor the clerks were aware of the change.',
    x: [
      'Neither the manager nor the clerks was aware of the change.',
      'Neither the manager or the clerks were aware of the change.',
      'Neither the manager nor the clerks has been aware of the change.',
    ],
    e: 'With "neither ... nor" the verb agrees with the nearer subject ("the clerks", plural), so "were" is correct. "Neither" pairs with "nor", never "or".',
  },
  {
    id: 'c-agree-each-of', d: 1, t: ['subject-verb agreement'],
    a: 'Each of the students has submitted the assignment.',
    x: [
      'Each of the students have submitted the assignment.',
      'Each of the student has submitted the assignment.',
      'Each of the students have submit the assignment.',
    ],
    e: '"Each" is the singular subject, so it takes "has"; "each of" is followed by a plural noun ("the students").',
  },
  {
    id: 'c-agree-there-are', d: 1, t: ['subject-verb agreement'],
    a: 'There are two reasons for the delay.',
    x: [
      'There is two reasons for the delay.',
      'There are two reason for the delay.',
      'There have two reasons for the delay.',
    ],
    e: 'In a "there + be" sentence the verb agrees with the noun that follows: "two reasons" is plural, so "There are" is correct.',
  },
  {
    id: 'c-agree-along-with', d: 2, pp: true, t: ['subject-verb agreement', 'prepositions'],
    a: 'The captain, along with his players, was greeted at the airport.',
    x: [
      'The captain, along with his players, were greeted at the airport.',
      'The captain, along with his players, have been greeted at the airport.',
      'The captain, along with his players, was greeted on the airport.',
    ],
    e: 'Phrases such as "along with", "together with" and "as well as" do not make a subject plural; the subject is "the captain", so "was" is correct, and one arrives or is greeted "at" an airport.',
  },
  {
    id: 'c-agree-mathematics', d: 2, t: ['subject-verb agreement'],
    a: 'Mathematics is the subject that most students fear.',
    x: [
      'Mathematics are the subject that most students fear.',
      'Mathematics is the subject that most students fears.',
      'Mathematics is the subject which most students fear it.',
    ],
    e: 'Names of subjects ending in -s (mathematics, physics, economics) are singular, so "is"; inside the clause the subject is "most students" (plural), so "fear", and the relative pronoun already stands for the object, so "it" is redundant.',
  },
  {
    id: 'c-agree-number-of', d: 2, t: ['subject-verb agreement'],
    a: 'The number of applicants has increased this year.',
    x: [
      'The number of applicants have increased this year.',
      'The number of applicant has increased this year.',
      'The number of applicants are increased this year.',
    ],
    e: '"The number of ..." means one figure and takes a singular verb ("has increased"), whereas "a number of ..." means "many" and takes a plural verb. The noun after "of" stays plural ("applicants").',
  },
  {
    id: 'c-err-news-were', d: 2, k: 'error', t: ['subject-verb agreement'],
    s: 'The news __about the floods__ __were__ broadcast __on every channel__ __throughout the day__.',
    a: 'were',
    e: '"News" is an uncountable noun and takes a singular verb: "The news about the floods was broadcast ...".',
  },
];

// ------------------------------------------------------------------ tenses and tense consistency

const TENSES: readonly Item[] = [
  {
    id: 'c-tense-since', d: 1, pp: true, t: ['tenses', 'prepositions'],
    a: 'She has lived in Lahore since 2015.',
    x: [
      'She is living in Lahore since 2015.',
      'She lives in Lahore since 2015.',
      'She has lived in Lahore for 2015.',
    ],
    e: 'An action that began in the past and continues now takes the present perfect ("has lived"); "since" is used with a point of time (2015) and "for" with a period (five years).',
  },
  {
    id: 'c-tense-third-conditional', d: 2, pp: true, t: ['tenses'],
    a: 'If I had known about the test, I would have prepared for it.',
    x: [
      'If I would have known about the test, I would have prepared for it.',
      'If I had known about the test, I will have prepared for it.',
      'If I have known about the test, I would have prepared for it.',
    ],
    e: 'An unreal past condition (third conditional) takes "if + had + past participle" in the if-clause and "would have + past participle" in the main clause. "Would have" belongs only in the main clause, never in the if-clause.',
  },
  {
    id: 'c-tense-yesterday', d: 1, t: ['tenses'],
    a: 'I met him at the station yesterday.',
    x: [
      'I have met him at the station yesterday.',
      'I meet him at the station yesterday.',
      'I was meet him at the station yesterday.',
    ],
    e: 'A finished past time ("yesterday") requires the simple past ("met"); the present perfect cannot be used with a definite past time expression.',
  },
  {
    id: 'c-tense-hardly-when', d: 3, t: ['tenses', 'sentence correction'],
    a: 'Hardly had we reached the station when the train left.',
    x: [
      'Hardly had we reached the station than the train left.',
      'Hardly we had reached the station when the train left.',
      'Hardly had we reached the station then the train left.',
    ],
    e: '"Hardly" (like "scarcely") is followed by "when", and when it opens the sentence the subject and auxiliary are inverted: "Hardly had we reached ... when ...". "Than" belongs with "no sooner".',
  },
  {
    id: 'c-tense-no-sooner', d: 2, k: 'replace', pp: true, t: ['tenses', 'sentence correction'],
    s: 'No sooner __did the guests arrive when__ the lights went out.',
    a: 'had the guests arrived than',
    x: ['had the guests arrived when', 'the guests had arrived than', 'did the guests arrived than'],
    e: '"No sooner" is always followed by "than", and in the opening position it takes inversion: "No sooner had the guests arrived than the lights went out." "When" belongs with "hardly/scarcely", and "did" must be followed by the base form ("arrive"), not "arrived".',
  },
  {
    id: 'c-tense-reported-would', d: 2, k: 'replace', t: ['tenses'],
    s: 'He told me that he __will meet__ me the next day.',
    a: 'would meet',
    x: ['will meet', 'has met', 'meets'],
    e: 'In reported speech after a past reporting verb ("told"), "will" shifts back to "would", matching "the next day": "He told me that he would meet me the next day."',
  },
  {
    id: 'c-tense-future-perfect', d: 2, k: 'replace', t: ['tenses'],
    s: 'By the end of next year, she __completes__ her degree.',
    a: 'will have completed',
    x: ['has completed', 'had completed', 'will completed'],
    e: '"By + a future time" marks an action finished before that time, which needs the future perfect: "will have completed".',
  },
  {
    id: 'c-tc-narrative-shift', d: 2, t: ['tenses', 'sentence correction'],
    a: 'He entered the room, looked around and sat down.',
    x: [
      'He entered the room, looks around and sat down.',
      'He enters the room, looked around and sat down.',
      'He entered the room, looked around and sits down.',
    ],
    e: 'A sequence of past actions keeps one tense throughout: "entered, looked, sat". Switching between past and present in the same series is a tense-consistency error.',
  },
  {
    id: 'c-tc-had-already-started', d: 2, k: 'replace', t: ['tenses'],
    s: 'When we reached the cinema, the film __already started__.',
    a: 'had already started',
    x: ['already started', 'has already started', 'was already start'],
    e: 'Of two past actions, the earlier one takes the past perfect: the film started before we reached the cinema, so "the film had already started".',
  },
  {
    id: 'c-err-since-five-years', d: 1, k: 'error', t: ['tenses', 'prepositions'],
    s: 'She __has been__ working __in__ this office __since__ five years __now__.',
    a: 'since',
    e: '"Five years" is a period of time, so it takes "for": "She has been working in this office for five years now." "Since" is used with a starting point (since 2020).',
  },
];

// ------------------------------------------------------------------ prepositions

const PREPOSITIONS: readonly Item[] = [
  {
    id: 'c-prep-married-to', d: 1, k: 'error', pp: true, t: ['prepositions'],
    s: 'My cousin __is__ married __with__ a doctor __who__ works __in__ Karachi.',
    a: 'with',
    e: 'The fixed expression is "married to" someone: "My cousin is married to a doctor who works in Karachi." "Married with" is a common error.',
  },
  {
    id: 'c-prep-prefer-to', d: 2, t: ['prepositions'],
    a: 'I prefer tea to coffee.',
    x: ['I prefer tea than coffee.', 'I prefer tea from coffee.', 'I prefer tea more than coffee.'],
    e: '"Prefer" is followed by "to" when two things are compared ("prefer A to B"); "than" and "more than" are wrong because "prefer" already expresses the comparison.',
  },
  {
    id: 'c-prep-superior-to', d: 2, k: 'error', t: ['prepositions'],
    s: '__In__ terms of fuel economy, the new engine __is__ far superior __than__ the one __it__ replaced.',
    a: 'than',
    e: 'Latin comparatives such as superior, inferior, senior, junior and prior take "to", not "than": "far superior to the one it replaced".',
  },
  {
    id: 'c-prep-discuss', d: 2, pp: true, t: ['prepositions'],
    a: 'We discussed the problem at length.',
    x: [
      'We discussed about the problem at length.',
      'We discussed on the problem at length.',
      'We discussed over the problem at length.',
    ],
    e: '"Discuss" is a transitive verb and takes a direct object with no preposition: "discussed the problem" (but "a discussion about the problem").',
  },
  {
    id: 'c-prep-comprises', d: 3, k: 'replace', t: ['prepositions'],
    s: 'The course __comprises of__ six modules.',
    a: 'comprises',
    x: ['comprises of', 'is comprised from', 'comprises in'],
    e: '"Comprise" means "consist of" and takes a direct object with no preposition: "The course comprises six modules." Adding "of" is a common error.',
  },
  {
    id: 'c-prep-angry-with', d: 1, k: 'replace', t: ['prepositions'],
    s: 'The teacher was angry __on__ the boy for coming late.',
    a: 'with',
    x: ['on', 'to', 'from'],
    e: 'One is "angry with" a person (and "angry about" a thing): "The teacher was angry with the boy for coming late."',
  },
  {
    id: 'c-prep-on-date-in-month', d: 1, t: ['prepositions'],
    a: "My birthday is on 5 May, and my sister's is in June.",
    x: [
      "My birthday is in 5 May, and my sister's is on June.",
      "My birthday is at 5 May, and my sister's is in June.",
      "My birthday is on 5 May, and my sister's is at June.",
    ],
    e: 'A day or date takes "on" (on 5 May, on Monday), while a month, season or year on its own takes "in" (in June, in 2025). "At" is used with clock times (at 9 a.m.).',
  },
  {
    id: 'c-prep-abstain-from', d: 2, k: 'replace', t: ['prepositions'],
    s: 'The members decided to abstain __for__ voting on the resolution.',
    a: 'from',
    x: ['for', 'of', 'to'],
    e: 'The verb "abstain" is always followed by "from": "abstain from voting".',
  },
];

// ------------------------------------------------------------------ articles

const ARTICLES: readonly Item[] = [
  {
    id: 'c-art-an-honour-a-european', d: 1, pp: true, t: ['articles'],
    a: 'It was an honour to meet a European scientist.',
    x: [
      'It was a honour to meet a European scientist.',
      'It was an honour to meet an European scientist.',
      'It was a honour to meet an European scientist.',
    ],
    e: 'The article depends on the first sound, not the letter: "honour" begins with a vowel sound (silent h), so "an honour"; "European" begins with a "y" sound, so "a European".',
  },
  {
    id: 'c-art-the-superlative', d: 1, k: 'replace', t: ['articles', 'modifiers'],
    s: 'She is __most intelligent__ student in the class.',
    a: 'the most intelligent',
    x: ['most intelligent', 'the more intelligent', 'a more intelligent'],
    e: 'A superlative that singles out one member of a group takes "the": "the most intelligent student in the class". The comparative "more" is used only for two.',
  },
  {
    id: 'c-art-the-sun', d: 1, t: ['articles'],
    a: 'The sun rises in the east.',
    x: ['Sun rises in the east.', 'The sun rises in east.', 'A sun rises from the east.'],
    e: 'Unique objects (the sun, the moon) and compass directions used as places (the east) take "the"; the sun rises "in" the east.',
  },
  {
    id: 'c-art-advice-uncountable', d: 2, pp: true, t: ['articles'],
    a: 'He gave me some useful advice.',
    x: ['He gave me a useful advice.', 'He gave me some useful advices.', 'He gave me an useful advice.'],
    e: '"Advice" is uncountable: it takes no "a/an" and has no plural (say "some advice" or "a piece of advice"). "Useful" begins with a "y" sound in any case.',
  },
  {
    id: 'c-art-the-indus', d: 2, k: 'replace', t: ['articles'],
    s: 'We went boating on __Indus__ last summer.',
    a: 'the Indus',
    x: ['Indus', 'an Indus', 'a Indus'],
    e: 'Names of rivers, seas and oceans take the definite article: "the Indus", "the Arabian Sea".',
  },
  {
    id: 'c-err-an-european', d: 2, k: 'error', t: ['articles'],
    s: '__An__ European delegation __visited__ the factory __and__ praised __its__ safety record.',
    a: 'An',
    e: '"European" begins with a consonant "y" sound, so it takes "a": "A European delegation ...". "Its" (no apostrophe) is the correct possessive.',
  },
];

// ------------------------------------------------------------------ pronouns

const PRONOUNS: readonly Item[] = [
  {
    id: 'c-pron-between-you-and-me', d: 1, pp: true, t: ['pronouns'],
    a: 'This secret must remain between you and me.',
    x: [
      'This secret must remain between you and I.',
      'This secret must remain between you and myself.',
      'This secret must remain between I and you.',
    ],
    e: 'A pronoun after a preposition ("between") must be in the object case: "between you and me". "Myself" is reflexive and needs an antecedent "I" in the same clause.',
  },
  {
    id: 'c-pron-ali-and-i', d: 1, k: 'replace', t: ['pronouns'],
    s: 'Ali and __me__ went to the market.',
    a: 'I',
    x: ['me', 'myself', 'mine'],
    e: 'The pronoun is part of the subject of "went", so it takes the subject case: "Ali and I went". Test it alone: "I went", not "me went".',
  },
  {
    id: 'c-pron-enjoyed-themselves', d: 2, t: ['pronouns'],
    a: 'The children enjoyed themselves at the fair.',
    x: [
      'The children enjoyed at the fair.',
      'The children enjoyed theirselves at the fair.',
      'The children enjoyed themself at the fair.',
    ],
    e: '"Enjoy" is transitive and needs an object; when there is none, use the reflexive pronoun "themselves". "Theirselves" and (for a plural subject) "themself" are not standard.',
  },
  {
    id: 'c-pron-whom-object', d: 2, k: 'replace', t: ['pronouns'],
    s: 'The candidate __who__ we interviewed yesterday has accepted the offer.',
    a: 'whom',
    x: ['which', 'whose', 'what'],
    e: 'The relative pronoun is the object of "interviewed" (we interviewed him), and it refers to a person, so the formal object form "whom" is correct. "Which" is for things, "whose" shows possession and "what" cannot follow a noun.',
  },
  {
    id: 'c-pron-clear-reference', d: 3, t: ['pronouns'],
    s: 'Choose the sentence in which the pronoun reference is clear:',
    a: "Sara said to Hina, 'I have passed the exam.'",
    x: [
      'Sara told Hina that she had passed the exam.',
      'When Sara met Hina, she said that she had passed.',
      'Sara told Hina that she has passed the exam.',
    ],
    e: 'In each of the other sentences "she" could mean either Sara or Hina. Quoting Sara directly makes it clear that "I" is Sara.',
  },
  {
    id: 'c-pron-its-possessive', d: 1, k: 'error', t: ['pronouns'],
    s: "Every country __should__ protect __it's__ forests, __which__ provide clean air __and__ water.",
    a: "it's",
    e: 'The possessive of "it" is "its" (no apostrophe): "protect its forests". "It\'s" means "it is" or "it has". "Which" correctly refers to "forests", so the plural "provide" agrees with it.',
  },
  {
    id: 'c-pron-who-i-thought', d: 3, t: ['pronouns'],
    a: 'The man who I thought was honest cheated me.',
    x: [
      'The man whom I thought was honest cheated me.',
      'The man which I thought was honest cheated me.',
      'The man whom I thought he was honest cheated me.',
    ],
    e: '"I thought" is a parenthetical clause; the relative pronoun is the subject of "was honest" (he was honest), so the subject form "who" is needed. "Which" is not used for people, and "he" repeats the subject.',
  },
];

// ------------------------------------------------------------------ modifiers

const MODIFIERS: readonly Item[] = [
  {
    id: 'c-mod-dangling-walking', d: 2, pp: true, t: ['modifiers'],
    a: 'Walking along the beach, I found a beautiful shell.',
    x: [
      'Walking along the beach, a beautiful shell was found.',
      'Walking along the beach, a beautiful shell caught my eye.',
      'Walking along the beach, the shell that I found was beautiful.',
    ],
    e: 'An opening participle phrase must describe the subject that follows it. Only "I" can walk; in the other sentences the shell appears to be walking (a dangling modifier).',
  },
  {
    id: 'c-mod-having-finished', d: 2, k: 'replace', pp: true, t: ['modifiers'],
    s: 'Having finished the homework, __the television was switched on by Asad__.',
    a: 'Asad switched on the television',
    x: [
      'the television was switched on by Asad',
      'the television was switched on',
      'it was time for Asad to watch television',
    ],
    e: '"Having finished the homework" must be followed by the person who finished it, so "Asad" has to be the subject of the main clause; otherwise the modifier dangles.',
  },
  {
    id: 'c-mod-did-well', d: 1, t: ['modifiers'],
    a: 'He did well in the final examination.',
    x: [
      'He did good in the final examination.',
      'He did goodly in the final examination.',
      'He did more well in the final examination.',
    ],
    e: 'A verb is modified by an adverb: "did well" ("good" is an adjective). "Goodly" is an old-fashioned adjective meaning "considerable", not an adverb, and the comparative of "well" is "better", not "more well".',
  },
  {
    id: 'c-mod-double-comparative', d: 1, pp: true, t: ['modifiers'],
    a: 'This road is wider than that one.',
    x: [
      'This road is more wider than that one.',
      'This road is widest than that one.',
      'This road is more wide than that one.',
    ],
    e: 'Short adjectives form the comparative with -er ("wider"); "more wider" is a double comparative, and a superlative ("widest") cannot be followed by "than".',
  },
  {
    id: 'c-mod-can-hardly', d: 2, k: 'replace', t: ['modifiers'],
    s: "I __can't hardly__ hear you because of the noise.",
    a: 'can hardly',
    x: ["can't hardly", 'cannot hardly', "can't scarcely"],
    e: '"Hardly" and "scarcely" are already negative in meaning, so adding "not" makes a double negative: "I can hardly hear you."',
  },
  {
    id: 'c-err-more-careful', d: 1, k: 'error', t: ['modifiers'],
    s: 'She __drove__ __more__ __careful__ __after__ the accident.',
    a: 'careful',
    e: 'The word modifies the verb "drove", so it must be an adverb: "She drove more carefully after the accident."',
  },
  {
    id: 'c-err-the-best-of-two', d: 3, k: 'error', t: ['modifiers'],
    s: 'Of the two proposals, __the second__ is __the best__ __because__ it costs __less__.',
    a: 'the best',
    e: 'When only two things are compared, the comparative is used: "the second is the better". The superlative "best" needs three or more.',
  },
  {
    id: 'c-err-laid-down', d: 3, k: 'error', t: ['tenses'],
    s: 'After __lunch__, he __laid__ down __on__ the sofa __for an hour__.',
    a: 'laid',
    e: 'The intransitive verb "lie" (to recline) has the past tense "lay": "he lay down". "Laid" is the past of the transitive "lay" (to put something down).',
  },
];

// ------------------------------------------------------------------ parallelism and comparison

const PARALLELISM: readonly Item[] = [
  {
    id: 'c-par-likes-gerunds', d: 1, pp: true, t: ['parallelism'],
    a: 'She likes reading, writing and painting.',
    x: [
      'She likes reading, writing and to paint.',
      'She likes to read, writing and painting.',
      'She likes reading, to write and painting.',
    ],
    e: 'Items in a list must have the same grammatical form: three gerunds, "reading, writing and painting".',
  },
  {
    id: 'c-par-not-only-but-also', d: 2, k: 'replace', pp: true, t: ['parallelism'],
    s: 'He is __not only intelligent but also works hard__.',
    a: 'not only intelligent but also hard-working',
    x: [
      'not only intelligent but also works hard',
      'not only intelligent but also he works hard',
      'intelligent not only but also hard-working',
    ],
    e: '"Not only ... but also" must join elements of the same kind: two adjectives, "intelligent" and "hard-working".',
  },
  {
    id: 'c-par-either-or', d: 2, t: ['parallelism'],
    a: 'You can pay either in cash or by card.',
    x: [
      'You can pay either in cash or you can use a card.',
      'You can pay either in cash nor by card.',
      'You can pay either in cash or using of a card.',
    ],
    e: '"Either ... or" must join matching elements, here two prepositional phrases ("in cash", "by card"). "Either" pairs with "or", never "nor".',
  },
  {
    id: 'c-par-job-requires', d: 2, k: 'replace', t: ['parallelism'],
    s: 'The job requires patience, accuracy and __being able to work in a team__.',
    a: 'teamwork',
    x: ['being able to work in a team', 'to work in a team', 'working in team'],
    e: 'The list after "requires" consists of nouns ("patience, accuracy"), so the last item must also be a noun: "teamwork".',
  },
  {
    id: 'c-par-climate-comparison', d: 3, pp: true, t: ['parallelism', 'pronouns'],
    a: 'The climate of Murree is cooler than that of Lahore.',
    x: [
      'The climate of Murree is cooler than Lahore.',
      'The climate of Murree is cooler than those of Lahore.',
      'The climate of Murree is more cooler than that of Lahore.',
    ],
    e: 'A comparison must be between like things: climate with climate. "That of Lahore" stands for "the climate of Lahore" (singular, so "that", not "those"); comparing a climate with a city is illogical.',
  },
];

// ------------------------------------------------------------------ redundancy and word order

const STYLE: readonly Item[] = [
  {
    id: 'c-red-return-back', d: 1, pp: true, t: ['sentence correction', 'redundancy'],
    a: 'Please return the book by Friday.',
    x: [
      'Please return back the book by Friday.',
      'Please return the book back by Friday.',
      'Please return back the book until Friday.',
    ],
    e: '"Return" already means "give or come back", so "back" is redundant. A deadline takes "by", not "until".',
  },
  {
    id: 'c-red-reason-that', d: 2, k: 'replace', pp: true, t: ['sentence correction', 'redundancy'],
    s: 'The reason he was absent was __because he was ill__.',
    a: 'that he was ill',
    x: ['because he was ill', 'due to he was ill', 'because of he was ill'],
    e: '"The reason ... is/was" is completed by a "that" clause; "reason ... because" says the same thing twice. "Due to" and "because of" must be followed by a noun, not a clause.',
  },
  {
    id: 'c-red-in-my-opinion', d: 2, k: 'replace', t: ['sentence correction', 'redundancy'],
    s: '__In my opinion, I think__ the plan will fail.',
    a: 'In my opinion,',
    x: ['In my opinion, I think', 'In my opinion, I am thinking', 'According to my opinion, I think'],
    e: '"In my opinion" and "I think" express the same idea, so using both is redundant. "Think" in the sense of "believe" is not used in the continuous form.',
  },
  {
    id: 'c-wo-indirect-question', d: 2, pp: true, t: ['sentence correction', 'word order'],
    a: 'Can you tell me where the station is?',
    x: [
      'Can you tell me where is the station?',
      'Can you tell me where the station is it?',
      'Can you tell me the station where is?',
    ],
    e: 'An embedded (indirect) question uses statement word order, subject before verb: "where the station is", not the direct-question order "where is the station".',
  },
  {
    id: 'c-wo-adverb-frequency', d: 1, t: ['sentence correction', 'word order', 'modifiers'],
    a: 'He always comes to class on time.',
    x: [
      'He comes always to class on time.',
      'He always come to class on time.',
      'He always comes to class on the time.',
    ],
    e: 'An adverb of frequency ("always") goes before the main verb; the singular subject takes "comes"; the idiom is "on time" without an article.',
  },
  {
    id: 'c-wo-adjective-order', d: 2, t: ['sentence correction', 'word order', 'modifiers'],
    a: 'She bought a beautiful old wooden table.',
    x: [
      'She bought a wooden old beautiful table.',
      'She bought an old beautiful wooden table.',
      'She bought a beautiful wooden old table.',
    ],
    e: 'Adjectives before a noun follow the order opinion, size, age, shape, colour, origin, material: beautiful (opinion), old (age), wooden (material).',
  },
  {
    id: 'c-wo-not-only-inversion', d: 3, k: 'replace', t: ['sentence correction', 'word order'],
    s: 'Not only __he was late__, but he also forgot his notes.',
    a: 'was he late',
    x: ['he was late', 'did he late', 'he late was'],
    e: 'When a negative expression such as "not only" begins a clause, the subject and auxiliary are inverted: "Not only was he late, but he also forgot his notes."',
  },
  {
    id: 'c-wo-warm-enough', d: 1, t: ['sentence correction', 'word order', 'modifiers'],
    a: 'The water is warm enough to swim in.',
    x: [
      'The water is enough warm to swim in.',
      'The water is warm enough for swim in.',
      'The water is too warm enough to swim in.',
    ],
    e: '"Enough" follows an adjective ("warm enough") and is followed by a to-infinitive; "too" and "enough" cannot be used together.',
  },
];

const ITEMS: readonly Item[] = [
  ...AGREEMENT,
  ...TENSES,
  ...PREPOSITIONS,
  ...ARTICLES,
  ...PRONOUNS,
  ...MODIFIERS,
  ...PARALLELISM,
  ...STYLE,
];

export default defineBank('english', 'grammar', (b) => [b.mcqs(ITEMS.map(toMcq))]);
