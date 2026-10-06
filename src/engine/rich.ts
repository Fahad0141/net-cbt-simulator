/**
 * Minimal, safe rich-text format used for every stem, option, explanation and passage.
 *
 * Syntax
 * - `$...$`            inline LaTeX (KaTeX; `\ce{}` from mhchem is available)
 * - `$$...$$`          display LaTeX (rendered as its own block)
 * - `**text**`         bold
 * - `__text__`         underline (used by English error-spotting questions)
 * - `` `code` ``       inline code
 * - ```lang ... ```    fenced code block (on its own lines)
 * - `| a | b |` lines  a simple table (first row = header, optional `|---|` separator)
 * - single newline     line break; blank line = new paragraph
 * - `\$`               a literal dollar sign
 *
 * The parser never produces HTML; the renderer turns the AST into React elements,
 * so arbitrary text can never inject markup.
 */

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string }
  | { type: 'code'; value: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'underline'; children: Inline[] }
  | { type: 'break' };

export type Block =
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'math'; value: string }
  | { type: 'code'; lang: string; value: string }
  | { type: 'table'; header: Inline[][]; rows: Inline[][][] };

export interface RichDocument {
  blocks: Block[];
  /** Human-readable syntax problems (unclosed delimiters etc.). Empty when well-formed. */
  problems: string[];
}

/** Index of the next `$` at or after `from` that is not escaped with a backslash, or -1. */
function findUnescapedDollar(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] === '\\') {
      i++; // skip the escaped character
      continue;
    }
    if (text[i] === '$') return i;
  }
  return -1;
}

/** Finds the closing `marker` for bold/underline, skipping over math and code spans. */
function findClosing(text: string, marker: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '$') {
      const end = findUnescapedDollar(text, i + 1);
      if (end === -1) return -1;
      i = end;
      continue;
    }
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end === -1) return -1;
      i = end;
      continue;
    }
    if (text.startsWith(marker, i)) return i;
  }
  return -1;
}

