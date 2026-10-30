import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { getMarketItem } from "@/lib/market-items";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_JSON_SIZE = 16 * 1024;
const MAX_OPEN_LISTINGS = 16;

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

function resolveItemField(slugRaw: string, customRaw: string) {
  const slug = slugRaw.trim().toLowerCase();
  const custom = cleanLabel(customRaw);
  const catalog = getMarketItem(slug);
  if (catalog) {
    return { label: catalog.name, slug: catalog.slug };
  }
  if (custom.length >= 1) {
    return { label: custom, slug: null as string | null };
  }
  return null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Inicia sesión para publicar." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let kind = "";
  let offerSlug = "";
  let offerCustom = "";
  let wantSlug = "";
  let wantCustom = "";
  let pokemonId = "";
  let note = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    kind = String(form.get("kind") ?? "");
    offerSlug = String(form.get("offerItemSlug") ?? "");
    offerCustom = String(form.get("offerCustom") ?? "");
    wantSlug = String(form.get("wantItemSlug") ?? "");
    wantCustom = String(form.get("wantCustom") ?? "");
    pokemonId = String(form.get("pokemonId") ?? "");
    note = String(form.get("note") ?? "").trim().slice(0, 280);
  } else if (contentType.includes("application/json")) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_JSON_SIZE) {
      return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "No se pudieron leer los datos." }, { status: 400 });
    }
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
    }
    kind = typeof body.kind === "string" ? body.kind : "";
    offerSlug = typeof body.offerItemSlug === "string" ? body.offerItemSlug : "";
    offerCustom = typeof body.offerCustom === "string" ? body.offerCustom : "";
    wantSlug = typeof body.wantItemSlug === "string" ? body.wantItemSlug : "";
    wantCustom = typeof body.wantCustom === "string" ? body.wantCustom : "";
    pokemonId = typeof body.pokemonId === "string" ? body.pokemonId : "";
    note = typeof body.note === "string" ? body.note.trim().slice(0, 280) : "";
  } else {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 415 });
  }

  if (kind !== "sell_item" && kind !== "buy_item" && kind !== "pokemon_for_item") {
    return NextResponse.json({ error: "Elige qué quieres publicar." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const openCount = await supabase
    .from("market_listings")
    .select("id", { count: "exact", head: true })
    .eq("player_id", player.id)
    .eq("status", "open");

  if (openCount.error) {
    return NextResponse.json({ error: "No se pudo publicar." }, { status: 500 });
  }
  if ((openCount.count ?? 0) >= MAX_OPEN_LISTINGS) {
    return NextResponse.json(
      { error: `Tu tienda ya tiene ${MAX_OPEN_LISTINGS} anuncios abiertos.` },
      { status: 400 },
    );
  }

  const offer = resolveItemField(offerSlug, offerCustom);
  const want = resolveItemField(wantSlug, wantCustom);

  const row: Record<string, unknown> = {
    player_id: player.id,
    kind,
    note: note.length > 0 ? note : null,
    photo_data: null,
    status: "open",
    closed_reason: null,
  };

  if (kind === "sell_item") {
    if (!offer) {
      return NextResponse.json(
        { error: "Elige un objeto de tu mochila." },
        { status: 400 },
      );
    }
    const bagResponse = await supabase
      .from("player_bag_items")
      .select("item_key,item_name,item_slug,quantity,pocket")
      .eq("player_id", player.id)
      .neq("pocket", "tm");
    if (bagResponse.error) {
      return NextResponse.json(
        { error: "No se pudo comprobar tu mochila. Aplica la migración de objetos." },
        { status: 503 },
      );
    }
    const owned = (bagResponse.data ?? []).find((item) => {
      if (!isRecord(item)) return false;
      const slug = typeof item.item_slug === "string" ? item.item_slug : "";
      const name = typeof item.item_name === "string" ? item.item_name : "";
      const key = typeof item.item_key === "string" ? item.item_key : "";
      if (/^(TM|HM|MT|MO|TR)\s*\d+/i.test(key) || /^(TM|HM|MT|MO|TR)\s*\d+/i.test(name)) {
        return false;
      }
      return (
        (offer.slug !== null && slug === offer.slug) ||
        name.toLowerCase() === offer.label.toLowerCase() ||
        key === offer.label.toUpperCase().replace(/\s+/g, "_")
      );
    });
    if (!owned) {
      return NextResponse.json(
        { error: "Solo puedes vender objetos que tengas en la mochila del save." },
        { status: 400 },
      );
    }
    row.offer_label = offer.label;
    row.offer_item_slug = offer.slug;
    row.want_label = want?.label ?? null;
    row.want_item_slug = want?.slug ?? null;
  } else if (kind === "buy_item") {
    if (!want) {
      return NextResponse.json(
        { error: "Elige o escribe el objeto que compras." },
        { status: 400 },
      );
    }
    row.want_label = want.label;
    row.want_item_slug = want.slug;
    row.offer_label = offer?.label ?? null;
    row.offer_item_slug = offer?.slug ?? null;
  } else {
    if (!want) {
      return NextResponse.json(
        { error: "Elige el objeto que quieres a cambio del Pokémon." },
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
    row.pokemon_id = pokemon.id;
    row.pokemon_species = pokemon.species;
    row.pokemon_nickname = typeof pokemon.nickname === "string" ? pokemon.nickname : null;
    row.pokemon_form = typeof pokemon.form === "number" ? pokemon.form : 0;
    row.pokemon_is_shiny = pokemon.is_shiny === true;
    row.want_label = want.label;
    row.want_item_slug = want.slug;
  }

  const insert = await supabase.from("market_listings").insert(row).select("id").maybeSingle();
  if (insert.error) {
    if (insert.error.message.includes("market_listings_open_pokemon_idx")) {
      return NextResponse.json(
        { error: "Ese Pokémon ya está publicado en tu tienda." },
        { status: 409 },
      );
    }
    console.error("Failed to create market listing:", insert.error.message);
    return NextResponse.json({ error: "No se pudo publicar el anuncio." }, { status: 500 });
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
  if (!isRecord(body) || typeof body.listingId !== "string" || !UUID_PATTERN.test(body.listingId)) {
    return NextResponse.json({ error: "Anuncio no válido." }, { status: 400 });
  }

  const action = body.action;
  const supabase = createSupabaseAdminClient();
  const listingResponse = await supabase
    .from("market_listings")
    .select("id,player_id,status")
    .eq("id", body.listingId)
    .maybeSingle();

  if (listingResponse.error || !listingResponse.data) {
    return NextResponse.json({ error: "No se encontró el anuncio." }, { status: 404 });
  }

  const listing = listingResponse.data;
  if (listing.status !== "open") {
    return NextResponse.json({ error: "Ese anuncio ya está cerrado." }, { status: 409 });
  }

  if (action === "withdraw") {
    if (listing.player_id !== player.id && player.role !== "organizer") {
      return NextResponse.json({ error: "No puedes retirar este anuncio." }, { status: 403 });
    }
    const update = await supabase
      .from("market_listings")
      .update({ status: "closed", closed_reason: "withdrawn" })
      .eq("id", listing.id)
      .eq("status", "open");
    if (update.error) {
      return NextResponse.json({ error: "No se pudo retirar el anuncio." }, { status: 500 });
    }
    await supabase
      .from("market_offers")
      .update({ status: "cancelled", resolved_at: new Date().toISOString() })
      .eq("listing_id", listing.id)
      .eq("status", "pending");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
}
