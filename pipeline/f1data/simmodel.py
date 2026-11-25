"""The strategy simulator's model: how lap time responds to tyres, fuel, heat and rain, fitted from real race laps.

Per clean green-flag dry lap of driver d at circuit k on compound c, tyre age a (laps) and race fraction f = lap / laps:

    time = base_(d, race) + offset_(c, k) + wear_(c, k) x a + cliff_c x a^2 + fuel x f + heat x (track temp - 35) x a

`base` is each driver's own average in that race, so car and driver pace cancel and only the *changes within a race*
identify the tyre, fuel and heat terms. Circuit-specific compound offsets and wear rates are fitted as deviations from
the global values with a ridge penalty, so a circuit with little data stays close to the global behaviour instead of
chasing noise. A second, global-only fit is scored on races held out of training: the model card publishes how much
the circuit terms help, so the claim is measured, not assumed.

Car and driver pace come from the same laps: each driver's race base, relative to the field's, averaged over the
latest season. Wet-weather penalties are measured from the intermediate and full-wet laps of rain races. Things the
laps cannot show (engine modes, how fast a slick tyre dies on a damp track) are published as clearly marked
assumptions, never as fitted numbers.
"""

from __future__ import annotations

import json
import math
import statistics
from collections import defaultdict
from dataclasses import dataclass

import numpy as np

from .derive import slugify
from .export import Publisher, dumps, write_if_changed
from .logging_setup import get_logger
from .sources.tracinginsights import Lap, TracingInsightsSource

log = get_logger("simmodel")

FIRST_SEASON = 2022  # the ground-effect cars: earlier seasons behave differently
DRY = ("SOFT", "MEDIUM", "HARD")
GREEN = "1"
SPREAD = 1.07  # a lap slower than this multiple of the driver's median is not racing pace
RIDGE_OFFSET = 30.0
RIDGE_WEAR = 60.0
RIDGE_CLIFF = 2.0
HOLDOUT_SHARE = 0.2
SWEEPS = 12
SCALES = (0.3, 1.0, 3.0, 10.0)  # ridge strengths tried on held-out races
MIN_CIRCUIT_LAPS = 150
PRIOR_RACES = 4  # weight, in races, of the global rate when estimating a circuit's safety-car chance
SCHEMA = 1
MIN_SHARE_OF_PREVIOUS = 0.9
EMPTY_STATS = {"races": 0, "sc": 0, "vsc": 0, "rain": 0, "laps": None}
VERSION = "sim-v1"
SIM_PATH = "simulator/model.json"

# Not measurable from lap times: kept as explicit, labelled assumptions the page shows to the viewer.
MODES = {
    "conserve": {"label": "Conserve", "pace_s": 0.35, "wear": 0.8},
    "standard": {"label": "Standard", "pace_s": 0.0, "wear": 1.0},
    "push": {"label": "Push", "pace_s": -0.3, "wear": 1.3},
}
# extra lap-time fraction per unit of wetness away from the wetness a tyre suits best
WET_SLOPE = {"SLICK": 0.45, "INTERMEDIATE": 0.25, "WET": 0.25}
WET_BEST = {"SLICK": 0.0, "INTERMEDIATE": 0.5, "WET": 0.9}


@dataclass(frozen=True)
class Row:
    race: int  # index into the race list
    lap: int
    driver: str
    team: str
    compound: str
    age: int
    frac: float
    temp: float | None
    time: float


@dataclass
class RaceInfo:
    season: int
    round: int
    slug: str
    name: str
    location: str
    country: str
    total: int
    wet: bool
    temps: list[float]


def clean_laps(laps: list[Lap]) -> list[Lap]:
    rows = [
        lap
        for lap in laps
        if lap.time_s is not None
        and lap.lap > 2
        and lap.track_status == GREEN
        and not lap.pit_in
        and not lap.pit_out
        and not lap.deleted
        and lap.compound
        and lap.tyre_life is not None
    ]
    if len(rows) < 10:
        return []
    median = statistics.median(lap.time_s for lap in rows)  # type: ignore[misc]
    return [lap for lap in rows if lap.time_s <= median * SPREAD]  # type: ignore[operator]


