import { apportion, assemblePaper, type Blueprint, formatPaperCode } from './assemble';
import { defineBank } from './authoring';
import { parsePaperCode } from './paperCode';
import type { QuestionTemplate } from './types';

describe('apportion', () => {
  it('sums exactly to the total', () => {
    for (const total of [0, 1, 7, 30, 100, 200]) {
      const parts = apportion(total, [3, 1.5, 0.2, 7, 0]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts[4]).toBe(0);
    }
  });

  it('is proportional', () => {
    expect(apportion(100, [50, 30, 20])).toEqual([50, 30, 20]);
    expect(apportion(10, [1, 1, 1])).toEqual([4, 3, 3]);
  });

  it('spreads evenly when all weights are zero', () => {
    expect(apportion(4, [0, 0])).toEqual([2, 2]);
  });
});

function makeBank(): QuestionTemplate[] {
  const chapterA = defineBank('mathematics', 'alpha', (b) => [
    ...[1, 2, 3].map((d) =>
      b.dynamic(`dyn-${d}`, d as 1 | 2 | 3, (r) => {
        const a = r.int(2, 50);
        return {
          stem: `Alpha ${d}: $${a} \\times 2$?`,
          answer: `$${a * 2}$`,
          distractors: [`$${a * 2 + 1}$`, `$${a * 2 + 2}$`, `$${a * 2 - 1}$`],
          explanation: `$${a} \\times 2 = ${a * 2}$`,
        };
      }),
    ),
    ...b.mcqs(
      Array.from({ length: 12 }, (_, i) => ({
        id: `fixed-${i}`,
        d: ((i % 3) + 1) as 1 | 2 | 3,
        q: `Alpha fixed question ${i}?`,
        a: `Right ${i}`,
        x: [`Wrong ${i}a`, `Wrong ${i}b`, `Wrong ${i}c`] as const,
        e: `Because ${i}.`,
        ...(i % 4 === 0 ? { o: 'past-paper' as const } : {}),
      })),
    ),
  ]);
  const chapterB = defineBank('mathematics', 'beta', (b) => [
    b.set('passage', 2, 3, (r) => {
      const n = r.int(1, 99);
      return {
        passage: `Passage number ${n}.`,
        questions: [1, 2, 3].map((k) => ({
          stem: `Q${k} about passage ${n}?`,
          answer: `Yes ${k}`,
          distractors: [`No ${k}`, `Maybe ${k}`, `Never ${k}`],
          explanation: `Explained ${k}.`,
        })),
      };
    }),
    ...b.mcqs(
      Array.from({ length: 6 }, (_, i) => ({
        id: `beta-${i}`,
        d: 2 as const,
        q: `Beta ${i}?`,
        a: `B right ${i}`,
        x: [`B wrong ${i}a`, `B wrong ${i}b`, `B wrong ${i}c`] as const,
        e: `B because ${i}.`,
      })),
    ),
  ]);
  const physics = defineBank('physics', 'gamma', (b) => [
    b.dynamic('p', 2, (r) => {
      const v = r.int(1, 99);
      return {
        stem: `Speed ${v}?`,
        answer: `${v} m/s`,
        distractors: [`${v + 1} m/s`, `${v + 2} m/s`, `${v + 3} m/s`],
        explanation: 'Read it.',
      };
    }),
  ]);
  return [...chapterA.templates, ...chapterB.templates, ...physics.templates];
}

const blueprint: Blueprint = {
  examType: 'test',
  codePrefix: 'TST',
  title: 'Test paper',
  durationMinutes: 60,
  sections: [
    {
      subject: 'mathematics',
      title: 'Mathematics',
      count: 30,
      chapterWeights: { alpha: 2, beta: 1, missing: 5 },
    },
    { subject: 'physics', title: 'Physics', count: 5, chapterWeights: { gamma: 1 } },
  ],
};

