import { useState, useEffect, useCallback, useRef } from 'react';
import { idbGet, idbSet } from '../storage/idbKvStore';

function readLocalStorage<T>(key: string, initialValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    // Corrupt data — fall through to initial value
  }
  return initialValue;
}

/**
 * State that persists across sessions: primary store is IndexedDB (larger quota,
 * structured), mirrored to localStorage for quick first paint and export tooling.
 * Migrates existing localStorage-only keys into IndexedDB on first run.
 *
 * Returns `[value, setValue, hydrated]` — wait for `hydrated` before treating
 * storage as fully reconciled with IndexedDB (avoids rare race on very fast edits).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): readonly [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [state, setStateInternal] = useState<T>(() => readLocalStorage(key, initialValue));
  const [hydrated, setHydrated] = useState(false);
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idbRaw = await idbGet(key);
        if (cancelled) return;

        if (idbRaw !== null) {
          try {
            const parsed = JSON.parse(idbRaw) as T;
            setStateInternal(parsed);
            try {
              localStorage.setItem(key, idbRaw);
            } catch {
              // ignore
            }
          } catch {
            // corrupt IDB entry — keep state from localStorage initializer
          }
        } else {
          const rawLs = localStorage.getItem(key);
          if (rawLs !== null) {
            await idbSet(key, rawLs);
          } else {
            await idbSet(key, JSON.stringify(initialValueRef.current));
          }
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(state);
    try {
      localStorage.setItem(key, serialized);
    } catch {
      // Quota / private mode
    }
    const t = window.setTimeout(() => {
      void idbSet(key, serialized);
    }, 150);
    return () => clearTimeout(t);
  }, [key, state, hydrated]);

  const setState = useCallback((value: T | ((prev: T) => T)) => {
    setStateInternal(prev => {
      const next =
        typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      return next;
    });
  }, []);

  return [state, setState, hydrated] as const;
}
