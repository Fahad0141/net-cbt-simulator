import { EXAM_TYPES, examTypeByCode, examTypeById, PAPER_CODE_PREFIXES } from '@/config/exams';
import { formatPaperCode } from '@/engine/assemble';
import { parsePaperCode } from '@/engine/paperCode';
import { isValidSeed, normalizeSeed } from '@/engine/rng';
import {
  type CustomPaperSpec,
  decodeSpec,
  encodeSpec,
  type GenerationOptions,
  optionsFromQuery,
  optionsToQuery,
  resolvePaperCode,
} from '@/exam/papers';

/** Example shown in placeholders, hints and error messages. */
export const EXAMPLE_PAPER_CODE = 'ENG-K7Q2-9XM4';

const CUSTOM = 'custom';
const CUSTOM_PREFIX = 'CUS';

export interface ResolvedPaperCode {
  ok: true;
  /** Exam type id, e.g. `engineering`, or `custom`. */
  examType: string;
  examName: string;
  seed: string;
  /** Canonical spelling, e.g. `ENG-K7Q2-9XM4`. */
  code: string;
  /** Non-default generation options carried by a pasted link (a bare code has none). */
  options: Partial<GenerationOptions>;
  /** The sections of a custom test, read from a pasted link. */
  custom: CustomPaperSpec | null;
}

export interface RejectedPaperCode {
  ok: false;
  reason: 'empty' | 'custom' | 'unknown-type' | 'malformed';
  message: string;
}

export type PaperCodeCheck = ResolvedPaperCode | RejectedPaperCode;

/**
 * Hyphenated code-shaped words inside longer text (a pasted sentence or link path),
 * found at every word start so a preceding word cannot swallow the prefix.
 */
const CODE_TOKEN = /\b(?=([A-Za-z]{2,5}-[0-9A-Za-z]{2,8}(?:-[0-9A-Za-z]{1,8})?)\b)/g;

/** A full code with a separator after the prefix, as the New Paper page reads its `seed` parameter. */
const PREFIXED = /^([A-Za-z]{2,5})[\s_-]+(.+)$/;

const CUSTOM_CODE_MESSAGE =
  'Custom test codes cannot be opened from the code alone, because the code does not record which sections you chose. Paste the full link you were given, or build the test again from New Paper.';

const CUSTOM_LINK_MESSAGE =
  'This custom test link is incomplete or damaged, so its sections cannot be read. Copy the whole link again, or build the test from New Paper.';

const currentPrefixes = () =>
  EXAM_TYPES.filter((e) => e.era === 'current')
    .map((e) => e.code)
    .join(', ');

/** The `/new` path that regenerates the paper behind a valid code or link. */
export function paperCodePath(check: ResolvedPaperCode): string {
  const query = new URLSearchParams({ type: check.examType, seed: check.seed });
  optionsToQuery(check.options, query);
  if (check.custom) query.set('spec', encodeSpec(check.custom));
  return `/new?${query.toString()}`;
}

/** True when a resolved link asks for non-default generation settings. */
export function hasCustomSettings(check: ResolvedPaperCode): boolean {
  return Object.keys(check.options).length > 0;
}

