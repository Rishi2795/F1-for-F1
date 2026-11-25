import type { ReactNode } from "react";
import { tag } from "../../../lib/tag";

/** The race page's section label, as on the original page: a red [01], a wide-tracked italic title in
 *  TITLE_CASE_WITH_UNDERSCORES, and a hairline running to the edge. */
export function SectionHead({ n, title, accent, note, aside, id }: { n: string; title: string; accent: string; note?: string; aside?: ReactNode; id?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-black text-red-500">[{n}]</span>
        <h2 id={id} className="text-xs font-black uppercase italic tracking-[0.4em] text-white">
          {tag(`${title} ${accent}`)}
        </h2>
        <div aria-hidden="true" className="h-px flex-1 bg-white/10" />
        {aside}
      </div>
      {note && <p className="pl-9 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">{note}</p>}
    </div>
  );
}
