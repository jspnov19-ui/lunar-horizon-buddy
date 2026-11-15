import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Compass, Globe2, Radio, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SkyDome } from '@/components/SkyDome';
import { sampleSite } from '@/lib/analysis';
import { SITES } from '@/lib/sites';

const STEPS = [
  { title: 'Choose where to explore', description: 'Open the planner and rotate the Moon. Select existing candidate sites to compare them, or click an unmarked point to preview a custom location. Custom points use an explicitly declared flat horizon.', icon: Globe2, kicker: 'SURFACE EXPLORATION' },
  { title: 'Set the mission conditions', description: 'Choose a landing date and mission duration. Then set the ranking priority: power favors sunlight, Earth link favors direct visibility, and Balanced weighs both together.', icon: Compass, kicker: 'MISSION DESIGN' },
  { title: 'Read the sky and timing', description: 'The Sun is amber and Earth is blue. The horizon profile shows what terrain blocks. Scrub or play the timeline to see when each body rises above or drops below that edge.', icon: Sun, kicker: 'WINDOW ANALYSIS' },
  { title: 'Compare, inspect, and share', description: 'Review the ranked site metrics, longest darkness and Earth-link gaps, detailed intervals, and optional NASA cross-check. Export summary or sampled timeseries data when you need to take the analysis further.', icon: Radio, kicker: 'RESULTS & DATA' },
];

export function QuickStartTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    try { setOpen(localStorage.getItem('lunar-tour-dismissed') !== 'yes'); }
    catch { setOpen(true); }
  }, []);

  const site = SITES[0];
  const demo = site ? sampleSite(site, Date.UTC(2026, 10, 7), 29.53, 60) : null;
  const current = STEPS[step] ?? STEPS[0];
  if (!current) return null;
  const StepIcon = current.icon;

  return <>
    <Button variant="ghost" size="sm" onClick={() => { setStep(0); setOpen(true); }}><Compass />Quick start</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-white/10 bg-[#10141b] p-0 shadow-2xl sm:max-w-xl">
        <div className="tour-heading px-6 pb-5 pt-6 sm:px-8 sm:pt-8">
          <DialogHeader>
            <div className="flex items-center justify-between"><span className="label-caps text-primary">Mission planner <span className="mx-1 text-white/30">/</span> 4-step tour</span><span className="font-mono text-[10px] text-white/45">{String(step + 1).padStart(2, '0')} / {STEPS.length}</span></div>
            <div className="mt-5 flex items-center gap-3"><span className="tour-step-icon"><StepIcon className="size-5" /></span><div><p className="label-caps text-white/45">{current.kicker}</p><DialogTitle className="mt-1 text-xl">{current.title}</DialogTitle></div></div>
            <DialogDescription className="pt-3 leading-relaxed">{current.description}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>{STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-white/10'}`} />)}</div>
        </div>
        {step === 2 && demo && <div className="mx-6 mb-5 rounded-xl border border-white/10 bg-black/20 p-4 sm:mx-8"><div className="mx-auto w-full max-w-[220px]"><SkyDome analysis={demo} index={index} /><input className="mt-3 w-full accent-primary" aria-label="Tour demo time" type="range" min={0} max={60} value={index} onChange={e => setIndex(Number(e.target.value))} /></div><p className="text-center text-[10px] text-muted-foreground">Try scrubbing the sample time to see the sky view change.</p></div>}
        {step === 3 && demo && <div className="mx-6 mb-5 grid grid-cols-2 gap-2 sm:mx-8"><MiniMetric tone="sun" label="Sunlight" note="Visibility estimate" value={`${Math.round(demo.illumination * 100)}%`} /><MiniMetric tone="earth" label="Earth in view" note="Direct line-of-sight" value={`${Math.round(demo.earthVisibility * 100)}%`} /></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4 sm:px-8">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { try { localStorage.setItem('lunar-tour-dismissed', 'yes'); } catch { /* Tour remains available without browser storage. */ } setOpen(false); }}>Dismiss tour</Button>
          <div className="flex gap-2">{step > 0 && <Button variant="outline" size="icon" aria-label="Previous tour step" onClick={() => setStep(s => s - 1)}><ArrowLeft /></Button>}{step < STEPS.length - 1 ? <Button onClick={() => setStep(s => s + 1)}>Continue <ArrowRight /></Button> : <Button asChild onClick={() => setOpen(false)}><Link to="/planner">Start exploring <ArrowRight /></Link></Button>}</div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}

function MiniMetric({ tone, label, note, value }: { tone: 'sun' | 'earth'; label: string; note: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className={`label-caps ${tone === 'sun' ? 'text-sun' : 'text-earth'}`}>{label}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p><p className="mt-3 font-mono text-lg text-white/80">{value}</p></div>;
}
