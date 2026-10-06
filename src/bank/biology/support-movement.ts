/**
 * Biology (FSc Part II): Support and Movement.
 *
 * Sub-topics: skeleton, joints, muscles, plant support.
 *
 * Computational items: sarcomere band lengths (sliding-filament model) and memorised
 * bone counts. Conceptual items: joint types and examples, statement pools (one correct /
 * one incorrect statement per instance) and fixed textbook-recall MCQs.
 */
import { defineBank } from '@/engine/authoring';
import { num, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** A false statement and the fact that corrects it. */
type Falsehood = readonly [statement: string, correction: string];

/**
 * "Which statement is correct / incorrect?" from pools of true and false statements.
 * The explanation names the correction of every false statement shown.
 */
function statementItem(
  r: Rng,
  pool: { stem: string; negativeStem: string; truths: readonly string[]; falsehoods: readonly Falsehood[] },
): AuthoredQuestion {
  if (r.chance(0.35)) {
    const [answer, why] = r.pick(pool.falsehoods);
    return {
      stem: pool.negativeStem,
      answer,
      distractors: r.sample(pool.truths, 3),
      explanation: `This statement is false: ${why} The other three statements are correct.`,
    };
  }
  const answer = r.pick(pool.truths);
  const wrong = r.sample(pool.falsehoods, 3);
  return {
    stem: pool.stem,
    answer,
    distractors: wrong.map(([s]) => s),
    explanation: `"${answer}" is correct. The others are false: ${wrong.map(([, why]) => why).join(' ')}`,
  };
}

/** First three candidates that differ from the answer and from each other. */
function distinctOptions(answer: string, candidates: readonly string[]): string[] {
  const out = [...new Set(candidates)].filter((c) => c !== answer).slice(0, 3);
  if (out.length < 3) throw new Error(`only ${out.length} distinct distractors for ${answer}`);
  return out;
}

/** Micrometre quantity from a value in tenths of a micrometre (keeps arithmetic exact). */
const um = (tenths: number): string => `$${num(tenths / 10)}\\,\\mu\\mathrm{m}$`;

// ---------------------------------------------------------------------------
// Bone counts (adult human skeleton)
// ---------------------------------------------------------------------------

interface BoneCount {
  q: string;
  a: number;
  wrong: readonly number[];
  why: string;
}

const BONE_COUNTS: readonly BoneCount[] = [
  { q: 'The total number of bones in the adult human skeleton is:', a: 206, wrong: [126, 80, 212, 300, 270], why: 'The adult skeleton has 206 bones: 80 axial and 126 appendicular.' },
  { q: 'The number of bones in the axial skeleton of an adult human is:', a: 80, wrong: [126, 206, 64, 33], why: 'The axial skeleton (skull, hyoid, ear ossicles, vertebral column, ribs and sternum) has 80 bones; the appendicular skeleton has 126.' },
  { q: 'The number of bones in the appendicular skeleton of an adult human is:', a: 126, wrong: [80, 206, 64, 120] , why: 'The appendicular skeleton (girdles and limbs) has 126 of the 206 bones; the other 80 are axial.' },
  { q: 'The number of bones in the human cranium is:', a: 8, wrong: [14, 22, 12, 6], why: 'The cranium has 8 bones and the face 14, giving 22 skull bones.' },
  { q: 'The number of facial bones in the human skull is:', a: 14, wrong: [8, 22, 12, 7], why: 'The face has 14 bones and the cranium 8, giving 22 skull bones.' },
  { q: 'The number of vertebrae in the human vertebral column (counted before the sacral and coccygeal vertebrae fuse) is:', a: 33, wrong: [26, 24, 12, 31], why: 'There are 33 vertebrae: 7 cervical, 12 thoracic, 5 lumbar, 5 sacral and 4 coccygeal.' },
  { q: 'The number of cervical vertebrae in humans is:', a: 7, wrong: [12, 5, 4, 8], why: 'There are 7 cervical vertebrae in the neck, followed by 12 thoracic and 5 lumbar vertebrae.' },
  { q: 'The number of thoracic vertebrae in humans is:', a: 12, wrong: [7, 5, 10, 24], why: 'There are 12 thoracic vertebrae, one for each pair of ribs.' },
  { q: 'The number of lumbar vertebrae in humans is:', a: 5, wrong: [7, 12, 4, 3], why: 'There are 5 lumbar vertebrae in the lower back.' },
  { q: 'The number of pairs of ribs in humans is:', a: 12, wrong: [7, 10, 24, 14], why: 'There are 12 pairs (24 ribs), one pair for each thoracic vertebra.' },
  { q: 'The number of pairs of true ribs (attached directly to the sternum by their own cartilage) is:', a: 7, wrong: [12, 5, 3, 2], why: 'The first 7 pairs are true ribs; pairs 8 to 10 are false ribs and pairs 11 and 12 are floating ribs.' },
  { q: 'The number of pairs of floating ribs in humans is:', a: 2, wrong: [3, 5, 7, 12], why: 'Pairs 11 and 12 have no anterior attachment, so there are 2 pairs of floating ribs.' },
  { q: 'The number of carpal bones in one human wrist is:', a: 8, wrong: [7, 5, 14, 27], why: 'Each wrist has 8 carpals; each ankle has 7 tarsals.' },
  { q: 'The number of tarsal bones in one human ankle is:', a: 7, wrong: [8, 5, 14, 26], why: 'Each ankle has 7 tarsals; each wrist has 8 carpals.' },
  { q: 'The number of phalanges in one human hand is:', a: 14, wrong: [15, 10, 5, 8], why: 'The thumb has 2 phalanges and each of the other four fingers has 3: $2 + 4(3) = 14$.' },
  { q: 'The number of ear ossicles in one human middle ear is:', a: 3, wrong: [2, 4, 6, 1], why: 'Each middle ear has 3 ossicles: malleus, incus and stapes.' },
];

// ---------------------------------------------------------------------------
// Joint types
// ---------------------------------------------------------------------------

interface JointType {
  name: string;
  /** [option text, site phrase used in a stem] */
  examples: readonly (readonly [option: string, site: string])[];
  note: string;
}

const JOINTS: readonly JointType[] = [
  {
    name: 'ball-and-socket joint',
    examples: [
      ['shoulder joint', 'between the humerus and the scapula at the shoulder'],
      ['hip joint', 'between the femur and the hip bone'],
    ],
    note: 'a rounded head fits a cup-like socket, allowing movement in all planes',
  },
  {
    name: 'hinge joint',
    examples: [
      ['elbow joint', 'between the humerus and the ulna at the elbow'],
      ['knee joint', 'between the femur and the tibia at the knee'],
      ['joint between two phalanges of a finger', 'between two phalanges of a finger'],
    ],
    note: 'movement occurs in one plane only, like a door hinge',
  },
  {
    name: 'pivot joint',
    // The proximal radio-ulnar pivot is left out: it lies inside the elbow joint capsule,
    // which would make "elbow joint" / "at the elbow" arguably a pivot joint as well.
    examples: [['joint between the atlas and the axis', 'between the atlas and the axis vertebrae']],
    note: 'one bone rotates around another',
  },
  {
    name: 'gliding joint',
    examples: [
      ['joints between the carpal bones', 'between the carpal bones of the wrist'],
      ['joints between the tarsal bones', 'between the tarsal bones of the ankle'],
    ],
    note: 'flat surfaces slide over one another',
  },
  {
    name: 'saddle joint',
    examples: [['carpometacarpal joint of the thumb', 'between the trapezium and the first metacarpal at the base of the thumb']],
    note: 'saddle-shaped surfaces allow the thumb to move across the palm',
  },
  {
    name: 'immovable (fibrous) joint',
    examples: [['sutures between the cranial bones', 'between the bones of the adult cranium (sutures)']],
    note: 'bones are bound by fibrous tissue and cannot move',
  },
  {
    name: 'slightly movable (cartilaginous) joint',
    examples: [
      ['joints between the bodies of adjacent vertebrae', 'between the bodies of adjacent vertebrae'],
      ['pubic symphysis', 'at the pubic symphysis'],
    ],
    note: 'bones are joined by cartilage that permits only slight movement',
  },
];

// ---------------------------------------------------------------------------
// Statement pools
// ---------------------------------------------------------------------------

const SKELETON_TRUTHS: readonly string[] = [
  'Bone matrix is hardened by calcium phosphate salts deposited on collagen fibres.',
  'Cartilage has no blood vessels; its cells obtain nutrients by diffusion through the matrix.',
  'Osteocytes are mature bone cells that lie in lacunae.',
  'Haversian canals carry blood vessels and nerves through compact bone.',
  'Synovial fluid lubricates freely movable joints and reduces friction.',
  'Ligaments are bands of connective tissue that join bone to bone.',
  'Red bone marrow is a site of blood cell formation.',
  'The sutures of the adult skull are immovable joints.',
];

const SKELETON_FALSEHOODS: readonly Falsehood[] = [
  ['Osteoclasts secrete new bone matrix.', 'Osteoblasts secrete bone matrix; osteoclasts dissolve (resorb) it.'],
  ['Cartilage is richly supplied with blood vessels.', 'Cartilage is avascular.'],
  ['Tendons join one bone to another bone.', 'Tendons join muscle to bone; ligaments join bone to bone.'],
  ['The pectoral girdle is part of the axial skeleton.', 'The girdles belong to the appendicular skeleton.'],
  ['The adult human skeleton consists of about 300 bones.', 'The adult skeleton has 206 bones (a newborn has more, which later fuse).'],
  ['Synovial joints are found between the bones of the cranium.', 'Cranial bones are joined by immovable fibrous sutures.'],
  ['Haversian canals are a feature of hyaline cartilage.', 'Haversian systems (osteons) are found in compact bone.'],
  ['The hip bone is formed by the fusion of the clavicle and scapula.', 'Each hip bone is formed by the fusion of ilium, ischium and pubis; clavicle and scapula form the pectoral girdle.'],
];

const MUSCLE_TRUTHS: readonly string[] = [
  'Skeletal muscle fibres are multinucleate and striated.',
  'Smooth muscle fibres are spindle-shaped, uninucleate and unstriated.',
  'Cardiac muscle fibres are branched and joined by intercalated discs.',
  'Thick filaments are made of myosin; thin filaments are made mainly of actin.',
  'A sarcomere is the part of a myofibril between two successive Z lines.',
  tex`ATP is needed to detach myosin heads from actin and to pump $\mathrm{Ca^{2+}}$ back into the sarcoplasmic reticulum.`,
  'The I band contains only thin filaments.',
];

const MUSCLE_FALSEHOODS: readonly Falsehood[] = [
  ['Smooth muscle is under voluntary control.', 'Smooth muscle is involuntary.'],
  ['Cardiac muscle fibres are unbranched and multinucleate.', 'Cardiac fibres are branched and usually have a single nucleus.'],
  ['During contraction the actin and myosin filaments themselves shorten.', 'The filaments keep their length; they slide past each other.'],
  ['Skeletal muscle fibres lack striations.', 'Skeletal muscle is striated.'],
  ['The A band shortens during muscle contraction.', 'The A band (length of the thick filaments) stays constant; the I band and H zone shorten.'],
  [tex`$\mathrm{Ca^{2+}}$ binds to tropomyosin to start contraction.`, tex`$\mathrm{Ca^{2+}}$ binds to troponin, which then shifts tropomyosin off the myosin-binding sites.`],
  ['Muscle relaxation does not require ATP.', tex`ATP is needed for cross-bridge detachment and for pumping $\mathrm{Ca^{2+}}$ back into the sarcoplasmic reticulum.`],
];

const PLANT_TRUTHS: readonly string[] = [
  'Turgor pressure in parenchyma cells keeps herbaceous stems and leaves firm.',
  'Collenchyma cells are living and have walls unevenly thickened with cellulose and pectin.',
  'Sclerenchyma cells are usually dead at maturity and have lignified secondary walls.',
  'Sclereids (stone cells) give pear fruit its gritty texture.',
  'The wood of a tree trunk is mainly secondary xylem produced by the vascular cambium.',
  'Herbaceous plants wilt when their cells lose turgor.',
];

const PLANT_FALSEHOODS: readonly Falsehood[] = [
  ['Collenchyma cell walls are heavily lignified.', 'Collenchyma walls are thickened with cellulose and pectin, not lignin.'],
  ['Sclerenchyma cells are living and actively dividing at maturity.', 'Mature sclerenchyma cells are usually dead.'],
  ['Wilting occurs when plant cells become fully turgid.', 'Wilting follows loss of turgor (flaccid cells).'],
  ['Wood is formed mainly of secondary phloem.', 'Wood is secondary xylem.'],
  ['Secondary growth in thickness is produced by the apical meristems.', 'Secondary growth comes from lateral meristems (vascular cambium and cork cambium).'],
  ['Sclerenchyma fibres are short, rounded cells found in pear fruit.', 'Fibres are long and tapering; the short gritty cells in pear are sclereids.'],
];

export default defineBank('biology', 'support-movement', (b) => [
  // -------------------------------------------------------------------------
  // Dynamic templates
  // -------------------------------------------------------------------------
  b.dynamic('bone-counts', { difficulty: 1, origin: 'past-paper', tags: ['skeleton'] }, (r) => {
    const item = r.pick(BONE_COUNTS);
    const wrong = r.sample(item.wrong, 3);
    return {
      stem: item.q,
      answer: String(item.a),
      distractors: wrong.map(String),
      explanation: item.why,
    };
  }),

  b.dynamic('joint-types', { difficulty: 1, tags: ['joints'] }, (r) => {
    const [target, ...others] = r.sample(JOINTS, 4) as [JointType, JointType, JointType, JointType];
    const [option, site] = r.pick(target.examples);
    const article = /^[aeiou]/i.test(target.name) ? 'an' : 'a';
    if (r.chance(0.5)) {
      // "joints between the carpal bones", "sutures between ..." are plural.
      const verb = /^(joints|sutures)\b/.test(option) ? `are ${target.name}s` : `is ${article} ${target.name}`;
      return {
        stem: `Which of the following is an example of ${article} ${target.name}?`,
        answer: option,
        distractors: others.map((j) => r.pick(j.examples)[0]),
        explanation: `The ${option} ${verb}: ${target.note}. The other options belong to other types (${others
          .map((j) => j.name)
          .join('; ')}).`,
      };
    }
    return {
      stem: `Which type of joint is found ${site}?`,
      answer: target.name,
      distractors: others.map((j) => j.name),
      explanation: `The joint ${site} is ${article} ${target.name}: ${target.note}.`,
    };
  }),

  b.dynamic('sarcomere-bands', { difficulty: 3, tags: ['muscles'] }, (r) => {
    const a = r.pick([15, 16]); // A band (thick filament length), tenths of a micrometre
    const kind = r.pick(['i-band', 'a-band', 'half-i'] as const);
    if (kind === 'i-band') {
      const s = r.int(a + 6, 34);
      const i = s - a;
      return {
        stem: tex`A relaxed sarcomere is ${um(s)} long and its A band measures ${um(a)}. The total length of the I band within this sarcomere (both halves together) is:`,
        answer: um(i),
        distractors: distinctOptions(um(i), [s + a, i / 2, s - 2 * a, s, a].filter((w) => w > 0).map(um)),
        explanation: tex`The sarcomere = A band + two half I bands, so I = $${num(s / 10)} - ${num(a / 10)} = ${num(i / 10)}\,\mu\mathrm{m}$.`,
      };
    }
    // Shortening d is an even number of tenths (0.4 to 1.2 um) so each half I band shortens exactly.
    // The contracted sarcomere keeps at least 0.6 um of I band (s2 >= a + 6), a physiological length.
    const d = 2 * r.int(2, 6);
    const s1 = r.int(a + 6 + d, 34);
    const s2 = s1 - d;
    if (kind === 'a-band') {
      return {
        stem: tex`A sarcomere with an A band of ${um(a)} contracts from ${um(s1)} to ${um(s2)}. The length of its A band after contraction is:`,
        answer: um(a),
        distractors: distinctOptions(um(a), [a - d / 2, a - d, Math.round((a * s2) / s1), s2 - a, a + d / 2].map(um)),
        explanation: tex`In the sliding-filament model the thick (myosin) filaments do not shorten, so the A band stays ${um(a)}. Only the I band (by ${um(d)} in total, both halves together) and the H zone shorten.`,
      };
    }
    return {
      stem: tex`A sarcomere contracts from ${um(s1)} to ${um(s2)}. By how much does each half I band (from a Z line to the edge of the A band) shorten?`,
      answer: um(d / 2),
      distractors: [um(d), um(2 * d), '$0\\,\\mu\\mathrm{m}$'],
      explanation: tex`The A band is constant, so the whole shortening of ${um(d)} comes from the two half I bands: each shortens by $${num(d / 10)} \div 2 = ${num(d / 20)}\,\mu\mathrm{m}$.`,
    };
  }),

  b.dynamic('skeleton-statements', { difficulty: 2, origin: 'past-paper', tags: ['skeleton', 'joints'] }, (r) =>
    statementItem(r, {
      stem: 'Which statement about the human skeleton is correct?',
      negativeStem: 'Which statement about the human skeleton is incorrect?',
      truths: SKELETON_TRUTHS,
      falsehoods: SKELETON_FALSEHOODS,
    }),
  ),

  b.dynamic('muscle-statements', { difficulty: 2, tags: ['muscles'] }, (r) =>
    statementItem(r, {
      stem: 'Which statement about muscles is correct?',
      negativeStem: 'Which statement about muscles is incorrect?',
      truths: MUSCLE_TRUTHS,
      falsehoods: MUSCLE_FALSEHOODS,
    }),
  ),

  b.dynamic('plant-support-statements', { difficulty: 2, tags: ['plant support'] }, (r) =>
    statementItem(r, {
      stem: 'Which statement about support in plants is correct?',
      negativeStem: 'Which statement about support in plants is incorrect?',
      truths: PLANT_TRUTHS,
      falsehoods: PLANT_FALSEHOODS,
    }),
  ),

  // -------------------------------------------------------------------------
  // Fixed questions
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'bone-forming-cells', d: 1, o: 'past-paper', t: ['skeleton'],
      q: 'The bone cells that secrete new bone matrix are:',
      a: 'osteoblasts',
      x: ['osteoclasts', 'chondrocytes', 'fibroblasts'],
      e: 'Osteoblasts lay down bone matrix and later become osteocytes; osteoclasts resorb bone and chondrocytes are cartilage cells.',
    },
    {
      id: 'bone-resorbing-cells', d: 1, t: ['skeleton'],
      q: 'Large multinucleate cells that dissolve bone matrix during remodelling are:',
      a: 'osteoclasts',
      x: ['osteoblasts', 'osteocytes', 'chondroblasts'],
      e: 'Osteoclasts break down (resorb) bone, releasing calcium; osteoblasts build bone and osteocytes maintain it.',
    },
    {
      id: 'ligament-joins', d: 1, o: 'past-paper', t: ['joints'],
      q: 'Ligaments connect:',
      a: 'bone to bone',
      x: ['muscle to bone', 'muscle to muscle', 'nerve to muscle'],
      e: 'Ligaments hold the bones of a joint together; tendons attach muscles to bones.',
    },
    {
      id: 'synovial-fluid', d: 1, t: ['joints'],
      q: 'The main function of synovial fluid in a freely movable joint is to:',
      a: 'lubricate the joint and reduce friction',
      x: ['attach the muscles to the bones', 'produce red blood cells for the bone', 'fuse the bones of the joint together'],
      e: 'Synovial fluid, secreted by the synovial membrane, lubricates the articular cartilages and nourishes them.',
    },
    {
      id: 'a-band-constant', d: 2, o: 'past-paper', t: ['muscles'],
      q: 'During contraction of a skeletal muscle, which of the following does NOT change in length?',
      a: 'A band',
      x: ['I band', 'H zone', 'Sarcomere'],
      e: 'The A band equals the length of the thick (myosin) filaments, which do not shorten. Thin filaments slide inward, so the I band, H zone and sarcomere all shorten.',
    },
    {
      id: 'calcium-binds-troponin', d: 2, o: 'past-paper', t: ['muscles'],
      q: tex`During skeletal muscle contraction, $\mathrm{Ca^{2+}}$ released from the sarcoplasmic reticulum binds to:`,
      a: 'troponin',
      x: ['tropomyosin', 'myosin heads', 'actin'],
      e: tex`$\mathrm{Ca^{2+}}$ binds troponin, which moves tropomyosin away from the binding sites on actin so that myosin heads can form cross-bridges.`,
    },
    {
      id: 'calcium-store', d: 1, t: ['muscles'],
      q: tex`In a skeletal muscle fibre, $\mathrm{Ca^{2+}}$ ions needed for contraction are stored in the:`,
      a: 'sarcoplasmic reticulum',
      x: ['sarcolemma', 'myofibrils', 'Z lines'],
      e: tex`The sarcoplasmic reticulum (the smooth ER of the muscle fibre) stores $\mathrm{Ca^{2+}}$ and releases it when an impulse arrives.`,
    },
    {
      id: 'nmj-transmitter', d: 1, t: ['muscles'],
      q: 'The neurotransmitter released at the neuromuscular junction of skeletal muscle is:',
      a: 'acetylcholine',
      x: ['adrenaline', 'dopamine', 'serotonin'],
      e: 'Motor neurons release acetylcholine, which depolarises the sarcolemma and triggers contraction.',
    },
    {
      id: 'rigor-mortis', d: 3, t: ['muscles'],
      q: 'Muscles become stiff a few hours after death (rigor mortis) because:',
      a: 'no ATP is available to detach myosin heads from actin',
      x: ['actin and myosin filaments shorten permanently', 'lactic acid dissolves the thin filaments', 'calcium ions are completely removed from the sarcoplasm'],
      e: tex`After death $\mathrm{Ca^{2+}}$ leaks into the sarcoplasm, cross-bridges form, but without ATP the myosin heads cannot detach, so the muscle stays locked.`,
    },
    {
      id: 'tetany-calcium', d: 2, t: ['muscles'],
      q: 'Tetany, a condition of sustained involuntary muscle spasms, is caused by a low blood level of:',
      a: 'calcium ions',
      x: ['potassium ions', 'glucose', 'sodium chloride'],
      e: 'Low blood calcium (hypocalcaemia) makes nerves and muscles over-excitable, producing tetany.',
    },
    {
      id: 'cardiac-intercalated', d: 2, t: ['muscles'],
      q: 'Which feature is found in cardiac muscle but NOT in skeletal muscle?',
      a: 'Intercalated discs',
      x: ['Striations', 'Actin and myosin filaments', 'Sarcomeres'],
      e: 'Both cardiac and skeletal muscle are striated with sarcomeres of actin and myosin; only cardiac fibres are joined end to end by intercalated discs.',
    },
    {
      id: 'elbow-flexor', d: 1, o: 'past-paper', t: ['muscles'],
      q: 'Bending (flexion) of the arm at the elbow is produced by contraction of the:',
      a: 'biceps',
      x: ['triceps', 'deltoid', 'gastrocnemius'],
      e: 'Biceps and triceps are an antagonistic pair: biceps flexes the elbow and triceps extends it.',
    },
    {
      id: 'osteoporosis', d: 2, o: 'past-paper', t: ['skeleton'],
      q: 'Osteoporosis is a disorder in which:',
      a: 'bone mass and density decrease, making bones fragile',
      x: [
        'articular cartilage wears away at the joints',
        'the synovial membrane is inflamed by an autoimmune attack',
        'bones of children soften due to vitamin D deficiency',
      ],
      e: 'Osteoporosis is loss of bone mass (common after menopause). Cartilage wear is osteoarthritis, autoimmune synovitis is rheumatoid arthritis and soft bones in children is rickets.',
    },
    {
      id: 'hip-bone-fusion', d: 2, t: ['skeleton'],
      q: 'Each hip bone (os coxae) of the pelvic girdle is formed by the fusion of:',
      a: 'ilium, ischium and pubis',
      x: ['clavicle, scapula and sternum', 'ilium, sacrum and coccyx', 'femur, patella and pubis'],
      e: 'Ilium, ischium and pubis fuse to form each hip bone; the sacrum and coccyx belong to the vertebral column.',
    },
    {
      id: 'exoskeleton-chitin', d: 1, o: 'past-paper', t: ['skeleton'],
      q: 'The exoskeleton of arthropods is mainly made of:',
      a: 'chitin',
      x: ['keratin', 'cellulose', 'collagen'],
      e: 'The arthropod cuticle is built of chitin, a nitrogen-containing polysaccharide; keratin forms hair and nails, cellulose forms plant cell walls.',
    },
    {
      id: 'hydrostatic-skeleton', d: 1, t: ['skeleton'],
      q: 'A hydrostatic skeleton is found in:',
      a: 'earthworm',
      x: ['cockroach', 'frog', 'crab'],
      e: 'The earthworm uses pressure of coelomic fluid against its body-wall muscles for support and movement; cockroach and crab have exoskeletons and frog an endoskeleton.',
    },
    {
      id: 'sclerenchyma', d: 1, o: 'past-paper', t: ['plant support'],
      q: 'The plant tissue made of dead cells with lignified walls that gives mechanical strength is:',
      a: 'sclerenchyma',
      x: ['collenchyma', 'parenchyma', 'epidermis'],
      e: 'Sclerenchyma (fibres and sclereids) has thick lignified secondary walls and is dead at maturity; collenchyma and parenchyma are living.',
    },
    {
      id: 'collenchyma', d: 1, t: ['plant support'],
      q: 'Living cells whose walls are thickened at the corners with cellulose and pectin, supporting young stems and petioles, form:',
      a: 'collenchyma',
      x: ['sclerenchyma', 'xylem vessels', 'cork'],
      e: 'Collenchyma is living, flexible supporting tissue with unevenly thickened cellulose-pectin walls; sclerenchyma, vessels and cork are dead and lignified or suberised.',
    },
  ]),
]);
