import { defineBank } from '@/engine/authoring';
import { listText, numericOptions, pickDistractors, range, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';
import type { AuthoredQuestion } from '@/engine/types';

/*
 * Number Systems and Data Representation (legacy NET computer science, ICS Part I).
 *
 * Numerals are written as (digits)_{base} with the digits in \mathrm so that hexadecimal
 * letters stay upright. Every distractor models a real slip: remainders read in the wrong
 * order, bits grouped from the wrong end, carries or borrows ignored, the +1 of the
 * 2's complement forgotten, BCD confused with pure binary, and so on. Candidates are
 * different numerals in the answer's base without leading zeros (or fixed-width patterns of
 * the same width), so a distractor can never be equal in value to the answer.
 */

// ---------------------------------------------------------------------------
// Numeral helpers
// ---------------------------------------------------------------------------

/** Digits of a non-negative integer in `base`, upper case: digitsOf(175, 16) = 'AF'. */
const digitsOf = (n: number, base: number): string => n.toString(base).toUpperCase();

/** Value of a digit string in `base`. */
const valueOf = (text: string, base: number): number => parseInt(text, base);

/** A numeral with its base as a subscript, for math mode: (\mathrm{2AF})_{16}. */
const numeral = (text: string, base: number): string => `(\\mathrm{${text}})_{${base}}`;

/** An option showing a numeral. */
const numeralOption = (text: string, base: number): string => `$${numeral(text, base)}$`;

const reverse = (text: string): string => [...text].reverse().join('');

/** Drops leading zeros but keeps a lone 0. */
const stripZeros = (text: string): string => text.replace(/^0+(?=.)/, '');

const invert = (bits: string): string => [...bits].map((bit) => (bit === '1' ? '0' : '1')).join('');

/** Fixed-width bit pattern: bitsOf(5, 8) = '00000101'. */
const bitsOf = (n: number, width: number): string => n.toString(2).padStart(width, '0');

/** A bit pattern for math mode; 8-bit patterns get a thin space between the nibbles. */
const patternTex = (bits: string): string =>
  bits.length === 8 ? `${bits.slice(0, 4)}\\,${bits.slice(4)}` : bits;

const patternOption = (bits: string): string => `$${patternTex(bits)}$`;

/** Joins LaTeX pieces with a visible gap (bit groups, digits, BCD nibbles). */
const spaced = (parts: readonly string[]): string => parts.join('\\;\\;');

/** Digits shown one per group, upright: \mathrm{1\;\;3\;\;5}. */
const digitsTex = (text: string): string => `\\mathrm{${spaced([...text])}}`;

/** Groups of `size` bits counted from the right; the leftmost group is padded with zeros. */
function groupFromRight(bits: string, size: number): string[] {
  const padded = bits.padStart(Math.ceil(bits.length / size) * size, '0');
  const groups: string[] = [];
  for (let i = 0; i < padded.length; i += size) groups.push(padded.slice(i, i + size));
  return groups;
}

/** The classic slip: groups counted from the left, leaving a short group at the right end. */
function groupFromLeft(bits: string, size: number): string[] {
  const groups: string[] = [];
  for (let i = 0; i < bits.length; i += size) groups.push(bits.slice(i, i + size));
  return groups;
}

/** Converts each group of bits to one octal or hexadecimal digit. */
const groupsToDigits = (groups: readonly string[]): string =>
  groups.map((g) => digitsOf(valueOf(g, 2), 16)).join('');

/** Each digit as a fixed-width group of bits: perDigitBits('257', 8, 3) = ['010', '101', '111']. */
const perDigitBits = (text: string, base: number, width: number): string[] =>
  [...text].map((ch) => bitsOf(valueOf(ch, base), width));

/** Hexadecimal letters written as decimal numbers, a common slip: '2B5' -> '2115'. */
const lettersAsNumbers = (hex: string): string =>
  [...hex].map((ch) => String(valueOf(ch, 16))).join('');

/** Distinct letters A-F of a hexadecimal numeral, in order of appearance. */
const hexLetters = (hex: string): string[] => [...new Set([...hex].filter((ch) => ch >= 'A'))];

/**
 * A hexadecimal numeral with `length` digits: no leading zero, leading digit at most
 * `maxLead`, and at least one letter A-F so that the question really tests hexadecimal.
 */
function hexNumeral(r: Rng, length: number, maxLead = 15): string {
  const ds = [r.int(1, maxLead), ...Array.from({ length: length - 1 }, () => r.int(0, 15))];
  if (!ds.some((d) => d >= 10)) {
    ds[maxLead >= 10 ? r.int(0, length - 1) : r.int(1, length - 1)] = r.int(10, 15);
  }
  return ds.map((d) => digitsOf(d, 16)).join('');
}

/**
 * Numerals that differ from `text` in exactly one digit by 1 (one group or division step
 * done wrongly), never creating a leading zero. In random order.
 */
function digitSlips(r: Rng, text: string, base: number): string[] {
  const out: string[] = [];
  [...text].forEach((ch, i) => {
    const d = valueOf(ch, base);
    for (const nd of [d - 1, d + 1]) {
      if (nd < 0 || nd >= base || (i === 0 && nd === 0 && text.length > 1)) continue;
      out.push(text.slice(0, i) + digitsOf(nd, base) + text.slice(i + 1));
    }
  });
  return r.shuffle(out);
}

/**
 * Answer and distractors for a question whose answer is `value` written in `base`.
 * `mistakes` (digit strings in that base, best first) model real slips; one-digit slips of
 * the answer and, as a last resort, nearby values fill any gap, so three distinct
 * distractors always exist.
 */
function numeralChoices(
  r: Rng,
  value: number,
  base: number,
  mistakes: readonly string[],
): { answer: string; distractors: string[] } {
  const text = digitsOf(value, base);
  const nearby = [1, 2, 3, 4].flatMap((k) => [value - k, value + k]).filter((v) => v > 0);
  const pool = [...mistakes, ...digitSlips(r, text, base), ...r.shuffle(nearby).map((v) => digitsOf(v, base))];
  const answer = numeralOption(text, base);
  return { answer, distractors: pickDistractors(answer, pool.map((c) => numeralOption(c, base))) };
}

/** Fixed-width patterns that differ from `bits` in exactly one position. */
const bitFlips = (r: Rng, bits: string): string[] =>
  r.shuffle([...bits].map((bit, i) => bits.slice(0, i) + (bit === '1' ? '0' : '1') + bits.slice(i + 1)));

/** Repeated-division steps as LaTeX, e.g. '300 = 16 \times 18 + 12'. */
function divisionSteps(n: number, base: number): string {
  const steps: string[] = [];
  for (let m = n; m > 0; m = Math.floor(m / base)) {
    steps.push(`$${m} = ${base} \\times ${Math.floor(m / base)} + ${m % base}$`);
  }
  return steps.join(', ');
}

const FENCE = '```';

/** Right-aligned column working (addition, subtraction, multiplication) as a code block. */
function columnWorking(
  top: string,
  op: string,
  second: string,
  result: string,
  partials: readonly string[] = [],
): string {
  const width =
    Math.max(top.length, second.length + 2, result.length, ...partials.map((p) => p.length)) + 1;
  const rule = '-'.repeat(width);
  const lines = [
    top.padStart(width),
    op + second.padStart(width - 1),
    rule,
    ...(partials.length ? [...partials.map((p) => p.padStart(width)), rule] : []),
    result.padStart(width),
  ];
  return `${FENCE}text\n${lines.join('\n')}\n${FENCE}`;
}

// ---------------------------------------------------------------------------
// Binary <-> octal / hexadecimal by grouping bits
// ---------------------------------------------------------------------------

function binaryToOctal(r: Rng): AuthoredQuestion {
  const n = r.int(70, 2047); // 7 to 11 bits
  const bits = digitsOf(n, 2);
  const octal = digitsOf(n, 8);
  const hex = digitsOf(n, 16);
  return {
    stem: tex`The octal equivalent of $${numeral(bits, 2)}$ is:`,
    ...numeralChoices(r, n, 8, [
      groupsToDigits(groupFromLeft(bits, 3)), // grouped from the left
      ...(/^[0-7]+$/.test(hex) ? [hex] : []), // grouped in fours
      ...(octal.endsWith('0') ? [] : [reverse(octal)]), // digits written in reverse order
    ]),
    explanation: tex`Since $8 = 2^{3}$, group the bits in threes from the right (pad the leftmost group with 0s) and replace each group by one octal digit: $${spaced(groupFromRight(bits, 3))} \rightarrow ${digitsTex(octal)}$. Hence $${numeral(bits, 2)} = ${numeral(octal, 8)}$.`,
  };
}

function binaryToHex(r: Rng): AuthoredQuestion {
  const hex = hexNumeral(r, 3, 7); // 9 to 11 bits, so the grouping direction matters
  const n = valueOf(hex, 16);
  const bits = digitsOf(n, 2);
  return {
    stem: tex`The hexadecimal equivalent of $${numeral(bits, 2)}$ is:`,
    ...numeralChoices(r, n, 16, [
      groupsToDigits(groupFromLeft(bits, 4)), // grouped from the left
      digitsOf(n, 8), // grouped in threes
      lettersAsNumbers(hex), // 11 written instead of B
      ...(hex.endsWith('0') ? [] : [reverse(hex)]), // digits written in reverse order
    ]),
    explanation: tex`Since $16 = 2^{4}$, group the bits in fours from the right (pad the leftmost group with 0s) and replace each group by one hexadecimal digit, writing 10 to 15 as A to F: $${spaced(groupFromRight(bits, 4))} \rightarrow ${digitsTex(hex)}$. Hence $${numeral(bits, 2)} = ${numeral(hex, 16)}$.`,
  };
}

function octalToBinary(r: Rng): AuthoredQuestion {
  const n = r.int(64, 511);
  const octal = digitsOf(n, 8);
  const bits = digitsOf(n, 2);
  const triples = perDigitBits(octal, 8, 3);
  const reversible = triples.flatMap((t, i) => (reverse(t) !== t ? [i] : []));
  const k = reversible.length ? r.pick(reversible) : -1;
  const mapping = [...octal].map((ch, i) => `$${ch} \\to ${triples[i]}$`);
  return {
    stem: tex`The binary equivalent of $${numeral(octal, 8)}$ is:`,
    ...numeralChoices(r, n, 2, [
      stripZeros(perDigitBits(octal, 8, 4).join('')), // four bits per octal digit
      ...(k >= 0 ? [stripZeros(triples.map((t, i) => (i === k ? reverse(t) : t)).join(''))] : []), // one group written backwards
      stripZeros(perDigitBits(reverse(octal), 8, 3).join('')), // digits taken in reverse order
      ...digitSlips(r, octal, 8).map((o) => digitsOf(valueOf(o, 8), 2)), // one digit converted wrongly
    ]),
    explanation: tex`Replace each octal digit by its 3-bit binary equivalent: ${listText(mapping)}. So $${numeral(octal, 8)} = (${spaced(triples)})_{2} = ${numeral(bits, 2)}$ after dropping the leading 0s.`,
  };
}

function hexToBinary(r: Rng): AuthoredQuestion {
  const hex = hexNumeral(r, r.pick([2, 3]));
  const n = valueOf(hex, 16);
  const bits = digitsOf(n, 2);
  const nibbles = perDigitBits(hex, 16, 4);
  const reversible = nibbles.flatMap((g, i) => (reverse(g) !== g ? [i] : []));
  const k = reversible.length ? r.pick(reversible) : -1;
  const mapping = [...hex].map((ch, i) => `$\\mathrm{${ch}} \\to ${nibbles[i]}$`);
  return {
    stem: tex`The binary equivalent of $${numeral(hex, 16)}$ is:`,
    ...numeralChoices(r, n, 2, [
      ...(k >= 0 ? [stripZeros(nibbles.map((g, i) => (i === k ? reverse(g) : g)).join(''))] : []), // one group written backwards
      stripZeros(perDigitBits(reverse(hex), 16, 4).join('')), // digits taken in reverse order
      ...digitSlips(r, hex, 16).map((h) => digitsOf(valueOf(h, 16), 2)), // one digit converted wrongly
    ]),
    explanation: tex`Replace each hexadecimal digit by its 4-bit binary equivalent: ${listText(mapping)}. So $${numeral(hex, 16)} = (${spaced(nibbles)})_{2} = ${numeral(bits, 2)}$ after dropping the leading 0s.`,
  };
}

function hexToOctal(r: Rng): AuthoredQuestion {
  const hex = hexNumeral(r, r.pick([2, 3]));
  const n = valueOf(hex, 16);
  const bits = digitsOf(n, 2);
  const octal = digitsOf(n, 8);
  return {
    stem: tex`The octal equivalent of $${numeral(hex, 16)}$ is:`,
    ...numeralChoices(r, n, 8, [
      groupsToDigits(groupFromLeft(bits, 3)), // regrouped from the left
      [...hex].map((ch) => digitsOf(valueOf(ch, 16), 8)).join(''), // each hex digit converted on its own
      ...(octal.endsWith('0') ? [] : [reverse(octal)]), // digits written in reverse order
    ]),
    explanation: tex`Go through binary. Each hexadecimal digit gives 4 bits: $${spaced(perDigitBits(hex, 16, 4))}$. Regroup the bits in threes from the right and convert each group: $${spaced(groupFromRight(bits, 3))} \rightarrow ${digitsTex(octal)}$. Hence $${numeral(hex, 16)} = ${numeral(octal, 8)}$.`,
  };
}

function octalToHex(r: Rng): AuthoredQuestion {
  const n = r.int(100, 2047);
  const octal = digitsOf(n, 8);
  const bits = digitsOf(n, 2);
  const hex = digitsOf(n, 16);
  return {
    stem: tex`The hexadecimal equivalent of $${numeral(octal, 8)}$ is:`,
    ...numeralChoices(r, n, 16, [
      groupsToDigits(groupFromLeft(bits, 4)), // regrouped from the left
      octal, // digits copied without converting
      ...(hexLetters(hex).length ? [lettersAsNumbers(hex)] : []), // 12 written instead of C
      ...(hex.endsWith('0') ? [] : [reverse(hex)]), // digits written in reverse order
    ]),
    explanation: tex`Go through binary. Each octal digit gives 3 bits: $${spaced(perDigitBits(octal, 8, 3))}$. Regroup the bits in fours from the right and convert each group: $${spaced(groupFromRight(bits, 4))} \rightarrow ${digitsTex(hex)}$. Hence $${numeral(octal, 8)} = ${numeral(hex, 16)}$.`,
  };
}

// ---------------------------------------------------------------------------
// Octal / hexadecimal <-> decimal by place values and repeated division
// ---------------------------------------------------------------------------

/** Value of a list of digit values in `base` (Horner's rule). */
const evaluate = (digits: readonly number[], base: number): number =>
  digits.reduce((acc, d) => acc * base + d, 0);

function hexToDecimal(r: Rng): AuthoredQuestion {
  // Two digits, or three digits below 500 hex, keep the arithmetic at NET size.
  const hex = r.chance(0.6) ? hexNumeral(r, 2) : hexNumeral(r, 3, 4);
  const ds = [...hex].map((ch) => valueOf(ch, 16));
  const n = valueOf(hex, 16);
  const { answer, distractors } = numericOptions(r, {
    correct: n,
    wrong: [
      evaluate(ds, 10), // place values of 10 used instead of 16
      evaluate([...ds].reverse(), 16), // place values counted from the left
      evaluate(ds.map((d) => (d >= 10 ? d + 1 : d)), 16), // A taken as 11, B as 12, ...
      evaluate(ds, 8), // place values of 8 used
    ],
    format: (v) => `$${v}$`,
  });
  const top = ds.length - 1;
  const terms = ds.map((d, i) => `${d} \\times 16^{${top - i}}`).join(' + ');
  const parts = ds.map((d, i) => d * 16 ** (top - i)).join(' + ');
  const letters = hexLetters(hex).map((ch) => `$\\mathrm{${ch}} = ${valueOf(ch, 16)}$`);
  return {
    stem: tex`The decimal equivalent of $${numeral(hex, 16)}$ is:`,
    answer,
    distractors,
    explanation: tex`Here ${listText(letters)}. Multiply each digit by its place value: $${numeral(hex, 16)} = ${terms} = ${parts} = ${n}$.`,
  };
}

function octalToDecimal(r: Rng): AuthoredQuestion {
  const n = r.int(64, 511);
  const octal = digitsOf(n, 8);
  const [d2, d1, d0] = [...octal].map(Number) as [number, number, number];
  const { answer, distractors } = numericOptions(r, {
    correct: n,
    wrong: [
      valueOf(reverse(octal), 8), // place values counted from the left
      16 * d2 + 8 * d1 + d0, // 8^2 taken as 16
      Number(octal), // digits read as a decimal number
      8 * n, // positions counted from 1 instead of 0
    ],
    format: (v) => `$${v}$`,
  });
  return {
    stem: tex`The decimal equivalent of $${numeral(octal, 8)}$ is:`,
    answer,
    distractors,
    explanation: tex`Multiply each digit by its place value: $${numeral(octal, 8)} = ${d2} \times 8^{2} + ${d1} \times 8^{1} + ${d0} \times 8^{0} = ${64 * d2} + ${8 * d1} + ${d0} = ${n}$.`,
  };
}

function decimalToHex(r: Rng): AuthoredQuestion {
  // The answer has a letter; the decimal number stays below 1024.
  const hex = r.chance(0.5) ? hexNumeral(r, 2) : hexNumeral(r, 3, 3);
  const n = valueOf(hex, 16);
  const letters = hexLetters(hex).map((ch) => `${valueOf(ch, 16)} as ${ch}`);
  return {
    stem: tex`The hexadecimal equivalent of $${numeral(String(n), 10)}$ is:`,
    ...numeralChoices(r, n, 16, [
      ...(hex.endsWith('0') ? [] : [reverse(hex)]), // remainders read from first to last
      lettersAsNumbers(hex), // a remainder such as 12 written as "12"
      digitsOf(n, 8), // divided by 8 instead of 16
    ]),
    explanation: tex`Divide repeatedly by 16: ${divisionSteps(n, 16)}. Reading the remainders from the last one to the first, and writing ${listText(letters)}, gives $${numeral(String(n), 10)} = ${numeral(hex, 16)}$.`,
  };
}

function decimalToOctal(r: Rng): AuthoredQuestion {
  const n = r.int(65, 500);
  const octal = digitsOf(n, 8);
  const hex = digitsOf(n, 16);
  return {
    stem: tex`The octal equivalent of $${numeral(String(n), 10)}$ is:`,
    ...numeralChoices(r, n, 8, [
      ...(octal.endsWith('0') ? [] : [reverse(octal)]), // remainders read from first to last
      ...(/^[0-7]+$/.test(hex) ? [hex] : []), // divided by 16 instead of 8
    ]),
    explanation: tex`Divide repeatedly by 8: ${divisionSteps(n, 8)}. Reading the remainders from the last one to the first gives $${numeral(String(n), 10)} = ${numeral(octal, 8)}$.`,
  };
}

// ---------------------------------------------------------------------------
// Binary arithmetic
// ---------------------------------------------------------------------------

function binaryAddition(r: Rng): AuthoredQuestion {
  const a = r.int(19, 63);
  let b = r.intExcept(9, 63, [a]);
  if ((a & b) === 0) b |= a & -a; // at least one column must produce a carry
  const [x, y] = a >= b ? [a, b] : [b, a];
  const sum = x + y;
  const [xb, yb, sb] = [digitsOf(x, 2), digitsOf(y, 2), digitsOf(sum, 2)];
  const width = xb.length;
  return {
    stem: tex`The sum of $${numeral(xb, 2)}$ and $${numeral(yb, 2)}$ is:`,
    ...numeralChoices(r, sum, 2, [
      digitsOf(x ^ y, 2), // carries ignored
      digitsOf(x | y, 2), // 1 + 1 written as 1
      ...(sum >= 2 ** width ? [digitsOf(sum - 2 ** width, 2)] : []), // final carry dropped
    ]),
    explanation: [
      tex`Add column by column from the right, using $1 + 1 = (10)_{2}$ (write 0, carry 1) and $1 + 1 + 1 = (11)_{2}$ (write 1, carry 1):`,
      columnWorking(xb, '+', yb, sb),
      tex`Check in decimal: $${x} + ${y} = ${sum}$.`,
    ].join('\n'),
  };
}

function binarySubtraction(r: Rng): AuthoredQuestion {
  let x = 0;
  let y = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    x = r.int(24, 63);
    y = r.int(7, x - 5);
    if ((~x & y) !== 0) break; // at least one column must need a borrow
  }
  const diff = x - y;
  const [xb, yb, db] = [digitsOf(x, 2), digitsOf(y, 2), digitsOf(diff, 2)];
  return {
    stem: tex`Subtracting $${numeral(yb, 2)}$ from $${numeral(xb, 2)}$ gives:`,
    ...numeralChoices(r, diff, 2, [
      digitsOf(x ^ y, 2), // borrows never paid back
      digitsOf(x + y, 2), // added instead of subtracting
    ]),
    explanation: [
      tex`Subtract column by column from the right. Where $0 - 1$ occurs, borrow 1 from the next column on the left, so that the column becomes $(10)_{2} - 1 = 1$:`,
      columnWorking(xb, '-', yb, db),
      tex`Check in decimal: $${x} - ${y} = ${diff}$.`,
    ].join('\n'),
  };
}

