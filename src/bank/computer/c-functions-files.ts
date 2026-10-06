/**
 * C Programming: Functions, Arrays and Files (ICS Part II Computer Science).
 *
 * Output-tracing templates compute the true output in JavaScript, mirroring C semantics:
 * `*`, `/` and `%` bind tighter than `+` and `-` and associate left to right, `/` between
 * two ints truncates, scalar arguments are passed by value, an automatic local is created
 * afresh on every call while a `static` local keeps its value, an array argument is the
 * address of its first element, 2-D arrays are stored row by row and strings end with the
 * null character. Every distractor is the output of a named, typical mistake, and parameters
 * are re-drawn whenever two options would look alike.
 *
 * Conceptual items cover parameters, prototypes, local-variable lifetime, string handling
 * and file handling (FILE pointers, fopen() modes and its failure value, the file I/O functions).
 */
import { defineBank } from '@/engine/authoring';
import { listText, normalizeOption, ordinal } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Lead-in, a fenced C block (indent with spaces: the validator rejects TABs), then the question. */
function codeStem(lead: string, lines: readonly string[], question: string): string {
  return [lead, '', '```c', ...lines, '```', '', question].join('\n');
}

/** The first three candidates that look different from the answer and from each other, or null. */
function firstDistinct(answer: string, candidates: readonly string[]): string[] | null {
  const seen = new Set([normalizeOption(answer)]);
  const picked: string[] = [];
  for (const candidate of candidates) {
    const key = normalizeOption(candidate);
    if (!candidate.trim() || seen.has(key)) continue;
    seen.add(key);
    picked.push(candidate);
    if (picked.length === 3) return picked;
  }
  return null;
}

/**
 * Calls `attempt` until it yields a question. An attempt returns null when its parameters
 * would make two options coincide. Only the template's rng is used, so this is deterministic.
 */
function retry(attempt: () => AuthoredQuestion | null): AuthoredQuestion {
  for (let i = 0; i < 200; i++) {
    const question = attempt();
    if (question) return question;
  }
  throw new Error('c-functions-files: no valid parameters found');
}

/** Integers from `from` to `to` inclusive; a negative `step` counts down. */
function range(from: number, to: number, step = 1): number[] {
  const out: number[] = [];
  if (step > 0) for (let i = from; i <= to; i += step) out.push(i);
  else for (let i = from; i >= to; i += step) out.push(i);
  return out;
}

const total = (values: readonly number[]): number => values.reduce((s, v) => s + v, 0);

/** C division of two non-negative ints: the fraction is discarded. */
const idiv = (x: number, y: number): number => Math.trunc(x / y);

const PROGRAM = 'Consider the following C program:';
const FRAGMENT = 'Consider the following code fragment:';
const WHAT_OUTPUT = 'What is its output?';
const WHAT_PRINTS = 'What does it print?';

// ---------------------------------------------------------------------------
// 1. Output of a program that calls a user-defined function
// ---------------------------------------------------------------------------

interface ReturnExpression {
  /** Body of `return ...;`, written with the parameters a and b. */
  body: string;
  /** The evaluation rule the item tests (completes "Since ..."). */
  rule: string;
  ok: (p: number, q: number) => boolean;
  value: (p: number, q: number) => number;
  /** Results of typical slips, most tempting first. */
  slips: (p: number, q: number) => number[];
  /** Step-by-step evaluation for the explanation. */
  steps: (p: number, q: number) => string;
}

const RETURN_EXPRESSIONS: readonly ReturnExpression[] = [
  {
    body: 'a + b * a - b',
    rule: '`*` is applied before `+` and `-`',
    ok: (p, q) => p > q,
    value: (p, q) => p + q * p - q,
    // evaluated strictly left to right; arguments swapped; read as (a + b) * (a - b)
    slips: (p, q) => [(p + q) * p - q, q + p * q - p, (p + q) * (p - q)],
    steps: (p, q) => `${p} + ${q} * ${p} - ${q} = ${p} + ${q * p} - ${q} = ${p + q * p - q}`,
  },
  {
    body: '(a + b) / 2 * a',
    rule: '`/` and `*` have equal precedence and work left to right, and `/` between two ints discards the fraction',
    ok: (p, q) => (p + q) % 2 === 1,
    value: (p, q) => idiv(p + q, 2) * p,
    // multiplied before dividing (or kept the .5 until %d dropped it); rounded the half up;
    // took 2 * a as the divisor; arguments swapped. (A non-integer can never come from %d.)
    slips: (p, q) => [idiv((p + q) * p, 2), (idiv(p + q, 2) + 1) * p, idiv(p + q, 2 * p), idiv(p + q, 2) * q],
    steps: (p, q) => `(${p} + ${q}) / 2 * ${p} = ${p + q} / 2 * ${p} = ${idiv(p + q, 2)} * ${p} = ${idiv(p + q, 2) * p}`,
  },
  {
    body: 'a % b * 2 + b',
    rule: '`%` and `*` have equal precedence and work left to right, before `+`',
    ok: (p, q) => p > q && p % q !== 0,
    value: (p, q) => (p % q) * 2 + q,
    // % read as /; * applied before %; arguments swapped
    slips: (p, q) => [idiv(p, q) * 2 + q, (p % (2 * q)) + q, (q % p) * 2 + p],
    steps: (p, q) => `${p} % ${q} * 2 + ${q} = ${p % q} * 2 + ${q} = ${(p % q) * 2} + ${q} = ${(p % q) * 2 + q}`,
  },
];

