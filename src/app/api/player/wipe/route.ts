import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1024) {
    return NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la confirmación." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("confirmation" in body) ||
    body.confirmation !== "¡HE WIPEADO!"
  ) {
    return NextResponse.json({ error: "Confirma el reinicio de tu partida." }, { status: 400 });
  }

  let player;
  try {
    player = await getCurrentPlayer();
  } catch {
    return NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 503 });
  }
  if (!player) {
    return NextResponse.json({ error: "Inicia sesión para reiniciar tu partida." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const response = await supabase.rpc("wipe_player_game_data", {
    p_player_id: player.id,
  });

  if (response.error) {
    console.error("Failed to wipe player game data:", {
      code: response.error.code,
      message: response.error.message,
      details: response.error.details,
      hint: response.error.hint,
    });
    const errorMessage =
      response.error.code === "PGRST202" || response.error.code === "42883"
        ? "Supabase no reconoce la función de reinicio. Comprueba que la migración esté aplicada en el mismo proyecto que usa la web y ejecuta NOTIFY pgrst, 'reload schema'; en el SQL Editor."
        : response.error.code === "42501"
          ? "Supabase ha rechazado los permisos de la función de reinicio. Revisa que la migración haya concedido EXECUTE a service_role."
          : `No se pudo reiniciar la partida (error de Supabase: ${response.error.code || "desconocido"}).`;
    return NextResponse.json(
      { error: errorMessage },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
