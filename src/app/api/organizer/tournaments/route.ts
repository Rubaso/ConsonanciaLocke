import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_SIZE = 16 * 1024;

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

async function getOrganizer(request: Request) {
  if (!isSameOrigin(request)) {
    return { response: NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }) };
  }
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return { response: NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 }) };
    }
    if (player.role !== "organizer") {
      return { response: NextResponse.json({ error: "Solo la cuenta organizadora puede gestionar el torneo." }, { status: 403 }) };
    }
    return { player };
  } catch {
    return { response: NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 503 }) };
  }
}

async function readBody(request: Request): Promise<unknown | NextResponse> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  }
  try {
    return await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const authorization = await getOrganizer(request);
  if (authorization.response) return authorization.response;

  const body = await readBody(request);
  if (body instanceof NextResponse) return body;
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (body.kind === "individual-round") {
    if (
      typeof body.name !== "string" ||
      body.name.trim().length < 1 ||
      body.name.trim().length > 80
    ) {
      return NextResponse.json(
        { error: "El nombre del torneo individual debe tener entre 1 y 80 caracteres." },
        { status: 400 },
      );
    }
    const response = await supabase.rpc("create_individual_match_round", {
      p_name: body.name.trim(),
      p_organizer_player_id: authorization.player.id,
    });
    if (response.error) {
      console.error("Failed to create randomized individual match round:", response.error.message);
      return NextResponse.json(
        { error: response.error.code === "42501"
          ? "Solo la cuenta organizadora puede crear rondas."
          : response.error.message.includes("jugadores")
            ? response.error.message
            : "No se pudo crear la ronda. Comprueba que la migración esté aplicada." },
        { status: response.error.code === "42501" ? 403 : 400 },
      );
    }
    return NextResponse.json({ ok: true, id: response.data });
  }

  if (body.kind === "individual") {
    if (
      typeof body.playerAId !== "string" ||
      !UUID_PATTERN.test(body.playerAId) ||
      typeof body.playerBId !== "string" ||
      !UUID_PATTERN.test(body.playerBId) ||
      body.playerAId === body.playerBId ||
      !(body.notes === null || typeof body.notes === "string") ||
      (typeof body.notes === "string" && body.notes.trim().length > 1000)
    ) {
      return NextResponse.json({ error: "Elige dos jugadores distintos." }, { status: 400 });
    }

    const playerResponse = await supabase
      .from("players")
      .select("id")
      .in("id", [body.playerAId, body.playerBId])
      .eq("is_active", true);
    if (playerResponse.error) {
      console.error("Failed to validate individual match players:", playerResponse.error.message);
      return NextResponse.json({ error: "No se pudieron comprobar los participantes." }, { status: 503 });
    }
    if (playerResponse.data.length !== 2) {
      return NextResponse.json({ error: "Los dos participantes deben tener una cuenta activa." }, { status: 400 });
    }

    const pendingResponse = await supabase
      .from("individual_matches")
      .select("id,player_a_id,player_b_id")
      .in("status", ["draft", "pending"])
      .or(
        `player_a_id.eq.${body.playerAId},player_b_id.eq.${body.playerAId},player_a_id.eq.${body.playerBId},player_b_id.eq.${body.playerBId}`,
      )
      .limit(1);
    if (pendingResponse.error) {
      console.error(
        "Failed to check pending individual matches:",
        pendingResponse.error.message,
      );
      return NextResponse.json({ error: "No se pudo comprobar si ya hay un combate pendiente." }, { status: 503 });
    }
    if ((pendingResponse.data ?? []).length > 0) {
      return NextResponse.json(
        { error: "Uno de los dos jugadores ya tiene un combate individual pendiente." },
        { status: 409 },
      );
    }

    const insertResponse = await supabase
      .from("individual_matches")
      .insert({
        player_a_id: body.playerAId,
        player_b_id: body.playerBId,
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
        created_by_player_id: authorization.player.id,
      })
      .select("id")
      .single();

    if (insertResponse.error) {
      console.error("Failed to create individual match:", insertResponse.error.message);
      return NextResponse.json({ error: "No se pudo crear el combate individual." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, id: insertResponse.data.id });
  }

  if (
    body.kind === "tournament" &&
    typeof body.name === "string" &&
    Array.isArray(body.playerIds) &&
    body.playerIds.every((id) => typeof id === "string" && UUID_PATTERN.test(id))
  ) {
    const response = await supabase.rpc("create_tournament_bracket", {
      p_name: body.name,
      p_player_ids: body.playerIds,
      p_created_by_player_id: authorization.player.id,
    });
    if (response.error) {
      console.error("Failed to create Consonancia tournament:", response.error.message);
      return NextResponse.json(
        { error: response.error.code === "42501"
          ? "Solo la cuenta organizadora puede crear torneos."
          : response.error.message.includes("participantes")
            ? response.error.message
            : "No se pudo crear el torneo. Comprueba que la migración esté aplicada." },
        { status: response.error.code === "42501" ? 403 : 400 },
      );
    }
    return NextResponse.json({ ok: true, id: response.data });
  }

  return NextResponse.json({ error: "El tipo de operación no es válido." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const authorization = await getOrganizer(request);
  if (authorization.response) return authorization.response;

  const body = await readBody(request);
  if (body instanceof NextResponse) return body;
  if (!isRecord(body) || typeof body.action !== "string") {
    return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (
    body.action === "archive-tournament" &&
    typeof body.tournamentId === "string" &&
    UUID_PATTERN.test(body.tournamentId)
  ) {
    const response = await supabase.rpc("archive_consonancia_tournament", {
      p_tournament_id: body.tournamentId,
      p_organizer_player_id: authorization.player.id,
    });
    if (response.error) {
      console.error("Failed to archive Consonancia tournament:", response.error.message);
      return NextResponse.json(
        {
          error:
            response.error.code === "42501"
              ? "Solo la cuenta organizadora puede archivar torneos."
              : "No se pudo archivar el torneo. Comprueba que todos los combates estén terminados y que la migración esté aplicada.",
        },
        { status: response.error.code === "42501" ? 403 : 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (
    body.action === "archive-individual-round" &&
    typeof body.roundId === "string" &&
    UUID_PATTERN.test(body.roundId)
  ) {
    const response = await supabase.rpc("archive_individual_match_round", {
      p_round_id: body.roundId,
      p_organizer_player_id: authorization.player.id,
    });
    if (response.error) {
      console.error("Failed to archive Consonancia individual round:", response.error.message);
      return NextResponse.json(
        {
          error:
            response.error.code === "42501"
              ? "Solo la cuenta organizadora puede archivar rondas."
              : "No se pudo archivar la ronda. Comprueba que todos los combates estén terminados y que la migración esté aplicada.",
        },
        { status: response.error.code === "42501" ? 403 : 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (
    body.action === "publish" &&
    typeof body.tournamentId === "string" &&
    UUID_PATTERN.test(body.tournamentId)
  ) {
    const participantCountResponse = await supabase
      .from("tournament_participants")
      .select("player_id", { count: "exact", head: true })
      .eq("tournament_id", body.tournamentId);
    if (participantCountResponse.error) {
      console.error("Failed to check Consonancia tournament participants:", participantCountResponse.error.message);
      return NextResponse.json({ error: "No se pudieron comprobar los participantes." }, { status: 503 });
    }
    if ((participantCountResponse.count ?? 0) < 2) {
      return NextResponse.json({ error: "Añade al menos dos participantes antes de publicar." }, { status: 409 });
    }

    const response = await supabase
      .from("tournaments")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", body.tournamentId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (response.error) {
      console.error("Failed to publish Consonancia tournament:", response.error.message);
      return NextResponse.json({ error: "No se pudo publicar el torneo." }, { status: 503 });
    }
    if (!response.data) {
      return NextResponse.json({ error: "No se encontró un borrador de torneo publicable." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  if (
    body.action === "winner" &&
    typeof body.matchId === "string" &&
    UUID_PATTERN.test(body.matchId) &&
    typeof body.winnerPlayerId === "string" &&
    UUID_PATTERN.test(body.winnerPlayerId)
  ) {
    const response = await supabase.rpc("set_tournament_match_winner", {
      p_match_id: body.matchId,
      p_winner_player_id: body.winnerPlayerId,
      p_organizer_player_id: authorization.player.id,
    });
    if (response.error) {
      console.error("Failed to record Consonancia tournament result:", response.error.message);
      return NextResponse.json(
        { error: response.error.code === "42501" ? "Solo la cuenta organizadora puede gestionar el torneo." : "No se pudo guardar el resultado del combate." },
        { status: response.error.code === "42501" ? 403 : 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (
    body.action === "clear-winner" &&
    typeof body.matchId === "string" &&
    UUID_PATTERN.test(body.matchId)
  ) {
    const response = await supabase.rpc("clear_tournament_match_result", {
      p_match_id: body.matchId,
      p_organizer_player_id: authorization.player.id,
    });
    if (response.error) {
      console.error("Failed to clear Consonancia tournament result:", response.error.message);
      return NextResponse.json(
        {
          error:
            response.error.code === "42501"
              ? "Solo la cuenta organizadora puede gestionar el torneo."
              : "No se pudo quitar el resultado del combate.",
        },
        { status: response.error.code === "42501" ? 403 : 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (
    body.action === "individual-winner" &&
    typeof body.matchId === "string" &&
    UUID_PATTERN.test(body.matchId) &&
    typeof body.winnerPlayerId === "string" &&
    UUID_PATTERN.test(body.winnerPlayerId)
  ) {
    const response = await supabase.rpc("set_individual_match_winner", {
      p_match_id: body.matchId,
      p_winner_player_id: body.winnerPlayerId,
      p_organizer_player_id: authorization.player.id,
    });

    if (response.error) {
      console.error("Failed to record individual match result:", response.error.message);
      return NextResponse.json(
        {
          error:
            response.error.code === "42501"
              ? "Solo la cuenta organizadora puede gestionar los combates."
              : "No se pudo guardar el resultado. El combate debe seguir activo y el ganador pertenecer al cruce.",
        },
        { status: response.error.code === "42501" ? 403 : 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (
    body.action === "round-slot" &&
    typeof body.matchId === "string" &&
    UUID_PATTERN.test(body.matchId) &&
    (body.slot === 1 || body.slot === 2) &&
    typeof body.playerId === "string" &&
    UUID_PATTERN.test(body.playerId)
  ) {
    const response = await supabase.rpc("set_individual_match_round_slot", {
      p_match_id: body.matchId,
      p_slot: body.slot,
      p_player_id: body.playerId,
      p_organizer_player_id: authorization.player.id,
    });
    if (response.error) {
      console.error("Failed to update randomized individual round:", response.error.message);
      return NextResponse.json(
        { error: response.error.code === "42501" ? "Solo la cuenta organizadora puede editar rondas." : "No se pudo cambiar el cruce. Solo se pueden editar rondas en borrador." },
        { status: response.error.code === "42501" ? 403 : 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (
    body.action === "publish-round" &&
    typeof body.roundId === "string" &&
    UUID_PATTERN.test(body.roundId)
  ) {
    const response = await supabase.rpc("publish_individual_match_round", {
      p_round_id: body.roundId,
      p_organizer_player_id: authorization.player.id,
    });
    if (response.error) {
      console.error("Failed to publish randomized individual round:", response.error.message);
      return NextResponse.json(
        { error: response.error.code === "42501" ? "Solo la cuenta organizadora puede publicar rondas." : "No se pudo publicar la ronda. Comprueba que los cruces estén completos." },
        { status: response.error.code === "42501" ? 403 : 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (
    body.action === "slot" &&
    typeof body.matchId === "string" &&
    UUID_PATTERN.test(body.matchId) &&
    (body.slot === 1 || body.slot === 2) &&
    (body.playerId === null ||
      (typeof body.playerId === "string" && UUID_PATTERN.test(body.playerId)))
  ) {
    const response = await supabase.rpc("set_tournament_bracket_slot", {
      p_match_id: body.matchId,
      p_slot: body.slot,
      p_player_id: body.playerId,
      p_organizer_player_id: authorization.player.id,
    });
    if (response.error) {
      console.error("Failed to update Consonancia tournament bracket:", response.error.message);
      return NextResponse.json(
        { error: response.error.code === "42501" ? "Solo la cuenta organizadora puede gestionar el torneo." : "No se pudo actualizar el cuadro. Solo se pueden editar borradores." },
        { status: response.error.code === "42501" ? 403 : 409 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "La operación no es válida." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const authorization = await getOrganizer(request);
  if (authorization.response) return authorization.response;

  const body = await readBody(request);
  if (body instanceof NextResponse) return body;
  if (!isRecord(body) || typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) {
    return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (body.kind === "individual-match") {
    const existing = await supabase
      .from("individual_matches")
      .select("id,round_id")
      .eq("id", body.id)
      .maybeSingle();
    if (existing.error) {
      console.error("Failed to load individual match for delete:", existing.error.message);
      return NextResponse.json({ error: "No se pudo borrar el combate." }, { status: 503 });
    }
    if (!existing.data) {
      return NextResponse.json({ error: "No se encontró el combate." }, { status: 404 });
    }
    const deleteResponse = await supabase
      .from("individual_matches")
      .delete()
      .eq("id", body.id)
      .select("id")
      .maybeSingle();
    if (deleteResponse.error) {
      console.error("Failed to delete individual match:", deleteResponse.error.message);
      return NextResponse.json({ error: "No se pudo borrar el combate." }, { status: 503 });
    }
    if (existing.data.round_id) {
      const pending = await supabase
        .from("individual_matches")
        .select("id")
        .eq("round_id", existing.data.round_id)
        .eq("status", "pending")
        .limit(1);
      if (!pending.error && (pending.data ?? []).length === 0) {
        await supabase
          .from("individual_match_rounds")
          .update({ status: "completed" })
          .eq("id", existing.data.round_id)
          .eq("status", "published");
      }
    }
    return NextResponse.json({ ok: true });
  }

  const response =
    body.kind === "tournament"
      ? await supabase
          .from("tournaments")
          .delete()
          .eq("id", body.id)
          .neq("status", "archived")
          .select("id")
          .maybeSingle()
      : body.kind === "individual-round"
        ? await supabase.rpc("delete_individual_match_round", {
            p_round_id: body.id,
            p_organizer_player_id: authorization.player.id,
          })
        : null;
  if (!response) {
    return NextResponse.json({ error: "El tipo de elemento no es válido." }, { status: 400 });
  }
  if (response.error) {
    console.error("Failed to delete Consonancia tournament, individual match, or round:", response.error.message);
    return NextResponse.json(
      { error: response.error.code === "42501" ? "Solo la cuenta organizadora puede borrar torneos y combates." : "No se pudo borrar el torneo o combate." },
      { status: response.error.code === "42501" ? 403 : 409 },
    );
  }
  if (body.kind === "tournament" && !response.data) {
    return NextResponse.json({ error: "No se encontró el torneo que quieres borrar." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
