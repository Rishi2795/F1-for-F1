/* ================= TYPES ================= */

type Driver = {
  driver_code: string;
  finish: number;
  grid: number;
  positions_gained: number;
  consistency_index?: number;
  tyre_degradation_index?: number;
};

type AIInsight = {
  dnf_probability?: number;
};

type Telemetry = {
  avg_speed?: number;
};

type PitStrategy = {
  avg_pit_time?: number;
};

type Props = {
  drivers: Driver[];
  ai: Record<string, AIInsight>;
  telemetry: Telemetry | null;
  pit: PitStrategy | null;
};

/* ================= MAIN ================= */

export default function PerformanceIndex({
  drivers,
  ai,
  telemetry,
  pit,
}: Props) {

  if (!drivers || drivers.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto mt-24">

      {/* TITLE */}
      <h2 className="text-lg font-black uppercase tracking-widest mb-6">
        Race Performance Index
      </h2>

      <div className="bg-[#0b0b0b] border border-white/10 rounded-xl p-6">

        {drivers
          .map((d) => {

            const score = calculateScore(
              d,
              ai?.[d.driver_code],
              telemetry,
              pit
            );

            return {
              ...d,
              score,
            };
          })
          .sort((a, b) => b.score - a.score)
          .map((d, i) => (

            <Row
              key={d.driver_code}
              rank={i + 1}
              driver={d.driver_code}
              score={d.score}
              finish={d.finish}
            />

          ))}

      </div>

    </section>
  );
}

/* ================= ROW ================= */

function Row({ rank, driver, score, finish }: any) {
  return (
    <div className="flex justify-between items-center border-b border-white/5 py-3">

      <div className="flex items-center gap-4">

        <span className="text-zinc-500 text-sm">
          #{rank}
        </span>

        <span className="font-black text-lg">
          {driver}
        </span>

        <span className="text-xs text-zinc-500">
          P{finish}
        </span>

      </div>

      <div className="flex items-center gap-4">

        <Bar value={score} />

        <span className="font-black text-red-500 w-12 text-right">
          {score}
        </span>

      </div>

    </div>
  );
}

/* ================= BAR ================= */

function Bar({ value }: any) {
  return (
    <div className="w-32 h-2 bg-zinc-800 rounded overflow-hidden">

      <div
        className="h-full bg-red-500 transition-all"
        style={{ width: `${value}%` }}
      />

    </div>
  );
}

/* ================= SCORE ENGINE ================= */

function calculateScore(
  d: any,
  ai: any,
  telemetry: any,
  pit: any
) {

  let score = 0;

  /* FINISH */
  score += Math.max(0, 100 - d.finish * 4);

  /* RACECRAFT */
  score += (d.positions_gained || 0) * 3;

  /* SPEED */
  if (telemetry?.avg_speed) {
    score += Math.min(20, telemetry.avg_speed / 10);
  }

  /* CONSISTENCY */
  score += (d.consistency_index ?? 50) * 0.4;

  /* TYRES */
  if (d.tyre_degradation_index !== undefined) {
    score += Math.max(0, 100 - d.tyre_degradation_index) * 0.2;
  }

  /* RELIABILITY */
  if (ai?.dnf_probability !== undefined) {
    score += Math.max(0, 20 - ai.dnf_probability * 20);
  }

  /* PIT */
  if (pit?.avg_pit_time) {
    score += Math.max(0, 15 - pit.avg_pit_time);
  }

  /* NORMALIZE */
  return Math.min(
    100,
    Math.max(0, Math.round(score))
  );
}