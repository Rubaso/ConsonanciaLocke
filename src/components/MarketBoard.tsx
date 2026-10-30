"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import MarketItemIcon from "@/components/MarketItemIcon";
import PokemonSprite from "@/components/PokemonSprite";
import {
  displayMarketItemName,
  listingHeadline,
  searchMarketItems,
} from "@/lib/market-items";
import type {
  MarketListing,
  MarketListingKind,
  MarketOwnedItem,
  MarketOwnedPokemon,
  MarketShop,
  MarketTrade,
} from "@/lib/market-types";
type MarketPlayer = {
  id: string;
  displayName: string;
  role: "player" | "organizer";
};

type MarketBoardProps = {
  player: MarketPlayer | null;
  listings: MarketListing[];
  shops: MarketShop[];
  recentTrades: MarketTrade[];
  tradedWithIds: string[];
  pendingOfferPlayerIds: string[];
  ownedPokemon: MarketOwnedPokemon[];
  ownedBagItems: MarketOwnedItem[];
};

const kindFilters: Array<{ id: "all" | MarketListingKind; label: string }> = [
  { id: "all", label: "Todo" },
  { id: "sell_item", label: "Lo vendo" },
  { id: "buy_item", label: "Lo compro" },
  { id: "pokemon_for_item", label: "Pokémon × objeto" },
];

