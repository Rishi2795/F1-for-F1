"""A real replay of the race: where every car was, and what it was doing, once a second.

OpenF1 publishes each car's position about 3.7 times a second and its sensors at about the same rate. For the newest
races we take the whole race, work out how far round the lap each car was (by projecting its position onto the circuit,
as a fraction of a lap), and put it on a one-second grid together with speed, throttle, brake, gear, RPM and DRS.

The website still takes the running order and the gaps from the lap timing, which is exact; this adds *where on the
track* each car was, which timing cannot tell. Anything the source does not have is left empty (null), never filled in.
The file records how its clock lines up with the race clock; if that cannot be established to within a few seconds, no
file is written and the site keeps its timing-only replay.
"""

from __future__ import annotations

import math
import re
import statistics
from bisect import bisect_right
from datetime import datetime, timedelta

from .errors import SourceUnavailable
from .export import Publisher, dumps, write_if_changed
from .logging_setup import get_logger
from .models import IncidentDoc, IncidentItem, LapDoc, ReplayDoc, ReplayDriver
from .sources.openf1 import OpenF1Source
from .telemetry import DRS_OPEN, fastest_clean_lap

log = get_logger("replay")
CHUNK = timedelta(minutes=30)  # one request per driver per 30 minutes of race
REF_POINTS = 600  # the circuit as a closed polyline of this many points
FRAC_UNITS = 10_000  # a lap is 0..9999
SEARCH_WINDOW = 0.05  # look this far (fraction of a lap) either side of where the car just was
FAR = 600.0  # a car further than this (tenths of a metre, so 60 m) from the track is not on it
GARAGE = 1500.0  # and further than this it is in the garage or off the circuit: no position
MAX_GAP_S = 3.0  # do not bridge a hole in the data longer than this
MAX_ALIGN_SPREAD_S = 3.0
MIN_COVERAGE = 0.5  # a driver whose position is known for less than half the race is left out


class Track:
    """The circuit as a closed polyline, with projection of a point to 'how far round the lap'."""

    def __init__(self, points: list[tuple[float, float]]) -> None:
        self.pts = points
        self.n = len(points)
        self.cum = [0.0]
        for a, b in zip(points, points[1:] + points[:1], strict=True):
            self.cum.append(self.cum[-1] + math.dist(a, b))
        self.total = self.cum[-1]

    def _nearest(self, x: float, y: float, segments) -> tuple[float, float]:
        best_d, best_f = math.inf, 0.0
        for i in segments:
            i %= self.n
            ax, ay = self.pts[i]
            bx, by = self.pts[(i + 1) % self.n]
            dx, dy = bx - ax, by - ay
            seg = dx * dx + dy * dy
            u = 0.0 if seg == 0 else max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / seg))
            d = math.hypot(x - (ax + u * dx), y - (ay + u * dy))
            if d < best_d:
                best_d, best_f = d, (self.cum[i] + u * math.sqrt(seg)) / self.total
        return best_f % 1.0, best_d

    def project(self, x: float, y: float, near: float | None = None) -> tuple[float, float]:
        """(fraction of a lap, distance from the track). With ``near`` only the stretch around it is searched, which
        keeps a car from snapping to a different part of the circuit that happens to pass close by."""
        if near is not None:
            centre = round(near * self.n)
            width = max(3, int(SEARCH_WINDOW * self.n))
            f, d = self._nearest(x, y, range(centre - width, centre + width + 1))
            if d <= FAR:
                return f, d
        return self._nearest(x, y, range(self.n))


def resample_closed(samples: list[tuple[float, float]], n: int = REF_POINTS) -> list[tuple[float, float]] | None:
    """One lap of positions as n points evenly spaced by distance (like the outline, but in raw coordinates)."""
    pts: list[tuple[float, float]] = []
    for p in samples:
        if not pts or math.dist(p, pts[-1]) > 1e-6:
            pts.append(p)
    if len(pts) < 120:
        return None
    pts.append(pts[0])
    cum = [0.0]
    for a, b in zip(pts, pts[1:], strict=False):
        cum.append(cum[-1] + math.dist(a, b))
    if cum[-1] <= 0:
        return None
    out: list[tuple[float, float]] = []
    j = 0
    for k in range(n):
        target = cum[-1] * k / n
        while j < len(cum) - 2 and cum[j + 1] < target:
            j += 1
        f = (target - cum[j]) / ((cum[j + 1] - cum[j]) or 1.0)
        out.append((pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f))
    return out


