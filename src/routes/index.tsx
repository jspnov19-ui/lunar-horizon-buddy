import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Globe2, Radio, Sun } from "lucide-react";
import heroImage from "@/assets/lunar-south-pole.jpg";
import { Button } from "@/components/ui/button";
import { SITES } from "@/lib/sites";
import { LolaTerrain } from "@/components/LolaTerrain";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lunar South Pole | Mission planning in the lunar light" },
      { name: "description", content: "Explore lunar south-pole landing sites and compare sunlight and Earth-contact windows across mission dates." },
      { property: "og:title", content: "Lunar South Pole | Mission planning in the lunar light" },
      { property: "og:description", content: "Explore lunar south-pole landing sites and compare sunlight and Earth-contact windows across mission dates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return <main className="landing-page">
    <section className="landing-hero relative isolate min-h-[620px] overflow-hidden border-b border-white/10 md:min-h-[690px]">
      <img src={heroImage} alt="Lunar south-pole ridges illuminated by low sunlight" className="absolute inset-0 -z-20 size-full object-cover object-center" />
      <LolaTerrain siteId="de-gerlache-rim" siteName="de Gerlache Rim 2" className="absolute inset-0 z-[-1] rounded-none border-0 [&_[data-terrain-canvas]]:!h-full" />
      <div className="landing-hero-shade absolute inset-0 -z-10" />
      <div className="landing-stars absolute inset-0 -z-10" aria-hidden="true" />
      <div className="pointer-events-none absolute left-[58%] top-[23%] z-0 hidden md:block" aria-hidden="true"><span className="block size-9 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff4cf,#ffc66d_52%,#d78038)] shadow-[0_0_34px_12px_rgb(255_190_98_/_24%)]"/><span className="absolute left-12 top-2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[.2em] text-sun/80">Sun · low on horizon</span></div>
      <div className="pointer-events-none absolute right-[36%] top-[34%] z-0 hidden md:block" aria-hidden="true"><span className="block size-5 rounded-full bg-[radial-gradient(circle_at_32%_30%,#e8f5ff,#75bce9_48%,#28558d)] shadow-[0_0_24px_8px_rgb(104_180_246_/_22%)]"/><span className="absolute left-8 top-1 whitespace-nowrap font-mono text-[9px] uppercase tracking-[.2em] text-earth/80">Earth · in the lunar sky</span></div>
      <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-10 px-4 py-16 md:min-h-[690px] md:grid-cols-[minmax(0,1fr)_330px] md:px-8 md:py-20">
        <div className="max-w-3xl">
          <p className="label-caps inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-white/85 backdrop-blur"><span className="size-1.5 rounded-full bg-sun shadow-[0_0_12px_var(--sun)]" />Lunar south pole <span className="text-white/40">/</span> Mission design</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl">Choose a place<br />in the <span className="landing-title-glow">lunar light.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/75 md:text-lg">Compare eight study locations near the lunar south pole. Explore their NASA LOLA terrain previews, then estimate when the Sun and Earth clear each site’s assumed horizon during your selected mission dates.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" className="h-12 rounded-full px-6"><Link to="/planner">Explore the planner <ArrowRight /></Link></Button><Button asChild variant="outline" size="lg" className="h-12 rounded-full border-white/25 bg-black/20 px-6 text-white hover:bg-white/10 hover:text-white"><Link to="/how-it-works">How it works</Link></Button></div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/65"><span>{SITES.length} built-in study locations</span><span>Custom coordinate plotting</span><span>Mission-window comparison</span></div>
        </div>
        <aside className="mission-glance hidden rounded-2xl border border-white/15 p-5 text-white backdrop-blur-xl md:block">
          <div className="mb-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-3"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-sun shadow-[0_0_14px_var(--sun)]"/><span className="text-[10px] uppercase tracking-widest text-sun">Sun</span></div><span className="text-white/25">·</span><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-earth shadow-[0_0_14px_var(--earth)]"/><span className="text-[10px] uppercase tracking-widest text-earth">Earth</span></div></div>
          <p className="label-caps text-white/55">Mission signals</p>
          <h2 className="mt-2 text-lg font-semibold">Plan around what matters.</h2>
          <div className="mt-5 space-y-4">
            <Signal icon={<Sun className="size-4" />} tone="sun" title="Sun visibility" text="Estimate when the Sun clears the selected horizon mask." />
            <Signal icon={<Globe2 className="size-4" />} tone="earth" title="Earth visibility" text="Estimate geometric line of sight from each surface site." />
            <Signal icon={<Radio className="size-4" />} tone="neutral" title="Mission windows" text="Compare sampled visibility across dates and durations." />
          </div>
          <div className="mt-5 border-t border-white/10 pt-4 font-mono text-[10px] text-white/45">PRELIMINARY SCREENING <span className="float-right">SOUTH POLE</span></div>
        </aside>
        <a href="#workspace" className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/55 transition hover:text-white"><ArrowDown className="size-3.5" /> Explore the mission workspace</a>
      </div>
    </section>

    <section id="workspace" className="landing-content mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="label-caps text-primary">Compare locations and dates</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight md:text-4xl">Eight south-polar study sites</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Inspect candidate coordinates, compare estimated Sun and Earth visibility over mission windows, and review the assumptions behind each result.</p></div><Button asChild variant="link" className="group"><Link to="/planner">Enter mission planner <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link></Button></div>
      <div className="mt-9 grid gap-4 md:grid-cols-3">
        <FeatureCard number="01" icon={<Globe2 className="size-5" />} title="Inspect sites" text="Rotate the lunar globe, select one of eight built-in study locations, or add custom coordinates. Built-in sites include NASA LOLA terrain previews." />
        <FeatureCard number="02" icon={<Sun className="size-5" />} title="Set a mission window" text="Choose a start date, duration, and ranking priority: estimated sunlight, Earth visibility, or a weighted balance." />
        <FeatureCard number="03" icon={<Radio className="size-5" />} title="Compare estimates" text="Review sampled visibility, longest dark and Earth-out-of-view intervals, and export the results for further analysis." />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="landing-data-strip grid gap-4 rounded-2xl border border-white/10 p-5 sm:grid-cols-3">
          <DataPoint label="Built-in study sites" value={`${SITES.length} locations`} detail="Plus user-defined coordinates" />
          <DataPoint label="Mission duration" value="7–365 days" detail="Available analysis-window options" />
          <DataPoint label="Export formats" value="CSV · JSON" detail="Comparison summaries and sampled data" />
        </div>
        <Button asChild variant="outline" className="h-auto rounded-2xl px-5 py-4"><Link to="/models" className="flex flex-col items-start gap-1"><span className="font-semibold">Explore the models <ArrowRight className="ml-1 inline size-4" /></span><span className="text-xs font-normal text-muted-foreground">See data sources and assumptions</span></Link></Button>
      </div>
      <section className="mt-12 border-t border-hairline pt-9" aria-labelledby="nasa-resources-title">
        <div className="max-w-2xl"><p className="label-caps text-primary">Continue with mission data</p><h2 id="nasa-resources-title" className="mt-2 text-2xl font-semibold">NASA tools for a closer look</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Use these independent resources to inspect terrain and check celestial positions for a selected lunar site.</p></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ResourceCard title="Lunar terrain maps" source="LROC QuickMap · ASU / LRO" text="Inspect lunar imagery and topography around a selected built-in study site inside the Lunar Data Lab." />
          <ResourceCard title="3D lunar exploration" source="NASA Moon Trek" text="Explore NASA’s interactive lunar map and available topographic layers from within the site." />
          <ResourceCard title="Ephemeris cross-check" source="JPL Horizons" text="Request Sun and Earth positions for a selected site, then compare them against the app’s predictions." />
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">These tools open separately and do not automatically update the planner. This app’s visibility estimates use an approximate ephemeris and illustrative horizon masks; NASA terrain layers are for inspection and are not currently used to calculate planner rankings.</p>
      </section>
      <p className="mt-7 max-w-4xl border-l-2 border-primary/40 pl-4 text-xs leading-relaxed text-muted-foreground">These are preliminary estimates, not flight-design results. Sun and Earth visibility calculations use an approximate ephemeris and illustrative horizon masks; the LOLA terrain previews are not currently used by those calculations. Visibility alone does not establish electrical output or a complete radio link.</p>
    </section>
  </main>;
}

