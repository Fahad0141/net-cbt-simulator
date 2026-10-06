/**
 * Site-wide settings that differ between deployments.
 *
 * REPO_URL is the public GitHub repository of this project: issue links, the
 * authoring guide and source links all derive from it. Builds set VITE_REPO_URL
 * (the deploy workflow passes the repository it runs in, so a fork links to
 * itself); otherwise this project's own repository is used.
 */
const DEFAULT_REPO_URL = 'https://github.com/Fahad0141/net-cbt-simulator';

/** `url` without trailing slashes, or the default repository when it is empty. */
export function normaliseRepoUrl(url: string | undefined): string {
  const trimmed = (url ?? '').trim().replace(/\/+$/, '');
  return trimmed || DEFAULT_REPO_URL;
}

export const REPO_URL = normaliseRepoUrl(import.meta.env.VITE_REPO_URL);

/** A file on the default branch of the repository (`docs/EXAM_PATTERN.md`). */
export function repoFileUrl(path: string): string {
  return `${REPO_URL}/blob/main/${path.replace(/^\/+/, '')}`;
}

/**
 * The GitHub Pages address of a `https://github.com/<owner>/<repo>` repository
 * (`https://<owner>.github.io/<repo>/`), or undefined for the OWNER placeholder or another host.
 */
export function githubPagesUrl(repoUrl: string): string | undefined {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/*$/i.exec(repoUrl.trim());
  if (!match) return undefined;
  const [, owner = '', repo = ''] = match;
  if (owner === 'OWNER') return undefined;
  const host = `${owner.toLowerCase()}.github.io`;
  // A `<owner>.github.io` repository is published at the root of that host.
  return repo.toLowerCase() === host ? `https://${host}/` : `https://${host}/${repo}/`;
}

/**
 * Public address of the website (ending in `/`, or in the page file name): `siteEnv`
 * when it is an http(s) URL, otherwise the repository's GitHub Pages site, otherwise undefined.
 */
export function deriveSiteUrl(siteEnv: string | undefined, repoUrl: string): string | undefined {
  const explicit = (siteEnv ?? '').trim();
  if (/^https?:\/\/[^/]/i.test(explicit)) {
    try {
      const url = new URL(explicit);
      url.hash = '';
      // App links are appended as `#/path`, so the path must name a folder or a page.
      if (!/\/$|\.html?$/i.test(url.pathname)) url.pathname += '/';
      return url.href;
    } catch {
      // Not a valid URL: fall back to the repository's site.
    }
  }
  return githubPagesUrl(repoUrl);
}

/**
 * Where the website is published, for links shared from the Android app (which runs
 * at https://localhost). Builds set VITE_SITE_URL, or it is derived from REPO_URL.
 */
export const SITE_URL = deriveSiteUrl(import.meta.env.VITE_SITE_URL, REPO_URL);
