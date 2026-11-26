import { gauss, rng } from "./rng";
import { NOISE_S, lapTime, overtakingEase, slowLapTime, wetnessAt } from "./physics";
import type { Compound, Dry, ModeKey, PlanStint, PlayerRules, RaceEvents, SimCircuit, SimModel, Weather } from "./types";
import { DEFAULT_RULES, DRY } from "./types";

export type CarSpec = {
  code: string;
  name: string;
  team: string;
  color: string | null;
  car: number; // team + driver (+ trim) offset, seconds a lap
  grid: number; // 1-based starting slot
  plan: PlanStint[];
  player?: boolean;
};

export type RaceConfig = {
  model: SimModel;
  circuit: SimCircuit;
  total: number;
  cars: CarSpec[];
  weather: Weather;
  trackTemp: number;
  events: RaceEvents;
  seed: number;
  /** The player's car takes commands lap by lap instead of following its plan. */
  manualPlayer?: boolean;
  /** The player's car is run by the engineers like any other (used when the advisor looks ahead). */
  copilot?: boolean;
  /** How the player's engineers act when following a plan. */
  rules?: PlayerRules;
};

/** `pit` boxes the player's car at the end of this lap; `hold` keeps it out when the engineers would have boxed. */
export type Command = { pit?: Compound | null; mode?: ModeKey; hold?: boolean };
export type Flag = "green" | "vsc" | "sc";
export type RaceEvent = { lap: number; kind: "sc" | "vsc" | "red" | "green" | "rain" | "dry" | "pit" | "info"; text: string; code?: string };

type CarState = {
  spec: CarSpec;
  idx: number;
  t: number;
  compound: Compound;
  age: number;
  mode: ModeKey;
  plan: PlanStint[];
  stintIdx: number;
  stintLap: number;
  pits: number[];
  laps: number[];
  positions: number[];
  compounds: Compound[];
  used: Set<Compound>;
  jitter: number;
  wetDelay: number;
  dsq: boolean;
  outLap: number; // the lap a car retires on (Infinity: it finishes)
};

export type CarResult = {
  code: string;
  name: string;
  team: string;
  color: string | null;
  position: number;
  total: number;
  gap: number;
  stops: number;
  pits: number[];
  laps: number[];
  positions: number[];
  compounds: Compound[];
  dsq: boolean;
  dnf: number | null; // lap of retirement
  player: boolean;
};

export type Standing = {
  code: string;
  name: string;
  color: string | null;
  compound: Compound;
  age: number;
  gap: number;
  interval: number;
  lastLap: number | null;
  player: boolean;
  stops: number;
  out: boolean;
  /** places gained (positive) or lost on the last lap */
  change: number;
};

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const FORM_S = 0.38; // race-to-race spread of a driver's pace (set-up, conditions, luck)
export const DNF_P = 0.07; // chance a car does not finish
const START_GAP_S = 0.3;
const BUNCH_S = 1.1;
const RESTART_GAP_S = 0.4; // cars line up on the grid again after a red flag
const isWetTyre = (c: Compound) => c === "INTERMEDIATE" || c === "WET";

/** A lap-by-lap race of the whole field: tyres, fuel, traffic, safety cars, rain and pit decisions. */
export class Race {
  readonly cfg: RaceConfig;
  lap = 0;
  readonly cars: CarState[];
  readonly feed: RaceEvent[] = [];
  private order: number[];
  private rand: () => number;
  private wasWet = false;
  private lastFlag: Flag = "green";
  private restartLap = -1;
  /** the race is stopped under a red flag and waiting for `restart()` */
  suspended = false;
  /** safety cars, VSCs and red flags: a copy, so race control can add to it without touching the scenario */
  readonly events: Required<RaceEvents>;

