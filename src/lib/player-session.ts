export type PublicPlayer = {
  username: string;
  displayName: string;
  role: "player" | "organizer";
  color: string;
  twitchUsername: string | null;
};

export const PLAYER_SESSION_EVENT = "consonancia:session";

export function notifyPlayerSessionChanged() {
  window.dispatchEvent(new Event(PLAYER_SESSION_EVENT));
}
