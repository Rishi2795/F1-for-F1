# Deploying

## API (Render)

The API is now small and read-only: **no database, no FastF1, no secrets.**
Remove the old `MONGO_URI_NEW` environment variable; it is no longer used.

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/health` |

Environment variables:

| Variable | Recommended | Why |
|---|---|---|
| `APP_ENV` | `production` | Disables `/docs`, enables HSTS |
| `ALLOWED_ORIGINS` | your frontend origin(s), comma separated, e.g. `https://your-app.vercel.app` | **Set this.** If unset the API falls back to allowing `localhost` and any `*.vercel.app` origin and logs a warning |
| `TRUST_PROXY` | `true` | Render is exactly one proxy hop. Without it every visitor shares one IP, so the rate limiter would throttle everyone together |
| `RATE_LIMIT_PER_MINUTE` | `240` (default) | Per client; `0` disables |
| `LOG_LEVEL` | `INFO` | JSON logs to stdout |
| `LOG_IP_SALT` | any random string | Makes hashed client ids stable across restarts (optional) |
| `DATA_DIR` | *(unset)* | Defaults to `backend/data/published` |

Do not set credentials of any kind; the app needs none.

The published data (`backend/data/published`, ~3.3 MB) is committed, so a deploy
carries the data with it. Updating data = run the pipeline, commit, deploy.

Old frontend builds called the API without the `/api` prefix. Those paths still work
(marked `Deprecation: true`, and logged with `legacy_path: true`). Once the logs show no
`legacy_path` traffic, delete the second `include_router` loop in `app/main.py`.

## Frontend (Vercel)

Set `VITE_API_URL` to `https://<your-api>/api` (note the `/api`).
`frontend/vercel.json` adds security headers and a **report-only** CSP; check the browser
console for CSP reports on a preview deploy, then switch it to enforcing
(`Content-Security-Policy`) once clean.

## Refreshing data

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r pipeline/requirements.txt
cd pipeline
python -m f1data ingest --seasons 2026       # current season (first run ~1–2 min; re-runs are cached)
python -m f1data validate                    # data-quality gate
python -m f1data verify-audit                # audit log hash chain
```

Sources (all free, no login): Jolpica-F1, TracingInsights, OpenF1 (fallback). Needs `git`.
Every run appends tamper-evident entries to `audit/`.
