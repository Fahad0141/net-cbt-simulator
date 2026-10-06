import { useEffect, useState } from 'react';
import { BANK_VERSION } from '@/exam/papers';
import { Button, Card, formatDate } from '@/ui/components/ui';
import type { ResultModel, SourceTally } from './analysis';
import { formatPercent, plural } from './format';
import s from './result.module.css';

function CopyCode({ code }: { code: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const canCopy =
    typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';

  useEffect(() => {
    if (status === 'idle') return;
    const timer = window.setTimeout(() => setStatus('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (!canCopy) return null;
  return (
    <>
      <Button
        variant="ghost"
        aria-label={`Copy paper code ${code}`}
        onClick={() => {
          navigator.clipboard.writeText(code).then(
            () => setStatus('copied'),
            () => setStatus('failed'),
          );
        }}
      >
        Copy
      </Button>
      <span className={s.copyStatus} role="status">
        {status === 'copied' ? 'Copied' : status === 'failed' ? 'Could not copy' : ''}
      </span>
    </>
  );
}

function SourceRow({ label, tally }: { label: string; tally: SourceTally }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className={s.n}>{tally.total}</td>
      <td className={s.n}>
        {tally.correct}/{tally.total}
      </td>
      <td className={s.n}>{tally.attempted ? formatPercent(tally.accuracy) : '—'}</td>
    </tr>
  );
}

/** Where the paper came from: code, pattern, bank version and question sources. */
export function PaperDetails({ model }: { model: ResultModel }) {
  const { paper, exam, sources } = model;
  const minutes = Math.round(model.timing.allowedMs / 60_000);
  const pattern = exam
    ? `${exam.name}${exam.era === 'legacy' ? ' (pre-2025 pattern)' : ''}`
    : model.kind === 'custom'
      ? 'Custom practice test'
      : paper.examType || 'Unknown';

  return (
    <Card className={s.cq} title="About this paper">
      <dl className={s.details}>
        <div className={s.detail}>
          <dt>Paper code</dt>
          <dd className={s.codeRow}>
            <code className={s.code}>{paper.code}</code>
            <CopyCode code={paper.code} />
          </dd>
        </div>
        <div className={s.detail}>
          <dt>Pattern</dt>
          <dd>{pattern}</dd>
        </div>
        <div className={s.detail}>
          <dt>Sections</dt>
          <dd>
            {paper.sections.length
              ? paper.sections.map((sec) => `${sec.title} ${sec.count}`).join(', ')
              : '—'}
          </dd>
        </div>
        <div className={s.detail}>
          <dt>Format</dt>
          <dd>
            {plural(paper.questions.length, 'MCQ')} in {minutes} minutes
          </dd>
        </div>
        <div className={s.detail}>
          <dt>Started</dt>
          <dd>{formatDate(model.startedAt)}</dd>
        </div>
        <div className={s.detail}>
          <dt>Question bank</dt>
          <dd>
            v{paper.bankVersion || '?'}
            {model.bankChanged ? ` (now v${BANK_VERSION})` : ''}
          </dd>
        </div>
      </dl>

      <h3 className={s.subTitle}>Question sources</h3>
      <table className={s.miniTable}>
        <caption className="visually-hidden">Your accuracy by question source</caption>
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col" className={s.n}>
              Questions
            </th>
            <th scope="col" className={s.n}>
              Correct
            </th>
            <th scope="col" className={s.n}>
              Accuracy
            </th>
          </tr>
        </thead>
        <tbody>
          <SourceRow label="Modelled on past papers" tally={sources.pastPaper} />
          <SourceRow label="Original NET-style" tally={sources.original} />
          <SourceRow label="Randomised values" tally={sources.randomised} />
          <SourceRow label="Fixed questions" tally={sources.fixed} />
        </tbody>
      </table>
    </Card>
  );
}
