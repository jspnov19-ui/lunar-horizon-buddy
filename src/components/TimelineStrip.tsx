import { useRef } from "react";
import type { SiteAnalysis } from "@/lib/analysis";

export function TimelineStrip({
  analysis,
  index,
  onScrub,
  label,
}: {
  analysis: SiteAnalysis;
  index: number;
  onScrub: (i: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const n = analysis.samples.length;
  const first = analysis.samples[0]?.t ?? 0;
  const span = (analysis.samples[n - 1]?.t ?? 1) - first || 1;

  const seek = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onScrub(Math.round(f * (n - 1)));
  };

  const band = (intervals: { start: number; end: number }[], className: string) =>
    intervals.map((iv, i) => (
      <div
        key={i}
        className={`absolute inset-y-0 ${className}`}
        style={{
          left: `${((iv.start - first) / span) * 100}%`,
          width: `${((iv.end - iv.start) / span) * 100}%`,
        }}
      />
    ));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>{label}</span>
        <span className="normal-case tracking-normal">
          sunlit {(analysis.illumination * 100).toFixed(0)}% · DTE{" "}
          {(analysis.earthVisibility * 100).toFixed(0)}%
        </span>
      </div>
      <div
        ref={ref}
        className="cursor-col-resize select-none"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          seek(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) seek(e.clientX);
        }}
      >
        <div className="relative h-4 overflow-hidden bg-shadow">
          {band(analysis.sunlitIntervals, "bg-sun")}
        </div>
        <div className="relative mt-0.5 h-4 overflow-hidden bg-shadow">
          {band(analysis.earthIntervals, "bg-earth")}
        </div>
        <div className="relative h-3">
          <div
            className="absolute -top-9 h-12 w-px bg-foreground"
            style={{ left: `${(index / (n - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
