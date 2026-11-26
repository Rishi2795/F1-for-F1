import math

from f1data.maps import BOX, outline_from_samples, pick_lap
from f1data.models import LapDoc, LapDriver


def circle(n=400, radius=1000.0, cx=500.0, cy=-300.0):
    """A lap driven around a circle, starting at the right-hand side, anti-clockwise."""
    return [(cx + radius * math.cos(2 * math.pi * k / n), cy + radius * math.sin(2 * math.pi * k / n)) for k in range(n)]


def test_a_lap_becomes_a_closed_loop_of_evenly_spaced_points_inside_the_box():
    points, length = outline_from_samples(circle())
    assert len(points) == 240
    assert all(0 <= x <= BOX and 0 <= y <= BOX for x, y in points)
    steps = [math.dist(points[i], points[(i + 1) % 240]) for i in range(240)]
    assert max(steps) - min(steps) < 3  # evenly spaced, including the step that closes the loop
    assert abs(length - round(2 * math.pi * 1000 / 10)) <= 1  # tenths of a metre to metres


def test_the_circuit_is_not_mirrored_and_keeps_the_direction_of_travel():
    points, _ = outline_from_samples(circle())
    # anti-clockwise in the data (y up) is anti-clockwise on screen with y down only if y is flipped: the second
    # point is above the start (smaller y) when the car heads up the right-hand side.
    assert points[1][1] < points[0][1]


def test_too_few_samples_give_no_outline():
    assert outline_from_samples(circle(50)) is None
    assert outline_from_samples([]) is None


def drivers(code, times):
    return LapDriver(code=code, lap_times=times, gap=[0.0] * len(times), best_sectors=[None] * 3, top_speed_kph=300.0)


def test_the_chosen_lap_is_green_and_not_a_pit_lap():
    laps = 40
    status = ["G"] * laps
    status[9] = "SC"
    doc = LapDoc(season=2024, round=1, laps=laps, status=status, incidents=[], drivers=[drivers("AAA", [90.0] * laps)], undercuts=[])
    stints = {"AAA": [(1, 10), (11, 40)]}  # pitted on lap 10, so laps 10 and 11 are pit laps
    code, lap = pick_lap(doc, stints, ["AAA"])
    assert code == "AAA" and lap not in (10, 11) and status[lap - 1] == "G" and lap >= 10
    assert pick_lap(doc, stints, ["ZZZ"]) is None
