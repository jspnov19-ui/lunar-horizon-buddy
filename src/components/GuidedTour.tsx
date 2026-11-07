import { useEffect, useState } from "react";
import { ArrowRight, Check, Compass, SlidersHorizontal, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TOUR_KEY = "lunar-horizon-tour-dismissed";

const steps = [
  {
    icon: Compass,
    label: "Pick a site",
    text: "Choose a candidate landing site from the list on the left to focus the analysis.",
  },
  {
    icon: Sun,
    label: "Read the Sky Dome",
    text: "The dome shows whether the Sun and Earth are above the local horizon at this moment.",
  },
  {
    icon: SlidersHorizontal,
    label: "Scrub the lunar month",
    text: "Use the time slider to move through the lunar month and find the best operating windows.",
  },
];

export function GuidedTour() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(TOUR_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const close = () => {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(TOUR_KEY, "true");
      } catch {
        /* storage may be unavailable */
      }
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="max-w-xl border-primary/30 bg-card/95 shadow-[var(--shadow-panel)] backdrop-blur-xl">
        <DialogHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Compass />
          </div>
          <DialogTitle className="font-display text-2xl">Quick start · 30-second tour</DialogTitle>
          <DialogDescription className="max-w-md leading-relaxed">
            Three moves are all it takes to read a lunar landing window.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          {steps.map(({ icon: Icon, label, text }, index) => (
            <div
              key={label}
              className="flex gap-4 rounded-lg border border-hairline bg-background/50 p-4"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/40 font-mono text-xs text-primary">
                0{index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4 text-primary" />
                  {label}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="accent-primary"
            />
            Don&apos;t show again
          </label>
          <Button onClick={close}>
            Start exploring <ArrowRight data-icon="inline-end" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
