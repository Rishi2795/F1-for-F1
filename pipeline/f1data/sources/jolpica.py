"""Jolpica-F1 (Ergast successor): schedule, results, pit stops. Free, no key."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .. import config
from ..errors import SourceFormatError
from ..http import HttpClient
from ..logging_setup import get_logger
from ..normalize import clean, to_float, to_int, to_str

log = get_logger("jolpica")

_PAGE = 100


@dataclass(frozen=True)
class ScheduleEntry:
    season: int
    round: int
    event_name: str
    location: str
    country: str | None
    date: str  # YYYY-MM-DD


@dataclass(frozen=True)
class ResultRow:
    driver_id: str
    driver_code: str
    driver_number: int | None
    driver_name: str
    nationality: str | None
    constructor: str
    grid: int | None  # None = unknown; see pit_lane_start
    pit_lane_start: bool
    finish: int | None
    classified: bool
    status: str
    points: float
    laps: int | None
    race_time_ms: int | None = None  # total race time; only for cars on the lead lap
    fastest_rank: int | None = None  # official fastest-lap ranking
    fastest_lap: int | None = None
    fastest_time_s: float | None = None
    fastest_speed_kph: float | None = None


@dataclass(frozen=True)
class QualiRow:
    code: str
    position: int | None
    best_s: float | None  # the driver's best lap across Q1, Q2, Q3


@dataclass(frozen=True)
class SprintRow:
    code: str
    position: int | None
    points: float
    grid: int | None


@dataclass(frozen=True)
class PitStopRow:
    driver_id: str
    stop: int
    lap: int | None
    duration_s: float | None


@dataclass(frozen=True)
class DriverStandingRow:
    driver_code: str
    driver_name: str
    position: int | None
    points: float
    wins: int
    constructors: tuple[str, ...]  # Jolpica constructor names (a driver can have changed team)


@dataclass(frozen=True)
class ConstructorStandingRow:
    name: str
    position: int | None
    points: float
    wins: int


@dataclass(frozen=True)
class ChampionRow:
    season: int
    code: str
    name: str


class JolpicaSource:
    name = "jolpica"

    def __init__(self, http: HttpClient | None = None) -> None:
        self.http = http or HttpClient("jolpica", config.JOLPICA_BASE, min_interval=0.7)

    # -- helpers ---------------------------------------------------------------
    def _paged(self, path: str, table: str, ttl: float | None, refresh: bool) -> list[dict[str, Any]]:
        """Fetch every page and merge races split across page boundaries (by round)."""
        merged: dict[str, dict[str, Any]] = {}
        offset = 0
        while True:
            data = self.http.get_json(path, {"limit": _PAGE, "offset": offset}, ttl=ttl, refresh=refresh)
            try:
                mr = data["MRData"]
                total = int(mr["total"])
                races = mr[table]["Races"]
            except (KeyError, TypeError, ValueError) as exc:
                raise SourceFormatError(f"jolpica: unexpected payload for {path}") from exc
            for race in races:
                key = str(race.get("round"))
                if key in merged:
                    for field in ("Results", "PitStops", "QualifyingResults", "SprintResults"):
                        if field in race:
                            merged[key].setdefault(field, []).extend(race[field])
                else:
                    merged[key] = race
            offset += _PAGE
            if offset >= total or not races:
                break
        return list(merged.values())

    # -- public ----------------------------------------------------------------
    def schedule(self, season: int, *, ttl: float | None = None, refresh: bool = False) -> list[ScheduleEntry]:
        races = self._paged(f"{season}.json", "RaceTable", ttl, refresh)
        out: list[ScheduleEntry] = []
        for race in races:
            rnd = to_int(race.get("round"))
            date = to_str(race.get("date"))
            if rnd is None or date is None:
                log.warning("skipping schedule row without round/date in %s", season)
                continue
            loc = race.get("Circuit", {}).get("Location", {})
            out.append(
                ScheduleEntry(
                    season=season,
                    round=rnd,
                    event_name=to_str(race.get("raceName")) or f"Round {rnd}",
                    location=to_str(loc.get("locality")) or "Unknown",
                    country=to_str(loc.get("country")),
                    date=date,
                )
            )
        return sorted(out, key=lambda e: e.round)

    def results(self, season: int, *, ttl: float | None = None, refresh: bool = False) -> dict[int, list[ResultRow]]:
        races = self._paged(f"{season}/results.json", "RaceTable", ttl, refresh)
        out: dict[int, list[ResultRow]] = {}
        for race in races:
            rnd = to_int(race.get("round"))
            if rnd is None:
                continue
            rows = [r for r in (_parse_result(item) for item in race.get("Results", [])) if r is not None]
            out[rnd] = rows
        return out

    def qualifying(self, season: int, *, ttl: float | None = None, refresh: bool = False) -> dict[int, list[QualiRow]]:
        races = self._paged(f"{season}/qualifying.json", "RaceTable", ttl, refresh)
        out: dict[int, list[QualiRow]] = {}
        for race in races:
            rnd = to_int(race.get("round"))
            if rnd is None:
                continue
            rows = []
            for item in race.get("QualifyingResults", []):
                code = to_str(item.get("Driver", {}).get("code"))
                if code is None:
                    continue
                times = [t for t in (_lap_seconds(item.get(q)) for q in ("Q1", "Q2", "Q3")) if t is not None]
                rows.append(QualiRow(code.upper(), to_int(item.get("position")), min(times) if times else None))
            out[rnd] = rows
        return out

    def sprints(self, season: int, *, ttl: float | None = None, refresh: bool = False) -> dict[int, list[SprintRow]]:
        races = self._paged(f"{season}/sprint.json", "RaceTable", ttl, refresh)
        out: dict[int, list[SprintRow]] = {}
        for race in races:
            rnd = to_int(race.get("round"))
            if rnd is None:
                continue
            rows = []
            for item in race.get("SprintResults", []):
                code = to_str(item.get("Driver", {}).get("code"))
                if code is None:
                    continue
                rows.append(
                    SprintRow(
                        code.upper(),
                        to_int(item.get("position")),
                        to_float(item.get("points")) or 0.0,
                        to_int(item.get("grid")),
                    )
                )
            out[rnd] = rows
        return out

    def driver_standings(
        self, season: int, round_number: int, *, ttl: float | None = None, refresh: bool = False
    ) -> list[DriverStandingRow]:
        """Official drivers' championship standing after ``round_number`` (sprint points included)."""
        path = f"{season}/{round_number}/driverstandings.json"
        data = self.http.get_json(path, {"limit": _PAGE}, ttl=ttl, refresh=refresh)
        rows = (_parse_driver_standing(i) for i in _standings_list(data, "DriverStandings"))
        return [r for r in rows if r is not None]

    def constructor_standings(
        self, season: int, round_number: int, *, ttl: float | None = None, refresh: bool = False
    ) -> list[ConstructorStandingRow]:
        path = f"{season}/{round_number}/constructorstandings.json"
        data = self.http.get_json(path, {"limit": _PAGE}, ttl=ttl, refresh=refresh)
        rows = (_parse_constructor_standing(i) for i in _standings_list(data, "ConstructorStandings"))
        return [r for r in rows if r is not None]

    def champion(self, season: int, *, ttl: float | None = None, refresh: bool = False) -> ChampionRow | None:
        """The drivers' champion of a FINISHED season. For a season still running this returns the current
        leader, so callers must only ask about seasons that are over."""
        data = self.http.get_json(f"{season}/driverstandings/1.json", {"limit": 5}, ttl=ttl, refresh=refresh)
        for item in _standings_list(data, "DriverStandings"):
            row = _parse_driver_standing(item)
            if row is not None and row.position == 1:
                return ChampionRow(season=season, code=row.driver_code, name=row.driver_name)
        return None

    def pit_stops(
        self, season: int, round_number: int, *, ttl: float | None = None, refresh: bool = False
    ) -> list[PitStopRow]:
        races = self._paged(f"{season}/{round_number}/pitstops.json", "RaceTable", ttl, refresh)
        rows: list[PitStopRow] = []
        for race in races:
            for item in race.get("PitStops", []):
                stop = to_int(item.get("stop"))
                driver_id = to_str(item.get("driverId"))
                if stop is None or driver_id is None:
                    continue
                rows.append(
                    PitStopRow(
                        driver_id=driver_id,
                        stop=stop,
                        lap=to_int(item.get("lap")),
                        duration_s=to_float(item.get("duration")),
                    )
                )
        return rows


