import "server-only";

import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

export type PlayerPokepasteHistoryEntry = {
  id: string;
  competitionName: string;
  competitionKind: "tournament" | "individual_round";
  roundNumber: number;
  matchNumber: number;
  opponentName: string;
  pokepasteUrl: string;
  playedAt: string | null;
  archivedAt: string;
};

export type PlayerPokepasteHistory =
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" }
  | { status: "ready"; entries: PlayerPokepasteHistoryEntry[] };

export async function getPlayerPokepasteHistory(
  playerId: string,
): Promise<PlayerPokepasteHistory> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const response = await createSupabaseAdminClient()
    .from("player_pokepaste_history")
    .select(
      "id,competition_id,competition_name,competition_kind,round_number,match_number,opponent_name,pokepaste_url,played_at,archived_at",
    )
    .eq("player_id", playerId)
    .order("archived_at", { ascending: false })
    .limit(1000);

  if (response.error) {
    console.error("Failed to load player Poképaste history:", response.error.message);
    return { status: "error" };
  }

  const entriesByTeam = new Map<string, PlayerPokepasteHistoryEntry>();
  for (const entry of response.data) {
    const kind = entry.competition_kind as PlayerPokepasteHistoryEntry["competitionKind"];
    const key =
      kind === "tournament"
        ? `tournament:${entry.competition_id}`
        : `individual:${entry.pokepaste_url}`;
    if (entriesByTeam.has(key)) continue;

    entriesByTeam.set(key, {
      id: entry.id,
      competitionName:
        kind === "individual_round" ? "Combates individuales" : entry.competition_name,
      competitionKind: kind,
      roundNumber: entry.round_number,
      matchNumber: entry.match_number,
      opponentName: entry.opponent_name,
      pokepasteUrl: entry.pokepaste_url,
      playedAt: entry.played_at,
      archivedAt: entry.archived_at,
    });
  }

  return {
    status: "ready",
    entries: [...entriesByTeam.values()],
  };
}
