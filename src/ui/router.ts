import { useSyncExternalStore } from 'react';

/**
 * Hash-based routing so the static build works on GitHub Pages and from the file
 * system without server rewrites. Routes:
 *
 *   #/                      home / dashboard
 *   #/new?type=ENG          configure a new paper
 *   #/exam                  the CBT terminal for the active session
 *   #/result/<attemptId>    score report
 *   #/review/<attemptId>    question-by-question review
 *   #/history               past attempts
 *   #/analytics             topic-wise performance
 *   #/paper/<code>          printable paper + answer key
 *   #/bank                  question-bank browser
 *   #/about                 about, disclaimer, exam pattern
 */
export type Route =
  | { name: 'home' }
  | { name: 'new'; query: URLSearchParams }
  | { name: 'exam' }
  | { name: 'result'; id: string }
  | { name: 'review'; id: string; query: URLSearchParams }
  | { name: 'history' }
  | { name: 'analytics' }
  | { name: 'paper'; code: string; query: URLSearchParams }
  | { name: 'bank'; query: URLSearchParams }
  | { name: 'about' }
  | { name: 'not-found'; path: string };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart = '/', queryPart = ''] = raw.split('?');
  const query = new URLSearchParams(queryPart);
  const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  const [head, arg] = segments;
  switch (head) {
    case undefined:
      return { name: 'home' };
    case 'new':
      return { name: 'new', query };
    case 'exam':
      return { name: 'exam' };
    case 'result':
      return arg ? { name: 'result', id: arg } : { name: 'history' };
    case 'review':
      return arg ? { name: 'review', id: arg, query } : { name: 'history' };
    case 'history':
      return { name: 'history' };
    case 'analytics':
      return { name: 'analytics' };
    case 'paper':
      return arg ? { name: 'paper', code: arg, query } : { name: 'new', query };
    case 'bank':
      return { name: 'bank', query };
    case 'about':
      return { name: 'about' };
    default:
      return { name: 'not-found', path: pathPart };
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

const getHash = () => window.location.hash;

/** Current route; re-renders on hash changes. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return parseHash(hash);
}

/** Navigates to an app path such as `/result/abc`. */
export function navigate(path: string, options: { replace?: boolean } = {}): void {
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (options.replace) {
    window.location.replace(target);
  } else {
    window.location.hash = target;
  }
}

/** `href` value for links. */
export const href = (path: string): string => `#${path.startsWith('/') ? path : `/${path}`}`;
