import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkyDome } from "@/components/SkyDome";
import { sampleSite } from "@/lib/analysis";
import { SITES } from "@/lib/sites";

const STEPS = [
  [
    "Pick your site and dates",
    "In Planner, choose landing sites on the left, a landing date and a duration. Power, Balanced or Earth link changes what ranks first.",
  ],
  [
    "Read the sky above the horizon",
    "Amber is the Sun; cyan is Earth. The shaded edge is terrain. A body must clear that edge to be visible. Try moving the demo time below.",
  ],
  [
    "Find windows, then verify",
    "Move the mission timeline to inspect shadow and contact windows, then export CSV or JSON. Explore real lunar data opens QuickMap, Moon Trek and site-specific Horizons queries.",
  ],
];
export function QuickStartTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [index, setIndex] = useState(0);
  const site = SITES[0];
  const demo = site ? sampleSite(site, Date.UTC(2026, 10, 7), 29.53, 60) : null;
  const current = STEPS[step];
  if (!current) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
      >
        <Compass />
        Quick start
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
          <DialogHeader>
            <p className="mb-2 font-mono text-xs text-primary">30-SECOND TOUR · {step + 1} / 3</p>
            <DialogTitle>{current[0]}</DialogTitle>
            <DialogDescription className="pt-3 leading-relaxed">{current[1]}</DialogDescription>
          </DialogHeader>
          {step === 1 && demo && (
            <div className="mx-auto w-full max-w-[240px]">
              <SkyDome analysis={demo} index={index} />
              <input
                className="mt-3 w-full accent-primary"
                aria-label="Tour demo time"
                type="range"
                min={0}
                max={60}
                value={index}
                onChange={(e) => setIndex(Number(e.target.value))}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-hairline pt-4">
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous tour step"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ArrowLeft />
                </Button>
              )}
              {step < 2 ? (
                <Button onClick={() => setStep((s) => s + 1)}>
                  Next <ArrowRight />
                </Button>
              ) : (
                <Button asChild onClick={() => setOpen(false)}>
                  <Link to="/planner">
                    Open planner <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
