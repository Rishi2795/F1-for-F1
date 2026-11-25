# Deploying

**Frontend → Vercel. API → Render.** The API is small and read-only: no database, no FastF1, no
secrets. Remove the old `MONGO_URI_NEW` variable; nothing uses it any more.

## 1. API on Render

Two ways; both end in the same settings.

**A. Keep your existing service (URL stays `https://f1-for-f1.onrender.com`)** → Dashboard → the service → Settings:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| Auto-Deploy | After CI checks pass (or On commit) |

Environment (Settings → Environment):

| Variable | Value | Why |
|---|---|---|
| `PYTHON_VERSION` | `3.12.10` | Render ignores `runtime.txt`; the full version is required. Tested locally on 3.12.10 |
| `APP_ENV` | `production` | Disables `/docs`, enables HSTS |
| `ALLOWED_ORIGINS` | `https://f1-for-f1.vercel.app` | **Set this.** Comma-separate extra origins (custom domain). If unset, the API allows `localhost` and any `*.vercel.app` and logs a warning |
| `TRUST_PROXY` | `true` | Render is exactly one proxy hop. Without it every visitor shares one IP and the rate limiter throttles everyone together |
| `RATE_LIMIT_PER_MINUTE` | `240` | Per client; `0` disables |
| `LOG_LEVEL` | `INFO` | JSON logs to stdout |
| `LOG_IP_SALT` | any random string | Optional: stable hashed client ids across restarts |

Delete `MONGO_URI_NEW`. Then **Manual Deploy → Clear build cache & deploy**.

**B. New service from `render.yaml`** (New → Blueprint). Creates `f1-for-f1-api`; then point Vercel at its URL.

The published data (`backend/data/published`, ~3.6 MB) is committed, so a deploy carries the data
with it. Updating data = run the pipeline, commit, merge.

## 2. Frontend on Vercel

Set `VITE_API_URL` to your API URL, e.g. `https://f1-for-f1.onrender.com` (with or without `/api`;
the API answers both), then redeploy. `frontend/vercel.json` adds security headers and a
**report-only** CSP; check the browser console for CSP reports on a preview, then switch it to
enforcing (`Content-Security-Policy`) once clean.

**Order matters:** deploy and verify the API *first*, then the frontend. The new frontend needs the
new API's data format; the old API makes race pages show "This page hit an error".

## 3. Prove it works

```bash
pip install certifi        # only if Python complains about certificates (common on macOS)
python scripts/check_deploy.py https://f1-for-f1.onrender.com \
    --origin https://f1-for-f1.vercel.app --expect-season 2026
```

It checks the new code is live, the data is published, the data format, caching (ETag/304), clean
errors (no stack traces), security headers, `/docs` disabled, and CORS (your site allowed,
strangers refused). Exit code 0 = all pass. The first request may take 30–60 s on the free tier
(Render sleeps when idle).

You can also run it from GitHub: **Actions → Check deployment → Run workflow**.

## 4. Free-tier behaviour to expect

- The service sleeps after ~15 min idle; the next request wakes it (cold start, tens of seconds).
  The frontend retries once, but the first visit after a quiet period is slow. Phase 1 (static
  files on a CDN) removes this.
- 512 MB RAM: the API uses ~55 MB.

## 5. Railway (or any other host also watching this repo)

If another service (e.g. a Railway project) is connected to the repo it will rebuild on every push to
`main` and report a failed deployment on commits. Disconnect it there, or in GitHub → Settings →
Integrations. The pinned `backend/.python-version` also lets such a host install a current Python.

## Refreshing data

One command does everything, in the right order (about 40 seconds with cached data):

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r pipeline/requirements.txt
cd pipeline
python -m f1data refresh                     # results, qualifying/sprints, derived stats, ratings, forecasts, gates
```

It exits non-zero if any gate fails, so a bad refresh is never published. The pieces, if you want them separately:

```bash
python -m f1data ingest --seasons 2026       # results, laps, tyres, standings (cached; add --skip-sync to stay offline)
python -m f1data enrich                      # qualifying and sprint results (needs the network)
python -m f1data derive                      # worth-watching scores, teammate duels, circuit profiles (offline)
python -m f1data ratings                     # driver and car ratings
python -m f1data predict                     # race and championship forecasts, model card
python -m f1data validate                    # data-quality gate
python -m f1data verify-audit                # audit log hash chain
```

### Automatic refresh

`.github/workflows/refresh-data.yml` runs `refresh` every 20 minutes on race weekends (Sunday 05:00 UTC to Monday 04:00
UTC), once a day at 06:30 UTC otherwise, and on demand from the Actions tab (with an optional season range). If anything
changed it opens a pull request named `data-refresh/<date>`. **Merging that PR is the deploy**: Vercel and Render
rebuild from `main`. Nothing needs a secret: every source is free and public.

A race therefore appears on the site about as soon as the sources publish it (Jolpica results usually within the
hour; OpenF1 telemetry a little later, picked up by a later run) plus the time to merge. To remove the merge wait, set
the repository **variable** `AUTO_MERGE` to `true` (Settings, Secrets and variables, Actions, Variables), turn on
"Allow auto-merge", and make the CI check required on `main`: the pull request then merges itself once the data gates
pass. Left unset, a person merges.

`python -m f1data telemetry --seasons 2023-2026` backfills fastest-lap telemetry (resumable, newest first; about a
minute and a half a race because OpenF1 rate-limits). The scheduled refresh only fetches the 3 newest races that lack it.

`python -m f1data replay --limit 2` builds the real-position replay (every car, once a second, with sensors) for the newest
races only: about 8 minutes a race, 2.7 MB (about 780 KB compressed). It needs OpenF1 to have published the race; until then
the site keeps its timing-only replay and the next scheduled run tries again. Older races are never backfilled. The same step fetches each race's race-control messages (`incidents/`), which explain
collisions, penalties and safety cars. To fill a whole season by hand: `python -m f1data replay --seasons 2026 --limit 30`
(resumable; about 20 to 25 minutes a race while OpenF1 rate-limits). `python scripts/verify_events.py 2026` cross-checks
results, pit stops and retirements.

### How the models are trained

Both models (driver and car ratings, race and championship forecasts) are fitted from the published race files on every
refresh, so there is no separate training environment and nothing to keep in sync. Everything is seeded, so the same
data gives the same numbers. `backend/data/published/predictions/model.json` is the trained model's record: the
weights, the settings chosen on 2021 to 2023, the fingerprint of the data it was trained on (`training.data_hash`), and
its accuracy on seasons it never saw. To retrain, run `python -m f1data predict`. See `docs/forecasting.md`.

Sources (all free, no login): Jolpica-F1, TracingInsights, OpenF1. Needs `git`.
Every run appends tamper-evident entries to `audit/`.
