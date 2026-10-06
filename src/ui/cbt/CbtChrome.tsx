import type { ReactNode } from 'react';
import { href } from '@/ui/router';
import styles from './cbt.module.css';

/** Original emblem for the simulator (deliberately not the NUST crest). */
function Emblem() {
  return (
    <svg className={styles.brandMark} viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="none" stroke="#fff" strokeWidth="2" opacity="0.9" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={24 + Math.sin(a) * 12}
            y1={24 - Math.cos(a) * 12}
            x2={24 + Math.sin(a) * 18}
            y2={24 - Math.cos(a) * 18}
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />
        );
      })}
      <path d="M15 31V18l9-4 9 4v13l-9 4z" fill="#f4c430" stroke="#fff" strokeWidth="1.2" />
      <path d="M24 14v21" stroke="#04486b" strokeWidth="1.4" />
    </svg>
  );
}

export function CbtBanner({ aside }: { aside?: ReactNode }) {
  return (
    <header className={styles.banner}>
      <a className={styles.brand} href={href('/')} aria-label="NET e-Test simulator home">
        <Emblem />
        <span className={styles.brandName}>NET</span>
        <span className={styles.brandDivider} aria-hidden="true" />
        <span className={styles.brandProduct}>e-Test</span>
        <span className={styles.brandTag}>Simulator</span>
      </a>
      {aside ? <div className={styles.bannerAside}>{aside}</div> : null}
    </header>
  );
}

export function CbtFooter({ onExit }: { onExit?: () => void }) {
  return (
    <footer className={styles.footerNote}>
      <strong>
        This is an unofficial practice simulation of the Computer Based NUST Entry Test (CBNET).
      </strong>
      <a href={href('/')} onClick={onExit}>
        Go to Main Page
      </a>
      |<a href={href('/about')}>About this simulator</a>
    </footer>
  );
}
