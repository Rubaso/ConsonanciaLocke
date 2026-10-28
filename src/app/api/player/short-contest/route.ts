import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getSpeciesEntry, isEligibleSpecies, isHttpUrl } from "@/lib/fishing-species";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_SIZE = 8 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    typeof body.pokemonId !== "string" ||
    !UUID_PATTERN.test(body.pokemonId) ||
    typeof body.chosenSpecies !== "string" ||
    typeof body.clipUrl !== "string"
  ) {
    return NextResponse.json({ error: "Revisa el Pokémon, la especie y el clip." }, { status: 400 });
  }

  const clipUrl = body.clipUrl.trim();
  if (clipUrl.length < 8 || clipUrl.length > 500 || !isHttpUrl(clipUrl)) {
    return NextResponse.json(
      { error: "El clip tiene que ser una URL válida (http o https)." },
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
    return NextResponse.json({ error: "Inicia sesión para elegir tu bajito." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const contestResponse = await supabase
    .from("short_contests")
    .select("id")
    .eq("status", "active")
    .maybeSingle();
  if (contestResponse.error) {
    console.error("Failed to load active short contest:", contestResponse.error.message);
    return NextResponse.json(
      { error: "No se pudo cargar el concurso. Comprueba que la migración esté aplicada." },
      { status: 503 },
    );
  }
  if (!contestResponse.data) {
    return NextResponse.json(
      { error: "No hay un concurso de bajitos activo." },
      { status: 409 },
    );
  }

  const pokemonResponse = await supabase
    .from("pokemon")
    .select("id,species,obtain_method,status,present_in_save,player_id")
    .eq("id", body.pokemonId)
    .maybeSingle();
  if (pokemonResponse.error) {
    console.error("Failed to validate short-contest Pokémon:", pokemonResponse.error.message);
    return NextResponse.json({ error: "No se pudo comprobar el Pokémon elegido." }, { status: 503 });
  }
  const pokemon = pokemonResponse.data;
  if (
    !pokemon ||
    pokemon.player_id !== player.id ||
    pokemon.status !== "alive" ||
    pokemon.present_in_save !== true ||
    pokemon.obtain_method !== 0
  ) {
    return NextResponse.json(
      {
        error:
          "Ese Pokémon no está en tu equipo ni en tus cajas como captura salvaje.",
      },
      { status: 403 },
    );
  }

  const chosen = getSpeciesEntry(body.chosenSpecies);
  if (!chosen || !isEligibleSpecies(pokemon.species, chosen.name)) {
    return NextResponse.json(
      {
        error:
          "Solo puedes elegir ese Pokémon o una de sus preevoluciones, y tiene que existir en la Pokédex.",
      },
      { status: 400 },
    );
  }

  const upsertResponse = await supabase
    .from("short_contest_entries")
    .upsert(
      {
        contest_id: contestResponse.data.id,
        player_id: player.id,
        pokemon_id: pokemon.id,
        chosen_species: chosen.name,
        height_m: chosen.heightM,
        clip_url: clipUrl,
      },
      { onConflict: "contest_id,player_id" },
    )
    .select("id")
    .single();

  if (upsertResponse.error) {
    console.error("Failed to save short contest entry:", upsertResponse.error.message);
    return NextResponse.json(
      { error: "No se pudo guardar tu bajito. Comprueba que la migración esté aplicada." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, id: upsertResponse.data.id });
}
