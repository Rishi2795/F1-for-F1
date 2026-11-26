# F1 for F1

Formula 1 race strategy and performance analytics for the 2019 to 2026 seasons, built from free public data and explainable models. It is made for fans, analysts and engineers who want to understand what decided a race, not only who won it.

> An unofficial fan project. Not affiliated with, or endorsed by, Formula 1, the FIA or any team.

## What it does

| Area | What you get |
|---|---|
| **Follow the season** | Schedule with a countdown and the weekend timetable in your own time zone, news headlines, a race archive with a "worth watching" score, standings (with a points progression chart), drivers and circuits |
| **Race analysis** | One page per race (results, qualifying ladder, lap chart, tyre strategy, pace) and a race lab: map replay, fastest-lap telemetry, gap and pace charts, incidents, "where it went wrong" |
| **Predict and analyse** | Race and championship forecasts with a public scorecard, driver-or-car ratings, teammate duels, team pace |
| **Play** | A strategy simulator (plan stops, add rain and safety cars, test across hundreds of simulated races or race it live), "Beat the model" podium picks, and "My driver" (kept on your device only) |

Everything is free, needs no login, and tracks nothing. Where data is missing it is shown as missing, never filled with a plausible number.

## How it fits together

```
free public sources ──▶ pipeline (validate, derive, model) ──▶ static JSON ──▶ read-only API ──▶ React site
```

* **Sources** (no account or key needed): Jolpica-F1 (results, standings, pit stops), TracingInsights (laps, tyres, weather), OpenF1 (tyre cross-check, telemetry, replay) and the public RSS feeds of five motorsport publishers (headlines only).
* **`pipeline/`** is the only part that talks to the outside world. It runs offline, validates everything against typed models, and publishes JSON. Every publish is recorded in a hash-chained audit log (`audit/`).
* **`backend/`** is a small read-only FastAPI service over those files. It never calls an upstream source while a visitor waits.
* **`frontend/`** is a React + TypeScript + Vite site with route-level code splitting, a cached API client and hand-drawn SVG charts.

The full architecture, every model and endpoint, and a file-by-file map are in [docs/changes.md](docs/changes.md).

## Repository layout

```
backend/    API (app/), its tests, and the published data it serves (data/published/)
pipeline/   Data pipeline (f1data/) and its tests
frontend/   The website (src/), browser tests (e2e/), static files (public/)
scripts/    Operator tools (deploy smoke test, photo review, data cross-checks)
audit/      Append-only, hash-chained log of every data publish
docs/       Deploy guide, forecasting notes, performance baseline, plan, change log
```

## Run it

```bash
# 1. data (optional: a published bundle is already committed)
cd pipeline && pip install -r requirements-dev.txt
python -m f1data refresh && python -m f1data validate

# 2. API
cd backend && pip install -r requirements-dev.txt
uvicorn app.main:app --reload            # http://localhost:8000/docs

# 3. site
cd frontend && npm ci
npm run dev                              # VITE_API_URL=http://localhost:8000/api (see .env.example)
```

Checks: `ruff check backend pipeline`, `pytest` in `backend/` and `pipeline/`, and in `frontend/`: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.

Deployment (Vercel for the site, Render for the API, no database) is in [docs/deploy.md](docs/deploy.md).

## Documentation

* [docs/changes.md](docs/changes.md): architecture, flows, models, APIs, data layout, every file and why it exists, what was removed
* [docs/deploy.md](docs/deploy.md): deploying the API and the site
* [docs/forecasting.md](docs/forecasting.md): how the forecasts are trained, tested and deployed
* [docs/perf-baseline.md](docs/perf-baseline.md): measured performance before and after the rebuild
* [docs/plan.md](docs/plan.md): the engineering plan and status log

## Disclaimer

This project uses publicly available race data for educational and analytical purposes. It is not endorsed by Formula 1, the FIA, or any team. Driver portraits are the property of Formula 1 and are shown from formula1.com with a credit; headlines and links belong to their publishers.

## Author

Built by Rishi. Computer Science Engineer, full-stack, data and systems.
