from typing import Dict, Any
import pandas as pd
import math


# ===========================
# CORE DRIVER STRATEGY
# ===========================

def analyze_driver_strategy(laps: pd.DataFrame) -> Dict[str, Any]:
    """
    Phase 1 driver strategy analysis (safe & NaN-free).

    Computes:
    - total laps
    - average lap time
    """

    if laps is None or laps.empty:
        return {
            "total_laps": 0,
            "avg_lap_time_seconds": None,
            "stints": [],
            "coach_notes": "No lap data available for this driver."
        }

    valid_laps = laps.dropna(subset=["LapTime"])

    avg_lap_time = None
    if not valid_laps.empty:
        avg_lap_time = valid_laps["LapTime"].dt.total_seconds().mean()
        if isinstance(avg_lap_time, float) and math.isnan(avg_lap_time):
            avg_lap_time = None

    return {
        "total_laps": int(len(valid_laps)),
        "avg_lap_time_seconds": avg_lap_time,
        "stints": [],
        "coach_notes": "Baseline lap performance derived from race data."
    }


# ===========================
# STRATEGY RISK INDEX
# ===========================

def compute_strategy_risk(
    driver: Dict[str, Any],
    race_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Computes a deterministic Strategy Risk Index (0–100).

    Factors:
    - Stop deviation
    - Stint aggressiveness
    - Tyre strategy deviation
    - Net position outcome
    """

    risk = 0

    # 1️⃣ Stop deviation
    stop_diff = abs(driver["stops"] - race_context["avg_stops"])
    risk += stop_diff * 15

    # 2️⃣ Stint aggressiveness
    if driver["longest_stint"] < race_context["avg_longest_stint"] - 5:
        risk += 20

    # 3️⃣ Tyre deviation
    if driver["tyre_sequence"] != race_context["common_tyre_sequence"]:
        risk += 15

    # 4️⃣ Outcome validation
    if driver["positions_gained"] < -3:
        risk += 20

    risk = min(100, risk)

    if risk >= 65:
        label = "High Risk"
    elif risk >= 35:
        label = "Balanced"
    else:
        label = "Conservative"

    return {
        "strategy_risk_score": risk,
        "risk_label": label
    }


# ===========================
# STRATEGY SWAP SIMULATION
# ===========================

def simulate_strategy_swap(
    driver: Dict[str, Any],
    winning_recipe: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Counterfactual simulation:
    'What if this driver ran the winning strategy?'
    """

    delta = 0

    # Stops alignment
    if driver["stops"] > winning_recipe["typical_stops"]:
        delta += 2

    # Stint alignment
    if driver["longest_stint"] < winning_recipe["avg_longest_stint"]:
        delta += 1

    # Tyre alignment
    if driver["tyre_sequence"] != winning_recipe["common_tyre_sequence"]:
        delta += 1

    if delta >= 3:
        verdict = "Would likely gain multiple positions."
    elif delta == 2:
        verdict = "Would likely gain track position."
    elif delta == 1:
        verdict = "Marginal potential improvement."
    else:
        verdict = "Minimal or negative impact."

    return {
        "estimated_position_change": delta,
        "verdict": verdict
    }


# ===========================
# LIGHT TELEMETRY SIGNALS
# ===========================

def derive_track_signals(drivers: list) -> Dict[str, Any]:
    """
    Lightweight race-level signals (no heavy telemetry).

    Used for AI summaries & track personality.
    """

    if not drivers:
        return {}

    avg_stint = sum(d["longest_stint"] for d in drivers) / len(drivers)
    avg_gain = sum(d["positions_gained"] for d in drivers) / len(drivers)
    avg_stops = sum(d["stops"] for d in drivers) / len(drivers)

    signals = {
        "degradation_level": (
            "High" if avg_stint < 20 else
            "Medium" if avg_stint < 26 else
            "Low"
        ),
        "overtaking_pressure": (
            "High" if avg_gain > 1.2 else
            "Low"
        ),
        # Corner stress proxy:
        # High stop counts + short stints usually indicate traction-heavy tracks
        "corner_stress": (
            "High" if avg_stops >= 2.5 and avg_stint < 22 else
            "Moderate"
        )
    }

    return signals
