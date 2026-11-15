import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Orbit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeHorizon } from "@/lib/astro";
import { fetchHorizons } from "@/lib/horizons-api";
import type { HorizonsRow } from "@/lib/horizons";
import type { LandingSite } from "@/lib/sites";

const MAX_DAYS = 30; // hourly rows; keeps the request small and fast

interface Series {
  nasa: HorizonsRow[];
  model: number[];
  meanAbs: number;
  maxAbs: number;
  bias: number;
}
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; sun: Series; earth: Series; fetchedAt: number };

function compare(rows: HorizonsRow[], site: LandingSite, body: "sun" | "earth"): Series {
  const model = rows.map((r) => {
    const h = computeHorizon(new Date(r.t), site.lat, site.lon);
    return body === "sun" ? h.sunAlt : h.earthAlt;
  });
  const diffs = rows.map((r, i) => (model[i] ?? 0) - r.el);
  const abs = diffs.map(Math.abs);
  return {
    nasa: rows,
    model,
    meanAbs: abs.reduce((a, b) => a + b, 0) / (abs.length || 1),
    maxAbs: Math.max(0, ...abs),
    bias: diffs.reduce((a, b) => a + b, 0) / (diffs.length || 1),
  };
}

/** Pulls live NASA JPL Horizons data for the selected site and overlays it on this app's model. */
export function NasaCheck({
  site,
  startMs,
  days,
}: {
  site: LandingSite;
  startMs: number;
  days: number;
}) {
  const [state, setState] = useState<State>({ status: "idle" });
  const span = Math.min(days, MAX_DAYS);

  // Old results no longer apply once the site or dates change.
  useEffect(() => {
    setState({ status: "idle" });
  }, [site.id, site.lat, site.lon, startMs, days]);

  const run = async () => {
    setState({ status: "loading" });
    try {
      const args = { lat: site.lat, lon: site.lon, startMs, days: span };
      const [sun, earth] = await Promise.all([
        fetchHorizons({ data: { ...args, body: "sun" } }),
        fetchHorizons({ data: { ...args, body: "earth" } }),
      ]);
      if (!sun.ok) return setState({ status: "error", message: sun.error });
      if (!earth.ok) return setState({ status: "error", message: earth.error });
      setState({
        status: "done",
        sun: compare(sun.rows, site, "sun"),
        earth: compare(earth.rows, site, "earth"),
        fetchedAt: Math.min(sun.fetchedAt, earth.fetchedAt),
      });
    } catch {
      setState({ status: "error", message: "The NASA request failed. Try again in a moment." });
    }
  };

  return (
    <section
      className="mt-8 border-t border-hairline pt-6"
      aria-label="Model check against NASA Horizons"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-caps text-primary">Verify with NASA data</p>
          <h3 className="mt-2 text-base font-semibold">
            <Orbit className="mr-2 inline size-4 text-sun" />
            Model vs JPL Horizons
          </h3>
        </div>
        <Button
          size="sm"
          onClick={run}
          disabled={state.status === "loading" || !Number.isFinite(startMs)}
        >
          {state.status === "loading" ? (
            <>
              <Loader2 className="animate-spin" />
              Contacting NASA…
            </>
          ) : (
            "Compare with NASA Horizons"
          )}
        </Button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Fetches hourly Sun and Earth elevations for this site from NASA JPL Horizons (first{" "}
        {span.toFixed(0)} days of the window, airless, no terrain) and plots them against this app’s
        own calculation.
      </p>
      {state.status === "error" && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.message} The planner above still works with the built-in model.
        </p>
      )}
      {state.status === "done" && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {(
            [
              ["Sun", state.sun, "var(--sun)"],
              ["Earth", state.earth, "var(--earth)"],
            ] as const
          ).map(([label, s, color]) => (
            <div key={label}>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="size-4" style={{ color }} />
                {label} elevation
              </p>
              <Chart s={s} color={color} label={label} />
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                mean |diff| {s.meanAbs.toFixed(2)}° · max {s.maxAbs.toFixed(2)}° · bias{" "}
                {s.bias >= 0 ? "+" : ""}
                {s.bias.toFixed(2)}°
              </p>
            </div>
          ))}
          <p className="text-xs leading-relaxed text-muted-foreground md:col-span-2">
            Solid line: this app. Dashed line: NASA Horizons (
            {new Date(state.fetchedAt).toISOString().slice(11, 16)} UTC fetch). Elevations are
            compared rather than azimuths because azimuth changes very quickly this close to the
            pole. Differences measure ephemeris geometry only; terrain is not part of Horizons.
          </p>
        </div>
      )}
    </section>
  );
}

function Chart({ s, color, label }: { s: Series; color: string; label: string }) {
  const W = 400,
    H = 150,
    PL = 30,
    PB = 16;
  const all = [...s.model, ...s.nasa.map((r) => r.el), 0];
  const lo = Math.min(...all) - 0.5,
    hi = Math.max(...all) + 0.5;
  const x = (i: number) => PL + ((W - PL) * i) / Math.max(1, s.nasa.length - 1);
  const y = (v: number) => (H - PB) * (1 - (v - lo) / (hi - lo));
  const pts = (vals: number[]) =>
    vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`${label} elevation: this app versus NASA Horizons`}
    >
      <line x1={PL} x2={W} y1={y(0)} y2={y(0)} stroke="var(--hairline)" />
      <text x={2} y={y(0) + 3} fontSize={9} fill="var(--muted-foreground)">
        0°
      </text>
      <text x={2} y={10} fontSize={9} fill="var(--muted-foreground)">
        {hi.toFixed(1)}°
      </text>
      <text x={2} y={H - PB} fontSize={9} fill="var(--muted-foreground)">
        {lo.toFixed(1)}°
      </text>
      <polyline
        points={pts(s.nasa.map((r) => r.el))}
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity={0.8}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <polyline points={pts(s.model)} fill="none" stroke={color} strokeWidth={1.75} />
    </svg>
  );
}