def _standings_list(data: Any, key: str) -> list[dict[str, Any]]:
    try:
        lists = data["MRData"]["StandingsTable"]["StandingsLists"]
    except (KeyError, TypeError) as exc:
        raise SourceFormatError("jolpica: unexpected standings payload") from exc
    return lists[0].get(key, []) if lists else []


def _parse_driver_standing(item: dict[str, Any]) -> DriverStandingRow | None:
    driver = item.get("Driver", {})
    family = to_str(driver.get("familyName"))
    code = to_str(driver.get("code")) or (family[:3] if family else None)
    if code is None:
        return None
    given = to_str(driver.get("givenName")) or ""
    return DriverStandingRow(
        driver_code=code.upper(),
        driver_name=f"{given} {family or ''}".strip() or code.upper(),
        position=to_int(item.get("position")),
        points=to_float(item.get("points")) or 0.0,
        wins=to_int(item.get("wins")) or 0,
        constructors=tuple(n for n in (to_str(c.get("name")) for c in item.get("Constructors", [])) if n),
    )


def _parse_constructor_standing(item: dict[str, Any]) -> ConstructorStandingRow | None:
    name = to_str(item.get("Constructor", {}).get("name"))
    if name is None:
        return None
    return ConstructorStandingRow(
        name=name,
        position=to_int(item.get("position")),
        points=to_float(item.get("points")) or 0.0,
        wins=to_int(item.get("wins")) or 0,
    )


