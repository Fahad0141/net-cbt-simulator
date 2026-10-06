import type { Difficulty, Paper, Question, SubjectId } from '@/engine/types';
import {
  createSession,
  DEFAULT_SETTINGS,
  type ExamMode,
  type ExamSession,
  type FinishReason,
} from '@/exam/session';

/**
 * Hand-built papers and finished sessions for the History / Analytics tests.
 * Not used by the app itself.
 */

export interface FixtureBlock {
  chapter: string;
  count: number;
  difficulty?: Difficulty;
}

export interface FixtureSection {
  subject: SubjectId;
  title?: string;
  blocks: FixtureBlock[];
}

export function makePaper(params: {
  code: string;
  examType: string;
  title?: string;
  durationMinutes?: number;
  sections: FixtureSection[];
}): Paper {
  const questions: Question[] = [];
  const sections = params.sections.map((section) => {
    const start = questions.length;
    for (const block of section.blocks) {
      for (let k = 0; k < block.count; k++) {
        const index = questions.length;
        questions.push({
          index,
          uid: `${params.code}#${index}`,
          templateId: `${section.subject}/${block.chapter}/q${k}`,
          templateKind: 'static',
          subject: section.subject,
          chapter: block.chapter,
          difficulty: block.difficulty ?? 2,
          origin: 'original',
          tags: [],
          stem: `Question ${index + 1}`,
          options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
          correct: index % 4,
          explanation: 'Worked solution.',
        });
      }
    }
    return {
      subject: section.subject,
      title: section.title ?? section.subject,
      start,
      count: questions.length - start,
    };
  });
  return {
    code: params.code,
    examType: params.examType,
    seed: params.code,
    title: params.title ?? `Test paper ${params.code}`,
    durationMinutes: params.durationMinutes ?? 180,
    bankVersion: 'test',
    sections,
    questions,
  };
}

export type Outcome = 'correct' | 'wrong' | 'blank';

/** A finished session whose answers follow `outcome(index, question)`. */
export function finishedSession(params: {
  id: string;
  paper: Paper;
  finishedAt: number;
  outcome: (index: number, question: Question) => Outcome;
  mode?: ExamMode;
  elapsedMs?: number;
  timePerQuestionMs?: number;
  finishReason?: FinishReason;
}): ExamSession {
  const elapsedMs = params.elapsedMs ?? 60 * 60_000;
  const base = createSession({
    id: params.id,
    paper: params.paper,
    candidate: { name: 'Test Candidate', userId: 'NET26-12345', centre: 'ISB-H12' },
    settings: DEFAULT_SETTINGS[params.mode ?? 'exam'],
    at: params.finishedAt - elapsedMs,
  });
  const timeMs = params.timePerQuestionMs ?? 30_000;
  return {
    ...base,
    phase: 'finished',
    startedAt: base.createdAt,
    finishedAt: params.finishedAt,
    finishReason: params.finishReason ?? 'submitted',
    elapsedMs,
    questions: params.paper.questions.map((question, i) => {
      const outcome = params.outcome(i, question);
      const saved =
        outcome === 'blank'
          ? null
          : outcome === 'correct'
            ? question.correct
            : (question.correct + 1) % 4;
      return { saved, selected: saved, review: false, visited: true, timeMs, revisions: 0 };
    }),
  };
}
