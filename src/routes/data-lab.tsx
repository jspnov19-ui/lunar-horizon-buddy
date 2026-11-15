import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Map, Orbit, Pause, Play, Sun, Globe2 } from 'lucide-react';
import { NasaCheck } from '@/components/NasaCheck';
import { LolaTerrain } from '@/components/LolaTerrain';
import { LunarOrbitalView } from '@/components/LunarOrbitalView';
import { SITES } from '@/lib/sites';
import { formatUTC, sampleSite } from '@/lib/analysis';
import { loadLolaHorizonProfiles } from '@/lib/lola-horizon';

export const Route = createFileRoute('/data-lab')({
  head: () => ({ meta: [{ title: 'Lunar Data Lab | Lunar South Pole' }, { name: 'description', content: 'Use NASA lunar terrain viewers and compare lunar Sun and Earth positions against JPL Horizons.' }] }),
  component: DataLabPage,
});

function DataLabPage() {
  const [siteId, setSiteId] = useState(SITES[0]!.id);
  const [start, setStart] = useState('2026-11-15T00:00');
  const [viewIndex, setViewIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [terrainProfiles, setTerrainProfiles] = useState<Record<string, number[]> | null>(null);
  const [terrainUnavailable, setTerrainUnavailable] = useState(false);
  const site = SITES.find(candidate => candidate.id === siteId) ?? SITES[0]!;
  const startMs = Date.parse(`${start}:00Z`);
  const analysis = useMemo(() => {
    if (!Number.isFinite(startMs)) return null;
    const profile = terrainProfiles?.[site.id];
    return sampleSite(profile ? { ...site, horizon: profile } : site, startMs, 29.53, 360, profile ? 'lola-dem' : 'illustrative');
  }, [site, startMs, terrainProfiles]);
  const sample = analysis?.samples[Math.min(viewIndex, analysis.samples.length - 1)];

  useEffect(() => {
    let active = true;
    loadLolaHorizonProfiles().then(profiles => { if (active) setTerrainProfiles(profiles); }).catch(() => { if (active) setTerrainUnavailable(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!playing || !analysis) return;
    const timer = window.setInterval(() => setViewIndex(i => i >= 360 ? 0 : i + 1), 220);
    return () => window.clearInterval(timer);
  }, [playing, analysis]);

  return <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
    <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5"/>Home</Link>
    <header className="data-lab-hero mt-5"><div><p className="label-caps text-primary">Research workspace <span className="mx-1 text-white/25">/</span> NASA + JPL</p><h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Lunar Data <span className="planner-title-accent">Lab.</span></h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Inspect NASA LOLA elevation terrain and the lunar globe, then fetch Sun and Earth elevations from JPL Horizons for the selected study site.</p></div><div className="data-lab-coordinate"><span>ACTIVE SITE</span><strong>{site.name}</strong><small>{site.lat.toFixed(2)} deg / {site.lon.toFixed(2)} deg</small></div></header>
    <div className="data-lab-filters mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold">Study site<select value={siteId} onChange={event => { setSiteId(event.target.value); setViewIndex(0); setPlaying(false); }} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">{SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-xs font-semibold">Start date and time (UTC)<input type="datetime-local" value={start} onChange={event => { setStart(event.target.value); setViewIndex(0); setPlaying(false); }} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"/></label>
    </div>

    {analysis && sample && <section className="mt-5 rounded-2xl border border-white/10 bg-[#0b1117] p-4 md:p-5" aria-label="Synchronized lunar visualization timeline">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="label-caps flex items-center gap-2 text-primary"><Sun className="size-3.5"/>Synchronized sky conditions</p><p className="mt-1 text-xs text-muted-foreground">Scrub or play the lunar month; terrain rays and orbit markers follow this time.</p></div><div className="flex items-center gap-3"><span className="font-mono text-[10px] text-white/70">{formatUTC(sample.t)} UTC</span><button type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause lunar timeline' : 'Play lunar timeline'} className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-primary hover:bg-white/[0.08]">{playing ? <Pause className="size-4"/> : <Play className="size-4"/>}</button></div></div>
      <input type="range" min={0} max={360} value={viewIndex} onChange={event => { setPlaying(false); setViewIndex(Number(event.target.value)); }} aria-label="Lunar month time for terrain and orbit overlays" className="mt-4 w-full accent-primary"/>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-white/40"><span>Start</span><span>{(viewIndex / 360 * 29.53).toFixed(1)} days elapsed</span><span>End - 29.53 days</span></div>
      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-mono"><span className={`rounded-full border px-2.5 py-1 ${sample.sunUp ? 'border-sun/30 bg-sun/10 text-sun' : 'border-white/10 text-white/55'}`}>SUN {sample.sunAlt >= 0 ? '+' : ''}{sample.sunAlt.toFixed(1)} deg - {sample.sunUp ? 'CLEAR' : 'BELOW SKYLINE'}</span><span className={`rounded-full border px-2.5 py-1 ${sample.earthUp ? 'border-earth/30 bg-earth/10 text-earth' : 'border-white/10 text-white/55'}`}>EARTH {sample.earthAlt >= 0 ? '+' : ''}{sample.earthAlt.toFixed(1)} deg - {sample.earthUp ? 'CLEAR' : 'BELOW SKYLINE'}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-white/45">APPROXIMATE APP EPHEMERIS</span><span className={`rounded-full border px-2.5 py-1 ${analysis.horizonSource === 'lola-dem' ? 'border-primary/30 text-primary' : 'border-white/10 text-white/45'}`}>{analysis.horizonSource === 'lola-dem' ? 'NASA LOLA HORIZON' : terrainUnavailable ? 'ILLUSTRATIVE HORIZON - LOLA UNAVAILABLE' : 'LOADING LOLA HORIZON'}</span></div>
    </section>}

    <section className="data-lab-view-grid mt-8 grid gap-5 xl:grid-cols-2">
      <article className="data-lab-card overflow-hidden rounded-2xl border border-white/10"><header className="border-b border-white/10 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Map className="size-4 text-primary"/>NASA LOLA terrain</h2><p className="mt-1 text-[11px] text-muted-foreground">240 m/pixel elevation patch - {site.lat.toFixed(2)} deg, {site.lon.toFixed(2)} deg</p></header><div className="p-3">{sample && <LolaTerrain siteId={site.id} siteName={site.name} latitude={site.lat} longitude={site.lon} sample={sample}/>}</div><p className="border-t border-white/10 p-3 text-[10px] leading-relaxed text-muted-foreground">Sunlight follows the selected UTC sample; amber and blue rays mark Sun and Earth directions above the LOLA mesh. Drag to rotate and scroll to zoom.</p></article>
      <article className="data-lab-card overflow-hidden rounded-2xl border border-white/10"><header className="border-b border-white/10 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Globe2 className="size-4 text-primary"/>Interactive lunar globe</h2><p className="mt-1 text-[11px] text-muted-foreground">NASA LRO surface - illuminated by the selected Sun direction</p></header><div className="p-3">{analysis && <LunarOrbitalView analysis={analysis} index={viewIndex} className="h-[315px] rounded-xl"/>}</div><p className="border-t border-white/10 p-3 text-[10px] leading-relaxed text-muted-foreground">Sun and Earth are shown with colored sight lines from the selected site; the Sun also sets the Moon's lighting. Distances remain visually compressed.</p></article>
    </section>

    <section className="mt-8 rounded-2xl border border-white/10 p-5"><div className="mb-4"><h2 className="flex items-center gap-2 text-lg font-semibold"><Orbit className="size-4 text-sun"/>JPL Horizons site data</h2><p className="mt-1 text-xs text-muted-foreground">Fetch hourly, airless Sun and Earth elevations for this site and selected start date.</p></div><NasaCheck site={site} startMs={startMs} days={30}/></section>
    <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">The terrain and globe views are visualizations. JPL Horizons provides the ephemeris shown in these charts and does not account for local terrain. The planner separately uses an approximate ephemeris with LOLA-derived horizons for built-in sites; the orbital and globe views remain visualizations.</p>
  </main>;
}
