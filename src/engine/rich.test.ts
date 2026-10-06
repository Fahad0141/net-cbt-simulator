import { collectMath, parseInline, parseRich, toPlainText } from './rich';

describe('parseInline', () => {
  it('parses text, math, code, bold and underline', () => {
    const problems: string[] = [];
    const nodes = parseInline('Find $x^2$ in **bold $y$** and __under__ `int x;`', problems);
    expect(problems).toEqual([]);
    expect(nodes).toEqual([
      { type: 'text', value: 'Find ' },
      { type: 'math', value: 'x^2' },
      { type: 'text', value: ' in ' },
      {
        type: 'strong',
        children: [
          { type: 'text', value: 'bold ' },
          { type: 'math', value: 'y' },
        ],
      },
      { type: 'text', value: ' and ' },
      { type: 'underline', children: [{ type: 'text', value: 'under' }] },
      { type: 'text', value: ' ' },
      { type: 'code', value: 'int x;' },
    ]);
  });

  it('treats \\$ as a literal dollar', () => {
    expect(parseInline('costs \\$5')).toEqual([{ type: 'text', value: 'costs $5' }]);
  });

  it('reports unclosed delimiters', () => {
    const problems: string[] = [];
    parseInline('broken $x + 1', problems);
    parseInline('broken **bold', problems);
    expect(problems).toHaveLength(2);
  });

  it('does not end bold inside math', () => {
    const nodes = parseInline('**a $x**y$ b**');
    expect(nodes).toEqual([
      {
        type: 'strong',
        children: [
          { type: 'text', value: 'a ' },
          { type: 'math', value: 'x**y' },
          { type: 'text', value: ' b' },
        ],
      },
    ]);
  });

  it('converts newlines to breaks', () => {
    expect(parseInline('a\nb')).toEqual([
      { type: 'text', value: 'a' },
      { type: 'break' },
      { type: 'text', value: 'b' },
    ]);
  });
});

describe('parseRich', () => {
  it('splits paragraphs, display math, code fences and tables', () => {
    const doc = parseRich(
      [
        'First para.',
        '',
        'Evaluate $$\\int_0^1 x\\,dx$$ now.',
        '```cpp',
        'int main() { return 0; }',
        '```',
        '| x | y |',
        '|---|---|',
        '| 1 | $2$ |',
      ].join('\n'),
    );
    expect(doc.problems).toEqual([]);
    expect(doc.blocks.map((b) => b.type)).toEqual([
      'paragraph',
      'paragraph',
      'math',
      'paragraph',
      'code',
      'table',
    ]);
    const table = doc.blocks[5];
    expect(table?.type === 'table' && table.rows).toHaveLength(1);
  });

  it('reports unclosed code fences and display math', () => {
    expect(parseRich('```\ncode').problems).toHaveLength(1);
    expect(parseRich('$$x').problems.length).toBeGreaterThan(0);
  });
});

describe('collectMath / toPlainText', () => {
  it('collects inline and display math', () => {
    expect(collectMath('a $x$ b $$y$$ **$z$**')).toEqual([
      { tex: 'x', display: false },
      { tex: 'y', display: true },
      { tex: 'z', display: false },
    ]);
  });

  it('flattens to plain text', () => {
    expect(toPlainText('Find **$x$** __now__')).toBe('Find x now');
  });
});
