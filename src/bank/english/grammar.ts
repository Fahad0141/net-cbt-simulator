import { defineBank, type CompactMcq } from '@/engine/authoring';
import type { Difficulty } from '@/engine/types';

/**
 * English, chapter "Grammar and Sentence Correction": PART A (grammar fill-ins).
 * Part B (`grammar.concepts.ts`) is a separate file. Every local id here starts with `gf-`.
 *
 * Each item is an original sentence with one blank (or two, answered as a pair "x ... y").
 * Exactly one option is correct in standard British/Pakistani usage; every distractor is a
 * real learner error (wrong tense, agreement, preposition, article, pronoun case, word form or
 * structure). Alternatives that are also acceptable in some usage (e.g. "between" for more than
 * two, "prefer X over Y", "died from") are deliberately kept out of the options.
 */

/**
 * The blank, rendered as an underlined run of non-breaking spaces (`__text__` is underline in the
 * rich-text format; a literal "____" would be parsed as an empty underline).
 */
const BLANK = `__${' '.repeat(10)}__`;

type Tag =
  | 'tenses'
  | 'subject-verb agreement'
  | 'prepositions'
  | 'articles'
  | 'pronouns'
  | 'modifiers'
  | 'parallelism'
  | 'sentence correction';

interface Item {
  id: string;
  d: Difficulty;
  /** Syllabus sub-topic. */
  t: Tag;
  /** The sentence; `___` marks each blank (one or two). */
  s: string;
  /** Answer; for two blanks write "first ... second". */
  a: string;
  x: readonly [string, string, string];
  e: string;
  /** Custom lead line (ending with ':'), replacing the default instruction. */
  q?: string;
  /** Mirrors a recurring NET theme. */
  pp?: true;
}

const LEAD_ONE = 'Choose the most suitable word or phrase to complete the sentence:';
const LEAD_TWO = 'Choose the most suitable pair of words to complete the sentence:';

/** Builds the stem for a sentence with one or two `___` blanks. */
function blankStem(sentence: string, lead?: string): string {
  const parts = sentence.split('___');
  const blanks = parts.length - 1;
  if (blanks < 1 || blanks > 2) throw new Error(`grammar: expected one or two blanks in "${sentence}"`);
  return `${lead ?? (blanks === 2 ? LEAD_TWO : LEAD_ONE)}\n\n${parts.join(BLANK)}`;
}

function toMcq(item: Item): CompactMcq {
  const blanks = item.s.split('___').length - 1;
  if (blanks === 0 && !item.q) throw new Error(`grammar/${item.id}: no blank and no custom stem`);
  if (blanks > 0) {
    for (const option of [item.a, ...item.x]) {
      if (option.split(' ... ').length !== blanks) {
        throw new Error(`grammar/${item.id}: option "${option}" does not match the ${blanks} blank(s)`);
      }
    }
  }
  return {
    id: item.id,
    d: item.d,
    q: blanks > 0 ? blankStem(item.s, item.q) : `${item.q}\n\n${item.s}`,
    a: item.a,
    x: item.x,
    e: item.e,
    t: [item.t],
    ...(item.pp ? { o: 'past-paper' as const } : {}),
  };
}

const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

// ------------------------------------------------------------------ tenses, conditionals, modals, voice

