import "server-only";

import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";
import {
  getLiveTwitchPlayerIds,
  isTwitchConfigured,
} from "@/lib/twitch/live-status";
import { isTrainerSpriteName } from "@/lib/trainer-sprites";

export type PlayerCardData = {
  id: string;
  username: string;
  displayName: string;
  gameTrainerName: string | null;
  twitchUsername: string | null;
  trainerSprite: string | null;
  isLive: boolean;
  color: string;
  medals: Array<{ id: number; name: string; earned: boolean }>;
  team: Array<{
    id: string;
    species: string;
    form: number;
    nickname: string | null;
    level: number | null;
    isShiny: boolean;
    position: number;
  }>;
};

export type PlayerBoxPokemon = {
  id: string;
  species: string;
  form: number;
  nickname: string | null;
  level: number | null;
  ability: string | null;
  isShiny: boolean;
  status: "alive" | "dead" | "released" | "traded";
  originName: string | null;
  deathArea: string | null;
  teamPosition: number | null;
};

export type PlayerBoxData = {
  id: string;
  username: string;
  displayName: string;
  gameTrainerName: string | null;
  trainerSprite: string | null;
  color: string;
  pokemon: PlayerBoxPokemon[];
};

type PlayersPageData =
  | {
      status: "ready";
      players: PlayerCardData[];
      twitchStatus: "ready" | "not-configured" | "error";
    }
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" };

type PlayerBoxPageData =
  | { status: "ready"; player: PlayerBoxData }
  | { status: "not-found" }
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePlayers(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned an invalid players response");
  }

  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.username !== "string" ||
      typeof item.display_name !== "string" ||
      !(typeof item.game_trainer_name === "string" || item.game_trainer_name === null) ||
      !(typeof item.twitch_username === "string" || item.twitch_username === null) ||
      !(typeof item.trainer_sprite === "string" || item.trainer_sprite === null) ||
      (item.trainer_sprite !== null && !isTrainerSpriteName(item.trainer_sprite)) ||
      typeof item.color !== "string" ||
      !/^#[0-9A-Fa-f]{6}$/.test(item.color)
    ) {
      throw new Error("Supabase returned an invalid player record");
    }

    return {
      id: item.id,
      username: item.username,
      displayName: item.display_name,
      gameTrainerName: item.game_trainer_name,
      twitchUsername: item.twitch_username,
      trainerSprite: item.trainer_sprite,
      color: item.color,
    };
  });
}

function parseMedals(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned an invalid medals response");
  }

  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "number" ||
      typeof item.name !== "string"
    ) {
      throw new Error("Supabase returned an invalid medal record");
    }

    return { id: item.id, name: item.name };
  });
}

function parsePlayerMedals(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned an invalid player medals response");
  }

  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.player_id !== "string" ||
      typeof item.medal_id !== "number"
    ) {
      throw new Error("Supabase returned an invalid player medal record");
    }

    return { playerId: item.player_id, medalId: item.medal_id };
  });
}

function parseTeam(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned an invalid team response");
  }

  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.player_id !== "string" ||
      typeof item.species !== "string" ||
      typeof item.form !== "number" ||
      !(typeof item.nickname === "string" || item.nickname === null) ||
      !(typeof item.level === "number" || item.level === null) ||
      typeof item.is_shiny !== "boolean" ||
      typeof item.team_position !== "number"
    ) {
      throw new Error("Supabase returned an invalid team Pokémon record");
    }

    return {
      id: item.id,
      playerId: item.player_id,
      species: item.species,
      form: item.form,
      nickname: item.nickname,
      level: item.level,
      isShiny: item.is_shiny,
      position: item.team_position,
    };
  });
}

function isPokemonStatus(
  value: unknown,
): value is PlayerBoxPokemon["status"] {
  return (
    value === "alive" ||
    value === "dead" ||
    value === "released" ||
    value === "traded"
  );
}

function parsePlayerBoxPokemon(value: unknown): PlayerBoxPokemon[] {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned an invalid player box response");
  }

  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.species !== "string" ||
      typeof item.form !== "number" ||
      !(typeof item.nickname === "string" || item.nickname === null) ||
      !(typeof item.level === "number" || item.level === null) ||
      !(typeof item.ability === "string" || item.ability === null) ||
      typeof item.is_shiny !== "boolean" ||
      !isPokemonStatus(item.status) ||
      !(typeof item.origin_name === "string" || item.origin_name === null) ||
      !(typeof item.death_area === "string" || item.death_area === null) ||
      !(typeof item.team_position === "number" || item.team_position === null)
    ) {
      throw new Error("Supabase returned an invalid player box Pokémon record");
    }

    return {
      id: item.id,
      species: item.species,
      form: item.form,
      nickname: item.nickname,
      level: item.level,
      ability: item.ability,
      isShiny: item.is_shiny,
      status: item.status,
      originName: item.origin_name,
      deathArea: item.death_area,
      teamPosition: item.team_position,
    };
  });
}

function parseBoxPlayer(value: unknown): Omit<PlayerBoxData, "pokemon"> {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.username !== "string" ||
    typeof value.display_name !== "string" ||
    !(typeof value.game_trainer_name === "string" || value.game_trainer_name === null) ||
    !(typeof value.trainer_sprite === "string" || value.trainer_sprite === null) ||
    (value.trainer_sprite !== null && !isTrainerSpriteName(value.trainer_sprite)) ||
    typeof value.color !== "string" ||
    !/^#[0-9A-Fa-f]{6}$/.test(value.color)
  ) {
    throw new Error("Supabase returned an invalid player box identity");
  }

  return {
    id: value.id,
    username: value.username,
    displayName: value.display_name,
    gameTrainerName: value.game_trainer_name,
    trainerSprite: value.trainer_sprite,
    color: value.color,
  };
}

