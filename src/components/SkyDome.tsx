import { horizonAt } from "@/lib/astro";
import { ExplainedTerm } from "@/components/InfoTooltip";
import type { SiteAnalysis } from "@/lib/analysis";

const R = 150;
const CX = 170;
const CY = 170;

function project(alt: number, az: number) {
  const clamped = Math.max(-6, Math.min(90, alt));
  const r = R * (1 - clamped / 90);
  return [
    CX + r * Math.sin((az * Math.PI) / 180),
    CY - r * Math.cos((az * Math.PI) / 180),
  ] as const;
}

export function SkyDome({ analysis, index }: { analysis: SiteAnalysis; index: number }) {
  const { site, samples } = analysis;
  const cur = samples[Math.min(index, samples.length - 1)];

  // Terrain mask ring: area between the horizon profile and the outer rim.
  const outer: string[] = [];
  const inner: string[] = [];
  for (let a = 0; a <= 360; a += 4) {
    const h = horizonAt(site.horizon, a);
    const [ox, oy] = project(-6, a);
    const [ix, iy] = project(h, a);
    outer.push(`${ox.toFixed(2)},${oy.toFixed(2)}`);
    inner.push(`${ix.toFixed(2)},${iy.toFixed(2)}`);
  }
  const maskPath = `M${outer.join("L")}Z M${inner.reverse().join("L")}Z`;

  const track = (key: "sun" | "earth") =>
    samples
      .map((s) => {
        const alt = key === "sun" ? s.sunAlt : s.earthAlt;
        const az = key === "sun" ? s.sunAz : s.earthAz;
        const [x, y] = project(alt, az);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const sunPt = cur ? project(cur.sunAlt, cur.sunAz) : null;
  const earthPt = cur ? project(cur.earthAlt, cur.earthAz) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <ExplainedTerm term="Sky Dome" />
        </span>
        <span className="font-mono text-[11px] text-foreground">{site.name}</span>
      </div>
      <svg
        viewBox="0 0 340 340"
        className="w-full"
        role="img"
        aria-label={`Sky dome for ${site.name}`}
      >
        <defs>
          <radialGradient id="domeBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.28 0.02 250)" />
            <stop offset="100%" stopColor="oklch(0.17 0.015 250)" />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={R} fill="url(#domeBg)" stroke="var(--grid-line)" />
        {[30, 60].map((alt) => (
          <circle
            key={alt}
            cx={CX}
            cy={CY}
            r={R * (1 - alt / 90)}
            fill="none"
            stroke="var(--grid-line)"
            strokeDasharray="2 4"
          />
        ))}
        {/* horizon (0°) */}
        <circle cx={CX} cy={CY} r={R * (1 - 0 / 90)} fill="none" stroke="var(--grid-line)" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((az) => {
          const [x, y] = project(-6, az);
          return (
            <line
              key={az}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="var(--grid-line)"
              strokeWidth={0.5}
            />
          );
        })}
        <path
          d={maskPath}
          fill="var(--terrain)"
          fillRule="evenodd"
          stroke="var(--terrain-edge)"
          strokeWidth={0.75}
        />

        <polyline
          points={track("earth")}
          fill="none"
          stroke="var(--earth)"
          strokeWidth={1}
          opacity={0.45}
        />
        <polyline
          points={track("sun")}
          fill="none"
          stroke="var(--sun)"
          strokeWidth={1}
          opacity={0.5}
        />

        {earthPt && (
          <g>
            <circle cx={earthPt[0]} cy={earthPt[1]} r={7} fill="var(--earth)" opacity={0.18} />
            <circle cx={earthPt[0]} cy={earthPt[1]} r={4} fill="var(--earth)" />
          </g>
        )}
        {sunPt && (
          <g>
            <circle cx={sunPt[0]} cy={sunPt[1]} r={9} fill="var(--sun)" opacity={0.2} />
            <circle cx={sunPt[0]} cy={sunPt[1]} r={4.5} fill="var(--sun)" />
          </g>
        )}

        {[
          ["N", 0],
          ["E", 90],
          ["S", 180],
          ["W", 270],
        ].map(([label, az]) => {
          const [x, y] = project(-12, az as number);
          return (
            <text
              key={label as string}
              x={x}
              y={y + 4}
              textAnchor="middle"
              className="fill-muted-foreground font-mono"
              fontSize={10}
            >
              {label}
            </text>
          );
        })}
      </svg>
      {cur && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums">
          <div className="flex justify-between border-t border-border pt-1">
            <dt className="text-sun">Sun</dt>
            <dd className="text-foreground">
              {cur.sunAlt.toFixed(2)}° / {cur.sunAz.toFixed(0)}°
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1">
            <dt className="text-earth">Earth</dt>
            <dd className="text-foreground">
              {cur.earthAlt.toFixed(2)}° / {cur.earthAz.toFixed(0)}°
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              <ExplainedTerm term="Terrain Mask" />
            </dt>
            <dd className="text-foreground">{cur.sunHorizon.toFixed(2)}°</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Link</dt>
            <dd className={cur.earthUp ? "text-earth" : "text-destructive"}>
              {cur.earthUp ? "DTE open" : <ExplainedTerm term="Occulted" />}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