function ItemPicker({
  id,
  label,
  slug,
  custom,
  onSlug,
  onCustom,
}: {
  id: string;
  label: string;
  slug: string;
  custom: string;
  onSlug: (value: string) => void;
  onCustom: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return searchMarketItems(q, 18);
  }, [query]);

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-200/80" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={query || custom}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          onCustom(value);
          onSlug("");
        }}
        placeholder="Busca un icono o escribe el nombre"
        className="w-full rounded-[3px] border border-fuchsia-300/25 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-fuchsia-200"
      />
      <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded-[3px] border border-white/10 bg-black/30 p-1 sm:grid-cols-9">
        {matches.map((item) => {
          const selected = slug === item.slug;
          return (
            <button
              type="button"
              key={item.slug}
              title={item.name}
              onClick={() => {
                onSlug(item.slug);
                onCustom("");
                setQuery(item.name);
              }}
              className={`flex items-center justify-center rounded-[3px] p-1 ${
                selected ? "bg-fuchsia-400/30 ring-1 ring-fuchsia-200" : "hover:bg-white/10"
              }`}
            >
              <MarketItemIcon slug={item.slug} size={28} alt={item.name} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MarketBoard({
  player,
  listings,
  shops,
  recentTrades,
  tradedWithIds,
  pendingOfferPlayerIds,
  ownedPokemon,
  ownedBagItems,
}: MarketBoardProps) {
  const router = useRouter();
  const tradedWith = useMemo(() => new Set(tradedWithIds), [tradedWithIds]);
  const pendingWith = useMemo(
    () => new Set(pendingOfferPlayerIds),
    [pendingOfferPlayerIds],
  );
  const [tradeListing, setTradeListing] = useState<MarketListing | null>(null);
  const [filter, setFilter] = useState<"all" | MarketListingKind>("all");
  const [kind, setKind] = useState<MarketListingKind>("sell_item");
  const [offerSlug, setOfferSlug] = useState("");
  const [offerCustom, setOfferCustom] = useState("");
  const [wantSlug, setWantSlug] = useState("");
  const [wantCustom, setWantCustom] = useState("");
  const [pokemonId, setPokemonId] = useState("");
  const [note, setNote] = useState("");
  const [bagQuery, setBagQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visibleListings = listings.filter((listing) => filter === "all" || listing.kind === filter);
  const visibleBagItems = useMemo(() => {
    const q = bagQuery.trim().toLowerCase();
    return ownedBagItems.filter((item) => {
      const name = displayMarketItemName(item.slug, item.name);
      if (!q) return true;
      return (
        name.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.itemKey.toLowerCase().includes(q.replace(/\s+/g, "_")) ||
        (item.slug ?? "").includes(q.replace(/\s+/g, "-"))
      );
    });
  }, [ownedBagItems, bagQuery]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!player) return;
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.set("kind", kind);
    form.set("offerItemSlug", offerSlug);
    form.set("offerCustom", offerCustom);
    form.set("wantItemSlug", wantSlug);
    form.set("wantCustom", wantCustom);
    form.set("pokemonId", pokemonId);
    form.set("note", note);

    const response = await fetch("/api/player/market", {
      method: "POST",
      body: form,
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response.ok) {
      setMessage(payload?.error ?? "No se pudo publicar.");
      return;
    }
    setOfferSlug("");
    setOfferCustom("");
    setWantSlug("");
    setWantCustom("");
    setPokemonId("");
    setNote("");
    setMessage("Publicado en tu tienda.");
    router.refresh();
  }

  async function patchListing(listingId: string, action: "withdraw") {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/player/market", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, action }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response.ok) {
      setMessage(payload?.error ?? "No se pudo completar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {player ? (
        <section className="rounded-[3px] border border-fuchsia-300/25 bg-black/55 p-5 shadow-[0_0_40px_rgba(192,38,211,0.12)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-300">
            Tu tienda
          </p>
          <h2 className="mt-1 text-xl font-black text-white">Publicar anuncio</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Objetos por objetos, o Pokémon por objeto. No se permite Pokémon por Pokémon. Con cada
            persona solo hay un intercambio.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["sell_item", "Tengo X. Lo vendo"],
                ["buy_item", "Quiero X. Lo compro"],
                ["pokemon_for_item", "Pokémon × objeto"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`rounded-[3px] px-3 py-1.5 text-xs font-black uppercase tracking-wide ${
                  kind === value
                    ? "bg-fuchsia-300 text-slate-950"
                    : "border border-white/15 text-fuchsia-100 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form className="mt-5 space-y-4" onSubmit={publish}>
            {kind === "sell_item" && (
              <>
                {ownedBagItems.length === 0 ? (
                  <p className="rounded-[3px] border border-amber-300/25 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
                    Importa tu save para vender objetos de la mochila. No se pueden publicar
                    objetos que no tengas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <label
                      className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-200/80"
                      htmlFor="bag-search"
                    >
                      Tengo este objeto (mochila)
                    </label>
                    <input
                      id="bag-search"
                      value={bagQuery}
                      onChange={(event) => setBagQuery(event.target.value)}
                      placeholder="Busca en tu mochila"
                      className="w-full rounded-[3px] border border-fuchsia-300/25 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-fuchsia-200"
                    />
                    <div className="grid max-h-48 grid-cols-3 gap-1 overflow-y-auto rounded-[3px] border border-white/10 bg-black/30 p-1 sm:grid-cols-4">
                      {visibleBagItems.length === 0 ? (
                        <p className="col-span-full px-2 py-3 text-xs text-zinc-500">
                          No hay objetos que coincidan.
                        </p>
                      ) : (
                        visibleBagItems.map((item) => {
                          const name = displayMarketItemName(item.slug, item.name);
                          const selected =
                            (item.slug && offerSlug === item.slug) ||
                            (!item.slug && offerCustom === item.name);
                          return (
                            <button
                              type="button"
                              key={item.itemKey}
                              onClick={() => {
                                setOfferSlug(item.slug ?? "");
                                setOfferCustom(item.slug ? "" : name);
                              }}
                              className={`flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-left ${
                                selected
                                  ? "bg-fuchsia-400/30 ring-1 ring-fuchsia-200"
                                  : "hover:bg-white/10"
                              }`}
                            >
                              <MarketItemIcon slug={item.slug} size={28} alt={name} />
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold text-white">
                                  {name}
                                </span>
                                <span className="text-[10px] text-zinc-400">×{item.quantity}</span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                <ItemPicker
                  id="want-item-optional"
                  label="Quiero (opcional)"
                  slug={wantSlug}
                  custom={wantCustom}
                  onSlug={setWantSlug}
                  onCustom={setWantCustom}
                />
              </>
            )}
            {kind === "buy_item" && (
              <ItemPicker
                id="want-item"
                label="Quiero este objeto. Lo compro"
                slug={wantSlug}
                custom={wantCustom}
                onSlug={setWantSlug}
                onCustom={setWantCustom}
              />
            )}
            {kind === "pokemon_for_item" && (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-200/80" htmlFor="pokemon-id">
                    Pokémon que ofreces
                  </label>
                  <select
                    id="pokemon-id"
                    value={pokemonId}
                    onChange={(event) => setPokemonId(event.target.value)}
                    className="w-full rounded-[3px] border border-fuchsia-300/25 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="">Elige un Pokémon vivo</option>
                    {ownedPokemon.map((poke) => (
                      <option key={poke.id} value={poke.id} disabled={poke.listed}>
                        {poke.nickname || poke.species} · Nv. {poke.level}
                        {poke.listed ? " (ya publicado)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <ItemPicker
                  id="want-for-pokemon"
                  label="Quiero este objeto a cambio"
                  slug={wantSlug}
                  custom={wantCustom}
                  onSlug={setWantSlug}
                  onCustom={setWantCustom}
                />
              </>
            )}

            <label className="space-y-2 text-sm">
              <span className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-200/80">
                Nota
              </span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 280))}
                placeholder="Ej. Lo esperes a cambio"
                className="w-full rounded-[3px] border border-fuchsia-300/25 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
              />
            </label>

            <button
              type="submit"
              disabled={
                busy ||
                (kind === "sell_item" &&
                  (ownedBagItems.length === 0 || (!offerSlug && !offerCustom)))
              }
              className="rounded-[3px] bg-fuchsia-300 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-slate-950 hover:bg-fuchsia-200 disabled:opacity-50"
            >
              {busy ? "Publicando…" : "Subir a mi tienda"}
            </button>
            {message && <p className="text-sm text-fuchsia-100">{message}</p>}
          </form>
        </section>
      ) : (
        <p className="rounded-[3px] border border-fuchsia-300/20 bg-black/50 px-4 py-3 text-sm text-fuchsia-100">
          Inicia sesión para abrir tu tienda y cerrar intercambios.
        </p>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {kindFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-[3px] px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                filter === item.id
                  ? "bg-white text-slate-950"
                  : "border border-white/20 text-white/80 hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {visibleListings.length === 0 ? (
          <p className="rounded-[3px] border border-white/10 bg-black/40 px-4 py-6 text-sm text-zinc-400">
            No hay anuncios abiertos en esta categoría.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleListings.map((listing) => {
              const own = player?.id === listing.playerId;
              const already = Boolean(player && tradedWith.has(listing.playerId));
              const pending = Boolean(player && pendingWith.has(listing.playerId));
              return (
                <article
                  key={listing.id}
                  className="flex flex-col gap-3 rounded-[3px] border border-fuchsia-200/15 bg-black/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    {listing.kind === "pokemon_for_item" && listing.pokemon ? (
                      <PokemonSprite
                        species={listing.pokemon.species}
                        form={listing.pokemon.form}
                        isShiny={listing.pokemon.isShiny}
                        size={48}
                        framed
                      />
                    ) : (
                      <MarketItemIcon
                        slug={listing.offerItemSlug || listing.wantItemSlug}
                        size={48}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
                        {listing.playerName}
                      </p>
                      <h3 className="text-sm font-black leading-5 text-white">
                        {listingHeadline(listing)}
                      </h3>
                    </div>
                  </div>
                  {listing.note && <p className="text-xs leading-5 text-zinc-400">{listing.note}</p>}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {own || player?.role === "organizer" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void patchListing(listing.id, "withdraw")}
                        className="rounded-[3px] border border-white/20 px-3 py-1.5 text-xs font-bold uppercase text-zinc-200 hover:bg-white/10"
                      >
                        Retirar
                      </button>
                    ) : null}
                    {player && !own ? (
                      <button
                        type="button"
                        disabled={busy || already || pending}
                        onClick={() => setTradeListing(listing)}
                        className="rounded-[3px] bg-fuchsia-300 px-3 py-1.5 text-xs font-black uppercase text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {already
                          ? "Ya intercambiaste"
                          : pending
                            ? "Oferta enviada"
                            : "Intercambiar"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {shops.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white">Tiendas abiertas</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {shops.map((shop) => (
              <div
                key={shop.playerId}
                className="rounded-[3px] border border-white/10 bg-black/45 px-4 py-3"
              >
                <p className="text-sm font-black" style={{ color: shop.playerColor }}>
                  {shop.playerName}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {shop.listings.length} anuncio{shop.listings.length === 1 ? "" : "s"}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                  {shop.listings.slice(0, 4).map((listing) => (
                    <li key={listing.id}>{listingHeadline(listing)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {recentTrades.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white">Intercambios cerrados</h2>
          <ul className="space-y-2">
            {recentTrades.map((trade) => (
              <li
                key={trade.id}
                className="rounded-[3px] border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-300"
              >
                <span className="font-semibold text-white">{trade.sellerName}</span>
                {" × "}
                <span className="font-semibold text-white">{trade.buyerName}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{trade.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tradeListing && player ? (
        <TradeOfferDialog
          listing={tradeListing}
          ownedBagItems={ownedBagItems}
          ownedPokemon={ownedPokemon}
          busy={busy}
          onClose={() => setTradeListing(null)}
          onSubmit={async (payload) => {
            setBusy(true);
            setMessage(null);
            const response = await fetch("/api/player/market/offer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ listingId: tradeListing.id, ...payload }),
            });
            const result = (await response.json().catch(() => null)) as { error?: string } | null;
            setBusy(false);
            if (!response.ok) {
              setMessage(result?.error ?? "No se pudo enviar la oferta.");
              return;
            }
            setTradeListing(null);
            setMessage("Oferta enviada. Esperando a que acepte o rechace.");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function TradeOfferDialog({
  listing,
  ownedBagItems,
  ownedPokemon,
  busy,
  onClose,
  onSubmit,
}: {
  listing: MarketListing;
  ownedBagItems: MarketOwnedItem[];
  ownedPokemon: MarketOwnedPokemon[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    offerItemSlug: string;
    offerCustom: string;
    pokemonId: string;
  }) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [offerSlug, setOfferSlug] = useState(listing.wantItemSlug ?? "");
  const [offerCustom, setOfferCustom] = useState("");
  const [pokemonId, setPokemonId] = useState("");
  const allowPokemon = listing.kind !== "pokemon_for_item";
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ownedBagItems.filter((item) => {
      const name = displayMarketItemName(item.slug, item.name);
      if (!q) return true;
      return name.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
    });
  }, [ownedBagItems, query]);

  const wanted = listing.wantItemSlug
    ? ownedBagItems.find((item) => item.slug === listing.wantItemSlug)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="trade-offer-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[3px] border border-fuchsia-300/30 bg-[#120814] p-5 shadow-[0_0_40px_rgba(192,38,211,0.25)]"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-300">
          Oferta
        </p>
        <h2 id="trade-offer-title" className="mt-1 text-xl font-black text-white">
          ¿Qué le ofreces a {listing.playerName}?
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{listingHeadline(listing)}</p>
        {wanted ? (
          <p className="mt-2 text-xs text-fuchsia-200">
            Pide {displayMarketItemName(wanted.slug, wanted.name)}. Lo tienes en la mochila.
          </p>
        ) : null}

        <label className="mt-4 block space-y-2 text-sm">
          <span className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-200/80">
            Tu mochila
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca en tu mochila"
            className="w-full rounded-[3px] border border-fuchsia-300/25 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
          />
        </label>
        <div className="mt-2 grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-[3px] border border-white/10 bg-black/30 p-1 sm:grid-cols-3">
          {items.length === 0 ? (
            <p className="col-span-full px-2 py-3 text-xs text-zinc-500">No hay objetos.</p>
          ) : (
            items.map((item) => {
              const name = displayMarketItemName(item.slug, item.name);
              const selected =
                !pokemonId &&
                ((item.slug && offerSlug === item.slug) ||
                  (!item.slug && offerCustom === item.name));
              return (
                <button
                  type="button"
                  key={item.itemKey}
                  onClick={() => {
                    setPokemonId("");
                    setOfferSlug(item.slug ?? "");
                    setOfferCustom(item.slug ? "" : item.name);
                  }}
                  className={`flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-left ${
                    selected ? "bg-fuchsia-400/30 ring-1 ring-fuchsia-200" : "hover:bg-white/10"
                  }`}
                >
                  <MarketItemIcon slug={item.slug} size={28} alt={name} />
                  <span className="min-w-0 truncate text-xs font-semibold text-white">{name}</span>
                </button>
              );
            })
          )}
        </div>

        {allowPokemon ? (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-200/80">
              O un Pokémon
            </p>
            <div className="grid max-h-36 grid-cols-3 gap-1 overflow-y-auto sm:grid-cols-4">
              {ownedPokemon
                .filter((pokemon) => !pokemon.listed)
                .map((pokemon) => {
                  const selected = pokemonId === pokemon.id;
                  return (
                    <button
                      type="button"
                      key={pokemon.id}
                      onClick={() => {
                        setPokemonId(pokemon.id);
                        setOfferSlug("");
                        setOfferCustom("");
                      }}
                      className={`flex flex-col items-center rounded-[3px] p-1 ${
                        selected ? "bg-fuchsia-400/30 ring-1 ring-fuchsia-200" : "hover:bg-white/10"
                      }`}
                    >
                      <PokemonSprite
                        species={pokemon.species}
                        form={pokemon.form}
                        isShiny={pokemon.isShiny}
                        size={40}
                        framed={false}
                      />
                      <span className="w-full truncate text-[10px] text-zinc-200">
                        {pokemon.nickname || pokemon.species}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || (!pokemonId && !offerSlug && !offerCustom)}
            onClick={() =>
              void onSubmit({
                offerItemSlug: offerSlug,
                offerCustom,
                pokemonId,
              })
            }
            className="rounded-[3px] bg-fuchsia-300 px-4 py-2 text-sm font-black uppercase text-slate-950 disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Enviar oferta"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[3px] border border-white/20 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/10"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
