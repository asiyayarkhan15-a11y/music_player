/**
 * Turn a number of seconds into a readable time.
 *
 * Audius gives duration in SECONDS (not milliseconds).
 * Some Audius "tracks" are 3-hour DJ mixes, so we must handle hours,
 * otherwise a 10940-second mix would display as "182:20" and look broken.
 *
 *    71    -> "1:11"
 *    334   -> "5:34"
 *    10940 -> "3:02:20"
 */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** 53081 -> "53K", 1997 -> "2.0K", 412 -> "412" */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
