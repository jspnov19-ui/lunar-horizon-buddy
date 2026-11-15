import { useCallback, useEffect, useRef, useState } from 'react';
import { Compass, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingSite } from '@/lib/sites';

interface Props {
  sites: LandingSite[];
  selected: string[];
  detailId: string;
  onPick: (id: string) => void;
  onAdd: (lat: number, lon: number) => void;
}

type Point3 = { x: number; y: number; z: number };
type Rotation = { yaw: number; pitch: number; zoom: number };

const DEG = Math.PI / 180;
const CRATERS: Array<[number, number, number]> = [
  [-87.2, -126, 0.16], [-84.8, -163, 0.12], [-82.9, 144, 0.19],
  [-79.4, -104, 0.11], [-76.3, 178, 0.14], [-72.8, -32, 0.2],
  [-67.4, 106, 0.15], [-59.2, 18, 0.12], [-49.1, -154, 0.17],
  [-43, 75, 0.1], [-33.5, -78, 0.2], [-20, 132, 0.14],
  [-8, -12, 0.11], [5, 163, 0.16], [18, 48, 0.21],
  [28, -104, 0.13], [39, 4, 0.16], [48, 117, 0.12],
  [57, -48, 0.2], [66, 171, 0.15], [73, 42, 0.11],
  [81, -119, 0.18], [85, 8, 0.1],
];

function siteVector(lat: number, lon: number): Point3 {
  const p = lat * DEG;
  const l = lon * DEG;
  return { x: Math.cos(p) * Math.sin(l), y: Math.cos(p) * Math.cos(l), z: -Math.sin(p) };
}

function rotate(point: Point3, rotation: Rotation): Point3 {
  const cy = Math.cos(rotation.yaw), sy = Math.sin(rotation.yaw);
  const cp = Math.cos(rotation.pitch), sp = Math.sin(rotation.pitch);
  const x = point.x * cy + point.z * sy;
  const z = -point.x * sy + point.z * cy;
  return { x, y: point.y * cp - z * sp, z: point.y * sp + z * cp };
}

function unrotate(point: Point3, rotation: Rotation): Point3 {
  const cp = Math.cos(rotation.pitch), sp = Math.sin(rotation.pitch);
  const y = point.y * cp + point.z * sp;
  const z = -point.y * sp + point.z * cp;
  const cy = Math.cos(rotation.yaw), sy = Math.sin(rotation.yaw);
  return { x: point.x * cy - z * sy, y, z: point.x * sy + z * cy };
}

function surfaceCoordinates(point: Point3) {
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, -point.z))) / DEG,
    lon: ((((Math.atan2(point.x, point.y) / DEG + 180) % 360) + 360) % 360) - 180,
  };
}

