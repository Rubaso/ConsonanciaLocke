import "server-only";

import { getCurrentPlayer } from "@/lib/auth";
import type {
  IndividualMatchRoundSummary,
  IndividualMatchSummary,
  TournamentSummary,
} from "@/components/TournamentManager";
import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

export type TournamentManagementData =
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" }
  | {
      status: "ready";
      isOrganizer: boolean;
      activePlayers: { id: string; displayName: string; color: string }[];
      tournaments: TournamentSummary[];
      individualMatches: IndividualMatchSummary[];
      individualRounds: IndividualMatchRoundSummary[];
    };

export async function getTournamentManagementData(): Promise<TournamentManagementData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return { status: "not-configured", missingVariables: configuration.missingVariables };
  }

  const player = await getCurrentPlayer();
  const isOrganizer = player?.role === "organizer";
  const supabase = createSupabaseAdminClient();
  const tournamentStatuses = isOrganizer
    ? ["draft", "published", "in_progress", "completed"]
    : ["published", "in_progress", "completed"];

  const [
    tournamentsResponse,
    activePlayersResponse,
    individualMatchesResponse,
    individualRoundsResponse,
  ] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id,name,status,format_key")
      .in("status", tournamentStatuses)
      .order("created_at", { ascending: false })
      .limit(20),
    isOrganizer
      ? supabase
          .from("players")
          .select("id,display_name,color")
          .eq("is_active", true)
          .not("username", "ilike", "rubaso")
          .order("display_name")
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("individual_matches")
      .select("id,round_id,round_match_number,player_a_id,player_b_id,winner_player_id,status,showdown_replay_url")
      .in(
        "status",
        isOrganizer
          ? ["draft", "pending", "completed", "forfeit", "cancelled"]
          : ["pending", "completed", "forfeit"],
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("individual_match_rounds")
      .select("id,round_number,name,status,rest_player_id")
      .in("status", isOrganizer ? ["draft", "published", "completed"] : ["published", "completed"])
      .order("round_number", { ascending: false })
      .limit(50),
  ]);

  const loadError =
    tournamentsResponse.error ??
    activePlayersResponse.error ??
    individualMatchesResponse.error ??
    individualRoundsResponse.error;
  if (loadError) {
    console.error("Failed to load Consonancia tournament management:", loadError.message);
    return { status: "error" };
  }

  const tournamentRows = tournamentsResponse.data ?? [];
  const tournamentIds = tournamentRows.map((tournament) => tournament.id);
  const [participantsResponse, matchesResponse] =
    tournamentIds.length > 0
      ? await Promise.all([
          supabase
            .from("tournament_participants")
            .select("tournament_id,player_id")
            .in("tournament_id", tournamentIds),
          supabase
            .from("tournament_matches")
            .select("id,tournament_id,round_number,match_number,player_a_id,player_b_id,winner_player_id,status")
            .in("tournament_id", tournamentIds)
            .order("round_number")
            .order("match_number"),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
  const bracketError = participantsResponse.error ?? matchesResponse.error;
  if (bracketError) {
    console.error("Failed to load Consonancia tournament bracket data:", bracketError.message);
    return { status: "error" };
  }

  const allPlayerIds = [
    ...new Set(
      [
        ...(participantsResponse.data ?? []).map((participant) => participant.player_id),
        ...(matchesResponse.data ?? []).flatMap((match) => [
          match.player_a_id,
          match.player_b_id,
          match.winner_player_id,
        ]),
        ...(individualMatchesResponse.data ?? []).flatMap((match) => [
          match.player_a_id,
          match.player_b_id,
          match.winner_player_id,
        ]),
        ...(individualRoundsResponse.data ?? []).map((round) => round.rest_player_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const playerResponse = allPlayerIds.length
    ? await supabase
        .from("players")
        .select("id,display_name,color")
        .in("id", allPlayerIds)
    : { data: [], error: null };
  if (playerResponse.error) {
    console.error("Failed to load Consonancia tournament player names:", playerResponse.error.message);
    return { status: "error" };
  }

  const playerMap = new Map(
    (playerResponse.data ?? []).map((item) => [
      item.id,
      { id: item.id, displayName: item.display_name, color: item.color },
    ]),
  );
  const tournaments: TournamentSummary[] = tournamentRows.map((tournament) => ({
    id: tournament.id,
    name: tournament.name,
    status: tournament.status as TournamentSummary["status"],
    formatKey: tournament.format_key,
    participants: (participantsResponse.data ?? [])
      .filter((participant) => participant.tournament_id === tournament.id)
      .map((participant) => playerMap.get(participant.player_id))
      .filter((participant): participant is NonNullable<typeof participant> => Boolean(participant)),
    matches: (matchesResponse.data ?? [])
      .filter((match) => match.tournament_id === tournament.id)
      .map((match) => ({
        id: match.id,
        roundNumber: match.round_number,
        matchNumber: match.match_number,
        playerAId: match.player_a_id,
        playerBId: match.player_b_id,
        winnerPlayerId: match.winner_player_id,
        status: match.status as TournamentSummary["matches"][number]["status"],
      })),
  }));

  const individualMatches: IndividualMatchSummary[] =
    (individualMatchesResponse.data ?? []).map((match) => ({
      id: match.id,
      roundId: match.round_id,
      matchNumber: match.round_match_number,
      playerAId: match.player_a_id,
      playerBId: match.player_b_id,
      winnerPlayerId: match.winner_player_id,
      status: match.status as IndividualMatchSummary["status"],
      replayUrl:
        typeof match.showdown_replay_url === "string" ? match.showdown_replay_url : null,
    }));
  const individualRounds: IndividualMatchRoundSummary[] =
    (individualRoundsResponse.data ?? []).map((round) => {
      const matches = individualMatches
        .filter((match) => match.roundId === round.id)
        .sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));
      const playerIds = new Set<string>();
      for (const match of matches) {
        playerIds.add(match.playerAId);
        playerIds.add(match.playerBId);
      }
      if (round.rest_player_id) playerIds.add(round.rest_player_id);
      return {
        id: round.id,
        roundNumber: round.round_number,
        name: round.name,
        status: round.status as IndividualMatchRoundSummary["status"],
        restPlayerId: round.rest_player_id,
        players: [...playerIds]
          .map((id) => playerMap.get(id))
          .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate)),
        matches,
      };
    });

  return {
    status: "ready",
    isOrganizer,
    activePlayers: (activePlayersResponse.data ?? []).map((activePlayer) => ({
      id: activePlayer.id,
      displayName: activePlayer.display_name,
      color: activePlayer.color,
    })),
    tournaments,
    individualMatches,
    individualRounds,
  };
}
