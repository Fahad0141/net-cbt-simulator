import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';

/** A statement with the reason it is true, or the correction that shows it is false. */
interface Claim {
  s: string;
  why: string;
}

const reasonOf = (list: readonly Claim[], text: string): string =>
  list.find((c) => c.s === text)?.why ?? '';

/** Signed oxidation state as an option: `$+3$`, `$0$`. */
const ox$ = (x: number): string => (x > 0 ? `$+${x}$` : `$${x}$`);

// ---------------------------------------------------------------- general properties

const PROPERTY_TRUE: readonly Claim[] = [
  {
    s: 'Transition elements show variable oxidation states.',
    why: tex`The $(n-1)d$ and $ns$ electrons are close in energy, so different numbers of them can take part in bonding (e.g. Mn shows $+2$ to $+7$).`,
  },
  {
    s: 'Most compounds of transition elements are coloured.',
    why: 'Ions with a partly filled d subshell absorb visible light when an electron jumps between split d orbitals (d-d transition); the transmitted light is coloured.',
  },
  {
    s: 'Transition elements and their compounds often act as catalysts.',
    why: tex`Variable oxidation states and free d orbitals let them adsorb reactants and form intermediates, e.g. Fe in the Haber process and $\ce{V2O5}$ in the Contact process.`,
  },
  {
    s: 'Transition metal ions readily form complex compounds.',
    why: 'Their small, highly charged ions have vacant d orbitals that accept lone pairs from ligands.',
  },
  {
    s: 'Ions with unpaired d electrons are paramagnetic.',
    why: 'Each unpaired electron has a net spin magnetic moment, so the ion is attracted into a magnetic field.',
  },
  {
    s: tex`On ionization of a 3d element, the $4s$ electrons are lost before the $3d$ electrons.`,
    why: tex`Once the 3d orbitals are occupied they lie below 4s in energy, so ions form by removing 4s electrons first (e.g. $\ce{Fe^2+}$ is $[\mathrm{Ar}]\,3d^6$).`,
  },
];

const PROPERTY_FALSE: readonly Claim[] = [
  {
    s: tex`In transition elements the differentiating electron enters an $np$ subshell.`,
    why: tex`The differentiating electron enters an $(n-1)d$ subshell in d-block (outer transition) elements and an $(n-2)f$ subshell in f-block (inner transition) elements; it enters $np$ only in p-block elements.`,
  },
  {
    s: tex`Compounds containing $\ce{Zn^2+}$ ions are usually deeply coloured.`,
    why: tex`$\ce{Zn^2+}$ is $3d^{10}$; with a completely filled d subshell no d-d transition is possible, so its compounds are white or colourless.`,
  },
  {
    s: 'The highest oxidation state shown by manganese is +6.',
    why: tex`Manganese ($3d^5\,4s^2$) can use all seven electrons and shows $+7$, as in $\ce{KMnO4}$.`,
  },
  {
    s: 'All transition metal ions are diamagnetic.',
    why: tex`Most transition metal ions contain unpaired d electrons and are paramagnetic; ions with no unpaired electrons, such as $\ce{Sc^3+}$ ($d^0$) and $\ce{Zn^2+}$ ($d^{10}$), are diamagnetic.`,
  },
  {
    s: 'Transition metals generally have low melting points and low densities.',
    why: 'Strong metallic bonding, in which both s and unpaired d electrons take part, gives transition metals high melting points; their small atomic radii and relatively large atomic masses give high densities.',
  },
  {
    s: tex`Iron is the catalyst used in the Contact process for $\ce{H2SO4}$.`,
    why: tex`The Contact process uses $\ce{V2O5}$ (or Pt); finely divided iron is the catalyst of the Haber process for $\ce{NH3}$.`,
  },
];

// ---------------------------------------------------------------- complexes

interface Complex {
  /** mhchem formula. */
  f: string;
  /** Central metal symbol. */
  m: string;
  /** Oxidation state of the central metal. */
  ox: number;
  /** Charge balance as a LaTeX equation in x. */
  calc: string;
  /** Coordination number. */
  cn: number;
  /** How the coordination number arises. */
  cnWhy: string;
  /** A tempting wrong coordination number (e.g. number of bidentate ligands). */
  cnTrap: number;
}