def collect(
    publisher: Publisher, tracing: TracingInsightsSource
) -> tuple[list[RaceInfo], list[Row], dict[int, list[Lap]]]:
    """Every dry race since FIRST_SEASON as clean rows, plus the green wet-weather laps of rain races."""
    races: list[RaceInfo] = []
    rows: list[Row] = []
    wet_laps: dict[int, list[Lap]] = {}
    seasons = sorted(int(p.name) for p in (publisher.root / "seasons").iterdir() if p.name.isdigit())
    for season in (s for s in seasons if s >= FIRST_SEASON):
        index = publisher.load_index(season)
        events = tracing.events(season)
        if not index:
            continue
        for entry in index.races:
            folder = events.get(entry.date)
            if not folder:
                continue
            try:
                race = tracing.race(season, folder)
            except Exception as exc:  # noqa: BLE001  (a source problem skips one race, never the whole fit)
                log.warning("%d round %d: skipped (%s)", season, entry.round, type(exc).__name__)
                continue
            total = race.total_laps or max((len(d.laps) for d in race.drivers.values()), default=0)
            if total < 20:
                continue
            every = [lap for d in race.drivers.values() for lap in d.laps]
            wet = any(lap.rainfall for lap in every) or any(lap.compound in ("INTERMEDIATE", "WET") for lap in every)
            temps = [lap.track_temp for lap in every if lap.track_temp is not None]
            info = RaceInfo(
                season, entry.round, slugify(entry.location), entry.event_name, entry.location, entry.country,
                total, wet, temps,
            )
            races.append(info)
            idx = len(races) - 1
            for code, dl in race.drivers.items():
                good = clean_laps(dl.laps)
                if wet:
                    wet_laps.setdefault(idx, []).extend(g for g in good if g.compound in ("INTERMEDIATE", "WET"))
                    continue
                for lap in good:
                    if lap.compound in DRY:
                        rows.append(
                            Row(
                                idx, lap.lap, code, lap.team or "", lap.compound, lap.tyre_life,  # type: ignore[arg-type]
                                lap.lap / total, lap.track_temp, lap.time_s,  # type: ignore[arg-type]
                            )
                        )
    return races, rows, wet_laps


# -- the regression -------------------------------------------------------------------------------------------
class Columns:
    """Names the model's coefficients: a global block, then each circuit's deviations from it."""

    def __init__(self, circuits: list[str]) -> None:
        self.names: list[str] = ["off_SOFT", "off_HARD"]
        self.names += [f"wear_{c}" for c in DRY] + [f"cliff_{c}" for c in DRY] + ["heat"]
        self.global_count = len(self.names)
        for k in circuits:
            self.names += [f"{k}|off_SOFT", f"{k}|off_HARD"] + [f"{k}|wear_{c}" for c in DRY]
        self.index = {n: i for i, n in enumerate(self.names)}
        self.circuits = circuits

    def penalties(self, scale: float) -> np.ndarray:
        out = np.zeros(len(self.names))
        for i, n in enumerate(self.names):
            if "|" in n:
                out[i] = (RIDGE_OFFSET if "|off_" in n else RIDGE_WEAR) * scale
            elif n.startswith("cliff"):
                out[i] = RIDGE_CLIFF
        return out

    def matrix(self, rows: list[Row], races: list[RaceInfo], use_circuit: bool) -> np.ndarray:
        x = np.zeros((len(rows), len(self.names)))
        ix = self.index
        for r, row in enumerate(rows):
            a = row.age / 10.0
            if row.compound in ("SOFT", "HARD"):
                x[r, ix[f"off_{row.compound}"]] = 1.0
            x[r, ix[f"wear_{row.compound}"]] = a
            x[r, ix[f"cliff_{row.compound}"]] = a * a
            if row.temp is not None:
                x[r, ix["heat"]] = (row.temp - 35.0) / 10.0 * a
            if use_circuit:
                slug = races[row.race].slug
                if row.compound in ("SOFT", "HARD"):
                    x[r, ix[f"{slug}|off_{row.compound}"]] = 1.0
                x[r, ix[f"{slug}|wear_{row.compound}"]] = a
        return x


