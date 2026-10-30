import pokeapiItemNames from "@/lib/pokeapi-item-names.json";

export type MarketItem = {
  slug: string;
  name: string;
};

export const MARKET_ITEMS: MarketItem[] = [
  { slug: "master-ball", name: "Master Ball" },
  { slug: "ultra-ball", name: "Ultra Ball" },
  { slug: "great-ball", name: "Super Ball" },
  { slug: "poke-ball", name: "Poké Ball" },
  { slug: "premier-ball", name: "Honor Ball" },
  { slug: "luxury-ball", name: "Lux Ball" },
  { slug: "timer-ball", name: "Turno Ball" },
  { slug: "quick-ball", name: "Rapidez Ball" },
  { slug: "dusk-ball", name: "Ocaso Ball" },
  { slug: "heal-ball", name: "Sana Ball" },
  { slug: "nest-ball", name: "Nido Ball" },
  { slug: "net-ball", name: "Malla Ball" },
  { slug: "repeat-ball", name: "Acopio Ball" },
  { slug: "dive-ball", name: "Buceo Ball" },
  { slug: "fast-ball", name: "Rapid Ball" },
  { slug: "level-ball", name: "Nivel Ball" },
  { slug: "lure-ball", name: "Cebo Ball" },
  { slug: "moon-ball", name: "Luna Ball" },
  { slug: "friend-ball", name: "Amigo Ball" },
  { slug: "love-ball", name: "Amor Ball" },
  { slug: "heavy-ball", name: "Peso Ball" },
  { slug: "dream-ball", name: "Ensueño Ball" },
  { slug: "beast-ball", name: "Ente Ball" },
  { slug: "cherish-ball", name: "Gloria Ball" },
  { slug: "rare-candy", name: "Carameloraro" },
  { slug: "exp-candy-xl", name: "Caramelo Exp. XL" },
  { slug: "ability-capsule", name: "Cápsula habilidad" },
  { slug: "ability-patch", name: "Parche habilidad" },
  { slug: "bottle-cap", name: "Chapa plateada" },
  { slug: "gold-bottle-cap", name: "Chapa dorada" },
  { slug: "max-revive", name: "Revivir máximo" },
  { slug: "revive", name: "Revivir" },
  { slug: "full-restore", name: "Restaurar todo" },
  { slug: "max-potion", name: "Poción máxima" },
  { slug: "max-elixir", name: "Elixir máximo" },
  { slug: "pp-max", name: "Más PP máximo" },
  { slug: "sacred-ash", name: "Ceniza sagrada" },
  { slug: "leftovers", name: "Restos" },
  { slug: "life-orb", name: "Vidasfera" },
  { slug: "choice-band", name: "Cinta elección" },
  { slug: "choice-specs", name: "Gafas elección" },
  { slug: "choice-scarf", name: "Pañuelo elección" },
  { slug: "focus-sash", name: "Banda focus" },
  { slug: "assault-vest", name: "Chaleco asalto" },
  { slug: "rocky-helmet", name: "Casco dentado" },
  { slug: "eviolite", name: "Mineral evolutivo" },
  { slug: "heavy-duty-boots", name: "Botas gruesas" },
  { slug: "covert-cloak", name: "Capa furtiva" },
  { slug: "loaded-dice", name: "Dado trucado" },
  { slug: "booster-energy", name: "Energía potenciadora" },
  { slug: "punching-glove", name: "Guante de boxeo" },
  { slug: "clear-amulet", name: "Amuleto puro" },
  { slug: "mirror-herb", name: "Hierba copia" },
  { slug: "ability-shield", name: "Escudo habilidad" },
  { slug: "air-balloon", name: "Globo helio" },
  { slug: "weakness-policy", name: "Seguro debilidad" },
  { slug: "expert-belt", name: "Cinta experto" },
  { slug: "scope-lens", name: "Periscopio" },
  { slug: "wide-lens", name: "Lupa" },
  { slug: "zoom-lens", name: "Telescopio" },
  { slug: "bright-powder", name: "Polvo brillo" },
  { slug: "kings-rock", name: "Roca del rey" },
  { slug: "razor-claw", name: "Garra afilada" },
  { slug: "razor-fang", name: "Colmillo agudo" },
  { slug: "light-clay", name: "Refleluz" },
  { slug: "mental-herb", name: "Hierba mental" },
  { slug: "white-herb", name: "Hierba blanca" },
  { slug: "power-herb", name: "Hierba poder" },
  { slug: "sitrus-berry", name: "Baya Zidra" },
  { slug: "lum-berry", name: "Baya Ziuela" },
  { slug: "oran-berry", name: "Baya Aranja" },
  { slug: "leppa-berry", name: "Baya Zanama" },
  { slug: "chesto-berry", name: "Baya Atania" },
  { slug: "pecha-berry", name: "Baya Meloc" },
  { slug: "rawst-berry", name: "Baya Safre" },
  { slug: "aspear-berry", name: "Baya Perasi" },
  { slug: "cheri-berry", name: "Baya Zreza" },
  { slug: "wiki-berry", name: "Baya Wiki" },
  { slug: "aguav-berry", name: "Baya Guaya" },
  { slug: "figy-berry", name: "Baya Higog" },
  { slug: "iapapa-berry", name: "Baya Pabaya" },
  { slug: "mago-berry", name: "Baya Ango" },
  { slug: "liechi-berry", name: "Baya Lichi" },
  { slug: "ganlon-berry", name: "Baya Gonlan" },
  { slug: "salac-berry", name: "Baya Aslac" },
  { slug: "petaya-berry", name: "Baya Yapeyú" },
  { slug: "apicot-berry", name: "Baya Aricoc" },
  { slug: "custap-berry", name: "Baya Chilan" },
  { slug: "enigma-berry", name: "Baya Enigma" },
  { slug: "micle-berry", name: "Baya Lagro" },
  { slug: "jaboca-berry", name: "Baya Jaboca" },
  { slug: "rowap-berry", name: "Baya Magua" },
  { slug: "kee-berry", name: "Baya Doscunas" },
  { slug: "maranga-berry", name: "Baya Maranga" },
  { slug: "occa-berry", name: "Baya Caoca" },
  { slug: "passho-berry", name: "Baya Pasio" },
  { slug: "wacan-berry", name: "Baya Gualot" },
  { slug: "rindo-berry", name: "Baya Tania" },
  { slug: "yache-berry", name: "Baya Yecur" },
  { slug: "chople-berry", name: "Baya Pomaro" },
  { slug: "kebia-berry", name: "Baya Kebia" },
  { slug: "shuca-berry", name: "Baya Acardo" },
  { slug: "coba-berry", name: "Baya Kouba" },
  { slug: "payapa-berry", name: "Baya Payapa" },
  { slug: "tanga-berry", name: "Baya Yama" },
  { slug: "charti-berry", name: "Baya Alcho" },
  { slug: "kasib-berry", name: "Baya Drasi" },
  { slug: "haban-berry", name: "Baya Anjiro" },
  { slug: "colbur-berry", name: "Baya Dillo" },
  { slug: "babiri-berry", name: "Baya Baribá" },
  { slug: "chilan-berry", name: "Baya Chilan" },
  { slug: "roseli-berry", name: "Baya Hibis" },
  { slug: "cornn-berry", name: "Baya Mais" },
  { slug: "magost-berry", name: "Baya Aostan" },
  { slug: "rabuta-berry", name: "Baya Rautan" },
  { slug: "nomel-berry", name: "Baya Monli" },
  { slug: "spelon-berry", name: "Baya Wikano" },
  { slug: "pamtre-berry", name: "Baya Plama" },
  { slug: "watmel-berry", name: "Baya Sambia" },
  { slug: "durin-berry", name: "Baya Rudion" },
  { slug: "belue-berry", name: "Baya Andano" },
  { slug: "lansat-berry", name: "Baya Zonlan" },
  { slug: "starf-berry", name: "Baya Arabol" },
  { slug: "health-mochi", name: "Mochi vigor" },
  { slug: "muscle-mochi", name: "Mochi músculo" },
  { slug: "resist-mochi", name: "Mochi aguante" },
  { slug: "genius-mochi", name: "Mochi intelecto" },
  { slug: "clever-mochi", name: "Mochi mente" },
  { slug: "swift-mochi", name: "Mochi ímpetu" },
  { slug: "fresh-start-mochi", name: "Mochi nuevo día" },
  { slug: "black-sludge", name: "Lodo negro" },
  { slug: "toxic-orb", name: "Toxisfera" },
  { slug: "flame-orb", name: "Llamasfera" },
  { slug: "iron-ball", name: "Bola férrea" },
  { slug: "lagging-tail", name: "Cola plúmbea" },
  { slug: "shed-shell", name: "Muda concha" },
  { slug: "red-card", name: "Tarjeta roja" },
  { slug: "eject-button", name: "Botón escape" },
  { slug: "eject-pack", name: "Mochila escape" },
  { slug: "safety-goggles", name: "Gafa protectora" },
  { slug: "protective-pads", name: "Defendiente" },
  { slug: "throat-spray", name: "Espray bucal" },
  { slug: "utility-umbrella", name: "Parasol multiuso" },
  { slug: "terrain-extender", name: "Cubresuelos" },
  { slug: "electric-seed", name: "Semilla electro" },
  { slug: "grassy-seed", name: "Semilla hierba" },
  { slug: "misty-seed", name: "Semilla niebla" },
  { slug: "psychic-seed", name: "Semilla psíquica" },
  { slug: "focus-band", name: "Cinta focus" },
  { slug: "quick-claw", name: "Garra rápida" },
  { slug: "destiny-knot", name: "Lazo destino" },
  { slug: "everstone", name: "Piedra eterna" },
  { slug: "lucky-egg", name: "Huevo suerte" },
  { slug: "amulet-coin", name: "Moneda amuleto" },
  { slug: "soot-sack", name: "Saco hollín" },
  { slug: "oval-stone", name: "Piedra oval" },
  { slug: "dusk-stone", name: "Piedra noche" },
  { slug: "dawn-stone", name: "Piedra alba" },
  { slug: "shiny-stone", name: "Piedra día" },
  { slug: "ice-stone", name: "Piedra hielo" },
  { slug: "fire-stone", name: "Piedra fuego" },
  { slug: "water-stone", name: "Piedra agua" },
  { slug: "thunder-stone", name: "Piedra trueno" },
  { slug: "leaf-stone", name: "Piedra hoja" },
  { slug: "moon-stone", name: "Piedra lunar" },
  { slug: "sun-stone", name: "Piedra solar" },
  { slug: "protector", name: "Protector" },
  { slug: "electirizer", name: "Electrizador" },
  { slug: "magmarizer", name: "Magmatizador" },
  { slug: "reaper-cloth", name: "Tela terrible" },
  { slug: "dubious-disc", name: "Disco extraño" },
  { slug: "prism-scale", name: "Escama bella" },
  { slug: "sachet", name: "Saquito fragante" },
  { slug: "whipped-dream", name: "Dulce de nata" },
  { slug: "sweet-apple", name: "Manzana dulce" },
  { slug: "tart-apple", name: "Manzana ácida" },
  { slug: "cracked-pot", name: "Tetera agrietada" },
  { slug: "chipped-pot", name: "Tetera rota" },
  { slug: "auspicious-armor", name: "Armadura auspiciosa" },
  { slug: "malicious-armor", name: "Armadura maldita" },
  { slug: "leader-s-crest", name: "Distintivo de líder" },
  { slug: "metal-coat", name: "Revestimiento metálico" },
  { slug: "dragon-scale", name: "Escamadragón" },
  { slug: "upgrade", name: "Mejora" },
  { slug: "linking-cord", name: "Cable unión" },
  { slug: "nugget", name: "Pepita" },
  { slug: "big-nugget", name: "Maxipepita" },
  { slug: "rare-bone", name: "Hueso raro" },
  { slug: "star-piece", name: "Trozo estrella" },
  { slug: "comet-shard", name: "Fragmento cometa" },
  { slug: "tiny-mushroom", name: "Mini seta" },
  { slug: "big-mushroom", name: "Seta grande" },
  { slug: "balm-mushroom", name: "Seta aroma" },
  { slug: "pearl", name: "Perla" },
  { slug: "big-pearl", name: "Perla grande" },
  { slug: "pearl-string", name: "Sarta perlas" },
  { slug: "potion", name: "Poción" },
  { slug: "super-potion", name: "Superpoción" },
  { slug: "hyper-potion", name: "Hiperpoción" },
  { slug: "fresh-water", name: "Agua fresca" },
  { slug: "soda-pop", name: "Refresco" },
  { slug: "lemonade", name: "Limonada" },
  { slug: "moomoo-milk", name: "Leche Mu-mu" },
  { slug: "energy-powder", name: "Polvoenergía" },
  { slug: "energy-root", name: "Raíz energética" },
  { slug: "heal-powder", name: "Polvocuración" },
  { slug: "revival-herb", name: "Hierba revivir" },
  { slug: "antidote", name: "Antídoto" },
  { slug: "paralyze-heal", name: "Antiparalizador" },
  { slug: "awakening", name: "Despertar" },
  { slug: "burn-heal", name: "Antiquemar" },
  { slug: "ice-heal", name: "Antihielo" },
  { slug: "full-heal", name: "Cura total" },
  { slug: "ether", name: "Éter" },
  { slug: "max-ether", name: "Éter máximo" },
  { slug: "elixir", name: "Elixir" },
  { slug: "repel", name: "Repelente" },
  { slug: "super-repel", name: "Superrepelente" },
  { slug: "max-repel", name: "Repelente máximo" },
  { slug: "escape-rope", name: "Cuerda huida" },
  { slug: "poke-doll", name: "Poké muñeco" },
  { slug: "fluffy-tail", name: "Cola Skitty" },
  { slug: "x-attack", name: "Ataque X" },
  { slug: "x-defense", name: "Defensa X" },
  { slug: "x-sp-atk", name: "Ataque especial X" },
  { slug: "x-sp-def", name: "Defensa especial X" },
  { slug: "x-speed", name: "Velocidad X" },
  { slug: "x-accuracy", name: "Precisión X" },
  { slug: "dire-hit", name: "Directo" },
  { slug: "guard-spec", name: "Guarda especial" },
  { slug: "hp-up", name: "Más PS" },
  { slug: "protein", name: "Proteína" },
  { slug: "iron", name: "Hierro" },
  { slug: "calcium", name: "Calcio" },
  { slug: "zinc", name: "Zinc" },
  { slug: "carbos", name: "Carburante" },
  { slug: "pp-up", name: "Más PP" },
  { slug: "health-feather", name: "Pluma vigor" },
  { slug: "muscle-feather", name: "Pluma músculo" },
  { slug: "resist-feather", name: "Pluma aguante" },
  { slug: "genius-feather", name: "Pluma intelecto" },
  { slug: "clever-feather", name: "Pluma mente" },
  { slug: "swift-feather", name: "Pluma ímpetu" },
  { slug: "pretty-feather", name: "Pluma bella" },
  { slug: "honey", name: "Miel" },
  { slug: "black-belt", name: "Cinturón negro" },
  { slug: "black-glasses", name: "Gafas de sol" },
  { slug: "charcoal", name: "Carbón" },
  { slug: "dragon-fang", name: "Colmillo dragón" },
  { slug: "hard-stone", name: "Piedra dura" },
  { slug: "magnet", name: "Imán" },
  { slug: "miracle-seed", name: "Semilla milagro" },
  { slug: "mystic-water", name: "Agua mística" },
  { slug: "never-melt-ice", name: "Antiderretir" },
  { slug: "poison-barb", name: "Flecha venenosa" },
  { slug: "sharp-beak", name: "Pico afilado" },
  { slug: "silk-scarf", name: "Pañuelo seda" },
  { slug: "silver-powder", name: "Polvo plata" },
  { slug: "soft-sand", name: "Arena fina" },
  { slug: "spell-tag", name: "Hechizo" },
  { slug: "twisted-spoon", name: "Cuchara torcida" },
  { slug: "fairy-feather", name: "Pluma feérica" },
  { slug: "pixie-plate", name: "Tabla duende" },
  { slug: "flame-plate", name: "Tabla llama" },
  { slug: "splash-plate", name: "Tabla linfa" },
  { slug: "zap-plate", name: "Tabla trueno" },
  { slug: "meadow-plate", name: "Tabla prado" },
  { slug: "icicle-plate", name: "Tabla hielo" },
  { slug: "fist-plate", name: "Tabla férrea" },
  { slug: "toxic-plate", name: "Tabla tóxica" },
  { slug: "earth-plate", name: "Tabla terrestre" },
  { slug: "sky-plate", name: "Tabla cielo" },
  { slug: "mind-plate", name: "Tabla mental" },
  { slug: "insect-plate", name: "Tabla bicho" },
  { slug: "stone-plate", name: "Tabla pétrea" },
  { slug: "spooky-plate", name: "Tabla terror" },
  { slug: "draco-plate", name: "Tabla draco" },
  { slug: "dread-plate", name: "Tabla oscura" },
  { slug: "iron-plate", name: "Tabla acero" },
  { slug: "smooth-rock", name: "Roca suave" },
  { slug: "heat-rock", name: "Roca calor" },
  { slug: "damp-rock", name: "Roca lluvia" },
  { slug: "icy-rock", name: "Roca helada" },
  { slug: "light-ball", name: "Bolaluminosa" },
  { slug: "lucky-punch", name: "Puño suerte" },
  { slug: "leek", name: "Puerro" },
  { slug: "thick-club", name: "Hueso grueso" },
  { slug: "metal-powder", name: "Polvo metálico" },
  { slug: "quick-powder", name: "Polvo velocidad" },
  { slug: "deep-sea-scale", name: "Escama marina" },
  { slug: "deep-sea-tooth", name: "Diente marino" },
  { slug: "soul-dew", name: "Rocío bondad" },
  { slug: "adamant-orb", name: "Diamansfera" },
  { slug: "lustrous-orb", name: "Lustresfera" },
  { slug: "griseous-orb", name: "Griseosfera" },
  { slug: "exp-share", name: "Repartir exp" },
  { slug: "macho-brace", name: "Brazal recio" },
  { slug: "power-weight", name: "Pesa recia" },
  { slug: "power-bracer", name: "Brazal recio vigor" },
  { slug: "power-belt", name: "Cinto recio" },
  { slug: "power-lens", name: "Lente recia" },
  { slug: "power-band", name: "Banda recia" },
  { slug: "power-anklet", name: "Franja recia" },
  { slug: "soothe-bell", name: "Campana alivio" },
  { slug: "smoke-ball", name: "Bola humo" },
  { slug: "cleanse-tag", name: "Amuleto" },
  { slug: "shell-bell", name: "Campana concha" },
  { slug: "metronome", name: "Metrónomo" },
  { slug: "muscle-band", name: "Cinta fuerte" },
  { slug: "wise-glasses", name: "Gafas especiales" },
  { slug: "sticky-barb", name: "Toxiestrella" },
  { slug: "ring-target", name: "Blanco" },
  { slug: "binding-band", name: "Banda atadura" },
  { slug: "float-stone", name: "Piedra pómez" },
  { slug: "red-orb", name: "Esfera roja" },
  { slug: "blue-orb", name: "Esfera azul" },
  { slug: "adrenaline-orb", name: "Nerviosfera" },
  { slug: "luminous-moss", name: "Musgo brillante" },
  { slug: "snowball", name: "Bola de nieve" },
  { slug: "room-service", name: "Servicio raro" },
  { slug: "blunder-policy", name: "Seguro fallo" },
  { slug: "big-root", name: "Raíz grande" },
];