const COMPLEXES: readonly Complex[] = [
  {
    f: 'K4[Fe(CN)6]', m: 'Fe', ox: 2, calc: '4(+1) + x + 6(-1) = 0', cn: 6,
    cnWhy: tex`six monodentate $\ce{CN-}$ ligands`, cnTrap: 4,
  },
  {
    f: 'K3[Fe(CN)6]', m: 'Fe', ox: 3, calc: '3(+1) + x + 6(-1) = 0', cn: 6,
    cnWhy: tex`six monodentate $\ce{CN-}$ ligands`, cnTrap: 3,
  },
  {
    f: '[Cu(NH3)4]SO4', m: 'Cu', ox: 2, calc: 'x + 4(0) + (-2) = 0', cn: 4,
    cnWhy: tex`four monodentate $\ce{NH3}$ ligands`, cnTrap: 2,
  },
  {
    f: '[Co(NH3)6]Cl3', m: 'Co', ox: 3, calc: 'x + 6(0) + 3(-1) = 0', cn: 6,
    cnWhy: tex`six monodentate $\ce{NH3}$ ligands (the three $\ce{Cl-}$ are outside the sphere)`, cnTrap: 9,
  },
  {
    f: '[Ni(CO)4]', m: 'Ni', ox: 0, calc: 'x + 4(0) = 0', cn: 4,
    cnWhy: tex`four monodentate $\ce{CO}$ ligands`, cnTrap: 8,
  },
  {
    f: '[Ag(NH3)2]Cl', m: 'Ag', ox: 1, calc: 'x + 2(0) + (-1) = 0', cn: 2,
    cnWhy: tex`two monodentate $\ce{NH3}$ ligands`, cnTrap: 3,
  },
  {
    f: 'Na3[Co(NO2)6]', m: 'Co', ox: 3, calc: '3(+1) + x + 6(-1) = 0', cn: 6,
    cnWhy: tex`six monodentate $\ce{NO2-}$ ligands`, cnTrap: 3,
  },
  {
    f: 'K3[Fe(C2O4)3]', m: 'Fe', ox: 3, calc: '3(+1) + x + 3(-2) = 0', cn: 6,
    cnWhy: tex`three bidentate oxalate ($\ce{C2O4^2-}$) ligands, each donating two pairs: $3 \times 2 = 6$`, cnTrap: 3,
  },
  {
    f: '[Co(en)3]Cl3', m: 'Co', ox: 3, calc: 'x + 3(0) + 3(-1) = 0', cn: 6,
    cnWhy: tex`three bidentate ethylenediamine (en) ligands: $3 \times 2 = 6$`, cnTrap: 3,
  },
  {
    f: '[Cu(en)2]SO4', m: 'Cu', ox: 2, calc: 'x + 2(0) + (-2) = 0', cn: 4,
    cnWhy: tex`two bidentate ethylenediamine (en) ligands: $2 \times 2 = 4$`, cnTrap: 2,
  },
  {
    f: 'K2[PtCl6]', m: 'Pt', ox: 4, calc: '2(+1) + x + 6(-1) = 0', cn: 6,
    cnWhy: tex`six monodentate $\ce{Cl-}$ ligands`, cnTrap: 8,
  },
  {
    f: '[Fe(CO)5]', m: 'Fe', ox: 0, calc: 'x + 5(0) = 0', cn: 5,
    cnWhy: tex`five monodentate $\ce{CO}$ ligands`, cnTrap: 10,
  },
  {
    f: '[CoCl(NH3)5]Cl2', m: 'Co', ox: 3, calc: 'x + (-1) + 5(0) + 2(-1) = 0', cn: 6,
    cnWhy: tex`five $\ce{NH3}$ and one $\ce{Cl-}$ inside the bracket (the two outer $\ce{Cl-}$ are counter ions)`, cnTrap: 5,
  },
  {
    f: 'K2[Ni(CN)4]', m: 'Ni', ox: 2, calc: '2(+1) + x + 4(-1) = 0', cn: 4,
    cnWhy: tex`four monodentate $\ce{CN-}$ ligands`, cnTrap: 2,
  },
  {
    f: '[Cr(H2O)6]Cl3', m: 'Cr', ox: 3, calc: 'x + 6(0) + 3(-1) = 0', cn: 6,
    cnWhy: tex`six monodentate $\ce{H2O}$ ligands`, cnTrap: 9,
  },
];

