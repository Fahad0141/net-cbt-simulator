import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { examTypeById } from '@/config/exams';
import { generatePaper } from '@/exam/papers';
import { beginPaper } from '@/exam/start';
import { clearActiveSession, loadActiveSession } from '@/exam/store';
import { Button, Callout, PageHeader, ui } from '@/ui/components/ui';
import { navigate } from '@/ui/router';
import { AdvancedOptions } from './new-paper/AdvancedOptions';
import { nextPaint, readCandidateName, storeCandidateName } from './new-paper/browser';
import { ConfirmDialog } from './new-paper/ConfirmDialog';
import { CustomBuilder } from './new-paper/CustomBuilder';
import {
  type ActiveSessionInfo,
  CUSTOM,
  describeActiveSession,
  describeGenerationError,
  difficultyLabel,
  durationOf,
  examTypeLabel,
  type FormState,
  formatMinutes,
  formReducer,
  type Generation,
  initialForm,
  isLegacyType,
  LIMITS,
  modeLabel,
  paperKey,
  prepareRequest,
  questionCountOf,
} from './new-paper/model';
import { ModeStep } from './new-paper/ModeStep';
import { PaperSummary, START_BUTTON_ID } from './new-paper/PaperSummary';
import { Step } from './new-paper/Step';
import { ExamTypeDetails, TestTypeStep } from './new-paper/TestTypeStep';
import styles from './NewPaperPage.module.css';

const FORM_ID = 'new-paper-form';

/** Moves focus to the first field with a problem, or to `fallback` when none can take it. */
function focusFirstProblem(fallback: HTMLElement | null) {
  const target = document.querySelector<HTMLElement>(
    `#${FORM_ID} :is(input, select)[aria-invalid="true"], #${FORM_ID} [data-invalid]`,
  );
  (target ?? fallback)?.focus();
}

/** Puts focus where the candidate can change the test: the chosen test type, or the first custom section. */
function focusTestChoice(examType: string) {
  const target =
    examType === CUSTOM
      ? document.querySelector<HTMLElement>(`#${FORM_ID} input[id^="custom-"][id$="-count"]`)
      : document.querySelector<HTMLElement>(
          `#${FORM_ID} input[name="new-paper-test-type"]:checked`,
        );
  target?.focus();
}

