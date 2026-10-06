import { type ReactNode, type RefObject, useId, useLayoutEffect, useRef, useState } from 'react';
import s from './charts.module.css';

/**
 * Small, dependency-free chart components.
 *
 * - Colours come from the theme's CSS variables, so every chart follows light/dark mode.
 * - SVG charts measure their container and redraw at its real width, so labels stay
 *   legible on a 360px phone instead of being scaled down.
 * - Each chart carries a `<title>`/`<desc>` and a text alternative (summary sentence
 *   and/or a collapsible data table), because a picture alone is not accessible.
 */

/**
 * Series colours, in order. Each keeps at least 3:1 contrast against the surface in both
 * themes (the yellow accent does not, so it is left out); series also differ by marker shape.
 */
const SERIES_COLORS = [
  'var(--primary)',
  'var(--purple)',
  'var(--warning)',
  'var(--success)',
  'var(--danger)',
  'var(--text-2)',
] as const;

const seriesColor = (index: number): string =>
  SERIES_COLORS[index % SERIES_COLORS.length] ?? 'var(--primary)';

type Marker = 'circle' | 'square' | 'diamond' | 'triangle';
const MARKERS: readonly Marker[] = ['circle', 'square', 'diamond', 'triangle'];

/**
 * Width of an element, tracked with ResizeObserver (falls back to `initial` where unsupported).
 * Measured in a layout effect so the first paint already uses the real width.
 */
function useElementWidth<T extends HTMLElement>(initial = 640): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.round(w));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function MarkerShape({
  shape,
  x,
  y,
  r,
  color,
}: {
  shape: Marker;
  x: number;
  y: number;
  r: number;
  color: string;
}) {
  switch (shape) {
    case 'square':
      return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} fill={color} />;
    case 'diamond':
      return (
        <polygon
          points={`${x},${y - r * 1.3} ${x + r * 1.3},${y} ${x},${y + r * 1.3} ${x - r * 1.3},${y}`}
          fill={color}
        />
      );
    case 'triangle':
      return (
        <polygon
          points={`${x},${y - r * 1.3} ${x + r * 1.2},${y + r} ${x - r * 1.2},${y + r}`}
          fill={color}
        />
      );
    default:
      return <circle cx={x} cy={y} r={r} fill={color} />;
  }
}