function returnExpressionQuestion(r: Rng): AuthoredQuestion | null {
  const e = r.pick(RETURN_EXPRESSIONS);
  const p = r.int(3, 15);
  const q = r.int(2, 9);
  if (!e.ok(p, q)) return null;
  const answer = String(e.value(p, q));
  const distractors = firstDistinct(answer, e.slips(p, q).map(String));
  if (!distractors) return null;
  // Passing main's variables in crossed order tests that arguments match by position, not name.
  const byName = r.chance(0.4);
  const main = byName
    ? [`    int a = ${q}, b = ${p};`, '    printf("%d", calc(b, a));']
    : [`    printf("%d", calc(${p}, ${q}));`];
  const binding = byName
    ? `Arguments are matched by position, not by name: \`calc(b, a)\` passes main's \`b\` (${p}) as the first argument, so inside \`calc()\` a = ${p} and b = ${q}.`
    : `Inside \`calc()\`, a = ${p} and b = ${q}.`;
  const lines = [
    '#include <stdio.h>',
    'int calc(int a, int b)',
    '{',
    `    return ${e.body};`,
    '}',
    'int main()',
    '{',
    ...main,
    '    return 0;',
    '}',
  ];
  return {
    stem: codeStem(PROGRAM, lines, WHAT_OUTPUT),
    answer,
    distractors,
    explanation: `${binding} Since ${e.rule}, the function returns ${e.steps(p, q)}, and \`printf()\` prints ${answer}.`,
  };
}

interface LoopFunction {
  name: string;
  body: string;
  f: (n: number) => number;
  maxN: number;
}

const LOOP_FUNCTIONS: readonly LoopFunction[] = [
  { name: 'square', body: 'n * n', f: (n) => n * n, maxN: 6 },
  { name: 'cube', body: 'n * n * n', f: (n) => n * n * n, maxN: 5 },
  { name: 'twice', body: '2 * n', f: (n) => 2 * n, maxN: 9 },
  { name: 'odd', body: '2 * n - 1', f: (n) => 2 * n - 1, maxN: 9 },
];

function loopCallsQuestion(r: Rng): AuthoredQuestion | null {
  const fn = r.pick(LOOP_FUNCTIONS);
  const n = r.int(3, fn.maxN);
  const inclusive = r.chance(0.5);
  const visited = range(1, inclusive ? n : n - 1);
  const misjudged = range(1, inclusive ? n - 1 : n);
  const last = visited[visited.length - 1] as number;
  const terms = visited.map(fn.f);
  const answer = String(total(terms));
  const distractors = firstDistinct(
    answer,
    [
      total(misjudged.map(fn.f)), // misjudged the loop bound by one
      fn.f(last), // kept only the value of the last call
      total(visited), // added i instead of the returned values
      fn.f(total(visited)), // applied the function to the sum of i
    ].map(String),
  );
  if (!distractors) return null;
  const cond = inclusive ? `i <= ${n}` : `i < ${n}`;
  const lines = [
    '#include <stdio.h>',
    `int ${fn.name}(int n)`,
    '{',
    `    return ${fn.body};`,
    '}',
    'int main()',
    '{',
    '    int i, sum = 0;',
    `    for (i = 1; ${cond}; i++)`,
    `        sum = sum + ${fn.name}(i);`,
    '    printf("%d", sum);',
    '    return 0;',
    '}',
  ];
  return {
    stem: codeStem(PROGRAM, lines, WHAT_OUTPUT),
    answer,
    distractors,
    explanation: `The loop runs for i = ${visited.join(', ')}; the condition \`${cond}\` fails when i becomes ${last + 1}. Each call \`${fn.name}(i)\` returns ${fn.body.replace(/n/g, 'i')}, and the returned values are added: sum = ${terms.join(' + ')} = ${answer}.`,
  };
}

function nestedCallQuestion(r: Rng): AuthoredQuestion | null {
  const name = r.pick(['f', 'fun', 'calc']);
  const m = r.pick([2, 3]);
  const k = r.nonZero(-4, 6);
  const x = r.int(2, 9);
  const f = (v: number): number => m * v + k;
  const misread = (v: number): number => m * (v + k); // added before multiplying
  const inner = f(x);
  const result = f(inner);
  const slips = [
    inner, // applied the function only once
    m * inner, // dropped the constant in the outer call
    misread(misread(x)), // ignored the precedence of * over + / -
  ];
  if (inner <= 0 || result <= 0 || slips.some((v) => v <= 0)) return null;
  const answer = String(result);
  const distractors = firstDistinct(answer, slips.map(String));
  if (!distractors) return null;
  const sign = k > 0 ? '+' : '-';
  const body = `${m} * x ${sign} ${Math.abs(k)}`;
  const step = (v: number): string => `${m} * ${v} ${sign} ${Math.abs(k)} = ${f(v)}`;
  const lines = [
    '#include <stdio.h>',
    `int ${name}(int x)`,
    '{',
    `    return ${body};`,
    '}',
    'int main()',
    '{',
    `    printf("%d", ${name}(${name}(${x})));`,
    '    return 0;',
    '}',
  ];
  return {
    stem: codeStem(PROGRAM, lines, WHAT_OUTPUT),
    answer,
    distractors,
    explanation: `The inner call is evaluated first: ${name}(${x}) = ${step(x)}. Its result becomes the argument of the outer call: ${name}(${inner}) = ${step(inner)}. So the program prints ${answer}.`,
  };
}

function floatReturnQuestion(r: Rng): AuthoredQuestion | null {
  const places = r.pick([1, 2]);
  const format = `%.${places}f`;
  const pair = r.chance(0.5);
  const a = r.int(3, 25);
  const b = r.int(2, 20);
  const dividend = pair ? a + b : a;
  if (dividend % 2 === 0) return null;
  const whole = idiv(dividend, 2);
  const answer = whole.toFixed(places);
  const distractors = firstDistinct(answer, [
    (dividend / 2).toFixed(places), // forgot that int / int truncates
    String(whole), // ignored the %.nf format
    (whole + 1).toFixed(places), // rounded the half up
  ]);
  if (!distractors) return null;
  const fn = pair
    ? ['float average(int a, int b)', '{', '    return (a + b) / 2;', '}']
    : ['float half(int n)', '{', '    return n / 2;', '}'];
  const call = pair ? `average(${a}, ${b})` : `half(${a})`;
  const division = pair ? `(a + b) / 2 = ${dividend} / 2` : `n / 2 = ${a} / 2`;
  const lines = ['#include <stdio.h>', ...fn, 'int main()', '{', `    printf("${format}", ${call});`, '    return 0;', '}'];
  return {
    stem: codeStem(PROGRAM, lines, WHAT_OUTPUT),
    answer,
    distractors,
    explanation: `Both operands of \`/\` are int, so ${division} = ${whole} by integer division; the fraction is lost before the value is converted to the float return type (${whole}.0). The format \`${format}\` prints it with ${places === 1 ? 'one decimal place' : 'two decimal places'}: ${answer}.`,
  };
}

