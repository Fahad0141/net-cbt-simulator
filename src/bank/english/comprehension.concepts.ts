/**
 * Reading comprehension, part B: short original passages (60-160 words) with a pool of
 * questions each. Every set draws `size` questions from its passage's pool (kept in
 * passage order), so repeated appearances of a passage ask different questions.
 *
 * All passages are original text written for this project. Local ids start with 'c-'.
 */
import { defineBank } from '@/engine/authoring';
import type { Difficulty } from '@/engine/types';

type Sub = 'main idea' | 'inference' | 'reference' | 'vocabulary in context' | 'tone and purpose';

interface PassageQuestion {
  /** Sub-topic of this question. */
  t: Sub;
  q: string;
  a: string;
  x: readonly [string, string, string];
  e: string;
}

interface Passage {
  id: string;
  d: Difficulty;
  past?: boolean;
  /** Questions delivered per appearance (1-3). */
  size: 1 | 2 | 3;
  title: string;
  text: string;
  qs: readonly PassageQuestion[];
}

const PASSAGES: readonly Passage[] = [
  // ------------------------------------------------------------------ culture / arts
  {
    id: 'c-truck-art',
    d: 1,
    past: true,
    size: 1,
    title: 'Painted Trucks',
    text: "Few sights on Pakistan's highways are as cheerful as a decorated truck. Owners spend months' wages covering their vehicles with painted birds, film stars, verses of poetry and mirror-work, and the most admired painters in the workshops of Karachi and Rawalpindi are booked weeks ahead. For the drivers, who may spend weeks away from home, the truck is less a machine than a travelling house, and its decoration announces the owner's pride, piety and sense of humour. Collectors abroad now pay high prices for painted panels, and the style appears on kettles, handbags and even aeroplanes. Yet the painters themselves remain poorly paid, and many fear that their sons will not follow them into the trade.",
    qs: [
      {
        t: 'main idea',
        q: 'The passage is mainly about:',
        a: 'what Pakistani truck art means and how widely its style has spread',
        x: [
          "the dangers of driving on Pakistan's highways",
          'the high wages earned by truck painters',
          'the history of mirror-work in Karachi',
        ],
        e: 'The passage explains what painted trucks mean to owners and drivers and how the style has spread to collectors abroad, kettles, handbags and aeroplanes. The painters are said to be poorly paid, so "high wages" contradicts the passage.',
      },
      {
        t: 'inference',
        q: 'It can be inferred that, for many drivers, a decorated truck:',
        a: 'is partly a home and a statement of identity',
        x: [
          'is mainly a way of attracting foreign collectors',
          'is painted by the drivers themselves',
          'is cheaper to maintain than a plain truck',
        ],
        e: 'The truck is "less a machine than a travelling house" and its decoration "announces the owner\'s pride, piety and sense of humour". The painting is done by hired painters in workshops, not by the drivers.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'announces' most nearly means:",
        a: 'makes known',
        x: ['hides', 'questions', 'exaggerates'],
        e: "The decoration 'announces' (makes known, displays) the owner's pride and piety; it does not hide, question or exaggerate them.",
      },
      {
        t: 'tone and purpose',
        q: "The author's attitude towards the truck painters is best described as:",
        a: 'sympathetic',
        x: ['contemptuous', 'indifferent', 'envious'],
        e: 'After showing how much the art is prized, the author ends with "Yet the painters themselves remain poorly paid" and their fear for the trade, drawing attention to their hardship: a sympathetic attitude.',
      },
    ],
  },
  {
    id: 'c-qawwali',
    d: 2,
    past: true,
    size: 2,
    title: 'Qawwali',
    text: 'Qawwali, the devotional music of the Sufi shrines of South Asia, was never meant to be a concert performance. Its singers repeat a single line of poetry again and again, each time with greater intensity, so that listeners may be carried towards a state of spiritual ecstasy. The clapping of the chorus and the steady beat of the tabla and dholak drive the music forward, while the lead singer improvises around the words. In the late twentieth century, Nusrat Fateh Ali Khan brought qawwali to audiences in Europe, America and Japan, many of whom did not understand a word of Urdu or Punjabi. That they were moved nonetheless suggests that the music speaks through rhythm and feeling as much as through language.',
    qs: [
      {
        t: 'main idea',
        q: 'The passage is primarily concerned with:',
        a: 'the nature of qawwali and its appeal beyond its first setting',
        x: [
          'the life story of Nusrat Fateh Ali Khan',
          'the grammar of Urdu and Punjabi poetry',
          'the architecture of Sufi shrines',
        ],
        e: 'The passage explains how qawwali works (repetition, rhythm, improvisation) and why it moved foreign audiences. Nusrat Fateh Ali Khan is mentioned only as the singer who took it abroad.',
      },
      {
        t: 'inference',
        q: 'Which of the following can be inferred from the passage?',
        a: "Qawwali's emotional power does not depend only on its words.",
        x: [
          'Qawwali was first composed for concert halls.',
          'Foreign listeners learnt Urdu before attending.',
          'The lead singer must never vary the poetry.',
        ],
        e: 'Listeners who "did not understand a word" were still moved, so the music speaks "through rhythm and feeling". It was "never meant to be a concert performance", and the lead singer "improvises around the words".',
      },
      {
        t: 'reference',
        q: "In the phrase 'many of whom did not understand a word of Urdu or Punjabi', the word 'whom' refers to:",
        a: 'audiences in Europe, America and Japan',
        x: ['the singers of the chorus', 'the Sufi saints of the shrines', 'the tabla and dholak players'],
        e: '"Whom" follows "audiences in Europe, America and Japan": it was these foreign listeners who did not understand the language.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'ecstasy' most nearly means:",
        a: 'overwhelming joy',
        x: ['deep sleep', 'mild boredom', 'physical pain'],
        e: 'Spiritual ecstasy is a state of overwhelming joy or rapture, the goal of the rising intensity of the music.',
      },
      {
        t: 'tone and purpose',
        q: "The author's attitude towards qawwali is best described as:",
        a: 'appreciative',
        x: ['dismissive', 'suspicious', 'mocking'],
        e: 'The author describes the music with respect and admires its power to move even listeners who do not know the language: an appreciative tone.',
      },
    ],
  },
  {
    id: 'c-ajrak',
    d: 1,
    size: 1,
    title: 'The Ajrak',
    text: 'For centuries, the ajrak has been the pride of Sindh. This block-printed cloth, usually patterned in deep crimson and indigo, is made through a long process: the cotton is washed, printed with carved wooden blocks, dyed and rinsed many times, and the work can take two or three weeks. Traditionally the colours came from plants and minerals. Today the ajrak is worn as a shawl, a turban or a scarf, and presenting one to a guest is a gesture of honour. Cheap machine-printed copies have flooded the markets, but many buyers still seek out the hand-made cloth, valuing the skill and patience behind every piece.',
    qs: [
      {
        t: 'main idea',
        q: 'The passage is mainly about:',
        a: 'a traditional cloth of Sindh and how it is made and valued',
        x: [
          'the history of machine printing in Pakistan',
          'the cultivation of cotton in Sindh',
          'the correct way to tie a turban',
        ],
        e: 'The passage describes the ajrak: its colours, how it is printed and dyed, how it is worn and why buyers still value the hand-made cloth.',
      },
      {
        t: 'inference',
        q: 'The passage suggests that buyers who prefer hand-made ajrak:',
        a: 'appreciate the craftsmanship it requires',
        x: [
          'cannot tell it apart from machine copies',
          'want the cheapest cloth available',
          'dislike the colours crimson and indigo',
        ],
        e: 'They value "the skill and patience behind every piece", that is, the craftsmanship. The cheap option is the machine-printed copy, which they avoid.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'flooded' most nearly means:",
        a: 'filled in large numbers',
        x: ['covered with water', 'damaged badly', 'emptied quickly'],
        e: "Copies have 'flooded' the markets: they have arrived in such large numbers that they fill them. The literal sense (covered with water) does not fit.",
      },
      {
        t: 'reference',
        q: "In the phrase 'presenting one to a guest', the word 'one' refers to:",
        a: 'an ajrak',
        x: ['a wooden block', 'a market stall', 'a plant dye'],
        e: 'The sentence is about how the ajrak is used; presenting an ajrak to a guest is a gesture of honour.',
      },
    ],
  },
  {
    id: 'c-mohenjo-daro',
    d: 1,
    past: true,
    size: 1,
    title: 'A Planned City',
    text: 'More than four thousand years ago, the people of Mohenjo-daro, on the banks of the Indus, built one of the best-planned cities of the ancient world. Its streets were laid out in a regular grid, and its houses were made of baked bricks of standard sizes. Most homes had a bathing area, and covered drains carried waste water away along the streets. Strangely, archaeologists have found no grand palaces or royal tombs, which has led some to suggest that the city was governed by a council of merchants or elders rather than by a powerful king. Its script, found on hundreds of small seals, has still not been deciphered.',
    qs: [
      {
        t: 'main idea',
        q: 'The passage mainly describes:',
        a: 'the planning and mysteries of an ancient city',
        x: [
          'the life of a powerful Indus king',
          'the excavation of royal tombs',
          'how the Indus script was finally read',
        ],
        e: 'The passage describes the city\'s grid, bricks and drains, then two puzzles: the missing palaces and the unread script. No king or tomb has been found, and the script "has still not been deciphered".',
      },
      {
        t: 'inference',
        q: 'The absence of palaces and royal tombs has led some archaeologists to suggest that:',
        a: 'the city may not have been ruled by a king',
        x: [
          'the city was abandoned before completion',
          'the people had no form of government',
          'the palaces were built of unbaked mud',
        ],
        e: 'They suggest the city "was governed by a council of merchants or elders rather than by a powerful king". It still had a government, just not, perhaps, a monarch.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'deciphered' most nearly means:",
        a: 'interpreted',
        x: ['discovered', 'written', 'destroyed'],
        e: "To decipher a script is to work out what it means. The script has already been discovered (on hundreds of seals); it has not been 'deciphered', i.e. interpreted.",
      },
      {
        t: 'reference',
        q: "In the sentence 'Its script, found on hundreds of small seals, has still not been deciphered', the word 'Its' refers to:",
        a: 'Mohenjo-daro',
        x: ['the council of elders', 'the river Indus', 'the royal tomb'],
        e: 'The whole passage is about the city of Mohenjo-daro; "its script" is the writing used by the city\'s people.',
      },
    ],
  },
  {
    id: 'c-mughal-garden',
    d: 3,
    size: 2,
    title: 'The Mughal Garden',
    text: 'The Mughal garden was never simply a place to grow flowers. Laid out as a charbagh, a square divided into four parts by channels of flowing water, it was designed as an earthly image of paradise, which Persian and Islamic poetry had long imagined as a garden. At the Shalimar Gardens in Lahore, built for Shah Jahan, terraces descend in stages, and hundreds of fountains once cooled the summer air. Order was everything: paths, pools and trees mirrored one another across the central axis. Visitors who picnic there today may see only a pleasant park, but its builders intended a statement about harmony, power and the divine.',
    qs: [
      {
        t: 'main idea',
        q: "The author's main purpose is to:",
        a: 'show that the Mughal garden carried meanings beyond beauty',
        x: [
          'give directions to the Shalimar Gardens',
          'compare Persian poetry with English poetry',
          'criticise visitors who picnic in parks',
        ],
        e: 'The first sentence ("never simply a place to grow flowers") and the last ("a statement about harmony, power and the divine") frame the purpose: the garden had symbolic meaning.',
      },
      {
        t: 'inference',
        q: 'The final sentence implies that many modern visitors:',
        a: 'may miss the symbolism the builders intended',
        x: [
          'are forbidden to picnic in the gardens',
          'understand the gardens better than the builders',
          'dislike the strict order of the paths and pools',
        ],
        e: 'Visitors "may see only a pleasant park", whereas the builders intended a statement about harmony, power and the divine; so the deeper meaning may be lost on them. Picnicking is clearly allowed.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'mirrored' most nearly means:",
        a: 'matched',
        x: ['outshone', 'competed with', 'concealed'],
        e: "Paths, pools and trees 'mirrored one another across the central axis': each side matched the other symmetrically, which is why 'order was everything'.",
      },
      {
        t: 'tone and purpose',
        q: "The author's attitude towards the Mughal garden is best described as:",
        a: 'respectful and informative',
        x: ['critical and dismissive', 'playful and mocking', 'anxious and fearful'],
        e: 'The author explains the design and its meaning with evident respect; nothing in the passage criticises or mocks the gardens.',
      },
      {
        t: 'reference',
        q: "In the phrase 'which Persian and Islamic poetry had long imagined as a garden', the word 'which' refers to:",
        a: 'paradise',
        x: ['the charbagh', 'the flowing water', 'the square'],
        e: 'It is paradise that poetry had imagined as a garden; the charbagh was built as an earthly image of that paradise. Saying the charbagh was "imagined as a garden" would be circular.',
      },
    ],
  },
  // ------------------------------------------------------------------ economics
  {
    id: 'c-inflation',
    d: 2,
    past: true,
    size: 1,
    title: 'The Hidden Tax',
    text: 'When prices rise steadily, money quietly loses its strength. A family that kept fifty thousand rupees under a mattress five years ago can buy noticeably less with it today, even though the number on the notes has not changed. Economists call this the erosion of purchasing power. It hurts most those who live on fixed incomes, such as pensioners, and those who hold their savings in cash. Borrowers, by contrast, may gain, because the money they repay is worth less than the money they borrowed. This is one reason central banks raise interest rates when inflation climbs: higher rates reward saving and make borrowing more expensive.',
    qs: [
      {
        t: 'main idea',
        q: 'The passage is chiefly concerned with:',
        a: 'how inflation reduces the value of money and affects people differently',
        x: [
          'why families should keep their savings at home',
          'how central banks print new currency notes',
          'why pensioners prefer to borrow money',
        ],
        e: 'The passage explains the erosion of purchasing power and who loses (pensioners, cash savers) and who may gain (borrowers). Keeping cash at home is given as an example of what loses value.',
      },
      {
        t: 'inference',
        q: 'It can be inferred that a person who borrowed a fixed sum just before prices rose sharply would most likely:',
        a: 'gain, as the money repaid is worth less',
        x: [
          'lose, as the loan grows with prices',
          'be unaffected, as loans ignore inflation',
          'be fined by the central bank',
        ],
        e: 'The passage states that borrowers "may gain, because the money they repay is worth less than the money they borrowed". A loan of a fixed sum does not grow with prices.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'erosion' most nearly means:",
        a: 'gradual reduction',
        x: ['sudden increase', 'careful measurement', 'official approval'],
        e: "Money 'quietly loses its strength' over years: erosion here is a slow, gradual reduction of purchasing power.",
      },
      {
        t: 'tone and purpose',
        q: 'The final sentence of the passage serves mainly to:',
        a: 'explain why central banks raise interest rates during inflation',
        x: [
          'show that inflation benefits pensioners',
          'argue that saving money is pointless',
          'describe how prices are measured',
        ],
        e: 'It begins "This is one reason central banks raise interest rates..." and gives the reason: higher rates reward saving and discourage borrowing.',
      },
    ],
  },
  {
    id: 'c-microfinance',
    d: 3,
    size: 2,
    title: 'Small Loans, Big Hopes',
    text: 'Microfinance was once hailed as a cure for poverty. By lending small sums to people too poor to offer collateral, often women running household businesses, banks could, its champions argued, unlock enterprise that had always been there. The early results seemed to bear this out: repayment rates were remarkably high. Later studies, however, painted a more modest picture. Small loans helped many families smooth out irregular incomes and cope with emergencies, but relatively few borrowers built businesses large enough to lift them out of poverty. Some, burdened by several loans at once, fell deeper into debt. None of this means that microfinance has failed; it means that a useful tool was mistaken for a complete solution.',
    qs: [
      {
        t: 'main idea',
        q: 'Which statement best expresses the central claim of the passage?',
        a: 'Microfinance helps but was wrongly seen as a complete answer to poverty.',
        x: [
          'Microfinance has failed and should be abandoned.',
          'High repayment rates prove that microfinance ends poverty.',
          'Banks should stop lending money to women.',
        ],
        e: 'The last sentence states the claim: microfinance has not failed, but "a useful tool was mistaken for a complete solution".',
      },
      {
        t: 'tone and purpose',
        q: "The author's tone towards microfinance is best described as:",
        a: 'balanced and measured',
        x: ['wholeheartedly enthusiastic', 'bitterly hostile', 'entirely indifferent'],
        e: 'The author acknowledges real benefits (smoothing incomes, coping with emergencies) and real limits (few escape poverty, some fall into debt): a balanced, measured view.',
      },
      {
        t: 'inference',
        q: 'The author implies that the high early repayment rates:',
        a: 'did not by themselves show that borrowers were escaping poverty',
        x: [
          'were the result of dishonest record-keeping',
          'proved that most borrowers built large businesses',
          'showed that collateral should always be required',
        ],
        e: 'The early results only "seemed" to confirm the hopes; later studies found that few borrowers escaped poverty. So repayment alone was not proof of success. Nothing suggests dishonesty.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the phrase 'smooth out' most nearly means:",
        a: 'make more even',
        x: ['increase sharply', 'hide from others', 'spend quickly'],
        e: "Loans helped families 'smooth out irregular incomes', i.e. make an uneven flow of money more even over time.",
      },
      {
        t: 'vocabulary in context',
        q: "In the first sentence, the word 'hailed' most nearly means:",
        a: 'acclaimed',
        x: ['summoned', 'doubted', 'ignored'],
        e: "Microfinance was 'hailed as a cure': praised enthusiastically, i.e. acclaimed. 'Summoned' is a different sense of hail (to hail a taxi) that does not fit here.",
      },
    ],
  },
  {
    id: 'c-remittances',
    d: 2,
    size: 2,
    title: 'Money from Abroad',
    text: "Every month, Pakistani workers in the Gulf, Europe and North America send home a portion of their earnings. These remittances have become one of the country's largest sources of foreign exchange, at times rivalling the value of its exports. For the families who receive them, the money pays for school fees, medical bills and new homes, and it often keeps households afloat when crops fail or prices rise. For the nation, it helps pay for imports and supports the value of the rupee. Yet economists warn against depending on it too heavily. Remittances rise and fall with conditions abroad, and a country that exports its workers rather than its goods may neglect the industries that could employ them at home.",
    qs: [
      {
        t: 'main idea',
        q: 'The passage is mainly concerned with:',
        a: 'the benefits of remittances and the risks of relying on them',
        x: [
          'the working conditions of labourers in the Gulf',
          'the reasons why crops fail in Pakistan',
          'how the value of the rupee is calculated',
        ],
        e: 'The passage first lists what remittances do for families and the nation, then gives the economists\' warning against depending on them too heavily.',
      },
      {
        t: 'reference',
        q: "In the phrase 'Yet economists warn against depending on it too heavily', the word 'it' refers to:",
        a: 'money sent home by workers abroad',
        x: ['the value of the rupee', "the country's exports", 'the cost of imports'],
        e: 'The paragraph is about remittances ("the money"), and the next sentence explains the risk: "Remittances rise and fall with conditions abroad".',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the phrase 'keeps households afloat' most nearly means:",
        a: 'helps families survive financially',
        x: ['protects homes from floods', 'makes families very wealthy', 'lets households travel abroad'],
        e: 'When crops fail or prices rise, the money lets families get by: it keeps them financially afloat. The phrase is figurative, not about water.',
      },
      {
        t: 'inference',
        q: 'The economists mentioned in the passage would most probably favour:',
        a: 'developing industries that create jobs within Pakistan',
        x: [
          'sending even more workers abroad',
          'banning remittances from the Gulf',
          'reducing exports of manufactured goods',
        ],
        e: 'They warn that exporting workers rather than goods "may neglect the industries that could employ them at home", so they would favour building those industries.',
      },
    ],
  },
  {
    id: 'c-solar-boom',
    d: 1,
    size: 1,
    title: 'Power from the Rooftops',
    text: 'In the past few years, solar panels have spread across the rooftops of Pakistan with astonishing speed. The main reason is simple arithmetic. As electricity tariffs climbed and imported panels became cheaper, many households and businesses found that a rooftop system could pay for itself within a few years. Farmers, too, have replaced diesel water pumps with solar ones, freeing themselves from the rising cost of fuel. The boom has created a problem for the national grid, however. When customers generate their own power, they buy less from the grid, leaving fewer people to share the cost of the power stations and transmission lines that the country has already paid for.',
    qs: [
      {
        t: 'main idea',
        q: 'The passage is mainly about:',
        a: 'the rapid spread of solar power and a problem it creates',
        x: [
          'the manufacture of solar panels in Pakistan',
          'why diesel pumps suit farmers better',
          'how transmission lines are built',
        ],
        e: 'The passage explains why solar panels spread so fast (rising tariffs, cheaper panels) and then the difficulty this causes for the national grid.',
      },
      {
        t: 'vocabulary in context',
        q: "In the passage, a rooftop system that can 'pay for itself' is one that:",
        a: 'saves as much money as it cost',
        x: [
          'is given away free by the government',
          'is paid for by the national grid',
          'earns money by selling diesel',
        ],
        e: 'To pay for itself, the system must save (in electricity bills) at least as much as it cost to buy, here "within a few years".',
      },
      {
        t: 'inference',
        q: 'It can be inferred that, as more customers install solar panels, those who remain on the grid may:',
        a: 'face higher electricity costs',
        x: ['receive free electricity', 'be forced to buy diesel pumps', 'pay less for transmission lines'],
        e: 'The fixed cost of power stations and lines is shared among "fewer people", so each remaining customer is likely to pay more.',
      },
      {
        t: 'reference',
        q: "In the phrase 'freeing themselves from the rising cost of fuel', the word 'themselves' refers to:",
        a: 'farmers',
        x: ['households', 'solar panels', 'power stations'],
        e: 'The sentence begins "Farmers, too, have replaced diesel water pumps...": it is the farmers who free themselves from fuel costs.',
      },
    ],
  },
  // ------------------------------------------------------------------ environment
  {
    id: 'c-mangroves',
    d: 2,
    size: 2,
    title: 'Forests of the Delta',
    text: 'Along the coast of Sindh, the mangrove forests of the Indus delta do quiet but valuable work. Their tangled roots trap silt, slow the force of storm waves and shelter the young of many fish and shrimp on which coastal villages depend. For decades these forests shrank, as dams upstream reduced the flow of fresh water and people cut the trees for fuel and fodder. Recently, however, the trend has reversed. Large planting drives, many carried out by local communities, have restored thousands of hectares. Scientists caution that planting alone is not enough: unless enough river water reaches the delta, the young trees will struggle in the increasingly salty soil.',
    qs: [
      {
        t: 'main idea',
        q: 'Which of the following best states the main idea of the passage?',
        a: 'Delta mangroves are valuable and recovering, but depend on river water.',
        x: [
          'Dams on the Indus were built to protect the mangroves.',
          'Mangroves are useful chiefly as a source of fuel.',
          'Planting drives have permanently saved the mangroves.',
        ],
        e: 'The passage moves from the value of mangroves, to their decline, to their recovery, and ends with the warning that recovery needs fresh water. Dams caused the decline, and scientists say planting alone is not enough.',
      },
      {
        t: 'inference',
        q: 'The scientists mentioned in the passage would most likely support:',
        a: 'releasing more fresh water down to the delta',
        x: ['stopping all planting drives at once', 'building more dams upstream', 'cutting old trees to make room for new'],
        e: 'They warn that "unless enough river water reaches the delta" the young trees will struggle, so they would favour more fresh water flowing downstream.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'caution' most nearly means:",
        a: 'warn',
        x: ['celebrate', 'deny', 'promise'],
        e: "The scientists 'caution' that planting alone is not enough: they warn of a danger.",
      },
      {
        t: 'reference',
        q: "In the sentence 'Their tangled roots trap silt...', the word 'Their' refers to:",
        a: 'the mangrove forests',
        x: ['the coastal villages', 'the fish and shrimp', 'the storm waves'],
        e: 'The previous sentence is about "the mangrove forests of the Indus delta"; it is their roots that trap silt.',
      },
      {
        t: 'tone and purpose',
        q: 'The author mentions dams and the cutting of trees in order to:',
        a: 'explain why the forests had been shrinking',
        x: ['argue that all dams should be demolished', 'praise the work of local communities', 'describe how mangrove roots work'],
        e: 'The sentence reads "For decades these forests shrank, as dams... and people cut the trees": these are given as the causes of the decline.',
      },
    ],
  },
  {
    id: 'c-glaciers',
    d: 2,
    size: 1,
    title: 'Frozen Reservoirs',
    text: 'Pakistan holds more glacial ice than almost any other country outside the polar regions. Its glaciers in the Karakoram, Himalaya and Hindu Kush act as frozen reservoirs, releasing meltwater that feeds the Indus through the hot summer months. As temperatures rise, many of them are thinning, and lakes form behind unstable walls of ice and loose rock. When such a wall gives way, a flood can sweep down a valley within minutes, destroying bridges, fields and homes. Early-warning systems, in which sensors and village volunteers alert people downstream, have already saved lives. In the long run, though, the safety of these valleys depends on slowing the warming that is melting the ice.',
    qs: [
      {
        t: 'main idea',
        q: 'The passage is mainly about:',
        a: "the value of Pakistan's glaciers and the dangers of their melting",
        x: [
          'the construction of bridges in mountain valleys',
          'the climate of the polar regions',
          'how village volunteers are trained',
        ],
        e: 'The passage explains that glaciers store water for the Indus and that their thinning creates dangerous lake floods, which early warnings can only partly address.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the phrase 'gives way' most nearly means:",
        a: 'collapses',
        x: ['yields to traffic', 'grows stronger', 'freezes solid'],
        e: "An unstable wall of ice and rock that 'gives way' breaks and collapses, releasing the lake. 'Yield to traffic' is a different use of the phrase.",
      },
      {
        t: 'inference',
        q: 'The author suggests that early-warning systems:',
        a: 'reduce harm but do not remove the underlying cause',
        x: [
          'have stopped the glaciers from melting',
          'are unnecessary in mountain valleys',
          'make bridges and fields flood-proof',
        ],
        e: 'They "have already saved lives", but "in the long run" safety depends on slowing the warming, so warnings limit the damage without removing its cause.',
      },
      {
        t: 'reference',
        q: "In the phrase 'many of them are thinning', the word 'them' refers to:",
        a: "Pakistan's glaciers",
        x: ['the polar regions', 'the summer months', 'the people downstream'],
        e: 'The previous sentence is about the glaciers of the Karakoram, Himalaya and Hindu Kush; it is these glaciers that are thinning as temperatures rise.',
      },
    ],
  },
  {
    id: 'c-plastic-bags',
    d: 2,
    size: 3,
    title: 'After the Ban',
    text: 'When a city bans thin plastic shopping bags, the results are often less tidy than its officials hope. Shoppers switch to paper bags, which require more energy and water to produce, or to heavier reusable bags that make environmental sense only if each one is used dozens of times. Some households, deprived of free bags in which to throw rubbish, start buying plastic bin liners instead. None of this means that bans are pointless: discarded thin bags block drains, choke animals and litter the landscape for decades. It does mean that a good policy must think about what people will do next, not merely about what they will stop doing.',
    qs: [
      {
        t: 'main idea',
        q: 'The central point of the passage is that:',
        a: "environmental policies must consider how people's behaviour will change",
        x: [
          'plastic bag bans should be abolished at once',
          'paper bags do no harm to the environment',
          'reusable bags are always better than plastic ones',
        ],
        e: 'The last sentence states the point: a good policy must think about "what people will do next". The author explicitly says bans are not pointless.',
      },
      {
        t: 'inference',
        q: 'It can be inferred that a reusable bag that is used only two or three times:',
        a: 'may do more environmental harm than good',
        x: [
          'is the best possible environmental choice',
          'uses less energy than a thin plastic bag',
          'will block drains and choke animals',
        ],
        e: 'Heavier reusable bags "make environmental sense only if each one is used dozens of times"; used only a few times, their extra production cost is not repaid.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the phrase 'deprived of' most nearly means:",
        a: 'left without',
        x: ['provided with', 'warned about', 'angered by'],
        e: "After the ban, households no longer get free bags: they are 'deprived of', i.e. left without, them.",
      },
      {
        t: 'tone and purpose',
        q: "The sentence beginning 'None of this means that bans are pointless' serves to:",
        a: 'acknowledge that bans still have real benefits',
        x: [
          'reject the idea of banning plastic bags',
          'introduce a new kind of shopping bag',
          'summarise the costs of paper bags',
        ],
        e: 'After listing the side effects of bans, the author concedes their value: thin bags block drains, choke animals and litter the landscape.',
      },
      {
        t: 'reference',
        q: "In the phrase 'free bags in which to throw rubbish', the word 'which' refers to:",
        a: 'free bags',
        x: ['households', 'paper bags', 'city officials'],
        e: '"Which" follows "free bags": households have lost the free bags they used to put their rubbish in, so they buy bin liners instead.',
      },
    ],
  },
  // ------------------------------------------------------------------ health
  {
    id: 'c-teen-sleep',
    d: 1,
    size: 1,
    title: 'Sleepy Teenagers',
    text: 'Teenagers are often accused of laziness when they struggle to wake up for school, but biology tells a different story. During adolescence, the body releases melatonin, the hormone that brings on sleepiness, later in the evening than it does in childhood. As a result, many teenagers cannot easily fall asleep before eleven o\'clock, yet they still need eight to ten hours of rest. When school begins early, the shortfall builds up through the week. Tired students find it harder to concentrate, remember lessons and control their moods. Some schools that have moved their starting time later report better attendance and fewer students dozing in class.',
    qs: [
      {
        t: 'main idea',
        q: 'The main point of the passage is that:',
        a: 'teenagers fall asleep late for biological reasons, and early school starts harm their learning',
        x: [
          'teenagers are lazier than younger children',
          'melatonin keeps teenagers awake at night',
          'schools should shorten their lessons',
        ],
        e: 'The passage replaces the charge of laziness with a biological explanation (later melatonin release) and shows how early school starts, by cutting sleep, harm concentration and memory. Melatonin brings on sleep; it does not keep anyone awake.',
      },
      {
        t: 'tone and purpose',
        q: 'The author mentions schools that start later in order to:',
        a: 'give evidence that a later start may help students',
        x: [
          'criticise teachers for being too strict',
          'show that melatonin levels can be changed',
          'prove that teenagers need less sleep',
        ],
        e: 'Those schools "report better attendance and fewer students dozing in class", which supports the idea that a later start helps.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'shortfall' most nearly means:",
        a: 'deficit',
        x: ['surplus', 'timetable', 'accident'],
        e: "Teenagers get less sleep than they need; this 'shortfall' (deficit) builds up through the week. A surplus is the opposite.",
      },
      {
        t: 'inference',
        q: 'It can be inferred that the author regards the charge of laziness against teenagers as:',
        a: 'largely unfair',
        x: ['fully justified', 'a medical diagnosis', 'a recent invention'],
        e: '"Biology tells a different story": the author believes the real cause is the body clock, so blaming laziness is largely unfair.',
      },
    ],
  },
  {
    id: 'c-antibiotics',
    d: 2,
    past: true,
    size: 3,
    title: 'A Wasting Inheritance',
    text: 'Antibiotics are among the great triumphs of modern medicine, but they are being spent like an inheritance that will never run out. Every time these drugs are used, the few bacteria that happen to survive pass on their resistance to the next generation. Misuse speeds up the process. Patients demand antibiotics for colds and flu, which are caused by viruses and are untouched by such drugs; others share leftover tablets with relatives; and in many countries the drugs can be bought without a prescription. The result is a growing number of infections that no longer respond to treatment. Unless doctors, patients and governments change their habits, routine operations could one day become dangerous again.',
    qs: [
      {
        t: 'main idea',
        q: 'The main purpose of the passage is to:',
        a: 'warn that misuse of antibiotics is making them less effective',
        x: [
          'explain how viruses cause colds and flu',
          'argue that antibiotics should be banned',
          'describe the discovery of the first antibiotic',
        ],
        e: 'The passage explains how resistance develops, lists forms of misuse, and warns of the consequences unless habits change.',
      },
      {
        t: 'inference',
        q: 'By comparing antibiotics to an inheritance, the author suggests that they are:',
        a: 'a valuable resource that can be used up',
        x: [
          'a gift that grows larger with use',
          'a burden passed from parents to children',
          'a cause of quarrels between relatives',
        ],
        e: 'They are spent "like an inheritance that will never run out": people treat them as endless, but, like an inheritance, they can be exhausted.',
      },
      {
        t: 'reference',
        q: "In the phrase 'pass on their resistance to the next generation', the word 'their' refers to:",
        a: 'the bacteria that survive',
        x: ['the patients', 'the doctors', 'the antibiotics'],
        e: 'The subject of the clause is "the few bacteria that happen to survive": it is these bacteria that pass their resistance on to their offspring.',
      },
      {
        t: 'tone and purpose',
        q: 'Why does the author point out that colds and flu are caused by viruses?',
        a: 'To show that taking antibiotics for them is useless',
        x: [
          'To prove that viruses are deadlier than bacteria',
          'To recommend a new antiviral medicine',
          'To explain how resistance is inherited',
        ],
        e: 'Viral illnesses "are untouched by such drugs", so demanding antibiotics for them is a clear example of misuse.',
      },
      {
        t: 'inference',
        q: 'The author implies that routine operations could become dangerous again because:',
        a: 'infections after surgery might no longer be treatable',
        x: [
          'surgeons would refuse to operate',
          'patients would demand more antibiotics',
          'antibiotics damage surgical instruments',
        ],
        e: 'The danger follows from "infections that no longer respond to treatment": an infection picked up during surgery might not be curable.',
      },
    ],
  },
  {
    id: 'c-semmelweis',
    d: 2,
    past: true,
    size: 1,
    title: 'Clean Hands',
    text: 'In the 1840s, a young doctor named Ignaz Semmelweis noticed something disturbing in the maternity wards of a Vienna hospital. Far more mothers died of fever in the ward run by doctors than in the one run by midwives. The doctors, he realised, often came straight from examining dead bodies. When he made them wash their hands in a chlorine solution, the death rate fell sharply. Yet many senior physicians rejected his conclusion. The germ theory of disease had not yet been accepted, and the idea that a gentleman\'s hands could carry disease struck them as insulting. Only years after his death was Semmelweis recognised as a pioneer.',
    qs: [
      {
        t: 'main idea',
        q: 'The passage is mainly about:',
        a: 'a doctor whose life-saving discovery was at first rejected',
        x: [
          'the training of midwives in Vienna',
          'the first sighting of germs under a microscope',
          'diseases that were common among senior physicians',
        ],
        e: 'The passage tells how Semmelweis found that hand-washing cut deaths, how senior physicians rejected the idea, and how he was recognised only after his death.',
      },
      {
        t: 'inference',
        q: "It can be inferred that many senior physicians rejected Semmelweis's conclusion partly because of:",
        a: 'professional pride',
        x: ['a shortage of chlorine', 'the failure of his method', 'complaints from the midwives'],
        e: 'They found the idea that "a gentleman\'s hands could carry disease" insulting: their pride was hurt. His method worked, as the death rate "fell sharply".',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'pioneer' most nearly means:",
        a: 'one of the first to develop a new idea',
        x: ['an early settler of new land', 'a doctor who refuses advice', 'a soldier in the front line'],
        e: 'Semmelweis was recognised as a pioneer of hygiene: one of the first to show that clean hands save lives. The "settler" sense of the word does not fit.',
      },
      {
        t: 'tone and purpose',
        q: "The author mentions that the doctors 'came straight from examining dead bodies' in order to:",
        a: 'suggest how the fever was being spread',
        x: [
          "criticise the midwives' methods",
          'explain why the hospital lacked staff',
          'show that the doctors worked too slowly',
        ],
        e: 'This detail explains the difference between the wards: doctors carried something from the bodies to the mothers, which hand-washing removed.',
      },
    ],
  },
  {
    id: 'c-handwritten-notes',
    d: 3,
    size: 2,
    title: 'The Slow Hand',
    text: 'Students who take notes on laptops can record a lecture almost word for word, which sounds like an advantage. Yet some studies suggest that those who write by hand understand the material better. The explanation lies in the very slowness of handwriting. Unable to copy everything, the hand-writer must listen, decide what matters and put it into fewer words, and this effort of selection is itself a form of learning. The typist, by contrast, can transcribe without thinking. The lesson is not that keyboards are harmful, but that understanding comes from processing information, not merely from collecting it.',
    qs: [
      {
        t: 'main idea',
        q: 'Which of the following best expresses the main idea of the passage?',
        a: 'Learning depends on processing information, not just recording it.',
        x: [
          'Laptops should be banned from all lecture halls.',
          'Handwriting is faster than typing for most students.',
          'Word-for-word notes guarantee good understanding.',
        ],
        e: 'The final sentence gives the lesson: "understanding comes from processing information, not merely from collecting it". The author says keyboards are not harmful in themselves.',
      },
      {
        t: 'inference',
        q: 'The author would most likely agree that a student who types notes could learn more by:',
        a: 'summarising the lecture in his or her own words',
        x: [
          'typing even faster to capture every word',
          'recording the lecture on a phone instead',
          "copying a classmate's handwritten notes",
        ],
        e: 'The benefit comes from the "effort of selection": deciding what matters and putting it into fewer words. Summarising forces that effort; recording or copying avoids it.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'transcribe' most nearly means:",
        a: 'copy down',
        x: ['translate', 'summarise', 'memorise'],
        e: "The typist can 'transcribe without thinking', i.e. copy the words down exactly. Summarising is what the hand-writer is forced to do instead.",
      },
      {
        t: 'tone and purpose',
        q: "The phrase 'which sounds like an advantage' in the first sentence prepares the reader for:",
        a: 'a claim that the apparent advantage is misleading',
        x: [
          'a list of further benefits of laptops',
          'a technical account of how laptops work',
          'a story about one particular student',
        ],
        e: '"Sounds like" signals that appearances deceive; the next sentence ("Yet...") reveals that hand-writers understand the material better.',
      },
      {
        t: 'tone and purpose',
        q: 'The tone of the passage is best described as:',
        a: 'reasoned and explanatory',
        x: ['angry and accusatory', 'nostalgic and sentimental', 'humorous and mocking'],
        e: 'The author presents evidence, explains its cause and draws a careful conclusion ("The lesson is not that keyboards are harmful...").',
      },
    ],
  },
  // ------------------------------------------------------------------ biography
  {
    id: 'c-ibn-sina',
    d: 1,
    size: 2,
    title: 'Ibn Sina',
    text: 'Ibn Sina, known in Europe as Avicenna, was born near Bukhara in about 980. A restless and gifted student, he claimed to have mastered most of the sciences of his day before he was twenty, and as a young man he cured a local ruler, who rewarded him with the use of a royal library. His later life was unsettled: political upheavals forced him to move from court to court, and he often wrote at night after a day of official duties. Even so, he produced a great many works. His Canon of Medicine, which organised the medical knowledge of Greek and Islamic physicians, was taught in European universities for centuries.',
    qs: [
      {
        t: 'main idea',
        q: 'Which title best suits the passage?',
        a: 'A Scholar Who Flourished in Unsettled Times',
        x: [
          'The Royal Library of Bukhara',
          'How European Universities Taught Medicine',
          'The Political History of Central Asia',
        ],
        e: 'The passage traces Ibn Sina\'s life: early brilliance, an unsettled career, yet "a great many works" and a lasting influence. The other titles name minor details.',
      },
      {
        t: 'inference',
        q: "The passage suggests that Ibn Sina's Canon of Medicine:",
        a: 'had a lasting influence beyond the Islamic world',
        x: [
          'was ignored by European scholars',
          'dealt mainly with politics',
          'contained only his own new discoveries',
        ],
        e: 'It "was taught in European universities for centuries". It organised the knowledge of Greek and Islamic physicians, so it was not only his own discoveries.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'upheavals' most nearly means:",
        a: 'violent disturbances',
        x: ['public celebrations', 'peace treaties', 'trade fairs'],
        e: "'Political upheavals forced him to move from court to court': upheavals are violent disturbances or sudden changes.",
      },
      {
        t: 'reference',
        q: "In the phrase 'who rewarded him with the use of a royal library', the word 'who' refers to:",
        a: 'a local ruler',
        x: ['Ibn Sina', 'a Greek physician', 'a European professor'],
        e: 'Ibn Sina "cured a local ruler, who rewarded him": the ruler gave the reward; "him" is Ibn Sina.',
      },
    ],
  },
  {
    id: 'c-sadequain',
    d: 1,
    size: 2,
    title: 'Sadequain',
    text: "Sadequain, one of Pakistan's most celebrated painters, was born in Amroha in 1930 and settled in Karachi after Partition. He worked on an enormous scale, covering the walls and ceilings of public buildings with murals that showed human beings struggling, labouring and reaching for knowledge. He also turned calligraphy into a bold modern art form, stretching and twisting letters until verses of poetry seemed to move across the canvas. Remarkably, he cared little for money. He often gave his paintings away, saying that art should belong to the people rather than to a few wealthy collectors, and he would work for months on a mural for no fee at all.",
    qs: [
      {
        t: 'main idea',
        q: 'Which of the following is the best title for the passage?',
        a: 'An Artist of Grand Vision and Generous Spirit',
        x: ['The Early History of Karachi', 'How to Sell Paintings to Collectors', 'The Rules of Classical Calligraphy'],
        e: 'The passage covers the scale and boldness of Sadequain\'s art (grand vision) and his habit of giving work away (generous spirit).',
      },
      {
        t: 'inference',
        q: 'It can be inferred that Sadequain:',
        a: 'valued public access to art above personal wealth',
        x: [
          'painted mainly for wealthy private collectors',
          'worked only on small canvases',
          'avoided using written words in his art',
        ],
        e: 'He gave paintings away and worked for no fee because "art should belong to the people". He painted huge murals and turned calligraphy into art, so the other options contradict the passage.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'celebrated' most nearly means:",
        a: 'famous',
        x: ['joyful', 'criticised', 'wealthy'],
        e: "A 'celebrated' painter is a famous, widely admired one. 'Joyful' confuses it with celebrating a festival, and 'wealthy' is a different idea altogether (he in fact cared little for money).",
      },
      {
        t: 'tone and purpose',
        q: "The author's attitude towards Sadequain is best described as one of:",
        a: 'admiration',
        x: ['disapproval', 'pity', 'amusement'],
        e: 'Words such as "most celebrated", "bold" and "Remarkably" show that the author admires the painter.',
      },
    ],
  },
  {
    id: 'c-abdus-salam',
    d: 2,
    past: true,
    size: 2,
    title: 'Abdus Salam',
    text: 'Abdus Salam grew up in the small town of Jhang, where his father worked in the education department. At fourteen he achieved record marks in the matriculation examination of the University of the Punjab. He went on to study at Cambridge, and in 1979 he shared the Nobel Prize in Physics for work showing that two of nature\'s fundamental forces are aspects of a single force. Yet he never forgot how hard it had been to do research far from the great centres of science. In 1964 he founded an institute in Trieste, Italy, where physicists from developing countries could work alongside leading researchers.',
    qs: [
      {
        t: 'main idea',
        q: 'Which title best summarises the passage?',
        a: 'A Scientist Who Opened Doors for Others',
        x: [
          'The Founding of Cambridge University',
          'How Matriculation Examinations Are Marked',
          'The Small Town of Jhang',
        ],
        e: 'The passage follows Salam from Jhang to the Nobel Prize and ends with his institute for scientists from developing countries: he opened doors for others.',
      },
      {
        t: 'inference',
        q: 'The passage suggests that Salam founded the institute in Trieste because he:',
        a: 'understood the difficulties of scientists in poorer countries',
        x: [
          'wanted to give up physics for teaching',
          'had failed to find work at Cambridge',
          'believed physics belonged only in Europe',
        ],
        e: 'He "never forgot how hard it had been to do research far from the great centres of science", so he created a place where scientists from developing countries could work with leading researchers.',
      },
      {
        t: 'vocabulary in context',
        q: "As used in the passage, the word 'aspects' most nearly means:",
        a: 'different sides',
        x: ['opposites', 'causes', 'rivals'],
        e: 'The two forces are "aspects of a single force": different sides or appearances of the same thing, not opposites or rivals.',
      },
      {
        t: 'reference',
        q: "In the phrase 'where his father worked in the education department', the word 'where' refers to:",
        a: 'the town of Jhang',
        x: ['Cambridge', 'Trieste', 'the University of the Punjab'],
        e: '"Where" follows "the small town of Jhang": Salam grew up in Jhang, and it was there that his father worked.',
      },
    ],
  },
];

const SUBS: readonly Sub[] = ['main idea', 'inference', 'reference', 'vocabulary in context', 'tone and purpose'];

export default defineBank('english', 'comprehension', (b) =>
  PASSAGES.map((p) =>
    b.set(
      p.id,
      {
        difficulty: p.d,
        origin: p.past ? 'past-paper' : 'original',
        tags: SUBS.filter((s) => p.qs.some((q) => q.t === s)),
      },
      p.size,
      (r) => {
        // Draw `size` questions from the pool and keep them in passage order.
        const picked = r
          .sample(
            p.qs.map((_, i) => i),
            p.size,
          )
          .sort((m, n) => m - n);
        return {
          title: p.title,
          passage: p.text,
          questions: picked.map((i) => {
            const q = p.qs[i]!;
            return { stem: q.q, answer: q.a, distractors: q.x, explanation: q.e };
          }),
        };
      },
    ),
  ),
);
