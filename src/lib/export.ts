import { formatUTC, type SiteAnalysis } from "./analysis";

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
  ];
  const rows = analyses.map((a) =>
    [
      a.site.name,
      a.site.region,
      formatUTC(a.samples[0]?.t ?? 0),
      formatUTC(a.samples[a.samples.length - 1]?.t ?? 0),
      a.site.horizon.join(";"),
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
    "sunlit",
    "earth_visible",
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
          s.sunUp ? 1 : 0,
          s.earthUp ? 1 : 0,
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
      window: { startUtc: meta.start, durationDays: meta.days },
      note: "Planning-grade geometry. Curated horizon profiles are illustrative; custom sites use user-defined constant horizons. Not surveyed or flight-certified. Intervals are clipped to each window and events are sample-limited.",
      sites: analyses.map((a) => ({
        name: a.site.name,
        startUtc: formatUTC(a.samples[0]?.t ?? 0),
        endUtc: formatUTC(a.samples[a.samples.length - 1]?.t ?? 0),
        sampleStepSeconds: a.stepMs / 1000,
        horizonProfileDeg: a.site.horizon,
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