const ITEM_KEY_ALIASES: Record<string, string> = {
  xspatk: "x-sp-atk",
  xspdef: "x-sp-def",
  xspattack: "x-sp-atk",
  xspdefense: "x-sp-def",
  xdefence: "x-defense",
  guardspec: "guard-spec",
  guardspecs: "guard-spec",
  paralyzeheal: "paralyze-heal",
  paralysisheal: "paralyze-heal",
  nevermeltice: "never-melt-ice",
  blackglasses: "black-glasses",
  twistedspoon: "twisted-spoon",
  silverspecs: "wise-glasses",
  expshare: "exp-share",
  pokingdoll: "poke-doll",
  pokedoll: "poke-doll",
  escaperope: "escape-rope",
  maxrepel: "max-repel",
  superrepel: "super-repel",
  hyperpotion: "hyper-potion",
  superpotion: "super-potion",
  maxpotion: "max-potion",
  fullrestore: "full-restore",
  maxrevive: "max-revive",
  maxelixir: "max-elixir",
  maxether: "max-ether",
  ppup: "pp-up",
  ppmax: "pp-max",
  hpup: "hp-up",
  rarecandy: "rare-candy",
  choiceband: "choice-band",
  choicespecs: "choice-specs",
  choicescarf: "choice-scarf",
  focussash: "focus-sash",
  focusband: "focus-band",
  leftovers: "leftovers",
  lifeorb: "life-orb",
  assaultvest: "assault-vest",
};