const VERBS: readonly Item[] = [
  {
    id: 'gf-habit-every-morning', d: 1, t: 'tenses', pp: true,
    s: 'My father ___ a walk in the park every morning.',
    a: 'takes', x: ['take', 'taking', 'have taken'],
    e: 'A daily habit ("every morning") takes the **present simple**, and a third-person singular subject ("my father") needs the -s form: **takes**. "Take" and "have taken" do not agree with "father", and "taking" is not a finite verb.',
  },
  {
    id: 'gf-raining-since', d: 1, t: 'tenses', pp: true,
    s: 'It ___ since yesterday evening, and the streets are now flooded.',
    a: 'has been raining', x: ['is raining', 'was raining', 'rains'],
    e: 'An action that began in the past ("since yesterday evening") and is still continuing takes the **present perfect continuous**: **has been raining**. "Since" cannot be used with the present continuous, the past continuous or the present simple in this sense.',
  },
  {
    id: 'gf-yesterday-visited', d: 1, t: 'tenses',
    s: 'We ___ the new museum yesterday, and it was fascinating.',
    a: 'visited', x: ['have visited', 'had visited', 'visit'],
    e: 'A finished past time ("yesterday") takes the **past simple**: **visited**. The present perfect cannot be used with a finished time expression, and the past perfect needs a second, later past action to refer back from.',
  },
  {
    id: 'gf-while-was-cooking', d: 1, t: 'tenses',
    s: 'While I ___ dinner last night, the lights suddenly went out.',
    a: 'was cooking', x: ['am cooking', 'have cooked', 'cook'],
    e: 'A longer action in progress in the past, interrupted by a short one ("the lights went out"), takes the **past continuous**: **was cooking**. "Last night" rules out every present form.',
  },
  {
    id: 'gf-just-finished', d: 1, t: 'tenses',
    s: 'I ___ my homework, so now I can watch television.',
    a: 'have just finished', x: ['just finish', 'had just finished', 'am just finishing'],
    e: 'A recently completed action with a present result ("so now I can watch") takes the **present perfect**: **have just finished**. The past perfect does not fit a present-time sentence, and an unfinished action ("am finishing") gives no reason to watch television now.',
  },
  {
    id: 'gf-past-perfect-passive', d: 2, t: 'tenses', pp: true,
    s: 'By the time the ambulance arrived, the injured man ___ to hospital by a passer-by.',
    a: 'had already been taken', x: ['has already been taken', 'was already taking', 'had already taken'],
    e: 'The taking happened **before** another past action (the ambulance arrived), so the **past perfect** is needed; the man did not take anyone, he was taken "by a passer-by", so it must be **passive**: **had already been taken**. "Had already taken" is active, and "has been taken" is present perfect.',
  },
  {
    id: 'gf-time-clause-arrive', d: 2, t: 'tenses', pp: true,
    s: 'I will call you as soon as I ___ in Islamabad.',
    a: 'arrive', x: ['will arrive', 'would arrive', 'arrived'],
    e: 'In a time clause (after "as soon as", "when", "before", "until") referring to the future, English uses the **present simple**, not "will": **arrive**. "Arrived" and "would arrive" are past forms that clash with "I will call".',
  },
  {
    id: 'gf-teaching-twenty-years', d: 2, t: 'tenses',
    s: 'Mr Rauf ___ English at this college for twenty years, and he still enjoys it.',
    a: 'has been teaching', x: ['is teaching', 'teaches', 'was teaching'],
    e: 'An activity that started in the past and continues now ("for twenty years", "still") takes the **present perfect continuous**: **has been teaching**. The present simple and present continuous cannot be used with "for + period" in this sense, and "was teaching" suggests he has stopped.',
  },
  {
    id: 'gf-will-have-worked', d: 2, t: 'tenses',
    s: 'By the end of this year, Ayesha ___ at the bank for ten years.',
    a: 'will have worked', x: ['will work', 'has worked', 'is working'],
    e: '"By + a future time" marks an action that will be complete up to that point: the **future perfect**, **will have worked**. "Will work" ignores the completed span, and "has worked" and "is working" are present tenses.',
  },
  {
    id: 'gf-high-time', d: 3, t: 'tenses', pp: true,
    s: 'The examinations begin next week, so it is high time we ___ for them.',
    a: 'started preparing', x: ['start preparing', 'will start preparing', 'have started preparing'],
    e: 'After "it is (high) time + subject", standard English uses the **past simple** with present meaning, implying the action is already overdue: **it is high time we started**. Present and future forms are the common error (the alternative structure is "it is high time for us to start").',
  },
  {
    id: 'gf-first-conditional', d: 1, t: 'tenses', pp: true,
    s: 'If it rains tomorrow, the match ___ postponed.',
    a: 'will be', x: ['would be', 'would have been', 'was'],
    e: 'A real future possibility takes the **first conditional**: If + present simple, **will** + verb. So: "If it rains tomorrow, the match **will be** postponed." "Would be" and "would have been" belong to the second and third conditionals.',
  },
  {
    id: 'gf-were-you', d: 2, t: 'tenses', pp: true,
    s: 'If I ___ you, I would apologise to her at once.',
    a: 'were', x: ['am', 'will be', 'would be'],
    e: 'An imaginary present situation takes the **second conditional**: If + past (subjunctive **were** for every person), would + verb. "If I were you" is the standard form; "am" and "will be" are real-condition forms, and "would" never goes in the if-clause.',
  },
  {
    id: 'gf-third-conditional', d: 2, t: 'tenses', pp: true,
    s: 'If she had left home earlier, she ___ the train.',
    a: 'would not have missed', x: ['would not miss', 'will not miss', 'had not missed'],
    e: 'The if-clause is in the past perfect ("had left"), an unreal past condition, so this is the **third conditional**: would + have + past participle: **would not have missed**. "Would not miss" and "will not miss" belong to the second and first conditionals.',
  },
  {
    id: 'gf-unless-no-negative', d: 2, t: 'tenses',
    s: 'Unless you ___ harder, you will fail the examination.',
    a: 'work', x: ['do not work', 'will work', 'will not work'],
    e: '"Unless" already means "if not", so it takes a **positive** verb, and like "if" it takes the **present simple** for a future condition: **unless you work**. "Unless you do not work" is a double negative, and "will" does not go in the condition clause.',
  },
  {
    id: 'gf-wish-knew', d: 2, t: 'tenses',
    s: 'I wish I ___ the answer; then I could help you.',
    a: 'knew', x: ['know', 'will know', 'have known'],
    e: 'A wish about the **present** that is contrary to fact takes the **past simple**: "I wish I **knew**" (I do not know now). Present, future and present perfect forms are not used after "wish" for this meaning.',
  },
  {
    id: 'gf-had-i-known', d: 3, t: 'tenses',
    s: '___ about the traffic jam, I would have taken another route.',
    a: 'Had I known', x: ['Have I known', 'Did I know', 'Were I knowing'],
    e: 'The main clause "would have taken" is the third conditional, so the condition must be the past perfect "If I had known". Dropping "if" and inverting gives **Had I known**. The other inversions use the wrong tense; "know" is not used in continuous form here.',
  },
  {
    id: 'gf-could-swim', d: 1, t: 'tenses',
    s: 'When he was only five years old, Ali ___ swim long distances.',
    a: 'could', x: ['can', 'may', 'must'],
    e: 'General **ability in the past** is expressed with **could**. "Can" is present, while "may" (possibility/permission) and "must" (obligation) do not express ability.',
  },
  {
    id: 'gf-must-have-gone', d: 2, t: 'tenses',
    s: 'The lights in their house are off and the car is not there; they ___ out.',
    a: 'must have gone', x: ['must go', 'should go', 'will go'],
    e: 'A confident **deduction about the past** from present evidence uses **must + have + past participle**: "they **must have gone** out". "Must go" and "should go" express obligation or advice, and "will go" is future, but the car has already left.',
  },
  {
    id: 'gf-need-not-have', d: 3, t: 'tenses',
    s: 'The guests had already eaten, so we ___ cooked so much food.',
    a: 'need not have', x: ['must not have', 'could not have', 'should have'],
    e: '**Need not have + past participle** means "we did it, but it was unnecessary", exactly the situation here. "Must not have" and "could not have" would mean we probably or certainly did not cook, and "should have" says cooking a lot was the right choice, which contradicts the guests having eaten.',
  },
  {
    id: 'gf-had-better', d: 1, t: 'tenses',
    s: 'You had better ___ a doctor about that cough.',
    a: 'see', x: ['to see', 'seeing', 'saw'],
    e: '"Had better" is followed by the **bare infinitive** (no "to"): "you had better **see** a doctor". "To see" is the most common error.',
  },
  {
    id: 'gf-used-to-play', d: 1, t: 'tenses', pp: true,
    s: 'He ___ play cricket every evening when he was a boy, but now he has no time.',
    a: 'used to', x: ['use to', 'was used to', 'is used to'],
    e: 'A past habit that no longer happens is expressed with **used to + verb**: "he **used to** play". "Use to" is wrong in an affirmative past sentence, and "be used to" means "be accustomed to" and is followed by a gerund ("was used to playing").',
  },
  {
    id: 'gf-was-inaugurated', d: 1, t: 'tenses',
    s: 'The new bridge ___ by the Prime Minister last week.',
    a: 'was inaugurated', x: ['has been inaugurated', 'inaugurated', 'is inaugurated'],
    e: 'The bridge receives the action ("by the Prime Minister"), so the verb is **passive**, and "last week" requires the past: **was inaugurated**. "Inaugurated" alone would make the bridge the doer, and the present perfect cannot take "last week".',
  },
  {
    id: 'gf-must-be-switched-off', d: 1, t: 'tenses',
    s: 'All mobile phones must ___ before the examination begins.',
    a: 'be switched off', x: ['switched off', 'switching off', 'being switched off'],
    e: 'The phones do not switch themselves off; someone switches them off, so a **passive** is needed. The passive after a modal is **modal + be + past participle**: "must **be switched off**". A modal is always followed by a bare infinitive, so "must switched off", "must switching off" and "must being switched off" are all ungrammatical.',
  },
  {
    id: 'gf-being-repaired', d: 2, t: 'tenses', pp: true,
    s: 'The road outside our house ___ at the moment, so we have to use the back gate.',
    a: 'is being repaired', x: ['is repairing', 'has been repaired', 'is repaired'],
    e: 'The road receives the action and the work is in progress "at the moment", so the **present continuous passive** is needed: **is being repaired**. "Is repairing" makes the road the doer, and "has been repaired" would mean the work is over, leaving no reason to use the back gate.',
  },
  {
    id: 'gf-said-to-have-been', d: 3, t: 'tenses',
    s: 'The old fort ___ built in the sixteenth century.',
    a: 'is said to have been', x: ['is said to be', 'says to have been', 'is saying to have been'],
    e: 'The reporting structure is passive (people say it): "is said". The building happened **before** the saying, so the **perfect passive infinitive** follows: "is said **to have been** built". "Is said to be built" puts the building in the present, and the fort cannot "say" anything.',
  },
  {
    id: 'gf-made-to-wait', d: 3, t: 'tenses',
    s: 'The visitors were made ___ outside the office for two hours.',
    a: 'to wait', x: ['wait', 'waiting', 'waited'],
    e: 'In the active, "make" takes a bare infinitive ("they made us wait"), but in the **passive** the "to" returns: "were made **to wait**". "Were made wait" is the common error.',
  },
  {
    id: 'gf-will-come-next-day', d: 3, t: 'tenses', pp: true,
    q: 'Choose the correct indirect form of the following sentence, reported a week after it was spoken:',
    s: 'He said, "I will come tomorrow."',
    a: 'He said that he would come the next day.',
    x: ['He said that he will come tomorrow.', 'He said that he would come tomorrow.', 'He said that he will come the next day.'],
    e: 'With a past reporting verb ("said"), "will" shifts back to **would**; since the speech is reported a week later, "tomorrow" becomes **the next day**. Only the first option changes both.',
  },
];

