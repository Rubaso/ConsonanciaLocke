import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { isShowdownReplayUrl, normalizeShowdownReplayUrl } from "@/lib/showdown-replay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_SIZE = 4 * 1024;

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
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "El enlace es demasiado grande." }, { status: 413 });
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
    !("matchId" in body) ||
    !("content" in body) ||
    typeof body.matchId !== "string" ||
    !UUID_PATTERN.test(body.matchId) ||
    typeof body.content !== "string"
  ) {
    return NextResponse.json({ error: "Revisa el enlace de Showdown." }, { status: 400 });
  }

  const content = normalizeShowdownReplayUrl(body.content);
  if (content.length > 400 || (content.length > 0 && !isShowdownReplayUrl(content))) {
    return NextResponse.json(
      {
        error:
          "Introduce una URL de replay de Pokémon Showdown (https://replay.pokemonshowdown.com/…).",
      },
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
    return NextResponse.json({ error: "Inicia sesión para guardar el enlace de la partida." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const tournamentMatchResponse = await supabase
    .from("tournament_matches")
    .select("id,player_a_id,player_b_id,status")
    .eq("id", body.matchId)
    .maybeSingle();
  if (tournamentMatchResponse.error) {
    console.error("Failed to load tournament match for replay:", tournamentMatchResponse.error.message);
    return NextResponse.json({ error: "No se pudo comprobar el combate." }, { status: 503 });
  }

  let table: "tournament_matches" | "individual_matches" | null = null;
  if (
    tournamentMatchResponse.data &&
    tournamentMatchResponse.data.status === "pending" &&
    (tournamentMatchResponse.data.player_a_id === player.id ||
      tournamentMatchResponse.data.player_b_id === player.id)
  ) {
    table = "tournament_matches";
  } else {
    const individualMatchResponse = await supabase
      .from("individual_matches")
      .select("id,player_a_id,player_b_id,status")
      .eq("id", body.matchId)
      .maybeSingle();
    if (individualMatchResponse.error) {
      console.error("Failed to load individual match for replay:", individualMatchResponse.error.message);
      return NextResponse.json({ error: "No se pudo comprobar el combate." }, { status: 503 });
    }
    const match = individualMatchResponse.data;
    if (
      match &&
      ["draft", "pending"].includes(match.status) &&
      (match.player_a_id === player.id || match.player_b_id === player.id)
    ) {
      table = "individual_matches";
    }
  }

  if (!table) {
    return NextResponse.json(
      { error: "No tienes un combate pendiente donde guardar este enlace." },
      { status: 404 },
    );
  }

  const updateResponse = await supabase
    .from(table)
    .update({ showdown_replay_url: content || null })
    .eq("id", body.matchId)
    .in("status", table === "individual_matches" ? ["draft", "pending"] : ["pending"])
    .or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`)
    .select("id")
    .maybeSingle();

  if (updateResponse.error) {
    console.error("Failed to save Showdown replay:", updateResponse.error.message);
    if (updateResponse.error.code === "23514") {
      return NextResponse.json(
        { error: "Introduce una URL de replay de Pokémon Showdown válida." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo guardar el enlace. Comprueba que la migración de Showdown esté aplicada." },
      { status: 503 },
    );
  }
  if (!updateResponse.data) {
    return NextResponse.json(
      { error: "El combate ya no está pendiente." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, content: content || null });
}
