import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { SkyDome } from "@/components/SkyDome";
import { TimelineStrip } from "@/components/TimelineStrip";
import { SITES } from "@/lib/sites";
import {
  formatDate,
  formatDuration,
  formatUTC,
  sampleSite,
  type SiteAnalysis,
} from "@/lib/analysis";
import {
  exportReportJson,
  exportSummaryCsv,
  exportTimeseriesCsv,
} from "@/lib/export";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Lunar South Pole Analysis" },
      {
        name: "description",
        content:
          "A guided planner for lunar south pole landing sites: choose a date and mission length, pick what matters most, and get a ranked comparison of solar power and Earth communication windows you can export.",
      },
      { property: "og:title", content: "Planner — Lunar South Pole Analysis" },
      {
        property: "og:description",
        content:
          "Choose a date, choose your priority, and get a ranked, exportable comparison of south-polar landing sites.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannerPage,
});

const STEPS_N = 480;

const LENGTHS = [
  { label: "7 days", days: 7, hint: "Short surface sortie" },
  { label: "14 days", days: 14, hint: "One lunar day" },
  { label: "1 month", days: 29.53, hint: "Full lunation" },
  { label: "3 months", days: 90, hint: "Extended campaign" },
];

const PRIORITIES = [
  {
    id: "power",
    label: "Solar power",
    hint: "Keep the arrays lit; tolerate comms gaps.",
    weight: 0.75,
  },
  {
    id: "balanced",
    label: "Balanced",
    hint: "Weigh power and comms about equally.",
    weight: 0.5,
  },
  {
    id: "comms",
    label: "Earth link",
    hint: "Keep the dish on Earth; tolerate darkness.",
    weight: 0.25,
  },
] as const;

type PriorityId = (typeof PRIORITIES)[number]["id"];

function score(a: SiteAnalysis, weight: number) {
  return weight * a.illumination + (1 - weight) * a.earthVisibility;
}

function verdict(a: SiteAnalysis) {
  if (a.illumination > 0.6 && a.earthVisibility > 0.5)
    return { text: "Strong on both", tone: "text-primary" };
  if (a.illumination > 0.6) return { text: "Power-rich", tone: "text-sun" };
  if (a.earthVisibility > 0.6) return { text: "Comms-rich", tone: "text-earth" };
  if (a.illumination < 0.3 && a.earthVisibility < 0.3)
    return { text: "Difficult window", tone: "text-destructive" };
  return { text: "Workable", tone: "text-muted-foreground" };
}

