import "server-only";

import { getCurrentPlayer, type PlayerSession } from "@/lib/auth";
import type {
  MarketListing,
  MarketListingKind,
  MarketOwnedItem,
  MarketOwnedPokemon,
  MarketPendingOffer,
  MarketShop,
  MarketTrade,
} from "@/lib/market-types";
import { displayMarketItemName, listingHeadline } from "@/lib/market-items";
import {
  createSupabaseAdminClient,
  getSupabaseConfiguration,
} from "@/lib/supabase/admin";

export type MarketPageData =
  | { status: "not-configured"; missingVariables: string[] }
  | { status: "error" }
  | {
      status: "ready";
      player: PlayerSession | null;
      listings: MarketListing[];
      shops: MarketShop[];
      recentTrades: MarketTrade[];
      tradedWithIds: string[];
      pendingOfferPlayerIds: string[];
      ownedPokemon: MarketOwnedPokemon[];
      ownedBagItems: MarketOwnedItem[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseKind(value: unknown): MarketListingKind | null {
  if (value === "sell_item" || value === "buy_item" || value === "pokemon_for_item") {
    return value;
  }
  return null;
}

type PlayerRow = { id: string; displayName: string; color: string };

function parseListing(
  value: unknown,
  players: Map<string, PlayerRow>,
): MarketListing | null {
  if (!isRecord(value)) return null;
  const kind = parseKind(value.kind);
  const id = asString(value.id);
  const playerId = asString(value.player_id);
  if (!kind || !id || !playerId) return null;
  const owner = players.get(playerId);
  const species = asString(value.pokemon_species);
  const pokemonId = asString(value.pokemon_id);
  const form = asNumber(value.pokemon_form) ?? 0;

  return {
    id,
    playerId,
    playerName: owner?.displayName ?? "Jugador",
    playerColor: owner?.color ?? "#64748b",
    kind,
    offerLabel: asString(value.offer_label),
    offerItemSlug: asString(value.offer_item_slug),
    wantLabel: asString(value.want_label),
    wantItemSlug: asString(value.want_item_slug),
    pokemon:
      species && pokemonId
        ? {
            id: pokemonId,
            species,
            nickname: asString(value.pokemon_nickname),
            form,
            isShiny: value.pokemon_is_shiny === true,
          }
        : species
          ? {
              id: pokemonId ?? id,
              species,
              nickname: asString(value.pokemon_nickname),
              form,
              isShiny: value.pokemon_is_shiny === true,
            }
          : null,
    note: asString(value.note),
    photoData: asString(value.photo_data),
    status: value.status === "closed" ? "closed" : "open",
    createdAt: asString(value.created_at) ?? new Date().toISOString(),
  };
}

export async function getMarketPageData(): Promise<MarketPageData> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status !== "configured") {
    return {
      status: "not-configured",
      missingVariables: configuration.missingVariables,
    };
  }

  try {
    const player = await getCurrentPlayer();
    const supabase = createSupabaseAdminClient();

    const [listingsResponse, tradesResponse, playersResponse] = await Promise.all([
      supabase
        .from("market_listings")
        .select(
          "id,player_id,kind,offer_label,offer_item_slug,want_label,want_item_slug,pokemon_id,pokemon_species,pokemon_nickname,pokemon_form,pokemon_is_shiny,note,photo_data,status,created_at",
        )
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("market_trades")
        .select("id,listing_id,seller_id,buyer_id,completed_at")
        .order("completed_at", { ascending: false })
        .limit(24),
      supabase
        .from("players")
        .select("id,display_name,color,is_active")
        .eq("is_active", true),
    ]);

    if (listingsResponse.error || tradesResponse.error || playersResponse.error) {
      console.error(
        "Failed to load Mercado Rocket:",
        listingsResponse.error?.message,
        tradesResponse.error?.message,
        playersResponse.error?.message,
      );
      return { status: "error" };
    }

    const players = new Map<string, PlayerRow>();
    for (const row of playersResponse.data ?? []) {
      if (!isRecord(row) || typeof row.id !== "string") continue;
      players.set(row.id, {
        id: row.id,
        displayName: asString(row.display_name) ?? "Jugador",
        color: asString(row.color) ?? "#64748b",
      });
    }

    const listings = (listingsResponse.data ?? [])
      .map((row) => parseListing(row, players))
      .filter((row): row is MarketListing => row !== null);

    const shopsMap = new Map<string, MarketShop>();
    for (const listing of listings) {
      const existing = shopsMap.get(listing.playerId);
      if (existing) {
        existing.listings.push(listing);
        continue;
      }
      shopsMap.set(listing.playerId, {
        playerId: listing.playerId,
        playerName: listing.playerName,
        playerColor: listing.playerColor,
        listings: [listing],
      });
    }

    const closedIds = Array.from(
      new Set(
        (tradesResponse.data ?? [])
          .map((row) => (isRecord(row) ? asString(row.listing_id) : null))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const closedListings = new Map<string, MarketListing>();
    if (closedIds.length > 0) {
      const closedResponse = await supabase
        .from("market_listings")
        .select(
          "id,player_id,kind,offer_label,offer_item_slug,want_label,want_item_slug,pokemon_id,pokemon_species,pokemon_nickname,pokemon_form,pokemon_is_shiny,note,photo_data,status,created_at",
        )
        .in("id", closedIds);
      if (!closedResponse.error) {
        for (const row of closedResponse.data ?? []) {
          const listing = parseListing(row, players);
          if (listing) closedListings.set(listing.id, listing);
        }
      }
    }

    const recentTrades: MarketTrade[] = [];
    for (const row of tradesResponse.data ?? []) {
      if (!isRecord(row)) continue;
      const id = asString(row.id);
      const listingId = asString(row.listing_id);
      const sellerId = asString(row.seller_id);
      const buyerId = asString(row.buyer_id);
      const completedAt = asString(row.completed_at);
      if (!id || !listingId || !sellerId || !buyerId || !completedAt) continue;
      const listing = closedListings.get(listingId);
      recentTrades.push({
        id,
        listingId,
        sellerId,
        sellerName: players.get(sellerId)?.displayName ?? "Jugador",
        buyerId,
        buyerName: players.get(buyerId)?.displayName ?? "Jugador",
        completedAt,
        summary: listing ? listingHeadline(listing) : "Intercambio cerrado",
      });
    }

    const tradedWithIds = new Set<string>();
    const pendingOfferPlayerIds = new Set<string>();
    if (player) {
      const pairResponse = await supabase
        .from("market_trades")
        .select("seller_id,buyer_id")
        .or(`seller_id.eq.${player.id},buyer_id.eq.${player.id}`);
      if (!pairResponse.error) {
        for (const row of pairResponse.data ?? []) {
          if (!isRecord(row)) continue;
          const sellerId = asString(row.seller_id);
          const buyerId = asString(row.buyer_id);
          if (sellerId && sellerId !== player.id) tradedWithIds.add(sellerId);
          if (buyerId && buyerId !== player.id) tradedWithIds.add(buyerId);
        }
      }
      const pendingResponse = await supabase
        .from("market_offers")
        .select("to_player_id")
        .eq("from_player_id", player.id)
        .eq("status", "pending");
      if (!pendingResponse.error) {
        for (const row of pendingResponse.data ?? []) {
          if (!isRecord(row)) continue;
          const toPlayerId = asString(row.to_player_id);
          if (toPlayerId) pendingOfferPlayerIds.add(toPlayerId);
        }
      }
    }

    const listedPokemonIds = new Set(
      listings
        .map((listing) => listing.pokemon?.id)
        .filter((id): id is string => Boolean(id)),
    );

    const ownedPokemon: MarketOwnedPokemon[] = [];
    const ownedBagItems: MarketOwnedItem[] = [];
    if (player) {
      const pokemonResponse = await supabase
        .from("pokemon")
        .select("id,species,nickname,form,is_shiny,level,status,present_in_save")
        .eq("player_id", player.id)
        .eq("present_in_save", true)
        .eq("status", "alive")
        .order("team_position", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(400);

      if (!pokemonResponse.error) {
        for (const row of pokemonResponse.data ?? []) {
          if (!isRecord(row)) continue;
          const id = asString(row.id);
          const species = asString(row.species);
          if (!id || !species) continue;
          ownedPokemon.push({
            id,
            species,
            nickname: asString(row.nickname),
            form: asNumber(row.form) ?? 0,
            isShiny: row.is_shiny === true,
            level: asNumber(row.level) ?? 1,
            listed: listedPokemonIds.has(id),
          });
        }
      }

      const bagResponse = await supabase
        .from("player_bag_items")
        .select("item_key,item_name,item_slug,quantity,pocket")
        .eq("player_id", player.id)
        .neq("pocket", "tm")
        .order("item_name", { ascending: true })
        .limit(400);
      if (!bagResponse.error) {
        for (const row of bagResponse.data ?? []) {
          if (!isRecord(row)) continue;
          const itemKey = asString(row.item_key);
          const name = asString(row.item_name);
          const pocket = row.pocket;
          const quantity = asNumber(row.quantity);
          if (
            !itemKey ||
            !name ||
            quantity === null ||
            (pocket !== "usable" &&
              pocket !== "held" &&
              pocket !== "ball" &&
              pocket !== "berry") ||
            /^(TM|HM|MT|MO|TR)\s*\d+/i.test(itemKey) ||
            /^(TM|HM|MT|MO|TR)\s*\d+/i.test(name)
          ) {
            continue;
          }
          const slug = asString(row.item_slug);
          ownedBagItems.push({
            itemKey,
            name: displayMarketItemName(slug, name),
            slug,
            quantity,
            pocket,
          });
        }
      }
    }

    return {
      status: "ready",
      player,
      listings,
      shops: Array.from(shopsMap.values()),
      recentTrades,
      tradedWithIds: Array.from(tradedWithIds),
      pendingOfferPlayerIds: Array.from(pendingOfferPlayerIds),
      ownedPokemon,
      ownedBagItems,
    };
  } catch (error) {
    console.error("Failed to load Mercado Rocket:", error);
    return { status: "error" };
  }
}

export async function getPendingMarketOffers(): Promise<MarketPendingOffer[]> {
  const configuration = getSupabaseConfiguration();
  if (configuration.status !== "configured") return [];

  try {
    const player = await getCurrentPlayer();
    if (!player) return [];
    const supabase = createSupabaseAdminClient();
    const offersResponse = await supabase
      .from("market_offers")
      .select(
        "id,listing_id,from_player_id,offer_kind,offer_label,offer_item_slug,pokemon_id,pokemon_species,pokemon_nickname,pokemon_form,pokemon_is_shiny,created_at",
      )
      .eq("to_player_id", player.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);

    if (offersResponse.error) {
      if (offersResponse.error.message.includes("market_offers")) return [];
      console.error("Failed to load market offers:", offersResponse.error.message);
      return [];
    }

    const rows = offersResponse.data ?? [];
    if (rows.length === 0) return [];

    const fromIds = [
      ...new Set(
        rows
          .map((row) => (isRecord(row) ? asString(row.from_player_id) : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const listingIds = [
      ...new Set(
        rows
          .map((row) => (isRecord(row) ? asString(row.listing_id) : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [playersResponse, listingsResponse] = await Promise.all([
      supabase.from("players").select("id,display_name,color").in("id", fromIds),
      supabase
        .from("market_listings")
        .select(
          "id,player_id,kind,offer_label,offer_item_slug,want_label,want_item_slug,pokemon_id,pokemon_species,pokemon_nickname,pokemon_form,pokemon_is_shiny,note,photo_data,status,created_at",
        )
        .in("id", listingIds),
    ]);

    const players = new Map<string, PlayerRow>();
    for (const row of playersResponse.data ?? []) {
      if (!isRecord(row)) continue;
      const id = asString(row.id);
      const displayName = asString(row.display_name);
      const color = asString(row.color);
      if (!id || !displayName || !color) continue;
      players.set(id, { id, displayName, color });
    }

    const listings = new Map<string, MarketListing>();
    for (const row of listingsResponse.data ?? []) {
      const listing = parseListing(row, players);
      if (listing) listings.set(listing.id, listing);
    }

    const offers: MarketPendingOffer[] = [];
    for (const row of rows) {
      if (!isRecord(row)) continue;
      const id = asString(row.id);
      const listingId = asString(row.listing_id);
      const fromPlayerId = asString(row.from_player_id);
      const offerLabel = asString(row.offer_label);
      const createdAt = asString(row.created_at);
      const offerKind = row.offer_kind === "pokemon" ? "pokemon" : "item";
      if (!id || !listingId || !fromPlayerId || !offerLabel || !createdAt) continue;
      const from = players.get(fromPlayerId);
      const listing = listings.get(listingId);
      const species = asString(row.pokemon_species);
      offers.push({
        id,
        listingId,
        listingHeadline: listing ? listingHeadline(listing) : "Anuncio del Mercado Rocket",
        fromPlayerId,
        fromPlayerName: from?.displayName ?? "Jugador",
        fromPlayerColor: from?.color ?? "#64748b",
        offerKind,
        offerLabel: displayMarketItemName(asString(row.offer_item_slug), offerLabel),
        offerItemSlug: asString(row.offer_item_slug),
        pokemon:
          offerKind === "pokemon" && species
            ? {
                id: asString(row.pokemon_id) ?? id,
                species,
                nickname: asString(row.pokemon_nickname),
                form: asNumber(row.pokemon_form) ?? 0,
                isShiny: row.pokemon_is_shiny === true,
              }
            : null,
        createdAt,
      });
    }
    return offers;
  } catch (error) {
    console.error("Failed to load pending market offers:", error);
    return [];
  }
}
