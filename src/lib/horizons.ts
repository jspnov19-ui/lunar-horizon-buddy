/** Parser for JPL Horizons OBSERVER tables (CSV_FORMAT = YES). Pure and testable. */

export interface HorizonsRow {
  /** UTC epoch, ms */
  t: number;
  /** Azimuth, degrees east of north */
  az: number;
  /** Airless elevation of the body centre, degrees */
  el: number;
}

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export function parseHorizonsDate(text: string): number {
  const m = text.trim().match(/^(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return NaN;
  const [, year, monthName, day, hour, minute, second] = m;
  if (!year || !monthName || !day || !hour || !minute) return NaN;
  const month = MONTHS[monthName];
  if (month === undefined) return NaN;
  return Date.UTC(+year, month, +day, +hour, +minute, second ? +second : 0);
}

/**
 * Reads the rows between $$SOE and $$EOE. The query asks for QUANTITIES 4
 * (azimuth, elevation) and 13 (angular diameter), so after the date and the
 * two blank presence-flag columns the last three numbers are az, el, diameter.
 */
export function parseHorizonsTable(text: string): HorizonsRow[] {
  const start = text.indexOf("$$SOE");
  const end = text.indexOf("$$EOE");
  if (start < 0 || end < 0 || end <= start) return [];
  const body = text.slice(start + 5, end);
  const rows: HorizonsRow[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const f = line.split(",").map((s) => s.trim());
    while (f.length && f[f.length - 1] === "") f.pop();
    if (f.length < 4 || !f[0]) continue;
    const t = parseHorizonsDate(f[0]);
    const azValue = f[f.length - 3];
    const elValue = f[f.length - 2];
    if (azValue === undefined || elValue === undefined) continue;
    const az = Number(azValue);
    const el = Number(elValue);
    if (!Number.isFinite(t) || !Number.isFinite(az) || !Number.isFinite(el)) continue;
    rows.push({ t, az, el });
  }
  return rows;
}

/** First readable line of a Horizons error reply, for display. */
export function horizonsError(text: string): string {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("API"));
  return (line ?? "No data returned").slice(0, 200);
}
