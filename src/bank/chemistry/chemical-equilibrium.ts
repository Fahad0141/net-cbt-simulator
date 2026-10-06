import { defineBank } from '@/engine/authoring';
import { num, numericOptions, pickDistractors, qty, sci, tex, U } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------- Le Chatelier data

/** A change imposed on an equilibrium, with the reason for its effect. */
interface Change {
  s: string;
  why: string;
}

interface ShiftCase {
  /** Balanced equation (mhchem). */
  eq: string;
  /** Thermal character of the forward reaction. */
  heat: 'exothermic' | 'endothermic';
  /**
   * Changes that shift the position of equilibrium forward (at least three). Asked as
   * "shifts to the right", not "increases the amount of product": removing a product
   * shifts the equilibrium forward, yet the re-established amount of that product is lower.
   */
  up: readonly Change[];
  /** Changes that shift it backward or leave it unchanged (at least three). */
  notUp: readonly Change[];
}

const CATALYST_WHY = 'A catalyst speeds up the forward and reverse reactions equally, so equilibrium is reached sooner but its position is unchanged.';
const INERT_WHY = 'At constant volume an inert gas does not change the partial pressures (concentrations) of the reacting gases, so the equilibrium is not disturbed.';

const SHIFTS: readonly ShiftCase[] = [
  {
    eq: tex`\ce{N2(g) + 3H2(g) <=> 2NH3(g)}`,
    heat: 'exothermic',
    up: [
      { s: 'Increasing the pressure', why: 'Higher pressure favours the side with fewer gas molecules (2 on the right against 4 on the left), so the equilibrium shifts forward.' },
      { s: 'Lowering the temperature', why: 'The forward reaction is exothermic, so cooling shifts the equilibrium forward.' },
      { s: tex`Removing $\ce{NH3}$ as it forms`, why: tex`Removing a product makes the system replace it, so the forward reaction is favoured.` },
      { s: tex`Adding more $\ce{N2}$`, why: 'Adding a reactant shifts the equilibrium forward to use up some of it.' },
    ],
    notUp: [
      { s: 'Raising the temperature', why: 'The forward reaction is exothermic, so heating shifts the equilibrium backward and less ammonia is present.' },
      { s: 'Lowering the pressure', why: 'Lower pressure favours the side with more gas molecules, the reactant side.' },
      { s: 'Adding an iron catalyst', why: CATALYST_WHY },
      { s: 'Adding argon at constant volume', why: INERT_WHY },
      { s: tex`Removing some $\ce{H2}$`, why: 'Removing a reactant shifts the equilibrium backward.' },
    ],
  },
  {
    eq: tex`\ce{2SO2(g) + O2(g) <=> 2SO3(g)}`,
    heat: 'exothermic',
    up: [
      { s: 'Increasing the pressure', why: 'Higher pressure favours the side with fewer gas molecules (2 on the right against 3 on the left).' },
      { s: 'Lowering the temperature', why: 'The forward reaction is exothermic, so cooling shifts the equilibrium forward.' },
      { s: tex`Adding more $\ce{O2}$`, why: 'Adding a reactant shifts the equilibrium forward.' },
      { s: tex`Removing $\ce{SO3}$ as it forms`, why: 'Removing a product shifts the equilibrium forward.' },
    ],
    notUp: [
      { s: 'Raising the temperature', why: 'The forward reaction is exothermic, so heating shifts the equilibrium backward.' },
      { s: 'Lowering the pressure', why: 'Lower pressure favours the side with more gas molecules, the reactant side.' },
      { s: tex`Adding a $\ce{V2O5}$ catalyst`, why: CATALYST_WHY },
      { s: tex`Removing some $\ce{SO2}$`, why: 'Removing a reactant shifts the equilibrium backward.' },
    ],
  },
  {
    eq: tex`\ce{N2(g) + O2(g) <=> 2NO(g)}`,
    heat: 'endothermic',
    up: [
      { s: 'Raising the temperature', why: 'The forward reaction is endothermic, so heating shifts the equilibrium forward.' },
      { s: tex`Adding more $\ce{O2}$`, why: 'Adding a reactant shifts the equilibrium forward.' },
      { s: tex`Adding more $\ce{N2}$`, why: 'Adding a reactant shifts the equilibrium forward.' },
      { s: tex`Removing $\ce{NO}$ as it forms`, why: 'Removing a product shifts the equilibrium forward.' },
    ],
    notUp: [
      { s: 'Lowering the temperature', why: 'The forward reaction is endothermic, so cooling shifts the equilibrium backward.' },
      { s: 'Increasing the pressure', why: 'Both sides have 2 gas molecules, so pressure has no effect on the position of this equilibrium.' },
      { s: 'Lowering the pressure', why: 'Both sides have 2 gas molecules, so pressure has no effect on the position of this equilibrium.' },
      { s: 'Adding a catalyst', why: CATALYST_WHY },
    ],
  },
  {
    eq: tex`\ce{PCl5(g) <=> PCl3(g) + Cl2(g)}`,
    heat: 'endothermic',
    up: [
      { s: 'Raising the temperature', why: 'The forward (dissociation) reaction is endothermic, so heating shifts the equilibrium forward.' },
      { s: 'Lowering the pressure', why: 'Lower pressure favours the side with more gas molecules (2 on the right against 1 on the left).' },
      { s: tex`Removing some $\ce{Cl2}$`, why: 'Removing a product shifts the equilibrium forward.' },
      { s: tex`Adding more $\ce{PCl5}$`, why: 'Adding the reactant shifts the equilibrium forward.' },
    ],
    notUp: [
      { s: 'Lowering the temperature', why: 'The forward reaction is endothermic, so cooling shifts the equilibrium backward.' },
      { s: 'Increasing the pressure', why: 'Higher pressure favours the side with fewer gas molecules, the reactant side.' },
      { s: tex`Adding more $\ce{Cl2}$`, why: 'Adding a product shifts the equilibrium backward.' },
      { s: 'Adding a catalyst', why: CATALYST_WHY },
    ],
  },
  {
    eq: tex`\ce{N2O4(g) <=> 2NO2(g)}`,
    heat: 'endothermic',
    up: [
      { s: 'Raising the temperature', why: 'The forward reaction is endothermic, so heating shifts the equilibrium forward (the gas turns darker brown).' },
      { s: 'Lowering the pressure', why: 'Lower pressure favours the side with more gas molecules (2 on the right against 1 on the left).' },
      { s: tex`Adding more $\ce{N2O4}$`, why: 'Adding the reactant shifts the equilibrium forward.' },
    ],
    notUp: [
      { s: 'Lowering the temperature', why: 'The forward reaction is endothermic, so cooling shifts the equilibrium backward.' },
      { s: 'Increasing the pressure', why: 'Higher pressure favours the side with fewer gas molecules, the reactant side.' },
      { s: 'Adding a catalyst', why: CATALYST_WHY },
      { s: tex`Removing some $\ce{N2O4}$`, why: 'Removing the reactant shifts the equilibrium backward.' },
    ],
  },
  {
    eq: tex`\ce{CO(g) + 2H2(g) <=> CH3OH(g)}`,
    heat: 'exothermic',
    up: [
      { s: 'Increasing the pressure', why: 'Higher pressure favours the side with fewer gas molecules (1 on the right against 3 on the left).' },
      { s: 'Lowering the temperature', why: 'The forward reaction is exothermic, so cooling shifts the equilibrium forward.' },
      { s: tex`Adding more $\ce{H2}$`, why: 'Adding a reactant shifts the equilibrium forward.' },
      { s: tex`Removing $\ce{CH3OH}$ as it forms`, why: 'Removing a product shifts the equilibrium forward.' },
    ],
    notUp: [
      { s: 'Raising the temperature', why: 'The forward reaction is exothermic, so heating shifts the equilibrium backward.' },
      { s: 'Lowering the pressure', why: 'Lower pressure favours the side with more gas molecules, the reactant side.' },
      { s: 'Adding a catalyst', why: CATALYST_WHY },
      { s: tex`Removing some $\ce{CO}$`, why: 'Removing a reactant shifts the equilibrium backward.' },
    ],
  },
];

