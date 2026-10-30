import "server-only";

import { loadAll } from "@hyrious/marshal";
import { getRandomizedAbility } from "@/lib/consonancia-randomizer-abilities";
import {
  displayMarketItemName,
  getMarketItem,
  resolveMarketSlug,
} from "@/lib/market-items";
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

export type ImportedBagPocket = "usable" | "held" | "ball" | "berry";

export type ImportedBagItem = {
  item_key: string;
  item_name: string;
  item_slug: string | null;
  quantity: number;
  pocket: ImportedBagPocket;
};

export type ParsedSave = {
  trainerName: string;
  gameTrainerName: string;
  pokemon: ImportedPokemon[];
  bag: ImportedBagItem[];
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

function itemKeyFromSave(value: unknown) {
  const text = valueText(value);
  if (!text) return null;
  const key = text.replace(/^:/, "").replace(/\s+/g, "_").toUpperCase();
  return key.length >= 1 && key.length <= 80 ? key : null;
}

function isTechnicalMachine(key: string, name = "") {
  return /^(TM|HM|MT|MO|TR)\s*\d+/i.test(key) || /^(TM|HM|MT|MO|TR)\s*\d+/i.test(name);
}

function pocketKind(
  index: number,
  pocketCount: number,
  name: string,
): ImportedBagPocket | "skip" {
  const label = name.toLowerCase();
  if (label.includes("key")) return "skip";
  if (label.includes("mail") || label.includes("carta")) return "skip";
  if (
    /\btm\b/.test(label) ||
    /\bmt\b/.test(label) ||
    /\bhm\b/.test(label) ||
    /\bmo\b/.test(label) ||
    label.includes("máquina") ||
    label.includes("maquina")
  ) {
    return "skip";
  }
  if (label.includes("battle") || label.includes("combate") || label.includes("equip")) {
    return "held";
  }
  if (label.includes("ball") || label.includes("bola")) return "ball";
  if (label.includes("berry") || label.includes("baya")) return "berry";
  if (label.includes("medicine") || label.includes("medic") || label.includes("item")) {
    return "usable";
  }

  if (pocketCount >= 8) {
    const map: Array<ImportedBagPocket | "skip" | undefined> = [
      undefined,
      "usable",
      "usable",
      "ball",
      "skip",
      "berry",
      "skip",
      "held",
      "skip",
    ];
    return map[index] ?? "usable";
  }

  const classic: Array<ImportedBagPocket | "skip"> = [
    "usable",
    "ball",
    "skip",
    "skip",
    "berry",
  ];
  if (index >= 0 && index < classic.length) return classic[index];
  if (index >= 1 && index - 1 < classic.length) return classic[index - 1];
  return "usable";
}

function collectPocketEntries(pocket: unknown): Array<{ key: string; quantity: number }> {
  if (!pocket) return [];

  const contents =
    getProperty(pocket, "contents") ??
    getProperty(pocket, "list") ??
    getProperty(pocket, "items") ??
    getProperty(pocket, "data") ??
    pocket;

  const entries: Array<{ key: string; quantity: number }> = [];

  function push(rawItem: unknown, rawQty: unknown) {
    const key = itemKeyFromSave(rawItem);
    const quantity = numberValue(rawQty);
    if (!key || !/^[A-Z][A-Z0-9_]{0,79}$/.test(key) || quantity === null || quantity < 1) return;
    entries.push({ key, quantity: Math.min(quantity, 999) });
  }

  if (contents instanceof Map) {
    for (const [item, quantity] of contents) {
      push(item, quantity);
    }
    return entries;
  }

  if (Array.isArray(contents)) {
    for (const entry of contents) {
      if (!entry) continue;
      if (Array.isArray(entry) && entry.length >= 2) {
        push(entry[0], entry[1]);
        continue;
      }
      push(
        getProperty(entry, "id") ?? getProperty(entry, "item") ?? entry,
        getProperty(entry, "quantity") ??
          getProperty(entry, "count") ??
          getProperty(entry, "qty") ??
          getProperty(entry, "amount"),
      );
    }
    return entries;
  }

  if (isRecord(contents)) {
    for (const key of Reflect.ownKeys(contents)) {
      const label = typeof key === "symbol" ? key.description ?? "" : String(key);
      if (label.startsWith("@") && !/^@?[A-Z0-9_]+$/.test(label.replace(/^@/, ""))) {
        continue;
      }
      if (
        /pocket|viewed|registered|ready|max_slots|selection/i.test(label)
      ) {
        continue;
      }
      push(typeof key === "symbol" ? key : label.replace(/^@/, ""), contents[key as keyof typeof contents]);
    }
  }

  return entries;
}

function indexedPockets(pockets: unknown): Array<{ index: number; name: string; pocket: unknown }> {
  if (pockets instanceof Map) {
    return Array.from(pockets.entries()).flatMap(([key, pocket], order) => {
      if (!pocket) return [];
      const index = numberValue(key) ?? order;
      return [{ index, name: valueText(key) ?? "", pocket }];
    });
  }

  if (Array.isArray(pockets)) {
    return pockets.flatMap((pocket, index) =>
      pocket ? [{ index, name: "", pocket }] : [],
    );
  }

  if (isRecord(pockets) && getProperty(pockets, "pockets")) {
    return indexedPockets(getProperty(pockets, "pockets"));
  }

  if (isRecord(pockets)) {
    return [{ index: 1, name: "", pocket: pockets }];
  }

  return [];
}

function bagItemsFromSave(save: unknown): ImportedBagItem[] {
  const player = getProperty(save, "player");
  const bag =
    getProperty(save, "bag") ??
    getProperty(save, "pokemon_bag") ??
    getProperty(save, "PokemonBag") ??
    getProperty(player, "bag") ??
    getProperty(player, "pokemon_bag");

  if (!bag) return [];

  const pockets = getProperty(bag, "pockets") ?? getProperty(bag, "pocket") ?? bag;
  const indexed = indexedPockets(pockets);
  const pocketCount = Math.max(
    indexed.length,
    indexed.reduce((max, row) => Math.max(max, row.index), 0),
  );

  const merged = new Map<string, ImportedBagItem>();

  for (const row of indexed) {
    const kind = pocketKind(row.index, pocketCount, row.name);
    if (kind === "skip") continue;
    for (const entry of collectPocketEntries(row.pocket)) {
      if (isTechnicalMachine(entry.key)) continue;
      const slug = resolveMarketSlug(entry.key);
      const catalog = getMarketItem(slug);
      const current = merged.get(entry.key);
      const quantity = Math.min((current?.quantity ?? 0) + entry.quantity, 999);
      merged.set(entry.key, {
        item_key: entry.key,
        item_name:
          catalog?.name ??
          displayMarketItemName(slug, displayLabel(entry.key) ?? entry.key),
        item_slug: slug,
        quantity,
        pocket: current?.pocket === "held" ? "held" : kind,
      });
    }
  }

  return Array.from(merged.values())
    .sort((left, right) => left.item_name.localeCompare(right.item_name, "es"))
    .slice(0, 400);
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
    bag: bagItemsFromSave(save),
    medalIds,
    unknownMapIds,
    hasStorage,
  };
}
