import { NextResponse } from "next/server";
import {
  createSessionToken,
  hashAuthenticationKey,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
const PIN_PATTERN = /^[A-Za-z0-9]{5}$/;
const ACCOUNT_LOGIN_SCOPE = "consonancia-account-pin";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError("Solicitud no válida.", 403);
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonError("Solicitud no válida.", 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) {
    return jsonError("Solicitud demasiado grande.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Introduce el usuario y el PIN.", 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("username" in body) ||
    !("pin" in body) ||
    typeof body.username !== "string" ||
    typeof body.pin !== "string"
  ) {
    return jsonError("Introduce el usuario y el PIN.", 400);
  }

  const username = body.username.trim().toLowerCase();
  const pin = body.pin.toUpperCase();
  if (!USERNAME_PATTERN.test(username) || !PIN_PATTERN.test(pin)) {
    return jsonError("Usuario o PIN incorrectos.", 401);
  }

  const identifierHash = hashAuthenticationKey(`username:${username}`);
  const sourceHash = hashAuthenticationKey(ACCOUNT_LOGIN_SCOPE);
  const supabase = createSupabaseAdminClient();
  const blockedResponse = await supabase.rpc("is_authentication_blocked", {
    p_identifier_hash: identifierHash,
    p_source_hash: sourceHash,
  });

  if (blockedResponse.error) {
    console.error("Failed to check authentication limits:", blockedResponse.error.message);
    return jsonError("El acceso no está disponible temporalmente.", 503);
  }
  if (blockedResponse.data === true) {
    return jsonError("Demasiados intentos. Espera 30 segundos antes de probar otra vez.", 429);
  }

  const playerResponse = await supabase
    .from("players")
    .select("id,pin,is_active")
    .eq("username", username)
    .maybeSingle();

  if (playerResponse.error) {
    console.error("Failed to load player account:", playerResponse.error.message);
    return jsonError("El acceso no está disponible temporalmente.", 503);
  }

  const player = playerResponse.data;
  if (
    !player ||
    !player.is_active ||
    typeof player.pin !== "string" ||
    player.pin.toUpperCase() !== pin
  ) {
    const failureResponse = await supabase.rpc("record_authentication_failure", {
      p_identifier_hash: identifierHash,
      p_source_hash: sourceHash,
    });

    if (failureResponse.error) {
      console.error("Failed to record authentication failure:", failureResponse.error.message);
      return jsonError("El acceso no está disponible temporalmente.", 503);
    }

    return jsonError(
      failureResponse.data === true
        ? "Demasiados intentos. Espera 30 segundos antes de probar otra vez."
        : "Usuario o PIN incorrectos.",
      failureResponse.data === true ? 429 : 401,
    );
  }

  const clearLimitResponse = await supabase.rpc("clear_authentication_limit", {
    p_identifier_hash: identifierHash,
    p_source_hash: sourceHash,
  });

  if (clearLimitResponse.error) {
    console.error("Failed to clear authentication limits:", clearLimitResponse.error.message);
    return jsonError("El acceso no está disponible temporalmente.", 503);
  }

  const { token, tokenHash } = createSessionToken();
  const sessionResponse = await supabase.from("player_sessions").insert({
    player_id: player.id,
    token_hash: tokenHash,
    expires_at: new Date(
      Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    ).toISOString(),
  });

  if (sessionResponse.error) {
    console.error("Failed to create player session:", sessionResponse.error.message);
    return jsonError("No se pudo iniciar la sesión. Prueba otra vez.", 503);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
