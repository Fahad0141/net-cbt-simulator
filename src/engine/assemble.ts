import { arrangeOptions, realize, type Realized } from './instantiate';
import { createRng, type Rng } from './rng';
import type {
  Difficulty,
  Paper,
  PaperSection,
  Question,
  QuestionTemplate,
  SubjectId,
} from './types';
import { validateQuestion } from './validate';

export interface SectionBlueprint {
  subject: SubjectId;
  title: string;
  count: number;
  /**
   * Relative weight of each chapter (chapter id -> weight). Chapters that are missing
   * or have no templates in the bank receive no questions; their share is redistributed.
   */
  chapterWeights: Readonly<Record<string, number>>;
  /**
   * Multiplier applied to the paper-level dynamic share for this section (default 1),
   * so conceptual subjects get fewer parametric questions than computational ones.
   */
  dynamicFactor?: number;
}

export interface Blueprint {
  examType: string;
  /** Prefix of the paper code, e.g. `ENG`. */
  codePrefix: string;
  title: string;
  durationMinutes: number;
  sections: readonly SectionBlueprint[];
}

export interface AssembleOptions {
  seed: string;
  /** Bank version stamped on the paper. */
  bankVersion: string;
  /** Target share (0-1) of parametric (dynamic) questions. Default 0.5. */
  dynamicShare?: number;
  /** Relative weights of easy / medium / hard. Default [0.3, 0.5, 0.2]. */
  difficultyMix?: readonly [number, number, number];
  /** Multiplier applied to templates whose origin is `past-paper`. Default 1.5. */
  pastPaperBoost?: number;
  /** Shuffle question order inside each section (passage sets stay together). Default true. */
  shuffle?: boolean;
  /** Randomly perturb chapter weights per paper, like real papers vary. Default 0.25. */
  chapterJitter?: number;
}

/**
 * Easy / medium / hard shares. Calibrated to reconstructed 2023-25 NET papers, which
 * were judged roughly 55% easy, 37% medium and 8-10% hard, nudged slightly harder so the
 * simulator does not under-prepare candidates.
 */
export const DEFAULT_DIFFICULTY_MIX: readonly [number, number, number] = [0.45, 0.42, 0.13];

/**
 * Largest-remainder apportionment: splits `total` into integers proportional to
 * `weights` that sum exactly to `total`. Ties go to the earlier index.
 */
export function apportion(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);
  if (sum <= 0) {
    const even = weights.map(() => 1);
    return apportion(total, even);
  }
  const raw = weights.map((w) => (total * Math.max(0, w)) / sum);
  const out = raw.map(Math.floor);
  let remaining = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remaining > 0; k = (k + 1) % order.length, remaining--) {
    const idx = (order[k] as { i: number }).i;
    out[idx] = (out[idx] as number) + 1;
  }
  return out;
}

/** A unit of questions that stays together when shuffling (single question or passage set). */
interface Unit {
  template: QuestionTemplate;
  occurrence: number;
  items: Realized[];
}

function chapterOrder(weights: Readonly<Record<string, number>>): string[] {
  return Object.keys(weights);
}

/** Identity of a realised question, used to avoid printing the same variant twice. */
const fingerprint = (item: Realized): string => `${item.question.stem}␞${item.question.answer}`;

/**
 * Generates one realisation of `template`, retrying with fresh streams if the
 * output fails structural validation (rare degenerate parameter combinations) or
 * duplicates a question already in the paper.
 */
function realizeValid(
  template: QuestionTemplate,
  seed: string,
  occurrence: number,
  seen: ReadonlySet<string>,
): Realized[] | null {
  for (let attempt = 0; attempt < 8; attempt++) {
    const rng = createRng(`${seed}|q|${template.id}|${occurrence}|${attempt}`);
    try {
      const items = realize(template, rng);
      const ok =
        items.length > 0 &&
        items.every((it) => !seen.has(fingerprint(it))) &&
        items.every((it) =>
          validateQuestion(it.question).every((issue) => issue.severity !== 'error'),
        );
      if (ok) return items;
    } catch {
      // try the next stream
    }
    if (template.kind === 'static') break;
  }
  return null;
}

