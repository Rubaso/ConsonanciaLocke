import "server-only";

import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

export type PlayerPokepasteProfile =
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" }
  | { status: "ready"; url: string | null };

export async function getPlayerPokepasteProfile(
  playerId: string,
): Promise<PlayerPokepasteProfile> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status === "not-configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  const response = await createSupabaseAdminClient()
    .from("players")
    .select("pokepaste_url")
    .eq("id", playerId)
    .eq("is_active", true)
    .maybeSingle();
  if (response.error || !response.data) {
    console.error(
      "Failed to load player Poképaste profile:",
      response.error?.message ?? "Active player account not found",
    );
    return { status: "error" };
  }

  if (
    response.data.pokepaste_url !== null &&
    (typeof response.data.pokepaste_url !== "string" ||
      !/^https:\/\/(?:www\.)?pokepast\.es\/[A-Za-z0-9_-]{4,80}$/.test(
        response.data.pokepaste_url,
      ))
  ) {
    console.error("Supabase returned an invalid player Poképaste URL.");
    return { status: "error" };
  }

  return { status: "ready", url: response.data.pokepaste_url };
}
