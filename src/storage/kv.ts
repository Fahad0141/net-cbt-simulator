/**
 * Tiny promise-based key/value store on IndexedDB, with an in-memory fallback
 * when IndexedDB is unavailable (some private-browsing modes, old test envs).
 */

const DB_NAME = 'net-cbt-simulator';
const STORE = 'kv';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
const memory = new Map<string, unknown>();

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      request.onblocked = () => reject(new Error('IndexedDB open blocked'));
    });
    dbPromise = opening.catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = tx.onerror = () =>
      reject(tx.error ?? request.error ?? new Error('IndexedDB transaction failed'));
  });
}

let useMemory = !hasIndexedDb();

async function attempt<T>(idb: () => Promise<T>, fallback: () => T): Promise<T> {
  if (useMemory) return fallback();
  try {
    return await idb();
  } catch (error) {
    console.warn('IndexedDB unavailable, falling back to memory storage:', error);
    useMemory = true;
    return fallback();
  }
}

/**
 * Resolves to true when values are stored in IndexedDB (they survive a reload),
 * or false when the in-memory fallback is in use (they last only for this tab).
 * Opens the database first, so the answer reflects the backend actually chosen.
 */
export async function isPersistentStorage(): Promise<boolean> {
  await attempt(
    async () => {
      await openDb();
    },
    () => undefined,
  );
  return !useMemory;
}

export function kvGet<T>(key: string): Promise<T | undefined> {
  return attempt(
    () => withStore('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
    () => memory.get(key) as T | undefined,
  );
}

export function kvSet(key: string, value: unknown): Promise<void> {
  return attempt(
    async () => {
      await withStore('readwrite', (s) => s.put(value, key));
    },
    () => {
      memory.set(key, structuredClone(value));
    },
  );
}

export function kvDelete(key: string): Promise<void> {
  return attempt(
    async () => {
      await withStore('readwrite', (s) => s.delete(key));
    },
    () => {
      memory.delete(key);
    },
  );
}

export function kvKeys(prefix = ''): Promise<string[]> {
  return attempt(
    async () => {
      const keys = await withStore('readonly', (s) => s.getAllKeys());
      return keys.map(String).filter((k) => k.startsWith(prefix));
    },
    () => [...memory.keys()].filter((k) => k.startsWith(prefix)),
  );
}

/** Synchronous localStorage helpers for small, latency-critical state. */
export const local = {
  get<T>(key: string): T | undefined {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  },
  set(key: string, value: unknown): boolean {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};