function pickSection(
  section: SectionBlueprint,
  pool: readonly QuestionTemplate[],
  rng: Rng,
  opts: Required<Omit<AssembleOptions, 'seed' | 'bankVersion'>>,
  seed: string,
): Unit[] {
  const byChapter = new Map<string, QuestionTemplate[]>();
  for (const t of pool) {
    if (t.subject !== section.subject) continue;
    const list = byChapter.get(t.chapter) ?? [];
    list.push(t);
    byChapter.set(t.chapter, list);
  }
  if (byChapter.size === 0) {
    throw new Error(`No templates available for subject "${section.subject}"`);
  }

  // Chapters with weight and templates, with per-paper jitter.
  const chapters = chapterOrder(section.chapterWeights).filter(
    (c) => (section.chapterWeights[c] ?? 0) > 0 && (byChapter.get(c)?.length ?? 0) > 0,
  );
  const usable = chapters.length > 0 ? chapters : [...byChapter.keys()];
  const weights = usable.map((c) => {
    const base = chapters.length > 0 ? (section.chapterWeights[c] as number) : 1;
    return base * (1 - opts.chapterJitter + 2 * opts.chapterJitter * rng.next());
  });
  const quotas = apportion(section.count, weights);

  const targetDifficulty = apportion(section.count, opts.difficultyMix);
  const haveDifficulty = [0, 0, 0];
  const sectionShare = Math.min(
    0.95,
    Math.max(0, opts.dynamicShare * (section.dynamicFactor ?? 1)),
  );
  const targetDynamic = Math.round(section.count * sectionShare);
  let haveDynamic = 0;
  const uses = new Map<string, number>();
  const broken = new Set<string>();
  const seen = new Set<string>();
  const units: Unit[] = [];
  let produced = 0;

  const isParametric = (t: QuestionTemplate) => t.kind !== 'static';

  // Prefer unused templates; then let parametric templates repeat (each repeat is a
  // fresh variant), least-used first. Static templates never repeat.
  const candidatesFor = (chapterTemplates: readonly QuestionTemplate[]): QuestionTemplate[] => {
    const alive = chapterTemplates.filter((t) => !broken.has(t.id));
    const fresh = alive.filter((t) => (uses.get(t.id) ?? 0) === 0);
    if (fresh.length) return fresh;
    const reusable = alive.filter(isParametric);
    if (!reusable.length) return [];
    const least = Math.min(...reusable.map((t) => uses.get(t.id) ?? 0));
    return reusable.filter((t) => (uses.get(t.id) ?? 0) === least);
  };

  const score = (t: QuestionTemplate): number => {
    const d = (t.difficulty as Difficulty) - 1;
    const needD = (targetDifficulty[d] as number) - (haveDifficulty[d] as number);
    const dFactor = needD > 0 ? 1 + (needD / Math.max(1, targetDifficulty[d] as number)) * 4 : 0.08;
    const needDyn = isParametric(t)
      ? targetDynamic - haveDynamic
      : section.count - targetDynamic - (produced - haveDynamic);
    const kFactor = needDyn > 0 ? 1 + 2 * (needDyn / Math.max(1, section.count)) * 4 : 0.15;
    const origin = t.origin === 'past-paper' ? opts.pastPaperBoost : 1;
    const repeat = 1 / (1 + 4 * (uses.get(t.id) ?? 0));
    return dFactor * kFactor * origin * repeat;
  };

  const take = (t: QuestionTemplate, room: number): number => {
    const occurrence = uses.get(t.id) ?? 0;
    const items = realizeValid(t, seed, occurrence, seen);
    if (!items) {
      // Invalid output, or a parametric template whose variants are exhausted.
      broken.add(t.id);
      return 0;
    }
    uses.set(t.id, occurrence + 1);
    const kept = items.slice(0, Math.max(1, room));
    kept.forEach((it) => seen.add(fingerprint(it)));
    units.push({ template: t, occurrence, items: kept });
    produced += kept.length;
    haveDifficulty[t.difficulty - 1] = (haveDifficulty[t.difficulty - 1] as number) + kept.length;
    if (isParametric(t)) haveDynamic += kept.length;
    return kept.length;
  };

  // Fill chapters in a random order so the balancing pressure is spread evenly.
  const order = rng.shuffle(usable.map((c, i) => ({ c, quota: quotas[i] as number })));
  let carry = 0;
  for (const { c, quota } of order) {
    let remaining = quota + carry;
    carry = 0;
    const chapterTemplates = byChapter.get(c) ?? [];
    let guard = 0;
    while (remaining > 0 && guard++ < 200) {
      const cands = candidatesFor(chapterTemplates);
      if (!cands.length) break;
      const t = rng.weighted(cands, cands.map(score));
      remaining -= take(t, remaining);
    }
    carry = Math.max(0, remaining);
  }

  // Anything still missing (chapters ran dry): borrow from any chapter of the subject.
  const allTemplates = [...byChapter.values()].flat();
  let guard = 0;
  while (produced < section.count && guard++ < 1000) {
    const cands = candidatesFor(allTemplates);
    if (!cands.length) break;
    const t = rng.weighted(cands, cands.map(score));
    take(t, section.count - produced);
  }
  if (produced < section.count) {
    throw new Error(
      `Bank too small for ${section.subject}: needed ${section.count}, produced ${produced}`,
    );
  }

  if (opts.shuffle) return rng.shuffle(units);
  const rank = new Map(chapterOrder(section.chapterWeights).map((c, i) => [c, i]));
  return [...units].sort(
    (a, b) =>
      (rank.get(a.template.chapter) ?? 999) - (rank.get(b.template.chapter) ?? 999) ||
      a.template.difficulty - b.template.difficulty,
  );
}

