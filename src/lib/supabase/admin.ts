import "server-only";

import { createClient } from "@supabase/supabase-js";

export function getSupabaseConfiguration() {
  const url = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missingVariables = [
    !url && "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((variable): variable is string => Boolean(variable));

  if (missingVariables.length > 0) {
    return { status: "not-configured" as const, missingVariables };
  }

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration could not be resolved");
  }

  return {
    status: "configured" as const,
    url,
    serviceRoleKey,
  };
}

export function createSupabaseAdminClient() {
  const configuration = getSupabaseConfiguration();

  if (configuration.status !== "configured") {
    throw new Error(
      `Supabase server configuration is missing: ${configuration.missingVariables.join(", ")}`,
    );
  }

  return createClient(configuration.url, configuration.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
