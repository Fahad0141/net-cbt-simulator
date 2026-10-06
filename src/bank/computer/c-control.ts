import { defineBank } from '@/engine/authoring';
import { listText, n$, numericOptions, pickDistractors, sum } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/*
 * C Programming: Decisions and Loops (ICS Part II: decision constructs and loop constructs).
 *
 * Every "What is the output?" item runs the same logic in JavaScript with C semantics
 * (truncating integer division, pre-test `while`/`for` versus post-test `do-while`,
 * `switch` fall-through), so the marked answer is computed, never typed by hand.
 * Code is shown in ```c blocks indented with spaces: a TAB is a control character and
 * the validator rejects it.
 */

type Rel = '<' | '<=' | '>' | '>=';

const FENCE = '```';

/** Inline code span: ic('i++') renders as `i++`. */
const ic = (s: string | number): string => `\`${s}\``;

/** Indents a code line by `level` steps of four spaces. */
const ind = (level: number, line: string): string => `${'    '.repeat(level)}${line}`;

/** A stem that shows C code between a lead-in and the question, so it still ends with "?". */
function codeStem(lines: readonly string[], question: string): string {
  return `Consider the following C code:\n\n${FENCE}c\n${lines.join('\n')}\n${FENCE}\n\n${question}`;
}

/** A C relational operator applied to two integers. */
function holds(a: number, op: Rel, b: number): boolean {
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
  }
}

/** A loop update in C syntax: `i++`, `i--`, `i += 3`, `i -= 3`. */
function update(v: string, step: number, down = false): string {
  if (step === 1) return `${v}${down ? '--' : '++'}`;
  return `${v} ${down ? '-=' : '+='} ${step}`;
}

/** C integer division (truncates toward zero). */
const idiv = (a: number, b: number): number => Math.trunc(a / b);

/** Consecutive integers a, a+1, ..., b. */
const span = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a + 1) }, (_, k) => a + k);

/**
 * Wrong counts for "how many times" items: the other three members of a window of four
 * consecutive positive integers that holds `c` at a random position (off-by-one and
 * off-by-two slips), so the key is not always the middle value.
 */
function countWindow(r: Rng, c: number): number[] {
  const low = Math.max(1, c - r.int(0, 3));
  return span(low, low + 3).filter((x) => x !== c);
}

/**
 * Runs a pre-test loop (`while` / `for`): the values of the loop variable for which the
 * body executes, and the value that finally fails the test.
 */
function preTest(start: number, test: (v: number) => boolean, next: (v: number) => number): { values: number[]; after: number } {
  const values: number[] = [];
  let v = start;
  while (test(v)) {
    values.push(v);
    v = next(v);
    if (values.length > 1000) throw new Error('preTest: runaway loop');
  }
  return { values, after: v };
}

interface CountedLoop {
  op: Rel;
  bound: number;
  values: number[];
  after: number;
}

/**
 * An additive loop `i = first; i op bound; i += step` (or `-=` when `down`) whose body runs
 * exactly `n` times. About half the time the bound sits exactly on a term, which is where
 * the `<` versus `<=` off-by-one trap lives; otherwise it lies strictly between two terms.
 */
function countedLoop(r: Rng, n: number, step: number, down: boolean, low: number): CountedLoop {
  const onTerm = step === 1 || r.chance(0.55);
  const inclusive = r.chance(0.5);
  const op: Rel = down ? (inclusive ? '>=' : '>') : inclusive ? '<=' : '<';
  // `last` is the last value for which the body runs; `beyond` is the first value that fails.
  const first = down ? r.int(low + step, low + step + 9) + (n - 1) * step : r.int(low, low + 11);
  const last = down ? first - (n - 1) * step : first + (n - 1) * step;
  const beyond = down ? last - step : last + step;
  const bound = onTerm
    ? inclusive
      ? last
      : beyond
    : r.int(Math.min(last, beyond) + 1, Math.max(last, beyond) - 1);
  const t = preTest(first, (v) => holds(v, op, bound), (v) => (down ? v - step : v + step));
  if (t.values.length !== n) throw new Error(`countedLoop: wanted ${n} passes, got ${t.values.length}`);
  return { op, bound, ...t };
}

const LADDERS = [
  { v: 'marks', words: ['Distinction', 'First', 'Second', 'Fail'], cuts: [[80, 85, 90], [65, 70, 75], [45, 50, 55]], lo: 30, hi: 99 },
  { v: 'temp', words: ['Hot', 'Warm', 'Mild', 'Cold'], cuts: [[35, 38, 40], [25, 28, 30], [12, 15, 18]], lo: 0, hi: 45 },
  { v: 'age', words: ['Senior', 'Adult', 'Teen', 'Child'], cuts: [[60, 65], [18, 20], [12, 13]], lo: 5, hi: 80 },
] as const;

const VERDICTS = [
  ['Yes', 'No'],
  ['Pass', 'Fail'],
  ['True', 'False'],
  ['On', 'Off'],
] as const;

const SWITCH_THEMES = [
  { words: ['Red', 'Green', 'Blue', 'White'], other: 'Black' },
  { words: ['One', 'Two', 'Three', 'Four'], other: 'Many' },
  { words: ['North', 'East', 'South', 'West'], other: 'Lost' },
  { words: ['Lahore', 'Karachi', 'Quetta', 'Multan'], other: 'Islamabad' },
  { words: ['Apple', 'Mango', 'Grape', 'Peach'], other: 'Melon' },
] as const;

