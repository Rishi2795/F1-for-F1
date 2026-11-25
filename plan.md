# F1 for F1 — Revamp, ML & Performance Plan

> Status: draft for review · Written against commit `593bb51` · Date: 2026-11-24
> Scope: (1) fix latency, (2) revamp product/UI + add features, (3) build real ML models.
> Everything under "Findings" comes from reading the code. **Nothing was measured on the deployed site yet** — Phase 0 starts with measuring, and latency numbers below are estimates until then.

---

## 0. TL;DR

1. **The slowness is architectural, not a tuning problem.** The race page's API route (`GET /seasons/{y}/races/{r}`) downloads and parses a full FastF1 session *on every request*, on a Render free dyno that also sleeps. The precompute pipeline, JSON loader and Mongo loader that were built to avoid this are **not wired to any route**.
2. **Move to "static-first".** Precompute everything offline (GitHub Actions), publish compact gzip/brotli JSON to a CDN, and have the frontend read it directly. The FastAPI server shrinks to the few things that are truly dynamic (what-if strategy sim), or disappears for read paths.
3. **Several shipped features are broken or fake**: Drivers pages call 4 endpoints that don't exist; 3 endpoints return hardcoded empty/placeholder data; the UI labels static data "LIVE_TELEMETRY_FEED"; 12 race components (~2,400 lines) are not imported by any page; the data stops at 2025.
4. **ML plan**: a calibrated race-result model (grid/quali/form/ratings → win/podium/points/DNF probabilities), a Monte-Carlo **championship simulator** built on it, a **driver-vs-car rating** model, a **tyre-degradation → strategy optimiser** replacing the toy simulator, plus safety-car odds and data-driven driver styles. Every prediction is logged *before* the race so a public scorecard is honest.
5. **Order of work**: measure → hotfix latency (days) → data platform → frontend revamp → ML v1 → strategy lab → extras.

---

## 0b. Phase 0 status (implemented 2026-11-24, branch `phase-0-foundation`, **uncommitted**)

**Delivered and verified**
- ✅ **No request-time upstream calls.** API reads precomputed JSON: 1–3 ms locally vs ~7 s per cold FastF1 race load before (`docs/perf-baseline.md`).
- ✅ **Credential-free data layer** (`pipeline/f1data/sources`): Jolpica + TracingInsights + OpenF1 fallback; one HTTP client (throttle, retry, adaptive 429 back-off, disk cache); upstream commit recorded per snapshot. FastF1 is banned by lint.
- ✅ **Coverage 2020–2026: 149 complete / 3 partial / 2 upcoming / 0 missing** of 154 rounds (first pass was 144 / 8; see "Data quality round 2" below), including the three races the FastF1 mirror failed on. 2020–2022 tyre data is available. `coverage.json` + `GET /api/coverage`.
- ✅ **Null policy**: `null` + quality flags; no 0/99 sentinels; one bad driver never drops a round; the 2021 Abu Dhabi and Belgium crash cases are regression-tested. Publisher never replaces good data with worse.
- ✅ **Security**: generic error bodies + request id, validated path params, strict CORS (no credentials), security headers, rate limiting (+ trusted-proxy option), docs off in prod, pinned deps, `pip-audit` + `npm audit` clean (fixed 5 frontend advisories), CI with pinned action SHAs and gitleaks, pre-commit.
- ✅ **Logging/audit**: structured JSON + secret redaction (a test caught and fixed a real token-leak ordering bug); `print` and `console.*` banned in CI; hash-chained audit log with tamper/deletion detection; `validate` data gate.
- ✅ **Frontend**: route code-splitting, typed cached API client, skeleton/error/empty states, null-safe pages, honest labels (no fake "LIVE"), data-quality notice, real tyre-strategy bars, hero images −90%, Drivers pages work again (data from the pipeline), browser-tested (Playwright, 6 pages, 0 console errors).
- ✅ 61 tests (24 backend + 37 pipeline), ruff clean.

