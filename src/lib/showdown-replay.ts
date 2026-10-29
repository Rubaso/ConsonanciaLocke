export const BO3_SLOT_COUNT = 3;
export const REPLAY_SELECT =
  "showdown_replay_url,showdown_replay_url_2,showdown_replay_url_3";

export function normalizeShowdownReplayUrl(value: string) {
  return value.trim();
}

export function padReplayUrls(urls: readonly string[] | null | undefined): [string, string, string] {
  const slots = [0, 1, 2].map((index) =>
    normalizeShowdownReplayUrl(typeof urls?.[index] === "string" ? urls[index] : ""),
  );
  return [slots[0], slots[1], slots[2]];
}

export function filledReplayUrls(urls: readonly string[] | null | undefined) {
  return padReplayUrls(urls).filter((url) => url.length > 0);
}

export function parseReplayUrlsFromRow(row: {
  showdown_replay_url?: unknown;
  showdown_replay_url_2?: unknown;
  showdown_replay_url_3?: unknown;
}) {
  return padReplayUrls([
    typeof row.showdown_replay_url === "string" ? row.showdown_replay_url : "",
    typeof row.showdown_replay_url_2 === "string" ? row.showdown_replay_url_2 : "",
    typeof row.showdown_replay_url_3 === "string" ? row.showdown_replay_url_3 : "",
  ]);
}

export function replayUpdatePayload(urls: readonly string[]) {
  const [gameOne, gameTwo, gameThree] = padReplayUrls(urls);
  return {
    showdown_replay_url: gameOne || null,
    showdown_replay_url_2: gameTwo || null,
    showdown_replay_url_3: gameThree || null,
  };
}
