import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Download,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sun,
  Radio,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkyDome } from "@/components/SkyDome";
import { TimelineStrip } from "@/components/TimelineStrip";
import { SITES, type LandingSite } from "@/lib/sites";
import { formatDuration, formatUTC, sampleSite, type SiteAnalysis } from "@/lib/analysis";
import { customSite, nextTransition, rankSites, type Priority } from "@/lib/planning";
import { exportReportJson, exportSummaryCsv, exportTimeseriesCsv } from "@/lib/export";
import { MissionSummary } from "@/components/MissionSummary";
import { ExplainedTerm } from "@/components/InfoTooltip";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Mission Planner — Lunar South Pole Analysis" },
      {
        name: "description",
        content:
          "Compare lunar landing locations and alternate dates, inspect Sun and Earth horizon geometry, and export mission windows.",
      },
      { property: "og:title", content: "Mission Planner — Lunar South Pole Analysis" },
      {
        property: "og:description",
        content: "Accessible lunar site, date, power and communication comparisons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannerPage,
});
const STEPS = 720;
const INITIAL = "2026-11-07T00:00";
const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function PlannerPage() {
  const [start, setStart] = useState(INITIAL);
  const [alternate, setAlternate] = useState("2026-12-07T00:00");
  const [compare, setCompare] = useState(false);
  const [days, setDays] = useState(29.53);
  const [priority, setPriority] = useState<Priority>("balanced");
  const [sites, setSites] = useState<LandingSite[]>(SITES);
  const [selected, setSelected] = useState(SITES.map((s) => s.id));
  const [detailId, setDetailId] = useState(SITES[0]?.id ?? "");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [lat, setLat] = useState("-89");
  const [lon, setLon] = useState("0");
  const [horizon, setHorizon] = useState("0");
  const startMs = Date.parse(`${start}:00Z`);
  const altMs = Date.parse(`${alternate}:00Z`);
  const valid = Number.isFinite(startMs);
  const ranked = useMemo(
    () =>
      valid
        ? rankSites(
            sites
              .filter((s) => selected.includes(s.id))
              .map((s) => sampleSite(s, startMs, days, STEPS)),
            priority,
          )
        : [],
    [sites, selected, startMs, days, priority, valid],
  );
  const alternateRanked = useMemo(
    () =>
      compare && Number.isFinite(altMs)
        ? rankSites(
            sites
              .filter((s) => selected.includes(s.id))
              .map((s) => sampleSite(s, altMs, days, STEPS)),
            priority,
          )
        : [],
    [sites, selected, compare, altMs, days, priority],
  );
  const detail = ranked.find((a) => a.site.id === detailId) ?? ranked[0];
  const altDetail = alternateRanked.find((a) => a.site.id === detail?.site.id);
  const all = [...ranked, ...alternateRanked];
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % (STEPS + 1)), 100);
    return () => window.clearInterval(timer);
  }, [playing]);
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  const addSite = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const site = customSite(name, Number(lat), Number(lon), Number(horizon));
      if (sites.some((s) => s.id === site.id)) throw new Error("This site is already in the list.");
      setSites((current) => [...current, site]);
      setSelected((current) => [...current, site.id]);
      setDetailId(site.id);
      setError("");
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check your coordinates.");
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label-caps text-primary">Lunar operations / planning</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Mission planner</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Compare locations. Test a new date. Understand the trade-offs.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/how-it-works">
            How it works <ArrowRight />
          </Link>
        </Button>
      </header>
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-7 lg:border-r lg:border-hairline lg:pr-7">
          <section>
            <SectionTitle n="01" title="Mission window" />
            <label className="mt-4 block text-xs font-medium">
              Landing date & time (UTC)
              <input
                aria-label="Landing date and time UTC"
                type="datetime-local"
                required
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setIndex(0);
                }}
                className={`${FIELD} mt-2`}
              />
            </label>
            {!valid && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                Choose a valid landing date.
              </p>
            )}
            <label className="mt-4 block text-xs font-medium">
              Duration
              <select
                aria-label="Mission duration"
                value={days}
                onChange={(e) => {
                  setDays(Number(e.target.value));
                  setIndex(0);
                }}
                className={`${FIELD} mt-2`}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={29.53}>One lunar cycle · 29.53 days</option>
                <option value={90}>90 days</option>
                <option value={365}>One year · seasonal study</option>
              </select>
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                className="accent-primary"
              />
              Compare another date
            </label>
            {compare && (
              <label className="mt-3 block text-xs font-medium">
                Alternate landing (UTC)
                <input
                  aria-label="Alternate landing date and time UTC"
                  type="datetime-local"
                  required
                  value={alternate}
                  onChange={(e) => setAlternate(e.target.value)}
                  className={`${FIELD} mt-2`}
                />
                {!Number.isFinite(altMs) && (
                  <span className="text-destructive">Choose a valid alternate date.</span>
                )}
              </label>
            )}
          </section>
          <section className="border-t border-hairline pt-6">
            <SectionTitle n="02" title="Mission priority" />
            <div className="mt-4 flex gap-1 rounded-md bg-secondary p-1">
              {(["power", "balanced", "comms"] as const).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={priority === p ? "default" : "ghost"}
                  aria-pressed={priority === p}
                  className="flex-1 px-2"
                  onClick={() => setPriority(p)}
                >
                  {p === "power" ? "Power" : p === "comms" ? "Earth link" : "Balanced"}
                </Button>
              ))}
            </div>
          </section>
          <section className="border-t border-hairline pt-6">
            <SectionTitle n="03" title="Landing sites" />
            <div className="mb-3 mt-3 flex justify-between text-xs text-muted-foreground">
              <span>{selected.length} selected</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() =>
                  setSelected(selected.length === sites.length ? [] : sites.map((s) => s.id))
                }
              >
                {selected.length === sites.length ? "Clear" : "Select all"}
              </Button>
            </div>
            <div className="space-y-3">
              {sites.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed"
                >
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={selected.includes(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  <span>
                    {s.name}
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {s.lat.toFixed(2)}° · {s.lon.toFixed(2)}°
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <details className="mt-5 border-t border-hairline pt-4">
              <summary className="cursor-pointer text-sm font-medium text-primary">
                Custom coordinates
              </summary>
              <form onSubmit={addSite} className="mt-4 space-y-3">
                <label className="block text-xs">
                  Site name
                  <input
                    aria-label="Custom site name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${FIELD} mt-1`}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs">
                    Latitude °
                    <input
                      aria-label="Custom latitude"
                      required
                      type="number"
                      min={-90}
                      max={90}
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className={`${FIELD} mt-1`}
                    />
                  </label>
                  <label className="text-xs">
                    Longitude °E
                    <input
                      aria-label="Custom longitude"
                      required
                      type="number"
                      min={-180}
                      max={180}
                      step="any"
                      value={lon}
                      onChange={(e) => setLon(e.target.value)}
                      className={`${FIELD} mt-1`}
                    />
                  </label>
                </div>
                <label className="block text-xs">
                  Constant horizon °
                  <input
                    aria-label="Custom horizon"
                    required
                    type="number"
                    min={0}
                    max={90}
                    step="any"
                    value={horizon}
                    onChange={(e) => setHorizon(e.target.value)}
                    className={`${FIELD} mt-1`}
                  />
                </label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Negative latitude is south. Zero horizon assumes a flat unobstructed surface; no
                  surveyed terrain is available.
                </p>
                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" size="sm">
                  <Plus />
                  Add site
                </Button>
              </form>
            </details>
          </section>
        </aside>
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Site comparison</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {days} DAYS / {compare ? "2 WINDOWS" : "1 WINDOW"}
            </span>
          </div>
          {detail && <MissionSummary primary={detail} compare={altDetail} days={days} />}
          <p className="mb-5 mt-5 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">
            Screening estimates, not flight-certified. Curated{" "}
            <ExplainedTerm term="12-sector terrain masks" /> are illustrative; custom sites use your
            constant horizon. Rankings measure visibility, not electrical output or link margin.
          </p>
          {ranked.length === 0 ? (
            <div className="border-y border-hairline py-16 text-center text-muted-foreground">
              Select at least one site and a valid date to compare mission windows.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className="py-3">Landing site</th>
                      <th>Sunlight</th>
                      <th>Earth link</th>
                      <th>Longest dark</th>
                      <th>Link gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((a, i) => (
                      <tr
                        key={a.site.id}
                        className={`border-b border-hairline transition-colors ${detail?.site.id === a.site.id ? "bg-primary/8" : "hover:bg-secondary/60"}`}
                      >
                        <td className="py-4 pr-3">
                          <Button
                            variant="link"
                            className="h-auto max-w-[240px] justify-start whitespace-normal p-0 text-left text-foreground"
                            onClick={() => {
                              setDetailId(a.site.id);
                              setIndex(0);
                            }}
                            aria-pressed={detail?.site.id === a.site.id}
                          >
                            <span className="font-mono text-xs text-muted-foreground">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {a.site.name}
                          </Button>
                          {i === 0 && (
                            <span className="ml-6 mt-1 block text-[10px] text-primary">
                              Highest weighted visibility
                            </span>
                          )}
                        </td>
                        <td className="font-mono text-sun">{(a.illumination * 100).toFixed(0)}%</td>
                        <td className="font-mono text-earth">
                          {(a.earthVisibility * 100).toFixed(0)}%
                        </td>
                        <td className="font-mono text-xs">{formatDuration(a.longestDarkHours)}</td>
                        <td className="font-mono text-xs">{formatDuration(a.longestGapHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail && (
                <section className="mt-8 border-t border-hairline pt-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="label-caps text-primary">Selected location</p>
                      <h2 className="mt-2 text-xl font-semibold">{detail.site.name}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        title="Reset timeline"
                        aria-label="Reset timeline"
                        onClick={() => {
                          setIndex(0);
                          setPlaying(false);
                        }}
                      >
                        <RotateCcw />
                      </Button>
                      <Button
                        size="icon"
                        title={playing ? "Pause timeline" : "Play timeline"}
                        aria-label={playing ? "Pause timeline" : "Play timeline"}
                        onClick={() => setPlaying((v) => !v)}
                      >
                        {playing ? <Pause /> : <Play />}
                      </Button>
                    </div>
                  </div>
                  <div className={`grid gap-6 ${compare ? "xl:grid-cols-2" : ""}`}>
                    <WindowView
                      analysis={detail}
                      index={index}
                      onScrub={setIndex}
                      label="Primary window"
                    />
                    {compare && altDetail && (
                      <WindowView
                        analysis={altDetail}
                        index={index}
                        onScrub={setIndex}
                        label="Alternate window"
                      />
                    )}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={STEPS}
                    value={index}
                    onChange={(e) => setIndex(Number(e.target.value))}
                    aria-label="Mission timeline"
                    className="mt-6 w-full accent-primary"
                  />
                  <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>Landing</span>
                    <span>{((index / STEPS) * days).toFixed(2)} days elapsed</span>
                    <span>Mission end</span>
                  </div>
                  {compare && altDetail && (
                    <div className="mt-6 border-y border-hairline py-4 text-sm">
                      <CalendarDays className="mr-2 inline size-4 text-primary" />
                      Alternate date at this location:{" "}
                      <strong className="text-sun">
                        {delta(altDetail.illumination - detail.illumination)} pp sunlight
                      </strong>{" "}
                      ·{" "}
                      <strong className="text-earth">
                        {delta(altDetail.earthVisibility - detail.earthVisibility)} pp Earth
                        visibility
                      </strong>
                    </div>
                  )}
                </section>
              )}
              <section className="mt-8 border-t border-hairline pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="mr-auto text-sm font-semibold">
                    Export {compare ? "both windows" : "mission data"}
                  </h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportSummaryCsv(all, start.slice(0, 10))}
                  >
                    <Download />
                    Comparison CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportTimeseriesCsv(all, start.slice(0, 10))}
                  >
                    <Download />
                    Time series CSV
                  </Button>
                  <Button size="sm" onClick={() => exportReportJson(all, { start, days })}>
                    <Download />
                    Windows JSON
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
function delta(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}`;
}
function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="flex items-center gap-3 text-sm font-semibold">
      <span className="font-mono text-xs text-primary">{n}</span>
      {title}
    </h2>
  );
}
function WindowView({
  analysis,
  index,
  onScrub,
  label,
}: {
  analysis: SiteAnalysis;
  index: number;
  onScrub: (i: number) => void;
  label: string;
}) {
  const sample = analysis.samples[index];
  if (!sample) return null;
  return (
    <div className="min-w-0">
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        {label} · <span className="font-mono">{formatUTC(sample.t)} UTC</span>
      </p>
      <div className="grid items-center gap-4 sm:grid-cols-[minmax(170px,240px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[260px]">
          <SkyDome analysis={analysis} index={index} />
        </div>
        <dl className="space-y-5">
          <div>
            <dt className="flex items-center gap-2 text-xs text-sun">
              <Sun className="size-4" />
              {sample.sunUp ? "Sun above terrain" : "Sun blocked"}
            </dt>
            <dd className="mt-1 font-mono text-xl">
              {sample.sunAlt.toFixed(2)}°{" "}
              <span className="text-xs text-muted-foreground">elevation</span>
            </dd>
            <dd className="mt-1 text-xs text-muted-foreground">
              {sample.sunUp ? "Sunset" : "Sunrise"} {nextTransition(analysis, index, "sun")}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs text-earth">
              <Radio className="size-4" />
              {sample.earthUp ? "Earth in view" : "Earth blocked"}
            </dt>
            <dd className="mt-1 font-mono text-xl">
              {sample.earthAlt.toFixed(2)}°{" "}
              <span className="text-xs text-muted-foreground">elevation</span>
            </dd>
            <dd className="mt-1 text-xs text-muted-foreground">
              {sample.earthUp ? "Earthset" : "Earthrise"} {nextTransition(analysis, index, "earth")}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-4">
        <TimelineStrip
          analysis={analysis}
          index={index}
          onScrub={onScrub}
          label={analysis.site.name}
        />
      </div>
      <details className="mt-4 border-t border-hairline pt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">
          Sunlight & direct-link intervals
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {(["sun", "earth"] as const).map((body) => (
            <div key={body}>
              <p
                className={`mb-2 text-xs font-medium ${body === "sun" ? "text-sun" : "text-earth"}`}
              >
                {body === "sun" ? "Sunlight" : "Earth link"}
              </p>
              <ul className="max-h-40 space-y-2 overflow-auto font-mono text-[10px] text-muted-foreground">
                {(body === "sun" ? analysis.sunlitIntervals : analysis.earthIntervals).map(
                  (i, n) => (
                    <li key={n}>
                      {formatUTC(i.start)} → {formatUTC(i.end)}
                    </li>
                  ),
                )}
                {(body === "sun" ? analysis.sunlitIntervals : analysis.earthIntervals).length ===
                  0 && <li>No visible intervals in this window.</li>}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Events are sampled to ≈ {formatDuration(analysis.stepMs / 3600000)}. Intervals are clipped
          at the mission boundaries; visibility uses the upper edge of each disc.
        </p>
      </details>
    </div>
  );
}
