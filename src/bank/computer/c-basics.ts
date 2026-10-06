/**
 * C Programming: Basics and I/O (ICS Part II Computer Science, legacy NET syllabus).
 *
 * Output questions show the code in a ```c block and compute the expected output here
 * with C semantics: integer division truncates, `*` `/` `%` share one precedence level
 * and associate left to right, a post-increment yields the old value, and `printf`
 * rounds (never truncates) to the requested precision. Every snippet is free of
 * undefined behaviour: no variable is modified twice, or both read and modified, in
 * one expression, and no printed value sits on a rounding tie.
 */
import { defineBank } from '@/engine/authoring';
import { numericOptions, pickDistractors, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** A fenced C code block. */
const cBlock = (lines: readonly string[]): string => ['```c', ...lines, '```'].join('\n');

/** An inline code span. */
const code = (text: string | number): string => `\`${text}\``;

/** A stem that introduces the code, shows it, and ends with the question. */
const codeStem = (lines: readonly string[], ask = 'What is the output?'): string =>
  `Consider the following C code:\n\n${cBlock(lines)}\n\n${ask}`;

/** C integer division of non-negative ints (truncates). */
const idiv = (a: number, b: number): number => Math.trunc(a / b);

/** `scaled` = value x 10^dp (a non-negative integer) written with exactly `dp` decimals. */
function fixedPoint(scaled: number, dp: number): string {
  if (dp === 0) return String(scaled);
  const digits = String(scaled).padStart(dp + 1, '0');
  return `${digits.slice(0, -dp)}.${digits.slice(-dp)}`;
}

/** Rounds `scaled` (value x 10^from) to `to` decimals, half up; returns value x 10^to. */
function roundScaled(scaled: number, from: number, to: number): number {
  const factor = 10 ** (from - to);
  const kept = Math.floor(scaled / factor);
  return 2 * (scaled - kept * factor) >= factor ? kept + 1 : kept;
}

/** A value with `whole` before the point and four decimals, as an integer x 10^4. */
const fourDecimals = (whole: number, digits: readonly number[]): number =>
  digits.reduce((acc, d) => acc * 10 + d, whole);

// ---------------------------------------------------------------------------
// Integer expressions (precedence, integer division, remainder, relational values)
// ---------------------------------------------------------------------------

interface ExprCase {
  vars: ReadonlyArray<readonly [string, number]>;
  expr: string;
  correct: number;
  /** Results of typical mistakes, best first. */
  wrong: number[];
  explanation: string;
  /** Extra constraints that make the instance a good question. */
  ok: boolean;
}

function mulModCase(r: Rng): ExprCase {
  const a = r.int(2, 20);
  const b = r.int(2, 9);
  const c = r.int(3, 9);
  const d = r.int(3, 8);
  const bc = b * c;
  const rem = bc % d;
  return {
    vars: [['a', a], ['b', b], ['c', c], ['d', d]],
    expr: 'a + b * c % d',
    correct: a + rem,
    wrong: [
      ((a + b) * c) % d, // evaluated strictly left to right
      a + b * (c % d), // took % before *
      (a + bc) % d, // added before taking the remainder
    ],
    explanation: `${code('*')} and ${code('%')} have the same precedence, higher than ${code('+')}, and are applied left to right: ${code(`${b} * ${c}`)} = ${bc}, then ${code(`${bc} % ${d}`)} = ${rem}, and finally ${code(`${a} + ${rem}`)} = ${a + rem}.`,
    ok: rem !== 0 && bc > d,
  };
}

function divMulCase(r: Rng): ExprCase {
  const b = r.int(2, 7);
  const a = r.int(b + 1, 40);
  const c = r.int(2, 6);
  const d = r.int(1, 9);
  const q = idiv(a, b);
  return {
    vars: [['a', a], ['b', b], ['c', c], ['d', d]],
    expr: 'a / b * c + d',
    correct: q * c + d,
    wrong: [
      idiv(a * c, b) + d, // algebra habit: a/b*c = ac/b
      idiv(a, b * c) + d, // multiplied before dividing
      q * (c + d), // added before multiplying
    ],
    explanation: `${code('/')} and ${code('*')} have the same precedence and are applied left to right, before ${code('+')}. Both operands are ${code('int')}, so ${code(`${a} / ${b}`)} is integer division and gives ${q} (the fraction is discarded). Then ${code(`${q} * ${c}`)} = ${q * c} and ${code(`${q * c} + ${d}`)} = ${q * c + d}.`,
    ok: a % b !== 0,
  };
}

function modSubCase(r: Rng): ExprCase {
  const c = r.int(3, 7);
  const b = r.int(c + 1, 30);
  const d = r.int(2, 5);
  const rem = b % c;
  const a = r.int(Math.max(b, rem * d) + 1, 60);
  return {
    vars: [['a', a], ['b', b], ['c', c], ['d', d]],
    expr: 'a - b % c * d',
    correct: a - rem * d,
    wrong: [
      a - (b % (c * d)), // multiplied before taking the remainder
      a - idiv(b, c) * d, // used the quotient instead of the remainder
      ((a - b) % c) * d, // evaluated strictly left to right
    ],
    explanation: `${code('%')} and ${code('*')} have the same precedence, higher than ${code('-')}, and are applied left to right: ${code(`${b} % ${c}`)} = ${rem}, then ${code(`${rem} * ${d}`)} = ${rem * d}, and finally ${code(`${a} - ${rem * d}`)} = ${a - rem * d}.`,
    ok: rem !== 0 && idiv(b, c) !== rem,
  };
}

const isUsable = (ex: ExprCase): boolean =>
  ex.ok &&
  ex.correct >= 0 &&
  ex.wrong.every((w) => w >= 0 && w !== ex.correct) &&
  new Set(ex.wrong).size === ex.wrong.length;

function expressionQuestion(r: Rng, make: (r: Rng) => ExprCase): AuthoredQuestion {
  let ex = make(r);
  for (let tries = 0; tries < 60 && !isUsable(ex); tries++) ex = make(r);
  const { answer, distractors } = numericOptions(r, {
    correct: ex.correct,
    wrong: ex.wrong,
    format: code,
    allowZero: true,
  });
  const decl = `int ${ex.vars.map(([name, value]) => `${name} = ${value}`).join(', ')};`;
  return {
    stem: codeStem([decl, `printf("%d", ${ex.expr});`]),
    answer,
    distractors,
    explanation: ex.explanation,
  };
}

type RelOp = '>' | '<' | '>=' | '<=' | '==' | '!=';
const REL_OPS: readonly RelOp[] = ['>', '<', '>=', '<=', '==', '!='];

function relHolds(x: number, op: RelOp, y: number): boolean {
  switch (op) {
    case '>':
      return x > y;
    case '<':
      return x < y;
    case '>=':
      return x >= y;
    case '<=':
      return x <= y;
    case '==':
      return x === y;
    case '!=':
      return x !== y;
  }
}

function relationalSumQuestion(r: Rng): AuthoredQuestion {
  const value = { a: r.int(1, 9), b: r.int(1, 9), c: r.int(1, 9) };
  const negateAt = r.chance(0.4) ? r.int(0, 2) : -1;
  const pairs = r.shuffle([['a', 'b'], ['b', 'c'], ['a', 'c']] as const);
  const terms = pairs.map(([p, q], i) => {
    const [x, y] = r.chance(0.5) ? [p, q] : [q, p];
    const op = r.pick(REL_OPS);
    const holds = relHolds(value[x], op, value[y]) ? 1 : 0;
    const negated = i === negateAt;
    const result = negated ? 1 - holds : holds;
    const withNumbers = `${value[x]} ${op} ${value[y]}`;
    return {
      src: negated ? `!(${x} ${op} ${y})` : `(${x} ${op} ${y})`,
      why: negated
        ? `${code(`!(${withNumbers})`)} = ${result} because ${code(withNumbers)} is ${holds}`
        : `${code(`(${withNumbers})`)} = ${result}`,
      result,
    };
  });
  const total = terms.reduce((sum, t) => sum + t.result, 0);
  return {
    stem: codeStem([
      `int a = ${value.a}, b = ${value.b}, c = ${value.c};`,
      `printf("%d", ${terms.map((t) => t.src).join(' + ')});`,
    ]),
    answer: code(total),
    distractors: [0, 1, 2, 3].filter((v) => v !== total).map(code),
    explanation: `In C a relational or logical expression has the value 1 when it is true and 0 when it is false: ${terms.map((t) => t.why).join(', ')}. The sum is ${terms.map((t) => t.result).join(' + ')} = ${total}.`,
  };
}

// ---------------------------------------------------------------------------
// Increment and decrement
// ---------------------------------------------------------------------------

type Step = 'post++' | 'pre++' | 'post--' | 'pre--';
const STEPS: readonly Step[] = ['post++', 'pre++', 'post--', 'pre--'];

const isPost = (s: Step): boolean => s.startsWith('post');
const stepOp = (s: Step): string => (s.endsWith('++') ? '++' : '--');
const stepSrc = (v: string, s: Step): string => (isPost(s) ? `${v}${stepOp(s)}` : `${stepOp(s)}${v}`);
const stepFlip = (s: Step): Step => `${isPost(s) ? 'pre' : 'post'}${stepOp(s)}` as Step;
const stepName = (s: Step): string => `${isPost(s) ? 'post' : 'pre'}-${s.endsWith('++') ? 'increment' : 'decrement'}`;

/** Value the expression yields and the variable's value afterwards. */
function applyStep(value: number, s: Step): { used: number; after: number } {
  const after = value + (s.endsWith('++') ? 1 : -1);
  return { used: isPost(s) ? value : after, after };
}

function stepStory(v: string, s: Step, before: number, after: number): string {
  return isPost(s)
    ? `${code(stepSrc(v, s))} is a ${stepName(s)}: the old value ${before} is used, then ${v} becomes ${after}`
    : `${code(stepSrc(v, s))} is a ${stepName(s)}: ${v} first becomes ${after} and that value is used`;
}

// ---------------------------------------------------------------------------
// printf with floating-point values
// ---------------------------------------------------------------------------

function precisionQuestion(r: Rng): AuthoredQuestion {
  const p = r.int(1, 3);
  const whole = r.int(1, 99);
  const digits = [r.int(0, 9), r.int(0, 9), r.int(0, 9), r.int(1, 9)];
  digits[p] = r.int(6, 9); // the first dropped digit forces rounding up (never a tie)
  const scaled = fourDecimals(whole, digits);
  const written = fixedPoint(scaled, 4);
  const shown = fixedPoint(roundScaled(scaled, 4, p), p);
  const candidates = [
    fixedPoint(Math.floor(scaled / 10 ** (4 - p)), p), // truncated instead of rounded
    p < 3 ? fixedPoint(roundScaled(scaled, 4, p + 1), p + 1) : written, // one place too many
    fixedPoint(scaled * 100, 6), // ignored the precision (default six places)
    written, // printed the literal as written
  ];
  const answer = code(shown);
  return {
    stem: codeStem([`float x = ${written};`, `printf("%.${p}f", x);`]),
    answer,
    distractors: pickDistractors(answer, candidates.map(code)),
    explanation: `${code(`%.${p}f`)} prints exactly ${p} digit${p > 1 ? 's' : ''} after the decimal point and rounds the value; it does not simply cut off the extra digits. The first dropped digit of ${written} is ${digits[p]} (5 or more), so the value is rounded up and printed as ${code(shown)}.`,
  };
}

function defaultPrecisionQuestion(r: Rng): AuthoredQuestion {
  const whole = r.int(1, 99);
  const hundredths = r.pick([25, 50, 75]); // exact in binary, so no representation error
  const scaled = whole * 100 + hundredths;
  const written = hundredths === 50 ? fixedPoint(scaled / 10, 1) : fixedPoint(scaled, 2);
  const shown = fixedPoint(scaled * 10000, 6);
  const exp = whole >= 10 ? 1 : 0;
  const sciForm = `${fixedPoint(scaled * 10 ** (4 - exp), 6)}e+0${exp}`;
  const answer = code(shown);
  return {
    stem: codeStem([`float x = ${written};`, 'printf("%f", x);']),
    answer,
    distractors: pickDistractors(
      answer,
      [written, fixedPoint(scaled, 2), sciForm, fixedPoint(scaled * 100, 4)].map(code),
    ),
    explanation: `When no precision is given, ${code('%f')} prints six digits after the decimal point, so ${written} is printed as ${code(shown)}. The exponent form ${code(sciForm)} would come from ${code('%e')}, not ${code('%f')}.`,
  };
}

function fieldWidthQuestion(r: Rng): AuthoredQuestion {
  const p = r.int(1, 3);
  const whole = r.int(1, 99);
  const digits = [r.int(0, 9), r.int(0, 9), r.int(0, 9), r.int(1, 9)];
  digits[p] = r.intExcept(p === 3 ? 1 : 0, 9, [5]); // no rounding tie
  const scaled = fourDecimals(whole, digits);
  const shown = fixedPoint(roundScaled(scaled, 4, p), p);
  const len = shown.length;
  const intDigits = shown.indexOf('.');
  const width = r.int(len + 1, Math.min(12, len + 5));
  const spaces = width - len;
  const { answer, distractors } = numericOptions(r, {
    correct: spaces,
    wrong: [
      spaces + 1, // forgot that the decimal point takes a column
      width - intDigits, // read the width as places before the point
      spaces + intDigits, // forgot to count the digits before the point
      spaces - 1,
    ],
    format: (v) => String(v),
  });
  return {
    stem: codeStem(
      [`float x = ${fixedPoint(scaled, 4)};`, `printf("%${width}.${p}f", x);`],
      'How many blank spaces are printed before the first digit?',
    ),
    answer,
    distractors,
    explanation: tex`${code(`%${width}.${p}f`)} prints the value rounded to ${p} decimal place${p > 1 ? 's' : ''}, ${code(shown)}, right-aligned in a field ${width} characters wide. ${code(shown)} occupies ${len} characters (the decimal point counts as one), so $${width} - ${len} = ${spaces}$ blank space${spaces > 1 ? 's are' : ' is'} printed before it.`,
  };
}

// ---------------------------------------------------------------------------
// Characters and ASCII codes
// ---------------------------------------------------------------------------

const letterAt = (index: number, upper: boolean): string => String.fromCharCode((upper ? 65 : 97) + index);

function charCodeQuestion(r: Rng): AuthoredQuestion {
  const upper = r.chance(0.6);
  const idx = r.int(1, 25);
  const k = r.int(1, 5);
  const first = upper ? 65 : 97;
  const ch = letterAt(idx, upper);
  const base = first + idx;
  const correct = base + k;
  const { answer, distractors } = numericOptions(r, {
    correct,
    wrong: [
      correct + 1, // counted the letter's position from 1
      upper ? correct + 32 : correct - 32, // mixed up upper- and lowercase codes
      idx + 1 + k, // used the position in the alphabet
      correct - 1,
    ],
    format: code,
  });
  return {
    stem: codeStem([`char ch = '${ch}';`, `printf("%d", ch + ${k});`]),
    answer,
    distractors,
    explanation: `A ${code('char')} is stored as its ASCII code, and ${code('%d')} prints that code as a number. ${code(`'${letterAt(0, upper)}'`)} is ${first} and ${ch} comes ${idx} letter${idx > 1 ? 's' : ''} after ${letterAt(0, upper)}, so ${code(`'${ch}'`)} is ${first} + ${idx} = ${base}. Hence ${code(`ch + ${k}`)} = ${base} + ${k} = ${correct}.`,
  };
}

function charShiftQuestion(r: Rng): AuthoredQuestion {
  const upper = r.chance(0.6);
  const k = r.int(1, 5);
  const idx = r.int(0, 24 - k);
  const ch = letterAt(idx, upper);
  const base = (upper ? 65 : 97) + idx;
  const result = letterAt(idx + k, upper);
  const answer = code(result);
  return {
    stem: codeStem([`char ch = '${ch}';`, `printf("%c", ch + ${k});`]),
    answer,
    distractors: pickDistractors(answer, [
      code(letterAt(idx + k + 1, upper)), // counted one letter too many
      code(letterAt(idx + k - 1, upper)), // counted one letter too few
      code(base + k), // printed the code, as %d would
    ]),
    explanation: `${code('%c')} prints the character whose ASCII code is the value of ${code(`ch + ${k}`)}. ${code(`'${ch}'`)} has code ${base}, and ${base} + ${k} = ${base + k} is the code of ${code(`'${result}'`)}, the letter ${k} place${k > 1 ? 's' : ''} after ${ch}.`,
  };
}

function digitCharQuestion(r: Rng): AuthoredQuestion {
  const digit = r.int(0, 9);
  const k = r.int(1, 4);
  const ascii = 48 + digit;
  const correct = ascii + k;
  const { answer, distractors } = numericOptions(r, {
    correct,
    wrong: [
      digit + k, // treated the character '6' as the number 6
      65 + digit + k, // started the digits at 65 like the letters
      correct + 1, // took '0' as 49
    ],
    format: code,
  });
  return {
    stem: codeStem([`char d = '${digit}';`, `printf("%d", d + ${k});`]),
    answer,
    distractors,
    explanation: `${code(`'${digit}'`)} is a character, not the number ${digit}. Digit characters have consecutive ASCII codes starting at ${code("'0'")} = 48, so ${code(`'${digit}'`)} = 48 + ${digit} = ${ascii} and ${code(`d + ${k}`)} = ${ascii} + ${k} = ${correct}. (The numeric value of the digit would be ${code("d - '0'")}.)`,
  };
}

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

const NAME_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['total', 'marks'],
  ['net', 'salary'],
  ['roll', 'no'],
  ['first', 'name'],
  ['unit', 'price'],
  ['max', 'speed'],
  ['avg', 'score'],
  ['tax', 'rate'],
  ['gross', 'pay'],
  ['room', 'area'],
  ['student', 'age'],
  ['book', 'count'],
  ['bill', 'amount'],
  ['final', 'grade'],
];

