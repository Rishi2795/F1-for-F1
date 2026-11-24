"""Published data contract. Everything the website reads is validated through these models.

Convention: missing = ``None`` (+ a ``quality`` note). No sentinel numbers (0, 99) and no
invented defaults.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from . import SCHEMA_VERSION

DataStatus = Literal["ok", "partial", "missing", "scheduled"]


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


CompoundSource = Literal["timing", "continuity", "openf1"]


class Stint(_Model):
    number: int
    compound: str | None
    # Where the compound came from: the lap-timing feed, derived from tyre continuity across a
    # boundary with no pit stop, or OpenF1. None = compound unknown.
    compound_source: CompoundSource | None = None
    lap_start: int
    lap_end: int
    laps: int
    tyre_age_start: int | None = None
    fresh: bool | None = None


class StrategyRisk(_Model):
    risk_score: int
    risk_label: str
    method: str = "rule_based_v1"


class StrategySimulation(_Model):
    verdict: str
    method: str = "rule_based_v1"


class DriverRace(_Model):
    driver_code: str
    driver_number: int | None
    driver_name: str
    team: str
    team_color: str | None
    finish: int | None
    classified: bool
    status: str
    points: float
    laps_completed: int | None
    grid: int | None
    pit_lane_start: bool
    positions_gained: int | None
    laps_available: bool
    stops: int | None
    stops_official: int | None
    tyre_sequence: list[str] | None
    stints: list[Stint] | None
    longest_stint: int | None
    consistency_index: int | None
    strategy_risk: StrategyRisk | None
    strategy_simulation: StrategySimulation | None


class WinningRecipe(_Model):
    typical_stops: int | None
    common_tyre_sequence: str | None
    avg_longest_stint: int | None


class Derived(_Model):
    winning_recipe: WinningRecipe
    style_profile: list[str]
    total_laps: int | None
    safety_car_laps: int | None
    vsc_laps: int | None
    red_flag: bool | None


class Weather(_Model):
    air_temp_c: float | None
    track_temp_c: float | None
    humidity_pct: float | None
    rainfall: bool | None


class Winner(_Model):
    driver_code: str
    driver_name: str
    team: str


class Quality(_Model):
    status: DataStatus
    sources: dict[str, str] = Field(default_factory=dict)
    missing: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)  # e.g. how many stints were filled, and from where


class RaceDoc(_Model):
    schema_version: int = SCHEMA_VERSION
    season: int
    round: int
    event_name: str
    location: str
    country: str | None
    date: str
    winner: Winner | None
    drivers: list[DriverRace]
    derived: Derived
    weather: Weather | None
    quality: Quality


class RaceIndexEntry(_Model):
    season: int
    round: int
    event_name: str
    location: str
    country: str | None
    date: str
    data_status: DataStatus


class RaceIndex(_Model):
    schema_version: int = SCHEMA_VERSION
    season: int
    races: list[RaceIndexEntry]


class SeasonSummary(_Model):
    season: int
    team: str | None
    races: int
    wins: int
    podiums: int
    points: float
    best_finish: int | None
    avg_finish: float | None
    avg_grid: float | None
    positions_gained: int | None
    consistency: float | None
    avg_longest_stint: float | None
    recent_form: float | None


class RatingSummary(_Model):
    """A driver's current rating, split into driver skill and car strength (Elo scale: 400 points = 10:1 odds)."""

    overall: int
    driver: int
    car: int
    rank: int
    races: int
    provisional: bool  # fewer than 15 races of data
    as_of: str  # e.g. "2026 R21"


class DriverProfile(_Model):
    schema_version: int = SCHEMA_VERSION
    code: str
    name: str
    team: str | None
    number: int | None
    nationality: str | None = None
    image: str | None = None
    latest_season: int
    rating: RatingSummary | None = None
    titles: int = 0  # drivers' world championships, all-time
    title_years: list[int] = Field(default_factory=list)
    stats: SeasonSummary
    seasons: list[SeasonSummary]


class RatingEntry(_Model):
    code: str
    name: str
    team: str
    overall: int
    driver: int
    car: int
    rank: int
    races: int
    provisional: bool


class RatingsCurrent(_Model):
    schema_version: int = SCHEMA_VERSION
    version: str
    season: int
    round: int
    ratings: list[RatingEntry]


class RatingHistory(_Model):
    """Rating after each race: [season, round, driver rating, car rating]."""

    code: str
    history: list[list[int]]


class DriverListEntry(_Model):
    code: str
    name: str
    team: str | None
    country: str | None
    image: str | None = None
    rating: float | None = None
    titles: int | None = None
    latest_season: int


class StandingsDriver(_Model):
    code: str
    name: str
    number: int | None = None  # the number raced with in that season
    team: str | None
    team_color: str | None
    position: int | None
    points: float
    wins: int


class StandingsConstructor(_Model):
    name: str
    team_color: str | None
    position: int | None
    points: float
    wins: int


class StandingsRound(_Model):
    round: int
    event_name: str
    drivers: list[StandingsDriver]
    constructors: list[StandingsConstructor]


class SeasonStandings(_Model):
    """Official championship standings after every played round (sprint points included)."""

    schema_version: int = SCHEMA_VERSION
    season: int
    source: str = "jolpica"
    complete: bool = False  # True once the season's final round is in: the leader is then the champion
    rounds: list[StandingsRound]


class Champion(_Model):
    season: int
    code: str
    name: str


class Champions(_Model):
    """Drivers' world champions of every finished season (1950 onward)."""

    schema_version: int = SCHEMA_VERSION
    champions: list[Champion]
