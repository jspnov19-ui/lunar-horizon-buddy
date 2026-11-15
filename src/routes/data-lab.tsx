import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ArrowLeft, Map, Orbit } from 'lucide-react';
import { NasaCheck } from '@/components/NasaCheck';
import { LolaTerrain } from '@/components/LolaTerrain';
import { LunarOrbitalView } from '@/components/LunarOrbitalView';
import { SITES } from '@/lib/sites';
import { sampleSite } from '@/lib/analysis';

export const Route = createFileRoute('/data-lab')({
  head: () => ({ meta: [{ title: 'Lunar Data Lab | Lunar South Pole' }, { name: 'description', content: 'Use NASA lunar terrain viewers and compare lunar Sun and Earth positions against JPL Horizons.' }] }),
  component: DataLabPage,
});

function DataLabPage() {
  const [siteId, setSiteId] = useState(SITES[0]!.id);
  const [start, setStart] = useState('2026-11-15T00:00');
  const site = SITES.find(candidate => candidate.id === siteId) ?? SITES[0]!;
  const startMs = Date.parse(`${start}:00Z`);
  const analysis = useMemo(() => Number.isFinite(startMs) ? sampleSite(site, startMs, 29.53, 360) : null, [site, startMs]);
  return <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
    <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5"/>Home</Link>
    <header className="mt-5"><p className="label-caps text-primary">Research workspace</p><h1 className="mt-2 text-3xl font-semibold">Lunar Data Lab</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Inspect NASA LOLA elevation terrain and the NASA-textured lunar globe in place, then fetch Sun and Earth elevations from JPL Horizons for the selected study site.</p></header>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium">Study site<select value={siteId} onChange={event => setSiteId(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">{SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-xs font-medium">Start date and time (UTC)<input type="datetime-local" value={start} onChange={event => setStart(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"/></label></div>
    <section className="mt-8 grid gap-5 xl:grid-cols-2">
      <article className="overflow-hidden rounded-2xl border border-white/10"><header className="border-b border-white/10 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Map className="size-4 text-primary"/>NASA LOLA terrain</h2><p className="mt-1 text-[11px] text-muted-foreground">240 m/pixel elevation patch · {site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°</p></header><div className="p-3"><LolaTerrain siteId={site.id} siteName={site.name}/></div><p className="border-t border-white/10 p-3 text-[10px] leading-relaxed text-muted-foreground">Elevation mesh from NASA’s south-polar LOLA DEM. Drag to rotate and scroll to zoom; custom sites are not included in this terrain catalog.</p></article>
      <article className="overflow-hidden rounded-2xl border border-white/10"><header className="border-b border-white/10 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Map className="size-4 text-primary"/>Interactive lunar globe</h2><p className="mt-1 text-[11px] text-muted-foreground">NASA LRO surface · selected site and computed sky positions</p></header><div className="p-3">{analysis && <LunarOrbitalView analysis={analysis} index={180} className="h-[315px] rounded-xl"/>}</div><p className="border-t border-white/10 p-3 text-[10px] leading-relaxed text-muted-foreground">Rotate the Moon and inspect the selected site in context. This in-app globe view uses compressed apparent distances for the Sun and Earth.</p></article>
    </section>
    <section className="mt-8 rounded-2xl border border-white/10 p-5"><div className="mb-4"><h2 className="flex items-center gap-2 text-lg font-semibold"><Orbit className="size-4 text-sun"/>JPL Horizons site data</h2><p className="mt-1 text-xs text-muted-foreground">Fetch hourly, airless Sun and Earth elevations for this site and selected start date.</p></div><NasaCheck site={site} startMs={startMs} days={30}/></section>
    <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">The terrain and globe views are visualizations. JPL Horizons provides the ephemeris shown in the charts; it does not account for local terrain obstruction. Planner visibility calculations continue to use the app’s approximate ephemeris and illustrative horizon masks.</p>
  </main>;
}