// ------------------------------------------------------------------ gerunds, infinitives, reported speech, conjunctions, tags

const STRUCTURES: readonly Item[] = [
  {
    id: 'gf-avoided-answering', d: 1, t: 'sentence correction', pp: true,
    s: 'The minister avoided ___ the question directly.',
    a: 'answering', x: ['to answer', 'answer', 'to answering'],
    e: '"Avoid" is followed by a **gerund** (-ing form), never an infinitive: "avoided **answering**". Other such verbs: enjoy, finish, deny, mind, suggest.',
  },
  {
    id: 'gf-decided-to-buy', d: 1, t: 'sentence correction',
    s: 'After much discussion, they decided ___ a new car.',
    a: 'to buy', x: ['buying', 'buy', 'to buying'],
    e: '"Decide" is followed by the **to-infinitive**: "decided **to buy**". Other such verbs: agree, hope, plan, refuse, promise.',
  },
  {
    id: 'gf-looking-forward-to', d: 2, t: 'sentence correction', pp: true,
    s: 'I am looking forward to ___ you at the convocation.',
    a: 'seeing', x: ['see', 'have seen', 'be seeing'],
    e: 'In "look forward to", **to** is a preposition, not part of an infinitive, so it is followed by a **gerund**: "looking forward to **seeing** you". "To see" is the classic error.',
  },
  {
    id: 'gf-used-to-getting', d: 2, t: 'sentence correction',
    s: 'Nadia is used to ___ up early, as she has done so for years.',
    a: 'getting', x: ['get', 'got', 'have got'],
    e: '"Be used to" means "be accustomed to"; its "to" is a preposition, so a **gerund** follows: "is used to **getting** up". Do not confuse it with "used to + verb" for past habits.',
  },
  {
    id: 'gf-stopped-to-buy', d: 2, t: 'sentence correction',
    s: 'On his way home, Bilal stopped ___ some bread, which is why he was late.',
    a: 'to buy', x: ['buying', 'buy', 'bought'],
    e: '"Stop + to-infinitive" gives the **purpose** of stopping (he stopped in order to buy bread), which explains the delay: **to buy**. "Stopped buying" would mean he gave up buying bread, which would not make him late.',
  },
  {
    id: 'gf-let-enter', d: 2, t: 'sentence correction',
    s: 'The guard did not let us ___ the building without a pass.',
    a: 'enter', x: ['to enter', 'entering', 'entered'],
    e: '"Let" (like "make" in the active) takes an object and a **bare infinitive**: "let us **enter**". "Let us to enter" is a common error.',
  },
  {
    id: 'gf-reported-question', d: 2, t: 'sentence correction', pp: true,
    s: 'The officer asked me ___.',
    a: 'where I lived', x: ['where did I live', 'where do I live', 'that where I lived'],
    e: 'In a **reported question** the word order is that of a statement (subject before verb, no "do/did"), the tense shifts back after "asked", and no "that" is added: "asked me **where I lived**".',
  },
  {
    id: 'gf-reported-command', d: 1, t: 'sentence correction', pp: true,
    s: 'The teacher told the students ___ noise.',
    a: 'not to make', x: ['do not make', 'not making', 'to not making'],
    e: 'A negative command is reported with **told + object + not to + verb**: "told the students **not to make** noise". The imperative "do not make" cannot follow "told the students" directly.',
  },
  {
    id: 'gf-no-sooner-than', d: 2, t: 'sentence correction', pp: true,
    s: 'No sooner had the bell rung ___ the students rushed out of the classroom.',
    a: 'than', x: ['when', 'then', 'that'],
    e: '"No sooner" is a comparative expression and is always completed by **than**: "No sooner had the bell rung **than** ...". "When" pairs with "hardly/scarcely", not with "no sooner".',
  },
  {
    id: 'gf-scarcely-when', d: 3, t: 'sentence correction', pp: true,
    s: 'Scarcely had the guests sat down to dinner ___ the electricity failed.',
    a: 'when', x: ['than', 'then', 'so'],
    e: '"Scarcely" (like "hardly") is completed by **when** (or "before"), not "than": "Scarcely had the guests sat down **when** the electricity failed". "Than" belongs with "no sooner".',
  },
  {
    id: 'gf-lest-should', d: 3, t: 'sentence correction',
    s: 'Walk carefully on the icy path lest you ___.',
    a: 'should fall', x: ['will fall', 'should not fall', 'do not fall'],
    e: '"Lest" means "for fear that" and is followed by **should + verb** (or the bare subjunctive "fall"): "lest you **should fall**". It is already negative in meaning, so "should not fall" or "do not fall" reverses the sense, and "will" is not used after "lest".',
  },
  {
    id: 'gf-despite-rain', d: 2, t: 'sentence correction',
    s: '___ the heavy rain, the match continued until the last ball.',
    a: 'Despite', x: ['Although', 'Even though', 'Because'],
    e: 'The blank is followed by a **noun phrase** ("the heavy rain"), not a clause, so a preposition is needed: **Despite**. "Although" and "even though" are conjunctions and need a clause ("although it rained heavily"); "because" would also need "of" and gives the wrong logic.',
  },
  {
    id: 'gf-so-that', d: 1, t: 'sentence correction',
    s: 'The lecturer spoke loudly ___ everyone in the hall could hear him.',
    a: 'so that', x: ['such as', 'in order', 'so as'],
    e: 'Purpose followed by a clause with "could" is introduced by **so that**. "In order" and "so as" must be followed by "to + verb" ("so as to be heard"), and "such as" introduces examples, not a purpose.',
  },
  {
    id: 'gf-whether-or-not', d: 2, t: 'sentence correction',
    s: 'I do not know ___ he will come to the meeting or not.',
    a: 'whether', x: ['that', 'unless', 'which'],
    e: 'An indirect yes/no question with "or not" is introduced by **whether**: "I do not know **whether** he will come or not". "That" introduces a statement, not a question, and "unless" and "which" do not fit.',
  },
  {
    id: 'gf-tag-cant-she', d: 2, t: 'sentence correction',
    s: 'Mehwish can speak French fluently, ___?',
    a: "can't she", x: ["couldn't she", "doesn't she", "isn't she"],
    e: 'A **question tag** repeats the auxiliary of the main clause ("can") with the opposite polarity: positive statement, negative tag: **can\'t she**. "Couldn\'t" is the past form and does not match "can", and "doesn\'t" and "isn\'t" use the wrong auxiliary.',
  },
  {
    id: 'gf-tag-shall-we', d: 3, t: 'sentence correction',
    s: "Let's go for a walk in the park, ___?",
    a: 'shall we', x: ["don't we", 'will we', 'do we'],
    e: 'A suggestion beginning with **Let\'s** (let us, including the speaker) always takes the tag **shall we**. ("Let us go, will you?" is a request to someone else to allow us, a different structure.)',
  },
  {
    id: 'gf-not-only-but-also', d: 2, t: 'parallelism', pp: true,
    s: 'The new manager is not only efficient but also ___.',
    a: 'polite', x: ['politely', 'behaves politely', 'he is polite'],
    e: '**Parallelism**: the words after "not only" and "but also" must be the same part of speech. "Efficient" is an adjective after "is", so another adjective follows: **polite**. "Politely" is an adverb, and the other two are verb phrases or clauses.',
  },
  {
    id: 'gf-gardening-fishing-reading', d: 1, t: 'parallelism',
    s: 'On holidays, my grandfather enjoys gardening, fishing and ___.',
    a: 'reading', x: ['to read', 'read', 'he reads'],
    e: 'Items in a list must be in the **same form**. "Gardening" and "fishing" are gerunds (and "enjoy" takes a gerund), so the third item is **reading**.',
  },
  {
    id: 'gf-either-take-or-walk', d: 2, t: 'parallelism',
    s: 'To reach the campus, you can either take the bus or ___.',
    a: 'walk', x: ['walking', 'you can walk', 'to walk'],
    e: '**Parallelism** with "either ... or": "either" is followed by the bare verb "take", so "or" must be followed by a bare verb too: **walk**. Both depend on "you can".',
  },
  {
    id: 'gf-both-skill-and-patience', d: 3, t: 'parallelism',
    s: 'Repairing old watches requires ___.',
    a: 'both skill and patience', x: ['both skill and being patient', 'both skilful and patience', 'skill and also to be patient'],
    e: 'The two items joined by "both ... and" must be **parallel**: two nouns, **skill and patience**. The other options mix a noun with a gerund phrase, an adjective with a noun, or a noun with an infinitive.',
  },
];