const C_KEYWORDS = [
  'int', 'float', 'char', 'double', 'long', 'short', 'void', 'return', 'while', 'switch',
  'case', 'default', 'const', 'static', 'struct', 'goto', 'unsigned', 'signed', 'sizeof',
  'break', 'continue', 'else', 'register', 'extern', 'union', 'enum', 'typedef', 'auto',
] as const;

const capitalise = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

type NamePair = readonly [string, string];

const VALID_NAME_FORMS: ReadonlyArray<(r: Rng, pair: NamePair) => string> = [
  (_r, [a, b]) => `${a}_${b}`,
  (_r, [a, b]) => `${a}${capitalise(b)}`,
  (_r, [a]) => `_${a}`,
  (r, [a]) => `${a}${r.int(1, 9)}`,
  (_r, [a, b]) => `${a.toUpperCase()}_${b.toUpperCase()}`,
];

const INVALID_NAME_FORMS: ReadonlyArray<(r: Rng, pair: NamePair) => { name: string; why: string }> = [
  (r, [a]) => ({ name: `${r.int(1, 9)}${a}`, why: 'begins with a digit' }),
  (_r, [a, b]) => ({ name: `${a} ${b}`, why: 'contains a blank space' }),
  (_r, [a, b]) => ({ name: `${a}-${b}`, why: 'contains a hyphen, which C reads as the minus operator' }),
  (r, [a, b]) => {
    const symbol = r.pick(['#', '@', '%', '&', '.']);
    return { name: `${a}${symbol}${b}`, why: `contains the special character ${code(symbol)}` };
  },
  (r) => ({ name: r.pick(C_KEYWORDS), why: 'is a reserved keyword' }),
];

