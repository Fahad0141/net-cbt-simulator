import { defineBank } from '@/engine/authoring';
import { ELEMENTS, electronConfig, pickDistractors, statementQuestion, tex } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local data
// ---------------------------------------------------------------------------

/** First ionization energies in kJ/mol (rounded data-book values). */
const IE1: Readonly<Record<string, number>> = {
  H: 1312, He: 2372,
  Li: 520, Be: 899, B: 801, C: 1086, N: 1402, O: 1314, F: 1681, Ne: 2081,
  Na: 496, Mg: 738, Al: 578, Si: 787, P: 1012, S: 1000, Cl: 1251, Ar: 1521,
  K: 419, Ca: 590, Br: 1140, Kr: 1351,
  Rb: 403, Sr: 550, I: 1008, Xe: 1170,
  Cs: 376, Ba: 503,
};

type Trend = 'radius' | 'en' | 'ie';

interface TrendSeries {
  /** Where the elements sit, used in the explanation. */
  where: string;
  /** Elements; for radius and en they are listed in INCREASING order of the property. */
  symbols: readonly string[];
  /** Kind of series. */
  kind: 'period' | 'group';
}

/** Series in increasing order of atomic radius (noble gases left out). */
const RADIUS_SERIES: readonly TrendSeries[] = [
  { where: 'group 1', kind: 'group', symbols: ['Li', 'Na', 'K', 'Rb', 'Cs'] },
  { where: 'group 2', kind: 'group', symbols: ['Be', 'Mg', 'Ca', 'Sr', 'Ba'] },
  { where: 'group 17', kind: 'group', symbols: ['F', 'Cl', 'Br', 'I'] },
  { where: 'period 2', kind: 'period', symbols: ['F', 'O', 'N', 'C', 'B', 'Be', 'Li'] },
  { where: 'period 3', kind: 'period', symbols: ['Cl', 'S', 'P', 'Si', 'Al', 'Mg', 'Na'] },
];

