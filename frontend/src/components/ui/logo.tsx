/** The logo: the outline of a keyboard F1 key, then "for F1". F1 is the help key, so the name is the joke: press F1 for F1.
 *  Thin line, no fill: the key is a rounded outline with one red edge under it, like a keycap seen from the front.
 *  Everything is in em, so it takes its size from the text around it (footer, headers, menus). The name is real text, read as "F1 for F1". */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex select-none items-center gap-[0.45em] leading-none tracking-tight ${className}`}>
      <span className="rounded-[0.28em] border-[0.07em] border-white/85 px-[0.4em] py-[0.14em] text-[0.95em] font-extrabold italic tracking-tighter text-white shadow-[0_0.17em_0_-0.03em_#dc2626]">
        F1
      </span>{" "}
      <span className="font-light text-white/90">
        for <span className="font-extrabold italic text-red-500">F1</span>
      </span>
    </span>
  );
}