// ---------------------------------------------------------------------------
// Escape sequences
// ---------------------------------------------------------------------------

interface EscapeInfo {
  seq: string;
  name: string;
  use: string;
  group: 'cursor' | 'print' | 'other';
}

const ESCAPES: readonly EscapeInfo[] = [
  { seq: '\\n', name: 'newline', use: 'move the cursor to the start of the next line', group: 'cursor' },
  { seq: '\\t', name: 'horizontal tab', use: 'move the cursor to the next tab stop', group: 'cursor' },
  { seq: '\\r', name: 'carriage return', use: 'move the cursor to the start of the current line', group: 'cursor' },
  { seq: '\\b', name: 'backspace', use: 'move the cursor back by one position', group: 'cursor' },
  { seq: '\\a', name: 'alert (bell)', use: 'produce a beep (alert) sound', group: 'other' },
  { seq: '\\0', name: 'null character', use: 'mark the end of a string', group: 'other' },
  { seq: '\\f', name: 'form feed', use: 'advance the printer paper to the next page', group: 'other' },
  { seq: '\\\\', name: 'backslash', use: 'print a backslash character', group: 'print' },
  { seq: '\\"', name: 'double quote', use: 'print a double quotation mark', group: 'print' },
  { seq: "\\'", name: 'single quote', use: 'print a single quotation mark', group: 'print' },
];