function resolve(input: string): ResolvedPaperCode | null {
  const result = resolvePaperCode(input);
  if (!result) return null;
  return {
    ok: true,
    examType: result.examType,
    examName: examTypeById(result.examType)?.name ?? result.examType,
    seed: result.seed,
    code: result.code,
    options: {},
    custom: null,
  };
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** A full code (`ENG-K7Q2-9XM4`) or a bare seed (`K7Q29XM4`), as found in a link. */
function readSeed(text: string): { prefix: string | null; seed: string } | null {
  const prefixed = PREFIXED.exec(text);
  const prefix = prefixed?.[1]?.toUpperCase();
  if (prefixed && prefix && PAPER_CODE_PREFIXES.includes(prefix)) {
    const seed = normalizeSeed(prefixed[2] ?? '');
    return isValidSeed(seed) ? { prefix, seed } : null;
  }
  const seed = normalizeSeed(text);
  return isValidSeed(seed) ? { prefix: null, seed } : null;
}

/**
 * Reads a pasted app link, `…/#/new?type=…&seed=…` or `…/#/paper/<code>?…`, keeping
 * its generation options and, for a custom test, its sections. Null when `text` is
 * not such a link.
 */
function fromLink(text: string): PaperCodeCheck | null {
  const at = text.indexOf('?');
  if (at < 0) return null;
  const query = new URLSearchParams(text.slice(at + 1));
  const pathCode = /\/paper\/([^/?#\s]+)/i.exec(text.slice(0, at))?.[1];
  const found = readSeed(safeDecode(pathCode ?? query.get('seed') ?? '').trim());
  const type = (query.get('type') ?? '').trim();
  const isCustom =
    found?.prefix === CUSTOM_PREFIX ||
    type.toLowerCase() === CUSTOM ||
    type.toUpperCase() === CUSTOM_PREFIX;

  if (isCustom) {
    const custom = decodeSpec(query.get('spec'));
    if (!found || !custom) return { ok: false, reason: 'custom', message: CUSTOM_LINK_MESSAGE };
    return {
      ok: true,
      examType: CUSTOM,
      examName: custom.title?.trim() || 'Custom test',
      seed: found.seed,
      code: formatPaperCode(CUSTOM_PREFIX, found.seed),
      options: optionsFromQuery(query),
      custom,
    };
  }

  if (!found) return null;
  const exam = found.prefix
    ? examTypeByCode(found.prefix)
    : (examTypeById(type) ?? examTypeByCode(type.toUpperCase()));
  if (!exam) return null;
  return {
    ok: true,
    examType: exam.id,
    examName: exam.name,
    seed: found.seed,
    code: formatPaperCode(exam.code, found.seed),
    options: optionsFromQuery(query),
    custom: null,
  };
}

/** Every spelling worth trying for `text`, most literal first. */
function candidates(text: string): string[] {
  const list = [text];
  // `ENGK7Q29XM4`: the prefix runs into the seed (every prefix has three letters).
  if (/^[A-Za-z]{3}[0-9A-Za-z]{4,16}$/.test(text))
    list.push(`${text.slice(0, 3)}-${text.slice(3)}`);
  // A code inside a sentence or URL path (`Paper code: ENG-K7Q2-9XM4`, `#/paper/ENG-...`).
  for (const match of text.matchAll(CODE_TOKEN)) if (match[1]) list.push(match[1]);
  return list;
}

/**
 * Validates a paper code typed or pasted by the user and explains what is wrong
 * with it. Accepts every spelling `resolvePaperCode` accepts (`eng k7q2 9xm4`, ...),
 * full share links (including custom tests and non-default generation settings) and
 * a code inside pasted text.
 */
export function checkPaperCode(input: string): PaperCodeCheck {
  const text = input.trim();
  if (!text) {
    return {
      ok: false,
      reason: 'empty',
      message: `Enter a paper code, for example ${EXAMPLE_PAPER_CODE}.`,
    };
  }

  const link = fromLink(text);
  if (link) return link;

  const tries = candidates(text);
  for (const candidate of tries) {
    const found = resolve(candidate);
    if (found) return found;
  }

  if (
    tries.some(
      (candidate) => parsePaperCode(candidate, PAPER_CODE_PREFIXES)?.prefix === CUSTOM_PREFIX,
    )
  ) {
    return { ok: false, reason: 'custom', message: CUSTOM_CODE_MESSAGE };
  }

  const prefix = /^([A-Za-z]{2,5})[-\s_]/.exec(text)?.[1]?.toUpperCase();
  if (prefix && !PAPER_CODE_PREFIXES.includes(prefix)) {
    return {
      ok: false,
      reason: 'unknown-type',
      message: `"${prefix}" is not a known paper type. Codes start with ${currentPrefixes()}, or a legacy prefix such as LEN.`,
    };
  }

  return {
    ok: false,
    reason: 'malformed',
    message: `That does not look like a paper code. A code is a paper-type prefix followed by 4 to 16 letters or digits, like ${EXAMPLE_PAPER_CODE}.`,
  };
}
