import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, PointerEvent, ReactNode } from 'react';
import { ArrowLeft, Compass, Globe2, Pause, Play, RotateCcw, Sun, Radio, Plus, Orbit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkyDome } from '@/components/SkyDome';
import { SITES, type LandingSite } from '@/lib/sites';
import { sampleSite, formatDuration, formatUTC } from '@/lib/analysis';
import { customSite } from '@/lib/planning';
import { horizonAt } from '@/lib/astro';

export const Route = createFileRoute('/simulator')({
  head: () => ({ meta: [
    { title: 'Lunar Surface Simulator | Lunar South Pole' },
    { name: 'description', content: 'Explore the south-pole sky and local horizon from candidate lunar landing sites as the Sun and Earth move through a mission window.' },
  ] }),
  component: SurfaceSimulator,
});

const START = '2026-11-15T00:00';
const DAYS = 29.53;
const STEPS = 360;
const STARS = Array.from({ length: 105 }, (_, i) => ({
  x: (i * 127.13 + 41) % 1000,
  y: 24 + ((i * 71.71 + 19) % 390),
  r: i % 13 === 0 ? 1.8 : i % 4 === 0 ? 1.25 : 0.8,
  o: 0.25 + ((i * 17) % 55) / 100,
}));

function SurfaceSimulator() {
  const [sites, setSites] = useState<LandingSite[]>(SITES);
  const [siteId, setSiteId] = useState(SITES[0]?.id ?? '');
  const [start, setStart] = useState(START);
  const [index, setIndex] = useState(Math.floor(STEPS / 2));
  const [playing, setPlaying] = useState(false);
  const [heading, setHeading] = useState(0);
  const [mode, setMode] = useState<'panorama' | 'sky'>('panorama');
  const [customName, setCustomName] = useState('My south pole site');
  const [customLat, setCustomLat] = useState('-89');
  const [customLon, setCustomLon] = useState('0');
  const [customHorizon, setCustomHorizon] = useState('0');
  const [error, setError] = useState('');
  const startMs = Date.parse(`${start}:00Z`);
  const site = sites.find(s => s.id === siteId) ?? sites[0];
  const windowStartMs = startMs - (DAYS * 86400000) / 2;
  const analysis = useMemo(() => site && Number.isFinite(startMs) ? sampleSite(site, windowStartMs, DAYS, STEPS) : null, [site, startMs, windowStartMs]);
  const sample = analysis?.samples[index];
  const date = Number.isFinite(startMs) ? new Date(windowStartMs + (index / STEPS) * DAYS * 86400000) : new Date(NaN);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get('site');
      const existing = SITES.find(s => s.id === requested);
      if (existing) setSiteId(existing.id);
      const lat = params.get('lat'), lon = params.get('lon'), name = params.get('name'), horizon = params.get('horizon');
      if (!existing && lat !== null && lon !== null && name && horizon !== null) {
        const candidate = customSite(name, Number(lat), Number(lon), Number(horizon));
        setSites(current => current.some(s => s.id === candidate.id) ? current : [...current, candidate]);
        setSiteId(candidate.id);
      }
    } catch { /* A malformed deep link leaves the default candidate selected. */ }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex(i => i >= STEPS ? 0 : i + 1), 650);
    return () => window.clearInterval(timer);
  }, [playing]);

  const addCustom = (event: FormEvent) => {
    event.preventDefault();
    try {
      const next = customSite(customName, Number(customLat), Number(customLon), Number(customHorizon));
      setSites(current => current.some(s => s.id === next.id) ? current : [...current, next]);
      setSiteId(next.id);
      setIndex(Math.floor(STEPS / 2));
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the custom-site values.'); }
  };

  const reset = () => { setHeading(0); setIndex(Math.floor(STEPS / 2)); setPlaying(false); };

  if (!site || !analysis || !sample) return <main className="mx-auto max-w-4xl px-4 py-16"><h1 className="text-2xl font-semibold">Surface simulator unavailable</h1><p className="mt-2 text-sm text-muted-foreground">Choose a valid mission date or landing site to continue.</p><Button asChild className="mt-5"><Link to="/planner">Return to planner</Link></Button></main>;

  return <main className="surface-simulator mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-9">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><Link to="/planner" className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-3.5" /> Back to planner</Link><p className="label-caps text-primary">Surface perspective <span className="mx-1 text-white/30">/</span> South pole</p><h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Stand beneath the lunar sky.</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Change the landing point and mission time to see how the Sun, Earth, and local horizon shift from the surface.</p></div>
      <div className="sim-live-badge"><span className="size-1.5 animate-pulse rounded-full bg-primary" /> APPROXIMATE EPHEMERIS <span className="mx-1 text-white/20">·</span> {site.region}</div>
    </header>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="sim-scene-card min-w-0 overflow-hidden rounded-2xl border border-white/10" aria-label="Lunar surface view">
        <div className="sim-scene-top flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-5">
          <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04]"><Compass className="size-4 text-primary" /></span><div><p className="label-caps text-white/75">{mode === 'panorama' ? 'Surface panorama' : 'Sky dome'}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{site.name} <span className="text-white/25"></span> lat {site.lat.toFixed(2)} · lon {site.lon.toFixed(2)}</p></div></div>
          <div className="flex items-center gap-2"><div className="flex rounded-lg border border-white/10 bg-black/20 p-1"><button className={`rounded-md px-3 py-1.5 text-[10px] ${mode === 'panorama' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setMode('panorama')}>Horizon view</button><button className={`rounded-md px-3 py-1.5 text-[10px] ${mode === 'sky' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setMode('sky')}>Sky map</button></div><Button size="icon" variant="outline" className="size-8 border-white/10 bg-white/[0.03]" onClick={reset} aria-label="Reset simulator view"><RotateCcw className="size-3.5" /></Button></div>
        </div>
        {mode === 'panorama' ? <Panorama site={site} sunAlt={sample.sunAlt} sunAz={sample.sunAz} earthAlt={sample.earthAlt} earthAz={sample.earthAz} heading={heading} onHeading={setHeading} /> : <div className="sim-skymap mx-auto grid min-h-[360px] place-items-center p-5 md:min-h-[480px]"><div className="w-full max-w-[480px]"><SkyDome analysis={analysis} index={index} /></div></div>}
        <div className="sim-scene-footer flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-white/60"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-sun" />Sun</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-earth" />Earth</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#7b7264]" />Illustrative terrain horizon</span></div>
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground">LOOK <input type="range" min={-180} max={180} step={1} value={heading} onChange={e => setHeading(Number(e.target.value))} aria-label="Look direction in degrees" className="w-24 accent-primary" /><span className="w-10 font-mono text-foreground">{heading}°</span></label>
        </div>
      </section>

      <aside className="sim-control-panel overflow-hidden rounded-2xl border border-white/10">
        <div className="border-b border-white/10 px-5 py-4"><p className="label-caps text-primary">Observer controls</p><h2 className="mt-1 text-lg font-semibold">Set your vantage point</h2><p className="mt-1 text-xs text-muted-foreground">Positions and horizon update with each selection.</p></div>
        <div className="space-y-5 p-5">
          <label className="block text-xs font-medium">Landing site<select aria-label="Landing site" value={siteId} onChange={e => setSiteId(e.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">{sites.map(s => <option key={s.id} value={s.id}>{s.name}{s.id.startsWith('custom-') ? ' · custom' : ''}</option>)}</select></label>
          <label className="block text-xs font-medium">Landing date and time <span className="font-mono text-muted-foreground">UTC</span><input type="datetime-local" aria-label="Landing date and time UTC" value={start} onChange={e => { setStart(e.target.value); setIndex(Math.floor(STEPS / 2)); }} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
          <div>
            <div className="mb-2 flex items-start justify-between gap-2"><div><p className="text-xs font-medium">Move through one lunar cycle</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{formatUTC(date.getTime())} UTC</p></div><Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => setPlaying(p => !p)}>{playing ? <Pause /> : <Play />}{playing ? 'Pause' : 'Play'}</Button></div>
            <input type="range" min={0} max={STEPS} value={index} onChange={e => setIndex(Number(e.target.value))} aria-label="Mission time across one lunar cycle" className="w-full accent-primary" />
            <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground"><span>-14.8 d</span><span>Landing</span><span>+14.8 d</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2"><Readout icon={<Sun className="size-3.5" />} label="Sun altitude / azimuth" value={`${signed(sample.sunAlt)}°  ·  ${sample.sunAz.toFixed(1)}°`} tone="sun" /><Readout icon={<Globe2 className="size-3.5" />} label="Earth altitude / azimuth" value={`${signed(sample.earthAlt)}°  ·  ${sample.earthAz.toFixed(1)}°`} tone="earth" /></div>
          <div className="grid grid-cols-2 gap-2"><Metric label="Sunlight in this cycle" value={`${(analysis.illumination * 100).toFixed(0)}%`} tone="sun" /><Metric label="Earth in view" value={`${(analysis.earthVisibility * 100).toFixed(0)}%`} tone="earth" /><Metric label="Longest dark stretch" value={formatDuration(analysis.longestDarkHours)} /><Metric label="Longest Earth gap" value={formatDuration(analysis.longestGapHours)} /></div>
          <div className="rounded-xl border border-white/[0.08] bg-black/15 p-3"><p className="label-caps text-white/55">At the selected time</p><div className="mt-2 grid grid-cols-2 gap-3 text-xs"><p className="text-muted-foreground">Sun <strong className={`ml-1 ${sample.sunUp ? 'text-sun' : 'text-white/55'}`}>{sample.sunUp ? 'above horizon' : 'below horizon'}</strong></p><p className="text-muted-foreground">Earth <strong className={`ml-1 ${sample.earthUp ? 'text-earth' : 'text-white/55'}`}>{sample.earthUp ? 'in view' : 'blocked'}</strong></p></div></div>
          <details className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"><summary className="flex cursor-pointer items-center gap-2 text-xs font-medium"><Plus className="size-3.5 text-primary" />Add a custom vantage point</summary><form onSubmit={addCustom} className="mt-4 space-y-3"><label className="block text-[10px] text-muted-foreground">Name<input value={customName} onChange={e => setCustomName(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs text-foreground" /></label><div className="grid grid-cols-2 gap-2"><label className="block text-[10px] text-muted-foreground">Latitude °<input type="number" min={-90} max={90} step="any" value={customLat} onChange={e => setCustomLat(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs text-foreground" /></label><label className="block text-[10px] text-muted-foreground">Longitude °E<input type="number" min={-180} max={180} step="any" value={customLon} onChange={e => setCustomLon(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs text-foreground" /></label></div><label className="block text-[10px] text-muted-foreground">Declared constant horizon °<input type="number" min={0} max={90} step="any" value={customHorizon} onChange={e => setCustomHorizon(e.target.value)} required className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs text-foreground" /></label>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}<Button type="submit" size="sm"><Plus />Use this viewpoint</Button></form></details>
        </div>
        <div className="border-t border-white/10 px-5 py-3 text-[10px] leading-relaxed text-muted-foreground">Planning visualization only. Positions use the approximate ephemeris; built-in horizons are illustrative. Not for navigation or power-system design.</div>
      </aside>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs"><span className="flex items-center gap-2 text-muted-foreground"><Orbit className="size-4 text-primary" />Observer: <strong className="text-foreground">{site.name}</strong><span className="hidden sm:inline">· {site.notes}</span></span><Button asChild size="sm" variant="link" className="h-auto p-0"><Link to="/planner">Compare sites and mission windows <ArrowLeft className="rotate-180" /></Link></Button></div>
  </main>;
}

function Panorama({ site, sunAlt, sunAz, earthAlt, earthAz, heading, onHeading }: { site: LandingSite; sunAlt: number; sunAz: number; earthAlt: number; earthAz: number; heading: number; onHeading: (value: number) => void }) {
  const relAz = (az: number) => ((((az - heading + 540) % 360) + 360) % 360) - 180;
  const xAt = (az: number) => 500 + (relAz(az) / 90) * 500;
  const yAt = (alt: number) => 520 - ((alt + 8) / 98) * 430;
  const skyline = Array.from({ length: 51 }, (_, i) => {
    const az = heading + i * 3.6 - 90;
    const x = i * 20;
    const y = yAt(horizonAt(site.horizon, az));
    return `${i === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`;
  }).join(' ');
  const terrainPath = `${skyline} L1000,620 L0,620 Z`;
  const pointerStart = (event: PointerEvent<SVGSVGElement>) => { event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if ((event.buttons & 1) === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const delta = (event.movementX / rect.width) * 180;
    onHeading(Math.round(Math.max(-180, Math.min(180, heading - delta))));
  };

  return <div className="sim-panorama-wrap relative">
    <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" className="sim-panorama block h-[360px] w-full touch-none sm:h-[440px] lg:h-[560px]" role="img" aria-label={`Illustrative lunar horizon from ${site.name}; drag to change look direction`} onPointerDown={pointerStart} onPointerMove={pointerMove}>
      <defs>
        <linearGradient id="simSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#07101d" /><stop offset="57%" stopColor="#111a28" /><stop offset="100%" stopColor="#292b30" /></linearGradient>
        <linearGradient id="simGround" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stopColor="#81745f" /><stop offset="22%" stopColor="#514b44" /><stop offset="100%" stopColor="#27282b" /></linearGradient>
        <linearGradient id="simGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffcb76" stopOpacity=".14" /><stop offset="100%" stopColor="#ffcb76" stopOpacity="0" /></linearGradient>
        <filter id="simSunGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="11" /></filter>
        <pattern id="simRegolith" width="68" height="29" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="1.5" fill="#c5b79e" opacity=".13" /><circle cx="45" cy="20" r="2.4" fill="#17191d" opacity=".22" /><path d="M27 27q5-5 11 0" fill="none" stroke="#dfc9a7" strokeOpacity=".09" /></pattern>
      </defs>
      <rect width="1000" height="620" fill="url(#simSky)" />
      <rect width="1000" height="520" fill="url(#simGlow)" opacity={Math.max(0.1, Math.min(1, (sunAlt + 10) / 45))} />
      {STARS.map((star, i) => <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#e8efff" opacity={star.o * (sunAlt > 0 ? 0.14 : 1)} />)}
      {[20, 40, 60].map(alt => <g key={alt}><path d={`M0 ${yAt(alt)} H1000`} stroke="#d2deed" strokeOpacity=".07" strokeDasharray="3 8" /><text x="22" y={yAt(alt) - 8} fill="#d2deed" opacity=".38" fontSize="11" fontFamily="monospace">{alt}°</text></g>)}
      <path d={`M0 ${yAt(0)} H1000`} stroke="#e2c087" strokeOpacity=".15" strokeDasharray="4 6" />
      {Math.abs(relAz(sunAz)) <= 90 && <g><circle cx={xAt(sunAz)} cy={yAt(sunAlt)} r="26" fill="#ffbd5d" opacity=".24" filter="url(#simSunGlow)" /><circle cx={xAt(sunAz)} cy={yAt(sunAlt)} r="12" fill="#ffca76" opacity=".22" /><circle cx={xAt(sunAz)} cy={yAt(sunAlt)} r="6.5" fill="#ffe2a4" /><text x={xAt(sunAz) + 17} y={yAt(sunAlt) - 12} fill="#ffdc9c" fontSize="12" fontFamily="monospace">SUN</text></g>}
      {Math.abs(relAz(earthAz)) <= 90 && <g><circle cx={xAt(earthAz)} cy={yAt(earthAlt)} r="13" fill="#5eafff" opacity=".16" /><circle cx={xAt(earthAz)} cy={yAt(earthAlt)} r="7" fill="#79bbf4" /><path d={`M${xAt(earthAz) - 3},${yAt(earthAlt) - 6} a7,7 0 0 0 0,13 a6,7 0 0 1 0,-13`} fill="#e4f5ff" opacity=".72" /><text x={xAt(earthAz) + 16} y={yAt(earthAlt) - 11} fill="#a7d6ff" fontSize="12" fontFamily="monospace">EARTH</text></g>}
      <path d={terrainPath} fill="url(#simGround)" stroke="#c1b195" strokeOpacity=".56" strokeWidth="2" />
      <path d="M0 520 H1000 V620 H0Z" fill="url(#simRegolith)" />
      {[140, 295, 520, 735, 905].map((x, i) => <ellipse key={x} cx={x} cy={565 + i % 2 * 16} rx={17 + (i % 3) * 6} ry="5" fill="#17191d" opacity=".2" />)}
      <text x="28" y="42" fill="#ffffff" fillOpacity=".55" fontSize="11" fontFamily="monospace">{`LOOK ${heading < 0 ? 'W' : 'E'} ${Math.abs(heading).toFixed(0)}°`}</text>
      <text x="26" y="595" fill="#ffffff" fillOpacity=".45" fontSize="10" fontFamily="monospace">DRAG THE VIEW OR ADJUST LOOK DIRECTION BELOW</text>
    </svg>
    <div className="sim-panorama-callout"><span className="size-1.5 rounded-full bg-primary" />Illustrative terrain horizon <span className="text-white/25">·</span> airless sky</div>
  </div>;
}

function Readout({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: 'sun' | 'earth' }) {
  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><p className={`flex items-center gap-1.5 text-[9px] uppercase tracking-wider ${tone === 'sun' ? 'text-sun' : 'text-earth'}`}>{icon}{label}</p><p className="mt-2 font-mono text-xs tabular-nums text-foreground">{value}</p></div>;
}
function Metric({ label, value, tone }: { label: string; value: string; tone?: 'sun' | 'earth' }) {
  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-2 font-mono text-sm tabular-nums ${tone === 'sun' ? 'text-sun' : tone === 'earth' ? 'text-earth' : 'text-foreground'}`}>{value}</p></div>;
}
function signed(value: number) { return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`; }