/** Other escape sequences, the same group (most confusable) first. */
function escapeRivals(r: Rng, target: EscapeInfo): EscapeInfo[] {
  const others = ESCAPES.filter((e) => e !== target);
  return [...r.shuffle(others.filter((e) => e.group === target.group)), ...r.shuffle(others.filter((e) => e.group !== target.group))];
}

// ---------------------------------------------------------------------------
// printf format specifiers and Turbo C type sizes
// ---------------------------------------------------------------------------

interface SpecInfo {
  spec: string;
  shows: string;
  group: 'integer' | 'real' | 'text';
}

// %i and %u are left out on purpose: each would be a second correct answer for some item.
const PRINTF_SPECS: readonly SpecInfo[] = [
  { spec: '%d', shows: 'a signed integer in decimal form', group: 'integer' },
  { spec: '%o', shows: 'an integer in octal form', group: 'integer' },
  { spec: '%x', shows: 'an integer in hexadecimal form', group: 'integer' },
  { spec: '%f', shows: 'a floating-point number in decimal (fixed-point) notation', group: 'real' },
  { spec: '%e', shows: 'a floating-point number in exponential (scientific) notation', group: 'real' },
  { spec: '%c', shows: 'a single character', group: 'text' },
  { spec: '%s', shows: 'a string (a sequence of characters)', group: 'text' },
];

