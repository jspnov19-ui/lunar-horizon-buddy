import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ArrowLeft, Map, Orbit } from 'lucide-react';
import { NasaCheck } from '@/components/NasaCheck';
import { SITES } from '@/lib/sites';
import { quickMapUrl } from '@/lib/lunar-tools';

export const Route = createFileRoute('/data-lab')({
  head: () => ({ meta: [{ title: 'Lunar Data Lab | Lunar South Pole' }, { name: 'description', content: 'Use NASA lunar terrain viewers and compare lunar Sun and Earth positions against JPL Horizons.' }] }),
  component: DataLabPage,
});

function DataLabPage() {
  const [siteId, setSiteId] = useState(SITES[0]!.id);
  const [start, setStart] = useState('2026-11-15T00:00');
  const site = SITES.find(candidate => candidate.id === siteId) ?? SITES[0]!;
  const startMs = Date.parse(`${start}:00Z`);
  const mapSrc = useMemo(() => quickMapUrl(site), [site]);
  return <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
    <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5"/>Home</Link>
    <header className="mt-5"><p className="label-caps text-primary">Research workspace</p><h1 className="mt-2 text-3xl font-semibold">Lunar Data Lab</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Explore NASA lunar terrain data in place and cross-check Sun and Earth elevations with JPL Horizons. Choose a built-in study site to synchronize the tools where supported.</p></header>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium">Study site<select value={siteId} onChange={event => setSiteId(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">{SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-xs font-medium">Start date and time (UTC)<input type="datetime-local" value={start} onChange={event => setStart(event.target.value)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"/></label></div>
    <section className="mt-8 grid gap-5 xl:grid-cols-2">
      <article className="overflow-hidden rounded-2xl border border-white/10"><header className="border-b border-white/10 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Map className="size-4 text-primary"/>LROC QuickMap</h2><p className="mt-1 text-[11px] text-muted-foreground">ASU · LRO imagery and topography · {site.lat.toFixed(2)}°, {site.lon.toFixed(2)}°</p></header><iframe key={site.id} title={`LROC QuickMap centered around ${site.name}`} src={mapSrc} loading="lazy" referrerPolicy="no-referrer" className="h-[420px] w-full border-0 bg-[#080b10]"/><p className="border-t border-white/10 p-3 text-[10px] leading-relaxed text-muted-foreground">Use QuickMap’s own layer controls to inspect available lunar imagery and topography. Coverage and resolution vary by layer.</p></article>
      <article className="overflow-hidden rounded-2xl border border-white/10"><header className="border-b border-white/10 p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Map className="size-4 text-primary"/>NASA Moon Trek</h2><p className="mt-1 text-[11px] text-muted-foreground">Interactive lunar globe and topographic layers</p></header><iframe title="NASA Moon Trek interactive lunar map" src="https://trek.nasa.gov/moon/" loading="lazy" className="h-[420px] w-full border-0 bg-[#080b10]"/><p className="border-t border-white/10 p-3 text-[10px] leading-relaxed text-muted-foreground">NASA’s 3D lunar exploration workspace. Its layer catalog and analysis controls are provided by NASA; embedded operation depends on browser and NASA framing support.</p></article>
    </section>
    <section className="mt-8 rounded-2xl border border-white/10 p-5"><div className="mb-4"><h2 className="flex items-center gap-2 text-lg font-semibold"><Orbit className="size-4 text-sun"/>Compare this site with JPL Horizons</h2><p className="mt-1 text-xs text-muted-foreground">Requests hourly, airless Sun and Earth elevations for the first 30 days and compares them with the app’s ephemeris.</p></div><NasaCheck site={site} startMs={startMs} days={30}/></section>
    <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">These resources do not silently replace the planner’s data sources. The comparison reports ephemeris differences; planner terrain masks remain illustrative, and the LOLA mesh previews are for visual inspection.</p>
  </main>;
}