/** Formats a paper code: `ENG-K7Q2-9XM4`. */
export function formatPaperCode(prefix: string, seed: string): string {
  const half = Math.ceil(seed.length / 2);
  return `${prefix}-${seed.slice(0, half)}-${seed.slice(half)}`;
}

/**
 * Assembles a complete paper from the bank. Pure and deterministic: the same
 * blueprint, options and bank always produce the same paper.
 */
export function assemblePaper(
  bank: readonly QuestionTemplate[],
  blueprint: Blueprint,
  options: AssembleOptions,
): Paper {
  const opts = {
    dynamicShare: options.dynamicShare ?? 0.5,
    difficultyMix: options.difficultyMix ?? DEFAULT_DIFFICULTY_MIX,
    pastPaperBoost: options.pastPaperBoost ?? 1.5,
    shuffle: options.shuffle ?? true,
    chapterJitter: options.chapterJitter ?? 0.25,
  };
  const code = formatPaperCode(blueprint.codePrefix, options.seed);
  const questions: Question[] = [];
  const sections: PaperSection[] = [];

  blueprint.sections.forEach((section, sectionIndex) => {
    const rng = createRng(
      `${options.seed}|${blueprint.examType}|s${sectionIndex}|${section.subject}`,
    );
    const units = pickSection(section, bank, rng, opts, options.seed);
    const start = questions.length;
    for (const unit of units) {
      const passageId = `${unit.template.id}#${unit.occurrence}`;
      unit.items.forEach((item, part) => {
        const index = questions.length;
        const arranged = arrangeOptions(
          item.question,
          createRng(`${options.seed}|opt|${unit.template.id}|${unit.occurrence}|${part}`),
        );
        questions.push({
          index,
          uid: `${code}#${index}`,
          templateId: unit.template.id,
          templateKind: unit.template.kind,
          subject: unit.template.subject,
          chapter: unit.template.chapter,
          difficulty: unit.template.difficulty,
          origin: unit.template.origin,
          tags: unit.template.tags,
          stem: item.question.stem,
          options: arranged.options,
          correct: arranged.correct,
          explanation: item.question.explanation,
          ...(item.question.figure ? { figure: item.question.figure } : {}),
          ...(item.passage
            ? {
                passage: {
                  id: passageId,
                  text: item.passage.text,
                  part: item.passage.part,
                  of: item.passage.of,
                  ...(item.passage.title ? { title: item.passage.title } : {}),
                },
              }
            : {}),
        });
      });
    }
    sections.push({
      subject: section.subject,
      title: section.title,
      start,
      count: questions.length - start,
    });
  });

  return {
    code,
    examType: blueprint.examType,
    seed: options.seed,
    title: blueprint.title,
    durationMinutes: blueprint.durationMinutes,
    bankVersion: options.bankVersion,
    sections,
    questions,
  };
}
