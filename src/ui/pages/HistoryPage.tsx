import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type AttemptSummary, deleteAttempt, exportHistory, importHistory } from '@/exam/store';
import { isDesktopApp, isInstalledApp } from '@/platform/desktop';
import { isNativeApp, shareTextFile } from '@/platform/native';
import { isPersistentStorage } from '@/storage/kv';
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  ProgressBar,
  Stat,
  formatDate,
  formatDuration,
  ui,
} from '@/ui/components/ui';
import { useAttempts } from '@/ui/hooks';
import { href } from '@/ui/router';
import {
  dayKey,
  errorMessage,
  examTypeName,
  examTypeOptions,
  finite,
  formatPercent,
  plural,
} from './analytics/format';
import s from './HistoryPage.module.css';

const TITLE = 'History · NET CBT Simulator';

/** `id` changes with every message so the live region re-announces a repeated text. */
type Status = { tone: 'info' | 'error'; text: string; id: number } | null;

/** Reads a File as text (Blob.text is missing in some older browsers and test environments). */
function readFileText(file: Blob): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsText(file);
  });
}

/** ISO timestamp for `<time dateTime>`, or undefined for an out-of-range value (old or hand-edited backups). */
function isoDate(epoch: number): string | undefined {
  const date = new Date(epoch);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Triggers a browser download of `text` as a JSON file. */
function downloadJson(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Saves `data` as pretty-printed JSON. A WebView ignores `<a download>`, so the Android
 * app writes the file and opens the share sheet instead (Files, Drive, messaging apps).
 * Resolves to false when the user closes the share sheet.
 */
async function saveJsonFile(data: unknown, filename: string): Promise<boolean> {
  const text = JSON.stringify(data, null, 2);
  if (isNativeApp()) return shareTextFile(filename, text, 'NET CBT Simulator history');
  downloadJson(text, filename);
  return true;
}

export default function HistoryPage() {
  const { data, error, loading, reload } = useAttempts();
  const attempts = useMemo(() => data ?? [], [data]);
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [persistent, setPersistent] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const focusStatus = useRef(false);
  const messageId = useRef(0);
  const filterId = useId();
  const app = isInstalledApp();
  const android = isNativeApp();
  const keptIn = isDesktopApp() ? 'this computer' : app ? 'this device' : 'your browser';

  const say = (tone: 'info' | 'error', text: string) => {
    messageId.current += 1;
    setStatus({ tone, text, id: messageId.current });
  };

  // Dismissing removes the focused button: return focus to the toolbar just above.
  const dismiss = () => {
    setStatus(null);
    actionsRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  };

  useEffect(() => {
    document.title = TITLE;
  }, []);

  useEffect(() => {
    let live = true;
    void isPersistentStorage().then((value) => {
      if (live) setPersistent(value);
    });
    return () => {
      live = false;
    };
  }, []);

  // After a delete the row (and the focused button) disappears: move focus to the confirmation message.
  useEffect(() => {
    if (status && focusStatus.current) {
      focusStatus.current = false;
      statusRef.current?.focus();
    }
  }, [status]);

  const options = useMemo(() => examTypeOptions(attempts), [attempts]);
  // A filter that no longer matches anything (e.g. after deleting) falls back to "all".
  const activeFilter = filter !== 'all' && options.some((o) => o.id === filter) ? filter : 'all';
  const shown = useMemo(
    () => (activeFilter === 'all' ? attempts : attempts.filter((a) => a.examType === activeFilter)),
    [attempts, activeFilter],
  );

  const handleExport = async () => {
    setBusy('export');
    try {
      const backup = await exportHistory();
      if (await saveJsonFile(backup, `net-cbt-history-${dayKey(Date.now())}.json`)) {
        say('info', `Exported ${plural(backup.attempts.length, 'attempt')}.`);
      } else {
        say('info', 'Export cancelled.');
      }
    } catch (e) {
      say('error', `Export failed: ${errorMessage(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('import');
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readFileText(file));
      } catch {
        throw new Error('The file is not valid JSON.');
      }
      const count = await importHistory(parsed);
      if (count) say('info', `Imported ${plural(count, 'attempt')} from ${file.name}.`);
      else say('error', `No valid attempts were found in ${file.name}.`);
    } catch (e) {
      say('error', `Import failed: ${errorMessage(e)}`);
    } finally {
      setBusy(null);
      // Reload even after a failure: an import can stop part-way with some attempts already saved.
      reload();
    }
  };

  const handleDeleted = (attempt: AttemptSummary) => {
    focusStatus.current = true;
    say('info', `Deleted “${attempt.title || 'Untitled paper'}” (${attempt.paperCode}).`);
    reload();
  };

  const hasAttempts = attempts.length > 0;

  return (
    <div className={ui.page}>
      <PageHeader
        title="History"
        subtitle={`Every paper you have finished on this device, newest first. Your attempts never leave ${keptIn} unless you export them.`}
        actions={
          hasAttempts ? <LinkButton href={href('/analytics')}>View analytics</LinkButton> : null
        }
      />

      {persistent ? null : (
        <Callout tone="warning">
          This browser is not letting the site save data (common in private windows), so your
          attempts are kept only for this tab and will be lost when you reload or close it. Use
          Export history to keep a backup.
        </Callout>
      )}

      <div>
        <div className={s.toolbar}>
          {hasAttempts ? (
            <div className={s.filter}>
              <label htmlFor={filterId} className={s.filterLabel}>
                Exam type
              </label>
              <select
                id={filterId}
                className={ui.select}
                value={activeFilter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All papers ({attempts.length})</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} ({o.count})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className={s.toolbarActions} ref={actionsRef}>
            <Button onClick={handleExport} disabled={!hasAttempts || busy !== null}>
              {busy === 'export' ? 'Exporting…' : 'Export history'}
            </Button>
            <Button onClick={() => fileRef.current?.click()} disabled={busy !== null}>
              {busy === 'import' ? 'Importing…' : 'Import history'}
            </Button>
            {/* Opened by the button above; `hidden` keeps it out of the tab order and the accessibility tree.
                Android pickers grey out .json files of a type they do not know (older Android
                versions, files from chat apps), so the app accepts any file; the content is validated. */}
            <input
              ref={fileRef}
              type="file"
              accept={android ? undefined : 'application/json,.json'}
              hidden
              onChange={handleImport}
              aria-label="Import history file"
            />
          </div>
        </div>

        {/* The live region stays mounted (and visible to assistive tech) so every new message is announced. */}
        <div
          className={
            status ? (status.tone === 'error' ? s.statusError : s.statusInfo) : s.statusIdle
          }
        >
          <p ref={statusRef} tabIndex={-1} role="status" className={s.statusText}>
            {status ? <span key={status.id}>{status.text}</span> : null}
          </p>
          {status ? (
            <button
              type="button"
              className={s.dismiss}
              onClick={dismiss}
              aria-label="Dismiss message"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      </div>

      {loading && !data ? (
        <p role="status" className={ui.muted}>
          Loading history…
        </p>
      ) : error ? (
        <Card>
          <div role="alert" className={ui.stack}>
            <h2 className={s.errorTitle}>Could not read your history</h2>
            <p className={ui.muted}>{error.message}</p>
            <div>
              <Button variant="primary" onClick={reload}>
                Try again
              </Button>
            </div>
          </div>
        </Card>
      ) : !hasAttempts ? (
        <Card>
          <EmptyState
            title="No attempts yet"
            action={
              <div className={s.emptyActions}>
                <LinkButton variant="primary" href={href('/new')}>
                  Start a paper
                </LinkButton>
              </div>
            }
          >
            Finish a full-length paper or a practice test and it will be listed here with its score,
            time and a question-by-question review. Have a backup from another device? Use Import
            history above.
          </EmptyState>
        </Card>
      ) : (
        <>
          <Overview attempts={shown} />
          <AttemptTable
            attempts={shown}
            onDeleted={handleDeleted}
            onError={(text) => say('error', text)}
          />
          <Callout>
            {app
              ? 'History is stored in this app only. Export it regularly if you clear its storage or switch devices.'
              : 'History is stored in this browser only. Export it regularly if you clear site data or switch devices.'}
          </Callout>
        </>
      )}
    </div>
  );
}

function Overview({ attempts }: { attempts: readonly AttemptSummary[] }) {
  const percents = attempts.map((a) => finite(a.percent));
  const best = percents.length ? Math.max(...percents) : 0;
  const average = percents.length ? percents.reduce((sum, p) => sum + p, 0) / percents.length : 0;
  const time = attempts.reduce((sum, a) => sum + finite(a.elapsedMs), 0);
  const answered = attempts.reduce((sum, a) => sum + finite(a.attempted), 0);
  return (
    <div className={`${ui.card} ${s.overview}`}>
      <Stat label="Attempts" value={attempts.length.toLocaleString()} />
      <Stat label="Best score" value={formatPercent(best)} />
      <Stat label="Average" value={formatPercent(average)} />
      <Stat label="Questions answered" value={answered.toLocaleString()} />
      <Stat label="Time practised" value={formatDuration(time)} />
    </div>
  );
}

function AttemptTable({
  attempts,
  onDeleted,
  onError,
}: {
  attempts: readonly AttemptSummary[];
  onDeleted: (attempt: AttemptSummary) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className={s.tableCard}>
      <table className={s.table}>
        <caption className="visually-hidden">Finished attempts, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Paper</th>
            <th scope="col">Mode</th>
            <th scope="col" className={s.scoreHead}>
              Score
            </th>
            <th scope="col">Percent</th>
            <th scope="col">Time used</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <AttemptRow key={a.id} attempt={a} onDeleted={onDeleted} onError={onError} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttemptRow({
  attempt: a,
  onDeleted,
  onError,
}: {
  attempt: AttemptSummary;
  onDeleted: (attempt: AttemptSummary) => void;
  onError: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const actionsRef = useRef<HTMLTableCellElement>(null);
  const restoreFocus = useRef(false);
  const title = a.title || 'Untitled paper';
  const finishedAt = finite(a.finishedAt);
  // A missing or out-of-range time (e.g. a hand-edited backup) must not show as 1 Jan 1970 or "Invalid Date".
  const iso = finishedAt > 0 ? isoDate(finishedAt) : undefined;
  const when = iso ? formatDate(finishedAt) : 'Unknown date';
  const percent = finite(a.percent);
  const elapsed = finite(a.elapsedMs);
  const duration = finite(a.durationMs);
  const resultHref = href(`/result/${encodeURIComponent(a.id)}`);
  const reviewHref = href(`/review/${encodeURIComponent(a.id)}`);

  // Leaving the confirmation unmounts the focused button: hand focus back to "Delete".
  useEffect(() => {
    if (!confirming && restoreFocus.current) {
      restoreFocus.current = false;
      actionsRef.current?.querySelector<HTMLButtonElement>('[data-action="delete"]')?.focus();
    }
  }, [confirming]);

  const cancel = () => {
    restoreFocus.current = true;
    setConfirming(false);
  };

  const onConfirmKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !deleting) {
      event.stopPropagation();
      cancel();
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteAttempt(a.id);
      onDeleted(a);
    } catch (e) {
      setDeleting(false);
      cancel();
      onError(`Could not delete the attempt: ${errorMessage(e)}`);
    }
  };

  return (
    <tr className={s.row}>
      <td className={s.date}>{iso ? <time dateTime={iso}>{when}</time> : when}</td>
      <td className={s.paper}>
        <a href={resultHref} className={s.paperTitle}>
          {title}
        </a>
        <span className={s.paperMeta}>
          <code className={s.code}>{a.paperCode}</code>
          <span>{examTypeName(a.examType)}</span>
        </span>
      </td>
      <td data-label="Mode">
        <span className={s.badges}>
          <Badge tone={a.mode === 'practice' ? 'info' : 'neutral'}>
            {a.mode === 'practice' ? 'Practice' : 'Exam'}
          </Badge>
          {a.finishReason === 'timeout' ? <Badge tone="warning">Timed out</Badge> : null}
        </span>
      </td>
      <td data-label="Score" className={s.score}>
        <strong>{finite(a.score)}</strong>
        <span className={ui.muted}> / {finite(a.maxScore)}</span>
      </td>
      <td data-label="Percent" className={s.percent}>
        <span className={s.percentValue}>{formatPercent(percent)}</span>
        <span className={s.percentBar}>
          <ProgressBar value={percent} label={`Score ${formatPercent(percent)}`} />
        </span>
      </td>
      <td data-label="Time used" className={s.time}>
        <span className={s.nowrap}>{formatDuration(elapsed)}</span>
        {duration ? (
          <span className={`${ui.muted} ${s.nowrap}`}> of {formatDuration(duration)}</span>
        ) : null}
      </td>
      <td className={s.actions} ref={actionsRef}>
        {confirming ? (
          <span
            className={s.confirm}
            role="group"
            aria-label={`Confirm deleting ${title}`}
            onKeyDown={onConfirmKey}
          >
            <span className={s.confirmText}>Delete permanently?</span>
            <Button
              autoFocus
              variant="danger"
              size="sm"
              className={s.action}
              onClick={remove}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={s.action}
              onClick={cancel}
              disabled={deleting}
            >
              Cancel
            </Button>
          </span>
        ) : (
          <span className={s.actionButtons}>
            <LinkButton
              size="sm"
              className={s.action}
              href={resultHref}
              aria-label={`Result of ${title}, ${when}`}
            >
              Result
            </LinkButton>
            <LinkButton
              size="sm"
              className={s.action}
              href={reviewHref}
              aria-label={`Review ${title}, ${when}`}
            >
              Review
            </LinkButton>
            <Button
              size="sm"
              variant="ghost"
              className={`${s.action} ${s.deleteButton}`}
              data-action="delete"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${title}, ${when}`}
            >
              Delete
            </Button>
          </span>
        )}
      </td>
    </tr>
  );
}