export async function getPlayersPageData(): Promise<PlayersPageData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const supabase = createSupabaseAdminClient();
  const playersResponse = await supabase
    .from("players")
    .select("id,username,display_name,game_trainer_name,twitch_username,trainer_sprite,color")
    .eq("is_active", true)
    .order("display_name", { ascending: true })
    .limit(40);

  if (playersResponse.error) {
    console.error("Failed to load Consonancia players:", playersResponse.error.message);
    return { status: "error" };
  }

  try {
    const players = parsePlayers(playersResponse.data);
    let twitchStatus: "ready" | "not-configured" | "error" =
      isTwitchConfigured() ? "ready" : "not-configured";
    let livePlayerIds = new Set<string>();
    try {
      const lookup = await getLiveTwitchPlayerIds(players);
      livePlayerIds = lookup.playerIds;
    } catch (error) {
      if (twitchStatus === "ready") twitchStatus = "error";
      console.error(
        "Failed to check Twitch live status for player cards:",
        error instanceof Error ? error.message : error,
      );
    }
    if (players.length === 0) {
      return { status: "ready", players: [], twitchStatus };
    }

    const playerIds = players.map((player) => player.id);
    const [medalsResponse, playerMedalsResponse, teamResponse] =
      await Promise.all([
        supabase.from("medals").select("id,name").order("id", { ascending: true }),
        supabase
          .from("player_medals")
          .select("player_id,medal_id")
          .in("player_id", playerIds),
        supabase
          .from("pokemon")
          .select(
            "id,player_id,species,form,nickname,level,is_shiny,team_position",
          )
          .in("player_id", playerIds)
          .eq("status", "alive")
          .not("team_position", "is", null)
          .order("team_position", { ascending: true }),
      ]);

    if (medalsResponse.error) {
      console.error("Failed to load Consonancia medals:", medalsResponse.error.message);
      return { status: "error" };
    }
    if (playerMedalsResponse.error) {
      console.error(
        "Failed to load Consonancia player medals:",
        playerMedalsResponse.error.message,
      );
      return { status: "error" };
    }
    if (teamResponse.error) {
      console.error(
        "Failed to load Consonancia player teams:",
        teamResponse.error.message,
      );
      return { status: "error" };
    }

    const medals = parseMedals(medalsResponse.data);
    const playerMedals = parsePlayerMedals(playerMedalsResponse.data);
    const team = parseTeam(teamResponse.data);
    const earnedMedals = new Set(
      playerMedals.map(({ playerId, medalId }) => `${playerId}:${medalId}`),
    );
    const teamsByPlayer = new Map<string, typeof team>();
    for (const pokemon of team) {
      const playerTeam = teamsByPlayer.get(pokemon.playerId) ?? [];
      playerTeam.push(pokemon);
      teamsByPlayer.set(pokemon.playerId, playerTeam);
    }

    return {
      status: "ready",
      twitchStatus,
      players: players.map((player) => ({
        ...player,
        isLive: livePlayerIds.has(player.id),
        medals: medals.map((medal) => ({
          ...medal,
          earned: earnedMedals.has(`${player.id}:${medal.id}`),
        })),
        team: teamsByPlayer.get(player.id) ?? [],
      })),
    };
  } catch (error) {
    console.error(
      "Invalid Consonancia player data received from Supabase:",
      error instanceof Error ? error.message : "Unknown response error",
    );
    return { status: "error" };
  }
}

export async function getPlayerBoxPageData(
  playerId: string,
): Promise<PlayerBoxPageData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const supabase = createSupabaseAdminClient();
  const playerResponse = await supabase
    .from("players")
    .select("id,username,display_name,game_trainer_name,trainer_sprite,color")
    .eq("id", playerId)
    .eq("is_active", true)
    .maybeSingle();

  if (playerResponse.error) {
    console.error("Failed to load Consonancia player:", playerResponse.error.message);
    return { status: "error" };
  }
  if (!playerResponse.data) return { status: "not-found" };

  try {
    const player = parseBoxPlayer(playerResponse.data);
    const pokemon: PlayerBoxPokemon[] = [];
    const pageSize = 500;

    for (let offset = 0; ; offset += pageSize) {
      const pokemonResponse = await supabase
        .from("pokemon")
        .select(
          "id,species,form,nickname,level,ability,is_shiny,status,origin_name,death_area,team_position,created_at",
        )
        .eq("player_id", player.id)
        .order("team_position", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (pokemonResponse.error) {
        console.error(
          "Failed to load Consonancia player box:",
          pokemonResponse.error.message,
        );
        return { status: "error" };
      }

      pokemon.push(...parsePlayerBoxPokemon(pokemonResponse.data));
      if (pokemonResponse.data.length < pageSize) break;
    }

    return { status: "ready", player: { ...player, pokemon } };
  } catch (error) {
    console.error(
      "Invalid Consonancia player box data received from Supabase:",
      error instanceof Error ? error.message : "Unknown response error",
    );
    return { status: "error" };
  }
}
