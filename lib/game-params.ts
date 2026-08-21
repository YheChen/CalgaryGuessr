export type GameMode = "classic" | "daily";

/**
 * Which game the URL is asking for. Pure so it can be unit tested.
 *
 * `?mode=daily` starts the daily challenge; anything else is a classic game.
 * Unknown modes fall back to classic rather than refusing to start.
 */
export function parseGameMode(search: string): GameMode {
  const params = new URLSearchParams(search);
  return params.get("mode") === "daily" ? "daily" : "classic";
}
