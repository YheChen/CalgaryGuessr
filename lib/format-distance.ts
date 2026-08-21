/**
 * How a guess-to-answer distance is written, everywhere.
 *
 * One place rather than one copy per surface: the result card, the summary
 * breakdown, and the label drawn on the map itself all need this, and three
 * copies agreeing today is not the same as three copies agreeing after someone
 * changes one of them.
 *
 * The input is kilometres, which is what the game scores from.
 */

/** Longer form for a card: "820 m", "1.42 km", or a stated absence. */
export function formatDistance(distance: number | null | undefined): string {
  if (
    distance === null ||
    distance === undefined ||
    !Number.isFinite(distance)
  ) {
    return "No guess";
  }
  // Metres under a kilometre. Two decimals of a kilometre would read as 0.82,
  // which is harder to picture than 820 m at exactly the scale this game plays
  // at: the whole playable area is about 2 by 3 km.
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(2)} km`;
}

/**
 * Shorter form for a label drawn on the map itself.
 *
 * One decimal, not two. These sit on top of the map between the pin and the
 * answer, so every character is one more chance of overlapping something.
 * "1.4 km" carries the same meaning as "1.42 km" at a glance and is narrower.
 *
 * Returns null rather than "No guess" when there is nothing to show: the caller
 * draws no line without a distance, so there is no line to label.
 */
export function formatDistanceCompact(
  distance: number | null | undefined,
): string | null {
  if (
    distance === null ||
    distance === undefined ||
    !Number.isFinite(distance)
  ) {
    return null;
  }
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
}
