import { Sparkles } from "lucide-react";
import type { SiteAnalysis } from "@/lib/analysis";
import { formatDuration } from "@/lib/analysis";

export function MissionSummary({
  primary,
  compare,
  days,
}: {
  primary: SiteAnalysis;
  compare?: SiteAnalysis | null;
  days: number;
}) {
  const commsLead = primary.earthVisibility >= primary.illumination;
  const strength = commsLead ? "Earth communication" : "solar power";
  const weakness = commsLead
    ? `${formatDuration(primary.longestDarkHours)} dark period`
    : `${formatDuration(primary.longestGapHours)} longest Earth-link gap`;
  const comparison = compare
    ? ` Compared with ${compare.site.name}, it has ${(Math.abs(primary.illumination - compare.illumination) * 100).toFixed(1)} percentage points ${primary.illumination >= compare.illumination ? "more" : "less"} sunlight.`
    : " Add another site to see a direct trade-off.";
  return (
    <section
      aria-labelledby="mission-summary-title"
      className="rounded-xl border border-primary/35 bg-primary/8 p-4 shadow-[var(--glow-primary)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="mission-summary-title" className="text-sm font-semibold">
              Mission recommendation summary
            </h2>
            <span className="rounded-full border border-primary/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
              {Math.round(days)}-day screen
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">
            <strong>{primary.site.name}</strong> is strongest for {strength}, with{" "}
            {(primary.earthVisibility * 100).toFixed(0)}% Earth visibility and{" "}
            {(primary.illumination * 100).toFixed(0)}% sunlight across this window. Its main
            planning watch-out is the {weakness}.{comparison}
          </p>
        </div>
      </div>
    </section>
  );
}
