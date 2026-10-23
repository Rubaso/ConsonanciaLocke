import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POKEPASTE_URL_PATTERN =
  /^https:\/\/(?:www\.)?pokepast\.es\/[A-Za-z0-9_-]{4,80}$/;
const MAX_PASTE_LENGTH = 120;
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
    !("matchId" in body) ||
    !("content" in body) ||
    typeof body.matchId !== "string" ||
    !UUID_PATTERN.test(body.matchId) ||
    typeof body.content !== "string"
  ) {
    return NextResponse.json({ error: "Revisa el formato del Poképaste." }, { status: 400 });
  }

  const content = body.content.trim();
  if (
    content.length > MAX_PASTE_LENGTH ||
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

  const supabase = createSupabaseAdminClient();
  const tournamentMatchResponse = await supabase
    .from("tournament_matches")
    .select("id,tournament_id,player_a_id,player_b_id,status,player_a_pokepaste_url,player_b_pokepaste_url")
    .eq("id", body.matchId)
    .maybeSingle();

  if (tournamentMatchResponse.error) {
    console.error("Failed to load tournament match for Poképaste update:", tournamentMatchResponse.error.message);
    return NextResponse.json({ error: "No se pudo comprobar el combate." }, { status: 503 });
  }

  let matchTable: "tournament_matches" | "individual_matches";
  let matchId: string;
  let playerAId: string;
  let isTournamentMatch = false;
  let isIndividualRoundMatch = false;
  let isLaunchedCompetition = false;
  let matchStatus: "draft" | "pending" = "pending";
  let playerAPasteUrl: string | null;
  let playerBPasteUrl: string | null;
  if (tournamentMatchResponse.data) {
    const match = tournamentMatchResponse.data;
    if (
      match.status !== "pending" ||
      (match.player_a_id !== player.id && match.player_b_id !== player.id)
    ) {
      return NextResponse.json(
        { error: "No tienes un combate pendiente donde guardar este Poképaste." },
        { status: 404 },
      );
    }

    const tournamentResponse = await supabase
      .from("tournaments")
      .select("status")
      .eq("id", match.tournament_id)
      .maybeSingle();
    if (tournamentResponse.error) {
      console.error(
        "Failed to verify tournament for Poképaste update:",
        tournamentResponse.error.message,
      );
      return NextResponse.json({ error: "No se pudo comprobar el torneo." }, { status: 503 });
    }
    if (!tournamentResponse.data ||
      !["draft", "published", "in_progress"].includes(tournamentResponse.data.status)) {
      return NextResponse.json({ error: "El torneo no está disponible para preparar equipos." }, { status: 409 });
    }
    isLaunchedCompetition = tournamentResponse.data.status !== "draft";
    matchTable = "tournament_matches";
    matchId = match.id;
    playerAId = match.player_a_id;
    isTournamentMatch = true;
    playerAPasteUrl = match.player_a_pokepaste_url;
    playerBPasteUrl = match.player_b_pokepaste_url;
  } else {
    const individualMatchResponse = await supabase
      .from("individual_matches")
      .select("id,round_id,player_a_id,player_b_id,status,player_a_pokepaste_url,player_b_pokepaste_url")
      .eq("id", body.matchId)
      .maybeSingle();
    if (individualMatchResponse.error) {
      console.error("Failed to load individual match for Poképaste update:", individualMatchResponse.error.message);
      return NextResponse.json({ error: "No se pudo comprobar el combate." }, { status: 503 });
    }
    const match = individualMatchResponse.data;
    if (
      !match ||
      !["draft", "pending"].includes(match.status) ||
      (match.player_a_id !== player.id && match.player_b_id !== player.id)
    ) {
      return NextResponse.json(
        { error: "No tienes un combate pendiente donde guardar este Poképaste." },
        { status: 404 },
      );
    }
    if (match.round_id) {
      const roundResponse = await supabase
        .from("individual_match_rounds")
        .select("status")
        .eq("id", match.round_id)
        .maybeSingle();
      if (roundResponse.error) {
        console.error("Failed to verify individual round for Poképaste update:", roundResponse.error.message);
        return NextResponse.json({ error: "No se pudo comprobar la ronda." }, { status: 503 });
      }
      if (
        !roundResponse.data ||
        !["draft", "published"].includes(roundResponse.data.status) ||
        (roundResponse.data.status === "draft" && match.status !== "draft") ||
        (roundResponse.data.status === "published" && match.status !== "pending")
      ) {
        return NextResponse.json({ error: "La ronda no está disponible para preparar equipos." }, { status: 409 });
      }
      isIndividualRoundMatch = true;
      isLaunchedCompetition = roundResponse.data.status === "published";
      matchStatus = match.status;
    } else if (match.status !== "pending") {
      return NextResponse.json(
        { error: "No tienes un combate pendiente donde guardar este Poképaste." },
        { status: 404 },
      );
    }
    matchTable = "individual_matches";
    matchId = match.id;
    playerAId = match.player_a_id;
    playerAPasteUrl = match.player_a_pokepaste_url;
    playerBPasteUrl = match.player_b_pokepaste_url;
  }

  const isPlayerA = playerAId === player.id;
  const prefix = isPlayerA ? "player_a" : "player_b";
  const existingPasteUrl = isPlayerA ? playerAPasteUrl : playerBPasteUrl;
  const submittedPasteLocked =
    isLaunchedCompetition && (isTournamentMatch || isIndividualRoundMatch);
  if (submittedPasteLocked && existingPasteUrl) {
    return NextResponse.json(
      { error: "El enlace de Poképast.es ya está enviado y no se puede modificar durante el torneo." },
      { status: 409 },
    );
  }
  if (submittedPasteLocked && !content) {
    return NextResponse.json(
      { error: "Introduce tu enlace de Poképast.es antes de guardarlo." },
      { status: 400 },
    );
  }

  const update = { [`${prefix}_pokepaste_url`]: content || null };

  let updateQuery = supabase
    .from(matchTable)
    .update(update)
    .eq("id", matchId)
    .eq(`${prefix}_id`, player.id)
    .eq("status", matchStatus);
  if (submittedPasteLocked) {
    updateQuery = updateQuery.is(`${prefix}_pokepaste_url`, null);
  }
  const updateResponse = await updateQuery.select("id").maybeSingle();

  if (updateResponse.error) {
    console.error("Failed to save match Poképaste:", updateResponse.error.message);
    if (updateResponse.error.code === "23514") {
      return NextResponse.json(
        { error: "La competición ha cambiado de estado y el Poképaste ya no se puede modificar." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo guardar el Poképaste. Comprueba que la migración esté aplicada." },
      { status: 503 },
    );
  }
  if (!updateResponse.data) {
    return NextResponse.json(
      { error: isTournamentMatch
        ? "El enlace ya se había enviado o el combate ya no está pendiente."
        : "El combate ya no está pendiente." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
