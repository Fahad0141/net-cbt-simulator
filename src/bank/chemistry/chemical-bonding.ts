import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, q$, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Data (FSc level, values as quoted in Pakistani textbooks)
// ---------------------------------------------------------------------------

type Shape =
  | 'Linear'
  | 'Trigonal planar'
  | 'Tetrahedral'
  | 'Trigonal pyramidal'
  | 'Angular (bent)'
  | 'Trigonal bipyramidal'
  | 'Octahedral'
  | 'Square planar';

const ALL_SHAPES: readonly Shape[] = [
  'Linear',
  'Trigonal planar',
  'Tetrahedral',
  'Trigonal pyramidal',
  'Angular (bent)',
  'Trigonal bipyramidal',
  'Octahedral',
  'Square planar',
];

/** Electron-pair geometry for a given number of electron pairs (no lone pairs). */
const PAIR_GEOMETRY: Record<number, Shape> = {
  2: 'Linear',
  3: 'Trigonal planar',
  4: 'Tetrahedral',
  5: 'Trigonal bipyramidal',
  6: 'Octahedral',
};

interface VseprCase {
  /** mhchem formula. */
  f: string;
  /** Central atom symbol. */
  c: string;
  /** Bond pairs (sigma) and lone pairs on the central atom. */
  bp: number;
  lp: number;
  shape: Shape;
  /** Bond angle in degrees and the atoms spanning it, when a single angle is standard. */
  angle?: number;
  span?: string;
}

const VSEPR: readonly VseprCase[] = [
  { f: 'BeCl2', c: 'Be', bp: 2, lp: 0, shape: 'Linear', angle: 180, span: 'Cl–Be–Cl' },
  { f: 'CO2', c: 'C', bp: 2, lp: 0, shape: 'Linear', angle: 180, span: 'O–C–O' },
  { f: 'BF3', c: 'B', bp: 3, lp: 0, shape: 'Trigonal planar', angle: 120, span: 'F–B–F' },
  { f: 'BCl3', c: 'B', bp: 3, lp: 0, shape: 'Trigonal planar', angle: 120, span: 'Cl–B–Cl' },
  { f: 'SO3', c: 'S', bp: 3, lp: 0, shape: 'Trigonal planar', angle: 120, span: 'O–S–O' },
  { f: 'NO3-', c: 'N', bp: 3, lp: 0, shape: 'Trigonal planar', angle: 120, span: 'O–N–O' },
  { f: 'CO3^2-', c: 'C', bp: 3, lp: 0, shape: 'Trigonal planar', angle: 120, span: 'O–C–O' },
  { f: 'SO2', c: 'S', bp: 2, lp: 1, shape: 'Angular (bent)' },
  { f: 'CH4', c: 'C', bp: 4, lp: 0, shape: 'Tetrahedral', angle: 109.5, span: 'H–C–H' },
  { f: 'CCl4', c: 'C', bp: 4, lp: 0, shape: 'Tetrahedral', angle: 109.5, span: 'Cl–C–Cl' },
  { f: 'SiH4', c: 'Si', bp: 4, lp: 0, shape: 'Tetrahedral', angle: 109.5, span: 'H–Si–H' },
  { f: 'NH4+', c: 'N', bp: 4, lp: 0, shape: 'Tetrahedral', angle: 109.5, span: 'H–N–H' },
  { f: 'NH3', c: 'N', bp: 3, lp: 1, shape: 'Trigonal pyramidal', angle: 107, span: 'H–N–H' },
  { f: 'NF3', c: 'N', bp: 3, lp: 1, shape: 'Trigonal pyramidal' },
  { f: 'H3O+', c: 'O', bp: 3, lp: 1, shape: 'Trigonal pyramidal' },
  { f: 'H2O', c: 'O', bp: 2, lp: 2, shape: 'Angular (bent)', angle: 104.5, span: 'H–O–H' },
  { f: 'OF2', c: 'O', bp: 2, lp: 2, shape: 'Angular (bent)' },
  { f: 'PCl5', c: 'P', bp: 5, lp: 0, shape: 'Trigonal bipyramidal' },
  { f: 'SF6', c: 'S', bp: 6, lp: 0, shape: 'Octahedral', angle: 90, span: 'F–S–F' },
  { f: 'XeF4', c: 'Xe', bp: 4, lp: 2, shape: 'Square planar' },
];

