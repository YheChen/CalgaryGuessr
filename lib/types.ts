export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Everything a round needs to be played and scored.
 *
 * `lat`/`lng` are the panorama's OWN position, not the stored candidate we
 * searched from. Those differ by up to the search radius, and the answer has to
 * be where the player is actually standing or a perfect guess would be scored
 * as a near miss.
 */
export interface GameRound extends LatLng {
  panoId: string;
  /** Degrees clockwise from north. Stable for a given location; see headingFor. */
  heading: number;
  pitch: number;
  zoom: number;
}

export interface RoundResult {
  roundNumber: number;
  score: number;
  /** Kilometres from the answer, or null when the round timed out unguessed. */
  distance: number | null;
  guessLocation: LatLng | null;
  actualLocation: LatLng;
}
