import { defineBank } from '@/engine/authoring';
import { num, numericOptions, q$, qty, statementQuestion, tex, U } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------- local data and helpers

interface Solute {
  /** mhchem formula. */
  f: string;
  name: string;
  /** FSc-rounded molar mass in g/mol. */
  mr: number;
}

const NAOH: Solute = { f: 'NaOH', name: 'sodium hydroxide', mr: 40 };
const KOH: Solute = { f: 'KOH', name: 'potassium hydroxide', mr: 56 };
const NACL: Solute = { f: 'NaCl', name: 'sodium chloride', mr: 58.5 };
const NA2CO3: Solute = { f: 'Na2CO3', name: 'sodium carbonate', mr: 106 };
const GLUCOSE: Solute = { f: 'C6H12O6', name: 'glucose', mr: 180 };
const UREA: Solute = { f: 'CO(NH2)2', name: 'urea', mr: 60 };
const SUCROSE: Solute = { f: 'C12H22O11', name: 'sucrose', mr: 342 };
const ETHANOL: Solute = { f: 'C2H5OH', name: 'ethanol', mr: 46 };
const METHANOL: Solute = { f: 'CH3OH', name: 'methanol', mr: 32 };

const MOLAL = 'mol\\,kg^{-1}';
const MMHG = 'mmHg';

/** True when `num(x)` shows x exactly (so a stem value is not silently rounded). */
const shownExactly = (x: number): boolean => Math.abs(Number(num(x)) - x) < 1e-9;

/** Draws until `make` yields a value that displays exactly (bounded, deterministic). */
function drawExact<T extends { shown: number }>(r: Rng, make: (r: Rng) => T): T {
  for (let i = 0; i < 50; i++) {
    const v = make(r);
    if (shownExactly(v.shown)) return v;
  }
  throw new Error('solutions: could not draw exactly displayable parameters');
}

/** A mole fraction must lie below 1, so larger wrong values would be giveaways. */
const below1 = (values: readonly number[]): number[] => values.filter((v) => v > 0 && v < 1);

const solId = (s: Solute): string => tex`$\ce{${s.f}}$`;

/** A statement with the reason it is true, or the correction that shows it is false. */
interface Claim {
  s: string;
  why: string;
}

const claimText = (c: Claim): string => c.s;
const reasonOf = (list: readonly Claim[], text: string): string =>
  list.find((c) => c.s === text)?.why ?? '';

const COLLIGATIVE_TRUE: readonly Claim[] = [
  {
    s: 'Colligative properties depend on the number of solute particles, not on their nature.',
    why: 'Vapour-pressure lowering, boiling-point elevation, freezing-point depression and osmotic pressure all depend only on how many solute particles are present per given amount of solvent.',
  },
  {
    s: 'A non-volatile solute lowers the vapour pressure of the solvent.',
    why: "Solute particles occupy part of the surface, so fewer solvent molecules escape per unit time and the vapour pressure falls (Raoult's law).",
  },
  {
    s: 'A solution of a non-volatile solute boils at a higher temperature than the pure solvent.',
    why: 'Its vapour pressure is lower, so it must be heated further before the vapour pressure equals the external pressure.',
  },
  {
    s: "An ideal solution obeys Raoult's law at all concentrations.",
    why: 'This is the definition of an ideal solution; for it the enthalpy and volume of mixing are both zero.',
  },
  {
    s: tex`The molal boiling-point elevation constant $K_b$ depends only on the solvent.`,
    why: tex`$K_b$ (and $K_f$) is a property of the solvent: for water $K_b = 0.52$ and $K_f = 1.86\,\mathrm{K\,kg\,mol^{-1}}$, whatever the solute.`,
  },
  {
    s: tex`At equal molality, aqueous $\ce{NaCl}$ shows nearly twice the freezing-point depression of glucose.`,
    why: tex`$\ce{NaCl}$ dissociates into $\ce{Na+}$ and $\ce{Cl-}$, giving about twice as many particles as the same molality of glucose, which does not ionize.`,
  },
];

