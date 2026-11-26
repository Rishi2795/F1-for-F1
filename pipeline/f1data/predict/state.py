"""Pre-race knowledge, built only from races that already happened.

A forecast for race N may use races 1..N-1 and nothing else. `Tracker` is the running memory: the driver and
car ratings, each driver's recent finishes, each team's recent race pace (the "current car condition"), and
how often drivers and teams fail to finish.
"""

from __future__ import annotations

import copy
import math
from dataclasses import dataclass

from ..export import Publisher
from ..ratings.data import RaceRecord, Starter
from ..ratings.lineage import lineage
from ..ratings.model import Params, RatingModel

DNF_WINDOW = 40  # starts remembered per driver / team
PRIOR_DNF = 0.10  # what a driver with no history is assumed to do
NEUTRAL_FORM = 10.5
MAX_PACE_GAP = 4.0  # seconds; a few slow outliers should not swamp the feature


@dataclass(frozen=True)
class Config:
    """The memory lengths of the forecast. Chosen on the tuning seasons, so they are data, not opinion."""

    form_window: int = 5  # finishes remembered per driver
    pace_window: int = 3  # races of team pace remembered
    prior_weight: int = 20  # how many starts the retirement prior is worth


@dataclass(frozen=True)
class PStarter:
    code: str
    name: str
    team: str
    key: str  # team lineage key (the same car programme across renames)
    color: str | None
    grid: int | None
    finish: int | None
    classified: bool
    pace_gap: float | None  # seconds per lap behind the quickest driver, clean laps only
    quali_gap: float | None = None  # percent slower than the pole lap in qualifying


@dataclass(frozen=True)
class PRace:
    season: int
    round: int
    event: str
    date: str
    starters: tuple[PStarter, ...]


@dataclass(frozen=True)
class Feat:
    """One driver's pre-race picture."""

    code: str
    rating: float  # driver skill + car strength, in rating units (log-odds)
    grid: float  # -log(grid slot); 0 when the grid is unknown
    quali: float  # -(percent behind pole in qualifying), relative to the field; 0 when unknown
    pace: float  # -(team's recent seconds behind the quickest), relative to the field
    form: float  # -(average of recent finishes) / 5
    p_dnf: float
    team_pace_gap: float | None  # for display
    avg_finish: float | None  # for display

    def vector(self, with_grid: bool) -> list[float]:
        if with_grid:
            return [self.rating, self.grid, self.quali, self.pace, self.form]
        return [self.rating, self.pace, self.form]


def load_timeline(publisher: Publisher, min_starters: int = 10) -> list[PRace]:
    races: list[PRace] = []
    for season in sorted(publisher.published_seasons()):
        for path in (publisher.root / "seasons" / str(season)).glob("race_*.json"):
            doc = publisher.load_race(season, int(path.stem.split("_")[1]))
            if doc is None or len(doc.drivers) < min_starters:
                continue
            starters = tuple(
                PStarter(
                    d.driver_code,
                    d.driver_name,
                    d.team,
                    lineage(d.team),
                    d.team_color,
                    d.grid,
                    d.finish,
                    d.classified,
                    d.pace_gap_s,
                    d.quali_gap_pct,
                )
                for d in doc.drivers
            )
            races.append(PRace(doc.season, doc.round, doc.event_name, doc.date, starters))
    return sorted(races, key=lambda r: (r.season, r.round))


def _record(race: PRace) -> RaceRecord:
    return RaceRecord(
        race.season,
        race.round,
        tuple(Starter(s.code, s.name, s.team, s.key, s.finish, s.classified, s.grid) for s in race.starters),
    )


def _shrunk(history: list[int], weight: int) -> float:
    return (sum(history) + weight * PRIOR_DNF) / (len(history) + weight)


class Tracker:
    def __init__(self, params: Params, config: Config | None = None) -> None:
        self.cfg = config or Config()
        self.model = RatingModel(params)
        self.finishes: dict[str, list[int]] = {}
        self.team_pace: dict[str, list[float]] = {}
        self.driver_dnf: dict[str, list[int]] = {}
        self.team_dnf: dict[str, list[int]] = {}

    def clone(self) -> Tracker:
        return copy.deepcopy(self)

    def start_season(self, season: int) -> None:
        self.model.start_season(season)

    # -- reading ------------------------------------------------------------------------------------------
    def features(self, starters: tuple[PStarter, ...], *, grid_known: bool) -> list[Feat]:
        slots = len(starters) + 1
        team_gap: dict[str, float | None] = {}
        for s in starters:
            hist = self.team_pace.get(s.key)
            team_gap[s.key] = sum(hist) / len(hist) if hist else None
        known = [g for g in team_gap.values() if g is not None]
        field_mean = sum(known) / len(known) if known else 0.0
        q_known = [s.quali_gap for s in starters if s.quali_gap is not None]
        q_mean = sum(q_known) / len(q_known) if q_known else 0.0
        out: list[Feat] = []
        for s in starters:
            gap = team_gap[s.key]
            finishes = self.finishes.get(s.code)
            avg = sum(finishes) / len(finishes) if finishes else None
            grid = -math.log(s.grid if s.grid is not None else slots) if grid_known else 0.0
            w = self.cfg.prior_weight
            p_dnf = 0.5 * (_shrunk(self.team_dnf.get(s.key, []), w) + _shrunk(self.driver_dnf.get(s.code, []), w))
            q_gap = s.quali_gap if s.quali_gap is not None else q_mean
            quali = -(q_gap - q_mean) if grid_known else 0.0
            out.append(
                Feat(
                    s.code,
                    self.model.driver.get(s.code, 0.0) + self.model.car.get(s.key, 0.0),
                    grid,
                    quali,
                    -((gap if gap is not None else field_mean) - field_mean),
                    -((avg if avg is not None else NEUTRAL_FORM) - NEUTRAL_FORM) / 5.0,
                    p_dnf,
                    gap,
                    avg,
                )
            )
        return out

    # -- learning -----------------------------------------------------------------------------------------
    def learn(self, race: PRace) -> None:
        self.model.update(_record(race))
        for s in race.starters:
            if s.classified and s.finish is not None:
                self.finishes[s.code] = (self.finishes.get(s.code, []) + [s.finish])[-self.cfg.form_window :]
            out = 0 if s.classified else 1
            self.driver_dnf[s.code] = (self.driver_dnf.get(s.code, []) + [out])[-DNF_WINDOW:]
            self.team_dnf[s.key] = (self.team_dnf.get(s.key, []) + [out])[-DNF_WINDOW * 2 :]
        best: dict[str, float] = {}
        for s in race.starters:
            if s.pace_gap is not None:
                best[s.key] = min(best.get(s.key, MAX_PACE_GAP), min(s.pace_gap, MAX_PACE_GAP))
        for key, gap in best.items():
            self.team_pace[key] = (self.team_pace.get(key, []) + [gap])[-self.cfg.pace_window :]
