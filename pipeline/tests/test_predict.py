import math
import random

import pytest
from f1data.predict import championship as ch
from f1data.predict import evaluate as ev
from f1data.predict import plackett
from f1data.predict.state import Tracker
from f1data.ratings.evaluate import START

from tests.predict_helpers import simulate_races


def test_finishing_order_puts_retirements_last_and_counts_finishers():
    rng = random.Random(1)
    order, finished = plackett.finishing_order([0.0, 1.0, 2.0, 3.0], [0.0, 1.0, 0.0, 0.0], rng)
    assert finished == 3 and order[-1] == 1 and sorted(order) == [0, 1, 2, 3]


def test_race_odds_are_proper_probabilities():
    odds = plackett.race_odds([2.0, 1.0, 0.0, -1.0, -2.0], [0.05] * 5, 4000, seed=7)
    assert sum(o["win"] for o in odds) == pytest.approx(1.0, abs=0.02)
    assert sum(o["podium"] for o in odds) == pytest.approx(3.0, abs=0.05)
    assert odds[0]["win"] > odds[1]["win"] > odds[4]["win"]
    assert all(0 <= o["dnf"] <= 0.2 for o in odds)
    assert odds[0]["exp_points"] > odds[4]["exp_points"]


def test_plackett_luce_recovers_known_strengths():
    rng = random.Random(5)
    truth = [1.5, 0.6]
    orders = []
    for _ in range(300):
        cars = [[rng.gauss(0, 1), rng.gauss(0, 1)] for _ in range(8)]
        ranked = sorted(cars, key=lambda f: sum(a * b for a, b in zip(truth, f, strict=True)) + plackett.gumbel(rng), reverse=True)
        orders.append(ranked)
    w = plackett.fit(orders, 2, l2=0.0005, iterations=400)
    assert w[0] == pytest.approx(1.5, abs=0.25) and w[1] == pytest.approx(0.6, abs=0.25)
    assert plackett.loglik(orders, w) > plackett.loglik(orders, [0.0, 0.0])


def test_features_never_see_the_race_they_describe():
    races, *_ = simulate_races(seasons=(2020, 2021), rounds=6)
    tracker = Tracker(START)
    seen = []
    for race in races[:8]:
        tracker.start_season(race.season)
        before = [(f.rating, f.pace, f.form, f.p_dnf) for f in tracker.features(race.starters, grid_known=False)]
        seen.append(before)
        tracker.learn(race)
    # the first race is predicted from nothing: every driver looks identical
    assert len({tuple(round(x, 9) for x in row) for row in seen[0]}) == 1
    # a rerun that only differs in the LAST race gives the same pre-race picture for every earlier race
    tracker2 = Tracker(START)
    for race, before in zip(races[:7], seen[:7], strict=True):
        tracker2.start_season(race.season)
        again = [(f.rating, f.pace, f.form, f.p_dnf) for f in tracker2.features(race.starters, grid_known=False)]
        assert again == before
        tracker2.learn(race)


def test_the_tracker_learns_who_is_fast_and_who_breaks():
    races, car, _ = simulate_races(seasons=(2020, 2021, 2022), rounds=10, dnf=0.02)
    tracker = Tracker(START)
    for race in races:
        tracker.start_season(race.season)
        tracker.learn(race)
    feats = {f.code: f for f in tracker.features(races[-1].starters, grid_known=False)}
    fastest = max(car, key=lambda t: car[t])
    slowest = min(car, key=lambda t: car[t])
    assert feats[f"D{fastest[1:]}0"].rating > feats[f"D{slowest[1:]}0"].rating
    assert feats[f"D{fastest[1:]}0"].pace > feats[f"D{slowest[1:]}0"].pace  # recent pace points the same way
    assert all(0.0 < f.p_dnf < 0.3 for f in feats.values())


def test_the_forecast_beats_a_random_pick_on_unseen_seasons(monkeypatch):
    monkeypatch.setattr(ev, "TRIALS", 400)
    monkeypatch.setattr(ev, "TUNE_SEASONS", (2021, 2022, 2023))
    monkeypatch.setattr(ev, "TEST_SEASONS", (2024,))
    races, *_ = simulate_races(seasons=(2020, 2021, 2022, 2023, 2024), teams=6, rounds=22)
    tl = ev.build_timeline(races, START)
    result = ev.evaluate(tl)
    best = result.metrics["ratings_pace_form"]
    assert best["winner_log_loss"] < result.uniform_log_loss - 0.1  # better than guessing
    assert result.metrics["everything_with_grid"]["winner_log_loss"] <= best["winner_log_loss"] + 0.05
    assert result.test_races == 22 and result.final_weights["ratings_pace_form"][0] > 0
    assert len(result.review) == 12 and all(1 <= r["winner_rank"] <= 12 for r in result.review)


def lineup(strengths):
    return [ch.Entry(f"D{i}", f"T{i // 2}", f"T{i // 2}", s, 0.05) for i, s in enumerate(strengths)]


def test_title_odds_add_up_and_a_decided_title_is_certain():
    points = {f"D{i}": 100.0 - 10 * i for i in range(4)}
    odds = ch.simulate_title(points, {}, lineup([0.5, 0.2, 0.0, -0.2]), 5, trials=600, seed=1, team_sigma=0.3, driver_sigma=0.1)
    assert sum(v["champion"] for v in odds["drivers"].values()) == pytest.approx(1.0)
    assert sum(v["top3"] for v in odds["drivers"].values()) == pytest.approx(3.0)
    decided = {"D0": 400.0, "D1": 100.0, "D2": 50.0, "D3": 0.0}
    odds = ch.simulate_title(decided, {}, lineup([-3, 3, 3, 3]), 2, trials=300, seed=2, team_sigma=0.5, driver_sigma=0.2)
    assert odds["drivers"]["D0"]["champion"] == 1.0  # nobody can catch up in two races


def test_with_no_races_left_the_standings_are_the_answer():
    points = {"D0": 50.0, "D1": 60.0, "D2": 10.0, "D3": 0.0}
    odds = ch.simulate_title(points, {"T0": 110.0, "T1": 10.0}, lineup([1, 1, 0, 0]), 0, trials=50, seed=4, team_sigma=0.4, driver_sigma=0.2)
    assert odds["drivers"]["D1"]["champion"] == 1.0 and odds["constructors"]["T0"]["champion"] == 1.0


def test_a_stronger_car_with_a_points_deficit_still_has_a_real_chance():
    points = {"D0": 100.0, "D1": 80.0}
    entries = [ch.Entry("D0", "T0", "T0", -0.5, 0.03), ch.Entry("D1", "T1", "T1", 1.5, 0.03)]
    odds = ch.simulate_title(points, {}, entries, 8, trials=800, seed=9, team_sigma=0.3, driver_sigma=0.1)
    assert 0.5 < odds["drivers"]["D1"]["champion"] < 1.0


def test_summarise_scores_a_title_forecast_against_a_simple_baseline():
    rows = [
        {"season": 2024, "round": r, "left": 24 - r, "actual": "A", "p_actual": p, "pick": "A", "leader": "A"}
        for r, p in ((1, 0.8), (10, 0.9), (22, 0.99))
    ]
    s = ch.summarise(rows, 0.8)
    assert s["forecasts"] == 3 and s["pick_correct"] == 1.0 and s["log_loss"] < -math.log(0.8)
    assert ch.summarise([])["forecasts"] == 0