export function parseInline(text: string, problems: string[] = []): Inline[] {
  const out: Inline[] = [];
  let buffer = '';
  const flush = () => {
    if (buffer) {
      out.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i] as string;

    if (ch === '\\' && text[i + 1] === '$') {
      buffer += '$';
      i += 2;
      continue;
    }

    if (ch === '$') {
      const end = findUnescapedDollar(text, i + 1);
      if (end === -1) {
        problems.push(`Unclosed inline math "$" in: ${text.slice(i, i + 40)}`);
        buffer += '$';
        i += 1;
        continue;
      }
      const tex = text.slice(i + 1, end);
      if (!tex.trim()) problems.push('Empty inline math "$$" inside a line');
      flush();
      out.push({ type: 'math', value: tex });
      i = end + 1;
      continue;
    }

    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end === -1) {
        problems.push(`Unclosed inline code "\`" in: ${text.slice(i, i + 40)}`);
        buffer += '`';
        i += 1;
        continue;
      }
      flush();
      out.push({ type: 'code', value: text.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    if (text.startsWith('**', i) || text.startsWith('__', i)) {
      const marker = text.slice(i, i + 2);
      const end = findClosing(text, marker, i + 2);
      if (end === -1) {
        problems.push(`Unclosed "${marker}" in: ${text.slice(i, i + 40)}`);
        buffer += marker;
        i += 2;
        continue;
      }
      flush();
      const children = parseInline(text.slice(i + 2, end), problems);
      out.push(marker === '**' ? { type: 'strong', children } : { type: 'underline', children });
      i = end + 2;
      continue;
    }

    if (ch === '\n') {
      flush();
      out.push({ type: 'break' });
      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }
  flush();
  return out;
}

function splitTableRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1);
  return body.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function parseTable(lines: string[], problems: string[]): Block {
  const rows = lines.map(splitTableRow);
  const isSeparator = (cells: string[]) => cells.every((c) => /^:?-{3,}:?$/.test(c));
  const header = rows[0] ?? [];
  const body = rows.slice(1).filter((cells) => !isSeparator(cells));
  for (const r of body) {
    if (r.length !== header.length) {
      problems.push(`Table row has ${r.length} cells but header has ${header.length}`);
    }
  }
  return {
    type: 'table',
    header: header.map((cell) => parseInline(cell, problems)),
    rows: body.map((cells) => cells.map((cell) => parseInline(cell, problems))),
  };
}

/** Splits non-code text into paragraphs, tables and display-math blocks. */
function parseFlow(text: string, blocks: Block[], problems: string[]): void {
  // Split out $$display$$ math first (it may span lines).
  const parts: { math: boolean; value: string }[] = [];
  let cursor = 0;
  for (;;) {
    const open = findDisplayDelimiter(text, cursor);
    if (open === -1) break;
    const close = findDisplayDelimiter(text, open + 2);
    if (close === -1) {
      problems.push(`Unclosed display math "$$" in: ${text.slice(open, open + 40)}`);
      break;
    }
    parts.push({ math: false, value: text.slice(cursor, open) });
    parts.push({ math: true, value: text.slice(open + 2, close) });
    cursor = close + 2;
  }
  parts.push({ math: false, value: text.slice(cursor) });

  for (const part of parts) {
    if (part.math) {
      if (!part.value.trim()) problems.push('Empty display math');
      blocks.push({ type: 'math', value: part.value.trim() });
      continue;
    }
    for (const para of part.value.split(/\n[ \t]*\n/)) {
      const trimmed = para.replace(/^\n+|\n+$/g, '');
      if (!trimmed.trim()) continue;
      const lines = trimmed.split('\n');
      if (lines.every((l) => l.trim().startsWith('|'))) {
        blocks.push(parseTable(lines, problems));
      } else {
        blocks.push({ type: 'paragraph', children: parseInline(trimmed, problems) });
      }
    }
  }
}

/** Index of the next unescaped `$$`, or -1. */
function findDisplayDelimiter(text: string, from: number): number {
  for (let i = from; i < text.length - 1; i++) {
    if (text[i] === '\\') {
      i++;
      continue;
    }
    if (text[i] === '$' && text[i + 1] === '$') return i;
  }
  return -1;
}

export function parseRich(input: string): RichDocument {
  const text = input.replace(/\r\n?/g, '\n');
  const blocks: Block[] = [];
  const problems: string[] = [];
  const lines = text.split('\n');
  let pending: string[] = [];

  const flushPending = () => {
    if (pending.length) {
      parseFlow(pending.join('\n'), blocks, problems);
      pending = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const fence = /^\s*```\s*([\w+#.-]*)\s*$/.exec(line);
    if (!fence) {
      pending.push(line);
      continue;
    }
    flushPending();
    const code: string[] = [];
    let closed = false;
    for (i = i + 1; i < lines.length; i++) {
      if (/^\s*```\s*$/.test(lines[i] as string)) {
        closed = true;
        break;
      }
      code.push(lines[i] as string);
    }
    if (!closed) problems.push('Unclosed fenced code block');
    blocks.push({ type: 'code', lang: fence[1] ?? '', value: code.join('\n') });
  }
  flushPending();
  return { blocks, problems };
}

/** Every LaTeX fragment in a rich-text string (used by validation). */
export function collectMath(input: string): { tex: string; display: boolean }[] {
  const out: { tex: string; display: boolean }[] = [];
  const visitInline = (nodes: Inline[]) => {
    for (const node of nodes) {
      if (node.type === 'math') out.push({ tex: node.value, display: false });
      else if (node.type === 'strong' || node.type === 'underline') visitInline(node.children);
    }
  };
  for (const block of parseRich(input).blocks) {
    if (block.type === 'math') out.push({ tex: block.value, display: true });
    else if (block.type === 'paragraph') visitInline(block.children);
    else if (block.type === 'table') {
      block.header.forEach(visitInline);
      block.rows.forEach((row) => row.forEach(visitInline));
    }
  }
  return out;
}

/** Best-effort plain-text rendering (search indexes, aria labels, CLI output). */
export function toPlainText(input: string): string {
  const inline = (nodes: Inline[]): string =>
    nodes
      .map((n) => {
        switch (n.type) {
          case 'text':
            return n.value;
          case 'math':
            return n.value;
          case 'code':
            return n.value;
          case 'break':
            return '\n';
          default:
            return inline(n.children);
        }
      })
      .join('');
  return parseRich(input)
    .blocks.map((b) => {
      switch (b.type) {
        case 'paragraph':
          return inline(b.children);
        case 'math':
          return b.value;
        case 'code':
          return b.value;
        case 'table':
          return [b.header, ...b.rows].map((row) => row.map(inline).join(' | ')).join('\n');
      }
    })
    .join('\n\n');
}
