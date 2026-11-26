"""Synthetic championships with KNOWN driver skills and car strengths, to test the rating model against the truth."""

import math
import random

from f1data.ratings.data import RaceRecord, Starter


def simulate(seasons=(2020, 2021, 2022, 2023, 2024), teams=10, races=20, seed=7, noise=1.0, swap=True):
    """Returns (races, true_driver, true_car[season][team]).

    Pace = skill + car + Gumbel noise (so finishing order follows a Plackett-Luce model). Drivers move between
    teams every season, which is what lets skill be told apart from the car."""
    rng = random.Random(seed)
    names = [f"D{i:02d}" for i in range(teams * 2)]
    skill = {n: rng.gauss(0, 0.6) for n in names}
    car = {s: {f"T{t}": rng.gauss(0, 1.0) for t in range(teams)} for s in seasons}
    out = []
    for season in seasons:
        order = names[:]
        if swap:
            rng.shuffle(order)
        lineup = {order[2 * t + k]: f"T{t}" for t in range(teams) for k in range(2)}
        for rnd in range(1, races + 1):
            pace = {n: skill[n] + car[season][lineup[n]] - noise * math.log(-math.log(rng.random())) for n in names}
            ranked = sorted(names, key=lambda n: -pace[n])
            # qualifying: the same pace with fresh noise, so the grid is informative but not the finishing order
            quali = {n: skill[n] + car[season][lineup[n]] - noise * math.log(-math.log(rng.random())) for n in names}
            grid = {n: i + 1 for i, n in enumerate(sorted(names, key=lambda n: -quali[n]))}
            out.append(
                RaceRecord(
                    season,
                    rnd,
                    tuple(Starter(n, n, lineup[n], lineup[n], i + 1, True, grid[n]) for i, n in enumerate(ranked)),
                )
            )
    return out, skill, car


def pearson(a, b):
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b, strict=True))
    den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return num / den
