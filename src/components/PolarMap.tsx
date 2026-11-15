import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LandingSite } from "@/lib/sites";
import { MAP_CONFIG, SIZE, project, rhoKm, unproject } from "@/lib/polar";

const RINGS = [-88, -86, -84, -82];
const MERIDIANS = Array.from({ length: 12 }, (_, i) => i * 30);
const K = SIZE / 2 / MAP_CONFIG.halfWidthKm;
const lonLabel = (m: number) =>
  m === 0 || m === 180 ? `${m}°` : m < 180 ? `${m}°E` : `${360 - m}°W`;

interface Props {
  sites: LandingSite[];
  selected: string[];
  detailId: string;
  onPick: (id: string) => void;
  onAdd: (lat: number, lon: number) => void;
}

/** Interactive south-polar map. Click a marker to choose a site; click empty map to drop a new one. */
export function PolarMap({ sites, selected, detailId, onPick, onAdd }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [imageOk, setImageOk] = useState(false);
  const [pending, setPending] = useState<{ lat: number; lon: number } | null>(null);

  // Show the terrain mosaic only if the file exists in /public.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageOk(true);
    img.src = MAP_CONFIG.image;
  }, []);

  const onMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = ref.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SIZE;
    const y = ((e.clientY - r.top) / r.height) * SIZE;
    const p = unproject(x, y);
    if (p.lat > -79 || p.lat < -90) return; // outside the mapped polar cap
    setPending({ lat: Math.round(p.lat * 100) / 100, lon: Math.round(p.lon * 100) / 100 });
  };

  const pin = pending ? project(pending.lat, pending.lon) : null;

  return (
    <div>
      <svg
        ref={ref}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onClick={onMapClick}
        role="img"
        aria-label="Map of the lunar south pole with candidate landing sites. Select a marker to choose a site, or click the map to add your own."
        className="w-full cursor-crosshair rounded-md border border-hairline bg-secondary"
      >
        <defs>
          <radialGradient id="polar-bg">
            <stop offset="0%" stopColor="oklch(0.22 0.01 260)" />
            <stop offset="100%" stopColor="oklch(0.14 0.004 260)" />
          </radialGradient>
        </defs>
        <rect width={SIZE} height={SIZE} fill="url(#polar-bg)" />
        {imageOk && (
          <image
            href={MAP_CONFIG.image}
            x={0}
            y={0}
            width={SIZE}
            height={SIZE}
            preserveAspectRatio="none"
          />
        )}
        <g fill="none" stroke="var(--primary)" strokeOpacity={0.28} strokeWidth={1.5}>
          {RINGS.map((lat) => (
            <circle
              key={lat}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={rhoKm(lat) * K}
              strokeDasharray="4 6"
            />
          ))}
          {MERIDIANS.map((m) => {
            const a = project(-90, m);
            const b = project(-80, m);
            return <line key={m} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </g>
        <g
          fontSize={20}
          fill="var(--muted-foreground)"
          className="font-mono"
          style={{ pointerEvents: "none" }}
        >
          {RINGS.map((lat) => (
            <text key={lat} x={SIZE / 2 + 6} y={SIZE / 2 - rhoKm(lat) * K - 6}>
              {Math.abs(lat)}°S
            </text>
          ))}
          {MERIDIANS.map((m) => {
            const p = project(-81.2, m);
            return (
              <text key={m} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle">
                {lonLabel(m)}
              </text>
            );
          })}
        </g>
        {sites.map((s) => {
          const { x, y } = project(s.lat, s.lon);
          const isDetail = s.id === detailId;
          const isOn = selected.includes(s.id);
          return (
            <g
              key={s.id}
              role="button"
              tabIndex={0}
              aria-label={`${s.name}, ${s.lat.toFixed(2)} degrees, ${s.lon.toFixed(2)} degrees east${isDetail ? ", selected" : ""}`}
              className="cursor-pointer outline-none"
              onClick={(e) => {
                e.stopPropagation();
                onPick(s.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPick(s.id);
                }
              }}
            >
              <title>{s.name}</title>
              <circle cx={x} cy={y} r={22} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={isDetail ? 12 : 8}
                fill={isOn ? "var(--primary)" : "transparent"}
                stroke={isDetail ? "var(--foreground)" : "var(--primary)"}
                strokeWidth={isDetail ? 3 : 2}
              />
              {isDetail && (
                <text
                  x={x + 18}
                  y={y - 14}
                  fontSize={26}
                  fontWeight={600}
                  fill="var(--foreground)"
                  stroke="var(--background)"
                  strokeWidth={5}
                  paintOrder="stroke"
                  style={{ pointerEvents: "none" }}
                >
                  {s.name}
                </text>
              )}
            </g>
          );
        })}
        {pin && (
          <g style={{ pointerEvents: "none" }}>
            <circle
              cx={pin.x}
              cy={pin.y}
              r={10}
              fill="var(--sun)"
              stroke="var(--background)"
              strokeWidth={3}
            />
          </g>
        )}
      </svg>
      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {pending ? (
          <>
            <span className="font-mono text-foreground">
              {pending.lat.toFixed(2)}°, {pending.lon.toFixed(2)}°E
            </span>
            <Button
              size="sm"
              onClick={() => {
                onAdd(pending.lat, pending.lon);
                setPending(null);
              }}
            >
              <Plus />
              Add this location
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </>
        ) : (
          <span>
            Click a marker to choose a site, or click anywhere on the map to add your own. Rings
            show latitude (88°S to 82°S); 0° longitude is at the top.
            {!imageOk &&
              " Add a terrain mosaic at public/south-pole-mosaic.jpg to show real imagery."}
          </span>
        )}
      </div>
    </div>
  );
}
