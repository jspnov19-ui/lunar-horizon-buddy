import { Sparkles } from 'lucide-react';
import type { SiteAnalysis } from '@/lib/analysis';
import { missionSummary } from '@/lib/recommendation';

export function MissionSummary({ analysis, alternatives }: { analysis: SiteAnalysis; alternatives: SiteAnalysis[] }) {
  const horizon = analysis.horizonSource === 'lola-dem' ? 'NASA LOLA-derived local horizon' : analysis.horizonSource === 'custom' ? 'user-declared horizon' : 'illustrative horizon';
  return <section aria-label="Mission recommendation" className="mission-recommendation mb-6"><div className="mission-recommendation-mark"><Sparkles className="size-4"/><span>MISSION<br/>READOUT</span></div><div className="min-w-0"><h2 className="text-sm font-semibold">Mission recommendation</h2><p className="mt-2 text-sm leading-relaxed text-white/85">{missionSummary(analysis, alternatives)}</p><p className="mt-3 label-caps text-white/40">Screening estimate · {horizon} · not flight guidance</p></div></section>;
}
