import { DriverAvatar } from "../ui/driveravatar";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import type { CircuitIndexEntry, DriverListEntry, RaceIndexEntry } from "../../types/api";

type Item = { id: string; group: string; label: string; hint?: string; to: string; code?: string; color?: string | null; number?: number | null };

const PAGES: Item[] = [
  ["Home", "/"], ["Races", "/explore"], ["Standings", "/standings"], ["Pit Wall", "/pitwall"], ["Forecast: who wins next?", "/forecast"],
  ["Worth watching", "/watch"], ["Teammate duels", "/duels"], ["Team pace: quickest car", "/team-pace"], ["Driver or car?", "/ratings"], ["Circuits", "/circuits"],
  ["Beat the model", "/play"], ["My driver", "/my"], ["Methodology", "/methodology"],
].map(([label, to]) => ({ id: `page-${to}`, group: "PAGES", label, to }));

/** Cmd/Ctrl+K: jump to any driver, race, circuit or page. Loads its lists only the first time it opens. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const drivers = useApi<DriverListEntry[]>(open ? "/drivers" : null).data;
  const circuits = useApi<CircuitIndexEntry[]>(open ? "/circuits" : null).data;
  const seasons = useApi<{ seasons: number[] }>(open ? "/seasons" : null).data?.seasons;
  const latest = seasons?.length ? Math.max(...seasons) : undefined;
  const races = useApi<{ races: RaceIndexEntry[] }>(open && latest ? `/seasons/${latest}/races` : null).data;

  useEffect(() => {
    const show = () => {
      setQ("");
      setActive(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            setQ("");
            setActive(0);
          }
          return !v;
        });
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("f1:search", show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("f1:search", show);
    };
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...PAGES,
      ...(drivers ?? []).map((d) => ({ id: `d-${d.code}`, group: "DRIVERS", label: d.name, hint: d.team ?? undefined, to: `/driver/${d.code}`, code: d.code, color: d.team_color, number: d.number })),
      ...(races?.races ?? []).filter((r) => r.data_status !== "scheduled").map((r) => ({ id: `r-${r.season}-${r.round}`, group: "RACES", label: `${r.event_name} ${r.season}`, hint: r.date, to: `/race/${r.season}/${r.round}` })),
      ...(circuits ?? []).map((c) => ({ id: `c-${c.slug}`, group: "CIRCUITS", label: c.location, hint: c.country ?? undefined, to: `/circuit/${c.slug}` })),
    ];
    const term = q.trim().toLowerCase();
    return (term ? all.filter((i) => `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(term)) : all.filter((i) => i.group === "PAGES")).slice(0, 12);
  }, [q, drivers, circuits, races]);

  if (!open) return null;
  const go = (item: Item) => {
    setOpen(false);
    navigate(item.to);
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Search" className="fixed inset-0 z-[70] flex items-start justify-center bg-black/80 px-4 pt-[15vh]" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="w-full max-w-xl border border-white/20 bg-[#050505]">
        <label className="block border-b border-white/10 px-5 py-4">
          <span className="sr-only">Search drivers, races, circuits and pages</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              else if (e.key === "Enter" && items[active]) go(items[active]);
            }}
            placeholder="Search drivers, races, circuits, pages…"
            className="w-full bg-transparent text-lg text-white outline-none placeholder:text-zinc-500"
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={items[active] ? `opt-${items[active].id}` : undefined}
          />
        </label>
        <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-auto py-2">
          {items.length === 0 && <li className="px-5 py-6 text-zinc-500">Nothing matches “{q}”.</li>}
          {items.map((item, i) => (
            <li key={item.id} id={`opt-${item.id}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(item)} className={`flex w-full items-center justify-between gap-4 px-5 py-2.5 text-left transition-colors ${i === active ? "bg-white/10 text-white" : "text-zinc-300"}`}>
                <span className="flex items-center gap-3">{item.code && <DriverAvatar code={item.code} color={item.color} number={item.number} size={26} />}<span>{item.label}{item.hint && <span className="ml-3 text-xs text-zinc-500">{item.hint}</span>}</span></span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">{item.group}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-white/10 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">↑↓ MOVE · ENTER OPEN · ESC CLOSE</p>
      </div>
    </div>
  );
}
