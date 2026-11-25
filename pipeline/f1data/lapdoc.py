"""Per-lap detail for one race: lap times, gap to the leader, sector bests, top speeds, flags and undercuts.

Kept out of the race document so that file stays small; the website fetches this one only when someone opens
the race lab. Everything is computed from the lap archive: nothing is estimated.
"""

from __future__ import annotations

from .models import LapDoc, LapDriver, LapIncident, Undercut
from .sources.tracinginsights import DriverLaps, Lap

_ORDER = ("R", "SC", "VSC", "Y")  # worst first
MAX_UNDERCUT_GAP = 4  # the car behind must stop within this many laps of the car ahead


def lap_status(codes: set[str]) -> str:
    """One status for a lap, from every driver's track-status code (digits: 1 green, 2 yellow, 4 SC, 5 red, 6/7 VSC)."""
    joined = "".join(codes)
    if "5" in joined:
        return "R"
    if "4" in joined:
        return "SC"
    if "6" in joined or "7" in joined:
        return "VSC"
    if "2" in joined:
        return "Y"
    return "G"


def _incidents(status: list[str]) -> list[LapIncident]:
    out: list[LapIncident] = []
    start = 0
    for i in range(1, len(status) + 1):
        if i == len(status) or status[i] != status[start]:
            if status[start] in _ORDER and status[start] != "Y":
                out.append(LapIncident(kind=status[start], from_lap=start + 1, to_lap=i))
            start = i
    return out


def _gaps(drivers: dict[str, DriverLaps], total: int) -> dict[str, list[float | None]]:
    """Seconds behind the leader at the end of each lap, from when each car crossed the line."""
    ends: dict[str, dict[int, float]] = {
        code: {lap.lap: lap.session_end for lap in dl.laps if lap.session_end is not None}
        for code, dl in drivers.items()
    }
    gaps: dict[str, list[float | None]] = {code: [None] * total for code in drivers}
    for n in range(1, total + 1):
        crossed = {code: e[n] for code, e in ends.items() if n in e}
        if not crossed:
            continue
        lead = min(crossed.values())
        for code, t in crossed.items():
            gaps[code][n - 1] = round(t - lead, 3)
    return gaps


def _undercuts(drivers: dict[str, DriverLaps], status: list[str]) -> list[Undercut]:
    """Pairs where the car behind stopped first and came out ahead (or did not), with no neutralisation in between."""
    pos: dict[str, dict[int, int]] = {
        c: {lap.lap: lap.position for lap in dl.laps if lap.position} for c, dl in drivers.items()
    }
    pits: dict[str, list[int]] = {c: sorted(lap.lap for lap in dl.laps if lap.pit_in) for c, dl in drivers.items()}
    out: list[Undercut] = []
    for b, b_stops in pits.items():
        for lap_b in b_stops:
            before = pos[b].get(lap_b - 1)
            if before is None or before < 2:
                continue
            ahead = [a for a, p in pos.items() if p.get(lap_b - 1) == before - 1 and a != b]
            if not ahead:
                continue
            a = ahead[0]
            nxt = [m for m in pits[a] if lap_b < m <= lap_b + MAX_UNDERCUT_GAP]
            if not nxt:
                continue
            lap_a = nxt[0]
            window = status[lap_b - 1 : min(len(status), lap_a + 2)]
            if any(s in ("SC", "VSC", "R") for s in window):
                continue  # a neutralised stop is nearly free, which is not an undercut
            after_b, after_a = pos[b].get(lap_a + 1), pos[a].get(lap_a + 1)
            if after_a is None or after_b is None:
                continue
            out.append(
                Undercut(attacker=b, defender=a, attacker_lap=lap_b, defender_lap=lap_a, success=after_b < after_a)
            )
    return out


