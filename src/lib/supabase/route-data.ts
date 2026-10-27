import "server-only";

import type { RouteDefinition } from "@/lib/route-catalog";
import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

export type RouteCapture = {
  id: string;
  playerId: string;
  playerColor: string;
  routeId: number | null;
  routeName: string;
  originMapId: number | null;
  originName: string | null;
  species: string;
  form: number;
  nickname: string | null;
  ability: string | null;
  playerName: string;
  status: "alive" | "dead" | "traded" | "released";
  isShiny: boolean;
  obtainMethod: number | null;
};

type StagePageData =
  | {
      status: "ready";
      routes: RouteDefinition[];
      captures: RouteCapture[];
      players: Array<{
        id: string;
        username: string;
        displayName: string;
        gameTrainerName: string | null;
      }>;
      mapCount: number;
    }
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPokemonStatus(value: unknown): value is RouteCapture["status"] {
  return (
    value === "alive" ||
    value === "dead" ||
    value === "traded" ||
    value === "released"
  );
}

function parseRoutes(value: unknown): RouteDefinition[] {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned an invalid routes response");
  }

  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.name !== "string" ||
      typeof item.id !== "number" ||
      typeof item.sort_order !== "number" ||
      typeof item.is_outdoor !== "boolean" ||
      !Array.isArray(item.route_map_ids)
    ) {
      throw new Error("Supabase returned an invalid route record");
    }

    const mapIds = item.route_map_ids.map((map: unknown) => {
      if (!isRecord(map) || typeof map.map_id !== "number") {
        throw new Error("Supabase returned an invalid route map record");
      }
      return map.map_id;
    });

    return {
      id: item.id,
      name: item.name,
      sortOrder: item.sort_order,
      isOutdoor: item.is_outdoor,
      mapIds,
    };
  });
}

function parsePokemon(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned an invalid Pokémon response");
  }

  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.player_id !== "string" ||
      typeof item.species !== "string" ||
      typeof item.form !== "number" ||
      !(typeof item.nickname === "string" || item.nickname === null) ||
      !(typeof item.ability === "string" || item.ability === null) ||
      !isPokemonStatus(item.status) ||
      typeof item.is_shiny !== "boolean" ||
      !(typeof item.route_id === "number" || item.route_id === null) ||
      !(typeof item.obtain_method === "number" || item.obtain_method === null) ||
      !(typeof item.origin_map_id === "number" || item.origin_map_id === null) ||
      !(typeof item.origin_name === "string" || item.origin_name === null)
    ) {
      throw new Error("Supabase returned an invalid Pokémon record");
    }

    return {
      id: item.id,
      playerId: item.player_id,
      species: item.species,
      form: item.form,
      nickname: item.nickname,
      ability: item.ability,
      status: item.status,
      isShiny: item.is_shiny,
      routeId: item.route_id,
      obtainMethod: item.obtain_method,
      originMapId: item.origin_map_id,
      originName: item.origin_name,
    };
  });
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
      typeof item.color !== "string" ||
      !/^#[0-9A-Fa-f]{6}$/.test(item.color) ||
      typeof item.is_active !== "boolean"
    ) {
      throw new Error("Supabase returned an invalid player record");
    }

    return {
      id: item.id,
      username: item.username,
      displayName: item.display_name,
      gameTrainerName: item.game_trainer_name,
      color: item.color,
      isActive: item.is_active,
    };
  });
}

export async function getStagePageData(): Promise<StagePageData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const supabase = createSupabaseAdminClient();
  const routesResponse = await supabase
    .from("routes")
    .select("id,name,sort_order,is_outdoor,route_map_ids(map_id)")
    .order("sort_order", { ascending: true });

  if (routesResponse.error) {
    console.error("Failed to load Consonancia routes:", routesResponse.error.message);
    return { status: "error" };
  }

  try {
    const routes = parseRoutes(routesResponse.data);
    const pokemon: ReturnType<typeof parsePokemon> = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const pokemonResponse = await supabase
        .from("pokemon")
        .select(
          "id,player_id,species,form,nickname,ability,status,is_shiny,route_id,obtain_method,origin_map_id,origin_name",
        )
        .eq("present_in_save", true)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (pokemonResponse.error) {
        console.error(
          "Failed to load Consonancia Pokémon:",
          pokemonResponse.error.message,
        );
        return { status: "error" };
      }

      const pokemonPage = parsePokemon(pokemonResponse.data);
      pokemon.push(...pokemonPage);
      if (pokemonPage.length < pageSize) break;
    }

    const playersResponse = await supabase
      .from("players")
      .select("id,username,display_name,game_trainer_name,color,is_active")
      .order("display_name", { ascending: true });

    if (playersResponse.error) {
      console.error(
        "Failed to load Consonancia player names:",
        playersResponse.error.message,
      );
      return { status: "error" };
    }
    const players = parsePlayers(playersResponse.data);

    const playerNames = new Map(
      players.map((player) => [
        player.id,
        { displayName: player.displayName, color: player.color },
      ]),
    );
    const routeNames = new Map(routes.map((route) => [route.id, route.name]));
    const captures: RouteCapture[] = pokemon.flatMap((item) => {
      const player = playerNames.get(item.playerId);
      const routeName =
        (item.routeId === null ? undefined : routeNames.get(item.routeId)) ??
        item.originName ??
        (item.originMapId === null
          ? "Zona sin identificar"
          : `Zona desconocida (ID ${item.originMapId})`);
      if (!player) return [];
      return [
        {
          id: item.id,
          playerId: item.playerId,
          playerColor: player.color,
          routeId: item.routeId,
          routeName,
          originMapId: item.originMapId,
          originName: item.originName,
          species: item.species,
          form: item.form,
          nickname: item.nickname,
          ability: item.ability,
          playerName: player.displayName,
          status: item.status,
          isShiny: item.isShiny,
          obtainMethod: item.obtainMethod,
        },
      ];
    });

    return {
      status: "ready",
      routes,
      captures,
      players: players
        .filter((player) => player.isActive)
        .map(({ id, username, displayName, gameTrainerName }) => ({
          id,
          username,
          displayName,
          gameTrainerName,
        })),
      mapCount: routes.reduce((count, route) => count + route.mapIds.length, 0),
    };
  } catch (error) {
    console.error(
      "Invalid Consonancia data received from Supabase:",
      error instanceof Error ? error.message : "Unknown response error",
    );
    return { status: "error" };
  }
}
