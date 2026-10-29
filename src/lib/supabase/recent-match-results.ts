import "server-only";

import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

const RESULTS_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export type RecentMatchResult = {
  id: string;
  kind: "individual" | "tournament";
  playerAName: string;
  playerBName: string;
  winnerName: string;
  replayUrl: string | null;
  completedAt: string;
};

export async function getRecentMatchResults(): Promise<RecentMatchResult[]> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status !== "configured") return [];

  const since = new Date(Date.now() - RESULTS_WINDOW_MS).toISOString();
  const supabase = createSupabaseAdminClient();

  const [individualResponse, tournamentResponse] = await Promise.all([
    supabase
      .from("individual_matches")
      .select(
        "id,player_a_id,player_b_id,winner_player_id,completed_at,showdown_replay_url",
      )
      .in("status", ["completed", "forfeit"])
      .not("winner_player_id", "is", null)
      .gte("completed_at", since)
      .order("completed_at", { ascending: false })
      .limit(12),
    supabase
      .from("tournament_matches")
      .select(
        "id,player_a_id,player_b_id,winner_player_id,completed_at,showdown_replay_url",
      )
      .in("status", ["completed", "forfeit"])
      .not("winner_player_id", "is", null)
      .gte("completed_at", since)
      .order("completed_at", { ascending: false })
      .limit(12),
  ]);

  if (individualResponse.error) {
    console.error("Failed to load recent individual results:", individualResponse.error.message);
  }
  if (tournamentResponse.error) {
    console.error("Failed to load recent tournament results:", tournamentResponse.error.message);
  }

  const rows = [
    ...(individualResponse.data ?? []).map((row) => ({ ...row, kind: "individual" as const })),
    ...(tournamentResponse.data ?? []).map((row) => ({ ...row, kind: "tournament" as const })),
  ];
  if (rows.length === 0) return [];

  const playerIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.player_a_id, row.player_b_id, row.winner_player_id])
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const playersResponse = await supabase
    .from("players")
    .select("id,display_name")
    .in("id", playerIds);
  if (playersResponse.error) {
    console.error("Failed to load recent result player names:", playersResponse.error.message);
    return [];
  }
  const names = new Map(
    (playersResponse.data ?? []).map((player) => [player.id, player.display_name]),
  );
  const nameFor = (id: string | null) =>
    id ? (names.get(id) ?? "Jugador") : "Jugador";

  return rows
    .filter((row): row is typeof row & { completed_at: string; winner_player_id: string } =>
      typeof row.completed_at === "string" && typeof row.winner_player_id === "string",
    )
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      playerAName: nameFor(row.player_a_id),
      playerBName: nameFor(row.player_b_id),
      winnerName: nameFor(row.winner_player_id),
      replayUrl: typeof row.showdown_replay_url === "string" ? row.showdown_replay_url : null,
      completedAt: row.completed_at,
    }))
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))
    .slice(0, 8);
}
