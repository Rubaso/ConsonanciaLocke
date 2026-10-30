export const PLAYER_USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
export const PLAYER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function playerBoxPath(username: string) {
  return `/jugadores/${encodeURIComponent(username)}`;
}

export function isPlayerBoxLookup(value: string) {
  return PLAYER_ID_PATTERN.test(value) || PLAYER_USERNAME_PATTERN.test(value);
}
