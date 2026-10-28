import { readFileSync, writeFileSync } from "node:fs";

const pokemonCsv = readFileSync(process.argv[2], "utf8");
const speciesCsv = readFileSync(process.argv[3], "utf8");

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });
}

function speciesKey(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]+/g, "");
}

function displayName(identifier) {
  return identifier
    .replace(/-/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

const pokemonRows = parseCsv(pokemonCsv);
const speciesRows = parseCsv(speciesCsv);

const defaultStatsBySpeciesId = new Map();
for (const row of pokemonRows) {
  if (row.is_default !== "1") continue;
  defaultStatsBySpeciesId.set(row.species_id, {
    weightKg: Number(row.weight) / 10,
    heightM: Number(row.height) / 10,
  });
}

const speciesById = new Map();
for (const row of speciesRows) {
  const name = displayName(row.identifier);
  speciesById.set(row.id, {
    id: row.id,
    identifier: row.identifier,
    key: speciesKey(name),
    name,
    stats: defaultStatsBySpeciesId.get(row.id),
    evolvesFromId: row.evolves_from_species_id || null,
  });
}

const records = [];
for (const species of speciesById.values()) {
  if (
    !species.stats ||
    typeof species.stats.weightKg !== "number" ||
    Number.isNaN(species.stats.weightKg) ||
    typeof species.stats.heightM !== "number" ||
    Number.isNaN(species.stats.heightM)
  ) {
    continue;
  }
  const parent = species.evolvesFromId
    ? speciesById.get(species.evolvesFromId)
    : null;
  records.push({
    key: species.key,
    name: species.name,
    weightKg: Number(species.stats.weightKg.toFixed(1)),
    heightM: Number(species.stats.heightM.toFixed(1)),
    evolvesFrom: parent ? parent.key : null,
  });
}

records.sort((a, b) => a.key.localeCompare(b.key));

const file = `/** Official Pokédex weights (kg), heights (m) and evolution parents from PokeAPI species data. */
export type SpeciesDexEntry = {
  name: string;
  weightKg: number;
  heightM: number;
  evolvesFrom: string | null;
};

export const SPECIES_DEX: Record<string, SpeciesDexEntry> = {
${records
  .map(
    (row) =>
      `  ${JSON.stringify(row.key)}: { name: ${JSON.stringify(row.name)}, weightKg: ${row.weightKg}, heightM: ${row.heightM}, evolvesFrom: ${row.evolvesFrom ? JSON.stringify(row.evolvesFrom) : "null"} },`,
  )
  .join("\n")}
};
`;

writeFileSync(process.argv[4], file);
console.log(`Wrote ${records.length} species to ${process.argv[4]}`);