// ---------------------------------------------------------------------------
// 2. Call by value
// ---------------------------------------------------------------------------

function modifyCopyQuestion(r: Rng): AuthoredQuestion | null {
  const [outer, inner] = r.pick([
    ['n', 'n'],
    ['x', 'x'],
    ['num', 'num'],
    ['x', 'y'],
    ['m', 'k'],
  ] as const);
  const name = r.pick(['update', 'change', 'modify']);
  const op = r.pick(['mul', 'add', 'mulAssign', 'addAssign'] as const);
  const multiply = op === 'mul' || op === 'mulAssign';
  const k = multiply ? r.int(2, 5) : r.int(2, 9);
  const v = r.int(2, 12);
  const changed = multiply ? v * k : v + k;
  const statement = {
    mul: `${inner} = ${inner} * ${k};`,
    add: `${inner} = ${inner} + ${k};`,
    mulAssign: `${inner} *= ${k};`,
    addAssign: `${inner} += ${k};`,
  }[op];
  const answer = `${changed} ${v}`;
  const distractors = firstDistinct(answer, [`${changed} ${changed}`, `${v} ${v}`, `${v} ${changed}`]);
  if (!distractors) return null;
  const lines = [
    '#include <stdio.h>',
    `void ${name}(int ${inner})`,
    '{',
    `    ${statement}`,
    `    printf("%d ", ${inner});`,
    '}',
    'int main()',
    '{',
    `    int ${outer} = ${v};`,
    `    ${name}(${outer});`,
    `    printf("%d", ${outer});`,
    '    return 0;',
    '}',
  ];
  const copy =
    outer === inner
      ? `its own parameter \`${inner}\`, a separate variable that only shares its name with \`${outer}\` of \`main()\``
      : `its parameter \`${inner}\``;
  return {
    stem: codeStem(PROGRAM, lines, WHAT_OUTPUT),
    answer,
    distractors,
    explanation: `C passes arguments by value: \`${name}()\` receives a copy of ${v} in ${copy}. The copy becomes ${changed} and is printed first; \`${outer}\` in \`main()\` is unchanged, so ${v} is printed next. Output: ${answer}`,
  };
}

function swapQuestion(r: Rng): AuthoredQuestion | null {
  const [x, y] = r.pick([
    ['x', 'y'],
    ['p', 'q'],
    ['m', 'n'],
  ] as const);
  const u = r.int(2, 30);
  const w = r.int(2, 30);
  if (u === w) return null;
  const printsInside = r.chance(0.5);
  const answer = printsInside ? `${w} ${u} ${u} ${w}` : `${u} ${w}`;
  const candidates = printsInside
    ? [`${w} ${u} ${w} ${u}`, `${u} ${w} ${u} ${w}`, `${u} ${w} ${w} ${u}`]
    : [`${w} ${u}`, `${w} ${w}`, `${u} ${u}`];
  const distractors = firstDistinct(answer, candidates);
  if (!distractors) return null;
  const lines = [
    '#include <stdio.h>',
    'void swap(int a, int b)',
    '{',
    '    int t = a;',
    '    a = b;',
    '    b = t;',
    ...(printsInside ? ['    printf("%d %d ", a, b);'] : []),
    '}',
    'int main()',
    '{',
    `    int ${x} = ${u}, ${y} = ${w};`,
    `    swap(${x}, ${y});`,
    `    printf("%d %d", ${x}, ${y});`,
    '    return 0;',
    '}',
  ];
  const explanation = printsInside
    ? `\`swap()\` works on copies: its a = ${u} and b = ${w} are exchanged, so it prints ${w} ${u}. The variables \`${x}\` and \`${y}\` of \`main()\` were passed by value and still hold ${u} and ${w}, which \`main()\` prints next. Output: ${answer}`
    : `\`swap()\` exchanges only its own copies a and b. Because \`${x}\` and \`${y}\` are passed by value, \`main()\` still has ${x} = ${u} and ${y} = ${w}, so it prints ${answer}. (To swap the caller's variables, their addresses must be passed: \`swap(&${x}, &${y})\` with pointer parameters.)`;
  return { stem: codeStem(PROGRAM, lines, WHAT_OUTPUT), answer, distractors, explanation };
}

// ---------------------------------------------------------------------------
// 3. Scope and lifetime: a local that hides a global, automatic vs static
// ---------------------------------------------------------------------------

function scopeLifetimeQuestion(r: Rng): AuthoredQuestion | null {
  const isStatic = r.chance(0.5);
  const v = r.pick(['count', 'num', 'total', 'x']);
  const name = r.pick(['show', 'display', 'tick', 'step']);
  const calls = r.int(2, 3);
  const g = r.int(30, 99);
  const l = r.int(0, 9);
  const op = r.pick(['add', 'addAssign', 'increment'] as const);
  const k = op === 'increment' ? 1 : r.int(2, 5);
  const statement = { add: `${v} = ${v} + ${k};`, addAssign: `${v} += ${k};`, increment: `${v}++;` }[op];
  const kept = range(1, calls).map((c) => l + c * k); // a static local keeps its value
  const fresh = range(1, calls).map(() => l + k); // an automatic local starts again each call
  const viaGlobal = range(1, calls).map((c) => g + c * k); // as if the global were changed
  const out = (values: readonly number[], last: number): string => [...values, last].join(' ');
  const answer = isStatic ? out(kept, g) : out(fresh, g);
  const candidates = isStatic
    ? [out(fresh, g), out(kept, l + calls * k), out(viaGlobal, g + calls * k)]
    : [out(kept, g), out(fresh, l + k), out(viaGlobal, g + calls * k)];
  const distractors = firstDistinct(answer, candidates);
  if (!distractors) return null;
  const lines = [
    '#include <stdio.h>',
    `int ${v} = ${g};`,
    `void ${name}()`,
    '{',
    `    ${isStatic ? 'static ' : ''}int ${v} = ${l};`,
    `    ${statement}`,
    `    printf("%d ", ${v});`,
    '}',
    'int main()',
    '{',
    ...range(1, calls).map(() => `    ${name}();`),
    `    printf("%d", ${v});`,
    '    return 0;',
    '}',
  ];
  const local = isStatic
    ? `Because it is \`static\`, it is initialised to ${l} only once and keeps its value between calls, so the ${calls} calls print ${kept.join(', ')}.`
    : `It is an automatic variable, created again with the value ${l} on every call, so each of the ${calls} calls prints ${l + k}.`;
  return {
    stem: codeStem(PROGRAM, lines, WHAT_OUTPUT),
    answer,
    distractors,
    explanation: `Inside \`${name}()\` the local \`${v}\` hides the global \`${v}\`. ${local} The global \`${v}\` is never changed, so \`main()\` prints ${g}. Output: ${answer}`,
  };
}

