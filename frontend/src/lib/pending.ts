/** Tracks API requests that are taking suspiciously long, so the UI can explain why.
 *
 *  Free hosting puts the API to sleep when idle; the first request then takes up to a minute. Without a
 *  message that looks like a broken site. A request counts as "slow" once it has been pending for SLOW_MS. */

export const SLOW_MS = 3000;

type Listener = () => void;
const listeners = new Set<Listener>();
let slowCount = 0;

const notify = () => listeners.forEach((l) => l());

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while at least one request has been pending longer than SLOW_MS. */
export function isServerSlow(): boolean {
  return slowCount > 0;
}

/** Call when a request starts; call the returned function when it ends (success or failure). */
export function trackRequest(): () => void {
  let slow = false;
  let finished = false;
  const timer = setTimeout(() => {
    if (finished) return;
    slow = true;
    slowCount++;
    notify();
  }, SLOW_MS);
  return () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (slow) {
      slowCount--;
      notify();
    }
  };
}
