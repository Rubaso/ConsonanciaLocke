import { SPECIES_DEX, type SpeciesDexEntry } from "@/lib/pokemon-species-dex";

export function speciesKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]+/g, "");
}

export function getSpeciesEntry(name: string): SpeciesDexEntry | null {
  return SPECIES_DEX[speciesKey(name)] ?? null;
}

export function getEligibleSpecies(caughtSpecies: string): SpeciesDexEntry[] {
  const start = getSpeciesEntry(caughtSpecies);
  if (!start) return [];

  const chain: SpeciesDexEntry[] = [];
  const seen = new Set<string>();
  let current: SpeciesDexEntry | null = start;

  while (current) {
    const key = speciesKey(current.name);
    if (seen.has(key)) break;
    seen.add(key);
    chain.push(current);
    current = current.evolvesFrom ? (SPECIES_DEX[current.evolvesFrom] ?? null) : null;
  }

  return chain;
}

export function isEligibleSpecies(caughtSpecies: string, chosenSpecies: string) {
  const chosenKey = speciesKey(chosenSpecies);
  return getEligibleSpecies(caughtSpecies).some(
    (entry) => speciesKey(entry.name) === chosenKey,
  );
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