// ------------------------------------------------------------------ subject-verb agreement

const AGREEMENT: readonly Item[] = [
  {
    id: 'gf-one-of-friends', d: 1, t: 'subject-verb agreement', pp: true,
    s: 'One of my friends ___ to study medicine in Lahore.',
    a: 'wants', x: ['want', 'are wanting', 'have wanted'],
    e: 'The subject is **one** (of my friends), which is singular, so the verb is singular: **wants**. The plural noun "friends" sits inside the phrase "of my friends" and does not control the verb.',
  },
  {
    id: 'gf-each-of-players', d: 1, t: 'subject-verb agreement', pp: true,
    s: "Each of the players ___ given a medal after yesterday's final.",
    a: 'was', x: ['were', 'are', 'have been'],
    e: "**Each** is singular, so it takes a singular verb, and \"yesterday's final\" places it in the past: **was given**. \"Were\" is plural; \"are\" and \"have been\" are present forms.",
  },
  {
    id: 'gf-as-well-as', d: 2, t: 'subject-verb agreement', pp: true,
    s: 'The principal, as well as the teachers, ___ present at the prize-giving ceremony yesterday.',
    a: 'was', x: ['were', 'are', 'have been'],
    e: 'Phrases such as "as well as", "along with" and "together with" do not add to the subject. The subject is "the principal" (singular) and "yesterday" requires the past, so the verb is **was**.',
  },
  {
    id: 'gf-news-is', d: 1, t: 'subject-verb agreement',
    s: 'The news from the flood-hit areas ___ very disturbing.',
    a: 'is', x: ['are', 'were', 'have been'],
    e: '**News** looks plural but is an uncountable (singular) noun, so it takes **is**.',
  },
  {
    id: 'gf-number-of', d: 3, t: 'subject-verb agreement', pp: true,
    s: 'A number of students ___ absent today, but the number of absentees ___ smaller than last week.',
    a: 'are ... is', x: ['is ... are', 'is ... is', 'are ... are'],
    e: '"**A number of** + plural noun" means "many" and takes a **plural** verb (are). "**The number of**" refers to the number itself, which is singular, so it takes **is**.',
  },
  {
    id: 'gf-bread-and-butter', d: 2, t: 'subject-verb agreement',
    s: 'Bread and butter ___ his usual breakfast.',
    a: 'is', x: ['are', 'were', 'have been'],
    e: 'Two nouns joined by "and" usually take a plural verb, but when they name **one single idea or dish** (bread and butter, rice and curry, law and order) the verb is singular: **is**.',
  },
  {
    id: 'gf-there-are', d: 1, t: 'subject-verb agreement',
    s: 'There ___ several spelling mistakes in your essay.',
    a: 'are', x: ['is', 'was', 'has been'],
    e: 'In a "there is / there are" sentence the verb agrees with the noun that follows. "Several spelling mistakes" is plural, so: **There are**.',
  },
  {
    id: 'gf-ten-kilometres', d: 2, t: 'subject-verb agreement',
    s: 'Ten kilometres ___ too long a distance to walk in this heat.',
    a: 'is', x: ['are', 'were', 'have been'],
    e: 'A plural expression of **distance, time or money** treated as a single amount takes a singular verb: "Ten kilometres **is** too long a distance".',
  },
  {
    id: 'gf-one-of-those-who', d: 3, t: 'subject-verb agreement',
    s: 'Sana is one of those students who always ___ their assignments on time.',
    a: 'submit', x: ['submits', 'has submitted', 'is submitting'],
    e: 'In "one of those students who ...", the relative pronoun **who** refers to "students" (plural), not "one"; "their assignments" confirms this. So the verb is plural: **submit**.',
  },
  {
    id: 'gf-everyone-was', d: 1, t: 'subject-verb agreement',
    s: 'Everyone in the hall ___ standing when the national anthem began.',
    a: 'was', x: ['were', 'are', 'have been'],
    e: '**Everyone** (like everybody, someone, nobody) is singular, and "began" places the sentence in the past: **was**.',
  },
];

