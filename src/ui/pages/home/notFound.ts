import { checkPaperCode, paperCodePath, type ResolvedPaperCode } from './paperCode';

export interface RouteSuggestion {
  path: string;
  label: string;
}

/** Pages a mistyped link most likely meant, with common alternative words. */
const ROUTES: ReadonlyArray<RouteSuggestion & { words: readonly string[] }> = [
  { path: '/', label: 'Dashboard', words: ['home', 'dashboard', 'index', 'start'] },
  {
    path: '/new',
    label: 'New paper',
    words: ['new', 'generate', 'create', 'test', 'mock', 'flp', 'paper', 'papers'],
  },
  {
    path: '/history',
    label: 'History',
    words: ['history', 'attempts', 'results', 'result', 'scores', 'review'],
  },
  {
    path: '/analytics',
    label: 'Analytics',
    words: ['analytics', 'stats', 'statistics', 'progress', 'insights'],
  },
  {
    path: '/bank',
    label: 'Question bank',
    words: ['bank', 'questions', 'question', 'syllabus', 'topics'],
  },
  { path: '/about', label: 'About', words: ['about', 'help', 'faq', 'pattern', 'disclaimer'] },
  { path: '/exam', label: 'Exam terminal', words: ['exam', 'cbt', 'terminal', 'resume'] },
];

/** Levenshtein distance, capped for speed (returns `cap + 1` when larger). */
export function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const value = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > cap) return cap + 1;
    previous = current;
  }
  return Math.min(previous[b.length] ?? cap + 1, cap + 1);
}

export interface NotFoundHints {
  /** Readable form of the missing location, e.g. `#/histroy`. */
  display: string;
  /** A paper code found in the path, with the link that regenerates it. */
  paper: (ResolvedPaperCode & { path: string }) | null;
  /** The page the path most likely meant. */
  route: RouteSuggestion | null;
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Works out what a not-found path was probably meant to be. */
export function notFoundHints(path: string): NotFoundHints {
  const clean = path.replace(/^#/, '').replace(/^\/+/, '');
  const segments = clean
    .split(/[/?#&=]/)
    .filter(Boolean)
    .map(decode);

  let paper: NotFoundHints['paper'] = null;
  for (const segment of segments) {
    const check = checkPaperCode(segment);
    if (check.ok) {
      paper = { ...check, path: paperCodePath(check) };
      break;
    }
  }

  let route: RouteSuggestion | null = null;
  const head = segments[0]?.toLowerCase();
  if (head && !paper) {
    let bestDistance = Infinity;
    for (const candidate of ROUTES) {
      for (const word of candidate.words) {
        const distance = word === head ? 0 : editDistance(head, word, 2);
        // Very short words only match exactly, so `ab` does not suggest `about`.
        const allowed = word.length <= 3 ? 0 : word.length <= 5 ? 1 : 2;
        if (distance <= allowed && distance < bestDistance) {
          bestDistance = distance;
          route = { path: candidate.path, label: candidate.label };
        }
      }
    }
  }

  return { display: `#/${clean}`, paper, route };
}
