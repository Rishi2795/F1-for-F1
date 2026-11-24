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

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r pipeline/requirements.txt
cd pipeline
python -m f1data ingest --seasons 2026       # current season (re-runs are cached)
python -m f1data validate                    # data-quality gate
python -m f1data verify-audit                # audit log hash chain
```

Sources (all free, no login): Jolpica-F1, TracingInsights, OpenF1. Needs `git`.
Every run appends tamper-evident entries to `audit/`.
