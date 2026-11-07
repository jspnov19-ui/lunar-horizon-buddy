import { formatDuration, type SiteAnalysis } from './analysis';
import type { LandingSite } from './sites';

export const PRIORITY_WEIGHTS = { power: 0.75, balanced: 0.5, comms: 0.25 };
export type Priority = keyof typeof PRIORITY_WEIGHTS;

export function rankSites(analyses: SiteAnalysis[], priority: Priority) {
  const weight = PRIORITY_WEIGHTS[priority];
  return [...analyses].sort((a, b) =>
    (weight * b.illumination + (1 - weight) * b.earthVisibility) -
    (weight * a.illumination + (1 - weight) * a.earthVisibility));
}

export function customSite(name: string, lat: number, lon: number, horizon: number): LandingSite {
  if (!name.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180 ||
      !Number.isFinite(horizon) || horizon < 0 || horizon > 90) {
    throw new Error('Enter a name, latitude −90 to 90°, longitude −180 to 180°, and horizon 0 to 90°.');
  }
  return { id: `custom-${name.trim()}-${lat}-${lon}`, name: name.trim(), lat, lon,
    region: 'Custom · constant horizon', elevation: 0, horizon: Array(12).fill(horizon),
    notes: 'User-defined constant horizon; terrain and elevation are not surveyed.' };
}

export function nextTransition(analysis: SiteAnalysis, index: number, body: 'sun' | 'earth') {
  const current = analysis.samples[index];
  if (!current) return 'Unavailable';
  const key = body === 'sun' ? 'sunUp' : 'earthUp';
  const next = analysis.samples.slice(index + 1).find(s => s[key] !== current[key]);
  if (!next) return 'Beyond this window';
  return `≈ ${formatDuration((next.t - current.t) / 3600000)}`;
}