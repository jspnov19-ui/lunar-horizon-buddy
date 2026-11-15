import type { LandingSite } from './sites';

type Where = Pick<LandingSite, 'lat' | 'lon'>;

export function quickMapUrl(site: LandingSite) {
  const url = new URL('https://quickmap.lroc.asu.edu/');
  url.searchParams.set('extent', [Math.max(-180, site.lon - 2), Math.max(-90, site.lat - 1), Math.min(180, site.lon + 2), Math.min(90, site.lat + 1)].join(','));
  url.searchParams.set('id', 'lroc');
  url.searchParams.set('showTerrain', 'true');
  return url.toString();
}

export function horizonsUrl(site: Where, startMs: number, days: number, body: 'sun' | 'earth', altitudeKm = 0) {
  if (!Number.isFinite(startMs) || !Number.isFinite(days) || days <= 0 || !Number.isFinite(altitudeKm)) throw new Error('Choose a valid mission window and observer altitude.');
  const time = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  const settings = {
    COMMAND: body === 'sun' ? '10' : '399', EPHEM_TYPE: 'OBSERVER',
    CENTER: 'coord@301', COORD_TYPE: 'GEODETIC',
    SITE_COORD: `${((site.lon % 360) + 360) % 360},${site.lat},${altitudeKm}`,
    START_TIME: time(startMs), STOP_TIME: time(startMs + days * 86400000),
    STEP_SIZE: '1 h', QUANTITIES: '4,13', CSV_FORMAT: 'YES',
    ANG_FORMAT: 'DEG', APPARENT: 'AIRLESS', EXTRA_PREC: 'YES',
  };
  const url = new URL('https://ssd.jpl.nasa.gov/api/horizons.api');
  url.searchParams.set('format', 'text');
  for (const [key, value] of Object.entries(settings)) url.searchParams.set(key, `'${value}'`);
  return url.toString();
}
