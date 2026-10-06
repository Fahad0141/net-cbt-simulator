import { defineBank, type Builder } from '@/engine/authoring';
import type { Difficulty, SetTemplate } from '@/engine/types';

/**
 * English, chapter "Reading Comprehension": PART A (short passages). Part B
 * (`comprehension.concepts.ts`) is a separate file. Every local id here starts with `rc-`.
 *
 * Each entry is an ORIGINAL short passage (60-160 words, like the ~72-word passage in NUST's
 * sample paper) on science, technology, history or society, with a pool of hand-written questions.
 * A set template delivers `size` questions drawn from the pool (kept in pool order), so a passage
 * can appear with different questions in different papers. Every answer is grounded in the passage
 * text; distractors are either contradicted by the passage or not supported by it at all, and
 * vocabulary-in-context distractors are other genuine senses of the word that do not fit the context.
 */

type Kind = 'main' | 'detail' | 'inference' | 'reference' | 'vocab' | 'tone';

/** Syllabus sub-topic for each question kind (detail questions test stated ideas). */
const TAG: Record<Kind, string> = {
  main: 'main idea',
  detail: 'main idea',
  inference: 'inference',
  reference: 'reference',
  vocab: 'vocabulary in context',
  tone: 'tone and purpose',
};

interface PassageQuestion {
  k: Kind;
  q: string;
  a: string;
  x: readonly [string, string, string];
  e: string;
}

interface Passage {
  id: string;
  d: Difficulty;
  /** Mirrors a recurring NET theme (one-question short passage on a familiar topic). */
  pp?: true;
  /** Questions delivered per paper (drawn from `qs`). */
  size: 1 | 2 | 3;
  text: string;
  qs: readonly PassageQuestion[];
}

const wordCount = (s: string): number => s.trim().split(/\s+/).length;

function toSet(b: Builder, p: Passage): SetTemplate {
  const words = wordCount(p.text);
  if (words < 60 || words > 160) throw new Error(`comprehension/${p.id}: passage has ${words} words (60-160)`);
  if (p.size > p.qs.length) throw new Error(`comprehension/${p.id}: size ${p.size} exceeds pool ${p.qs.length}`);
  const tags = [...new Set(p.qs.map((q) => TAG[q.k]))];
  const all = p.qs.map((_, i) => i);
  return b.set(p.id, { difficulty: p.d, origin: p.pp ? 'past-paper' : 'original', tags }, p.size, (r) => {
    const picked = p.size === p.qs.length ? all : r.sample(all, p.size).sort((a, c) => a - c);
    return {
      passage: p.text,
      questions: picked.map((i) => {
        const q = p.qs[i]!;
        return { stem: q.q, answer: q.a, distractors: [...q.x], explanation: q.e };
      }),
    };
  });
}

// ------------------------------------------------------------------ difficulty 1