// ------------------------------------------------------------------ articles

const ARTICLES: readonly Item[] = [
  {
    id: 'gf-the-moon', d: 1, t: 'articles', pp: true,
    s: '___ moon goes round the earth roughly once a month.',
    a: 'The', x: ['A', 'An', 'Some'],
    e: 'Things that are **unique** (the sun, the moon, the earth, the sky) take the definite article: **The** moon.',
  },
  {
    id: 'gf-highest-mountain', d: 1, t: 'articles',
    s: 'Mount Everest is ___ highest mountain in the world.',
    a: 'the', x: ['a', 'an', 'one'],
    e: 'A **superlative** ("highest") picks out one particular thing, so it takes **the**.',
  },
  {
    id: 'gf-the-arabian-sea', d: 2, t: 'articles', pp: true,
    s: '___ Arabian Sea lies to the south of Pakistan.',
    a: 'The', x: ['A', 'An', 'One'],
    e: 'Names of **seas**, rivers, oceans and mountain ranges take **the** (the Arabian Sea, the Indus, the Himalayas), whereas single mountains and lakes usually do not (Mount Everest, Lake Manchar).',
  },
  {
    id: 'gf-engineer-doctor', d: 1, t: 'articles',
    s: 'Her brother is ___ engineer, and her sister is ___ doctor.',
    a: 'an ... a', x: ['a ... a', 'an ... an', 'the ... an'],
    e: 'A profession takes the indefinite article, chosen by the **first sound**: "engineer" begins with a vowel sound, so **an** engineer; "doctor" begins with a consonant sound, so **a** doctor.',
  },
  {
    id: 'gf-much-luggage', d: 2, t: 'modifiers',
    s: 'How ___ luggage are you taking on the flight?',
    a: 'much', x: ['many', 'a', 'few'],
    e: '**Luggage** is uncountable, so it takes **much**, not "many" or "few" (which go with plural countable nouns), and it cannot take "a".',
  },
  {
    id: 'gf-by-train', d: 2, t: 'articles',
    s: 'Last summer, they travelled from Lahore to Karachi by ___.',
    a: 'train', x: ['the train', 'a train', 'trains'],
    e: 'The fixed phrase "**by** + means of transport" takes **no article**: by train, by bus, by air. (Compare "on the train", with an article.)',
  },
];

// ------------------------------------------------------------------ prepositions

