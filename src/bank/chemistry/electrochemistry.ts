import { defineBank } from '@/engine/authoring';
import type { Rng } from '@/engine/rng';
import { ce, ELEMENTS, num, numericOptions, q$, qty, statementQuestion, tex } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** `x` has at most `dp` decimal places. */
function isTidy(x: number, dp: number): boolean {
  const scaled = x * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

/** `x` is tidy (at most 3 decimals) and prints exactly with 4 significant figures. */
function shows4(x: number): boolean {
  return isTidy(x, 3) && Math.abs(Number(num(x, { sig: 4 })) - x) < 1e-9;
}

/** Draws from `draw` until `ok` accepts the value (rng-driven, so deterministic). */
function drawUntil<T>(r: Rng, draw: (r: Rng) => T, ok: (v: T) => boolean): T {
  for (let i = 0; i < 500; i++) {
    const v = draw(r);
    if (ok(v)) return v;
  }
  throw new Error('electrochemistry: no acceptable parameters found');
}

/** Oxidation number as display text: +6, -1, 0. */
const oxText = (v: number): string => (v > 0 ? `+${v}` : String(v));
const ox$ = (v: number): string => `$${oxText(v)}$`;

/** Signed potential in volts, two decimals: +0.34 V, -0.76 V. */
const volt = (v: number): string => {
  const s = num(Math.abs(v), { dp: 2, keepZeros: true });
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}${s}\\,\\mathrm{V}`;
};

const atomicMass = (el: string): number => ELEMENTS[el]?.mass ?? NaN;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface OxCase {
  /** mhchem formula. */
  f: string;
  /** Element asked about. */
  el: string;
  /** Number of atoms of `el` in the formula. */
  cnt: number;
  /** Overall charge of the species. */
  q: number;
  /** Other atoms or groups: [label, count, oxidation number]. */
  others: ReadonlyArray<readonly [string, number, number]>;
  /** The atoms of `el` are not equivalent, so only the average is well defined. */
  avg?: boolean;
}

const OX_CASES: readonly OxCase[] = [
  { f: 'K2Cr2O7', el: 'Cr', cnt: 2, q: 0, others: [['K', 2, 1], ['O', 7, -2]] },
  { f: 'Cr2O7^2-', el: 'Cr', cnt: 2, q: -2, others: [['O', 7, -2]] },
  { f: 'CrO4^2-', el: 'Cr', cnt: 1, q: -2, others: [['O', 4, -2]] },
  { f: 'KMnO4', el: 'Mn', cnt: 1, q: 0, others: [['K', 1, 1], ['O', 4, -2]] },
  { f: 'K2MnO4', el: 'Mn', cnt: 1, q: 0, others: [['K', 2, 1], ['O', 4, -2]] },
  { f: 'MnO2', el: 'Mn', cnt: 1, q: 0, others: [['O', 2, -2]] },
  { f: 'H2SO4', el: 'S', cnt: 1, q: 0, others: [['H', 2, 1], ['O', 4, -2]] },
  { f: 'Na2S2O3', el: 'S', cnt: 2, q: 0, others: [['Na', 2, 1], ['O', 3, -2]], avg: true },
  { f: 'SO3^2-', el: 'S', cnt: 1, q: -2, others: [['O', 3, -2]] },
  { f: 'HNO3', el: 'N', cnt: 1, q: 0, others: [['H', 1, 1], ['O', 3, -2]] },
  { f: 'NH4+', el: 'N', cnt: 1, q: 1, others: [['H', 4, 1]] },
  { f: 'NO2-', el: 'N', cnt: 1, q: -1, others: [['O', 2, -2]] },
  { f: 'N2O', el: 'N', cnt: 2, q: 0, others: [['O', 1, -2]], avg: true },
  { f: 'H3PO4', el: 'P', cnt: 1, q: 0, others: [['H', 3, 1], ['O', 4, -2]] },
  { f: 'H3PO3', el: 'P', cnt: 1, q: 0, others: [['H', 3, 1], ['O', 3, -2]] },
  { f: 'PO4^3-', el: 'P', cnt: 1, q: -3, others: [['O', 4, -2]] },
  { f: 'KClO3', el: 'Cl', cnt: 1, q: 0, others: [['K', 1, 1], ['O', 3, -2]] },
  { f: 'HClO4', el: 'Cl', cnt: 1, q: 0, others: [['H', 1, 1], ['O', 4, -2]] },
  { f: 'ClO-', el: 'Cl', cnt: 1, q: -1, others: [['O', 1, -2]] },
  { f: 'H2O2', el: 'O', cnt: 2, q: 0, others: [['H', 2, 1]] },
  { f: 'Na2O2', el: 'O', cnt: 2, q: 0, others: [['Na', 2, 1]] },
  { f: 'OF2', el: 'O', cnt: 1, q: 0, others: [['F', 2, -1]] },
  { f: 'NaH', el: 'H', cnt: 1, q: 0, others: [['Na', 1, 1]] },
  { f: 'CaH2', el: 'H', cnt: 2, q: 0, others: [['Ca', 1, 2]] },
  { f: 'C2O4^2-', el: 'C', cnt: 2, q: -2, others: [['O', 4, -2]] },
  { f: 'CH4', el: 'C', cnt: 1, q: 0, others: [['H', 4, 1]] },
  { f: 'CO3^2-', el: 'C', cnt: 1, q: -2, others: [['O', 3, -2]] },
  { f: 'K4[Fe(CN)6]', el: 'Fe', cnt: 1, q: 0, others: [['K', 4, 1], ['CN', 6, -1]] },
  { f: 'K3[Fe(CN)6]', el: 'Fe', cnt: 1, q: 0, others: [['K', 3, 1], ['CN', 6, -1]] },
];

function oxValue(c: OxCase): number {
  const rest = c.others.reduce((s, [, n, v]) => s + n * v, 0);
  return (c.q - rest) / c.cnt;
}

/**
 * Metals for Faraday's-law problems: symbol, charge of the ion discharged and an
 * electrolyte from which the metal really is deposited (reactive metals only from melts).
 */
const FARADAY_METALS: ReadonlyArray<{ el: string; z: number; name: string; medium: string }> = [
  { el: 'Ag', z: 1, name: 'silver', medium: tex`aqueous $\ce{AgNO3}$` },
  { el: 'Cu', z: 2, name: 'copper', medium: tex`aqueous $\ce{CuSO4}$` },
  { el: 'Zn', z: 2, name: 'zinc', medium: tex`aqueous $\ce{ZnSO4}$` },
  { el: 'Ni', z: 2, name: 'nickel', medium: tex`aqueous $\ce{NiSO4}$` },
  { el: 'Al', z: 3, name: 'aluminium', medium: tex`alumina ($\ce{Al2O3}$) dissolved in molten cryolite` },
  { el: 'Mg', z: 2, name: 'magnesium', medium: tex`molten $\ce{MgCl2}$` },
  { el: 'Na', z: 1, name: 'sodium', medium: tex`molten $\ce{NaCl}$` },
  { el: 'Ca', z: 2, name: 'calcium', medium: tex`molten $\ce{CaCl2}$` },
];

/** Ion formula for mhchem: Ag+, Cu^2+, Al^3+. */
const ionOf = (el: string, z: number): string => (z === 1 ? `${el}+` : `${el}^${z}+`);

/** Standard reduction potentials (V) of M^z+/M couples, FSc table values. */
const METAL_COUPLES: ReadonlyArray<{ el: string; z: number; E: number }> = [
  { el: 'Mg', z: 2, E: -2.37 },
  { el: 'Al', z: 3, E: -1.66 },
  { el: 'Zn', z: 2, E: -0.76 },
  { el: 'Fe', z: 2, E: -0.44 },
  { el: 'Ni', z: 2, E: -0.25 },
  { el: 'Sn', z: 2, E: -0.14 },
  { el: 'Pb', z: 2, E: -0.13 },
  { el: 'Cu', z: 2, E: 0.34 },
  { el: 'Ag', z: 1, E: 0.8 },
];

const HALOGEN_COUPLES: ReadonlyArray<{ el: string; E: number }> = [
  { el: 'F', E: 2.87 },
  { el: 'Cl', E: 1.36 },
  { el: 'Br', E: 1.09 },
  { el: 'I', E: 0.54 },
];

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'electrochemistry', (b) => [
  // Oxidation number of an element in a compound or ion.
  b.dynamic('oxidation-number', { difficulty: 1, origin: 'past-paper', tags: ['oxidation numbers'] }, (r) => {
    const c = r.pick(OX_CASES);
    const val = oxValue(c);
    const wrong = [
      -val, // sign slip
      c.cnt * val, // forgot to divide by the number of atoms
      val - c.q / c.cnt, // ignored the charge on the ion
      val - (2 * c.q) / c.cnt, // used the charge with the wrong sign
    ].filter((v) => Number.isInteger(v));
    const { answer, distractors } = numericOptions(r, {
      correct: val,
      wrong,
      format: ox$,
      allowNegative: true,
      allowZero: true,
      fallback: 'integer',
    });
    const xTerm = c.cnt === 1 ? 'x' : `${c.cnt}x`;
    const terms = [xTerm, ...c.others.map(([, n, v]) => `${n}(${oxText(v)})`)].join(' + ');
    const label = (s: string): string => (s === 'CN' ? tex`$\ce{CN-}$` : `$${ce(s)}$`);
    const known = c.others.map(([s, , v]) => `${label(s)} $= ${oxText(v)}$`).join(', ');
    const chargeNote = c.q === 0 ? 'a neutral compound, so the sum is zero' : `an ion, so the sum equals its charge, $${oxText(c.q)}$`;
    const avg = c.avg ? 'average ' : '';
    return {
      stem: tex`The ${avg}oxidation number of $${ce(c.el)}$ in $${ce(c.f)}$ is:`,
      answer,
      distractors,
      explanation: tex`Take ${known}. $${ce(c.f)}$ is ${chargeNote}. Let the ${avg}oxidation number of $${ce(c.el)}$ be $x$: $${terms} = ${c.q}$, so $x = ${oxText(val)}$.`,
    };
  }),

  // Faraday's first law: mass deposited, or faradays required.
  b.dynamic('faraday-first-law', { difficulty: 2, origin: 'past-paper', tags: ['electrolysis'] }, (r) => {
    const metal = r.pick(FARADAY_METALS);
    const M = atomicMass(metal.el);
    const ion = ionOf(metal.el, metal.z);
    if (r.chance(0.5)) {
      // Mass deposited by a current I for time t.
      const { I, t } = drawUntil(
        r,
        (rr) => ({ I: rr.pick([1, 2, 2.5, 4, 5, 10]), t: rr.pick([965, 1930, 4825, 9650, 19300]) }),
        ({ I, t }) => shows4((((I * t) / 96500) * M) / metal.z),
      );
      const Q = I * t;
      const F = Q / 96500;
      const m = (F * M) / metal.z;
      const { answer, distractors } = numericOptions(r, {
        correct: m,
        // forgot to divide by z, multiplied by z, factor-of-2 slips, F taken as 9650
        wrong: [F * M, F * M * metal.z, 2 * m, m / 2, 10 * m],
        format: (x) => q$(x, 'g', { sig: 4 }),
      });
      return {
        stem: tex`A current of $${qty(I, 'A')}$ is passed through ${metal.medium} for $${qty(t, 's')}$. The mass of ${metal.name} deposited at the cathode is ($${ce(metal.el)} = ${M}$, $F = 96500\,\mathrm{C\,mol^{-1}}$):`,
        answer,
        distractors,
        explanation: tex`$Q = It = ${I} \times ${t} = ${Q}\,\mathrm{C} = ${num(F)}\,F$. Each mole of $${ce(ion)}$ needs ${metal.z} mole${metal.z === 1 ? '' : 's'} of electrons, so $m = \frac{Q}{F} \times \frac{M}{z} = ${num(F)} \times \frac{${M}}{${metal.z}} = ${num(m, { sig: 4 })}\,\mathrm{g}$.`,
      };
    }
    // Faradays needed to deposit a given mass.
    const n = drawUntil(r, (rr) => rr.pick([0.25, 0.5, 1, 1.5, 2, 3]), (v) => shows4(v * M));
    const mass = n * M;
    const Fneed = n * metal.z;
    const { answer, distractors } = numericOptions(r, {
      correct: Fneed,
      // moles taken as faradays, divided by z, the charge alone, z + 1 electrons, doubled, halved, mass/M inverted
      wrong: [n, n / metal.z, metal.z, n * (metal.z + 1), 2 * Fneed, Fneed / 2, metal.z / n].filter((v) => isTidy(v, 3)),
      // Italic F (the faraday), as in the explanation; roman F would read as the farad.
      format: (x) => `$${num(x)}\\,F$`,
    });
    return {
      stem: tex`The number of faradays needed to deposit $${qty(mass, 'g', { sig: 4 })}$ of ${metal.name} from ${metal.medium} is ($${ce(metal.el)} = ${M}$):`,
      answer,
      distractors,
      explanation: tex`Moles of ${metal.name} $= \frac{${num(mass, { sig: 4 })}}{${M}} = ${num(n)}$. $\ce{${ion} + ${metal.z === 1 ? '' : metal.z}e- -> ${metal.el}}$, so ${metal.z} faraday${metal.z === 1 ? '' : 's'} per mole: $${num(n)} \times ${metal.z} = ${num(Fneed)}\,F$.`,
    };
  }),

  // Faraday's second law: cells in series.
  b.dynamic('faraday-second-law', { difficulty: 2, tags: ['electrolysis'] }, (r) => {
    const { A, B, k } = drawUntil(
      r,
      (rr) => {
        // Only metals that really deposit from aqueous solution (Ag, Cu, Zn, Ni).
        const [A, B] = rr.sample(FARADAY_METALS.slice(0, 4), 2) as [(typeof FARADAY_METALS)[number], (typeof FARADAY_METALS)[number]];
        return { A, B, k: rr.pick([0.1, 0.2, 0.25, 0.5, 1, 2]) };
      },
      ({ A, B, k }) => shows4((k * atomicMass(A.el)) / A.z) && shows4((k * atomicMass(B.el)) / B.z),
    );
    const MA = atomicMass(A.el);
    const MB = atomicMass(B.el);
    const EA = MA / A.z;
    const EB = MB / B.z;
    const mA = k * EA;
    const mB = k * EB;
    const { answer, distractors } = numericOptions(r, {
      correct: mB,
      wrong: [k * MB, (mA * MB) / MA, (mA * EA) / EB, mA],
      format: (x) => q$(x, 'g', { sig: 4 }),
    });
    return {
      stem: tex`Two electrolytic cells, one containing ${A.medium} and the other ${B.medium}, are connected in series. When $${qty(mA, 'g', { sig: 4 })}$ of ${A.name} is deposited in the first cell, the mass of ${B.name} deposited in the second is ($${ce(A.el)} = ${MA}$, $${ce(B.el)} = ${MB}$):`,
      answer,
      distractors,
      explanation: tex`The same charge passes through both cells, so masses are in the ratio of equivalent masses ($M/z$): $m_B = m_A \times \frac{${num(EB, { sig: 4 })}}{${num(EA, { sig: 4 })}} = ${num(mA, { sig: 4 })} \times \frac{${num(EB, { sig: 4 })}}{${num(EA, { sig: 4 })}} = ${num(mB, { sig: 4 })}\,\mathrm{g}$ (that is, ${num(k)} faraday${k === 1 ? '' : 's'} passed).`,
    };
  }),

  // Standard e.m.f. of a galvanic cell.
  b.dynamic('cell-emf', { difficulty: 1, origin: 'past-paper', tags: ['electrode potentials', 'cells and batteries'] }, (r) => {
    // Skip near-identical couples (Sn/Pb would give a 0.01 V cell).
    const [p, q] = drawUntil(
      r,
      (rr) => rr.sample(METAL_COUPLES, 2) as [(typeof METAL_COUPLES)[number], (typeof METAL_COUPLES)[number]],
      ([a, c]) => Math.abs(a.E - c.E) >= 0.1,
    );
    const anode = p.E < q.E ? p : q;
    const cathode = p.E < q.E ? q : p;
    const emf = Math.round((cathode.E - anode.E) * 100) / 100;
    const { answer, distractors } = numericOptions(r, {
      correct: emf,
      wrong: [
        Math.round((cathode.E + anode.E) * 100) / 100, // added the potentials
        -emf, // cathode and anode swapped
        Math.round((Math.abs(cathode.E) + Math.abs(anode.E)) * 100) / 100,
        cathode.E,
        Math.abs(anode.E),
      ],
      format: (x) => `$${volt(x)}$`,
      allowNegative: true,
    });
    const couple = (c: (typeof METAL_COUPLES)[number]): string =>
      tex`$E^\circ(\ce{${ionOf(c.el, c.z)}}/\ce{${c.el}}) = ${volt(c.E)}$`;
    return {
      stem: tex`A galvanic cell is built from two standard half-cells with ${couple(p)} and ${couple(q)}. The standard e.m.f. of the cell is:`,
      answer,
      distractors,
      explanation: tex`The couple with the lower reduction potential ($${ce(anode.el)}$) is the anode. $E^\circ_{cell} = E^\circ_{cathode} - E^\circ_{anode} = (${volt(cathode.E)}) - (${volt(anode.E)}) = ${volt(emf)}$.`,
    };
  }),

  // Strongest oxidising or reducing agent from E° values.
  b.dynamic('strongest-agent', { difficulty: 2, tags: ['electrode potentials'] }, (r) => {
    const halogen = r.chance(0.3);
    const reducing = r.chance(0.5);
    const word = reducing ? 'reducing' : 'oxidising';
    if (halogen) {
      const set = r.shuffle(HALOGEN_COUPLES);
      const best = reducing
        ? set.reduce((a, c) => (c.E < a.E ? c : a))
        : set.reduce((a, c) => (c.E > a.E ? c : a));
      const sp = (h: (typeof HALOGEN_COUPLES)[number]): string => (reducing ? `$${ce(`${h.el}-`)}$` : `$${ce(`${h.el}2`)}$`);
      const list = set.map((h) => tex`$E^\circ(\ce{${h.el}2}/\ce{${h.el}-}) = ${volt(h.E)}$`).join(', ');
      return {
        stem: tex`Given the standard reduction potentials ${list}, the strongest ${word} agent among the following is:`,
        answer: sp(best),
        distractors: set.filter((h) => h !== best).map(sp),
        explanation: reducing
          ? tex`The most negative (least positive) reduction potential means the reduced form gives up electrons most readily. $\ce{${best.el}-}$ ($${volt(best.E)}$) is the strongest reducing agent.`
          : tex`The most positive reduction potential means the oxidised form gains electrons most readily. $\ce{${best.el}2}$ ($${volt(best.E)}$) is the strongest oxidising agent.`,
      };
    }
    const set = r.sample(METAL_COUPLES, 4);
    const best = reducing ? set.reduce((a, c) => (c.E < a.E ? c : a)) : set.reduce((a, c) => (c.E > a.E ? c : a));
    const sp = (m: (typeof METAL_COUPLES)[number]): string => (reducing ? `$${ce(m.el)}$` : `$${ce(ionOf(m.el, m.z))}$`);
    const list = set.map((m) => tex`$E^\circ(\ce{${ionOf(m.el, m.z)}}/\ce{${m.el}}) = ${volt(m.E)}$`).join(', ');
    return {
      stem: tex`Given the standard reduction potentials ${list}, the strongest ${word} agent among the following is:`,
      answer: sp(best),
      distractors: set.filter((m) => m !== best).map(sp),
      explanation: reducing
        ? tex`A metal with the most negative reduction potential loses electrons most readily, so $\ce{${best.el}}$ ($${volt(best.E)}$) is the strongest reducing agent. Picking the most positive value confuses the two roles.`
        : tex`An ion with the most positive reduction potential gains electrons most readily, so $\ce{${ionOf(best.el, best.z)}}$ ($${volt(best.E)}$) is the strongest oxidising agent.`,
    };
  }),

  // Conceptual statements on cells, electrolysis and the electrochemical series.
  b.dynamic('cells-statements', { difficulty: 2, tags: ['electrolysis', 'cells and batteries', 'electrode potentials'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements is correct?',
      negativeStem: 'Which of the following statements is incorrect?',
      truths: [
        'In a galvanic cell, oxidation takes place at the anode.',
        'In a galvanic cell, the anode is the negative electrode.',
        'In an electrolytic cell, the cathode is joined to the negative terminal of the source.',
        'A galvanic cell converts chemical energy into electrical energy.',
        tex`Zinc displaces copper from aqueous $\ce{CuSO4}$.`,
        tex`Electrolysis of fused $\ce{NaCl}$ gives sodium at the cathode.`,
        'The mass of a substance liberated in electrolysis is proportional to the charge passed.',
        'A metal with a more negative reduction potential is a stronger reducing agent.',
      ],
      falsehoods: [
        'In a galvanic cell, reduction takes place at the anode.',
        'In an electrolytic cell, the anode is joined to the negative terminal of the source.',
        'An electrolytic cell converts chemical energy into electrical energy.',
        tex`Copper displaces zinc from aqueous $\ce{ZnSO4}$.`,
        tex`Electrolysis of aqueous $\ce{NaCl}$ with platinum electrodes gives sodium metal at the cathode.`,
        'The mass of a substance liberated in electrolysis does not depend on the charge passed.',
        'A metal with a more positive reduction potential is a stronger reducing agent.',
        'In a galvanic cell, electrons flow through the salt bridge.',
        tex`Silver liberates hydrogen gas from dilute $\ce{HCl}$.`,
      ],
      explain: (answer, inverted) =>
        `${inverted ? 'This statement is false' : 'This statement is true'}: ${answer} Key facts: oxidation always occurs at the anode (negative in a galvanic cell, positive in an electrolytic cell); a galvanic cell turns chemical energy into electrical energy, an electrolytic cell does the reverse; a metal with a more negative E° is a stronger reducing agent and displaces metals below it; in aqueous NaCl with inert electrodes, water is reduced to hydrogen instead of Na+; mass liberated is proportional to charge; the salt bridge carries ions, not electrons.`,
    }),
  ),

  ...b.mcqs([
    {
      id: 'faraday-constant', d: 1, o: 'past-paper', t: ['electrolysis'],
      q: 'The charge carried by one mole of electrons is approximately:',
      a: tex`$96500\,\mathrm{C}$`,
      x: [tex`$1.6 \times 10^{-19}\,\mathrm{C}$`, tex`$6.02 \times 10^{23}\,\mathrm{C}$`, tex`$9650\,\mathrm{C}$`],
      e: tex`$F = N_A e = (6.02 \times 10^{23})(1.6 \times 10^{-19}) \approx 96500\,\mathrm{C\,mol^{-1}}$. $1.6 \times 10^{-19}\,\mathrm{C}$ is the charge of a single electron.`,
    },
    {
      id: 'not-a-redox-reaction', d: 1, t: ['oxidation numbers'],
      q: 'Which of the following is NOT a redox reaction?',
      a: tex`$\ce{AgNO3 + NaCl -> AgCl + NaNO3}$`,
      x: [tex`$\ce{Zn + CuSO4 -> ZnSO4 + Cu}$`, tex`$\ce{Cl2 + 2KI -> 2KCl + I2}$`, tex`$\ce{2Mg + O2 -> 2MgO}$`],
      e: tex`In the precipitation of $\ce{AgCl}$ every element keeps its oxidation number (Ag $+1$, Cl $-1$, Na $+1$, N $+5$, O $-2$). The other three involve changes, e.g. Zn goes from $0$ to $+2$.`,
    },
    {
      id: 'chlorine-disproportionation', d: 2, t: ['oxidation numbers', 'balancing redox'],
      q: tex`In the reaction $\ce{Cl2 + 2OH- -> Cl- + ClO- + H2O}$, chlorine:`,
      a: 'is both oxidised and reduced',
      x: ['is oxidised only', 'is reduced only', 'is neither oxidised nor reduced'],
      e: tex`Chlorine goes from $0$ in $\ce{Cl2}$ to $-1$ in $\ce{Cl-}$ (reduction) and to $+1$ in $\ce{ClO-}$ (oxidation). This is disproportionation.`,
    },
    {
      id: 'permanganate-iron-ratio', d: 2, t: ['balancing redox'],
      q: tex`In acidic solution, the number of $\ce{Fe^2+}$ ions oxidised by one $\ce{MnO4-}$ ion is:`,
      a: '5',
      x: ['2', '3', '8'],
      e: tex`Mn changes from $+7$ to $+2$, gaining $5e^-$; each $\ce{Fe^2+}$ loses one electron. Balanced: $\ce{MnO4- + 5Fe^2+ + 8H+ -> Mn^2+ + 5Fe^3+ + 4H2O}$. The 8 is the number of $\ce{H+}$ ions.`,
    },
    {
      id: 'dichromate-electrons', d: 2, t: ['balancing redox', 'oxidation numbers'],
      q: tex`When one $\ce{Cr2O7^2-}$ ion is reduced to $\ce{Cr^3+}$ in acidic solution, the number of electrons gained is:`,
      a: '6',
      x: ['3', '7', '14'],
      e: tex`Each Cr changes from $+6$ to $+3$ (3 electrons) and there are two Cr atoms: $\ce{Cr2O7^2- + 14H+ + 6e- -> 2Cr^3+ + 7H2O}$. Three is the change per Cr atom only.`,
    },
    {
      id: 'copper-anode-reaction', d: 2, t: ['electrolysis'],
      q: tex`During electrolysis of aqueous $\ce{CuSO4}$ using copper electrodes, the reaction at the anode is:`,
      a: tex`$\ce{Cu -> Cu^2+ + 2e-}$`,
      x: [tex`$\ce{Cu^2+ + 2e- -> Cu}$`, tex`$\ce{4OH- -> O2 + 2H2O + 4e-}$`, tex`$\ce{2H2O + 2e- -> H2 + 2OH-}$`],
      e: tex`An active copper anode is itself oxidised and dissolves, while copper deposits at the cathode; this is the basis of electrorefining. Oxygen is evolved only when an inert (Pt) anode is used.`,
    },
    {
      id: 'daniell-cell-mass-loss', d: 1, t: ['cells and batteries'],
      q: 'In a working Daniell cell, the electrode that loses mass with time is:',
      a: 'the zinc anode',
      x: ['the copper cathode', 'the zinc cathode', 'the copper anode'],
      e: tex`Zinc is oxidised at the anode ($\ce{Zn -> Zn^2+ + 2e-}$) and dissolves, so it loses mass; copper is deposited on the copper cathode, which gains mass.`,
    },
    {
      id: 'salt-bridge-function', d: 1, t: ['cells and batteries'],
      q: 'The main function of a salt bridge in a galvanic cell is to:',
      a: 'keep both half-cell solutions electrically neutral',
      x: ['carry electrons from the anode to the cathode', 'allow the two solutions to mix freely', 'raise the e.m.f. of the cell'],
      e: 'Ions move through the salt bridge to balance the charge built up in each half-cell, completing the internal circuit. Electrons travel only through the external wire.',
    },
    {
      id: 'she-potential', d: 1, t: ['electrode potentials'],
      q: 'The standard electrode potential assigned to the standard hydrogen electrode is:',
      a: tex`$0.00\,\mathrm{V}$`,
      x: [tex`$+1.00\,\mathrm{V}$`, tex`$-0.76\,\mathrm{V}$`, tex`$+0.34\,\mathrm{V}$`],
      e: tex`The SHE (Pt black, $\ce{H2}$ at 1 atm, $1\,\mathrm{M}\ \ce{H+}$, 298 K) is the reference electrode and is arbitrarily given $E^\circ = 0.00\,\mathrm{V}$; $-0.76$ and $+0.34\,\mathrm{V}$ are the Zn and Cu values.`,
    },
    {
      id: 'lead-accumulator-discharge', d: 2, t: ['cells and batteries'],
      q: 'When a lead-acid accumulator discharges, both of its electrodes become coated with:',
      a: tex`$\ce{PbSO4}$`,
      x: [tex`$\ce{PbO2}$`, tex`$\ce{Pb3O4}$`, tex`$\ce{PbO}$`],
      e: tex`Anode: $\ce{Pb + SO4^2- -> PbSO4 + 2e-}$; cathode: $\ce{PbO2 + 4H+ + SO4^2- + 2e- -> PbSO4 + 2H2O}$. Sulphuric acid is consumed, so its density falls.`,
    },
    {
      id: 'fuel-cell-electrolyte', d: 1, o: 'past-paper', t: ['cells and batteries'],
      q: 'The electrolyte used in the alkaline hydrogen-oxygen fuel cell is:',
      a: tex`aqueous $\ce{KOH}$`,
      x: [tex`dilute $\ce{H2SO4}$`, tex`molten $\ce{NaCl}$`, tex`aqueous $\ce{NH4Cl}$`],
      e: tex`Hydrogen and oxygen are fed over porous electrodes dipping in hot aqueous $\ce{KOH}$; overall $\ce{2H2 + O2 -> 2H2O}$. $\ce{NH4Cl}$ paste is used in the dry cell.`,
    },
    {
      id: 'castner-kellner-cathode', d: 2, o: 'past-paper', t: ['electrolysis'],
      q: 'In the Castner-Kellner cell for making sodium hydroxide, the cathode is:',
      a: 'flowing mercury',
      x: ['graphite rods', 'an iron gauze', 'a platinum plate'],
      e: tex`Brine is electrolysed between graphite anodes (giving $\ce{Cl2}$) and a flowing mercury cathode, where sodium forms an amalgam that later reacts with water to give $\ce{NaOH}$ and $\ce{H2}$.`,
    },
    {
      id: 'nicad-anode', d: 2, t: ['cells and batteries'],
      q: 'The anode of a rechargeable nickel-cadmium cell is made of:',
      a: 'cadmium',
      x: ['nickel', 'zinc', 'lead'],
      e: tex`In the Ni-Cd cell, cadmium is oxidised at the anode ($\ce{Cd + 2OH- -> Cd(OH)2 + 2e-}$) and $\ce{NiO(OH)}$ is reduced at the cathode, with $\ce{KOH}$ as electrolyte.`,
    },
  ]),
]);
