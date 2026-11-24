import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiGet } from "../lib/api";
import { reportError } from "../lib/report";

type Result<T> = { path: string | null; nonce: number; data: T | null; error: ApiRequestError | null };

/** Fetch `path` (relative to the API base). Pass null to skip. Cached, abortable, retry-able. */
export function useApi<T>(path: string | null) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T>>({ path: null, nonce: 0, data: null, error: null });

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    apiGet<T>(path, { signal: controller.signal, force: nonce > 0 })
      .then((data) => setResult({ path, nonce, data, error: null }))
      .catch((error: ApiRequestError) => {
        if (error.code === "cancelled") return;
        // 404 "not_available" is an expected state (future race, gap in data), not a fault.
        if (error.code !== "not_available") reportError(`api:${path}`, error);
        setResult({ path, nonce, data: null, error });
      });
    return () => controller.abort();
  }, [path, nonce]);

  const settled = result.path === path && result.nonce === nonce;
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return {
    data: settled ? result.data : null,
    error: settled ? result.error : null,
    loading: path !== null && !settled,
    reload,
  };
}
