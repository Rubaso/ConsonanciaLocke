import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const TWITCH_LOGIN_PATTERN = /^[A-Za-z0-9_]{1,25}$/;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function normalizeTwitchLogin(value: string): string | null | undefined {
  const input = value.trim();
  if (!input) return null;
  if (TWITCH_LOGIN_PATTERN.test(input)) return input;

  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    return undefined;
  }

  if (
    url.protocol !== "https:" ||
    !["twitch.tv", "www.twitch.tv"].includes(url.hostname.toLowerCase())
  ) {
    return undefined;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 1 || !TWITCH_LOGIN_PATTERN.test(segments[0])) {
    return undefined;
  }

  return segments[0];
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) {
    return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los ajustes." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("color" in body) ||
    !("twitchUsername" in body) ||
    typeof body.color !== "string" ||
    typeof body.twitchUsername !== "string" ||
    !COLOR_PATTERN.test(body.color)
  ) {
    return NextResponse.json({ error: "Revisa el color y el usuario de Twitch." }, { status: 400 });
  }

  const twitchUsername = normalizeTwitchLogin(body.twitchUsername);
  if (twitchUsername === undefined) {
    return NextResponse.json(
      { error: "Introduce un usuario de Twitch o una URL de canal válida." },
      { status: 400 },
    );
  }

  let player;
  try {
    player = await getCurrentPlayer();
  } catch {
    return NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 503 });
  }
  if (!player) {
    return NextResponse.json({ error: "Inicia sesión para guardar tus ajustes." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const response = await supabase
    .from("players")
    .update({ color: body.color, twitch_username: twitchUsername })
    .eq("id", player.id)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (response.error) {
    console.error("Failed to update player settings:", response.error.message);
    return NextResponse.json({ error: "No se pudieron guardar los ajustes." }, { status: 503 });
  }
  if (!response.data) {
    return NextResponse.json({ error: "No se encontró tu cuenta activa." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    player: {
      color: body.color,
      twitchUsername,
    },
  });
}
