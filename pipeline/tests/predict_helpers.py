"""A small simulated F1: teams and drivers with known strengths, so the forecast model has a right answer."""

from __future__ import annotations

import random

from f1data.predict.plackett import gumbel
from f1data.predict.state import PRace, PStarter


def simulate_races(seasons=(2020, 2021, 2022, 2023, 2024), teams=5, rounds=8, seed=3, dnf=0.08):
    rng = random.Random(seed)
    car = {f"T{t}": rng.gauss(0, 1.0) for t in range(teams)}
    skill = {f"D{t}{k}": rng.gauss(0, 0.3) for t in range(teams) for k in range(2)}
    races = []
    for season in seasons:
        for rnd in range(1, rounds + 1):
            rows = []
            for t in range(teams):
                for k in range(2):
                    code = f"D{t}{k}"
                    rows.append((code, f"T{t}", car[f"T{t}"] + skill[code]))
            perf = [(s + gumbel(rng), code, team, s) for code, team, s in rows]
            perf.sort(reverse=True)
            best = max(s for *_, s in perf)
            starters = []
            for place, (_, code, team, s) in enumerate(perf, start=1):
                out = rng.random() < dnf
                grid = max(1, min(len(perf), place + rng.randint(-2, 2)))
                starters.append(
                    PStarter(code, code, team, team, "#ffffff", grid, None if out else place, not out, round((best - s) * 0.4, 3))
                )
            # re-rank finishers 1..n so positions are contiguous
            finishers = sorted((s for s in starters if s.classified), key=lambda s: s.finish or 0)
            fixed = {s.code: i + 1 for i, s in enumerate(finishers)}
            starters = [
                PStarter(s.code, s.name, s.team, s.key, s.color, s.grid, fixed.get(s.code), s.classified, s.pace_gap)
                for s in starters
            ]
            races.append(PRace(season, rnd, f"Round {rnd}", f"{season}-{rnd:02d}-01", tuple(starters)))
    return races, car, skill
