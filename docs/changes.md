# Changes, architecture and code map

This document covers three things: **what changed** in this round of work, **how the whole system fits together** (architecture, flows, models, APIs, data), and **what every code file is for**. It also lists what was **removed because it was dead or a bottleneck**, and what was found but deliberately left alone.

Contents: [1 What changed](#1-what-changed-in-this-round) · [2 Architecture](#2-architecture) · [3 Basic flows](#3-basic-flows) · [4 Models](#4-models) · [5 APIs](#5-apis) · [6 Published data](#6-published-data-layout) · [7 Code reference](#7-code-reference-every-file-and-why-it-exists) · [8 Removed and bottlenecks](#8-removed-as-useless-and-bottlenecks-found) · [9 Verification](#9-verification) · [10 Open items](#10-open-items)

---

## 1. What changed in this round

The brief was: make the site work properly on phones (about 80% of users), with each section a single screen, a smooth snapping effect, and layouts that are not just one long column. The work, area by area:

### 1.1 Landing page (`/`): one screen per scene, on phones too

| Change | Where | Why |
|---|---|---|
| Scenes and snapping now run on **every screen with room for them** (height ≥ 520px), not just laptops | `index.css`, `lib/homescenes.ts` | Phones are the main audience. Reduced-motion users and very short windows still get a plain page |
| Every scene is **exactly one viewport** (`100svh`) and fits without clipping at 390×844, 360×640 and 412×915 | `pages/home.tsx` | "Ensure one viewport." Verified by a Playwright test that measures every scene |
| **Cube-style transition** between scenes: the scene you leave folds away from its bottom edge, the next swings in from its top edge, with depth and fade | `index.css` (keyframes `cube-in` / `cube-out`), `lib/homescenes.ts` | A smoother, more physical snap than a fade |
| Where the browser supports scroll-driven animation (Chrome, Edge, and recent Safari) the turn is a **CSS animation tied to scroll**, off the main thread; elsewhere a script computes the same turn each frame | `index.css`, `lib/homescenes.ts` (`cube-css` class) | Stays smooth even when the page is busy |
| Snapping uses **invisible anchors** (`.scene-anchor`) laid over each scene's resting position instead of the scenes themselves | `lib/homescenes.ts` | Browsers snap to a scene's *transformed* box, so a scene mid-turn pulled the page to the wrong place |
| `sceneTop()` gives a scene's resting position; the dots use it to scroll | `lib/homescenes.ts`, `components/home/scenedots.tsx` | `scrollIntoView` also uses the transformed box and misfired on a tipped scene |
| The turn is measured from **layout, never from the turned box**, with a 1% dead zone | `lib/homescenes.ts` | Measuring the turned box fed back into itself and could stick |
| **Dots only**: the red progress bar and the browser scrollbar are gone on this page; the dot rail is slimmer on phones and every scene keeps a right-hand gutter so nothing sits under it | `App.tsx`, `pages/home.tsx`, `components/home/scenedots.tsx`, `index.css` | "Two scrolls" and the rail colliding with content |
| The footer is a **snap stop** so the page can reach it | `index.css` (`.site-footer`) | Mandatory snapping used to pull the page back off the footer |
| **Tech history** on phones: a rail of eras with a red progress line plus one era card you swipe, tap or step through | `components/home/techtimeline.tsx` (`TechTimelineMobile`) | The stacked list was 1,761px tall; a swipeable viewer fits one screen |
| **The reign** on phones: a bento (the most-decorated champion large, two beneath) with years always visible; the podium bars stay for tablet and up | `pages/home.tsx` (`ReignBento`, `REIGN`) | Three thin slivers cut off names; hover-only years do not exist on touch |
| **The rules** on phones: compact two-column grid; **Hall of fame** carousel height tied to the screen | `pages/home.tsx` | Fit one screen |

### 1.2 One global footer, redesigned (`components/layout/footer.tsx`)

* Every page already rendered one footer from `AppLayout`; the landing page added a **second, fake "Credits" footer** (dead links such as "Insta" and "Discord", invented "Circuit_Vault_Tech // Proprietary_Data" branding). That one is deleted, so there is exactly one footer.
* New design: wordmark linking home, the unofficial-fan-project disclaimer, typeface toggle, a **site map** grouped like the menu (Follow the season, Predict and analyse, Play), data sources, methodology/about/source links, copyright, "data last built" date and Back to top.
* **Phones**: link lists become compact chips, so the whole footer is 793px (it was 1,231px) and fits one screen. A red accent line and glow run along the top edge.
* The wordmark reads "F1 for F1" in its text so its accessible name matches (an axe rule failed on every page until this was fixed).

### 1.3 News (`/news`): text only, laid out for phones

* **No pictures.** Pictures were tried and rolled back: the pipeline deliberately keeps only headline, teaser, date, publisher and link, and the page says it does not host or copy publishers' images. The published `news.json` was refreshed with the normal news step and is text-only.
* Phones: a compact header with a live "N new in 24h · 5 publishers" line; publisher filter as **one swipeable chip row**; the **latest story as a large type-led card**; then **one swipeable rail per day** of equal-height cards (publisher, time ago, `01/14` position, headline up to four lines, three-line teaser, "Read at … ↗" pinned to the bottom).
* Desktop is unchanged (stats board, two-column grid).
* Fixed along the way: `sr-only` text inside a horizontally scrolling rail is positioned against the page, not the rail, and made the whole page about 3,000px wide (the phone zoomed out). Rail items are now `relative` so they clip their own hidden text.

### 1.4 Schedule (`/schedule`): a phone-native design (`components/schedule/phoneschedule.tsx`)

* **Next-race card**: round number, big race name, location, a large Days/Hours/Min countdown and two actions (Full forecast, Circuit).
* **Weekend card**: the timetable as three columns (Fri / Sat / Sun) in the viewer's time zone with the Race highlighted, then win chances as bars.
* **Season deck**: the calendar is a deck of round cards you swipe sideways. A **strip of round numbers** above follows the swipe and jumps to a round when tapped. It opens on the next race. The ALL / UPCOMING / DONE filter is kept (opens on upcoming on phones). Finished rounds link to results.
* 6.8 screens down to about 3. Desktop is untouched (the old components are wrapped `max-lg:hidden`; the phone ones `lg:hidden`).

### 1.5 Drivers (`/drivers`)

Three compact portrait tiles across on phones (name, code, number; team and "raced" line hidden), one swipeable filter row, tighter header. 7.8 screens down to 4.

### 1.6 Tests changed or added

* New: landing page on a phone (every scene exactly one screen, snaps, dots present), schedule on a phone (deck, strip, filters, no sideways scroll). The old "home on a phone is an ordinary page" test was replaced because it asserted the opposite of the new behaviour.
* Scenes are reached in tests by resting position (the same reason as `sceneTop`).
* Four tests that looked up links page-wide (`Standings`, `Worth watching`) were scoped to the main nav / main content, because the new footer site map legitimately repeats those names.

### 1.7 Removed as useless (details in section 8)

Ten orphaned components (2,261 lines), the dead Driver DNA / AI-insight feature (backend stubs, frontend code, flag), an unused dependency (`recharts`), a stray root `package.json`, unreferenced images and scaffold assets, dead code in the landing page, eight more unused functions, and the boilerplate/stale docs. Lint went from **38 errors to 0**.

### 1.8 Tidy-up and layout (second pass)

**Rule applied: no file refers to another project.** `docs/features.md` (a feature-by-feature comparison with a competing product, its repository and its pricing) is deleted, the one history row in `docs/plan.md` that named that product now just describes the work, and the two links to the deleted file are gone. Libraries and data sources the project actually uses or bans (Jolpica-F1, TracingInsights, OpenF1, and the lint ban on the live-timing library in `ruff.toml`) are kept because they are attribution or an enforced guard, not comparisons; incidental mentions of that library in `docs/deploy.md`, `docs/perf-baseline.md`, `backend/app/main.py` and `.gitignore` were reworded or removed. `docs/plan.md` still describes the old stack as history.

**Files are named for what they are.** The landing page was called `about.tsx`, the race archive `home.tsx` and the About page `about_app.tsx`:

| Route | Was | Now | Component |
|---|---|---|---|
| `/` | `pages/about.tsx` | `pages/home.tsx` | `Home` |
| `/explore` | `pages/home.tsx` | `pages/racearchive.tsx` | `RaceArchive` |
| `/about_app` | `pages/about_app.tsx` | `pages/about.tsx` | `About` |

(The URLs are unchanged, so no link or test needed to move.) `components/home/` and `lib/homescenes.ts` already belonged to the landing page, so they now match its file name.

**Loose components moved into the folder they belong to** (`components/` no longer has loose files, and nothing has a capitalised or misleading name):

| Was | Now |
|---|---|
| `components/hero.tsx` | `components/home/hero.tsx` (the landing page's first scene) |
| `components/floatingdock.tsx` | `components/layout/floatingdock.tsx` |
| `components/curvescroll.tsx` (a progress bar, exported as `TopProgress`, imported as `CurveScrollRail`) | `components/layout/scrollprogress.tsx` (`ScrollProgress`) |
| `components/layout/Applayout.tsx` | `components/layout/applayout.tsx` (every other file is lower-case) |

**Docs gathered in `docs/`**: `plan.md` and this file moved in beside `deploy.md`, `forecasting.md` and `perf-baseline.md`. The repository root now holds only `README.md`, config files and the code folders. The **README was rewritten**: it promised a cloud database, "driver attributes" and a four-phase roadmap that do not match the project, and said 2020–2025.

**Repository hygiene**: `frontend/.env.example` was being ignored by the `.env.*` rule (so the one file that documents the environment variables was not in git); it is now tracked. Stale `.gitignore` entries for a MongoDB export folder and a deleted library's cache were removed. `frontend/README.md` (untouched Vite template text) was deleted. Eight unused functions were removed (below).

**A real bug found by the test run and fixed**: a link to a section of a page (`/forecast#accuracy`) scrolled to the section once, the moment it appeared. If panels above it finished loading afterwards, the section was pushed down the page and stayed there (this happened roughly 1 load in 40 on the original code too). `components/layout/applayout.tsx` now keeps the section lined up until its position has held still for about two seconds (never more than nine), and stops at once if the visitor scrolls, touches or presses a key. The test that checks it used to read the section's position once and raced the same loading; it now waits for the section to settle (80 of 80 repeated runs pass).

---

## 2. Architecture

```
  free public sources                      publish (git)                        serve                          browse
 ┌─────────────────────┐   ┌──────────────────────────────┐   ┌────────────────────────┐   ┌───────────────────────────┐
 │ Jolpica-F1  (results│   │  PIPELINE  (pipeline/f1data) │   │  API  (backend/app)     │   │  FRONTEND (frontend/src)  │
 │   standings, stops) │──▶│  ingest → build → validate   │   │  FastAPI, read-only     │   │  React 19 + Vite + TS     │
 │ TracingInsights     │   │  enrich, derive, ratings,    │   │  no database, no secrets│   │  Tailwind, framer-motion  │
 │   (laps, tyres, wx) │   │  forecasts, simulator, news, │──▶│  raw JSON bytes + ETag  │──▶│  lazy routes, 5-min cache │
 │ OpenF1 (tyre check, │   │  telemetry, replay           │   │  gzip, rate limit, CORS │   │  one useApi() per page    │
 │   telemetry, replay)│   │  Pydantic models = contract  │   └───────────┬────────────┘   └───────────────────────────┘
 │ 5 publishers' RSS   │   └──────────────┬───────────────┘               │ reads
 └─────────────────────┘                  ▼                               ▼
                              backend/data/published/**.json  ◀──── (the only thing that connects the two halves)
                              + manifest.json (content hash) + audit/*.jsonl (hash-chained log)
```

**The idea in one sentence:** all the expensive work (fetching, cleaning, modelling) happens offline in the pipeline, which publishes validated static JSON; the API is a thin read-only server over those files; the website only ever fetches finished documents. A request never calls an upstream source and never runs a model.

| Layer | Tech | Hosting | Responsibility |
|---|---|---|---|
| Pipeline | Python 3.12, Pydantic v2, numpy, requests | GitHub Actions (scheduled) and laptops | Only component that touches the outside world. Writes and validates the JSON bundle; never overwrites good data with worse |
| Data bundle | JSON files in the repo (`backend/data/published`, ≈ 75 MB) | Git | The contract between pipeline and API. Guarded by a content hash in `manifest.json` and a hash-chained audit log |
| API | FastAPI, Starlette middleware | Render | Serves files as raw bytes with ETag and gzip; request id, structured logs, security headers, rate limiting |
| Frontend | React 19, React Router 7, Vite, TypeScript, Tailwind 3, framer-motion | Vercel | Lazy-loaded pages, one typed API client with cache, all charts are hand-drawn SVG (no chart library) |
| CI/CD | GitHub Actions | GitHub | `ci.yml` (lint, tests, data validation, audit chain, build), `refresh-data.yml` (scheduled refresh opens a PR), `check-deploy.yml` (smoke test of the live API) |

**Design rules that run through the code**

1. *Missing stays missing.* A value that is unknown is `null` / an em dash, never a plausible default (`normalize.py`, `lib/format.ts`, `types/api.ts`).
2. *Pure functions where possible.* `metrics.py`, `lib/*` and `lib/sim/*` do no I/O, so they are unit-tested directly.
3. *Honest labelling.* Model cards publish accuracy, and the simulator marks assumed versus measured parts on screen.
4. *No secrets, no accounts, no tracking.* "My driver", picks and theme live in `localStorage` only.

---

## 3. Basic flows

### 3.1 Data flow: how the JSON gets made (`python -m f1data refresh`)

Run by the schedule (every 20 minutes on race days, daily otherwise) or by hand. The order matters; any failed gate returns a non-zero exit code so a bad refresh is never published.

```
1 ingest     Jolpica + TracingInsights (+ OpenF1 tyre check)  → seasons/{y}/race_{n}.json, races.json, standings.json, champions.json,
                                                                    laps/{y}/{n}.json (lapdoc.py), drivers/{CODE}.json + index.json
2 enrich     qualifying + sprint results, weekend timetable   → merged into the race files and races.json
3 news       5 RSS feeds                                      → news.json (text only; a failed feed is skipped, never fatal)
4 simmodel   fit tyre/fuel/heat/rain model from cached laps   → simulator/model.json
5 telemetry  fastest-lap car data (newest 3 races)            → telemetry/{y}/{n}.json
6 replay     per-second positions (newest 2 races) and the
              race-control feed (OpenF1)                       → replay/{y}/{n}.json, incidents/{y}/{n}.json
7 derive     excitement scores, teammate duels, team pace,
              circuit profiles (after excitement)             → duels/, teampace/, circuits/, and the excitement fields in the race files
8 ratings    pairwise driver-vs-car model                     → ratings/current.json, history/{CODE}.json, model.json
9 predict    Plackett-Luce forecast + title simulation        → predictions/{next,championship,review,model}.json
10 manifest  content hash of every JSON file                  → manifest.json
11 validate  structural checks, probabilities sum to 1, links, hash matches, audit chain intact
```

Every publish step writes an entry to `audit/*.jsonl` (each entry carries the previous entry's hash, so tampering is detectable: `verify-audit`). `Publisher.validate()` is the CI "data-quality gate".

### 3.2 Request flow: what happens when a page loads

```
Browser opens /season/2026
 └ React Router lazy-loads pages/standings (its own JS chunk)
    └ useApi("/seasons/2026/standings")                         hooks/useApi.ts
       └ apiGet(): in-memory cache (5 min) + de-dupe of identical in-flight requests,
          one retry for network errors / 502-504 (a sleeping free host), "slow request" tracking for the server notice   lib/api.ts
          └ GET https://<api>/api/seasons/2026/standings
             └ RequestContextMiddleware: request id, per-client rate limit (240/min), access log, security headers
                └ CORS → Gzip → router (seasons.py) → PublishedStore.get("seasons","2026","standings.json")
                   · path is built from validated ints/regex codes only and checked to stay inside the data folder
                   · bytes are cached in memory, re-read only when the file's mtime changes, ETag = sha256 prefix
                └ json_response(): ETag + "Cache-Control: public, max-age=300, stale-while-revalidate=3600";
                   If-None-Match matches (weakly, so CDNs that weaken ETags still work) → 304 with no body
 └ the page renders from typed data; 404 "not_available" is an expected state (future race), not an error report
```

### 3.3 Page render flow

`main.tsx` → `BrowserRouter` → `App.tsx` (global: skip link, dock, search palette, server notice, error boundary, top progress bar except on `/`) → `<AppLayout>` (dot field, `<main>`, footer; scroll-to-top / hash handling) → lazy page. Each page puts its content in `.page` (centred, max 90rem, one shared gutter) so edges line up site-wide.

### 3.4 Landing-page scene flow (phones and laptops)

```
about.tsx calls useHomeScenes()
 ├ adds html.snap-home  → CSS: scroll-snap-type y mandatory, scrollbar hidden, no overscroll bounce
 ├ if height < 520px or prefers-reduced-motion → stop here (plain page)
 ├ adds html.scenes-on, creates one invisible .scene-anchor per scene at its resting top/height (ResizeObserver keeps them in step)
 │   the page snaps to the anchors; the scenes themselves have scroll-snap-align: none
 ├ if the browser supports animation-timeline: view() → html.cube-css: each scene gets cube-in (entry) + cube-out (exit) CSS animations
 │   (fill modes: entry only "backwards", exit only "forwards" so the two never fight over transform)
 └ else → on each scroll frame compute entry/exit from layout (tops[] and heights[], not the turned box) and set the same transform
SceneDots (portal into <body>) lists [data-scene] sections; clicking a dot scrolls to sceneTop(scene)
```

### 3.5 Phone patterns used across pages

* **Swipe rail**: `flex snap-x overflow-x-auto -mx-5 px-5` with items `shrink-0 snap-center w-[82%]` and `relative` (see the `sr-only` note in 1.3). Used by News, filters, tech history, the schedule deck.
* **Gutter beside the dot rail** on the landing page, **chips instead of lists** in the footer, **3-up tiles** on Drivers.
* Desktop markup is kept and hidden with `max-lg:hidden`; phone markup is `lg:hidden`. The breakpoint is Tailwind `lg` (1024px).

---

## 4. Models

There are two kinds of "model" in this project and both are documented here: the **data models** (the Pydantic contract every published file is validated against) and the **statistical models** (what the numbers come from).

### 4.1 Data models (`pipeline/f1data/models.py`, mirrored in `frontend/src/types/api.ts`)

All inherit one base class that forbids unknown fields, so a typo in the pipeline fails loudly instead of publishing a wrong shape. 66 models:

| Model | Fields | Published as | What it is |
|---|---:|---|---|
| `Stint` | 8 |  | One run on one set of tyres: compound, laps, tyre age, and which source the compound came from. |
| `PitStop` | 3 |  | One pit stop: lap, stop number and time in the lane. |
| `FastestLap` | 4 |  | The official fastest lap of a driver (Jolpica); rank 1 = fastest of the race. |
| `StrategyRisk` | 3 |  | A driver's strategy-risk score with the reasons behind it. |
| `StrategySimulation` | 2 |  | The rule-based what-if for a driver's strategy. |
| `DriverRace` | 35 |  | One driver's whole race: grid, finish, stints, stops, pace and consistency metrics, qualifying and sprint extras. |
| `WinningRecipe` | 3 |  | The winner's strategy pattern (stops and tyre order). |
| `Derived` | 6 |  | Race-level numbers worked out from the whole field: pit payoff, strategy diversity, longest stints. |
| `Weather` | 4 |  | Air and track temperature, humidity and rain flag for the race. |
| `Winner` | 3 |  | Who won, for what team, from where on the grid. |
| `LapRef` | 3 |  | A pointer to a driver and a lap (used by Excitement). |
| `TyreWear` | 3 |  | Estimated wear per lap for a compound. |
| `Excitement` | 8 |  | The 'worth watching' score of a race, its parts and its tags. |
| `TyreCompound` | 4 |  | One compound's fuel-corrected pace offset and degradation in a race, with whether the fit passed physics checks. |
| `TyreModel` | 4 |  | The per-race tyre model: every compound fitted, plus the fuel effect. |
| `StrategyOption` | 3 |  | One alternative stop plan priced on the race's own tyre model. |
| `DriverStrategy` | 3 |  | The what-if options for one driver. |
| `Analysis` | 4 |  | The container for a race's tyre model and strategy what-ifs. |
| `Quality` | 5 |  | Data-quality flags for a race (what is missing and why). |
| `RaceDoc` | 16 | `seasons/{y}/race_{n}.json` | Everything about one race: the file the race page reads. |
| `WeekendSession` | 2 |  | One session of a race weekend (practice, qualifying, sprint, race) with its UTC start. |
| `RaceIndexEntry` | 12 | `(row of races.json)` | One row of a season's race list (name, date, status, excitement, sessions). |
| `RaceIndex` | 3 | `seasons/{y}/races.json` | A season's list of rounds. |
| `SeasonSummary` | 13 |  | A driver's line for one season (team, races, wins, podiums, points). |
| `RatingSummary` | 7 |  | Rating ranks embedded in a driver profile. |
| `DriverProfile` | 14 | `drivers/{CODE}.json` | A driver across seasons, aggregated from published races, with ratings and titles. |
| `RatingEntry` | 10 |  | One driver's current driver-skill and car-strength ratings with ranks. |
| `RatingsCurrent` | 5 | `ratings/current.json` | Today's ratings table for the latest season. |
| `RatingHistory` | 2 | `ratings/history/{CODE}.json` | A driver's skill and car strength after every race. |
| `ForecastDriver` | 15 |  | One driver's chances in one race (win, podium, points, retirement). |
| `RaceForecast` | 6 |  | The forecast for one upcoming race. |
| `NextForecasts` | 5 | `predictions/next.json` | Forecasts for every race still to come. |
| `TitleDriver` | 11 |  | A driver's title odds and final-position distribution. |
| `TitleConstructor` | 5 |  | A constructor's title odds. |
| `TitleRace` | 3 |  | A race still to come, as used by the title simulation. |
| `TitleForecast` | 10 | `predictions/championship.json` | Championship odds for drivers and constructors. |
| `ForecastReviewRow` | 10 |  | What the model said before a past race against what happened. |
| `DuelSide` | 2 |  | One teammate's numbers in a duel. |
| `DuelTally` | 3 |  | Wins for each side on a measure (qualifying, race, pace). |
| `Duel` | 14 |  | One pair of teammates over a season. |
| `DuelsDoc` | 3 | `duels/{y}.json` | All teammate duels of a season. |
| `CircuitOutline` | 3 |  | A coarse track outline built from one real lap, for drawing. |
| `TelemetryDriver` | 10 |  | One driver's fastest-lap trace (speed, throttle, brake, gear, rpm, DRS) along the circuit. |
| `TelemetryDoc` | 6 | `telemetry/{y}/{n}.json` | Fastest-lap telemetry for a race. |
| `ReplayDriver` | 8 |  | One car's position every second of the race. |
| `ReplayDoc` | 7 | `replay/{y}/{n}.json` | A real-position replay of a race. |
| `IncidentItem` | 5 |  | One interruption (safety car, VSC, red flag, retirement) with when it happened. |
| `IncidentDoc` | 4 | `incidents/{y}/{n}.json` | The incidents of a race. |
| `CircuitRace` | 10 |  | One race held at a circuit. |
| `CircuitStat` | 2 |  | One circuit statistic with its rank. |
| `CircuitDoc` | 20 | `circuits/{slug}.json` | A circuit's profile: stats, outline and every race since 2020. |
| `CircuitIndexEntry` | 7 | `circuits/index.json` | A circuit in the list, with a preview outline. |
| `LapDriver` | 10 |  | One driver's lap-by-lap times, gaps, sectors and tyre. |
| `LapIncident` | 3 |  | A flag period on specific laps. |
| `Undercut` | 5 |  | An undercut attempt and whether it worked. |
| `LapDoc` | 9 | `laps/{y}/{n}.json` | Per-lap detail for a race (the race lab's data). |
| `TeamPaceRound` | 3 |  | A team's pace in one round. |
| `TeamPaceTeam` | 6 |  | A team's pace round by round. |
| `TeamPaceDoc` | 4 | `teampace/{y}.json` | Team pace for a season. |
| `DriverListEntry` | 10 | `drivers/index.json` | A driver in the /drivers list. |
| `StandingsDriver` | 8 |  | A driver's row in the standings after a round. |
| `StandingsConstructor` | 5 |  | A constructor's row in the standings after a round. |
| `StandingsRound` | 4 |  | The standings after one round. |
| `SeasonStandings` | 5 | `seasons/{y}/standings.json` | All rounds' standings for a season. |
| `Champion` | 3 |  | A season's champion. |
| `Champions` | 2 | `champions.json` | The list of champions. |


The API itself defines **no** response models: it serves the validated bytes as written. The only API-side types are `Settings` (`backend/app/core/config.py`), `Blob` (bytes plus ETag, `core/store.py`) and `ApiError` (`core/errors.py`).

### 4.2 Statistical models

| Model | Code | What it does | How it is checked |
|---|---|---|---|
| **Tyre model** (per race) | `pipeline/f1data/tyres.py` | Fuel-corrected compound pace and wear from one race's laps; prices alternative stop plans | Fits that break physics (negative wear, etc.) are rejected and flagged |
| **Excitement / worth watching** | `derive.py`, `metrics.py` | A 0-10 eventfulness score per race, built only from things that can be counted: overtakes, lead changes, safety-car laps, grid-to-finish shuffle, the winner's margin and retirements | Shown with its components and tags |
| **Ratings** (driver vs car) | `pipeline/f1data/ratings/` | Every driver has a *skill* d, every car programme a *strength* c; pace = d + c; P(i beats j) = logistic(s_i − s_j). Teammates share c, which is what separates the two. Online gradient update after each race; shrink toward zero each season, harder when regulations change (`lineage.py`) | Walk-forward evaluation (`evaluate.py`), model card published |
| **Race forecast** | `pipeline/f1data/predict/` | Strength per driver from ratings + recent team pace + form (+ grid/qualifying gap once qualifying is in); a **Plackett-Luce** model turns strengths into finishing-order odds; retirements from a shrunk per-driver/team record; 20,000 simulated races | Settings tuned on 2021-2023, scored on 2024+ with an expanding window; winner log loss, podium/retirement Brier, calibration |
| **Championship odds** | `predict/championship.py` | Simulates the races still to come with a shared shift per team and driver so cars can change between rounds | Backtest on seasons it never saw |
| **Strategy simulator** | `pipeline/f1data/simmodel.py` (fit), `frontend/src/lib/sim/*` (run) | `time = base + circuit/compound offset + wear·age + cliff·age² + fuel·f + heat·(T−35)·age`, ridge-shrunk per circuit toward global values; wet penalties from rain races; engine modes and damp-track tyre death are published as explicit assumptions | A global-only fit is scored on held-out races; the model card says how much the circuit terms help |
| **Replay positioning** | `pipeline/f1data/replay.py`, `lib/trackmap.ts` | Who is ahead and by how much is exact (from lap timing); where a car is *within* a lap assumes an even pace round that lap, and the page says so | Cross-checked: finishing order at the flag agrees with the official order for 85% of finishers |

---

## 5. APIs

Base path `/api`. Every route accepts `GET` and `HEAD`. All return the pre-built JSON file as-is (200), a `304` when `If-None-Match` matches, or an error body (below).

| Method | Path | Serves | Notes |
|---|---|---|---|
| GET | `/health` (also `/`) | `{status, seasons}` | `ok` or `degraded` (no seasons found). Not rate-limited. Not under `/api` |
| GET | `/api/seasons` | `seasons.json` | Seasons available |
| GET | `/api/seasons/{year}/races` | `seasons/{year}/races.json` | Race index with excitement, status, weekend sessions |
| GET | `/api/seasons/{year}/standings` | `seasons/{year}/standings.json` | Drivers and constructors after each round |
| GET | `/api/seasons/{year}/team-pace` | `teampace/{year}.json` | Round-by-round car pace |
| GET | `/api/seasons/{year}/duels` | `duels/{year}.json` | Teammate duels |
| GET | `/api/seasons/{year}/races/{round}` | `seasons/{year}/race_{round}.json` | The full race document |
| GET | `/api/seasons/{year}/races/{round}/laps` | `laps/{year}/{round}.json` | Per-lap detail (race lab) |
| GET | `/api/seasons/{year}/races/{round}/telemetry` | `telemetry/{year}/{round}.json` | Fastest-lap car data (2023+) |
| GET | `/api/seasons/{year}/races/{round}/replay` | `replay/{year}/{round}.json` | Per-second positions (newest races; up to ~4 MB) |
| GET | `/api/seasons/{year}/races/{round}/incidents` | `incidents/{year}/{round}.json` | Safety cars, flags, retirements |
| GET | `/api/drivers` | `drivers/index.json` | Driver list |
| GET | `/api/drivers/{code}` | `drivers/{CODE}.json` | Profile; `code` = three letters |
| GET | `/api/ratings` | `ratings/current.json` | Current driver and car ratings |
| GET | `/api/ratings/model` | `ratings/model.json` | Model card and accuracy |
| GET | `/api/ratings/{code}` | `ratings/history/{CODE}.json` | Rating after every race |
| GET | `/api/predictions/next` | `predictions/next.json` | Odds for each race still to come |
| GET | `/api/predictions/championship` | `predictions/championship.json` | Title odds |
| GET | `/api/predictions/review` | `predictions/review.json` | Track record |
| GET | `/api/predictions/model` | `predictions/model.json` | Forecast model card |
| GET | `/api/circuits` | `circuits/index.json` | Circuits with excitement and preview outline |
| GET | `/api/circuits/{slug}` | `circuits/{slug}.json` | Circuit profile |
| GET | `/api/coverage` | `coverage.json` | What data exists for every race |
| GET | `/api/meta` | `manifest.json` | Bundle metadata and content hash |
| GET | `/api/news` | `news.json` | Headlines (text only) |
| GET | `/api/simulator/model` | `simulator/model.json` | The simulator's fitted model |
| GET | `/docs`, `/openapi.json` | Swagger | **Development only**; disabled when `APP_ENV=production` |

**Removed in this round:** `GET /api/drivers/{code}/dna` and `GET /api/ai/driver/{code}`. Both always answered 404 "planned", were only reachable behind a frontend flag that was off, and the ratings model they were waiting for shipped as `/api/ratings`.

**Deprecated, still present:** every route above is also mounted without `/api` (e.g. `/seasons`) for old frontend builds. They answer with `Deprecation: true` and each request is logged with `legacy_path`. See section 8 for when to delete them.

**Errors** (one shape everywhere, raw exception text never reaches the client):
`{"error": "<code>", "message": "...", "request_id": "..."}` with codes `not_available` (404, data not published yet: expected), `not_found`, `method_not_allowed`, `invalid_request` (422, plus `fields`), `rate_limited` (429 with `Retry-After`), `internal_error` (500).

**Cross-cutting behaviour** (`backend/app/middleware.py`, `main.py`, `core/`):

| Concern | Behaviour |
|---|---|
| Request id | Accepts a valid inbound `X-Request-ID`, else generates one; echoed on every response and in logs |
| Rate limit | Sliding one-minute window per client (hashed IP), default 240/min, in-memory and bounded to 10,000 tracked clients. `TRUST_PROXY=true` on Render so clients are not all one IP |
| CORS | `ALLOWED_ORIGINS` list; if unset, localhost and `*.vercel.app` with a startup warning. GET/HEAD/OPTIONS only, no credentials |
| Compression | Gzip for bodies ≥ 500 bytes |
| Caching | `Cache-Control: public, max-age=300, stale-while-revalidate=3600`, ETag, weak-compare `If-None-Match`; in-memory file cache keyed on mtime |
| Security headers | `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, CSP `default-src 'none'`, HSTS in production |
| Logging | Structured JSON, secrets redacted, no `print()` anywhere (lint-enforced) |
| Settings | Environment only: `APP_ENV`, `DATA_DIR`, `ALLOWED_ORIGINS`, `TRUST_PROXY`, `RATE_LIMIT_PER_MINUTE`, `LOG_LEVEL`, `LOG_IP_SALT`, `DOCS_ENABLED` |

Frontend environment: `VITE_API_URL` (must include `/api`), optional `VITE_ERROR_ENDPOINT`, optional `VITE_DRIVER_HEADSHOTS=off`. (`VITE_FEATURE_DRIVER_AI` is gone.)

---

## 6. Published data layout

`backend/data/published` (committed; ≈ 75 MB, 556 JSON files). The pipeline is the only writer.

| Path | Files | Size | Contents | Pydantic model |
|---|---:|---:|---|---|
| `manifest.json`, `seasons.json`, `coverage.json`, `champions.json` | 4 | small | Bundle hash and metadata, seasons list, coverage matrix, champions | (dicts), `Champions` |
| `news.json` | 1 | ~38 KB | 80 headlines from 5 publishers (text only) | (validated by `Publisher._news_problems`) |
| `seasons/{year}/` | 189 | 6.6 MB | `races.json`, `standings.json`, `race_{n}.json` | `RaceIndex`, `SeasonStandings`, `RaceDoc` |
| `drivers/` | 48 | 200 KB | `index.json`, `{CODE}.json` | `DriverListEntry`, `DriverProfile` |
| `circuits/` | 35 | 288 KB | `index.json`, `{slug}.json` | `CircuitIndexEntry`, `CircuitDoc` |
| `duels/` | 8 | 48 KB | `{year}.json` | `DuelsDoc` |
| `teampace/` | 8 | 64 KB | `{year}.json` | `TeamPaceDoc` |
| `incidents/` | 21 | 104 KB | `{year}/{n}.json` | `IncidentDoc` |
| `laps/` | 173 | **10 MB** | `{year}/{n}.json` | `LapDoc` |
| `telemetry/` | 19 | 2.2 MB | `{year}/{n}.json` | `TelemetryDoc` |
| `replay/` | 19 | **55 MB** | `{year}/{n}.json` (2.9 MB average, 4 MB largest) | `ReplayDoc` |
| `ratings/` | 27 | 116 KB | `current.json`, `model.json`, `history/{CODE}.json` | `RatingsCurrent`, `RatingHistory` |
| `predictions/` | 4 | 32 KB | `next`, `championship`, `review`, `model` | `NextForecasts`, `TitleForecast`, `ForecastReviewRow` |
| `simulator/model.json` | 1 | 16 KB | Fitted tyre/fuel/heat/rain model per circuit | (`simmodel.problems`) |

Guards: `manifest.json` carries a SHA-256 over every other JSON file; `validate` fails if any file was edited without republishing; `audit/audit-*.jsonl` is a hash chain over every publish.

---

## 7. Code reference: every file and why it exists

Generated from the code's own descriptions and checked so no file is missing. "Lines" is the file's current length. Test files are listed with their groups. Empty or one-line `__init__.py` files are just Python package markers (the pipeline's `ratings`, `predict` and `sources` packages describe themselves in them) and are left out of the tables.


### Backend: `backend/app`

| File | Lines | Purpose |
|---|---:|---|
| `backend/app/main.py` | 91 | F1 for F1 API: a small, read-only service over precomputed, validated data. |
| `backend/app/middleware.py` | 134 | Request id, structured access log, security headers and a small rate limiter. |
| `backend/app/core/config.py` | 56 | Runtime settings, read from environment variables. No secrets are needed or stored. |
| `backend/app/core/deps.py` | 41 | Shared FastAPI dependencies and response helpers. |
| `backend/app/core/errors.py` | 39 | One error shape for the whole API; raw exception text never reaches the client. |
| `backend/app/core/logging_setup.py` | 62 | Structured JSON logging with secret redaction. Nothing in this app calls print(). |
| `backend/app/core/store.py` | 62 | Read-only access to the published JSON bundle (written by the pipeline). |
| `backend/app/routers/circuits.py` | 30 | Circuit profiles: what has happened at each track since 2020. |
| `backend/app/routers/drivers.py` | 29 | Driver endpoints (aggregated from published races). |
| `backend/app/routers/meta.py` | 43 | Health, data coverage and bundle metadata. |
| `backend/app/routers/predictions.py` | 34 | Race and championship forecasts (published by the pipeline's forecast model). |
| `backend/app/routers/ratings.py` | 40 | Driver and car ratings (published by the pipeline's rating model). |
| `backend/app/routers/seasons.py` | 110 | Season and race endpoints. Read-only; data comes from the published bundle. |

### Backend tests: `backend/tests` (33 tests)

| File | Lines | Purpose |
|---|---:|---|
| `backend/tests/conftest.py` | 64 | Test client over a tiny fake published bundle written to a temp folder. |
| `backend/tests/test_api.py` | 218 | Every endpoint: shapes, 404s, ETag/304, path traversal, rate limit, CORS, headers, deprecated root routes. |
| `backend/tests/test_logging.py` | 7 | Secrets are redacted from log output. |

### Pipeline: `pipeline/f1data`

The pipeline is the only thing that talks to the outside world. It writes the JSON the API serves.

| File | Lines | Purpose |
|---|---:|---|
| `pipeline/f1data/__main__.py` | 5 |  |
| `pipeline/f1data/audit.py` | 99 | Append-only, hash-chained audit log (JSON Lines). |
| `pipeline/f1data/build.py` | 406 | Assemble one published RaceDoc from the sources. Missing data stays missing. |
| `pipeline/f1data/cli.py` | 533 | Command line entry point:  python -m f1data <command> |
| `pipeline/f1data/config.py` | 26 | Paths and settings. Everything is overridable by environment variable; no secrets here. |
| `pipeline/f1data/consistency.py` | 43 | Season-wide clean-up that needs more than one race at a time. |
| `pipeline/f1data/coverage.py` | 75 | Coverage matrix: for every expected race, which kinds of data we actually have. |
| `pipeline/f1data/derive.py` | 418 | Things worked out from the published races: excitement, teammate duels, circuit profiles. |
| `pipeline/f1data/errors.py` | 17 | Typed errors so callers can tell "source is down" from "source has no data". |
| `pipeline/f1data/export.py` | 638 | Write the published JSON bundle. Never overwrites good data with worse data. |
| `pipeline/f1data/extras.py` | 84 | Qualifying and sprint results, added to published races without rebuilding them. |
| `pipeline/f1data/headshots.py` | 59 | Links to the official driver portraits. |
| `pipeline/f1data/http.py` | 129 | The single HTTP client every JSON source uses: throttle, retry, timeout, disk cache. |
| `pipeline/f1data/lapdoc.py` | 188 | Per-lap detail for one race: lap times, gap to the leader, sector bests, top speeds, flags and undercuts. |
| `pipeline/f1data/logging_setup.py` | 72 | Structured logging for the pipeline. One setup function; nobody calls print(). |
| `pipeline/f1data/maps.py` | 111 | Circuit outlines from real position data. |
| `pipeline/f1data/metrics.py` | 324 | Race and driver metrics. Pure functions: easy to test, no I/O. |
| `pipeline/f1data/models.py` | 697 | Published data contract. Everything the website reads is validated through these models. |
| `pipeline/f1data/news.py` | 126 | Motorsport headlines, collected from the publishers' own public RSS feeds. |
| `pipeline/f1data/normalize.py` | 61 | The one place that turns messy upstream values (NaN, 'None', '') into real None. |
| `pipeline/f1data/predict/championship.py` | 213 | Championship odds by simulating the races still to come, with a backtest on seasons the model never saw. |
| `pipeline/f1data/predict/evaluate.py` | 328 | Walk-forward evaluation of the race forecast. |
| `pipeline/f1data/predict/plackett.py` | 123 | Plackett-Luce: the probability of a whole finishing order from one strength per driver. |
| `pipeline/f1data/predict/publish.py` | 16 | Write the forecast files the website reads. |
| `pipeline/f1data/predict/report.py` | 281 | Build the forecast documents the website reads: next races, championship odds, model card, track record. |
| `pipeline/f1data/predict/state.py` | 180 | Pre-race knowledge, built only from races that already happened. |
| `pipeline/f1data/ratings/data.py` | 52 | Load the published race documents as light records for the rating model. |
| `pipeline/f1data/ratings/evaluate.py` | 249 | Walk-forward evaluation engine for the rating model. |
| `pipeline/f1data/ratings/lineage.py` | 31 | Which team is "the same car programme" across seasons, and when the rules reset the pecking order. |
| `pipeline/f1data/ratings/model.py` | 105 | The rating model. |
| `pipeline/f1data/ratings/publish.py` | 43 | Write the rating files the website reads. |
| `pipeline/f1data/ratings/report.py` | 162 | Assemble everything the site publishes about the ratings: current values, history and the model card. |
| `pipeline/f1data/replay.py` | 365 | A real replay of the race: where every car was, and what it was doing, once a second. |
| `pipeline/f1data/schedule.py` | 35 | The weekend timetable (practice, qualifying, sprint, race) for each round, merged into the season's race index. |
| `pipeline/f1data/simmodel.py` | 596 | The strategy simulator's model: how lap time responds to tyres, fuel, heat and rain, fitted from real race laps. |
| `pipeline/f1data/sources/jolpica.py` | 364 | Jolpica-F1 (Ergast successor): schedule, results, pit stops. Free, no key. |
| `pipeline/f1data/sources/openf1.py` | 149 | OpenF1: free historical stints/tyres for 2023+. Used as a fallback when the |
| `pipeline/f1data/sources/tracinginsights.py` | 244 | TracingInsights per-year GitHub repos: per-lap compound/stint/tyre-age/weather, 2018+. |
| `pipeline/f1data/standings.py` | 65 | Build a season's championship standings document from official standings plus our race data. |
| `pipeline/f1data/telemetry.py` | 182 | Fastest-lap car data for each driver, laid along the circuit. |
| `pipeline/f1data/tyres.py` | 230 | Fuel-corrected tyre behaviour and a strategy what-if, from one race's lap times. |

### Pipeline tests: `pipeline/tests` (162 tests)

| File | Lines | Purpose |
|---|---:|---|
| `pipeline/tests/test_audit_export.py` | 105 | Unit tests for `audit export` (8 tests) |
| `pipeline/tests/test_build.py` | 99 | Unit tests for `build` (11 tests) |
| `pipeline/tests/test_consistency.py` | 31 | Unit tests for `consistency` (2 tests) |
| `pipeline/tests/test_derive.py` | 124 | Unit tests for `derive` (7 tests) |
| `pipeline/tests/test_extras.py` | 77 | Unit tests for `extras` (6 tests) |
| `pipeline/tests/test_fill.py` | 135 | Unit tests for `fill` (14 tests) |
| `pipeline/tests/test_headshots.py` | 42 | Unit tests for `headshots` (3 tests) |
| `pipeline/tests/test_lapdoc.py` | 85 | Unit tests for `lapdoc` (8 tests) |
| `pipeline/tests/test_maps.py` | 45 | Unit tests for `maps` (4 tests) |
| `pipeline/tests/test_metrics.py` | 56 | Unit tests for `metrics` (8 tests) |
| `pipeline/tests/test_news.py` | 56 | Unit tests for `news` (5 tests) |
| `pipeline/tests/test_normalize_parse.py` | 37 | Unit tests for `normalize parse` (4 tests) |
| `pipeline/tests/test_predict.py` | 137 | Unit tests for `predict` (11 tests) |
| `pipeline/tests/test_predict_publish.py` | 65 | Unit tests for `predict publish` (3 tests) |
| `pipeline/tests/test_race_detail.py` | 81 | Unit tests for `race detail` (8 tests) |
| `pipeline/tests/test_ratings.py` | 149 | Unit tests for `ratings` (11 tests) |
| `pipeline/tests/test_ratings_publish.py` | 70 | Unit tests for `ratings publish` (5 tests) |
| `pipeline/tests/test_replay.py` | 111 | Unit tests for `replay` (9 tests) |
| `pipeline/tests/test_schedule.py` | 30 | Unit tests for `schedule` (2 tests) |
| `pipeline/tests/test_simmodel.py` | 95 | Unit tests for `simmodel` (5 tests) |
| `pipeline/tests/test_sources.py` | 71 | Unit tests for `sources` (6 tests) |
| `pipeline/tests/test_standings.py` | 104 | Unit tests for `standings` (6 tests) |
| `pipeline/tests/test_telemetry.py` | 67 | Unit tests for `telemetry` (5 tests) |
| `pipeline/tests/test_tyres.py` | 79 | Unit tests for `tyres` (5 tests) |
| `pipeline/tests/helpers.py` | 22 | Shared builders for fake races and sources. |
| `pipeline/tests/predict_helpers.py` | 41 | Builders for forecast tests. |
| `pipeline/tests/ratings_helpers.py` | 44 | Builders for rating tests. |

### Operator scripts: `scripts`

Run by people (or the deploy-check workflow), never by the app.

| File | Lines | Purpose |
|---|---:|---|
| `scripts/check_deploy.py` | 194 | Smoke-test a deployed F1 for F1 API and report PASS/FAIL for each expectation. |
| `scripts/commons_photos.py` | 285 | Find freely licensed driver photos on Wikimedia Commons, review them, and register the ones you approve. |
| `scripts/verify_events.py` | 102 | Cross-check the three things the race lab displays about a race: results, pit stops, retirements. |

### Frontend entry: `frontend/src`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/main.tsx` | 17 | Mounts the app inside the router, error boundary and global styles. |
| `frontend/src/App.tsx` | 95 | Route table (lazy-loaded pages: Home `/`, RaceArchive `/explore`, About `/about_app`, …), global dock, search palette, server notice, skip link, and the top progress bar on every page except `/`. |
| `frontend/src/index.css` | 391 | Tailwind layers, the `.page` layout rule, fluid type scale, dot-field background, the cube-turn keyframes, scene snapping and the mobile gutter beside the dots. |

### Pages: `frontend/src/pages` (one per route)

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/pages/about.tsx` | 171 | `/about_app` What the project is, where the data comes from, what it will not pretend, and who made it. |
| `frontend/src/pages/circuit.tsx` | 163 | `/circuit/:slug` One circuit: track drawn from a real lap, what to expect (pole-to-win rate, overtaking rank, safety-car rate) and every race held there. |
| `frontend/src/pages/circuits.tsx` | 47 | `/circuits` Every track with search and a thumbnail drawn from real position data. |
| `frontend/src/pages/driverprofile.tsx` | 234 | `/driver/:code` One driver: career table, season-by-season, ratings card, this-weekend chances (current grid only), pinned portrait card. |
| `frontend/src/pages/drivers.tsx` | 128 | `/drivers` Every driver since 2020 as portrait tiles (3 across on phones) with search and All / On the grid / Champions filters. |
| `frontend/src/pages/duels.tsx` | 105 | `/duels` Teammate head-to-heads per season: qualifying, race result and pace. |
| `frontend/src/pages/forecast.tsx` | 73 | `/forecast` Next-race odds, title odds, possible final standings, track record and the model card. |
| `frontend/src/pages/home.tsx` | 678 | `/` The landing page: seven full-screen scenes (hero, 2026 cars, engineering, the reign, tech history, hall of fame, the rules) that turn like faces of a cube as you scroll. |
| `frontend/src/pages/methodology.tsx` | 203 | `/methodology` How every number and model works, with live data-coverage figures and a chapter index. |
| `frontend/src/pages/my.tsx` | 86 | `/my` 'My driver': a briefing on the driver you pick, saved on this device only. |
| `frontend/src/pages/news.tsx` | 167 | `/news` Headlines from five publishers: text only, linking out. Phones get a top story plus swipeable per-day rails. |
| `frontend/src/pages/notfound.tsx` | 21 | The 404 page for any unknown address. |
| `frontend/src/pages/pitwall.tsx` | 40 | `/pitwall` The hub of analysis tools, each shown as the question it answers (a 3D ring carousel). |
| `frontend/src/pages/play.tsx` | 109 | `/play` 'Beat the model': pick a podium, get scored against the forecast; picks kept on the device. |
| `frontend/src/pages/racearchive.tsx` | 158 | `/explore` The race archive: every race with search, season filter and a worth-watching score. |
| `frontend/src/pages/racedashboard.tsx` | 65 | `/race/:year/:round` One race: story, results, qualifying ladder, lap chart, tyre strategy, pace, team cards, head-to-head. |
| `frontend/src/pages/racelab.tsx` | 74 | `/race/:year/:round/lab` The race lab: map replay, telemetry, gap and pace charts, incidents, 'where it went wrong'. |
| `frontend/src/pages/ratings.tsx` | 126 | `/ratings` Driver or car? Ratings that separate driver skill from car strength. |
| `frontend/src/pages/schedule.tsx` | 227 | `/schedule` The calendar: next race with countdown, weekend timetable in your time zone, forecast. Desktop: month lists. Phones: see components/schedule. |
| `frontend/src/pages/simulation.tsx` | 232 | `/simulation` The strategy simulator: plan stops, add rain and safety cars, test across hundreds of simulated races or race live. |
| `frontend/src/pages/standings.tsx` | 425 | `/standings` (redirects to the latest season) and `/season/:year`: drivers and constructors tables, podium, points progression, pick-a-round. |
| `frontend/src/pages/teampace.tsx` | 97 | `/team-pace` Round-by-round car pace: who is improving, who is fading. |
| `frontend/src/pages/watch.tsx` | 82 | `/watch` 'Worth watching': a spoiler-free list of races ranked by how eventful they were. |

### Hooks: `frontend/src/hooks`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/hooks/useApi.ts` | 34 | Fetch `path` (relative to the API base) |
| `frontend/src/hooks/useCountUp.ts` | 22 | Animate a number from 0 to `target` |
| `frontend/src/hooks/useDocumentTitle.ts` | 10 | Set the browser tab title for the current page |
| `frontend/src/hooks/useLocalState.ts` | 32 | State that survives a reload, kept on this device only (nothing is sent anywhere) |

### API types: `frontend/src/types`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/types/api.ts` | 417 | Types for the published data contract (see pipeline/f1data/models.py) |

### Components: `src/components/about`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/about/abouthero.tsx` | 141 | Drivers' fastest laps raced against each other, a few colours to tell them apart |
| `frontend/src/components/about/countup.tsx` | 16 | A number that counts up from zero the first time it scrolls into view (and simply shows the value with reduced motion) |

### Components: `src/components/circuit`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/circuit/trackart.tsx` | 10 | A small outline for a card |
| `frontend/src/components/circuit/trackglow.tsx` | 40 | A circuit as a glowing red line on black, drawn from a real lap: the line traces itself in, then a light runs the lap |

### Components: `src/components/driver`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/driver/weekendpanel.tsx` | 48 | For a driver on this season's grid: their chances next race, in the title fight, and against their teammate |

### Components: `src/components/forecast`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/forecast/accuracy.tsx` | 75 | How good the forecasts are on races the model never saw, in plain terms |
| `frontend/src/components/forecast/modelsection.tsx` | 27 | Methodology section for the forecasts: what goes in, how odds are made, and where to see the scores |
| `frontend/src/components/forecast/possiblestandings.tsx` | 69 | How the table might end: each driver's most likely final place, how likely each place is, and a typical points range |
| `frontend/src/components/forecast/probbar.tsx` | 17 | A probability as a number and a flat bar |
| `frontend/src/components/forecast/racepanel.tsx` | 95 | The next race(s): a plain headline, then every driver's chances |
| `frontend/src/components/forecast/titlepanel.tsx` | 119 | Title odds for drivers and constructors, with a plain statement when a title is already decided |
| `frontend/src/components/forecast/trackrecord.tsx` | 44 | What the model said before each recent race against what happened, misses included |

### Components: `src/components/home`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/home/hero.tsx` | 136 | The landing page's first scene: the car cut-out, title and 'Start exploring' link, with a pointer parallax. |
| `frontend/src/components/home/scenedots.tsx` | 60 | A column of dots down the right edge: one per scene, the current one lit |
| `frontend/src/components/home/techtimeline.tsx` | 161 | The history of F1 technology as one big, readable panel at a time: a rail of eras along the top (click or use the arrow keys), and the chosen era below in large type, wit |

### Components: `src/components/layout`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/layout/applayout.tsx` | 61 | AppLayout wraps every routed page: a faint dot field for the glass surfaces to sit on, the page itself (which eases in on each route change), and the footer |
| `frontend/src/components/layout/floatingdock.tsx` | 92 | The bottom dock on every page: five main places, Menu and search; fades when idle. |
| `frontend/src/components/layout/footer.tsx` | 169 | One footer for every page: who made this, where the data comes from, a map of the site, and when the data was last built |
| `frontend/src/components/layout/menusheet.tsx` | 121 | The full menu: every page of the site, grouped, so nothing is only reachable by knowing where to look |
| `frontend/src/components/layout/scrollprogress.tsx` | 24 | A thin red scroll-progress bar fixed at the top of every page except the landing page. |

### Components: `src/components/methodology`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/methodology/chapter.tsx` | 65 | A numbered chapter: a red [01], a large italic title and a hairline, then its content |

### Components: `src/components/pitwall`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/pitwall/carousel.tsx` | 198 | One accent per card, always from the site's own palette (red, white, amber, sky, emerald), in a fixed order |

### Components: `src/components/race`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/race/detail/block.tsx` | 13 | A numbered section: heading, then content that fades up as it scrolls into view |
| `frontend/src/components/race/detail/headtohead.tsx` | 83 | Compare two numbers where lower (or higher) wins; no winner when either is missing or they tie |
| `frontend/src/components/race/detail/highlights.tsx` | 30 | The headline numbers of a race |
| `frontend/src/components/race/detail/index.tsx` | 51 | Everything the timing data says about one race, in reading order |
| `frontend/src/components/race/detail/lapchart.tsx` | 100 | Position after every lap (lap 0 = the grid) |
| `frontend/src/components/race/detail/pacecolumns.tsx` | 56 | Race pace as columns, quickest on the left |
| `frontend/src/components/race/detail/qualifying.tsx` | 51 | Qualifying as a ladder: how far each car was from the pole lap, and where they finished against where they started |
| `frontend/src/components/race/detail/racehero.tsx` | 92 | The page's fixed top bar and its title block, as on the original race page |
| `frontend/src/components/race/detail/resultsheet.tsx` | 42 | The classification: how each driver finished, and how far behind the winner |
| `frontend/src/components/race/detail/sectionhead.tsx` | 20 | The race page's section label, as on the original page: a red [01], a wide-tracked italic title in TITLE_CASE_WITH_UNDERSCORES, and a hairline running to the edge |
| `frontend/src/components/race/detail/strategychart.tsx` | 90 | Every driver's race as one strip across the laps: tyre stints coloured by compound, pit stops marked |
| `frontend/src/components/race/detail/summary.tsx` | 57 | The original bento: the race told in serif italic on black, beside a white STRATEGY_WINDOW panel |
| `frontend/src/components/race/detail/teamcards.tsx` | 46 | One card per team: how its cars finished on average, and how many places they made up in total |
| `frontend/src/components/race/detail/tyrelab.tsx` | 76 | What this race's tyres did (fuel-corrected), and what other stop plans would have cost on those tyres alone |

### Components: `src/components/racelab`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/racelab/compare.tsx` | 80 | Two drivers head to head: lap-by-lap time difference, plus best sectors and top speed |
| `frontend/src/components/racelab/eventfeed.tsx` | 54 | What happened in the race, in order: pit stops, passes, retirements and what race control said |
| `frontend/src/components/racelab/evolution.tsx` | 34 | The field's typical lap time across the race: it falls as the track rubbers in and cars burn fuel, and jumps after flags |
| `frontend/src/components/racelab/gapchart.tsx` | 64 | How far behind the race leader each chosen car was at the end of every lap |
| `frontend/src/components/racelab/gauge.tsx` | 39 | A speedometer from 0 to 400 km/h, drawn as an arc with a needle, like a dashboard |
| `frontend/src/components/racelab/incidents.tsx` | 50 | What interrupted the race, and which pit-stop gambles worked |
| `frontend/src/components/racelab/paceboxes.tsx` | 36 | The spread of each driver's clean lap times: where the middle half sits (box), the median (tick) and the extremes |
| `frontend/src/components/racelab/replay.tsx` | 51 | A lap-by-lap replay of the order: who led, on what tyre, how far back, and whether a flag was out |
| `frontend/src/components/racelab/telemetrylab.tsx` | 252 | Every driver's fastest lap on the circuit: zoom in, point at any spot on the track or the trace, or run the lap, and read what the car was doing there — speed, throttle,  |
| `frontend/src/components/racelab/trackreplay.tsx` | 280 | The race played back on the circuit |
| `frontend/src/components/racelab/usezoompan.ts` | 149 | Zoom, pan and follow logic for the SVG track map. |
| `frontend/src/components/racelab/wrong.tsx` | 58 | Pick a driver and see where their race slipped away, with a button to watch each moment on the map |
| `frontend/src/components/racelab/zoomsvg.tsx` | 13 | A small SVG wrapper that applies the zoom/pan transform from usezoompan. |

### Components: `src/components/ratings`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/ratings/drivercarmap.tsx` | 73 | Each driver as a dot: further right = stronger car, higher up = stronger driver |
| `frontend/src/components/ratings/modelcard.tsx` | 92 | Methodology section for the ratings model |
| `frontend/src/components/ratings/ratingchart.tsx` | 52 | Driver skill and car strength over time, one point per race |
| `frontend/src/components/ratings/ratingpanel.tsx` | 66 | Rating card for a driver profile, in ranks and words rather than raw scores |

### Components: `src/components/schedule`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/schedule/phoneschedule.tsx` | 236 | The weekend as three short columns (Fri, Sat, Sun), times in the viewer's own time zone |

### Components: `src/components/search`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/search/commandpalette.tsx` | 108 | Cmd/Ctrl+K: jump to any driver, race, circuit or page |

### Components: `src/components/sim`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/sim/bits.tsx` | 41 | A tyre as a coloured ring with its letter |
| `frontend/src/components/sim/controls.tsx` | 104 | Schedule race control: a safety car, a VSC or a red flag at the laps you choose, or leave it to the circuit's history |
| `frontend/src/components/sim/format.ts` | 18 | Number/time formatting helpers shared by the simulator panels. |
| `frontend/src/components/sim/fx.tsx` | 78 | Fades and lifts its content in, a beat after its neighbours |
| `frontend/src/components/sim/live.tsx` | 319 | Drive the race yourself: the order, the tyres, the weather and the safety car, one lap at a time |
| `frontend/src/components/sim/modelcard.tsx` | 35 | What the simulator is made of: what was measured from real laps, and what is an explicit assumption |
| `frontend/src/components/sim/optimiser.tsx` | 167 | The best strategy found, when conditions help or hurt it, and what is best if the race goes a particular way |
| `frontend/src/components/sim/pitwall.tsx` | 96 | The pit wall's call: what the engineers would do, with the odds |
| `frontend/src/components/sim/planner.tsx` | 182 | The simulator's plan editor: stints, tyres, engine modes and pit laps. |
| `frontend/src/components/sim/results.tsx` | 114 | The simulator's results: finishing-position spread, strategy comparison and verdict. |
| `frontend/src/components/sim/setup.tsx` | 140 | The simulator's setup panel: circuit, weather, safety-car handling and number of runs. |

### Components: `src/components/standings`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/standings/podium.tsx` | 132 | The top three, arranged like a podium on every screen: P2 – P1 – P3, the leader tallest |
| `frontend/src/components/standings/progressionchart.tsx` | 215 | Championship points after each round |

### Components: `src/components/ui`

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/components/ui/championbadge.tsx` | 17 | "World Champion ×N" tag |
| `frontend/src/components/ui/chipstyle.ts` | 5 | Square buttons in the site's label style: quiet until hovered, solid white when chosen |
| `frontend/src/components/ui/cuboid.tsx` | 48 | A stack of faces that tilt as they roll past on laptop-sized screens (used on the driver page); plain on phones. |
| `frontend/src/components/ui/datatable.tsx` | 47 | One table look for the whole site, taken from the standings table: a soft rounded frame, small tracked header, hairline rows that light up on hover, an italic position an |
| `frontend/src/components/ui/driveravatar.tsx` | 23 | A round driver picture for tables and lists |
| `frontend/src/components/ui/errorboundary.tsx` | 30 | Catches render errors in a route so one broken page cannot blank the whole app |
| `frontend/src/components/ui/pagehead.tsx` | 32 | The opening of a page |
| `frontend/src/components/ui/reveal.tsx` | 28 | Fades its content up the first time it scrolls into view |
| `frontend/src/components/ui/scorebar.tsx` | 13 | A 0-10 score as a number and a flat bar |
| `frontend/src/components/ui/seasonchips.tsx` | 12 | A row of season chips, newest first |
| `frontend/src/components/ui/servernotice.tsx` | 17 | Explains a long wait instead of leaving a spinner that looks like a broken site |
| `frontend/src/components/ui/statboard.tsx` | 41 | A board of 2-4 headline stat tiles; numbers count up. |
| `frontend/src/components/ui/states.tsx` | 77 | Shared loading skeletons, the page loader, and the error and empty states. |
| `frontend/src/components/ui/tablestyle.ts` | 6 | Class names shared by every data table. |
| `frontend/src/components/ui/themetoggle.tsx` | 17 | Switch the display type between the dot-matrix look and the classic one |

### Libraries: `frontend/src/lib` (pure logic, no UI)

Unit tests sit beside these as `*.test.ts` (23 files, 114 tests).

| File | Lines | Purpose |
|---|---:|---|
| `frontend/src/lib/api.ts` | 121 | Base URL of the API (must include /api) |
| `frontend/src/lib/color.ts` | 43 | Colour helpers for drawing team colours on the dark page |
| `frontend/src/lib/compounds.ts` | 8 | Tyre compound colours used wherever a stint is drawn |
| `frontend/src/lib/driverimages.ts` | 19 | Which picture to show for a driver: a photo we hold a licence for comes first, then Formula 1's official portrait, then nothing (the caller draws the number design) |
| `frontend/src/lib/driverphotos.ts` | 60 | The photos we are allowed to show, from /drivers/credits.json |
| `frontend/src/lib/events.ts` | 101 | Race-time helpers for the replay: when a car completed a lap, order at a time, event feed. |
| `frontend/src/lib/forecast.ts` | 33 | 0.317 -> "32%", 0.034 -> "3.4%", 0.0004 -> "<1%", 0.9996 -> ">99%" |
| `frontend/src/lib/format.ts` | 45 | Display helpers |
| `frontend/src/lib/headshots.ts` | 21 | Official driver portraits: a standard studio shot in team kit, on a transparent background, published by Formula 1 |
| `frontend/src/lib/homescenes.ts` | 128 | The home page as full-screen scenes |
| `frontend/src/lib/images.ts` | 7 | For third-party images we do not control: if one fails (blocked hotlink, 404), hide it instead of showing the browser's broken-image icon and alt text |
| `frontend/src/lib/laps.ts` | 79 | Laps a driver was in the pit lane or on an out-lap: the end of each stint but the last, and the lap after |
| `frontend/src/lib/pending.ts` | 43 | Tracks API requests that are taking suspiciously long, so the UI can explain why |
| `frontend/src/lib/picks.ts` | 7 | Scoring for the podium game: 3 points for the right driver in the right place, 1 for a podium finisher in the wrong place |
| `frontend/src/lib/racestory.ts` | 31 | Short, factual sentences about how a race went, built only from the race's own data |
| `frontend/src/lib/ratings.ts` | 43 | Turns rating numbers into ranks and plain words. |
| `frontend/src/lib/replay.ts` | 40 | Blending of replay samples (a missing end gives a missing result, never an invented value). |
| `frontend/src/lib/report.ts` | 29 | Central error reporting |
| `frontend/src/lib/schedule.ts` | 47 | The moment a race starts: the "Race" session if the timetable has one, else null (we only know the day) |
| `frontend/src/lib/slug.ts` | 2 | "Monte Carlo" -> "monte-carlo": the same rule the pipeline uses for circuit addresses |
| `frontend/src/lib/tag.ts` | 2 | "Lead over 2nd" -> "LEAD_OVER_2ND": the site's label style (see the landing page's REF_09.5, CAPITAL_ALLOCATION) |
| `frontend/src/lib/telemetry.ts` | 110 | Blending and lookup helpers for fastest-lap telemetry along the circuit. |
| `frontend/src/lib/theme.ts` | 69 | "classic" keeps the site's own type; "dot" sets the display type (headlines and big numbers) in a dot-matrix face |
| `frontend/src/lib/timeago.ts` | 13 | "just now", "5 min ago", "3 h ago", "2 days ago", then a date |
| `frontend/src/lib/titlemaths.ts` | 24 | Points a driver can gain on a rival in one weekend: a Grand Prix win and a sprint win, while the rival scores nothing |
| `frontend/src/lib/trackmap.ts` | 57 | Where a car is on the lap at a given race time, from lap timing alone. |
| `frontend/src/lib/wrong.ts` | 75 | Where one driver lost time in a race, measured against their own clean pace, and what to look at first |
| `frontend/src/lib/sim/advisor.ts` | 150 | The pit-wall advisor: the one best thing to do right now, with odds. |
| `frontend/src/lib/sim/fixture.ts` | 46 | A small invented model for unit tests (round numbers). Test-only. |
| `frontend/src/lib/sim/montecarlo.ts` | 106 | Runs a plan across many simulated races (fixed or circuit-typical weather) and summarises the spread. |
| `frontend/src/lib/sim/optimise.ts` | 95 | Searches for the best strategy over the circuit's usual mix of luck. |
| `frontend/src/lib/sim/physics.ts` | 83 | How wet the track is on a lap, and the lap-time physics (tyre, fuel, heat, rain). |
| `frontend/src/lib/sim/plan.ts` | 205 | Plan validation (legal race?), construction and edits. |
| `frontend/src/lib/sim/race.ts` | 487 | The live race engine: the player's car takes commands lap by lap against a 22-car field. |
| `frontend/src/lib/sim/rng.ts` | 17 | A small seeded random generator so a simulated race can be replayed exactly. |
| `frontend/src/lib/sim/types.ts` | 112 | Types for a plan, a stint, tyre compounds and engine modes. |

### Frontend unit tests (Vitest, 23 files / 114 tests)

`src/lib/api.test.ts`, `src/lib/color.test.ts`, `src/lib/driverphotos.test.ts`, `src/lib/events.test.ts`, `src/lib/forecast.test.ts`, `src/lib/headshots.test.ts`, `src/lib/laps.test.ts`, `src/lib/pending.test.ts`, `src/lib/picks.test.ts`, `src/lib/racestory.test.ts`, `src/lib/ratings.test.ts`, `src/lib/replay.test.ts`, `src/lib/schedule.test.ts`, `src/lib/sim/control.test.ts`, `src/lib/sim/optimise.test.ts`, `src/lib/sim/physics.test.ts`, `src/lib/sim/plan.test.ts`, `src/lib/sim/race.test.ts`, `src/lib/telemetry.test.ts`, `src/lib/timeago.test.ts`, `src/lib/titlemaths.test.ts`, `src/lib/trackmap.test.ts`, `src/lib/wrong.test.ts`, `tests/photo-registry.test.ts`

### Browser tests: `frontend/e2e` (Playwright, 164 tests)

| File | Lines | Purpose |
|---|---:|---|
| `frontend/e2e/a11y.spec.ts` | 45 | axe accessibility scan of 27 routes (no serious violations). |
| `frontend/e2e/about.spec.ts` | 23 | Landing hero, live numbers, links; reduced-motion hero. |
| `frontend/e2e/cuboid.spec.ts` | 58 | Driver page: pinned card and turning cards on laptop, plain on phone/tablet. |
| `frontend/e2e/features.spec.ts` | 505 | The big feature suite: champions, standings, copy link, free-hosting notice, keyboard/landmarks, footer & methodology, forecast, pit wall tools, race lab, team pace, replay, search palette. |
| `frontend/e2e/menu.spec.ts` | 63 | The full-screen menu. |
| `frontend/e2e/photos.spec.ts` | 43 | Official portraits and the simulator link; fallbacks when a portrait fails. |
| `frontend/e2e/racelab.spec.ts` | 80 | Race lab replay, fastest-lap telemetry, older races. |
| `frontend/e2e/schedule.spec.ts` | 138 | Schedule (desktop and phone deck), news, forecast standings, pit-wall ring, methodology, ratings. |
| `frontend/e2e/scroll.spec.ts` | 110 | Scroll position, no sideways scroll at 360/768/1024, landing scenes (desktop + phone), schedule scene. |
| `frontend/e2e/simulator.spec.ts` | 137 | The strategy simulator end to end. |
| `frontend/e2e/theme.spec.ts` | 34 | Typeface toggle. |
| `frontend/e2e/ui.spec.ts` | 334 | Calendar, race page, bad addresses, resilience, drivers, standings, assets. |

### Frontend config and static files

| File | Purpose |
|---|---|
| `frontend/index.html` | The single HTML page: title, description, theme colour, favicon. |
| `frontend/package.json` | Dependencies and scripts (dev, build, lint, test, e2e). |
| `frontend/vite.config.ts` | Vite + Vitest config; splits react and framer-motion into their own long-cached chunks. |
| `frontend/tailwind.config.cjs` | Tailwind theme (fonts, colours). |
| `frontend/postcss.config.cjs` | PostCSS: Tailwind and autoprefixer. |
| `frontend/eslint.config.js` | Lint rules (no console, hooks rules, no explicit any). |
| `frontend/tsconfig*.json` | TypeScript project references (app and node configs). |
| `frontend/playwright.config.ts` | Starts the real API and a production preview, then runs the browser tests. |
| `frontend/vercel.json` | Vercel: SPA rewrite, security headers, CSP (report-only), long cache for hashed assets. |
| `frontend/.env.example` | Documents VITE_API_URL, VITE_ERROR_ENDPOINT, VITE_DRIVER_HEADSHOTS (tracked in git; it was being ignored by mistake). |
| `frontend/package-lock.json` | Exact dependency versions for reproducible installs (`npm ci`). |
| `frontend/public/logo.svg` | Favicon. |
| `frontend/public/f1_new-hd.webp, top_down-f1.webp` | Hero car cut-outs (desktop / mobile). |
| `frontend/public/rishi-dr-44.jpeg` | Portrait on the About page. |
| `frontend/public/drivers/credits.json` | Registry of driver photos we hold a licence for. Empty on purpose: nothing is shown or requested without an entry. |

### Repository root, CI, docs

| File | Purpose |
|---|---|
| `README.md` | Project overview: what it does, how it fits together, repository layout, how to run it. |
| `docs/plan.md` | The engineering plan and status log (history of how the project got here). |
| `docs/changes.md` | This document: architecture, flows, models, APIs, data, every file, what was removed. |
| `render.yaml` | Render Blueprint for the API (env vars, health check, auto-deploy after CI). |
| `ruff.toml` | Python lint rules: no print, a ban on the old live-timing library, security checks. |
| `.pre-commit-config.yaml` | Pre-commit: ruff and gitleaks. |
| `.gitignore` | Ignored files: caches, builds, local env files (but not `.env.example`), scripts/out. |
| `.github/workflows/ci.yml` | CI: backend lint/tests/audit; pipeline lint/tests/data validation/audit chain; frontend types/unit/lint/build/audit. |
| `.github/workflows/refresh-data.yml` | Scheduled data refresh (every 20 min on race days, daily otherwise); opens a PR when data changed. |
| `.github/workflows/check-deploy.yml` | Smoke-tests the deployed API with scripts/check_deploy.py. |
| `docs/deploy.md` | Step-by-step deployment to Render and Vercel. |
| `docs/forecasting.md` | How the forecast model is trained, tested and deployed. |
| `docs/perf-baseline.md` | Measured performance before and after the rebuild. |
| `audit/audit-2026-11.jsonl` | Append-only, hash-chained log of every data publish (verified in CI). |
| `backend/requirements*.txt, pipeline/requirements*.txt` | Pinned Python dependencies (runtime vs dev). |


---

## 8. Removed as useless, and bottlenecks found

Everything removed was **checked first**: no import of it anywhere in `src`, tests or e2e (the loose race components are not imported even by each other), TypeScript compiles, lint passes, and the full suites pass afterwards. All of it is tracked in git, so `git checkout HEAD -- <path>` restores any file.

### 8.1 Removed

| What | Why it was useless | Effect |
|---|---|---|
| `frontend/src/components/race/{raceoverview, constructortable, strategysimulater, standingstable, racecomparision, strategypanel, performanceindex, trackintel, incidenttimeline, telemtryvisualizer}.tsx` (10 files, 2,261 lines) | Orphans from an earlier race page. Nothing imports them; the current race page is built from `components/race/detail/*`. They were also the source of most lint errors (`any`, unused variables) | −2,261 lines; lint errors 38 → 0 |
| `GET /api/drivers/{code}/dna`, `GET /api/ai/driver/{code}` and their test assertion | Stubs that always return 404 "planned" | Two fewer routes (and fewer legacy duplicates) |
| Frontend Driver DNA / AI-insight code in `pages/driverprofile.tsx` (types, two hooks, two panels, `Bar`, `Tag`) and the `VITE_FEATURE_DRIVER_AI` flag | Behind a flag that was off; called the stub endpoints | −116 lines, two fewer possible failing requests per profile |
| `recharts` dependency (`frontend/package.json`, lockfile −404 lines) | Imported nowhere; every chart is hand-drawn SVG | Smaller install; does not change the bundle (it was never imported) |
| Root `package.json` and `package-lock.json` (only `framer-motion`) | No script, workflow or doc uses the repo root as a Node project; the frontend has its own | One less confusing manifest to keep patched |
| `frontend/public/vite.svg`, `f1_new-hd.avif`, `frontend/src/assets/{react.svg, icon.svg, F1.svg, f1-hero.jpg}` | Vite scaffold leftovers and an AVIF nothing references (the hero uses the WebP) | Fewer static files shipped |
| `frontend/public/drivers/{hamilton.jpeg, vettel.jpg, schumacher.jpeg, verstappen.jpeg}` | Not referenced by any code; `credits.json` is empty **on purpose** ("nothing is shown, nothing is requested without an entry"). Unreferenced photos sitting in `public/` are still publicly downloadable, which is a licensing risk for no benefit | Removes publicly served photos with no recorded licence |
| In the landing page (then `about.tsx`, now `pages/home.tsx`): unused `champions` data array, `TimelineItem` component, `useNavigate` import; the fake "Credits" footer scene | Dead code and a duplicate, fake footer | −~250 lines |
| `components/sim/bits.tsx`: unused `control as _unused` import | Dead import | Lint clean |
| `docs/features.md` | A comparison with another product; the project should not refer to other projects | Deleted; two links to it removed |
| `frontend/README.md` | Untouched Vite template boilerplate | Deleted |
| Unused functions: `ghostButton` (`ui/chipstyle.ts`), `TrackArt` (`circuit/trackart.tsx`, only `TrackThumb` is used), `AnimatedNumber` (`sim/fx.tsx`), `recentErrors` (`lib/report.ts`), `fmtFinish` (`lib/format.ts`); `env_flag` (`middleware.py`), `Publisher.write_telemetry` (`export.py`), `season_has_results` (`sources/jolpica.py`) | Each was grepped across source, tests and e2e: defined and never called | −~100 lines; the imports they left behind were removed too |
| `.gitignore` entries for a MongoDB export folder and the old live-timing library's cache | The project has had neither for a long time | Cleaner ignore file |
| `plan.md` mention of the DNA/AI flag | Now inaccurate | Updated to say it was removed |

### 8.2 Fixed, not removed

* `SceneDots` set state synchronously inside an effect (lint rule): discovery is now deferred one frame.
* `RuleCard` took an `any`; it now has a `Rule` type.

### 8.3 Bottlenecks and risks found, **left in place** (with what to do)

| Finding | Why it matters | Why I did not change it | Suggested action |
|---|---|---|---|
| **Replay files are the heaviest payload**: 55 MB across 19 races, up to ~4 MB each (laps 10 MB, telemetry 2.2 MB) | Loaded when a race lab opens; the largest transfer in the product, and gzipped on the fly by the API on every miss | Changing the format touches the pipeline, the models and the replay UI; needs a decision | Quantise positions and delta-encode, or split by time window; or pre-compress to `.gz` at publish time so the API does not compress 4 MB per cold request |
| **Duplicate un-prefixed routes** (`/seasons`, `/drivers`, …) mirror every `/api` route | Doubles the route table and adds a header and log field to each request | Removing them breaks any frontend build whose `VITE_API_URL` lacks `/api`; I cannot see your Vercel settings | Check the logs for `legacy_path: true`; when it is gone, delete the second `include_router` in `main.py` and `_is_legacy_path` in `middleware.py` |
| **`framer-motion` (44 KB gzip) is in the first load** because the always-visible dock and scroll bar use it; entry chunk is 93 KB gzip | Slower first paint on slow phones | Already recorded in `docs/perf-baseline.md` as a known later task; replacing it with CSS is a sizeable redesign | Move the dock/progress animations to CSS, then lazy-load `motion` only on pages that need it |
| **Render free tier sleeps** | First request after idle waits for wake-up | Platform behaviour; already mitigated by a retry and an on-screen explanation (`ServerNotice`, `lib/api.ts`, `lib/pending.ts`) | Static JSON on a CDN (the plan's Phase 1) removes it |
| **Third-party hotlinked images in `pages/home.tsx`** (Pinterest, ESPN, Merkur…) | Can vanish or be blocked any day; each is a request to someone else's server | These are content choices for the landing page; images already hide themselves on failure (`lib/images.ts`) | Self-host licensed images (the plan's L7) |
| **Some feeds (Autosport, The Race) returned empty responses to a plain `curl`** | Headlines could silently thin out | The pipeline already tolerates a failed feed and keeps the last good file | Watch the `news` audit entries for a falling headline count |
| In-memory rate limiter and file cache | Per-process only | Correct for a single stateless instance (bounded; cleared wholesale at 600 cached files) | Revisit only if the API is scaled to several instances |

---

## 9. Verification

Run after all changes above:

| Check | Result |
|---|---|
| Backend tests (`pytest`) | **33 passed** |
| Pipeline tests (`pytest`, 24 test files) | **162 passed** |
| Python lint (`ruff check backend pipeline`) | **clean** |
| Frontend types (`tsc -b`) | **clean** |
| Frontend unit tests (Vitest) | **114 passed** (23 files) |
| Frontend lint (`eslint .`) | **0 errors** (was 38) |
| Production build (`vite build`) | **builds**; entry chunk 280 KB (93 KB gzip), `motion` 130 KB (44 KB gzip) |
| Browser tests (Playwright, 164 tests, one worker, against the dev server and the real API) | **164 passed**, including axe accessibility on 27 routes and "no sideways scroll" at 360, 768 and 1024 px |
| Landing scenes | exactly one viewport each and landing at the top at 390×844, 360×640, 412×915 |

Not verified: behaviour on real phones (checked in phone-sized Chromium only); Safari's scroll-driven animation path (Chrome's was exercised; Safari and Firefox use the scripted fallback or the CSS path depending on version); the deployed site.

How to run everything:

```bash
# data
cd pipeline && pip install -r requirements-dev.txt && python -m f1data refresh && python -m f1data validate
# API
cd backend && pip install -r requirements-dev.txt && uvicorn app.main:app --reload && python -m pytest -q
# site
cd frontend && npm ci && npm run dev          # VITE_API_URL=http://localhost:8000/api
npm run typecheck && npm test && npm run lint && npm run build && npm run e2e
```

---

## 10. Open items

1. **Long pages still to redo for phones** (same approach as News/Schedule/Drivers): Standings, Forecast, Methodology (12 screens), Race, Driver profile, Duels, Ratings, Team pace, Circuits. The landing page is the only one with full one-screen snapped scenes.
2. Decide on the replay payload (8.3) and the legacy routes (8.3).
3. Self-host the landing page's hotlinked images (in `pages/home.tsx`).
4. The Python pipeline is one flat package of 27 modules plus `ratings/`, `predict/` and `sources/`. It is organised by clear module names and each file's docstring (section 7), and moving files would touch every import and test; group it into subpackages (e.g. `race/`, `enrich/`) only if it keeps growing.