def _clock(rows: list[dict], t0: datetime) -> list[float]:
    return [(datetime.fromisoformat(str(r["date"])) - t0).total_seconds() for r in rows]


def fractions(track: Track, location: list[dict], t0: datetime) -> tuple[list[float], list[float | None]]:
    """(seconds, fraction of a lap) for every position row; None where the car is nowhere near the circuit."""
    rows = sorted((r for r in location if r.get("x") is not None and r.get("y") is not None and r.get("date")),
                  key=lambda r: r["date"])
    secs = _clock(rows, t0)
    out: list[float | None] = []
    near: float | None = None
    for r in rows:
        f, d = track.project(float(r["x"]), float(r["y"]), near)
        if d > GARAGE:
            out.append(None)
            near = None
        else:
            out.append(f)
            near = f
    return secs, out


def _gap_free(secs: list[float], t: float, i: int) -> bool:
    if 0 <= i < len(secs) and secs[i] == t:
        return True  # exactly on a sample
    return 0 <= i < len(secs) - 1 and secs[i + 1] - secs[i] <= MAX_GAP_S and secs[i] <= t <= secs[i + 1]


def grid_fraction(secs: list[float], fracs: list[float | None], n: int) -> list[int | None]:
    """The fraction of a lap at each whole second, interpolated round the line; None across holes in the data."""
    out: list[int | None] = []
    for t in range(n):
        i = bisect_right(secs, t) - 1
        if not _gap_free(secs, t, i) or fracs[i] is None:
            out.append(None)
            continue
        if secs[i] == t:
            out.append(int(fracs[i] * FRAC_UNITS) % FRAC_UNITS)
            continue
        if fracs[i + 1] is None:
            out.append(None)
            continue
        a, b = fracs[i], fracs[i + 1]
        step = ((b - a + 0.5) % 1.0) - 0.5  # the short way round
        k = (t - secs[i]) / ((secs[i + 1] - secs[i]) or 1.0)
        out.append(int(((a + step * k) % 1.0) * FRAC_UNITS) % FRAC_UNITS)
    return out


def grid_sensors(car: list[dict], t0: datetime, n: int) -> dict[str, list[int | None]]:
    rows = sorted((r for r in car if r.get("speed") is not None and r.get("date")), key=lambda r: r["date"])
    secs = _clock(rows, t0)
    cols: dict[str, list[int | None]] = {k: [] for k in ("speed", "throttle", "brake", "gear", "rpm", "drs")}
    for t in range(n):
        i = bisect_right(secs, t) - 1
        if not _gap_free(secs, t, i):
            for v in cols.values():
                v.append(None)
            continue
        a = rows[i]
        b = rows[i + 1] if i + 1 < len(rows) else a
        k = 0.0 if secs[i] == t or i + 1 >= len(rows) else (t - secs[i]) / ((secs[i + 1] - secs[i]) or 1.0)
        near = b if k >= 0.5 else a

        for key in ("speed", "throttle", "rpm"):
            x, y = float(a.get(key) or 0), float(b.get(key) or 0)
            cols[key].append(round(x + (y - x) * k))
        cols["brake"].append(1 if (near.get("brake") or 0) > 0 else 0)
        cols["gear"].append(int(near.get("n_gear") or 0))
        cols["drs"].append(1 if (near.get("drs") or 0) in DRS_OPEN else 0)
    return cols


def align(lap_doc: LapDoc, laps: list[dict], numbers: dict[str, int], t0: datetime) -> tuple[float, float] | None:
    """How the replay clock relates to the race clock: (offset, spread) so that replay_seconds = race_seconds + offset.

    Lap n of a car starts when its lap n-1 ends, which both sources record, so the difference between the two clocks is
    measured many times (every driver, every lap). It is the median; the spread is how far the
    worst tenth sit from it."""
    starts = {(lap["driver_number"], lap["lap_number"]): lap["date_start"] for lap in laps if lap.get("date_start")}
    diffs: list[float] = []
    for d in lap_doc.drivers:
        number = numbers.get(d.code)
        for n, end in enumerate(d.end, start=1):  # end of lap n
            if number is None or end is None:
                continue
            nxt = starts.get((number, n + 1))
            if nxt is not None:
                diffs.append((datetime.fromisoformat(str(nxt)) - t0).total_seconds() - end)
    if len(diffs) < 50:
        return None
    med = statistics.median(diffs)
    deviations = sorted(abs(x - med) for x in diffs)
    spread = deviations[int(0.9 * (len(deviations) - 1))]  # the 90th percentile: a few odd laps are fine, many are not
    return med, spread


