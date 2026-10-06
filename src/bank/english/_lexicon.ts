/**
 * Curated vocabulary for synonym/antonym generators (adjectives and adverbs).
 *
 * Rules for entries:
 * - `synonyms` must be genuine synonyms in common usage; `antonyms` genuine antonyms.
 * - `meaning` is a short definitional phrase for the headword; `opposite` is a short
 *   definitional phrase for its antonyms (used for SAT-style "antonym phrase" items).
 *   Neither may contain the headword itself.
 * - `distractors` are hand-picked OTHER HEADWORDS of the same part of speech that are
 *   clearly NEITHER synonyms NOR antonyms of the headword (never near-synonyms of an
 *   antonym, e.g. do not offer "shy" as a distractor for the antonym of "gregarious").
 *   Because they are headwords, their `meaning` doubles as a wrong definition in the
 *   definition-style templates.
 * - `field` is a coarse semantic cluster. A distractor must come from a different field
 *   than its headword; `lexiconIssues()` checks this and several overlap rules.
 * - `level`: 1 = common word, 2 = typical SAT/NET word, 3 = advanced word.
 */
export type LexLevel = 1 | 2 | 3;

export type SemanticField =
  | 'size' // size, quantity, money, importance, quality
  | 'time' // age, duration, frequency, novelty, speed of events
  | 'phys' // speed of movement, energy, physical strength
  | 'clarity' // clarity, style of expression, complexity, difficulty
  | 'person' // temperament, manners, courage, kindness, honesty, talkativeness
  | 'work' // diligence, care, thoroughness, order
  | 'mind' // judgement, wisdom, caution, credulity
  | 'will' // willingness, determination, obedience, intention
  | 'sense' // sight, sound, smell, moisture, appearance
  | 'truth'; // correctness, genuineness, credibility

export interface LexiconEntry {
  word: string;
  pos: 'adj' | 'noun' | 'verb' | 'adv';
  level: LexLevel;
  field: SemanticField;
  meaning: string;
  opposite: string;
  synonyms: readonly string[];
  antonyms: readonly string[];
  distractors: readonly string[];
}

