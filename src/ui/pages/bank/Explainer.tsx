import { AUTHORING_GUIDE_URL } from './links';
import { ExternalLink } from './parts';
import s from './bank.module.css';

/** What the template kinds mean, for students and would-be contributors. */
export function Explainer() {
  return (
    <div className={s.explainer}>
      <p>
        Every question in a generated paper comes from a <strong>template</strong> in this bank.
      </p>
      <dl className={s.kinds}>
        <div>
          <dt>Parametric</dt>
          <dd>
            A small program instead of a fixed text. Each use draws new numbers or words from a
            seeded random generator and recomputes the answer, with distractors built from typical
            mistakes. One template yields many equivalent questions, and the same seed always
            rebuilds the same variant, which is why a paper code regenerates the identical paper.
          </dd>
        </div>
        <div>
          <dt>Fixed</dt>
          <dd>Written once; only the order of its options changes from paper to paper.</dd>
        </div>
        <div>
          <dt>Passage set</dt>
          <dd>A reading passage whose questions always appear together.</dd>
        </div>
        <div>
          <dt>Past-paper style</dt>
          <dd>
            Modelled on topics and difficulty reported from real NET sittings and written in
            original words; not copied from NUST papers.
          </dd>
        </div>
      </dl>
      <p className={s.explainerCta}>
        Want to add or improve questions? Read the{' '}
        <ExternalLink href={AUTHORING_GUIDE_URL}>question authoring guide</ExternalLink> on GitHub.
      </p>
    </div>
  );
}
