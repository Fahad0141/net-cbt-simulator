import { defineBank, type CompactMcq } from '@/engine/authoring';
import type { Difficulty } from '@/engine/types';

/**
 * English, chapter "Sentence Completion": PART B (double-blank SAT-style pairs and logical
 * connectors). Part A (`sentence-completion.ts`) holds the single-blank vocabulary items.
 * Every local id here starts with `c-`.
 *
 * Double-blank items follow the SAT/NUST pattern: the options are word pairs written
 * "first ... second". Every distractor fails at least one blank outright (usually the pair
 * either reverses the logic of the sentence or breaks the clue for one blank), so exactly one
 * pair fits both blanks. Connector items test transitions (however, therefore, despite, unless,
 * whereas ...) where the distractors are either illogical or ungrammatical in the slot, and no
 * distractor is a synonym of the key.
 */

/**
 * The blank, rendered as an underlined run of non-breaking spaces (`__text__` is underline in the
 * rich-text format; a literal "____" would be parsed as an empty underline).
 */
const BLANK = `__${' '.repeat(10)}__`;

type Kind = 'pair' | 'connector';

interface Item {
  id: string;
  d: Difficulty;
  /** The sentence; `___` marks each blank (two for a pair, one or two for a connector). */
  s: string;
  a: string;
  x: readonly [string, string, string];
  e: string;
  /** `pair` (default): double-blank vocabulary; `connector`: transition words. */
  k?: Kind;
  /** Mirrors a recurring NET theme. */
  pp?: true;
}

function toMcq(item: Item): CompactMcq {
  const kind: Kind = item.k ?? 'pair';
  const parts = item.s.split('___');
  const blanks = parts.length - 1;
  const answerParts = item.a.split(' ... ').length;
  if (blanks < 1 || blanks > 2) throw new Error(`sentence-completion/${item.id}: expected one or two blanks`);
  if (kind === 'pair' && blanks !== 2) throw new Error(`sentence-completion/${item.id}: a pair item needs two blanks`);
  if (answerParts !== blanks) throw new Error(`sentence-completion/${item.id}: answer does not match the blanks`);
  for (const option of item.x) {
    if (option.split(' ... ').length !== blanks) {
      throw new Error(`sentence-completion/${item.id}: option "${option}" does not match the blanks`);
    }
  }
  const stem =
    blanks === 2
      ? 'Choose the pair of words that best completes the sentence:'
      : 'Choose the word or phrase that best completes the sentence:';
  const tags =
    kind === 'pair'
      ? ['double blank', 'vocabulary in context']
      : blanks === 2
        ? ['logical connectors', 'double blank']
        : ['logical connectors', 'single blank'];
  return {
    id: item.id,
    d: item.d,
    q: `${stem}\n\n${parts.join(BLANK)}`,
    a: item.a,
    x: item.x,
    e: item.e,
    t: tags,
    ...(item.pp ? { o: 'past-paper' as const } : {}),
  };
}

// ------------------------------------------------------------------ double blank, difficulty 1