// ---------------------------------------------------------------- 3d ions

interface Ion3d {
  sym: string;
  z: number;
  charge: number;
}

const IONS: readonly Ion3d[] = [
  { sym: 'Ti', z: 22, charge: 3 },
  { sym: 'V', z: 23, charge: 3 },
  { sym: 'V', z: 23, charge: 2 },
  { sym: 'Cr', z: 24, charge: 3 },
  { sym: 'Cr', z: 24, charge: 2 },
  { sym: 'Mn', z: 25, charge: 2 },
  { sym: 'Mn', z: 25, charge: 3 },
  { sym: 'Fe', z: 26, charge: 2 },
  { sym: 'Fe', z: 26, charge: 3 },
  { sym: 'Co', z: 27, charge: 2 },
  { sym: 'Co', z: 27, charge: 3 },
  { sym: 'Ni', z: 28, charge: 2 },
  { sym: 'Cu', z: 29, charge: 2 },
  { sym: 'Sc', z: 21, charge: 3 },
  { sym: 'Zn', z: 30, charge: 2 },
];

/** Unpaired electrons in a free d^n ion (Hund's rule). */
const unpaired = (d: number): number => (d <= 5 ? d : 10 - d);
const dSup = (d: number): string => (d >= 10 ? `{${d}}` : `${d}`);

// ---------------------------------------------------------------- redox titrations

interface Titration {
  ox: string;
  oxName: string;
  red: string;
  redName: string;
  eq: string;
  /** Mole ratio oxidant : reductant = a : b. */
  a: number;
  b: number;
  /** The ratio a student would use if they confused this oxidant with the other one. */
  bAlt: number;
}

const TITRATIONS: readonly Titration[] = [
  {
    ox: '\\ce{KMnO4}', oxName: 'acidified potassium permanganate',
    red: '\\ce{FeSO4}', redName: 'iron(II) sulphate',
    eq: '\\ce{MnO4- + 5Fe^2+ + 8H+ -> Mn^2+ + 5Fe^3+ + 4H2O}', a: 1, b: 5, bAlt: 6,
  },
  {
    ox: '\\ce{K2Cr2O7}', oxName: 'acidified potassium dichromate',
    red: '\\ce{FeSO4}', redName: 'iron(II) sulphate',
    eq: '\\ce{Cr2O7^2- + 6Fe^2+ + 14H+ -> 2Cr^3+ + 6Fe^3+ + 7H2O}', a: 1, b: 6, bAlt: 5,
  },
  {
    ox: '\\ce{KMnO4}', oxName: 'acidified potassium permanganate',
    red: '\\ce{H2C2O4}', redName: 'oxalic acid',
    eq: '\\ce{2MnO4- + 5H2C2O4 + 6H+ -> 2Mn^2+ + 10CO2 + 8H2O}', a: 2, b: 5, bAlt: 5,
  },
];

