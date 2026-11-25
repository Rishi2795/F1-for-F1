import { useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ApiRequestError } from "../lib/api";
import { readableOnDark } from "../lib/color";
import { ErrorState, RaceSkeleton } from "../components/ui/states";
import { DASH, describeMissing } from "../lib/format";
import { Block } from "../components/race/detail/block";
import { HeadToHead } from "../components/race/detail/headtohead";
import { RaceDetail } from "../components/race/detail";
import { RaceHero } from "../components/race/detail/racehero";
import { Summary } from "../components/race/detail/summary";
import { TeamCards } from "../components/race/detail/teamcards";
import type { RaceDoc } from "../types/api";

export default function RaceDashboard() {
  const { year = "", round = "" } = useParams();
  const validLink = /^\d{4}$/.test(year) && /^\d{1,2}$/.test(round);
  const { data: race, error: apiError, reload } = useApi<RaceDoc>(validLink ? `/seasons/${year}/races/${round}` : null);
  // A malformed address must show an explanation, not a loading skeleton forever.
  const error = validLink ? apiError : new ApiRequestError("Invalid link", 422, "invalid_request", null, null);
  useDocumentTitle(race ? `${race.event_name} ${race.season}` : "Race");

  if (error) {
    return (
      <div className="min-h-screen">
        <ErrorState error={error} onRetry={reload} subject="race" backTo={{ href: "/explore", label: "All races" }} />
      </div>
    );
  }
  if (!race) return <RaceSkeleton />;

  // The winning team's colour tints the whole page, the way it does on the standings pages.
  const winner = race.drivers.find((d) => d.finish === 1);
  const accent = readableOnDark(`#${(winner?.team_color ?? "e10600").replace("#", "")}`);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] pb-32 text-zinc-300 antialiased selection:bg-red-600 selection:text-white">

      <div className="relative mx-auto max-w-6xl space-y-12 px-5 pt-24 sm:px-8 md:space-y-16">
        <RaceHero race={race} accent={accent} />

        {race.quality.status !== "ok" && (
          <div role="note" className="rounded-sm border border-red-500/50 px-5 py-4 text-sm text-zinc-200">
            Some data is unavailable for this race: {describeMissing(race.quality.missing) || "see the coverage report"}. Missing values are shown as “{DASH}” rather than estimated.
          </div>
        )}

        <Block id="story-h" n="01" title="How the" accent="race went">
          <Summary race={race} />
        </Block>

        <RaceDetail race={race} />

        <Block id="teams-h" n="08" title="Team" accent="results" note="Average finish, points and places gained">
          <TeamCards drivers={race.drivers} />
        </Block>

        <Block id="h2h-h" n="09" title="Head" accent="to head" note="Pick any two drivers from this race">
          <HeadToHead drivers={race.drivers} />
        </Block>
      </div>
    </div>
  );
}