function paintMoon(ctx: CanvasRenderingContext2D, width: number, height: number, rotation: Rotation) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  const cx = width * 0.47;
  const cy = height * 0.51;
  const radius = Math.min(height * 0.405, width * 0.34) * rotation.zoom;
  ctx.clearRect(0, 0, width, height);

  const background = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, width * 0.75);
  background.addColorStop(0, '#18232c');
  background.addColorStop(1, '#080b12');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  // Subtle stars give the globe a sense of scale without competing with site markers.
  for (let i = 0; i < 38; i++) {
    const x = ((i * 127.1 + 31) % 997) / 997 * width;
    const y = ((i * 311.7 + 17) % 991) / 991 * height;
    if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2 * 1.28) {
      ctx.globalAlpha = 0.16 + (i % 4) * 0.055;
      ctx.fillStyle = '#c9d8e3';
      ctx.fillRect(x, y, dpr, dpr);
    }
  }
  ctx.globalAlpha = 1;

  const left = Math.max(0, Math.floor(cx - radius - 2));
  const top = Math.max(0, Math.floor(cy - radius - 2));
  const diameter = Math.ceil((radius * 2 + 4) * dpr);
  const image = ctx.createImageData(diameter, diameter);
  const craterVectors = CRATERS.map(([lat, lon, size]) => ({ ...siteVector(lat, lon), size, minDot: Math.cos(size * 1.4) }));
  const light = { x: -0.48, y: 0.58, z: 0.66 };
  const lightLength = Math.hypot(light.x, light.y, light.z);

  for (let py = 0; py < diameter; py++) {
    const sy = (top + py / dpr - cy) / radius;
    for (let px = 0; px < diameter; px++) {
      const sx = (left + px / dpr - cx) / radius;
      const facing = 1 - sx * sx - sy * sy;
      if (facing <= 0) continue;
      const screenPoint = { x: sx, y: -sy, z: Math.sqrt(facing) };
      const normal = unrotate(screenPoint, rotation);
      let relief = 0;
      for (const crater of craterVectors) {
        const dot = normal.x * crater.x + normal.y * crater.y + normal.z * crater.z;
        if (dot > crater.minDot) {
          const edge = Math.sqrt(Math.max(0, 2 * (1 - dot))) / crater.size;
          const bowl = Math.max(0, 1 - edge * edge);
          const rim = Math.exp(-(((edge - 0.88) / 0.11) ** 2));
          relief += rim * 0.24 - bowl * 0.25;
        }
      }
      const grain = Math.sin(normal.x * 241 + normal.y * 173) * Math.sin(normal.z * 197 - normal.y * 223) * 0.035
        + Math.sin(normal.x * 73 - normal.z * 91) * 0.035;
      const shade = Math.max(0.12, (screenPoint.x * light.x + screenPoint.y * light.y + screenPoint.z * light.z) / lightLength);
      const tone = Math.max(0, Math.min(1, 0.43 + shade * 0.37 + grain + relief));
      const offset = (py * diameter + px) * 4;
      image.data[offset] = 53 + tone * 126;
      image.data[offset + 1] = 58 + tone * 128;
      image.data[offset + 2] = 62 + tone * 127;
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, Math.round(left * dpr), Math.round(top * dpr));

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(174, 215, 224, .58)';
  ctx.lineWidth = 1.2 * dpr;
  ctx.shadowColor = 'rgba(87, 206, 207, .24)';
  ctx.shadowBlur = 18 * dpr;
  ctx.stroke();
  ctx.restore();
  return { cx, cy, radius };
}