const PAIRS_EASY: readonly Item[] = [
  {
    id: 'c-drought-farmers', d: 1, pp: true,
    s: 'The long ___ ruined the crops, and many farmers were left ___ by the end of the year.',
    a: 'drought ... impoverished',
    x: ['flood ... wealthy', 'harvest ... prosperous', 'season ... satisfied'],
    e: 'Ruined crops call for a disaster (**drought**) and a bad result for farmers (**impoverished**, "made poor"). "Flood" fits the first blank but "wealthy" contradicts ruined crops; a harvest does not ruin crops; "satisfied" is not the effect of losing a crop.',
  },
  {
    id: 'c-talented-modest', d: 1, pp: true,
    s: 'Although she was the most ___ player in the team, she was ___ and never boasted about her goals.',
    a: 'talented ... modest',
    x: ['talented ... conceited', 'ordinary ... humble', 'unskilled ... boastful'],
    e: '"Although" sets up a contrast: she had a reason to boast (**talented**) yet did not (**modest**). "Conceited" and "boastful" contradict "never boasted"; with "ordinary" there is nothing to contrast with her humility.',
  },
  {
    id: 'c-scorching-demand', d: 1,
    s: "During the ___ summer months, the city's demand for electricity ___ as millions of air conditioners run day and night.",
    a: 'scorching ... soars',
    x: ['chilly ... soars', 'scorching ... drops', 'mild ... falls'],
    e: 'Air conditioners running day and night mean very hot weather (**scorching**) and rising demand (**soars**). Chilly or mild months would not need air conditioners, and demand cannot drop or fall while they all run.',
  },
  {
    id: 'c-library-quiet', d: 1,
    s: 'The library rules require visitors to remain ___, so anyone who ___ the peace is politely asked to leave.',
    a: 'quiet ... disturbs',
    x: ['quiet ... maintains', 'noisy ... disturbs', 'busy ... keeps'],
    e: 'A library asks for silence (**quiet**), and people are asked to leave for breaking it (**disturbs**). Nobody is sent out for maintaining or keeping the peace, and no library requires visitors to be noisy.',
  },
  {
    id: 'c-generous-endeared', d: 1,
    s: 'The ___ businessman donated half of his fortune to charity, an act that ___ him to the whole town.',
    a: 'generous ... endeared',
    x: ['miserly ... endeared', 'generous ... alienated', 'stingy ... alienated'],
    e: 'Giving away half a fortune is **generous**, and such an act makes people love him: it **endeared** him to the town. Miserly and stingy contradict the donation, and a kind gift would not alienate (turn away) the town.',
  },
  {
    id: 'c-crowded-stand', d: 1,
    s: 'The bus was so ___ that several passengers had to ___ all the way to the city.',
    a: 'crowded ... stand',
    x: ['empty ... stand', 'crowded ... sleep', 'spacious ... wait'],
    e: '"So ... that" gives cause and effect: a **crowded** bus forces passengers to **stand** because no seats are free. An empty or spacious bus forces nobody to stand or wait, and crowding does not force anyone to sleep.',
  },
  {
    id: 'c-witness-consistent', d: 1, pp: true,
    s: 'The judge trusted the witness because her account was ___ and ___ with the evidence.',
    a: 'detailed ... consistent',
    x: ['vague ... consistent', 'detailed ... inconsistent', 'confused ... contradictory'],
    e: 'A judge trusts an account that is **detailed** and **consistent** (in agreement) with the evidence. A vague or confused account, or one inconsistent with or contradicting the evidence, would be a reason for distrust.',
  },
  {
    id: 'c-revised-confident', d: 1,
    s: 'Because Hamza had ___ the syllabus thoroughly, he felt ___ when he walked into the examination hall.',
    a: 'revised ... confident',
    x: ['revised ... helpless', 'ignored ... confident', 'forgotten ... calm'],
    e: 'Thorough preparation (**revised**) causes a feeling of **confidence**. "Helpless" is not the result of thorough revision, and a student who had ignored or forgotten the syllabus would have no reason to feel confident or calm.',
  },
  {
    id: 'c-snow-leopard-rare', d: 1,
    s: 'The snow leopard is now so ___ in the northern mountains that a single sighting ___ wildlife photographers from around the world.',
    a: 'rare ... attracts',
    x: ['common ... attracts', 'rare ... bores', 'numerous ... repels'],
    e: 'Photographers travel from around the world only for something **rare**, and a rare sighting **attracts** them. A common or numerous animal would not draw them for a single sighting, and a rare sighting would not bore or repel them.',
  },
  {
    id: 'c-affordable-durable', d: 1,
    s: 'The new phone is both ___ and ___: it costs half as much as its rivals and survives being dropped.',
    a: 'affordable ... durable',
    x: ['expensive ... durable', 'affordable ... fragile', 'costly ... delicate'],
    e: 'The colon explains both words in order: half the price means **affordable**, and surviving drops means **durable**. Expensive and costly contradict the price; fragile and delicate contradict surviving a fall.',
  },
  {
    id: 'c-delayed-in-time', d: 1,
    s: "Heavy traffic ___ the ambulance, but the driver's skill ensured that the patient still reached hospital ___.",
    a: 'delayed ... in time',
    x: ['delayed ... too late', 'sped ... in time', 'helped ... slowly'],
    e: 'Heavy traffic **delayed** the ambulance; "but" and "still" show that the outcome was good anyway, so the patient arrived **in time**. "Too late" contradicts the driver\'s skill "ensuring" success, and traffic does not speed up or help an ambulance.',
  },
  {
    id: 'c-crumbling-demolish', d: 1,
    s: 'The ___ building had been empty for decades, so the council decided to ___ it rather than pay for costly repairs.',
    a: 'crumbling ... demolish',
    x: ['crumbling ... restore', 'brand-new ... demolish', 'sturdy ... renovate'],
    e: 'A **crumbling** building needs costly repairs, and the alternative to repairing it is to **demolish** (pull down) it. Restore and renovate are exactly the repairs the council rejected, and a brand-new or sturdy building would not need costly repairs.',
  },
  {
    id: 'c-cooperated-quarrelled', d: 1,
    s: 'The project succeeded only because the engineers ___ closely; had they worked ___, it would have failed.',
    a: 'cooperated ... separately',
    x: ['cooperated ... together', 'quarrelled ... alone', 'argued ... jointly'],
    e: 'Success came from working **closely** together (**cooperated**); the second clause imagines the opposite, working **separately**, which would have led to failure. "Together" is not the opposite of cooperating, and quarrelling or arguing does not explain success.',
  },
  {
    id: 'c-loud-hear', d: 1,
    s: 'The music at the wedding was so ___ that the guests could barely ___ one another.',
    a: 'loud ... hear',
    x: ['soft ... hear', 'loud ... see', 'gentle ... understand'],
    e: 'Cause and effect: **loud** music stops guests from being able to **hear** one another. Soft or gentle music would not prevent conversation, and loud music does not stop guests from seeing each other.',
  },
  {
    id: 'c-ancient-impresses', d: 1,
    s: 'The ruins at Mohenjo-daro are ___, yet the careful planning of their streets still ___ modern engineers.',
    a: 'ancient ... impresses',
    x: ['ancient ... disappoints', 'recent ... impresses', 'modern ... bores'],
    e: '"Yet" contrasts age with continuing admiration: the ruins are **ancient** (about 4500 years old), but their careful planning still **impresses** engineers. Careful planning would not disappoint or bore them, and the ruins are not recent or modern.',
  },
  {
    id: 'c-courteous-rude', d: 1,
    s: "Ayesha's ___ manners pleased her hosts, whereas her cousin's ___ remarks offended everyone.",
    a: 'courteous ... rude',
    x: ['courteous ... kind', 'rude ... polite', 'gracious ... gentle'],
    e: 'Manners that please are **courteous**; "whereas" signals a contrast, and remarks that offend are **rude**. Kind, polite or gentle remarks do not offend, and rude manners would not please the hosts.',
  },
];