  constructor(cfg: RaceConfig) {
    this.cfg = cfg;
    this.events = { sc: [...cfg.events.sc], vsc: [...cfg.events.vsc], red: [...(cfg.events.red ?? [])] };
    this.rand = rng(cfg.seed);
    this.cars = cfg.cars.map((spec, idx) => {
      const first = spec.plan[0];
      return {
        spec,
        idx,
        t: (spec.grid - 1) * START_GAP_S,
        compound: first.compound,
        age: first.startAge ?? 0,
        mode: first.mode ?? "standard",
        plan: spec.plan,
        stintIdx: 0,
        stintLap: 0,
        pits: [],
        laps: [],
        positions: [],
        compounds: [],
        used: new Set<Compound>([first.compound]),
        jitter: gauss(this.rand) * FORM_S,
        wetDelay: -1,
        dsq: false,
        outLap: this.rand() < DNF_P ? 2 + Math.floor(this.rand() * (cfg.total - 2)) : Infinity,
      };
    });
    this.order = this.ranked().map((c) => c.idx);
  }

  /** Running cars by time, then retired cars, latest retirement first. */
  private ranked(): CarState[] {
    return [...this.cars].sort((a, b) => Number(a.outLap <= this.lap) - Number(b.outLap <= this.lap) || (a.outLap <= this.lap ? b.outLap - a.outLap : a.t - b.t));
  }

  get finished(): boolean {
    return this.lap >= this.cfg.total;
  }

  flagAt(lap: number): Flag {
    const within = (p: { start: number; laps: number }) => lap >= p.start && lap < p.start + p.laps;
    if (this.events.sc.some(within)) return "sc";
    if (this.events.vsc.some(within)) return "vsc";
    return "green";
  }

  wetnessNow(lap = this.lap + 1): number {
    return wetnessAt(this.cfg.weather, lap);
  }

  /** Run one lap. `command` only matters for the player's car in manual mode. */
  step(command: Command = {}): { flag: Flag; wetness: number; events: RaceEvent[] } {
    const { model, circuit: k, total } = this.cfg;
    if (this.suspended) return { flag: "green", wetness: this.wetnessNow(), events: [] };
    const lap = this.lap + 1;
    const flag = this.flagAt(lap);
    const wet = wetnessAt(this.cfg.weather, lap);
    const events: RaceEvent[] = [];
    const say = (kind: RaceEvent["kind"], text: string, code?: string) => events.push({ lap, kind, text, code });

    if (flag !== this.lastFlag) {
      if (flag === "sc") say("sc", "Safety car out");
      else if (flag === "vsc") say("vsc", "Virtual safety car");
      else say("green", "Back to green");
      this.lastFlag = flag;
    }
    if (!this.wasWet && wet > 0.15) {
      say("rain", "Rain on the track");
      this.wasWet = true;
    } else if (this.wasWet && wet < 0.08) {
      say("dry", "The track is dry again");
      this.wasWet = false;
    }

    const gapAhead = new Map<number, number>();
    this.order.forEach((id, pos) => {
      if (pos > 0 && this.cars[id].outLap > this.lap) gapAhead.set(id, this.cars[id].t - this.cars[this.order[pos - 1]].t);
    });
    const dirty = 0.1 + 0.5 * (1 - overtakingEase(k));
    const pitLoss = k.pit_loss_s * (flag === "sc" ? 0.55 : flag === "vsc" ? 0.7 : 1);

    for (const c of this.cars) {
      if (c.outLap <= this.lap) {
        c.laps.push(0);
        c.compounds.push(c.compound);
        continue;
      }
      if (c.outLap === lap) {
        say("info", `${c.spec.code} retires`, c.spec.code);
      }
      const manual = !!this.cfg.manualPlayer && !!c.spec.player;
      if (manual && command.mode) c.mode = command.mode;
      let into: Compound | null;
      if (c.spec.player && command.pit) into = command.pit;
      else if (manual || (c.spec.player && command.hold)) into = null;
      else into = this.decide(c, flag, wet, lap);
      let t: number;
      if (flag === "green") {
        t = lapTime(model, k, { compound: c.compound, age: c.age, lap, total, car: c.spec.car + c.jitter, mode: c.mode, trackTemp: this.cfg.trackTemp, wetness: wet });
        t += NOISE_S * gauss(this.rand);
        const gap = gapAhead.get(c.idx);
        if (gap !== undefined && gap < 1.5) t += dirty * (1 - gap / 1.5);
        if (lap === 1 || lap === this.restartLap) t += 2.5; // standing start
      } else {
        t = slowLapTime(k, flag) + 0.2 * gauss(this.rand);
      }
      c.compounds.push(c.compound);
      if (into && lap < total) {
        t += pitLoss + 0.35 * gauss(this.rand) + (this.rand() < 0.03 ? 3 + 5 * this.rand() : 0);
        c.pits.push(lap);
        const from = c.compound;
        c.compound = into;
        c.used.add(into);
        const planned = c.plan[c.stintIdx + 1];
        c.age = planned && planned.compound === into ? (planned.startAge ?? 0) : 0;
        c.stintLap = 0;
        c.stintIdx = Math.min(c.stintIdx + 1, c.plan.length - 1);
        if (!manual) c.mode = c.plan[c.stintIdx].mode ?? "standard";
        if (c.spec.player) say("pit", `Box: ${from[0]} to ${into[0]}`, c.spec.code);
      } else {
        c.age += flag === "sc" ? 0.35 : flag === "vsc" ? 0.6 : 1;
        c.stintLap += 1;
      }
      c.laps.push(t);
      c.t += t;
    }

    if (flag === "sc") this.bunchUp(lap);
    this.lap = lap;
    this.order = this.ranked().map((c) => c.idx);
    this.order.forEach((id, pos) => this.cars[id].positions.push(pos + 1));
    if (this.finished) this.checkRules(events);
    else if (this.events.red.includes(lap)) this.stopRace(events, "Red flag: the race is stopped");
    this.feed.push(...events);
    return { flag, wetness: wet, events };
  }

