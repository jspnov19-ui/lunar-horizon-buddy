import { createFileRoute, Link } from "@tanstack/react-router";

import heroImage from "@/assets/lunar-south-pole.jpg";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { SITES } from "@/lib/sites";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lunar South Pole Analysis — Landing Site Illumination & Comms" },
      {
        name: "description",
        content:
          "Compare candidate lunar south pole landing sites by solar uptime, longest dark period and direct-to-Earth link availability, modelled across a full lunation.",
      },
      {
        property: "og:title",
        content: "Lunar South Pole Analysis — Landing Site Illumination & Comms",
      },
      {
        property: "og:description",
        content:
          "Solar uptime, shadow episodes and Earth link windows for eight candidate south-polar landing sites.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-hairline">
        <img
          src={heroImage}
          alt="Illustrated lunar south pole terrain in grazing sunlight"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-background/65" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
          <p className="label-caps text-primary">Site selection / power / communications</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
            Lunar landing
            <br />
            mission planning
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-foreground/85">
            A clearer view of the south pole. Compare landing locations and mission dates against
            the light and link windows that matter.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/planner">
                Open planner <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
          <p className="mt-10 font-mono text-xs text-foreground/75">
            {SITES.length} candidate regions · Custom coordinates · Alternate dates · CSV & JSON
            exports
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-caps text-primary">The decision workspace</p>
            <h2 className="mt-3 text-2xl font-semibold">One mission. Multiple possibilities.</h2>
          </div>
          <Button asChild variant="link">
            <Link to="/planner">
              Evaluate landing options <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-8 border-y border-hairline py-7 md:grid-cols-3">
          {[
            [
              "01",
              "Compare locations",
              "Curated south-polar regions or your own coordinates, ranked by solar and Earth visibility.",
            ],
            [
              "02",
              "Explore a schedule change",
              "Evaluate two landing dates at the same location with synchronized sky views and timelines.",
            ],
            [
              "03",
              "Inspect the operational windows",
              "Review shadow periods, Earth-link gaps, and sampled rise and set times. Export the full picture.",
            ],
          ].map(([n, title, text]) => (
            <article key={n}>
              <p className="font-mono text-xs text-primary">{n}</p>
              <h3 className="mt-3 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-between gap-5">
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Preliminary screening, not flight design. Ephemeris is approximate and terrain masks are
            illustrative. Sun visibility does not establish electrical output; Earth visibility does
            not establish a complete radio link.
          </p>
          <Button asChild variant="outline">
            <Link to="/models">
              Advanced models <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
