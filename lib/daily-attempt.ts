import { calgaryDateKey } from "@/lib/date-calgary";

/**
 * One daily-challenge attempt per day, per browser.
 *
 * HONEST ABOUT WHAT THIS IS: a courtesy, not enforcement. Toronto backs the
 * same guard with a unique index in Postgres, because a check the client makes
 * is a check the client can skip. Calgary has no server, so clearing storage
 * replays the day.
 *
 * That is acceptable here only because there is no leaderboard and no score is
 * persisted anywhere, so there is nothing to win by replaying. If a leaderboard
 * is ever added, this guard MUST be replaced by a server-side one before daily
 * scores are allowed onto it.
 */

const DAILY_PLAYED_KEY = "cg_daily_played";

/** The Calgary date this browser last played the daily on, or null. */
export function readDailyPlayed(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(DAILY_PLAYED_KEY);
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Whether today's daily has already been started in this browser.
 *
 * Compared on the Calgary calendar, the same boundary the challenge date itself
 * uses, so the answer cannot disagree with which day's rounds were dealt.
 */
export function hasPlayedDailyToday(now: Date = new Date()): boolean {
  const played = readDailyPlayed();
  return played !== null && played === calgaryDateKey(now);
}

/**
 * Record that today's daily has been started.
 *
 * Recorded at START, not at finish, and that is deliberate: abandoning a daily
 * half way still burns the attempt, because the answers to the rounds already
 * seen are already out. Finishing it later is not what the guard protects.
 */
export function markDailyPlayed(now: Date = new Date()): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(DAILY_PLAYED_KEY, calgaryDateKey(now));
  } catch {
    // Storage blocked. The player is simply not deduplicated, which is better
    // than being unable to play at all.
  }
}
