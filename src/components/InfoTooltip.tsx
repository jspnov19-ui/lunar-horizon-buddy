import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const definitions: Record<string, string> = {
  "Sky Dome":
    "A top-down view of the sky above the landing site. The center is overhead; the edge is the horizon.",
  "Terrain Mask": "The shaded ring shows where nearby terrain blocks a low Sun or Earth from view.",
  Occulted:
    "Temporarily hidden below the local terrain horizon, so a direct line of sight is unavailable.",
  Ephemeris:
    "A position forecast: where the Sun, Earth, or Moon is expected to be at a given time.",
  "12-sector terrain masks":
    "An illustrative horizon profile sampled in 12 compass directions, not a surveyed map.",
};

export function InfoTooltip({ term }: { term: keyof typeof definitions }) {
  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Explain ${term}`}
            className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HelpCircle className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed">
          <strong className="font-semibold text-primary">{term}:</strong> {definitions[term]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ExplainedTerm({
  term,
  className = "",
}: {
  term: keyof typeof definitions;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {term}
      <InfoTooltip term={term} />
    </span>
  );
}