  /** Behind the safety car the field closes up. */
  private bunchUp(lap: number): void {
    const sorted = this.cars.filter((c) => c.outLap > lap).sort((a, b) => a.t - b.t);
    for (let i = 1; i < sorted.length; i++) {
      const limit = sorted[i - 1].t + BUNCH_S;
      if (sorted[i].t > limit) sorted[i].t = limit;
    }
  }

  private slickFor(c: CarState, left: number): Dry {
    const wanted: Dry = left > 24 ? "HARD" : "MEDIUM";
    const distinct = DRY.filter((d) => c.used.has(d));
    if (distinct.length < 2 && distinct.includes(wanted)) return DRY.find((d) => !c.used.has(d) && d !== "SOFT") ?? "MEDIUM";
    return wanted;
  }

  /** What an engineer-driven car does this lap: the plan, plus the reactions every real team has. */
  private decide(c: CarState, flag: Flag, wet: number, lap: number): Compound | null {
    const left = this.cfg.total - lap;
    if (left <= 0) return null;
    const cur = c.plan[c.stintIdx];
    const next = c.plan[c.stintIdx + 1];
    const rules = c.spec.player && !this.cfg.copilot ? (this.cfg.rules ?? DEFAULT_RULES) : null;
    const engineered = !c.spec.player || !!this.cfg.copilot;
    // weather: wait a lap or two after it crosses the threshold, as teams do
    const reacts = rules ? rules.rainReact : true;
    const wantWet = reacts && wet > 0.38 && !isWetTyre(c.compound);
    const wantDry = reacts && wet < 0.2 && isWetTyre(c.compound);
    const wantFull = reacts && wet > 0.82 && c.compound === "INTERMEDIATE";
    if (wantWet || wantDry || wantFull) {
      if (c.wetDelay < 0) c.wetDelay = rules ? rules.rainDelay : Math.floor(this.rand() * 3);
      if (c.wetDelay > 0) {
        c.wetDelay -= 1;
        return null;
      }
      c.wetDelay = -1;
      const to: Compound = wantDry ? this.slickFor(c, left) : wet > 0.75 || wantFull ? "WET" : "INTERMEDIATE";
      c.plan = [{ compound: c.compound, laps: 0 }, { compound: to, laps: 999, mode: "standard" }];
      c.stintIdx = 0;
      return to;
    }
    c.wetDelay = -1;
    if (cur && next) {
      const last = c.stintLap + 1 >= cur.laps;
      const at = rules ? rules.scAt : 0.55;
      const cheap = rules && !rules.scStops ? false : flag === "sc" ? c.stintLap + 1 >= at * cur.laps : flag === "vsc" ? c.stintLap + 1 >= Math.min(0.95, at + 0.2) * cur.laps : false;
      if (last || cheap) return next.compound;
    }
    // a tyre that is long past anything seen at this circuit comes off
    if (engineered && !isWetTyre(c.compound) && left > 3 && c.age > this.cfg.circuit.max_age[c.compound as Dry] * 1.12) {
      const to = this.slickFor(c, left);
      c.plan = [{ compound: c.compound, laps: 0 }, { compound: to, laps: 999 }];
      c.stintIdx = 0;
      return to;
    }
    // the two-compound rule, for cars that would otherwise break it
    if (!isWetTyre(c.compound) && engineered && left === 8) {
      const dry = DRY.filter((d) => c.used.has(d));
      const anyWet = [...c.used].some(isWetTyre);
      if (!anyWet && dry.length < 2) return c.compound === "HARD" ? "MEDIUM" : "HARD";
    }
    return null;
  }