const COLLIGATIVE_FALSE: readonly Claim[] = [
  {
    s: 'Colligative properties depend on the chemical nature of the solute.',
    why: 'Colligative properties depend only on the number of solute particles; the chemical identity of the solute does not matter.',
  },
  {
    s: 'A non-volatile solute raises the vapour pressure of the solvent.',
    why: 'A non-volatile solute lowers the vapour pressure; the relative lowering equals the mole fraction of the solute.',
  },
  {
    s: 'A solution of a non-volatile solute freezes at a higher temperature than the pure solvent.',
    why: 'The freezing point is depressed, not raised: the solution freezes below the freezing point of the pure solvent.',
  },
  {
    s: 'For an ideal solution the volume of mixing is negative.',
    why: tex`For an ideal solution $\Delta V_{\text{mix}} = 0$ and $\Delta H_{\text{mix}} = 0$; a decrease in volume is shown by solutions with negative deviation.`,
  },
  {
    s: tex`The molal boiling-point elevation constant $K_b$ depends on the nature of the solute.`,
    why: tex`$K_b$ is characteristic of the solvent only; the same solvent has the same $K_b$ for every non-volatile solute.`,
  },
  {
    s: tex`Equimolal aqueous solutions of $\ce{NaCl}$ and glucose have the same freezing point.`,
    why: tex`$\ce{NaCl}$ ionizes into two particles while glucose does not, so the $\ce{NaCl}$ solution freezes at a lower temperature.`,
  },
];

type SaltNature = 'acidic' | 'basic' | 'neutral';

const SALTS: Readonly<Record<SaltNature, readonly string[]>> = {
  acidic: ['NH4Cl', 'NH4NO3', '(NH4)2SO4', 'CuSO4', 'FeCl3', 'AlCl3'],
  basic: ['CH3COONa', 'Na2CO3', 'K2CO3', 'Na3PO4', 'KCN', 'CH3COOK'],
  // Na2SO4/K2SO4 are left out: HSO4- is only a moderately strong acid (Ka2 ~ 1e-2), so their
  // solutions are very slightly basic and could be argued as a key for the 'basic' variant.
  neutral: ['NaCl', 'KCl', 'KNO3', 'NaNO3', 'KBr', 'NaBr'],
};

const SALT_REASON: Readonly<Record<SaltNature, string>> = {
  acidic: tex`It is the salt of a strong acid and a weak base: its cation hydrolyses and releases $\ce{H3O+}$ ions, so the solution is acidic ($\mathrm{pH} < 7$).`,
  basic: tex`It is the salt of a strong base and a weak acid: its anion hydrolyses and releases $\ce{OH-}$ ions, so the solution is basic ($\mathrm{pH} > 7$).`,
  neutral: tex`It is the salt of a strong acid and a strong base: neither ion hydrolyses, so the solution stays neutral ($\mathrm{pH} = 7$).`,
};

// ---------------------------------------------------------------- bank

