import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const POKEPASTE_URL_PATTERN =
  /^https:\/\/(?:www\.)?pokepast\.es\/[A-Za-z0-9_-]{4,80}$/;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4 * 1024) {
    return NextResponse.json({ error: "El Poképaste es demasiado grande." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("content" in body) ||
    typeof body.content !== "string"
  ) {
    return NextResponse.json({ error: "Revisa el formato del Poképaste." }, { status: 400 });
  }

  const content = body.content.trim();
  if (
    content.length > 120 ||
    (content.length > 0 && !POKEPASTE_URL_PATTERN.test(content))
  ) {
    return NextResponse.json(
      { error: "Introduce una URL de Poképast.es válida (https://pokepast.es/…)."},
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
    return NextResponse.json({ error: "Inicia sesión para guardar tu Poképaste." }, { status: 401 });
  }

  const response = await createSupabaseAdminClient()
    .from("players")
    .update({ pokepaste_url: content || null })
    .eq("id", player.id)
    .eq("is_active", true)
    .select("pokepaste_url")
    .maybeSingle();

  if (response.error) {
    console.error("Failed to update player Poképaste:", response.error.message);
    return NextResponse.json(
      { error: "No se pudo guardar tu Poképaste. Comprueba que la migración esté aplicada." },
      { status: 503 },
    );
  }
  if (!response.data) {
    return NextResponse.json({ error: "No se encontró tu cuenta activa." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, content: response.data.pokepaste_url });
}
