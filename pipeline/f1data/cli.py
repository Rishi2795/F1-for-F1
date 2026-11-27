"""Command line entry point:  python -m f1data <command>

Commands: ingest | validate | verify-audit
All progress goes through logging (and the audit log); nothing is printed.
"""

from __future__ import annotations

import argparse
import sys
from datetime import UTC, date, datetime, timedelta

from . import config
from .audit import AuditLog
from .build import RaceInputs, build_race
from .consistency import fill_team_colors
from .coverage import build_coverage, race_row, regressions, season_block
from .errors import F1DataError, SourceUnavailable
from .export import Publisher
from .logging_setup import get_logger, setup_logging
from .models import Champion, Champions, RaceIndex, RaceIndexEntry, SeasonStandings
from .sources.jolpica import JolpicaSource, ScheduleEntry
from .sources.openf1 import OpenF1Source
from .sources.tracinginsights import RaceLaps, TracingInsightsSource
from .standings import build_season_standings

log = get_logger("cli")


def _parse_seasons(text: str) -> list[int]:
    """'2024', '2020-2023', '2020,2024' and mixes like '2020-2023,2025-2026'."""
    seasons: set[int] = set()
    for part in (p.strip() for p in text.split(",") if p.strip()):
        try:
            if "-" in part:
                a, b = (int(x) for x in part.split("-", 1))
                if a > b:
                    raise ValueError
                seasons.update(range(a, b + 1))
            else:
                seasons.add(int(part))
        except ValueError:
            raise SystemExit(f"invalid --seasons value {part!r}: use e.g. 2024, 2020-2023 or 2020-2023,2025") from None
    if not seasons:
        raise SystemExit("--seasons is empty")
    return sorted(seasons)


def _match_event(entry: ScheduleEntry, events: dict[str, str]) -> str | None:
    """Match by date (+/-1 day: night races differ between local and UTC date)."""
    day = date.fromisoformat(entry.date)
    for delta in (0, 1, -1):
        folder = events.get((day + timedelta(days=delta)).isoformat())
        if folder:
            return folder
    return None


