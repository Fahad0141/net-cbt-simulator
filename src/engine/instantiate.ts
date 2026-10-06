import type { Rng } from './rng';
import type { AuthoredQuestion, QuestionTemplate } from './types';

/** One realised question plus the passage it belongs to (for set templates). */
export interface Realized {
  question: AuthoredQuestion;
  passage?: { title?: string; text: string; part: number; of: number };
}

/** Runs a template once. Static templates always yield the same question. */
export function realize(template: QuestionTemplate, rng: Rng): Realized[] {
  switch (template.kind) {
    case 'static':
      return [{ question: template.question }];
    case 'dynamic':
      return [{ question: template.generate(rng) }];
    case 'set': {
      const set = template.generate(rng);
      return set.questions.map((question, i) => ({
        question,
        passage: {
          ...(set.title ? { title: set.title } : {}),
          text: set.passage,
          part: i + 1,
          of: set.questions.length,
        },
      }));
    }
  }
}

/**
 * Orders the four options for display and reports where the answer landed.
 * Shuffles index positions (not strings) so the result is robust even if two
 * options were accidentally identical.
 */
export function arrangeOptions(
  question: AuthoredQuestion,
  rng: Rng,
): { options: string[]; correct: number } {
  if (question.fixedOrder) {
    const options = [...question.fixedOrder];
    return { options, correct: options.indexOf(question.answer) };
  }
  const all = [question.answer, ...question.distractors];
  const order = rng.shuffle(all.map((_, i) => i));
  return { options: order.map((i) => all[i] as string), correct: order.indexOf(0) };
}
