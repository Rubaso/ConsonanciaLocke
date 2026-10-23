import "server-only";

import { timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type TwitchTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type LiveLookup =
  | { status: "not-configured" }
  | { status: "ready"; liveLogins: Set<string> };

type LivePlayer = {
  id: string;
  displayName: string;
  color: string;
  twitchUsername: string;
};

const LIVE_CACHE_TTL_MS = 45_000;
let accessToken: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;
let liveCache:
  | { key: string; liveLogins: Set<string>; expiresAt: number }
  | null = null;
const liveRequests = new Map<string, Promise<LiveLookup>>();

function getTwitchCredentials() {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

async function getAppAccessToken(
  credentials: { clientId: string; clientSecret: string },
): Promise<string> {
  if (accessToken && accessToken.expiresAt > Date.now()) {
    return accessToken.value;
  }
  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Twitch token request failed with HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("access_token" in payload) ||
      typeof payload.access_token !== "string" ||
      !("expires_in" in payload) ||
      typeof payload.expires_in !== "number" ||
      !("token_type" in payload) ||
      typeof payload.token_type !== "string"
    ) {
      throw new Error("Twitch returned an invalid app access token.");
    }
    const tokenResponse = payload as TwitchTokenResponse;
    accessToken = {
      value: tokenResponse.access_token,
      expiresAt: Date.now() + Math.max(tokenResponse.expires_in - 60, 1) * 1000,
    };
    return accessToken.value;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

async function fetchLiveLogins(
  logins: string[],
  credentials: { clientId: string; clientSecret: string },
  forceRefresh = false,
): Promise<LiveLookup> {
  if (logins.length === 0) return { status: "ready", liveLogins: new Set() };

  const uniqueLogins = [...new Set(logins.map((login) => login.toLowerCase()))]
    .filter((login) => /^[a-z0-9_]{1,25}$/.test(login))
    .sort();
  if (uniqueLogins.length === 0) return { status: "ready", liveLogins: new Set() };

  const cacheKey = uniqueLogins.join(",");
  if (!forceRefresh && liveCache?.key === cacheKey && liveCache.expiresAt > Date.now()) {
    return { status: "ready", liveLogins: liveCache.liveLogins };
  }
  const existingRequest = liveRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request: Promise<LiveLookup> = (async (): Promise<LiveLookup> => {
    const token = await getAppAccessToken(credentials);
    const url = new URL("https://api.twitch.tv/helix/streams");
    for (const login of uniqueLogins) {
      url.searchParams.append("user_login", login);
    }

    const response = await fetch(url, {
      headers: {
        "Client-Id": credentials.clientId,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Twitch live stream request failed with HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("data" in payload) ||
      !Array.isArray(payload.data)
    ) {
      throw new Error("Twitch returned an invalid live stream response.");
    }
    const liveLogins = new Set<string>();
    for (const stream of payload.data) {
      if (
        typeof stream !== "object" ||
        stream === null ||
        !("user_login" in stream) ||
        typeof stream.user_login !== "string"
      ) {
        throw new Error("Twitch returned an invalid live stream record.");
      }
      liveLogins.add(stream.user_login.toLowerCase());
    }
    liveCache = {
      key: cacheKey,
      liveLogins,
      expiresAt: Date.now() + LIVE_CACHE_TTL_MS,
    };
    return { status: "ready", liveLogins };
  })();

  liveRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    liveRequests.delete(cacheKey);
  }
}

async function getLiveTwitchLogins(logins: string[], forceRefresh = false): Promise<LiveLookup> {
  const credentials = getTwitchCredentials();
  if (!credentials) return { status: "not-configured" };
  return fetchLiveLogins(logins, credentials, forceRefresh);
}

export function isValidTwitchCronAuthorization(authorization: string | null) {
  const secret = (
    process.env.CRON_SECRET ??
    process.env.TWITCH_CRON_SECRET
  )?.trim();
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!secret || !match) return false;
  const provided = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function hasTwitchCronSecret() {
  return Boolean(
    process.env.CRON_SECRET?.trim() ||
    process.env.TWITCH_CRON_SECRET?.trim(),
  );
}

export function isTwitchConfigured() {
  return getTwitchCredentials() !== null;
}

export async function refreshTwitchLiveStatus() {
  const supabase = createSupabaseAdminClient();
  const response = await supabase
    .from("players")
    .select("id,twitch_username")
    .eq("is_active", true)
    .not("twitch_username", "is", null)
    .limit(40);
  if (response.error) {
    throw new Error(`Failed to load Twitch-linked players: ${response.error.message}`);
  }

  const players = response.data.flatMap((player) =>
    typeof player.id === "string" && typeof player.twitch_username === "string"
      ? [{ id: player.id, twitchUsername: player.twitch_username }]
      : [],
  );
  const lookup = await getLiveTwitchLogins(
    players.map((player) => player.twitchUsername),
    true,
  );
  if (lookup.status === "not-configured") {
    return { status: "not-configured" as const };
  }

  const checkedAt = new Date().toISOString();
  if (players.length > 0) {
    const statusRows = players.map((player) => ({
      player_id: player.id,
      twitch_username: player.twitchUsername,
      is_live: lookup.liveLogins.has(player.twitchUsername.toLowerCase()),
      checked_at: checkedAt,
    }));
    const writeResponse = await supabase
      .from("twitch_live_status")
      .upsert(statusRows, { onConflict: "player_id" });
    if (writeResponse.error) {
      throw new Error(`Failed to save Twitch live status: ${writeResponse.error.message}`);
    }
  }

  return {
    status: "ready" as const,
    checkedAt,
    linkedPlayers: players.length,
    livePlayers: lookup.liveLogins.size,
  };
}

export async function getLiveTwitchPlayers() {
  const supabase = createSupabaseAdminClient();
  const playersResponse = await supabase
    .from("players")
    .select("id,display_name,color,twitch_username")
    .eq("is_active", true)
    .not("twitch_username", "is", null)
    .order("display_name", { ascending: true })
    .limit(40);
  if (playersResponse.error) {
    throw new Error(`Failed to load Twitch-linked players: ${playersResponse.error.message}`);
  }

  const players: LivePlayer[] = playersResponse.data.flatMap((player) => {
    if (
      typeof player.id !== "string" ||
      typeof player.display_name !== "string" ||
      typeof player.color !== "string" ||
      typeof player.twitch_username !== "string"
    ) {
      return [];
    }
    return [{
      id: player.id,
      displayName: player.display_name,
      color: player.color,
      twitchUsername: player.twitch_username,
    }];
  });
  if (players.length === 0) return { status: "ready" as const, players: [] };

  const statusesResponse = await supabase
    .from("twitch_live_status")
    .select("player_id,twitch_username,is_live,checked_at")
    .in("player_id", players.map((player) => player.id));
  if (statusesResponse.error) {
    throw new Error(`Failed to read cached Twitch live status: ${statusesResponse.error.message}`);
  }

  const freshAfter = Date.now() - 5 * 60 * 1000;
  const livePlayerIds = new Set(
    statusesResponse.data
      .filter((status) =>
        status.is_live &&
        Date.parse(status.checked_at) >= freshAfter &&
        players.some((player) =>
          player.id === status.player_id &&
          player.twitchUsername.toLowerCase() === status.twitch_username.toLowerCase(),
        ),
      )
      .map((status) => status.player_id),
  );

  return {
    status: "ready" as const,
    players: players
      .filter((player) => livePlayerIds.has(player.id))
      .map((player) => ({
        displayName: player.displayName,
        color: player.color,
        twitchUsername: player.twitchUsername,
        url: `https://www.twitch.tv/${encodeURIComponent(player.twitchUsername)}`,
      })),
  };
}

export async function getLiveTwitchPlayerIds(
  players: Array<{ id: string; twitchUsername: string | null }>,
) {
  const linkedPlayers = players.filter(
    (player): player is { id: string; twitchUsername: string } =>
      player.twitchUsername !== null,
  );
  if (linkedPlayers.length === 0) {
    return { status: "ready" as const, playerIds: new Set<string>() };
  }

  const response = await createSupabaseAdminClient()
    .from("twitch_live_status")
    .select("player_id,twitch_username,is_live,checked_at")
    .in("player_id", linkedPlayers.map((player) => player.id));
  if (response.error) {
    throw new Error(`Failed to load cached Twitch player status: ${response.error.message}`);
  }

  const freshAfter = Date.now() - 5 * 60 * 1000;
  return {
    status: "ready" as const,
    playerIds: new Set(
      response.data
        .filter((status) =>
          status.is_live &&
          Date.parse(status.checked_at) >= freshAfter &&
          linkedPlayers.some((player) =>
            player.id === status.player_id &&
            player.twitchUsername.toLowerCase() === status.twitch_username.toLowerCase(),
          ),
        )
        .map((status) => status.player_id),
    ),
  };
}
