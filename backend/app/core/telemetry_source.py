import os
import fastf1
from functools import lru_cache

CACHE_DIR = os.path.join(os.getcwd(), ".fastf1-cache")
os.makedirs(CACHE_DIR, exist_ok=True)

fastf1.Cache.enable_cache(CACHE_DIR)


@lru_cache(maxsize=32)
def load_session(year: int, round_number: int):
    """
    Loads and caches an F1 race session for given year + round.
    """
    session = fastf1.get_session(year, round_number, 'R')  # 'R' = Race
    session.load()
    return session


def get_race_basic_data(year: int, round_number: int):
    """
    Returns basic race summary:
    - name, location
    - results list (position, driver code, name, team, status)
    """
    session = load_session(year, round_number)

    df = session.results  # pandas DataFrame

    # For debugging once: you can print(df.columns) to see available cols
    # print(df.columns)

    results = []
    for _, row in df.iterrows():
        # These column names are typical in FastF1 results:
        # 'Position', 'Abbreviation', 'FullName', 'TeamName', 'Status'
        position = int(row["Position"])
        driver_code = row["Abbreviation"]
        driver_name = row["FullName"]
        team_name = row["TeamName"]
        status = row.get("Status", "")

        results.append({
            "position": position,
            "driver_code": driver_code,
            "driver_name": driver_name,
            "team": team_name,
            "status": status
        })

    return {
        "year": year,
        "round": round_number,
        "race_name": session.event['EventName'],
        "location": session.event['Location'],
        "results": sorted(results, key=lambda x: x["position"])
    }



def get_driver_laps(year: int, round_number: int, driver_code: str):
    """
    Returns laps DataFrame for a given driver.
    For Phase 1 we'll just use it to count laps & basic info.
    """
    session = load_session(year, round_number)
    laps = session.laps.pick_driver(driver_code)

    # For now, just return the DataFrame – strategy_engine will handle it
    return laps
