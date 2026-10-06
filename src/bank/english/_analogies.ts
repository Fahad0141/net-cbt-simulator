/**
 * Curated word pairs for SAT-style analogy items (chapter `english/analogies`).
 *
 * Every pair belongs to exactly one relationship type and is written in that type's
 * canonical order (e.g. type-of is always CATEGORY : member, part-whole always part : whole).
 * `bridge` is a short sentence (lower-case start, no full stop) stating the relationship for
 * this exact pair; explanations quote it.
 *
 * Rules for entries:
 * - The relationship must be clear-cut and textbook-true for the pair; avoid pairs that could
 *   reasonably be read as belonging to another type (e.g. no "Desert : dry", which reads like
 *   "lacks water", and no "Dawn : dusk" or "Prologue : epilogue", which read like pairs of opposites).
 * - `lv` is the vocabulary level: 1 = common words, 2 = typical SAT vocabulary, 3 = advanced.
 * - All content is original.
 */
import type { Difficulty } from '@/engine/types';

export type RelationType =
  | 'type-of'
  | 'part-whole'
  | 'degree'
  | 'cause-effect'
  | 'worker-tool'
  | 'worker-product'
  | 'function'
  | 'measure'
  | 'synonym'
  | 'antonym'
  | 'characteristic'
  | 'lack-of'
  | 'location'
  | 'symbol'
  | 'sequence';

export interface AnalogyPair {
  /** First word of the pair (canonical order). */
  a: string;
  /** Second word of the pair. */
  b: string;
  /** The relationship stated for this pair, e.g. "a rose is a kind of flower". */
  bridge: string;
  /** Vocabulary level of the pair. */
  lv: Difficulty;
  /**
   * Optional sub-group within the type (e.g. "person" vs "object"); when the original pair has one,
   * the answer is taken from the same sub-group if possible, so the two pairs are closely parallel.
   */
  g?: string;
}

export interface Relation {
  type: RelationType;
  /** Name of the relationship in canonical order, e.g. "category : member". */
  label: string;
  /** Name of the relationship when the pair is written in reverse; absent for symmetric types. */
  reversed?: string;
  pairs: readonly AnalogyPair[];
}

const p = (a: string, b: string, bridge: string, lv: Difficulty, g?: string): AnalogyPair =>
  g ? { a, b, bridge, lv, g } : { a, b, bridge, lv };

