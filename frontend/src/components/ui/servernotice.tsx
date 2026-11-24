import { useSyncExternalStore } from "react";
import { isServerSlow, subscribe } from "../../lib/pending";

/** Explains a long wait instead of leaving a spinner that looks like a broken site. */
export function ServerNotice() {
  const slow = useSyncExternalStore(subscribe, isServerSlow, () => false);
  if (!slow) return null;
  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 z-[60] w-[min(92vw,26rem)] -translate-x-1/2 rounded-xl border border-amber-400/30 bg-zinc-950/95 px-4 py-3 text-sm shadow-2xl backdrop-blur"
    >
      <p className="font-semibold text-amber-300">Waking the server…</p>
      <p className="mt-0.5 text-zinc-300">Free hosting sleeps when it&apos;s idle, so the first request can take up to a minute. Everything loads once it&apos;s awake.</p>
    </div>
  );
}
