# Feature comparison with Fastlytics, and what is different here

Fastlytics (github.com/Fastlytics/Fastlytics, fastlytics.app) is a telemetry-first analytics site: a React app in front of a
private API, with a free tier and a paid tier for archives, long replays and an API quota. It has no forecasting.

## What it offers, and where this project stands

| Fastlytics feature | Here | Notes |
|---|---|---|
| Standings, drivers and teams | Yes | Official points, sprints included, per round, with places gained or lost |
| Standings progression (championship context) | Yes | Points and gap charts; click a round to see the standings then |
| Points scenarios | Yes, better | "What does X need?" maths plus simulated title odds |
| Calendar | Yes | With a worth-watching score on every played race |
| Race page: positions, gaps | Yes | Classification, lap-by-lap position chart, gap to the leader (exact, from timing) |
| Position over laps | Yes | Lap chart and the replay |
| Gap-to-leader chart | Yes | Race lab |
| Pace analysis / distribution | Yes | Race lab box plots on clean laps; race pace columns |
| Track evolution | Yes | Race lab: field median lap by lap, with flags |
| Tyre strategy, stints | Yes | Stint timeline with pit stops |
| Tyre degradation, compound life | Yes, fuel-corrected | Per-race tyre model that rejects fits that break physics |
| Pit window / undercut | Partly | Undercut tracker (outcomes under green flag) and a strategy what-if; no live undercut probability |
| Session incidents (SC, VSC, red flag) | Yes | Race lab, and shaded on every lap chart |
| Driver comparison, lap deltas, sector splits | Yes | Race lab: lap-by-lap delta, best sectors, top speed |
| Team pace analysis | Yes | `/team-pace`: round by round, improving or fading |
| Session replay | Yes, on a track map | Cars move round the real circuit outline; who is ahead and by how much is exact (lap timing), where a car is within a lap assumes an even pace round that lap |
| Telemetry overlays (speed, brake, throttle, gear, RPM, DRS) | Yes, fastest lap (2023 onward) | Race lab "Fastest lap telemetry": each driver's quickest lap from OpenF1 car data laid along the circuit; point at the track or trace to read the car there, run the lap, compare two drivers (ghost car, time delta). Not a full-race feed |
| Track map | Yes, zoomable | Outlines from one real lap of OpenF1 position data (26 circuits that raced since 2023). Scroll/pinch/buttons to zoom (to 10×), drag to pan, follow a car, jump to a sector; track coloured by speed, throttle, brake, RPM or gear |
| Track dominance by sector | **No** | Needs position telemetry per car; sector bests are shown as numbers instead |
| Accounts, favourite driver | Local only | "My driver" is saved on the device; nothing is sent |
| API for AI assistants (MCP) | **No** | The data API is open and read-only |

## What this project has that Fastlytics does not

- **Forecasts with a published scorecard**: race odds and title odds, backtested on seasons the model never saw, misses shown.
- **Driver or car?**: ratings that separate the driver from the car, with a plain-language verdict.
- **Teammate duels**: qualifying, race result and pace, season by season.
- **Worth watching**: an eventfulness score per race, with a spoiler-free list.
- **Strategy what-if**: other stop plans priced on the race's own tyre model.
- **Circuit profiles**: pole-to-win rate, overtaking rank, safety-car rate.
- **Beat the model**: a podium game scored against the forecast, kept on your device.
- **Everything free, no login, nothing tracked**, and every number is traceable (audit log, validation gates).

## Data and accuracy

- Sources are Jolpica-F1 (results, qualifying, sprints, standings), TracingInsights (laps, tyres, sectors, speed traps,
  flags) and OpenF1 (tyre cross-check). Nothing is generated or filled with a plausible-looking value: missing is blank.
- Cross-check: the official finishing order and the on-track order at the flag agree for 85% of finishers; the rest are
  mostly post-race time penalties and red-flag restarts.
- Forecast accuracy on unseen races is on the forecast page and in `docs/forecasting.md`. It is real, and modest by
  nature: motor racing is noisy. Adding 2019 to the training data did not change accuracy beyond noise.

- **Where it went wrong**: pick a driver and see their time lost to pit stops, slow laps and flags, with the moments worth watching and a button to jump the map replay to each.

## Closing the gaps, honestly

Telemetry is now in for each driver's fastest lap (`python -m f1data telemetry`, 2023 onward): about 20 requests a race,
resampled to 240 points that match the circuit outline, about 120 KB a file, fetched only when the race lab opens. Still
missing: telemetry for every lap of the race (tens of thousands of requests per season), true on-track positions during
the replay (cars still assume an even pace within a lap), and track dominance by sector. The replay's live-metrics card
shows the fastest lap's readings at the car's place on the track and says so on screen.
