import { type ReactNode, useEffect, useState } from 'react';
import { href, type Route } from '@/ui/router';
import { local } from '@/storage/kv';
import styles from './AppShell.module.css';

type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'net-cbt:theme';
const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };

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
  const cycle = () => setTheme((t) => NEXT_THEME[t]);
  return [theme, cycle];
}

const NAV: Array<{ path: string; label: string; match: Route['name'][] }> = [
  { path: '/', label: 'Dashboard', match: ['home'] },
  { path: '/new', label: 'New paper', match: ['new'] },
  { path: '/history', label: 'History', match: ['history', 'result', 'review'] },
  { path: '/analytics', label: 'Analytics', match: ['analytics'] },
  { path: '/bank', label: 'Question bank', match: ['bank'] },
  { path: '/about', label: 'About', match: ['about'] },
];

/** Sun for light, moon for dark, a half-filled disc for "follow the system". */
function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 18,
    height: 18,
    'aria-hidden': true,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (theme === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
            <span className={styles.wordmark}>
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
              title={`Colour theme: ${theme}. Switch to ${NEXT_THEME[theme]}`}
            >
              <ThemeIcon theme={theme} />
              <span className={styles.themeLabel}>Theme: {theme}</span>
            </button>
          </nav>
        </div>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>
          An independent, open-source practice tool,{' '}
          <strong>not affiliated with or endorsed by NUST</strong>. Check dates and rules on the
          official NUST admissions website.
        </p>
      </footer>
    </div>
  );
}
