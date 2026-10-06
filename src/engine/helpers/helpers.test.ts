import { createRng } from '../rng';
import {
  coefTex,
  electronConfig,
  exactTrig,
  frac,
  Fraction,
  linearFactor,
  molarMass,
  nCr,
  normalizeOption,
  nPr,
  num,
  numericOptions,
  parseFormula,
  pickDistractors,
  polyTex,
  q$,
  qty,
  radianTex,
  round,
  sci,
  signedSum,
  simplifySurd,
  statementQuestion,
  surdTex,
  trackRounding,
  U,
  variance,
} from './index';

describe('number formatting', () => {
  it.each([
    [5, '5'],
    [-12, '-12'],
    [0.5, '0.5'],
    [1 / 3, '0.333'],
    [2 / 3, '0.667'],
    [12.345, '12.3'],
    [1234.56, '1235'],
    [0.1 + 0.2, '0.3'],
    [-0.0001, '-1 \\times 10^{-4}'],
    [6.02e23, '6.02 \\times 10^{23}'],
    [0, '0'],
  ])('num(%p) -> %p', (value, expected) => {
    expect(num(value)).toBe(expected);
  });

  it('supports fixed decimals', () => {
    expect(num(2.5, { dp: 2 })).toBe('2.5');
    expect(num(2.5, { dp: 2, keepZeros: true })).toBe('2.50');
    expect(num(-0.001, { dp: 1 })).toBe('0');
  });

  it('formats scientific notation', () => {
    expect(sci(0.00032)).toBe('3.2 \\times 10^{-4}');
    expect(sci(9.999e5, 3)).toBe('1 \\times 10^{6}');
    expect(sci(4.5)).toBe('4.5');
  });

  it('formats quantities', () => {
    expect(qty(12.5, U.mps)).toBe('12.5\\,\\mathrm{m\\,s^{-1}}');
    expect(qty(30, U.deg)).toBe('30^{\\circ}');
    expect(q$(2, U.N)).toBe('$2\\,\\mathrm{N}$');
  });

  it('throws on non-finite numbers', () => {
    expect(() => num(NaN)).toThrow();
    expect(() => num(Infinity)).toThrow();
  });

  it('records values it displays rounded while tracking', () => {
    const { result, rounded } = trackRounding(() => [
      num(12.75),
      num(12.5),
      num(7),
      num(1.125, { dp: 2 }),
      sci(0.00032),
      sci(1 / 300000),
    ]);
    expect(result).toEqual([
      '12.8',
      '12.5',
      '7',
      '1.13',
      '3.2 \\times 10^{-4}',
      '3.33 \\times 10^{-6}',
    ]);
    expect(rounded.map((r) => r.shown)).toEqual(['12.8', '1.13', '3.33 \\times 10^{-6}']);
    expect(rounded[0]!.exact).toBe(12.75);
    // nothing is recorded outside trackRounding
    expect(trackRounding(() => 0).rounded).toEqual([]);
  });
});

describe('Fraction', () => {
  it('normalises and does arithmetic exactly', () => {
    expect(frac(2, -4).toString()).toBe('-1/2');
    expect(frac(1, 3).add(frac(1, 6)).toString()).toBe('1/2');
    expect(frac(3, 4).mul(frac(2, 3)).toTex()).toBe('\\frac{1}{2}');
    expect(frac(-3, 4).toTex()).toBe('-\\frac{3}{4}');
    expect(frac(2, 3).pow(-2).toString()).toBe('9/4');
    expect(frac(6, 3).isInteger()).toBe(true);
    expect(Fraction.of(0.125).toString()).toBe('1/8');
    expect(frac(0, 5).toString()).toBe('0');
    expect(() => frac(1, 0)).toThrow();
  });
});

describe('surds and polynomials', () => {
  it('simplifies surds', () => {
    expect(simplifySurd(1, 12)).toEqual({ c: 2, r: 3 });
    expect(surdTex(1, 12)).toBe('2\\sqrt{3}');
    expect(surdTex(1, 16)).toBe('4');
    expect(surdTex(-1, 2)).toBe('-\\sqrt{2}');
  });

  it('builds clean expressions', () => {
    expect(polyTex([3, 0, -2, 1])).toBe('3x^{3} - 2x + 1');
    expect(polyTex([1, -1, 0])).toBe('x^{2} - x');
    expect(polyTex([0, 0])).toBe('0');
    expect(
      signedSum([
        [-1, 'x'],
        [frac(1, 2), 'y'],
        [-5, ''],
      ]),
    ).toBe('-x + \\frac{1}{2}y - 5');
    expect(coefTex(1, 'x')).toBe('x');
    expect(linearFactor(3)).toBe('(x - 3)');
    expect(linearFactor(-2, 't')).toBe('(t + 2)');
  });
});

