/**
 * Low-precision lunar-surface ephemeris.
 *
 * Computes the apparent altitude/azimuth of the Sun and Earth as seen from a
 * point on the lunar surface, using truncated Meeus series for the Sun and
 * Moon plus the optical-libration transform (Meeus ch. 53) to convert an
 * ecliptic direction into selenographic coordinates.
 *
 * Observer parallax is included. Accuracy has not been independently validated;
 * use the in-app NASA Horizons comparison to measure the actual error.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const I_MOON = 1.54242 * DEG; // inclination of lunar equator to the ecliptic

const sin = (d: number) => Math.sin(d * DEG);
const cos = (d: number) => Math.cos(d * DEG);

export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

export function fromJulianDay(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

type Vec3 = [number, number, number];

/** Geocentric ecliptic rectangular position of the Sun, in km. */
function sunVector(T: number): Vec3 {
  const L0 = 280.46646 + 36000.76983 * T;
  const M = 357.52911 + 35999.05029 * T;
  const C =
    1.914602 * sin(M) + 0.019993 * sin(2 * M) + 0.000289 * sin(3 * M);
  const lambda = L0 + C;
  const R =
    (1.000014 - 0.016708 * cos(M) - 0.000139 * cos(2 * M)) * 149597870.7;
  return [R * cos(lambda), R * sin(lambda), 0];
}

/** Geocentric ecliptic rectangular position of the Moon, in km. */
function moonVector(T: number): { vec: Vec3; lambda: number; F: number; omega: number } {
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T;
  const F = 93.272095 + 483202.0175233 * T;
  const omega = 125.0445479 - 1934.1362891 * T;

  const lambda =
    Lp +
    6.288774 * sin(Mp) +
    1.274027 * sin(2 * D - Mp) +
    0.658314 * sin(2 * D) +
    0.213618 * sin(2 * Mp) -
    0.185116 * sin(M) -
    0.114332 * sin(2 * F) +
    0.058793 * sin(2 * D - 2 * Mp) +
    0.057066 * sin(2 * D - M - Mp) +
    0.053322 * sin(2 * D + Mp) +
    0.045758 * sin(2 * D - M) -
    0.040923 * sin(M - Mp) -
    0.03472 * sin(D) -
    0.030383 * sin(M + Mp);

  const beta =
    5.128122 * sin(F) +
    0.280602 * sin(Mp + F) +
    0.277693 * sin(Mp - F) +
    0.173237 * sin(2 * D - F) +
    0.055413 * sin(2 * D - Mp + F) +
    0.046271 * sin(2 * D - Mp - F) +
    0.032573 * sin(2 * D + F) +
    0.017198 * sin(2 * Mp + F);

  const dist =
    385000.56 -
    20905.355 * cos(Mp) -
    3699.111 * cos(2 * D - Mp) -
    2955.968 * cos(2 * D) -
    569.925 * cos(2 * Mp) +
    246.158 * cos(2 * D - 2 * Mp) -
    152.138 * cos(2 * D - M - Mp) -
    170.733 * cos(2 * D + Mp);

  const vec: Vec3 = [
    dist * cos(beta) * cos(lambda),
    dist * cos(beta) * sin(lambda),
    dist * sin(beta),
  ];
  return { vec, lambda, F, omega };
}

/** Ecliptic longitude/latitude (deg) + range (km) of a rectangular vector. */
function toSpherical(v: Vec3) {
  const r = Math.hypot(v[0], v[1], v[2]);
  const lambda = Math.atan2(v[1], v[0]) * RAD;
  const beta = Math.asin(v[2] / r) * RAD;
  return { lambda, beta, r };
}

/**
 * Selenographic longitude/latitude of the sub-point of a direction given by
 * its geocentric-ecliptic longitude/latitude as seen from the Moon's centre.
 */
function selenographic(lambda: number, beta: number, F: number, omega: number) {
  const W = (lambda - omega) * DEG;
  const b = beta * DEG;
  const X = Math.sin(W) * Math.cos(b);
  const Y =
    Math.cos(W) * Math.cos(b) * Math.cos(I_MOON) -
    Math.sin(b) * Math.sin(I_MOON);
  const A = Math.atan2(X, Y) * RAD;
  let lon = A - F;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  const latSin =
    -Math.sin(W) * Math.cos(b) * Math.sin(I_MOON) -
    Math.sin(b) * Math.cos(I_MOON);
  const lat = Math.asin(Math.max(-1, Math.min(1, latSin))) * RAD;
  return { lon, lat };
}

