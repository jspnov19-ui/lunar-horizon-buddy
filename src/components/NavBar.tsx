import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/planner", label: "Planner" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/models", label: "Models" },
  { to: "/methods", label: "Methods" },
] as const;

function useUtcClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setNow(
        `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(
          d.getUTCHours(),
        )}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`,
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function NavBar() {
  const clock = useUtcClock();

  return (
    <header className="sticky top-0 z-50 flex h-16 flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <Link to="/" className="flex items-center gap-3">
        <span className="glow-primary grid size-8 place-items-center rounded-sm bg-primary">
          <span className="size-3.5 rotate-45 border-2 border-primary-foreground" />
        </span>
        <span className="font-display text-base font-bold uppercase tracking-tight text-foreground md:text-lg">
          Lunar <span className="text-primary">South Pole</span> Analysis
        </span>
      </Link>

      <nav className="order-3 flex gap-1 rounded-lg border border-hairline bg-shadow p-1 md:order-none md:mx-auto">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: l.to === "/" }}
            className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-all hover:text-foreground md:text-sm"
            activeProps={{
              className:
                "glow-primary bg-primary text-primary-foreground hover:text-primary-foreground",
            }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto hidden items-center gap-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground lg:flex">
        <span>UTC {clock ?? "--.--.-- --:--:--"}</span>
        <span className="flex items-center gap-2 text-primary">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Ephemeris nominal
        </span>
      </div>
    </header>
  );
}