def run_ingest(
    seasons: list[int],
    rounds: set[int] | None,
    refresh: bool,
    skip_sync: bool,
    use_openf1: bool = True,
    today: date | None = None,
    models: bool = True,
) -> int:
    today = today or datetime.now(UTC).date()
    audit, publisher = AuditLog(), Publisher()
    jolpica, tracing, openf1 = JolpicaSource(), TracingInsightsSource(), OpenF1Source()
    previous_coverage = publisher.load_coverage()
    blocks: dict[int, dict] = {}
    upstream: dict[str, str | None] = {}
    failures = 0

    for season in seasons:
        ttl = config.CURRENT_SEASON_TTL if season >= today.year else None
        try:
            schedule = jolpica.schedule(season, ttl=ttl, refresh=refresh)
            results = jolpica.results(season, ttl=ttl, refresh=refresh)
        except F1DataError as exc:
            log.error("season %d: cannot load schedule/results (%s)", season, exc)
            audit.record("ingest.season", f"season/{season}", "failure", reason=str(exc))
            failures += 1
            continue

        sha: str | None = None
        try:
            if skip_sync and tracing.year_dir(season).exists():
                sha = tracing.sync_year(season)
            else:
                sha = tracing.sync_year(season, refresh=refresh)
        except SourceUnavailable as exc:
            log.warning("season %d: TracingInsights unavailable (%s); building without lap data", season, exc)
        upstream[f"tracinginsights/{season}"] = sha
        events = tracing.events(season)

        entries: list[RaceIndexEntry] = []
        rows: list[dict] = []
        tally = {"written": 0, "unchanged": 0, "kept_previous": 0}
        for entry in schedule:
            selected = rounds is None or entry.round in rounds
            status, doc = "scheduled", None
            if date.fromisoformat(entry.date) <= today:
                existing = publisher.load_race(season, entry.round)
                if selected:
                    doc = _build_one(entry, results.get(entry.round, []), jolpica, tracing, openf1, events,
                                     season, ttl, refresh, use_openf1)
                    outcome = publisher.publish_race(doc)
                    _publish_laps(publisher, tracing, events, entry, season, doc)
                    tally[outcome] += 1
                    if outcome == "kept_previous":
                        doc = existing
                else:
                    doc = existing
                status = doc.quality.status if doc and doc.drivers else "missing"
            entries.append(
                RaceIndexEntry(
                    season=season, round=entry.round, event_name=entry.event_name, location=entry.location,
                    country=entry.country, date=entry.date, data_status=status,
                )
            )
            rows.append(race_row(season, entry.round, entry.event_name, status, doc))
        publisher.publish_index(RaceIndex(season=season, races=entries))
        fill_team_colors(publisher, season)
        standings_rounds = _ingest_standings(season, schedule, entries, rounds, jolpica, publisher, ttl, refresh, today)
        for row in rows:
            if row["status"] in ("ok", "partial"):
                row["standings"] = "ok" if row["round"] in standings_rounds else "missing"
        blocks[season] = season_block(rows)
        b = blocks[season]
        log.info("season %d: %d rounds | ok=%d partial=%d missing=%d scheduled=%d | %s",
                 season, b["expected_rounds"], b["ok"], b["partial"], b["missing"], b["scheduled"], tally)
        audit.record(
            "ingest.season", f"season/{season}", "success" if not b["missing"] else "partial",
            details={"upstream_commit": sha, "ok": b["ok"], "partial": b["partial"], "missing": b["missing"],
                     "scheduled": b["scheduled"], "standings_rounds": len(standings_rounds), **tally},
        )

    # Merge with seasons we did not touch this run, so coverage.json always covers everything.
    merged = dict(previous_coverage.get("seasons", {})) if previous_coverage else {}
    coverage = build_coverage({int(k): v for k, v in merged.items()} | blocks)
    for item in regressions(previous_coverage, coverage):
        audit.record("coverage.regression", f"race/{item['season']}/{item['round']}", "failure",
                     details=item, reason="data status got worse than previously published")
        log.error("coverage regression: %s", item)
        failures += 1
    publisher.publish_coverage(coverage)
    finished = {int(y) for y, b in coverage["seasons"].items() if b["expected_rounds"] and not b["scheduled"]}
    _ingest_champions(jolpica, publisher, today, finished, refresh)
    drivers = publisher.rebuild_drivers()
    if models:
        run_ratings(publisher, audit)
        run_predict(publisher, audit)
    digest = publisher.publish_manifest({"upstream_commits": upstream})
    audit.record("publish.bundle", str(config.PUBLISHED_DIR.name), "success",
                 details={"content_sha256": digest, "drivers": drivers, "seasons": sorted(blocks)})
    return 1 if failures else 0


def _publish_laps(publisher, tracing, events, entry, season, doc) -> None:
    """The per-lap file for a race, if lap data exists (a separate, lazily fetched file)."""
    from .lapdoc import build_lap_doc, trim_to_official

    folder = _match_event(entry, events)
    if not folder or not doc.drivers:
        return
    try:
        laps = tracing.race(season, folder)
    except F1DataError:
        return
    lap_doc = build_lap_doc(season, entry.round, laps.drivers, laps.total_laps)
    if lap_doc is not None:
        retired = {
            d.driver_code: d.laps_completed
            for d in doc.drivers
            if d.status == "Retired" and d.laps_completed is not None
        }
        publisher.write_laps(trim_to_official(lap_doc, retired))


