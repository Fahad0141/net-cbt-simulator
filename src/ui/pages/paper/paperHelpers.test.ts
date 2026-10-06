import { describe, expect, it } from 'vitest';
import type { Question } from '@/engine/types';
import { encodeSpec } from '@/exam/papers';
import { explainGenerationError } from './errors';
import { answerSheetColumns, groupBlocks, optionColumns, paperHeading, texWidth } from './layout';
import { cbtPath, pathForTypedCode, resolvePaperUrl } from './request';
import { DEFAULT_PRINT_SETTINGS, settingsFromQuery, settingsToQuery } from './settings';

const q = (index: number, passageId?: string): Question => ({
  index,
  uid: `X#${index}`,
  templateId: 't',
  templateKind: 'static',
  subject: 'english',
  chapter: 'c',
  difficulty: 1,
  origin: 'original',
  tags: [],
  stem: 's',
  options: ['a', 'b', 'c', 'd'],
  correct: 0,
  explanation: '',
  ...(passageId ? { passage: { id: passageId, text: 'p', part: 1, of: 2 } } : {}),
});

describe('resolvePaperUrl', () => {
  it('resolves standard codes and canonicalises them', () => {
    const r = resolvePaperUrl('eng-k7q2-9xm4', new URLSearchParams());
    expect(r).toMatchObject({
      ok: true,
      examType: 'engineering',
      seed: 'K7Q29XM4',
      code: 'ENG-K7Q2-9XM4',
    });
    if (r.ok) expect(cbtPath(r)).toBe('/new?type=engineering&seed=K7Q29XM4');
  });

  it('accepts a bare seed with a type', () => {
    expect(resolvePaperUrl('K7Q29XM4', new URLSearchParams('type=engineering'))).toMatchObject({
      ok: true,
      code: 'ENG-K7Q2-9XM4',
    });
    expect(resolvePaperUrl('K7Q29XM4', new URLSearchParams())).toMatchObject({
      ok: false,
      problem: 'invalid-code',
    });
  });

  it('lets the code prefix win over a conflicting type', () => {
    expect(resolvePaperUrl('ENG-K7Q2-9XM4', new URLSearchParams('type=business'))).toMatchObject({
      ok: true,
      examType: 'engineering',
    });
  });

  it('rejects junk and incomplete custom links', () => {
    expect(resolvePaperUrl('???', new URLSearchParams())).toMatchObject({
      ok: false,
      problem: 'invalid-code',
    });
    expect(resolvePaperUrl('CUS-K7Q2-9XM4', new URLSearchParams())).toMatchObject({
      ok: false,
      problem: 'missing-spec',
    });
  });

  it('resolves custom papers with their spec', () => {
    const spec = encodeSpec({
      durationMinutes: 20,
      sections: [{ subject: 'mathematics', count: 5 }],
    });
    const r = resolvePaperUrl('CUS-K7Q2-9XM4', new URLSearchParams(`type=custom&spec=${spec}`));
    expect(r).toMatchObject({ ok: true, examType: 'custom', seed: 'K7Q29XM4' });
    if (r.ok) expect(r.request.custom?.sections[0]?.count).toBe(5);
  });

  it('parses typed codes', () => {
    expect(pathForTypedCode(' eng k7q2 9xm4 ')).toBe('/paper/ENG-K7Q2-9XM4');
    expect(pathForTypedCode('hello')).toBeNull();
    expect(pathForTypedCode('CUS-K7Q2-9XM4')).toBeNull();
  });
});

describe('settings', () => {
  it('round-trips through the query and omits defaults', () => {
    expect(settingsFromQuery(new URLSearchParams())).toEqual(DEFAULT_PRINT_SETTINGS);
    const changed = { ...DEFAULT_PRINT_SETTINGS, solutions: true, fontSize: 'large' as const };
    const query = settingsToQuery(changed, new URLSearchParams('type=x'));
    expect(query.toString()).toBe('type=x&solutions=1&size=l');
    expect(settingsFromQuery(query)).toEqual(changed);
  });
});

describe('layout helpers', () => {
  it('groups consecutive passage questions', () => {
    const blocks = groupBlocks([q(0), q(1, 'p'), q(2, 'p'), q(3)]);
    expect(blocks.map((b) => b.kind)).toEqual(['question', 'passage', 'question']);
    const second = blocks[1];
    expect(second?.kind === 'passage' ? second.questions.length : 0).toBe(2);
  });

  it('fits a 200-question answer sheet in five columns of 40', () => {
    const columns = answerSheetColumns(200);
    expect(columns).toHaveLength(5);
    expect(columns[4]).toEqual({ from: 161, to: 200 });
    expect(answerSheetColumns(0)).toEqual([]);
  });

  it('chooses option columns by width', () => {
    expect(optionColumns(['1', '2', '3', '4'], true)).toBe(4);
    expect(optionColumns(['1', '2', '3', '4'], false)).toBe(1);
    expect(optionColumns(['a moderately long option text', 'b', 'c', 'd'], true)).toBe(2);
    expect(optionColumns(['x'.repeat(60), 'b', 'c', 'd'], true)).toBe(1);
    expect(texWidth('\\frac{1}{2}')).toBe(1);
  });

  it('titles standard and custom papers', () => {
    expect(paperHeading({ examType: 'engineering', title: '' }).title).toBe(
      'NET Engineering — Full Length Paper',
    );
    expect(paperHeading({ examType: 'custom', title: 'Drill' })).toMatchObject({
      title: 'Drill',
      custom: true,
    });
    expect(paperHeading({ examType: 'legacy-ics', title: '' })).toMatchObject({
      title: 'NET Engineering (ICS) (pre-2025 pattern) — Full Length Paper',
      shortName: 'NET Engineering (ICS) (pre-2025 pattern)',
    });
  });
});

describe('explainGenerationError', () => {
  it('recognises bank gaps', () => {
    expect(
      explainGenerationError(new Error('Bank too small for physics: needed 60, produced 3')),
    ).toMatchObject({
      kind: 'bank-gap',
      subject: 'Physics',
    });
    expect(explainGenerationError('boom').kind).toBe('failed');
  });
});