// ---------------------------------------------------------------------------
// 4. Array traversal
// ---------------------------------------------------------------------------

function strideSumQuestion(r: Rng): AuthoredQuestion | null {
  const n = r.pick([5, 6, 7]);
  const start = r.pick([0, 1]);
  const a = r.sample(range(1, 25), n);
  const used = range(start, n - 1, 2);
  const otherParity = range(1 - start, n - 1, 2);
  const lastUsed = used[used.length - 1] as number;
  const correct = total(used.map((i) => a[i] as number));
  const answer = String(correct);
  const distractors = firstDistinct(
    answer,
    [
      total(otherParity.map((i) => a[i] as number)), // counted positions from 1 instead of 0
      total(a), // ignored the step of 2
      correct - (a[lastUsed] as number), // stopped one step early
    ].map(String),
  );
  if (!distractors) return null;
  const lines = [
    `int a[${n}] = {${a.join(', ')}};`,
    'int i, s = 0;',
    `for (i = ${start}; i < ${n}; i += 2)`,
    '    s = s + a[i];',
    'printf("%d", s);',
  ];
  return {
    stem: codeStem(FRAGMENT, lines, WHAT_PRINTS),
    answer,
    distractors,
    explanation: `Subscripts start at 0. i takes the values ${used.join(', ')} (it starts at ${start}, grows by 2 and must stay below ${n}), so s = ${used.map((i) => `a[${i}]`).join(' + ')} = ${used.map((i) => a[i]).join(' + ')} = ${answer}.`,
  };
}

function nestedIndexQuestion(r: Rng): AuthoredQuestion | null {
  const a = r.shuffle(range(0, 5));
  const k = r.int(1, 5);
  const inner = a[k] as number;
  const answer = String(a[inner]);
  const prev = a[k - 1] as number;
  const candidates = [
    inner, // stopped after the inner subscript
    prev >= 1 ? (a[prev - 1] as number) : -1, // counted positions from 1 at both levels
    a.indexOf(k), // looked for the position that holds the value k
  ]
    .filter((v) => v >= 0)
    .map(String);
  const distractors = firstDistinct(answer, candidates);
  if (!distractors) return null;
  const lines = [`int a[6] = {${a.join(', ')}};`, `printf("%d", a[a[${k}]]);`];
  return {
    stem: codeStem(FRAGMENT, lines, WHAT_PRINTS),
    answer,
    distractors,
    explanation: `The inner subscript is evaluated first, counting from 0: a[${k}] = ${inner}. Then a[a[${k}]] = a[${inner}] = ${answer}.`,
  };
}

function reversePrintQuestion(r: Rng): AuthoredQuestion | null {
  const n = r.int(4, 6);
  const stop = r.pick([0, 1]);
  const a = r.sample(range(1, 30), n);
  const printed = range(n - 1, stop + 1, -1);
  const show = (indexes: readonly number[]): string => indexes.map((i) => a[i]).join(' ');
  const answer = show(printed);
  const distractors = firstDistinct(answer, [
    show(range(n - 1, stop, -1)), // also printed a[stop]
    show([...printed].reverse()), // printed in increasing order
    show(printed.map((i) => i - 1)), // treated a[i] as the i-th element (counting from 1)
  ]);
  if (!distractors) return null;
  const lines = [`int a[${n}] = {${a.join(', ')}};`, 'int i;', `for (i = ${n - 1}; i > ${stop}; i--)`, '    printf("%d ", a[i]);'];
  return {
    stem: codeStem(FRAGMENT, lines, WHAT_PRINTS),
    answer,
    distractors,
    explanation: `i starts at the last subscript ${n - 1} and decreases while i > ${stop}, so the loop prints a[${n - 1}] down to a[${stop + 1}]: ${answer}. It stops when i becomes ${stop}, so a[${stop}] is not printed.`,
  };
}

function rowMajorQuestion(r: Rng): AuthoredQuestion | null {
  const [rows, cols] = r.pick([
    [2, 3],
    [3, 3],
    [3, 4],
    [4, 3],
    [2, 4],
  ] as const);
  const values = r.sample(range(1, 60), rows * cols);
  const i = r.int(1, rows - 1);
  const j = r.int(1, cols - 1);
  const at = (pos: number): string => (pos >= 0 && pos < rows * cols ? String(values[pos]) : '');
  const pos = i * cols + j;
  const answer = at(pos);
  const distractors = firstDistinct(answer, [
    at(j * rows + i), // filled the array column by column
    at(i * rows + j), // used the number of rows as the row length
    at(pos - 1), // counted list positions from 1
    at((i - 1) * cols + (j - 1)), // counted subscripts from 1
  ]);
  if (!distractors) return null;
  const lines = [`int m[${rows}][${cols}] = {${values.join(', ')}};`, `printf("%d", m[${i}][${j}]);`];
  return {
    stem: codeStem(FRAGMENT, lines, WHAT_PRINTS),
    answer,
    distractors,
    explanation: `A 2-D array is filled row by row (row-major order), ${cols} values per row, and subscripts start at 0. So m[${i}][${j}] is at position ${i} × ${cols} + ${j} = ${pos} of the list counting from 0, i.e. the ${ordinal(pos + 1)} value: ${answer}.`,
  };
}

// ---------------------------------------------------------------------------
// 5. Array storage
// ---------------------------------------------------------------------------

