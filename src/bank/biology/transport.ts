/**
 * Biology (FSc Part I): Transport.
 *
 * Sub-topics: transport in plants, heart and blood vessels, blood, lymphatic system, immunity.
 *
 * Computational items: cardiac output, heart rate and cardiac-cycle duration, water
 * potential (psi = psi_s + psi_p), ABO inheritance probabilities and red-cell
 * transfusion compatibility (ABO + Rh). Conceptual items: statement pools (one
 * correct / one incorrect statement per instance) plus fixed textbook-recall MCQs.
 */
import { defineBank } from '@/engine/authoring';
import { num, numericOptions, q$, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** `x` prints exactly with three significant figures (num() would not round it). */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

/** A false statement and the fact that corrects it. */
type Falsehood = readonly [statement: string, correction: string];

/**
 * "Which statement is correct / incorrect?" from pools of true and false statements.
 * The explanation always names the correction of every false statement shown.
 */
function statementItem(
  r: Rng,
  pool: {
    stem: string;
    negativeStem: string;
    truths: readonly string[];
    falsehoods: readonly Falsehood[];
  },
): AuthoredQuestion {
  const inverted = r.chance(0.35);
  if (inverted) {
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

// ---------------------------------------------------------------------------
// Blood groups
// ---------------------------------------------------------------------------

type Allele = 'A' | 'B' | 'O';
type Genotype = readonly [Allele, Allele];

const GENOTYPES: readonly Genotype[] = [
  ['A', 'A'],
  ['A', 'O'],
  ['B', 'B'],
  ['B', 'O'],
  ['A', 'B'],
  ['O', 'O'],
];

const alleleTex = (a: Allele): string => (a === 'O' ? 'i' : `I^{${a}}`);
/** Genotype in textbook order (I^A before I^B before i): I^{A}I^{B} and I^{B}i, never I^{B}I^{A} or iI^{B}. */
const ALLELE_RANK: Readonly<Record<Allele, number>> = { A: 0, B: 1, O: 2 };
const genotypeTex = (g: Genotype): string => {
  const [x, y] = ALLELE_RANK[g[0]] <= ALLELE_RANK[g[1]] ? [g[0], g[1]] : [g[1], g[0]];
  return `${alleleTex(x)}${alleleTex(y)}`;
};

function phenotype(a: Allele, b: Allele): string {
  const s = new Set([a, b]);
  if (s.has('A') && s.has('B')) return 'AB';
  if (s.has('A')) return 'A';
  if (s.has('B')) return 'B';
  return 'O';
}

const QUARTER_TEX: Readonly<Record<number, string>> = {
  0: '$0$',
  1: '$\\frac{1}{4}$',
  2: '$\\frac{1}{2}$',
  3: '$\\frac{3}{4}$',
  4: '$1$',
};

interface BloodGroup {
  abo: 'A' | 'B' | 'AB' | 'O';
  rh: boolean;
}

const ALL_GROUPS: readonly BloodGroup[] = (['A', 'B', 'AB', 'O'] as const).flatMap((abo) => [
  { abo, rh: true },
  { abo, rh: false },
]);

const groupName = (g: BloodGroup): string => `${g.abo} ${g.rh ? 'positive' : 'negative'}`;

/** Antigens on the red cells of a group. */
function antigens(g: BloodGroup): string[] {
  const out: string[] = [];
  if (g.abo === 'A' || g.abo === 'AB') out.push('A');
  if (g.abo === 'B' || g.abo === 'AB') out.push('B');
  if (g.rh) out.push('Rh (D)');
  return out;
}

/** Red cells of `donor` are safe for `recipient` when they carry no antigen the recipient lacks. */
function foreignAntigens(donor: BloodGroup, recipient: BloodGroup): string[] {
  const own = new Set(antigens(recipient));
  return antigens(donor).filter((a) => !own.has(a));
}

const sameGroup = (a: BloodGroup, b: BloodGroup): boolean => a.abo === b.abo && a.rh === b.rh;

// ---------------------------------------------------------------------------
// Statement pools
// ---------------------------------------------------------------------------

const PLANT_TRUTHS: readonly string[] = [
  'Xylem vessels are dead at maturity and carry water and minerals upward.',
  'Mature sieve tube elements are living but lack a nucleus.',
  'Root pressure can force water out of leaf margins through hydathodes.',
  'Transpiration pull is the main force that lifts water to the top of tall trees.',
  'Water moves from a region of higher water potential to one of lower water potential.',
  'The water potential of pure water at atmospheric pressure is zero.',
  'Companion cells are linked to sieve tube elements by plasmodesmata.',
];

const PLANT_FALSEHOODS: readonly Falsehood[] = [
  ['Phloem carries organic food only upward, from roots to leaves.', 'Phloem translocation runs from source to sink, upward or downward.'],
  ['Xylem vessels are living cells with dense cytoplasm.', 'Xylem vessels are dead, hollow tubes at maturity.'],
  ['Stomata open when guard cells lose water and become flaccid.', 'Stomata open when guard cells take up water and become turgid.'],
  ['Dissolving solutes in water raises its water potential.', 'Solutes lower (make more negative) the water potential.'],
  ['The cohesion-tension theory explains the translocation of sucrose in phloem.', 'Cohesion-tension explains ascent of sap in xylem; phloem translocation is explained by pressure flow.'],
  ['Mature sieve tube elements contain a large nucleus.', 'Mature sieve tube elements have no nucleus.'],
  ['Pure water has a more negative water potential than any solution.', 'Pure water has the highest water potential (zero); dissolved solutes make it negative.'],
];

const VESSEL_TRUTHS: readonly string[] = [
  'Mature human red blood cells lack a nucleus.',
  'Arteries have thicker, more muscular walls than veins.',
  'Veins have valves that prevent the backflow of blood.',
  'Neutrophils are the most abundant white blood cells.',
  'Platelets play a key role in blood clotting.',
  'The pulmonary artery carries deoxygenated blood to the lungs.',
  'Exchange of materials between blood and tissues occurs across capillary walls.',
];

const VESSEL_FALSEHOODS: readonly Falsehood[] = [
  ['All arteries carry oxygenated blood.', 'The pulmonary artery carries deoxygenated blood.'],
  ['Lymphocytes are granulocytes.', 'Lymphocytes are agranulocytes.'],
  ['Capillary walls consist of three thick layers.', 'A capillary wall is a single layer of endothelium.'],
  ['Mature human red blood cells contain a large nucleus.', 'Mature human red blood cells have no nucleus.'],
  ['The pulmonary veins carry deoxygenated blood to the heart.', 'The pulmonary veins carry oxygenated blood from the lungs.'],
  ['Veins have thicker muscular walls than arteries.', 'Arteries, not veins, have the thicker muscular walls.'],
  ['Platelets are the main oxygen-carrying cells of blood.', 'Red blood cells (haemoglobin) carry oxygen; platelets help clotting.'],
];

const IMMUNITY_TRUTHS: readonly string[] = [
  'T-lymphocytes mature in the thymus gland.',
  'Plasma cells develop from activated B-lymphocytes and secrete antibodies.',
  'Cytotoxic (killer) T cells destroy virus-infected body cells.',
  'Memory cells make the secondary immune response faster and stronger.',
  'An antibody molecule has two heavy and two light polypeptide chains.',
  'Passive immunity is short-lived because no memory cells are formed.',
  'Vaccination gives artificially acquired active immunity.',
];

const IMMUNITY_FALSEHOODS: readonly Falsehood[] = [
  ['Antibodies are secreted by red blood cells.', 'Antibodies are secreted by plasma cells (from B-lymphocytes).'],
  ['Passive immunity gives lifelong protection.', 'Passive immunity lasts only weeks to months.'],
  ['The primary immune response is faster than the secondary response.', 'The secondary response is the faster one, because of memory cells.'],
  ['Antibodies received by a fetus from its mother give active immunity.', 'Maternal antibodies give naturally acquired passive immunity.'],
  ['Vaccines contain ready-made antibodies against a pathogen.', 'Vaccines contain antigens; ready-made antibodies give passive immunity.'],
  ['Helper T cells secrete antibodies themselves.', 'Helper T cells activate B and T cells; plasma cells secrete antibodies.'],
  ['An antibody molecule is a single polysaccharide chain.', 'An antibody is a protein of four polypeptide chains.'],
];

// ---------------------------------------------------------------------------
// Chapter
// ---------------------------------------------------------------------------

export default defineBank('biology', 'transport', (b) => [
  // ---------------------------- Dynamic: computational ----------------------------
  b.dynamic('heart-rate-arithmetic', { difficulty: 1, tags: ['heart and blood vessels'] }, (r) => {
    const variant = r.pick(['co', 'sv', 'cycle', 'rate'] as const);
    const fmtS = (x: number): string => q$(x, 's', { sig: 4 });
    if (variant === 'cycle' || variant === 'rate') {
      const [hr, t] = r.pick([
        [48, 1.25],
        [50, 1.2],
        [60, 1],
        [75, 0.8],
        [80, 0.75],
        [96, 0.625],
        [100, 0.6],
        [120, 0.5],
        [125, 0.48],
        [150, 0.4],
      ] as const);
      if (variant === 'cycle') {
        const { answer, distractors } = numericOptions(r, {
          correct: t,
          // hr/60 (inverted ratio) only when it terminates, so no repeating-decimal giveaway;
          // 0.8 s is the memorised textbook value (at 75 beats per minute).
          wrong: [(hr * 1000) % 60 === 0 ? hr / 60 : NaN, t / 2, 2 * t, 0.8],
          format: fmtS,
        });
        return {
          stem: `If the heart beats ${hr} times per minute, the duration of one cardiac cycle is:`,
          answer,
          distractors,
          explanation: tex`One cycle lasts $T = \frac{60\,\mathrm{s}}{\text{beats per minute}} = \frac{60}{${hr}} = ${num(t)}\,\mathrm{s}$.`,
        };
      }
      const { answer, distractors } = numericOptions(r, {
        correct: hr,
        wrong: [60 * t, hr / 2, 2 * hr, 72], // 72: the memorised "normal" heart rate
        format: (x) => `$${num(x)}$ beats per minute`,
      });
      return {
        stem: `One complete cardiac cycle of a person takes ${num(t)} s. The heart rate is:`,
        answer,
        distractors,
        explanation: tex`Heart rate $= \frac{60\,\mathrm{s}}{T} = \frac{60}{${num(t)}} = ${hr}$ beats per minute.`,
      };
    }
    let hr = 72;
    let sv = 70;
    for (let i = 0; i < 50; i++) {
      hr = r.pick([60, 64, 70, 72, 75, 80, 84, 90, 96, 100]);
      sv = r.multiple(50, 90, 5);
      if (exact3((hr * sv) / 1000)) break;
    }
    if (!exact3((hr * sv) / 1000)) {
      hr = 72;
      sv = 70;
    }
    const co = (hr * sv) / 1000;
    if (variant === 'co') {
      const { answer, distractors } = numericOptions(r, {
        correct: co,
        wrong: [co * 10, co / 10, (hr + sv) / 10],
        format: (x) => `$${num(x)}\\,\\mathrm{L\\,min^{-1}}$`,
      });
      return {
        stem: `A person has a heart rate of ${hr} beats per minute and a stroke volume of ${sv} mL. The cardiac output is:`,
        answer,
        distractors,
        explanation: tex`Cardiac output $=$ heart rate $\times$ stroke volume $= ${hr} \times ${sv}\,\mathrm{mL} = ${hr * sv}\,\mathrm{mL\,min^{-1}} = ${num(co)}\,\mathrm{L\,min^{-1}}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: sv,
      wrong: [sv * 10, sv / 10, hr],
      format: (x) => q$(x, 'mL'),
    });
    return {
      stem: `The cardiac output of a person is ${num(co)} L per minute at a heart rate of ${hr} beats per minute. The stroke volume is:`,
      answer,
      distractors,
      explanation: tex`Stroke volume $= \frac{\text{cardiac output}}{\text{heart rate}} = \frac{${hr * sv}\,\mathrm{mL\,min^{-1}}}{${hr}\,\mathrm{min^{-1}}} = ${sv}\,\mathrm{mL}$.`,
    };
  }),

  b.dynamic('water-potential', { difficulty: 2, tags: ['transport in plants'] }, (r) => {
    const variant = r.pick(['psi', 'psi', 'solute', 'full-turgor'] as const);
    const kpa = (x: number): string => `$${num(x)}\\,\\mathrm{kPa}$`;
    const s = -r.multiple(400, 1500, 50);
    const p = r.multiple(100, -s - 100, 50);
    const psi = s + p;
    if (variant === 'psi') {
      const { answer, distractors } = numericOptions(r, {
        correct: psi,
        wrong: [s - p, -psi, s, p - s],
        format: kpa,
        allowNegative: true,
      });
      return {
        stem: `A plant cell has a solute potential of ${kpa(s)} and a pressure potential of ${kpa(p)}. Its water potential is:`,
        answer,
        distractors,
        explanation: tex`$\psi = \psi_s + \psi_p = (${num(s)}) + (${num(p)}) = ${num(psi)}\,\mathrm{kPa}$.`,
      };
    }
    if (variant === 'solute') {
      const { answer, distractors } = numericOptions(r, {
        correct: s,
        wrong: [psi + p, -s, psi, p], // added instead of subtracted, sign slip, ignored psi_p, gave psi_p
        format: kpa,
        allowNegative: true,
      });
      return {
        stem: `A plant cell has a water potential of ${kpa(psi)} and a pressure potential of ${kpa(p)}. Its solute potential is:`,
        answer,
        distractors,
        explanation: tex`$\psi_s = \psi - \psi_p = (${num(psi)}) - (${num(p)}) = ${num(s)}\,\mathrm{kPa}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: -s,
      wrong: [s, 0, -2 * s],
      format: kpa,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: `A plant cell with a solute potential of ${kpa(s)} is placed in pure water until it reaches equilibrium. Assuming its solute potential does not change, its pressure potential is then:`,
      answer,
      distractors,
      explanation: tex`At equilibrium the cell's water potential equals that of pure water, $\psi = 0$. So $\psi_p = \psi - \psi_s = 0 - (${num(s)}) = ${num(-s)}\,\mathrm{kPa}$ (full turgor).`,
    };
  }),

  b.dynamic('abo-inheritance', { difficulty: 2, origin: 'past-paper', tags: ['blood'] }, (r) => {
    // Mostly crosses with a heterozygous parent, so the answer is not always 1.
    const hetero = GENOTYPES.filter(([a, c]) => a !== c);
    const g1 = r.chance(0.8) ? r.pick(hetero) : r.pick(GENOTYPES);
    const g2 = r.pick(GENOTYPES);
    const kids = g1.flatMap((a) => g2.map((c) => [a, c] as const));
    const counts = new Map<string, number>();
    for (const [a, c] of kids) counts.set(phenotype(a, c), (counts.get(phenotype(a, c)) ?? 0) + 1);
    const possible = [...counts.keys()];
    const impossible = ['A', 'B', 'AB', 'O'].filter((g) => !counts.has(g));
    const target = impossible.length > 0 && r.chance(0.2) ? r.pick(impossible) : r.pick(possible);
    const k = counts.get(target) ?? 0;
    const answer = QUARTER_TEX[k] as string;
    const others = [0, 1, 2, 3, 4].filter((x) => x !== k).map((x) => QUARTER_TEX[x] as string);
    const distractors = r.sample(others, 3);
    const offspring = kids.map(([a, c]) => `$${genotypeTex([a, c])}$ (${phenotype(a, c)})`).join(', ');
    return {
      stem: tex`A man of genotype $${genotypeTex(g1)}$ (blood group ${phenotype(...g1)}) marries a woman of genotype $${genotypeTex(g2)}$ (blood group ${phenotype(...g2)}). The probability that their child has blood group ${target} is:`,
      answer,
      distractors,
      explanation: `Each parent passes one allele with equal chance. The four equally likely combinations are ${offspring}. Group ${target} appears in ${k} of 4, so the probability is ${answer}.`,
    };
  }),

  b.dynamic('transfusion-compatibility', { difficulty: 2, origin: 'past-paper', tags: ['blood'] }, (r) => {
    const asRecipient = r.chance(0.5);
    const candidates = ALL_GROUPS.filter((g) => {
      const partners = ALL_GROUPS.filter((o) => !sameGroup(o, g));
      const ok = partners.filter((o) => (asRecipient ? foreignAntigens(o, g) : foreignAntigens(g, o)).length === 0);
      return ok.length >= 1 && partners.length - ok.length >= 3;
    });
    const focus = r.pick(candidates);
    const partners = ALL_GROUPS.filter((o) => !sameGroup(o, focus));
    const foreign = (o: BloodGroup): string[] => (asRecipient ? foreignAntigens(o, focus) : foreignAntigens(focus, o));
    const right = r.pick(partners.filter((o) => foreign(o).length === 0));
    const wrong = r.sample(
      partners.filter((o) => foreign(o).length > 0),
      3,
    );
    const ag = (g: BloodGroup): string => (antigens(g).length ? antigens(g).join(', ') : 'no A, B or Rh antigen');
    const reasons = wrong
      .map((o) =>
        asRecipient
          ? `${groupName(o)} red cells carry ${foreign(o).join(' and ')}, which the recipient lacks.`
          : `A recipient of group ${groupName(o)} lacks ${foreign(o).join(' and ')}.`,
      )
      .join(' ');
    const rule =
      'Red cells are safe when they carry no antigen that the recipient lacks (an Rh-negative person must not receive Rh-positive cells).';
    return {
      stem: asRecipient
        ? `A patient of blood group ${groupName(focus)} needs red cells. Red cells from a donor of which group can be given safely?`
        : `Red cells from a donor of blood group ${groupName(focus)} can be safely given to a recipient of group:`,
      answer: groupName(right),
      distractors: wrong.map(groupName),
      explanation: asRecipient
        ? `${rule} The recipient's own red cells carry ${ag(focus)}. ${groupName(right)} cells carry ${antigens(right).length ? `only ${ag(right)}, all of which the recipient also has` : ag(right)}, so nothing is foreign. ${reasons}`
        : `${rule} The donor cells carry ${ag(focus)}; a recipient of group ${groupName(right)} has ${ag(right)} on its own red cells, so nothing is foreign. ${reasons}`,
    };
  }),

  // ---------------------------- Dynamic: statement pools ----------------------------
  b.dynamic('plant-transport-statements', { difficulty: 2, tags: ['transport in plants'] }, (r) =>
    statementItem(r, {
      stem: 'Which statement about transport in plants is correct?',
      negativeStem: 'Which statement about transport in plants is incorrect?',
      truths: PLANT_TRUTHS,
      falsehoods: PLANT_FALSEHOODS,
    }),
  ),

  b.dynamic('blood-and-vessels-statements', { difficulty: 1, tags: ['blood', 'heart and blood vessels'] }, (r) =>
    statementItem(r, {
      stem: 'Which statement about human blood and blood vessels is correct?',
      negativeStem: 'Which statement about human blood and blood vessels is incorrect?',
      truths: VESSEL_TRUTHS,
      falsehoods: VESSEL_FALSEHOODS,
    }),
  ),

  b.dynamic('immunity-statements', { difficulty: 2, tags: ['immunity'] }, (r) =>
    statementItem(r, {
      stem: 'Which statement about the immune system is correct?',
      negativeStem: 'Which statement about the immune system is incorrect?',
      truths: IMMUNITY_TRUTHS,
      falsehoods: IMMUNITY_FALSEHOODS,
    }),
  ),

  // ---------------------------- Fixed: transport in plants ----------------------------
  ...b.mcqs([
    {
      id: 'cohesion-tension-dixon-joly', d: 1, o: 'past-paper', t: ['transport in plants'],
      q: 'The cohesion-tension theory of the ascent of sap was put forward by:',
      a: 'Dixon and Joly',
      x: ['Ernst Münch', 'William Harvey', 'Edward Jenner'],
      e: 'H. H. Dixon and J. Joly (1894) proposed that transpiration pull, acting on a continuous water column held together by cohesion, raises sap in xylem. Münch proposed the pressure-flow theory of phloem transport.',
    },
    {
      id: 'stomata-potassium', d: 2, t: ['transport in plants'],
      q: 'Opening of stomata is mainly brought about by the active uptake of which ions into the guard cells?',
      a: tex`Potassium ions ($\mathrm{K^{+}}$)`,
      x: [tex`Sodium ions ($\mathrm{Na^{+}}$)`, tex`Calcium ions ($\mathrm{Ca^{2+}}$)`, tex`Hydrogen ions ($\mathrm{H^{+}}$)`],
      e: tex`Guard cells pump $\mathrm{H^{+}}$ out and take up $\mathrm{K^{+}}$. This lowers their water potential, water enters by osmosis, the guard cells become turgid and the pore opens.`,
    },
    {
      id: 'casparian-endodermis', d: 1, t: ['transport in plants'],
      q: 'In a root, the Casparian strip blocks the apoplast pathway and forces water to pass through the cytoplasm of cells of the:',
      a: 'endodermis',
      x: ['epidermis', 'pericycle', 'phloem'],
      e: 'The Casparian strip is a waterproof band in the radial and transverse walls of endodermal cells, so water must cross the endodermis through the symplast.',
    },
  ]),

  // ---------------------------- Fixed: heart and blood vessels ----------------------------
  ...b.mcqs([
    {
      id: 'sa-node-pacemaker', d: 1, o: 'past-paper', t: ['heart and blood vessels'],
      q: 'The pacemaker of the human heart is the:',
      a: 'sino-atrial (SA) node',
      x: ['atrio-ventricular (AV) node', 'bundle of His', 'Purkinje fibres'],
      e: 'The SA node in the wall of the right atrium generates each impulse and sets the heart rate. The AV node delays the impulse briefly and passes it on; the bundle of His and Purkinje fibres carry it through the ventricles.',
    },
    {
      id: 'bicuspid-valve', d: 1, t: ['heart and blood vessels'],
      q: 'The valve between the left atrium and the left ventricle is the:',
      a: 'bicuspid (mitral) valve',
      x: ['tricuspid valve', 'pulmonary semilunar valve', 'aortic semilunar valve'],
      e: 'The left atrioventricular opening is guarded by the two-flapped bicuspid (mitral) valve; the tricuspid valve guards the right side.',
    },
    {
      id: 'lubb-sound', d: 1, t: ['heart and blood vessels'],
      q: 'The first heart sound, "lubb", is produced by the:',
      a: 'closure of the atrioventricular valves',
      x: ['closure of the semilunar valves', 'opening of the atrioventricular valves', 'contraction of the atria'],
      e: '"Lubb" is heard at the start of ventricular systole when the tricuspid and bicuspid valves close. "Dubb" follows when the semilunar valves close.',
    },
    {
      id: 'normal-blood-pressure', d: 1, o: 'past-paper', t: ['heart and blood vessels'],
      q: 'The normal blood pressure of a healthy young adult is about:',
      a: '120/80 mm Hg',
      x: ['80/120 mm Hg', '140/100 mm Hg', '100/40 mm Hg'],
      e: 'Systolic pressure (during ventricular contraction) is about 120 mm Hg and diastolic about 80 mm Hg, written 120/80; the systolic value is always written first.',
    },
    {
      id: 'angina-pectoris', d: 1, t: ['heart and blood vessels'],
      q: 'Chest pain caused by a temporarily reduced blood supply to the heart muscle is called:',
      a: 'angina pectoris',
      x: ['hypertension', 'oedema', 'leukaemia'],
      e: 'Angina pectoris is chest pain from temporary ischaemia of the myocardium, often on exertion. Hypertension is high blood pressure, oedema is tissue swelling and leukaemia is a blood cancer.',
    },
    {
      id: 'left-ventricle-wall', d: 3, t: ['heart and blood vessels'],
      q: 'The wall of the left ventricle is much thicker than that of the right ventricle because the left ventricle:',
      a: 'pumps blood through the whole systemic circulation at higher pressure',
      x: [
        'pumps a larger volume of blood per beat than the right ventricle',
        'pumps deoxygenated blood to the lungs for oxygenation',
        'contains the SA node that starts each heartbeat',
      ],
      e: 'Both ventricles eject the same volume per beat, but the left must drive blood through the long, high-resistance systemic circuit, so it needs more muscle. The right ventricle pumps to the lungs; the SA node lies in the right atrium.',
    },
  ]),

  // ---------------------------- Fixed: blood ----------------------------
  ...b.mcqs([
    {
      id: 'rbc-lifespan', d: 1, o: 'past-paper', t: ['blood'],
      q: 'The average life span of a human red blood cell is about:',
      a: '120 days',
      x: ['30 days', '12 days', '365 days'],
      e: 'Red blood cells circulate for about 120 days, then are destroyed mainly in the spleen and liver.',
    },
    {
      id: 'agranulocytes', d: 1, t: ['blood'],
      q: 'Which white blood cells are agranulocytes?',
      a: 'Lymphocytes and monocytes',
      x: ['Neutrophils and eosinophils', 'Basophils and neutrophils', 'Eosinophils and basophils'],
      e: 'Agranulocytes have no visible cytoplasmic granules: lymphocytes and monocytes. Neutrophils, eosinophils and basophils are granulocytes.',
    },
    {
      id: 'thrombin-fibrinogen', d: 2, t: ['blood'],
      q: 'During blood clotting, the enzyme thrombin converts:',
      a: 'soluble fibrinogen into insoluble fibrin',
      x: ['insoluble fibrin into soluble fibrinogen', 'prothrombin into fibrinogen', 'fibrinogen into prothrombin'],
      e: 'Thromboplastin from damaged tissue and platelets (with Ca²⁺) changes prothrombin into thrombin; thrombin then converts soluble fibrinogen into insoluble fibrin threads that trap blood cells to form the clot.',
    },
    {
      id: 'erythroblastosis-foetalis', d: 2, o: 'past-paper', t: ['blood', 'immunity'],
      q: 'Erythroblastosis foetalis can occur when:',
      a: 'an Rh-negative mother carries an Rh-positive fetus',
      x: [
        'an Rh-positive mother carries an Rh-negative fetus',
        'an Rh-negative mother carries an Rh-negative fetus',
        'an Rh-positive mother carries an Rh-positive fetus',
      ],
      e: 'An Rh-negative mother sensitised to Rh-positive fetal cells makes anti-Rh antibodies; in a later Rh-positive pregnancy these cross the placenta and destroy fetal red cells.',
    },
    {
      id: 'ab-parents-o-child', d: 3, o: 'past-paper', t: ['blood'],
      q: 'A child has blood group O. Which pair of blood groups could its parents have?',
      a: 'A and B',
      x: ['AB and O', 'AB and AB', 'AB and A'],
      e: tex`A group O child is $ii$, so each parent must carry $i$. Parents $I^{A}i$ (A) and $I^{B}i$ (B) can each pass $i$. An AB parent ($I^{A}I^{B}$) has no $i$ allele, so it cannot have a group O child.`,
    },
  ]),

  // ---------------------------- Fixed: lymphatic system ----------------------------
  ...b.mcqs([
    {
      id: 'thoracic-duct', d: 2, t: ['lymphatic system'],
      q: 'The thoracic duct returns lymph from most of the body into the:',
      a: 'left subclavian vein',
      x: ['right atrium directly', 'hepatic portal vein', 'pulmonary artery'],
      e: 'The thoracic duct, the largest lymph vessel, empties into the left subclavian vein near its junction with the jugular vein, returning tissue fluid to the blood.',
    },
    {
      id: 'spleen-largest-lymphoid', d: 1, t: ['lymphatic system'],
      q: 'The largest lymphoid organ of the human body is the:',
      a: 'spleen',
      x: ['thymus', 'tonsil', 'appendix'],
      e: 'The spleen is the largest lymphoid organ; it filters blood, removes worn-out red cells and houses lymphocytes.',
    },
    {
      id: 'tissue-fluid-formation', d: 3, t: ['lymphatic system', 'heart and blood vessels'],
      q: 'At the arterial end of a capillary, fluid leaves the blood to form tissue fluid because:',
      a: 'blood pressure is greater than the osmotic pressure of plasma proteins',
      x: [
        'the osmotic pressure of plasma proteins is greater than blood pressure',
        'lymph vessels actively pump fluid out of the capillary',
        'plasma proteins pass out freely through the capillary wall',
      ],
      e: 'At the arterial end, hydrostatic (blood) pressure exceeds the osmotic pull of plasma proteins, so fluid is pushed out. At the venous end blood pressure has fallen, osmosis wins and most fluid returns; the excess drains into lymph vessels. Plasma proteins are too large to leave freely.',
    },
  ]),

  // ---------------------------- Fixed: immunity ----------------------------
  ...b.mcqs([
    {
      id: 'antibodies-plasma-cells', d: 1, o: 'past-paper', t: ['immunity'],
      q: 'Antibodies are secreted by:',
      a: 'plasma cells',
      x: ['helper T cells', 'red blood cells', 'platelets'],
      e: 'Activated B-lymphocytes divide and differentiate into plasma cells, which secrete antibodies. Helper T cells only assist the response.',
    },
    {
      id: 'vaccination-active-immunity', d: 2, t: ['immunity'],
      q: 'The immunity a person develops after receiving a vaccine is:',
      a: 'artificially acquired active immunity',
      x: ['naturally acquired active immunity', 'artificially acquired passive immunity', 'naturally acquired passive immunity'],
      e: 'A vaccine introduces antigens on purpose (artificial) and the body makes its own antibodies and memory cells (active). Injection of ready-made antibodies would be passive.',
    },
    {
      id: 'jenner-smallpox', d: 1, o: 'past-paper', t: ['immunity'],
      q: 'The first vaccine, against smallpox, was developed by:',
      a: 'Edward Jenner',
      x: ['Louis Pasteur', 'Robert Koch', 'Alexander Fleming'],
      e: 'Edward Jenner (1796) used cowpox material to protect against smallpox. Pasteur later made rabies and anthrax vaccines, Koch identified disease-causing bacteria and Fleming discovered penicillin.',
    },
  ]),
]);
