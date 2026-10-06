import s from './ProgressSection.module.css';

interface SparklineProps {
  /** Percentages (0-100), oldest first. */
  values: readonly number[];
  /** Text alternative: the values in words. */
  label: string;
  width?: number;
  height?: number;
}

/** Tiny single-series trend line. The y-range hugs the data but never spans fewer than 20 points. */
export function Sparkline({ values, label, width = 132, height = 34 }: SparklineProps) {
  if (values.length < 2) return null;
  const pad = 5;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(20, high - low);
  const mid = (low + high) / 2;
  const floor = Math.max(0, Math.min(100 - span, mid - span / 2));
  const x = (i: number) => pad + (i * (width - 2 * pad)) / (values.length - 1);
  const y = (v: number) =>
    pad + (1 - (Math.min(100, Math.max(0, v)) - floor) / span) * (height - 2 * pad);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;

  return (
    <svg
      className={s.sparkline}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
    >
      <polyline
        className={s.sparkArea}
        points={`${x(0)},${height} ${points} ${x(last)},${height}`}
      />
      <polyline className={s.sparkLine} points={points} />
      <circle className={s.sparkDot} cx={x(last)} cy={y(values[last] ?? 0)} r={4} />
    </svg>
  );
}
