import { Link } from "@tanstack/react-router";
import { ChevronDown, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickStartTour } from "@/components/QuickStartTour";

const LEARN = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/models", label: "Interactive models" },
  { to: "/methods", label: "Data & methods" },
] as const;

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="Lunar South Pole Analysis home"
        >
          <Moon aria-hidden="true" className="size-6 shrink-0 text-primary" />
          <span className="truncate font-display text-sm font-semibold sm:text-base">
            Lunar South Pole
            <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
              / Mission analysis
            </span>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex w-full flex-wrap items-center gap-1 sm:w-auto"
        >
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-secondary text-primary" }}
            >
              Overview
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link
              to="/planner"
              activeProps={{ className: "bg-primary/90 text-primary-foreground" }}
            >
              Plan a mission
            </Link>
          </Button>
          <details className="group relative">
            <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              Learn &amp; explore
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-52 rounded-md border border-hairline bg-background p-1 shadow-lg">
              {LEARN.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block rounded px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  activeProps={{ className: "bg-secondary text-primary" }}
                >
                  {item.label}
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
