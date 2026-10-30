import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("pokemonId" in body) ||
    typeof body.pokemonId !== "string" ||
    !UUID_PATTERN.test(body.pokemonId)
  ) {
    return NextResponse.json({ error: "Pokémon no válido." }, { status: 400 });
  }

  let player;
  try {
    player = await getCurrentPlayer();
  } catch {
    return NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 503 });
  }
  if (!player) {
    return NextResponse.json({ error: "Inicia sesión para quitar un caído." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const pokemonResponse = await supabase
    .from("pokemon")
    .select("id,player_id,status")
    .eq("id", body.pokemonId)
    .maybeSingle();
  if (pokemonResponse.error) {
    console.error("Failed to load Pokémon for revive:", pokemonResponse.error.message);
    return NextResponse.json({ error: "No se pudo comprobar el Pokémon." }, { status: 503 });
  }
  const pokemon = pokemonResponse.data;
  if (!pokemon) {
    return NextResponse.json({ error: "No se encontró ese Pokémon." }, { status: 404 });
  }
  if (player.role !== "organizer" && pokemon.player_id !== player.id) {
    return NextResponse.json({ error: "Solo puedes quitar tus propios caídos." }, { status: 403 });
  }
  if (pokemon.status !== "dead") {
    return NextResponse.json({ error: "Ese Pokémon no está en caídos." }, { status: 409 });
  }

  const updateResponse = await supabase
    .from("pokemon")
    .update({
      status: "alive",
      died_at: null,
      death_area: null,
      team_position: null,
    })
    .eq("id", pokemon.id)
    .eq("status", "dead")
    .select("id")
    .maybeSingle();
  if (updateResponse.error || !updateResponse.data) {
    console.error(
      "Failed to revive Pokémon:",
      updateResponse.error?.message ?? "No row updated",
    );
    return NextResponse.json({ error: "No se pudo quitar de caídos." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
