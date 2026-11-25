"""Build the forecast documents the website reads: next races, championship odds, model card, track record."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from ..export import Publisher
from ..models import (
    ForecastDriver,
    ForecastReviewRow,
    NextForecasts,
    RaceForecast,
    TitleConstructor,
    TitleDriver,
    TitleForecast,
    TitleRace,
)
from ..ratings.model import Params
from ..ratings.report import params_from_card_or_default
from . import championship as ch
from . import evaluate as ev
from . import plackett
from .state import PStarter, load_timeline

VERSION = "forecast-v1"
FORECAST_TRIALS = 20000
SPRINT_ALLOWANCE = ch.SPRINT_ALLOWANCE


def _car_ranks(tracker, starters: tuple[PStarter, ...]) -> dict[str, int]:
    keys = sorted({s.key for s in starters}, key=lambda k: tracker.model.car.get(k, 0.0), reverse=True)
    return {k: i + 1 for i, k in enumerate(keys)}


def _pace_ranks(feats_by_key: dict[str, float | None]) -> dict[str, int]:
    have = sorted((g, k) for k, g in feats_by_key.items() if g is not None)
    return {k: i + 1 for i, (_, k) in enumerate(have)}


def _grid_for(publisher: Publisher, season: int, rnd: int, lineup: tuple[PStarter, ...]) -> tuple[PStarter, ...] | None:
    """The lineup with qualifying results filled in, if qualifying has happened and covers the whole lineup."""
    path = publisher.root / "grids" / f"{season}_{rnd}.json"
    if not path.exists():
        return None
    grid = {g["code"]: g for g in json.loads(path.read_text(encoding="utf-8"))["grid"]}
    if sum(1 for s in lineup if s.code in grid) < len(lineup) - 2:
        return None  # qualifying data does not match the cars we expect: do not guess
    slots = len(lineup) + 1
    return tuple(
        PStarter(
            s.code, s.name, s.team, s.key, s.color,
            grid[s.code]["position"] if s.code in grid else slots,
            None, False, None, grid[s.code]["gap_pct"] if s.code in grid else None,
        )
        for s in lineup
    )


def next_races(
    publisher: Publisher, tl: ev.Timeline, pre_w: list[float], post_w: list[float], season: int
) -> NextForecasts:
    tracker = tl.tracker
    assert tracker is not None
    last = tl.races[-1]
    index = publisher.load_index(season)
    upcoming = [r for r in (index.races if index else []) if r.data_status == "scheduled"]
    car_rank = _car_ranks(tracker, last.starters)
    races: list[RaceForecast] = []
    for race in upcoming:
        gridded = _grid_for(publisher, season, race.round, last.starters)
        starters = gridded or last.starters
        feats = tracker.features(starters, grid_known=gridded is not None)
        weights = post_w if gridded else pre_w
        strength = [sum(w * x for w, x in zip(weights, f.vector(gridded is not None), strict=True)) for f in feats]
        p_dnf = [f.p_dnf for f in feats]
        pace_rank = _pace_ranks({s.key: f.team_pace_gap for s, f in zip(starters, feats, strict=True)})
        odds = plackett.race_odds(strength, p_dnf, FORECAST_TRIALS, season * 100 + race.round)
        drivers = [
            ForecastDriver(
                code=s.code, name=s.name, team=s.team, team_color=s.color,
                win=round(o["win"], 4), podium=round(o["podium"], 4), top10=round(o["top10"], 4),
                dnf=round(o["dnf"], 4), exp_pos=round(o["exp_pos"], 2), exp_points=round(o["exp_points"], 2),
                car_rank=car_rank[s.key], pace_rank=pace_rank.get(s.key),
                pace_gap=None if f.team_pace_gap is None else round(f.team_pace_gap, 3),
                avg_finish=None if f.avg_finish is None else round(f.avg_finish, 1),
                grid=s.grid if gridded else None,
            )
            for s, f, o in zip(starters, feats, odds, strict=True)
        ]
        drivers.sort(key=lambda d: d.win, reverse=True)
        races.append(
            RaceForecast(
                season=season, round=race.round, event_name=race.event_name, date=race.date,
                mode="post_qualifying" if gridded else "pre_qualifying", drivers=drivers,
            )
        )
    return NextForecasts(version=VERSION, as_of_season=last.season, as_of_round=last.round, races=races)


def title(
    publisher: Publisher, tl: ev.Timeline, weights: list[float], season: int, sigma: tuple[float, float]
) -> TitleForecast | None:
    standings = publisher.load_standings(season)
    index = publisher.load_index(season)
    tracker = tl.tracker
    if standings is None or not standings.rounds or index is None or tracker is None:
        return None
    last = tl.races[-1]
    remaining = [r for r in index.races if r.data_status == "scheduled"]
    now = standings.rounds[-1]
    points = {d.code: d.points for d in now.drivers}
    team_points = {c.name: c.points for c in now.constructors}
    colors = {d.code: d.team_color for d in now.drivers}
    names = {d.code: (d.name, d.team or "") for d in now.drivers}
    team_colors = {c.name: c.team_color for c in now.constructors}
    feats = tracker.features(last.starters, grid_known=False)
    strength = [sum(w * x for w, x in zip(weights, f.vector(False), strict=True)) for f in feats]
    lineup = ch.lineup_from(last.starters, strength, [f.p_dnf for f in feats])
    for s in last.starters:
        points.setdefault(s.code, 0.0)
        names.setdefault(s.code, (s.name, s.team))
        colors.setdefault(s.code, s.color)
    sim = ch.simulate_title(
        points,
        team_points,
        lineup,
        len(remaining),
        trials=FORECAST_TRIALS,
        seed=season,
        team_sigma=sigma[0],
        driver_sigma=sigma[1],
    )
    ranked = sorted(points, key=lambda c: points[c], reverse=True)
    drivers = [
        TitleDriver(
            code=c,
            name=names[c][0],
            team=names[c][1],
            team_color=colors.get(c),
            points=points[c],
            champion=round(sim["drivers"][c]["champion"], 4),
            top3=round(sim["drivers"][c]["top3"], 4),
            exp_points=round(sim["drivers"][c]["exp_points"], 1),
        )
        for c in ranked
        if sim["drivers"][c]["top3"] > 0.0005 or points[c] > 0
    ]
    drivers.sort(key=lambda d: (-d.champion, -d.points))
    t_ranked = sorted(team_points, key=lambda t: team_points[t], reverse=True)
    constructors = [
        TitleConstructor(
            name=t,
            team_color=team_colors.get(t),
            points=team_points[t],
            champion=round(sim["constructors"][t]["champion"], 4),
            exp_points=round(sim["constructors"][t]["exp_points"], 1),
        )
        for t in t_ranked
    ]
    constructors.sort(key=lambda c: (-c.champion, -c.points))
    per_weekend = 25 + SPRINT_ALLOWANCE
    lead = points[ranked[0]] - points[ranked[1]] if len(ranked) > 1 else 0.0
    t_lead = team_points[t_ranked[0]] - team_points[t_ranked[1]] if len(t_ranked) > 1 else 0.0
    return TitleForecast(
        version=VERSION,
        season=season,
        as_of_round=now.round,
        races_left=len(remaining),
        remaining=[TitleRace(round=r.round, event_name=r.event_name, date=r.date) for r in remaining],
        clinched_driver=ranked[0] if lead > len(remaining) * per_weekend else None,
        clinched_constructor=t_ranked[0] if t_lead > len(remaining) * (per_weekend + 18 + 7) else None,
        drivers=drivers,
        constructors=constructors,
    )


LIMITATIONS = [
    "The forecast is made before qualifying, so the grid is not an input. Once the grid is known, results are far more predictable.",
    "'Current car condition' is measured from recent race pace and results. Upgrades, damage and set-up changes are invisible until they show up in a race.",
    "Retirements are close to a coin-flip per car: the model barely beats a fixed average.",
    "Weather, safety cars, strategy and penalties are not modelled; they are part of the uncertainty, not the forecast.",
    "Sprint races are not simulated, so title odds assume Grand Prix points only; a title is only called clinched with a sprint allowance.",
    "Driver and car strengths come from finishing orders alone; see the ratings model's limits.",
    "Test seasons are few (2024 to 2026), so small differences between variants are within noise.",
]


def _data_hash(races) -> str:
    """A fingerprint of the results the model was trained on, so a published model can be traced to its data."""
    digest = hashlib.sha256()
    for r in races:
        digest.update(f"{r.season}:{r.round}:".encode())
        for s in r.starters:
            digest.update(f"{s.code},{s.finish},{int(s.classified)},{s.grid};".encode())
    return digest.hexdigest()[:16]


def build(publisher: Publisher, trials_backtest: int = 800) -> dict[str, Any]:
    card_path = publisher.root / "ratings" / "model.json"
    params = (
        Params(**json.loads(card_path.read_text(encoding="utf-8"))["params"])
        if card_path.exists()
        else params_from_card_or_default(None)
    )
    races = load_timeline(publisher)
    config, config_search = ev.tune_config(races, params)
    tl = ev.build_timeline(races, params, config)
    evaluation = ev.evaluate(tl)
    last = races[-1]
    pre_w = evaluation.final_weights[ev.PRE]
    post_w = evaluation.final_weights[ev.POST]

    tune = [s for s in tl.samples if s.race.season in ev.TUNE_SEASONS]
    tune_w = ev.fit_variant(tune, ev.PRE)
    sigma, leader_rate, sigma_losses = ch.tune_sigma(publisher, tl, tune_w)
    rows: list[dict] = []
    for season in (s for s in ev.TEST_SEASONS):
        past = [s for s in tl.samples if s.race.season < season]
        if past:
            rows += ch.backtest(
                publisher,
                tl,
                ev.fit_variant(past, ev.PRE),
                (season,),
                trials=trials_backtest,
                sigma=sigma,
                step=1,
            )

    next_doc = next_races(publisher, tl, pre_w, post_w, last.season)
    title_doc = title(publisher, tl, pre_w, last.season, sigma)
    review = [ForecastReviewRow(**r) for r in evaluation.review]

    variants = {}
    for name, (with_grid, idx) in ev.VARIANTS.items():
        metrics = {k: v for k, v in evaluation.metrics[name].items() if not k.startswith("_")}
        variants[name] = {
            "uses": [ev.FEATURE_NAMES[with_grid][i] for i in idx],
            "weights": [round(x, 3) for x in evaluation.final_weights[name]],
            **metrics,
        }
    baselines = evaluation.metrics["ratings_pace_form"]["_baselines"]
    card = {
        "version": VERSION,
        "as_of": {"season": last.season, "round": last.round},
        "method": [
            "Each driver gets a strength: their rating (driver skill plus car strength), the team's recent race pace, and their recent form.",
            "Strengths turn into odds with a Plackett-Luce model fitted on past finishing orders; a temperature step fixes the front of the field.",
            "A retirement chance per driver (from the driver's and the team's recent record) is mixed in, then the race is simulated 20,000 times.",
            "Championship odds simulate the remaining races, with a shared shift per team and driver so the cars can change between rounds.",
        ],
        "tuning": {
            "seasons": list(ev.TUNE_SEASONS),
            "races": evaluation.tune_races,
            "title_uncertainty": {"team": sigma[0], "driver": sigma[1]},
            "title_uncertainty_search": sigma_losses,
        },
        "test": {"seasons": list(ev.TEST_SEASONS), "races": evaluation.test_races},
        "uniform_winner_log_loss": evaluation.uniform_log_loss,
        "retirement_rate": evaluation.base_dnf,
        "baselines": baselines,
        "variants": variants,
        "forecast_variant": ev.PRE,
        "post_qualifying_variant": ev.POST,
        "training": {
            "races": len(races),
            "through": f"{last.season} R{last.round}",
            "data_hash": _data_hash(races),
            "memory": {"form_window": config.form_window, "pace_window": config.pace_window, "retirement_prior": config.prior_weight},
            "memory_search": config_search,
            "rating_params": {k: round(v, 4) for k, v in vars(params).items()},
        },
        "title_backtest": ch.summarise(rows, leader_rate),
        "limitations": LIMITATIONS,
    }
    return {"next": next_doc, "title": title_doc, "review": review, "card": card}
