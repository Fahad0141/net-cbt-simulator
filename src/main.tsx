import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './ui/styles/global.css';
import { App } from './App';
import { isDesktopApp } from './platform/desktop';
import { isNativeApp } from './platform/native';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (isNativeApp()) {
  // Android app: the files ship inside the APK (no service worker, which would only keep
  // stale copies across app updates), and the back button needs the app's own policy.
  void import('./platform/backButton')
    .then(({ installBackButton }) => installBackButton())
    .catch((error: unknown) => console.warn('Back button setup failed:', error));
} else if (isDesktopApp()) {
  // Windows desktop app: the files ship with the installer (app://bundle/), so a service
  // worker would only keep stale copies across app updates.
} else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Offline support (production builds only; the dev server must not be cached).
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error: unknown) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
