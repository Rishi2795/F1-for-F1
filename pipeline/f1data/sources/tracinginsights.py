"""TracingInsights per-year GitHub repos: per-lap compound/stint/tyre-age/weather, 2018+.

Each year repo is 15-21 GB (mostly telemetry), so we never clone it whole: a blobless,
depth-1, sparse checkout fetches only the few small JSON files per race (~20 MB a year).
The upstream commit SHA is recorded for provenance. Files are untrusted data: we only
ever parse them with ``json``.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess  # noqa: S404 - fixed git invocations only, no shell
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from .. import config
from ..errors import SourceFormatError, SourceUnavailable
from ..logging_setup import get_logger
from ..normalize import clean, to_bool, to_float, to_int, to_str

log = get_logger("tracinginsights")

_SPARSE_PATTERNS = [
    "/*/Race/*/laptimes.json",
    "/*/Race/session_info.json",
    "/*/Race/drivers.json",
]
_GIT_TIMEOUT = 600


@dataclass(frozen=True)
class Lap:
    lap: int
    time_s: float | None
    compound: str | None
    stint: int | None
    tyre_life: int | None
    fresh: bool | None
    position: int | None
    track_status: str | None
    pit_in: bool
    pit_out: bool
    deleted: bool
    team: str | None
    air_temp: float | None
    track_temp: float | None
    humidity: float | None
    rainfall: bool | None
    session_end: float | None = None  # seconds into the session when the lap was completed
    sectors: tuple[float | None, float | None, float | None] = (None, None, None)
    top_speed: float | None = None  # speed-trap reading, km/h (the highest of the lap's trap and finish-line speeds)


@dataclass
class DriverLaps:
    code: str
    number: int | None
    laps: list[Lap] = field(default_factory=list)


@dataclass
class RaceLaps:
    event_folder: str
    race_date: str  # YYYY-MM-DD (session start, UTC)
    total_laps: int | None
    drivers: dict[str, DriverLaps]
    team_colors: dict[str, str]  # driver code -> hex without '#'
    team_names: dict[str, str]  # driver code -> team


class TracingInsightsSource:
    name = "tracinginsights"

    def __init__(self, cache_dir: Path | None = None) -> None:
        self.root = (cache_dir or config.CACHE_DIR) / "tracinginsights"
        self.root.mkdir(parents=True, exist_ok=True)
        self._git = shutil.which("git")

    # -- sync ------------------------------------------------------------------
    def _run(self, args: list[str], cwd: Path | None = None) -> str:
        if not self._git:
            raise SourceUnavailable("git is not installed; it is required to sync TracingInsights data")
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
        try:
            proc = subprocess.run(  # noqa: S603 - args are constants / validated ints
                [self._git, *args], cwd=cwd, env=env, capture_output=True, text=True,
                timeout=_GIT_TIMEOUT, check=False,
            )
        except (subprocess.TimeoutExpired, OSError) as exc:
            raise SourceUnavailable(f"git {args[0]} failed: {type(exc).__name__}") from exc
        if proc.returncode != 0:
            raise SourceUnavailable(f"git {args[0]} exited {proc.returncode}: {proc.stderr.strip()[:200]}")
        return proc.stdout.strip()

    def year_dir(self, season: int) -> Path:
        return self.root / str(int(season))

    def sync_year(self, season: int, *, refresh: bool = False) -> str:
        """Make the local sparse copy of one year current; return the upstream commit SHA."""
        season = int(season)
        target = self.year_dir(season)
        url = f"{config.TRACINGINSIGHTS_BASE}/{season}.git"
        if not (target / ".git").exists():
            log.info("cloning TracingInsights/%d (sparse, small files only)", season)
            self._run(["clone", "-q", "--filter=blob:none", "--no-checkout", "--depth", "1", url, str(target)])
            self._run(["sparse-checkout", "init", "--no-cone"], cwd=target)
            self._run(["sparse-checkout", "set", "--no-cone", *_SPARSE_PATTERNS], cwd=target)
            self._run(["checkout", "-q"], cwd=target)
        elif refresh:
            log.info("refreshing TracingInsights/%d", season)
            self._run(["fetch", "-q", "--depth", "1", "origin", "HEAD"], cwd=target)
            self._run(["checkout", "-q", "-f", "FETCH_HEAD"], cwd=target)
        return self._run(["rev-parse", "HEAD"], cwd=target)

    # -- read ------------------------------------------------------------------
    def events(self, season: int) -> dict[str, str]:
        """Map race date (YYYY-MM-DD) -> event folder name for every race found locally."""
        base = self.year_dir(season)
        found: dict[str, str] = {}
        if not base.exists():
            return found
        for folder in sorted(p for p in base.iterdir() if p.is_dir() and not p.name.startswith(".")):
            info = folder / "Race" / "session_info.json"
            if not info.exists():
                continue
            try:
                t0 = to_str(json.loads(info.read_text(encoding="utf-8")).get("t0_date"))
                if t0:
                    found[datetime.fromisoformat(t0).date().isoformat()] = folder.name
            except (OSError, ValueError) as exc:
                log.warning("unreadable session_info in %s/%s: %s", season, folder.name, type(exc).__name__)
        return found

    def race(self, season: int, event_folder: str) -> RaceLaps:
        race_dir = self.year_dir(season) / event_folder / "Race"
        info = _load(race_dir / "session_info.json")
        t0 = to_str(info.get("t0_date"))
        if not t0:
            raise SourceFormatError(f"{season}/{event_folder}: session_info has no t0_date")
        colors: dict[str, str] = {}
        teams: dict[str, str] = {}
        numbers: dict[str, int | None] = {}
        drivers_file = race_dir / "drivers.json"
        if drivers_file.exists():
            for drv in _load(drivers_file).get("drivers", []):
                code = to_str(drv.get("driver"))
                if not code:
                    continue
                numbers[code] = to_int(drv.get("dn"))
                if to_str(drv.get("tc")):
                    colors[code] = str(drv["tc"]).lstrip("#")
                if to_str(drv.get("team")):
                    teams[code] = str(drv["team"])
        drivers: dict[str, DriverLaps] = {}
        for folder in sorted(p for p in race_dir.iterdir() if p.is_dir()):
            file = folder / "laptimes.json"
            if not file.exists():
                continue
            try:
                laps = parse_laps(_load(file))
            except SourceFormatError as exc:
                log.warning("%s/%s/%s: %s", season, event_folder, folder.name, exc)
                continue
            drivers[folder.name] = DriverLaps(code=folder.name, number=numbers.get(folder.name), laps=laps)
        return RaceLaps(
            event_folder=event_folder,
            race_date=datetime.fromisoformat(t0).date().isoformat(),
            total_laps=to_int(info.get("total_laps")),
            drivers=drivers,
            team_colors=colors,
            team_names=teams,
        )


def _load(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise SourceFormatError(f"cannot read {path.name}: {type(exc).__name__}") from exc
    if not isinstance(data, dict):
        raise SourceFormatError(f"{path.name}: expected an object")
    return data


def parse_laps(payload: dict[str, Any]) -> list[Lap]:
    """Turn the column-oriented laptimes.json into Lap rows. Pure function (unit tested)."""
    laps_col = payload.get("lap")
    if not isinstance(laps_col, list) or not laps_col:
        raise SourceFormatError("laptimes.json has no lap column")
    n = len(laps_col)

    def col(name: str) -> list[Any]:
        values = payload.get(name)
        return values if isinstance(values, list) and len(values) == n else [None] * n

    time_c, comp_c, stint_c = col("time"), col("compound"), col("stint")
    life_c, fresh_c, pos_c, status_c = col("life"), col("fresh"), col("pos"), col("status")
    pin_c, pout_c, del_c, team_c = col("pin"), col("pout"), col("del"), col("team")
    at_c, tt_c, h_c, r_c = col("wAT"), col("wTT"), col("wH"), col("wR")
    end_c, s1_c, s2_c, s3_c = col("sesT"), col("s1"), col("s2"), col("s3")
    vi1_c, vi2_c, vfl_c, vst_c = col("vi1"), col("vi2"), col("vfl"), col("vst")

    rows: list[Lap] = []
    for i in range(n):
        lap_no = to_int(laps_col[i])
        if lap_no is None:
            continue
        compound = to_str(comp_c[i])
        if compound is not None:
            compound = compound.upper()
            if compound in {"UNKNOWN", "TEST_UNKNOWN", "NAN"}:
                compound = None
        rows.append(
            Lap(
                lap=lap_no,
                time_s=to_float(time_c[i]),
                compound=compound,
                stint=to_int(stint_c[i]),
                tyre_life=to_int(life_c[i]),
                fresh=to_bool(fresh_c[i]),
                position=to_int(pos_c[i]),
                track_status=to_str(status_c[i]),
                pit_in=clean(pin_c[i]) is not None,
                pit_out=clean(pout_c[i]) is not None,
                deleted=bool(to_bool(del_c[i])),
                team=to_str(team_c[i]),
                air_temp=to_float(at_c[i]),
                track_temp=to_float(tt_c[i]),
                humidity=to_float(h_c[i]),
                rainfall=to_bool(r_c[i]),
                session_end=to_float(end_c[i]),
                sectors=(to_float(s1_c[i]), to_float(s2_c[i]), to_float(s3_c[i])),
                top_speed=max(
                    (v for v in map(to_float, (vst_c[i], vfl_c[i], vi1_c[i], vi2_c[i])) if v is not None),
                    default=None,
                ),
            )
        )
    rows.sort(key=lambda r: r.lap)
    return rows
