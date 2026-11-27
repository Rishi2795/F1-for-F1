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


class PitStop(_Model):
    stop: int
    lap: int | None
    duration_s: float | None  # stationary + pit-lane time as reported officially


class FastestLap(_Model):
    """The official fastest lap of a driver (Jolpica); rank 1 = fastest of the race."""

    rank: int | None
    lap: int | None
    time_s: float | None
    avg_speed_kph: float | None


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
    # Detail added later: all optional so older published files stay valid.
    race_time_s: float | None = None
    gap_to_winner_s: float | None = None  # only for cars on the winner's lap
    fastest_lap: FastestLap | None = None
    pit_stops: list[PitStop] | None = None
    best_lap_s: float | None = None  # quickest valid lap
    median_lap_s: float | None = None  # median of clean green-flag laps
    pace_rank: int | None = None  # by median clean lap
    pace_gap_s: float | None = None  # median clean lap minus the quickest driver's
    lap_positions: list[int | None] | None = None  # position at the end of lap 1, 2, ...
    quali_position: int | None = None
    quali_gap_pct: float | None = None  # percent slower than the pole lap (each driver's best qualifying time)
    sprint_position: int | None = None
    sprint_points: float | None = None


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


class LapRef(_Model):
    driver_code: str
    lap: int | None
    value_s: float


class TyreWear(_Model):
    """Net lap-time change per lap of tyre age. Not fuel-corrected, so it understates real wear."""

    compound: str
    seconds_per_lap: float
    stints: int


class Excitement(_Model):
    """How eventful a race was, from lap-by-lap positions. 0-10, built only from things that can be counted."""

    score: float
    overtakes: int | None  # position gains between consecutive laps by cars not in the pits
    lead_changes: int | None
    safety_car_laps: int | None
    shuffle: float | None  # average places moved between grid and finish
    top2_gap_s: float | None  # winner's margin over second place
    retirements: int
    tags: list[str]


class TyreCompound(_Model):
    compound: str
    pace_offset_s: float  # seconds per lap versus the race's reference compound, fuel and driver removed
    wear_s_per_lap: float  # seconds lost per lap of tyre age, fuel removed
    stints: int


class TyreModel(_Model):
    """Fuel-corrected tyre behaviour for one race: lap time = driver + compound + wear x age + fuel x lap."""

    fuel_s_per_lap: float  # seconds gained per lap as the car burns fuel (negative = quicker)
    pit_loss_s: float
    laps_fitted: int
    compounds: list[TyreCompound]


class StrategyOption(_Model):
    label: str  # e.g. "MEDIUM 20 > HARD 38"
    stops: int
    delta_s: float  # modelled race time versus the strategy the driver actually ran (negative = quicker)


class DriverStrategy(_Model):
    driver_code: str
    actual: str
    options: list[StrategyOption]


class Analysis(_Model):
    fastest_lap: LapRef | None
    fastest_pit: LapRef | None
    lead_changes: int | None
    tyre_wear: list[TyreWear]


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
    analysis: Analysis | None = None
    excitement: Excitement | None = None
    tyre_model: TyreModel | None = None
    strategy_lab: list[DriverStrategy] | None = None


class WeekendSession(_Model):
    name: str  # Practice 1, Qualifying, Sprint, Race ...
    starts: str  # UTC, e.g. 2026-11-28T18:00:00Z: the browser shows it in the viewer's own time zone


class RaceIndexEntry(_Model):
    season: int
    round: int
    event_name: str
    location: str
    country: str | None
    date: str
    data_status: DataStatus
    excitement: float | None = None  # 0-10, from lap-by-lap positions (see derive.py)
    watch_tags: list[str] = Field(default_factory=list)
    overtakes: int | None = None
    winner: str | None = None  # driver name; the Watch page hides it until the viewer asks
    sessions: list[WeekendSession] = Field(default_factory=list)  # the weekend's timetable, from the official schedule


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
    team_color: str | None = None
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
    team_color: str | None = None  # the driver's most recent team colour, for charts


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


class ForecastDriver(_Model):
    code: str
    name: str
    team: str
    team_color: str | None
    win: float
    podium: float
    top10: float
    dnf: float
    exp_pos: float
    exp_points: float
    car_rank: int  # 1 = the strongest car on the grid
    pace_rank: int | None  # by the team's recent race pace
    pace_gap: float | None  # the team's recent seconds per lap behind the quickest car
    avg_finish: float | None  # the driver's recent average finish
    grid: int | None = None  # starting slot, once qualifying is done


