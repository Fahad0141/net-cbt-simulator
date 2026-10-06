import { defineBank } from '@/engine/authoring';
import { listText, pickDistractors } from '@/engine/helpers';
import {
  ARTISTS,
  DESIGN_THINKING,
  DOUBLE_DIAMOND,
  LANDMARKS,
  MATERIALS,
  PAKISTANI_ARCHITECTS,
  RATING_SYSTEMS,
  STUDIO_TERMS,
  TECHNOLOGIES,
  type Artist,
  type Landmark,
} from './_contemporary';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const KNOWN_ARTISTS = ARTISTS.filter((a): a is Artist & { known: string } => Boolean(a.known));
const DESCRIBED_LANDMARKS = LANDMARKS.filter((l): l is Landmark & { description: string } => Boolean(l.description));
/** 'the Faisal Mosque, Islamabad' / 'the master plan of Islamabad'. */
const theLandmark = (l: Landmark) => `the ${l.name.replace(/^Master plan/, 'master plan')}`;
const PAINTERS = ARTISTS.filter((a) => a.field === 'painter').map((a) => a.name);

export default defineBank('design', 'contemporary-practice', (b) => [
  // ---------------------------------------------------------------- local artists and architects
  b.dynamic('artist-known-for', { difficulty: 2, origin: 'past-paper', tags: ['local artists and architects'] }, (r) => {
    const artist = r.pick(KNOWN_ARTISTS);
    const answer = artist.name;
    return {
      stem: `Which Pakistani artist is known for ${artist.known}?`,
      answer,
      distractors: pickDistractors(answer, ARTISTS.map((a) => a.name), r),
      explanation: `${artist.name} is known for ${artist.known}.`,
    };
  }),

  b.dynamic('artist-achievement', { difficulty: 2, tags: ['local artists and architects'] }, (r) => {
    const artist = r.pick(KNOWN_ARTISTS);
    const answer = cap(artist.known);
    const others = KNOWN_ARTISTS.filter((a) => a !== artist);
    const distractors = pickDistractors(answer, others.map((a) => cap(a.known)), r);
    const owners = distractors.map((d) => {
      const owner = others.find((a) => cap(a.known) === d) as Artist & { known: string };
      return `${owner.name} (${owner.known})`;
    });
    return {
      stem: `The Pakistani artist **${artist.name}** is known for:`,
      answer,
      distractors,
      explanation: `${artist.name} is known for ${artist.known}. The other options refer to ${listText(owners)}.`,
    };
  }),

  b.dynamic('identify-architect-or-painter', { difficulty: 1, tags: ['local artists and architects'] }, (r) => {
    const askArchitect = r.chance(0.5);
    const [right, wrong] = askArchitect ? [PAKISTANI_ARCHITECTS, PAINTERS] : [PAINTERS, PAKISTANI_ARCHITECTS];
    const answer = r.pick(right);
    const distractors = r.sample(wrong, 3);
    const role = askArchitect ? 'architect' : 'painter';
    const otherRole = askArchitect ? 'painters' : 'architects';
    return {
      stem: `Which of the following is a renowned Pakistani **${role}**?`,
      answer,
      distractors,
      explanation: `${answer} is a well-known Pakistani ${role}; ${listText(distractors)} are ${otherRole}.`,
    };
  }),

  b.dynamic('landmark-architect', { difficulty: 1, origin: 'past-paper', tags: ['local artists and architects'] }, (r) => {
    const lm = r.pick(LANDMARKS);
    const others = LANDMARKS.filter((l) => l !== lm);
    const the = theLandmark(lm);
    if (r.chance(0.5)) {
      return {
        stem: `Who designed ${the}?`,
        answer: lm.architect,
        distractors: pickDistractors(lm.architect, others.map((l) => l.architect), r),
        explanation: `${lm.architect} designed ${the}.`,
      };
    }
    return {
      stem: `Which of the following was designed by **${lm.architect}**?`,
      answer: lm.name,
      distractors: pickDistractors(lm.name, others.map((l) => l.name), r),
      explanation: `${lm.architect} designed ${the}.`,
    };
  }),

  b.dynamic('landmark-description', { difficulty: 1, origin: 'past-paper', tags: ['local artists and architects'] }, (r) => {
    const lm = r.pick(DESCRIBED_LANDMARKS);
    const others = DESCRIBED_LANDMARKS.filter((l) => l !== lm);
    if (r.chance(0.5)) {
      return {
        stem: `Which landmark is ${lm.description}?`,
        answer: lm.name,
        distractors: pickDistractors(lm.name, others.map((l) => l.name), r),
        explanation: `The ${lm.name} (architect: ${lm.architect}) is ${lm.description}.`,
      };
    }
    const answer = cap(lm.description);
    return {
      stem: `Which description fits the **${lm.name}**?`,
      answer,
      distractors: pickDistractors(answer, others.map((l) => cap(l.description)), r),
      explanation: `The ${lm.name}, designed by ${lm.architect}, is ${lm.description}.`,
    };
  }),

  // ---------------------------------------------------------------- emerging materials and technologies
  b.dynamic('material-property', { difficulty: 2, tags: ['emerging materials and technologies'] }, (r) => {
    const m = r.pick(MATERIALS);
    const others = MATERIALS.filter((x) => x !== m);
    if (r.chance(0.5)) {
      const answer = cap(m.property);
      return {
        stem: `**${m.name}** is best described as:`,
        answer,
        distractors: pickDistractors(answer, others.map((x) => cap(x.property)), r),
        explanation: `${m.name} is ${m.property}.`,
      };
    }
    return {
      stem: `Which emerging material is ${m.property}?`,
      answer: m.name,
      distractors: pickDistractors(m.name, others.map((x) => x.name), r),
      explanation: `${m.name} is ${m.property}.`,
    };
  }),

  b.dynamic('technology-use', { difficulty: 1, tags: ['emerging materials and technologies'] }, (r) => {
    const t = r.pick(TECHNOLOGIES);
    // BIM models are themselves parametric, so never pit BIM and parametric design against each other.
    const overlapping = (x: (typeof TECHNOLOGIES)[number]) =>
      [t.name, x.name].every((n) => /^(Parametric design|Building Information Modelling)/.test(n));
    const others = TECHNOLOGIES.filter((x) => x !== t && !overlapping(x));
    if (r.chance(0.5)) {
      const answer = cap(t.use);
      return {
        stem: `**${t.name}** is a digital design and construction technology that:`,
        answer,
        distractors: pickDistractors(answer, others.map((x) => cap(x.use)), r),
        explanation: `${t.name} ${t.use}.`,
      };
    }
    return {
      stem: `Which digital technology ${t.use}?`,
      answer: t.name,
      distractors: pickDistractors(t.name, others.map((x) => x.name), r),
      explanation: `${t.name} ${t.use}.`,
    };
  }),

  // ---------------------------------------------------------------- design process
  b.dynamic('design-process-stage', { difficulty: 2, tags: ['design process'] }, (r) => {
    const dt = DESIGN_THINKING.join(' → ');
    const dd = DOUBLE_DIAMOND.join(' → ');
    const kind = r.int(0, 3);
    if (kind === 0) {
      // Next stage in the five-stage design-thinking model.
      const i = r.int(0, DESIGN_THINKING.length - 2);
      const answer = DESIGN_THINKING[i + 1] as string;
      const pool = DESIGN_THINKING.filter((_, j) => j !== i && j !== i + 1);
      return {
        stem: `In the five-stage design-thinking process, which stage comes immediately after **${DESIGN_THINKING[i]}**?`,
        answer,
        distractors: pickDistractors(answer, pool, r),
        explanation: `The five stages run ${dt}, so ${answer} follows ${DESIGN_THINKING[i]}.`,
      };
    }
    if (kind === 1) {
      // Next phase of the Double Diamond.
      const i = r.int(0, DOUBLE_DIAMOND.length - 2);
      const answer = DOUBLE_DIAMOND[i + 1] as string;
      const pool = [...DOUBLE_DIAMOND.filter((_, j) => j !== i + 1), 'Ideate', 'Prototype'];
      return {
        stem: `In the Design Council's Double Diamond model, which phase comes immediately after **${DOUBLE_DIAMOND[i]}**?`,
        answer,
        distractors: pickDistractors(answer, pool.filter((s) => s !== DOUBLE_DIAMOND[i]), r),
        explanation: `The Double Diamond runs ${dd}, so ${answer} follows ${DOUBLE_DIAMOND[i]}.`,
      };
    }
    if (kind === 2) {
      // Not a phase of the Double Diamond.
      const answer = r.pick(DESIGN_THINKING.filter((s) => !DOUBLE_DIAMOND.includes(s)));
      return {
        stem: `Which of the following is **not** one of the four phases of the Double Diamond design process?`,
        answer,
        distractors: r.sample(DOUBLE_DIAMOND, 3),
        explanation: `The Double Diamond has four phases: ${dd}. ${answer} is a stage of the five-stage design-thinking model, not of the Double Diamond.`,
      };
    }
    // First or last stage of design thinking.
    const first = r.chance(0.5);
    const answer = (first ? DESIGN_THINKING[0] : DESIGN_THINKING[DESIGN_THINKING.length - 1]) as string;
    return {
      stem: `In the five-stage design-thinking process, which stage comes **${first ? 'first' : 'last'}**?`,
      answer,
      distractors: pickDistractors(answer, DESIGN_THINKING, r),
      explanation: `The five stages run ${dt}; ${answer} is the ${first ? 'first' : 'last'} stage${first ? ", where the designer seeks to understand the users' needs" : ', where prototypes are tried out with users'}.`,
    };
  }),

  // ---------------------------------------------------------------- studio culture
  b.dynamic('studio-term', { difficulty: 1, tags: ['studio culture'] }, (r) => {
    const s = r.pick(STUDIO_TERMS);
    const others = STUDIO_TERMS.filter((x) => x !== s);
    if (r.chance(0.5)) {
      const answer = cap(s.definition);
      return {
        stem: `In a design studio, the term **${s.term.toLowerCase()}** refers to:`,
        answer,
        distractors: pickDistractors(answer, others.map((x) => cap(x.definition)), r),
        explanation: `A ${s.term.toLowerCase()} is ${s.definition}.`,
      };
    }
    return {
      stem: `In design-studio vocabulary, which term describes ${s.definition}?`,
      answer: s.term,
      distractors: pickDistractors(s.term, others.map((x) => x.term), r),
      explanation: `${s.term}: ${s.definition}.`,
    };
  }),

  // ---------------------------------------------------------------- sustainability
  b.dynamic('green-rating-system', { difficulty: 2, tags: ['sustainability'] }, (r) => {
    const g = r.pick(RATING_SYSTEMS);
    const others = RATING_SYSTEMS.filter((x) => x !== g);
    if (r.chance(0.5)) {
      const answer = cap(g.country);
      return {
        stem: `The green-building rating system **${g.name}** was developed in:`,
        answer,
        distractors: pickDistractors(answer, others.map((x) => cap(x.country)), r),
        explanation: `${g.name} is the green-building rating system of ${g.country}.`,
      };
    }
    return {
      stem: `Which green-building rating system was developed in ${g.country}?`,
      answer: g.name,
      distractors: pickDistractors(g.name, others.map((x) => x.name), r),
      explanation: `${g.name} was developed in ${g.country}.`,
    };
  }),

  // ---------------------------------------------------------------- fixed items
  ...b.mcqs([
    {
      id: 'pakistan-monument-petals', d: 2, o: 'past-paper', t: ['local artists and architects'],
      q: 'The four large petals of the Pakistan Monument in Islamabad represent:',
      a: 'The four provinces of Pakistan',
      x: ['The four seasons of the year', 'The four major languages of Pakistan', 'The four rightly guided caliphs'],
      e: "In Arif Masood's design the four large petals stand for the four provinces and the three smaller petals for the three territories, symbolising national unity.",
    },
    {
      id: 'nca-mayo-school', d: 2, o: 'past-paper', t: ['local artists and architects', 'studio culture'],
      q: 'The National College of Arts, Lahore, was founded in 1875 under the name:',
      a: 'Mayo School of Arts',
      x: ['Kipling School of Design', 'Punjab School of Fine Arts', 'Aitchison School of Art'],
      e: 'It began as the Mayo School of Arts, named after Lord Mayo; John Lockwood Kipling was its first principal. It was renamed the National College of Arts in 1958.',
    },
    {
      id: 'chughtai-style', d: 1, o: 'past-paper', t: ['local artists and architects'],
      q: "Abdur Rahman Chughtai's painting style draws chiefly on:",
      a: 'Mughal and Persian miniature traditions',
      x: ['European Cubism', 'American Abstract Expressionism', 'British Pop Art'],
      e: 'Chughtai developed a lyrical, linear style rooted in Mughal and Persian miniature painting, seen in his illustrations of Ghalib.',
    },
    {
      id: 'kamil-khan-mumtaz-tradition', d: 2, t: ['local artists and architects', 'sustainability'],
      q: 'Architect Kamil Khan Mumtaz, author of "Architecture in Pakistan", is best known for championing:',
      a: 'Traditional building crafts and local materials',
      x: ['High-tech steel and glass skyscrapers', 'Deconstructivist free-form buildings', 'Prefabricated concrete mass housing'],
      e: 'Kamil Khan Mumtaz turned from modernism to traditional architecture, working with master craftsmen and materials such as brick, lime and timber.',
    },
    {
      id: 'yasmeen-lari-zero-carbon', d: 2, t: ['local artists and architects', 'sustainability'],
      q: "In her later humanitarian work, Pakistan's first woman architect, Yasmeen Lari, is known for:",
      a: 'Low-cost, zero-carbon shelters of bamboo, lime and mud',
      x: ['Glass-clad high-rise towers for corporate clients', 'Imported prefabricated steel housing units', 'Air-conditioned luxury resorts in the north'],
      e: 'After the 2005 earthquake and 2010 floods, Lari promoted self-build, zero-carbon shelters using bamboo, lime and mud; she received the RIBA Royal Gold Medal in 2023.',
    },
    {
      id: 'mycelium-fungi', d: 1, t: ['emerging materials and technologies', 'sustainability'],
      q: 'Mycelium, grown into biodegradable bricks and packaging, is the root-like network of:',
      a: 'Fungi',
      x: ['Bacteria', 'Algae', 'Bamboo'],
      e: 'Mycelium is the mass of thread-like hyphae of a fungus; fed on farm waste in a mould, it binds the waste into a light, compostable material.',
    },
    {
      id: 'bim-4d-time', d: 3, t: ['emerging materials and technologies'],
      q: 'Linking a BIM model to the construction schedule, so the building sequence can be simulated over time, is called:',
      a: '4D BIM',
      x: ['3D BIM', '5D BIM', '6D BIM'],
      e: '3D is the geometric model; adding time (scheduling) gives 4D, and adding cost gives 5D. A 6D model adds further life-cycle data, not the schedule.',
    },
    {
      id: 'etfe-water-cube', d: 3, t: ['emerging materials and technologies'],
      q: "The bubble-like façade of Beijing's National Aquatics Centre (the \"Water Cube\") is made of inflated cushions of:",
      a: 'ETFE foil',
      x: ['Polycarbonate sheet', 'Toughened glass', 'PVC-coated fabric'],
      e: 'ETFE (ethylene tetrafluoroethylene) foil cushions weigh about 1% of equivalent glass, transmit more light and are self-cleaning, which suited the Water Cube.',
    },
  ]),
]);
