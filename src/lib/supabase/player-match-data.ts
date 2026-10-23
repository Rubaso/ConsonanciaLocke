import "server-only";

import type { PlayerSession } from "@/lib/auth";
import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

export type MatchPaste = {
  kind: "url";
  content: string;
};

type ReadyMatch = {
  status: "ready";
  matchId: string;
  tournamentName: string;
  phase: string;
  roundNumber: number;
  matchNumber: number;
  scheduledAt: string | null;
  opponentName: string;
  opponentColor: string;
  ownPaste: MatchPaste | null;
  opponentPaste: MatchPaste | null;
  ownPasteSubmitted: boolean;
  opponentPasteSubmitted: boolean;
  competitionLaunched: boolean;
  pasteLocked: boolean;
};

export type PlayerMatchData =
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "migration-required" }
  | { status: "error" }
  | { status: "no-match" }
  | ReadyMatch;

type MatchRow = {
  id: string;
  player_a_id: string;
  player_b_id: string;
  player_a_pokepaste_url: string | null;
  player_b_pokepaste_url: string | null;
  scheduled_at: string | null;
};

function parsePaste(url: unknown): MatchPaste | null {
  if (url !== null && typeof url !== "string") {
    throw new Error("Supabase returned an invalid match Poképaste");
  }
  return typeof url === "string" ? { kind: "url", content: url } : null;
}

function isMissingTournamentPokepasteSchema(message: string) {
  return (
    message.includes("tournament_matches.player_a_pokepaste_url") &&
    message.includes("does not exist")
  );
}

async function buildReadyMatch(
  player: PlayerSession,
  match: MatchRow,
  details: {
    tournamentName: string;
    phase: string;
    roundNumber: number;
    matchNumber: number;
    launched: boolean;
    lockOnSubmit: boolean;
  },
): Promise<ReadyMatch | { status: "error" }> {
  const playerIsA = match.player_a_id === player.id;
  const opponentId = playerIsA ? match.player_b_id : match.player_a_id;
  if (
    typeof match.id !== "string" ||
    typeof opponentId !== "string" ||
    !(match.scheduled_at === null || typeof match.scheduled_at === "string")
  ) {
    console.error("Supabase returned an invalid Consonancia match.");
    return { status: "error" };
  }

  const opponentResponse = await createSupabaseAdminClient()
    .from("players")
    .select("display_name,color")
    .eq("id", opponentId)
    .eq("is_active", true)
    .maybeSingle();
  if (opponentResponse.error || !opponentResponse.data) {
    console.error(
      "Failed to load Consonancia match opponent:",
      opponentResponse.error?.message ?? "Opponent account not found",
    );
    return { status: "error" };
  }
  if (
    typeof opponentResponse.data.display_name !== "string" ||
    typeof opponentResponse.data.color !== "string" ||
    !/^#[0-9A-Fa-f]{6}$/.test(opponentResponse.data.color)
  ) {
    console.error("Supabase returned an invalid Consonancia match opponent.");
    return { status: "error" };
  }

  try {
    const ownPasteUrl = playerIsA
      ? match.player_a_pokepaste_url
      : match.player_b_pokepaste_url;
    const opponentPasteUrl = playerIsA
      ? match.player_b_pokepaste_url
      : match.player_a_pokepaste_url;
    const bothPastesSubmitted = Boolean(ownPasteUrl && opponentPasteUrl);

    return {
      status: "ready",
      matchId: match.id,
      tournamentName: details.tournamentName,
      phase: details.phase,
      roundNumber: details.roundNumber,
      matchNumber: details.matchNumber,
      scheduledAt: match.scheduled_at,
      opponentName: opponentResponse.data.display_name,
      opponentColor: opponentResponse.data.color,
      ownPaste: parsePaste(ownPasteUrl),
      opponentPaste:
        details.launched && bothPastesSubmitted
          ? parsePaste(opponentPasteUrl)
          : null,
      ownPasteSubmitted: Boolean(ownPasteUrl),
      opponentPasteSubmitted: details.launched && Boolean(opponentPasteUrl),
      competitionLaunched: details.launched,
      pasteLocked: details.lockOnSubmit && details.launched && Boolean(ownPasteUrl),
    };
  } catch (error) {
    console.error(
      "Invalid Consonancia match Poképaste data:",
      error instanceof Error ? error.message : "Unknown response error",
    );
    return { status: "error" };
  }
}

