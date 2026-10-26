import "server-only";

import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

const ANNOUNCEMENT_DURATION_MS = 5 * 24 * 60 * 60 * 1000;
const ANNOUNCEMENT_PAGE_SIZE = 500;

export type ShinyAnnouncement = {
  id: string;
  playerName: string;
  playerColor: string;
  pokemonName: string;
  species: string;
  form: number;
  occurredAt: string;
};

export type ShinyAnnouncementData =
  | { status: "ready"; announcements: ShinyAnnouncement[] }
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getRecentShinyAnnouncements(): Promise<ShinyAnnouncementData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const now = Date.now();
  const supabase = createSupabaseAdminClient();
  const announcements: ShinyAnnouncement[] = [];
  for (let offset = 0; ; offset += ANNOUNCEMENT_PAGE_SIZE) {
    const response = await supabase
      .from("activity_events")
      .select(
        "id,occurred_at,players(display_name,color),pokemon!inner(species,form,nickname,is_shiny)",
      )
      .eq("event_type", "capture")
      .eq("pokemon.is_shiny", true)
      .gte("occurred_at", new Date(now - ANNOUNCEMENT_DURATION_MS).toISOString())
      .lte("occurred_at", new Date(now).toISOString())
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + ANNOUNCEMENT_PAGE_SIZE - 1);

    if (response.error) {
      console.error(
        "Failed to load Consonancia shiny capture announcements:",
        response.error.message,
      );
      return { status: "error" };
    }

    for (const event of response.data) {
      const player = event.players;
      const pokemon = event.pokemon;
      if (
        typeof event.id !== "string" ||
        typeof event.occurred_at !== "string" ||
        Number.isNaN(Date.parse(event.occurred_at)) ||
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

      announcements.push({
        id: event.id,
        playerName: player.display_name,
        playerColor: player.color,
        pokemonName:
          typeof pokemon.nickname === "string" && pokemon.nickname.trim()
            ? pokemon.nickname
            : pokemon.species,
        species: pokemon.species,
        form: pokemon.form,
        occurredAt: new Date(event.occurred_at).toISOString(),
      });
    }

    if (response.data.length < ANNOUNCEMENT_PAGE_SIZE) break;
  }

  return {
    status: "ready",
    announcements,
  };
}
