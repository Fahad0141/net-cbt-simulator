import {
  decodeSpec,
  encodeSpec,
  optionsFromQuery,
  optionsToQuery,
  resolvePaperCode,
} from './papers';

describe('custom spec encoding', () => {
  it('round-trips, including non-ASCII titles', () => {
    const spec = {
      title: 'Weak chapters — رِوِژن',
      durationMinutes: 30,
      sections: [{ subject: 'physics' as const, count: 20, chapters: ['waves', 'oscillations'] }],
    };
    expect(decodeSpec(encodeSpec(spec))).toEqual(spec);
  });

  it('rejects garbage and unknown subjects', () => {
    expect(decodeSpec('not-base64!!')).toBeNull();
    expect(decodeSpec(null)).toBeNull();
    const bad = encodeSpec({
      durationMinutes: 10,
      sections: [{ subject: 'astrology' as never, count: 5 }],
    });
    expect(decodeSpec(bad)).toBeNull();
  });

  it('clamps counts and duration', () => {
    const spec = decodeSpec(
      encodeSpec({ durationMinutes: 9999, sections: [{ subject: 'mathematics', count: 999 }] }),
    );
    expect(spec?.durationMinutes).toBe(300);
    expect(spec?.sections[0]?.count).toBe(200);
  });
});

describe('generation options in the URL', () => {
  it('omits defaults and round-trips overrides', () => {
    expect(optionsToQuery({}).toString()).toBe('');
    const q = optionsToQuery({
      dynamicShare: 0.8,
      difficultyMix: [0.2, 0.4, 0.4],
      pastPaperBoost: 2,
    });
    const back = optionsFromQuery(q);
    expect(back.dynamicShare).toBeCloseTo(0.8);
    expect(back.difficultyMix?.map((v) => Math.round(v * 100))).toEqual([20, 40, 40]);
    expect(back.pastPaperBoost).toBe(2);
  });
});

describe('paper codes', () => {
  it('resolves standard exam codes and rejects custom ones', () => {
    expect(resolvePaperCode('eng-k7q2-9xm4')).toEqual({
      examType: 'engineering',
      seed: 'K7Q29XM4',
      code: 'ENG-K7Q2-9XM4',
    });
    expect(resolvePaperCode('CUS-K7Q2-9XM4')).toBeNull();
    expect(resolvePaperCode('nonsense')).toBeNull();
  });
});
