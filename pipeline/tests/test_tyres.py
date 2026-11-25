import dataclasses
import random

from f1data import tyres
from f1data.sources.tracinginsights import Lap


def stint_laps(code, compound, first_lap, n, base, offset, wear, fuel, rng, stint_no):
    """Laps generated from the model's own equation, so the fit has a known right answer."""
    out = []
    for age in range(1, n + 1):
        lap_no = first_lap + age - 1
        t = base + offset + wear * age + fuel * lap_no + rng.gauss(0, 0.05)
        out.append(
            Lap(lap=lap_no, time_s=t, compound=compound, stint=stint_no, tyre_life=age, fresh=True, position=1,
                track_status="1", pit_in=False, pit_out=False, deleted=False, team="T", air_temp=25.0,
                track_temp=40.0, humidity=50.0, rainfall=False)
        )
    return out


def make_race(wear_hard=0.04, wear_soft=0.10, soft_offset=-0.4, fuel=-0.05, seed=1):
    rng = random.Random(seed)
    laps = {}
    for i in range(10):
        code = f"D{i}"
        stop = 12 + 3 * i  # drivers pit at different laps, so lap number and tyre age separate
        first = "SOFT" if i % 2 else "HARD"
        second = "HARD" if i % 2 else "SOFT"
        rows = []
        for no, (comp, start, n) in enumerate(((first, 1, stop), (second, stop + 1, 50 - stop)), start=1):
            offset = soft_offset if comp == "SOFT" else 0.0
            wear = wear_soft if comp == "SOFT" else wear_hard
            rows += stint_laps(code, comp, start, n, 90 + i * 0.2, offset, wear, fuel, rng, no)
        # a pit-in and pit-out lap around the stop, so the model can price a stop
        for j, lap in enumerate(rows):
            if lap.lap == stop:
                rows[j] = dataclasses.replace(lap, pit_in=True, time_s=lap.time_s + 12)
            if lap.lap == stop + 1:
                rows[j] = dataclasses.replace(lap, pit_out=True, time_s=lap.time_s + 12)
        laps[code] = rows
    return laps


def test_the_fit_recovers_fuel_burn_wear_and_compound_pace():
    fitted = tyres.fit(make_race())
    assert fitted is not None
    model, max_age = fitted
    by = {c.compound: c for c in model.compounds}
    assert abs(model.fuel_s_per_lap - (-0.05)) < 0.02
    assert abs(by["HARD"].wear_s_per_lap - 0.04) < 0.02 and abs(by["SOFT"].wear_s_per_lap - 0.10) < 0.03
    assert by["SOFT"].pace_offset_s < by["HARD"].pace_offset_s  # the softer tyre is quicker at equal age
    assert 15 < model.pit_loss_s < 30 and max_age["HARD"] > 20


def test_a_race_where_the_data_says_soft_is_slower_than_hard_is_not_modelled():
    assert tyres.fit(make_race(soft_offset=+0.6)) is None  # physically wrong, so we publish nothing


def test_cars_getting_slower_with_fuel_burn_is_rejected():
    assert tyres.fit(make_race(fuel=+0.05)) is None


def test_too_little_data_gives_no_model():
    assert tyres.fit({"D0": make_race()["D0"]}) is None


def test_the_what_if_prefers_the_cheaper_plan_and_never_beats_itself():
    from f1data.models import Stint

    model, max_age = tyres.fit(make_race())
    actual = [Stint(number=1, compound="SOFT", lap_start=1, lap_end=40, laps=40), Stint(number=2, compound="HARD", lap_start=41, lap_end=50, laps=10)]
    best_already = [Stint(number=1, compound="HARD", lap_start=1, lap_end=25, laps=25), Stint(number=2, compound="SOFT", lap_start=26, lap_end=50, laps=25)]
    lab = tyres.strategy_lab(model, max_age, [("AAA", actual), ("BBB", best_already), ("CCC", [])], 50)
    by = {d.driver_code: d for d in lab}
    assert "CCC" not in by  # no stints: nothing to compare
    assert by["AAA"].options and all(o.delta_s < 0 for o in by["AAA"].options)  # a 40-lap soft stint is costly
    assert len({o.stops for o in by["AAA"].options}) == len(by["AAA"].options)  # one option per stop count
    assert all(o.delta_s < 0 for o in by["BBB"].options)
