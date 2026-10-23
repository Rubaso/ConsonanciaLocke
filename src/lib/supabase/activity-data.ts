import "server-only";

import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

export type ActivityEvent = {
  id: string;
  type: "capture" | "death" | "status_changed" | "medal_awarded";
  captureSource: "normal" | "trade" | "gacha";
  occurredAt: string;
  playerName: string;
  playerColor: string;
  pokemonName: string | null;
  species: string | null;
  form: number;
  isShiny: boolean;
  location: string | null;
  medalName: string | null;
  statusFrom: string | null;
  statusTo: string | null;
};

export type ActivityPageData =
  | {
      status: "ready";
      events: ActivityEvent[];
      nextCursor: string | null;
    }
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" };

export type ActivityCursor = {
  occurredAt: string;
  id: string;
};

export type ActivityFilter =
  | "all"
  | "capture"
  | "death"
  | "medal"
  | "trade"
  | "gacha"
  | "shiny";

export const ACTIVITY_PAGE_SIZE = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseActivityEvents(value: unknown): ActivityEvent[] {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned an invalid activity response");
  }

  return value.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      (item.event_type !== "capture" &&
        item.event_type !== "death" &&
        item.event_type !== "status_changed" &&
        item.event_type !== "medal_awarded") ||
      typeof item.occurred_at !== "string" ||
      Number.isNaN(Date.parse(item.occurred_at)) ||
      !isRecord(item.players) ||
      typeof item.players.display_name !== "string" ||
      typeof item.players.color !== "string" ||
      !/^#[0-9A-Fa-f]{6}$/.test(item.players.color)
    ) {
      throw new Error("Supabase returned an invalid activity event");
    }

    const pokemon = isRecord(item.pokemon) ? item.pokemon : null;
    const route = isRecord(item.routes) ? item.routes : null;
    const medal = isRecord(item.medals) ? item.medals : null;
    const details = isRecord(item.details) ? item.details : {};
    const species =
      typeof pokemon?.species === "string" ? pokemon.species : null;
    const form =
      typeof pokemon?.form === "number" && Number.isInteger(pokemon.form)
        ? pokemon.form
        : 0;
    const isShiny = pokemon?.is_shiny === true;
    const nickname =
      typeof pokemon?.nickname === "string" ? pokemon.nickname : null;
    const obtainMethod =
      typeof pokemon?.obtain_method === "number"
        ? pokemon.obtain_method
        : null;
    const captureSource =
      item.event_type === "capture" &&
      route?.name === "Centro Pokémon"
        ? obtainMethod === 2
          ? "trade"
          : "gacha"
        : "normal";

    return {
      id: item.id,
      type: item.event_type,
      captureSource,
      occurredAt: item.occurred_at,
      playerName: item.players.display_name,
      playerColor: item.players.color,
      pokemonName: nickname || species,
      species,
      form,
      isShiny,
      location:
        (typeof pokemon?.death_area === "string" && pokemon.death_area) ||
        (typeof route?.name === "string" && route.name) ||
        null,
      medalName: typeof medal?.name === "string" ? medal.name : null,
      statusFrom: typeof details.from === "string" ? details.from : null,
      statusTo: typeof details.to === "string" ? details.to : null,
    };
  });
}

export async function getActivityPageData(
  cursor?: ActivityCursor,
  filter: ActivityFilter = "all",
): Promise<ActivityPageData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const supabase = createSupabaseAdminClient();
  const select =
    filter === "trade" || filter === "gacha"
      ? "id,event_type,occurred_at,details,players(display_name,color),pokemon!inner(species,form,nickname,is_shiny,death_area,obtain_method),medals(name),routes!inner(name)"
      : filter === "shiny"
        ? "id,event_type,occurred_at,details,players(display_name,color),pokemon!inner(species,form,nickname,is_shiny,death_area,obtain_method),medals(name),routes(name)"
        : "id,event_type,occurred_at,details,players(display_name,color),pokemon(species,form,nickname,is_shiny,death_area,obtain_method),medals(name),routes(name)";
  let query = supabase
    .from("activity_events")
    .select(select)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ACTIVITY_PAGE_SIZE + 1);

  switch (filter) {
    case "capture":
      query = query.eq("event_type", "capture");
      break;
    case "death":
      query = query.eq("event_type", "death");
      break;
    case "medal":
      query = query.eq("event_type", "medal_awarded");
      break;
    case "trade":
      query = query
        .eq("event_type", "capture")
        .eq("routes.name", "Centro Pokémon")
        .eq("pokemon.obtain_method", 2);
      break;
    case "gacha":
      query = query
        .eq("event_type", "capture")
        .eq("routes.name", "Centro Pokémon")
        .or("obtain_method.is.null,obtain_method.neq.2", {
          referencedTable: "pokemon",
        });
      break;
    case "shiny":
      query = query.eq("pokemon.is_shiny", true);
      break;
  }

  if (cursor) {
    query = query.or(
      `occurred_at.lt.${cursor.occurredAt},and(occurred_at.eq.${cursor.occurredAt},id.lt.${cursor.id})`,
    );
  }

  const response = await query;

  if (response.error) {
    console.error(
      "Failed to load Consonancia activity:",
      response.error.message,
    );
    return { status: "error" };
  }

  try {
    const fetchedEvents = parseActivityEvents(response.data);
    const hasMore = fetchedEvents.length > ACTIVITY_PAGE_SIZE;
    const events = fetchedEvents.slice(0, ACTIVITY_PAGE_SIZE);
    const lastEvent = events.at(-1);

    return {
      status: "ready",
      events,
      nextCursor:
        hasMore && lastEvent
          ? `${lastEvent.occurredAt}|${lastEvent.id}`
          : null,
    };
  } catch (error) {
    console.error(
      "Invalid Consonancia activity data received from Supabase:",
      error instanceof Error ? error.message : "Unknown response error",
    );
    return { status: "error" };
  }
}
