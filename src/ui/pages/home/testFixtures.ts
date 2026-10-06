/**
 * Hand-built papers and sessions for the dashboard tests (no question bank needed).
 * Test-only: nothing in the app imports this module.
 */
import type { Paper, Question, SubjectId } from '@/engine/types';
import {
  createSession,
  DEFAULT_SETTINGS,
  type ExamMode,
  type ExamSession,
  type SessionAction,
  sessionReducer,
} from '@/exam/session';

type ActionInput = SessionAction extends infer A
  ? A extends SessionAction
    ? Omit<A, 'at'>
    : never
  : never;

const MINUTE = 60_000;

export function makePaper({
  code = 'ENG-TEST-0001',
  examType = 'engineering',
  title = 'NET-Engineering (Engineering / Computing)',
  sections = [
    { subject: 'mathematics' as SubjectId, title: 'Mathematics', count: 6 },
    { subject: 'physics' as SubjectId, title: 'Physics', count: 2 },
    { subject: 'english' as SubjectId, title: 'English', count: 2 },
  ],
  durationMinutes = 180,
}: {
  code?: string;
  examType?: string;
  title?: string;
  sections?: Array<{ subject: SubjectId; title: string; count: number }>;
  durationMinutes?: number;
} = {}): Paper {
  const questions: Question[] = [];
  const paperSections = sections.map((section) => {
    const start = questions.length;
    for (let i = 0; i < section.count; i++) {
      const index = questions.length;
      questions.push({
        index,
        uid: `${code}#${index}`,
        templateId: `${section.subject}/test/q${i}`,
        templateKind: 'static',
        subject: section.subject,
        chapter: 'test',
        difficulty: 2,
        origin: 'original',
        tags: [],
        stem: `Question ${index + 1}`,
        options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
        correct: 0,
        explanation: 'Alpha is correct.',
      });
    }
    return { subject: section.subject, title: section.title, start, count: section.count };
  });
  return {
    code,
    examType,
    seed: code.split('-').slice(1).join(''),
    title,
    durationMinutes,
    bankVersion: 'test',
    sections: paperSections,
    questions,
  };
}

/** Applies actions one second apart, starting at `at`. */
export function play(
  session: ExamSession,
  actions: readonly ActionInput[],
  at: number,
): ExamSession {
  return actions.reduce(
    (current, action, i) =>
      sessionReducer(current, { ...action, at: at + i * 1000 } as SessionAction),
    session,
  );
}

export function newSession({
  id = 'session-1',
  paper = makePaper(),
  mode = 'exam' as ExamMode,
  at = Date.now(),
}: { id?: string; paper?: Paper; mode?: ExamMode; at?: number } = {}): ExamSession {
  return createSession({
    id,
    paper,
    candidate: { name: 'Ayesha Khan', userId: 'NET26-12345', centre: 'ISB-H12' },
    settings: DEFAULT_SETTINGS[mode],
    at,
  });
}

/** Answers `answered` questions (the first `correct` of them correctly) after logging in and starting. */
export function answer(
  session: ExamSession,
  { answered, correct = answered }: { answered: number; correct?: number },
  at: number,
) {
  const actions: ActionInput[] = [];
  for (let i = 0; i < answered; i++) {
    actions.push(
      { type: 'select', option: i < correct ? 0 : 1 },
      { type: 'save' },
      { type: 'next' },
    );
  }
  return play(session, actions, at);
}

/** A running session that was started `minutesAgo` minutes ago. */
export function runningSession({
  minutesAgo = 38,
  answered = 0,
  mode = 'exam' as ExamMode,
  paper = makePaper(),
  id = 'running-1',
}: {
  minutesAgo?: number;
  answered?: number;
  mode?: ExamMode;
  paper?: Paper;
  id?: string;
} = {}): ExamSession {
  const startedAt = Date.now() - minutesAgo * MINUTE;
  const session = newSession({ id, paper, mode, at: startedAt - 5000 });
  const started = play(
    session,
    [{ type: 'login', candidate: session.candidate }, { type: 'start' }],
    startedAt - 1000,
  );
  // Answer quickly (a few seconds after starting) so the clock maths stays exact.
  return answer(started, { answered }, startedAt);
}

/** A finished attempt scoring `correct` out of the paper's questions. */
export function finishedSession({
  id,
  correct,
  answered = correct,
  finishedAt,
  mode = 'exam' as ExamMode,
  paper = makePaper(),
  reason = 'submitted' as 'submitted' | 'timeout',
}: {
  id: string;
  correct: number;
  answered?: number;
  finishedAt: number;
  mode?: ExamMode;
  paper?: Paper;
  reason?: 'submitted' | 'timeout';
}): ExamSession {
  const startedAt = finishedAt - 90 * MINUTE;
  const session = newSession({ id, paper, mode, at: startedAt - 5000 });
  const started = play(
    session,
    [{ type: 'login', candidate: session.candidate }, { type: 'start' }],
    startedAt - 1000,
  );
  const done = answer(started, { answered, correct }, startedAt);
  return sessionReducer(done, { type: 'finish', reason, at: finishedAt });
}
