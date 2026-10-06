/**
 * Loads the question bank one subject at a time and keeps the result for the rest
 * of the visit. Reads are synchronous (`useSyncExternalStore`), so when the page
 * re-mounts after a URL update it renders the loaded data immediately, without a
 * loading flash or a scroll jump.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { type ChapterInfo, SYLLABUS } from '@/config/syllabus';
import { chapterOfPath, loadBankModulesSettled, type SettledModule } from '@/engine/registry';
import type { QuestionTemplate, SubjectId } from '@/engine/types';
import { type Mix, mixOf } from './model';

export interface LoadFailure {
  /** Registry path, e.g. `../bank/physics/optics.ts`. */
  path: string;
  /** `physics/optics.ts` */
  file: string;
  chapter: string;
  error: string;
}

export interface ChapterSummary {
  id: string;
  name: string;
  part: ChapterInfo['part'];
  /** Relative syllabus weight (share of a subject's questions in generated papers). */
  weight: number;
  /** `weight` as a percentage of the subject's total weight. */
  share: number;
  topics: readonly string[];
  mix: Mix;
  /** False for chapter ids found in the bank but missing from the syllabus. */
  inSyllabus: boolean;
  /** Modules of this chapter that failed to load. */
  failed: number;
}

export interface SubjectBank {
  subject: SubjectId;
  /** Every valid template, in module order. */
  templates: readonly QuestionTemplate[];
  mix: Mix;
  /** Syllabus chapters in syllabus order, then any unknown chapter ids. */
  chapters: readonly ChapterSummary[];
  byChapter: ReadonlyMap<string, readonly QuestionTemplate[]>;
  byId: ReadonlyMap<string, QuestionTemplate>;
  /** Registry path of the module that defines each template. */
  pathById: ReadonlyMap<string, string>;
  /** Chapter modules found for the subject (loaded or not). */
  moduleCount: number;
  failures: readonly LoadFailure[];
  /** Template ids defined more than once (only the first definition is listed). */
  duplicates: readonly string[];
  /** Entries in `templates` arrays that are not valid templates. */
  malformed: number;
}

const KINDS = new Set(['dynamic', 'static', 'set']);

