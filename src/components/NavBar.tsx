import { Link } from "@tanstack/react-router";
import { ChevronDown, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickStartTour } from "@/components/QuickStartTour";

const MAIN = [
  { to: "/", label: "Overview" },
  { to: "/planner", label: "Planner" },
] as const;
const LEARN = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/models", label: "Models" },
  { to: "/methods", label: "Methods" },
] as const;

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <Moon className="size-6 text-primary" />
          <span className="font-display text-base font-semibold">
            Lunar South Pole
            <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
              / Analysis
            </span>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex w-full flex-wrap items-center gap-1 sm:w-auto"
        >
          {MAIN.map((l) => (
            <Button key={l.to} variant="ghost" size="sm" asChild className="px-2 md:px-3">
              <Link
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="text-muted-foreground"
                activeProps={{ className: "bg-secondary text-primary" }}
              >
                {l.label}
              </Link>
            </Button>
          ))}
          <details className="relative">
            <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-secondary md:px-3">
              Learn
              <ChevronDown className="size-3.5" />
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-44 rounded-md border border-hairline bg-background p-1 shadow-lg">
              {LEARN.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block rounded px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
                  activeProps={{ className: "bg-secondary text-primary" }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </details>
          <QuickStartTour />
        </nav>
      </div>
    </header>
  );
}
