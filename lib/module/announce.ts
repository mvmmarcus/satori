/** What a screen reader should hear about the clock. Changes only at a few thresholds, never every second. */
export function timeAnnouncement(msLeft: number): string | null {
  if (msLeft <= 30_000) return "30 seconds left";
  if (msLeft <= 60_000) return "1 minute left";
  if (msLeft <= 5 * 60_000) return "5 minutes left";
  return null;
}
