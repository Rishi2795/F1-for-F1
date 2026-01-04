print("🚨 RUNNING THIS EXACT FILE 🚨")


import fastf1
import pandas as pd
import json
import os
from collections import Counter

fastf1.Cache.enable_cache(".fastf1-cache")

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
OUT_DIR = os.path.join(BASE_DIR, "computed_data", "2023")
print("WRITING FILES TO:", OUT_DIR)
os.makedirs(OUT_DIR, exist_ok=True)

RACES_INDEX = []

def compute_winning_recipe(drivers_data):
    # Ignore DNFs
    finishers = [d for d in drivers_data if d["finish"] > 0]

    if not finishers:
        return {}

    # Stop count analysis
    stop_counts = [d["stops"] for d in finishers]
    common_stops = Counter(stop_counts).most_common(1)[0][0]

    # Tyre sequence analysis
    sequences = [
        "-".join(d["tyre_sequence"])
        for d in finishers
        if len(d["tyre_sequence"]) > 1
    ]

    common_sequence = (
        Counter(sequences).most_common(1)[0][0]
        if sequences else "Unknown"
    )

    # Stint proxy
    avg_longest_stint = int(
        sum(d["longest_stint"] for d in finishers) / len(finishers)
    )

    return {
        "typical_stops": common_stops,
        "common_tyre_sequence": common_sequence,
        "avg_longest_stint": avg_longest_stint
    }

def compute_style_profile(drivers_data):
    finishers = [d for d in drivers_data if d["finish"] > 0]
    if not finishers:
        return []

    avg_stint = sum(d["longest_stint"] for d in finishers) / len(finishers)
    avg_positions_gained = sum(d["positions_gained"] for d in finishers) / len(finishers)

    styles = []

    if avg_stint >= 28:
        styles.append("Tyre Saver Track")
    if avg_stint <= 20:
        styles.append("High Degradation Track")
    if avg_positions_gained > 1.5:
        styles.append("Overtaking Friendly")
    if avg_positions_gained < 0.5:
        styles.append("Track Position Critical")

    return styles

def process_race(year: int, round_number: int):
    print(f"Processing {year} Round {round_number}")

    session = fastf1.get_session(year, round_number, "R")
    session.load(laps=True, telemetry=False, weather=False)

    results = session.results
    laps = session.laps

    drivers_data = []

    for _, row in results.iterrows():
        driver = row["Abbreviation"]
        grid = int(row["GridPosition"])
        finish = int(row["Position"])

        driver_laps = laps.pick_driver(driver)

        compounds = (
            driver_laps["Compound"]
            .dropna()
            .astype(str)
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
        

        drivers_data.append({
            "driver_code": driver,
            "team": row["TeamName"],
            "grid": grid,
            "finish": finish,
            "positions_gained": grid - finish,
            "stops": len(tyre_sequence) - 1,
            "tyre_sequence": tyre_sequence,
            "longest_stint": int(longest_stint)
        })
        
    winning_recipe = compute_winning_recipe(drivers_data)
    style_profile = compute_style_profile(drivers_data)



    race_doc = {
    "season": year,
    "round": round_number,
    "event_name": session.event["EventName"],
    "track": {
        "name": session.event["EventName"],
        "location": session.event["Location"]
    },
    "sessions": {
        "race": {
            "results": drivers_data
        }
    },
    "derived": {
        "winning_recipe": winning_recipe,
        "style_profile": style_profile
    }
}


    with open(os.path.join(OUT_DIR, f"race_{round_number}.json"), "w") as f:
        json.dump(race_doc, f, indent=2)

    RACES_INDEX.append({
        "season": year,
        "round": round_number,
        "event_name": session.event["EventName"],
        "location": session.event["Location"]
    })


def main():
    YEAR = 2023

    for rnd in range(1, 23):  # 2023 had 22 races
        try:
            process_race(YEAR, rnd)
        except Exception as e:
            print(f"❌ Failed round {rnd}: {e}")

    with open(os.path.join(OUT_DIR, "races.json"), "w") as f:
        json.dump(RACES_INDEX, f, indent=2)

    print("✅ 2023 precompute complete")


if __name__ == "__main__":
    main()