// ------------------------------------------------------------------ double blank, difficulty 2

const PAIRS_MEDIUM: readonly Item[] = [
  {
    id: 'c-critical-restricting', d: 2, pp: true,
    s: 'Far from being ___ of the new policy, the economist praised it, arguing that it removed rules that had been ___ small businesses for years.',
    a: 'critical ... restricting',
    x: ['supportive ... restricting', 'critical ... encouraging', 'tolerant ... benefiting'],
    e: '"Far from" introduces the opposite of praise, so the first word is **critical**; he praises the removal of rules, so those rules must have been harmful: **restricting** businesses. "Far from being supportive ... praised" is self-contradictory, and removing rules that were encouraging or benefiting businesses would not earn praise.',
  },
  {
    id: 'c-sceptical-compelling', d: 2, pp: true,
    s: 'Scientists were initially ___ about the claim, but the results proved so ___ that even the critics were convinced.',
    a: 'sceptical ... compelling',
    x: ['enthusiastic ... compelling', 'sceptical ... flimsy', 'certain ... doubtful'],
    e: '"Initially ... but" marks a change from doubt to belief: they were **sceptical** (doubtful), and the results were **compelling** (convincing) enough to win over critics. Enthusiastic or certain scientists need no convincing, and flimsy or doubtful results convince nobody.',
  },
  {
    id: 'c-verbose-concise', d: 2, pp: true,
    s: "The novel's plot is gripping, but its style is so ___ that readers who prefer ___ prose may abandon it halfway.",
    a: 'verbose ... concise',
    x: ['lucid ... concise', 'verbose ... lengthy', 'elegant ... polished'],
    e: 'The "but" names a weakness of style: it is **verbose** (uses too many words), which drives away readers who like the opposite, **concise** prose. Readers who prefer lengthy prose would enjoy a verbose style, and a lucid or elegant style would not drive away lovers of concise or polished prose.',
  },
  {
    id: 'c-impartial-favour', d: 2,
    s: 'A good mediator must remain ___; if she appears to ___ one side, the other will refuse to cooperate.',
    a: 'impartial ... favour',
    x: ['biased ... favour', 'impartial ... respect', 'partisan ... understand'],
    e: 'A mediator must be **impartial** (not taking sides); the other side refuses to cooperate only if she seems to **favour** its opponent. A good mediator is never required to be biased or partisan, and merely respecting one side gives the other no reason to refuse.',
  },
  {
    id: 'c-effective-severe', d: 2, pp: true,
    s: 'Although the new drug is ___ against the infection, its side effects are so ___ that doctors prescribe it only as a last resort.',
    a: 'effective ... severe',
    x: ['effective ... mild', 'useless ... severe', 'ineffective ... harmless'],
    e: '"Although" contrasts a strength with a weakness: the drug is **effective**, but its side effects are **severe**, which is why it is a last resort. Mild or harmless side effects would not limit its use, and a useless drug would not be prescribed at all.',
  },
  {
    id: 'c-tactful-defused', d: 2,
    s: "The ambassador's ___ reply ___ the tension in the room, and the talks continued calmly.",
    a: 'tactful ... defused',
    x: ['insulting ... defused', 'tactful ... heightened', 'tactless ... worsened'],
    e: 'The talks "continued calmly", so the reply reduced the tension (**defused** it), and only a **tactful** (diplomatic) reply does that. An insulting or tactless reply would not calm the room, and tension that was heightened or worsened contradicts the calm outcome.',
  },
  {
    id: 'c-short-lived-truce', d: 2,
    s: 'The truce proved ___: within a week of its signing, the fighting had ___ across the region.',
    a: 'short-lived ... resumed',
    x: ['lasting ... resumed', 'short-lived ... ceased', 'durable ... escalated'],
    e: 'Fighting that started again within a week shows that the truce was **short-lived** and the fighting **resumed**. A lasting or durable truce is contradicted by fighting that resumed or escalated within a week, and if the fighting had ceased the truce would not have proved short-lived.',
  },
  {
    id: 'c-frugally-save', d: 2,
    s: 'Because she lived ___, spending only on necessities, she was able to ___ enough money to buy a house.',
    a: 'frugally ... save',
    x: ['lavishly ... save', 'frugally ... squander', 'extravagantly ... borrow'],
    e: 'Spending only on necessities is living **frugally**, and that lets a person **save**. Lavishly and extravagantly contradict "only on necessities", and frugal living does not cause someone to squander (waste) money.',
  },
  {
    id: 'c-undaunted-redoubled', d: 2, pp: true,
    s: 'The reformer was ___ by the opposition he faced; instead of giving up, he ___ his efforts.',
    a: 'undaunted ... redoubled',
    x: ['discouraged ... redoubled', 'undaunted ... abandoned', 'defeated ... reduced'],
    e: '"Instead of giving up" shows he was not frightened off (**undaunted**) and increased his work (**redoubled**, "made much greater"). Discouraged and defeated contradict his persistence, and abandoning or reducing his efforts is a form of giving up.',
  },
  {
    id: 'c-ambiguous-interpreted', d: 2,
    s: 'The instructions were so ___ that each worker ___ them differently, and the machine was assembled wrongly.',
    a: 'ambiguous ... interpreted',
    x: ['explicit ... interpreted', 'ambiguous ... memorised', 'precise ... obeyed'],
    e: 'Different readings of the same instructions mean they were **ambiguous** (open to more than one meaning), so each worker **interpreted** them differently. Explicit or precise instructions would not be read in different ways, and memorising instructions "differently" makes no sense.',
  },
  {
    id: 'c-arid-irrigation', d: 2,
    s: 'Much of Balochistan is ___, so farming there depends on ___ systems such as the underground karez channels.',
    a: 'arid ... irrigation',
    x: ['marshy ... irrigation', 'arid ... drainage', 'humid ... flood-control'],
    e: 'Farming that depends on channels bringing water shows that the land is **arid** (very dry) and needs **irrigation**; the karez is a traditional underground irrigation channel. Marshy or humid land has too much water, and drainage or flood-control systems remove water rather than supply it.',
  },
  {
    id: 'c-prolific-repetitive', d: 2, pp: true,
    s: 'A ___ writer, she published more than sixty novels, yet critics complained that her later books were ___ and lacked originality.',
    a: 'prolific ... repetitive',
    x: ['prolific ... innovative', 'reluctant ... repetitive', 'lazy ... original'],
    e: 'Sixty novels define a **prolific** (highly productive) writer; books that "lacked originality" are **repetitive**. Innovative and original contradict "lacked originality", and a reluctant or lazy writer would not produce sixty novels.',
  },
  {
    id: 'c-corroborated-established', d: 2,
    s: 'The hypothesis was ___ by a series of independent experiments, so scientists now regard it as ___ rather than speculative.',
    a: 'corroborated ... established',
    x: ['refuted ... established', 'corroborated ... doubtful', 'undermined ... uncertain'],
    e: '"Rather than speculative" means the idea is now accepted (**established**), which happens only when experiments **corroborated** (confirmed) it. A refuted or undermined hypothesis would not be accepted, and doubtful or uncertain do not contrast with "speculative".',
  },
  {
    id: 'c-cordial-hostile', d: 2, pp: true,
    s: 'Relations between the two neighbours, once ___, became ___ after a bitter dispute over the boundary wall.',
    a: 'cordial ... hostile',
    x: ['hostile ... friendly', 'friendly ... warmer', 'strained ... amicable'],
    e: '"Once" signals a change, and a bitter dispute changes good relations (**cordial**, "warm and friendly") into bad ones (**hostile**). A bitter dispute does not make relations friendlier, warmer or amicable.',
  },
  {
    id: 'c-thorough-error', d: 2,
    s: "The accountant's ___ checking of every entry meant that not a single ___ went unnoticed.",
    a: 'thorough ... error',
    x: ['careless ... error', 'hasty ... mistake', 'thorough ... achievement'],
    e: 'Checking "every entry" is **thorough**, and the purpose of such checking is that no **error** goes unnoticed. Careless or hasty checking would let mistakes slip through, and checking accounts is not about noticing achievements.',
  },
  {
    id: 'c-urbanisation-strain', d: 2,
    s: 'Rapid ___ has drawn millions from villages to cities, placing an enormous ___ on urban water and transport services.',
    a: 'urbanisation ... strain',
    x: ['deforestation ... strain', 'urbanisation ... relief', 'emigration ... surplus'],
    e: 'The movement of people from villages to cities is **urbanisation**, and millions of newcomers put a **strain** (heavy pressure) on city services. Deforestation is the clearing of forests and emigration is leaving one\'s country; extra millions bring no relief or surplus to services.',
  },
  {
    id: 'c-lavish-insensitive', d: 2,
    s: 'Critics condemned the ___ wedding, where millions were spent on decorations alone, calling it ___ at a time when many families could not afford food.',
    a: 'lavish ... insensitive',
    x: ['modest ... insensitive', 'lavish ... admirable', 'simple ... thoughtful'],
    e: 'Millions spent on decorations make the wedding **lavish** (extravagant); critics who "condemned" it while others went hungry would call it **insensitive**. A modest or simple wedding contradicts the spending, and condemnation cannot call it admirable or thoughtful.',
  },
  {
    id: 'c-candour-hollow', d: 2,
    s: 'The manager valued her ___; unlike colleagues whose ___ praise concealed their real doubts, she told him exactly what was wrong with the plan.',
    a: 'candour ... hollow',
    x: ['flattery ... hollow', 'candour ... honest', 'tact ... sincere'],
    e: 'Telling him exactly what was wrong is **candour** (frankness); "unlike" contrasts it with colleagues whose praise hid their real doubts, so it was **hollow** (insincere). Flattery is the opposite of what she offered, and honest or sincere praise cannot conceal real doubts.',
  },
  {
    id: 'c-naive-disillusionment', d: 2,
    s: "The young journalist's ___ belief that every official told the truth soon gave way to ___ after she uncovered one cover-up after another.",
    a: 'naive ... disillusionment',
    x: ['naive ... credulity', 'jaded ... trust', 'cynical ... faith'],
    e: 'Believing every official is **naive** (innocently trusting), and discovering repeated cover-ups replaces that belief with **disillusionment** (loss of illusions). Credulity, trust and faith are what she lost, not what she gained, and a jaded or cynical person would not believe every official.',
  },
];

