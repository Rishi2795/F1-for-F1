from app.db.mongo import db
from functools import lru_cache

# -------------------------
# FAST: seasons list
# -------------------------
@lru_cache(maxsize=1)
def list_seasons():
    return sorted(
        db.races.distinct("season"),
        reverse=True
    )

# -------------------------
# FAST: races list (LIGHT)
# -------------------------
@lru_cache(maxsize=32)
def list_races(year: int):
    return list(
        db.races.find(
            {"season": year},
            {
                "_id": 0,
                "round": 1,
                "event_name": 1,
                "location": 1,
            }
        ).sort("round", 1)
    )

# -------------------------
# FULL race (ONLY when opened)
# -------------------------
@lru_cache(maxsize=128)
def load_race(year: int, round_number: int):
    return db.races.find_one(
        {"season": year, "round": round_number},
        {"_id": 0}
    )
