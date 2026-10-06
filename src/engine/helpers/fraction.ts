import { gcd } from './math';

function assertSafe(value: number, what: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Fraction: ${what} (${value}) is not a safe integer`);
  }
}

/**
 * Exact rational number with a normalised representation
 * (denominator > 0, numerator and denominator coprime).
 */
export class Fraction {
  readonly n: number;
  readonly d: number;

  constructor(numerator: number, denominator = 1) {
    assertSafe(numerator, 'numerator');
    assertSafe(denominator, 'denominator');
    if (denominator === 0) throw new RangeError('Fraction: zero denominator');
    const g = gcd(numerator, denominator) || 1;
    const sign = denominator < 0 ? -1 : 1;
    // `+ 0` turns -0 into 0.
    this.n = (sign * numerator) / g + 0;
    this.d = Math.abs(denominator) / g;
  }

  static of(value: number | Fraction): Fraction {
    if (value instanceof Fraction) return value;
    if (Number.isInteger(value)) return new Fraction(value, 1);
    // Recover exact fractions from terminating decimals such as 0.25 or 1.125.
    for (let d = 10; d <= 1e6; d *= 10) {
      const n = Math.round(value * d);
      if (Math.abs(n / d - value) < 1e-12) return new Fraction(n, d);
    }
    throw new RangeError(`Fraction.of: ${value} is not a terminating decimal`);
  }

  add(other: number | Fraction): Fraction {
    const o = Fraction.of(other);
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(other: number | Fraction): Fraction {
    const o = Fraction.of(other);
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(other: number | Fraction): Fraction {
    const o = Fraction.of(other);
    return new Fraction(this.n * o.n, this.d * o.d);
  }

  div(other: number | Fraction): Fraction {
    const o = Fraction.of(other);
    if (o.n === 0) throw new RangeError('Fraction: division by zero');
    return new Fraction(this.n * o.d, this.d * o.n);
  }

  neg(): Fraction {
    return new Fraction(-this.n, this.d);
  }

  inv(): Fraction {
    return new Fraction(this.d, this.n);
  }

  abs(): Fraction {
    return new Fraction(Math.abs(this.n), this.d);
  }

  pow(exponent: number): Fraction {
    if (!Number.isInteger(exponent)) throw new RangeError('Fraction.pow: integer exponents only');
    const base = exponent < 0 ? this.inv() : this;
    const e = Math.abs(exponent);
    return new Fraction(base.n ** e, base.d ** e);
  }

  equals(other: number | Fraction): boolean {
    const o = Fraction.of(other);
    return this.n === o.n && this.d === o.d;
  }

  compare(other: number | Fraction): number {
    const o = Fraction.of(other);
    return Math.sign(this.n * o.d - o.n * this.d);
  }

  isInteger(): boolean {
    return this.d === 1;
  }

  isZero(): boolean {
    return this.n === 0;
  }

  sign(): number {
    return Math.sign(this.n);
  }

  toNumber(): number {
    return this.n / this.d;
  }

  valueOf(): number {
    return this.toNumber();
  }

  /** `3/4`, `-1/2`, `5` */
  toString(): string {
    return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`;
  }

  /** LaTeX: `\frac{3}{4}`, `-\frac{1}{2}`, `5` (no surrounding `$`). */
  toTex(): string {
    if (this.d === 1) return String(this.n);
    const body = `\\frac{${Math.abs(this.n)}}{${this.d}}`;
    return this.n < 0 ? `-${body}` : body;
  }

  /** Inline-friendly LaTeX: `3/4` style using \tfrac. */
  toTfrac(): string {
    if (this.d === 1) return String(this.n);
    const body = `\\tfrac{${Math.abs(this.n)}}{${this.d}}`;
    return this.n < 0 ? `-${body}` : body;
  }
}

/** Shorthand for `new Fraction(n, d)`. */
export const frac = (numerator: number, denominator = 1): Fraction =>
  new Fraction(numerator, denominator);

/** Simplifies k * sqrt(r) to the form c * sqrt(s) with s square-free. */
export function simplifySurd(coefficient: number, radicand: number): { c: number; r: number } {
  if (radicand < 0) throw new RangeError('simplifySurd: negative radicand');
  if (radicand === 0) return { c: 0, r: 1 };
  let c = coefficient;
  let r = radicand;
  for (let f = 2; f * f <= r; f++) {
    while (r % (f * f) === 0) {
      r /= f * f;
      c *= f;
    }
  }
  return { c, r };
}

/** LaTeX for c * sqrt(r) after simplification: `2\sqrt{3}`, `\sqrt{5}`, `-\sqrt{2}`, `6`. */
export function surdTex(coefficient: number, radicand: number): string {
  const { c, r } = simplifySurd(coefficient, radicand);
  if (c === 0) return '0';
  if (r === 1) return String(c);
  const coef = c === 1 ? '' : c === -1 ? '-' : String(c);
  return `${coef}\\sqrt{${r}}`;
}