/** Sizes in Turbo C (16-bit). `long` and `long double` are left out: their sizes differ between compilers. */
const TURBO_C_SIZES: ReadonlyArray<{ type: string; bytes: number; wrong: readonly number[] }> = [
  { type: 'char', bytes: 1, wrong: [2, 4, 8] },
  { type: 'int', bytes: 2, wrong: [1, 4, 8] },
  { type: 'float', bytes: 4, wrong: [8, 2, 1] },
  { type: 'double', bytes: 8, wrong: [4, 10, 2] },
];

const bytesText = (n: number): string => `${n} byte${n === 1 ? '' : 's'}`;

// ---------------------------------------------------------------------------
// The chapter
// ---------------------------------------------------------------------------

type DivForm = 'int' | 'cast-after' | 'times-after' | 'cast-first' | 'cast-divisor' | 'times-before';

export default defineBank('computer', 'c-basics', (b) => [
  b.dynamic('integer-expression-output', { difficulty: 2, origin: 'past-paper', tags: ['operators'] }, (r) => {
    const form = r.pick(['mul-mod', 'div-mul', 'mod-sub', 'relational'] as const);
    if (form === 'relational') return relationalSumQuestion(r);
    return expressionQuestion(r, form === 'mul-mod' ? mulModCase : form === 'div-mul' ? divMulCase : modSubCase);
  }),

  b.dynamic('increment-decrement-output', { difficulty: 3, origin: 'past-paper', tags: ['operators'] }, (r) => {
    const [u, v] = r.pick([['x', 'y'], ['a', 'b'], ['m', 'n'], ['p', 'q']] as const);
    const x0 = r.int(3, 12);
    const s1 = r.pick(STEPS);
    const op1 = r.pick(['+', '*'] as const);
    const k1 = r.int(2, 5);
    const s2 = r.pick(STEPS);
    const op2 = r.pick(['+', '-'] as const);

    const first = (step: Step) => {
      const { used, after } = applyStep(x0, step);
      return { used, after, y: op1 === '+' ? used + k1 : used * k1 };
    };
    const right = first(s1);
    const flipped = first(stepFlip(s1));
    // Keep every printed value (right or mistaken) positive.
    const k2 = op2 === '+' ? r.int(1, 9) : r.int(1, Math.min(9, Math.min(right.y, flipped.y) - 2));

    const run = (flip1: boolean, flip2: boolean, forgetY: boolean): string => {
      const y1 = (flip1 ? flipped : right).y;
      const second = applyStep(y1, flip2 ? stepFlip(s2) : s2);
      const x2 = op2 === '+' ? second.used + k2 : second.used - k2;
      return code(`${x2} ${forgetY ? y1 : second.after}`);
    };

    const line1 = `${v} = ${stepSrc(u, s1)} ${op1} ${k1};`;
    const line2 = `${u} = ${stepSrc(v, s2)} ${op2} ${k2};`;
    const second = applyStep(right.y, s2);
    const x2 = op2 === '+' ? second.used + k2 : second.used - k2;
    const answer = run(false, false, false);
    return {
      stem: codeStem([`int ${u} = ${x0}, ${v};`, line1, line2, `printf("%d %d", ${u}, ${v});`]),
      answer,
      distractors: pickDistractors(answer, [
        run(true, false, false), // swapped pre/post in the first statement
        run(false, true, false), // swapped pre/post in the second statement
        run(false, false, true), // forgot that the second statement changes the variable
        run(true, true, false),
        run(true, false, true),
      ]),
      explanation: [
        tex`In ${code(line1)}, ${stepStory(u, s1, x0, right.after)}. So $${v} = ${right.used} ${op1 === '*' ? '\\times' : '+'} ${k1} = ${right.y}$.`,
        tex`In ${code(line2)}, ${stepStory(v, s2, right.y, second.after)}. So $${u} = ${second.used} ${op2} ${k2} = ${x2}$, and ${v} is now ${second.after}.`,
        `The output is ${answer}.`,
      ].join('\n'),
    };
  }),

  b.dynamic('float-format-output', { difficulty: 2, tags: ['printf and scanf'] }, (r) => {
    const form = r.weighted(['precision', 'default', 'width'] as const, [2, 1, 2]);
    if (form === 'precision') return precisionQuestion(r);
    if (form === 'default') return defaultPrecisionQuestion(r);
    return fieldWidthQuestion(r);
  }),

  b.dynamic('char-ascii-output', { difficulty: 2, tags: ['data types'] }, (r) => {
    const form = r.weighted(['code', 'shift', 'digit'] as const, [2, 1, 1]);
    if (form === 'code') return charCodeQuestion(r);
    if (form === 'shift') return charShiftQuestion(r);
    return digitCharQuestion(r);
  }),

  b.dynamic('integer-division-to-float', { difficulty: 3, tags: ['data types', 'operators'] }, (r) => {
    const [A, B, C] = r.pick([['a', 'b', 'c'], ['sum', 'n', 'avg'], ['total', 'count', 'mean'], ['x', 'y', 'z']] as const);
    const bv = r.pick([2, 4, 5]); // a / b then has at most two decimals and is never a rounding tie
    const av = r.pick(Array.from({ length: 29 - bv }, (_, i) => bv + 1 + i).filter((n) => n % bv !== 0));
    const form = r.weighted<DivForm>(
      ['int', 'cast-after', 'times-after', 'cast-first', 'cast-divisor', 'times-before'],
      [3, 1, 1, 2, 1, 1],
    );
    const src: Record<DivForm, string> = {
      int: `${A} / ${B}`,
      'cast-after': `(float)(${A} / ${B})`,
      'times-after': `${A} / ${B} * 1.0`,
      'cast-first': `(float)${A} / ${B}`,
      'cast-divisor': `${A} / (float)${B}`,
      'times-before': `1.0 * ${A} / ${B}`,
    };
    const q = idiv(av, bv);
    const exact = av / bv;
    const truncated = form === 'int' || form === 'cast-after' || form === 'times-after';
    const shown = truncated ? q.toFixed(2) : exact.toFixed(2);
    const answer = code(shown);
    const candidates = truncated
      ? [exact.toFixed(2), Math.round(exact).toFixed(2), String(q), q.toFixed(6), String(exact)]
      : [q.toFixed(2), Math.round(exact).toFixed(2), String(exact), String(q), exact.toFixed(6)];
    const why: Record<DivForm, string> = {
      int: `Both ${code(A)} and ${code(B)} are ${code('int')}, so ${code(`${A} / ${B}`)} is integer division: ${code(`${av} / ${bv}`)} = ${q}, and the fraction is discarded before the result is stored. ${code(C)} receives ${q}.0`,
      'cast-after': `The cast applies to the result of ${code(`${A} / ${B}`)}, and that integer division has already given ${code(`${av} / ${bv}`)} = ${q}. Converting ${q} to ${code('float')} gives ${q}.0`,
      'times-after': `${code('/')} and ${code('*')} have equal precedence and are applied left to right, so the integer division ${code(`${av} / ${bv}`)} = ${q} happens first; multiplying by ${code('1.0')} afterwards only gives ${q}.0`,
      'cast-first': `${code(`(float)${A}`)} converts ${code(A)} to ${av}.0 before the division, so the division is done in floating point: ${av}.0 / ${bv} = ${exact}`,
      'cast-divisor': `Casting ${code(B)} to ${code('float')} makes the division a floating-point division: ${av} / ${bv}.0 = ${exact}`,
      'times-before': `${code(`1.0 * ${A}`)} is evaluated first and gives the double ${av}.0, so the division that follows is a real division: ${av}.0 / ${bv} = ${exact}`,
    };
    return {
      stem: codeStem([`int ${A} = ${av}, ${B} = ${bv};`, `float ${C};`, `${C} = ${src[form]};`, `printf("%.2f", ${C});`]),
      answer,
      distractors: pickDistractors(answer, candidates.map(code)),
      explanation: `${why[form]}, which ${code('%.2f')} prints with two decimals as ${answer}.`,
    };
  }),

  b.dynamic('valid-identifier', { difficulty: 1, origin: 'past-paper', tags: ['variables and constants'] }, (r) => {
    const pairs = r.sample(NAME_PAIRS, 4);
    const pair = (i: number): NamePair => pairs[i] as NamePair;
    if (r.chance(0.6)) {
      const answer = r.pick(VALID_NAME_FORMS)(r, pair(0));
      const bad = r.sample(INVALID_NAME_FORMS, 3).map((make, i) => make(r, pair(i + 1)));
      return {
        stem: 'Which of the following is a valid identifier (variable name) in C?',
        answer: code(answer),
        distractors: bad.map((x) => code(x.name)),
        explanation: `An identifier may contain only letters, digits and the underscore, must not begin with a digit and must not be a keyword. ${code(answer)} obeys every rule, while ${bad.map((x) => `${code(x.name)} ${x.why}`).join('; ')}.`,
      };
    }
    const wrong = r.pick(INVALID_NAME_FORMS)(r, pair(0));
    const good = r.sample(VALID_NAME_FORMS, 3).map((make, i) => make(r, pair(i + 1)));
    return {
      stem: 'Which of the following is **not** a valid identifier in C?',
      answer: code(wrong.name),
      distractors: good.map(code),
      explanation: `${code(wrong.name)} is not valid because it ${wrong.why}. The others are valid: an identifier may begin with a letter or an underscore and may contain letters, digits and underscores, in upper or lower case.`,
    };
  }),

  b.dynamic('escape-sequence-purpose', { difficulty: 1, origin: 'past-paper', tags: ['escape sequences'] }, (r) => {
    const target = r.pick(ESCAPES);
    const rivals = escapeRivals(r, target);
    const describe = (e: EscapeInfo): string => `${code(e.seq)} (${e.name}) is used to ${e.use}`;
    const direction = r.weighted(['which', 'meaning', 'name'] as const, [4, 4, 2]);
    if (direction === 'name') {
      const chosen = rivals.slice(0, 3);
      return {
        stem: `The escape sequence ${code(target.seq)} is known as the:`,
        answer: target.name,
        distractors: chosen.map((e) => e.name),
        explanation: `${code(target.seq)} is the ${target.name}; it is used to ${target.use}. The other names belong to ${chosen.map((e) => `${code(e.seq)} (${e.name})`).join(', ')}.`,
      };
    }
    if (direction === 'which') {
      const answer = code(target.seq);
      const letter = target.seq.slice(1);
      const slashed = /^[ntrbaf0]$/.test(letter) && r.chance(0.35) ? `/${letter}` : null;
      const chosen = [...(slashed ? [slashed] : []), ...rivals.map((e) => e.seq)].slice(0, 3);
      const notes = chosen.map((s) => {
        const info = ESCAPES.find((e) => e.seq === s);
        return info ? describe(info) : `${code(s)} is not an escape sequence at all, since escape sequences begin with a backslash`;
      });
      return {
        stem: `Which escape sequence is used to ${target.use}?`,
        answer,
        distractors: chosen.map(code),
        explanation: `${code(target.seq)} is the ${target.name} escape sequence, used to ${target.use}. By contrast, ${notes.join('; ')}.`,
      };
    }
    const chosen = rivals.slice(0, 3);
    return {
      stem: `In C, the escape sequence ${code(target.seq)} is used to:`,
      answer: target.use,
      distractors: chosen.map((e) => e.use),
      explanation: `${code(target.seq)} is the ${target.name} escape sequence, so it is used to ${target.use}. The other options describe ${chosen.map((e) => `${code(e.seq)} (${e.name})`).join(', ')}.`,
    };
  }),

  b.dynamic('printf-format-specifier', { difficulty: 1, tags: ['printf and scanf'] }, (r) => {
    const target = r.pick(PRINTF_SPECS);
    const others = PRINTF_SPECS.filter((s) => s !== target);
    const chosen = [
      ...r.shuffle(others.filter((s) => s.group === target.group)),
      ...r.shuffle(others.filter((s) => s.group !== target.group)),
    ].slice(0, 3);
    const notes = `${code(target.spec)} displays ${target.shows}, while ${chosen.map((s) => `${code(s.spec)} displays ${s.shows}`).join('; ')}.`;
    if (r.chance(0.5)) {
      return {
        stem: `Which format specifier is used in ${code('printf()')} to display ${target.shows}?`,
        answer: code(target.spec),
        distractors: chosen.map((s) => code(s.spec)),
        explanation: notes,
      };
    }
    return {
      stem: `In ${code('printf()')}, the format specifier ${code(target.spec)} is used to display:`,
      answer: target.shows,
      distractors: chosen.map((s) => s.shows),
      explanation: notes,
    };
  }),

  b.dynamic('turbo-c-type-size', { difficulty: 1, tags: ['data types'] }, (r) => {
    const target = r.pick(TURBO_C_SIZES);
    const table = `In Turbo C (a 16-bit compiler) a ${code('char')} occupies 1 byte, an ${code('int')} 2 bytes, a ${code('float')} 4 bytes and a ${code('double')} 8 bytes.`;
    const intNote = target.type === 'int' ? ` (Modern 32- and 64-bit compilers give an ${code('int')} 4 bytes, but the question asks about Turbo C.)` : '';
    if (r.chance(0.5)) {
      return {
        stem: `In Turbo C, how much memory does a variable of type ${code(target.type)} occupy?`,
        answer: bytesText(target.bytes),
        distractors: target.wrong.map(bytesText),
        explanation: `${table}${intNote}`,
      };
    }
    return {
      stem: `In Turbo C, which data type occupies ${bytesText(target.bytes)} of memory?`,
      answer: code(target.type),
      distractors: TURBO_C_SIZES.filter((t) => t !== target).map((t) => code(t.type)),
      explanation: `${table}${intNote}`,
    };
  }),

  ...b.mcqs([
    {
      id: 'c-language-developer',
      d: 1,
      o: 'past-paper',
      t: ['program structure'],
      q: 'The C programming language was developed by:',
      a: 'Dennis Ritchie',
      x: ['Bjarne Stroustrup', 'James Gosling', 'Niklaus Wirth'],
      e: 'Dennis Ritchie developed C at AT&T Bell Laboratories in 1972, mainly to write the UNIX operating system. Bjarne Stroustrup created C++, James Gosling created Java and Niklaus Wirth created Pascal.',
    },
    {
      id: 'stdio-header',
      d: 1,
      t: ['program structure', 'printf and scanf'],
      q: 'The library functions `printf()` and `scanf()` are declared in the header file:',
      a: '`stdio.h`',
      x: ['`conio.h`', '`math.h`', '`string.h`'],
      e: '`stdio.h` (the standard input/output header) declares `printf()` and `scanf()`, which is why such programs begin with `#include <stdio.h>`. `conio.h` declares console functions such as `getch()` and `clrscr()` in Turbo C, `math.h` declares `sqrt()` and `pow()`, and `string.h` declares `strlen()` and `strcpy()`.',
    },
    {
      id: 'program-structure-facts',
      d: 1,
      t: ['program structure'],
      q: 'Which of the following statements about a C program is correct?',
      a: 'Execution always begins with the `main()` function',
      x: [
        'A program may contain two `main()` functions',
        'A `#include` directive must end with a semicolon',
        'Keywords may be written in capital letters',
      ],
      e: 'Every C program has exactly one `main()` function, and execution starts there. Preprocessor directives such as `#include` are not statements, so they take no semicolon, and C is case-sensitive: keywords are always written in lowercase (`int`, not `INT`).',
    },
    {
      id: 'statement-terminator',
      d: 1,
      t: ['program structure'],
      q: 'In C, a statement such as `x = 5` or `printf("Hi")` must end with a:',
      a: 'semicolon (`;`)',
      x: ['colon (`:`)', 'full stop (`.`)', 'comma (`,`)'],
      e: 'The semicolon is the statement terminator in C: a simple statement such as an assignment or a function call ends with `;`, and leaving it out is a syntax error. Preprocessor directives such as `#include <stdio.h>` are not statements, so they take no semicolon.',
    },
    {
      id: 'scanf-address-operator',
      d: 1,
      t: ['printf and scanf', 'operators'],
      q: 'In the statement `scanf("%d", &marks);`, the symbol `&` written before `marks` is the:',
      a: 'address-of operator',
      x: ['logical AND operator', 'indirection (value-at) operator', 'assignment operator'],
      e: '`scanf()` must know where in memory to store the value it reads, so it is given the address of `marks`; the unary `&` (address-of operator) supplies that address. Leaving out the `&` is a common error. The logical AND operator is `&&`, the indirection operator is `*` and the assignment operator is `=`.',
    },
    {
      id: 'scanf-double-specifier',
      d: 2,
      t: ['printf and scanf'],
      q: 'Which format specifier should be used in `scanf()` to read a value into a variable of type `double`?',
      a: '`%lf`',
      x: ['`%f`', '`%ld`', '`%d`'],
      e: 'In `scanf()` the specifier must match the type of the variable whose address is passed: `%lf` reads a `double`, `%f` a `float`, `%d` an `int` and `%ld` a `long int`. Reading a `double` with `%f` is a common mistake that stores a wrong value.',
    },
    {
      id: 'remainder-operand-types',
      d: 2,
      t: ['operators'],
      q: 'In C, the remainder operator `%` can be used with:',
      a: 'integer operands only',
      x: ['floating-point operands only', 'both integer and floating-point operands', 'positive integer operands only'],
      e: 'The `%` operator gives the remainder of an integer division, so both operands must be integers (`int`, `long`, `char` and so on), positive or negative. An expression such as `7.5 % 2` is a compile-time error; the library function `fmod()` from `math.h` gives the remainder for floating-point values.',
    },
    {
      id: 'int-range-16-bit',
      d: 2,
      o: 'past-paper',
      t: ['data types'],
      q: 'In Turbo C an `int` occupies 2 bytes. The range of values that a signed `int` can store is:',
      a: tex`$-32768$ to $32767$`,
      x: [tex`$-32767$ to $32768$`, tex`$0$ to $65535$`, tex`$-65536$ to $65535$`],
      e: tex`Two bytes are 16 bits. In two's complement a signed 16-bit integer ranges from $-2^{15} = -32768$ to $2^{15} - 1 = 32767$. The range $0$ to $2^{16} - 1 = 65535$ belongs to an ${code('unsigned int')}.`,
    },
    {
      id: 'string-constant-bytes',
      d: 2,
      t: ['variables and constants', 'escape sequences'],
      q: 'How many bytes of memory are needed to store the string constant `"Hi\\tAli\\n"`?',
      a: '8',
      x: ['7', '10', '9'],
      e: 'Each escape sequence is a single character, and the compiler adds the null character `\\0` at the end of every string constant. The characters are H, i, `\\t`, A, l, i, `\\n` and `\\0`: 8 characters of 1 byte each, so 8 bytes.',
    },
    {
      id: 'carriage-return-display',
      d: 2,
      t: ['escape sequences'],
      q: 'What is displayed on the screen when the statement `printf("MANGO\\rTA");` is executed?',
      a: '`TANGO`',
      x: ['`MANGOTA`', '`TAMANGO`', '`TA`'],
      e: '`\\r` (carriage return) moves the cursor back to the start of the same line without erasing anything. The characters `TA` are then written over the first two characters `MA`, so the screen shows `TANGO`.',
    },
    {
      id: 'octal-hex-constants',
      d: 3,
      t: ['variables and constants'],
      q: 'Consider the following C code:\n\n```c\nint a = 010, b = 0x10;\nprintf("%d", a + b);\n```\n\nWhat is the output?',
      a: '`24`',
      x: ['`20`', '`26`', '`18`'],
      e: tex`An integer constant that begins with ${code(0)} is octal and one that begins with ${code('0x')} is hexadecimal. So ${code('010')} $= 1 \times 8 = 8$ and ${code('0x10')} $= 1 \times 16 = 16$, and ${code('a + b')} $= 8 + 16 = 24$. Reading ${code('010')} as decimal ten (which gives 26) is the usual trap.`,
    },
  ]),
]);
