/**
 * Biology (FSc XII): Coordination and Control.
 *
 * Sub-topics: nervous system, neurons, hormones, plant hormones, behaviour.
 *
 * Conceptual items cover the parts of the human brain and spinal cord, receptors,
 * nervous systems of Hydra and Planaria, the autonomic system, nervous disorders,
 * the nerve impulse and the synapse, endocrine glands and their disorders, feedback,
 * plant hormones and plant movements, and innate and learned behaviour.
 *
 * Computational items: conduction time and speed of a nerve impulse, the change in
 * membrane potential during an action potential, the stoichiometry of the
 * sodium-potassium pump, and the total time taken by a reflex arc.
 */
import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, statementQuestion, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Up to four significant figures (all answers are chosen to be exact at this precision). */
const n4 = (x: number): string => num(x, { sig: 4 });

/** True when x has at most two decimal places (guards "nice" answers). */
const twoDp = (x: number): boolean => Math.abs(x * 100 - Math.round(x * 100)) < 1e-9;

/** True when n4 shows x exactly (keeps rounded-looking distractors such as 1111 or 1.667 out). */
const exact4 = (x: number): boolean => Number.isFinite(x) && Math.abs(Number(n4(x)) - x) < 1e-9;

const ms = (x: number): string => `$${n4(x)}\\,\\mathrm{ms}$`;

const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

interface ReasonedStatement {
  text: string;
  reason: string;
}

