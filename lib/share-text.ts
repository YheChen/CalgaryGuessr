import type { GameMode } from "@/lib/game-params";

/**
 * Emoji tile for a round score.
 *
 * The thresholds are the same four the results card cuts at (see getVerdict in
 * components/round-result-card.tsx). Keeping them aligned is what stops the
 * grid from disagreeing with the verdict a player just read.
 *
 * Under the current curve those bands land at roughly: inside 0.32 km,
 * 0.65 km, 1.2 km, and worse.
 */
export function tileFor(score: number): string {
  if (score >= 4000) return "🟩";
  if (score >= 2500) return "🟦";
  if (score >= 1000) return "🟨";
  return "⬛";
}

export interface ShareTextInput {
  totalScore: number;
  maxScore: number;
  scores: Array<{ score: number }>;
  mode: GameMode;
  /** The daily's Calgary date key, when this was a daily game. */
  challengeDate: string | null;
}

/** Builds the Wordle-style shareable summary of a finished game. */
export function buildShareText({
  totalScore,
  maxScore,
  scores,
  mode,
  challengeDate,
}: ShareTextInput): string {
  const heading =
    mode === "daily" && challengeDate
      ? `CalgaryGuessr Daily ${challengeDate}`
      : "CalgaryGuessr";
  const tiles = scores.map((round) => tileFor(round.score)).join("");
  const origin =
    typeof window === "undefined"
      ? "https://calgaryguessr.vercel.app"
      : window.location.origin;

  return [
    heading,
    `${totalScore.toLocaleString("en-US")} / ${maxScore.toLocaleString("en-US")}`,
    tiles,
    origin,
  ].join("\n");
}
