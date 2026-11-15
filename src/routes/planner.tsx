import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, Pause, Play, Plus, RotateCcw, Sun, Radio, CalendarDays, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelineStrip } from '@/components/TimelineStrip';
import { PolarMap } from '@/components/PolarMap';
import { SITES, type LandingSite } from '@/lib/sites';
import { formatDuration, formatUTC, sampleSite, type SiteAnalysis } from '@/lib/analysis';
import { customSite, nextTransition, rankSites, type Priority } from '@/lib/planning';
import { exportReportJson, exportSummaryCsv, exportTimeseriesCsv } from '@/lib/export';
import { MissionSummary } from '@/components/MissionSummary';
import { TermHelp } from '@/components/TermHelp';

export const Route = createFileRoute('/planner')({
  head: () => ({ meta: [
    { title: 'Mission Planner — Lunar South Pole Analysis' },
    { name: 'description', content: 'Choose a lunar south-pole landing site on an interactive 3D Moon, set dates, and compare sunlight and Earth-contact windows.' },
    { property: 'og:title', content: 'Mission Planner — Lunar South Pole Analysis' },
    { property: 'og:description', content: 'Accessible lunar site, date, power and communication comparisons.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: PlannerPage,
});
const STEPS = 720;
const INITIAL = '2026-11-07T00:00';
const FIELD = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary';
const PRIORITY_TEXT: Record<Priority, string> = { power: 'power', balanced: 'a balance of power and Earth contact', comms: 'Earth contact' };
const RANKING_EXPLANATION: Record<Priority, string> = {
  power: 'Power ranking combines sunlight (75%) with Earth visibility (25%), so the site with the most sunlight may not rank first if its Earth visibility is much lower.',
  balanced: 'Balanced ranking gives sunlight and Earth visibility equal weight (50% each).',
  comms: 'Earth link ranking combines Earth visibility (75%) with sunlight (25%), so the site with the highest Earth visibility may not rank first if its sunlight is much lower.',
};

function PlannerPage() {
  const [start, setStart] = useState(INITIAL);
  const [alternate, setAlternate] = useState('2026-12-07T00:00');
  const [compare, setCompare] = useState(false);
  const [days, setDays] = useState(29.53);
  const [priority, setPriority] = useState<Priority>('balanced');
  const [sites, setSites] = useState<LandingSite[]>(SITES);
  const [selected, setSelected] = useState(SITES.map(s => s.id));
  const [detailId, setDetailId] = useState(SITES[0]?.id ?? '');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('-89');
  const [lon, setLon] = useState('0');
  const [horizon, setHorizon] = useState('0');
  const startMs = Date.parse(`${start}:00Z`);
  const altMs = Date.parse(`${alternate}:00Z`);
  const valid = Number.isFinite(startMs);
  const ranked = useMemo(() => valid ? rankSites(sites.filter(s => selected.includes(s.id)).map(s => sampleSite(s, startMs, days, STEPS)), priority) : [], [sites, selected, startMs, days, priority, valid]);
  const alternateRanked = useMemo(() => compare && Number.isFinite(altMs) ? rankSites(sites.filter(s => selected.includes(s.id)).map(s => sampleSite(s, altMs, days, STEPS)), priority) : [], [sites, selected, compare, altMs, days, priority]);
  const detail = ranked.find(a => a.site.id === detailId) ?? ranked[0];
  const altDetail = alternateRanked.find(a => a.site.id === detail?.site.id);
  const best = ranked[0];
  const all = [...ranked, ...alternateRanked];
  const simulatorHref = detail
    ? detail.site.id.startsWith('custom-')
      ? `/simulator?site=${encodeURIComponent(detail.site.id)}&lat=${detail.site.lat}&lon=${detail.site.lon}&name=${encodeURIComponent(detail.site.name)}&horizon=${detail.site.horizon[0] ?? 0}`
      : `/simulator?site=${encodeURIComponent(detail.site.id)}`
    : '/simulator';
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % (STEPS + 1)), 100);
    return () => window.clearInterval(timer);
  }, [playing]);

  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  const pickSite = (id: string) => { setDetailId(id); setSelected(current => current.includes(id) ? current : [...current, id]); setIndex(0); };
  const addCustom = (nm: string, latV: number, lonV: number, horizonDeg: number) => {
    try {
      const site = customSite(nm, latV, lonV, horizonDeg);
      if (sites.some(s => s.id === site.id)) throw new Error('This site is already in the list.');
      setSites(current => [...current, site]); setSelected(current => [...current, site.id]); setDetailId(site.id); setIndex(0); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Check your coordinates.'); }
  };
  const addFromMap = (latV: number, lonV: number) => addCustom(`Custom ${latV.toFixed(2)}°, ${lonV.toFixed(2)}°`, latV, lonV, 0);
  const addFromForm = (e: React.FormEvent) => { e.preventDefault(); addCustom(name, Number(lat), Number(lon), Number(horizon)); setName(''); };
  const startNow = () => { const d = new Date(); d.setUTCMinutes(0, 0, 0); setStart(d.toISOString().slice(0, 16)); setIndex(0); };

  return <main className="planner-page mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
    <header className="planner-hero mb-10 overflow-hidden rounded-2xl border border-white/10 px-6 py-8 md:px-10 md:py-10">
      <p className="label-caps inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-primary"><span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />Lunar operations <span className="text-white/30">/</span> Mission planner</p>
      <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">Find your place in the <span className="planner-title-accent">lunar light.</span></h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">Explore candidate landing zones on the Moon, shape a custom site, and see how sunlight and Earth contact change across your mission.</p>
      <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-white/70"><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">01 <span className="ml-1 text-white/45">Explore the Moon</span></span><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">02 <span className="ml-1 text-white/45">Set mission conditions</span></span><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">03 <span className="ml-1 text-white/45">Compare the windows</span></span></div>
      <div className="planner-telemetry-rail mt-7"><div><span>LOCATIONS IN VIEW</span><strong>{selected.length}<small> / {sites.length}</small></strong></div><div><span>MISSION WINDOW</span><strong>{days === 29.53 ? '29.53' : days}<small> days</small></strong></div><div><span>RANKING PRIORITY</span><strong>{priority === 'comms' ? 'Earth link' : priority === 'power' ? 'Power' : 'Balanced'}</strong></div><div className="planner-rail-orbit" aria-hidden="true"><i/><i/><i/></div></div>
    </header>

    <section aria-labelledby="step-1" className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><SectionTitle id="step-1" n="1" title="Pick a landing site" /><Button asChild variant="outline" size="sm"><a href={simulatorHref}><Globe2 />See this site from the surface <ArrowRight /></a></Button></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <PolarMap sites={sites} selected={selected} detailId={detail?.site.id ?? detailId} currentTimeMs={startMs + (index / STEPS) * days * 86400000} onPick={pickSite} onAdd={addFromMap} />
        <div className="site-selector rounded-2xl border border-white/10 p-4 md:p-5">
          <div className="mb-4"><p className="label-caps text-primary">Site catalog</p><h3 className="mt-1 text-base font-semibold">Landing choices</h3></div>
          <div className="mb-3 flex justify-between text-xs text-muted-foreground"><span>{selected.length} of {sites.length} included in the comparison</span><Button variant="link" size="sm" className="h-auto p-0" onClick={() => setSelected(selected.length === sites.length ? [] : sites.map(s => s.id))}>{selected.length === sites.length ? 'Clear' : 'Select all'}</Button></div>
          <div className="max-h-[430px] space-y-1 overflow-auto pr-1">{sites.map((s, i) => <label key={s.id} className={`site-choice flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs leading-relaxed ${detail?.site.id === s.id ? 'site-choice-active' : 'border-transparent hover:border-white/10 hover:bg-white/[0.035]'}`}><input type="checkbox" className="accent-primary" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} /><span className="site-terrain-chip" style={{ filter: `hue-rotate(${i * 41}deg)` }} aria-hidden="true"/><span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-medium text-foreground"><span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>{s.name}</span><span className="mt-1 block pl-7 font-mono text-[10px] text-muted-foreground">{Math.abs(s.lat).toFixed(2)}°{s.lat < 0 ? 'S' : 'N'} · {Math.abs(s.lon).toFixed(2)}°{s.lon < 0 ? 'W' : 'E'}</span></span><span className="site-focus-tag">{detail?.site.id === s.id ? 'FOCUS' : ''}</span></label>)}</div>
          {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/15 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-white/65">Horizon assumptions</p><p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">Custom sites use a declared flat 0° horizon. Built-in site terrain masks are illustrative.</p></div>
        </div>
      </div>
    </section>

    <section aria-labelledby="step-2" className="mb-10 border-t border-hairline pt-8">
      <SectionTitle id="step-2" n="2" title="Choose dates and priority" />
      <div className="mt-4 grid gap-5 md:grid-cols-3">
        <div><label className="block text-xs font-medium">Landing date & time (UTC)<input aria-label="Landing date and time UTC" type="datetime-local" required value={start} onChange={e => { setStart(e.target.value); setIndex(0); }} className={`${FIELD} mt-2`} /></label>
          <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={startNow}>Use today</Button>
          {!valid && <p role="alert" className="mt-2 text-xs text-destructive">Choose a valid landing date.</p>}</div>
        <label className="block text-xs font-medium">How long<select aria-label="Mission duration" value={days} onChange={e => { setDays(Number(e.target.value)); setIndex(0); }} className={`${FIELD} mt-2`}><option value={7}>7 days</option><option value={14}>14 days</option><option value={29.53}>One lunar cycle · 29.53 days</option><option value={90}>90 days</option><option value={365}>One year · seasonal study</option></select></label>
        <div><p className="text-xs font-medium">What matters most?</p><div className="mt-2 flex gap-1 rounded-md bg-secondary p-1">{(['power', 'balanced', 'comms'] as const).map(p => <Button key={p} size="sm" variant={priority === p ? 'default' : 'ghost'} aria-pressed={priority === p} className="flex-1 px-2" onClick={() => setPriority(p)}>{p === 'power' ? 'Power' : p === 'comms' ? 'Earth link' : 'Balanced'}</Button>)}</div><div className="mt-3 rounded-xl border border-primary/35 bg-primary/[0.09] p-3.5 shadow-[inset_3px_0_0_var(--primary)]"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">How ranking works</p><p className="mt-1.5 text-xs leading-relaxed text-foreground/85">{RANKING_EXPLANATION[priority]}</p><p className="mt-1.5 text-[10px] font-medium leading-relaxed text-muted-foreground">Displayed percentages are rounded. Rankings use full-precision values, so two rows that look tied may rank differently.</p></div></div>
      </div>
    </section>

    <section aria-labelledby="step-3" className="border-t border-hairline pt-8">
      <SectionTitle id="step-3" n="3" title="Read the result" />
      {ranked.length === 0 || !best || !detail ? <div className="mt-4 border-y border-hairline py-16 text-center text-muted-foreground">Select at least one site and a valid date to see results.</div> : <>
        <div className="best-match-panel mt-4">
          <div className="best-match-copy"><p className="label-caps text-primary">Highest ranked · {priority === 'balanced' ? 'weighted equally' : `${priority === 'power' ? 'power' : 'Earth link'} priority`}</p><h2 className="mt-3 text-2xl font-semibold md:text-3xl">{best.site.name}</h2><p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">Best match for {PRIORITY_TEXT[priority]} across this {days === 29.53 ? 'lunar-cycle' : `${days}-day`} window.</p><p className="mt-4 font-mono text-[10px] text-white/40">{Math.abs(best.site.lat).toFixed(2)}°S <span className="text-white/20">/</span> {Math.abs(best.site.lon).toFixed(2)}°{best.site.lon < 0 ? 'W' : 'E'}</p></div>
          <div className="best-match-gauges"><MetricRing label="Sunlight" value={best.illumination} tone="sun"/><MetricRing label="Earth view" value={best.earthVisibility} tone="earth"/></div>
          <div className="best-match-gaps"><div><span>LONGEST DARK</span><strong>{formatDuration(best.longestDarkHours)}</strong></div><div><span>LONGEST EARTH GAP</span><strong>{formatDuration(best.longestGapHours)}</strong></div></div>
          {best.illumination === 0 && <p role="status" className="mt-3 text-sm text-destructive">No sunlight reaches this site in this window. Try a different start date or a longer duration.</p>}
        </div>

        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="py-3">Landing site</th><th><TermHelp term="Sunlight" /></th><th><TermHelp term="Earth link" /></th><th><TermHelp term="Longest dark" /></th><th><TermHelp term="Link gap" /></th></tr></thead><tbody>{ranked.map((a, i) => <tr key={a.site.id} className={`border-b border-hairline transition-colors ${detail.site.id === a.site.id ? 'bg-primary/8' : 'hover:bg-secondary/60'}`}><td className="py-3 pr-3"><Button variant="link" className="h-auto max-w-[240px] justify-start whitespace-normal p-0 text-left text-foreground" onClick={() => pickSite(a.site.id)} aria-pressed={detail.site.id === a.site.id}><span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>{a.site.name}</Button></td><td className="font-mono text-sun">{(a.illumination * 100).toFixed(0)}%</td><td className="font-mono text-earth">{(a.earthVisibility * 100).toFixed(0)}%</td><td className="font-mono text-xs">{formatDuration(a.longestDarkHours)}</td><td className="font-mono text-xs">{formatDuration(a.longestGapHours)}</td></tr>)}</tbody></table></div>
        <p className="mt-3 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">Screening estimates, not flight-certified. Built-in terrain masks are illustrative. Rankings measure visibility, not electrical output or link margin.</p>

        <div className="mt-8"><MissionSummary analysis={detail} alternatives={ranked} /></div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="label-caps text-primary">Selected location</p><h2 className="mt-2 text-xl font-semibold">{detail.site.name}</h2></div><div className="flex items-center gap-2"><Button size="icon" variant="outline" title="Reset timeline" aria-label="Reset timeline" onClick={() => { setIndex(0); setPlaying(false); }}><RotateCcw /></Button><Button size="icon" title={playing ? 'Pause timeline' : 'Play timeline'} aria-label={playing ? 'Pause timeline' : 'Play timeline'} onClick={() => setPlaying(v => !v)}>{playing ? <Pause /> : <Play />}</Button></div></div>
        <div className={`grid gap-6 ${compare ? 'xl:grid-cols-2' : ''}`}><WindowView analysis={detail} index={index} onScrub={setIndex} label="Primary window" />{compare && altDetail && <WindowView analysis={altDetail} index={index} onScrub={setIndex} label="Alternate window" />}</div>
        <input type="range" min={0} max={STEPS} value={index} onChange={e => setIndex(Number(e.target.value))} aria-label="Mission timeline" className="mt-6 w-full accent-primary" />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground"><span>Landing</span><span>{(index / STEPS * days).toFixed(2)} days elapsed</span><span>Mission end</span></div>
        {compare && altDetail && <div className="mt-6 border-y border-hairline py-4 text-sm"><CalendarDays className="mr-2 inline size-4 text-primary" />Alternate date at this location: <strong className="text-sun">{delta(altDetail.illumination - detail.illumination)} pp sunlight</strong> · <strong className="text-earth">{delta(altDetail.earthVisibility - detail.earthVisibility)} pp Earth visibility</strong></div>}

        <details className="mt-10 border-t border-hairline pt-5">
          <summary className="cursor-pointer text-sm font-medium text-primary">Advanced: compare another date, enter coordinates, export data</summary>
          <div className="mt-5 grid gap-8 md:grid-cols-3">
            <div><h3 className="text-sm font-semibold">Compare another landing date</h3>
              <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} className="accent-primary" />Show a second window</label>
              {compare && <label className="mt-3 block text-xs font-medium">Alternate landing (UTC)<input aria-label="Alternate landing date and time UTC" type="datetime-local" required value={alternate} onChange={e => setAlternate(e.target.value)} className={`${FIELD} mt-2`} />{!Number.isFinite(altMs) && <span className="text-destructive">Choose a valid alternate date.</span>}</label>}</div>
            <form onSubmit={addFromForm} className="space-y-3"><h3 className="text-sm font-semibold">Add a site by coordinates</h3>
              <label className="block text-xs">Site name<input aria-label="Custom site name" required value={name} onChange={e => setName(e.target.value)} className={`${FIELD} mt-1`} /></label>
              <div className="grid grid-cols-2 gap-2"><label className="text-xs">Latitude °<input aria-label="Custom latitude" required type="number" min={-90} max={90} step="any" value={lat} onChange={e => setLat(e.target.value)} className={`${FIELD} mt-1`} /></label><label className="text-xs">Longitude °E<input aria-label="Custom longitude" required type="number" min={-180} max={180} step="any" value={lon} onChange={e => setLon(e.target.value)} className={`${FIELD} mt-1`} /></label></div>
              <label className="block text-xs">Constant horizon °<input aria-label="Custom horizon" required type="number" min={0} max={90} step="any" value={horizon} onChange={e => setHorizon(e.target.value)} className={`${FIELD} mt-1`} /></label>
              <Button type="submit" size="sm"><Plus />Add site</Button></form>
            <div><h3 className="text-sm font-semibold">Export {compare ? 'both windows' : 'mission data'}</h3><div className="mt-3 flex flex-col items-start gap-2"><Button size="sm" variant="outline" onClick={() => exportSummaryCsv(all, start.slice(0, 10))}><Download />Comparison CSV</Button><Button size="sm" variant="outline" onClick={() => exportTimeseriesCsv(all, start.slice(0, 10))}><Download />Time series CSV</Button><Button size="sm" onClick={() => exportReportJson(all, { start, days })}><Download />Windows JSON</Button></div>
              <Button variant="link" size="sm" asChild className="mt-4 h-auto p-0"><Link to="/how-it-works">How the numbers are made <ArrowRight /></Link></Button></div>
          </div>
        </details>
      </>}
    </section>
  </main>;
}
function delta(value: number) { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}`; }
function MetricRing({ label, value, tone }: { label: string; value: number; tone: 'sun' | 'earth' }) {
  const radius = 31, circumference = 2 * Math.PI * radius, amount = Math.max(0, Math.min(1, value));
  return <div className={`metric-ring metric-ring-${tone}`}><svg viewBox="0 0 76 76" role="img" aria-label={`${label}: ${Math.round(amount * 100)} percent`}><circle className="metric-ring-track" cx="38" cy="38" r={radius}/><circle className="metric-ring-value" cx="38" cy="38" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - amount)}/></svg><strong>{Math.round(amount * 100)}<small>%</small></strong><span>{label}</span></div>;
}
function SectionTitle({ id, n, title }: { id: string; n: string; title: string }) { return <h2 id={id} className="flex items-center gap-3 text-lg font-semibold"><span className="grid size-7 place-items-center rounded-full bg-primary font-mono text-xs text-primary-foreground">{n}</span>{title}</h2>; }
function WindowView({ analysis, index, onScrub, label }: { analysis: SiteAnalysis; index: number; onScrub: (i: number) => void; label: string }) {
  const sample = analysis.samples[index];
  if (!sample) return null;
  return <div className="min-w-0"><p className="mb-3 text-xs font-medium text-muted-foreground">{label} · <span className="font-mono">{formatUTC(sample.t)} UTC</span></p>
    <dl className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur"><dt className="flex items-center gap-2 text-xs text-sun"><Sun className="size-4" />{sample.sunUp ? 'Sun above terrain' : 'Sun blocked'}</dt><dd className="mt-1 font-mono text-xl">{sample.sunAlt.toFixed(2)}° <span className="text-xs text-muted-foreground">elevation</span></dd><dd className="mt-1 text-xs text-muted-foreground">{sample.sunUp ? 'Sunset' : 'Sunrise'} {nextTransition(analysis, index, 'sun')}</dd></div><div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur"><dt className="flex items-center gap-2 text-xs text-earth"><Radio className="size-4" />{sample.earthUp ? 'Earth in view' : 'Earth blocked'}</dt><dd className="mt-1 font-mono text-xl">{sample.earthAlt.toFixed(2)}° <span className="text-xs text-muted-foreground">elevation</span></dd><dd className="mt-1 text-xs text-muted-foreground">{sample.earthUp ? 'Earthset' : 'Earthrise'} {nextTransition(analysis, index, 'earth')}</dd><p className="mt-3 text-[9px] text-muted-foreground">Planner visibility uses illustrative horizons.</p></div></dl>
    <div className="mt-4"><TimelineStrip analysis={analysis} index={index} onScrub={onScrub} label={analysis.site.name} /></div>
    <details className="mt-4 border-t border-hairline pt-3"><summary className="cursor-pointer text-xs text-muted-foreground">Sunlight & direct-link intervals</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">{(['sun', 'earth'] as const).map(body => <div key={body}><p className={`mb-2 text-xs font-medium ${body === 'sun' ? 'text-sun' : 'text-earth'}`}>{body === 'sun' ? 'Sunlight' : 'Earth link'}</p><ul className="max-h-40 space-y-2 overflow-auto font-mono text-[10px] text-muted-foreground">{(body === 'sun' ? analysis.sunlitIntervals : analysis.earthIntervals).map((i, n) => <li key={n}>{formatUTC(i.start)} → {formatUTC(i.end)}</li>)}{(body === 'sun' ? analysis.sunlitIntervals : analysis.earthIntervals).length === 0 && <li>No visible intervals in this window.</li>}</ul></div>)}</div><p className="mt-3 text-[10px] text-muted-foreground">Events are sampled to ≈ {formatDuration(analysis.stepMs / 3600000)}. Intervals are clipped at the mission boundaries; visibility uses the upper edge of each disc.</p></details>
  </div>;
}