export function PolarMapFallback({ sites, selected, detailId, onPick, onAdd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef<Rotation>({ yaw: 0, pitch: 0, zoom: 1 });
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [pending, setPending] = useState<{ lat: number; lon: number } | null>(null);
  const [hovered, setHovered] = useState('');
  const [view, setView] = useState({ width: 0, height: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width, height = rect.height;
    const { cx, cy, radius } = paintMoon(ctx, width, height, rotationRef.current);

    for (const site of sites) {
      const p = rotate(siteVector(site.lat, site.lon), rotationRef.current);
      if (p.z <= 0.015) continue;
      const x = cx + p.x * radius;
      const y = cy - p.y * radius;
      const isSelected = site.id === detailId;
      const included = selected.includes(site.id);
      const color = isSelected ? '#f8bf66' : included ? '#63d2cb' : '#c1cdd1';
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = isSelected ? 16 : 9;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#10151b';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (isSelected || hovered === site.id) {
        ctx.font = '600 12px Manrope, system-ui, sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#10151b';
        ctx.strokeText(site.name, x + 11, y - 9);
        ctx.fillStyle = '#f4f2eb';
        ctx.fillText(site.name, x + 11, y - 9);
      }
    }
    if (pending) {
      const point = rotate(siteVector(pending.lat, pending.lon), rotationRef.current);
      if (point.z > 0) {
        const x = cx + point.x * radius, y = cy - point.y * radius;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#f8bf66';
        ctx.shadowColor = '#f8bf66';
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff4d8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    setView({ width, height });
  }, [sites, selected, detailId, hovered, pending]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [draw]);

  const locationFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const { width, height } = view;
    const cx = width * 0.47, cy = height * 0.51;
    const radius = Math.min(height * 0.405, width * 0.34) * rotationRef.current.zoom;
    const x = (event.clientX - rect.left - cx) / radius;
    const y = (cy - (event.clientY - rect.top)) / radius;
    const facing = 1 - x * x - y * y;
    if (facing <= 0) return null;
    return surfaceCoordinates(unrotate({ x, y, z: Math.sqrt(facing) }, rotationRef.current));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      if (drag.moved) {
        rotationRef.current.yaw += dx / Math.max(120, view.width) * 3.6;
        rotationRef.current.pitch = Math.max(-1.48, Math.min(1.48, rotationRef.current.pitch + dy / Math.max(120, view.height) * 3.6));
        drag.x = event.clientX;
        drag.y = event.clientY;
        draw();
      }
      return;
    }
    const location = locationFromEvent(event);
    if (!location) { setHovered(''); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = Math.min(view.height * 0.405, view.width * 0.34) * rotationRef.current.zoom;
    const x = (event.clientX - rect.left - view.width * 0.47) / radius;
    const y = (view.height * 0.51 - (event.clientY - rect.top)) / radius;
    const hit = sites.find(site => {
      const p = rotate(siteVector(site.lat, site.lon), rotationRef.current);
      return p.z > 0 && Math.hypot((p.x - x) * radius, (p.y - y) * radius) < 13;
    });
    setHovered(hit?.id ?? '');
  };
  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved) return;
    const location = locationFromEvent(event);
    if (!location) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = Math.min(view.height * 0.405, view.width * 0.34) * rotationRef.current.zoom;
    const x = (event.clientX - rect.left - view.width * 0.47) / radius;
    const y = (view.height * 0.51 - (event.clientY - rect.top)) / radius;
    const hit = sites.find(site => {
      const p = rotate(siteVector(site.lat, site.lon), rotationRef.current);
      return p.z > 0 && Math.hypot((p.x - x) * radius, (p.y - y) * radius) < 15;
    });
    if (hit) onPick(hit.id);
    else setPending({ lat: Math.round(location.lat * 100) / 100, lon: Math.round(location.lon * 100) / 100 });
  };

  const resetView = () => { rotationRef.current = { yaw: 0, pitch: 0, zoom: 1 }; setPending(null); draw(); };
  const zoom = (direction: number) => { rotationRef.current.zoom = Math.max(0.75, Math.min(1.5, rotationRef.current.zoom + direction * 0.12)); draw(); };

  return <div className="overflow-hidden rounded-md border border-hairline bg-[#080b12]">
    <div className="relative h-[340px] sm:h-[430px] lg:h-[480px]">
      <canvas ref={canvasRef} className="size-full touch-none cursor-grab active:cursor-grabbing" aria-label="Interactive 3D Moon. Drag to rotate. Select a landing marker or click the visible surface to plot a custom site." role="img" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragRef.current = null; }} onWheel={event => { event.preventDefault(); zoom(event.deltaY < 0 ? 1 : -1); }} />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-2.5 py-2 text-[10px] text-white/75 backdrop-blur">
        <Compass className="size-3.5 text-primary" /> SOUTH POLE VIEW <span className="text-white/35">·</span> DRAG TO ORBIT
      </div>
      <div className="absolute right-3 top-3 flex gap-1.5">
        <Button size="icon" variant="outline" className="size-8 border-white/15 bg-black/45 text-white hover:bg-white/15" aria-label="Zoom out" onClick={() => zoom(-1)}>−</Button>
        <Button size="icon" variant="outline" className="size-8 border-white/15 bg-black/45 text-white hover:bg-white/15" aria-label="Zoom in" onClick={() => zoom(1)}>+</Button>
        <Button size="icon" variant="outline" className="size-8 border-white/15 bg-black/45 text-white hover:bg-white/15" aria-label="Reset Moon view" onClick={resetView}><RotateCcw className="size-3.5" /></Button>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-4 rounded-md bg-black/45 px-2.5 py-2 text-[10px] text-white/75 backdrop-blur">
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#63d2cb]" />Included site</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#f8bf66]" />Focused site</span>
      </div>
    </div>
    <div className="flex min-h-12 flex-wrap items-center gap-3 border-t border-white/10 px-3 py-2 text-xs text-muted-foreground">
      {pending
        ? <><span className="font-mono text-foreground">Custom point · {Math.abs(pending.lat).toFixed(2)}°{pending.lat < 0 ? 'S' : 'N'}, {Math.abs(pending.lon).toFixed(2)}°{pending.lon < 0 ? 'W' : 'E'}</span><Button size="sm" onClick={() => { onAdd(pending.lat, pending.lon); setPending(null); }}><Plus />Add landing site</Button><Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancel</Button></>
        : <span>Drag to rotate · scroll or use + / − to zoom · click a marker to choose it · click an open spot on the visible Moon to plot a custom landing site.</span>}
    </div>
  </div>;
}
