import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { SkyDome } from "@/components/SkyDome";
import { SITES } from "@/lib/sites";
import { formatDuration, formatUTC, sampleSite } from "@/lib/analysis";
import { LunarTools } from '@/components/LunarTools';

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Lunar South Pole Analysis" },
      {
        name: "description",
        content:
          "A plain-language explanation of lunar south pole site planning: why sunlight and Earth visibility matter, how the local terrain horizon blocks both, and a live demo you can drag through time.",
      },
      { property: "og:title", content: "How it works — Lunar South Pole Analysis" },
      {
        property: "og:description",
        content:
          "Why sunlight and Earth visibility decide a landing site, explained simply, with a live demo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorksPage,
});

const DEMO_STEPS = 360;

const IDEAS = [
  {
    title: "Sunlight is electricity",
    body: "There is no grid on the Moon. A lander runs on solar panels, so every hour the Sun is below the local horizon is an hour spent draining batteries. A site that stays lit most of the month needs far less battery mass than one that goes dark for a week.",
  },
  {
    title: "Seeing Earth is the radio link",
    body: "A direct-to-Earth antenna needs Earth physically above the horizon. Near the south pole, Earth sits very low in the sky and barely moves, so a single ridge in the wrong direction can block contact for days at a time.",
  },
  {
    title: "The horizon is not flat",
    body: "At the pole the Sun and Earth skim along the horizon rather than rising overhead. That means nearby hills and crater rims matter enormously — a few degrees of terrain decides whether a site is lit or in shadow.",
  },
];

function HowItWorksPage() {
  const [siteId, setSiteId] = useState(SITES[0]!.id);
  const [index, setIndex] = useState(0);

  const startMs = useMemo(() => Date.parse("2026-03-01T00:00:00Z"), []);
  const demo = useMemo(
    () => sampleSite(SITES.find((s) => s.id === siteId)!, startMs, 29.53, DEMO_STEPS),
    [siteId, startMs],
  );
  const cur = demo.samples[index];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <header>
        <p className="label-caps text-primary">How it works</p>
        <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">
          Two questions decide a landing site
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
          Can the lander make power, and can it talk to Earth? Everything on
          this site is an answer to those two questions for a specific place and
          a specific set of dates.
        </p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {IDEAS.map((i) => (
          <article key={i.title} className="glass-panel rounded-lg p-5">
            <h2 className="text-base font-semibold">{i.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {i.body}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-12 border-t border-hairline pt-10">
        <h2 className="text-2xl font-bold">Try it</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          This is one month at a real candidate site. The circle is the sky seen
          from the ground: the dome rises from the local horizon toward straight
          overhead, and the gold horizon ring marks the surrounding terrain.
          Drag the slider and watch the Sun and Earth move across the 3D sky.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {SITES.slice(0, 4).map((s) => (
            <button
              key={s.id}
              onClick={() => setSiteId(s.id)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                siteId === s.id
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-hairline text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="glass-panel rounded-lg p-4">
            <SkyDome analysis={demo} index={index} />
          </div>
          <div className="glass-panel flex flex-col justify-between rounded-lg p-5">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                {formatUTC(cur?.t ?? startMs)} UTC
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <StatusLine
                  ok={!!cur?.sunUp}
                  okText="The Sun is up — the panels are making power."
                  badText="The Sun is behind terrain — running on batteries."
                  tone="sun"
                />
                <StatusLine
                  ok={!!cur?.earthUp}
                  okText="Earth is above the horizon — the radio link is open."
                  badText="Earth is hidden — no direct link right now."
                  tone="earth"
                />
              </div>
            </div>
            <div className="mt-6">
              <input
                type="range"
                min={0}
                max={DEMO_STEPS - 1}
                value={index}
                onChange={(e) => setIndex(Number(e.target.value))}
                className="h-1 w-full accent-primary"
                aria-label="Move through the demo month"
              />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Across this month {demo.site.name} is lit{" "}
                <span className="text-sun">
                  {(demo.illumination * 100).toFixed(0)}%
                </span>{" "}
                of the time, with a longest dark stretch of{" "}
                {formatDuration(demo.longestDarkHours)}, and Earth is in view{" "}
                <span className="text-earth">
                  {(demo.earthVisibility * 100).toFixed(0)}%
                </span>{" "}
                of the time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12 border-t border-hairline pt-10">
        <h2 className="text-2xl font-bold">From screening to real lunar data</h2>
        <p className="mb-5 mt-3 text-sm leading-relaxed text-muted-foreground">Start with a comparison here, inspect the landscape in ASU’s LROC QuickMap and NASA Moon Trek, then check Sun and Earth positions in JPL Horizons. These external tools do not replace the illustrative terrain or approximate positions in this app automatically. A terrain map alone is not a surveyed horizon profile.</p>
        <LunarTools site={demo.site} startMs={startMs} days={29.53} />
      </section>
      <section className="mt-12 border-t border-hairline pt-10">
        <h2 className="text-2xl font-bold">What the planner does with this</h2>
        <ol className="mt-5 flex flex-col gap-4">
          {[
            "It works out where the Sun and Earth sit in the sky, step by step, across the dates you choose.",
            "For each step it checks whether the terrain at that site blocks the view — a lit hour only counts if nothing is in the way.",
            "It adds up the lit hours and the linked hours, finds the worst dark stretch and the worst comms gap, and ranks the sites by what you said matters most.",
            "You can export the comparison table, the full hour-by-hour series, or the list of usable windows for your own analysis.",
          ].map((t, i) => (
            <li key={i} className="flex gap-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-primary/50 font-mono text-xs text-primary">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{t}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/planner"
            className="glow-primary rounded-md bg-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open the planner
          </Link>
          <Link
            to="/methods"
            className="rounded-md border border-input px-5 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors hover:bg-secondary"
          >
            The technical detail
          </Link>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          One caveat worth knowing: the terrain profiles here are illustrative
          rather than surveyed, so treat the results as planning-grade
          comparisons between sites, not as flight data.
        </p>
      </section>
    </main>
  );
}

function StatusLine({
  ok,
  okText,
  badText,
  tone,
}: {
  ok: boolean;
  okText: string;
  badText: string;
  tone: "sun" | "earth";
}) {
  const color = tone === "sun" ? "bg-sun" : "bg-earth";
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
          ok ? color : "bg-muted"
        }`}
      />
      <p
        className={`text-sm leading-relaxed ${
          ok ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {ok ? okText : badText}
      </p>
    </div>
  );
}
