import {
  blueprintFor,
  dynamicFactorFor,
  examTypeByCode,
  examTypeById,
  NOMINAL_DYNAMIC_SHARE,
  PAPER_CODE_PREFIXES,
  subjectsOf,
} from '@/config/exams';
import { SYLLABUS } from '@/config/syllabus';
import {
  type AssembleOptions,
  assemblePaper,
  type Blueprint,
  DEFAULT_DIFFICULTY_MIX,
} from '@/engine/assemble';
import { parsePaperCode } from '@/engine/paperCode';
import { loadBank } from '@/engine/registry';
import { randomSeed } from '@/engine/rng';
import type { Paper, SubjectId } from '@/engine/types';

/**
 * Version of the question bank. Paper codes are reproducible for a given bank
 * version; bump this whenever templates are added, removed or changed.
 */
export const BANK_VERSION = '2026.10.0';

export interface GenerationOptions {
  /** Share of parametric (randomised-value) questions, 0-1. */
  dynamicShare: number;
  /** Relative weight of easy / medium / hard questions. */
  difficultyMix: readonly [number, number, number];
  /** Preference multiplier for questions modelled on reported past papers. */
  pastPaperBoost: number;
}

/** Calibrated to the reported NET mix: mostly easy-to-moderate textbook items, some hard ones. */
export const DEFAULT_GENERATION: GenerationOptions = {
  // Scaled per subject (see SUBJECT_DYNAMIC_SHARE): maths ~60%, physics ~35%, chemistry ~25%.
  dynamicShare: NOMINAL_DYNAMIC_SHARE,
  difficultyMix: DEFAULT_DIFFICULTY_MIX,
  pastPaperBoost: 1.5,
};

export const DIFFICULTY_PRESETS: Record<
  'easier' | 'net' | 'harder',
  readonly [number, number, number]
> = {
  easier: [0.65, 0.3, 0.05],
  net: DEFAULT_DIFFICULTY_MIX,
  harder: [0.2, 0.5, 0.3],
};

export interface CustomSection {
  subject: SubjectId;
  count: number;
  /** Restrict to these chapters (all chapters when empty). */
  chapters?: readonly string[];
  title?: string;
}

export interface CustomPaperSpec {
  title?: string;
  durationMinutes: number;
  sections: readonly CustomSection[];
}

export interface PaperRequest {
  /** An exam type id, or `custom` together with `custom`. */
  examType: string;
  seed?: string;
  options?: Partial<GenerationOptions>;
  custom?: CustomPaperSpec;
}

export function customBlueprint(spec: CustomPaperSpec): Blueprint {
  return {
    examType: 'custom',
    codePrefix: 'CUS',
    title: spec.title?.trim() || 'Custom Practice Test',
    durationMinutes: spec.durationMinutes,
    sections: spec.sections
      .filter((s) => s.count > 0)
      .map((s) => {
        const chapters = SYLLABUS[s.subject].chapters.filter(
          (c) => !s.chapters?.length || s.chapters.includes(c.id),
        );
        return {
          subject: s.subject,
          title: s.title ?? SYLLABUS[s.subject].name,
          count: s.count,
          chapterWeights: Object.fromEntries(chapters.map((c) => [c.id, c.weight])),
          dynamicFactor: dynamicFactorFor(s.subject),
        };
      }),
  };
}

export function blueprintForRequest(request: PaperRequest): Blueprint {
  if (request.examType === 'custom') {
    if (!request.custom) throw new Error('A custom paper needs a specification');
    return customBlueprint(request.custom);
  }
  const exam = examTypeById(request.examType);
  if (!exam) throw new Error(`Unknown exam type "${request.examType}"`);
  return blueprintFor(exam);
}

/** Generates a paper (loads only the subjects it needs). Deterministic for a given seed. */
export async function generatePaper(request: PaperRequest): Promise<Paper> {
  const blueprint = blueprintForRequest(request);
  const subjects = subjectsOf(blueprint);
  const bank = await loadBank(subjects);
  const options: AssembleOptions = {
    seed: request.seed ?? randomSeed(),
    bankVersion: BANK_VERSION,
    ...DEFAULT_GENERATION,
    ...request.options,
  };
  return assemblePaper(bank, blueprint, options);
}