export const LEXICON: readonly LexiconEntry[] = [
  // ---------------------------------------------------------------- adjectives: size, amount, money, importance
  { word: 'abundant', pos: 'adj', level: 1, field: 'size', meaning: 'existing in large quantities', opposite: 'existing in very small quantities', synonyms: ['plentiful', 'copious'], antonyms: ['scarce', 'meagre'], distractors: ['fragile', 'absurd', 'hostile', 'ambiguous', 'apathetic'] },
  { word: 'scarce', pos: 'adj', level: 1, field: 'size', meaning: 'available only in small amounts', opposite: 'available in large amounts', synonyms: ['rare', 'insufficient'], antonyms: ['plentiful', 'abundant'], distractors: ['arduous', 'cheerful', 'elderly', 'polite'] },
  { word: 'vast', pos: 'adj', level: 1, field: 'size', meaning: 'extremely large in area or extent', opposite: 'very small in area or extent', synonyms: ['immense', 'huge'], antonyms: ['tiny', 'small'], distractors: ['cheerful', 'authentic', 'brisk', 'punctual'] },
  { word: 'tiny', pos: 'adj', level: 1, field: 'size', meaning: 'very small', opposite: 'very large', synonyms: ['minuscule', 'little'], antonyms: ['huge', 'enormous'], distractors: ['hostile', 'cautious', 'coherent', 'lazy'] },
  { word: 'spacious', pos: 'adj', level: 1, field: 'size', meaning: 'having plenty of room', opposite: 'having very little room', synonyms: ['roomy', 'capacious'], antonyms: ['cramped', 'confined'], distractors: ['complex', 'defiant', 'conventional', 'noisy'] },
  { word: 'wealthy', pos: 'adj', level: 1, field: 'size', meaning: 'having a great deal of money', opposite: 'having very little money', synonyms: ['rich', 'affluent'], antonyms: ['poor', 'impoverished'], distractors: ['concise', 'affable', 'swift', 'careless'] },
  { word: 'ordinary', pos: 'adj', level: 1, field: 'size', meaning: 'normal, with no special features', opposite: 'unusual and remarkable', synonyms: ['common', 'usual'], antonyms: ['extraordinary', 'remarkable'], distractors: ['hostile', 'diligent', 'swift', 'docile'] },
  { word: 'significant', pos: 'adj', level: 1, field: 'size', meaning: 'important enough to be noticed', opposite: 'too unimportant to be noticed', synonyms: ['important', 'notable'], antonyms: ['insignificant', 'minor'], distractors: ['dubious', 'cheerful', 'polite', 'fragile'] },
  { word: 'superb', pos: 'adj', level: 1, field: 'size', meaning: 'of excellent quality', opposite: 'of very poor quality', synonyms: ['excellent', 'outstanding'], antonyms: ['inferior', 'poor'], distractors: ['eager', 'effortless', 'timid', 'elderly'] },
  { word: 'essential', pos: 'adj', level: 1, field: 'size', meaning: 'absolutely necessary', opposite: 'not necessary at all', synonyms: ['necessary', 'indispensable'], antonyms: ['unnecessary', 'inessential'], distractors: ['noisy', 'cheerful', 'energetic', 'explicit'] },
  { word: 'meagre', pos: 'adj', level: 2, field: 'size', meaning: 'lacking in quantity or quality', opposite: 'more than enough in amount', synonyms: ['scanty', 'paltry'], antonyms: ['ample', 'plentiful'], distractors: ['obstinate', 'circumspect', 'conscientious', 'convoluted', 'erroneous'] },
  { word: 'sparse', pos: 'adj', level: 2, field: 'size', meaning: 'thinly scattered over an area', opposite: 'closely packed together', synonyms: ['scattered', 'thin'], antonyms: ['dense', 'thick'], distractors: ['feeble', 'obstinate', 'eloquent', 'amicable'] },
  { word: 'colossal', pos: 'adj', level: 2, field: 'size', meaning: 'extremely large', opposite: 'extremely small', synonyms: ['gigantic', 'enormous'], antonyms: ['tiny', 'minuscule'], distractors: ['adamant', 'arrogant', 'frequent', 'gullible'] },
  { word: 'ample', pos: 'adj', level: 2, field: 'size', meaning: 'enough or more than enough', opposite: 'not enough for the purpose', synonyms: ['sufficient', 'plentiful'], antonyms: ['insufficient', 'inadequate'], distractors: ['timid', 'lucid', 'haphazard', 'obstinate'] },
  { word: 'frugal', pos: 'adj', level: 2, field: 'size', meaning: 'sparing with money or resources', opposite: 'spending money wastefully', synonyms: ['thrifty', 'economical'], antonyms: ['extravagant', 'wasteful'], distractors: ['courageous', 'tardy', 'transparent', 'fickle'] },
  { word: 'extravagant', pos: 'adj', level: 2, field: 'size', meaning: 'spending much more than is necessary', opposite: 'careful not to waste money', synonyms: ['lavish', 'wasteful'], antonyms: ['thrifty', 'frugal'], distractors: ['indolent', 'lucid', 'timid', 'incessant'] },
  { word: 'affluent', pos: 'adj', level: 2, field: 'size', meaning: 'having plenty of money', opposite: 'lacking money', synonyms: ['wealthy', 'prosperous'], antonyms: ['poor', 'needy'], distractors: ['audacious', 'lucid', 'obstinate', 'industrious'] },
  { word: 'trivial', pos: 'adj', level: 2, field: 'size', meaning: 'of little value or importance', opposite: 'of great value or importance', synonyms: ['petty', 'insignificant'], antonyms: ['important', 'significant'], distractors: ['intelligent', 'meticulous', 'timid', 'lethargic'] },
  { word: 'mediocre', pos: 'adj', level: 2, field: 'size', meaning: 'of only average quality', opposite: 'of outstanding quality', synonyms: ['average', 'second-rate'], antonyms: ['excellent', 'outstanding'], distractors: ['naive', 'fragile', 'negligent', 'modern'] },
  { word: 'pivotal', pos: 'adj', level: 2, field: 'size', meaning: 'of crucial importance', opposite: 'of minor importance', synonyms: ['crucial', 'central'], antonyms: ['peripheral', 'minor'], distractors: ['novel', 'timid', 'obvious', 'plausible'] },
  { word: 'renowned', pos: 'adj', level: 2, field: 'size', meaning: 'known and admired by many people', opposite: 'unknown to most people', synonyms: ['famous', 'celebrated'], antonyms: ['unknown', 'obscure'], distractors: ['onerous', 'prudent', 'timid', 'tardy'] },
  { word: 'opulent', pos: 'adj', level: 3, field: 'size', meaning: 'showing great wealth and luxury', opposite: 'plain and without luxury', synonyms: ['luxurious', 'sumptuous'], antonyms: ['austere', 'plain'], distractors: ['pragmatic', 'laconic', 'perpetual', 'sceptical'] },
  { word: 'parsimonious', pos: 'adj', level: 3, field: 'size', meaning: 'extremely unwilling to spend money', opposite: 'generous in spending money', synonyms: ['miserly', 'stingy'], antonyms: ['generous', 'lavish'], distractors: ['lucid', 'obsolete', 'premature', 'dormant'] },
  { word: 'destitute', pos: 'adj', level: 3, field: 'size', meaning: 'extremely poor and lacking necessities', opposite: 'very rich and well provided for', synonyms: ['impoverished', 'penniless'], antonyms: ['wealthy', 'affluent'], distractors: ['laconic', 'callous', 'vigilant', 'resolute'] },
  { word: 'paramount', pos: 'adj', level: 3, field: 'size', meaning: 'more important than anything else', opposite: 'lowest in importance', synonyms: ['supreme', 'foremost'], antonyms: ['minor', 'secondary'], distractors: ['shrewd', 'sporadic', 'laconic', 'morose'] },
  { word: 'superfluous', pos: 'adj', level: 3, field: 'size', meaning: 'more than is needed; unnecessary', opposite: 'required; necessary', synonyms: ['unnecessary', 'redundant'], antonyms: ['essential', 'necessary'], distractors: ['spurious', 'agile', 'morose', 'vigilant'] },
  { word: 'negligible', pos: 'adj', level: 3, field: 'size', meaning: 'so small as to be unimportant', opposite: 'large enough to matter', synonyms: ['insignificant', 'trivial'], antonyms: ['considerable', 'significant'], distractors: ['zealous', 'ambiguous', 'morose', 'sceptical'] },

  // ---------------------------------------------------------------- adjectives: time, age, frequency, novelty
  { word: 'ancient', pos: 'adj', level: 1, field: 'time', meaning: 'belonging to the very distant past', opposite: 'belonging to the present day', synonyms: ['old', 'antique'], antonyms: ['modern', 'recent'], distractors: ['noisy', 'cheerful', 'reckless', 'careless'] },
  { word: 'elderly', pos: 'adj', level: 1, field: 'time', meaning: 'old or ageing (of people)', opposite: 'young in age (of people)', synonyms: ['aged', 'old'], antonyms: ['young', 'youthful'], distractors: ['reluctant', 'abundant', 'tidy', 'bold'] },
  { word: 'punctual', pos: 'adj', level: 1, field: 'time', meaning: 'arriving or acting at the agreed time', opposite: 'arriving or acting later than agreed', synonyms: ['prompt', 'timely'], antonyms: ['late', 'tardy'], distractors: ['thorough', 'noisy', 'affluent', 'humble'] },
  { word: 'brief', pos: 'adj', level: 1, field: 'time', meaning: 'lasting only a short time', opposite: 'lasting a long time', synonyms: ['short', 'momentary'], antonyms: ['long', 'lengthy'], distractors: ['vague', 'ample', 'vigorous', 'calm'] },
  { word: 'frequent', pos: 'adj', level: 1, field: 'time', meaning: 'happening often', opposite: 'happening rarely', synonyms: ['common', 'recurrent'], antonyms: ['rare', 'infrequent'], distractors: ['wise', 'vivid', 'apathetic', 'timid'] },
  { word: 'modern', pos: 'adj', level: 1, field: 'time', meaning: 'belonging to present or recent times', opposite: 'belonging to the distant past', synonyms: ['contemporary', 'current'], antonyms: ['ancient', 'old-fashioned'], distractors: ['timid', 'honest', 'essential', 'careless'] },
  { word: 'ephemeral', pos: 'adj', level: 2, field: 'time', meaning: 'lasting a very short time', opposite: 'lasting for a very long time', synonyms: ['transient', 'fleeting'], antonyms: ['permanent', 'enduring'], distractors: ['absurd', 'polite', 'destitute', 'adamant'] },
  { word: 'tardy', pos: 'adj', level: 2, field: 'time', meaning: 'late or slow in happening', opposite: 'happening at the right time', synonyms: ['late', 'belated'], antonyms: ['punctual', 'prompt'], distractors: ['authentic', 'lucid', 'extravagant', 'candid'] },
  { word: 'perpetual', pos: 'adj', level: 2, field: 'time', meaning: 'never ending or changing', opposite: 'lasting for a limited time', synonyms: ['eternal', 'everlasting'], antonyms: ['temporary', 'transient'], distractors: ['lucid', 'cautious', 'conscientious', 'compassionate'] },
  { word: 'sporadic', pos: 'adj', level: 2, field: 'time', meaning: 'occurring at irregular intervals', opposite: 'happening continuously', synonyms: ['intermittent', 'occasional'], antonyms: ['constant', 'continuous'], distractors: ['circumspect', 'eloquent', 'gregarious', 'defiant'] },
  { word: 'incessant', pos: 'adj', level: 2, field: 'time', meaning: 'continuing without a pause', opposite: 'stopping and starting often', synonyms: ['ceaseless', 'unending'], antonyms: ['intermittent', 'occasional'], distractors: ['courageous', 'meagre', 'gregarious', 'lucid'] },
  { word: 'obsolete', pos: 'adj', level: 2, field: 'time', meaning: 'no longer produced or used', opposite: 'still in current use', synonyms: ['outdated', 'outmoded'], antonyms: ['current', 'modern'], distractors: ['gregarious', 'arduous', 'docile', 'drab'] },
  { word: 'novel', pos: 'adj', level: 2, field: 'time', meaning: 'new and unlike anything before', opposite: 'familiar and long established', synonyms: ['original', 'innovative'], antonyms: ['familiar', 'traditional'], distractors: ['coherent', 'dubious', 'frugal', 'robust'] },
  { word: 'conventional', pos: 'adj', level: 2, field: 'time', meaning: 'following accepted customs and practice', opposite: 'departing from accepted customs', synonyms: ['traditional', 'orthodox'], antonyms: ['unconventional', 'unorthodox'], distractors: ['complex', 'robust', 'eager', 'candid'] },
  { word: 'premature', pos: 'adj', level: 2, field: 'time', meaning: 'happening before the proper time', opposite: 'happening after the expected time', synonyms: ['early', 'untimely'], antonyms: ['belated', 'overdue'], distractors: ['concise', 'negligible', 'candid', 'robust'] },
  { word: 'archaic', pos: 'adj', level: 3, field: 'time', meaning: 'belonging to a much earlier period', opposite: 'up to date and modern', synonyms: ['antiquated', 'outmoded'], antonyms: ['modern', 'up-to-date'], distractors: ['laconic', 'erroneous', 'sanguine', 'parsimonious'] },
  { word: 'evanescent', pos: 'adj', level: 3, field: 'time', meaning: 'quickly fading or disappearing', opposite: 'lasting for ever', synonyms: ['fleeting', 'transitory'], antonyms: ['permanent', 'lasting'], distractors: ['parsimonious', 'sanguine', 'laconic', 'zealous'] },

  // ---------------------------------------------------------------- adjectives: movement, energy, strength
  { word: 'swift', pos: 'adj', level: 1, field: 'phys', meaning: 'moving or happening very quickly', opposite: 'moving or happening very slowly', synonyms: ['quick', 'rapid'], antonyms: ['slow', 'sluggish'], distractors: ['honest', 'fragrant', 'effortless', 'humble'] },
  { word: 'sluggish', pos: 'adj', level: 1, field: 'phys', meaning: 'slow-moving and inactive', opposite: 'quick and full of energy', synonyms: ['slow', 'inactive'], antonyms: ['brisk', 'lively'], distractors: ['honest', 'conventional', 'explicit', 'polite'] },
  { word: 'energetic', pos: 'adj', level: 1, field: 'phys', meaning: 'showing great activity and vitality', opposite: 'lacking activity and vitality', synonyms: ['lively', 'active'], antonyms: ['lethargic', 'sluggish'], distractors: ['honest', 'ephemeral', 'gullible', 'accurate'] },
  { word: 'fragile', pos: 'adj', level: 1, field: 'phys', meaning: 'easily broken or damaged', opposite: 'strong and hard to break', synonyms: ['delicate', 'breakable'], antonyms: ['sturdy', 'robust'], distractors: ['honest', 'haphazard', 'noisy', 'frequent'] },
  { word: 'feeble', pos: 'adj', level: 1, field: 'phys', meaning: 'lacking physical strength', opposite: 'having great physical strength', synonyms: ['weak', 'frail'], antonyms: ['strong', 'powerful'], distractors: ['ordinary', 'incessant', 'tidy', 'honest'] },
  { word: 'lethargic', pos: 'adj', level: 2, field: 'phys', meaning: 'sluggish and lacking energy', opposite: 'lively and full of energy', synonyms: ['listless', 'sluggish'], antonyms: ['energetic', 'lively'], distractors: ['candid', 'fickle', 'frugal', 'lucid'] },
  { word: 'vigorous', pos: 'adj', level: 2, field: 'phys', meaning: 'strong, healthy and full of energy', opposite: 'weak and lacking energy', synonyms: ['robust', 'energetic'], antonyms: ['feeble', 'weak'], distractors: ['candid', 'convoluted', 'frugal', 'paramount'] },
  { word: 'brisk', pos: 'adj', level: 2, field: 'phys', meaning: 'active, fast and energetic', opposite: 'slow and unhurried', synonyms: ['quick', 'lively'], antonyms: ['sluggish', 'leisurely'], distractors: ['candid', 'frugal', 'ornate', 'renowned'] },
  { word: 'robust', pos: 'adj', level: 2, field: 'phys', meaning: 'strong and healthy', opposite: 'weak and easily damaged', synonyms: ['sturdy', 'strong'], antonyms: ['frail', 'fragile'], distractors: ['candid', 'lucid', 'lazy', 'renowned'] },
  { word: 'agile', pos: 'adj', level: 2, field: 'phys', meaning: 'able to move quickly and easily', opposite: 'moving slowly and awkwardly', synonyms: ['nimble', 'lithe'], antonyms: ['clumsy', 'awkward'], distractors: ['meticulous', 'candid', 'modern', 'renowned'] },
  { word: 'dormant', pos: 'adj', level: 3, field: 'phys', meaning: 'temporarily inactive or asleep', opposite: 'fully active and working', synonyms: ['inactive', 'latent'], antonyms: ['active', 'awake'], distractors: ['laconic', 'sanguine', 'parsimonious', 'pragmatic'] },

  // ---------------------------------------------------------------- adjectives: clarity, expression, complexity
  { word: 'vague', pos: 'adj', level: 1, field: 'clarity', meaning: 'not clearly expressed or defined', opposite: 'clearly and exactly expressed', synonyms: ['unclear', 'hazy'], antonyms: ['clear', 'precise'], distractors: ['naive', 'pivotal', 'swift', 'humble'] },
  { word: 'obvious', pos: 'adj', level: 1, field: 'clarity', meaning: 'easily seen or understood', opposite: 'hard to see or understand', synonyms: ['clear', 'evident'], antonyms: ['hidden', 'obscure'], distractors: ['energetic', 'scarce', 'elderly', 'timid'] },
  { word: 'complex', pos: 'adj', level: 1, field: 'clarity', meaning: 'made of many connected parts; complicated', opposite: 'simple and easy to understand', synonyms: ['complicated', 'intricate'], antonyms: ['simple', 'straightforward'], distractors: ['timid', 'significant', 'elderly', 'honest'] },
  { word: 'lucid', pos: 'adj', level: 2, field: 'clarity', meaning: 'expressed clearly; easy to understand', opposite: 'expressed in a confusing way', synonyms: ['clear', 'coherent'], antonyms: ['obscure', 'confusing'], distractors: ['negligent', 'novel', 'swift', 'humble'] },
  { word: 'explicit', pos: 'adj', level: 2, field: 'clarity', meaning: 'stated clearly and in detail', opposite: 'suggested but not stated directly', synonyms: ['clear', 'unambiguous'], antonyms: ['implicit', 'implied'], distractors: ['cruel', 'perpetual', 'feeble', 'renowned'] },
  { word: 'ambiguous', pos: 'adj', level: 2, field: 'clarity', meaning: 'open to more than one interpretation', opposite: 'having only one possible meaning', synonyms: ['equivocal', 'unclear'], antonyms: ['unambiguous', 'definite'], distractors: ['frugal', 'plausible', 'robust', 'renowned'] },
  { word: 'verbose', pos: 'adj', level: 2, field: 'clarity', meaning: 'using more words than are needed', opposite: 'using few words', synonyms: ['wordy', 'long-winded'], antonyms: ['concise', 'succinct'], distractors: ['diffident', 'premature', 'robust', 'renowned'] },
  { word: 'concise', pos: 'adj', level: 2, field: 'clarity', meaning: 'giving much information in few words', opposite: 'using far too many words', synonyms: ['brief', 'succinct'], antonyms: ['wordy', 'verbose'], distractors: ['generous', 'humid', 'robust', 'prudent'] },
  { word: 'eloquent', pos: 'adj', level: 2, field: 'clarity', meaning: 'fluent and persuasive in speaking or writing', opposite: 'unable to express ideas fluently', synonyms: ['articulate', 'expressive'], antonyms: ['inarticulate', 'tongue-tied'], distractors: ['frugal', 'haughty', 'reckless', 'robust'] },
  { word: 'coherent', pos: 'adj', level: 2, field: 'clarity', meaning: 'logical and consistent', opposite: 'confused and illogical', synonyms: ['logical', 'consistent'], antonyms: ['incoherent', 'muddled'], distractors: ['frugal', 'irritable', 'lethargic', 'reluctant'] },
  { word: 'arduous', pos: 'adj', level: 2, field: 'clarity', meaning: 'involving great effort; difficult and tiring', opposite: 'needing little effort; easy', synonyms: ['strenuous', 'laborious'], antonyms: ['easy', 'effortless'], distractors: ['resolute', 'polite', 'sagacious', 'superb'] },
  { word: 'intricate', pos: 'adj', level: 2, field: 'clarity', meaning: 'very complicated or detailed', opposite: 'plain and simple in design', synonyms: ['complex', 'elaborate'], antonyms: ['simple', 'plain'], distractors: ['frugal', 'jovial', 'shrewd', 'sluggish'] },
  { word: 'effortless', pos: 'adj', level: 2, field: 'clarity', meaning: 'achieved with ease', opposite: 'needing great effort', synonyms: ['easy', 'painless'], antonyms: ['laborious', 'strenuous'], distractors: ['frugal', 'loquacious', 'sporadic', 'renowned'] },
  { word: 'cryptic', pos: 'adj', level: 3, field: 'clarity', meaning: 'mysterious and hard to understand', opposite: 'plain and easy to understand', synonyms: ['enigmatic', 'puzzling'], antonyms: ['clear', 'straightforward'], distractors: ['sanguine', 'parsimonious', 'dormant', 'spurious'] },
  { word: 'laconic', pos: 'adj', level: 3, field: 'clarity', meaning: 'using very few words', opposite: 'using a great many words', synonyms: ['terse', 'pithy'], antonyms: ['verbose', 'wordy'], distractors: ['sanguine', 'dormant', 'luminous', 'pragmatic'] },
  { word: 'onerous', pos: 'adj', level: 3, field: 'clarity', meaning: 'involving a heavy burden or effort', opposite: 'involving little burden or effort', synonyms: ['burdensome', 'taxing'], antonyms: ['easy', 'undemanding'], distractors: ['sanguine', 'luminous', 'raucous', 'parsimonious'] },
  { word: 'convoluted', pos: 'adj', level: 3, field: 'clarity', meaning: 'extremely complex and hard to follow', opposite: 'simple and easy to follow', synonyms: ['tortuous', 'complicated'], antonyms: ['straightforward', 'simple'], distractors: ['zealous', 'raucous', 'magnanimous', 'parsimonious'] },

  // ---------------------------------------------------------------- adjectives: character and temperament
  { word: 'timid', pos: 'adj', level: 1, field: 'person', meaning: 'lacking courage or confidence', opposite: 'brave and confident', synonyms: ['shy', 'fearful'], antonyms: ['bold', 'confident'], distractors: ['obvious', 'accurate', 'thorough', 'transparent'] },
  { word: 'bold', pos: 'adj', level: 1, field: 'person', meaning: 'confident and willing to take risks', opposite: 'shy and lacking courage', synonyms: ['daring', 'brave'], antonyms: ['timid', 'cowardly'], distractors: ['punctual', 'trivial', 'wise', 'accurate'] },
  { word: 'cheerful', pos: 'adj', level: 1, field: 'person', meaning: 'noticeably happy and optimistic', opposite: 'sad and gloomy', synonyms: ['happy', 'jolly'], antonyms: ['gloomy', 'miserable'], distractors: ['verbose', 'punctual', 'vast', 'accurate'] },
  { word: 'polite', pos: 'adj', level: 1, field: 'person', meaning: 'having or showing good manners', opposite: 'having or showing bad manners', synonyms: ['courteous', 'respectful'], antonyms: ['rude', 'impolite'], distractors: ['absurd', 'abundant', 'vivid', 'swift'] },
  { word: 'humble', pos: 'adj', level: 1, field: 'person', meaning: 'having a modest opinion of oneself', opposite: 'having too high an opinion of oneself', synonyms: ['modest', 'unassuming'], antonyms: ['arrogant', 'proud'], distractors: ['swift', 'humid', 'ambiguous', 'accurate'] },
  { word: 'hostile', pos: 'adj', level: 1, field: 'person', meaning: 'unfriendly and aggressive', opposite: 'friendly and welcoming', synonyms: ['unfriendly', 'antagonistic'], antonyms: ['friendly', 'amicable'], distractors: ['spacious', 'apathetic', 'accurate', 'arduous'] },
  { word: 'calm', pos: 'adj', level: 1, field: 'person', meaning: 'not showing anxiety, anger or excitement', opposite: 'anxious, angry or excited', synonyms: ['composed', 'relaxed'], antonyms: ['agitated', 'anxious'], distractors: ['ancient', 'spacious', 'accurate', 'cautious'] },
  { word: 'talkative', pos: 'adj', level: 1, field: 'person', meaning: 'fond of talking a great deal', opposite: 'saying very little', synonyms: ['chatty', 'loquacious'], antonyms: ['quiet', 'reserved'], distractors: ['tidy', 'spacious', 'coherent', 'accurate'] },
  { word: 'cruel', pos: 'adj', level: 1, field: 'person', meaning: 'deliberately causing pain or suffering', opposite: 'kind and gentle towards others', synonyms: ['heartless', 'brutal'], antonyms: ['kind', 'merciful'], distractors: ['spacious', 'authentic', 'complex', 'swift'] },
  { word: 'generous', pos: 'adj', level: 1, field: 'person', meaning: 'ready to give more than is expected', opposite: 'unwilling to give or share', synonyms: ['unselfish', 'charitable'], antonyms: ['selfish', 'stingy'], distractors: ['ancient', 'concise', 'swift', 'accurate'] },
  { word: 'honest', pos: 'adj', level: 1, field: 'person', meaning: 'truthful and sincere', opposite: 'inclined to lie or cheat', synonyms: ['truthful', 'upright'], antonyms: ['dishonest', 'deceitful'], distractors: ['spacious', 'defiant', 'swift', 'ancient'] },
  { word: 'courageous', pos: 'adj', level: 1, field: 'person', meaning: 'not put off by danger or pain', opposite: 'easily frightened by danger', synonyms: ['brave', 'valiant'], antonyms: ['cowardly', 'fearful'], distractors: ['diligent', 'tidy', 'ancient', 'spacious'] },
  { word: 'gregarious', pos: 'adj', level: 2, field: 'person', meaning: 'fond of company', opposite: 'preferring to be alone', synonyms: ['sociable', 'outgoing'], antonyms: ['reclusive', 'unsociable'], distractors: ['punctual', 'onerous', 'fragile', 'accurate'] },
  { word: 'arrogant', pos: 'adj', level: 2, field: 'person', meaning: "having an exaggerated sense of one's importance", opposite: "modest about one's own importance", synonyms: ['haughty', 'conceited'], antonyms: ['humble', 'modest'], distractors: ['destitute', 'fragile', 'punctual', 'agile'] },
  { word: 'amicable', pos: 'adj', level: 2, field: 'person', meaning: 'friendly and without disagreement', opposite: 'unfriendly and quarrelsome', synonyms: ['friendly', 'cordial'], antonyms: ['hostile', 'unfriendly'], distractors: ['essential', 'fragile', 'adamant', 'agile'] },
  { word: 'serene', pos: 'adj', level: 2, field: 'person', meaning: 'calm, peaceful and untroubled', opposite: 'troubled and agitated', synonyms: ['tranquil', 'placid'], antonyms: ['agitated', 'troubled'], distractors: ['frugal', 'fragile', 'accurate', 'circumspect'] },
  { word: 'jovial', pos: 'adj', level: 2, field: 'person', meaning: 'cheerful and friendly', opposite: 'gloomy and unfriendly', synonyms: ['jolly', 'genial'], antonyms: ['morose', 'sullen'], distractors: ['frugal', 'arid', 'agile', 'conscientious'] },
  { word: 'affable', pos: 'adj', level: 2, field: 'person', meaning: 'friendly and easy to talk to', opposite: 'unfriendly and hard to approach', synonyms: ['genial', 'amiable'], antonyms: ['unfriendly', 'standoffish'], distractors: ['frugal', 'arid', 'convoluted', 'obsolete'] },
  { word: 'irritable', pos: 'adj', level: 2, field: 'person', meaning: 'easily annoyed or angered', opposite: 'patient and slow to anger', synonyms: ['bad-tempered', 'touchy'], antonyms: ['easy-going', 'good-natured'], distractors: ['frugal', 'cursory', 'obsolete', 'dubious'] },
  { word: 'benevolent', pos: 'adj', level: 2, field: 'person', meaning: 'well-meaning and kindly', opposite: 'intending harm to others', synonyms: ['kind', 'charitable'], antonyms: ['malevolent', 'cruel'], distractors: ['fragile', 'spacious', 'punctual', 'ancient'] },
  { word: 'candid', pos: 'adj', level: 2, field: 'person', meaning: 'truthful and straightforward', opposite: 'avoiding giving direct answers', synonyms: ['frank', 'forthright'], antonyms: ['evasive', 'guarded'], distractors: ['conventional', 'fragile', 'sluggish', 'noisy'] },
  { word: 'sincere', pos: 'adj', level: 2, field: 'person', meaning: 'genuine in feeling; not pretending', opposite: 'pretending to feel what one does not', synonyms: ['genuine', 'heartfelt'], antonyms: ['insincere', 'hypocritical'], distractors: ['frugal', 'eager', 'agile', 'effortless'] },
  { word: 'deceitful', pos: 'adj', level: 2, field: 'person', meaning: 'trying to mislead or trick others', opposite: 'honest and open with others', synonyms: ['dishonest', 'deceptive'], antonyms: ['honest', 'truthful'], distractors: ['colossal', 'agile', 'extravagant', 'punctual'] },
  { word: 'compassionate', pos: 'adj', level: 2, field: 'person', meaning: 'feeling sympathy for the suffering of others', opposite: 'showing no sympathy for others', synonyms: ['sympathetic', 'caring'], antonyms: ['callous', 'heartless'], distractors: ['explicit', 'agile', 'meagre', 'obsolete'] },
  { word: 'morose', pos: 'adj', level: 3, field: 'person', meaning: 'sullen and gloomy', opposite: 'cheerful and good-humoured', synonyms: ['sullen', 'glum'], antonyms: ['cheerful', 'jovial'], distractors: ['intricate', 'obsolete', 'colossal', 'pragmatic'] },
  { word: 'reticent', pos: 'adj', level: 3, field: 'person', meaning: "not readily revealing one's thoughts", opposite: "open and ready to share one's thoughts", synonyms: ['reserved', 'uncommunicative'], antonyms: ['forthcoming', 'communicative'], distractors: ['mediocre', 'ephemeral', 'obsolete', 'intricate'] },
  { word: 'loquacious', pos: 'adj', level: 3, field: 'person', meaning: 'tending to talk a great deal', opposite: 'tending to say very little', synonyms: ['talkative', 'garrulous'], antonyms: ['taciturn', 'uncommunicative'], distractors: ['fickle', 'gullible', 'obsolete', 'arid'] },
  { word: 'taciturn', pos: 'adj', level: 3, field: 'person', meaning: 'saying very little; reserved in speech', opposite: 'talking freely and a great deal', synonyms: ['uncommunicative', 'reticent'], antonyms: ['talkative', 'loquacious'], distractors: ['haphazard', 'impetuous', 'obsolete', 'arid'] },
  { word: 'audacious', pos: 'adj', level: 3, field: 'person', meaning: 'willing to take bold risks', opposite: 'unwilling to take any risks', synonyms: ['daring', 'fearless'], antonyms: ['timid', 'cautious'], distractors: ['indolent', 'obsolete', 'arid', 'parsimonious'] },
  { word: 'diffident', pos: 'adj', level: 3, field: 'person', meaning: 'lacking self-confidence; shy', opposite: 'self-assured and confident', synonyms: ['bashful', 'unassertive'], antonyms: ['confident', 'assertive'], distractors: ['industrious', 'obsolete', 'arid', 'lethargic'] },
  { word: 'haughty', pos: 'adj', level: 3, field: 'person', meaning: 'proud and scornful of others', opposite: 'modest and respectful of others', synonyms: ['arrogant', 'disdainful'], antonyms: ['humble', 'modest'], distractors: ['negligible', 'obsolete', 'arid', 'intricate'] },
  { word: 'malevolent', pos: 'adj', level: 3, field: 'person', meaning: 'wishing to do harm to others', opposite: 'wishing to do good to others', synonyms: ['malicious', 'spiteful'], antonyms: ['benevolent', 'kindly'], distractors: ['meticulous', 'evanescent', 'arid', 'naive'] },
  { word: 'callous', pos: 'adj', level: 3, field: 'person', meaning: "cruelly indifferent to others' feelings", opposite: "sensitive to others' feelings", synonyms: ['heartless', 'unfeeling'], antonyms: ['compassionate', 'caring'], distractors: ['paramount', 'obsolete', 'arid', 'intricate'] },
  { word: 'magnanimous', pos: 'adj', level: 3, field: 'person', meaning: 'generous and forgiving, especially to a rival', opposite: 'petty and unforgiving', synonyms: ['big-hearted', 'forgiving'], antonyms: ['petty', 'vindictive'], distractors: ['pivotal', 'evanescent', 'arid', 'intricate'] },
  { word: 'sanguine', pos: 'adj', level: 3, field: 'person', meaning: 'optimistic, especially in a difficult situation', opposite: 'pessimistic and expecting the worst', synonyms: ['optimistic', 'hopeful'], antonyms: ['pessimistic', 'gloomy'], distractors: ['obsolete', 'arid', 'intricate', 'negligent'] },

  // ---------------------------------------------------------------- adjectives: work and care
  { word: 'diligent', pos: 'adj', level: 1, field: 'work', meaning: 'showing care and effort in work', opposite: 'showing little care or effort in work', synonyms: ['industrious', 'assiduous'], antonyms: ['lazy', 'negligent'], distractors: ['spacious', 'cheerful', 'elderly', 'fragrant'] },
  { word: 'careless', pos: 'adj', level: 1, field: 'work', meaning: 'not giving enough attention to avoid mistakes', opposite: 'paying close attention to avoid mistakes', synonyms: ['negligent', 'sloppy'], antonyms: ['careful', 'attentive'], distractors: ['serene', 'fragrant', 'elderly', 'spacious'] },
  { word: 'lazy', pos: 'adj', level: 1, field: 'work', meaning: 'unwilling to work or make an effort', opposite: 'willing to work hard', synonyms: ['idle', 'slothful'], antonyms: ['hard-working', 'industrious'], distractors: ['sincere', 'fragrant', 'spacious', 'ephemeral'] },
  { word: 'thorough', pos: 'adj', level: 1, field: 'work', meaning: 'complete and attentive to every detail', opposite: 'hasty and superficial', synonyms: ['complete', 'comprehensive'], antonyms: ['superficial', 'cursory'], distractors: ['talkative', 'fragrant', 'ordinary', 'noisy'] },
  { word: 'tidy', pos: 'adj', level: 1, field: 'work', meaning: 'neat and well arranged', opposite: 'messy and disorganised', synonyms: ['neat', 'orderly'], antonyms: ['untidy', 'messy'], distractors: ['intelligent', 'honest', 'swift', 'ancient'] },
  { word: 'meticulous', pos: 'adj', level: 2, field: 'work', meaning: 'showing great attention to detail', opposite: 'paying little attention to detail', synonyms: ['thorough', 'scrupulous'], antonyms: ['careless', 'sloppy'], distractors: ['cheerful', 'scarce', 'ancient', 'noisy'] },
  { word: 'industrious', pos: 'adj', level: 2, field: 'work', meaning: 'working hard and steadily', opposite: 'unwilling to work', synonyms: ['hard-working', 'diligent'], antonyms: ['lazy', 'idle'], distractors: ['feeble', 'frequent', 'significant', 'candid'] },
  { word: 'negligent', pos: 'adj', level: 2, field: 'work', meaning: 'failing to take proper care', opposite: 'taking proper care', synonyms: ['careless', 'remiss'], antonyms: ['careful', 'conscientious'], distractors: ['malevolent', 'incessant', 'obvious', 'renowned'] },
  { word: 'haphazard', pos: 'adj', level: 2, field: 'work', meaning: 'lacking any obvious order or plan', opposite: 'carefully planned and orderly', synonyms: ['random', 'disorganised'], antonyms: ['systematic', 'methodical'], distractors: ['modern', 'colossal', 'renowned', 'candid'] },
  { word: 'indolent', pos: 'adj', level: 3, field: 'work', meaning: 'wanting to avoid activity or effort', opposite: 'eager to work and make an effort', synonyms: ['lazy', 'slothful'], antonyms: ['industrious', 'diligent'], distractors: ['luminous', 'archaic', 'cryptic', 'raucous'] },
  { word: 'cursory', pos: 'adj', level: 3, field: 'work', meaning: 'hasty and therefore not thorough', opposite: 'careful and detailed', synonyms: ['hasty', 'perfunctory'], antonyms: ['thorough', 'painstaking'], distractors: ['luminous', 'sanguine', 'opulent', 'raucous'] },
  { word: 'conscientious', pos: 'adj', level: 3, field: 'work', meaning: "wishing to do one's work or duty well", opposite: "careless about one's work or duty", synonyms: ['scrupulous', 'dutiful'], antonyms: ['careless', 'negligent'], distractors: ['luminous', 'opulent', 'archaic', 'raucous'] },

  // ---------------------------------------------------------------- adjectives: judgement
  { word: 'reckless', pos: 'adj', level: 1, field: 'mind', meaning: 'heedless of danger or consequences', opposite: 'careful to avoid danger', synonyms: ['rash', 'heedless'], antonyms: ['cautious', 'careful'], distractors: ['affable', 'fragrant', 'ancient', 'sparse'] },
  { word: 'cautious', pos: 'adj', level: 1, field: 'mind', meaning: 'careful to avoid risks or danger', opposite: 'taking risks without thought', synonyms: ['careful', 'wary'], antonyms: ['reckless', 'rash'], distractors: ['wealthy', 'fragrant', 'noisy', 'elderly'] },
  { word: 'wise', pos: 'adj', level: 1, field: 'mind', meaning: 'having good judgement and knowledge', opposite: 'lacking good judgement', synonyms: ['sensible', 'sage'], antonyms: ['foolish', 'unwise'], distractors: ['wealthy', 'fragrant', 'noisy', 'tiny'] },
  { word: 'intelligent', pos: 'adj', level: 1, field: 'mind', meaning: 'quick to understand and learn', opposite: 'slow to understand and learn', synonyms: ['clever', 'bright'], antonyms: ['stupid', 'unintelligent'], distractors: ['wealthy', 'fragrant', 'noisy', 'ancient'] },
  { word: 'absurd', pos: 'adj', level: 1, field: 'mind', meaning: 'wildly unreasonable or illogical', opposite: 'sensible and reasonable', synonyms: ['ridiculous', 'illogical'], antonyms: ['sensible', 'reasonable'], distractors: ['fragrant', 'wealthy', 'punctual', 'tiny'] },
  { word: 'prudent', pos: 'adj', level: 2, field: 'mind', meaning: 'acting with care and thought for the future', opposite: 'acting without thought for the future', synonyms: ['wise', 'judicious'], antonyms: ['reckless', 'rash'], distractors: ['noisy', 'ornate', 'elderly', 'humid'] },
  { word: 'naive', pos: 'adj', level: 2, field: 'mind', meaning: 'lacking experience or judgement', opposite: 'experienced and worldly-wise', synonyms: ['inexperienced', 'gullible'], antonyms: ['sophisticated', 'worldly'], distractors: ['colossal', 'ornate', 'amicable', 'punctual'] },
  { word: 'shrewd', pos: 'adj', level: 2, field: 'mind', meaning: 'having sharp practical judgement', opposite: 'lacking sound judgement', synonyms: ['astute', 'sharp'], antonyms: ['naive', 'foolish'], distractors: ['colossal', 'ornate', 'humid', 'punctual'] },
  { word: 'vigilant', pos: 'adj', level: 2, field: 'mind', meaning: 'keeping careful watch for danger', opposite: 'not watching out for danger', synonyms: ['watchful', 'alert'], antonyms: ['inattentive', 'heedless'], distractors: ['colossal', 'ornate', 'humid', 'frugal'] },
  { word: 'gullible', pos: 'adj', level: 2, field: 'mind', meaning: 'easily tricked or persuaded', opposite: 'not easily tricked', synonyms: ['credulous', 'naive'], antonyms: ['sceptical', 'suspicious'], distractors: ['colossal', 'ornate', 'humid', 'frugal'] },
  { word: 'sceptical', pos: 'adj', level: 2, field: 'mind', meaning: 'inclined to doubt or question claims', opposite: 'ready to believe claims', synonyms: ['doubtful', 'questioning'], antonyms: ['credulous', 'trusting'], distractors: ['colossal', 'ornate', 'humid', 'frugal'] },
  { word: 'sagacious', pos: 'adj', level: 3, field: 'mind', meaning: 'having keen judgement and wisdom', opposite: 'lacking wisdom; foolish', synonyms: ['wise', 'shrewd'], antonyms: ['foolish', 'obtuse'], distractors: ['evanescent', 'opulent', 'raucous', 'archaic'] },
  { word: 'impetuous', pos: 'adj', level: 3, field: 'mind', meaning: 'acting quickly without thinking', opposite: 'acting only after careful thought', synonyms: ['rash', 'impulsive'], antonyms: ['cautious', 'circumspect'], distractors: ['luminous', 'opulent', 'archaic', 'parsimonious'] },
  { word: 'circumspect', pos: 'adj', level: 3, field: 'mind', meaning: 'careful to consider all risks', opposite: 'heedless of risks', synonyms: ['cautious', 'wary'], antonyms: ['reckless', 'rash'], distractors: ['luminous', 'opulent', 'raucous', 'archaic'] },
  { word: 'pragmatic', pos: 'adj', level: 3, field: 'mind', meaning: 'dealing with things in a practical way', opposite: 'guided by ideals rather than practicalities', synonyms: ['practical', 'realistic'], antonyms: ['idealistic', 'impractical'], distractors: ['luminous', 'opulent', 'raucous', 'cryptic'] },

  // ---------------------------------------------------------------- adjectives: will and attitude
  { word: 'eager', pos: 'adj', level: 1, field: 'will', meaning: 'strongly wanting to do something', opposite: 'unwilling to do something', synonyms: ['keen', 'enthusiastic'], antonyms: ['reluctant', 'unwilling'], distractors: ['wealthy', 'fragrant', 'ancient', 'spacious'] },
  { word: 'reluctant', pos: 'adj', level: 1, field: 'will', meaning: 'unwilling and hesitant', opposite: 'willing and eager', synonyms: ['unwilling', 'hesitant'], antonyms: ['eager', 'willing'], distractors: ['wealthy', 'fragrant', 'spacious', 'humid'] },
  { word: 'obstinate', pos: 'adj', level: 2, field: 'will', meaning: "stubbornly refusing to change one's opinion", opposite: "willing to change one's opinion", synonyms: ['stubborn', 'headstrong'], antonyms: ['compliant', 'docile'], distractors: ['wealthy', 'tiny', 'fragrant', 'accurate'] },
  { word: 'resolute', pos: 'adj', level: 2, field: 'will', meaning: 'firmly determined', opposite: 'unsure what to do', synonyms: ['determined', 'steadfast'], antonyms: ['irresolute', 'hesitant'], distractors: ['humid', 'colossal', 'ornate', 'lucid'] },
  { word: 'docile', pos: 'adj', level: 2, field: 'will', meaning: 'ready to accept control or instruction', opposite: 'difficult to control', synonyms: ['obedient', 'compliant'], antonyms: ['unruly', 'defiant'], distractors: ['humid', 'colossal', 'ornate', 'lucid'] },
  { word: 'apathetic', pos: 'adj', level: 2, field: 'will', meaning: 'showing no interest or enthusiasm', opposite: 'showing strong interest and enthusiasm', synonyms: ['indifferent', 'unconcerned'], antonyms: ['enthusiastic', 'passionate'], distractors: ['humid', 'colossal', 'ornate', 'eloquent'] },
  { word: 'defiant', pos: 'adj', level: 2, field: 'will', meaning: 'openly resisting authority', opposite: 'willingly obeying authority', synonyms: ['rebellious', 'disobedient'], antonyms: ['obedient', 'submissive'], distractors: ['humid', 'arid', 'renowned', 'lucid'] },
  { word: 'zealous', pos: 'adj', level: 3, field: 'will', meaning: 'showing great passion for a cause', opposite: 'showing no interest in a cause', synonyms: ['fervent', 'ardent'], antonyms: ['apathetic', 'indifferent'], distractors: ['luminous', 'opulent', 'archaic', 'cryptic'] },
  { word: 'adamant', pos: 'adj', level: 3, field: 'will', meaning: "refusing to change one's mind", opposite: "ready to change one's mind", synonyms: ['unyielding', 'inflexible'], antonyms: ['flexible', 'yielding'], distractors: ['luminous', 'evanescent', 'archaic', 'cryptic'] },
  { word: 'tenacious', pos: 'adj', level: 3, field: 'will', meaning: 'holding firmly to a purpose; persistent', opposite: 'giving up easily', synonyms: ['persistent', 'determined'], antonyms: ['irresolute', 'wavering'], distractors: ['luminous', 'opulent', 'archaic', 'raucous'] },
  { word: 'fickle', pos: 'adj', level: 3, field: 'will', meaning: 'changing loyalties or interests often', opposite: 'firmly loyal and constant', synonyms: ['capricious', 'changeable'], antonyms: ['steadfast', 'loyal'], distractors: ['luminous', 'opulent', 'raucous', 'cryptic'] },

  // ---------------------------------------------------------------- adjectives: the senses
  { word: 'vivid', pos: 'adj', level: 1, field: 'sense', meaning: 'producing strong, clear images; bright', opposite: 'dull and lacking brightness', synonyms: ['bright', 'striking'], antonyms: ['dull', 'faded'], distractors: ['punctual', 'humble', 'honest', 'tardy'] },
  { word: 'noisy', pos: 'adj', level: 1, field: 'sense', meaning: 'making a lot of noise', opposite: 'making little or no noise', synonyms: ['loud', 'rowdy'], antonyms: ['quiet', 'silent'], distractors: ['wealthy', 'honest', 'ancient', 'careless'] },
  { word: 'fragrant', pos: 'adj', level: 1, field: 'sense', meaning: 'having a pleasant smell', opposite: 'having an unpleasant smell', synonyms: ['aromatic', 'sweet-smelling'], antonyms: ['smelly', 'foul-smelling'], distractors: ['wealthy', 'honest', 'ancient', 'careless'] },
  { word: 'humid', pos: 'adj', level: 1, field: 'sense', meaning: 'containing a lot of moisture (of air)', opposite: 'containing very little moisture', synonyms: ['damp', 'muggy'], antonyms: ['dry', 'arid'], distractors: ['honest', 'careless', 'timid', 'wealthy'] },
  { word: 'transparent', pos: 'adj', level: 1, field: 'sense', meaning: 'clear enough to be seen through', opposite: 'impossible to see through', synonyms: ['clear', 'see-through'], antonyms: ['opaque', 'cloudy'], distractors: ['wealthy', 'ancient', 'timid', 'swift'] },
  { word: 'drab', pos: 'adj', level: 2, field: 'sense', meaning: 'dull and lacking colour', opposite: 'bright and full of colour', synonyms: ['dreary', 'dull'], antonyms: ['colourful', 'bright'], distractors: ['agile', 'punctual', 'candid', 'obstinate'] },
  { word: 'arid', pos: 'adj', level: 2, field: 'sense', meaning: 'having little or no rain; very dry', opposite: 'having plenty of moisture', synonyms: ['dry', 'parched'], antonyms: ['wet', 'humid'], distractors: ['candid', 'obstinate', 'agile', 'punctual'] },
  { word: 'ornate', pos: 'adj', level: 2, field: 'sense', meaning: 'elaborately decorated', opposite: 'plain and without decoration', synonyms: ['elaborate', 'decorative'], antonyms: ['plain', 'unadorned'], distractors: ['candid', 'obstinate', 'agile', 'punctual'] },
  { word: 'luminous', pos: 'adj', level: 3, field: 'sense', meaning: 'giving off light; glowing', opposite: 'giving off no light; dark', synonyms: ['radiant', 'glowing'], antonyms: ['dark', 'dim'], distractors: ['parsimonious', 'tenacious', 'cursory', 'impetuous'] },
  { word: 'raucous', pos: 'adj', level: 3, field: 'sense', meaning: 'loud and harsh-sounding', opposite: 'soft and pleasant-sounding', synonyms: ['harsh', 'strident'], antonyms: ['soft', 'melodious'], distractors: ['parsimonious', 'sagacious', 'tenacious', 'cursory'] },

  // ---------------------------------------------------------------- adjectives: truth and correctness
  { word: 'accurate', pos: 'adj', level: 1, field: 'truth', meaning: 'correct in every detail', opposite: 'containing errors', synonyms: ['exact', 'precise'], antonyms: ['inaccurate', 'incorrect'], distractors: ['wealthy', 'fragrant', 'ancient', 'timid'] },
  { word: 'authentic', pos: 'adj', level: 2, field: 'truth', meaning: 'genuine; of undisputed origin', opposite: 'copied or fake', synonyms: ['genuine', 'real'], antonyms: ['fake', 'counterfeit'], distractors: ['humid', 'agile', 'colossal', 'ornate'] },
  { word: 'dubious', pos: 'adj', level: 2, field: 'truth', meaning: 'doubtful; not to be relied upon', opposite: 'certain and reliable', synonyms: ['questionable', 'doubtful'], antonyms: ['reliable', 'certain'], distractors: ['humid', 'agile', 'colossal', 'ornate'] },
  { word: 'plausible', pos: 'adj', level: 2, field: 'truth', meaning: 'seeming reasonable or probable', opposite: 'difficult to believe', synonyms: ['credible', 'believable'], antonyms: ['implausible', 'unlikely'], distractors: ['humid', 'agile', 'colossal', 'ornate'] },
  { word: 'spurious', pos: 'adj', level: 3, field: 'truth', meaning: 'false, though appearing genuine', opposite: 'genuine and valid', synonyms: ['false', 'bogus'], antonyms: ['genuine', 'authentic'], distractors: ['luminous', 'parsimonious', 'tenacious', 'raucous'] },
  { word: 'erroneous', pos: 'adj', level: 3, field: 'truth', meaning: 'wrong; incorrect', opposite: 'correct; free from error', synonyms: ['mistaken', 'incorrect'], antonyms: ['correct', 'accurate'], distractors: ['luminous', 'parsimonious', 'tenacious', 'raucous'] },

  // ---------------------------------------------------------------- adverbs
  { word: 'seldom', pos: 'adv', level: 2, field: 'time', meaning: 'not often', opposite: 'very often', synonyms: ['rarely', 'infrequently'], antonyms: ['often', 'frequently'], distractors: ['deliberately', 'candidly', 'meticulously', 'arrogantly'] },
  { word: 'frequently', pos: 'adv', level: 1, field: 'time', meaning: 'often; many times', opposite: 'rarely; few times', synonyms: ['often', 'repeatedly'], antonyms: ['rarely', 'seldom'], distractors: ['eagerly', 'explicitly', 'carefully', 'boldly'] },
  { word: 'promptly', pos: 'adv', level: 1, field: 'time', meaning: 'without delay', opposite: 'after a long delay', synonyms: ['immediately', 'punctually'], antonyms: ['belatedly', 'tardily'], distractors: ['politely', 'haphazardly', 'boldly', 'abundantly'] },
  { word: 'gradually', pos: 'adv', level: 1, field: 'time', meaning: 'slowly, in small stages', opposite: 'suddenly, all at once', synonyms: ['slowly', 'steadily'], antonyms: ['suddenly', 'abruptly'], distractors: ['politely', 'cheerfully', 'boldly', 'candidly'] },
  { word: 'abruptly', pos: 'adv', level: 2, field: 'time', meaning: 'suddenly and unexpectedly', opposite: 'gradually and with warning', synonyms: ['suddenly', 'unexpectedly'], antonyms: ['gradually', 'progressively'], distractors: ['inadvertently', 'meticulously', 'tacitly', 'sparingly'] },
  { word: 'temporarily', pos: 'adv', level: 2, field: 'time', meaning: 'for a limited time only', opposite: 'for all time', synonyms: ['briefly', 'provisionally'], antonyms: ['permanently', 'perpetually'], distractors: ['lucidly', 'candidly', 'meticulously', 'cheerfully'] },
  { word: 'swiftly', pos: 'adv', level: 1, field: 'time', meaning: 'very quickly', opposite: 'very slowly', synonyms: ['quickly', 'rapidly'], antonyms: ['slowly', 'sluggishly'], distractors: ['politely', 'cheerfully', 'candidly', 'abundantly'] },
  { word: 'invariably', pos: 'adv', level: 3, field: 'time', meaning: 'always, without exception', opposite: 'only now and then', synonyms: ['always', 'consistently'], antonyms: ['occasionally', 'sporadically'], distractors: ['lucidly', 'candidly', 'surreptitiously', 'vehemently'] },
  { word: 'occasionally', pos: 'adv', level: 1, field: 'time', meaning: 'now and then; not regularly', opposite: 'all the time', synonyms: ['sometimes', 'sporadically'], antonyms: ['constantly', 'continually'], distractors: ['politely', 'cheerfully', 'boldly', 'carefully'] },
  { word: 'carefully', pos: 'adv', level: 1, field: 'work', meaning: 'with close attention to avoid harm or mistakes', opposite: 'without proper attention', synonyms: ['cautiously', 'attentively'], antonyms: ['carelessly', 'negligently'], distractors: ['politely', 'cheerfully', 'eagerly', 'temporarily'] },
  { word: 'meticulously', pos: 'adv', level: 2, field: 'work', meaning: 'with great attention to detail', opposite: 'with no attention to detail', synonyms: ['painstakingly', 'scrupulously'], antonyms: ['carelessly', 'sloppily'], distractors: ['cheerfully', 'candidly', 'frequently', 'politely'] },
  { word: 'diligently', pos: 'adv', level: 1, field: 'work', meaning: 'with steady care and effort', opposite: 'lazily and without effort', synonyms: ['industriously', 'conscientiously'], antonyms: ['lazily', 'idly'], distractors: ['politely', 'cheerfully', 'frequently', 'explicitly'] },
  { word: 'haphazardly', pos: 'adv', level: 2, field: 'work', meaning: 'without order or planning', opposite: 'in a planned and orderly way', synonyms: ['randomly', 'aimlessly'], antonyms: ['methodically', 'systematically'], distractors: ['cheerfully', 'candidly', 'politely', 'abundantly'] },
  { word: 'deliberately', pos: 'adv', level: 2, field: 'will', meaning: 'on purpose; intentionally', opposite: 'by accident; unintentionally', synonyms: ['intentionally', 'purposely'], antonyms: ['accidentally', 'unintentionally'], distractors: ['cheerfully', 'frequently', 'abundantly', 'politely'] },
  { word: 'reluctantly', pos: 'adv', level: 1, field: 'will', meaning: 'unwillingly and hesitantly', opposite: 'willingly and eagerly', synonyms: ['unwillingly', 'grudgingly'], antonyms: ['willingly', 'eagerly'], distractors: ['politely', 'frequently', 'abundantly', 'lucidly'] },
  { word: 'eagerly', pos: 'adv', level: 1, field: 'will', meaning: 'with keen interest or desire', opposite: 'without interest or desire', synonyms: ['keenly', 'enthusiastically'], antonyms: ['reluctantly', 'unwillingly'], distractors: ['politely', 'lucidly', 'carefully', 'abundantly'] },
  { word: 'vehemently', pos: 'adv', level: 3, field: 'will', meaning: 'with strong feeling or force', opposite: 'mildly, without strong feeling', synonyms: ['forcefully', 'passionately'], antonyms: ['mildly', 'half-heartedly'], distractors: ['lucidly', 'meticulously', 'temporarily', 'invariably'] },
  { word: 'inadvertently', pos: 'adv', level: 3, field: 'will', meaning: 'without intending to; by accident', opposite: 'with full intention', synonyms: ['accidentally', 'unintentionally'], antonyms: ['deliberately', 'intentionally'], distractors: ['lucidly', 'profusely', 'invariably', 'arrogantly'] },
  { word: 'tentatively', pos: 'adv', level: 3, field: 'will', meaning: 'hesitantly, without confidence', opposite: 'confidently and decisively', synonyms: ['hesitantly', 'uncertainly'], antonyms: ['confidently', 'decisively'], distractors: ['lucidly', 'profusely', 'invariably', 'surreptitiously'] },
  { word: 'candidly', pos: 'adv', level: 2, field: 'person', meaning: 'openly and honestly', opposite: 'evasively, hiding the truth', synonyms: ['frankly', 'openly'], antonyms: ['evasively', 'guardedly'], distractors: ['frequently', 'abundantly', 'meticulously', 'temporarily'] },
  { word: 'politely', pos: 'adv', level: 1, field: 'person', meaning: 'in a courteous manner', opposite: 'in a rude manner', synonyms: ['courteously', 'respectfully'], antonyms: ['rudely', 'impolitely'], distractors: ['frequently', 'abundantly', 'swiftly', 'gradually'] },
  { word: 'cheerfully', pos: 'adv', level: 1, field: 'person', meaning: 'in a happy, good-humoured way', opposite: 'in a sad, gloomy way', synonyms: ['happily', 'merrily'], antonyms: ['gloomily', 'miserably'], distractors: ['frequently', 'gradually', 'carefully', 'abundantly'] },
  { word: 'arrogantly', pos: 'adv', level: 2, field: 'person', meaning: 'in a proud and superior manner', opposite: 'in a modest manner', synonyms: ['haughtily', 'conceitedly'], antonyms: ['humbly', 'modestly'], distractors: ['frequently', 'abundantly', 'temporarily', 'meticulously'] },
  { word: 'surreptitiously', pos: 'adv', level: 3, field: 'person', meaning: 'secretly, so as not to be noticed', opposite: 'openly, for everyone to see', synonyms: ['secretly', 'stealthily'], antonyms: ['openly', 'publicly'], distractors: ['profusely', 'invariably', 'meticulously', 'temporarily'] },
  { word: 'boldly', pos: 'adv', level: 1, field: 'person', meaning: 'confidently and without fear', opposite: 'fearfully and without confidence', synonyms: ['bravely', 'fearlessly'], antonyms: ['timidly', 'fearfully'], distractors: ['frequently', 'abundantly', 'gradually', 'lucidly'] },
  { word: 'calmly', pos: 'adv', level: 1, field: 'person', meaning: 'without anxiety or excitement', opposite: 'with anxiety or agitation', synonyms: ['serenely', 'coolly'], antonyms: ['anxiously', 'frantically'], distractors: ['frequently', 'abundantly', 'lucidly', 'diligently'] },
  { word: 'lucidly', pos: 'adv', level: 2, field: 'clarity', meaning: 'clearly and understandably', opposite: 'confusingly and unclearly', synonyms: ['clearly', 'coherently'], antonyms: ['confusingly', 'obscurely'], distractors: ['frequently', 'abundantly', 'cheerfully', 'temporarily'] },
  { word: 'explicitly', pos: 'adv', level: 2, field: 'clarity', meaning: 'clearly and directly, leaving nothing implied', opposite: 'indirectly, by suggestion only', synonyms: ['expressly', 'directly'], antonyms: ['implicitly', 'indirectly'], distractors: ['frequently', 'abundantly', 'cheerfully', 'temporarily'] },
  { word: 'tacitly', pos: 'adv', level: 3, field: 'clarity', meaning: 'without being openly stated', opposite: 'openly and in so many words', synonyms: ['implicitly', 'silently'], antonyms: ['explicitly', 'openly'], distractors: ['profusely', 'invariably', 'meticulously', 'temporarily'] },
  { word: 'abundantly', pos: 'adv', level: 2, field: 'size', meaning: 'in large amounts', opposite: 'in very small amounts', synonyms: ['plentifully', 'copiously'], antonyms: ['sparingly', 'scantily'], distractors: ['candidly', 'cheerfully', 'meticulously', 'lucidly'] },
  { word: 'sparingly', pos: 'adv', level: 2, field: 'size', meaning: 'in small quantities; economically', opposite: 'in large quantities; wastefully', synonyms: ['economically', 'frugally'], antonyms: ['lavishly', 'extravagantly'], distractors: ['candidly', 'cheerfully', 'lucidly', 'politely'] },
  { word: 'profusely', pos: 'adv', level: 3, field: 'size', meaning: 'in great quantity; freely', opposite: 'in very small quantities', synonyms: ['copiously', 'abundantly'], antonyms: ['sparingly', 'scantily'], distractors: ['lucidly', 'surreptitiously', 'tentatively', 'meticulously'] },
];

