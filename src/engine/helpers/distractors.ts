import type { Rng } from '../rng';
import type { AuthoredQuestion } from '../types';
import { approxEqual } from './math';

/**
 * Canonical form used to decide whether two options would look identical to a
 * candidate (ignores `$`, spacing commands, braces, `\mathrm`, case, whitespace).
 */
export function normalizeOption(text: string): string {
  return text
    .replace(/\\(mathrm|text|textrm|operatorname|mathit|mathbf|displaystyle|left|right)\b/g, '')
    .replace(/\\[,;:! ]/g, '')
    .replace(/\\(dfrac|tfrac)\b/g, '\\frac')
    .replace(/[\s${}]/g, '')
    .toLowerCase();
}

export interface NumericOptionsSpec {
  /** The correct value. */
  correct: number;
  /**
   * Wrong values produced by plausible mistakes, best first (forgot a factor of 2,
   * used sin for cos, wrong sign, ...). Invalid/duplicate ones are skipped.
   */
  wrong: readonly number[];
  /** Formats a value as a complete option string (include `$` and units). */
  format: (value: number) => string;
  /** Fallback perturbation style when `wrong` yields fewer than three options. */
  fallback?: 'scale' | 'integer' | 'offset';
  /** Allow negative wrong values even if the correct value is positive. */
  allowNegative?: boolean;
  /** Allow zero as a wrong value. */
  allowZero?: boolean;
}

/**
 * Builds `{ answer, distractors }` for a numeric question.
 * Guarantees three distractors whose *formatted* strings differ from each other and
 * from the answer, preferring the author's mistake-based values.
 */
export function numericOptions(
  rng: Rng,
  spec: NumericOptionsSpec,
): { answer: string; distractors: string[] } {
  const { correct, wrong, format, allowNegative = false, allowZero = false } = spec;
  const fallback = spec.fallback ?? (Number.isInteger(correct) ? 'integer' : 'scale');
  const answer = format(correct);
  const seen = new Set([normalizeOption(answer)]);
  const distractors: string[] = [];

  const consider = (value: number): void => {
    if (distractors.length >= 3) return;
    if (!Number.isFinite(value)) return;
    if (!allowZero && value === 0 && correct !== 0) return;
    if (!allowNegative && correct > 0 && value < 0) return;
    if (approxEqual(value, correct)) return;
    const text = format(value);
    const key = normalizeOption(text);
    if (seen.has(key)) return;
    seen.add(key);
    distractors.push(text);
  };

  wrong.forEach(consider);

  const base = correct === 0 ? 1 : correct;
  const scale = rng.shuffle([2, 0.5, 1.5, 0.75, 1.25, 3, 1 / 3, 4, 0.25, 10, 0.1, 1.1, 0.9]);
  const step = Math.max(1, Math.round(Math.abs(base) * 0.1));
  const offsets = rng.shuffle([1, -1, 2, -2, 3, -3, 4, -4, 5, -5]).map((k) => k * step);

  if (fallback === 'integer') {
    offsets.forEach((o) => consider(correct + o));
    scale.forEach((s) => consider(Math.round(base * s)));
  } else if (fallback === 'offset') {
    offsets.forEach((o) => consider(correct + o));
    scale.forEach((s) => consider(base * s));
  } else {
    scale.forEach((s) => consider(base * s));
    offsets.forEach((o) => consider(correct + o));
  }
  for (let k = 2; distractors.length < 3 && k < 50; k++) consider(base * k + k);

  if (distractors.length < 3) {
    throw new Error(`numericOptions: could not build 3 distinct distractors for ${correct}`);
  }
  return { answer, distractors };
}

/**
 * Picks three distractors from candidate strings, skipping any that would look
 * identical to the answer or to each other. Candidates are taken in order unless
 * `shuffle` is set. Throws if fewer than three survive (fix the template).
 */
export function pickDistractors(
  answer: string,
  candidates: readonly string[],
  rng?: Rng,
): string[] {
  const pool = rng ? rng.shuffle(candidates) : candidates;
  const seen = new Set([normalizeOption(answer)]);
  const out: string[] = [];
  for (const c of pool) {
    const key = normalizeOption(c);
    if (!c.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length === 3) return out;
  }
  throw new Error(`pickDistractors: only ${out.length} distinct distractors for "${answer}"`);
}

export interface StatementPool {
  /** Stem when asking for the TRUE statement, e.g. "Which of the following is correct?" */
  stem: string;
  /** Stem when asking for the FALSE statement (optional, enables the inverted variant). */
  negativeStem?: string;
  /** Statements that are true. */
  truths: readonly string[];
  /** Statements that are false. */
  falsehoods: readonly string[];
  /** Explanation; receives the correct option and whether the variant was inverted. */
  explain: (answer: string, inverted: boolean) => string;
}

/**
 * Builds a varied "which statement is correct / incorrect" question from pools of
 * true and false statements. Each instance draws a different combination.
 */
export function statementQuestion(rng: Rng, pool: StatementPool): AuthoredQuestion {
  const canInvert = Boolean(pool.negativeStem) && pool.truths.length >= 3;
  const inverted = canInvert && pool.falsehoods.length >= 1 && rng.chance(0.35);
  if (inverted) {
    const answer = rng.pick(pool.falsehoods);
    return {
      stem: pool.negativeStem as string,
      answer,
      distractors: rng.sample(pool.truths, 3),
      explanation: pool.explain(answer, true),
    };
  }
  const answer = rng.pick(pool.truths);
  return {
    stem: pool.stem,
    answer,
    distractors: rng.sample(pool.falsehoods, 3),
    explanation: pool.explain(answer, false),
  };
}

/** Sorts option strings by numeric value when every option starts with a number. */
export function sortNumericOptions(options: readonly string[]): string[] | null {
  const values = options.map((o) => {
    const m = /-?\d+(?:\.\d+)?/.exec(o.replace(/\\,|\s/g, ''));
    return m ? Number(m[0]) : NaN;
  });
  if (values.some((v) => Number.isNaN(v))) return null;
  return options
    .map((o, i) => ({ o, v: values[i] as number }))
    .sort((a, b) => a.v - b.v)
    .map((x) => x.o);
}
