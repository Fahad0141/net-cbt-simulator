/**
 * Physical constants and chemical data with the rounded values used in Pakistani
 * FSc textbooks (and therefore in NET). When a question depends on a constant,
 * state the value in the stem ("Take g = 9.8 m s^-2") so the paper is self-contained.
 */
export const PHYS = {
  /** Acceleration due to gravity, m s^-2 */
  g: 9.8,
  /** Speed of light, m s^-1 */
  c: 3e8,
  /** Planck constant, J s */
  h: 6.63e-34,
  /** Elementary charge, C */
  e: 1.6e-19,
  /** Electron mass, kg */
  me: 9.11e-31,
  /** Proton mass, kg */
  mp: 1.67e-27,
  /** Neutron mass, kg */
  mn: 1.675e-27,
  /** Atomic mass unit, kg */
  u: 1.66e-27,
  /** Coulomb constant 1/(4 pi eps0), N m^2 C^-2 */
  k: 9e9,
  /** Permittivity of free space, C^2 N^-1 m^-2 */
  eps0: 8.85e-12,
  /** Permeability of free space, T m A^-1 */
  mu0: 4 * Math.PI * 1e-7,
  /** Gravitational constant, N m^2 kg^-2 */
  G: 6.67e-11,
  /** Avogadro constant, mol^-1 */
  NA: 6.02e23,
  /** Molar gas constant, J mol^-1 K^-1 */
  R: 8.314,
  /** Boltzmann constant, J K^-1 */
  kB: 1.38e-23,
  /** Stefan-Boltzmann constant, W m^-2 K^-4 */
  sigma: 5.67e-8,
  /** Rydberg constant, m^-1 */
  RH: 1.097e7,
  /** Standard atmospheric pressure, Pa */
  atm: 1.013e5,
  /** Density of water, kg m^-3 */
  rhoWater: 1000,
  /** Speed of sound in air at about 20 C, m s^-1 */
  vSound: 340,
  /** 1 eV in joules */
  eV: 1.6e-19,
  /** Mass of the Earth, kg */
  earthMass: 6e24,
  /** Radius of the Earth, m */
  earthRadius: 6.4e6,
} as const;

export interface ElementData {
  symbol: string;
  name: string;
  z: number;
  /** Rounded relative atomic mass as used in FSc problems. */
  mass: number;
  group: number | null;
  period: number;
  block: 's' | 'p' | 'd' | 'f';
  /** Pauling electronegativity where commonly quoted. */
  en?: number;
}

const RAW: Array<
  [string, string, number, number, number | null, number, ElementData['block'], number?]
