"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useJsApiLoader } from "@react-google-maps/api";
import {
  CalendarCheck,
  CalendarDays,
  Crosshair,
  Home,
  MapPin,
  Play,
  RotateCcw,
  Flag,
} from "lucide-react";
import { GameHUD } from "@/components/game-hud";
import { GameMap } from "@/components/game-map";
import GamePanorama from "@/components/gamepanorama";
import { PanoPrefetch } from "@/components/pano-prefetch";
import { RoundCountdown } from "@/components/round-countdown";
import { RoundResultCard } from "@/components/round-result-card";
import { ShareResults } from "@/components/share-results";
import { StreakBadge } from "@/components/streak-badge";
import { CountUp } from "@/components/site/count-up";
import {
  EmptyState,
  ErrorCard,
  LoadingScreen,
} from "@/components/site/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/format-distance";
import {
  MAX_ROUND_SCORE,
  calculateDistance,
  calculateScore,
} from "@/lib/game-utils";
import { calgaryDateKey, formatDayLabel } from "@/lib/date-calgary";
import { hasPlayedDailyToday, markDailyPlayed } from "@/lib/daily-attempt";
import { parseGameMode, type GameMode } from "@/lib/game-params";
import { getAllLocations } from "@/lib/location-generator";
import { buildRounds } from "@/lib/panorama";
import {
  pickClassicCandidates,
  pickDailyCandidates,
} from "@/lib/round-selection";
import { recordPlayedToday, type StreakState } from "@/lib/streak";
import type { GameRound, LatLng, RoundResult } from "@/lib/types";

type GameState =
  | "loading"
  | "guessing"
  | "results"
  | "summary"
  | "error"
  // Its own state rather than an error: nothing went wrong, the player has
  // already had their one attempt at today's challenge.
  | "daily-used";

const TOTAL_ROUNDS = 5;
const ROUND_SECONDS = 60;

/**
 * How many stored locations to pull before resolving panoramas.
 *
 * More than TOTAL_ROUNDS because a stored coordinate can fail to resolve: Street
 * View coverage moves, and two nearby candidates can snap to the same panorama
 * and be deduplicated. Over-fetching means one Firestore read covers the whole
 * game instead of a second round trip mid-load.
 */
const CANDIDATE_POOL = 15;

/**
 * How long to wait for a game to load before giving up.
 *
 * Firestore retries a failed connection for a long time before it surfaces
 * anything, so a misconfigured project or a dead network left this page on a
 * spinner indefinitely with no way out. A stated failure with a retry button
 * beats a spinner that never resolves.
 */
const LOAD_TIMEOUT_MS = 15000;

