import { describe, expect, test } from "bun:test";
import { parseHorizonsDate, parseHorizonsTable } from "./horizons.ts";
import { MAP_CONFIG, project, unproject } from "./polar.ts";

const SAMPLE = `header junk
$$SOE
 2026-Nov-07 00:00,  ,  , 123.456789,   1.234567, 1919.12,
 2026-Nov-07 01:00,  ,  , 124.000000,  -0.500000, 1919.13,
$$EOE
footer`;

describe("Horizons parser", () => {
  test("reads UTC time, azimuth and elevation between the markers", () => {
    const rows = parseHorizonsTable(SAMPLE);
    expect(rows.length).toBe(2);
    expect(rows[0].t).toBe(Date.UTC(2026, 10, 7, 0, 0));
    expect(rows[0].az).toBeCloseTo(123.456789, 6);
    expect(rows[1].el).toBeCloseTo(-0.5, 6);
  });
  test("returns nothing for an error reply and bad dates", () => {
    expect(parseHorizonsTable("No ephemeris for target")).toEqual([]);
    expect(Number.isNaN(parseHorizonsDate("garbage"))).toBe(true);
  });
});

describe("polar map projection", () => {
  test("round-trips latitude and longitude", () => {
    for (const [lat, lon] of [
      [-89.45, -137],
      [-85.99, 2.9],
      [-84.3, 82.8],
    ]) {
      const p = project(lat, lon);
      const q = unproject(p.x, p.y);
      expect(q.lat).toBeCloseTo(lat, 6);
      expect(q.lon).toBeCloseTo(lon, 6);
    }
  });
  test("0 deg longitude is at the top and the pole is the centre", () => {
    expect(project(-90, 0).x).toBeCloseTo(500, 6);
    const top = project(-85, 0);
    expect(top.x).toBeCloseTo(500, 6);
    expect(top.y).toBeLessThan(500);
    expect(project(-85, 90, { ...MAP_CONFIG, mirror: true }).x).toBeLessThan(500);
  });
});