/** Legend swatch matching a series' line colour and marker shape. */
function LegendKey({ index }: { index: number }) {
  const color = seriesColor(index);
  return (
    <svg
      className={s.legendKey}
      width="22"
      height="12"
      viewBox="0 0 22 12"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="1" y1="6" x2="21" y2="6" stroke={color} strokeWidth="2.5" />
      <MarkerShape
        shape={MARKERS[index % MARKERS.length] ?? 'circle'}
        x={11}
        y={6}
        r={3.5}
        color={color}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ line chart */

export interface LinePoint {
  /** Position on the x axis (e.g. attempt number). */
  x: number;
  y: number;
  /** Extra detail for the tooltip and the data table's Details column, e.g. `12 Oct · Mock 3`. */
  label?: string;
}

export interface LineSeries {
  id: string;
  label: string;
  points: readonly LinePoint[];
}

export interface LineChartProps {
  title: string;
  /** One-sentence description (used for `<desc>` and shown under the chart). */
  description: string;
  series: readonly LineSeries[];
  yMin?: number;
  yMax?: number;
  /** Formats y values for ticks and the data table. */
  formatY?: (y: number) => string;
  /** Formats x values for ticks and the data table. */
  formatX?: (x: number) => string;
  /** Axis title under the chart; also the x column heading of the data table. */
  xLabel?: string;
  /** What the y values measure, e.g. `Score (%)`; the value column heading of the data table. */
  yLabel?: string;
  height?: number;
  /** Optional dashed horizontal reference line. */
  reference?: { y: number; label: string };
}

/** Data-table rows of a line chart: in x order (then series order), so the table reads chronologically. */
function lineTableRows(
  series: readonly LineSeries[],
  formatX: (x: number) => string,
  formatY: (y: number) => string,
  withDetails: boolean,
): string[][] {
  return series
    .flatMap((se, order) => se.points.map((p) => ({ se, order, p })))
    .sort((a, b) => a.p.x - b.p.x || a.order - b.order)
    .map(({ se, p }) => {
      const row = [se.label, formatX(p.x), formatY(p.y)];
      return withDetails ? [...row, p.label ?? ''] : row;
    });
}

const niceTicks = (min: number, max: number, count: number): number[] => {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
};

/** Multi-series line chart with point markers, legend and a data-table alternative. */
export function LineChart({
  title,
  description,
  series,
  yMin = 0,
  yMax = 100,
  formatY = (y) => `${Math.round(y)}%`,
  formatX = (x) => String(x),
  xLabel,
  yLabel,
  height = 240,
  reference,
}: LineChartProps) {
  const id = useId();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const allPoints = series.flatMap((se) => se.points);
  const compact = width < 480;

  const pad = {
    top: 14,
    right: compact ? 12 : 20,
    bottom: xLabel ? 42 : 28,
    left: compact ? 38 : 46,
  };
  const innerW = Math.max(40, width - pad.left - pad.right);
  const innerH = Math.max(40, height - pad.top - pad.bottom);
  const xs = allPoints.map((p) => p.x);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const xSpan = xMax - xMin;
  const sx = (x: number) => pad.left + (xSpan === 0 ? innerW / 2 : ((x - xMin) / xSpan) * innerW);
  const sy = (y: number) =>
    pad.top + innerH - ((Math.min(yMax, Math.max(yMin, y)) - yMin) / (yMax - yMin || 1)) * innerH;

  const yTicks = niceTicks(yMin, yMax, 4);
  const distinctX = [...new Set(xs)].sort((a, b) => a - b);
  const maxXTicks = Math.max(2, Math.floor(innerW / (compact ? 42 : 56)));
  const xStep = Math.max(1, Math.ceil(distinctX.length / maxXTicks));
  const xTicks = distinctX.filter((_, i) => i % xStep === 0 || i === distinctX.length - 1);
  const r = compact ? 3.5 : 4;
  const withDetails = allPoints.some((p) => p.label);

  return (
    <div className={s.chart}>
      <figure className={s.figure}>
        <div ref={ref} className={s.canvas}>
          {allPoints.length === 0 ? (
            <p className={s.noData}>No data to plot yet.</p>
          ) : (
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-labelledby={`${id}-t`}
              aria-describedby={`${id}-d`}
              className={s.svg}
            >
              <title id={`${id}-t`}>{title}</title>
              <desc id={`${id}-d`}>{description}</desc>
              <g aria-hidden="true">
                {yTicks.map((t) => (
                  <g key={t}>
                    <line
                      x1={pad.left}
                      x2={pad.left + innerW}
                      y1={sy(t)}
                      y2={sy(t)}
                      className={s.grid}
                    />
                    <text
                      x={pad.left - 6}
                      y={sy(t)}
                      className={s.tick}
                      textAnchor="end"
                      dominantBaseline="middle"
                    >
                      {formatY(t)}
                    </text>
                  </g>
                ))}
                {xTicks.map((t) => (
                  <text
                    key={t}
                    x={sx(t)}
                    y={pad.top + innerH + 16}
                    className={s.tick}
                    textAnchor="middle"
                  >
                    {formatX(t)}
                  </text>
                ))}
                {xLabel ? (
                  <text
                    x={pad.left + innerW / 2}
                    y={height - 6}
                    className={s.axisLabel}
                    textAnchor="middle"
                  >
                    {xLabel}
                  </text>
                ) : null}
                {reference ? (
                  <g>
                    <line
                      x1={pad.left}
                      x2={pad.left + innerW}
                      y1={sy(reference.y)}
                      y2={sy(reference.y)}
                      className={s.reference}
                    />
                    <text
                      x={pad.left + innerW}
                      y={sy(reference.y) - 5}
                      className={s.referenceLabel}
                      textAnchor="end"
                    >
                      {reference.label}
                    </text>
                  </g>
                ) : null}
              </g>
              {series.map((se, si) => {
                const color = seriesColor(si);
                const shape = MARKERS[si % MARKERS.length] ?? 'circle';
                const pts = [...se.points].sort((a, b) => a.x - b.x);
                const d = pts
                  .map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
                  .join(' ');
                return (
                  <g key={se.id} data-series={se.id}>
                    {pts.length > 1 ? (
                      <path
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth={2.25}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ) : null}
                    {pts.map((p, i) => (
                      <g key={`${p.x}-${i}`} className={s.point}>
                        <title>{`${se.label} · ${formatX(p.x)}${p.label ? ` · ${p.label}` : ''}: ${formatY(p.y)}`}</title>
                        <circle cx={sx(p.x)} cy={sy(p.y)} r={r + 6} fill="transparent" />
                        <MarkerShape shape={shape} x={sx(p.x)} y={sy(p.y)} r={r} color={color} />
                      </g>
                    ))}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        {series.length > 1 ? (
          <ul className={s.legend} aria-label="Legend">
            {series.map((se, si) => (
              <li key={se.id}>
                <LegendKey index={si} />
                {se.label}
              </li>
            ))}
          </ul>
        ) : null}
        <figcaption className={s.caption}>
          {description}
          {yLabel ? <span className="visually-hidden"> Vertical axis: {yLabel}.</span> : null}
        </figcaption>
      </figure>
      {allPoints.length ? (
        <DataTable
          caption={`${title} — data`}
          columns={[
            'Series',
            xLabel ?? 'X',
            yLabel ?? 'Value',
            ...(withDetails ? ['Details'] : []),
          ]}
          rows={lineTableRows(series, formatX, formatY, withDetails)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ bar list */

export interface BarDatum {
  key: string;
  label: ReactNode;
  /** Plain-text label for the accessible summary. */
  text: string;
  /** Value on the 0..max scale; null means "no data" (an empty track is drawn). */
  value: number | null;
  /** Displayed value, e.g. `72%` or `48s`. */
  display: string;
  /** Secondary line, e.g. `36 of 50 correct`. */
  hint?: ReactNode;
  /** Colour override; defaults to the ink colour (or the quality scale, see `scale`). */
  color?: string;
}

export interface BarChartProps {
  title: string;
  data: readonly BarDatum[];
  max?: number;
  /** Optional marker line (e.g. the NET pace), drawn on every track. */
  marker?: { value: number; label: string };
  /** `quality` colours percentages where higher is better green / amber / red. */
  scale?: 'quality' | 'neutral';
  emptyText?: string;
}

/** Colour for a 0-100 percentage where higher is better. */
function qualityColor(percent: number): string {
  return percent >= 70 ? 'var(--success)' : percent >= 45 ? 'var(--warning)' : 'var(--danger)';
}

/**
 * Horizontal bars as an HTML list: wraps cleanly at any width and is read naturally
 * by screen readers (each item announces its label and value).
 */
export function BarChart({
  title,
  data,
  max = 100,
  marker,
  scale = 'neutral',
  emptyText = 'No data yet.',
}: BarChartProps) {
  if (!data.length) return <p className={s.noData}>{emptyText}</p>;
  const clamp = (v: number) => Math.max(0, Math.min(100, (v / (max || 1)) * 100));
  return (
    <figure className={s.figure}>
      <ul className={s.bars} aria-label={title}>
        {data.map((d) => {
          const width = d.value === null ? 0 : clamp(d.value);
          const color =
            d.color ??
            (scale === 'quality' && d.value !== null ? qualityColor(d.value) : 'var(--primary)');
          return (
            <li key={d.key} className={s.bar}>
              <div className={s.barHead}>
                <span className={s.barLabel}>{d.label}</span>
                <span className={s.barValue}>{d.display}</span>
              </div>
              <div className={s.track} aria-hidden="true">
                <div className={s.fill} style={{ width: `${width}%`, background: color }} />
                {marker ? (
                  <div className={s.marker} style={{ left: `${clamp(marker.value)}%` }} />
                ) : null}
              </div>
              {d.hint ? <div className={s.barHint}>{d.hint}</div> : null}
            </li>
          );
        })}
      </ul>
      {marker ? (
        <figcaption className={s.caption}>
          <span className={s.markerKey} aria-hidden="true" /> {marker.label}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* ------------------------------------------------------------------ donut */

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Proportion donut with a centre label and a text legend (which doubles as the text alternative). */
export function Donut({
  title,
  slices,
  centre,
  centreHint,
  size = 132,
}: {
  title: string;
  slices: readonly DonutSlice[];
  centre: string;
  centreHint?: string;
  size?: number;
}) {
  const id = useId();
  const total = slices.reduce((sum, sl) => sum + Math.max(0, sl.value), 0);
  const stroke = Math.round(size * 0.14);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const summary = total
    ? slices
        .map(
          (sl) =>
            `${sl.label} ${sl.value.toLocaleString()} (${Math.round((sl.value / total) * 100)}%)`,
        )
        .join(', ')
    : 'No data';
  return (
    <figure className={s.donutFigure}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-d`}
        className={s.donut}
      >
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{summary}</desc>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={s.donutTrack}
          strokeWidth={stroke}
        />
        {total
          ? slices.map((sl) => {
              const len = (Math.max(0, sl.value) / total) * circumference;
              const el = (
                <circle
                  key={sl.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={sl.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += len;
              return el;
            })
          : null}
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          dominantBaseline="middle"
          className={s.donutCentre}
          aria-hidden="true"
        >
          {centre}
        </text>
        {centreHint ? (
          <text
            x="50%"
            y="64%"
            textAnchor="middle"
            dominantBaseline="middle"
            className={s.donutHint}
            aria-hidden="true"
          >
            {centreHint}
          </text>
        ) : null}
      </svg>
      <ul className={s.donutLegend}>
        {slices.map((sl) => (
          <li key={sl.key}>
            <span className={s.swatch} style={{ background: sl.color }} aria-hidden="true" />
            <span>{sl.label}</span>
            <strong>{sl.value.toLocaleString()}</strong>
            <span className={s.legendPct}>
              {total ? `${Math.round((sl.value / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ------------------------------------------------------------------ sparkline */

/** Tiny trend line for table cells. Decorative unless `label` is given. */
export function Sparkline({
  values,
  label,
  width = 64,
  height = 20,
  min = 0,
  max = 100,
}: {
  values: readonly number[];
  label?: string;
  width?: number;
  height?: number;
  min?: number;
  max?: number;
}) {
  if (values.length < 2) return null;
  const step = (width - 4) / (values.length - 1);
  const y = (v: number) =>
    2 + (height - 4) * (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min || 1));
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${(2 + i * step).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ');
  const last = values.at(-1) ?? 0;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={s.spark}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      focusable="false"
    >
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={2 + (values.length - 1) * step} cy={y(last)} r="2.25" fill="var(--primary)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ data table */

/** Collapsible table of a chart's data, the text alternative for sighted and AT users alike. */
export function DataTable({
  caption,
  columns,
  rows,
  summaryText = 'Show data table',
}: {
  caption: string;
  columns: readonly string[];
  rows: ReadonlyArray<readonly ReactNode[]>;
  summaryText?: string;
}) {
  return (
    <details className={s.details}>
      <summary>{summaryText}</summary>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