// ---------------------------------------------------------------- Kp and Kc data

interface DnCase {
  eq: string;
  /** Change in moles of gas (products minus reactants). */
  dn: number;
  /** A tempting wrong value (counting solids, or reactants minus products). */
  slip: number;
  why: string;
}

const DN_CASES: readonly DnCase[] = [
  { eq: tex`\ce{N2(g) + 3H2(g) <=> 2NH3(g)}`, dn: -2, slip: 2, why: tex`$\Delta n = 2 - (1 + 3) = -2$` },
  { eq: tex`\ce{H2(g) + I2(g) <=> 2HI(g)}`, dn: 0, slip: 1, why: tex`$\Delta n = 2 - (1 + 1) = 0$` },
  { eq: tex`\ce{N2(g) + O2(g) <=> 2NO(g)}`, dn: 0, slip: -1, why: tex`$\Delta n = 2 - (1 + 1) = 0$` },
  { eq: tex`\ce{PCl5(g) <=> PCl3(g) + Cl2(g)}`, dn: 1, slip: -1, why: tex`$\Delta n = (1 + 1) - 1 = 1$` },
  { eq: tex`\ce{N2O4(g) <=> 2NO2(g)}`, dn: 1, slip: -1, why: tex`$\Delta n = 2 - 1 = 1$` },
  { eq: tex`\ce{2SO2(g) + O2(g) <=> 2SO3(g)}`, dn: -1, slip: 1, why: tex`$\Delta n = 2 - (2 + 1) = -1$` },
  { eq: tex`\ce{2NO2(g) <=> N2O4(g)}`, dn: -1, slip: 1, why: tex`$\Delta n = 1 - 2 = -1$` },
  { eq: tex`\ce{CO(g) + 3H2(g) <=> CH4(g) + H2O(g)}`, dn: -2, slip: 2, why: tex`$\Delta n = (1 + 1) - (1 + 3) = -2$` },
  { eq: tex`\ce{C(s) + CO2(g) <=> 2CO(g)}`, dn: 1, slip: 0, why: tex`Only gases count: $\Delta n = 2 - 1 = 1$ (solid carbon is ignored)` },
  { eq: tex`\ce{C(s) + H2O(g) <=> CO(g) + H2(g)}`, dn: 1, slip: 0, why: tex`Only gases count: $\Delta n = (1 + 1) - 1 = 1$ (solid carbon is ignored)` },
  { eq: tex`\ce{CaCO3(s) <=> CaO(s) + CO2(g)}`, dn: 1, slip: -1, why: tex`Only gases count: $\Delta n = 1 - 0 = 1$ (the solids are ignored)` },
  { eq: tex`\ce{2H2O(g) <=> 2H2(g) + O2(g)}`, dn: 1, slip: -1, why: tex`$\Delta n = (2 + 1) - 2 = 1$` },
];

