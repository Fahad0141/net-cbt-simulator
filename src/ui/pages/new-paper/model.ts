import {
  DEFAULT_EXAM_TYPE,
  EXAM_TYPES,
  examTypeByCode,
  examTypeById,
  PAPER_CODE_PREFIXES,
} from '@/config/exams';
import { SYLLABUS } from '@/config/syllabus';
import { formatPaperCode } from '@/engine/assemble';
import { isValidSeed, normalizeSeed } from '@/engine/rng';
import { type Difficulty, type Paper, SUBJECT_IDS, type SubjectId } from '@/engine/types';
import {
  type CustomPaperSpec,
  decodeSpec,
  DEFAULT_GENERATION,
  DIFFICULTY_PRESETS,
  encodeSpec,
  type GenerationOptions,
  optionsFromQuery,
  optionsToQuery,
  type PaperRequest,
} from '@/exam/papers';
import { type ExamMode, type ExamSession, remainingMs } from '@/exam/session';

/**
 * State, validation and URL logic of the "New paper" page. Everything here is pure
 * (no DOM, no storage) so it can be unit-tested without rendering.
 */

/** Value of the test-type choice for a test the candidate builds. */
export const CUSTOM = 'custom';
const CUSTOM_PREFIX = 'CUS';

export const LIMITS = {
  sectionMin: 5,
  sectionMax: 200,
  /** A custom test is at most as long as a full NET. */
  totalMax: 200,
  durationMin: 5,
  durationMax: 240,
  titleMax: 80,
  nameMax: 60,
} as const;

/** localStorage key of the last candidate name (plain string). */
export const CANDIDATE_NAME_KEY = 'net-cbt:candidate-name';

export const DEFAULT_DYNAMIC_PERCENT = Math.round(DEFAULT_GENERATION.dynamicShare * 100);

export type Mix = readonly [number, number, number];
export type DifficultyPreset = keyof typeof DIFFICULTY_PRESETS;
/** `link`: a difficulty mix that came from a link and matches no preset. */
export type DifficultyChoice = DifficultyPreset | 'link';

export const DIFFICULTY_CHOICES: ReadonlyArray<{ value: DifficultyPreset; label: string }> = [
  { value: 'easier', label: 'Easier' },
  { value: 'net', label: 'NET-like' },
  { value: 'harder', label: 'Harder' },
];

export const CURRENT_TYPES = EXAM_TYPES.filter((e) => e.era === 'current');
export const LEGACY_TYPES = EXAM_TYPES.filter((e) => e.era === 'legacy');

/**
 * Difficulty as an ordinal ramp of the ink colour (easy lightest, hard darkest), so it does
 * not borrow the green / red that mean right and wrong elsewhere.
 */
export const DIFFICULTY_META: ReadonlyArray<{ level: Difficulty; label: string; color: string }> = [
  { level: 1, label: 'Easy', color: 'color-mix(in oklab, var(--primary) 43%, var(--surface))' },
  { level: 2, label: 'Medium', color: 'color-mix(in oklab, var(--primary) 72%, var(--surface))' },
  { level: 3, label: 'Hard', color: 'var(--primary)' },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Whole-number percentage of `part` in `whole` (0 when `whole` is 0). */
export const percentOf = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

export const sumCounts = (sections: ReadonlyArray<{ count: number }>): number =>
  sections.reduce((total, s) => total + s.count, 0);

/** `45 min`, `3 h`, `1 h 30 min`. */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** `English (Verbal)` -> `English`, for compact labels. */
export const shortSectionTitle = (title: string): string =>
  title.replace(/\s*\([^)]*\)\s*$/, '') || title;

export function isSubjectId(value: string): value is SubjectId {
  return (SUBJECT_IDS as readonly string[]).includes(value);
}

export function subjectName(subject: string): string {
  return isSubjectId(subject) ? SYLLABUS[subject].name : subject;
}

export function examTypeLabel(examType: string): string {
  return examType === CUSTOM ? 'Custom test' : (examTypeById(examType)?.name ?? examType);
}

export const isLegacyType = (examType: string): boolean => examTypeById(examType)?.era === 'legacy';

/** Paper-code prefix of a test type (`ENG`, ..., `CUS`). */
export const codePrefixFor = (examType: string): string =>
  examTypeById(examType)?.code ?? CUSTOM_PREFIX;

export const paperCodeFor = (examType: string, seed: string): string =>
  formatPaperCode(codePrefixFor(examType), seed);

