import { Capacitor, type PluginListenerHandle, registerPlugin } from '@capacitor/core';
import type { AppPlugin, BackButtonListenerEvent } from '@capacitor/app';
import type { ShareOptions } from '@capacitor/share';

/**
 * The Android app (Capacitor) runs this same build inside a WebView. These wrappers
 * load the native plugin code only when it is used (dynamic import), so the website
 * never downloads it; on the website they are never called.
 */

/** True inside the installed Android app, false on the website. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Local plugin in the Android project (android/app/src/main/java/.../PrintPlugin.java). */
interface PrintPlugin {
  print(options: { name?: string }): Promise<void>;
}

const Print = registerPlugin<PrintPlugin>('Print');

/** Opens Android's print dialog for the page on screen (it offers "Save as PDF"). */
export function printPage(jobName: string): Promise<void> {
  return Print.print({ name: jobName });
}

/** True when the user closed the share sheet without choosing an app. */
function isShareCancel(error: unknown): boolean {
  return /cancel/i.test(error instanceof Error ? error.message : String(error));
}

/** Opens the Android share sheet; resolves to false when the user cancels it. */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  const { Share } = await import('@capacitor/share');
  try {
    await Share.share(options);
    return true;
  } catch (error) {
    if (isShareCancel(error)) return false;
    throw error;
  }
}

/**
 * Characters sent to the native side per file write. Each plugin call copies its data a
 * few times on the Java heap, so a long history backup (megabytes) goes in pieces.
 */
const WRITE_CHUNK = 512 * 1024;

/** `text` cut into pieces of at most `size` characters, never inside a surrogate pair. */
export function chunkText(text: string, size = WRITE_CHUNK): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + Math.max(2, size));
    const last = text.charCodeAt(end - 1);
    if (end < text.length && last >= 0xd800 && last <= 0xdbff) end -= 1;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

/**
 * Writes `text` to a UTF-8 file in the app's cache and opens the share sheet for it, so
 * the user can save it to Files or Drive or send it. Resolves to false when cancelled.
 */
export async function shareTextFile(
  filename: string,
  text: string,
  title: string,
): Promise<boolean> {
  const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem');
  const [first = '', ...rest] = chunkText(text);
  const file = { path: filename, directory: Directory.Cache, encoding: Encoding.UTF8 };
  const { uri } = await Filesystem.writeFile({ ...file, data: first });
  for (const data of rest) await Filesystem.appendFile({ ...file, data });
  return shareContent({ title, files: [uri], dialogTitle: title });
}

/** Adds an App plugin listener; the returned function removes it (even before it is added). */
function appListener(add: (app: AppPlugin) => Promise<PluginListenerHandle>): () => void {
  let removed = false;
  let handle: PluginListenerHandle | undefined;
  void import('@capacitor/app')
    .then(({ App }) => add(App))
    .then((added) => {
      if (removed) void added.remove();
      else handle = added;
    })
    .catch((error: unknown) => console.warn('App listener failed:', error));
  return () => {
    removed = true;
    void handle?.remove();
  };
}

/**
 * Handles the Android back button. While a listener is registered Capacitor no longer
 * navigates back by itself, so the listener decides everything (see backButton.ts).
 */
export function onBackButton(listener: (event: BackButtonListenerEvent) => void): () => void {
  return appListener((App) => App.addListener('backButton', listener));
}

/** Calls `listener` when the app goes to the background, where Android may kill it. */
export function onAppPause(listener: () => void): () => void {
  if (!isNativeApp()) return () => {};
  return appListener((App) => App.addListener('pause', listener));
}

/**
 * Leaves the Android app from its first screen the way Android 12+ does for the system back
 * button: the app moves to the background and keeps its state, instead of being closed.
 */
export async function leaveApp(): Promise<void> {
  const { App } = await import('@capacitor/app');
  await App.minimizeApp();
}