// ------------------------------------------------------------------ double blank, difficulty 3

const PAIRS_HARD: readonly Item[] = [
  {
    id: 'c-garrulous-terse', d: 3,
    s: 'Whereas his predecessor was ___, regaling every visitor with long anecdotes, the new director is notably ___, rarely using two words where one will do.',
    a: 'garrulous ... terse',
    x: ['taciturn ... terse', 'garrulous ... loquacious', 'reticent ... verbose'],
    e: 'Long anecdotes describe a **garrulous** (excessively talkative) person; "whereas" introduces the opposite, and using as few words as possible is **terse**. Taciturn and reticent mean quiet, which does not fit long anecdotes; loquacious and verbose mean talkative, which contradicts "rarely using two words where one will do".',
  },
  {
    id: 'c-mitigating-exacerbated', d: 3, pp: true,
    s: 'Rather than ___ the crisis, the hasty measures only ___ it, driving prices even higher.',
    a: 'mitigating ... exacerbated',
    x: ['worsening ... aggravated', 'alleviating ... eased', 'easing ... resolved'],
    e: '"Driving prices even higher" shows the measures made things worse (**exacerbated**); "rather than" sets this against the intended effect, **mitigating** (lessening) it. In "worsening ... aggravated" both words mean the same, so there is no contrast; eased and resolved contradict rising prices.',
  },
  {
    id: 'c-equivocal-unambiguous', d: 3, pp: true,
    s: "Tired of the minister's ___ answers, which could be read in several ways, the journalists demanded a statement that was ___.",
    a: 'equivocal ... unambiguous',
    x: ['candid ... unambiguous', 'equivocal ... evasive', 'forthright ... vague'],
    e: 'Answers open to several readings are **equivocal**; journalists tired of them want the opposite, a statement that is **unambiguous**. Candid and forthright answers are frank and clear, and nobody tired of evasion demands an evasive or vague statement.',
  },
  {
    id: 'c-damning-flimsy', d: 3, pp: true,
    s: 'Though the evidence against him seemed ___, the lawyer showed it to be entirely ___, resting on a single unreliable witness.',
    a: 'damning ... flimsy',
    x: ['damning ... irrefutable', 'weak ... flimsy', 'trivial ... conclusive'],
    e: '"Though" contrasts appearance with reality: the evidence seemed **damning** (strongly suggesting guilt) but was really **flimsy**, since it rested on one unreliable witness. Irrefutable and conclusive contradict the unreliable witness, and "seemed weak ... flimsy" has no contrast.',
  },
  {
    id: 'c-visionary-pragmatic', d: 3,
    s: 'Her colleagues dismissed her as a mere ___, but her proposals proved thoroughly ___, working within the budget and the existing law.',
    a: 'visionary ... pragmatic',
    x: ['realist ... pragmatic', 'visionary ... utopian', 'pragmatist ... impractical'],
    e: '"Dismissed ... as a mere" needs a word suggesting unrealistic ideas (**visionary**, "a dreamer"); "but" and working within budget and law show the proposals were **pragmatic** (practical). Dismissing someone as a realist or pragmatist makes no sense, and utopian or impractical proposals would not work within the budget.',
  },
  {
    id: 'c-enervating-listless', d: 3,
    s: 'The ___ heat of the afternoon left the labourers ___, and work slowed almost to a halt.',
    a: 'enervating ... listless',
    x: ['invigorating ... listless', 'enervating ... energetic', 'bracing ... vigorous'],
    e: 'Work slowing to a halt shows the heat drained the labourers\' strength (**enervating**, "weakening") and left them **listless** (without energy). Invigorating and bracing mean refreshing, and energetic or vigorous workers would not slow to a halt.',
  },
  {
    id: 'c-esoteric-accessible', d: 3,
    s: 'The professor had a rare gift for making ___ subjects ___, so even first-year students followed his lectures on quantum theory.',
    a: 'esoteric ... accessible',
    x: ['simple ... accessible', 'esoteric ... incomprehensible', 'trivial ... obscure'],
    e: 'A "rare gift" is turning **esoteric** subjects (understood only by a few specialists, like quantum theory) into **accessible** ones that beginners can follow. Making simple subjects accessible is no rare gift, and incomprehensible or obscure lectures could not be followed by first-year students.',
  },
];

