import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const SESSION_COOKIE_NAME = "consonancia_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type PlayerSession = {
  id: string;
  username: string;
  displayName: string;
  role: "player" | "organizer";
  color: string;
  twitchUsername: string | null;
};

export function createSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
  };
}

export function hashAuthenticationKey(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("Supabase server configuration is missing");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function getCurrentPlayer(): Promise<PlayerSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = createSupabaseAdminClient();
  const sessionResponse = await supabase
    .from("player_sessions")
    .select("id,player_id,expires_at,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (sessionResponse.error) {
    console.error("Failed to validate player session:", sessionResponse.error.message);
    throw new Error("No se pudo validar la sesión.");
  }

  const session = sessionResponse.data;
  if (
    !session ||
    session.revoked_at ||
    Date.parse(session.expires_at) <= Date.now()
  ) {
    return null;
  }

  const playerResponse = await supabase
    .from("players")
    .select("id,username,display_name,role,is_active,color,twitch_username")
    .eq("id", session.player_id)
    .maybeSingle();

  if (playerResponse.error) {
    console.error("Failed to load player session identity:", playerResponse.error.message);
    throw new Error("No se pudo validar la cuenta.");
  }

  const player = playerResponse.data;
  if (!player?.is_active) return null;

  return {
    id: player.id,
    username: player.username,
    displayName: player.display_name,
    role: player.role,
    color: player.color,
    twitchUsername: player.twitch_username,
  };
}
