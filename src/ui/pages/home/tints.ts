/**
 * Share of `--primary` (mixed in OKLab with `--surface`) for section `index` of `count`,
 * evenly spaced from 100% down to 43%.
 *
 * The end points were validated as an ordinal ramp (monotone lightness, adjacent
 * OKLab ΔL ≥ 0.06, lightest step ≥ 2:1 against the card surface) for every section
 * count from 2 to 5, in both the light and the dark theme tokens.
 */
export function sectionTint(index: number, count: number): string {
  if (count <= 1) return '100%';
  const clamped = Math.min(Math.max(index, 0), count - 1);
  return `${Math.round(100 - (clamped * (100 - 43)) / (count - 1))}%`;
}
