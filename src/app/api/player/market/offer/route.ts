import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { displayMarketItemName, getMarketItem } from "@/lib/market-items";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanLabel(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function isTechnicalMachine(key: string, name = "") {
  return /^(TM|HM|MT|MO|TR)\s*\d+/i.test(key) || /^(TM|HM|MT|MO|TR)\s*\d+/i.test(name);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Inicia sesión para ofrecer." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.listingId !== "string" || !UUID_PATTERN.test(body.listingId)) {
    return NextResponse.json({ error: "Anuncio no válido." }, { status: 400 });
  }

  const pokemonId = typeof body.pokemonId === "string" ? body.pokemonId : "";
  const offerSlugRaw = typeof body.offerItemSlug === "string" ? body.offerItemSlug.trim() : "";
  const offerCustom = typeof body.offerCustom === "string" ? cleanLabel(body.offerCustom) : "";

  const supabase = createSupabaseAdminClient();
  const listingResponse = await supabase
    .from("market_listings")
    .select("id,player_id,kind,status")
    .eq("id", body.listingId)
    .maybeSingle();

  if (listingResponse.error || !listingResponse.data) {
    return NextResponse.json({ error: "No se encontró el anuncio." }, { status: 404 });
  }
  const listing = listingResponse.data;
  if (listing.status !== "open") {
    return NextResponse.json({ error: "Ese anuncio ya está cerrado." }, { status: 409 });
  }
  if (listing.player_id === player.id) {
    return NextResponse.json({ error: "No puedes ofrecerte a ti mismo." }, { status: 400 });
  }

  const existingTrade = await supabase
    .from("market_trades")
    .select("id,seller_id,buyer_id")
    .or(`seller_id.eq.${player.id},buyer_id.eq.${player.id}`);
  if (existingTrade.error) {
    return NextResponse.json({ error: "No se pudo comprobar el intercambio." }, { status: 500 });
  }
  const alreadyTraded = (existingTrade.data ?? []).some((row) => {
    if (!isRecord(row)) return false;
    return row.seller_id === listing.player_id || row.buyer_id === listing.player_id;
  });
  if (alreadyTraded) {
    return NextResponse.json(
      { error: "Ya habéis cerrado un intercambio. Solo se permite uno entre las mismas dos personas." },
      { status: 409 },
    );
  }

  const row: Record<string, unknown> = {
    listing_id: listing.id,
    from_player_id: player.id,
    to_player_id: listing.player_id,
    status: "pending",
  };

  if (pokemonId) {
    if (listing.kind === "pokemon_for_item") {
      return NextResponse.json(
        { error: "No se puede ofrecer un Pokémon a cambio de otro Pokémon." },
        { status: 400 },
      );
    }
    if (!UUID_PATTERN.test(pokemonId)) {
      return NextResponse.json({ error: "Elige un Pokémon de tu caja." }, { status: 400 });
    }
    const pokemonResponse = await supabase
      .from("pokemon")
      .select("id,species,nickname,form,is_shiny,status,present_in_save,player_id")
      .eq("id", pokemonId)
      .maybeSingle();
    if (pokemonResponse.error || !pokemonResponse.data) {
      return NextResponse.json({ error: "No se encontró ese Pokémon." }, { status: 400 });
    }
    const pokemon = pokemonResponse.data;
    if (
      pokemon.player_id !== player.id ||
      pokemon.present_in_save !== true ||
      pokemon.status !== "alive"
    ) {
      return NextResponse.json(
        { error: "Solo puedes ofrecer un Pokémon vivo de tu partida." },
        { status: 400 },
      );
    }
    row.offer_kind = "pokemon";
    row.offer_label = (typeof pokemon.nickname === "string" && pokemon.nickname.trim()
      ? pokemon.nickname.trim()
      : String(pokemon.species)
    ).slice(0, 80);
    row.pokemon_id = pokemon.id;
    row.pokemon_species = pokemon.species;
    row.pokemon_nickname = typeof pokemon.nickname === "string" ? pokemon.nickname : null;
    row.pokemon_form = typeof pokemon.form === "number" ? pokemon.form : 0;
    row.pokemon_is_shiny = pokemon.is_shiny === true;
  } else {
    const catalog = getMarketItem(offerSlugRaw);
    const bagResponse = await supabase
      .from("player_bag_items")
      .select("item_key,item_name,item_slug,pocket")
      .eq("player_id", player.id)
      .neq("pocket", "tm");
    if (bagResponse.error) {
      return NextResponse.json(
        { error: "No se pudo comprobar tu mochila. Aplica la migración de ofertas." },
        { status: 503 },
      );
    }
    const owned = (bagResponse.data ?? []).find((item) => {
      if (!isRecord(item)) return false;
      const slug = typeof item.item_slug === "string" ? item.item_slug : "";
      const name = typeof item.item_name === "string" ? item.item_name : "";
      const key = typeof item.item_key === "string" ? item.item_key : "";
      if (isTechnicalMachine(key, name)) return false;
      return (
        (catalog && (slug === catalog.slug || getMarketItem(slug)?.slug === catalog.slug)) ||
        (offerCustom.length > 0 && name.toLowerCase() === offerCustom.toLowerCase()) ||
        (offerCustom.length > 0 && key === offerCustom.toUpperCase().replace(/\s+/g, "_"))
      );
    });
    if (!owned || !isRecord(owned)) {
      return NextResponse.json(
        { error: "Elige un objeto de tu mochila para ofrecerlo." },
        { status: 400 },
      );
    }
    const itemKey = String(owned.item_key);
    const itemName = String(owned.item_name);
    const itemSlug = typeof owned.item_slug === "string" ? owned.item_slug : null;
    row.offer_kind = "item";
    row.offer_label = displayMarketItemName(catalog?.slug ?? itemSlug, itemName);
    row.offer_item_slug = catalog?.slug ?? itemSlug;
    row.offer_item_key = itemKey;
  }

  const insert = await supabase.from("market_offers").insert(row).select("id").maybeSingle();
  if (insert.error) {
    if (
      insert.error.message.includes("market_offers_pending_pair_idx") ||
      insert.error.message.includes("market_offers_pending_listing_from_idx")
    ) {
      return NextResponse.json(
        { error: "Ya tienes una oferta pendiente con esta persona. Espera a que acepte o rechace." },
        { status: 409 },
      );
    }
    console.error("Failed to create market offer:", insert.error.message);
    return NextResponse.json(
      { error: "No se pudo enviar la oferta. Aplica la migración de ofertas." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: insert.data?.id ?? null });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.offerId !== "string" || !UUID_PATTERN.test(body.offerId)) {
    return NextResponse.json({ error: "Oferta no válida." }, { status: 400 });
  }
  const action = body.action;
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const offerResponse = await supabase
    .from("market_offers")
    .select("id,listing_id,from_player_id,to_player_id,status")
    .eq("id", body.offerId)
    .maybeSingle();

  if (offerResponse.error || !offerResponse.data) {
    return NextResponse.json({ error: "No se encontró la oferta." }, { status: 404 });
  }
  const offer = offerResponse.data;
  if (offer.status !== "pending") {
    return NextResponse.json({ error: "Esa oferta ya no está pendiente." }, { status: 409 });
  }
  if (offer.to_player_id !== player.id) {
    return NextResponse.json({ error: "Solo puedes responder ofertas que te hayan enviado." }, { status: 403 });
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    const update = await supabase
      .from("market_offers")
      .update({ status: "rejected", resolved_at: now })
      .eq("id", offer.id)
      .eq("status", "pending");
    if (update.error) {
      return NextResponse.json({ error: "No se pudo rechazar la oferta." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const listingResponse = await supabase
    .from("market_listings")
    .select("id,player_id,status")
    .eq("id", offer.listing_id)
    .maybeSingle();
  if (listingResponse.error || !listingResponse.data || listingResponse.data.status !== "open") {
    return NextResponse.json({ error: "Ese anuncio ya no está disponible." }, { status: 409 });
  }

  const close = await supabase
    .from("market_listings")
    .update({ status: "closed", closed_reason: "traded" })
    .eq("id", offer.listing_id)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (close.error || !close.data) {
    return NextResponse.json({ error: "Ese anuncio ya no está disponible." }, { status: 409 });
  }

  const trade = await supabase.from("market_trades").insert({
    listing_id: offer.listing_id,
    seller_id: offer.to_player_id,
    buyer_id: offer.from_player_id,
  });

  if (trade.error) {
    await supabase
      .from("market_listings")
      .update({ status: "open", closed_reason: null })
      .eq("id", offer.listing_id);
    if (trade.error.message.includes("market_trades_pair_unique")) {
      return NextResponse.json(
        { error: "Ya habéis cerrado un intercambio. Solo se permite uno entre las mismas dos personas." },
        { status: 409 },
      );
    }
    console.error("Failed to accept market offer:", trade.error.message);
    return NextResponse.json({ error: "No se pudo aceptar el intercambio." }, { status: 500 });
  }

  await supabase
    .from("market_offers")
    .update({ status: "accepted", resolved_at: now })
    .eq("id", offer.id)
    .eq("status", "pending");

  await supabase
    .from("market_offers")
    .update({ status: "cancelled", resolved_at: now })
    .eq("listing_id", offer.listing_id)
    .eq("status", "pending");

  return NextResponse.json({ ok: true });
}
