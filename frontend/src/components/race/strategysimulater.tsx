import { useState } from "react";

/* ======================================================
   AI PERFORMANCE SIMULATOR (REAL DATA)
====================================================== */

export default function StrategySimulator({ drivers, aiData }: any) {

  const [selected, setSelected] = useState<string>("");


  /* ================= SAFETY ================= */

  if (!drivers || !aiData) return null;


  /* ================= SELECTED DRIVER ================= */

  const driver = drivers.find(
    (d: any) => d.driver_code === selected
  );

  const ai = selected ? aiData[selected] : null;


  /* ================= HELPERS ================= */

  const verdictColor = (label: string) => {

    if (!label) return "text-white/60";

    if (label.includes("Over")) return "text-emerald-400";
    if (label.includes("Under")) return "text-red-400";

    return "text-white/70";
  };


  /* ================= AI MESSAGE ================= */

  const aiMessage = ai
    ? ai.label.includes("Over")
      ? "Driver exceeded model expectations under current race conditions."
      : ai.label.includes("Under")
      ? "Performance fell below predicted potential. Strategic factors impacted outcome."
      : "Race result aligned closely with predictive model output."
    : "";


  /* ================= UI ================= */

  return (

    <section className="bg-black">

      <div className="max-w-[1400px] mx-auto px-6 py-16 space-y-10">


        {/* =================================================
           HEADER
        ================================================= */}

        <div>

          <div className="flex items-center gap-3">

            <div className="w-1 h-9 bg-red-600" />

            <h2 className="text-3xl font-black uppercase">
              AI Performance Simulator
            </h2>

          </div>

          <p className="text-xs text-white/40 ml-5 mt-2 uppercase">
            Prediction vs Actual Analysis
          </p>

        </div>


        {/* =================================================
           DRIVER SELECT
        ================================================= */}

        <div className="max-w-sm">

          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full h-12 px-4 rounded-lg bg-white/10
                       border border-white/20 text-white
                       font-bold uppercase text-sm"
          >

            <option value="">
              Select Driver
            </option>

            {drivers.map((d: any) => (

              <option
                key={d.driver_code}
                value={d.driver_code}
              >
                {d.driver_code}
              </option>

            ))}

          </select>

        </div>


        {/* =================================================
           EMPTY STATE
        ================================================= */}

        {!driver && (

          <div className="py-36 border border-dashed border-white/20
                          rounded-xl text-center">

            <p className="text-xs uppercase text-white/40">
              Awaiting Driver Selection
            </p>

          </div>

        )}


        {/* =================================================
           DATA VIEW
        ================================================= */}

        {driver && ai && (

          <div className="space-y-8">


            {/* ================= METRICS ================= */}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">

              <Metric
                label="Grid"
                value={driver.grid}
              />

              <Metric
                label="Predicted"
                value={ai.predicted}
              />

              <Metric
                label="Actual"
                value={ai.actual}
              />

              <Metric
                label="Delta"
                value={`${ai.delta > 0 ? "+" : ""}${ai.delta}`}
                highlight={ai.delta < 0}
              />

              <Metric
                label="Confidence"
                value={`${ai.confidence}%`}
              />

            </div>


            {/* ================= PERFORMANCE CARD ================= */}

            <div className="border border-white/10 rounded-xl
                            bg-white/5 p-6 space-y-4">

              <div className="flex justify-between items-center">

                <div>

                  <p className="text-xs uppercase text-white/40">
                    Performance Verdict
                  </p>

                  <p
                    className={`text-2xl font-black mt-1
                      ${verdictColor(ai.label)}`}
                  >
                    {ai.label}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-xs uppercase text-white/40">
                    Finish
                  </p>

                  <p className="text-xl font-black">
                    P{driver.finish}
                  </p>

                </div>

              </div>


              <div className="h-px bg-white/10" />


              <p className="text-white/80 leading-relaxed">
                {aiMessage}
              </p>

            </div>


            {/* ================= CONTEXT ================= */}

            <div className="grid sm:grid-cols-3 gap-6">

              <Info
                label="Team"
                value={driver.team}
              />

              <Info
                label="Positions Gained"
                value={driver.positions_gained}
              />

              <Info
                label="Stops"
                value={driver.stops}
              />

            </div>

          </div>
        )}

      </div>

    </section>
  );
}


/* ======================================================
   COMPONENTS
====================================================== */

function Metric({ label, value, highlight }: any) {

  return (

    <div className="border border-white/10 bg-white/5
                    rounded-lg p-5">

      <p className="text-xs uppercase text-white/40 mb-1">
        {label}
      </p>

      <p
        className={`text-2xl font-black ${
          highlight ? "text-red-500" : ""
        }`}
      >
        {value}
      </p>

    </div>
  );
}


function Info({ label, value }: any) {

  return (

    <div className="border border-white/10 bg-white/5
                    rounded-lg p-5">

      <p className="text-xs uppercase text-white/40 mb-2">
        {label}
      </p>

      <p className="text-base font-black">
        {value}
      </p>

    </div>
  );
}