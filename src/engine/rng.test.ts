import { createRng, isValidSeed, normalizeSeed, randomSeed } from './rng';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng('ABC123');
    const b = createRng('ABC123');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces a known sequence (guards against accidental algorithm changes)', () => {
    const r = createRng('NET-2026');
    const values = Array.from({ length: 5 }, () => r.int(1, 1000));
    expect(values).toMatchInlineSnapshot(`
      [
        907,
        650,
        561,
        324,
        855,
      ]
    `);
  });

  it('differs for different seeds', () => {
    const a = Array.from({ length: 10 }, createRng('seed-a').next);
    const b = Array.from({ length: 10 }, createRng('seed-b').next);
    expect(a).not.toEqual(b);
  });

  it('keeps int() within bounds and hits every value', () => {
    const r = createRng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(-3, 3);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect(seen.size).toBe(7);
  });

  it('rejects bad int() arguments', () => {
    const r = createRng(1);
    expect(() => r.int(5, 1)).toThrow(RangeError);
    expect(() => r.int(0.5, 3)).toThrow(RangeError);
  });

  it('supports nonZero, intExcept and multiple', () => {
    const r = createRng('x');
    for (let i = 0; i < 500; i++) {
      expect(r.nonZero(-2, 2)).not.toBe(0);
      expect([1, 2, 4, 5]).toContain(r.intExcept(1, 5, [3]));
      expect(r.multiple(10, 50, 5) % 5).toBe(0);
    }
    const tenth = r.multiple(0.1, 0.5, 0.1);
    expect(Number(tenth.toFixed(1))).toBe(tenth);
  });

  it('real() respects decimals and range', () => {
    const r = createRng('real');
    for (let i = 0; i < 500; i++) {
      const v = r.real(1.5, 2.5, 2);
      expect(v).toBeGreaterThanOrEqual(1.5);
      expect(v).toBeLessThanOrEqual(2.5);
      expect(Math.round(v * 100) / 100).toBe(v);
    }
  });

  it('shuffle returns a permutation and sample returns distinct items', () => {
    const r = createRng('perm');
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = r.shuffle(items);
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const s = r.sample(items, 5);
    expect(new Set(s).size).toBe(5);
    expect(() => r.sample(items, 9)).toThrow();
  });

  it('weighted() never picks zero-weight items', () => {
    const r = createRng('w');
    for (let i = 0; i < 1000; i++) expect(r.weighted(['a', 'b', 'c'], [1, 0, 3])).not.toBe('b');
  });

  it('fork() is independent of parent consumption', () => {
    const a = createRng('parent');
    const b = createRng('parent');
    b.next();
    b.next();
    expect(a.fork('child').next()).toBe(b.fork('child').next());
    expect(a.fork('x').next()).not.toBe(a.fork('y').next());
  });

  it('is roughly uniform', () => {
    const r = createRng('uniform');
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) buckets[Math.floor(r.next() * 10)]++;
    for (const count of buckets) expect(count).toBeGreaterThan(1700);
  });
});

describe('seeds', () => {
  it('randomSeed produces valid Crockford seeds', () => {
    for (let i = 0; i < 50; i++) {
      const s = randomSeed();
      expect(s).toHaveLength(8);
      expect(isValidSeed(s)).toBe(true);
    }
  });

  it('normalizeSeed maps ambiguous characters', () => {
    expect(normalizeSeed('k7q2-9xm4')).toBe('K7Q29XM4');
    expect(normalizeSeed('o1il')).toBe('0111');
    expect(isValidSeed('ABC')).toBe(false);
    expect(isValidSeed('ABCU')).toBe(false);
  });
});
