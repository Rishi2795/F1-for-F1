import { useCallback, useEffect, useState } from "react";

/** State that survives a reload, kept on this device only (nothing is sent anywhere). Falls back quietly if storage is blocked. */
export function useLocalState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) setValue(JSON.parse(e.newValue) as T);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage blocked: the choice still works for this visit */
      }
    },
    [key],
  );
  return [value, set];
}