def _groups(rows: list[Row]) -> tuple[np.ndarray, np.ndarray]:
    """Ids for (race, driver) and (race, lap): the two things each lap time is compared within."""
    a: dict[tuple, int] = {}
    b: dict[tuple, int] = {}
    ga = np.fromiter((a.setdefault((r.race, r.driver), len(a)) for r in rows), dtype=np.int64, count=len(rows))
    gb = np.fromiter((b.setdefault((r.race, r.lap), len(b)) for r in rows), dtype=np.int64, count=len(rows))
    return ga, gb


def _remove_group_means(m: np.ndarray, groups: tuple[np.ndarray, np.ndarray], sweeps: int = SWEEPS) -> np.ndarray:
    """Two-way demeaning by alternating projections: afterwards each column has mean zero within every driver-in-a-race
    and within every lap of a race. Fuel burn, track evolution and the car's pace all cancel out."""
    out = m.astype(float).copy()
    flat = out.ndim == 1
    if flat:
        out = out[:, None]
    for _ in range(sweeps):
        for g in groups:
            n = int(g.max()) + 1
            counts = np.bincount(g, minlength=n).astype(float)
            for j in range(out.shape[1]):
                out[:, j] -= (np.bincount(g, weights=out[:, j], minlength=n) / counts)[g]
    return out[:, 0] if flat else out


def prepare(rows: list[Row], races: list[RaceInfo], cols: Columns, use_circuit: bool) -> tuple[np.ndarray, np.ndarray]:
    groups = _groups(rows)
    x = _remove_group_means(cols.matrix(rows, races, use_circuit), groups)
    y = _remove_group_means(np.array([r.time for r in rows]), groups)
    return x, y


def fit(x: np.ndarray, y: np.ndarray, cols: Columns, use_circuit: bool, scale: float = 1.0) -> np.ndarray:
    penalty = cols.penalties(scale)
    if not use_circuit:
        penalty = np.where(penalty == 0, 0.0, penalty)
        penalty[[i for i, n in enumerate(cols.names) if "|" in n]] = 1.0
    penalty = penalty + 1e-6  # keeps the system solvable when a column is unused
    return np.linalg.solve(x.T @ x + np.diag(penalty), x.T @ y)


def score(x: np.ndarray, y: np.ndarray, beta: np.ndarray) -> tuple[float, float]:
    """(rmse of the model, rmse of 'no tyre effects at all') on demeaned laps."""
    if not len(y):
        return math.nan, math.nan
    return float(np.sqrt(np.mean((y - x @ beta) ** 2))), float(np.sqrt(np.mean(y**2)))


