import { afterEach, describe, expect, it, vi } from 'vitest';

/** A stand-in for `indexedDB` whose `open()` succeeds or fails asynchronously. */
function fakeIndexedDb(outcome: 'success' | 'error') {
  return {
    open: () => {
      const request: {
        result?: unknown;
        error?: Error;
        onsuccess?: () => void;
        onerror?: () => void;
      } = {};
      setTimeout(() => {
        if (outcome === 'success') {
          request.result = { objectStoreNames: { contains: () => true } };
          request.onsuccess?.();
        } else {
          request.error = new Error('IndexedDB is disabled');
          request.onerror?.();
        }
      }, 0);
      return request;
    },
  };
}

/** A fresh copy of the module, so it picks its backend again. */
async function loadKv() {
  vi.resetModules();
  return import('./kv');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isPersistentStorage', () => {
  it('is false when IndexedDB does not exist, and values still round-trip in memory', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const kv = await loadKv();
    expect(await kv.isPersistentStorage()).toBe(false);
    await kv.kvSet('k', { a: 1 });
    expect(await kv.kvGet('k')).toEqual({ a: 1 });
  });

  it('is false when IndexedDB exists but cannot be opened', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('indexedDB', fakeIndexedDb('error'));
    const kv = await loadKv();
    expect(await kv.isPersistentStorage()).toBe(false);
    expect(warn).toHaveBeenCalled();
    await kv.kvSet('k', 'v');
    expect(await kv.kvKeys()).toEqual(['k']);
  });

  it('is true when IndexedDB opens', async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDb('success'));
    const kv = await loadKv();
    expect(await kv.isPersistentStorage()).toBe(true);
  });
});
