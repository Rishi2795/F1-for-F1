# ruff: noqa: T201  (a command-line report: printing is its output)
"""Cross-check the three things the race lab displays about a race: results, pit stops, retirements.

Reads only the published files (no network). For every race of the chosen season it checks that sources which describe
the same fact agree, and prints what does not. Exit code 1 if anything is wrong.

    python scripts/verify_events.py 2026
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "backend" / "data" / "published"


def load(*parts: str):
    path = ROOT.joinpath(*parts)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def check_race(season: int, rnd: int) -> tuple[list[str], dict[str, int]]:
    race = load("seasons", str(season), f"race_{rnd}.json")
    laps = load("laps", str(season), f"{rnd}.json")
    problems: list[str] = []
    stats = {"drivers": 0, "pits": 0, "retired": 0, "classified": 0, "pit_mismatch": 0}
    if race is None:
        return [f"R{rnd}: race file missing"], stats
    total = max((d["laps_completed"] or 0) for d in race["drivers"])
    by_code = {d["code"]: d for d in (laps or {}).get("drivers", [])}
    for d in race["drivers"]:
        code = d["driver_code"]
        stats["drivers"] += 1
        # Results: classification order, retirements and lap counts must tell one story.
        if d["status"] == "Retired" and (d["laps_completed"] or 0) >= total:
            problems.append(f"R{rnd} {code}: retired but completed all {total} laps")
        if d["status"] in ("Finished", "Lapped") and d["classified"] is False:
            problems.append(f"R{rnd} {code}: {d['status']} but not classified")
        if d["status"] == "Retired":
            stats["retired"] += 1
            timing = by_code.get(code)
            if timing:
                done = sum(1 for e in timing.get("end", []) if e is not None)
                if abs(done - (d["laps_completed"] or 0)) > 1:
                    problems.append(f"R{rnd} {code}: results say {d['laps_completed']} laps, timing has {done}")
        if d["classified"]:
            stats["classified"] += 1
        # Pit stops: the official log and the tyre stints must agree on how many, and on which lap.
        stops = d.get("pit_stops") or []
        stints = d.get("stints") or []
        stats["pits"] += len(stops)
        if stints and len(stops) != len(stints) - 1:
            stats["pit_mismatch"] += 1
            problems.append(f"R{rnd} {code}: {len(stops)} pit stops logged, {len(stints) - 1} from tyre stints")
        ends = {s["lap_end"] for s in stints[:-1]}
        for stop in stops:
            if stints and stop["lap"] is not None and not ({stop["lap"], stop["lap"] - 1, stop["lap"] + 1} & ends):
                problems.append(f"R{rnd} {code}: stop {stop['stop']} on lap {stop['lap']} matches no stint change")
            if stop["duration_s"] is not None and not 1.5 < stop["duration_s"] < 120:
                problems.append(f"R{rnd} {code}: pit time {stop['duration_s']} s is implausible")
    # Order: for finishers on the lead lap, the official order is the order at the end of the last lap.
    lead_lap = [d for d in race["drivers"] if d["status"] == "Finished" and d.get("lap_positions")]
    final = sorted(lead_lap, key=lambda d: d["lap_positions"][-1])
    official = sorted(lead_lap, key=lambda d: d["finish"])
    if [d["driver_code"] for d in final] != [d["driver_code"] for d in official]:
        swapped = [a["driver_code"] for a, b in zip(final, official, strict=False) if a is not b]
        problems.append(f"R{rnd}: last-lap order differs from the classification for {swapped} (penalty or time-adjusted?)")
    return problems, stats


def main() -> int:
    season = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    rounds = sorted(int(p.stem.split("_")[1]) for p in (ROOT / "seasons" / str(season)).glob("race_*.json"))
    all_problems: list[str] = []
    print(f"{'round':>5} {'drivers':>7} {'classified':>10} {'retired':>7} {'pit stops':>9} {'pit mismatches':>14}")
    for rnd in rounds:
        problems, s = check_race(season, rnd)
        all_problems += problems
        print(f"{rnd:>5} {s['drivers']:>7} {s['classified']:>10} {s['retired']:>7} {s['pits']:>9} {s['pit_mismatch']:>14}")
    print()
    for line in all_problems:
        print(" -", line)
    print(f"\n{len(all_problems)} problem(s) across {len(rounds)} races")
    return 1 if all_problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
