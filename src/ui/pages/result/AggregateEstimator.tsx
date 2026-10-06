import { useId, useState } from 'react';
import { nustAggregate } from '@/exam/scoring';
import { Card, ui } from '@/ui/components/ui';
import { type AcademicsInputs, loadAcademics, parsePercentInput, saveAcademics } from './academics';
import { formatPercent } from './format';
import s from './result.module.css';

const fixed2 = (n: number) => n.toFixed(2);

function PercentField({
  label,
  hint,
  value,
  onChange,
  error,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={ui.field}>
      <label className={ui.fieldLabel} htmlFor={id}>
        {label}
      </label>
      {/* No inputMode: phone number pads have no "/" for marks such as 968/1100. */}
      <input
        id={id}
        className={ui.input}
        type="text"
        autoComplete="off"
        spellCheck={false}
        maxLength={32}
        placeholder="e.g. 88.5 or 968/1100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${errorId} ${hintId}` : hintId}
      />
      {error ? (
        <span id={errorId} className={s.fieldError}>
          {error}
        </span>
      ) : null}
      <span id={hintId} className={ui.fieldHint}>
        {hint}
      </span>
    </div>
  );
}

/**
 * Estimates the NUST merit aggregate (NET 75%, HSSC 15%, SSC 10%) from this attempt.
 * HSSC / SSC entries are remembered on this device for every result.
 */
export function AggregateEstimator({
  netPercent,
  indicative,
}: {
  netPercent: number;
  /** The attempt is not a full-length paper of a current NET pattern. */
  indicative: boolean;
}) {
  const [inputs, setInputs] = useState<AcademicsInputs>(loadAcademics);
  const hssc = parsePercentInput(inputs.hssc);
  const ssc = parsePercentInput(inputs.ssc);

  const update = (patch: Partial<AcademicsInputs>) => {
    const next = { ...inputs, ...patch };
    setInputs(next);
    saveAcademics(next);
  };

  const aggregate =
    hssc.value !== null && ssc.value !== null
      ? nustAggregate(netPercent, hssc.value, ssc.value)
      : null;

  const rows = [
    { key: 'net', label: 'NET (this attempt)', percent: netPercent, weight: 0.75 },
    { key: 'hssc', label: 'HSSC / FSc', percent: hssc.value, weight: 0.15 },
    { key: 'ssc', label: 'SSC / Matric', percent: ssc.value, weight: 0.1 },
  ];

  return (
    <Card className={s.cq} title="NUST aggregate estimator">
      <div className={s.aggInputs}>
        <PercentField
          label="HSSC / FSc percentage"
          hint="Awaited? Use Part-I marks. A-level: IBCC equivalence."
          value={inputs.hssc}
          onChange={(text) => update({ hssc: text })}
          error={hssc.error}
        />
        <PercentField
          label="SSC / Matric percentage"
          hint="O-level: IBCC equivalence."
          value={inputs.ssc}
          onChange={(text) => update({ ssc: text })}
          error={ssc.error}
        />
      </div>

      <div className={s.aggResult} aria-live="polite" aria-atomic="true">
        {aggregate !== null ? (
          <>
            <span className={s.aggLabel}>Estimated aggregate</span>
            <span className={s.aggValue}>{fixed2(aggregate)}%</span>
          </>
        ) : (
          <span className={s.aggPending}>Enter your HSSC and SSC results to see it.</span>
        )}
      </div>

      <table className={s.aggTable}>
        <caption className="visually-hidden">How the aggregate is calculated</caption>
        <thead>
          <tr>
            <th scope="col">Component</th>
            <th scope="col" className={s.n}>
              Your %
            </th>
            <th scope="col" className={s.n}>
              Weight
            </th>
            <th scope="col" className={s.n}>
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td className={s.n}>{row.percent === null ? '—' : formatPercent(row.percent, 2)}</td>
              <td className={s.n}>&times; {formatPercent(row.weight * 100, 0)}</td>
              <td className={s.n}>
                {row.percent === null ? '—' : fixed2(row.percent * row.weight)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Aggregate</th>
            <td />
            <td className={s.n}>100%</td>
            <td className={s.n}>{aggregate === null ? '—' : fixed2(aggregate)}</td>
          </tr>
        </tfoot>
      </table>

      <p className={s.aggNote}>
        {indicative ? 'Not a full-length NET paper, so the NET part is only indicative. ' : ''}
        Unofficial. Compare only with NUST&apos;s official merit lists.
      </p>
    </Card>
  );
}