const normalizeMix = (mix: Mix): [number, number, number] => {
  const total = mix[0] + mix[1] + mix[2];
  return total > 0 ? [mix[0] / total, mix[1] / total, mix[2] / total] : [1 / 3, 1 / 3, 1 / 3];
};

/** `30% easy · 50% medium · 20% hard`. */
export function describeMix(mix: Mix): string {
  const [easy, medium, hard] = normalizeMix(mix).map((v) => Math.round(v * 100));
  return `${easy}% easy · ${medium}% medium · ${hard}% hard`;
}

/** The preset a mix corresponds to, or null for a bespoke mix. */
export function matchPreset(mix: Mix): DifficultyPreset | null {
  const target = normalizeMix(mix);
  for (const { value } of DIFFICULTY_CHOICES) {
    const preset = normalizeMix(DIFFICULTY_PRESETS[value]);
    if (preset.every((v, i) => Math.abs(v - (target[i] ?? 0)) < 0.006)) return value;
  }
  return null;
}

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

// ---------------------------------------------------------------------------
// Paper code / seed input
// ---------------------------------------------------------------------------

export type SeedInput =
  | { kind: 'random' }
  /** `examType` is set when a full paper code (with a known prefix) was entered. */
  | { kind: 'seed'; seed: string; examType?: string }
  | { kind: 'invalid' };

/** A test prefix followed by a separator: `ENG-K7Q2-9XM4`, `eng k7q2 9xm4`. */
const CODE_PATTERN = /^([A-Za-z]{2,5})[\s_-]+(.+)$/;

export const SEED_ERROR =
  'Paper codes look like ENG-K7Q2-9XM4: a test prefix, then 4 to 16 letters or digits. Leave the box empty for a new random paper.';

/**
 * Reads the "Paper code" box: empty (random paper), a full paper code such as
 * `ENG-K7Q2-9XM4` (which also names the test type) or a bare seed such as `K7Q29XM4`.
 * A code needs a separator after its prefix so that bare seeds are never misread.
 */
export function parseSeedInput(input: string): SeedInput {
  const text = input.trim();
  if (!text) return { kind: 'random' };
  const match = CODE_PATTERN.exec(text);
  const prefix = match?.[1]?.toUpperCase();
  if (match && prefix && PAPER_CODE_PREFIXES.includes(prefix)) {
    const seed = normalizeSeed(match[2] ?? '');
    if (!isValidSeed(seed)) return { kind: 'invalid' };
    const examType = prefix === CUSTOM_PREFIX ? CUSTOM : examTypeByCode(prefix)?.id;
    return examType ? { kind: 'seed', seed, examType } : { kind: 'seed', seed };
  }
  const seed = normalizeSeed(text);
  return isValidSeed(seed) ? { kind: 'seed', seed } : { kind: 'invalid' };
}

// ---------------------------------------------------------------------------
// Custom test drafts
// ---------------------------------------------------------------------------

export interface SectionDraft {
  /** Stable React key. */
  key: string;
  subject: SubjectId;
  /** Raw text of the question-count box. */
  count: string;
  /** Selected chapter ids, in syllabus order (all chapters by default). */
  chapters: readonly string[];
  /** Section title carried over from a shared specification. */
  title?: string;
}

export interface CustomDraft {
  title: string;
  sections: readonly SectionDraft[];
  /** Raw text of the duration box (used when `durationAuto` is off). */
  duration: string;
  /** Follow the suggested duration of one minute per question. */
  durationAuto: boolean;
}

let sectionSequence = 0;
const nextSectionKey = (): string => `section-${++sectionSequence}`;

export const chapterIds = (subject: SubjectId): string[] =>
  SYLLABUS[subject].chapters.map((c) => c.id);

export function newSection(subject: SubjectId, count: number): SectionDraft {
  return { key: nextSectionKey(), subject, count: String(count), chapters: chapterIds(subject) };
}

/** Parses a non-negative whole number typed by the user; null when it is not one. */
export function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim();
  return /^\d{1,6}$/.test(trimmed) ? Number(trimmed) : null;
}

/** Questions in a draft (sections with an unreadable count add nothing). */
export function draftTotal(draft: Pick<CustomDraft, 'sections'>): number {
  return draft.sections.reduce((total, s) => total + (parseWholeNumber(s.count) ?? 0), 0);
}

/** One minute per question, rounded up and kept within the allowed range. */
export const suggestedDuration = (questions: number): number =>
  clamp(Math.ceil(questions), LIMITS.durationMin, LIMITS.durationMax);

