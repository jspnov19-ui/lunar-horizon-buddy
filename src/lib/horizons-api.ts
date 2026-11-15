import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { horizonsUrl } from "./lunar-tools";
import { horizonsError, parseHorizonsTable, type HorizonsRow } from "./horizons";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-360).max(360),
  startMs: z.number().finite(),
  days: z.number().min(0.1).max(90),
  body: z.enum(["sun", "earth"]),
});

export type HorizonsResult =
  { ok: true; rows: HorizonsRow[]; fetchedAt: number } | { ok: false; error: string };

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: HorizonsResult }>();

/**
 * Runs on the server so the browser never makes a cross-origin request to
 * NASA. Returns {ok:false} instead of throwing so the UI can fall back.
 */
export const fetchHorizons = createServerFn({ method: "POST" })
  .validator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<HorizonsResult> => {
    const key = JSON.stringify(data);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

    let value: HorizonsResult;
    try {
      const url = horizonsUrl(
        { lat: data.lat, lon: data.lon },
        data.startMs,
        data.days,
        data.body,
        0,
      );
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const text = await res.text();
      const rows = res.ok ? parseHorizonsTable(text) : [];
      value = rows.length
        ? { ok: true, rows, fetchedAt: Date.now() }
        : {
            ok: false,
            error: res.ok
              ? `NASA Horizons: ${horizonsError(text)}`
              : `NASA Horizons returned HTTP ${res.status}.`,
          };
    } catch {
      value = { ok: false, error: "Could not reach NASA Horizons (timeout or network error)." };
    }
    if (value.ok) cache.set(key, { at: Date.now(), value });
    return value;
  });
