#!/usr/bin/env python3
"""Smoke-test a deployed F1 for F1 API and report PASS/FAIL for each expectation.

    python scripts/check_deploy.py https://your-api.onrender.com --origin https://your-site.vercel.app

Standard library only. Exit code 0 = every check passed, 1 = at least one failed.
Free-tier hosts sleep when idle, so the first request can take 30-60 s; timeouts are generous.
"""

from __future__ import annotations

import argparse
import json
import ssl
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field


@dataclass
class Response:
    status: int  # 0 = no HTTP answer at all (see `error`)
    headers: dict[str, str]
    body: bytes
    seconds: float
    error: str | None = None

    def data(self):
        """Parsed JSON body, or None if it is not JSON (e.g. an HTML error page from the host)."""
        try:
            return json.loads(self.body)
        except ValueError:
            return None


def _ssl_context() -> ssl.SSLContext:
    """Default trust store, plus certifi's bundle when installed (python.org builds on macOS ship none)."""
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


@dataclass
class Report:
    results: list[tuple[bool, str, str]] = field(default_factory=list)

    def check(self, ok: bool, name: str, detail: str = "") -> bool:
        self.results.append((ok, name, detail))
        sys.stdout.write(f"{'PASS' if ok else 'FAIL'}  {name}{('  - ' + detail) if detail else ''}\n")
        return ok


def request(url: str, method: str = "GET", headers: dict[str, str] | None = None, timeout: float = 90.0) -> Response:
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "f1-deploy-check/1.0", **(headers or {})})  # noqa: S310
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_ssl_context()) as resp:  # noqa: S310
            body, status, hdrs = resp.read(), resp.status, dict(resp.headers.items())
    except urllib.error.HTTPError as err:
        body, status, hdrs = err.read(), err.code, dict(err.headers.items())
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        reason = str(getattr(err, "reason", err))
        return Response(0, {}, b"", time.perf_counter() - started, error=reason)
    return Response(status, {k.lower(): v for k, v in hdrs.items()}, body, time.perf_counter() - started)


