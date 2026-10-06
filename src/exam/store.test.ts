import type { Paper } from '@/engine/types';
import { createSession, DEFAULT_SETTINGS, sessionReducer } from './session';
import {
  archiveSession,
  deleteAttempt,
  exportHistory,
  getAttempt,
  importHistory,
  listAttempts,
  sanitizeImportedSession,
} from './store';

const paper: Paper = {
  code: 'TST-AAAA-0001',
  examType: 'test',
  seed: 'AAAA0001',
  title: 'Test',
  durationMinutes: 5,
  bankVersion: 't',
  sections: [{ subject: 'mathematics', title: 'Mathematics', start: 0, count: 2 }],
  questions: [0, 1].map((i) => ({
    index: i,
    uid: `u${i}`,
    templateId: `t${i}`,
    templateKind: 'static' as const,
    subject: 'mathematics' as const,
    chapter: 'c',
    difficulty: 1 as const,
    origin: 'original' as const,
    tags: [],
    stem: `Q${i}`,
    options: ['a', 'b', 'c', 'd'],
    correct: 0,
    explanation: 'e',
  })),
};

function finishedSession(id: string) {
  let s = createSession({
    id,
    paper,
    candidate: { name: 'N', userId: 'U', centre: 'C' },
    settings: DEFAULT_SETTINGS.exam,
    at: 0,
  });
  s = sessionReducer(s, { type: 'start', at: 0 });
  s = sessionReducer(s, { type: 'select', option: 0, at: 1 });
  s = sessionReducer(s, { type: 'save', at: 2 });
  return sessionReducer(s, { type: 'finish', reason: 'submitted', at: 3 });
}

describe('attempt store', () => {
  it('archives, lists, exports, imports and deletes attempts', async () => {
    const summary = await archiveSession(finishedSession('s-1'));
    expect(summary).toMatchObject({ id: 's-1', score: 1, maxScore: 2, percent: 50 });
    expect((await listAttempts()).map((a) => a.id)).toContain('s-1');

    const backup = await exportHistory();
    await deleteAttempt('s-1');
    expect(await getAttempt('s-1')).toBeUndefined();
    expect(await importHistory(JSON.parse(JSON.stringify(backup)))).toBeGreaterThanOrEqual(1);
    expect((await getAttempt('s-1'))?.summary.correct).toBe(1);
  });

  it('rejects foreign files', async () => {
    await expect(importHistory({ hello: 'world' })).rejects.toThrow(/history file/);
  });

  it('strips unsafe SVG figures and rejects malformed sessions on import', () => {
    const s = JSON.parse(JSON.stringify(finishedSession('s-2')));
    s.paper.questions[0].figure = '<svg onload="alert(1)"></svg>';
    s.paper.questions[1].figure = '<svg viewBox="0 0 10 10"><circle r="3"/></svg>';
    const clean = sanitizeImportedSession(s);
    expect(clean?.paper.questions[0]?.figure).toBeUndefined();
    expect(clean?.paper.questions[1]?.figure).toContain('<circle');

    const broken = JSON.parse(JSON.stringify(finishedSession('s-3')));
    broken.paper.questions[0].options = ['only one'];
    expect(sanitizeImportedSession(broken)).toBeNull();
    expect(sanitizeImportedSession({ schema: 2 })).toBeNull();
  });
});
