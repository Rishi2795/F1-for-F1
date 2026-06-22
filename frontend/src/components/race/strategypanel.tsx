/* ================= TYPES ================= */

type PitStrategy = {
  avg_pit_time: number;
  total_pitstops: number;
  pit_loss_avg: number;
  tyre_sequences: Record<string, string>;
};

type Driver = {
  driver_code: string;
  stops: number;
  finish: number;
};

type Props = {
  insights: any;
  drivers: Driver[];
};

/* ================= MAIN ================= */

export default function StrategyPanel({
  insights,
  drivers,
}: Props) {

  const pit: PitStrategy | undefined =
    insights?.pit_strategy;

  /* ================= SAFETY ================= */

  if (!pit || !drivers || drivers.length === 0) {
    return (
      <section className="max-w-7xl mx-auto mt-24 text-zinc-500 text-center">
        Strategy data not available
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto mt-24">

      {/* TITLE */}
      <h2 className="text-lg font-black uppercase tracking-widest mb-6">
        Strategy & Pit Intelligence
      </h2>

      {/* OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

        <Stat
          label="Avg Pit Time"
          value={`${pit.avg_pit_time?.toFixed(2) ?? "0.00"}s`}
        />

        <Stat
          label="Total Pit Stops"
          value={pit.total_pitstops ?? 0}
        />

        <Stat
          label="Avg Pit Loss"
          value={`${pit.pit_loss_avg?.toFixed(2) ?? "0.00"}s`}
        />

      </div>

      {/* DRIVER STRATEGIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {drivers.map((d) => {

          const seq =
            pit.tyre_sequences?.[d.driver_code] || "N/A";

          const strategyType = getStrategyType(d.stops);

          return (
            <div
              key={d.driver_code}
              className="bg-[#0b0b0b] border border-white/10 rounded-xl p-5"
            >

              {/* HEADER */}
              <div className="flex justify-between mb-3">

                <h3 className="font-black text-lg">
                  {d.driver_code}
                </h3>

                <span className="text-sm text-red-500 font-bold">
                  P{d.finish}
                </span>

              </div>

              {/* DATA */}
              <div className="space-y-2 text-sm text-zinc-300">

                <p>
                  Stops:{" "}
                  <span className="font-bold text-white">
                    {d.stops}
                  </span>
                </p>

                <p>
                  Tyres:{" "}
                  <span className="font-bold">
                    {seq}
                  </span>
                </p>

                <p>
                  Strategy:{" "}
                  <span className="font-bold text-red-500">
                    {strategyType}
                  </span>
                </p>

              </div>

              {/* TAG */}
              <div className="mt-4">

                <span
                  className={`text-[10px] uppercase px-2 py-1 rounded ${getTagColor(
                    strategyType
                  )}`}
                >
                  {strategyType}
                </span>

              </div>

            </div>
          );
        })}

      </div>

    </section>
  );
}

/* ================= HELPERS ================= */

const Stat = ({ label, value }: any) => (
  <div className="bg-black/40 border border-white/10 p-4 rounded">

    <p className="text-xs uppercase text-zinc-500 mb-1">
      {label}
    </p>

    <p className="text-2xl font-black text-white">
      {value}
    </p>

  </div>
);


function getStrategyType(stops: number) {
  if (stops <= 1) return "One-Stop";
  if (stops === 2) return "Two-Stop";
  if (stops === 3) return "Aggressive";
  return "High-Risk";
}

function getTagColor(type: string) {
  switch (type) {
    case "One-Stop":
      return "bg-green-600/20 text-green-400";

    case "Two-Stop":
      return "bg-blue-600/20 text-blue-400";

    case "Aggressive":
      return "bg-orange-600/20 text-orange-400";

    case "High-Risk":
      return "bg-red-600/20 text-red-400";

    default:
      return "bg-zinc-600/20 text-zinc-400";
  }
}