def _parse_result(item: dict[str, Any]) -> ResultRow | None:
    driver = item.get("Driver", {})
    code = to_str(driver.get("code"))
    if code is None:
        # Ergast-era rows without a 3-letter code: derive from family name, flag via log.
        family = to_str(driver.get("familyName"))
        if family is None:
            return None
        code = family[:3].upper()
        log.warning("driver %s has no code upstream; using %s", driver.get("driverId"), code)
    given, family_name = to_str(driver.get("givenName")) or "", to_str(driver.get("familyName")) or ""
    grid_raw = to_int(item.get("grid"))
    pit_lane = grid_raw == 0
    position_text = to_str(item.get("positionText")) or ""
    fastest = item.get("FastestLap") or {}
    return ResultRow(
        driver_id=to_str(driver.get("driverId")) or code.lower(),
        driver_code=code.upper(),
        # The number used IN THIS RACE. Driver.permanentNumber is the driver's *current* number
        # (e.g. a past champion shows the number they carry today), which is wrong for history.
        driver_number=to_int(item.get("number")) or to_int(driver.get("permanentNumber")),
        driver_name=f"{given} {family_name}".strip() or code,
        nationality=to_str(driver.get("nationality")),
        constructor=to_str(item.get("Constructor", {}).get("name")) or "Unknown",
        grid=None if pit_lane else grid_raw,
        pit_lane_start=pit_lane,
        finish=to_int(item.get("position")),
        classified=position_text.isdigit(),
        status=to_str(item.get("status")) or "Unknown",
        points=to_float(item.get("points")) or 0.0,
        laps=to_int(item.get("laps")),
        race_time_ms=to_int((item.get("Time") or {}).get("millis")),
        fastest_rank=to_int(fastest.get("rank")),
        fastest_lap=to_int(fastest.get("lap")),
        fastest_time_s=_lap_seconds((fastest.get("Time") or {}).get("time")),
        fastest_speed_kph=to_float((fastest.get("AverageSpeed") or {}).get("speed")),
    )


def season_has_results(rows: dict[int, list[ResultRow]], round_number: int) -> bool:
    return bool(clean(rows.get(round_number)))


def _lap_seconds(text: object) -> float | None:
    """'1:31.488' -> 91.488. Anything unparsable is None, never a guess."""
    value = to_str(text)
    if value is None:
        return None
    minutes, sep, seconds = value.partition(":")
    try:
        return round(int(minutes) * 60 + float(seconds), 3) if sep else round(float(minutes), 3)
    except ValueError:
        return None
