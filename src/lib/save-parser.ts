import "server-only";

import { loadAll } from "@hyrious/marshal";
import { getRandomizedAbility } from "@/lib/consonancia-randomizer-abilities";
import { ROUTE_CATALOG } from "@/lib/route-catalog";

export type ImportedPokemon = {
  source_identity: string;
  status: "alive" | "dead";
  species: string;
  form: number;
  nickname: string | null;
  level: number | null;
  gender: "male" | "female" | "genderless" | "unknown";
  nature: string | null;
  ability: string | null;
  held_item: string | null;
  is_shiny: boolean;
  team_position: number | null;
  origin_map_id: number | null;
  origin_name: string | null;
  obtain_method: number | null;
  captured_at: string | null;
  iv_hp: number | null;
  iv_attack: number | null;
  iv_defense: number | null;
  iv_special_attack: number | null;
  iv_special_defense: number | null;
  iv_speed: number | null;
  ev_hp: number | null;
  ev_attack: number | null;
  ev_defense: number | null;
  ev_special_attack: number | null;
  ev_special_defense: number | null;
  ev_speed: number | null;
  moves: string[];
};

export type ParsedSave = {
  trainerName: string;
  gameTrainerName: string;
  pokemon: ImportedPokemon[];
  medalIds: number[];
  unknownMapIds: number[];
  hasStorage: boolean;
};

type RubyRecord = Record<PropertyKey, unknown>;

type SaveRandomizerSettings = {
  enabled: boolean;
  seed: number | null;
  abilityMode: string | null;
};

const routeNameByMapId = new Map(
  ROUTE_CATALOG.flatMap((route) =>
    route.mapIds.map((mapId) => [mapId, route.name] as const),
  ),
);

function isRecord(value: unknown): value is RubyRecord {
  return typeof value === "object" && value !== null;
}

function getProperty(value: unknown, name: string): unknown {
  if (!isRecord(value)) return undefined;

  if (value instanceof Map) {
    if (value.has(name)) return value.get(name);
    if (value.has(`@${name}`)) return value.get(`@${name}`);
    for (const [key, entry] of value) {
      if (
        typeof key === "symbol" &&
        (key.description === name || key.description === `@${name}`)
      ) {
        return entry;
      }
    }
  }

  const record = value as RubyRecord;
  for (const key of Reflect.ownKeys(record)) {
    if (
      typeof key === "symbol" &&
      (key.description === name || key.description === `@${name}`)
    ) {
      return record[key];
    }
  }

  if (record[name] !== undefined) return record[name];
  return record[`@${name}`];
}

function valueText(value: unknown): string | null {
  const text =
    typeof value === "symbol"
      ? value.description
      : value instanceof Uint8Array
        ? new TextDecoder().decode(value)
        : typeof value === "string"
          ? value
          : typeof value === "number" && Number.isSafeInteger(value)
            ? String(value)
          : null;

  const normalized = text?.trim();
  return normalized ? normalized : null;
}

function displayLabel(value: unknown): string | null {
  const text = valueText(value);
  if (!text) return null;

  return text
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .slice(0, 80);
}