export const RELATIONS: readonly Relation[] = [
  {
    type: 'type-of',
    label: 'category : member',
    reversed: 'member : category',
    pairs: [
      p('flower', 'rose', 'a rose is a kind of flower', 1),
      p('bird', 'sparrow', 'a sparrow is a kind of bird', 1),
      p('reptile', 'lizard', 'a lizard is a kind of reptile', 1),
      p('fruit', 'mango', 'a mango is a kind of fruit', 1),
      p('vegetable', 'spinach', 'spinach is a kind of vegetable', 1),
      p('metal', 'copper', 'copper is a kind of metal', 1),
      p('insect', 'beetle', 'a beetle is a kind of insect', 1),
      p('tree', 'oak', 'an oak is a kind of tree', 1),
      p('fabric', 'silk', 'silk is a kind of fabric', 1),
      p('vehicle', 'bicycle', 'a bicycle is a kind of vehicle', 1),
      p('sport', 'cricket', 'cricket is a kind of sport', 1),
      p('furniture', 'chair', 'a chair is a piece of furniture', 1),
      p('beverage', 'tea', 'tea is a kind of beverage', 1),
      p('weapon', 'sword', 'a sword is a kind of weapon', 1),
      p('poem', 'sonnet', 'a sonnet is a kind of poem', 2),
      p('dog', 'spaniel', 'a spaniel is a breed of dog', 2),
      p('gem', 'sapphire', 'a sapphire is a kind of gem', 2),
      p('grain', 'barley', 'barley is a kind of grain', 2),
      p('dwelling', 'bungalow', 'a bungalow is a kind of dwelling', 2),
      p('rodent', 'squirrel', 'a squirrel is a kind of rodent', 2),
      p('disease', 'measles', 'measles is a kind of disease', 2),
      p('amphibian', 'salamander', 'a salamander is a kind of amphibian', 3),
      p('conifer', 'pine', 'a pine is a kind of conifer', 3),
      p('arachnid', 'scorpion', 'a scorpion is a kind of arachnid', 3),
      p('mollusc', 'octopus', 'an octopus is a kind of mollusc', 3),
      p('crustacean', 'lobster', 'a lobster is a kind of crustacean', 3),
    ],
  },
  {
    type: 'part-whole',
    label: 'part : whole',
    reversed: 'whole : part',
    pairs: [
      p('petal', 'flower', 'a petal is part of a flower', 1),
      p('page', 'book', 'a page is part of a book', 1),
      p('pedal', 'bicycle', 'a pedal is part of a bicycle', 1),
      p('finger', 'hand', 'a finger is part of a hand', 1),
      p('branch', 'tree', 'a branch is part of a tree', 1),
      p('room', 'house', 'a room is part of a house', 1),
      p('key', 'keyboard', 'a key is part of a keyboard', 1),
      p('chapter', 'novel', 'a chapter is part of a novel', 1),
      p('sole', 'shoe', 'the sole is part of a shoe', 1),
      p('toe', 'foot', 'a toe is part of a foot', 1),
      p('brick', 'wall', 'a brick is part of a wall', 1),
      p('leg', 'table', 'a leg is part of a table', 1),
      p('wing', 'bird', 'a wing is part of a bird', 1),
      p('lens', 'camera', 'a lens is part of a camera', 2),
      p('stanza', 'poem', 'a stanza is part of a poem', 2),
      p('hull', 'ship', 'the hull is part of a ship', 2),
      p('scene', 'play', 'a scene is part of a play', 2),
      p('rung', 'ladder', 'a rung is part of a ladder', 2),
      p('spoke', 'wheel', 'a spoke is part of a wheel', 2),
      p('atom', 'molecule', 'an atom is part of a molecule', 2),
      p('clause', 'sentence', 'a clause is part of a sentence', 2),
      p('vertebra', 'spine', 'a vertebra is one of the bones that make up the spine', 3),
      p('facet', 'diamond', 'a facet is one of the cut faces of a diamond', 3),
      p('keel', 'boat', 'the keel is the part along the bottom of a boat', 3),
      p('sepal', 'blossom', 'a sepal is part of a blossom', 3),
    ],
  },
  {
    type: 'degree',
    label: 'lesser : greater degree',
    reversed: 'greater : lesser degree',
    pairs: [
      p('warm', 'hot', 'hot is a much greater degree of warm', 1, 'quality'),
      p('drizzle', 'downpour', 'a downpour is a far heavier fall of rain than a drizzle', 1, 'noun'),
      p('tired', 'exhausted', 'exhausted is an extreme degree of tired', 1, 'feeling'),
      p('annoyed', 'furious', 'furious is an extreme degree of annoyed', 1, 'feeling'),
      p('afraid', 'terrified', 'terrified is an extreme degree of afraid', 1, 'feeling'),
      p('hungry', 'starving', 'starving is an extreme degree of hungry', 1, 'feeling'),
      p('hill', 'mountain', 'a mountain is a much higher rise of land than a hill', 1, 'noun'),
      p('breeze', 'gale', 'a gale is a far stronger wind than a breeze', 1, 'noun'),
      p('happy', 'ecstatic', 'ecstatic is an extreme degree of happy', 2, 'feeling'),
      p('dislike', 'detest', 'to detest is to dislike intensely', 2, 'verb'),
      p('like', 'adore', 'to adore is to like intensely', 2, 'verb'),
      p('damp', 'sodden', 'sodden (soaked through) is an extreme degree of damp', 2, 'quality'),
      p('cool', 'frigid', 'frigid (bitterly cold) is an extreme degree of cool', 2, 'quality'),
      p('trickle', 'torrent', 'a torrent is a far stronger flow of water than a trickle', 2, 'noun'),
      p('glow', 'glare', 'a glare is a far harsher light than a glow', 2, 'noun'),
      p('worried', 'frantic', 'frantic is an extreme degree of worried', 2, 'feeling'),
      p('interested', 'fascinated', 'fascinated is an extreme degree of interested', 2, 'feeling'),
      p('frugal', 'parsimonious', 'parsimonious (mean with money) is an excessive degree of frugal', 3, 'quality'),
      p('chuckle', 'guffaw', 'a guffaw is a far louder, heartier laugh than a chuckle', 3, 'noun'),
      p('nibble', 'devour', 'to devour is to eat far more greedily than to nibble', 3, 'verb'),
      p('displeased', 'livid', 'livid (extremely angry) is an extreme degree of displeased', 3, 'feeling'),
    ],
  },
  {
    type: 'cause-effect',
    label: 'cause : effect',
    reversed: 'effect : cause',
    pairs: [
      p('fire', 'smoke', 'fire produces smoke', 1),
      p('germ', 'disease', 'a germ causes disease', 1),
      p('joke', 'laughter', 'a joke causes laughter', 1),
      p('pepper', 'sneeze', 'pepper makes a person sneeze', 1),
      p('exercise', 'fitness', 'exercise produces fitness', 1),
      p('practice', 'skill', 'practice produces skill', 1),
      p('cold', 'shiver', 'cold makes a person shiver', 1),
      p('pollution', 'smog', 'pollution causes smog', 2),
      p('heat', 'evaporation', 'heat causes evaporation', 2),
      p('friction', 'heat', 'friction produces heat', 2),
      p('drought', 'famine', 'a drought can cause a famine', 2),
      p('insult', 'resentment', 'an insult causes resentment', 2),
      p('vaccine', 'immunity', 'a vaccine produces immunity', 2),
      p('negligence', 'accident', 'negligence causes accidents', 2),
      p('overwork', 'fatigue', 'overwork causes fatigue', 2),
      p('deforestation', 'erosion', 'deforestation causes soil erosion', 3),
      p('provocation', 'retaliation', 'a provocation prompts retaliation', 3),
      p('sedative', 'drowsiness', 'a sedative induces drowsiness', 3),
    ],
  },
  {
    type: 'worker-tool',
    label: 'worker : tool',
    reversed: 'tool : worker',
    pairs: [
      p('carpenter', 'saw', 'a carpenter cuts wood with a saw', 1),
      p('painter', 'brush', 'a painter works with a brush', 1),
      p('farmer', 'plough', 'a farmer tills the soil with a plough', 1),
      p('tailor', 'needle', 'a tailor sews with a needle', 1),
      p('barber', 'razor', 'a barber shaves with a razor', 1),
      p('fisherman', 'net', 'a fisherman catches fish with a net', 1),
      p('doctor', 'stethoscope', 'a doctor listens to the heart with a stethoscope', 1),
      p('woodcutter', 'axe', 'a woodcutter chops wood with an axe', 1),
      p('gardener', 'spade', 'a gardener digs with a spade', 1),
      p('surgeon', 'scalpel', 'a surgeon cuts with a scalpel', 2),
      p('sculptor', 'chisel', 'a sculptor carves with a chisel', 2),
      p('blacksmith', 'anvil', 'a blacksmith hammers metal on an anvil', 2),
      p('astronomer', 'telescope', 'an astronomer observes the sky with a telescope', 2),
      p('weaver', 'loom', 'a weaver weaves cloth on a loom', 2),
      p('plumber', 'wrench', 'a plumber tightens pipes with a wrench', 2),
      p('mason', 'trowel', 'a mason spreads mortar with a trowel', 3),
      p('cobbler', 'awl', 'a cobbler pierces leather with an awl', 3),
      p('jeweller', 'loupe', 'a jeweller inspects gems with a loupe (a small magnifying glass)', 3),
    ],
  },
  {
    type: 'worker-product',
    label: 'worker : product',
    reversed: 'product : worker',
    pairs: [
      p('poet', 'poem', 'a poet writes a poem', 1),
      p('baker', 'bread', 'a baker makes bread', 1),
      p('author', 'novel', 'an author writes a novel', 1),
      p('sculptor', 'statue', 'a sculptor makes a statue', 1),
      p('potter', 'vase', 'a potter makes a vase', 1),
      p('weaver', 'cloth', 'a weaver makes cloth', 1),
      p('architect', 'building', 'an architect designs a building', 1),
      p('tailor', 'suit', 'a tailor makes a suit', 1),
      p('composer', 'symphony', 'a composer writes a symphony', 2),
      p('cartographer', 'map', 'a cartographer draws a map', 2),
      p('playwright', 'script', 'a playwright writes a script', 2),
      p('lexicographer', 'dictionary', 'a lexicographer compiles a dictionary', 3),
      p('choreographer', 'dance', 'a choreographer creates a dance', 3),
      p('apiarist', 'honey', 'an apiarist (beekeeper) produces honey', 3),
      p('milliner', 'hat', 'a milliner makes hats', 3),
    ],
  },
  {
    type: 'function',
    label: 'object : its function',
    reversed: 'function : object',
    pairs: [
      p('knife', 'cut', 'a knife is used to cut', 1),
      p('pen', 'write', 'a pen is used to write', 1),
      p('broom', 'sweep', 'a broom is used to sweep', 1),
      p('shovel', 'dig', 'a shovel is used to dig', 1),
      p('oven', 'bake', 'an oven is used to bake', 1),
      p('key', 'unlock', 'a key is used to unlock', 1),
      p('ladder', 'climb', 'a ladder is used to climb', 1),
      p('needle', 'sew', 'a needle is used to sew', 1),
      p('soap', 'wash', 'soap is used to wash', 1),
      p('sieve', 'sift', 'a sieve is used to sift', 2),
      p('microscope', 'magnify', 'a microscope is used to magnify', 2),
      p('filter', 'purify', 'a filter is used to purify', 2),
      p('jack', 'lift', 'a jack is used to lift a vehicle', 2),
      p('glue', 'bond', 'glue is used to bond things together', 2),
      p('whetstone', 'sharpen', 'a whetstone is used to sharpen blades', 3),
      p('scythe', 'mow', 'a scythe is used to mow', 3),
      p('pestle', 'grind', 'a pestle is used to grind', 3),
    ],
  },
  {
    type: 'measure',
    label: 'instrument : what it measures',
    reversed: 'quantity : instrument that measures it',
    pairs: [
      p('thermometer', 'temperature', 'a thermometer measures temperature', 1),
      p('clock', 'time', 'a clock measures time', 1),
      p('ruler', 'length', 'a ruler measures length', 1),
      p('speedometer', 'speed', 'a speedometer measures speed', 1),
      p('protractor', 'angle', 'a protractor measures an angle', 1),
      p('scale', 'weight', 'a scale measures weight', 1),
      p('barometer', 'pressure', 'a barometer measures atmospheric pressure', 2),
      p('odometer', 'distance', 'an odometer measures the distance travelled', 2),
      p('ammeter', 'current', 'an ammeter measures electric current', 2),
      p('voltmeter', 'voltage', 'a voltmeter measures voltage', 2),
      p('hygrometer', 'humidity', 'a hygrometer measures humidity', 3),
      p('anemometer', 'wind speed', 'an anemometer measures wind speed', 3),
      p('altimeter', 'altitude', 'an altimeter measures altitude', 3),
      p('seismograph', 'tremor', 'a seismograph measures the strength of an earth tremor', 3),
    ],
  },
  {
    type: 'synonym',
    label: 'synonyms',
    pairs: [
      p('big', 'large', 'big and large both mean "of great size"', 1),
      p('brave', 'courageous', 'brave and courageous both mean "not afraid of danger"', 1),
      p('glad', 'pleased', 'glad and pleased both mean "feeling happy about something"', 1),
      p('quick', 'rapid', 'quick and rapid both mean "fast"', 1),
      p('honest', 'truthful', 'honest and truthful both mean "telling the truth"', 1),
      p('hide', 'conceal', 'hide and conceal both mean "keep out of sight"', 1),
      p('begin', 'commence', 'begin and commence both mean "start"', 2),
      p('tiny', 'minuscule', 'tiny and minuscule both mean "extremely small"', 2),
      p('wealthy', 'affluent', 'wealthy and affluent both mean "rich"', 2),
      p('candid', 'frank', 'candid and frank both mean "open and honest in speech"', 2),
      p('abundant', 'plentiful', 'abundant and plentiful both mean "existing in large amounts"', 2),
      p('obstinate', 'stubborn', 'obstinate and stubborn both mean "refusing to change one\'s mind"', 2),
      p('ephemeral', 'transient', 'ephemeral and transient both mean "lasting a short time"', 3),
      p('garrulous', 'loquacious', 'garrulous and loquacious both mean "very talkative"', 3),
      p('laconic', 'terse', 'laconic and terse both mean "using very few words"', 3),
      p('ubiquitous', 'omnipresent', 'ubiquitous and omnipresent both mean "found everywhere"', 3),
    ],
  },
  {
    type: 'antonym',
    label: 'antonyms',
    pairs: [
      p('generous', 'stingy', 'generous (giving freely) is the opposite of stingy (unwilling to give)', 1),
      p('ancient', 'modern', 'ancient (very old) is the opposite of modern (new, of the present)', 1),
      p('victory', 'defeat', 'victory is the opposite of defeat', 1),
      p('timid', 'bold', 'timid (lacking courage) is the opposite of bold (daring)', 1),
      p('shallow', 'deep', 'shallow is the opposite of deep', 1),
      p('optimist', 'pessimist', 'an optimist (who expects the best) is the opposite of a pessimist (who expects the worst)', 1),
      p('ascend', 'descend', 'ascend (go up) is the opposite of descend (go down)', 1),
      p('expand', 'contract', 'expand (grow larger) is the opposite of contract (grow smaller)', 2),
      p('scarce', 'ample', 'scarce (in short supply) is the opposite of ample (more than enough)', 2),
      p('praise', 'condemn', 'praise (express approval) is the opposite of condemn (express strong disapproval)', 2),
      p('humble', 'arrogant', 'humble (modest) is the opposite of arrogant (proud and overbearing)', 2),
      p('transparent', 'opaque', 'transparent (see-through) is the opposite of opaque (not letting light through)', 2),
      p('lethargic', 'vigorous', 'lethargic (sluggish) is the opposite of vigorous (full of energy)', 2),
      p('zenith', 'nadir', 'the zenith (highest point) is the opposite of the nadir (lowest point)', 3),
      p('verbose', 'succinct', 'verbose (using too many words) is the opposite of succinct (brief and clear)', 3),
      p('gregarious', 'reclusive', 'gregarious (fond of company) is the opposite of reclusive (avoiding company)', 3),
      p('benign', 'malignant', 'benign (harmless) is the opposite of malignant (harmful, spreading)', 3),
    ],
  },
  {
    type: 'characteristic',
    label: 'thing : its characteristic quality',
    reversed: 'quality : thing that has it',
    pairs: [
      p('ice', 'cold', 'ice is characteristically cold', 1, 'object'),
      p('sugar', 'sweet', 'sugar is characteristically sweet', 1, 'object'),
      p('feather', 'light', 'a feather is characteristically light', 1, 'object'),
      p('lemon', 'sour', 'a lemon is characteristically sour', 1, 'object'),
      p('snail', 'slow', 'a snail is characteristically slow', 1, 'animal'),
      p('diamond', 'hard', 'a diamond is characteristically hard', 1, 'object'),
      p('glass', 'fragile', 'glass is characteristically fragile', 1, 'object'),
      p('giraffe', 'tall', 'a giraffe is characteristically tall', 1, 'animal'),
      p('lead', 'dense', 'lead is characteristically dense', 2, 'object'),
      p('velvet', 'soft', 'velvet is characteristically soft', 1, 'object'),
      p('rubber', 'elastic', 'rubber is characteristically elastic', 2, 'object'),
      p('honey', 'viscous', 'honey is characteristically viscous (thick and slow-flowing)', 2, 'object'),
      p('vinegar', 'acidic', 'vinegar is characteristically acidic', 2, 'object'),
      p('cheetah', 'swift', 'a cheetah is characteristically swift', 1, 'animal'),
      p('porcupine', 'prickly', 'a porcupine is characteristically prickly', 2, 'animal'),
      p('sloth', 'sluggish', 'a sloth is characteristically sluggish', 2, 'animal'),
      p('saint', 'virtuous', 'a saint is characteristically virtuous', 2, 'person'),
      p('sage', 'wise', 'a sage is characteristically wise', 2, 'person'),
      p('martinet', 'strict', 'a martinet (a stern disciplinarian) is characteristically strict', 3, 'person'),
      p('sycophant', 'servile', 'a sycophant (a flatterer) is characteristically servile', 3, 'person'),
      p('zealot', 'fervent', 'a zealot (a fanatical supporter) is characteristically fervent', 3, 'person'),
      p('recluse', 'solitary', 'a recluse (one who shuns company) is characteristically solitary', 3, 'person'),
      p('braggart', 'boastful', 'a braggart is characteristically boastful', 3, 'person'),
    ],
  },
  {
    type: 'lack-of',
    label: 'one that lacks : what is lacked',
    reversed: 'what is lacked : one that lacks it',
    pairs: [
      p('coward', 'courage', 'a coward lacks courage', 1, 'person'),
      p('orphan', 'parents', 'an orphan lacks parents', 1, 'person'),
      p('drought', 'rain', 'a drought is a long period without rain', 1, 'condition'),
      p('darkness', 'light', 'darkness is the absence of light', 1, 'condition'),
      p('silence', 'sound', 'silence is the absence of sound', 1, 'condition'),
      p('pauper', 'wealth', 'a pauper lacks wealth', 2, 'person'),
      p('novice', 'experience', 'a novice lacks experience', 2, 'person'),
      p('insomniac', 'sleep', 'an insomniac lacks sleep', 2, 'person'),
      p('traitor', 'loyalty', 'a traitor lacks loyalty', 2, 'person'),
      p('amnesia', 'memory', 'amnesia is a loss of memory', 2, 'condition'),
      p('vacuum', 'air', 'a vacuum contains no air', 2, 'condition'),
      p('famine', 'food', 'a famine is an extreme lack of food', 2, 'condition'),
      p('ingrate', 'gratitude', 'an ingrate (an ungrateful person) lacks gratitude', 3, 'person'),
      p('anarchy', 'government', 'anarchy is the absence of government', 3, 'condition'),
      p('hypocrite', 'sincerity', 'a hypocrite lacks sincerity', 3, 'person'),
      p('philistine', 'culture', 'a philistine lacks any appreciation of culture', 3, 'person'),
    ],
  },
  {
    type: 'location',
    label: 'occupant : where it lives or is kept',
    reversed: 'place : its occupant',
    pairs: [
      p('bee', 'hive', 'a bee lives in a hive', 1, 'animal'),
      p('bird', 'nest', 'a bird lives in a nest', 1, 'animal'),
      p('horse', 'stable', 'a horse is kept in a stable', 1, 'animal'),
      p('lion', 'den', 'a lion lives in a den', 1, 'animal'),
      p('car', 'garage', 'a car is kept in a garage', 1, 'thing'),
      p('ship', 'harbour', 'a ship is moored in a harbour', 1, 'thing'),
      p('prisoner', 'cell', 'a prisoner is kept in a cell', 1, 'person'),
      p('dog', 'kennel', 'a dog is kept in a kennel', 1, 'animal'),
      p('rabbit', 'burrow', 'a rabbit lives in a burrow', 1, 'animal'),
      p('pig', 'sty', 'a pig is kept in a sty', 2, 'animal'),
      p('aeroplane', 'hangar', 'an aeroplane is kept in a hangar', 2, 'thing'),
      p('monk', 'monastery', 'a monk lives in a monastery', 2, 'person'),
      p('soldier', 'barracks', 'a soldier lives in barracks', 2, 'person'),
      p('nun', 'convent', 'a nun lives in a convent', 2, 'person'),
      p('grain', 'granary', 'grain is stored in a granary', 2, 'thing'),
      p('wine', 'cellar', 'wine is stored in a cellar', 2, 'thing'),
      p('eagle', 'eyrie', 'an eagle lives in an eyrie (a nest high on a cliff)', 3, 'animal'),
      p('squirrel', 'drey', 'a squirrel lives in a drey (its nest of twigs)', 3, 'animal'),
      p('weapons', 'arsenal', 'weapons are stored in an arsenal', 3, 'thing'),
    ],
  },
  {
    type: 'symbol',
    label: 'symbol : what it stands for',
    reversed: 'idea : its symbol',
    pairs: [
      p('dove', 'peace', 'a dove is a symbol of peace', 1),
      p('heart', 'love', 'a heart is a symbol of love', 1),
      p('crown', 'royalty', 'a crown is a symbol of royalty', 1),
      p('white flag', 'surrender', 'a white flag is a symbol of surrender', 1),
      p('thumbs-up', 'approval', 'a thumbs-up is a symbol of approval', 1),
      p('wedding ring', 'marriage', 'a wedding ring is a symbol of marriage', 1),
      p('scales', 'justice', 'a pair of scales is a symbol of justice', 2),
      p('owl', 'wisdom', 'an owl is a symbol of wisdom', 2),
      p('skull', 'death', 'a skull is a symbol of death', 2),
      p('halo', 'holiness', 'a halo is a symbol of holiness', 2),
      p('laurel', 'victory', 'a laurel wreath is a symbol of victory', 3),
      p('sceptre', 'sovereignty', 'a sceptre is a symbol of sovereignty', 3),
      p('phoenix', 'rebirth', 'the phoenix is a symbol of rebirth', 3),
    ],
  },
  {
    type: 'sequence',
    label: 'earlier stage : later stage',
    reversed: 'later stage : earlier stage',
    pairs: [
      p('tadpole', 'frog', 'a tadpole grows into a frog', 1, 'growth'),
      p('caterpillar', 'butterfly', 'a caterpillar develops into a butterfly', 1, 'growth'),
      p('bud', 'blossom', 'a bud opens into a blossom', 1, 'growth'),
      p('spring', 'summer', 'spring comes just before summer', 1, 'order'),
      p('morning', 'afternoon', 'morning comes just before afternoon', 1, 'order'),
      p('cub', 'lion', 'a cub grows into a lion', 1, 'growth'),
      p('egg', 'chick', 'an egg hatches into a chick', 1, 'growth'),
      p('breakfast', 'lunch', 'breakfast comes before lunch', 1, 'order'),
      p('sapling', 'tree', 'a sapling grows into a tree', 2, 'growth'),
      p('rehearsal', 'performance', 'a rehearsal comes before the performance', 2, 'order'),
      p('childhood', 'adolescence', 'childhood comes before adolescence', 2, 'order'),
      p('grape', 'raisin', 'a grape becomes a raisin when dried', 2, 'growth'),
      p('draft', 'revision', 'a first draft comes before its revision', 2, 'order'),
      p('cadet', 'officer', 'a cadet trains to become an officer', 2, 'growth'),
      p('larva', 'pupa', 'a larva develops into a pupa', 3, 'growth'),
      p('zygote', 'embryo', 'a zygote develops into an embryo', 3, 'growth'),
      p('embryo', 'foetus', 'an embryo develops into a foetus', 3, 'growth'),
    ],
  },
];

/**
 * Relationship types that are too close to be safe distractors for each other (symmetric).
 * A pair of a conflicting type is never offered as a wrong option, because a candidate could
 * reasonably argue that it shares the original pair's relationship.
 */
export const CONFLICTS: readonly (readonly [RelationType, RelationType])[] = [
  ['synonym', 'degree'],
  ['synonym', 'characteristic'],
  ['antonym', 'lack-of'],
  ['antonym', 'sequence'],
  ['cause-effect', 'sequence'],
  ['cause-effect', 'worker-product'],
  ['cause-effect', 'function'],
  ['cause-effect', 'characteristic'],
  ['worker-product', 'location'],
  ['characteristic', 'symbol'],
  ['type-of', 'part-whole'],
  ['part-whole', 'location'],
  ['function', 'measure'],
  ['degree', 'sequence'],
];
