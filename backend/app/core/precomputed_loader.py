import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "computed_data")

def list_seasons():
    return sorted([
        int(x) for x in os.listdir(DATA_DIR)
        if x.isdigit()
    ])

def list_races(year: int):
    path = os.path.join(DATA_DIR, str(year), "races.json")
    if not os.path.exists(path):
        return []
    with open(path, "r") as f:
        return json.load(f)

def load_race(year: int, round_number: int):
    path = os.path.join(DATA_DIR, str(year), f"race_{round_number}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)