export async function getPlayerMatchData(
  player: PlayerSession,
): Promise<PlayerMatchData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const supabase = createSupabaseAdminClient();
  let draftMatchCandidate: {
    match: MatchRow;
    details: {
      tournamentName: string;
      phase: string;
      roundNumber: number;
      matchNumber: number;
      launched: boolean;
      lockOnSubmit: boolean;
    };
  } | null = null;
  const tournamentsResponse = await supabase
    .from("tournaments")
    .select("id,name,status")
    .in("status", ["published", "in_progress", "draft"])
    .order("created_at", { ascending: false });

  if (tournamentsResponse.error) {
    console.error(
      "Failed to load active Consonancia tournaments:",
      tournamentsResponse.error.message,
    );
    return { status: "error" };
  }

  const tournamentNames = new Map<string, { name: string; launched: boolean }>();
  for (const tournament of tournamentsResponse.data) {
    if (
      typeof tournament.id !== "string" ||
      typeof tournament.name !== "string" ||
      typeof tournament.status !== "string"
    ) {
      console.error("Supabase returned an invalid active tournament.");
      return { status: "error" };
    }
    tournamentNames.set(tournament.id, {
      name: tournament.name,
      launched: tournament.status !== "draft",
    });
  }

  if (tournamentNames.size > 0) {
    const matchesResponse = await supabase
      .from("tournament_matches")
      .select(
        "id,tournament_id,phase,round_number,match_number,player_a_id,player_b_id,status,scheduled_at,player_a_pokepaste_url,player_b_pokepaste_url",
      )
      .in("tournament_id", [...tournamentNames.keys()])
      .or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`)
      .eq("status", "pending")
      .not("player_a_id", "is", null)
      .not("player_b_id", "is", null)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true })
      .limit(40);

    if (matchesResponse.error) {
      console.error(
        "Failed to load Consonancia player matches:",
        matchesResponse.error.message,
      );
      if (isMissingTournamentPokepasteSchema(matchesResponse.error.message)) {
        return { status: "migration-required" };
      }
      return { status: "error" };
    }

    const match = matchesResponse.data.find(
      (candidate) => tournamentNames.get(candidate.tournament_id)?.launched,
    ) ?? matchesResponse.data[0];
    if (match) {
      const tournament = tournamentNames.get(match.tournament_id);
      if (
        !tournament ||
        typeof match.round_number !== "number" ||
        typeof match.match_number !== "number" ||
        typeof match.phase !== "string"
      ) {
        console.error("Supabase returned an invalid Consonancia tournament match.");
        return { status: "error" };
      }
      const details = {
        tournamentName: tournament.name,
        phase: match.phase,
        roundNumber: match.round_number,
        matchNumber: match.match_number,
        launched: tournament.launched,
        lockOnSubmit: true,
      };
      if (tournament.launched) {
        return buildReadyMatch(player, match, details);
      }
      draftMatchCandidate = { match, details: { ...details, launched: false } };
    }
  }

  const roundsResponse = await supabase
    .from("individual_match_rounds")
    .select("id,name,round_number,status")
    .in("status", ["published", "draft"])
    .order("round_number", { ascending: false });
  if (roundsResponse.error) {
    console.error("Failed to load Consonancia individual rounds:", roundsResponse.error.message);
    return { status: "error" };
  }

  const rounds = new Map(
    roundsResponse.data.map((round) => [
      round.id,
      {
        name: round.name,
        roundNumber: round.round_number,
        launched: round.status === "published",
      },
    ]),
  );
  if (rounds.size > 0) {
    const roundMatchesResponse = await supabase
      .from("individual_matches")
      .select(
        "id,round_id,round_match_number,player_a_id,player_b_id,status,scheduled_at,player_a_pokepaste_url,player_b_pokepaste_url",
      )
      .in("round_id", [...rounds.keys()])
      .or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`)
      .in("status", ["draft", "pending"])
      .order("round_match_number", { ascending: true })
      .limit(40);
    if (roundMatchesResponse.error) {
      console.error(
        "Failed to load Consonancia individual round matches:",
        roundMatchesResponse.error.message,
      );
      return { status: "error" };
    }

    const match = roundMatchesResponse.data.find(
      (candidate) => candidate.round_id && rounds.get(candidate.round_id)?.launched,
    ) ?? roundMatchesResponse.data[0];
    if (match?.round_id) {
      const round = rounds.get(match.round_id);
      if (!round || typeof match.round_match_number !== "number") {
        console.error("Supabase returned an invalid Consonancia individual round match.");
        return { status: "error" };
      }
      const details = {
        tournamentName: round.name,
        phase: "Combate individual",
        roundNumber: round.roundNumber,
        matchNumber: match.round_match_number,
        launched: round.launched,
        lockOnSubmit: true,
      };
      if (round.launched) {
        return buildReadyMatch(player, match, details);
      }
      draftMatchCandidate ??= { match, details: { ...details, launched: false } };
    }
  }

  const individualMatchResponse = await supabase
    .from("individual_matches")
    .select(
      "id,player_a_id,player_b_id,status,scheduled_at,player_a_pokepaste_url,player_b_pokepaste_url",
    )
    .is("round_id", null)
    .or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`)
    .eq("status", "pending")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (individualMatchResponse.error) {
    console.error(
      "Failed to load Consonancia individual match:",
      individualMatchResponse.error.message,
    );
    return { status: "error" };
  }
  if (!individualMatchResponse.data) {
    return draftMatchCandidate
      ? buildReadyMatch(player, draftMatchCandidate.match, draftMatchCandidate.details)
      : { status: "no-match" };
  }

  return buildReadyMatch(player, individualMatchResponse.data, {
    tournamentName: "Combate individual",
    phase: "Partida individual",
    roundNumber: 1,
    matchNumber: 1,
    launched: true,
    lockOnSubmit: false,
  });
}
