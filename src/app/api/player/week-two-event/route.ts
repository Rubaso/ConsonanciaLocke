import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_REQUEST_SIZE = 4 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    return NextResponse.json({ error: "El enlace es demasiado largo." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.eventSlug !== "string") {
    return NextResponse.json({ error: "La participación no es válida." }, { status: 400 });
  }

  const eventSlug = body.eventSlug;
  if (
    eventSlug !== "el-loco-de-la-colina" &&
    eventSlug !== "arqueologo-novato"
  ) {
    return NextResponse.json({ error: "El evento no admite participaciones." }, { status: 400 });
  }

  let evidenceUrl: string | null = null;
  let pokemonId: string | null = null;
  if (eventSlug === "el-loco-de-la-colina") {
    if (typeof body.evidenceUrl !== "string") {
      return NextResponse.json({ error: "Introduce el enlace de tu reto." }, { status: 400 });
    }

    evidenceUrl = body.evidenceUrl.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(evidenceUrl);
    } catch {
      return NextResponse.json({ error: "Introduce un enlace válido." }, { status: 400 });
    }
    if (
      evidenceUrl.length < 8 ||
      evidenceUrl.length > 500 ||
      !["http:", "https:"].includes(parsedUrl.protocol)
    ) {
      return NextResponse.json(
        { error: "El enlace debe ser una URL http o https válida." },
        { status: 400 },
      );
    }
  } else {
    if (typeof body.pokemonId !== "string" || !UUID_PATTERN.test(body.pokemonId)) {
      return NextResponse.json({ error: "Elige un Pokémon de Gruta Sisma." }, { status: 400 });
    }
    pokemonId = body.pokemonId;
  }

  let player;
  try {
    player = await getCurrentPlayer();
  } catch {
    return NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 503 });
  }
  if (!player) {
    return NextResponse.json({ error: "Inicia sesión para participar." }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  const eventResponse = await supabase
    .from("week_two_event_control")
    .select("ended_at")
    .eq("event_slug", eventSlug)
    .maybeSingle();

  if (eventResponse.error || !eventResponse.data) {
    if (eventResponse.error) {
      console.error("Failed to load week-two event status:", eventResponse.error.message);
    }
    return NextResponse.json(
      { error: "No se pudo comprobar el estado del evento. Comprueba que la migración esté aplicada." },
      { status: 503 },
    );
  }
  if (eventResponse.data.ended_at) {
    return NextResponse.json({ error: "La organización ha terminado este evento." }, { status: 409 });
  }

  if (pokemonId) {
    const pokemonResponse = await supabase
      .from("pokemon")
      .select("id,player_id,route_id,status,present_in_save")
      .eq("id", pokemonId)
      .maybeSingle();

    if (pokemonResponse.error) {
      console.error("Failed to validate archaeologist event Pokémon:", pokemonResponse.error.message);
      return NextResponse.json(
        { error: "No se pudo comprobar el Pokémon elegido." },
        { status: 503 },
      );
    }

    const pokemon = pokemonResponse.data;
    if (
      !pokemon ||
      pokemon.player_id !== player.id ||
      pokemon.route_id !== 11 ||
      !["alive", "dead"].includes(pokemon.status) ||
      pokemon.present_in_save !== true
    ) {
      return NextResponse.json(
        { error: "Elige un Pokémon tuyo, capturado en Gruta Sisma y presente en tu partida." },
        { status: 403 },
      );
    }
  }

  const response = await supabase
    .from("week_two_event_submissions")
    .upsert(
      {
        event_slug: eventSlug,
        player_id: player.id,
        evidence_url: evidenceUrl,
        pokemon_id: pokemonId,
      },
      { onConflict: "event_slug,player_id" },
    )
    .select("id")
    .single();

  if (response.error) {
    console.error("Failed to save week-two event participation:", response.error.message);
    if (response.error.message.includes("WEEK_TWO_EVENT_CLOSED")) {
      return NextResponse.json(
        { error: "La organización ha terminado este evento." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo guardar tu participación. Comprueba que la migración esté aplicada." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, id: response.data.id });
}