function kpForm(dn: number): string {
  if (dn === 0) return '$K_p = K_c$';
  if (dn === 1) return '$K_p = K_c(RT)$';
  return `$K_p = K_c(RT)^{${dn}}$`;
}

// ---------------------------------------------------------------- local helpers

/** Draws integer parameters until `ok` accepts them (deterministic; falls back to the last draw). */
function drawUntil<T>(r: Rng, draw: (r: Rng) => T, ok: (v: T) => boolean): T {
  let v = draw(r);
  for (let i = 0; i < 60 && !ok(v); i++) v = draw(r);
  return v;
}

/** True when `num` prints the value exactly (no hidden rounding). */
const printsExactly = (x: number): boolean => Math.abs(Number(num(x)) - x) < 1e-9 * Math.max(1, Math.abs(x));

const conc = (x: number): string => qty(x, U.molL);

export default defineBank('chemistry', 'chemical-equilibrium', (b) => [
  // ---------------------------------------------------------------- dynamic
  b.dynamic('ph-strong-acid-base', { difficulty: 1, origin: 'past-paper', tags: ['pH and pOH'] }, (r) => {
    const kind = r.pick(['acid', 'base', 'acid-poh', 'diacid', 'dibase'] as const);
    const n = kind === 'diacid' || kind === 'dibase' ? r.int(1, 4) : r.int(1, 5);
    const fmt = (x: number): string => `$${num(x, { dp: 1 })}$`;
    const c1 = 10 ** -n;
    const c2 = 5 * 10 ** -(n + 1); // diprotic / dihydroxide: twice this is 10^-n

    if (kind === 'acid') {
      const acid = r.pick(['HCl', 'HNO3', 'HBr']);
      const { answer, distractors } = numericOptions(r, { correct: n, wrong: [14 - n, n + 1, n - 1], format: fmt, fallback: 'integer' });
      return {
        stem: tex`The pH of a $${conc(c1)}$ solution of $\ce{${acid}}$ at $25^{\circ}\mathrm{C}$ is:`,
        answer,
        distractors,
        explanation: tex`$\ce{${acid}}$ is a strong acid, so $[\ce{H+}] = ${num(c1)}\,\mathrm{mol\,dm^{-3}} = 10^{-${n}}$ and $\mathrm{pH} = -\log[\ce{H+}] = ${n}$. ($${14 - n}$ is the pOH.)`,
      };
    }
    if (kind === 'base') {
      const base = r.pick(['NaOH', 'KOH']);
      const { answer, distractors } = numericOptions(r, { correct: 14 - n, wrong: [n, 14 - n + 1, 14 - n - 1], format: fmt, fallback: 'integer' });
      return {
        stem: tex`The pH of a $${conc(c1)}$ solution of $\ce{${base}}$ at $25^{\circ}\mathrm{C}$ is:`,
        answer,
        distractors,
        explanation: tex`$\ce{${base}}$ is a strong base, so $[\ce{OH-}] = 10^{-${n}}$, $\mathrm{pOH} = ${n}$ and $\mathrm{pH} = 14 - \mathrm{pOH} = 14 - ${n} = ${14 - n}$.`,
      };
    }
    if (kind === 'acid-poh') {
      const { answer, distractors } = numericOptions(r, { correct: 14 - n, wrong: [n, 14 - n + 1, 14 - n - 1], format: fmt, fallback: 'integer' });
      return {
        stem: tex`The pOH of a $${conc(c1)}$ solution of $\ce{HCl}$ at $25^{\circ}\mathrm{C}$ is:`,
        answer,
        distractors,
        explanation: tex`$[\ce{H+}] = 10^{-${n}}$, so $\mathrm{pH} = ${n}$ and $\mathrm{pOH} = 14 - \mathrm{pH} = 14 - ${n} = ${14 - n}$.`,
      };
    }
    if (kind === 'diacid') {
      const wrongPh = n + 1 - Math.log10(5); // forgot that each H2SO4 gives 2 H+
      const { answer, distractors } = numericOptions(r, { correct: n, wrong: [wrongPh, 14 - n, n + 1], format: fmt, fallback: 'integer' });
      return {
        stem: tex`The pH of a $${conc(c2)}$ solution of $\ce{H2SO4}$ (assume complete ionization) at $25^{\circ}\mathrm{C}$ is:`,
        answer,
        distractors,
        explanation: tex`$\ce{H2SO4 -> 2H+ + SO4^2-}$, so $[\ce{H+}] = 2 \times ${num(c2)} = ${num(c1)} = 10^{-${n}}$ and $\mathrm{pH} = ${n}$. Using $[\ce{H+}] = ${num(c2)}$ (forgetting the factor 2) gives $${num(wrongPh, { dp: 1 })}$.`,
      };
    }
    // Ca(OH)2 dissolves only to about 0.02 mol dm^-3, so 0.05 M needs the more soluble Ba(OH)2.
    const base = n === 1 ? 'Ba(OH)2' : r.pick(['Ba(OH)2', 'Ca(OH)2']);
    const wrongPh = 14 - (n + 1 - Math.log10(5)); // forgot the factor 2
    const { answer, distractors } = numericOptions(r, { correct: 14 - n, wrong: [wrongPh, n, 14 - n + 1], format: fmt, fallback: 'integer' });
    return {
      stem: tex`The pH of a $${conc(c2)}$ solution of $\ce{${base}}$ (assume complete ionization) at $25^{\circ}\mathrm{C}$ is:`,
      answer,
      distractors,
      explanation: tex`Each formula unit gives 2 $\ce{OH-}$ ions, so $[\ce{OH-}] = 2 \times ${num(c2)} = ${num(c1)} = 10^{-${n}}$. Then $\mathrm{pOH} = ${n}$ and $\mathrm{pH} = 14 - ${n} = ${14 - n}$.`,
    };
  }),

  b.dynamic('kc-from-concentrations', { difficulty: 2, tags: ['Kc and Kp'] }, (r) => {
    const kind = r.pick(['hi', 'n2o4', 'pcl5'] as const);
    const fmt = (x: number): string => `$${num(x)}$`;

    if (kind === 'hi') {
      const [a, bb, c] = drawUntil(
        r,
        (g) => [g.int(1, 5), g.int(1, 5), g.int(2, 9)] as const,
        ([a1, b1, c1]) => {
          const k = (c1 * c1) / (a1 * b1);
          return printsExactly(k) && k >= 0.2 && k !== 1;
        },
      );
      const k = (c * c) / (a * bb);
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        wrong: [(10 * c) / (a * bb), (a * bb) / (c * c), 4 * k, (c * c) / (10 * (a + bb))],
        format: fmt,
        fallback: 'scale',
      });
      return {
        stem: tex`For $\ce{H2(g) + I2(g) <=> 2HI(g)}$ at a certain temperature, the equilibrium concentrations are $[\ce{H2}] = ${conc(a / 10)}$, $[\ce{I2}] = ${conc(bb / 10)}$ and $[\ce{HI}] = ${conc(c / 10)}$. The value of $K_c$ is:`,
        answer,
        distractors,
        explanation: tex`$K_c = \dfrac{[\ce{HI}]^2}{[\ce{H2}][\ce{I2}]} = \dfrac{(${num(c / 10)})^2}{(${num(a / 10)})(${num(bb / 10)})} = \dfrac{${num((c * c) / 100)}}{${num((a * bb) / 100)}} = ${num(k)}$. The square comes from the coefficient 2 of $\ce{HI}$.`,
      };
    }
    if (kind === 'n2o4') {
      const [a, c] = drawUntil(
        r,
        (g) => [g.int(1, 9), g.int(1, 9)] as const,
        ([a1, c1]) => {
          const k = (c1 * c1) / (10 * a1);
          return printsExactly(k) && k >= 0.01 && c1 !== a1;
        },
      );
      const k = (c * c) / (10 * a);
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        wrong: [c / a, (10 * a) / (c * c), (2 * c) / a, 4 * k],
        format: fmt,
        fallback: 'scale',
      });
      return {
        stem: tex`For $\ce{N2O4(g) <=> 2NO2(g)}$ at a certain temperature, the equilibrium concentrations are $[\ce{N2O4}] = ${conc(a / 10)}$ and $[\ce{NO2}] = ${conc(c / 10)}$. The numerical value of $K_c$ is:`,
        answer,
        distractors,
        explanation: tex`$K_c = \dfrac{[\ce{NO2}]^2}{[\ce{N2O4}]} = \dfrac{(${num(c / 10)})^2}{${num(a / 10)}} = \dfrac{${num((c * c) / 100)}}{${num(a / 10)}} = ${num(k)}\,\mathrm{mol\,dm^{-3}}$.`,
      };
    }
    const [a, p, c] = drawUntil(
      r,
      (g) => [g.int(1, 9), g.int(1, 9), g.int(1, 9)] as const,
      ([a1, p1, c1]) => {
        const k = (p1 * c1) / (10 * a1);
        return printsExactly(k) && k >= 0.01 && p1 !== c1;
      },
    );
    const k = (p * c) / (10 * a);
    const { answer, distractors } = numericOptions(r, {
      correct: k,
      wrong: [(10 * a) / (p * c), (p + c) / a, (p * c) / 100, (p * c) / a],
      format: fmt,
      fallback: 'scale',
    });
    return {
      stem: tex`For $\ce{PCl5(g) <=> PCl3(g) + Cl2(g)}$ at a certain temperature, the equilibrium concentrations are $[\ce{PCl5}] = ${conc(a / 10)}$, $[\ce{PCl3}] = ${conc(p / 10)}$ and $[\ce{Cl2}] = ${conc(c / 10)}$. The numerical value of $K_c$ is:`,
      answer,
      distractors,
      explanation: tex`$K_c = \dfrac{[\ce{PCl3}][\ce{Cl2}]}{[\ce{PCl5}]} = \dfrac{(${num(p / 10)})(${num(c / 10)})}{${num(a / 10)}} = ${num(k)}\,\mathrm{mol\,dm^{-3}}$. Products go in the numerator and are multiplied, not added.`,
    };
  }),

  b.dynamic('kp-kc-relation', { difficulty: 2, tags: ['Kc and Kp'] }, (r) => {
    const c = r.pick(DN_CASES);
    const answer = kpForm(c.dn);
    const others = r.shuffle([-2, -1, 0, 1, 2].filter((d) => d !== c.dn && d !== c.slip && d !== -c.dn)).map(kpForm);
    const distractors = pickDistractors(answer, [kpForm(-c.dn), kpForm(c.slip), ...others]);
    return {
      stem: tex`For the reaction $${c.eq}$, $K_p$ and $K_c$ are related by:`,
      answer,
      distractors,
      explanation: tex`$K_p = K_c(RT)^{\Delta n}$, where $\Delta n$ = moles of gaseous products $-$ moles of gaseous reactants. ${c.why}, so ${answer}.`,
    };
  }),

  b.dynamic('ksp-from-solubility', { difficulty: 2, tags: ['solubility product'] }, (r) => {
    const fmt = (x: number): string => `$${sci(x)}$`;
    if (r.chance(0.5)) {
      const m = r.int(1, 5);
      const e = r.int(2, 6);
      const s = m * 10 ** -e;
      const ksp = s * s;
      const { answer, distractors } = numericOptions(r, { correct: ksp, wrong: [s, 2 * s * s, 4 * s ** 3], format: fmt, fallback: 'scale' });
      return {
        stem: tex`The solubility of a sparingly soluble salt $\ce{MX}$ in water is $${conc(s)}$. Its solubility product $K_{sp}$ is:`,
        answer,
        distractors,
        explanation: tex`$\ce{MX <=> M+ + X-}$, so $[\ce{M+}] = [\ce{X-}] = s$ and $K_{sp} = s^2 = (${sci(s)})^2 = ${sci(ksp)}$.`,
      };
    }
    const m = r.int(1, 3);
    const e = r.int(2, 4);
    const s = m * 10 ** -e;
    const ksp = 4 * s ** 3;
    const { answer, distractors } = numericOptions(r, { correct: ksp, wrong: [s ** 3, 2 * s ** 3, s * s], format: fmt, fallback: 'scale' });
    return {
      stem: tex`The solubility of a sparingly soluble salt $\ce{MX2}$ in water is $${conc(s)}$. Its solubility product $K_{sp}$ is:`,
      answer,
      distractors,
      explanation: tex`$\ce{MX2 <=> M^2+ + 2X-}$, so $[\ce{M^2+}] = s$ and $[\ce{X-}] = 2s$. $K_{sp} = s(2s)^2 = 4s^3 = 4(${sci(s)})^3 = ${sci(ksp)}$.`,
    };
  }),

  b.dynamic('le-chatelier-shift', { difficulty: 2, origin: 'past-paper', tags: ['Le Chatelier principle'] }, (r) => {
    const c = r.pick(SHIFTS);
    const heatNote = `The forward reaction is ${c.heat}.`;
    if (r.chance(0.35)) {
      const ans = r.pick(c.notUp);
      return {
        stem: tex`For the equilibrium $${c.eq}$ (forward reaction ${c.heat}), which change will NOT shift the position of equilibrium to the right (forward direction)?`,
        answer: ans.s,
        distractors: r.sample(c.up, 3).map((x) => x.s),
        explanation: `${ans.s}: ${ans.why} Each of the other changes shifts the equilibrium forward.`,
      };
    }
    const ans = r.pick(c.up);
    return {
      stem: tex`For the equilibrium $${c.eq}$ (forward reaction ${c.heat}), which change shifts the position of equilibrium to the right (forward direction)?`,
      answer: ans.s,
      distractors: r.sample(c.notUp, 3).map((x) => x.s),
      explanation: `${heatNote} ${ans.s}: ${ans.why} The other changes either shift the equilibrium backward or leave it unchanged.`,
    };
  }),

  // ---------------------------------------------------------------- fixed
  ...b.mcqs([
    {
      id: 'law-of-mass-action', d: 1, t: ['Kc and Kp'],
      q: 'The law of mass action was put forward by:',
      a: 'Guldberg and Waage',
      x: ['Henri Le Chatelier', 'Brønsted and Lowry', 'Arrhenius and Ostwald'],
      e: 'Guldberg and Waage (1864) stated that the rate of a reaction is proportional to the product of the active masses (molar concentrations) of the reactants; this leads to the equilibrium constant expression.',
    },
    {
      id: 'kc-depends-on-temperature', d: 1, o: 'past-paper', t: ['Kc and Kp'],
      q: 'For a given reaction, the value of the equilibrium constant changes only with a change in:',
      a: 'Temperature',
      x: ['Pressure', 'Initial concentration of reactants', 'Presence of a catalyst'],
      e: 'Changing pressure or concentration shifts the position of equilibrium but the ratio that defines Kc stays the same; a catalyst only helps equilibrium be reached sooner. Only temperature changes the value of K.',
    },
    {
      id: 'catalyst-at-equilibrium', d: 1, t: ['Le Chatelier principle'],
      q: 'Adding a catalyst to a reversible reaction:',
      a: tex`Leaves $K_c$ unchanged; equilibrium is just reached sooner`,
      x: [tex`Increases $K_c$ by speeding up the forward reaction`, 'Shifts the equilibrium in the forward direction', 'Shifts the equilibrium in the backward direction'],
      e: 'A catalyst lowers the activation energy of the forward and reverse reactions by the same amount, so both rates rise equally. Neither the position of equilibrium nor Kc changes.',
    },
    {
      id: 'haber-conditions', d: 1, o: 'past-paper', t: ['Le Chatelier principle'],
      q: tex`The conditions used in the Haber process for $\ce{NH3}$ are about:`,
      a: tex`$450^{\circ}\mathrm{C}$, $200\,\mathrm{atm}$, iron catalyst`,
      x: [tex`$450^{\circ}\mathrm{C}$, $1\,\mathrm{atm}$, platinum catalyst`, tex`$1000^{\circ}\mathrm{C}$, $200\,\mathrm{atm}$, nickel catalyst`, tex`$25^{\circ}\mathrm{C}$, $1\,\mathrm{atm}$, $\ce{V2O5}$ catalyst`],
      e: tex`$\ce{N2 + 3H2 <=> 2NH3}$ is exothermic with fewer gas molecules on the right, so high pressure (about 200 to 300 atm) favours ammonia. Low temperature favours the yield but is too slow, so a compromise of about 400 to 500 °C is used with an iron catalyst.`,
    },
    {
      id: 'heating-pure-water', d: 3, t: ['pH and pOH'],
      q: tex`When pure water is heated from $25^{\circ}\mathrm{C}$ to $60^{\circ}\mathrm{C}$, its pH:`,
      a: 'Decreases, but the water remains neutral',
      x: ['Stays exactly 7', 'Decreases, and the water becomes acidic', 'Increases, and the water becomes basic'],
      e: tex`Ionization of water is endothermic, so $K_w$ increases on heating and $[\ce{H+}]$ rises above $10^{-7}$, lowering the pH below 7. But $[\ce{H+}] = [\ce{OH-}]$ still, so the water stays neutral.`,
    },
    {
      id: 'acidic-buffer-pair', d: 1, o: 'past-paper', t: ['buffers'],
      q: 'Which pair of substances in water forms a buffer solution?',
      a: tex`$\ce{CH3COOH}$ and $\ce{CH3COONa}$`,
      x: [tex`$\ce{HCl}$ and $\ce{NaCl}$`, tex`$\ce{NaOH}$ and $\ce{NaCl}$`, tex`$\ce{HNO3}$ and $\ce{NaNO3}$`],
      e: tex`A buffer needs a weak acid with its salt (or a weak base with its salt). Acetic acid is weak and sodium acetate supplies its conjugate base; $\ce{HCl}$, $\ce{HNO3}$ and $\ce{NaOH}$ are strong and cannot buffer with their salts.`,
    },
    {
      id: 'basic-buffer-pair', d: 2, t: ['buffers'],
      q: 'A basic buffer solution can be prepared by mixing:',
      a: tex`$\ce{NH4OH}$ and $\ce{NH4Cl}$`,
      x: [tex`$\ce{CH3COOH}$ and $\ce{CH3COONa}$`, tex`$\ce{NaOH}$ and $\ce{NaCl}$`, tex`$\ce{HCl}$ and $\ce{NH4Cl}$`],
      e: tex`A basic buffer is a weak base with a salt of that base and a strong acid: $\ce{NH4OH}$ with $\ce{NH4Cl}$ (pH about 9.25). Acetic acid with sodium acetate is an acidic buffer, and $\ce{NaOH}$ is a strong base.`,
    },
    {
      id: 'buffer-equal-concentrations', d: 2, t: ['buffers'],
      q: tex`A buffer contains a weak acid ($\mathrm{p}K_a = 4.74$) and its sodium salt in equal concentrations. Its pH is:`,
      a: '$4.74$',
      x: ['$9.26$', '$7.00$', '$2.37$'],
      e: tex`Henderson equation: $\mathrm{pH} = \mathrm{p}K_a + \log\dfrac{[\text{salt}]}{[\text{acid}]} = 4.74 + \log 1 = 4.74$. The value $9.26 = 14 - 4.74$ would be the pOH.`,
    },
    {
      id: 'common-ion-agcl', d: 1, o: 'past-paper', t: ['common ion effect'],
      q: tex`The solubility of $\ce{AgCl}$ in water is lowered by adding a little $\ce{NaCl}$. This is an example of:`,
      a: 'The common ion effect',
      x: ['Hydrolysis of the salt', 'Buffer action', 'Hydration of ions'],
      e: tex`$\ce{NaCl}$ supplies $\ce{Cl-}$, the ion common with $\ce{AgCl <=> Ag+ + Cl-}$. The equilibrium shifts left so that $[\ce{Ag+}][\ce{Cl-}]$ does not exceed $K_{sp}$, and less $\ce{AgCl}$ dissolves.`,
    },
    {
      id: 'precipitation-condition', d: 2, t: ['solubility product'],
      q: 'A sparingly soluble salt is precipitated from its solution when:',
      a: tex`The ionic product exceeds $K_{sp}$`,
      x: [tex`The ionic product is less than $K_{sp}$`, tex`The ionic product is equal to $K_{sp}$`, tex`$K_{sp}$ is greater than $K_w$`],
      e: tex`If the ionic product is less than $K_{sp}$ the solution is unsaturated; if equal, it is just saturated. Only when the ionic product exceeds $K_{sp}$ does the excess salt precipitate.`,
    },
    {
      id: 'hcl-with-h2s-group-ii', d: 3, t: ['common ion effect'],
      q: tex`In salt analysis, group II sulphides are precipitated by passing $\ce{H2S}$ in the presence of dilute $\ce{HCl}$. The role of $\ce{HCl}$ is to:`,
      a: tex`Suppress ionization of $\ce{H2S}$, keeping $[\ce{S^2-}]$ low`,
      x: [tex`Increase $[\ce{S^2-}]$ so that all sulphides precipitate`, tex`Oxidize $\ce{H2S}$ to free sulphur`, tex`Dissolve the group II sulphides as chlorides`],
      e: tex`$\ce{H+}$ from $\ce{HCl}$ is a common ion for $\ce{H2S <=> 2H+ + S^2-}$, so the equilibrium shifts left and $[\ce{S^2-}]$ becomes very small. Only sulphides with very low $K_{sp}$ (group II) exceed their $K_{sp}$ and precipitate; group IV sulphides stay in solution.`,
    },
  ]),
]);
