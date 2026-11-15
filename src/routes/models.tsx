import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { SkyDome } from "@/components/SkyDome";
import { LunarOrbitalView } from "@/components/LunarOrbitalView";
import { ElevationChart } from "@/components/ElevationChart";
import { TimelineStrip } from "@/components/TimelineStrip";
import { SITES } from "@/lib/sites";
import { LunarTools } from '@/components/LunarTools';
import { MissionSummary } from '@/components/MissionSummary';
import { TermHelp } from '@/components/TermHelp';
import { rankSites } from '@/lib/planning';
import {
  formatDate,
  formatDuration,
  formatUTC,
  sampleSite,
  type SiteAnalysis,
} from "@/lib/analysis";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Models — Lunar South Pole Analysis" },
      {
        name: "description",
        content:
          "Interactive three-dimensional lunar orbital and local-sky models for candidate south-pole landing sites, with scrub-able sunlight and Earth-contact windows.",
      },
      { property: "og:title", content: "Models — Lunar South Pole Analysis" },
      {
        property: "og:description",
        content:
        "Explore three-dimensional Sun and Earth orbital views and local sky geometry against illustrative terrain horizons at candidate south-polar sites.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModelsPage,
});

const STEPS = 720;
const DURATIONS = [
  { label: "7 d", days: 7 },
  { label: "14 d", days: 14 },
  { label: "1 lunation", days: 29.53 },
  { label: "60 d", days: 60 },
];

