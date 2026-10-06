import { AUTHORING_GUIDE_URL } from './links';
import { ExternalLink } from './parts';
import s from './bank.module.css';

/** What the template kinds mean, for students and would-be contributors. */
export function Explainer() {
  return (
    <div className={s.explainer}>
      <dl className={s.kinds}>
        <div>
          <dt>Parametric</dt>
          <dd>
            A small program instead of a fixed text: each use draws new numbers and recomputes the
            answer. The same seed always rebuilds the same variant.
          </dd>
        </div>
        <div>
          <dt>Fixed</dt>
          <dd>Written once; only the option order changes.</dd>
        </div>
        <div>
          <dt>Passage set</dt>
          <dd>A reading passage whose questions stay together.</dd>
        </div>
        <div>
          <dt>Past-paper style</dt>
          <dd>Modelled on topics reported from real NET sittings, in original words.</dd>
        </div>
      </dl>
      <p className={s.explainerCta}>
        Want to add questions? Read the{' '}
        <ExternalLink href={AUTHORING_GUIDE_URL}>question authoring guide</ExternalLink>.
      </p>
    </div>
  );
}
