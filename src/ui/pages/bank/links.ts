import { REPO_URL, repoFileUrl } from '@/config/site';

/**
 * External links used by the question-bank browser. They all derive from
 * REPO_URL in src/config/site.ts (re-exported here for existing importers).
 */
export { REPO_URL };

/** The contributor guide for writing question templates. */
export const AUTHORING_GUIDE_URL = repoFileUrl('docs/QUESTION_AUTHORING.md');

/**
 * GitHub URL of a bank module, from its registry path
 * (`../bank/physics/work-energy.ts` -> `.../blob/main/src/bank/physics/work-energy.ts`).
 */
export function sourceFileUrl(modulePath: string): string {
  const relative = modulePath.replace(/^(\.\.\/|\.\/|\/)*(src\/)?/, '').replace(/^bank\//, '');
  return repoFileUrl(`src/bank/${relative}`);
}

/** Repository-relative path of a bank module, for display (`src/bank/physics/work-energy.ts`). */
export function sourceFilePath(modulePath: string): string {
  const relative = modulePath.replace(/^(\.\.\/|\.\/|\/)*(src\/)?/, '').replace(/^bank\//, '');
  return `src/bank/${relative}`;
}

/**
 * A pre-filled "Wrong or unclear question" issue (see .github/ISSUE_TEMPLATE/wrong-question.yml).
 * The form's `template` field cannot be pre-filled because `template` is also the
 * query parameter that selects the form, so the id goes into the title and the
 * paper field instead.
 */
export function reportProblemUrl({
  templateId,
  seed,
  pageUrl,
}: {
  templateId: string;
  seed?: string;
  pageUrl?: string;
}): string {
  const where = `Question bank preview: ${templateId}${seed ? ` (variant seed ${seed})` : ''}`;
  const params = new URLSearchParams({
    template: 'wrong-question.yml',
    title: `Wrong or unclear question: ${templateId}`,
    paper: where,
    problem: pageUrl ? `Seen at ${pageUrl}\n\n` : '',
  });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}
