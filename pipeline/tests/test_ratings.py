import math

import pytest
from f1data.ratings.data import RaceRecord, Starter
from f1data.ratings.evaluate import (
    START,
    TEST_SEASONS,
    Pair,
    calibration,
    fit_logistic,
    score,
    tune,
    walk_forward,
)
from f1data.ratings.lineage import REGULATION_CHANGES, lineage
from f1data.ratings.model import Params, RatingModel, sigmoid
from f1data.ratings.report import build_report

from tests.ratings_helpers import pearson, simulate

P = Params(k_driver=0.1, k_car=0.5, driver_carry=0.8, car_carry=0.6, reg_carry=0.2)


def race(season, rnd, order):
    """order: list of (code, team) in finishing order."""
    return RaceRecord(season, rnd, tuple(Starter(c, c, t, lineage(t), i + 1, True, i + 1) for i, (c, t) in enumerate(order)))


def test_sigmoid_is_symmetric_and_stable():
    assert sigmoid(0) == 0.5
    assert sigmoid(3) + sigmoid(-3) == pytest.approx(1)
    assert 0 < sigmoid(-800) < 1e-300 or sigmoid(-800) == 0.0  # no overflow
    assert sigmoid(800) == 1.0


def test_teammates_separate_driver_skill_from_car_strength():
    # Team A is always ahead of team B, and within each team the first driver beats the second.
    model = RatingModel(P)
    for rnd in range(1, 31):
        model.start_season(2021)
        model.update(race(2021, rnd, [("A1", "A"), ("A2", "A"), ("B1", "B"), ("B2", "B")]))
    assert model.car["A"] > model.car["B"]  # results against the other team move the car rating
    assert model.driver["A1"] > model.driver["A2"] and model.driver["B1"] > model.driver["B2"]  # teammate duels move skill
    assert model.driver["A1"] == pytest.approx(-model.driver["A2"])  # a duel is zero-sum
    # A2 beat both drivers of team B, so he must not be punished for being slower than his teammate alone
    assert model.strength(Starter("A2", "A2", "A", "A", 2, True, 2)) > model.strength(Starter("B1", "B1", "B", "B", 3, True, 3))


def test_retirements_do_not_move_any_rating():
    model = RatingModel(P)
    starters = tuple(Starter(f"D{i}", f"D{i}", f"T{i // 2}", f"T{i // 2}", i + 1, i < 3, i + 1) for i in range(6))
    model.update(RaceRecord(2021, 1, starters))  # only 3 classified: below the minimum, so nothing is learned
    assert model.driver == {} and model.car == {}


def test_season_rollover_shrinks_ratings_harder_when_the_rules_change():
    assert 2022 in REGULATION_CHANGES and 2023 not in REGULATION_CHANGES
    model = RatingModel(P)
    model.start_season(2021)
    model.car, model.driver = {"A": 1.0}, {"X": 1.0}
    model.start_season(2021)  # same season: no change
    assert model.car["A"] == 1.0
    model.start_season(2022)  # rules changed
    assert model.car["A"] == pytest.approx(P.reg_carry) and model.driver["X"] == pytest.approx(P.driver_carry)
    model.car = {"A": 1.0}
    model.start_season(2023)  # normal rollover
    assert model.car["A"] == pytest.approx(P.car_carry)


def test_team_lineage_follows_renames():
    assert lineage("Racing Point") == lineage("Aston Martin") == "Aston Martin"
    assert lineage("Alfa Romeo") == lineage("Kick Sauber") == lineage("Audi")
    assert lineage("Ferrari") == "Ferrari"  # unknown names map to themselves


def test_predictions_use_only_earlier_races():
    races, *_ = simulate(seasons=(2020, 2021, 2022), teams=6, races=8)
    full = walk_forward(races, P)
    cut = [r for r in races if (r.season, r.round) <= (2021, 4)]
    altered = cut + [
        RaceRecord(r.season, r.round, tuple(reversed(r.starters))) for r in races if (r.season, r.round) > (2021, 4)
    ]  # rewrite the FUTURE: the finishing order of every later race is reversed
    rewritten = walk_forward([*cut, *altered[len(cut):]], P)
    keep = [p for p in full.pairs if (p.season, p.round) <= (2021, 4)]
    assert len(keep) > 100
    assert keep == [p for p in rewritten.pairs if (p.season, p.round) <= (2021, 4)]