export default function NewPaperPage({ query }: { query: URLSearchParams }) {
  const [init] = useState(() => initialForm(query, readCandidateName()));
  const [state, dispatch] = useReducer(formReducer, init.state);
  const [legacyOpen, setLegacyOpen] = useState(() => isLegacyType(init.state.examType));
  const [optionsOpen, setOptionsOpen] = useState(init.optionsOpen);
  const [showErrors, setShowErrors] = useState(false);
  const [gen, setGen] = useState<Generation>({ status: 'idle' });
  const [confirm, setConfirm] = useState<ActiveSessionInfo | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const token = useRef(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'New test · NET CBT Simulator';
  }, []);

  // Cancel a pending generation when the page goes away.
  useEffect(
    () => () => {
      token.current++;
    },
    [],
  );

  const key = useMemo(() => paperKey(state), [state]);
  const { errors } = useMemo(() => prepareRequest(state), [state]);
  const shownErrors = showErrors ? errors : null;
  const exam = examTypeById(state.examType);
  const questionCount = questionCountOf(state);
  const duration = durationOf(state);

  async function generate(form: FormState, focus: boolean) {
    const { prepared, errors: problems } = prepareRequest(form);
    if (!prepared) {
      setShowErrors(true);
      if (problems.seed) setOptionsOpen(true);
      // Wait for the messages to render, then take the candidate to the first one.
      setTimeout(() => focusFirstProblem(errorRef.current), 0);
      return;
    }
    const mine = ++token.current;
    setStartError(null);
    setGen({ status: 'loading', questionCount: prepared.questionCount });
    await nextPaint();
    if (mine !== token.current) return;
    try {
      const paper = await generatePaper(prepared.request);
      if (mine !== token.current) return;
      setGen({
        status: 'ready',
        paper,
        key: prepared.key,
        options: prepared.options,
        spec: prepared.spec,
        focus,
      });
    } catch (error) {
      if (mine !== token.current) return;
      setGen({
        status: 'error',
        info: describeGenerationError(error, form.examType),
        key: prepared.key,
        focus,
      });
    }
  }

  // Take the candidate to a generation failure they asked for, so it is read out and can be acted on.
  useEffect(() => {
    if (gen.status === 'error' && gen.focus) failureRef.current?.focus();
  }, [gen]);

  // A link that names a complete paper (?seed=...) builds it straight away.
  useEffect(() => {
    if (init.autoGenerate) void generate(init.state, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function newCode() {
    const next = formReducer(state, { kind: 'seedInput', value: '' });
    dispatch({ kind: 'seedInput', value: '' });
    void generate(next, true);
  }

  function launch() {
    if (gen.status !== 'ready') return;
    storeCandidateName(state.candidateName);
    try {
      clearActiveSession();
      beginPaper(gen.paper, {
        mode: state.mode,
        candidateName: state.candidateName,
        ...(gen.spec ? { durationMinutes: gen.spec.durationMinutes } : {}),
        ...(state.mode === 'practice' ? { instantFeedback: state.instantFeedback } : {}),
      });
      navigate('/exam');
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Could not start the test.');
    }
  }

  function start() {
    let active: ActiveSessionInfo | null = null;
    try {
      active = describeActiveSession(loadActiveSession(), Date.now());
    } catch {
      active = null;
    }
    if (active) setConfirm(active);
    else launch();
  }

  function closeConfirm() {
    setConfirm(null);
    setTimeout(() => document.getElementById(START_BUTTON_ID)?.focus(), 0);
  }

  const ready = gen.status === 'ready' && gen.key === key ? gen : null;
  const stale = gen.status === 'ready' && gen.key !== key;
  const failed = gen.status === 'error' && gen.key === key ? gen.info : null;
  const loading = gen.status === 'loading';

  const status = loading
    ? `Generating a ${gen.questionCount}-question paper…`
    : ready
      ? `Paper ${ready.paper.code} is ready.`
      : failed
        ? `${failed.title}. ${failed.suggestion}`
        : '';

  return (
    <div className={ui.page}>
      <PageHeader
        title="New test"
        subtitle="Set up a full-length NET or a custom test, generate a unique paper and sit it in the CBT terminal."
      />

      {init.notices.length ? (
        <Callout tone="warning">
          {init.notices.map((n) => (
            <p key={n} className={styles.notice}>
              {n}
            </p>
          ))}
        </Callout>
      ) : null}

      <div className={styles.layout}>
        <form
          id={FORM_ID}
          className={styles.form}
          aria-label="Test settings"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void generate(state, true);
          }}
        >
          <TestTypeStep
            value={state.examType}
            onChange={(value) => dispatch({ kind: 'examType', value })}
            legacyOpen={legacyOpen}
            onLegacyToggle={setLegacyOpen}
          >
            {state.examType === CUSTOM ? (
              <CustomBuilder
                draft={state.custom}
                errors={shownErrors?.custom}
                dispatch={dispatch}
              />
            ) : exam ? (
              <ExamTypeDetails exam={exam} />
            ) : null}
          </TestTypeStep>

          <ModeStep
            mode={state.mode}
            instantFeedback={state.instantFeedback}
            onMode={(value) => dispatch({ kind: 'mode', value })}
            onInstantFeedback={(value) => dispatch({ kind: 'instantFeedback', value })}
          />

          <Step
            id="step-candidate"
            number={3}
            title="Candidate and paper"
            description="Your name appears on the terminal and in your history. It stays on this device."
          >
            <div className={ui.field}>
              <label className={ui.fieldLabel} htmlFor="candidate-name">
                Candidate name <span className={styles.hint}>(optional)</span>
              </label>
              <input
                id="candidate-name"
                className={ui.input}
                type="text"
                autoComplete="name"
                maxLength={LIMITS.nameMax}
                placeholder="Candidate"
                value={state.candidateName}
                onChange={(e) => dispatch({ kind: 'candidateName', value: e.target.value })}
              />
            </div>
            <AdvancedOptions
              state={state}
              dispatch={dispatch}
              open={optionsOpen}
              onToggle={setOptionsOpen}
              showSeedError={showErrors}
            />
          </Step>
        </form>

        <aside className={styles.panel} aria-label="Your paper">
          <div className={ui.card}>
            <p className="visually-hidden" role="status" aria-live="polite">
              {status}
            </p>
            {ready ? (
              <PaperSummary
                paper={ready.paper}
                options={ready.options}
                spec={ready.spec}
                modeText={modeLabel(state)}
                focusHeading={ready.focus}
                onStart={start}
                onNewCode={newCode}
                startError={startError}
              />
            ) : (
              <div className={styles.summary}>
                <h2 id="panel-title" className={styles.panelTitle}>
                  Your paper
                </h2>
                <dl className={styles.recap}>
                  <dt>Test</dt>
                  <dd>
                    {state.examType === CUSTOM
                      ? state.custom.title.trim() || 'Custom test'
                      : examTypeLabel(state.examType)}
                  </dd>
                  <dt>Questions</dt>
                  <dd>{questionCount}</dd>
                  <dt>Time</dt>
                  <dd>{duration === null ? '—' : formatMinutes(duration)}</dd>
                  <dt>Mode</dt>
                  <dd>{modeLabel(state)}</dd>
                  <dt>Difficulty</dt>
                  <dd>{difficultyLabel(state)}</dd>
                </dl>

                {stale ? (
                  <Callout>
                    Your settings changed, so generate the paper again to see the updated version.
                  </Callout>
                ) : null}

                {shownErrors && shownErrors.count > 0 ? (
                  <p ref={errorRef} tabIndex={-1} className={styles.error} role="alert">
                    Fix{' '}
                    {shownErrors.count === 1
                      ? 'the highlighted problem'
                      : `the ${shownErrors.count} highlighted problems`}{' '}
                    before generating.
                  </p>
                ) : null}

                {failed ? (
                  <Callout tone="warning">
                    <div ref={failureRef} tabIndex={-1} className={styles.alert}>
                      <p>
                        <strong>{failed.title}</strong>
                      </p>
                      <p>{failed.message}</p>
                      <p>{failed.suggestion}</p>
                      {failed.bankShortage ? (
                        <div>
                          <Button
                            size="sm"
                            className={styles.tap}
                            onClick={() => focusTestChoice(state.examType)}
                          >
                            {state.examType === CUSTOM
                              ? 'Edit the sections'
                              : 'Choose another test'}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </Callout>
                ) : null}

                {loading ? (
                  <>
                    <div className={styles.working} aria-hidden="true" />
                    <p className={styles.workingText}>
                      Generating a {gen.questionCount}-question paper…
                    </p>
                  </>
                ) : null}

                {/* A submit button of the form, so Enter in any field generates the paper too. */}
                <Button
                  type="submit"
                  form={FORM_ID}
                  variant="primary"
                  size="lg"
                  className={styles.block}
                  disabled={loading}
                  aria-busy={loading || undefined}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner} aria-hidden="true" /> Generating…
                    </>
                  ) : failed ? (
                    'Try again'
                  ) : stale ? (
                    'Generate updated paper'
                  ) : (
                    'Generate paper'
                  )}
                </Button>
                <p className={styles.note}>
                  Every paper gets a code. The same code always rebuilds the same questions, so you
                  can share it or print it.
                </p>
              </div>
            )}
          </div>
          <p className={styles.note}>
            Unofficial practice tool. Not affiliated with or endorsed by NUST.
          </p>
        </aside>
      </div>

      {confirm ? (
        <ConfirmDialog
          info={confirm}
          onCancel={closeConfirm}
          onConfirm={() => {
            setConfirm(null);
            launch();
          }}
        />
      ) : null}
    </div>
  );
}