/** The duration a draft will use, or null when the typed duration is not a number. */
export function draftDuration(draft: CustomDraft): number | null {
  return draft.durationAuto
    ? suggestedDuration(draftTotal(draft))
    : parseWholeNumber(draft.duration);
}

/** A starter custom test: the subjects of a standard pattern at a fifth of the length. */
export function draftFromExamType(examType: string): CustomDraft {
  const exam = examTypeById(examType) ?? examTypeById(DEFAULT_EXAM_TYPE);
  const seen = new Set<SubjectId>();
  const sections: SectionDraft[] = [];
  for (const section of exam?.sections ?? []) {
    if (seen.has(section.subject)) continue;
    seen.add(section.subject);
    sections.push(
      newSection(
        section.subject,
        clamp(Math.round(section.count / 5), LIMITS.sectionMin, LIMITS.sectionMax),
      ),
    );
  }
  if (!sections.length) sections.push(newSection('mathematics', 20));
  return { title: '', sections, duration: '', durationAuto: true };
}

/** A draft that reproduces a shared specification (values are kept within the builder's limits). */
export function draftFromSpec(spec: CustomPaperSpec): CustomDraft {
  const sections: SectionDraft[] = spec.sections.map((s) => {
    const all = chapterIds(s.subject);
    const picked = all.filter((id) => s.chapters?.includes(id));
    return {
      key: nextSectionKey(),
      subject: s.subject,
      count: String(clamp(s.count, LIMITS.sectionMin, LIMITS.sectionMax)),
      chapters: picked.length ? picked : all,
      ...(s.title ? { title: s.title } : {}),
    };
  });
  const duration = clamp(Math.round(spec.durationMinutes), LIMITS.durationMin, LIMITS.durationMax);
  const draft: CustomDraft = {
    title: (spec.title ?? '').slice(0, LIMITS.titleMax),
    sections,
    duration: String(duration),
    durationAuto: false,
  };
  return duration === suggestedDuration(draftTotal(draft))
    ? { ...draft, duration: '', durationAuto: true }
    : draft;
}

export interface SectionErrors {
  count?: string;
  chapters?: string;
}

export interface CustomErrors {
  /** Errors per section key. */
  sections: Readonly<Record<string, SectionErrors>>;
  empty?: string;
  total?: string;
  duration?: string;
}

export function countCustomErrors(errors: CustomErrors): number {
  let count =
    Number(Boolean(errors.empty)) +
    Number(Boolean(errors.total)) +
    Number(Boolean(errors.duration));
  for (const e of Object.values(errors.sections))
    count += Number(Boolean(e.count)) + Number(Boolean(e.chapters));
  return count;
}

