import { defineBank } from '@/engine/authoring';
import { ce, gcd, molarMass, num, numericOptions, pickDistractors, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local data and helpers
// ---------------------------------------------------------------------------

/** Simplest formula A_xB_y (reduced) as LaTeX, e.g. `\mathrm{AB_{3}}`. */
function abFormula(a: number, b: number): string {
  const g = gcd(a, b);
  const sub = (n: number): string => (n === 1 ? '' : `_{${n}}`);
  return `\\mathrm{A${sub(a / g)}B${sub(b / g)}}`;
}

type Cubic = 'sc' | 'bcc' | 'fcc';

const CUBIC: Record<Cubic, { name: string; atoms: number; wrongAtoms: number[]; atomsTex: string; cn: number; cnNote: string }> = {
  sc: {
    name: 'simple cubic',
    atoms: 1,
    wrongAtoms: [8, 2, 4],
    atomsTex: tex`8 \times \frac{1}{8} = 1`,
    cn: 6,
    cnNote: 'each atom touches 6 neighbours (two along each axis)',
  },
  bcc: {
    name: 'body-centred cubic',
    atoms: 2,
    wrongAtoms: [9, 1, 4],
    atomsTex: tex`8 \times \frac{1}{8} + 1 = 2`,
    cn: 8,
    cnNote: 'the body-centre atom touches the 8 corner atoms',
  },
  fcc: {
    name: 'face-centred cubic',
    atoms: 4,
    wrongAtoms: [14, 2, 7],
    atomsTex: tex`8 \times \frac{1}{8} + 6 \times \frac{1}{2} = 4`,
    cn: 12,
    cnNote: 'each atom touches 12 nearest neighbours (cubic close packing)',
  },
};

/** Sites in a cubic unit cell: share per cell, and the naive count (forgetting sharing). */
const SITES = [
  { where: 'all the corners', share: 1, naive: 8, how: tex`8 \times \frac{1}{8} = 1` },
  { where: 'the body centre', share: 1, naive: 1, how: tex`1 \times 1 = 1` },
  { where: 'all the face centres', share: 3, naive: 6, how: tex`6 \times \frac{1}{2} = 3` },
] as const;

type SolidType = 'ionic' | 'covalent' | 'molecular' | 'metallic';

const SOLID_LABEL: Record<SolidType, string> = {
  ionic: 'Ionic solid',
  covalent: 'Covalent (network) solid',
  molecular: 'Molecular solid',
  metallic: 'Metallic solid',
};

const SOLID_REASON: Record<SolidType, string> = {
  ionic: 'oppositely charged ions held together by strong electrostatic forces',
  covalent: 'atoms joined by a continuous network of covalent bonds',
  molecular: 'discrete molecules held together by weak intermolecular forces',
  metallic: 'positive metal ions held in a sea of mobile valence electrons',
};

const SOLIDS: Record<SolidType, readonly string[]> = {
  ionic: [tex`sodium chloride ($\ce{NaCl}$)`, tex`potassium bromide ($\ce{KBr}$)`, tex`magnesium oxide ($\ce{MgO}$)`, tex`calcium fluoride ($\ce{CaF2}$)`],
  covalent: ['diamond', tex`quartz ($\ce{SiO2}$)`, tex`carborundum ($\ce{SiC}$)`, 'graphite'],
  molecular: [tex`ice ($\ce{H2O}$)`, tex`iodine ($\ce{I2}$)`, tex`dry ice ($\ce{CO2}$)`, tex`cane sugar ($\ce{C12H22O11}$)`],
  metallic: ['copper', 'sodium', 'iron', 'silver'],
};

/** Series with boiling points (deg C) used for "highest / lowest boiling point" items. */
interface BpSeries {
  items: ReadonlyArray<readonly [string, number]>;
  reason: string;
}

const BP_SERIES: readonly BpSeries[] = [
  {
    items: [['H2O', 100], ['H2S', -60], ['H2Se', -41], ['H2Te', -2]],
    reason: tex`Water molecules are linked by hydrogen bonds, so $\ce{H2O}$ boils far above the others. From $\ce{H2S}$ to $\ce{H2Te}$ only dipole–dipole and London forces act, and these grow with molecular size, so $\ce{H2S}$ boils lowest.`,
  },
  {
    items: [['HF', 20], ['HCl', -85], ['HBr', -67], ['HI', -35]],
    reason: tex`$\ce{HF}$ molecules are linked by hydrogen bonds, so it boils far above the other hydrogen halides. From $\ce{HCl}$ to $\ce{HI}$ London forces grow with size, so $\ce{HCl}$ boils lowest.`,
  },
  {
    items: [['CH4', -161], ['SiH4', -112], ['GeH4', -88], ['SnH4', -52]],
    reason: tex`All these hydrides are non-polar, so only London dispersion forces act; these increase with molecular size, so boiling point rises from $\ce{CH4}$ to $\ce{SnH4}$.`,
  },
  {
    items: [['F2', -188], ['Cl2', -34], ['Br2', 59], ['I2', 184]],
    reason: tex`Halogen molecules are non-polar; London dispersion forces grow with the size and polarizability of the molecule, so boiling point rises from $\ce{F2}$ to $\ce{I2}$.`,
  },
  {
    items: [['He', -269], ['Ne', -246], ['Ar', -186], ['Kr', -153], ['Xe', -108]],
    reason: 'Noble-gas atoms attract one another only by London dispersion forces, which increase with atomic size and polarizability down the group.',
  },
  {
    items: [['CH4', -161], ['C2H6', -89], ['C3H8', -42], ['C4H10', -1], ['C5H12', 36], ['C6H14', 69]],
    reason: 'Alkanes are non-polar; London dispersion forces grow with chain length (larger surface area and polarizability), so boiling point rises with the number of carbon atoms (values quoted are for the straight-chain isomers).',
  },
];

type CrystalSystem = 'cubic' | 'tetragonal' | 'orthorhombic' | 'rhombohedral' | 'hexagonal' | 'monoclinic' | 'triclinic';

const SYSTEMS: Record<CrystalSystem, { label: string; params: string; examples: readonly string[] }> = {
  cubic: {
    label: 'cubic',
    params: tex`$a = b = c;\ \alpha = \beta = \gamma = 90^{\circ}$`,
    examples: [tex`$\ce{NaCl}$`, tex`$\ce{KCl}$`, 'diamond'],
  },
  tetragonal: {
    label: 'tetragonal',
    params: tex`$a = b \ne c;\ \alpha = \beta = \gamma = 90^{\circ}$`,
    examples: ['white tin', tex`$\ce{SnO2}$`, tex`$\ce{TiO2}$ (rutile)`],
  },
  orthorhombic: {
    label: 'orthorhombic',
    params: tex`$a \ne b \ne c;\ \alpha = \beta = \gamma = 90^{\circ}$`,
    examples: ['rhombic sulphur', tex`$\ce{KNO3}$`, tex`$\ce{BaSO4}$`],
  },
  rhombohedral: {
    label: 'rhombohedral (trigonal)',
    params: tex`$a = b = c;\ \alpha = \beta = \gamma \ne 90^{\circ}$`,
    examples: [tex`calcite ($\ce{CaCO3}$)`, tex`$\ce{NaNO3}$`],
  },
  hexagonal: {
    label: 'hexagonal',
    params: tex`$a = b \ne c;\ \alpha = \beta = 90^{\circ},\ \gamma = 120^{\circ}$`,
    examples: ['graphite', tex`$\ce{ZnO}$`, 'ordinary ice'],
  },
  monoclinic: {
    label: 'monoclinic',
    params: tex`$a \ne b \ne c;\ \alpha = \gamma = 90^{\circ} \ne \beta$`,
    examples: ['monoclinic sulphur', tex`$\ce{Na2SO4.10H2O}$`, tex`borax ($\ce{Na2B4O7.10H2O}$)`],
  },
  triclinic: {
    label: 'triclinic',
    params: tex`$a \ne b \ne c;\ \alpha \ne \beta \ne \gamma \ne 90^{\circ}$`,
    examples: [tex`$\ce{CuSO4.5H2O}$`, tex`$\ce{K2Cr2O7}$`, tex`$\ce{H3BO3}$`],
  },
};
const SYSTEM_KEYS = Object.keys(SYSTEMS) as CrystalSystem[];

const LIQUIDS = [
  { name: 'water', formula: 'H2O', dH: 40.7 },
  { name: 'ethanol', formula: 'C2H5OH', dH: 38.6 },
  { name: 'methanol', formula: 'CH3OH', dH: 35.2 },
  { name: 'benzene', formula: 'C6H6', dH: 30.8 },
] as const;

/** Hydrogen-bonding statements with the reason each is true or false. */
const HB_TRUE: Record<string, string> = {
  [tex`Water boils at a much higher temperature than $\ce{H2S}$ because of hydrogen bonding.`]:
    tex`Hydrogen bonds between $\ce{H2O}$ molecules must be broken on boiling; $\ce{H2S}$ has only weaker dipole–dipole and London forces.`,
  'Hydrogen bonding occurs when hydrogen is bonded to a small, highly electronegative atom such as F, O or N.':
    'Only small, very electronegative atoms (F, O, N) make the H atom positive enough and approach closely enough to form hydrogen bonds.',
  'Ice floats on water because hydrogen bonds hold its molecules in an open, cage-like structure.':
    'In ice each molecule is fixed tetrahedrally by hydrogen bonds, leaving empty spaces, so ice is less dense than liquid water.',
  'Hydrogen bonds hold the two strands of the DNA double helix together.':
    'Complementary base pairs (A–T and G–C) are joined by hydrogen bonds, which hold the two strands together.',
  'Ethanol mixes with water in all proportions because it forms hydrogen bonds with water molecules.':
    'The –OH group of ethanol forms hydrogen bonds with water, so the two liquids are miscible.',
  'A hydrogen bond is much weaker than a covalent bond.':
    'A hydrogen bond is roughly one-twentieth as strong as a covalent bond.',
};

const HB_FALSE: Record<string, string> = {
  'Hydrogen bonds are stronger than the covalent O–H bonds within a water molecule.':
    'Hydrogen bonds are much weaker than covalent bonds; boiling breaks hydrogen bonds, not O–H bonds.',
  [tex`$\ce{HCl}$ shows strong hydrogen bonding because chlorine is highly electronegative.`]:
    'Chlorine is too large; its diffuse lone pairs cannot form effective hydrogen bonds, so HCl shows mainly dipole–dipole attractions.',
  [tex`Methane ($\ce{CH4}$) molecules are held together by hydrogen bonds.`]:
    'Carbon is not electronegative enough; methane molecules attract one another only by London dispersion forces.',
  'Hydrogen bonding lowers the boiling point of water.':
    'Hydrogen bonding raises the boiling point of water; without it water would boil far below 0 °C.',
  'Ice is denser than liquid water because of hydrogen bonding.':
    'Hydrogen bonding gives ice an open structure, so ice is less dense than liquid water and floats.',
  'Ethanol does not dissolve in water because it cannot form hydrogen bonds.':
    'Ethanol forms hydrogen bonds with water through its –OH group and is completely miscible with it.',
};

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'liquids-solids', (b) => [
  // -------------------------------------------------------------------------
  // Dynamic templates
  // -------------------------------------------------------------------------
  b.dynamic('cubic-unit-cell', { difficulty: 2, origin: 'past-paper', tags: ['crystal lattices'] }, (r) => {
    const mode = r.pick(['atoms', 'cn', 'formula'] as const);
    if (mode === 'formula') {
      const [sa, sb] = r.sample([0, 1, 2], 2).map((i) => SITES[i as 0 | 1 | 2]);
      if (!sa || !sb) throw new Error('site sampling failed');
      const answerTex = abFormula(sa.share, sb.share);
      const candidates = [
        abFormula(sa.naive, sb.naive),
        abFormula(sb.share, sa.share),
        abFormula(1, 3),
        abFormula(3, 1),
        abFormula(1, 1),
        abFormula(1, 2),
        abFormula(2, 1),
      ].map((f) => `$${f}$`);
      return {
        stem: `In a cubic unit cell, atoms of A occupy ${sa.where} and atoms of B occupy ${sb.where}. The simplest formula of the compound is:`,
        answer: `$${answerTex}$`,
        distractors: pickDistractors(`$${answerTex}$`, candidates),
        explanation: tex`A per cell: $${sa.how}$; B per cell: $${sb.how}$. Ratio A : B $= ${sa.share} : ${sb.share}$, so the formula is $${answerTex}$ (a corner atom is shared by 8 cells, a face-centre atom by 2).`,
      };
    }
    const type = r.pick(['sc', 'bcc', 'fcc'] as const);
    const c = CUBIC[type];
    if (mode === 'atoms') {
      return {
        stem: `The number of atoms effectively belonging to one ${c.name} unit cell is:`,
        answer: `$${c.atoms}$`,
        distractors: c.wrongAtoms.map((n) => `$${n}$`),
        explanation: tex`Each corner atom is shared by 8 unit cells and each face-centre atom by 2. For a ${c.name} cell: $${c.atomsTex}$ atom${c.atoms === 1 ? '' : 's'}.`,
      };
    }
    const others = [4, 6, 8, 12].filter((n) => n !== c.cn);
    return {
      stem: `The coordination number of each atom in a ${c.name} lattice is:`,
      answer: `$${c.cn}$`,
      distractors: others.map((n) => `$${n}$`),
      explanation: `In a ${c.name} lattice ${c.cnNote}, so the coordination number is ${c.cn}. (Simple cubic 6, body-centred cubic 8, face-centred cubic 12.)`,
    };
  }),

  b.dynamic('hydrogen-bond-statements', { difficulty: 2, tags: ['hydrogen bonding'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about hydrogen bonding is correct?',
      negativeStem: 'Which statement about hydrogen bonding is incorrect?',
      truths: Object.keys(HB_TRUE),
      falsehoods: Object.keys(HB_FALSE),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false: ${HB_FALSE[answer] ?? ''} The other three statements are correct.`
          : `This statement is true: ${HB_TRUE[answer] ?? ''} Each of the other statements is false.`,
    }),
  ),

  b.dynamic('classify-solid', { difficulty: 1, origin: 'past-paper', tags: ['types of solids'] }, (r) => {
    const types: SolidType[] = ['ionic', 'covalent', 'molecular', 'metallic'];
    const target = r.pick(types);
    const others = types.filter((t) => t !== target);
    if (r.chance(0.5)) {
      const substance = r.pick(SOLIDS[target]);
      return {
        stem: `In the solid state, ${substance} is classified as:`,
        answer: `${target === 'ionic' ? 'an' : 'a'} ${SOLID_LABEL[target].toLowerCase()}`,
        distractors: others.map((t) => `${t === 'ionic' ? 'an' : 'a'} ${SOLID_LABEL[t].toLowerCase()}`),
        explanation: `${substance.charAt(0).toUpperCase()}${substance.slice(1)} consists of ${SOLID_REASON[target]}, so it is ${target === 'ionic' ? 'an' : 'a'} ${SOLID_LABEL[target].toLowerCase()}.`,
      };
    }
    const answer = r.pick(SOLIDS[target]);
    const capital = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
    const wrong = others.map((t) => [t, r.pick(SOLIDS[t])] as const);
    return {
      stem: `Which of the following is ${target === 'ionic' ? 'an' : 'a'} ${SOLID_LABEL[target].toLowerCase()}?`,
      answer: capital(answer),
      distractors: wrong.map(([, s]) => capital(s)),
      explanation: `${capital(answer)} consists of ${SOLID_REASON[target]}. By contrast, ${wrong
        .map(([t, s]) => `${s} is ${t === 'ionic' ? 'an' : 'a'} ${SOLID_LABEL[t].toLowerCase()}`)
        .join('; ')}.`,
    };
  }),

  b.dynamic('boiling-point-extremes', { difficulty: 2, tags: ['intermolecular forces', 'hydrogen bonding'] }, (r) => {
    const series = r.pick(BP_SERIES);
    const chosen =
      series.items.length > 4
        ? r
            .sample(
              series.items.map((_, i) => i),
              4,
            )
            .sort((x, y) => x - y)
            .map((i) => series.items[i] as readonly [string, number])
        : [...series.items];
    const highest = r.chance(0.55);
    const sorted = [...chosen].sort((x, y) => x[1] - y[1]);
    const target = (highest ? sorted[sorted.length - 1] : sorted[0]) as readonly [string, number];
    const opt = (f: string): string => `$${ce(f)}$`;
    const list = sorted.map(([f, t]) => `$${ce(f)}$: $${t}$`).join('; ');
    return {
      stem: `Which of the following has the ${highest ? 'highest' : 'lowest'} boiling point?`,
      answer: opt(target[0]),
      distractors: chosen.filter((x) => x !== target).map(([f]) => opt(f)),
      explanation: tex`${series.reason} Approximate boiling points ($^{\circ}\mathrm{C}$): ${list}.`,
    };
  }),

  b.dynamic('crystal-system', { difficulty: 2, origin: 'past-paper', tags: ['crystal lattices'] }, (r) => {
    const key = r.pick(SYSTEM_KEYS);
    const sys = SYSTEMS[key];
    const others = r.sample(
      SYSTEM_KEYS.filter((k) => k !== key),
      3,
    );
    const mode = r.pick(['example', 'params', 'reverse'] as const);
    if (mode === 'reverse') {
      return {
        stem: `The unit-cell dimensions of the ${sys.label} crystal system are:`,
        answer: sys.params,
        distractors: others.map((k) => SYSTEMS[k].params),
        explanation: `The ${sys.label} system has ${sys.params}. Examples: ${sys.examples.join(', ')}.`,
      };
    }
    if (mode === 'params') {
      return {
        stem: `A crystal system whose unit cell has ${sys.params} is:`,
        answer: sys.label,
        distractors: others.map((k) => SYSTEMS[k].label),
        explanation: `These axial lengths and angles define the ${sys.label} system, e.g. ${sys.examples.join(', ')}.`,
      };
    }
    // Skip examples whose name gives the answer away (e.g. 'monoclinic sulphur').
    const example = r.pick(sys.examples.filter((e) => !e.toLowerCase().includes(key)));
    return {
      stem: `${example.charAt(0).toUpperCase()}${example.slice(1)} crystallizes in the:`,
      answer: `${sys.label} system`,
      distractors: others.map((k) => `${SYSTEMS[k].label} system`),
      explanation: `${example.charAt(0).toUpperCase()}${example.slice(1)} belongs to the ${sys.label} system, whose unit cell has ${sys.params}.`,
    };
  }),

  b.dynamic('heat-of-vaporization', { difficulty: 2, tags: ['vapour pressure', 'intermolecular forces'] }, (r) => {
    const liq = r.pick(LIQUIDS);
    const M = molarMass(liq.formula);
    const n = r.pick([0.5, 1.5, 2, 2.5, 3, 4, 5]);
    const m = n * M;
    const heat = n * liq.dH;
    const fmt = (x: number): string => q$(x, U.kJ, { dp: 2 });
    const { answer, distractors } = numericOptions(r, {
      correct: heat,
      wrong: [m * liq.dH, liq.dH, liq.dH / n],
      format: fmt,
    });
    return {
      stem: tex`The molar heat of vaporization of ${liq.name} ($${ce(liq.formula)}$) is $${qty(liq.dH, U.kJmol)}$. The heat required to vaporize $${qty(m, U.g)}$ of ${liq.name} at its boiling point is:`,
      answer,
      distractors,
      explanation: tex`$n = \frac{m}{M} = \frac{${num(m)}}{${M}} = ${num(n)}\,\mathrm{mol}$; $q = n\,\Delta H_{v} = ${num(n)} \times ${num(liq.dH)} = ${num(heat, { dp: 2 })}\,\mathrm{kJ}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Fixed recall items
  // -------------------------------------------------------------------------
  ...b.mcqs([
    {
      id: 'boiling-at-hill-station', d: 1, o: 'past-paper', t: ['vapour pressure'],
      q: 'At a hill station such as Murree, water boils at a temperature:',
      a: 'below 100 °C, because the external pressure is lower',
      x: [
        'above 100 °C, because the external pressure is lower',
        'above 100 °C, because the air is colder',
        'of exactly 100 °C, because boiling point is a constant',
      ],
      e: 'A liquid boils when its vapour pressure equals the external pressure. At altitude the atmospheric pressure is lower, so this is reached below 100 °C.',
    },
    {
      id: 'vapour-pressure-depends-on', d: 1, t: ['vapour pressure'],
      q: 'For a given pure liquid, the equilibrium vapour pressure depends only on:',
      a: 'the temperature',
      x: ['the surface area of the liquid', 'the volume of liquid taken', 'the volume of the container'],
      e: 'At equilibrium the rates of evaporation and condensation are equal; changing surface area or amount changes both rates equally, so vapour pressure depends only on the nature of the liquid and the temperature.',
    },
    {
      id: 'highest-vapour-pressure', d: 2, t: ['vapour pressure', 'intermolecular forces'],
      q: 'At 20 °C, which of the following liquids has the highest vapour pressure?',
      a: 'Diethyl ether',
      x: ['Water', 'Ethanol', 'Glycerol'],
      e: 'Diethyl ether molecules cannot hydrogen-bond with one another, so its intermolecular forces are the weakest and it evaporates most readily. Water, ethanol and glycerol are hydrogen-bonded (glycerol, with three –OH groups, most strongly).',
    },
    {
      id: 'water-maximum-density', d: 1, o: 'past-paper', t: ['hydrogen bonding'],
      q: 'Liquid water has its maximum density at:',
      a: '4 °C',
      x: ['0 °C', '100 °C', '−4 °C'],
      e: 'On warming from 0 °C, the open hydrogen-bonded structure collapses and water contracts until 4 °C; above this, normal thermal expansion dominates, so density is greatest at 4 °C.',
    },
    {
      id: 'debye-forces', d: 2, t: ['intermolecular forces'],
      q: 'Besides London dispersion forces, a polar HCl molecule and a non-polar argon atom attract each other by:',
      a: 'dipole–induced dipole (Debye) forces',
      x: ['dipole–dipole forces', 'hydrogen bonds', 'ion–dipole forces'],
      e: 'The permanent dipole of HCl distorts the electron cloud of the argon atom and induces a temporary dipole in it; argon has no permanent dipole, so dipole–dipole attraction is not possible.',
    },
    {
      id: 'hydrogen-bonds-in-ice', d: 2, t: ['hydrogen bonding'],
      q: 'In ice, each water molecule is hydrogen-bonded to how many neighbouring water molecules?',
      a: 'Four, arranged tetrahedrally',
      x: ['Two, arranged linearly', 'Three, arranged in a plane', 'Six, arranged octahedrally'],
      e: 'Each water molecule donates two hydrogen bonds through its two H atoms and accepts two through the lone pairs on oxygen, giving four tetrahedrally arranged neighbours and an open structure.',
    },
    {
      id: 'liquid-crystals-discovery', d: 2, t: ['types of solids'],
      q: 'Liquid crystals were first observed in 1888 by:',
      a: 'Friedrich Reinitzer',
      x: ['Fritz London', 'Peter Debye', 'Johannes van der Waals'],
      e: 'The Austrian botanist Friedrich Reinitzer noticed that cholesteryl benzoate melts to a cloudy liquid which turns clear only at a higher temperature. London and Debye are known for intermolecular forces, van der Waals for real gases.',
    },
    {
      id: 'polymorphism-calcium-carbonate', d: 2, t: ['types of solids', 'crystal lattices'],
      q: tex`Calcite and aragonite are two different crystalline forms of $\ce{CaCO3}$. This is an example of:`,
      a: 'polymorphism',
      x: ['isomorphism', 'allotropy', 'anisotropy'],
      e: 'A compound existing in more than one crystalline form shows polymorphism. Allotropy is the same behaviour for an element; isomorphism means different compounds sharing the same crystal form.',
    },
    {
      id: 'crystal-systems-count', d: 1, o: 'past-paper', t: ['crystal lattices'],
      q: 'The number of crystal systems and of Bravais lattices are, respectively:',
      a: '7 and 14',
      x: ['14 and 7', '7 and 32', '6 and 14'],
      e: 'All crystals fall into 7 crystal systems (cubic, tetragonal, orthorhombic, rhombohedral, hexagonal, monoclinic, triclinic), which give 14 Bravais lattices. 32 is the number of crystal classes (point groups).',
    },
    {
      id: 'amorphous-solid-property', d: 1, t: ['types of solids'],
      q: 'Which property distinguishes an amorphous solid from a crystalline solid?',
      a: 'It softens over a range of temperatures instead of melting sharply',
      x: [
        'It has a regular three-dimensional arrangement of particles',
        'Its properties differ in different directions (anisotropy)',
        'It has a definite geometrical shape with plane faces',
      ],
      e: 'Amorphous solids (glass, plastics, rubber) lack long-range order, so they have no sharp melting point and are isotropic; the other three are features of crystalline solids.',
    },
    {
      id: 'graphite-conducts', d: 1, o: 'past-paper', t: ['types of solids'],
      q: 'Graphite conducts electricity because:',
      a: tex`each carbon is $sp^{2}$ hybridized, leaving one delocalized electron per atom`,
      x: [
        tex`each carbon is $sp^{3}$ hybridized and bonded tetrahedrally to four others`,
        'it is an ionic solid whose ions move between the layers',
        'its layers are held together by strong covalent bonds',
      ],
      e: tex`In graphite each carbon uses three $sp^{2}$ orbitals to bond within a hexagonal layer; the fourth electron is delocalized over the layer and carries current. The layers are held only by weak forces.`,
    },
    {
      id: 'nacl-coordination-number', d: 2, t: ['crystal lattices', 'types of solids'],
      q: tex`In the sodium chloride crystal, the coordination number of each $\ce{Na+}$ ion is:`,
      a: '6',
      x: ['4', '8', '12'],
      e: tex`Each $\ce{Na+}$ is surrounded octahedrally by 6 $\ce{Cl-}$ ions and each $\ce{Cl-}$ by 6 $\ce{Na+}$ ions (6 : 6 coordination). In $\ce{CsCl}$ it is 8 : 8.`,
    },
    {
      id: 'tin-transition-temperature', d: 2, t: ['types of solids'],
      q: 'Grey tin and white tin are in equilibrium at their transition temperature of about:',
      a: '13.2 °C',
      x: ['95.5 °C', '232 °C', '0 °C'],
      e: 'Below 13.2 °C the stable form is grey tin; above it, white tin. 95.5 °C is the transition temperature of rhombic to monoclinic sulphur, and 232 °C is the melting point of tin.',
    },
    {
      id: 'water-versus-hf-boiling', d: 3, t: ['hydrogen bonding', 'intermolecular forces'],
      q: tex`A single hydrogen bond in $\ce{HF}$ is stronger than one in $\ce{H2O}$, yet water boils at a much higher temperature. The best explanation is that:`,
      a: 'each water molecule can form up to four hydrogen bonds, whereas HF forms on average only two',
      x: [
        'the H–F covalent bond is weaker than the O–H covalent bond',
        'water has a larger molar mass than hydrogen fluoride',
        'HF molecules are non-polar, while water molecules are polar',
      ],
      e: tex`$\ce{H2O}$ has two H atoms and two lone pairs, so it builds a 3-D network of up to four hydrogen bonds per molecule; $\ce{HF}$ has one H atom and forms zig-zag chains. The H–F bond is in fact stronger, $M(\ce{H2O}) = 18 < M(\ce{HF}) = 20$, and HF is highly polar.`,
    },
  ]),
]);
