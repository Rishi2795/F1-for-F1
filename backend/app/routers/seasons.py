from fastapi import APIRouter, HTTPException
import fastf1
import os
import math
import pandas as pd

router = APIRouter(prefix="/seasons", tags=["seasons"])

_CACHE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".fastf1-cache")
os.makedirs(_CACHE, exist_ok=True)
fastf1.Cache.enable_cache(_CACHE)

_SUPPORTED_SEASONS = [2025, 2024, 2023, 2022, 2021, 2020]


# ─── safe converters ──────────────────────────────────────────────────────────

def _str(val, default="—"):
    if val is None:
        return default
    try:
        if pd.isna(val):
            return default
    except (TypeError, ValueError):
        pass
    s = str(val).strip()
    return s if s not in ("nan", "None", "") else default


def _int(val, default=0):
    if val is None:
        return default
    try:
        f = float(val)
        return default if math.isnan(f) else int(f)
    except (TypeError, ValueError):
        return default


def _float(val, default=0.0):
    if val is None:
        return default
    try:
        f = float(val)
        return default if math.isnan(f) else round(f, 2)
    except (TypeError, ValueError):
        return default


# ─── per-driver lap analytics ─────────────────────────────────────────────────

def _driver_lap_stats(session, driver_code: str):
    """
    Returns stops, tyre_sequence, longest_stint, consistency_index,
    tyre_degradation_index, pit_efficiency for one driver.
    Falls back gracefully when lap data is unavailable.
    """
    defaults = {
        "stops": 1,
        "tyre_sequence": ["UNKNOWN"],
        "longest_stint": 0,
        "consistency_index": None,
        "tyre_degradation_index": 50,
        "pit_efficiency": "Nominal",
    }
    try:
        laps = session.laps.pick_drivers(driver_code)
        if laps is None or laps.empty:
            return defaults

        # ── Stints ──────────────────────────────────────────────────────
        stint_col = "Stint" if "Stint" in laps.columns else None
        compound_col = "Compound" if "Compound" in laps.columns else None

        if stint_col:
            stint_groups = laps.groupby(stint_col, sort=True)
            stint_list = []
            for _, slaps in stint_groups:
                compound = "UNKNOWN"
                if compound_col:
                    c = slaps[compound_col].dropna()
                    if not c.empty:
                        compound = _str(c.iloc[0], "UNKNOWN")
                stint_list.append({
                    "laps": len(slaps),
                    "compound": compound,
                })
            stops = max(0, len(stint_list) - 1)
            tyre_seq = [s["compound"] for s in stint_list]
            longest_stint = max((s["laps"] for s in stint_list), default=0)
        else:
            stops = 1
            tyre_seq = ["UNKNOWN"]
            longest_stint = len(laps)

        total_laps = len(laps)

        # ── Consistency index (0–100; higher = more consistent) ──────────
        consistency_index = None
        if "LapTime" in laps.columns:
            valid = laps.dropna(subset=["LapTime"])
            if len(valid) > 3:
                secs = valid["LapTime"].dt.total_seconds()
                mean_lt = secs.mean()
                std_lt  = secs.std()
                if mean_lt > 0:
                    cv = (std_lt / mean_lt) * 100       # coefficient of variation
                    consistency_index = max(0, min(100, round(100 - cv * 10)))

        # ── Tyre degradation index (0–100; higher = better tyre life) ────
        if total_laps > 0 and longest_stint > 0:
            tdi = min(100, round((longest_stint / total_laps) * 100))
        else:
            tdi = 50

        # ── Pit efficiency (qualitative) ─────────────────────────────────
        if stops == 0:
            pit_eff = "Zero-stop"
        elif stops == 1:
            pit_eff = "Optimal"
        elif stops == 2:
            pit_eff = "Standard"
        else:
            pit_eff = "Aggressive"

        return {
            "stops":                  stops,
            "tyre_sequence":          tyre_seq,
            "longest_stint":          longest_stint,
            "consistency_index":      consistency_index,
            "tyre_degradation_index": tdi,
            "pit_efficiency":         pit_eff,
        }

    except Exception:
        return defaults


