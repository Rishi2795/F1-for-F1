/** Central error reporting. Replaces scattered console.* calls (lint forbids them).
 *  Events are sanitized (no URLs with queries, no user data) and kept in a small
 *  in-memory ring buffer; set VITE_ERROR_ENDPOINT to also beacon them to a collector. */

export type ErrorEvent = { context: string; name: string; message: string; route: string; at: string };

const MAX_EVENTS = 50;
const buffer: ErrorEvent[] = [];

function sanitize(text: string): string {
  return text.replace(/https?:\/\/[^\s)]+/g, "<url>").slice(0, 200);
}

export function reportError(context: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const event: ErrorEvent = {
    context,
    name: err.name,
    message: sanitize(err.message),
    route: typeof location === "undefined" ? "" : location.pathname,
    at: new Date().toISOString(),
  };
  buffer.push(event);
  if (buffer.length > MAX_EVENTS) buffer.shift();
  const endpoint = import.meta.env.VITE_ERROR_ENDPOINT as string | undefined;
  if (endpoint && typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, JSON.stringify(event));
  }
}

export function recentErrors(): readonly ErrorEvent[] {
  return buffer;
}
