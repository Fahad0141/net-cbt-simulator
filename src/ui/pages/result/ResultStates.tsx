import { isInstalledApp } from '@/platform/desktop';
import { Button, LinkButton, ui } from '@/ui/components/ui';
import { href } from '@/ui/router';
import s from './result.module.css';

export function ResultLoading() {
  return (
    <div className={ui.page}>
      <div className={s.state} role="status" aria-live="polite">
        <span className={s.spinner} aria-hidden="true" />
        <p className={s.stateText}>Loading result&hellip;</p>
      </div>
    </div>
  );
}

export function ResultError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={ui.page}>
      <div className={`${ui.card} ${s.state}`} role="alert">
        <h1 className={s.stateTitle}>Could not load this result</h1>
        <p className={s.stateText}>
          Your browser storage did not respond: <span className={s.mono}>{message}</span>
        </p>
        <div className={s.stateActions}>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
          <LinkButton href={href('/history')}>Back to history</LinkButton>
        </div>
      </div>
    </div>
  );
}

export function ResultNotFound() {
  return (
    <div className={ui.page}>
      <div className={`${ui.card} ${s.state}`}>
        <h1 className={s.stateTitle}>Result not found</h1>
        <p className={s.stateText}>
          {isInstalledApp()
            ? "This attempt is not saved in this app. Results are stored only on the device where the test was taken, and clearing the app's storage removes them. If you exported your history, import it from the History page."
            : 'This attempt is not saved in this browser. Results are stored only on the device where the test was taken, and clearing site data removes them. If you exported your history, import it from the History page.'}
        </p>
        <div className={s.stateActions}>
          <LinkButton variant="primary" href={href('/history')}>
            Go to history
          </LinkButton>
          <LinkButton href={href('/new')}>Start a new paper</LinkButton>
        </div>
      </div>
    </div>
  );
}

export function ResultDamaged({ id, message }: { id: string; message: string }) {
  return (
    <div className={ui.page}>
      <div className={`${ui.card} ${s.state}`} role="alert">
        <h1 className={s.stateTitle}>This result cannot be shown</h1>
        <p className={s.stateText}>
          The saved data for attempt <span className={s.mono}>{id}</span> is incomplete or from an
          incompatible version ({message}).
        </p>
        <div className={s.stateActions}>
          <LinkButton variant="primary" href={href('/history')}>
            Back to history
          </LinkButton>
          <LinkButton href={href('/new')}>Start a new paper</LinkButton>
        </div>
      </div>
    </div>
  );
}