def build_lap_doc(season: int, rnd: int, drivers: dict[str, DriverLaps], total_laps: int | None) -> LapDoc | None:
    laps_seen = max((lap.lap for dl in drivers.values() for lap in dl.laps), default=0)
    total = max(total_laps or 0, laps_seen)
    if total == 0 or not drivers:
        return None
    per_lap: list[set[str]] = [set() for _ in range(total)]
    for dl in drivers.values():
        for lap in dl.laps:
            if 1 <= lap.lap <= total and lap.track_status:
                per_lap[lap.lap - 1].add(lap.track_status)
    status = [lap_status(codes) for codes in per_lap]
    gaps = _gaps(drivers, total)
    # Lap 1 starts when the earliest car began it (completion time minus lap time); race time counts from there.
    starts = [
        lap.session_end - lap.time_s
        for dl in drivers.values()
        for lap in dl.laps
        if lap.lap == 1 and lap.session_end is not None and lap.time_s
    ]
    offset = round(min(starts), 3) if starts else 0.0
    out: list[LapDriver] = []
    for code, dl in sorted(drivers.items()):
        times: list[float | None] = [None] * total
        for lap in dl.laps:
            if 1 <= lap.lap <= total and lap.time_s is not None and not lap.deleted:
                times[lap.lap - 1] = round(lap.time_s, 3)
        best = [_best([lap.sectors[i] for lap in dl.laps if not lap.deleted]) for i in range(3)]
        speeds = [lap.top_speed for lap in dl.laps if lap.top_speed is not None]
        ends: list[float | None] = [None] * total
        for lap in dl.laps:
            if 1 <= lap.lap <= total and lap.session_end is not None:
                ends[lap.lap - 1] = round(lap.session_end - offset, 3)
        sector_ms: list[list[int | None]] = [[None] * total for _ in range(3)]
        speeds_by_lap: list[int | None] = [None] * total
        for lap in dl.laps:
            if not 1 <= lap.lap <= total or lap.deleted:
                continue
            for k in range(3):
                value = lap.sectors[k]
                sector_ms[k][lap.lap - 1] = round(value * 1000) if value is not None and value > 0 else None
            speeds_by_lap[lap.lap - 1] = round(lap.top_speed) if lap.top_speed is not None else None
        out.append(
            LapDriver(
                code=code,
                lap_times=times,
                gap=gaps[code],
                best_sectors=best,
                top_speed_kph=max(speeds, default=None),
                end=trim_untimed_tail(times, ends),
                s1=sector_ms[0],
                s2=sector_ms[1],
                s3=sector_ms[2],
                speed=speeds_by_lap,
            )
        )
    return LapDoc(
        season=season,
        round=rnd,
        laps=total,
        status=status,
        incidents=_incidents(status),
        drivers=out,
        undercuts=_undercuts(drivers, status),
        clock_offset=offset,
    )


def trim_untimed_tail(times: list[float | None], ends: list[float | None]) -> list[float | None]:
    """Drop end-of-lap times after a retired car's last timed lap.

    The timing feed can carry a line-crossing stamp for laps the car never drove (parked), which made retired
    cars keep "racing" in the replay for a couple more laps. A car that crossed the line on the final lap is left
    alone."""
    if not ends or ends[-1] is not None:
        return ends
    timed = [i for i, t in enumerate(times) if t is not None]
    if not timed:
        return ends
    return [e if i <= timed[-1] else None for i, e in enumerate(ends)]


def trim_to_official(doc: LapDoc, laps_completed: dict[str, int]) -> LapDoc:
    """Cut a retired car's end-of-lap times back to the laps the official result says it completed.

    ``laps_completed`` maps a driver code to that number, for retired cars only. The timing feed sometimes keeps
    stamping the line after a car has stopped, with or without a lap time."""
    for d in doc.drivers:
        done = laps_completed.get(d.code)
        if done is not None and any(e is not None for e in d.end[done:]):
            d.end = [e if i < done else None for i, e in enumerate(d.end)]
    return doc


def _best(values: list[float | None]) -> float | None:
    known = [v for v in values if v is not None and v > 0]
    return round(min(known), 3) if known else None


__all__ = ["build_lap_doc", "lap_status", "Lap"]
