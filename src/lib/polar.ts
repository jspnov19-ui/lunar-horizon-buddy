/**
 * South-polar stereographic map maths (browser-safe, no dependencies).
 *
 * The map is a square SVG (SIZE x SIZE) centred on the lunar south pole.
 * Latitude/longitude <-> pixel conversion uses the polar stereographic
 * projection on a sphere of radius 1737.4 km:
 *     rho = 2 R tan(colatitude / 2)
 *
 * CALIBRATION: if you use a background mosaic, adjust MAP_CONFIG until the
 * site markers sit on the right craters.
 */
export const MOON_RADIUS_KM = 1737.4;
export const SIZE = 1000;

export interface MapConfig {
  /** Public path of the background mosaic (put the file in /public). */
  image: string;
  /** Distance from the pole to the middle of the image edge, in km. */
  halfWidthKm: number;
  /** Rotates the whole map (degrees, clockwise). 0 = 0 deg longitude at the top. */
  rotationDeg: number;
  /** true = east longitudes run to the LEFT instead of the right. */
  mirror: boolean;
}

export const MAP_CONFIG: MapConfig = {
  image: "/south-pole-mosaic.jpg",
  halfWidthKm: 304, // ~ 80 deg S at the middle of each edge
  rotationDeg: 0,
  mirror: false,
};

const DEG = Math.PI / 180;

/** Distance from the pole (km) of a latitude, measured on the projection plane. */
export function rhoKm(lat: number): number {
  return 2 * MOON_RADIUS_KM * Math.tan(((90 + lat) * DEG) / 2);
}

export function project(lat: number, lon: number, cfg: MapConfig = MAP_CONFIG) {
  const k = SIZE / 2 / cfg.halfWidthKm;
  const rho = rhoKm(lat) * k;
  const a = (lon * (cfg.mirror ? -1 : 1) + cfg.rotationDeg) * DEG;
  return { x: SIZE / 2 + rho * Math.sin(a), y: SIZE / 2 - rho * Math.cos(a) };
}

export function unproject(x: number, y: number, cfg: MapConfig = MAP_CONFIG) {
  const k = SIZE / 2 / cfg.halfWidthKm;
  const dx = x - SIZE / 2;
  const dy = SIZE / 2 - y;
  const rho = Math.hypot(dx, dy) / k;
  const colat = 2 * Math.atan(rho / (2 * MOON_RADIUS_KM)) / DEG;
  const lat = -90 + colat;
  let lon = Math.atan2(dx, dy) / DEG - cfg.rotationDeg;
  if (cfg.mirror) lon = -lon;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat, lon };
}