/** Validates a draft; returns the specification when it is complete. */
export function validateCustom(draft: CustomDraft): {
  spec: CustomPaperSpec | null;
  errors: CustomErrors;
} {
  const sections: Record<string, SectionErrors> = {};
  for (const s of draft.sections) {
    const count = parseWholeNumber(s.count);
    const e: SectionErrors = {};
    if (count === null || count < LIMITS.sectionMin || count > LIMITS.sectionMax) {
      e.count = `Enter a whole number from ${LIMITS.sectionMin} to ${LIMITS.sectionMax}.`;
    }
    if (!s.chapters.length) e.chapters = 'Select at least one chapter.';
    if (e.count || e.chapters) sections[s.key] = e;
  }
  const errors: CustomErrors = { sections };
  if (!draft.sections.length) errors.empty = 'Add at least one section.';
  const total = draftTotal(draft);
  if (total > LIMITS.totalMax) {
    errors.total = `A custom test can have at most ${LIMITS.totalMax} questions (the length of a full NET); this one has ${total}.`;
  }
  const duration = draftDuration(draft);
  if (duration === null || duration < LIMITS.durationMin || duration > LIMITS.durationMax) {
    errors.duration = `Enter a duration from ${LIMITS.durationMin} to ${LIMITS.durationMax} minutes.`;
  }
  if (countCustomErrors(errors) > 0 || duration === null) return { spec: null, errors };

  const title = draft.title.trim();
  const spec: CustomPaperSpec = {
    ...(title ? { title } : {}),
    durationMinutes: duration,
    sections: draft.sections.map((s) => ({
      subject: s.subject,
      count: parseWholeNumber(s.count) ?? 0,
      ...(s.chapters.length < chapterIds(s.subject).length ? { chapters: [...s.chapters] } : {}),
      ...(s.title ? { title: s.title } : {}),
    })),
  };
  return { spec, errors };
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

export interface FormState {
  /** An exam type id, or `custom`. */
  examType: string;
  custom: CustomDraft;
  /** The custom draft is untouched, so it follows the last standard test picked. */
  customPristine: boolean;
  mode: ExamMode;
  instantFeedback: boolean;
  candidateName: string;
  difficulty: DifficultyChoice;
  /** Difficulty mix from a link that matches no preset. */
  linkMix: Mix | null;
  /** Target share of questions with randomised values, 0-100. */
  dynamicPercent: number;
  /** Past-paper preference carried over from a link (not editable on the page). */
  pastPaperBoost: number | null;
  /** Text of the "Paper code" box. */
  seedInput: string;
}

export type CustomAction =
  | { kind: 'customTitle'; value: string }
  | { kind: 'addSection' }
  | { kind: 'removeSection'; key: string }
  | { kind: 'sectionSubject'; key: string; subject: SubjectId }
  | { kind: 'sectionCount'; key: string; value: string }
  | { kind: 'toggleChapter'; key: string; chapter: string; checked: boolean }
  | { kind: 'sectionChapters'; key: string; chapters: readonly string[] }
  | { kind: 'duration'; value: string }
  | { kind: 'durationAuto' };

export type FormAction =
  | { kind: 'examType'; value: string }
  | { kind: 'mode'; value: ExamMode }
  | { kind: 'instantFeedback'; value: boolean }
  | { kind: 'candidateName'; value: string }
  | { kind: 'difficulty'; value: DifficultyChoice }
  | { kind: 'dynamicPercent'; value: number }
  | { kind: 'seedInput'; value: string }
  | { kind: 'resetOptions' }
  | CustomAction;

export const isKnownExamType = (value: string): boolean =>
  value === CUSTOM || Boolean(examTypeById(value));

function mapSection(
  draft: CustomDraft,
  key: string,
  update: (s: SectionDraft) => SectionDraft,
): CustomDraft {
  return { ...draft, sections: draft.sections.map((s) => (s.key === key ? update(s) : s)) };
}

export function customReducer(draft: CustomDraft, action: CustomAction): CustomDraft {
  switch (action.kind) {
    case 'customTitle':
      return { ...draft, title: action.value.slice(0, LIMITS.titleMax) };
    case 'addSection': {
      const used = new Set(draft.sections.map((s) => s.subject));
      const subject = SUBJECT_IDS.find((id) => !used.has(id));
      if (!subject) return draft;
      const room = LIMITS.totalMax - draftTotal(draft);
      const count = clamp(Math.min(20, room), LIMITS.sectionMin, LIMITS.sectionMax);
      return { ...draft, sections: [...draft.sections, newSection(subject, count)] };
    }
    case 'removeSection':
      return { ...draft, sections: draft.sections.filter((s) => s.key !== action.key) };
    case 'sectionSubject':
      return mapSection(draft, action.key, (s) =>
        s.subject === action.subject
          ? s
          : {
              key: s.key,
              subject: action.subject,
              count: s.count,
              chapters: chapterIds(action.subject),
            },
      );
    case 'sectionCount':
      return mapSection(draft, action.key, (s) => ({ ...s, count: action.value }));
    case 'toggleChapter':
      return mapSection(draft, action.key, (s) => {
        const selected = new Set(s.chapters);
        if (action.checked) selected.add(action.chapter);
        else selected.delete(action.chapter);
        return { ...s, chapters: chapterIds(s.subject).filter((id) => selected.has(id)) };
      });
    case 'sectionChapters':
      return mapSection(draft, action.key, (s) => ({
        ...s,
        chapters: chapterIds(s.subject).filter((id) => action.chapters.includes(id)),
      }));
    case 'duration':
      return { ...draft, duration: action.value, durationAuto: false };
    case 'durationAuto':
      return { ...draft, duration: '', durationAuto: true };
  }
}

/** Switches the test type, keeping a typed paper code and an untouched custom draft in step. */
function withExamType(state: FormState, examType: string, seedInput: string): FormState {
  const next: FormState = { ...state, examType, seedInput };
  if (examType !== CUSTOM && state.customPristine) next.custom = draftFromExamType(examType);
  return next;
}

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.kind) {
    case 'examType': {
      if (!isKnownExamType(action.value) || action.value === state.examType) return state;
      // A full paper code in the box follows the selected type (same seed, new prefix).
      const typed = parseSeedInput(state.seedInput);
      const seedInput =
        typed.kind === 'seed' && typed.examType
          ? paperCodeFor(action.value, typed.seed)
          : state.seedInput;
      return withExamType(state, action.value, seedInput);
    }
    case 'mode':
      return { ...state, mode: action.value };
    case 'instantFeedback':
      return { ...state, instantFeedback: action.value };
    case 'candidateName':
      return { ...state, candidateName: action.value.slice(0, LIMITS.nameMax) };
    case 'difficulty':
      return action.value === 'link' && !state.linkMix
        ? state
        : { ...state, difficulty: action.value };
    case 'dynamicPercent':
      return Number.isFinite(action.value)
        ? { ...state, dynamicPercent: clamp(Math.round(action.value), 0, 100) }
        : state;
    case 'seedInput': {
      // Typing a full paper code selects the test type it belongs to.
      const typed = parseSeedInput(action.value);
      if (typed.kind === 'seed' && typed.examType && typed.examType !== state.examType) {
        return withExamType(state, typed.examType, action.value);
      }
      return { ...state, seedInput: action.value };
    }
    case 'resetOptions':
      return {
        ...state,
        difficulty: 'net',
        linkMix: null,
        dynamicPercent: DEFAULT_DYNAMIC_PERCENT,
        pastPaperBoost: null,
        seedInput: '',
      };
    default:
      return { ...state, custom: customReducer(state.custom, action), customPristine: false };
  }
}

