import { lazy, Suspense } from 'react';
import { AppShell } from './ui/components/AppShell';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { useRoute } from './ui/router';

const HomePage = lazy(() => import('./ui/pages/HomePage'));
const NewPaperPage = lazy(() => import('./ui/pages/NewPaperPage'));
const ExamPage = lazy(() => import('./ui/pages/ExamPage'));
const ResultPage = lazy(() => import('./ui/pages/ResultPage'));
const ReviewPage = lazy(() => import('./ui/pages/ReviewPage'));
const HistoryPage = lazy(() => import('./ui/pages/HistoryPage'));
const AnalyticsPage = lazy(() => import('./ui/pages/AnalyticsPage'));
const PaperPage = lazy(() => import('./ui/pages/PaperPage'));
const BankPage = lazy(() => import('./ui/pages/BankPage'));
const AboutPage = lazy(() => import('./ui/pages/AboutPage'));
const NotFoundPage = lazy(() => import('./ui/pages/NotFoundPage'));

function Loading() {
  return (
    <p role="status" style={{ padding: 24, color: 'var(--muted)' }}>
      Loading…
    </p>
  );
}

export function App() {
  const route = useRoute();

  // The CBT terminal takes over the whole window, like the real exam.
  if (route.name === 'exam') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <ExamPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  let page;
  switch (route.name) {
    case 'home':
      page = <HomePage />;
      break;
    case 'new':
      page = <NewPaperPage query={route.query} />;
      break;
    case 'result':
      page = <ResultPage id={route.id} />;
      break;
    case 'review':
      page = <ReviewPage id={route.id} query={route.query} />;
      break;
    case 'history':
      page = <HistoryPage />;
      break;
    case 'analytics':
      page = <AnalyticsPage />;
      break;
    case 'paper':
      page = <PaperPage code={route.code} query={route.query} />;
      break;
    case 'bank':
      page = <BankPage query={route.query} />;
      break;
    case 'about':
      page = <AboutPage />;
      break;
    default:
      page = <NotFoundPage />;
  }

  return (
    <AppShell route={route}>
      <ErrorBoundary key={window.location.hash}>
        <Suspense fallback={<Loading />}>{page}</Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}