const SIZED_TYPES = [
  { type: 'int', size: 2, article: 'an' },
  { type: 'int', size: 4, article: 'an' },
  { type: 'float', size: 4, article: 'a' },
  { type: 'double', size: 8, article: 'a' },
] as const;

const ARRAY_NAMES = ['marks', 'price', 'temp', 'score', 'data', 'value'] as const;

function arrayStorageQuestion(r: Rng): AuthoredQuestion | null {
  const kind = r.weighted(['bytes', 'chars', 'grid', 'subscripts', 'last'] as const, [3, 1, 2, 2, 2]);
  const name = r.pick(ARRAY_NAMES);
  const bytes = (v: number): string => `${v} bytes`;

  if (kind === 'bytes') {
    const t = r.pick(SIZED_TYPES);
    const n = r.int(5, 60);
    const size = n * t.size;
    const distractors = firstDistinct(
      bytes(size),
      [n, (n + 1) * t.size, (n - 1) * t.size, 2 * size].map(bytes), // forgot the element size; counted 0..n; n - 1 elements; doubled
    );
    if (!distractors) return null;
    return {
      stem: `If ${t.article} \`${t.type}\` occupies ${t.size} bytes, how much memory is reserved by the declaration \`${t.type} ${name}[${n}];\`?`,
      answer: bytes(size),
      distractors,
      explanation: `The array has ${n} elements (subscripts 0 to ${n - 1}) of ${t.size} bytes each: ${n} × ${t.size} = ${size} bytes.`,
    };
  }

  if (kind === 'chars') {
    const word = r.pick(['city', 'name', 'word', 'title']);
    const n = r.int(8, 40);
    const distractors = firstDistinct(bytes(n), [n + 1, 2 * n, n - 1].map(bytes));
    if (!distractors) return null;
    return {
      stem: `How much memory is reserved by the declaration \`char ${word}[${n}];\`?`,
      answer: bytes(n),
      distractors,
      explanation: `A \`char\` always occupies 1 byte, so ${n} elements need ${n} × 1 = ${n} bytes. No extra byte is added: a string stored in the array must fit its null character \`'\\0'\` inside these ${n} bytes.`,
    };
  }

  if (kind === 'grid') {
    const t = r.pick(SIZED_TYPES);
    const rows = r.int(2, 6);
    const cols = r.int(3, 10);
    const grid = r.pick(['table', 'grid', 'matrix', 'm']);
    const cells = rows * cols;
    const size = cells * t.size;
    const distractors = firstDistinct(
      bytes(size),
      [cells, (rows + cols) * t.size, (rows + 1) * (cols + 1) * t.size, 2 * size].map(bytes), // forgot the element size; added the dimensions; counted 0..n; doubled
    );
    if (!distractors) return null;
    return {
      stem: `If ${t.article} \`${t.type}\` occupies ${t.size} bytes, how much memory is reserved by the declaration \`${t.type} ${grid}[${rows}][${cols}];\`?`,
      answer: bytes(size),
      distractors,
      explanation: `A ${rows} × ${cols} array has ${rows} × ${cols} = ${cells} elements of ${t.size} bytes each: ${cells} × ${t.size} = ${size} bytes.`,
    };
  }

  const type = r.pick(['int', 'float', 'char', 'double']);
  const n = r.int(5, 50);
  if (kind === 'subscripts') {
    return {
      stem: `The valid subscripts of the array declared as \`${type} ${name}[${n}];\` are:`,
      answer: `0 to ${n - 1}`,
      distractors: [`1 to ${n}`, `0 to ${n}`, `1 to ${n - 1}`],
      explanation: `C array subscripts start at 0, so the ${n} elements are ${name}[0] to ${name}[${n - 1}]; ${name}[${n}] would lie just past the end of the array.`,
    };
  }
  return {
    stem: `Which expression refers to the last element of the array declared as \`${type} ${name}[${n}];\`?`,
    answer: `\`${name}[${n - 1}]\``,
    distractors: [`\`${name}[${n}]\``, `\`${name}[-1]\``, `\`${name}[${n + 1}]\``],
    explanation: `Subscripts run from 0 to ${n} - 1 = ${n - 1}, so the last element is ${name}[${n - 1}]. ${name}[${n}] and ${name}[${n + 1}] lie outside the array, and C has no negative subscripts that count from the end.`,
  };
}

// ---------------------------------------------------------------------------
// 6. String length and size
// ---------------------------------------------------------------------------

/** Plain words and phrases (letters and single spaces only) used as string literals. */
const STRINGS = [
  'Lahore',
  'Karachi',
  'Quetta',
  'Peshawar',
  'Islamabad',
  'Multan',
  'Hunza',
  'Skardu',
  'Sialkot',
  'Pakistan',
  'Computer',
  'Keyboard',
  'Compiler',
  'Program',
  'Network',
  'NUST',
  'Science',
  'Entry Test',
  'Hello World',
  'C Language',
  'Data File',
] as const;

function charCount(s: string): string {
  return s.includes(' ') ? `${s.length} characters (the space counts too)` : `${s.length} characters`;
}

