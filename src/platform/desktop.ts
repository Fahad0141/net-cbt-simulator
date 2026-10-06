import { isNativeApp } from './native';

/**
 * Marker that the Windows desktop app (Electron, see desktop/preload.cjs) puts on `window`
 * before the web app starts. The desktop app runs this same build from app://bundle/ with
 * the normal web code paths (window.print(), <a download>, file inputs); it only differs in
 * wording, share links and the service worker.
 */
export interface DesktopMarker {
  readonly platform: 'desktop';
  readonly version: string;
}

declare global {
  interface Window {
    netcbtDesktop?: DesktopMarker;
  }
}

/** True inside the Windows desktop app, false on the website and in the Android app. */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && window.netcbtDesktop?.platform === 'desktop';
}

/** True in an installed app (Android or Windows), which has no address bar to share from. */
export function isInstalledApp(): boolean {
  return isNativeApp() || isDesktopApp();
}

/**
 * Where attempts and settings are kept, for sentences such as "Everything is saved privately
 * on this computer": the desktop app's profile, the Android app's storage, or the browser's
 * site data.
 */
export function storagePlace(): 'on this computer' | 'on this device' | 'in this browser' {
  if (isDesktopApp()) return 'on this computer';
  return isNativeApp() ? 'on this device' : 'in this browser';
}