describe('assemblePaper', () => {
  const bank = makeBank();

  it('produces exactly the requested number of questions per section', () => {
    const paper = assemblePaper(bank, blueprint, { seed: 'ABCD1234', bankVersion: 't' });
    expect(paper.questions).toHaveLength(35);
    expect(paper.sections).toEqual([
      { subject: 'mathematics', title: 'Mathematics', start: 0, count: 30 },
      { subject: 'physics', title: 'Physics', start: 30, count: 5 },
    ]);
    paper.questions.forEach((q, i) => {
      expect(q.index).toBe(i);
      expect(q.options).toHaveLength(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(4);
    });
    expect(paper.code).toBe('TST-ABCD-1234');
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const a = assemblePaper(bank, blueprint, { seed: 'SEED0001', bankVersion: 't' });
    const b = assemblePaper(bank, blueprint, { seed: 'SEED0001', bankVersion: 't' });
    const c = assemblePaper(bank, blueprint, { seed: 'SEED0002', bankVersion: 't' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a.questions.map((q) => q.stem))).not.toBe(
      JSON.stringify(c.questions.map((q) => q.stem)),
    );
  });

  it('never repeats a static template within a paper', () => {
    for (let s = 0; s < 20; s++) {
      const paper = assemblePaper(bank, blueprint, { seed: `S${s}AAAA`, bankVersion: 't' });
      const statics = paper.questions
        .filter((q) => q.templateKind === 'static')
        .map((q) => q.templateId);
      expect(new Set(statics).size).toBe(statics.length);
    }
  });

  it('keeps passage-set questions contiguous and in order', () => {
    for (let s = 0; s < 20; s++) {
      const paper = assemblePaper(bank, blueprint, { seed: `P${s}BBBB`, bankVersion: 't' });
      const parts = paper.questions.filter((q) => q.passage);
      for (const q of parts) {
        if (q.passage!.part > 1) {
          const prev = paper.questions[q.index - 1]!;
          expect(prev.passage?.id).toBe(q.passage!.id);
          expect(prev.passage?.part).toBe(q.passage!.part - 1);
        }
      }
    }
  });

  it('places the correct answer in every position across papers', () => {
    const positions = new Set<number>();
    for (let s = 0; s < 5; s++) {
      assemblePaper(bank, blueprint, { seed: `Q${s}CCCC`, bankVersion: 't' }).questions.forEach(
        (q) => positions.add(q.correct),
      );
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });

  it('roughly honours the difficulty mix and dynamic share', () => {
    let easy = 0;
    let hard = 0;
    let total = 0;
    for (let s = 0; s < 10; s++) {
      const paper = assemblePaper(bank, blueprint, {
        seed: `D${s}DDDD`,
        bankVersion: 't',
        difficultyMix: [0.2, 0.5, 0.3],
      });
      for (const q of paper.questions.filter((x) => x.subject === 'mathematics')) {
        total++;
        if (q.difficulty === 1) easy++;
        if (q.difficulty === 3) hard++;
      }
    }
    expect(easy / total).toBeGreaterThan(0.1);
    expect(hard / total).toBeGreaterThan(0.15);
  });

  it('throws a helpful error when a subject has no templates', () => {
    expect(() =>
      assemblePaper(
        bank,
        {
          ...blueprint,
          sections: [{ subject: 'chemistry', title: 'Chemistry', count: 3, chapterWeights: {} }],
        },
        { seed: 'XXXX1111', bankVersion: 't' },
      ),
    ).toThrow(/chemistry/);
  });
});

describe('paper codes', () => {
  it('round-trips', () => {
    const code = formatPaperCode('ENG', 'K7Q29XM4');
    expect(code).toBe('ENG-K7Q2-9XM4');
    expect(parsePaperCode(' eng-k7q2-9xm4 ', ['ENG'])).toEqual({
      prefix: 'ENG',
      seed: 'K7Q29XM4',
      code,
    });
    expect(parsePaperCode('ENG K7Q29XM4', ['ENG'])?.code).toBe(code);
    expect(parsePaperCode('XYZ-K7Q2-9XM4', ['ENG'])).toBeNull();
    expect(parsePaperCode('ENG-!!', ['ENG'])).toBeNull();
  });
});