/** "Which statement is correct / NOT correct?" with an explanation for every option shown. */
function reasonedStatementQuestion(
  r: Rng,
  stem: string,
  negativeStem: string,
  truths: readonly ReasonedStatement[],
  falsehoods: readonly ReasonedStatement[],
): AuthoredQuestion {
  const all = [...truths, ...falsehoods];
  const reasonOf = (text: string): string => {
    const hit = all.find((s) => s.text === text);
    if (!hit) throw new Error(`coordination-control: no reason recorded for "${text}"`);
    return hit.reason;
  };
  const q = statementQuestion(r, {
    stem,
    negativeStem,
    truths: truths.map((s) => s.text),
    falsehoods: falsehoods.map((s) => s.text),
    explain: () => '',
  });
  const isTrue = (text: string): boolean => truths.some((s) => s.text === text);
  const lines = [q.answer, ...q.distractors].map(
    (text) => `**${isTrue(text) ? 'True' : 'False'}:** ${text} ${reasonOf(text)}`,
  );
  return { ...q, explanation: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const NEURON_TRUE: readonly ReasonedStatement[] = [
  { text: 'Dendrites carry impulses towards the cell body.', reason: 'Dendrites receive signals and conduct them to the cyton; the axon carries them away.' },
  {
    text: 'In a myelinated axon the impulse jumps from one node of Ranvier to the next.',
    reason: 'This saltatory conduction makes myelinated fibres conduct much faster than non-myelinated ones.',
  },
  {
    text: 'Depolarisation of the axon membrane is caused by an inflow of sodium ions.',
    reason: 'Voltage-gated $\\mathrm{Na^+}$ channels open and $\\mathrm{Na^+}$ rushes in, making the inside positive.',
  },
  {
    text: 'Repolarisation is caused mainly by an outflow of potassium ions.',
    reason: 'Voltage-gated $\\mathrm{K^+}$ channels open and $\\mathrm{K^+}$ leaves, restoring the negative inside.',
  },
  {
    text: 'At rest, the inside of the axon membrane is negative with respect to the outside.',
    reason: 'The resting membrane potential is about $-70\\,\\mathrm{mV}$ (inside negative).',
  },
  {
    text: 'A stimulus weaker than the threshold does not produce an action potential.',
    reason: 'The action potential obeys the all-or-none law: it is fired fully at or above threshold, or not at all.',
  },
  {
    text: 'Acetylcholine in the synaptic cleft is broken down by acetylcholinesterase.',
    reason: 'The enzyme hydrolyses acetylcholine so that the postsynaptic membrane is not stimulated continuously.',
  },
  {
    text: 'In peripheral nerves the myelin sheath is formed by Schwann cells.',
    reason: 'Schwann cells wrap around peripheral axons; oligodendrocytes do this job inside the CNS.',
  },
];

const NEURON_FALSE: readonly ReasonedStatement[] = [
  { text: 'The axon carries impulses towards the cell body.', reason: 'The axon carries impulses away from the cell body; dendrites carry them towards it.' },
  {
    text: 'Impulses travel faster in non-myelinated fibres than in myelinated fibres of the same diameter.',
    reason: 'It is the reverse: myelination allows saltatory conduction, which is much faster.',
  },
  {
    text: 'Depolarisation of the axon membrane is caused by an inflow of potassium ions.',
    reason: 'Depolarisation is due to $\\mathrm{Na^+}$ inflow; $\\mathrm{K^+}$ flows out during repolarisation.',
  },
  {
    text: 'At rest, the inside of the axon membrane is positive with respect to the outside.',
    reason: 'At rest the inside is negative (about $-70\\,\\mathrm{mV}$); it becomes positive only during an action potential.',
  },
  {
    text: 'A stronger stimulus produces a taller action potential in the same neuron.',
    reason: 'Action potentials are all-or-none and have a fixed size; a stronger stimulus raises their frequency instead.',
  },
  {
    text: 'Impulses can cross a chemical synapse in either direction.',
    reason: 'Transmitter is released only from the presynaptic knob and its receptors are on the postsynaptic membrane, so transmission is one-way.',
  },
  {
    text: 'In peripheral nerves the myelin sheath is formed by oligodendrocytes.',
    reason: 'Oligodendrocytes myelinate axons in the CNS; peripheral axons are myelinated by Schwann cells.',
  },
  {
    text: 'The sodium-potassium pump moves two sodium ions out for every three potassium ions it brings in.',
    reason: 'The pump moves three $\\mathrm{Na^+}$ out and two $\\mathrm{K^+}$ in for each ATP used.',
  },
];

interface HormoneEntry {
  hormone: string;
  source: string;
  note: string;
  /** Other listed sources that also secrete this hormone (never paired with it as a wrong option). */
  alsoFrom?: readonly string[];
}

/** Hormones whose source gland is beyond dispute at FSc level (no option ever names the hypothalamus). */
const HORMONES: readonly HormoneEntry[] = [
  { hormone: 'insulin', source: 'beta cells of the islets of Langerhans', note: 'Insulin lowers blood glucose.' },
  { hormone: 'glucagon', source: 'alpha cells of the islets of Langerhans', note: 'Glucagon raises blood glucose.' },
  { hormone: 'thyroxine', source: 'thyroid gland', note: 'Thyroxine raises the basal metabolic rate.' },
  { hormone: 'calcitonin', source: 'thyroid gland', note: 'Calcitonin lowers blood calcium.' },
  { hormone: 'parathormone', source: 'parathyroid glands', note: 'Parathormone raises blood calcium.' },
  { hormone: 'adrenaline', source: 'adrenal medulla', note: 'Adrenaline prepares the body for "fight or flight".' },
  { hormone: 'aldosterone', source: 'adrenal cortex', note: 'Aldosterone increases $\\mathrm{Na^+}$ reabsorption in the kidney.' },
  { hormone: 'cortisol', source: 'adrenal cortex', note: 'Cortisol is a glucocorticoid released in long-term stress.' },
  { hormone: 'growth hormone (somatotrophin)', source: 'anterior lobe of the pituitary', note: 'Growth hormone promotes growth of bones and muscles.' },
  { hormone: 'thyroid-stimulating hormone (TSH)', source: 'anterior lobe of the pituitary', note: 'TSH stimulates the thyroid to secrete thyroxine.' },
  {
    hormone: 'melatonin',
    source: 'pineal gland',
    note: 'Melatonin is linked to daily (circadian) rhythms.',
    alsoFrom: ['lining of the stomach', 'lining of the duodenum'], // enterochromaffin cells of the gut also make melatonin
  },
  {
    hormone: 'testosterone',
    source: 'interstitial (Leydig) cells of the testes',
    note: 'Testosterone controls male secondary sexual characters.',
    alsoFrom: ['adrenal cortex'], // the adrenal cortex also secretes small amounts of androgens
  },
  { hormone: 'secretin', source: 'lining of the duodenum', note: 'Secretin stimulates the pancreas to release bicarbonate-rich juice.' },
  {
    hormone: 'gastrin',
    source: 'lining of the stomach',
    note: 'Gastrin stimulates secretion of gastric juice.',
    alsoFrom: ['lining of the duodenum'], // G cells also occur in the duodenum
  },
];

type PlantHormone = 'auxin' | 'gibberellin' | 'cytokinin' | 'abscisic acid' | 'ethylene';

const PLANT_HORMONES: readonly PlantHormone[] = ['auxin', 'gibberellin', 'cytokinin', 'abscisic acid', 'ethylene'];

/** Effects that are clearly the hallmark of one plant hormone only. */
const PLANT_EFFECTS: Readonly<Record<PlantHormone, readonly string[]>> = {
  auxin: [
    'maintains apical dominance by suppressing the growth of lateral buds',
    'is applied to stem cuttings (as rooting powder) to make them form adventitious roots',
    'causes a shoot tip to bend towards light coming from one side',
  ],
  gibberellin: [
    'causes bolting (rapid elongation of the flower stalk) in cabbage',
    'makes genetically dwarf pea plants grow to normal height',
    'stimulates amylase synthesis in germinating cereal grains',
  ],
  cytokinin: [
    'promotes the growth of lateral buds, counteracting apical dominance',
    'delays the yellowing and senescence of detached leaves',
  ],
  'abscisic acid': [
    'causes stomata to close when the plant is short of water',
    'induces dormancy in buds and seeds',
  ],
  ethylene: [
    'is a gas that hastens the ripening of fruits such as bananas',
  ],
};

const PLANT_NOTE: Readonly<Record<PlantHormone, string>> = {
  auxin: 'Auxin (IAA), made in shoot tips, promotes cell elongation, phototropism, apical dominance and rooting of cuttings.',
  gibberellin: 'Gibberellins cause stem elongation and bolting, break seed dormancy and induce amylase in cereal grains.',
  cytokinin: 'Cytokinins promote cell division, stimulate the growth of lateral buds (opposing apical dominance) and delay leaf senescence.',
  'abscisic acid': 'Abscisic acid is the stress hormone: it closes stomata and keeps buds and seeds dormant.',
  ethylene: 'Ethylene is a gaseous hormone that promotes fruit ripening.',
};

type Behaviour =
  | 'imprinting'
  | 'habituation'
  | 'classical conditioning'
  | 'operant conditioning'
  | 'insight learning'
  | 'kinesis'
  | 'taxis';

const BEHAVIOUR_EXAMPLES: Readonly<Record<Behaviour, readonly string[]>> = {
  imprinting: [
    'newly hatched goslings follow the first large moving object they see and become attached to it',
    'ducklings raised by a hen follow the hen as if she were their mother',
  ],
  habituation: [
    'a snail stops withdrawing into its shell after the surface it crawls on has been tapped many times',
    'crows stop being frightened of a scarecrow after seeing it in a field for several days',
  ],
  'classical conditioning': [
    'a dog salivates at the sound of a bell that has repeatedly been rung just before it was fed',
    'a cat salivates at the sound of a tin opener that has always been used just before its meals',
  ],
  'operant conditioning': [
    'a rat learns to press a lever because pressing it delivers a food pellet',
    'a pigeon learns to peck a coloured key because doing so is rewarded with grain',
  ],
  'insight learning': [
    'a chimpanzee suddenly stacks boxes to reach bananas hung out of reach, without trial and error',
    'a chimpanzee joins two short sticks to rake in food that neither stick alone can reach',
  ],
  kinesis: ['woodlice move about faster in dry places and slow down in damp places, so they collect in damp areas'],
  taxis: ['Euglena swims directly towards a source of light'],
};

const BEHAVIOUR_NOTE: Readonly<Record<Behaviour, string>> = {
  imprinting: 'Imprinting is rapid learning during a short sensitive period early in life (studied by Konrad Lorenz).',
  habituation: 'Habituation is learning to ignore a repeated stimulus that brings neither reward nor harm.',
  'classical conditioning': 'In classical conditioning a neutral stimulus comes to trigger a reflex response after being paired with the natural stimulus (Pavlov).',
  'operant conditioning': 'In operant (trial-and-error) conditioning an animal links its own action with a reward or punishment (Skinner).',
  'insight learning': 'Insight learning is solving a new problem by reasoning, without trial and error (Köhler, chimpanzees).',
  kinesis: 'A kinesis is an innate, non-directional change in the rate of movement in response to the intensity of a stimulus.',
  taxis: 'A taxis is an innate movement of the whole organism directly towards or away from a stimulus.',
};

const BEHAVIOURS = Object.keys(BEHAVIOUR_EXAMPLES) as Behaviour[];

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('biology', 'coordination-control', (b) => [
  // ---------------- Neurons: statements (dynamic) ----------------
  b.dynamic('neuron-statements', { difficulty: 2, tags: ['neurons'] }, (r) =>
    reasonedStatementQuestion(
      r,
      'Which of the following statements about neurons and the nerve impulse is correct?',
      'Which of the following statements about neurons and the nerve impulse is NOT correct?',
      NEURON_TRUE,
      NEURON_FALSE,
    ),
  ),

  // ---------------- Neurons: conduction time or speed (dynamic) ----------------
  b.dynamic('impulse-time-speed', { difficulty: 2, tags: ['neurons'] }, (r) => {
    if (r.chance(0.5)) {
      // Find the time.
      let v = 100;
      let len = 1;
      for (let tries = 0; tries < 200; tries++) {
        v = r.pick([40, 50, 60, 75, 80, 100, 120]); // realistic for myelinated motor axons
        len = r.pick([0.4, 0.5, 0.6, 0.75, 0.8, 0.9, 1, 1.2]);
        if (twoDp((len * 1000) / v)) break;
      }
      const t = (len * 1000) / v;
      const { answer, distractors } = numericOptions(r, {
        correct: t,
        wrong: [
          (len * 100) / v, // m to cm slip
          (len * 10000) / v, // extra factor of 10
          (v / len) * 10, // inverted the ratio
          len * v, // multiplied instead of dividing
        ].filter(exact4),
        format: ms,
        fallback: 'offset',
      });
      return {
        stem: tex`A nerve impulse travels along a myelinated motor axon of length $${n4(len)}\,\mathrm{m}$ at a speed of $${v}\,\mathrm{m\,s^{-1}}$. The time taken by the impulse to cover the whole axon is:`,
        answer,
        distractors,
        explanation: tex`$t = \dfrac{d}{v} = \dfrac{${n4(len)}\,\mathrm{m}}{${v}\,\mathrm{m\,s^{-1}}} = ${n4(len / v)}\,\mathrm{s} = ${n4(t)}\,\mathrm{ms}$.`,
      };
    }
    // Find the speed: d cm in t ms gives v = 10 d / t m/s.
    let d = 60;
    let t = 6;
    for (let tries = 0; tries < 200; tries++) {
      d = r.multiple(20, 120, 10);
      t = r.int(2, 25);
      // Keep the speed physiological (nerve fibres conduct at no more than about 120 m/s).
      if (twoDp((10 * d) / t) && (10 * d) / t <= 120) break;
    }
    const v = (10 * d) / t;
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      wrong: [
        d / t, // left the answer in cm per ms
        (100 * d) / t, // conversion slip of a factor of 10
        (10 * t) / d, // inverted the ratio
        d * t, // multiplied
      ].filter(exact4),
      format: (x) => `$${n4(x)}\\,\\mathrm{m\\,s^{-1}}$`,
      fallback: 'offset',
    });
    return {
      stem: tex`Two electrodes are placed $${d}\,\mathrm{cm}$ apart on a nerve fibre. An impulse takes $${t}\,\mathrm{ms}$ to pass from the first electrode to the second. The conduction speed of the fibre is:`,
      answer,
      distractors,
      explanation: tex`$v = \dfrac{d}{t} = \dfrac{${num(d / 100, { dp: 2 })}\,\mathrm{m}}{${num(t / 1000, { sig: 4 })}\,\mathrm{s}} = ${n4(v)}\,\mathrm{m\,s^{-1}}$.`,
    };
  }),

  // ---------------- Neurons: change in membrane potential (dynamic) ----------------
  b.dynamic('action-potential-change', { difficulty: 2, tags: ['neurons'] }, (r) => {
    const rest = -r.int(60, 80); // typical neuronal resting potentials
    const peak = r.int(20, 50);
    const change = peak - rest;
    const { answer, distractors } = numericOptions(r, {
      correct: change,
      wrong: [
        -rest - peak, // subtracted the magnitudes
        -rest, // only the resting value
        peak, // only the peak value
        change + 2 * peak,
      ],
      format: (x) => `$${x}\\,\\mathrm{mV}$`,
    });
    return {
      stem: tex`The resting membrane potential of an axon is $${rest}\,\mathrm{mV}$. At the peak of an action potential the inside of the membrane reaches $+${peak}\,\mathrm{mV}$. The total change in membrane potential during depolarisation is:`,
      answer,
      distractors,
      explanation: tex`Change $=$ peak $-$ resting $= (+${peak}) - (${rest}) = ${peak} + ${-rest} = ${change}\,\mathrm{mV}$. The potential crosses zero, so the two magnitudes add.`,
    };
  }),

  // ---------------- Neurons: sodium-potassium pump (dynamic) ----------------
  b.dynamic('sodium-potassium-pump', { difficulty: 2, tags: ['neurons'] }, (r) => {
    const n = r.multiple(20, 600, 10);
    const kind = r.pick(['na', 'k', 'net'] as const);
    const correct = kind === 'na' ? 3 * n : kind === 'k' ? 2 * n : n;
    const asked =
      kind === 'na'
        ? 'number of sodium ions pumped out of the cell'
        : kind === 'k'
          ? 'number of potassium ions pumped into the cell'
          : 'net number of positive charges moved out of the cell';
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: kind === 'net' ? [5 * n, 3 * n, 2 * n] : kind === 'na' ? [2 * n, 5 * n, n, 1.5 * n] : [3 * n, 5 * n, n, 1.5 * n],
      format: (x) => `$${num(x)}$`,
    });
    return {
      stem: tex`In a resting neuron the $\mathrm{Na^+/K^+}$ pump hydrolyses $${n}$ molecules of ATP. The ${asked} is:`,
      answer,
      distractors,
      explanation: tex`Each ATP drives the export of $3\,\mathrm{Na^+}$ and the import of $2\,\mathrm{K^+}$ (net $1$ positive charge out). For $${n}$ ATP: $\mathrm{Na^+}$ out $= 3(${n}) = ${3 * n}$, $\mathrm{K^+}$ in $= 2(${n}) = ${2 * n}$, net charge out $= ${n}$. So the answer is $${correct}$.`,
    };
  }),

  // ---------------- Nervous system: reflex arc time (dynamic) ----------------
  b.dynamic('reflex-arc-time', { difficulty: 3, tags: ['nervous system', 'neurons'] }, (r) => {
    let l1 = 0.8;
    let v1 = 80;
    let l2 = 0.9;
    let v2 = 100;
    for (let tries = 0; tries < 300; tries++) {
      l1 = r.pick([0.4, 0.5, 0.6, 0.75, 0.8, 0.9, 1, 1.2]);
      l2 = r.pick([0.4, 0.5, 0.6, 0.75, 0.8, 0.9, 1, 1.2]);
      v1 = r.pick([40, 50, 60, 75, 80, 100, 120]);
      v2 = r.pick([40, 50, 60, 75, 80, 100, 120]);
      if (v1 !== v2 && twoDp((l1 * 1000) / v1) && twoDp((l2 * 1000) / v2)) break;
    }
    const delay = r.pick([0.5, 0.6, 0.8, 1]);
    const t1 = (l1 * 1000) / v1;
    const t2 = (l2 * 1000) / v2;
    const total = t1 + t2 + 2 * delay;
    const { answer, distractors } = numericOptions(r, {
      correct: total,
      wrong: [
        t1 + t2, // ignored synaptic delays
        t1 + t2 + delay, // counted only one synapse
        2 * t1 + 2 * delay, // used the sensory neuron twice
        2 * t2 + 2 * delay, // used the motor neuron twice
        (l1 * 1000) / v2 + (l2 * 1000) / v1 + 2 * delay, // swapped the two speeds
      ].filter(exact4),
      format: ms,
    });
    return {
      stem: tex`In a reflex arc, an impulse travels $${n4(l1)}\,\mathrm{m}$ along a sensory neuron at $${v1}\,\mathrm{m\,s^{-1}}$, crosses two synapses in the spinal cord (via an associative neuron of negligible length), each with a delay of $${n4(delay)}\,\mathrm{ms}$, and then travels $${n4(l2)}\,\mathrm{m}$ along a motor neuron at $${v2}\,\mathrm{m\,s^{-1}}$ to reach the effector. The total time taken by the impulse to travel from the receptor to the effector is:`,
      answer,
      distractors,
      explanation: tex`Sensory: $\dfrac{${n4(l1)}}{${v1}}\,\mathrm{s} = ${n4(t1)}\,\mathrm{ms}$. Motor: $\dfrac{${n4(l2)}}{${v2}}\,\mathrm{s} = ${n4(t2)}\,\mathrm{ms}$. Synapses: $2 \times ${n4(delay)} = ${n4(2 * delay)}\,\mathrm{ms}$. Total $= ${n4(t1)} + ${n4(t2)} + ${n4(2 * delay)} = ${n4(total)}\,\mathrm{ms}$.`,
    };
  }),

  // ---------------- Hormones: gland and hormone (dynamic) ----------------
  b.dynamic('hormone-source', { difficulty: 1, origin: 'past-paper', tags: ['hormones'] }, (r) => {
    const entry = r.pick(HORMONES);
    // A wrong option must not be a gland that also secretes the hormone (in either direction).
    const others = HORMONES.filter(
      (h) =>
        h.source !== entry.source &&
        !(entry.alsoFrom ?? []).includes(h.source) &&
        !(h.alsoFrom ?? []).includes(entry.source),
    );
    if (r.chance(0.5)) {
      const distractors = pickDistractors(
        capFirst(entry.source),
        others.map((h) => capFirst(h.source)),
        r,
      );
      return {
        stem: `${capFirst(entry.hormone)} is secreted by the:`,
        answer: capFirst(entry.source),
        distractors,
        explanation: `${capFirst(entry.hormone)} is secreted by the ${entry.source}. ${entry.note}`,
      };
    }
    const distractors = pickDistractors(
      capFirst(entry.hormone),
      others.map((h) => capFirst(h.hormone)),
      r,
    );
    const reasons = distractors
      .map((d) => {
        const h = HORMONES.find((x) => capFirst(x.hormone) === d) as HormoneEntry;
        return `${d} comes from the ${h.source}.`;
      })
      .join(' ');
    return {
      stem: `Which of the following hormones is secreted by the ${entry.source}?`,
      answer: capFirst(entry.hormone),
      distractors,
      explanation: `${capFirst(entry.hormone)} is secreted by the ${entry.source}. ${entry.note} ${reasons}`,
    };
  }),

  // ---------------- Plant hormones: effect and hormone (dynamic) ----------------
  b.dynamic('plant-hormone-effect', { difficulty: 1, origin: 'past-paper', tags: ['plant hormones'] }, (r) => {
    const hormone = r.pick(PLANT_HORMONES);
    const others = PLANT_HORMONES.filter((h) => h !== hormone);
    if (r.chance(0.6)) {
      const effect = r.pick(PLANT_EFFECTS[hormone]);
      const distractors = r.sample(others, 3).map(capFirst);
      return {
        stem: `Which plant hormone ${effect}?`,
        answer: capFirst(hormone),
        distractors,
        explanation: PLANT_NOTE[hormone],
      };
    }
    const effect = r.pick(PLANT_EFFECTS[hormone]);
    const wrongHormones = r.sample(others, 3);
    const wrongEffects = wrongHormones.map((h) => ({ h, effect: r.pick(PLANT_EFFECTS[h]) }));
    const distractors = wrongEffects.map((w) => capFirst(`it ${w.effect}`));
    return {
      stem: `Which of the following is a characteristic effect of ${hormone}?`,
      answer: capFirst(`it ${effect}`),
      distractors,
      explanation: `${PLANT_NOTE[hormone]} ${wrongEffects.map((w) => `"${capFirst(w.effect)}" describes ${w.h}.`).join(' ')}`,
    };
  }),

  // ---------------- Behaviour: classify an example (dynamic) ----------------
  b.dynamic('behaviour-type', { difficulty: 1, tags: ['behaviour'] }, (r) => {
    const type = r.pick(BEHAVIOURS);
    const example = r.pick(BEHAVIOUR_EXAMPLES[type]);
    const distractors = r.sample(
      BEHAVIOURS.filter((t) => t !== type),
      3,
    ).map(capFirst);
    return {
      stem: `When ${example}, the behaviour shown is an example of:`,
      answer: capFirst(type),
      distractors,
      explanation: BEHAVIOUR_NOTE[type],
    };
  }),

  // ---------------- Fixed questions ----------------
  ...b.mcqs([
    // Nervous system
    {
      id: 'cerebellum-balance',
      d: 1,
      o: 'past-paper',
      t: ['nervous system'],
      q: 'The part of the human brain that coordinates muscular movements and maintains body balance is the:',
      a: 'cerebellum',
      x: ['medulla oblongata', 'thalamus', 'hypothalamus'],
      e: 'The cerebellum (hindbrain) fine-tunes voluntary movements and keeps posture and balance. The medulla controls vital reflexes, the thalamus relays sensory signals and the hypothalamus regulates temperature, hunger and thirst.',
    },
    {
      id: 'medulla-vital-centres',
      d: 1,
      o: 'past-paper',
      t: ['nervous system'],
      q: 'The centres that regulate breathing rate, heart rate and blood pressure lie in the:',
      a: 'medulla oblongata',
      x: ['cerebellum', 'cerebrum', 'thalamus'],
      e: 'The medulla oblongata contains the cardiovascular and respiratory centres, which is why damage to it is often fatal.',
    },
    {
      id: 'corpus-callosum',
      d: 1,
      t: ['nervous system'],
      q: 'The two cerebral hemispheres are connected by a thick band of nerve fibres called the:',
      a: 'corpus callosum',
      x: ['pons', 'medulla oblongata', 'thalamus'],
      e: 'The corpus callosum is a broad band of white matter that lets the left and right hemispheres exchange information.',
    },
    {
      id: 'spinal-nerves-pairs',
      d: 1,
      o: 'past-paper',
      t: ['nervous system'],
      q: 'The number of pairs of spinal nerves in humans is:',
      a: '31',
      x: ['12', '33', '24'],
      e: 'Humans have 31 pairs of spinal nerves and 12 pairs of cranial nerves. The figure 33 is the number of vertebrae before the sacral and coccygeal vertebrae fuse.',
    },
    {
      id: 'meissner-touch',
      d: 1,
      t: ['nervous system'],
      q: 'Receptors in the skin that are sensitive to light touch are:',
      a: "Meissner's corpuscles",
      x: ['Pacinian corpuscles', 'rod cells', 'muscle spindles'],
      e: "Meissner's corpuscles lie just below the epidermis and respond to light touch. Pacinian corpuscles respond to deep pressure, rods to dim light and muscle spindles to stretch.",
    },
    {
      id: 'hydra-nerve-net',
      d: 1,
      t: ['nervous system'],
      q: 'The nervous system of Hydra consists of:',
      a: 'a diffuse nerve net without a brain',
      x: [
        'a ladder-like system with a pair of cerebral ganglia',
        'a dorsal hollow nerve cord with a brain',
        'a double ventral nerve cord with segmental ganglia',
      ],
      e: 'Hydra (a cnidarian) has a simple net of neurons spread through its body wall. Planaria has a ladder-like system with cerebral ganglia; chordates have a dorsal hollow nerve cord.',
    },
    {
      id: 'spinal-cord-grey-matter',
      d: 2,
      t: ['nervous system'],
      q: 'In a transverse section of the spinal cord, the grey matter:',
      a: 'forms an inner H-shaped core surrounded by white matter',
      x: [
        'forms an outer layer surrounding the white matter',
        'is absent, the cord being made only of white matter',
        'consists mainly of myelinated nerve fibres',
      ],
      e: 'In the spinal cord the grey matter (cell bodies) is central and butterfly- or H-shaped, while the white matter (myelinated tracts) lies outside it. In the cerebrum the arrangement is the reverse.',
    },
    {
      id: 'sympathetic-not-effect',
      d: 2,
      t: ['nervous system'],
      q: 'Which of the following is NOT an effect of stimulation by the sympathetic nervous system?',
      a: 'constriction of the pupils',
      x: ['increase in heart rate', 'dilation of the bronchioles', 'slowing of peristalsis in the gut'],
      e: 'The sympathetic system prepares the body for "fight or flight": it speeds the heart, widens the airways and pupils and slows digestion. Constriction of the pupils is a parasympathetic effect.',
    },
    {
      id: 'parkinsons-dopamine',
      d: 2,
      o: 'past-paper',
      t: ['nervous system'],
      q: "Parkinson's disease, marked by tremors and muscular rigidity, is associated with a deficiency of the neurotransmitter:",
      a: 'dopamine',
      x: ['acetylcholine', 'serotonin', 'adrenaline'],
      e: "In Parkinson's disease, dopamine-producing neurons of the midbrain degenerate, so the control of movement is disturbed. Treatment aims to raise dopamine levels (e.g. with L-dopa).",
    },

    // Neurons
    {
      id: 'associative-neurons',
      d: 1,
      t: ['neurons'],
      q: 'Neurons that lie entirely within the brain and spinal cord and link sensory neurons with motor neurons are:',
      a: 'associative neurons (interneurons)',
      x: ['sensory neurons', 'motor neurons', 'Schwann cells'],
      e: 'Associative neurons are found only in the CNS and connect sensory and motor neurons. Sensory and motor neurons extend into the periphery; Schwann cells are not neurons at all.',
    },
    {
      id: 'resting-potential',
      d: 1,
      o: 'past-paper',
      t: ['neurons'],
      q: 'The resting membrane potential of a typical neuron is about:',
      a: tex`$-70\,\mathrm{mV}$`,
      x: [tex`$+70\,\mathrm{mV}$`, tex`$+40\,\mathrm{mV}$`, tex`$-7\,\mathrm{mV}$`],
      e: 'At rest the inside of the axon is about $70\\,\\mathrm{mV}$ negative to the outside. A positive value of about $+30$ to $+40\\,\\mathrm{mV}$ is reached only at the peak of an action potential.',
    },
    {
      id: 'calcium-transmitter-release',
      d: 2,
      t: ['neurons'],
      q: 'The release of neurotransmitter from synaptic vesicles into the synaptic cleft is triggered by the entry of:',
      a: 'calcium ions into the synaptic knob',
      x: ['sodium ions into the synaptic knob', 'potassium ions into the synaptic knob', 'chloride ions into the synaptic knob'],
      e: 'When an impulse reaches the synaptic knob, voltage-gated $\\mathrm{Ca^{2+}}$ channels open; the inflow of calcium makes the vesicles fuse with the presynaptic membrane and release their transmitter by exocytosis.',
    },
    {
      id: 'cholinesterase-inhibitor',
      d: 3,
      t: ['neurons'],
      q: 'A nerve poison inactivates acetylcholinesterase at cholinergic synapses. The most likely immediate result is that:',
      a: 'acetylcholine persists in the cleft and keeps stimulating the postsynaptic membrane',
      x: [
        'acetylcholine is no longer released from the presynaptic knob',
        'impulses can no longer reach the presynaptic knob',
        'acetylcholine is broken down faster than normal in the cleft',
      ],
      e: 'Acetylcholinesterase normally hydrolyses acetylcholine within milliseconds. If the enzyme is blocked, acetylcholine accumulates and the postsynaptic cell (e.g. a muscle) is stimulated continuously, causing spasms. Release of the transmitter and conduction to the knob are not affected.',
    },

    // Hormones
    {
      id: 'cretinism',
      d: 1,
      o: 'past-paper',
      t: ['hormones'],
      q: 'Deficiency of thyroxine during childhood causes:',
      a: 'cretinism',
      x: ['myxoedema', 'acromegaly', 'exophthalmic goitre'],
      e: 'Hypothyroidism in children causes cretinism (stunted growth and impaired mental development). In adults it causes myxoedema; exophthalmic goitre results from excess thyroxine and acromegaly from excess growth hormone in adults.',
    },
    {
      id: 'acromegaly',
      d: 1,
      t: ['hormones'],
      q: 'Over-secretion of growth hormone in an adult causes:',
      a: 'acromegaly',
      x: ['gigantism', 'cretinism', 'myxoedema'],
      e: 'In adults the long bones can no longer lengthen, so excess growth hormone thickens the bones of the hands, feet and face (acromegaly). Gigantism results only when the excess occurs before growth stops, in childhood.',
    },
    {
      id: 'diabetes-insipidus',
      d: 2,
      o: 'past-paper',
      t: ['hormones'],
      q: 'Diabetes insipidus, in which large volumes of dilute urine are passed, results from a deficiency of:',
      a: 'antidiuretic hormone (ADH)',
      x: ['insulin', 'glucagon', 'thyroxine'],
      e: 'Without ADH the collecting ducts stay impermeable to water, so little water is reabsorbed and copious dilute urine is formed. Insulin deficiency causes diabetes mellitus, in which the urine contains glucose.',
    },
    {
      id: 'calcium-hormones',
      d: 2,
      t: ['hormones'],
      q: 'Parathormone and calcitonin regulate the level of calcium in the blood. Which statement is correct?',
      a: 'Parathormone raises blood calcium and calcitonin lowers it.',
      x: [
        'Parathormone lowers blood calcium and calcitonin raises it.',
        'Both hormones raise blood calcium.',
        'Both hormones lower blood calcium.',
      ],
      e: 'Parathormone (parathyroid glands) raises blood $\\mathrm{Ca^{2+}}$ by releasing it from bone and increasing its absorption; calcitonin (thyroid) lowers it by promoting deposition in bone. They act antagonistically.',
    },
    {
      id: 'thyroxine-negative-feedback',
      d: 2,
      t: ['hormones'],
      q: 'A high level of thyroxine in the blood acts on the hypothalamus and anterior pituitary to:',
      a: 'reduce the secretion of TSH',
      x: ['increase the secretion of TSH', 'increase the secretion of thyroxine further', 'stimulate the release of calcitonin'],
      e: 'This is negative feedback: excess thyroxine inhibits the release of TRH and TSH, so the thyroid is stimulated less and thyroxine falls back to normal. Increasing TSH would be positive feedback.',
    },

    // Plant hormones and movements
    {
      id: 'ethylene-gas',
      d: 1,
      t: ['plant hormones'],
      q: 'The plant hormone that exists as a gas is:',
      a: 'ethylene',
      x: ['auxin', 'gibberellin', 'abscisic acid'],
      e: 'Ethylene ($\\mathrm{C_2H_4}$) is a gaseous hormone that hastens fruit ripening. The other hormones are non-volatile compounds carried in solution.',
    },
    {
      id: 'gibberellin-fungus',
      d: 2,
      t: ['plant hormones'],
      q: "Gibberellins were first identified from a fungus that causes 'foolish seedling' disease of rice. The fungus is:",
      a: 'Gibberella fujikuroi',
      x: ['Penicillium notatum', 'Rhizopus stolonifer', 'Saccharomyces cerevisiae'],
      e: 'Rice seedlings infected with Gibberella fujikuroi grow abnormally tall because the fungus secretes gibberellin. Penicillium gives penicillin, Rhizopus is bread mould and Saccharomyces is yeast.',
    },
    {
      id: 'tendril-thigmotropism',
      d: 1,
      t: ['plant hormones'],
      q: 'The coiling of a tendril around a support is an example of:',
      a: 'thigmotropism',
      x: ['phototropism', 'geotropism', 'chemotropism'],
      e: 'Thigmotropism is a growth movement in response to contact. Cells on the side away from the support grow faster, so the tendril curls around it. Phototropism, geotropism and chemotropism are responses to light, gravity and chemicals.',
    },

    // Behaviour
    {
      id: 'imprinting-lorenz',
      d: 1,
      o: 'past-paper',
      t: ['behaviour'],
      q: 'The scientist who studied imprinting in newly hatched geese is:',
      a: 'Konrad Lorenz',
      x: ['Ivan Pavlov', 'B. F. Skinner', 'Wolfgang Köhler'],
      e: 'Konrad Lorenz showed that goslings follow the first moving object they see in a short sensitive period after hatching. Pavlov studied classical conditioning, Skinner operant conditioning and Köhler insight learning.',
    },
    {
      id: 'pavlov-conditioning',
      d: 1,
      o: 'past-paper',
      t: ['behaviour'],
      q: "Pavlov's experiments, in which dogs learned to salivate at the sound of a bell, demonstrated:",
      a: 'classical conditioning',
      x: ['operant conditioning', 'imprinting', 'habituation'],
      e: 'A neutral stimulus (bell) paired repeatedly with food (natural stimulus) came to trigger the salivation reflex on its own: a conditioned reflex. Operant conditioning instead links the animal’s own action with a reward.',
    },
    {
      id: 'insight-kohler',
      d: 2,
      t: ['behaviour'],
      q: 'Insight learning was studied in chimpanzees by:',
      a: 'Wolfgang Köhler',
      x: ['Ivan Pavlov', 'Konrad Lorenz', 'B. F. Skinner'],
      e: 'Köhler showed that chimpanzees could solve a new problem (reaching hanging bananas with boxes or sticks) suddenly, by reasoning rather than by trial and error.',
    },
  ]),
]);