function stringLengthSizeQuestion(r: Rng): AuthoredQuestion | null {
  const kind = r.pick(['sizeof-open', 'strlen-fixed', 'sizeof-fixed', 'strcat', 'strcpy'] as const);
  const s = r.pick(['s', 'str', 'city', 'word']);
  const w = r.pick(STRINGS);
  const len = w.length;
  const declared = r.pick([15, 20, 25, 30]);
  const declaration = 'Consider the following declaration:';
  const withString = 'Consider the following statements (assume `<string.h>` is included):';

  if (kind === 'sizeof-open') {
    const answer = String(len + 1);
    // forgot the null character; also counted the two quotes; 2-byte char; last subscript
    const distractors = firstDistinct(answer, [len, len + 2, 2 * (len + 1), len - 1].map(String));
    if (!distractors) return null;
    return {
      stem: codeStem(declaration, [`char ${s}[] = "${w}";`], `What is the value of \`sizeof(${s})\`?`),
      answer,
      distractors,
      explanation: `With the size left out, the array is made just large enough for "${w}", which has ${charCount(w)}, plus the terminating null character \`'\\0'\`. A \`char\` takes 1 byte, so sizeof(${s}) = ${len} + 1 = ${len + 1}.`,
    };
  }

  if (kind === 'strlen-fixed') {
    const answer = String(len);
    // gave the array size; counted the null character; last subscript of the array
    const distractors = firstDistinct(answer, [declared, len + 1, declared - 1].map(String));
    if (!distractors) return null;
    return {
      stem: codeStem(
        'Consider the following declaration (assume `<string.h>` is included):',
        [`char ${s}[${declared}] = "${w}";`],
        `What is the value of \`strlen(${s})\`?`,
      ),
      answer,
      distractors,
      explanation: `strlen() counts the characters before the terminating \`'\\0'\`; it does not count the null character, and the declared size ${declared} does not matter. "${w}" has ${charCount(w)}, so strlen(${s}) = ${len}.`,
    };
  }

  if (kind === 'sizeof-fixed') {
    const answer = String(declared);
    // gave the string length; length plus the null character; one more than declared
    const distractors = firstDistinct(answer, [len, len + 1, declared + 1].map(String));
    if (!distractors) return null;
    return {
      stem: codeStem(declaration, [`char ${s}[${declared}] = "${w}";`], `What is the value of \`sizeof(${s})\`?`),
      answer,
      distractors,
      explanation: `sizeof gives the memory reserved for the whole array, which the declaration fixes at ${declared} elements × 1 byte = ${declared} bytes, however short the stored string "${w}" is.`,
    };
  }

  const [w1, w2] = r.sample(STRINGS, 2) as [string, string];
  const l1 = w1.length;
  const l2 = w2.length;
  const size = r.pick([30, 40]);
  if (kind === 'strcat') {
    const answer = String(l1 + l2);
    // counted the null character; thought a was unchanged; gave the array size; took b alone
    const distractors = firstDistinct(answer, [l1 + l2 + 1, l1, size, l2].map(String));
    if (!distractors) return null;
    const lines = [`char a[${size}] = "${w1}";`, `char b[] = "${w2}";`, 'strcat(a, b);'];
    return {
      stem: codeStem(withString, lines, 'After these statements execute, what is the value of `strlen(a)`?'),
      answer,
      distractors,
      explanation: `strcat(a, b) appends a copy of b to the end of a: the null character of a is overwritten and a new one is placed after the joined text. a now holds "${w1}${w2}", so strlen(a) = ${l1} + ${l2} = ${l1 + l2}.`,
    };
  }

  if (l1 === l2) return null;
  const answer = String(l2);
  // treated strcpy like strcat; thought a was unchanged; gave the array size; counted the null
  const distractors = firstDistinct(answer, [l1 + l2, l1, size, l2 + 1].map(String));
  if (!distractors) return null;
  const lines = [`char a[${size}] = "${w1}";`, `strcpy(a, "${w2}");`];
  return {
    stem: codeStem(withString, lines, 'After these statements execute, what is the value of `strlen(a)`?'),
    answer,
    distractors,
    explanation: `strcpy() copies "${w2}" together with its null character over the beginning of a, replacing the old string "${w1}" rather than adding to it. strlen(a) stops at the new null character, so it is ${l2}.`,
  };
}

// ---------------------------------------------------------------------------
// 7. fopen() modes
// ---------------------------------------------------------------------------

interface FileMode {
  mode: string;
  /** Completes "Which mode ... to ...?". */
  purpose: string;
  /** Completes "... opens a file for:" (text modes only). */
  use?: string;
  /**
   * Modes that are definitely wrong for `purpose` (and whose `use` is definitely wrong for this
   * mode). Near-equivalents, such as "a+" for appending or "r+" for appending after fseek(),
   * are deliberately left out.
   */
  wrong: readonly [string, string, string];
  why: string;
}

const FILE_MODES: readonly FileMode[] = [
  {
    mode: 'r',
    purpose: 'read data from an existing text file without changing it',
    use: 'reading only; the file must already exist',
    wrong: ['w', 'a', 'w+'],
    why: 'Mode `"r"` opens an existing text file for reading only, and `fopen()` returns `NULL` if the file does not exist. `"w"` and `"w+"` would erase the file, and `"a"` only writes.',
  },
  {
    mode: 'w',
    purpose: 'write a fresh text file, discarding the old contents if the file already exists',
    use: 'writing only; any existing contents are erased',
    wrong: ['r', 'a', 'r+'],
    why: 'Mode `"w"` creates the file, or empties it if it already exists, and opens it for writing. `"a"` and `"r+"` keep the old contents, and `"r"` cannot write.',
  },
  {
    mode: 'a',
    purpose: 'add new data at the end of a text file while keeping its existing contents',
    use: 'writing only at the end; existing contents are kept',
    wrong: ['w', 'r', 'w+'],
    why: 'Mode `"a"` (append) opens the file for writing at its end, creating it if it is missing, and keeps the old data. `"w"` and `"w+"` erase the file, and `"r"` cannot write.',
  },
  {
    mode: 'r+',
    purpose: 'both read and modify an existing text file without erasing its contents',
    use: 'reading and writing; the file must already exist',
    wrong: ['w+', 'r', 'w'],
    why: 'Mode `"r+"` opens an existing file for both reading and writing and keeps its contents. `"w+"` and `"w"` erase the file first, and `"r"` cannot write.',
  },
  {
    mode: 'w+',
    purpose: 'create a text file that can be both written and read, discarding any old contents',
    use: 'reading and writing; any existing contents are erased',
    wrong: ['r+', 'a+', 'w'],
    why: 'Mode `"w+"` creates the file, or empties an existing one, for both writing and reading. `"r+"` and `"a+"` keep the old contents, and `"w"` cannot read.',
  },
  {
    mode: 'a+',
    purpose: 'read an existing text file and also add new data at its end, keeping the old contents',
    use: 'reading and appending; existing contents are kept',
    wrong: ['w+', 'a', 'r'],
    why: 'Mode `"a+"` allows reading while every write goes to the end of the file, so the old contents are kept. `"w+"` erases the file, `"a"` cannot read and `"r"` cannot write.',
  },
  {
    mode: 'rb',
    purpose: 'read an existing file in binary mode',
    wrong: ['r', 'wb', 'ab'],
    why: 'Adding `b` to a mode selects binary mode, so `"rb"` reads an existing file in binary mode. `"r"` opens it in text mode, while `"wb"` and `"ab"` are for writing.',
  },
  {
    mode: 'wb',
    purpose: 'create a file in binary mode for writing, discarding any old contents',
    wrong: ['w', 'rb', 'ab'],
    why: 'Mode `"wb"` creates (or empties) a file and writes to it in binary mode. `"w"` uses text mode, `"rb"` only reads and `"ab"` keeps the old contents.',
  },
];

