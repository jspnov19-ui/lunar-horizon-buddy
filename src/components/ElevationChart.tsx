import type { SiteAnalysis } from "@/lib/analysis";

const W = 1000;
const H = 180;
const PAD_L = 34;
const PAD_B = 18;

export function ElevationChart({
  analysis,
  index,
}: {
  analysis: SiteAnalysis;
  index: number;
}) {
  const { samples } = analysis;
  const alts = samples.flatMap((s) => [s.sunAlt, s.earthAlt, s.sunHorizon]);
  const min = Math.min(...alts, 0) - 2;
  const max = Math.max(...alts, 0) + 2;

  const x = (i: number) => PAD_L + ((W - PAD_L) * i) / (samples.length - 1);
  const y = (v: number) => (H - PAD_B) * (1 - (v - min) / (max - min));

  const line = (pick: (s: (typeof samples)[number]) => number) =>
    samples.map((s, i) => `${x(i).toFixed(1)},${y(pick(s)).toFixed(1)}`).join(" ");

  const ticks = [min, (min + max) / 2, 0, max].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Elevation over time">
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            x2={W}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--grid-line)"
            strokeDasharray={Math.abs(v) < 0.001 ? undefined : "2 5"}
          />
          <text x={4} y={y(v) + 3} fontSize={10} className="fill-muted-foreground font-mono">
            {v.toFixed(0)}°
          </text>
        </g>
      ))}
      <polyline points={line((s) => s.sunHorizon)} fill="none" stroke="var(--terrain-edge)" strokeWidth={1.5} strokeDasharray="4 3" />
      <polyline points={line((s) => s.earthAlt)} fill="none" stroke="var(--earth)" strokeWidth={1.75} />
      <polyline points={line((s) => s.sunAlt)} fill="none" stroke="var(--sun)" strokeWidth={1.75} />
      <line x1={x(index)} x2={x(index)} y1={0} y2={H - PAD_B} stroke="var(--foreground)" strokeWidth={1} opacity={0.6} />
    </svg>
  );
}