const ANGLES = [180, 120, 109.5, 107, 104.5, 90] as const;
const angleTex = (a: number): string => `$${a}^{\\circ}$`;

/** No-lone-pair shape for a number of bonded atoms (the "ignored the lone pairs" mistake). */
const shapeIgnoringLonePairs = (bp: number): Shape => PAIR_GEOMETRY[bp] ?? 'Tetrahedral';

const HYB = ['$sp$', '$sp^{2}$', '$sp^{3}$', '$sp^{3}d$', '$sp^{3}d^{2}$'] as const;
const HYB_NAME = ['sp', 'sp^{2}', 'sp^{3}', 'sp^{3}d', 'sp^{3}d^{2}'] as const;

interface HybCase {
  /** Phrase naming the atom, e.g. "boron in $\ce{BF3}$". */
  label: string;
  /** Index into HYB. */
  h: number;
  /** Why. */
  why: string;
}

const HYBRID: readonly HybCase[] = [
  { label: tex`beryllium in $\ce{BeCl2}$`, h: 0, why: tex`Be forms two $\sigma$ bonds and has no lone pair: 2 electron pairs` },
  { label: tex`boron in $\ce{BF3}$`, h: 1, why: tex`B forms three $\sigma$ bonds and has no lone pair: 3 electron pairs` },
  { label: tex`carbon in $\ce{CH4}$`, h: 2, why: tex`C forms four $\sigma$ bonds: 4 electron pairs` },
  { label: tex`nitrogen in $\ce{NH3}$`, h: 2, why: tex`N forms three $\sigma$ bonds and has one lone pair: 4 electron pairs` },
  { label: tex`oxygen in $\ce{H2O}$`, h: 2, why: tex`O forms two $\sigma$ bonds and has two lone pairs: 4 electron pairs` },
  { label: tex`nitrogen in $\ce{NH4+}$`, h: 2, why: tex`N forms four $\sigma$ bonds (one of them dative): 4 electron pairs` },
  { label: tex`phosphorus in $\ce{PCl5}$`, h: 3, why: tex`P forms five $\sigma$ bonds: 5 electron pairs` },
  { label: tex`sulphur in $\ce{SF6}$`, h: 4, why: tex`S forms six $\sigma$ bonds: 6 electron pairs` },
  { label: tex`xenon in $\ce{XeF4}$`, h: 4, why: tex`Xe forms four $\sigma$ bonds and has two lone pairs: 6 electron pairs` },
  { label: tex`carbon in $\ce{CO2}$`, h: 0, why: tex`C forms two $\sigma$ bonds (plus two $\pi$ bonds): 2 $\sigma$ electron pairs` },
  { label: tex`carbon in $\ce{CO3^2-}$`, h: 1, why: tex`C forms three $\sigma$ bonds (plus one $\pi$ bond): 3 $\sigma$ electron pairs` },
  { label: tex`each carbon atom in ethene ($\ce{C2H4}$)`, h: 1, why: tex`each C forms three $\sigma$ bonds and one $\pi$ bond, so it uses three hybrid orbitals` },
  { label: tex`each carbon atom in ethyne ($\ce{C2H2}$)`, h: 0, why: tex`each C forms two $\sigma$ bonds and two $\pi$ bonds, so it uses two hybrid orbitals` },
  { label: tex`each carbon atom in ethane ($\ce{C2H6}$)`, h: 2, why: tex`each C forms four $\sigma$ bonds, so it uses four hybrid orbitals` },
  { label: tex`each carbon atom in benzene ($\ce{C6H6}$)`, h: 1, why: tex`each C forms three $\sigma$ bonds and takes part in the delocalised $\pi$ system` },
  { label: tex`carbon in methanal ($\ce{HCHO}$)`, h: 1, why: tex`C forms three $\sigma$ bonds and one $\pi$ bond (C=O)` },
  { label: tex`carbon in hydrogen cyanide ($\ce{HCN}$)`, h: 0, why: tex`C forms two $\sigma$ bonds and two $\pi$ bonds ($\ce{C#N}$)` },
  { label: 'carbon in diamond', h: 2, why: 'each C is bonded tetrahedrally to four other C atoms by $\\sigma$ bonds' },
  { label: 'carbon in graphite', h: 1, why: 'each C forms three $\\sigma$ bonds in a hexagonal layer; the fourth electron is delocalised' },
];