/** An outer counting loop and an inner loop whose limits may depend on `i`. */
interface InnerSpec {
  from: number | 'i';
  op: Rel;
  to: number | 'i';
  step: number;
}

export default defineBank('computer', 'c-control', (b) => [
  // ---------------------------------------------------------------- if-else
  b.dynamic('if-else-ladder', { difficulty: 1, tags: ['if-else'] }, (r) => {
    const L = r.pick(LADDERS);
    const cuts = L.cuts.map((c) => r.pick(c));
    const op = r.pick(['>=', '>'] as const);
    // Landing exactly on a cut-off tests whether the candidate reads >= and > carefully.
    const value = r.chance(0.4) ? r.pick(cuts) : r.int(L.lo, L.hi);
    const hit = cuts.findIndex((c) => holds(value, op, c));
    const branch = hit === -1 ? 3 : hit;
    const word = L.words[branch];
    const answer = ic(word);
    const checks = cuts
      .slice(0, hit === -1 ? 3 : hit + 1)
      .map((c, k) => `${ic(`${value} ${op} ${c}`)} is ${k === hit ? 'true' : 'false'}`);
    return {
      stem: codeStem(
        [
          `int ${L.v} = ${value};`,
          `if (${L.v} ${op} ${cuts[0]})`,
          ind(1, `printf("${L.words[0]}");`),
          `else if (${L.v} ${op} ${cuts[1]})`,
          ind(1, `printf("${L.words[1]}");`),
          `else if (${L.v} ${op} ${cuts[2]})`,
          ind(1, `printf("${L.words[2]}");`),
          'else',
          ind(1, `printf("${L.words[3]}");`),
        ],
        'What is the output?',
      ),
      answer,
      distractors: pickDistractors(answer, L.words.filter((w) => w !== word).map(ic)),
      explanation:
        `The conditions are tested from the top and only the first true one is acted on: ${checks.join(', ')}. ` +
        (hit === -1
          ? `All three are false, so the final ${ic('else')} prints ${answer}.`
          : `So ${answer} is printed and the rest of the ladder is skipped.`),
    };
  }),

  b.dynamic('if-assignment-trap', { difficulty: 3, tags: ['if-else'] }, (r) => {
    const [yes, no] = r.pick(VERDICTS);
    // A zero assignment makes the condition false: the trap then flips the other way.
    const k = r.chance(0.35) ? 0 : r.int(1, 9);
    const x0 = r.intExcept(1, 9, [k]);
    const out = (word: string, v: number): string => ic(`${word} ${v}`);
    const answer = k !== 0 ? out(yes, k) : out(no, 0);
    return {
      stem: codeStem(
        [
          `int x = ${x0};`,
          `if (x = ${k})`,
          ind(1, `printf("${yes} ");`),
          'else',
          ind(1, `printf("${no} ");`),
          'printf("%d", x);',
        ],
        'What is the output?',
      ),
      answer,
      // Read as the comparison x == k / assignment ignored / truth value misjudged.
      distractors: k !== 0 ? [out(no, x0), out(yes, x0), out(no, k)] : [out(no, x0), out(yes, x0), out(yes, 0)],
      explanation:
        `${ic(`x = ${k}`)} is an assignment, not the comparison ${ic(`x == ${k}`)}. It stores ${k} in ${ic('x')}, and the value of the whole expression is ${k}, ` +
        (k !== 0
          ? `which is non-zero and therefore true. So ${yes} is printed, followed by the new value of ${ic('x')}: ${answer}.`
          : `which is false. So the ${ic('else')} part prints ${no}, followed by the new value of ${ic('x')}: ${answer}.`),
    };
  }),

  // ---------------------------------------------------------------- switch
  b.dynamic('switch-fall-through', { difficulty: 2, origin: 'past-paper', tags: ['switch'] }, (r) => {
    const theme = r.pick(SWITCH_THEMES);
    const c = r.pick([3, 4]);
    const useChar = r.chance(0.3);
    const base = r.chance(0.5) ? 97 : 65; // 'a' or 'A'
    const label = (k: number): string => (useChar ? `'${String.fromCharCode(base + k)}'` : String(k + 1));
    const m = r.int(0, c - 2); // matched case (never the last one, so there is room to fall through)
    // The first `break` at or after the matched case: the case itself, a later one, or none at all.
    const stop = r.chance(0.2) ? m : r.chance(0.25) ? -1 : r.int(m + 1, c - 1);
    const hasBreak = span(0, c - 1).map((k) => {
      if (k < m) return r.chance(0.5);
      if (stop === -1 || k < stop) return false;
      return k === stop ? true : r.chance(0.5);
    });

    let decl: string;
    let expr: string;
    let landing: string;
    if (useChar) {
      decl = `char ch = ${label(m)};`;
      expr = 'ch';
      landing = `${ic('ch')} is ${ic(label(m))}`;
    } else if (r.chance(0.4)) {
      const mod = r.int(c + 1, 9);
      const x = m + 1 + mod * r.int(1, 4);
      decl = `int x = ${x};`;
      expr = `x % ${mod}`;
      landing = `${ic(expr)} is ${x} % ${mod} = ${m + 1}`;
    } else {
      decl = `int n = ${m + 1};`;
      expr = 'n';
      landing = `${ic('n')} is ${m + 1}`;
    }

    // What the switch prints when execution enters at case index k (C semantics: run on
    // through later labels until a break, or to the end, default included).
    const runFrom = (k: number): string[] => {
      const out: string[] = [];
      for (let j = k; j < c; j++) {
        out.push(theme.words[j]);
        if (hasBreak[j]) return out;
      }
      return [...out, theme.other];
    };
    const show = (words: readonly string[]): string => ic(words.join(' '));
    const printed = runFrom(m);
    const answer = show(printed);
    const reachesDefault = printed.includes(theme.other);
    const distractors = pickDistractors(answer, [
      show([theme.words[m]]), // assumes no fall-through
      show(reachesDefault ? printed.filter((w) => w !== theme.other) : [...printed, theme.other]), // default misjudged
      show([...theme.words.slice(m, c), theme.other]), // ignores every break
      show(runFrom(0)), // starts from the first case
      show([theme.words[m], theme.other]), // matched case, then default
      show([theme.other]), // default only
    ]);
    let flow: string;
    if (stop === m) {
      flow = `It prints ${theme.words[m]}, and the ${ic('break')} right after it ends the ${ic('switch')}.`;
    } else if (stop === -1) {
      flow = `With no ${ic('break')} from there on, execution falls through every later label, ${ic('default')} included, printing ${listText(printed)}.`;
    } else {
      flow = `It has no ${ic('break')}, so execution falls through into the following code until the ${ic('break')} in ${ic(`case ${label(stop)}:`)}, printing ${listText(printed)}.`;
    }
    return {
      stem: codeStem(
        [
          decl,
          `switch (${expr}) {`,
          ...span(0, c - 1).map((k) =>
            ind(1, `case ${label(k)}: printf("${theme.words[k]} ");${hasBreak[k] ? ' break;' : ''}`),
          ),
          ind(1, `default: printf("${theme.other}");`),
          '}',
        ],
        'What is the output?',
      ),
      answer,
      distractors,
      explanation: `${landing}, so control jumps to ${ic(`case ${label(m)}:`)}. ${flow} Output: ${answer}.`,
    };
  }),

  // ---------------------------------------------------------------- for
  b.dynamic('for-loop-sum', { difficulty: 2, origin: 'past-paper', tags: ['for'] }, (r) => {
    const down = r.chance(0.35);
    const step = r.weighted([1, 2, 3, 4, 5], [3, 3, 2, 1, 1]);
    const { op, bound, values, after } = countedLoop(r, r.int(3, step === 1 ? 6 : 5), step, down, 1);
    const first = values[0];
    const last = values[values.length - 1];
    const total = sum(values);
    // Ignoring the step (adding every integer from the smallest to the largest value).
    const everyInteger = sum(span(Math.min(first, last), Math.max(first, last)));
    const { answer, distractors } = numericOptions(r, {
      correct: total,
      // one pass too many, step ignored, one pass too few, first value skipped, printed i
      // instead of sum (shuffled, so the key's rank among the options varies)
      wrong: r.shuffle([total + after, everyInteger, total - last, total - first, after]),
      format: ic,
    });
    return {
      stem: codeStem(
        [
          'int i, sum = 0;',
          `for (i = ${first}; i ${op} ${bound}; ${update('i', step, down)})`,
          ind(1, r.chance(0.5) ? 'sum += i;' : 'sum = sum + i;'),
          'printf("%d", sum);',
        ],
        'What is the output?',
      ),
      answer,
      distractors,
      explanation: `The body runs for $i = ${values.join(', ')}$. Then $i$ becomes $${after}$ and ${ic(`${after} ${op} ${bound}`)} is false, so the loop stops. Hence ${ic('sum')} $= ${values.join(' + ')} = ${total}$, which is printed.`,
    };
  }),

  b.dynamic('loop-iteration-count', { difficulty: 2, origin: 'past-paper', tags: ['for', 'while'] }, (r) => {
    const word = r.pick(['NUST', 'NET', 'Hello', 'Pakistan']);
    const say = `printf("${word}\\n");`;
    const kind = r.weighted(['for-add', 'while-sub', 'for-mul', 'while-div'] as const, [4, 2, 2, 2]);
    let lines: string[];
    let values: number[];
    let stopText: string;
    if (kind === 'for-add' || kind === 'while-sub') {
      const down = kind === 'while-sub';
      const step = down ? r.int(2, 5) : r.weighted([1, 2, 3, 4, 5], [2, 3, 3, 2, 2]);
      const loop = countedLoop(r, r.int(3, down ? 8 : 9), step, down, 0);
      const first = loop.values[0];
      lines = down
        ? [`int i = ${first};`, `while (i ${loop.op} ${loop.bound}) {`, ind(1, say), ind(1, `${update('i', step, true)};`), '}']
        : ['int i;', `for (i = ${first}; i ${loop.op} ${loop.bound}; ${update('i', step)})`, ind(1, say)];
      values = loop.values;
      stopText = `$i$ becomes $${loop.after}$ and ${ic(`${loop.after} ${loop.op} ${loop.bound}`)} is false`;
    } else if (kind === 'for-mul') {
      const factor = r.weighted([2, 3], [3, 1]);
      const first = factor === 2 ? r.pick([1, 1, 2, 3]) : r.pick([1, 2]);
      const n = r.int(3, factor === 2 ? 7 : 5);
      const last = first * factor ** (n - 1);
      const inclusive = r.chance(0.5);
      const op: Rel = inclusive ? '<=' : '<';
      const bound = r.chance(0.45) ? (inclusive ? last : last * factor) : r.int(last + 1, last * factor - 1);
      const t = preTest(first, (v) => holds(v, op, bound), (v) => v * factor);
      lines = ['int i;', `for (i = ${first}; i ${op} ${bound}; i *= ${factor})`, ind(1, say)];
      values = t.values;
      stopText = `$i$ becomes $${t.after}$ and ${ic(`${t.after} ${op} ${bound}`)} is false`;
    } else {
      const div = r.weighted([2, 3], [3, 1]);
      const start = r.int(div === 2 ? 20 : 30, 200);
      const tests: Array<[string, (v: number) => boolean]> = [
        ['n > 0', (v) => v > 0],
        ['n != 0', (v) => v !== 0],
        ['n >= 1', (v) => v >= 1],
        ['n > 1', (v) => v > 1],
      ];
      const [cond, test] = r.pick(tests);
      const t = preTest(start, test, (v) => idiv(v, div));
      lines = [`int n = ${start};`, `while (${cond}) {`, ind(1, say), ind(1, `n = n / ${div};`), '}'];
      values = t.values;
      stopText = `$n$ becomes $${t.after}$ and ${ic(cond.replace('n', String(t.after)))} is false`;
    }
    const count = values.length;
    const { answer, distractors } = numericOptions(r, { correct: count, wrong: countWindow(r, count), format: n$ });
    const variable = kind === 'while-div' ? 'n' : 'i';
    return {
      stem: codeStem(lines, `How many times is ${ic(word)} printed?`),
      answer,
      distractors,
      explanation:
        (kind === 'while-div' ? 'With integer division, the body' : 'The body') +
        ` runs for $${variable} = ${values.join(', ')}$. Then ${stopText}, so the loop ends. ${ic(word)} is printed ${count} times.`,
    };
  }),

  // ---------------------------------------------------------------- while
  b.dynamic('while-digit-loop', { difficulty: 2, tags: ['while'] }, (r) => {
    const mode = r.pick(['sum', 'reverse', 'parity-sum', 'parity-count'] as const);
    const len = r.int(3, 4);
    let digits = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], len);
    // The parity filters need at least one even and one odd digit to be non-trivial.
    while (mode.startsWith('parity') && (digits.every((d) => d % 2 === 0) || digits.every((d) => d % 2 === 1))) {
      digits = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], len);
    }
    const n = Number(digits.join(''));
    const taken = [...digits].reverse(); // the order in which n % 10 extracts them
    const states = preTest(n, (v) => v > 0, (v) => idiv(v, 10)).values;
    const lead = digits[0];
    const unit = digits[len - 1];
    const digitSum = sum(digits);
    const walk = `${ic('n % 10')} gives the last digit and ${ic('n / 10')} (integer division) removes it, so ${ic('n')} goes ${[...states, 0].join(' → ')} and the digits are taken in the order ${taken.join(', ')}.`;

    let lines: string[];
    let correct: number;
    let wrong: number[];
    let result: string;
    if (mode === 'sum') {
      lines = [`int n = ${n}, s = 0;`, 'while (n > 0) {', ind(1, 's = s + n % 10;'), ind(1, 'n = n / 10;'), '}', 'printf("%d", s);'];
      correct = digitSum;
      // stopped one pass early, skipped the first digit taken, counted the digits,
      // confused % with / (adds the quotients n / 10)
      wrong = [digitSum - lead, digitSum - unit, len, sum(states.map((v) => idiv(v, 10)))];
      result = `${ic('s')} $= ${taken.join(' + ')} = ${digitSum}$.`;
    } else if (mode === 'reverse') {
      lines = [`int n = ${n}, rev = 0;`, 'while (n != 0) {', ind(1, 'rev = rev * 10 + n % 10;'), ind(1, 'n = n / 10;'), '}', 'printf("%d", rev);'];
      correct = Number(taken.join(''));
      // one pass too few, "prints n unchanged", confused with the digit-sum program,
      // one pass too many (appends a 0)
      wrong = [Number(taken.slice(0, -1).join('')), n, digitSum, correct * 10];
      const builds = taken.map((_, k) => taken.slice(0, k + 1).join(''));
      result = `${ic('rev')} builds up as ${builds.join(', ')}, so ${correct} is printed.`;
    } else {
      const even = r.chance(0.5);
      const test = even ? 'd % 2 == 0' : 'd % 2 == 1';
      const matches = (d: number): boolean => d % 2 === (even ? 0 : 1);
      const picked = taken.filter(matches);
      const others = taken.filter((d) => !matches(d));
      const counting = mode === 'parity-count';
      lines = [
        `int n = ${n}, ${counting ? 'c' : 's'} = 0, d;`,
        'while (n > 0) {',
        ind(1, 'd = n % 10;'),
        ind(1, `if (${test})`),
        ind(2, counting ? 'c++;' : 's = s + d;'),
        ind(1, 'n = n / 10;'),
        '}',
        `printf("%d", ${counting ? 'c' : 's'});`,
      ];
      const kindText = even ? 'even' : 'odd';
      const which =
        picked.length === 1
          ? `Only the ${kindText} digit ${picked[0]} passes ${ic(test)}`
          : `Only the ${kindText} digits ${picked.join(', ')} pass ${ic(test)}`;
      if (counting) {
        correct = picked.length;
        // counted the other parity, counted every digit, added the digits instead of counting
        wrong = [others.length, len, sum(picked), correct + 1];
        result = `${which}, so ${ic('c')} is incremented ${correct === 1 ? 'once' : `${correct} times`} and ${correct} is printed.`;
      } else {
        correct = sum(picked);
        // summed the other parity, summed every digit, counted instead of adding, and
        // stopped one pass early (only a slip when the leading digit is one of those added)
        wrong = [sum(others), digitSum, picked.length, matches(lead) ? correct - lead : correct];
        result =
          picked.length === 1
            ? `${which}, so ${ic('s')} $= ${correct}$.`
            : `${which}, so ${ic('s')} $= ${picked.join(' + ')} = ${correct}$.`;
      }
    }
    const { answer, distractors } = numericOptions(r, { correct, wrong: r.shuffle(wrong), format: ic });
    return {
      stem: codeStem(lines, 'What is the output?'),
      answer,
      distractors,
      explanation: `${walk} ${result}`,
    };
  }),

  // ---------------------------------------------------------------- do-while
  b.dynamic('while-vs-do-while', { difficulty: 2, tags: ['do-while', 'while'] }, (r) => {
    const step = r.int(2, 5);
    const limit = r.int(10, 30);
    const op = r.pick(['<', '<='] as const);
    const test = (v: number): boolean => holds(v, op, limit);
    // "fails" = the condition is false from the start; "passes" = it is true at first.
    const fails = (): number => (op === '<' && r.chance(0.3) ? limit : r.int(limit + 1, limit + 9));
    const passes = (): number => r.int(Math.max(1, limit - 3 * step), limit - 1);
    const scenario = r.weighted(['both-fail', 'while-runs', 'do-runs'] as const, [5, 3, 2]);
    const a0 = scenario === 'while-runs' ? passes() : fails();
    const b0 = scenario === 'do-runs' ? passes() : scenario === 'both-fail' && r.chance(0.6) ? a0 : fails();

    const aTrace = preTest(a0, test, (v) => v + step);
    const a = aTrace.after;
    const bSeen = [b0];
    let bv = b0;
    do {
      bv += step;
      bSeen.push(bv);
    } while (test(bv));
    const bFinal = bv;

    const aSkips = !test(a0);
    const bOnce = !test(b0);
    const aWrong = aSkips ? a0 + step : a - step; // "while runs once anyway" / stopped one step early
    const bWrong = bOnce ? b0 : bFinal + step; // "do-while body skipped" / one extra pass
    const out = (x: number, y: number): string => ic(`a = ${x}, b = ${y}`);
    const answer = out(a, bFinal);
    const inc = (v: string): string => (r.chance(0.5) ? `${v} += ${step};` : `${v} = ${v} + ${step};`);

    const whileText = aSkips
      ? `The ${ic('while')} loop tests first: ${ic(`${a0} ${op} ${limit}`)} is false, so its body never runs and ${ic('a')} stays ${a0}.`
      : `The ${ic('while')} loop takes ${ic('a')} through ${[...aTrace.values, a].join(', ')} and stops when ${ic(`${a} ${op} ${limit}`)} is false, so ${ic('a')} is ${a}.`;
    const doText = bOnce
      ? `The ${ic('do-while')} loop runs its body before testing: ${ic('b')} becomes ${bFinal}, then ${ic(`${bFinal} ${op} ${limit}`)} is false, so it stops after one pass.`
      : `The ${ic('do-while')} loop takes ${ic('b')} through ${bSeen.join(', ')} and stops when ${ic(`${bFinal} ${op} ${limit}`)} is false, so ${ic('b')} is ${bFinal}.`;
    return {
      stem: codeStem(
        [
          `int a = ${a0}, b = ${b0};`,
          `while (a ${op} ${limit}) {`,
          ind(1, inc('a')),
          '}',
          'do {',
          ind(1, inc('b')),
          `} while (b ${op} ${limit});`,
          'printf("a = %d, b = %d", a, b);',
        ],
        'What is the output?',
      ),
      answer,
      distractors: [out(aWrong, bFinal), out(a, bWrong), out(aWrong, bWrong)],
      explanation: `${whileText} ${doText} Output: ${answer}.`,
    };
  }),

  b.dynamic('do-while-print', { difficulty: 1, tags: ['do-while'] }, (r) => {
    const down = r.chance(0.3);
    const step = r.weighted([1, 2, 3, 4], [3, 3, 2, 1]);
    // The condition holds at the start, so the do-while makes the same passes as a while.
    const { op, bound, values, after } = countedLoop(r, r.int(3, 5), step, down, 1);
    const first = values[0];
    const show = (xs: readonly number[]): string => ic(xs.join(' '));
    const answer = show(values);
    const distractors = pickDistractors(answer, [
      show(values.slice(0, -1)), // one pass too few (test read as stopping one value early)
      show([...values, after]), // one pass too many (the failing value printed too)
      show([...values.slice(1), after]), // update applied before the printf
      show([first]), // "a do-while runs only once"
    ]);
    return {
      stem: codeStem(
        [`int i = ${first};`, 'do {', ind(1, 'printf("%d ", i);'), ind(1, `${update('i', step, down)};`), `} while (i ${op} ${bound});`],
        'What is the output?',
      ),
      answer,
      distractors,
      explanation: `Each pass prints $i$ and then ${down ? 'decreases' : 'increases'} it by ${step}; the condition is tested at the end of the pass. The body runs for $i = ${values.join(', ')}$. After the last pass $i$ becomes $${after}$ and ${ic(`${after} ${op} ${bound}`)} is false, so the loop stops. Output: ${answer}.`,
    };
  }),

  // ---------------------------------------------------------------- break and continue
  b.dynamic('break-continue-trace', { difficulty: 2, tags: ['break and continue', 'for'] }, (r) => {
    const keyword = r.pick(['break', 'continue'] as const);
    const other = keyword === 'break' ? 'continue' : 'break';
    const printMode = r.chance(0.45);
    const start = r.int(1, 2);
    const byMod = r.chance(0.7);
    const k = r.int(3, 5);
    const end = printMode ? r.int(Math.max(2 * k, 8), 10) : r.int(Math.max(2 * k, 8), 15);
    const v = r.int(start + 2, end - 2);
    const trigger = (i: number): boolean => (byMod ? i % k === 0 : i === v);
    const condText = byMod ? `i % ${k} == 0` : `i == ${v}`;
    const run = (kw: 'break' | 'continue'): number[] => {
      const out: number[] = [];
      for (let i = start; i <= end; i++) {
        if (trigger(i)) {
          if (kw === 'break') break;
          continue;
        }
        out.push(i);
      }
      return out;
    };
    const got = run(keyword);
    const all = span(start, end);
    const hits = all.filter(trigger);
    // confused break with continue, ignored the if, and (break) added the trigger value too
    // or (continue) kept only the skipped values
    const mistakes = [run(other), all, keyword === 'break' ? [...got, hits[0]] : hits];

    const lines = [
      printMode ? 'int i;' : 'int i, sum = 0;',
      `for (i = ${start}; i <= ${end}; i++) {`,
      ind(1, `if (${condText})`),
      ind(2, `${keyword};`),
      ind(1, printMode ? 'printf("%d ", i);' : 'sum += i;'),
      '}',
      ...(printMode ? [] : ['printf("%d", sum);']),
    ];
    let answer: string;
    let distractors: string[];
    let result: string;
    if (printMode) {
      const show = (xs: readonly number[]): string => ic(xs.join(' '));
      answer = show(got);
      distractors = pickDistractors(answer, mistakes.map(show));
      result = `Output: ${answer}.`;
    } else {
      const total = sum(got);
      // plus a slip in the other direction: (break) printed the value of i at the break,
      // (continue) treated `i <= end` as `i < end`
      const slip = keyword === 'break' ? hits[0] : trigger(end) ? total : total - end;
      ({ answer, distractors } = numericOptions(r, { correct: total, wrong: r.shuffle([...mistakes.map(sum), slip]), format: ic }));
      result = `${ic('sum')} $= ${got.join(' + ')}${got.length > 1 ? ` = ${total}` : ''}$, which is printed.`;
    }
    const verb = printMode ? 'printed' : 'added';
    const why =
      keyword === 'continue'
        ? `When ${ic(condText)} is true (at $i = ${hits.join(', ')}$), ${ic('continue')} skips the rest of that pass, so ${hits.length > 1 ? 'those values are' : 'that value is'} not ${verb}, but the loop carries on up to ${end}.`
        : `${ic(condText)} first becomes true at $i = ${hits[0]}$, and ${ic('break')} ends the loop at once, so only ${got.join(', ')} ${got.length > 1 ? 'are' : 'is'} ${verb}.`;
    return {
      stem: codeStem(lines, 'What is the output?'),
      answer,
      distractors,
      explanation: `${why} ${result}`,
    };
  }),

  // ---------------------------------------------------------------- nested loops
  b.dynamic('nested-loop-count', { difficulty: 2, origin: 'past-paper', tags: ['nested loops', 'for'] }, (r) => {
    const kind = r.pick(['rect', 'tri-up', 'tri-strict', 'tri-down', 'step'] as const);
    const m = r.int(3, 7);
    const k = r.intExcept(2, 8, [m]);
    const stars = r.chance(0.4);
    let outer: { from: number; op: Rel; to: number };
    let inner: InnerSpec;
    let wrong: number[];
    if (kind === 'rect') {
      outer = r.chance(0.5) ? { from: 0, op: '<', to: m } : { from: 1, op: '<=', to: m };
      inner = r.chance(0.5) ? { from: 0, op: '<', to: k, step: 1 } : { from: 1, op: '<=', to: k, step: 1 };
      // inner or outer loop off by one in either direction, added instead of multiplied
      wrong = [m * (k + 1), (m + 1) * k, m * (k - 1), (m - 1) * k, m + k];
    } else if (kind === 'tri-up' || kind === 'tri-down') {
      outer = { from: 1, op: '<=', to: m };
      inner = kind === 'tri-up' ? { from: 1, op: '<=', to: 'i', step: 1 } : { from: 'i', op: '<=', to: m, step: 1 };
      // inner loop taken as m passes every time, inner off by one either way, forgot the 1/2,
      // counted only the outer passes
      wrong = [m * m, (m * (m - 1)) / 2, ((m + 1) * (m + 2)) / 2, m * (m + 1), m];
    } else if (kind === 'tri-strict') {
      outer = { from: 1, op: '<=', to: m };
      inner = { from: 1, op: '<', to: 'i', step: 1 };
      // read < as <=, inner taken as m passes, outer one pass short, forgot the 1/2,
      // counted only the outer passes
      wrong = [(m * (m + 1)) / 2, m * m, ((m - 1) * (m - 2)) / 2, m * (m - 1), m];
    } else {
      const lim = r.int(5, 11);
      outer = { from: 0, op: '<', to: m };
      inner = { from: 0, op: '<', to: lim, step: 2 };
      // ignored the step of 2, inner loop one pass short / long (lim / 2 rounded the wrong
      // way, or j == lim counted), outer loop one pass long / short
      const passes = Math.ceil(lim / 2);
      wrong = [m * lim, m * (passes - 1), m * (passes + 1), (m + 1) * passes, (m - 1) * passes];
    }
    wrong = r.shuffle(wrong);
    const at = (x: number | 'i', i: number): number => (x === 'i' ? i : x);
    const outerValues = preTest(outer.from, (i) => holds(i, outer.op, outer.to), (i) => i + 1).values;
    const innerCounts = outerValues.map(
      (i) => preTest(at(inner.from, i), (j) => holds(j, inner.op, at(inner.to, i)), (j) => j + inner.step).values.length,
    );
    const count = sum(innerCounts);

    const outerHead = `for (i = ${outer.from}; i ${outer.op} ${outer.to}; i++)`;
    const innerHead = `for (j = ${inner.from}; j ${inner.op} ${inner.to}; ${update('j', inner.step)})`;
    const lines = stars
      ? ['int i, j;', `${outerHead} {`, ind(1, innerHead), ind(2, 'printf("*");'), ind(1, 'printf("\\n");'), '}']
      : ['int i, j, count = 0;', outerHead, ind(1, innerHead), ind(2, 'count++;'), 'printf("%d", count);'];
    const { answer, distractors } = numericOptions(r, { correct: count, wrong, format: stars ? n$ : ic });
    const stmt = ic(stars ? 'printf("*")' : 'count++');
    const uniform = innerCounts.every((x) => x === innerCounts[0]);
    const tally = uniform
      ? `The outer loop runs ${outerValues.length} times and the inner loop runs ${innerCounts[0]} times on every pass, so ${stmt} executes $${outerValues.length} \\times ${innerCounts[0]} = ${count}$ times`
      : `The outer loop runs for $i = ${outerValues.join(', ')}$, and on these passes the inner loop runs ${innerCounts.join(', ')} times, so ${stmt} executes $${innerCounts.join(' + ')} = ${count}$ times`;
    return {
      stem: codeStem(lines, stars ? `How many asterisks (${ic('*')}) does it print in total?` : 'What is the output?'),
      answer,
      distractors,
      explanation: stars ? `${tally}.` : `${tally}, and ${count} is printed.`,
    };
  }),

  // ---------------------------------------------------------------- concepts (fixed)
  ...b.mcqs([
    {
      id: 'min-runs-while-do-while',
      d: 1,
      o: 'past-paper',
      t: ['while', 'do-while'],
      q: 'The minimum numbers of times that the body of a `while` loop and the body of a `do-while` loop can execute are, respectively:',
      a: '0 and 1',
      x: ['1 and 0', '1 and 1', '0 and 0'],
      e: 'A `while` loop is entry-controlled: its condition is tested before the body, so the body may not run at all. A `do-while` loop is exit-controlled: the body runs once before the condition is tested, so it always runs at least once.',
    },
    {
      id: 'break-in-nested-loop',
      d: 1,
      t: ['break and continue', 'nested loops'],
      q: 'When a `break` statement is executed inside the inner loop of a nested loop, control passes to:',
      a: 'the statement immediately after the inner loop',
      x: [
        'the statement immediately after the outer loop',
        'the condition test of the inner loop',
        'the update expression of the inner loop',
      ],
      e: '`break` ends only the innermost loop (or `switch`) that contains it. Execution continues with the statement after that inner loop, which is still inside the outer loop, so the outer loop keeps running.',
    },
    {
      id: 'switch-expression-type',
      d: 1,
      t: ['switch'],
      q: 'The controlling expression of a `switch` statement in C cannot be of type:',
      a: '`float`',
      x: ['`int`', '`char`', '`long`'],
      e: 'The `switch` expression and every `case` label must have an integer type such as `char`, `short`, `int` or `long`. Floating-point types (`float`, `double`) are not allowed.',
    },
    {
      id: 'default-label-rules',
      d: 1,
      t: ['switch'],
      q: 'Which statement about the `default` label of a `switch` statement in C is correct?',
      a: 'It is optional; control goes to it when no `case` value matches.',
      x: [
        'It is compulsory; control goes to it when no `case` value matches.',
        'It is optional, but it must be the last label of the `switch`.',
        'It is compulsory, and it must be the first label of the `switch`.',
      ],
      e: 'A `switch` may leave out `default`; if nothing matches, its body is then skipped entirely. When `default` is present it receives control only if no `case` constant matches, and it may appear anywhere among the labels (placing it last is just a convention).',
    },
    {
      id: 'empty-for-header',
      d: 1,
      o: 'past-paper',
      t: ['for'],
      q: 'A loop written as `for ( ; ; )` in C, whose body contains nothing that ends the loop (no `break`, `return`, `goto` or `exit()`):',
      a: 'runs forever, because a missing condition is treated as true',
      x: [
        'does not compile, because all three expressions are missing',
        'never runs, because a missing condition is treated as false',
        'runs exactly once, because there is no update expression',
      ],
      e: 'All three expressions of a `for` statement are optional, and an omitted condition counts as non-zero (true). So `for ( ; ; )` is an infinite loop that can be left only through `break`, `return`, `goto` or `exit()`.',
    },
    {
      id: 'do-while-syntax',
      d: 1,
      t: ['do-while'],
      q: 'Which of the following is the correct general form of a `do-while` loop in C?',
      a: '`do { statements; } while (condition);`',
      x: [
        '`do { statements; } while (condition)`',
        '`do (condition) { statements; }`',
        '`while (condition) do { statements; };`',
      ],
      e: 'In a `do-while` loop the body follows the keyword `do`, and the condition comes at the end, in parentheses after `while`. Unlike the header of a `while` loop, this `while (condition)` must be followed by a semicolon; leaving it out is a syntax error.',
    },
    {
      id: 'for-header-separators',
      d: 1,
      t: ['for'],
      q: 'In C, the initialization, condition and update expressions in the header of a `for` loop are separated by:',
      a: 'semicolons (`;`)',
      x: ['commas (`,`)', 'colons (`:`)', 'full stops (`.`)'],
      e: 'A `for` header has the form `for (initialization; condition; update)`, so its three parts are separated by two semicolons. A comma may appear inside one part (for example `i = 0, j = 10`), but it does not separate the parts.',
    },
    {
      id: 'missing-break-in-switch',
      d: 1,
      t: ['switch'],
      q: 'In a `switch` statement, the matching `case` has no `break` and another `case` follows it. What happens after the statements of the matching `case` run?',
      a: 'The statements of the next `case` are executed as well.',
      x: [
        'A compile-time error occurs.',
        'Control leaves the `switch` anyway.',
        'Control jumps straight to `default`.',
      ],
      e: 'Without `break`, control "falls through": execution simply continues with the statements under the following labels until a `break` or the end of the `switch` is reached. This is legal C, so the compiler does not insist on `break`.',
    },
    {
      id: 'continue-in-for',
      d: 2,
      t: ['break and continue', 'for'],
      q: 'When a `continue` statement is executed inside a `for` loop, control passes to:',
      a: 'the update expression, and then the condition is tested',
      x: [
        'the condition test, skipping the update expression',
        'the initialization expression, restarting the loop',
        'the first statement after the loop',
      ],
      e: '`continue` abandons the rest of the current pass only. In a `for` loop the update expression (such as `i++`) is still evaluated and then the condition is tested for the next pass. Leaving the loop altogether is what `break` does.',
    },
    {
      id: 'valid-case-label',
      d: 2,
      t: ['switch'],
      q: 'If `x` is an `int` variable, which of the following is a valid `case` label in C?',
      a: "`case 'A':`",
      x: ['`case x:`', '`case 2.5:`', '`case "A":`'],
      e: "A `case` label must be an integer constant expression. A character constant such as `'A'` is an integer constant (65 in ASCII), so it is valid. A variable is not a constant, `2.5` is not an integer, and `\"A\"` is a string literal.",
    },
    {
      id: 'stray-semicolon-after-for',
      d: 3,
      o: 'past-paper',
      t: ['for'],
      q: codeStem(['int i;', 'for (i = 1; i <= 5; i++);', ind(1, 'printf("%d ", i);')], 'What is the output?'),
      a: '`6`',
      x: ['`1 2 3 4 5`', '`5`', '`1 2 3 4 5 6`'],
      e: 'The semicolon right after `for (...)` is an empty statement, and it is the whole loop body. The loop only counts `i` up until `i <= 5` fails at `i = 6`. The `printf`, despite its indentation, is outside the loop and runs once, printing `6`.',
    },
    {
      id: 'dangling-else',
      d: 3,
      t: ['if-else'],
      q: codeStem(
        ['int a = 5, b = 10;', 'if (a > b)', ind(1, 'if (b > 0)'), ind(2, 'printf("X");'), 'else', ind(1, 'printf("Y");'), 'printf("Z");'],
        'What is the output?',
      ),
      a: '`Z`',
      x: ['`YZ`', '`XZ`', '`XYZ`'],
      e: 'An `else` pairs with the nearest preceding `if` that has no `else`, whatever the indentation suggests, so here it belongs to `if (b > 0)`. The outer condition `a > b` (5 > 10) is false, so the whole inner `if-else` is skipped and only `Z` is printed. Pairing the `else` with the outer `if` gives the trap answer `YZ`.',
    },
    {
      id: 'continue-skips-update-in-while',
      d: 3,
      t: ['break and continue', 'while'],
      q: codeStem(
        ['int i = 0;', 'while (i < 5) {', ind(1, 'if (i == 2)'), ind(2, 'continue;'), ind(1, 'printf("%d\\n", i);'), ind(1, 'i++;'), '}'],
        'Which statement best describes what happens when it runs?',
      ),
      a: 'It prints 0 and 1, then loops forever.',
      x: ['It prints 0, 1, 3 and 4, then stops.', 'It prints 0 and 1, then stops.', 'It prints 0, 1, 2, 3 and 4, then stops.'],
      e: 'In a `while` loop, `continue` jumps straight back to the condition. When `i` becomes 2, `continue` skips `i++`, so `i` stays 2 and `i < 5` stays true forever: 0 and 1 are printed and the loop never ends. (In a `for` loop with `i++` in its header the update would still run, and 0, 1, 3 and 4 would be printed.)',
    },
  ]),
]);