def run(base: str, origin: str | None, expect_season: int | None) -> int:
    base = base.rstrip("/")
    r = Report()
    api = f"{base}/api"

    # -- is it the NEW code, and is the data there? -------------------------------------------------
    first = request(f"{base}/health")  # may be slow: the host could be waking up
    if first.status == 0:
        hint = ""
        if "CERTIFICATE_VERIFY_FAILED" in (first.error or ""):
            hint = " | Python has no root certificates: run `pip install certifi` (or macOS: /Applications/Python*/Install Certificates.command)"
        r.check(False, "the API is reachable", f"{first.error}{hint}")
        sys.stdout.write("\n0 checks could run: fix the connection problem first\n")
        return 2
    r.check(first.status == 200, "health endpoint answers 200", f"{first.seconds:.1f}s (first request; cold start included)")
    seasons: list[int] = []
    health = first.data()
    if isinstance(health, dict) and health.get("seasons"):
        seasons = health["seasons"]
        r.check(health.get("status") == "ok", "health lists the published seasons (new API code)", str(seasons))
    else:
        r.check(False, "health lists the published seasons (new API code)", f"got {first.body[:60].decode(errors='replace')!r} - the old API code is still running")
    if expect_season:
        r.check(expect_season in seasons, f"season {expect_season} is published")

    warm = request(f"{base}/health")
    r.check(warm.seconds < 2.0, "warm response is fast", f"{warm.seconds * 1000:.0f} ms")
    r.check(request(f"{base}/health", method="HEAD").status == 200, "HEAD works (uptime pingers and CDNs use it)")

    listing = request(f"{api}/seasons")
    r.check(listing.status == 200 and (listing.data() or {}).get("seasons") == seasons, "/api/seasons matches health")

    latest = seasons[0] if seasons else 2025
    races = request(f"{api}/seasons/{latest}/races")
    race_rows = (races.data() or {}).get("races", []) if races.status == 200 else []
    r.check(bool(race_rows) and all("data_status" in x for x in race_rows), f"{latest} calendar has data_status per race", f"{len(race_rows)} races")

    played = next((x for x in race_rows if x.get("data_status") in ("ok", "partial")), None)
    if played:
        doc = request(f"{api}/seasons/{latest}/races/{played['round']}")
        body = (doc.data() or {}) if doc.status == 200 else {}
        r.check(doc.status == 200 and "quality" in body and body.get("drivers"), "a played race returns the new data format (quality + drivers)")
        etag = doc.headers.get("etag")
        r.check(bool(etag), "responses carry an ETag")
        if etag:
            cond = request(f"{api}/seasons/{latest}/races/{played['round']}", headers={"If-None-Match": etag})
            r.check(cond.status == 304, "conditional request returns 304 Not Modified")
        r.check("max-age" in doc.headers.get("cache-control", ""), "responses are cacheable")
    else:
        r.check(False, "found a played race to test")

    standings = request(f"{api}/seasons/{latest}/standings")
    srounds = (standings.data() or {}).get("rounds", []) if standings.status == 200 else []
    r.check(bool(srounds), f"{latest} standings are served", f"{len(srounds)} rounds")

    ratings = request(f"{api}/ratings")
    rated = (ratings.data() or {}).get("ratings", []) if ratings.status == 200 else []
    r.check(len(rated) >= 10, "driver and car ratings are served", f"{len(rated)} drivers")
    forecast = request(f"{api}/predictions/next")
    races = (forecast.data() or {}).get("races", []) if forecast.status == 200 else []
    r.check(forecast.status in (200, 404), "race forecasts are served (or cleanly absent)", f"{len(races)} race(s)")
    title = request(f"{api}/predictions/championship")
    r.check(title.status in (200, 404), "championship forecast is served (or cleanly absent)")
    circuits = request(f"{api}/circuits")
    r.check(circuits.status in (200, 404), "circuit profiles are served (or cleanly absent)")
    duels = request(f"{api}/seasons/2024/duels")
    r.check(duels.status in (200, 404), "teammate duels are served (or cleanly absent)")
    card = request(f"{api}/ratings/model")
    r.check(card.status == 200 and "metrics" in (card.data() or {}), "the ratings model card (accuracy report) is served")

    drivers = request(f"{api}/drivers")
    listed = drivers.data() if drivers.status == 200 else None
    r.check(isinstance(listed, list) and len(listed) >= 20, "/api/drivers is served", f"{len(listed) if isinstance(listed, list) else 'HTTP ' + str(drivers.status)} drivers")
    r.check(request(f"{api}/coverage").status == 200, "/api/coverage is served")

    # -- errors never leak internals ----------------------------------------------------------------------
    bad = request(f"{api}/seasons/abc/races")
    r.check(bad.status == 422 and (bad.data() or {}).get("error") == "invalid_request", "invalid input gives a clean 422")
    missing = request(f"{api}/does-not-exist")
    mj = missing.data() if isinstance(missing.data(), dict) else {}
    r.check(missing.status == 404 and mj.get("error") == "not_found" and "request_id" in mj, "unknown path gives a clean JSON 404 with a request id")
    leaked = any(w in (bad.body + missing.body).decode(errors="replace").lower() for w in ("traceback", 'file "', "/srv/", "site-packages"))
    r.check(not leaked, "error bodies contain no stack traces or file paths")

    # -- security posture ---------------------------------------------------------------------------------
    h = warm.headers
    r.check(h.get("x-content-type-options") == "nosniff", "X-Content-Type-Options: nosniff")
    r.check(bool(h.get("x-request-id")), "every response has an X-Request-ID")
    if base.startswith("https://"):
        r.check("max-age" in h.get("strict-transport-security", ""), "HSTS is set (production mode)")
    r.check(request(f"{base}/docs").status == 404, "interactive /docs is disabled in production")

    # -- CORS: the website may call the API, strangers may not --------------------------------------------
    if origin:
        pre = request(f"{api}/seasons", method="OPTIONS", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
        r.check(pre.headers.get("access-control-allow-origin") == origin, f"CORS allows your site ({origin})")
        r.check("access-control-allow-credentials" not in pre.headers, "CORS does not allow credentials")
        evil = request(f"{api}/seasons", headers={"Origin": "https://evil.example"})
        r.check("access-control-allow-origin" not in evil.headers, "CORS refuses unknown origins")
        # Without ALLOWED_ORIGINS the API falls back to allowing every *.vercel.app site.
        stranger = request(f"{api}/seasons", headers={"Origin": "https://some-other-project.vercel.app"})
        r.check(
            "access-control-allow-origin" not in stranger.headers,
            "CORS refuses other *.vercel.app sites",
            "set ALLOWED_ORIGINS on the host" if "access-control-allow-origin" in stranger.headers else "",
        )

    failed = [x for x in r.results if not x[0]]
    sys.stdout.write(f"\n{len(r.results) - len(failed)}/{len(r.results)} checks passed\n")
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("url", help="API base URL, e.g. https://your-api.onrender.com (no /api)")
    parser.add_argument("--origin", help="your frontend origin, to verify CORS, e.g. https://your-site.vercel.app")
    parser.add_argument("--expect-season", type=int, help="fail unless this season is published (e.g. 2026)")
    args = parser.parse_args()
    return run(args.url, args.origin, args.expect_season)


if __name__ == "__main__":
    sys.exit(main())
