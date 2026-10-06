import { SYLLABUS } from '@/config/syllabus';
import type { SubjectId } from '@/engine/types';

export interface GenerationProblem {
  kind: 'bank-gap' | 'failed';
  title: string;
  message: string;
  /** Subject that the bank could not fill (bank gaps only). */
  subject?: string;
}

const subjectName = (id: string): string => SYLLABUS[id as SubjectId]?.name ?? id;

/** Turns an error thrown while generating a paper into a message for candidates. */
export function explainGenerationError(error: unknown): GenerationProblem {
  const text = error instanceof Error ? error.message : String(error);

  const tooSmall = /Bank too small for ([\w-]+): needed (\d+), produced (\d+)/.exec(text);
  if (tooSmall) {
    const [, subject = '', needed = '?', produced = '?'] = tooSmall;
    const name = subjectName(subject);
    return {
      kind: 'bank-gap',
      subject: name,
      title: `Not enough ${name} questions yet`,
      message: `This paper needs ${needed} ${name} questions, but the question bank can only produce ${produced} different ones so far. The bank is still growing: try another paper type, or a custom test with fewer ${name} questions.`,
    };
  }

  const empty = /No templates available for subject "([\w-]+)"/.exec(text);
  if (empty) {
    const name = subjectName(empty[1] ?? '');
    return {
      kind: 'bank-gap',
      subject: name,
      title: `No ${name} questions yet`,
      message: `The question bank does not have any ${name} questions yet, so this paper cannot be built. Try another paper type, or a custom test without ${name}.`,
    };
  }

  if (
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      text,
    )
  ) {
    return {
      kind: 'failed',
      title: 'Could not load the question bank',
      message:
        'Part of the question bank failed to download. Check your connection and try again; if the app was just updated, reload the page.',
    };
  }

  return {
    kind: 'failed',
    title: 'Could not generate this paper',
    message:
      'Something went wrong while building the paper. Try again, or generate a different paper.',
  };
}
