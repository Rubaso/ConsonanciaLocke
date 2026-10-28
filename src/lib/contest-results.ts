export const CONTEST_RESULTS_BANNER_MS = 7 * 24 * 60 * 60 * 1000;

export function isContestResultsBannerVisible(endedAt: string | null) {
  if (!endedAt) return false;
  const ended = Date.parse(endedAt);
  if (!Number.isFinite(ended)) return false;
  const elapsed = Date.now() - ended;
  return elapsed >= 0 && elapsed < CONTEST_RESULTS_BANNER_MS;
}
