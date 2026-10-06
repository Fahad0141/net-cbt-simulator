import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isDesktopApp, isInstalledApp, storagePlace } from './desktop';

const platform = vi.hoisted(() => ({ native: false }));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => platform.native },
  registerPlugin: () => ({}),
}));

/** The page as the desktop app's preload script leaves it (or a plain page without `marker`). */
function page(marker?: unknown) {
  vi.stubGlobal('window', marker === undefined ? {} : { netcbtDesktop: marker });
}

beforeEach(() => {
  platform.native = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isDesktopApp', () => {
  it('is false on the website and in the Android app', () => {
    page();
    expect(isDesktopApp()).toBe(false);
    platform.native = true;
    expect(isDesktopApp()).toBe(false);
  });

  it('is true when the desktop preload marker is present', () => {
    page({ platform: 'desktop', version: '1.0.0' });
    expect(isDesktopApp()).toBe(true);
  });

  it('ignores anything that is not the marker', () => {
    for (const marker of [null, 'desktop', { platform: 'web' }, { version: '1.0.0' }]) {
      page(marker);
      expect(isDesktopApp()).toBe(false);
    }
  });

  it('is false without a window (prerendering, workers)', () => {
    vi.stubGlobal('window', undefined);
    expect(isDesktopApp()).toBe(false);
  });
});

describe('isInstalledApp and storagePlace', () => {
  it('says where data is kept on each platform', () => {
    page();
    expect(isInstalledApp()).toBe(false);
    expect(storagePlace()).toBe('in this browser');

    platform.native = true;
    expect(isInstalledApp()).toBe(true);
    expect(storagePlace()).toBe('on this device');

    platform.native = false;
    page({ platform: 'desktop', version: '1.0.0' });
    expect(isInstalledApp()).toBe(true);
    expect(storagePlace()).toBe('on this computer');
  });
});
