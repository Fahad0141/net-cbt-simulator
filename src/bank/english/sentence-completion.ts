import { defineBank, type CompactMcq } from '@/engine/authoring';
import type { Difficulty } from '@/engine/types';

/**
 * English, chapter "Sentence Completion": PART A (single-blank, SAT-style items).
 * Part B (`sentence-completion.concepts.ts`) is a separate file. Every local id here starts with `sb-`.
 *
 * Each item is an original sentence with one blank and four single-word options of the same part of
 * speech. Exactly one option fits the context clue (contrast, cause/effect, definition or example);
 * the others are excluded by that clue. Avoid an article directly before the blank ("a/an ____"), since
 * it would reveal or exclude options by their first letter.
 */

/**
 * The blank, rendered as an underlined run of non-breaking spaces (`__text__` is underline in the
 * rich-text format; a literal "____" would be parsed as an empty underline).
 */
const BLANK = `__${' '.repeat(10)}__`;

interface Item {
  id: string;
  d: Difficulty;
  /** The sentence, with exactly one `___` marking the blank. */
  s: string;
  a: string;
  x: readonly [string, string, string];
  e: string;
  /** Mirrors a recurring NET theme. */
  pp?: true;
}

const TAGS = ['single blank', 'vocabulary in context'] as const;

function toMcq(item: Item): CompactMcq {
  const parts = item.s.split('___');
  if (parts.length !== 2) throw new Error(`sentence-completion/${item.id}: expected exactly one blank`);
  return {
    id: item.id,
    d: item.d,
    q: `Choose the word that best completes the sentence:\n\n${parts.join(BLANK)}`,
    a: item.a,
    x: item.x,
    e: item.e,
    t: TAGS,
    ...(item.pp ? { o: 'past-paper' as const } : {}),
  };
}

// ------------------------------------------------------------------ difficulty 1