function compactItemText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/g, "");
}

const itemsBySlug = new Map<string, MarketItem>();
const itemsByCompact = new Map<string, MarketItem>();

function indexItems(items: readonly MarketItem[]) {
  for (const item of items) {
    itemsBySlug.set(item.slug, item);
    itemsByCompact.set(compactItemText(item.slug), item);
    itemsByCompact.set(compactItemText(item.name), item);
  }
}

indexItems(pokeapiItemNames as MarketItem[]);
indexItems(MARKET_ITEMS);

export function searchMarketItems(query: string, limit = 18) {
  const q = query.trim().toLowerCase();
  if (!q) return MARKET_ITEMS.slice(0, limit);
  const compact = compactItemText(q);
  const matches: MarketItem[] = [];
  for (const item of itemsBySlug.values()) {
    if (
      item.name.toLowerCase().includes(q) ||
      item.slug.includes(q) ||
      compactItemText(item.slug).includes(compact)
    ) {
      matches.push(item);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

export function getMarketItem(slug: string | null | undefined) {
  if (!slug) return null;
  return itemsBySlug.get(slug) ?? itemsByCompact.get(compactItemText(slug)) ?? null;
}

export function resolveMarketSlug(itemKey: string) {
  const compact = compactItemText(itemKey);
  if (!compact) return null;
  const aliased = ITEM_KEY_ALIASES[compact];
  if (aliased && itemsBySlug.has(aliased)) return aliased;
  const dashed = itemKey
    .toLowerCase()
    .replace(/^:/, "")
    .replace(/[_]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const exact = itemsBySlug.get(dashed);
  if (exact) return exact.slug;
  const found = itemsByCompact.get(compact);
  return found?.slug ?? (dashed || null);
}

export function displayMarketItemName(
  slug: string | null | undefined,
  fallback?: string | null,
) {
  const fromSlug = getMarketItem(slug ?? null);
  if (fromSlug) return fromSlug.name;
  if (fallback) {
    const fromName = itemsByCompact.get(compactItemText(fallback));
    if (fromName) return fromName.name;
    const fromKey = getMarketItem(resolveMarketSlug(fallback));
    if (fromKey) return fromKey.name;
  }
  const label = fallback?.trim();
  return label && label.length > 0 ? label : "Objeto";
}

export function itemSpriteUrl(slug: string) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
}

export function resolveItemLabel(slug: string | null, fallback: string | null) {
  const name = displayMarketItemName(slug, fallback);
  return name === "Objeto" && !fallback?.trim() ? null : name;
}

export function listingHeadline(listing: {
  kind: "sell_item" | "buy_item" | "pokemon_for_item";
  offerLabel: string | null;
  offerItemSlug: string | null;
  wantLabel: string | null;
  wantItemSlug: string | null;
  pokemon: { species: string; nickname: string | null } | null;
}) {
  const offer =
    listing.kind === "pokemon_for_item"
      ? listing.pokemon?.nickname?.trim() || listing.pokemon?.species || "Pokémon"
      : resolveItemLabel(listing.offerItemSlug, listing.offerLabel);
  const want = resolveItemLabel(listing.wantItemSlug, listing.wantLabel);

  if (listing.kind === "sell_item") {
    return want
      ? `Tengo ${offer}. Lo vendo · quiero ${want}`
      : `Tengo ${offer}. Lo vendo`;
  }
  if (listing.kind === "buy_item") {
    return `Quiero ${want}. Lo compro`;
  }
  return `Cambio ${offer} por ${want}`;
}
