import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { SkyDome } from "@/components/SkyDome";
import { ElevationChart } from "@/components/ElevationChart";
import { TimelineStrip } from "@/components/TimelineStrip";
import { SITES } from "@/lib/sites";
import {
  formatDate,
  formatDuration,
  formatUTC,
  sampleSite,
  type SiteAnalysis,
} from "@/lib/analysis";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CLPS Lunar Mission Browser — Folsom Space" },
      {
        name: "description",
        content:
          "Compare lunar south pole landing sites and dates. Visualize Sun and Earth positions relative to the local horizon to assess solar power and direct-to-Earth communication windows.",
      },
      { property: "og:title", content: "CLPS Lunar Mission Browser — Folsom Space" },
      {
        property: "og:description",
        content:
          "Sun and Earth horizon geometry for candidate lunar south pole landing sites, with illumination and direct-to-Earth link windows.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Browser,
});

const STEPS = 720;
const DURATIONS = [
  { label: "7 d", days: 7 },
  { label: "14 d", days: 14 },
  { label: "1 lunation", days: 29.53 },
  { label: "60 d", days: 60 },
];

function Browser() {
  const [primaryId, setPrimaryId] = useState(SITES[0]!.id);
  const [compareId, setCompareId] = useState<string | null>(SITES[2]!.id);
  const [startDate, setStartDate] = useState("2026-03-01");
  const [days, setDays] = useState(29.53);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

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
      () => setIndex((i) => (i >= STEPS ? 0 : i + 1)),
      40,
    );
    return () => window.clearInterval(id);
  }, [playing]);

  const cursorT = primary.samples[index]?.t ?? startMs;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-6 place-items-center rounded-full border border-sun/50">
            <span className="size-2 rounded-full bg-sun" />
          </span>
          <div className="leading-tight">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em]">Folsom Space</p>
            <p className="text-[11px] text-muted-foreground">CLPS Lunar Mission Browser</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-4 font-mono text-[11px]">
          <label className="flex items-center gap-2">
            <span className="uppercase tracking-[0.15em] text-muted-foreground">Start</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-border bg-card px-2 py-1 text-foreground outline-none focus:border-sun"
            />
          </label>
          <div className="flex items-center gap-1">
            <span className="uppercase tracking-[0.15em] text-muted-foreground">Span</span>
            {DURATIONS.map((d) => (
              <button
                key={d.label}
                onClick={() => setDays(d.days)}
                className={`border px-2 py-1 transition-colors ${
                  days === d.days
                    ? "border-sun bg-sun/15 text-sun"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <span className="text-muted-foreground">
            {formatUTC(cursorT)} <span className="text-foreground/60">UTC</span>
          </span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-border lg:w-72 lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Candidate sites · south pole
          </div>
          <ul>
            {SITES.map((site) => {
              const isPrimary = site.id === primaryId;
              const isCompare = site.id === compareId;
              return (
                <li key={site.id} className="border-b border-border/60">
                  <button
                    onClick={() => {
                      if (isPrimary) return;
                      if (compareId === site.id) setCompareId(primaryId);
                      setPrimaryId(site.id);
                    }}
                    className={`w-full px-3 py-2 text-left transition-colors ${
                      isPrimary
                        ? "bg-sun/10 border-l-2 border-l-sun"
                        : isCompare
                          ? "bg-earth/10 border-l-2 border-l-earth"
                          : "border-l-2 border-l-transparent hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium">{site.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {isPrimary ? "A" : isCompare ? "B" : ""}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {Math.abs(site.lat).toFixed(2)}°S ·{" "}
                      {Math.abs(site.lon).toFixed(2)}°{site.lon < 0 ? "W" : "E"} ·{" "}
                      {site.elevation.toLocaleString()} m
                    </div>
                  </button>
                  {!isPrimary && (
                    <button
                      onClick={() => setCompareId(isCompare ? null : site.id)}
                      className="w-full px-3 pb-2 text-left font-mono text-[10px] text-muted-foreground hover:text-earth"
                    >
                      {isCompare ? "− remove from compare" : "+ compare"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
            Geometry from truncated JPL-style lunar and solar series with optical
            libration. Terrain horizon profiles are illustrative — planning-grade,
            not navigation-grade.
          </p>
        </aside>

        <main className="min-w-0 flex-1 p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="flex flex-col gap-4">
              <div className={`grid gap-4 ${compare ? "md:grid-cols-2" : ""}`}>
                <div className="border border-border bg-card p-3">
                  <SkyDome analysis={primary} index={index} />
                </div>
                {compare && (
                  <div className="border border-border bg-card p-3">
                    <SkyDome analysis={compare} index={index} />
                  </div>
                )}
              </div>

              <div className="border border-border bg-card p-3">
                <div className="mb-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Elevation above horizon · {primary.site.name}</span>
                  <span className="normal-case tracking-normal">
                    <span className="text-sun">sun</span> ·{" "}
                    <span className="text-earth">earth</span> ·{" "}
                    <span className="text-terrain-edge">terrain</span>
                  </span>
                </div>
                <ElevationChart analysis={primary} index={index} />
              </div>

              <div className="flex flex-col gap-4 border border-border bg-card p-3">
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
                <div className="flex items-center gap-3 border-t border-border pt-3">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="border border-sun bg-sun/15 px-3 py-1 font-mono text-[11px] text-sun"
                  >
                    {playing ? "PAUSE" : "PLAY"}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={STEPS}
                    value={index}
                    onChange={(e) => setIndex(Number(e.target.value))}
                    className="h-1 flex-1 accent-sun"
                    aria-label="Scrub time"
                  />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {formatDate(startMs)} → {formatDate(startMs + days * 86400000)}
                  </span>
                </div>
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <StatsPanel analysis={primary} tag="A" />
              {compare && <StatsPanel analysis={compare} tag="B" />}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatsPanel({ analysis, tag }: { analysis: SiteAnalysis; tag: string }) {
  const rows: Array<[string, string, string?]> = [
    ["Solar uptime", `${(analysis.illumination * 100).toFixed(1)}%`, "text-sun"],
    ["Earth in view", `${(analysis.earthVisibility * 100).toFixed(1)}%`, "text-earth"],
    ["Longest dark", formatDuration(analysis.longestDarkHours)],
    ["Longest comms gap", formatDuration(analysis.longestGapHours)],
    ["Peak sun elevation", `${analysis.maxSunAlt.toFixed(2)}°`],
    ["Mean earth elevation", `${analysis.meanEarthAlt.toFixed(2)}°`],
    ["Sunlit episodes", String(analysis.sunlitIntervals.length)],
  ];

  return (
    <div className="border border-border bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {tag} · assessment
        </span>
        <span className="text-[12px] font-medium">{analysis.site.name}</span>
      </div>
      <div className="mb-3">
        <div className="h-1.5 w-full bg-shadow">
          <div
            className="h-full bg-sun"
            style={{ width: `${analysis.illumination * 100}%` }}
          />
        </div>
        <div className="mt-1 h-1.5 w-full bg-shadow">
          <div
            className="h-full bg-earth"
            style={{ width: `${analysis.earthVisibility * 100}%` }}
          />
        </div>
      </div>
      <dl className="flex flex-col">
        {rows.map(([k, v, cls]) => (
          <div
            key={k}
            className="flex items-baseline justify-between border-t border-border/60 py-1.5"
          >
            <dt className="text-[12px] text-muted-foreground">{k}</dt>
            <dd className={`font-mono text-[12px] ${cls ?? "text-foreground"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {analysis.site.notes}
      </p>
    </div>
  );
}
