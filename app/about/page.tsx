import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Crosshair, Target, Play, Code2, MapPin, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";

export const metadata: Metadata = {
  title: "About",
  description:
    "How CalgaryGuessr works: gameplay, scoring, the communities, and the tech behind the game.",
};

const STEPS = [
  {
    icon: Eye,
    title: "Explore the panorama",
    body: "Each round drops you into a real Calgary Street View. Pan, zoom, and look for clues: signage, the +15 walkways, storefronts, and the skyline.",
  },
  {
    icon: Crosshair,
    title: "Drop your pin",
    body: "Click the interactive map where you think the photo was taken. Reposition as many times as you like before the timer runs out.",
  },
  {
    icon: Target,
    title: "Score by distance",
    body: "The closer your pin lands to the real spot, the more you score, up to 5,000 points per round.",
  },
  {
    icon: Flag,
    title: "Finish the run",
    body: "Play five rounds, then see your total and a per-round breakdown of how close you got.",
  },
] as const;

const SCORING = [
  { range: "Within 100 m", points: "5,000 pts", tone: "text-success" },
  { range: "A few blocks out", points: "About 4,500 pts", tone: "text-primary" },
  {
    range: "Right community",
    points: "About half marks",
    tone: "text-medal-gold",
  },
  {
    range: "Across the city",
    points: "Almost nothing",
    tone: "text-muted-foreground",
  },
] as const;

const TECH = [
  "Google Street View API",
  "Google Maps JavaScript API",
  "Next.js & React",
  "Firebase Firestore",
  "Tailwind CSS",
] as const;

const COMMUNITIES = [
  "Downtown Core",
  "Beltline",
  "Chinatown",
  "Eau Claire",
  "Kensington",
  "Sunnyside",
  "Crescent Heights",
  "East Village",
] as const;

export default function About() {
  return (
    <section className="container py-12 sm:py-16">
      <Reveal>
        <SectionHeading
          as="h1"
          eyebrow="About"
          title="How CalgaryGuessr works"
          description="A street-guessing game built around real Calgary Street View imagery. Read the city, drop your pin, and find out how well you really know the Stampede City."
        />
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-xl shadow-glow">
            <Link href="/game">
              <Play className="size-4" />
              Start playing
            </Link>
          </Button>
        </div>
      </Reveal>

      {/* Steps */}
      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <Reveal key={step.title} delay={index * 80}>
            <article className="surface-card flex h-full gap-4 rounded-2xl p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <step.icon className="size-5" />
              </span>
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <span className="font-mono-accent text-sm text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      {/* Scoring + tech */}
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <Reveal>
          <div className="surface-card h-full rounded-2xl p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              <h3 className="text-lg font-semibold">How scoring works</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Every round is scored purely on how close your guess is to the true
              location. The curve is tuned to Calgary&apos;s inner-city
              communities, so recognising the right one is worth about half
              marks.
            </p>
            <ul className="mt-5 divide-y divide-border/60">
              {SCORING.map((row) => (
                <li
                  key={row.range}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="text-muted-foreground">{row.range}</span>
                  <span className={`shrink-0 font-semibold ${row.tone}`}>
                    {row.points}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="surface-card h-full rounded-2xl p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <Code2 className="size-5 text-primary" />
              <h3 className="text-lg font-semibold">Built with</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              CalgaryGuessr stitches together a few technologies to keep
              gameplay fast and fair.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {TECH.map((item) => (
                <li key={item}>
                  <Badge variant="secondary" className="rounded-lg px-3 py-1.5">
                    {item}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      {/* Communities */}
      <Reveal>
        <div className="surface-card mt-12 overflow-hidden rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-calgary-red" />
            <h3 className="text-lg font-semibold">Where you&apos;ll explore</h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The game focuses on downtown Calgary and the communities around it,
            each with its own architecture, signage, and street life to read.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {COMMUNITIES.map((name) => (
              <li
                key={name}
                className="rounded-full border border-border/70 bg-card/60 px-4 py-2 text-sm font-medium text-foreground/90"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