def run_ratings(publisher: Publisher, audit: AuditLog) -> None:
    """Fit the driver/car rating model on the published races and publish it (about 2 seconds)."""
    from .ratings.data import load_races
    from .ratings.publish import publish_ratings
    from .ratings.report import build_report

    races = load_races(publisher)
    if len(races) < 30:
        log.warning("ratings: only %d races published; skipping", len(races))
        return
    report = build_report(races)
    rated = publish_ratings(publisher, report)
    publisher.rebuild_drivers()  # drivers carry their rating
    card = report["card"]
    log.info("ratings: %d drivers rated through %s R%s", rated, card["as_of"]["season"], card["as_of"]["round"])
    audit.record(
        "ratings.build", "ratings", "success",
        details={"version": card["version"], "drivers": rated, "test_pairs": card["test"]["pairs"],
                 "log_loss": {k: v["log_loss"] for k, v in card["metrics"].items()}},
    )


def run_predict(publisher: Publisher, audit: AuditLog) -> None:
    """Fit the forecast model on the published races, backtest it, and publish forecasts for the races to come."""
    from .predict.publish import publish_forecasts
    from .predict.report import build

    built = build(publisher)
    counts = publish_forecasts(publisher, built)
    card = built["card"]
    best = card["variants"][card["forecast_variant"]]
    log.info(
        "forecast: %d upcoming race(s), %d title contenders; winner log loss %.3f vs %.3f for a random pick",
        counts["races"], counts["title_drivers"], best["winner_log_loss"], card["uniform_winner_log_loss"],
    )
    audit.record(
        "forecast.build", "predictions", "success",
        details={"version": card["version"], **counts, "winner_log_loss": best["winner_log_loss"]},
    )
    # a title that is already mathematically decided makes that driver the season's champion (badges and counts follow)
    if publisher.record_clinched_champion():
        publisher.rebuild_drivers()
        log.info("champions: a title was clinched this season and is now recorded")


def run_refresh(seasons: list[int], skip_sync: bool, refresh: bool) -> int:
    """Everything, in the right order: results, qualifying/sprints, derived stats, models, then the safety checks.

    One command for a scheduled job or a laptop. It stops with a non-zero exit code if any gate fails, so a bad
    refresh is never published.
    """
    audit = AuditLog()
    code = run_ingest(seasons, None, refresh, skip_sync, models=False)
    run_enrich(seasons, refresh)
    run_news_step()
    run_simulator_step()
    run_telemetry_step(seasons, limit=REFRESH_TELEMETRY_LIMIT)
    run_replay_step(seasons, limit=REFRESH_REPLAY_LIMIT)
    run_derive(audit)
    publisher = Publisher()
    run_ratings(publisher, audit)
    run_predict(publisher, audit)
    publisher.publish_manifest({})
    problems = publisher.validate()
    for problem in problems:
        log.error("data problem: %s", problem)
    ok, count, problem = AuditLog().verify()
    if not ok:
        log.error("audit chain BROKEN after %d entries: %s", count, problem)
    log.info("refresh finished: %s", "healthy" if not problems and ok and not code else "NEEDS ATTENTION")
    return 0 if not problems and ok and not code else 1


REFRESH_TELEMETRY_LIMIT = 3  # newest races only, so a scheduled refresh stays quick


REFRESH_REPLAY_LIMIT = 2  # the newest races only


def run_simulator_step() -> int:
    """Fit the strategy simulator's model from the cached race laps and publish it."""
    from .simmodel import refresh_simulator

    publisher = Publisher()
    count = refresh_simulator(publisher)
    AuditLog().record("simulator.model", "published", "success" if count else "skipped", details={"circuits": count})
    return count


def run_news_step() -> int:
    """Headlines from the publishers' own RSS feeds. A feed outage never fails the refresh."""
    from .news import refresh_news

    publisher = Publisher()
    count = refresh_news(publisher)
    publisher.publish_manifest({})
    AuditLog().record("news.bundle", "published", "success", details={"headlines": count})
    return count


