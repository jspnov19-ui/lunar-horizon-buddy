import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Orbit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchHorizons } from '@/lib/horizons-api';
import type { HorizonsRow } from '@/lib/horizons';
import type { LandingSite } from '@/lib/sites';

const MAX_DAYS = 30;
type State = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'done'; sun: HorizonsRow[]; earth: HorizonsRow[]; fetchedAt: number };

/** Fetches and displays hourly JPL Horizons elevations for one lunar-surface site. */
export function NasaCheck({ site, startMs, days }: { site: LandingSite; startMs: number; days: number }) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const span = Math.min(days, MAX_DAYS);
  useEffect(() => { setState({ status: 'idle' }); }, [site.id, site.lat, site.lon, startMs, days]);

  const run = async () => {
    setState({ status: 'loading' });
    try {
      const args = { lat: site.lat, lon: site.lon, startMs, days: span };
      const [sun, earth] = await Promise.all([
        fetchHorizons({ data: { ...args, body: 'sun' } }),
        fetchHorizons({ data: { ...args, body: 'earth' } }),
      ]);
      if (!sun.ok) return setState({ status: 'error', message: sun.error });
      if (!earth.ok) return setState({ status: 'error', message: earth.error });
      setState({ status: 'done', sun: sun.rows, earth: earth.rows, fetchedAt: Math.min(sun.fetchedAt, earth.fetchedAt) });
    } catch { setState({ status: 'error', message: 'The NASA request failed. Try again in a moment.' }); }
  };

  return <section className="mt-8 border-t border-hairline pt-6" aria-label="JPL Horizons lunar site data">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="label-caps text-primary">NASA JPL ephemeris</p><h3 className="mt-2 text-base font-semibold"><Orbit className="mr-2 inline size-4 text-sun" />Sun and Earth positions</h3></div>
      <Button size="sm" onClick={run} disabled={state.status === 'loading' || !Number.isFinite(startMs)}>{state.status === 'loading' ? <><Loader2 className="animate-spin" />Fetching Horizons…</> : 'Fetch JPL Horizons data'}</Button>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Fetches hourly, airless Sun and Earth elevations for {site.name} (first {span.toFixed(0)} days of the selected window). These are JPL Horizons values only; local terrain obstruction is not included.</p>
    {state.status === 'error' && <p role="alert" className="mt-3 text-sm text-destructive">{state.message}</p>}
    {state.status === 'done' && <div className="mt-4 grid gap-6 md:grid-cols-2">
      {([['Sun', state.sun, 'var(--sun)'], ['Earth', state.earth, 'var(--earth)']] as const).map(([label, rows, color]) => <div key={label}>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="size-4" style={{ color }} />{label} elevation</p>
        <Chart rows={rows} color={color} label={label} />
        {rows.length > 0 && <div className="mt-2 flex justify-between gap-2 font-mono text-[10px] text-muted-foreground"><span>First: {rows[0]!.el.toFixed(2)}°</span><span>Latest: {rows[rows.length - 1]!.el.toFixed(2)}°</span></div>}
      </div>)}
      <p className="text-xs leading-relaxed text-muted-foreground md:col-span-2">Solid line: NASA JPL Horizons. Retrieved {new Date(state.fetchedAt).toISOString().slice(11, 16)} UTC. Elevation is relative to the local horizontal plane; Horizons does not account for nearby terrain.</p>
    </div>}
  </section>;
}

function Chart({ rows, color, label }: { rows: HorizonsRow[]; color: string; label: string }) {
  const W = 400, H = 150, PL = 34, PB = 16;
  const values = rows.map(row => row.el);
  const lo = Math.min(...values, 0) - .5, hi = Math.max(...values, 0) + .5;
  const x = (i: number) => PL + ((W - PL) * i) / Math.max(1, rows.length - 1);
  const y = (v: number) => (H - PB) * (1 - (v - lo) / (hi - lo));
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label} elevation from NASA JPL Horizons`}>
    <line x1={PL} x2={W} y1={y(0)} y2={y(0)} stroke="var(--hairline)" />
    <text x={2} y={y(0) + 3} fontSize={9} fill="var(--muted-foreground)">0°</text>
    <text x={2} y={10} fontSize={9} fill="var(--muted-foreground)">{hi.toFixed(1)}°</text>
    <text x={2} y={H - PB} fontSize={9} fill="var(--muted-foreground)">{lo.toFixed(1)}°</text>
    <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
  </svg>;
}
