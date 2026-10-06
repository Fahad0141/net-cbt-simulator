import { examTypeById, PAPER_CODE_PREFIXES } from '@/config/exams';
import { formatPaperCode } from '@/engine/assemble';
import { parsePaperCode } from '@/engine/paperCode';
import { isValidSeed, normalizeSeed, randomSeed } from '@/engine/rng';
import {
  type CustomPaperSpec,
  decodeSpec,
  type GenerationOptions,
  optionsFromQuery,
  optionsToQuery,
  type PaperRequest,
  resolvePaperCode,
} from '@/exam/papers';
import { PRINT_SETTING_KEYS } from './settings';

/** A paper URL that can be generated. */
export interface ResolvedPaper {
  ok: true;
  /** Exam type id, or `custom`. */
  examType: string;
  /** Paper-code prefix (`ENG`, ..., `CUS`). */
  prefix: string;
  seed: string;
  /** Canonical paper code, e.g. `ENG-K7Q2-9XM4`. */
  code: string;
  options: Partial<GenerationOptions>;
  custom?: CustomPaperSpec;
  /** The raw `spec` query value of a custom paper (re-used verbatim in links). */
  specParam?: string;
  /** Stable identity of what will be generated (changes only when the paper changes). */
  key: string;
  request: PaperRequest;
}

export type PaperProblem = 'invalid-code' | 'missing-spec';

export interface UnresolvedPaper {
  ok: false;
  problem: PaperProblem;
  /** The code as it appeared in the URL. */
  code: string;
}

export type PaperResolution = ResolvedPaper | UnresolvedPaper;

export const CUSTOM_PREFIX = 'CUS';

/** Seed part of a loosely typed code: strips a known exam prefix and normalises the rest. */
function looseSeed(code: string): string | null {
  const trimmed = code.trim();
  const prefixed = /^([A-Za-z]{2,5})[-\s]+(.+)$/.exec(trimmed);
  const rest =
    prefixed && PAPER_CODE_PREFIXES.includes((prefixed[1] as string).toUpperCase())
      ? (prefixed[2] as string)
      : trimmed;
  const seed = normalizeSeed(rest);
  return isValidSeed(seed) ? seed : null;
}

/**
 * Works out which paper a `#/paper/<code>?...` URL refers to.
 *
 * - Standard papers are identified by their code alone (`ENG-K7Q2-9XM4`); the
 *   code's prefix wins over any `type` parameter.
 * - Custom papers (`type=custom` or a `CUS-` code) also need the `spec` parameter;
 *   their seed is the code's seed part.
 * - A bare seed is accepted together with a known `type` (`K7Q29XM4?type=engineering`).
 * - `dyn`, `mix` and `pp` carry non-default generation options.
 */
export function resolvePaperUrl(code: string, query: URLSearchParams): PaperResolution {
  const options = optionsFromQuery(query);
  const optionKey = optionsToQuery(options).toString();
  const type = (query.get('type') ?? '').trim();
  const parsed = parsePaperCode(code, PAPER_CODE_PREFIXES);

  if (type === 'custom' || parsed?.prefix === CUSTOM_PREFIX) {
    const seed = parsed?.seed ?? looseSeed(code);
    if (!seed) return { ok: false, problem: 'invalid-code', code };
    const specParam = query.get('spec') ?? '';
    const custom = decodeSpec(specParam);
    if (!custom) return { ok: false, problem: 'missing-spec', code };
    return {
      ok: true,
      examType: 'custom',
      prefix: CUSTOM_PREFIX,
      seed,
      code: formatPaperCode(CUSTOM_PREFIX, seed),
      options,
      custom,
      specParam,
      key: `custom|${seed}|${specParam}|${optionKey}`,
      request: { examType: 'custom', seed, options, custom },
    };
  }

  // A full standard code identifies the paper; otherwise a bare seed needs a known `type`.
  const standard = resolvePaperCode(code);
  const exam = standard ? examTypeById(standard.examType) : parsed ? undefined : examTypeById(type);
  const seed = standard?.seed ?? (parsed ? null : looseSeed(code));
  if (!exam || !seed) return { ok: false, problem: 'invalid-code', code };
  return {
    ok: true,
    examType: exam.id,
    prefix: exam.code,
    seed,
    code: formatPaperCode(exam.code, seed),
    options,
    key: `${exam.id}|${seed}|${optionKey}`,
    request: { examType: exam.id, seed, options },
  };
}

/** Query that identifies the paper itself (type, generation options, custom spec). */
function paperQuery(paper: ResolvedPaper): URLSearchParams {
  const query = new URLSearchParams();
  if (paper.examType === 'custom') query.set('type', 'custom');
  optionsToQuery(paper.options, query);
  if (paper.specParam) query.set('spec', paper.specParam);
  return query;
}

/** App path that sets up this exact paper as a CBT test (`/new?type=..&seed=..`). */
export function cbtPath(paper: ResolvedPaper): string {
  const query = new URLSearchParams();
  query.set('type', paper.examType);
  query.set('seed', paper.seed);
  for (const [key, value] of paperQuery(paper)) if (key !== 'type') query.set(key, value);
  return `/new?${query.toString()}`;
}

/**
 * App path of a fresh paper of the same kind (same type, options and custom spec)
 * that keeps the print settings found in `current` (the page's query).
 */
export function anotherPaperPath(
  paper: ResolvedPaper,
  current: URLSearchParams,
  seed: string = randomSeed(),
): string {
  const query = paperQuery(paper);
  for (const key of PRINT_SETTING_KEYS) {
    const value = current.get(key);
    if (value !== null) query.set(key, value);
  }
  const text = query.toString();
  return `/paper/${formatPaperCode(paper.prefix, seed)}${text ? `?${text}` : ''}`;
}

/** App path of a paper code typed by the user, or null when the code is not valid. */
export function pathForTypedCode(input: string): string | null {
  const standard = resolvePaperCode(input);
  return standard ? `/paper/${standard.code}` : null;
}