// ---------------------------------------------------------------------------
// Initial state from the URL
// ---------------------------------------------------------------------------

export interface InitialForm {
  state: FormState;
  /** The link names a complete paper (seed and, for custom tests, its sections): build it at once. */
  autoGenerate: boolean;
  /** The link carries paper options, so show them. */
  optionsOpen: boolean;
  /** Problems with the link, shown to the user. */
  notices: string[];
}

/** Resolves `?type=` (an id such as `engineering`, a code such as `ENG`, or `custom`). */
export function resolveExamTypeParam(param: string): string | null {
  const value = param.trim();
  if (!value) return null;
  if (value.toLowerCase() === CUSTOM || value.toUpperCase() === CUSTOM_PREFIX) return CUSTOM;
  return (
    examTypeById(value)?.id ??
    examTypeById(value.toLowerCase())?.id ??
    examTypeByCode(value)?.id ??
    null
  );
}

export function initialForm(query: URLSearchParams, candidateName = ''): InitialForm {
  const notices: string[] = [];
  const typeParam = (query.get('type') ?? '').trim();
  let examType = resolveExamTypeParam(typeParam);
  if (typeParam && !examType) {
    notices.push(
      `The link asks for an unknown test type (“${truncate(typeParam, 40)}”), so ${examTypeLabel(DEFAULT_EXAM_TYPE)} is selected instead.`,
    );
  }

  const seedParam = (query.get('seed') ?? '').trim();
  const seed: SeedInput = seedParam ? parseSeedInput(seedParam) : { kind: 'random' };
  if (!examType && seed.kind === 'seed' && seed.examType) examType = seed.examType;
  const type = examType ?? DEFAULT_EXAM_TYPE;

  const specParam = query.get('spec');
  const spec = type === CUSTOM ? decodeSpec(specParam) : null;
  if (type === CUSTOM && specParam && !spec) {
    notices.push(
      'The custom test in this link could not be read, so a starter custom test is shown instead.',
    );
  }

  const options = optionsFromQuery(query);
  const preset = options.difficultyMix ? matchPreset(options.difficultyMix) : 'net';
  const mode = query.get('mode') === 'practice' ? 'practice' : 'exam';

  const state: FormState = {
    examType: type,
    custom: spec
      ? draftFromSpec(spec)
      : draftFromExamType(type === CUSTOM ? DEFAULT_EXAM_TYPE : type),
    customPristine: !spec,
    mode,
    instantFeedback: false,
    candidateName: candidateName.slice(0, LIMITS.nameMax),
    difficulty: preset ?? 'link',
    linkMix: preset ? null : (options.difficultyMix ?? null),
    dynamicPercent:
      options.dynamicShare !== undefined
        ? clamp(Math.round(options.dynamicShare * 100), 0, 100)
        : DEFAULT_DYNAMIC_PERCENT,
    pastPaperBoost: options.pastPaperBoost ?? null,
    seedInput:
      seed.kind === 'seed'
        ? paperCodeFor(type, seed.seed)
        : seed.kind === 'invalid'
          ? truncate(seedParam, 40)
          : '',
  };

  return {
    state,
    autoGenerate: seed.kind === 'seed' && (type !== CUSTOM || spec !== null),
    optionsOpen: Boolean(seedParam) || query.has('dyn') || query.has('mix') || query.has('pp'),
    notices,
  };
}

