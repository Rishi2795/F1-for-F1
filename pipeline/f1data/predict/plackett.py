"""Plackett-Luce: the probability of a whole finishing order from one strength per driver.

With Gumbel noise on the strengths, sorting gives exactly this distribution, which is also what the rating
model's pairwise logistic assumes. Weights are fitted by maximum likelihood on finishing orders.
"""

from __future__ import annotations

import math
import random

POINTS = (25, 18, 15, 12, 10, 8, 6, 4, 2, 1)


def _dot(w: list[float], f: list[float]) -> float:
    return sum(a * b for a, b in zip(w, f, strict=True))


def softmax(scores: list[float]) -> list[float]:
    top = max(scores)
    exps = [math.exp(s - top) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]


def loglik(orders: list[list[list[float]]], w: list[float]) -> float:
    """Total log-likelihood of finishing orders (each given as feature vectors, first place first)."""
    total = 0.0
    for order in orders:
        scores = [_dot(w, f) for f in order]
        for j in range(len(order) - 1):
            rest = scores[j:]
            top = max(rest)
            total += scores[j] - top - math.log(sum(math.exp(s - top) for s in rest))
    return total


def fit(
    orders: list[list[list[float]]],
    dim: int,
    *,
    l2: float = 0.02,
    iterations: int = 300,
    init: list[float] | None = None,
) -> list[float]:
    """Gradient ascent with a halving step; small ridge so weak features do not run away."""
    w = list(init) if init else [0.0] * dim
    positions = sum(len(o) - 1 for o in orders) or 1
    lr = 1.0

    def objective(vec: list[float]) -> float:
        return loglik(orders, vec) / positions - l2 * sum(x * x for x in vec)

    best = objective(w)
    for _ in range(iterations):
        grad = [0.0] * dim
        for order in orders:
            scores = [_dot(w, f) for f in order]
            for j in range(len(order) - 1):
                probs = softmax(scores[j:])
                for d in range(dim):
                    grad[d] += order[j][d] - sum(p * order[j + k][d] for k, p in enumerate(probs))
        grad = [g / positions - 2 * l2 * x for g, x in zip(grad, w, strict=True)]
        while lr > 1e-6:
            trial = [x + lr * g for x, g in zip(w, grad, strict=True)]
            value = objective(trial)
            if value > best:
                w, best = trial, value
                lr *= 1.3
                break
            lr /= 2
        else:
            break
    return w


def gumbel(rng: random.Random) -> float:
    return -math.log(-math.log(rng.random() or 1e-12))


def finishing_order(strength: list[float], p_dnf: list[float], rng: random.Random) -> tuple[list[int], int]:
    """Driver indices in finishing order with retirements last, and how many cars finished."""
    running: list[tuple[float, int]] = []
    retired: list[int] = []
    for i, s in enumerate(strength):
        if rng.random() < p_dnf[i]:
            retired.append(i)
        else:
            running.append((s + gumbel(rng), i))
    running.sort(reverse=True)
    return [i for _, i in running] + retired, len(running)


def race_odds(strength: list[float], p_dnf: list[float], trials: int, seed: int) -> list[dict[str, float]]:
    """Monte Carlo summary per driver: win, podium, top-10, retirement chance, expected position and points."""
    rng = random.Random(seed)
    n = len(strength)
    wins, podium, top10, dnf = [0] * n, [0] * n, [0] * n, [0] * n
    pos_sum = [0.0] * n
    pts = [0.0] * n
    for _ in range(trials):
        order, finished = finishing_order(strength, p_dnf, rng)
        for place, i in enumerate(order):
            pos_sum[i] += place + 1
            if place >= finished:
                dnf[i] += 1
                continue
            wins[i] += place == 0
            podium[i] += place < 3
            top10[i] += place < 10
            if place < len(POINTS):
                pts[i] += POINTS[place]
    return [
        {
            "win": wins[i] / trials,
            "podium": podium[i] / trials,
            "top10": top10[i] / trials,
            "dnf": dnf[i] / trials,
            "exp_pos": pos_sum[i] / trials,
            "exp_points": pts[i] / trials,
        }
        for i in range(n)
    ]