const BY_KEY = new Map(LEXICON.map((e) => [`${e.pos}:${e.word}`, e]));

/** The lexicon entry for a headword of the given part of speech (undefined if absent). */
export function lookup(word: string, pos: LexiconEntry['pos']): LexiconEntry | undefined {
  return BY_KEY.get(`${pos}:${word}`);
}

/** Entries of one difficulty level. */
export function entriesAtLevel(level: LexLevel): LexiconEntry[] {
  return LEXICON.filter((e) => e.level === level);
}

/**
 * Consistency checks for the curated data. Returns human-readable problems (empty when
 * the lexicon is sound). Catches the mechanical mistakes that would make a distractor
 * arguably correct: a distractor that is not a headword, shares the headword's field, or
 * shares a synonym/antonym with it.
 */
export function lexiconIssues(): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  const overlap = (a: readonly string[], b: readonly string[]) => a.filter((x) => b.includes(x));
  for (const e of LEXICON) {
    const key = `${e.pos}:${e.word}`;
    if (seen.has(key)) issues.push(`duplicate headword ${key}`);
    seen.add(key);
    if (e.synonyms.length < 2) issues.push(`${e.word}: needs 2+ synonyms`);
    if (e.antonyms.length < 2) issues.push(`${e.word}: needs 2+ antonyms`);
    if (e.distractors.length < 4) issues.push(`${e.word}: needs 4+ distractors`);
    if (new Set(e.distractors).size !== e.distractors.length) issues.push(`${e.word}: repeated distractor`);
    const self = [e.word, ...e.synonyms, ...e.antonyms];
    if (new Set(self).size !== self.length) issues.push(`${e.word}: word repeated across synonyms/antonyms`);
    const head = new RegExp(`\\b${e.word}\\b`, 'i');
    if (head.test(e.meaning) || head.test(e.opposite)) issues.push(`${e.word}: definition repeats the headword`);
    if (e.meaning === e.opposite) issues.push(`${e.word}: meaning equals opposite`);
    for (const word of e.distractors) {
      const d = lookup(word, e.pos);
      if (!d) {
        issues.push(`${e.word}: distractor "${word}" is not a ${e.pos} headword`);
        continue;
      }
      if (d.field === e.field) issues.push(`${e.word}: distractor "${word}" is in the same field (${e.field})`);
      if (self.includes(word)) issues.push(`${e.word}: distractor "${word}" is a synonym/antonym`);
      if (d.synonyms.includes(e.word) || d.antonyms.includes(e.word)) {
        issues.push(`${e.word}: distractor "${word}" lists the headword as a synonym/antonym`);
      }
      const shared = [
        ...overlap(e.synonyms, d.synonyms),
        ...overlap(e.synonyms, d.antonyms),
        ...overlap(e.antonyms, d.synonyms),
        ...overlap(e.antonyms, d.antonyms),
      ];
      if (shared.length) issues.push(`${e.word}: distractor "${word}" shares related words (${shared.join(', ')})`);
      if (d.meaning === e.meaning || d.meaning === e.opposite) {
        issues.push(`${e.word}: distractor "${word}" has the same definition`);
      }
    }
  }
  return issues;
}
