import { cleanLaps, pitLaps, quantile } from "./laps";
import type { DriverRace, LapDoc } from "../types/api";

export type Moment = { lap: number; kind: "PIT" | "OFF_PACE" | "POSITIONS" | "GAP" | "OUT" | "UNDERCUT"; text: string; seconds: number; time: number | null };
export type Loss = { pits: number; offPace: number; offLaps: number; flags: number; typical: number | null };

/** Where one driver lost time in a race, measured against their own clean pace, and what to look at first. */
export function whatWentWrong(doc: LapDoc, drivers: DriverRace[], code: string): { moments: Moment[]; loss: Loss } | null {
  const lap = doc.drivers.find((d) => d.code === code);
  const car = drivers.find((d) => d.driver_code === code);
  if (!lap || !car) return null;
  const pits = pitLaps(car);
  const clean = cleanLaps(lap, doc.status, pits);
  if (clean.length < 8) return null;
  const typical = quantile(clean.map((l) => l.time), 0.5);
  const endOf = (n: number) => lap.end?.[n - 1] ?? null;
  const moments: Moment[] = [];
  const loss: Loss = { pits: 0, offPace: 0, offLaps: 0, flags: 0, typical };

  lap.lap_times.forEach((time, i) => {
    const n = i + 1;
    if (time === null || n === 1) return;
    const extra = time - typical;
    const flagged = doc.status[i] !== "G";
    if (flagged) {
      if (extra > 0) loss.flags += extra;
      return;
    }
    if (pits.has(n)) {
      if (extra > 5) {
        loss.pits += extra;
        if ((car.stints ?? []).some((s) => s.lap_end === n)) moments.push({ lap: n, kind: "PIT", text: `Pit stop: the in-lap and out-lap cost about ${extra.toFixed(1)}s against normal pace`, seconds: extra, time: endOf(n) });
      }
      return;
    }
    if (time > typical * 1.015 && extra > 0.8) {
      loss.offPace += extra;
      loss.offLaps += 1;
      if (extra > 1.5) moments.push({ lap: n, kind: "OFF_PACE", text: `A slow lap: ${extra.toFixed(1)}s off their normal pace (traffic, a mistake or damage)`, seconds: extra, time: endOf(n) });
    }
  });

  // Positions lost on the road: a drop of two places or more in a lap that was not a pit lap or under a flag.
  const pos = car.lap_positions ?? [];
  for (let i = 1; i < pos.length; i++) {
    const before = pos[i - 1];
    const now = pos[i];
    const n = i + 1;
    if (before == null || now == null || doc.status[i] !== "G" || pits.has(n) || pits.has(n - 1)) continue;
    if (now - before >= 2) moments.push({ lap: n, kind: "POSITIONS", text: `Dropped from P${before} to P${now} on track`, seconds: (now - before) * 2, time: endOf(n) });
  }

  // The stretch where the gap to the leader grew the most.
  const gap = lap.gap;
  let worst = { from: 0, to: 0, grew: 0 };
  for (let a = 1; a < gap.length - 4; a++) {
    const b = Math.min(gap.length - 1, a + 4);
    if (gap[a] == null || gap[b] == null || doc.status.slice(a, b + 1).some((s) => s !== "G")) continue;
    if ([...Array(b - a + 1).keys()].some((k) => pits.has(a + 1 + k))) continue; // a stop is its own moment
    const grew = (gap[b] as number) - (gap[a] as number);
    if (grew > worst.grew) worst = { from: a + 1, to: b + 1, grew };
  }
  if (worst.grew > 4) moments.push({ lap: worst.from, kind: "GAP", text: `Lost ${worst.grew.toFixed(1)}s to the leader between laps ${worst.from} and ${worst.to}`, seconds: worst.grew, time: endOf(worst.from) });

  for (const u of doc.undercuts) {
    if (u.attacker === code) moments.push({ lap: u.attacker_lap, kind: "UNDERCUT", text: u.success ? `Stopped first to undercut ${u.defender}, and it worked` : `Stopped first to undercut ${u.defender}, but came out behind`, seconds: u.success ? 0 : 3, time: endOf(u.attacker_lap) });
    if (u.defender === code && u.success) moments.push({ lap: u.defender_lap, kind: "UNDERCUT", text: `Undercut by ${u.attacker}, who stopped on lap ${u.attacker_lap}`, seconds: 4, time: endOf(u.defender_lap) });
  }

  const done = lap.end?.filter((e): e is number => e !== null).length ?? 0;
  if (!car.classified && done > 0) moments.push({ lap: done, kind: "OUT", text: `Out of the race after lap ${done}: ${car.status}`, seconds: 99, time: endOf(done) });

  moments.sort((a, b) => b.seconds - a.seconds || a.lap - b.lap);
  return { moments: moments.slice(0, 6), loss };
}