def test_recovers_known_skills_and_cars_from_simulated_races():
    races, skill, car = simulate(seed=11)
    run = walk_forward(races, Params(0.12, 0.6, 0.9, 0.6, 0.3), history=False)
    last = max(r.season for r in races)
    teams = {s.code: s.key for s in races[-1].starters}
    codes = sorted(skill)
    est_skill = [run.model.driver.get(c, 0.0) for c in codes]
    est_car = {t: run.model.car.get(t, 0.0) for t in set(teams.values())}
    true_car = [car[last][t] for t in sorted(est_car)]
    assert pearson(true_car, [est_car[t] for t in sorted(est_car)]) > 0.85  # cars are recovered well
    assert pearson([skill[c] for c in codes], est_skill) > 0.5  # skill is harder, but clearly recovered


def test_fit_logistic_recovers_the_weights_that_generated_the_data():
    import random

    rng = random.Random(3)
    true_w, rows = (1.5, -0.7), []
    while len(rows) < 4000:
        x = [rng.gauss(0, 1), rng.gauss(0, 1)]
        if rng.random() < sigmoid(sum(w * v for w, v in zip(true_w, x, strict=True))):
            rows.append(x)  # keep the pairs where the winner-first orientation happened
        else:
            rows.append([-v for v in x])  # otherwise the same comparison seen from the other side
    w = fit_logistic(rows)
    assert w[0] == pytest.approx(1.5, abs=0.2) and w[1] == pytest.approx(-0.7, abs=0.2)


def test_scoring_and_calibration_are_sane():
    pairs = [Pair(2024, 1, 2.0, 1, 5, 1.0), Pair(2024, 1, -1.0, 5, 1, -1.0)]
    perfect = score(pairs[:1], lambda p: 10.0)
    assert perfect["log_loss"] < 0.001 and perfect["accuracy"] == 1.0
    assert score(pairs, lambda p: 0.0)["log_loss"] == pytest.approx(math.log(2), abs=1e-3)
    assert score([], lambda p: 0.0)["pairs"] == 0
    bins = calibration(pairs, lambda p: p.rating_diff)
    assert sum(b["n"] for b in bins) == 4  # both orientations of both pairs
    assert all(0 <= b["predicted"] <= 1 and 0 <= b["observed"] <= 1 for b in bins)


def test_tuning_never_sees_the_test_seasons():
    races, *_ = simulate(seasons=(2020, 2021, 2022, 2023, 2024, 2025), teams=6, races=6)
    base, _ = tune(races)
    scrambled = [
        RaceRecord(r.season, r.round, tuple(reversed(r.starters))) if r.season in TEST_SEASONS else r for r in races
    ]  # wreck every TEST-season result
    after, _ = tune(scrambled)
    assert after == base


def test_report_has_everything_the_site_needs():
    races, *_ = simulate(seasons=(2020, 2021, 2022, 2023, 2024, 2025), teams=8, races=8)
    report = build_report(races)
    card, current = report["card"], report["current"]
    assert {"coin_flip", "grid_only", "recent_form", "grid_plus_form", "ratings_only", "ratings_plus_grid"} <= set(card["metrics"])
    assert card["metrics"]["coin_flip"]["log_loss"] == pytest.approx(math.log(2), abs=1e-3)
    assert card["metrics"]["ratings_only"]["log_loss"] < card["metrics"]["coin_flip"]["log_loss"]  # learned something
    assert [r["rank"] for r in current] == list(range(1, len(current) + 1))
    assert [r["overall"] for r in current] == sorted((r["overall"] for r in current), reverse=True)
    assert all(r["provisional"] is (r["races"] < 15) for r in current)
    assert all(len(v[0]) == 4 for v in report["history"].values())  # [season, round, driver, car]
    assert START.k_car > 0 and card["limitations"] and card["method"]