// ---------------------------------------------------------------------------
// Turning the form into a paper request
// ---------------------------------------------------------------------------

export function generationOptions(
  state: Pick<FormState, 'difficulty' | 'linkMix' | 'dynamicPercent' | 'pastPaperBoost'>,
): GenerationOptions {
  return {
    dynamicShare: clamp(state.dynamicPercent, 0, 100) / 100,
    difficultyMix:
      state.difficulty === 'link'
        ? (state.linkMix ?? DIFFICULTY_PRESETS.net)
        : DIFFICULTY_PRESETS[state.difficulty],
    pastPaperBoost: state.pastPaperBoost ?? DEFAULT_GENERATION.pastPaperBoost,
  };
}

/** Questions the form will ask for (custom sections with unreadable counts add nothing). */
export function questionCountOf(state: Pick<FormState, 'examType' | 'custom'>): number {
  return state.examType === CUSTOM
    ? draftTotal(state.custom)
    : sumCounts(examTypeById(state.examType)?.sections ?? []);
}

/** Duration the form will ask for, or null when the custom duration is unreadable. */
export function durationOf(state: Pick<FormState, 'examType' | 'custom'>): number | null {
  return state.examType === CUSTOM
    ? draftDuration(state.custom)
    : (examTypeById(state.examType)?.durationMinutes ?? null);
}

/**
 * Identity of the paper the form describes. A generated paper is out of date once
 * this changes (mode and candidate name do not affect the paper itself).
 */
export function paperKey(state: FormState): string {
  const seed = parseSeedInput(state.seedInput);
  const draft = state.custom;
  return JSON.stringify([
    state.examType,
    state.examType === CUSTOM
      ? [
          draft.title.trim(),
          draft.sections.map((s) => [s.subject, s.count.trim(), s.chapters, s.title ?? '']),
          draftDuration(draft),
        ]
      : null,
    generationOptions(state),
    seed.kind === 'seed' ? seed.seed : seed.kind,
  ]);
}

export interface FormErrors {
  seed?: string;
  custom?: CustomErrors;
  /** Number of problems. */
  count: number;
}

export interface PreparedPaper {
  request: PaperRequest;
  options: GenerationOptions;
  spec: CustomPaperSpec | null;
  key: string;
  questionCount: number;
}

