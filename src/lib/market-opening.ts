export const MARKET_ROCKET_OPENED_AT = "2026-10-30T18:17:00+01:00";
export const MARKET_ROCKET_BANNER_MS = 48 * 60 * 60 * 1000;

export function isMarketRocketOpeningBannerVisible(now = Date.now()) {
  const opened = Date.parse(MARKET_ROCKET_OPENED_AT);
  if (!Number.isFinite(opened)) return false;
  const elapsed = now - opened;
  return elapsed >= 0 && elapsed < MARKET_ROCKET_BANNER_MS;
}
