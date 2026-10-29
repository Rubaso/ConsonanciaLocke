const SHOWDOWN_REPLAY_PATTERN =
  /^https:\/\/(?:www\.)?(?:replay\.pokemonshowdown\.com|play\.pokemonshowdown\.com)\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]{6,360}$/;

export function normalizeShowdownReplayUrl(value: string) {
  return value.trim();
}

export function isShowdownReplayUrl(value: string) {
  return SHOWDOWN_REPLAY_PATTERN.test(normalizeShowdownReplayUrl(value));
}
