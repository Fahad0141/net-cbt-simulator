import type { Rng } from './rng';
import type {
  AuthoredQuestion,
  BankModule,
  Difficulty,
  DynamicTemplate,
  Origin,
  PassageSet,
  QuestionTemplate,
  SetTemplate,
  StaticTemplate,
  SubjectId,
} from './types';

/** Template metadata: either just a difficulty, or the full object. */
export type MetaInput =
  | Difficulty
  | {
      difficulty: Difficulty;
      /** Defaults to `original`. Use `past-paper` for items modelled on reported NET questions. */
      origin?: Origin;
      tags?: readonly string[];
    };

/** Compact form for writing many fixed questions quickly (see `Builder.mcqs`). */
export interface CompactMcq {
  /** Local id, unique within the chapter (kebab-case). */
  id: string;
  /** Difficulty 1-3. */
  d: Difficulty;
  /** Stem. */
  q: string;
  /** Correct answer. */
  a: string;
  /** Three wrong options. */
  x: readonly [string, string, string];
  /** Explanation. */
  e: string;
  /** Origin; defaults to `original`. */
  o?: Origin;
  /** Tags. */
  t?: readonly string[];
  /** Fixed option order (permutation of a + x), when options must not be shuffled. */
  fixed?: readonly string[];
  /** Optional SVG figure. */
  fig?: string;
}

export interface Builder {
  /** A parametric template; `generate` is called with a fresh seeded RNG per instance. */
  dynamic(id: string, meta: MetaInput, generate: (rng: Rng) => AuthoredQuestion): DynamicTemplate;
  /** A single fixed question. */
  fixed(id: string, meta: MetaInput, question: AuthoredQuestion): StaticTemplate;
  /** Many fixed questions in compact form. */
  mcqs(items: readonly CompactMcq[]): StaticTemplate[];
  /** A passage with `size` questions that are always delivered together. */
  set(id: string, meta: MetaInput, size: number, generate: (rng: Rng) => PassageSet): SetTemplate;
}

function normalizeMeta(meta: MetaInput): {
  difficulty: Difficulty;
  origin: Origin;
  tags: readonly string[];
} {
  if (typeof meta === 'number') return { difficulty: meta, origin: 'original', tags: [] };
  return { difficulty: meta.difficulty, origin: meta.origin ?? 'original', tags: meta.tags ?? [] };
}

const LOCAL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Declares the templates of one chapter. Every file in `src/bank/<subject>/` must
 * default-export the result:
 *
 *   export default defineBank('physics', 'work-energy', (b) => [
 *     b.dynamic('ke-from-mass-speed', 1, (r) => { ... }),
 *     ...b.mcqs([{ id: 'si-unit-of-power', d: 1, q: '...', a: '...', x: ['...', '...', '...'], e: '...' }]),
 *   ]);
 */
export function defineBank(
  subject: SubjectId,
  chapter: string,
  build: (b: Builder) => ReadonlyArray<QuestionTemplate | readonly QuestionTemplate[]>,
): BankModule {
  const fullId = (local: string): string => {
    if (!LOCAL_ID.test(local)) {
      throw new Error(`Template id "${local}" in ${subject}/${chapter} must be kebab-case`);
    }
    return `${subject}/${chapter}/${local}`;
  };

  const builder: Builder = {
    dynamic(id, meta, generate) {
      return {
        kind: 'dynamic',
        id: fullId(id),
        subject,
        chapter,
        ...normalizeMeta(meta),
        generate,
      };
    },
    fixed(id, meta, question) {
      return { kind: 'static', id: fullId(id), subject, chapter, ...normalizeMeta(meta), question };
    },
    mcqs(items) {
      return items.map((item) => ({
        kind: 'static' as const,
        id: fullId(item.id),
        subject,
        chapter,
        difficulty: item.d,
        origin: item.o ?? 'original',
        tags: item.t ?? [],
        question: {
          stem: item.q,
          answer: item.a,
          distractors: item.x,
          explanation: item.e,
          ...(item.fixed ? { fixedOrder: item.fixed } : {}),
          ...(item.fig ? { figure: item.fig } : {}),
        },
      }));
    },
    set(id, meta, size, generate) {
      return {
        kind: 'set',
        id: fullId(id),
        subject,
        chapter,
        ...normalizeMeta(meta),
        size,
        generate,
      };
    },
  };

  const templates = build(builder).flat() as QuestionTemplate[];
  const ids = new Set<string>();
  for (const t of templates) {
    if (ids.has(t.id)) throw new Error(`Duplicate template id ${t.id}`);
    ids.add(t.id);
  }
  return { subject, chapter, templates };
}