function ModelsPage() {
  const [primaryId, setPrimaryId] = useState(SITES[0]!.id);
  const [compareId, setCompareId] = useState<string | null>(SITES[2]!.id);
  const [startDate, setStartDate] = useState("2026-03-01");
  const [days, setDays] = useState(29.53);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const startMs = useMemo(() => Date.parse(`${startDate}T00:00:00Z`), [startDate]);

  const primary = useMemo(
    () => sampleSite(SITES.find((s) => s.id === primaryId)!, startMs, days, STEPS),
    [primaryId, startMs, days],
  );
  const compare = useMemo(
    () =>
      compareId
        ? sampleSite(SITES.find((s) => s.id === compareId)!, startMs, days, STEPS)
        : null,
    [compareId, startMs, days],
  );

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () => setIndex((i) => (i >= STEPS ? 0 : i + speed)),
      40,
    );
    return () => window.clearInterval(id);
  }, [playing, speed]);

  const cur = primary.samples[Math.min(index, primary.samples.length - 1)];
  const cursorT = cur?.t ?? startMs;
  const deltaLit = compare ? (primary.illumination - compare.illumination) * 100 : 0;

  return (
    <div className="grid-texture min-h-[calc(100vh-4rem)] bg-background p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Advanced models</h1><LunarTools site={primary.site} startMs={startMs} days={days} /></div>
      <MissionSummary analysis={primary} alternatives={rankSites(compare ? [primary, compare] : [primary], 'balanced')} />
      <section className="my-5 rounded-2xl border border-white/10 bg-white/[0.015] p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><p className="label-caps text-primary">3D orbital geometry</p><h2 className="mt-1 text-lg font-semibold">Follow the Sun and Earth around the selected landing site.</h2></div><p className="font-mono text-[9px] text-muted-foreground">NASA LRO SURFACE · DISTANCES COMPRESSED</p></div>
        <div className={`grid gap-4 ${compare ? 'lg:grid-cols-2' : ''}`}><LunarOrbitalView analysis={primary} index={index} className="h-[320px] md:h-[390px]" />{compare && <LunarOrbitalView analysis={compare} index={index} className="h-[320px] md:h-[390px]" />}</div>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Trajectories are visualized from the approximate apparent Sun and Earth positions over this selected time span. Orbit distances are compressed to fit the scene; these paths are not spacecraft trajectories.</p>
      </section>
      <div className="glass-panel relative flex flex-col overflow-hidden rounded-xl shadow-[var(--shadow-panel)]">
        {/* Control strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border bg-background/60 px-4 py-3 font-mono text-[11px]">
          <label className="flex items-center gap-2">
            <span className="label-caps text-muted-foreground">Start</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-input bg-shadow px-2 py-1 text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>
          <div className="flex items-center gap-1.5">
            <span className="label-caps text-muted-foreground">Span</span>
            {DURATIONS.map((d) => (
              <button
                key={d.label}
                onClick={() => setDays(d.days)}
                className={`rounded-md border px-2.5 py-1 transition-all ${
                  days === d.days
                    ? "glow-primary border-primary bg-primary/20 text-primary"
                    : "border-hairline bg-shadow text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4 text-muted-foreground">
            <span>
              EPOCH J2000 · COORD SYS SELENOGRAPHIC
            </span>
            <span className="rounded-md border border-hairline bg-shadow px-2 py-1 text-foreground">
              {formatUTC(cursorT)} UTC
            </span>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row">
          {/* Site list */}
          <aside className="flex w-full shrink-0 flex-col border-b border-border bg-background/40 xl:w-72 xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between border-b border-hairline p-4">
              <span className="label-caps text-primary">Candidate sites</span>
              <span className="rounded border border-border bg-primary/10 px-2 py-0.5 font-mono text-[10px]">
                {SITES.length} TOTAL
              </span>
            </div>
            <div className="max-h-[420px] overflow-y-auto xl:max-h-none">
              {SITES.map((site) => {
                const isPrimary = site.id === primaryId;
                const isCompare = site.id === compareId;
                return (
                  <div
                    key={site.id}
                    className={`border-b border-hairline transition-all ${
                      isPrimary
                        ? "border-r-2 border-r-primary bg-primary/20"
                        : isCompare
                          ? "border-r-2 border-r-earth bg-earth/10"
                          : "hover:bg-primary/10"
                    }`}
                  >
                    <button
                      onClick={() => {
                        if (isPrimary) return;
                        if (compareId === site.id) setCompareId(primaryId);
                        setPrimaryId(site.id);
                      }}
                      className="w-full px-4 pb-1 pt-3 text-left"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`text-xs font-bold ${
                            isPrimary ? "text-foreground" : "text-foreground/70"
                          }`}
                        >
                          {site.name}
                        </span>
                        <span className="font-mono text-[10px] text-primary">
                          {isPrimary ? "A" : isCompare ? "B" : ""}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {Math.abs(site.lat).toFixed(2)}°S,{" "}
                        {Math.abs(site.lon).toFixed(1)}°{site.lon < 0 ? "W" : "E"} ·{" "}
                        {site.elevation.toLocaleString()} m
                      </div>
                    </button>
                    {!isPrimary && (
                      <button
                        onClick={() => setCompareId(isCompare ? null : site.id)}
                        className="w-full px-4 pb-2 text-left font-mono text-[10px] text-muted-foreground transition-colors hover:text-earth"
                      >
                        {isCompare ? "− remove from compare" : "+ compare"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Main instrument area */}
          <main className="relative flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Sky dome */}
              <div className="flex flex-1 flex-col lg:flex-[1.5]">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <span className="glow-primary size-2 animate-pulse rounded-full bg-primary" />
                    SKY DOME TELEMETRY
                  </div>
                  <div className="flex gap-4 font-mono text-[10px] uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                      <span className="h-0.5 w-3 bg-sun" /> Sun track
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-0.5 w-3 bg-earth" /> Earth track
                    </span>
                  </div>
                </div>
                <div
                  className={`grid flex-1 gap-4 rounded-xl border border-border bg-background/60 p-4 ${
                    compare ? "md:grid-cols-2" : ""
                  }`}
                >
                  <SkyDome analysis={primary} index={index} />
                  {compare && <SkyDome analysis={compare} index={index} />}
                </div>
              </div>

              {/* Feasibility metrics */}
              <div className="flex flex-1 flex-col gap-4">
                <div className="label-caps text-primary">Mission feasibility · A</div>
                <MetricCard
                  label="Solar illumination"
                  value={`${(primary.illumination * 100).toFixed(1)}`}
                  unit="%"
                  fraction={primary.illumination}
                  tone="sun"
                />
                <MetricCard
                  label="Earth comms window"
                  value={`${(primary.earthVisibility * 100).toFixed(1)}`}
                  unit="%"
                  fraction={primary.earthVisibility}
                  tone="earth"
                />
                <div className="grid grid-cols-2 gap-3">
                  <SmallStat
                    label="Max dark period"
                    value={formatDuration(primary.longestDarkHours)}
                  />
                  <SmallStat
                    label="Max comms gap"
                    value={formatDuration(primary.longestGapHours)}
                  />
                  <SmallStat
                    label="Peak sun EL"
                    value={`${primary.maxSunAlt >= 0 ? "+" : ""}${primary.maxSunAlt.toFixed(2)}°`}
                    tone="sun"
                  />
                  <SmallStat
                    label="Mean earth EL"
                    value={`${primary.meanEarthAlt >= 0 ? "+" : ""}${primary.meanEarthAlt.toFixed(2)}°`}
                    tone="earth"
                  />
                </div>

                <div className="mt-auto rounded-xl border border-dashed border-input bg-primary/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="label-caps">Delta comparison</span>
                    <span className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-sun" />
                      <span className="size-1.5 rounded-full bg-earth" />
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Selected A</span>
                      <span className="font-mono text-foreground">
                        {primary.site.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target B</span>
                      <span className="font-mono text-earth">
                        {compare ? compare.site.name : "— none —"}
                      </span>
                    </div>
                    <p className="border-t border-hairline pt-2 font-mono text-[10px] leading-relaxed text-primary">
                      {compare
                        ? `Site A holds ${Math.abs(deltaLit).toFixed(1)} pp ${
                            deltaLit >= 0 ? "more" : "less"
                          } solar uptime than site B across this ${Math.round(days)}-day window.`
                        : "Add a second site to compute an uptime delta."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Elevation profile */}
            <div className="flex flex-col">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="label-caps text-foreground/80">
                  Elevation profile / temporal analysis · {primary.site.name}
                </div>
                <div className="flex gap-3 font-mono text-[10px] uppercase">
                  <span className="text-sun">sun</span>
                  <span className="text-earth">earth</span>
                  <span className="text-terrain-edge">terrain</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <ElevationChart analysis={primary} index={index} />
              </div>
            </div>

            {/* Timeline */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-background/60 p-4">
              <TimelineStrip
                analysis={primary}
                index={index}
                onScrub={setIndex}
                label={`A · ${primary.site.name}`}
              />
              {compare && (
                <TimelineStrip
                  analysis={compare}
                  index={index}
                  onScrub={setIndex}
                  label={`B · ${compare.site.name}`}
                />
              )}

              <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? "Pause" : "Play"}
                  className="grid size-10 place-items-center rounded-lg border border-input bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                >
                  {playing ? (
                    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                    </svg>
                  ) : (
                    <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={STEPS}
                  value={index}
                  onChange={(e) => setIndex(Number(e.target.value))}
                  className="h-1.5 min-w-[160px] flex-1 accent-[var(--primary)]"
                  aria-label="Scrub time"
                />
                <div className="text-right">
                  <div className="label-caps text-muted-foreground">Current time</div>
                  <div className="font-mono text-sm font-bold text-foreground">
                    {formatUTC(cursorT)}
                  </div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex gap-2">
                  {[1, 4, 10].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`rounded border px-2 py-1 font-mono text-[10px] font-bold transition-all ${
                        speed === s
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-hairline bg-shadow text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {formatDate(startMs)} → {formatDate(startMs + days * 86400000)}
                </span>
              </div>
            </div>

            {/* Assessments */}
            <div className={`grid gap-4 ${compare ? "md:grid-cols-2" : ""}`}>
              <AssessmentPanel analysis={primary} tag="A" />
              {compare && <AssessmentPanel analysis={compare} tag="B" />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  fraction,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  fraction: number;
  tone: "sun" | "earth";
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md">
      <div className="label-caps text-muted-foreground"><TermHelp term={label} /></div>
      <div className="mt-1 font-display text-3xl font-bold leading-none text-foreground">
        {value}
        <span className="text-lg text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-shadow">
        <div
          className={`h-full ${tone === "sun" ? "glow-primary bg-sun" : "glow-accent bg-earth"}`}
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "sun" | "earth";
}) {
  return (
    <div className="rounded-xl border border-hairline bg-card/40 p-3">
      <div className="label-caps text-muted-foreground"><TermHelp term={label} /></div>
      <div
        className={`mt-1 font-mono text-lg font-bold ${
          tone === "sun" ? "text-sun" : tone === "earth" ? "text-earth" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function AssessmentPanel({ analysis, tag }: { analysis: SiteAnalysis; tag: string }) {
  const rows: Array<[string, string, string?]> = [
    ["Solar uptime", `${(analysis.illumination * 100).toFixed(1)}%`, "text-sun"],
    ["Earth in view", `${(analysis.earthVisibility * 100).toFixed(1)}%`, "text-earth"],
    ["Longest dark", formatDuration(analysis.longestDarkHours)],
    ["Longest comms gap", formatDuration(analysis.longestGapHours)],
    ["Peak sun elevation", `${analysis.maxSunAlt.toFixed(2)}°`],
    ["Mean earth elevation", `${analysis.meanEarthAlt.toFixed(2)}°`],
    ["Sunlit episodes", String(analysis.sunlitIntervals.length)],
    ["Site elevation", `${analysis.site.elevation.toLocaleString()} m`],
  ];

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="label-caps text-primary">{tag} · assessment</span>
        <span className="font-display text-sm font-semibold">{analysis.site.name}</span>
      </div>
      <dl className="flex flex-col">
        {rows.map(([k, v, cls]) => (
          <div
            key={k}
            className="flex items-baseline justify-between border-t border-hairline py-1.5"
          >
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className={`font-mono text-xs ${cls ?? "text-foreground"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {analysis.site.notes}
      </p>
    </div>
  );
}