const PREPOSITIONS: readonly Item[] = [
  {
    id: 'gf-good-at', d: 1, t: 'prepositions', pp: true,
    s: 'Sara is very good ___ mathematics and always tops her class.',
    a: 'at', x: ['on', 'for', 'about'],
    e: 'Skill in a subject or activity is expressed as "good **at**" (good at mathematics, good at cricket). "Good for" means "beneficial to".',
  },
  {
    id: 'gf-married-to', d: 2, t: 'prepositions', pp: true,
    s: "Our neighbour's daughter is married ___ an army officer.",
    a: 'to', x: ['with', 'by', 'from'],
    e: 'Standard English says "married **to** someone". "Married with" is a common error.',
  },
  {
    id: 'gf-senior-to', d: 2, t: 'prepositions', pp: true,
    s: 'Mr Javed is senior ___ me by three years in the department.',
    a: 'to', x: ['than', 'from', 'over'],
    e: 'Latin comparatives such as **superior, inferior, senior, junior, prior** are followed by **to**, not "than".',
  },
  {
    id: 'gf-on-monday-at', d: 1, t: 'prepositions',
    s: 'The examination will be held ___ Monday ___ 9 a.m.',
    a: 'on ... at', x: ['at ... on', 'in ... at', 'on ... in'],
    e: 'Use **on** with days and dates (on Monday) and **at** with clock times (at 9 a.m.). "In" is used with months, years and parts of the day.',
  },
  {
    id: 'gf-prefer-to', d: 2, t: 'prepositions', pp: true,
    s: 'My grandmother prefers walking ___ taking the bus.',
    a: 'to', x: ['than', 'from', 'against'],
    e: 'The structure is "prefer A **to** B" ("prefers walking **to** taking the bus"). "Than" needs "rather": "she would rather walk than take the bus" or "she prefers to walk rather than take the bus".',
  },
  {
    id: 'gf-accused-of', d: 2, t: 'prepositions',
    s: 'The clerk was accused ___ stealing files from the office.',
    a: 'of', x: ['for', 'with', 'about'],
    e: 'The verb is "accuse someone **of** something". (Compare "charged **with**", which is a different verb.)',
  },
  {
    id: 'gf-agree-with-to', d: 3, t: 'prepositions',
    s: 'The chairman did not agree ___ the members, although he agreed ___ their proposal.',
    a: 'with ... to', x: ['to ... with', 'to ... to', 'at ... with'],
    e: 'We agree **with a person** (or their opinion) and agree **to a proposal or request** (accept it). Only "with ... to" gives the correct preposition for "the members".',
  },
  {
    id: 'gf-between-two-cities', d: 1, t: 'prepositions',
    s: 'The distance ___ Islamabad and Rawalpindi is quite short.',
    a: 'between', x: ['among', 'amid', 'within'],
    e: '**Between** is used for two people, places or things (Islamabad and Rawalpindi); "among" and "amid" are used with a larger group or mass, and "within" does not link two points.',
  },
  {
    id: 'gf-angry-with-for', d: 2, t: 'prepositions',
    s: 'The coach was angry ___ the players ___ their careless fielding.',
    a: 'with ... for', x: ['on ... for', 'with ... of', 'to ... for'],
    e: 'We are angry **with** a person and angry **for** (or about) a reason. "Angry on someone" is a common error.',
  },
  {
    id: 'gf-died-of', d: 2, t: 'prepositions',
    s: 'Thousands of people died ___ cholera during the epidemic.',
    a: 'of', x: ['by', 'in', 'at'],
    e: 'A disease as the cause of death takes "die **of**" (die of cholera, die of hunger). "Die by" is used for violent means, not illness.',
  },
  {
    id: 'gf-insisted-on', d: 1, t: 'prepositions',
    s: 'My uncle insisted ___ paying the bill himself.',
    a: 'on', x: ['to', 'for', 'at'],
    e: 'The verb is "insist **on** + noun/gerund": "insisted **on** paying". "Insisted to pay" is a common error.',
  },
  {
    id: 'gf-comply-with', d: 2, t: 'prepositions',
    s: 'All factories must comply ___ the new environmental regulations.',
    a: 'with', x: ['to', 'by', 'for'],
    e: 'The verb is "comply **with**" a rule or order.',
  },
  {
    id: 'gf-abide-by', d: 3, t: 'prepositions',
    s: 'Every player must abide ___ the decisions of the referee.',
    a: 'by', x: ['with', 'to', 'for'],
    e: 'To accept and obey a rule or decision is to "abide **by**" it.',
  },
];

// ------------------------------------------------------------------ pronouns

const PRONOUNS: readonly Item[] = [
  {
    id: 'gf-colleague-and-me', d: 2, t: 'pronouns', pp: true,
    s: 'The manager invited my colleague and ___ to the meeting.',
    a: 'me', x: ['I', 'myself', 'mine'],
    e: 'The pronoun is the **object** of "invited", so the object case is needed: **me**. Test by removing "my colleague and": "invited me", not "invited I". "Myself" is reflexive and needs "I" as the subject.',
  },
  {
    id: 'gf-taller-than-i-am', d: 2, t: 'pronouns',
    s: 'My younger brother is now taller than ___ am.',
    a: 'I', x: ['me', 'myself', 'mine'],
    e: 'The pronoun is the **subject** of "am", so the subject case is needed: "taller than **I** am".',
  },
  {
    id: 'gf-to-whom', d: 2, t: 'pronouns',
    s: 'To ___ should I address this letter?',
    a: 'whom', x: ['who', 'whose', 'whoever'],
    e: 'After a preposition ("to") the object form of the relative/interrogative pronoun is required: "To **whom**".',
  },
  {
    id: 'gf-prides-herself', d: 2, t: 'pronouns',
    s: 'Saima prides ___ on never having missed a deadline.',
    a: 'herself', x: ['her', 'hers', 'her own'],
    e: 'The verb "pride oneself on" always takes a **reflexive** pronoun referring back to the subject: "Saima prides **herself** on ...". "Her", "hers" and "her own" are not reflexive.',
  },
  {
    id: 'gf-its-paw', d: 1, t: 'pronouns', pp: true,
    s: 'The cat licked ___ paw and went back to sleep.',
    a: 'its', x: ["it's", 'their', "its'"],
    e: 'The possessive of "it" is **its** (no apostrophe); "it\'s" means "it is", and "its\'" is not a word. "Their" is plural and does not agree with "the cat".',
  },
  {
    id: 'gf-whose-father', d: 1, t: 'pronouns',
    s: 'This is the boy ___ father is a pilot.',
    a: 'whose', x: ["who's", 'whom', 'which'],
    e: 'Possession ("the boy\'s father") is expressed by the relative pronoun **whose**. "Who\'s" means "who is".',
  },
  {
    id: 'gf-us-students', d: 2, t: 'pronouns',
    s: 'The principal praised ___ students for our hard work.',
    a: 'us', x: ['we', 'ours', 'ourselves'],
    e: 'The phrase "us students" is the **object** of "praised", so the object case is needed: "praised **us** students". Test by dropping "students": "praised us".',
  },
  {
    id: 'gf-which-book', d: 1, t: 'pronouns',
    s: 'The book ___ you lent me was very interesting.',
    a: 'which', x: ['who', 'whom', 'whose'],
    e: 'For a thing (the book) the relative pronoun is **which** (or "that"). "Who" and "whom" are for people.',
  },
];

// ------------------------------------------------------------------ modifiers (adjectives, adverbs, quantifiers)