/** Resolves a typed paper code (e.g. `eng-k7q2-9xm4`) to an exam type and seed. */
export function resolvePaperCode(
  code: string,
): { examType: string; seed: string; code: string } | null {
  const parsed = parsePaperCode(code, PAPER_CODE_PREFIXES);
  if (!parsed || parsed.prefix === 'CUS') return null;
  const exam = examTypeByCode(parsed.prefix);
  return exam ? { examType: exam.id, seed: parsed.seed, code: parsed.code } : null;
}

/**
 * Encodes a custom-test specification for the `spec` URL parameter
 * (base64url of compact JSON). Used by #/new, #/paper, the result and analytics pages.
 */
export function encodeSpec(spec: CustomPaperSpec): string {
  const json = JSON.stringify(spec);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decodes and validates a `spec` URL parameter; returns null when invalid. */
export function decodeSpec(value: string | null | undefined): CustomPaperSpec | null {
  if (!value) return null;
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const raw = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CustomPaperSpec>;
    if (!raw || !Array.isArray(raw.sections) || typeof raw.durationMinutes !== 'number')
      return null;
    const sections = raw.sections
      .filter(
        (s): s is CustomSection =>
          Boolean(s) &&
          typeof s.subject === 'string' &&
          s.subject in SYLLABUS &&
          Number.isInteger(s.count),
      )
      .map((s) => ({
        subject: s.subject,
        count: Math.max(1, Math.min(200, s.count)),
        ...(Array.isArray(s.chapters)
          ? { chapters: s.chapters.filter((c) => typeof c === 'string') }
          : {}),
        ...(typeof s.title === 'string' ? { title: s.title } : {}),
      }));
    if (!sections.length) return null;
    return {
      ...(typeof raw.title === 'string' ? { title: raw.title } : {}),
      durationMinutes: Math.max(1, Math.min(300, Math.round(raw.durationMinutes))),
      sections,
    };
  } catch {
    return null;
  }
}

/** Serialises generation options into URL query parameters (only non-defaults). */
export function optionsToQuery(
  options: Partial<GenerationOptions>,
  query = new URLSearchParams(),
): URLSearchParams {
  if (
    options.dynamicShare !== undefined &&
    options.dynamicShare !== DEFAULT_GENERATION.dynamicShare
  ) {
    query.set('dyn', String(Math.round(options.dynamicShare * 100)));
  }
  if (
    options.difficultyMix &&
    options.difficultyMix.join() !== DEFAULT_GENERATION.difficultyMix.join()
  ) {
    query.set('mix', options.difficultyMix.map((v) => Math.round(v * 100)).join('-'));
  }
  if (
    options.pastPaperBoost !== undefined &&
    options.pastPaperBoost !== DEFAULT_GENERATION.pastPaperBoost
  ) {
    query.set('pp', String(options.pastPaperBoost));
  }
  return query;
}

/** Reads generation options written by `optionsToQuery`. */
export function optionsFromQuery(query: URLSearchParams): Partial<GenerationOptions> {
  const out: Partial<GenerationOptions> = {};
  const dyn = Number(query.get('dyn'));
  if (query.has('dyn') && dyn >= 0 && dyn <= 100) out.dynamicShare = dyn / 100;
  const mix = (query.get('mix') ?? '').split('-').map(Number);
  if (mix.length === 3 && mix.every((v) => v >= 0) && mix.some((v) => v > 0)) {
    const total = mix[0]! + mix[1]! + mix[2]!;
    out.difficultyMix = [mix[0]! / total, mix[1]! / total, mix[2]! / total];
  }
  const pp = Number(query.get('pp'));
  if (query.has('pp') && pp > 0 && pp <= 10) out.pastPaperBoost = pp;
  return out;
}
