import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SLOW_MS, isServerSlow, subscribe, trackRequest } from "./pending";

describe("slow request tracking", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is not slow for a request that finishes in time", () => {
    const done = trackRequest();
    vi.advanceTimersByTime(SLOW_MS - 1);
    done();
    vi.advanceTimersByTime(SLOW_MS * 2);
    expect(isServerSlow()).toBe(false);
  });

  it("becomes slow after the threshold and clears when the request ends", () => {
    const seen: boolean[] = [];
    const off = subscribe(() => seen.push(isServerSlow()));
    const done = trackRequest();
    vi.advanceTimersByTime(SLOW_MS + 1);
    expect(isServerSlow()).toBe(true);
    done();
    expect(isServerSlow()).toBe(false);
    expect(seen).toEqual([true, false]);
    off();
  });

  it("stays slow until every slow request has ended, and ending twice is harmless", () => {
    const a = trackRequest();
    const b = trackRequest();
    vi.advanceTimersByTime(SLOW_MS + 1);
    a();
    a();
    expect(isServerSlow()).toBe(true);
    b();
    expect(isServerSlow()).toBe(false);
  });
});
