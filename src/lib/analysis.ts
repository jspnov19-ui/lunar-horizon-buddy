import { computeHorizon, horizonAt } from "./astro";
import type { LandingSite } from "./sites";

export interface Sample {
  t: number; // epoch ms
  sunAlt: number;
  sunAz: number;
  earthAlt: number;
  earthAz: number;
  sunHorizon: number;
  earthHorizon: number;
  sunUp: boolean;
  earthUp: boolean;
  sunRadius: number;
  earthRadius: number;
}

export interface Interval {
  start: number;
  end: number;
}

export interface SiteAnalysis {
  site: LandingSite;
  horizonSource: 'lola-dem' | 'illustrative' | 'custom';
  samples: Sample[];
  stepMs: number;
  illumination: number; // 0..1
  earthVisibility: number; // 0..1
  longestDarkHours: number;
  longestGapHours: number;
  maxSunAlt: number;
  meanEarthAlt: number;
  sunlitIntervals: Interval[];
  earthIntervals: Interval[];
}

export function sampleSite(
  site: LandingSite,
  startMs: number,
  days: number,
  steps = 720,
  horizonSource: SiteAnalysis['horizonSource'] = site.id.startsWith('custom-') ? 'custom' : 'illustrative',
): SiteAnalysis {
  const spanMs = days * 86400000;
  const stepMs = spanMs / steps;
  const samples: Sample[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = startMs + i * stepMs;
    const h = computeHorizon(new Date(t), site.lat, site.lon);
    const sunHorizon = horizonAt(site.horizon, h.sunAz);
    const earthHorizon = horizonAt(site.horizon, h.earthAz);
    samples.push({
      t,
      sunAlt: h.sunAlt,
      sunAz: h.sunAz,
      earthAlt: h.earthAlt,
      earthAz: h.earthAz,
      sunHorizon,
      earthHorizon,
      sunUp: h.sunAlt + h.sunRadius > sunHorizon,
      earthUp: h.earthAlt + h.earthRadius > earthHorizon,
      sunRadius: h.sunRadius,
      earthRadius: h.earthRadius,
    });
  }

  const sunlitIntervals = runs(samples, (s) => s.sunUp);
  const earthIntervals = runs(samples, (s) => s.earthUp);
  const darkIntervals = runs(samples, (s) => !s.sunUp);
  const gapIntervals = runs(samples, (s) => !s.earthUp);

  const lit = samples.filter((s) => s.sunUp).length / samples.length;
  const vis = samples.filter((s) => s.earthUp).length / samples.length;

  return {
    site,
    horizonSource,
    samples,
    stepMs,
    illumination: lit,
    earthVisibility: vis,
    longestDarkHours: longest(darkIntervals) / 3600000,
    longestGapHours: longest(gapIntervals) / 3600000,
    maxSunAlt: Math.max(...samples.map((s) => s.sunAlt)),
    meanEarthAlt:
      samples.reduce((a, s) => a + s.earthAlt, 0) / samples.length,
    sunlitIntervals,
    earthIntervals,
  };
}

function runs(samples: Sample[], pred: (s: Sample) => boolean): Interval[] {
  const out: Interval[] = [];
  let start: number | null = null;
  for (const s of samples) {
    if (pred(s)) {
      if (start === null) start = s.t;
    } else if (start !== null) {
      out.push({ start, end: s.t });
      start = null;
    }
  }
  const last = samples[samples.length - 1];
  if (start !== null && last) out.push({ start, end: last.t });
  return out;
}

function longest(intervals: Interval[]): number {
  return intervals.reduce((m, i) => Math.max(m, i.end - i.start), 0);
}

export function formatDuration(hours: number): string {
  if (hours <= 0) return "none";
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }
  const d = Math.floor(hours / 24);
  const h = Math.round(hours - d * 24);
  return `${d}d ${h}h`;
}

export function formatUTC(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(
    d.getUTCDate(),
  )} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}
