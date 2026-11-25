/** Square buttons in the site's label style: quiet until hovered, solid white when chosen. */
export const chip = (on: boolean): string =>
  `inline-flex items-center gap-2 rounded-sm border px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
    on ? "border-white bg-white text-black" : "border-white/15 bg-white/[0.04] text-zinc-300 backdrop-blur-md hover:border-white/60 hover:bg-white/[0.09] hover:text-white"
  }`;

export const ghostButton =
  "inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/[0.04] px-4 py-2 backdrop-blur-md font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-300 transition-colors duration-200 hover:border-white/60 hover:bg-white/[0.09] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600";
