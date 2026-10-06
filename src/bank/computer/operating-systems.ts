/**
 * Computer Science: Operating Systems and Applications (ICS Part I).
 *
 * Covers OS functions, Windows basics, word processing (MS Word), spreadsheets (MS Excel)
 * and e-mail / web browsing. Computational items are spreadsheet based: formula results,
 * operator precedence, range sizes and relative/absolute references when copying formulas.
 */
import { defineBank } from '@/engine/authoring';
import { numericOptions, pickDistractors } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const COLS = 'ABCDEFGHIJ';
const colLetter = (i: number): string => COLS.charAt(i);
const code = (s: string): string => '`' + s + '`';

/** Column-of-values table for a stem (blank lines around it so it renders as a table). */
function columnTable(col: string, startRow: number, values: readonly number[]): string {
  const rows = values.map((v, i) => `| ${startRow + i} | ${v} |`);
  return ['', '', `| Row | ${col} |`, '|---|---|', ...rows, '', ''].join('\n');
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts in MS Word / Windows
// ---------------------------------------------------------------------------

interface Shortcut {
  keys: string;
  /** Action, phrased to follow "is used to". */
  action: string;
}

/** Standard MS Word shortcuts; every action is distinct, so no distractor can be right. */
const SHORTCUTS: readonly Shortcut[] = [
  { keys: 'Ctrl + C', action: 'copy the selected text' },
  { keys: 'Ctrl + X', action: 'cut the selected text' },
  { keys: 'Ctrl + V', action: 'paste text from the clipboard' },
  { keys: 'Ctrl + Z', action: 'undo the last action' },
  { keys: 'Ctrl + B', action: 'make the selected text bold' },
  { keys: 'Ctrl + I', action: 'make the selected text italic' },
  { keys: 'Ctrl + U', action: 'underline the selected text' },
  { keys: 'Ctrl + S', action: 'save the current document' },
  { keys: 'Ctrl + P', action: 'print the current document' },
  { keys: 'Ctrl + A', action: 'select the whole document' },
  { keys: 'Ctrl + F', action: 'find a word in the document' },
  { keys: 'Ctrl + H', action: 'find and replace text' },
  { keys: 'Ctrl + N', action: 'create a new blank document' },
  { keys: 'Ctrl + O', action: 'open an existing document' },
  { keys: 'Ctrl + E', action: 'centre-align the paragraph' },
  { keys: 'Ctrl + J', action: 'justify the paragraph' },
  { keys: 'Ctrl + K', action: 'insert a hyperlink' },
];

/**
 * Shortcuts that must not appear together: Ctrl + H opens the Find and Replace dialog,
 * which can also find a word, so Ctrl + F vs Ctrl + H would be arguable.
 */
const CLASHES: ReadonlyArray<readonly [string, string]> = [['Ctrl + F', 'Ctrl + H']];
const clashes = (x: string, y: string): boolean =>
  CLASHES.some(([p, q]) => (x === p && y === q) || (x === q && y === p));

// ---------------------------------------------------------------------------
// Software categories
// ---------------------------------------------------------------------------

interface Category {
  name: string;
  /** Phrase used in the stem: "Which of the following is ___?" */
  phrase: string;
  members: readonly string[];
  note: string;
}

const CATEGORIES: readonly Category[] = [
  {
    name: 'operating system',
    phrase: 'an operating system',
    members: ['Linux', 'macOS', 'Unix', 'MS-DOS', 'Windows 11'],
    note: 'manages the hardware and provides services to other programs',
  },
  {
    name: 'web browser',
    phrase: 'a web browser',
    members: ['Mozilla Firefox', 'Google Chrome', 'Microsoft Edge', 'Safari', 'Opera'],
    note: 'is used to open and display web pages',
  },
  {
    name: 'word processor',
    phrase: 'a word processor',
    members: ['MS Word', 'WordPerfect', 'LibreOffice Writer', 'WordPad'],
    note: 'is used to create and format text documents',
  },
  {
    name: 'spreadsheet program',
    phrase: 'a spreadsheet program',
    members: ['MS Excel', 'Lotus 1-2-3', 'LibreOffice Calc'],
    note: 'arranges data in rows and columns of cells and computes formulas',
  },
  {
    name: 'presentation program',
    phrase: 'a presentation program',
    members: ['MS PowerPoint', 'LibreOffice Impress', 'Apple Keynote'],
    note: 'is used to build slide shows',
  },
];

// ---------------------------------------------------------------------------
// Spreadsheet functions
// ---------------------------------------------------------------------------

type Fn = 'SUM' | 'AVERAGE' | 'MAX' | 'MIN';

function applyFn(fn: Fn, xs: readonly number[]): number {
  const sum = xs.reduce((a, b) => a + b, 0);
  switch (fn) {
    case 'SUM':
      return sum;
    case 'AVERAGE':
      return sum / xs.length;
    case 'MAX':
      return Math.max(...xs);
    case 'MIN':
      return Math.min(...xs);
  }
}

// ---------------------------------------------------------------------------
// Operator precedence in spreadsheet formulas
// ---------------------------------------------------------------------------

interface PrecedenceCase {
  formula: string;
  correct: number;
  wrong: number[];
  working: string;
}

const PRECEDENCE: ReadonlyArray<(r: Rng, a: number, b: number, c: number) => PrecedenceCase> = [
  (_r, a, b, c) => ({
    formula: '=A1+B1*C1',
    correct: a + b * c,
    wrong: [(a + b) * c, a * b + c, a + b + c],
    working: `Multiplication is done before addition: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${a + b * c}.`,
  }),
  (_r, a, b, c) => ({
    formula: '=A1-B1+C1',
    correct: a - b + c,
    wrong: [a - (b + c), a + b + c, a - b - c],
    working: `Subtraction and addition have equal precedence and are done left to right: ${a} − ${b} = ${a - b}, then ${a - b} + ${c} = ${a - b + c}.`,
  }),
  (_r, a, b, _c) => ({
    formula: '=A1*B1^2',
    correct: a * b * b,
    wrong: [(a * b) ** 2, a * b * 2, a * b],
    working: `Exponentiation comes first: ${b}^2 = ${b * b}, then ${a} × ${b * b} = ${a * b * b}.`,
  }),
  (_r, a, b, c) => ({
    formula: '=(A1+B1)*C1',
    correct: (a + b) * c,
    wrong: [a + b * c, a * c + b, a + b + c],
    working: `Brackets are evaluated first: ${a} + ${b} = ${a + b}, then ${a + b} × ${c} = ${(a + b) * c}.`,
  }),
  (_r, a, b, c) => ({
    formula: '=A1+B1/C1',
    correct: a + b / c,
    wrong: [(a + b) / c, a / c + b, a + b * c],
    working: `Division is done before addition: ${b} ÷ ${c} = ${b / c}, then ${a} + ${b / c} = ${a + b / c}.`,
  }),
  (_r, a, b, c) => ({
    formula: '=A1^2-B1*C1',
    correct: a * a - b * c,
    wrong: [(a * a - b) * c, 2 * a - b * c, a * a + b * c],
    working: `Exponent first: ${a}^2 = ${a * a}; then multiplication: ${b} × ${c} = ${b * c}; finally ${a * a} − ${b * c} = ${a * a - b * c}.`,
  }),
];

// ---------------------------------------------------------------------------
// Relative / absolute references
// ---------------------------------------------------------------------------

interface Ref {
  col: number; // 0 = A
  row: number;
  absCol: boolean;
  absRow: boolean;
}

const refText = (r: Ref): string => `${r.absCol ? '$' : ''}${colLetter(r.col)}${r.absRow ? '$' : ''}${r.row}`;

function shiftRef(r: Ref, dc: number, dr: number, mode: 'correct' | 'all' | 'inverse'): Ref {
  const moveCol = mode === 'all' ? true : mode === 'correct' ? !r.absCol : r.absCol;
  const moveRow = mode === 'all' ? true : mode === 'correct' ? !r.absRow : r.absRow;
  return { ...r, col: r.col + (moveCol ? dc : 0), row: r.row + (moveRow ? dr : 0) };
}

const ANCHORS: ReadonlyArray<readonly [boolean, boolean]> = [
  [false, false],
  [true, true],
  [true, false],
  [false, true],
];

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

export default defineBank('computer', 'operating-systems', (b) => [
  b.dynamic('word-shortcut', { difficulty: 1, origin: 'past-paper', tags: ['word processing', 'Windows'] }, (r) => {
    const target = r.pick(SHORTCUTS);
    const others = r.sample(
      SHORTCUTS.filter((s) => s !== target && !clashes(s.keys, target.keys)),
      3,
    );
    if (r.chance(0.5)) {
      return {
        stem: `In MS Word, the keyboard shortcut **${target.keys}** is used to:`,
        answer: target.action,
        distractors: others.map((s) => s.action),
        explanation: `**${target.keys}** is used to ${target.action}. (${others
          .map((s) => `${s.keys} is used to ${s.action}`)
          .join('; ')}.)`,
      };
    }
    return {
      stem: `Which keyboard shortcut is used in MS Word to ${target.action}?`,
      answer: target.keys,
      distractors: others.map((s) => s.keys),
      explanation: `**${target.keys}** is used to ${target.action}. (${others
        .map((s) => `${s.keys} is used to ${s.action}`)
        .join('; ')}.)`,
    };
  }),

  b.dynamic('software-category', { difficulty: 1, tags: ['OS functions', 'word processing', 'spreadsheets', 'email and browsing'] }, (r) => {
    const [target, ...others] = r.sample(CATEGORIES, 4) as [Category, Category, Category, Category];
    const answer = r.pick(target.members);
    const wrong = others.map((c) => ({ item: r.pick(c.members), cat: c }));
    return {
      stem: `Which of the following is ${target.phrase}?`,
      answer,
      distractors: wrong.map((w) => w.item),
      explanation: `${answer} is ${target.phrase}; it ${target.note}. By contrast, ${wrong
        .map((w) => `${w.item} is ${w.cat.phrase}`)
        .join('; ')}.`,
    };
  }),

  b.dynamic('range-cell-count', { difficulty: 2, origin: 'past-paper', tags: ['spreadsheets'] }, (r) => {
    const c1 = r.int(0, 4);
    const nc = r.int(2, 5);
    const r1 = r.int(1, 12);
    const nr = r.int(2, 9);
    const c2 = c1 + nc - 1;
    const r2 = r1 + nr - 1;
    const range = `${colLetter(c1)}${r1}:${colLetter(c2)}${r2}`;
    const correct = nc * nr;
    const { answer, distractors } = numericOptions(r, {
      correct,
      // used differences instead of counts; added instead of multiplying; counted one dimension only partially
      wrong: [(nc - 1) * (nr - 1), nc + nr, nc * (nr - 1), (nc - 1) * nr],
      format: (x) => String(x),
      fallback: 'integer',
    });
    return {
      stem: `How many cells are included in the spreadsheet range ${code(range)}?`,
      answer,
      distractors,
      explanation: `Columns ${colLetter(c1)} to ${colLetter(c2)} give ${nc} columns and rows ${r1} to ${r2} give ${r2} − ${r1} + 1 = ${nr} rows, so the range has ${nc} × ${nr} = ${correct} cells.`,
    };
  }),

  b.dynamic('function-result', { difficulty: 2, origin: 'past-paper', tags: ['spreadsheets'] }, (r) => {
    const col = r.pick(['A', 'B', 'C', 'D']);
    const values = Array.from({ length: 6 }, () => r.int(2, 60));
    const len = r.int(3, 5);
    const start = r.int(1, 7 - len); // rows 1..6
    const fn = r.pick<Fn>(['SUM', 'AVERAGE', 'MAX', 'MIN']);
    const idx = (row: number) => row - 1;
    // Make the sub-range distinctive: AVERAGE must be a whole number; MAX/MIN unique in the sub-range.
    if (fn === 'AVERAGE') {
      const sub = values.slice(start - 1, start - 1 + len);
      const rem = sub.reduce((a, v) => a + v, 0) % len;
      if (rem !== 0) values[idx(start)] = (values[idx(start)] as number) + (len - rem);
    }
    const sub = values.slice(start - 1, start - 1 + len);
    const end = start + len - 1;
    // Ensure the whole-column value differs from the sub-range value so that slip is a real distractor.
    if (fn === 'MAX' && Math.max(...values) === Math.max(...sub)) {
      const outside = start > 1 ? 0 : 5;
      values[outside] = Math.max(...sub) + r.int(3, 20);
    }
    if (fn === 'MIN' && Math.min(...values) === Math.min(...sub)) {
      const outside = start > 1 ? 0 : 5;
      values[outside] = Math.max(1, Math.min(...sub) - r.int(1, 5));
      if (values[outside] === Math.min(...sub)) values[outside] = Math.min(...sub) - 1;
    }
    const subNow = values.slice(start - 1, start - 1 + len);
    const correct = applyFn(fn, subNow);
    const others = (['SUM', 'AVERAGE', 'MAX', 'MIN'] as Fn[]).filter((f) => f !== fn);
    const wrong = [applyFn(fn, values), ...others.map((f) => applyFn(f, subNow))].filter((x) => Number.isInteger(x));
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong,
      format: (x) => String(x),
      fallback: 'integer',
    });
    const formula = `=${fn}(${col}${start}:${col}${end})`;
    const listed = subNow.join(', ');
    const sum = subNow.reduce((a, v) => a + v, 0);
    const how =
      fn === 'SUM'
        ? `adds them: ${subNow.join(' + ')} = ${correct}`
        : fn === 'AVERAGE'
          ? `adds them and divides by the count: ${sum} ÷ ${len} = ${correct}`
          : fn === 'MAX'
            ? `returns the largest, ${correct}`
            : `returns the smallest, ${correct}`;
    return {
      stem: `Cells ${col}1 to ${col}6 of a worksheet contain the values shown below.${columnTable(col, 1, values)}What value is displayed by the formula ${code(formula)}?`,
      answer,
      distractors,
      explanation: `The range ${col}${start}:${col}${end} covers only rows ${start} to ${end}: ${listed}. ${fn} ${how}.`,
    };
  }),

  b.dynamic('formula-precedence', { difficulty: 2, tags: ['spreadsheets'] }, (r) => {
    const make = r.pick(PRECEDENCE);
    const c = r.int(2, 6);
    let a = r.int(2, 12);
    let bv = r.int(2, 12);
    let k: PrecedenceCase = make(r, a, bv, c);
    if (k.formula === '=A1+B1/C1') {
      // keep every value a whole number: A1 and B1 are multiples of C1
      a = c * r.int(1, 5);
      bv = c * r.int(2, 6);
      k = make(r, a, bv, c);
    }
    if (k.formula === '=A1-B1+C1' && a <= bv) {
      a = bv + r.int(3, 15);
      k = make(r, a, bv, c);
    }
    if (k.formula === '=A1^2-B1*C1' && a * a <= bv * c) {
      a = Math.ceil(Math.sqrt(bv * c)) + r.int(1, 4);
      k = make(r, a, bv, c);
    }
    const { answer, distractors } = numericOptions(r, {
      correct: k.correct,
      wrong: k.wrong.filter((x) => Number.isInteger(x)),
      format: (x) => String(x),
      fallback: 'integer',
      allowNegative: true,
    });
    return {
      stem: `In MS Excel, cell A1 contains ${a}, B1 contains ${bv} and C1 contains ${c}. What value is displayed by the formula ${code(k.formula)}?`,
      answer,
      distractors,
      explanation: k.working,
    };
  }),

  b.dynamic('copy-formula-references', { difficulty: 3, tags: ['spreadsheets'] }, (r) => {
    let refs: [Ref, Ref];
    do {
      const [ac1, ar1] = r.pick(ANCHORS);
      const [ac2, ar2] = r.pick(ANCHORS);
      refs = [
        { col: r.int(0, 3), row: r.int(1, 9), absCol: ac1, absRow: ar1 },
        { col: r.int(0, 3), row: r.int(1, 9), absCol: ac2, absRow: ar2 },
      ];
    } while (
      (refs[0].absCol && refs[0].absRow && refs[1].absCol && refs[1].absRow) ||
      (!refs[0].absCol && !refs[0].absRow && !refs[1].absCol && !refs[1].absRow) ||
      (refs[0].col === refs[1].col && refs[0].row === refs[1].row)
    );
    const op = r.pick(['+', '*', '-']);
    const srcCol = r.int(4, 6); // E..G
    const srcRow = r.int(1, 9);
    const dc = r.int(1, 3);
    const dr = r.int(1, 6);
    const src = `${colLetter(srcCol)}${srcRow}`;
    const dst = `${colLetter(srcCol + dc)}${srcRow + dr}`;
    const render = (mode: 'correct' | 'all' | 'inverse' | 'none'): string => {
      const [p, q] = refs.map((x) => (mode === 'none' ? x : shiftRef(x, dc, dr, mode)));
      return `=${refText(p as Ref)}${op}${refText(q as Ref)}`;
    };
    const rowsOnly = `=${refs.map((x) => refText({ ...x, row: x.row + (x.absRow ? 0 : dr) })).join(op)}`;
    const colsOnly = `=${refs.map((x) => refText({ ...x, col: x.col + (x.absCol ? 0 : dc) })).join(op)}`;
    const answerText = render('correct');
    const answer = code(answerText);
    const steps = refs
      .map((x) => `${code(refText(x))} → ${code(refText(shiftRef(x, dc, dr, 'correct')))}`)
      .join(', ');
    const distractors = pickDistractors(
      answer,
      [render('all'), render('none'), render('inverse'), rowsOnly, colsOnly].map(code),
    );
    return {
      stem: `Cell ${src} contains the formula ${code(render('none'))}. If this formula is copied to cell ${dst}, the formula in ${dst} becomes:`,
      answer,
      distractors,
      explanation: `Copying from ${src} to ${dst} moves ${dc} ${dc === 1 ? 'column' : 'columns'} right and ${dr} ${dr === 1 ? 'row' : 'rows'} down. A part preceded by a dollar sign (absolute) stays fixed; every other column letter shifts by ${dc} and every other row number by ${dr}: ${steps}. Hence the formula becomes ${answer}.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'os-is-interface',
      d: 1,
      o: 'past-paper',
      t: ['OS functions'],
      q: 'An operating system mainly acts as an interface between:',
      a: 'the user and the computer hardware',
      x: ['the CPU and the main memory', 'two computers on a network', 'the compiler and the source program'],
      e: 'The operating system sits between the user (and application programs) and the hardware, managing resources and hiding hardware details. The CPU and memory communicate over buses, not through the OS acting as an interface.',
    },
    {
      id: 'not-an-os-function',
      d: 1,
      t: ['OS functions'],
      q: 'Which of the following is NOT a function of an operating system?',
      a: 'Checking the grammar of a document',
      x: ['Managing main memory', 'Scheduling processes on the CPU', 'Organising files and folders'],
      e: 'Memory management, process scheduling and file management are core OS functions. Grammar checking is a feature of application software such as a word processor.',
    },
    {
      id: 'warm-boot',
      d: 2,
      t: ['OS functions', 'Windows'],
      q: 'Restarting a computer that is already switched on, without turning its power off, is called:',
      a: 'warm booting',
      x: ['cold booting', 'formatting', 'defragmenting'],
      e: 'Warm booting restarts a running computer (for example with the Restart command) without cutting power. Cold booting starts it from a powered-off state; formatting and defragmenting are disk operations.',
    },
    {
      id: 'shift-delete',
      d: 2,
      t: ['Windows'],
      q: 'In Windows, selecting a file on the hard disk and pressing Shift + Delete:',
      a: 'deletes the file without sending it to the Recycle Bin',
      x: [
        'moves the file to the Recycle Bin',
        'copies the file to the clipboard',
        'renames the file to a backup name',
      ],
      e: 'Delete alone moves a file to the Recycle Bin, from where it can be restored. Shift + Delete bypasses the Recycle Bin and removes the file directly.',
    },
    {
      id: 'bcc-hidden',
      d: 1,
      o: 'past-paper',
      t: ['email and browsing'],
      q: 'In an e-mail message, the addresses written in which field are hidden from the other recipients?',
      a: 'BCC',
      x: ['CC', 'To', 'Subject'],
      e: 'BCC (blind carbon copy) recipients receive the message, but their addresses are not shown to anyone else. Addresses in To and CC are visible to all recipients.',
    },
    {
      id: 'url-domain-name',
      d: 1,
      t: ['email and browsing'],
      q: 'In the web address `https://www.example.edu.pk/admissions`, the part `example.edu.pk` is the:',
      a: 'domain name',
      x: ['protocol', 'file path', 'IP address'],
      e: '`https` is the protocol, `example.edu.pk` (with the host `www`) is the domain name, and `/admissions` is the path on the server. An IP address is numeric, such as 192.168.1.1.',
    },
    {
      id: 'mail-merge',
      d: 1,
      o: 'past-paper',
      t: ['word processing'],
      q: 'The MS Word feature used to send the same letter to many people, each copy carrying a different name and address, is:',
      a: 'Mail Merge',
      x: ['Track Changes', 'Thesaurus', 'Page Setup'],
      e: 'Mail Merge combines a main document with a data source (list of names and addresses) to produce a personalised copy for each record.',
    },
    {
      id: 'div-zero-error',
      d: 2,
      t: ['spreadsheets'],
      q: 'In MS Excel, the formula `=A1/B1` displays the error `#DIV/0!` when:',
      a: 'cell B1 is empty or contains 0',
      x: ['cell A1 is empty or contains 0', 'the column is too narrow to show the result', 'cell A1 contains a negative number'],
      e: 'Excel treats an empty cell as 0, so dividing by an empty or zero B1 gives `#DIV/0!`. A zero numerator simply gives 0, and a narrow column shows `#####`.',
    },
  ]),
]);