export default defineBank('chemistry', 'transition-elements', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('properties-statements', { difficulty: 1, tags: ['properties'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements about transition elements is correct?',
      negativeStem: 'Which of the following statements about transition elements is NOT correct?',
      truths: PROPERTY_TRUE.map((c) => c.s),
      falsehoods: PROPERTY_FALSE.map((c) => c.s),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false: ${reasonOf(PROPERTY_FALSE, answer)}`
          : `This statement is true: ${reasonOf(PROPERTY_TRUE, answer)}`,
    }),
  ),

  b.dynamic('complex-ox-state-cn', { difficulty: 2, origin: 'past-paper', tags: ['complex compounds'] }, (r) => {
    const c = r.pick(COMPLEXES);
    if (r.chance(0.5)) {
      const answer = ox$(c.ox);
      const near = [c.ox + 1, c.ox - 1, c.ox + 2, c.ox - 2, c.ox + 3, c.ox + 4].filter((v) => v >= 0 && v <= 7);
      return {
        stem: tex`The oxidation state of ${c.m} in $\ce{${c.f}}$ is:`,
        answer,
        distractors: pickDistractors(answer, near.map(ox$)),
        explanation: tex`Let the oxidation state of ${c.m} be $x$. Neutral ligands count as $0$ and the compound is neutral: $${c.calc}$, so $x = ${c.ox > 0 ? `+${c.ox}` : `${c.ox}`}$.`,
      };
    }
    const answer = `$${c.cn}$`;
    const cands = [c.cnTrap, c.cn + 2, c.cn - 2, c.cn + 1, c.cn - 1, 8]
      .filter((v) => v >= 2 && v !== c.cn)
      .map((v) => `$${v}$`);
    return {
      stem: tex`The coordination number of ${c.m} in $\ce{${c.f}}$ is:`,
      answer,
      distractors: pickDistractors(answer, cands),
      explanation: tex`Coordination number is the number of donor atoms bonded to the central metal. Here ${c.m} is attached to ${c.cnWhy}, so the coordination number is $${c.cn}$.`,
    };
  }),

  b.dynamic('unpaired-electrons-moment', { difficulty: 2, tags: ['properties'] }, (r) => {
    const ion = r.pick(IONS);
    const d = ion.z - 18 - ion.charge;
    const n = unpaired(d);
    const ionTex = `\\ce{${ion.sym}^${ion.charge}+}`;
    const config = `[\\mathrm{Ar}]\\,3d^${dSup(d)}`;
    // Mistake: removing 3d electrons before 4s (keeps 4s^2).
    const dWrong = Math.max(0, ion.z - 20 - ion.charge);
    const wrongN = [unpaired(dWrong), d, n + 1, n - 1, n + 2, n - 2].filter((v) => v >= 0 && v <= 6);
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        // n + 3 keeps d0/d10 ions (n = 0) from falling back to negative counts.
        correct: n,
        wrong: [...wrongN, n + 3],
        format: (x) => `$${x}$`,
        allowZero: true,
      });
      return {
        stem: tex`The number of unpaired electrons in the gaseous $${ionTex}$ ion ($Z = ${ion.z}$ for ${ion.sym}) is:`,
        answer,
        distractors,
        explanation: tex`On ionization the 4s electrons are removed first, so $${ionTex}$ is $${config}$. By Hund's rule the $${d}$ d electrons occupy the five d orbitals singly before pairing, leaving $${n}$ unpaired.`,
      };
    }
    const mu = (k: number): number => Math.sqrt(k * (k + 2));
    const { answer, distractors } = numericOptions(r, {
      correct: mu(n),
      wrong: [...wrongN.map(mu), mu(n + 3)],
      format: (x) => q$(x, 'BM', { dp: 2, keepZeros: true }),
      allowZero: true,
    });
    return {
      stem: tex`The spin-only magnetic moment of the gaseous $${ionTex}$ ion ($Z = ${ion.z}$ for ${ion.sym}) is:`,
      answer,
      distractors,
      explanation: tex`$${ionTex}$ is $${config}$ with $n = ${n}$ unpaired electron(s). $\mu = \sqrt{n(n+2)} = \sqrt{${n}(${n + 2})} = ${num(mu(n), { dp: 2, keepZeros: true })}\,\mathrm{BM}$.`,
    };
  }),

  b.dynamic('redox-titration-volume', { difficulty: 2, tags: ['chromate and permanganate'] }, (r) => {
    const t = r.pick(TITRATIONS);
    let vo = 20;
    let mo = 0.02;
    let vr = 25;
    let mr = (mo * vo * t.b) / (t.a * vr);
    for (let i = 0; i < 60; i++) {
      const v = r.int(8, 40);
      const m = r.pick([0.01, 0.02, 0.04, 0.05, 0.1]);
      const w = r.pick([10, 20, 25, 50]);
      const c = (m * v * t.b) / (t.a * w);
      const nice = Math.abs(c * 100 - Math.round(c * 100)) < 1e-9 && c >= 0.01 && c <= 0.5;
      if (nice) {
        vo = v;
        mo = m;
        vr = w;
        mr = Number(c.toFixed(2));
        break;
      }
    }
    const { answer, distractors } = numericOptions(r, {
      correct: vo,
      wrong: [(vo * t.b) / t.a, (vo * t.a) / t.b, (vo * t.b) / t.bAlt, (vo * t.b * t.b) / (t.a * t.a)],
      format: (x) => q$(x, U.cm3),
    });
    return {
      stem: tex`What volume of $${num(mo)}\,\mathrm{M}$ ${t.oxName} ($${t.ox}$) is needed to react completely with $${qty(vr, U.cm3)}$ of $${num(mr)}\,\mathrm{M}$ ${t.redName} ($${t.red}$)?`,
      answer,
      distractors,
      explanation: tex`$$${t.eq}$$ Oxidant : reductant $= ${t.a} : ${t.b}$, so $\dfrac{M_1V_1}{${t.a}} = \dfrac{M_2V_2}{${t.b}}$ (1 = oxidant, 2 = reductant). $V_1 = \dfrac{${t.a}(${num(mr)})(${vr})}{${t.b}(${num(mo)})} = ${num(vo)}\,\mathrm{cm^{3}}$.`,
    };
  }),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'non-typical-zinc', d: 1, o: 'past-paper', t: ['properties'],
      q: 'Which of the following is a non-typical transition element?',
      a: 'Zinc',
      x: ['Iron', 'Chromium', 'Nickel'],
      e: tex`The elements of group IIB (Zn, Cd, Hg) and group IIIB are called non-typical transition elements; Zn has a completely filled $3d^{10}$ subshell in the atom and in its only ion $\ce{Zn^2+}$.`,
    },
    {
      id: 'chromium-configuration', d: 1, o: 'past-paper', t: ['properties'],
      q: tex`The ground-state electronic configuration of chromium ($Z = 24$) is:`,
      a: tex`$[\mathrm{Ar}]\,3d^5\,4s^1$`,
      x: [tex`$[\mathrm{Ar}]\,3d^4\,4s^2$`, tex`$[\mathrm{Ar}]\,3d^6\,4s^0$`, tex`$[\mathrm{Ar}]\,3d^3\,4s^2\,4p^1$`],
      e: tex`A half-filled $3d^5$ subshell is extra stable (exchange energy, symmetry), so one 4s electron moves into 3d: $[\mathrm{Ar}]\,3d^5\,4s^1$ rather than the Aufbau-predicted $3d^4\,4s^2$.`,
    },
    {
      id: 'colourless-zinc-ion', d: 1, t: ['properties'],
      q: 'Which of the following ions gives a colourless aqueous solution?',
      a: tex`$\ce{Zn^2+}$`,
      x: [tex`$\ce{Cu^2+}$`, tex`$\ce{Ni^2+}$`, tex`$\ce{Cr^3+}$`],
      e: tex`$\ce{Zn^2+}$ is $3d^{10}$, so no d-d transition is possible and it is colourless. $\ce{Cu^2+}$ ($3d^9$) is blue, $\ce{Ni^2+}$ ($3d^8$) green and $\ce{Cr^3+}$ ($3d^3$) green/violet.`,
    },
    {
      id: 'ferrocyanide-name', d: 2, t: ['complex compounds'],
      q: tex`The IUPAC name of $\ce{K4[Fe(CN)6]}$ is:`,
      a: 'potassium hexacyanoferrate(II)',
      x: ['potassium hexacyanoferrate(III)', 'potassium hexacyanoiron(II)', 'potassium hexacyanoiron(III)'],
      e: tex`In an anionic complex the metal name ends in "-ate" (iron becomes ferrate). Oxidation state: $4(+1) + x + 6(-1) = 0$ gives $x = +2$, hence hexacyanoferrate(II).`,
    },
    {
      id: 'en-bidentate', d: 1, t: ['complex compounds'],
      q: tex`Ethylenediamine ($\ce{H2N-CH2-CH2-NH2}$) acts as a ligand that is:`,
      a: 'bidentate',
      x: ['monodentate', 'tridentate', 'hexadentate'],
      e: 'Each of its two nitrogen atoms carries a lone pair, so one en molecule binds the metal through two donor atoms (a bidentate chelating ligand). EDTA is the common hexadentate ligand.',
    },
    {
      id: 'cast-iron-carbon', d: 1, o: 'past-paper', t: ['iron and steel'],
      q: 'The percentage of carbon in cast iron is about:',
      a: tex`$2.5$ to $4.5\%$`,
      x: [tex`$0.12$ to $0.25\%$`, tex`$0.25$ to $2.5\%$`, tex`$5$ to $8\%$`],
      e: tex`Cast (pig) iron contains about $2.5$ to $4.5\%$ carbon. Wrought iron, the purest commercial iron, has $0.12$ to $0.25\%$, and steel lies between them ($0.25$ to $2.5\%$).`,
    },
    {
      id: 'purest-iron', d: 1, t: ['iron and steel'],
      q: 'The purest commercial form of iron is:',
      a: 'wrought iron',
      x: ['cast iron', 'pig iron', 'steel'],
      e: tex`Wrought iron contains only about $0.12$ to $0.25\%$ carbon, the least of the commercial forms; pig and cast iron contain $2.5$ to $4.5\%$ and steel $0.25$ to $2.5\%$.`,
    },
    {
      id: 'steel-annealing', d: 2, t: ['iron and steel'],
      q: 'Heating steel to bright redness and then allowing it to cool slowly, which makes it soft, is called:',
      a: 'annealing',
      x: ['quenching', 'tempering', 'case hardening'],
      e: 'Slow cooling from red heat (annealing) softens steel. Quenching is sudden cooling, which makes it hard and brittle; tempering is reheating hardened steel to a moderate temperature; case hardening hardens only the surface.',
    },
    {
      id: 'kmno4-acid-change', d: 2, o: 'past-paper', t: ['chromate and permanganate'],
      q: tex`When $\ce{KMnO4}$ acts as an oxidizing agent in acidic medium, the oxidation number of manganese changes by:`,
      a: '5 units',
      x: ['3 units', '1 unit', '7 units'],
      e: tex`In acid, $\ce{MnO4- + 8H+ + 5e- -> Mn^2+ + 4H2O}$: Mn goes from $+7$ to $+2$, a change of 5. A change of 3 ($+7 \to +4$, $\ce{MnO2}$) occurs in neutral medium and 1 ($+7 \to +6$) in strongly alkaline medium.`,
    },
    {
      id: 'chromate-to-dichromate', d: 2, t: ['chromate and permanganate'],
      q: 'When dilute acid is added to a yellow solution of potassium chromate, the solution turns orange because:',
      a: 'chromate ions change into dichromate ions',
      x: ['chromate ions are reduced to chromium(III) ions', 'dichromate ions change into chromate ions', 'chromium is oxidized to the +7 state'],
      e: tex`$\ce{2CrO4^2- + 2H+ <=> Cr2O7^2- + H2O}$: yellow chromate becomes orange dichromate. Chromium stays $+6$ throughout; reduction to $\ce{Cr^3+}$ would give a green colour, and alkali reverses the change.`,
    },
    {
      id: 'chromyl-chloride', d: 2, t: ['chromate and permanganate'],
      q: tex`A solid chloride heated with $\ce{K2Cr2O7}$ and concentrated $\ce{H2SO4}$ gives red-brown vapours of:`,
      a: tex`$\ce{CrO2Cl2}$`,
      x: [tex`$\ce{CrCl3}$`, tex`$\ce{CrO3}$`, tex`$\ce{Cl2O7}$`],
      e: tex`This is the chromyl chloride test: $\ce{K2Cr2O7 + 4KCl + 6H2SO4 -> 2CrO2Cl2 + 6KHSO4 + 3H2O}$. Chromyl chloride ($\ce{CrO2Cl2}$) distils as deep red-brown vapour.`,
    },
  ]),
]);

