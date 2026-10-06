import { defineBank } from '@/engine/authoring';
import { listText, numericOptions, pickDistractors, statementQuestion, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

/*
 * Logic Gates and Problem Solving (legacy NET computer science, ICS Part I).
 *
 * Boolean expressions are built as small syntax trees so that every option can be
 * evaluated over the whole truth table: a distractor is kept only when it is a
 * genuinely different function from the answer.
 */

// ---------------------------------------------------------------------------
// Boolean expression helpers
// ---------------------------------------------------------------------------

type Var = 'A' | 'B' | 'C';
type Env = Readonly<Record<Var, number>>;

type Expr =
  | { k: 'var'; v: Var }
  | { k: 'not'; a: Expr }
  | { k: 'and' | 'or' | 'xor'; a: Expr; b: Expr };

const v = (name: Var): Expr => ({ k: 'var', v: name });
const not = (a: Expr): Expr => ({ k: 'not', a });
const and = (a: Expr, b: Expr): Expr => ({ k: 'and', a, b });
const or = (a: Expr, b: Expr): Expr => ({ k: 'or', a, b });
const xor = (a: Expr, b: Expr): Expr => ({ k: 'xor', a, b });

/** A variable, complemented when `neg` is set. */
const lit = (name: Var, neg: boolean): Expr => (neg ? not(v(name)) : v(name));

/** Complement that removes a double bar: comp(not A) = A. */
const comp = (e: Expr): Expr => (e.k === 'not' ? e.a : not(e));

function evaluate(e: Expr, env: Env): number {
  switch (e.k) {
    case 'var':
      return env[e.v];
    case 'not':
      return 1 - evaluate(e.a, env);
    case 'and':
      return evaluate(e.a, env) & evaluate(e.b, env);
    case 'or':
      return evaluate(e.a, env) | evaluate(e.b, env);
    case 'xor':
      return evaluate(e.a, env) ^ evaluate(e.b, env);
  }
}

/** All eight input combinations, in truth-table order (A is the most significant bit). */
const ROWS: Env[] = Array.from({ length: 8 }, (_, i) => ({ A: (i >> 2) & 1, B: (i >> 1) & 1, C: i & 1 }));

/** The truth-table column of an expression as a bit string, e.g. '01010111'. */
const signature = (e: Expr): string => ROWS.map((row) => evaluate(e, row)).join('');

/**
 * LaTeX for an expression. With `env`, variables are replaced by their values; with
 * `literals` also set, a variable or complemented variable is replaced by its value.
 */
function render(e: Expr, env?: Env, literals = false): string {
  const isLiteral = e.k === 'var' || (e.k === 'not' && e.a.k === 'var');
  if (env && literals && isLiteral) return String(evaluate(e, env));
  const child = (c: Expr, parent: Expr['k']): string => {
    const text = render(c, env, literals);
    const needs =
      (parent === 'and' && (c.k === 'or' || c.k === 'xor')) ||
      (parent === 'or' && c.k === 'xor') ||
      (parent === 'xor' && (c.k === 'or' || c.k === 'and' || c.k === 'xor'));
    return needs ? `(${text})` : text;
  };
  switch (e.k) {
    case 'var':
      return env ? String(env[e.v]) : e.v;
    case 'not':
      return `\\overline{${render(e.a, env, literals)}}`;
    case 'and':
      return `${child(e.a, 'and')} \\cdot ${child(e.b, 'and')}`;
    case 'or':
      return `${child(e.a, 'or')} + ${child(e.b, 'or')}`;
    case 'xor':
      return `${child(e.a, 'xor')} \\oplus ${child(e.b, 'xor')}`;
  }
}

const envTex = (env: Env): string => `$A = ${env.A},\\ B = ${env.B},\\ C = ${env.C}$`;

/** The three variables in random order, each complemented at random. */
function randomLiterals(r: Rng): [Expr, Expr, Expr] {
  const [x, y, z] = r.shuffle<Var>(['A', 'B', 'C']) as [Var, Var, Var];
  return [lit(x, r.chance(0.4)), lit(y, r.chance(0.4)), lit(z, r.chance(0.4))];
}

// ---------------------------------------------------------------------------
// Gate data
// ---------------------------------------------------------------------------

type Gate = 'AND' | 'OR' | 'NAND' | 'NOR' | 'XOR' | 'XNOR';
const GATES: readonly Gate[] = ['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'];

function gate2(g: Gate, a: number, b: number): number {
  switch (g) {
    case 'AND':
      return a & b;
    case 'OR':
      return a | b;
    case 'NAND':
      return 1 - (a & b);
    case 'NOR':
      return 1 - (a | b);
    case 'XOR':
      return a ^ b;
    case 'XNOR':
      return 1 - (a ^ b);
  }
}

// ---------------------------------------------------------------------------
// Boolean laws (statement pool)
// ---------------------------------------------------------------------------

const LAW_TRUTHS: ReadonlyArray<readonly [string, string]> = [
  [tex`$A + 1 = 1$`, 'OR with 1 always gives 1 (null law).'],
  [tex`$A \cdot 0 = 0$`, 'AND with 0 always gives 0 (null law).'],
  [tex`$A + \overline{A} = 1$`, 'one of $A$ and $\\overline{A}$ is always 1 (complement law).'],
  [tex`$A \cdot \overline{A} = 0$`, 'one of $A$ and $\\overline{A}$ is always 0 (complement law).'],
  [tex`$A + A = A$`, 'ORing a variable with itself leaves it unchanged (idempotent law).'],
  [tex`$A \cdot A = A$`, 'ANDing a variable with itself leaves it unchanged (idempotent law).'],
  [tex`$A \cdot 1 = A$`, 'AND with 1 passes $A$ through unchanged (identity law).'],
  [tex`$A + 0 = A$`, 'OR with 0 passes $A$ through unchanged (identity law).'],
  [tex`$\overline{\overline{A}} = A$`, 'complementing twice restores the variable (double complement law).'],
  [tex`$A + A \cdot B = A$`, 'if $A = 1$ both sides are 1 and if $A = 0$ both sides are 0 (absorption law).'],
  [tex`$\overline{A + B} = \overline{A} \cdot \overline{B}$`, "the complement of a sum is the product of the complements (De Morgan's theorem)."],
  [tex`$\overline{A \cdot B} = \overline{A} + \overline{B}$`, "the complement of a product is the sum of the complements (De Morgan's theorem)."],
];

const LAW_FALSEHOODS: ReadonlyArray<readonly [string, string]> = [
  [tex`$A + 1 = A$`, 'for $A = 0$ the left side is 1 but the right side is 0; in fact $A + 1 = 1$.'],
  [tex`$A \cdot 0 = A$`, 'for $A = 1$ the left side is 0 but the right side is 1; in fact $A \\cdot 0 = 0$.'],
  [tex`$A + \overline{A} = 0$`, 'one of $A$ and $\\overline{A}$ is always 1, so $A + \\overline{A} = 1$.'],
  [tex`$A \cdot \overline{A} = 1$`, 'one of $A$ and $\\overline{A}$ is always 0, so $A \\cdot \\overline{A} = 0$.'],
  [tex`$A \cdot 1 = 1$`, 'for $A = 0$ the left side is 0; in fact $A \\cdot 1 = A$.'],
  [tex`$A + 0 = 0$`, 'for $A = 1$ the left side is 1; in fact $A + 0 = A$.'],
  [tex`$A + A \cdot B = B$`, 'for $A = 1, B = 0$ the left side is 1 but the right side is 0; in fact $A + A \\cdot B = A$.'],
  [tex`$\overline{A + B} = \overline{A} + \overline{B}$`, 'for $A = 1, B = 0$ the left side is 0 but the right side is 1; De Morgan gives $\\overline{A + B} = \\overline{A} \\cdot \\overline{B}$.'],
  [tex`$\overline{A \cdot B} = \overline{A} \cdot \overline{B}$`, 'for $A = 1, B = 0$ the left side is 1 but the right side is 0; De Morgan gives $\\overline{A \\cdot B} = \\overline{A} + \\overline{B}$.'],
];

const LAW_REASON = new Map<string, string>([...LAW_TRUTHS, ...LAW_FALSEHOODS]);

// ---------------------------------------------------------------------------
// Flowchart symbols
// ---------------------------------------------------------------------------

const SYMBOLS: ReadonlyArray<{ shape: string; use: string }> = [
  { shape: 'Oval', use: 'the start or end (terminal) of the flowchart' },
  { shape: 'Rectangle', use: 'a processing step such as a calculation or assignment' },
  { shape: 'Parallelogram', use: 'an input or output operation' },
  { shape: 'Diamond', use: 'a decision that has two or more exits' },
  { shape: 'Small circle', use: 'a connector joining parts of the flowchart' },
  { shape: 'Arrow', use: 'the direction of flow from one step to the next' },
];

const FENCE = '```';

export default defineBank('computer', 'logic-algorithms', (b) => [
  // -------------------------------------------------------------------------
  // Logic gates
  // -------------------------------------------------------------------------
  b.dynamic('gate-for-given-output', { difficulty: 1, origin: 'past-paper', tags: ['logic gates'] }, (r) => {
    const a = r.int(0, 1);
    const c = r.int(0, 1);
    const out = r.int(0, 1);
    const yes = GATES.filter((g) => gate2(g, a, c) === out);
    const no = GATES.filter((g) => gate2(g, a, c) !== out);
    const answer = r.pick(yes);
    const table = GATES.map((g) => `${g} $\\to ${gate2(g, a, c)}$`);
    return {
      stem: tex`For the inputs $A = ${a}$ and $B = ${c}$, which two-input logic gate gives an output of $${out}$?`,
      answer,
      distractors: r.sample(no, 3),
      explanation: tex`With $A = ${a}$, $B = ${c}$ the gate outputs are: ${listText(table)}. AND is 1 only when both inputs are 1, OR is 1 when at least one input is 1, XOR is 1 when the inputs differ, and NAND, NOR and XNOR are their complements. Of the options, only ${answer} gives $${out}$.`,
    };
  }),

  b.dynamic('gate-output-count', { difficulty: 2, tags: ['logic gates', 'truth tables'] }, (r) => {
    const n = r.int(2, 4);
    const g = r.pick(['AND', 'OR', 'NAND', 'NOR'] as const);
    const out = r.int(0, 1);
    const rows = 2 ** n;
    // The single special row: all 1s for AND/NAND, all 0s for OR/NOR.
    const special = g === 'AND' || g === 'NAND' ? 'all inputs are 1' : 'all inputs are 0';
    const specialOut = g === 'AND' || g === 'NOR' ? 1 : 0;
    const count = out === specialOut ? 1 : rows - 1;
    const { answer, distractors } = numericOptions(r, {
      correct: count,
      wrong: [count === 1 ? rows - 1 : 1, rows, rows / 2, n],
      format: (x) => `$${x}$`,
    });
    return {
      stem: tex`For how many of the input combinations does a ${n}-input ${g} gate give an output of $${out}$?`,
      answer,
      distractors,
      explanation: tex`${n} inputs give $2^{${n}} = ${rows}$ combinations. ${g === 'AND' || g === 'OR' ? 'An' : 'A'} ${g} gate outputs $${specialOut}$ only when ${special} (one combination) and $${1 - specialOut}$ for the other $${rows} - 1 = ${rows - 1}$. So the output is $${out}$ for $${count}$ combination${count === 1 ? '' : 's'}.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Truth tables
  // -------------------------------------------------------------------------
  b.dynamic('truth-table-size', { difficulty: 1, tags: ['truth tables'] }, (r) => {
    const n = r.int(2, 8);
    const rows = 2 ** n;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: rows,
        wrong: [n * n, 2 * n, rows - 1, 2 * rows, rows / 2],
        format: (x) => `$${x}$`,
      });
      return {
        stem: tex`The truth table of a logic circuit with ${n} input variables has how many rows (input combinations)?`,
        answer,
        distractors,
        explanation: tex`Each input can be 0 or 1, so $n$ inputs give $2^{n}$ combinations: $2^{${n}} = ${rows}$ rows.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      wrong: [rows / 2, n + 1, n - 1, 2 * n],
      format: (x) => `$${x}$`,
    });
    return {
      stem: tex`A truth table lists all ${rows} possible input combinations of a logic circuit. The number of input variables is:`,
      answer,
      distractors,
      explanation: tex`$n$ inputs give $2^{n}$ rows, so $2^{n} = ${rows}$ gives $n = ${n}$.`,
    };
  }),

  b.dynamic('input-combination-for-output', { difficulty: 2, tags: ['truth tables', 'Boolean algebra'] }, (r) => {
    const [x, y, z] = randomLiterals(r);
    const shape = r.int(0, 5);
    const f =
      shape === 0
        ? or(and(x, y), z)
        : shape === 1
          ? and(or(x, y), z)
          : shape === 2
            ? and(xor(x, y), z)
            : shape === 3
              ? or(not(or(x, y)), z)
              : shape === 4
                ? and(and(x, y), z)
                : or(or(x, y), z);
    const ones = ROWS.filter((row) => evaluate(f, row) === 1);
    const zeros = ROWS.filter((row) => evaluate(f, row) === 0);
    const targets = [...(ones.length >= 1 && zeros.length >= 3 ? [1] : []), ...(zeros.length >= 1 && ones.length >= 3 ? [0] : [])];
    const target = r.pick(targets);
    const [right, wrong] = target === 1 ? [ones, zeros] : [zeros, ones];
    const env = r.pick(right);
    const answer = envTex(env);
    const substituted = render(f, env);
    const simplified = render(f, env, true);
    const working = substituted === simplified ? substituted : `${substituted} = ${simplified}`;
    return {
      stem: tex`For the Boolean function $F = ${render(f)}$, which input combination gives $F = ${target}$?`,
      answer,
      distractors: pickDistractors(answer, r.sample(wrong, 3).map(envTex)),
      explanation: tex`Substitute ${answer}: $F = ${working} = ${target}$. Each of the other three options gives $F = ${1 - target}$.`,
    };
  }),

  // -------------------------------------------------------------------------
  // Boolean algebra
  // -------------------------------------------------------------------------
  b.dynamic('boolean-law-statements', { difficulty: 1, tags: ['Boolean algebra'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following Boolean identities is correct?',
      negativeStem: 'Which of the following Boolean identities is **incorrect**?',
      truths: LAW_TRUTHS.map(([s]) => s),
      falsehoods: LAW_FALSEHOODS.map(([s]) => s),
      explain: (answer, inverted) =>
        inverted
          ? `${answer} is wrong: ${LAW_REASON.get(answer) ?? ''} The other three are valid identities.`
          : `${answer} is valid: ${LAW_REASON.get(answer) ?? ''} Each of the other options fails for some value of the variables.`,
    }),
  ),

  b.dynamic('de-morgan-complement', { difficulty: 2, origin: 'past-paper', tags: ['Boolean algebra'] }, (r) => {
    const [x, y, z] = randomLiterals(r);
    const [cx, cy, cz] = [comp(x), comp(y), comp(z)];
    const sumForm = r.chance(0.5); // F = X.Y + Z, otherwise F = (X + Y).Z
    const f = sumForm ? or(and(x, y), z) : and(or(x, y), z);
    const correct = sumForm ? and(or(cx, cy), cz) : or(and(cx, cy), cz);
    const candidates: Expr[] = sumForm
      ? [
          or(and(cx, cy), cz), // complemented the literals but kept the operators
          and(or(cx, cy), z), // forgot to complement the last term
          and(and(cx, cy), cz), // turned every operator into AND
          and(or(x, y), cz), // complemented only the last term
          or(or(cx, cy), cz),
        ]
      : [
          and(or(cx, cy), cz), // complemented the literals but kept the operators
          or(and(cx, cy), z), // forgot to complement the last term
          or(or(cx, cy), cz), // turned every operator into OR
          or(and(x, y), cz), // complemented only the last term
          and(and(cx, cy), cz),
        ];
    const sig = signature(correct);
    const answer = `$${render(correct)}$`;
    const distractors = pickDistractors(
      answer,
      candidates.filter((c) => signature(c) !== sig).map((c) => `$${render(c)}$`),
    );
    const step = sumForm
      ? `\\overline{${render(and(x, y))}} \\cdot ${render(not(z))} = (${render(or(not(x), not(y)))}) \\cdot ${render(not(z))}`
      : `\\overline{${render(or(x, y))}} + ${render(not(z))} = ${render(and(not(x), not(y)))} + ${render(not(z))}`;
    const hasDoubleBar = [x, y, z].some((e) => e.k === 'not');
    const finish = hasDoubleBar
      ? `, and removing double bars gives $\\overline{F} = ${render(correct)}$.`
      : '.';
    return {
      stem: tex`Using De Morgan's theorems, the complement of $F = ${render(f)}$ is:`,
      answer,
      distractors,
      explanation: tex`De Morgan's theorems: $\overline{P + Q} = \overline{P} \cdot \overline{Q}$ and $\overline{P \cdot Q} = \overline{P} + \overline{Q}$, i.e. complement every literal and swap AND with OR. $\overline{F} = \overline{${render(f)}} = ${step}$${finish}`,
    };
  }),

  // -------------------------------------------------------------------------
  // Flowcharts and algorithms
  // -------------------------------------------------------------------------
  b.dynamic('flowchart-symbols', { difficulty: 1, origin: 'past-paper', tags: ['flowcharts'] }, (r) => {
    const [item, ...others] = r.sample(SYMBOLS, 4) as [(typeof SYMBOLS)[number], ...(typeof SYMBOLS)[number][]];
    if (r.chance(0.5)) {
      return {
        stem: `In a flowchart, which symbol is used to show ${item.use}?`,
        answer: item.shape,
        distractors: others.map((s) => s.shape),
        explanation: `The ${item.shape.toLowerCase()} shows ${item.use}. Standard symbols: oval for start/stop, rectangle for processing, parallelogram for input/output, diamond for decisions, small circle for connectors and arrows for the flow lines.`,
      };
    }
    const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
    return {
      stem: `In a flowchart, the ${item.shape.toLowerCase()} symbol represents:`,
      answer: cap(item.use),
      distractors: others.map((s) => cap(s.use)),
      explanation: `The ${item.shape.toLowerCase()} shows ${item.use}. Standard symbols: oval for start/stop, rectangle for processing, parallelogram for input/output, diamond for decisions, small circle for connectors and arrows for the flow lines.`,
    };
  }),

  b.dynamic('algorithm-trace-sum', { difficulty: 2, tags: ['algorithms', 'flowcharts'] }, (r) => {
    const start = r.int(1, 6);
    const step = r.int(2, 5);
    const m = r.int(3, 6); // the loop body runs m + 1 times
    const limit = start + step * m + r.int(0, step - 1);
    const terms = Array.from({ length: m + 1 }, (_, i) => start + step * i);
    const sum = terms.reduce((s, t) => s + t, 0);
    const last = terms[m] as number;
    const next = last + step;
    const { answer, distractors } = numericOptions(r, {
      correct: sum,
      wrong: [sum - last, sum + next, sum - start, next, sum + step],
      format: (x) => `$${x}$`,
    });
    const code = [
      'Step 1: S = 0, I = ' + start,
      `Step 2: If I > ${limit} then go to Step 6`,
      'Step 3: S = S + I',
      `Step 4: I = I + ${step}`,
      'Step 5: Go to Step 2',
      'Step 6: Print S',
    ].join('\n');
    return {
      stem: `What value is printed by the following algorithm?\n${FENCE}text\n${code}\n${FENCE}`,
      answer,
      distractors,
      explanation: tex`Step 3 adds $I$ for $I = ${terms.join(', ')}$. When $I$ becomes $${next} > ${limit}$ the loop stops. So $S = ${terms.join(' + ')} = ${sum}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'universal-gate',
      d: 1,
      o: 'past-paper',
      t: ['logic gates'],
      q: 'Which of the following is a universal gate, from which any logic circuit can be built?',
      a: 'NAND',
      x: ['AND', 'OR', 'XOR'],
      e: tex`NAND (and also NOR) is universal: NOT, AND and OR can all be made from NAND gates alone, e.g. $\overline{A \cdot A} = \overline{A}$. AND or OR alone cannot produce an inversion, and XOR alone cannot produce AND, so none of them is universal.`,
    },
    {
      id: 'boolean-algebra-founder',
      d: 1,
      o: 'past-paper',
      t: ['Boolean algebra'],
      q: 'Boolean algebra, the mathematical basis of digital logic circuits, was developed by:',
      a: 'George Boole',
      x: ['Charles Babbage', 'Blaise Pascal', 'John von Neumann'],
      e: 'The English mathematician George Boole set out the algebra of logic in his book The Laws of Thought (1854). Babbage designed the Analytical Engine, Pascal built an early mechanical adding machine, and von Neumann proposed the stored-program concept.',
    },
    {
      id: 'half-adder-gates',
      d: 2,
      t: ['logic gates'],
      q: 'A half adder adds two bits A and B. Its Sum and Carry outputs are produced by:',
      a: 'an XOR gate and an AND gate',
      x: ['an OR gate and an AND gate', 'an XOR gate and an OR gate', 'an XNOR gate and a NAND gate'],
      e: tex`Sum is 1 when exactly one input is 1, so $\text{Sum} = A \oplus B$ (XOR). Carry is 1 only when both inputs are 1, so $\text{Carry} = A \cdot B$ (AND). An OR gate would give Sum $= 1$ for $1 + 1$, which is wrong.`,
    },
    {
      id: 'xor-from-nand-count',
      d: 3,
      t: ['logic gates', 'Boolean algebra'],
      q: 'The minimum number of two-input NAND gates needed to build a two-input XOR gate is:',
      a: '4',
      x: ['3', '5', '2'],
      e: tex`Let $P = \overline{A \cdot B}$ (gate 1). Then $Q = \overline{A \cdot P} = \overline{A} + B$ (gate 2), $R = \overline{B \cdot P} = A + \overline{B}$ (gate 3), and $\overline{Q \cdot R} = A \cdot \overline{B} + \overline{A} \cdot B = A \oplus B$ (gate 4). No circuit with fewer NAND gates can produce XOR, so the minimum is 4.`,
    },
    {
      id: 'absorption-law',
      d: 2,
      o: 'past-paper',
      t: ['Boolean algebra'],
      q: tex`The Boolean expression $A + A \cdot B$ simplifies to:`,
      a: '$A$',
      x: ['$B$', tex`$A \cdot B$`, '$A + B$'],
      e: tex`$A + A \cdot B = A \cdot (1 + B) = A \cdot 1 = A$ (absorption law). Check: for $A = 0, B = 1$ the expression is 0, which rules out $B$ and $A + B$; for $A = 1, B = 0$ it is 1, which rules out $A \cdot B$.`,
    },
    {
      id: 'redundant-literal-law',
      d: 3,
      t: ['Boolean algebra'],
      q: tex`The Boolean expression $A + \overline{A} \cdot B$ simplifies to:`,
      a: '$A + B$',
      x: ['$A$', tex`$A \cdot B$`, tex`$\overline{A} + B$`],
      e: tex`By the distributive law $A + \overline{A} \cdot B = (A + \overline{A}) \cdot (A + B) = 1 \cdot (A + B) = A + B$. Check: for $A = 0, B = 1$ the expression is 1, ruling out $A$ and $A \cdot B$; for $A = 1, B = 0$ it is 1, ruling out $\overline{A} + B$.`,
    },
    {
      id: 'flowchart-definition',
      d: 1,
      t: ['flowcharts', 'algorithms'],
      q: 'The graphical representation of the steps of an algorithm using standard symbols is called:',
      a: 'a flowchart',
      x: ['pseudocode', 'a truth table', 'a source program'],
      e: 'A flowchart draws the steps of an algorithm with standard symbols joined by arrows. Pseudocode describes the steps in English-like text, a truth table lists the outputs of a logic circuit, and a source program is the algorithm written in a programming language.',
    },
    {
      id: 'algorithm-finiteness',
      d: 1,
      t: ['algorithms'],
      q: 'The property that an algorithm must stop after a finite number of steps is called:',
      a: 'finiteness',
      x: ['definiteness', 'effectiveness', 'efficiency'],
      e: 'Finiteness means the algorithm terminates after a finite number of steps. Definiteness means every step is precisely and unambiguously defined, effectiveness means each step is basic enough to be carried out, and efficiency refers to how little time and memory it uses.',
    },
    {
      id: 'repetition-structure',
      d: 1,
      t: ['algorithms', 'flowcharts'],
      q: 'The control structure in which a group of steps is executed again and again until a condition is satisfied is called:',
      a: 'repetition (loop)',
      x: ['sequence', 'selection', 'top-down design'],
      e: 'Repetition (a loop) executes a block of steps repeatedly while, or until, a condition holds. Sequence executes steps once in order, selection chooses one of several paths by a condition, and top-down design is a way of breaking a problem into smaller parts.',
    },
  ]),
]);
