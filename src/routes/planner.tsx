import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, Pause, Play, Plus, RotateCcw, Sun, Radio, CalendarDays, Globe2, Mountain, Share2, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelineStrip } from '@/components/TimelineStrip';
import { PolarMap } from '@/components/PolarMap';
import { SITES, type LandingSite } from '@/lib/sites';
import { formatDuration, formatUTC, sampleSite, type SiteAnalysis } from '@/lib/analysis';
import { customSite, nextTransition, rankSites, weightedScore, PRIORITY_WEIGHTS, type Priority } from '@/lib/planning';
import { exportMissionBrief, exportReportJson, exportSummaryCsv, exportTimeseriesCsv } from '@/lib/export';
import { MissionSummary } from '@/components/MissionSummary';
import { TermHelp } from '@/components/TermHelp';
import { loadLolaHorizonProfiles } from '@/lib/lola-horizon';

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
  const [comparePrimaryId, setComparePrimaryId] = useState(SITES[0]?.id ?? '');
  const [compareSecondaryId, setCompareSecondaryId] = useState(SITES[1]?.id ?? SITES[0]?.id ?? '');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const [terrainProfiles, setTerrainProfiles] = useState<Record<string, number[]> | null>(null);
  const [terrainStatus, setTerrainStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('-89');
  const [lon, setLon] = useState('0');
  const [horizon, setHorizon] = useState('0');
  const startMs = Date.parse(`${start}:00Z`);
  const altMs = Date.parse(`${alternate}:00Z`);
  const valid = Number.isFinite(startMs);
  const analyze = useCallback((site: LandingSite, at: number) => {
    const profile = terrainProfiles?.[site.id];
    const source = profile ? 'lola-dem' : site.id.startsWith('custom-') ? 'custom' : 'illustrative';
    return sampleSite(profile ? { ...site, horizon: profile } : site, at, days, STEPS, source);
  }, [terrainProfiles, days]);
  const ranked = useMemo(() => valid ? rankSites(sites.filter(s => selected.includes(s.id)).map(s => analyze(s, startMs)), priority) : [], [sites, selected, startMs, priority, valid, analyze]);
  const alternateRanked = useMemo(() => compare && Number.isFinite(altMs) ? rankSites(sites.filter(s => selected.includes(s.id)).map(s => analyze(s, altMs)), priority) : [], [sites, selected, compare, altMs, priority, analyze]);
  const detail = ranked.find(a => a.site.id === detailId) ?? ranked[0];
  const altDetail = alternateRanked.find(a => a.site.id === detail?.site.id);
  const best = ranked[0];
  const comparePrimary = sites.find(site => site.id === comparePrimaryId);
  const compareSecondary = sites.find(site => site.id === compareSecondaryId);
  const comparePrimaryAnalysis = useMemo(() => valid && comparePrimary ? analyze(comparePrimary, startMs) : null, [valid, comparePrimary, startMs, analyze]);
  const compareSecondaryAnalysis = useMemo(() => valid && compareSecondary ? analyze(compareSecondary, startMs) : null, [valid, compareSecondary, startMs, analyze]);
  const all = [...ranked, ...alternateRanked];
  const simulatorHref = detail
    ? detail.site.id.startsWith('custom-')
      ? `/simulator?site=${encodeURIComponent(detail.site.id)}&lat=${detail.site.lat}&lon=${detail.site.lon}&name=${encodeURIComponent(detail.site.name)}&horizon=${detail.site.horizon[0] ?? 0}`
      : `/simulator?site=${encodeURIComponent(detail.site.id)}`
    : '/simulator';
  useEffect(() => {
    let active = true;
    loadLolaHorizonProfiles().then(profiles => { if (active) { setTerrainProfiles(profiles); setTerrainStatus('ready'); } }).catch(() => { if (active) setTerrainStatus('error'); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex(i => i >= STEPS ? 0 : i + 1), 180);
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
      <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">Find the landing site</h1>
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
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/15 p-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/65">{terrainStatus === 'loading' ? <LoaderCircle className="size-3 animate-spin"/> : <Mountain className="size-3 text-primary"/>}Horizon assumptions</p><p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{terrainStatus === 'ready' ? 'Built-in sites use local skylines derived from NASA LRO LOLA terrain (240 m grid). Custom sites use their declared constant horizon.' : terrainStatus === 'loading' ? 'Loading LOLA elevation patches; built-in site estimates will switch to them when ready. Custom sites retain their declared horizon.' : 'LOLA patches could not load. Built-in estimates use illustrative masks; custom sites use their declared constant horizon.'}</p></div>
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
        <p className="mt-3 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted-foreground">Screening estimates, not flight-certified. When loaded, built-in site skylines come from NASA LRO LOLA elevation patches; custom horizons are user-declared. Rankings measure visibility, not electrical output or link margin.</p>

        <div className="mt-8"><MissionSummary analysis={detail} alternatives={ranked} /></div>
        <RankingBreakdown analysis={detail} rank={ranked.findIndex(a => a.site.id === detail.site.id) + 1} total={ranked.length} priority={priority} />
        <TerrainSkyline analysis={detail} index={index} terrainStatus={terrainStatus} />

        <section className="site-compare mt-8" aria-labelledby="site-compare-title"><div className="site-compare-heading"><div><p className="label-caps text-primary">Side-by-side study</p><h2 id="site-compare-title" className="mt-2 text-xl font-semibold md:text-2xl">Compare two landing sites</h2><p className="mt-2 text-xs text-muted-foreground">Same mission dates, shared playback cursor, and matching visibility scales.</p></div><div className="site-compare-selects"><label>Site A<select value={comparePrimaryId} onChange={event => setComparePrimaryId(event.target.value)} className={FIELD}>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label><span className="site-compare-vs">VS</span><label>Site B<select value={compareSecondaryId} onChange={event => setCompareSecondaryId(event.target.value)} className={FIELD}>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label></div></div><div className="site-compare-cards">{comparePrimaryAnalysis && <SiteCompareCard analysis={comparePrimaryAnalysis} />}{compareSecondaryAnalysis && <SiteCompareCard analysis={compareSecondaryAnalysis} />}</div>{comparePrimaryAnalysis && compareSecondaryAnalysis && <CompareTimeline a={comparePrimaryAnalysis} b={compareSecondaryAnalysis} index={index} onScrub={setIndex} days={days}/>}</section>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="label-caps text-primary">Mission playback</p><h2 className="mt-2 text-xl font-semibold">Follow one lunar cycle</h2><p className="mt-1 text-xs text-muted-foreground">Scrub or play; readouts and both comparison traces stay synchronized.</p></div><div className="flex items-center gap-2"><Button size="icon" variant="outline" title="Reset timeline" aria-label="Reset timeline" onClick={() => { setIndex(0); setPlaying(false); }}><RotateCcw /></Button><Button size="icon" title={playing ? 'Pause timeline' : 'Play lunar-cycle playback'} aria-label={playing ? 'Pause timeline' : 'Play lunar-cycle playback'} onClick={() => setPlaying(v => !v)}>{playing ? <Pause /> : <Play />}</Button></div></div>
        <div className={`grid gap-6 ${compare ? 'xl:grid-cols-2' : ''}`}><WindowView analysis={detail} index={index} onScrub={setIndex} label="Primary window" />{compare && altDetail && <WindowView analysis={altDetail} index={index} onScrub={setIndex} label="Alternate window" />}</div>
        <input type="range" min={0} max={STEPS} value={index} onChange={e => setIndex(Number(e.target.value))} aria-label="Mission timeline" className="mt-6 w-full accent-primary" />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground"><span>Landing</span><span>{(index / STEPS * days).toFixed(2)} days elapsed</span><span>Mission end</span></div>
        {compare && altDetail && <div className="mt-6 border-y border-hairline py-4 text-sm"><CalendarDays className="mr-2 inline size-4 text-primary" />Alternate date at this location: <strong className="text-sun">{delta(altDetail.illumination - detail.illumination)} pp sunlight</strong> · <strong className="text-earth">{delta(altDetail.earthVisibility - detail.earthVisibility)} pp Earth visibility</strong></div>}

        <details className="mt-10 border-t border-hairline pt-5">
          <summary className="cursor-pointer text-sm font-medium text-primary">More tools: alternate dates, custom sites, and exports</summary>
          <div className="mt-5 grid gap-8 md:grid-cols-3">
            <div><h3 className="text-sm font-semibold">Compare another landing date</h3>
              <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} className="accent-primary" />Show a second window</label>
              {compare && <label className="mt-3 block text-xs font-medium">Alternate landing (UTC)<input aria-label="Alternate landing date and time UTC" type="datetime-local" required value={alternate} onChange={e => setAlternate(e.target.value)} className={`${FIELD} mt-2`} />{!Number.isFinite(altMs) && <span className="text-destructive">Choose a valid alternate date.</span>}</label>}</div>
            <form onSubmit={addFromForm} className="space-y-3"><h3 className="text-sm font-semibold">Add a site by coordinates</h3>
              <label className="block text-xs">Site name<input aria-label="Custom site name" required value={name} onChange={e => setName(e.target.value)} className={`${FIELD} mt-1`} /></label>
              <div className="grid grid-cols-2 gap-2"><label className="text-xs">Latitude °<input aria-label="Custom latitude" required type="number" min={-90} max={90} step="any" value={lat} onChange={e => setLat(e.target.value)} className={`${FIELD} mt-1`} /></label><label className="text-xs">Longitude °E<input aria-label="Custom longitude" required type="number" min={-180} max={180} step="any" value={lon} onChange={e => setLon(e.target.value)} className={`${FIELD} mt-1`} /></label></div>
              <label className="block text-xs">Constant horizon °<input aria-label="Custom horizon" required type="number" min={0} max={90} step="any" value={horizon} onChange={e => setHorizon(e.target.value)} className={`${FIELD} mt-1`} /></label>
              <Button type="submit" size="sm"><Plus />Add site</Button></form>
            <div><h3 className="text-sm font-semibold">Export {compare ? 'both windows' : 'mission data'}</h3><div className="mt-3 flex flex-col items-start gap-2"><Button size="sm" variant="outline" onClick={() => exportSummaryCsv(all, start.slice(0, 10))}><Download />Comparison CSV</Button><Button size="sm" variant="outline" onClick={() => exportTimeseriesCsv(all, start.slice(0, 10))}><Download />Time series CSV</Button><Button size="sm" variant="outline" onClick={() => exportReportJson(all, { start, days })}><Download />Windows JSON</Button><Button size="sm" onClick={() => { if (comparePrimaryAnalysis && compareSecondaryAnalysis) exportMissionBrief([comparePrimaryAnalysis, compareSecondaryAnalysis], { start, days, priority: priority === 'power' ? 'Power - 75% sunlight / 25% Earth' : priority === 'comms' ? 'Earth link - 25% sunlight / 75% Earth' : 'Balanced - 50% sunlight / 50% Earth' }); }}><Share2 />Shareable mission brief</Button></div>
              <Button variant="link" size="sm" asChild className="mt-4 h-auto p-0"><Link to="/how-it-works">How the numbers are made <ArrowRight /></Link></Button></div>
          </div>
        </details>
      </>}
    </section>
  </main>;
}
function delta(value: number) { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}`; }
function RankingBreakdown({ analysis, rank, total, priority }: { analysis: SiteAnalysis; rank: number; total: number; priority: Priority }) {
  const sunWeight = PRIORITY_WEIGHTS[priority], earthWeight = 1 - sunWeight;
  const sunPoints = analysis.illumination * sunWeight * 100, earthPoints = analysis.earthVisibility * earthWeight * 100;
  const score = weightedScore(analysis, priority) * 100;
  return <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5" aria-label="Why this site ranked here">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="label-caps text-primary">Ranking, explained</p><h3 className="mt-1 text-lg font-semibold">Why {analysis.site.name} is #{rank}</h3></div><p className="font-mono text-sm text-primary">{score.toFixed(1)} <span className="text-[10px] text-white/40">/ 100</span><span className="ml-2 text-[10px] text-white/45">of {total}</span></p></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><ScoreBar label={`Sunlight · ${(sunWeight * 100).toFixed(0)}% weight`} value={sunPoints} maximum={sunWeight * 100} tone="sun" metric={`${(analysis.illumination * 100).toFixed(1)}% available`} /><ScoreBar label={`Earth visibility · ${(earthWeight * 100).toFixed(0)}% weight`} value={earthPoints} maximum={earthWeight * 100} tone="earth" metric={`${(analysis.earthVisibility * 100).toFixed(1)}% available`} /></div>
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.08] pt-3 text-[10px] text-white/55"><span>Longest darkness <b className="ml-1 text-foreground">{formatDuration(analysis.longestDarkHours)}</b></span><span>Longest Earth gap <b className="ml-1 text-foreground">{formatDuration(analysis.longestGapHours)}</b></span><span className="text-white/40">Gaps are shown as risk readouts; only weighted sunlight and Earth visibility set the score.</span></div>
  </section>;
}
function ScoreBar({ label, value, maximum, tone, metric }: { label: string; value: number; maximum: number; tone: 'sun' | 'earth'; metric: string }) {
  return <div><div className="flex justify-between gap-3 text-[10px]"><span>{label}</span><span className={tone === 'sun' ? 'text-sun' : 'text-earth'}>{metric} · {value.toFixed(1)} pts</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${tone === 'sun' ? 'bg-sun' : 'bg-earth'}`} style={{ width: `${maximum > 0 ? value / maximum * 100 : 0}%` }}/></div></div>;
}
function TerrainSkyline({ analysis, index, terrainStatus }: { analysis: SiteAnalysis; index: number; terrainStatus: 'loading' | 'ready' | 'error' }) {
  const sample = analysis.samples[index];
  if (!sample) return null;
  const W = 720, H = 206, left = 38, right = 14, top = 16, bottom = 27;
  const profile = analysis.site.horizon;
  const plotW = W - left - right, plotH = H - top - bottom, min = -5, max = Math.max(25, Math.ceil(Math.max(...profile) / 5) * 5);
  const xAt = (az: number) => left + (((az % 360) + 360) % 360) / 360 * plotW;
  const yAt = (alt: number) => top + (max - Math.max(min, Math.min(max, alt))) / (max - min) * plotH;
  const pts = profile.map((elevation, i) => `${left + i / profile.length * plotW},${yAt(elevation)}`);
  const skyline = `M ${pts.join(' L ')} L ${W - right},${yAt(profile[0] ?? 0)}`;
  const skylineArea = `M ${left},${yAt(min)} L ${pts.join(' L ')} L ${W - right},${yAt(profile[0] ?? 0)} L ${W - right},${yAt(min)} Z`;
  const bodies = [
    { label: 'Sun', az: sample.sunAz, alt: sample.sunAlt, radius: sample.sunRadius, h: sample.sunHorizon, color: '#ffc45d', visible: sample.sunUp },
    { label: 'Earth', az: sample.earthAz, alt: sample.earthAlt, radius: sample.earthRadius, h: sample.earthHorizon, color: '#62cbff', visible: sample.earthUp },
  ];
  const source = analysis.horizonSource === 'lola-dem' ? 'NASA LRO LOLA · derived skyline' : analysis.horizonSource === 'custom' ? 'User-declared constant horizon' : 'Illustrative horizon profile';
  return <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1117]" aria-labelledby="terrain-clearance-title">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4"><div><p className="label-caps flex items-center gap-1.5 text-primary"><Mountain className="size-3.5"/>Terrain meets sky</p><h2 id="terrain-clearance-title" className="mt-1 text-lg font-semibold">Does the skyline block the Sun or Earth?</h2><p className="mt-1 text-[10px] text-muted-foreground">Azimuth around the site vs. apparent altitude at {formatUTC(sample.t)} UTC.</p></div><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-mono text-white/60">{source}</span></div>
    <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(190px,.6fr)] md:p-5"><div className="min-w-0"><svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Horizon elevation profile for ${analysis.site.name}; plotted against current Sun and Earth altitudes`}>
      {[ -5, 0, Math.round(max / 2), max ].map(value => <g key={value}><line x1={left} x2={W - right} y1={yAt(value)} y2={yAt(value)} stroke={value === 0 ? '#61707a' : '#26333b'} strokeDasharray={value === 0 ? '0' : '3 5'}/><text x={left - 8} y={yAt(value) + 3} textAnchor="end" fill="#788992" fontSize="9">{value}°</text></g>)}
      {[0, 90, 180, 270, 360].map(value => <text key={value} x={xAt(value)} y={H - 7} textAnchor="middle" fill="#788992" fontSize="9">{value === 0 || value === 360 ? 'N' : value === 90 ? 'E' : value === 180 ? 'S' : 'W'}</text>)}
      <path d={skylineArea} fill="rgba(255,80,119,.12)" stroke="none"/><path d={skyline} fill="none" stroke="#ff5077" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
      {bodies.map(body => <g key={body.label}><line x1={xAt(body.az)} x2={xAt(body.az)} y1={yAt(body.h)} y2={yAt(body.alt)} stroke={body.color} strokeWidth="1.5" strokeDasharray="3 3" opacity=".85"/><circle cx={xAt(body.az)} cy={yAt(body.alt)} r="5" fill={body.color} stroke="#080c11" strokeWidth="2"/><text x={xAt(body.az) + 8} y={yAt(body.alt) - 7} fill={body.color} fontSize="10" fontWeight="600">{body.label}</text></g>)}
    </svg><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-white/50"><span><i className="mr-1 inline-block w-3 border-t-2 border-[#ff5077]"/>terrain skyline</span><span className="text-sun">● Sun apparent center</span><span className="text-earth">● Earth apparent center</span><span>0° line = local horizontal</span></div></div>
      <div className="grid content-start gap-2">{bodies.map(body => <div key={body.label} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><p className="flex items-center justify-between text-[10px]" style={{ color: body.color }}><strong>{body.label}</strong><span>{body.visible ? 'CLEARS TERRAIN' : 'BEHIND SKYLINE'}</span></p><p className="mt-2 font-mono text-lg">{body.alt.toFixed(2)}° <span className="text-xs text-white/40">altitude</span></p><p className="mt-1 text-[10px] text-white/50">Skyline {body.h.toFixed(2)}° at azimuth {body.az.toFixed(1)}° · limb margin {(body.alt + body.radius - body.h).toFixed(2)}°</p></div>)}<p className="text-[9px] leading-relaxed text-white/40">{analysis.horizonSource === 'lola-dem' ? 'Skyline derived from the local 15.36 km LOLA patch at 240 m grid spacing. It is a DEM-based local horizon estimate, not a surveyed lander-pad profile.' : terrainStatus === 'loading' ? 'LOLA terrain is loading; this interim view uses the site’s fallback horizon.' : analysis.horizonSource === 'custom' ? 'Custom sites use the entered constant horizon; no LOLA terrain is inferred.' : 'LOLA terrain is unavailable; this view uses the illustrative horizon profile.'}</p></div>
    </div>
  </section>;
}
function CompareTimeline({ a, b, index, onScrub, days }: { a: SiteAnalysis; b: SiteAnalysis; index: number; onScrub: (index: number) => void; days: number }) {
  const current = a.samples[index];
  return <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="label-caps text-primary">Synchronized mission windows</p><p className="mt-1 text-xs text-muted-foreground">Matching scales and dates · above 0° clears the local skyline</p></div><span className="font-mono text-[10px] text-white/60">{current ? formatUTC(current.t) : ''} UTC</span></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><ClearancePanel analysis={a} index={index} days={days}/><ClearancePanel analysis={b} index={index} days={days}/></div>
    <div className="mt-2 flex gap-4 text-[9px] text-white/50"><span className="text-sun">━ Sun limb clearance</span><span className="text-earth">━ Earth limb clearance</span></div><input type="range" min={0} max={Math.max(0, a.samples.length - 1)} value={Math.min(index, a.samples.length - 1)} onChange={event => onScrub(Number(event.target.value))} aria-label="Scrub synchronized two-site mission comparison" className="mt-3 w-full accent-primary"/><div className="mt-1 flex justify-between font-mono text-[9px] text-white/40"><span>Shared mission start</span><span>Playback position {((index / STEPS) * days).toFixed(2)} d</span><span>Mission end</span></div>
  </div>;
}
function ClearancePanel({ analysis, index, days }: { analysis: SiteAnalysis; index: number; days: number }) {
  const W = 560, H = 175, left = 35, right = 12, top = 12, bottom = 23, plotW = W - left - right, plotH = H - top - bottom, min = -14, max = 14;
  const yAt = (value: number) => top + (max - Math.max(min, Math.min(max, value))) / (max - min) * plotH;
  const path = (body: 'sun' | 'earth') => analysis.samples.map((sample, i) => {
    const clearance = body === 'sun' ? sample.sunAlt + sample.sunRadius - sample.sunHorizon : sample.earthAlt + sample.earthRadius - sample.earthHorizon;
    const x = left + i / Math.max(1, analysis.samples.length - 1) * plotW;
    return `${i ? 'L' : 'M'}${x.toFixed(2)},${yAt(clearance).toFixed(2)}`;
  }).join(' ');
  const cursor = left + index / Math.max(1, analysis.samples.length - 1) * plotW;
  const source = analysis.horizonSource === 'lola-dem' ? 'NASA LOLA skyline' : analysis.horizonSource === 'custom' ? 'declared horizon' : 'illustrative horizon';
  return <article className="min-w-0 rounded-xl border border-white/[0.08] bg-[#0b1117] p-3"><div className="flex items-start justify-between gap-2"><div className="truncate text-xs font-semibold">{analysis.site.name}</div><span className="shrink-0 text-[8px] text-white/40">{source}</span></div><svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`Sun and Earth terrain clearance across ${days} days at ${analysis.site.name}`}>
    {[-10, 0, 10].map(v => <g key={v}><line x1={left} x2={W-right} y1={yAt(v)} y2={yAt(v)} stroke={v === 0 ? '#63727a' : '#233039'} strokeDasharray={v === 0 ? '0' : '3 5'}/><text x={left - 6} y={yAt(v) + 3} textAnchor="end" fill="#788992" fontSize="8">{v}°</text></g>)}
    <path d={path('sun')} fill="none" stroke="#ffc45d" strokeWidth="1.8"/><path d={path('earth')} fill="none" stroke="#62cbff" strokeWidth="1.8"/><line x1={cursor} x2={cursor} y1={top} y2={H-bottom} stroke="#f4f7f8" strokeWidth="1" strokeDasharray="3 4" opacity=".65"/><text x={left} y={H-5} fill="#788992" fontSize="8">Start</text><text x={W-right} y={H-5} textAnchor="end" fill="#788992" fontSize="8">{days} d</text>
  </svg></article>;
}
function SiteCompareCard({ analysis }: { analysis: SiteAnalysis }) {
  return <article className="site-compare-card"><div><p className="label-caps text-white/40">{analysis.site.region}</p><h3 className="mt-2 text-lg font-semibold">{analysis.site.name}</h3><p className="mt-1 font-mono text-[9px] text-white/40">{Math.abs(analysis.site.lat).toFixed(2)}°S · {Math.abs(analysis.site.lon).toFixed(2)}°{analysis.site.lon < 0 ? 'W' : 'E'}</p></div><div className="site-compare-gauges"><MetricRing label="Sunlight" value={analysis.illumination} tone="sun"/><MetricRing label="Earth view" value={analysis.earthVisibility} tone="earth"/></div><div className="site-compare-foot"><span>LONGEST DARK <b>{formatDuration(analysis.longestDarkHours)}</b></span><span>LONGEST LINK GAP <b>{formatDuration(analysis.longestGapHours)}</b></span></div></article>;
}
function MetricRing({ label, value, tone }: { label: string; value: number; tone: 'sun' | 'earth' }) {
  const radius = 31, circumference = 2 * Math.PI * radius, amount = Math.max(0, Math.min(1, value));
  return <div className={`metric-ring metric-ring-${tone}`}><svg viewBox="0 0 76 76" role="img" aria-label={`${label}: ${Math.round(amount * 100)} percent`}><circle className="metric-ring-track" cx="38" cy="38" r={radius}/><circle className="metric-ring-value" cx="38" cy="38" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - amount)}/></svg><strong>{Math.round(amount * 100)}<small>%</small></strong><span>{label}</span></div>;
}
function SectionTitle({ id, n, title }: { id: string; n: string; title: string }) { return <h2 id={id} className="flex items-center gap-3 text-lg font-semibold"><span className="grid size-7 place-items-center rounded-full bg-primary font-mono text-xs text-primary-foreground">{n}</span>{title}</h2>; }
function WindowView({ analysis, index, onScrub, label }: { analysis: SiteAnalysis; index: number; onScrub: (i: number) => void; label: string }) {
  const sample = analysis.samples[index];
  if (!sample) return null;
  return <div className="min-w-0"><p className="mb-3 text-xs font-medium text-muted-foreground">{label} · <span className="font-mono">{formatUTC(sample.t)} UTC</span></p>
    <dl className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur"><dt className="flex items-center gap-2 text-xs text-sun"><Sun className="size-4" />{sample.sunUp ? 'Sun above terrain' : 'Sun blocked'}</dt><dd className="mt-1 font-mono text-xl">{sample.sunAlt.toFixed(2)}° <span className="text-xs text-muted-foreground">elevation</span></dd><dd className="mt-1 text-xs text-muted-foreground">{sample.sunUp ? 'Sunset' : 'Sunrise'} {nextTransition(analysis, index, 'sun')}</dd></div><div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur"><dt className="flex items-center gap-2 text-xs text-earth"><Radio className="size-4" />{sample.earthUp ? 'Earth in view' : 'Earth blocked'}</dt><dd className="mt-1 font-mono text-xl">{sample.earthAlt.toFixed(2)}° <span className="text-xs text-muted-foreground">elevation</span></dd><dd className="mt-1 text-xs text-muted-foreground">{sample.earthUp ? 'Earthset' : 'Earthrise'} {nextTransition(analysis, index, 'earth')}</dd><p className="mt-3 text-[9px] text-muted-foreground">Horizon: {analysis.horizonSource === 'lola-dem' ? 'NASA LOLA derived' : analysis.horizonSource === 'custom' ? 'declared constant' : 'illustrative fallback'}.</p></div></dl>
    <div className="mt-4"><TimelineStrip analysis={analysis} index={index} onScrub={onScrub} label={analysis.site.name} /></div>
    <details className="mt-4 border-t border-hairline pt-3"><summary className="cursor-pointer text-xs text-muted-foreground">Sunlight & direct-link intervals</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">{(['sun', 'earth'] as const).map(body => <div key={body}><p className={`mb-2 text-xs font-medium ${body === 'sun' ? 'text-sun' : 'text-earth'}`}>{body === 'sun' ? 'Sunlight' : 'Earth link'}</p><ul className="max-h-40 space-y-2 overflow-auto font-mono text-[10px] text-muted-foreground">{(body === 'sun' ? analysis.sunlitIntervals : analysis.earthIntervals).map((i, n) => <li key={n}>{formatUTC(i.start)} → {formatUTC(i.end)}</li>)}{(body === 'sun' ? analysis.sunlitIntervals : analysis.earthIntervals).length === 0 && <li>No visible intervals in this window.</li>}</ul></div>)}</div><p className="mt-3 text-[10px] text-muted-foreground">Events are sampled to ≈ {formatDuration(analysis.stepMs / 3600000)}. Intervals are clipped at the mission boundaries; visibility uses the upper edge of each disc.</p></details>
  </div>;
}
