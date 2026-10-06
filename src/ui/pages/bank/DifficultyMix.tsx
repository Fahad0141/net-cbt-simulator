import { DIFFICULTIES, DIFFICULTY_LABEL, type Mix, shares } from './model';
import s from './bank.module.css';

const LEVEL_CLASS = { 1: s.level1, 2: s.level2, 3: s.level3 } as const;

/**
 * Part-to-whole bar of easy / medium / hard templates. Difficulty is ordinal, so it
 * uses one hue in three lightness steps; the legend carries every value as text
 * (the bar itself is decorative for assistive technology).
 */
export function DifficultyMix({
  mix,
  target,
}: {
  mix: Mix;
  target?: readonly [number, number, number];
}) {
  const counts = mix.difficulty;
  const total = counts[0] + counts[1] + counts[2];
  const pct = shares(counts);
  const targetPct = target ? shares(target.map((v) => Math.round(v * 1000))) : null;

  return (
    <div className={s.mix}>
      <div className={s.mixBar} aria-hidden="true">
        {total > 0
          ? DIFFICULTIES.map((d, i) =>
              counts[i] > 0 ? (
                <span
                  key={d}
                  className={`${s.mixSegment} ${LEVEL_CLASS[d]}`}
                  style={{ flexGrow: counts[i] }}
                  title={`${DIFFICULTY_LABEL[d]}: ${counts[i]} (${pct[i]}%)`}
                />
              ) : null,
            )
          : null}
      </div>
      <ul className={s.legend} aria-label="Templates by difficulty">
        {DIFFICULTIES.map((d, i) => (
          <li key={d} className={s.legendItem}>
            <span className={`${s.swatch} ${LEVEL_CLASS[d]}`} aria-hidden="true" />
            <span>{DIFFICULTY_LABEL[d]}</span>
            <span className={s.legendValue}>{counts[i]}</span>
            <span className={s.legendShare}>{pct[i]}%</span>
          </li>
        ))}
      </ul>
      {targetPct ? (
        <p className={s.note}>
          Generated papers aim for {targetPct[0]}% easy, {targetPct[1]}% medium and {targetPct[2]}%
          hard questions; parametric templates can be reused with fresh values to fill the mix.
        </p>
      ) : null}
    </div>
  );
}
