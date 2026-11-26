import axios, { AxiosError } from "axios";
import { trackRequest } from "./pending";
import { reportError } from "./report";

/** Base URL of the API (must include /api). Set VITE_API_URL in production. */
export const API_URL = String(import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(/\/+$/, "");

const client = axios.create({ baseURL: API_URL, timeout: 20_000, headers: { Accept: "application/json" } });

export class ApiRequestError extends Error {
  status: number | null;
  code: string;
  requestId: string | null;
  data: unknown;
  constructor(message: string, status: number | null, code: string, requestId: string | null, data: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.data = data;
  }
}

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

function normalise(error: unknown): ApiRequestError {
  if (axios.isCancel(error)) return cancelled();
  const e = error as AxiosError<{ error?: string; message?: string; request_id?: string }>;
  const body = e.response?.data;
  return new ApiRequestError(
    body?.message ?? (e.response ? "The server could not complete the request." : "Could not reach the server."),
    e.response?.status ?? null,
    body?.error ?? (e.response ? "http_error" : "network_error"),
    body?.request_id ?? null,
    body ?? null,
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOnce<T>(path: string, signal?: AbortSignal): Promise<T> {
  const done = trackRequest(); // shows the "waking the server" notice if this takes too long
  try {
    return await fetchWithRetry<T>(path, signal);
  } finally {
    done();
  }
}

async function fetchWithRetry<T>(path: string, signal?: AbortSignal): Promise<T> {
  // One retry for network errors and 502/503/504: the host may be waking up from sleep.
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await client.get<T>(path, { signal });
      return res.data;
    } catch (error) {
      const err = normalise(error);
      const transient = err.status === null ? err.code === "network_error" : [502, 503, 504].includes(err.status);
      if (attempt === 0 && transient) {
        await sleep(1500);
        continue;
      }
      throw err;
    }
  }
}

function cancelled(): ApiRequestError {
  return new ApiRequestError("cancelled", null, "cancelled", null, null);
}

/** Let one caller walk away (abort) without affecting the shared request or other callers. */
function withAbort<T>(shared: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return shared;
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) return reject(cancelled());
    const onAbort = () => reject(cancelled());
    signal.addEventListener("abort", onAbort, { once: true });
    shared.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/** GET with a 5-minute in-memory cache and de-duplication of concurrent identical requests.
 *  The network request is shared and is NOT tied to any single caller's AbortSignal: React
 *  StrictMode (dev) and fast navigation abort a caller and immediately start another for the
 *  same path, and that second caller must still get the result. */
export async function apiGet<T>(path: string, opts: { signal?: AbortSignal; force?: boolean } = {}): Promise<T> {
  const hit = cache.get(path);
  if (!opts.force && hit && Date.now() - hit.at < TTL_MS) return hit.data as T;
  let pending = inflight.get(path) as Promise<T> | undefined;
  if (!pending || opts.force) {
    const created: Promise<T> = fetchOnce<T>(path)
      .then((data) => {
        cache.set(path, { at: Date.now(), data });
        return data;
      })
      .finally(() => {
        if (inflight.get(path) === created) inflight.delete(path);
      });
    inflight.set(path, created);
    pending = created;
  }
  return withAbort(pending, opts.signal);
}

/** Fire-and-forget warm-up so the next page opens instantly (e.g. on link hover). */
export function prefetch(path: string): void {
  apiGet(path).catch((e) => reportError("prefetch", e));
}
