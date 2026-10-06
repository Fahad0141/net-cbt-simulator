/** Small exact/approximate arithmetic utilities for template authors. */

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b);
}

export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`factorial: bad n ${n}`);
  if (n > 20) throw new RangeError('factorial: n > 20 exceeds safe integer range');
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

/** n choose r (exact for results below 2^53). */
export function nCr(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r)) throw new RangeError('nCr: integers only');
  if (r < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let out = 1;
  for (let i = 1; i <= r; i++) out = (out * (n - r + i)) / i;
  return Math.round(out);
}

/** Number of r-permutations of n distinct objects. */
export function nPr(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r)) throw new RangeError('nPr: integers only');
  if (r < 0 || r > n) return 0;
  let out = 1;
  for (let i = 0; i < r; i++) out *= n - i;
  return out;
}

export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

/** Prime factorisation as a map prime -> exponent. */
export function primeFactors(n: number): Map<number, number> {
  const out = new Map<number, number>();
  let rest = Math.abs(n);
  for (let p = 2; p * p <= rest; p++) {
    while (rest % p === 0) {
      out.set(p, (out.get(p) ?? 0) + 1);
      rest /= p;
    }
  }
  if (rest > 1) out.set(rest, (out.get(rest) ?? 0) + 1);
  return out;
}

export function divisors(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= Math.abs(n); i++) if (n % i === 0) out.push(i);
  return out;
}

/** Rounds half away from zero to `dp` decimal places without binary noise. */
export function round(value: number, dp = 0): number {
  const factor = 10 ** dp;
  const shifted = Math.abs(value) * factor;
  const rounded = Math.round(Number(shifted.toPrecision(15))) / factor;
  return Math.sign(value) * rounded;
}

/** Rounds to `sig` significant figures. */
export function roundSig(value: number, sig = 3): number {
  if (value === 0 || !Number.isFinite(value)) return value;
  return Number(value.toPrecision(sig));
}

export function approxEqual(a: number, b: number, relTol = 1e-9, absTol = 1e-12): boolean {
  return Math.abs(a - b) <= Math.max(absTol, relTol * Math.max(Math.abs(a), Math.abs(b)));
}

/** Integers from `start` to `end` inclusive. */
export function range(start: number, end: number, step = 1): number[] {
  const out: number[] = [];
  for (let v = start; step > 0 ? v <= end : v >= end; v += step) out.push(v);
  return out;
}

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
export const product = (xs: readonly number[]): number => xs.reduce((a, b) => a * b, 1);
export const mean = (xs: readonly number[]): number => sum(xs) / xs.length;

export function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/** Population variance (divide by n), the convention used in FSc statistics. */
export function variance(xs: readonly number[]): number {
  const m = mean(xs);
  return mean(xs.map((x) => (x - m) ** 2));
}

export const stdDev = (xs: readonly number[]): number => Math.sqrt(variance(xs));

/** Evaluates a polynomial given coefficients from the highest power down. */
export function polyEval(coeffs: readonly number[], x: number): number {
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

/** Derivative coefficients (highest power first). */
export function polyDerivative(coeffs: readonly number[]): number[] {
  const n = coeffs.length - 1;
  if (n <= 0) return [0];
  return coeffs.slice(0, -1).map((c, i) => c * (n - i));
}

/** Numerical definite integral (composite Simpson, n even). Handy for self-checks. */
export function integrate(f: (x: number) => number, a: number, b: number, n = 2000): number {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/** Numerical derivative (central difference). Handy for self-checks. */
export function differentiate(f: (x: number) => number, x: number, h = 1e-5): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** Converts degrees to radians. */
export const toRadians = (deg: number): number => (deg * Math.PI) / 180;
/** Converts radians to degrees. */
export const toDegrees = (rad: number): number => (rad * 180) / Math.PI;