interface MoSpecies {
  /** mhchem formula. */
  f: string;
  /** Total electrons in the molecule or ion. */
  e: number;
}

const MO_SPECIES: readonly MoSpecies[] = [
  { f: 'H2', e: 2 },
  { f: 'H2+', e: 1 },
  { f: 'He2+', e: 3 },
  { f: 'He2', e: 4 },
  { f: 'Li2', e: 6 },
  { f: 'B2', e: 10 },
  { f: 'C2', e: 12 },
  { f: 'N2', e: 14 },
  { f: 'N2+', e: 13 },
  { f: 'O2', e: 16 },
  { f: 'O2+', e: 15 },
  { f: 'O2^-', e: 17 },
  { f: 'O2^2-', e: 18 },
  { f: 'F2', e: 18 },
  { f: 'Ne2', e: 20 },
];

/** Bonding and antibonding electron counts (filling sigma1s, sigma*1s, sigma2s, sigma*2s, 2p bonding (6), pi*2p (4), sigma*2p (2)). */
function moCounts(electrons: number): { nb: number; na: number } {
  const levels: ReadonlyArray<readonly ['b' | 'a', number]> = [
    ['b', 2], ['a', 2], ['b', 2], ['a', 2], ['b', 6], ['a', 4], ['a', 2],
  ];
  let left = electrons;
  let nb = 0;
  let na = 0;
  for (const [kind, cap] of levels) {
    const n = Math.min(cap, left);
    if (kind === 'b') nb += n;
    else na += n;
    left -= n;
  }
  return { nb, na };
}

type Claim = readonly [text: string, reason: string];

const BOND_TRUE: readonly Claim[] = [
  [tex`$\ce{O2}$ is paramagnetic because it has two unpaired electrons in $\pi^{*}2p$ orbitals.`, tex`In $\ce{O2}$ the two degenerate $\pi^{*}2p$ orbitals each hold one electron (Hund's rule), so the molecule is paramagnetic.`],
  [tex`The bond order of $\ce{N2}$ is 3.`, tex`$\ce{N2}$: 10 bonding and 4 antibonding electrons, bond order $= (10-4)/2 = 3$.`],
  [tex`$\ce{CO2}$ has polar bonds but its net dipole moment is zero.`, tex`$\ce{CO2}$ is linear, so the two equal C=O bond dipoles cancel.`],
  ['Lone pair–lone pair repulsion is stronger than bond pair–bond pair repulsion.', 'Lone pairs are held by one nucleus only and spread out more, so lp–lp > lp–bp > bp–bp.'],
  ['Between the same two atoms, bond length decreases as bond order increases.', 'More shared pairs pull the nuclei closer: C–C (154 pm) > C=C (134 pm) > C≡C (120 pm).'],
  [tex`An $sp$ hybrid orbital has 50% s-character.`, tex`$sp$ is formed from one s and one p orbital, so its s-character is $\frac{1}{2}$, i.e. 50%.`],
  [tex`A $\sigma$ bond is formed by head-on (end-to-end) overlap of atomic orbitals.`, tex`Head-on overlap puts the electron density on the internuclear axis, which defines a $\sigma$ bond.`],
  ['Ionic bonds are non-directional.', 'Electrostatic attraction between ions acts equally in all directions, unlike covalent bonds.'],
];