  /** The tyre a car fits under a red flag: the quickest that can last the rest of the race, or a wet if it is wet. */
  private redTyre(c: CarState): Compound {
    const left = this.cfg.total - this.lap;
    const wet = this.wetnessNow();
    if (wet > 0.38) return wet > 0.75 ? "WET" : "INTERMEDIATE";
    const k = this.cfg.circuit;
    const lasts = (d: Dry) => k.max_age[d] * 1.05 >= left;
    const order: Dry[] = ["SOFT", "MEDIUM", "HARD"];
    let pick: Dry = order.find(lasts) ?? "HARD";
    const dry = DRY.filter((d) => c.used.has(d));
    const wetUsed = [...c.used].some(isWetTyre);
    if (!wetUsed && dry.length < 2 && dry.includes(pick)) pick = order.find((d) => !c.used.has(d) && lasts(d)) ?? order.find((d) => !c.used.has(d)) ?? pick;
    return pick;
  }

  private stopRace(events: RaceEvent[], text: string): void {
    const running = this.cars.filter((c) => c.outLap > this.lap).sort((a, b) => a.t - b.t);
    const lead = running[0]?.t ?? 0;
    running.forEach((c, i) => {
      c.t = lead + i * RESTART_GAP_S;
    });
    this.suspended = true;
    events.push({ lap: this.lap, kind: "red", text });
    if (!this.cfg.manualPlayer) this.restart(undefined, events);
  }

  /** Stop the race now (race control, or the player testing a red flag). Cars line up in running order; tyres change for free. */
  callRedFlag(): RaceEvent[] {
    if (this.finished || this.suspended || this.lap < 1) return [];
    const events: RaceEvent[] = [];
    this.stopRace(events, "Red flag: the race is stopped");
    this.feed.push(...events);
    return events;
  }

  /** Restart from a red flag. `playerTyre` is the player's free tyre change (omit to stay on the same set); everyone else
   *  fits what their engineers pick. The first lap back is a standing start. */
  restart(playerTyre?: Compound | null, sink?: RaceEvent[], forcePlayer = false): RaceEvent[] {
    if (!this.suspended) return [];
    const events: RaceEvent[] = sink ?? [];
    for (const c of this.cars) {
      if (c.outLap <= this.lap) continue;
      const manual = (!!this.cfg.manualPlayer || forcePlayer) && !!c.spec.player;
      const planned = c.plan[c.stintIdx + 1];
      let to: Compound | null;
      if (manual) to = playerTyre ?? null;
      else if (c.spec.player && !this.cfg.copilot && planned) to = planned.compound;
      else to = this.redTyre(c);
      if (to && (to !== c.compound || c.age > 0)) {
        const from = c.compound;
        c.compound = to;
        c.used.add(to);
        c.age = 0;
        c.stintLap = 0;
        c.plan = [{ compound: from, laps: 0 }, { compound: to, laps: 999 }];
        c.stintIdx = 0;
        if (c.spec.player) events.push({ lap: this.lap, kind: "info", text: `Fresh ${to.toLowerCase()}s fitted under the red flag`, code: c.spec.code });
      }
    }
    this.suspended = false;
    this.restartLap = this.lap + 1;
    events.push({ lap: this.lap + 1, kind: "green", text: "Standing restart" });
    if (!sink) this.feed.push(...events);
    return events;
  }

