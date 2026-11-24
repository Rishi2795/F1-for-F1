"""Assemble everything the site publishes about the ratings: current values, history and the model card."""

from __future__ import annotations

import math

from .data import RaceRecord
from .evaluate import (
    TEST_SEASONS,
    TUNE_SEASONS,
    Scorer,
    Snapshot,
    calibration,
    choose_grid_transform,
    fit_logistic,
    score,
    tune,
    walk_forward,
)
from .model import BASE, SCALE

PROVISIONAL_BELOW = 15  # races of data before a rating stops being flagged "provisional"

METHOD = [
    "Each driver has a skill and each car a strength; pace = skill + car.",
    "A race is read as head-to-head results between every pair of classified finishers.",
    "Teammates share a car: teammate results move driver skill, results against other teams move car strength.",
    "Ratings update after every race and shrink at each season boundary, harder when the rules change (2022, 2026).",
]

LIMITATIONS = [
    "Ratings describe finishing order, not outright pace: strategy, safety cars and reliability are folded in.",
    "No uncertainty interval yet; a rating is flagged provisional until a driver has 15 races in the data.",
    "Driver skill is relative to teammates (and earlier teams, through transfers), so compare within an era.",
    "Team lineage (e.g. Alfa Romeo to Sauber to Audi) is an assumption; it only sets car-strength carry-over.",
    "Only 2020 onward is used: 2020 trains the model, 2021-2023 tune it, 2024 onward tests it.",
]


def _winner_pick(snapshots: list[Snapshot], weights: list[float], transform: str) -> dict[str, dict[str, float]]:
    """How often each rule names the actual winner BEFORE the race, over the TEST races."""
    races = [s for s in snapshots if s.season in TEST_SEASONS and s.winner]
    def front(s: Snapshot, c: str) -> float:
        """Higher = better grid slot, on the same scale the model was fitted with."""
        return -math.log(s.grid[c]) if transform == "log" else -float(s.grid[c])

    pickers = {
        "pole_sitter": lambda s: min(s.grid, key=lambda c: s.grid[c]),
        "best_rating": lambda s: max(s.strength, key=lambda c: s.strength[c]),
        "ratings_plus_grid": lambda s: max(
            s.strength, key=lambda c: weights[0] * s.strength[c] + weights[1] * front(s, c)
        ),
    }
    out = {}
    for name, pick in pickers.items():
        correct = sum(1 for s in races if pick(s) == s.winner)
        accuracy = round(correct / len(races), 4) if races else 0.0
        out[name] = {"correct": correct, "races": len(races), "accuracy": accuracy}
    return out


def build_report(races: list[RaceRecord]) -> dict:
    params, search = tune(races)
    run = walk_forward(races, params, history=True)
    tune_pairs = [p for p in run.pairs if p.season in TUNE_SEASONS]
    test_pairs = [p for p in run.pairs if p.season in TEST_SEASONS]
    transform, grid_cv = choose_grid_transform(tune_pairs)  # chosen on TUNE seasons only, used for every grid model
    grid = lambda p: p.grid_feature(transform)  # noqa: E731

    # Baselines and the combined models are fitted on the TUNE seasons only.
    w_grid = fit_logistic([[grid(p)] for p in tune_pairs])
    w_form = fit_logistic([[p.form_diff] for p in tune_pairs])
    w_grid_form = fit_logistic([[grid(p), p.form_diff] for p in tune_pairs])
    w_rating = fit_logistic([[p.rating_diff] for p in tune_pairs])
    w_rating_grid = fit_logistic([[p.rating_diff, grid(p)] for p in tune_pairs])
    w_all = fit_logistic([[p.rating_diff, grid(p), p.form_diff] for p in tune_pairs])
    scorers: dict[str, Scorer] = {
        "coin_flip": lambda p: 0.0,
        "grid_only": lambda p: w_grid[0] * grid(p),
        "recent_form": lambda p: w_form[0] * p.form_diff,
        "grid_plus_form": lambda p: w_grid_form[0] * grid(p) + w_grid_form[1] * p.form_diff,
        "ratings_only": lambda p: w_rating[0] * p.rating_diff,
        "ratings_plus_grid": lambda p: w_rating_grid[0] * p.rating_diff + w_rating_grid[1] * grid(p),
        "ratings_grid_form": lambda p: w_all[0] * p.rating_diff + w_all[1] * grid(p) + w_all[2] * p.form_diff,
    }
    metrics = {name: score(test_pairs, z) for name, z in scorers.items()}
    by_season = {}
    for season in TEST_SEASONS:
        pairs = [p for p in test_pairs if p.season == season]
        if pairs:
            by_season[str(season)] = {n: score(pairs, z) for n, z in scorers.items() if n != "coin_flip"}

    # Current ratings: everyone who raced in the latest season, as of the latest race.
    last = races[-1]
    season_starters = {s.code: s for r in races if r.season == last.season for s in r.starters}
    races_per_driver: dict[str, int] = {}
    for r in races:
        for s in r.starters:
            races_per_driver[s.code] = races_per_driver.get(s.code, 0) + 1
    mean_car = run.model.field_mean_car(last.starters)
    current = []
    for code, s in season_starters.items():
        skill, car = run.model.driver.get(code, 0.0), run.model.car.get(s.key, 0.0) - mean_car
        current.append(
            {
                "code": code,
                "name": s.name,
                "team": s.team,
                "overall": run.model.elo(skill + car),
                "driver": run.model.elo(skill),
                "car": run.model.elo(car),
                "races": races_per_driver[code],
                "provisional": races_per_driver[code] < PROVISIONAL_BELOW,
            }
        )
    current.sort(key=lambda row: -row["overall"])
    for rank, row in enumerate(current, start=1):
        row["rank"] = rank

    baseline = metrics["grid_plus_form"]["log_loss"]
    card = {
        "version": "ratings-v1",
        "as_of": {"season": last.season, "round": last.round},
        "scale": {"base": BASE, "elo_points_per_log_odds": round(SCALE, 2), "meaning": "400 points = 10:1 odds"},
        "method": METHOD,
        "params": {k: getattr(params, k) for k in ("k_driver", "k_car", "driver_carry", "car_carry", "reg_carry")},
        "tuning": {
            "seasons": list(TUNE_SEASONS),
            **search,
            "grid_feature": transform,
            "grid_feature_cv_log_loss": grid_cv,
        },
        "test": {
            "seasons": [s for s in TEST_SEASONS if str(s) in by_season],
            "pairs": len(test_pairs),
            "races": sum(1 for s in run.snapshots if s.season in TEST_SEASONS and s.winner),
        },
        "metrics": metrics,
        "by_season": by_season,
        "winner_pick": _winner_pick(run.snapshots, w_rating_grid, transform),
        "calibration": calibration(test_pairs, scorers["ratings_plus_grid"]),
        "fitted_weights": {
            "ratings_only": [round(x, 4) for x in w_rating],
            "grid_only": [round(x, 4) for x in w_grid],
            "ratings_plus_grid": [round(x, 4) for x in w_rating_grid],
            "ratings_grid_form": [round(x, 4) for x in w_all],
        },
        "log_loss_gain_vs_grid_plus_form": (
            round((baseline - metrics["ratings_grid_form"]["log_loss"]) / baseline, 4) if baseline > 0 else None
        ),
        "limitations": LIMITATIONS,
    }
    return {"current": current, "history": run.history, "card": card}
