/**
 * Lightweight, dependency-free IndexedDB persistence with safe versioned migrations.
 * Mirrors player progress & notification preferences locally for offline durability
 * and direct Service Worker access (zero backend required).
 */

export const IDB_NAME = 'meowdoku_offline_db';
export const IDB_VERSION = 1;

export const STORE_GAME_STATE = 'game_state';
export const STORE_NOTIFICATION_PREFS = 'notification_prefs';
export const STORE_META = 'meta';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function openMeowdokuDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;

        // Safe additive migration v0 -> v1 (never drops existing user stores)
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(STORE_GAME_STATE)) {
            db.createObjectStore(STORE_GAME_STATE);
          }
          if (!db.objectStoreNames.contains(STORE_NOTIFICATION_PREFS)) {
            db.createObjectStore(STORE_NOTIFICATION_PREFS);
          }
          if (!db.objectStoreNames.contains(STORE_META)) {
            db.createObjectStore(STORE_META);
          }
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        // Record migration metadata non-destructively
        try {
          const tx = db.transaction(STORE_META, 'readwrite');
          tx.objectStore(STORE_META).put(
            { dbVersion: IDB_VERSION, updatedAt: Date.now() },
            'schema'
          );
        } catch {
          // Ignore meta write errors
        }
        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;
        resolve(null);
      };

      request.onblocked = () => {
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

export async function idbPut<T>(
  storeName: string,
  key: string,
  value: T
): Promise<boolean> {
  const db = await openMeowdokuDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbGet<T>(
  storeName: string,
  key: string
): Promise<T | null> {
  const db = await openMeowdokuDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbDelete(
  storeName: string,
  key: string
): Promise<boolean> {
  const db = await openMeowdokuDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