export interface HorizonSample {
  /** Apparent altitude of the Sun centre above the local (spherical) horizon, deg. */
  sunAlt: number;
  /** Azimuth of the Sun, degrees east of selenographic north. */
  sunAz: number;
  earthAlt: number;
  earthAz: number;
  /** Apparent angular radius of the Earth disc, deg. */
  earthRadius: number;
  /** Apparent angular radius of the Sun disc, deg. */
  sunRadius: number;
}

const SUN_RADIUS_KM = 696000;
const EARTH_RADIUS_KM = 6378.14;

const MOON_RADIUS_KM = 1737.4;

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Topocentric altitude/azimuth of a body for an observer standing on the lunar
 * surface. The body is given as the selenographic sub-point of its direction
 * from the Moon's centre plus its range (km). Using the real observer position
 * (instead of the Moon's centre) adds parallax, which is ~0.26 deg for Earth,
 * about the same size as the terrain horizons used here.
 */
function altAz(
  subLon: number,
  subLat: number,
  rangeKm: number,
  siteLon: number,
  siteLat: number,
) {
  const sl = siteLat * DEG;
  const sn = siteLon * DEG;
  const up: Vec3 = [Math.cos(sl) * Math.cos(sn), Math.cos(sl) * Math.sin(sn), Math.sin(sl)];
  const north: Vec3 = [-Math.sin(sl) * Math.cos(sn), -Math.sin(sl) * Math.sin(sn), Math.cos(sl)];
  const east: Vec3 = [-Math.sin(sn), Math.cos(sn), 0];

  const bl = subLat * DEG;
  const bn = subLon * DEG;
  const v: Vec3 = [
    rangeKm * Math.cos(bl) * Math.cos(bn) - MOON_RADIUS_KM * up[0],
    rangeKm * Math.cos(bl) * Math.sin(bn) - MOON_RADIUS_KM * up[1],
    rangeKm * Math.sin(bl) - MOON_RADIUS_KM * up[2],
  ];

  const u = dot(v, up);
  const n = dot(v, north);
  const e = dot(v, east);
  const alt = Math.atan2(u, Math.hypot(n, e)) * RAD;
  const az = Math.atan2(e, n) * RAD;
  return { alt, az: (az + 360) % 360 };
}

export function computeHorizon(
  date: Date,
  siteLat: number,
  siteLon: number,
): HorizonSample {
  const T = (julianDay(date) - 2451545) / 36525;
  const moon = moonVector(T);
  const sunV = sunVector(T);
  const m = moon.vec;

  const toSun: Vec3 = [sunV[0] - m[0], sunV[1] - m[1], sunV[2] - m[2]];
  const toEarth: Vec3 = [-m[0], -m[1], -m[2]];

  const s = toSpherical(toSun);
  const e = toSpherical(toEarth);

  const subSun = selenographic(s.lambda, s.beta, moon.F, moon.omega);
  const subEarth = selenographic(e.lambda, e.beta, moon.F, moon.omega);

  const sunAA = altAz(subSun.lon, subSun.lat, s.r, siteLon, siteLat);
  const earthAA = altAz(subEarth.lon, subEarth.lat, e.r, siteLon, siteLat);

  return {
    sunAlt: sunAA.alt,
    sunAz: sunAA.az,
    earthAlt: earthAA.alt,
    earthAz: earthAA.az,
    sunRadius: Math.asin(SUN_RADIUS_KM / s.r) * RAD,
    earthRadius: Math.asin(EARTH_RADIUS_KM / e.r) * RAD,
  };
}

/**
 * Terrain horizon elevation (deg) at a given azimuth, interpolated from a
 * 12-sector profile starting at north and running clockwise.
 */
export function horizonAt(profile: number[], azimuth: number): number {
  const n = profile.length;
  const x = ((azimuth % 360) + 360) % 360 / (360 / n);
  const i = Math.floor(x) % n;
  const j = (i + 1) % n;
  const f = x - Math.floor(x);
  return (profile[i] ?? 0) * (1 - f) + (profile[j] ?? 0) * f;
}
