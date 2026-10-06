import { useMemo } from 'react';
import { Callout, LinkButton } from '@/ui/components/ui';
import { href, useRoute } from '@/ui/router';
import { useDocumentTitle } from './home/hooks';
import { IconArrowRight } from './home/icons';
import { notFoundHints } from './home/notFound';
import s from './home/NotFound.module.css';

const OTHER_PAGES = [
  { path: '/history', label: 'History' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/bank', label: 'Question bank' },
  { path: '/about', label: 'About the simulator' },
];

/** Helpful 404 for unknown hash routes. */
export default function NotFoundPage() {
  useDocumentTitle('Page not found · NET CBT Simulator');
  const route = useRoute();
  const path = route.name === 'not-found' ? route.path : '';
  const hints = useMemo(() => notFoundHints(path), [path]);

  return (
    <div className={s.page}>
      <section className={s.panel} aria-labelledby="not-found-title">
        <p className={s.code} aria-hidden="true">
          404
        </p>
        <h1 id="not-found-title" className={s.title}>
          Page not found
        </h1>
        <p className={s.text}>
          There is no page at <code className={s.path}>{hints.display}</code>. The link may be
          mistyped, or it may come from an older version of the simulator.
        </p>

        {hints.paper ? (
          <Callout>
            <p className={s.calloutText}>
              That looks like a paper code for <strong>{hints.paper.examName}</strong>.
            </p>
            <LinkButton
              variant="primary"
              size="sm"
              href={href(hints.paper.path)}
              className={s.openPaper}
            >
              Open paper {hints.paper.code}
              <IconArrowRight size={16} />
            </LinkButton>
          </Callout>
        ) : hints.route ? (
          <p className={s.text}>
            Did you mean <a href={href(hints.route.path)}>{hints.route.label}</a>?
          </p>
        ) : null}

        <div className={s.actions}>
          <LinkButton variant="primary" href={href('/')}>
            Go to the dashboard
          </LinkButton>
          <LinkButton href={href('/new')}>Generate a paper</LinkButton>
        </div>

        <nav className={s.more} aria-label="Other pages">
          <h2 className={s.moreTitle}>Or try</h2>
          <ul className={s.moreList}>
            {OTHER_PAGES.map((page) => (
              <li key={page.path}>
                <a href={href(page.path)}>{page.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </div>
  );
}