const EASY: readonly Item[] = [
  {
    id: 'sb-fragile-vase', d: 1, pp: true,
    s: 'The glass vase is extremely ___, so pack it carefully in plenty of soft paper.',
    a: 'fragile', x: ['durable', 'sturdy', 'ordinary'],
    e: 'Cause clue: careful packing in soft paper is needed because the vase breaks easily. **Fragile** means "easily broken"; durable and sturdy mean the opposite, and an ordinary vase would need no special care.',
  },
  {
    id: 'sb-punctual-never-late', d: 1, pp: true,
    s: 'Ahmed is so ___ that he has not once arrived late for a class or a meeting in three years.',
    a: 'punctual', x: ['careless', 'forgetful', 'lazy'],
    e: 'Definition clue: never arriving late describes a **punctual** ("on time") person. Careless, forgetful and lazy people would be more likely to arrive late.',
  },
  {
    id: 'sb-reserved-sister', d: 1,
    s: 'Unlike her talkative brother, Sana is rather ___ and seldom speaks in company.',
    a: 'reserved', x: ['sociable', 'outspoken', 'energetic'],
    e: 'Contrast clue: "unlike her talkative brother" and "seldom speaks" call for **reserved** ("quiet, slow to share feelings"). Sociable and outspoken describe the brother, and energetic does not explain her silence.',
  },
  {
    id: 'sb-bitter-medicine', d: 1,
    s: 'The medicine tasted so ___ that the child refused to swallow a second spoonful.',
    a: 'bitter', x: ['sweet', 'pleasant', 'mild'],
    e: 'Cause clue: the child refused a second spoonful, so the taste was unpleasant: **bitter**. A sweet, pleasant or mild taste gives no reason to refuse.',
  },
  {
    id: 'sb-disproved-theory', d: 1,
    s: 'The new evidence ___ the scientist\'s theory, so she had to abandon it.',
    a: 'disproved', x: ['confirmed', 'supported', 'strengthened'],
    e: 'Cause clue: she abandoned the theory, so the evidence must have shown it to be false: **disproved**. Evidence that confirmed, supported or strengthened it would be a reason to keep it.',
  },
  {
    id: 'sb-essential-water', d: 1,
    s: 'Water is ___ to all living things; without it, no organism can survive.',
    a: 'essential', x: ['harmful', 'optional', 'unknown'],
    e: 'Definition clue: "without it, no organism can survive" means water is absolutely necessary: **essential**. Optional is the opposite; harmful and unknown contradict the clue.',
  },
  {
    id: 'sb-determined-organisers', d: 1,
    s: 'Despite the heavy rain, the organisers were ___ to hold the match, since thousands of fans had travelled to watch it.',
    a: 'determined', x: ['reluctant', 'ashamed', 'unable'],
    e: '"Despite" signals that the organisers went against what the rain suggested, and the travelling fans give the reason: they were **determined** (firmly resolved) to hold it. Reluctant or unable would agree with the rain, not contrast with it.',
  },
  {
    id: 'sb-careless-thief', d: 1,
    s: 'The thief was ___ enough to leave his fingerprints all over the window, which led the police straight to him.',
    a: 'careless', x: ['cautious', 'clever', 'careful'],
    e: 'Example clue: leaving fingerprints that lead the police to you is a **careless** act. A cautious, clever or careful thief would avoid leaving them.',
  },
  {
    id: 'sb-abundant-vegetables', d: 1, pp: true,
    s: 'Fresh vegetables are ___ in summer, so their prices fall sharply.',
    a: 'abundant', x: ['scarce', 'expensive', 'rare'],
    e: 'Cause clue: prices fall when supply is large, so vegetables are **abundant** ("plentiful"). Scarce, rare and expensive would make prices rise, not fall.',
  },
  {
    id: 'sb-exhausted-hikers', d: 1,
    s: 'After walking twenty kilometres in the burning heat, the hikers were completely ___.',
    a: 'exhausted', x: ['refreshed', 'energetic', 'rested'],
    e: 'Cause clue: a long walk in the heat leaves people **exhausted** ("extremely tired"). Refreshed, energetic and rested are the opposite of the expected effect.',
  },
  {
    id: 'sb-inquisitive-student', d: 1, pp: true,
    s: 'The ___ student asked so many questions that the teacher praised her eagerness to learn.',
    a: 'inquisitive', x: ['indifferent', 'lazy', 'timid'],
    e: 'Example clue: asking many questions out of eagerness to learn shows an **inquisitive** ("curious") student. An indifferent, lazy or timid student would ask few questions.',
  },
  {
    id: 'sb-daunting-task', d: 1, pp: true,
    s: 'Although the task seemed ___ at first, it turned out to be quite simple once we began.',
    a: 'daunting', x: ['effortless', 'trivial', 'straightforward'],
    e: 'Contrast clue: "although ... turned out to be quite simple" needs a word meaning the opposite of simple: **daunting** ("seeming difficult, discouraging"). The other three all mean "easy", so there would be no contrast.',
  },
  {
    id: 'sb-accurate-witness', d: 1,
    s: 'The witness\'s account of the accident was ___: every detail matched the security camera footage exactly.',
    a: 'accurate', x: ['false', 'vague', 'misleading'],
    e: 'Definition clue after the colon: every detail matched the footage, so the account was **accurate** ("correct in every detail"). False and misleading contradict the footage, and a vague account has few details.',
  },
  {
    id: 'sb-generous-lunch', d: 1, pp: true,
    s: 'Hassan is very ___; he always shares his lunch with classmates who have none.',
    a: 'generous', x: ['selfish', 'greedy', 'stingy'],
    e: 'Example clue: sharing one\'s lunch with those who have none is **generous** ("willing to give"). Selfish, greedy and stingy are its opposites.',
  },
  {
    id: 'sb-deserted-town', d: 1, pp: true,
    s: 'The once-crowded mill town is now almost ___; most of its residents left when the factory closed.',
    a: 'deserted', x: ['bustling', 'prosperous', 'congested'],
    e: 'Contrast and cause clues: "once-crowded" and "most residents left" point to **deserted** ("empty of people"). Bustling and congested mean crowded, and a town that lost its factory is unlikely to be prosperous.',
  },
  {
    id: 'sb-gradual-recovery', d: 1,
    s: 'The patient\'s recovery was ___: he improved so slowly that the change was noticeable only over several months.',
    a: 'gradual', x: ['abrupt', 'sudden', 'instantaneous'],
    e: 'Definition clue: improving slowly over months is a **gradual** ("happening step by step") recovery. Abrupt, sudden and instantaneous all mean happening at once.',
  },
  {
    id: 'sb-scarce-water', d: 1,
    s: 'The drought made water so ___ that villagers had to walk for miles to fetch a single pot.',
    a: 'scarce', x: ['abundant', 'plentiful', 'pure'],
    e: 'Cause clue: a drought, and walking miles for one pot, show that water was **scarce** ("in short supply"). Abundant and plentiful mean the opposite, and purity does not explain the long walk.',
  },
  {
    id: 'sb-durable-walls', d: 1,
    s: 'The ancient walls are remarkably ___; they have withstood earthquakes and floods for over a thousand years.',
    a: 'durable', x: ['fragile', 'decorative', 'temporary'],
    e: 'Example clue: lasting a thousand years through earthquakes and floods shows the walls are **durable** ("long-lasting, hard-wearing"). Fragile and temporary contradict this, and decorative says nothing about strength.',
  },
  {
    id: 'sb-contaminated-water', d: 1,
    s: 'The town\'s water supply was ___ by waste from a nearby factory, and hundreds of people fell ill.',
    a: 'contaminated', x: ['purified', 'filtered', 'conserved'],
    e: 'Cause clue: factory waste made people ill, so the water was **contaminated** ("made impure, polluted"). Purified and filtered water would be safer, and conserved means saved.',
  },
  {
    id: 'sb-collapsed-business', d: 1,
    s: 'Even after his business ___, he never lost hope and soon started a new venture.',
    a: 'collapsed', x: ['flourished', 'expanded', 'prospered'],
    e: '"Even after ... never lost hope" implies a setback, so the business **collapsed** ("failed suddenly"). If it had flourished, expanded or prospered there would be no reason to lose hope.',
  },
  {
    id: 'sb-soothing-doctor', d: 1,
    s: 'The doctor\'s ___ manner calmed the frightened patient almost immediately.',
    a: 'soothing', x: ['brusque', 'abrasive', 'hostile'],
    e: 'Cause clue: the manner calmed a frightened patient, so it was **soothing** ("calming, comforting"). A brusque, abrasive or hostile manner would upset the patient further.',
  },
  {
    id: 'sb-nostalgic-old-man', d: 1,
    s: 'The old man was ___ about his youth, often recalling with fondness the village where he grew up.',
    a: 'nostalgic', x: ['indifferent', 'bitter', 'ignorant'],
    e: 'Definition clue: fondly recalling the past is being **nostalgic** ("longing affectionately for the past"). Indifferent and bitter contradict "with fondness", and he cannot be ignorant of memories he recalls.',
  },
  {
    id: 'sb-diversity-rainforest', d: 1,
    s: 'The rainforest\'s ___ of plant life astonished the botanists, who found hundreds of new species in a single month.',
    a: 'diversity', x: ['scarcity', 'uniformity', 'absence'],
    e: 'Example clue: hundreds of new species show great variety, or **diversity**. Scarcity and absence mean too few plants, and uniformity means sameness.',
  },
  {
    id: 'sb-thriving-city', d: 1,
    s: 'The ruins are all that remain of a once ___ city whose merchants traded with three continents.',
    a: 'thriving', x: ['impoverished', 'isolated', 'deserted'],
    e: 'Example clue: merchants trading with three continents show a **thriving** ("prosperous, flourishing") city. An impoverished, isolated or deserted city could not carry on such trade.',
  },
  {
    id: 'sb-revived-crops', d: 1,
    s: 'The long-awaited rain ___ the crops, which had been drying up for weeks under the hot sun.',
    a: 'revived', x: ['parched', 'scorched', 'withered'],
    e: 'Cause clue: rain falling on drying crops brings them back to life: **revived**. Parched, scorched and withered describe what the sun did, not what rain does.',
  },
  {
    id: 'sb-innovative-bridge', d: 1,
    s: 'Because the bridge\'s design was so ___, engineers from many countries came to study it.',
    a: 'innovative', x: ['conventional', 'outdated', 'ordinary'],
    e: 'Cause clue: engineers travel to study something new and original: an **innovative** design. A conventional, outdated or ordinary design would offer nothing new to learn.',
  },
];

