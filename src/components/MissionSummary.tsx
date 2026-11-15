import { Sparkles } from 'lucide-react';
import type { SiteAnalysis } from '@/lib/analysis';
import { missionSummary } from '@/lib/recommendation';

export function MissionSummary({ analysis, alternatives }: { analysis: SiteAnalysis; alternatives: SiteAnalysis[] }) {
  return <section aria-label="Mission recommendation" className="mb-6 border-y border-hairline bg-primary/5 px-4 py-4"><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" />Mission recommendation summary</h2><p className="text-sm leading-relaxed">{missionSummary(analysis, alternatives)}</p><p className="mt-2 text-xs text-muted-foreground">Screening estimate · illustrative terrain · not a flight recommendation</p></section>;
}