def run_replay_step(seasons: list[int], limit: int = REFRESH_REPLAY_LIMIT) -> int:
    """Real-position replay data (OpenF1, 2023+) for the newest races. A source outage never fails the refresh."""
    from .replay import run_replay

    audit = AuditLog()
    publisher = Publisher()
    try:
        written = run_replay(publisher, seasons, limit=limit)
    except F1DataError as exc:
        log.error("replay data unavailable (%s)", exc)
        audit.record("replay.bundle", "published", "failure", reason=str(exc))
        return 0
    publisher.publish_manifest({})
    audit.record("replay.bundle", "published", "success", details={"seasons": seasons, "files_written": written})
    return written


def run_telemetry_step(seasons: list[int], limit: int | None = None) -> int:
    """Fastest-lap car data (OpenF1, 2023+) for races that lack it. A source outage never fails the refresh."""
    from .telemetry import run_telemetry

    audit = AuditLog()
    publisher = Publisher()
    try:
        written = run_telemetry(publisher, seasons, limit=limit)
    except F1DataError as exc:
        log.error("telemetry unavailable (%s)", exc)
        audit.record("telemetry.bundle", "published", "failure", reason=str(exc))
        return 0
    publisher.publish_manifest({})
    audit.record("telemetry.bundle", "published", "success", details={"seasons": seasons, "files_written": written})
    return written


def run_enrich(seasons: list[int], refresh: bool, today: date | None = None) -> None:
    """Add qualifying and sprint results (needs the network) to the races already published."""
    from .extras import enrich_season

    today = today or datetime.now(UTC).date()
    publisher, jolpica, audit = Publisher(), JolpicaSource(), AuditLog()
    total = 0
    for season in seasons:
        ttl = config.CURRENT_SEASON_TTL if season >= today.year else None
        try:
            quali = jolpica.qualifying(season, ttl=ttl, refresh=refresh)
            sprint = jolpica.sprints(season, ttl=ttl, refresh=refresh) if season >= 2021 else {}
        except F1DataError as exc:
            log.error("season %d: qualifying/sprint unavailable (%s)", season, exc)
            audit.record("enrich.season", f"season/{season}", "failure", reason=str(exc))
            continue
        total += enrich_season(publisher, season, quali, sprint)
        from .schedule import refresh_sessions

        refresh_sessions(publisher, jolpica, season, ttl=ttl)
    from .maps import build_outlines

    outlines = build_outlines(publisher)
    from .headshots import refresh_headshots

    refresh_headshots(publisher)  # links to the official portraits; a source outage keeps the last list
    publisher.rebuild_drivers()
    publisher.publish_manifest({})
    audit.record(
        "enrich.bundle", "published", "success",
        details={"seasons": seasons, "files_updated": total, "outlines_added": outlines},
    )


def run_derive(audit: AuditLog) -> None:
    """Excitement scores, teammate duels and circuit profiles, worked out from the published races (offline)."""
    from .derive import build_circuits, build_duels, build_excitement, build_team_pace

    publisher = Publisher()
    scored = build_excitement(publisher)
    duels = build_duels(publisher)
    build_team_pace(publisher)
    circuits = build_circuits(publisher)  # after excitement: it reports average excitement per circuit
    publisher.publish_manifest({})
    audit.record(
        "derive.build", "derived", "success",
        details={"races_scored": scored, "duels": duels, "circuits": circuits},
    )


def _ingest_champions(jolpica, publisher, today, finished_seasons: set[int], refresh: bool) -> None:
    """Drivers' champions of every finished season since 1950 (finished seasons never change, so cached forever)."""
    seasons = sorted(set(range(1950, today.year)) | finished_seasons)
    known = publisher.load_champions()
    have = {c.season: c for c in known.champions} if known else {}
    for season in seasons:
        if season in have and not refresh:
            continue
        try:
            row = jolpica.champion(season, refresh=refresh)
        except F1DataError as exc:
            log.warning("champion for %d unavailable (%s)", season, exc)
            continue
        if row:
            have[season] = Champion(season=season, code=row.code, name=row.name)
    changed = publisher.publish_champions(Champions(champions=[have[k] for k in sorted(have)]))
    log.info("champions: %d seasons (%s)", len(have), "updated" if changed else "unchanged")