**Data quality round 2 (partial data + cleanliness)**
- ✅ **Found and fixed a bug of mine**: where upstream has *no* tyre data for a run of laps, the builder invented an extra "unknown" stint (Miami 2025: 3 stints vs 1 official stop). Now an unlabelled run is joined to its neighbour **only when the official pit-stop record shows no stop within a lap of the boundary and tyre age (if known) carries on** — a tyre cannot change without a stop. Each such stint is tagged `compound_source: "continuity"`.
- ✅ **Found and fixed a worse bug**: Jolpica's `permanentNumber` is a driver's *current* number, so history showed e.g. Norris as #1 in 2023 (Verstappen's number). `driver_number` now comes from the race result row. Regression-tested.
- ✅ **OpenF1 fill + cross-check (2023+)**: unknown compounds are filled from OpenF1 only when it pairs one-to-one (by stint order) with ours — never by lap overlap, because OpenF1's lap numbers shift by a lap after red flags (my first overlap-based check reported 220 false "disagreements" for that reason). Every value records its origin (`timing` / `continuity` / `openf1`).
- ✅ **Independent validation: 5,118 of 5,119 stint compounds (99.98%) in 90 races (2023–2026) agree with OpenF1**; no race is flagged. Races where the two sources genuinely conflict are flagged automatically (`compound_sources_disagree`).
- ✅ **Stricter `validate`** (CI gate): stints contiguous, lap counts and `longest_stint`/`stops` consistent with stints, unique driver codes, no empty names, no grid+pit-lane conflict, manifest hash matches files. Real data passes. Stop-count mismatches vs the official record fell 22 → 15 (all remaining are listed in each race's `warnings`).
- ✅ Misleading About-page claims removed ("fetched using FastF1", "validated against FIA sources"; MongoDB/FastF1 skill tags).
- ⬜ **Still partial (3 races, 33 stints): 2021 Belgian GP** (3-lap wet race, feed says UNKNOWN for everyone), **2022 Monaco** (1 stint), **2022 Austria** (12 drivers' final stint). F1's timing feed has no compound there and no free source covers 2022 tyres. Options: leave flagged (current), or add a **manual-override file with a cited source** (e.g. Pirelli's per-race tyre report), recorded in the audit log and tagged `compound_source: "manual"`.

**Deviations from the plan (decisions I made — tell me if you disagree)**
- MongoDB removed from the API entirely (plan §9 item 2 recommended it). Old scripts/loaders deleted (history keeps them).
- No FastF1 adapter was written (no-credentials decision); TracingInsights replaced it as the lap/tyre source.
- Driver DNA / AI-insight requests are off behind `VITE_FEATURE_DRIVER_AI` until the ratings model exists. Driver photos are not shipped (rights/hotlinks): code-initials avatars instead; `rating`/`titles` are `null`.
- "Points" are **race points only** — sprint points are not ingested yet (Verstappen 2023 shows 530 vs 575 official).
- `tyre_degradation_index` and `pit_efficiency` were **removed** (they didn't measure what they claimed); the UI shows "longest stint" instead. Real degradation comes with Model D.
- The non-`/api` route aliases are kept (flagged `Deprecation`, logged as `legacy_path`) so a Vercel env without `/api` doesn't break — delete once logs are clean.

**Not done / still open**
- ⬜ **Deployed-site numbers** (Lighthouse, real TTFB, Render cold start): no URL in the repo. Commands are in `docs/perf-baseline.md`.
- ⬜ **Deploy settings needed from you**: `ALLOWED_ORIGINS`, `TRUST_PROXY=true`, `APP_ENV=production` on Render; `VITE_API_URL=…/api` on Vercel; delete `MONGO_URI_NEW` (`docs/deploy.md`). CSP is **report-only** until verified on a preview deploy.
- ⬜ **Keep-alive pinger** (stop-gap for Render sleep): needs an external service; superseded by Phase 1 CDN hosting.
- ⬜ **Scheduled ingest** (GitHub Actions cron + PR) and storing the audit log outside the repo → Phase 1. Today the audit file is committed and the actor is `local`.
- ⬜ 52 legacy ESLint errors (`any`, unused vars, one set-state-in-effect) remain in untouched pages; CI disables just those three rules until cleaned. 12 `components/race/*` files are still orphaned.
- ⬜ Hotlinked third-party images remain in `about.tsx` / `hero.tsx` backgrounds (Phase 2). README's driver-"attribute tags" claim is still not implemented.
- ⬜ Rate limiter is per-process memory (fine for one instance). 2026 data is shown as published upstream and not independently verified.
- ⬜ Nothing is committed: the git identity isn't configured and you didn't ask for a commit. The `git rm`/edits are in the working tree.

## 0c. Feature log

| Date | Feature | Notes |
|---|---|---|
| 2026-11-25 | **Season standings + championship progression chart** (`/season/:year`, `/standings`, `GET /api/seasons/{year}/standings`) | Official Jolpica standings after every round, so **sprint points are now included**. Drivers and constructors tabs, points-after-each-round chart (dependency-free SVG, 4 KB gzipped page), gap and lead changes. Validation: official points are never lower than the race points we publish, points never decrease between rounds, positions are unique. All 2020–2026 seasons published. |
| 2026-11-25 | **Driver & car ratings** (Model A v0; `/ratings`, `GET /api/ratings`, `/api/ratings/model`, `/api/ratings/{code}`; rating panel on driver profiles; model card on `/methodology#ratings`) | Pairwise-logistic Elo: pace = driver skill + car strength; teammate duels move only the driver, results against other teams move only the car; online update after every race, season shrinkage (harder in 2022 and 2026). Tuned on 2021-2023, **scored on unseen 2024-2026** (69 races, 10,506 pairs) against coin flip / grid / recent-form baselines. **Honest result:** once the grid is known, ratings (log loss 0.401) are about as good as grid + recent form (0.398), not better. Their value is the driver-vs-car split and a pre-qualifying forecast; the methodology page says so. Also shipped: titles badge, "waking the server" notice, keyboard-visible dock, chart-driven round picker, shareable links, footer + methodology page, axe accessibility tests. |
| 2026-11-25 | **Race detail** (race page, new "The race in detail" section) | Highlights (fastest lap, quickest stop, winning margin, lead changes, safety-car laps, track temp), full classification (grid, change, gap, fastest lap, stops), **lap-by-lap position chart**, **race pace** ranking from clean laps, all pit stops, tyre trend per compound. Backed by new optional fields on the published race (gap, official fastest lap, pit-stop log, median/best lap, lap positions) and a race-level `analysis`. Honesty rules: gaps only for classified lead-lap finishers and dropped when they contradict the finishing order (penalties, lapped cars timed on their own lap count); tyre trend is labelled net of fuel burn. Validation checks gaps and lap positions. 2025 R6 keeps its previous (better) data and so has no detail until its tyre data can be rebuilt as complete. |
| 2026-11-25 | **Strategy simulator rebuilt** (`/simulation`, `GET /api/simulator/model`, `python -m f1data simmodel`) | Replaces the three-track toy. The pipeline fits lap time on 83k clean green-flag laps (92 dry races, 2022-2026, 26 circuits) with two-way fixed effects (driver-in-race and lap-of-race), so fuel burn, track evolution and car pace cancel and the tyre terms are identified from same-lap comparisons across cars. Per-circuit compound offsets and wear are ridge-shrunk toward global values; ridge strength is chosen on held-out races (typical error 0.63 s a lap vs 0.67 s with no tyre effects; circuit terms add 1.9%). Car and driver pace come from the same laps; pit loss, safety-car, rain and overtaking come from published races; intermediate-tyre penalty is measured from 6 wet races. The browser runs a 22-car lap-by-lap engine with traffic, safety cars/VSC, rain, retirements and reactive AI cars, a plan optimiser, Monte Carlo (300 races) with what-if scenarios, and a live mode. Calibrated so the best driver wins ~4 races in 10 (2026: 43%). Engine modes, full-wet tyres and the cliff beyond observed stint lengths are **assumptions**, labelled as such. A refit on <90% of the previously published laps is refused. Adds numpy to the pipeline only. |
| 2026-11-25 | **Simulator: pit wall, race control, optimiser** | Live mode is lap-by-lap with every call the player's, plus: an advisor that clones the live race and plays out the rest 28 times per option (stay out / box for each tyre / free change under a red flag) with common random numbers, reporting expected finish, a good-to-bad range and how often it beats carrying on; a "stop due around lap N" read when staying out only delays an inevitable stop; race control (safety car, VSC, red flag with line-up, free tyres, standing restart and a restart panel); queued stops; pause-on-events. Setup gains scheduled events (or circuit-history random), team rules (cheap stop under SC, rain reaction and delay), tyre-set allocation and used sets. "Find the best strategy" ranks the quickest plans over the circuit's luck, scans when a safety car helps or hurts, and finds the best plan for four scenarios. Red-flag odds per circuit added to the model. The advisor is search over the fitted model, not a separately trained policy; the page says so. |
| 2026-11-25 | **Forecasts** (`/forecast`, `GET /api/predictions/{next,championship,review,model}`, `python -m f1data predict`) | Plackett-Luce finishing-order model on driver+car ratings, **recent car race pace** (the "current car condition" signal), recent form and a per-driver retirement chance; races simulated 20,000 times. Title odds simulate the remaining races with shared car/driver shifts (uncertainty tuned on 2021-2023 only). **Held-out result (69 races, 2024-2026, each season using weights from earlier seasons only):** before qualifying the real winner gets a typical 15% (random 4.9%); after qualifying 28%; title forecasts named the champion 74% of the time vs 67% for "the leader wins". Retirements are barely predictable (Brier 0.112 vs 0.114). Page shows misses openly and says when a title is mathematically decided (2026: Antonelli and Mercedes). |
| 2026-11-25 | **Pit Wall: 10 new tools + 6 improvements + deployability** | New: qualifying and sprint ingestion (`enrich`); post-qualifying forecast; teammate duels (`/duels`); championship maths ("what does X need"); worth-watching score (`/watch`, spoiler-free); fuel-corrected tyre model; strategy what-if; circuit profiles (`/circuits`); Beat-the-model podium game (`/play`, on-device); My driver briefing (`/my`); Pit Wall hub (`/pitwall`). Improved: Cmd/Ctrl+K search; standings show places gained/lost; drivers filter (grid, champions); driver profile weekend panel; race list shows a watch score; race page gains qualifying ladder, tyre model and circuit link. ML: tuned memory lengths, qualifying-gap feature (post-quali winner log loss 1.268 vs 1.889 before qualifying; random 3.02), model card records training-data hash. Deploy: `python -m f1data refresh` (one command, 40 s) and a daily `refresh-data` workflow that opens a PR; docs in `docs/deploy.md`, `docs/forecasting.md`. Tyre model passes its physical sanity checks on 61 of 152 races; the rest are left blank on purpose. |
| 2026-11-25 | **Fastlytics parity + more** (`/race/:y/:r/lab`, `/team-pace`, `docs/features.md`) | Per-lap files (`laps/{season}/{round}.json`, 2.9 MB for 152 races): exact gap to the leader, lap times, flags, sector bests, top speeds, undercuts. Race lab: replay, gap chart, pace distribution, track evolution, driver comparison, flags and undercut tracker. Team pace page (round-by-round, improving or fading). 2019 season added (2018 left out: 12 of 21 races had no lap data and failed the stint checks). Forecast accuracy unchanged within noise with 2019 in training. Not done: telemetry traces and track map (need OpenF1 sample data; see docs/features.md). |
| 2026-11-25 | **Track map replay, "where it went wrong", decorated circuit pages** | Circuit outlines from one real clean lap of OpenF1 position data (`python -m f1data enrich`, cached; 26 of 33 circuits, lengths within about 1% of official). Race lab replays the race on the outline: cars placed from exact lap timing (even pace assumed within a lap), live order, tyre or team colours, flag banner, red-flag fast-forward. "Where it went wrong": per-driver time lost in the pits, slow laps and under flags, plus the moments to watch (pit cost, slow laps, places lost on track, the stretch the leader pulled away, undercuts, retirements) with jump-to-map. Circuit pages draw the track and run a marker round it; the circuit list shows thumbnails. Lap files gain per-lap completion times. |
| 2026-11-25 | **Zoomable track + fastest-lap telemetry + race-weekend refresh** (race lab §01–02) | New `telemetry` pipeline step (OpenF1 `car_data` + `location`, 2023+): each driver's fastest clean lap resampled to 240 points *by distance* (same points as the circuit outline), channels speed/throttle/brake/gear/RPM/DRS plus a millisecond clock scaled to the official lap time; sector split fractions from the fastest lap. Dropped, not repaired, when samples are too few, speed is impossible, or the car never moved. `GET /api/seasons/{y}/races/{r}/telemetry`, validated in the data gate (lengths, clock monotonic, readings possible). Frontend: zoom/pan (wheel, pinch, buttons, follow car, jump to S1/S2/S3), track coloured by SPD/THR/BRK/RPM/GEAR, hover or tap anywhere to read speed gauge, gear, RPM, throttle, brake, DRS, lap timer and sector splits; run the lap on a loop at 0.25–4×; compare two drivers as a ghost car with the time gap at that point; synced trace chart. The existing replay got the same zoom and a live-metrics card for the followed car, labelled as the fastest lap's readings at that spot (not that lap). Refresh workflow now runs every 20 min on race weekends; opt-in `AUTO_MERGE` variable removes the manual merge wait. **Limits:** fastest lap only, not every lap; 2023 onward; positions during the replay still assume an even pace within a lap. |
| 2026-11-25 | **Real-position replay (newest races only)** (`python -m f1data replay`, `GET /api/seasons/{y}/races/{r}/replay`) | Every car's position (as a fraction of a lap, by projecting OpenF1 position data onto that race's own circuit) and speed/throttle/brake/gear/RPM/DRS once a second for the whole race; holes stay `null`. The file records how its clock lines up with the lap-timing clock, measured from every driver's every lap start; if the worst tenth of measurements disagree by more than 3 s no file is written. On the British GP: 22 drivers, 100% coverage, real positions within a median 2% of a lap of the even-pace estimate. The race lab replay uses it when present (green REAL POSITIONS badge, live readings for picked drivers); older races keep the timing-only replay, labelled ESTIMATED POSITIONS. Order and gaps still come from lap timing. Also fixed: race files were ordered as text (round 9 before 21) so "newest" picked the wrong race. |
| 2026-11-25 | **Race events, pit/out states, and a results cross-check** (race lab replay) | New event feed under the replay: pit stops (official time, new tyre), passes (lap by lap, never counting pit or retirement swaps), retirements with the race-control message that explains them when one exists, race-control incidents/penalties/safety cars (`incidents/{season}/{round}.json` from OpenF1 `race_control`, `GET /api/seasons/{y}/races/{r}/incidents`), and "crossed the line P6, classified P10" for post-race penalties. Click an event to jump the replay there; picking drivers filters it. On the map a car in the pit lane gets a dashed ring and PIT, a retired car shows a red X and OUT where it stopped for two minutes. `scripts/verify_events.py` cross-checks results, pit logs and retirements across a season. **Found and fixed:** the timing feed carried line-crossing stamps for 2 laps a retired car never drove, so every retirement kept "racing" 2 extra laps (118 lap files corrected, rule added to the builder). **Still open (listed by the script):** two cars logged a pit stop but have no tyre-stint change (R12 BEA, R21 LIN); one lap-count mismatch (R15 BOT); Jolpica gives 2026 retirements only as "Retired", so the cause comes from race control or is shown as not published. |

Also fixed on the way: weak-ETag conditional requests (found by running the deploy check against the live service), and the deploy check now detects a missing `ALLOWED_ORIGINS` / `APP_ENV`.


### 0d. Product direction (agreed 2026-11-25)

**Rule: every element answers a question a fan asks.** Casual ("who won, was it good, should I watch?"), regular ("how is my driver doing, what does he need?"), geek ("who was really fastest, was the strategy right, driver or car?"). Anything that answers none of these is removed.

**Positioning:** the honest F1 analyst. Free, credential-free, validated, open about its limits.

**Flagship:** a *Pit Wall*: one hub of tools that turn the data into answers, with a Simple/Pro switch so the same page serves newcomers and geeks.

| Tool | Question it answers | Needs |
|---|---|---|
| Forecast (shipped) | Who wins next? Who wins the title? | ratings + pace (have) |
| Championship maths | What does X need to win it? | forecast engine (have); sprint calendar |
| Worth watching | Was the race worth a replay? Spoiler-free | lap positions (have) |
| Teammate duels | Who is really faster in the same car? | qualifying + sprint ingestion (Jolpica) |
| Strategy what-if | Was the strategy right? What else could they have done? | stints + lap times (have) |
| Tyre degradation | Which compound wore, and how fast? | fuel-corrected model on lap data (have) |
| Post-qualifying forecast | Who wins now the grid is set? | qualifying ingestion; model variant already fitted |
| Driver vs car, all eras | Who is the greatest, car-adjusted? | results back to 1950 (Jolpica), model v2 with uncertainty |
| Swap tool / debate cards | Put driver A in car B | model v2, share-image generation |
| Predict & play | Can I beat the model? | local-first scoring |

**Order:** (1) utility core: scheduled refresh, qualifying/sprint ingestion, post-quali forecast, championship maths, worth-watching, Simple/Pro; (2) flagship: history to 1950, ratings v2 with uncertainty, swap tool; (3) retention: predictions game, personal home, alerts; (4) replay.

**Honest limits to keep visible:** no free live timing (so "post-race within an hour", not live); "car condition" is measured from race pace, not telemetry; retirements are close to unpredictable; sprint points are not simulated yet.

---

## 1. Findings from the code review

### 1.1 Why it's slow (ranked by impact)

| # | Finding | Evidence | Impact |
|---|---|---|---|
| L1 | Race page loads a full FastF1 session per request, then loops all ~20 drivers filtering laps | `backend/app/routers/seasons.py:288-289, 322` (`fastf1.get_session` + `session.load(laps=True…)`; `_driver_lap_stats` per driver) | Likely **tens of seconds** per uncached race (FastF1 downloads from F1's servers, then parses). The dominant cost. |
| L2 | FastF1 disk cache lives in the container filesystem → wiped on every Render redeploy/restart, so "cache" rarely helps | `seasons.py:9-11` → `backend/.fastf1-cache`, which is also gitignored | Every cold start re-downloads. |
| L3 | Race *list* hits the network each time (`get_event_schedule`) with no caching | `seasons.py:253-274` | Slow home/explore page. |
| L4 | Render free tier sleeps after inactivity → cold start (Python + pandas + fastf1 import) | README: "Backend: Render (Free Tier)" | First visit after idle is slow regardless of code. |
| L5 | **Precomputed path exists but is dead code**: `precomputed_loader.py`, `mongo_loader.py`, `scripts/precompute_season.py` — none imported by a router | `grep` of routers: only `seasons.py` (live FastF1), `races.py` (live FastF1) | The fix was already built, never connected. |
| L6 | Frontend: no route-level code splitting, no data cache (axios refetch on every mount), spinner-only loading, no prefetch | `App.tsx` imports every page eagerly; each page does its own `axios.get` in `useEffect` | Slower first paint and every navigation. |
| L7 | Heavy/unoptimised assets and hotlinked images | `public/f1_new-hd.png` 772 KB, `top_down-f1.png` 604 KB; `pages/about.tsx` hotlinks Pinterest/ESPN/Merkur/etc. images | Slow LCP; images can vanish or be blocked any day. |
| L8 | `about.tsx` is 810 lines, `racedashboard.tsx` 516 lines with big inline JSX, `framer-motion` used broadly | file sizes | Large initial JS. (Need a bundle analysis to quantify.) |

### 1.2 Broken / fake / dead

| # | Finding | Evidence |
|---|---|---|
| B1 | Drivers hub and driver profile call `/drivers`, `/drivers/{code}`, `/drivers/{code}/dna`, `/ai/driver/{code}` — **no such backend routes exist**; errors are swallowed (`.catch(() => setLoading(false))`), so users see an empty page | `drivers.tsx:25`, `driverprofile.tsx:75-89` vs. routers (`races`, `tracks`, `seasons` only) |
| B2 | `/race-insights`, `/ai/race`, `/standings` return **hardcoded placeholders** (`"avg_pit_time": "2.4s"`, empty dicts). Fake data served as if real. | `routers/races.py:44-88` |
| B3 | `tracks` router is just a `ping`; `core/track_intel.py` is an empty file; `TRACK_HISTORY` in the frontend covers **3** circuits, everything else gets one generic sentence | `routers/tracks.py`, `racedashboard.tsx:13-17,117` |
| B4 | 12 components in `components/race/*` (~2,400 lines: standings, constructor table, telemetry visualiser, strategy simulator, incident timeline…) are **not imported by any page** | `grep components/race` → no importers |
| B5 | UI says "Live_Telemetry_Feed" / "LIVE_DATA_SYNC" / "Initialising_Core_Uplink" while data is static historical. Misleading, and the 7–9 px mono labels hurt readability/accessibility | `racedashboard.tsx:86,155,68` |
| B6 | Supported seasons hardcoded to 2020–2025; today is Nov 2026, so the **2026 season (a major regulation reset) is missing** and nothing automates ingestion | `seasons.py:13` |
| B7 | **Two metric definitions for the same fields.** Live route: `consistency_index` is 0–100 from coefficient of variation; precompute script: raw std-dev in seconds. `tyre_degradation_index` is just `longest_stint / total_laps` (live) or a 3-bucket lookup (script) — neither measures degradation | `seasons.py:98-114` vs `precompute_season.py:110-132` |
| B8 | Precompute bug: `longest_stint = groupby("Compound").size().max()` counts total laps on a compound, **not** the longest stint (two medium stints get summed). Also `pick_driver` is deprecated in FastF1 (the live route already uses `pick_drivers`) | `precompute_season.py:165-168,149` |
| B9 | Backend hygiene: every router mounted twice (with and without `/api`) as a workaround; `allow_origins=["*"]` with `allow_credentials=True`; no tests; no CI for backend; `on_event("startup")` deprecated; `requirements.txt` unpinned | `main.py:47-55,39-45`, `requirements.txt` |
| B10 | The "strategy simulation verdict" and "driver attributes" are hand-written if/else rules presented as insight; the README promises "Aggressive / Defensive / Tyre Saver" tags but no code generates them | `seasons.py:159-180`; grep for tags finds none |

### 1.2b Missing / null data, FastF1 access, security & logging (added after a live check)

I installed FastF1 `3.9.2` in a scratch environment and ran the app's own loading path against the real schedule and 5 sample races. **This is a sample from one machine, not a full audit** — the full coverage matrix is a Phase 0 task (§3.1).

**Verified**

| # | Finding | Evidence |
|---|---|---|
| D1 | `precompute_season.py` guesses rounds with `range(1, 26)`. Real calendars: 2020 = 17, 2021 = 22, 2022 = 22, 2023 = 22, 2024 = 24, 2025 = 24, **2026 = 23 (21 already run)**. Non-existent rounds just print "Failed", and `races.json` only lists rounds that succeeded, so **a failed real round silently vanishes** — nothing compares expected vs actual | schedule fetched via `fastf1.get_event_schedule`; `precompute_season.py:219-228` |
| D2 | **3 of 5 sampled races (2020 R1, 2024 R24, 2025 R24) loaded results but no lap/timing data.** FastF1 logged `Failed to load timing data`, `Failed to load session info data` (`SessionNotAvailableError`) and did *not* raise from `load()`; the failure only shows later as `DataNotLoadedError` when `session.laps` is touched. 2021 R12 and R22 loaded fully | scratch run, FastF1 3.9.2 |
| D3 | FastF1 3.9.2 tries to **sign in to a Formula 1 account** (`F1_USERNAME` / `F1_PASSWORD` env vars), logs "continuing without authentication", then falls back to a mirror that did not have those sessions. FastF1's own docstring says that login sends an **F1TV subscription token** to F1's livetiming server. Whether credentials would fix coverage — and whether a free account is enough or it needs a paid plan, and whether that's permitted — is **unconfirmed** (see §9 item 8). Either way: `requirements.txt` has `fastf1` **unpinned**, so any redeploy can silently change this behaviour | scratch run logs; `requirements.txt` |
| D4 | **2021 Abu Dhabi has a driver with null `Position` and null `GridPosition`.** `precompute_season.py:173-175` does `int(row["GridPosition"])` → `int(NaN)` raises → the **whole round is skipped**. This is probably why `insert_special_race.py` exists (a hand-written stub doc with no `drivers`/`derived.winning_recipe`, which would crash the dashboard at `racedashboard.tsx:128`) | scratch run + code |
| D5 | **2021 Belgium (3 racing laps)**: no driver has more than one stint → `compute_winning_recipe` calls `Counter([]).most_common(1)[0]` → `IndexError` → round skipped. Same function returns `{}` when nobody finished, then `strategy_swap` does `winning_recipe["typical_stops"]` → `KeyError` | `precompute_season.py:41-54, 93-99` |
| D6 | Two Belgium drivers have `GridPosition == 0` (pit-lane start). `0` currently means "unknown", "pit lane" and "no data" all at once | scratch run |
| D7 | The live route **fabricates plausible values when lap data is missing**: on any exception `_driver_lap_stats` returns `stops: 1, tyre_sequence: ["UNKNOWN"], tyre_degradation_index: 50, pit_efficiency: "Nominal"`. A race with no lap data therefore looks like a normal race instead of "data unavailable" | `seasons.py:58-69, 135-136` |
| D8 | Missing finishing position becomes the sentinel `99`, then `positions_gained = grid - 99` → huge fake negative numbers that pollute team averages and the style tags | `seasons.py:313,320` |
| D9 | **Three separate FastF1 integrations**, each with its own cache location and helpers: `telemetry_source.py` (cwd/.fastf1-cache), `seasons.py` (backend/.fastf1-cache), `precompute_season.py` (relative `.fastf1-cache`), plus duplicated `_str/_int/_float` converters. `Cache.enable_cache` is deprecated in 3.9.2 (`Cache.configure`) | code + FastF1 warning |
| D10 | `json.dump` is used without `allow_nan=False`; a stray `NaN` becomes invalid JSON that browsers' `JSON.parse` rejects | `precompute_season.py:208,228` |

**Security / logging (from code review)**

| # | Finding | Evidence |
|---|---|---|
| S1 | Raw exception text is returned to clients (`detail=str(e)`, `f"…{e}"`) — leaks internals, library messages and paths | `races.py:20,36,62,75,89`; `seasons.py:260,291` |
| S2 | The Mongo-not-configured error tells the caller the env var name and file path | `db/mongo.py:25-28` |
| S3 | `CORS allow_origins=["*"]` together with `allow_credentials=True`; the app uses no cookies, so credentials aren't needed | `main.py:39-45` |
| S4 | Path params are unbounded (`year: int`, `round_number: int`, free-text `driver_code`); no rate limiting, no request timeouts, `/docs` and `/openapi.json` public in prod | routers, `main.py` |
| S5 | No security headers on the API; no CSP/headers on the Vercel frontend (`vercel.json` only has the SPA rewrite) | `vercel.json` |
| S6 | Dependencies unpinned in `requirements.txt` (and no audit tooling); no CI for the backend | `requirements.txt`, `.github` absent |
| S7 | `ingest_season.py` does `delete_many({"season": YEAR})` then `insert_many` with no guard, no dry-run, no record of who ran it — a failed insert after the delete leaves a season empty | `ingest_season.py:32-33` |
| S8 | **No logging at all** (no `logging` import anywhere). Errors are swallowed (`except Exception: return defaults`, `.catch(console.error)`); 4 stray `print` calls in backend scripts, 9 in `precompute_season.py` (prints + emoji), 5 `console.*` calls in the frontend | grep |
| S9 | No audit trail for data changes (ingests, deletes, publishes) | — |
| ✔ | Good: `.env` files are gitignored and none are tracked; a history search for `mongodb+srv` found no committed connection string (limited check — run a proper `gitleaks` scan in Phase 0) | `git ls-files`, `git log -S` |

### 1.3 What's good (keep it)

- Clear product idea: explainable strategy analytics, 2020+ era.
- Sound principle already in README: *"precompute offline, API read-only"*. We're finishing that idea, not replacing it.
- Reasonable visual identity (dark, red accent) and several decent components worth reviving.
- Vercel + SPA rewrite already configured.

---

## 2. Target architecture (static-first)

```
                OFFLINE / CI (GitHub Actions cron + manual)
 ┌────────────┐   ┌──────────────┐   ┌───────────────────┐   ┌───────────────┐
 │ FastF1     │   │ Ingest       │   │ Feature + Models  │   │ Publish       │
 │ Jolpica-F1 │──▶│ → Parquet    │──▶│ ratings, preds,   │──▶│ versioned JSON│
 │ Open-Meteo │   │ (raw+clean)  │   │ sims, tyre deg    │   │ → CDN bucket  │
 └────────────┘   └──────────────┘   └───────────────────┘   └──────┬────────┘
                                                                     │ immutable, brotli,
                                                                     ▼ cache-control: long
   Browser (React) ── reads /data/v{N}/… directly ───────────────  CDN (Vercel/Cloudflare)
        │
        └── only dynamic call: POST /sim (what-if)  ─▶ tiny FastAPI (or in-browser)
```

**Principles**
- Read paths never touch Python at request time. A race page = 1–3 small static JSON files.
- Data is split by *view*, not by season: `index.json` (tiny), `races/{y}/{r}/summary.json`, `…/laps.json` (lazy), `drivers/{code}.json`, `predictions/latest.json`, etc. Each file targets **< 50 KB gzipped** except lap-level data (lazy-loaded on tab open).
- Content-hashed filenames (or a `manifest.json` that points at them) → `Cache-Control: immutable` and zero revalidation cost.
- One schema, defined once (Pydantic in `pipeline/`, TypeScript types generated from JSON Schema) → fixes B7 (metric drift) permanently.
- **Hosting decision** (see §9): keep Vercel for the SPA + `/data`; either keep Render for `/sim` (add keep-alive or move to a free always-on option) or run the simulator in the browser (preferable — see §5.5).
- MongoDB becomes optional. For read-only, versioned, per-view JSON it adds a network hop and a failure mode without adding capability. Keep it only if user-generated data (accounts, saved comparisons) arrives later.

### Proposed repo layout

```
F1-for-F1/
├─ frontend/                  # React app (revamped)
├─ api/                       # slim FastAPI: /sim, /health (optional)
├─ pipeline/                  # ingest → parquet → export JSON  (replaces backend/scripts)
│   ├─ ingest/ (fastf1, jolpica, openmeteo)
│   ├─ features/
│   ├─ schemas/               # single source of truth for the data contract
│   └─ export/
├─ ml/
│   ├─ ratings/ race_model/ championship/ tyre_strategy/ safety_car/ clustering/
│   ├─ eval/                  # walk-forward backtests, calibration plots
│   └─ model_cards/           # one markdown per model, shown on the Methodology page
├─ data/                      # parquet (gitignored; cached in CI artifacts / R2)
├─ .github/workflows/         # ingest.yml, predict.yml, frontend-ci.yml, api-ci.yml
└─ plan.md
```

---

## 3. Phase 0 — Measure & stop the bleeding (1–2 days)

**Goal: noticeably faster in production before any rewrite.**

- [ ] **Baseline**: record Lighthouse (mobile, throttled 4G) for `/`, `/explore`, `/race/2024/5`, `/drivers`; time the API routes cold and warm (`curl -w`); run `vite build` + `rollup-plugin-visualizer` for bundle size. Save numbers in `docs/perf-baseline.md`. This is the yardstick for every later claim.
- [ ] **Wire the existing precomputed path** into `seasons.py` (replace live FastF1 calls with `precomputed_loader`), commit the generated JSON (small) or ship it via a build step. Response in ms instead of seconds. *(This single change fixes L1–L3.)*
- [ ] Reconcile the precompute output with the shape the frontend expects (`driver_name`, `points`, `status`, `date` are missing from the script's output — compare `seasons.py:324-364` with `precompute_season.py:170-205`) and fix B7/B8 while doing so.
- [ ] Delete placeholder routes in `races.py` (B2) or return real data; remove dual `/api` mounting by fixing the frontend base URL (B9).
- [ ] Add `Cache-Control: public, max-age=…, stale-while-revalidate=…` on all read responses.
- [ ] Mitigate Render sleep short-term (external uptime pinger on `/health`) — explicitly a stop-gap until static hosting lands.
- [ ] Frontend quick wins: `React.lazy` per route, convert the two big PNGs to AVIF/WebP with `width/height`, `loading="lazy"`, add skeleton instead of a bare spinner.
- [ ] Make the Drivers pages stop failing silently: show an error state (until real endpoints exist in Phase 1).

**Exit criteria (original)**: race page TTFB < 500 ms warm; no route calls FastF1 at request time.

> Phase 0 grows to **~4–6 days** with §3.1–3.4 below. They are done *first* (3.2 before 3.1's re-run), because the quick-win steps above should be built on the shared client, not on a fourth copy of FastF1 code.

### 3.1 Data coverage & null policy (fixes D1–D8, D10)

- [ ] **Coverage matrix**: expected rounds come from `client.schedule(year)` (never `range(1, 26)`), skipping future/cancelled events. For every `(season, round)` record status per data kind — `results · quali · laps · stints · weather · track_status` — as `OK | PARTIAL | MISSING` with a reason. Publish as `coverage.json`; run it for **2020 → 2026** to get the real list of gaps (replaces my 5-race sample).
- [ ] **No invented defaults.** Remove the fallback block in `_driver_lap_stats`. Missing = `null` + a `quality` object: `{"status": "PARTIAL", "missing": ["laps"], "source": "fastf1|jolpica", "fetched_at": …}`. The UI shows "n/a — lap data unavailable for this race", never a plausible-looking number.
- [ ] **Explicit semantics instead of sentinels**: `grid: null` + `pit_lane_start: true` (not `0`); `finish: null` + `classified: false` + `status` + `laps_completed` (not `99`); DNS/DNF/DSQ distinguished.
- [ ] **Per-driver isolation**: one driver with a null field never drops the round. Validate each record with Pydantic; bad rows are logged + flagged, the rest are kept.
- [ ] **Fix the crashers**: `compute_winning_recipe` / `strategy_swap` handle empty sequences and no-finisher races (D5); real stints from `Stint` + `TyreLife` (B8); `allow_nan=False` on every JSON write, with NaN → `null` conversion in one place (D10).
- [ ] **Fallback chain per field**: FastF1 laps → Jolpica (pit stops from 2011, lap times from 1996) → mark `PARTIAL`. Record which source filled each field.
- [ ] **Retry & re-queue**: failed/partial rounds retry with backoff, then get re-attempted on the next run; a round that regresses OK → MISSING raises a failed CI check and an audit entry.
- [ ] **Add 2026**; derive "supported seasons" from `coverage.json`, not the hardcoded list (B6).
- [ ] **Special cases as data, not stubs**: replace `insert_special_race.py` with a `notes` field on a normal complete record (Abu Dhabi 2021 gets its real results + a note).
- [ ] **Frontend**: types allow `null`; every metric component renders an "n/a" state; a small "Data coverage" page shows the matrix so gaps are visible rather than mysterious.

### 3.2 One common FastF1 connection layer (fixes D2, D3, D9; makes new features cheap)

All source access goes through **one package**; nothing else imports `fastf1`.

```
pipeline/sources/
  f1/
    client.py       F1Client — the only place that touches fastf1
    models.py       Pydantic: SessionRef, RaceResult, Lap, Stint, PitStop, Weather, TrackEvent, Quality
    errors.py       SessionUnavailable, PartialData, SourceAuthError, RateLimited
    extractors/     results.py · stints.py · laps.py · weather.py · track_status.py …  (one file per feature)
    registry.py     @extractor(name, needs=["laps"]) decorator
    coverage.py     expected (schedule) vs actual → coverage matrix
  jolpica/          same Source interface (fallback + 1950-onward history)
  openmeteo/        weather forecast
  base.py           Source Protocol, so a new provider = one new folder
```

- [ ] **`F1Client` responsibilities**: single cache config from `F1_CACHE_DIR` (`Cache.configure`, not the deprecated call); FastF1's logging routed into our logger (§3.4); credentials read **only** from env/CI secrets; per-request timeout, retry with exponential backoff + jitter, a concurrency limit and a single-flight lock so two callers never load the same session twice; **pinned `fastf1` version**.
- [ ] **Never trust `session.load()` to raise.** After loading, the client inspects which datasets actually arrived (results / laps / weather / track status) and returns a `LoadedSession` with an explicit `available` set. Asking for something that isn't there raises our `PartialData` with a reason, instead of a bare `DataNotLoadedError` later.
- [ ] **Extractors are the extension point.** A new feature = one file: declare `needs`, return a Pydantic model + `Quality`. The registry, caching, coverage, logging and export all pick it up automatically. Example: adding "pit-stop durations" later is ~40 lines, with no change to the client or the exporters.
- [ ] **Enforce the boundary**: ruff `banned-api` (or `import-linter`) fails CI on `import fastf1` outside `pipeline/sources/f1/`. The web API never imports FastF1 → smaller image, faster cold start, and a compromised/slow upstream can't take the site down.
- [ ] Migrate the 3 existing integrations (`telemetry_source.py`, `seasons.py`, `precompute_season.py`) onto the client, delete the duplicated `_str/_int/_float`, and keep one shared `normalize.py` for NaN/None/units.
- [ ] **Contract tests** with recorded fixtures (a handful of saved sessions, including 2021 R12, 2021 R22, and one `PARTIAL` race) so a FastF1 upgrade that changes behaviour fails CI, not production.
- [ ] **D3 investigation (do before assuming credentials)**: run the coverage matrix with no credentials and record exactly which races/datasets the mirror serves; try the previous pinned FastF1 releases to see whether they serve more; read F1's terms on livetiming/F1TV use. If a credential route is ever chosen, it lives **only** in GitHub Actions secrets for the pipeline — never in the deployed site/API — and the terms question is settled first.
- [ ] **Credential-free by design — no source may require an account, key or subscription.** Tested today with no login (2026-11-24):

  | Source | Tested result | Provides |
  |---|---|---|
  | **Jolpica-F1** | results, pit stops and per-lap times returned (e.g. 2020 R1: 1,140 lap rows) | results, quali, standings, pit stops (2011+), lap times (1996+). **No tyre compounds.** |
  | **OpenF1** | free historical data; race sessions returned for **2023, 2024, 2025, 2026**; none for 2020–2022 | stints + tyre compound/age, laps, pit, weather (2023+) |
  | **TracingInsights per-year GitHub repos** (`TracingInsights/2018` … `/2026`, public, no key) | **Checked 2026-11-24**: a repo exists for every year 2018–2026; 2020 has 17 GP folders and 2022 has 22 (= the real calendars); 2021 and 2020 Austria laps files contain `compound`, `stint`, `life` (tyre age), `fresh`, sectors, speed traps, position, weather columns. 2020 R1 Austria (the one the FastF1 mirror failed on) has 71 laps with **0 missing compounds**. Also race-control messages, weather, team radio, and per-lap telemetry | Fills the **2018–2022 tyre/stint hole**; also a full cross-check for 2023+. Repo licences: MIT (2019–2024) / Apache-2.0 (2018, 2025, 2026). Each repo is **15–21 GB** (mostly telemetry), so we never clone it whole — see below |
  | **FastF1 via community mirror** | worked for 2 of 5 sampled races, failed for 3 | 2018+ laps/stints/tyres, best-effort only (now a tertiary source) |

  **Source priority per field** (the extractor records which one answered): results/quali/standings/pit stops → Jolpica; 2023+ stints/tyres/weather/positions → OpenF1, cross-checked with TracingInsights; **2018–2022 stints/tyres/laps/weather → TracingInsights snapshot**; FastF1 mirror only as a last resort; anything still missing → `null` + `PARTIAL`. The former "2020–2022 tyre hole" is now a *coverage-check question* (how many races have clean compound data?), not a known gap.
- [ ] **How to pull TracingInsights without 15–21 GB**: use a partial/sparse git clone (`--filter=blob:none` + sparse-checkout of only `*/Race/*/laptimes.json`, `session_info.json`, `drivers.json`, `weather.json`, `rcm.json`) or fetch those files over `raw.githubusercontent.com`; ≈ 20 small files per race. Snapshot once into our own Parquet. Skip the per-lap `*_tel.json` telemetry unless a feature needs it.
- [ ] **Caveats to settle before relying on it (not yet verified)**: (a) the repos' licence text covers their code/files, but the underlying timing data originates from Formula 1 — read each `LICENSE`/README and keep our "not affiliated, educational" disclaimer; (b) third-party data can be wrong or disappear → validate against Jolpica (stop counts, lap counts, finishing order) in the coverage check and keep our snapshot; (c) check compound null-rates across *all* races, not just my 3 samples; (d) record the upstream commit SHA per snapshot in the audit log for provenance.
- [ ] **One-time snapshot, then never depend on upstream again.** Everything we fetch successfully is stored as Parquet in our own storage (raw + cleaned). Historical races never change, so after one good pull a race is permanent; only the *current* season needs ongoing fetches. An upstream change then costs us new races at worst, not the existing site.
- [ ] **Resilience rules**: sources sit behind the `Source` interface; upstream failure → serve last good snapshot, mark `stale`; **no live upstream calls from the website**; respect each API's rate limits and cache aggressively (OpenF1/Jolpica are volunteer-run free services — be a polite client, identify with a generic User-Agent, no personal data).
- [ ] **Risk to record, not hide**: free community APIs can also change or disappear. The snapshot + `Source` abstraction is the mitigation; the Methodology page lists sources and last-updated times.

### 3.3 Security baseline (fixes S1–S7)

- [ ] **Errors**: global exception handler returns `{"error": "internal_error", "request_id": "…"}`; details only in logs. Remove every `detail=str(e)` (S1) and the env-var/path message in `db/mongo.py` (S2).
- [ ] **Input validation**: `year` ∈ seasons in the manifest, `round` bounded by that season's count (`Path(ge=1, le=…)`), `driver_code` regex `^[A-Z]{3}$`; reject everything else with 422.
- [ ] **CORS**: explicit origin list from env (production domain + `localhost:5173`), `allow_credentials=False`, methods `GET, HEAD, OPTIONS` (S3).
- [ ] **Headers**: API middleware sets `X-Content-Type-Options`, `Referrer-Policy`, `Cache-Control`; Vercel `headers` set a CSP (self + the data CDN), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS. No third-party image hotlinks → tight `img-src` becomes possible (S5).
- [ ] **Abuse controls**: rate limit (slowapi or CDN rule), request timeout, max body size, disable `/docs`/`/openapi.json` in production via env flag (S4).
- [ ] **Secrets**: env/CI secrets only; add `gitleaks` as pre-commit + CI step (also scan full history once); `VITE_*` vars are public by design — assert no secret ever goes there; if any credential was ever committed, rotate it.
- [ ] **Least privilege**: the web/API uses a **read-only** DB user (or no DB); the pipeline uses a separate write user. `ingest_season.py` becomes: dry-run by default, `--apply` flag, write to a temp collection, validate, then swap (no delete-then-insert window) (S7).
- [ ] **Supply chain**: pin Python deps with a lock file (`uv`/`pip-tools`), `pip-audit` + `npm audit` in CI, Dependabot; pin GitHub Actions to commit SHAs and give workflows `permissions: contents: read` by default (S6).
- [ ] **Backend CI** (there is none today): ruff, mypy/pyright, pytest, `pip-audit`, gitleaks.

### 3.4 Logging & audit logs (fixes S8, S9) — "no printing"

**Application logging**
- [ ] One `logging_setup` module: stdlib `logging` with JSON output (`structlog` or `python-json-logger`), level from `LOG_LEVEL`, UTC ISO timestamps. Used by the API, the pipeline and the scripts.
- [ ] **Ban `print` and `console.*`**: ruff rules `T20` (print) in CI and pre-commit; ESLint `no-console` for the frontend. All 18 existing occurrences are replaced. CLI scripts report via the logger (plus an exit code), not stdout text.
- [ ] **Request middleware**: generates/propagates `X-Request-ID`; logs method, route *template* (not the raw URL), status, duration, response size. Client IP is truncated/hashed; no query strings or bodies in logs.
- [ ] **Redaction filter** for secrets (Mongo URIs, `F1_PASSWORD`, tokens, `Authorization`) applied to every handler, including exception tracebacks.
- [ ] Route **FastF1's own loggers** into ours at `WARNING` by default (it is chatty at INFO and prints tracebacks at DEBUG) so "Failed to load timing data" becomes a structured event tied to a `(season, round)` instead of lost noise.
- [ ] **Never swallow silently**: each `except` either handles with a documented fallback *and logs it*, or re-raises. The ones that exist today (`seasons.py:135`, `main.py:63`) are fixed first.
- [ ] **Frontend**: a single `reportError()` helper replaces `console.error`; sends a sanitized event (route, error class, build id — no user data) to a tiny log endpoint or a hosted tool. Error boundaries per route.
- [ ] **Retention/destination**: JSON to stdout → host log drain → a free log service; 30-day retention for app logs.

**Audit logging** (separate from app logs; answers *who changed what data, when, and with what result*)
- [ ] **What is audited**: every ingest run (seasons/rounds, source + FastF1 version, row counts, checksums); every publish of a data bundle (manifest hash); any DB write/delete; model version promotions; coverage regressions and quality-gate failures; config/secret-rotation events; and, once they exist, auth/admin actions.
- [ ] **Record shape** (JSON Lines): `ts`, `event_id`, `actor` (GitHub actor / `system`), `action`, `resource`, `before`/`after` (counts + hashes, not full payloads), `outcome` (`success|failure|partial`), `reason`, `run_id` + CI run URL, `request_id`, and `prev_hash` (hash of the previous entry → **tamper-evident chain**).
- [ ] **Storage**: append-only `audit/YYYY-MM.jsonl` written by the pipeline to versioned object storage (or a dedicated audit branch with branch protection), plus the CI artifact. No code path edits or deletes entries; a CI check verifies the hash chain.
- [ ] **No sensitive content** in audit entries: no credentials, no raw IPs, no payloads.
- [ ] A single `audit.record(action, resource, outcome, …)` helper so adding an audited action is one line; the Phase 0 `ingest_season.py` rewrite is its first user.
- [ ] Surface a read-only "Data changelog" on the Methodology page generated from the audit log (what was updated and when) — transparency for users, and a cheap way to catch mistakes.

**Order inside Phase 0**: 3.4 logging + 3.3 error handling (day 1, small, unblocks debugging everything else) → 3.2 client → 3.1 coverage run → wire API to the precomputed data → original quick wins.

**Exit criteria (added)**: `coverage.json` exists for 2020–2026 and every gap has a reason; no `print`/`console.*` (CI-enforced); no raw exceptions reach clients; `grep -r "import fastf1"` hits only `pipeline/sources/f1/`; every ingest/publish writes a verifiable audit entry.

---

## 4. Phase 1 — Data platform (week 1–2)

**Goal: one trustworthy, automated data pipeline that also feeds ML.**

### 4.1 Sources

| Source | Gives | Notes |
|---|---|---|
| FastF1 | 2018+ laps, stints, tyres, weather, telemetry, quali, track status (SC/VSC/flags), race control | Existing dependency. Telemetry is heavy — store only derived aggregates by default. |
| Jolpica-F1 (Ergast successor) | Results, qualifying, standings, pit stops, lap times back to 1950 | Ergast was shut down; Jolpica is the maintained drop-in. Gives the long history ratings and championship models need. Verify rate limits/ToS before bulk pulls. |
| Open-Meteo | Weather forecast for race weekend | Free, no key. Needed for pre-race predictions. |
| TracingInsights `<year>` repos | 2018–2026 per-lap compound/stint/tyre age, sectors, weather, race control, team radio, telemetry (GitHub, no key) | Primary free source for 2018–2022 tyre/strategy data; snapshot only the small files (§3.2) |
| OpenF1 | Free historical stints/tyres, laps, pit, weather for 2023+ (verified without a key) | **Core source from Phase 0** for 2023+ strategy data; live mode later (Phase 6). |

### 4.2 Tasks

- [ ] `pipeline/schemas`: define `RaceSummary`, `DriverRace`, `Stint`, `Lap`, `PitStop`, `TrackStatusEvent`, `Weather`, `Prediction`, etc. Export JSON Schema → generate TS types for the frontend.
- [ ] Ingest to **Parquet** (raw → clean), idempotent per `(season, round, session)`. Use DuckDB for ad-hoc analysis and feature building.
- [ ] Backfill 2018–2026 from FastF1 and 1990s/1950–2026 results from Jolpica (see §5 on how much history to actually use).
- [ ] **Derived metrics, done properly** (replace the heuristics in B7/B10):
  - Stints from `Stint`/`Compound`/`TyreLife` (not compound groupby).
  - Clean-air race pace (exclude lap 1, in/out laps, SC/VSC laps, laps in traffic).
  - Real tyre degradation (see §5.4) in place of `longest_stint/total_laps`.
  - Pit loss per track (median in-lap+out-lap delta under green), pit stop durations.
  - Position-change decomposition: lap-1 gains, pit-cycle gains, on-track passes.
  - SC/VSC/red-flag events per race with lap ranges.
- [ ] **Exporters** → per-view JSON files + `manifest.json` (see §2).
- [ ] **GitHub Actions**: `ingest.yml` (cron Sunday night + manual dispatch; skips if nothing new), `predict.yml` (Thursday/Friday for pre-weekend, Saturday after quali, Monday post-race scorecard). Cache the FastF1 cache dir between runs (`actions/cache`) — this is where L2 is finally solved.
- [ ] Add **2026** (and make "current season" derived from the schedule, not hardcoded).
- [ ] Data-quality checks (row counts per race, 20-ish drivers, positions 1..N unique, no NaN in published JSON) as a CI gate.
- [ ] Real endpoints/files for what the UI already expects: driver list, driver profile, "DNA", standings (fixes B1, B2).

**Exit criteria**: a new race appears on the site automatically within hours of the chequered flag, with zero manual steps.

---

## 5. Phase 3 — ML models (starts week 3, overlaps frontend)

### 5.0 Ground rules (so the models are credible)

- **Walk-forward evaluation only**: for each race, train on strictly earlier data, predict that race. Never random-split (leakage across a season/car).
- **Baselines first, and beat them or say so.** In F1 the grid slot and car strength explain most of the outcome, so a model that doesn't clearly beat "predict finish = grid" and "Elo-only" isn't earning its complexity. Report the margin honestly on the Methodology page.
- **Calibration over accuracy.** The product shows probabilities, so use proper scoring rules (log-loss, Brier, ranked probability score) and reliability diagrams; calibrate (isotonic/Platt) per model.
- **Small data reality.** 2018–2025 is ~160 races × ~20 drivers ≈ 3,200 driver-races; fewer for lap-level. Prefer simple/regularised models, hierarchical shrinkage, and long history from Jolpica for the *rating* models — down-weighted across regulation eras.
- **Regime changes** (2022 ground effect, **2026 new PU + chassis rules**) break car-strength continuity. Model car strength as a per-season latent with a prior that is *partly reset* at regulation changes, and widen uncertainty early in a new era. Say so in the UI.
- **Log every prediction before the event** (immutable, timestamped, model-versioned). The scorecard page compares them with results — no hindsight edits.

### 5.1 Model A — Driver & constructor ratings ("driver vs car")

*Question it answers: how much of a result is the driver, how much is the car?*

- **v0 (shipped 2026-11-25)**: Elo/Glicko on race finishing order, separate driver and constructor ratings, updated per race. See the feature log (0c) for the held-out result.
- **v1**: Bayesian hierarchical model (PyMC/NumPyro): `performance(driver, race) = car(team, season[, race trend]) + driver(skill) + track-affinity + noise`. **Teammates share the car**, which is what makes driver skill identifiable; drivers moving teams link the graph across years. Output posterior means **with uncertainty**.
- **Outputs**: driver skill, car strength over a season (development trend), qualifying vs race split, track affinity per driver.
- **Eval**: held-out predictive likelihood of next-race order; stability (rankings shouldn't whiplash); sanity vs. known teammate comparisons.
- **Feeds**: Models B, C, F; the Drivers/Teams pages.

### 5.2 Model B — Race result predictor (the core)

- **Prediction points**: (1) pre-weekend (no quali) · (2) after qualifying (main product) · optional (3) after sprint/FP2 pace.
- **Features**: grid & quali position, quali gap to pole (%), driver/car ratings (A) + uncertainty, rolling form (last N races, decayed), team form, circuit-specific history of driver & team, track overtaking difficulty (from §5.6), pit-loss/strategy flexibility, weather forecast (rain probability, temp), penalties/pit-lane starts, reliability rates (see below).
- **Structure** (two-part, then simulate):
  1. **Finishing-order scores**: LightGBM LambdaRank (or a conditional-logit / Plackett-Luce model — compare both) over drivers *within a race*.
  2. **Retirement/DNF model**: logistic/GBM per driver-race, split mechanical vs incident where `Status` allows; hierarchical shrinkage by driver/team/track.
  3. **Monte-Carlo race** (10–50k draws): sample DNFs, sample order from Plackett-Luce scores, add a shared SC/chaos factor → `P(win)`, `P(podium)`, `P(top-10)`, expected position + interval, `P(DNF)`, per driver.
- **Baselines**: finish=grid; Elo-only; quali-gap-only logistic.
- **Metrics**: win/podium log-loss & Brier, RPS over positions, Spearman ρ of predicted vs actual order, top-1/top-3 hit rate, calibration curves; segment by circuit type and by era.
- **UI**: race preview card (probability bars), "why": top feature contributions per driver (SHAP) in plain words; post-race "model vs reality" scorecard.

### 5.3 Model C — Championship predictor (Monte-Carlo season simulator)

- Reuses Model B's race simulation for every remaining round, with: sprint points, fastest-lap rule per season, DNF correlation, **shared team-level random walk** for car development (so Red Bull's good/bad stretch hits both drivers), driver-level form.
- **Outputs**: P(champion) for drivers and constructors, expected final points + 80% interval, points-needed / **clinch scenarios** ("wins title if X finishes ≥ P3 and Y ≤ P5"), **title-odds-over-time chart**.
- **Backtest**: re-run walk-forward on 2018–2025: at each round, predicted title probability vs actual; scoring by Brier of "eventual champion" per round. Also a free **backfilled odds chart** for every past season — nice content, doubles as validation.
- Needs: correct points systems per season, calendar incl. cancelled races, driver-team swaps mid-season.

### 5.4 Model D — Tyre degradation & pace model (foundation for strategy)

- Per race, on clean laps only, fit a mixed-effects regression:
  `laptime = driver_base + fuel_burn_slope·lap + deg_compound·tyre_age + track_evolution + ε` (random effects by driver/stint).
- Aggregate to **circuit × compound** degradation priors (with shrinkage so low-sample circuits borrow strength), plus compound pace offsets.
- Replaces the fake "tyre degradation index" (B7). Validate against held-out stints (predict lap-time curve of an unseen stint; report MAE in seconds).

### 5.5 Model E — Strategy optimiser & "what-if" (replaces the toy simulator)

- The current `simulation.tsx` is a 25-lap game with 3 hand-set tracks. Rebuild on real parameters per circuit (deg from D, pit loss, SC probability from F, traffic penalty, start position).
- **Search**: enumerate plans (1/2/3 stops × compound sequences × pit-lap windows) → Monte-Carlo over SC/VSC timing → rank by expected finishing position / win prob; show undercut/overcut sensitivity.
- **Retrospective mode**: for any real driver-race: "model-optimal vs what they ran", with the delta and the assumptions spelled out (counterfactuals are uncertain — show intervals, not a verdict).
- **Validation**: replay historical races — does simulated total time land within a few seconds of actual? Do model-optimal plans resemble winners' plans more than random plans do?
- **Deployment**: simulation is cheap; port the core to TypeScript (or WASM) so it runs **in the browser** with per-circuit parameter JSON → no backend, instant, works offline. Keep a Python reference implementation as the test oracle.

### 5.6 Model F — Track intelligence (data-driven, replaces hand-written text)

- **Safety-car / VSC probability** per circuit (Beta-Binomial shrinkage over history; condition on rain).
- **Overtaking difficulty**: grid→finish correlation, on-track pass counts (from lap position changes under green), DRS-era vs ground-effect-era.
- **Pit-loss, tyre stress, strategy sensitivity**, "typical winning strategy" with frequencies, weather history.
- Auto-generated plain-language track blurb from these numbers, so all circuits get content (B3) with no hand-writing 25 paragraphs.

### 5.7 Model G — Driver style clustering (replaces rule-based tags, B10)

- Features per driver-season: quali-vs-race delta, lap-1 gain, tyre-deg relative to teammate, consistency (robust), on-track passes vs. pit-gains, incident/DNF-fault rate, wet-weather delta.
- GMM / k-means with stability checks; label clusters by their *evidence* (shown on the profile: "Tyre saver — degrades 0.04 s/lap less than teammate").
- "Drivers like X" nearest-neighbour page.

### 5.8 Later models (not v1)

- **In-race win probability** (lap-by-lap GBM on gap, tyre state, laps left, SC state) — needs live data (OpenF1) → Phase 6.
- **Qualifying predictor** from practice long-run/short-run pace.
- **Weather-impact model**; **pit-stop-time model** by team.

### 5.9 MLOps (lightweight, appropriate for this project)

- `ml/<model>/` = `train.py`, `predict.py`, `eval.py`, `model_card.md`; artifacts versioned `v2026.11.0`.
- Metrics + calibration plots committed per version; the **Methodology page** renders model cards and live backtest metrics.
- CI: unit tests on feature builders, a smoke walk-forward on 2 seasons, schema validation of exported predictions.
- Inference is offline in Actions → JSON; no model server. Models are small (GBM/ratings) so training stays on a laptop or a free runner.

---

## 6. Phase 2 — Frontend revamp (week 2–5)

### 6.1 Product / information architecture

Current: `/` is a long "About" landing page; real content hides under `/explore`; drivers/profile depend on missing endpoints; strategy sim is a standalone game.

Proposed:

| Route | Purpose |
|---|---|
| `/` | **Home**: next race (countdown, circuit, weather, **prediction preview**), championship odds mini-chart, last race recap, quick links. The pitch moves to `/about`. |
| `/season/:year` | Calendar, standings (drivers/constructors), **title-odds-over-time** chart |
| `/race/:year/:round` | Tabs: **Overview · Results · Strategy · Pace · Tyres · Pit stops · Incidents/SC · Weather · Prediction vs Result** |
| `/predictions` | Next-race forecast, season forecast, **scorecard** of past predictions |
| `/drivers`, `/driver/:code` | Ratings (driver vs car split), season/career timeline, style cluster + evidence, head-to-head vs teammate |
| `/teams`, `/team/:id` | Car strength trend, reliability, pit-crew stats, strategy tendencies |
| `/tracks`, `/track/:id` | Data-driven intel: SC odds, overtaking, deg, typical strategy, history of winners |
| `/lab` | **Strategy Lab** (real what-if, Model E) |
| `/compare` | Driver-vs-driver and team-vs-team |
| `/methodology` | Model cards, backtest metrics, data sources, limitations |
| `⌘K` search | Jump to any driver/race/track |

### 6.2 Engineering foundation

- [ ] **Data layer**: TanStack Query with persisted cache; typed client generated from the schemas; prefetch on link hover; `stale-while-revalidate`.
- [ ] **Routing/perf**: `React.lazy` per route, `manualChunks` for `recharts`/`framer-motion`, `LazyMotion` or drop framer-motion where CSS suffices, lazy-load lap-level data on tab open.
- [ ] **Perf budgets (CI-enforced)**: initial JS ≤ ~200 KB gz, LCP ≤ 2.5 s on throttled mobile 4G, CLS < 0.1; Lighthouse CI on PRs.
- [ ] **Assets**: self-host images in AVIF/WebP with `srcset`; remove hotlinked images (also a reliability and rights issue — confirm licensing for any driver photos used); subset/`font-display: swap` fonts.
- [ ] **Design system**: tokens (colour incl. team colours keyed by constructor id *per season*, type scale, spacing), a handful of primitives (Card, Stat, Tabs, Table, Chart wrapper, Skeleton, ErrorState). Minimum text ~12 px, AA contrast, keyboard focus, `prefers-reduced-motion`. Keep the dark/red identity, drop the decorative terminal jargon (B5) — and never label static data "live".
- [ ] **Resilience**: every data view has loading skeleton, empty state, error state with retry.
- [ ] **Shareability**: URL-encoded state (selected drivers, tab), per-race OG images generated in the pipeline, "copy link"/"download PNG" on charts.
- [ ] **Quality**: Vitest + React Testing Library for key components, Playwright smoke for 5 core flows, ESLint in CI (already configured, not enforced), TS strict.
- [ ] Revive the orphaned `components/race/*` where they fit the new tabs (constructor table, standings, incident timeline, telemetry visualiser) instead of rewriting from scratch; delete the rest.

### 6.3 New charts/visuals (all derivable from the pipeline)

- Tyre-strategy timeline (stint bars coloured by compound) per race — the classic.
- **Race trace** (gap-to-leader or position vs lap) with SC/VSC bands.
- Lap-time distribution (violin/box) per driver, clean-air only.
- Pace delta vs fastest, team-level.
- Pit-stop duration and time-loss ranking.
- Quali head-to-head across season (teammate gap %).
- Title-odds-over-time and points-needed ladder.
- Prediction reliability diagram on Methodology page.

---

### 6.4 Flagship: in-browser Race Replay (inspired by `IAmTomShaw/f1-race-replay`, MIT)

**What that project is**: a desktop Python app (Arcade + PySide6). It gets everything from **FastF1** (`session.load(telemetry=True)`, per-lap `get_telemetry()`), needs the **F1TV login**, resamples every channel to a 25 FPS timeline with `np.interp`, **recomputes the leaderboard itself** from distance (its README lists inaccuracies at the start, in pits and at the end), draws cars as dots on a track outline built from the fastest lap's X/Y, animates the safety car from track status, and offers 0.1×–256× playback, DRS zones, driver telemetry on click, live championship standings, and a Bayesian tyre-degradation model. Pickled caches mean the data folder must be trusted. We keep the idea and drop the dependencies: it's a desktop install, tied to the F1TV login, with a self-computed leaderboard.

**Our version: same wow, none of those constraints**
- **Data (free, no login — probed 2026-11-24 on 2024 Italian GP)**: OpenF1 `location` (x, y, z per car, ~33k rows for one driver), `car_data` (speed, rpm, gear, throttle, brake, DRS), `position` and `intervals` (official order and gaps — so no home-made leaderboard), `laps` (sectors, speed traps), `stints`, `pit`, `race_control` (flags/SC/penalties), `drivers` (colour, headshot URL). **Coverage: 2023 onward only.** 2018–2022 replays would need FastF1 telemetry, which isn't credential-free, so they're out of scope unless a snapshot exists.
- **Build step (pipeline, once per race)**: fetch → align to a common clock → downsample to ~5 Hz (smooth with a spline in the browser) → quantise and delta-encode → one compact binary/JSON file per race (target ≈ 1–3 MB gzipped, **to be measured**), plus a small `meta.json`. Track outline from the fastest clean lap. Each file has a `Quality` block; races with missing channels still replay with those panels greyed out.
- **Browser (Canvas/PixiJS)**: dots + trails on the circuit, pit-lane, SC/VSC and flag overlays, leaderboard with tyre/age/gaps, scrub bar with markers (pit stops, SC, incidents, overtakes), speed, the click-a-driver telemetry traces, sector colours, weather strip, 0.25×–32× playback, **shareable deep links** (`?lap=23&driver=VER`), mobile layout. The data file loads on demand; nothing else on the site depends on it.
- **What makes it ours (the ML tie-in)**: a **win-probability / predicted-finish line that moves as you scrub**, "what-if pit now" from the strategy model, tyre-deg curves per stint, battle detection ("closing 0.4 s/lap, DRS in 3 laps"), and a predicted-vs-actual overlay.
- **Phasing**: v1 = replay one 2024/2025 race with leaderboard + pit/SC markers (proves the data pipeline and size); v2 = telemetry panel + deep links; v3 = ML overlays. Needs Phase 1's pipeline first.
- **To confirm before building**: OpenF1's terms and rate limits for a bulk backfill (be polite, snapshot once); real per-race file size; browser frame rate with 20 cars + trails on a mid phone. Licence note: that repo is MIT with a "non-commercial/educational" disclaimer for its data use; we learn from the approach and write our own code rather than copying.

---

## 7. Feature backlog (ideas, scored)

Value = user-visible payoff · Effort = S(≤2d) M(≤1w) L(>1w).

| Feature | Value | Effort | Depends on |
|---|---|---|---|
| **Race Replay** in the browser (2023+; win-prob overlay later) | ★★★★★ | L | Phase 1 + OpenF1 backfill (§6.4) |
| Next-race win/podium probabilities + "why" | ★★★★★ | L | Models A, B |
| Championship odds + clinch scenarios + odds-over-time | ★★★★★ | L | B, C |
| Prediction scorecard (honest, pre-logged) | ★★★★ | M | B |
| Driver vs car rating | ★★★★★ | L | A |
| Strategy Lab on real deg/pit-loss data | ★★★★ | L | D, E |
| Race tabs: strategy timeline, race trace, pace distributions | ★★★★ | M | Phase 1 |
| Track pages with SC odds / overtaking / typical strategy | ★★★★ | M | F |
| Driver style clusters with evidence | ★★★ | M | G |
| Global ⌘K search, shareable URLs, OG cards | ★★★ | S–M | Phase 2 |
| "Was it a good strategy?" retrospective | ★★★ | M | E |
| Season "wrapped"/recap cards (shareable) | ★★★ | M | Phase 1 |
| Era/GOAT comparisons via ratings (back to 1950) | ★★★ | M | A + Jolpica |
| Fan prediction game vs the model (needs accounts) | ★★★ | L | B, auth |
| Live race mode (in-race win prob) | ★★★★ | L | OpenF1, §5.8 |
| Public read-only API / data downloads | ★★ | S | Phase 1 (it's already static JSON) |

---

## 8. Roadmap

| Phase | Window | Deliverable | Gate to exit |
|---|---|---|---|
| **0** Measure, harden & hotfix | Days 1–6 | Baseline doc; common FastF1 client; coverage matrix + null policy; security baseline; structured + audit logging; routes served from precomputed data; lazy routes; optimised hero images | Race page TTFB < 500 ms; no request-time FastF1; coverage.json 2020–2026; no print/console; audit entries verifiable |
| **1** Data platform | Wk 1–2 | Parquet pipeline, schemas, CI ingest, per-view JSON on CDN, 2026 data, real driver/standings files | New race auto-publishes; DQ checks green |
| **2** Frontend revamp | Wk 2–5 | New IA, design system, query layer, race tabs, driver/team/track pages | Perf budgets pass in CI; no dead/fake routes |
| **3** ML v1 | Wk 3–6 | Ratings (A), race predictor (B), championship sim (C) + backtests + Predictions/Methodology pages | Beats baselines on walk-forward; calibrated; predictions logged pre-race |
| **4** Strategy | Wk 6–9 | Tyre deg (D), optimiser (E) in-browser, Strategy Lab, track intel (F) | Replay validation within agreed tolerance |
| **5** Depth | Wk 9–11 | Clusters (G), retrospective strategy, compare, wrapped cards, search | — |
| **6** Optional | later | Live mode, accounts + prediction game, public API docs | — |

Phases 2 and 3 can run in parallel (data contract from Phase 1 is the interface). If time is short, **Phases 0 → 1 → "race page + predictions page"** already deliver most of the user-visible win.

---

## 9. Decisions needed from you

1. **Hosting for the dynamic bit**: (a) run the strategy simulator in the browser and drop the Python server entirely (recommended — also ends cold starts), (b) keep a small FastAPI on Render with a keep-alive, or (c) move it to a free always-on host. Static JSON on Vercel's CDN works for all three.
2. **MongoDB**: drop it for read-only data (recommended), or keep it for a future accounts/saved-comparisons feature?
3. **History depth**: 2018+ only (FastF1 lap data), or also pull 1950+ results from Jolpica for the ratings/GOAT features? (Recommended: yes for ratings, down-weighted across eras.)
4. **Public predictions**: confirm you're comfortable publishing win probabilities (and adding a "not betting advice" note). Avoid any odds-comparison/betting-site integration.
5. **Images**: OK to replace hotlinked photos with licensed/illustrated or team-colour graphics? Driver photos have rights implications.
6. **Scope/branding**: README title is "F1^4", app header says "F1 StratHub", repo is "F1-for-F1", API says "Specter Engine". Pick one name before the revamp.
7. **Capacity**: solo or with Rishi? That decides whether Phases 2 and 3 truly run in parallel.
8. **✅ DECIDED (2026-11-24): no F1TV subscription, no F1 account, no credentials in any form.** **Data access without accounts**: FastF1 is free, but 3.9.2 sends an F1TV subscription token to F1's livetiming server and otherwise falls back to a mirror that lacked 3 of my 5 sample races. We avoid the dependency entirely: Jolpica (results/pits/lap times) + OpenF1 (2023+ stints/tyres/weather) + FastF1 mirror best-effort + permanent snapshots (§3.2). 2020–2022 tyre/stint detail is expected to be **available** via the TracingInsights per-year repos (verified on 2020 Austria, 2021 Abu Dhabi, plus folder counts for 2020/2022); any race where it isn't is labelled `PARTIAL`. The coverage run (§3.1) gives the real numbers.
9. **Log/audit destination**: where should logs and the audit trail live (free log service + audit branch/object storage are my defaults)? Retention period?

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| FastF1/Jolpica availability or rate limits break ingestion | Cache raw responses as Parquet artifacts; ingestion is idempotent and retried; site never depends on them at request time |
| Small data → overfit, overconfident probabilities | Walk-forward eval, strong baselines, regularisation, calibration, show uncertainty |
| 2026 regulation reset degrades car-strength priors | Partial prior reset + widened uncertainty early in era; communicate in UI |
| Counterfactual strategy claims overreach | Show intervals and assumptions; label as model estimates, not verdicts |
| Scope creep | Phase gates; Phase 0–1 + two flagship pages is the minimum viable revamp |
| F1 trademark/data terms | Keep the existing "not affiliated" disclaimer; check data-source terms; avoid official logos/photos |
| Free-tier limits (Actions minutes, CDN bandwidth) | Per-view small files, skip-if-unchanged ingestion, cached FastF1 dir |

---

## 11. First concrete steps (suggested order)

1. Run the Phase 0 baseline (Lighthouse + curl timings + bundle visualiser) → `docs/perf-baseline.md`.
2. Generate precomputed JSON for 2020–2025 with the fixed script; point `seasons.py` at it; deploy. **Expect the biggest single latency drop here.**
3. Stub the missing driver/standings endpoints from the same data so the Drivers pages work.
4. Lazy-load routes, compress the hero images, add skeletons.
5. Start `pipeline/` + schemas; port the precompute script into it.
6. In parallel, start `ml/ratings` (Elo baseline → hierarchical) and the walk-forward evaluation harness — the harness is what makes every later model trustworthy.
