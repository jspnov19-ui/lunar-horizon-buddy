import { CircleHelp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const TERMS: Record<string, string> = {
  Sunlight: 'Share of sampled times when the upper edge of the Sun clears the terrain. Actual power also depends on panel angle, efficiency and demand.',
  'Earth link': 'Share of sampled times when the upper edge of Earth clears the terrain. This is visibility, not a verified radio link.',
  'Longest dark': 'Longest continuous shadow period inside the selected dates. This helps estimate the time batteries must bridge.',
  'Link gap': 'Longest continuous time Earth is hidden inside the selected dates. Relays may provide another communication path.',
  'Solar illumination': 'Percentage of samples when the Sun clears the illustrative terrain horizon; not electrical output.',
  'Earth comms window': 'Percentage of samples with Earth visible; antenna performance and link margin are not modeled.',
  'Max dark period': 'Longest continuous shadow interval within this mission window.',
  'Max comms gap': 'Longest continuous interval without direct Earth visibility within this mission window.',
  'Peak sun EL': 'Highest Sun elevation: angle above the local horizontal plane, not above the terrain.',
  'Mean earth EL': 'Average Earth elevation above the local horizontal plane. Terrain may still block it.',
};
export function TermHelp({ term }: { term: string }) {
  const [open, setOpen] = useState(false);
  const explanation = TERMS[term];
  if (!explanation) return <>{term}</>;
  return <span className="inline-flex items-center gap-1">{term}<TooltipProvider><Tooltip open={open} onOpenChange={setOpen}><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label={`Explain ${term}`} onClick={() => setOpen(v => !v)}><CircleHelp className="size-3.5" /></Button></TooltipTrigger><TooltipContent className="max-w-[260px] whitespace-normal text-left leading-relaxed">{explanation}</TooltipContent></Tooltip></TooltipProvider></span>;
}