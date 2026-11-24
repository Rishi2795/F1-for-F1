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
    RaceDoc,
    RaceIndex,
    SeasonStandings,
    SeasonSummary,
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
        if existing and RANK[existing.quality.status] > RANK[doc.quality.status]:
            log.warning(
                "keeping previous %s R%d (%s) - new build is only %s",
                doc.season, doc.round, existing.quality.status, doc.quality.status,
            )
            return "kept_previous"
        return "written" if write_if_changed(self.race_path(doc.season, doc.round), dumps(doc)) else "unchanged"

    def write_race(self, doc: RaceDoc) -> bool:
        """Rewrite an existing race document (used by season-wide clean-ups; no quality comparison)."""
        return write_if_changed(self.race_path(doc.season, doc.round), dumps(doc))

    def publish_index(self, index: RaceIndex) -> None:
        write_if_changed(self.root / "seasons" / str(index.season) / "races.json", dumps(index))

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
                standings.season, len(existing.rounds), len(standings.rounds),
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
    def rebuild_drivers(self) -> int:
        rows: dict[str, dict[int, list[tuple[RaceDoc, Any]]]] = {}
        for season in self.published_seasons():
            for path in sorted((self.root / "seasons" / str(season)).glob("race_*.json")):
                doc = RaceDoc.model_validate_json(path.read_text(encoding="utf-8"))
                for drv in doc.drivers:
                    rows.setdefault(drv.driver_code, {}).setdefault(season, []).append((doc, drv))
        champions = self.load_champions()
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
                code=code, name=last_drv.driver_name, team=last_drv.team, number=last_drv.driver_number,
                latest_season=latest.season, titles=len(title_years), title_years=title_years,
                stats=latest, seasons=summaries,
            )
            write_if_changed(self.root / "drivers" / f"{code}.json", dumps(profile))
            listing.append(
                DriverListEntry(
                    code=code, name=last_drv.driver_name, team=last_drv.team, country=None,
                    titles=len(title_years), latest_season=latest.season,
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
    return found


def _mean(values: list[float]) -> float | None:
    return round(statistics.fmean(values), 2) if values else None


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