class RaceForecast(_Model):
    season: int
    round: int
    event_name: str
    date: str
    mode: str  # "pre_qualifying" (grid unknown) or "post_qualifying"
    drivers: list[ForecastDriver]


class NextForecasts(_Model):
    schema_version: int = SCHEMA_VERSION
    version: str
    as_of_season: int
    as_of_round: int
    races: list[RaceForecast]


class TitleDriver(_Model):
    code: str
    name: str
    team: str
    team_color: str | None
    points: float
    champion: float
    top3: float
    exp_points: float
    positions: list[float] = Field(default_factory=list)  # chance of finishing 1st, 2nd, 3rd ... in the final standings
    points_lo: float | None = None  # a likely range for the final points: 10th and 90th percentile of the simulations
    points_hi: float | None = None


class TitleConstructor(_Model):
    name: str
    team_color: str | None
    points: float
    champion: float
    exp_points: float


class TitleRace(_Model):
    round: int
    event_name: str
    date: str


class TitleForecast(_Model):
    schema_version: int = SCHEMA_VERSION
    version: str
    season: int
    as_of_round: int
    races_left: int
    remaining: list[TitleRace]
    clinched_driver: str | None  # a driver nobody can catch, even with a sprint win every weekend
    clinched_constructor: str | None
    drivers: list[TitleDriver]
    constructors: list[TitleConstructor]


class ForecastReviewRow(_Model):
    season: int
    round: int
    event_name: str
    favourite: str
    favourite_name: str
    favourite_win: float
    winner: str
    winner_name: str
    winner_win: float
    winner_rank: int  # where the model ranked the real winner (1 = it backed the right driver)


class DuelSide(_Model):
    code: str
    name: str


class DuelTally(_Model):
    a: int
    b: int
    races: int  # races where both could be compared


class Duel(_Model):
    """Two teammates over a season: same car, so the gaps are the drivers."""

    team: str
    team_color: str | None
    a: DuelSide
    b: DuelSide
    races: int  # races they started together
    qualifying: DuelTally
    qualifying_gap_pct: float | None  # a minus b: positive means a was slower
    race: DuelTally  # finishing ahead, only when both were classified
    only_a_finished: int
    only_b_finished: int
    pace_races: int
    pace_gap_s: float | None  # median seconds per lap, a minus b: negative means a was quicker
    points_a: float
    points_b: float


class DuelsDoc(_Model):
    schema_version: int = SCHEMA_VERSION
    season: int
    duels: list[Duel]


class CircuitOutline(_Model):
    """A circuit drawn from one real lap of position data: points evenly spaced along the lap, in a 1000x1000 box."""

    points: list[list[int]]
    length_m: int
    source: str  # which race the lap came from


class TelemetryDriver(_Model):
    """One driver's fastest lap, resampled to ``n`` points evenly spaced round the circuit (as the outline).

    Every list has ``n`` entries; entry k is where the car was k/n of the way round the lap."""

    code: str
    lap: int
    time_s: float
    t_ms: list[int]  # elapsed time at each point, in milliseconds
    speed: list[int]  # km/h
    throttle: list[int]  # percent
    brake: list[int]  # 1 = braking
    gear: list[int]
    rpm: list[int]
    drs: list[int]  # 1 = DRS open


class TelemetryDoc(_Model):
    """Fastest-lap car data for a race, from OpenF1 (2023 onward): the readings the website shows along the track."""

    season: int
    round: int
    n: int
    source: str
    sectors: list[float] | None  # lap fractions where sector 1 and sector 2 end
    drivers: list[TelemetryDriver]


class ReplayDriver(_Model):
    """One car through the whole race at one sample a second. ``None`` is a hole in the source data, never a guess."""

    code: str
    f: list[int | None]  # how far round the lap, 0..9999 (the same fraction as the circuit outline)
    speed: list[int | None]
    throttle: list[int | None]
    brake: list[int | None]
    gear: list[int | None]
    rpm: list[int | None]
    drs: list[int | None]


class ReplayDoc(_Model):
    """Where every car was, once a second, for the whole race (OpenF1, newest races only).

    ``offset_s`` turns race-clock seconds (the lap timing's clock) into indexes: sample = race seconds + offset_s."""

    season: int
    round: int
    hz: int
    n: int
    offset_s: float
    source: str
    drivers: list[ReplayDriver]


