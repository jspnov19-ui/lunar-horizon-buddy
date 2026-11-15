/** Browser-safe derivation of local skyline profiles from the bundled LOLA DEM patches. */
const MOON_RADIUS_M = 1_737_400;
const SECTORS = 72;

interface TerrainManifest {
  resolutionM: number;
  spanM: number;
  grid: number;
  source: string;
  sites: Record<string, { file: string; lat: number; lon: number; validFraction: number }>;
}

let profilesPromise: Promise<Record<string, number[]>> | undefined;

export function loadLolaHorizonProfiles(): Promise<Record<string, number[]>> {
  return profilesPromise ??= deriveProfiles().catch((error) => {
    profilesPromise = undefined;
    throw error;
  });
}

async function deriveProfiles() {
  const response = await fetch('/lola-sites/manifest.json');
  if (!response.ok) throw new Error('LOLA terrain manifest unavailable');
  const manifest = await response.json() as TerrainManifest;
  if (!manifest.source.includes('LOLA') || manifest.resolutionM !== 240 || manifest.grid !== 65 || manifest.spanM !== 15360) {
    throw new Error('Unexpected LOLA patch metadata');
  }
  const pairs = await Promise.all(Object.entries(manifest.sites).map(async ([id, entry]) => {
    if (entry.validFraction < 0.98) throw new Error(`Incomplete LOLA patch for ${id}`);
    const patch = await fetch(`/lola-sites/${entry.file}`);
    if (!patch.ok) throw new Error(`LOLA patch unavailable for ${id}`);
    const buffer = await patch.arrayBuffer();
    const view = new DataView(buffer);
    const count = manifest.grid * manifest.grid;
    if (buffer.byteLength !== count * 4) throw new Error(`Invalid LOLA patch for ${id}`);
    const heights = new Float32Array(count);
    for (let i = 0; i < count; i++) heights[i] = view.getFloat32(i * 4, true);
    return [id, deriveOne(entry, manifest, heights)] as const;
  }));
  return Object.fromEntries(pairs);
}

function deriveOne(entry: TerrainManifest['sites'][string], manifest: TerrainManifest, heights: Float32Array) {
  const grid = manifest.grid;
  const center = (grid - 1) / 2;
  const lat1 = entry.lat * Math.PI / 180;
  const lon1 = entry.lon * Math.PI / 180;
  const rho0 = 2 * MOON_RADIUS_M * Math.tan((Math.PI / 2 - Math.abs(lat1)) / 2);
  const originX = rho0 * Math.sin(lon1);
  const originY = rho0 * Math.cos(lon1);
  const best = new Array<number>(SECTORS).fill(-Infinity);
  const observerHeight = heights[Math.floor(center) * grid + Math.floor(center)] ?? 0;

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const dx = (col - center) * manifest.spanM / (grid - 1);
      const dy = (center - row) * manifest.spanM / (grid - 1);
      const distance = Math.hypot(dx, dy);
      if (distance < manifest.resolutionM * 0.7) continue;

      // The DEM is a south-polar stereographic patch. Convert each pixel back
      // to selenographic coordinates to recover its true local bearing/range.
      const x = originX + dx;
      const y = originY + dy;
      const rho = Math.hypot(x, y);
      const lat2 = -Math.PI / 2 + 2 * Math.atan(rho / (2 * MOON_RADIUS_M));
      const lon2 = Math.atan2(x, y);
      const dLon = lon2 - lon1;
      const by = Math.sin(dLon) * Math.cos(lat2);
      const bx = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const bearing = (Math.atan2(by, bx) * 180 / Math.PI + 360) % 360;
      const delta = 2 * Math.asin(Math.min(1, Math.sin(Math.abs(lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2) ** 0.5);
      const range = MOON_RADIUS_M * delta;
      if (range > manifest.spanM) continue;
      const targetHeight = heights[row * grid + col] ?? observerHeight;
      const up = (MOON_RADIUS_M + targetHeight) * Math.cos(delta) - (MOON_RADIUS_M + observerHeight);
      const horizontal = (MOON_RADIUS_M + targetHeight) * Math.sin(delta);
      const elevation = Math.atan2(up, horizontal) * 180 / Math.PI;
      const sector = Math.floor(bearing / 360 * SECTORS) % SECTORS;
      if (elevation > best[sector]!) best[sector] = elevation;
    }
  }

  const profile = best.map((value) => Number.isFinite(value) ? value : NaN);
  // Fill unpopulated azimuth bins by interpolation across their nearest valid
  // neighbors, including the wrap at north.
  for (let i = 0; i < profile.length; i++) {
    if (Number.isFinite(profile[i])) continue;
    let before = 1, after = 1;
    while (before < profile.length && !Number.isFinite(profile[(i - before + profile.length) % profile.length])) before++;
    while (after < profile.length && !Number.isFinite(profile[(i + after) % profile.length])) after++;
    if (before === profile.length || after === profile.length) profile[i] = 0;
    else {
      const a = profile[(i - before + profile.length) % profile.length]!;
      const b = profile[(i + after) % profile.length]!;
      profile[i] = a + (b - a) * before / (before + after);
    }
  }
  // The lunar body itself sets the geometric horizon at 0°; distant terrain
  // below the observer's tangent plane cannot lower that obstruction.
  return profile.map((value) => Math.max(0, value));
}
