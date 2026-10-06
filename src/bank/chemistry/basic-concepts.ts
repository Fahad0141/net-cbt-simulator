import { defineBank } from '@/engine/authoring';
import type { Rng } from '@/engine/rng';
import {
  ce,
  ELEMENTS,
  molarMass,
  num,
  numericOptions,
  parseFormula,
  pickDistractors,
  q$,
  qty,
  sci,
  statementQuestion,
  tex,
  U,
} from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** `x` has at most `dp` decimal places. */
function isTidy(x: number, dp = 2): boolean {
  const scaled = x * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

/** `x` is shown exactly with `sig` significant figures. */
function exactSig(x: number, sig: number): boolean {
  return Number(x.toPrecision(sig)) === Number(x.toPrecision(12));
}

/** Draws from `draw` until `ok` accepts the value (rng-driven, so deterministic). */
function drawUntil<T>(r: Rng, draw: (r: Rng) => T, ok: (v: T) => boolean): T {
  for (let i = 0; i < 500; i++) {
    const v = draw(r);
    if (ok(v)) return v;
  }
  throw new Error('basic-concepts: no acceptable parameters found');
}

/** "(C = 12, H = 1, O = 16)" for the elements in the given formulae. */
function massesNote(...formulas: string[]): string {
  const seen: string[] = [];
  for (const f of formulas) for (const el of parseFormula(f).keys()) if (!seen.includes(el)) seen.push(el);
  return `(${seen.map((el) => `${el} = ${ELEMENTS[el]?.mass ?? '?'}`).join(', ')})`;
}

/** Total number of atoms in one formula unit. */
function atomCount(formula: string): number {
  let n = 0;
  for (const c of parseFormula(formula).values()) n += c;
  return n;
}

/** Formula text from element counts in the given order: [['C',1],['H',2]] -> 'CH2'. */
function formulaOf(parts: ReadonlyArray<readonly [string, number]>): string {
  return parts.map(([el, n]) => (n === 1 ? el : `${el}${n}`)).join('');
}

const NA_TEX = tex`N_A = 6.02 \times 10^{23}\,\mathrm{mol^{-1}}`;
const sci4 = (x: number): string => `$${sci(x, 4)}$`;
const grams = (x: number): string => q$(x, U.g, { sig: 4 });

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** Molecular substances (and whether they are gases at STP) for mole conversions. */
const MOLECULES: ReadonlyArray<{ f: string; gas: boolean }> = [
  { f: 'H2O', gas: false },
  { f: 'CO2', gas: true },
  { f: 'CH4', gas: true },
  { f: 'NH3', gas: true },
  { f: 'O2', gas: true },
  { f: 'N2', gas: true },
  { f: 'SO2', gas: true },
  { f: 'HCl', gas: true },
  { f: 'Cl2', gas: true },
  { f: 'H2', gas: true },
  { f: 'C2H6', gas: true },
  { f: 'H2SO4', gas: false },
  { f: 'C6H12O6', gas: false },
  { f: 'C2H5OH', gas: false },
];

/** (compound, element) pairs whose mass percentage is exact to one decimal place. */
const PERCENT_CASES: ReadonlyArray<{ f: string; el: string; name: string }> = (
  [
    ['CaCO3', 'Ca'], ['CaCO3', 'C'], ['CaCO3', 'O'],
    ['NH4NO3', 'N'], ['NH4NO3', 'O'], ['NH4NO3', 'H'],
    ['NaOH', 'Na'], ['NaOH', 'O'],
    ['CH4', 'C'], ['CH4', 'H'],
    ['SO3', 'S'], ['SO3', 'O'],
    ['MgO', 'Mg'], ['MgO', 'O'],
    ['Fe2O3', 'Fe'], ['Fe2O3', 'O'],
    ['C2H6', 'C'], ['C2H6', 'H'],
    ['CaC2', 'Ca'], ['CaC2', 'C'],
    ['CH3OH', 'C'], ['CH3OH', 'O'], ['CH3OH', 'H'],
    ['MgSO4', 'Mg'],
    ['C6H12O6', 'C'],
  ] as const
)
  .map(([f, el]) => ({ f, el, name: (ELEMENTS[el]?.name ?? el).toLowerCase() }))
  .filter(({ f, el }) => isTidy(((parseFormula(f).get(el) ?? 0) * (ELEMENTS[el]?.mass ?? 0) * 100) / molarMass(f), 1));

/** Empirical formulae (element counts) with the molecular formulae built on them. */
const EMPIRICAL: ReadonlyArray<{ parts: ReadonlyArray<readonly [string, number]>; multiples: readonly number[] }> = [
  { parts: [['C', 1], ['H', 1]], multiples: [2, 6] },
  { parts: [['C', 1], ['H', 2]], multiples: [2, 3, 4, 5] },
  { parts: [['C', 1], ['H', 3]], multiples: [2] },
  { parts: [['C', 2], ['H', 5]], multiples: [2] },
  { parts: [['C', 3], ['H', 4]], multiples: [3] },
  { parts: [['C', 1], ['H', 2], ['O', 1]], multiples: [2, 3, 6] },
  { parts: [['C', 2], ['H', 4], ['O', 1]], multiples: [2] },
  { parts: [['N', 1], ['O', 2]], multiples: [2] },
  { parts: [['P', 2], ['O', 5]], multiples: [2] },
  { parts: [['H', 1], ['O', 1]], multiples: [2] },
  { parts: [['C', 1], ['H', 4]], multiples: [1] },
  { parts: [['C', 3], ['H', 8]], multiples: [1] },
  { parts: [['N', 1], ['H', 2]], multiples: [2] },
];

interface Reaction {
  eq: string;
  /** [formula, coefficient] of the two reactants and the product of interest. */
  a: readonly [string, number];
  b: readonly [string, number];
  p: readonly [string, number];
}

/** Two-reactant reactions for limiting-reactant problems. */
const LIMITING: readonly Reaction[] = [
  { eq: '2H2 + O2 -> 2H2O', a: ['H2', 2], b: ['O2', 1], p: ['H2O', 2] },
  { eq: 'N2 + 3H2 -> 2NH3', a: ['N2', 1], b: ['H2', 3], p: ['NH3', 2] },
  { eq: '2Mg + O2 -> 2MgO', a: ['Mg', 2], b: ['O2', 1], p: ['MgO', 2] },
  { eq: 'C + O2 -> CO2', a: ['C', 1], b: ['O2', 1], p: ['CO2', 1] },
  { eq: 'S + O2 -> SO2', a: ['S', 1], b: ['O2', 1], p: ['SO2', 1] },
  { eq: '4Al + 3O2 -> 2Al2O3', a: ['Al', 4], b: ['O2', 3], p: ['Al2O3', 2] },
  { eq: '2CO + O2 -> 2CO2', a: ['CO', 2], b: ['O2', 1], p: ['CO2', 2] },
  { eq: '2Na + Cl2 -> 2NaCl', a: ['Na', 2], b: ['Cl2', 1], p: ['NaCl', 2] },
  { eq: 'H2 + Cl2 -> 2HCl', a: ['H2', 1], b: ['Cl2', 1], p: ['HCl', 2] },
  { eq: 'Ca + Cl2 -> CaCl2', a: ['Ca', 1], b: ['Cl2', 1], p: ['CaCl2', 1] },
];

/** Reactions with one reactant of interest (any other reactant in excess) for yield problems. */
const YIELD: ReadonlyArray<{ eq: string; r: readonly [string, number]; p: readonly [string, number]; excess?: string }> = [
  { eq: 'CaCO3 -> CaO + CO2', r: ['CaCO3', 1], p: ['CaO', 1] },
  { eq: 'CaCO3 -> CaO + CO2', r: ['CaCO3', 1], p: ['CO2', 1] },
  { eq: 'N2 + 3H2 -> 2NH3', r: ['N2', 1], p: ['NH3', 2], excess: 'H2' },
  { eq: 'C + O2 -> CO2', r: ['C', 1], p: ['CO2', 1], excess: 'O2' },
  { eq: '2Mg + O2 -> 2MgO', r: ['Mg', 2], p: ['MgO', 2], excess: 'O2' },
  { eq: 'CH4 + 2O2 -> CO2 + 2H2O', r: ['CH4', 1], p: ['CO2', 1], excess: 'O2' },
  { eq: 'Zn + 2HCl -> ZnCl2 + H2', r: ['Zn', 1], p: ['ZnCl2', 1], excess: 'HCl' },
  { eq: '2H2 + O2 -> 2H2O', r: ['H2', 2], p: ['H2O', 2], excess: 'O2' },
];

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('chemistry', 'basic-concepts', (b) => [
  // Mass -> moles -> molecules / atoms / volume at STP.
  b.dynamic('mass-to-particles', { difficulty: 1, origin: 'past-paper', tags: ['moles', 'Avogadro number'] }, (r) => {
    const { f, n, mode } = drawUntil(
      r,
      (rr) => {
        const s = rr.pick(MOLECULES);
        const mode = s.gas ? rr.pick(['molecules', 'atoms', 'volume'] as const) : rr.pick(['molecules', 'atoms'] as const);
        return { ...s, n: rr.pick([0.1, 0.2, 0.25, 0.5, 1.5, 2, 2.5, 3, 4, 5]), mode };
      },
      ({ f, n }) => {
        const mass = n * molarMass(f);
        return isTidy(mass, 2) && exactSig(n * atomCount(f) * 6.02e23, 4) && exactSig(n * 6.02e23, 4);
      },
    );
    const M = molarMass(f);
    const mass = n * M;
    const atoms = atomCount(f);
    const NA = 6.02e23;
    // Masses such as 106.5 g or 18.25 g need more than 3 significant figures to be shown exactly.
    const head = tex`Moles $n = \frac{m}{M} = \frac{${num(mass, { sig: 5 })}}{${num(M)}} = ${num(n)}\,\mathrm{mol}$.`;
    const masses = massesNote(f);
    const note = mode === 'volume' ? masses : `${masses.slice(0, -1)}, ${tex`$${NA_TEX}$`})`;
    const given = tex`$${qty(mass, U.g, { sig: 5 })}$ of $${ce(f)}$`;

    if (mode === 'volume') {
      const V = n * 22.4;
      const { answer, distractors } = numericOptions(r, {
        correct: V,
        wrong: [mass * 22.4, 22.4 / n, M / 22.4, n * 22.4 * atoms],
        format: (x) => q$(x, U.dm3),
      });
      return {
        stem: tex`The volume occupied by ${given} at STP is ${note}:`,
        answer,
        distractors,
        explanation: tex`${head} At STP one mole of a gas occupies $22.4\,\mathrm{dm^3}$, so $V = ${num(n)} \times 22.4 = ${qty(V, U.dm3)}$.`,
      };
    }
    if (mode === 'atoms') {
      const correct = n * atoms * NA;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [n * NA, mass * atoms * NA, n * (atoms + 1) * NA, (atoms * NA) / n],
        format: sci4,
      });
      return {
        stem: tex`The total number of atoms in ${given} is ${note}:`,
        answer,
        distractors,
        explanation: tex`${head} Each molecule has ${atoms} atoms, so atoms $= n \times ${atoms} \times N_A = ${num(n)} \times ${atoms} \times 6.02 \times 10^{23} = ${sci(correct, 4)}$.`,
      };
    }
    const correct = n * NA;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [n * atoms * NA, mass * NA, NA / n, M * NA],
      format: sci4,
    });
    return {
      stem: tex`The number of molecules in ${given} is ${note}:`,
      answer,
      distractors,
      explanation: tex`${head} Molecules $= n \times N_A = ${num(n)} \times 6.02 \times 10^{23} = ${sci(correct, 4)}$.`,
    };
  }),

  // Percentage composition by mass.
  b.dynamic('percent-composition', { difficulty: 1, origin: 'past-paper', tags: ['moles', 'empirical and molecular formula'] }, (r) => {
    const { f, el, name } = r.pick(PERCENT_CASES);
    const counts = parseFormula(f);
    const count = counts.get(el) ?? 0;
    const A = ELEMENTS[el]?.mass ?? 0;
    const M = molarMass(f);
    const pct = (count * A * 100) / M;
    const others = [...counts.keys()].filter((e) => e !== el);
    const otherPct = others.map((e) => ((counts.get(e) ?? 0) * (ELEMENTS[e]?.mass ?? 0) * 100) / M);
    const wrong = [
      ...(count > 1 ? [(A * 100) / M] : []),
      (count * 100) / atomCount(f),
      100 - pct,
      ...otherPct,
      (count * A * 100) / (M + A),
    ];
    const { answer, distractors } = numericOptions(r, {
      correct: pct,
      wrong,
      format: (x) => `$${num(x, { dp: 1 })}\\%$`,
    });
    const countText = count === 1 ? '' : tex`${count} \times `;
    return {
      stem: tex`The percentage of ${name} by mass in $${ce(f)}$ is ${massesNote(f)}:`,
      answer,
      distractors,
      explanation: tex`$M(${ce(f)}) = ${num(M)}\,\mathrm{g\,mol^{-1}}$. $\%\,\mathrm{${el}} = \frac{${countText}${num(A)}}{${num(M)}} \times 100 = ${num(pct, { dp: 1 })}\%$.`,
    };
  }),

  // Empirical formula from masses, or molecular formula from empirical formula + molar mass.
  b.dynamic('empirical-molecular-formula', { difficulty: 2, tags: ['empirical and molecular formula'] }, (r) => {
    if (r.chance(0.5)) {
      const ef = r.pick(EMPIRICAL.filter((e) => e.multiples.some((m) => m > 1)));
      const k = r.pick(ef.multiples.filter((m) => m > 1));
      const efText = formulaOf(ef.parts);
      const efMass = molarMass(efText);
      const mf = formulaOf(ef.parts.map(([el, c]) => [el, c * k] as const));
      const M = efMass * k;
      const mult = (m: number): string => `$${ce(formulaOf(ef.parts.map(([el, c]) => [el, c * m] as const)))}$`;
      const answer = `$${ce(mf)}$`;
      const distractors = pickDistractors(answer, [`$${ce(efText)}$`, mult(k + 1), mult(k - 1), mult(2 * k), mult(k + 2)]);
      return {
        stem: tex`A compound has empirical formula $${ce(efText)}$ and molar mass $${qty(M, U.gmol)}$. Its molecular formula is ${massesNote(efText)}:`,
        answer,
        distractors,
        explanation: tex`Empirical formula mass $= ${num(efMass)}$. $n = \frac{${num(M)}}{${num(efMass)}} = ${k}$, so the molecular formula is $(${ce(efText)})_{${k}} = ${ce(mf)}$.`,
      };
    }
    const { ef, s } = drawUntil(
      r,
      (rr) => ({ ef: rr.pick(EMPIRICAL), s: rr.pick([0.05, 0.1, 0.2, 0.25, 0.5]) }),
      ({ ef, s }) => ef.parts.every(([el, c]) => isTidy(c * (ELEMENTS[el]?.mass ?? 0) * s, 2)),
    );
    const efText = formulaOf(ef.parts);
    const masses = ef.parts.map(([el, c]) => ({ el, c, A: ELEMENTS[el]?.mass ?? 1, m: c * (ELEMENTS[el]?.mass ?? 1) * s }));
    const names = masses.map((x) => (ELEMENTS[x.el]?.name ?? x.el).toLowerCase());
    const given = masses.map((x, i) => tex`$${qty(x.m, U.g)}$ of ${names[i]}`);
    const givenText = given.length === 2 ? `${given[0]} and ${given[1]}` : `${given.slice(0, -1).join(', ')} and ${given[given.length - 1]}`;
    const answer = `$${ce(efText)}$`;
    const swapped = formulaOf(ef.parts.map(([el], i) => [el, ef.parts[ef.parts.length - 1 - i]?.[1] ?? 1] as const));
    const doubled = formulaOf(ef.parts.map(([el, c]) => [el, 2 * c] as const));
    const lastBump = formulaOf(ef.parts.map(([el, c], i) => [el, i === ef.parts.length - 1 ? c + 1 : c] as const));
    const firstBump = formulaOf(ef.parts.map(([el, c], i) => [el, i === 0 ? c + 1 : c] as const));
    const distractors = pickDistractors(
      answer,
      [swapped, doubled, lastBump, firstBump].map((x) => `$${ce(x)}$`),
      r,
    );
    const moles = masses.map((x) => tex`\mathrm{${x.el}}: \frac{${num(x.m)}}{${num(x.A)}} = ${num(x.m / x.A)}`).join(',\\; ');
    const ratio = masses.map((x) => x.c).join(':');
    return {
      stem: tex`A sample of a compound contains ${givenText} only. Its empirical formula is ${massesNote(efText)}:`,
      answer,
      distractors,
      explanation: tex`Moles: $${moles}$. Simplest whole-number ratio $= ${ratio}$, so the empirical formula is $${ce(efText)}$.`,
    };
  }),

  // Limiting reactant: product formed or excess left over.
  b.dynamic('limiting-reactant-mass', { difficulty: 3, origin: 'past-paper', tags: ['limiting reactant', 'stoichiometry'] }, (r) => {
    const pickCase = (rr: Rng) => {
      const rx = rr.pick(LIMITING);
      const limitingIsA = rr.chance(0.5);
      const xi = rr.pick([0.25, 0.5, 1, 1.5, 2]);
      const f = rr.pick([1.5, 2, 3]);
      return { rx, limitingIsA, xi, f };
    };
    const { rx, limitingIsA, xi, f } = drawUntil(r, pickCase, ({ rx, limitingIsA, xi, f }) => {
      const [L, cL] = limitingIsA ? rx.a : rx.b;
      const [E, cE] = limitingIsA ? rx.b : rx.a;
      const mL = cL * xi * molarMass(L);
      const mE = cE * xi * f * molarMass(E);
      const prod = rx.p[1] * xi * molarMass(rx.p[0]);
      return [mL, mE, prod].every((x) => isTidy(x, 2) && exactSig(x, 4));
    });
    const [L, cL] = limitingIsA ? rx.a : rx.b;
    const [E, cE] = limitingIsA ? rx.b : rx.a;
    const [P, cP] = rx.p;
    const ML = molarMass(L);
    const ME = molarMass(E);
    const MP = molarMass(P);
    const nL = cL * xi;
    const nE = cE * xi * f;
    const mL = nL * ML;
    const mE = nE * ME;
    const [A, B] = [rx.a[0], rx.b[0]];
    const mA = A === L ? mL : mE;
    const mB = A === L ? mE : mL;
    const nA = A === L ? nL : nE;
    const nB = A === L ? nE : nL;
    const intro = tex`$${qty(mA, U.g, { sig: 4 })}$ of $${ce(A)}$ is mixed with $${qty(mB, U.g, { sig: 4 })}$ of $${ce(B)}$, and they react according to $${ce(rx.eq)}$.`;
    const n4 = (x: number): string => num(x, { sig: 4 }); // 1.125 mol must not print as 1.13
    const work = tex`Moles: $${ce(A)} = ${n4(nA)}$, $${ce(B)} = ${n4(nB)}$. Dividing by the coefficients: $${ce(L)}$ gives $${n4(nL)}/${cL} = ${n4(xi)}$ and $${ce(E)}$ gives $${n4(nE)}/${cE} = ${n4(xi * f)}$, so $${ce(L)}$ is the limiting reactant.`;
    const note = massesNote(rx.a[0], rx.b[0], P);

    if (r.chance(0.5)) {
      const prod = cP * xi * MP;
      const { answer, distractors } = numericOptions(r, {
        correct: prod,
        wrong: [cP * xi * f * MP, mA + mB, nL * MP, (cP * xi * MP) / 2, cP * xi * MP * 2],
        format: grams,
      });
      return {
        stem: tex`${intro} The maximum mass of $${ce(P)}$ formed is ${note}:`,
        answer,
        distractors,
        explanation: tex`${work} $${ce(P)}$ formed $= ${cP} \times ${n4(xi)} = ${n4(cP * xi)}\,\mathrm{mol}$, mass $= ${n4(cP * xi)} \times ${num(MP)} = ${qty(prod, U.g, { sig: 4 })}$.`,
      };
    }
    const left = (nE - cE * xi) * ME;
    const { answer, distractors } = numericOptions(r, {
      correct: left,
      // mass used, whole excess, total mass, moles subtracted without coefficients,
      // mass of the limiting reactant, masses subtracted directly
      wrong: [cE * xi * ME, mE, mE + mL, (nE - nL) * ME, mL, Math.abs(mE - mL)],
      format: grams,
    });
    return {
      stem: tex`${intro} The mass of the reactant left unreacted is ${note}:`,
      answer,
      distractors,
      explanation: tex`${work} $${ce(E)}$ used $= ${cE} \times ${n4(xi)} = ${n4(cE * xi)}\,\mathrm{mol}$, left $= ${n4(nE)} - ${n4(cE * xi)} = ${n4(nE - cE * xi)}\,\mathrm{mol} = ${qty(left, U.g, { sig: 4 })}$ of $${ce(E)}$.`,
    };
  }),

  // Percentage yield, or actual yield from a given percentage yield.
  b.dynamic('percentage-yield', { difficulty: 2, tags: ['yield', 'stoichiometry'] }, (r) => {
    const { rx, n, pct } = drawUntil(
      r,
      (rr) => ({ rx: rr.pick(YIELD), n: rr.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]), pct: rr.pick([45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]) }),
      ({ rx, n, pct }) => {
        const mR = n * molarMass(rx.r[0]);
        const theo = ((n * rx.p[1]) / rx.r[1]) * molarMass(rx.p[0]);
        const actual = (theo * pct) / 100;
        return [mR, theo, actual].every((x) => isTidy(x, 2) && exactSig(x, 4));
      },
    );
    const [R, cR] = rx.r;
    const [P, cP] = rx.p;
    const MR = molarMass(R);
    const MP = molarMass(P);
    const mR = n * MR;
    const nP = (n * cP) / cR;
    const theo = nP * MP;
    const actual = (theo * pct) / 100;
    const action = rx.excess ? tex`reacts with excess $${ce(rx.excess)}$` : 'decomposes';
    const intro = tex`$${qty(mR, U.g, { sig: 4 })}$ of $${ce(R)}$ ${action} according to $${ce(rx.eq)}$.`;
    const note = massesNote(R, P);
    const theoWork = tex`$n(${ce(R)}) = \frac{${num(mR, { sig: 4 })}}{${num(MR)}} = ${num(n)}\,\mathrm{mol}$, so theoretical $${ce(P)} = ${num(nP)} \times ${num(MP)} = ${qty(theo, U.g, { sig: 4 })}$.`;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: pct,
        wrong: [(actual / mR) * 100, 100 - pct, (theo / actual) * 100, (actual / (theo + mR)) * 100],
        format: (x) => `$${num(x, { dp: 1 })}\\%$`,
      });
      return {
        stem: tex`${intro} If $${qty(actual, U.g, { sig: 4 })}$ of $${ce(P)}$ is actually obtained, the percentage yield is ${note}:`,
        answer,
        distractors,
        explanation: tex`${theoWork} $\%\ \text{yield} = \frac{\text{actual}}{\text{theoretical}} \times 100 = \frac{${num(actual, { sig: 4 })}}{${num(theo, { sig: 4 })}} \times 100 = ${pct}\%$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: actual,
      wrong: [theo, (theo * (100 - pct)) / 100, (mR * pct) / 100, (theo * 100) / pct],
      format: grams,
    });
    return {
      stem: tex`${intro} If the percentage yield is $${pct}\%$, the mass of $${ce(P)}$ actually obtained is ${note}:`,
      answer,
      distractors,
      explanation: tex`${theoWork} Actual yield $= \frac{${pct}}{100} \times ${num(theo, { sig: 4 })} = ${qty(actual, U.g, { sig: 4 })}$.`,
    };
  }),

  // Statement pool on the mole concept and stoichiometry.
  b.dynamic('mole-concept-statements', { difficulty: 1, tags: ['moles', 'Avogadro number', 'limiting reactant', 'yield'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements is correct?',
      negativeStem: 'Which of the following statements is incorrect?',
      truths: [
        tex`One mole of any substance contains $6.02 \times 10^{23}$ particles of that substance.`,
        tex`One mole of $\ce{H2O}$ contains three times as many atoms as molecules.`,
        'The mass of one mole of a compound, in grams, is numerically equal to its relative formula mass.',
        'The empirical formula shows the simplest whole-number ratio of atoms in a compound.',
        'The limiting reactant is the reactant that is used up first in a reaction.',
        'The actual yield of a reaction is usually less than its theoretical yield.',
        tex`At STP, one mole of an ideal gas occupies $22.414\,\mathrm{dm^3}$.`,
        tex`Equal numbers of moles of $\ce{O2}$ and $\ce{CO2}$ contain equal numbers of molecules.`,
      ],
      falsehoods: [
        tex`One mole of $\ce{O2}$ and one mole of $\ce{O3}$ have the same mass.`,
        'The empirical formula of a compound is always different from its molecular formula.',
        'The reactant present in excess decides the maximum amount of product formed.',
        tex`Equal masses of $\ce{O2}$ and $\ce{SO2}$ contain equal numbers of molecules.`,
        tex`One mole of $\ce{H2O}$ contains $6.02 \times 10^{23}$ atoms in total.`,
        'The molar mass of a substance increases as a larger sample is taken.',
        tex`One gram of hydrogen gas contains one mole of $\ce{H2}$ molecules.`,
        'The theoretical yield is calculated from the mass of the excess reactant.',
      ],
      explain: (answer, inverted) =>
        inverted
          ? tex`The incorrect statement is: "${answer}" Remember that a mole always contains $6.02 \times 10^{23}$ particles, its mass equals the molar mass, and the limiting (not the excess) reactant fixes the yield.`
          : tex`The correct statement is: "${answer}" The other options misuse the mole concept: a mole's mass equals the molar mass, and the limiting (not the excess) reactant fixes the yield.`,
    }),
  ),

  ...b.mcqs([
    {
      id: 'h-atoms-in-methane', d: 1, o: 'past-paper', t: ['Avogadro number', 'moles'],
      q: tex`The number of hydrogen atoms in one mole of $\ce{CH4}$ is:`,
      a: tex`$2.408 \times 10^{24}$`,
      x: [tex`$6.02 \times 10^{23}$`, tex`$3.01 \times 10^{24}$`, tex`$1.505 \times 10^{23}$`],
      e: tex`Each $\ce{CH4}$ molecule has 4 H atoms, so H atoms $= 4 \times 6.02 \times 10^{23} = 2.408 \times 10^{24}$. ($3.01 \times 10^{24}$ counts all 5 atoms.)`,
    },
    {
      id: 'most-molecules-equal-mass', d: 1, o: 'past-paper', t: ['moles', 'Avogadro number'],
      q: 'Which of the following contains the largest number of molecules?',
      a: tex`1 g of $\ce{H2}$`,
      x: [tex`1 g of $\ce{O2}$`, tex`1 g of $\ce{N2}$`, tex`1 g of $\ce{CO2}$`],
      e: tex`For equal masses, $n = m/M$ is largest for the smallest molar mass: $\ce{H2}$ ($M = 2$) gives $0.5\,\mathrm{mol}$, far more than $\ce{N2}$ (28), $\ce{O2}$ (32) or $\ce{CO2}$ (44).`,
    },
    {
      id: 'same-molecules-as-oxygen', d: 2, t: ['moles', 'Avogadro number'],
      q: tex`Which sample contains the same number of molecules as $16\,\mathrm{g}$ of $\ce{O2}$? (H = 1, C = 12, N = 14, O = 16, S = 32)`,
      a: tex`14 g of $\ce{N2}$`,
      x: [tex`16 g of $\ce{SO2}$`, tex`16 g of $\ce{CH4}$`, tex`44 g of $\ce{CO2}$`],
      e: tex`$16\,\mathrm{g}\ \ce{O2} = 16/32 = 0.5\,\mathrm{mol}$. $14\,\mathrm{g}\ \ce{N2} = 14/28 = 0.5\,\mathrm{mol}$; the others are $0.25$, $1$ and $1\,\mathrm{mol}$.`,
    },
    {
      id: 'glucose-empirical-formula', d: 1, o: 'past-paper', t: ['empirical and molecular formula'],
      q: tex`The empirical formula of glucose, $\ce{C6H12O6}$, is:`,
      a: tex`$\ce{CH2O}$`,
      x: [tex`$\ce{CHO}$`, tex`$\ce{C2H4O2}$`, tex`$\ce{C6H12O6}$`],
      e: tex`Dividing $\ce{C6H12O6}$ by the common factor 6 gives the simplest ratio $1:2:1$, i.e. $\ce{CH2O}$.`,
    },
    {
      id: 'same-empirical-formula-pair', d: 2, t: ['empirical and molecular formula'],
      q: 'Which pair of compounds has the same empirical formula?',
      a: tex`$\ce{C2H2}$ and $\ce{C6H6}$`,
      x: [tex`$\ce{C2H4}$ and $\ce{C2H6}$`, tex`$\ce{CH4}$ and $\ce{C2H4}$`, tex`$\ce{H2O}$ and $\ce{H2O2}$`],
      e: tex`Both $\ce{C2H2}$ and $\ce{C6H6}$ reduce to $\ce{CH}$. The other pairs give $\ce{CH2}$/$\ce{CH3}$, $\ce{CH4}$/$\ce{CH2}$ and $\ce{H2O}$/$\ce{HO}$.`,
    },
    {
      id: 'limiting-reactant-definition', d: 1, t: ['limiting reactant'],
      q: 'The reactant that is used up first and so controls the amount of product formed is called the:',
      a: 'limiting reactant',
      x: ['excess reactant', 'catalyst', 'intermediate'],
      e: 'The limiting reactant is consumed completely; once it is used up no more product can form, while the excess reactant remains partly unreacted.',
    },
    {
      id: 'actual-less-than-theoretical', d: 1, t: ['yield'],
      q: 'The actual yield of a reaction is usually less than the theoretical yield because:',
      a: 'side reactions occur and some product is lost while it is separated',
      x: [
        'some mass is destroyed during every chemical reaction',
        'the excess reactant is converted into extra product',
        'the limiting reactant is always present in excess',
      ],
      e: 'Mass is conserved, but competing side reactions, reversible (incomplete) reactions and mechanical losses during filtration, transfer and purification lower the amount of product actually collected.',
    },
    {
      id: 'relative-atomic-mass-standard', d: 1, t: ['moles'],
      q: 'Relative atomic masses are measured relative to:',
      a: 'one-twelfth of the mass of a carbon-12 atom',
      x: [
        'the mass of a hydrogen-1 atom',
        'one-sixteenth of the mass of an oxygen-16 atom',
        'the mass of a neutron',
      ],
      e: tex`The present scale fixes the mass of one $^{12}\mathrm{C}$ atom at exactly 12 amu, so 1 amu is $\frac{1}{12}$ of the mass of a carbon-12 atom.`,
    },
    {
      id: 'ethane-oxygen-ratio', d: 1, t: ['stoichiometry'],
      q: tex`According to $\ce{2C2H6 + 7O2 -> 4CO2 + 6H2O}$, the number of moles of $\ce{O2}$ needed to burn one mole of $\ce{C2H6}$ completely is:`,
      a: tex`$3.5\,\mathrm{mol}$`,
      x: [tex`$7\,\mathrm{mol}$`, tex`$2\,\mathrm{mol}$`, tex`$3\,\mathrm{mol}$`],
      e: tex`2 mol of $\ce{C2H6}$ need 7 mol of $\ce{O2}$, so 1 mol needs $\frac{7}{2} = 3.5\,\mathrm{mol}$.`,
    },
    {
      id: 'charge-on-mole-of-electrons', d: 2, t: ['Avogadro number', 'moles'],
      q: 'The total charge carried by one mole of electrons is approximately:',
      a: tex`$9.65 \times 10^{4}\,\mathrm{C}$`,
      x: [tex`$1.6 \times 10^{-19}\,\mathrm{C}$`, tex`$6.02 \times 10^{23}\,\mathrm{C}$`, tex`$3.76 \times 10^{42}\,\mathrm{C}$`],
      e: tex`$Q = N_A e = (6.022 \times 10^{23}\,\mathrm{mol^{-1}})(1.602 \times 10^{-19}\,\mathrm{C}) \approx 9.65 \times 10^{4}\,\mathrm{C}$, i.e. one faraday ($96500\,\mathrm{C}$). $1.6 \times 10^{-19}\,\mathrm{C}$ is the charge of a single electron.`,
    },
    {
      id: 'molar-volume-stp', d: 1, t: ['moles'],
      q: 'At STP, one mole of an ideal gas occupies a volume of:',
      a: tex`$22.414\,\mathrm{dm^3}$`,
      x: [tex`$22.414\,\mathrm{cm^3}$`, tex`$11.2\,\mathrm{dm^3}$`, tex`$2.24\,\mathrm{dm^3}$`],
      e: tex`The molar volume of an ideal gas at $273\,\mathrm{K}$ and $1\,\mathrm{atm}$ is $22.414\,\mathrm{dm^3}$; $11.2\,\mathrm{dm^3}$ is half a mole.`,
    },
    {
      id: 'mass-of-one-carbon-atom', d: 2, t: ['Avogadro number', 'moles'],
      q: tex`The mass of a single $^{12}\mathrm{C}$ atom is approximately ($N_A = 6.02 \times 10^{23}\,\mathrm{mol^{-1}}$):`,
      a: tex`$1.99 \times 10^{-23}\,\mathrm{g}$`,
      x: [tex`$1.66 \times 10^{-24}\,\mathrm{g}$`, tex`$7.22 \times 10^{24}\,\mathrm{g}$`, tex`$1.99 \times 10^{-26}\,\mathrm{g}$`],
      e: tex`Mass of one atom $= \frac{M}{N_A} = \frac{12}{6.02 \times 10^{23}} = 1.99 \times 10^{-23}\,\mathrm{g}$. $1.66 \times 10^{-24}\,\mathrm{g}$ is 1 amu, and $7.22 \times 10^{24}$ comes from multiplying instead of dividing.`,
    },
  ]),
]);
