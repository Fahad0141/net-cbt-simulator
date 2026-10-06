import { local } from '@/storage/kv';

/**
 * HSSC / SSC results for the NUST aggregate estimator, remembered on this device
 * (`localStorage['net-cbt:academics']`) so every result page can reuse them.
 *
 * Stored shape: `{ hssc, ssc }` as percentages (or null), plus the text the user
 * typed (`hsscInput`, `sscInput`) so marks such as `1012/1100` survive a reload.
 */
export const ACADEMICS_KEY = 'net-cbt:academics';

export interface AcademicsInputs {
  hssc: string;
  ssc: string;
}

interface StoredAcademics {
  hssc?: unknown;
  ssc?: unknown;
  hsscInput?: unknown;
  sscInput?: unknown;
}

function storedText(input: unknown, value: unknown): string {
  if (typeof input === 'string') return input.slice(0, 32);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value.slice(0, 32);
  return '';
}

export function loadAcademics(): AcademicsInputs {
  const raw = local.get<StoredAcademics>(ACADEMICS_KEY);
  if (!raw || typeof raw !== 'object') return { hssc: '', ssc: '' };
  return { hssc: storedText(raw.hsscInput, raw.hssc), ssc: storedText(raw.sscInput, raw.ssc) };
}

export function saveAcademics(inputs: AcademicsInputs): void {
  const hssc = parsePercentInput(inputs.hssc).value;
  const ssc = parsePercentInput(inputs.ssc).value;
  if (!inputs.hssc.trim() && !inputs.ssc.trim()) {
    local.remove(ACADEMICS_KEY);
    return;
  }
  local.set(ACADEMICS_KEY, { hssc, ssc, hsscInput: inputs.hssc, sscInput: inputs.ssc });
}

export interface ParsedPercent {
  /** Percentage 0-100 (2 decimals), or null when empty / invalid. */
  value: number | null;
  /** Why the input is invalid (null when empty or valid). */
  error: string | null;
}

const NUMBER = String.raw`\d+(?:\.\d+)?|\.\d+`;
const PERCENT_RE = new RegExp(`^(${NUMBER})\\s*%?$`);
const MARKS_RE = new RegExp(`^(${NUMBER})\\s*/\\s*(${NUMBER})$`);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Accepts a percentage (`88.5`, `88.5%`) or marks (`968/1100`). */
export function parsePercentInput(raw: string): ParsedPercent {
  const text = raw.trim();
  if (!text) return { value: null, error: null };
  const marks = MARKS_RE.exec(text);
  if (marks) {
    const obtained = Number(marks[1]);
    const total = Number(marks[2]);
    if (!(total > 0)) return { value: null, error: 'Total marks must be more than zero.' };
    if (obtained > total) {
      return { value: null, error: 'Marks obtained cannot be more than the total.' };
    }
    return { value: round2((obtained / total) * 100), error: null };
  }
  const percent = PERCENT_RE.exec(text);
  if (percent) {
    const value = Number(percent[1]);
    if (value > 100) return { value: null, error: 'A percentage cannot be more than 100.' };
    return { value: round2(value), error: null };
  }
  return { value: null, error: 'Enter a percentage such as 88.5, or marks such as 968/1100.' };
}
