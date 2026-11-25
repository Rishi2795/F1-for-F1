import type { ReactNode } from "react";

export type HeadAlign = "left" | "center" | "right" | "split";

/** The opening of a page. Each page picks its own alignment so they do not all read the same:
 *  left (default), centred, right-aligned, or split with a glass card (`aside`) on the right. */
export function PageHead({ kicker, title, accent, intro, align = "left", aside, children }: { kicker: string; title: string; accent: string; intro?: ReactNode; align?: HeadAlign; aside?: ReactNode; children?: ReactNode }) {
  const text = align === "center" ? "mx-auto items-center text-center" : align === "right" ? "md:ml-auto md:items-end md:text-right" : "";
  const body = (
    <div className={`flex max-w-3xl flex-col ${text}`}>
      <p className={`flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400 ${align === "right" ? "md:flex-row-reverse" : ""}`}>
        <span aria-hidden="true" className="h-2 w-2 bg-red-600" />
        REGISTRY // {kicker}
        {align === "center" && <span aria-hidden="true" className="h-2 w-2 bg-red-600" />}
      </p>
      <h1 className="mt-4 text-5xl font-black uppercase italic leading-[0.95] tracking-tighter text-white md:text-7xl">
        {title} <span className="text-red-500">{accent}</span>
      </h1>
      {intro && <p className="mt-4 text-lg text-zinc-300">{intro}</p>}
      {children}
    </div>
  );
  if (align === "split" && aside) {
    return (
      <header className="f1-rise grid items-end gap-8 md:grid-cols-[1.35fr_1fr]">
        {body}
        <div className="glass p-6 md:justify-self-end md:self-stretch md:w-full">{aside}</div>
      </header>
    );
  }
  return <header className="f1-rise w-full">{body}</header>;
}
