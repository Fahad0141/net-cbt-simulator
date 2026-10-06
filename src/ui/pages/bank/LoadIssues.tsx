import { Button, Callout } from '@/ui/components/ui';
import { splitTemplateId } from './model';
import { requestFocus } from './navigation';
import { loadSubject, type SubjectBank } from './store';
import s from './bank.module.css';

/**
 * Warns about chapter modules that failed to load (and other bank defects), for the
 * whole subject or one chapter, with a retry.
 */
export function LoadIssues({ bank, chapter }: { bank: SubjectBank; chapter?: string }) {
  const failures = chapter ? bank.failures.filter((f) => f.chapter === chapter) : bank.failures;
  const duplicates = chapter
    ? bank.duplicates.filter((id) => splitTemplateId(id).chapter === chapter)
    : bank.duplicates;
  const malformed = chapter ? 0 : bank.malformed;
  if (!failures.length && !duplicates.length && !malformed) return null;

  const retry = () => {
    requestFocus(chapter ? 'chapter-heading' : 'overview-heading');
    void loadSubject(bank.subject, { force: true });
  };

  return (
    <Callout tone="warning">
      <div className={s.loadIssues}>
        {failures.length ? (
          <>
            <p>
              <strong>
                {failures.length === 1 ? 'One chapter file' : `${failures.length} chapter files`}{' '}
                failed to load.
              </strong>{' '}
              {failures.length === 1 ? 'Its templates are' : 'Their templates are'} missing here and
              from generated papers.
            </p>
            <ul className={s.failureList}>
              {failures.map((f) => (
                <li key={f.path}>
                  <code>{f.file}</code>: <span className={s.errorText}>{f.error}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {duplicates.length ? (
          <p>
            <strong>Duplicate template ids</strong> (only the first definition is shown):{' '}
            {duplicates.map((id, i) => (
              <span key={id}>
                {i > 0 ? ', ' : ''}
                <code>{id}</code>
              </span>
            ))}
          </p>
        ) : null}
        {malformed ? (
          <p>
            {malformed === 1
              ? 'One entry is not a valid template and was'
              : `${malformed} entries are not valid templates and were`}{' '}
            skipped.
          </p>
        ) : null}
        {failures.length ? (
          <div>
            <Button onClick={retry}>Retry loading</Button>
          </div>
        ) : null}
      </div>
    </Callout>
  );
}
