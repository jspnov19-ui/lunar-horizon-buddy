import { createFileRoute, Link } from "@tanstack/react-router";

import heroImage from "@/assets/lunar-south-pole.jpg";
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
  component: LandingPage;
});

const HIGHLIGHTS = [
  {
    k: "Sites modelled",
    v: String(SITES.length),
    d: "Candidate CLPS and Artemis-class regions within 6° of the pole.",
  },
  {
    k: "Time resolution",
    v: "720 steps",
    d: "A full lunation sampled at roughly one-hour cadence, scrubbable.",
  },
  {
    k: "Horizon sectors",
    v: "12",
    d: "Terrain masks applied per azimuth sector for rise and set tests.",
  },
];

const FEATURES = [
  {
    title: "Sky dome",
    body: "Sun and Earth tracks projected onto the local sky with the terrain silhouette drawn in, so shadow episodes are visible at a glance.",
  },
  {
    title: "Elevation profile",
    body: "Altitude of both bodies against the horizon mask through the selected span, with the scrub cursor tied to every other view.",
  },
  {
    title: "Window timeline",
    body: "Sunlit and Earth-visible intervals as banded strips, ready for comparing two sites side by side.",
  },
];

function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-hairline">
        <img
          src={heroImage}
          alt="Lunar south pole terrain under low grazing sunlight"
          className="absolute inset-0 size-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-24 md:px-6 md:py-32">
          <div className="max-w-2xl">
            <p className="label-caps text-primary">Mission planning console</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Where the sun stays up and{" "}
              <span className="text-accent">Earth stays in view</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              An interactive model of Sun and Earth geometry at the lunar south
              pole. Pick a landing site and a date, scrub a lunation, and read
              off solar uptime, shadow episodes and direct-to-Earth link windows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/models"
                className="glow-primary rounded-md bg-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open the model
              </Link>
              <Link
                to="/methods"
                className="rounded-md border border-input px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-secondary"
              >
                Data &amp; methods
              </Link>
            </div>
          </div>

          <dl className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.k} className="glass-panel border-0 p-5">
                <dt className="label-caps text-muted-foreground">{h.k}</dt>
                <dd className="mt-2 font-mono text-3xl font-semibold text-foreground">
                  {h.v}
                </dd>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {h.d}
                </p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="grid-texture mx-auto max-w-6xl px-4 py-20 md:px-6">
        <h2 className="text-2xl font-bold md:text-3xl">What the model shows</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="glass-panel rounded-lg p-6 transition-colors hover:border-primary/40"
            >
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold md:text-3xl">Candidate sites</h2>
            <Link
              to="/models"
              className="font-mono text-xs uppercase tracking-widest text-primary hover:text-accent"
            >
              Compare all →
            </Link>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SITES.map((s) => (
              <li
                key={s.id}
                className="glass-panel rounded-lg p-4 transition-colors hover:border-primary/40"
              >
                <p className="label-caps text-primary">{s.region}</p>
                <p className="mt-2 text-sm font-semibold leading-snug">{s.name}</p>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {Math.abs(s.lat).toFixed(2)}°S ·{" "}
                  {Math.abs(s.lon).toFixed(2)}°{s.lon < 0 ? "W" : "E"} ·{" "}
                  {s.elevation.toLocaleString()} m
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