function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out. Check your connection.`)),
        LOAD_TIMEOUT_MS,
      ),
    ),
  ]);
}

function tierBarColor(score: number): string {
  if (score >= 4000) return "bg-success";
  if (score >= 2000) return "bg-primary";
  if (score > 0) return "bg-calgary-gold";
  return "bg-muted-foreground/40";
}

export default function Game() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [guessLocation, setGuessLocation] = useState<LatLng | null>(null);
  const [gameState, setGameState] = useState<GameState>("loading");
  const [results, setResults] = useState<RoundResult[]>([]);
  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<GameMode>("classic");
  const [challengeDate, setChallengeDate] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakState | null>(null);

  // Guards a round against being scored twice when the player's click and the
  // timer's expiry land in the same React batch: both would otherwise still see
  // gameState === "guessing".
  const scoredRoundRef = useRef<number | null>(null);
  // Ignores the results of a game load that has been superseded by a restart.
  const loadIdRef = useRef(0);

  const totalRounds = rounds.length || TOTAL_ROUNDS;

  const startGame = useCallback(async (nextMode: GameMode = "classic") => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;

    const today = calgaryDateKey();

    // One attempt a day. Checked before anything loads so the player is told up
    // front rather than watching a game start and then stop.
    if (nextMode === "daily" && hasPlayedDailyToday()) {
      setMode("daily");
      setChallengeDate(today);
      setGameState("daily-used");
      return;
    }

    setMode(nextMode);
    setChallengeDate(nextMode === "daily" ? today : null);
    setGameState("loading");
    setErrorMessage(null);
    setRounds([]);
    setResults([]);
    setCurrentResult(null);
    setGuessLocation(null);
    setCurrentRound(1);
    scoredRoundRef.current = null;

    try {
      const all = await withTimeout(getAllLocations(), "Loading locations");
      if (loadIdRef.current !== loadId) return;

      // The daily's selection is seeded by the date, so every player who loads
      // the same pool today walks the same candidates in the same order.
      const pool =
        nextMode === "daily"
          ? pickDailyCandidates(all, today, CANDIDATE_POOL)
          : pickClassicCandidates(all, CANDIDATE_POOL);

      if (pool.length === 0) {
        setErrorMessage(
          "No verified locations are available yet. Seed the location pool and try again.",
        );
        setGameState("error");
        return;
      }

      const service = new google.maps.StreetViewService();
      const resolved = await withTimeout(
        buildRounds(service, pool, TOTAL_ROUNDS),
        "Finding Street View panoramas",
      );
      if (loadIdRef.current !== loadId) return;

      if (resolved.length === 0) {
        setErrorMessage(
          "Street View could not load imagery for any of the stored locations.",
        );
        setGameState("error");
        return;
      }

      // Burn the attempt at START, not at finish: abandoning a daily half way
      // still means its answers have been seen.
      if (nextMode === "daily") {
        markDailyPlayed();
      }

      setRounds(resolved);
      setGameState("guessing");
    } catch (error) {
      if (loadIdRef.current !== loadId) return;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The game could not be started.",
      );
      setGameState("error");
    }
  }, []);

  // Wait for the Maps JS API: StreetViewService does not exist before it loads.
  //
  // The mode is read from window.location rather than useSearchParams because
  // that hook opts the whole route out of static rendering unless it is wrapped
  // in Suspense, and this page has nothing else that needs to be dynamic.
  useEffect(() => {
    if (!isLoaded) return;
    void startGame(parseGameMode(window.location.search));
  }, [isLoaded, startGame]);

  useEffect(() => {
    if (loadError) {
      setErrorMessage(
        "Google Maps failed to load. Check the NEXT_PUBLIC_GOOGLE_MAPS_API_KEY configuration.",
      );
      setGameState("error");
    }
  }, [loadError]);

  const currentRoundData = rounds[currentRound - 1] ?? null;

  const handleMapClick = (lat: number, lng: number) => {
    if (gameState === "guessing") {
      setGuessLocation({ lat, lng });
    }
  };

  const handleSubmitGuess = useCallback(() => {
    if (gameState !== "guessing") return;
    if (scoredRoundRef.current === currentRound) return;

    const answer = rounds[currentRound - 1];
    if (!answer) return;

    scoredRoundRef.current = currentRound;

    const actualLocation: LatLng = { lat: answer.lat, lng: answer.lng };
    // A round with no pin is a timeout, not a zero-distance guess. Distance
    // stays null all the way through so nothing downstream renders "0.00 km".
    const distance = guessLocation
      ? calculateDistance(
          guessLocation.lat,
          guessLocation.lng,
          actualLocation.lat,
          actualLocation.lng,
        )
      : null;

    const result: RoundResult = {
      roundNumber: currentRound,
      score: distance === null ? 0 : calculateScore(distance),
      distance,
      guessLocation,
      actualLocation,
    };

    setResults((previous) => [...previous, result]);
    setCurrentResult(result);
    setGameState("results");
  }, [currentRound, gameState, guessLocation, rounds]);

  const handleNextRound = () => {
    if (currentRound < totalRounds) {
      setCurrentRound(currentRound + 1);
      setGuessLocation(null);
      setCurrentResult(null);
      setGameState("guessing");
    } else {
      // Recorded once, on the transition into the summary. advanceStreak is
      // idempotent per day, so a re-render cannot inflate the count.
      setStreak(recordPlayedToday());
      setGameState("summary");
    }
  };

  const totalScore = results.reduce((sum, round) => sum + round.score, 0);
  const maxTotal = totalRounds * MAX_ROUND_SCORE;
  const bestRound = results.reduce(
    (best, round) => Math.max(best, round.score),
    0,
  );

  const isPlaying = gameState === "guessing";
  const inResults = gameState === "results";
  const inStage = isPlaying || inResults;
  const isLastRound = currentRound >= totalRounds;
  const nextRoundData = inResults ? (rounds[currentRound] ?? null) : null;

  // The one map instance serves both views, so what it draws depends on phase:
  // just the player's pin while guessing, both pins plus the line on a reveal.
  const mapGuessLocation = isPlaying
    ? guessLocation
    : (currentResult?.guessLocation ?? null);
  const mapActualLocation = isPlaying
    ? null
    : (currentResult?.actualLocation ?? null);
  const mapDistanceKm = isPlaying ? null : (currentResult?.distance ?? null);

  return (
    <>
      {/* ── In-game stage: one persistent map shared by guessing and results ── */}
      {inStage && (
        <section
          data-testid="game-stage"
          className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-4 lg:px-6"
        >
          {nextRoundData && <PanoPrefetch panoId={nextRoundData.panoId} />}

          <div
            className={cn(
              "relative",
              isPlaying
                ? "lg:h-[calc(100dvh-8rem)] lg:min-h-[560px]"
                : "lg:grid lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-5",
            )}
          >
            {/* Panorama: fills the stage while playing, hidden during results */}
            <div
              className={cn(
                "relative h-[46vh] min-h-[300px] w-full lg:absolute lg:inset-0 lg:h-full",
                inResults && "hidden",
              )}
            >
              {isPlaying && currentRoundData && (
                <GamePanorama
                  panoId={currentRoundData.panoId}
                  heading={currentRoundData.heading}
                  pitch={currentRoundData.pitch}
                  zoom={currentRoundData.zoom}
                />
              )}
            </div>

            {/* HUD */}
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4",
                inResults && "hidden",
              )}
            >
              {isPlaying && (
                <GameHUD
                  currentRound={currentRound}
                  totalRounds={totalRounds}
                  scores={results}
                  badgeSlot={
                    mode === "daily" ? (
                      <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-calgary-red px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-elevated">
                        <CalendarDays className="size-3.5" />
                        Daily
                      </span>
                    ) : undefined
                  }
                  timerSlot={
                    <RoundCountdown
                      timeLimit={ROUND_SECONDS}
                      roundKey={currentRound}
                      paused={gameState !== "guessing"}
                      onExpire={handleSubmitGuess}
                    />
                  }
                />
              )}
            </div>

            {/* Result card: grid column one during results */}
            <div
              data-testid="round-result"
              className={cn("mt-3 lg:mt-0", !inResults && "hidden")}
            >
              {inResults && currentResult && (
                <RoundResultCard
                  guessLocation={currentResult.guessLocation}
                  score={currentResult.score}
                  distance={currentResult.distance}
                  onNextRound={handleNextRound}
                  isLastRound={isLastRound}
                  roundNumber={currentResult.roundNumber}
                  totalRounds={totalRounds}
                />
              )}
            </div>

            {/* The single, persistent map: floating guess panel while playing,
                comparison map (grid column two) during results. */}
            <div
              className={cn(
                "z-20",
                isPlaying
                  ? "relative mt-3 lg:absolute lg:bottom-4 lg:right-4 lg:mt-0 lg:w-[360px] xl:w-[400px]"
                  : "relative mt-3 lg:mt-0",
              )}
            >
              <div
                className={cn(
                  "pointer-events-auto overflow-hidden rounded-2xl",
                  isPlaying
                    ? "glass-strong flex h-[48vh] min-h-[340px] flex-col shadow-elevated lg:h-[clamp(360px,46vh,520px)]"
                    : "surface-card lg:h-full",
                )}
              >
                {/* Guess header (guessing only) */}
                <div
                  className={cn(
                    "flex items-center justify-between gap-2 px-3.5 pt-3",
                    inResults && "hidden",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    <MapPin className="size-3.5 text-calgary-red" />
                    Your guess
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      guessLocation ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    {guessLocation ? "Pin placed" : "Tap the map"}
                  </span>
                </div>

                {/* Map canvas (shared instance) */}
                <div
                  className={cn(
                    "p-2.5",
                    isPlaying
                      ? "min-h-[240px] flex-1"
                      : "h-[320px] sm:h-[380px] lg:h-full lg:min-h-[460px]",
                  )}
                >
                  <GameMap
                    onMapClick={handleMapClick}
                    guessLocation={mapGuessLocation}
                    actualLocation={mapActualLocation}
                    guessDistanceKm={mapDistanceKm}
                    isGuessing={isPlaying}
                    viewResetKey={currentRound}
                  />
                </div>

                {/* Submit (guessing only) */}
                <div className={cn("px-2.5 pb-2.5", inResults && "hidden")}>
                  <Button
                    data-testid="submit-guess"
                    onClick={handleSubmitGuess}
                    disabled={!guessLocation}
                    size="lg"
                    className="w-full rounded-xl shadow-glow"
                  >
                    <Crosshair className="size-4" />
                    {guessLocation ? "Submit guess" : "Place a pin to guess"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── loading / error / summary share a centered container ── */}
      {!inStage && (
        <section className="container py-8 sm:py-10">
          {gameState === "loading" && (
            <div className="mx-auto max-w-xl">
              <LoadingScreen
                title="Loading round…"
                description="Finding Calgary Street View panoramas and map data."
              />
            </div>
          )}

          {gameState === "error" && (
            <div className="mx-auto max-w-xl">
              <ErrorCard
                message={errorMessage ?? "The game could not continue."}
                onRetry={() => void startGame(mode)}
                retryLabel="Try again"
              />
            </div>
          )}

          {/* Already had today's attempt. Its own screen rather than an error,
              because nothing failed, and it points at the thing still worth
              doing rather than leaving a dead end. */}
          {gameState === "daily-used" && (
            <div className="mx-auto max-w-xl">
              <EmptyState
                icon={CalendarCheck}
                title="You have already played today's challenge"
                description="The daily deals everyone the same five locations, so it is one attempt each. A new one is dealt at midnight in Calgary."
                action={
                  <Button
                    onClick={() => void startGame("classic")}
                    size="lg"
                    className="rounded-xl"
                  >
                    <Play className="size-4" />
                    Play a classic round
                  </Button>
                }
              />
            </div>
          )}

          {gameState === "summary" && (
            <div className="mx-auto max-w-3xl">
              {/* Hero */}
              <div className="surface-card relative animate-fade-up overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-10">
                <div
                  className="absolute inset-0 -z-10 bg-grid-fade"
                  aria-hidden="true"
                />
                <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  {mode === "daily" ? (
                    <CalendarDays className="size-3.5" />
                  ) : (
                    <Flag className="size-3.5" />
                  )}
                  {mode === "daily" && challengeDate
                    ? `Daily challenge · ${formatDayLabel(challengeDate)}`
                    : "Game complete"}
                </span>
                <p className="mt-6 text-sm text-muted-foreground">Final score</p>
                <p className="mt-1 flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold tracking-tight tabular sm:text-7xl">
                    <CountUp value={totalScore} />
                  </span>
                  <span className="text-xl font-medium text-muted-foreground">
                    / {maxTotal.toLocaleString("en-US")}
                  </span>
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Best round{" "}
                  <span className="font-semibold tabular text-foreground">
                    {bestRound.toLocaleString("en-US")}
                  </span>
                </p>
                <div className="mt-5 flex justify-center">
                  <StreakBadge streak={streak} showBest />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                {/* Always classic: today's daily is spent, so offering to
                    replay it would just bounce off the attempt guard. */}
                <Button
                  onClick={() => void startGame("classic")}
                  size="xl"
                  className="rounded-2xl shadow-glow"
                >
                  <RotateCcw className="size-5" />
                  {mode === "daily" ? "Play a classic round" : "Play again"}
                </Button>
                <ShareResults
                  totalScore={totalScore}
                  maxScore={maxTotal}
                  scores={results}
                  mode={mode}
                  challengeDate={challengeDate}
                />
                <Button
                  asChild
                  size="xl"
                  variant="outline"
                  className="rounded-2xl"
                >
                  <Link href="/">
                    <Home className="size-5" />
                    Back home
                  </Link>
                </Button>
              </div>

              {/* Round breakdown */}
              <div className="surface-card mt-5 animate-fade-up rounded-2xl p-6 delay-75 sm:p-7">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Round breakdown
                </h3>
                <ul className="mt-4 space-y-3">
                  {results.map((round) => {
                    const pct = Math.max(
                      0,
                      Math.min(100, (round.score / MAX_ROUND_SCORE) * 100),
                    );
                    return (
                      <li
                        key={round.roundNumber}
                        className="flex items-center gap-4"
                      >
                        <span className="w-16 shrink-0 text-sm font-medium text-muted-foreground">
                          Round {round.roundNumber}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-[width] duration-700 ease-spring",
                              tierBarColor(round.score),
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-28 shrink-0 text-right text-sm">
                          <span className="font-bold tabular">
                            {round.score.toLocaleString("en-US")}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDistance(round.distance)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
