from app.db.mongo import db

doc = {
    "season": 2021,
    "round": 22,
    "event_name": "Abu Dhabi Grand Prix",
    "track": {
        "name": "Yas Marina Circuit",
        "location": "Abu Dhabi"
    },
    "special_case": True,
    "note": (
        "This race involved unprecedented race control decisions. "
        "Standard strategy and stint analytics are intentionally limited."
    ),
    "derived": {
        "context": [
            "Late safety car",
            "Race director intervention",
            "Championship-deciding anomaly"
        ]
    }
}

# Prevent duplicates
existing = db.races.find_one({"season": 2021, "round": 22})

if existing:
    print("⚠️ Abu Dhabi 2021 already exists. Skipping insert.")
else:
    db.races.insert_one(doc)
    print("✅ Abu Dhabi 2021 special-case record inserted.")