function binaryMultiplication(r: Rng): AuthoredQuestion {
  const x = r.int(5, 15);
  const y = r.pick([3, 5, 6, 7]); // at least two 1s, so the shifts matter
  const product = x * y;
  const [xb, yb, pb] = [digitsOf(x, 2), digitsOf(y, 2), digitsOf(product, 2)];
  const ones = [...yb].filter((bit) => bit === '1').length;
  const shiftedCopies = [...yb].reverse().flatMap((bit, k) => (bit === '1' ? [x << k] : []));
  const partials = [...yb]
    .reverse()
    .map((bit, k) => (bit === '1' ? xb : '0'.repeat(xb.length)) + ' '.repeat(k));
  return {
    stem: tex`The product $${numeral(xb, 2)} \times ${numeral(yb, 2)}$ is:`,
    ...numeralChoices(r, product, 2, [
      digitsOf(x * ones, 2), // partial products not shifted
      digitsOf(shiftedCopies.reduce((acc, v) => acc ^ v, 0), 2), // partial products added without carries
      digitsOf(x + y, 2), // added instead of multiplying
    ]),
    explanation: [
      tex`For each bit of $${numeral(yb, 2)}$, starting from the right, write $${numeral(xb, 2)}$ (for a 1) or a row of 0s (for a 0), shifting one place left each time, then add the rows:`,
      columnWorking(xb, '×', yb, pb, partials),
      tex`Check in decimal: $${x} \times ${y} = ${product}$.`,
    ].join('\n'),
  };
}

