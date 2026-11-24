import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
vi.mock("axios", () => ({
  default: { create: () => ({ get }), isCancel: (e: { __CANCEL__?: boolean } | undefined) => Boolean(e?.__CANCEL__) },
}));

// Imported after the mock so api.ts picks up the fake client.
const { apiGet } = await import("./api");

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("apiGet", () => {
  beforeEach(() => {
    get.mockReset(); // braces matter: returning the mock would make vitest call it as a cleanup hook
  });

  it("a second caller still gets the result when the first one aborted (React StrictMode / fast navigation)", async () => {
    const network = deferred<{ data: string }>();
    // Like real axios: a request that was handed an AbortSignal rejects when that signal aborts.
    get.mockImplementation(
      (_path: string, config?: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          config?.signal?.addEventListener("abort", () => reject({ __CANCEL__: true }));
          network.promise.then(resolve);
        }),
    );

    const first = new AbortController();
    const firstCall = apiGet<string>("/regression-a", { signal: first.signal });
    first.abort(); // StrictMode cleanup, or the user navigated away
    const secondCall = apiGet<string>("/regression-a", { signal: new AbortController().signal });

    await expect(firstCall).rejects.toMatchObject({ code: "cancelled" });
    network.resolve({ data: "races" });
    await expect(secondCall).resolves.toBe("races"); // used to hang forever (stuck skeleton)
    expect(get).toHaveBeenCalledTimes(1); // and still only one network request
  });

  it("serves repeat requests from the cache", async () => {
    get.mockResolvedValue({ data: "cached" });
    await apiGet("/regression-b");
    await apiGet("/regression-b");
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("surfaces the server's error message and request id", async () => {
    get.mockImplementation(() =>
      Promise.reject({ response: { status: 404, data: { error: "not_available", message: "Nope.", request_id: "r1" } } }),
    );
    const error = await apiGet("/regression-c").then(
      () => null,
      (e: unknown) => e as { status: number; code: string; requestId: string; message: string },
    );
    expect(error).not.toBeNull();
    expect(error?.status).toBe(404);
    expect(error?.code).toBe("not_available");
    expect(error?.requestId).toBe("r1");
    expect(error?.message).toBe("Nope.");
  });
});
