"use client";

import { useEffect, useState } from "react";

type AbilityDetails = {
  spanishName: string | null;
  description: string | null;
};

type AbilityResponse = {
  names?: Array<{
    name?: unknown;
    language?: { name?: unknown };
  }>;
  effect_entries?: Array<{
    effect?: unknown;
    short_effect?: unknown;
    language?: { name?: unknown };
  }>;
  flavor_text_entries?: Array<{
    flavor_text?: unknown;
    language?: { name?: unknown };
  }>;
};

type AbilityIndexResponse = {
  results?: Array<{ name?: unknown }>;
};

const abilityRequests = new Map<string, Promise<AbilityDetails>>();
let abilityIndexRequest: Promise<Map<string, string>> | null = null;

function abilitySlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function abilityKey(value: string) {
  return abilitySlug(value).replace(/-/g, "");
}

function localizedText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/[\n\f\r]+/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function getAbilityIndex() {
  if (!abilityIndexRequest) {
    abilityIndexRequest = fetch("https://pokeapi.co/api/v2/ability?limit=1000")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`PokeAPI devolvió HTTP ${response.status}`);
        }
        const data: AbilityIndexResponse = await response.json();
        if (!Array.isArray(data.results)) {
          throw new Error("PokeAPI devolvió una lista de habilidades no válida");
        }
        const index = new Map<string, string>();
        for (const ability of data.results) {
          if (typeof ability.name === "string") {
            index.set(abilityKey(ability.name), ability.name);
          }
        }
        return index;
      })
      .catch((error: unknown) => {
        abilityIndexRequest = null;
        throw error;
      });
  }
  return abilityIndexRequest;
}

async function fetchAbility(slug: string): Promise<AbilityResponse | null> {
  const response = await fetch(
    `https://pokeapi.co/api/v2/ability/${encodeURIComponent(slug)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`PokeAPI devolvió HTTP ${response.status}`);
  }
  return response.json();
}

function loadAbilityDetails(ability: string) {
  const slug = abilitySlug(ability);
  let request = abilityRequests.get(slug);
  if (!request) {
    request = (async () => {
      let data = await fetchAbility(slug);
      if (!data) {
        const canonicalSlug = (await getAbilityIndex()).get(abilityKey(ability));
        if (canonicalSlug) data = await fetchAbility(canonicalSlug);
      }
      if (!data) return { spanishName: null, description: null };

        const spanishNames = (data.names ?? []).filter(
          (entry) =>
            entry.language?.name === "es" ||
            entry.language?.name === "es-419",
        );
        const spanishName =
          spanishNames.find((entry) => entry.language?.name === "es") ??
          spanishNames[0];
        const spanishEffect = (data.effect_entries ?? []).find(
          (entry) => entry.language?.name === "es",
        );
        const spanishFlavorText = (data.flavor_text_entries ?? [])
          .filter((entry) => entry.language?.name === "es")
          .map((entry) => localizedText(entry.flavor_text))
          .find(Boolean);

        return {
          spanishName: localizedText(spanishName?.name) || null,
          description:
            localizedText(spanishEffect?.short_effect) ||
            localizedText(spanishEffect?.effect) ||
            spanishFlavorText ||
            null,
        };
    })()
      .catch((error: unknown) => {
        abilityRequests.delete(slug);
        throw error;
      });
    abilityRequests.set(slug, request);
  }
  return request;
}

export default function AbilityTooltip({ ability }: { ability: string | null }) {
  const [details, setDetails] = useState<AbilityDetails | null>(null);

  useEffect(() => {
    if (!ability) return;
    let active = true;
    loadAbilityDetails(ability)
      .then((result) => {
        if (active) setDetails(result);
      })
      .catch((error: unknown) => {
        console.error(`No se pudo cargar la habilidad ${ability}:`, error);
        if (active) setDetails({ spanishName: null, description: null });
      });

    return () => {
      active = false;
    };
  }, [ability]);

  if (!ability) return null;

  const name = details?.spanishName ?? ability;
  const tooltip = details?.description
    ? `${name}: ${details.description}`
    : details
      ? `${name}: Descripción en español no disponible.`
      : `${name}: Cargando descripción…`;

  return (
    <span className="mt-1 w-full truncate">
      <button
        type="button"
        title={tooltip}
        aria-label={`Habilidad: ${name}. ${tooltip}`}
        className="max-w-full cursor-help truncate text-[9px] text-cyan-200/80 underline decoration-dotted underline-offset-2"
      >
        HAB. {name}
      </button>
    </span>
  );
}
