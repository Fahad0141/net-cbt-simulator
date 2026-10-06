import { describe, expect, it } from 'vitest';
import { deriveSiteUrl, githubPagesUrl, normaliseRepoUrl, REPO_URL, repoFileUrl } from './site';

describe('site config', () => {
  it('exposes a GitHub repository URL without a trailing slash', () => {
    expect(REPO_URL).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
    expect(REPO_URL.endsWith('/')).toBe(false);
  });

  it('trims trailing slashes and falls back to the project repository', () => {
    expect(normaliseRepoUrl('https://github.com/someone/fork//')).toBe(
      'https://github.com/someone/fork',
    );
    expect(normaliseRepoUrl('')).toBe('https://github.com/Fahad0141/net-cbt-simulator');
    expect(normaliseRepoUrl(undefined)).toBe('https://github.com/Fahad0141/net-cbt-simulator');
  });

  it('builds links to files on the default branch', () => {
    expect(repoFileUrl('docs/EXAM_PATTERN.md')).toBe(`${REPO_URL}/blob/main/docs/EXAM_PATTERN.md`);
  });
});

describe('site URL', () => {
  it('derives the GitHub Pages address of a real repository', () => {
    expect(githubPagesUrl('https://github.com/Someone/net-cbt-simulator')).toBe(
      'https://someone.github.io/net-cbt-simulator/',
    );
    expect(githubPagesUrl('https://github.com/someone/fork.git')).toBe(
      'https://someone.github.io/fork/',
    );
    expect(githubPagesUrl('https://github.com/someone/someone.github.io')).toBe(
      'https://someone.github.io/',
    );
    expect(githubPagesUrl('https://github.com/someone/fork/')).toBe(
      'https://someone.github.io/fork/',
    );
  });

  it('knows no address for the placeholder or another host', () => {
    expect(githubPagesUrl('https://github.com/OWNER/net-cbt-simulator')).toBeUndefined();
    expect(githubPagesUrl('https://gitlab.com/someone/net-cbt-simulator')).toBeUndefined();
    expect(githubPagesUrl('https://github.com/someone')).toBeUndefined();
  });

  it('prefers VITE_SITE_URL and ends it with a slash', () => {
    const repo = 'https://github.com/someone/fork';
    expect(deriveSiteUrl('https://net.example.org', repo)).toBe('https://net.example.org/');
    expect(deriveSiteUrl(' https://net.example.org/app/#/new ', repo)).toBe(
      'https://net.example.org/app/',
    );
    expect(deriveSiteUrl('https://net.example.org/index.html', repo)).toBe(
      'https://net.example.org/index.html',
    );
    expect(deriveSiteUrl('https://net.example.org/app?ref=apk', repo)).toBe(
      'https://net.example.org/app/?ref=apk',
    );
    expect(deriveSiteUrl('https://bad host', repo)).toBe('https://someone.github.io/fork/');
  });

  it('falls back to GitHub Pages, or to nothing', () => {
    expect(deriveSiteUrl(undefined, 'https://github.com/someone/fork')).toBe(
      'https://someone.github.io/fork/',
    );
    expect(deriveSiteUrl('', 'https://github.com/someone/fork')).toBe(
      'https://someone.github.io/fork/',
    );
    expect(deriveSiteUrl('not a url', 'https://github.com/someone/fork')).toBe(
      'https://someone.github.io/fork/',
    );
    expect(deriveSiteUrl(undefined, 'https://github.com/OWNER/net-cbt-simulator')).toBeUndefined();
  });

  it('derives the address from a VITE_REPO_URL with a trailing slash', () => {
    const repo = normaliseRepoUrl('https://github.com/Someone/net-cbt-simulator/');
    expect(deriveSiteUrl(undefined, repo)).toBe('https://someone.github.io/net-cbt-simulator/');
    expect(deriveSiteUrl(undefined, normaliseRepoUrl(''))).toBe(
      'https://fahad0141.github.io/net-cbt-simulator/',
    );
  });
});
