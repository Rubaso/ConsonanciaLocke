import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { padReplayUrls, replayUpdatePayload } from "@/lib/showdown-replay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_SIZE = 8 * 1024;
const EDITABLE_INDIVIDUAL_STATUSES = ["draft", "pending", "completed", "forfeit"];
const EDITABLE_TOURNAMENT_STATUSES = ["pending", "completed", "forfeit"];

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function parseUrls(body: Record<string, unknown>) {
  if (Array.isArray(body.urls)) {
    return padReplayUrls(
      body.urls.map((value) => (typeof value === "string" ? value : "")),
    );
  }
  if (typeof body.content === "string") {
    return padReplayUrls([body.content]);
  }
  return null;
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
    typeof body.matchId !== "string" ||
    !UUID_PATTERN.test(body.matchId)
  ) {
    return NextResponse.json({ error: "Revisa el enlace." }, { status: 400 });
  }

  const urls = parseUrls(body as Record<string, unknown>);
  if (!urls) {
    return NextResponse.json({ error: "Revisa el enlace." }, { status: 400 });
  }
  if (urls.some((url) => url.length > 400)) {
    return NextResponse.json({ error: "El enlace es demasiado largo." }, { status: 400 });
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

  const isOrganizer = player.role === "organizer";
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
  let allowedStatuses: string[] = [];
  const tournamentMatch = tournamentMatchResponse.data;
  if (
    tournamentMatch &&
    EDITABLE_TOURNAMENT_STATUSES.includes(tournamentMatch.status) &&
    (isOrganizer ||
      tournamentMatch.player_a_id === player.id ||
      tournamentMatch.player_b_id === player.id)
  ) {
    table = "tournament_matches";
    allowedStatuses = EDITABLE_TOURNAMENT_STATUSES;
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
      EDITABLE_INDIVIDUAL_STATUSES.includes(match.status) &&
      (isOrganizer || match.player_a_id === player.id || match.player_b_id === player.id)
    ) {
      table = "individual_matches";
      allowedStatuses = EDITABLE_INDIVIDUAL_STATUSES;
    }
  }

  if (!table) {
    return NextResponse.json(
      { error: "No puedes editar el replay de este combate." },
      { status: 403 },
    );
  }

  let updateQuery = supabase
    .from(table)
    .update(replayUpdatePayload(urls))
    .eq("id", body.matchId)
    .in("status", allowedStatuses);
  if (!isOrganizer) {
    updateQuery = updateQuery.or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`);
  }
  const updateResponse = await updateQuery.select("id").maybeSingle();

  if (updateResponse.error) {
    console.error("Failed to save Showdown replay:", updateResponse.error.message);
    return NextResponse.json(
      { error: "No se pudo guardar el enlace. Comprueba que la migración de Showdown esté aplicada." },
      { status: 503 },
    );
  }
  if (!updateResponse.data) {
    return NextResponse.json(
      { error: "No se pudo actualizar el replay de este combate." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, urls, content: urls[0] || null });
}
