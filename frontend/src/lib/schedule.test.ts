import { describe, expect, it } from "vitest";
import { countdown, groupByMonth, nextRound, raceStart, sessionTime, weekendRange } from "./schedule";
import type { RaceIndexEntry } from "../types/api";

const race = (round: number, date: string, status: RaceIndexEntry["data_status"], sessions: RaceIndexEntry["sessions"] = []): RaceIndexEntry => ({ season: 2026, round, event_name: `GP ${round}`, location: "X", country: "Y", date, data_status: status, sessions });
const QATAR = [{ name: "Practice 1", starts: "2026-11-27T13:30:00Z" }, { name: "Qualifying", starts: "2026-11-28T18:00:00Z" }, { name: "Race", starts: "2026-11-29T16:00:00Z" }];

describe("nextRound", () => {
  it("is the first round still to be run, whatever order the list is in", () => {
    const rs = [race(23, "2026-12-06", "scheduled"), race(21, "2026-11-22", "ok"), race(22, "2026-11-29", "scheduled")];
    expect(nextRound(rs)?.round).toBe(22);
    expect(nextRound([race(1, "2026-03-08", "ok")])).toBeNull();
  });
});

describe("countdown", () => {
  it("splits time into days, hours and minutes, and stops at zero", () => {
    expect(countdown(((3 * 24 + 4) * 60 + 5) * 60_000 + 30_000)).toEqual({ days: 3, hours: 4, minutes: 5, over: false });
    expect(countdown(59_000)).toEqual({ days: 0, hours: 0, minutes: 0, over: false });
    expect(countdown(0).over).toBe(true);
    expect(countdown(-5_000).over).toBe(true);
  });
});

describe("raceStart and the weekend", () => {
  it("uses the Race session, and says so honestly when the timetable is missing", () => {
    expect(raceStart(race(22, "2026-11-29", "scheduled", QATAR))?.toISOString()).toBe("2026-11-29T16:00:00.000Z");
    expect(raceStart(race(22, "2026-11-29", "scheduled"))).toBeNull();
  });
  it("writes the weekend as a range, across a month boundary too", () => {
    expect(weekendRange(race(22, "2026-11-29", "scheduled", QATAR))).toBe("27–29 Nov");
    expect(weekendRange(race(22, "2026-11-29", "scheduled"))).toBe("29 Nov");
    expect(weekendRange(race(5, "2026-06-01", "ok", [{ name: "Practice 1", starts: "2026-05-29T11:30:00Z" }]))).toBe("29 May – 1 Jun");
  });
  it("shows a session in the viewer's time zone", () => {
    expect(sessionTime({ name: "Qualifying", starts: "2026-11-28T18:00:00Z" }, "Asia/Kolkata")).toContain("23:30");
    expect(sessionTime({ name: "Qualifying", starts: "2026-11-28T18:00:00Z" }, "UTC")).toContain("18:00");
  });
});

describe("groupByMonth", () => {
  it("groups by the month of the race, in calendar order", () => {
    const g = groupByMonth([race(2, "2026-03-15", "ok"), race(23, "2026-12-06", "scheduled"), race(1, "2026-03-08", "ok"), race(22, "2026-11-29", "scheduled")]);
    expect(g.map((m) => m.label)).toEqual(["March 2026", "November 2026", "December 2026"]);
    expect(g[0].races.map((r) => r.round)).toEqual([1, 2]);
  });
});
