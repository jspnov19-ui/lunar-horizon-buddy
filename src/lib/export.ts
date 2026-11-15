import { formatDuration, formatUTC, type SiteAnalysis } from "./analysis";

const MODEL_ID = "lunar-surface-meeus-truncated-v1";
const MODEL_PROVENANCE = "Browser-computed truncated Meeus Sun/Moon series with optical libration and topocentric observer parallax; airless geometry. Built-in planner horizons can be derived from bundled NASA LRO LOLA 240 m DEM patches; custom sites use user-entered constant horizons. Other app views may use illustrative masks.";

function download(filename: string, mime: string, body: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[=+@\-]/.test(text) && typeof value === 'string' ? "'" + text : text;
  return /[",\r\n]/.test(safe) ? '"' + safe.replaceAll('"', '""') + '"' : safe;
}

/** One row per site and window: the headline planning numbers. */
export function summaryCsv(analyses: SiteAnalysis[]): string {
  const head = [
    "site",
    "region",
    "window_start_utc",
    "window_end_utc",
    "horizon_profile_deg",
    "horizon_source",
    "latitude_deg",
    "longitude_deg",
    "elevation_m",
    "solar_uptime_pct",
    "earth_visible_pct",
    "longest_dark_hours",
    "longest_comms_gap_hours",
    "peak_sun_elevation_deg",
    "mean_earth_elevation_deg",
    "sunlit_episodes",
    "model_id",
    "model_provenance",
  ];
  const rows = analyses.map((a) =>
    [
      a.site.name,
      a.site.region,
      formatUTC(a.samples[0]?.t ?? 0),
      formatUTC(a.samples[a.samples.length - 1]?.t ?? 0),
      a.site.horizon.join(";"),
      a.horizonSource,
      a.site.lat,
      a.site.lon,
      a.site.elevation,
      (a.illumination * 100).toFixed(2),
      (a.earthVisibility * 100).toFixed(2),
      a.longestDarkHours.toFixed(2),
      a.longestGapHours.toFixed(2),
      a.maxSunAlt.toFixed(3),
      a.meanEarthAlt.toFixed(3),
      a.sunlitIntervals.length,
      MODEL_ID,
      MODEL_PROVENANCE,
    ]
      .map(csvCell)
      .join(","),
  );
  return [head.join(","), ...rows].join("\n");
}

/** One row per site per time step: the full sampled time series. */
export function timeseriesCsv(analyses: SiteAnalysis[]): string {
  const head = [
    "site",
    "utc",
    "sun_elevation_deg",
    "sun_azimuth_deg",
    "earth_elevation_deg",
    "earth_azimuth_deg",
    "sun_terrain_horizon_deg",
    "earth_terrain_horizon_deg",
    "horizon_source",
    "sunlit",
    "earth_visible",
    "model_id",
    "model_provenance",
  ];
  const rows: string[] = [];
  for (const a of analyses) {
    for (const s of a.samples) {
      rows.push(
        [
          csvCell(a.site.name),
          formatUTC(s.t),
          s.sunAlt.toFixed(3),
          s.sunAz.toFixed(2),
          s.earthAlt.toFixed(3),
          s.earthAz.toFixed(2),
          s.sunHorizon.toFixed(3),
          s.earthHorizon.toFixed(3),
          a.horizonSource,
          s.sunUp ? 1 : 0,
          s.earthUp ? 1 : 0,
          csvCell(MODEL_ID),
          csvCell(MODEL_PROVENANCE),
        ].join(","),
      );
    }
  }
  return [head.join(","), ...rows].join("\n");
}

export function reportJson(
  analyses: SiteAnalysis[],
  meta: { start: string; days: number },
): string {
  return JSON.stringify(
    {
      generated: new Date().toISOString(),
      model: {
        id: MODEL_ID,
        provenance: MODEL_PROVENANCE,
        accuracy: "Not independently validated; compare against NASA JPL Horizons for the selected site and window.",
      },
      window: { startUtc: meta.start, durationDays: meta.days },
      note: "Planning-grade geometry. Built-in horizons are derived from local NASA LRO LOLA 240 m DEM patches when available; fallback profiles are illustrative. Custom sites use user-defined constant horizons. Horizon is not a surveyed landing pad profile and results are not flight-certified. Intervals are clipped to each window and events are sample-limited.",
      sites: analyses.map((a) => ({
        name: a.site.name,
        startUtc: formatUTC(a.samples[0]?.t ?? 0),
        endUtc: formatUTC(a.samples[a.samples.length - 1]?.t ?? 0),
        sampleStepSeconds: a.stepMs / 1000,
        horizonProfileDeg: a.site.horizon,
        horizonSource: a.horizonSource,
        horizonNotes: a.site.notes,
        region: a.site.region,
        lat: a.site.lat,
        lon: a.site.lon,
        elevationM: a.site.elevation,
        solarUptimePct: +(a.illumination * 100).toFixed(2),
        earthVisiblePct: +(a.earthVisibility * 100).toFixed(2),
        longestDarkHours: +a.longestDarkHours.toFixed(2),
        longestCommsGapHours: +a.longestGapHours.toFixed(2),
        peakSunElevationDeg: +a.maxSunAlt.toFixed(3),
        meanEarthElevationDeg: +a.meanEarthAlt.toFixed(3),
        sunlitIntervals: a.sunlitIntervals.map((i) => ({
          startUtc: formatUTC(i.start),
          endUtc: formatUTC(i.end),
        })),
        earthLinkIntervals: a.earthIntervals.map((i) => ({
          startUtc: formatUTC(i.start),
          endUtc: formatUTC(i.end),
        })),
      })),
    },
    null,
    2,
  );
}

export function exportSummaryCsv(analyses: SiteAnalysis[], stamp: string) {
  download(`site-comparison-${stamp}.csv`, "text/csv", summaryCsv(analyses));
}

export function exportTimeseriesCsv(analyses: SiteAnalysis[], stamp: string) {
  download(`site-timeseries-${stamp}.csv`, "text/csv", timeseriesCsv(analyses));
}

export function exportReportJson(
  analyses: SiteAnalysis[],
  meta: { start: string; days: number },
) {
  download(
    `mission-windows-${meta.start}.json`,
    "application/json",
    reportJson(analyses, meta),
  );
}

function escapeHtml(value: unknown) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

/** Save a self-contained, printable brief that can be shared as an HTML file. */
export function exportMissionBrief(analyses: SiteAnalysis[], meta: { start: string; days: number; priority: string }) {
  const startMs = Date.parse(`${meta.start}:00Z`);
  const endMs = startMs + meta.days * 86400000;
  const sunWeight = meta.priority.toLowerCase().startsWith('power') ? 0.75 : meta.priority.toLowerCase().startsWith('earth') ? 0.25 : 0.5;
  const rows = analyses.map((a, index) => {
    const score = (sunWeight * a.illumination + (1 - sunWeight) * a.earthVisibility) * 100;
    const label = index === 0 ? 'A' : 'B';
    return `<tr><td><b>${label} - ${escapeHtml(a.site.name)}</b><small>${a.site.lat.toFixed(2)} deg, ${a.site.lon.toFixed(2)} deg - ${escapeHtml(a.horizonSource === 'lola-dem' ? 'NASA LRO LOLA derived horizon' : a.horizonSource === 'custom' ? 'User declared constant horizon' : 'Illustrative horizon')}</small></td><td>${score.toFixed(1)}</td><td>${(a.illumination * 100).toFixed(1)}%</td><td>${(a.earthVisibility * 100).toFixed(1)}%</td><td>${escapeHtml(formatDuration(a.longestDarkHours))}</td><td>${escapeHtml(formatDuration(a.longestGapHours))}</td></tr>`;
  }).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Lunar mission brief</title><style>
    :root{color-scheme:dark;--bg:#080c11;--panel:#101820;--line:#25333d;--text:#edf4f7;--muted:#9aabb4;--mint:#53d8bb;--sun:#ffc45d;--earth:#62cbff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 80% 0%,#142330 0,transparent 42%),var(--bg);color:var(--text);font:15px/1.55 Inter,ui-sans-serif,system-ui,sans-serif}.page{max-width:1000px;margin:0 auto;padding:56px 32px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:11px;color:var(--mint);font-weight:700}.hero{border:1px solid var(--line);border-radius:22px;padding:34px;background:linear-gradient(130deg,#111e26,#0b1117)}h1{font-size:40px;line-height:1.05;margin:12px 0}p{color:var(--muted)}.facts,.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px}.fact,.card{border:1px solid var(--line);border-radius:14px;background:#0b1218;padding:16px}.fact span,.label{display:block;color:var(--muted);font-size:10px;letter-spacing:.12em;text-transform:uppercase}.fact strong{display:block;margin-top:6px;font:16px ui-monospace,monospace}.section{margin-top:28px}.section h2{font-size:19px}table{width:100%;border-collapse:collapse;background:#0b1218;border:1px solid var(--line);border-radius:14px;overflow:hidden}th,td{text-align:left;padding:13px;border-bottom:1px solid var(--line);font-size:12px}th{color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-size:10px}td small{display:block;color:var(--muted);margin-top:4px}.sun{color:var(--sun)}.earth{color:var(--earth)}.note{border-left:3px solid var(--mint);padding:12px 16px;background:#0c1718;font-size:12px;color:#b7c7cb}a{color:var(--mint)}footer{margin-top:26px;color:var(--muted);font-size:11px}@media(max-width:700px){.page{padding:24px 16px}.facts,.cards{grid-template-columns:1fr}h1{font-size:32px}table{display:block;overflow-x:auto;white-space:nowrap}}@media print{body{background:#fff;color:#111}.page{max-width:none;padding:12mm}.hero,.fact,.card,table{background:#fff;border-color:#bbb}.hero{padding:18px}p,.fact span,.label,th,td small,footer{color:#444}.note{background:#f3f8f6;color:#222}}
    </style></head><body><main class="page"><header class="hero"><p class="eyebrow">Lunar Mission Browser · mission brief</p><h1>South-pole site comparison</h1><p>Preliminary visibility screening for ${escapeHtml(formatUTC(startMs))} to ${escapeHtml(formatUTC(endMs))} UTC.</p><div class="facts"><div class="fact"><span>Mission duration</span><strong>${meta.days} days</strong></div><div class="fact"><span>Priority</span><strong>${escapeHtml(meta.priority)}</strong></div><div class="fact"><span>Sites compared</span><strong>${analyses.length}</strong></div></div></header><section class="section"><h2>Mission readout</h2><table><thead><tr><th>Landing site / horizon source</th><th>Weighted score</th><th class="sun">Sunlight</th><th class="earth">Earth visible</th><th>Longest dark</th><th>Longest Earth gap</th></tr></thead><tbody>${rows}</tbody></table></section><section class="section"><h2>How to read this brief</h2><p>Score = sunlight weight x sunlight fraction + Earth weight x Earth-visibility fraction. The selected priority and weights are shown above. Longest darkness and Earth gap are operational screening metrics; they do not enter the score. Percentages describe sampled line-of-sight availability, not generated power or guaranteed radio performance.</p></section><section class="section note"><strong>Model limits</strong><br>Positions use the app’s approximate, truncated Meeus ephemeris. Built-in planner horizons use bundled NASA LRO LOLA 240 m elevation patches when loaded; these local DEM-derived skylines do not represent a surveyed lander pad, boulders, or vehicle occlusion. Custom sites use the explicitly declared constant horizon. Results are preliminary screening estimates, not flight-certified guidance. JPL Horizons data is a separate cross-check and is not automatically substituted into these results.</section><footer>Data provenance: NASA LRO LOLA LDEM_75S_240M PDS3 V2.0 · Ephemeris: in-app approximation · Generated ${escapeHtml(new Date().toISOString())}.<br><a href="https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_75s_240m.img">NASA PDS LOLA source</a> · <a href="https://ssd.jpl.nasa.gov/horizons/">JPL Horizons</a></footer></main></body></html>`;
  const stamp = (meta.start || new Date().toISOString().slice(0, 10)).replaceAll(':', '-');
  download(`lunar-mission-brief-${stamp}.html`, 'text/html;charset=utf-8', html);
}
