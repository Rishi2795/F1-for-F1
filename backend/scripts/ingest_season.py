import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import os
import json
import sys
from app.db.mongo import db

def main():
    if len(sys.argv) < 2:
        raise RuntimeError("Usage: python ingest_season.py <YEAR>")

    YEAR = int(sys.argv[1])

    BASE_DIR = os.path.dirname(os.path.dirname(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "computed_data", str(YEAR))

    if not os.path.exists(DATA_DIR):
        raise RuntimeError(f"No computed data found for {YEAR}")

    races = []

    for file in os.listdir(DATA_DIR):
        if file.startswith("race_") and file.endswith(".json"):
            with open(os.path.join(DATA_DIR, file)) as f:
                races.append(json.load(f))

    if not races:
        raise RuntimeError("No race files found")

    db.races.delete_many({"season": YEAR})
    db.races.insert_many(races)

    print(f"✅ Inserted {len(races)} races for {YEAR}")

if __name__ == "__main__":
    main()
