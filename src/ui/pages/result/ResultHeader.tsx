import { BANK_VERSION } from '@/exam/papers';
import { Badge, Callout, formatDate, LinkButton } from '@/ui/components/ui';
import { href } from '@/ui/router';
import {
  newPaperPath,
  practiseAgainPath,
  printPath,
  type ResultModel,
  retakePath,
  reviewPath,
} from './analysis';
import s from './result.module.css';

function isoDate(epoch: number): string | undefined {
  const date = new Date(epoch);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Title block of the score report: paper, attempt facts and the main actions. */
export function ResultHeader({ model }: { model: ResultModel }) {
  const { paper, exam } = model;
  const retake = retakePath(model);
  const again = practiseAgainPath(model);
  const print = printPath(model);
  const timedOut = model.finishReason === 'timeout';

  return (
    <header className={s.header}>
      <a className={s.backLink} href={href('/history')}>
        Back to history
      </a>
      <h1 className={s.title}>{paper.title || 'Untitled paper'}</h1>
      <div className={s.meta}>
        <div className={s.badges}>
          <Badge tone={model.mode === 'exam' ? 'info' : 'neutral'}>
            {model.mode === 'exam' ? 'Exam mode' : 'Practice mode'}
          </Badge>
          <Badge
            tone={timedOut ? 'warning' : 'neutral'}
            title={
              timedOut ? 'The paper was submitted automatically when the timer ran out' : undefined
            }
          >
            {timedOut ? 'Time up' : 'Submitted'}
          </Badge>
          {model.mode === 'practice' && model.session.settings?.instantFeedback ? (
            <Badge>Instant feedback on</Badge>
          ) : null}
          {exam?.era === 'legacy' ? <Badge>Pre-2025 pattern</Badge> : null}
        </div>
        <dl className={s.facts}>
          <div className={s.fact}>
            <dt>Paper code</dt>
            <dd className={s.code}>{paper.code}</dd>
          </div>
          <div className={s.fact}>
            <dt>Finished</dt>
            <dd>
              <time dateTime={isoDate(model.finishedAt)}>{formatDate(model.finishedAt)}</time>
            </dd>
          </div>
          <div className={s.fact}>
            <dt>Candidate</dt>
            <dd>{model.candidateName}</dd>
          </div>
        </dl>
      </div>
      <div className={s.actions} role="group" aria-label="Result actions">
        <LinkButton variant="primary" href={href(reviewPath(model.id))}>
          Review answers
        </LinkButton>
        {retake ? <LinkButton href={href(retake)}>Retake this paper</LinkButton> : null}
        {again ? (
          <LinkButton
            href={href(again)}
            title="A new custom test with the same subjects, chapters and time"
          >
            Practise again
          </LinkButton>
        ) : null}
        {print ? <LinkButton href={href(print)}>Printable paper + key</LinkButton> : null}
        <LinkButton variant="ghost" href={href(newPaperPath(model))}>
          New paper
        </LinkButton>
      </div>
      {model.bankChanged && (retake || print) ? (
        <Callout tone="warning">
          Made with question bank v{paper.bankVersion} (now v{BANK_VERSION}), so its code may now
          build different questions. Review answers still shows the paper you sat.
        </Callout>
      ) : null}
    </header>
  );
}