function Signal({ icon, tone, title, text }: { icon: ReactNode; tone: string; title: string; text: string }) {
  return <div className="flex gap-3"><span className={`signal-icon signal-${tone}`}>{icon}</span><div><h3 className="text-sm font-medium">{title}</h3><p className="mt-1 text-xs leading-relaxed text-white/55">{text}</p></div></div>;
}
function FeatureCard({ number, icon, title, text }: { number: string; icon: ReactNode; title: string; text: string }) {
  return <article className="feature-card rounded-2xl border border-white/10 p-5 md:p-6"><div className="flex items-center justify-between"><span className="font-mono text-xs text-primary">{number}</span><span className="feature-icon">{icon}</span></div><h3 className="mt-6 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>;
}
function DataPoint({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div><p className="label-caps text-muted-foreground">{label}</p><p className="mt-2 font-mono text-sm text-foreground">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></div>;
}
function ResourceCard({ title, source, text }: { title: string; source: string; text: string }) {
  return <Link to="/data-lab" className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-primary/30 hover:bg-white/[0.04]"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-foreground">{title}</h3><p className="mt-1 text-[10px] uppercase tracking-wider text-primary/80">{source}</p></div><ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{text}</p><span className="mt-4 block text-[10px] font-medium text-primary">Open Lunar Data Lab →</span></Link>;
}