export default defineBank('chemistry', 'solutions', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('molarity-from-mass', { difficulty: 1, origin: 'past-paper', tags: ['concentration units'] }, (r) => {
    const p = drawExact(r, (g) => {
      const s = g.pick([NAOH, KOH, NACL, NA2CO3, GLUCOSE, UREA]);
      const M = g.pick([0.1, 0.2, 0.25, 0.4, 0.5, 1, 2]);
      const V = g.pick([100, 200, 250, 500, 1000, 2000]);
      const n = (M * V) / 1000;
      return { s, M, V, n, shown: n * s.mr };
    });
    const { s, M, V, n } = p;
    const w = p.shown;

    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: M,
        // forgot the volume, volume left in cm^3, forgot to divide by molar mass
        wrong: [n, n / V, (w * 1000) / V],
        format: (x) => q$(x, U.molL),
        fallback: 'scale',
      });
      return {
        stem: tex`$${qty(w, U.g)}$ of ${solId(s)} ($M_r = ${num(s.mr)}$) is dissolved in water and the solution is made up to $${qty(V, U.cm3)}$. The molarity of the solution is:`,
        answer,
        distractors,
        explanation: tex`Moles of solute $= \dfrac{${num(w)}}{${num(s.mr)}} = ${num(n)}\,\mathrm{mol}$. Molarity $= \dfrac{\text{moles of solute}}{\text{volume in dm}^3} = \dfrac{${num(n)}}{${num(V / 1000)}} = ${qty(M, U.molL)}$.`,
      };
    }

    const { answer, distractors } = numericOptions(r, {
      correct: w,
      // ignored the volume, forgot cm^3 -> dm^3, gave moles instead of mass
      wrong: [M * s.mr, M * V * s.mr, n, (M * s.mr * 1000) / V],
      format: (x) => q$(x, U.g),
      fallback: 'scale',
    });
    return {
      stem: tex`The mass of ${solId(s)} ($M_r = ${num(s.mr)}$) needed to prepare $${qty(V, U.cm3)}$ of a $${qty(M, U.molL)}$ solution is:`,
      answer,
      distractors,
      explanation: tex`Moles needed $= M \times V = ${num(M)} \times ${num(V / 1000)} = ${num(n)}\,\mathrm{mol}$. Mass $= n \times M_r = ${num(n)} \times ${num(s.mr)} = ${qty(w, U.g)}$.`,
    };
  }),

  b.dynamic('molality-and-mole-fraction', { difficulty: 2, tags: ['concentration units'] }, (r) => {
    if (r.chance(0.5)) {
      // molality
      const p = drawExact(r, (g) => {
        const s = g.pick([NAOH, KOH, NACL, GLUCOSE, UREA]);
        const m = g.pick([0.1, 0.2, 0.25, 0.5, 1, 2]);
        const W = g.pick([100, 200, 250, 500]);
        return { s, m, W, shown: (m * s.mr * W) / 1000 };
      });
      const { s, m, W } = p;
      const w = p.shown;
      const n = (m * W) / 1000;
      const { answer, distractors } = numericOptions(r, {
        correct: m,
        // gave moles only, solvent mass left in grams, forgot molar mass
        wrong: [n, m / 1000, (w * 1000) / W],
        format: (x) => q$(x, MOLAL),
        fallback: 'scale',
      });
      return {
        stem: tex`$${qty(w, U.g)}$ of ${solId(s)} ($M_r = ${num(s.mr)}$) is dissolved in $${qty(W, U.g)}$ of water. The molality of the solution is:`,
        answer,
        distractors,
        explanation: tex`Moles of solute $= \dfrac{${num(w)}}{${num(s.mr)}} = ${num(n)}\,\mathrm{mol}$. Molality $= \dfrac{\text{moles of solute}}{\text{mass of solvent in kg}} = \dfrac{${num(n)}}{${num(W / 1000)}} = ${qty(m, MOLAL)}$.`,
      };
    }

    // mole fraction
    const s = r.pick([ETHANOL, METHANOL, GLUCOSE, UREA]);
    // Glucose and urea are solids: keep the solute mass per gram of water below their solubility
    // (about 0.9 g and 1.1 g per g of water at 25 C). The solute stays the minor component
    // (2k < T), which also keeps X = 0.5 from coinciding with the solvent value.
    const maxRatio = s === GLUCOSE ? 0.8 : s === UREA ? 1 : Infinity;
    const combos: Array<readonly [number, number]> = [];
    for (const total of [4, 5, 8, 10, 20, 25]) {
      for (let solute = 1; solute <= 3 && 2 * solute < total; solute++) {
        if ((solute * s.mr) / ((total - solute) * 18) <= maxRatio) combos.push([total, solute]);
      }
    }
    const [T, k] = r.pick(combos);
    const nw = T - k;
    const ws = k * s.mr;
    const ww = nw * 18;
    const x = k / T;
    const { answer, distractors } = numericOptions(r, {
      correct: x,
      // ratio of moles, mole fraction of water, mass fraction
      wrong: below1([k / nw, nw / T, ws / (ws + ww), x / 2, x * 1.5]),
      format: (v) => `$${num(v)}$`,
      fallback: 'scale',
    });
    return {
      stem: tex`A solution contains $${qty(ws, U.g)}$ of ${s.name} (${solId(s)}) and $${qty(ww, U.g)}$ of water. The mole fraction of ${s.name} is:`,
      answer,
      distractors,
      explanation: tex`$n_{\text{solute}} = \dfrac{${ws}}{${s.mr}} = ${k}\,\mathrm{mol}$ and $n_{\ce{H2O}} = \dfrac{${ww}}{18} = ${nw}\,\mathrm{mol}$. $X_{\text{solute}} = \dfrac{${k}}{${k} + ${nw}} = ${num(x)}$.`,
    };
  }),

  b.dynamic('raoult-vapour-pressure', { difficulty: 2, origin: 'past-paper', tags: ['Raoult law'] }, (r) => {
    const T = r.pick([5, 10, 20, 25]);
    const k = r.int(1, Math.min(3, T / 5)); // X(solute) <= 0.2: a dilute solution
    const nw = T - k;
    const c = r.int(Math.ceil(20 / T), Math.max(Math.ceil(20 / T), Math.floor(200 / T)));
    const p0 = c * T;
    const p = c * nw;
    const lowering = c * k;
    const xs = k / T;

    if (r.chance(0.6)) {
      const { answer, distractors } = numericOptions(r, {
        correct: p,
        // gave the lowering, added instead of subtracting, ignored the solute. (The mole-ratio
        // value p0(1 - k/nw) is not used: it is the accepted dilute-solution approximation.)
        wrong: [lowering, p0 + lowering, p0],
        format: (v) => q$(v, MMHG),
        fallback: 'integer',
      });
      return {
        stem: tex`The vapour pressure of a pure solvent is $${qty(p0, MMHG)}$. What is the vapour pressure of a solution in which $${k}$ mol of a non-volatile solute is dissolved in $${nw}$ mol of this solvent?`,
        answer,
        distractors,
        explanation: tex`Raoult's law: $p = X_{\text{solvent}}\,p^{\circ} = \dfrac{${nw}}{${k} + ${nw}} \times ${p0} = ${qty(p, MMHG)}$. (The lowering is $${p0} - ${p} = ${lowering}\,\mathrm{mmHg}$.)`,
      };
    }

    const { answer, distractors } = numericOptions(r, {
      correct: xs,
      // mole fraction of solvent, divided the lowering by p instead of p0, used the mole ratio
      wrong: below1([nw / T, lowering / p, k / nw, xs / 2, xs * 1.5]),
      format: (v) => `$${num(v)}$`,
      fallback: 'scale',
    });
    return {
      stem: tex`A non-volatile solute lowers the vapour pressure of a solvent from $${qty(p0, MMHG)}$ to $${qty(p, MMHG)}$. The mole fraction of the solute is:`,
      answer,
      distractors,
      explanation: tex`Relative lowering $= \dfrac{p^{\circ} - p}{p^{\circ}} = X_{\text{solute}}$, so $X_{\text{solute}} = \dfrac{${p0} - ${p}}{${p0}} = \dfrac{${lowering}}{${p0}} = ${num(xs)}$.`,
    };
  }),

  b.dynamic('boiling-freezing-point', { difficulty: 2, tags: ['colligative properties'] }, (r) => {
    const boil = r.chance(0.5);
    const K = boil ? 0.52 : 1.86;
    const otherK = boil ? 1.86 : 0.52;
    const p = drawExact(r, (g) => {
      const s = g.pick([GLUCOSE, UREA, SUCROSE]);
      const m = g.pick([0.1, 0.2, 0.25, 0.5, 1, 2]);
      const W = g.pick([100, 200, 250, 500, 1000]);
      return { s, m, W, shown: (m * s.mr * W) / 1000 };
    });
    const { s, m, W } = p;
    const w = p.shown;
    const dT = K * m;
    const fmt = (v: number): string => q$(num(v, { dp: 3 }), U.degC);
    const base = boil ? 100 : 0;
    const sgn = boil ? 1 : -1;
    const { answer, distractors } = numericOptions(r, {
      correct: base + sgn * dT,
      // wrong direction, wrong constant, used moles instead of molality, used grams of solvent
      wrong: [base - sgn * dT, base + sgn * otherK * m, base + sgn * K * ((m * W) / 1000), base + sgn * K * (m / 1000)],
      format: fmt,
      fallback: 'offset',
      allowNegative: true,
    });
    const kName = boil ? 'K_b' : 'K_f';
    const what = boil ? 'boils' : 'freezes';
    const delta = boil ? '\\Delta T_b' : '\\Delta T_f';
    const final = boil
      ? tex`Boiling point $= 100 + ${num(dT, { dp: 3 })} = ${num(base + dT, { dp: 3 })}^{\circ}\mathrm{C}$.`
      : tex`Freezing point $= 0 - ${num(dT, { dp: 3 })} = ${num(-dT, { dp: 3 })}^{\circ}\mathrm{C}$.`;
    return {
      stem: tex`$${qty(w, U.g)}$ of ${s.name} (${solId(s)}, $M_r = ${s.mr}$) is dissolved in $${qty(W, U.g)}$ of water ($${kName} = ${K}\,\mathrm{K\,kg\,mol^{-1}}$). At $1\,\mathrm{atm}$ the solution ${what} at:`,
      answer,
      distractors,
      explanation: tex`Molality $m = \dfrac{w \times 1000}{M_r \times W} = \dfrac{${num(w)} \times 1000}{${s.mr} \times ${W}} = ${num(m)}\,\mathrm{mol\,kg^{-1}}$. $${delta} = ${kName}\,m = ${K} \times ${num(m)} = ${num(dT, { dp: 3 })}\,\mathrm{K}$. ${final}`,
    };
  }),

  b.dynamic('salt-hydrolysis', { difficulty: 1, origin: 'past-paper', tags: ['hydration and hydrolysis'] }, (r) => {
    const kind = r.pick<SaltNature>(['acidic', 'basic', 'neutral']);
    const others = (['acidic', 'basic', 'neutral'] as const).filter((k) => k !== kind);
    const salt = r.pick(SALTS[kind]);
    const pool = others.flatMap((o) => SALTS[o]);
    const wrong = r.sample(pool, 3);
    const label: Record<SaltNature, string> = {
      acidic: 'an acidic',
      basic: 'a basic (alkaline)',
      neutral: 'a neutral',
    };
    return {
      stem: `Which of the following salts gives ${label[kind]} aqueous solution?`,
      answer: tex`$\ce{${salt}}$`,
      distractors: wrong.map((w) => tex`$\ce{${w}}$`),
      explanation: tex`$\ce{${salt}}$: ${SALT_REASON[kind]} Each of the other salts gives a solution that is not ${kind}.`,
    };
  }),

  b.dynamic('colligative-statements', { difficulty: 2, tags: ['colligative properties', 'Raoult law'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which statement about solutions and colligative properties is correct?',
      negativeStem: 'Which statement about solutions and colligative properties is NOT correct?',
      truths: COLLIGATIVE_TRUE.map(claimText),
      falsehoods: COLLIGATIVE_FALSE.map(claimText),
      explain: (answer, inverted) =>
        inverted
          ? `This statement is false. ${reasonOf(COLLIGATIVE_FALSE, answer)}`
          : `This statement is true. ${reasonOf(COLLIGATIVE_TRUE, answer)}`,
    }),
  ),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'temperature-independent-unit', d: 1, o: 'past-paper', t: ['concentration units'],
      q: 'Which concentration unit does NOT change with temperature?',
      a: 'Molality',
      x: ['Molarity', 'Percentage weight/volume', 'Percentage volume/volume'],
      e: 'Molality is moles of solute per kilogram of solvent and involves only masses, which do not change with temperature. Molarity and the volume-based percentages change because the volume of a solution expands on heating.',
    },
    {
      id: 'one-molal-definition', d: 1, t: ['concentration units'],
      q: 'A one molal solution contains one mole of solute in:',
      a: '1 kg of solvent',
      x: ['1 kg of solution', tex`1 $\mathrm{dm^3}$ of solution`, tex`1 $\mathrm{dm^3}$ of solvent`],
      e: tex`Molality $= \dfrac{\text{moles of solute}}{\text{mass of solvent in kg}}$. One mole of solute in $1\,\mathrm{dm^3}$ of solution is a one molar solution, not one molal.`,
    },
    {
      id: 'relative-lowering-meaning', d: 1, t: ['Raoult law'],
      q: "For a solution of a non-volatile solute, Raoult's law states that the relative lowering of vapour pressure equals the:",
      a: 'Mole fraction of the solute',
      x: ['Mole fraction of the solvent', 'Molarity of the solution', 'Molality of the solution'],
      e: tex`$\dfrac{p^{\circ} - p}{p^{\circ}} = X_{\text{solute}}$. The vapour pressure of the solution itself is $p = X_{\text{solvent}}\,p^{\circ}$.`,
    },
    {
      id: 'ideal-solution-pair', d: 2, t: ['Raoult law'],
      q: 'Which pair of liquids forms a nearly ideal solution?',
      a: 'Benzene and toluene',
      x: ['Ethanol and water', 'Chloroform and acetone', 'Nitric acid and water'],
      e: "Benzene and toluene are similar non-polar molecules, so the attractions in the mixture are the same as in the pure liquids and Raoult's law is obeyed. Ethanol-water shows positive deviation; chloroform-acetone and nitric acid-water show negative deviation.",
    },
    {
      id: 'chloroform-acetone-deviation', d: 2, t: ['Raoult law'],
      q: 'A mixture of chloroform and acetone:',
      a: 'Shows negative deviation and forms a maximum-boiling azeotrope',
      x: [
        'Shows positive deviation and forms a minimum-boiling azeotrope',
        "Obeys Raoult's law and can be separated by fractional distillation",
        'Shows positive deviation and forms a maximum-boiling azeotrope',
      ],
      e: tex`Hydrogen bonding between $\ce{CHCl3}$ and acetone makes the attractions in the mixture stronger than in the pure liquids. The vapour pressure falls below the value predicted by Raoult's law (negative deviation), heat is evolved on mixing, and the mixture forms an azeotrope that boils above either component.`,
    },
    {
      id: 'azeotrope-not-separable', d: 2, t: ['Raoult law'],
      q: 'An azeotropic mixture cannot be separated into its components by fractional distillation because:',
      a: 'Its vapour has the same composition as the liquid',
      x: ['Its components have the same molar mass', 'It does not boil at any fixed temperature', 'Its components are immiscible with each other'],
      e: 'An azeotrope boils at a constant temperature and gives a vapour of the same composition as the boiling liquid, so repeated vaporization and condensation cannot enrich either component.',
    },
    {
      id: 'colligative-depend-on', d: 1, o: 'past-paper', t: ['colligative properties'],
      q: 'Colligative properties of a dilute solution depend on the:',
      a: 'Number of solute particles',
      x: ['Chemical nature of the solute', 'Size of the solute particles', 'Colour of the solute'],
      e: 'Colligative ("collective") properties such as freezing-point depression depend only on the number of solute particles in a given amount of solvent, not on what the particles are.',
    },
    {
      id: 'lowest-freezing-point', d: 2, o: 'past-paper', t: ['colligative properties'],
      q: 'Which 0.1 molal aqueous solution has the lowest freezing point?',
      a: tex`$\ce{CaCl2}$`,
      x: [tex`$\ce{NaCl}$`, 'Glucose', 'Urea'],
      e: tex`$\ce{CaCl2 -> Ca^2+ + 2Cl-}$ gives 3 particles per formula unit, $\ce{NaCl}$ gives 2, and glucose and urea give 1. The largest number of particles gives the largest depression, so $\ce{CaCl2}$ freezes lowest.`,
    },
    {
      id: 'kf-of-water', d: 1, t: ['colligative properties'],
      q: 'The molal freezing-point depression constant (cryoscopic constant) of water is:',
      a: tex`$1.86\,\mathrm{K\,kg\,mol^{-1}}$`,
      x: [tex`$0.52\,\mathrm{K\,kg\,mol^{-1}}$`, tex`$5.12\,\mathrm{K\,kg\,mol^{-1}}$`, tex`$2.53\,\mathrm{K\,kg\,mol^{-1}}$`],
      e: tex`For water $K_f = 1.86$ and $K_b = 0.52\,\mathrm{K\,kg\,mol^{-1}}$. The values $5.12$ and $2.53$ are $K_f$ and $K_b$ of benzene.`,
    },
    {
      id: 'antifreeze-glycol', d: 1, t: ['colligative properties'],
      q: 'Ethylene glycol is added to the water in a car radiator in cold countries in order to:',
      a: 'Lower the freezing point of the water',
      x: ['Raise the freezing point of the water', 'Raise the vapour pressure of the water', 'Lower the boiling point of the water'],
      e: 'Dissolved glycol depresses the freezing point (a colligative effect), so the coolant does not freeze in winter. It also slightly raises the boiling point.',
    },
    {
      id: 'reverse-osmosis-use', d: 1, t: ['colligative properties'],
      q: 'Reverse osmosis is used in the:',
      a: 'Desalination of sea water',
      x: ['Preparation of antifreeze mixtures', 'Separation of azeotropic mixtures', 'Measurement of vapour pressure'],
      e: 'Applying a pressure greater than the osmotic pressure to sea water forces pure water through a semipermeable membrane while the salts are held back.',
    },
    {
      id: 'decreasing-solubility', d: 2, t: ['hydration and hydrolysis'],
      q: 'The solubility in water of which salt decreases as the temperature rises?',
      a: tex`$\ce{Ce2(SO4)3}$`,
      x: [tex`$\ce{KNO3}$`, tex`$\ce{NaNO3}$`, tex`$\ce{KCl}$`],
      e: tex`Dissolution of $\ce{Ce2(SO4)3}$ is exothermic, so by Le Chatelier's principle its solubility falls on heating. $\ce{KNO3}$, $\ce{NaNO3}$ and $\ce{KCl}$ dissolve endothermically and become more soluble when heated.`,
    },
    {
      id: 'blue-vitriol-water', d: 1, o: 'past-paper', t: ['hydration and hydrolysis'],
      q: 'The number of molecules of water of crystallization in blue vitriol is:',
      a: '5',
      x: ['7', '10', '2'],
      e: tex`Blue vitriol is $\ce{CuSO4.5H2O}$. Green and white vitriol ($\ce{FeSO4.7H2O}$, $\ce{ZnSO4.7H2O}$) have 7, washing soda ($\ce{Na2CO3.10H2O}$) has 10 and gypsum ($\ce{CaSO4.2H2O}$) has 2.`,
    },
    {
      id: 'highest-hydration-energy', d: 2, t: ['hydration and hydrolysis'],
      q: 'Which ion has the highest hydration energy?',
      a: tex`$\ce{Al^3+}$`,
      x: [tex`$\ce{Mg^2+}$`, tex`$\ce{Na+}$`, tex`$\ce{K+}$`],
      e: tex`Hydration energy increases with charge density (charge divided by size). $\ce{Al^3+}$ has the highest charge and the smallest radius of these ions, so it attracts water molecules most strongly.`,
    },
    {
      id: 'hydrolysis-definition', d: 1, t: ['hydration and hydrolysis'],
      q: 'A reaction in which an ion of a salt reacts with water and changes the pH of the solution is called:',
      a: 'Hydrolysis',
      x: ['Hydration', 'Neutralization', 'Hydrogenation'],
      e: tex`In hydrolysis the ion reacts with water, e.g. $\ce{NH4+ + H2O <=> NH3 + H3O+}$, releasing $\ce{H3O+}$ or $\ce{OH-}$. In hydration water molecules merely surround the ion without changing the pH.`,
    },
  ]),
]);
