/**
 * Calculate the distance between two points on Earth using the Haversine
 * formula.
 *
 * @returns Distance in kilometers.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const radiusKm = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusKm * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/** Maximum for a single round. Five rounds cap at 25000. */
export const MAX_ROUND_SCORE = 5000;

/**
 * Distances at or inside this are indistinguishable in practice, so they all
 * pay full marks. Street View panoramas sit roughly 10 to 20 m apart and the
 * subject of a photo can be a block from the camera, so demanding better than
 * this would be scoring noise.
 */
const PLATEAU_KM = 0.1;

/**
 * Error that halves the score, measured from the edge of the plateau.
 *
 * Calgary's downtown communities are small: Eau Claire, Chinatown, Kensington,
 * East Village, Sunnyside and Crescent Heights are each roughly half a square
 * kilometre to a square kilometre, an equivalent radius of about 0.4 to 0.6 km.
 * So "you found the right community" and "you scored about half" mean the same
 * thing, by construction.
 *
 * This is half of Toronto's value because Toronto's neighbourhoods average
 * 4 km2. Do not copy that number across without redoing this calculation.
 */
const HALF_SCORE_KM = 0.5;

/**
 * Points for a guess that missed by `distance` kilometres.
 *
 * The shape is 1/(1 + x^2): flat across the plateau, steep through the first
 * few hundred metres where local knowledge actually shows, then a quadratic
 * tail where every doubling of error quarters the payout.
 *
 * It replaces a linear ramp that hit zero at 2 km and stayed there. That was
 * the wrong scale for this game. The target set spans about 2.0 by 3.1 km
 * (CALGARY_BOUNDS in lib/location-generator.ts), so a random in-area click
 * lands 1.34 km out on average, and the old curve scored anything past 2 km
 * identically to a guess in another country: zero. Recognising the right block
 * and missing by 2.1 km also scored zero. The game could not tell knowledge
 * from ignorance, which is the one thing it exists to measure.
 *
 * Now 500 m pays 3049, 1 km pays 1179, that average uninformed click pays about
 * 740, and a 20 km miss pays 3. Informed play earns several times ignorant
 * play, and genuine ignorance rounds towards nothing without a cliff.
 *
 * Written as `decay * decay` rather than Math.pow, and with no exp or log, so
 * the formula stays trivially portable to any other language if scoring ever
 * moves off the client.
 */
export function calculateScore(distance: number): number {
  // Fail closed. NaN would render as a blank score, and a negative distance
  // must never fall through to the plateau branch and hand out a perfect round.
  // Callers already map a missing guess to 0 without coming here, so this only
  // guards genuinely broken input.
  if (!Number.isFinite(distance) || distance < 0) {
    return 0;
  }

  if (distance <= PLATEAU_KM) {
    return MAX_ROUND_SCORE;
  }

  const decay = (distance - PLATEAU_KM) / HALF_SCORE_KM;
  return Math.round(MAX_ROUND_SCORE / (1 + decay * decay));
}