describe('combinatorics and stats', () => {
  it('computes nCr/nPr', () => {
    expect(nCr(10, 3)).toBe(120);
    expect(nCr(5, 7)).toBe(0);
    expect(nPr(5, 2)).toBe(20);
  });

  it('rounds without binary noise', () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(-2.5)).toBe(-3);
  });

  it('computes population variance', () => {
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4);
  });
});

describe('trigonometry', () => {
  it('returns exact values with correct signs', () => {
    expect(exactTrig('sin', 150)?.tex).toBe('\\frac{1}{2}');
    expect(exactTrig('cos', 120)?.tex).toBe('-\\frac{1}{2}');
    expect(exactTrig('tan', 225)?.tex).toBe('1');
    expect(exactTrig('tan', 90)).toBeNull();
    expect(exactTrig('sec', 60)?.tex).toBe('2');
    expect(exactTrig('cot', 90)?.tex).toBe('0');
    expect(exactTrig('sin', 300)?.value).toBeCloseTo(-Math.sqrt(3) / 2);
    expect(() => exactTrig('sin', 20)).toThrow();
  });

  it('agrees numerically with Math for all standard angles', () => {
    for (const deg of [0, 30, 45, 60, 120, 135, 150, 180, 210, 225, 240, 300, 315, 330]) {
      const rad = (deg * Math.PI) / 180;
      expect(exactTrig('sin', deg)?.value).toBeCloseTo(Math.sin(rad), 10);
      expect(exactTrig('cos', deg)?.value).toBeCloseTo(Math.cos(rad), 10);
    }
  });

  it('formats radians', () => {
    expect(radianTex(150)).toBe('\\frac{5\\pi}{6}');
    expect(radianTex(180)).toBe('\\pi');
    expect(radianTex(-90)).toBe('-\\frac{\\pi}{2}');
  });
});

describe('chemistry data', () => {
  it('parses formulas and computes molar masses', () => {
    expect(Object.fromEntries(parseFormula('Ca(OH)2'))).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(molarMass('H2SO4')).toBe(98);
    expect(molarMass('CuSO4.5H2O')).toBe(249.5);
    expect(molarMass('K4[Fe(CN)6]')).toBe(368);
    expect(() => parseFormula('Xx2')).toThrow();
  });

  it('writes electron configurations', () => {
    expect(electronConfig(8)).toBe('1s^2\\,2s^2\\,2p^4');
    expect(electronConfig(26)).toBe('1s^2\\,2s^2\\,2p^6\\,3s^2\\,3p^6\\,3d^6\\,4s^2');
    expect(electronConfig(24)).toContain('3d^5\\,4s^1');
  });
});

describe('distractor helpers', () => {
  it('normalizeOption ignores formatting differences', () => {
    expect(normalizeOption('$0.5$')).toBe(normalizeOption('0.5'));
    expect(normalizeOption('$12\\,\\mathrm{N}$')).toBe(normalizeOption('$12 N$'));
  });

  it('numericOptions always yields three distinct formatted distractors', () => {
    for (let i = 0; i < 300; i++) {
      const r = createRng(`num-${i}`);
      const correct = r.pick([0, 1, 2, 7.5, 0.25, 100, -3]);
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [correct, correct * 2, NaN],
        format: (v) => `$${num(v)}$`,
      });
      const all = [answer, ...distractors].map(normalizeOption);
      expect(new Set(all).size).toBe(4);
    }
  });

  it('pickDistractors skips duplicates and throws when too few', () => {
    expect(pickDistractors('a', ['a', 'b', 'b', 'c', 'd'])).toEqual(['b', 'c', 'd']);
    expect(() => pickDistractors('a', ['a', 'b'])).toThrow();
  });

  it('statementQuestion draws varied combinations', () => {
    const stems = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const q = statementQuestion(createRng(i), {
        stem: 'Which is true?',
        negativeStem: 'Which is false?',
        truths: ['T1', 'T2', 'T3', 'T4'],
        falsehoods: ['F1', 'F2', 'F3', 'F4'],
        explain: (a) => `Because ${a}`,
      });
      stems.add(q.stem);
      expect(q.distractors).toHaveLength(3);
      expect(q.distractors).not.toContain(q.answer);
    }
    expect(stems.size).toBe(2);
  });
});