def _chunks(start: datetime, end: datetime):
    t = start
    while t < end:
        yield t, min(t + CHUNK, end)
        t += CHUNK


def race_clock(
    openf1: OpenF1Source, season: int, rnd: int, date: str, numbers: dict[str, int], lap_doc: LapDoc
) -> tuple[int, list[dict], datetime, float] | None:
    """(session key, laps, replay start, offset) for a race, or None if the two clocks cannot be lined up."""
    key = openf1.race_session_key(season, date)
    if key is None:
        return None
    laps = openf1.session_laps(key)
    firsts = [
        datetime.fromisoformat(str(lap["date_start"]))
        for lap in laps
        if lap.get("lap_number") == 1 and lap.get("date_start")
    ]
    if not firsts:
        return None
    t0 = sorted(firsts)[len(firsts) // 2] - timedelta(seconds=20)
    aligned = align(lap_doc, laps, numbers, t0)
    if aligned is None or aligned[1] > MAX_ALIGN_SPREAD_S:
        log.warning("%d R%d: replay clock cannot be matched to the race clock (%s)", season, rnd, aligned)
        return None
    return key, laps, t0, aligned[0]


_CODE = re.compile(r"\(([A-Z]{3})\)")
_KINDS = (  # first match wins; anything else (track limits, blue flags, pit exit, weather) is not part of the story
    ("red_flag", (" RED FLAG", "RACE SUSPENDED")),  # leading space: "CHEQUERED FLAG" ends in "RED FLAG"
    ("vsc", ("VIRTUAL SAFETY CAR",)),
    ("safety_car", ("SAFETY CAR DEPLOYED", "SAFETY CAR IN THIS LAP")),
    ("collision", ("COLLISION",)),
    ("stopped", ("STOPPED", "SPUN", "SPIN", "CRASH", "RETIRED", "OFF TRACK")),
    ("penalty", ("PENALTY", "DRIVE THROUGH", "DRIVE-THROUGH")),
    ("debris", ("DEBRIS",)),
    ("incident", ("INCIDENT INVOLVING",)),
)
_NOISE = (
    "TRACK LIMITS", "DELETED", "BLUE FLAG", "PIT EXIT", "RISK OF RAIN", "TIME ", "NO FURTHER", "NO INVESTIGATION",
    "PENALTY SERVED", "CHEQUERED",
)


def classify(text: str) -> str | None:
    up = f" {text.upper()}"
    if "PENALTY SERVED" in up or "CHEQUERED" in up:
        return None
    if any(word in up for word in _NOISE) and "COLLISION" not in up and "PENALTY" not in up:
        return None
    for kind, words in _KINDS:
        if any(w in up for w in words):
            return kind
    return None


def build_incidents(
    openf1: OpenF1Source, season: int, rnd: int, date: str, numbers: dict[str, int], lap_doc: LapDoc
) -> IncidentDoc | None:
    """The race-control messages that explain what happened: collisions, cars stopped, penalties, safety cars."""
    clock = race_clock(openf1, season, rnd, date, numbers, lap_doc)
    if clock is None:
        return None
    key, _, t0, offset = clock
    items: list[IncidentItem] = []
    for m in openf1.race_control(key):
        text = str(m.get("message") or "").strip()
        kind = classify(text)
        if kind is None:
            continue
        try:
            t = round((datetime.fromisoformat(str(m["date"])) - t0).total_seconds() - offset, 1)
        except (KeyError, ValueError):
            t = None
        lap = m.get("lap_number")
        items.append(IncidentItem(t=t, lap=int(lap) if isinstance(lap, int) else None, kind=kind, text=text,
                                  drivers=sorted(set(_CODE.findall(text.upper())))))
    items.sort(key=lambda i: (i.t is None, i.t or 0))
    return IncidentDoc(season=season, round=rnd, source="openf1", items=items)


def build_race_replay(
    openf1: OpenF1Source, season: int, rnd: int, date: str, numbers: dict[str, int], lap_doc: LapDoc
) -> ReplayDoc | None:
    clock = race_clock(openf1, season, rnd, date, numbers, lap_doc)
    if clock is None:
        return None
    key, laps, t0, offset = clock
    last_end = max((e for d in lap_doc.drivers for e in d.end if e is not None), default=0.0)
    n = int(last_end + offset + 30)
    end = t0 + timedelta(seconds=n)

    # The circuit as this race's own cars drove it: the quickest clean lap of the fastest driver.
    quickest = [lap for lap in (fastest_clean_lap(laps, num) for num in numbers.values()) if lap]
    best = min(quickest, key=lambda lap: lap["lap_duration"], default=None)
    if best is None:
        return None
    start = datetime.fromisoformat(str(best["date_start"]))
    loc, _ = openf1.lap_samples(key, int(best["driver_number"]), start, float(best["lap_duration"]))
    ref = resample_closed(
        [(float(r["x"]), float(r["y"])) for r in loc if r.get("x") is not None and r.get("y") is not None]
    )
    if ref is None:
        return None
    track = Track(ref)

    drivers: list[ReplayDriver] = []
    for code, number in sorted(numbers.items()):
        location: list[dict] = []
        car: list[dict] = []
        for a, b in _chunks(t0, end):
            window = {"session_key": key, "driver_number": number, "date>": a.isoformat(), "date<": b.isoformat()}
            for kind, sink in (("location", location), ("car_data", car)):
                try:
                    rows = openf1.http.get_json(kind, window)
                except SourceUnavailable as exc:  # a failed window is a hole in the data, not a failed race
                    log.warning("%d R%d %s %s: %s", season, rnd, code, kind, type(exc).__name__)
                    rows = []
                sink.extend(rows if isinstance(rows, list) else [])
        secs, fracs = fractions(track, location, t0)
        f = grid_fraction(secs, fracs, n) if secs else [None] * n
        if sum(v is not None for v in f) < MIN_COVERAGE * n:
            log.warning("%d R%d %s: position known for too little of the race, left out", season, rnd, code)
            continue
        drivers.append(ReplayDriver(code=code, f=f, **grid_sensors(car, t0, n)))
        log.info("replay: %d R%d %s done", season, rnd, code)
    if len(drivers) < 10:
        return None
    return ReplayDoc(season=season, round=rnd, hz=1, n=n, offset_s=round(offset, 2), source="openf1", drivers=drivers)


def run_replay(publisher: Publisher, seasons: list[int], openf1: OpenF1Source | None = None, limit: int = 2) -> int:
    """Real-position replays for the newest races (2023 on) that lack one; older ones keep the timing-only replay."""
    openf1 = openf1 or OpenF1Source()
    candidates: list[tuple[int, int]] = []
    for season in sorted((s for s in seasons if s >= 2023), reverse=True):
        folder = publisher.root / "seasons" / str(season)
        rounds = [int(path.stem.split("_")[1]) for path in folder.glob("race_*.json")]
        candidates.extend((season, rnd) for rnd in sorted(rounds, reverse=True))  # by round number, not by file name
    written = 0
    for season, rnd in candidates[:limit]:  # only the newest: never retry old races forever
        target = publisher.root / "replay" / str(season) / f"{rnd}.json"
        notes = publisher.root / "incidents" / str(season) / f"{rnd}.json"
        laps_path = publisher.root / "laps" / str(season) / f"{rnd}.json"
        doc = publisher.load_race(season, rnd)
        if (target.exists() and notes.exists()) or doc is None or not laps_path.exists():
            continue
        numbers = {d.driver_code: d.driver_number for d in doc.drivers if d.driver_number is not None}
        lap_doc = LapDoc.model_validate_json(laps_path.read_text(encoding="utf-8"))
        if not notes.exists():  # one request: what race control said happened
            found = build_incidents(openf1, season, rnd, doc.date, numbers, lap_doc)
            if found is not None and write_if_changed(notes, dumps(found)):
                written += 1
                log.info("incidents: %d R%d, %d messages", season, rnd, len(found.items))
        if target.exists():
            continue
        built = build_race_replay(openf1, season, rnd, doc.date, numbers, lap_doc)
        if built is None:
            log.info("%d R%d: replay data not available yet", season, rnd)
            continue
        if write_if_changed(target, dumps(built)):
            written += 1
            log.info("replay: %d R%d, %d drivers, %d s", season, rnd, len(built.drivers), built.n)
    return written
