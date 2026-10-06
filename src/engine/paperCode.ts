import { formatPaperCode } from './assemble';
import { isValidSeed, normalizeSeed } from './rng';

export interface ParsedPaperCode {
  prefix: string;
  seed: string;
  /** Canonical spelling, e.g. `ENG-K7Q2-9XM4`. */
  code: string;
}

/**
 * Parses a paper code typed by a user (`eng-k7q2-9xm4`, `ENG K7Q29XM4`, ...).
 * `knownPrefixes` restricts the accepted exam-type prefixes.
 */
export function parsePaperCode(
  input: string,
  knownPrefixes: readonly string[],
): ParsedPaperCode | null {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '-');
  const match = /^([A-Z]{2,5})-?(.+)$/.exec(cleaned);
  if (!match) return null;
  const prefix = match[1] as string;
  if (!knownPrefixes.includes(prefix)) return null;
  const seed = normalizeSeed(match[2] as string);
  if (!isValidSeed(seed)) return null;
  return { prefix, seed, code: formatPaperCode(prefix, seed) };
}