// ------------------------------------------------------------------ difficulty 2

const MEDIUM: readonly Item[] = [
  {
    id: 'sb-concise-speech', d: 2, pp: true,
    s: 'Far from being ___, the senator\'s speech was so long and repetitive that half the audience fell asleep.',
    a: 'concise', x: ['tedious', 'verbose', 'rambling'],
    e: '"Far from being" needs the opposite of "long and repetitive": **concise** ("brief but complete"). Tedious, verbose and rambling all agree with the description, so they cannot follow "far from".',
  },
  {
    id: 'sb-laudatory-review', d: 2,
    s: 'The critic\'s review was unexpectedly ___: she praised the novel\'s plot, characters and style without reservation.',
    a: 'laudatory', x: ['scathing', 'ambivalent', 'dismissive'],
    e: 'Definition clue after the colon: praise without reservation makes the review **laudatory** ("full of praise"). Scathing and dismissive describe rejection, not praise, and ambivalent (mixed) contradicts "without reservation".',
  },
  {
    id: 'sb-frugality-minister', d: 2, pp: true,
    s: 'Known for his ___, the minister never spent public money on anything he considered unnecessary.',
    a: 'frugality', x: ['extravagance', 'generosity', 'negligence'],
    e: 'Definition clue: never spending on anything unnecessary is **frugality** ("being careful and sparing with money"). Extravagance and generosity involve spending freely, and negligence means carelessness.',
  },
  {
    id: 'sb-conclusive-evidence', d: 2,
    s: 'The new evidence was so ___ that the jury reached a unanimous verdict within minutes.',
    a: 'conclusive', x: ['dubious', 'ambiguous', 'flimsy'],
    e: 'Cause clue: a quick, unanimous verdict follows evidence that settles the question: **conclusive** ("decisive, removing all doubt"). Dubious, ambiguous or flimsy evidence would cause long debate.',
  },
  {
    id: 'sb-tactless-remarks', d: 2,
    s: 'Her ___ remarks offended everyone at the dinner, though she insisted she was only being honest.',
    a: 'tactless', x: ['diplomatic', 'courteous', 'flattering'],
    e: 'Cause clue: honest remarks that offend everyone are **tactless** ("insensitive to others\' feelings"). Diplomatic, courteous and flattering remarks are chosen precisely to avoid giving offence.',
  },
  {
    id: 'sb-fickle-politician', d: 2, pp: true,
    s: 'The politician was ___: he changed his position on the issue whenever public opinion shifted.',
    a: 'fickle', x: ['steadfast', 'candid', 'reclusive'],
    e: 'Definition clue after the colon: changing one\'s position with every shift of opinion is being **fickle** ("changeable, not loyal to one view"). Steadfast is the opposite; candid (frank) and reclusive (avoiding company) do not match the clue.',
  },
  {
    id: 'sb-obscure-lectures', d: 2,
    s: 'Because the professor\'s lectures were ___, students often had to read the textbook to work out what he meant.',
    a: 'obscure', x: ['lucid', 'coherent', 'entertaining'],
    e: 'Cause clue: students needed the textbook to understand his meaning, so the lectures were **obscure** ("unclear, hard to understand"). Lucid and coherent lectures would be easy to follow, and being entertaining does not make them hard to understand.',
  },
  {
    id: 'sb-apathetic-attitude', d: 2, pp: true,
    s: 'Ali\'s ___ attitude towards his studies worried his parents; he simply did not care whether he passed or failed.',
    a: 'apathetic', x: ['diligent', 'anxious', 'zealous'],
    e: 'Definition clue: not caring whether he passed or failed is an **apathetic** ("showing no interest or concern") attitude. A diligent, anxious or zealous student cares a great deal.',
  },
  {
    id: 'sb-tenacious-climber', d: 2,
    s: 'The ___ climber reached the summit on her third attempt; two earlier failures had not discouraged her at all.',
    a: 'tenacious', x: ['timid', 'hesitant', 'complacent'],
    e: 'Example clue: persisting after two failures shows a **tenacious** ("persistent, refusing to give up") climber. A timid or hesitant climber would be discouraged, and a complacent one would not push to try again.',
  },
  {
    id: 'sb-antagonistic-neighbours', d: 2,
    s: 'Once friendly, the two neighbours became ___ after a dispute over the boundary wall and now refuse even to greet each other.',
    a: 'antagonistic', x: ['cordial', 'amiable', 'sympathetic'],
    e: 'Contrast clue: "once friendly" and refusing to greet each other point to **antagonistic** ("actively hostile"). Cordial, amiable and sympathetic all describe friendly relations.',
  },
  {
    id: 'sb-confront-problem', d: 2,
    s: 'Rather than ___ the problem, the committee chose to ignore it in the hope that it would go away.',
    a: 'confront', x: ['overlook', 'evade', 'disregard'],
    e: '"Rather than" needs the opposite of "ignore": **confront** ("face and deal with"). Overlook, evade and disregard all mean much the same as ignore, so the contrast would be lost.',
  },
  {
    id: 'sb-partisan-documentary', d: 2,
    s: 'The documentary was criticised as ___ because it presented only one side of a complex dispute.',
    a: 'partisan', x: ['impartial', 'comprehensive', 'neutral'],
    e: 'Cause clue: presenting only one side is being **partisan** ("biased in favour of one side"). Impartial and neutral are the opposite, and a comprehensive film would cover every side.',
  },
  {
    id: 'sb-impartial-judge', d: 2, pp: true,
    s: 'The judge was admired for being ___; she never let personal feelings or friendships influence her rulings.',
    a: 'impartial', x: ['prejudiced', 'emotional', 'lenient'],
    e: 'Definition clue: keeping feelings and friendships out of rulings is being **impartial** ("fair, unbiased"). Prejudiced and emotional contradict the clue, and lenient (mild in punishing) is not what the clue describes.',
  },
  {
    id: 'sb-sceptical-villagers', d: 2,
    s: 'Initially ___ about the new irrigation scheme, the villagers became its strongest supporters once they saw its benefits.',
    a: 'sceptical', x: ['enthusiastic', 'optimistic', 'confident'],
    e: 'Contrast clue: "initially ... became its strongest supporters once they saw its benefits" implies early doubt: **sceptical** ("doubtful"). Enthusiastic, optimistic or confident villagers would have supported it from the start.',
  },
  {
    id: 'sb-erratic-rainfall', d: 2,
    s: 'The region\'s ___ rainfall makes farming risky: one year brings floods, the next a drought.',
    a: 'erratic', x: ['steady', 'abundant', 'moderate'],
    e: 'Example clue: floods one year and drought the next show **erratic** ("irregular, unpredictable") rainfall. Steady and moderate rainfall would not swing between extremes, and abundant rainfall would not cause drought.',
  },
  {
    id: 'sb-ambiguous-instructions', d: 2, pp: true,
    s: 'The manager\'s ___ instructions confused the staff, since they could be interpreted in several different ways.',
    a: 'ambiguous', x: ['explicit', 'precise', 'concise'],
    e: 'Definition clue: open to several interpretations means **ambiguous**. Explicit and precise instructions have one clear meaning, and concise refers to length, not to multiple meanings.',
  },
  {
    id: 'sb-panacea-tonic', d: 2, pp: true,
    s: 'The herbal tonic was advertised as a ___, a remedy for every illness, but doctors warned that no such cure exists.',
    a: 'panacea', x: ['placebo', 'pandemic', 'prognosis'],
    e: 'Definition clue: "a remedy for every illness" is the meaning of **panacea**. A placebo is a dummy pill, a pandemic is a worldwide outbreak, and a prognosis is a forecast of how a disease will develop.',
  },
  {
    id: 'sb-hackneyed-plot', d: 2,
    s: 'Though the novel\'s plot is ___, its vivid characters keep readers interested until the last page.',
    a: 'hackneyed', x: ['original', 'gripping', 'ingenious'],
    e: 'Contrast clue: "though ... vivid characters keep readers interested" requires a weakness in the plot: **hackneyed** ("overused, unoriginal"). Original, gripping and ingenious are strengths, so there would be no contrast.',
  },
  {
    id: 'sb-meticulous-scientist', d: 2, pp: true,
    s: 'The scientist was ___ in her research, checking every measurement three times before recording it.',
    a: 'meticulous', x: ['negligent', 'hasty', 'careless'],
    e: 'Example clue: checking each measurement three times shows a **meticulous** ("extremely careful and precise") researcher. Negligent, hasty and careless are its opposites.',
  },
  {
    id: 'sb-eloquent-speaker', d: 2,
    s: 'So ___ was the speaker that he held the audience\'s attention for two hours without a single note.',
    a: 'eloquent', x: ['hesitant', 'inarticulate', 'monotonous'],
    e: 'Cause clue: holding an audience for two hours without notes shows an **eloquent** ("fluent and persuasive") speaker. A hesitant, inarticulate or monotonous speaker would lose the audience.',
  },
  {
    id: 'sb-plummeted-profits', d: 2,
    s: 'The company\'s profits ___ after it lost its biggest customer, falling by half in a single year.',
    a: 'plummeted', x: ['soared', 'stabilised', 'recovered'],
    e: 'Definition clue: "falling by half in a single year" is a steep drop: profits **plummeted** ("fell sharply"). Soared and recovered mean rose, and stabilised means stayed steady.',
  },
  {
    id: 'sb-unfounded-claim', d: 2,
    s: 'The professor dismissed the student\'s claim as ___, saying it rested on nothing but rumour and guesswork.',
    a: 'unfounded', x: ['compelling', 'rigorous', 'plausible'],
    e: 'Definition clue: a claim based only on rumour and guesswork is **unfounded** ("having no basis in fact"). Compelling, rigorous and plausible are all reasons to accept a claim, not to dismiss it.',
  },
  {
    id: 'sb-gregarious-nature', d: 2, pp: true,
    s: 'Her ___ nature made her popular at parties, where she happily chatted with strangers for hours.',
    a: 'gregarious', x: ['reclusive', 'morose', 'taciturn'],
    e: 'Example clue: happily chatting with strangers for hours shows a **gregarious** ("sociable, fond of company") nature. Reclusive (avoiding people), morose (gloomy) and taciturn (saying little) are its opposites.',
  },
  {
    id: 'sb-pacify-crowd', d: 2,
    s: 'The negotiator\'s attempts to ___ the angry crowd only made it more furious.',
    a: 'pacify', x: ['provoke', 'incite', 'inflame'],
    e: '"Only made it more furious" signals an unintended result, so the negotiator was trying to **pacify** ("calm, make peaceful") the crowd. Provoke, incite and inflame would make a crowd more furious on purpose, so "only" would make no sense.',
  },
  {
    id: 'sb-succinct-essay', d: 2,
    s: 'Ayesha\'s essay was admirably ___; it said in one page what others needed five pages to say.',
    a: 'succinct', x: ['verbose', 'rambling', 'redundant'],
    e: 'Definition clue: saying in one page what others say in five is being **succinct** ("brief and clearly expressed"). Verbose, rambling and redundant all mean using too many words.',
  },
  {
    id: 'sb-ubiquitous-phones', d: 2, pp: true,
    s: 'Mobile phones, once a luxury of the rich, are now ___, found even in the most remote villages.',
    a: 'ubiquitous', x: ['unknown', 'prohibited', 'scarce'],
    e: 'Contrast and definition clues: once a luxury, now found even in remote villages, means **ubiquitous** ("found everywhere"). Unknown, prohibited and scarce contradict "found even in the most remote villages".',
  },
  {
    id: 'sb-evasive-reply', d: 2,
    s: 'Instead of answering the question directly, the spokesman gave a reply so ___ that it revealed nothing.',
    a: 'evasive', x: ['candid', 'explicit', 'forthright'],
    e: 'Contrast clue: "instead of answering directly" and "revealed nothing" describe an **evasive** ("avoiding a direct answer") reply. Candid, explicit and forthright replies are direct and revealing.',
  },
  {
    id: 'sb-placid-librarian', d: 2,
    s: 'The usually ___ librarian surprised everyone by shouting at a noisy group of students.',
    a: 'placid', x: ['irritable', 'volatile', 'belligerent'],
    e: '"Usually ... surprised everyone by shouting" needs a word meaning calm: **placid** ("calm, not easily upset"). Shouting would not surprise anyone if the librarian were usually irritable, volatile or belligerent.',
  },
  {
    id: 'sb-gullible-bilal', d: 2,
    s: 'Bilal is so ___ that he believes everything he is told, however unlikely it sounds.',
    a: 'gullible', x: ['sceptical', 'cynical', 'shrewd'],
    e: 'Definition clue: believing everything, however unlikely, is being **gullible** ("easily deceived"). Sceptical, cynical and shrewd people doubt or see through unlikely stories.',
  },
  {
    id: 'sb-ephemeral-fame', d: 2, pp: true,
    s: 'Fame on social media is often ___: someone celebrated today may be forgotten by next week.',
    a: 'ephemeral', x: ['enduring', 'perennial', 'immutable'],
    e: 'Definition clue after the colon: celebrated today, forgotten next week, means **ephemeral** ("lasting a very short time"). Enduring, perennial and immutable all describe things that last or never change.',
  },
];