class IncidentItem(_Model):
    """One race-control message that matters to the story of the race, placed on the lap-timing clock."""

    t: float | None  # race seconds (the lap-timing clock), None if the message had no usable time
    lap: int | None
    kind: str  # collision, stopped, incident, penalty, debris, safety_car, vsc, red_flag
    text: str  # the message as the FIA published it
    drivers: list[str]  # three-letter codes named in the message


class IncidentDoc(_Model):
    season: int
    round: int
    source: str
    items: list[IncidentItem]


class CircuitRace(_Model):
    season: int
    round: int
    event_name: str
    date: str
    winner: str | None
    winner_name: str | None
    winner_team: str | None
    pole: str | None
    excitement: float | None
    laps: int | None = None  # scheduled race distance in laps


class CircuitStat(_Model):
    name: str
    count: int


class CircuitDoc(_Model):
    schema_version: int = SCHEMA_VERSION
    slug: str
    name: str
    location: str
    country: str | None
    races: list[CircuitRace]
    pole_wins: int
    pole_races: int  # races with a known pole sitter and winner
    avg_overtakes: float | None
    overtaking_rank: int | None  # 1 = the most overtaking of all circuits
    safety_car_races: int
    red_flag_races: int
    avg_retirements: float
    avg_winner_stops: float | None
    typical_winning_tyres: str | None
    avg_excitement: float | None
    winners_by_driver: list[CircuitStat]
    winners_by_team: list[CircuitStat]
    next_race: CircuitRace | None
    outline: CircuitOutline | None = None


class CircuitIndexEntry(_Model):
    slug: str
    name: str
    location: str
    country: str | None
    races: int
    avg_excitement: float | None
    preview: list[list[int]] | None = None  # a coarse outline for thumbnails


class LapDriver(_Model):
    code: str
    lap_times: list[float | None]  # seconds per lap, lap 1 first
    gap: list[float | None]  # seconds behind the race leader when each lap was completed
    best_sectors: list[float | None]  # best S1, S2, S3 of the race
    end: list[float | None] = Field(default_factory=list)  # race seconds when each lap was completed
    s1: list[int | None] = Field(default_factory=list)  # sector times per lap, in milliseconds
    s2: list[int | None] = Field(default_factory=list)
    s3: list[int | None] = Field(default_factory=list)
    speed: list[int | None] = Field(default_factory=list)  # highest speed-trap reading each lap, km/h
    top_speed_kph: float | None


class LapIncident(_Model):
    kind: str  # "SC" safety car, "VSC" virtual safety car, "RED" red flag, "YELLOW" local yellows
    from_lap: int
    to_lap: int


class Undercut(_Model):
    """A driver stopped first to jump the car ahead. Counted only when both stops were under green-flag running."""

    attacker: str
    defender: str
    attacker_lap: int
    defender_lap: int
    success: bool  # the attacker was ahead once both had stopped


class LapDoc(_Model):
    schema_version: int = SCHEMA_VERSION
    season: int
    round: int
    laps: int
    status: list[str]  # per lap: G green, Y yellow, SC, VSC, R red
    incidents: list[LapIncident]
    drivers: list[LapDriver]
    undercuts: list[Undercut]
    clock_offset: float = 0.0  # session seconds at the start of lap 1; subtract it from timing to get race time


class TeamPaceRound(_Model):
    round: int
    event_name: str
    gaps: dict[str, float]  # team -> percent slower than the quickest car that weekend


class TeamPaceTeam(_Model):
    name: str
    team_color: str | None
    races: int
    avg_gap_pct: float
    first_half_pct: float | None  # average over the first half of the season's races
    second_half_pct: float | None


class TeamPaceDoc(_Model):
    schema_version: int = SCHEMA_VERSION
    season: int
    rounds: list[TeamPaceRound]
    teams: list[TeamPaceTeam]  # quickest on average first


class DriverListEntry(_Model):
    code: str
    name: str
    team: str | None
    country: str | None
    image: str | None = None
    number: int | None = None  # the number raced with in their latest season
    team_color: str | None = None
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
    """World champions of every finished season (1950 onward), and of this season once its title is decided."""

    schema_version: int = SCHEMA_VERSION
    champions: list[Champion]