const modeCode = (mode: string): string => `\`"${mode}"\``;

function fileModeQuestion(r: Rng): AuthoredQuestion {
  const entry = r.pick(FILE_MODES);
  const use = entry.use;
  if (use !== undefined && r.chance(0.4)) {
    const others = entry.wrong.map((m) => FILE_MODES.find((f) => f.mode === m)?.use ?? '');
    return {
      stem: `The mode ${modeCode(entry.mode)} in a call to \`fopen()\` opens a file for:`,
      answer: use,
      distractors: others,
      explanation: entry.why,
    };
  }
  return {
    stem: `Which mode should be passed to \`fopen()\` to ${entry.purpose}?`,
    answer: modeCode(entry.mode),
    distractors: entry.wrong.map(modeCode),
    explanation: entry.why,
  };
}

// ---------------------------------------------------------------------------
// 8. File input/output functions
// ---------------------------------------------------------------------------

interface FileFunction {
  name: string;
  /** Completes "Which function is used to ...?" and "The function ... is used to:". */
  to: string;
  /** The same purpose in the third person, for explanations. */
  does: string;
  /**
   * Functions that clearly cannot do `to`, and whose own `to` is clearly false for this one.
   * Same-direction functions are left out because they can often stand in (fprintf() with
   * %s writes a string; fgetc() returning EOF detects the end of a file).
   */
  wrong: readonly string[];
}

const FILE_FUNCTIONS: readonly FileFunction[] = [
  {
    name: 'fclose',
    to: 'close a file that was opened with `fopen()`',
    does: 'closes a file that was opened with `fopen()`',
    wrong: ['fgetc', 'fputs', 'feof', 'fprintf', 'fscanf'],
  },
  {
    name: 'fprintf',
    to: 'write formatted output (like `printf()`) to a file',
    does: 'writes formatted output to a file',
    wrong: ['fscanf', 'fgets', 'fgetc', 'feof', 'fclose'],
  },
  {
    name: 'fscanf',
    to: 'read formatted input (like `scanf()`) from a file',
    does: 'reads formatted input from a file',
    wrong: ['fprintf', 'fputs', 'fputc', 'fclose'],
  },
  {
    name: 'fgetc',
    to: 'read a single character from a file',
    does: 'reads a single character from a file',
    wrong: ['fputc', 'fputs', 'fprintf', 'fclose'],
  },
  {
    name: 'fputc',
    to: 'write a single character to a file',
    does: 'writes a single character to a file',
    wrong: ['fgetc', 'fgets', 'fscanf', 'fclose', 'feof'],
  },
  {
    name: 'fgets',
    to: 'read a line of text (a string) from a file',
    does: 'reads a line of text from a file',
    wrong: ['fputs', 'fputc', 'fprintf', 'fclose'],
  },
  {
    name: 'fputs',
    to: 'write a string to a file',
    does: 'writes a string to a file',
    wrong: ['fgets', 'fgetc', 'fscanf', 'fclose', 'feof'],
  },
  {
    name: 'feof',
    to: 'test whether the end of a file has been reached',
    does: 'tests whether the end of a file has been reached',
    wrong: ['fclose', 'fputc', 'fputs', 'fprintf'],
  },
];

function fileFunction(name: string): FileFunction {
  const found = FILE_FUNCTIONS.find((f) => f.name === name);
  if (!found) throw new Error(`c-functions-files: unknown file function ${name}`);
  return found;
}

function fileFunctionQuestion(r: Rng): AuthoredQuestion {
  const entry = r.pick(FILE_FUNCTIONS);
  const others = r.sample(entry.wrong, 3).map(fileFunction);
  const call = (f: FileFunction): string => `\`${f.name}()\``;
  const explanation = `${call(entry)} ${entry.does}. By contrast, ${listText(others.map((f) => `${call(f)} ${f.does}`))}.`;
  if (r.chance(0.5)) {
    return {
      stem: `In C file handling, the function ${call(entry)} is used to:`,
      answer: entry.to,
      distractors: others.map((f) => f.to),
      explanation,
    };
  }
  return {
    stem: `In C file handling, which function is used to ${entry.to}?`,
    answer: call(entry),
    distractors: others.map(call),
    explanation,
  };
}

// ---------------------------------------------------------------------------
// The chapter
// ---------------------------------------------------------------------------

