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