export function prepareRequest(state: FormState): {
  prepared: PreparedPaper | null;
  errors: FormErrors;
} {
  const errors: FormErrors = { count: 0 };
  const seed = parseSeedInput(state.seedInput);
  if (seed.kind === 'invalid') {
    errors.seed = SEED_ERROR;
    errors.count++;
  }
  let spec: CustomPaperSpec | null = null;
  if (state.examType === CUSTOM) {
    const result = validateCustom(state.custom);
    errors.custom = result.errors;
    errors.count += countCustomErrors(result.errors);
    spec = result.spec;
  }
  if (errors.count > 0 || (state.examType === CUSTOM && !spec)) return { prepared: null, errors };

  const options = generationOptions(state);
  const request: PaperRequest = {
    examType: state.examType,
    options,
    ...(seed.kind === 'seed' ? { seed: seed.seed } : {}),
    ...(spec ? { custom: spec } : {}),
  };
  return {
    prepared: {
      request,
      options,
      spec,
      key: paperKey(state),
      questionCount: questionCountOf(state),
    },
    errors,
  };
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** Query of `#/new` that rebuilds `paper` exactly: type, seed, non-default options and custom sections. */
export function shareQuery(
  paper: Pick<Paper, 'examType' | 'seed'>,
  options: Partial<GenerationOptions>,
  spec: CustomPaperSpec | null,
): URLSearchParams {
  const query = new URLSearchParams();
  query.set('type', paper.examType);
  query.set('seed', paper.seed);
  optionsToQuery(options, query);
  if (spec) query.set('spec', encodeSpec(spec));
  return query;
}

/** App path (for `href`/`navigate`) of the new-paper page set up for `paper`. */
export function newPaperPath(
  paper: Pick<Paper, 'examType' | 'seed'>,
  options: Partial<GenerationOptions>,
  spec: CustomPaperSpec | null,
): string {
  return `/new?${shareQuery(paper, options, spec).toString()}`;
}

/** App path of the printable paper: `/paper/<code>?<options>&type=<id>[&spec=..]`. */
export function printablePath(
  paper: Pick<Paper, 'code' | 'examType'>,
  options: Partial<GenerationOptions>,
  spec: CustomPaperSpec | null,
): string {
  const query = optionsToQuery(options);
  query.set('type', paper.examType);
  if (spec) query.set('spec', encodeSpec(spec));
  return `/paper/${encodeURIComponent(paper.code)}?${query.toString()}`;
}

// ---------------------------------------------------------------------------
// What a generated paper contains
// ---------------------------------------------------------------------------

export interface SectionStat {
  subject: SubjectId;
  title: string;
  count: number;
  /** 1-based question numbers. */
  first: number;
  last: number;
}

export interface PaperStats {
  total: number;
  sections: SectionStat[];
  difficulty: Record<Difficulty, number>;
  /** Parametric questions (fresh values every paper), passage sets included. */
  randomised: number;
  fixed: number;
  /** Questions modelled on reported past-paper items (overlaps the two above). */
  pastPaper: number;
  /** Distinct syllabus chapters with at least one question (within the paper's scope). */
  chaptersCovered: number;
  /** Chapters the paper could draw from (all chapters, or those picked for a custom test). */
  chaptersInScope: number;
  /** Custom tests: questions taken from chapters outside the selection (the bank had too few). */
  outOfScope: number;
}

function chapterScope(paper: Paper, spec: CustomPaperSpec | null): Map<SubjectId, Set<string>> {
  const scope = new Map<SubjectId, Set<string>>();
  for (const section of paper.sections) {
    if (!isSubjectId(section.subject)) continue;
    const all = chapterIds(section.subject);
    const restricted = spec?.sections.filter((s) => s.subject === section.subject) ?? [];
    const allowed =
      restricted.length && restricted.every((s) => s.chapters?.length)
        ? all.filter((id) => restricted.some((s) => s.chapters?.includes(id)))
        : all;
    const set = scope.get(section.subject) ?? new Set<string>();
    allowed.forEach((id) => set.add(id));
    scope.set(section.subject, set);
  }
  return scope;
}

export function paperStats(paper: Paper, spec: CustomPaperSpec | null = null): PaperStats {
  const difficulty: Record<Difficulty, number> = { 1: 0, 2: 0, 3: 0 };
  const scope = chapterScope(paper, spec);
  const covered = new Set<string>();
  let randomised = 0;
  let pastPaper = 0;
  let outOfScope = 0;
  for (const q of paper.questions) {
    if (q.difficulty === 1 || q.difficulty === 2 || q.difficulty === 3) difficulty[q.difficulty]++;
    if (q.templateKind !== 'static') randomised++;
    if (q.origin === 'past-paper') pastPaper++;
    const allowed = scope.get(q.subject);
    if (allowed?.has(q.chapter)) covered.add(`${q.subject}/${q.chapter}`);
    else if (spec && allowed) outOfScope++;
  }
  let chaptersInScope = 0;
  scope.forEach((set) => (chaptersInScope += set.size));
  return {
    total: paper.questions.length,
    sections: paper.sections
      .filter((s) => s.count > 0)
      .map((s) => ({
        subject: s.subject,
        title: s.title,
        count: s.count,
        first: s.start + 1,
        last: s.start + s.count,
      })),
    difficulty,
    randomised,
    fixed: paper.questions.length - randomised,
    pastPaper,
    chaptersCovered: covered.size,
    chaptersInScope,
    outOfScope,
  };
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export function difficultyLabel(state: Pick<FormState, 'difficulty' | 'linkMix'>): string {
  if (state.difficulty === 'link')
    return state.linkMix ? `From link (${describeMix(state.linkMix)})` : 'NET-like';
  return DIFFICULTY_CHOICES.find((c) => c.value === state.difficulty)?.label ?? 'NET-like';
}

export function modeLabel(state: Pick<FormState, 'mode' | 'instantFeedback'>): string {
  if (state.mode === 'exam') return 'Exam mode';
  return state.instantFeedback ? 'Practice mode with instant feedback' : 'Practice mode';
}

/** True when the paper options are all at their defaults. */
export function optionsAreDefault(state: FormState): boolean {
  return (
    state.difficulty === 'net' &&
    state.linkMix === null &&
    state.dynamicPercent === DEFAULT_DYNAMIC_PERCENT &&
    state.pastPaperBoost === null &&
    !state.seedInput.trim()
  );
}

// ---------------------------------------------------------------------------
// Generation state of the page
// ---------------------------------------------------------------------------

export type Generation =
  | { status: 'idle' }
  | { status: 'loading'; questionCount: number }
  | {
      status: 'ready';
      paper: Paper;
      /** `paperKey` of the settings the paper was built from. */
      key: string;
      options: GenerationOptions;
      spec: CustomPaperSpec | null;
      /** Move focus to the summary (the candidate asked for this paper). */
      focus: boolean;
    }
  | {
      status: 'error';
      info: GenerationErrorInfo;
      key: string;
      /** Move focus to the message (the candidate asked for this paper). */
      focus: boolean;
    };

// ---------------------------------------------------------------------------
// Errors and the active session
// ---------------------------------------------------------------------------

export interface GenerationErrorInfo {
  title: string;
  message: string;
  suggestion: string;
  /** The bank is short of questions: another test type may still work. */
  bankShortage: boolean;
}

/** Turns an error thrown by `generatePaper` into a message a candidate can act on. */
export function describeGenerationError(error: unknown, examType: string): GenerationErrorInfo {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const custom = examType === CUSTOM;

  const small = /Bank too small for ([\w-]+): needed (\d+), produced (\d+)/.exec(raw);
  if (small) {
    const subject = subjectName(small[1] ?? '');
    return {
      title: `Not enough ${subject} questions yet`,
      message: `The question bank cannot fill this paper yet: it needs ${small[2]} ${subject} questions but could only build ${small[3]}.`,
      suggestion: custom
        ? `Ask for fewer ${subject} questions, select more chapters, or choose another subject.`
        : `Try another test type, or build a custom test with fewer ${subject} questions.`,
      bankShortage: true,
    };
  }

  const none = /No templates available for subject "([\w-]+)"/.exec(raw);
  if (none) {
    const subject = subjectName(none[1] ?? '');
    return {
      title: `No ${subject} questions yet`,
      message: `The question bank has no ${subject} questions yet, so this paper cannot be built.`,
      suggestion: custom
        ? `Remove the ${subject} section or choose another subject.`
        : `Try another test type, or build a custom test without ${subject}.`,
      bankShortage: true,
    };
  }

  if (
    /dynamically imported module|failed to fetch|loading chunk|importing a module script failed|networkerror/i.test(
      raw,
    )
  ) {
    return {
      title: 'Could not load the question bank',
      message: 'Part of the question bank failed to download.',
      suggestion:
        'Check your connection and try again. If you are offline, reload the page once you are back online.',
      bankShortage: false,
    };
  }

  return {
    title: 'Could not generate the paper',
    message: raw
      ? `Something went wrong: ${truncate(raw, 240)}`
      : 'Something went wrong while building the paper.',
    suggestion: 'Try again, choose another test type, or change the paper options.',
    bankShortage: false,
  };
}

export interface ActiveSessionInfo {
  title: string;
  code: string;
  mode: ExamMode;
  status: 'not-started' | 'running' | 'paused' | 'time-up';
  answered: number;
  total: number;
  /** Whole minutes left, rounded up like the terminal clock. */
  minutesLeft: number;
}

/**
 * Describes a stored session that the candidate could still resume, or returns
 * null when there is none (finished, missing or too damaged to resume).
 */
export function describeActiveSession(
  session: ExamSession | null | undefined,
  now: number,
): ActiveSessionInfo | null {
  if (!session || typeof session !== 'object') return null;
  if (!['login', 'instructions', 'running'].includes(session.phase)) return null;
  if (!session.paper || typeof session.paper.code !== 'string' || !Array.isArray(session.questions))
    return null;
  const remaining =
    session.phase === 'running' &&
    Number.isFinite(session.durationMs) &&
    Number.isFinite(session.elapsedMs)
      ? remainingMs(session, now)
      : Math.max(0, (session.durationMs || 0) - (session.elapsedMs || 0));
  const status: ActiveSessionInfo['status'] =
    session.phase !== 'running'
      ? 'not-started'
      : remaining <= 0
        ? 'time-up'
        : session.runningSince === null
          ? 'paused'
          : 'running';
  return {
    title: examTypeById(session.paper.examType)?.name ?? session.paper.title ?? 'Test',
    code: session.paper.code,
    mode: session.settings?.mode === 'practice' ? 'practice' : 'exam',
    status,
    answered: session.questions.filter((q) => q && q.saved !== null && q.saved !== undefined)
      .length,
    total: session.questions.length,
    minutesLeft: Math.ceil(remaining / 60_000),
  };
}
