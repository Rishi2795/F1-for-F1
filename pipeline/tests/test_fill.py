from f1data import metrics
from f1data.build import RaceInputs, build_race
from f1data.sources.openf1 import OpenF1Stint
from f1data.sources.tracinginsights import DriverLaps, RaceLaps

from tests.helpers import ENTRY, STOP, lap, result


def miami_like(first_unknown=24, medium_end=32, total=57):
    """No tyre data for laps 1..24 (stint/compound/age all missing), then MEDIUM, then HARD."""
    laps = [lap(i, compound=None, stint=None, life=None) for i in range(1, first_unknown + 1)]
    laps += [lap(i, compound="MEDIUM", stint=1, life=i - first_unknown) for i in range(first_unknown + 1, medium_end + 1)]
    laps += [lap(i, compound="HARD", stint=2, life=i - medium_end) for i in range(medium_end + 1, total + 1)]
    return laps


def summary(stints):
    return [(s.compound, s.lap_start, s.lap_end, s.compound_source) for s in stints]


def test_unlabelled_laps_join_the_next_stint_when_no_pit_stop_separates_them():
    stints = metrics.build_stints(miami_like(), official_stop_laps=[29])
    assert summary(stints) == [("MEDIUM", 1, 32, "continuity"), ("HARD", 33, 57, "timing")]
    assert len(stints) - 1 == 1  # now agrees with the single official stop (it used to say 2 stops)


def test_nothing_is_inferred_without_official_pit_data():
    stints = metrics.build_stints(miami_like(), official_stop_laps=None)
    assert [s.compound for s in stints] == [None, "MEDIUM", "HARD"]


def test_a_real_pit_stop_at_the_boundary_blocks_the_merge():
    stints = metrics.build_stints(miami_like(), official_stop_laps=[24])  # stop on the in-lap
    assert [s.compound for s in stints] == [None, "MEDIUM", "HARD"]
    stints = metrics.build_stints(miami_like(), official_stop_laps=[25])  # one lap off still counts
    assert [s.compound for s in stints] == [None, "MEDIUM", "HARD"]


def test_tyre_age_restarting_means_a_different_set_so_no_merge():
    laps = [lap(i, compound=None, stint=1, life=i + 10) for i in range(1, 21)]  # age reaches 30
    laps += [lap(i, compound="HARD", stint=2, life=i - 20) for i in range(21, 41)]  # fresh set, age 1
    assert [s.compound for s in metrics.build_stints(laps, official_stop_laps=[])] == [None, "HARD"]


def test_unknown_after_a_genuine_stop_stays_unknown_not_guessed():
    laps = [lap(i, compound="SOFT", stint=1) for i in range(1, 21)]
    laps += [lap(i, compound=None, stint=2, life=i - 20) for i in range(21, 41)]
    stints = metrics.build_stints(laps, official_stop_laps=[20])
    assert [s.compound for s in stints] == ["SOFT", None] and stints[1].compound_source is None


def test_two_adjacent_unknown_or_known_segments_are_left_alone():
    laps = [lap(i, compound="SOFT", stint=1) for i in range(1, 11)] + [lap(i, compound="HARD", stint=2) for i in range(11, 21)]
    assert len(metrics.build_stints(laps, official_stop_laps=[])) == 2  # compound change proves a stop


def ref(num, start, end, compound):
    return OpenF1Stint(driver_number=1, stint_number=num, lap_start=start, lap_end=end, compound=compound, tyre_age_at_start=0)


def unknown_stints():
    laps = [lap(i, compound="SOFT", stint=1) for i in range(1, 21)] + [lap(i, compound=None, stint=2, life=i - 20) for i in range(21, 41)]
    return metrics.build_stints(laps, official_stop_laps=[20])


def test_openf1_fills_only_the_unknown_stint_and_labels_the_source():
    stints, filled = metrics.fill_compounds_from_openf1(unknown_stints(), [ref(1, 1, 20, "SOFT"), ref(2, 21, 40, "HARD")])
    assert filled == 1 and summary(stints) == [("SOFT", 1, 20, "timing"), ("HARD", 21, 40, "openf1")]


def test_openf1_never_overwrites_a_known_compound():
    stints, _ = metrics.fill_compounds_from_openf1(unknown_stints(), [ref(1, 1, 20, "HARD"), ref(2, 21, 40, "MEDIUM")])
    assert stints[0].compound == "SOFT" and stints[0].compound_source == "timing"


def test_openf1_is_used_by_stint_order_so_a_one_lap_boundary_shift_does_not_matter():
    # After red flags OpenF1's lap numbers are shifted by a lap; the compound order is what counts.
    stints, filled = metrics.fill_compounds_from_openf1(unknown_stints(), [ref(1, 1, 19, "SOFT"), ref(2, 20, 39, "HARD")])
    assert filled == 1 and stints[1].compound == "HARD"