const EASY: readonly Passage[] = [
  {
    id: 'rc-honeybee-pollination', d: 1, pp: true, size: 1,
    text: 'Honeybees are often praised for the honey they produce, but their greater value lies elsewhere. As a bee moves from flower to flower collecting nectar, grains of pollen stick to its hairy body and are carried to the next blossom. This transfer allows many plants to form seeds and fruit. Farmers who grow almonds, apples and sunflowers depend heavily on this free service. When bee colonies decline because of disease or the careless use of pesticides, crop yields can fall sharply. Protecting bees, therefore, is not only a matter of saving an insect; it is a matter of protecting the food supply.',
    qs: [
      {
        k: 'main', q: 'The passage is mainly concerned with:',
        a: 'the role of bees in pollinating food crops',
        x: ['the methods farmers use to collect honey', 'the effect of pesticides on human health', 'the kinds of flowers that bees prefer'],
        e: 'Every sentence after the first builds one point: bees carry pollen, crops depend on it, and losing bees threatens the food supply. Honey is mentioned only to be set aside, and pesticides only as one cause of bee decline.',
      },
      {
        k: 'detail', q: 'According to the passage, the greatest value of honeybees lies in:',
        a: 'carrying pollen from flower to flower',
        x: ['producing honey for sale', 'protecting crops from disease', 'eating insects that harm crops'],
        e: 'The passage says their "greater value lies elsewhere" than honey: in carrying pollen to the next blossom so that plants can form seeds and fruit.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "decline" most nearly means:',
        a: 'become fewer or weaker',
        x: ['politely refuse', 'slope downwards', 'move away'],
        e: 'Colonies that "decline because of disease" shrink or weaken, which is why crop yields then fall. "Politely refuse" is the sense in "decline an invitation", which does not fit here.',
      },
    ],
  },
  {
    id: 'rc-printing-press', d: 1, pp: true, size: 1,
    text: "Before the middle of the fifteenth century, books in Europe were copied by hand, a slow task that made them rare and costly. Around 1450, Johannes Gutenberg developed a press that used movable metal type. A single workshop could now produce hundreds of identical copies in the time a scribe needed to finish one. As books became cheaper, more people learned to read, and new ideas in science and religion spread across the continent with remarkable speed. Historians still debate many details of Gutenberg's life, but few doubt that his invention changed the way knowledge travelled.",
    qs: [
      {
        k: 'main', q: 'Which of the following best states the main idea of the passage?',
        a: "Gutenberg's press made books cheaper and helped ideas spread.",
        x: ['Scribes produced better books than the printing press did.', "Historians know every detail of Gutenberg's life.", 'Most Europeans could read well before 1450.'],
        e: 'The passage moves from costly hand-copied books to cheap printed ones and the rapid spread of ideas. The passage never compares the quality of handwritten and printed books, it says historians still debate details of his life, and it says more people learned to read only after books became cheaper.',
      },
      {
        k: 'reference', q: 'In the last sentence of the passage, the word "his" refers to:',
        a: 'Gutenberg',
        x: ['a scribe', 'a historian', 'a reader'],
        e: '"Few doubt that his invention changed the way knowledge travelled": the invention is the printing press, so "his" refers to Gutenberg.',
      },
      {
        k: 'detail', q: 'According to the passage, books in Europe before about 1450 were costly because:',
        a: 'they had to be copied by hand',
        x: ['metal type was hard to obtain', 'very few people wanted to read', 'paper had to be imported'],
        e: 'The first sentence says books were copied by hand, "a slow task that made them rare and costly". Metal type came only with the press, and the other reasons are not mentioned.',
      },
    ],
  },
  {
    id: 'rc-camel-desert', d: 1, pp: true, size: 1,
    text: 'The camel is superbly suited to life in the desert. Contrary to a popular belief, its hump does not hold water; it stores fat, which the animal can draw on when food is scarce. Keeping fat in one place, rather than spread under the skin, also lets heat escape more easily from the rest of the body. A thirsty camel can drink over a hundred litres of water in about ten minutes, and its body loses very little moisture, so it can go for days without drinking. Long eyelashes and nostrils that can close protect it from blowing sand.',
    qs: [
      {
        k: 'detail', q: "According to the passage, a camel's hump stores:",
        a: 'fat',
        x: ['water', 'blood', 'air'],
        e: 'The passage corrects "a popular belief": the hump "does not hold water; it stores fat".',
      },
      {
        k: 'main', q: 'The passage is mainly about:',
        a: 'how the camel is adapted to desert life',
        x: ['how camels are trained to carry loads', 'why deserts receive so little rain', 'the history of camel trade routes'],
        e: 'The first sentence states the main idea, and the rest gives examples: the fat-storing hump, the ability to drink and conserve water, and protection from sand.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "scarce" most nearly means:',
        a: 'in short supply',
        x: ['easily found', 'bitter in taste', 'harmful to eat'],
        e: 'The camel draws on its stored fat "when food is scarce", that is, when there is little food to be found. "Easily found" is the opposite.',
      },
      {
        k: 'reference', q: 'In the last sentence of the passage, the word "it" refers to:',
        a: 'the camel',
        x: ['the sand', 'the desert', 'the hump'],
        e: 'Long eyelashes and closing nostrils protect the animal from blowing sand, so "it" is the camel. The sand is what it is protected from.',
      },
    ],
  },
  {
    id: 'rc-karakoram-highway', d: 1, size: 2,
    text: 'The Karakoram Highway links Pakistan with China across some of the highest mountains on Earth. Built over about twenty years and opened to the public in 1986, it climbs to nearly 4,700 metres at the Khunjerab Pass. Its builders faced landslides, freezing winters and thin air, and hundreds of workers lost their lives. Today the road carries trucks loaded with goods, tourists coming to see the peaks, and villagers travelling to markets that were once days away on foot. Many people call it the eighth wonder of the world.',
    qs: [
      {
        k: 'main', q: 'Which of the following is the most suitable title for the passage?',
        a: 'A Road Across the Mountains',
        x: ['The Wildlife of the Khunjerab Pass', 'How Glaciers Shape Valleys', 'Farming in Cold Climates'],
        e: 'Every sentence is about the highway: where it runs, how it was built and whom it serves. Wildlife, glaciers and farming are not discussed.',
      },
      {
        k: 'detail', q: 'According to the passage, the builders of the highway faced all of the following EXCEPT:',
        a: 'heavy traffic',
        x: ['landslides', 'freezing winters', 'thin air'],
        e: "The passage lists \"landslides, freezing winters and thin air\" as the difficulties. Traffic is mentioned only as the road's use today.",
      },
      {
        k: 'inference', q: 'It can be inferred from the passage that before the highway was built, many villagers:',
        a: 'took a long time to reach markets',
        x: ['travelled to markets by train', 'had no need to visit any market', 'lived at the top of the Khunjerab Pass'],
        e: 'Markets "were once days away on foot", so reaching them used to take a long time. No railway is mentioned, and the villagers clearly did travel to markets.',
      },
    ],
  },
  {
    id: 'rc-journey-of-chess', d: 1, size: 1,
    text: 'Chess travelled a long way to reach its modern form. Its earliest known ancestor, a game called chaturanga, was played in India around the sixth century. From India it spread to Persia, where it became known as shatranj, and after the Arab conquest of Persia it was carried across the Islamic world and into Europe. Along the way the pieces changed. The elephant became the bishop, and the weak counsellor, which could move only one square diagonally, became the powerful queen in fifteenth-century Spain.',
    qs: [
      {
        k: 'main', q: 'The passage is mainly about:',
        a: 'how chess changed as it spread between lands',
        x: ['the rules for moving a chess bishop', 'why chess is popular in modern Spain', 'the life of a famous chess player'],
        e: 'The passage traces chess from India to Persia, the Islamic world and Europe, and shows how its pieces changed along the way.',
      },
      {
        k: 'reference', q: 'In the last sentence of the passage, the word "which" refers to:',
        a: 'the counsellor',
        x: ['the elephant', 'the bishop', 'the queen'],
        e: '"The weak counsellor, which could move only one square diagonally, became the powerful queen": the clause describes the counsellor before it became the queen.',
      },
      {
        k: 'detail', q: 'According to the passage, the chess queen was originally:',
        a: 'a weak piece called the counsellor',
        x: ['a strong piece called the elephant', 'a piece first added in Spain', 'the most powerful piece in chaturanga'],
        e: 'The last sentence says the weak counsellor "became the powerful queen in fifteenth-century Spain". The elephant became the bishop.',
      },
    ],
  },
  {
    id: 'rc-sleeping-dolphins', d: 1, size: 1,
    text: 'Dolphins face a problem that land animals do not: they must swim to the surface to breathe, even while resting. Scientists have found that a dolphin solves this by sleeping with only half of its brain at a time. One half rests while the other stays awake enough to control breathing and watch for danger. After a while, the two halves swap roles. During this kind of sleep, the dolphin often keeps one eye open, the eye controlled by the waking half of its brain.',
    qs: [
      {
        k: 'detail', q: 'According to the passage, a dolphin sleeps with half of its brain at a time so that it can:',
        a: 'keep breathing and watch for danger',
        x: ['dream more vividly than land animals', 'swim faster during the night', 'hear the calls of other dolphins'],
        e: 'The waking half "stays awake enough to control breathing and watch for danger". Dreams, speed and calls are not mentioned.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "swap" most nearly means:',
        a: 'exchange',
        x: ['repeat', 'forget', 'lose'],
        e: 'After a while the resting half wakes and the waking half rests: the two halves exchange roles.',
      },
      {
        k: 'inference', q: 'It can be inferred from the passage that land animals:',
        a: 'need not stay partly awake in order to breathe',
        x: ['sleep with half of the brain at a time', 'must swim to the surface to breathe', 'never close their eyes while sleeping'],
        e: 'Dolphins face this problem but "land animals do not", so land animals can breathe in their sleep without keeping part of the brain awake to bring them up for air. The other options describe dolphins or are not stated.',
      },
    ],
  },
  {
    id: 'rc-jenner-smallpox', d: 1, size: 1,
    text: "In the late eighteenth century, smallpox killed or scarred millions of people. The English doctor Edward Jenner noticed that milkmaids who had caught cowpox, a mild disease of cattle, seldom caught smallpox. In 1796 he tested this idea by placing material from a cowpox sore into a small cut on a boy's arm. Weeks later, he exposed the boy to smallpox, and the boy stayed healthy. Jenner's method, which became known as vaccination after the Latin word for cow, spread around the world. In 1980, smallpox became the first human disease to be declared wiped out.",
    qs: [
      {
        k: 'detail', q: "According to the passage, Jenner's idea was based on his observation that:",
        a: 'milkmaids who had had cowpox seldom caught smallpox',
        x: ['cattle never suffered from any disease', 'children recovered from smallpox faster than adults', 'smallpox was spread mainly by cattle'],
        e: 'The second sentence states that Jenner "noticed that milkmaids who had caught cowpox ... seldom caught smallpox". The other options are not in the passage.',
      },
      {
        k: 'reference', q: 'In the fourth sentence of the passage, the word "he" refers to:',
        a: 'Jenner',
        x: ['the boy', 'a milkmaid', 'a cattle farmer'],
        e: '"Weeks later, he exposed the boy to smallpox": the person doing the exposing is the experimenter, Jenner; the boy is the one exposed.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "exposed" most nearly means:',
        a: 'deliberately brought into contact',
        x: ['revealed as dishonest', 'left without any shelter', 'displayed in public'],
        e: 'Jenner tested the boy by bringing him into contact with smallpox to see if he would fall ill. "Revealed as dishonest" and "displayed in public" are other senses of "exposed" that make no sense here.',
      },
    ],
  },
  {
    id: 'rc-al-biruni-earth', d: 1, size: 1,
    text: "In the early eleventh century, the scholar Al-Biruni set out to measure the size of the Earth. Earlier scholars had needed to measure long distances across flat deserts, but Al-Biruni found a simpler way. He first used trigonometry to find the height of a hill near the fort of Nandana, in present-day Pakistan. Then, from the hilltop, he measured the angle down to the distant horizon. With these two figures and some geometry, he calculated the Earth's radius. His result was remarkably close to the value accepted today.",
    qs: [
      {
        k: 'detail', q: "According to the passage, Al-Biruni's method required him to measure:",
        a: 'the height of a hill and the angle to the horizon',
        x: ['a long distance across a flat desert', 'the shadow of a stick in two cities', 'the time the sun took to set'],
        e: 'He found the height of a hill near Nandana and then "measured the angle down to the distant horizon"; "with these two figures" he calculated the radius. Desert distances were the method of earlier scholars.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "remarkably" most nearly means:',
        a: 'strikingly',
        x: ['loudly', 'carelessly', 'secretly'],
        e: 'A result "remarkably close" to today\'s value is strikingly, surprisingly close.',
      },
      {
        k: 'main', q: 'Which of the following is the most suitable title for the passage?',
        a: 'A Clever Way to Measure the Earth',
        x: ['The Deserts of the Ancient World', 'The History of the Fort of Nandana', 'Why Hills Are Hard to Climb'],
        e: 'The passage describes how Al-Biruni found a simpler method of calculating the Earth\'s radius. Deserts and the fort are mentioned only in passing.',
      },
    ],
  },
];

