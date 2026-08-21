"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoundCountdownProps {
  /** Seconds allowed for the round. */
  timeLimit: number;
  /** Identity of the current round; changing it resets the clock. */
  roundKey: number | string;
  /** Pause the clock (e.g. while a result is on screen). */
  paused?: boolean;
  /** Called exactly once when the clock reaches zero. */
  onExpire: () => void;
}

const chip =
  "pointer-events-auto inline-flex items-center gap-2 rounded-full bg-background/75 px-3.5 py-2 text-sm font-semibold text-foreground shadow-elevated ring-1 ring-border/70 backdrop-blur-md";

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

/**
 * Self-contained round timer. Owning the per-second state here keeps the rest
 * of the game tree (panorama, guess map) from re-rendering on every tick, which
 * is what the previous timer-in-the-page-component version did sixty times a
 * round.
 */
export function RoundCountdown({
  timeLimit,
  roundKey,
  paused = false,
  onExpire,
}: RoundCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const expiredRef = useRef(false);
  // Held in a ref so a new callback identity on every parent render does not
  // restart the interval, and so expiry always calls the current one.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // New round: reset the clock and re-arm expiry.
  useEffect(() => {
    setTimeRemaining(timeLimit);
    expiredRef.current = false;
  }, [roundKey, timeLimit]);

  useEffect(() => {
    if (paused) {
      return;
    }

    if (timeRemaining <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeRemaining((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [paused, timeRemaining]);

  const lowTime = timeRemaining <= 10;
  const pct =
    timeLimit > 0 ? Math.max(0, Math.min(1, timeRemaining / timeLimit)) : 0;
  const radius = 9;
  const circumference = 2 * Math.PI * radius;

  // Announce only at meaningful thresholds, not on every tick.
  const announcement =
    timeRemaining <= 0
      ? "Time is up. Submitting your guess."
      : timeRemaining <= 5
        ? `${timeRemaining} seconds left.`
        : timeRemaining === 10
          ? "10 seconds left."
          : "";

  return (
    <span
      className={cn(
        chip,
        "tabular",
        lowTime && "text-calgary-red ring-calgary-red/40",
      )}
    >
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </span>
      <span className="relative inline-grid place-items-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.18}
            strokeWidth="2.5"
          />
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <Clock className="absolute size-3" />
      </span>
      {formatTime(timeRemaining)}
    </span>
  );
}
