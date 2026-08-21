"use client";

import {
  ArrowRight,
  MapPin,
  Navigation,
  Target,
  Trophy,
  Flag,
  Sparkles,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/site/count-up";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/format-distance";
import { MAX_ROUND_SCORE } from "@/lib/game-utils";
import type { LatLng } from "@/lib/types";

interface RoundResultCardProps {
  guessLocation: LatLng | null;
  score: number;
  distance: number | null;
  onNextRound: () => void;
  isLastRound: boolean;
  roundNumber?: number;
  totalRounds?: number;
}

interface Verdict {
  label: string;
  icon: LucideIcon;
  tone: string;
}

function getVerdict(score: number, hasGuess: boolean): Verdict {
  if (!hasGuess)
    return {
      label: "Out of time",
      icon: Clock,
      tone: "text-destructive bg-destructive/12 ring-destructive/25",
    };
  if (score >= 4000)
    return {
      label: "Bang on!",
      icon: Trophy,
      tone: "text-success bg-success/12 ring-success/25",
    };
  if (score >= 2500)
    return {
      label: "Great guess",
      icon: Sparkles,
      tone: "text-primary bg-primary/12 ring-primary/25",
    };
  if (score >= 1000)
    return {
      label: "Not bad",
      icon: Target,
      tone: "text-medal-gold bg-medal-gold/12 ring-medal-gold/25",
    };
  return {
    label: "Keep exploring",
    icon: MapPin,
    tone: "text-muted-foreground bg-muted ring-border",
  };
}

/**
 * The round-results panel (verdict, score, distance, legend, next action).
 * The comparison map lives outside this card so a single map instance can be
 * shared with the guessing view.
 *
 * A timed-out round arrives here with guessLocation null and distance null, and
 * says so. The version this replaced asserted the guess was non-null and
 * rendered "0.00 km", which read as a perfect-distance zero-point round.
 */
export function RoundResultCard({
  guessLocation,
  score,
  distance,
  onNextRound,
  isLastRound,
  roundNumber,
  totalRounds,
}: RoundResultCardProps) {
  const hasGuess = guessLocation !== null;
  const verdict = getVerdict(score, hasGuess);
  const VerdictIcon = verdict.icon;
  const scorePct = Math.max(0, Math.min(100, (score / MAX_ROUND_SCORE) * 100));

  return (
    <div className="surface-card h-full animate-fade-up rounded-2xl p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {roundNumber && totalRounds
            ? `Round ${roundNumber} of ${totalRounds}`
            : "Round results"}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
            verdict.tone,
          )}
        >
          <VerdictIcon className="size-3.5" />
          {verdict.label}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-sm text-muted-foreground">You scored</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tight tabular sm:text-6xl">
            <CountUp value={score} />
          </span>
          <span className="text-lg font-medium text-muted-foreground">
            / {MAX_ROUND_SCORE.toLocaleString("en-US")}
          </span>
        </p>

        {/* score meter */}
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-calgary-red to-calgary-gold transition-[width] duration-1000 ease-spring"
            style={{ width: `${scorePct}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Distance
          </p>
          <p className="mt-1 text-xl font-bold tabular">
            {formatDistance(distance)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Round score
          </p>
          <p className="mt-1 text-xl font-bold tabular">
            {score.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      {hasGuess ? (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-calgary-red" />
            Your guess
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Navigation className="size-4 text-success" />
            Actual location
          </span>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          The timer ran out before you placed a pin, so this round scored zero.
          The real location is marked on the map.
        </p>
      )}

      <Button
        onClick={onNextRound}
        size="lg"
        className="mt-6 w-full rounded-xl shadow-glow"
      >
        {isLastRound ? (
          <>
            <Flag className="size-4" />
            See final results
          </>
        ) : (
          <>
            Next round
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </div>
  );
}