export default defineBank('computer', 'c-functions-files', (b) => [
  b.dynamic('function-return-output', { difficulty: 2, origin: 'past-paper', tags: ['functions'] }, (r) => {
    const make = r.weighted(
      [returnExpressionQuestion, loopCallsQuestion, nestedCallQuestion, floatReturnQuestion],
      [3, 2, 2, 2],
    );
    return retry(() => make(r));
  }),

  b.dynamic('call-by-value-output', { difficulty: 2, origin: 'past-paper', tags: ['functions', 'scope'] }, (r) => {
    const make = r.weighted([modifyCopyQuestion, swapQuestion], [3, 2]);
    return retry(() => make(r));
  }),

  b.dynamic('scope-lifetime-output', { difficulty: 3, tags: ['scope'] }, (r) =>
    retry(() => scopeLifetimeQuestion(r)),
  ),

  b.dynamic('array-traversal-output', { difficulty: 2, tags: ['arrays'] }, (r) => {
    const make = r.pick([strideSumQuestion, nestedIndexQuestion, reversePrintQuestion, rowMajorQuestion]);
    return retry(() => make(r));
  }),

  b.dynamic('array-storage-size', { difficulty: 1, origin: 'past-paper', tags: ['arrays'] }, (r) =>
    retry(() => arrayStorageQuestion(r)),
  ),

  b.dynamic('string-length-size', { difficulty: 2, tags: ['strings'] }, (r) =>
    retry(() => stringLengthSizeQuestion(r)),
  ),

  b.dynamic('file-open-mode', { difficulty: 2, origin: 'past-paper', tags: ['file handling'] }, (r) =>
    fileModeQuestion(r),
  ),

  b.dynamic('file-io-function', { difficulty: 1, tags: ['file handling'] }, (r) => fileFunctionQuestion(r)),

  ...b.mcqs([
    {
      id: 'formal-parameters',
      d: 1,
      t: ['functions'],
      q: 'The variables declared in the header of a function definition, which receive the values passed when the function is called, are known as:',
      a: 'formal parameters',
      x: ['actual parameters', 'global variables', 'static variables'],
      e: 'Formal parameters are declared in the function header, such as `a` and `b` in `int sum(int a, int b)`. The values written in the call, such as `sum(3, 4)`, are the actual parameters (arguments); each formal parameter receives a copy of its actual parameter.',
    },
    {
      id: 'prototype-syntax',
      d: 2,
      t: ['functions'],
      q: 'Which of the following is a correct prototype for a function `avg` that receives two `int` values and returns a `float`?',
      a: '`float avg(int, int);`',
      x: ['`float avg(int a, b);`', '`int avg(float, float);`', '`avg(int a, int b) float;`'],
      e: 'A prototype gives the return type, the name and the type of every parameter (parameter names are optional), and it ends with a semicolon: `float avg(int, int);`. In `float avg(int a, b);` the parameter `b` has no type, `int avg(float, float);` describes a different function, and the return type cannot follow the parameter list.',
    },
    {
      id: 'void-return-type',
      d: 1,
      t: ['functions'],
      q: 'A function that does not return any value to the calling function is declared with the return type:',
      a: '`void`',
      x: ['`int`', '`float`', '`NULL`'],
      e: '`void` means "no value": a function such as `void show(int n)` does its work and returns nothing, so a `return;` statement inside it carries no value. A function declared `int` or `float` returns a value of that type, and `NULL` is a null pointer value, not a type.',
    },
    {
      id: 'local-variable-lifetime',
      d: 1,
      t: ['scope'],
      q: 'A local variable declared inside a function without the `static` keyword:',
      a: 'is created when the function is called and destroyed when it returns',
      x: [
        'keeps its value from one call of the function to the next',
        'can be accessed by every function of the program',
        'is created when the program starts and destroyed when it ends',
      ],
      e: 'Such an automatic local variable exists only while its function is executing and is visible only inside that function, so it starts afresh on every call. Keeping a value between calls needs `static`, and program-wide visibility and lifetime belong to global variables.',
    },
    {
      id: 'array-argument-passing',
      d: 3,
      t: ['arrays', 'functions'],
      q: 'Consider the function:\n\n```c\nvoid reset(int a[], int n)\n{\n    int i;\n    for (i = 0; i < n; i++)\n        a[i] = 0;\n}\n```\n\nIf `main()` declares `int m[4] = {5, 6, 7, 8};` and then calls `reset(m, 4);`, what does `m` hold after the call?',
      a: '0, 0, 0 and 0',
      x: ['5, 6, 7 and 8', '0, 6, 7 and 8', '0, 0, 0 and 8'],
      e: 'An array is not copied when it is passed to a function: the function receives the address of its first element, so `a[i]` inside `reset()` is the same memory as `m[i]`. The loop runs for i = 0, 1, 2 and 3 and sets every element of `m` to 0. (An `int` argument, by contrast, is passed by value and could not be changed this way.)',
    },
    {
      id: 'string-null-terminator',
      d: 1,
      o: 'past-paper',
      t: ['strings'],
      q: 'In C, the end of a string stored in a character array is marked by:',
      a: "the null character `'\\0'`",
      x: ["the newline character `'\\n'`", "the space character `' '`", 'the `EOF` constant'],
      e: "Every C string ends with the null character `'\\0'` (ASCII code 0). The compiler adds it to string literals, and functions such as `strlen()` and `printf()` with `%s` stop when they reach it. `EOF` signals the end of a file, not of a string.",
    },
    {
      id: 'strcmp-case-order',
      d: 3,
      t: ['strings'],
      q: 'Assuming ASCII character codes, which of the following expressions is true?',
      a: '`strcmp("Zebra", "apple") < 0`',
      x: ['`strcmp("Zebra", "apple") > 0`', '`strcmp("Zebra", "apple") == 0`', '`strcmp("apple", "Zebra") < 0`'],
      e: "strcmp() compares two strings character by character using their codes, returning a negative value, zero or a positive value. The first characters already differ: `'Z'` is 90 and `'a'` is 97, so \"Zebra\" is less than \"apple\" and `strcmp(\"Zebra\", \"apple\")` is negative, even though zebra follows apple in a dictionary. Swapping the arguments makes the result positive.",
    },
    {
      id: 'file-pointer-declaration',
      d: 1,
      t: ['file handling'],
      q: 'Which of the following correctly declares a file pointer in C?',
      a: '`FILE *fp;`',
      x: ['`FILE fp;`', '`FILE fp*;`', '`*FILE fp;`'],
      e: '`FILE` is a structure type defined in `stdio.h`, and a file is handled through a pointer to it: `FILE *fp;` declares that pointer, which then receives the value returned by `fopen()`. `FILE fp;` is not a pointer, and the other two are syntax errors.',
    },
    {
      id: 'fopen-failure-null',
      d: 1,
      t: ['file handling'],
      q: 'If `fopen()` fails to open a file (for example, a file that does not exist opened in `"r"` mode), it returns:',
      a: 'the `NULL` pointer',
      x: ['the `EOF` constant', 'the integer value 1', 'a pointer to a new empty file'],
      e: '`fopen()` returns a `FILE *`. When the file cannot be opened it returns `NULL`, which is why programs test `if (fp == NULL)` before using the file. `EOF` is returned by input functions such as `fgetc()` at the end of a file, and mode `"r"` never creates a file.',
    },
  ]),
]);
