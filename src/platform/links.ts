import { SITE_URL } from '@/config/site';
import { isInstalledApp } from './desktop';

const appPath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

/**
 * Public web address of an app path such as `/new?type=…` (the current page when
 * `path` is omitted), for links that other people open. The website builds it from
 * the address it is served from; the Android app (https://localhost) and the Windows
 * desktop app (app://bundle/) use the published site (`siteUrl`), or return null when
 * the build does not know it.
 */
export function publicAppUrl(path?: string, siteUrl: string | undefined = SITE_URL): string | null {
  if (!isInstalledApp()) {
    const current = window.location.href;
    return path === undefined ? current : `${current.split('#')[0]}#${appPath(path)}`;
  }
  if (!siteUrl) return null;
  return `${siteUrl}#${appPath(path ?? (window.location.hash.replace(/^#/, '') || '/'))}`;
}

/**
 * Where a link to another site opens, for screen-reader notes such as "(opens in a new
 * tab)": the installed apps hand such links to the browser instead of a tab.
 */
export function externalLinkTarget(): string {
  return isInstalledApp() ? 'in your browser' : 'in a new tab';
}

/**
 * What the app shares for a paper when it has no public link: the code, plus the app
 * path that "Open a paper code" on the dashboard also accepts (it keeps the sections of
 * a custom test and non-default settings, which the code alone does not record).
 */
export function paperShareText(code: string, path: string): string {
  return `NET CBT Simulator paper ${code}. To open it, paste this message into "Open a paper code" on the dashboard: #${appPath(path)}`;
}