def _ingest_standings(season, schedule, entries, rounds, jolpica, publisher, ttl, refresh, today) -> set[int]:
    """Fetch official standings for every played round and publish them. Returns the rounds we have."""
    status = {e.round: e.data_status for e in entries}
    existing = publisher.load_standings(season)
    kept = {r.round: r for r in existing.rounds} if existing else {}
    race_docs = {}
    per_round = {}
    for entry in schedule:
        if status.get(entry.round) not in ("ok", "partial"):
            continue
        doc = publisher.load_race(season, entry.round)
        if doc:
            race_docs[entry.round] = doc
        if rounds is not None and entry.round not in rounds:
            continue
        try:
            drivers = jolpica.driver_standings(season, entry.round, ttl=ttl, refresh=refresh)
            constructors = jolpica.constructor_standings(season, entry.round, ttl=ttl, refresh=refresh)
        except F1DataError as exc:
            log.warning("%d R%d: standings unavailable (%s)", season, entry.round, exc)
            continue
        if drivers:
            per_round[entry.round] = (entry.event_name, drivers, constructors)
    built = build_season_standings(season, per_round, race_docs)
    merged = {**kept, **{r.round: r for r in built.rounds}}
    # The leader of a finished season is its champion. Finished = every round played and in the standings.
    complete = bool(schedule) and all(e.data_status != "scheduled" for e in entries) and max(merged, default=0) == max(
        e.round for e in schedule
    )
    outcome = publisher.publish_standings(
        SeasonStandings(season=season, complete=complete, rounds=[merged[k] for k in sorted(merged)])
    )
    log.info("season %d standings: %d rounds (%s)", season, len(merged), outcome)
    return set(merged)


