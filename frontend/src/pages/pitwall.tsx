import { Cpu, Eye, Flag, Gamepad2, Gauge, Swords, Target, Timer, Users } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ToolCarousel, type CarouselTool } from "../components/pitwall/carousel";
import { PageHead } from "../components/ui/pagehead";
import { pct } from "../lib/forecast";
import type { NextForecasts, RaceIndexEntry } from "../types/api";

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

  const tools: CarouselTool[] = [
    { to: "/forecast", Icon: Gauge, title: "Forecast", question: "Who wins the next race? Who wins the title?", teaser: fav && upcoming ? `${upcoming.event_name.replace(" Grand Prix", "")}: ${fav.name.split(" ").at(-1)} ${pct(fav.win)}` : undefined },
    { to: "/watch", Icon: Eye, title: "Worth watching", question: "Was that race worth a replay? Spoiler-free.", teaser: best ? `${latest} best: ${best.event_name.replace(" Grand Prix", "")} ${best.excitement?.toFixed(1)}` : undefined },
    { to: "/duels", Icon: Swords, title: "Teammate duels", question: "Who is really faster in the same car?" },
    { to: "/team-pace", Icon: Timer, title: "Team pace", question: "Who has the quickest car, and who is improving?" },
    { to: "/ratings", Icon: Users, title: "Driver or car?", question: "How much of a result comes from the driver, and how much from the car?" },
    { to: "/circuits", Icon: Flag, title: "Circuits", question: "What usually happens at this track?" },
    { to: "/play", Icon: Target, title: "Beat the model", question: "Can you pick the podium better than the forecast?" },
    { to: "/my", Icon: Cpu, title: "My driver", question: "How is my driver doing, and what are their chances?" },
    { to: "/simulation", Icon: Gamepad2, title: "Pit-wall game", question: "Can you out-strategise the engineer?" },
  ];
  return (
    <div className="min-h-screen pb-32 pt-10 md:pt-12 text-zinc-300">
      <div className="page space-y-10">
        <PageHead align="center" kicker="PIT_WALL" title="The" accent="pit wall" intro="Every tool, as the question it answers. Start anywhere: each one explains itself, and each shows its working." />
        <ToolCarousel tools={tools} />
        <p className="text-sm text-zinc-500">Standings and race pages have their own tools too: the race lab (replay, gaps, pace, flags, undercuts), the strategy what-if and the tyre model sit on each race, and the title maths sits on the forecast page.</p>
      </div>
    </div>
  );
}
