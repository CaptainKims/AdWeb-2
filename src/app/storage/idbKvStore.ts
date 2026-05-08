const DB_NAME = 'adweb-ideas';
const DB_VERSION = 2;
const STORE = 'kv';
const BLOB_STORE = 'media_blobs';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function supportsIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openKvDb(): Promise<IDBDatabase | null> {
  if (!supportsIndexedDb()) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
        const db = (ev.target as IDBOpenDBRequest).result;
        if (ev.oldVersion < 1) {
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE);
          }
        }
        if (ev.oldVersion < 2) {
          if (!db.objectStoreNames.contains(BLOB_STORE)) {
            db.createObjectStore(BLOB_STORE);
          }
        }
      };
    });
  }
  return dbPromise;
}

export async function idbGet(key: string): Promise<string | null> {
  const db = await openKvDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onerror = () => resolve(null);
      r.onsuccess = () => resolve((r.result as string | undefined) ?? null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet(key: string, value: string): Promise<void> {
  const db = await openKvDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
      tx.objectStore(STORE).put(value, key);
    } catch {
      resolve();
    }
  });
}

export async function idbPutBlob(key: string, blob: Blob): Promise<void> {
  const db = await openKvDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(BLOB_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
      tx.objectStore(BLOB_STORE).put(blob, key);
    } catch {
      resolve();
    }
  });
}

export async function idbGetBlob(key: string): Promise<Blob | null> {
  const db = await openKvDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(BLOB_STORE, 'readonly');
      const r = tx.objectStore(BLOB_STORE).get(key);
      r.onerror = () => resolve(null);
      r.onsuccess = () => resolve((r.result as Blob | undefined) ?? null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbDeleteBlob(key: string): Promise<void> {
  const db = await openKvDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(BLOB_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
      tx.objectStore(BLOB_STORE).delete(key);
    } catch {
      resolve();
    }
  });
}
