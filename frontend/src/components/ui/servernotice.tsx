import { useSyncExternalStore } from "react";
import { isServerSlow, subscribe } from "../../lib/pending";
import { Orbs } from "./orbs";

/** Explains a long wait instead of leaving a spinner that looks like a broken site. */
export function ServerNotice() {
  const slow = useSyncExternalStore(subscribe, isServerSlow, () => false);
  if (!slow) return null;
  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 z-[60] w-[min(92vw,26rem)] -translate-x-1/2 rounded-sm border border-red-500/50 bg-zinc-950/95 px-4 py-3 text-sm"
    >
      <p className="flex items-center gap-3 font-semibold text-red-400"><Orbs /> Waking the server…</p>
      <p className="mt-0.5 text-zinc-300">Free hosting sleeps when it&apos;s idle, so the first request can take up to a minute. Everything loads once it&apos;s awake.</p>
    </div>
  );
}
