# Performance baseline & Phase 0 results

Measured on 2026-11-24 on a developer laptop. **The deployed site was not measured**
(no URL in the repo), so production numbers below are marked *not measured*. Re-run the
commands at the bottom against production and paste the results here.

## Backend: race page API

| | Before (commit `593bb51`) | After (Phase 0) |
|---|---|---|
| What a race request did | Download and parse a live-timing session, then loop 20 drivers over the laps | Read one precomputed JSON file (bytes served as-is, ETag, gzip) |
| Cold load of one race | **7.2 s** and **7.3 s** (2021 R12 / R22, empty cache, fast home connection) | n/a, no upstream call at request time |
| Request latency | not measured, includes the load above on every cache miss | **1.0–3.4 ms** time-to-first-byte locally (race, list, drivers, coverage) |
| Cache survives redeploy | No: the live-timing cache lived on the container disk | Not needed |
| Races that failed to load lap data | 3 of 5 sampled races (2020 R1, 2024 R24, 2025 R24) | 0 of 152 played races have no lap data |
| Tyre-compound agreement with an independent source (OpenF1, 2023–2026) | not measurable | 5,118 of 5,119 stints (99.98%) |
| Python dependencies | 42 packages, 333 MB (a live-timing library, pandas, numpy, pymongo…) | 23 packages, 38 MB |
| Process start → ready | ~0.2 s of imports locally | ~0.16 s (small difference: imports were never the bottleneck) |
| On Render free tier (sleep/wake, slower CPU) | *not measured* | *not measured* |

Render's free tier is slower than a laptop, so the real "before" was probably worse
than 7 s. It still sleeps when idle; the API now wakes quickly but the first request after
a sleep still pays the platform's wake-up time. Phase 1 (static JSON on a CDN) removes that.

## Frontend

| | Before | After |
|---|---|---|
| JS (single bundle) | 474.2 kB (151.5 kB gzip) | split per route |
| JS loaded on first visit (entry + react + motion + page) | 151.5 kB gzip | ~114 kB gzip for the entry shell, +17 kB for the page (`/explore`) |
| Race page code | in the main bundle | 21.7 kB (5.9 kB gzip), loads only on visiting a race |
| Hero images | 772 KB + 604 KB PNG | 75 KB + 68 KB WebP (**−90%**, transparency kept) |
| Loading state | bare spinner | skeletons; errors show a retry |
| API calls | refetched on every mount | 5-min in-memory cache, request de-duplication, prefetch on hover, one retry for sleeping hosts |

`framer-motion` (40 kB gzip) is still in the first load because the always-visible
dock and scroll rail use it. Removing that is a Phase 2 task.

## Data coverage (2020–2026, 154 scheduled rounds)

149 complete · 3 partial · 2 upcoming · **0 missing** (all of 2023–2026 is complete). The 3 partial races (2021 Belgium, 2022 Monaco, 2022 Austria) lack tyre compounds for some stints in every free source; see `plan.md`.
Machine-readable: `backend/data/published/coverage.json` (also `GET /api/coverage`).

## Reproduce / measure production

```bash
# API timings (cold = first call after idle)
for p in /health /api/seasons /api/seasons/2024/races/5 /api/drivers; do
  curl -s -o /dev/null -w "$p ttfb=%{time_starttransfer}s total=%{time_total}s\n" "$API$p"
done

# Frontend: Lighthouse, mobile preset, throttled 4G
npx lighthouse "$SITE/explore" --preset=perf --form-factor=mobile --only-categories=performance

# Bundle
cd frontend && npm run build
```
