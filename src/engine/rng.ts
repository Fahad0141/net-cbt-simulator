/**
 * Deterministic, seedable pseudo-random number generator.
 *
 * A string seed is hashed with cyrb128 into a 128-bit state that drives the
 * sfc32 ("Small Fast Counter") generator. Both only use 32-bit integer
 * arithmetic (`Math.imul`, `|0`, `>>>`), so the sequence is bit-for-bit
 * identical on every JavaScript engine. That property is what makes a paper
 * code reproducible: the same code always regenerates the same paper.
 */

export interface Rng {
  /** The seed string this generator was created from. */
  readonly seed: string;
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (both inclusive). */
  int(min: number, max: number): number;
  /** Uniform integer in [min, max] that is not in `exclude`. */
  intExcept(min: number, max: number, exclude: readonly number[]): number;
  /** Uniform non-zero integer in [min, max]. */
  nonZero(min: number, max: number): number;
  /** Uniform multiple of `step` in [min, max], e.g. multiple(10, 90, 5) -> 10, 15, ..., 90. */
  multiple(min: number, max: number, step: number): number;
  /** Uniform real in [min, max] rounded to `decimals` places (default 1). */
  real(min: number, max: number, decimals?: number): number;
  /** One element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** `count` distinct elements (by position) in random order. */
  sample<T>(items: readonly T[], count: number): T[];
  /** A shuffled copy (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** One element chosen with probability proportional to its weight. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** `true` with the given probability. */
  chance(probability: number): boolean;
  /** +1 or -1 with equal probability. */
  sign(): 1 | -1;
  /**
   * An independent child generator. Forks are keyed by label, so a fork's
   * stream does not depend on how many numbers the parent has consumed.
   */
  fork(label: string): Rng;
}

/** cyrb128: fast, well-distributed 128-bit string hash (public domain, bryc). */
export function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** sfc32 generator returning floats in [0, 1). */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function assertInt(name: string, value: number): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`rng.${name}: expected an integer, got ${value}`);
  }
}

export function createRng(seed: string | number): Rng {
  const seedText = String(seed);
  const [a, b, c, d] = cyrb128(seedText);
  const nextFloat = sfc32(a, b, c, d);
  // Discard the first outputs so closely related seeds diverge immediately.
  for (let i = 0; i < 12; i++) nextFloat();

  const rng: Rng = {
    seed: seedText,
    next: nextFloat,

    int(min, max) {
      assertInt('int(min)', min);
      assertInt('int(max)', max);
      if (max < min) throw new RangeError(`rng.int: max (${max}) < min (${min})`);
      return min + Math.floor(nextFloat() * (max - min + 1));
    },

    intExcept(min, max, exclude) {
      const allowed: number[] = [];
      for (let v = min; v <= max; v++) if (!exclude.includes(v)) allowed.push(v);
      if (allowed.length === 0) {
        throw new RangeError(`rng.intExcept: no integer in [${min}, ${max}] outside exclusions`);
      }
      return rng.pick(allowed);
    },

    nonZero(min, max) {
      return rng.intExcept(min, max, [0]);
    },

    multiple(min, max, step) {
      if (step <= 0) throw new RangeError('rng.multiple: step must be positive');
      const lo = Math.ceil(min / step);
      const hi = Math.floor(max / step);
      if (hi < lo) throw new RangeError(`rng.multiple: no multiple of ${step} in [${min}, ${max}]`);
      // Round away binary floating-point noise (e.g. 0.1 * 3).
      return Number((rng.int(lo, hi) * step).toPrecision(12));
    },

    real(min, max, decimals = 1) {
      if (max < min) throw new RangeError(`rng.real: max (${max}) < min (${min})`);
      const factor = 10 ** decimals;
      const lo = Math.ceil(min * factor);
      const hi = Math.floor(max * factor);
      return rng.int(lo, hi) / factor;
    },

    pick(items) {
      if (items.length === 0) throw new RangeError('rng.pick: empty array');
      return items[Math.floor(nextFloat() * items.length)] as (typeof items)[number];
    },

    sample(items, count) {
      if (count > items.length) {
        throw new RangeError(`rng.sample: cannot take ${count} from ${items.length} items`);
      }
      return rng.shuffle(items).slice(0, count);
    },

    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(nextFloat() * (i + 1));
        const tmp = out[i] as (typeof out)[number];
        out[i] = out[j] as (typeof out)[number];
        out[j] = tmp;
      }
      return out;
    },

    weighted(items, weights) {
      if (items.length === 0 || items.length !== weights.length) {
        throw new RangeError('rng.weighted: items and weights must be non-empty and equal length');
      }
      let total = 0;
      for (const w of weights) {
        if (!(w >= 0) || !Number.isFinite(w)) throw new RangeError(`rng.weighted: bad weight ${w}`);
        total += w;
      }
      if (total <= 0) return rng.pick(items);
      let roll = nextFloat() * total;
      for (let i = 0; i < items.length; i++) {
        roll -= weights[i] as number;
        if (roll < 0) return items[i] as (typeof items)[number];
      }
      return items[items.length - 1] as (typeof items)[number];
    },

    chance(probability) {
      return nextFloat() < probability;
    },

    sign() {
      return nextFloat() < 0.5 ? -1 : 1;
    },

    fork(label) {
      return createRng(`${seedText}␟${label}`);
    },
  };
  return rng;
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Creates a fresh human-friendly seed (Crockford base32, no I/L/O/U).
 * Uses `crypto.getRandomValues` when available.
 */
export function randomSeed(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (const byte of bytes) out += CROCKFORD[byte % 32];
  return out;
}

/** Normalises user-typed seeds: uppercase, Crockford aliases (O->0, I/L->1), strip separators. */
export function normalizeSeed(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s_-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/U/g, 'V');
}

export function isValidSeed(seed: string): boolean {
  return seed.length >= 4 && seed.length <= 16 && [...seed].every((ch) => CROCKFORD.includes(ch));
}
