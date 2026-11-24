from f1data.sources.jolpica import PitStopRow, ResultRow, ScheduleEntry
from f1data.sources.tracinginsights import Lap


def lap(n, time=90.0, compound="SOFT", stint=1, life="auto", status="1", pin=False, pout=False, **kw):
    return Lap(
        lap=n, time_s=time, compound=compound, stint=stint, tyre_life=n if life == "auto" else life,
        fresh=True, position=1, track_status=status, pit_in=pin, pit_out=pout, deleted=False, team="T",
        air_temp=25.0, track_temp=40.0, humidity=50.0, rainfall=False, **kw,
    )


def result(code="VER", finish=1, grid=1, classified=True, pit_lane=False, status="Finished", laps=50, number=1):
    return ResultRow(
        driver_id=code.lower(), driver_code=code, driver_number=number, driver_name=f"Driver {code}",
        nationality=None, constructor="Team", grid=None if pit_lane else grid, pit_lane_start=pit_lane,
        finish=finish, classified=classified, status=status, points=25.0 if finish == 1 else 0.0, laps=laps,
    )


ENTRY = ScheduleEntry(season=2024, round=1, event_name="Test GP", location="Testville", country="Testland", date="2024-03-02")
STOP = PitStopRow(driver_id="ver", stop=1, lap=20, duration_s=22.5)
