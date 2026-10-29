import "server-only";

import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

export type CompetitionHistoryMatch = {
  roundNumber: number;
  matchNumber: number;
  playerAName: string;
  playerBName: string;
  winnerName: string | null;
  status: string;
  replayUrl: string | null;
};

export type CompetitionHistoryEntry = {
  id: string;
  kind: "tournament" | "individual_round";
  name: string;
  archivedAt: string | null;
  participants: string[];
  matches: CompetitionHistoryMatch[];
};

export type CompetitionHistoryData =
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" }
  | { status: "ready"; competitions: CompetitionHistoryEntry[] };

export type StandaloneIndividualHistoryMatch = {
  id: string;
  playerAName: string;
  playerBName: string;
  winnerName: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
  replayUrl: string | null;
};

export type IndividualCombatHistoryData =
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" }
  | {
      status: "ready";
      rounds: CompetitionHistoryEntry[];
      matches: StandaloneIndividualHistoryMatch[];
    };

export async function getTournamentHistoryData(): Promise<CompetitionHistoryData> {
  return getCompetitionHistoryData("tournament");
}

export async function getCompetitionHistoryData(
  kind?: "tournament" | "individual_round",
): Promise<CompetitionHistoryData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const supabase = createSupabaseAdminClient();
  const loadTournaments = kind !== "individual_round";
  const loadRounds = kind !== "tournament";
  const [tournamentsResponse, roundsResponse] = await Promise.all([
    loadTournaments
      ? supabase
          .from("tournaments")
          .select("id,name,archived_at")
          .eq("status", "archived")
          .order("archived_at", { ascending: false, nullsFirst: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    loadRounds
      ? supabase
          .from("individual_match_rounds")
          .select("id,name,round_number,rest_player_id,archived_at")
          .eq("status", "archived")
          .order("archived_at", { ascending: false, nullsFirst: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const initialError = tournamentsResponse.error ?? roundsResponse.error;
  if (initialError) {
    console.error("Failed to load Consonancia competition history:", initialError.message);
    return { status: "error" };
  }

  const tournaments = tournamentsResponse.data ?? [];
  const rounds = roundsResponse.data ?? [];
  const tournamentIds = tournaments.map((item) => item.id);
  const roundIds = rounds.map((item) => item.id);
  const [participantsResponse, tournamentMatchesResponse, roundMatchesResponse] =
    await Promise.all([
      tournamentIds.length > 0
        ? supabase
            .from("tournament_participants")
            .select("tournament_id,player_id")
            .in("tournament_id", tournamentIds)
        : Promise.resolve({ data: [], error: null }),
      tournamentIds.length > 0
        ? supabase
            .from("tournament_matches")
            .select("tournament_id,round_number,match_number,player_a_id,player_b_id,winner_player_id,status,showdown_replay_url")
            .in("tournament_id", tournamentIds)
            .order("round_number")
            .order("match_number")
        : Promise.resolve({ data: [], error: null }),
      roundIds.length > 0
        ? supabase
            .from("individual_matches")
            .select("round_id,round_match_number,player_a_id,player_b_id,winner_player_id,status,showdown_replay_url")
            .in("round_id", roundIds)
            .order("round_match_number")
        : Promise.resolve({ data: [], error: null }),
    ]);
  const competitionError =
    participantsResponse.error ??
    tournamentMatchesResponse.error ??
    roundMatchesResponse.error;
  if (competitionError) {
    console.error("Failed to load archived Consonancia results:", competitionError.message);
    return { status: "error" };
  }

  const playerIds = [
    ...new Set(
      [
        ...(participantsResponse.data ?? []).map((item) => item.player_id),
        ...(tournamentMatchesResponse.data ?? []).flatMap((item) => [
          item.player_a_id,
          item.player_b_id,
          item.winner_player_id,
        ]),
        ...(roundMatchesResponse.data ?? []).flatMap((item) => [
          item.player_a_id,
          item.player_b_id,
          item.winner_player_id,
        ]),
        ...rounds.map((item) => item.rest_player_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  const playersResponse = playerIds.length > 0
    ? await supabase.from("players").select("id,display_name").in("id", playerIds)
    : { data: [], error: null };
  if (playersResponse.error) {
    console.error("Failed to load archived competition player names:", playersResponse.error.message);
    return { status: "error" };
  }
  const playerNames = new Map(
    (playersResponse.data ?? []).map((player) => [player.id, player.display_name]),
  );
  const nameFor = (id: string | null) =>
    id ? playerNames.get(id) ?? "Jugador" : "Vacante";

  const competitions: CompetitionHistoryEntry[] = [
    ...tournaments.map((tournament) => ({
      id: tournament.id,
      kind: "tournament" as const,
      name: tournament.name,
      archivedAt: tournament.archived_at,
      participants: (participantsResponse.data ?? [])
        .filter((participant) => participant.tournament_id === tournament.id)
        .map((participant) => nameFor(participant.player_id))
        .sort((a, b) => a.localeCompare(b, "es")),
      matches: (tournamentMatchesResponse.data ?? [])
        .filter((match) => match.tournament_id === tournament.id)
        .map((match) => ({
          roundNumber: match.round_number,
          matchNumber: match.match_number,
          playerAName: nameFor(match.player_a_id),
          playerBName: nameFor(match.player_b_id),
          winnerName: match.winner_player_id ? nameFor(match.winner_player_id) : null,
          status: match.status,
          replayUrl: typeof match.showdown_replay_url === "string" ? match.showdown_replay_url : null,
        })),
    })),
    ...rounds.map((round) => ({
      id: round.id,
      kind: "individual_round" as const,
      name: round.name,
      archivedAt: round.archived_at,
      participants: [
        ...new Set(
          (roundMatchesResponse.data ?? [])
            .filter((match) => match.round_id === round.id)
            .flatMap((match) => [
              nameFor(match.player_a_id),
              nameFor(match.player_b_id),
            ])
            .concat(round.rest_player_id ? [nameFor(round.rest_player_id)] : []),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
      matches: (roundMatchesResponse.data ?? [])
        .filter((match) => match.round_id === round.id)
        .map((match) => ({
          roundNumber: round.round_number,
          matchNumber: match.round_match_number ?? 1,
          playerAName: nameFor(match.player_a_id),
          playerBName: nameFor(match.player_b_id),
          winnerName: match.winner_player_id ? nameFor(match.winner_player_id) : null,
          status: match.status,
          replayUrl: typeof match.showdown_replay_url === "string" ? match.showdown_replay_url : null,
        })),
    })),
  ].sort((a, b) => {
    const aDate = a.archivedAt ? Date.parse(a.archivedAt) : 0;
    const bDate = b.archivedAt ? Date.parse(b.archivedAt) : 0;
    return bDate - aDate;
  });

  return { status: "ready", competitions };
}

export async function getIndividualCombatHistoryData(): Promise<IndividualCombatHistoryData> {
  const roundsHistory = await getCompetitionHistoryData("individual_round");
  if (roundsHistory.status !== "ready") {
    return roundsHistory;
  }

  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const matchesResponse = await supabase
      .from("individual_matches")
      .select(
        "id,player_a_id,player_b_id,winner_player_id,status,completed_at,created_at,showdown_replay_url",
      )
      .is("round_id", null)
      .in("status", ["completed", "forfeit"])
      .order("completed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (matchesResponse.error) {
      console.error(
        "Failed to load standalone individual match history:",
        matchesResponse.error.message,
      );
      return { status: "error" };
    }

    const rows = matchesResponse.data ?? [];
    const playerIds = [
      ...new Set(
        rows.flatMap((row) => [row.player_a_id, row.player_b_id, row.winner_player_id]).filter(
          (id): id is string => typeof id === "string",
        ),
      ),
    ];
    const playersResponse =
      playerIds.length > 0
        ? await supabase.from("players").select("id,display_name").in("id", playerIds)
        : { data: [], error: null };
    if (playersResponse.error) {
      console.error(
        "Failed to load individual history player names:",
        playersResponse.error.message,
      );
      return { status: "error" };
    }
    const playerNames = new Map(
      (playersResponse.data ?? []).map((player) => [player.id, player.display_name]),
    );
    const nameFor = (id: string | null) =>
      id ? (playerNames.get(id) ?? "Jugador") : "Vacante";

    return {
      status: "ready",
      rounds: roundsHistory.competitions,
      matches: rows.map((row) => ({
        id: row.id,
        playerAName: nameFor(row.player_a_id),
        playerBName: nameFor(row.player_b_id),
        winnerName: row.winner_player_id ? nameFor(row.winner_player_id) : null,
        status: row.status,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        replayUrl: typeof row.showdown_replay_url === "string" ? row.showdown_replay_url : null,
      })),
    };
  } catch (error) {
    console.error(
      "Failed to load individual combat history:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { status: "error" };
  }
}
