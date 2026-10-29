import "server-only";

import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

const RESULTS_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const MATCH_SELECT =
  "id,player_a_id,player_b_id,winner_player_id,completed_at,created_at";

export type RecentMatchResult = {
  id: string;
  kind: "individual" | "tournament";
  playerAName: string;
  playerBName: string;
  winnerName: string;
  replayUrl: string | null;
  completedAt: string;
};

function closedAt(row: { completed_at: string | null; created_at: string | null }) {
  if (typeof row.completed_at === "string") return row.completed_at;
  if (typeof row.created_at === "string") return row.created_at;
  return null;
}

async function loadClosedMatches(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  table: "individual_matches" | "tournament_matches",
) {
  const response = await supabase
    .from(table)
    .select(MATCH_SELECT)
    .in("status", ["completed", "forfeit"])
    .not("winner_player_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(24);

  if (response.error) {
    console.error(`Failed to load recent ${table} results:`, response.error.message);
    return [];
  }

  return response.data ?? [];
}

async function loadReplayUrls(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  table: "individual_matches" | "tournament_matches",
  ids: string[],
) {
  if (ids.length === 0) return new Map<string, string>();

  const response = await supabase.from(table).select("id,showdown_replay_url").in("id", ids);
  if (response.error) return new Map<string, string>();

  return new Map(
    (response.data ?? [])
      .filter((row) => typeof row.showdown_replay_url === "string" && row.showdown_replay_url)
      .map((row) => [row.id, row.showdown_replay_url as string]),
  );
}

export async function getRecentMatchResults(): Promise<RecentMatchResult[]> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status !== "configured") return [];

  const since = Date.now() - RESULTS_WINDOW_MS;
  const supabase = createSupabaseAdminClient();

  const [individualRows, tournamentRows] = await Promise.all([
    loadClosedMatches(supabase, "individual_matches"),
    loadClosedMatches(supabase, "tournament_matches"),
  ]);

  const rows = [
    ...individualRows.map((row) => ({ ...row, kind: "individual" as const })),
    ...tournamentRows.map((row) => ({ ...row, kind: "tournament" as const })),
  ];
  if (rows.length === 0) return [];

  const playerIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.player_a_id, row.player_b_id, row.winner_player_id])
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const [playersResponse, individualReplays, tournamentReplays] = await Promise.all([
    supabase.from("players").select("id,display_name").in("id", playerIds),
    loadReplayUrls(
      supabase,
      "individual_matches",
      individualRows.map((row) => row.id),
    ),
    loadReplayUrls(
      supabase,
      "tournament_matches",
      tournamentRows.map((row) => row.id),
    ),
  ]);
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
    .map((row) => {
      const completedAt = closedAt(row);
      if (!completedAt || Date.parse(completedAt) < since) return null;
      if (typeof row.winner_player_id !== "string") return null;
      const replayUrl =
        row.kind === "individual"
          ? (individualReplays.get(row.id) ?? null)
          : (tournamentReplays.get(row.id) ?? null);
      return {
        id: row.id,
        kind: row.kind,
        playerAName: nameFor(row.player_a_id),
        playerBName: nameFor(row.player_b_id),
        winnerName: nameFor(row.winner_player_id),
        replayUrl,
        completedAt,
      };
    })
    .filter((row): row is RecentMatchResult => row !== null)
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))
    .slice(0, 8);
}
