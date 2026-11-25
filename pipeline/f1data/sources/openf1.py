"""OpenF1: free historical stints/tyres for 2023+. Used as a fallback when the
TracingInsights snapshot lacks a race. No key required."""

from __future__ import annotations

from dataclasses import dataclass

from .. import config
from ..errors import SourceFormatError, SourceUnavailable
from ..http import HttpClient
from ..logging_setup import get_logger
from ..normalize import to_int, to_str

log = get_logger("openf1")


@dataclass(frozen=True)
class OpenF1Stint:
    driver_number: int
    stint_number: int
    lap_start: int
    lap_end: int | None  # None for a stint still running at the flag
    compound: str | None
    tyre_age_at_start: int | None


class OpenF1Source:
    name = "openf1"

    def __init__(self, http: HttpClient | None = None) -> None:
        self.http = http or HttpClient("openf1", config.OPENF1_BASE, min_interval=0.5)

    def race_session_key(self, season: int, date: str) -> int | None:
        """Find the Race session whose start date (UTC day) matches ``date``."""
        data = self.http.get_json("sessions", {"year": season, "session_name": "Race"})
        if isinstance(data, dict):  # {"detail": "No results found."}
            return None
        if not isinstance(data, list):
            raise SourceFormatError("openf1: sessions payload is not a list")
        for session in data:
            if str(session.get("date_start", ""))[:10] == date:
                return to_int(session.get("session_key"))
        return None

    def lap_positions(self, session_key: int, driver_number: int, lap_number: int) -> list[tuple[float, float]]:
        """The car's (x, y) track coordinates through one lap, in time order (about 3.7 samples a second)."""
        from datetime import datetime, timedelta

        try:
            lap = self.http.get_json(
                "laps", {"session_key": session_key, "driver_number": driver_number, "lap_number": lap_number}
            )
        except SourceUnavailable:
            return []
        if not isinstance(lap, list) or not lap or None in (lap[0].get("date_start"), lap[0].get("lap_duration")):
            return []
        start = datetime.fromisoformat(str(lap[0]["date_start"]))
        end = start + timedelta(seconds=float(lap[0]["lap_duration"]))
        try:
            rows = self.http.get_json(
                "location",
                {
                    "session_key": session_key,
                    "driver_number": driver_number,
                    "date>": start.isoformat(),
                    "date<": end.isoformat(),
                },
            )
        except SourceUnavailable:
            return []
        if not isinstance(rows, list):
            return []
        return [(float(r["x"]), float(r["y"])) for r in rows if r.get("x") is not None and r.get("y") is not None]

    def session_laps(self, session_key: int) -> list[dict]:
        """Every lap of the session (all drivers): start time, duration, sector times, pit-out flag."""
        try:
            data = self.http.get_json("laps", {"session_key": session_key})
        except SourceUnavailable:
            return []
        return data if isinstance(data, list) else []

    def lap_samples(self, session_key: int, driver_number: int, start, seconds: float) -> tuple[list[dict], list[dict]]:
        """One lap's raw samples: (position rows, car rows). Position is about 3.7 a second, car data about 3.7 too.

        ``start`` is the lap's start as a datetime. Either list is empty when the source has nothing for the window."""
        from datetime import timedelta

        window = {
            "session_key": session_key,
            "driver_number": driver_number,
            "date>": start.isoformat(),
            "date<": (start + timedelta(seconds=seconds)).isoformat(),
        }
        out: list[list[dict]] = []
        for kind in ("location", "car_data"):
            try:
                rows = self.http.get_json(kind, window)
            except SourceUnavailable:
                rows = []
            out.append(rows if isinstance(rows, list) else [])
        return out[0], out[1]

    def race_control(self, session_key: int) -> list[dict]:
        """Race-control messages (flags, incidents, penalties, safety cars), each with its time and often the car."""
        try:
            data = self.http.get_json("race_control", {"session_key": session_key})
        except SourceUnavailable:
            return []
        return data if isinstance(data, list) else []

    def stints(self, session_key: int) -> list[OpenF1Stint]:
        try:
            data = self.http.get_json("stints", {"session_key": session_key})
        except SourceUnavailable:
            return []
        if not isinstance(data, list):
            return []
        out: list[OpenF1Stint] = []
        for item in data:
            number, num, start, end = (
                to_int(item.get("driver_number")), to_int(item.get("stint_number")),
                to_int(item.get("lap_start")), to_int(item.get("lap_end")),
            )
            if None in (number, num, start):
                continue
            compound = to_str(item.get("compound"))
            out.append(
                OpenF1Stint(
                    driver_number=number, stint_number=num, lap_start=start, lap_end=end,
                    compound=None if compound in (None, "UNKNOWN") else compound.upper(),
                    tyre_age_at_start=to_int(item.get("tyre_age_at_start")),
                )
            )
        return out
