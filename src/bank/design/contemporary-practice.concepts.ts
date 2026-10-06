import { defineBank } from '@/engine/authoring';
import type { Rng } from '@/engine/rng';
import { pickDistractors } from '@/engine/helpers';

/**
 * Contemporary and Emerging Practices, part B: conceptual items (design process and
 * design thinking, studio culture, sustainability and passive design, universal design,
 * ethics and intellectual property). Every local id starts with `c-` so it never
 * collides with part A (`contemporary-practice.ts`, computational items).
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** One answer of an "identify the term" pool with several interchangeable clues. */
interface Entry {
  name: string;
  clues: readonly string[];
  /** Why the clue fits this term (used in the explanation). */
  why: string;
}

/** Picks an entry and a clue, returns stem, answer and three distractors from the pool. */
function identify(r: Rng, pool: readonly Entry[], question: string) {
  const entry = r.pick(pool);
  const clue = r.pick(entry.clues);
  const candidates = pool.filter((e) => e !== entry).map((e) => e.name);
  return {
    stem: `${clue}\n\n${question}`,
    answer: entry.name,
    distractors: pickDistractors(entry.name, r.shuffle(candidates)),
    explanation: `**${entry.name}**: ${entry.why}`,
  };
}

/** A fixed-answer variant inside a dynamic template. */
interface Variant {
  q: string;
  a: string;
  x: readonly [string, string, string];
  e: string;
}

/** A statement for a "which is correct / incorrect" item, with the reason it is true or false. */
interface Statement {
  s: string;
  why: string;
}