function PlannerPage() {
  const [startDate, setStartDate] = useState("2026-03-01");
  const [days, setDays] = useState(29.53);
  const [priority, setPriority] = useState<PriorityId>("balanced");
  const [selected, setSelected] = useState<string[]>(SITES.map((s) => s.id));
  const [detailId, setDetailId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const startMs = useMemo(
    () => Date.parse(`${startDate}T00:00:00Z`),
    [startDate],
  );
  const weight =
    PRIORITIES.find((p) => p.id === priority)?.weight ?? 0.5;

  const analyses = useMemo(
    () =>
      SITES.filter((s) => selected.includes(s.id)).map((s) =>
        sampleSite(s, startMs, days, STEPS_N),
      ),
    [selected, startMs, days],
  );

  const ranked = useMemo(
    () => [...analyses].sort((a, b) => score(b, weight) - score(a, weight)),
    [analyses, weight],
  );

  const detail =
    ranked.find((a) => a.site.id === detailId) ?? ranked[0] ?? null;
  const best = ranked[0];
  const stamp = startDate;

  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id],
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <header className="max-w-2xl">
        <p className="label-caps text-primary">Guided planner</p>
        <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">
          Find the right landing site in three steps
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          Set your mission window, say what matters most, and the planner ranks
          every candidate site by how much sunlight it gets for power and how
          often Earth is above the local horizon for a direct radio link.
        </p>
      </header>

      {/* Step 1 */}
      <Step n="1" title="When does the mission run?">
        <div className="flex flex-wrap items-end gap-6">
          <label className="flex flex-col gap-2">
            <span className="label-caps text-muted-foreground">Start date (UTC)</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-input bg-card px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="label-caps text-muted-foreground">Mission length</span>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map((l) => (
                <button
                  key={l.label}
                  onClick={() => setDays(l.days)}
                  title={l.hint}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    days === l.days
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-input text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {formatDate(startMs)} → {formatDate(startMs + days * 86400000)}
          </p>
        </div>
      </Step>

      {/* Step 2 */}
      <Step n="2" title="What matters most for this mission?">
        <div className="grid gap-3 sm:grid-cols-3">
          {PRIORITIES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPriority(p.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                priority === p.id
                  ? "border-primary bg-primary/10"
                  : "border-hairline hover:border-primary/40"
              }`}
            >
              <p className="text-sm font-semibold">{p.label}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {p.hint}
              </p>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <p className="label-caps mb-2 text-muted-foreground">
            Sites to compare ({selected.length} of {SITES.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {SITES.map((s) => (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  selected.includes(s.id)
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-hairline text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </Step>

      {/* Step 3 */}
      <Step n="3" title="Your ranked results">
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pick at least one site above to see results.
          </p>
        ) : (
          <>
            {best && (
              <div className="glass-panel mb-5 rounded-lg p-5">
                <p className="label-caps text-primary">Best match</p>
                <p className="mt-2 text-xl font-bold">{best.site.name}</p>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Over this window the Sun is above the local horizon{" "}
                  <span className="text-sun">
                    {(best.illumination * 100).toFixed(0)}%
                  </span>{" "}
                  of the time and Earth is in view{" "}
                  <span className="text-earth">
                    {(best.earthVisibility * 100).toFixed(0)}%
                  </span>{" "}
                  of the time. The longest stretch without sunlight is{" "}
                  {formatDuration(best.longestDarkHours)}, so batteries must
                  carry the vehicle at least that long. The longest stretch
                  without a direct Earth link is{" "}
                  {formatDuration(best.longestGapHours)}.
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <Th>#</Th>
                    <Th>Site</Th>
                    <Th>Sunlight</Th>
                    <Th>Earth in view</Th>
                    <Th>Longest dark</Th>
                    <Th>Longest comms gap</Th>
                    <Th>Verdict</Th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((a, i) => {
                    const v = verdict(a);
                    const active = detail?.site.id === a.site.id;
                    return (
                      <tr
                        key={a.site.id}
                        onClick={() => {
                          setDetailId(a.site.id);
                          setIndex(0);
                        }}
                        className={`cursor-pointer border-b border-hairline transition-colors ${
                          active ? "bg-primary/10" : "hover:bg-secondary/60"
                        }`}
                      >
                        <Td className="font-mono text-muted-foreground">
                          {i + 1}
                        </Td>
                        <Td>
                          <span className="font-medium">{a.site.name}</span>
                          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                            {a.site.region}
                          </span>
                        </Td>
                        <Td>
                          <Bar value={a.illumination} className="bg-sun" />
                        </Td>
                        <Td>
                          <Bar value={a.earthVisibility} className="bg-earth" />
                        </Td>
                        <Td className="font-mono text-xs">
                          {formatDuration(a.longestDarkHours)}
                        </Td>
                        <Td className="font-mono text-xs">
                          {formatDuration(a.longestGapHours)}
                        </Td>
                        <Td className={`text-xs ${v.tone}`}>{v.text}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {detail && (
              <div className="mt-6 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="glass-panel rounded-lg p-4">
                  <SkyDome analysis={detail} index={index} />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    The ring shows the sky above {detail.site.name}. The shaded
                    outer band is surrounding terrain — anything inside it is
                    blocked from view. Drag the slider to move through time.
                  </p>
                </div>
                <div className="glass-panel flex flex-col gap-4 rounded-lg p-4">
                  <TimelineStrip
                    analysis={detail}
                    index={index}
                    onScrub={setIndex}
                    label={detail.site.name}
                  />
                  <input
                    type="range"
                    min={0}
                    max={STEPS_N}
                    value={index}
                    onChange={(e) => setIndex(Number(e.target.value))}
                    className="h-1 w-full accent-primary"
                    aria-label="Scrub through the mission window"
                  />
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatUTC(detail.samples[index]?.t ?? startMs)} UTC ·{" "}
                    <span className="text-sun">
                      {detail.samples[index]?.sunUp ? "sunlit" : "in shadow"}
                    </span>{" "}
                    ·{" "}
                    <span className="text-earth">
                      {detail.samples[index]?.earthUp
                        ? "Earth in view"
                        : "no direct link"}
                    </span>
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
              <span className="label-caps text-muted-foreground">Export</span>
              <button
                onClick={() => exportSummaryCsv(ranked, stamp)}
                className="rounded-md border border-input px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary"
              >
                Comparison table (CSV)
              </button>
              <button
                onClick={() => exportTimeseriesCsv(ranked, stamp)}
                className="rounded-md border border-input px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-secondary"
              >
                Full time series (CSV)
              </button>
              <button
                onClick={() =>
                  exportReportJson(ranked, { start: startDate, days })
                }
                className="glow-primary rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
              >
                Mission windows (JSON)
              </button>
            </div>
          </>
        )}
      </Step>
    </main>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-hairline pt-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full border border-primary/50 font-mono text-xs text-primary">
          {n}
        </span>
        <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="label-caps px-3 py-2 font-bold text-muted-foreground">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>;
}

function Bar({ value, className }: { value: number; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-shadow">
        <div
          className={`h-full rounded-full ${className}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="font-mono text-xs">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}
