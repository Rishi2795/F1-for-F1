import { useEffect, useState, type CSSProperties } from "react";

/** Three "thinking" orbs that swell and fade in turn. Decorative (the loader around it says what is happening). Transform and opacity only,
 *  so it runs off the main thread; with reduced motion they sit still. */
export function Orbs({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center gap-1.5 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`orb ${i === 1 ? "orb--red" : ""}`} style={{ "--i": i } as CSSProperties} />
      ))}
    </span>
  );
}

const PHRASES = ["Warming up the tyres", "Reading the timing screens", "Checking the pit wall", "Lining up on the grid", "Fetching the race data"];

/** The page loader: the F1 key with three orbs chasing round it, and a line that changes every couple of seconds so a slow load still feels alive.
 *  The one live region (role="status") is the whole thing; the changing phrase is hidden from screen readers so they are not interrupted. */
export function OrbitLoader({ label = "Loading", className = "" }: { label?: string; className?: string }) {
  const [phrase, setPhrase] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 2000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div role="status" aria-label={label} className={`flex flex-col items-center justify-center gap-7 ${className}`}>
      <div className="orbit" aria-hidden="true">
        <span className="orbit__ring" />
        {[0, 1, 2].map((i) => (
          <span key={i} className="orbit__arm" style={{ "--i": i } as CSSProperties}>
            <span className={`orb ${i === 0 ? "orb--red" : ""}`} />
          </span>
        ))}
        <span className="orbit__key">F1</span>
      </div>
      <p key={phrase} aria-hidden="true" className="f1-rise font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500">
        {PHRASES[phrase]}
      </p>
    </div>
  );
}