/** Structural guard: never let a half-written module crash the browser. */
export function isTemplate(value: unknown): value is QuestionTemplate {
  if (!value || typeof value !== 'object') return false;
  const t = value as Partial<QuestionTemplate> & Record<string, unknown>;
  if (typeof t.id !== 'string' || !t.id || typeof t.chapter !== 'string' || !t.chapter)
    return false;
  if (typeof t.kind !== 'string' || !KINDS.has(t.kind)) return false;
  if (t.difficulty !== 1 && t.difficulty !== 2 && t.difficulty !== 3) return false;
  if (!Array.isArray(t.tags)) return false;
  if (t.kind === 'static') return Boolean(t.question) && typeof t.question === 'object';
  return typeof t.generate === 'function';
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

const relativeFile = (path: string): string =>
  path.replace(/^(\.\.\/)+/, '').replace(/^(src\/)?bank\//, '');

/** Turns settled bank modules into the browser's view of one subject. */
export function buildSubjectBank(
  subject: SubjectId,
  settled: readonly SettledModule[],
): SubjectBank {
  const failures: LoadFailure[] = [];
  const templates: QuestionTemplate[] = [];
  const byId = new Map<string, QuestionTemplate>();
  const pathById = new Map<string, string>();
  const duplicates = new Set<string>();
  let malformed = 0;

  for (const entry of settled) {
    const file = relativeFile(entry.path);
    const chapter = chapterOfPath(entry.path);
    if (entry.error !== undefined) {
      failures.push({ path: entry.path, file, chapter, error: entry.error });
      continue;
    }
    const list = (entry.module as { templates?: unknown } | undefined)?.templates;
    if (!Array.isArray(list)) {
      failures.push({
        path: entry.path,
        file,
        chapter,
        error: 'The module does not default-export defineBank(...).',
      });
      continue;
    }
    for (const candidate of list as unknown[]) {
      if (!isTemplate(candidate)) {
        malformed++;
        continue;
      }
      if (byId.has(candidate.id)) {
        duplicates.add(candidate.id);
        continue;
      }
      byId.set(candidate.id, candidate);
      pathById.set(candidate.id, entry.path);
      templates.push(candidate);
    }
  }

  const byChapter = new Map<string, QuestionTemplate[]>();
  for (const t of templates) {
    const list = byChapter.get(t.chapter);
    if (list) list.push(t);
    else byChapter.set(t.chapter, [t]);
  }

  const failedByChapter = new Map<string, number>();
  for (const f of failures)
    failedByChapter.set(f.chapter, (failedByChapter.get(f.chapter) ?? 0) + 1);

  const syllabus = SYLLABUS[subject]?.chapters ?? [];
  const totalWeight = syllabus.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
  const known = new Set(syllabus.map((c) => c.id));
  const chapters: ChapterSummary[] = syllabus.map((c) => ({
    id: c.id,
    name: c.name,
    part: c.part,
    weight: c.weight,
    share: totalWeight > 0 ? (100 * Math.max(0, c.weight)) / totalWeight : 0,
    topics: c.topics,
    mix: mixOf(byChapter.get(c.id) ?? []),
    inSyllabus: true,
    failed: failedByChapter.get(c.id) ?? 0,
  }));
  for (const [id, list] of byChapter) {
    if (known.has(id)) continue;
    chapters.push({
      id,
      name: id,
      part: '-',
      weight: 0,
      share: 0,
      topics: [],
      mix: mixOf(list),
      inSyllabus: false,
      failed: failedByChapter.get(id) ?? 0,
    });
  }

  return {
    subject,
    templates,
    mix: mixOf(templates),
    chapters,
    byChapter,
    byId,
    pathById,
    moduleCount: settled.length,
    failures,
    duplicates: [...duplicates],
    malformed,
  };
}

// ---------------------------------------------------------------------------
// Store

export type SubjectState =
  | { status: 'loading' }
  | { status: 'ready'; bank: SubjectBank }
  | { status: 'error'; error: string };

const states = new Map<SubjectId, SubjectState>();
const inflight = new Map<SubjectId, Promise<void>>();
const listeners = new Set<() => void>();
let counts: Readonly<Partial<Record<SubjectId, number>>> = {};

function emit(): void {
  for (const listener of [...listeners]) listener();
}

function setState(subject: SubjectId, state: SubjectState): void {
  states.set(subject, state);
  if (state.status === 'ready') counts = { ...counts, [subject]: state.bank.templates.length };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Loads a subject's chapter modules unless they are loaded or loading already.
 * `force` reloads after an error or to retry modules that failed (the registry
 * forgets failed modules, so they are fetched again).
 */
export function loadSubject(
  subject: SubjectId,
  { force = false }: { force?: boolean } = {},
): Promise<void> {
  const pending = inflight.get(subject);
  if (pending) return pending;
  const current = states.get(subject);
  if (!force && current && current.status !== 'error') return Promise.resolve();

  setState(subject, { status: 'loading' });
  const promise = Promise.resolve()
    .then(() => loadBankModulesSettled([`${subject}/`]))
    .then(
      (settled) => setState(subject, { status: 'ready', bank: buildSubjectBank(subject, settled) }),
      (error: unknown) => setState(subject, { status: 'error', error: describeError(error) }),
    )
    .finally(() => inflight.delete(subject));
  inflight.set(subject, promise);
  return promise;
}

/** Current load state of a subject (undefined until a load is requested). */
export function useSubjectState(subject: SubjectId): SubjectState | undefined {
  const read = () => states.get(subject);
  return useSyncExternalStore(subscribe, read, read);
}

/** Template counts of every subject loaded so far. */
export function useLoadedCounts(): Readonly<Partial<Record<SubjectId, number>>> {
  const read = () => counts;
  return useSyncExternalStore(subscribe, read, read);
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Once the visible subject is ready, quietly loads the other subjects one at a time
 * while the browser is idle so every tab can show its template count. Skipped when
 * the browser has no idle callbacks or the user asked to save data.
 */
export function usePrefetchSubjects(enabled: boolean, order: readonly SubjectId[]): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const w = window as IdleWindow;
    const requestIdle = w.requestIdleCallback;
    if (typeof requestIdle !== 'function') return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;

    let cancelled = false;
    let handle: number | undefined;
    const next = () => {
      if (cancelled) return;
      const subject = order.find((s) => !states.has(s));
      if (!subject) return;
      handle = requestIdle.call(
        w,
        () => {
          handle = undefined;
          if (!cancelled) void loadSubject(subject).then(next);
        },
        { timeout: 4000 },
      );
    };
    next();
    return () => {
      cancelled = true;
      if (handle !== undefined) w.cancelIdleCallback?.(handle);
    };
  }, [enabled, order]);
}

/** Forgets everything loaded (tests). */
export function resetBankStore(): void {
  states.clear();
  inflight.clear();
  counts = {};
  emit();
}