def _build_one(entry, rows, jolpica, tracing, openf1, events, season, ttl, refresh, use_openf1):
    pit = []
    if rows:
        try:
            pit = jolpica.pit_stops(season, entry.round, ttl=ttl, refresh=refresh)
        except F1DataError as exc:
            log.warning("%d R%d: pit stops unavailable (%s)", season, entry.round, exc)
    laps: RaceLaps | None = None
    folder = _match_event(entry, events)
    if rows and folder:
        try:
            laps = tracing.race(season, folder)
        except F1DataError as exc:
            log.warning("%d R%d: lap data unreadable (%s)", season, entry.round, exc)
    elif rows:
        log.warning("%d R%d %s: no TracingInsights lap data matched", season, entry.round, entry.event_name)
    inputs = RaceInputs(entry=entry, results=rows, pit_stops=pit, laps=laps)
    doc = build_race(inputs)
    # OpenF1 (2023+) fills unknown compounds and cross-checks the timing data. Cached, so cheap to repeat.
    if rows and use_openf1 and season >= 2023:
        try:
            key = openf1.race_session_key(season, entry.date)
            if key:
                for item in openf1.stints(key):
                    inputs.openf1_stints.setdefault(item.driver_number, []).append(item)
                doc = build_race(inputs)
        except F1DataError as exc:
            log.warning("%d R%d: OpenF1 fill failed (%s)", season, entry.round, exc)
    return doc


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="f1data", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    ing = sub.add_parser("ingest", help="fetch sources, build and publish race data")
    ing.add_argument("--seasons", default=f"{config.DEFAULT_FIRST_SEASON}-{config.DEFAULT_LAST_SEASON}")
    ing.add_argument("--rounds", default=None, help="comma separated rounds (default: all)")
    ing.add_argument("--refresh", action="store_true", help="ignore caches and re-fetch")
    ing.add_argument("--skip-sync", action="store_true", help="reuse local TracingInsights copies as-is")
    ing.add_argument("--no-openf1", action="store_true")
    sub.add_parser("verify-audit", help="check the audit log hash chain")
    sub.add_parser("validate", help="validate the published data bundle (CI data-quality gate)")
    sub.add_parser("ratings", help="rebuild driver and car ratings from the published races")
    enrich = sub.add_parser("enrich", help="add qualifying and sprint results to published races (needs network)")
    enrich.add_argument("--seasons", default=None)
    enrich.add_argument("--refresh", action="store_true")
    refresh = sub.add_parser("refresh", help="the whole pipeline in order (what the scheduled job runs)")
    refresh.add_argument("--seasons", default=None, help="default: the current season")
    refresh.add_argument("--skip-sync", action="store_true")
    refresh.add_argument("--refresh", action="store_true", help="ignore caches and re-fetch")
    tel = sub.add_parser("telemetry", help="fastest-lap car data for published races that lack it (needs network)")
    tel.add_argument("--seasons", default=None, help="default: 2023 to the current season")
    tel.add_argument("--limit", type=int, default=None, help="at most this many races, newest first")
    rep = sub.add_parser("replay", help="real-position replay data for the newest races (needs network)")
    rep.add_argument("--seasons", default=None, help="default: 2023 to the current season")
    rep.add_argument("--limit", type=int, default=REFRESH_REPLAY_LIMIT, help="how many of the newest races (default 2)")
    sub.add_parser("simmodel", help="fit and publish the strategy simulator's model from cached race laps")
    sub.add_parser("news", help="collect motorsport headlines from the publishers' RSS feeds (needs network)")
    sub.add_parser("derive", help="excitement, teammate duels and circuit profiles from the published races")
    sub.add_parser("predict", help="rebuild race and championship forecasts from the published races")
    parser.add_argument("--log-level", default=None)
    args = parser.parse_args(argv)
    setup_logging(args.log_level)

    if args.command == "verify-audit":
        ok, count, problem = AuditLog().verify()
        if ok:
            log.info("audit chain OK (%d entries)", count)
            return 0
        log.error("audit chain BROKEN after %d entries: %s", count, problem)
        return 2
    if args.command == "enrich":
        seasons = _parse_seasons(args.seasons) if args.seasons else list(range(2020, config.DEFAULT_LAST_SEASON + 1))
        run_enrich(seasons, args.refresh)
        return 0
    if args.command == "refresh":
        seasons = _parse_seasons(args.seasons) if args.seasons else [config.DEFAULT_LAST_SEASON]
        return run_refresh(seasons, args.skip_sync, args.refresh)
    if args.command == "telemetry":
        seasons = _parse_seasons(args.seasons) if args.seasons else list(range(2023, config.DEFAULT_LAST_SEASON + 1))
        run_telemetry_step(seasons, limit=args.limit)
        return 0
    if args.command == "replay":
        seasons = _parse_seasons(args.seasons) if args.seasons else list(range(2023, config.DEFAULT_LAST_SEASON + 1))
        run_replay_step(seasons, limit=args.limit)
        return 0
    if args.command == "simmodel":
        run_simulator_step()
        return 0
    if args.command == "news":
        run_news_step()
        return 0
    if args.command == "derive":
        run_derive(AuditLog())
        return 0
    if args.command == "predict":
        publisher = Publisher()
        run_predict(publisher, AuditLog())
        publisher.publish_manifest({})
        return 0
    if args.command == "ratings":
        publisher = Publisher()
        run_ratings(publisher, AuditLog())
        publisher.publish_manifest({})
        return 0
    if args.command == "validate":
        problems = Publisher().validate()
        for problem in problems:
            log.error("data problem: %s", problem)
        log.info("published data %s", "is healthy" if not problems else f"has {len(problems)} problem(s)")
        return 1 if problems else 0
    rounds = {int(x) for x in args.rounds.split(",")} if args.rounds else None
    return run_ingest(_parse_seasons(args.seasons), rounds, args.refresh, args.skip_sync, not args.no_openf1)


if __name__ == "__main__":
    sys.exit(main())