// ------------------------------------------------------------------ difficulty 2

const MEDIUM: readonly Passage[] = [
  {
    id: 'rc-earthquake-buildings', d: 2, pp: true, size: 2,
    text: 'When the earthquake of October 2005 struck northern Pakistan, it was not the shaking itself that killed most of its victims, but the collapse of buildings. Heavy concrete roofs resting on unreinforced brick or stone walls crumbled within seconds, burying families and schoolchildren. Engineers point out that safer construction need not be expensive. Steel bars set inside concrete columns, light roofs, and wooden or concrete bands tied around walls at regular heights help a building bend without breaking. The lesson is uncomfortable but clear: earthquakes are natural events, but much of the destruction they cause is a product of human choices.',
    qs: [
      {
        k: 'main', q: 'The main point of the passage is that:',
        a: 'better construction can greatly reduce earthquake deaths',
        x: ['earthquakes in Pakistan can now be predicted', 'safe buildings are too costly for most people', 'brick walls are stronger than reinforced concrete'],
        e: 'The passage blames most deaths on collapsing buildings and describes cheap ways to build safely. It says safer construction "need not be expensive" and never mentions prediction.',
      },
      {
        k: 'inference', q: 'It can be inferred that walls tied with bands at regular heights are safer because they:',
        a: 'can bend during shaking without collapsing',
        x: ['are too heavy to be moved by a quake', 'are always built far from fault lines', 'warn people before the shaking begins'],
        e: 'The passage says these measures "help a building bend without breaking". Heavy construction, such as heavy roofs, is shown as the danger, not the cure.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "crumbled" most nearly means:',
        a: 'fell to pieces',
        x: ['stood firm', 'shook gently', 'caught fire'],
        e: 'Roofs and walls that "crumbled within seconds" broke apart and fell, burying the people inside.',
      },
      {
        k: 'tone', q: 'By calling the lesson "uncomfortable but clear", the author suggests that:',
        a: 'people share responsibility for much of the damage',
        x: ['the victims caused the earthquake themselves', 'earthquakes are caused by human activity', 'nothing could have prevented the deaths'],
        e: 'The lesson is uncomfortable because much of the destruction is "a product of human choices" about how to build. The author still calls earthquakes themselves "natural events".',
      },
    ],
  },
  {
    id: 'rc-two-step-login', d: 2, pp: true, size: 2,
    text: 'A password alone is a weak lock. People reuse the same one on many websites, so when a single site is hacked, criminals can try the stolen password everywhere else. Two-step verification adds a second barrier: after typing the password, the user must also enter a short code sent to a phone or produced by an app. A thief who has stolen only the password is stopped at this second door. The method is not perfect, since a clever trickster may persuade a victim to read out the code, but it makes most attacks far harder and costs the user only a few extra seconds.',
    qs: [
      {
        k: 'tone', q: "The author's main purpose in the passage is to:",
        a: 'explain why two-step verification improves security',
        x: ['teach readers how to break into websites', 'argue that passwords should be abolished', 'describe how phones receive text messages'],
        e: 'The passage shows the weakness of passwords alone and how a second code stops most thieves. The password remains the first step; it is not abolished.',
      },
      {
        k: 'inference', q: 'It can be inferred that two-step verification would fail to protect a user who:',
        a: 'is tricked into reading out the code to a thief',
        x: ['uses a different password on each site', 'spends a few seconds typing the code', 'receives the code on his own phone'],
        e: 'The passage names this weakness: "a clever trickster may persuade a victim to read out the code". With both the password and the code, the thief gets through.',
      },
      {
        k: 'reference', q: 'In the passage, the phrase "this second door" refers to:',
        a: 'the short code entered after the password',
        x: ["the user's original password", 'the website that was hacked', 'the front door of the house'],
        e: 'The second barrier is the short code needed "after typing the password"; a thief holding only the password is stopped there.',
      },
      {
        k: 'tone', q: "The author's attitude towards two-step verification is best described as:",
        a: 'favourable, though aware of its limits',
        x: ['completely opposed', 'confused and uncertain', 'wholly uninterested'],
        e: 'The author admits "the method is not perfect" but says it makes most attacks far harder at little cost: approval with a reservation.',
      },
    ],
  },
  {
    id: 'rc-urban-heat-island', d: 2, size: 1,
    text: 'On a summer night, the centre of a large city such as Lahore can stay several degrees warmer than the surrounding countryside. This effect, known as the urban heat island, has several causes. Concrete, brick and asphalt soak up sunlight during the day and release the stored heat slowly after dark. Air conditioners and vehicles pump out further heat. Meanwhile, the trees and open soil that would cool the air through evaporation have largely been replaced by buildings. Planners hoping to ease the problem are now planting trees along roads and painting rooftops in light colours that reflect sunlight.',
    qs: [
      {
        k: 'inference', q: 'It can be inferred from the passage that painting rooftops in light colours helps because light surfaces:',
        a: "absorb less of the sun's heat",
        x: ['release more heat after dark', 'cool the air through evaporation', 'make air conditioners unnecessary'],
        e: 'Light colours "reflect sunlight", so less heat is soaked up by day and less is released at night. Evaporation is how trees and soil cool the air, not paint, and the passage never claims air conditioning becomes unnecessary.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the phrase "soak up" most nearly means:',
        a: 'absorb',
        x: ['drench', 'soften', 'dissolve'],
        e: 'Concrete and asphalt take in sunlight by day and release the stored heat later, so "soak up" means absorb. "Drench" (make thoroughly wet) is the sense of "soak" with water.',
      },
      {
        k: 'detail', q: 'Which of the following is NOT given in the passage as a cause of the urban heat island?',
        a: 'Rivers flowing through the city',
        x: ['Heat given out by vehicles', 'The loss of trees and open soil', 'Heat stored in concrete and asphalt'],
        e: 'The passage names stored heat in building materials, heat from air conditioners and vehicles, and the replacement of trees and soil by buildings. Rivers are never mentioned.',
      },
    ],
  },
  {
    id: 'rc-silk-road', d: 2, size: 1,
    text: 'The Silk Road was never a single road. It was a shifting web of caravan routes linking China with Central Asia, Persia and the Mediterranean. Merchants rarely travelled its whole length; instead, goods passed from hand to hand, changing owners at each great market town. Silk, spices and paper moved along these routes, but so did less visible cargo. Buddhist monks carried their teachings into China, and techniques such as papermaking eventually reached the Islamic world and then Europe. In this sense, the routes carried ideas as well as merchandise.',
    qs: [
      {
        k: 'main', q: 'The main point of the passage is that the Silk Road:',
        a: 'spread ideas as well as goods between regions',
        x: ['was a single paved highway from China to Rome', 'was used mainly by travelling Buddhist monks', 'mattered only for the trade in silk'],
        e: 'The closing sentence sums up the passage: "the routes carried ideas as well as merchandise". The passage opens by denying it was a single road, and says the routes carried far more than silk.',
      },
      {
        k: 'reference', q: 'In the passage, the phrase "less visible cargo" refers to:',
        a: 'religious teachings and technical knowledge',
        x: ['silk and spices', 'the merchants themselves', 'goods hidden from robbers'],
        e: 'The sentences that follow explain it: Buddhist teachings travelled into China and papermaking techniques reached the Islamic world and Europe. Silk and spices are the visible goods it is contrasted with.',
      },
      {
        k: 'detail', q: 'According to the passage, most merchants on the Silk Road:',
        a: 'travelled only part of the route',
        x: ['went from China all the way to the Mediterranean', 'avoided the market towns along the way', 'carried Buddhist teachings into China'],
        e: '"Merchants rarely travelled its whole length; instead, goods passed from hand to hand" at the market towns. The teachings were carried by monks.',
      },
    ],
  },
  {
    id: 'rc-sharing-rumours', d: 2, pp: true, size: 2,
    text: "A rumour can now reach millions of screens before anyone has checked whether it is true. On social media, posts that provoke anger or fear are shared far more often than calm, careful reports, and each share pushes the story in front of new readers. Few of them stop to ask where it came from. The cure is not to abandon these platforms, which also spread useful news, but to build a habit of pausing before clicking 'share': checking the source, looking for the same report elsewhere, and asking whether a headline seems designed to inflame.",
    qs: [
      {
        k: 'tone', q: "The author's main purpose in the passage is to:",
        a: 'urge readers to check information before sharing it',
        x: ['persuade readers to stop using social media', 'explain how social media companies earn money', 'praise the speed of modern news reporting'],
        e: 'The passage ends with advice: pause before sharing, check the source and look for other reports. It explicitly says the cure is "not to abandon these platforms", and it criticises, rather than praises, how fast rumours spread.',
      },
      {
        k: 'inference', q: 'It can be inferred that the author regards social media platforms as:',
        a: 'useful but open to misuse',
        x: ['completely harmful', 'entirely trustworthy', 'of no interest to readers'],
        e: 'The author says the platforms "also spread useful news" yet lets rumours travel unchecked. That is a mixed view, so both extreme options are wrong.',
      },
      {
        k: 'reference', q: 'In the sentence "Few of them stop to ask where it came from", the word "them" refers to:',
        a: 'new readers',
        x: ['angry posts', 'careful reports', 'the platforms'],
        e: 'The previous sentence ends with each share pushing the story "in front of new readers"; it is these readers who fail to ask where the story came from.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "inflame" most nearly means:',
        a: 'stir up strong anger',
        x: ['set on fire', 'cause painful swelling', 'brighten with light'],
        e: 'A headline "designed to inflame" is written to provoke anger or fear, echoing the earlier point about such posts. "Set on fire" and "cause swelling" are literal and medical senses that do not fit.',
      },
    ],
  },
  {
    id: 'rc-octopus-mind', d: 2, size: 2,
    text: "The octopus has puzzled biologists for decades. It is a mollusc, a relative of snails and clams, animals not known for their intelligence, yet the octopus can open screw-top jars, find its way through mazes and recognise individual human keepers. Strangely, about two-thirds of its neurons lie not in its brain but in its eight arms, each of which can explore and grasp with some independence. Because the octopus evolved along a branch of life so distant from ours, studying it may reveal whether intelligence can be built in ways entirely unlike the vertebrate brain.",
    qs: [
      {
        k: 'inference', q: 'It can be inferred from the passage that the octopus surprises biologists partly because:',
        a: 'its close relatives are not known for intelligence',
        x: ['it is closely related to human beings', 'it has no neurons at all in its arms', 'it cannot recognise individual people'],
        e: 'The passage contrasts its clever behaviour with its relatives, snails and clams, "not known for their intelligence". It also says the octopus is on a branch "so distant from ours", has most neurons in its arms and recognises keepers.',
      },
      {
        k: 'detail', q: "According to the passage, most of the octopus's neurons are located in its:",
        a: 'arms',
        x: ['brain', 'eyes', 'skin'],
        e: 'The passage says "about two-thirds of its neurons lie not in its brain but in its eight arms".',
      },
      {
        k: 'inference', q: 'The last sentence of the passage suggests that studying the octopus could help scientists to:',
        a: 'learn whether intelligence can take very different forms',
        x: ['design stronger screw-top jars', 'prove that snails are intelligent', 'train octopuses to solve harder mazes'],
        e: 'The final sentence says the octopus "may reveal whether intelligence can be built in ways entirely unlike the vertebrate brain".',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "puzzled" most nearly means:',
        a: 'baffled',
        x: ['amused', 'angered', 'bored'],
        e: 'Biologists have been puzzled because the octopus\'s intelligence is hard to explain: they are baffled by it.',
      },
    ],
  },
  {
    id: 'rc-indus-irrigation', d: 2, size: 1,
    text: "Pakistan's farms rely on one of the largest connected irrigation systems in the world, a network of barrages and canals fed by the Indus and its tributaries. Yet much of the water that leaves the canals never reaches a crop. Some seeps through unlined channel beds; more is lost when fields are flooded far beyond what plants need. Engineers argue that lining canals and levelling fields with laser-guided equipment could save large volumes of water at modest cost. In a country where the water available per person has fallen steadily, such savings may matter more than building another dam.",
    qs: [
      {
        k: 'main', q: 'The passage mainly argues that:',
        a: 'cutting water losses in irrigation could be very valuable',
        x: ['Pakistan should build more dams as soon as possible', 'canals in Pakistan are shorter than elsewhere', 'farmers give their crops too little water'],
        e: 'The passage describes how water is lost through seepage and over-flooding and argues that saving it "may matter more than building another dam". Fields are flooded "far beyond what plants need", so crops are not short of water.',
      },
      {
        k: 'tone', q: 'The author mentions laser-guided equipment in order to:',
        a: 'give an example of a way to save water',
        x: ['show that farming has become too costly', 'explain how canals are first constructed', 'criticise the use of modern technology'],
        e: 'Laser levelling of fields is one of the two measures engineers propose to "save large volumes of water at modest cost".',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "modest" most nearly means:',
        a: 'moderate',
        x: ['shy', 'unboastful', 'old-fashioned'],
        e: 'Savings "at modest cost" are savings at a moderate, fairly small cost. "Shy" and "unboastful" describe modest people, not prices.',
      },
    ],
  },
  {
    id: 'rc-railway-time', d: 2, size: 2,
    text: 'Until the middle of the nineteenth century, every town set its clocks by the sun, so noon in one town came a few minutes earlier or later than noon in its neighbours. Nobody minded while travel was slow. The railways changed that. A timetable listing departures in a dozen different local times confused passengers and invited accidents. In 1847 most British railway companies adopted a single standard time, taken from Greenwich, and towns gradually followed. Decades later, the world was divided into time zones. It was, in a sense, the steam engine that taught people to share a common hour.',
    qs: [
      {
        k: 'inference', q: 'It can be inferred from the passage that before the railways, differences in local time:',
        a: 'caused few problems because travel was slow',
        x: ['led to frequent railway accidents', 'had been removed by world time zones', 'were fixed by officials at Greenwich'],
        e: '"Nobody minded while travel was slow": the differences mattered only once fast trains linked towns. Railways, Greenwich time and time zones all came later.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "invited" most nearly means:',
        a: 'made likely',
        x: ['politely asked', 'warmly welcomed', 'formally requested'],
        e: 'A confusing timetable that "invited accidents" made accidents likely to happen. Asking, welcoming and requesting are the senses of "invite" used for guests, and a timetable cannot do any of these.',
      },
      {
        k: 'inference', q: 'The final sentence of the passage suggests that:',
        a: 'the railways led people to adopt a shared time',
        x: ['steam engines were used to keep clocks accurate', 'people learnt to tell the time from train drivers', 'trains in Britain always ran exactly on time'],
        e: 'Saying the steam engine "taught people to share a common hour" is a figurative way of crediting the railways with bringing about standard time.',
      },
    ],
  },
  {
    id: 'rc-ai-diagnosis', d: 2, size: 1,
    text: 'Computer programs trained on thousands of medical images can now spot some eye diseases and skin cancers as accurately as experienced specialists. Supporters say such tools could bring expert screening to rural clinics that have never had a specialist. Yet the programs have limits. A system trained mainly on images from one population may perform poorly on patients who look different, and it cannot explain its reasoning as a doctor can. For now, the wisest course seems to be to treat these programs as assistants that flag possible problems, leaving the final judgement to a trained physician.',
    qs: [
      {
        k: 'tone', q: "The author's attitude towards medical image programs is best described as:",
        a: 'cautiously optimistic',
        x: ['wholly dismissive', 'uncritically enthusiastic', 'deeply hostile'],
        e: 'The author grants their accuracy and promise for rural clinics but points out their limits and wants doctors to keep the final judgement: hopeful, with reservations.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "flag" most nearly means:',
        a: 'draw attention to',
        x: ['lose energy', 'wave in the wind', 'pave with stones'],
        e: 'Programs that "flag possible problems" point them out for a doctor to judge. "Lose energy" (as in flagging spirits) and "pave with stones" are other senses of "flag".',
      },
      {
        k: 'inference', q: 'It can be inferred that a program trained mostly on images from one population might:',
        a: 'miss diseases in patients from other groups',
        x: ['work better on unfamiliar patients', 'explain its reasoning more clearly', 'replace specialists in every clinic'],
        e: 'The passage warns that such a system "may perform poorly on patients who look different", so it could miss their diseases. It also says the programs cannot explain their reasoning and should remain assistants.',
      },
    ],
  },
];

