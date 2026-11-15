import { describe, expect, test } from "bun:test";
import { horizonsUrl, quickMapUrl } from "./lunar-tools.ts";
import { missionSummary } from "./recommendation.ts";
import { sampleSite } from "./analysis.ts";
import { SITES } from "./sites.ts";

describe("external lunar verification settings", () => {
  test("QuickMap bounds contain the site without passing outside the lunar poles", () => {
    const extent = new URL(quickMapUrl(SITES[0])).searchParams.get("extent").split(",").map(Number);
    expect(extent[0]).toBeLessThan(SITES[0].lon);
    expect(extent[2]).toBeGreaterThan(SITES[0].lon);
    expect(extent[1]).toBe(-90);
    expect(extent[3]).toBeGreaterThan(SITES[0].lat);
  });
  test("Horizons uses a Moon-surface observer, Sun and Earth IDs and mission UTC dates", () => {
    const start = Date.UTC(2026, 10, 7);
    const sun = new URL(horizonsUrl(SITES[0], start, 7, "sun")).searchParams;
    const earth = new URL(horizonsUrl(SITES[0], start, 7, "earth", 1.25)).searchParams;
    expect(sun.get("CENTER")).toBe("'coord@301'");
    expect(sun.get("COMMAND")).toBe("'10'");
    expect(earth.get("COMMAND")).toBe("'399'");
    expect(sun.get("SITE_COORD")).toBe("'223,-89.45,0'");
    expect(earth.get("SITE_COORD")).toBe("'223,-89.45,1.25'");
    expect(sun.get("START_TIME")).toBe("'2026-11-07 00:00:00'");
    expect(sun.get("STOP_TIME")).toBe("'2026-11-14 00:00:00'");
    expect(sun.get("APPARENT")).toBe("'AIRLESS'");
    expect(sun.get("QUANTITIES")).toBe("'4,13'");
    expect(() => horizonsUrl(SITES[0], NaN, 7, "sun")).toThrow();
  });
  test("recommendations change with the selected analysis and do not invent alternative sites", () => {
    const base = sampleSite(SITES[0], Date.UTC(2026, 10, 7), 7, 24);
    const unlit = { ...base, illumination: 0, earthVisibility: 1 };
    const lit = { ...base, illumination: 1, earthVisibility: 0 };
    expect(missionSummary(unlit, [unlit])).not.toBe(missionSummary(lit, [lit]));
    expect(missionSummary(unlit, [])).not.toContain(SITES[2].name);
  });
});