/** Series in increasing order of Pauling electronegativity (no ties inside a series). */
const EN_SERIES: readonly TrendSeries[] = [
  { where: 'group 1', kind: 'group', symbols: ['Cs', 'K', 'Na', 'Li'] },
  { where: 'group 2', kind: 'group', symbols: ['Ba', 'Ca', 'Mg', 'Be'] },
  { where: 'group 17', kind: 'group', symbols: ['I', 'Br', 'Cl', 'F'] },
  { where: 'period 2', kind: 'period', symbols: ['Li', 'Be', 'B', 'C', 'N', 'O', 'F'] },
  { where: 'period 3', kind: 'period', symbols: ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl'] },
];

/** Series for ionization energy; the order is decided from the IE1 data. */
const IE_SERIES: readonly TrendSeries[] = [
  { where: 'group 1', kind: 'group', symbols: ['Li', 'Na', 'K', 'Rb', 'Cs'] },
  { where: 'group 2', kind: 'group', symbols: ['Be', 'Mg', 'Ca', 'Sr', 'Ba'] },
  { where: 'group 17', kind: 'group', symbols: ['F', 'Cl', 'Br', 'I'] },
  { where: 'group 18', kind: 'group', symbols: ['He', 'Ne', 'Ar', 'Kr', 'Xe'] },
  { where: 'period 2', kind: 'period', symbols: ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'] },
  { where: 'period 3', kind: 'period', symbols: ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'] },
];

/** Successive ionization energies (kJ/mol) of real elements, I1 to I5. */
const SUCCESSIVE: ReadonlyArray<{ sym: string; valence: number; ies: readonly number[] }> = [
  { sym: 'Na', valence: 1, ies: [496, 4562, 6910, 9543, 13354] },
  { sym: 'K', valence: 1, ies: [419, 3052, 4420, 5877, 7975] },
  { sym: 'Mg', valence: 2, ies: [738, 1451, 7733, 10543, 13630] },
  { sym: 'Ca', valence: 2, ies: [590, 1145, 4912, 6491, 8153] },
  { sym: 'B', valence: 3, ies: [801, 2427, 3660, 25026, 32827] },
  { sym: 'Al', valence: 3, ies: [578, 1817, 2745, 11577, 14842] },
  { sym: 'C', valence: 4, ies: [1086, 2353, 4621, 6223, 37831] },
  { sym: 'Si', valence: 4, ies: [787, 1577, 3232, 4356, 16091] },
];

const GROUP_OF_VALENCE = ['', 'group 1 (IA)', 'group 2 (IIA)', 'group 13 (IIIA)', 'group 14 (IVA)'];
const OXIDE_OF_VALENCE = ['', tex`$\ce{X2O}$`, tex`$\ce{XO}$`, tex`$\ce{X2O3}$`, tex`$\ce{XO2}$`];

/** Isoelectronic series (species LaTeX, nuclear charge). */
const ISOELECTRONIC: ReadonlyArray<{ electrons: number; gas: string; species: ReadonlyArray<readonly [string, number]> }> = [
  {
    electrons: 10,
    gas: 'Ne',
    species: [
      ['N^3-', 7],
      ['O^2-', 8],
      ['F-', 9],
      ['Na+', 11],
      ['Mg^2+', 12],
      ['Al^3+', 13],
    ],
  },
  {
    electrons: 18,
    gas: 'Ar',
    species: [
      ['P^3-', 15],
      ['S^2-', 16],
      ['Cl-', 17],
      ['K+', 19],
      ['Ca^2+', 20],
    ],
  },
];

const ceSym = (s: string): string => `$\\ce{${s}}$`;

/** Elements from the ELEMENTS table usable for the period/group question (Z 3 to 56). */
const PLACEABLE = Object.values(ELEMENTS).filter((e) => e.group !== null && e.z >= 3 && e.z <= 56);

const placeText = (period: number, group: number): string => `period ${period}, group ${group}`;

/** electronConfig() only knows the Cr and Cu exceptions; silver is [Kr] 4d10 5s1, not 4d9 5s2. */
const configOf = (z: number): string =>
  z === 47 ? electronConfig(z).replace('4d^9\\,5s^2', '4d^{10}\\,5s^1') : electronConfig(z);

/**
 * Statement pool: [statement, reason]. Falsehoods are not exact negations of a listed
 * truth, so a pair of opposite statements never gives the answer away.
 */
const TREND_TRUTHS: ReadonlyArray<readonly [string, string]> = [
  ['Atomic radius generally decreases from left to right across a period.', 'the nuclear charge rises while electrons enter the same shell, so the outer electrons are pulled closer.'],
  ['First ionization energy generally decreases down a group.', 'the outer electron is farther from the nucleus and better shielded, so it is removed more easily.'],
  ['Fluorine is the most electronegative element.', 'fluorine has the highest Pauling electronegativity, 4.0.'],
  ['Chlorine releases more energy than fluorine when it gains an electron.', tex`the electron affinity of Cl is $-349\,\mathrm{kJ\,mol^{-1}}$ against $-328\,\mathrm{kJ\,mol^{-1}}$ for F, whose small, crowded 2p shell repels the incoming electron.`],
  ['A cation is smaller than the atom from which it is formed.', 'removing electrons leaves the same nuclear charge pulling on fewer electrons (often a whole shell is lost).'],
  ['An anion is larger than the atom from which it is formed.', 'the added electron increases electron-electron repulsion while the nuclear charge stays the same.'],
  ['The first ionization energy of magnesium is higher than that of aluminium.', tex`in Mg the electron comes from a filled 3s subshell, while in Al it is a single, better-shielded 3p electron ($738$ against $578\,\mathrm{kJ\,mol^{-1}}$).`],
  ['Metallic character increases down a group.', 'ionization energy falls down a group, so outer electrons are lost more easily (e.g. C is a non-metal, Pb a metal).'],
  ['For any atom with two or more electrons, the second ionization energy is greater than the first.', 'the second electron is removed from a positive ion, which holds its electrons more tightly.'],
];

const TREND_FALSEHOODS: ReadonlyArray<readonly [string, string]> = [
  ['Atomic radius decreases down a group.', 'a new shell is added at each step down a group, so atomic radius increases.'],
  ['Electronegativity increases down a group.', 'electronegativity decreases down a group (F 4.0, Cl 3.0, Br 2.8, I 2.5) as the bonding electrons get farther from the nucleus.'],
  ['The first ionization energy of oxygen is higher than that of nitrogen.', tex`N has a stable half-filled 2p subshell, while O has one paired 2p orbital whose electrons repel, so N is higher ($1402$ against $1314\,\mathrm{kJ\,mol^{-1}}$).`],
  ['Fluorine has the highest electron affinity of all the elements.', 'chlorine has the highest electron affinity; the small fluorine atom repels the incoming electron.'],
  ['Ionization energy generally decreases from left to right across a period.', 'ionization energy generally increases across a period because the nuclear charge rises and the atoms become smaller.'],
  ['Noble gases have the highest electron affinities in their periods.', 'noble gases have complete shells, so their electron affinities are close to zero (an added electron must enter a new shell).'],
  ['The first ionization energy of boron is higher than that of beryllium.', tex`the 2p electron of B is easier to remove than an electron from the filled 2s subshell of Be, so B is lower ($801$ against $899\,\mathrm{kJ\,mol^{-1}}$).`],
  ['Metallic character increases from left to right across a period.', 'metallic character decreases across a period (Na is a metal, Cl a non-metal) as ionization energy rises.'],
  ['All elements of a period have the same number of valence electrons.', 'elements of a period have the same number of shells; it is elements of a group that have the same number of valence electrons.'],
];

const TREND_REASON = new Map<string, string>([...TREND_TRUTHS, ...TREND_FALSEHOODS]);

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'periodicity', (b) => [
  b.dynamic(
    'trend-extreme-element',
    { difficulty: 2, origin: 'past-paper', tags: ['atomic radius', 'ionization energy', 'electronegativity'] },
    (r) => {
      const trend = r.pick<Trend>(['radius', 'en', 'ie']);
      const highest = r.chance(0.5);
      let series: TrendSeries;
      let chosen: string[];
      let ordered: string[]; // increasing order of the property
      if (trend === 'ie') {
        series = r.pick(IE_SERIES);
        chosen = r.sample(series.symbols, 4);
        ordered = [...chosen].sort((a, c) => (IE1[a] as number) - (IE1[c] as number));
      } else {
        series = r.pick(trend === 'radius' ? RADIUS_SERIES : EN_SERIES);
        chosen = r.sample(series.symbols, 4);
        ordered = [...chosen].sort((a, c) => series.symbols.indexOf(a) - series.symbols.indexOf(c));
      }
      const answerSym = (highest ? ordered[3] : ordered[0]) as string;
      const others = chosen.filter((s) => s !== answerSym);

      const prop =
        trend === 'radius'
          ? highest ? 'the largest atomic radius' : 'the smallest atomic radius'
          : trend === 'en'
            ? highest ? 'the highest electronegativity' : 'the lowest electronegativity'
            : highest ? 'the highest first ionization energy' : 'the lowest first ionization energy';

      let reason: string;
      if (trend === 'radius') {
        reason =
          series.kind === 'group'
            ? `Down a group a new shell is added at each step, so atomic radius increases downward.`
            : `Across a period the nuclear charge rises while electrons enter the same shell, so atomic radius decreases from left to right.`;
      } else if (trend === 'en') {
        reason =
          series.kind === 'group'
            ? `Electronegativity decreases down a group because the bonding electrons are farther from the nucleus.`
            : `Electronegativity increases across a period as the nuclear charge increases and the atoms become smaller.`;
      } else {
        const values = ordered.map((s) => `${s} ${IE1[s]}`).join(', ');
        reason =
          (series.kind === 'group'
            ? `First ionization energy decreases down a group as the outer electron is farther from the nucleus and better shielded.`
            : `First ionization energy generally increases across a period, with dips at group 13 (a p electron is easier to remove than an s electron) and group 16 (paired 2p/3p electrons repel).`) +
          tex` Data ($\mathrm{kJ\,mol^{-1}}$): ${values}.`;
      }
      const order = ordered.join(' < ');
      return {
        stem: `Which of the following elements of ${series.where} has ${prop}?`,
        answer: ceSym(answerSym),
        distractors: others.map(ceSym),
        explanation: `${reason} Order of increasing value: ${order}, so the answer is ${answerSym}.`,
      };
    },
  ),

  b.dynamic(
    'successive-ionization-jump',
    { difficulty: 2, tags: ['ionization energy', 'periodic table'] },
    (r) => {
      const el = r.pick(SUCCESSIVE);
      const ask = r.pick(['group', 'oxide', 'valence'] as const);
      const list = el.ies.map((v, i) => `$I_{${i + 1}} = ${v}$`).join(', ');
      const k = el.valence;
      const before = el.ies[k - 1] as number;
      const after = el.ies[k] as number;
      let stem: string;
      let options: string[];
      if (ask === 'group') {
        stem = `The first five ionization energies (in kJ/mol) of an element X are ${list}. In which group of the periodic table is X placed?`;
        options = [1, 2, 3, 4].map((v) => GROUP_OF_VALENCE[v] as string);
      } else if (ask === 'oxide') {
        stem = `The first five ionization energies (in kJ/mol) of an element X are ${list}. The formula of the normal oxide of X is most likely:`;
        options = [1, 2, 3, 4].map((v) => OXIDE_OF_VALENCE[v] as string);
      } else {
        stem = `The first five ionization energies (in kJ/mol) of an element X are ${list}. How many valence electrons does an atom of X have?`;
        options = ['1', '2', '3', '4'];
      }
      const answer = options[k - 1] as string;
      return {
        stem,
        answer,
        distractors: options.filter((o) => o !== answer),
        explanation: tex`The big jump comes between $I_{${k}} = ${before}$ and $I_{${k + 1}} = ${after}$ (a rise by a factor of about ${Math.round(after / before)}), because electron ${k + 1} must come from a filled inner shell. So X has ${k} valence electron${k > 1 ? 's' : ''}, lies in ${GROUP_OF_VALENCE[k]} and forms the oxide ${OXIDE_OF_VALENCE[k]} (X is ${el.sym}).`,
      };
    },
  ),

  b.dynamic('position-from-atomic-number', { difficulty: 2, tags: ['periodic table'] }, (r) => {
    const el = r.pick(PLACEABLE);
    const p = el.period;
    const g = el.group as number;
    const valid = ([pp, gg]: readonly [number, number]): boolean => pp >= 1 && pp <= 7 && gg >= 1 && gg <= 18;
    const candidates: Array<readonly [number, number]> = [];
    if (el.block === 'd') candidates.push([p + 1, g]); // used the shell of the outer s electrons wrongly
    candidates.push([p - 1, g], [p, g + 1], [p, g - 1], [p + 1, g], [g, p], [p, g + 2], [p, g - 2], [p - 1, g + 1]);
    const options = candidates.filter(valid).map(([pp, gg]) => placeText(pp, gg));
    const answer = placeText(p, g);
    const distractors = pickDistractors(answer, options);

    let groupReason: string;
    if (el.block === 's') groupReason = `it is an s-block element with ${g} electron${g > 1 ? 's' : ''} in the outer s subshell, so it is in group ${g}`;
    else if (el.block === 'p')
      groupReason = `it is a p-block element with ${g - 10} electrons in the outer s and p subshells, so its group is ${g - 10} + 10 = ${g}`;
    else groupReason = `it is a d-block element; outer s plus (n-1)d electrons = ${g}, so it is in group ${g}`;
    return {
      stem: `An element has atomic number ${el.z}. Its position in the modern periodic table (groups numbered 1 to 18) is:`,
      answer,
      distractors,
      explanation: tex`Configuration: $${configOf(el.z)}$. The highest principal quantum number is ${p}, so it is in period ${p}; ${groupReason} (the element is ${el.name.toLowerCase()}).`,
    };
  }),

  b.dynamic('isoelectronic-radius', { difficulty: 2, tags: ['atomic radius'] }, (r) => {
    const series = r.pick(ISOELECTRONIC);
    const chosen = r.sample(series.species, 4);
    const largest = r.chance(0.5);
    const sorted = [...chosen].sort((a, c) => a[1] - c[1]); // increasing Z = decreasing radius
    const ans = (largest ? sorted[0] : sorted[3]) as readonly [string, number];
    const order = sorted.map(([s]) => `\\ce{${s}}`).join(' > ');
    return {
      stem: `Which of the following isoelectronic species has the ${largest ? 'largest' : 'smallest'} radius?`,
      answer: ceSym(ans[0]),
      distractors: chosen.filter((s) => s !== ans).map(([s]) => ceSym(s)),
      explanation: tex`All the species have ${series.electrons} electrons (the $\ce{${series.gas}}$ configuration). With the same number of electrons, the radius falls as the nuclear charge rises: $${order}$. So $\ce{${ans[0]}}$ (Z = ${ans[1]}) is the ${largest ? 'largest' : 'smallest'}.`,
    };
  }),

  b.dynamic('periodic-trend-statements', { difficulty: 2, tags: ['atomic radius', 'ionization energy', 'electron affinity', 'electronegativity'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about periodic trends is correct?',
      negativeStem: 'Which of the following statements about periodic trends is incorrect?',
      truths: TREND_TRUTHS.map(([s]) => s),
      falsehoods: TREND_FALSEHOODS.map(([s]) => s),
      explain: (a, inv) => `"${a}" is ${inv ? 'false' : 'true'}: ${TREND_REASON.get(a) ?? ''}`,
    }),
  ),

  ...b.mcqs([
    {
      id: 'mendeleev-basis', d: 1, o: 'past-paper', t: ['periodic table'],
      q: 'Mendeleev arranged the elements in his periodic table in order of increasing:',
      a: 'atomic mass',
      x: ['atomic number', 'number of valence electrons', 'electronegativity'],
      e: 'Mendeleev (1869) ordered the elements by atomic mass. Ordering by atomic number came later, from the X-ray work of Moseley (1913).',
    },
    {
      id: 'modern-periodic-law', d: 1, o: 'past-paper', t: ['periodic table'],
      q: 'According to the modern periodic law, the properties of the elements are periodic functions of their:',
      a: 'atomic numbers',
      x: ['atomic masses', 'atomic volumes', 'mass numbers'],
      e: 'Moseley (1913) showed that atomic number (nuclear charge), not atomic mass, is the fundamental property; ordering by atomic number removed the anomalous pairs of a mass-based order, such as Ar and K, and Te and I.',
    },
    {
      id: 'newlands-octaves', d: 1, t: ['periodic table'],
      q: 'The "law of octaves", in which every eighth element resembled the first, was proposed by:',
      a: 'Newlands',
      x: ['Dobereiner', 'Mendeleev', 'Moseley'],
      e: 'Newlands (1864) noticed that properties repeated after every seven elements, like notes in music. Dobereiner grouped elements into triads; Mendeleev and Moseley came later.',
    },
    {
      id: 'highest-electron-affinity', d: 2, o: 'past-paper', t: ['electron affinity'],
      q: 'Which element has the highest electron affinity, that is, releases the most energy when one mole of its gaseous atoms each gain one electron?',
      a: 'chlorine',
      x: ['fluorine', 'oxygen', 'bromine'],
      e: tex`Chlorine has the highest electron affinity ($-349\,\mathrm{kJ\,mol^{-1}}$). Fluorine ($-328\,\mathrm{kJ\,mol^{-1}}$) is so small that the incoming electron is repelled by the crowded 2p electrons.`,
    },
    {
      id: 'most-electronegative', d: 1, t: ['electronegativity'],
      q: 'On the Pauling scale, the most electronegative element and its electronegativity value are:',
      a: 'fluorine, 4.0',
      x: ['oxygen, 3.5', 'chlorine, 3.0', 'nitrogen, 3.0'],
      e: 'Fluorine is the most electronegative element, with the value 4.0 on the Pauling scale; oxygen (3.5) is second.',
    },
    {
      id: 'highest-first-ie', d: 1, o: 'past-paper', t: ['ionization energy'],
      q: 'Which element has the highest first ionization energy?',
      a: 'helium',
      x: ['fluorine', 'neon', 'hydrogen'],
      e: tex`Helium's two 1s electrons are very close to the nucleus and unshielded: $I_1 = 2372\,\mathrm{kJ\,mol^{-1}}$, more than Ne (2081), F (1681) or H (1312).`,
    },
    {
      id: 'nitrogen-oxygen-ie', d: 2, o: 'past-paper', t: ['ionization energy'],
      q: 'The first ionization energy of nitrogen is higher than that of oxygen because nitrogen:',
      a: 'has a stable, half-filled 2p subshell',
      x: ['has a greater nuclear charge than oxygen', 'has a smaller atomic radius than oxygen', 'has more valence electrons than oxygen'],
      e: tex`N is $2p^3$ (half-filled, extra stable). In O ($2p^4$) one 2p orbital holds a pair, and the repulsion between the paired electrons makes one of them easier to remove. N actually has the smaller nuclear charge and larger radius.`,
    },
    {
      id: 'second-electron-affinity-oxygen', d: 2, t: ['electron affinity'],
      q: tex`The second electron affinity of oxygen, for $\ce{O^- (g) + e^- -> O^2- (g)}$, is:`,
      a: 'endothermic, because the electron is added to a negative ion',
      x: [
        'exothermic, because the product has a noble-gas configuration',
        'zero, because the 2p subshell is already half-filled',
        'exothermic and larger than the first electron affinity',
      ],
      e: tex`The incoming electron is repelled by the negative charge of $\ce{O-}$, so energy must be supplied (about $+780\,\mathrm{kJ\,mol^{-1}}$). The first electron affinity of oxygen is exothermic ($-141\,\mathrm{kJ\,mol^{-1}}$).`,
    },
    {
      id: 'cation-smaller-than-atom', d: 1, t: ['atomic radius'],
      q: tex`Compared with a sodium atom, the sodium ion $\ce{Na+}$ is:`,
      a: 'smaller, because the outer 3s shell is lost',
      x: [
        'larger, because electron repulsion decreases',
        'the same size, because the nucleus is unchanged',
        'larger, because the nuclear charge decreases',
      ],
      e: tex`$\ce{Na}$ ($2,8,1$) loses its only 3s electron to give $\ce{Na+}$ ($2,8$), so a whole shell disappears and the same 11 protons pull on fewer electrons. The nuclear charge does not change.`,
    },
    {
      id: 'amphoteric-oxide-period-3', d: 2, t: ['periodic table'],
      q: 'Which oxide of a period-3 element is amphoteric?',
      a: tex`$\ce{Al2O3}$`,
      x: [tex`$\ce{Na2O}$`, tex`$\ce{MgO}$`, tex`$\ce{SO3}$`],
      e: tex`Across period 3 oxides change from basic ($\ce{Na2O}$, $\ce{MgO}$) through amphoteric ($\ce{Al2O3}$, which reacts with both acids and bases) to acidic ($\ce{SiO2}$, $\ce{P4O10}$, $\ce{SO3}$, $\ce{Cl2O7}$).`,
    },
    {
      id: 'radius-across-period-reason', d: 2, t: ['atomic radius'],
      q: 'Atomic radius decreases from left to right across a period mainly because:',
      a: 'nuclear charge increases while electrons enter the same shell',
      x: [
        'a new electron shell is added at each step',
        'shielding by inner electrons increases sharply',
        'electrons are lost from the outer shell',
      ],
      e: 'Across a period each element adds one proton and one electron to the same outer shell. Inner-shell shielding stays nearly constant, so the effective nuclear charge rises and the outer electrons are pulled closer.',
    },
    {
      id: 'elements-in-fourth-period', d: 1, t: ['periodic table'],
      q: 'How many elements are there in the fourth period of the periodic table?',
      a: '18',
      x: ['8', '32', '10'],
      e: tex`Period 4 fills $4s$ (2), $3d$ (10) and $4p$ (6), giving $2 + 10 + 6 = 18$ elements, from K (19) to Kr (36).`,
    },
    {
      id: 'metallic-character-down-group', d: 1, t: ['ionization energy'],
      q: 'On moving down a group of the periodic table, metallic character:',
      a: 'increases, because ionization energy decreases',
      x: [
        'decreases, because atomic size increases',
        'decreases, because nuclear charge increases',
        'stays the same, because valence electrons are equal',
      ],
      e: 'Down a group the atoms get larger and the outer electrons are lost more easily (lower ionization energy), so metallic character increases, e.g. C (non-metal) to Pb (metal) in group 14.',
    },
    {
      id: 'ie-anomaly-period-3', d: 2, t: ['ionization energy'],
      q: 'Across period 3 the first ionization energy generally rises from Na to Ar. In which pair does the earlier element have the HIGHER first ionization energy?',
      a: tex`$\ce{P}$ and $\ce{S}$`,
      x: [tex`$\ce{Si}$ and $\ce{P}$`, tex`$\ce{S}$ and $\ce{Cl}$`, tex`$\ce{Na}$ and $\ce{Mg}$`],
      e: tex`P ($3p^3$, half-filled) has $I_1 = 1012\,\mathrm{kJ\,mol^{-1}}$, while S ($3p^4$, one paired 3p orbital) has $1000\,\mathrm{kJ\,mol^{-1}}$. Si (787) < P, S < Cl (1251) and Na (496) < Mg (738) follow the normal trend.`,
    },
  ]),
]);
