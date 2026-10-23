import "server-only";

import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

const ANNOUNCEMENT_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export type ShinyAnnouncement = {
  playerName: string;
  playerColor: string;
  pokemonName: string;
  species: string;
  form: number;
  occurredAt: string;
  expiresAt: string;
};

export type ShinyAnnouncementData =
  | { status: "ready"; announcement: ShinyAnnouncement | null }
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getLatestShinyAnnouncement(): Promise<ShinyAnnouncementData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const now = Date.now();
  const response = await createSupabaseAdminClient()
    .from("activity_events")
    .select(
      "occurred_at,players(display_name,color),pokemon!inner(species,form,nickname,is_shiny)",
    )
    .eq("event_type", "capture")
    .eq("pokemon.is_shiny", true)
    .gte("occurred_at", new Date(now - ANNOUNCEMENT_DURATION_MS).toISOString())
    .lte("occurred_at", new Date(now).toISOString())
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (response.error) {
    console.error(
      "Failed to load Consonancia shiny capture announcement:",
      response.error.message,
    );
    return { status: "error" };
  }

  if (!response.data) return { status: "ready", announcement: null };

  const player = response.data.players;
  const pokemon = response.data.pokemon;
  if (
    typeof response.data.occurred_at !== "string" ||
    Number.isNaN(Date.parse(response.data.occurred_at)) ||
    !isRecord(player) ||
    typeof player.display_name !== "string" ||
    typeof player.color !== "string" ||
    !/^#[0-9A-Fa-f]{6}$/.test(player.color) ||
    !isRecord(pokemon) ||
    pokemon.is_shiny !== true ||
    typeof pokemon.species !== "string" ||
    typeof pokemon.form !== "number" ||
    !Number.isInteger(pokemon.form) ||
    !(pokemon.nickname === null || typeof pokemon.nickname === "string")
  ) {
    console.error("Supabase returned an invalid shiny capture announcement.");
    return { status: "error" };
  }

  const occurredAt = new Date(response.data.occurred_at);
  return {
    status: "ready",
    announcement: {
      playerName: player.display_name,
      playerColor: player.color,
      pokemonName:
        typeof pokemon.nickname === "string" && pokemon.nickname.trim()
          ? pokemon.nickname
          : pokemon.species,
      species: pokemon.species,
      form: pokemon.form,
      occurredAt: occurredAt.toISOString(),
      expiresAt: new Date(
        occurredAt.getTime() + ANNOUNCEMENT_DURATION_MS,
      ).toISOString(),
    },
  };
}
