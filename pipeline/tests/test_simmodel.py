"""The simulator model must recover tyre and fuel effects that were planted in synthetic races."""

import json
import random

import numpy as np
from f1data import simmodel
from f1data.simmodel import Columns, RaceInfo, Row, decompose, fit, prepare

TRUE = {"off_SOFT": -0.4, "off_HARD": 0.5, "wear": {"SOFT": 0.12, "MEDIUM": 0.07, "HARD": 0.04}, "fuel": -3.0}


def synthetic(seed: int = 3) -> tuple[list[RaceInfo], list[Row]]:
    rng = random.Random(seed)
    races, rows = [], []
    for race in range(8):
        total = 56
        races.append(RaceInfo(2024, race + 1, "alpha" if race % 2 else "beta", "GP", "Loc", "C", total, False, [35.0]))
        for d in range(16):
            skill = rng.uniform(-1.0, 1.0)  # car and driver pace: must cancel
            plan = rng.choice([("SOFT", 14, "HARD"), ("MEDIUM", 20, "HARD"), ("HARD", 26, "MEDIUM")])
            for lap in range(3, total + 1):
                first = lap <= plan[1] + 3
                compound = plan[0] if first else plan[2]
                age = lap if first else lap - (plan[1] + 3)
                t = 90 + skill + TRUE["wear"][compound] * age + TRUE["fuel"] * lap / total
                t += {"SOFT": TRUE["off_SOFT"], "HARD": TRUE["off_HARD"]}.get(compound, 0.0)
                t += 0.4 * np.sin(lap / 7.0) + rng.gauss(0, 0.12)  # track evolution shared by everyone, plus noise
                rows.append(Row(race, lap, f"D{d}", f"T{d % 8}", compound, age, lap / total, 35.0, t))
    return races, rows


def test_recovers_compound_offsets_wear_and_fuel():
    races, rows = synthetic()
    cols = Columns(["alpha", "beta"])
    x, y = prepare(rows, races, cols, True)
    beta = fit(x, y, cols, True, scale=10.0)
    g = {n: beta[i] for i, n in enumerate(cols.names[: cols.global_count])}
    assert abs(g["off_SOFT"] - TRUE["off_SOFT"]) < 0.15
    assert abs(g["off_HARD"] - TRUE["off_HARD"]) < 0.15
    for c, w in TRUE["wear"].items():
        assert abs(g[f"wear_{c}"] / 10.0 - w) < 0.03
    _, _, fuel = decompose(rows, races, cols, beta)
    assert -3.8 < fuel < -2.2


def test_a_faster_car_shows_as_a_lower_pace_intercept():
    races, rows = synthetic()
    cols = Columns(["alpha", "beta"])
    x, y = prepare(rows, races, cols, True)
    beta = fit(x, y, cols, True, scale=10.0)
    inter, _, _ = decompose(rows, races, cols, beta)
    values = [v for v, _, _ in inter.values()]
    assert max(values) - min(values) > 1.0  # the planted +/-1 s spread of car pace is still there


def test_clean_laps_drop_pit_laps_and_slow_laps():
    from f1data.sources.tracinginsights import Lap

    def lap(n, t, **kw):
        base = dict(lap=n, time_s=t, compound="MEDIUM", stint=1, tyre_life=n, fresh=True, position=1, track_status="1",
                    pit_in=False, pit_out=False, deleted=False, team="T", air_temp=20.0, track_temp=30.0, humidity=50.0, rainfall=False)
        return Lap(**{**base, **kw})

    laps = [lap(n, 90.0 + n * 0.01) for n in range(3, 20)]
    laps += [lap(20, 90.0, pit_in=True), lap(21, 140.0), lap(22, 90.0, track_status="4"), lap(23, 90.0, deleted=True)]
    kept = simmodel.clean_laps(laps)
    assert {k.lap for k in kept} == set(range(3, 20))


def good_doc():
    return {
        "global": {"offsets": {"SOFT": -0.1, "MEDIUM": 0, "HARD": 0.2}, "wear_s_per_lap": {"SOFT": 0.08, "MEDIUM": 0.07, "HARD": 0.05}, "fuel_total_s": -3.0},
        "circuits": [{"slug": "x", "base_lap_s": 90, "pit_loss_s": 22, "laps": 55, "sc_prob": 0.5, "vsc_prob": 0.2, "rain_prob": 0.1, "red_prob": 0.05,
                      "max_age": {"SOFT": 20, "MEDIUM": 25, "HARD": 35}}],
    }


def test_the_data_gate_accepts_a_good_model_and_rejects_nonsense():
    assert simmodel.problems(json.dumps(good_doc())) == []
    bad = good_doc()
    bad["circuits"][0]["base_lap_s"] = 9
    bad["circuits"][0]["sc_prob"] = 1.4
    bad["global"]["fuel_total_s"] = -40
    found = simmodel.problems(json.dumps(bad))
    assert len(found) == 3
    assert simmodel.problems("not json") == ["simulator/model.json: not valid JSON"]


def test_a_refit_on_much_less_data_does_not_replace_the_published_model(tmp_path):
    path = tmp_path / "model.json"
    assert simmodel.enough_data(path, {"card": {"laps": 10}})  # nothing published yet
    path.write_text(json.dumps({"card": {"laps": 80000}}))
    assert simmodel.enough_data(path, {"card": {"laps": 85000}})
    assert not simmodel.enough_data(path, {"card": {"laps": 30000}})