const MODIFIERS: readonly Item[] = [
  {
    id: 'gf-safer-than', d: 1, t: 'modifiers',
    s: 'This new road is much ___ than the old one.',
    a: 'safer', x: ['safest', 'more safer', 'safe'],
    e: 'Comparing two things with "than" needs the **comparative**: **safer**. "More safer" is a double comparative.',
  },
  {
    id: 'gf-fewer-people', d: 2, t: 'modifiers', pp: true,
    s: 'There were ___ people at the meeting than we had expected.',
    a: 'fewer', x: ['less', 'lesser', 'little'],
    e: 'With **countable** plural nouns (people) use **fewer**; "less" is for uncountable nouns (less water). "Lesser" means "smaller in importance".',
  },
  {
    id: 'gf-beautifully', d: 1, t: 'modifiers',
    s: 'She sang so ___ that everyone in the hall clapped.',
    a: 'beautifully', x: ['beautiful', 'beauty', 'beautify'],
    e: 'The word describes **how she sang** (it modifies a verb), so an **adverb** is needed: **beautifully**.',
  },
  {
    id: 'gf-few-friends', d: 2, t: 'modifiers',
    s: 'He has ___ friends, so he often feels lonely.',
    a: 'few', x: ['a few', 'less', 'a little'],
    e: '**Few** (without "a") means "hardly any", which explains the loneliness. "A few" means "some" (a positive idea), and "less" and "a little" are for uncountable nouns.',
  },
  {
    id: 'gf-a-little-milk', d: 2, t: 'modifiers',
    s: 'There is ___ milk left in the fridge, so we need not buy any today.',
    a: 'a little', x: ['little', 'a few', 'few'],
    e: '"Milk" is uncountable, so "little/a little" is required, and the sense is positive ("we need not buy any"): **a little** means "some". "Little" alone means "hardly any", which would be a reason to buy more.',
  },
  {
    id: 'gf-as-tall-as', d: 1, t: 'modifiers',
    s: 'Hassan is now as tall ___ his father.',
    a: 'as', x: ['than', 'like', 'so'],
    e: 'Equality is expressed with **as + adjective + as**: "as tall **as** his father".',
  },
  {
    id: 'gf-the-more-successful', d: 3, t: 'modifiers',
    s: 'The harder you work, ___ you will become.',
    a: 'the more successful', x: ['more successful', 'the most successful', 'the successful'],
    e: 'The double comparative "**the** + comparative ..., **the** + comparative ..." shows two things changing together: "The harder you work, **the more successful** you will become".',
  },
  {
    id: 'gf-old-enough', d: 2, t: 'modifiers',
    s: 'Bilal is only fifteen, so he is not ___ to get a driving licence.',
    a: 'old enough', x: ['enough old', 'old too', 'so old'],
    e: '**Enough** comes **after** an adjective and before a noun: "old enough", but "enough money". "So old to" would need "so old as to", and "old too" is not English.',
  },
  {
    id: 'gf-hardly-walk', d: 2, t: 'modifiers',
    s: 'His leg was so badly injured that he could ___ walk.',
    a: 'hardly', x: ['hard', 'not hardly', 'hardest'],
    e: '**Hardly** means "almost not". "Hard" means "with effort", and "not hardly" is a double negative.',
  },
  {
    id: 'gf-dangling-running', d: 3, t: 'modifiers', pp: true,
    q: 'Choose the option that correctly completes the sentence:',
    s: 'Running to catch the bus, ___.',
    a: 'Farah dropped her purse on the road', x: ["Farah's purse fell on the road", 'the purse slipped out of her hand', 'the bus left without Farah'],
    e: 'An opening participle phrase ("Running to catch the bus") must be followed by the person doing the running. Only "**Farah** dropped" supplies that subject; the other options make the purse or the bus appear to be running (a **dangling modifier**).',
  },
];

// ------------------------------------------------------------------ data for dynamic templates

/** Groups for the correlative-agreement template; the nouns of a group fit each predicate. */
const CORRELATIVE_GROUPS: ReadonlyArray<{ sg: readonly string[]; pl: readonly string[]; pred: readonly string[] }> = [
  { sg: ['the captain', 'the coach'], pl: ['the players', 'the selectors'], pred: ['happy with the result', 'responsible for the defeat'] },
  { sg: ['the principal', 'the head clerk'], pl: ['the teachers', 'the parents'], pred: ['aware of the new timetable', 'satisfied with the arrangements'] },
  { sg: ['the manager', 'the owner'], pl: ['the workers', 'the shareholders'], pred: ['willing to accept the offer', 'worried about the losses'] },
  { sg: ['my brother', 'my sister'], pl: ['my parents', 'my cousins'], pred: ['ready to leave', 'interested in the plan'] },
  { sg: ['the driver', 'the conductor'], pl: ['the passengers', 'the porters'], pred: ['to blame for the delay', 'unhappy with the new fares'] },
];

const CORRELATIVES: ReadonlyArray<readonly [string, string]> = [
  ['neither', 'nor'],
  ['either', 'or'],
  ['not only', 'but also'],
];

/** Phrases for the article template; `a` is the correct indefinite article and `why` its reason. */
const ARTICLE_PHRASES: ReadonlyArray<{ p: string; a: 'a' | 'an'; why: string }> = [
  { p: 'hour-long lecture', a: 'an', why: 'the h of "hour" is silent, so it begins with a vowel sound' },
  { p: 'honest mistake', a: 'an', why: 'the h of "honest" is silent, so it begins with a vowel sound' },
  { p: 'heir to the throne', a: 'an', why: 'the h of "heir" is silent, so it begins with a vowel sound' },
  { p: 'MBA degree', a: 'an', why: '"M" is read "em", a vowel sound' },
  { p: 'X-ray report', a: 'an', why: '"X" is read "eks", a vowel sound' },
  { p: 'NGO worker', a: 'an', why: '"N" is read "en", a vowel sound' },
  { p: 'SOS message', a: 'an', why: '"S" is read "es", a vowel sound' },
  { p: 'LLB student', a: 'an', why: '"L" is read "el", a vowel sound' },
  { p: 'umbrella', a: 'an', why: '"umbrella" begins with the vowel sound "uh"' },
  { p: 'unusual request', a: 'an', why: '"unusual" begins with the vowel sound "uh"' },
  { p: 'university student', a: 'a', why: '"university" begins with the consonant sound "y" (yoo)' },
  { p: 'European tour', a: 'a', why: '"European" begins with the consonant sound "y" (yoo)' },
  { p: 'useful tip', a: 'a', why: '"useful" begins with the consonant sound "y" (yoo)' },
  { p: 'unique opportunity', a: 'a', why: '"unique" begins with the consonant sound "y" (yoo)' },
  { p: 'UN report', a: 'a', why: '"U" is read "yoo", a consonant sound' },
  { p: 'one-day match', a: 'a', why: '"one" begins with the consonant sound "w"' },
  { p: 'one-rupee coin', a: 'a', why: '"one" begins with the consonant sound "w"' },
  { p: 'heavy bag', a: 'a', why: 'the h of "heavy" is pronounced, a consonant sound' },
  { p: 'hundred-rupee note', a: 'a', why: 'the h of "hundred" is pronounced, a consonant sound' },
];

const flip = (art: 'a' | 'an'): 'a' | 'an' => (art === 'a' ? 'an' : 'a');