interface StatementBank {
  stem: string;
  negativeStem: string;
  truths: readonly Statement[];
  falsehoods: readonly Statement[];
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Like `statementQuestion`, but the explanation gives the specific reason for the key
 * and for each of the three statements actually shown as distractors.
 */
function statements(r: Rng, bank: StatementBank) {
  const inverted = r.chance(0.35);
  const key = r.pick(inverted ? bank.falsehoods : bank.truths);
  const others = r.sample(inverted ? bank.truths : bank.falsehoods, 3);
  return {
    stem: inverted ? bank.negativeStem : bank.stem,
    answer: key.s,
    distractors: others.map((o) => o.s),
    explanation:
      `"${key.s}" is **${inverted ? 'false' : 'true'}**: ${key.why}\n\n` +
      `The other statements are ${inverted ? 'true' : 'false'}. ${others.map((o) => capitalise(o.why)).join(' ')}`,
  };
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const STAGE_POOL: readonly Entry[] = [
  {
    name: 'Empathise',
    clues: [
      'The designer observes and interviews the people who will use a product to understand their needs, habits and feelings.',
      'Before sketching anything, a designer spends a day shadowing nurses on a hospital ward to see how they actually work.',
    ],
    why: 'this stage is about understanding users first-hand through observation, interviews and immersion, before any problem is framed.',
  },
  {
    name: 'Define',
    clues: [
      'Research findings are analysed and turned into a clear, focused problem statement centred on the user.',
      'The team writes: "Elderly residents need a way to cross the busy road safely without long waits."',
    ],
    why: 'this stage synthesises research into a precise, user-centred problem statement.',
  },
  {
    name: 'Ideate',
    clues: [
      'The team generates as many ideas as possible, for example by brainstorming, without judging them yet.',
      'A wall is quickly covered with thirty rough sketches of possible solutions to the problem statement.',
    ],
    why: 'this stage is divergent: it produces a wide range of possible solutions before choosing among them.',
  },
  {
    name: 'Prototype',
    clues: [
      'Quick, inexpensive mock-ups of selected ideas are built, such as cardboard models or paper screens.',
      'A full-size cardboard mock-up of a proposed bus shelter is put together in a single afternoon.',
    ],
    why: 'this stage turns chosen ideas into cheap, tangible mock-ups that can be tried out.',
  },
  {
    name: 'Test',
    clues: [
      'Mock-ups are placed in front of real users, who are watched while using them, and their feedback is used to refine the design.',
      'Users try a paper model of a ticketing app while the designer notes every point where they get stuck.',
    ],
    why: 'this stage evaluates prototypes with real users; its feedback often sends the team back to earlier stages.',
  },
];

const UX_POOL: readonly Entry[] = [
  {
    name: 'Persona',
    clues: [
      'A fictional but research-based profile of a typical user, with a name, photo, goals and frustrations, used to keep the team focused on real needs.',
      'The team describes "Amna, 34, a schoolteacher who commutes by bus and shops on her phone" as a stand-in for a whole group of real users they interviewed.',
    ],
    why: 'a persona is an archetypal user built from research data, used to keep design decisions anchored to real people.',
  },
  {
    name: 'User journey map',
    clues: [
      'A timeline diagram tracing every step a user goes through when using a service, noting their feelings and pain points at each step.',
      "A designer charts a patient's visit from booking an appointment to collecting medicine, marking the steps where the patient becomes frustrated.",
    ],
    why: 'a journey map follows the user step by step through a whole experience and records emotions and pain points along the way.',
  },
  {
    name: 'Empathy map',
    clues: ['A chart divided into four quadrants recording what a user says, thinks, does and feels.'],
    why: 'an empathy map sorts research observations into says, thinks, does and feels, to build understanding of the user.',
  },
  {
    name: 'Storyboard',
    clues: [
      'A sequence of simple sketched frames, like a comic strip, showing how a person would use a proposed product in a real situation.',
    ],
    why: 'a storyboard tells the story of a use scenario frame by frame, borrowing the technique of film-makers.',
  },
  {
    name: 'Wireframe',
    clues: [
      'A bare, skeleton layout of a screen or web page showing where content and controls go, without colours, images or styling.',
    ],
    why: 'a wireframe is a low-fidelity layout that fixes structure and hierarchy before visual styling is applied.',
  },
  {
    name: 'A/B testing',
    clues: [
      'Two versions of a design are shown to two comparable groups of users to find out which one performs better.',
      'Half the visitors to a website see a green "Buy" button and half see a red one, and the sales from each group are compared.',
    ],
    why: 'A/B testing compares two variants with similar groups of users and measures which one works better.',
  },
  {
    name: 'Focus group',
    clues: ['A small group of target users discusses a product or concept together in a session guided by a moderator.'],
    why: 'a focus group gathers opinions and attitudes through a moderated group discussion.',
  },
];

const STUDIO_POOL: readonly Entry[] = [
  {
    name: 'Maquette',
    clues: [
      'A small, rough study model made by a sculptor to test the form of a work before the full-size piece is made.',
      'A sculptor shapes a palm-sized clay version of a monument to test its proportions before it is cast in bronze.',
    ],
    why: 'a maquette is a small preliminary model used to study form before the final piece is produced.',
  },
  {
    name: 'Portfolio',
    clues: [
      "A curated collection of a designer's best work, showing skills and design process, presented for admission or employment.",
      'An applicant to an architecture school selects the drawings, models and photographs that best show her abilities and development.',
    ],
    why: "a portfolio is a selected, organised record of a designer's work and process.",
  },
  {
    name: 'Full-size mock-up',
    clues: [
      'Before 400 identical windows are ordered, one complete window bay is built at actual size on site so that the client can inspect it.',
      'A model of part of a design built at 1:1 scale to check materials, details and how people will actually use it.',
    ],
    why: 'a mock-up is built at actual (1:1) size to test details, materials and use before full production.',
  },
  {
    name: 'Presentation model',
    clues: [
      'A carefully finished, detailed scale model, made once the design is settled, to show the final scheme to a client or jury.',
    ],
    why: 'a presentation model is a polished, detailed model of the final design, made to communicate it rather than to explore it.',
  },
  {
    name: 'Sketchbook',
    clues: ['A bound book that a designer carries everywhere to record observations, quick drawings and ideas as they occur.'],
    why: 'a sketchbook is a personal, running record of observation and ideas, kept continuously rather than curated.',
  },
  {
    name: 'Pin-up',
    clues: [
      'Students fix their drawings to the studio wall and discuss them informally with classmates and tutors part-way through a project.',
    ],
    why: 'a pin-up is an informal review in which work in progress is pinned to the wall for open discussion.',
  },
];

const PASSIVE_POOL: readonly Entry[] = [
  {
    name: 'Cross ventilation',
    clues: [
      'Windows are placed on opposite walls, facing the wind and away from it, so that breezes sweep straight through a room.',
    ],
    why: 'openings on the windward and leeward sides let wind pressure drive air through the space.',
  },
  {
    name: 'Stack effect',
    clues: [
      'Warm indoor air rises and escapes through high-level openings, drawing cooler air in through low-level openings.',
      'A tall central shaft with vents at the top keeps air moving through a building even on a windless day, because hot air rises.',
    ],
    why: 'warm air is less dense and rises, so high outlets and low inlets create a vertical flow of air without wind.',
  },
  {
    name: 'Thermal mass',
    clues: [
      'Thick walls of brick, stone or rammed earth absorb heat by day and release it slowly at night, evening out indoor temperatures.',
    ],
    why: 'heavy materials store heat and delay its passage indoors, smoothing out daily temperature swings.',
  },
  {
    name: 'Brise-soleil',
    clues: [
      'Fixed external fins or louvres on a facade that block high summer sun before it reaches the glass.',
      'A permanent screen of concrete or metal blades is fixed outside the windows to shade them from the sun.',
    ],
    why: 'a brise-soleil (French for "sun-breaker") is an external shading structure of fins or louvres.',
  },
  {
    name: 'Light shelf',
    clues: [
      'A horizontal reflective shelf fixed in a window above eye level bounces daylight onto the ceiling and deep into the room.',
    ],
    why: 'its upper surface reflects daylight upwards and inwards while shading the lower part of the window from glare.',
  },
  {
    name: 'Green roof',
    clues: [
      'A layer of soil and plants on top of a building insulates it, absorbs rainwater and helps reduce the urban heat island effect.',
    ],
    why: 'vegetation and soil on the roof insulate, hold storm water and cool the surroundings through evapotranspiration.',
  },
  {
    name: 'Courtyard',
    clues: [
      'An open-to-sky space enclosed by rooms on all sides that collects cool night air and gives shade, light and privacy to the rooms around it.',
    ],
    why: 'an inward-looking open space surrounded by rooms; traditional in the havelis of the subcontinent and in Islamic houses.',
  },
  {
    name: 'Jali',
    clues: [
      'A perforated stone, brick or timber screen that lets breeze and softened light through while giving privacy and cutting glare.',
    ],
    why: 'the jali is a pierced screen used widely in Mughal and vernacular buildings of the subcontinent.',
  },
  {
    name: 'Evaporative cooling',
    clues: [
      'Air is passed over water, a fountain or wet surfaces so that evaporation lowers its temperature before it enters a room.',
    ],
    why: 'water absorbs latent heat as it evaporates, cooling the air; this works best in hot, dry climates.',
  },
];

const UNIVERSAL_POOL: readonly Entry[] = [
  {
    name: 'Equitable use',
    clues: [
      'Provide the same means of use for all users, identical whenever possible, and avoid segregating or stigmatising anyone.',
      'A building has one main entrance with a gentle ramp used by everyone, instead of a separate side door for wheelchair users.',
    ],
    why: 'the design is useful to people with diverse abilities through the same means, without singling anyone out.',
  },
  {
    name: 'Flexibility in use',
    clues: [
      'The design accommodates a wide range of individual preferences and abilities, offering a choice in the way it is used.',
      'A pair of scissors that works equally well in the left hand or the right hand.',
    ],
    why: 'the user can choose how to use the design (left or right hand, own pace, own settings).',
  },
  {
    name: 'Simple and intuitive use',
    clues: [
      "Use of the design is easy to understand regardless of the user's experience, knowledge, language or concentration level.",
      'A ticket machine with a few clearly arranged controls that first-time users can operate without reading any instructions.',
    ],
    why: 'the design removes unnecessary complexity so anyone can understand it at once.',
  },
  {
    name: 'Perceptible information',
    clues: [
      'Essential information is communicated in several forms (visual, spoken, tactile) so it reaches users whatever their sensory abilities.',
      'A lift announces each floor aloud, shows it on a display and has Braille next to every button.',
    ],
    why: 'information is presented redundantly (sight, sound, touch) so that every user can perceive it.',
  },
  {
    name: 'Tolerance for error',
    clues: [
      'The design minimises hazards and the harmful consequences of accidental or unintended actions.',
      'An "undo" command that lets a user reverse an accidental deletion.',
    ],
    why: 'the design anticipates mistakes and makes them harmless or reversible.',
  },
  {
    name: 'Low physical effort',
    clues: [
      'The design can be used efficiently and comfortably with a minimum of fatigue.',
      'Lever door handles that open with a light downward push, replacing round knobs that must be gripped tightly and twisted.',
    ],
    why: 'the design reduces the strength, grip and repetitive effort needed to use it.',
  },
  {
    name: 'Size and space for approach and use',
    clues: [
      "Appropriate size and space are provided for reach, manipulation and use regardless of the user's body size, posture or mobility.",
      'Wide doorways and clear floor area in front of a washbasin so that a person in a wheelchair can reach and use it.',
    ],
    why: 'enough room and suitable reach ranges are provided for every body size and for mobility aids.',
  },
];

const IP_POOL: readonly Entry[] = [
  {
    name: 'Copyright',
    clues: [
      'Protects original artistic works such as drawings, paintings, photographs and architectural plans, arising automatically when the work is created.',
      'An illustrator\'s original book illustrations are protected against copying without any registration being required.',
    ],
    why: 'copyright protects the expression of original literary and artistic works, including drawings and building plans.',
  },
  {
    name: 'Patent',
    clues: [
      'Protects a new, inventive and industrially applicable invention, such as a new folding mechanism for a chair, for a limited period after registration.',
      'An engineer registers a novel technical method of joining bamboo poles so that no one else may use it without a licence for twenty years.',
    ],
    why: 'a patent protects how a new invention works (a technical solution), for a limited term after grant.',
  },
  {
    name: 'Trademark',
    clues: [
      'Protects a distinctive name, logo or symbol that identifies the goods or services of a particular business.',
      'A furniture company registers its logo so that rivals cannot sell chairs under a confusingly similar badge.',
    ],
    why: 'a trademark protects signs (names, logos, symbols) that distinguish one trader\'s goods from another\'s.',
  },
  {
    name: 'Industrial design registration',
    clues: [
      'Protects the new visual appearance (shape, pattern or ornament) of a manufactured product, rather than how it works.',
      'A company registers the distinctive outer shape and surface pattern of its new kettle, not its heating mechanism.',
    ],
    why: 'an industrial design right protects the look of a product (its shape, configuration or ornament), not its function.',
  },
  {
    name: 'Geographical indication',
    clues: [
      'Protects a product name that links its qualities and reputation to the region where it is produced.',
      'Pakistan registered "Basmati" so that only rice grown in the designated region can be sold under that name.',
    ],
    why: 'a geographical indication protects names whose value comes from a place of origin, such as Basmati rice.',
  },
];

const ORIENTATION: readonly Variant[] = [
  {
    q: 'In Pakistan, which facade of a building is exposed to the harshest low-angle sun on summer afternoons and is therefore the most difficult to shade?',
    a: 'West',
    x: ['East', 'North', 'South'],
    e: 'The afternoon sun is low in the western sky and arrives when the air and the building are already at their hottest, so west facades overheat most. Low sun is hard to block with horizontal overhangs. East gets the cooler morning sun; south gets high sun that is easy to shade.',
  },
  {
    q: 'In Pakistan (northern hemisphere), which facade receives the least direct sunlight over the year and gives steady, glare-free daylight?',
    a: 'North',
    x: ['South', 'East', 'West'],
    e: 'North of the Tropic of Cancer the midday sun is always in the southern sky; north walls get only weak, low-angle sun early and late on summer days. North-facing windows therefore receive mostly diffuse sky light, which is why studios favour north light.',
  },
  {
    q: 'In Pakistan, which facade receives the most direct sunshine through the day in winter, making it the best side for winter solar gain?',
    a: 'South',
    x: ['North', 'East', 'West'],
    e: 'In winter the sun rises in the south-east, stays low in the southern sky and sets in the south-west, so south-facing glass receives sun almost all day and lets it penetrate deep into rooms.',
  },
  {
    q: 'To shade a south-facing window in Pakistan from the high summer sun while still admitting the low winter sun, the most effective device is:',
    a: 'A horizontal overhang of suitable depth above the window',
    x: ['Narrow vertical fins on either side of the window', 'Heavy curtains kept closed all year round', 'Dark tinted glass over the whole window'],
    e: 'The summer noon sun is high, so a horizontal overhang above a south window blocks it; the winter sun is low and passes under the overhang into the room. Vertical fins suit low sun from the east or west and do little against high sun from the south, while closed curtains or tinted glass would also shut out the welcome winter sun.',
  },
  {
    q: 'In a hot city such as Multan or Karachi, a rectangular building is best oriented so that its long sides face:',
    a: 'North and south, with the long axis running east-west',
    x: ['East and west, with the long axis running north-south', 'The nearest road, whatever the path of the sun', 'Any direction, because orientation does not affect heat gain'],
    e: 'East and west walls receive low-angle sun that is hard to shade. Running the long axis east-west keeps the east and west walls short and puts the large walls facing north and south, where sun is easy to control.',
  },
];

const PROCESS_STATEMENTS: StatementBank = {
  stem: 'Which of the following statements about the design process is correct?',
  negativeStem: 'Which of the following statements about the design process is **incorrect**?',
  truths: [
    {
      s: 'Design is iterative: ideas are tested, evaluated and refined in repeated cycles.',
      why: 'each round of testing exposes problems that feed the next round of refinement.',
    },
    {
      s: 'User-centred design involves the end users throughout the process, not only at the end.',
      why: 'users take part in research, in reviewing ideas and in testing prototypes.',
    },
    {
      s: 'Feedback from testing a prototype can send the designer back to redefine the problem.',
      why: 'testing often shows that the problem itself was framed wrongly, so earlier stages are revisited.',
    },
    {
      s: 'Divergent thinking generates many options, and convergent thinking narrows them to the best.',
      why: 'designers first widen the range of ideas and then evaluate and select among them.',
    },
    {
      s: 'A design brief sets out the requirements and constraints that a solution must satisfy.',
      why: 'the brief records the needs, budget, site and deadlines the design must work within.',
    },
  ],
  falsehoods: [
    {
      s: 'The design process is strictly linear, so no stage is ever revisited.',
      why: 'The process is not linear: stages are revisited whenever testing reveals problems.',
    },
    {
      s: 'Prototypes should be built only after the final design has been completed and approved.',
      why: 'Cheap prototypes are made early, precisely so that ideas can be tested before the design is fixed.',
    },
    {
      s: 'During brainstorming, each idea should be criticised at once so that weak ideas are dropped early.',
      why: 'Brainstorming defers judgement; criticising ideas at once stops the flow of new ones.',
    },
    {
      s: "User-centred design relies on the designer's personal taste rather than on research with users.",
      why: "User-centred design is driven by research with users, not by the designer's personal taste.",
    },
    {
      s: 'Constraints such as budget, site and time have no influence on a good design solution.',
      why: 'Budget, site and time constrain every real project and shape the solution.',
    },
  ],
};

const GREEN_STATEMENTS: StatementBank = {
  stem: 'Which of the following statements about sustainable (green) building is correct?',
  negativeStem: 'Which of the following statements about sustainable (green) building is **incorrect**?',
  truths: [
    {
      s: 'Embodied energy is the energy used to extract, process, manufacture, transport and install a building material.',
      why: 'embodied energy is the energy "locked into" a material before the building is ever occupied.',
    },
    {
      s: "Choosing the right orientation can reduce a building's cooling load before any mechanical system is selected.",
      why: 'turning the large walls and windows away from the low east and west sun cuts heat gain at no extra cost.',
    },
    {
      s: 'Reusing an existing building usually saves much of the embodied carbon of an equivalent new building.',
      why: 'the structure and envelope of an existing building are already in place, so their materials need not be produced again.',
    },
    {
      s: 'LEED awards credits for measures such as energy efficiency, water saving, site selection and material choice.',
      why: 'LEED is a points-based rating covering energy, water, site, materials and indoor environment.',
    },
    {
      s: 'A light-coloured, reflective roof absorbs less solar heat than a dark roof.',
      why: 'a light surface reflects much of the incoming sunlight instead of absorbing it as heat.',
    },
  ],
  falsehoods: [
    {
      s: 'A building with solar panels on its roof is automatically certified as a green building.',
      why: 'Certification judges the whole building across many criteria; solar panels alone do not earn it.',
    },
    {
      s: 'Large areas of unshaded west-facing glass reduce the cooling load of a building in a hot climate.',
      why: 'Unshaded west glass admits the hot afternoon sun and increases the cooling load.',
    },
    {
      s: 'Embodied energy refers only to the electricity a building consumes after it is occupied.',
      why: 'Energy used after occupation is operational energy; embodied energy is spent before it.',
    },
    {
      s: 'Thermal mass is most useful where day and night temperatures are almost the same.',
      why: 'Thermal mass works best where there is a large day-night temperature swing.',
    },
    {
      s: 'Locally sourced materials always have higher embodied energy than imported ones.',
      why: 'Local materials usually have lower embodied energy because they need less transport.',
    },
  ],
};

const ETHICS_STATEMENTS: StatementBank = {
  stem: 'Which of the following statements about ethics and intellectual property in design is correct?',
  negativeStem: 'Which of the following statements about ethics and intellectual property in design is **incorrect**?',
  truths: [
    {
      s: 'Studying precedents is legitimate, provided the sources are acknowledged and the ideas are reinterpreted.',
      why: 'learning from existing work is normal; giving credit and transforming the ideas is what separates it from plagiarism.',
    },
    {
      s: 'Copyright protects the particular expression of an idea, such as a specific drawing, not the bare idea itself.',
      why: 'anyone may use a general idea, but not copy the specific drawing or design in which someone else expressed it.',
    },
    {
      s: "A designer should put the safety of the public above a client's wish to cut costs.",
      why: 'professional codes of conduct make public health and safety the first duty of a designer.',
    },
    {
      s: 'Using a photograph found online in a commercial design normally requires permission or a licence from its owner.',
      why: 'being visible online does not remove copyright; the owner must permit the use unless the image is free-licensed.',
    },
    {
      s: 'A designer should disclose a conflict of interest, such as owning a share in a supplier being recommended.',
      why: 'clients are entitled to know of any personal interest that could bias the advice they receive.',
    },
  ],
  falsehoods: [
    {
      s: 'Anything posted on the internet is in the public domain and may be reused freely.',
      why: 'Material online is still protected by copyright unless its owner has released it.',
    },
    {
      s: "Changing a few colours in someone else's logo makes it an original design that may be used freely.",
      why: 'A trivially altered copy is still a copy and still infringes the original.',
    },
    {
      s: 'A designer may ignore building safety rules if the client agrees to accept the risk.',
      why: 'Safety rules protect the public and occupants, so a client cannot waive them.',
    },
    {
      s: 'Copyright protects a general idea, such as a house planned around a courtyard, so no one else may use it.',
      why: 'General ideas are free to all; copyright covers only their specific expression.',
    },
    {
      s: 'Crediting the original designer is unnecessary if the copied work is used only in a student project.',
      why: 'Presenting uncredited work as your own is plagiarism in a student project too.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('design', 'contemporary-practice', (b) => [
  b.dynamic('c-design-thinking-stage', { difficulty: 1, origin: 'past-paper', tags: ['design process'] }, (r) =>
    identify(r, STAGE_POOL, 'Which stage of the design thinking process does this describe?'),
  ),

  b.dynamic('c-user-research-tool', { difficulty: 1, tags: ['design process'] }, (r) =>
    identify(r, UX_POOL, 'Which user-centred design tool or method does this describe?'),
  ),

  b.dynamic('c-studio-practice', { difficulty: 1, origin: 'past-paper', tags: ['studio culture'] }, (r) =>
    identify(r, STUDIO_POOL, 'Which studio practice or product does this describe?'),
  ),

  b.dynamic('c-process-statements', { difficulty: 2, tags: ['design process'] }, (r) => statements(r, PROCESS_STATEMENTS)),

  b.dynamic('c-passive-strategy', { difficulty: 2, origin: 'past-paper', tags: ['sustainability'] }, (r) =>
    identify(r, PASSIVE_POOL, 'Which passive design strategy does this describe?'),
  ),

  b.dynamic('c-sun-orientation', { difficulty: 2, origin: 'past-paper', tags: ['sustainability'] }, (r) => {
    const v = r.pick(ORIENTATION);
    return { stem: v.q, answer: v.a, distractors: [...v.x], explanation: v.e };
  }),

  b.dynamic('c-green-building-statements', { difficulty: 3, tags: ['sustainability', 'emerging materials and technologies'] }, (r) =>
    statements(r, GREEN_STATEMENTS),
  ),

  b.dynamic('c-universal-design-principle', { difficulty: 2, tags: ['design process'] }, (r) =>
    identify(r, UNIVERSAL_POOL, 'Which principle of universal design does this reflect most directly?'),
  ),

  b.dynamic('c-ip-protection', { difficulty: 1, tags: ['design process'] }, (r) =>
    identify(r, IP_POOL, 'Which form of intellectual property protection does this describe?'),
  ),

  b.dynamic('c-ethics-statements', { difficulty: 2, tags: ['design process', 'studio culture'] }, (r) =>
    statements(r, ETHICS_STATEMENTS),
  ),

  ...b.mcqs([
    {
      id: 'c-design-thinking-sequence', d: 1, o: 'past-paper', t: ['design process'],
      q: 'The five stages of the design thinking process, in their usual order, are:',
      a: 'Empathise, Define, Ideate, Prototype, Test',
      x: [
        'Define, Empathise, Prototype, Ideate, Test',
        'Ideate, Empathise, Define, Test, Prototype',
        'Empathise, Ideate, Define, Test, Prototype',
      ],
      e: 'Designers first understand users (Empathise), frame the problem (Define), generate ideas (Ideate), build cheap mock-ups (Prototype) and try them with users (Test), looping back as needed.',
    },
    {
      id: 'c-design-brief', d: 1, t: ['design process'],
      q: 'A design brief is best described as:',
      a: "A statement of the client's needs, goals, constraints, budget and deadlines",
      x: [
        'A set of final working drawings issued to the builder',
        'A short critique of a finished design written by a jury',
        'A catalogue of materials available in the local market',
      ],
      e: 'The brief starts a project: it records what the client wants and the limits (site, budget, time) the design must work within. Working drawings come at the end; a critique comes after the design is done.',
    },
    {
      id: 'c-hot-wire-cutter', d: 1, t: ['studio culture'],
      q: 'In a model-making workshop, a hot-wire cutter is used mainly to cut and shape:',
      a: 'Polystyrene foam blocks',
      x: ['Sheets of window glass', 'Hardwood planks', 'Mild steel rods'],
      e: 'A thin wire heated by an electric current melts a clean path through polystyrene foam, so it is ideal for quick massing models. It cannot cut glass, hardwood or steel, which need scoring, sawing or metal-cutting tools.',
    },
    {
      id: 'c-leed-meaning', d: 1, o: 'past-paper', t: ['sustainability'],
      q: 'The green building rating system LEED stands for:',
      a: 'Leadership in Energy and Environmental Design',
      x: [
        'Low Energy and Ecological Development',
        'Leadership in Environmental Engineering and Design',
        'Licensed Energy-Efficient Eco Design',
      ],
      e: 'LEED (Leadership in Energy and Environmental Design) is a rating system developed by the U.S. Green Building Council; buildings earn credits for energy, water, site, materials and indoor-environment measures.',
    },
    {
      id: 'c-tactile-paving', d: 1, t: ['design process'],
      q: 'Textured (tactile) paving strips at the edge of a railway platform or at a kerb are provided mainly to help:',
      a: 'People with visual impairments detect hazards and find their way',
      x: [
        'Drain rainwater away from the walking surface',
        'Cyclists brake safely on smooth ground',
        'Cleaners identify the areas to be swept',
      ],
      e: 'Tactile paving can be felt underfoot or with a cane, warning blind and partially sighted people of an edge or crossing and guiding them along a route: an example of inclusive (universal) design.',
    },
    {
      id: 'c-biomimicry-termites', d: 1, t: ['emerging materials and technologies', 'sustainability'],
      q: 'Designing the natural ventilation of an office block by imitating the way termite mounds stay cool (as in the Eastgate Centre, Harare) is an example of:',
      a: 'Biomimicry',
      x: ['Deconstructivism', 'Brutalism', 'Postmodernism'],
      e: 'Biomimicry solves design problems by learning from forms and processes in nature. The other options are architectural styles, not methods of borrowing solutions from living things.',
    },
    {
      id: 'c-north-light-studio', d: 2, t: ['studio culture', 'sustainability'],
      q: "Painters' studios in the northern hemisphere traditionally have large north-facing windows because north light:",
      a: 'Is steady and diffuse, without direct sun or harsh shadows',
      x: [
        'Is warmer in colour than light from the south',
        'Gives the most direct sunshine at midday',
        'Brings in the most heat during winter',
      ],
      e: 'North of the tropics the midday sun is always in the southern sky, and north windows get only weak, low-angle sun early and late on summer days, so they receive mainly diffuse sky light rather than direct sun. Its intensity and colour change little through the day, ideal for judging colour. North light is in fact slightly cool (bluish), and south windows get the midday and winter sun.',
    },
    {
      id: 'c-embodied-energy-material', d: 2, t: ['sustainability', 'emerging materials and technologies'],
      q: 'Which of the following building materials generally has the highest embodied energy per kilogram?',
      a: 'Primary (newly smelted) aluminium',
      x: ['Sawn timber', 'Sun-dried earth brick', 'Locally quarried stone'],
      e: 'Smelting aluminium from bauxite is extremely electricity-intensive, so primary aluminium carries well over 100 MJ/kg of embodied energy, compared with roughly 10 MJ/kg or less for timber and only a few MJ/kg or less for earth brick and local stone.',
    },
    {
      id: 'c-wind-catcher-hyderabad', d: 2, o: 'past-paper', t: ['sustainability', 'local artists and architects'],
      q: 'The traditional rooftop wind catchers (mangh) of Hyderabad, Sindh, were built to:',
      a: 'Catch the cool south-west sea breeze and channel it down into the rooms',
      x: [
        'Collect rainwater on the roof for use in summer',
        'Let smoke from kitchen fires escape from the house',
        'Hold water tanks at a height for gravity supply',
      ],
      e: 'The mangh is an open-sided shaft on the roof facing the prevailing south-west breeze; it scoops moving air and drives it down into the house, a passive cooling device of vernacular Sindhi architecture.',
    },
    {
      id: 'c-plagiarism-ethics', d: 2, t: ['design process', 'studio culture'],
      q: 'A design student copies a facade published in a magazine and presents it as an original scheme without acknowledging the source. This is:',
      a: "Plagiarism, because another designer's work is passed off as one's own",
      x: [
        'A precedent study, because an existing building is being studied',
        'Acceptable, because anything published in a magazine is free to claim',
        'Parametric design, because an existing form is being reused',
      ],
      e: "Learning from precedents is encouraged, but the source must be acknowledged and the ideas reinterpreted. Presenting someone else's design as your own without credit is plagiarism, an ethical breach (and may infringe copyright).",
    },
    {
      id: 'c-hot-dry-climate', d: 3, t: ['sustainability'],
      q: 'A house is to be built in a hot-dry desert town where days are very hot but nights are cool. Which approach suits this climate best?',
      a: 'Thick heavy walls, small shaded openings and ventilation at night',
      x: [
        'Lightweight walls and large openings kept open day and night for cross ventilation',
        'Light walls and large unshaded windows facing west',
        'Thin metal-sheet walls that respond quickly to outdoor temperature',
      ],
      e: 'A large day-night swing suits thermal mass: heavy walls soak up daytime heat and release it at night, when the building is flushed with cool air. Lightweight construction with constant cross ventilation suits hot-humid climates; in a hot-dry climate it lets the hot daytime air straight in. Unshaded west-facing glazing and thin metal walls also let heat in quickly.',
    },
    {
      id: 'c-cradle-to-cradle', d: 3, t: ['sustainability', 'emerging materials and technologies'],
      q: 'The "cradle to cradle" approach to sustainable design aims to:',
      a: 'Design products so their materials can be fully recycled or safely returned to nature at the end of their life',
      x: [
        'Measure only the energy a product uses while it is in service',
        'Make products last exactly one generation before they go to landfill',
        'Cut the cost of a product from the factory to the point of sale',
      ],
      e: 'Cradle to cradle replaces the linear "cradle to grave" model: materials are treated as technical nutrients (recycled indefinitely) or biological nutrients (composted safely), so nothing becomes waste.',
    },
  ]),
]);
