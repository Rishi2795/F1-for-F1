"""
🚨 PRECOMPUTE SEASON SCRIPT 🚨

Usage:
  python backend/scripts/precompute_season.py 2025        # full season
  python backend/scripts/precompute_season.py 2025 6      # single race
"""

import fastf1
import pandas as pd
import json
import os
import sys
import math
from collections import Counter

# ---------------- CONFIG ----------------

fastf1.Cache.enable_cache(".fastf1-cache")

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
YEAR = int(sys.argv[1]) if len(sys.argv) > 1 else 2023
ONLY_ROUND = int(sys.argv[2]) if len(sys.argv) > 2 else None

OUT_DIR = os.path.join(BASE_DIR, "computed_data", str(YEAR))
os.makedirs(OUT_DIR, exist_ok=True)

RACES_INDEX = []

print(f"🚨 PRECOMPUTING SEASON {YEAR}")
if ONLY_ROUND:
    print(f"➡️  ONLY ROUND {ONLY_ROUND}")

# ---------------- HELPERS ----------------

def safe_mean(values):
    vals = [v for v in values if isinstance(v, (int, float)) and not math.isnan(v)]
    return sum(vals) / len(vals) if vals else None


def compute_winning_recipe(drivers):
    finishers = [d for d in drivers if d["finish"] > 0]
    if not finishers:
        return {}

    return {
        "typical_stops": Counter(d["stops"] for d in finishers).most_common(1)[0][0],
        "common_tyre_sequence": Counter(
            "-".join(d["tyre_sequence"]) for d in finishers if len(d["tyre_sequence"]) > 1
        ).most_common(1)[0][0],
        "avg_longest_stint": int(
            safe_mean(d["longest_stint"] for d in finishers) or 0
        )
    }


def compute_style_profile(drivers):
    finishers = [d for d in drivers if d["finish"] > 0]
    if not finishers:
        return []

    avg_stint = safe_mean(d["longest_stint"] for d in finishers) or 0
    avg_gain = safe_mean(d["positions_gained"] for d in finishers) or 0

    tags = []
    if avg_stint >= 28:
        tags.append("Tyre Saving Track")
    if avg_stint <= 20:
        tags.append("High Degradation Track")
    if avg_gain > 1.5:
        tags.append("Overtaking Friendly")
    if avg_gain < 0.5:
        tags.append("Track Position Critical")

    return tags


def strategy_risk(driver, race_ctx):
    risk = 50
    risk += (driver["stops"] - race_ctx["avg_stops"]) * 12
    risk -= (driver["longest_stint"] - race_ctx["avg_longest_stint"]) * 1.5
    risk = max(0, min(100, int(risk)))

    label = (
        "Low Risk" if risk < 35 else
        "Medium Risk" if risk < 70 else
        "High Risk"
    )

    return {"risk_score": risk, "risk_label": label}


def strategy_swap(driver, winning_recipe):
    if driver["stops"] > winning_recipe["typical_stops"]:
        return {
            "estimated_position_change": +2,
            "verdict": "Could gain positions with fewer stops"
        }
    if driver["stops"] < winning_recipe["typical_stops"]:
        return {
            "estimated_position_change": -1,
            "verdict": "Likely slower without extra tyre advantage"
        }
    return {
        "estimated_position_change": 0,
        "verdict": "Strategy aligned with race winner"
    }


def tyre_degradation_index(driver):
    if driver["longest_stint"] >= 30:
        return 25
    if driver["longest_stint"] <= 18:
        return 80
    return int(50)


def pit_efficiency(driver):
    if driver["stops"] <= 2 and driver["positions_gained"] > 0:
        return "Efficient"
    if driver["stops"] >= 3 and driver["positions_gained"] <= 0:
        return "Inefficient"
    return "Neutral"


def consistency_index(laps):
    if laps.empty or "LapTime" not in laps:
        return None
    valid = laps.dropna(subset=["LapTime"])
    if valid.empty:
        return None
    return round(valid["LapTime"].dt.total_seconds().std(), 3)

# ---------------- CORE ----------------

def process_race(round_number):
    print(f"➡️  Processing Round {round_number}")

    session = fastf1.get_session(YEAR, round_number, "R")
    session.load(laps=True, telemetry=False, weather=False)

    results = session.results
    laps = session.laps

    drivers = []

    for _, row in results.iterrows():
        code = row["Abbreviation"]
        driver_laps = laps.pick_driver(code)

        compounds = (
            driver_laps["Compound"]
            .dropna()
            .astype(str)
            .replace("nan", None)
            .dropna()
            .tolist()
        )

        tyre_sequence = []
        for c in compounds:
            if not tyre_sequence or tyre_sequence[-1] != c:
                tyre_sequence.append(c)

        longest_stint = (
            driver_laps.groupby("Compound").size().max()
            if not driver_laps.empty else 0
        )

        drivers.append({
            "driver_code": code,
            "team": row["TeamName"],
            "grid": int(row["GridPosition"]),
            "finish": int(row["Position"]),
            "positions_gained": int(row["GridPosition"] - row["Position"]),
            "stops": max(len(tyre_sequence) - 1, 0),
            "tyre_sequence": tyre_sequence,
            "longest_stint": int(longest_stint),
            "consistency_index": consistency_index(driver_laps)
        })

    winning = compute_winning_recipe(drivers)

    race_ctx = {
        "avg_stops": safe_mean(d["stops"] for d in drivers) or 0,
        "avg_longest_stint": safe_mean(d["longest_stint"] for d in drivers) or 0
    }

    for d in drivers:
        d["strategy_risk"] = strategy_risk(d, race_ctx)
        d["strategy_simulation"] = strategy_swap(d, winning)
        d["tyre_degradation_index"] = tyre_degradation_index(d)
        d["pit_efficiency"] = pit_efficiency(d)

    race_doc = {
        "season": YEAR,
        "round": round_number,
        "event_name": session.event["EventName"],
        "location": session.event["Location"],
        "drivers": drivers,
        "derived": {
            "winning_recipe": winning,
            "style_profile": compute_style_profile(drivers)
        }
    }

    with open(os.path.join(OUT_DIR, f"race_{round_number}.json"), "w") as f:
        json.dump(race_doc, f, indent=2)

    RACES_INDEX.append({
        "season": YEAR,
        "round": round_number,
        "event_name": session.event["EventName"],
        "location": session.event["Location"]
    })


def main():
    rounds = [ONLY_ROUND] if ONLY_ROUND else range(1, 26)

    for rnd in rounds:
        try:
            process_race(rnd)
        except Exception as e:
            print(f"❌ Failed round {rnd}: {e}")

    with open(os.path.join(OUT_DIR, "races.json"), "w") as f:
        json.dump(RACES_INDEX, f, indent=2)

    print(f"✅ {YEAR} precompute complete")


if __name__ == "__main__":
    main()
