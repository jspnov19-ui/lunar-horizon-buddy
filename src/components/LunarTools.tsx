import type { LandingSite } from "@/lib/sites";
import { horizonsUrl, quickMapUrl } from "@/lib/lunar-tools";

type LunarToolsProps = {
  site: LandingSite;
  startMs: number;
  days: number;
};

export function LunarTools({ site, startMs, days }: LunarToolsProps) {
  const sunUrl = horizonsUrl(site, startMs, days, "sun");
  const earthUrl = horizonsUrl(site, startMs, days, "earth");

  return (
    <nav aria-label="External lunar data tools" className="flex flex-wrap gap-2">
      <a
        href={quickMapUrl(site)}
        target="_blank"
        rel="noreferrer"
        className="rounded-md border border-input px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"
      >
        Open LROC QuickMap
      </a>
      <a
        href="https://trek.nasa.gov/moon/"
        target="_blank"
        rel="noreferrer"
        className="rounded-md border border-input px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"
      >
        Explore NASA Moon Trek
      </a>
      <a
        href={sunUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-md border border-input px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"
      >
        Verify Sun in Horizons
      </a>
      <a
        href={earthUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-md border border-input px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"
      >
        Verify Earth in Horizons
      </a>
    </nav>
  );
}
