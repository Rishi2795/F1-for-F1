import math
from datetime import UTC, datetime, timedelta

from f1data.telemetry import N, fastest_clean_lap, resample_lap, sector_fractions

START = datetime(2026, 3, 1, 14, 0, 0, tzinfo=UTC)
LAP = 90.0


def rows(hz=4.0, speed=lambda f: 200 + 100 * math.sin(2 * math.pi * f)):
    """A car going round a circle at a steady angular rate, with sensors that depend on lap fraction."""
    loc, car = [], []
    for i in range(int(LAP * hz) + 1):
        t = i / hz
        f = t / LAP
        stamp = (START + timedelta(seconds=t)).isoformat()
        loc.append({"date": stamp, "x": 1000 * math.cos(2 * math.pi * f), "y": 1000 * math.sin(2 * math.pi * f)})
        car.append({"date": stamp, "speed": speed(f), "throttle": 100 if f < 0.5 else 0, "brake": 100 if f >= 0.9 else 0,
                    "n_gear": 5, "rpm": 11000, "drs": 12 if 0.2 < f < 0.3 else 0})
    return loc, car


def test_channels_are_laid_along_the_lap_at_evenly_spaced_points():
    out = resample_lap(*rows(), START, LAP)
    assert all(len(v) == N for v in out.values())
    k = N // 4  # a quarter of the way round: the speed peak of the sine
    assert abs(out["speed"][k] - 300) <= 2
    assert out["throttle"][10] == 100 and out["throttle"][N - 10] == 0
    assert out["brake"][N - 5] == 1 and out["brake"][10] == 0
    assert out["drs"][int(N * 0.25)] == 1 and out["drs"][int(N * 0.6)] == 0


def test_the_clock_adds_up_to_the_official_lap_time_and_never_runs_backwards():
    out = resample_lap(*rows(), START, LAP)
    assert out["t_ms"][0] == 0
    assert abs(out["t_ms"][-1] - LAP * 1000 * (N - 1) / N) < 700
    assert all(b >= a for a, b in zip(out["t_ms"], out["t_ms"][1:], strict=False))


def test_too_little_data_or_impossible_readings_give_nothing():
    loc, car = rows()
    assert resample_lap(loc[:50], car, START, LAP) is None
    assert resample_lap(loc, car[:50], START, LAP) is None
    assert resample_lap(*rows(speed=lambda f: 900), START, LAP) is None  # 900 km/h is a sensor fault
    assert resample_lap(*rows(speed=lambda f: 0), START, LAP) is None  # a car that never moved
    still = [dict(r, x=5.0, y=5.0) for r in loc]
    assert resample_lap(still, car, START, LAP) is None


def test_sectors_become_lap_fractions():
    t_ms = [round(i * LAP * 1000 / N) for i in range(N)]
    s = sector_fractions(t_ms, 30.0, 30.0)
    assert s == [0.333, 0.667]
    assert sector_fractions(t_ms, None, 30.0) is None
    assert sector_fractions(t_ms, 60.0, 40.0) is None  # past the end of the lap


def test_the_fastest_clean_lap_skips_pit_out_laps_and_other_drivers():
    laps = [
        {"driver_number": 1, "lap_duration": 80.0, "is_pit_out_lap": True, "date_start": "x"},
        {"driver_number": 1, "lap_duration": 82.0, "is_pit_out_lap": False, "date_start": "x"},
        {"driver_number": 1, "lap_duration": 83.0, "is_pit_out_lap": False, "date_start": "x"},
        {"driver_number": 1, "lap_duration": None, "is_pit_out_lap": False, "date_start": "x"},
        {"driver_number": 2, "lap_duration": 70.0, "is_pit_out_lap": False, "date_start": "x"},
    ]
    assert fastest_clean_lap(laps, 1)["lap_duration"] == 82.0
    assert fastest_clean_lap(laps, 9) is None