def test_openf1_ignored_when_stint_counts_differ_or_compound_unknown():
    stints, filled = metrics.fill_compounds_from_openf1(unknown_stints(), [ref(1, 1, 20, "SOFT"), ref(2, 21, 30, "HARD"), ref(3, 31, 40, "HARD")])
    assert filled == 0 and stints[1].compound is None
    stints, filled = metrics.fill_compounds_from_openf1(unknown_stints(), [ref(1, 1, 20, "SOFT"), ref(2, 21, 40, None)])
    assert filled == 0


def test_build_race_reports_what_was_inferred_and_agrees_with_official_stops():
    laps = RaceLaps("T", "2024-03-02", 57, {"VER": DriverLaps("VER", 1, miami_like())}, {}, {})
    doc = build_race(RaceInputs(ENTRY, [result("VER", laps=57)], [STOP.__class__("ver", 1, 29, 22.0)], laps))
    d = doc.drivers[0]
    assert d.stops == 1 and d.stops_official == 1 and d.tyre_sequence == ["MEDIUM", "HARD"]
    assert doc.quality.status == "ok" and doc.quality.warnings == []
    assert any("tyre continuity" in n for n in doc.quality.notes)


def test_crosscheck_counts_agreement_and_never_changes_data():
    stints = metrics.build_stints(
        [lap(i, compound="SOFT", stint=1) for i in range(1, 21)] + [lap(i, compound="HARD", stint=2) for i in range(21, 41)],
        official_stop_laps=[20],
    )
    before = [s.model_copy() for s in stints]
    assert metrics.crosscheck_with_openf1(stints, [ref(1, 1, 20, "SOFT"), ref(2, 21, 40, "HARD")]) == (2, 2)
    assert metrics.crosscheck_with_openf1(stints, [ref(1, 1, 20, "SOFT"), ref(2, 21, 40, "MEDIUM")]) == (2, 1)
    assert metrics.crosscheck_with_openf1(stints, []) == (0, 0)
    assert stints == before


def test_build_flags_a_race_where_sources_disagree():
    laps = RaceLaps("T", "2024-03-02", 40, {}, {}, {})
    rows, of1 = [], {}
    for n in range(1, 6):
        code = f"D{n:02d}"
        stints_laps = [lap(i, compound="SOFT", stint=1) for i in range(1, 21)] + [lap(i, compound="HARD", stint=2) for i in range(21, 41)]
        laps.drivers[code] = DriverLaps(code, n, stints_laps)
        rows.append(result(code, finish=n, grid=n, number=n, laps=40))
        # OpenF1 disagrees on the second stint for every driver
        of1[n] = [OpenF1Stint(n, 1, 1, 20, "SOFT", 0), OpenF1Stint(n, 2, 21, 40, "MEDIUM", 0)]
    doc = build_race(RaceInputs(ENTRY, rows, [], laps, of1))
    assert any(w.startswith("compound_sources_disagree:5/10") for w in doc.quality.warnings)
    assert any("5/10 stint compounds agree" in n for n in doc.quality.notes)
    assert doc.drivers[0].stints[1].compound == "HARD"  # timing feed stays primary; nothing silently changed


def test_openf1_is_ignored_for_a_driver_when_its_stint_count_contradicts_the_official_stops():
    stints_laps = [lap(i, compound="SOFT", stint=1) for i in range(1, 21)] + [lap(i, compound=None, stint=2, life=i - 20) for i in range(21, 41)]
    laps = RaceLaps("T", "2024-03-02", 40, {"VER": DriverLaps("VER", 1, stints_laps)}, {}, {})
    stop = STOP.__class__("ver", 1, 20, 22.0)  # one official stop -> two stints
    extra_split = [OpenF1Stint(1, 1, 1, 20, "SOFT", 0), OpenF1Stint(1, 2, 21, 30, "HARD", 0), OpenF1Stint(1, 3, 31, 40, "HARD", 0)]
    doc = build_race(RaceInputs(ENTRY, [result("VER", laps=40)], [stop], laps, {1: extra_split}))
    assert doc.drivers[0].stints[1].compound is None and doc.quality.status == "partial"  # not filled from a contradicting source
    consistent = [OpenF1Stint(1, 1, 1, 20, "SOFT", 0), OpenF1Stint(1, 2, 21, 40, "HARD", 0)]
    doc = build_race(RaceInputs(ENTRY, [result("VER", laps=40)], [stop], laps, {1: consistent}))
    assert doc.drivers[0].stints[1].compound == "HARD" and doc.drivers[0].stints[1].compound_source == "openf1"
