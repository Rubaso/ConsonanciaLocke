import "server-only";

import { getCurrentPlayer, type PlayerSession } from "@/lib/auth";
import { getEligibleSpecies } from "@/lib/fishing-species";
import type {
  FishingContestStanding,
  FishingEligiblePokemon,
} from "@/lib/fishing-contest-types";
import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

export type {
  FishingContestStanding,
  FishingEligibleChoice,
  FishingEligiblePokemon,
} from "@/lib/fishing-contest-types";

export type FishingContest = {
  id: string;
  name: string;
  status: "active" | "ended";
  startedAt: string;
  endedAt: string | null;
};

export type FishingContestPageData =
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" }
  | {
      status: "ready";
      isOrganizer: boolean;
      player: PlayerSession | null;
      activeContest: FishingContest | null;
      endedContest: FishingContest | null;
      currentEntry: FishingContestStanding | null;
      organizerStandings: FishingContestStanding[];
      revealedStandings: FishingContestStanding[];
      eligiblePokemon: FishingEligiblePokemon[];
    };

export type FishingContestHistoryData =
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" }
  | {
      status: "ready";
      contests: Array<{
        contest: FishingContest;
        standings: FishingContestStanding[];
      }>;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseContest(value: unknown): FishingContest {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    (value.status !== "active" && value.status !== "ended") ||
    typeof value.started_at !== "string" ||
    !(typeof value.ended_at === "string" || value.ended_at === null)
  ) {
    throw new Error("Supabase returned an invalid fishing contest");
  }

  return {
    id: value.id,
    name: value.name,
    status: value.status,
    startedAt: value.started_at,
    endedAt: value.ended_at,
  };
}

function parseWeight(value: unknown) {
  const weight = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error("Supabase returned an invalid fishing weight");
  }
  return weight;
}