  /** Race control: send out a safety car or VSC from the next lap. */
  deploy(kind: "sc" | "vsc", laps: number): RaceEvent[] {
    if (this.finished || this.suspended || this.lap < 1) return [];
    this.events[kind].push({ start: this.lap + 1, laps });
    const ev: RaceEvent[] = [{ lap: this.lap, kind, text: kind === "sc" ? `Safety car called for ${laps} laps` : `VSC called for ${laps} laps` }];
    this.feed.push(...ev);
    return ev;
  }

  /** A copy of the race as it stands, for looking ahead. The future is re-drawn: retirements, safety cars and the weather
   *  are not known to whoever is looking ahead, so each copy gets its own `seed` and `patch`. */
  clone(seed: number, patch: Partial<RaceConfig> = {}): Race {
    const r = new Race({ ...this.cfg, ...patch, seed });
    r.lap = this.lap;
    r.wasWet = this.wasWet;
    r.lastFlag = this.lastFlag;
    r.restartLap = this.restartLap;
    r.suspended = this.suspended;
    const left = Math.max(1, this.cfg.total - this.lap);
    r.cars.forEach((c, i) => {
      const o = this.cars[i];
      Object.assign(c, {
        t: o.t, compound: o.compound, age: o.age, mode: o.mode, plan: o.plan, stintIdx: o.stintIdx, stintLap: o.stintLap,
        pits: [...o.pits], laps: [...o.laps], positions: [...o.positions], compounds: [...o.compounds], used: new Set(o.used),
        jitter: o.jitter, wetDelay: o.wetDelay, dsq: o.dsq,
      });
      const alive = o.outLap > this.lap;
      c.outLap = alive ? (r.rand() < DNF_P * (left / this.cfg.total) ? this.lap + 1 + Math.floor(r.rand() * left) : Infinity) : o.outLap;
    });
    r.order = [...this.order];
    return r;
  }

  private checkRules(events: RaceEvent[]): void {
    for (const c of this.cars) {
      if (c.outLap <= this.lap) continue;
      const dry = DRY.filter((d) => c.used.has(d));
      const wetUsed = [...c.used].some(isWetTyre);
      if (!wetUsed && dry.length < 2) {
        c.dsq = true;
        if (c.spec.player) events.push({ lap: this.lap, kind: "info", text: "Disqualified: a dry race needs two different compounds", code: c.spec.code });
      }
    }
  }

  results(): CarResult[] {
    const ranked = this.ranked().sort(
      (a, b) => Number(a.outLap <= this.lap) - Number(b.outLap <= this.lap) || Number(a.dsq) - Number(b.dsq) || (a.outLap <= this.lap ? b.outLap - a.outLap : a.t - b.t),
    );
    const lead = ranked[0]?.t ?? 0;
    return ranked.map((c, i) => ({
      code: c.spec.code,
      name: c.spec.name,
      team: c.spec.team,
      color: c.spec.color,
      position: i + 1,
      total: c.t,
      gap: c.t - lead,
      stops: c.pits.length,
      pits: c.pits,
      laps: c.laps,
      positions: c.positions,
      compounds: c.compounds,
      dsq: c.dsq,
      dnf: c.outLap <= this.lap ? c.outLap : null,
      player: !!c.spec.player,
    }));
  }

  /** Current running order for display. */
  standings(): Standing[] {
    const lead = this.cars[this.order[0]]?.t ?? 0;
    return this.order.map((id, pos) => {
      const c = this.cars[id];
      const ahead = pos > 0 ? this.cars[this.order[pos - 1]].t : c.t;
      return {
        code: c.spec.code,
        name: c.spec.name,
        color: c.spec.color,
        compound: c.compound,
        age: Math.round(c.age),
        gap: c.t - lead,
        interval: c.t - ahead,
        lastLap: c.laps.length ? c.laps[c.laps.length - 1] : null,
        player: !!c.spec.player,
        stops: c.pits.length,
        out: c.outLap <= this.lap,
        change: c.positions.length > 1 ? c.positions[c.positions.length - 2] - c.positions[c.positions.length - 1] : 0,
      };
    });
  }

  runToEnd(): CarResult[] {
    while (!this.finished) this.step();
    return this.results();
  }

  player(): CarState | null {
    return this.cars.find((c) => c.spec.player) ?? null;
  }
}

export type { Weather, SimModel, SimCircuit };