/** Since/for frames: each predicate accepts every listed period (for) and point (since). */
const SINCE_FOR_FRAMES: ReadonlyArray<{ s: string; period: readonly string[]; point: readonly string[] }> = [
  { s: 'Ayesha has lived in Karachi', period: ['ten years', 'a long time', 'six months', 'two decades'], point: ['2015', 'her childhood', 'last winter', 'the day she got married'] },
  { s: 'The patients have been waiting for the doctor', period: ['two hours', 'forty minutes', 'half an hour'], point: ['nine o\'clock', 'early morning', 'noon'] },
  { s: 'My grandfather has worked at this factory', period: ['thirty years', 'most of his life', 'four decades'], point: ['1990', 'he left school', 'the factory opened'] },
  { s: 'We have not seen our cousins', period: ['three years', 'ages', 'a long time'], point: ['last Eid', 'January', 'the wedding'] },
  // Points here are all clearly past: "closed till Monday" (a closure lasting until a coming Monday)
  // and "closed by the floods" (passive agent) would make the distractors "till"/"by" correct.
  { s: 'The bridge has been closed to traffic', period: ['a week', 'several days', 'a month'], point: ['last Monday', 'the day of the accident', 'last month'] },
  { s: 'Bilal has been learning Chinese', period: ['eight months', 'two years', 'a few weeks'], point: ['March', 'he joined the university', 'last summer'] },
];

/** Comparison frames: one-syllable adjectives with regular -er/-est forms that suit the group. */
const COMPARE_GROUPS: ReadonlyArray<{ group: string; place: string; names: readonly string[]; adj: readonly string[] }> = [
  { group: 'brothers', place: 'family', names: ['Ali', 'Usman', 'Hamza', 'Bilal'], adj: ['tall', 'young', 'strong'] },
  { group: 'sisters', place: 'family', names: ['Sana', 'Hira', 'Ayesha', 'Maryam'], adj: ['tall', 'young', 'short'] },
  { group: 'runners', place: 'team', names: ['Danish', 'Fahad', 'Saad', 'Zain'], adj: ['fast', 'quick', 'strong'] },
  { group: 'bowlers', place: 'squad', names: ['Shaheen', 'Naseem', 'Haris', 'Wasim'], adj: ['fast', 'tall', 'young'] },
];

/** Regular comparative/superlative of a one-syllable adjective (doubling a final CVC consonant). */
function degrees(adj: string): { er: string; est: string } {
  const doubles = /[^aeiou][aeiou][bdgmnpt]$/.test(adj);
  const stem = doubles ? adj + adj.slice(-1) : adj;
  return { er: `${stem}er`, est: `${stem}est` };
}

// ------------------------------------------------------------------ bank

export default defineBank('english', 'grammar', (b) => [
  b.dynamic('gf-correlative-agreement', { difficulty: 2, origin: 'past-paper', tags: ['subject-verb agreement'] }, (r) => {
    const g = r.pick(CORRELATIVE_GROUPS);
    const [c1, c2] = r.pick(CORRELATIVES);
    const nearPlural = r.chance(0.5);
    const near = r.pick(nearPlural ? g.pl : g.sg);
    // The far subject may be of either number, but never the same noun.
    const far = r.pick([...g.sg, ...g.pl].filter((n) => n !== near));
    const pred = r.pick(g.pred);
    const answer = nearPlural ? 'are' : 'is';
    const distractors = nearPlural ? ['is', 'was', 'has been'] : ['are', 'were', 'have been'];
    return {
      stem: blankStem(`${cap(c1)} ${far} ${c2} ${near} ___ ${pred}.`),
      answer,
      distractors,
      explanation: `With **${c1} ... ${c2}**, the verb agrees with the subject **nearer** to it. Here that is "${near}", which is ${nearPlural ? 'plural' : 'singular'}, so the verb is **${answer}**. The other options are ${nearPlural ? 'singular' : 'plural'} forms.`,
    };
  }),

  b.dynamic('gf-indefinite-article', { difficulty: 2, origin: 'past-paper', tags: ['articles'] }, (r) => {
    const [right, ...wrong] = r.sample(ARTICLE_PHRASES, 4);
    const answer = `${right!.a} ${right!.p}`;
    const distractors = wrong.map((w) => `${flip(w.a)} ${w.p}`);
    const fixes = wrong.map((w) => `"${w.a} ${w.p}" (${w.why})`).join('; ');
    return {
      stem: 'Which of the following phrases uses the indefinite article correctly?',
      answer,
      distractors,
      explanation: `"A" or "an" is chosen by the first **sound**, not the first letter. The correct phrase is **${answer}**, because ${right!.why}. The others should read: ${fixes}.`,
    };
  }),

  b.dynamic('gf-since-or-for', { difficulty: 1, origin: 'past-paper', tags: ['prepositions'] }, (r) => {
    const f = r.pick(SINCE_FOR_FRAMES);
    const usePoint = r.chance(0.5);
    const time = r.pick(usePoint ? f.point : f.period);
    const answer = usePoint ? 'since' : 'for';
    return {
      stem: blankStem(`${f.s} ___ ${time}.`),
      answer,
      distractors: [usePoint ? 'for' : 'since', 'by', 'till'],
      explanation: usePoint
        ? `The phrase "${time}" is a **point in time** (when the action began), so with the present perfect we use **since**. "For" goes with a length of time (for three years).`
        : `The phrase "${time}" is a **length of time**, so with the present perfect we use **for**. "Since" goes with a starting point (since 2015, since Monday).`,
    };
  }),

  b.dynamic('gf-comparative-or-superlative', { difficulty: 1, tags: ['modifiers'] }, (r) => {
    const g = r.pick(COMPARE_GROUPS);
    const name = r.pick(g.names);
    const adj = r.pick(g.adj);
    const { er, est } = degrees(adj);
    const two = r.chance(0.5);
    const sentence = two ? `Of the two ${g.group}, ${name} is the ___.` : `Of all the ${g.group} in the ${g.place}, ${name} is the ___.`;
    const answer = two ? er : est;
    return {
      stem: blankStem(sentence),
      answer,
      distractors: [two ? est : er, `more ${er}`, `most ${est}`],
      explanation: two
        ? `When exactly **two** are compared, the **comparative** is used, even after "the": "the **${er}**". "More ${er}" and "most ${est}" are double comparisons.`
        : `When **more than two** are compared, the **superlative** is used: "the **${est}**". "More ${er}" and "most ${est}" are double comparisons.`,
    };
  }),

  ...b.mcqs([...VERBS, ...STRUCTURES, ...AGREEMENT, ...ARTICLES, ...PREPOSITIONS, ...PRONOUNS, ...MODIFIERS].map(toMcq)),
]);
