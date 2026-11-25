"""Write the published JSON bundle. Never overwrites good data with worse data."""

from __future__ import annotations

import hashlib
import json
import os
import statistics
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from . import SCHEMA_VERSION, config
from .coverage import RANK
from .logging_setup import get_logger
from .models import (
    Champions,
    DriverListEntry,
    DriverProfile,
    DuelsDoc,
    IncidentDoc,
    LapDoc,
    NextForecasts,
    RaceDoc,
    RaceIndex,
    RatingsCurrent,
    RatingSummary,
    ReplayDoc,
    SeasonStandings,
    SeasonSummary,
    TelemetryDoc,
    TitleForecast,
)

log = get_logger("export")


def dumps(data: Any) -> str:
    """Compact JSON that is guaranteed valid for browsers (no NaN / Infinity)."""
    if isinstance(data, BaseModel):
        data = data.model_dump(mode="json")
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def write_if_changed(path: Path, text: str) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    tmp = path.with_suffix(f".{os.getpid()}.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)
    return True


class Publisher:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or config.PUBLISHED_DIR

    # -- races -----------------------------------------------------------------
    def race_path(self, season: int, rnd: int) -> Path:
        return self.root / "seasons" / str(season) / f"race_{rnd}.json"

    def load_race(self, season: int, rnd: int) -> RaceDoc | None:
        path = self.race_path(season, rnd)
        if not path.exists():
            return None
        try:
            return RaceDoc.model_validate_json(path.read_text(encoding="utf-8"))
        except ValueError:
            log.warning("existing %s failed validation; will be replaced", path.name)
            return None

    def publish_race(self, doc: RaceDoc) -> str:
        """Return 'written' | 'unchanged' | 'kept_previous' (new data was worse)."""
        if not doc.drivers:
            return "kept_previous" if self.race_path(doc.season, doc.round).exists() else "unchanged"
        existing = self.load_race(doc.season, doc.round)
        if existing:
            doc = _carry_extras(existing, doc)
        if existing and RANK[existing.quality.status] > RANK[doc.quality.status]:
            log.warning(
                "keeping previous %s R%d (%s) - new build is only %s",
                doc.season,
                doc.round,
                existing.quality.status,
                doc.quality.status,
            )
            return "kept_previous"
        return "written" if write_if_changed(self.race_path(doc.season, doc.round), dumps(doc)) else "unchanged"

    def write_telemetry(self, doc: TelemetryDoc) -> bool:
        return write_if_changed(self.root / "telemetry" / str(doc.season) / f"{doc.round}.json", dumps(doc))

    def write_laps(self, doc: LapDoc) -> bool:
        return write_if_changed(self.root / "laps" / str(doc.season) / f"{doc.round}.json", dumps(doc))

    def write_race(self, doc: RaceDoc) -> bool:
        """Rewrite an existing race document (used by season-wide clean-ups; no quality comparison)."""
        return write_if_changed(self.race_path(doc.season, doc.round), dumps(doc))

    def publish_index(self, index: RaceIndex) -> None:
        # A rebuild of the index must not lose the weekend timetables, which come from a different step.
        previous = self.load_index(index.season)
        if previous is not None:
            kept = {e.round: e.sessions for e in previous.races}
            for entry in index.races:
                if not entry.sessions and kept.get(entry.round):
                    entry.sessions = kept[entry.round]
        write_if_changed(self.root / "seasons" / str(index.season) / "races.json", dumps(index))

    # -- ratings ---------------------------------------------------------------
    def load_ratings(self) -> RatingsCurrent | None:
        path = self.root / "ratings" / "current.json"
        return RatingsCurrent.model_validate_json(path.read_text(encoding="utf-8")) if path.exists() else None

    # -- champions -------------------------------------------------------------
    def load_champions(self) -> Champions | None:
        path = self.root / "champions.json"
        return Champions.model_validate_json(path.read_text(encoding="utf-8")) if path.exists() else None

    def publish_champions(self, champions: Champions) -> bool:
        return write_if_changed(self.root / "champions.json", dumps(champions))

    # -- standings -------------------------------------------------------------
    def standings_path(self, season: int) -> Path:
        return self.root / "seasons" / str(season) / "standings.json"

    def load_standings(self, season: int) -> SeasonStandings | None:
        path = self.standings_path(season)
        if not path.exists():
            return None
        try:
            return SeasonStandings.model_validate_json(path.read_text(encoding="utf-8"))
        except ValueError:
            log.warning("existing standings for %d failed validation; will be replaced", season)
            return None

    def publish_standings(self, standings: SeasonStandings) -> str:
        """Never replace a longer standings history with a shorter one (e.g. after a partial upstream failure)."""
        existing = self.load_standings(standings.season)
        if existing and len(existing.rounds) > len(standings.rounds):
            log.warning(
                "keeping previous %d standings (%d rounds): new build only has %d",
                standings.season,
                len(existing.rounds),
                len(standings.rounds),
            )
            return "kept_previous"
        if not standings.rounds:
            return "unchanged"
        return "written" if write_if_changed(self.standings_path(standings.season), dumps(standings)) else "unchanged"

    def published_seasons(self) -> list[int]:
        base = self.root / "seasons"
        if not base.exists():
            return []
        return sorted((int(p.name) for p in base.iterdir() if p.is_dir() and p.name.isdigit()), reverse=True)

    def load_index(self, season: int) -> RaceIndex | None:
        path = self.root / "seasons" / str(season) / "races.json"
        return RaceIndex.model_validate_json(path.read_text(encoding="utf-8")) if path.exists() else None

    # -- drivers ---------------------------------------------------------------
    def load_headshots(self) -> dict[str, str]:
        path = self.root / "drivers" / "headshots.json"
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8")).get("headshots", {})

    def rebuild_drivers(self) -> int:
        headshots = self.load_headshots()
        rows: dict[str, dict[int, list[tuple[RaceDoc, Any]]]] = {}
        for season in self.published_seasons():
            for path in sorted((self.root / "seasons" / str(season)).glob("race_*.json")):
                doc = RaceDoc.model_validate_json(path.read_text(encoding="utf-8"))
                for drv in doc.drivers:
                    rows.setdefault(drv.driver_code, {}).setdefault(season, []).append((doc, drv))
        champions = self.load_champions()
        ratings = self.load_ratings()
        rated = {r.code: r for r in ratings.ratings} if ratings else {}
        listing: list[DriverListEntry] = []
        for code, by_season in rows.items():
            summaries = [_summarise(season, items) for season, items in sorted(by_season.items(), reverse=True)]
            latest = summaries[0]
            _, last_drv = max(by_season[latest.season], key=lambda t: t[0].round)
            # A title counts only if code AND name match, so two drivers who share a 3-letter code never mix.
            title_years = sorted(
                c.season
                for c in (champions.champions if champions else [])
                if c.code == code and c.name == last_drv.driver_name
            )
            profile = DriverProfile(
                code=code,
                name=last_drv.driver_name,
                team=last_drv.team,
                team_color=last_drv.team_color,
                number=last_drv.driver_number,
                image=headshots.get(code),
                latest_season=latest.season,
                titles=len(title_years),
                title_years=title_years,
                rating=_rating_summary(rated.get(code), ratings),
                stats=latest,
                seasons=summaries,
            )
            write_if_changed(self.root / "drivers" / f"{code}.json", dumps(profile))
            listing.append(
                DriverListEntry(
                    code=code,
                    name=last_drv.driver_name,
                    team=last_drv.team,
                    country=None,
                    image=headshots.get(code),
                    number=last_drv.driver_number,
                    team_color=last_drv.team_color,
                    titles=len(title_years),
                    latest_season=latest.season,
                    rating=float(rated[code].overall) if code in rated else None,
                )
            )
        listing.sort(key=lambda d: (-d.latest_season, d.name))
        write_if_changed(self.root / "drivers" / "index.json", dumps([d.model_dump(mode="json") for d in listing]))
        return len(listing)

    # -- integrity -------------------------------------------------------------
    def validate(self) -> list[str]:
        """Data-quality gate used by CI. Returns a list of problems (empty = healthy)."""
        problems: list[str] = []
        seasons = self.published_seasons()
        if not seasons:
            return ["no seasons published"]
        for season in seasons:
            index = self.load_index(season)
            if index is None:
                problems.append(f"{season}: races.json missing")
                continue
            for entry in index.races:
                path = self.race_path(season, entry.round)
                if entry.data_status in ("ok", "partial"):
                    if not path.exists():
                        problems.append(
                            f"{season} R{entry.round}: index says {entry.data_status} but race file is missing"
                        )
                        continue
                    try:
                        doc = RaceDoc.model_validate_json(path.read_text(encoding="utf-8"))
                    except ValueError as exc:
                        problems.append(f"{season} R{entry.round}: invalid ({type(exc).__name__})")
                        continue
                    if doc.quality.status != entry.data_status:
                        problems.append(f"{season} R{entry.round}: index/doc status differ")
                    if len(doc.drivers) < 10:
                        problems.append(f"{season} R{entry.round}: only {len(doc.drivers)} drivers")
                    finishes = [d.finish for d in doc.drivers if d.finish is not None]
                    if len(finishes) != len(set(finishes)):
                        problems.append(f"{season} R{entry.round}: duplicate finishing positions")
                    problems.extend(_structural_problems(season, entry.round, doc))
        for season in seasons:
            problems.extend(self._standings_problems(season))
        problems.extend(self._ratings_problems())
        problems.extend(self._predictions_problems())
        problems.extend(self._derived_problems())
        problems.extend(self._telemetry_problems())
        problems.extend(self._replay_problems())
        problems.extend(self._incident_problems())
        problems.extend(self._headshot_problems())
        problems.extend(self._news_problems())
        manifest = self.root / "manifest.json"
        if not manifest.exists():
            problems.append("manifest.json missing")
        elif json.loads(manifest.read_text(encoding="utf-8")).get("content_sha256") != self.content_hash():
            problems.append("manifest content_sha256 does not match files (data edited without re-publishing?)")
        return problems

    def _standings_problems(self, season: int) -> list[str]:
        """Standings must be internally consistent and agree with the race results we publish."""
        standings = self.load_standings(season)
        if standings is None:
            return []
        found: list[str] = []
        where = f"{season} standings"
        previous: dict[str, float] = {}
        for rnd in standings.rounds:
            positions = [d.position for d in rnd.drivers if d.position is not None]
            if len(positions) != len(set(positions)):
                found.append(f"{where} R{rnd.round}: duplicate driver positions")
            for d in rnd.drivers:
                if d.points < previous.get(d.code, 0.0):
                    found.append(f"{where} R{rnd.round} {d.code}: points went down")
                previous[d.code] = d.points
        if not standings.rounds:
            return found
        final = standings.rounds[-1]
        # Official points include sprints, so they can never be LOWER than the race points we publish.
        race_points: dict[str, float] = {}
        for path in sorted((self.root / "seasons" / str(season)).glob("race_*.json")):
            doc = RaceDoc.model_validate_json(path.read_text(encoding="utf-8"))
            if doc.round > final.round:
                continue
            for drv in doc.drivers:
                race_points[drv.driver_code] = race_points.get(drv.driver_code, 0.0) + drv.points
        for d in final.drivers:
            if d.points + 1e-6 < race_points.get(d.code, 0.0):
                found.append(f"{where} {d.code}: standings points {d.points} < race points {race_points[d.code]}")
        return found

    def _headshot_problems(self) -> list[str]:
        """Portrait links must be https links to F1's media host: nothing else may be loaded as a driver picture."""
        from .headshots import acceptable

        return [f"headshots: {code} has a link that is not an https png on media.formula1.com"
                for code, url in self.load_headshots().items() if not acceptable(url)]

    def _news_problems(self) -> list[str]:
        """Every headline must link to an https page on its own publisher's domain, with a title and a real date."""
        path = self.root / "news.json"
        if not path.exists():
            return []
        from .news import FEEDS, on_domain

        try:
            items = json.loads(path.read_text(encoding="utf-8")).get("items", [])
        except ValueError:
            return ["news.json: not valid JSON"]
        found: list[str] = []
        for i, it in enumerate(items):
            domains = FEEDS.get(it.get("source", ""), (None, ()))[1]
            if not it.get("title") or not on_domain(str(it.get("link", "")), domains):
                found.append(f"news item {i}: no title, or a link that is not an https page on its publisher's site")
            try:
                datetime.fromisoformat(str(it.get("published")))
            except ValueError:
                found.append(f"news item {i}: no valid date")
        return found

    def _incident_problems(self) -> list[str]:
        found: list[str] = []
        for path in sorted((self.root / "incidents").glob("*/*.json")):
            where = f"incidents {path.parent.name} R{path.stem}"
            try:
                doc = IncidentDoc.model_validate_json(path.read_text(encoding="utf-8"))
            except ValueError as exc:
                found.append(f"{where}: invalid ({type(exc).__name__})")
                continue
            race = self.load_race(doc.season, doc.round)
            if race is None:
                found.append(f"{where}: no matching race")
                continue
            codes = {d.driver_code for d in race.drivers}
            for item in doc.items:
                if any(c not in codes for c in item.drivers):
                    found.append(f"{where}: names a driver who is not in the race")
                    break
        return found

    def _replay_problems(self) -> list[str]:
        """Replay files must parse, match their race, and hold possible values."""
        found: list[str] = []
        for path in sorted((self.root / "replay").glob("*/*.json")):
            where = f"replay {path.parent.name} R{path.stem}"
            try:
                doc = ReplayDoc.model_validate_json(path.read_text(encoding="utf-8"))
            except ValueError as exc:
                found.append(f"{where}: invalid ({type(exc).__name__})")
                continue
            race = self.load_race(doc.season, doc.round)
            if race is None:
                found.append(f"{where}: no matching race")
                continue
            codes = {d.driver_code for d in race.drivers}
            for d in doc.drivers:
                cols = (d.f, d.speed, d.throttle, d.brake, d.gear, d.rpm, d.drs)
                if d.code not in codes:
                    found.append(f"{where} {d.code}: not in the race")
                elif any(len(c) != doc.n for c in cols):
                    found.append(f"{where} {d.code}: column length is not {doc.n}")
                elif any(v is not None and not 0 <= v < 10_000 for v in d.f):
                    found.append(f"{where} {d.code}: position outside the lap")
                elif any(v is not None and not 0 <= v <= 400 for v in d.speed):
                    found.append(f"{where} {d.code}: impossible speed")
        return found

    def _telemetry_problems(self) -> list[str]:
        """Every telemetry file must parse, line up with its race, and hold physically possible readings."""
        found: list[str] = []
        for path in sorted((self.root / "telemetry").glob("*/*.json")):
            where = f"telemetry {path.parent.name} R{path.stem}"
            try:
                doc = TelemetryDoc.model_validate_json(path.read_text(encoding="utf-8"))
            except ValueError as exc:
                found.append(f"{where}: invalid ({type(exc).__name__})")
                continue
            race = self.load_race(doc.season, doc.round)
            if race is None:
                found.append(f"{where}: no matching race")
                continue
            codes = {d.driver_code for d in race.drivers}
            for d in doc.drivers:
                lists = (d.t_ms, d.speed, d.throttle, d.brake, d.gear, d.rpm, d.drs)
                if d.code not in codes:
                    found.append(f"{where} {d.code}: not in the race")
                elif any(len(x) != doc.n for x in lists):
                    found.append(f"{where} {d.code}: channel length is not {doc.n}")
                elif any(b < a for a, b in zip(d.t_ms, d.t_ms[1:], strict=False)):
                    found.append(f"{where} {d.code}: clock goes backwards")
                elif not 100 <= max(d.speed) <= 400 or min(d.speed) < 0 or max(d.throttle) > 100:
                    found.append(f"{where} {d.code}: impossible readings")
        return found

    def _ratings_problems(self) -> list[str]:
        ratings = self.load_ratings()
        if ratings is None:
            return []
        found: list[str] = []
        if not (self.root / "ratings" / "model.json").exists():
            found.append("ratings: model card missing")
        overall = [r.overall for r in ratings.ratings]
        if overall != sorted(overall, reverse=True):
            found.append("ratings: not sorted by overall rating")
        if [r.rank for r in ratings.ratings] != list(range(1, len(ratings.ratings) + 1)):
            found.append("ratings: ranks are not 1..n")
        for r in ratings.ratings:
            if not (self.root / "ratings" / "history" / f"{r.code}.json").exists():
                found.append(f"ratings: history missing for {r.code}")
            if abs((r.driver - 1500) + (r.car - 1500) - (r.overall - 1500)) > 2:  # rounding only
                found.append(f"ratings {r.code}: overall is not driver + car")
        return found

    def _predictions_problems(self) -> list[str]:
        root = self.root / "predictions"
        if not root.exists():
            return []
        found: list[str] = []
        for name in ("next.json", "championship.json", "model.json", "review.json"):
            if not (root / name).exists():
                found.append(f"predictions: {name} missing")
        if found:
            return found
        nxt = NextForecasts.model_validate_json((root / "next.json").read_text(encoding="utf-8"))
        for race in nxt.races:
            where = f"predictions {race.season} R{race.round}"
            for field, expected in (("win", 1.0), ("podium", 3.0)):
                total = sum(getattr(d, field) for d in race.drivers)
                if abs(total - expected) > 0.05:
                    found.append(f"{where}: {field} probabilities add up to {total:.3f}, not {expected}")
            if any(not 0.0 <= d.win <= d.podium + 1e-9 <= 1.0 + 1e-9 for d in race.drivers):
                found.append(f"{where}: a win chance exceeds the podium chance, or a probability is out of range")
        title = TitleForecast.model_validate_json((root / "championship.json").read_text(encoding="utf-8"))
        if abs(sum(d.champion for d in title.drivers) - 1.0) > 0.02:
            found.append("predictions: driver title odds do not add up to 1")
        if abs(sum(c.champion for c in title.constructors) - 1.0) > 0.02:
            found.append("predictions: constructor title odds do not add up to 1")
        if title.races_left != len(title.remaining):
            found.append("predictions: races_left does not match the remaining races")
        return found

    def _derived_problems(self) -> list[str]:
        found: list[str] = []
        for season in self.published_seasons():
            for path in (self.root / "seasons" / str(season)).glob("race_*.json"):
                doc = self.load_race(season, int(path.stem.split("_")[1]))
                if doc is None:
                    continue
                where = f"{season} R{doc.round}"
                if doc.excitement and not 0.0 <= doc.excitement.score <= 10.0:
                    found.append(f"{where}: excitement score out of range")
                quali = [d.quali_position for d in doc.drivers if d.quali_position is not None]
                if quali and len(quali) != len(set(quali)):
                    found.append(f"{where}: duplicate qualifying positions")
                if any(d.quali_gap_pct is not None and d.quali_gap_pct < 0 for d in doc.drivers):
                    found.append(f"{where}: a driver is faster than the pole lap")
                if doc.tyre_model and not -0.12 <= doc.tyre_model.fuel_s_per_lap <= 0.0:
                    found.append(f"{where}: tyre model has an impossible fuel effect")
            duels_path = self.root / "duels" / f"{season}.json"
            if duels_path.exists():
                for duel in DuelsDoc.model_validate_json(duels_path.read_text(encoding="utf-8")).duels:
                    if duel.qualifying.a + duel.qualifying.b > duel.qualifying.races:
                        found.append(f"duels {season} {duel.a.code}/{duel.b.code}: more qualifying wins than sessions")
                    if duel.race.a + duel.race.b > duel.race.races:
                        found.append(f"duels {season} {duel.a.code}/{duel.b.code}: more race wins than races")
        index = self.root / "circuits" / "index.json"
        if index.exists():
            for entry in json.loads(index.read_text(encoding="utf-8")):
                if not (self.root / "circuits" / f"{entry['slug']}.json").exists():
                    found.append(f"circuits: {entry['slug']} listed but missing")
        return found

    def content_hash(self) -> str:
        digest = hashlib.sha256()
        for path in sorted(p for p in self.root.rglob("*.json") if p.name != "manifest.json"):
            digest.update(str(path.relative_to(self.root)).encode())
            digest.update(path.read_bytes())
        return digest.hexdigest()

    # -- bundle metadata -------------------------------------------------------
    def publish_coverage(self, coverage: dict[str, Any]) -> None:
        # generated_at changes every run; only rewrite when something else changed.
        path = self.root / "coverage.json"
        if path.exists():
            old = json.loads(path.read_text(encoding="utf-8"))
            if {**old, "generated_at": None} == {**coverage, "generated_at": None}:
                return
        write_if_changed(path, dumps(coverage))

    def load_coverage(self) -> dict[str, Any] | None:
        path = self.root / "coverage.json"
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None

    def publish_manifest(self, sources: dict[str, Any]) -> str:
        seasons = self.published_seasons()
        # seasons.json is part of the hashed content, so it must be written before hashing.
        write_if_changed(self.root / "seasons.json", dumps({"seasons": seasons}))
        files = sorted(p for p in self.root.rglob("*.json") if p.name != "manifest.json")
        content_hash = self.content_hash()
        manifest = {
            "schema_version": SCHEMA_VERSION,
            "seasons": seasons,
            "file_count": len(files),
            "content_sha256": content_hash,
            "sources": sources,
        }
        path = self.root / "manifest.json"
        if path.exists() and json.loads(path.read_text(encoding="utf-8")).get("content_sha256") == content_hash:
            return content_hash
        manifest["generated_at"] = datetime.now(UTC).isoformat(timespec="seconds")
        write_if_changed(path, dumps(manifest))
        return content_hash


def _carry_extras(old: RaceDoc, new: RaceDoc) -> RaceDoc:
    """A rebuild must not erase qualifying and sprint results, which come from a different source and stage."""
    prior = {d.driver_code: d for d in old.drivers}
    drivers = []
    for d in new.drivers:
        o = prior.get(d.driver_code)
        if o is not None and d.quali_position is None and d.sprint_position is None:
            d = d.model_copy(
                update={
                    "quali_position": o.quali_position,
                    "quali_gap_pct": o.quali_gap_pct,
                    "sprint_position": o.sprint_position,
                    "sprint_points": o.sprint_points,
                }
            )
        drivers.append(d)
    extras = {"excitement": old.excitement} if new.excitement is None and old.excitement is not None else {}
    return new.model_copy(update={"drivers": drivers, **extras})


def _structural_problems(season: int, rnd: int, doc: RaceDoc) -> list[str]:
    """Internal-consistency checks on one race document."""
    found: list[str] = []
    where = f"{season} R{rnd}"
    codes = [d.driver_code for d in doc.drivers]
    if len(codes) != len(set(codes)):
        found.append(f"{where}: duplicate driver codes")
    for d in doc.drivers:
        if not d.team.strip() or not d.driver_name.strip():
            found.append(f"{where} {d.driver_code}: empty team or name")
        if not d.team_color:
            found.append(f"{where} {d.driver_code}: no team colour")
        if d.stints:
            for prev, cur in zip(d.stints, d.stints[1:], strict=False):
                if cur.lap_start != prev.lap_end + 1:
                    found.append(f"{where} {d.driver_code}: stints {prev.number}/{cur.number} not contiguous")
                    break
            if any(st.laps != st.lap_end - st.lap_start + 1 or st.laps < 1 for st in d.stints):
                found.append(f"{where} {d.driver_code}: stint lap counts inconsistent")
            if d.longest_stint != max(st.laps for st in d.stints):
                found.append(f"{where} {d.driver_code}: longest_stint does not match stints")
            if d.stops != len(d.stints) - 1:
                found.append(f"{where} {d.driver_code}: stops does not match stints")
            if any(st.compound is None and st.compound_source is not None for st in d.stints):
                found.append(f"{where} {d.driver_code}: compound_source set on unknown compound")
        if d.grid is not None and d.pit_lane_start:
            found.append(f"{where} {d.driver_code}: grid and pit_lane_start both set")
        if d.gap_to_winner_s is not None and (d.gap_to_winner_s <= 0 or d.finish in (None, 1)):
            found.append(f"{where} {d.driver_code}: impossible gap to the winner")
        if d.lap_positions and any(p is not None and not 1 <= p <= len(doc.drivers) + 2 for p in d.lap_positions):
            found.append(f"{where} {d.driver_code}: lap position outside the field")
    gaps = [(d.finish, d.gap_to_winner_s) for d in doc.drivers if d.gap_to_winner_s is not None and d.finish]
    if any(b[1] < a[1] for a, b in zip(sorted(gaps), sorted(gaps)[1:], strict=False)):
        found.append(f"{where}: gaps to the winner do not increase with finishing position")
    return found


def _mean(values: list[float]) -> float | None:
    return round(statistics.fmean(values), 2) if values else None


def _rating_summary(row, ratings) -> RatingSummary | None:
    if row is None or ratings is None:
        return None
    return RatingSummary(
        overall=row.overall,
        driver=row.driver,
        car=row.car,
        rank=row.rank,
        races=row.races,
        provisional=row.provisional,
        as_of=f"{ratings.season} R{ratings.round}",
    )


def _summarise(season: int, items: list[tuple[RaceDoc, Any]]) -> SeasonSummary:
    items = sorted(items, key=lambda t: t[0].round)
    drvs = [d for _, d in items]
    finishes = [d.finish for d in drvs if d.finish is not None]
    grids = [d.grid for d in drvs if d.grid is not None]
    gained = [d.positions_gained for d in drvs if d.positions_gained is not None]
    consistency = [d.consistency_index for d in drvs if d.consistency_index is not None]
    stints = [d.longest_stint for d in drvs if d.longest_stint is not None]
    recent = [d.finish for d in drvs[-5:] if d.finish is not None]
    classified = [d.finish for d in drvs if d.classified and d.finish is not None]
    return SeasonSummary(
        season=season,
        team=drvs[-1].team,
        races=len(drvs),
        wins=sum(1 for f in classified if f == 1),
        podiums=sum(1 for f in classified if f <= 3),
        points=round(sum(d.points for d in drvs), 1),
        best_finish=min(classified) if classified else None,
        avg_finish=_mean([float(f) for f in finishes]),
        avg_grid=_mean([float(g) for g in grids]),
        positions_gained=sum(gained) if gained else None,
        consistency=_mean([float(c) for c in consistency]),
        avg_longest_stint=_mean([float(s) for s in stints]),
        recent_form=_mean([float(f) for f in recent]),
    )
