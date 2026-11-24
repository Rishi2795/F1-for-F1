from f1data import metrics

from tests.helpers import lap


def test_build_stints_splits_on_stint_number_and_reads_tyre_age():
    laps = [lap(i, stint=1, compound="SOFT", life=i + 2) for i in range(1, 11)]
    laps += [lap(i, stint=2, compound="HARD", life=i - 10) for i in range(11, 31)]
    stints = metrics.build_stints(laps)
    assert [(s.compound, s.lap_start, s.lap_end, s.laps) for s in stints] == [
        ("SOFT", 1, 10, 10), ("HARD", 11, 30, 20)]
    assert stints[0].tyre_age_start == 2  # started on a 2-lap-old set
    assert stints[1].tyre_age_start == 0


def test_stint_with_unknown_compound_stays_unknown():
    stints = metrics.build_stints([lap(i, compound=None) for i in range(1, 6)])
    assert stints[0].compound is None


def test_clean_laps_exclude_pit_sc_first_lap_and_outliers():
    laps = [lap(1, 100.0)] + [lap(i, 90.0 + i * 0.01) for i in range(2, 30)]
    laps += [lap(30, 140.0, pin=True), lap(31, 130.0, pout=True), lap(32, 120.0, status="4"), lap(33, 99.0)]
    times = metrics.clean_lap_times(laps)
    assert 140.0 not in times and 130.0 not in times and 120.0 not in times
    assert 100.0 not in times  # lap 1
    assert 99.0 not in times  # slower than 107% of the median


def test_consistency_is_none_without_enough_clean_laps():
    assert metrics.consistency_index([lap(i) for i in range(1, 5)]) is None


def test_consistency_higher_for_steadier_driver():
    steady = [lap(i, 90.0 + (i % 2) * 0.05) for i in range(2, 40)]
    erratic = [lap(i, 90.0 + (i % 5) * 1.5) for i in range(2, 40)]
    assert metrics.consistency_index(steady) > metrics.consistency_index(erratic)


def test_track_status_laps():
    laps = [[lap(1, status="1"), lap(2, status="124"), lap(3, status="26"), lap(4, status="5")]]
    assert metrics.track_status_laps(laps) == (1, 1, True)
    assert metrics.track_status_laps([[]]) == (None, None, None)


def test_rule_based_metrics_return_none_instead_of_inventing():
    assert metrics.strategy_risk(None, 2, 1.5) is None
    assert metrics.strategy_simulation(2, 0, None) is None


def test_race_meta_tolerates_race_with_no_stint_changes():
    # 2021 Belgium style: nobody changed tyres -> used to crash (IndexError on an empty Counter)
    recipe, tags = metrics.derive_race_meta(["INTERMEDIATE"], 0, [3, 3], [0, 0], [0, 1])
    assert recipe.typical_stops == 0 and recipe.common_tyre_sequence == "INTERMEDIATE"
    recipe, tags = metrics.derive_race_meta(None, None, [], [], [])
    assert recipe.typical_stops is None and tags == []