> = [
  ['H', 'Hydrogen', 1, 1, 1, 1, 's', 2.1],
  ['He', 'Helium', 2, 4, 18, 1, 's'],
  ['Li', 'Lithium', 3, 7, 1, 2, 's', 1.0],
  ['Be', 'Beryllium', 4, 9, 2, 2, 's', 1.5],
  ['B', 'Boron', 5, 11, 13, 2, 'p', 2.0],
  ['C', 'Carbon', 6, 12, 14, 2, 'p', 2.5],
  ['N', 'Nitrogen', 7, 14, 15, 2, 'p', 3.0],
  ['O', 'Oxygen', 8, 16, 16, 2, 'p', 3.5],
  ['F', 'Fluorine', 9, 19, 17, 2, 'p', 4.0],
  ['Ne', 'Neon', 10, 20, 18, 2, 'p'],
  ['Na', 'Sodium', 11, 23, 1, 3, 's', 0.9],
  ['Mg', 'Magnesium', 12, 24, 2, 3, 's', 1.2],
  ['Al', 'Aluminium', 13, 27, 13, 3, 'p', 1.5],
  ['Si', 'Silicon', 14, 28, 14, 3, 'p', 1.8],
  ['P', 'Phosphorus', 15, 31, 15, 3, 'p', 2.1],
  ['S', 'Sulphur', 16, 32, 16, 3, 'p', 2.5],
  ['Cl', 'Chlorine', 17, 35.5, 17, 3, 'p', 3.0],
  ['Ar', 'Argon', 18, 40, 18, 3, 'p'],
  ['K', 'Potassium', 19, 39, 1, 4, 's', 0.8],
  ['Ca', 'Calcium', 20, 40, 2, 4, 's', 1.0],
  ['Sc', 'Scandium', 21, 45, 3, 4, 'd', 1.3],
  ['Ti', 'Titanium', 22, 48, 4, 4, 'd', 1.5],
  ['V', 'Vanadium', 23, 51, 5, 4, 'd', 1.6],
  ['Cr', 'Chromium', 24, 52, 6, 4, 'd', 1.6],
  ['Mn', 'Manganese', 25, 55, 7, 4, 'd', 1.5],
  ['Fe', 'Iron', 26, 56, 8, 4, 'd', 1.8],
  ['Co', 'Cobalt', 27, 59, 9, 4, 'd', 1.8],
  ['Ni', 'Nickel', 28, 59, 10, 4, 'd', 1.8],
  ['Cu', 'Copper', 29, 63.5, 11, 4, 'd', 1.9],
  ['Zn', 'Zinc', 30, 65, 12, 4, 'd', 1.6],
  ['Ga', 'Gallium', 31, 70, 13, 4, 'p', 1.6],
  ['Ge', 'Germanium', 32, 72.6, 14, 4, 'p', 1.8],
  ['As', 'Arsenic', 33, 75, 15, 4, 'p', 2.0],
  ['Se', 'Selenium', 34, 79, 16, 4, 'p', 2.4],
  ['Br', 'Bromine', 35, 80, 17, 4, 'p', 2.8],
  ['Kr', 'Krypton', 36, 84, 18, 4, 'p'],
  ['Rb', 'Rubidium', 37, 85.5, 1, 5, 's', 0.8],
  ['Sr', 'Strontium', 38, 87.6, 2, 5, 's', 1.0],
  ['Ag', 'Silver', 47, 108, 11, 5, 'd', 1.9],
  ['Sn', 'Tin', 50, 119, 14, 5, 'p', 1.8],
  ['I', 'Iodine', 53, 127, 17, 5, 'p', 2.5],
  ['Xe', 'Xenon', 54, 131, 18, 5, 'p'],
  ['Cs', 'Caesium', 55, 133, 1, 6, 's', 0.7],
  ['Ba', 'Barium', 56, 137, 2, 6, 's', 0.9],
  ['Pt', 'Platinum', 78, 195, 10, 6, 'd', 2.2],
  ['Au', 'Gold', 79, 197, 11, 6, 'd', 2.4],
  ['Hg', 'Mercury', 80, 200.6, 12, 6, 'd', 1.9],
  ['Pb', 'Lead', 82, 207, 14, 6, 'p', 1.8],
  ['Ra', 'Radium', 88, 226, 2, 7, 's', 0.9],
  ['U', 'Uranium', 92, 238, null, 7, 'f', 1.4],
];

export const ELEMENTS: Readonly<Record<string, ElementData>> = Object.fromEntries(
  RAW.map(([symbol, name, z, mass, group, period, block, en]) => [
    symbol,
    { symbol, name, z, mass, group, period, block, ...(en === undefined ? {} : { en }) },
  ]),
);

export const elementByZ = (z: number): ElementData | undefined =>
  Object.values(ELEMENTS).find((e) => e.z === z);

/**
 * Parses a chemical formula into element counts.
 * Supports nesting with () and [], and hydrates with `.` or `·`: `CuSO4.5H2O`, `K4[Fe(CN)6]`.
 */