function numberValue(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function boundedNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  const parsed = numberValue(value);
  return parsed !== null && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function timestampFromSave(value: unknown): string | null {
  const timestamp = numberValue(value);
  if (timestamp === null || timestamp <= 0) return null;

  const date = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function statsFromSave(value: unknown, stat: string): unknown {
  return getProperty(value, stat);
}

function statValue(value: unknown, stat: string, maximum: number): number | null {
  return boundedNumber(statsFromSave(value, stat), 0, maximum);
}

function movesFromSave(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const moves: string[] = [];
  for (const entry of value) {
    const name = displayLabel(getProperty(entry, "id") ?? entry);
    if (name && !moves.includes(name)) moves.push(name);
    if (moves.length === 4) break;
  }
  return moves;
}

function randomizerSettingsFromSave(save: unknown): SaveRandomizerSettings {
  const metadata = getProperty(save, "global_metadata");
  const randomizer = getProperty(metadata, "consonancia_random");
  const options = getProperty(randomizer, "options");
  return {
    enabled: getProperty(randomizer, "enabled") === true,
    seed: boundedNumber(getProperty(randomizer, "seed"), 0, 0xffff_ffff),
    abilityMode: valueText(getProperty(options, "abilities"))?.toUpperCase() ?? null,
  };
}

function importedAbility(value: unknown, randomizer: SaveRandomizerSettings) {
  const originalAbility = valueText(getProperty(value, "ability"));
  if (
    !originalAbility ||
    !randomizer.enabled ||
    randomizer.seed === null ||
    !randomizer.abilityMode ||
    randomizer.abilityMode === "OFF" ||
    getProperty(value, "consonancia_random_exempt") === true
  ) {
    return displayLabel(originalAbility);
  }

  const species = valueText(getProperty(value, "species"));
  if (!species || species.toUpperCase() === "SHEDINJA") {
    return displayLabel(originalAbility);
  }

  const personalId = numberValue(getProperty(value, "personalID"));
  const abilityIndex =
    boundedNumber(getProperty(value, "ability_index"), 0, 32_767) ??
    (personalId === null ? null : personalId & 1);
  if (abilityIndex === null) return displayLabel(originalAbility);

  const form =
    boundedNumber(
      getProperty(value, "forced_form") ?? getProperty(value, "form"),
      0,
      32_767,
    ) ?? 0;
  let key: string;

  switch (randomizer.abilityMode) {
    case "FULLRANDOM":
      key = `[:ability_species, :${species}, ${form}, ${abilityIndex}]`;
      break;
    case "MAPABILITIES":
      key = `[:ability_map, :${originalAbility}]`;
      break;
    case "SAMEINEVOLUTION": {
      const family =
        valueText(getProperty(value, "consonancia_ability_family")) ?? species;
      key = `[:ability_family, :${family}, ${abilityIndex}]`;
      break;
    }
    default:
      return displayLabel(originalAbility);
  }

  return displayLabel(
    getRandomizedAbility({
      seed: randomizer.seed,
      key,
      originalAbility,
    }),
  );
}

function storageCurrentBoxIndex(storage: unknown, boxCount: number) {
  if (boxCount <= 0) return null;
  for (const name of [
    "current_index",
    "currentIndex",
    "current_box",
    "currentBox",
    "current",
    "box_index",
  ]) {
    const value = numberValue(getProperty(storage, name));
    if (value !== null && value >= 0 && value < boxCount) return value;
  }
  return null;
}

function isGraveBox(boxIndex: number, boxCount: number, currentBoxIndex: number | null) {
  if (boxCount < 3) return false;
  if (boxIndex < boxCount - 2) return false;
  if (currentBoxIndex !== null && boxIndex === currentBoxIndex) return false;
  return true;
}

function normalizePokemon(
  value: unknown,
  trainerId: string,
  teamPosition: number | null,
  status: ImportedPokemon["status"],
  randomizer: SaveRandomizerSettings,
): ImportedPokemon | null {
  if (!value) return null;

  const rawSpecies = valueText(getProperty(value, "species"));
  const personalId = valueText(getProperty(value, "personalID"));
  if (!rawSpecies || !personalId) return null;

  const species = displayLabel(rawSpecies);
  if (!species) return null;

  const rawGender = numberValue(getProperty(value, "gender"));
  const gender =
    rawGender === 0
      ? "male"
      : rawGender === 1
        ? "female"
        : rawGender === 2
          ? "genderless"
          : "unknown";
  const ivs = getProperty(value, "iv");
  const evs = getProperty(value, "ev");
  const originMapId = boundedNumber(getProperty(value, "obtain_map"), 1, 2_147_483_647);
  const originName =
    originMapId === null
      ? null
      : routeNameByMapId.get(originMapId) ?? `Zona desconocida (ID ${originMapId})`;

  return {
    source_identity: `${trainerId}:${personalId}`,
    status,
    species,
    form: boundedNumber(getProperty(value, "form"), 0, 32_767) ?? 0,
    nickname: valueText(getProperty(value, "name"))?.slice(0, 80) ?? null,
    level: boundedNumber(getProperty(value, "level"), 1, 100),
    gender,
    nature: displayLabel(getProperty(value, "nature")),
    ability: importedAbility(value, randomizer),
    held_item: displayLabel(getProperty(value, "item")),
    is_shiny: getProperty(value, "shiny") === true,
    team_position: teamPosition,
    origin_map_id: originMapId,
    origin_name: originName,
    obtain_method: boundedNumber(getProperty(value, "obtain_method"), 0, 32_767),
    captured_at: timestampFromSave(getProperty(value, "timeReceived")),
    iv_hp: statValue(ivs, "HP", 31),
    iv_attack: statValue(ivs, "ATTACK", 31),
    iv_defense: statValue(ivs, "DEFENSE", 31),
    iv_special_attack: statValue(ivs, "SPECIAL_ATTACK", 31),
    iv_special_defense: statValue(ivs, "SPECIAL_DEFENSE", 31),
    iv_speed: statValue(ivs, "SPEED", 31),
    ev_hp: statValue(evs, "HP", 252),
    ev_attack: statValue(evs, "ATTACK", 252),
    ev_defense: statValue(evs, "DEFENSE", 252),
    ev_special_attack: statValue(evs, "SPECIAL_ATTACK", 252),
    ev_special_defense: statValue(evs, "SPECIAL_DEFENSE", 252),
    ev_speed: statValue(evs, "SPEED", 252),
    moves: movesFromSave(getProperty(value, "moves")),
  };
}

export function parseConsonanciaSave(data: Uint8Array): ParsedSave {
  let saveObjects: unknown[];
  try {
    saveObjects = loadAll(data, { string: "binary" });
  } catch {
    throw new Error("El archivo no es un save válido de Pokémon Consonancia.");
  }

  const save = saveObjects[0];
  const player = getProperty(save, "player");
  const randomizer = randomizerSettingsFromSave(save);
  const party = getProperty(player, "party");
  const trainerIdValue = getProperty(player, "id");
  const trainerName = valueText(getProperty(player, "name")) ?? "Desconocido";
  const trainerId = valueText(trainerIdValue);

  if (
    !player ||
    !Array.isArray(party) ||
    !trainerId ||
    trainerId.length > 100 ||
    !/^[A-Za-z0-9_.:-]+$/.test(trainerId)
  ) {
    throw new Error("No se encontró un entrenador válido dentro del save.");
  }

  const pokemonByIdentity = new Map<string, ImportedPokemon>();
  party.forEach((pokemon, index) => {
    const imported = normalizePokemon(
      pokemon,
      trainerId,
      index < 6 ? index + 1 : null,
      "alive",
      randomizer,
    );
    if (imported) pokemonByIdentity.set(imported.source_identity, imported);
  });

  const storage = getProperty(save, "storage_system");
  const boxes = getProperty(storage, "boxes");
  const hasStorage = Array.isArray(boxes);
  const currentBoxIndex = storageCurrentBoxIndex(storage, Array.isArray(boxes) ? boxes.length : 0);
  if (Array.isArray(boxes)) {
    for (const [boxIndex, box] of boxes.entries()) {
      const boxPokemon = getProperty(box, "pokemon");
      if (!Array.isArray(boxPokemon)) continue;
      const isDeadBox = isGraveBox(boxIndex, boxes.length, currentBoxIndex);
      for (const pokemon of boxPokemon) {
        const imported = normalizePokemon(
          pokemon,
          trainerId,
          null,
          isDeadBox ? "dead" : "alive",
          randomizer,
        );
        if (imported && !pokemonByIdentity.has(imported.source_identity)) {
          pokemonByIdentity.set(imported.source_identity, imported);
        }
      }
    }
  }

  if (pokemonByIdentity.size === 0 || pokemonByIdentity.size > 1_000) {
    throw new Error("El save no contiene una caja o un equipo de Pokémon válido.");
  }

  const badges = getProperty(player, "badges");
  const medalIds = Array.isArray(badges)
    ? badges.slice(0, 5).flatMap((earned, index) => earned === true ? [index + 1] : [])
    : [];
  const unknownMapIds = Array.from(
    new Set(
      Array.from(pokemonByIdentity.values())
        .filter(
          (pokemon) =>
            pokemon.origin_map_id !== null &&
            pokemon.origin_name?.startsWith("Zona desconocida"),
        )
        .map((pokemon) => pokemon.origin_map_id as number),
    ),
  ).sort((left, right) => left - right);

  return {
    trainerName: trainerName.slice(0, 60),
    gameTrainerName: trainerName.slice(0, 60),
    pokemon: Array.from(pokemonByIdentity.values()),
    medalIds,
    unknownMapIds,
    hasStorage,
  };
}
