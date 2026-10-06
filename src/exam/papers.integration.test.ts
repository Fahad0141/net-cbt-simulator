/**
 * End-to-end checks of full-length paper generation against the REAL question bank.
 * Every exam type is generated with several seeds and must satisfy the blueprint
 * exactly; distribution properties are checked with tolerances.
 */
import { EXAM_TYPES } from '@/config/exams';
import { normalizeOption } from '@/engine/helpers/distractors';
import type { Paper } from '@/engine/types';
import { DEFAULT_GENERATION, generatePaper } from './papers';

const SEEDS = ['AAAA1111', 'BBBB2222', 'CCCC3333'];

describe.each(EXAM_TYPES.map((e) => [e.id, e] as const))('%s papers', (_id, exam) => {
  const papers: Paper[] = [];

  beforeAll(async () => {
    for (const seed of SEEDS) papers.push(await generatePaper({ examType: exam.id, seed }));
  }, 120_000);

  it('match the blueprint exactly', () => {
    for (const paper of papers) {
      expect(paper.questions).toHaveLength(exam.sections.reduce((a, s) => a + s.count, 0));
      expect(paper.durationMinutes).toBe(exam.durationMinutes);
      expect(paper.sections.map((s) => [s.subject, s.count])).toEqual(
        exam.sections.map((s) => [s.subject, s.count]),
      );
      paper.sections.forEach((section) => {
        for (const q of paper.questions.slice(section.start, section.start + section.count)) {
          expect(q.subject).toBe(section.subject);
        }
      });
    }
  });

  it('have four distinct options and a valid key for every question', () => {
    for (const paper of papers) {
      for (const q of paper.questions) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options.map(normalizeOption)).size).toBe(4);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(4);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('never repeat a question within a paper', () => {
    for (const paper of papers) {
      const keys = paper.questions.map((q) => `${q.stem}|${q.options[q.correct]}`);
      expect(new Set(keys).size).toBe(keys.length);
      const fixed = paper.questions
        .filter((q) => q.templateKind === 'static')
        .map((q) => q.templateId);
      expect(new Set(fixed).size).toBe(fixed.length);
    }
  });

  it('keep passage sets together and in order', () => {
    for (const paper of papers) {
      for (const q of paper.questions) {
        if (q.passage && q.passage.part > 1) {
          const prev = paper.questions[q.index - 1];
          expect(prev?.passage?.id).toBe(q.passage.id);
        }
      }
    }
  });

  it('spread answers across all four positions', () => {
    const counts = [0, 0, 0, 0];
    for (const paper of papers) for (const q of paper.questions) counts[q.correct]!++;
    const total = counts.reduce((a, b) => a + b, 0);
    for (const c of counts) expect(c / total).toBeGreaterThan(0.15);
  });

  it('roughly follow the difficulty mix and differ between seeds', () => {
    const [easy, medium, hard] = DEFAULT_GENERATION.difficultyMix;
    for (const paper of papers) {
      const n = paper.questions.length;
      const share = (d: number) => paper.questions.filter((q) => q.difficulty === d).length / n;
      // Wide tolerances: thin chapters may lack templates of some difficulty.
      expect(Math.abs(share(1) - easy)).toBeLessThan(0.2);
      expect(Math.abs(share(2) - medium)).toBeLessThan(0.2);
      expect(Math.abs(share(3) - hard)).toBeLessThan(0.15);
    }
    const stems = papers.map((p) => new Set(p.questions.map((q) => q.stem)));
    const overlap = [...stems[0]!].filter((s) => stems[1]!.has(s)).length / stems[0]!.size;
    expect(overlap).toBeLessThan(0.6);
  });

  it('is reproducible from its seed', async () => {
    const again = await generatePaper({ examType: exam.id, seed: SEEDS[0] });
    expect(JSON.stringify(again)).toBe(JSON.stringify(papers[0]));
  });
});