const BOND_FALSE: readonly Claim[] = [
  [tex`$\ce{He2}$ is a stable molecule with a bond order of 1.`, tex`$\ce{He2}$ has 2 bonding and 2 antibonding electrons, so its bond order is 0 and it does not exist.`],
  [tex`$\ce{BF3}$ has a net dipole moment.`, tex`$\ce{BF3}$ is symmetrical trigonal planar, so its three B–F bond dipoles cancel and $\mu = 0$.`],
  [tex`A $\pi$ bond is formed by head-on overlap of p orbitals.`, tex`A $\pi$ bond is formed by sideways (parallel) overlap of p orbitals.`],
  ['Between the same two atoms, bond energy decreases as bond order increases.', 'Bond energy increases with bond order: a triple bond is stronger than a double bond, which is stronger than a single bond.'],
  [tex`The bond angle in $\ce{H2O}$ is larger than that in $\ce{NH3}$.`, tex`Two lone pairs on O compress the angle more: $\ce{H2O}$ is $104.5^{\circ}$, $\ce{NH3}$ is about $107^{\circ}$.`],
  [tex`$\ce{N2}$ is paramagnetic.`, tex`All electrons in $\ce{N2}$ are paired, so it is diamagnetic.`],
  [tex`The $sp^{3}$ hybrid orbitals are directed at $120^{\circ}$ to one another.`, tex`$sp^{3}$ orbitals point to the corners of a tetrahedron, $109.5^{\circ}$ apart; $120^{\circ}$ is for $sp^{2}$.`],
  [tex`$\ce{CH4}$ has a square planar shape.`, tex`Four bond pairs and no lone pair around C give a tetrahedral shape.`],
];

const reasonOf = (claims: readonly Claim[], text: string): string =>
  claims.find(([t]) => t === text)?.[1] ?? '';

/** Picks 3 hybridization distractors, nearest to the answer first (ties broken randomly). */
function hybDistractors(r: { shuffle<T>(items: readonly T[]): T[] }, h: number): string[] {
  const others = r
    .shuffle(HYB.map((_, i) => i).filter((i) => i !== h))
    .sort((a, b) => Math.abs(a - h) - Math.abs(b - h));
  return others.slice(0, 3).map((i) => HYB[i] as string);
}

// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'chemical-bonding', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('vsepr-shape-or-angle', { difficulty: 2, origin: 'past-paper', tags: ['VSEPR'] }, (r) => {
    const m = r.pick(VSEPR);
    const pairs = m.bp + m.lp;
    const lpText = m.lp === 0 ? 'no lone pair' : m.lp === 1 ? 'one lone pair' : `${m.lp} lone pairs`;
    const reason = tex`The central atom ${m.c} in $\ce{${m.f}}$ is bonded to ${m.bp} atoms and has ${lpText} (${pairs} electron-pair regions in all, with ${PAIR_GEOMETRY[pairs]?.toLowerCase()} electron-pair geometry).`;
    if (m.angle !== undefined && r.chance(0.45)) {
      const answer = angleTex(m.angle);
      // In an octahedral molecule trans atoms are at 180°, so 180° would also be a true F–S–F angle.
      const distractors = r.sample(
        ANGLES.filter((a) => a !== m.angle && !(m.shape === 'Octahedral' && a === 180)),
        3,
      ).map(angleTex);
      const why =
        m.lp > 0
          ? tex`Its shape is ${m.shape.toLowerCase()}; the stronger lone-pair repulsion squeezes the ${m.span} angle from $109.5^{\circ}$ to about $${m.angle}^{\circ}$.`
          : tex`Its shape is ${m.shape.toLowerCase()}, so the ${m.span} angle is about $${m.angle}^{\circ}$.`;
      return {
        stem: tex`The ${m.span} bond angle in $\ce{${m.f}}$ is about:`,
        answer,
        distractors,
        explanation: tex`${reason} ${why}`,
      };
    }
    const answer = m.shape;
    const candidates = [
      PAIR_GEOMETRY[pairs] ?? 'Tetrahedral',
      shapeIgnoringLonePairs(m.bp),
      ...r.shuffle(ALL_SHAPES),
    ];
    return {
      stem: tex`According to VSEPR theory, the shape of $\ce{${m.f}}$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`${reason} ${
        m.lp === 0
          ? 'With no lone pairs the shape is the same as the electron-pair arrangement'
          : 'Lone pairs occupy positions but are not counted in the shape, which is described by the atoms only'
      }: ${m.shape.toLowerCase()}.`,
    };
  }),

  b.dynamic('hybridization-of-atom', { difficulty: 2, origin: 'past-paper', tags: ['hybridization'] }, (r) => {
    const c = r.pick(HYBRID);
    const answer = HYB[c.h] as string;
    return {
      stem: tex`The hybridization of ${c.label} is:`,
      answer,
      distractors: hybDistractors(r, c.h),
      explanation: tex`${c.why.charAt(0).toUpperCase()}${c.why.slice(1)}. Hence the hybridization of ${c.label} is $${HYB_NAME[c.h]}$.`,
    };
  }),

  b.dynamic('mo-bond-order', { difficulty: 2, origin: 'past-paper', tags: ['molecular orbital theory'] }, (r) => {
    const s = r.pick(MO_SPECIES);
    const { nb, na } = moCounts(s.e);
    const bo = (nb - na) / 2;
    // Bond orders of these species lie between 0 and 3; extra +1.5/+2 entries keep He2/Ne2 (order 0) supplied.
    const wrong = [nb - na, ...r.shuffle([bo + 0.5, bo - 0.5, bo + 1, bo - 1]), bo + 1.5, bo - 1.5, bo + 2].filter(
      (v) => v >= 0 && v <= 3,
    );
    const { answer, distractors } = numericOptions(r, {
      correct: bo,
      wrong,
      format: (v) => `$${num(v)}$`,
      allowZero: true,
      fallback: 'offset',
    });
    return {
      stem: tex`According to molecular orbital theory, the bond order of $\ce{${s.f}}$ is:`,
      answer,
      distractors,
      explanation: tex`$\ce{${s.f}}$ has ${s.e} electron${s.e === 1 ? '' : 's'}: $N_b = ${nb}$ bonding and $N_a = ${na}$ antibonding. Bond order $= \frac{N_b - N_a}{2} = \frac{${nb} - ${na}}{2} = ${num(bo)}$.`,
    };
  }),

  b.dynamic('bond-energy-calculation', { difficulty: 2, tags: ['bond energy'] }, (r) => {
    if (r.chance(0.6)) {
      let a = 0;
      let bb = 0;
      let c = 0;
      let dH = 0;
      do {
        a = r.int(150, 500);
        bb = r.int(150, 500);
        c = r.int(200, 560);
        dH = a + bb - 2 * c;
      } while (Math.abs(dH) < 20 || a === bb || dH % 2 !== 0);
      const { answer, distractors } = numericOptions(r, {
        correct: dH,
        wrong: [-dH, a + bb - c, dH / 2],
        format: (v) => q$(v, U.kJmol),
        allowNegative: true,
        fallback: 'offset',
      });
      return {
        stem: tex`Using the bond energies A–A $= ${a}$, B–B $= ${bb}$ and A–B $= ${c}\,\mathrm{kJ\,mol^{-1}}$, the enthalpy change for $\ce{A2(g) + B2(g) -> 2AB(g)}$ is:`,
        answer,
        distractors,
        explanation: tex`$\Delta H = \sum(\text{bonds broken}) - \sum(\text{bonds formed}) = (${a} + ${bb}) - 2(${c}) = ${dH}\,\mathrm{kJ\,mol^{-1}}$.`,
      };
    }
    const mol = r.pick([
      { f: 'CH4', bond: 'C–H', n: 4, lo: 405, hi: 420 },
      { f: 'CCl4', bond: 'C–Cl', n: 4, lo: 320, hi: 340 },
      { f: 'NH3', bond: 'N–H', n: 3, lo: 380, hi: 395 },
      { f: 'H2O', bond: 'O–H', n: 2, lo: 455, hi: 470 },
    ] as const);
    const e = r.int(mol.lo, mol.hi);
    const total = mol.n * e;
    const { answer, distractors } = numericOptions(r, {
      correct: e,
      wrong: [total, Math.round(total / (mol.n === 2 ? 4 : 2)), Math.round(total / (mol.n + 1))],
      format: (v) => q$(v, U.kJmol),
    });
    return {
      stem: tex`The enthalpy of atomization of $\ce{${mol.f}(g)}$ (breaking all its bonds into gaseous atoms) is $${total}\,\mathrm{kJ\,mol^{-1}}$. The average ${mol.bond} bond energy is:`,
      answer,
      distractors,
      explanation: tex`$\ce{${mol.f}}$ contains ${mol.n} ${mol.bond} bonds, so the average bond energy $= \frac{${total}}{${mol.n}} = ${e}\,\mathrm{kJ\,mol^{-1}}$.`,
    };
  }),

  b.dynamic('percent-ionic-character', { difficulty: 2, tags: ['dipole moment', 'ionic and covalent bonds'] }, (r) => {
    const d = r.pick([1.0, 1.25, 1.5, 2.0, 2.5]);
    const p = r.multiple(10, 80, 5);
    const muIonic = 4.8 * d;
    const mu = Number(((muIonic * p) / 100).toFixed(4));
    // Plausible slips first; p ± 5/10 keep the list long enough that no fallback value exceeds 100%.
    const wrong = [100 - p, (mu / d) * 100, (mu / 4.8) * 100, 2 * p, p * d * d, p / 2, p + 10, p - 10, p + 5, p - 5].filter(
      (v) => v > 0 && v < 100,
    );
    const { answer, distractors } = numericOptions(r, {
      correct: p,
      wrong,
      format: (v) => tex`$${num(v)}\%$`,
    });
    return {
      stem: tex`A diatomic molecule AB has a bond length of ${num(d)} Å and an observed dipole moment of $${num(mu)}\,\mathrm{D}$. If it were completely ionic ($\ce{A+B-}$), its dipole moment would be $4.8\,\mathrm{D}$ for each Å of bond length. The percentage ionic character of the bond is:`,
      answer,
      distractors,
      explanation: tex`$\mu_{\text{ionic}} = 4.8 \times ${num(d)} = ${num(muIonic)}\,\mathrm{D}$. Percentage ionic character $= \frac{\mu_{\text{obs}}}{\mu_{\text{ionic}}} \times 100 = \frac{${num(mu)}}{${num(muIonic)}} \times 100 = ${p}\%$.`,
    };
  }),

  b.dynamic('bonding-statements', { difficulty: 2, tags: ['molecular orbital theory', 'VSEPR', 'dipole moment', 'bond energy'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about chemical bonding is correct?',
      negativeStem: 'Which statement about chemical bonding is NOT correct?',
      truths: BOND_TRUE.map(([t]) => t),
      falsehoods: BOND_FALSE.map(([t]) => t),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false. ${reasonOf(BOND_FALSE, answer)}`
          : `This statement is true. ${reasonOf(BOND_TRUE, answer)}`,
    }),
  ),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'ionic-en-difference', d: 1, o: 'past-paper', t: ['ionic and covalent bonds'],
      q: 'A bond is usually regarded as predominantly ionic when the electronegativity difference between the bonded atoms is greater than about:',
      a: '$1.7$',
      x: ['$0.4$', '$1.0$', '$3.0$'],
      e: 'An electronegativity difference above about 1.7 corresponds to more than 50% ionic character, so the bond is treated as ionic; smaller differences give polar covalent bonds.',
    },
    {
      id: 'coordinate-bond-species', d: 1, t: ['ionic and covalent bonds'],
      q: 'Which species contains a coordinate covalent (dative) bond?',
      a: tex`$\ce{NH4+}$`,
      x: [tex`$\ce{NH3}$`, tex`$\ce{CH4}$`, tex`$\ce{H2O}$`],
      e: tex`In $\ce{NH4+}$ the lone pair of $\ce{NH3}$ is donated to $\ce{H+}$, forming a dative bond. $\ce{NH3}$, $\ce{CH4}$ and $\ce{H2O}$ contain only ordinary covalent bonds.`,
    },
    {
      id: 'sigma-pi-ethyne', d: 1, o: 'past-paper', t: ['hybridization'],
      q: tex`The numbers of sigma ($\sigma$) and pi ($\pi$) bonds in ethyne ($\ce{C2H2}$) are:`,
      a: tex`$3\sigma$ and $2\pi$`,
      x: [tex`$2\sigma$ and $3\pi$`, tex`$4\sigma$ and $1\pi$`, tex`$3\sigma$ and $1\pi$`],
      e: tex`$\ce{H-C#C-H}$: two C–H $\sigma$ bonds and the triple bond (one $\sigma$ + two $\pi$) give $3\sigma$ and $2\pi$.`,
    },
    {
      id: 'zero-dipole-polar-bonds', d: 1, t: ['dipole moment'],
      q: 'Which molecule has zero dipole moment even though its bonds are polar?',
      a: tex`$\ce{BF3}$`,
      x: [tex`$\ce{NH3}$`, tex`$\ce{H2O}$`, tex`$\ce{CHCl3}$`],
      e: tex`$\ce{BF3}$ is symmetrical trigonal planar, so the three B–F bond dipoles cancel. $\ce{NH3}$ (pyramidal), $\ce{H2O}$ (bent) and $\ce{CHCl3}$ (unsymmetrical) are polar.`,
    },
    {
      id: 'debye-in-si', d: 1, t: ['dipole moment'],
      q: 'One debye (D), the unit of dipole moment, is equal to:',
      a: tex`$3.336 \times 10^{-30}\,\mathrm{C\,m}$`,
      x: [
        tex`$3.336 \times 10^{-20}\,\mathrm{C\,m}$`,
        tex`$1.602 \times 10^{-19}\,\mathrm{C\,m}$`,
        tex`$1.602 \times 10^{-30}\,\mathrm{C\,m}$`,
      ],
      e: tex`$1\,\mathrm{D} = 10^{-18}$ esu cm $= 3.336 \times 10^{-30}\,\mathrm{C\,m}$. $1.602 \times 10^{-19}$ is the electronic charge in coulombs, not a dipole moment.`,
    },
    {
      id: 'o2-paramagnetism-theory', d: 1, o: 'past-paper', t: ['molecular orbital theory'],
      q: tex`The paramagnetic nature of oxygen ($\ce{O2}$) is satisfactorily explained by:`,
      a: 'molecular orbital theory',
      x: ['valence bond theory', 'VSEPR theory', 'the Lewis octet rule'],
      e: tex`MO theory places two unpaired electrons in the degenerate $\pi^{*}2p$ orbitals of $\ce{O2}$, explaining its paramagnetism. Valence bond theory and Lewis structures pair all electrons in O=O.`,
    },
    {
      id: 'shortest-cc-bond', d: 1, t: ['bond energy', 'hybridization'],
      q: 'Which compound has the shortest carbon–carbon bond?',
      a: 'Ethyne',
      x: ['Ethene', 'Ethane', 'Benzene'],
      e: 'Bond length falls as bond order rises: C≡C in ethyne (120 pm) < C=C in ethene (134 pm) < benzene (139 pm) < C–C in ethane (154 pm).',
    },
    {
      id: 'halogen-greatest-bond-energy', d: 3, t: ['bond energy'],
      q: 'Among the halogens, the X–X bond dissociation energy is greatest for:',
      a: tex`$\ce{Cl2}$`,
      x: [tex`$\ce{F2}$`, tex`$\ce{Br2}$`, tex`$\ce{I2}$`],
      e: tex`Bond energies (kJ mol$^{-1}$): $\ce{Cl2}$ 242 > $\ce{Br2}$ 193 > $\ce{F2}$ 158 > $\ce{I2}$ 151. $\ce{F2}$ is anomalously low because lone pairs on the two small F atoms repel strongly.`,
    },
    {
      id: 'electron-pair-repulsion-order', d: 1, t: ['VSEPR'],
      q: 'According to VSEPR theory, the correct order of electron-pair repulsions is:',
      a: 'lp–lp > lp–bp > bp–bp',
      x: ['bp–bp > lp–bp > lp–lp', 'lp–bp > lp–lp > bp–bp', 'lp–lp > bp–bp > lp–bp'],
      e: 'A lone pair is attracted by one nucleus only and occupies more space, so lone pair–lone pair repulsion is greatest and bond pair–bond pair repulsion is least.',
    },
    {
      id: 'greatest-s-character', d: 1, t: ['hybridization'],
      q: 'Which hybrid orbital has the greatest percentage of s-character?',
      a: '$sp$',
      x: ['$sp^{2}$', '$sp^{3}$', '$sp^{3}d$'],
      e: tex`s-character: $sp$ 50%, $sp^{2}$ 33.3%, $sp^{3}$ 25%, $sp^{3}d$ 20%.`,
    },
    {
      id: 'pi-bond-overlap', d: 1, t: ['ionic and covalent bonds'],
      q: tex`A pi ($\pi$) bond is formed by:`,
      a: 'sideways overlap of two parallel p orbitals',
      x: ['head-on overlap of two s orbitals', 'head-on overlap of two p orbitals', 'head-on overlap of an s and a p orbital'],
      e: tex`Parallel p orbitals overlap sideways, giving electron density above and below the internuclear axis: a $\pi$ bond. All head-on overlaps give $\sigma$ bonds.`,
    },
    {
      id: 'largest-dipole-hydrogen-halide', d: 2, t: ['dipole moment'],
      q: 'Which hydrogen halide has the largest dipole moment?',
      a: tex`$\ce{HF}$`,
      x: [tex`$\ce{HCl}$`, tex`$\ce{HBr}$`, tex`$\ce{HI}$`],
      e: tex`Fluorine is the most electronegative halogen, so the H–F bond is the most polar: $\mu$(HF) $\approx 1.91\,\mathrm{D}$, greater than HCl, HBr and HI.`,
    },
    {
      id: 'ammonia-angle-reason', d: 2, o: 'past-paper', t: ['VSEPR'],
      q: tex`The H–N–H bond angle in $\ce{NH3}$ (about $107^{\circ}$) is smaller than the tetrahedral angle ($109.5^{\circ}$) because:`,
      a: 'the lone pair on nitrogen repels the bond pairs more strongly',
      x: [
        tex`nitrogen in ammonia is $sp^{2}$ hybridized`,
        'the N–H bonds in ammonia are purely ionic',
        'the hydrogen atoms attract one another strongly',
      ],
      e: tex`N is $sp^{3}$ hybridized with one lone pair. Lone pair–bond pair repulsion exceeds bond pair–bond pair repulsion, squeezing the H–N–H angle from $109.5^{\circ}$ to about $107^{\circ}$.`,
    },
    {
      id: 'highest-lattice-energy', d: 2, t: ['ionic and covalent bonds'],
      q: 'Which compound has the highest lattice energy?',
      a: tex`$\ce{NaF}$`,
      x: [tex`$\ce{NaCl}$`, tex`$\ce{NaBr}$`, tex`$\ce{NaI}$`],
      e: tex`With the same cation and charges, lattice energy rises as the anion gets smaller. $\ce{F-}$ is the smallest halide ion, so $\ce{NaF}$ has the highest lattice energy.`,
    },
  ]),
]);
