import { createFileRoute, Link } from "@tanstack/react-router";

import { SITES } from "@/lib/sites";

export const Route = createFileRoute("/methods")({
  head: () => ({
    meta: [
      { title: "Data & Methods — Lunar South Pole Analysis" },
      {
        name: "description",
        content:
          "How the lunar south pole illumination model works: truncated Meeus solar and lunar series, optical libration, selenographic horizon masks, accuracy limits and a glossary of mission terms.",
      },
      { property: "og:title", content: "Data & Methods — Lunar South Pole Analysis" },
      {
        property: "og:description",
        content:
          "Ephemeris series, libration transform, horizon masking, accuracy limits and terminology behind the south-polar landing site model.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MethodsPage,
});

const PIPELINE = [
  {
    step: "01",
    title: "Solar & lunar position",
    body: "Truncated Meeus series give the geocentric ecliptic position of the Sun and the Moon at the requested instant, including the dominant evection, variation and annual-equation terms of the lunar longitude.",
  },
  {
    step: "02",
    title: "Vector to selenographic frame",
    body: "The geocentric vectors are re-referenced to the Moon's centre, then rotated into selenographic longitude and latitude using the optical-libration transform with the lunar equator inclined 1.54242° to the ecliptic.",
  },
  {
    step: "03",
    title: "Local altitude & azimuth",
    body: "For a site at a given selenographic latitude and longitude, the sub-Sun and sub-Earth points are converted to a local altitude and an azimuth measured east of selenographic north.",
  },
  {
    step: "04",
    title: "Horizon masking",
    body: "A 12-sector terrain elevation profile is interpolated at the body's azimuth. A body counts as visible when its centre altitude plus its apparent angular radius clears that local terrain elevation.",
  },
  {
    step: "05",
    title: "Window statistics",
    body: "The window is sampled at 720 steps. Contiguous runs of sunlit and Earth-visible samples become intervals, from which solar uptime, Earth-in-view fraction, longest darkness and longest comms gap are derived.",
  },
];

const GLOSSARY = [
  [
    "Selenographic coordinates",
    "Latitude and longitude on the Moon, with 0° longitude facing Earth on average.",
  ],
  [
    "Optical libration",
    "The apparent monthly rocking of the Moon that shifts which face and pole geometry we see.",
  ],
  [
    "Horizon mask",
    "The elevation of surrounding terrain as a function of azimuth — what actually blocks the Sun or Earth at a polar site.",
  ],
  [
    "Solar uptime",
    "The fraction of the analysed window in which the Sun's disc clears the terrain horizon, a proxy for photovoltaic power availability.",
  ],
  [
    "DTE link",
    "Direct-to-Earth communication. Available only while Earth is above the local terrain horizon; otherwise a relay is required.",
  ],
  [
    "PSR",
    "Permanently shadowed region — a floor or pocket that never receives direct sunlight, where water ice can be cold-trapped.",
  ],
  [
    "Lunation",
    "One synodic month, about 29.53 days — the natural period for polar illumination cycles.",
  ],
];

const RESOURCES = [
  {
    name: "LROC QuickMap",
    provider: "Arizona State University · Lunar Reconnaissance Orbiter",
    description:
      "Explore lunar imagery, elevation products, and the terrain surrounding candidate landing regions.",
    href: "https://quickmap.lroc.asu.edu/",
  },
  {
    name: "NASA Moon Trek",
    provider: "NASA",
    description:
      "View lunar terrain in 3D and explore mission data layers for spatial context around a site.",
    href: "https://trek.nasa.gov/moon/",
  },
  {
    name: "JPL Horizons",
    provider: "NASA Jet Propulsion Laboratory",
    description:
      "Generate precise ephemerides for Sun and Earth positions; this app can create site- and date-specific queries.",
    href: "https://ssd.jpl.nasa.gov/horizons/",
  },
  {
    name: "Moon exploration",
    provider: "Canadian Space Agency",
    description:
      "Learn about Canada’s lunar exploration programs, technology contributions, and international partnerships.",
    href: "https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/",
  },
];

const LIMITS = [
  {
    title: "Directional accuracy",
    body: "Truncated series give body directions good to a few arcminutes. That is far finer than the uncertainty in any terrain profile used here.",
  },
  {
    title: "Illustrative terrain",
    body: "The 12-sector horizon profiles are representative of each region's character, not surveyed LOLA topography. Absolute uptime percentages will shift with real elevation models.",
  },
  {
    title: "No refraction or scattering",
    body: "The Moon has no appreciable atmosphere, so no refraction correction is applied. Scattered light in shadowed terrain is not modelled.",
  },
  {
    title: "Planning grade",
    body: "Use these numbers to rank and screen sites and to size power and comms margins — never for navigation, landing guidance or flight-critical timing.",
  },
];

function MethodsPage() {
  return (
    <div className="grid-texture min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
        <span className="label-caps text-primary">Data &amp; Methods</span>
        <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-5xl">
          How the model computes
          <span className="text-primary"> light and link</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Every number in this tool comes from geometry computed in the browser — no precomputed
          tables, no server round trip. This page documents the chain from ephemeris to mission
          statistic, and is explicit about where the model&apos;s confidence ends.
        </p>
        <aside className="mt-6 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <h2 className="text-sm font-semibold">In brief</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The planner estimates when sunlight and Earth are visible above a representative local
            horizon, then summarizes the sampled windows. The orbital geometry is approximate and
            the terrain profiles are illustrative—not surveyed—so use results to compare ideas, not
            to certify a landing or communications link.
          </p>
          <Link
            to="/planner"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Compare candidate sites{" "}
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </Link>
        </aside>

        {/* Pipeline */}
        <section className="mt-12">
          <h2 className="label-caps text-primary">Computation pipeline</h2>
          <ol className="mt-5 flex flex-col gap-3">
            {PIPELINE.map((p) => (
              <li
                key={p.step}
                className="glass-panel flex flex-col gap-3 rounded-xl p-5 transition-colors hover:border-input sm:flex-row sm:gap-6"
              >
                <span className="font-mono text-sm font-bold text-primary sm:pt-1">{p.step}</span>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Site table */}
        <section className="mt-14">
          <h2 className="label-caps text-primary">Site register</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Coordinates are representative of each region's centre, drawn from published CLPS and
            Artemis site studies.
          </p>
          <div className="glass-panel mt-5 overflow-x-auto rounded-xl">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Site", "Region", "Latitude", "Longitude", "Elevation"].map((h) => (
                    <th key={h} className="label-caps px-4 py-3 text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SITES.map((s) => (
                  <tr key={s.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3 text-xs font-semibold text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.region}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {Math.abs(s.lat).toFixed(2)}°S
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {Math.abs(s.lon).toFixed(2)}°{s.lon < 0 ? "W" : "E"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-earth">
                      {s.elevation.toLocaleString()} m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Limits */}
        <section className="mt-14">
          <h2 className="label-caps text-primary">Accuracy &amp; limitations</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {LIMITS.map((l) => (
              <div key={l.title} className="glass-panel rounded-xl p-5">
                <h3 className="font-display text-sm font-semibold text-foreground">{l.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{l.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="data-resources-heading">
          <h2 id="data-resources-heading" className="label-caps text-primary">
            Data &amp; agency resources
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Use these primary sources to investigate surface context, inspect agency programs, and
            validate mission geometry beyond this screening model.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {RESOURCES.map((resource) => (
              <li key={resource.name}>
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-panel group flex h-full flex-col rounded-xl p-5 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="label-caps text-muted-foreground">{resource.provider}</span>
                  <span className="mt-2 font-display text-base font-semibold text-foreground group-hover:text-primary">
                    {resource.name}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </span>
                  <span className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {resource.description}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Glossary */}
        <section className="mt-14">
          <h2 className="label-caps text-primary">Glossary</h2>
          <dl className="glass-panel mt-5 rounded-xl p-5">
            {GLOSSARY.map(([term, def]) => (
              <div
                key={term}
                className="grid gap-1 border-b border-hairline py-3 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[200px_1fr] sm:gap-6"
              >
                <dt className="font-display text-sm font-semibold text-foreground">{term}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{def}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-14 flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-input bg-primary/5 p-6">
          <p className="flex-1 text-sm text-muted-foreground">
            Ready to work the geometry yourself? Open the interactive model and scrub a full
            lunation.
          </p>
          <Link
            to="/models"
            className="glow-primary rounded-lg bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open models
          </Link>
        </div>
      </div>
    </div>
  );
}