async function loadStandings(
  contestIds: string[],
  playerId?: string,
): Promise<FishingContestStanding[]> {
  if (contestIds.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("fishing_contest_entries")
    .select(
      "id,contest_id,player_id,pokemon_id,chosen_species,weight_kg,clip_url,is_disqualified,updated_at",
    )
    .in("contest_id", contestIds)
    .order("weight_kg", { ascending: false })
    .order("updated_at", { ascending: true });
  if (playerId) {
    query = query.eq("player_id", playerId);
  }
  const entriesResponse = await query;

  if (entriesResponse.error) {
    throw new Error(entriesResponse.error.message);
  }

  const rows = entriesResponse.data ?? [];
  const playerIds = [...new Set(rows.map((row) => row.player_id))];
  const pokemonIds = [
    ...new Set(
      rows
        .map((row) => row.pokemon_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const [playersResponse, pokemonResponse] = await Promise.all([
    playerIds.length > 0
      ? supabase.from("players").select("id,display_name,color").in("id", playerIds)
      : Promise.resolve({ data: [], error: null }),
    pokemonIds.length > 0
      ? supabase
          .from("pokemon")
          .select("id,species,form,nickname,is_shiny")
          .in("id", pokemonIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (playersResponse.error) throw new Error(playersResponse.error.message);
  if (pokemonResponse.error) throw new Error(pokemonResponse.error.message);

  const players = new Map(
    (playersResponse.data ?? []).map((player) => [
      player.id,
      { name: player.display_name, color: player.color },
    ]),
  );
  const pokemon = new Map(
    (pokemonResponse.data ?? []).map((item) => [item.id, item]),
  );

  return rows.map((row) => {
    const player = players.get(row.player_id);
    const source = row.pokemon_id ? pokemon.get(row.pokemon_id) : null;
    return {
      id: row.id,
      contestId: row.contest_id,
      playerId: row.player_id,
      playerName: player?.name ?? "Jugador",
      playerColor: player?.color ?? "#5ec4a0",
      pokemonId: row.pokemon_id,
      sourceSpecies: source?.species ?? null,
      nickname: source?.nickname ?? null,
      form: typeof source?.form === "number" ? source.form : 0,
      isShiny: source?.is_shiny === true,
      chosenSpecies: row.chosen_species,
      weightKg: parseWeight(row.weight_kg),
      clipUrl: row.clip_url,
      isDisqualified: row.is_disqualified === true,
      updatedAt: row.updated_at,
    };
  });
}

async function loadEligiblePokemon(playerId: string) {
  const supabase = createSupabaseAdminClient();
  const pokemon: FishingEligiblePokemon[] = [];
  const pageSize = 500;

  for (let offset = 0; ; offset += pageSize) {
    const response = await supabase
      .from("pokemon")
      .select(
        "id,species,form,nickname,level,is_shiny,team_position,origin_name,obtain_method",
      )
      .eq("player_id", playerId)
      .eq("present_in_save", true)
      .eq("status", "alive")
      .eq("obtain_method", 0)
      .order("team_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (response.error) throw new Error(response.error.message);

    for (const item of response.data ?? []) {
      const choices = getEligibleSpecies(item.species).map((entry) => ({
        species: entry.name,
        displayName: entry.name,
        weightKg: entry.weightKg,
      }));
      if (choices.length === 0) continue;
      pokemon.push({
        id: item.id,
        species: item.species,
        form: item.form,
        nickname: item.nickname,
        level: item.level,
        isShiny: item.is_shiny,
        teamPosition: item.team_position,
        originName: item.origin_name,
        choices,
      });
    }

    if ((response.data ?? []).length < pageSize) break;
  }

  return pokemon;
}

export async function getFishingContestPageData(): Promise<FishingContestPageData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  try {
    const player = await getCurrentPlayer();
    const supabase = createSupabaseAdminClient();
    const contestResponse = await supabase
      .from("fishing_contests")
      .select("id,name,status,started_at,ended_at")
      .eq("status", "active")
      .maybeSingle();

    if (contestResponse.error) {
      console.error(
        "Failed to load active fishing contest:",
        contestResponse.error.message,
      );
      return { status: "error" };
    }

    const activeContest = contestResponse.data
      ? parseContest(contestResponse.data)
      : null;
    let endedContest: FishingContest | null = null;
    if (!activeContest) {
      const endedResponse = await supabase
        .from("fishing_contests")
        .select("id,name,status,started_at,ended_at")
        .eq("status", "ended")
        .order("ended_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (endedResponse.error) {
        console.error(
          "Failed to load ended fishing contest:",
          endedResponse.error.message,
        );
        return { status: "error" };
      }
      endedContest = endedResponse.data ? parseContest(endedResponse.data) : null;
    }
    const isOrganizer = player?.role === "organizer";
    const currentEntry =
      player && activeContest
        ? ((await loadStandings([activeContest.id], player.id))[0] ?? null)
        : null;
    const organizerStandings =
      isOrganizer && activeContest ? await loadStandings([activeContest.id]) : [];
    const revealedStandings = endedContest
      ? await loadStandings([endedContest.id])
      : [];
    const eligiblePokemon =
      player && activeContest ? await loadEligiblePokemon(player.id) : [];

    return {
      status: "ready",
      isOrganizer,
      player,
      activeContest,
      endedContest,
      currentEntry,
      organizerStandings,
      revealedStandings,
      eligiblePokemon,
    };
  } catch (error) {
    console.error(
      "Failed to load fishing contest page:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { status: "error" };
  }
}

export async function getFishingContestHistoryData(): Promise<FishingContestHistoryData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const contestsResponse = await supabase
      .from("fishing_contests")
      .select("id,name,status,started_at,ended_at")
      .eq("status", "ended")
      .order("ended_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (contestsResponse.error) {
      console.error(
        "Failed to load fishing contest history:",
        contestsResponse.error.message,
      );
      return { status: "error" };
    }

    const contests = (contestsResponse.data ?? []).map(parseContest);
    const standings = await loadStandings(contests.map((contest) => contest.id));
    const entriesByContest = new Map<string, FishingContestStanding[]>();
    for (const standing of standings) {
      const list = entriesByContest.get(standing.contestId) ?? [];
      list.push(standing);
      entriesByContest.set(standing.contestId, list);
    }

    return {
      status: "ready",
      contests: contests.map((contest) => ({
        contest,
        standings: entriesByContest.get(contest.id) ?? [],
      })),
    };
  } catch (error) {
    console.error(
      "Failed to load fishing contest history:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { status: "error" };
  }
}

export function rankedStandings(standings: FishingContestStanding[]) {
  return [...standings].sort((left, right) => {
    if (right.weightKg !== left.weightKg) return right.weightKg - left.weightKg;
    return Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
  });
}

export function fishingContestWinner(standings: FishingContestStanding[]) {
  return rankedStandings(standings)[0] ?? null;
}