export function parseFormula(formula: string): Map<string, number> {
  const total = new Map<string, number>();
  for (const [index, part] of formula.split(/[.·]/).entries()) {
    const m = /^(\d+)(.*)$/.exec(part);
    const multiplier = index > 0 && m ? Number(m[1]) : 1;
    const body = index > 0 && m ? (m[2] as string) : part;
    for (const [el, n] of parseGroup(body)) total.set(el, (total.get(el) ?? 0) + n * multiplier);
  }
  return total;
}

function parseGroup(text: string): Map<string, number> {
  const stack: Map<string, number>[] = [new Map()];
  let i = 0;
  const readCount = (): number => {
    const m = /^\d+/.exec(text.slice(i));
    if (!m) return 1;
    i += m[0].length;
    return Number(m[0]);
  };
  while (i < text.length) {
    const ch = text[i] as string;
    if (ch === '(' || ch === '[') {
      stack.push(new Map());
      i++;
    } else if (ch === ')' || ch === ']') {
      i++;
      const count = readCount();
      const group = stack.pop();
      const parent = stack[stack.length - 1];
      if (!group || !parent) throw new Error(`parseFormula: unbalanced brackets in ${text}`);
      for (const [el, n] of group) parent.set(el, (parent.get(el) ?? 0) + n * count);
    } else {
      const m = /^[A-Z][a-z]?/.exec(text.slice(i));
      if (!m) throw new Error(`parseFormula: unexpected "${ch}" in ${text}`);
      if (!ELEMENTS[m[0]]) throw new Error(`parseFormula: unknown element ${m[0]}`);
      i += m[0].length;
      const count = readCount();
      const top = stack[stack.length - 1] as Map<string, number>;
      top.set(m[0], (top.get(m[0]) ?? 0) + count);
    }
  }
  if (stack.length !== 1) throw new Error(`parseFormula: unbalanced brackets in ${text}`);
  return stack[0] as Map<string, number>;
}

/** Molar mass in g/mol using FSc-rounded atomic masses: molarMass('H2SO4') === 98. */
export function molarMass(formula: string): number {
  let mass = 0;
  for (const [el, n] of parseFormula(formula)) mass += (ELEMENTS[el] as ElementData).mass * n;
  return Number(mass.toFixed(2));
}

/** mhchem LaTeX for a formula (render inside `$...$`): `\ce{H2SO4}`. */
export const ce = (formula: string): string => `\\ce{${formula}}`;

const ORBITALS = [
  '1s',
  '2s',
  '2p',
  '3s',
  '3p',
  '4s',
  '3d',
  '4p',
  '5s',
  '4d',
  '5p',
  '6s',
  '4f',
  '5d',
  '6p',
  '7s',
  '5f',
  '6d',
  '7p',
];
const CAPACITY: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 };
const EXCEPTIONS: Record<number, string> = {
  24: '1s^2\\,2s^2\\,2p^6\\,3s^2\\,3p^6\\,3d^5\\,4s^1',
  29: '1s^2\\,2s^2\\,2p^6\\,3s^2\\,3p^6\\,3d^{10}\\,4s^1',
};

/**
 * Ground-state electronic configuration as LaTeX (Aufbau order, with the Cr and Cu
 * exceptions). `electronConfig(8)` -> `1s^2\,2s^2\,2p^4`.
 */
export function electronConfig(z: number): string {
  if (EXCEPTIONS[z]) return EXCEPTIONS[z] as string;
  let remaining = z;
  const parts: string[] = [];
  for (const orbital of ORBITALS) {
    if (remaining <= 0) break;
    const cap = CAPACITY[orbital.slice(-1)] as number;
    const n = Math.min(cap, remaining);
    remaining -= n;
    parts.push(`${orbital}^${n >= 10 ? `{${n}}` : n}`);
  }
  // Present in shell order (3d before 4s) as FSc textbooks do.
  parts.sort((a, b) => {
    const [na, la] = [Number(a[0]), 'spdf'.indexOf(a[1] as string)];
    const [nb, lb] = [Number(b[0]), 'spdf'.indexOf(b[1] as string)];
    return na - nb || la - lb;
  });
  return parts.join('\\,');
}
