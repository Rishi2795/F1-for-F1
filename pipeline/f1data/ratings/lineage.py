"""Which team is "the same car programme" across seasons, and when the rules reset the pecking order."""

from __future__ import annotations

# Ownership/entry continuity, newest names last. A wrong entry only costs some carry-over of the car rating
# (it is shrunk every season anyway), so this errs on the side of continuity where a team was bought or renamed.
_LINEAGE = {
    "Force India": "Aston Martin",
    "Toro Rosso": "RB",
    "Scuderia Toro Rosso": "RB",
    "Racing Point": "Aston Martin",
    "Aston Martin": "Aston Martin",
    "AlphaTauri": "RB",
    "RB": "RB",
    "RB F1 Team": "RB",
    "Racing Bulls": "RB",
    "Renault": "Alpine",
    "Alpine": "Alpine",
    "Alfa Romeo Racing": "Sauber",
    "Alfa Romeo": "Sauber",
    "Kick Sauber": "Sauber",
    "Audi": "Sauber",
    "Cadillac F1 Team": "Cadillac",
}

# Seasons with major technical regulation changes: last year's car says little about this year's.
REGULATION_CHANGES = frozenset({2022, 2026})


def lineage(team: str) -> str:
    return _LINEAGE.get(team, team)