// ------------------------------------------------------------------ difficulty 3

const HARD: readonly Passage[] = [
  {
    id: 'rc-organised-doubt', d: 3, pp: true, size: 2,
    text: "Science is often pictured as a collection of settled facts, but its real strength lies in organised doubt. Before a study is published in a reputable journal, other experts examine its methods and challenge its conclusions. After publication, laboratories elsewhere may try to repeat the experiment; a result that cannot be reproduced gradually loses credibility, however famous its author. This process is slow and occasionally lets errors through, yet it is self-correcting in a way that few human institutions are. A scientist's confidence, then, should be proportioned to the evidence rather than to authority or reputation.",
    qs: [
      {
        k: 'main', q: 'The central claim of the passage is that science is reliable chiefly because:',
        a: 'its claims are repeatedly tested and corrected',
        x: ['its findings come from famous scientists', 'its journals never publish any errors', 'its facts are settled once and for all'],
        e: 'The "real strength" of science is "organised doubt": review, attempts to reproduce results and self-correction. The passage rejects authority as a basis for confidence, admits that errors get through, and opposes the "settled facts" picture.',
      },
      {
        k: 'inference', q: 'With which of the following statements would the author most likely agree?',
        a: 'A result becomes more credible once others reproduce it.',
        x: ["A famous scientist's results need not be checked.", 'Peer review guarantees that studies are correct.', 'Doubt weakens science and should be avoided.'],
        e: 'Results that cannot be reproduced "lose credibility", so reproduction strengthens a result. The author says fame does not protect a result, that the process "occasionally lets errors through", and that doubt is science\'s strength.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "proportioned" most nearly means:',
        a: 'matched in degree',
        x: ['divided into equal parts', 'pleasingly shaped', 'reduced in size'],
        e: 'Confidence "proportioned to the evidence" rises and falls with the strength of the evidence, so it is matched in degree to it. "Pleasingly shaped" is the sense in "a well-proportioned room".',
      },
      {
        k: 'tone', q: "The author's attitude towards the scientific process is best described as:",
        a: 'appreciative but aware of its flaws',
        x: ['uncritically admiring', 'cynical and dismissive', 'wholly indifferent'],
        e: 'The author praises science as self-correcting "in a way that few human institutions are" but admits it is "slow and occasionally lets errors through". The praise is qualified, so it is not uncritical.',
      },
    ],
  },
  {
    id: 'rc-automation-paradox', d: 3, size: 2,
    text: 'Modern airliners can fly themselves for most of a journey, and automation has made air travel safer than ever. Yet engineers have noticed an awkward side effect. Because the computer handles routine flying, pilots get fewer chances to practise manual skills, and their attention may drift during long, uneventful hours. When the automation does fail, usually in an unusual and stressful situation, it hands control back to a human who is less practised than before, at precisely the moment when skill matters most. The more reliable the system, the rarer and harder these moments become. Some airlines therefore require pilots to fly parts of routine flights by hand.',
    qs: [
      {
        k: 'main', q: 'The passage is chiefly concerned with:',
        a: 'how reliable automation can erode the skills needed when it fails',
        x: ['why air travel has become more dangerous than before', 'the technical design of computers that fly airliners', 'the reasons pilots dislike flying with automation'],
        e: 'The passage describes a side effect of automation: pilots lose practice, and when the system fails they must take over at the hardest moment. It states that automation has made air travel safer than ever and says nothing about pilots disliking it.',
      },
      {
        k: 'inference', q: 'It can be inferred that some airlines require pilots to fly parts of routine flights by hand in order to:',
        a: 'keep their manual flying skills in practice',
        x: ['reduce the amount of fuel the aircraft burns', 'test whether the computers are faulty', 'give passengers a smoother journey'],
        e: 'The problem described is that pilots "get fewer chances to practise manual skills"; the word "therefore" links the hand-flying rule directly to that problem.',
      },
      {
        k: 'inference', q: 'The sentence "The more reliable the system, the rarer and harder these moments become" implies that:',
        a: 'better automation can make its failures harder to handle',
        x: ['reliable systems never fail at all', 'failures become more frequent as systems improve', 'pilots prefer to fly unreliable systems'],
        e: 'As automation improves, failures become rarer, so pilots get even less practice and each failure is harder to deal with. "Rarer" rules out "more frequent", and the sentence still assumes failures happen.',
      },
      {
        k: 'vocab', q: 'As used in the passage, the word "awkward" most nearly means:',
        a: 'troublesome',
        x: ['clumsy', 'shy', 'badly shaped'],
        e: 'An "awkward side effect" is an inconvenient, troublesome one. "Clumsy" and "shy" describe awkward people, and "badly shaped" describes objects; none fits a side effect.',
      },
    ],
  },
  {
    id: 'rc-reading-sources', d: 3, size: 2,
    text: "A historian reading an old chronicle must ask not only what it says but why it was written. A court poet praising a king's victory had every reason to exaggerate; a rebel's letter may paint the same ruler as a tyrant. Neither document is worthless, for each reveals how a particular group wished events to be remembered. The skilled historian therefore treats sources as witnesses rather than oracles: their testimony is weighed, compared with other evidence and set against the interests of those who produced it. Only then can a cautious picture of the past begin to emerge.",
    qs: [
      {
        k: 'tone', q: "The author mentions the court poet and the rebel's letter in order to:",
        a: "show that sources may be shaped by their writers' interests",
        x: ['prove that most kings in history were tyrants', 'argue that poems are more reliable than letters', 'suggest that old documents should be ignored'],
        e: "The two examples describe one ruler in opposite ways because each writer had reasons of their own: the poet to flatter, the rebel to condemn. This illustrates the opening point about asking why a source was written. Neither is called more reliable, and both are said to have value.",
      },
      {
        k: 'vocab', q: 'In the passage, to treat sources "as witnesses rather than oracles" means to:',
        a: 'question them rather than accept them without doubt',
        x: ['trust them completely because they are old', 'read only those written by eyewitnesses', 'replace them with modern opinions'],
        e: 'An oracle\'s word was taken as unquestionable, while a witness\'s testimony "is weighed, compared with other evidence" and checked against the witness\'s interests. The historian therefore questions sources instead of simply believing them.',
      },
      {
        k: 'inference', q: 'With which of the following statements would the author most likely agree?',
        a: 'Even a biased document can be useful to a historian.',
        x: ['Only neutral documents have historical value.', "A rebel's letter is more truthful than a poem.", 'The past can be known with complete certainty.'],
        e: 'The author says that "neither document is worthless", because even biased sources show how a group wished events to be remembered. The passage also speaks only of a "cautious picture" of the past.',
      },
      {
        k: 'tone', q: 'The tone of the passage is best described as:',
        a: 'measured and analytical',
        x: ['angry and accusatory', 'playful and mocking', 'sentimental and nostalgic'],
        e: 'The author calmly sets out a method for weighing evidence and ends with a "cautious picture". The passage contains no anger, mockery or longing for the past.',
      },
    ],
  },
];

export default defineBank('english', 'comprehension', (b) => [
  ...EASY.map((p) => toSet(b, p)),
  ...MEDIUM.map((p) => toSet(b, p)),
  ...HARD.map((p) => toSet(b, p)),
]);
