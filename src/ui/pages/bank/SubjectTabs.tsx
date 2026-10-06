import { useLayoutEffect, useRef } from 'react';
import type { SubjectId } from '@/engine/types';
import { BankLink } from './BankLink';
import { BANK_SUBJECTS, subjectLabel } from './navigation';
import s from './bank.module.css';

/**
 * Subject switcher. Each subject is its own URL, so these are links in a nav with
 * `aria-current` (not ARIA tabs). Counts appear as soon as a subject is loaded.
 */
export function SubjectTabs({
  current,
  counts,
}: {
  current: SubjectId;
  counts: Readonly<Partial<Record<SubjectId, number>>>;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  // On narrow screens the strip scrolls sideways: keep the current subject in view
  // without scrolling the page itself.
  useLayoutEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = Math.max(0, active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2);
  }, [current]);

  return (
    <nav aria-label="Subjects" className={s.tabsNav}>
      <ul ref={listRef} className={s.tabs}>
        {BANK_SUBJECTS.map((id) => {
          const count = counts[id];
          return (
            <li key={id} className={s.tabItem}>
              <BankLink
                to={{ subject: id }}
                focus={`tab:${id}`}
                data-focus-key={`tab:${id}`}
                className={s.tab}
                aria-current={id === current ? 'page' : undefined}
              >
                <span>{subjectLabel(id)}</span>
                {count !== undefined ? (
                  <span className={s.tabCount}>
                    {count}
                    <span className="visually-hidden"> templates</span>
                  </span>
                ) : null}
              </BankLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