# ─── strategy risk & simulation ───────────────────────────────────────────────

def _strategy_risk(driver_stops: int, positions_gained: int, avg_stops: float) -> dict:
    risk = 0
    stop_diff = abs(driver_stops - avg_stops)
    risk += int(stop_diff * 20)
    if positions_gained < -3:
        risk += 25
    if driver_stops >= 3:
        risk += 20
    risk = min(100, risk)
    if risk >= 65:
        label = "High Risk"
    elif risk >= 35:
        label = "Balanced"
    else:
        label = "Conservative"
    return {"risk_score": risk, "risk_label": label}


def _strategy_simulation(
    driver_stops: int,
    positions_gained: int,
    winner_stops: int,
) -> dict:
    delta = 0
    if driver_stops > winner_stops + 1:
        delta += 2
    elif driver_stops > winner_stops:
        delta += 1
    if positions_gained < -2:
        delta += 1

    if delta >= 3:
        verdict = "Adopting the winning strategy would likely have yielded multiple position gains."
    elif delta == 2:
        verdict = "A closer mirroring of the race winner's approach could have secured track position."
    elif delta == 1:
        verdict = "Marginal improvements possible through tighter alignment with optimal strategy."
    else:
        verdict = "Strategy was well-calibrated relative to the race winner — no significant gains identified."
    return {"verdict": verdict}


# ─── derived race analytics ───────────────────────────────────────────────────

