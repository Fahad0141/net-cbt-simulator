import { type ReactNode, useEffect, useState } from 'react';
import { href, type Route } from '@/ui/router';
import { local } from '@/storage/kv';
import styles from './AppShell.module.css';

type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'net-cbt:theme';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = globalThis.localStorage?.getItem(THEME_KEY);
      return saved === 'light' || saved === 'dark' ? saved : 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    applyTheme(theme);
    try {
      if (theme === 'system') globalThis.localStorage?.removeItem(THEME_KEY);
      else globalThis.localStorage?.setItem(THEME_KEY, theme);
    } catch {
      // storage unavailable: theme still applies for this visit
    }
  }, [theme]);
  const cycle = () =>
    setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'));
  return [theme, cycle];
}

const NAV: Array<{ path: string; label: string; match: Route['name'][] }> = [
  { path: '/', label: 'Dashboard', match: ['home'] },
  { path: '/new', label: 'New Paper', match: ['new'] },
  { path: '/history', label: 'History', match: ['history', 'result', 'review'] },
  { path: '/analytics', label: 'Analytics', match: ['analytics'] },
  { path: '/bank', label: 'Question Bank', match: ['bank'] },
  { path: '/about', label: 'About', match: ['about'] },
];

function Logo() {
  return (
    <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
      <defs>
        <linearGradient id="app-logo-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#087ebb" />
          <stop offset="1" stopColor="#01405f" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#app-logo-g)" />
      <path
        d="M18 44V22l14-6 14 6v22l-14 6z"
        fill="#f4c430"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24.5 32.5l5 5 10-11"
        fill="none"
        stroke="#04486b"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Layout for every page except the CBT terminal itself. */
export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const [theme, cycleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasActive = Boolean(local.get('net-cbt:active-session'));

  useEffect(() => setMenuOpen(false), [route]);

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href={href('/')}>
            <Logo />
            <span>
              <strong>NET CBT</strong> Simulator
            </span>
          </a>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            Menu
          </button>
          <nav
            id="main-nav"
            className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}
            aria-label="Main"
          >
            {NAV.map((item) => (
              <a
                key={item.path}
                href={href(item.path)}
                className={styles.navLink}
                aria-current={item.match.includes(route.name) ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
            {hasActive ? (
              <a href={href('/exam')} className={`${styles.navLink} ${styles.resume}`}>
                Resume test
              </a>
            ) : null}
            <button
              type="button"
              className={styles.themeButton}
              onClick={cycleTheme}
              title="Change colour theme"
            >
              Theme: {theme}
            </button>
          </nav>
        </div>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>
          NET CBT Simulator is an independent, open-source practice tool. It is{' '}
          <strong>not affiliated with or endorsed by NUST</strong>. Questions are original or
          modelled on publicly reported topics; always check official announcements on the NUST
          admissions website.
        </p>
      </footer>
    </div>
  );
}
