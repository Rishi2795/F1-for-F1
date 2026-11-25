import dataclasses

from f1data.build import RaceInputs, build_race
from f1data.derive import build_circuits, build_duels, build_excitement, count_overtakes, slugify
from f1data.export import Publisher
from f1data.models import RaceDoc, Stint

from tests.helpers import ENTRY, lap, result
from tests.predict_helpers import simulate_races


def stint(n, lap_start, lap_end, compound="MEDIUM"):
    return Stint(number=n, compound=compound, lap_start=lap_start, lap_end=lap_end, laps=lap_end - lap_start + 1)


def doc_with_positions(a, b, pits_a=()):
    """Two cars whose positions are given lap by lap; builds a minimal race document."""
    laps = {"AAA": [dataclasses.replace(lap(n), position=a[n - 1]) for n in range(1, len(a) + 1)], "BBB": [dataclasses.replace(lap(n), position=b[n - 1]) for n in range(1, len(b) + 1)]}
    from f1data.sources.tracinginsights import DriverLaps, RaceLaps

    race_laps = RaceLaps("e", "2024-03-02", len(a), {c: DriverLaps(c, i + 1, ls) for i, (c, ls) in enumerate(laps.items())}, {}, {})
    rows = [result("AAA", 1, 1, laps=len(a), number=1), result("BBB", 2, 2, laps=len(a), number=2)]
    doc = build_race(RaceInputs(ENTRY, rows, [], race_laps))
    drivers = [
        d.model_copy(update={"stints": [stint(1, 1, pits_a[0]), stint(2, pits_a[0] + 1, len(a))]}) if d.driver_code == "AAA" and pits_a else d
        for d in doc.drivers
    ]
    return doc.model_copy(update={"drivers": drivers})


def test_a_clean_pass_counts_and_a_pit_stop_swap_does_not():
    # AAA starts behind BBB and passes on lap 4
    passed = doc_with_positions([2, 2, 2, 1, 1, 1], [1, 1, 1, 2, 2, 2])
    assert count_overtakes(passed) == 1
    # the same swap, but AAA pitted on lap 3: that is a pit-cycle swap, not a pass
    pitted = doc_with_positions([2, 2, 2, 1, 1, 1], [1, 1, 1, 2, 2, 2], pits_a=(3,))
    assert count_overtakes(pitted) == 0
    assert count_overtakes(doc_with_positions([1, 1, 1], [2, 2, 2])) == 0


def test_slugs_are_stable_and_url_safe():
    assert slugify("Monte Carlo") == "monte-carlo" and slugify("São Paulo") == "s-o-paulo" and slugify("  Yas Island ") == "yas-island"


def publish_season(tmp_path, seasons=(2023, 2024)):
    """Write simulated races (5 teams of 2) as real published race documents."""
    pub = Publisher(tmp_path)
    races, *_ = simulate_races(seasons=seasons, teams=5, rounds=6)
    from f1data.models import Derived, DriverRace, Quality, WinningRecipe

    for r in races:
        grid_order = {s.code: i + 1 for i, s in enumerate(sorted(r.starters, key=lambda s: (s.grid or 99, s.code)))}
        drivers = []
        for s in r.starters:
            drivers.append(
                DriverRace(
                    driver_code=s.code, driver_number=1, driver_name=s.name, team=s.team, team_color="#fff", finish=s.finish,
                    classified=s.classified, status="Finished", points=0.0, laps_completed=50, grid=s.grid, pit_lane_start=False,
                    positions_gained=None, laps_available=False, stops=1, stops_official=None, tyre_sequence=["MEDIUM", "HARD"],
                    stints=None, longest_stint=None, consistency_index=None, strategy_risk=None, strategy_simulation=None,
                    median_lap_s=90.0 + (s.pace_gap or 0.0), quali_position=grid_order[s.code], quali_gap_pct=(grid_order[s.code] - 1) * 0.1,
                )
            )
        drivers.sort(key=lambda d: (d.finish is None, d.finish or 0))
        doc = RaceDoc(
            season=r.season, round=r.round, event_name=r.event, location="Testville", country="T", date=r.date, winner=None,
            drivers=drivers, derived=Derived(winning_recipe=WinningRecipe(typical_stops=1, common_tyre_sequence=None, avg_longest_stint=None), style_profile=[], total_laps=50, safety_car_laps=0, vsc_laps=0, red_flag=False),
            weather=None, quality=Quality(status="ok"),
        )
        pub.publish_race(doc)
    return pub


def test_excitement_is_scored_for_every_race_between_0_and_10(tmp_path):
    pub = publish_season(tmp_path)
    assert build_excitement(pub) == 12
    scores = [pub.load_race(2024, n).excitement.score for n in range(1, 7)]
    assert all(0 <= s <= 10 for s in scores) and len(set(scores)) > 1  # relative to the other races, so they differ


def test_duels_compare_teammates_and_never_exceed_the_races_run(tmp_path):
    pub = publish_season(tmp_path)
    assert build_duels(pub) == 10  # 5 teams x 2 seasons
    from f1data.models import DuelsDoc

    doc = DuelsDoc.model_validate_json((tmp_path / "duels" / "2024.json").read_text())
    assert len(doc.duels) == 5
    for d in doc.duels:
        assert d.races == 6 and d.qualifying.races == 6 and d.qualifying.a + d.qualifying.b <= 6
        assert d.race.a + d.race.b <= d.race.races
        assert d.pace_gap_s is not None
    assert pub._derived_problems() == []


def test_circuits_summarise_every_visit(tmp_path):
    pub = publish_season(tmp_path)
    build_excitement(pub)
    assert build_circuits(pub) == 1
    from f1data.models import CircuitDoc

    c = CircuitDoc.model_validate_json((tmp_path / "circuits" / "testville.json").read_text())
    assert len(c.races) == 12 and 0 < c.pole_races <= 12 and 0 <= c.pole_wins <= c.pole_races
    assert c.winners_by_driver and c.avg_retirements >= 0 and c.overtaking_rank in (None, 1)


def test_validation_flags_impossible_derived_values(tmp_path):
    pub = publish_season(tmp_path, seasons=(2024,))
    doc = pub.load_race(2024, 1)
    bad = doc.model_copy(update={"drivers": [doc.drivers[0].model_copy(update={"quali_gap_pct": -1.0}), *doc.drivers[1:]]})
    pub.write_race(bad)
    assert any("faster than the pole lap" in p for p in pub._derived_problems())


def test_team_pace_ranks_the_cars_and_compares_halves_of_the_season(tmp_path):
    from f1data.derive import build_team_pace
    from f1data.models import TeamPaceDoc

    pub = publish_season(tmp_path, seasons=(2024,))
    assert build_team_pace(pub) == 1
    doc = TeamPaceDoc.model_validate_json((tmp_path / "teampace" / "2024.json").read_text())
    assert len(doc.rounds) == 6 and len(doc.teams) == 5
    assert doc.teams[0].avg_gap_pct <= doc.teams[-1].avg_gap_pct and doc.teams[0].avg_gap_pct >= 0
    assert all(r.gaps and min(r.gaps.values()) == 0 for r in doc.rounds)  # the quickest car is the reference
    assert doc.teams[0].first_half_pct is not None and doc.teams[0].second_half_pct is not None
