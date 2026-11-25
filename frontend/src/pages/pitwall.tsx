import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { PageHead } from "../components/ui/pagehead";
import { pct } from "../lib/forecast";
import type { NextForecasts, RaceIndexEntry } from "../types/api";

type Tool = { to: string; n: string; title: string; question: string; teaser?: string };

/** The hub: every tool, each as the question it answers. */
export default function PitWall() {
  useDocumentTitle("Pit Wall");
  const next = useApi<NextForecasts>("/predictions/next").data;
  const seasons = useApi<{ seasons: number[] }>("/seasons").data?.seasons ?? [];
  const latest = seasons.length ? Math.max(...seasons) : undefined;
  const races = useApi<{ races: RaceIndexEntry[] }>(latest ? `/seasons/${latest}/races` : null).data;
  const best = [...(races?.races ?? [])].filter((r) => r.excitement != null).sort((a, b) => (b.excitement as number) - (a.excitement as number))[0];
  const fav = next?.races[0]?.drivers[0];
  const upcoming = next?.races[0];

  const tools: Tool[] = [
    { to: "/forecast", n: "01", title: "Forecast", question: "Who wins the next race? Who wins the title?", teaser: fav && upcoming ? `${upcoming.event_name.replace(" Grand Prix", "")}: ${fav.name.split(" ").at(-1)} ${pct(fav.win)}` : undefined },
    { to: "/watch", n: "02", title: "Worth watching", question: "Was that race worth a replay? Spoiler-free.", teaser: best ? `${latest} best: ${best.event_name.replace(" Grand Prix", "")} ${best.excitement?.toFixed(1)}` : undefined },
    { to: "/duels", n: "03", title: "Teammate duels", question: "Who is really faster in the same car?" },
    { to: "/team-pace", n: "09", title: "Team pace", question: "Who has the quickest car, and who is improving?" },
    { to: "/ratings", n: "04", title: "Driver or car?", question: "Who is outdriving their car, and who is being carried?" },
    { to: "/circuits", n: "05", title: "Circuits", question: "What usually happens at this track?" },
    { to: "/play", n: "06", title: "Beat the model", question: "Can you pick the podium better than the forecast?" },
    { to: "/my", n: "07", title: "My driver", question: "How is my driver doing, and what are their chances?" },
    { to: "/simulation", n: "08", title: "Pit-wall game", question: "Can you out-strategise the engineer?" },
  ];
  return (
    <div className="min-h-screen px-4 pb-32 pt-16 text-zinc-300 md:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <PageHead align="center" kicker="PIT_WALL" title="The" accent="pit wall" intro="Every tool, as the question it answers. Start anywhere: each one explains itself, and each shows its working." />
        <ul className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2">
          {tools.map((t, i) => (
            <li key={t.to} className="f1-rise glass-cell" style={{ "--d": `${i * 50}ms` } as React.CSSProperties}>
              <Link to={t.to} className="group flex h-full flex-col justify-between gap-6 p-6 transition-colors hover:bg-white/[0.04]">
                <span>
                  <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400"><span aria-hidden="true" className="h-2 w-2 bg-red-600" />REF_{t.n}</span>
                  <span className="mt-4 block text-3xl font-black uppercase italic tracking-tighter text-white transition-colors group-hover:text-red-500">{t.title}</span>
                  <span className="mt-2 block text-zinc-300">{t.question}</span>
                </span>
                <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  <span>{t.teaser ?? " "}</span>
                  <span aria-hidden="true" className="text-zinc-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white">OPEN →</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-zinc-500">Standings and race pages have their own tools too: the race lab (replay, gaps, pace, flags, undercuts), the strategy what-if and the tyre model sit on each race, and the title maths sits on the forecast page.</p>
      </div>
    </div>
  );
}