def decompose(rows: list[Row], races: list[RaceInfo], cols: Columns, beta: np.ndarray) -> tuple[dict, dict, float]:
    """What is left of every lap once tyres are removed: each driver's pace in a race, and the fuel slope.

    Returns ({(race, driver): (pace, team, laps)}, {race: average car's pace at a full tank}, fuel seconds over a race).
    """
    residual = np.array([r.time for r in rows]) - cols.matrix(rows, races, True) @ beta
    ga, gb = _groups(rows)
    pace = np.zeros(len(rows))  # alternating means: driver-in-race level + lap-of-race level
    lap_level = np.zeros(len(rows))
    for _ in range(SWEEPS):
        for g, target in ((ga, "pace"), (gb, "lap")):
            other = lap_level if target == "pace" else pace
            n = int(g.max()) + 1
            counts = np.bincount(g, minlength=n).astype(float)
            mean = (np.bincount(g, weights=residual - other, minlength=n) / counts)[g]
            if target == "pace":
                pace = mean
            else:
                lap_level = mean
    by_driver: dict[tuple[int, str], list[int]] = defaultdict(list)
    by_race_lap: dict[int, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
    for i, r in enumerate(rows):
        by_driver[(r.race, r.driver)].append(i)
        by_race_lap[r.race][r.lap].append(lap_level[i])
    inter: dict[tuple[int, str], tuple[float, str, int]] = {}
    for key, idx in by_driver.items():
        if len(idx) >= 8:
            inter[key] = (float(np.mean([pace[i] for i in idx])), rows[idx[0]].team, len(idx))
    slopes: list[float] = []
    full_tank: dict[int, float] = {}
    for race, laps in by_race_lap.items():
        xs = np.array(sorted(laps), dtype=float) / races[race].total
        ys = np.array([np.mean(laps[int(round(x * races[race].total))]) for x in xs])
        if len(xs) < 10:
            continue
        slope, icept = np.polyfit(xs, ys, 1)
        slopes.append(float(slope))
        full_tank[race] = float(icept)
    fuel = float(np.median(slopes)) if slopes else 0.0
    return inter, full_tank, fuel


# -- pace of the cars, circuits and rain --------------------------------------------------------------------
def car_and_driver_pace(
    inter: dict[tuple[int, str], tuple[float, str, int]], races: list[RaceInfo], season: int
) -> tuple[dict[str, float], dict[str, float], dict[str, str]]:
    """Team and driver offsets (seconds a lap, negative = faster) over one season, plus each driver's team."""
    by_race: dict[int, list[tuple[str, str, float, int]]] = defaultdict(list)
    for (race, code), (value, team, n) in inter.items():
        if races[race].season == season:
            by_race[race].append((code, team, value, n))
    team_vals: dict[str, list[tuple[float, int]]] = defaultdict(list)
    driver_vals: dict[str, list[tuple[float, str, int]]] = defaultdict(list)
    for members in by_race.values():
        field = statistics.fmean(v for _, _, v, _ in members)
        for code, team, v, n in members:
            team_vals[team].append((v - field, n))
            driver_vals[code].append((v - field, team, n))
    team_off = {t: sum(v * n for v, n in vs) / sum(n for _, n in vs) for t, vs in team_vals.items() if vs}
    driver_team = {c: vs[-1][1] for c, vs in driver_vals.items()}
    driver_off: dict[str, float] = {}
    for c, vs in driver_vals.items():
        total = sum(n for _, _, n in vs)
        mine = sum(v * n for v, _, n in vs) / total
        driver_off[c] = mine - team_off.get(driver_team[c], 0.0)
    return team_off, driver_off, driver_team


def _wet(races: list[RaceInfo], wet_laps: dict[int, list[Lap]], dry_median: dict[str, float]) -> dict:
    ratios: dict[str, list[float]] = {"INTERMEDIATE": [], "WET": []}
    for idx, laps in wet_laps.items():
        ref = dry_median.get(races[idx].slug)
        if not ref:
            continue
        for comp in ratios:
            times = [lap.time_s for lap in laps if lap.compound == comp]
            if len(times) >= 25:
                ratios[comp].append(statistics.median(times) / ref - 1.0)  # type: ignore[arg-type]
    out: dict = {"slope_assumed": WET_SLOPE, "best_wetness_assumed": WET_BEST}
    for comp, key in (("INTERMEDIATE", "intermediate"), ("WET", "full_wet")):
        vals = ratios[comp]
        out[f"{key}_penalty"] = round(statistics.median(vals), 4) if vals else None
        out[f"{key}_races"] = len(vals)
    return out


def _race_stats(publisher: Publisher) -> dict[str, dict]:
    """Per circuit: safety-car, VSC and rain history, pit-lane loss and race length, from the published races."""
    stats: dict[str, dict] = {}
    for season_dir in sorted((publisher.root / "seasons").iterdir()):
        if not season_dir.name.isdigit():
            continue
        index = publisher.load_index(int(season_dir.name))
        if not index:
            continue
        for entry in index.races:
            doc = publisher.load_race(entry.season, entry.round)
            if not doc or not doc.drivers:
                continue
            s = stats.setdefault(slugify(entry.location), dict(EMPTY_STATS, sc_laps=[], pit=[]))
            s["races"] += 1
            derived = doc.derived
            sc = getattr(derived, "safety_car_laps", None) or 0
            vsc = getattr(derived, "vsc_laps", None) or 0
            s["sc"] += 1 if sc > 0 else 0
            s["vsc"] += 1 if vsc > 0 else 0
            if sc > 0:
                s["sc_laps"].append(sc)
            if doc.weather and doc.weather.rainfall:
                s["rain"] += 1
            if doc.tyre_model and doc.tyre_model.pit_loss_s and 12 <= doc.tyre_model.pit_loss_s <= 40:
                s["pit"].append(doc.tyre_model.pit_loss_s)
            if getattr(derived, "total_laps", None):
                s["laps"] = derived.total_laps
    return stats


def _shrunk(hits: int, n: int, prior: float) -> float:
    return (hits + PRIOR_RACES * prior) / (n + PRIOR_RACES)


def build_model(publisher: Publisher, tracing: TracingInsightsSource) -> dict | None:
    races, rows, wet_laps = collect(publisher, tracing)
    if len(rows) < 5000:
        log.warning("only %d laps: not enough to fit a simulator model", len(rows))
        return None
    lap_count: dict[str, int] = defaultdict(int)
    for r in rows:
        lap_count[races[r.race].slug] += 1
    slugs = sorted(k for k, n in lap_count.items() if n >= MIN_CIRCUIT_LAPS)
    cols = Columns(slugs)
    keep = [r for r in rows if races[r.race].slug in slugs]

    # Pick the ridge strength, and score the circuit terms, on the latest 20% of dry races: ones the fit never saw.
    order = sorted({r.race for r in keep}, key=lambda i: (races[i].season, races[i].round))
    held = set(order[int(len(order) * (1 - HOLDOUT_SHARE)) :])
    train = [r for r in keep if r.race not in held]
    test = [r for r in keep if r.race in held]
    card: dict = {"holdout_races": len(held), "holdout_laps": len(test)}
    x_tr, y_tr = prepare(train, races, cols, True)
    x_te, y_te = prepare(test, races, cols, True)
    rmse_global, no_effect = score(x_te, y_te, fit(x_tr, y_tr, cols, False))
    best = min(SCALES, key=lambda sc: score(x_te, y_te, fit(x_tr, y_tr, cols, True, sc))[0])
    rmse_circuit, _ = score(x_te, y_te, fit(x_tr, y_tr, cols, True, best))
    card.update({"rmse_global_s": round(rmse_global, 3), "rmse_circuit_s": round(rmse_circuit, 3),
                 "rmse_without_tyre_effects_s": round(no_effect, 3), "ridge_scale": best})

    x_all, y_all = prepare(keep, races, cols, True)
    beta = fit(x_all, y_all, cols, True, best)
    g = {n: float(beta[i]) for i, n in enumerate(cols.names[: cols.global_count])}
    inter, full_tank, fuel = decompose(keep, races, cols, beta)

    # circuit base pace: the field-average car at a full tank, over the circuit's most recent two seasons
    race_mean: dict[int, float] = {}
    for idx in {k[0] for k in inter}:
        if idx in full_tank:
            race_mean[idx] = float(np.mean([v for (r, _), (v, _, _) in inter.items() if r == idx])) + full_tank[idx]
    by_slug: dict[str, list[int]] = defaultdict(list)
    for idx in race_mean:
        by_slug[races[idx].slug].append(idx)
    stats = _race_stats(publisher)

    def dev(slug: str, name: str) -> float:
        return float(beta[cols.index[f"{slug}|{name}"]])

    totals = [s for s in stats.values() if s["races"]]
    prior_sc = sum(s["sc"] for s in totals) / max(1, sum(s["races"] for s in totals))
    prior_vsc = sum(s["vsc"] for s in totals) / max(1, sum(s["races"] for s in totals))
    prior_rain = sum(s["rain"] for s in totals) / max(1, sum(s["races"] for s in totals))
    all_pits = [p for s in totals for p in s["pit"]]
    pit_default = statistics.median(all_pits) if all_pits else 22.0
    sc_lengths = [x for s in totals for x in s["sc_laps"]]
    circuits_doc = {}
    for path in (publisher.root / "circuits").glob("*.json"):
        if path.name in ("outlines.json", "index.json"):
            continue
        try:
            d = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(d, dict) and d.get("slug"):
                circuits_doc[d["slug"]] = d
        except (OSError, ValueError):
            continue

    # How long each compound has actually lasted: the longest run of each driver on it, per circuit (90th percentile).
    longest: dict[tuple[str, str], dict[tuple[int, str], int]] = defaultdict(dict)
    for r in keep:
        key = (races[r.race].slug, r.compound)
        longest[key][(r.race, r.driver)] = max(longest[key].get((r.race, r.driver), 0), r.age)

    def observed_max(slug: str, compound: str) -> int:
        runs = sorted(longest.get((slug, compound), {}).values())
        return max(8, runs[int(0.9 * (len(runs) - 1))]) if runs else 12

    dry_median: dict[str, float] = {}
    circuits = []
    for slug in slugs:
        idxs = sorted(by_slug.get(slug, []), key=lambda i: (races[i].season, races[i].round))[-2:]
        if not idxs:
            continue
        last = races[idxs[-1]]
        s = stats.get(slug, dict(EMPTY_STATS, sc_laps=[], pit=[]))
        doc = circuits_doc.get(slug, {})
        temps = [t for i in idxs for t in races[i].temps]
        dry_median[slug] = statistics.median(r.time for r in keep if races[r.race].slug == slug)
        circuits.append({
            "slug": slug,
            "name": doc.get("name") or last.name,
            "location": last.location,
            "country": last.country,
            "laps": s["laps"] or last.total,
            "base_lap_s": round(statistics.fmean(race_mean[i] for i in idxs), 3),
            "pit_loss_s": round(statistics.fmean(s["pit"]), 2) if s["pit"] else round(pit_default, 2),
            "offsets": {c: round(g[f"off_{c}"] + dev(slug, f"off_{c}"), 3) for c in ("SOFT", "HARD")},
            "wear_s_per_lap": {c: round((g[f"wear_{c}"] + dev(slug, f"wear_{c}")) / 10.0, 4) for c in DRY},
            "max_age": {c: observed_max(slug, c) for c in DRY},
            "sc_prob": round(_shrunk(s["sc"], s["races"], prior_sc), 3),
            "vsc_prob": round(_shrunk(s["vsc"], s["races"], prior_vsc), 3),
            "rain_prob": round(_shrunk(s["rain"], s["races"], prior_rain), 3),
            "sc_laps": round(statistics.fmean(s["sc_laps"] or sc_lengths or [4.0]), 1),
            "overtakes": doc.get("avg_overtakes"),
            "track_temp_c": round(statistics.median(temps), 1) if temps else 35.0,
            "races_seen": s["races"],
            "laps_fitted": lap_count[slug],
        })

    latest = max(races[i].season for i in race_mean)
    team_off, driver_off, driver_team = car_and_driver_pace(inter, races, latest)
    driver_races: dict[str, int] = defaultdict(int)
    for (race, code) in inter:
        if races[race].season == latest:
            driver_races[code] += 1
    colors = {}
    ratings = publisher.load_ratings()
    names = {}
    if ratings:
        for r in ratings.ratings:
            colors[r.code] = r.team_color
            names[r.code] = r.name
    teams = []
    for t, off in sorted(team_off.items(), key=lambda kv: kv[1]):
        members = [c for c, tt in driver_team.items() if tt == t]
        color = next((colors[c] for c in members if colors.get(c)), None)
        teams.append({"name": t, "offset_s": round(off, 3), "color": color})
    drivers = [
        {
            "code": c, "name": names.get(c, c), "team": driver_team[c],
            "offset_s": round(driver_off[c], 3), "color": colors.get(c), "races": driver_races.get(c, 0),
        }
        for c in sorted(driver_off, key=lambda c: team_off.get(driver_team[c], 0.0) + driver_off[c])
    ]

    laps_fitted = len(keep)
    card.update({
        "seasons": sorted({races[r.race].season for r in keep}),
        "races": len({r.race for r in keep}),
        "laps": laps_fitted,
        "circuits": len(circuits),
        "method": "ridge regression on fuel-corrected green-flag laps, circuit terms shrunk toward global",
    })
    if card["rmse_circuit_s"] and card["rmse_global_s"]:
        card["circuit_terms_gain_pct"] = round(100 * (1 - card["rmse_circuit_s"] / card["rmse_global_s"]), 1)
    return {
        "schema_version": SCHEMA,
        "version": VERSION,
        "season": latest,
        "global": {
            "offsets": {"SOFT": round(g["off_SOFT"], 3), "MEDIUM": 0.0, "HARD": round(g["off_HARD"], 3)},
            "wear_s_per_lap": {c: round(g[f"wear_{c}"] / 10.0, 4) for c in DRY},
            "cliff_s_per_lap2": {c: round(g[f"cliff_{c}"] / 100.0, 5) for c in DRY},
            "fuel_total_s": round(fuel, 3),
            "heat_wear_s_per_lap_per_c": round(g["heat"] / 100.0, 5),
            "sc_prob": round(prior_sc, 3),
            "rain_prob": round(prior_rain, 3),
        },
        "circuits": circuits,
        "teams": teams,
        "drivers": drivers,
        "wet": _wet(races, wet_laps, dry_median),
        "modes_assumed": MODES,
        "cliff_assumed": {
            "after_observed_max_s_per_lap2": 0.012,
            "note": "beyond the longest run seen on a compound there, lap time is assumed to fall away quadratically",
        },
        "card": card,
    }


def enough_data(path, model: dict) -> bool:
    """A refresh that can only see part of the lap archive must not replace a model fitted on all of it."""
    if not path.exists():
        return True
    try:
        before = json.loads(path.read_text(encoding="utf-8"))["card"]["laps"]
    except (OSError, ValueError, KeyError):
        return True
    if model["card"]["laps"] < MIN_SHARE_OF_PREVIOUS * before:
        log.warning("simulator model refit on %d laps, the published one used %d: keeping the published model",
                    model["card"]["laps"], before)
        return False
    return True


def refresh_simulator(publisher: Publisher, tracing: TracingInsightsSource | None = None) -> int:
    """Fit and publish the simulator model. Returns the number of circuits, or 0 when there is not enough data."""
    model = build_model(publisher, tracing or TracingInsightsSource())
    if model is None:
        return 0
    if not enough_data(publisher.root / SIM_PATH, model):
        return 0
    write_if_changed(publisher.root / SIM_PATH, dumps(model))
    log.info("simulator model: %d circuits, %d laps", len(model["circuits"]), model["card"]["laps"])
    return len(model["circuits"])


def problems(path_text: str) -> list[str]:
    """Data-gate check of a published simulator model: every number the page relies on must be finite and plausible."""
    try:
        doc = json.loads(path_text)
    except ValueError:
        return ["simulator/model.json: not valid JSON"]
    found: list[str] = []
    g = doc.get("global", {})
    if not -2.0 <= g.get("offsets", {}).get("SOFT", 0) <= 0.5:
        found.append("simulator: soft compound offset implausible")
    for c, w in g.get("wear_s_per_lap", {}).items():
        if not -0.02 <= w <= 0.4:
            found.append(f"simulator: {c} wear rate {w} implausible")
    if not -10 <= g.get("fuel_total_s", 0) <= 0.5:
        found.append("simulator: fuel effect implausible")
    for k in doc.get("circuits", []):
        if not 55 <= k["base_lap_s"] <= 160:
            found.append(f"simulator {k['slug']}: base lap {k['base_lap_s']} s implausible")
        if not 10 <= k["pit_loss_s"] <= 45:
            found.append(f"simulator {k['slug']}: pit loss {k['pit_loss_s']} s implausible")
        if not 20 <= (k["laps"] or 0) <= 100:
            found.append(f"simulator {k['slug']}: {k['laps']} laps implausible")
        if set(k.get("max_age", {})) != set(DRY):
            found.append(f"simulator {k['slug']}: missing observed stint lengths")
        for key in ("sc_prob", "vsc_prob", "rain_prob"):
            if not 0 <= k[key] <= 1:
                found.append(f"simulator {k['slug']}: {key} outside 0..1")
    if not doc.get("circuits"):
        found.append("simulator: no circuits")
    return found

