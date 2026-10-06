import { type FormEvent, useId, useMemo, useRef, useState } from 'react';
import { Button, Card, ui } from '@/ui/components/ui';
import { navigate } from '@/ui/router';
import { IconCheck } from './icons';
import { checkPaperCode, EXAMPLE_PAPER_CODE, hasCustomSettings, paperCodePath } from './paperCode';
import s from './PaperCodeCard.module.css';

/** "Open a paper code" form: regenerates a shared or earlier paper from its code. */
export function PaperCodeCard() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const preview = useMemo(() => checkPaperCode(value), [value]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = checkPaperCode(value);
    if (!result.ok) {
      setError(result.message);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    navigate(paperCodePath(result));
  };

  return (
    <Card title="Open a paper code">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        <label className={ui.fieldLabel} htmlFor={inputId}>
          Paper code
        </label>
        <div className={s.row}>
          <input
            ref={inputRef}
            id={inputId}
            name="paper-code"
            className={`${ui.input} ${s.input}`}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            placeholder={EXAMPLE_PAPER_CODE}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          />
          <Button type="submit" variant="primary" className={s.submit}>
            Open paper
          </Button>
        </div>
        {error ? (
          <p id={errorId} className={s.error} role="alert">
            {error}
          </p>
        ) : null}
        <p id={hintId} className={s.hint}>
          {preview.ok ? (
            <span className={s.valid}>
              <IconCheck size={16} />
              <span>
                {preview.examName} <code className={s.code}>{preview.code}</code>
                {hasCustomSettings(preview) ? ' with the link’s generation settings' : null}
              </span>
            </span>
          ) : (
            <>
              Rebuilds the exact paper from a code or share link, like{' '}
              <code className={s.code}>{EXAMPLE_PAPER_CODE}</code>.
            </>
          )}
        </p>
      </form>
    </Card>
  );
}
