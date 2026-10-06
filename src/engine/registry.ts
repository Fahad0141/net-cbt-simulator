import type { BankModule, QuestionTemplate, SubjectId } from './types';

/**
 * Every chapter module under `src/bank/<subject>/`. Files whose name starts with `_`
 * are shared data (word lists, passages) imported by chapter modules, not chapters.
 * Each subject becomes its own lazily-loaded chunk.
 */
const loaders = import.meta.glob<{ default: BankModule }>([
  '../bank/**/*.ts',
  '!../bank/**/*.test.ts',
  '!../bank/**/_*.ts',
]);

export interface LoadedModule {
  path: string;
  module: BankModule;
}

/** Subject folder of a bank module path (`../bank/physics/optics.ts` -> `physics`). */
export function subjectOfPath(path: string): string {
  return path.split('/').slice(-2, -1)[0] ?? '';
}

/** Chapter part of a bank module file name (`optics.ts`, `optics.past.ts` -> `optics`). */
export function chapterOfPath(path: string): string {
  const file = path.split('/').pop() ?? '';
  return file.replace(/\.ts$/, '').split('.')[0] ?? '';
}

export function bankModulePaths(): string[] {
  return Object.keys(loaders).sort();
}

const cache = new Map<string, Promise<LoadedModule>>();

function load(path: string): Promise<LoadedModule> {
  let pending = cache.get(path);
  if (!pending) {
    const loader = loaders[path];
    if (!loader) throw new Error(`Unknown bank module ${path}`);
    pending = loader().then((m) => ({ path, module: m.default }));
    cache.set(path, pending);
  }
  return pending;
}

export interface SettledModule {
  path: string;
  module?: BankModule;
  error?: string;
}

/**
 * Loads modules one by one, capturing failures per module instead of rejecting,
 * so a single broken chapter cannot hide the results of every other chapter.
 * `only` keeps paths whose `<subject>/<file>` part starts with any given prefix; a
 * prefix ending in `$` must match the file exactly (`physics/optics$` excludes
 * `physics/optics.concepts`).
 */
export async function loadBankModulesSettled(only?: readonly string[]): Promise<SettledModule[]> {
  const paths = bankModulePaths().filter((p) => {
    if (!only?.length) return true;
    const rel = p.replace('../bank/', '').replace(/\.ts$/, '');
    return only.some((prefix) =>
      prefix.endsWith('$') ? rel === prefix.slice(0, -1) : rel.startsWith(prefix),
    );
  });
  return Promise.all(
    paths.map((path) =>
      load(path).then(
        ({ module }) => ({ path, module }),
        (error: unknown) => {
          cache.delete(path);
          return {
            path,
            error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          };
        },
      ),
    ),
  );
}

/** Loads bank modules (optionally only some subjects), in stable path order. */
export async function loadBankModules(subjects?: readonly SubjectId[]): Promise<LoadedModule[]> {
  const paths = bankModulePaths().filter(
    (p) => !subjects || subjects.includes(subjectOfPath(p) as SubjectId),
  );
  return Promise.all(paths.map(load));
}

/** All templates (optionally only some subjects), in stable order. */
export async function loadBank(subjects?: readonly SubjectId[]): Promise<QuestionTemplate[]> {
  const modules = await loadBankModules(subjects);
  return modules.flatMap((m) => m.module.templates);
}