def _derive_race_meta(drivers_data: list) -> dict:
    """Build winning_recipe and style_profile from processed driver list."""
    if not drivers_data:
        return {
            "winning_recipe": {
                "typical_stops": 1,
                "common_tyre_sequence": "MEDIUM → HARD",
                "avg_longest_stint": 0,
            },
            "style_profile": ["Strategy Circuit"],
        }

    winner = drivers_data[0]
    top5   = drivers_data[:5]

    # winning recipe
    winner_seq = winner.get("tyre_sequence", [])
    common_tyre_sequence = " → ".join(winner_seq) if winner_seq else "N/A"
    avg_longest_stint = round(
        sum(d.get("longest_stint", 0) for d in top5) / len(top5)
    )

    # style profile tags
    all_stops = [d["stops"] for d in drivers_data]
    avg_stops = sum(all_stops) / len(all_stops) if all_stops else 1

    all_gained = [d["positions_gained"] for d in drivers_data]
    avg_gained = sum(all_gained) / len(all_gained) if all_gained else 0

    tags = []
    if avg_stops >= 2.5:
        tags.append("High Degradation")
    elif avg_stops <= 1.2:
        tags.append("Low Degradation")
    else:
        tags.append("Medium Degradation")

    if avg_gained > 1.0:
        tags.append("High Overtaking")
    else:
        tags.append("Track Position Circuit")

    if avg_longest_stint >= 30:
        tags.append("Long Stints")
    elif avg_longest_stint <= 15:
        tags.append("Short Stints")

    tags.append("Strategy Sensitive" if avg_stops > 2 else "Execution Focused")

    return {
        "winning_recipe": {
            "typical_stops":        _int(winner["stops"]),
            "common_tyre_sequence": common_tyre_sequence,
            "avg_longest_stint":    avg_longest_stint,
        },
        "style_profile": tags,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("")
def seasons():
    return {"seasons": _SUPPORTED_SEASONS}


@router.get("/{year}/races")
def races(year: int):
    if year not in _SUPPORTED_SEASONS:
        raise HTTPException(status_code=404, detail=f"Season {year} not supported")
    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schedule: {e}")

    out = []
    for _, row in schedule.iterrows():
        out.append({
            "season":     year,
            "round":      _int(row.get("RoundNumber")),
            "event_name": _str(row.get("EventName")),
            "location":   _str(row.get("Location")),
            "country":    _str(row.get("Country")),
            "date":       _str(row.get("EventDate"))[:10],
        })
    if not out:
        raise HTTPException(status_code=404, detail="No races found")
    return {"season": year, "races": out}


@router.get("/{year}/races/{round_number}")
def race(year: int, round_number: int):
    """
    Full race data — results + per-driver strategy analytics + race-level derived metrics.
    Shape matches the new RaceDashboard frontend exactly.
    """
    if year not in _SUPPORTED_SEASONS:
        raise HTTPException(status_code=404, detail=f"Season {year} not supported")

    # ── Load session (with laps for strategy analytics) ────────────────────
    try:
        session = fastf1.get_session(year, round_number, "R")
        session.load(laps=True, telemetry=False, weather=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load race session: {e}")

    # ── Event metadata ──────────────────────────────────────────────────────
    event      = session.event
    event_name = _str(event.get("EventName"), "Grand Prix")
    location   = _str(event.get("Location"),  "—")
    date       = str(event.get("EventDate", ""))[:10]

    # ── Results DataFrame ───────────────────────────────────────────────────
    results_df = session.results
    if results_df is None or results_df.empty:
        raise HTTPException(status_code=404, detail="No race results found for this session.")

    cols = set(results_df.columns)

    # average stops — computed after lap stats, needed for risk scoring
    raw_drivers = []
    for _, row in results_df.iterrows():
        pos_raw  = row.get("Position") if "Position" in cols else None
        if pos_raw is None or (isinstance(pos_raw, float) and math.isnan(pos_raw)):
            pos_raw = row.get("ClassifiedPosition")

        finish   = _int(pos_raw, 99)
        grid     = _int(row.get("GridPosition") if "GridPosition" in cols else None, 0)
        abbr     = _str(row.get("Abbreviation") if "Abbreviation"  in cols else None, "???")
        name     = _str(row.get("FullName")      if "FullName"      in cols else None, abbr)
        team     = _str(row.get("TeamName")      if "TeamName"      in cols else None, "Unknown")
        status   = _str(row.get("Status")        if "Status"        in cols else None, "Finished")
        points   = _float(row.get("Points")      if "Points"        in cols else None, 0.0)
        pos_gain = (grid - finish) if grid > 0 else 0

        lap_stats = _driver_lap_stats(session, abbr)

        raw_drivers.append({
            "driver_code":            abbr,
            "driver_name":            name,
            "team":                   team,
            "finish":                 finish,
            "grid":                   grid,
            "status":                 status,
            "points":                 points,
            "positions_gained":       pos_gain,
            **lap_stats,
        })

    # sort by finish
    raw_drivers.sort(key=lambda d: d["finish"])

    # average stops for risk scoring
    all_stops  = [d["stops"] for d in raw_drivers]
    avg_stops  = sum(all_stops) / len(all_stops) if all_stops else 1.0
    winner_stops = raw_drivers[0]["stops"] if raw_drivers else 1

    # ── Enrich with risk & simulation ──────────────────────────────────────
    drivers_out = []
    for d in raw_drivers:
        drivers_out.append({
            "driver_code":            d["driver_code"],
            "driver_name":            d["driver_name"],
            "team":                   d["team"],
            "finish":                 d["finish"],
            "grid":                   d["grid"],
            "status":                 d["status"],
            "points":                 d["points"],
            "positions_gained":       d["positions_gained"],
            "stops":                  d["stops"],
            "tyre_sequence":          d["tyre_sequence"],
            "longest_stint":          d["longest_stint"],
            "tyre_degradation_index": d["tyre_degradation_index"],
            "pit_efficiency":         d["pit_efficiency"],
            "consistency_index":      d["consistency_index"],
            "strategy_risk":          _strategy_risk(d["stops"], d["positions_gained"], avg_stops),
            "strategy_simulation":    _strategy_simulation(d["stops"], d["positions_gained"], winner_stops),
        })

    derived = _derive_race_meta(drivers_out)

    return {
        "season":     year,
        "round":      round_number,
        "event_name": event_name,
        "location":   location,
        "date":       date,
        "drivers":    drivers_out,
        "winner":     drivers_out[0] if drivers_out else None,
        "derived":    derived,
    }