// ------------------------------------------------------------------ logical connectors

const CONNECTORS: readonly Item[] = [
  {
    id: 'c-conn-however-road', d: 1, k: 'connector', pp: true,
    s: 'The main road was closed for repairs; ___, we reached the village on time.',
    a: 'however',
    x: ['therefore', 'for example', 'similarly'],
    e: 'A closed road would normally make us late, but we still arrived on time: an unexpected result needs a contrast connector, **however**. "Therefore" wrongly presents arriving on time as a result of the closure, and "for example" and "similarly" signal an example or a comparison, which are not here.',
  },
  {
    id: 'c-conn-as-a-result-flood', d: 1, k: 'connector',
    s: 'The river burst its banks during the night; ___, hundreds of families had to leave their homes.',
    a: 'as a result',
    x: ['nevertheless', 'in contrast', 'on the other hand'],
    e: 'Leaving home is the consequence of the flood, so a cause-effect connector is needed: **as a result**. Nevertheless, in contrast and on the other hand all signal a contrast, but the second clause is exactly what the flood would cause.',
  },
  {
    id: 'c-conn-despite-ankle', d: 1, k: 'connector', pp: true,
    s: '___ his injured ankle, Imran won the race.',
    a: 'Despite',
    x: ['Although', 'Because of', 'Owing to'],
    e: 'An injury would normally stop a runner, so a contrast is needed, and the blank is followed by a noun phrase ("his injured ankle"), which needs a preposition: **Despite**. "Although" must be followed by a clause (Although his ankle was injured ...), and "because of" and "owing to" wrongly make the injury the reason for his victory.',
  },
  {
    id: 'c-conn-although-cooked', d: 2, k: 'connector', pp: true,
    s: '___ he had never cooked before, the meal he prepared for his family was delicious.',
    a: 'Although',
    x: ['Despite', 'Because', 'Since'],
    e: 'Never having cooked before contrasts with a delicious result, and the blank is followed by a full clause (he had never cooked), so the conjunction **Although** is needed. "Despite" cannot introduce a clause (it needs a noun or "despite the fact that"), and "because" and "since" wrongly give inexperience as the reason for the good meal.',
  },
  {
    id: 'c-conn-moreover-laptop', d: 2, k: 'connector',
    s: 'The new laptop is lighter than the old model; ___, its battery lasts twice as long.',
    a: 'moreover',
    x: ['however', 'otherwise', 'instead'],
    e: 'Both clauses are advantages, so the second adds a further point in the same direction: **moreover** ("in addition"). "However" would wrongly signal a drawback, "otherwise" means "if not" (or "apart from that"), and "instead" signals a replacement.',
  },
  {
    id: 'c-conn-unless-admit-card', d: 2, k: 'connector', pp: true,
    s: 'You will not be allowed into the examination hall ___ you show your admit card.',
    a: 'unless',
    x: ['if', 'because', 'although'],
    e: '**Unless** means "except if": showing the card is the only condition for entry. "If" would mean showing the card keeps you out, "because" makes showing the card the reason for refusal, and "although" makes no logical sense here.',
  },
  {
    id: 'c-conn-whereas-zainab', d: 2, k: 'connector',
    s: 'Zainab enjoys solving mathematical puzzles, ___ her brother prefers painting and music.',
    a: 'whereas',
    x: ['because', 'so that', 'therefore'],
    e: 'The sentence compares two different preferences, so a contrast conjunction is needed: **whereas**. Her brother\'s taste is not the reason for hers (because), her purpose (so that) or her result (therefore); "therefore" also cannot join two clauses after a comma.',
  },
  {
    id: 'c-conn-otherwise-bridge', d: 2, k: 'connector',
    s: 'The bridge must be repaired before the monsoon; ___, the villages beyond the river will be cut off when the floods arrive.',
    a: 'otherwise',
    x: ['consequently', 'similarly', 'nonetheless'],
    e: 'The second clause states what will happen if the repair is not made, so the connector meaning "if not" is needed: **otherwise**. "Consequently" would make the repair the cause of the villages being cut off by the floods, "similarly" signals a comparison, and "nonetheless" a contrast.',
  },
  {
    id: 'c-conn-although-however-verdict', d: 2, k: 'connector',
    s: '___ the evidence was largely circumstantial, the jury convicted him; ___, the verdict was overturned on appeal.',
    a: 'Although ... however',
    x: ['Because ... however', 'Since ... therefore', 'As ... moreover'],
    e: 'Evidence that is "largely circumstantial" (indirect) gives reason for doubt, so the conviction is unexpected and the first blank needs a concession, **Although**; overturning the conviction reverses it, so the second needs a contrast, **however**. Because, since and as wrongly make the doubtful evidence the reason for the conviction, and therefore and moreover cannot introduce a reversal.',
  },
  {
    id: 'c-conn-notwithstanding-committee', d: 3, k: 'connector',
    s: 'The committee approved the plan, ___ the objections raised by several of its members.',
    a: 'notwithstanding',
    x: ['owing to', 'on account of', 'by virtue of'],
    e: 'Objections would normally block approval, so a concessive preposition meaning "in spite of" is needed: **notwithstanding**. Owing to, on account of and by virtue of all mean "because of", which would make the objections the reason for approving the plan.',
  },
];

export default defineBank('english', 'sentence-completion', (b) => [
  ...b.mcqs([...PAIRS_EASY, ...PAIRS_MEDIUM, ...PAIRS_HARD, ...CONNECTORS].map(toMcq)),
]);
