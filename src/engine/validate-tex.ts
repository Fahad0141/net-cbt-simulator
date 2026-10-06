import katex from 'katex';
import 'katex/contrib/mhchem';
import { collectMath } from './rich';
import type { AuthoredQuestion } from './types';
import type { ValidationIssue } from './validate';

/**
 * Compiles every LaTeX fragment of a question with KaTeX (the same renderer the UI
 * uses) and reports fragments that fail. Used by the test-suite, not at runtime.
 */
export function texIssues(q: AuthoredQuestion, passage?: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fields: Array<[string, string | undefined]> = [
    ['stem', q.stem],
    ['answer', q.answer],
    ...q.distractors.map((d, i) => [`distractor[${i + 1}]`, d] as [string, string]),
    ['explanation', q.explanation],
    ['passage', passage],
  ];
  for (const [field, text] of fields) {
    if (typeof text !== 'string') continue;
    for (const { tex, display } of collectMath(text)) {
      try {
        katex.renderToString(tex, { throwOnError: true, displayMode: display, strict: 'ignore' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push({
          severity: 'error',
          field,
          message: `KaTeX cannot render "${tex}": ${message}`,
        });
      }
    }
  }
  return issues;
}
