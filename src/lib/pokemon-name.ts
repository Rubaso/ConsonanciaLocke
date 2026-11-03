import { SPECIES_DEX } from "@/lib/pokemon-species-dex";

export function formatPokemonSpeciesName(species: string) {
  const key = species.toLowerCase().replace(/[^a-z0-9]/g, "");
  const entry = SPECIES_DEX[key];
  if (entry) return entry.name;

  return species.replace(/[_-]+/g, " ").trim();
}