// ------------------------------------------------------------------ difficulty 3

const HARD: readonly Item[] = [
  {
    id: 'sb-prescient-warning', d: 3,
    s: 'The economist\'s warning now seems ___: inflation rose almost exactly as she had predicted two years earlier.',
    a: 'prescient', x: ['erroneous', 'alarmist', 'ambiguous'],
    e: 'Definition clue: a prediction that came true years later shows foresight: **prescient** ("knowing of events before they happen"). Erroneous means wrong, alarmist means needlessly frightening, and an ambiguous warning could not be borne out "almost exactly".',
  },
  {
    id: 'sb-diffident-actor', d: 3, pp: true,
    s: 'Though ___ in private, the actor appeared confident and talkative on stage.',
    a: 'diffident', x: ['gregarious', 'arrogant', 'eloquent'],
    e: 'Contrast clue: "though ... confident and talkative on stage" needs the opposite: **diffident** ("shy, lacking self-confidence"). Gregarious, arrogant and eloquent all agree with confidence and talkativeness, so there would be no contrast.',
  },
  {
    id: 'sb-recalcitrant-pupil', d: 3,
    s: 'The ___ pupil refused to obey his parents, his teachers or anyone else in authority.',
    a: 'recalcitrant', x: ['docile', 'compliant', 'precocious'],
    e: 'Definition clue: refusing to obey any authority is being **recalcitrant** ("stubbornly uncooperative"). Docile and compliant mean obedient, and precocious (advanced for one\'s age) has nothing to do with disobedience.',
  },
  {
    id: 'sb-obsequious-letter', d: 3,
    s: 'The ___ tone of the letter, full of exaggerated praise, made the official suspect that the writer wanted a favour.',
    a: 'obsequious', x: ['brusque', 'candid', 'indifferent'],
    e: 'Definition clue: exaggerated praise aimed at gaining a favour is **obsequious** ("excessively eager to please, fawning"). A brusque, candid or indifferent tone contains no exaggerated praise.',
  },
  {
    id: 'sb-abstruse-treatise', d: 3,
    s: 'The philosopher\'s treatise is so ___ that only a handful of scholars claim to understand it fully.',
    a: 'abstruse', x: ['accessible', 'straightforward', 'popular'],
    e: 'Cause clue: only a handful of scholars understand it, so it is **abstruse** ("difficult to understand"). An accessible, straightforward or popular work would be understood by many readers.',
  },
  {
    id: 'sb-impassive-prisoner', d: 3, pp: true,
    s: 'The prisoner remained ___ throughout the trial, showing no emotion even when the sentence was read out.',
    a: 'impassive', x: ['distraught', 'agitated', 'jubilant'],
    e: 'Definition clue: showing no emotion is being **impassive** ("expressionless"). Distraught, agitated and jubilant all describe strong visible emotions.',
  },
  {
    id: 'sb-precocious-player', d: 3,
    s: 'The young chess player\'s talent was ___: at twelve she was already defeating national champions.',
    a: 'precocious', x: ['mediocre', 'latent', 'waning'],
    e: 'Example clue: beating national champions at twelve is ability developed unusually early: **precocious**. Mediocre means ordinary, latent means hidden or undeveloped, and waning means declining; none fits a twelve-year-old beating champions.',
  },
  {
    id: 'sb-laconic-general', d: 3, pp: true,
    s: 'Known for his ___ replies, the general answered most questions with a single word.',
    a: 'laconic', x: ['garrulous', 'effusive', 'pompous'],
    e: 'Definition clue: single-word answers are **laconic** ("using very few words"). Garrulous (talkative) and effusive (gushing) mean the opposite, and pompous (self-important) does not describe brevity.',
  },
  {
    id: 'sb-sanguine-coach', d: 3,
    s: 'Despite the team\'s poor results, the coach remained ___ about its chances in the final.',
    a: 'sanguine', x: ['pessimistic', 'despondent', 'apprehensive'],
    e: '"Despite the poor results" signals an unexpected attitude, so the coach was **sanguine** ("cheerfully optimistic"). Pessimistic, despondent and apprehensive are what poor results would normally produce, so they cannot follow "despite".',
  },
  {
    id: 'sb-intransigent-sides', d: 3, pp: true,
    s: 'The talks collapsed because both sides remained ___, refusing to make even the smallest concession.',
    a: 'intransigent', x: ['conciliatory', 'accommodating', 'pragmatic'],
    e: 'Definition clue: refusing any concession is being **intransigent** ("unwilling to compromise"). Conciliatory, accommodating and pragmatic parties make concessions, so the talks would not collapse for that reason.',
  },
];

export default defineBank('english', 'sentence-completion', (b) => [
  ...b.mcqs([...EASY, ...MEDIUM, ...HARD].map(toMcq)),
]);
