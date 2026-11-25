import type { ReactNode } from "react";
import { Reveal } from "../../ui/reveal";
import { SectionHead } from "./sectionhead";

/** A numbered section: heading, then content that fades up as it scrolls into view. */
export function Block({ id, n, title, accent, note, children }: { id: string; n: string; title: string; accent: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-5">
      <SectionHead id={id} n={n} title={title} accent={accent} note={note} />
      <Reveal>{children}</Reveal>
    </section>
  );
}