// ---------------------------------------------------------------------------
// Complements and signed numbers
// ---------------------------------------------------------------------------

/** Misapplied shortcut: keeps bits from the left up to the first 1, then inverts the rest. */
function shortcutFromLeft(bits: string): string {
  const i = bits.indexOf('1');
  return bits.slice(0, i + 1) + invert(bits.slice(i + 1));
}

// ---------------------------------------------------------------------------
// Chapter
// ---------------------------------------------------------------------------

export default defineBank('computer', 'number-systems', (b) => [
  b.dynamic(
    'decimal-binary-conversion',
    { difficulty: 1, origin: 'past-paper', tags: ['binary', 'conversions'] },
    (r) => {
      const n = r.intExcept(21, 250, [32, 64, 128]);
      const bits = digitsOf(n, 2);
      const powers = [...bits].flatMap((bit, i) => (bit === '1' ? [bits.length - 1 - i] : []));
      const powerSum = powers.map((p) => `2^{${p}}`).join(' + ');
      const valueSum = powers.map((p) => 2 ** p).join(' + ');
      const dec = numeral(String(n), 10);
      const bin = numeral(bits, 2);

      if (r.chance(0.5)) {
        const reversed = reverse(bits);
        const zeroAt = [...bits].flatMap((bit, i) => (bit === '0' ? [i] : []));
        const skip = zeroAt.length ? r.pick(zeroAt) : -1;
        return {
          stem: tex`The binary equivalent of $${dec}$ is:`,
          ...numeralChoices(r, n, 2, [
            ...(reversed.startsWith('1') ? [reversed] : []), // remainders read from first to last
            ...(skip >= 0 ? [bits.slice(0, skip) + bits.slice(skip + 1)] : []), // a 0 remainder left out
          ]),
          explanation: tex`Write ${n} as a sum of powers of 2: $${n} = ${valueSum} = ${powerSum}$. Each power present puts a 1 in that position and every other position is 0, so $${dec} = ${bin}$. (Repeated division by 2 gives the same bits when the remainders are read from the last one to the first.)`,
        };
      }

      const { answer, distractors } = numericOptions(r, {
        correct: n,
        wrong: [
          valueOf(reverse(bits), 2), // place values counted from the left
          2 * n, // positions numbered from 1, so every weight is doubled
          ...(n % 2 === 1 ? [n - 1] : []), // 2^0 taken as 0
          n + 2 ** (bits.length - 1), // leftmost bit given the weight 2^(number of bits)
        ],
        format: (v) => `$${v}$`,
      });
      return {
        stem: tex`The decimal equivalent of $${bin}$ is:`,
        answer,
        distractors,
        explanation: tex`Add the place values of the positions that hold a 1: $${bin} = ${powerSum} = ${valueSum} = ${n}$.`,
      };
    },
  ),

  b.dynamic(
    'binary-octal-hex-grouping',
    { difficulty: 2, origin: 'past-paper', tags: ['octal', 'hexadecimal', 'conversions'] },
    (r) =>
      r.pick([binaryToOctal, binaryToHex, octalToBinary, hexToBinary, hexToOctal, octalToHex])(r),
  ),

  b.dynamic(
    'octal-hex-decimal-conversion',
    { difficulty: 2, origin: 'past-paper', tags: ['octal', 'hexadecimal', 'conversions'] },
    (r) => r.weighted([hexToDecimal, octalToDecimal, decimalToHex, decimalToOctal], [7, 5, 5, 3])(r),
  ),

  b.dynamic(
    'binary-arithmetic',
    { difficulty: 2, origin: 'past-paper', tags: ['binary arithmetic'] },
    (r) => r.weighted([binaryAddition, binarySubtraction, binaryMultiplication], [5, 4, 2])(r),
  ),

  b.dynamic('ones-twos-complement', { difficulty: 2, tags: ['complements'] }, (r) => {
    const width = r.pick([5, 6, 7, 8, 8, 8]);
    const size = 2 ** width;
    // Exclude all 0s, all 1s and 10...0 (which is its own 2's complement).
    const x = r.intExcept(1, size - 2, [size / 2]);
    const bits = bitsOf(x, width);
    const ones = invert(bits);
    const twos = bitsOf(size - x, width);
    const wantTwos = r.chance(0.65);
    const answerBits = wantTwos ? twos : ones;
    const candidates = wantTwos
      ? [
          ones, // forgot to add 1
          bitsOf((2 * size - x - 2) % size, width), // added 1 before inverting
          shortcutFromLeft(bits), // copy-then-invert shortcut applied from the wrong end
          bitsOf((x + 1) % size, width), // added 1 without inverting
          ...bitFlips(r, twos),
        ]
      : [
          twos, // added 1 as well
          reverse(bits), // reversed the bits instead of inverting them
          ...bitFlips(r, ones),
        ];
    const answer = patternOption(answerBits);
    return {
      stem: tex`The ${wantTwos ? "2's" : "1's"} complement of the ${width}-bit binary number $${patternTex(bits)}$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates.map(patternOption)),
      explanation: wantTwos
        ? tex`First invert every bit to get the 1's complement, $${patternTex(ones)}$, then add 1: $${patternTex(ones)} + 1 = ${patternTex(twos)}$. (Shortcut: copy the bits from the right up to and including the first 1, then invert all the remaining bits.)`
        : tex`The 1's complement is formed by inverting every bit (each 0 becomes 1 and each 1 becomes 0): $${patternTex(bits)} \rightarrow ${patternTex(ones)}$. Adding 1 to it would give the 2's complement, $${patternTex(twos)}$.`,
    };
  }),

  b.dynamic(
    'signed-twos-complement-value',
    { difficulty: 3, tags: ['complements', 'binary'] },
    (r) => {
      if (r.chance(0.5)) {
        // Decode a negative 8-bit pattern (10000000 and 11111111 are left out).
        const x = r.int(129, 254);
        const bits = bitsOf(x, 8);
        const magnitude = 256 - x;
        const { answer, distractors } = numericOptions(r, {
          correct: -magnitude,
          wrong: [
            x, // read as an unsigned number
            -(x - 128), // read as sign-and-magnitude
            x - 255, // read as 1's complement
            magnitude, // minus sign dropped
          ],
          format: (v) => `$${v}$`,
          allowNegative: true,
        });
        return {
          stem: tex`An 8-bit register holds the 2's complement number $${patternTex(bits)}$. Its decimal value is:`,
          answer,
          distractors,
          explanation: tex`The MSB is 1, so the number is negative. Its magnitude is the 2's complement of the pattern: invert to get $${patternTex(invert(bits))}$ and add 1 to get $${patternTex(bitsOf(magnitude, 8))} = ${magnitude}$. So the value is $-${magnitude}$ (check: $${x} - 256 = -${magnitude}$).`,
        };
      }
      // Encode -m. m = 64 is left out: its sign-and-magnitude form equals its 2's complement form.
      const m = r.intExcept(3, 127, [64]);
      const answerBits = bitsOf(256 - m, 8);
      const answer = patternOption(answerBits);
      const candidates = [
        bitsOf(128 + m, 8), // sign-and-magnitude
        bitsOf(255 - m, 8), // 1's complement (forgot to add 1)
        bitsOf(m, 8), // minus sign ignored
        bitsOf(254 - m, 8), // added 1 before inverting
      ];
      return {
        stem: tex`In 8-bit 2's complement form, the decimal number $-${m}$ is stored as:`,
        answer,
        distractors: pickDistractors(answer, candidates.map(patternOption)),
        explanation: tex`Write $+${m}$ in 8 bits: $${patternTex(bitsOf(m, 8))}$. Invert every bit: $${patternTex(bitsOf(255 - m, 8))}$ (the 1's complement). Add 1: $${patternTex(answerBits)}$. (Sign-and-magnitude form would instead be $${patternTex(bitsOf(128 + m, 8))}$.)`,
      };
    },
  ),

  b.dynamic('bcd-encoding', { difficulty: 1, tags: ['codes'] }, (r) => {
    const n = r.chance(0.6) ? r.int(12, 99) : r.int(101, 999);
    const ds = [...String(n)].map(Number);
    const bcd = (digits: readonly number[]): string[] => digits.map((d) => bitsOf(d, 4));
    const groups = bcd(ds);
    const code = groups.join('\\;');
    const reversible = groups.flatMap((g, i) => (reverse(g) !== g ? [i] : []));

    if (r.chance(0.7)) {
      // Pure binary, padded to as many 4-bit groups as the BCD code so the options stay parallel.
      const binaryGroups = groupFromRight(bitsOf(n, 4 * ds.length), 4);
      const k = reversible.length ? r.pick(reversible) : -1;
      const candidates = [
        binaryGroups, // whole number converted to binary
        bcd([...ds].reverse()), // digits coded in reverse order
        bcd(ds.map((d) => d + 3)), // excess-3 code
        ...(k >= 0 ? [groups.map((g, i) => (i === k ? reverse(g) : g))] : []), // one digit's bits backwards
        ...digitSlips(r, String(n), 10).map((s) => bcd([...s].map(Number))),
      ];
      const answer = `$${code}$`;
      const mapping = ds.map((d, i) => `$${d} \\to ${groups[i]}$`);
      return {
        stem: tex`The BCD (binary coded decimal) code of the decimal number $${n}$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates.map((c) => `$${c.join('\\;')}$`)),
        explanation: tex`In BCD each decimal digit is coded separately in 4 bits: ${listText(mapping)}. So ${n} is $${code}$ in BCD. (Converting the whole number to binary gives $${binaryGroups.join('\\;')}$, which is pure binary, not BCD.)`,
      };
    }

    const allBits = groups.join('');
    const misread = reversible.flatMap((i) => {
      const v = valueOf(reverse(groups[i] as string), 2);
      return v <= 9 ? [Number(ds.map((d, j) => (j === i ? v : d)).join(''))] : [];
    });
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      wrong: [
        valueOf(allBits, 2), // all bits read as one binary number
        Number(reverse(String(n))), // groups read from right to left
        ...r.shuffle(misread), // one group's bits read backwards
      ],
      format: (v) => `$${v}$`,
    });
    const mapping = ds.map((d, i) => `$${groups[i]} \\to ${d}$`);
    return {
      stem: tex`The BCD code $${code}$ represents the decimal number:`,
      answer,
      distractors,
      explanation: tex`Split the code into 4-bit groups and convert each group to one decimal digit: ${listText(mapping)}. So the number is ${n}. (Reading all ${allBits.length} bits as one binary number gives ${valueOf(allBits, 2)}, which ignores the BCD grouping.)`,
    };
  }),

  b.dynamic(
    'compare-across-bases',
    { difficulty: 3, tags: ['conversions', 'binary', 'octal', 'hexadecimal'] },
    (r) => {
      const start = r.int(40, 230);
      const values = r.sample(range(start, start + 7), 4);
      const bases = r.shuffle([2, 8, 10, 16]);
      const largest = r.chance(0.5);
      const target = largest ? Math.max(...values) : Math.min(...values);
      const items = values.map((v, i) => {
        const base = bases[i] as number;
        return { v, base, text: digitsOf(v, base) };
      });
      type Item = (typeof items)[number];
      const key = items.find((it) => it.v === target) ?? (items[0] as Item);
      const expand = ({ v, base, text }: Item): string => {
        if (base === 10) return `$${numeral(text, base)} = ${v}$`;
        const ds = [...text].map((ch) => valueOf(ch, base));
        const top = ds.length - 1;
        const terms = ds.flatMap((d, i) => {
          if (!d) return [];
          const weight = base ** (top - i);
          if (base === 2) return [String(weight)];
          return [weight === 1 ? String(d) : `${d} \\times ${weight}`];
        });
        return `$${numeral(text, base)} = ${terms.join(' + ')} = ${v}$`;
      };
      const word = largest ? 'largest' : 'smallest';
      const worked = [...items].sort((p, q) => p.base - q.base).map(expand).join('; ');
      return {
        stem: tex`Which of the following numbers is the **${word}**?`,
        answer: numeralOption(key.text, key.base),
        distractors: items.filter((it) => it !== key).map((it) => numeralOption(it.text, it.base)),
        explanation: tex`Convert each number to decimal: ${worked}. The ${word} is $${numeral(key.text, key.base)} = ${key.v}$.`,
      };
    },
  ),

  ...b.mcqs([
    {
      id: 'hex-digit-bits',
      d: 1,
      t: ['hexadecimal', 'binary'],
      q: 'How many bits are needed to represent one hexadecimal digit?',
      a: '4 bits',
      x: ['3 bits', '8 bits', '16 bits'],
      e: tex`There are $16 = 2^{4}$ hexadecimal digits (0 to F), so each one matches a unique 4-bit group (a nibble), from $0000$ to $1111$. An octal digit needs only 3 bits because $8 = 2^{3}$.`,
    },
    {
      id: 'standard-ascii-size',
      d: 1,
      o: 'past-paper',
      t: ['codes'],
      q: 'Standard ASCII uses how many bits per character, and how many different characters can it represent?',
      a: '7 bits; 128 characters',
      x: ['8 bits; 256 characters', '16 bits; 65,536 characters', '6 bits; 64 characters'],
      e: tex`Standard ASCII is a 7-bit code, so it has $2^{7} = 128$ codes (0 to 127). 8-bit codes such as extended ASCII and EBCDIC have $2^{8} = 256$ codes, a 16-bit code has $2^{16} = 65{,}536$, and 6 bits would give only $2^{6} = 64$.`,
    },
    {
      id: 'unicode-world-scripts',
      d: 1,
      t: ['codes'],
      q: "Which character code is designed to represent the characters of almost all of the world's writing systems, including Urdu and Arabic?",
      a: 'Unicode',
      x: ['ASCII', 'EBCDIC', 'BCD'],
      e: 'ASCII (128 characters) and EBCDIC (256 characters) cover mainly English letters, digits and symbols, and 4-bit BCD codes only the decimal digits 0 to 9. Unicode gives a unique code to the characters of nearly every script, so Urdu, Arabic, Chinese and English text can be stored together.',
    },
    {
      id: 'bcd-unused-combinations',
      d: 1,
      t: ['codes'],
      q: 'In BCD (binary coded decimal), each decimal digit is stored in 4 bits. How many of the 16 possible 4-bit combinations are never used?',
      a: '6',
      x: ['4', '8', '10'],
      e: tex`Only $0000$ to $1001$ (the digits 0 to 9) are valid BCD codes. The remaining $16 - 10 = 6$ combinations, $1010$ to $1111$, are unused.`,
    },
    {
      id: 'twos-complement-advantage',
      d: 2,
      t: ['complements'],
      q: "Compared with 1's complement, an important advantage of the 2's complement representation of signed integers is that:",
      a: 'zero has only one representation',
      x: [
        'larger positive numbers can be stored in the same number of bits',
        'no sign bit is required',
        'no addition is needed to form the complement',
      ],
      e: tex`In 8-bit 1's complement, both $0000\,0000$ ($+0$) and $1111\,1111$ ($-0$) stand for zero. In 2's complement zero is only $0000\,0000$, which frees a pattern for $-128$ and keeps addition and subtraction simple. The largest positive value ($+127$ in 8 bits) is the same in both, the MSB is still the sign bit, and forming a 2's complement does need $+1$.`,
    },
    {
      id: 'subtraction-by-complement',
      d: 2,
      t: ['complements', 'binary arithmetic'],
      q: tex`To compute $A - B$, the arithmetic unit of a computer usually:`,
      a: "adds the 2's complement of B to A",
      x: [
        "adds the 2's complement of A to B",
        "subtracts the 2's complement of B from A",
        "adds the 1's complement of A to B",
      ],
      e: tex`The 2's complement of $B$ represents $-B$, so $A + (-B) = A - B$; this lets the same adder circuit carry out subtraction. Adding the 2's complement of $A$ to $B$ gives $B - A$, subtracting $-B$ from $A$ gives $A + B$, and adding the 1's complement of $A$ to $B$ (with an end-around carry) gives $B - A$.`,
    },
    {
      id: 'eight-bit-signed-range',
      d: 2,
      o: 'past-paper',
      t: ['complements', 'binary'],
      q: "The range of integers that can be stored in 8 bits using 2's complement representation is:",
      a: tex`$-128$ to $+127$`,
      x: [tex`$-127$ to $+127$`, tex`$0$ to $255$`, tex`$-128$ to $+128$`],
      e: tex`With $n$ bits, 2's complement covers $-2^{n-1}$ to $2^{n-1} - 1$; for $n = 8$ this is $-128$ to $+127$. The range $-127$ to $+127$ belongs to sign-and-magnitude and 1's complement (which waste a pattern on $-0$), and $0$ to $255$ is the unsigned range. $-128$ to $+128$ would need 257 patterns, but 8 bits give only $2^{8} = 256$.`,
    },
    {
      id: 'non-terminating-binary-fraction',
      d: 3,
      t: ['binary', 'conversions'],
      q: 'Which of the following decimal fractions **cannot** be represented exactly by a finite binary fraction?',
      a: '$0.1$',
      x: ['$0.5$', '$0.375$', '$0.8125$'],
      e: tex`A fraction has a finite binary form only when its denominator (in lowest terms) is a power of 2: $0.5 = \frac{1}{2} = (0.1)_{2}$, $0.375 = \frac{3}{8} = (0.011)_{2}$ and $0.8125 = \frac{13}{16} = (0.1101)_{2}$. But $0.1 = \frac{1}{10}$ has the factor 5 in its denominator, so $(0.1)_{10} = (0.0\overline{0011})_{2}$ repeats forever.`,
    },
    {
      id: 'appending-zero-doubles',
      d: 1,
      t: ['binary arithmetic', 'binary'],
      q: tex`Appending a 0 to the right of the binary number $(1011)_{2}$, making it $(10110)_{2}$, has the effect of:`,
      a: 'doubling its value',
      x: ['halving its value', 'multiplying its value by ten', 'adding 2 to its value'],
      e: tex`Every bit moves to a place of twice the weight, so the value doubles: $(1011)_{2} = 11$ and $(10110)_{2} = 22$. Appending a 0 multiplies a number by its base: by 2 in binary, just as it multiplies by ten in decimal.`,
    },
  ]),
]);
