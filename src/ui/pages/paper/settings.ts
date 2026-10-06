/**
 * Print settings of the paper page. They live in the page's URL query so a link
 * reproduces exactly what was printed (e.g. `...?solutions=1&size=l`). Only values
 * that differ from the defaults are written.
 */

export type FontSize = 'small' | 'medium' | 'large';

export interface PrintSettings {
  /** OMR-style bubble sheet after the questions. */
  answerSheet: boolean;
  /** Question -> letter table. */
  answerKey: boolean;
  /** Worked solutions (explanations) at the end. */
  solutions: boolean;
  /** Lay options out side by side (two per row; four when they are very short). */
  twoColumnOptions: boolean;
  fontSize: FontSize;
}

export const DEFAULT_PRINT_SETTINGS: Readonly<PrintSettings> = {
  answerSheet: true,
  answerKey: true,
  solutions: false,
  twoColumnOptions: true,
  fontSize: 'medium',
};

/** Body text size of the printed paper for each setting. */
export const FONT_SIZE_PT: Readonly<Record<FontSize, number>> = {
  small: 9.5,
  medium: 10.5,
  large: 12,
};

export const FONT_SIZE_LABEL: Readonly<Record<FontSize, string>> = {
  small: 'Small',
  medium: 'Normal',
  large: 'Large',
};

const SIZE_CODE: Readonly<Record<FontSize, string>> = { small: 's', medium: 'm', large: 'l' };

/** Query keys owned by the print settings (everything else in the query is preserved). */
export const PRINT_SETTING_KEYS = ['omr', 'key', 'solutions', 'cols', 'size'] as const;

const flag = (value: string | null, fallback: boolean): boolean => {
  if (value === null) return fallback;
  const v = value.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return fallback;
};

function fontSizeFrom(value: string | null): FontSize {
  const v = (value ?? '').trim().toLowerCase();
  const match = (Object.keys(SIZE_CODE) as FontSize[]).find(
    (size) => v === size || v === SIZE_CODE[size],
  );
  return match ?? DEFAULT_PRINT_SETTINGS.fontSize;
}

/** Reads settings from the page query; unknown or malformed values fall back to defaults. */
export function settingsFromQuery(query: URLSearchParams): PrintSettings {
  const d = DEFAULT_PRINT_SETTINGS;
  const cols = query.get('cols');
  return {
    answerSheet: flag(query.get('omr'), d.answerSheet),
    answerKey: flag(query.get('key'), d.answerKey),
    solutions: flag(query.get('solutions'), d.solutions),
    twoColumnOptions: cols === null ? d.twoColumnOptions : cols.trim() !== '1',
    fontSize: fontSizeFrom(query.get('size')),
  };
}

/** Writes `settings` into `query` (in place), removing keys that hold default values. */
export function settingsToQuery(settings: PrintSettings, query: URLSearchParams): URLSearchParams {
  const d = DEFAULT_PRINT_SETTINGS;
  const put = (key: string, value: string | null) =>
    value === null ? query.delete(key) : query.set(key, value);
  put('omr', settings.answerSheet === d.answerSheet ? null : settings.answerSheet ? '1' : '0');
  put('key', settings.answerKey === d.answerKey ? null : settings.answerKey ? '1' : '0');
  put('solutions', settings.solutions === d.solutions ? null : settings.solutions ? '1' : '0');
  put(
    'cols',
    settings.twoColumnOptions === d.twoColumnOptions ? null : settings.twoColumnOptions ? '2' : '1',
  );
  put('size', settings.fontSize === d.fontSize ? null : SIZE_CODE[settings.fontSize]);
  return query;
}

/**
 * Rewrites the query part of the current `#/...?query` URL without a `hashchange`
 * event (the router would otherwise remount the page and regenerate the paper).
 */
export function replaceHashQuery(update: (query: URLSearchParams) => void): void {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  const path = cut === -1 ? raw : raw.slice(0, cut);
  const query = new URLSearchParams(cut === -1 ? '' : raw.slice(cut + 1));
  const before = query.toString();
  update(query);
  const after = query.toString();
  if (after === before) return;
  try {
    window.history.replaceState(window.history.state, '', `#${path}${after ? `?${after}` : ''}`);
  } catch {
    // Some sandboxed contexts forbid history changes; the settings still apply.
  }
}
